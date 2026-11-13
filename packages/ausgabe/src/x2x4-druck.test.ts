// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests der Ausgaben X2 bis X4 (Ticket 113): je Ausgabe das Modell (fertig formatierte Texte, nichts gerechnet) und der Text
// des PDF, dazu Gleichheit der Bytes bei gleicher Eingabe (ADR 0012). Die Zahlen stammen aus der Eingabe, nicht aus einer
// Rechnung im Test.

import { describe, expect, it } from 'vitest';
import {
  DIN276_HINWEIS,
  baueBautagebuchModell,
  baueBauzeitenplanModell,
  baueHonorarModell,
  baueMaengelanzeigeModell,
  baueMaengellisteModell,
  erzeugeBautagebuchPdf,
  erzeugeBauzeitenplanPdf,
  erzeugeBerichtPdf,
  erzeugeHonorarPdf,
  erzeugeMaengelanzeigePdf,
  erzeugeMaengellistePdf,
} from './index';
import type { Berichtsmodell } from './index';
import { alsText, liesPdf } from './pdftext';
import { schriftenAusDateien } from './schriften-node';
import * as fx from './testhilfe/x2x4';

const schriften = schriftenAusDateien();
const normal = (t: string): string => t.replace(/\s+/g, ' ').trim();
const text = async (bytes: Promise<Uint8Array>): Promise<string> =>
  normal(alsText(await liesPdf(await bytes)));
const modellText = (m: Berichtsmodell): string => JSON.stringify(m);
/** Eine Kennung der App (UUID, A7): Sie gehört nie in einen Druck (L1). */
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
/**
 * Eine Zahl in kanonischer Form mit Dezimalpunkt, wie Beträge (2 Stellen), Prozente (2) und Mengen (3) in den Paketen stehen
 * (`40.00`), nicht der Tausenderpunkt der de-DE-Form (`1.000,00`) und kein Datum (N4). Nummern wie `1.2` sind keine Zahl.
 */
const KANONISCHE_ZAHL = /(?<![\d.])\d+\.\d{2,3}(?![\d.,])/;

const maengelEingabe = {
  projekt: 'Wohnhaus Testweg (erfunden)',
  maengel: fx.maengel,
  befunde: [fx.befundUeberfaellig],
  auftragnehmer: fx.AUFTRAGNEHMER,
  datum: '2026-12-07',
};

