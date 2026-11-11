// SPDX-License-Identifier: AGPL-3.0-or-later
// Ein echter Link innerhalb der App (Mittelklick öffnet einen neuen Tab), sonst ein Seitenwechsel ohne Neuladen. Für die
// Seiten von Auftrags-LV und Nachtrag (Tickets 64, 86).

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
      {...(className === undefined ? {} : { className })}
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
