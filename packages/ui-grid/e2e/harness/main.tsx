// SPDX-License-Identifier: AGPL-3.0-or-later
// Testseite des Grids (nur für Playwright und zum Ansehen). Sie spielt die Rolle der App: Sie hält den Zustand,
// baut aus Fixtures die `LvAnsicht` und nimmt die Befehle des Grids entgegen.
//
// Aufruf-Parameter:
//   fixture=typisch|gross   Datensatz (Standard typisch)
//   kopien=2                Baum n-fach mit frischen Kennungen (z. B. 10.000 Zeilen aus gross)
//   auf=alle|keine          Gliederungen aufgeklappt (Standard alle)
//   thema=dark|light
//   modus=attrappe|live     attrappe: Befehle nur aufzeichnen (Standard), neue Eigenschaften erst über
//                           window.__harness.uebernehmen(); live: Befehle sofort anwenden
//   befunde=1               Beispiel-Prüfhinweise an einigen Zellen
//   leer=1                  leeres LV (keine Knoten; die Wurzel bleibt die der Fixture)
//   hinweise=1              Beispiel-Befehlshinweise (einer nennt die letzte Position, einer hat einen unbekannten Code)
//   ausweis=1               Summenzeile mit Bedarfs- und Wahlsumme (erfundene Werte)
//   folge=1                 onBefehlsfolge gesetzt (Folgen in window.__harness.folgen)
//   kopie=1                 onKopieEinfuegen gesetzt (Aufrufe in window.__harness.kopien)
//   oz=1                    vorPositionAnlegen setzt die OZ „NEU“ (statt der OZ-Vergabe der App)
//   nurlesen=1              schreibgeschütztes Grid (keine Befehlsempfänger, Ticket 54)
//   oeffnen=1               onZeileOeffnen gesetzt (Aufrufe in window.__harness.geoeffnet)
//   zaehlen=1               positionenZaehlen gesetzt: genaue Zahl aus dem ganzen Modell, auch zugeklappt
//   ansatz=1                die 4. und 5. Position tragen einen erfundenen Mengenansatz (Ticket 74)
//   kg=1                    Spalte „KG“ am Ende mit Lesefunktion (Ticket 93); die Positionen tragen der Reihe nach die
//                           erfundenen Kostengruppen 310, 320 und keine (dann wieder 310 …). Mit befunde=1 dazu ein
//                           Prüfhinweis an der KG der 9. Position; mit nurlesen=1 bleibt die Spalte „KG“ bearbeitbar
//                           (onKostengruppen; Folgen in window.__harness.folgen)
//   Die aktive Zeile (onAktiveZeileChange) steht immer in window.__harness.aktiveZeilen (jede Meldung).

import '@tethys/ui-basis/tokens.css';
import '@tethys/ui-basis/bausteine.css';
import '../../src/grid.css';
import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type {
  Befehlshinweis,
  Betrag,
  Knoten,
  KnotenId,
  LvBefehl,
  Kostengruppennummer,
  LvSpalte,
  Ordnungszahl,
  Pruefbefund,
} from '@tethys/vertrag';
import type { LvGridProps, Sprungziel } from '../../src/index';
import { LvGrid, STANDARDSPALTEN } from '../../src/index';
import { idQuelleAttrappe, kostengruppeAttrappe, zahlenAttrappe } from './attrappen';
import { wendeAn } from './befehle-anwenden';
import { alleGliederungen, baueAnsicht, ladeFixture } from './fixture-ansicht';
import type { FixtureName } from './fixture-ansicht';

const params = new URLSearchParams(window.location.search);
const fixtureName: FixtureName = params.get('fixture') === 'gross' ? 'gross' : 'typisch';
const kopien = Number(params.get('kopien') ?? '1');
const live = params.get('modus') === 'live';
document.documentElement.dataset['theme'] = params.get('thema') === 'dark' ? 'dark' : 'light';

const modell0 = await ladeFixture(fixtureName, kopien);
const ids = idQuelleAttrappe();

/** Ein erfundener Mengenansatz an der 4. und 5. Position (Ticket 74); die 4. hat mit `befunde=1` auch eine Warnung. */
function mitAnsatz(knoten: readonly Knoten[]): readonly Knoten[] {
  const ziele = new Set(
    knoten
      .filter((k) => k.art === 'position')
      .slice(3, 5)
      .map((k) => k.id),
  );
  const ansatz = [{ zeile: 1, formel: 91, ausdruck: '2*3', variable: null }];
  return knoten.map((k) => (k.art === 'position' && ziele.has(k.id) ? { ...k, mengenansatz: ansatz } : k));
}
const mitKg = params.get('kg') === '1';
/** Erfundene Kostengruppen (Ticket 93): die Positionen der Reihe nach 310, 320, keine. */
function mitKostengruppen(knoten: readonly Knoten[]): readonly Knoten[] {
  const folge = ['310', '320', null] as const;
  let n = 0;
  return knoten.map((k) => {
    if (k.art !== 'position') return k;
    const kg = folge[n++ % folge.length];
    return kg ? { ...k, kostengruppe: kg as Kostengruppennummer } : k;
  });
}
const mitAnsatz0 = params.get('ansatz') === '1' ? mitAnsatz(modell0.knoten) : modell0.knoten;
const knoten0 = mitKg ? mitKostengruppen(mitAnsatz0) : mitAnsatz0;
const spalten: readonly LvSpalte[] | undefined = mitKg ? [...STANDARDSPALTEN, 'kostengruppe'] : undefined;

