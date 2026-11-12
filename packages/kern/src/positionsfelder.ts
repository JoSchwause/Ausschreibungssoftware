// SPDX-License-Identifier: AGPL-3.0-or-later
// Positionsfelder aus Vertrag v1.4 (Ticket 71): Form der Kostengruppe (C2, D-36 (4)) und der Textquelle (G-17, D-40) und
// die Normalform der Textquelle; seit Vertrag v1.6 (Ticket 105) Form und Normalform der Bauteilzuordnungen (X1c, D-52). Ein
// Blatt ohne Abhängigkeiten im Kern: Prüfung (`positionsdatenFehler`), Normalform mitgebrachter Positionen
// (`positionNormal`), die Kopierhilfe und die Befehle (`KostengruppeSetzen`, `TextquelleSetzen`, `BauteileZuordnen`) fragen
// hier.

import { IFC_GLOBALID_MUSTER } from '@tethys/vertrag';
import type { Bauteilzuordnung, Position } from '@tethys/vertrag';

/**
 * Form der Kostengruppennummer (Glossar „Kostengruppe“, D-24; Vertrag `Kostengruppennummer`): genau drei Ziffern, die erste
 * nicht 0, also `100` bis `999`. Eine eigene kleine Prüfung, weil der Kern `kosten` nicht importiert (A3); erzeugt wird die
 * Nummer weiter nur von `kgLesen` in `kosten`. Der Kern prüft nach, weil Befehle und Knoten auch aus Protokoll und Datei
 * kommen (Vertrag `KostengruppeSetzen`; Nachtrag D-42 an Ticket 71; D-71.2).
 */
export const KOSTENGRUPPE_FORM = /^[1-9][0-9]{2}$/;

/** Formfehler einer Kostengruppennummer als Meldung, sonst `null`. */
export function kostengruppeFehler(wert: unknown): string | null {
  return typeof wert === 'string' && KOSTENGRUPPE_FORM.test(wert)
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
export function positionMitBauteilen(
  p: Position,
  bauteile: readonly Bauteilzuordnung[] | null | undefined,
): Position {
  if (bauteile !== null && bauteile !== undefined && bauteile.length > 0) return { ...p, bauteile };
  if (!('bauteile' in p)) return p;
  const ohne: { -readonly [K in keyof Position]?: Position[K] } = { ...p };
  delete ohne.bauteile;
  return ohne as Position;
}
