// @vitest-environment happy-dom
// SPDX-License-Identifier: AGPL-3.0-or-later
// Button gibt einen `ref` an das Knopf-Element weiter (D-26), damit ein Dialog-Anfangsfokus darauf zeigen kann.

import { act, createElement, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { Button } from './Button';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it('reicht den ref an das button-Element weiter', () => {
  const behaelter = document.createElement('div');
  document.body.append(behaelter);
  const wurzel = createRoot(behaelter);
  const ref = createRef<HTMLButtonElement>();
  act(() => {
    wurzel.render(createElement(Button, { ref }, 'OK'));
  });
  expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  expect(ref.current?.textContent).toBe('OK');
  act(() => {
    wurzel.unmount();
  });
  behaelter.remove();
});
