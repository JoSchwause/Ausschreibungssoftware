// SPDX-License-Identifier: AGPL-3.0-or-later
// Kostenermittlung rechnen (Ticket 55, D-24): Einträge → eigener Betrag und Summe je Kostengruppe und Vorfahre,
// Gesamtsumme. Netto, keine MwSt. Rein (A2), nur Dezimalarithmetik (N1); `number` nur für Eintragsindizes und Ebenen.
// Auffälligkeiten sind Befunde, nie Sperre (U5).

import { NULL_BETRAG, addiere, alsBetrag, alsDezimal, runden, vorzeichen } from '@tethys/dezimal';
import type { Betrag, Kostengruppennummer } from '@tethys/vertrag';
import type { Kostengruppenebene } from './kostengruppe';
import { kgEbene, kgLesen, kgSortieren, kgVorfahren } from './kostengruppe';

// --- Schnittstelle ---------------------------------------------------------------------------------------------

/**
 * Eine ungeprüfte Eingabe für eine Kostenermittlung (Grid, CSV): Nettobetrag auf einer Kostengruppe. Nicht zu
 * verwechseln mit dem gespeicherten `Kostenermittlungseintrag` aus `vertrag` (geprüft, `betrag: Betrag`), der ihr
 * zuweisbar ist (D-82.2).
 */
export interface Kostenermittlungseingabe {
  /** Die Nummer als Text, noch ungeprüft; die Rechnung liest sie mit `kgLesen` (Leerraum am Rand fällt weg). */
  readonly nummer: string;
  /**
   * Der Betrag als Text in Punktnotation, wie er eingegeben oder eingelesen wurde, noch ungeprüft (S11). Kanonisch hat
   * er 2 Stellen (N3); andere Skalen werden kaufmännisch gerundet und gemeldet, Unlesbares zählt nicht (D-55.3). Die
   * Rechnung liest ihn mit `alsBetrag`; erst ihr Ergebnis ist ein `Betrag`.
   */
  readonly betrag: string;
  readonly bemerkung?: string;
}

/** Ergebnis je Kostengruppe, die selbst einen Eintrag hat oder Vorfahre eines Eintrags ist. */
export interface Kostengruppensumme {
  readonly nummer: Kostengruppennummer;
  readonly ebene: Kostengruppenebene;
  /** Summe der Einträge genau dieser Nummer; `null`, wenn die Gruppe nur als Vorfahre vorkommt. */
  readonly eigenerBetrag: Betrag | null;
  /** Eigener Betrag plus Summen der Kinder. */
  readonly summe: Betrag;
}

export type Kostenbefundcode =
  | 'nummer-ungueltig' // Eintrag zählt nicht
  | 'betrag-ungueltig' // keine Dezimalzahl in Punktnotation; Eintrag zählt nicht
  | 'betrag-nicht-kanonisch' // nicht genau 2 Stellen; kaufmännisch gerundet und gezählt (D-55.3)
  | 'betrag-negativ' // zählt mit
  | 'nummer-doppelt' // zählt mit, Beträge werden addiert (D-55.4)
  | 'eigener-betrag-und-kinder'; // Gruppe hat einen eigenen Betrag und Einträge darunter; beides zählt

export interface Kostenbefund {
  readonly code: Kostenbefundcode;
  /** Index des Eintrags in der Eingabe; `null` bei Befunden über eine Gruppe. */
  readonly eintrag: number | null;
  /** Betroffene Kostengruppe; `null`, wenn die Nummer selbst ungültig ist. */
  readonly nummer: Kostengruppennummer | null;
  /** Meldung für Entwickler und Protokoll; die deutsche Anzeige entsteht in der Oberfläche. */
  readonly meldung: string;
}

