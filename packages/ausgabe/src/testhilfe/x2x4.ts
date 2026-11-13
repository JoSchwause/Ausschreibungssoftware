// SPDX-License-Identifier: AGPL-3.0-or-later
// Erfundene Eingaben für die Tests der Ausgaben X2 bis X4 (Ticket 113), nur für Tests. Die Zahlen des Honorarergebnisses
// entsprechen dem Beispiel in `vertrag` (Golden-Fall 1 aus Ticket 101, mit `honorarBerechnen` gerechnet); sie werden hier
// nicht neu gerechnet (A2). Die Befunde tragen Meldungen in der Form, wie `honorarBerechnen` und `bauzeitenplanBerechnen` sie
// liefern (kanonische Zahlen mit Dezimalpunkt, Kennungen der Vorgänge und Kostenermittlungen); gedruckt werden dagegen die
// Befundtexte, die die App für ihre Seite bildet und in die Druckeingabe reicht (Ticket 122, D-122.1).

import type { Befundtext } from '../bericht';
import type {
  AuftragsLeistungsverzeichnisId,
  Bautagebucheintrag,
  BautagebucheintragId,
  Betrag,
  Bauzeitenplan,
  Bauzeitenplanergebnis,
  Honorarberechnung,
  HonorarberechnungId,
  Honorarergebnis,
  KostenermittlungId,
  Mangel,
  MangelId,
  Pruefbefund,
  ProjektId,
  Prozent,
  VorgangId,
} from '@tethys/vertrag';

const projektId = 'p-1' as ProjektId;
/** Kennungen in der Form der App (UUIDv7, A7), damit ein Test sieht, dass keine im Druck steht. */
const KOSTENERMITTLUNG_ID = '019b5f2e-8c1a-7d3e-9f40-1a2b3c4d5e6f' as KostenermittlungId;
const btr = (s: string): Betrag => s as Betrag;
const pz = (s: string): Prozent => s as Prozent;

export const AN_MUSTER = 'lv-muster' as AuftragsLeistungsverzeichnisId;
export const AN_ANDERER = 'lv-anderer' as AuftragsLeistungsverzeichnisId;
export const AUFTRAGNEHMER: Readonly<Record<string, string>> = {
  [AN_MUSTER]: 'Muster Bau GmbH (erfunden)',
  [AN_ANDERER]: 'Elektro Beispiel (erfunden)',
};

export const mangel1: Mangel = {
  id: 'm-1' as MangelId,
  projektId,
  nummer: 1,
  titel: 'Putzriss Außenwand',
  beschreibung: 'Horizontaler Riss über dem Fenster, etwa 40 cm lang.',
  ort: 'EG, Nordwand',
  auftragsLvId: AN_MUSTER,
  positionId: null,
  bauteil: null,
  festgestellt: '2026-11-20',
  frist: '2026-12-04',
  verlauf: [
    { status: 'offen', datum: '2026-11-20', bemerkung: null },
    { status: 'angezeigt', datum: '2026-11-21', bemerkung: 'Mängelanzeige per Brief', frist: '2026-12-04' },
  ],
};

export const mangel2: Mangel = {
  id: 'm-2' as MangelId,
  projektId,
  nummer: 2,
  titel: 'Tür schleift',
  beschreibung: null,
  ort: 'OG, Flur',
  auftragsLvId: AN_MUSTER,
  positionId: null,
  bauteil: null,
  festgestellt: '2026-11-23',
  frist: '2026-12-11',
  verlauf: [
    { status: 'offen', datum: '2026-11-23', bemerkung: null },
    { status: 'angezeigt', datum: '2026-11-24', bemerkung: null, frist: '2026-12-11' },
    { status: 'beseitigt', datum: '2026-12-01', bemerkung: 'Meldung des Auftragnehmers' },
    { status: 'offen', datum: '2026-12-02', bemerkung: 'Schleift weiter' },
  ],
};

