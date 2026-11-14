// SPDX-License-Identifier: AGPL-3.0-or-later
// Tor X1-Erweitert (Ticket 117, D-58, `plan.md` §4) über die Oberfläche. Aufbau wie X1-Kern, aber mit allen sieben Zuordnungen
// der Fixture (Stück, zwei Mengenarten an einem Bauteil, Türen in zwei Geschossen) und der Mengenübernahme aus v1 (LV-Summen
// = `kern.sollwerte`). Dann: DIN-277-Größen BGF, BRI, NRF = Soll → Kostenschätzung über Kennwerte = Soll, Kostenkennwerte →
// Zuschlag wie M3 (zwei X84, Bieter A, ohne Wahl) → „Aufmaßblatt aus Auswahl“ mit dem Geschoss EG = Sollmengen →
// `haus-v2.ifc` als neuer Stand → Vergleich (hinzugefügt, entfernt, geändert) und betroffene Positionen mit Mengendifferenz =
// Soll → „Mengen aktualisieren“ = neue Vordersätze und LV-Summen laut Soll; das Auftrags-LV bleibt (D-53).
//
// Alle erwarteten Zahlen stehen in `fixtures/typisch-bim.json`, `typisch.json` und `typisch-angebote.json` (Ticket 99, 69), nie
// aus einem Lauf der App. Die 3D-Ansicht prüft der Prüfzugang `window.tethysModell` (Test-Build), nie Pixel (D-58).

import { readFileSync } from 'node:fs';
import { ifcKlassenName } from '../src/bim/texte';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { betragDe, leerlauf, summen } from './hilfen';
import { werkzeug } from './werkzeuge';
import {
  BIM,
  baumzelle,
  dreiDGeladen,
  ifcDatei,
  lvGrid,
  mengeDe,
  mengenAusModell,
  modellEinlesen,
  nameIn,
  projektMitTypisch,
  summenDe,
  waehle,
  zelle,
  zuordnen,
} from './x1-aufbau';

// WebGL 2 in Headless-Chromium ohne GPU: ANGLE auf SwiftShader, wie in `bim.spec.ts` (D-100.11).
const executablePath = process.env['PW_CHROMIUM_PATH'] || undefined;
test.use({
  launchOptions: {
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    ...(executablePath ? { executablePath } : {}),
  },
});
// Die Grids sind virtualisiert: Ein hohes Fenster hält alle Zeilen des LV, des Auftrags-LV und des Modellbaums gerendert
// (wie M4).
test.use({ viewport: { width: 1440, height: 2000 } });

const wurzel = new URL('../../../fixtures/', import.meta.url);
const ANGEBOTE = JSON.parse(readFileSync(new URL('typisch-angebote.json', wurzel), 'utf8')) as {
  readonly preisspiegel: {
    readonly bieter: readonly { readonly angebotId: string; readonly name: string; readonly datei: string }[];
    readonly vergleiche: readonly {
      readonly angebotIds: readonly string[];
      readonly rang: Readonly<Record<string, string>>;
    }[];
  };
};
const TYPISCH_KNOTEN = (
  JSON.parse(readFileSync(new URL('typisch.json', wurzel), 'utf8')) as {
    readonly knoten: readonly { readonly positionsart?: string }[];
  }
).knoten;

// Zuschlag wie M3: das Paar A+B, an den Ersten (Ticket 69), hier ohne Wahl der Alternative, damit die Grundposition
// 02.0070 mit ihrer Zuordnung im Auftrags-LV bleibt (D-117.3).
const PAAR = ANGEBOTE.preisspiegel.bieter.filter((b) => b.name === 'Bieter A' || b.name === 'Bieter B');
const RANG =
  ANGEBOTE.preisspiegel.vergleiche.find(
    (v) => v.angebotIds.length === 2 && PAAR.every((b) => v.angebotIds.includes(b.angebotId)),
  )?.rang ?? {};
const ERSTER = PAAR.find((b) => RANG[b.angebotId] === '1');
const ALTERNATIVEN = TYPISCH_KNOTEN.filter((k) => k.positionsart === 'wahl').length;

const ALLE = BIM.bauteile.v1.length;
/** Bauteile mit mindestens einer Zuordnung (verschiedene GlobalIds über alle sieben Zuordnungen). */
const ZUGEORDNET = new Set(BIM.zuordnungen.flatMap((z) => z.bauteile.map((b) => b.globalId))).size;
const EINHEIT = new Map(BIM.zuordnungen.map((z) => [z.oz, z.einheit]));
const SOLL = BIM.erweitert;
const zaehlung = (n: number): string =>
  `${String(n)} Bauteile zugeordnet, ${String(ALLE - n)} ohne Zuordnung`;

