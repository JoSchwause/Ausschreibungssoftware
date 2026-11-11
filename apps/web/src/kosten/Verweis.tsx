// SPDX-License-Identifier: AGPL-3.0-or-later
// Ein interner Link der Kostenseiten: wechselt ohne Neuladen, bleibt aber ein echter Link („In neuem Tab öffnen“).

import type { ReactElement } from 'react';
import { hrefFuer } from '../ui/route';

export function Verweis({
  pfad,
  text,
  gehe,
  knopf = false,
}: {
  pfad: string;
  text: string;
  gehe: (pfad: string) => void;
  /** Wie eine schlichte Schaltfläche darstellen. */
  knopf?: boolean;
}): ReactElement {
  return (
    <a
      {...(knopf ? { className: 'tx-button tx-button--schlicht' } : {})}
      href={hrefFuer(pfad)}
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
