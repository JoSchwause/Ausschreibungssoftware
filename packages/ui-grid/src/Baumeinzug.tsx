// SPDX-License-Identifier: AGPL-3.0-or-later
// Baumdarstellung der Baumspalte, gemeinsam für alle Grids (U2): Einzug je Tiefe und der Auf-/Zuklappknopf. Der Knopf
// nimmt keinen Fokus; das Grid erkennt ihn am Attribut `data-aufklappen` (Delegation am Wurzelelement).

import type { ReactElement } from 'react';
import { Icon } from '@tethys/ui-basis';
import { texte } from './texte';

export function Baumeinzug(props: {
  readonly tiefe: number;
  readonly hatUnterknoten: boolean;
  readonly aufgeklappt: boolean;
}): ReactElement {
  const { tiefe, hatUnterknoten, aufgeklappt } = props;
  return (
    <span className="tx-grid__baum" style={{ paddingInlineStart: tiefe * 16 }}>
      {hatUnterknoten ? (
        <button
          type="button"
          tabIndex={-1}
          data-aufklappen=""
          className="tx-grid__knopf"
          aria-label={aufgeklappt ? texte.zuklappen : texte.aufklappen}
        >
          <Icon name="pfeilUnten" groesse={14} className={aufgeklappt ? undefined : 'tx-grid__pfeil--zu'} />
        </button>
      ) : (
        <span className="tx-grid__platz" aria-hidden="true" />
      )}
    </span>
  );
}
