// SPDX-License-Identifier: AGPL-3.0-or-later
// Der eine Schreibweg der Fachseiten (Ticket 123 Punkt 4, Ticket 131): Lauf des Ausführers → Protokolleintrag → Speichern
// mit einem Undo-Teil (A5, U7). Vorher stand derselbe Ablauf in `bim`, `bauzeit`, `honorar` und zweimal in `bauleitung`.

import type { Befehlsfehler, Ergebnis, ProjektId, Protokolleintrag } from '@tethys/vertrag';
import type { Teil } from '../historie/historie';
import { befehlswegFuer, eintrag, speichern, Sitzung, type Lauf, type Umgebung } from '../lv/befehlsweg';

/**
 * Schreibt das Ergebnis eines Ausführers: Hat er abgewiesen, kommt die Abweisung zurück; sonst gehen Protokolleintrag und
 * ChangeSet in den Speicher, und der neue Zustand entsteht erst danach aus `anwenden` (erst speichern, dann anzeigen, Q5).
 */
export async function befehlSchreiben<Z, CS extends Teil['changeSet']>(
  u: Umgebung,
  projektId: ProjektId,
  befehl: Protokolleintrag['befehl'],
  lauf: Ergebnis<CS, Befehlsfehler>,
  aggregat: (cs: CS) => Protokolleintrag['aggregat'],
  anwenden: (cs: CS) => Z,
): Promise<Lauf<Z>> {
  if (!lauf.ok) return { ok: false, abweisung: { art: 'befehl', fehler: lauf.fehler } };
  const cs = lauf.wert;
  return speichern(u, eintrag(u, projektId, aggregat(cs), befehl), cs, () => anwenden(cs));
}

/** Eine Sitzung an einem Aggregat eines Projekts, deren Befehle `anwenden` schreibt. */
export function fachSitzung<Z, B>(
  u: Umgebung,
  projektId: ProjektId,
  zustand: Z,
  anwenden: (u: Umgebung, projektId: ProjektId, zustand: Z, befehl: B) => Promise<Lauf<Z>>,
): Sitzung<Z, B> {
  return new Sitzung(befehlswegFuer(u), zustand, (z, b) => anwenden(u, projektId, z, b));
}
