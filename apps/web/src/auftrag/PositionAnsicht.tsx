// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 151 (B-17): Positionsdialog „nur lesen“ auf der Seite des Auftrags-LV. Öffnet mit Strg+Enter oder Doppelklick im
// Grid und über „Position anzeigen“; zeigt die Angaben und den Langtext (Editor schreibgeschützt), ohne Befehl. Geändert wird
// das Auftrags-LV nur über Nachträge (D-35).

import { Button, Dialog, LangtextEditor } from '@tethys/ui-basis';
import type { AuftragsLvZustand, PositionId } from '@tethys/vertrag';
import type { ReactElement } from 'react';
import { positionsangaben } from './position';
import { texte } from './texte';

const t = texte.position;

export function PositionAnsicht({
  auftrag,
  positionId,
  onSchliessen,
}: {
  auftrag: AuftragsLvZustand;
  /** Offen, solange eine Position gewählt ist. */
  positionId: PositionId | null;
  onSchliessen: () => void;
}): ReactElement {
  const a = positionId === null ? null : positionsangaben(auftrag, positionId);
  return (
    <Dialog
      offen={a !== null}
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={a?.titel ?? t.titel}
      beschreibung={t.nurLesen}
      fuss={<Button onClick={onSchliessen}>{t.schliessen}</Button>}
    >
      {a === null ? null : (
        <>
          <dl className="auftrag__position" aria-label={t.angaben}>
            {a.zeilen.map((z) => (
              <div key={z.label}>
                <dt>{z.label}</dt>
                <dd>{z.wert}</dd>
              </div>
            ))}
          </dl>
          {a.langtext.length === 0 ? (
            <p>{t.ohneLangtext}</p>
          ) : (
            <LangtextEditor
              key={positionId}
              wert={a.langtext}
              beschriftung={t.langtext}
              nurLesen
              onBestaetigen={() => undefined}
            />
          )}
        </>
      )}
    </Dialog>
  );
}
