// SPDX-License-Identifier: AGPL-3.0-or-later
// Textquelle an der Position (Ticket 71, Vertrag v1.4; G-17, D-40): Normalform und `TextquelleSetzen`, ein Feldbefehl wie
// `KurztextAendern` (Ticket 27): rein (A2), eine Knotenänderung ohne Summen (A6), derselbe Wert liefert ein leeres
// ChangeSet, Text wird unverändert übernommen (kein Trimmen, U5). Einzige Normalisierung: `''` ist keine Quelle und wird
// wie `null` behandelt, das Feld fehlt danach (nie `''` im Zustand; wie `''` bei der Einheit, D-06).

import type {
  Befehlsfehler,
  Ergebnis,
  LvChangeSet,
  LvZustand,
  Position,
  TextquelleSetzen,
} from '@tethys/vertrag';
import { baueChangeSet } from './changeset';
import { nein, ok } from './fehler';
import { mitFeld } from './kopfdaten-befehle';
import { indexVon } from './struktur';

/** `''` → `null` (keine Quelle); jeder andere Text unverändert, auch nur Leerzeichen. */
export const textquelleNormal = (textquelle: string | null): string | null =>
  textquelle === '' ? null : textquelle;

/** Die Position mit normalisierter Textquelle (`''` fällt weg). Ändert sich nichts, kommt dasselbe Objekt zurück. */
export function positionMitTextquelle(p: Position): Position {
  return p.textquelle === '' ? mitFeld(p, 'textquelle', null) : p;
}

/** Form der Textquelle an einer mitgebrachten Position oder in einem Befehl: ein Text. Meldung oder `null`. */
export function textquelleFehler(wert: unknown): string | null {
  return typeof wert === 'string' ? null : 'Die Textquelle muss ein Text sein.';
}

/**
 * `TextquelleSetzen` (D-40): setzt die Textquelle einer Position; `null` und `''` entfernen sie. Fehler wie bei den
 * Feldbefehlen: `knoten-unbekannt`, `knotenart-unzulaessig` (nur eine Position trägt eine Textquelle; Hinweistexte nicht,
 * Offene Typfrage 4 in Ticket 70), `ungueltige-eingabe` mit `feld: 'textquelle'` für einen Wert, der kein Text ist.
 */
export function textquelleSetzen(z: LvZustand, b: TextquelleSetzen): Ergebnis<LvChangeSet, Befehlsfehler> {
  const lv = z.leistungsverzeichnis;
  const k = indexVon(lv.id, lv.knoten).byId.get(b.positionId);
  if (!k) return nein('knoten-unbekannt', `Knoten unbekannt: ${b.positionId}`, b.positionId);
  if (k.art !== 'position')
    return nein(
      'knotenart-unzulaessig',
      `Nur eine Position trägt eine Textquelle, nicht „${k.art}“.`,
      b.positionId,
    );
  if (b.textquelle !== null) {
    const f = textquelleFehler(b.textquelle);
    if (f !== null) return nein('ungueltige-eingabe', f, b.positionId, 'textquelle');
  }
  const wert = textquelleNormal(b.textquelle);
  if ((k.textquelle ?? null) === wert) return ok(baueChangeSet(z, {}));
  return ok(baueChangeSet(z, { geaendert: [{ vorher: k, nachher: mitFeld(k, 'textquelle', wert) }] }));
}
