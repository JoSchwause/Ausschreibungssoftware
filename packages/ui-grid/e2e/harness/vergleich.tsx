// SPDX-License-Identifier: AGPL-3.0-or-later
// Testseite des Vergleichsgrids (Ticket 60; nur für Playwright und zum Ansehen) mit einem erfundenen Preisspiegel.
// Sie spielt die Rolle der App: Sie hält den Aufklappzustand und nimmt die Meldungen des Grids entgegen.
//
// Aufruf-Parameter:
//   zeilen=12        Zahl der Zeilen (Titel und Positionen, Standard 12)
//   bieter=3         Zahl der Bieter (1 bis 5, Standard 3)
//   auf=keine        Titel zugeklappt (Standard alle aufgeklappt)
//   fixiert=2        fixierte linke Spalten (Standard 2: OZ und Kurztext)
//   summen=0         ohne Summenzeilen
//   thema=dark|light
// Meldungen: window.__vergleich.aktiveZeilen / aktiveZellen (jede Meldung), window.__vergleich.springe(zeilenId, spalte).

import '@tethys/ui-basis/tokens.css';
import '@tethys/ui-basis/bausteine.css';
import '../../src/grid.css';
import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VergleichsGrid } from '../../src/index';
import type { VergleichsSprungziel, VergleichsZellort } from '../../src/index';
import { erfindePreisspiegel } from './vergleich-daten';

declare global {
  interface Window {
    __vergleich: {
      aktiveZeilen: (string | null)[];
      aktiveZellen: (VergleichsZellort | null)[];
      springe: (zeilenId: string, spalte?: string) => void;
    };
  }
}

const params = new URLSearchParams(window.location.search);
document.documentElement.dataset['theme'] = params.get('thema') === 'dark' ? 'dark' : 'light';
const preisspiegel = erfindePreisspiegel(
  Number(params.get('zeilen') ?? '12'),
  Math.min(5, Math.max(1, Number(params.get('bieter') ?? '3'))),
);
const summen = params.get('summen') === '0' ? [] : preisspiegel.summen;
const fixiert = Number(params.get('fixiert') ?? '2');
window.__vergleich = { aktiveZeilen: [], aktiveZellen: [], springe: () => undefined };

function Seite() {
  const [zu, setZu] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        params.get('auf') === 'keine'
          ? preisspiegel.zeilen.filter((z) => z.hatUnterknoten).map((z) => z.id)
          : [],
      ),
  );
  const [sprungziel, setSprungziel] = useState<VergleichsSprungziel | undefined>(undefined);
  const zeilen = useMemo(
    () =>
      preisspiegel.zeilen
        .filter((z) => z.elternId === null || !zu.has(z.elternId))
        .map((z) => (z.hatUnterknoten ? { ...z, aufgeklappt: !zu.has(z.id) } : z)),
    [zu],
  );
  window.__vergleich.springe = (zeilenId, spalte) => {
    setSprungziel((alt) => ({ zeilenId, ...(spalte ? { spalte } : {}), nr: (alt?.nr ?? 0) + 1 }));
  };

  return (
    <main className="seite">
      <h1 className="seite__titel">Testseite ui-grid · Vergleich</h1>
      <button type="button" className="tx-button tx-button--sm">
        Davor
      </button>
      <div className="seite__grid">
        <VergleichsGrid
          beschriftung="Preisspiegel"
          spalten={preisspiegel.spalten}
          zeilen={zeilen}
          summen={summen}
          fixierteSpalten={fixiert}
          baumspalte="kurztext"
          {...(sprungziel ? { sprungziel } : {})}
          onAufklappen={(id, auf) => {
            setZu((alt) => {
              const neu = new Set(alt);
              if (auf) neu.delete(id);
              else neu.add(id);
              return neu;
            });
          }}
          onZeileAktiv={(id) => {
            window.__vergleich.aktiveZeilen.push(id);
          }}
          onZelleAktiv={(ort) => {
            window.__vergleich.aktiveZellen.push(ort);
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
