// SPDX-License-Identifier: AGPL-3.0-or-later
// Fachliche Summenregeln (Ticket 07; Betragsziel und Pauschal: Ticket 37). Jede steht als EINE benannte Funktion an genau
// dieser Stelle; Befehle und Neuberechnung fragen nur diese Funktionen. Wer eine Frage entscheidet, ändert nur
// die Funktion und den Eintrag in `SUMMEN_ANNAHMEN`.
//
// Die übrigen Annahmen folgen den Fixtures (`fixtures/README.md`, Annahmen A1 bis A6), damit deren Sollwerte stimmen. Sie
// sind restriktiv und lassen sich ohne Datenmigration lockern. Der Nachlass ist entschieden (N5, E-06, 2026-11-10).

import {
  NULL_BETRAG,
  alsMenge,
  alsProzent,
  gesamtpreis,
  prozentVon,
  subtrahiere,
  vergleiche,
  vorzeichen,
} from '@tethys/dezimal';
import type { Betrag, Menge, Nachlass, Position, Prozent } from '@tethys/vertrag';

export const SUMMEN_ANNAHMEN: {
  readonly status: string;
  readonly positionsarten: string;
  readonly pauschal: string;
  readonly nachlassRundung: string;
  readonly nachlassGrenzen: string;
  readonly mwstGrenzen: string;
} = {
  status:
    'vorläufige Annahme, Entscheidung offen (MwSt-Grenzen); entschieden: Nachlass (N5, E-06, 2026-11-10), Betragsziel (E-04, E-05, Demo D-37.1)',
  /** (1) `betragsziel`: wohin ein Betrag (GP oder Zuschlagsbetrag) geht. */
  positionsarten:
    'ENTSCHIEDEN (E-04, E-05, Demo D-37.1): Wahl mit Variante ≠ 0 (auch ohne Nummer) → Wahlsumme; sonst Bedarf ohne Gesamtbetrag → ' +
    'Bedarfssumme; sonst (normal, Bedarf mit Gesamtbetrag, Grundausführung Variante 0, Stundenlohn, Pauschal, Zuschlag) → Netto und ' +
    'Gliederungssumme; Wahl vor Bedarf. Ausweise gehen nicht in Netto, Nachlass, MwSt, Brutto ein',
  /** (1a) `eigenerGesamtpreis`: Pauschal ohne Menge. */
  pauschal:
    'Demo D-37.1: Pauschal ohne Menge → GP = EP auf 2 Stellen gerundet (Menge 1 angenommen); mit Menge Menge × EP. Stundenlohn ändert die Rechnung nicht',
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

/** Eines der drei Ziele eines Betrags (Netto mit Gliederungssumme, Bedarfssumme, Wahlsumme). */
export type Betragsziel = 'netto' | 'bedarf' | 'wahl';

/**
 * (1) Wohin der Betrag einer Position geht (GP oder Zuschlagsbetrag; ohne Betrag: nirgends).
 * ENTSCHIEDEN (E-04, E-05; Demo D-37.1): Wahl vor Bedarf. Eine Wahlposition, die zugleich Bedarf ist, steht nur in der
 * Wahlsumme. Variante 0 ist die Grundausführung (Glossar „Wahlzuordnung“) und zählt wie eine Normalposition; eine
 * Wahlzuordnung ohne Variantennummer (`null`, Daten vor v1.1b) ist eine Alternative.
 */
export function betragsziel(p: Pick<Position, 'merkmale'>): Betragsziel {
  const wahl = p.merkmale.wahl;
  if (wahl !== null && wahl.variante !== 0) return 'wahl';
  if (p.merkmale.bedarf === 'ohne-gesamtbetrag') return 'bedarf';
  return 'netto';
}

/** Geht ein Betrag dieser Position ins Netto und in die Gliederungssumme ein? (Siehe `betragsziel`.) */
export function positionGehtInSumme(p: Pick<Position, 'merkmale'>): boolean {
  return betragsziel(p) === 'netto';
}

const EINE_MENGE: Menge = (() => {
  const e = alsMenge('1.000');
  if (!e.ok) throw new Error('Konstante 1.000 ist keine Menge');
  return e.wert;
})();

/**
 * (1a) Die Menge, mit der eine Position rechnet: ihre Menge; ohne Menge bei Pauschal 1 (Demo D-37.1; GAEB lässt bei
 * Pauschalpositionen die Menge weg oder setzt 1), sonst keine.
 */
export function rechenmenge(p: Pick<Position, 'menge' | 'merkmale'>): Menge | null {
  if (p.menge !== null) return p.menge;
  return p.merkmale.pauschal ? EINE_MENGE : null;
}

/**
 * Der eigene GP einer Position: gerundet(Menge × EP, 2) (N2), mit der Rechenmenge (Pauschal); ohne Menge oder EP keiner.
 * Für eine Zuschlagsposition mit Satz gilt stattdessen die Zuschlagsregel (`zuschlag.ts`); ohne Satz ist das die Altform.
 */
export function eigenerGesamtpreis(p: Pick<Position, 'menge' | 'einheitspreis' | 'merkmale'>): Betrag | null {
  const menge = rechenmenge(p);
  return menge !== null && p.einheitspreis !== null ? gesamtpreis(menge, p.einheitspreis) : null;
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

/**
 * Ein Satz von 0,00 bis 100,00, beide Grenzen eingeschlossen: die Grenzen von prozentualem Nachlass und MwSt-Satz, seit
 * Vertrag v1.7a auch der Schwellen des Preisspiegels (`PreisspiegeleinstellungenSetzen`, D-127.7).
 */
export const prozentImBereich = (satz: Prozent): boolean =>
  vorzeichen(satz) >= 0 && vergleiche(satz, HUNDERT_PROZENT) <= 0;

/** (4) Zulässigkeit eines MwSt-Satzes: 0 bis 100 (zusätzliche vorläufige Annahme, Entscheidung offen). */
export function mwstSatzFehler(satz: Prozent): string | null {
  if (vorzeichen(satz) < 0) return 'Ein MwSt-Satz ist nicht negativ.';
  if (vergleiche(satz, HUNDERT_PROZENT) > 0) return 'Ein MwSt-Satz ist höchstens 100 %.';
  return null;
}
