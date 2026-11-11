// SPDX-License-Identifier: AGPL-3.0-or-later
// Kompilierbare Beispiele zu `vertrag`. Nicht Teil des Pakets (nicht in `index.ts` exportiert).
//
// Die Typannahmen (`as`) stehen nur hier: Dezimalwerte erzeugt `dezimal`, Kennungen die App. Die Werte sind
// ein Auszug aus `fixtures/winzig.json` (erfunden).

import type {
  AngebotLoeschen,
  AufmassAnlegen,
  AufmasspositionSetzen,
  AuftragsLeistungsverzeichnisAnlegen,
  GliederungAnlegen,
  KnotenEinfuegen,
  KnotenVerschieben,
  KostengruppeSetzen,
  LeistungsverzeichnisLoeschen,
  LvBefehl,
  MengeAendern,
  MengenansatzSetzen,
  NachtragUebernehmen,
  NachtragsangabenSetzen,
  ProjektLoeschen,
  TextquelleSetzen,
  VorlageSetzen,
} from './befehle';
import type { AufmassChangeSet, AuftragsLvChangeSet, LvChangeSet } from './changeset';
import type { AuftragsLvUebersicht, Protokolleintrag } from './speicher';
import type { LvAnsicht } from './ansicht';
import type {
  AngebotId,
  AufmassId,
  AuftragsLeistungsverzeichnisId,
  BildId,
  LvStandId,
  NutzerId,
  PapierkorbeintragId,
  ProtokollId,
  Zeitstempel,
} from './marken';
import type {
  Angebotsposition,
  Ansatzzeile,
  Aufmass,
  AuftragsLeistungsverzeichnis,
  AuftragsLvKopf,
  Leistungsverzeichnis,
  LvInhalt,
  LvKopf,
  Langtext,
  OzMaske,
  Papierkorbeintrag,
  Position,
  Positionsmerkmale,
  Zuschlag,
} from './modell';
import type {
  Kostengruppennummer,
  LeistungsverzeichnisId,
  Ordnungszahl,
  PositionId,
  ProjektId,
  TitelId,
} from './marken';
import type { Gesamtsummen } from './summen';
import type { Betrag, Einheitspreis, Menge, Prozent } from './zahlen';

const lvId = '019b76e9-0000-7000-8000-000000000001' as LeistungsverzeichnisId;
const titelId = '019b76e9-0000-7000-8000-000000000002' as TitelId;
const posId = '019b76e9-0000-7000-8000-000000000003' as PositionId;

/** Standardmaske `NN.NN.NNNN[.A]`: zwei Gliederungsstufen, Position vierstellig, Indexbuchstabe. */
export const beispielMaske: OzMaske = {
  gliederung: [
    { laenge: 2, zeichen: 'numerisch' },
    { laenge: 2, zeichen: 'numerisch' },
  ],
  position: { laenge: 4, zeichen: 'numerisch' },
  index: { laenge: 1, zeichen: 'alphanumerisch' },
  trennzeichen: '.',
};

/** Beispielbefehl: Die Menge der Position `01.0010` wird auf 1,235 gesetzt. */
export const beispielBefehl: LvBefehl = {
  art: 'MengeAendern',
  positionId: posId,
  menge: '1.235' as Menge,
};

/** Position ohne jedes Merkmal (Normalposition). Eine Funktion, damit kein Beispiel das Objekt eines anderen teilt. */
function keineMerkmale(): Positionsmerkmale {
  return { bedarf: null, wahl: null, stundenlohn: false, pauschal: false, zuschlagskennzeichen: false };
}

const position: Position = {
  art: 'position',
  id: posId,
  elternId: titelId,
  reihenfolge: 0,
  ordnungszahl: '01.0010' as Ordnungszahl,
  ozIndex: null,
  merkmale: keineMerkmale(),
  zuschlag: null,
  kurztext: 'Beispielposition',
  langtext: [{ art: 'text', text: 'Beispieltext (erfunden).' }],
  menge: '1.235' as Menge,
  einheit: 'm',
  einheitspreis: '10.000' as Einheitspreis,
  epa: null,
};

/** Beispiel-ChangeSet zum Befehl oben: ein geänderter Knoten (alte und neue Menge) mit Position, Titel und LV-Summe. */
export const beispielChangeSet: LvChangeSet = {
  art: 'leistungsverzeichnis',
  leistungsverzeichnisId: lvId,
  kopf: null,
  knoten: {
    hinzugefuegt: [],
    geaendert: [{ vorher: { ...position, menge: '1.000' as Menge }, nachher: position }],
    entfernt: [],
  },
  summen: {
    positionen: [{ positionId: posId, gesamtpreis: '12.35' as Betrag, gehtInSummeEin: true }],
    gliederungen: [{ gliederungId: titelId, summe: '12.35' as Betrag }],
    gesamt: {
      netto: '12.35' as Betrag,
      nachlass: '0.00' as Betrag,
      nettoNachNachlass: '12.35' as Betrag,
      mwst: '2.35' as Betrag,
      brutto: '14.70' as Betrag,
    },
    // v1.1a, Punkt 1: die alten Werte, damit sich das ChangeSet ohne Vorzustand umkehren lässt.
    vorher: {
      positionen: [{ positionId: posId, gesamtpreis: '10.00' as Betrag, gehtInSummeEin: true }],
      gliederungen: [{ gliederungId: titelId, summe: '10.00' as Betrag }],
      gesamt: {
        netto: '10.00' as Betrag,
        nachlass: '0.00' as Betrag,
        nettoNachNachlass: '10.00' as Betrag,
        mwst: '1.90' as Betrag,
        brutto: '11.90' as Betrag,
      },
      entfernt: { positionen: [], gliederungen: [] },
    },
  },
};

/** Auszug einer Fixture als `vertrag`-Typ: ein Titel mit einer Position, MwSt 19 %, kein Nachlass. */
export const beispielLv: Leistungsverzeichnis = {
  id: lvId,
  projektId: '019b76e9-0000-7000-8000-000000000000' as ProjektId,
  name: 'Beispiel',
  ozMaske: beispielMaske,
  mwstSatz: '19.00' as Prozent,
  nachlass: null,
  knoten: [
    {
      art: 'titel',
      id: titelId,
      elternId: lvId,
      reihenfolge: 0,
      ordnungszahl: '01' as Ordnungszahl,
      kurztext: 'Beispieltitel',
    },
    position,
  ],
};

