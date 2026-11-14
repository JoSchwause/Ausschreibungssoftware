// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 115 (X1c–e, Tore X1-Kern und X1-Erweitert, D-58): LV `typisch` (Testpfad, Kennungen der Fixture) und
// `fixtures/ifc/haus-v1.ifc` → die gemauerten Innenwände des EG im Baum wählen (Klick, Strg+Klick) → 03.0010 zuordnen
// (NetSideArea, D-99.2) → 3D färbt „zugeordnet“ → auf der LV-Seite „Mengen aus Modell …“ → Vordersatz und LV-Summen = Soll →
// Rückgängig/Wiederholen → Kennwerte BGF/BRI/NRF = Soll → Kostenschätzung über sechs Kennwerte = Soll → Kostenkennwerte →
// Zuschlag (X84 Bieter A) → Aufmaßblatt aus Auswahl „EG“ = Sollmenge.
//
// Alle erwarteten Zahlen stehen in `fixtures/typisch-bim.json` und `typisch.json` (Ticket 99, Herleitung dort), nie aus einem
// Lauf der App. Die 3D-Ansicht prüft der Prüfzugang `window.tethysModell` (Test-Build), nie Pixel (D-58).

import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { fixtureInhalt } from './fixture-inhalt';
import { betragDe, projektAnlegen, summen } from './hilfen';
import { werkzeug } from './werkzeuge';

const executablePath = process.env['PW_CHROMIUM_PATH'] || undefined;
test.use({
  launchOptions: {
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    ...(executablePath ? { executablePath } : {}),
  },
});

const wurzel = new URL('../../../', import.meta.url);
const HAUS = readFileSync(new URL('fixtures/ifc/haus-v1.ifc', wurzel));
type Summen = Readonly<Record<'netto' | 'nachlass' | 'nettoNachNachlass' | 'mwst' | 'brutto', string>>;
const FX = JSON.parse(readFileSync(new URL('fixtures/typisch-bim.json', wurzel), 'utf8')) as {
  bauteile: { v1: { globalId: string; kennung: string; name: string }[] };
  zuordnungen: {
    positionId: string;
    oz: string;
    kurztext: string;
    bauteile: { globalId: string; mengenart: string }[];
  }[];
  kern: {
    torweg: { positionIds: string[]; sollwerte: { summen: Summen } };
    vordersaetze: { positionId: string; mengenansatz: { ausdruck: string }[]; menge: string }[];
  };
  erweitert: {
    din277: { summen: { bgf: string; bri: string; nrf: string } };
    kostenschaetzung: {
      kennwerte: { nummer: string; kennwert: string }[];
      eintraege: { nummer: string; betrag: string }[];
      gesamt: string;
    };
    aufmassAusAuswahl: { auswahl: { name: string }; positionen: { positionId: string; menge: string }[] };
  };
};
const TYPISCH = JSON.parse(readFileSync(new URL('fixtures/typisch.json', wurzel), 'utf8')) as {
  sollwerte: { summen: Summen };
};

const POS = FX.kern.torweg.positionIds[0] ?? '';
const ZUORDNUNG = FX.zuordnungen.find((z) => z.positionId === POS);
const VORDERSATZ = FX.kern.vordersaetze.find((v) => v.positionId === POS);
const OZ = ZUORDNUNG?.oz ?? '';
const WAENDE = (ZUORDNUNG?.bauteile ?? []).map((b) => b.globalId);
const NAME = new Map(FX.bauteile.v1.map((b) => [b.globalId, b.name]));
const AUFMASS = FX.erweitert.aufmassAusAuswahl.positionen.find((p) => p.positionId === POS);
const mengeDe = (m: string): string => m.replace('.', ',');

const summenDe = (s: Summen): Record<string, string> => ({
  Netto: betragDe(s.netto),
  Nachlass: betragDe(s.nachlass),
  'Netto nach Nachlass': betragDe(s.nettoNachNachlass),
  MwSt: betragDe(s.mwst),
  Brutto: betragDe(s.brutto),
});