describe('Mängelliste', () => {
  it('Modell: nach Nummer sortiert, Status aus dem letzten Verlaufseintrag, überfällig aus den Befunden', () => {
    const m = baueMaengellisteModell(maengelEingabe);
    const tabelle = m.abschnitte.flatMap((a) => a.bloecke).find((b) => b.art === 'tabelle');
    if (tabelle?.art !== 'tabelle') throw new Error('keine Tabelle');
    expect(tabelle.zeilen.map((z) => z.zellen[0])).toEqual(['1', '2', '3']);
    const [z1, z2, z3] = tabelle.zeilen;
    expect(z1?.zellen).toContain('angezeigt seit 21.11.2026');
    expect(z1?.kleinerText).toBe('überfällig');
    expect(z2?.zellen).toContain('offen seit 02.12.2026');
    expect(z2?.kleinerText).toBeUndefined();
    expect(z3?.zellen).toContain('–'); // keine Frist
  });

  it('PDF: Nummer, Titel, Ort, Auftragnehmer, festgestellt, Frist, Status und Kennzeichen stehen im Text', async () => {
    const t = await text(erzeugeMaengellistePdf(maengelEingabe, schriften));
    for (const s of [
      'Mängelliste',
      'Wohnhaus Testweg (erfunden)',
      'Putzriss Außenwand',
      'EG, Nordwand',
      'Muster Bau GmbH (erfunden)',
      'Elektro Beispiel (erfunden)',
      '20.11.2026',
      '04.12.2026',
      'angezeigt seit 21.11.2026',
      'offen seit 02.12.2026',
      'überfällig',
      'Tür schleift',
      'Steckdose fehlt',
    ])
      expect(t, s).toContain(s);
    expect(t.match(/überfällig/g)?.length).toBe(1);
  });

  it('gefiltert: die Filterbezeichnung steht im Kopf, nur die übergebenen Mängel stehen im Druck', async () => {
    const t = await text(
      erzeugeMaengellistePdf(
        { ...maengelEingabe, maengel: [fx.mangel3], filter: 'Auftragnehmer: Elektro Beispiel (erfunden)' },
        schriften,
      ),
    );
    expect(t).toContain('Filter');
    expect(t).toContain('Steckdose fehlt');
    expect(t).not.toContain('Putzriss');
  });

  it('nur der Befund „Frist überschritten“ heißt überfällig, nicht „angezeigt ohne Frist“ (Ticket 122, PB6)', () => {
    const m = baueMaengellisteModell({
      ...maengelEingabe,
      befunde: [{ ...fx.befundUeberfaellig, code: 'mangel-angezeigt-ohne-frist' }],
    });
    const tabelle = m.abschnitte.flatMap((a) => a.bloecke).find((b) => b.art === 'tabelle');
    if (tabelle?.art !== 'tabelle') throw new Error('keine Tabelle');
    expect(tabelle.zeilen.map((z) => z.kleinerText)).toEqual([undefined, undefined, undefined]);
  });

  it('eine leere Liste sagt es', async () => {
    const t = await text(erzeugeMaengellistePdf({ ...maengelEingabe, maengel: [], befunde: [] }, schriften));
    expect(t).toContain('Keine Mängel');
  });

  it('gleiche Eingabe, gleiche Bytes', async () => {
    const a = await erzeugeMaengellistePdf(maengelEingabe, schriften);
    const b = await erzeugeMaengellistePdf(maengelEingabe, schriften);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });
});

describe('Mängelanzeige', () => {
  const eingabe = {
    projekt: 'Wohnhaus Testweg (erfunden)',
    auftragnehmer: 'Muster Bau GmbH (erfunden)',
    maengel: [fx.mangel1, fx.mangel2],
    datum: '2026-11-24',
  };

  it('Modell: die Frist kommt aus dem Verlaufseintrag „angezeigt“, mit dessen Datum', () => {
    const m = baueMaengelanzeigeModell(eingabe);
    const tabelle = m.abschnitte.flatMap((a) => a.bloecke).find((b) => b.art === 'tabelle');
    if (tabelle?.art !== 'tabelle') throw new Error('keine Tabelle');
    expect(tabelle.zeilen[0]?.zellen).toContain('04.12.2026');
    expect(tabelle.zeilen[0]?.zellen).toContain('21.11.2026');
    // Mangel 2: später wieder geöffnet; die Frist der Anzeige bleibt im Verlauf und wird gedruckt.
    expect(tabelle.zeilen[1]?.zellen).toContain('11.12.2026');
  });

  it('ohne Frist im Verlaufseintrag gilt die Frist am Mangel, ohne beide steht ein Strich', () => {
    const alt = {
      ...fx.mangel1,
      verlauf: [
        { status: 'offen' as const, datum: '2026-11-20', bemerkung: null },
        { status: 'angezeigt' as const, datum: '2026-11-21', bemerkung: null },
      ],
    };
    const ohne = { ...alt, frist: null };
    const m = baueMaengelanzeigeModell({ ...eingabe, maengel: [alt, ohne] });
    const tabelle = m.abschnitte.flatMap((a) => a.bloecke).find((b) => b.art === 'tabelle');
    if (tabelle?.art !== 'tabelle') throw new Error('keine Tabelle');
    expect(tabelle.zeilen[0]?.zellen).toContain('04.12.2026');
    expect(tabelle.zeilen[1]?.zellen).not.toContain('04.12.2026');
    expect(tabelle.zeilen[1]?.zellen).toContain('–');
  });

  it('PDF: Auftragnehmer, Anzeigetext, Mängel mit Beschreibung und Frist', async () => {
    const t = await text(erzeugeMaengelanzeigePdf(eingabe, schriften));
    for (const s of [
      'Mängelanzeige',
      'Muster Bau GmbH (erfunden)',
      'beseitigen',
      'Putzriss Außenwand',
      'Horizontaler Riss über dem Fenster',
      '04.12.2026',
      'Tür schleift',
      '11.12.2026',
    ])
      expect(t, s).toContain(s);
    expect(t).not.toContain('Steckdose');
  });
});

