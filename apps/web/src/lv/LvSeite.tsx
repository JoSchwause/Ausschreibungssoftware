// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/lv/<id>`: das LV im Grid. Jede Änderung, aus dem Grid wie von den Schaltflächen, geht als genau ein Befehl
// über die Sitzung durch Kern und Speicher (A5, U7); angezeigt wird erst der gespeicherte Stand (Q5).

import { kopieBauen, lvPruefen } from '@tethys/kern';
import { Button, Tastenkuerzel, useToast } from '@tethys/ui-basis';
import { LvGrid, type Sprungziel } from '@tethys/ui-grid';
import type {
  Befehlshinweis,
  Einfuegeort,
  KnotenId,
  LeistungsverzeichnisId,
  LvBefehl,
  LvSpalte,
  LvZustand,
  Position,
  PositionId,
  Positionsdaten,
  Pruefbefund,
} from '@tethys/vertrag';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent, MouseEvent, ReactElement } from 'react';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { hrefFuer } from '../ui/route';
import { lvAnsichtBauen } from './ansicht';
import { Angebote } from '../gaeb/Angebote';
import { GaebAusgeben } from '../gaeb/GaebAusgeben';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { texte as htexte } from '../historie/texte';
import { befehlswegFuer, type Ausgang, type LvSitzung } from './befehlsweg';
import { positionOrt, titelOrt, untertitelOrt } from './einfuegeort';
import { merkmaleBefehl, type Merkmalwahl } from './merkmale';
import { KopfdatenDialog } from './KopfdatenDialog';
import { MerkmaleDialog } from './MerkmaleDialog';
import { useMeldungen } from './meldungen';
import { PapierkorbDialog } from './PapierkorbDialog';
import { PositionsDialog } from './PositionsDialog';
import { PruefPanel, type PruefPanelSteuerung } from './PruefPanel';
import { befundeJeKnoten, imLeerlauf, pruefgruppen, sprungZu } from './pruefung';
import { StaendeDialog } from './StaendeDialog';
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

/** Spalten ohne eigene Eingabe im Grid: Ein Doppelklick dort öffnet den Positionsdialog. */
const OHNE_EINGABE: ReadonlySet<string> = new Set<LvSpalte>(['ordnungszahl', 'positionsart', 'gesamtpreis']);

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
          ? { art: 'da', sitzung: befehlswegFuer(u).lv(r.wert.leistungsverzeichnis.projektId, r.wert) }
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
  return <LvAngemeldet id={id} sitzung={lage.sitzung} gehe={gehe} />;
}