const baum = (page: Page): Locator => page.getByRole('treegrid', { name: 'Modellbaum' });
const baumzelle = (page: Page, text: string): Locator =>
  baum(page).getByRole('gridcell', {
    name: new RegExp(`^((Auf|Zu)klappen )?${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
  });

/** Die Zelle `spalte` der Zeile eines Grids, deren Zelle `schluessel` genau `text` zeigt. */
function zelle(grid: Locator, schluessel: string, text: string, spalte: string): Locator {
  return grid
    .locator('[role="row"]')
    .filter({
      has: grid.page().locator(`[data-spalte="${schluessel}"] .tx-grid__text`, {
        hasText: new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
      }),
    })
    .locator(`[data-spalte="${spalte}"] .tx-grid__text`);
}

async function waehle(
  page: Page,
  bereich: Locator | Page,
  label: string,
  option: string | RegExp,
): Promise<void> {
  await bereich.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option }).click();
}

const faerbung = (page: Page) => page.evaluate(() => window.tethysModell?.faerbung() ?? {});
const zugeordnet = async (page: Page): Promise<string[]> =>
  Object.entries(await faerbung(page))
    .filter(([, f]) => f === 'zugeordnet')
    .map(([g]) => g)
    .sort();

test('X1: zuordnen, Mengen übernehmen, Undo/Redo, Kennwerte, Kostenschätzung, Aufmaßblatt aus Auswahl', async ({
  page,
}) => {
  test.setTimeout(240_000);
  expect(WAENDE).toHaveLength(3);

  // --- Projekt, LV `typisch` (Testpfad), Modell einlesen ---------------------------------------------------------
  await projektAnlegen(page, 'Musterhaus BIM', 'Bauherr BIM');
  const projektId = decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1) ?? '');
  const inhalt = fixtureInhalt('typisch');
  const lv = await page.evaluate(([id, i]) => window.tethysTest?.lvAnlegen(id as never, i as never), [
    projektId,
    inhalt,
  ] as const);
  expect(lv?.ok).toBe(true);
  await page.goto(`/projekt/${projektId}/modelle`);
  await page.getByLabel('IFC-Datei wählen').setInputFiles({
    name: 'haus-v1.ifc',
    mimeType: 'application/octet-stream',
    buffer: HAUS,
  });
  const eingelesen = page.getByRole('dialog', { name: 'Modell eingelesen' });
  await expect(eingelesen.getByText('Keine Befunde.')).toBeVisible({ timeout: 30_000 });
  await eingelesen.getByRole('button', { name: 'Modell öffnen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'haus-v1' })).toBeVisible();
  const modellPfad = new URL(page.url()).pathname;
  await page.waitForFunction(() => window.tethysModell?.darstellung()?.geladen === true, undefined, {
    timeout: 45_000,
  });

  // --- Zuordnen (X1c) ---------------------------------------------------------------------------------------------
  const zuordnung = page.getByRole('region', { name: 'Zuordnung zu Positionen' });
  await expect(zuordnung.getByRole('combobox', { name: 'LV für Zuordnung' })).toHaveText(
    `LV: ${inhalt.name}`,
  );
  await expect(zuordnung.getByText('0 Bauteile zugeordnet, 30 ohne Zuordnung')).toBeVisible();
  expect(Object.keys(await faerbung(page))).toHaveLength(30);
  expect(await zugeordnet(page)).toEqual([]);

  const [erste, ...weitere] = WAENDE;
  await baumzelle(page, NAME.get(erste ?? '') ?? '').click();
  for (const g of weitere) await baumzelle(page, NAME.get(g) ?? '').click({ modifiers: ['ControlOrMeta'] });
  await expect
    .poll(() => page.evaluate(() => [...(window.tethysModell?.auswahl() ?? [])].sort()))
    .toEqual([...WAENDE].sort());

  await zuordnung.getByRole('button', { name: 'Zuordnen …' }).click();
  const dialog = page.getByRole('dialog', { name: '3 Bauteile zuordnen' });
  await dialog.getByLabel('Position suchen (OZ oder Kurztext)').fill(OZ);
  await dialog.getByRole('radio', { name: `${OZ} ${ZUORDNUNG?.kurztext ?? ''} (m²)` }).check();
  await waehle(page, dialog, 'Mengenart', 'NetSideArea (m², 3 von 3)');
  await expect(dialog.getByRole('region', { name: 'Befunde nach dem Zuordnen' })).toContainText(
    'Keine Befunde',
  );
  await dialog.getByRole('button', { name: 'Zuordnen', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(zuordnung.getByText('3 Bauteile zugeordnet, 27 ohne Zuordnung')).toBeVisible();
  await expect.poll(() => zugeordnet(page)).toEqual([...WAENDE].sort());
  await expect(zuordnung.getByRole('list', { name: 'Zuordnungen' })).toContainText(
    `${OZ} ${ZUORDNUNG?.kurztext ?? ''}`,
  );

  // --- Mengen übernehmen (X1d) im Ausschreibungs-LV ------------------------------------------------------------------
  await page.goto(`/lv/${inhalt.wurzelId}`);
  const grid = page.getByRole('treegrid', { name: /Positionen/ }).first();
  await expect(zelle(grid, 'ordnungszahl', OZ, 'menge')).toHaveText('212,400');
  await expect.poll(() => summen(page)).toMatchObject(summenDe(TYPISCH.sollwerte.summen));
  await werkzeug(page, 'Bearbeiten', 'Mengen aus Modell …');
  const mengen = page.getByRole('dialog', { name: 'Mengen aus dem Modell übernehmen' });
  const vorschau = mengen.getByRole('table', { name: 'Vorschau der Mengenübernahme' });
  const zeile = vorschau.getByRole('row').filter({ hasText: OZ });
  await expect(zeile.locator('[data-wert="vorher"]')).toHaveText('212,400 m²');
  await expect(zeile.locator('[data-wert="nachher"]')).toHaveText(`${mengeDe(VORDERSATZ?.menge ?? '')} m²`);
  await expect(zeile).toContainText((VORDERSATZ?.mengenansatz ?? []).map((z) => z.ausdruck).join(' + '));
  await mengen.getByRole('button', { name: '1 Position übernehmen' }).click();
  await expect(mengen).toHaveCount(0);
  await expect(zelle(grid, 'ordnungszahl', OZ, 'menge')).toHaveText(mengeDe(VORDERSATZ?.menge ?? ''));
  await expect.poll(() => summen(page)).toMatchObject(summenDe(FX.kern.torweg.sollwerte.summen));

  // Ein Undo-Schritt nimmt die Übernahme ganz zurück; Wiederholen bringt sie wieder.
  await page.getByRole('button', { name: /Rückgängig/ }).click();
  await expect(zelle(grid, 'ordnungszahl', OZ, 'menge')).toHaveText('212,400');
  await expect.poll(() => summen(page)).toMatchObject(summenDe(TYPISCH.sollwerte.summen));
  await page.getByRole('button', { name: /Wiederholen/ }).click();
  await expect(zelle(grid, 'ordnungszahl', OZ, 'menge')).toHaveText(mengeDe(VORDERSATZ?.menge ?? ''));
  await expect.poll(() => summen(page)).toMatchObject(summenDe(FX.kern.torweg.sollwerte.summen));

  // --- Kennwerte und Kostenschätzung (X1e) --------------------------------------------------------------------------
  await page.goto(modellPfad);
  const kennwerte = page.getByRole('region', { name: 'Kennwerte' });
  const groesse = (art: string): Locator => kennwerte.locator(`[data-groesse="${art}"] [data-wert="wert"]`);
  await expect(groesse('BGF')).toHaveText(`${mengeDe(FX.erweitert.din277.summen.bgf)} m²`);
  await expect(groesse('BRI')).toHaveText(`${mengeDe(FX.erweitert.din277.summen.bri)} m³`);
  await expect(groesse('NRF')).toHaveText(`${mengeDe(FX.erweitert.din277.summen.nrf)} m²`);
  await expect(kennwerte.locator('[data-groesse="BGF"] [data-wert="quelle"]')).toHaveText('(aus dem Modell)');

  await kennwerte.getByRole('button', { name: 'Kostenschätzung über Kennwerte …' }).click();
  const ks = page.getByRole('dialog', { name: 'Kostenschätzung über Kennwerte' });
  const kw = FX.erweitert.kostenschaetzung.kennwerte;
  for (const [i, k] of kw.entries()) {
    if (i > 0) await ks.getByRole('button', { name: 'Zeile hinzufügen' }).click();
    await ks.getByLabel(`Kostengruppe Zeile ${String(i + 1)}`).fill(k.nummer);
    await ks.getByLabel(`Kennwert Zeile ${String(i + 1)} (€ je Einheit)`).fill(betragDe(k.kennwert));
  }
  const ksVorschau = ks.getByRole('table', { name: 'Vorschau der Kostenschätzung' });
  for (const e of FX.erweitert.kostenschaetzung.eintraege)
    await expect(ksVorschau.getByRole('row').filter({ hasText: new RegExp(`^${e.nummer}`) })).toContainText(
      betragDe(e.betrag),
    );
  await expect(ksVorschau.locator('[data-wert="gesamt"]')).toHaveText(
    betragDe(FX.erweitert.kostenschaetzung.gesamt),
  );
  await ks.getByRole('button', { name: 'Kostenermittlung anlegen' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Kostenermittlung – Kostenschätzung aus haus-v1' }),
  ).toBeVisible();

  // Kostenkennwerte der neuen Ermittlung: KG 320 je m² BGF ist wieder der Kennwert.
  await page.goto(modellPfad);
  await waehle(page, kennwerte, 'Kostenermittlung', 'Kostenschätzung aus haus-v1');
  const kk = kennwerte.getByRole('table', { name: 'Kostenkennwerte' });
  await expect(kk.getByRole('row').filter({ hasText: /^320/ })).toContainText(
    betragDe(kw[0]?.kennwert ?? ''),
  );

  // --- Zuschlag, dann Aufmaßblatt aus Auswahl „EG“ (X1d) -------------------------------------------------------------
  await page.goto(`/lv/${inhalt.wurzelId}`);
  await page
    .getByLabel('Angebotsdatei wählen')
    .setInputFiles(new URL('fixtures/angebote/typisch-bieter-a.x84', wurzel).pathname);
  const einlesen = page.getByRole('dialog', { name: 'Angebot (X84) einlesen' });
  await einlesen.getByRole('button', { name: 'Übernehmen' }).click();
  const angebote = page.getByRole('dialog', { name: 'Angebote' });
  await expect(angebote.getByRole('row', { name: /Bieter A/ })).toBeVisible();
  await angebote.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await werkzeug(page, 'Angebote', 'Preisspiegel');
  await page
    .getByRole('table', { name: 'Bieter des Preisspiegels' })
    .getByRole('button', { name: 'Zuschlag erteilen: Bieter A' })
    .click();
  await page
    .getByRole('dialog', { name: 'Zuschlag erteilen – Bieter A' })
    .getByRole('button', { name: 'Zuschlag erteilen', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: /^Auftrags-LV – / })).toBeVisible();
  // Ticket 155: „Aufmaß aus Modell“ öffnet den einzigen Stand mit dem Auftrags-LV als „LV für Zuordnung“ vorgewählt
  await werkzeug(page, 'Abrechnung', 'Aufmaß aus Modell');
  await expect(page.getByRole('heading', { level: 1, name: 'haus-v1' })).toBeVisible();

  await expect(zuordnung.getByRole('combobox', { name: 'LV für Zuordnung' })).toHaveText(/^Auftrags-LV: /);
  await expect(zuordnung.getByText('3 Bauteile zugeordnet, 27 ohne Zuordnung')).toBeVisible();
  await baumzelle(page, FX.erweitert.aufmassAusAuswahl.auswahl.name).click();
  await expect.poll(() => page.evaluate(() => window.tethysModell?.auswahl().length)).toBe(17);
  await zuordnung.getByRole('button', { name: 'Aufmaßblatt aus Auswahl …' }).click();
  const am = page.getByRole('dialog', { name: 'Aufmaßblatt aus Auswahl' });
  const amZeile = am
    .getByRole('table', { name: 'Vorschau des Aufmaßblatts' })
    .getByRole('row')
    .filter({ hasText: OZ });
  await expect(amZeile.locator('[data-wert="menge"]')).toHaveText(`${mengeDe(AUFMASS?.menge ?? '')} m²`);
  await expect(am.getByRole('note')).toContainText('nicht erkennbar');
  await am.getByRole('button', { name: 'Aufmaßblatt anlegen' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Aufmaßblatt 1 – Aus Modell haus-v1' }),
  ).toBeVisible();
  const blatt = page.getByRole('treegrid', { name: 'Positionen des Aufmaßblatts' });
  await expect(zelle(blatt, 'oz', OZ, 'blattmenge')).toHaveText(mengeDe(AUFMASS?.menge ?? ''));

  // Ticket 155: dieselbe Auswahl noch einmal – die Vorschau nennt das Blatt, auf dem die Position schon steht.
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: 'haus-v1' })).toBeVisible();
  await expect(zuordnung.getByRole('combobox', { name: 'LV für Zuordnung' })).toHaveText(/^Auftrags-LV: /);
  await baumzelle(page, FX.erweitert.aufmassAusAuswahl.auswahl.name).click();
  await expect.poll(() => page.evaluate(() => window.tethysModell?.auswahl().length)).toBe(17);
  await zuordnung.getByRole('button', { name: 'Aufmaßblatt aus Auswahl …' }).click();
  const zweites = page.getByRole('dialog', { name: 'Aufmaßblatt aus Auswahl' });
  await expect(zweites.getByRole('list', { name: 'Schon aufgemessen' })).toContainText(
    `${OZ} steht schon auf Blatt 1 (${mengeDe(AUFMASS?.menge ?? '')} m²).`,
  );
  await zweites.getByRole('button', { name: 'Abbrechen' }).click();
});