export interface Kostenermittlungsergebnis {
  /** Nach Nummer sortiert (Elternteil vor Kindern). */
  readonly gruppen: readonly Kostengruppensumme[];
  /** Summe der Ebene-1-Gruppen (= Summe aller gezählten Einträge). */
  readonly gesamtsumme: Betrag;
  /** Erst die Befunde je Eintrag in Eingabereihenfolge, dann die Befunde je Gruppe nach Nummer. */
  readonly befunde: readonly Kostenbefund[];
}

// --- Rechnen ---------------------------------------------------------------------------------------------------

/** Liest den Betrag eines Eintrags: kanonisch, gerundet (mit Befund) oder unlesbar (`null`, mit Befund). */
function betragLesen(text: string, befund: (code: Kostenbefundcode, meldung: string) => void): Betrag | null {
  const kanonisch = alsBetrag(text);
  if (kanonisch.ok) return kanonisch.wert;
  const dezimal = alsDezimal(text);
  if (!dezimal.ok) {
    befund('betrag-ungueltig', `Betrag ist keine Dezimalzahl: ${JSON.stringify(text)}`);
    return null;
  }
  const gerundet = runden(dezimal.wert, 'betrag');
  befund('betrag-nicht-kanonisch', `Betrag ${text} hat nicht 2 Nachkommastellen, gerundet auf ${gerundet}`);
  return gerundet;
}

export function kostenermittlungBerechnen(
  eintraege: readonly Kostenermittlungseingabe[],
): Kostenermittlungsergebnis {
  const befunde: Kostenbefund[] = [];
  const eigen = new Map<Kostengruppennummer, Betrag>();
  const summen = new Map<Kostengruppennummer, Betrag>();
  const zuSumme = (n: Kostengruppennummer, b: Betrag): void => {
    summen.set(n, addiere(summen.get(n) ?? NULL_BETRAG, b));
  };

  eintraege.forEach((eintrag, index) => {
    const nummer = kgLesen(eintrag.nummer);
    if (!nummer.ok) {
      befunde.push({
        code: 'nummer-ungueltig',
        eintrag: index,
        nummer: null,
        meldung: nummer.fehler.meldung,
      });
      return;
    }
    const n = nummer.wert;
    const befund = (code: Kostenbefundcode, meldung: string): void => {
      befunde.push({ code, eintrag: index, nummer: n, meldung });
    };
    const betrag = betragLesen(eintrag.betrag, befund);
    if (betrag === null) return;
    if (vorzeichen(betrag) < 0) befund('betrag-negativ', `Negativer Betrag ${betrag}`);

    const bisher = eigen.get(n);
    if (bisher !== undefined)
      befund('nummer-doppelt', `Nummer ${n} kommt mehrfach vor; Beträge werden addiert`);
    eigen.set(n, bisher === undefined ? betrag : addiere(bisher, betrag));
    zuSumme(n, betrag);
    for (const v of kgVorfahren(n)) zuSumme(v, betrag);
  });

  // Eine Gruppe mit eigenem Betrag, die zugleich Vorfahre einer anderen Gruppe mit Eintrag ist.
  const mitNachfahren = new Set<Kostengruppennummer>();
  for (const n of eigen.keys()) for (const v of kgVorfahren(n)) mitNachfahren.add(v);

  const gruppen: Kostengruppensumme[] = [];
  let gesamtsumme = NULL_BETRAG;
  for (const n of kgSortieren([...summen.keys()])) {
    const eigenerBetrag = eigen.get(n) ?? null;
    const summe = summen.get(n) ?? NULL_BETRAG;
    const ebene = kgEbene(n);
    gruppen.push({ nummer: n, ebene, eigenerBetrag, summe });
    if (ebene === 1) gesamtsumme = addiere(gesamtsumme, summe);
    if (eigenerBetrag !== null && mitNachfahren.has(n)) {
      befunde.push({
        code: 'eigener-betrag-und-kinder',
        eintrag: null,
        nummer: n,
        meldung: `Gruppe ${n} hat einen eigenen Betrag und Beträge darunter; beides wird summiert`,
      });
    }
  }
  return { gruppen, gesamtsumme, befunde };
}
