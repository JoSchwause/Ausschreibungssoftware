// SPDX-License-Identifier: AGPL-3.0-or-later
// Tor X4 (Ticket 120, D-58): Mängel und Bautagebuch über die Oberfläche, mit fester Uhr (`page.clock`, 26.11.2026 = Stichtag
// der Fixture). Zwei Auftrags-LVs mit zwei Auftragnehmern (Zuschlag an Bieter A und B, Aufbau in `x4-aufbau.ts`), dann die
// fünf Mängel und die drei Bautagebucheinträge aus `fixtures/bauleitung.json` (Ticket 112) über Formulare und Statusaktionen:
// genau der überfällige Mangel 3 als Befund (mit Sprunglink), Auswertung je Auftragnehmer = Soll, Filter, Rückgängig und
// Wiederholen, beide PDFs der Mängel und das des Bautagebuchs (mit pdf.js zurückgelesen), Neuladen.
//
// Alle erwarteten Zahlen stehen in der Fixture (Herleitung dort), nie aus einem Lauf der App. Dieselben Sollwerte prüft
// `src/x4-kette.test.ts` ohne Oberfläche (D-58). Bedienung nur über Schaltflächen, Felder und Tastatur (U3, U8).

import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { alsText, liesPdf } from '../../../packages/ausgabe/src/pdftext';
import { projektAnlegen } from './hilfen';
import { ERSTE_FRIST_MANGEL_2, X4_AUFTRAEGE, datumDeFx, x4Fixture, type X4Auftrag } from './x4-aufbau';

const f = x4Fixture();
const wurzel = new URL('../../../', import.meta.url);
const datei = (rel: string): string => new URL(rel, wurzel).pathname;
const bieterVon = (fixtureAuftragnehmer: string): string => {
  const a = X4_AUFTRAEGE.find((x) => x.fixtureAuftragnehmer === fixtureAuftragnehmer);
  if (a === undefined) throw new Error(`Kein Auftragnehmer ${fixtureAuftragnehmer}`);
  return a.bieter;
};
/** Der Auftragnehmer eines Mangels der Fixture, wie ihn die App nach dem Zuschlag nennt (Bieter). */
const auftragnehmerVon = (auftragsLvId: string | null): string | null => {
  if (auftragsLvId === null) return null;
  const fx = f.auftraege.find((a) => a.auftragsLvId === auftragsLvId);
  return fx === undefined ? null : bieterVon(fx.auftragnehmer);
};

const werkzeuge = (page: Page): Locator => page.getByRole('toolbar', { name: 'Werkzeuge der Mängel' });
const maengelGrid = (page: Page): Locator => page.getByRole('treegrid', { name: 'Mängel', exact: true });
const nummernZellen = (grid: Locator): Locator =>
  grid.locator('[role="row"] [data-spalte="nummer"] .tx-grid__text');

/** Die Zelle `spalte` der Zeile des Mangels mit dieser Nummer. */
function zelle(page: Page, nummer: number, spalte: string): Locator {
  const grid = maengelGrid(page);
  return grid
    .locator('[role="row"]')
    .filter({
      has: page.locator('[data-spalte="nummer"] .tx-grid__text', {
        hasText: new RegExp(`^${String(nummer)}$`),
      }),
    })
    .locator(`[data-spalte="${spalte}"] .tx-grid__text`);
}

