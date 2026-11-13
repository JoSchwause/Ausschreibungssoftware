// SPDX-License-Identifier: AGPL-3.0-or-later
// Eine Tabelle je `ChangeSet['art']` (Ticket 135, SA6): Kennung, Kopftabelle, Bezeichnung, Schreibweg und Import aus der
// Projektdatei an einer Stelle. `anwenden` (kern.ts), der Import (projektdatei.ts) und das Löschen des Projekts (abhängige
// Aggregate) lesen nur hier. Eine neue Aggregatart braucht einen Eintrag; der Typ `{ [A in Art]: … }` erzwingt ihn.
//
// Die Reihenfolge der Einträge ist die Reihenfolge der Abhängigkeiten: Der Import schreibt die Aggregate einer Datei in
// dieser Reihenfolge, damit jeder starke Verweis auf ein schon geschriebenes Aggregat zeigt (LV vor Angebot vor Auftrags-LV,
// Aufmaßblätter vor Rechnungen, Kostenermittlungen vor Honorarberechnungen, Auftrags-LV und Modelle vor Mängeln). Dieselbe
// Reihenfolge nennt der Dekoder als erlaubte Arten im Protokoll.

import type { Bauwerksmodell, ChangeSet, Projektdatei, ProjektId, Zeitstempel } from '@tethys/vertrag';
import type { Datenbank } from './sql';
import { LEERES_SUMMENVORHER } from './summenvorher';
import {
  schreibeLvStand,
  wendeAngebotAn,
  wendeAufmassAn,
  wendeAuftragsLvAn,
  wendeBautagebucheintragAn,
  wendeBauwerksmodellAn,
  wendeBauzeitenplanAn,
  wendeHonorarberechnungAn,
  wendeKostenermittlungAn,
  wendeLvAn,
  wendeMangelAn,
  wendeProjektAn,
  wendeRechnungAn,
  type AbhaengigeTabelle,
} from './schreiben';

/** Die Art eines Aggregats, wie in `ChangeSet` und `AggregatBezug`. */
export type Art = ChangeSet['art'];

/** Das ChangeSet einer Art. */
export type ChangeSetDer<A extends Art> = Extract<ChangeSet, { readonly art: A }>;

/** Was `speicher` über eine Aggregatart weiß. */
interface Aggregatart<A extends Art> {
  /** Kopftabelle; außer beim Projekt mit `id` und `projekt_id`. */
  readonly tabelle: string;
  /** Wie das Aggregat in Meldungen heißt (abhängige Aggregate beim Löschen des Projekts). */
  readonly bezeichnung: string;
  /** Die Kennung des Aggregats, auf das das ChangeSet wirkt (`AggregatBezug.id`). */
  kennung(cs: ChangeSetDer<A>): string;
  /** Schreibt das ChangeSet (in der Transaktion des Aufrufers); `wann` ist der Zeitpunkt des Protokolleintrags. */
  anwenden(db: Datenbank, cs: ChangeSetDer<A>, projektId: ProjektId, wann: Zeitstempel | undefined): void;
  /** Schreibt alle Aggregate dieser Art aus einer geprüften Projektdatei (Import, Reihenfolge innerhalb der Art). */
  ausDatei(db: Datenbank, d: Projektdatei, projektId: ProjektId): void;
}

/** Ein ganzes Aggregat neu anlegen: `vorher: null`. */
const neu = <T>(nachher: T): { readonly vorher: null; readonly nachher: T } => ({ vorher: null, nachher });

