// SPDX-License-Identifier: AGPL-3.0-or-later
// Ein Link innerhalb der App (Review Welle 5, S8): ein echtes `<a href>` (Mittelklick und „In neuem Tab öffnen“ gehen),
// ein einfacher Klick wechselt die Seite ohne Neuladen. Die eine Komponente für alle Seiten.

import type { ReactElement } from 'react';
import { hrefFuer } from './route';

export function Verweis({
  pfad,
  text,
  gehe,
  className,
  'aria-label': ariaLabel,
}: {
  pfad: string;
  text: string;
  gehe: (pfad: string) => void;
  /** z. B. `tx-button tx-button--sekundaer`, um wie eine Schaltfläche auszusehen. */
  className?: string;
  'aria-label'?: string;
}): ReactElement {
  return (
    <a
      href={hrefFuer(pfad)}
      {...(className === undefined ? {} : { className })}
      {...(ariaLabel === undefined ? {} : { 'aria-label': ariaLabel })}
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
