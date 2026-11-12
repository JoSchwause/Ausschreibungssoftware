// SPDX-License-Identifier: AGPL-3.0-or-later
// Zugriff auf Parameterwerte einer STEP-Instanz: ein Wert der falschen Art gilt als fehlend (tolerant lesen, U5).

import type { StepWert } from './step';

/** Text einer Zeichenkette; `null` für `$`, einen leeren Text und jede andere Art. */
export function text(w: StepWert | undefined): string | null {
  return w?.art === 'text' && w.wert !== '' ? w.wert : null;
}

/** Elemente einer Liste; leer für jede andere Art. */
export function liste(w: StepWert | undefined): readonly StepWert[] {
  return w?.art === 'liste' ? w.werte : [];
}

/** Nummer eines Verweises `#n`; `null` für jede andere Art. */
export function verweis(w: StepWert | undefined): number | null {
  return w?.art === 'verweis' ? w.id : null;
}

/** Aufzählungswert ohne Punkte (`ELEMENT`); `null` für jede andere Art. */
export function aufzaehlung(w: StepWert | undefined): string | null {
  return w?.art === 'aufzaehlung' ? w.wert : null;
}

/** Texte einer Liste von Zeichenketten, leere ausgelassen. */
export function texte(w: StepWert | undefined): string[] {
  return liste(w)
    .map(text)
    .filter((t): t is string => t !== null);
}
