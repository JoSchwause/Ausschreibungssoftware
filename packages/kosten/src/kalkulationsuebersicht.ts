// SPDX-License-Identifier: AGPL-3.0-or-later
// Kalkulationsübersicht (Ticket 78, C4): die Einzelpreiskalkulationen mehrerer Positionen mit ihren Mengen
// zusammengerechnet. Nur rechnen, kein Baum. GP je Position und die Summen je Kostenart sind Summen kaufmännisch auf
// 2 Stellen gerundeter Positionswerte (N2); Lohnstunden und Mittellohn werden exakt summiert und einmal gerundet.
// Rein (A2), nur Dezimalarithmetik aus `dezimal` (N1).

import { NACHKOMMASTELLEN } from '@tethys/vertrag';
import type { Betrag, Dezimal, Einheitspreis, EpaArt, Menge, PositionId } from '@tethys/vertrag';
import {
  NULL_MENGE,
  addiere,
  dividiere,
  gesamtpreis,
  multipliziere,
  runden,
  summiereBetraege,
} from '@tethys/dezimal';
import { KOSTENARTEN, einzelpreiskalkulationBerechnen } from './kalkulation';
import type { Einzelpreiskalkulation, Kalkulationsansatz, Kalkulationszuschlagssaetze } from './kalkulation';

// --- Schnittstelle ---------------------------------------------------------------------------------------------

/** Eingabe je Position: Menge (wie sie ins GP eingeht) und Kalkulationsansätze. */
export interface Kalkulationsposition {
  readonly positionId: PositionId;
  readonly menge: Menge;
  readonly ansaetze: readonly Kalkulationsansatz[];
}

/** Ergebnis je Position, in Eingabereihenfolge. */
export interface KalkuliertePosition {
  readonly positionId: PositionId;
  readonly menge: Menge;
  /** Wie `einzelpreiskalkulationBerechnen` für diese Position, samt Befunden. */
  readonly kalkulation: Einzelpreiskalkulation;
  /** Menge × EP, kaufmännisch auf 2 Stellen (N2); `null` ohne EP. */
  readonly gesamtpreis: Betrag | null;
}

/** Summen einer Kostenart über alle Positionen. */
export interface Kostenartsumme {
  readonly art: EpaArt;
  /** Σ je Position kaufmännisch(Menge × Einzelkosten, 2). */
  readonly einzelkosten: Betrag;
  /** Σ je Position kaufmännisch(Menge × Anteil, 2). */
  readonly anteilsumme: Betrag;
}

export interface Kalkulationsuebersicht {
  readonly positionen: readonly KalkuliertePosition[];
  /** Je Kostenart, die an mindestens einer Position einen Anteil hat, in der Reihenfolge der Einheitspreisanteile. */
  readonly kostenarten: readonly Kostenartsumme[];
  /** Σ der Einzelkosten aller Kostenarten. */
  readonly herstellkosten: Betrag;
  /** Σ der Gesamtpreise. Weicht durch die Rundung je Kostenart von Σ `anteilsumme` ab. */
  readonly gesamtsumme: Betrag;
  /** Mittellohn-Nachweis: kaufmännisch(Σ Menge × Lohnstunden je Einheit, 3). */
  readonly lohnstunden: Menge;
  /** kaufmännisch(Σ Menge × Einzelkosten Lohn / Σ Menge × Lohnstunden je Einheit, 3); `null` ohne Lohnstunden. */
  readonly mittellohn: Einheitspreis | null;
}

// --- Rechnen ---------------------------------------------------------------------------------------------------

interface Summe {
  einzelkosten: Betrag[];
  anteile: Betrag[];
}

export function kalkulationsuebersichtBerechnen(
  positionen: readonly Kalkulationsposition[],
  saetze: Kalkulationszuschlagssaetze,
  freiBezeichnung: string | null = null,
): Kalkulationsuebersicht {
  const ergebnis: KalkuliertePosition[] = [];
  const summen = new Map<EpaArt, Summe>();
  const gesamtpreise: Betrag[] = [];
  let lohnkostenExakt: Dezimal | null = null;
  let lohnstundenExakt: Dezimal = NULL_MENGE;

  for (const { positionId, menge, ansaetze } of positionen) {
    const kalkulation = einzelpreiskalkulationBerechnen(ansaetze, saetze, freiBezeichnung);
    const gp = kalkulation.einheitspreis === null ? null : gesamtpreis(menge, kalkulation.einheitspreis);
    if (gp !== null) gesamtpreise.push(gp);
    ergebnis.push({ positionId, menge, kalkulation, gesamtpreis: gp });

    for (const k of kalkulation.kostenarten) {
      const s = summen.get(k.art) ?? { einzelkosten: [], anteile: [] };
      s.einzelkosten.push(runden(multipliziere(menge, k.einzelkosten), 'betrag'));
      s.anteile.push(gesamtpreis(menge, k.anteil));
      summen.set(k.art, s);
      if (k.art === 'lohn') {
        const lk = multipliziere(menge, k.einzelkosten);
        lohnkostenExakt = lohnkostenExakt === null ? lk : addiere(lohnkostenExakt, lk);
      }
    }
    lohnstundenExakt = addiere(lohnstundenExakt, multipliziere(menge, kalkulation.lohnstundenJeEinheit));
  }

  const kostenarten: Kostenartsumme[] = [];
  for (const art of KOSTENARTEN) {
    const s = summen.get(art);
    if (s === undefined) continue;
    kostenarten.push({
      art,
      einzelkosten: summiereBetraege(s.einzelkosten),
      anteilsumme: summiereBetraege(s.anteile),
    });
  }

  // Keine Lohnzeile oder Σ Lohnstunden = 0 (Division durch null): kein Mittellohn.
  let mittellohn: Einheitspreis | null = null;
  if (lohnkostenExakt !== null) {
    const q = dividiere(lohnkostenExakt, lohnstundenExakt, NACHKOMMASTELLEN.einheitspreis);
    if (q.ok) mittellohn = runden(q.wert, 'einheitspreis');
  }

  return {
    positionen: ergebnis,
    kostenarten,
    herstellkosten: summiereBetraege(kostenarten.map((k) => k.einzelkosten)),
    gesamtsumme: summiereBetraege(gesamtpreise),
    lohnstunden: runden(lohnstundenExakt, 'menge'),
    mittellohn,
  };
}
