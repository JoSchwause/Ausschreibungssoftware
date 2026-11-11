// SPDX-License-Identifier: AGPL-3.0-or-later
// EPA-Bezeichnungen (v1.3, Ticket 68, D-28): welcher `LblUPComp<n>` welche `EpaArt` ist. Eine Stelle für die Leser
// (X81/X83/X86 in `lesen.ts`, X84 in `angebot.ts`) und den Writer, damit beide Richtungen dieselbe Deutung haben.
//
// Deutung (D-40.1, D-45.1): zuerst die Bezeichnung (Lohn, Stoffe/Material, Geräte/Gerät, Nachunternehmer, Sonstiges),
// sonst `Type` (Wages, Materials, Plant, Miscellaneous; Unknown ist der freie Anteil), sonst der freie Anteil. GAEB hat
// keinen eigenen Typ für Nachunternehmer: Der Writer schreibt `Miscellaneous`, erkennbar ist er nur an der Bezeichnung.

import type { EpaArt, EpaNummer } from '@tethys/vertrag';

export const EPA_NUMMERN: readonly EpaNummer[] = [1, 2, 3, 4, 5, 6];

/** Die sechs Anteile in der Reihenfolge der festen Belegung des Writers (1 Lohn … 6 frei). */
export const EPA_ARTEN: readonly EpaArt[] = [
  'lohn',
  'stoffe',
  'geraete',
  'nachunternehmer',
  'sonstiges',
  'frei',
];

const ART_NACH_BEZEICHNUNG: Readonly<Record<string, EpaArt>> = {
  lohn: 'lohn',
  stoffe: 'stoffe',
  material: 'stoffe',
  geräte: 'geraete',
  geraete: 'geraete',
  gerät: 'geraete',
  nachunternehmer: 'nachunternehmer',
  sonstiges: 'sonstiges',
};

const ART_NACH_TYP: Readonly<Record<string, EpaArt>> = {
  Wages: 'lohn',
  Materials: 'stoffe',
  Plant: 'geraete',
  Miscellaneous: 'sonstiges',
  Unknown: 'frei',
};

/** `Type` (tgUpCompType), den der Writer je Art schreibt. */
export const TYP_DER_ART: Readonly<Record<EpaArt, string>> = {
  lohn: 'Wages',
  stoffe: 'Materials',
  geraete: 'Plant',
  nachunternehmer: 'Miscellaneous',
  sonstiges: 'Miscellaneous',
  frei: 'Unknown',
};

export interface Beschriftungsdeutung {
  readonly anteil: EpaArt;
  /** `false`: Bezeichnung und `Type` nennen verschiedene Arten (die Bezeichnung gilt). */
  readonly vertraeglich: boolean;
}

/** Deutet `LblUPComp<n>` aus Bezeichnung und `Type`. */
export function deuteBeschriftung(bezeichnung: string, typ: string): Beschriftungsdeutung {
  const nachName = ART_NACH_BEZEICHNUNG[bezeichnung.trim().toLowerCase()];
  const nachTyp = ART_NACH_TYP[typ];
  const vertraeglich =
    nachName === undefined ||
    nachTyp === undefined ||
    nachTyp === 'frei' ||
    nachName === nachTyp ||
    (nachTyp === 'sonstiges' && nachName === 'nachunternehmer');
  return { anteil: nachName ?? nachTyp ?? 'frei', vertraeglich };
}