/** Meldet die Sitzung beim Befehlsweg an (Undo/Redo an diesem LV) und zeigt das LV, solange es es gibt. */
function LvAngemeldet({
  id,
  sitzung,
  gehe,
}: {
  id: LeistungsverzeichnisId;
  sitzung: LvSitzung;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  useEffect(() => befehlswegFuer(u).anmelden(id, sitzung), [u, id, sitzung]);
  const zustand = useSyncExternalStore(sitzung.abonnieren, sitzung.lesen);
  if (zustand === null) {
    // Ein Rückgängig hat das LV gelöscht (z. B. sein Anlegen zurückgenommen); Wiederholen holt es zurück.
    return (
      <div className="seite">
        <h1>{texte.seite.nichtGefunden}</h1>
      </div>
    );
  }
  return <LvBearbeiten sitzung={sitzung} zustand={zustand} gehe={gehe} />;
}

function LvBearbeiten({
  sitzung,
  zustand,
  gehe,
}: {
  sitzung: LvSitzung;
  zustand: LvZustand;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const { pruefe } = useMeldungen();
  const lv = zustand.leistungsverzeichnis;
  const papierkorb = zustand.papierkorb ?? [];
  const [zugeklappt, setZugeklappt] = useState<ReadonlySet<string>>(new Set());
  const [hinweise, setHinweise] = useState<readonly Befehlshinweis[]>([]);
  const [sprungziel, setSprungziel] = useState<Sprungziel | undefined>(undefined);
  const sprungNr = useRef(0);
  /** Die aktive Zeile des Grids, wie sie zuletzt über die Auswahl gemeldet wurde. */
  const aktiv = useRef<KnotenId | null>(null);
  const [merkmale, setMerkmale] = useState<Position | null>(null);
  const [dialog, setDialog] = useState<PositionId | null>(null);
  const [kopfdaten, setKopfdaten] = useState(false);
  const [papierkorbOffen, setPapierkorbOffen] = useState(false);
  const [staendeOffen, setStaendeOffen] = useState(false);
  const [panelOffen, setPanelOffen] = useState(true);
  const panel = useRef<PruefPanelSteuerung>(null);
  const { zeige } = useToast();

  // Formale LV-Prüfung (U5): nach jedem angenommenen Befehl neu, entkoppelt im nächsten Leerlauf, nie im Tastendruck.
  const [befunde, setBefunde] = useState<readonly Pruefbefund[] | null>(null);
  useEffect(
    () =>
      imLeerlauf(() => {
        setBefunde(lvPruefen(zustand));
      }),
    [zustand],
  );
  const jeKnoten = useMemo(() => befundeJeKnoten(befunde ?? []), [befunde]);
  const gruppen = useMemo(() => pruefgruppen(befunde ?? [], lv.knoten), [befunde, lv.knoten]);

  const ansicht = useMemo(
    () => lvAnsichtBauen(zustand, zugeklappt, jeKnoten),
    [zustand, zugeklappt, jeKnoten],
  );

  const senden = useCallback(
    async (befehl: LvBefehl): Promise<boolean> => {
      const a = await sitzung.befehl(befehl);
      if (!a.ok && a.abweisung.art === 'speicher' && a.abweisung.fehler.code === 'konflikt') {
        // D-12: Ein Angebot verweist auf eine Position im Eintrag; sonst ein abhängiger Stand.
        const papier = befehl.art === 'PapierkorbeintragEntfernen' || befehl.art === 'PapierkorbLeeren';
        zeige({
          titel: texte.meldungen.nichtGespeichert,
          beschreibung: papier ? htexte.papierkorb.konflikt : texte.speicherfehler.konflikt,
          art: 'fehler',
        });
        return false;
      }
      if (!pruefe(a)) return false;
      setHinweise(a.hinweise);
      return true;
    },
    [sitzung, pruefe, zeige],
  );

  /** Mehrere Befehle aus einer Benutzeraktion: ein Undo-Schritt (Einfügen aus der Zwischenablage). */
  const sendenFolge = useCallback(
    async (befehle: readonly LvBefehl[]): Promise<void> => {
      const aus = await sitzung.folge(befehle);
      const neu: Befehlshinweis[] = [];
      for (const a of aus) if (pruefe(a)) neu.push(...a.hinweise);
      setHinweise(neu);
    },
    [sitzung, pruefe],
  );

  /** Strg+V nach Strg+C im selben Grid: die Kopie baut der Kern mit neuen Kennungen der App (Ticket 42). */
  const kopieEinfuegen = (knotenIds: readonly KnotenId[], ort: Einfuegeort): void => {
    const z = sitzung.zustand;
    if (z === null) return;
    let knoten;
    try {
      knoten = kopieBauen(z, knotenIds, u.ids);
    } catch {
      // Die kopierten Zeilen gibt es nicht mehr (gelöscht oder rückgängig gemacht).
      zeige({ titel: texte.meldungen.kopieFehlt, art: 'fehler' });
      return;
    }
    void senden({ art: 'KnotenEinfuegen', ort, knoten });
  };

  /** Befehle mit ihrem Ausgang, ein Undo-Schritt (für die Dialoge, die Formfehler am Feld zeigen). */
  const folge = useCallback(
    async (bs: readonly LvBefehl[]): Promise<Ausgang<unknown>[]> => {
      const aus = await sitzung.folge(bs);
      const neu: Befehlshinweis[] = [];
      for (const a of aus) if (a.ok) neu.push(...a.hinweise);
      setHinweise(neu);
      return aus;
    },
    [sitzung],
  );

  /** Springt im Grid zur Zelle; `spalte: null` behält die aktive Spalte. */
  const springe = (knotenId: KnotenId, spalte: LvSpalte | null = 'kurztext'): void => {
    aktiv.current = knotenId;
    sprungNr.current += 1;
    setSprungziel(
      spalte === null ? { knotenId, nr: sprungNr.current } : { knotenId, spalte, nr: sprungNr.current },
    );
  };

  /** Sprunglink aus dem Prüf-Panel: Vorfahren aufklappen, dann zur Zelle bzw. in den Positionsdialog. */
  const pruefSprung = (b: Pruefbefund): void => {
    const s = sprungZu(b, lv.knoten);
    if (s.aufklappen.some((id) => zugeklappt.has(id))) {
      setZugeklappt((alt) => {
        const neu = new Set(alt);
        for (const id of s.aufklappen) neu.delete(id);
        return neu;
      });
    }
    const z = s.ziel;
    if (z.art === 'zelle') springe(z.knotenId, z.spalte ?? null);
    else if (z.art === 'dialog') {
      springe(z.positionId, null);
      setDialog(z.positionId);
    } else if (z.feld === 'nachlass') {
      document.querySelector<HTMLElement>('.lv__summenfelder input')?.focus();
    }
  };

  const dialogOeffnen = (): void => {
    const k = aktiv.current === null ? undefined : lv.knoten.find((x) => x.id === aktiv.current);
    if (k?.art === 'position') setDialog(k.id);
    else zeige({ titel: texte.werkzeuge.keinePosition, beschreibung: texte.werkzeuge.keinePositionText });
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
  const merkmaleOeffnen = (): void => {
    const k = aktiv.current === null ? undefined : lv.knoten.find((x) => x.id === aktiv.current);
    if (k?.art === 'position') setMerkmale(k);
    else zeige({ titel: texte.werkzeuge.keinePosition, beschreibung: texte.werkzeuge.keinePositionText });
  };
  const merkmaleUebernehmen = (p: Position, w: Merkmalwahl): void => {
    setMerkmale(null);
    const b = merkmaleBefehl(p, w);
    if (b !== null) void senden(b);
  };

  // Tastenkürzel der App (Strg+Alt+…): kollidieren nicht mit dem Grid (dort Strg ohne Alt) und nicht mit den
  // reservierten Kürzeln des Browsers (Strg+Umschalt+T öffnet in Chrome den letzten Tab wieder).
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'F8' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      // Auf der LV-Seite gehört F8 dem Prüf-Panel. Der Meldungsbereich (Radix Toast) hört am `document` ebenfalls auf F8
      // und nähme dem Panel den Fokus gleich wieder weg; das Ereignis endet deshalb hier.
      e.stopPropagation();
      panel.current?.fokussieren();
      return;
    }
    if (!(e.ctrlKey || e.metaKey) || !e.altKey || e.shiftKey) return;
    const aktion = {
      KeyT: () => {
        titelAnlegen(false);
      },
      KeyU: () => {
        titelAnlegen(true);
      },
      KeyP: positionAnlegen,
      KeyM: merkmaleOeffnen,
    }[e.code];
    if (aktion === undefined) return;
    e.preventDefault();
    aktion();
  };

  /** Zeile im Grid (nicht im Zelleditor) unter dem Ereignisziel, mit ihrem Knoten. */
  const gridZeile = (ziel: EventTarget): { knotenId: KnotenId; spalte: string | undefined } | null => {
    if (!(ziel instanceof Element) || ziel.closest('[data-editor]') || !ziel.closest('[role="treegrid"]'))
      return null;
    const i = Number(ziel.closest('[data-i]')?.getAttribute('data-i'));
    const zeile = Number.isNaN(i) ? undefined : ansicht.zeilen[i];
    if (zeile === undefined) return null;
    return {
      knotenId: zeile.knoten.id,
      spalte: ziel.closest<HTMLElement>('[data-spalte]')?.dataset['spalte'],
    };
  };
  // Strg+Enter auf einer Zeile öffnet den Positionsdialog. Vor dem Grid abgefangen: Das Grid nähme es als Enter.
  const onKeyDownCapture = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key !== 'Enter' || !(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
    const z = gridZeile(e.target);
    if (z === null) return;
    e.preventDefault();
    e.stopPropagation();
    aktiv.current = z.knotenId;
    dialogOeffnen();
  };
  // Doppelklick auf eine Zelle ohne eigene Eingabe (OZ, Art, GP) öffnet den Dialog; die übrigen bearbeitet das Grid.
  const onDoubleClick = (e: MouseEvent<HTMLDivElement>): void => {
    const z = gridZeile(e.target);
    if (z === null || !OHNE_EINGABE.has(z.spalte ?? '')) return;
    const k = lv.knoten.find((x) => x.id === z.knotenId);
    if (k?.art === 'position') setDialog(k.id);
  };

  const projektPfad = `/projekt/${lv.projektId}`;
  return (
    <div
      className="seite lv"
      onKeyDown={onKeyDown}
      onKeyDownCapture={onKeyDownCapture}
      onDoubleClick={onDoubleClick}
    >
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
        <HistorieKnoepfe />
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
        <Button onClick={merkmaleOeffnen} aria-keyshortcuts="Control+Alt+M">
          {texte.werkzeuge.merkmale} <Tastenkuerzel tasten={texte.werkzeuge.tastenMerkmale} />
        </Button>
        <Button onClick={dialogOeffnen} aria-keyshortcuts="Control+Enter">
          {texte.dialog.oeffnen} <Tastenkuerzel tasten={texte.dialog.tastenOeffnen} />
        </Button>
        <Button onClick={umnummerieren}>{texte.werkzeuge.umnummerieren}</Button>
        <Button
          onClick={() => {
            setKopfdaten(true);
          }}
        >
          {texte.kopfdaten.oeffnen}
        </Button>
        <Button
          onClick={() => {
            panel.current?.fokussieren();
          }}
          aria-keyshortcuts="F8"
        >
          {texte.pruefung.titel} <Tastenkuerzel tasten={texte.pruefung.tasten} />
        </Button>
        <Button
          onClick={() => {
            setPapierkorbOffen(true);
          }}
        >
          {htexte.papierkorb.knopf} ({papierkorb.length})
        </Button>
        <Button
          onClick={() => {
            setStaendeOffen(true);
          }}
        >
          {htexte.staende.knopf}
        </Button>
        <GaebAusgeben zustand={zustand} />
        <Angebote zustand={zustand} />
      </div>
      <div className="lv__haupt">
        <div className="lv__grid">
          <LvGrid
            ansicht={ansicht}
            zahlen={gridZahlen}
            ids={u.ids}
            beschriftung={texte.seite.grid}
            hinweise={hinweise}
            {...(sprungziel ? { sprungziel } : {})}
            onBefehl={(b) => void senden(b)}
            onBefehlsfolge={(bs) => void sendenFolge(bs)}
            onKopieEinfuegen={kopieEinfuegen}
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
        <PruefPanel
          ref={panel}
          gruppen={gruppen}
          geprueft={befunde !== null}
          offen={panelOffen}
          onOffenChange={setPanelOffen}
          onSprung={pruefSprung}
        />
      </div>
      <SummenFelder lv={lv} senden={senden} />
      <MerkmaleDialog
        position={merkmale}
        onSchliessen={() => {
          setMerkmale(null);
        }}
        onUebernehmen={merkmaleUebernehmen}
      />
      <PositionsDialog
        zustand={zustand}
        positionId={dialog}
        onSchliessen={() => {
          setDialog(null);
        }}
        folge={folge}
        speicherAbweisung={(a) => {
          pruefe(a);
        }}
      />
      <PapierkorbDialog
        offen={papierkorbOffen}
        onSchliessen={() => {
          setPapierkorbOffen(false);
        }}
        papierkorb={papierkorb}
        senden={senden}
      />
      <StaendeDialog
        lvId={lv.id}
        offen={staendeOffen}
        onSchliessen={() => {
          setStaendeOffen(false);
        }}
        senden={senden}
        gehe={gehe}
      />
      <KopfdatenDialog
        lv={lv}
        offen={kopfdaten}
        onSchliessen={() => {
          setKopfdaten(false);
        }}
        folge={folge}
        abweisung={(a) => {
          pruefe(a);
        }}
      />
    </div>
  );
}
