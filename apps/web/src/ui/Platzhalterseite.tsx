// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReactElement } from 'react';

export interface PlatzhalterTexte {
  titel: string;
  leer: string;
  hinweis: string;
}

/** Platzhalter für Fachseiten ohne Logik (Ticket 20). */
export function Platzhalterseite({ seite }: { seite: PlatzhalterTexte }): ReactElement {
  return (
    <div className="seite">
      <h1>{seite.titel}</h1>
      <p>{seite.leer}</p>
      <p className="seite__leise">{seite.hinweis}</p>
    </div>
  );
}
