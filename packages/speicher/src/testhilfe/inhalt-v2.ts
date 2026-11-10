// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests: Inhalt der eingefrorenen Projektdatei der Schemaversion 2 (`fixtures/projektdatei-v2.json`), selbst
// verfasst (C4), als Folge von Befehlen, wie der Kern sie liefern würde. Er trägt alles, was Version 2 neu kann:
// kombinierte Merkmale (Bedarf im Stundenlohn, Wahl mit Gruppe und Variante, Pauschal mit Bedarf), Zuschlag in jeder
// Bezugsform mit Satz und mit Teilmenge, eine Zuschlagsposition in Altform, Leitbeschreibung mit Unterbeschreibungen,
// Zuschlagskennzeichen, Auftraggeber und Vergabeinformationen (LV und Auftrags-LV), die Ausweise für Bedarf ohne
// Gesamtbetrag und Wahl in Gesamt- und Gliederungssummen, ein Angebot mit `zuschlagssatz`, Langtext mit Absatz,
// Auszeichnung, Liste, Tabelle, Bild und Textergänzung, und im Protokoll Kurzfassungen der Massenbefehle.
//
// Die Beträge sind ein Speicherbeispiel, keine goldenen Rechenwerte: `speicher` rechnet nicht. Sie sind trotzdem nach
// N2 und D-03 von Hand nachvollziehbar (siehe Kommentare an den Positionen).

import type {
  AngebotId,
  AngebotZustand,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvZustand,
  Betrag,
  BieterId,
  ElternId,
  Einheitspreis,
  HinweistextId,
  Knoten,
  Langtext,
  LeistungsverzeichnisId,
  LosId,
  LvZustand,
  Menge,
  Ordnungszahl,
  OzMaske,
  Position,
  PositionId,
  Positionsmerkmale,
  Projekt,
  ProjektId,
  Prozent,
  TitelId,
} from '@tethys/vertrag';
import {
  angebotAnlegenChangeSet,
  auftragsLvAnlegenChangeSet,
  eintrag,
  lvAnlegenChangeSet,
  projektChangeSet,
  type Schritt,
} from './fixtures';

const id = (n: number): string => `019b7700-0000-7000-8000-${String(n).padStart(12, '0')}`;

export const V2_PROJEKT = 'projekt-v2' as ProjektId;
export const V2_LV = id(1) as LeistungsverzeichnisId;
export const V2_ANGEBOT = id(2) as AngebotId;
export const V2_AUFTRAG = id(3) as AuftragsLeistungsverzeichnisId;
const LOS = id(10) as LosId;
const TITEL = id(11) as TitelId;
const HINWEIS = id(12) as HinweistextId;
const pid = (n: number): PositionId => id(100 + n) as PositionId;

const maske: OzMaske = {
  gliederung: [
    { laenge: 1, zeichen: 'numerisch' },
    { laenge: 2, zeichen: 'numerisch' },
  ],
  losStufe: true,
  position: { laenge: 4, zeichen: 'numerisch' },
  index: { laenge: 1, zeichen: 'alphanumerisch' },
  trennzeichen: '.',
};

const hinweistext: Langtext = [
  {
    art: 'absatz',
    inhalt: [
      { art: 'text', text: 'Vorbemerkung: ' },
      { art: 'text', text: 'alle Maße', fett: true },
      { art: 'umbruch' },
      { art: 'text', text: 'am Bau prüfen', kursiv: true, unterstrichen: true },
    ],
  },
  {
    art: 'liste',
    geordnet: false,
    punkte: [
      [{ art: 'text', text: 'Baustelle sauber halten' }],
      [{ art: 'absatz', inhalt: [{ art: 'text', text: 'Abfälle trennen', fett: true }] }],
    ],
  },
  {
    art: 'liste',
    geordnet: true,
    punkte: [[{ art: 'text', text: 'erstens' }], [{ art: 'text', text: 'zweitens' }]],
  },
  {
    art: 'tabelle',
    zeilen: [
      {
        zellen: [
          { spalten: 1, inhalt: [{ art: 'text', text: 'Bauteil' }] },
          { spalten: 1, inhalt: [{ art: 'text', text: 'Güte', fett: true }] },
        ],
      },
      {
        zellen: [
          { spalten: 2, inhalt: [{ art: 'absatz', inhalt: [{ art: 'text', text: 'über zwei Spalten' }] }] },
        ],
      },
    ],
  },
];

