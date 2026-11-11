// SPDX-License-Identifier: AGPL-3.0-or-later
// Ein Verweis innerhalb der App (Ticket 87): normaler Link mit `href` (neuer Tab geht), ein einfacher Klick wechselt ohne
// Neuladen.

import type { ReactElement } from 'react';
import { hrefFuer } from '../ui/route';

export function Verweis({
  pfad,
  text,
  gehe,
  className,
}: {
  pfad: string;
  text: string;
  gehe: (pfad: string) => void;
  className?: string;
}): ReactElement {
  return (
    <a
      href={hrefFuer(pfad)}
      className={className}
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
