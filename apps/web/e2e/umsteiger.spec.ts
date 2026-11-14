// SPDX-License-Identifier: AGPL-3.0-or-later
// Tor E „Einführungsreife“, Punkt 1 (Ticket 158, `umfang-welle-7.md` §4): der Weg eines Umsteigers bei 1280 × 800, nur mit
// Schaltflächen, Verweisen, Dateiauswahl und Tastatur. Keine Testhaken (`window.tethysTest`) und nach dem Start keine
// getippte Adresse: Jeder Seitenwechsel geht über Seitenleiste, Brotkrumen oder einen Verweis der Seite.
//
// Erster Start → Beispielprojekt laden und ansehen → neues Projekt aus der amtlichen BVBS-X83 → LV-Seite mit mindestens 15
// Zeilen samt EP und GP → zwei X84 → Preisspiegel (PDF) → Zuschlag → Nachtrag anlegen und beauftragen → Aufmaßblatt →
// Rechnung mit Skonto prüfen und freigeben, Zahlungsfreigabe als PDF → Kostenkontrolle → Projektdatei sichern → Projekt
// löschen → Sicherung einlesen → dieselben Werte.
//
// Erwartete Zahlen stehen in den Fixtures und den amtlichen Dateien (`umsteiger-dateien.ts`) oder sind unten von Hand nach
// N2 hergeleitet, nie aus einem Lauf der App. „Dieselben Werte“ vergleicht die Anzeige vor der Sicherung mit der Anzeige
// nach dem Einlesen.

import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import type { Einheitspreis, LvZustand, Projektdatei } from '@tethys/vertrag';
import { lvAlsExcel } from '../../../packages/ausgabe/src/index';
import { betragDe, eingabeDe, neueZeile, summen, tippe, zeilen } from './hilfen';
import {
  ANGEBOT_ERSTER,
  ANGEBOT_ZWEITER,
  BVBS_X83,
  BVBS_X84,
  ERSTBIETER,
  LV_NAME,
  POSITIONEN_X83,
  ZWEITBIETER,
  verdoppelnNichtExakt,
  zweiteX84,
} from './umsteiger-dateien';
import {
  betragAusCent,
  dateiWaehlen,
  fixturePfad,
  gpCent,
  gridSicht,
  herunterladen,
  pdfErzeugen,
  leiste,
  ueberLeiste,
  waagerechterUeberlauf,
} from './umsteiger-hilfen';
import { werkzeug, werkzeugleiste } from './werkzeuge';

test.use({ viewport: { width: 1280, height: 800 } });

const lies = (rel: string): unknown => JSON.parse(readFileSync(fixturePfad(rel), 'utf8'));
const TYPISCH = lies('typisch.json') as {
  readonly name: string;
  readonly sollwerte: { readonly summen: { readonly netto: string; readonly nettoNachNachlass: string } };
};
const ABRECHNUNG = lies('typisch-abrechnung.json') as {
  readonly zuschlag: {
    readonly bieterName: string;
    readonly sollwerte: { readonly summen: { readonly nettoNachNachlass: string } };
  };
};

const PROJEKT = 'Neubau Prüfdatei (erfunden)';
const BAUHERR = 'Gemeinde Musterstadt (erfunden)';

// Nachtrag N01: zwei Positionen, Preise vom Auftragnehmer (selbst gewählt). GP nach N2:
//   35,000 m² × 85,500 = 2.992,50 · 4,000 Wo × 1.250,000 = 5.000,00 · Summe 7.992,50.
const NACHTRAG = {
  bezeichnung: 'Zusätzliche Wasserhaltung',
  titel: 'Wasserhaltung',
  positionen: [
    { kurztext: 'Spundwand zusätzlich rammen', menge: '35.000', einheit: 'm2', ep: '85.500' },
    { kurztext: 'Wasserhaltung verlängert vorhalten', menge: '4.000', einheit: 'Wo', ep: '1250.000' },
  ],
} as const;
const NACHTRAG_NETTO = NACHTRAG.positionen.reduce((s, p) => s + gpCent(p.menge, p.ep), 0n);
/** MwSt 19 % kaufmännisch auf 2 Stellen (N2), für Beträge ≥ 0. */
const mwst19 = (c: bigint): bigint => (c * 19n + 50n) / 100n;
const AUFTRAG_NACH_NACHTRAG = ANGEBOT_ERSTER.netto + NACHTRAG_NETTO;

// Aufmaßblatt 1 auf zwei Positionen des Auftrags-LV (EP aus der amtlichen X84):
//   001.002.0010 Ist = 12,5 × 8 × 3 = 300,000 m³, EP 5,000 → GP Ist 1.500,00
//   001.003.0010 Ist = 2 × 20 × 5 = 200,000 m², EP 50,000 → GP Ist 10.000,00
const AUFMASS = [
  { oz: '001.002.0010', ausdruecke: ['12,5*8*3'], summe: '300,000', ep: '5.000' },
  { oz: '001.003.0010', ausdruecke: ['2*20*5'], summe: '200,000', ep: '50.000' },
] as const;
const AUFMASS_GP = AUFMASS.reduce((s, a) => s + gpCent(a.summe.replace(',', '.'), a.ep), 0n);

