// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 152 (A5, E11): Rechnung mit Skonto und Bauabzugsteuer prüfen und freigeben, Zahlungen erfassen, ändern und
// löschen, „Freigabe aufheben“ gesperrt, solange Zahlungen bestehen; AR 2 mit Vertragsstrafe (Vorschlag aus AR 1);
// Rechnungsprüfung mit Zahlungsfreigabe als PDF (Vorschau) und Excel; Aufmaßblatt und Soll/Ist als PDF und Excel. Weg wie
// `rechnung.spec.ts` (LV `typisch`, Angebot von Bieter B als X84, Zuschlag in der Oberfläche; Nachtrag, Blätter und die
// Korrektur über den Testpfad), danach alles in der Oberfläche. Alle erwarteten Zahlen stehen in
// `fixtures/typisch-zahlungen.json` (Ticket 143, unabhängig hergeleitet) bzw. `typisch-abrechnung.json` (M4).

import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import type { AuftragsLeistungsverzeichnisId, ProjektId } from '@tethys/vertrag';
import { alsText, liesPdf } from '../../../packages/ausgabe/src/pdftext';
import { excelZeilen } from '../../../packages/ausgabe/src/testhilfe/kernkette';
import { fixtureInhalt } from './fixture-inhalt';
import { betragDe, projektAnlegen } from './hilfen';
import {
  A5_BEFEHLE,
  A5_PRUEFUNGEN,
  A5_RECHNUNGEN,
  M4_BIETER,
  M4_KORREKTUR,
  M4_NACHTRAG_LV,
  M4_RECHNUNGEN,
  m4Blatt,
  m4Nachtragsknoten,
} from './rechnung-fixture';
import { werkzeug } from './werkzeuge';

const wurzel = new URL('../../../', import.meta.url);
const datei = (rel: string): string => new URL(rel, wurzel).pathname;
const de = (b: string): string => b.replace('.', ',');
const BUERO = 'Planungsbüro Muster (erfunden)';

const [AR1, AR2] = A5_RECHNUNGEN;
const M4AR1 = M4_RECHNUNGEN[0];
if (AR1 === undefined || AR2 === undefined || M4AR1 === undefined) throw new Error('Fixture');
const ZS1 = A5_PRUEFUNGEN.ar1.zahlungsstand;
const ZS2 = A5_PRUEFUNGEN.ar2.zahlungsstand;
const STRAFE = AR2.vertragsstrafe;
if (STRAFE === undefined) throw new Error('Fixture: Vertragsstrafe');
const zahlungsbefehl = (b: (typeof A5_BEFEHLE.ar2.nachFreigabe)[number]) => {
  if (b.art !== 'ZahlungErfassen') throw new Error('Fixture: Zahlung');
  return b.zahlung;
};
const Z21 = zahlungsbefehl(A5_BEFEHLE.ar2.nachFreigabe[0] ?? A5_BEFEHLE.ar1.freigabe);
const Z22 = zahlungsbefehl(A5_BEFEHLE.ar2.nachFreigabe[1] ?? A5_BEFEHLE.ar1.freigabe);
const Z11 = zahlungsbefehl(A5_BEFEHLE.ar1.nachFreigabe[0] ?? A5_BEFEHLE.ar1.freigabe);
/** `JJJJ-MM-TT` → `TT.MM.JJJJ`. */
const datumDe = (d: string): string => d.split('-').reverse().join('.');

async function bueroSetzen(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Büro (Absender) …' }).click();
  const buero = page.getByRole('dialog', { name: 'Büro (Absender)' });
  await buero.getByLabel('Name des Büros').fill(BUERO);
  await buero.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByText('Büro gespeichert').first()).toBeVisible();
  await buero.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(buero).toBeHidden();
}