// --- v1.1a ----------------------------------------------------------------------------------------------------------

/** Punkt 4: die drei Löschbefehle. Sie tragen nichts; das ChangeSet trägt den vollen Stand. */
export const beispielLoeschbefehle: readonly [
  ProjektLoeschen,
  LeistungsverzeichnisLoeschen,
  AngebotLoeschen,
] = [{ art: 'ProjektLoeschen' }, { art: 'LeistungsverzeichnisLoeschen' }, { art: 'AngebotLoeschen' }];

const lvKopf: LvKopf = {
  id: beispielLv.id,
  projektId: beispielLv.projektId,
  name: beispielLv.name,
  ozMaske: beispielLv.ozMaske,
  mwstSatz: beispielLv.mwstSatz,
  nachlass: beispielLv.nachlass,
};

/**
 * Punkt 4 und 2: Löschen des Beispiel-LV. `kopf.nachher` ist `null`, alle Knoten stehen unter `entfernt`, alle Summen
 * unter `summen.vorher.entfernt`. Daraus lässt sich das LV ohne weiteren Zustand wiederherstellen (Undo, LV-Stand).
 */
export const beispielLoeschChangeSet: LvChangeSet = {
  art: 'leistungsverzeichnis',
  leistungsverzeichnisId: lvId,
  kopf: { vorher: lvKopf, nachher: null },
  knoten: { hinzugefuegt: [], geaendert: [], entfernt: beispielLv.knoten },
  summen: {
    positionen: [],
    gliederungen: [],
    gesamt: null,
    vorher: {
      positionen: [],
      gliederungen: [],
      gesamt: beispielChangeSet.summen.gesamt,
      entfernt: {
        positionen: [{ positionId: posId, gesamtpreis: '12.35' as Betrag, gehtInSummeEin: true }],
        gliederungen: [{ gliederungId: titelId, summe: '12.35' as Betrag }],
      },
    },
  },
};

const auftragsId = '019b76e9-0000-7000-8000-000000000010' as AuftragsLeistungsverzeichnisId;

/** Punkt 5: ein Auftrags-LV mit den Positions-IDs der Ausschreibung. */
export const beispielAuftragsLv: AuftragsLeistungsverzeichnis = {
  id: auftragsId,
  projektId: beispielLv.projektId,
  leistungsverzeichnisId: lvId,
  angebotId: '019b76e9-0000-7000-8000-000000000020' as AngebotId,
  name: beispielLv.name,
  ozMaske: beispielMaske,
  mwstSatz: beispielLv.mwstSatz,
  nachlass: null,
  knoten: [
    {
      art: 'titel',
      id: titelId,
      elternId: auftragsId,
      reihenfolge: 0,
      ordnungszahl: '01' as Ordnungszahl,
      kurztext: 'Beispieltitel',
    },
    position,
  ],
};

export const beispielAuftragsBefehl: AuftragsLeistungsverzeichnisAnlegen = {
  art: 'AuftragsLeistungsverzeichnisAnlegen',
  auftragsLeistungsverzeichnis: beispielAuftragsLv,
};

const auftragsKopf: AuftragsLvKopf = {
  id: auftragsId,
  projektId: beispielAuftragsLv.projektId,
  leistungsverzeichnisId: lvId,
  angebotId: beispielAuftragsLv.angebotId,
  name: beispielAuftragsLv.name,
  ozMaske: beispielAuftragsLv.ozMaske,
  mwstSatz: beispielAuftragsLv.mwstSatz,
  nachlass: beispielAuftragsLv.nachlass,
};

/** Punkt 5: das ChangeSet zum Anlegen; Kopf und Knoten wie beim LV, der Zustand davor ist `null`. */
export const beispielAuftragsChangeSet: AuftragsLvChangeSet = {
  art: 'auftrags-leistungsverzeichnis',
  auftragsLeistungsverzeichnisId: auftragsId,
  kopf: {
    vorher: null,
    nachher: auftragsKopf,
  },
  knoten: { hinzugefuegt: beispielAuftragsLv.knoten, geaendert: [], entfernt: [] },
  summen: {
    positionen: [{ positionId: posId, gesamtpreis: '12.35' as Betrag, gehtInSummeEin: true }],
    gliederungen: [{ gliederungId: titelId, summe: '12.35' as Betrag }],
    gesamt: beispielChangeSet.summen.gesamt,
    vorher: {
      positionen: [],
      gliederungen: [],
      gesamt: null,
      entfernt: { positionen: [], gliederungen: [] },
    },
  },
};

/** Punkt 6 und 9: Inhalt mit Wurzel-ID und einer Maske, deren oberste Stufe das Los ist (4 Stufen, davon das Los). */
export const beispielInhaltMitLos: LvInhalt = {
  wurzelId: lvId,
  name: 'Beispiel mit Losen',
  ozMaske: {
    losStufe: true,
    gliederung: [
      { laenge: 2, zeichen: 'numerisch' },
      { laenge: 2, zeichen: 'numerisch' },
      { laenge: 2, zeichen: 'numerisch' },
    ],
    position: { laenge: 4, zeichen: 'numerisch' },
    index: { laenge: 1, zeichen: 'alphanumerisch' },
    trennzeichen: '.',
  },
  mwstSatz: '19.00' as Prozent,
  nachlass: null,
  knoten: [],
};

/** Punkt 9: Gliederung mit Ordnungszahl. */
export const beispielGliederungMitOz: GliederungAnlegen = {
  art: 'GliederungAnlegen',
  id: titelId,
  gliederungsart: 'titel',
  ort: { art: 'ende', elternId: lvId },
  kurztext: 'Beispieltitel',
  ordnungszahl: '01' as Ordnungszahl,
};

/** Punkt 6: Ansicht eines leeren LV; die Wurzel ist trotzdem bekannt. */
export const beispielLeereAnsicht: LvAnsicht = { wurzelId: lvId, zeilen: [], gesamt: null };

