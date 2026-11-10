// SPDX-License-Identifier: AGPL-3.0-or-later
// Tor M1 „LV anlegen, rechnen, speichern“ (plan.md §4, Ticket 39): nur über Tastatur und Schaltflächen. Projekt anlegen,
// LV mit Maske NN.NN.NNNN[I], Titel 01 mit Untertiteln 01.01 und 01.02, fünf Positionen aus der Fixture `typisch`,
// Umnummerieren, Nachlass 2,00 %, Seite neu laden: dieselben Werte.
//
// Merkmale (Pauschal, Bedarf, Wahl, Stundenlohn) gehören zum M1-E2E, sobald Ticket 37 gemergt ist; bis dahin holt sie
// Ticket 47 nach (D-10 (6), Ticket 39 Comments).

import { expect, test } from '@playwright/test';
import {
  betragDe,
  fixture,
  lvAnlegen,
  neueZeile,
  positionTippen,
  projektAnlegen,
  summen,
  tippe,
  zeilen,
  type FxPosition,
} from './hilfen';

const typisch = fixture('typisch');
const position = (oz: string): FxPosition => {
  const k = typisch.knoten.find((x) => x.art === 'position' && x.ordnungszahl === oz);
  if (k === undefined) throw new Error(`Fixture-OZ ${oz} fehlt`);
  return k as FxPosition;
};
const gp = (p: FxPosition): string => {
  const w = typisch.sollwerte.positionen[p.id]?.gp;
  if (w === undefined || w === null) throw new Error(`Kein Sollwert für ${p.ordnungszahl}`);
  return betragDe(w);
};

const unter0101 = ['01.0010', '01.0020', '01.0030'].map(position);
const unter0102 = ['01.0050', '01.0060'].map(position);

/** Sollwerte aus Ticket 39 (Rechenregel aus fixtures/README.md). */
const ERWARTET_ZEILEN = [
  ['01', 'Baustelleneinrichtung', '5.503,99'],
  ['01.01', 'Einrichten', '3.356,43'],
  ...unter0101.map((p, i) => [`01.01.00${String(i + 1)}0`, p.kurztext, gp(p)]),
  ['01.02', 'Räumen und Entsorgen', '2.147,56'],
  ...unter0102.map((p, i) => [`01.02.00${String(i + 1)}0`, p.kurztext, gp(p)]),
];
const ERWARTET_SUMMEN = {
  Netto: '5.503,99',
  Nachlass: '110,08',
  'Netto nach Nachlass': '5.393,91',
  MwSt: '1.024,84',
  Brutto: '6.418,75',
};

test('M1: LV anlegen, rechnen, speichern – nach dem Neuladen stehen dieselben Werte da', async ({ page }) => {
  // Die GP der Fixture stimmen mit der Tabelle im Ticket überein (zweiter Abgleich).
  expect([...unter0101, ...unter0102].map(gp)).toEqual(['1.850,00', '644,43', '862,00', '1.169,97', '977,59']);

  await projektAnlegen(page, 'Kita Sonnenhang', 'Gemeinde Musterdorf');
  await lvAnlegen(page, 'Rohbau');

  // Titel 01 über die Schaltfläche, Untertitel und zweiten Untertitel über die Tastenkürzel.
  await neueZeile(page, () => page.getByRole('button', { name: /^Titel anlegen/ }).click());
  await tippe(page, 'Baustelleneinrichtung', 'Enter');
  await neueZeile(page, () => page.keyboard.press('Control+Alt+KeyU'));
  await tippe(page, 'Einrichten', 'Enter');
  await neueZeile(page, () => page.keyboard.press('Control+Alt+KeyT'));
  await tippe(page, 'Räumen und Entsorgen', 'Enter');

  // Drei Positionen unter dem ersten Untertitel: zum Untertitel hoch, dann jeweils hinter der aktiven Zeile.
  await page.keyboard.press('ArrowUp');
  for (const p of unter0101) await positionTippen(page, p);
  // Zum zweiten Untertitel: die Zeile unter der dritten Position.
  await page.keyboard.press('ArrowDown');
  for (const p of unter0102) await positionTippen(page, p);

  await page.getByRole('button', { name: 'Umnummerieren' }).click();
  await expect.poll(() => zeilen(page)).toEqual(ERWARTET_ZEILEN.map(([oz, kt, s]) => [oz, kt, s]));

  // Nachlass 2,00 % an der Summenzeile.
  await page.getByRole('textbox', { name: 'Nachlass', exact: true }).focus();
  await page.keyboard.type('2');
  await page.keyboard.press('Enter');
  await expect.poll(() => summen(page)).toMatchObject(ERWARTET_SUMMEN);
  // Die Einheiten und Mengen stehen wie getippt.
  const menge = page.locator('[role="row"][data-i="3"] [data-spalte="menge"]');
  await expect(menge).toHaveText('86,500');

  await page.reload();
  await expect(page.getByRole('treegrid', { name: 'Positionen' })).toBeVisible();
  await expect.poll(() => zeilen(page)).toEqual(ERWARTET_ZEILEN);
  await expect.poll(() => summen(page)).toMatchObject(ERWARTET_SUMMEN);
  await expect(page.getByRole('textbox', { name: 'Nachlass', exact: true })).toHaveValue('2,00');
  await expect(page.getByRole('textbox', { name: 'MwSt-Satz' })).toHaveValue('19,00');
  await expect(menge).toHaveText('86,500');
  await expect(page.locator('[role="row"][data-i="3"] [data-spalte="einheit"]')).toHaveText('m');
  await expect(page.locator('[role="row"][data-i="3"] [data-spalte="einheitspreis"]')).toHaveText('7,450');
});