/** Beispiel-Prüfhinweise (erfunden), damit sich die Darstellung ansehen lässt. */
function beispielBefunde(knoten: readonly Knoten[]): ReadonlyMap<string, readonly Pruefbefund[]> {
  const m = new Map<string, readonly Pruefbefund[]>();
  const positionen = knoten.filter((k) => k.art === 'position');
  const [a, b, c] = [positionen[3], positionen[5], positionen[7]];
  if (a) {
    m.set(a.id, [
      {
        schwere: 'warnung',
        quelle: 'lv-pruefung',
        code: 'menge-ungewoehnlich',
        meldung: 'Die Menge weicht stark von vergleichbaren Positionen ab.',
        ort: { knotenId: a.id, feld: 'menge' },
      },
    ]);
  }
  if (b) {
    m.set(b.id, [
      {
        schwere: 'fehler',
        quelle: 'lv-pruefung',
        code: 'einheit-fehlt',
        meldung: 'Die Einheit fehlt.',
        ort: { knotenId: b.id, feld: 'einheit' },
      },
    ]);
  }
  if (c) {
    m.set(c.id, [
      {
        schwere: 'warnung',
        quelle: 'lv-pruefung',
        code: 'kurztext-lang',
        meldung: 'Der Kurztext ist länger als 70 Zeichen.',
        ort: { knotenId: c.id, feld: 'kurztext' },
      },
    ]);
  }
  const d = positionen[8];
  if (mitKg && d) {
    m.set(d.id, [
      {
        schwere: 'warnung',
        quelle: 'lv-pruefung',
        code: 'kostengruppe-ausserhalb',
        meldung: 'Die Kostengruppe liegt in keiner Kostenermittlung.',
        ort: { knotenId: d.id, feld: 'kostengruppe' },
      },
    ]);
  }
  return m;
}

/**
 * Beispiel-Befehlshinweise. Der dritte trägt einen Code, den der Vertrag (noch) nicht kennt: Das Grid zeigt dafür
 * den allgemeinen Text.
 */
function beispielHinweise(knoten: readonly Knoten[]): readonly Befehlshinweis[] {
  const letzte = knoten.filter((k) => k.art === 'position').at(-1);
  const unbekannt = {
    code: 'kuenftiger-code',
    meldung: 'Code aus einem späteren Vertragsstand',
  } as unknown as Befehlshinweis;
  return [
    {
      code: 'oz-schritt-ausgewichen',
      meldung: 'Schritt 10 lief über, Schritt 5 genommen',
      ...(letzte ? { knotenId: letzte.id, feld: 'ordnungszahl' } : {}),
    },
    { code: 'netto-nach-nachlass-negativ', meldung: 'nettoNachNachlass < 0' },
    unbekannt,
  ];
}

const gesamt =
  params.get('ausweis') === '1'
    ? { ...modell0.gesamt, summeBedarfOhneGesamtbetrag: '48.90' as Betrag, summeWahl: '61.25' as Betrag }
    : modell0.gesamt;
const hinweise = params.get('hinweise') === '1' ? beispielHinweise(modell0.knoten) : [];

/**
 * Zahl der Positionen in den Knoten samt aller Unterknoten, auch zugeklappter: Das leistet später die App aus ihrem
 * Modell (Ticket 54, Punkt 4). Nur Testseite.
 */
function positionenIn(knoten: readonly Knoten[], knotenIds: readonly KnotenId[]): number {
  const kinder = new Map<string, Knoten[]>();
  for (const k of knoten) kinder.set(k.elternId, [...(kinder.get(k.elternId) ?? []), k]);
  const zaehle = (k: Knoten): number =>
    (k.art === 'position' ? 1 : 0) + (kinder.get(k.id) ?? []).reduce((n, u) => n + zaehle(u), 0);
  return knotenIds.reduce((n, id) => {
    const k = knoten.find((x) => x.id === id);
    return n + (k ? zaehle(k) : 0);
  }, 0);
}