/** Punkt 10: ein angenommener Befehl mit Hinweis (negatives Netto nach Nachlass ist ein Befund, keine Sperre). */
export const beispielChangeSetMitHinweis: LvChangeSet = {
  art: 'leistungsverzeichnis',
  leistungsverzeichnisId: lvId,
  kopf: null,
  knoten: { hinzugefuegt: [], geaendert: [], entfernt: [] },
  summen: {
    positionen: [],
    gliederungen: [],
    gesamt: null,
    vorher: {
      positionen: [],
      gliederungen: [],
      gesamt: null,
      entfernt: { positionen: [], gliederungen: [] },
    },
  },
  hinweise: [{ code: 'netto-nach-nachlass-negativ', meldung: 'Netto nach Nachlass ist negativ.' }],
};

// --- v1.1a: Umkehrbarkeit je Art der Änderung (Typtest in `vertrag.test.ts`) --------------------------------------

const gesamtsummen = (
  netto: string,
  nachlass: string,
  nnn: string,
  mwst: string,
  brutto: string,
): Gesamtsummen => ({
  netto: netto as Betrag,
  nachlass: nachlass as Betrag,
  nettoNachNachlass: nnn as Betrag,
  mwst: mwst as Betrag,
  brutto: brutto as Betrag,
});
const g1235 = gesamtsummen('12.35', '0.00', '12.35', '2.35', '14.70');
const g2235 = gesamtsummen('22.35', '0.00', '22.35', '4.25', '26.60');
const keinGesamt = { positionen: [], gliederungen: [] } as const;

const pos2Id = '019b76e9-0000-7000-8000-000000000004' as PositionId;
const titel2Id = '019b76e9-0000-7000-8000-000000000005' as TitelId;
const pos2: Position = {
  ...position,
  id: pos2Id,
  reihenfolge: 1,
  ordnungszahl: '01.0020' as Ordnungszahl,
  menge: '2.000' as Menge,
  einheitspreis: '5.000' as Einheitspreis,
  kurztext: 'Zweite Position',
};
const lvRahmen = { art: 'leistungsverzeichnis', leistungsverzeichnisId: lvId } as const;

/** Knoten hinzufügen: neue Position, Summe des Titels und Gesamtsummen ändern sich. */
export const beispielChangeSetHinzufuegen: LvChangeSet = {
  ...lvRahmen,
  kopf: null,
  knoten: { hinzugefuegt: [pos2], geaendert: [], entfernt: [] },
  summen: {
    positionen: [{ positionId: pos2Id, gesamtpreis: '10.00' as Betrag, gehtInSummeEin: true }],
    gliederungen: [{ gliederungId: titelId, summe: '22.35' as Betrag }],
    gesamt: g2235,
    vorher: {
      positionen: [],
      gliederungen: [{ gliederungId: titelId, summe: '12.35' as Betrag }],
      gesamt: g1235,
      entfernt: keinGesamt,
    },
  },
};

/** Knoten entfernen: das Gegenstück; die Summe der entfernten Position steht in `vorher.entfernt`. */
export const beispielChangeSetEntfernen: LvChangeSet = {
  ...lvRahmen,
  kopf: null,
  knoten: { hinzugefuegt: [], geaendert: [], entfernt: [pos2] },
  summen: {
    positionen: [],
    gliederungen: [{ gliederungId: titelId, summe: '12.35' as Betrag }],
    gesamt: g1235,
    vorher: {
      positionen: [],
      gliederungen: [{ gliederungId: titelId, summe: '22.35' as Betrag }],
      gesamt: g2235,
      entfernt: {
        positionen: [{ positionId: pos2Id, gesamtpreis: '10.00' as Betrag, gehtInSummeEin: true }],
        gliederungen: [],
      },
    },
  },
};

/** Verschieben: Die alte Lage (`elternId`, `reihenfolge`) steht in `geaendert[].vorher`; beide Titelsummen ändern sich. */
export const beispielChangeSetVerschieben: LvChangeSet = {
  ...lvRahmen,
  kopf: null,
  knoten: {
    hinzugefuegt: [],
    geaendert: [{ vorher: pos2, nachher: { ...pos2, elternId: titel2Id, reihenfolge: 0 } }],
    entfernt: [],
  },
  summen: {
    positionen: [],
    gliederungen: [
      { gliederungId: titelId, summe: '12.35' as Betrag },
      { gliederungId: titel2Id, summe: '10.00' as Betrag },
    ],
    gesamt: null,
    vorher: {
      positionen: [],
      gliederungen: [
        { gliederungId: titelId, summe: '22.35' as Betrag },
        { gliederungId: titel2Id, summe: '0.00' as Betrag },
      ],
      gesamt: null,
      entfernt: keinGesamt,
    },
  },
};

/** LV anlegen: `kopf.vorher: null`; die Umkehrung ist `beispielLoeschChangeSet`. */
export const beispielAnlegenChangeSet: LvChangeSet = {
  ...lvRahmen,
  kopf: { vorher: null, nachher: lvKopf },
  knoten: { hinzugefuegt: beispielLv.knoten, geaendert: [], entfernt: [] },
  summen: {
    positionen: [{ positionId: posId, gesamtpreis: '12.35' as Betrag, gehtInSummeEin: true }],
    gliederungen: [{ gliederungId: titelId, summe: '12.35' as Betrag }],
    gesamt: g1235,
    vorher: { positionen: [], gliederungen: [], gesamt: null, entfernt: keinGesamt },
  },
};

/** Nachlass setzen: nur der Kopf und die Gesamtsummen ändern sich. */
export const beispielChangeSetNachlass: LvChangeSet = {
  ...lvRahmen,
  kopf: { vorher: lvKopf, nachher: { ...lvKopf, nachlass: { art: 'prozent', wert: '10.00' as Prozent } } },
  knoten: { hinzugefuegt: [], geaendert: [], entfernt: [] },
  summen: {
    positionen: [],
    gliederungen: [],
    gesamt: gesamtsummen('12.35', '1.24', '11.11', '2.11', '13.22'),
    vorher: { positionen: [], gliederungen: [], gesamt: g1235, entfernt: keinGesamt },
  },
};