// Abschlagsrechnung 1 über Blatt 1, ohne Nachlass, Umlage und Einbehalt (Kette D-34/D-72):
//   Leistung 11.500,00 · MwSt 19 % = 2.185,00 · Brutto kum. = Zahlbetrag 13.685,00.
// Skonto 3,00 % in 14 Kalendertagen ab Eingang 30.10.2026 (der Eingangstag zählt nicht) → Fristende 13.11.2026;
//   Skonto = gerundet(13.685,00 × 3 %, 2) = 410,55; Auszahlung bei Zahlung bis zum Fristende 13.274,45.
const RECHNUNG = {
  eingang: '30.10.2026',
  nummer: 'AR-01',
  skontoSatz: '3.00',
  skontoTage: '14',
  fristende: '13.11.2026',
  zahlungAm: '10.11.2026',
} as const;
const RECHNUNG_MWST = mwst19(AUFMASS_GP);
const RECHNUNG_ZAHLBETRAG = AUFMASS_GP + RECHNUNG_MWST;
const SKONTO = (RECHNUNG_ZAHLBETRAG * 300n + 5000n) / 10000n;
const AUSZAHLUNG_MIT_SKONTO = betragAusCent(RECHNUNG_ZAHLBETRAG - SKONTO);
/** Der Satz zu beiden Fällen, am Bildschirm und im PDF gleich. */
const SKONTO_SATZ = `Bei Zahlung bis ${RECHNUNG.fristende}: Auszahlung ${AUSZAHLUNG_MIT_SKONTO} €, danach: ${betragAusCent(RECHNUNG_ZAHLBETRAG)} €.`;

/** Die Leiste der Prüfansicht einer Rechnung (Freigeben, Ausgabe). */
const aktionen = (page: Page): Locator => page.getByRole('toolbar', { name: 'Aktionen der Rechnung' });

/** `text` als Teil eines regulären Ausdrucks. */
const muster = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const lvListe = (page: Page): Locator =>
  page.getByRole('list', { name: 'Leistungsverzeichnisse', exact: true });
const auftragsListe = (page: Page): Locator => page.getByRole('list', { name: 'Auftrags-LVs des Projekts' });

/** Dialog „Angebote“ nach dem Einlesen schließen. */
async function angeboteSchliessen(page: Page): Promise<void> {
  const liste = page.getByRole('dialog', { name: 'Angebote' });
  await liste.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(liste).toBeHidden();
}

/** Ein Angebot über „Angebote → Angebot einlesen“ (Dateiauswahl) übernehmen. */
async function angebotEinlesen(
  page: Page,
  datei: string | { name: string; mimeType: string; buffer: Buffer },
  bieter: string,
): Promise<void> {
  await dateiWaehlen(page, () => werkzeug(page, 'Angebote', 'Angebot einlesen'), datei);
  const dialog = page.getByRole('dialog', { name: 'Angebot (X84) einlesen' });
  await expect(dialog.getByLabel('Bieter')).toHaveValue(bieter);
  await dialog.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Angebote' }).getByRole('row', { name: bieter }),
  ).toBeVisible();
  await angeboteSchliessen(page);
}

/** Summen des Grids in der Anzeige (Netto, Nachlass, Netto nach Nachlass, MwSt, Brutto). */
function summenAus(netto: bigint): Record<string, string> {
  const m = mwst19(netto);
  return {
    Netto: betragAusCent(netto),
    Nachlass: '0,00',
    'Netto nach Nachlass': betragAusCent(netto),
    MwSt: betragAusCent(m),
    Brutto: betragAusCent(netto + m),
  };
}

/** Die sichtbare Schaltfläche; das versteckte Dateifeld daneben trägt dieselbe Beschriftung. */
const sichtbarerKnopf = (page: Page, text: string): Locator =>
  page.locator('button').filter({ hasText: new RegExp(`^${muster(text)}$`) });

/**
 * D-95: Beim Einlesen einer Projektdatei mit Einstellungen erscheint der Dialog „Projektdatei eingelesen“ (übernommene und
 * belassene Einstellungen); der Weg schließt ihn. Trägt die Datei keine Einstellungen, erscheint er nicht.
 */
async function projektdateiEingelesenSchliessen(page: Page): Promise<void> {
  const bericht = page.getByRole('dialog', { name: 'Projektdatei eingelesen' });
  const projekt = page.getByRole('list', { name: 'Projekte' }).getByRole('link', { name: PROJEKT });
  await expect(bericht.or(projekt).first()).toBeVisible();
  if (await bericht.isVisible()) {
    await bericht.getByRole('button', { name: 'Schließen', exact: true }).last().click();
    await expect(bericht).toBeHidden();
  }
}

const ohneUeberlauf = async (page: Page, wo: string): Promise<void> => {
  expect(await waagerechterUeberlauf(page), `waagerechter Überlauf: ${wo}`).toBeNull();
};

/**
 * Liest die Werte, die nach dem Einlesen der Sicherung gleich sein müssen, über die Oberfläche: beginnt und endet auf der
 * Übersicht des Projekts.
 */
