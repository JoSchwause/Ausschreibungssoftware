// SPDX-License-Identifier: AGPL-3.0-or-later
// Bedienung von Rückgängig und Wiederholen (Ticket 48): Strg+Z, Strg+Y und Strg+Umschalt+Z auf jeder Seite mit
// Speicher, dazu die Schaltflächen. In einem Eingabefeld (auch im Zelleditor des Grids) und in Dialogen gehören die
// Tasten dem Feld, nicht dem LV. Der Stapel gilt für die ganze Sitzung der App; liegt der Schritt in einem anderen
// LV oder Projekt als dem angezeigten, wechselt die App dorthin, damit die Änderung sichtbar wird.

import { Button, Tastenkuerzel, useToast } from '@tethys/ui-basis';
import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { befehlswegFuer, type Historienausgang } from '../lv/befehlsweg';
import { texte as lvTexte } from '../lv/texte';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { useRoute } from '../ui/route';
import { zielNach } from './arten';
import { EinstellungenAnbieter } from './EinstellungenAnbieter'; // Ticket 150
import { texte } from './texte';

interface Steuerung {
  readonly kannRueckgaengig: boolean;
  readonly kannWiederholen: boolean;
  readonly rueckgaengig: () => Promise<void>;
  readonly wiederholen: () => Promise<void>;
}

const Kontext = createContext<Steuerung | null>(null);

export function useHistorie(): Steuerung {
  const s = useContext(Kontext);
  if (s === null) throw new Error('useHistorie außerhalb von HistorieAnbieter');
  return s;
}

/** Ist das Ziel ein Eingabefeld (Zelleditor, Textfeld, Langtext-Editor) oder ein Dialog? Dort gilt Strg+Z dem Feld. */
function gehoertDemFeld(ziel: EventTarget | null): boolean {
  if (!(ziel instanceof Element)) return false;
  if (ziel.closest('input, textarea, select, [contenteditable="true"], [data-editor], [role="dialog"]'))
    return true;
  return ziel instanceof HTMLElement && ziel.isContentEditable;
}

export function HistorieAnbieter({ children }: { children: ReactNode }): ReactElement {
  const u = useUmgebung();
  const weg = befehlswegFuer(u);
  const { pfad, gehe } = useRoute();
  const { zeige } = useToast();
  useSyncExternalStore(weg.historie.abonnieren, weg.historie.version);

  const nachher = useCallback(
    (a: Historienausgang, rueckwaerts: boolean): void => {
      if (!a.ok && a.grund === 'leer') {
        zeige({ titel: rueckwaerts ? texte.historie.nichtsRueckgaengig : texte.historie.nichtsWiederholen });
        return;
      }
      const letzter = a.teile.at(-1);
      if (letzter !== undefined) {
        const ziel = zielNach(letzter, rueckwaerts, pfad);
        if (ziel !== null) gehe(ziel);
      }
      if (!a.ok) {
        const grund =
          a.fehler.code === 'konflikt' ? texte.historie.konflikt : lvTexte.speicherfehler[a.fehler.code];
        zeige({
          titel: rueckwaerts ? texte.historie.abgewiesen : texte.historie.wiederholenAbgewiesen,
          beschreibung: a.teile.length > 0 ? `${grund} ${texte.historie.teilweise}` : grund,
          art: 'fehler',
        });
      }
    },
    [zeige, gehe, pfad],
  );

  const rueckgaengig = useCallback(async () => {
    nachher(await weg.rueckgaengig(), true);
  }, [weg, nachher]);
  const wiederholen = useCallback(async () => {
    nachher(await weg.wiederholen(), false);
  }, [weg, nachher]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.defaultPrevented) return;
      const taste = e.key.toLowerCase();
      const rueck = taste === 'z' && !e.shiftKey;
      const vor = (taste === 'y' && !e.shiftKey) || (taste === 'z' && e.shiftKey);
      if (!rueck && !vor) return;
      if (gehoertDemFeld(e.target)) return;
      e.preventDefault();
      void (rueck ? rueckgaengig() : wiederholen());
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [rueckgaengig, wiederholen]);

  // Die Flags werden je Darstellung neu gelesen; `useSyncExternalStore` oben zeichnet bei jedem Stapelwechsel neu.
  const wert: Steuerung = {
    kannRueckgaengig: weg.historie.kannRueckgaengig,
    kannWiederholen: weg.historie.kannWiederholen,
    rueckgaengig,
    wiederholen,
  };
  // Ticket 150: die Einstellungen des Geräts (eigenes Rückgängig) für alle Seiten mit Speicher.
  return (
    <Kontext.Provider value={wert}>
      <EinstellungenAnbieter>{children}</EinstellungenAnbieter>
    </Kontext.Provider>
  );
}

/** Die beiden Schaltflächen; deaktiviert, wenn der jeweilige Stapel leer ist. */
export function HistorieKnoepfe(): ReactElement {
  const h = useHistorie();
  return (
    <>
      <Button
        onClick={() => void h.rueckgaengig()}
        disabled={!h.kannRueckgaengig}
        aria-keyshortcuts="Control+Z"
      >
        {texte.historie.rueckgaengig} <Tastenkuerzel tasten={texte.historie.tastenRueckgaengig} />
      </Button>
      <Button
        onClick={() => void h.wiederholen()}
        disabled={!h.kannWiederholen}
        aria-keyshortcuts="Control+Y Control+Shift+Z"
      >
        {texte.historie.wiederholen} <Tastenkuerzel tasten={texte.historie.tastenWiederholen} />
      </Button>
    </>
  );
}
