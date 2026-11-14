// SPDX-License-Identifier: AGPL-3.0-or-later
// Meldung der Startprüfung (E13, D-77): erscheint statt der App, wenn dem Browser eine nötige Fähigkeit fehlt.

import type { ReactElement } from 'react';
import type { Faehigkeit } from './faehigkeiten';
import { texte } from './texte';
import './fehler.css';

export interface BrowserHinweisProps {
  readonly fehlt: readonly Faehigkeit[];
  /** Ist die Seite über eine sichere Verbindung geladen (`isSecureContext`)? */
  readonly sicher: boolean;
}

export function BrowserHinweis({ fehlt, sicher }: BrowserHinweisProps): ReactElement {
  const t = texte.browser;
  return (
    <main className="fehler-seite">
      <div className="fehler" role="alert">
        <h1>{t.titel}</h1>
        <p>{t.fehlt}</p>
        <ul>
          {fehlt.map((f) => (
            <li key={f}>{t.faehigkeit[f]}</li>
          ))}
        </ul>
        {sicher ? null : <p>{t.unsicher}</p>}
        <p>{t.naechsterSchritt}</p>
        {fehlt.includes('opfs') ? <p>{t.privat}</p> : null}
        <p className="fehler__leise">{t.geprueft}</p>
      </div>
    </main>
  );
}
