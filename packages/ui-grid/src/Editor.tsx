// SPDX-License-Identifier: AGPL-3.0-or-later
// Eingabefeld in einer Zelle. Es nimmt jede Eingabe an (U5): Der Hinweis zum Zahlenformat erscheint nur als
// Markierung am Feld und sperrt nichts. Der Entwurf lebt im Grid; bestätigt wird nur über das Grid.

import { useLayoutEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import type { LvSpalte } from '@tethys/vertrag';
import { pruefeZahlformatDeDE } from '@tethys/ui-basis';
import { SPALTENTITEL } from './texte';

export type Richtung = 'unten' | 'oben' | 'rechts' | 'links' | 'keine';

export interface EditorAktionen {
  entwurf(text: string): void;
  /** Bestätigt und bewegt die aktive Zelle. */
  bestaetigen(richtung: Richtung): void;
  /** Tab/Umschalt+Tab im Editor. `true`: das Grid hat die Taste behandelt (Standardaktion unterdrücken). */
  tab(rueckwaerts: boolean): boolean;
  verwerfen(): void;
  /** Fokus ging verloren (Mausklick woanders): bestätigen, ohne den Fokus zu holen. */
  verloren(): void;
}

export interface EditorProps {
  spalte: LvSpalte;
  entwurf: string;
  aktionen: EditorAktionen;
  /**
   * Hinweis zur Form des Entwurfs für Spalten ohne Zahlenformat, z. B. die Spalte „KG“ (Ticket 93): eine Meldung oder
   * `undefined`. Wie beim Zahlenformat nur eine Markierung, keine Sperre.
   */
  pruefen?: ((text: string) => string | undefined) | undefined;
}

const ZAHLSPALTEN: ReadonlySet<LvSpalte> = new Set<LvSpalte>(['menge', 'einheitspreis']);

export function Editor({ spalte, entwurf, aktionen, pruefen }: EditorProps): ReactElement {
  const ref = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const n = el.value.length;
    el.setSelectionRange(n, n);
  }, []);

  const pruefung = ZAHLSPALTEN.has(spalte) ? pruefeZahlformatDeDE(entwurf) : { gueltig: true as const };
  const meldung = pruefung.gueltig ? pruefen?.(entwurf) : pruefung.meldung;

  return (
    <input
      ref={ref}
      data-editor=""
      className={meldung ? 'tx-grid__editor tx-grid__editor--hinweis' : 'tx-grid__editor'}
      type="text"
      value={entwurf}
      inputMode={ZAHLSPALTEN.has(spalte) ? 'decimal' : spalte === 'kostengruppe' ? 'numeric' : 'text'}
      spellCheck={false}
      autoComplete="off"
      aria-label={SPALTENTITEL[spalte]}
      aria-invalid={meldung ? true : undefined}
      title={meldung}
      onChange={(e) => {
        aktionen.entwurf(e.target.value);
      }}
      onKeyDown={(e) => {
        switch (e.key) {
          case 'Enter':
            e.preventDefault();
            aktionen.bestaetigen(e.shiftKey ? 'oben' : 'unten');
            break;
          case 'Tab':
            if (aktionen.tab(e.shiftKey)) e.preventDefault();
            break;
          case 'Escape':
            e.preventDefault();
            aktionen.verwerfen();
            break;
          default:
            return;
        }
        e.stopPropagation();
      }}
      onBlur={() => {
        aktionen.verloren();
      }}
    />
  );
}
