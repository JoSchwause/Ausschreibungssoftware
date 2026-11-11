// SPDX-License-Identifier: AGPL-3.0-or-later
// Gemeinsame Schritte der App-E2E-Tests: nur Tastatur und Schaltflächen (U3, U8), so wie ein Nutzer.

import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';

export interface FxPosition {
  readonly id: string;
  readonly art: 'position';
  readonly ordnungszahl: string;
  readonly kurztext: string;
  readonly menge: string;
  readonly einheit: string;
  readonly einheitspreis: string;
}

export interface FxLv {
  readonly id: string;
  readonly name: string;
  readonly knoten: readonly ({ readonly art: string; readonly id: string } & Partial<
    Omit<FxPosition, 'art' | 'id'>
  >)[];
  readonly sollwerte: { readonly positionen: Readonly<Record<string, { readonly gp: string | null }>> };
}

export function fixture(name: string): FxLv {
  return JSON.parse(readFileSync(new URL(`../../../fixtures/${name}.json`, import.meta.url), 'utf8')) as FxLv;
}

/** Kanonischer Dezimalwert der Fixture (`1850.000`) als Eingabe im deutschen Format (`1850,000`). */
export const eingabeDe = (wert: string): string => wert.replace('.', ',');

/** Kanonischer Betrag (`1850.00`) in der Anzeige des Grids (`1.850,00`). */
export function betragDe(wert: string): string {
  const [ganz = '', rest = ''] = wert.split('.');
  return `${ganz.replace(/\B(?=(\d{3})+$)/g, '.')},${rest}`;
}

export async function projektAnlegen(page: Page, name: string, bauherr: string): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Projektname').focus();
  await page.keyboard.type(name);
  await page.keyboard.press('Tab');
  await page.keyboard.type(bauherr);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

export async function lvAnlegen(page: Page, name: string, maske = 'NN.NN.NNNN[I]'): Promise<void> {
  await page.getByLabel('Name des LV').focus();
  await page.keyboard.type(name);
  await page.keyboard.press('Tab');
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type(maske);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  await expect(page.getByRole('treegrid', { name: 'Positionen' })).toBeVisible();
}

interface Fokuslage {
  readonly zeilen: number;
  readonly zeile: number;
  readonly spalte: string | null;
  readonly text: string | null;
}

function fokuslage(page: Page): Promise<Fokuslage> {
  return page.evaluate(() => {
    const a = document.activeElement;
    return {
      zeilen: Number(document.querySelector('[role="treegrid"]')?.getAttribute('aria-rowcount') ?? '1') - 1,
      zeile: Number(a?.closest('[data-i]')?.getAttribute('data-i') ?? '-1'),
      spalte: a?.getAttribute('data-spalte') ?? null,
      text: a?.querySelector('.tx-grid__text')?.textContent ?? null,
    };
  });
}

/**
 * Führt `aktion` aus (einen Knoten anlegen) und wartet, bis die neue Zeile im Grid steht und ihre leere Kurztextzelle
 * den Fokus hat. Erst dann darf getippt werden: Der Befehl läuft asynchron durch Kern und Speicher.
 */
export async function neueZeile(page: Page, aktion: () => Promise<void>): Promise<void> {
  const vorher = await fokuslage(page);
  await aktion();
  await expect
    .poll(async () => {
      const f = await fokuslage(page);
      return (
        f.zeilen === vorher.zeilen + 1 && f.zeile !== vorher.zeile && f.spalte === 'kurztext' && f.text === ''
      );
    })
    .toBe(true);
}

/** Tippt in die fokussierte Zelle und übernimmt mit `abschluss` (Tab: nächste Zelle derselben Zeile). */
export async function tippe(page: Page, text: string, abschluss: 'Tab' | 'Enter' = 'Tab'): Promise<void> {
  await page.keyboard.type(text);
  await page.keyboard.press(abschluss);
}

/** Position an der aktiven Zeile anlegen (Strg+Alt+P) und Kurztext, Menge, Einheit, EP eintippen. */
export async function positionTippen(page: Page, p: FxPosition): Promise<void> {
  await neueZeile(page, () => page.keyboard.press('Control+Alt+KeyP'));
  await tippe(page, p.kurztext);
  await tippe(page, eingabeDe(p.menge));
  await tippe(page, p.einheit);
  // Tab, nicht Enter: Enter ginge in die Zeile darunter, die aktive Zeile soll die neue Position bleiben.
  await tippe(page, eingabeDe(p.einheitspreis));
}

/** Sichtbare Zeilen des Grids: Ordnungszahl, Kurztext, Gesamtpreis. */
export function zeilen(page: Page): Promise<string[][]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('[role="treegrid"] [role="row"][data-i]')]
      .sort((a, b) => Number(a.getAttribute('data-i')) - Number(b.getAttribute('data-i')))
      .map((r) =>
        ['ordnungszahl', 'kurztext', 'gesamtpreis'].map(
          (s) => r.querySelector(`[data-spalte="${s}"] .tx-grid__text`)?.textContent ?? '',
        ),
      ),
  );
}

/** Die Summenzeile unter dem Grid als Name → Wert. */
export function summen(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('.tx-grid__summe')].map((s) => [
        s.querySelector('.tx-grid__summe-name')?.textContent ?? '',
        s.querySelector('.tx-grid__summe-wert')?.textContent ?? '',
      ]),
    ),
  );
}

/** Wartet, bis alle eingereihten Befehle durch Kern und Speicher sind (Testpfad; die Befehle laufen nacheinander). */
export async function leerlauf(page: Page): Promise<void> {
  await page.evaluate(() => window.tethysTest?.leerlauf());
}