/** MwSt-Satz ändern: Kopf und Gesamtsummen. */
export const beispielChangeSetMwst: LvChangeSet = {
  ...lvRahmen,
  kopf: { vorher: lvKopf, nachher: { ...lvKopf, mwstSatz: '7.00' as Prozent } },
  knoten: { hinzugefuegt: [], geaendert: [], entfernt: [] },
  summen: {
    positionen: [],
    gliederungen: [],
    gesamt: gesamtsummen('12.35', '0.00', '12.35', '0.86', '13.21'),
    vorher: { positionen: [], gliederungen: [], gesamt: g1235, entfernt: keinGesamt },
  },
};

// --- v1.1b: Inhaltsmodell (Ticket 26) -----------------------------------------------------------------------------

/** Punkt 1: Bedarfsposition im Stundenlohn, ohne Gesamtbetrag. Zwei Merkmale zugleich, kein einzelner Wert. */
export const beispielBedarfImStundenlohn: Position = {
  ...position,
  id: '019b76e9-0000-7000-8000-000000000020' as PositionId,
  reihenfolge: 2,
  ordnungszahl: '01.0030' as Ordnungszahl,
  merkmale: { ...keineMerkmale(), bedarf: 'ohne-gesamtbetrag', stundenlohn: true },
  kurztext: 'Facharbeiter, Stundenlohn, nach Bedarf',
  einheit: 'h',
};

const zuschlagId = (n: number): PositionId =>
  `019b76e9-0000-7000-8000-0000000001${String(n).padStart(2, '0')}` as PositionId;

/** Zuschlagsposition ohne Menge und Einheitspreis; nur Bezug und Prozentsatz unterscheiden die Beispiele. */
const zuschlagsposition = (n: number, zuschlag: Zuschlag): Position => ({
  ...position,
  id: zuschlagId(n),
  reihenfolge: n,
  ordnungszahl: null,
  kurztext: 'Zuschlag (erfunden)',
  menge: null,
  einheit: null,
  einheitspreis: null,
  zuschlag,
});

/**
 * Punkt 2: eine Zuschlagsposition je Bezugsform, wie die amtlichen Dateien sie zeigen: Liste einzelner Positionen
 * (eine mit Teilmenge), alle Positionen der Gliederung, Kennzeichnung an den Positionen.
 */
export const beispielZuschlagsbezuege: readonly [Position, Position, Position] = [
  zuschlagsposition(1, {
    prozentsatz: '10.00' as Prozent,
    bezug: {
      art: 'positionen',
      positionen: [
        { positionId: posId, teilmenge: '0.500' as Menge },
        { positionId: pos2Id, teilmenge: null },
      ],
    },
  }),
  zuschlagsposition(2, { prozentsatz: '10.00' as Prozent, bezug: { art: 'gliederung' } }),
  zuschlagsposition(3, { prozentsatz: null, bezug: { art: 'kennzeichnung' } }),
];

/** Punkt 3: Wahlposition, Gruppe 1, Variante 1, mit Verweis auf die Grundposition. Kein Zustand „gewählt“. */
export const beispielWahlposition: Position = {
  ...position,
  id: '019b76e9-0000-7000-8000-000000000030' as PositionId,
  reihenfolge: 3,
  ordnungszahl: '01.0040' as Ordnungszahl,
  merkmale: { ...keineMerkmale(), wahl: { gruppe: 1, variante: 1, grundpositionId: posId } },
  kurztext: 'Alternative Ausführung',
};

/** Punkt 4: Summen mit getrennt ausgewiesenem Bedarf ohne Gesamtbetrag und Wahl; beide stehen nicht im Netto. */
export const beispielSummenMitBedarfUndWahl: Gesamtsummen = {
  ...gesamtsummen('12.35', '0.00', '12.35', '2.35', '14.70'),
  summeBedarfOhneGesamtbetrag: '48.90' as Betrag,
  summeWahl: '61.25' as Betrag,
};

const bildId = '019b76e9-0000-7000-8000-000000000040' as BildId;

/**
 * Punkt 5: Langtext mit Auszeichnung, Liste, Tabelle, Textergänzung des Bieters und einem Bild. Die Textergänzung
 * steht auf oberster Ebene, ebenso das Bild am Ende auf oberster Ebene.
 */
export const beispielLangtext: Langtext = [
  {
    art: 'absatz',
    inhalt: [
      { art: 'text', text: 'Wand ' },
      { art: 'text', text: 'tragend', fett: true },
      { art: 'umbruch' },
      { art: 'text', text: 'nach Plan', kursiv: true, unterstrichen: true },
    ],
  },
  {
    art: 'liste',
    geordnet: true,
    punkte: [
      [{ art: 'text', text: 'Untergrund prüfen' }],
      [{ art: 'absatz', inhalt: [{ art: 'text', text: 'Anschlüsse herstellen' }] }],
    ],
  },
  {
    art: 'tabelle',
    zeilen: [
      { zellen: [{ spalten: 2, inhalt: [{ art: 'text', text: 'Kennwerte' }] }] },
      {
        zellen: [
          { spalten: 1, inhalt: [{ art: 'text', text: 'Dicke' }] },
          { spalten: 1, inhalt: [{ art: 'text', text: '100 mm' }] },
        ],
      },
    ],
  },
  {
    art: 'ergaenzung',
    herkunft: 'bieter',
    kennung: '60',
    leer: true,
    davor: [{ art: 'text', text: 'Breite von ' }],
    inhalt: [{ art: 'text', text: '...........' }],
    danach: [{ art: 'text', text: ' cm.' }],
  },
  { art: 'bild', bild: { id: bildId, medientyp: 'image/png', daten: 'iVBORw0KGgo=' } },
];

/** Punkt 6: Kopfdaten am LV und eine Leitbeschreibung an der Position (Werte erfunden). */
export const beispielKopfdaten: LvInhalt & { readonly leitposition: Position } = {
  name: 'Beispiel',
  ozMaske: beispielMaske,
  mwstSatz: '19.00' as Prozent,
  nachlass: null,
  auftraggeber: {
    name: 'Beispiel-Auftraggeber',
    strasse: 'Beispielstraße 1',
    plz: '10000',
    ort: 'Beispielstadt',
    vergabenummer: 'V-0001',
  },
  vergabeinformationen: {
    eroeffnungsdatum: '2026-01-15',
    eroeffnungszeit: '10:00:00',
    abgabeort: null,
    ausfuehrungsbeginn: '2026-03-01',
    ausfuehrungsende: '2026-09-30',
    auftragsnummer: 'A-0001',
    auftragsdatum: null,
    abnahmeart: 'Förmliche Abnahme',
    gewaehrleistung: { dauer: 2, einheit: 'Years' },
  },
  wurzelId: lvId,
  knoten: [],
  leitposition: {
    ...position,
    leitbeschreibung: {
      unterbeschreibungen: [
        { nummer: '01', kurztext: 'Heizgerät', langtext: [], menge: '2.000' as Menge, einheit: 'Stck' },
        { nummer: '02', kurztext: 'Ausdehnungsgefäß', langtext: [], menge: null, einheit: null },
      ],
    },
  },
};

