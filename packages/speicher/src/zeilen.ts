// SPDX-License-Identifier: AGPL-3.0-or-later
// Abbildung zwischen Tabellenzeilen und den Typen aus `vertrag`. Dezimalwerte sind Zeichenketten in
// kanonischer Punktnotation; sie werden unverändert als TEXT gespeichert und gelesen, nie gerechnet und nie
// in `number` gewandelt (N1). Die Casts auf die Zahlentypen sind deshalb reine Typmarken.

import type {
  Angebotsposition,
  Ansatzzeile,
  Aufmass,
  AufmassId,
  AufmassKopf,
  Aufmassposition,
  AuftragsLeistungsverzeichnisId,
  Betrag,
  BieterId,
  ElternId,
  Einheitspreis,
  Einheitspreisanteile,
  GliederungId,
  HinweistextId,
  Knoten,
  Kostenermittlung,
  KostenermittlungId,
  Kostenermittlungseintrag,
  Kostenermittlungsstufe,
  KostenermittlungUebersicht,
  Langtext,
  Leitbeschreibung,
  LeistungsverzeichnisId,
  LosId,
  LvInhaltKopf,
  LvKopf,
  Menge,
  Nachlass,
  Nachtragsangaben,
  Ordnungszahl,
  OzMaske,
  PositionId,
  Positionsmerkmale,
  ProjektId,
  Prozent,
  Rechnung,
  RechnungId,
  Gesamtsummen,
  TitelId,
  Zuschlag,
} from '@tethys/vertrag';
import { abbruch } from './ergebnis';
import { kanonischKompakt } from './kanonisch';
import type { SqlWert, SqlZeile } from './sql';

// --- Hilfen zum Lesen einer Zeile -----------------------------------------------------------------------------

export function text(z: SqlZeile, spalte: string): string {
  const w = z[spalte];
  if (typeof w !== 'string') return abbruch('datei-ungueltig', `Spalte ${spalte}: Text erwartet.`);
  return w;
}

export function textOderNull(z: SqlZeile, spalte: string): string | null {
  const w = z[spalte];
  if (w === null || w === undefined) return null;
  if (typeof w !== 'string') return abbruch('datei-ungueltig', `Spalte ${spalte}: Text oder NULL erwartet.`);
  return w;
}

export function ganzzahl(z: SqlZeile, spalte: string): number {
  const w = z[spalte];
  if (typeof w !== 'number') return abbruch('datei-ungueltig', `Spalte ${spalte}: Ganzzahl erwartet.`);
  return w;
}

const jsonLesen = (wert: string, spalte: string): unknown => {
  try {
    return JSON.parse(wert) as unknown;
  } catch {
    return abbruch('datei-ungueltig', `Spalte ${spalte}: kein gültiges JSON.`);
  }
};

// --- Nachlass (LV, Auftrags-LV, Angebot) --------------------------------------------------------------------

export function nachlassSpalten(n: Nachlass | null): [SqlWert, SqlWert] {
  return n === null ? [null, null] : [n.art, n.wert];
}

export function nachlassAusZeile(z: SqlZeile): Nachlass | null {
  const art = textOderNull(z, 'nachlass_art');
  const wert = textOderNull(z, 'nachlass_wert');
  if (art === null || wert === null) return null;
  return art === 'prozent'
    ? { art: 'prozent', wert: wert as Prozent }
    : { art: 'betrag', wert: wert as Betrag };
}

export const maskeAusZeile = (z: SqlZeile): OzMaske => jsonLesen(text(z, 'oz_maske'), 'oz_maske') as OzMaske;

// --- Knoten -----------------------------------------------------------------------------------------------------

export const KNOTEN_SPALTEN = [
  'aggregat_id',
  'id',
  'art',
  'eltern_id',
  'reihenfolge',
  'ordnungszahl',
  'oz_index',
  'kurztext',
  'merkmale',
  'zuschlag',
  'leitbeschreibung',
  'text_json',
  'menge',
  'einheit',
  'einheitspreis',
  'epa',
  'mengenansatz', // Schema 4 (v1.3)
  'kostengruppe', // Schema 5 (v1.4)
  'textquelle', // Schema 5 (v1.4)
] as const;

// --- JSON-Spalten (Schema 2): kanonisch kompakt geschrieben, `NULL` = fehlt ----------------------------------------

/** Wert als kanonisches JSON; `null` bzw. `undefined` (Feld fehlt) als `NULL`. */
export const jsonOderNull = (wert: unknown): string | null =>
  wert === null || wert === undefined ? null : kanonischKompakt(wert);

