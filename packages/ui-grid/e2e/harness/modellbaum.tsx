// SPDX-License-Identifier: AGPL-3.0-or-later
// Testseite des Modellbaums (Ticket 122, PC-a4; D-54 „Baum mit 10k Zeilen über die bestehenden Grid-Budgets“; nur für
// Playwright): ein erfundener Baum in der Form, die die Modellseite der App dem Vergleichsgrid gibt (`apps/web/src/bim/baum.ts`):
// Projekt → Grundstück → Gebäude → Geschosse → Bauteile, Spalten Name (Baumspalte), Klasse, Typ, Länge, Fläche, Volumen mit
// Mengen als de-DE-Text und dem Namen der Menge als Tooltip. Wie das Modell aus D-54: 10 Geschosse, Felder aus Außenwand,
// Fenster, Innenwand, Tür, Innenwand und Deckenfeld. Nur Testseite, nie Produktivcode.
//
// Aufruf-Parameter:
//   zeilen=10000     Zahl der Zeilen insgesamt (Strukturzeilen und Bauteile, Standard 10.000)
//   geschosse=10     Zahl der Geschosse (Standard 10)
//   thema=dark|light

import '@tethys/ui-basis/tokens.css';
import '@tethys/ui-basis/bausteine.css';
import '../../src/grid.css';
import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VergleichsGrid } from '../../src/index';
import type { VergleichsSpalte, VergleichsZeile } from '../../src/index';

const params = new URLSearchParams(window.location.search);
document.documentElement.dataset['theme'] = params.get('thema') === 'dark' ? 'dark' : 'light';

const SPALTEN: readonly VergleichsSpalte[] = [
  { id: 'name', kopf: 'Name', breite: 300 },
  { id: 'klasse', kopf: 'Klasse', breite: 170 },
  { id: 'typ', kopf: 'Typ', breite: 190 },
  { id: 'laenge', kopf: 'Länge', ausrichtung: 'rechts', breite: 100 },
  { id: 'flaeche', kopf: 'Fläche', ausrichtung: 'rechts', breite: 100 },
  { id: 'volumen', kopf: 'Volumen', ausrichtung: 'rechts', breite: 100 },
];

interface Feldbauteil {
  readonly name: string;
  readonly klasse: string;
  readonly typ: string;
  /** Länge, Fläche und Volumen als Text der Zelle; `''`: keine Menge dieser Art. */
  readonly l: string;
  readonly f: string;
  readonly v: string;
}

const FELD: readonly Feldbauteil[] = [
  { name: 'Außenwand', klasse: 'IfcWall', typ: 'Mauerwerk 36,5', l: '6,000', f: '16,233', v: '5,925' },
  { name: 'Fenster', klasse: 'IfcWindow', typ: 'Fenster 1,26 × 1,385', l: '', f: '1,745', v: '' },
  {
    name: 'Innenwand mit Tür',
    klasse: 'IfcWall',
    typ: 'Mauerwerk 11,5',
    l: '5,635',
    f: '13,717',
    v: '1,577',
  },
  { name: 'Tür', klasse: 'IfcDoor', typ: 'Tür 0,885 × 2,01', l: '', f: '1,779', v: '' },
  { name: 'Innenwand', klasse: 'IfcWall', typ: 'Mauerwerk 11,5', l: '5,885', f: '16,184', v: '1,861' },
  { name: 'Deckenfeld', klasse: 'IfcSlab', typ: 'Stahlbeton 25', l: '', f: '36,000', v: '9,000' },
];

type Zeile = VergleichsZeile & { readonly elternId: string | null };

function zeile(id: string, elternId: string | null, tiefe: number, kinder: boolean, name: string): Zeile {
  return {
    id,
    elternId,
    art: kinder ? 'gliederung' : 'position',
    tiefe,
    hatUnterknoten: kinder,
    aufgeklappt: kinder,
    zellen: { name: { text: name } },
  };
}

