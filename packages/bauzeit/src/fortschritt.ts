// SPDX-License-Identifier: AGPL-3.0-or-later
// Fortschritt aus dem Leistungsstand (Ticket 109 Punkt 3; Glossar „Vorgangsbezug“, „Leistungsstand“): ein Vorschlag für
// `Vorgang.ist.fortschritt`, den die App anbietet und der Nutzer übernimmt (kein Befehl, nie still gesetzt). Gerechnet nur
// mit `dezimal` (N1), rein (A2). Den Leistungsstand liefert `abrechnung`, die Summen des Auftrags-LV der Kern; `bauzeit` liest
// beide über die Vertragstypen, ohne die Pakete zu importieren (A3).

import {
  alsDezimal,
  alsProzent,
  dividiere,
  multipliziere,
  summiereBetraege,
  vergleiche,
  vorzeichen,
} from '@tethys/dezimal';
import { NACHKOMMASTELLEN } from '@tethys/vertrag';
import type {
  AuftragsLvZustand,
  ElternId,
  Knoten,
  Leistungsstand,
  PositionId,
  Prozent,
  Vorgangsbezug,
} from '@tethys/vertrag';

function konstante<T>(e: { ok: true; wert: T } | { ok: false; fehler: { meldung: string } }): T {
  if (!e.ok) throw new Error(e.fehler.meldung);
  return e.wert;
}
const HUNDERT = konstante(alsDezimal('100.00'));
const NULL_PROZENT = konstante(alsProzent('0.00'));
const HUNDERT_PROZENT = konstante(alsProzent('100.00'));

/** Die Positionen, für die der Bezug steht: `null` alle, sonst die genannten und alle unter genannten Gliederungen. */
function bezogenePositionen(
  knoten: readonly Knoten[],
  knotenIds: Vorgangsbezug['knotenIds'],
): Set<PositionId> {
  const positionen = knoten.filter((k) => k.art === 'position');
  if (knotenIds === null) return new Set(positionen.map((p) => p.id));
  const genannt = new Set<string>(knotenIds);
  const eltern = new Map<string, ElternId>(knoten.map((k) => [k.id, k.elternId]));
  const bezogen = new Set<PositionId>();
  for (const p of positionen) {
    // Die Kette der Eltern endet an der Wurzel (dem LV), die kein Knoten ist.
    for (let id: string | undefined = p.id; id !== undefined; id = eltern.get(id)) {
      if (genannt.has(id)) {
        bezogen.add(p.id);
        break;
      }
    }
  }
  return bezogen;
}

/**
 * Vorschlag für den Fortschritt eines Vorgangs mit Bezug auf ein Auftrags-LV (D-109.7): Σ GP des Leistungsstands /
 * Σ GP der bezogenen Positionen × 100, kaufmännisch auf 2 Stellen (N2, N3). Beide Summen laufen über dieselben Positionen:
 * die bezogenen, die in die Summe des Auftrags-LV eingehen (`gehtInSummeEin`, mit GP); Bedarf ohne Gesamtbetrag und Wahl
 * zählen nicht (F4). Eine Position ohne Zeile im Leistungsstand zählt mit 0,00. Über 100 % (Mehrleistung) wird auf 100,00
 * begrenzt, unter 0 auf 0,00, weil `ist.fortschritt` nur 0,00 bis 100,00 zulässt.
 *
 * `null` (kein Vorschlag): kein Bezug, Bezug auf ein Ausschreibungs-LV oder ein anderes Auftrags-LV als das übergebene, oder
 * keine Soll-Summe über 0 (etwa nur unbekannte Knoten, die die App als Befund zeigt).
 */
export function fortschrittVorschlagen(
  bezug: Vorgangsbezug | null,
  auftragsLv: AuftragsLvZustand,
  leistungsstand: Leistungsstand,
): Prozent | null {
  const lv = auftragsLv.auftragsLeistungsverzeichnis;
  if (bezug?.art !== 'auftrags-leistungsverzeichnis' || bezug.id !== lv.id) return null;
  const bezogen = bezogenePositionen(lv.knoten, bezug.knotenIds);
  const soll = auftragsLv.summen.positionen.filter(
    (p) => bezogen.has(p.positionId) && p.gehtInSummeEin && p.gesamtpreis !== null,
  );
  const sollSumme = summiereBetraege(soll.flatMap((p) => (p.gesamtpreis === null ? [] : [p.gesamtpreis])));
  if (vorzeichen(sollSumme) <= 0) return null;
  const zaehlt = new Set(soll.map((p) => p.positionId));
  const ist = summiereBetraege(
    leistungsstand.positionen.filter((p) => zaehlt.has(p.positionId)).map((p) => p.gp),
  );
  const anteil = konstante(dividiere(multipliziere(ist, HUNDERT), sollSumme, NACHKOMMASTELLEN.prozent));
  if (vorzeichen(anteil) < 0) return NULL_PROZENT;
  if (vergleiche(anteil, HUNDERT_PROZENT) > 0) return HUNDERT_PROZENT;
  return konstante(alsProzent(anteil as string));
}