/** Texte der Zeilen eines Grids (nur die gerenderten; die Listen hier sind kurz). */
function gridZeilen(grid: Locator): Promise<string[][]> {
  return grid.evaluate((g) =>
    [...g.querySelectorAll('[role="row"]')]
      .map((r) => [...r.querySelectorAll('[role="gridcell"]')].map((c) => c.textContent.trim()))
      .filter((z) => z.length > 0),
  );
}

/** Texte der Zeilen einer Tabelle (`<tbody>`, Zeilenköpfe und Zellen). */
function tabellenZeilen(tabelle: Locator): Promise<string[][]> {
  return tabelle.evaluate((t) =>
    [...t.querySelectorAll('tbody tr')].map((r) =>
      [...r.querySelectorAll('th, td')].map((c) => c.textContent.trim()),
    ),
  );
}

async function zuschlagWieM3(page: Page): Promise<void> {
  for (const b of PAAR) {
    await page.getByLabel('Angebotsdatei wählen').setInputFiles(new URL(b.datei, wurzel).pathname);
    const x84 = page.getByRole('dialog', { name: 'Angebot (X84) einlesen' });
    await expect(x84.getByLabel('Bieter')).toHaveValue(b.name);
    await x84.getByRole('button', { name: 'Übernehmen' }).click();
    const liste = page.getByRole('dialog', { name: 'Angebote' });
    await expect(liste.getByRole('row', { name: new RegExp(b.name) })).toBeVisible();
    await liste.getByRole('button', { name: 'Schließen', exact: true }).last().click();
    await expect(liste).toBeHidden();
  }
  await werkzeug(page, 'Angebote', 'Preisspiegel');
  const name = ERSTER?.name ?? '';
  await page
    .getByRole('table', { name: 'Bieter des Preisspiegels' })
    .getByRole('button', { name: `Zuschlag erteilen: ${name}` })
    .click();
  const dialog = page.getByRole('dialog', { name: `Zuschlag erteilen – ${name}` });
  // Ohne Wahl entfällt die Alternative 02.0070 A; die Grundposition 02.0070 bleibt.
  await expect(dialog.getByTestId('zuschlag-entfallend')).toHaveText(String(ALTERNATIVEN));
  await dialog.getByRole('button', { name: 'Zuschlag erteilen', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { level: 1, name: /^Auftrags-LV – / })).toBeVisible();
}

