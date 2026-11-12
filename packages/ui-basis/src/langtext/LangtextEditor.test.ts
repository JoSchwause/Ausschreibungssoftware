// @vitest-environment happy-dom
// SPDX-License-Identifier: AGPL-3.0-or-later
// Komponententest des Langtext-Editors (Ticket 34): meldet genau einmal beim Bestätigen, Esc verwirft.

import type { BildId, Langtext } from '@tethys/vertrag';
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

  it('erhält Tabelle, Liste, Bild und Textergänzung unverändert und meldet ohne Änderung nichts', () => {
    const reich: Langtext = [
      { art: 'text', text: 'Vorbemerkung', unterstrichen: true },
      {
        art: 'ergaenzung',
        herkunft: 'bieter',
        kennung: '1',
        leer: true,
        davor: [{ art: 'text', text: 'Fabrikat:' }],
        inhalt: [],
        danach: [],
      },
      { art: 'liste', geordnet: true, punkte: [[{ art: 'text', text: 'eins' }], []] },
      {
        art: 'tabelle',
        zeilen: [
          {
            zellen: [
              {
                spalten: 2,
                inhalt: [{ art: 'bild', bild: { id: 'b' as BildId, medientyp: 'image/png', daten: 'AA==' } }],
              },
            ],
          },
          { zellen: [{ spalten: 1, inhalt: [] }] },
        ],
      },
    ];
    const { onBestaetigen, feld } = zeige(reich);
    expect(feld.querySelector('td[colspan="2"] img.tx-langtext-bild')?.getAttribute('src')).toBe(
      'data:image/png;base64,AA==',
    );
    expect(feld.textContent).toContain('Fabrikat:');
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

  describe('Tabelle einfügen', () => {
    const knopf = (name: string): HTMLButtonElement => {
      const k = behaelter.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);
      if (!k) throw new Error(`Knopf ${name} fehlt`);
      return k;
    };
    const klick = (el: HTMLElement): void => {
      act(() => {
        el.click();
      });
    };
    const setze = (beschriftung: string, wertNeu: string): void => {
      const el = behaelter.querySelector<HTMLInputElement>(`input[aria-label="${beschriftung}"]`);
      if (!el) throw new Error(`Feld ${beschriftung} fehlt`);
      act(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(el, wertNeu);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
    };

    it('fügt eine Tabelle mit der gewählten Zeilen- und Spaltenzahl ein, formgültig und ohne Absatz davor', () => {
      const { onBestaetigen, feld } = zeige([]);
      fokus(feld);
      klick(knopf('Tabelle einfügen'));
      setze('Zeilen', '3');
      setze('Spalten', '2');
      klick(knopf('Einfügen'));
      taste(feld, 'Enter', { ctrlKey: true });
      expect(onBestaetigen).toHaveBeenCalledTimes(1);
      const zelle = { spalten: 1, inhalt: [] };
      expect(onBestaetigen).toHaveBeenCalledWith([
        { art: 'tabelle', zeilen: [0, 1, 2].map(() => ({ zellen: [zelle, zelle] })) },
      ]);
    });

    it('klemmt Eingaben außerhalb der Grenzen', () => {
      const { onBestaetigen, feld } = zeige([]);
      fokus(feld);
      klick(knopf('Tabelle einfügen'));
      setze('Zeilen', '0');
      setze('Spalten', '999');
      klick(knopf('Einfügen'));
      taste(feld, 'Enter', { ctrlKey: true });
      const t = onBestaetigen.mock.calls[0]?.[0][0];
      if (t?.art !== 'tabelle') throw new Error('keine Tabelle');
      expect(t.zeilen).toHaveLength(1);
      expect(t.zeilen[0]?.zellen).toHaveLength(10);
    });

    it('bietet das Werkzeug im Nur-Lesen-Modus nicht an', () => {
      zeige([], true);
      expect(behaelter.querySelector('button[aria-label="Tabelle einfügen"]')).toBeNull();
    });
  });
});
