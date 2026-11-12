// SPDX-License-Identifier: AGPL-3.0-or-later
// Netto nach Nachlass eines LV in der Liste der Projektseite (Ticket 121, D-62, D-92.4). Der Wert kommt mit der Übersicht
// (`LvUebersicht.nettoNachNachlass`, gefüllt von `speicher`, Ticket 106); die Seite lädt kein LV dafür nach. Fehlt er, steht „–“.

import type { Betrag } from '@tethys/vertrag';
import type { ReactElement } from 'react';
import { formatiereBetragDe } from '../lv/zahlen';
import { texte } from './texte';

export function LvNetto({ name, netto }: { name: string; netto: Betrag | undefined }): ReactElement {
  return (
    <span className="projekt__betrag" aria-label={`${texte.lvs.netto} ${name}`}>
      {netto === undefined ? '–' : `${formatiereBetragDe(netto)} €`}
    </span>
  );
}
