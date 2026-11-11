// SPDX-License-Identifier: AGPL-3.0-or-later
// v1.4: mechanisch angepasst, Folgeticket (Ticket 79). Vertrag v1.4 (Ticket 70) bringt Felder und Aggregate, die
// `speicher` noch nicht ablegt. Statt sie still zu verwerfen (Q5: Kopf und Knoten liegen spaltenweise), weist `anwenden`
// ein solches ChangeSet laut mit `unbekannt` ab, wie bis Ticket 57 `pruefeV13` (D-53.3). Ticket 79 legt die Felder ab und
// löscht diese Datei samt Aufruf und Test.

import type { Aenderungen, ChangeSet, Knoten, LvKopf } from '@tethys/vertrag';
import { abbruch } from './ergebnis';

/** Das erste Feld aus Vertrag v1.4 am LV-Kopf, das `speicher` noch nicht ablegt; `null`: keines. */
function kopfFeldV14(k: LvKopf | null): string | null {
  if (k?.nachtrag !== undefined) return 'nachtrag';
  if (k?.vorlage !== undefined) return 'vorlage';
  return null;
}

/** Das erste Feld aus Vertrag v1.4 an einer Position, das `speicher` noch nicht ablegt; `null`: keines. */
function knotenFeldV14(k: Knoten): string | null {
  if (k.art !== 'position') return null;
  if (k.kostengruppe !== undefined) return 'kostengruppe';
  if (k.textquelle !== undefined) return 'textquelle';
  return null;
}

/** Alle Knoten einer Änderungsliste, alte und neue Stände. */
const alleKnoten = (a: Aenderungen<Knoten>): Knoten[] => [
  ...a.hinzugefuegt,
  ...a.geaendert.flatMap((g) => [g.vorher, g.nachher]),
  ...a.entfernt,
];

/** Wirft `unbekannt`, wenn das ChangeSet etwas aus Vertrag v1.4 trägt, das `speicher` noch nicht ablegt. */
export function pruefeV14(cs: ChangeSet): void {
  const nein = (was: string): never =>
    abbruch('unbekannt', `${was} (Vertrag v1.4) speichert erst Ticket 79; es wurde nichts geschrieben.`);
  if (cs.art !== 'leistungsverzeichnis' && cs.art !== 'auftrags-leistungsverzeichnis') return;
  if (cs.art === 'leistungsverzeichnis' && cs.kopf !== null) {
    const feld = kopfFeldV14(cs.kopf.nachher) ?? kopfFeldV14(cs.kopf.vorher);
    if (feld !== null) nein(`Das Feld ${feld} am LV-Kopf`);
  }
  const korb = cs.art === 'leistungsverzeichnis' ? (cs.papierkorb ?? null) : null;
  const knoten = [
    ...alleKnoten(cs.knoten),
    ...(korb === null ? [] : [...korb.hinzugefuegt, ...korb.entfernt].flatMap((e) => e.knoten)),
  ];
  for (const k of knoten) {
    const feld = knotenFeldV14(k);
    if (feld !== null) nein(`Das Feld ${feld} an der Position ${k.id}`);
  }
}
