// SPDX-License-Identifier: AGPL-3.0-or-later
// Fachliche Summenregeln, die nicht entschieden sind (Ticket 07). Jede steht als EINE benannte Funktion an genau
// dieser Stelle; Befehle und Neuberechnung fragen nur diese Funktionen. Wer eine Frage entscheidet, ändert nur
// die Funktion und den Eintrag in `SUMMEN_ANNAHMEN`.
//
// Die übrigen Annahmen folgen den Fixtures (`fixtures/README.md`, Annahmen A1 bis A6), damit deren Sollwerte stimmen. Sie
// sind restriktiv und lassen sich ohne Datenmigration lockern. Der Nachlass ist entschieden (N5, E-06, 2026-11-10).

import { NULL_BETRAG, alsProzent, prozentVon, subtrahiere, vergleiche, vorzeichen } from '@tethys/dezimal';
import type { Betrag, Nachlass, Position, Prozent } from '@tethys/vertrag';

export const SUMMEN_ANNAHMEN: {
  readonly status: string;
  readonly positionsarten: string;
  readonly nachlassRundung: string;
  readonly nachlassGrenzen: string;
  readonly mwstGrenzen: string;
} = {
  status:
    'vorläufige Annahme, Entscheidung offen (Positionsarten, MwSt-Grenzen); entschieden: Nachlass (N5, E-06, 2026-11-10)',
  /** (1) `positionGehtInSumme`: Fixture-Annahmen A1 bis A4; `stundenlohn` und `pauschal` sind von keiner abgedeckt. */
  positionsarten:
    'normal, zuschlag (eigene Menge × EP) und stundenlohn gehen ein; bedarf nur mit Gesamtbetrag (Bedarf mit-gesamtbetrag); wahl nie; ' +
    'das Merkmal pauschal ändert nichts (Menge × EP)',
  /** (2) `nachlassBetrag` und `nettoNachNachlass`: Nachlassbetrag auf 2 Stellen runden, dann abziehen (N5, E-06; Fixture A6). */
  nachlassRundung:
    'ENTSCHIEDEN (N5, E-06): Nachlassbetrag kaufmännisch auf 2 Stellen runden (Betrag, Vorzeichen danach), dann vom Netto abziehen (nicht das Ergebnis runden)',
  /** (3) `nachlassFehler`: nur Form, nie eine Sperre wegen der Höhe (U5). */
  nachlassGrenzen:
    'ENTSCHIEDEN (N5, E-06, U5): Prozent von 0,00 bis 100,00, Betrag nicht negativ; ein Absolutbetrag über dem Netto wird angenommen. Ein negatives Netto nach Nachlass ist ein Befund der späteren LV-Prüfung (K8), keine Sperre',
  /** (4) `mwstSatzFehler`: zusätzliche Annahme, dieselbe Behandlung. */
  mwstGrenzen: 'MwSt-Satz von 0,00 bis 100,00',
};

const HUNDERT_PROZENT: Prozent = (() => {
  const e = alsProzent('100.00');
  if (!e.ok) throw new Error('Konstante 100.00 ist kein Prozentwert');
  return e.wert;
})();

/**
 * (1) Geht der GP dieser Position in Titel-, Los- und LV-Summe ein?
 * VORLÄUFIGE ANNAHME, ENTSCHEIDUNG OFFEN (K5/K6 entscheiden): Fixture-Annahmen A1 bis A4.
 * `stundenlohn` und das Merkmal `pauschal` kommen in keiner Fixture-Annahme vor; sie werden wie eine
 * Normalposition (Menge × EP) behandelt. Das ist gesondert zu entscheiden.
 */
export function positionGehtInSumme(p: Pick<Position, 'merkmale'>): boolean {
  // v1.1b: mechanisch angepasst, Folgeticket. gleiche Wirkung wie vor v1.1b (Wahl nie; Bedarf nur mit Gesamtbetrag; sonst ja); die Kombinationen
  // der neuen Merkmale entscheidet K5, hier gilt die Reihenfolge Wahl vor Bedarf.
  if (p.merkmale.wahl !== null) return false;
  if (p.merkmale.bedarf !== null) return p.merkmale.bedarf === 'mit-gesamtbetrag';
  return true;
}

/**
 * (2) Der Nachlassbetrag: bei Prozent `round(Netto × p / 100, 2)`, beim Absolutbetrag der Betrag; ohne Nachlass 0,00.
 * Das Netto nach Nachlass ist `Netto − Nachlassbetrag` und darf negativ sein (Befund der LV-Prüfung, nicht Sperre).
 * ENTSCHIEDEN (N5, E-06): der Nachlassbetrag wird gerundet, dann abgezogen (Fixture A6). Die andere Lesart rundet das
 * Ergebnis `Netto × (100 − p) / 100`; sie weicht nur bei Rundungsgleichständen ab (Netto 0,25, Nachlass 10 %: hier 0,22,
 * andere Lesart 0,23).
 */
export function nachlassBetrag(netto: Betrag, nachlass: Nachlass | null): Betrag {
  if (nachlass === null) return NULL_BETRAG;
  return nachlass.art === 'prozent' ? prozentVon(netto, nachlass.wert) : nachlass.wert;
}

/** Netto nach Nachlass (siehe `nachlassBetrag`, Annahme 2). */
export function nettoNachNachlass(netto: Betrag, nachlass: Nachlass | null): Betrag {
  return subtrahiere(netto, nachlassBetrag(netto, nachlass));
}

/**
 * (3) Zulässigkeit eines Nachlasses beim Setzen; `null` heißt zulässig.
 * ENTSCHIEDEN (N5, E-06, U5): Prozent weder negativ noch über 100; ein Absolutbetrag nicht negativ. Ein Absolutbetrag
 * größer als das Netto wird NICHT abgewiesen (Validierung blockiert nie); das negative Netto nach Nachlass meldet später die
 * LV-Prüfung (K8). Gilt nur für `NachlassSetzen`; `LeistungsverzeichnisAnlegen` prüft nur die Form.
 */
export function nachlassFehler(nachlass: Nachlass): string | null {
  if (nachlass.art === 'prozent') {
    if (vorzeichen(nachlass.wert) < 0) return 'Ein prozentualer Nachlass ist nicht negativ.';
    if (vergleiche(nachlass.wert, HUNDERT_PROZENT) > 0)
      return 'Ein prozentualer Nachlass ist höchstens 100 %.';
    return null;
  }
  if (vorzeichen(nachlass.wert) < 0) return 'Ein Nachlass als Betrag ist nicht negativ.';
  return null;
}

/** (4) Zulässigkeit eines MwSt-Satzes: 0 bis 100 (zusätzliche vorläufige Annahme, Entscheidung offen). */
export function mwstSatzFehler(satz: Prozent): string | null {
  if (vorzeichen(satz) < 0) return 'Ein MwSt-Satz ist nicht negativ.';
  if (vergleiche(satz, HUNDERT_PROZENT) > 0) return 'Ein MwSt-Satz ist höchstens 100 %.';
  return null;
}
