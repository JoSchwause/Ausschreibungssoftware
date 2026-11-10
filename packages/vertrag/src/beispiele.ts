// SPDX-License-Identifier: AGPL-3.0-or-later
// Kompilierbare Beispiele zu `vertrag`. Nicht Teil des Pakets (nicht in `index.ts` exportiert).
//
// Die Typannahmen (`as`) stehen nur hier: Dezimalwerte erzeugt `dezimal`, Kennungen die App. Die Werte sind
// ein Auszug aus `fixtures/winzig.json` (erfunden).

import type {
  AngebotLoeschen,
  AuftragsLeistungsverzeichnisAnlegen,
  GliederungAnlegen,
  LeistungsverzeichnisLoeschen,
  LvBefehl,
  ProjektLoeschen,
} from './befehle';
import type { AuftragsLvChangeSet, LvChangeSet } from './changeset';
import type { LvAnsicht } from './ansicht';
import type { AngebotId, AuftragsLeistungsverzeichnisId } from './marken';
import type {
  AuftragsLeistungsverzeichnis,
  AuftragsLvKopf,
  Leistungsverzeichnis,
  LvInhalt,
  LvKopf,
  OzMaske,
  Position,
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

const position: Position = {
  art: 'position',
  id: posId,
  elternId: titelId,
  reihenfolge: 0,
  ordnungszahl: '01.0010' as Ordnungszahl,
  ozIndex: null,
  positionsart: 'normal',
  pauschal: false,
  bedarfMitGesamtbetrag: false,
  bezugspositionId: null,
  grundpositionId: null,
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
