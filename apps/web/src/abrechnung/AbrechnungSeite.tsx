// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 87: die Seiten der Abrechnung eines Auftrags-LV (`/projekt/<id>/auftrag/<id>/aufmass[/<blatt>]`, `…/soll-ist`).
// Geladen wird das Auftrags-LV mit allen Blättern (D-87.3); Rückgängig und Wiederholen an einem anderen Ort laden neu.

import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { befehlswegFuer } from '../lv/befehlsweg';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { abrechnungLaden, type Abrechnungsstand } from './aufmass';
import { BlattListe } from './BlattListe';
import { BlattSeite } from './BlattSeite';
import { SollIstSeite } from './SollIstSeite';
import { Verweis } from '../ui/Verweis';
import type { Abrechnungsseite } from './pfad';
import { texte } from './texte';
import '@tethys/ui-grid/grid.css';
import '../lv/lv.css';
import '../gaeb/gaeb.css';
import './abrechnung.css';

type Laden = { art: 'laedt' } | { art: 'fehlt' } | { art: 'da'; stand: Abrechnungsstand };

/** Lädt Auftrags-LV und Blätter; `neuLaden` holt beides wieder aus dem Speicher (der alte Stand bleibt bis dahin). */
export function useAbrechnungsstand(seite: Abrechnungsseite): {
  lage: Laden;
  neuLaden: () => void;
} {
  const u = useUmgebung();
  const [lage, setLage] = useState<Laden>({ art: 'laedt' });
  const [lauf, setLauf] = useState(0);
  useEffect(() => {
    let aktiv = true;
    void abrechnungLaden(u.speicher, seite.auftragsLvId).then((r) => {
      if (aktiv) setLage(r.ok ? { art: 'da', stand: r.wert } : { art: 'fehlt' });
    });
    return () => {
      aktiv = false;
    };
  }, [u, seite.auftragsLvId, lauf]);
  const neuLaden = useCallback(() => {
    setLauf((n) => n + 1);
  }, []);
  return { lage, neuLaden };
}

export function AbrechnungSeite({
  seite,
  gehe,
}: {
  seite: Abrechnungsseite;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const weg = befehlswegFuer(u);
  const { lage, neuLaden } = useAbrechnungsstand(seite);
  // Die Liste lädt nach jedem Undo/Redo neu; das Blatt führt seinen eigenen Stand nach (BlattSeite).
  useEffect(
    () => (seite.art === 'blatt' ? undefined : weg.beiHistorie(neuLaden)),
    [weg, seite.art, neuLaden],
  );

  if (lage.art === 'laedt') {
    return (
      <div className="seite" aria-busy="true">
        <p>{texte.laden}</p>
      </div>
    );
  }
  if (lage.art === 'fehlt') {
    return (
      <div className="seite">
        <h1>{texte.nichtGefunden}</h1>
        <div className="lv__werkzeuge">
          <HistorieKnoepfe />
          <Verweis pfad={`/projekt/${seite.projektId}`} text={texte.zumProjekt} gehe={gehe} />
        </div>
      </div>
    );
  }
  if (seite.art === 'blatt')
    return <BlattSeite stand={lage.stand} aufmassId={seite.aufmassId} gehe={gehe} neuLaden={neuLaden} />;
  if (seite.art === 'soll-ist') return <SollIstSeite stand={lage.stand} gehe={gehe} />;
  return <BlattListe stand={lage.stand} gehe={gehe} />;
}