describe('Bautagebuch', () => {
  const eingabe = {
    projekt: 'Wohnhaus Testweg (erfunden)',
    eintraege: [fx.eintragAusserhalb, fx.eintrag2, fx.eintrag1],
    von: '2026-11-23',
    bis: '2026-11-30',
    datum: '2026-12-01',
  };

  it('Modell: nur der Zeitraum, nach Datum', () => {
    const m = baueBautagebuchModell(eingabe);
    expect(m.abschnitte.map((a) => a.ueberschrift)).toEqual(['23.11.2026', '24.11.2026']);
    expect(modellText(m)).not.toContain('15.12.2026');
  });

  it('PDF: je Tag Wetter, Arbeitskräfte je Firma, Geräte, Leistungen, Behinderungen, Vorkommnisse', async () => {
    const t = await text(erzeugeBautagebuchPdf(eingabe, schriften));
    for (const s of [
      'Bautagebuch',
      '23.11.2026 bis 30.11.2026',
      'bedeckt, trocken',
      '−2 bis 6 °C',
      'Muster Bau GmbH (erfunden)',
      'Elektro Beispiel (erfunden)',
      'Turmdrehkran, Minibagger',
      'Mauerwerk EG Achse 1–3',
      'Besuch der Bauherrin',
      'Frost, Mauerarbeiten ab 11 Uhr eingestellt',
      'höchstens 3 °C',
    ])
      expect(t, s).toContain(s);
    expect(t).not.toContain('15.12.2026');
  });

  it('ein leerer Zeitraum sagt es', async () => {
    const t = await text(erzeugeBautagebuchPdf({ ...eingabe, eintraege: [] }, schriften));
    expect(t).toContain('Keine Einträge');
  });

  it('gleiche Eingabe, gleiche Bytes', async () => {
    const a = await erzeugeBautagebuchPdf(eingabe, schriften);
    const b = await erzeugeBautagebuchPdf(eingabe, schriften);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });
});

