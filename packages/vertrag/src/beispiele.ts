// SPDX-License-Identifier: AGPL-3.0-or-later
// Kompilierbare Beispiele zu `vertrag`. Nicht Teil des Pakets (nicht in `index.ts` exportiert).
//
// Die Typannahmen (`as`) stehen nur hier: Dezimalwerte erzeugt `dezimal`, Kennungen die App. Die Werte sind
// ein Auszug aus `fixtures/winzig.json` (erfunden).

import type {
  AngebotLoeschen,
  AuftragsLeistungsverzeichnisAnlegen,
  GliederungAnlegen,
  KnotenEinfuegen,
  LeistungsverzeichnisLoeschen,
  LvBefehl,
  ProjektLoeschen,
} from './befehle';
import type { AuftragsLvChangeSet, LvChangeSet } from './changeset';
import type { Protokolleintrag } from './speicher';
import type { LvAnsicht } from './ansicht';
import type {
  AngebotId,
  AuftragsLeistungsverzeichnisId,
  BildId,
  LvStandId,
  NutzerId,
  PapierkorbEintragId,
  ProtokollId,
  Zeitstempel,
} from './marken';
import type {
  Angebotsposition,
  AuftragsLeistungsverzeichnis,
  AuftragsLvKopf,
  Leistungsverzeichnis,
  LvInhalt,
  LvKopf,
  Langtext,
  OzMaske,
  PapierkorbEintrag,
  Position,
  Positionsmerkmale,
  Zuschlag,
} from './modell';
import type { LeistungsverzeichnisId, Ordnungszahl, PositionId, ProjektId, TitelId } from './marken';
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
  summen: { positionen: [], gliederungen: [], gesamt: null },
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
const papierkorbEintrag: PapierkorbEintrag = {
  id: '019b76e9-0000-7000-8000-000000000070' as PapierkorbEintragId,
  knoten: [pos2],
};

/**
 * Nr. 4: In den Papierkorb legen. Knoten und Summen wie beim Entfernen (die Position fällt aus allen Summen), dazu
 * der neue Eintrag. Die Umkehrung ist `beispielChangeSetWiederherstellen`.
 */
export const beispielChangeSetHineinlegen: LvChangeSet = {
  ...beispielChangeSetEntfernen,
  papierkorb: { hinzugefuegt: [papierkorbEintrag], geaendert: [], entfernt: [] },
};

/** Nr. 4: Wiederherstellen an die alte Stelle. Knoten und Summen wie beim Hinzufügen, der Eintrag entfällt. */
export const beispielChangeSetWiederherstellen: LvChangeSet = {
  ...beispielChangeSetHinzufuegen,
  papierkorb: { hinzugefuegt: [], geaendert: [], entfernt: [papierkorbEintrag] },
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
