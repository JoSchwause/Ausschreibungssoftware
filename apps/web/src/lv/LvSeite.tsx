// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/lv/<id>`: das LV im Grid. Jede Änderung, aus dem Grid wie von den Schaltflächen, geht als genau ein Befehl
// über die Sitzung durch Kern und Speicher (A5, U7); angezeigt wird erst der gespeicherte Stand (Q5).

import { Button, Tastenkuerzel } from '@tethys/ui-basis';
import { LvGrid, type Sprungziel } from '@tethys/ui-grid';
import type {
  Befehlshinweis,
  Einfuegeort,
  KnotenId,
  LeistungsverzeichnisId,
  LvBefehl,
  LvZustand,
  Positionsdaten,
} from '@tethys/vertrag';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { hrefFuer } from '../ui/route';
import { lvAnsichtBauen } from './ansicht';
import { lvSitzung, type LvSitzung } from './befehlsweg';
import { positionOrt, titelOrt, untertitelOrt } from './einfuegeort';
import { useMeldungen } from './meldungen';
import { SummenFelder } from './SummenFelder';
import { texte } from './texte';
import { gridZahlen } from './zahlen';
import '@tethys/ui-grid/grid.css';
import './lv.css';

const LEERE_DATEN: Positionsdaten = {
  ordnungszahl: null,
  ozIndex: null,
  merkmale: { bedarf: null, wahl: null, stundenlohn: false, pauschal: false, zuschlagskennzeichen: false },
  zuschlag: null,
  kurztext: '',
  langtext: [],
  menge: null,
  einheit: null,
  einheitspreis: null,
  epa: null,
};

type Laden = { art: 'laedt' } | { art: 'fehlt' } | { art: 'da'; sitzung: LvSitzung };

