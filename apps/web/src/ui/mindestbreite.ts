// SPDX-License-Identifier: AGPL-3.0-or-later
import { useSyncExternalStore } from 'react';

/** Mindestbreite der Anwendung in CSS-Pixeln (G-30, U6). */
export const MINDESTBREITE = 1280;

const ABFRAGE = `(max-width: ${String(MINDESTBREITE - 1)}px)`;

function abonniere(cb: () => void): () => void {
  const mq = window.matchMedia(ABFRAGE);
  mq.addEventListener('change', cb);
  return () => {
    mq.removeEventListener('change', cb);
  };
}

/** `true`, solange das Fenster schmaler als 1280 px ist. */
export function useZuSchmal(): boolean {
  return useSyncExternalStore(
    abonniere,
    () => window.matchMedia(ABFRAGE).matches,
    () => false,
  );
}
