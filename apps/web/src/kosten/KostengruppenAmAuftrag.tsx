// SPDX-License-Identifier: AGPL-3.0-or-later
// Kostengruppen am Auftrags-LV zuordnen (Ticket 89, C2, D-85.8): Die Kostenkontrolle liest das Auftrags-LV, also stehen die
// Kostengruppen dort. Der Knopf öffnet denselben Dialog wie im LV; die Befehle (`KostengruppeSetzen` als AuftragsLvBefehl) gehen
// als eine Aktion über die Sitzung des Auftrags-LV, ein Undo-Schritt. Eine Einhängestelle in `AuftragsLvSeite`, eine Zeile.

import { Button } from '@tethys/ui-basis';
import type { AuftragsLvZustand, KostengruppeSetzen } from '@tethys/vertrag';
import { useCallback, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { KostengruppenDialog } from './KostengruppenDialog';
import { positionenInReihenfolge } from './kostengruppe';
import { auftragsLvSitzung } from './schreiben';
import { texte } from './texte';

/**
 * Schreibt Kostengruppen am Auftrags-LV als eine Aktion (ein Undo-Schritt) und lädt danach neu; Abweisungen meldet es als
 * Toast. `true`, wenn alle angenommen wurden. Eine Sitzung je geladenem Stand, damit rasch aufeinanderfolgende Aktionen
 * (Eingaben in der Spalte „KG“, Ticket 93) jede auf dem Stand nach der vorigen laufen, auch bevor neu geladen ist.
 */
export function useKostengruppenAmAuftrag(
  auftrag: AuftragsLvZustand,
  /** Der Aufrufer lädt das Auftrags-LV neu, nachdem Befehle geschrieben wurden. */
  neuLaden: () => void,
): (befehle: readonly KostengruppeSetzen[]) => Promise<boolean> {
  const u = useUmgebung();
  const { pruefe } = useMeldungen();
  const projektId = auftrag.auftragsLeistungsverzeichnis.projektId;
  const sitzung = useMemo(() => auftragsLvSitzung(u, projektId, auftrag), [u, projektId, auftrag]);
  return useCallback(
    async (befehle: readonly KostengruppeSetzen[]): Promise<boolean> => {
      const aus = await sitzung.folge(befehle);
      let ok = true;
      for (const x of aus) if (!pruefe(x)) ok = false;
      neuLaden();
      return ok;
    },
    [sitzung, pruefe, neuLaden],
  );
}

export function KostengruppenAmAuftrag({
  auftrag,
  neuLaden,
}: {
  auftrag: AuftragsLvZustand;
  /** Der Aufrufer lädt das Auftrags-LV neu, nachdem Befehle geschrieben wurden. */
  neuLaden: () => void;
}): ReactElement {
  const [offen, setOffen] = useState(false);
  const a = auftrag.auftragsLeistungsverzeichnis;
  const positionen = useMemo(
    () => (offen ? positionenInReihenfolge(a.id, a.knoten) : []),
    [offen, a.id, a.knoten],
  );
  const senden = useKostengruppenAmAuftrag(auftrag, neuLaden);

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
