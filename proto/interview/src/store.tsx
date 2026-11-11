// Wegwerfcode. Gemeinsamer Zustand aller Ansichten: das LV (aenderbar), Nachlass und MwSt, GAEB-Stand,
// Zuschlag. Alles im Speicher; Neuladen setzt zurueck.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { formatiereBetragDe, formatiereEinheitspreisDe, formatiereMengeDe, parseEinheitspreisDe, parseMengeDe } from '@tethys/dezimal';
import type { GridIdQuelle, GridZahlen, Knoten, LvBefehl, PositionId, Prozent, Position } from '@tethys/vertrag';
import { gpLv, ladeLv, rechne } from './rechnen';
import type { Rechnung } from './rechnen';
import { baueSpiegel } from './spiegel';
import type { Spiegel } from './spiegel';

/** Setzt die Befehle des Grids und der anderen Varianten auf die flache Knotenliste um (kein `kern`). */
export function wendeAn(knoten: readonly Knoten[], b: LvBefehl): Knoten[] {
  let liste = [...knoten];
  switch (b.art) {
    case 'KurztextAendern':
      return liste.map((k) => (k.id === b.knotenId && k.art !== 'hinweis' ? { ...k, kurztext: b.kurztext } : k));
    case 'MengeAendern':
      return liste.map((k) => (k.id === b.positionId && k.art === 'position' ? { ...k, menge: b.menge } : k));
    case 'EinheitAendern':
      return liste.map((k) => (k.id === b.positionId && k.art === 'position' ? { ...k, einheit: b.einheit } : k));
    case 'EinheitspreisAendern':
      return liste.map((k) =>
        k.id === b.positionId && k.art === 'position' ? { ...k, einheitspreis: b.einheitspreis } : k,
      );
    case 'PositionAnlegen': {
      let elternId: Position['elternId'];
      let index: number;
      if (b.ort.art === 'nach') {
        const ortId = b.ort.knotenId;
        const i = liste.findIndex((k) => k.id === ortId);
        const bezug = liste[i];
        if (!bezug) return liste;
        elternId = bezug.art === 'titel' || bezug.art === 'los' ? bezug.id : bezug.elternId;
        index = i + 1;
      } else if (b.ort.art === 'ende') {
        elternId = b.ort.elternId;
        index = liste.length;
      } else if (b.ort.art === 'hinter-gliederung') {
        throw new Error('hinter-gliederung: erst Ticket 56'); // v1.3: mechanisch angepasst, Folgeticket
      } else {
        const ziel = b.ort.elternId;
        elternId = ziel;
        index = Math.max(0, liste.findIndex((k) => k.elternId === ziel));
      }
      const neu: Position = { ...b.daten, art: 'position', id: b.id, elternId, reihenfolge: 0 };
      liste.splice(index, 0, neu);
      return liste;
    }
    default:
      return liste;
  }
}

/** Ränder zum Grid (N4): Parsen und Formatieren ueber @tethys/dezimal. */
export const zahlen: GridZahlen = {
  parseMenge: (t: string) => {
    const r = parseMengeDe(t);
    return r.ok ? r : { ok: false, fehler: 'Keine gültige Menge. Erwartet wird z. B. 1.234,500.' };
  },
  parseEinheitspreis: (t: string) => {
    const r = parseEinheitspreisDe(t);
    return r.ok ? r : { ok: false, fehler: 'Kein gültiger Einheitspreis. Erwartet wird z. B. 12,350.' };
  },
  formatMenge: formatiereMengeDe,
  formatEinheitspreis: formatiereEinheitspreisDe,
  formatBetrag: formatiereBetragDe,
};

export interface Gaeb {
  x83: boolean;
  x84: boolean;
  export: boolean;
}

interface Store {
  lvId: string;
  lvName: string;
  knoten: readonly Knoten[];
  rechnung: Rechnung;
  nachlass: Prozent;
  mwst: Prozent;
  setNachlass: (p: Prozent) => void;
  setMwst: (p: Prozent) => void;
  befehl: (b: LvBefehl) => void;
  ids: GridIdQuelle;
  offen: ReadonlySet<string>;
  aufklappen: (id: string, auf: boolean) => void;
  wahl: string | null;
  setWahl: (id: string | null) => void;
  spiegel: Spiegel;
  gaeb: Gaeb;
  setGaeb: (g: Partial<Gaeb>) => void;
  zuschlag: number | null;
  setZuschlag: (i: number | null) => void;
  navigiere: (ansicht: string, variante?: string) => void;
}

const Ctx = createContext<Store | null>(null);
export const useStore = (): Store => {
  const s = useContext(Ctx);
  if (!s) throw new Error('Kein Store');
  return s;
};

const start = ladeLv();
const spiegel = baueSpiegel();

export function StoreAnbieter({ children, navigiere }: { children: ReactNode; navigiere: Store['navigiere'] }) {
  const [knoten, setKnoten] = useState<readonly Knoten[]>(start.knoten);
  const [nachlass, setNachlass] = useState<Prozent>(start.nachlass);
  const [mwst, setMwst] = useState<Prozent>(start.mwst);
  const [offen, setOffen] = useState<ReadonlySet<string>>(
    () => new Set(start.knoten.filter((k) => k.art === 'titel' || k.art === 'los').map((k) => k.id)),
  );
  const [wahl, setWahl] = useState<string | null>(null);
  const [gaeb, setGaebRoh] = useState<Gaeb>({ x83: false, x84: false, export: false });
  const [zuschlag, setZuschlag] = useState<number | null>(null);
  const zaehler = useRef(0);

  const rechnung = useMemo(() => rechne(knoten, gpLv, nachlass, mwst), [knoten, nachlass, mwst]);
  const befehl = useCallback((b: LvBefehl) => setKnoten((k) => wendeAn(k, b)), []);
  const ids = useMemo<GridIdQuelle>(
    () => ({
      position: () => {
        zaehler.current += 1;
        return `neu-${String(zaehler.current)}` as PositionId;
      },
      // v1.2: mechanisch angepasst, Folgeticket (GridIdQuelle, D-10 (4))
      papierkorbeintrag: () =>
        `papierkorb-${String((zaehler.current += 1))}` as ReturnType<GridIdQuelle['papierkorbeintrag']>,
    }),
    [],
  );
  const aufklappen = useCallback((id: string, auf: boolean) => {
    setOffen((alt) => {
      const neu = new Set(alt);
      if (auf) neu.add(id);
      else neu.delete(id);
      return neu;
    });
  }, []);

  const wert: Store = {
    lvId: start.id,
    lvName: start.name,
    knoten,
    rechnung,
    nachlass,
    mwst,
    setNachlass,
    setMwst,
    befehl,
    ids,
    offen,
    aufklappen,
    wahl,
    setWahl,
    spiegel,
    gaeb,
    setGaeb: (g) => setGaebRoh((alt) => ({ ...alt, ...g })),
    zuschlag,
    setZuschlag,
    navigiere,
  };
  return <Ctx.Provider value={wert}>{children}</Ctx.Provider>;
}
