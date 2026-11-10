// Wegwerfcode (Prototyp Nutzerinterview, Ticket 18). Ansicht und Variante stehen in der URL:
//   ?ansicht=lv|spiegel|projekt|gaeb&variante=...   (siehe ANSICHTEN)
import '@tethys/ui-basis/tokens.css';
import '@tethys/ui-basis/bausteine.css';
import '@tethys/ui-grid/grid.css';
import './app.css';
import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GaebAnsicht } from './GaebAnsichten';
import { LvAnsicht } from './LvAnsichten';
import { ProjektAnsicht } from './ProjektAnsichten';
import { SpiegelAnsicht } from './SpiegelAnsichten';
import { StoreAnbieter } from './store';

const ANSICHTEN: Record<string, { name: string; kurz: string; varianten: Record<string, string> }> = {
  lv: { name: 'LV-Grid', kurz: '1', varianten: { baum: 'Dichte Tabelle mit Baum', panel: 'Tabelle mit Seitenpanel', karten: 'Karten je Titel' } },
  spiegel: { name: 'Preisspiegel', kurz: '2', varianten: { farbe: 'Matrix mit Farbskala', rang: 'Matrix mit Rangzahl', balken: 'Balken je Position' } },
  projekt: { name: 'Projektübersicht', kurz: '3', varianten: { baum: 'Baum Projekt → LV → Angebot', reiter: 'Registerkarten je LV', vorgang: 'Vorgangsliste' } },
  gaeb: { name: 'GAEB-Dialog', kurz: '4', varianten: { schritte: 'Assistent in Schritten', seite: 'Eine Seite mit Prüfliste' } },
};

function lies(): { ansicht: string; variante: string } {
  const p = new URLSearchParams(window.location.search);
  const a = p.get('ansicht') ?? 'lv';
  const ansicht = a in ANSICHTEN ? a : 'lv';
  const v = p.get('variante') ?? '';
  const erste = Object.keys(ANSICHTEN[ansicht]!.varianten)[0]!;
  return { ansicht, variante: v in ANSICHTEN[ansicht]!.varianten ? v : erste };
}

function App() {
  const [stand, setStand] = useState(lies);
  useEffect(() => {
    const h = () => setStand(lies());
    window.addEventListener('popstate', h);
    return () => window.removeEventListener('popstate', h);
  }, []);
  const navigiere = useCallback((ansicht: string, variante?: string) => {
    const a = ANSICHTEN[ansicht] ? ansicht : 'lv';
    const v = variante && variante in ANSICHTEN[a]!.varianten ? variante : Object.keys(ANSICHTEN[a]!.varianten)[0]!;
    // Beim Ansichtswechsel ohne Variante die zuletzt gewaehlte Variante dieser Ansicht behalten.
    const gemerkt = !variante ? sessionStorage.getItem(`variante-${a}`) : null;
    const wahl = gemerkt && gemerkt in ANSICHTEN[a]!.varianten ? gemerkt : v;
    try {
      sessionStorage.setItem(`variante-${a}`, wahl);
    } catch {
      /* egal */
    }
    history.pushState(null, '', `?ansicht=${a}&variante=${wahl}`);
    setStand({ ansicht: a, variante: wahl });
  }, []);
  const { ansicht, variante } = stand;
  return (
    <StoreAnbieter navigiere={navigiere}>
      <div className="p-app">
        <header className="p-kopf">
          <strong>Prototyp für das Nutzerinterview</strong>
          <span className="p-leise">Wegwerfcode · erfundene Daten · nichts wird gespeichert, Neuladen setzt zurück</span>
        </header>
        <main className="p-inhalt" data-ansicht={ansicht} data-variante={variante}>
          {ansicht === 'lv' ? <LvAnsicht variante={variante} /> : null}
          {ansicht === 'spiegel' ? <SpiegelAnsicht variante={variante} /> : null}
          {ansicht === 'projekt' ? <ProjektAnsicht variante={variante} /> : null}
          {ansicht === 'gaeb' ? <GaebAnsicht variante={variante} /> : null}
        </main>
        <nav className="p-leiste" aria-label="Ansicht und Variante">
          <div className="p-leiste__gruppe" role="group" aria-label="Ansicht">
            {Object.entries(ANSICHTEN).map(([k, a]) => (
              <button key={k} type="button" className={k === ansicht ? 'ist-aktiv' : ''} aria-pressed={k === ansicht} onClick={() => navigiere(k)}>
                {a.kurz} {a.name}
              </button>
            ))}
          </div>
          <span className="p-leiste__trenner" />
          <div className="p-leiste__gruppe" role="group" aria-label="Variante">
            {Object.entries(ANSICHTEN[ansicht]!.varianten).map(([k, name]) => (
              <button key={k} type="button" className={k === variante ? 'ist-aktiv' : ''} aria-pressed={k === variante} data-variante-knopf={k} onClick={() => navigiere(ansicht, k)}>
                {name}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </StoreAnbieter>
  );
}

const wurzel = document.getElementById('root');
if (!wurzel) throw new Error('Wurzelelement fehlt');
createRoot(wurzel).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