/** Projekt, LV `typisch`, Angebot von Bieter B, Zuschlag, Nachtrag N01 und Blatt 1 (wie `rechnung.spec.ts`). */
async function auftragMitBlatt1(
  page: Page,
): Promise<{ projektId: ProjektId; auftragsLvId: AuftragsLeistungsverzeichnisId }> {
  await projektAnlegen(page, 'Musterhaus', 'Bauherr');
  const projektId = decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1) ?? '') as ProjektId;
  const inhalt = fixtureInhalt('typisch');
  const lv = await page.evaluate(([id, i]) => window.tethysTest?.lvAnlegen(id as never, i as never), [
    projektId,
    inhalt,
  ] as const);
  expect(lv?.ok).toBe(true);
  await page.goto(`/lv/${inhalt.wurzelId}`);
  await page
    .getByLabel('Angebotsdatei wählen')
    .setInputFiles(datei('fixtures/angebote/typisch-bieter-b.x84'));
  const einlesen = page.getByRole('dialog', { name: 'Angebot (X84) einlesen' });
  await einlesen.getByRole('button', { name: 'Übernehmen' }).click();
  const angebote = page.getByRole('dialog', { name: 'Angebote' });
  await expect(angebote.getByRole('row', { name: new RegExp(M4_BIETER) })).toBeVisible();
  await angebote.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await werkzeug(page, 'Angebote', 'Preisspiegel');
  await page
    .getByRole('table', { name: 'Bieter des Preisspiegels' })
    .getByRole('button', { name: `Zuschlag erteilen: ${M4_BIETER}` })
    .click();
  const zuschlag = page.getByRole('dialog', { name: `Zuschlag erteilen – ${M4_BIETER}` });
  await zuschlag.getByRole('button', { name: 'Zuschlag erteilen', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Auftrags-LV – / })).toBeVisible();
  const auftragsLvId = decodeURIComponent(
    new URL(page.url()).pathname.split('/').at(-1) ?? '',
  ) as AuftragsLeistungsverzeichnisId;
  expect(
    await page.evaluate(([a, n, k]) => window.tethysTest?.nachtragUebernehmen(a, n, k), [
      auftragsLvId,
      M4_NACHTRAG_LV,
      m4Nachtragsknoten(auftragsLvId),
    ] as const),
  ).toBe(true);
  const blatt1 = m4Blatt(0, projektId, auftragsLvId);
  expect(await page.evaluate((a) => window.tethysTest?.aufmassAnlegen(a), blatt1)).toBe(true);
  return { projektId, auftragsLvId };
}

const aktionen = (page: Page): Locator => page.getByRole('toolbar', { name: 'Aktionen der Rechnung' });

/** Wählt in der Gruppe „Ausgabe“ einer Leiste den Punkt `name`. */
async function ausgabe(leiste: Locator, name: string): Promise<void> {
  await leiste.getByRole('button', { name: 'Ausgabe', exact: true }).click();
  await leiste.page().getByRole('menu').getByRole('menuitem', { name, exact: true }).click();
}

/** PDF: Vorschau erzeugen (im Dialog), dann genau diese Bytes herunterladen; der Text des PDF. */
async function pdfMitVorschau(page: Page, titel: string, dateiname: RegExp): Promise<string> {
  const dialog = page.getByRole('dialog', { name: titel });
  await expect(dialog.getByTestId('pdf-dateiname')).toHaveText(dateiname);
  await expect(dialog.getByRole('button', { name: 'Herunterladen' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Vorschau erzeugen' }).click();
  await expect(dialog.locator('iframe[title="Vorschau des PDF"]')).toBeVisible({ timeout: 60_000 });
  const [d] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Herunterladen' }).click(),
  ]);
  // Den Dateinamen prüft der Dialog (oben): Ohne UTF-8-Locale meldet Chromium für Namen mit Umlaut nur „download“.
  const bytes = readFileSync(await d.path());
  expect(bytes.subarray(0, 4).toString('latin1')).toBe('%PDF');
  await expect(dialog).toBeHidden();
  return alsText(await liesPdf(new Uint8Array(bytes))).replace(/\s+/g, ' ');
}

/** Excel: Datei erzeugen und herunterladen; die Zeilen der ersten Tabelle als Text. */
async function excelLaden(page: Page, titel: string, dateiname: RegExp): Promise<string> {
  const dialog = page.getByRole('dialog', { name: titel });
  await expect(dialog.getByTestId('excel-dateiname')).toHaveText(dateiname);
  const [d] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Herunterladen' }).click(),
  ]);
  await expect(dialog).toBeHidden();
  return excelZeilen(new Uint8Array(readFileSync(await d.path())))
    .map((z) => z.join(' '))
    .join('\n');
}

