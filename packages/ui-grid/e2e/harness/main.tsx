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

import '@tethys/ui-basis/tokens.css';
import '@tethys/ui-basis/bausteine.css';
import '../../src/grid.css';
import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Knoten, KnotenId, LvBefehl, Pruefbefund } from '@tethys/vertrag';
import { LvGrid } from '../../src/index';
import { idQuelleAttrappe, zahlenAttrappe } from './attrappen';
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
  return m;
}

function Seite() {
  const [knoten, setKnoten] = useState<readonly Knoten[]>(modell0.knoten);
  const [offen, setOffen] = useState<ReadonlySet<string>>(() =>
    params.get('auf') === 'keine' ? new Set<string>() : alleGliederungen(modell0),
  );
  const [ausstehend, setAusstehend] = useState<LvBefehl[]>([]);
  const [auswahl, setAuswahl] = useState<readonly KnotenId[]>([]);
  const befunde = useMemo(
    () => (params.get('befunde') === '1' ? beispielBefunde(modell0.knoten) : undefined),
    [],
  );

  const modell = useMemo(() => ({ ...modell0, knoten }), [knoten]);
  const ansicht = useMemo(() => baueAnsicht(modell, offen, befunde), [modell, offen, befunde]);

  window.__harness = {
    befehle: window.__harness.befehle,
    auswahl: [...auswahl],
    uebernehmen: () => {
      setKnoten((k) => wendeAn(k, ausstehend));
      setAusstehend([]);
    },
    ausstehend: () => ausstehend.length,
  };

  return (
    <main className="seite">
      <h1 className="seite__titel">Testseite ui-grid · {fixtureName}</h1>
      <button type="button" className="tx-button tx-button--sm">
        Davor
      </button>
      <div className="seite__grid">
        <LvGrid
          ansicht={ansicht}
          zahlen={zahlenAttrappe}
          ids={ids}
          wurzelId={modell0.lvId}
          onBefehl={(b) => {
            window.__harness.befehle.push(b);
            if (live) setKnoten((k) => wendeAn(k, [b]));
            else setAusstehend((a) => [...a, b]);
          }}
          onAufklappen={(id, auf) => {
            setOffen((alt) => {
              const neu = new Set(alt);
              if (auf) neu.add(id);
              else neu.delete(id);
              return neu;
            });
          }}
          onAuswahlChange={setAuswahl}
        />
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
window.__harness = { befehle: [], auswahl: [], uebernehmen: () => undefined, ausstehend: () => 0 };

const root = document.getElementById('root');
if (!root) throw new Error('Wurzelelement #root fehlt');
createRoot(root).render(
  <StrictMode>
    <Seite />
  </StrictMode>,
);
