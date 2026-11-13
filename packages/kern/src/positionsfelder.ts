// SPDX-License-Identifier: AGPL-3.0-or-later
// Positionsfelder aus Vertrag v1.4 (Ticket 71): Form der Kostengruppe (C2, D-36 (4)) und der Textquelle (G-17, D-40) und
// die Normalform der Textquelle; seit Vertrag v1.6 (Ticket 105) Form und Normalform der Bauteilzuordnungen (X1c, D-52); seit
// Vertrag v1.7a (Ticket 137, D-127.6) Form und Normalform der Kalkulationsangaben (E9). Ein Blatt im Kern (es braucht nur
// `mitFeld` aus `struktur.ts`): Prüfung (`positionsdatenFehler`), Normalform mitgebrachter Positionen (`positionNormal`), die
// Kopierhilfe und die Befehle (`KostengruppeSetzen`, `TextquelleSetzen`, `BauteileZuordnen`, `KalkulationSetzen`) fragen
// hier.

import { alsEinheitspreis, alsMenge, alsProzent } from '@tethys/dezimal';
import { IFC_GLOBALID_MUSTER, KOSTENGRUPPENNUMMER_MUSTER } from '@tethys/vertrag';
import type {
  Bauteilzuordnung,
  EpaArt,
  Kalkulationsangaben,
  Kalkulationsansatz,
  Kalkulationszuschlagssaetze,
  Position,
  Prozent,
} from '@tethys/vertrag';
import { mitFeld } from './struktur';

/** Die sechs Kostenarten der Einheitspreisanteile (`EpaArt`), in Reihenfolge des Vertrags. */
export const ANTEILE = ['lohn', 'stoffe', 'geraete', 'nachunternehmer', 'sonstiges', 'frei'] as const;
export type Anteil = (typeof ANTEILE)[number];
const KOSTENARTEN: ReadonlySet<unknown> = new Set<EpaArt>(ANTEILE);

/**
 * Form der Kostengruppennummer (Glossar „Kostengruppe“, D-24; Vertrag `Kostengruppennummer`): genau drei Ziffern, die erste
 * nicht 0, also `100` bis `999`. Seit Vertrag v1.7a die Konstante des Vertrags (`KOSTENGRUPPENNUMMER_MUSTER`, D-127.12),
 * hier unter dem alten Namen, bis `speicher` und `gaeb` sie selbst aus dem Vertrag nehmen. Der Kern prüft nach, weil Befehle
 * und Knoten auch aus Protokoll und Datei kommen (Vertrag `KostengruppeSetzen`; Nachtrag D-42 an Ticket 71; D-71.2).
 */
export const KOSTENGRUPPE_FORM: RegExp = KOSTENGRUPPENNUMMER_MUSTER;

/** Formfehler einer Kostengruppennummer als Meldung, sonst `null`. */
export function kostengruppeFehler(wert: unknown): string | null {
  return typeof wert === 'string' && KOSTENGRUPPENNUMMER_MUSTER.test(wert)
    ? null
    : 'Die Kostengruppe ist eine dreistellige Nummer von 100 bis 999 (Glossar „Kostengruppe“).';
}

/** Form der Textquelle an einer mitgebrachten Position oder in einem Befehl: ein Text. Meldung oder `null`. */
export function textquelleFehler(wert: unknown): string | null {
  return typeof wert === 'string' ? null : 'Die Textquelle muss ein Text sein.';
}

/** `''` ist keine Quelle und wird `null` (Vertrag `TextquelleSetzen`); jeder andere Text bleibt, auch nur Leerzeichen (U5). */
export const textquelleNormal = (textquelle: string | null): string | null =>
  textquelle === '' ? null : textquelle;

/**
 * Die Position ohne leere Textquelle: `''` fällt weg, das Feld fehlt danach (nie `''` im Zustand; D-71.4). Ändert sich
 * nichts, kommt dasselbe Objekt zurück.
 */
export function positionMitTextquelle(p: Position): Position {
  if (p.textquelle !== '') return p;
  const ohne: { -readonly [K in keyof Position]?: Position[K] } = { ...p };
  delete ohne.textquelle;
  return ohne as Position;
}

