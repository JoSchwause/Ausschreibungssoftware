// @vitest-environment happy-dom
// SPDX-License-Identifier: AGPL-3.0-or-later
// Werkzeugleiste mit Gruppen (Ticket 142): Schaltflächen und Verweise in einer Werkzeuggruppe erscheinen als Punkte
// ihres Menüs; ihre Dialoge bleiben bestehen. Geprüft über das, was ein Nutzer sieht und bedient (Rollen, Namen, Fokus).

import { act, createElement, useState } from 'react';
import type { ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Button, Tastenkuerzel } from './Button';
import { Dialog } from './Dialog';
import { Werkzeuggruppe, Werkzeugleiste, Werkzeugverweis } from './Werkzeugleiste';

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
  document.body.innerHTML = '';
});

const h = createElement;

function zeige(element: ReactElement): void {
  act(() => {
    wurzel.render(element);
  });
}

/** Wartet die Zeitgeber von Radix ab (Fokus beim Öffnen und Schließen läuft über `setTimeout`). */
async function tick(): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

function taste(ziel: Element, key: string): void {
  act(() => {
    ziel.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
}

/** Knöpfe nach sichtbarem Namen (ohne die versteckten Tastenkürzel). */
function knopf(name: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll('button')].find((b) => name === zugaenglicherName(b));
}

function zugaenglicherName(e: Element): string {
  const label = e.getAttribute('aria-label');
  if (label !== null) return label;
  const kopie = e.cloneNode(true) as Element;
  for (const v of kopie.querySelectorAll('[aria-hidden="true"]')) v.remove();
  return kopie.textContent.replace(/\s+/g, ' ').trim();
}

function menuepunkte(): Element[] {
  return [...document.querySelectorAll('[role="menuitem"]')];
}

async function oeffne(titel: string): Promise<void> {
  const k = knopf(titel);
  expect(k).toBeDefined();
  taste(k as HTMLButtonElement, 'Enter');
  await tick();
}

describe('Werkzeuggruppe', () => {
  it('zeigt ihre Schaltflächen nicht in der Leiste, sondern als Punkte ihres Menüs, in Reihenfolge', async () => {
    zeige(
      h(
        Werkzeugleiste,
        { beschriftung: 'Werkzeuge' },
        h(Button, null, 'Rückgängig'),
        h(
          Werkzeuggruppe,
          { titel: 'Einfügen' },
          h(Button, null, 'Titel anlegen ', h(Tastenkuerzel, { tasten: ['Strg', 'Alt', 'T'] })),
          h(Button, null, 'Position anlegen'),
        ),
      ),
    );
    const leiste = document.querySelector('[role="toolbar"]');
    expect(leiste?.getAttribute('aria-label')).toBe('Werkzeuge');
    expect(knopf('Rückgängig')).toBeDefined();
    expect(knopf('Titel anlegen')).toBeUndefined();
    const ausloeser = knopf('Einfügen');
    expect(ausloeser?.getAttribute('aria-haspopup')).toBe('menu');
    expect(ausloeser?.getAttribute('aria-expanded')).toBe('false');

    await oeffne('Einfügen');
    expect(knopf('Einfügen')?.getAttribute('aria-expanded')).toBe('true');
    expect(menuepunkte().map(zugaenglicherName)).toEqual(['Titel anlegen', 'Position anlegen']);
    expect(menuepunkte()[0]?.querySelector('kbd')?.textContent).toBe('Strg');
  });

  it('führt einen gewählten Punkt erst nach dem Schließen aus; sein Dialog gibt den Fokus an den Auslöser zurück', async () => {
    /** Ein Baustein, der wie in der App seine Schaltfläche samt Dialog mitbringt. */
    function MitDialog(): ReactElement {
      const [offen, setOffen] = useState(false);
      return h(
        'span',
        null,
        h(
          Button,
          {
            onClick: () => {
              setOffen(true);
            },
          },
          'LV-Stände',
        ),
        h(Dialog, {
          offen,
          onOffenChange: setOffen,
          titel: 'LV-Stände',
          fuss: h(
            Button,
            {
              onClick: () => {
                setOffen(false);
              },
            },
            'Fertig',
          ),
        }),
      );
    }
    zeige(h(Werkzeugleiste, { beschriftung: 'Werkzeuge' }, h(Werkzeuggruppe, { titel: 'LV' }, h(MitDialog))));
    await oeffne('LV');
    expect(document.activeElement?.getAttribute('role')).toBe('menuitem');
    taste(document.activeElement as Element, 'Enter');
    await tick();
    await tick();

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('LV-Stände');
    expect(menuepunkte()).toHaveLength(0);
    // Im Dialog sind Schaltflächen wieder Schaltflächen, auch wenn der Baustein in einer Gruppe steht.
    const fertig = knopf('Fertig');
    expect(fertig?.closest('[role="dialog"]')).toBe(dialog);
    expect(dialog?.contains(document.activeElement)).toBe(true);

    act(() => {
      fertig?.click();
    });
    await tick();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(knopf('LV'));
  });

  it('zeigt eine gesperrte Schaltfläche als gesperrten Punkt und eine Gefahr-Schaltfläche hervorgehoben', async () => {
    let geklickt = 0;
    zeige(
      h(
        Werkzeugleiste,
        { beschriftung: 'Werkzeuge' },
        h(
          Werkzeuggruppe,
          { titel: '…', beschriftung: 'Weitere Aktionen', ausrichtung: 'end' },
          h(
            Button,
            {
              disabled: true,
              onClick: () => {
                geklickt += 1;
              },
            },
            'Papierkorb leeren',
          ),
          h(Button, { variante: 'gefahr' }, 'Projekt löschen'),
        ),
      ),
    );
    await oeffne('Weitere Aktionen');
    const [gesperrt, gefahr] = menuepunkte();
    expect(gesperrt?.getAttribute('aria-disabled')).toBe('true');
    expect(gefahr?.classList.contains('tx-menue__punkt--gefahr')).toBe(true);
    act(() => {
      (gesperrt as HTMLElement).click();
    });
    await tick();
    expect(geklickt).toBe(0);
  });
});

describe('Werkzeugverweis', () => {
  function verweis(gefolgt: string[]): ReactElement {
    return h(
      Werkzeugverweis,
      {
        href: '/lv/1/preisspiegel',
        onFolgen: () => {
          gefolgt.push('preisspiegel');
        },
      },
      'Preisspiegel',
    );
  }

  it('ist in der Leiste ein Verweis wie eine Schaltfläche; ein einfacher Klick folgt in der App', () => {
    const gefolgt: string[] = [];
    zeige(h(Werkzeugleiste, { beschriftung: 'Werkzeuge' }, verweis(gefolgt)));
    const a = document.querySelector('a');
    expect(a?.getAttribute('href')).toBe('/lv/1/preisspiegel');
    expect(a?.classList.contains('tx-button')).toBe(true);
    let verhindert = false;
    act(() => {
      const klick = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
      a?.dispatchEvent(klick);
      verhindert = klick.defaultPrevented;
    });
    expect(gefolgt).toEqual(['preisspiegel']);
    expect(verhindert).toBe(true);
    // Strg+Klick überlässt den Verweis dem Browser (neuer Tab).
    act(() => {
      const klick = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
      klick.preventDefault = () => undefined; // happy-dom würde sonst navigieren
      a?.dispatchEvent(klick);
    });
    expect(gefolgt).toEqual(['preisspiegel']);
  });

  it('ist in einer Gruppe ein Menüpunkt mit Verweis; Wählen folgt in der App und schließt das Menü', async () => {
    const gefolgt: string[] = [];
    zeige(
      h(
        Werkzeugleiste,
        { beschriftung: 'Werkzeuge' },
        h(Werkzeuggruppe, { titel: 'Angebote' }, verweis(gefolgt)),
      ),
    );
    expect(document.querySelector('a')).toBeNull();
    await oeffne('Angebote');
    const [punkt] = menuepunkte();
    expect(punkt?.tagName).toBe('A');
    expect(punkt?.getAttribute('href')).toBe('/lv/1/preisspiegel');
    taste(punkt as Element, 'Enter');
    await tick();
    expect(gefolgt).toEqual(['preisspiegel']);
    expect(menuepunkte()).toHaveLength(0);
  });
});

describe('Werkzeugleiste', () => {
  it('Pfeil links und rechts wandern zwischen den Elementen der Leiste, gesperrte übersprungen', () => {
    zeige(
      h(
        Werkzeugleiste,
        { beschriftung: 'Werkzeuge' },
        h(Button, null, 'Rückgängig'),
        h(Button, { disabled: true }, 'Wiederholen'),
        h(Werkzeuggruppe, { titel: 'Einfügen' }, h(Button, null, 'Titel anlegen')),
        h(Button, null, 'Prüfung'),
      ),
    );
    knopf('Rückgängig')?.focus();
    taste(document.activeElement as Element, 'ArrowRight');
    expect(document.activeElement).toBe(knopf('Einfügen'));
    taste(document.activeElement as Element, 'ArrowRight');
    expect(document.activeElement).toBe(knopf('Prüfung'));
    taste(document.activeElement as Element, 'ArrowRight');
    expect(document.activeElement).toBe(knopf('Prüfung'));
    taste(document.activeElement as Element, 'Home');
    expect(document.activeElement).toBe(knopf('Rückgängig'));
    taste(document.activeElement as Element, 'End');
    expect(document.activeElement).toBe(knopf('Prüfung'));
    taste(document.activeElement as Element, 'ArrowLeft');
    expect(document.activeElement).toBe(knopf('Einfügen'));
  });
});