/** Liest eine JSON-Spalte, die `NULL` sein darf. */
export function jsonSpalte(z: SqlZeile, spalte: string): unknown {
  const w = textOderNull(z, spalte);
  return w === null ? null : jsonLesen(w, spalte);
}

/** Das Feld `spalte` → `name` mit dem Wert der JSON-Spalte, oder gar kein Feld bei `NULL` (optionale Felder). */
function optionalesFeld(z: SqlZeile, spalte: string, name: string): Record<string, unknown> {
  const w = jsonSpalte(z, spalte);
  return w === null ? {} : { [name]: w };
}

/** Das Feld `spalte` mit dem Text der Spalte, oder gar kein Feld bei `NULL` (Schema 5: Kostengruppe, Textquelle). */
function optionalerText<K extends string>(z: SqlZeile, spalte: K): { [P in K]?: never } {
  const w = textOderNull(z, spalte);
  return (w === null ? {} : { [spalte]: w }) as unknown as { [P in K]?: never };
}

/** Die optionalen Kopfdaten von LV und Auftrags-LV: Spalte und Feld (v1.1b, Punkt 6; Schema 4: v1.3, Punkte 2 und 6). */
const KOPFDATEN = [
  ['auftraggeber', 'auftraggeber'],
  ['vergabeinformationen', 'vergabeinformationen'],
  ['auftragnehmer', 'auftragnehmer'],
  ['epa_bezeichnungen', 'epaBezeichnungen'],
] as const;

type Kopfdaten = Pick<LvInhaltKopf, (typeof KOPFDATEN)[number][1]>;

/** Die Spalten der Kopfdaten, in der Reihenfolge von `kopfdatenSpalten` (für INSERT und UPDATE). */
export const KOPFDATEN_SPALTEN: readonly string[] = KOPFDATEN.map(([spalte]) => spalte);

/** Kopfdaten als Spaltenwerte (kanonisches JSON, `NULL` = fehlt), in der Reihenfolge von `KOPFDATEN_SPALTEN`. */
export function kopfdatenSpalten(k: LvInhaltKopf): SqlWert[] {
  return KOPFDATEN.map(([, feld]) => jsonOderNull(k[feld]));
}

export function kopfdatenAusZeile(z: SqlZeile): Kopfdaten {
  return Object.assign(
    {},
    ...KOPFDATEN.map(([spalte, feld]) => optionalesFeld(z, spalte, feld)),
  ) as Kopfdaten;
}

/**
 * Nachtragsangaben und Kennzeichen „Muster-LV“ (Schema 5, v1.4): nur am Kopf des Ausschreibungs-LV (D-70.2). `nachtrag`
 * als kanonisches JSON, `vorlage` als `1`; `NULL` = fehlt. Eine andere Schreibweise als `true` für `vorlage` gibt es im
 * Vertrag nicht: Sie würde beim Speichern still zu „fehlt“ (Q5), also `unbekannt` (D-79.3).
 */
export const LV_KENNZEICHEN_SPALTEN = ['nachtrag', 'vorlage'] as const;

export function lvKennzeichenSpalten(k: LvKopf): [SqlWert, SqlWert] {
  const v: unknown = k.vorlage;
  if (v !== undefined && v !== true)
    abbruch('unbekannt', `LV ${k.id}: vorlage ist nur true oder fehlt (Vertrag v1.4), nicht ${String(v)}.`);
  return [jsonOderNull(k.nachtrag), v === true ? 1 : null];
}

export function lvKennzeichenAusZeile(z: SqlZeile): Pick<LvKopf, 'nachtrag' | 'vorlage'> {
  const nachtrag = jsonSpalte(z, 'nachtrag') as Nachtragsangaben | null;
  return {
    ...(nachtrag === null ? {} : { nachtrag }),
    ...(z['vorlage'] === 1 ? { vorlage: true } : {}),
  };
}

/** Getrennte Ausweise (v1.1b, Punkt 4): Betrag als TEXT, `NULL` = nicht berechnet (Feld fehlt). */
export function ausweisAusZeile(
  z: SqlZeile,
): Pick<Gesamtsummen, 'summeBedarfOhneGesamtbetrag' | 'summeWahl'> {
  const bedarf = textOderNull(z, 'summe_bedarf_ohne_gb') as Betrag | null;
  const wahl = textOderNull(z, 'summe_wahl') as Betrag | null;
  return {
    ...(bedarf === null ? {} : { summeBedarfOhneGesamtbetrag: bedarf }),
    ...(wahl === null ? {} : { summeWahl: wahl }),
  };
}

