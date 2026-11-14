// SPDX-License-Identifier: AGPL-3.0-or-later
// Minimales Routing über die History-API; welche Seite zu einer Adresse gehört, steht in `App.tsx`.

import { useCallback, useSyncExternalStore } from 'react';

const EREIGNIS = 'tethys:route';

function basis(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, '');
}

function lesePfad(): string {
  const p = window.location.pathname;
  const b = basis();
  const ohneBasis = b && p.startsWith(b) ? p.slice(b.length) : p;
  const sauber = ohneBasis.replace(/\/+$/, '');
  return sauber === '' ? '/' : sauber;
}

function abonniere(cb: () => void): () => void {
  window.addEventListener('popstate', cb);
  window.addEventListener(EREIGNIS, cb);
  return () => {
    window.removeEventListener('popstate', cb);
    window.removeEventListener(EREIGNIS, cb);
  };
}

/** Aktueller Pfad (ohne Basis) und eine Funktion zum Wechseln ohne Seitenneuladen. */
export function useRoute(): { pfad: string; gehe: (pfad: string) => void } {
  const pfad = useSyncExternalStore(abonniere, lesePfad, () => '/');
  const gehe = useCallback((ziel: string) => {
    if (ziel === lesePfad()) return;
    window.history.pushState(null, '', basis() + ziel);
    window.dispatchEvent(new Event(EREIGNIS));
  }, []);
  return { pfad, gehe };
}

function abonniereAnker(cb: () => void): () => void {
  const ab = abonniere(cb);
  window.addEventListener('hashchange', cb);
  return () => {
    ab();
    window.removeEventListener('hashchange', cb);
  };
}

/**
 * Ticket 147: der Anker der Adresse (`#annahmen`), auch nach einem Wechsel mit `gehe` innerhalb der App, der den Pfad nicht
 * ändert (z. B. von einem Reiter der Hilfe zu einem anderen).
 */
export function useAnker(): string {
  return useSyncExternalStore(
    abonniereAnker,
    () => window.location.hash,
    () => '',
  );
}

/** Adresse für `href` eines Links (mit Basis), damit „In neuem Tab öffnen“ funktioniert. */
export function hrefFuer(pfad: string): string {
  return basis() + pfad;
}