const positionstext: Langtext = [
  { art: 'absatz', inhalt: [{ art: 'text', text: 'Mauerwerk aus Kalksandstein, erfundener Text.' }] },
  { art: 'bild', bild: { id: 'bild-1' as never, medientyp: 'image/png', daten: 'iVBORw0KGgo=' } },
  {
    art: 'ergaenzung',
    herkunft: 'bieter',
    kennung: '1',
    leer: false,
    davor: [{ art: 'text', text: 'Fabrikat: ' }],
    inhalt: [{ art: 'text', text: 'Muster' }, { art: 'umbruch' }],
    danach: [{ art: 'text', text: ' oder gleichwertig' }],
  },
  {
    art: 'ergaenzung',
    herkunft: 'ausschreibender',
    kennung: '2',
    leer: true,
    davor: [],
    inhalt: [],
    danach: [],
  },
];

const OHNE: Positionsmerkmale = {
  bedarf: null,
  wahl: null,
  stundenlohn: false,
  pauschal: false,
  zuschlagskennzeichen: false,
};

let reihe = 0;
const position = (n: number, oz: string, kurztext: string, mehr: Partial<Position>): Position => ({
  art: 'position',
  id: pid(n),
  elternId: TITEL,
  reihenfolge: reihe++,
  ordnungszahl: oz as Ordnungszahl,
  ozIndex: null,
  merkmale: OHNE,
  zuschlag: null,
  kurztext,
  langtext: [],
  menge: null,
  einheit: null,
  einheitspreis: null,
  epa: null,
  ...mehr,
});
const m = (x: string): Menge => x as Menge;
const ep = (x: string): Einheitspreis => x as Einheitspreis;
const b = (x: string): Betrag => x as Betrag;
const p = (x: string): Prozent => x as Prozent;