export const AGGREGATARTEN: { readonly [A in Art]: Aggregatart<A> } = {
  projekt: {
    tabelle: 'projekt',
    bezeichnung: 'Projekt',
    kennung: (cs) => cs.projektId,
    anwenden: (db, cs) => {
      wendeProjektAn(db, cs, abhaengigeDesProjekts());
    },
    ausDatei: (db, d, projektId) => {
      wendeProjektAn(db, { art: 'projekt', projektId, projekt: neu(d.projekt) }, abhaengigeDesProjekts());
    },
  },
  leistungsverzeichnis: {
    tabelle: 'leistungsverzeichnis',
    bezeichnung: 'LV',
    kennung: (cs) => cs.leistungsverzeichnisId,
    anwenden: (db, cs, projektId, wann) => {
      wendeLvAn(db, cs, projektId, wann);
    },
    ausDatei: (db, d, projektId) => {
      for (const z of d.leistungsverzeichnisse) {
        const { knoten, ...kopf } = z.leistungsverzeichnis;
        wendeLvAn(
          db,
          {
            art: 'leistungsverzeichnis',
            leistungsverzeichnisId: kopf.id,
            kopf: neu(kopf),
            knoten: { hinzugefuegt: knoten, geaendert: [], entfernt: [] },
            summen: { ...z.summen, vorher: LEERES_SUMMENVORHER },
            ...(z.papierkorb === undefined
              ? {}
              : { papierkorb: { hinzugefuegt: z.papierkorb, geaendert: [], entfernt: [] } }),
          },
          projektId,
          undefined,
          false, // Nachtragsangaben: Das Auftrags-LV kommt erst später (siehe `pruefeNachtragsbezuege`).
        );
      }
      // Die Stände gehören zum LV und kommen gleich danach (Schema 3).
      for (const s of d.lvStaende ?? []) schreibeLvStand(db, s);
    },
  },
  angebot: {
    tabelle: 'angebot',
    bezeichnung: 'Angebot',
    kennung: (cs) => cs.angebotId,
    anwenden: (db, cs, projektId) => {
      wendeAngebotAn(db, cs, projektId);
    },
    ausDatei: (db, d, projektId) => {
      for (const z of d.angebote) {
        const { positionen, ...kopf } = z.angebot;
        wendeAngebotAn(
          db,
          {
            art: 'angebot',
            angebotId: kopf.id,
            kopf: neu(kopf),
            positionen: { hinzugefuegt: positionen, geaendert: [], entfernt: [] },
            summen: { ...z.summen, vorher: LEERES_SUMMENVORHER },
          },
          projektId,
        );
      }
    },
  },
  'auftrags-leistungsverzeichnis': {
    tabelle: 'auftrags_lv',
    bezeichnung: 'Auftrags-LV',
    kennung: (cs) => cs.auftragsLeistungsverzeichnisId,
    anwenden: (db, cs, projektId) => {
      wendeAuftragsLvAn(db, cs, projektId);
    },
    ausDatei: (db, d, projektId) => {
      for (const z of d.auftragsLeistungsverzeichnisse) {
        const { knoten, ...kopf } = z.auftragsLeistungsverzeichnis;
        wendeAuftragsLvAn(
          db,
          {
            art: 'auftrags-leistungsverzeichnis',
            auftragsLeistungsverzeichnisId: kopf.id,
            kopf: neu(kopf),
            knoten: { hinzugefuegt: knoten, geaendert: [], entfernt: [] },
            summen: { ...z.summen, vorher: LEERES_SUMMENVORHER },
          },
          projektId,
        );
      }
    },
  },
  // Schema 5 (v1.4): Blätter vor Rechnungen (`aufmassIds`).
  aufmass: {
    tabelle: 'aufmass',
    bezeichnung: 'Aufmaßblatt',
    kennung: (cs) => cs.aufmassId,
    anwenden: (db, cs, projektId) => {
      wendeAufmassAn(db, cs, projektId);
    },
    ausDatei: (db, d, projektId) => {
      for (const z of d.aufmasse ?? [])
        wendeAufmassAn(db, { art: 'aufmass', aufmassId: z.aufmass.id, aufmass: neu(z.aufmass) }, projektId);
    },
  },
  rechnung: {
    tabelle: 'rechnung',
    bezeichnung: 'Rechnung',
    kennung: (cs) => cs.rechnungId,
    anwenden: (db, cs, projektId) => {
      wendeRechnungAn(db, cs, projektId);
    },
    ausDatei: (db, d, projektId) => {
      // Nach Nummer (Invariante der Freigaben, D-34 (7)); in der Datei stehen sie nach Kennung.
      const rechnungen = [...(d.rechnungen ?? [])].sort((a, b) => a.rechnung.nummer - b.rechnung.nummer);
      for (const z of rechnungen)
        wendeRechnungAn(
          db,
          { art: 'rechnung', rechnungId: z.rechnung.id, rechnung: neu(z.rechnung) },
          projektId,
        );
    },
  },
  kostenermittlung: {
    tabelle: 'kostenermittlung',
    bezeichnung: 'Kostenermittlung',
    kennung: (cs) => cs.kostenermittlungId,
    anwenden: (db, cs, projektId) => {
      wendeKostenermittlungAn(db, cs, projektId);
    },
    ausDatei: (db, d, projektId) => {
      for (const z of d.kostenermittlungen ?? [])
        wendeKostenermittlungAn(
          db,
          {
            art: 'kostenermittlung',
            kostenermittlungId: z.kostenermittlung.id,
            kostenermittlung: neu(z.kostenermittlung),
          },
          projektId,
        );
    },
  },
  // Schema 6 (v1.6): Modelle nach den Bytes (die schreibt der Import vorab) und vor den Mängeln, Vorgänger zuerst;
  // Honorarberechnungen nach den Kostenermittlungen, Mängel nach Auftrags-LV und Modellen (starke Verweise, D-97.6).
  bauwerksmodell: {
    tabelle: 'bauwerksmodell',
    bezeichnung: 'Bauwerksmodell',
    kennung: (cs) => cs.bauwerksmodellId,
    anwenden: (db, cs, projektId) => {
      wendeBauwerksmodellAn(db, cs, projektId);
    },
    ausDatei: (db, d, projektId) => {
      for (const m of vorgaengerZuerst((d.bauwerksmodelle ?? []).map((z) => z.bauwerksmodell))) {
        const { struktur, bauteile, ...kopf } = m;
        wendeBauwerksmodellAn(
          db,
          {
            art: 'bauwerksmodell',
            bauwerksmodellId: m.id,
            kopf: neu(kopf),
            inhalt: neu({ struktur, bauteile }),
          },
          projektId,
        );
      }
    },
  },
  bauzeitenplan: {
    tabelle: 'bauzeitenplan',
    bezeichnung: 'Bauzeitenplan',
    kennung: (cs) => cs.bauzeitenplanId,
    anwenden: (db, cs, projektId) => {
      wendeBauzeitenplanAn(db, cs, projektId);
    },
    ausDatei: (db, d, projektId) => {
      for (const z of d.bauzeitenplaene ?? [])
        wendeBauzeitenplanAn(
          db,
          {
            art: 'bauzeitenplan',
            bauzeitenplanId: z.bauzeitenplan.id,
            bauzeitenplan: neu(z.bauzeitenplan),
          },
          projektId,
        );
    },
  },
  honorarberechnung: {
    tabelle: 'honorarberechnung',
    bezeichnung: 'Honorarberechnung',
    kennung: (cs) => cs.honorarberechnungId,
    anwenden: (db, cs, projektId) => {
      wendeHonorarberechnungAn(db, cs, projektId);
    },
    ausDatei: (db, d, projektId) => {
      for (const z of d.honorarberechnungen ?? [])
        wendeHonorarberechnungAn(
          db,
          {
            art: 'honorarberechnung',
            honorarberechnungId: z.honorarberechnung.id,
            honorarberechnung: neu(z.honorarberechnung),
          },
          projektId,
        );
    },
  },
  mangel: {
    tabelle: 'mangel',
    bezeichnung: 'Mangel',
    kennung: (cs) => cs.mangelId,
    anwenden: (db, cs, projektId) => {
      wendeMangelAn(db, cs, projektId);
    },
    ausDatei: (db, d, projektId) => {
      for (const z of d.maengel ?? [])
        wendeMangelAn(db, { art: 'mangel', mangelId: z.mangel.id, mangel: neu(z.mangel) }, projektId);
    },
  },
  bautagebucheintrag: {
    tabelle: 'bautagebucheintrag',
    bezeichnung: 'Bautagebucheintrag',
    kennung: (cs) => cs.bautagebucheintragId,
    anwenden: (db, cs, projektId) => {
      wendeBautagebucheintragAn(db, cs, projektId);
    },
    ausDatei: (db, d, projektId) => {
      for (const z of d.bautagebuch ?? [])
        wendeBautagebucheintragAn(
          db,
          {
            art: 'bautagebucheintrag',
            bautagebucheintragId: z.bautagebucheintrag.id,
            bautagebucheintrag: neu(z.bautagebucheintrag),
          },
          projektId,
        );
    },
  },
};

