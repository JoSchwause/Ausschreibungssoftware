// SPDX-License-Identifier: AGPL-3.0-or-later
// Tor M1 „LV anlegen, rechnen, speichern“ (plan.md §4, Ticket 39): nur über Tastatur und Schaltflächen. Projekt anlegen,
// LV mit Maske NN.NN.NNNN[I], Titel 01 mit Untertiteln 01.01 und 01.02, fünf Positionen aus der Fixture `typisch`,
// Umnummerieren, Nachlass 2,00 %, Seite neu laden: dieselben Werte. Dazu die Merkmale (Ticket 37 ist gemergt):
// 01.0010 pauschal, 01.0060 Bedarf mit Gesamtbetrag (Summen gleich), zwei weitere Positionen unter 01.02 als Bedarf ohne
// Gesamtbetrag mit Stundenlohn und als Wahl: Netto unverändert, Bedarfs- und Wahlsumme getrennt ausgewiesen.

import { expect, test, type Page } from '@playwright/test';
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
const position = (oz: string, index?: string): FxPosition => {
  const k = typisch.knoten.find(
    (x) => x.art === 'position' && x.ordnungszahl === oz && (x as { ozIndex?: string }).ozIndex === index,
  );
  if (k === undefined) throw new Error(`Fixture-OZ ${oz} fehlt`);
  return k as FxPosition;
};
const gp = (p: FxPosition): string => {
  const w = typisch.sollwerte.positionen[p.id]?.gp;
  if (w === undefined || w === null) throw new Error(`Kein Sollwert für ${p.ordnungszahl}`);
  return betragDe(w);
};

const unter0101 = ['01.0010', '01.0020', '01.0030'].map((oz) => position(oz));
const unter0102 = ['01.0050', '01.0060'].map((oz) => position(oz));

/** Sollwerte aus Ticket 39 (Rechenregel aus fixtures/README.md). */
const ERWARTET_ZEILEN = [
  ['01', 'Baustelleneinrichtung', '5.503,99'],
  ['01.01', 'Einrichten', '3.356,43'],
  ...unter0101.map((p, i) => [`01.01.00${String(i + 1)}0`, p.kurztext, gp(p)]),
  ['01.02', 'Räumen und Entsorgen', '2.147,56'],
  ...unter0102.map((p, i) => [`01.02.00${String(i + 1)}0`, p.kurztext, gp(p)]),
];
const bedarf = position('01.0040');
const wahl = position('02.0070', 'A');
/** Nach den Merkmalen: zwei Positionen mehr unter 01.02, die Titelsummen bleiben (sie gehen nicht in die Summe ein). */
const ERWARTET_ZEILEN_MERKMALE = [
  ...ERWARTET_ZEILEN,
  ['01.02.0030', bedarf.kurztext, '586,80'],
  ['01.02.0040', wahl.kurztext, '5.880,00'],
];
const ERWARTET_ARTEN = [
  'Titel',
  'Titel',
  'pauschal',
  'Normal',
  'Normal',
  'Titel',
  'Normal',
  'Bedarf m. GB',
  'Bedarf, Stundenlohn',
  'Wahl',
];
const ERWARTET_AUSWEISE = { Bedarfssumme: '586,80', Wahlsumme: '5.880,00' };

const ERWARTET_SUMMEN = {
  Netto: '5.503,99',
  Nachlass: '110,08',
  'Netto nach Nachlass': '5.393,91',
  MwSt: '1.024,84',
  Brutto: '6.418,75',
};

const zelle = (page: Page, zeile: number, spalte: string) =>
  page.locator(`[role="row"][data-i="${String(zeile)}"] [data-spalte="${spalte}"]`);

/** Spalte „Art“ aller sichtbaren Zeilen (leer bei Gliederungen). */
function arten(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('[role="treegrid"] [role="row"][data-i]')]
      .sort((a, b) => Number(a.getAttribute('data-i')) - Number(b.getAttribute('data-i')))
      .map((r) => r.querySelector('[data-spalte="positionsart"] .tx-grid__text')?.textContent ?? ''),
  );
}

/** Mit der Tastatur zur Zeile (Pfeil runter aus der Zeile davor), dann Merkmale-Dialog: ankreuzen, Enter. */
async function merkmaleSetzen(page: Page, zeile: number, ankreuzen: readonly string[]): Promise<void> {
  await zelle(page, zeile - 1, 'kurztext').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Control+Alt+KeyM');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (const label of ankreuzen) {
    await dialog.getByLabel(label, { exact: true }).focus();
    await page.keyboard.press('Space');
  }
  await page.keyboard.press('Enter');
  await expect(dialog).toHaveCount(0);
}

test('M1: LV anlegen, rechnen, speichern – nach dem Neuladen stehen dieselben Werte da', async ({ page }) => {
  // Die GP der Fixture stimmen mit der Tabelle im Ticket überein (zweiter Abgleich).
  expect([...unter0101, ...unter0102].map(gp)).toEqual([
    '1.850,00',
    '644,43',
    '862,00',
    '1.169,97',
    '977,59',
  ]);

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
  const menge = zelle(page, 3, 'menge');
  await expect(menge).toHaveText('86,500');

  // Merkmale: 01.0010 pauschal, 01.0060 Bedarf mit Gesamtbetrag; die Summen bleiben gleich.
  await merkmaleSetzen(page, 2, ['Pauschal']);
  await merkmaleSetzen(page, 7, ['Bedarf mit Gesamtbetrag']);
  await expect.poll(() => summen(page)).toMatchObject({ ...ERWARTET_SUMMEN, Bedarfssumme: '0,00' });
  // Zwei Positionen hinter 01.0060: Bedarf ohne Gesamtbetrag mit Stundenlohn, Wahl.
  await zelle(page, 6, 'kurztext').focus();
  await page.keyboard.press('ArrowDown');
  await positionTippen(page, bedarf);
  await positionTippen(page, wahl);
  await merkmaleSetzen(page, 8, ['Bedarf ohne Gesamtbetrag', 'Stundenlohn']);
  await merkmaleSetzen(page, 9, ['Wahlposition']);
  await page.getByRole('button', { name: 'Umnummerieren' }).click();
  await expect.poll(() => zeilen(page)).toEqual(ERWARTET_ZEILEN_MERKMALE);
  await expect.poll(() => arten(page)).toEqual(ERWARTET_ARTEN);
  await expect.poll(() => summen(page)).toMatchObject({ ...ERWARTET_SUMMEN, ...ERWARTET_AUSWEISE });

  await page.reload();
  await expect(page.getByRole('treegrid', { name: 'Positionen' })).toBeVisible();
  await expect.poll(() => zeilen(page)).toEqual(ERWARTET_ZEILEN_MERKMALE);
  await expect.poll(() => arten(page)).toEqual(ERWARTET_ARTEN);
  await expect.poll(() => summen(page)).toMatchObject({ ...ERWARTET_SUMMEN, ...ERWARTET_AUSWEISE });
  await expect(page.getByRole('textbox', { name: 'Nachlass', exact: true })).toHaveValue('2,00');
  await expect(page.getByRole('textbox', { name: 'MwSt-Satz' })).toHaveValue('19,00');
  await expect(menge).toHaveText('86,500');
  await expect(zelle(page, 3, 'einheit')).toHaveText('m');
  await expect(zelle(page, 3, 'einheitspreis')).toHaveText('7,450');
});
