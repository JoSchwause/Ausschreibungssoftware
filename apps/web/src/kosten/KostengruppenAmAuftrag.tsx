// SPDX-License-Identifier: AGPL-3.0-or-later
// Kostengruppen am Auftrags-LV zuordnen (Ticket 89, C2, D-85.8): Die Kostenkontrolle liest das Auftrags-LV, also stehen die
// Kostengruppen dort. Der Knopf öffnet denselben Dialog wie im LV; die Befehle (`KostengruppeSetzen` als AuftragsLvBefehl) gehen
// als eine Aktion über die Sitzung des Auftrags-LV, ein Undo-Schritt. Eine Einhängestelle in `AuftragsLvSeite`, eine Zeile.

import { Button } from '@tethys/ui-basis';
import type { AuftragsLvZustand, KostengruppeSetzen } from '@tethys/vertrag';
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { KostengruppenDialog } from './KostengruppenDialog';
import { positionenInReihenfolge } from './kostengruppe';
import { auftragsLvSitzung } from './schreiben';
import { texte } from './texte';

export function KostengruppenAmAuftrag({
  auftrag,
  neuLaden,
}: {
  auftrag: AuftragsLvZustand;
  /** Der Aufrufer lädt das Auftrags-LV neu, nachdem Befehle geschrieben wurden. */
  neuLaden: () => void;
}): ReactElement {
  const u = useUmgebung();
  const { pruefe } = useMeldungen();
  const [offen, setOffen] = useState(false);
  const a = auftrag.auftragsLeistungsverzeichnis;
  const positionen = useMemo(() => (offen ? positionenInReihenfolge(a.id, a.knoten) : []), [offen, a.id, a.knoten]);

  const senden = async (befehle: readonly KostengruppeSetzen[]): Promise<boolean> => {
    const aus = await auftragsLvSitzung(u, a.projektId, auftrag).folge(befehle);
    let ok = true;
    for (const x of aus) if (!pruefe(x)) ok = false;
    neuLaden();
    return ok;
  };

  return (
    <>
      <Button
        onClick={() => {
          setOffen(true);
        }}
      >
        {texte.zuordnung.knopf}
      </Button>
      <KostengruppenDialog
        offen={offen}
        onSchliessen={() => {
          setOffen(false);
        }}
        projektId={a.projektId}
        positionen={positionen}
        vorauswahl={[]}
        senden={senden}
      />
    </>
  );
}
