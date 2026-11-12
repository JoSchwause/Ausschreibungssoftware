// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 93 (C2, D-89.1): die Spalte „KG“ im LV-Grid der LV-Seite und des Auftrags-LV. Die Seiten setzen nur diese
// Eigenschaften an einer markierten Stelle ein (D-20). Die Form der Nummer prüft `kgLesen` aus `kosten` (über
// `kgZelleLesen`); eine formwidrige Eingabe ist ein Zellfehler im Grid. Jede Aktion ist ein Undo-Schritt
// (`Sitzung.folge`), auch das Einfügen mehrerer Kostengruppen. Der Dialog aus Ticket 89 bleibt für die Mehrfachauswahl.

import { STANDARDSPALTEN } from '@tethys/ui-grid';
import type { LvGridBearbeitbar, LvGridSchreibgeschuetzt } from '@tethys/ui-grid';
import type { AuftragsLvZustand, LvSpalte } from '@tethys/vertrag';
import { useMemo } from 'react';
import { kgZelleLesen } from './kostengruppe';
import { useKostengruppenAmAuftrag } from './KostengruppenAmAuftrag';

/**
 * Die Spalten des LV-Grids mit „KG“ am Ende, nach dem Gesamtpreis (D-93.3): Menge, Einheit, EP und GP bleiben beieinander,
 * und ein Block aus Excel, der bisher ab einer Spalte passte, passt weiter.
 */
export const SPALTEN_MIT_KG: readonly LvSpalte[] = [...STANDARDSPALTEN, 'kostengruppe'];

/** LV-Seite: Die Befehle gehen wie jede Eingabe über `onBefehl` bzw. `onBefehlsfolge` der Seite (ein Undo-Schritt). */
export const kgSpalteImLv = {
  spalten: SPALTEN_MIT_KG,
  kostengruppeLesen: kgZelleLesen,
} satisfies Pick<LvGridBearbeitbar, 'spalten' | 'kostengruppeLesen'>;

/**
 * Auftrags-LV: Das Grid bleibt schreibgeschützt bis auf die Spalte „KG“. Die Befehle gehen als AuftragsLvBefehl
 * (`KostengruppeSetzen`) über die Sitzung des Auftrags-LV, je Aktion ein Undo-Schritt; danach lädt die Seite neu.
 */
export function useKgSpalteAmAuftrag(
  auftrag: AuftragsLvZustand,
  neuLaden: () => void,
): Pick<LvGridSchreibgeschuetzt, 'spalten' | 'kostengruppeLesen' | 'onKostengruppen'> {
  const senden = useKostengruppenAmAuftrag(auftrag, neuLaden);
  return useMemo(
    () => ({
      spalten: SPALTEN_MIT_KG,
      kostengruppeLesen: kgZelleLesen,
      onKostengruppen: (befehle) => {
        void senden(befehle);
      },
    }),
    [senden],
  );
}