/** LV (Testpfad), Angebot des Bieters (X84 über die Oberfläche) und Zuschlag ohne Wahl: ein Auftrags-LV. */
async function auftragErteilen(page: Page, projektId: string, a: X4Auftrag): Promise<void> {
  const inhalt = a.inhalt();
  const lv = await page.evaluate(([id, i]) => window.tethysTest?.lvAnlegen(id as never, i as never), [
    projektId,
    inhalt,
  ] as const);
  expect(lv?.ok).toBe(true);
  await page.goto(`/lv/${inhalt.wurzelId}`);
  await page.getByLabel('Angebotsdatei wählen').setInputFiles(datei(a.datei));
  const einlesen = page.getByRole('dialog', { name: 'Angebot (X84) einlesen' });
  await expect(einlesen.getByLabel('Bieter')).toHaveValue(a.bieter);
  await einlesen.getByRole('button', { name: 'Übernehmen' }).click();
  const angebote = page.getByRole('dialog', { name: 'Angebote' });
  await expect(angebote.getByRole('row', { name: new RegExp(a.bieter) })).toBeVisible();
  await angebote.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await page.getByRole('toolbar').getByRole('link', { name: 'Preisspiegel' }).click();
  await page
    .getByRole('table', { name: 'Bieter des Preisspiegels' })
    .getByRole('button', { name: `Zuschlag erteilen: ${a.bieter}` })
    .click();
  await page
    .getByRole('dialog', { name: `Zuschlag erteilen – ${a.bieter}` })
    .getByRole('button', { name: 'Zuschlag erteilen', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: /^Auftrags-LV – / })).toBeVisible();
}

/** Der Auswahl-Wert eines Selects der Oberfläche (Radix), in einem Dialog oder auf der Seite. */
async function waehle(
  page: Page,
  bereich: Locator | Page,
  label: string,
  option: string | RegExp,
): Promise<void> {
  await bereich.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option }).click();
}

const FX_MANGEL = f.maengel;
const STATUS_AKTION = {
  angezeigt: { knopf: 'Mangel anzeigen (Frist)', dialog: 'Mangel anzeigen' },
  beseitigt: { knopf: 'Beseitigung gemeldet', dialog: 'Beseitigung gemeldet' },
  abgenommen: { knopf: 'Abnehmen', dialog: 'Mangel abnehmen' },
  offen: { knopf: 'Wieder öffnen', dialog: 'Mangel wieder öffnen' },
} as const;

/** Legt einen Mangel über „Neuer Mangel“ an; die Feststellung steht als erster Eintrag `offen` im Verlauf. */
async function mangelAnlegen(page: Page, m: (typeof FX_MANGEL)[number], frist: string | null): Promise<void> {
  await werkzeuge(page).getByRole('button', { name: 'Neuer Mangel' }).click();
  const d = page.getByRole('dialog', { name: 'Neuer Mangel' });
  // Die Nummer ist vorgeschlagen (höchste + 1); die Fixture nennt sie ausdrücklich.
  await expect(d.getByLabel('Nummer', { exact: true })).toHaveValue(String(m.nummer));
  await d.getByLabel('Titel', { exact: true }).fill(m.titel);
  if (m.beschreibung !== null) await d.getByLabel('Beschreibung', { exact: true }).fill(m.beschreibung);
  if (m.ort !== null) await d.getByLabel('Ort', { exact: true }).fill(m.ort);
  await d.getByLabel('Festgestellt am', { exact: true }).fill(datumDeFx(m.festgestellt));
  if (frist !== null) await d.getByLabel('Frist', { exact: true }).fill(datumDeFx(frist));
  const bieter = auftragnehmerVon(m.auftragsLvId);
  if (bieter !== null) await waehle(page, d, 'Auftrags-LV', new RegExp(`\\(${bieter}\\)$`));
  await d.getByRole('button', { name: 'Speichern' }).click();
  await expect(d).toBeHidden();
  await expect(page.getByTestId('auswahl')).toHaveText(`Ausgewählt: Mangel ${String(m.nummer)} – ${m.titel}`);
}

/** Eine Statusaktion der Werkzeugleiste mit Datum, Bemerkung und (bei „anzeigen“) Frist. */
async function statusAktion(
  page: Page,
  status: keyof typeof STATUS_AKTION,
  datum: string,
  bemerkung: string | null,
  frist: string | null,
): Promise<void> {
  const a = STATUS_AKTION[status];
  await werkzeuge(page).getByRole('button', { name: a.knopf, exact: true }).click();
  const d = page.getByRole('dialog', { name: a.dialog });
  await d.getByLabel('Datum', { exact: true }).fill(datumDeFx(datum));
  if (frist !== null) await d.getByLabel('Frist zur Beseitigung', { exact: true }).fill(datumDeFx(frist));
  if (bemerkung !== null) await d.getByLabel('Bemerkung', { exact: true }).fill(bemerkung);
  await d.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(d).toBeHidden();
}

