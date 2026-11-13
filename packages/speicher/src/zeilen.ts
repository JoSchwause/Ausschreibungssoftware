// SPDX-License-Identifier: AGPL-3.0-or-later
// Abbildung zwischen Tabellenzeilen und den Typen aus `vertrag`. Dezimalwerte sind Zeichenketten in
// kanonischer Punktnotation; sie werden unverändert als TEXT gespeichert und gelesen, nie gerechnet und nie
// in `number` gewandelt (N1). Die Casts auf die Zahlentypen sind deshalb reine Typmarken.

import type {
  Angebotsposition,
  Ansatzzeile,
  Arbeitskalender,
  Bautagebucheintrag,
  BautagebucheintragId,
  Bauzeitenplan,
  BauzeitenplanId,
  BauzeitenplanKopf,
  Honorarberechnung,
  HonorarberechnungId,
  Kalkulationsangaben,
  HonorarberechnungUebersicht,
  Honorarobjekt,
  Mangel,
  MangelId,
  Nebenkostenangabe,
  Vorgang,
  Bauteil,
  Bauteilzuordnung,
  Bauwerksmodell,
  BauwerksmodellId,
  BauwerksmodellKopf,
  BauwerksmodellUebersicht,
  IfcSchema,
  Strukturknoten,
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
import type { SqlWert, SqlZeile, Spaltenwerte } from './sql';

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

// --- Projekt- und Bieterangaben (Schema 7, v1.7a) -----------------------------------------------------------------

/** Ein Objekt, dessen Felder alle `null` sind (eine Anschrift oder Angaben ohne jeden Teil). */
const ganzNull = (o: unknown): boolean =>
  typeof o === 'object' && o !== null && !Array.isArray(o) && Object.values(o).every((w) => w === null);

/**
 * `angaben` an Projekt oder Bieter (Schema 7, v1.7a, D-127.4/D-127.5) als kanonisches JSON, `NULL` = fehlt. Angaben oder eine
 * Anschrift, deren Teile alle `null` sind, kennt der Vertrag nicht (dann fehlt der Block bzw. die Anschrift ist `null`): sie
 * blieben gespeichert, ließen sich aber nicht mehr als Projektdatei einlesen (Q5), also `unbekannt` wie `bauteile: []`.
 */
export function angabenSpalte(was: string, angaben: object | undefined): SqlWert {
  if (angaben === undefined) return null;
  if (ganzNull(angaben) || Object.values(angaben).some(ganzNull))
    abbruch(
      'unbekannt',
      `${was}: angaben ohne jeden Teil gibt es nicht (Vertrag v1.7a: dann fehlt das Feld bzw. null).`,
    );
  return jsonOderNull(angaben);
}

/** `angaben` aus der Zeile von Projekt oder Bieter: das Feld, oder gar keines bei `NULL`. */
export function angabenAusZeile<T>(z: SqlZeile): { angaben?: T } {
  return optionalesFeld(z, 'angaben', 'angaben') as { angaben?: T };
}

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
  'bauteile', // Schema 6 (v1.6)
  'kalkulation', // Schema 7 (v1.7a)
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
    abbruch(
      'unbekannt',
      `LV ${k.id}: vorlage ist nur true oder fehlt (Vertrag v1.4), nicht ${JSON.stringify(v)}.`,
    );
  return [jsonOderNull(k.nachtrag), v === true ? 1 : null];
}

/**
 * Preisspiegel-Einstellungen des LV (Schema 7, v1.7a, D-127.7): kanonisches JSON, `NULL` = fehlt (die Standardwerte gelten).
 * Nur am Kopf des Ausschreibungs-LV und nicht in der LV-Übersicht, darum getrennt von `lvKennzeichenAusZeile`.
 */
export const LV_PREISSPIEGEL_SPALTE = 'preisspiegel';

export const lvPreisspiegelSpalte = (k: LvKopf): SqlWert => jsonOderNull(k.preisspiegel);

