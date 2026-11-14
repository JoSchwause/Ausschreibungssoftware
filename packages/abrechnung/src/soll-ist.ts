// SPDX-License-Identifier: AGPL-3.0-or-later
// Soll/Ist (Ticket 81, D-35; VOB/B § 2 Abs. 3): je Position die Menge des Auftrags-LV gegen die aufgemessene Menge.

import {
  NULL_BETRAG,
  NULL_MENGE,
  alsDezimal,
  dividiere,
  multipliziere,
  runden,
  subtrahiere,
  summiereBetraege,
  vergleiche,
  vorzeichen,
} from '@tethys/dezimal';
import type {
  Aufmass,
  AuftragsLvZustand,
  Betrag,
  Dezimal,
  GliederungId,
  Knoten,
  Menge,
  PositionId,
  Prozent,
} from '@tethys/vertrag';
import { dokumentreihenfolge } from './baum';
import { prozentKonstante } from './form';
import { leistungsstandBerechnen } from './leistungsstand';

/** Einstellungen von Soll/Ist (D-35). */
export interface SollIstOptionen {
  /** `true`: Es gibt eine Schlussrechnung; erst dann gibt es Befunde `unter-schwelle`. Standard `false`. */
  readonly abgeschlossen?: boolean;
  /** Obere Schwelle in Prozent der Soll-Menge, streng überschritten ist ein Befund. Standard `110.00`. */
  readonly oberSchwelle?: Prozent;
  /** Untere Schwelle in Prozent der Soll-Menge, streng unterschritten ist ein Befund (nur abgeschlossen). Standard `90.00`. */
  readonly unterSchwelle?: Prozent;
}

/**
 * Eine Zeile je Position des Auftrags-LV in Dokumentreihenfolge, auch ohne Aufmaß.
 * - `soll`: die Menge im Auftrags-LV (`null`: keine).
 * - `ist`: Σ der Mengen auf den Blättern (Zeilen ohne Menge zählen nicht), `0.000` ohne Aufmaß; `null` nur bei einer
 *   Zuschlagsposition (sie wird nicht aufgemessen).
 * - `differenz`: `ist` − `soll`; `null`, wenn eines fehlt.
 * - `anteil`: round(`ist` / `soll` × 100, 2); `null` bei Soll `null`, 0 oder negativ und bei einer Zuschlagsposition.
 * - `gpSoll`: der GP aus den Summen des Kerns (`Positionssumme.gesamtpreis`), `null` ohne GP.
 * - `gpIst`: der geprüfte GP wie im Leistungsstand (round(`ist` × EP, 2), Zuschlagsposition aus ihrer Basis; 0,00 ohne EP).
 */
export interface SollIstZeile {
  readonly positionId: PositionId;
  readonly soll: Menge | null;
  readonly ist: Menge | null;
  readonly differenz: Menge | null;
  readonly anteil: Prozent | null;
  readonly gpSoll: Betrag | null;
  readonly gpIst: Betrag;
}

/** Summen einer Gliederung: Soll aus den Summen des Kerns (`Gliederungssumme.summe`), Ist = Σ `gpIst` darunter. */
export interface SollIstGliederung {
  readonly gliederungId: GliederungId;
  readonly gpSoll: Betrag;
  readonly gpIst: Betrag;
}

/**
 * Ein Befund (VOB/B § 2 Abs. 3, D-35), streng verglichen mit der exakten Menge, nicht mit dem gerundeten Anteil:
 * `ueber-schwelle` bei Ist > `oberSchwelle` % der Soll-Menge; `unter-schwelle` bei Ist < `unterSchwelle` % (nur
 * `abgeschlossen`). Kein Befund bei Soll `null`, 0 oder negativ, bei Pauschal und bei Zuschlagspositionen.
 */
export interface SollIstBefund {
  readonly code: 'ueber-schwelle' | 'unter-schwelle';
  readonly positionId: PositionId;
  readonly anteil: Prozent;
}

export interface SollIst {
  readonly zeilen: readonly SollIstZeile[];
  /** Je Gliederung in Dokumentreihenfolge. */
  readonly gliederungen: readonly SollIstGliederung[];
  /** Soll: Netto des Auftrags-LV vor Nachlass (Kern); Ist: Leistung (Σ `gpIst`). */
  readonly gesamt: { readonly gpSoll: Betrag; readonly gpIst: Betrag };
  /** In Dokumentreihenfolge. */
  readonly befunde: readonly SollIstBefund[];
}

