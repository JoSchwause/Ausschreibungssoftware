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
