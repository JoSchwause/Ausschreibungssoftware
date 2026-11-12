// @vitest-environment happy-dom
// SPDX-License-Identifier: AGPL-3.0-or-later
// Dialog-Anfangsfokus (Ticket 54, Punkt 6): wählbares Startelement, ohne Angabe bleibt Radix' Verhalten.

import { act, createElement, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Dialog } from './Dialog';

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

function zeige(mitAnfangsfokus: boolean): void {
  const ref = createRef<HTMLButtonElement>();
  act(() => {
    wurzel.render(
      createElement(
        Dialog,
        {
          offen: true,
          onOffenChange: () => undefined,
          titel: 'Löschen',
          ...(mitAnfangsfokus ? { anfangsfokus: ref } : {}),
          fuss: createElement('button', { ref, id: 'ok' }, 'Löschen'),
        },
        createElement('p', null, 'Wirklich?'),
      ),
    );
  });
}

describe('Dialog Anfangsfokus', () => {
  it('fokussiert das angegebene Element', async () => {
    zeige(true);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(document.activeElement?.id).toBe('ok');
  });

  it('fokussiert ohne Angabe wie bisher nicht das Fußelement', async () => {
    zeige(false);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(document.activeElement?.id).not.toBe('ok');
    expect(document.activeElement?.closest('.tx-dialog')).not.toBeNull();
  });
});

describe('Dialog Fokus beim Schließen (Ticket 122)', () => {
  let ausloeserUndZiel: HTMLElement[] = [];
  afterEach(() => {
    for (const e of ausloeserUndZiel) e.remove();
    ausloeserUndZiel = [];
  });
  const tick = async (): Promise<void> => {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  };

  async function oeffnenUndSchliessen(springen: boolean): Promise<void> {
    const ausloeser = document.createElement('button');
    ausloeser.id = 'ausloeser';
    const ziel = document.createElement('button');
    ziel.id = 'ziel';
    // Neben dem Behälter, den React verwaltet (er leert ihn beim ersten Zeichnen).
    document.body.append(ausloeser, ziel);
    ausloeserUndZiel = [ausloeser, ziel];
    ausloeser.focus();
    const props = {
      onOffenChange: () => undefined,
      titel: 'Vorschau',
      fuss: createElement('button', null, 'OK'),
    };
    act(() => {
      wurzel.render(createElement(Dialog, { ...props, offen: true }));
    });
    await tick();
    expect(document.activeElement?.closest('.tx-dialog')).not.toBeNull();
    act(() => {
      wurzel.render(createElement(Dialog, { ...props, offen: false }));
    });
    // Ein Sprung aus dem Dialog (etwa „Zur Position“) setzt den Fokus nach dem Schließen selbst, bevor Radix ihn zurückgibt.
    if (springen) ziel.focus();
    await tick();
    await tick();
  }

  it('gibt den Fokus an den Auslöser zurück', async () => {
    await oeffnenUndSchliessen(false);
    expect(document.activeElement?.id).toBe('ausloeser');
  });

  it('lässt den Fokus, den die App beim Schließen gesetzt hat (Sprung aus dem Dialog)', async () => {
    await oeffnenUndSchliessen(true);
    expect(document.activeElement?.id).toBe('ziel');
  });
});