/** Alle Arten in der Reihenfolge der Tabelle (der Abhängigkeiten). */
export const AGGREGATART_NAMEN = Object.keys(AGGREGATARTEN) as readonly Art[];

/**
 * Der Eintrag zur Art des ChangeSets, gelesen als Eintrag aller Arten. Die Umwandlung ist die einzige Stelle, an der der Typ
 * nicht folgt: TypeScript verbindet `cs.art` nicht mit dem Typ von `cs`; der Schlüssel der Tabelle ist aber genau `cs.art`.
 */
const eintragZu = (cs: ChangeSet): Aggregatart<Art> => AGGREGATARTEN[cs.art] as unknown as Aggregatart<Art>;

/** Das Aggregat, auf das ein ChangeSet wirkt (Art und Kennung wie in `AggregatBezug`). */
export function aggregatDes(cs: ChangeSet): { art: Art; id: string } {
  return { art: cs.art, id: eintragZu(cs).kennung(cs) };
}

/** Schreibt ein ChangeSet über den Eintrag seiner Art (in der Transaktion des Aufrufers). */
export function wendeAn(
  db: Datenbank,
  cs: ChangeSet,
  projektId: ProjektId,
  wann: Zeitstempel | undefined,
): void {
  eintragZu(cs).anwenden(db, cs, projektId, wann);
}

