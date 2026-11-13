// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/hilfe`: Ziel des Eintrags „Hilfe“ der Seitenleiste (Ticket 131). Noch leer; den Inhalt (Erste Schritte,
// Tastenkürzel, Annahmen, Über) bringt Ticket 147.

import type { ReactElement } from 'react';
import { texte } from './texte';

export function HilfeSeite(): ReactElement {
  return (
    <div className="seite">
      <h1>{texte.titel}</h1>
    </div>
  );
}
