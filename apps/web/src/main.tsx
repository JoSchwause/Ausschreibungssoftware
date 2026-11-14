import '@tethys/ui-basis/tokens.css';
import '@tethys/ui-basis/bausteine.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { BrowserHinweis } from './fehler/BrowserHinweis';
import { Fehlergrenze } from './fehler/Fehlergrenze';
import { fehlendeFaehigkeiten } from './fehler/faehigkeiten';
import { initialerModus } from './ui/modus';

initialerModus();

const root = document.getElementById('root');
if (!root) throw new Error('Wurzelelement #root fehlt');
// Startprüfung (D-77): Fehlt dem Browser eine nötige Fähigkeit, erscheint statt der App eine Meldung mit nächstem Schritt.
const fehlt = fehlendeFaehigkeiten();
createRoot(root).render(
  <StrictMode>
    <Fehlergrenze>
      {fehlt.length > 0 ? <BrowserHinweis fehlt={fehlt} sicher={window.isSecureContext} /> : <App />}
    </Fehlergrenze>
  </StrictMode>,
);