/** Punkt 7: Protokolleintrag eines Massenbefehls (`LeistungsverzeichnisAnlegen`): Kopf und Prüfsumme statt des ganzen Befehls. */
export const beispielMassenprotokoll: Protokolleintrag = {
  id: '019b76e9-0000-7000-8000-000000000050' as ProtokollId,
  projektId: '019b76e9-0000-7000-8000-000000000000' as ProjektId,
  aggregat: { art: 'leistungsverzeichnis', id: lvId },
  wer: '019b76e9-0000-7000-8000-000000000051' as NutzerId,
  wann: '2026-11-10T12:00:00.000Z' as Zeitstempel,
  befehl: {
    art: 'Befehlskurzfassung',
    kopf: {
      art: 'LeistungsverzeichnisAnlegen',
      id: lvId,
      projektId: '019b76e9-0000-7000-8000-000000000000' as ProjektId,
      inhalt: {
        name: 'Beispiel',
        ozMaske: beispielMaske,
        mwstSatz: '19.00' as Prozent,
        nachlass: null,
        wurzelId: lvId,
      },
    },
    pruefsumme: {
      algorithmus: 'sha-256',
      wert: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    },
  },
};

// --- v1.2 (Ticket 29) -------------------------------------------------------------------------------------------

/**
 * Nr. 1: Angebotsposition zur ersten Zuschlagsposition aus `beispielZuschlagsbezuege`: Der Bieter bietet 5,00 % an.
 * Die Datei nannte keinen EP, darum `0.000` (vorläufige Annahme); bei gesetztem Satz wird der EP nie gerechnet.
 */
export const beispielAngebotspositionMitZuschlagssatz: Angebotsposition = {
  positionId: zuschlagId(1),
  status: 'angeboten',
  einheitspreis: '0.000' as Einheitspreis,
  epa: null,
  zuschlagssatz: '5.00' as Prozent,
};

const kopieTitelId = '019b76e9-0000-7000-8000-000000000060' as TitelId;

/**
 * Nr. 4: Kopie eines Titels mit zwei Positionen, alle Kennungen neu. Der Titel ist die Wurzel des Teilbaums (seine
 * `elternId` steht nicht in der Liste); seine Lage setzt der Kern am `ort`. Die Positionen hängen am neuen Titel.
 */
export const beispielKnotenEinfuegen: KnotenEinfuegen = {
  art: 'KnotenEinfuegen',
  ort: { art: 'nach', knotenId: titelId },
  knoten: [
    {
      art: 'titel',
      id: kopieTitelId,
      elternId: lvId,
      reihenfolge: 0,
      ordnungszahl: null,
      kurztext: 'Beispieltitel (Kopie)',
    },
    {
      ...position,
      id: '019b76e9-0000-7000-8000-000000000061' as PositionId,
      elternId: kopieTitelId,
      reihenfolge: 0,
      ordnungszahl: null,
    },
    {
      ...pos2,
      id: '019b76e9-0000-7000-8000-000000000062' as PositionId,
      elternId: kopieTitelId,
      reihenfolge: 1,
      ordnungszahl: null,
    },
  ],
};

/** Nr. 4: der Papierkorbeintrag mit der zweiten Position; sie trägt ihre alte Lage (Titel, Reihenfolge 1). */
const papierkorbeintrag: Papierkorbeintrag = {
  id: '019b76e9-0000-7000-8000-000000000070' as PapierkorbeintragId,
  nummer: 1,
  knoten: [pos2],
};

/**
 * Nr. 4: In den Papierkorb legen. Knoten und Summen wie beim Entfernen (die Position fällt aus allen Summen), dazu
 * der neue Eintrag. Die Umkehrung ist `beispielChangeSetWiederherstellen`.
 */
export const beispielChangeSetHineinlegen: LvChangeSet = {
  ...beispielChangeSetEntfernen,
  papierkorb: { hinzugefuegt: [papierkorbeintrag], geaendert: [], entfernt: [] },
};

/** Nr. 4: Wiederherstellen an die alte Stelle. Knoten und Summen wie beim Hinzufügen, der Eintrag entfällt. */
export const beispielChangeSetWiederherstellen: LvChangeSet = {
  ...beispielChangeSetHinzufuegen,
  papierkorb: { hinzugefuegt: [], geaendert: [], entfernt: [papierkorbeintrag] },
};

const zuschlagMitBezug = beispielZuschlagsbezuege[0];

/**
 * Nr. 4 (D-12): Entfernen des Eintrags, während die erste Zuschlagsposition aus `beispielZuschlagsbezuege` noch auf
 * die zweite Position (im Eintrag) verweist. Der hängende Bezug fällt im selben ChangeSet weg (`knoten.geaendert`);
 * Summen ändern sich nicht, weil der Bezug auf den Papierkorb schon nichts zählte.
 */
export const beispielChangeSetPapierkorbeintragEntfernen: LvChangeSet = {
  ...lvRahmen,
  kopf: null,
  knoten: {
    hinzugefuegt: [],
    geaendert: [
      {
        vorher: zuschlagMitBezug,
        nachher: {
          ...zuschlagMitBezug,
          zuschlag: {
            prozentsatz: '10.00' as Prozent,
            bezug: { art: 'positionen', positionen: [{ positionId: posId, teilmenge: '0.500' as Menge }] },
          },
        },
      },
    ],
    entfernt: [],
  },
  summen: {
    positionen: [],
    gliederungen: [],
    gesamt: null,
    vorher: { positionen: [], gliederungen: [], gesamt: null, entfernt: keinGesamt },
  },
  papierkorb: { hinzugefuegt: [], geaendert: [], entfernt: [papierkorbeintrag] },
};