/** Projekt, Grundstück, Gebäude, je Geschoss eine Zeile und darunter die Bauteile, zusammen `anzahl` Zeilen. */
function erfindeBaum(anzahl: number, geschosse: number): Zeile[] {
  const zeilen: Zeile[] = [
    zeile('s0', null, 0, true, 'Projekt'),
    zeile('s1', 's0', 1, true, 'Grundstück'),
    zeile('s2', 's1', 2, true, 'Gebäude'),
  ];
  const bauteile = Math.max(0, anzahl - 3 - geschosse);
  let n = 0;
  for (let g = 0; g < geschosse; g++) {
    const gid = `g${String(g)}`;
    zeilen.push({
      ...zeile(gid, 's2', 3, true, `Geschoss ${String(g)}`),
      zellen: { name: { text: `Geschoss ${String(g)}` }, klasse: { text: 'Geschoss' } },
    });
    const bis = Math.round(((g + 1) * bauteile) / geschosse);
    for (; n < bis; n++) {
      const f = FELD[n % FELD.length];
      if (f === undefined) continue;
      const zellen: VergleichsZeile['zellen'] = {
        name: { text: `${f.name} ${String(Math.floor(n / FELD.length) + 1)}` },
        klasse: { text: f.klasse },
        typ: { text: f.typ },
        ...(f.l === '' ? {} : { laenge: { text: f.l, tooltip: 'Length' } }),
        ...(f.f === '' ? {} : { flaeche: { text: f.f, tooltip: 'NetSideArea' } }),
        ...(f.v === '' ? {} : { volumen: { text: f.v, tooltip: 'NetVolume' } }),
      };
      zeilen.push({ ...zeile(`b${String(n)}`, gid, 4, false, ''), zellen });
    }
  }
  return zeilen;
}

const alle = erfindeBaum(Number(params.get('zeilen') ?? '10000'), Number(params.get('geschosse') ?? '10'));

function Seite() {
  const [zu, setZu] = useState<ReadonlySet<string>>(() => new Set());
  const zeilen = useMemo(() => {
    const versteckt = new Set<string>();
    const aus: VergleichsZeile[] = [];
    for (const z of alle) {
      if (z.elternId !== null && (zu.has(z.elternId) || versteckt.has(z.elternId))) {
        versteckt.add(z.id);
        continue;
      }
      aus.push(z.hatUnterknoten ? { ...z, aufgeklappt: !zu.has(z.id) } : z);
    }
    return aus;
  }, [zu]);
  return (
    <main className="seite">
      <h1 className="seite__titel">Testseite ui-grid · Modellbaum</h1>
      <div className="seite__grid">
        <VergleichsGrid
          beschriftung="Modellbaum"
          spalten={SPALTEN}
          zeilen={zeilen}
          baumspalte="name"
          fixierteSpalten={1}
          onAufklappen={(id, auf) => {
            setZu((alt) => {
              const neu = new Set(alt);
              if (auf) neu.delete(id);
              else neu.add(id);
              return neu;
            });
          }}
        />
      </div>
    </main>
  );
}

// Seitengerüst wie die übrigen Testseiten: Das Grid füllt die Höhe des Fensters und scrollt selbst.
const style = document.createElement('style');
style.textContent = `
  body { margin: 0; background: var(--tx-color-surface); color: var(--tx-color-text); font-family: var(--tx-font-sans); }
  .seite { display: flex; flex-direction: column; height: 100vh; box-sizing: border-box; padding: var(--tx-space-5); gap: var(--tx-space-3); }
  .seite__titel { margin: 0; font-size: var(--tx-font-size-lg); }
  .seite__grid { flex: 1 1 auto; min-height: 0; }
`;
document.head.append(style);

const wurzel = document.getElementById('root');
if (!wurzel) throw new Error('#root fehlt');
createRoot(wurzel).render(
  <StrictMode>
    <Seite />
  </StrictMode>,
);
