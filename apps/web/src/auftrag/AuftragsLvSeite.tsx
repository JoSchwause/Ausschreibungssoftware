// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/projekt/<id>/auftrag/<id>` (Ticket 64): das Auftrags-LV nach dem Zuschlag, nur lesend (Nicht-Ziel: Bearbeiten,
// Nachträge, Aufmaß). Kopf mit Auftragnehmer und Bezug auf LV und Angebot, Grid schreibgeschützt (Ticket 54) mit seiner
// Summenzeile, Prüf-Panel nur lesend, Ausgabe als GAEB X86. Summen und Befunde aus dem Kern (N1).

import { lvPruefen } from '@tethys/kern';
import { LvGrid, type Sprungziel } from '@tethys/ui-grid';
import type {
  AuftragsLeistungsverzeichnisId,
  AuftragsLvZustand,
  KnotenId,
  LvSpalte,
  Pruefbefund,
  ProjektId,
} from '@tethys/vertrag';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { lvAnsichtBauen } from '../lv/ansicht';
import { befehlswegFuer } from '../lv/befehlsweg';
import { PruefPanel, type PruefPanelSteuerung } from '../lv/PruefPanel';
import { befundeJeKnoten, imLeerlauf, pruefgruppen, sprungZu } from '../lv/pruefung';
import { gridZahlen } from '../lv/zahlen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { hrefFuer } from '../ui/route';
import { preisspiegelPfad } from '../vergabe/pfad';
import { alsLvZustand } from './auftrag';
import { AuftragAusgeben } from './AuftragAusgeben';
import { texte } from './texte';
import '@tethys/ui-grid/grid.css';
import '../lv/lv.css';
import './auftrag.css';

const t = texte.seite;

interface Stand {
  readonly auftrag: AuftragsLvZustand;
  readonly lvName: string | null;
  readonly bieter: string | null;
}

type Laden = { art: 'laedt' } | { art: 'fehlt' } | { art: 'da'; stand: Stand };

