// SPDX-License-Identifier: AGPL-3.0-or-later
// Bedienung von Rückgängig und Wiederholen (Ticket 48): Strg+Z, Strg+Y und Strg+Umschalt+Z auf jeder Seite mit
// Speicher, dazu die Schaltflächen. In einem Eingabefeld (auch im Zelleditor des Grids) und in Dialogen gehören die
// Tasten dem Feld, nicht dem LV. Der Stapel gilt für die ganze Sitzung der App; liegt der Schritt in einem anderen
// LV oder Projekt als dem angezeigten, wechselt die App dorthin, damit die Änderung sichtbar wird.

import { changeSetUmkehren, projektChangeSetUmkehren } from '@tethys/kern';
import { Button, Tastenkuerzel, useToast } from '@tethys/ui-basis';
import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { auftragZiel } from '../auftrag/ziel'; // Ticket 64
import { kostenZiel } from '../kosten/pfad'; // Ticket 89
import { befehlswegFuer, type Historienausgang } from '../lv/befehlsweg';
import { texte as lvTexte } from '../lv/texte';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { useRoute } from '../ui/route';
import type { Teil } from './historie';
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

/** Wohin die App nach einem Undo/Redo-Teil wechselt, damit die Änderung sichtbar ist; `null`: bleiben. */
export function zielNach(teil: Teil, rueckwaerts: boolean, pfad: string): string | null {
  const cs = teil.changeSet;
  const projektPfad = `/projekt/${teil.projektId}`;
  if (cs.art === 'projekt') {
    const geschrieben = rueckwaerts ? projektChangeSetUmkehren(cs) : cs;
    const ganz = geschrieben.projekt.vorher === null || geschrieben.projekt.nachher === null;
    const { vorher, nachher } = geschrieben.projekt;
    // Nur die Bieter haben sich geändert (X84-Import): Weder Liste noch Projektseite zeigen sie, also bleiben.
    if (
      vorher !== null &&
      nachher !== null &&
      vorher.name === nachher.name &&
      JSON.stringify(vorher.bauherr) === JSON.stringify(nachher.bauherr)
    )
      return null;
    if (geschrieben.projekt.nachher === null) return pfad === '/' ? null : '/';
    if (ganz && pfad === '/') return null;
    return pfad === projektPfad ? null : projektPfad;
  }
  if (cs.art === 'angebot') {
    // Angebot angelegt oder zurückgenommen: sichtbar in der Angebotsliste des LV.
    const lvId = (cs.kopf?.nachher ?? cs.kopf?.vorher)?.leistungsverzeichnisId;
    return lvId === undefined || pfad === `/lv/${lvId}` ? null : `/lv/${lvId}`;
  }
  if (cs.art === 'auftrags-leistungsverzeichnis') return auftragZiel(teil.projektId, cs, rueckwaerts, pfad); // Ticket 64
  if (cs.art === 'kostenermittlung') return kostenZiel(teil.projektId, cs, rueckwaerts, pfad); // Ticket 89
  const geschrieben = rueckwaerts ? changeSetUmkehren(cs) : cs;
  const lvPfad = `/lv/${cs.leistungsverzeichnisId}`;
  const kopf = geschrieben.kopf;
  // LV angelegt oder gelöscht: sichtbar in der Liste der Projektseite.
  if (kopf !== null && (kopf.vorher === null || kopf.nachher === null))
    return pfad === projektPfad ? null : projektPfad;
  // Nur Stammdaten des LV (z. B. Name) und die Projektseite ist offen: dort sichtbar.
  const nurKopf =
    kopf !== null &&
    geschrieben.knoten.hinzugefuegt.length +
      geschrieben.knoten.geaendert.length +
      geschrieben.knoten.entfernt.length ===
      0;
  if (nurKopf && pfad === projektPfad) return null;
  return pfad === lvPfad ? null : lvPfad;
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
  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
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