/** Nr. 5: ChangeSet von `LvStandAnlegen`: nur der Kopf des neuen Stands; Knoten und Summen bleiben. */
export const beispielLvStandChangeSet: LvChangeSet = {
  ...lvRahmen,
  kopf: null,
  knoten: { hinzugefuegt: [], geaendert: [], entfernt: [] },
  summen: {
    positionen: [],
    gliederungen: [],
    gesamt: null,
    vorher: { positionen: [], gliederungen: [], gesamt: null, entfernt: keinGesamt },
  },
  lvStand: {
    vorher: null,
    nachher: {
      id: '019b76e9-0000-7000-8000-000000000080' as LvStandId,
      leistungsverzeichnisId: lvId,
      name: 'Stand vor Versand',
    },
  },
};

/** Nr. 5: Protokolleintrag eines `Rueckgaengig`; `protokollId` nennt den Eintrag des ursprünglichen Befehls. */
export const beispielProtokollRueckgaengig: Protokolleintrag = {
  id: '019b76e9-0000-7000-8000-000000000091' as ProtokollId,
  projektId: '019b76e9-0000-7000-8000-000000000000' as ProjektId,
  aggregat: { art: 'leistungsverzeichnis', id: lvId },
  wer: '019b76e9-0000-7000-8000-000000000051' as NutzerId,
  wann: '2026-11-10T12:05:00.000Z' as Zeitstempel,
  befehl: { art: 'Rueckgaengig', protokollId: '019b76e9-0000-7000-8000-000000000090' as ProtokollId },
};

// --- v1.3 (Ticket 53) -------------------------------------------------------------------------------------------

/**
 * Punkte 2 und 6 (D-53.6): LV-Kopf mit Auftragnehmer (aus X86, `CTR`) und EPA-Bezeichnungen: `UPComp1` ist Lohn,
 * `UPComp2` Stoffe, `UPComp3` ist keinem Anteil zugeordnet (fehlt), `UPComp4` der Nachunternehmer-Anteil, `UPComp5`
 * Sonstiges ohne Beschriftung (Art aus GAEB `Type`). Name und Anschrift erfunden.
 */
export const beispielLvKopfV13: LvKopf = {
  ...lvKopf,
  auftragnehmer: { name: 'Beispielbau GmbH', strasse: 'Musterweg 1', plz: null, ort: 'Musterstadt' },
  epaBezeichnungen: [
    { nummer: 1, anteil: 'lohn', bezeichnung: 'Lohn' },
    { nummer: 2, anteil: 'stoffe', bezeichnung: 'Stoffe' },
    { nummer: 4, anteil: 'nachunternehmer', bezeichnung: 'Nachunternehmer' },
    { nummer: 5, anteil: 'sonstiges', bezeichnung: null },
  ],
};

/** Punkt 5: Der zweite Titel kommt als Geschwister direkt hinter den ersten (nicht als dessen erstes Kind wie bei `nach`). */
export const beispielVerschiebenHinterGliederung: KnotenVerschieben = {
  art: 'KnotenVerschieben',
  knotenId: titel2Id,
  ziel: { art: 'hinter-gliederung', gliederungId: titelId },
};

/** Punkt 9: Mengenansatz mit Bezug auf Zeile 1: 0,5 × 2 = 1,000; 1,000 × 0,235 = 0,235; Summe 1,235. */
const ansatz: readonly Ansatzzeile[] = [
  { zeile: 1, formel: 91, ausdruck: '0,5*2', variable: null },
  { zeile: 2, formel: 91, ausdruck: 'Z1*0,235', variable: null },
];

/** Punkt 9: Die App hat die Menge mit `mengen` gerechnet und gibt sie mit; der Kern rechnet nicht nach. */
export const beispielMengenansatzSetzen: MengenansatzSetzen = {
  art: 'MengenansatzSetzen',
  positionId: posId,
  mengenansatz: ansatz,
  menge: '1.235' as Menge,
};

/** Punkt 9, Lesart (b): Ein Ansatz mit Fehler (Zeile 2 teilt durch null) kommt mit `menge: null`. */
export const beispielMengenansatzMitFehler: MengenansatzSetzen = {
  art: 'MengenansatzSetzen',
  positionId: posId,
  mengenansatz: [...ansatz.slice(0, 1), { zeile: 2, formel: 91, ausdruck: 'Z1/0', variable: null }],
  menge: null,
};

/** Punkt 9: ChangeSet zu `beispielMengenansatzSetzen`: Menge 1,000 → 1,235 samt Ansatz; Summen wie `beispielChangeSet`. */
export const beispielChangeSetMengenansatz: LvChangeSet = {
  ...beispielChangeSet,
  knoten: {
    hinzugefuegt: [],
    geaendert: [
      { vorher: { ...position, menge: '1.000' as Menge }, nachher: { ...position, mengenansatz: ansatz } },
    ],
    entfernt: [],
  },
};

/** Punkt 9, Lesart (a): `MengeAendern` an der Position mit Ansatz; der Ansatz fällt im selben ChangeSet weg. */
export const beispielMengeAendernMitAnsatz: MengeAendern = {
  art: 'MengeAendern',
  positionId: posId,
  menge: '1.000' as Menge,
};

/** Punkt 9, Lesart (a): ChangeSet zu `beispielMengeAendernMitAnsatz`; `nachher` trägt kein `mengenansatz` mehr. */
export const beispielChangeSetMengeOhneAnsatz: LvChangeSet = {
  ...beispielChangeSet,
  knoten: {
    hinzugefuegt: [],
    geaendert: [
      { vorher: { ...position, mengenansatz: ansatz }, nachher: { ...position, menge: '1.000' as Menge } },
    ],
    entfernt: [],
  },
  summen: {
    positionen: [{ positionId: posId, gesamtpreis: '10.00' as Betrag, gehtInSummeEin: true }],
    gliederungen: [{ gliederungId: titelId, summe: '10.00' as Betrag }],
    gesamt: gesamtsummen('10.00', '0.00', '10.00', '1.90', '11.90'),
    vorher: {
      positionen: [{ positionId: posId, gesamtpreis: '12.35' as Betrag, gehtInSummeEin: true }],
      gliederungen: [{ gliederungId: titelId, summe: '12.35' as Betrag }],
      gesamt: g1235,
      entfernt: keinGesamt,
    },
  },
};