export function knotenZuBindung(aggregatId: string, k: Knoten): SqlWert[] {
  const kopf: SqlWert[] = [aggregatId, k.id, k.art, k.elternId, k.reihenfolge];
  switch (k.art) {
    case 'los':
    case 'titel':
      return [
        ...kopf,
        k.ordnungszahl,
        null,
        k.kurztext,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ];
    case 'hinweis':
      return [
        ...kopf,
        null,
        null,
        null,
        null,
        null,
        null,
        JSON.stringify(k.text),
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ];
    case 'position':
      return [
        ...kopf,
        k.ordnungszahl,
        k.ozIndex,
        k.kurztext,
        kanonischKompakt(k.merkmale),
        jsonOderNull(k.zuschlag),
        jsonOderNull(k.leitbeschreibung),
        JSON.stringify(k.langtext),
        k.menge,
        k.einheit,
        k.einheitspreis,
        k.epa === null ? null : kanonischKompakt(k.epa),
        jsonOderNull(k.mengenansatz),
        k.kostengruppe ?? null,
        k.textquelle ?? null,
      ];
  }
}

export function knotenAusZeile(z: SqlZeile): Knoten {
  const lage = {
    elternId: text(z, 'eltern_id') as ElternId,
    reihenfolge: ganzzahl(z, 'reihenfolge'),
  };
  const art = text(z, 'art');
  const ozOderNull = textOderNull(z, 'ordnungszahl') as Ordnungszahl | null;
  switch (art) {
    case 'los':
      return {
        ...lage,
        art: 'los',
        id: text(z, 'id') as LosId,
        ordnungszahl: ozOderNull,
        kurztext: text(z, 'kurztext'),
      };
    case 'titel':
      return {
        ...lage,
        art: 'titel',
        id: text(z, 'id') as TitelId,
        ordnungszahl: ozOderNull,
        kurztext: text(z, 'kurztext'),
      };
    case 'hinweis':
      return {
        ...lage,
        art: 'hinweis',
        id: text(z, 'id') as HinweistextId,
        text: jsonLesen(text(z, 'text_json'), 'text_json') as Langtext,
      };
    case 'position': {
      const epa = textOderNull(z, 'epa');
      return {
        ...lage,
        art: 'position',
        id: text(z, 'id') as PositionId,
        ordnungszahl: ozOderNull,
        ozIndex: textOderNull(z, 'oz_index'),
        merkmale: jsonLesen(text(z, 'merkmale'), 'merkmale') as Positionsmerkmale,
        zuschlag: jsonSpalte(z, 'zuschlag') as Zuschlag | null,
        ...(optionalesFeld(z, 'leitbeschreibung', 'leitbeschreibung') as {
          leitbeschreibung?: Leitbeschreibung;
        }),
        kurztext: text(z, 'kurztext'),
        langtext: jsonLesen(text(z, 'text_json'), 'text_json') as Langtext,
        menge: textOderNull(z, 'menge') as Menge | null,
        einheit: textOderNull(z, 'einheit'),
        einheitspreis: textOderNull(z, 'einheitspreis') as Einheitspreis | null,
        epa: epa === null ? null : (jsonLesen(epa, 'epa') as Einheitspreisanteile),
        ...(optionalesFeld(z, 'mengenansatz', 'mengenansatz') as { mengenansatz?: readonly Ansatzzeile[] }),
        ...optionalerText(z, 'kostengruppe'),
        ...optionalerText(z, 'textquelle'),
      };
    }
    default:
      return abbruch('datei-ungueltig', `Unbekannte Knotenart in der Datenbank: ${art}`);
  }
}

// --- Angebotspositionen -------------------------------------------------------------------------------------

/** Spalten `status`, `einheitspreis`, `epa`, `zuschlagssatz` einer Angebotsposition. */
export function angebotspositionWerte(p: Angebotsposition): [SqlWert, SqlWert, SqlWert, SqlWert] {
  return p.status === 'angeboten'
    ? ['angeboten', p.einheitspreis, p.epa === null ? null : kanonischKompakt(p.epa), p.zuschlagssatz ?? null]
    : ['nicht-angeboten', null, null, null];
}

export function angebotspositionAusZeile(z: SqlZeile): Angebotsposition {
  const positionId = text(z, 'position_id') as PositionId;
  if (text(z, 'status') === 'nicht-angeboten') return { positionId, status: 'nicht-angeboten' };
  const epa = textOderNull(z, 'epa');
  const satz = textOderNull(z, 'zuschlagssatz') as Prozent | null;
  return {
    positionId,
    status: 'angeboten',
    einheitspreis: text(z, 'einheitspreis') as Einheitspreis,
    epa: epa === null ? null : (jsonLesen(epa, 'epa') as Einheitspreisanteile),
    ...(satz === null ? {} : { zuschlagssatz: satz }),
  };
}