async function werteLesen(page: Page): Promise<Record<string, unknown>> {
  const w: Record<string, unknown> = {};
  await expect(page.getByRole('heading', { level: 1, name: PROJEKT })).toBeVisible();
  // Die Listen laden nach der Überschrift: erst lesen, wenn die Summen stehen.
  await expect(lvListe(page).getByRole('listitem').first()).toContainText('€');
  await expect(auftragsListe(page).getByRole('listitem').first()).toContainText('€');
  w['lvs'] = await lvListe(page).getByRole('listitem').allInnerTexts();
  w['auftraege'] = await auftragsListe(page).getByRole('listitem').allInnerTexts();

  // Preisspiegel: Bieter, Rang und Summen.
  await lvListe(page)
    .getByRole('link', { name: `Preisspiegel: ${LV_NAME}` })
    .click();
  const bieter = page.getByRole('table', { name: 'Bieter des Preisspiegels' });
  await expect(bieter.getByRole('row', { name: ZWEITBIETER })).toBeVisible();
  w['preisspiegel'] = await bieter.getByRole('row').allInnerTexts();

  // Auftrags-LV: Summen und Nachträge.
  await leiste(page).getByRole('link', { name: 'Auftrags-LV', exact: true }).click();
  await page
    .getByRole('list', { name: 'Auftrags-LVs' })
    .getByRole('link', { name: LV_NAME, exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: /^Auftrags-LV – / })).toBeVisible();
  await expect.poll(async () => (await summen(page))['Netto']).not.toBe(undefined);
  w['auftragSummen'] = await summen(page);
  const nachtraege = page.getByRole('table', { name: 'Nachträge des Auftrags-LV' });
  await expect(nachtraege.getByTestId('nachtrag-status').first()).toBeVisible();
  w['nachtraege'] = await nachtraege.getByRole('row').allInnerTexts();

  // Soll/Ist aus dem Aufmaß.
  await werkzeug(page, 'Abrechnung', 'Soll/Ist');
  const sollIst = page.getByRole('treegrid', { name: 'Soll/Ist je Position' });
  await expect(sollIst).toBeVisible();
  const gesamt = sollIst.locator('.tx-grid__zeile--summe');
  await expect(gesamt.locator('[data-spalte="gpIst"] .tx-grid__text')).not.toHaveText('');
  w['sollIst'] = await gesamt.innerText();

  // Rechnung 1: Abzugskette und Freigabe.
  await ueberLeiste(page, 'Rechnungen');
  await page
    .getByRole('region', { name: `Rechnungen zu ${LV_NAME}` })
    .getByRole('link', { name: 'Rechnung 1' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: /^Abschlagsrechnung 1 – / })).toBeVisible();
  await expect(page.getByTestId('freigabe')).toContainText('Freigegeben');
  w['rechnung'] = await page.locator('[data-testid^="kette-"]').allInnerTexts();
  w['freigabe'] = await page.getByTestId('freigabe').innerText();
  w['zahlung'] = await page.locator('[data-testid^="zahlung-"], [data-testid^="fall-"]').allInnerTexts();

  // Kostenkontrolle.
  await ueberLeiste(page, 'Kosten');
  await page
    .getByRole('toolbar', { name: 'Werkzeuge der Kostenseite' })
    .getByRole('link', { name: 'Kostenkontrolle' })
    .click();
  const kontrolle = page.getByRole('treegrid', { name: 'Kostenkontrolle' });
  await expect(kontrolle.getByRole('row', { name: /^Gesamt / })).toBeVisible();
  w['kostenkontrolle'] = await kontrolle.getByRole('row').allInnerTexts();

  await page.getByRole('navigation', { name: 'Pfad' }).getByRole('link', { name: PROJEKT }).click();
  await expect(page.getByRole('heading', { level: 1, name: PROJEKT })).toBeVisible();
  return w;
}