// --- v1.4 (Ticket 70) -------------------------------------------------------------------------------------------

/** Punkt 1: das Beispiel-Auftrags-LV in der Liste des Projekts (ohne Knoten). */
export const beispielAuftragsLvUebersicht: AuftragsLvUebersicht = {
  id: beispielAuftragsLv.id,
  name: beispielAuftragsLv.name,
  leistungsverzeichnisId: beispielAuftragsLv.leistungsverzeichnisId,
  angebotId: beispielAuftragsLv.angebotId,
};

const nachtragsLvId = '019b76e9-0000-7000-8000-000000000100' as LeistungsverzeichnisId;
const nachtragTitelId = '019b76e9-0000-7000-8000-000000000101' as TitelId;
const nachtragsTitelId = '019b76e9-0000-7000-8000-000000000102' as TitelId;
const nachtragPos1Id = '019b76e9-0000-7000-8000-000000000103' as PositionId;
const nachtragPos2Id = '019b76e9-0000-7000-8000-000000000104' as PositionId;

/**
 * Punkt 2 (D-35): Übernahme des Nachtrags N01 mit zwei Positionen. Die neue Gliederung „Nachtrag N01“ (neue Kennung,
 * nächste freie OZ `02`) kommt hinter den einen Titel der obersten Ebene; darunter der Titel des Nachtrags-LV und seine
 * Positionen mit ihren Kennungen aus dem Nachtrags-LV und den EP des Nachtragsangebots (2 × 15 = 30,00; 1 × 20 = 20,00).
 */
export const beispielNachtragUebernehmen: NachtragUebernehmen = {
  art: 'NachtragUebernehmen',
  nachtragLvId: nachtragsLvId,
  knoten: [
    {
      art: 'titel',
      id: nachtragTitelId,
      elternId: auftragsId,
      reihenfolge: 1,
      ordnungszahl: '02' as Ordnungszahl,
      kurztext: 'Nachtrag N01',
    },
    {
      art: 'titel',
      id: nachtragsTitelId,
      elternId: nachtragTitelId,
      reihenfolge: 0,
      ordnungszahl: '02.01' as Ordnungszahl,
      kurztext: 'Mehrleistungen (erfunden)',
    },
    {
      ...position,
      id: nachtragPos1Id,
      elternId: nachtragsTitelId,
      reihenfolge: 0,
      ordnungszahl: '02.01.0010' as Ordnungszahl,
      kurztext: 'Zusätzliche Leistung 1',
      menge: '2.000' as Menge,
      einheitspreis: '15.000' as Einheitspreis,
    },
    {
      ...position,
      id: nachtragPos2Id,
      elternId: nachtragsTitelId,
      reihenfolge: 1,
      ordnungszahl: '02.01.0020' as Ordnungszahl,
      kurztext: 'Zusätzliche Leistung 2',
      menge: '1.000' as Menge,
      einheitspreis: '20.000' as Einheitspreis,
    },
  ],
};

/**
 * Punkt 2: ChangeSet zu `beispielNachtragUebernehmen` am Beispiel-Auftrags-LV (12,35 vorher): Netto 62,35, MwSt
 * round(62,35 × 19 %, 2) = 11,85, Brutto 74,20. Die Summen der neuen Gliederungen sind neu (kein `vorher`).
 */
export const beispielChangeSetNachtragUebernehmen: AuftragsLvChangeSet = {
  art: 'auftrags-leistungsverzeichnis',
  auftragsLeistungsverzeichnisId: auftragsId,
  kopf: null,
  knoten: { hinzugefuegt: beispielNachtragUebernehmen.knoten, geaendert: [], entfernt: [] },
  summen: {
    positionen: [
      { positionId: nachtragPos1Id, gesamtpreis: '30.00' as Betrag, gehtInSummeEin: true },
      { positionId: nachtragPos2Id, gesamtpreis: '20.00' as Betrag, gehtInSummeEin: true },
    ],
    gliederungen: [
      { gliederungId: nachtragTitelId, summe: '50.00' as Betrag },
      { gliederungId: nachtragsTitelId, summe: '50.00' as Betrag },
    ],
    gesamt: gesamtsummen('62.35', '0.00', '62.35', '11.85', '74.20'),
    vorher: { positionen: [], gliederungen: [], gesamt: g1235, entfernt: keinGesamt },
  },
};

/** Punkt 3 (D-35): Das Nachtrags-LV N01 gehört zum Beispiel-Auftrags-LV; der Auftraggeber hat beauftragt. */
export const beispielNachtragsangabenSetzen: NachtragsangabenSetzen = {
  art: 'NachtragsangabenSetzen',
  nachtrag: { auftragsLvId: auftragsId, nummer: 'N01', status: 'beauftragt' },
};

const nachtragsKopf: LvKopf = {
  ...lvKopf,
  id: nachtragsLvId,
  name: 'Nachtrag N01 (erfunden)',
  nachtrag: { auftragsLvId: auftragsId, nummer: 'N01', status: 'angeboten' },
};

/**
 * Punkt 3: ChangeSet zu `beispielNachtragsangabenSetzen` am Nachtrags-LV, das vorher `angeboten` war. Nur der Kopf ändert
 * sich; die App schreibt es nach `beispielNachtragUebernehmen` (D-35).
 */
export const beispielChangeSetNachtragBeauftragt: LvChangeSet = {
  art: 'leistungsverzeichnis',
  leistungsverzeichnisId: nachtragsLvId,
  kopf: {
    vorher: nachtragsKopf,
    nachher: {
      ...nachtragsKopf,
      nachtrag: { auftragsLvId: auftragsId, nummer: 'N01', status: 'beauftragt' },
    },
  },
  knoten: { hinzugefuegt: [], geaendert: [], entfernt: [] },
  summen: {
    positionen: [],
    gliederungen: [],
    gesamt: null,
    vorher: { positionen: [], gliederungen: [], gesamt: null, entfernt: keinGesamt },
  },
};

/** Kostengruppe 330 (erfunden; nur die Nummer, keine Bezeichnung der Norm, G-16). */
const kg330 = '330' as Kostengruppennummer;