export const mangel3: Mangel = {
  id: 'm-3' as MangelId,
  projektId,
  nummer: 3,
  titel: 'Steckdose fehlt',
  beschreibung: 'Laut Plan zwei, eingebaut eine.',
  ort: null,
  auftragsLvId: AN_ANDERER,
  positionId: null,
  bauteil: null,
  festgestellt: '2026-11-25',
  frist: null,
  verlauf: [{ status: 'offen', datum: '2026-11-25', bemerkung: null }],
};

export const maengel: readonly Mangel[] = [mangel3, mangel1, mangel2];

export const befundUeberfaellig: Pruefbefund = {
  schwere: 'warnung',
  quelle: 'fristpruefung',
  code: 'mangel-frist-ueberschritten',
  meldung: 'Mangel 1: Frist 2026-12-04 zum Stichtag 2026-12-07 überschritten.',
  ort: { mangelId: mangel1.id, feld: 'frist' },
};

export const eintrag1: Bautagebucheintrag = {
  id: 'b-1' as BautagebucheintragId,
  projektId,
  datum: '2026-11-23',
  wetter: { beschreibung: 'bedeckt, trocken', temperaturMin: -2, temperaturMax: 6 },
  arbeitskraefte: [
    { firma: 'Muster Bau GmbH (erfunden)', anzahl: 6 },
    { firma: 'Elektro Beispiel (erfunden)', anzahl: 2 },
  ],
  geraete: 'Turmdrehkran, Minibagger',
  leistungen: 'Mauerwerk EG Achse 1–3',
  behinderungen: null,
  vorkommnisse: 'Besuch der Bauherrin',
};

export const eintrag2: Bautagebucheintrag = {
  id: 'b-2' as BautagebucheintragId,
  projektId,
  datum: '2026-11-24',
  wetter: { beschreibung: null, temperaturMin: null, temperaturMax: 3 },
  arbeitskraefte: [],
  geraete: null,
  leistungen: null,
  behinderungen: 'Frost, Mauerarbeiten ab 11 Uhr eingestellt',
  vorkommnisse: null,
};

export const eintragAusserhalb: Bautagebucheintrag = {
  ...eintrag1,
  id: 'b-3' as BautagebucheintragId,
  datum: '2026-12-15',
};

export const honorarberechnung: Honorarberechnung = {
  id: 'h-1' as HonorarberechnungId,
  projektId,
  name: 'Architekt, LPH 1–9 (erfunden)',
  objekte: [
    {
      bezeichnung: 'Umbau Wohnhaus',
      leistungsbild: 'gebaeude',
      honorarzone: 'III',
      honorarsatz: pz('50.00'),
      anrechenbareKosten: {
        art: 'kostenermittlung',
        kostenermittlungId: KOSTENERMITTLUNG_ID,
        technischeAnlagenAnteilig: true,
        weitereKosten: btr('18000.00'),
        mitzuverarbeitendeBausubstanz: btr('10000.00'),
      },
      leistungsphasen: [{ nummer: 1 }, { nummer: 2 }, { nummer: 3 }],
      umbauzuschlagssatz: pz('20.00'),
    },
  ],
  nebenkosten: { art: 'prozent', satz: pz('5.00') },
  mwstSatz: pz('19.00'),
};

const spannen = (...z: readonly [string, string, string, string, string, string]) => ({
  I: { von: btr(z[0]), bis: btr(z[1]) },
  II: { von: btr(z[1]), bis: btr(z[2]) },
  III: { von: btr(z[2]), bis: btr(z[3]) },
  IV: { von: btr(z[3]), bis: btr(z[4]) },
  V: { von: btr(z[4]), bis: btr(z[5]) },
});

