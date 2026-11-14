// @vitest-environment happy-dom
// SPDX-License-Identifier: AGPL-3.0-or-later
// D-162.3: Eine Meldung, die erscheint, während eine Auswahlliste oder ein Menü offen ist, nimmt der Liste die Escape-Taste
// nicht weg (Radix: die zuletzt geöffnete Ebene bekommt Escape). Die Meldung wartet, bis die Liste zu ist.

import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import { act, createElement, useEffect } from 'react';
import type { ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastAnbieter, useToast } from './Toast';

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

function Melder({ titel }: { titel: string | null }): null {
  const { zeige } = useToast();
  useEffect(() => {
    if (titel !== null) zeige({ titel });
  }, [titel, zeige]);
  return null;
}

function Seite(p: {
  menueOffen: boolean;
  onMenue: (offen: boolean) => void;
  meldung: string | null;
}): ReactElement {
  return createElement(
    ToastAnbieter,
    null,
    createElement(
      RadixMenu.Root,
      { open: p.menueOffen, onOpenChange: p.onMenue, modal: false },
      createElement(RadixMenu.Trigger, null, 'Menü'),
      createElement(
        RadixMenu.Portal,
        null,
        createElement(RadixMenu.Content, null, createElement(RadixMenu.Item, null, 'Eins')),
      ),
    ),
    createElement(Melder, { titel: p.meldung }),
  );
}

const toasts = (): Element[] => [...document.querySelectorAll('.tx-toast')];
const escape = (): void => {
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });
};

describe('ToastAnbieter und offene Auswahllisten (D-162.3)', () => {
  it('eine Meldung bei offenem Menü wartet; Escape schließt das Menü, danach erscheint die Meldung', async () => {
    const onMenue = vi.fn();
    act(() => {
      wurzel.render(createElement(Seite, { menueOffen: true, onMenue, meldung: null }));
    });
    expect(document.querySelector('[role="menu"]')).not.toBeNull();
    act(() => {
      wurzel.render(createElement(Seite, { menueOffen: true, onMenue, meldung: 'Gespeichert' }));
    });
    expect(toasts()).toHaveLength(0);
    escape();
    expect(onMenue).toHaveBeenCalledWith(false);
    act(() => {
      wurzel.render(createElement(Seite, { menueOffen: false, onMenue, meldung: 'Gespeichert' }));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(toasts().map((t) => t.textContent)).toEqual([expect.stringContaining('Gespeichert') as string]);
  });

  it('ohne offene Liste erscheint die Meldung sofort', () => {
    act(() => {
      wurzel.render(createElement(Seite, { menueOffen: false, onMenue: vi.fn(), meldung: 'Gespeichert' }));
    });
    expect(toasts()).toHaveLength(1);
  });
});
