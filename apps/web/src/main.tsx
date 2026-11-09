import '@tethys/ui-basis/tokens.css';
import '@tethys/ui-basis/bausteine.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initialerModus } from './ui/modus';

initialerModus();

const root = document.getElementById('root');
if (!root) throw new Error('Wurzelelement #root fehlt');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
