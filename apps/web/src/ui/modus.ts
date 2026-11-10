// SPDX-License-Identifier: AGPL-3.0-or-later
// Hell/Dunkel-Umschaltung: setzt data-theme am <html>-Element (siehe tokens.css).
// Die Wahl liegt nur als Komfort im localStorage; ohne Speicher gilt die Systemeinstellung.

import { useCallback, useEffect, useState } from 'react';

export type Modus = 'hell' | 'dunkel';

const SCHLUESSEL = 'tethys-modus';

function gespeichert(): Modus | null {
  try {
    const w = window.localStorage.getItem(SCHLUESSEL);
    return w === 'hell' || w === 'dunkel' ? w : null;
  } catch {
    return null;
  }
}

function systemModus(): Modus {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dunkel' : 'hell';
}

export function setzeModus(modus: Modus): void {
  document.documentElement.dataset['theme'] = modus === 'dunkel' ? 'dark' : 'light';
}

/** Vor dem ersten Rendern aufrufen, damit nichts aufblitzt. */
export function initialerModus(): Modus {
  const modus = gespeichert() ?? systemModus();
  setzeModus(modus);
  return modus;
}

export function useModus(): { modus: Modus; wechsle: () => void } {
  const [modus, setModus] = useState<Modus>(initialerModus);
  useEffect(() => {
    setzeModus(modus);
  }, [modus]);
  const wechsle = useCallback(() => {
    setModus((alt) => {
      const neu = alt === 'hell' ? 'dunkel' : 'hell';
      try {
        window.localStorage.setItem(SCHLUESSEL, neu);
      } catch {
        // Speicher gesperrt: Wahl gilt nur für diese Sitzung.
      }
      return neu;
    });
  }, []);
  return { modus, wechsle };
}
