// SPDX-License-Identifier: AGPL-3.0-or-later
// GlobalId (Glossar; Ticket 107, Punkt 1): Die Marke `IfcGlobalId` liegt seit v1.6 in `vertrag` (Ticket 97); nur dieses
// Paket erzeugt sie, wie `kosten` die `Kostengruppennummer`. Wer eine GlobalId aus einem Befehl, dem Protokoll oder einer
// Datei liest (Kern, `bim`, `speicher`), prüft die Form selbst nach (vertrag).

import type { Ergebnis, IfcGlobalId } from '@tethys/vertrag';

/** Form einer GlobalId: genau 22 Zeichen aus dem IFC-Base64-Alphabet `0-9`, `A-Z`, `a-z`, `_`, `$`. */
const FORM = /^[0-9A-Za-z_$]{22}$/;

export interface GlobalIdFehler {
  readonly code: 'globalid-ungueltig';
  /** Meldung für Entwickler und Protokoll; die deutsche Anzeige entsteht in der Oberfläche. */
  readonly meldung: string;
}

/** Ist `text` eine GlobalId in Form? Der Text bleibt, wie er ist (kein Kürzen von Leerraum, keine Umwandlung). */
export function istGlobalId(text: string): text is IfcGlobalId {
  return FORM.test(text);
}

/**
 * Prüft die Form einer GlobalId und gibt sie als Marke zurück, etwa für eine GlobalId aus der 3D-Ansicht. Der Text wird nicht
 * verändert: Leerraum am Rand ist ein Fehler, keine Eingabehilfe (die GlobalId kommt aus einer Datei, nicht vom Nutzer).
 */
export function globalIdLesen(text: string): Ergebnis<IfcGlobalId, GlobalIdFehler> {
  if (istGlobalId(text)) return { ok: true, wert: text };
  return {
    ok: false,
    fehler: {
      code: 'globalid-ungueltig',
      meldung: `Keine GlobalId (22 Zeichen aus 0-9, A-Z, a-z, _ und $): ${JSON.stringify(text)}`,
    },
  };
}