export function LvSeite({
  id,
  gehe,
}: {
  id: LeistungsverzeichnisId;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const [lage, setLage] = useState<Laden>({ art: 'laedt' });

  useEffect(() => {
    let aktiv = true;
    void u.speicher.leistungsverzeichnisse.laden(id).then((r) => {
      if (!aktiv) return;
      setLage(
        r.ok
          ? { art: 'da', sitzung: lvSitzung(u, r.wert.leistungsverzeichnis.projektId, r.wert) }
          : { art: 'fehlt' },
      );
    });
    return () => {
      aktiv = false;
    };
  }, [u, id]);

  if (lage.art === 'laedt') {
    return (
      <div className="seite" aria-busy="true">
        <p>{texte.seite.laden}</p>
      </div>
    );
  }
  if (lage.art === 'fehlt') {
    return (
      <div className="seite">
        <h1>{texte.seite.nichtGefunden}</h1>
      </div>
    );
  }
  return <LvBearbeiten sitzung={lage.sitzung} gehe={gehe} />;
}

function LvBearbeiten({ sitzung, gehe }: { sitzung: LvSitzung; gehe: (pfad: string) => void }): ReactElement {
  const u = useUmgebung();
  const { pruefe } = useMeldungen();
  const zustand = useSyncExternalStore(sitzung.abonnieren, sitzung.lesen) as LvZustand;
  const lv = zustand.leistungsverzeichnis;
  const [zugeklappt, setZugeklappt] = useState<ReadonlySet<string>>(new Set());
  const [hinweise, setHinweise] = useState<readonly Befehlshinweis[]>([]);
  const [sprungziel, setSprungziel] = useState<Sprungziel | undefined>(undefined);
  const sprungNr = useRef(0);
  /** Die aktive Zeile des Grids, wie sie zuletzt über die Auswahl gemeldet wurde. */
  const aktiv = useRef<KnotenId | null>(null);

  const ansicht = useMemo(() => lvAnsichtBauen(zustand, zugeklappt), [zustand, zugeklappt]);

  const senden = useCallback(
    async (befehl: LvBefehl): Promise<boolean> => {
      const a = await sitzung.befehl(befehl);
      if (!pruefe(a)) return false;
      setHinweise(a.hinweise);
      return true;
    },
    [sitzung, pruefe],
  );

  const springe = (knotenId: KnotenId): void => {
    aktiv.current = knotenId;
    sprungNr.current += 1;
    setSprungziel({ knotenId, spalte: 'kurztext', nr: sprungNr.current });
  };

  /** Legt einen Knoten an und setzt die aktive Zelle auf seinen Kurztext. */
  const anlegen = async (befehl: LvBefehl & { id: KnotenId; ort: Einfuegeort }): Promise<void> => {
    // Eine zugeklappte Gliederung, in die der Knoten kommt, wird aufgeklappt, damit er sichtbar ist.
    const ziel = befehl.ort.art === 'nach' ? befehl.ort.knotenId : befehl.ort.elternId;
    if (zugeklappt.has(ziel)) {
      setZugeklappt((alt) => {
        const neu = new Set(alt);
        neu.delete(ziel);
        return neu;
      });
    }
    if (await senden(befehl)) springe(befehl.id);
  };

  const titelAnlegen = (unter: boolean): void => {
    const ort = unter ? untertitelOrt(lv, aktiv.current) : titelOrt(lv, aktiv.current);
    void anlegen({ art: 'GliederungAnlegen', id: u.ids.titel(), gliederungsart: 'titel', ort, kurztext: '' });
  };
  const positionAnlegen = (): void => {
    void anlegen({
      art: 'PositionAnlegen',
      id: u.ids.position(),
      ort: positionOrt(lv, aktiv.current),
      daten: LEERE_DATEN,
    });
  };
  const umnummerieren = (): void => {
    void senden({ art: 'Umnummerieren', teilbaumId: lv.id });
  };

  // Tastenkürzel der App (Strg+Alt+…): kollidieren nicht mit dem Grid (dort Strg ohne Alt) und nicht mit den
  // reservierten Kürzeln des Browsers (Strg+Umschalt+T öffnet in Chrome den letzten Tab wieder).
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (!(e.ctrlKey || e.metaKey) || !e.altKey || e.shiftKey) return;
    const aktion = {
      KeyT: () => {
        titelAnlegen(false);
      },
      KeyU: () => {
        titelAnlegen(true);
      },
      KeyP: positionAnlegen,
    }[e.code];
    if (aktion === undefined) return;
    e.preventDefault();
    aktion();
  };

  const projektPfad = `/projekt/${lv.projektId}`;
  return (
    <div className="seite lv" onKeyDown={onKeyDown}>
      <div className="lv__kopf">
        <h1>{lv.name}</h1>
        <a
          href={hrefFuer(projektPfad)}
          onClick={(e) => {
            e.preventDefault();
            gehe(projektPfad);
          }}
        >
          {texte.seite.zumProjekt}
        </a>
      </div>
      <div className="lv__werkzeuge" role="toolbar" aria-label={texte.werkzeuge.leiste}>
        <Button
          onClick={() => {
            titelAnlegen(false);
          }}
          aria-keyshortcuts="Control+Alt+T"
        >
          {texte.werkzeuge.titelAnlegen} <Tastenkuerzel tasten={texte.werkzeuge.tastenTitel} />
        </Button>
        <Button
          onClick={() => {
            titelAnlegen(true);
          }}
          aria-keyshortcuts="Control+Alt+U"
        >
          {texte.werkzeuge.untertitelAnlegen} <Tastenkuerzel tasten={texte.werkzeuge.tastenUntertitel} />
        </Button>
        <Button onClick={positionAnlegen} aria-keyshortcuts="Control+Alt+P">
          {texte.werkzeuge.positionAnlegen} <Tastenkuerzel tasten={texte.werkzeuge.tastenPosition} />
        </Button>
        <Button onClick={umnummerieren}>{texte.werkzeuge.umnummerieren}</Button>
      </div>
      <div className="lv__grid">
        <LvGrid
          ansicht={ansicht}
          zahlen={gridZahlen}
          ids={u.ids}
          beschriftung={texte.seite.grid}
          hinweise={hinweise}
          {...(sprungziel ? { sprungziel } : {})}
          onBefehl={(b) => void senden(b)}
          onBefehlsfolge={(folge) => {
            for (const b of folge) void senden(b);
          }}
          onAuswahlChange={(ids) => {
            const letzte = ids.at(-1);
            if (letzte !== undefined) aktiv.current = letzte;
          }}
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
      <SummenFelder lv={lv} senden={senden} />
    </div>
  );
}
