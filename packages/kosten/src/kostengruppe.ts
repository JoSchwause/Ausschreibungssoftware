// SPDX-License-Identifier: AGPL-3.0-or-later
// Kostengruppennummer (Ticket 55, D-24): dreistellige Nummer nach Art der DIN 276. Ebene, Elternteil und Vorfahren
// folgen allein aus den Ziffern; im Repo steht keine Liste der Gruppen und keine Bezeichnung (G-16, C1). Rein (A2).

// Die Marke `Kostengruppennummer` liegt seit v1.4 in `vertrag` (Ticket 70 Punkt 4); nur {@link kgLesen} erzeugt sie.
import { KOSTENGRUPPENNUMMER_MUSTER } from '@tethys/vertrag';
import type { Ergebnis, Kostengruppennummer } from '@tethys/vertrag';

/** Ebene einer Kostengruppe: `X00` ist 1, `XY0` (Y ≠ 0) ist 2, `XYZ` (Z ≠ 0) ist 3. */
export type Kostengruppenebene = 1 | 2 | 3;

export type Kostengruppenfehlercode =
  | 'nummer-leer' // nur Leerraum
  | 'nummer-form' // nicht genau drei Ziffern 0–9
  | 'nummer-null'; // erste Ziffer 0 (unter 100)

export interface Kostengruppenfehler {
  readonly code: Kostengruppenfehlercode;
  /** Meldung für Entwickler und Protokoll; die deutsche Anzeige entsteht in der Oberfläche. */
  readonly meldung: string;
}

// Die Formregel ist die des Vertrags (`KOSTENGRUPPENNUMMER_MUSTER`, v1.7a, D-127.12), dieselbe, die Kern, `speicher` und
// `gaeb` prüfen. `FORM` dient nur dazu, den Fehler feiner zu melden (drei Ziffern, aber führende Null).
const FORM = /^[0-9]{3}$/;

/** Prüft die Form einer Kostengruppennummer. Leerraum am Rand wird entfernt (D-55.1). */
export function kgLesen(text: string): Ergebnis<Kostengruppennummer, Kostengruppenfehler> {
  const t = text.trim();
  if (t === '')
    return { ok: false, fehler: { code: 'nummer-leer', meldung: 'Kostengruppennummer ist leer' } };
  if (!FORM.test(t)) {
    return {
      ok: false,
      fehler: { code: 'nummer-form', meldung: `Keine dreistellige Nummer: ${JSON.stringify(t)}` },
    };
  }
  if (!KOSTENGRUPPENNUMMER_MUSTER.test(t)) {
    return { ok: false, fehler: { code: 'nummer-null', meldung: `Nummer unter 100: ${t}` } };
  }
  return { ok: true, wert: t as Kostengruppennummer };
}

export function kgEbene(nummer: Kostengruppennummer): Kostengruppenebene {
  if (nummer[2] !== '0') return 3;
  if (nummer[1] !== '0') return 2;
  return 1;
}

/** Elternteil: `XYZ` → `XY0`, `XY0` → `X00`, `X00` → `null`. `X0Z` hängt direkt unter `X00`. */
export function kgElternteil(nummer: Kostengruppennummer): Kostengruppennummer | null {
  switch (kgEbene(nummer)) {
    case 3:
      return `${nummer.slice(0, 2)}0` as Kostengruppennummer;
    case 2:
      return `${nummer.slice(0, 1)}00` as Kostengruppennummer;
    case 1:
      return null;
  }
}

/** Vorfahren vom Elternteil aufwärts bis zur Ebene 1; leer für Ebene 1. */
export function kgVorfahren(nummer: Kostengruppennummer): Kostengruppennummer[] {
  const vorfahren: Kostengruppennummer[] = [];
  for (let n = kgElternteil(nummer); n !== null; n = kgElternteil(n)) vorfahren.push(n);
  return vorfahren;
}

/**
 * Ordnung nach Nummer. Weil der Elternteil die hinteren Ziffern auf 0 setzt, steht er immer vor seinen Kindern:
 * die Ordnung ist zugleich eine Tiefensuche durch die Kostengliederung.
 */
export function kgVergleichen(a: Kostengruppennummer, b: Kostengruppennummer): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Sortierte Kopie; die Eingabe bleibt unverändert. */
export function kgSortieren(nummern: readonly Kostengruppennummer[]): Kostengruppennummer[] {
  return [...nummern].sort(kgVergleichen);
}