export const honorarergebnis: Honorarergebnis = {
  objekte: [
    {
      bezeichnung: 'Umbau Wohnhaus',
      leistungsbild: 'gebaeude',
      honorarzone: 'III',
      anrechenbareKosten: btr('819756.16'),
      herleitung: {
        kg300: btr('612345.67'),
        weitereKosten: btr('18000.00'),
        sonstigeAnrechenbareKosten: btr('630345.67'),
        kg400: btr('201234.56'),
        grenzeTechnischeAnlagen: btr('157586.42'),
        kg400Voll: btr('157586.42'),
        kg400Haelfte: btr('21824.07'),
        mitzuverarbeitendeBausubstanz: btr('10000.00'),
        anrechenbareKosten: btr('819756.16'),
      },
      tafel: {
        zeileUnten: {
          anrechenbareKosten: btr('750000.00'),
          spannen: spannen('64666.00', '75781.00', '89927.00', '112156.00', '126301.00', '137416.00'),
        },
        zeileOben: {
          anrechenbareKosten: btr('1000000.00'),
          spannen: spannen('83182.00', '97479.00', '115675.00', '144268.00', '162464.00', '176761.00'),
        },
        spanne: { von: btr('97111.33'), bis: btr('121116.04') },
      },
      honorar: btr('109113.69'),
      phasen: [
        { nummer: 1, name: 'Grundlagenermittlung', anteil: pz('2.00'), betrag: btr('2182.27') },
        { nummer: 2, name: 'Vorplanung', anteil: pz('7.00'), betrag: btr('7637.96') },
        { nummer: 3, name: 'Entwurfsplanung', anteil: pz('15.00'), betrag: btr('16367.05') },
      ],
      grundhonorar: btr('109113.68'),
      umbauzuschlag: btr('21822.74'),
    },
  ],
  grundhonorar: btr('109113.68'),
  umbauzuschlaege: btr('21822.74'),
  nebenkosten: btr('6546.82'),
  netto: btr('137483.24'),
  mwst: btr('26121.82'),
  brutto: btr('163605.06'),
  befunde: [
    {
      schwere: 'warnung',
      quelle: 'honorarberechnung',
      code: 'umbauzuschlag-ueber-grenze',
      meldung: 'Umbauzuschlag 40.00 % über 33.00 % (§ 36 Abs. 1)',
      ort: { pfad: '/objekte[1]', feld: 'umbauzuschlagssatz' },
    },
    {
      schwere: 'fehler',
      quelle: 'honorarberechnung',
      code: 'kostenermittlung-unbekannt',
      meldung: `Kostenermittlung ${KOSTENERMITTLUNG_ID} wurde nicht übergeben; kein Honorar`,
      ort: { pfad: '/objekte[1]', feld: 'anrechenbareKosten' },
    },
  ],
};

/** Die Befunde des Honorarergebnisses, wie die Honorarseite sie zeigt (Ort und Text fertig formatiert). */
export const honorarBefundtexte: readonly Befundtext[] = [
  {
    schwere: 'warnung',
    ort: 'Objekt 1, Umbauzuschlag',
    text: 'Der Umbauzuschlag von 40,00 % liegt über 33,00 % (§ 36 Abs. 1 HOAI); gerechnet wird mit dem eingegebenen Satz.',
  },
  {
    schwere: 'fehler',
    ort: 'Objekt 1, Anrechenbare Kosten',
    text: 'Die gewählte Kostenermittlung gibt es im Projekt nicht (mehr). Für dieses Objekt entsteht kein Honorar.',
  },
];

const v = (s: string): VorgangId => s as VorgangId;
export const V_ROHBAU = v('019b5f30-0000-7000-8000-000000000001');
export const V_ERD = v('019b5f30-0000-7000-8000-000000000002');
export const V_MAUER = v('019b5f30-0000-7000-8000-000000000003');
export const V_FERTIG = v('019b5f30-0000-7000-8000-000000000004');