/** Schreibt alle Aggregate einer geprüften Projektdatei, Art für Art in der Reihenfolge der Tabelle. */
export function schreibeAggregateDerDatei(db: Datenbank, d: Projektdatei, projektId: ProjektId): void {
  for (const art of AGGREGATART_NAMEN) AGGREGATARTEN[art].ausDatei(db, d, projektId);
}

/** Alle Arten außer dem Projekt hängen an einem Projekt; sie verhindern sein Löschen (v1.1a, kein Kaskadieren). */
function abhaengigeDesProjekts(): readonly AbhaengigeTabelle[] {
  return AGGREGATART_NAMEN.filter((a) => a !== 'projekt').map((a) => AGGREGATARTEN[a]);
}

/** Die Modelle in einer Reihenfolge, in der jeder Vorgänger vor seinem Nachfolger steht (sonst in der Reihenfolge der Datei). */
function vorgaengerZuerst(modelle: readonly Bauwerksmodell[]): Bauwerksmodell[] {
  const geschrieben = new Set<string>();
  const folge: Bauwerksmodell[] = [];
  let rest = [...modelle];
  while (rest.length > 0) {
    const bereit = rest.filter((m) => m.vorgaengerId === null || geschrieben.has(m.vorgaengerId));
    // Ein Vorgänger, den es in der Datei nicht gibt (oder ein Ring): Der erste übrige geht trotzdem, sein Anlegen weist ab.
    const jetzt = bereit.length > 0 ? bereit : rest.slice(0, 1);
    for (const m of jetzt) {
      folge.push(m);
      geschrieben.add(m.id);
    }
    rest = rest.filter((m) => !geschrieben.has(m.id));
  }
  return folge;
}
