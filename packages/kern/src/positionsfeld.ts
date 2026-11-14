// SPDX-License-Identifier: AGPL-3.0-or-later
// Gemeinsamer Ablauf der Positionsfelder, die im LV und im Auftrags-LV gelten und auf keine Summe wirken (`KostengruppeSetzen`,
// `BauteileZuordnen`; Ticket 137 nach Ticket 122 Punkt 20: vorher zweimal fast gleich in `kostengruppe.ts` und `bauteile.ts`).
// Wie jeder Feldbefehl (D-71.3): Knoten vor Wert, eine Kennung ohne Knoten `knoten-unbekannt`, eine Gliederung oder ein
// Hinweistext `knotenart-unzulaessig`, dann die Form des Werts (`ungueltige-eingabe` mit dem Feld); derselbe Wert ist keine
// Änderung.

import type { Befehlsfehler, Ergebnis, Knoten, Position, PositionId } from '@tethys/vertrag';
import { nein, ok } from './fehler';

/** Die Änderung einer Position durch einen Feldbefehl; `null`: derselbe Wert, nichts ändert sich. */
export type Positionswechsel = { readonly vorher: Position; readonly nachher: Position } | null;

/** Was ein Positionsfeld ausmacht: Name im Fehlertext, Feld im Fehler, Wert, Form, Gleichheit und das Setzen. */
export interface Positionsfeld<B> {
  /** Wie der Fehlertext das Feld nennt („eine Kostengruppe“, „Bauteilzuordnungen“). */
  readonly name: string;
  /** `Befehlsfehler.feld` bei einem Formfehler. */
  readonly feld: string;
  /** Der Wert des Befehls; `null` entfernt das Feld und wird nicht auf Form geprüft. */
  readonly wert: (b: B) => unknown;
  readonly formfehler: (wert: unknown) => string | null;
  readonly gleich: (p: Position, b: B) => boolean;
  readonly setzen: (p: Position, b: B) => Position;
}

/** Was ein Feldbefehl an der Position ändert; `knotenVon` liefert den Knoten zur Kennung im Baum des Aggregats. */
export function positionsfeldWechsel<B extends { readonly positionId: PositionId }>(
  knotenVon: (kennung: string) => Knoten | undefined,
  b: B,
  f: Positionsfeld<B>,
): Ergebnis<Positionswechsel, Befehlsfehler> {
  const k = knotenVon(b.positionId);
  if (k === undefined) return nein('knoten-unbekannt', `Knoten unbekannt: ${b.positionId}`, b.positionId);
  if (k.art !== 'position')
    return nein(
      'knotenart-unzulaessig',
      `Nur eine Position trägt ${f.name}, nicht „${k.art}“.`,
      b.positionId,
    );
  const wert = f.wert(b);
  if (wert !== null) {
    const meldung = f.formfehler(wert);
    if (meldung !== null) return nein('ungueltige-eingabe', meldung, b.positionId, f.feld);
  }
  if (f.gleich(k, b)) return ok(null);
  return ok({ vorher: k, nachher: f.setzen(k, b) });
}