function Seite() {
  const [knoten, setKnoten] = useState<readonly Knoten[]>(params.get('leer') === '1' ? [] : knoten0);
  const [offen, setOffen] = useState<ReadonlySet<string>>(() =>
    params.get('auf') === 'keine' ? new Set<string>() : alleGliederungen(modell0),
  );
  const [ausstehend, setAusstehend] = useState<LvBefehl[]>([]);
  const [auswahl, setAuswahl] = useState<readonly KnotenId[]>([]);
  const [sprungziel, setSprungziel] = useState<Sprungziel | undefined>(undefined);
  const befunde = useMemo(
    () => (params.get('befunde') === '1' ? beispielBefunde(modell0.knoten) : undefined),
    [],
  );

  const modell = useMemo(() => ({ ...modell0, knoten, gesamt }), [knoten]);
  const ansicht = useMemo(() => baueAnsicht(modell, offen, befunde), [modell, offen, befunde]);

  window.__harness = {
    befehle: window.__harness.befehle,
    auswahl: [...auswahl],
    uebernehmen: () => {
      setKnoten((k) => wendeAn(k, ausstehend));
      setAusstehend([]);
    },
    ausstehend: () => ausstehend.length,
    folgen: window.__harness.folgen,
    kopien: window.__harness.kopien,
    springe: (knotenId: string, spalte?: LvSpalte) => {
      setSprungziel((alt) => ({
        knotenId: knotenId as KnotenId,
        ...(spalte ? { spalte } : {}),
        nr: (alt?.nr ?? 0) + 1,
      }));
    },
    aktiveZeilen: window.__harness.aktiveZeilen,
    geoeffnet: window.__harness.geoeffnet,
  };
  const gemeinsam = {
    ansicht,
    zahlen: zahlenAttrappe,
    hinweise,
    ...(sprungziel ? { sprungziel } : {}),
    onAufklappen: (id: KnotenId, auf: boolean) => {
      setOffen((alt) => {
        const neu = new Set(alt);
        if (auf) neu.add(id);
        else neu.delete(id);
        return neu;
      });
    },
    onAuswahlChange: setAuswahl,
    ...(spalten ? { spalten, kostengruppeLesen: kostengruppeAttrappe } : {}),
    onAktiveZeileChange: (id: KnotenId | null) => {
      window.__harness.aktiveZeilen.push(id);
    },
    ...(params.get('oeffnen') === '1'
      ? {
          onZeileOeffnen: (knotenId: KnotenId, spalte: LvSpalte) => {
            window.__harness.geoeffnet.push({ knotenId, spalte });
          },
        }
      : {}),
  } satisfies Partial<LvGridProps>;
  const nimm = (neu: readonly LvBefehl[]): void => {
    window.__harness.befehle.push(...neu);
    if (live) setKnoten((k) => wendeAn(k, neu));
    else setAusstehend((a) => [...a, ...neu]);
  };

  return (
    <main className="seite">
      <h1 className="seite__titel">Testseite ui-grid · {fixtureName}</h1>
      <button type="button" className="tx-button tx-button--sm">
        Davor
      </button>
      <div className="seite__grid">
        {params.get('nurlesen') === '1' ? (
          <LvGrid
            {...gemeinsam}
            schreibgeschuetzt
            {...(mitKg
              ? {
                  onKostengruppen: (folge: readonly LvBefehl[]) => {
                    window.__harness.folgen.push([...folge]);
                    nimm(folge);
                  },
                }
              : {})}
          />
        ) : (
          <LvGrid
            {...gemeinsam}
            ids={ids}
            onBefehl={(b) => {
              nimm([b]);
            }}
            {...(params.get('folge') === '1'
              ? {
                  onBefehlsfolge: (folge: readonly LvBefehl[]) => {
                    window.__harness.folgen.push([...folge]);
                    nimm(folge);
                  },
                }
              : {})}
            {...(params.get('kopie') === '1'
              ? {
                  onKopieEinfuegen: (knotenIds, ort) => {
                    window.__harness.kopien.push({ knotenIds: [...knotenIds], ort });
                  },
                }
              : {})}
            {...(params.get('oz') === '1'
              ? {
                  vorPositionAnlegen: (b) => ({
                    ...b,
                    daten: { ...b.daten, ordnungszahl: 'NEU' as Ordnungszahl },
                  }),
                }
              : {})}
            {...(params.get('zaehlen') === '1'
              ? { positionenZaehlen: (knotenIds) => positionenIn(knoten, knotenIds) }
              : {})}
          />
        )}
      </div>
      <button type="button" className="tx-button tx-button--sm">
        Danach
      </button>
    </main>
  );
}

const style = document.createElement('style');
style.textContent = `
  body { margin: 0; background: var(--tx-color-surface); color: var(--tx-color-text); font-family: var(--tx-font-sans); }
  .seite { display: flex; flex-direction: column; height: 100vh; box-sizing: border-box; padding: var(--tx-space-5); gap: var(--tx-space-3); }
  .seite > button { align-self: flex-start; }
  .seite__titel { margin: 0; font-size: var(--tx-font-size-lg); }
  .seite__grid { flex: 1 1 auto; min-height: 0; }
`;
document.head.append(style);
window.__harness = {
  befehle: [],
  auswahl: [],
  uebernehmen: () => undefined,
  ausstehend: () => 0,
  folgen: [],
  kopien: [],
  springe: () => undefined,
  aktiveZeilen: [],
  geoeffnet: [],
};

const root = document.getElementById('root');
if (!root) throw new Error('Wurzelelement #root fehlt');
createRoot(root).render(
  <StrictMode>
    <Seite />
  </StrictMode>,
);
