// SPDX-License-Identifier: AGPL-3.0-or-later
// Minimales Routing über die History-API: genug für drei Platzhalterseiten und den Katalog.
// Ein Router-Paket kommt erst mit echten Fachseiten.

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

/** Adresse für `href` eines Links (mit Basis), damit „In neuem Tab öffnen“ funktioniert. */
export function hrefFuer(pfad: string): string {
  return basis() + pfad;
}