test('Tor X1-Erweitert: DIN 277, Kostenschätzung, Zuschlag, Aufmaß aus Auswahl, Vergleich v1 → v2, Mengen aktualisieren', async ({
  page,
}) => {
  test.setTimeout(300_000);
  expect(ERSTER?.name).toBe('Bieter A');
  expect(BIM.zuordnungen).toHaveLength(7);

  // --- Aufbau: Projekt, LV `typisch` per GAEB, haus-v1, alle sieben Zuordnungen, Mengen aus v1 ----------------------
  const { projektId, lvPfad } = await projektMitTypisch(page, 'Musterhaus X1-Erweitert');
  await page.getByRole('link', { name: 'Zum Projekt' }).click();
  await page.getByRole('link', { name: 'Modelle', exact: true }).click();
  await modellEinlesen(page, 'haus-v1');
  const modellPfad = new URL(page.url()).pathname;
  await dreiDGeladen(page);
  const zuordnung = page.getByRole('region', { name: 'Zuordnung zu Positionen' });
  await expect(zuordnung.getByText(zaehlung(0))).toBeVisible();
  for (const f of BIM.zuordnungen) await zuordnen(page, f);
  await expect(zuordnung.getByText(zaehlung(ZUGEORDNET))).toBeVisible();
  const liste = zuordnung.getByRole('list', { name: 'Zuordnungen' });
  for (const f of BIM.zuordnungen) await expect(liste).toContainText(`${f.oz} ${f.kurztext}`);

  await page.goto(lvPfad);
  await mengenAusModell(page, BIM.kern.vordersaetze);
  const grid = lvGrid(page);
  for (const v of BIM.kern.vordersaetze)
    await expect(zelle(grid, 'ordnungszahl', v.oz, 'menge')).toHaveText(mengeDe(v.menge));
  await expect.poll(() => summen(page)).toMatchObject(summenDe(BIM.kern.sollwerte.summen));

  // --- DIN 277: BGF, BRI, NRF aus dem Modell = Soll -------------------------------------------------------------------
  await page.goto(modellPfad);
  const kennwerte = page.getByRole('region', { name: 'Kennwerte' });
  const groesse = (art: string): Locator => kennwerte.locator(`[data-groesse="${art}"] [data-wert="wert"]`);
  await expect(groesse('BGF')).toHaveText(`${mengeDe(SOLL.din277.summen.bgf)} m²`);
  await expect(groesse('BRI')).toHaveText(`${mengeDe(SOLL.din277.summen.bri)} m³`);
  await expect(groesse('NRF')).toHaveText(`${mengeDe(SOLL.din277.summen.nrf)} m²`);
  for (const art of ['BGF', 'BRI', 'NRF'])
    await expect(kennwerte.locator(`[data-groesse="${art}"] [data-wert="quelle"]`)).toHaveText(
      '(aus dem Modell)',
    );

  // --- Kostenschätzung über Kennwerte = Soll; die Kostenkennwerte geben die Kennwerte zurück ----------------------
  const ks = SOLL.kostenschaetzung;
  await kennwerte.getByRole('button', { name: 'Kostenschätzung über Kennwerte …' }).click();
  const dialog = page.getByRole('dialog', { name: 'Kostenschätzung über Kennwerte' });
  for (const [i, k] of ks.kennwerte.entries()) {
    const n = String(i + 1);
    if (i > 0) await dialog.getByRole('button', { name: 'Zeile hinzufügen' }).click();
    await expect(dialog.getByRole('combobox', { name: `Bezug Zeile ${n}`, exact: true })).toHaveText(
      `${ks.bezugsgroesse.art} (${ks.bezugsgroesse.einheit})`,
    );
    await dialog.getByLabel(`Kostengruppe Zeile ${n}`).fill(k.nummer);
    await dialog.getByLabel(`Kennwert Zeile ${n} (€ je Einheit)`).fill(betragDe(k.kennwert));
  }
  const ksVorschau = dialog.getByRole('table', { name: 'Vorschau der Kostenschätzung' });
  await expect(ksVorschau.locator('[data-wert="gesamt"]')).toHaveText(betragDe(ks.gesamt));
  await expect
    .poll(async () => (await tabellenZeilen(ksVorschau)).map((z) => z.slice(0, 2)))
    .toEqual([...ks.eintraege.map((e) => [e.nummer, betragDe(e.betrag)]), ['Gesamt', betragDe(ks.gesamt)]]);
  await dialog.getByRole('button', { name: 'Kostenermittlung anlegen' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Kostenermittlung – Kostenschätzung aus haus-v1' }),
  ).toBeVisible();
  await page.goto(modellPfad);
  await waehle(page, kennwerte, 'Kostenermittlung', 'Kostenschätzung aus haus-v1');
  // Je Kostengruppe der Schätzung: KG, Summe, €/m² BGF = Betrag und Kennwert der Fixture.
  const kk = kennwerte.getByRole('table', { name: 'Kostenkennwerte' });
  await expect
    .poll(async () => {
      const zeilen = new Map((await tabellenZeilen(kk)).map((z) => [z[0] ?? '', z.slice(0, 3)]));
      return ks.eintraege.map((e) => zeilen.get(e.nummer));
    })
    .toEqual(
      ks.eintraege.map((e) => [
        e.nummer,
        betragDe(e.betrag),
        betragDe(ks.kennwerte.find((k) => k.nummer === e.nummer)?.kennwert ?? ''),
      ]),
    );

  // --- Zuschlag wie M3 ------------------------------------------------------------------------------------------------
  await page.goto(lvPfad);
  await zuschlagWieM3(page);
  const auftragPfad = new URL(page.url()).pathname;
  const auftragsGrid = page.getByRole('treegrid', { name: 'Positionen des Auftrags-LV' });
  for (const v of BIM.kern.vordersaetze)
    await expect(zelle(auftragsGrid, 'ordnungszahl', v.oz, 'menge')).toHaveText(mengeDe(v.menge));

  // --- Aufmaßblatt aus Auswahl „Geschoss EG“ am Auftrags-LV = Sollmengen ---------------------------------------------
  // Ticket 155: „Aufmaß aus Modell“ öffnet den einzigen Stand mit dem Auftrags-LV als „LV für Zuordnung“ vorgewählt
  await werkzeug(page, 'Abrechnung', 'Aufmaß aus Modell');
  await expect(page.getByRole('heading', { level: 1, name: 'haus-v1' })).toBeVisible();
  await expect(zuordnung.getByRole('combobox', { name: 'LV für Zuordnung' })).toHaveText(/^Auftrags-LV: /);
  await expect(zuordnung.getByText(zaehlung(ZUGEORDNET))).toBeVisible();
  const aa = SOLL.aufmassAusAuswahl;
  await baumzelle(page, aa.auswahl.name).click();
  await expect
    .poll(() => page.evaluate(() => window.tethysModell?.auswahl().length))
    .toBe(BIM.bauteile.v1.filter((b) => b.geschoss === aa.auswahl.name).length);
  await zuordnung.getByRole('button', { name: 'Aufmaßblatt aus Auswahl …' }).click();
  const am = page.getByRole('dialog', { name: 'Aufmaßblatt aus Auswahl' });
  const amVorschau = am.getByRole('table', { name: 'Vorschau des Aufmaßblatts' });
  // OZ, Zahl der ausgewählten Bauteile, Ansatzzeilen, Menge mit Einheit; keine Befunde
  await expect
    .poll(async () => (await tabellenZeilen(amVorschau)).map((z) => [z[0], z[2], z[3], z[4], z[5]]))
    .toEqual(
      aa.positionen.map((p) => [
        p.oz,
        String(p.bauteile.length),
        p.mengenansatz.map((z) => z.ausdruck).join(' + '),
        `${mengeDe(p.menge)} ${EINHEIT.get(p.oz) ?? ''}`,
        '',
      ]),
    );
  await expect(am.getByRole('note')).toContainText('nicht erkennbar');
  await am.getByRole('button', { name: 'Aufmaßblatt anlegen' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Aufmaßblatt 1 – Aus Modell haus-v1' }),
  ).toBeVisible();
  const blatt = page.getByRole('treegrid', { name: 'Positionen des Aufmaßblatts' });
  for (const p of aa.positionen)
    await expect(zelle(blatt, 'oz', p.oz, 'blattmenge')).toHaveText(mengeDe(p.menge));

  // --- haus-v2.ifc als neuer Stand, Vergleich mit dem Vorgänger = Soll ----------------------------------------------
  await page.goto(`/projekt/${projektId}/modelle`);
  const wahl = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Neuer Stand von haus-v1' }).click();
  await (await wahl).setFiles(ifcDatei('haus-v2'));
  const eingelesen = page.getByRole('dialog', { name: 'Modell eingelesen' });
  await expect(eingelesen.getByText('Keine Befunde.')).toBeVisible({ timeout: 30_000 });
  await eingelesen.getByRole('button', { name: 'Modell öffnen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'haus-v2' })).toBeVisible();
  await page.getByRole('link', { name: 'Mit Vorgänger vergleichen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Vergleich: haus-v1 → haus-v2' })).toBeVisible();

  const v = SOLL.vergleich;
  const zusammenfassung = page.getByRole('region', { name: 'Zusammenfassung' });
  await expect(zusammenfassung).toContainText(`Hinzugefügt${String(v.hinzugefuegt.length)}`);
  await expect(zusammenfassung).toContainText(`Entfernt${String(v.entfernt.length)}`);
  await expect(zusammenfassung).toContainText(`Geändert${String(v.geaendert.length)}`);
  await expect(zusammenfassung).toContainText(
    `Unverändert${String(ALLE - v.entfernt.length - v.geaendert.length)}`,
  );
  await expect(page.getByRole('region', { name: 'Befunde des Vergleichs' })).toContainText('Keine Befunde.');
  // Art, Klasse, Name, Geschoss je Zeile: hinzugefügt, entfernt, geändert wie die Fixture.
  const aenderungen = page.getByRole('treegrid', { name: 'Änderungen' });
  const v2 = new Map(BIM.bauteile.v2.map((b) => [b.globalId, b]));
  await expect
    .poll(async () => (await gridZeilen(aenderungen)).map((z) => z.slice(0, 4)))
    .toEqual([
      ...v.hinzugefuegt.map((b) => [
        expect.stringContaining('Hinzugefügt'),
        ifcKlassenName(b.klasse),
        b.name,
        b.geschoss,
      ]),
      ...v.entfernt.map((b) => [
        expect.stringContaining('Entfernt'),
        ifcKlassenName(b.klasse),
        b.name,
        b.geschoss,
      ]),
      ...v.geaendert.map((g) => {
        const b = v2.get(g.globalId);
        return [
          expect.stringContaining('Geändert'),
          b === undefined ? undefined : ifcKlassenName(b.klasse),
          b?.name,
          b?.geschoss,
        ];
      }),
    ]);

  // --- Folgen für das LV: betroffene Positionen mit Mengendifferenz = Soll --------------------------------------------
  const folgen = page.getByRole('region', { name: 'Folgen für ein LV' });
  await expect(folgen).toContainText(
    `${String(SOLL.betroffenePositionen.length)} von ${String(BIM.zuordnungen.length)} Positionen mit Zuordnungen betroffen.`,
  );
  await expect(folgen.getByRole('group', { name: 'Netto des LV' })).toContainText(
    betragDe(BIM.kern.sollwerte.summen.netto),
  );
  // OZ, Menge alt, Menge neu, Differenz, Menge im LV der betroffenen Positionen.
  const positionen = folgen.getByRole('treegrid', { name: 'Positionen mit Zuordnungen' });
  await expect
    .poll(async () =>
      (await gridZeilen(positionen))
        .filter((z) => z.at(-1) === 'ja')
        .map((z) => [z[0], z[3], z[4], z[5], z[6]]),
    )
    .toEqual(
      SOLL.betroffenePositionen.map((b) => [
        b.oz,
        mengeDe(b.vorher),
        mengeDe(b.nachher),
        mengeDe(b.differenz),
        mengeDe(b.vorher),
      ]),
    );

  // --- „Mengen aktualisieren“ = neue Vordersätze und LV-Summen laut Soll ---------------------------------------------
  const ma = SOLL.mengenAktualisieren;
  await folgen.getByRole('button', { name: 'Mengen aktualisieren …' }).click();
  const vorschau = page.getByRole('dialog', { name: 'Mengen aktualisieren' });
  await expect(vorschau).toContainText(
    `Die Mengen von ${String(SOLL.betroffenePositionen.length)} Positionen werden aus dem neuen Stand gesetzt`,
  );
  // Der Befund für das entfernte Bauteil (`bauteil-fehlt`), mit seinem Namen im alten Stand (D-116.5).
  for (const b of ma.befunde) {
    const g = BIM.bauteile.v1.find((x) => x.kennung === b.kennung)?.globalId ?? '';
    await expect(vorschau).toContainText(nameIn('v1', g));
  }
  await vorschau.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(vorschau).toBeHidden();
  await leerlauf(page);
  await expect(folgen.getByRole('group', { name: 'Netto des LV' })).toContainText(
    betragDe(ma.sollwerte.summen.netto),
  );
  const neu = new Map(ma.vordersaetze.map((x) => [x.oz, x.menge]));
  await expect
    .poll(async () => (await gridZeilen(positionen)).map((z) => [z[0], z[6]]))
    .toEqual(BIM.zuordnungen.map((z) => [z.oz, mengeDe(neu.get(z.oz) ?? '')]));
  await expect(folgen.getByRole('button', { name: 'Mengen aktualisieren …' })).toBeDisabled();
  await expect(folgen).toContainText('Die Mengen des LV entsprechen dem neuen Stand.');

  // LV-Seite (nach Neuladen): Vordersätze, GP und Summen laut Soll.
  await page.goto(lvPfad);
  await page.reload();
  for (const x of ma.vordersaetze) {
    await expect(zelle(grid, 'ordnungszahl', x.oz, 'menge')).toHaveText(mengeDe(x.menge));
    await expect(zelle(grid, 'ordnungszahl', x.oz, 'gesamtpreis')).toHaveText(
      betragDe(ma.sollwerte.positionen[x.positionId]?.gp ?? ''),
    );
  }
  await expect.poll(() => summen(page)).toMatchObject(summenDe(ma.sollwerte.summen));

  // Das Auftrags-LV bleibt beim Stand des Zuschlags (D-53: `MengenansatzSetzen` ist kein AuftragsLvBefehl).
  await page.goto(auftragPfad);
  for (const x of BIM.kern.vordersaetze)
    await expect(zelle(auftragsGrid, 'ordnungszahl', x.oz, 'menge')).toHaveText(mengeDe(x.menge));
});