const HUNDERT: Dezimal = (() => {
  const e = alsDezimal('100.00');
  if (!e.ok) throw new Error('Konstante 100.00 ist kein Dezimalwert');
  return e.wert;
})();
const STANDARD_OBEN = prozentKonstante('110.00');
const STANDARD_UNTEN = prozentKonstante('90.00');

/**
 * Soll/Ist eines Auftrags-LV über die Aufmaßblätter `aufmasse` (alle zählen; Zeilen, die im Leistungsstand nicht zählen,
 * zählen auch hier nicht). Die Reihenfolge der Blätter ändert nichts.
 */
export function sollIstBerechnen(
  auftragsLv: AuftragsLvZustand,
  aufmasse: readonly Aufmass[],
  optionen: SollIstOptionen = {},
): SollIst {
  const a = auftragsLv.auftragsLeistungsverzeichnis;
  const oben = optionen.oberSchwelle ?? STANDARD_OBEN;
  const unten = optionen.unterSchwelle ?? STANDARD_UNTEN;
  const { leistungsstand } = leistungsstandBerechnen(auftragsLv, aufmasse, 'abschlag');
  const ist = new Map(leistungsstand.positionen.map((p) => [p.positionId as string, p]));
  const gpSoll = new Map(auftragsLv.summen.positionen.map((p) => [p.positionId as string, p.gesamtpreis]));
  const reihe = dokumentreihenfolge(a.id, a.knoten);
  const nachId = new Map<string, Knoten>(a.knoten.map((k) => [k.id, k]));

  const zeilen: SollIstZeile[] = [];
  const befunde: SollIstBefund[] = [];
  const istJeGliederung = new Map<string, Betrag[]>();
  for (const k of reihe) {
    if (k.art !== 'position') continue;
    const stand = ist.get(k.id);
    const gpIst = stand?.gp ?? NULL_BETRAG;
    for (let e = nachId.get(k.elternId); e !== undefined; e = nachId.get(e.elternId)) {
      const liste = istJeGliederung.get(e.id) ?? [];
      liste.push(gpIst);
      istJeGliederung.set(e.id, liste);
    }
    const soll = k.zuschlag === null ? k.menge : null;
    const menge = k.zuschlag === null ? (stand?.menge ?? NULL_MENGE) : null;
    const vergleichbar = soll !== null && menge !== null && vorzeichen(soll) > 0;
    let anteil: Prozent | null = null;
    if (vergleichbar) {
      const quotient = dividiere(multipliziere(menge, HUNDERT), soll, 2);
      if (quotient.ok) anteil = runden(quotient.wert, 'prozent');
    }
    zeilen.push({
      positionId: k.id,
      soll,
      ist: menge,
      differenz: soll === null || menge === null ? null : subtrahiere(menge, soll),
      anteil,
      gpSoll: gpSoll.get(k.id) ?? null,
      gpIst,
    });
    if (!vergleichbar || anteil === null || k.merkmale.pauschal) continue;
    // Streng und exakt (D-35, VOB/B § 2 Abs. 3): Ist × 100 gegen Soll × Schwelle, nicht der gerundete Anteil.
    const istHundert = multipliziere(menge, HUNDERT);
    if (vergleiche(istHundert, multipliziere(soll, oben)) > 0)
      befunde.push({ code: 'ueber-schwelle', positionId: k.id, anteil });
    else if (optionen.abgeschlossen === true && vergleiche(istHundert, multipliziere(soll, unten)) < 0)
      befunde.push({ code: 'unter-schwelle', positionId: k.id, anteil });
  }

  const sollJeGliederung = new Map(
    auftragsLv.summen.gliederungen.map((g) => [g.gliederungId as string, g.summe]),
  );
  const gliederungen = reihe.flatMap((k): SollIstGliederung[] =>
    k.art === 'los' || k.art === 'titel'
      ? [
          {
            gliederungId: k.id,
            gpSoll: sollJeGliederung.get(k.id) ?? NULL_BETRAG,
            gpIst: summiereBetraege(istJeGliederung.get(k.id) ?? []),
          },
        ]
      : [],
  );
  return {
    zeilen,
    gliederungen,
    gesamt: { gpSoll: auftragsLv.summen.gesamt.netto, gpIst: leistungsstand.leistung },
    befunde,
  };
}
