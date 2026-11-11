// SPDX-License-Identifier: AGPL-3.0-or-later
import * as RadixTooltip from '@radix-ui/react-tooltip';
import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';

export interface TooltipProps {
  text: string;
  /** Genau ein fokussierbares Element, z. B. ein Button. */
  children: ReactElement;
  /** Optional: Tastaturkürzel, das hinter dem Text steht. */
  kuerzel?: string;
}

// Radix schließt einen offenen Tooltip aus einem Scroll-Listener am `window` heraus, sobald ein Vorfahr des Auslösers
// scrollt. Dieser Listener hier hängt dort vor jedem Tooltip-Inhalt (der erste Tooltip meldet ihn beim Einhängen an,
// Inhalte erst beim Öffnen) und merkt sich das Ereignis. Während Radix es bearbeitet, ist seine `eventPhase` nicht NONE.
let letzterScroll: Event | null = null;
let scrollBeobachtet = false;
function beobachteScroll(): void {
  if (scrollBeobachtet) return;
  scrollBeobachtet = true;
  window.addEventListener(
    'scroll',
    (e) => {
      letzterScroll = e;
    },
    { capture: true, passive: true },
  );
}
const scrollLaeuft = (): boolean => letzterScroll !== null && letzterScroll.eventPhase !== Event.NONE;

/**
 * Tooltip auf Radix Tooltip: erscheint bei Maus und bei Tastaturfokus, Escape schließt.
 *
 * Solange der Auslöser den Fokus hat, schließt Scrollen den Tooltip nicht (nur Fokusverlust, Escape oder Klick): Der
 * Fokus auf einen Auslöser außerhalb des sichtbaren Bereichs scrollt ihn ins Bild, das Scroll-Ereignis kommt aber erst
 * mit dem nächsten Bild und schlösse sonst den Tooltip, den derselbe Fokus gerade geöffnet hat. Scrollt der Auslöser
 * aus dem Bild, wird der Tooltip nur verborgen.
 */
export function Tooltip({ text, children, kuerzel }: TooltipProps): ReactElement {
  const [offen, setOffen] = useState(false);
  const ausloeser = useRef<HTMLButtonElement>(null);
  useEffect(beobachteScroll, []);
  return (
    <RadixTooltip.Provider delayDuration={400} skipDelayDuration={200}>
      <RadixTooltip.Root
        open={offen}
        onOpenChange={(neu) => {
          if (!neu && scrollLaeuft() && ausloeser.current === document.activeElement) return;
          setOffen(neu);
        }}
      >
        <RadixTooltip.Trigger asChild ref={ausloeser}>
          {children}
        </RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content className="tx-tooltip" side="bottom" sideOffset={6} hideWhenDetached>
            {text}
            {kuerzel ? <kbd className="tx-kbd">{kuerzel}</kbd> : null}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