function knoten(): Knoten[] {
  reihe = 1; // Platz 0 unter dem Titel hat der Hinweistext
  return [
    {
      art: 'los',
      id: LOS,
      elternId: V2_LV as ElternId,
      reihenfolge: 0,
      ordnungszahl: '1' as Ordnungszahl,
      kurztext: 'Los Rohbau',
    },
    {
      art: 'titel',
      id: TITEL,
      elternId: LOS as ElternId,
      reihenfolge: 0,
      ordnungszahl: '1.01' as Ordnungszahl,
      kurztext: 'Mauerarbeiten',
    },
    { art: 'hinweis', id: HINWEIS, elternId: TITEL as ElternId, reihenfolge: 0, text: hinweistext },
    // 10,000 × 12,500 = 125,00
    position(1, '1.01.0010', 'Mauerwerk', {
      langtext: positionstext,
      menge: m('10.000'),
      einheit: 'm2',
      einheitspreis: ep('12.500'),
      epa: {
        lohn: ep('7.500'),
        stoffe: ep('5.000'),
        geraete: null,
        nachunternehmer: null,
        sonstiges: null,
        frei: null,
        freiBezeichnung: null,
      },
    }),
    // Bedarf ohne Gesamtbetrag im Stundenlohn: 5,000 × 40,000 = 200,00, nur im Ausweis
    position(2, '1.01.0020', 'Stundenlohn Maurer (Bedarf)', {
      merkmale: { ...OHNE, bedarf: 'ohne-gesamtbetrag', stundenlohn: true },
      menge: m('5.000'),
      einheit: 'h',
      einheitspreis: ep('40.000'),
    }),
    // Wahl zu Position 1, Gruppe 1, Variante 1: 10,000 × 15,000 = 150,00, nur im Ausweis
    position(3, '1.01.0030', 'Mauerwerk als Wahl', {
      merkmale: { ...OHNE, wahl: { gruppe: 1, variante: 1, grundpositionId: pid(1) } },
      menge: m('10.000'),
      einheit: 'm2',
      einheitspreis: ep('15.000'),
    }),
    // Pauschal und Bedarf mit Gesamtbetrag: 1,000 × 300,000 = 300,00
    position(4, '1.01.0040', 'Gerüst pauschal (Bedarf mit Gesamtbetrag)', {
      ozIndex: 'a',
      merkmale: { ...OHNE, bedarf: 'mit-gesamtbetrag', pauschal: true },
      menge: m('1.000'),
      einheit: 'psch',
      einheitspreis: ep('300.000'),
    }),
    // Zuschlag auf die Gliederung, 5 %: (125,00 + 300,00) × 5 % = 21,25
    position(5, '1.01.0050', 'Zuschlag Baustelleneinrichtung', {
      zuschlag: { prozentsatz: p('5.00'), bezug: { art: 'gliederung' } },
    }),
    // Zuschlag auf Positionen, 10 %, Position 1 mit Teilmenge: (4,000 × 12,500 + 300,00) × 10 % = 35,00
    position(6, '1.01.0060', 'Zuschlag Erschwernis', {
      zuschlag: {
        prozentsatz: p('10.00'),
        bezug: {
          art: 'positionen',
          positionen: [
            { positionId: pid(1), teilmenge: m('4.000') },
            { positionId: pid(4), teilmenge: null },
          ],
        },
      },
    }),
    // Leitbeschreibung, zum Zuschlag gekennzeichnet: 2,000 × 100,000 = 200,00
    position(7, '1.01.0070', 'Heizungsanlage', {
      merkmale: { ...OHNE, zuschlagskennzeichen: true },
      leitbeschreibung: {
        unterbeschreibungen: [
          {
            nummer: '01',
            kurztext: 'Heizgerät',
            langtext: [{ art: 'text', text: 'erfunden' }],
            menge: m('2.000'),
            einheit: 'Stck',
          },
          { nummer: '02', kurztext: 'Ausdehnungsgefäß', langtext: [], menge: null, einheit: null },
        ],
      },
      menge: m('2.000'),
      einheit: 'Stck',
      einheitspreis: ep('100.000'),
    }),
    // Zuschlag auf die gekennzeichneten Positionen, 2,5 %: 200,00 × 2,5 % = 5,00
    position(8, '1.01.0080', 'Zuschlag Kleinteile', {
      zuschlag: { prozentsatz: p('2.50'), bezug: { art: 'kennzeichnung' } },
    }),
    // Altform (Version 1, Ticket 37): ohne Satz, gerechnet als 1,000 × 50,000 = 50,00
    position(9, '1.01.0090', 'Zuschlag in Altform', {
      zuschlag: {
        prozentsatz: null,
        bezug: { art: 'positionen', positionen: [{ positionId: pid(1), teilmenge: null }] },
      },
      menge: m('1.000'),
      einheit: 'psch',
      einheitspreis: ep('50.000'),
    }),
  ];
}

const GP_LV: [number, string | null, boolean][] = [
  [1, '125.00', true],
  [2, '200.00', false],
  [3, '150.00', false],
  [4, '300.00', true],
  [5, '21.25', true],
  [6, '35.00', true],
  [7, '200.00', true],
  [8, '5.00', true],
  [9, '50.00', true],
];

/** Netto 736,25; Nachlass 2 % = 14,73; 721,52; MwSt 19 % = 137,09; Brutto 858,61. */
function lvZustand(): LvZustand {
  const ausweise = { summeBedarfOhneGesamtbetrag: b('200.00'), summeWahl: b('150.00') };
  return {
    leistungsverzeichnis: {
      id: V2_LV,
      projektId: V2_PROJEKT,
      name: 'Eingefroren v2 (erfunden)',
      ozMaske: maske,
      mwstSatz: p('19.00'),
      nachlass: { art: 'prozent', wert: p('2.00') },
      auftraggeber: {
        name: 'Gemeinde Musterstadt (erfunden)',
        strasse: 'Am Markt 1',
        plz: '12345',
        ort: 'Musterstadt',
        vergabenummer: 'V-2026-001',
      },
      vergabeinformationen: {
        eroeffnungsdatum: '2026-12-01',
        eroeffnungszeit: '10:00:00',
        abgabeort: 'Rathaus, Zimmer 1',
        ausfuehrungsbeginn: '2027-03-01',
        ausfuehrungsende: '2027-09-30',
        auftragsnummer: null,
        auftragsdatum: null,
        abnahmeart: 'förmlich',
        gewaehrleistung: { dauer: 5, einheit: 'Years' },
      },
      knoten: knoten(),
    },
    summen: {
      positionen: GP_LV.map(([n, gp, rein]) => ({
        positionId: pid(n),
        gesamtpreis: gp === null ? null : b(gp),
        gehtInSummeEin: rein,
      })),
      gliederungen: [
        { gliederungId: LOS, summe: b('736.25'), ...ausweise },
        { gliederungId: TITEL, summe: b('736.25'), ...ausweise },
      ],
      gesamt: {
        netto: b('736.25'),
        nachlass: b('14.73'),
        nettoNachNachlass: b('721.52'),
        mwst: b('137.09'),
        brutto: b('858.61'),
        ...ausweise,
      },
    },
  };
}