/** Zeilen der Tabelle „Auswertung zum Stichtag“ eines Auftragnehmers: Mängel, offen, überfällig. */
async function auswertungsZeile(page: Page, name: string): Promise<[string, string, string]> {
  const z = page.getByTestId(`auswertung-${name}`);
  return [
    (await z.locator('[data-feld="anzahl"]').textContent()) ?? '',
    (await z.locator('[data-feld="offen"]').textContent()) ?? '',
    (await z.locator('[data-feld="ueberfaellig"]').textContent()) ?? '',
  ];
}

/** Löst den Download aus, liest die Datei und gibt Name und Text des PDF zurück. */
async function pdfErzeugen(page: Page, dialog: Locator): Promise<{ name: string; text: string }> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'PDF erzeugen' }).click(),
  ]);
  const bytes = readFileSync(await download.path());
  expect(bytes.subarray(0, 4).toString('latin1')).toBe('%PDF');
  await expect(dialog).toBeHidden();
  return { name: download.suggestedFilename(), text: alsText(await liesPdf(new Uint8Array(bytes))) };
}

/** Alle Sollwerte der Mängelseite (nach dem Anlegen und nach dem Neuladen gleich). */
async function maengelPruefen(page: Page): Promise<void> {
  // Status und Frist je Mangel wie die Fixture
  for (const s of f.sollwerte.status) await expect(zelle(page, s.nummer, 'status')).toHaveText(s.status);
  for (const m of FX_MANGEL)
    await expect(zelle(page, m.nummer, 'frist')).toHaveText(m.frist === null ? '–' : datumDeFx(m.frist));

  // genau der überfällige Mangel als Befund und als Kennzeichen in der Liste
  const soll = f.sollwerte.fristpruefung;
  const befunde = page.getByRole('list', { name: 'Befunde der Fristprüfung' }).getByRole('listitem');
  await expect(befunde).toHaveCount(soll.ueberfaellig.length);
  const ueberfaellig = soll.ueberfaellig[0];
  if (ueberfaellig === undefined) throw new Error('Fixture');
  const titel = FX_MANGEL.find((m) => m.nummer === ueberfaellig.nummer)?.titel ?? '';
  await expect(befunde.first()).toContainText(
    `Mangel ${String(ueberfaellig.nummer)} – ${titel}: Frist ${datumDeFx(ueberfaellig.frist)} vor dem Stichtag ${datumDeFx(f.stichtag)} überschritten`,
  );
  for (const m of FX_MANGEL) {
    const z = zelle(page, m.nummer, 'ueberfaellig');
    if (soll.ueberfaellig.some((u) => u.nummer === m.nummer)) await expect(z).toContainText('überfällig');
    else await expect(z).toHaveText('');
  }
  for (const am of soll.fristAmStichtag) await expect(zelle(page, am.nummer, 'ueberfaellig')).toHaveText('');

  // Auswertung je Auftragnehmer und gesamt
  for (const z of f.sollwerte.auswertungMaengel.jeAuftragnehmer) {
    expect(await auswertungsZeile(page, bieterVon(z.auftragnehmer)), z.auftragnehmer).toEqual([
      String(z.anzahl),
      String(z.offen),
      String(z.ueberfaellig),
    ]);
  }
  const g = f.sollwerte.auswertungMaengel.gesamt;
  expect(await auswertungsZeile(page, 'gesamt')).toEqual([
    String(g.anzahl),
    String(g.offen),
    String(g.ueberfaellig),
  ]);
}

