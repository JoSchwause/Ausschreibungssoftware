// SPDX-License-Identifier: AGPL-3.0-or-later
import * as RadixTooltip from '@radix-ui/react-tooltip';
import type { ReactElement } from 'react';

export interface TooltipProps {
  text: string;
  /** Genau ein fokussierbares Element, z. B. ein Button. */
  children: ReactElement;
  /** Optional: Tastaturkürzel, das hinter dem Text steht. */
  kuerzel?: string;
}

/** Tooltip auf Radix Tooltip: erscheint bei Maus und bei Tastaturfokus, Escape schließt. */
export function Tooltip({ text, children, kuerzel }: TooltipProps): ReactElement {
  return (
    <RadixTooltip.Provider delayDuration={400} skipDelayDuration={200}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content className="tx-tooltip" side="bottom" sideOffset={6}>
            {text}
            {kuerzel ? <kbd className="tx-kbd">{kuerzel}</kbd> : null}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
