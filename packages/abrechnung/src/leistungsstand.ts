// SPDX-License-Identifier: AGPL-3.0-or-later
// Leistungsstand (Ticket 81, D-34 Schritt 1 bis 3; Vertragstyp `Leistungsstand` aus v1.4, D-70.7): die geprüfte Leistung je
// Position aus Auftrags-LV und Aufmaßblättern, dazu Nachlass und Netto nach Nachlass. Jeder Schritt auf 2 Stellen gerundet,
// dann verrechnet (N2, N5, E-07).
//
// (1) Leistung = Σ round(kumulierte Aufmaßmenge × Vertrags-EP, 2) je Position; eine Zuschlagsposition round(Satz × Σ GP
//     ihrer Bezugspositionen / 100, 2). Die Bezugsformen (Liste, Gliederung, Kennzeichnung; R1 bis R5) rechnet der Kern
//     (`zuschlagsbasen`) auf einem gedachten LV der ausgeführten Leistung: jede Position mit ihrer kumulierten Menge statt
//     der Vordersatzmenge, ohne die Merkmale Bedarf, Wahl und Pauschal. Grund: F4 regelt, was ein ausgeschriebenes LV
//     summiert; ausgeführte und aufgemessene Leistung wird bezahlt, auch an einer Bedarfsposition (D-34 (1)). Ohne die
//     Merkmale zählt eine aufgemessene Bedarfsposition auch in der Basis einer Zuschlagsposition, und eine nicht
//     aufgemessene Pauschalposition rechnet nicht mit der Menge 1 (Kern-Annahme D-37.1 für die Ausschreibung). Eine
//     Teilmenge einer Bezugsposition gilt höchstens bis zur aufgemessenen Menge (D-81.3).
// (2) Nachlass des Auftrags-LV: Prozent round(Leistung × Satz / 100, 2) über das ganze Auftrags-LV samt Nachtragspositionen;
//     absolut in einer Abschlagsrechnung min(round(Betrag × Leistung / Netto des Auftrags-LV vor Nachlass, 2), Betrag),
//     Netto 0 → 0 mit Befund; in der Schlussrechnung der volle Betrag.
// (3) Netto nach Nachlass = Leistung − Nachlass; negativ ist ein Befund (E-06).

import {
  NULL_BETRAG,
  addiere,
  dividiere,
  gesamtpreis,
  multipliziere,
  runden,
  subtrahiere,
  summiereBetraege,
  vergleiche,
  vorzeichen,
} from '@tethys/dezimal';
import { nachlassBetrag, zuschlagsbasen } from '@tethys/kern';
import type {
  Aufmass,
  AufmassId,
  AuftragsLvZustand,
  Betrag,
  Knoten,
  Leistungsstand,
  Menge,
  Position,
  PositionId,
  Rechnungsart,
} from '@tethys/vertrag';
import { dokumentreihenfolge } from './baum';

/**
 * Ein Befund zum Leistungsstand (U5: keine Sperre). Reihenfolge: Zeilenbefunde in der Reihenfolge der Blätter (nach
 * Blattnummer) und ihrer Zeilen, dann Positionsbefunde in Dokumentreihenfolge, zuletzt die Befunde der Abzugskette.
 * - `zeile-zaehlt-nicht`: Eine Zeile eines Blatts zählt nicht (Grund wie in `aufmassPruefen`: keine Position des
 *   Auftrags-LV, keine Position, Zuschlagsposition, keine Menge).
 * - `ohne-einheitspreis`: Die Position ist aufgemessen, hat aber keinen EP; ihr GP zählt 0,00 (D-34 (1)).
 * - `ohne-zuschlagssatz`: Eine Zuschlagsposition ohne Satz, deren Basis nicht 0,00 ist; ihr GP zählt 0,00 (Review D-42).
 * - `nachlass-ohne-basis`: Absoluter Nachlass in einer Abschlagsrechnung, aber das Auftrags-LV hat Netto 0,00; der
 *   anteilige Nachlass ist 0,00 (D-34 (2)).
 * - `netto-nach-nachlass-negativ`: Das Netto nach Nachlass ist negativ (E-06).
 */