test('X4: Mängel und Bautagebuch aus der Fixture, Befund, Auswertung, PDFs, Rückgängig, Neuladen', async ({
  page,
}) => {
  test.setTimeout(240_000);
  // Feste Uhr: Heute ist der Stichtag der Fixture (nur `Date`; Zeitgeber laufen weiter).
  await page.clock.setFixedTime(new Date(2026, 10, 26, 12, 0, 0));

  await projektAnlegen(page, 'Musterhaus', 'Bauherr');
  const projektId = decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1) ?? '');
  for (const a of X4_AUFTRAEGE) await auftragErteilen(page, projektId, a);

  // --- Mängel über Formular und Statusaktionen --------------------------------------------------------------------
  await page.goto(`/projekt/${projektId}/maengel`);
  await expect(page.getByRole('heading', { level: 1, name: 'Mängel – Musterhaus' })).toBeVisible();
  await expect(page.getByText(`Stichtag der Fristprüfung: ${datumDeFx(f.stichtag)} (heute)`)).toBeVisible();
  await expect(page.getByText('Noch kein Mangel erfasst.')).toBeVisible();

  for (const m of FX_MANGEL) {
    // Mangel 2: „Frist zuerst 19.11.2026“, später über „Bearbeiten“ auf die der Fixture (04.12.2026)
    const ersteFrist = m.nummer === 2 ? ERSTE_FRIST_MANGEL_2 : m.frist;
    await mangelAnlegen(page, m, ersteFrist);
    for (const e of m.verlauf.slice(1))
      await statusAktion(page, e.status, e.datum, e.bemerkung, e.status === 'angezeigt' ? ersteFrist : null);
    await expect(zelle(page, m.nummer, 'status')).toHaveText(m.verlauf.at(-1)?.status ?? '');
    if (m.nummer === 2 && m.frist !== null) {
      await werkzeuge(page).getByRole('button', { name: 'Bearbeiten' }).click();
      const d = page.getByRole('dialog', { name: 'Mangel 2 bearbeiten' });
      await expect(d.getByLabel('Nummer', { exact: true })).toBeDisabled(); // fest nach dem Anlegen
      await d.getByLabel('Frist', { exact: true }).fill(datumDeFx(m.frist));
      await d.getByRole('button', { name: 'Speichern' }).click();
      await expect(d).toBeHidden();
      await expect(zelle(page, 2, 'frist')).toHaveText(datumDeFx(m.frist));
    }
  }
  await expect(nummernZellen(maengelGrid(page))).toHaveCount(FX_MANGEL.length);

  // Die Werkzeugleiste sperrt unzulässige Wechsel (Statustabelle in `bauleitung`): Mangel 5 ist angezeigt.
  await expect(werkzeuge(page).getByRole('button', { name: 'Mangel anzeigen (Frist)' })).toBeDisabled();
  await expect(werkzeuge(page).getByRole('button', { name: 'Beseitigung gemeldet' })).toBeEnabled();
  await expect(werkzeuge(page).getByRole('button', { name: 'Wieder öffnen' })).toBeDisabled();
  await expect(werkzeuge(page).getByRole('button', { name: 'Abnehmen' })).toBeDisabled();

  // Ein ungültiges Datum vor dem letzten Eintrag wird am Feld gemeldet und nichts geschrieben.
  await werkzeuge(page).getByRole('button', { name: 'Beseitigung gemeldet' }).click();
  const frueh = page.getByRole('dialog', { name: 'Beseitigung gemeldet' });
  await frueh.getByLabel('Datum', { exact: true }).fill('01.11.2026');
  await frueh.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(frueh).toContainText('Das Datum liegt vor dem letzten Verlaufseintrag (20.11.2026).');
  await frueh.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(frueh).toBeHidden();
  await expect(zelle(page, 5, 'status')).toHaveText('angezeigt');

  // Rückgängig und Wiederholen: die Anzeige von Mangel 5 (Verlaufseintrag; die Frist ist gleich geblieben).
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(zelle(page, 5, 'status')).toHaveText('offen');
  await page.getByRole('button', { name: /^Wiederholen/ }).click();
  await expect(zelle(page, 5, 'status')).toHaveText('angezeigt');

  // --- Befund, Auswertung = Soll, Filter -------------------------------------------------------------------------
  await maengelPruefen(page);

  // Sprunglink: vom Befund zum Mangel 3 (die Auswahl steht sonst auf Mangel 5)
  await expect(page.getByTestId('auswahl')).toContainText('Mangel 5');
  await page.getByRole('button', { name: 'Zum Mangel 3' }).click();
  await expect(page.getByTestId('auswahl')).toContainText('Mangel 3 – Riss in der Bodenplatte');
  await expect(page.getByRole('list', { name: 'Verlauf Mangel 3' }).getByRole('listitem')).toHaveCount(2);

  // Filter nach Status und nach Auftragnehmer
  await waehle(page, page, 'Status', 'angezeigt');
  await expect(nummernZellen(maengelGrid(page))).toHaveText(['3', '5']);
  await waehle(page, page, 'Status', 'Alle');
  await waehle(page, page, 'Auftragnehmer', 'Bieter B');
  await expect(nummernZellen(maengelGrid(page))).toHaveText(['2', '4']);
  await waehle(page, page, 'Auftragnehmer', 'Alle');
  await expect(nummernZellen(maengelGrid(page))).toHaveCount(FX_MANGEL.length);

  // --- PDFs der Mängel ------------------------------------------------------------------------------------------
  await werkzeuge(page).getByRole('button', { name: 'Mängelliste als PDF' }).click();
  const liste = page.getByRole('dialog', { name: 'Mängelliste als PDF ausgeben' });
  await expect(liste.getByTestId('pdf-anzahl')).toContainText('5 Mängel');
  const listePdf = await pdfErzeugen(page, liste);
  expect(listePdf.name).toBe('Maengelliste Musterhaus.pdf');
  for (const m of FX_MANGEL) expect(listePdf.text).toContain(m.titel);
  expect(listePdf.text.match(/überfällig/g)).toHaveLength(1);

  await werkzeuge(page).getByRole('button', { name: 'Mängelanzeige als PDF' }).click();
  const anzeige = page.getByRole('dialog', { name: 'Mängelanzeige als PDF ausgeben' });
  await expect(anzeige.getByTestId('pdf-anzahl')).toHaveText('2 Mängel im Druck');
  const anzeigeA = await pdfErzeugen(page, anzeige);
  expect(anzeigeA.name).toBe('Maengelanzeige Bieter A Musterhaus.pdf');
  expect(anzeigeA.text).toContain('Bieter A');
  expect(anzeigeA.text).toContain('Riss in der Bodenplatte');
  expect(anzeigeA.text).toContain('Sperrbahn unter der ersten Steinlage fehlt');
  expect(anzeigeA.text).not.toContain('Kiesnest'); // abgenommen, keine Anzeige mehr

  await werkzeuge(page).getByRole('button', { name: 'Mängelanzeige als PDF' }).click();
  const anzeigeB = page.getByRole('dialog', { name: 'Mängelanzeige als PDF ausgeben' });
  await waehle(page, anzeigeB, 'Auftragnehmer', 'Bieter B');
  await expect(anzeigeB.getByTestId('pdf-anzahl')).toHaveText('1 Mangel im Druck');
  const pdfB = await pdfErzeugen(page, anzeigeB);
  // Mangel 2 ist wieder offen; im Druck steht die Frist seiner Anzeige (D-66), nicht die neue am Mangel
  expect(pdfB.text).toContain('Grundleitung mit Gegengefälle');
  expect(pdfB.text).toContain(datumDeFx(ERSTE_FRIST_MANGEL_2));

  // --- Bautagebuch ------------------------------------------------------------------------------------------------
  await page.getByRole('link', { name: 'Zum Bautagebuch' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Bautagebuch – Musterhaus' })).toBeVisible();
  await expect(page.getByText('Noch kein Eintrag im Bautagebuch.')).toBeVisible();

  // Die Firmen werden aus den Auftragnehmern der Auftrags-LVs vorgeschlagen.
  await page
    .getByRole('toolbar', { name: 'Werkzeuge des Bautagebuchs' })
    .getByRole('button', { name: 'Neuer Eintrag' })
    .click();
  const vorschlag = page.getByRole('dialog', { name: 'Neuer Bautagebucheintrag' });
  await expect(vorschlag.getByLabel('Datum', { exact: true })).toHaveValue(datumDeFx(f.stichtag));
  await vorschlag.getByRole('button', { name: 'Vorschläge aus den Auftragnehmern: Bieter A' }).click();
  await expect(vorschlag.getByLabel('Firma 1', { exact: true })).toHaveValue('Bieter A');
  await vorschlag.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(vorschlag).toBeHidden();

  for (const e of f.bautagebuch) {
    await page.getByRole('button', { name: 'Neuer Eintrag' }).click();
    const d = page.getByRole('dialog', { name: 'Neuer Bautagebucheintrag' });
    await d.getByLabel('Datum', { exact: true }).fill(datumDeFx(e.datum));
    if (e.wetter.beschreibung !== null)
      await d.getByLabel('Wetter', { exact: true }).fill(e.wetter.beschreibung);
    if (e.wetter.temperaturMin !== null)
      await d.getByLabel('Tiefste Temperatur (°C)').fill(String(e.wetter.temperaturMin));
    if (e.wetter.temperaturMax !== null)
      await d.getByLabel('Höchste Temperatur (°C)').fill(String(e.wetter.temperaturMax));
    for (const [i, a] of e.arbeitskraefte.entries()) {
      await d.getByRole('button', { name: 'Firma hinzufügen' }).click();
      await d.getByLabel(`Firma ${String(i + 1)}`, { exact: true }).fill(a.firma);
      await d.getByLabel(`Köpfe Firma ${String(i + 1)}`, { exact: true }).fill(String(a.anzahl));
    }
    if (e.geraete !== null) await d.getByLabel('Geräte', { exact: true }).fill(e.geraete);
    if (e.leistungen !== null) await d.getByLabel('Leistungen', { exact: true }).fill(e.leistungen);
    if (e.behinderungen !== null) await d.getByLabel('Behinderungen', { exact: true }).fill(e.behinderungen);
    if (e.vorkommnisse !== null) await d.getByLabel('Vorkommnisse', { exact: true }).fill(e.vorkommnisse);
    await d.getByRole('button', { name: 'Speichern' }).click();
    await expect(d).toBeHidden();
    await expect(page.getByTestId('auswahl')).toHaveText(`Ausgewählt: ${datumDeFx(e.datum)}`);
  }
  const tageGrid = page.getByRole('treegrid', { name: 'Tage des Bautagebuchs' });
  await expect(tageGrid.locator('[role="row"] [data-spalte="datum"] .tx-grid__text')).toHaveText(
    f.bautagebuch.map((e) => datumDeFx(e.datum)),
  );

  // Ein zweiter Eintrag am selben Datum wird abgewiesen, mit Hinweis; nichts wird geschrieben.
  const ersterTag = f.bautagebuch[0];
  if (ersterTag === undefined) throw new Error('Fixture');
  await page.getByRole('button', { name: 'Neuer Eintrag' }).click();
  const doppelt = page.getByRole('dialog', { name: 'Neuer Bautagebucheintrag' });
  await doppelt.getByLabel('Datum', { exact: true }).fill(datumDeFx(ersterTag.datum));
  await doppelt.getByRole('button', { name: 'Speichern' }).click();
  await expect(doppelt).toContainText(
    `Für den ${datumDeFx(ersterTag.datum)} gibt es schon einen Eintrag. Pro Tag ist nur ein Eintrag möglich`,
  );
  await doppelt.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(doppelt).toBeHidden();
  await expect(tageGrid.locator('[role="row"] [data-spalte="datum"] .tx-grid__text')).toHaveCount(
    f.bautagebuch.length,
  );

  // Löschen mit Bestätigung, Rückgängig holt den Eintrag zurück (Q5).
  await page.getByRole('button', { name: 'Löschen' }).click();
  const weg = page.getByRole('dialog', { name: 'Eintrag löschen' });
  await weg.getByRole('button', { name: 'Endgültig löschen' }).click();
  await expect(tageGrid.locator('[role="row"] [data-spalte="datum"] .tx-grid__text')).toHaveCount(
    f.bautagebuch.length - 1,
  );
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(tageGrid.locator('[role="row"] [data-spalte="datum"] .tx-grid__text')).toHaveCount(
    f.bautagebuch.length,
  );

  // Auswertung eines Zeitraums
  const sb = f.sollwerte.auswertungBautagebuch;
  const zeitraum = async (von: string, bis: string): Promise<void> => {
    await page.getByLabel('Von', { exact: true }).fill(datumDeFx(von));
    await page.getByLabel('Bis', { exact: true }).fill(datumDeFx(bis));
  };
  await zeitraum(sb.von, sb.bis);
  for (const t of sb.jeTag)
    await expect(page.getByTestId(`tag-${t.datum}`)).toContainText(
      `${datumDeFx(t.datum)} – ${String(t.arbeitskraefte)} Köpfe`,
    );
  await expect(page.locator('[data-testid^="tag-"]')).toHaveCount(sb.jeTag.length); // Tage ohne Eintrag fehlen
  for (const fi of sb.jeFirma)
    await expect(page.getByTestId(`firma-${fi.firma}`).locator('td')).toHaveText(String(fi.arbeitskraefte));
  await expect(page.getByTestId('summe').locator('td')).toHaveText(String(sb.summe));
  const gp = f.gegenproben.bautagebuch17bis19;
  await zeitraum(gp.von, gp.bis);
  for (const fi of gp.jeFirma)
    await expect(page.getByTestId(`firma-${fi.firma}`).locator('td')).toHaveText(String(fi.arbeitskraefte));
  await expect(page.getByTestId('summe').locator('td')).toHaveText(String(gp.summe));
  await zeitraum(sb.von, sb.bis);

  // PDF für den Zeitraum
  await page.getByRole('button', { name: 'Bautagebuch als PDF' }).click();
  const tagebuchDialog = page.getByRole('dialog', { name: 'Bautagebuch als PDF ausgeben' });
  await expect(tagebuchDialog.getByTestId('pdf-anzahl')).toContainText('3 Einträge im Zeitraum');
  const tagebuch = await pdfErzeugen(page, tagebuchDialog);
  expect(tagebuch.name).toBe(`Bautagebuch Musterhaus ${sb.von} ${sb.bis}.pdf`);
  for (const e of f.bautagebuch) expect(tagebuch.text).toContain(datumDeFx(e.datum));
  for (const fi of sb.jeFirma) expect(tagebuch.text).toContain(fi.firma);

  // --- Neuladen: alles ist gespeichert ----------------------------------------------------------------------------
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Bautagebuch – Musterhaus' })).toBeVisible();
  await expect(tageGrid.locator('[role="row"] [data-spalte="datum"] .tx-grid__text')).toHaveText(
    f.bautagebuch.map((e) => datumDeFx(e.datum)),
  );
  await zeitraum(sb.von, sb.bis);
  await expect(page.getByTestId('summe').locator('td')).toHaveText(String(sb.summe));
  await page.getByRole('link', { name: 'Zu den Mängeln' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mängel – Musterhaus' })).toBeVisible();
  await expect(nummernZellen(maengelGrid(page))).toHaveCount(FX_MANGEL.length);
  await maengelPruefen(page);
});
