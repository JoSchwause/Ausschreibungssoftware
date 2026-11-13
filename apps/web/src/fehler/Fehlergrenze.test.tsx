// @vitest-environment happy-dom
// SPDX-License-Identifier: AGPL-3.0-or-later
// Fehlergrenze (E13, B-23): Statt einer leeren Seite erscheint eine Fehlerseite mit „Neu laden“, „Projektdatei sichern“
// (nur mit offenem Projekt und lebendem Speicher) und aufklappbaren Einzelheiten.

import type { Projekt, ProjektId, Speicher } from '@tethys/vertrag';
import { act } from 'react';
import type { ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Fehlergrenze } from './Fehlergrenze';
import { speicherMelden } from './notfall';
import { texte } from './texte';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let behaelter: HTMLDivElement;
let wurzel: Root;

beforeEach(() => {
  behaelter = document.createElement('div');
  document.body.append(behaelter);
  wurzel = createRoot(behaelter);
  window.history.replaceState(null, '', '/');
  // React meldet einen Renderfehler zusätzlich auf der Konsole; im Test ist das erwartet.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  act(() => {
    wurzel.unmount();
  });
  behaelter.remove();
  speicherMelden(null);
  vi.restoreAllMocks();
});

function Wirft(): ReactElement {
  throw new Error('Leser kaputt');
}

function zeige(kind: ReactElement): void {
  act(() => {
    wurzel.render(<Fehlergrenze>{kind}</Fehlergrenze>);
  });
}

const knopf = (name: string): HTMLButtonElement | undefined =>
  [...behaelter.querySelectorAll('button')].find((b) => b.textContent === name);

function speicherMit(name: string, datei: string): Speicher & { exportiert: ProjektId[] } {
  const exportiert: ProjektId[] = [];
  const s = {
    exportiert,
    projekte: {
      laden: (id: ProjektId) => Promise.resolve({ ok: true, wert: { id, name } as unknown as Projekt }),
    },
    projektdateiExportieren: (id: ProjektId) => {
      exportiert.push(id);
      return Promise.resolve({ ok: true, wert: datei });
    },
  };
  return s as unknown as Speicher & { exportiert: ProjektId[] };
}

describe('Fehlergrenze', () => {
  it('zeigt ohne Fehler die App', () => {
    zeige(<p>App läuft</p>);
    expect(behaelter.textContent).toBe('App läuft');
  });

  it('zeigt bei einem Renderfehler die Fehlerseite mit „Neu laden“ und den Einzelheiten statt einer leeren Seite', () => {
    zeige(<Wirft />);
    expect(behaelter.querySelector('h1')?.textContent).toBe(texte.seite.titel);
    expect(knopf(texte.neuLaden)).toBeDefined();
    const einzelheiten = behaelter.querySelector('details');
    expect(einzelheiten?.querySelector('summary')?.textContent).toBe(texte.einzelheiten);
    expect(einzelheiten?.open).toBe(false);
    expect(einzelheiten?.textContent).toContain('Leser kaputt');
    expect(einzelheiten?.textContent).toContain('Wirft');
  });

  it('bietet „Projektdatei sichern“ nur, wenn ein Projekt offen ist und der Speicher lebt', () => {
    zeige(<Wirft />);
    expect(knopf(texte.sichern)).toBeUndefined();

    act(() => {
      wurzel.unmount();
    });
    wurzel = createRoot(behaelter);
    window.history.replaceState(null, '', '/projekt/p1/lv/l1');
    zeige(<Wirft />);
    expect(knopf(texte.sichern)).toBeUndefined(); // Projekt offen, aber kein Speicher

    act(() => {
      wurzel.unmount();
    });
    wurzel = createRoot(behaelter);
    speicherMelden(speicherMit('Bürgerhaus', '{}'));
    zeige(<Wirft />);
    expect(knopf(texte.sichern)).toBeDefined();
  });

  it('lädt mit „Projektdatei sichern“ die Projektdatei des offenen Projekts herunter', async () => {
    const speicher = speicherMit('Bürgerhaus', '{"format":"tethys"}');
    speicherMelden(speicher);
    window.history.replaceState(null, '', '/projekt/p%2D1');
    const geladen: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      geladen.push(this.download);
    });
    zeige(<Wirft />);
    await act(async () => {
      knopf(texte.sichern)?.click();
      await new Promise((fertig) => setTimeout(fertig, 0));
    });
    expect(speicher.exportiert).toEqual(['p-1']);
    expect(geladen).toHaveLength(1);
    expect(geladen[0]).toMatch(/^Bürgerhaus-\d{4}-\d{2}-\d{2}\.tethys\.json$/);
    expect(behaelter.textContent).toContain(texte.gesichert);
  });

  it('zeigt einen unbehandelten Fehler im Hintergrund als Band über der weiterlaufenden App', () => {
    zeige(<p>App läuft</p>);
    act(() => {
      window.dispatchEvent(
        new ErrorEvent('error', { message: 'Hintergrund kaputt', error: new Error('Hintergrund kaputt') }),
      );
    });
    expect(behaelter.textContent).toContain('App läuft');
    expect(behaelter.querySelector('[role="alert"]')?.textContent).toContain(texte.band.titel);
    expect(behaelter.querySelector('details')?.textContent).toContain('Hintergrund kaputt');
    act(() => {
      knopf(texte.band.weiter)?.click();
    });
    expect(behaelter.querySelector('[role="alert"]')).toBeNull();
  });

  it('fängt auch abgewiesene Promises ohne Behandlung auf', () => {
    zeige(<p>App läuft</p>);
    act(() => {
      const ereignis = new Event('unhandledrejection') as Event & { reason?: unknown };
      ereignis.reason = new Error('Versprechen gebrochen');
      window.dispatchEvent(ereignis);
    });
    expect(behaelter.querySelector('[role="alert"]')?.textContent).toContain(texte.band.titel);
    expect(behaelter.querySelector('details')?.textContent).toContain('Versprechen gebrochen');
  });

  it('übergeht die harmlose Meldung der Größenbeobachtung', () => {
    zeige(<p>App läuft</p>);
    act(() => {
      window.dispatchEvent(
        new ErrorEvent('error', { message: 'ResizeObserver loop completed with undelivered notifications.' }),
      );
    });
    expect(behaelter.querySelector('[role="alert"]')).toBeNull();
  });
});
