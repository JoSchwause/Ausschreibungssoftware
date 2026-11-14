// @vitest-environment happy-dom
// SPDX-License-Identifier: AGPL-3.0-or-later
// Dialog „PDF mit Vorschau“ (Wellen-Review SB1/PB3, E13, B-26): Scheitert der Druck, zeigt der Dialog einen deutschen Satz mit
// dem nächsten Schritt, nie den technischen Text des Workers.

import { ToastAnbieter } from '@tethys/ui-basis';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { texte as fehlerTexte } from '../fehler/texte';
import { PdfFehler, type PdfLauf } from './pdf-lauf';
import { PdfMitVorschau } from './PdfMitVorschau';
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
  document.body.innerHTML = '';
});

const knopf = (name: string): HTMLButtonElement => {
  const k = [...document.querySelectorAll('button')].find((b) => b.textContent === name);
  if (k === undefined) throw new Error(`Schaltfläche „${name}“ fehlt`);
  return k;
};

const warte = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('Dialog „PDF mit Vorschau“', () => {
  it('zeigt bei einem Fehler des Drucks den deutschen Satz mit nächstem Schritt, nicht den Text des Workers', async () => {
    const drucken = (): PdfLauf => ({
      ergebnis: Promise.reject(new PdfFehler('Schrift nicht ladbar: /schrift.woff (404)')),
      abbrechen: () => undefined,
    });
    act(() => {
      wurzel.render(
        <ToastAnbieter>
          <PdfMitVorschau
            knopf="Bericht als PDF …"
            titel="Bericht als PDF"
            dateiname="Bericht.pdf"
            schluessel=""
            heute={() => '2026-11-14'}
            drucken={drucken}
          />
        </ToastAnbieter>,
      );
    });
    act(() => {
      knopf('Bericht als PDF …').click();
    });
    await act(async () => {
      knopf(texte.pdfVorschau.vorschauErzeugen).click();
      await warte();
    });
    const meldung = document.querySelector('[role="alert"]');
    expect(meldung?.textContent).toContain(texte.pdfVorschau.fehler);
    expect(meldung?.textContent).toContain(fehlerTexte.pdf);
    expect(document.body.textContent).not.toContain('Schrift nicht ladbar');
  });
});
