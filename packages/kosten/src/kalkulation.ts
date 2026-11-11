// SPDX-License-Identifier: AGPL-3.0-or-later
// Einzelpreiskalkulation (Ticket 78, C4): Zuschlagskalkulation je Kostenart. Aus den Kalkulationsansätzen einer Position
// und einem Zuschlagssatz der Kalkulation je Kostenart entstehen Einheitspreisanteile und EP. Rundung nach D-39:
// Einzelkosten ungerundet, Anteil kaufmännisch auf 3 Stellen (EP 3, N3), EP = Σ der gerundeten Anteile. Rein (A2), nur
// Dezimalarithmetik aus `dezimal` (N1); `number` nur für Zeilenindizes und die Reihenfolge der Kostenarten. Nicht
// gespeichert (D-36 (5)).
//
// Kein Überlaufbefund und kein eigener Grenzwert (D-78.4): `dezimal` rechnet auf BigInt und läuft nie über. Ob ein EP
// oder Anteil in das GAEB-Zahlformat passt, ist eine Grenze des Kerns (`PRUEF_GRENZEN`); seine LV-Prüfung meldet sie
// (`zahl-zu-gross`), sobald die App das Ergebnis mit `EinheitspreisanteileSetzen` schreibt. `kosten` darf `kern` nicht
// importieren (A3), und eine Kopie der Zahl wäre eine zweite Quelle, die still auseinanderlaufen kann.

import {
  NULL_MENGE,
  NULL_PROZENT,
  addiere,
  alsDezimal,
  multipliziere,
  runden,
  vergleiche,
  vorzeichen,
} from '@tethys/dezimal';
import type { Dezimal, Einheitspreis, Einheitspreisanteile, EpaArt, Menge, Prozent } from '@tethys/vertrag';

// --- Schnittstelle ---------------------------------------------------------------------------------------------

/** Eine Zeile der Einzelpreiskalkulation (Glossar „Kalkulationsansatz“). */
export interface Kalkulationsansatz {
  readonly art: EpaArt;
  readonly bezeichnung: string;
  /** Ansatzmenge je Einheit der Position (z. B. 0.450 h je m²); bei `lohn` Lohnstunden. `null`: fehlt. */
  readonly ansatzmenge: Menge | null;
  /** Kostensatz je Einheit des Ansatzes (z. B. 48.500 € je h). `null`: fehlt. */
  readonly kostensatz: Einheitspreis | null;
}

/** Zuschlagssatz der Kalkulation je Kostenart; eine fehlende Kostenart hat 0 %. */
export type Kalkulationszuschlagssaetze = Readonly<Partial<Record<EpaArt, Prozent>>>;

/** Nachweis einer Kostenart, die einen Anteil hat. */
export interface Kostenartnachweis {
  readonly art: EpaArt;
  /** Σ Ansatzmenge × Kostensatz der zählenden Zeilen, ungerundet (Zwischenwert, wird nie gespeichert). */
  readonly einzelkosten: Dezimal;
  readonly kalkulationszuschlagssatz: Prozent;
  /** Einzelkosten × Satz / 100, ungerundet; Einzelkosten + Kalkulationszuschlag ist der Anteil vor der Rundung. */
  readonly kalkulationszuschlag: Dezimal;
  /** Einzelkosten + Kalkulationszuschlag, kaufmännisch auf 3 Stellen. */
  readonly anteil: Einheitspreis;
}

export interface Einzelpreiskalkulation {
  /** Für `EinheitspreisanteileSetzen`; eine Kostenart ohne zählende Zeile hat `null`. */
  readonly anteile: Einheitspreisanteile;
  /** Σ der gerundeten Anteile (D-39); `null`, wenn keine Kostenart einen Anteil hat. */
  readonly einheitspreis: Einheitspreis | null;
  /** Je Kostenart mit Anteil, in der Reihenfolge der Einheitspreisanteile. */
  readonly kostenarten: readonly Kostenartnachweis[];
  /** Σ Ansatzmenge der zählenden Lohnzeilen: Lohnstunden je Einheit der Position (Mittellohn-Nachweis). */
  readonly lohnstundenJeEinheit: Menge;
  /** Erst die Befunde je Zeile in Eingabereihenfolge, dann je Kostenart, dann zum EP. */
  readonly befunde: readonly Kalkulationsbefund[];
}

export type Kalkulationsbefundcode =
  | 'wert-fehlt' // Zeile ohne Ansatzmenge oder Kostensatz; die Zeile zählt nicht
  | 'wert-negativ' // Ansatzmenge, Kostensatz, Anteil oder EP unter 0; zählt mit
  | 'kalkulationszuschlagssatz-unter-minus-100'; // Anteil hat das umgekehrte Vorzeichen der Einzelkosten; zählt mit

export type Kalkulationsfeld =
  'ansatzmenge' | 'kostensatz' | 'kalkulationszuschlagssatz' | 'anteil' | 'einheitspreis';

export interface Kalkulationsbefund {
  readonly code: Kalkulationsbefundcode;
  readonly feld: Kalkulationsfeld;
  /** Index des Kalkulationsansatzes in der Eingabe; `null` bei Befunden über eine Kostenart oder den EP. */
  readonly zeile: number | null;
  /** Betroffene Kostenart; `null` beim EP. */
  readonly art: EpaArt | null;
  /** Meldung für Entwickler und Protokoll; die deutsche Anzeige entsteht in der Oberfläche. */
  readonly meldung: string;
}

