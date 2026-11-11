// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte von Zuschlag und Auftrags-LV (Ticket 64, L1).

const liste = (xs: readonly string[]): string => xs.join(', ');
const positionen = (n: number): string => (n === 1 ? '1 Position' : `${String(n)} Positionen`);

export const texte = {
  warnung: {
    entfallen: (anzahl: number, welche: readonly string[]) =>
      `Im Auftrags-LV ${anzahl === 1 ? 'entfällt' : 'entfallen'} ${positionen(anzahl)}: ${liste(welche)}.`,
    nichtAngeboten: (p: string) =>
      `${p}: vom Bieter nicht angeboten; die Position steht ohne Einheitspreis im Auftrags-LV.`,
    satzFehlt: (p: string) =>
      `${p}: Zuschlagsposition ohne Satz des Bieters; der Satz bleibt im Auftrags-LV leer.`,
    ohneGrundposition: (p: string) => `${p}: Die gewählte Alternative ersetzt keine Grundposition.`,
    bezugEntfernt: (p: string, ziel: string) =>
      `${p}: Der Bezug auf ${ziel} entfällt, weil ${ziel} nicht im Auftrags-LV steht.`,
    grundpositionEntfernt: (p: string, ziel: string) =>
      `${p}: Der Verweis auf die Grundposition ${ziel} entfällt, weil ${ziel} nicht im Auftrags-LV steht.`,
  },
  wahl: {
    statt: (grund: readonly string[]) => `Statt ${liste(grund)}`,
    gruppe: (nr: number | null) => (nr === null ? 'Wahlgruppe' : `Wahlgruppe ${String(nr)}`),
  },
} as const;
