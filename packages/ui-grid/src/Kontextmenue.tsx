// SPDX-License-Identifier: AGPL-3.0-or-later
// Kontextmenü an Zeile und Zelle (Ticket 156, U1, U3): Radix Dropdown Menu, verankert an einem unsichtbaren Punkt, an dem
// das Menü aufgehen soll (Mauszeiger bzw. aktive Zelle bei Umschalt+F10 und Menütaste). Die Punkte sind dieselben Aktionen
// wie die Tasten aus `GRID_KUERZEL`, mit der Taste daneben. Eine gewählte Aktion läuft erst, wenn das Menü zu ist und der
// Fokus wieder im Grid steht (ein Dialog, den sie öffnet, gibt ihn dorthin zurück); das Aussehen kommt aus `tx-menue`.

import * as Menue from '@radix-ui/react-dropdown-menu';
import { Tastenkuerzel } from '@tethys/ui-basis';
import { useRef } from 'react';
import type { ReactElement } from 'react';
import { GRID_KUERZEL } from './kuerzel';
import type { KuerzelAktion } from './kuerzel';
import { menuetexte } from './texte';

export interface Menuepunkt {
  readonly schluessel: string;
  readonly text: string;
  /** Die Aktion aus der Kürzeltabelle, deren Taste neben dem Punkt steht. */
  readonly kuerzel?: KuerzelAktion;
  readonly gesperrt?: boolean;
  readonly gefahr?: boolean;
  /** Ein Trennstrich vor dem Punkt. */
  readonly trenner?: boolean;
  readonly ausfuehren: () => void;
}

export interface KontextmenueProps {
  /** Wo das Menü aufgeht (Bildschirmkoordinaten); `null`: zu. */
  readonly ort: { readonly x: number; readonly y: number } | null;
  readonly punkte: readonly Menuepunkt[];
  /** Das Menü soll zugehen (Escape, Klick daneben, ein Punkt gewählt): `ort` auf `null` setzen. */
  readonly onZu: () => void;
  /** Das Menü ist zu: den Fokus zurück ins Grid, dann die gewählte Aktion (`null`: keine). */
  readonly onFokusZurueck: (aktion: (() => void) | null) => void;
}

/** Die Taste eines Kürzels in Teilen, z. B. `['Strg', 'Entf']` (die erste Möglichkeit, wenn es mehrere gibt). */
function tastenVon(aktion: KuerzelAktion | undefined): readonly string[] | null {
  const k = GRID_KUERZEL.find((x) => x.aktion === aktion);
  if (!k) return null;
  const erste = k.taste.split(' oder ')[0] ?? k.taste;
  return erste.split('+');
}

export function Kontextmenue({ ort, punkte, onZu, onFokusZurueck }: KontextmenueProps): ReactElement {
  const danach = useRef<(() => void) | null>(null);
  const offen = ort !== null;
  return (
    <Menue.Root
      open={offen}
      // Nicht modal wie die Werkzeuggruppen: Ein Klick daneben schließt das Menü und wirkt zugleich im Grid.
      modal={false}
      onOpenChange={(auf) => {
        if (!auf) onZu();
      }}
    >
      <Menue.Trigger asChild>
        <span
          className="tx-grid__menueanker"
          aria-hidden="true"
          tabIndex={-1}
          style={{ left: ort?.x ?? 0, top: ort?.y ?? 0 }}
        />
      </Menue.Trigger>
      <Menue.Portal>
        <Menue.Content
          className="tx-menue"
          aria-label={menuetexte.beschriftung}
          align="start"
          side="bottom"
          sideOffset={2}
          collisionPadding={8}
          loop
          onCloseAutoFocus={(e) => {
            // Den Fokus holt das Grid selbst zurück auf die aktive Zelle, nicht auf den unsichtbaren Anker.
            e.preventDefault();
            const aktion = danach.current;
            danach.current = null;
            onFokusZurueck(aktion);
          }}
        >
          {punkte.map((p) => {
            const tasten = tastenVon(p.kuerzel);
            return [
              p.trenner ? (
                <Menue.Separator key={`${p.schluessel}-trenner`} className="tx-grid__menuetrenner" />
              ) : null,
              <Menue.Item
                key={p.schluessel}
                className={p.gefahr ? 'tx-menue__punkt tx-menue__punkt--gefahr' : 'tx-menue__punkt'}
                disabled={p.gesperrt ?? false}
                onSelect={() => {
                  danach.current = p.ausfuehren;
                }}
              >
                {p.text}
                {tasten ? <Tastenkuerzel tasten={tasten} /> : null}
              </Menue.Item>,
            ];
          })}
        </Menue.Content>
      </Menue.Portal>
    </Menue.Root>
  );
}