// --- Rechnen ---------------------------------------------------------------------------------------------------

/** Die Kostenarten in der Reihenfolge der Felder von `Einheitspreisanteile`; der Typ erzwingt Vollständigkeit. */
const REIHENFOLGE: Readonly<Record<EpaArt, number>> = {
  lohn: 0,
  stoffe: 1,
  geraete: 2,
  nachunternehmer: 3,
  sonstiges: 4,
  frei: 5,
};
export const KOSTENARTEN: readonly EpaArt[] = (Object.keys(REIHENFOLGE) as EpaArt[]).sort(
  (a, b) => REIHENFOLGE[a] - REIHENFOLGE[b],
);

function konstante(text: string): Dezimal {
  const e = alsDezimal(text);
  if (!e.ok) throw new Error(`Konstante ist kein Dezimalwert: ${text}`);
  return e.wert;
}
/** 1 % als Faktor: Prozent × 0.01 ist exakt (Multiplikation statt Division). */
const EIN_PROZENT = konstante('0.01');
/** −100 %: Ein Satz darunter macht aus positiven Einzelkosten einen negativen Anteil. */
const MINUS_HUNDERT = konstante('-100.0');

const negativ = (wert: Dezimal): boolean => vorzeichen(wert) < 0;

/**
 * Rechnet die Einzelpreiskalkulation einer Position. `freiBezeichnung` geht unverändert in die Einheitspreisanteile
 * (trägt das LV `epaBezeichnungen`, übergibt die App `null`, D-28).
 */
export function einzelpreiskalkulationBerechnen(
  ansaetze: readonly Kalkulationsansatz[],
  saetze: Kalkulationszuschlagssaetze,
  freiBezeichnung: string | null = null,
): Einzelpreiskalkulation {
  const befunde: Kalkulationsbefund[] = [];
  const befund = (
    code: Kalkulationsbefundcode,
    feld: Kalkulationsfeld,
    zeile: number | null,
    art: EpaArt | null,
    meldung: string,
  ): void => {
    befunde.push({ code, feld, zeile, art, meldung });
  };

  const einzelkosten = new Map<EpaArt, Dezimal>();
  let lohnstundenJeEinheit = NULL_MENGE;
  ansaetze.forEach(({ art, ansatzmenge, kostensatz }, index) => {
    if (ansatzmenge === null)
      befund('wert-fehlt', 'ansatzmenge', index, art, 'Zeile ohne Ansatzmenge zählt nicht');
    else if (negativ(ansatzmenge))
      befund('wert-negativ', 'ansatzmenge', index, art, `Negative Ansatzmenge ${ansatzmenge}`);
    if (kostensatz === null)
      befund('wert-fehlt', 'kostensatz', index, art, 'Zeile ohne Kostensatz zählt nicht');
    else if (negativ(kostensatz))
      befund('wert-negativ', 'kostensatz', index, art, `Negativer Kostensatz ${kostensatz}`);
    if (ansatzmenge === null || kostensatz === null) return;
    if (art === 'lohn') lohnstundenJeEinheit = addiere(lohnstundenJeEinheit, ansatzmenge);
    const zeile = multipliziere(ansatzmenge, kostensatz);
    const bisher = einzelkosten.get(art);
    einzelkosten.set(art, bisher === undefined ? zeile : addiere(bisher, zeile));
  });

  const kostenarten: Kostenartnachweis[] = [];
  const anteil: Partial<Record<EpaArt, Einheitspreis>> = {};
  let einheitspreis: Einheitspreis | null = null;
  for (const art of KOSTENARTEN) {
    const ek = einzelkosten.get(art);
    if (ek === undefined) continue;
    const satz = saetze[art] ?? NULL_PROZENT;
    const kalkulationszuschlag = multipliziere(multipliziere(ek, satz), EIN_PROZENT);
    const a = runden(addiere(ek, kalkulationszuschlag), 'einheitspreis');
    if (vergleiche(satz, MINUS_HUNDERT) < 0)
      befund(
        'kalkulationszuschlagssatz-unter-minus-100',
        'kalkulationszuschlagssatz',
        null,
        art,
        `Zuschlagssatz der Kalkulation ${satz} % liegt unter −100 %`,
      );
    if (negativ(a)) befund('wert-negativ', 'anteil', null, art, `Negativer Anteil ${a}`);
    anteil[art] = a;
    einheitspreis = einheitspreis === null ? a : addiere(einheitspreis, a);
    kostenarten.push({
      art,
      einzelkosten: ek,
      kalkulationszuschlagssatz: satz,
      kalkulationszuschlag,
      anteil: a,
    });
  }
  if (einheitspreis !== null && negativ(einheitspreis))
    befund('wert-negativ', 'einheitspreis', null, null, `Negativer Einheitspreis ${einheitspreis}`);

  return {
    anteile: {
      lohn: anteil.lohn ?? null,
      stoffe: anteil.stoffe ?? null,
      geraete: anteil.geraete ?? null,
      nachunternehmer: anteil.nachunternehmer ?? null,
      sonstiges: anteil.sonstiges ?? null,
      frei: anteil.frei ?? null,
      freiBezeichnung,
    },
    einheitspreis,
    kostenarten,
    lohnstundenJeEinheit,
    befunde,
  };
}
