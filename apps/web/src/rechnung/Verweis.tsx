// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 88: Link innerhalb der App (Wechsel ohne Neuladen, „In neuem Tab öffnen“ geht trotzdem).

import type { ReactElement } from 'react';
import { hrefFuer } from '../ui/route';

export function Verweis({
  pfad,
  text,
  gehe,
  ...rest
}: {
  pfad: string;
  text: string;
  gehe: (pfad: string) => void;
  'aria-label'?: string;
}): ReactElement {
  return (
    <a
      href={hrefFuer(pfad)}
      {...rest}
      onClick={(e) => {
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        gehe(pfad);
      }}
    >
      {text}
    </a>
  );
}