async function neueRechnung(page: Page, nummer: number): Promise<Locator> {
  await page
    .getByRole('toolbar', { name: 'Werkzeuge der Rechnungen' })
    .getByRole('button', { name: 'Rechnung anlegen' })
    .click();
  const dialog = page.getByRole('dialog', { name: `Rechnung ${String(nummer)} anlegen` });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function zahlungErfassen(page: Page, datum: string, betrag: string): Promise<void> {
  await page.getByRole('button', { name: 'Zahlung erfassen …' }).click();
  const dialog = page.getByRole('dialog', { name: 'Zahlung erfassen' });
  await dialog.getByLabel('Zahlungsdatum').fill(datumDe(datum));
  await dialog.getByLabel('Gezahlter Betrag').fill(de(betrag));
  await dialog.getByLabel('Gezahlter Betrag').press('Enter');
  await expect(dialog).toBeHidden();
}

/** Die Fälle des Skontos und der geltende Fall wie der Zahlungsstand der Fixture. */
async function zahlungsstandPruefen(
  page: Page,
  zs: typeof ZS1,
  steuer: boolean,
  skonto: 'verwirklicht' | 'nicht verwirklicht',
): Promise<void> {
  const minus = (b: string): string => (b === '0.00' ? betragDe(b) : `−${betragDe(b)}`);
  await expect(page.getByTestId('fall-mit-zahlbetrag')).toHaveText(betragDe(zs.zahlbetrag));
  await expect(page.getByTestId('fall-mit-skonto')).toHaveText(minus(zs.mitSkonto.skonto));
  await expect(page.getByTestId('fall-ohne-skonto')).toHaveText(minus(zs.ohneSkonto.skonto));
  if (steuer) {
    await expect(page.getByTestId('fall-mit-bauabzugsteuer')).toHaveText(minus(zs.mitSkonto.bauabzugsteuer));
    await expect(page.getByTestId('fall-ohne-bauabzugsteuer')).toHaveText(
      minus(zs.ohneSkonto.bauabzugsteuer),
    );
  } else await expect(page.getByTestId('fall-mit-bauabzugsteuer')).toHaveCount(0);
  await expect(page.getByTestId('fall-mit-auszahlung')).toHaveText(betragDe(zs.mitSkonto.auszahlung));
  await expect(page.getByTestId('fall-ohne-auszahlung')).toHaveText(betragDe(zs.ohneSkonto.auszahlung));
  await expect(page.getByTestId('skonto-satz')).toHaveText(
    `Bei Zahlung bis ${datumDe(zs.fristende ?? '')}: Auszahlung ${betragDe(zs.mitSkonto.auszahlung)} €, danach: ${betragDe(zs.ohneSkonto.auszahlung)} €.`,
  );
  const geltend = page.getByRole('table', { name: 'Geltender Fall' });
  await expect(geltend.getByRole('row', { name: new RegExp(`^Skonto \\(${skonto}\\)`) })).toBeVisible();
  await expect(page.getByTestId('zahlung-skonto')).toHaveText(minus(zs.verwirklichterSkonto));
  await expect(page.getByTestId('zahlung-auszahlung')).toHaveText(betragDe(zs.auszahlung));
  await expect(page.getByTestId('zahlung-summeZahlungen')).toHaveText(minus(zs.summeZahlungen));
  await expect(page.getByTestId('zahlung-offen')).toHaveText(betragDe(zs.offen));
}

test('Rechnung mit Skonto prüfen und freigeben, Zahlungen, Zahlungsfreigabe als PDF und Excel; AR 2 mit Vertragsstrafe', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await bueroSetzen(page);
  const { projektId, auftragsLvId } = await auftragMitBlatt1(page);
  await werkzeug(page, 'Abrechnung', 'Rechnungen');
  await expect(page.getByRole('heading', { level: 1, name: /^Rechnungen – / })).toBeVisible();

  // AR 1: Eingang, Umlage und Sicherheitseinbehalt wie M4; Skonto 3 % / 14 Tage, Bauabzugsteuer (Leertaste).
  let dialog = await neueRechnung(page, 1);
  await dialog.getByLabel('Eingangsdatum').fill(datumDe(AR1.eingang ?? ''));
  await dialog.getByRole('button', { name: 'Umlage hinzufügen' }).click();
  const umlage = M4AR1.umlagen[0];
  if (umlage === undefined) throw new Error('Fixture: Umlage');
  await dialog.getByLabel('Bezeichnung der Umlage 1').fill(umlage.bezeichnung);
  await dialog.getByLabel('Satz der Umlage 1').fill(de(umlage.satz));
  await dialog.getByLabel('Sicherheitseinbehalt').fill(de(M4AR1.sicherheitSatz ?? ''));
  await dialog.getByLabel('Skontosatz').fill(de(AR1.skonto?.satz ?? ''));
  await dialog.getByLabel('Skontofrist').fill(String(AR1.skonto?.fristTage));
  await dialog.getByRole('checkbox', { name: 'Bauabzugsteuer einbehalten' }).focus();
  await page.keyboard.press('Space');
  await expect(dialog.getByRole('checkbox', { name: 'Bauabzugsteuer einbehalten' })).toBeChecked();
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { level: 1, name: /^Abschlagsrechnung 1 – / })).toBeVisible();

  // Vor der Freigabe: Vorschau vom geprüften Zahlbetrag; beide Fälle des Skontos; Zahlungen gesperrt mit Erklärung.
  await expect(page.getByTestId('kette-zahlbetrag')).toHaveText(betragDe(A5_PRUEFUNGEN.ar1.kette.zahlbetrag));
  await expect(page.getByTestId('kette-vertragsstrafe')).toHaveCount(0);
  await expect(page.getByTestId('fall-mit-auszahlung')).toHaveText(betragDe(ZS1.mitSkonto.auszahlung));
  const erfassen = page.getByRole('button', { name: 'Zahlung erfassen …' });
  await expect(erfassen).toBeDisabled();
  await expect(erfassen).toHaveAccessibleDescription(
    'Zahlungen lassen sich erst nach der Freigabe erfassen.',
  );

  // Freigeben mit Bestätigung (Tastatur), dann die Zahlung am Fristende: Skonto verwirklicht, offen 0,00.
  await aktionen(page).getByRole('button', { name: 'Freigeben', exact: true }).focus();
  await page.keyboard.press('Enter');
  const frage = page.getByRole('dialog', { name: 'Rechnung 1 freigeben' });
  await frage.getByRole('button', { name: 'Freigeben', exact: true }).click();
  await expect(page.getByTestId('freigabe')).toHaveText(`Freigegeben mit ${betragDe(ZS1.zahlbetrag)} €`);
  await zahlungErfassen(page, Z11.datum, Z11.betrag);
  await zahlungsstandPruefen(page, ZS1, true, 'verwirklicht');
  await expect(page.getByRole('row', { name: /^Zahlbetrag \(eingefroren\)/ })).toBeVisible();
  await expect(
    page.getByRole('row', { name: /^Bauabzugsteuer 15,00 % an das Finanzamt/ }).first(),
  ).toBeVisible();

  // „Freigabe aufheben“ ist gesperrt, solange Zahlungen bestehen (Q5).
  const aufheben = page.getByRole('button', { name: 'Freigabe aufheben' });
  await expect(aufheben).toBeDisabled();
  await expect(aufheben).toHaveAccessibleDescription(
    'Zur Rechnung 1 ist 1 Zahlung erfasst. Zuerst die Zahlungen löschen.',
  );

  // Rechnungsprüfung mit Zahlungsfreigabe als PDF (Vorschau im Dialog), Büro und Projekt im Kopf.
  await ausgabe(aktionen(page), 'Rechnungsprüfung als PDF …');
  const pdf = await pdfMitVorschau(page, 'Rechnungsprüfung als PDF', /^Rechnungsprüfung 1 .+\.pdf$/);
  expect(pdf).toContain(BUERO);
  expect(pdf).toContain('Musterhaus');
  expect(pdf).toContain(betragDe(ZS1.zahlbetrag));
  await ausgabe(aktionen(page), 'Rechnungsprüfung als Excel …');
  const xlsx = await excelLaden(page, 'Rechnungsprüfung als Excel', /^Rechnungsprüfung 1 .+\.xlsx$/);
  expect(xlsx).toContain(BUERO);

  // Blatt 2 und die Korrektur an Blatt 1 (Testpfad), dann AR 2.
  expect(
    await page.evaluate((a) => window.tethysTest?.aufmassAnlegen(a), m4Blatt(1, projektId, auftragsLvId)),
  ).toBe(true);
  const blatt1 = m4Blatt(0, projektId, auftragsLvId).id;
  expect(
    await page.evaluate(([id, b]) => window.tethysTest?.aufmassBefehl(id, b), [
      blatt1,
      M4_KORREKTUR,
    ] as const),
  ).toBe(true);
  await page.getByRole('link', { name: 'Zur Rechnungsliste' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: /^Rechnungen – / })).toBeVisible();

  // Vorschlag aus AR 1: Skonto und Bauabzugsteuer; keine Vertragsstrafe (AR 1 hatte keine).
  dialog = await neueRechnung(page, 2);
  await expect(dialog.getByLabel('Skontosatz')).toHaveValue('3,00');
  await expect(dialog.getByLabel('Skontofrist')).toHaveValue('14');
  await expect(dialog.getByRole('checkbox', { name: 'Bauabzugsteuer einbehalten' })).toBeChecked();
  await expect(dialog.getByLabel('Vertragsstrafe (brutto, kumuliert)')).toHaveValue('');
  await dialog.getByLabel('Eingangsdatum').fill(datumDe(AR2.eingang ?? ''));
  // Ein Betrag ohne Grund wird am Feld gemeldet; nichts wird gespeichert (U5).
  await dialog.getByLabel('Vertragsstrafe (brutto, kumuliert)').fill(betragDe(STRAFE.betrag));
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(dialog.getByText('Bitte einen Grund der Vertragsstrafe angeben.')).toBeVisible();
  await dialog.getByLabel('Grund der Vertragsstrafe').fill(STRAFE.grund);
  await dialog.getByLabel('Skontosatz').fill(de(AR2.skonto?.satz ?? ''));
  await dialog.getByLabel('Skontofrist').fill(String(AR2.skonto?.fristTage));
  await dialog.getByRole('checkbox', { name: 'Bauabzugsteuer einbehalten' }).uncheck();
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { level: 1, name: /^Abschlagsrechnung 2 – / })).toBeVisible();
  const k2 = A5_PRUEFUNGEN.ar2.kette;
  await expect(page.getByTestId('kette-bruttoKumuliert')).toHaveText(betragDe(k2.bruttoKumuliert));
  await expect(page.getByTestId('kette-vertragsstrafe')).toHaveText(betragDe(k2.vertragsstrafe));
  await expect(
    page.getByRole('row', {
      name: new RegExp(`^Vertragsstrafe \\(${STRAFE.grund.replace(/[()]/g, '\\$&')}\\)`),
    }),
  ).toBeVisible();
  await expect(page.getByTestId('kette-einbehalt')).toHaveText(betragDe(k2.einbehalt));
  await expect(page.getByTestId('kette-frueher-1')).toHaveText(betragDe(k2.fruehereZahlbetraege));
  await expect(page.getByTestId('kette-zahlbetrag')).toHaveText(betragDe(k2.zahlbetrag));

  // Freigeben, Teilzahlung in der Frist und Rest danach: Skonto nicht verwirklicht, offen 570,67.
  await aktionen(page).getByRole('button', { name: 'Freigeben', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Rechnung 2 freigeben' })
    .getByRole('button', { name: 'Freigeben', exact: true })
    .click();
  await expect(page.getByTestId('freigabe')).toHaveText(`Freigegeben mit ${betragDe(ZS2.zahlbetrag)} €`);
  await zahlungErfassen(page, Z21.datum, Z21.betrag);
  await zahlungErfassen(page, Z22.datum, Z22.betrag);
  await zahlungsstandPruefen(page, ZS2, false, 'nicht verwirklicht');
  await expect(page.getByTestId('zahlungen').getByRole('row')).toHaveText([
    /Datum/,
    new RegExp(`${datumDe(Z21.datum)}\\s*${betragDe(Z21.betrag)}`),
    new RegExp(`${datumDe(Z22.datum)}\\s*${betragDe(Z22.betrag)}`),
  ]);

  // Ändern: die zweite Zahlung auf den Rest; Rückgängig stellt sie wieder her.
  await page.getByRole('button', { name: `Zahlung vom ${datumDe(Z22.datum)} ändern …` }).click();
  const aendern = page.getByRole('dialog', { name: 'Zahlung ändern' });
  await expect(aendern.getByLabel('Gezahlter Betrag')).toHaveValue(betragDe(Z22.betrag));
  await aendern.getByLabel('Gezahlter Betrag').fill('3.570,67');
  await aendern.getByRole('button', { name: 'Zahlung speichern' }).click();
  await expect(aendern).toBeHidden();
  await expect(page.getByTestId('zahlung-offen')).toHaveText('0,00');
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(page.getByTestId('zahlung-offen')).toHaveText(betragDe(ZS2.offen));

  // Löschen fragt (Q5); Rückgängig holt die Zahlung zurück.
  await page.getByRole('button', { name: `Zahlung vom ${datumDe(Z22.datum)} löschen …` }).click();
  const loeschen = page.getByRole('dialog', { name: 'Zahlung löschen' });
  await expect(loeschen).toContainText(`${betragDe(Z22.betrag)} €`);
  await loeschen.getByRole('button', { name: 'Zahlung löschen' }).click();
  await expect(page.getByTestId('zahlung-summeZahlungen')).toHaveText(`−${betragDe(Z21.betrag)}`);
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(page.getByTestId('zahlung-summeZahlungen')).toHaveText(`−${betragDe(ZS2.summeZahlungen)}`);

  // Neuladen: alles gespeichert; die Liste nennt den offenen Betrag je Rechnung.
  await page.reload();
  await zahlungsstandPruefen(page, ZS2, false, 'nicht verwirklicht');
  await page.getByRole('link', { name: 'Zur Rechnungsliste' }).click();
  const liste = page.getByRole('table', { name: 'Rechnungen des Auftrags-LV' });
  await expect(liste.getByTestId('zahlbetrag')).toHaveText([
    betragDe(ZS1.zahlbetrag),
    betragDe(ZS2.zahlbetrag),
  ]);
  await expect(liste.getByTestId('offen')).toHaveText([betragDe(ZS1.offen), betragDe(ZS2.offen)]);
});

