// SPDX-License-Identifier: AGPL-3.0-or-later
// Tastenbelegung der fokussierten Leinwand (U3, U8). Die Pfeiltasten bewegen die Kamera in ihre Richtung um das Modell
// (drehen) bzw. mit Umschalt parallel zur Bildebene (verschieben). Mit Strg, Alt oder Cmd bleibt jede Taste beim Browser.

export type Richtung = 'links' | 'rechts' | 'hoch' | 'runter';

export type Bedienbefehl =
  | { readonly art: 'drehen'; readonly richtung: Richtung }
  | { readonly art: 'verschieben'; readonly richtung: Richtung }
  | { readonly art: 'zoomen'; readonly richtung: 'naeher' | 'weiter' }
  | { readonly art: 'auswahl-zeigen' }
  | { readonly art: 'zuruecksetzen' };

/** Die Felder eines `KeyboardEvent`, die die Belegung braucht. */
export interface Tastendruck {
  readonly key: string;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
}

const PFEILE: Readonly<Record<string, Richtung>> = {
  ArrowLeft: 'links',
  ArrowRight: 'rechts',
  ArrowUp: 'hoch',
  ArrowDown: 'runter',
};

export function befehlAusTaste(t: Tastendruck): Bedienbefehl | null {
  if (t.ctrlKey || t.altKey || t.metaKey) return null;
  const richtung = PFEILE[t.key];
  if (richtung) return { art: t.shiftKey ? 'verschieben' : 'drehen', richtung };
  switch (t.key) {
    case '+':
      return { art: 'zoomen', richtung: 'naeher' };
    case '-':
      return { art: 'zoomen', richtung: 'weiter' };
    case 'f':
    case 'F':
      return { art: 'auswahl-zeigen' };
    case 'Home':
      return { art: 'zuruecksetzen' };
    default:
      return null;
  }
}
