// SPDX-License-Identifier: AGPL-3.0-or-later
// Hilfen für Tor E (Ticket 158): Wege wie ein Nutzer (Schaltflächen, Verweise, Dateiauswahl, Tastatur), Prüfungen der Sicht
// bei 1280 px. Keine Testhaken (`window.tethysTest`), keine getippten Adressen.

import { readFileSync } from 'node:fs';
import { expect, type Download, type Locator, type Page } from '@playwright/test';

export const FIXTURES = new URL('../../../fixtures/', import.meta.url);
export const fixturePfad = (rel: string): string => new URL(rel, FIXTURES).pathname;

/** Die Seitenleiste. */
export const leiste = (page: Page): Locator => page.getByRole('navigation', { name: 'Hauptnavigation' });

/** Wechselt über die Seitenleiste (nicht über die Adresse). */
export async function ueberLeiste(page: Page, eintrag: string): Promise<void> {
  await leiste(page).getByRole('link', { name: eintrag, exact: true }).click();
}

/** Läuft die Seite oder der Arbeitsbereich waagerecht über? (U6: ab 1280 px kein waagerechtes Rollen) */
export function waagerechterUeberlauf(page: Page): Promise<{ seite: number; arbeitsflaeche: number } | null> {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    const seite = document.documentElement.scrollWidth - window.innerWidth;
    const arbeitsflaeche = main === null ? 0 : main.scrollWidth - main.clientWidth;
    return seite > 0 || arbeitsflaeche > 0 ? { seite, arbeitsflaeche } : null;
  });
}

/**
 * Sicht im Grid ohne Rollen: Zahl der Zeilen, die ganz unter dem Kopf im sichtbaren Bereich stehen, ob das Grid waagerecht
 * gerollt ist und ob die genannten Spaltenköpfe ganz zu sehen sind.
 */
export function gridSicht(
  page: Page,
  name: string,
  spalten: readonly string[],
): Promise<{ zeilen: number; gerollt: number; sichtbar: Record<string, boolean> }> {
  return page.evaluate(
    ([gridName, koepfe]) => {
      const grid = [...document.querySelectorAll<HTMLElement>('[role="treegrid"]')].find(
        (g) => g.getAttribute('aria-label') === gridName,
      );
      if (grid === undefined) throw new Error(`Grid ${gridName} fehlt`);
      const g = grid.getBoundingClientRect();
      const kopf = grid.querySelector('[role="rowgroup"], .tx-grid__kopf')?.getBoundingClientRect();
      const oben = kopf?.bottom ?? g.top;
      const unten = Math.min(g.top + grid.clientTop + grid.clientHeight, window.innerHeight);
      const rechts = Math.min(g.left + grid.clientLeft + grid.clientWidth, window.innerWidth);
      const zeilen = [...grid.querySelectorAll('[role="row"][data-i]')].filter((r) => {
        const b = r.getBoundingClientRect();
        return b.top >= oben - 0.5 && b.bottom <= unten + 0.5;
      }).length;
      const sichtbar: Record<string, boolean> = {};
      for (const k of koepfe) {
        const zelle = [...grid.querySelectorAll('[role="columnheader"]')].find(
          (z) => z.textContent.trim() === k,
        );
        const b = zelle?.getBoundingClientRect();
        sichtbar[k] = b !== undefined && b.left >= g.left && b.right <= rechts + 0.5;
      }
      return { zeilen, gerollt: grid.scrollLeft, sichtbar };
    },
    [name, spalten] as const,
  );
}

/** Klickt `ausloeser`, wartet auf die Dateiauswahl des Browsers und wählt dort die Datei (wie ein Nutzer). */
export async function dateiWaehlen(
  page: Page,
  ausloeser: () => Promise<void>,
  datei: string | { name: string; mimeType: string; buffer: Buffer },
): Promise<void> {
  const wahl = page.waitForEvent('filechooser');
  await ausloeser();
  await (await wahl).setFiles(datei);
}

/** Klickt `ausloeser` und gibt den Download zurück. */
export async function herunterladen(page: Page, ausloeser: () => Promise<void>): Promise<Download> {
  const [download] = await Promise.all([page.waitForEvent('download'), ausloeser()]);
  return download;
}

/** Inhalt eines Downloads als Bytes. */
export async function downloadBytes(d: Download): Promise<Buffer> {
  return readFileSync(await d.path());
}

/** Beträge in Cent (`1234.56` → 123456n); nur für die Herleitung erwarteter Werte im Test. */
export const cent = (b: string): bigint => {
  const [ganz = '0', rest = ''] = b.split('.');
  const neg = ganz.startsWith('-');
  const c = BigInt(ganz.replace('-', '')) * 100n + BigInt((rest + '00').slice(0, 2));
  return neg ? -c : c;
};

/** Cent als Betrag in der Anzeige der App (`123456n` → `1.234,56`). */
export function betragAusCent(c: bigint): string {
  const neg = c < 0n;
  const a = neg ? -c : c;
  const ganz = (a / 100n).toString().replace(/\B(?=(\d{3})+$)/g, '.');
  return `${neg ? '-' : ''}${ganz},${(a % 100n).toString().padStart(2, '0')}`;
}

/** Dezimalzahl mit `stellen` Nachkommastellen als ganze Zahl (`12.5`, 3 → 12500n). */
export function festkomma(wert: string, stellen: number): bigint {
  const [ganz = '0', rest = ''] = wert.trim().split('.');
  const neg = ganz.startsWith('-');
  const z = BigInt(ganz.replace('-', '') || '0') * 10n ** BigInt(stellen) + BigInt((rest + '0'.repeat(stellen)).slice(0, stellen) || '0');
  return neg ? -z : z;
}

/** GP in Cent = kaufmännisch gerundet(Menge × EP, 2) (N2), Menge und EP mit je 3 Nachkommastellen, beide ≥ 0. */
export function gpCent(menge: string, ep: string): bigint {
  const produkt = festkomma(menge, 3) * festkomma(ep, 3); // 6 Nachkommastellen
  return (produkt + 5000n) / 10000n;
}