export const lvPreisspiegelAusZeile = (z: SqlZeile): Pick<LvKopf, 'preisspiegel'> =>
  optionalesFeld(z, LV_PREISSPIEGEL_SPALTE, 'preisspiegel') as Pick<LvKopf, 'preisspiegel'>;

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

/**
 * Bauteilzuordnungen einer Position (Schema 6, v1.6) als kanonisches JSON, `NULL` = fehlt. Eine leere Liste kennt der Vertrag im
 * Zustand nicht („nie `[]`“, `Positionsdaten.bauteile`): Sie bliebe gespeichert, ließe sich aber nicht mehr als Projektdatei
 * importieren (Q5), also `unbekannt` wie `vorlage: false` (D-79.3).
 */
function bauteileSpalte(k: Extract<Knoten, { art: 'position' }>): SqlWert {
  const b: unknown = k.bauteile;
  if (Array.isArray(b) && b.length === 0)
    abbruch('unbekannt', `Position ${k.id}: bauteile ist nie leer (Vertrag v1.6: das Feld fehlt dann).`);
  return jsonOderNull(b);
}

/**
 * Kalkulationsangaben einer Position (Schema 7, v1.7a) als kanonisches JSON, `NULL` = fehlt. „Nie leer im Zustand“ (Vertrag:
 * ohne Ansatz und ohne Satz fehlt das Feld): eine leere bliebe gespeichert, ließe sich aber nicht mehr als Projektdatei
 * einlesen (Q5), also `unbekannt` wie `bauteile: []`.
 */
function kalkulationSpalte(k: Extract<Knoten, { art: 'position' }>): SqlWert {
  const kalk: unknown = k.kalkulation;
  if (kalk === undefined || kalk === null) return null;
  const { ansaetze, zuschlagssaetze } = kalk as Partial<Kalkulationsangaben>;
  if ((ansaetze ?? []).length === 0 && Object.keys(zuschlagssaetze ?? {}).length === 0)
    abbruch('unbekannt', `Position ${k.id}: kalkulation ist nie leer (Vertrag v1.7a: das Feld fehlt dann).`);
  return jsonOderNull(kalk);
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
        bauteileSpalte(k),
        kalkulationSpalte(k),
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
        ...(optionalesFeld(z, 'bauteile', 'bauteile') as { bauteile?: readonly Bauteilzuordnung[] }),
        ...(optionalesFeld(z, 'kalkulation', 'kalkulation') as { kalkulation?: Kalkulationsangaben }),
      };
    }
    default:
      return abbruch('datei-ungueltig', `Unbekannte Knotenart in der Datenbank: ${art}`);
  }
}

// --- Angebotspositionen -------------------------------------------------------------------------------------

/** Die Spalten einer Angebotsposition außer ihrem Schlüssel (`angebot_id`, `position_id`). */
export const ANGEBOTSPOSITION_SPALTEN = ['status', 'einheitspreis', 'epa', 'zuschlagssatz'] as const;