export type Leistungsbefund =
  | {
      readonly code: 'zeile-zaehlt-nicht';
      readonly aufmassId: AufmassId;
      readonly positionId: PositionId;
      readonly grund: 'position-unbekannt' | 'keine-position' | 'zuschlagsposition' | 'menge-fehlt';
    }
  | { readonly code: 'ohne-einheitspreis'; readonly positionId: PositionId }
  | { readonly code: 'ohne-zuschlagssatz'; readonly positionId: PositionId }
  | { readonly code: 'nachlass-ohne-basis' }
  | { readonly code: 'netto-nach-nachlass-negativ' };

/** Der Leistungsstand und seine Befunde. */
export interface Leistungsergebnis {
  readonly leistungsstand: Leistungsstand;
  readonly befunde: readonly Leistungsbefund[];
}

/** Blätter in der Reihenfolge ihrer Nummer (dann Kennung), damit Befunde nicht von der Reihenfolge der Eingabe abhängen. */
const nachNummer = (aufmasse: readonly Aufmass[]): Aufmass[] =>
  [...aufmasse].sort((x, y) => x.nummer - y.nummer || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));

/**
 * Die kumulierte Menge je Position aus den Blättern (Σ der Zeilen mit Menge), samt den Zeilen, die nicht zählen. Gezählt
 * werden nur Zeilen zu Positionen des Auftrags-LV, die keine Zuschlagspositionen sind (Lesart an `Aufmassposition`).
 */
export function kumulierteMengen(
  knoten: ReadonlyMap<string, Knoten>,
  aufmasse: readonly Aufmass[],
): { mengen: ReadonlyMap<string, Menge>; befunde: Leistungsbefund[] } {
  const mengen = new Map<string, Menge>();
  const befunde: Leistungsbefund[] = [];
  for (const b of nachNummer(aufmasse)) {
    for (const z of b.positionen) {
      const k = knoten.get(z.positionId);
      const grund =
        k === undefined
          ? 'position-unbekannt'
          : k.art !== 'position'
            ? 'keine-position'
            : k.zuschlag !== null
              ? 'zuschlagsposition'
              : z.menge === null
                ? 'menge-fehlt'
                : null;
      if (grund !== null || z.menge === null) {
        befunde.push({
          code: 'zeile-zaehlt-nicht',
          aufmassId: b.id,
          positionId: z.positionId,
          grund: grund ?? 'menge-fehlt',
        });
        continue;
      }
      const bisher = mengen.get(z.positionId);
      mengen.set(z.positionId, bisher === undefined ? z.menge : addiere(bisher, z.menge));
    }
  }
  return { mengen, befunde };
}

/** Die kleinere zweier Mengen. */
const kleinere = (a: Menge, b: Menge): Menge => (vergleiche(a, b) <= 0 ? a : b);

/** Eine Position des gedachten LV der ausgeführten Leistung (siehe (1) oben). */
function ausgefuehrt(p: Position, mengen: ReadonlyMap<string, Menge>): Position {
  const merkmale = { ...p.merkmale, bedarf: null, wahl: null, pauschal: false };
  if (p.zuschlag === null) return { ...p, merkmale, menge: mengen.get(p.id) ?? null };
  const bezug = p.zuschlag.bezug;
  return {
    ...p,
    merkmale,
    menge: null,
    einheitspreis: null,
    zuschlag:
      bezug.art !== 'positionen'
        ? p.zuschlag
        : {
            ...p.zuschlag,
            bezug: {
              art: 'positionen',
              positionen: bezug.positionen.map((b) => {
                const m = mengen.get(b.positionId);
                return {
                  ...b,
                  teilmenge: b.teilmenge === null || m === undefined ? null : kleinere(b.teilmenge, m),
                };
              }),
            },
          },
  };
}