describe('Honorarberechnung', () => {
  const eingabe = {
    berechnung: fx.honorarberechnung,
    ergebnis: fx.honorarergebnis,
    befundtexte: fx.honorarBefundtexte,
    projekt: 'Wohnhaus Testweg (erfunden)',
    datum: '2026-12-01',
  };

  it('PDF: Herleitung, Tafelwerte, Honorar, Phasen, Umbauzuschlag, Summen, Befunde und der feste Hinweis', async () => {
    const t = await text(erzeugeHonorarPdf(eingabe, schriften));
    for (const s of [
      'Honorarberechnung',
      'Architekt, LPH 1–9 (erfunden)',
      'Umbau Wohnhaus',
      'Gebäude',
      'III',
      '50,00 %',
      // Herleitung
      '612.345,67',
      '630.345,67',
      '201.234,56',
      '157.586,42',
      '21.824,07',
      '10.000,00',
      '819.756,16',
      // Tafelwerte und Spanne
      '750.000,00',
      '1.000.000,00',
      '89.927,00',
      '112.156,00',
      '115.675,00',
      '144.268,00',
      '97.111,33',
      '121.116,04',
      '109.113,69',
      // Phasen
      'Grundlagenermittlung',
      'Entwurfsplanung',
      '16.367,05',
      '15,00 %',
      // Umbauzuschlag
      '20,00 %',
      '21.822,74',
      // Summen
      '6.546,82',
      '137.483,24',
      '26.121,82',
      '163.605,06',
      'Nebenkosten',
      '5,00 %',
      '19,00 %',
      // Befund
      'Warnung (Objekt 1, Umbauzuschlag): Der Umbauzuschlag von 40,00 % liegt über 33,00 %',
    ])
      expect(t, s).toContain(s);
    expect(t).toContain(normal(DIN276_HINWEIS));
    // Ticket 122 (PB9): genau der Hinweis aus D-56/D-66 (§ 4 Abs. 1 verweist auf DIN 276:2008-12), nichts darüber hinaus.
    expect(DIN276_HINWEIS).toBe(
      'Hinweis: § 4 Abs. 1 HOAI verweist für die anrechenbaren Kosten auf DIN 276 in der Fassung DIN 276:2008-12.',
    );
    expect(t).not.toContain('gegliedert');
  });

  it('Befunde: gedruckt werden die Texte der Seite, nie die Meldungen der Rechnung (kein UUID, keine kanonische Zahl)', async () => {
    const t = await text(erzeugeHonorarPdf(eingabe, schriften));
    for (const b of fx.honorarBefundtexte) expect(t, b.text).toContain(normal(b.text));
    expect(t).toContain('Fehler (Objekt 1, Anrechenbare Kosten): Die gewählte Kostenermittlung');
    for (const b of fx.honorarergebnis.befunde) expect(t, b.meldung).not.toContain(b.meldung);
    expect(fx.honorarergebnis.befunde.map((b) => b.meldung).join(' ')).toMatch(UUID);
    expect(fx.honorarergebnis.befunde.map((b) => b.meldung).join(' ')).toMatch(KANONISCHE_ZAHL);
    expect(t).not.toMatch(UUID);
    expect(t).not.toMatch(KANONISCHE_ZAHL);
  });

  it('ohne Befunde steht kein Befundabschnitt, der Hinweis bleibt', () => {
    const m = baueHonorarModell({ ...eingabe, befundtexte: [] });
    expect(m.abschnitte.map((a) => a.ueberschrift)).not.toContain('Befunde');
    expect(modellText(m)).toContain('DIN 276:2008-12');
  });

  it('ein Objekt ohne Honorar (Befund) druckt keine erfundene Zahl', () => {
    const o = fx.honorarergebnis.objekte[0];
    if (o === undefined) throw new Error('kein Objekt');
    const m = baueHonorarModell({
      ...eingabe,
      ergebnis: {
        ...fx.honorarergebnis,
        objekte: [
          { ...o, anrechenbareKosten: null, herleitung: null, tafel: null, honorar: null, phasen: [] },
        ],
      },
    });
    const t = modellText(m);
    expect(t).not.toContain('109.113,69');
    expect(t).toContain('nicht berechnet');
  });

  it('gleiche Eingabe, gleiche Bytes', async () => {
    const a = await erzeugeHonorarPdf(eingabe, schriften);
    const b = await erzeugeHonorarPdf(eingabe, schriften);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });
});