export function AuftragsLvSeite({
  projektId,
  id,
  gehe,
}: {
  projektId: ProjektId;
  id: AuftragsLeistungsverzeichnisId;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const [lage, setLage] = useState<Laden>({ art: 'laedt' });
  const [lauf, setLauf] = useState(0);

  useEffect(() => {
    let aktiv = true;
    void (async (): Promise<Laden> => {
      const r = await u.speicher.auftragsLeistungsverzeichnisse.laden(id);
      if (!r.ok) return { art: 'fehlt' };
      const auftrag = r.wert;
      const kopf = auftrag.auftragsLeistungsverzeichnis;
      const [lv, p, a] = await Promise.all([
        u.speicher.leistungsverzeichnisse.laden(kopf.leistungsverzeichnisId),
        u.speicher.projekte.laden(projektId),
        u.speicher.angebote.laden(kopf.angebotId),
      ]);
      const bieterId = a.ok ? a.wert.angebot.bieterId : null;
      return {
        art: 'da',
        stand: {
          auftrag,
          lvName: lv.ok ? lv.wert.leistungsverzeichnis.name : null,
          bieter: (p.ok ? p.wert.bieter.find((b) => b.id === bieterId)?.name : undefined) ?? null,
        },
      };
    })().then((l) => {
      if (aktiv) setLage(l);
    });
    return () => {
      aktiv = false;
    };
  }, [u, projektId, id, lauf]);
  // Undo/Redo kann das Auftrags-LV entfernen oder zurückholen: neu laden.
  useEffect(
    () =>
      befehlswegFuer(u).beiHistorie(() => {
        setLauf((n) => n + 1);
      }),
    [u],
  );

  if (lage.art === 'laedt') {
    return (
      <div className="seite" aria-busy="true">
        <p>{t.laden}</p>
      </div>
    );
  }
  if (lage.art === 'fehlt') {
    return (
      <div className="seite">
        <h1>{t.nichtGefunden}</h1>
        <div className="lv__werkzeuge">
          <HistorieKnoepfe />
          <Verweis pfad={`/projekt/${projektId}`} text={t.zumProjekt} gehe={gehe} />
        </div>
      </div>
    );
  }
  return <Ansicht stand={lage.stand} gehe={gehe} />;
}

function Verweis({
  pfad,
  text,
  gehe,
}: {
  pfad: string;
  text: string;
  gehe: (pfad: string) => void;
}): ReactElement {
  return (
    <a
      href={hrefFuer(pfad)}
      onClick={(e) => {
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        gehe(pfad);
      }}
    >
      {text}
    </a>
  );
}

function Ansicht({ stand, gehe }: { stand: Stand; gehe: (pfad: string) => void }): ReactElement {
  const { auftrag } = stand;
  const kopf = auftrag.auftragsLeistungsverzeichnis;
  const zustand = useMemo(() => alsLvZustand(auftrag), [auftrag]);
  const [zugeklappt, setZugeklappt] = useState<ReadonlySet<string>>(new Set());
  const [sprungziel, setSprungziel] = useState<Sprungziel | undefined>(undefined);
  const sprungNr = useRef(0);
  const [panelOffen, setPanelOffen] = useState(true);
  const panel = useRef<PruefPanelSteuerung>(null);

  // Prüfung wie auf der LV-Seite, im Leerlauf (U5); nur lesend: Sprünge gehen zur Zeile, nie in einen Dialog.
  const [befunde, setBefunde] = useState<readonly Pruefbefund[] | null>(null);
  useEffect(
    () =>
      imLeerlauf(() => {
        setBefunde(lvPruefen(zustand));
      }),
    [zustand],
  );
  const jeKnoten = useMemo(() => befundeJeKnoten(befunde ?? []), [befunde]);
  const gruppen = useMemo(
    () => pruefgruppen(befunde ?? [], zustand.leistungsverzeichnis.knoten),
    [befunde, zustand],
  );
  const ansicht = useMemo(
    () => lvAnsichtBauen(zustand, zugeklappt, jeKnoten),
    [zustand, zugeklappt, jeKnoten],
  );

  const springe = (knotenId: KnotenId, spalte: LvSpalte | null): void => {
    sprungNr.current += 1;
    setSprungziel(
      spalte === null ? { knotenId, nr: sprungNr.current } : { knotenId, spalte, nr: sprungNr.current },
    );
  };
  const pruefSprung = (b: Pruefbefund): void => {
    const s = sprungZu(b, zustand.leistungsverzeichnis.knoten);
    if (s.aufklappen.some((x) => zugeklappt.has(x))) {
      setZugeklappt((alt) => {
        const neu = new Set(alt);
        for (const x of s.aufklappen) neu.delete(x);
        return neu;
      });
    }
    const z = s.ziel;
    if (z.art === 'zelle') springe(z.knotenId, z.spalte ?? null);
    else if (z.art === 'dialog') springe(z.positionId, null);
  };

  const bieter = stand.bieter ?? kopf.auftragnehmer?.name ?? null;
  return (
    <div
      className="seite lv auftrag"
      onKeyDown={(e) => {
        // F8 springt ins Prüf-Panel wie auf der LV-Seite (das Ereignis endet hier, sonst nähme der Meldungsbereich den Fokus).
        if (e.key !== 'F8' || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
        e.preventDefault();
        e.stopPropagation();
        panel.current?.fokussieren();
      }}
    >
      <div className="lv__kopf">
        <h1>{t.titel(kopf.name)}</h1>
        <span className="lv__kennzeichen">{t.kennzeichen}</span>
        <Verweis pfad={`/projekt/${kopf.projektId}`} text={t.zumProjekt} gehe={gehe} />
      </div>
      <dl className="auftrag__kopf" aria-label={t.kennzeichen}>
        <dt>{t.auftragnehmer}</dt>
        <dd data-testid="auftragnehmer">{kopf.auftragnehmer?.name ?? t.ohneAuftragnehmer}</dd>
        <dt>{t.ausschreibung}</dt>
        <dd>
          <Verweis pfad={`/lv/${kopf.leistungsverzeichnisId}`} text={stand.lvName ?? kopf.name} gehe={gehe} />
        </dd>
        <dt>{t.angebot}</dt>
        <dd>
          <Verweis
            pfad={preisspiegelPfad(kopf.leistungsverzeichnisId)}
            text={bieter === null ? t.zumPreisspiegel : t.angebotVon(bieter)}
            gehe={gehe}
          />
        </dd>
      </dl>
      <div className="lv__werkzeuge" role="toolbar" aria-label={t.werkzeuge}>
        <HistorieKnoepfe />
        <AuftragAusgeben auftrag={auftrag} />
        <button
          type="button"
          className="tx-button tx-button--sekundaer"
          aria-keyshortcuts="F8"
          onClick={() => {
            panel.current?.fokussieren();
          }}
        >
          {t.pruefung}
        </button>
      </div>
      <div className="lv__haupt">
        <div className="lv__grid">
          <LvGrid
            ansicht={ansicht}
            zahlen={gridZahlen}
            beschriftung={t.grid}
            schreibgeschuetzt
            {...(sprungziel ? { sprungziel } : {})}
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
        <PruefPanel
          ref={panel}
          gruppen={gruppen}
          geprueft={befunde !== null}
          offen={panelOffen}
          onOffenChange={setPanelOffen}
          onSprung={pruefSprung}
        />
      </div>
    </div>
  );
}
