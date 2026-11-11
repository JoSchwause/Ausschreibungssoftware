// SPDX-License-Identifier: AGPL-3.0-or-later
// Positionsfelder aus Vertrag v1.4 (Ticket 71): Form der Kostengruppe (C2, D-36 (4)) und der Textquelle (G-17, D-40) und
// die Normalform der Textquelle. Ein Blatt ohne Abhängigkeiten im Kern: Prüfung (`positionsdatenFehler`), Normalform
// mitgebrachter Positionen (`positionNormal`) und die Befehle (`KostengruppeSetzen`, `TextquelleSetzen`) fragen hier.

import type { Position } from '@tethys/vertrag';

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
