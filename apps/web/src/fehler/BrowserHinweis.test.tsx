// @vitest-environment happy-dom
// SPDX-License-Identifier: AGPL-3.0-or-later
// Meldung der Startprüfung (D-77): was fehlt, der nächste Schritt und welche Browser geprüft sind.

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BrowserHinweis } from './BrowserHinweis';
import { texte } from './texte';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let behaelter: HTMLDivElement;
let wurzel: Root;

beforeEach(() => {
  behaelter = document.createElement('div');
  document.body.append(behaelter);
  wurzel = createRoot(behaelter);
});

afterEach(() => {
  act(() => {
    wurzel.unmount();
  });
  behaelter.remove();
});

describe('BrowserHinweis', () => {
  it('nennt jede fehlende Fähigkeit, den nächsten Schritt und die geprüften Browser', () => {
    act(() => {
      wurzel.render(<BrowserHinweis fehlt={['worker', 'modulWorker']} sicher />);
    });
    expect(behaelter.querySelector('h1')?.textContent).toBe(texte.browser.titel);
    expect([...behaelter.querySelectorAll('li')].map((li) => li.textContent)).toEqual([
      texte.browser.faehigkeit.worker,
      texte.browser.faehigkeit.modulWorker,
    ]);
    expect(behaelter.textContent).toContain(texte.browser.naechsterSchritt);
    expect(behaelter.textContent).toContain('Firefox und Safari sind nicht geprüft');
    expect(behaelter.textContent).not.toContain(texte.browser.unsicher);
    expect(behaelter.textContent).not.toContain(texte.browser.privat);
  });

  it('rät ohne sichere Verbindung zu https und ohne Ablage zum normalen Fenster', () => {
    act(() => {
      wurzel.render(<BrowserHinweis fehlt={['opfs', 'kryptografie']} sicher={false} />);
    });
    expect(behaelter.textContent).toContain(texte.browser.unsicher);
    expect(behaelter.textContent).toContain(texte.browser.privat);
  });
});