/**
 * Angebot von Bieter 1: Zuschlagssätze 4 % (Gliederung) und 8 % (Positionen), EP dort Platzhalter 0,000 (D-12 Nr. 7).
 * 120,00 + 280,00 + 16,00 + 26,24 + 180,00 + 45,00 = 667,24; MwSt 126,78; Brutto 794,02.
 */
function angebot(): AngebotZustand {
  const ausweise = { summeBedarfOhneGesamtbetrag: b('0.00'), summeWahl: b('140.00') };
  return {
    angebot: {
      id: V2_ANGEBOT,
      projektId: V2_PROJEKT,
      leistungsverzeichnisId: V2_LV,
      bieterId: 'bieter-1' as BieterId,
      nachlass: null,
      positionen: [
        { positionId: pid(1), status: 'angeboten', einheitspreis: ep('12.000'), epa: null },
        { positionId: pid(2), status: 'nicht-angeboten' },
        { positionId: pid(3), status: 'angeboten', einheitspreis: ep('14.000'), epa: null },
        { positionId: pid(4), status: 'angeboten', einheitspreis: ep('280.000'), epa: null },
        {
          positionId: pid(5),
          status: 'angeboten',
          einheitspreis: ep('0.000'),
          epa: null,
          zuschlagssatz: p('4.00'),
        },
        {
          positionId: pid(6),
          status: 'angeboten',
          einheitspreis: ep('0.000'),
          epa: null,
          zuschlagssatz: p('8.00'),
        },
        {
          positionId: pid(7),
          status: 'angeboten',
          einheitspreis: ep('90.000'),
          epa: {
            lohn: ep('30.000'),
            stoffe: ep('60.000'),
            geraete: null,
            nachunternehmer: null,
            sonstiges: null,
            frei: null,
            freiBezeichnung: null,
          },
        },
        { positionId: pid(8), status: 'nicht-angeboten' },
        { positionId: pid(9), status: 'angeboten', einheitspreis: ep('45.000'), epa: null },
      ],
    },
    summen: {
      positionen: [
        [1, '120.00', true],
        [2, null, false],
        [3, '140.00', false],
        [4, '280.00', true],
        [5, '16.00', true],
        [6, '26.24', true],
        [7, '180.00', true],
        [8, null, false],
        [9, '45.00', true],
      ].map(([n, gp, rein]) => ({
        positionId: pid(n as number),
        gesamtpreis: gp === null ? null : b(gp as string),
        gehtInSummeEin: rein as boolean,
      })),
      gliederungen: [
        { gliederungId: LOS, summe: b('667.24'), ...ausweise },
        { gliederungId: TITEL, summe: b('667.24'), ...ausweise },
      ],
      gesamt: {
        netto: b('667.24'),
        nachlass: b('0.00'),
        nettoNachNachlass: b('667.24'),
        mwst: b('126.78'),
        brutto: b('794.02'),
        ...ausweise,
      },
    },
  };
}

/** Auftrags-LV aus LV und Angebot (Knoten und Summen wie im LV; nur Speicherbeispiel), mit eigenen Kopfdaten. */
function auftrag(lv: LvZustand): AuftragsLvZustand {
  const { id: lvId, vergabeinformationen, ...rest } = lv.leistungsverzeichnis;
  return {
    auftragsLeistungsverzeichnis: {
      ...rest,
      id: V2_AUFTRAG,
      leistungsverzeichnisId: lvId,
      angebotId: V2_ANGEBOT,
      name: 'Auftrag Eingefroren v2 (erfunden)',
      vergabeinformationen: {
        ...(vergabeinformationen ?? ({} as never)),
        auftragsnummer: 'A-17',
        auftragsdatum: '2027-01-15',
      },
      knoten: rest.knoten.map((k) => (k.elternId === lvId ? { ...k, elternId: V2_AUFTRAG as ElternId } : k)),
    },
    summen: lv.summen,
  };
}

