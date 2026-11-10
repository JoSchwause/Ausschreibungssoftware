// @vitest-environment happy-dom
// SPDX-License-Identifier: AGPL-3.0-or-later
// Komponententest des Langtext-Editors (Ticket 34): meldet genau einmal beim Bestätigen, Esc verwirft.

import type { Langtext } from '@tethys/vertrag';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LangtextEditor } from './LangtextEditor';

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

function zeige(wert: Langtext, nurLesen = false) {
  const onBestaetigen = vi.fn<(l: Langtext) => void>();
  act(() => {
    wurzel.render(createElement(LangtextEditor, { wert, onBestaetigen, beschriftung: 'Langtext', nurLesen }));
  });
  const feld = behaelter.querySelector<HTMLElement>('[aria-label="Langtext"][contenteditable]');
  if (!feld) throw new Error('Eingabefeld fehlt');
  return { onBestaetigen, feld };
}

function taste(feld: HTMLElement, key: string, mod: { ctrlKey?: boolean; shiftKey?: boolean } = {}): void {
  act(() => {
    feld.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...mod }));
  });
}

function fokus(feld: HTMLElement): void {
  act(() => {
    feld.focus();
  });
}

function verlassen(feld: HTMLElement): void {
  act(() => {
    feld.blur();
  });
}

const wert: Langtext = [{ art: 'text', text: 'Beton C25/30' }];

describe('LangtextEditor', () => {
  it('Strg+B auf markiertem Text und Strg+Enter liefern genau einmal den fetten Text', () => {
    const { onBestaetigen, feld } = zeige(wert);
    fokus(feld);
    taste(feld, 'a', { ctrlKey: true });
    taste(feld, 'b', { ctrlKey: true });
    taste(feld, 'Enter', { ctrlKey: true });
    verlassen(feld);
    expect(onBestaetigen).toHaveBeenCalledTimes(1);
    expect(onBestaetigen).toHaveBeenCalledWith([{ art: 'text', text: 'Beton C25/30', fett: true }]);
  });

  it('meldet beim Verlassen genau einmal', () => {
    const { onBestaetigen, feld } = zeige(wert);
    fokus(feld);
    taste(feld, 'a', { ctrlKey: true });
    taste(feld, 'i', { ctrlKey: true });
    verlassen(feld);
    fokus(feld);
    verlassen(feld);
    expect(onBestaetigen).toHaveBeenCalledTimes(1);
    expect(onBestaetigen).toHaveBeenCalledWith([{ art: 'text', text: 'Beton C25/30', kursiv: true }]);
  });

  it('Esc verwirft die Änderung', () => {
    const { onBestaetigen, feld } = zeige(wert);
    fokus(feld);
    taste(feld, 'a', { ctrlKey: true });
    taste(feld, 'b', { ctrlKey: true });
    taste(feld, 'Escape');
    taste(feld, 'Enter', { ctrlKey: true });
    verlassen(feld);
    expect(onBestaetigen).not.toHaveBeenCalled();
  });

  it('meldet ohne Änderung nichts, auch wenn der Wert nicht kanonisch ist', () => {
    const { onBestaetigen, feld } = zeige([
      { art: 'text', text: 'Beton ' },
      { art: 'text', text: '' },
      { art: 'text', text: 'C25/30' },
    ]);
    fokus(feld);
    taste(feld, 'Enter', { ctrlKey: true });
    verlassen(feld);
    expect(onBestaetigen).not.toHaveBeenCalled();
  });

  it('Umschalt+Enter setzt einen Zeilenumbruch, Strg+Enter nicht', () => {
    const { onBestaetigen, feld } = zeige(wert);
    fokus(feld);
    taste(feld, 'Enter', { shiftKey: true });
    taste(feld, 'Enter', { ctrlKey: true });
    expect(onBestaetigen).toHaveBeenCalledTimes(1);
    expect(onBestaetigen).toHaveBeenCalledWith([{ art: 'umbruch' }, { art: 'text', text: 'Beton C25/30' }]);
  });

  it('zeigt im Nur-Lesen-Modus ein nicht bearbeitbares Feld', () => {
    const { feld } = zeige(wert, true);
    expect(feld.getAttribute('contenteditable')).toBe('false');
    expect(feld.textContent).toContain('Beton C25/30');
  });
});