/** Der Torweg, Schritt für Schritt wie im Kopf dieser Datei. */
async function torweg(page: Page): Promise<void> {
  expect(verdoppelnNichtExakt()).toEqual([]);

  // ── Erster Start: Begrüßung, Beispielprojekt laden und ansehen ──────────────────────────────────────────────────────
  await page.goto('/');
  const start = page.getByRole('region', { name: 'Willkommen bei Tethys AVA' });
  await expect(start.getByText('Noch keine Projekte.')).toBeVisible();
  await ohneUeberlauf(page, 'Begrüßung');
  await start.getByRole('button', { name: 'Beispielprojekt laden' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Beispielprojekt Musterhaus' })).toBeVisible();
  await expect(lvListe(page)).toContainText('3 Angebote');
  await expect(page.getByLabel(`Netto nach Nachlass ${TYPISCH.name}`, { exact: true })).toHaveText(
    `${betragDe(TYPISCH.sollwerte.summen.nettoNachNachlass)} €`,
  );
  await expect(auftragsListe(page)).toContainText(
    `${betragDe(ABRECHNUNG.zuschlag.sollwerte.summen.nettoNachNachlass)} €`,
  );
  await ohneUeberlauf(page, 'Übersicht des Beispielprojekts');
  // Ansehen: das LV mit seinen Summen, dann der Preisspiegel mit drei Bietern.
  await lvListe(page).getByRole('link', { name: TYPISCH.name, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: TYPISCH.name })).toBeVisible();
  await expect.poll(async () => (await summen(page))['Netto']).toBe(betragDe(TYPISCH.sollwerte.summen.netto));
  await ohneUeberlauf(page, 'LV des Beispielprojekts');
  await werkzeug(page, 'Angebote', 'Preisspiegel');
  await expect(page.getByRole('table', { name: 'Bieter des Preisspiegels' }).getByRole('row')).toHaveCount(4);
  await ohneUeberlauf(page, 'Preisspiegel des Beispielprojekts');

  // ── Neues Projekt aus der amtlichen BVBS-X83 ───────────────────────────────────────────────────────────────────────
  await ueberLeiste(page, 'Projekte');
  await expect(page.getByRole('heading', { level: 1, name: 'Projekte' })).toBeVisible();
  await page.getByLabel('Projektname').fill(PROJEKT);
  await page.getByLabel('Bauherr').fill(BAUHERR);
  await page.getByRole('button', { name: 'Projekt anlegen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: PROJEKT })).toBeVisible();
  await dateiWaehlen(
    page,
    () => page.getByRole('button', { name: 'GAEB einlesen' }).click(),
    fixturePfad(BVBS_X83),
  );
  const gaeb = page.getByRole('dialog', { name: 'GAEB-Datei einlesen' });
  await expect(gaeb.getByTestId('anzahl-positionen')).toHaveText(String(POSITIONEN_X83));
  await gaeb.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(gaeb).toBeHidden();
  await lvListe(page).getByRole('link', { name: LV_NAME, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: LV_NAME })).toBeVisible();

  // LV-Seite: mindestens 15 Zeilen, EP und GP ganz zu sehen, ohne waagerecht zu rollen.
  const sicht = await gridSicht(page, 'Positionen', ['Einheitspreis', 'Gesamtpreis']);
  expect(sicht.zeilen).toBeGreaterThanOrEqual(15);
  expect(sicht.gerollt).toBe(0);
  expect(sicht.sichtbar).toEqual({ Einheitspreis: true, Gesamtpreis: true });
  await ohneUeberlauf(page, 'LV-Seite der BVBS-X83');

  // ── Zwei X84 ──────────────────────────────────────────────────────────────────────────────────────────────────────
  await angebotEinlesen(page, fixturePfad(BVBS_X84), ERSTBIETER);
  await angebotEinlesen(page, zweiteX84(), ZWEITBIETER);

  // ── Preisspiegel ──────────────────────────────────────────────────────────────────────────────────────────────────
  await werkzeug(page, 'Angebote', 'Preisspiegel');
  await expect(page.getByRole('heading', { level: 1, name: `Preisspiegel – ${LV_NAME}` })).toBeVisible();
  const bieter = page.getByRole('table', { name: 'Bieter des Preisspiegels' });
  for (const [name, rang, s] of [
    [ERSTBIETER, '1', ANGEBOT_ERSTER],
    [ZWEITBIETER, '2', ANGEBOT_ZWEITER],
  ] as const) {
    const zeile = bieter.getByRole('row', { name: new RegExp(`^${muster(name)} `) });
    await expect(zeile.getByTestId('rang')).toHaveText(rang);
    await expect(zeile.getByTestId('netto')).toHaveText(betragAusCent(s.netto));
    await expect(zeile.getByTestId('nettoNachNachlass')).toHaveText(betragAusCent(s.netto));
    await expect(zeile.getByTestId('brutto')).toHaveText(betragAusCent(s.brutto));
  }
  await ohneUeberlauf(page, 'Preisspiegel');
  // Preisspiegel als PDF: erst die Vorschau, dann herunterladen; der Text nennt Bieter und Summen.
  const preisspiegelText = await pdfErzeugen(
    page,
    () => werkzeug(page, 'Ausgabe', 'Preisspiegel als PDF …'),
    'Preisspiegel als PDF',
    'Herunterladen',
    async (dialog) => {
      await dialog.getByRole('button', { name: 'Vorschau erzeugen' }).click();
      await expect(dialog.locator('iframe[title="Vorschau des PDF"]')).toBeVisible({ timeout: 60_000 });
    },
  );
  for (const s of [ANGEBOT_ERSTER, ANGEBOT_ZWEITER]) {
    expect(preisspiegelText).toContain(betragAusCent(s.netto));
    expect(preisspiegelText).toContain(betragAusCent(s.brutto));
  }
  expect(preisspiegelText).toContain(ZWEITBIETER);
  expect(preisspiegelText).toContain(PROJEKT);

  // ── Zuschlag an den Erstplatzierten, ohne Wahl ──────────────────────────────────────────────────────────────────
  await bieter.getByRole('button', { name: `Zuschlag erteilen: ${ERSTBIETER}` }).click();
  const zuschlag = page.getByRole('dialog', { name: `Zuschlag erteilen – ${ERSTBIETER}` });
  await zuschlag.getByRole('button', { name: 'Zuschlag erteilen', exact: true }).click();
  await expect(zuschlag).toBeHidden();
  await expect(page.getByRole('heading', { level: 1, name: /^Auftrags-LV – / })).toBeVisible();
  await expect(page.getByTestId('auftragnehmer')).toHaveText(ERSTBIETER);
  await expect.poll(() => summen(page)).toMatchObject(summenAus(ANGEBOT_ERSTER.netto));
  await ohneUeberlauf(page, 'Auftrags-LV');

  // ── Nachtrag anlegen und beauftragen (geführter Weg) ────────────────────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Nachtrag anlegen' }).click();
  const anlegen = page.getByRole('dialog', { name: 'Nachtrag anlegen' });
  await anlegen.getByLabel('Bezeichnung').fill(NACHTRAG.bezeichnung);
  await anlegen.getByRole('button', { name: 'Nachtrag anlegen' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: `Nachtrag N01 – ${NACHTRAG.bezeichnung}` }),
  ).toBeVisible();
  const band = page.getByRole('region', { name: 'Nachtrag', exact: true });
  const naechsterSchritt = band
    .getByRole('list', { name: 'Schritte bis zur Beauftragung' })
    .locator('[aria-current="step"]');
  await expect(naechsterSchritt).toContainText('Leistungen erfassen');
  await neueZeile(page, () => werkzeug(page, 'Einfügen', /^Titel anlegen/));
  await tippe(page, NACHTRAG.titel, 'Enter');
  for (const p of NACHTRAG.positionen) {
    await neueZeile(page, () => page.keyboard.press('Control+Alt+KeyP'));
    await tippe(page, p.kurztext);
    await tippe(page, eingabeDe(p.menge));
    await tippe(page, p.einheit);
  }
  await expect
    .poll(async () => (await zeilen(page)).map((z) => z[1]))
    .toEqual([NACHTRAG.titel, ...NACHTRAG.positionen.map((p) => p.kurztext)]);
  await expect(naechsterSchritt).toContainText('Angebot des Auftragnehmers');
  await ohneUeberlauf(page, 'Nachtrags-LV');

  // Das Angebot des Auftragnehmers: Er füllt das LV des Nachtrags mit seinen Preisen aus. Die Datei entsteht hier aus der
  // Projektdatei (Schaltfläche „Projektdatei sichern“ auf der Übersicht), so wie die Software des Auftragnehmers sie aus
  // der Ausgabe für Bieter erzeugen würde.
  const nachtragsSeite = page.url();
  const nachtragsLvId = decodeURIComponent(new URL(nachtragsSeite).pathname.split('/').at(-1) ?? '');
  await page.getByRole('navigation', { name: 'Pfad' }).getByRole('link', { name: PROJEKT }).click();
  const zwischen = await herunterladen(page, () =>
    page.getByRole('button', { name: 'Projektdatei sichern' }).click(),
  );
  const datei = JSON.parse(readFileSync(await zwischen.path(), 'utf8')) as Projektdatei;
  const nachtragsLv = datei.leistungsverzeichnisse.find(
    (l) => l.leistungsverzeichnis.id === nachtragsLvId,
  ) as LvZustand;
  expect(nachtragsLv).toBeDefined();
  const ep = new Map<string, string>(NACHTRAG.positionen.map((p) => [p.kurztext, p.ep]));
  const mitPreisen: LvZustand = {
    ...nachtragsLv,
    leistungsverzeichnis: {
      ...nachtragsLv.leistungsverzeichnis,
      knoten: nachtragsLv.leistungsverzeichnis.knoten.map((k) =>
        k.art === 'position'
          ? { ...k, einheitspreis: (ep.get(k.kurztext) ?? null) as Einheitspreis | null }
          : k,
      ),
    },
  };
  await ueberLeiste(page, 'Nachträge');
  await page
    .getByRole('link', { name: new RegExp(`N01 – ${NACHTRAG.bezeichnung}`) })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { level: 1, name: `Nachtrag N01 – ${NACHTRAG.bezeichnung}` }),
  ).toBeVisible();
  await dateiWaehlen(
    page,
    () => band.getByRole('button', { name: 'Angebot des Auftragnehmers einlesen' }).click(),
    {
      name: 'Nachtragsangebot.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from(lvAlsExcel(mitPreisen, { mitPreisen: true }).bytes),
    },
  );
  const anAngebot = page.getByRole('dialog', { name: 'Angebot des Auftragnehmers einlesen' });
  await expect(anAngebot.getByLabel('Bieter')).toHaveValue(ERSTBIETER);
  await expect(anAngebot.getByTestId('anzahl-angeboten')).toHaveText('2');
  await anAngebot.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(anAngebot).toBeHidden();
  await expect(naechsterSchritt).toContainText('Status „angeboten“');
  await band.getByRole('button', { name: 'Status „angeboten“ setzen' }).click();
  await expect(band.getByTestId('nachtrag-status')).toHaveText('angeboten');
  await expect(naechsterSchritt).toContainText('Beauftragen');
  await band.getByRole('button', { name: 'Beauftragen' }).click();
  const beauftragen = page.getByRole('dialog', { name: 'Nachtrag N01 beauftragen' });
  await expect(beauftragen.getByTestId('nachtrag-angebot')).toHaveText(`${betragAusCent(NACHTRAG_NETTO)} €`);
  await expect(beauftragen.getByTestId('nachtrag-nachher')).toHaveText(
    `${betragAusCent(AUFTRAG_NACH_NACHTRAG)} €`,
  );
  await beauftragen.getByRole('button', { name: 'Beauftragen', exact: true }).click();
  await expect(beauftragen).toBeHidden();
  await expect(page.getByRole('heading', { level: 1, name: /^Auftrags-LV – / })).toBeVisible();
  await expect.poll(() => summen(page)).toMatchObject(summenAus(AUFTRAG_NACH_NACHTRAG));
  await expect(
    page.getByRole('table', { name: 'Nachträge des Auftrags-LV' }).getByTestId('nachtrag-status'),
  ).toHaveText('beauftragt');

  // ── Aufmaßblatt ────────────────────────────────────────────────────────────────────────────────────────────────────
  await werkzeug(page, 'Abrechnung', 'Aufmaß');
  await expect(page.getByRole('heading', { level: 1, name: /^Aufmaß – / })).toBeVisible();
  await page.getByRole('button', { name: 'Neues Aufmaßblatt' }).click();
  const neuesBlatt = page.getByRole('dialog', { name: 'Neues Aufmaßblatt' });
  await expect(neuesBlatt.getByLabel('Bezeichnung')).toBeFocused();
  await page.keyboard.type('Erdarbeiten und Mauerwerk');
  await neuesBlatt.getByLabel('Datum (TT.MM.JJJJ)').fill('2.11.2026');
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Aufmaßblatt 1 – Erdarbeiten und Mauerwerk' }),
  ).toBeVisible();
  const blatt = page.getByRole('treegrid', { name: 'Positionen des Aufmaßblatts' });
  const zeile = (grid: Locator, oz: string): Locator =>
    grid.locator('[role="row"]', {
      has: grid.page().locator('[data-spalte="oz"] .tx-grid__text', { hasText: new RegExp(`^${oz}$`) }),
    });
  for (const a of AUFMASS) {
    await zeile(blatt, a.oz).locator('[data-spalte="kurztext"]').click();
    await page.keyboard.press('Enter');
    const panel = page.getByRole('dialog', { name: /^Mengenermittlung/ });
    await expect(panel.getByLabel('Ausdruck Zeile 1')).toBeFocused();
    for (const [i, ausdruck] of a.ausdruecke.entries()) {
      if (i > 0) await page.keyboard.press('Enter');
      await page.keyboard.type(ausdruck);
    }
    await expect(panel.locator('[data-wert="summe"]')).toHaveText(a.summe);
    await page.keyboard.press('Control+Enter');
    await expect(panel).toHaveCount(0);
    await expect(zeile(blatt, a.oz).locator('[data-spalte="blattmenge"] .tx-grid__text')).toHaveText(a.summe);
  }
  await ohneUeberlauf(page, 'Aufmaßblatt');
  await werkzeugleiste(page)
    .getByRole('link', { name: 'Soll/Ist' })
    .or(page.getByRole('toolbar').getByRole('link', { name: 'Soll/Ist' }))
    .first()
    .click();
  const sollIst = page.getByRole('treegrid', { name: 'Soll/Ist je Position' });
  await expect(sollIst.locator('.tx-grid__zeile--summe [data-spalte="gpIst"] .tx-grid__text')).toHaveText(
    betragAusCent(AUFMASS_GP),
  );
  await ohneUeberlauf(page, 'Soll/Ist');

  // ── Rechnung mit Skonto prüfen und freigeben, Zahlungsfreigabe als PDF ─────────────────────────────────────────────
  await ueberLeiste(page, 'Rechnungen');
  await page
    .getByRole('region', { name: `Rechnungen zu ${LV_NAME}` })
    .getByRole('link', { name: LV_NAME })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: `Rechnungen – ${LV_NAME}` })).toBeVisible();
  await page
    .getByRole('toolbar', { name: 'Werkzeuge der Rechnungen' })
    .getByRole('button', { name: 'Rechnung anlegen' })
    .click();
  const rechnung = page.getByRole('dialog', { name: 'Rechnung 1 anlegen' });
  await rechnung.getByLabel('Eingangsdatum').fill(RECHNUNG.eingang);
  await rechnung.getByLabel('Rechnungsnummer des Auftragnehmers').fill(RECHNUNG.nummer);
  await expect(rechnung.getByRole('checkbox', { name: /^Blatt 1/ })).toBeChecked();
  await expect(rechnung.getByRole('radio', { name: 'Abschlagsrechnung' })).toBeChecked();
  // Skonto an der Rechnung: Satz und Frist in Kalendertagen (D-72).
  await rechnung.getByLabel('Skontosatz').fill(eingabeDe(RECHNUNG.skontoSatz));
  await rechnung.getByLabel('Skontofrist').fill(RECHNUNG.skontoTage);
  await rechnung.getByRole('button', { name: 'Speichern' }).click();
  await expect(rechnung).toBeHidden();
  await expect(page.getByRole('heading', { level: 1, name: /^Abschlagsrechnung 1 – / })).toBeVisible();
  for (const [schluessel, c] of [
    ['leistung', AUFMASS_GP],
    ['nachlass', 0n],
    ['nettoNachNachlass', AUFMASS_GP],
    ['mwst', RECHNUNG_MWST],
    ['bruttoKumuliert', RECHNUNG_ZAHLBETRAG],
    ['einbehalt', 0n],
    ['zahlbetrag', RECHNUNG_ZAHLBETRAG],
  ] as const)
    await expect(page.getByTestId(`kette-${schluessel}`), schluessel).toHaveText(betragAusCent(c));
  // Beide Fälle (D-72): bei Zahlung bis zum Fristende mit Skonto, danach ohne.
  await expect(page.getByTestId('fall-mit-zahlbetrag')).toHaveText(betragAusCent(RECHNUNG_ZAHLBETRAG));
  await expect(page.getByTestId('fall-mit-skonto')).toHaveText(`−${betragAusCent(SKONTO)}`);
  await expect(page.getByTestId('fall-ohne-skonto')).toHaveText('0,00');
  await expect(page.getByTestId('fall-mit-auszahlung')).toHaveText(AUSZAHLUNG_MIT_SKONTO);
  await expect(page.getByTestId('fall-ohne-auszahlung')).toHaveText(betragAusCent(RECHNUNG_ZAHLBETRAG));
  await expect(page.getByTestId('skonto-satz')).toHaveText(SKONTO_SATZ);
  const erfassen = page.getByRole('button', { name: 'Zahlung erfassen …' });
  await expect(erfassen).toBeDisabled();
  await ohneUeberlauf(page, 'Rechnungsprüfung');
  await aktionen(page).getByRole('button', { name: 'Freigeben', exact: true }).click();
  const freigabe = page.getByRole('dialog', { name: 'Rechnung 1 freigeben' });
  await expect(freigabe).toContainText(`${betragAusCent(RECHNUNG_ZAHLBETRAG)} €`);
  await freigabe.getByRole('button', { name: 'Freigeben', exact: true }).click();
  await expect(page.getByTestId('freigabe')).toHaveText(
    `Freigegeben mit ${betragAusCent(RECHNUNG_ZAHLBETRAG)} €`,
  );
  // Zahlung in der Frist über den Betrag mit Skonto: Skonto verwirklicht, nichts mehr offen.
  await erfassen.click();
  const zahlung = page.getByRole('dialog', { name: 'Zahlung erfassen' });
  await zahlung.getByLabel('Zahlungsdatum').fill(RECHNUNG.zahlungAm);
  await zahlung.getByLabel('Gezahlter Betrag').fill(AUSZAHLUNG_MIT_SKONTO);
  await zahlung.getByLabel('Gezahlter Betrag').press('Enter');
  await expect(zahlung).toBeHidden();
  const geltend = page.getByRole('table', { name: 'Geltender Fall' });
  await expect(geltend.getByRole('row', { name: /^Skonto \(verwirklicht\)/ })).toBeVisible();
  await expect(page.getByTestId('zahlung-skonto')).toHaveText(`−${betragAusCent(SKONTO)}`);
  await expect(page.getByTestId('zahlung-auszahlung')).toHaveText(AUSZAHLUNG_MIT_SKONTO);
  await expect(page.getByTestId('zahlung-summeZahlungen')).toHaveText(`−${AUSZAHLUNG_MIT_SKONTO}`);
  await expect(page.getByTestId('zahlung-offen')).toHaveText('0,00');
  await ohneUeberlauf(page, 'Rechnungsprüfung mit Zahlung');

  // Rechnungsprüfung mit Zahlungsfreigabe als PDF (Vorschau im Dialog); der Name steht im Dialog (D-158.6).
  const freigabeText = await pdfErzeugen(
    page,
    async () => {
      await aktionen(page).getByRole('button', { name: 'Ausgabe', exact: true }).click();
      await page.getByRole('menu').getByRole('menuitem', { name: 'Rechnungsprüfung als PDF …' }).click();
    },
    'Rechnungsprüfung als PDF',
    'Herunterladen',
    async (dialog) => {
      await expect(dialog.getByTestId('pdf-dateiname')).toHaveText(/^Rechnungsprüfung 1 .+\.pdf$/);
      await dialog.getByRole('button', { name: 'Vorschau erzeugen' }).click();
      await expect(dialog.locator('iframe[title="Vorschau des PDF"]')).toBeVisible({ timeout: 60_000 });
    },
  );
  expect(freigabeText).toContain('Zahlungsfreigabe');
  expect(freigabeText).toContain(PROJEKT);
  expect(freigabeText).toContain(SKONTO_SATZ);
  expect(freigabeText).toContain('Skonto (verwirklicht)');
  expect(freigabeText).toContain('Offen 0,00 €');

  // ── Kostenkontrolle ─────────────────────────────────────────────────────────────────────────────────────────────
  await ueberLeiste(page, 'Kosten');
  await page
    .getByRole('toolbar', { name: 'Werkzeuge der Kostenseite' })
    .getByRole('link', { name: 'Kostenkontrolle' })
    .click();
  const kontrolle = page.getByRole('treegrid', { name: 'Kostenkontrolle' });
  await expect(kontrolle.getByRole('row', { name: /^Gesamt / })).toContainText(
    betragAusCent(AUFTRAG_NACH_NACHTRAG),
  );
  await expect(kontrolle.getByRole('row', { name: /^Gesamt / })).toContainText(betragAusCent(AUFMASS_GP));
  await ohneUeberlauf(page, 'Kostenkontrolle');
  // Kostenkontrolle als PDF, mit Vorschau im Dialog.
  const kontrollText = await pdfErzeugen(
    page,
    () => werkzeug(page, 'Ausgabe', 'Als PDF'),
    'Kostenkontrolle ausgeben',
    'PDF herunterladen',
    async (dialog) => {
      await expect(dialog.getByTestId('kosten-vorschau').getByRole('row', { name: /^Gesamt/ })).toContainText(
        betragAusCent(AUFTRAG_NACH_NACHTRAG),
      );
    },
  );
  expect(kontrollText).toContain('Kostenkontrolle');
  expect(kontrollText).toContain(betragAusCent(AUFTRAG_NACH_NACHTRAG));
  expect(kontrollText).toContain(betragAusCent(AUFMASS_GP));

  // ── Projektdatei sichern ─────────────────────────────────────────────────────────────────────────────────────────
  await page.getByRole('navigation', { name: 'Pfad' }).getByRole('link', { name: PROJEKT }).click();
  const vorher = await werteLesen(page);
  const sicherung = await herunterladen(page, () =>
    page.getByRole('button', { name: 'Projektdatei sichern' }).click(),
  );
  const sicherungsDatei = {
    name: sicherung.suggestedFilename(),
    mimeType: 'application/json',
    buffer: readFileSync(await sicherung.path()),
  };
  await expect(page.getByRole('contentinfo', { name: 'Statuszeile' })).toContainText('Letzte Sicherung');

  // ── Projekt löschen: „Projekt samt Inhalt löschen“ (D-96) ───────────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Weitere Aktionen' }).click();
  await page.getByRole('menuitem', { name: 'Projekt löschen' }).click();
  const frage = page.getByRole('dialog', { name: 'Projekt löschen' });
  const inhalt = frage.getByRole('list', { name: 'Inhalt des Projekts' });
  // Je Art die Anzahl: LV und Nachtrags-LV, zwei Angebote und das des Auftragnehmers zum Nachtrag, …
  for (const art of ['2 LVs', '3 Angebote', '1 Auftrags-LV', '1 Aufmaßblatt', '1 Rechnung'])
    await expect(inhalt.getByRole('listitem').filter({ hasText: new RegExp(`^${art}$`) })).toHaveCount(1);
  await frage.getByRole('button', { name: 'Projekt samt Inhalt löschen …' }).click();
  const loeschen = page.getByRole('dialog', { name: 'Projekt samt Inhalt löschen' });
  // Zuerst die Sicherung (sie hat den Fokus); gesichert ist schon, gelöscht wird erst nach der Bestätigung.
  await expect(loeschen.getByRole('button', { name: 'Projektdatei sichern' })).toBeFocused();
  const endgueltig = loeschen.getByRole('button', { name: 'Projekt samt Inhalt löschen', exact: true });
  await expect(endgueltig).toBeDisabled();
  await loeschen
    .getByRole('checkbox', { name: `Ja, das Projekt „${PROJEKT}“ mit allem Inhalt löschen` })
    .check();
  await endgueltig.click();
  await expect(page.getByRole('heading', { level: 1, name: 'Projekte' })).toBeVisible();
  const projektVerweis = page.getByRole('list', { name: 'Projekte' }).getByRole('link', { name: PROJEKT });
  await expect(projektVerweis).toHaveCount(0);
  // Rückgängig holt das Projekt in der Sitzung zurück, Wiederholen löscht es wieder (D-96, Q5).
  await page.keyboard.press('Control+z');
  await expect(projektVerweis).toBeVisible();
  await page.keyboard.press('Control+y');
  await expect(projektVerweis).toHaveCount(0);

  // ── Sicherung einlesen → dieselben Werte ──────────────────────────────────────────────────────────────────────────
  await dateiWaehlen(page, () => sichtbarerKnopf(page, 'Projektdatei einlesen').click(), sicherungsDatei);
  await projektdateiEingelesenSchliessen(page);
  await page.getByRole('list', { name: 'Projekte' }).getByRole('link', { name: PROJEKT }).click();
  expect(await werteLesen(page)).toEqual(vorher);
}

test('Tor E: Umsteiger vom ersten Start bis zur eingelesenen Sicherung, bei 1280 × 800', async ({ page }) => {
  test.setTimeout(300_000);
  await torweg(page);
});