describe('Bauzeitenplan', () => {
  const eingabe = {
    plan: fx.bauzeitenplan,
    ergebnis: fx.bauzeitenergebnis,
    befundtexte: fx.bauzeitBefundtexte,
    datum: '2026-12-01',
  };

  it('Modell: Zeilen in Planreihenfolge, Kinder eingerückt, Meilenstein und Sammelvorgang gekennzeichnet', () => {
    const m = baueBauzeitenplanModell(eingabe);
    const tabelle = m.abschnitte.flatMap((a) => a.bloecke).find((b) => b.art === 'tabelle');
    if (tabelle?.art !== 'tabelle') throw new Error('keine Tabelle');
    expect(tabelle.zeilen.map((z) => z.einrueckung ?? 0)).toEqual([0, 1, 1, 1]);
    expect(tabelle.zeilen[0]?.fett).toBe(true);
    expect(tabelle.zeilen[3]?.zellen).toContain('Meilenstein');
    expect(tabelle.zeilen[1]?.zellen).toEqual([
      '1.1',
      'Erdarbeiten',
      '5',
      '16.11.2026',
      '20.11.2026',
      '0',
      'ja',
    ]);
  });

  it('PDF: Tabelle, Projektende, kritischer Weg und Befunde', async () => {
    const t = await text(erzeugeBauzeitenplanPdf(eingabe, schriften));
    for (const s of [
      'Bauzeitenplan',
      'Rohbau (erfunden)',
      'Projektbeginn',
      '16.11.2026',
      'Projektende',
      '07.12.2026',
      'Erdarbeiten',
      'Mauerwerk EG',
      '23.11.2026',
      '04.12.2026',
      'Rohbau fertig',
      'Meilenstein',
      'Kritischer Weg',
      '1.1 Erdarbeiten',
      'Warnung (Rohbau fertig): Anordnungsbeziehung mit 1 Rohbau',
    ])
      expect(t, s).toContain(s);
  });

  it('Befunde: gedruckt werden die Texte der Planseite, nie die Meldungen der Rechnung (kein UUID, keine kanonische Zahl)', async () => {
    const t = await text(erzeugeBauzeitenplanPdf(eingabe, schriften));
    for (const b of fx.bauzeitBefundtexte) expect(t, b.text).toContain(normal(b.text));
    expect(t).toContain('Warnung (1.2 Mauerwerk EG): Ist-Termine oder Fortschritt sind ungültig');
    for (const b of fx.bauzeitenergebnis.befunde) expect(t, b.meldung).not.toContain(b.meldung);
    expect(fx.bauzeitenergebnis.befunde.map((b) => b.meldung).join(' ')).toMatch(UUID);
    expect(fx.bauzeitenergebnis.befunde.map((b) => b.meldung).join(' ')).toMatch(KANONISCHE_ZAHL);
    expect(t).not.toMatch(UUID);
    expect(t).not.toMatch(KANONISCHE_ZAHL);
  });

  it('ohne Befunde steht kein Befundabschnitt', () => {
    const m = baueBauzeitenplanModell({ ...eingabe, befundtexte: [] });
    expect(m.abschnitte.map((a) => a.ueberschrift)).not.toContain('Befunde');
  });

  it('ein Vorgang ohne Termine (Rechnung abgebrochen) steht mit Strichen da', () => {
    const m = baueBauzeitenplanModell({
      ...eingabe,
      ergebnis: { ...fx.bauzeitenergebnis, projektende: null, vorgaenge: [], kritischeWege: [] },
    });
    const tabelle = m.abschnitte.flatMap((a) => a.bloecke).find((b) => b.art === 'tabelle');
    if (tabelle?.art !== 'tabelle') throw new Error('keine Tabelle');
    expect(tabelle.zeilen).toHaveLength(4);
    expect(tabelle.zeilen[1]?.zellen).toEqual(['1.1', 'Erdarbeiten', '5', '–', '–', '–', '–']);
  });

  it('gleiche Eingabe, gleiche Bytes', async () => {
    const a = await erzeugeBauzeitenplanPdf(eingabe, schriften);
    const b = await erzeugeBauzeitenplanPdf(eingabe, schriften);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });
});

describe('Renderer', () => {
  it('erzeugt aus einem Modell ein PDF mit Titel und Seitenzahl', async () => {
    const m: Berichtsmodell = {
      titel: 'Probe',
      kopf: [],
      datum: '01.12.2026',
      erstellt: '2026-12-01',
      abschnitte: [{ ueberschrift: 'A', bloecke: [{ art: 'absatz', text: 'Hallo' }] }],
    };
    const t = await text(erzeugeBerichtPdf(m, schriften));
    expect(t).toContain('Probe');
    expect(t).toContain('Seite 1 von 1');
  });
});