export const bauzeitenplan: Bauzeitenplan = {
  id: 'z-1' as Bauzeitenplan['id'],
  projektId,
  name: 'Rohbau (erfunden)',
  projektbeginn: '2026-11-16',
  kalender: { arbeitstage: [1, 2, 3, 4, 5], bundesland: 'BY', freieTage: [] },
  vorgaenge: [
    {
      id: V_ROHBAU,
      nummer: '1',
      bezeichnung: 'Rohbau',
      elternId: null,
      dauer: 0,
      vorgaenger: [],
      fruehesterBeginn: null,
      bezug: null,
      ist: null,
    },
    {
      id: V_ERD,
      nummer: '1.1',
      bezeichnung: 'Erdarbeiten',
      elternId: V_ROHBAU,
      dauer: 5,
      vorgaenger: [],
      fruehesterBeginn: null,
      bezug: null,
      ist: null,
    },
    {
      id: V_MAUER,
      nummer: '1.2',
      bezeichnung: 'Mauerwerk EG',
      elternId: V_ROHBAU,
      dauer: 10,
      vorgaenger: [{ vorgaengerId: V_ERD, art: 'ende-anfang', abstand: 0 }],
      fruehesterBeginn: null,
      bezug: null,
      ist: null,
    },
    {
      id: V_FERTIG,
      nummer: null,
      bezeichnung: 'Rohbau fertig',
      elternId: V_ROHBAU,
      dauer: 0,
      vorgaenger: [{ vorgaengerId: V_MAUER, art: 'ende-anfang', abstand: 0 }],
      fruehesterBeginn: null,
      bezug: null,
      ist: null,
    },
  ],
};

const termine = (beginn: string, ende: string, kritisch: boolean, puffer = 0) => ({
  beginn,
  ende,
  spaetesterBeginn: beginn,
  spaetestesEnde: ende,
  gesamtpuffer: puffer,
  freierPuffer: puffer,
  kritisch,
});

export const bauzeitenergebnis: Bauzeitenplanergebnis = {
  projektbeginn: '2026-11-16',
  projektende: '2026-12-07',
  vorgaenge: [
    { vorgangId: V_ROHBAU, art: 'sammelvorgang', termine: termine('2026-11-16', '2026-12-07', false) },
    { vorgangId: V_ERD, art: 'vorgang', termine: termine('2026-11-16', '2026-11-20', true) },
    { vorgangId: V_MAUER, art: 'vorgang', termine: termine('2026-11-23', '2026-12-04', true) },
    { vorgangId: V_FERTIG, art: 'meilenstein', termine: termine('2026-12-07', '2026-12-07', true) },
  ],
  kritischeWege: [[V_ERD, V_MAUER, V_FERTIG]],
  befunde: [
    {
      schwere: 'warnung',
      quelle: 'terminrechnung',
      code: 'ist-ungueltig',
      meldung: `Vorgang ${V_MAUER}: Fortschritt außerhalb von 0 bis 100 Prozent: 120.00`,
      ort: { vorgangId: V_MAUER, feld: 'ist' },
    },
    {
      schwere: 'warnung',
      quelle: 'terminrechnung',
      code: 'beziehung-an-sammelvorgang',
      meldung: `Anordnungsbeziehung ${V_ROHBAU} → ${V_FERTIG}: an einem Sammelvorgang nicht gerechnet`,
      ort: { vorgangId: V_FERTIG, feld: 'vorgaenger', pfad: '/vorgaenge[4]/vorgaenger[1]' },
    },
  ],
};

/** Die Befunde der Terminrechnung, wie die Planseite sie zeigt (Ort und Text fertig formatiert). */
export const bauzeitBefundtexte: readonly Befundtext[] = [
  {
    schwere: 'warnung',
    ort: '1.2 Mauerwerk EG',
    text: 'Ist-Termine oder Fortschritt sind ungültig; sie verschieben nichts.',
  },
  {
    schwere: 'warnung',
    ort: 'Rohbau fertig',
    text: 'Anordnungsbeziehung mit 1 Rohbau: An einem Sammelvorgang wird sie in v1 nicht gerechnet; sie entfällt.',
  },
];
