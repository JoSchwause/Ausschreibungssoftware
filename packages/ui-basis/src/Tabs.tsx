// SPDX-License-Identifier: AGPL-3.0-or-later
import * as RadixTabs from '@radix-ui/react-tabs';
import type { ReactElement, ReactNode } from 'react';

export interface Reiter {
  wert: string;
  label: string;
  inhalt: ReactNode;
}

export interface TabsProps {
  /** Zugänglicher Name der Reiterleiste. */
  label: string;
  reiter: readonly Reiter[];
  /** Nicht gesteuert: Startreiter (Standard: erster). */
  startWert?: string;
}

/** Reiter auf Radix Tabs: Pfeil links/rechts wechselt, Tab springt in den Inhalt. */
export function Tabs({ label, reiter, startWert }: TabsProps): ReactElement {
  const start = startWert ?? reiter[0]?.wert;
  return (
    <RadixTabs.Root className="tx-tabs" {...(start === undefined ? {} : { defaultValue: start })}>
      <RadixTabs.List className="tx-tabs__liste" aria-label={label}>
        {reiter.map((r) => (
          <RadixTabs.Trigger key={r.wert} value={r.wert} className="tx-tabs__reiter">
            {r.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {reiter.map((r) => (
        <RadixTabs.Content key={r.wert} value={r.wert} className="tx-tabs__inhalt">
          {r.inhalt}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
