// SPDX-License-Identifier: AGPL-3.0-or-later
// Hinweisleiste des Grids (v1.1a, Punkt 10): zeigt die Hinweise zum zuletzt angenommenen Befehl. Reine Darstellung;
// die Hinweise setzt und leert der Aufrufer. Sie sperren nie (U5). Die Region bleibt auch leer im DOM, damit
// Bildschirmleser neue Hinweise über `aria-live` ansagen.

import { useId } from 'react';
import type { ReactElement } from 'react';
import type { Befehlshinweis, KnotenId } from '@tethys/vertrag';
import { befehlshinweisText, texte } from './texte';

export interface HinweisleisteProps {
  readonly hinweise: readonly Befehlshinweis[];
  /** Der Nutzer will zur Zeile des genannten Knotens (Knopf, per Tastatur und Maus, U3). */
  readonly onSprung: (knotenId: KnotenId) => void;
}

export function Hinweisleiste({ hinweise, onSprung }: HinweisleisteProps): ReactElement {
  const basis = useId();
  return (
    <div
      className={hinweise.length > 0 ? 'tx-grid__hinweise' : 'tx-grid__hinweise tx-grid__hinweise--leer'}
      role="region"
      aria-label={texte.hinweise}
      aria-live="polite"
    >
      {hinweise.length > 0 ? (
        <ul className="tx-grid__hinweisliste">
          {hinweise.map((h, i) => {
            const textId = `${basis}-${String(i)}`;
            const { knotenId } = h;
            return (
              <li key={`${h.code}-${String(i)}`} className="tx-grid__hinweis">
                <span id={textId}>{befehlshinweisText(h.code)}</span>
                {knotenId !== undefined ? (
                  <button
                    type="button"
                    className="tx-button tx-button--sm tx-grid__sprung"
                    aria-describedby={textId}
                    onClick={() => {
                      onSprung(knotenId);
                    }}
                  >
                    {texte.zurZeile}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
