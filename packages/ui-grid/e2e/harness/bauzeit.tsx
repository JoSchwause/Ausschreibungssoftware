// SPDX-License-Identifier: AGPL-3.0-or-later
// Testseite der Balkenspalte (Ticket 96; nur für Playwright und zum Ansehen) mit einem erfundenen Bauzeitenplan im
// Vergleichsgrid. Sie spielt die Rolle der App: Sie hält den Aufklappzustand und nimmt die Meldungen des Grids entgegen.
//
// Aufruf-Parameter:
//   zeilen=1000      erzeugte Zeilen statt des festen Plans (12 Zeilen)
//   tage=120         Länge der Achse in Tagen ab Fr 01.01.2027 (Standard 120, bis 30.04.2027)
//   px=16            Pixel je Tag
//   unterkopf=0      ohne untere Kopfzeile (Kalenderwochen)
//   gruppen=0        ohne die Spaltengruppe „Termine“ über Anfang und Ende
//   achseInGruppe=1  die Balkenspalte nennt dieselbe Gruppe (das Grid übergeht sie)
//   fixiert=2        fixierte linke Spalten (Standard 2: Nr. und Vorgang)
//   thema=dark|light
// Meldungen: window.__bauzeit.aktiveZellen (jede Meldung von onZelleAktiv).

import '@tethys/ui-basis/tokens.css';
import '@tethys/ui-basis/bausteine.css';
import '../../src/grid.css';
import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VergleichsGrid } from '../../src/index';
import type { VergleichsZellort } from '../../src/index';
import { erfindeBauzeitenplan, zeitleiste } from './bauzeit-daten';

declare global {
  interface Window {
    __bauzeit: { aktiveZellen: (VergleichsZellort | null)[] };
  }
}

const params = new URLSearchParams(window.location.search);
document.documentElement.dataset['theme'] = params.get('thema') === 'dark' ? 'dark' : 'light';
const zeilenParam = params.get('zeilen');
const plan = erfindeBauzeitenplan(
  zeilenParam === null ? null : Number(zeilenParam),
  zeitleiste(Number(params.get('tage') ?? '120'), Number(params.get('px') ?? '16'), params.get('unterkopf') !== '0'),
  params.get('gruppen') !== '0',
  params.get('achseInGruppe') === '1',
);
const fixiert = Number(params.get('fixiert') ?? '2');
window.__bauzeit = { aktiveZellen: [] };

function Seite() {
  const [zu, setZu] = useState<ReadonlySet<string>>(() => new Set());
  const zeilen = useMemo(
    () =>
      plan.zeilen
        .filter((z) => z.elternId === null || !zu.has(z.elternId))
        .map((z) => (z.hatUnterknoten ? { ...z, aufgeklappt: !zu.has(z.id) } : z)),
    [zu],
  );

  return (
    <main className="seite">
      <h1 className="seite__titel">Testseite ui-grid · Bauzeitenplan</h1>
      <button type="button" className="tx-button tx-button--sm">
        Davor
      </button>
      <div className="seite__grid">
        <VergleichsGrid
          beschriftung="Bauzeitenplan"
          spalten={plan.spalten}
          zeilen={zeilen}
          fixierteSpalten={fixiert}
          baumspalte="vorgang"
          onAufklappen={(id, auf) => {
            setZu((alt) => {
              const neu = new Set(alt);
              if (auf) neu.delete(id);
              else neu.add(id);
              return neu;
            });
          }}
          onZelleAktiv={(ort) => {
            window.__bauzeit.aktiveZellen.push(ort);
          }}
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

const root = document.getElementById('root');
if (!root) throw new Error('Wurzelelement #root fehlt');
createRoot(root).render(
  <StrictMode>
    <Seite />
  </StrictMode>,
);