test('Aufmaßblatt und Soll/Ist als PDF mit Vorschau und als Excel, mit Büro und Projekt', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await bueroSetzen(page);
  await auftragMitBlatt1(page);
  await werkzeug(page, 'Abrechnung', 'Aufmaß');
  await page.getByRole('link', { name: /^Blatt 1/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Aufmaßblatt 1 – / })).toBeVisible();

  // Aufmaßblatt: Mengenansätze mit Zeilenergebnis (2*(12+9)*0,6*0,8 = 20,160; Summe 21,473 laut Fixture).
  await werkzeug(page, 'Ausgabe', 'Aufmaßblatt als PDF …');
  const pdf = await pdfMitVorschau(page, 'Aufmaßblatt als PDF', /^Aufmaßblatt 1 .+\.pdf$/);
  expect(pdf).toContain(BUERO);
  expect(pdf).toContain('Musterhaus');
  expect(pdf).toContain('2*(12+9)*0,6*0,8');
  expect(pdf).toContain('20,160');
  expect(pdf).toContain('21,473');
  await werkzeug(page, 'Ausgabe', 'Aufmaßblatt als Excel …');
  const xlsx = await excelLaden(page, 'Aufmaßblatt als Excel', /^Aufmaßblatt 1 .+\.xlsx$/);
  expect(xlsx).toContain('2*(12+9)*0,6*0,8');
  expect(xlsx).toContain('21.473');

  // Soll/Ist mit den Schwellen der Seite.
  await page
    .getByRole('toolbar', { name: 'Werkzeuge des Aufmaßes' })
    .getByRole('link', { name: 'Soll/Ist' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: /^Soll\/Ist – / })).toBeVisible();
  await werkzeug(page, 'Ausgabe', 'Soll/Ist als PDF …');
  const sollIst = await pdfMitVorschau(page, 'Soll/Ist als PDF', /^Soll-Ist .+\.pdf$/);
  expect(sollIst).toContain(BUERO);
  expect(sollIst).toContain('110,00 %');
  expect(sollIst).toContain('86,500');
  await werkzeug(page, 'Ausgabe', 'Soll/Ist als Excel …');
  const sollIstXlsx = await excelLaden(page, 'Soll/Ist als Excel', /^Soll-Ist .+\.xlsx$/);
  expect(sollIstXlsx).toContain('86.5');
});