export interface InhaltV2 {
  readonly projekt: Projekt;
  readonly lv: LvZustand;
  readonly angebot: AngebotZustand;
  readonly auftrag: AuftragsLvZustand;
  readonly schritte: readonly Schritt[];
}

/** Der Inhalt und die Befehlsfolge, aus der die eingefrorene Datei entstand. */
export function inhaltV2(): InhaltV2 {
  const projekt: Projekt = {
    id: V2_PROJEKT,
    name: 'Eingefroren v2',
    bauherr: { name: 'Bauherr (erfunden)', anschrift: 'Musterweg 2, 12345 Musterstadt' },
    bieter: [
      { id: 'bieter-1' as BieterId, name: 'Musterbau GmbH (erfunden)' },
      { id: 'bieter-2' as BieterId, name: 'Beispiel AG (erfunden)' },
    ],
  };
  const lv = lvZustand();
  const a = angebot();
  const au = auftrag(lv);
  const { knoten: lvKnoten, ...lvKopf } = lv.leistungsverzeichnis;
  const schritte: Schritt[] = [
    {
      eintrag: eintrag(
        1,
        V2_PROJEKT,
        { art: 'projekt', id: V2_PROJEKT },
        {
          art: 'ProjektAnlegen',
          id: V2_PROJEKT,
          name: projekt.name,
          bauherr: projekt.bauherr,
        },
      ),
      changeSet: projektChangeSet(projekt),
    },
    {
      eintrag: eintrag(
        2,
        V2_PROJEKT,
        { art: 'leistungsverzeichnis', id: V2_LV },
        {
          art: 'LeistungsverzeichnisAnlegen',
          id: V2_LV,
          projektId: V2_PROJEKT,
          inhalt: {
            name: lvKopf.name,
            ozMaske: lvKopf.ozMaske,
            mwstSatz: lvKopf.mwstSatz,
            nachlass: lvKopf.nachlass,
            ...(lvKopf.auftraggeber === undefined ? {} : { auftraggeber: lvKopf.auftraggeber }),
            ...(lvKopf.vergabeinformationen === undefined
              ? {}
              : { vergabeinformationen: lvKopf.vergabeinformationen }),
            wurzelId: V2_LV,
            knoten: lvKnoten,
          },
        },
      ),
      changeSet: lvAnlegenChangeSet(lv),
    },
    {
      eintrag: eintrag(
        3,
        V2_PROJEKT,
        { art: 'angebot', id: V2_ANGEBOT },
        { art: 'AngebotAnlegen', angebot: a.angebot },
      ),
      changeSet: angebotAnlegenChangeSet(a),
    },
    {
      eintrag: eintrag(
        4,
        V2_PROJEKT,
        { art: 'auftrags-leistungsverzeichnis', id: V2_AUFTRAG },
        {
          art: 'AuftragsLeistungsverzeichnisAnlegen',
          auftragsLeistungsverzeichnis: au.auftragsLeistungsverzeichnis,
        },
      ),
      changeSet: auftragsLvAnlegenChangeSet(au),
    },
    {
      // Ein gewöhnlicher Befehl bleibt vollständig im Protokoll.
      eintrag: eintrag(
        5,
        V2_PROJEKT,
        { art: 'projekt', id: V2_PROJEKT },
        {
          art: 'ProjektStammdatenSetzen',
          name: projekt.name,
          bauherr: { ...projekt.bauherr, anschrift: null },
        },
      ),
      changeSet: {
        art: 'projekt',
        projektId: V2_PROJEKT,
        projekt: {
          vorher: projekt,
          nachher: { ...projekt, bauherr: { ...projekt.bauherr, anschrift: null } },
        },
      },
    },
  ];
  return {
    projekt: { ...projekt, bauherr: { ...projekt.bauherr, anschrift: null } },
    lv,
    angebot: a,
    auftrag: au,
    schritte,
  };
}
