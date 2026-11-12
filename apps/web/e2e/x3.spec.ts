// SPDX-License-Identifier: AGPL-3.0-or-later
// Tor X3 (Ticket 119, D-58): der Fall aus `fixtures/honorar.json` (Ticket 112) über die Oberfläche. Kostenberechnung mit den
// Einträgen der Fixture (KG 300 und KG 400 stehen darin) → Honorarberechnung mit einem Objekt (Honorarsatz „Mittelsatz“ 50 %,
// anrechenbare Kosten aus der Kostenberechnung nach § 33, weitere Kosten und Bausubstanz von Hand, Umbauzuschlag 25 %,
// Nebenkosten 4,50 %, MwSt 19 %) → alle Sollwerte der Tabelle → ein Undo-Schritt je Änderung → Neuladen → PDF.
// Bedienung nur über Schaltflächen, Felder und Tastatur (U3, U8).
//
// Alle erwarteten Zahlen stehen in der Fixture (von Hand hergeleitet), nie aus einem Lauf der App. Der Kettentest ohne
// Oberfläche auf denselben Sollwerten steht in `src/x3-kette.test.ts`.

import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { alsText, liesPdf } from '../../../packages/ausgabe/src/pdftext';
import { betragDe, projektAnlegen } from './hilfen';

interface Fx {
  readonly kostenermittlung: {
    readonly name: string;
    readonly eintraege: readonly {
      readonly nummer: string;
      readonly betrag: string;
      readonly bemerkung?: string;
    }[];
  };
  readonly honorarberechnung: {
    readonly name: string;
    readonly objekte: readonly {
      readonly bezeichnung: string;
      readonly anrechenbareKosten: {
        readonly weitereKosten: string;
        readonly mitzuverarbeitendeBausubstanz: string;
      };
      readonly umbauzuschlagssatz: string;
      readonly honorarsatz: string;
    }[];
    readonly nebenkosten: { readonly art: 'prozent'; readonly satz: string };
    readonly mwstSatz: string;
  };
  readonly sollwerte: {
    readonly objekte: readonly {
      readonly honorar: string;
      readonly grundhonorar: string;
      readonly umbauzuschlag: string;
      readonly herleitung: Readonly<Record<string, string>>;
      readonly tafel: {
        readonly zeileUnten: {
          readonly anrechenbareKosten: string;
          readonly spannen: Readonly<Record<string, { von: string; bis: string }>>;
        };
        readonly zeileOben: {
          readonly anrechenbareKosten: string;
          readonly spannen: Readonly<Record<string, { von: string; bis: string }>>;
        };
        readonly spanne: { readonly von: string; readonly bis: string };
      };
      readonly phasen: readonly {
        readonly nummer: number;
        readonly name: string;
        readonly anteil: string;
        readonly betrag: string;
      }[];
    }[];
    readonly grundhonorar: string;
    readonly umbauzuschlaege: string;
    readonly nebenkosten: string;
    readonly netto: string;
    readonly mwst: string;
    readonly brutto: string;
  };
}
const fx = JSON.parse(readFileSync(new URL('../../../fixtures/honorar.json', import.meta.url), 'utf8')) as Fx;
const eingabe = fx.honorarberechnung.objekte[0];
const soll = fx.sollwerte.objekte[0];
if (eingabe === undefined || soll === undefined) throw new Error('Fixture ohne Objekt');

const euro = (b: string): string => `${betragDe(b)} €`;
const prozentDe = (p: string): string => p.replace('.', ',');

const rueckTiefe = (page: Page): Promise<number | undefined> =>
  page.evaluate(() => window.tethysTest?.historie().rueck);

/** Der Wert (letzte Zelle) der Zeile mit der Zeilenüberschrift `name` in der Tabelle `tabelle`. */
const zelle = (tabelle: Locator, name: string): Locator =>
  tabelle.getByRole('rowheader', { name, exact: true }).locator('xpath=following-sibling::td[last()]');

const tabelle = (page: Page, name: string): Locator => page.getByRole('table', { name, exact: true });