/** Die Werte der `ANGEBOTSPOSITION_SPALTEN` einer Angebotsposition. */
export function angebotspositionZeile(
  p: Angebotsposition,
): Spaltenwerte<(typeof ANGEBOTSPOSITION_SPALTEN)[number]> {
  return p.status === 'angeboten'
    ? {
        status: 'angeboten',
        einheitspreis: p.einheitspreis,
        epa: p.epa === null ? null : kanonischKompakt(p.epa),
        zuschlagssatz: p.zuschlagssatz ?? null,
      }
    : { status: 'nicht-angeboten', einheitspreis: null, epa: null, zuschlagssatz: null };
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

/** Die Zeile eines Aufmaßblatts. */
export const aufmassZeile = (a: Aufmass) =>
  ({
    id: a.id,
    projekt_id: a.projektId,
    auftrags_lv_id: a.auftragsLvId,
    nummer: a.nummer,
    bezeichnung: a.bezeichnung,
    datum: a.datum,
    positionen: kanonischKompakt(a.positionen),
  }) satisfies Spaltenwerte;

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

/** Die Zeile einer Rechnung: Kopfspalten und die übrigen Angaben als JSON. */
export function rechnungZeile(r: Rechnung) {
  const { id, projektId: projekt, auftragsLvId, nummer, ...angaben } = r;
  return {
    id,
    projekt_id: projekt,
    auftrags_lv_id: auftragsLvId,
    nummer,
    angaben: kanonischKompakt(angaben),
  } satisfies Spaltenwerte;
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

/** Die Zeile einer Kostenermittlung. */
export const kostenermittlungZeile = (k: Kostenermittlung) =>
  ({
    id: k.id,
    projekt_id: k.projektId,
    stufe: k.stufe,
    name: k.name,
    eintraege: kanonischKompakt(k.eintraege),
  }) satisfies Spaltenwerte;

/** Flache Kopie von `o` ohne die Felder `k` (Kopf eines Aggregats ohne seine lange Liste). */
export function ohne<T extends object, K extends keyof T>(o: T, ...k: readonly K[]): Omit<T, K> {
  const kopie: Partial<T> = { ...o };
  for (const f of k) Reflect.deleteProperty(kopie, f);
  return kopie as Omit<T, K>;
}

// --- Bauwerksmodell (Schema 6, v1.6; D-51, D-54) ---------------------------------------------------------------------
//
// Der Kopf steht in Spalten (`bauwerksmodell`), Struktur und Bauteile als kanonisches JSON in `bauwerksmodell_inhalt`.

export function bauwerksmodellUebersichtAusZeile(z: SqlZeile): BauwerksmodellUebersicht {
  return {
    id: text(z, 'id') as BauwerksmodellId,
    projektId: projektId(z),
    name: text(z, 'name'),
    datei: {
      hash: text(z, 'datei_hash'),
      dateiname: text(z, 'datei_name'),
      groesse: ganzzahl(z, 'datei_groesse'),
    },
    schema: text(z, 'schema') as IfcSchema,
    vorgaengerId: textOderNull(z, 'vorgaenger_id') as BauwerksmodellId | null,
    eingelesen: text(z, 'eingelesen'),
    anzahlBauteile: ganzzahl(z, 'anzahl_bauteile'),
  };
}

export function bauwerksmodellAusZeilen(kopf: SqlZeile, inhalt: SqlZeile): Bauwerksmodell {
  return {
    ...ohne(bauwerksmodellUebersichtAusZeile(kopf), 'anzahlBauteile'),
    struktur: jsonLesen(text(inhalt, 'struktur'), 'struktur') as Strukturknoten[],
    bauteile: jsonLesen(text(inhalt, 'bauteile'), 'bauteile') as Bauteil[],
  };
}

/** Die Kopfzeile eines Bauwerksmodells (Struktur und Bauteile stehen in `bauwerksmodell_inhalt`). */
export const bauwerksmodellZeile = (k: BauwerksmodellKopf, anzahlBauteile: number) =>
  ({
    id: k.id,
    projekt_id: k.projektId,
    name: k.name,
    datei_hash: k.datei.hash,
    datei_name: k.datei.dateiname,
    datei_groesse: k.datei.groesse,
    schema: k.schema,
    vorgaenger_id: k.vorgaengerId,
    eingelesen: k.eingelesen,
    anzahl_bauteile: anzahlBauteile,
  }) satisfies Spaltenwerte;

// --- Bauzeitenplan, Honorarberechnung, Mangel, Bautagebucheintrag (Schema 6, v1.6; D-57) -----------------------------------
//
// Wie Aufmaßblatt und Rechnung (D-79.1): Kopfspalten zum Suchen, Sortieren und für Fremdschlüssel, der Rest als kanonisches
// JSON. Gelesen ist das Aggregat kanonisch gleich dem geschriebenen.

export function bauzeitenplanKopfAusZeile(z: SqlZeile): BauzeitenplanKopf {
  return {
    id: text(z, 'id') as BauzeitenplanId,
    projektId: projektId(z),
    name: text(z, 'name'),
    projektbeginn: text(z, 'projektbeginn'),
    kalender: jsonLesen(text(z, 'kalender'), 'kalender') as Arbeitskalender,
  };
}

export const bauzeitenplanAusZeile = (z: SqlZeile): Bauzeitenplan => ({
  ...bauzeitenplanKopfAusZeile(z),
  vorgaenge: jsonLesen(text(z, 'vorgaenge'), 'vorgaenge') as Vorgang[],
});

/** Die Zeile eines Bauzeitenplans (die Vorgänge schon als kanonischer Text). */
export const bauzeitenplanZeile = (b: BauzeitenplanKopf, vorgaenge: string) =>
  ({
    id: b.id,
    projekt_id: b.projektId,
    name: b.name,
    projektbeginn: b.projektbeginn,
    kalender: kanonischKompakt(b.kalender),
    vorgaenge,
  }) satisfies Spaltenwerte;

export function honorarberechnungUebersichtAusZeile(z: SqlZeile): HonorarberechnungUebersicht {
  return {
    id: text(z, 'id') as HonorarberechnungId,
    projektId: projektId(z),
    name: text(z, 'name'),
    nebenkosten: jsonSpalte(z, 'nebenkosten') as Nebenkostenangabe | null,
    mwstSatz: text(z, 'mwst_satz') as Prozent,
  };
}

export const honorarberechnungAusZeile = (z: SqlZeile): Honorarberechnung => ({
  ...honorarberechnungUebersichtAusZeile(z),
  objekte: jsonLesen(text(z, 'objekte'), 'objekte') as Honorarobjekt[],
});

/** Die Zeile einer Honorarberechnung. */
export const honorarberechnungZeile = (h: Honorarberechnung) =>
  ({
    id: h.id,
    projekt_id: h.projektId,
    name: h.name,
    nebenkosten: jsonOderNull(h.nebenkosten),
    mwst_satz: h.mwstSatz,
    objekte: kanonischKompakt(h.objekte),
  }) satisfies Spaltenwerte;

/** Die Angaben eines Mangels: alles außer den Kopfspalten (`id`, `projektId`, `nummer`). */
type Mangelangaben = Omit<Mangel, 'id' | 'projektId' | 'nummer'>;

export const mangelAusZeile = (z: SqlZeile): Mangel => ({
  ...(jsonLesen(text(z, 'angaben'), 'angaben') as Mangelangaben),
  id: text(z, 'id') as MangelId,
  projektId: projektId(z),
  nummer: ganzzahl(z, 'nummer'),
});

/**
 * Die Zeile eines Mangels. Auftrags-LV und Modell stehen zusätzlich in eigenen Spalten (Fremdschlüssel, Index), damit ihr
 * Löschen die Verweise ohne `json_each` findet.
 */
export function mangelZeile(m: Mangel) {
  const { id, projektId: projekt, nummer, ...angaben } = m;
  return {
    id,
    projekt_id: projekt,
    nummer,
    auftrags_lv_id: m.auftragsLvId,
    bauwerksmodell_id: m.bauteil?.bauwerksmodellId ?? null,
    angaben: kanonischKompakt(angaben),
  } satisfies Spaltenwerte;
}

/** Die Angaben eines Bautagebucheintrags: alles außer den Kopfspalten (`id`, `projektId`, `datum`). */
type Tagebuchangaben = Omit<Bautagebucheintrag, 'id' | 'projektId' | 'datum'>;

export const bautagebucheintragAusZeile = (z: SqlZeile): Bautagebucheintrag => ({
  ...(jsonLesen(text(z, 'angaben'), 'angaben') as Tagebuchangaben),
  id: text(z, 'id') as BautagebucheintragId,
  projektId: projektId(z),
  datum: text(z, 'datum'),
});

/** Die Zeile eines Bautagebucheintrags. */
export function bautagebucheintragZeile(t: Bautagebucheintrag) {
  const { id, projektId: projekt, datum, ...angaben } = t;
  return { id, projekt_id: projekt, datum, angaben: kanonischKompakt(angaben) } satisfies Spaltenwerte;
}

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