/**
 * Formfehler einer Liste von Bauteilzuordnungen als Meldung, sonst `null` (Vertrag `BauteileZuordnen`, D-97.7): eine Liste
 * von Objekten, je GlobalId in Form (`IFC_GLOBALID_MUSTER` des Vertrags, D-66; gegen
 * ein Modell prüft der Kern nie, A3) und Mengenart als nicht leerer Text (Leerraum bleibt Text, U5), kein
 * Paar aus GlobalId und Mengenart zweimal. `[]` ist in Form (die Normalform lässt es weg).
 */
export function bauteileFehler(wert: unknown): string | null {
  if (!Array.isArray(wert)) return 'Die Bauteilzuordnungen sind eine Liste.';
  const paare = new Set<string>();
  for (const roh of wert as readonly unknown[]) {
    if (typeof roh !== 'object' || roh === null || Array.isArray(roh))
      return 'Eine Bauteilzuordnung ist ein Objekt mit GlobalId und Mengenart.';
    const b = roh as Partial<Record<keyof Bauteilzuordnung, unknown>>;
    if (typeof b.globalId !== 'string' || !IFC_GLOBALID_MUSTER.test(b.globalId))
      return 'Die GlobalId einer Bauteilzuordnung hat 22 Zeichen aus 0-9, A-Z, a-z, _ und $ (Glossar „GlobalId“).';
    if (typeof b.mengenart !== 'string' || b.mengenart === '')
      return 'Die Mengenart einer Bauteilzuordnung ist ein nicht leerer Text.';
    // Die GlobalId hat feste Länge, also ist der Schlüssel eindeutig.
    const paar = b.globalId + b.mengenart;
    if (paare.has(paar))
      return `Dasselbe Bauteil mit derselben Mengenart ist doppelt zugeordnet: ${b.globalId} (${b.mengenart}).`;
    paare.add(paar);
  }
  return null;
}

/** Gleiche Zuordnungen in gleicher Reihenfolge; fehlend (`undefined`), `null` und `[]` sind gleich (keine). */
export function bauteileGleich(
  a: readonly Bauteilzuordnung[] | null | undefined,
  b: readonly Bauteilzuordnung[] | null | undefined,
): boolean {
  const x = a ?? [];
  const y = b ?? [];
  if (x.length !== y.length) return false;
  for (let i = 0; i < x.length; i++) {
    const p = x[i];
    const q = y[i];
    if (p?.globalId !== q?.globalId || p?.mengenart !== q?.mengenart) return false;
  }
  return true;
}

/**
 * Die Position mit den Bauteilzuordnungen `bauteile`: `null`, `undefined` und `[]` entfernen das Feld (nie `[]` im Zustand,
 * Vertrag `Positionsdaten.bauteile`), sonst steht die Liste dort.
 */
export const positionMitBauteilen = (
  p: Position,
  bauteile: readonly Bauteilzuordnung[] | null | undefined,
): Position =>
  mitFeld(
    p,
    'bauteile',
    bauteile !== null && bauteile !== undefined && bauteile.length > 0 ? bauteile : null,
  );

// --- Kalkulationsangaben (Vertrag v1.7a, Ticket 137, D-127.6) ---------------------------------------------------------

/** Formfehler mit dem Pfad des Felds (`kalkulation.ansaetze.art` …) und einer Meldung. */
export interface Formfehler {
  readonly feld: string;
  readonly meldung: string;
}

const istObjekt = (w: unknown): w is Record<string, unknown> =>
  typeof w === 'object' && w !== null && !Array.isArray(w);

/** Ein Text, der die Prüfung `pruefe` besteht, oder `null`. */
const zahlOderNull = (w: unknown, pruefe: (t: string) => { readonly ok: boolean }): boolean =>
  w === null || (typeof w === 'string' && pruefe(w).ok);

/**
 * Form der Kalkulationsangaben (Vertrag `KalkulationSetzen`, D-127.6): ein Objekt mit einer Liste `ansaetze` (je Ansatz eine
 * Kostenart, die Bezeichnung als Text, Ansatzmenge kanonisch mit 3 Stellen oder `null`, Kostensatz kanonisch mit 3 Stellen
 * oder `null`) und `zuschlagssaetze` als Objekt (Schlüssel eine Kostenart, Wert kanonisch mit 2 Stellen). Ob die Werte zu
 * einem sinnvollen Preis führen, prüft der Kern nicht: negative Werte und Sätze unter −100 % sind Befunde der Kalkulation in
 * `kosten`, keine Sperre (U5). Die Felder heißen nach dem Pfad im Befehl, ohne Zeilennummer.
 */