/** Der Nachlass nach D-34 (2) und sein Befund. */
function nachlassVon(
  leistung: Betrag,
  auftragsLv: AuftragsLvZustand,
  art: Rechnungsart,
): { nachlass: Betrag; befund: Leistungsbefund | null } {
  const n = auftragsLv.auftragsLeistungsverzeichnis.nachlass;
  if (n === null || n.art === 'prozent' || art === 'schluss')
    return { nachlass: nachlassBetrag(leistung, n), befund: null };
  const netto = auftragsLv.summen.gesamt.netto;
  const anteil = dividiere(multipliziere(n.wert, leistung), netto, 2);
  if (!anteil.ok) return { nachlass: NULL_BETRAG, befund: { code: 'nachlass-ohne-basis' } };
  const betrag = runden(anteil.wert, 'betrag');
  return { nachlass: vergleiche(betrag, n.wert) > 0 ? n.wert : betrag, befund: null };
}

/**
 * Leistungsstand aus den Aufmaßblättern `aufmasse` (alle zählen, die Auswahl trifft der Aufrufer; bei einer Rechnung die
 * Blätter aus `Rechnung.aufmassIds`). `art` entscheidet nur den absoluten Nachlass (Abschlag anteilig, Schluss voll).
 * Genau eine Zeile je Position des Auftrags-LV in Dokumentreihenfolge, auch ohne Aufmaß (`menge: null`, `gp: 0.00`;
 * D-70.7). Die Reihenfolge der Blätter ändert nichts.
 */
export function leistungsstandBerechnen(
  auftragsLv: AuftragsLvZustand,
  aufmasse: readonly Aufmass[],
  art: Rechnungsart,
): Leistungsergebnis {
  const a = auftragsLv.auftragsLeistungsverzeichnis;
  const reihe = dokumentreihenfolge(a.id, a.knoten);
  const { mengen, befunde } = kumulierteMengen(new Map(a.knoten.map((k) => [k.id, k])), aufmasse);
  const basen = zuschlagsbasen({
    id: a.id,
    knoten: reihe.map((k) => (k.art === 'position' ? ausgefuehrt(k, mengen) : k)),
  });

  const positionen: { positionId: PositionId; menge: Menge | null; gp: Betrag }[] = [];
  for (const k of reihe) {
    if (k.art !== 'position') continue;
    if (k.zuschlag === null) {
      const menge = mengen.get(k.id) ?? null;
      if (menge !== null && k.einheitspreis === null)
        befunde.push({ code: 'ohne-einheitspreis', positionId: k.id });
      const gp =
        menge === null || k.einheitspreis === null ? NULL_BETRAG : gesamtpreis(menge, k.einheitspreis);
      positionen.push({ positionId: k.id, menge, gp });
      continue;
    }
    const basis = basen.get(k.id);
    const ohneSatz = k.zuschlag.prozentsatz === null;
    if (ohneSatz && basis !== undefined && vorzeichen(basis.basis) !== 0)
      befunde.push({ code: 'ohne-zuschlagssatz', positionId: k.id });
    positionen.push({
      positionId: k.id,
      menge: null,
      gp: ohneSatz ? NULL_BETRAG : (basis?.betrag ?? NULL_BETRAG),
    });
  }

  const leistung = summiereBetraege(positionen.map((p) => p.gp));
  const { nachlass, befund } = nachlassVon(leistung, auftragsLv, art);
  if (befund !== null) befunde.push(befund);
  const nettoNachNachlass = subtrahiere(leistung, nachlass);
  if (vorzeichen(nettoNachNachlass) < 0) befunde.push({ code: 'netto-nach-nachlass-negativ' });
  return { leistungsstand: { positionen, leistung, nachlass, nettoNachNachlass }, befunde };
}
