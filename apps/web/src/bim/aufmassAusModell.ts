// SPDX-License-Identifier: AGPL-3.0-or-later
// „Aufmaß aus Modell“ auf der Seite eines Auftrags-LV (Ticket 155, Einhängestelle `auftrag/AuftragsLvSeite.tsx` wie D-115):
// öffnet den aktuellen Stand des Modells mit dem Auftrags-LV als „LV für Zuordnung“ vorgewählt; dort führt „Aufmaßblatt aus
// Auswahl …“ weiter. Hat das Projekt keinen oder mehrere aktuelle Stände, die Liste der Modelle (die Vorwahl geht mit).
// Ohne Abhängigkeit auf `bim`, `ifc` oder `ui-modell` (die Seite des Auftrags-LV liegt im Hauptbündel). Seit Ticket 142
// steht der Eintrag im Menü der Abrechnung; der Hook liefert dafür die Adresse.

import type { AuftragsLeistungsverzeichnisId, ProjektId } from '@tethys/vertrag';
import { useEffect, useState } from 'react';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { aufmassAusModellPfad } from './pfad';

/** Die Adresse von „Aufmaß aus Modell“; bis die Liste der Modelle geladen ist, die Liste (mit Vorwahl). */
export function useAufmassAusModellPfad(
  projektId: ProjektId,
  auftragsLvId: AuftragsLeistungsverzeichnisId,
): string {
  const u = useUmgebung();
  const [pfad, setPfad] = useState(() => aufmassAusModellPfad(projektId, auftragsLvId, []));
  useEffect(() => {
    let aktiv = true;
    void u.speicher.bauwerksmodelle.auflisten(projektId).then((r) => {
      if (aktiv) setPfad(aufmassAusModellPfad(projektId, auftragsLvId, r.ok ? r.wert : []));
    });
    return () => {
      aktiv = false;
    };
  }, [u, projektId, auftragsLvId]);
  return pfad;
}
