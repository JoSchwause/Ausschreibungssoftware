// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/lv/<id>/stand/<standId>`: ein LV-Stand schreibgeschützt (Ticket 48, Punkt 4; ADR 0006). Das Grid hat keinen
// Befehlsausgang: Jede Änderung, die es senden würde, endet in der Meldung „Stand ist schreibgeschützt“. Der Stand
// lässt sich als neues LV übernehmen (`LeistungsverzeichnisAnlegen`, ein Undo-Schritt).

import { Button, useToast } from '@tethys/ui-basis';
import { LvGrid } from '@tethys/ui-grid';
import type { LeistungsverzeichnisId, LvStand, LvStandId } from '@tethys/vertrag';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { texte } from '../historie/texte';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { hrefFuer } from '../ui/route';
import { lvAnsichtBauen } from './ansicht';
import { befehlswegFuer } from './befehlsweg';
import { useMeldungen } from './meldungen';
import { zeitpunktDe } from './StaendeDialog';
import { standAlsLvBefehl } from './stand';
import { texte as lvTexte } from './texte';
import { gridZahlen } from './zahlen';
import '@tethys/ui-grid/grid.css';
import './lv.css';

const t = texte.staende;

type Laden = { art: 'laedt' } | { art: 'fehlt' } | { art: 'da'; stand: LvStand };

export function LvStandSeite({
  lvId,
  standId,
  gehe,
}: {
  lvId: LeistungsverzeichnisId;
  standId: LvStandId;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const [lage, setLage] = useState<Laden>({ art: 'laedt' });

  useEffect(() => {
    let aktiv = true;
    const staende = u.speicher.lvStaende; // v1.3: mechanisch angepasst, Folgeticket (Speicher.lvStaende Pflicht)
    void staende.laden(standId).then((r) => {
      if (aktiv)
        setLage(
          r.ok && r.wert.leistungsverzeichnisId === lvId ? { art: 'da', stand: r.wert } : { art: 'fehlt' },
        );
    });
    return () => {
      aktiv = false;
    };
  }, [u, lvId, standId]);

  if (lage.art === 'laedt') {
    return (
      <div className="seite" aria-busy="true">
        <p>{t.seiteLaden}</p>
      </div>
    );
  }
  if (lage.art === 'fehlt') {
    return (
      <div className="seite">
        <h1>{t.nichtGefunden}</h1>
      </div>
    );
  }
  return <StandAnsicht stand={lage.stand} gehe={gehe} />;
}

function StandAnsicht({ stand, gehe }: { stand: LvStand; gehe: (pfad: string) => void }): ReactElement {
  const u = useUmgebung();
  const { zeige } = useToast();
  const { pruefe } = useMeldungen();
  const [zugeklappt, setZugeklappt] = useState<ReadonlySet<string>>(new Set());
  const ansicht = useMemo(() => lvAnsichtBauen(stand.zustand, zugeklappt, new Map()), [stand, zugeklappt]);
  const lv = stand.zustand.leistungsverzeichnis;
  const lvPfad = `/lv/${lv.id}`;

  const schreibgeschuetzt = useCallback(() => {
    zeige({ titel: t.schreibgeschuetzt, beschreibung: t.schreibgeschuetztText });
  }, [zeige]);

  const alsNeuesLv = async (): Promise<void> => {
    const befehl = standAlsLvBefehl(stand, u.ids);
    const a = await befehlswegFuer(u).lv(lv.projektId, null).befehl(befehl);
    if (pruefe(a)) gehe(`/lv/${befehl.id}`);
  };

  return (
    <div className="seite lv lv--stand">
      <div className="lv__kopf">
        <h1>
          {lv.name} – {stand.name}
        </h1>
        <span className="lv__kennzeichen">{t.kennzeichen}</span>
        <span className="lv__leise">
          {t.angelegt} {zeitpunktDe(stand.angelegt)}
        </span>
        <a
          href={hrefFuer(lvPfad)}
          onClick={(e) => {
            e.preventDefault();
            gehe(lvPfad);
          }}
        >
          {t.zumLv}
        </a>
      </div>
      <div className="lv__werkzeuge" role="toolbar" aria-label={lvTexte.werkzeuge.leiste}>
        <HistorieKnoepfe />
        <Button onClick={() => void alsNeuesLv()}>{t.alsNeuesLv}</Button>
      </div>
      <div className="lv__haupt">
        <div className="lv__grid">
          <LvGrid
            ansicht={ansicht}
            zahlen={gridZahlen}
            ids={u.ids}
            beschriftung={t.grid}
            onBefehl={schreibgeschuetzt}
            onBefehlsfolge={schreibgeschuetzt}
            onKopieEinfuegen={schreibgeschuetzt}
            onAufklappen={(knotenId, auf) => {
              setZugeklappt((alt) => {
                const neu = new Set(alt);
                if (auf) neu.delete(knotenId);
                else neu.add(knotenId);
                return neu;
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}