export function kalkulationFehler(wert: unknown): Formfehler | null {
  const pfad = 'kalkulation';
  if (!istObjekt(wert)) return { feld: pfad, meldung: 'Die Kalkulation ist ein Objekt oder null.' };
  const ansaetze = wert['ansaetze'];
  if (!Array.isArray(ansaetze))
    return { feld: `${pfad}.ansaetze`, meldung: 'Die Kalkulationsansätze sind eine Liste.' };
  for (const roh of ansaetze as readonly unknown[]) {
    const zeile = `${pfad}.ansaetze`;
    if (!istObjekt(roh)) return { feld: zeile, meldung: 'Ein Kalkulationsansatz ist ein Objekt.' };
    if (!KOSTENARTEN.has(roh['art']))
      return {
        feld: `${zeile}.art`,
        meldung: `Keine Kostenart der Einheitspreisanteile: ${String(roh['art'])}`,
      };
    if (typeof roh['bezeichnung'] !== 'string')
      return {
        feld: `${zeile}.bezeichnung`,
        meldung: 'Die Bezeichnung eines Kalkulationsansatzes ist ein Text.',
      };
    if (!zahlOderNull(roh['ansatzmenge'], alsMenge))
      return {
        feld: `${zeile}.ansatzmenge`,
        meldung: 'Die Ansatzmenge ist null oder eine Menge mit 3 Stellen.',
      };
    if (!zahlOderNull(roh['kostensatz'], alsEinheitspreis))
      return {
        feld: `${zeile}.kostensatz`,
        meldung: 'Der Kostensatz ist null oder ein Preis mit 3 Stellen.',
      };
  }
  const saetze = wert['zuschlagssaetze'];
  if (!istObjekt(saetze))
    return { feld: `${pfad}.zuschlagssaetze`, meldung: 'Die Zuschlagssätze sind ein Objekt je Kostenart.' };
  for (const [art, satz] of Object.entries(saetze)) {
    const feld = `${pfad}.zuschlagssaetze.${art}`;
    if (!KOSTENARTEN.has(art)) return { feld, meldung: `Keine Kostenart der Einheitspreisanteile: ${art}` };
    if (typeof satz !== 'string' || !alsProzent(satz).ok)
      return { feld, meldung: 'Ein Zuschlagssatz ist ein Prozentsatz mit 2 Stellen.' };
  }
  return null;
}

/**
 * Normalform geprüfter Kalkulationsangaben: genau die Felder des Vertrags (was ein Aufrufer mehr mitbringt, fällt weg), die
 * Sätze in Reihenfolge der Kostenarten. Ohne Ansatz und ohne Satz ist es keine Kalkulation: `null` (das Feld fehlt dann an
 * der Position, D-127.6). Ein Satz `0.00` zählt als Satz (der Kern legt ab, was kommt).
 */
export function kalkulationNormal(k: Kalkulationsangaben): Kalkulationsangaben | null {
  const ansaetze = k.ansaetze.map((a): Kalkulationsansatz => ({
    art: a.art,
    bezeichnung: a.bezeichnung,
    ansatzmenge: a.ansatzmenge,
    kostensatz: a.kostensatz,
  }));
  const saetze: Partial<Record<EpaArt, Prozent>> = {};
  for (const art of ANTEILE) {
    const satz = k.zuschlagssaetze[art];
    if (satz !== undefined) saetze[art] = satz;
  }
  if (ansaetze.length === 0 && Object.keys(saetze).length === 0) return null;
  const zuschlagssaetze: Kalkulationszuschlagssaetze = saetze;
  return { ansaetze, zuschlagssaetze };
}

/** Die Position mit der Kalkulation `kalkulation`; `null` und `undefined` entfernen das Feld (es fehlt danach). */
export const positionMitKalkulation = (
  p: Position,
  kalkulation: Kalkulationsangaben | null | undefined,
): Position => mitFeld(p, 'kalkulation', kalkulation ?? null);

/** Ist `k` leer (kein Ansatz, kein Satz)? Eine solche Kalkulation steht nie im Zustand. */
export const kalkulationLeer = (k: Kalkulationsangaben): boolean =>
  k.ansaetze.length === 0 && Object.keys(k.zuschlagssaetze).length === 0;