// --- Aufmaßblatt, Rechnung, Kostenermittlung (Schema 5, v1.4; D-79.1) ------------------------------------------------
//
// Kopfspalten zum Suchen, Sortieren und für Fremdschlüssel, der Rest als kanonisches JSON. Gelesen wird das Aggregat aus
// beiden zusammengesetzt; es ist dann kanonisch gleich dem geschriebenen (`gleich` in `schreiben.ts`).

/** Kopf eines Aufmaßblatts aus seinen Spalten (ohne `positionen`). */
export function aufmasskopfAusZeile(z: SqlZeile): AufmassKopf {
  return {
    id: text(z, 'id') as AufmassId,
    projektId: projektId(z),
    auftragsLvId: text(z, 'auftrags_lv_id') as AuftragsLeistungsverzeichnisId,
    nummer: ganzzahl(z, 'nummer'),
    bezeichnung: text(z, 'bezeichnung'),
    datum: textOderNull(z, 'datum'),
  };
}

export const aufmassAusZeile = (z: SqlZeile): Aufmass => ({
  ...aufmasskopfAusZeile(z),
  positionen: jsonLesen(text(z, 'positionen'), 'positionen') as Aufmassposition[],
});

/** Spalten `id, projekt_id, auftrags_lv_id, nummer, bezeichnung, datum, positionen`. */
export const aufmassWerte = (a: Aufmass): SqlWert[] => [
  a.id,
  a.projektId,
  a.auftragsLvId,
  a.nummer,
  a.bezeichnung,
  a.datum,
  kanonischKompakt(a.positionen),
];

/** Die Angaben einer Rechnung: alles außer den Kopfspalten (`id`, `projektId`, `auftragsLvId`, `nummer`). */
type Rechnungsangaben = Omit<Rechnung, 'id' | 'projektId' | 'auftragsLvId' | 'nummer'>;

export function rechnungAusZeile(z: SqlZeile): Rechnung {
  return {
    ...(jsonLesen(text(z, 'angaben'), 'angaben') as Rechnungsangaben),
    id: text(z, 'id') as RechnungId,
    projektId: projektId(z),
    auftragsLvId: text(z, 'auftrags_lv_id') as AuftragsLeistungsverzeichnisId,
    nummer: ganzzahl(z, 'nummer'),
  };
}

/** Spalten `id, projekt_id, auftrags_lv_id, nummer, angaben`. */
export function rechnungWerte(r: Rechnung): SqlWert[] {
  const { id, projektId: projekt, auftragsLvId, nummer, ...angaben } = r;
  return [id, projekt, auftragsLvId, nummer, kanonischKompakt(angaben)];
}

export function kostenermittlungUebersichtAusZeile(z: SqlZeile): KostenermittlungUebersicht {
  return {
    id: text(z, 'id') as KostenermittlungId,
    projektId: projektId(z),
    stufe: text(z, 'stufe') as Kostenermittlungsstufe,
    name: text(z, 'name'),
  };
}

export const kostenermittlungAusZeile = (z: SqlZeile): Kostenermittlung => ({
  ...kostenermittlungUebersichtAusZeile(z),
  eintraege: jsonLesen(text(z, 'eintraege'), 'eintraege') as Kostenermittlungseintrag[],
});

/** Spalten `id, projekt_id, stufe, name, eintraege`. */
export const kostenermittlungWerte = (k: Kostenermittlung): SqlWert[] => [
  k.id,
  k.projektId,
  k.stufe,
  k.name,
  kanonischKompakt(k.eintraege),
];

// --- Summen ---------------------------------------------------------------------------------------------------

export function gesamtAusZeile(z: SqlZeile): Gesamtsummen {
  return {
    netto: text(z, 'netto') as Betrag,
    nachlass: text(z, 'nachlass') as Betrag,
    nettoNachNachlass: text(z, 'netto_nach_nachlass') as Betrag,
    mwst: text(z, 'mwst') as Betrag,
    brutto: text(z, 'brutto') as Betrag,
    ...ausweisAusZeile(z),
  };
}

// --- Kennungen (nur Typmarken) -----------------------------------------------------------------------------

export const projektId = (z: SqlZeile, spalte = 'projekt_id'): ProjektId => text(z, spalte) as ProjektId;
export const lvId = (z: SqlZeile, spalte: string): LeistungsverzeichnisId =>
  text(z, spalte) as LeistungsverzeichnisId;
export const bieterId = (z: SqlZeile, spalte: string): BieterId => text(z, spalte) as BieterId;
export const gliederungId = (z: SqlZeile, spalte: string): GliederungId => text(z, spalte) as GliederungId;