/** Punkt 4: Die Position des Beispiel-Auftrags-LV bekommt die Kostengruppe 330 (derselbe Befehl gilt im LV). */
export const beispielKostengruppeSetzen: KostengruppeSetzen = {
  art: 'KostengruppeSetzen',
  positionId: posId,
  kostengruppe: kg330,
};

/** Punkt 4: ChangeSet am Auftrags-LV zu `beispielKostengruppeSetzen`: eine Knotenänderung, keine Summen. */
export const beispielChangeSetKostengruppe: AuftragsLvChangeSet = {
  art: 'auftrags-leistungsverzeichnis',
  auftragsLeistungsverzeichnisId: auftragsId,
  kopf: null,
  knoten: {
    hinzugefuegt: [],
    geaendert: [{ vorher: position, nachher: { ...position, kostengruppe: kg330 } }],
    entfernt: [],
  },
  summen: {
    positionen: [],
    gliederungen: [],
    gesamt: null,
    vorher: { positionen: [], gliederungen: [], gesamt: null, entfernt: keinGesamt },
  },
};

/** Summen eines ChangeSets, das keine Summe berührt (Kopf- und Textfelder). */
const keineSummen = {
  positionen: [],
  gliederungen: [],
  gesamt: null,
  vorher: { positionen: [], gliederungen: [], gesamt: null, entfernt: keinGesamt },
} as const;

/** Punkt 5 (D-40): Das Beispiel-LV wird Muster-LV; seine Positionen sind dann Textbausteine. */
export const beispielVorlageSetzen: VorlageSetzen = { art: 'VorlageSetzen', vorlage: true };

/** Punkt 5: ChangeSet zu `beispielVorlageSetzen`; nur der Kopf. `vorlage: false` wäre die Umkehrung (Feld fehlt). */
export const beispielChangeSetVorlage: LvChangeSet = {
  ...lvRahmen,
  kopf: { vorher: lvKopf, nachher: { ...lvKopf, vorlage: true } },
  knoten: { hinzugefuegt: [], geaendert: [], entfernt: [] },
  summen: keineSummen,
};

/** Punkt 5 (G-17): Der Text der Position stammt aus einem Muster-LV (Name erfunden). */
export const beispielTextquelleSetzen: TextquelleSetzen = {
  art: 'TextquelleSetzen',
  positionId: posId,
  textquelle: 'Muster-LV Rohbau (erfunden)',
};

const aufmass1Id = '019b76e9-0000-7000-8000-000000000110' as AufmassId;
const aufmass2Id = '019b76e9-0000-7000-8000-000000000111' as AufmassId;

/**
 * Punkt 6: Aufmaßblatt 1 zum Beispiel-Auftrags-LV nach der Übernahme von N01. Die Position `01.0010` mit Ansatz
 * (0,5 × 2 = 1,000), die Nachtragsposition `02.01.0010` von Hand mit 2,500 (mehr als 110 % der LV-Menge 2,000: ein
 * Soll/Ist-Befund, D-35). `02.01.0020` ist noch nicht aufgemessen.
 */
export const beispielAufmass1: Aufmass = {
  id: aufmass1Id,
  projektId: beispielAuftragsLv.projektId,
  auftragsLvId: auftragsId,
  nummer: 1,
  bezeichnung: 'Blatt 1 (erfunden)',
  datum: '2026-11-02',
  positionen: [
    {
      positionId: posId,
      mengenansatz: [{ zeile: 1, formel: 91, ausdruck: '0,5*2', variable: null }],
      menge: '1.000' as Menge,
    },
    { positionId: nachtragPos1Id, mengenansatz: null, menge: '2.500' as Menge },
  ],
};

/** Punkt 6: Aufmaßblatt 2 misst den Rest der Position `01.0010` auf (0,235); zusammen mit Blatt 1 also 1,235. */
export const beispielAufmass2: Aufmass = {
  ...beispielAufmass1,
  id: aufmass2Id,
  nummer: 2,
  bezeichnung: 'Blatt 2 (erfunden)',
  datum: '2026-11-09',
  positionen: [
    {
      positionId: posId,
      mengenansatz: [{ zeile: 1, formel: 91, ausdruck: '0,235', variable: null }],
      menge: '0.235' as Menge,
    },
  ],
};

/** Punkt 6: Blatt 1 anlegen (von Hand oder aus X31; Massenbefehl). */
export const beispielAufmassAnlegen: AufmassAnlegen = { art: 'AufmassAnlegen', aufmass: beispielAufmass1 };

/** Punkt 6: ChangeSet zu `beispielAufmassAnlegen`: das ganze Blatt, vorher keines. */
export const beispielChangeSetAufmassAnlegen: AufmassChangeSet = {
  art: 'aufmass',
  aufmassId: aufmass1Id,
  aufmass: { vorher: null, nachher: beispielAufmass1 },
};

/** Punkt 6: Korrektur auf Blatt 1: die Nachtragsposition hat 2,400 statt 2,500 (von Hand). */
export const beispielAufmasspositionSetzen: AufmasspositionSetzen = {
  art: 'AufmasspositionSetzen',
  position: { positionId: nachtragPos1Id, mengenansatz: null, menge: '2.400' as Menge },
};

/** Punkt 6: ChangeSet zur Korrektur: das ganze Blatt vorher und nachher; die Zeile bleibt an ihrer Stelle. */
export const beispielChangeSetAufmasspositionSetzen: AufmassChangeSet = {
  art: 'aufmass',
  aufmassId: aufmass1Id,
  aufmass: {
    vorher: beispielAufmass1,
    nachher: {
      ...beispielAufmass1,
      positionen: beispielAufmass1.positionen.map((p) =>
        p.positionId === nachtragPos1Id ? beispielAufmasspositionSetzen.position : p,
      ),
    },
  },
};

/** Punkt 5: ChangeSet zu `beispielTextquelleSetzen`; eine Knotenänderung ohne Summen. */
export const beispielChangeSetTextquelle: LvChangeSet = {
  ...lvRahmen,
  kopf: null,
  knoten: {
    hinzugefuegt: [],
    geaendert: [{ vorher: position, nachher: { ...position, textquelle: 'Muster-LV Rohbau (erfunden)' } }],
    entfernt: [],
  },
  summen: keineSummen,
};
