// SPDX-License-Identifier: AGPL-3.0-or-later
// Service Worker anmelden (nur im Build) und den Hinweis „Neue Version verfügbar – neu laden“ zeigen. Ein neuer Stand
// wird nie still mitten in der Arbeit aktiviert (`registerType: 'prompt'`): erst der Klick auf „Neu laden“ tut es.

import { Button } from '@tethys/ui-basis';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { texte } from './texte';
import './sicherung.css';

type Hoerer = { neueVersion: () => void };

let angemeldet: ((h: Hoerer) => void) | null = null;
let aktualisieren: ((neuLaden?: boolean) => Promise<void>) | null = null;

/** Meldet den Service Worker einmal je Seitenaufruf an; Hörer wechseln mit dem Bauteil (StrictMode, Seitenwechsel). */
function anmelden(h: Hoerer): void {
  if (angemeldet !== null) {
    angemeldet(h);
    return;
  }
  let aktuell = h;
  angemeldet = (n) => {
    aktuell = n;
  };
  aktualisieren = registerSW({
    onNeedRefresh: () => {
      aktuell.neueVersion();
    },
  });
}

export function AppAktualisierung(): ReactElement | null {
  const [neu, setNeu] = useState(false);

  useEffect(() => {
    // Im Dev-Server gibt es keinen Service Worker (Zwischenspeicher würde Entwicklung und Tests stören).
    if (!import.meta.env.PROD) return;
    anmelden({
      neueVersion: () => {
        setNeu(true);
      },
    });
  }, []);

  if (!neu) return null;
  return (
    <div className="sicherung__aktualisierung" role="status">
      <strong>{texte.aktualisierung.titel}</strong>
      <span>{texte.aktualisierung.text}</span>
      <span className="sicherung__aktualisierung-knoepfe">
        <Button
          variante="primaer"
          onClick={() => {
            void aktualisieren?.(true);
          }}
        >
          {texte.aktualisierung.neuLaden}
        </Button>
        <Button
          onClick={() => {
            setNeu(false);
          }}
        >
          {texte.aktualisierung.spaeter}
        </Button>
      </span>
    </div>
  );
}
