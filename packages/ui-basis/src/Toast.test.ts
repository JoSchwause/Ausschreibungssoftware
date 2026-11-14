// @vitest-environment happy-dom
// SPDX-License-Identifier: AGPL-3.0-or-later
// D-162.3: Eine Meldung, die erscheint, während eine Auswahlliste oder ein Menü offen ist, nimmt der Liste die Escape-Taste
// nicht weg (Radix: die zuletzt geöffnete Ebene bekommt Escape). Die Meldung wartet, bis die Liste zu ist.

import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import { act, createElement, useEffect } from 'react';
import { flushSync } from 'react-dom';
import type { ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';
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

describe('Meldung und Dialog (Ticket 163, Wackler im Positionsdialog)', () => {
  function MitDialog(p: { offen: boolean; onOffenChange: (o: boolean) => void }): ReactElement {
    return createElement(
      ToastAnbieter,
      null,
      createElement(Melder, { titel: 'Zuschlag erteilt' }),
      createElement(Dialog, {
        offen: p.offen,
        onOffenChange: p.onOffenChange,
        titel: 'Position',
        fuss: createElement('button', { id: 'zu' }, 'Schließen'),
      }),
    );
  }
  const escapeAufFokus = (): void => {
    (document.activeElement ?? document.body).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
  };

  it('Escape gleich nach dem Öffnen schließt den Dialog, nicht die ältere Meldung', async () => {
    const onOffenChange = vi.fn();
    act(() => {
      wurzel.render(createElement(MitDialog, { offen: false, onOffenChange }));
    });
    expect(toasts()).toHaveLength(1);
    // Wie im Browser: Das Öffnen ist eine diskrete Eingabe (synchron), Radix ordnet seine Ebenen erst im nächsten Durchlauf
    // mit normaler Priorität neu. Escape kommt dazwischen.
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
    try {
      flushSync(() => {
        wurzel.render(createElement(MitDialog, { offen: true, onOffenChange }));
      });
      expect(document.activeElement?.closest('.tx-dialog')).not.toBeNull();
      escapeAufFokus();
      await new Promise((r) => setTimeout(r, 20));
    } finally {
      (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    }
    expect(onOffenChange).toHaveBeenCalledWith(false);
    expect(toasts()).toHaveLength(1);
  });

  it('eine Auswahlliste im Dialog behält ihr Escape, der Dialog bleibt offen', async () => {
    const onOffenChange = vi.fn();
    const onMenue = vi.fn();
    act(() => {
      wurzel.render(
        createElement(
          ToastAnbieter,
          null,
          createElement(
            Dialog,
            { offen: true, onOffenChange, titel: 'Position' },
            createElement(
              RadixMenu.Root,
              { open: true, onOpenChange: onMenue, modal: false },
              createElement(RadixMenu.Trigger, null, 'Menü'),
              createElement(
                RadixMenu.Portal,
                null,
                createElement(RadixMenu.Content, null, createElement(RadixMenu.Item, null, 'Eins')),
              ),
            ),
          ),
        ),
      );
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    act(() => {
      escapeAufFokus();
    });
    expect(onMenue).toHaveBeenCalledWith(false);
    expect(onOffenChange).not.toHaveBeenCalled();
  });

  it('eine Meldung, die bei offenem Dialog erscheint, nimmt ihm Escape nicht weg', async () => {
    const onOffenChange = vi.fn();
    act(() => {
      wurzel.render(
        createElement(
          ToastAnbieter,
          null,
          createElement(Dialog, {
            offen: true,
            onOffenChange,
            titel: 'Position',
            fuss: createElement('button', { id: 'zu' }, 'Schließen'),
          }),
        ),
      );
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    act(() => {
      wurzel.render(
        createElement(
          ToastAnbieter,
          null,
          createElement(Dialog, {
            offen: true,
            onOffenChange,
            titel: 'Position',
            fuss: createElement('button', { id: 'zu' }, 'Schließen'),
          }),
          createElement(Melder, { titel: 'Gespeichert' }),
        ),
      );
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(toasts()).toHaveLength(1);
    act(() => {
      escapeAufFokus();
    });
    expect(onOffenChange).toHaveBeenCalledWith(false);
    expect(toasts()).toHaveLength(1);
  });
});