/** Ein Textfeld füllen und verlassen: das Verlassen übernimmt den Wert als einen Befehl. */
async function feld(region: Locator, label: string, wert: string): Promise<void> {
  const f = region.getByRole('textbox', { name: label, exact: true });
  await f.fill(wert);
  await f.blur();
}

async function waehle(page: Page, region: Locator, label: string, option: string | RegExp): Promise<void> {
  await region.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option }).click();
}

test('X3: Honorarberechnung aus der Kostenberechnung mit allen Sollwerten, Undo, Neuladen und PDF', async ({
  page,
}) => {
  await projektAnlegen(page, 'Bürogebäude', 'Bauherr');

  // --- Kostenberechnung mit den Einträgen der Fixture ---------------------------------------------------------------------
  await page.getByRole('link', { name: 'Kosten', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill(fx.kostenermittlung.name);
  await page.getByRole('button', { name: 'Anlegen', exact: true }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: `Kostenermittlung – ${fx.kostenermittlung.name}` }),
  ).toBeVisible();
  for (const e of fx.kostenermittlung.eintraege) {
    await page.getByLabel('Kostengruppe (dreistellig)').fill(e.nummer);
    await page.getByLabel('Betrag (netto, €)').fill(betragDe(e.betrag));
    await page.getByLabel('Bemerkung', { exact: true }).fill(e.bemerkung ?? '');
    await page.getByRole('button', { name: 'Eintrag setzen', exact: true }).last().click();
    await expect(page.getByLabel('Kostengruppe (dreistellig)')).toHaveValue('');
  }

  // --- Honorarberechnung anlegen ------------------------------------------------------------------------------------------
  await page.getByRole('link', { name: 'Zur Liste' }).click();
  await page.getByRole('link', { name: 'Zum Projekt' }).click();
  await page.getByRole('link', { name: 'Honorar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Honorar – Bürogebäude' })).toBeVisible();
  await expect(page.getByText('Noch keine Honorarberechnung.')).toBeVisible();
  await page.getByLabel('Name', { exact: true }).fill(fx.honorarberechnung.name);
  await page.getByRole('button', { name: 'Anlegen', exact: true }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: `Honorarberechnung – ${fx.honorarberechnung.name}` }),
  ).toBeVisible();
  const berechnungsPfad = new URL(page.url()).pathname;
  await expect(page.getByText('Noch kein Objekt.')).toBeVisible();

  // Ohne Objekte: alles 0,00, ein Hinweis zu DIN 276 steht trotzdem da (fester Text, kein Befund).
  await expect(zelle(tabelle(page, 'Summen'), 'Brutto')).toHaveText('0,00 €');
  await expect(page.getByTestId('din276-hinweis')).toContainText('DIN 276:2008-12');
  await expect(page.getByText('Keine Befunde.')).toBeVisible();

  // --- Das Objekt ---------------------------------------------------------------------------------------------------------
  await page.getByRole('button', { name: 'Objekt hinzufügen' }).click();
  const objekt = page.locator('section.honorar__objekt').first();
  await expect(objekt).toBeVisible();
  // Standard nach § 7 Abs. 1: Honorarsatz 0 (Basishonorarsatz).
  await expect(objekt.getByRole('textbox', { name: 'Honorarsatz (%)', exact: true })).toHaveValue('0,00');
  await expect(objekt.getByRole('combobox', { name: 'Honorarsatz (Vorgabe)' })).toContainText(
    'Basishonorarsatz',
  );

  await feld(objekt, 'Bezeichnung', eingabe.bezeichnung);
  // Honorarzone III und Leistungsbild Gebäude sind die Vorgaben; der Mittelsatz ist eine benannte Vorgabe der App.
  await waehle(page, objekt, 'Honorarsatz (Vorgabe)', /^Mittelsatz/);
  await expect(objekt.getByRole('textbox', { name: 'Honorarsatz (%)', exact: true })).toHaveValue(
    prozentDe(eingabe.honorarsatz),
  );
  await waehle(page, objekt, 'Anrechenbare Kosten aus', /Kostenermittlung des Projekts/);
  await expect(objekt.getByRole('combobox', { name: 'Kostenermittlung', exact: true })).toContainText(
    fx.kostenermittlung.name,
  );
  await feld(
    objekt,
    'Weitere anrechenbare Kosten (§ 33 Abs. 3, €)',
    betragDe(eingabe.anrechenbareKosten.weitereKosten),
  );
  await feld(
    objekt,
    'Mitzuverarbeitende Bausubstanz (§ 4 Abs. 3, €)',
    betragDe(eingabe.anrechenbareKosten.mitzuverarbeitendeBausubstanz),
  );
  await expect(
    objekt.getByRole('checkbox', { name: 'Technische Anlagen nicht selbst geplant (§ 33 Abs. 2)' }),
  ).toBeChecked();
  // Umbau: Vorschlag 20 %, hier 25 %.
  await objekt.getByRole('checkbox', { name: /^Umbau/ }).check();
  await expect(objekt.getByRole('textbox', { name: 'Umbauzuschlag (% des Grundhonorars)' })).toHaveValue(
    '20,00',
  );
  await feld(objekt, 'Umbauzuschlag (% des Grundhonorars)', prozentDe(eingabe.umbauzuschlagssatz));
  // Alle neun Leistungsphasen sind beauftragt (Vorgabe).
  for (let n = 1; n <= 9; n++)
    await expect(
      objekt.getByRole('checkbox', { name: `Leistungsphase ${String(n)} beauftragt` }),
    ).toBeChecked();

  // Nebenkosten und MwSt der Berechnung.
  const kopf = page.getByRole('group', { name: 'Name, Nebenkosten und MwSt' });
  await waehle(page, kopf, 'Nebenkosten', 'Prozent');
  await feld(kopf, 'Nebenkosten (% oder €)', prozentDe(fx.honorarberechnung.nebenkosten.satz));
  await expect(kopf.getByRole('textbox', { name: 'MwSt-Satz (%)' })).toHaveValue(
    prozentDe(fx.honorarberechnung.mwstSatz),
  );

  // --- Alle Sollwerte der Tabelle -----------------------------------------------------------------------------------------
  const h = soll.herleitung;
  const herleitung = tabelle(page, 'Herleitung der anrechenbaren Kosten (§ 33) 1');
  await expect(zelle(herleitung, 'Anrechenbare Kosten')).toHaveText(euro(h['anrechenbareKosten'] ?? ''));
  const erwarteteHerleitung: readonly (readonly [string, string])[] = [
    ['KG 300', 'kg300'],
    ['Weitere Kosten (§ 33 Abs. 3)', 'weitereKosten'],
    ['Sonstige anrechenbare Kosten', 'sonstigeAnrechenbareKosten'],
    ['KG 400', 'kg400'],
    ['Grenze 25 % (§ 33 Abs. 2 Nr. 1)', 'grenzeTechnischeAnlagen'],
    ['KG 400 voll angerechnet', 'kg400Voll'],
    ['KG 400 zur Hälfte angerechnet', 'kg400Haelfte'],
    ['Mitzuverarbeitende Bausubstanz', 'mitzuverarbeitendeBausubstanz'],
  ];
  for (const [name, schluessel] of erwarteteHerleitung)
    await expect(zelle(herleitung, name)).toHaveText(euro(h[schluessel] ?? ''));

  const t = soll.tafel;
  const zone = 'III';
  const spanne = (s: { von: string; bis: string } | undefined): string =>
    `von ${euro(s?.von ?? '')} bis ${euro(s?.bis ?? '')}`;
  const tafel = tabelle(page, 'Honorartafel (§ 13, lineare Interpolation) 1');
  await expect(zelle(tafel, `Tafelzeile unten (${betragDe(t.zeileUnten.anrechenbareKosten)} €)`)).toHaveText(
    spanne(t.zeileUnten.spannen[zone]),
  );
  await expect(zelle(tafel, `Tafelzeile oben (${betragDe(t.zeileOben.anrechenbareKosten)} €)`)).toHaveText(
    spanne(t.zeileOben.spannen[zone]),
  );
  await expect(zelle(tafel, 'Interpolierte Spanne')).toHaveText(spanne(t.spanne));
  await expect(zelle(tafel, 'Honorar im Honorarsatz')).toHaveText(euro(soll.honorar));

  const phasen = tabelle(page, 'Leistungsphasen 1');
  for (const p of soll.phasen) {
    const zeile = phasen.getByRole('row', { name: new RegExp(`^LPH ${String(p.nummer)} `) });
    await expect(zeile.locator('td').nth(0)).toHaveText(`${prozentDe(p.anteil)} %`);
    await expect(zeile.locator('td').nth(1)).toHaveText(euro(p.betrag));
  }
  await expect(zelle(phasen, 'Grundhonorar')).toHaveText(euro(soll.grundhonorar));
  await expect(zelle(phasen, 'Umbauzuschlag')).toHaveText(euro(soll.umbauzuschlag));

  const s = fx.sollwerte;
  const summen = tabelle(page, 'Summen');
  await expect(zelle(summen, 'Grundhonorar')).toHaveText(euro(s.grundhonorar));
  await expect(zelle(summen, 'Umbauzuschläge')).toHaveText(euro(s.umbauzuschlaege));
  await expect(zelle(summen, 'Nebenkosten')).toHaveText(euro(s.nebenkosten));
  await expect(zelle(summen, 'Netto')).toHaveText(euro(s.netto));
  await expect(zelle(summen, 'MwSt')).toHaveText(euro(s.mwst));
  await expect(zelle(summen, 'Brutto')).toHaveText(euro(s.brutto));
  await expect(zelle(summen, 'Brutto')).toHaveText('267.595,90 €');
  // Keine Befunde (Kostenberechnung als Grundlage); der Hinweis zu DIN 276 ist ein fester Text und kein Befund.
  await expect(page.getByText('Keine Befunde.')).toBeVisible();
  await expect(page.getByTestId('din276-hinweis')).toContainText('DIN 276:2008-12');

  // --- Ein Undo-Schritt je Änderung ---------------------------------------------------------------------------------------
  const tiefe = (await rueckTiefe(page)) ?? 0;
  await waehle(page, objekt, 'Honorarsatz (Vorgabe)', /^Oberer Honorarsatz/);
  await expect(zelle(summen, 'Brutto')).not.toHaveText('267.595,90 €');
  await expect.poll(() => rueckTiefe(page)).toBe(tiefe + 1);
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(zelle(summen, 'Brutto')).toHaveText('267.595,90 €');
  await expect(objekt.getByRole('textbox', { name: 'Honorarsatz (%)', exact: true })).toHaveValue('50,00');
  await page.getByRole('button', { name: /^Wiederholen/ }).click();
  await expect(zelle(summen, 'Brutto')).not.toHaveText('267.595,90 €');
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(zelle(summen, 'Brutto')).toHaveText('267.595,90 €');

  // Ein Formfehler bleibt am Feld und kommt nie in einen Befehl (U5); der Stand bleibt.
  const rueckVorFehler = await rueckTiefe(page);
  await objekt.getByRole('textbox', { name: 'Honorarsatz (%)', exact: true }).fill('abc');
  await objekt.getByRole('textbox', { name: 'Honorarsatz (%)', exact: true }).blur();
  await expect(objekt.getByText(/Prozent|Zahl|gültig/i).first()).toBeVisible();
  expect(await rueckTiefe(page)).toBe(rueckVorFehler);
  await expect(zelle(summen, 'Brutto')).toHaveText('267.595,90 €');
  await objekt.getByRole('textbox', { name: 'Honorarsatz (%)', exact: true }).fill('50');
  await objekt.getByRole('textbox', { name: 'Honorarsatz (%)', exact: true }).blur();
  await expect(zelle(summen, 'Brutto')).toHaveText('267.595,90 €');

  // Honorarsatz außerhalb 0 bis 100 ist ein Befund, keine Sperre (U5); danach zurück auf 50.
  await feld(objekt, 'Honorarsatz (%)', '120');
  await expect(page.getByRole('list', { name: 'Befunde und Hinweise' })).toContainText('Warnung');
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(zelle(summen, 'Brutto')).toHaveText('267.595,90 €');
  await expect(page.getByText('Keine Befunde.')).toBeVisible();

  // --- Neuladen: alles bleibt ---------------------------------------------------------------------------------------------
  await page.reload();
  await expect(
    page.getByRole('heading', { level: 1, name: `Honorarberechnung – ${fx.honorarberechnung.name}` }),
  ).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(berechnungsPfad);
  await expect(zelle(tabelle(page, 'Summen'), 'Brutto')).toHaveText(euro(s.brutto));
  await expect(zelle(tabelle(page, 'Summen'), 'Netto')).toHaveText(euro(s.netto));
  await expect(
    zelle(tabelle(page, 'Herleitung der anrechenbaren Kosten (§ 33) 1'), 'Anrechenbare Kosten'),
  ).toHaveText(euro(h['anrechenbareKosten'] ?? ''));
  await expect(page.getByText('Keine Befunde.')).toBeVisible();

  // --- Umbenennen, dann PDF ------------------------------------------------------------------------------------------------
  // Der Name ist ASCII, weil Chromium im Headless-Test Umlaute im Dateinamen eines Blob-Downloads durch „download“ ersetzt;
  // die Bereinigung des Namens prüft `dateiname.test.ts`.
  const neuerName = 'Honorar Objektplanung Umbau';
  await feld(page.getByRole('group', { name: 'Name, Nebenkosten und MwSt' }), 'Name', neuerName);
  await expect(
    page.getByRole('heading', { level: 1, name: `Honorarberechnung – ${neuerName}`, exact: true }),
  ).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Als PDF' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe(`${neuerName}.pdf`);
  const bytes = readFileSync(await download.path());
  expect(bytes.subarray(0, 4).toString('latin1')).toBe('%PDF');
  const text = alsText(await liesPdf(new Uint8Array(bytes))).replace(/\s+/g, ' ');
  for (const wert of [
    s.brutto,
    s.netto,
    s.mwst,
    s.nebenkosten,
    soll.honorar,
    soll.grundhonorar,
    soll.umbauzuschlag,
  ])
    expect(text).toContain(betragDe(wert));
  expect(text).toContain(betragDe(h['anrechenbareKosten'] ?? ''));
  expect(text).toContain('DIN 276:2008-12');

  // --- Löschen mit Bestätigung, Rückgängig holt die Berechnung zurück ---------------------------------------------------
  await page.getByRole('button', { name: 'Honorarberechnung löschen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Honorarberechnung löschen' });
  await dialog.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { level: 1, name: /^Honorarberechnung –/ })).toBeVisible();
  await page.getByRole('button', { name: 'Honorarberechnung löschen' }).click();
  await page
    .getByRole('dialog', { name: 'Honorarberechnung löschen' })
    .getByRole('button', { name: 'Löschen' })
    .click();
  await expect(page.getByText('Noch keine Honorarberechnung.')).toBeVisible();
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: `Honorarberechnung – ${neuerName}`, exact: true }),
  ).toBeVisible();
  await expect(zelle(tabelle(page, 'Summen'), 'Brutto')).toHaveText('267.595,90 €');

  // Eine Kostenermittlung, auf die die Honorarberechnung verweist, lässt sich nicht löschen (Q5).
  await page.goto(berechnungsPfad.replace(/\/honorar\/.*$/, '/kosten'));
  await page.getByRole('link', { name: fx.kostenermittlung.name }).click();
  await page.getByRole('button', { name: 'Kostenermittlung löschen' }).click();
  await page
    .getByRole('dialog', { name: 'Kostenermittlung löschen' })
    .getByRole('button', { name: 'Löschen' })
    .click();
  await expect(page.getByText('Der gespeicherte Stand weicht ab. Bitte die Seite neu laden.')).toBeVisible();
});
