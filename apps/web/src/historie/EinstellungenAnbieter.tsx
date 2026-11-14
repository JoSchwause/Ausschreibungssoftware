// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Einstellungen des Geräts für die Oberfläche (Ticket 150; E10, E15, D-73, D-82 M1, S8). Der Anbieter lädt sie einmal je
// geöffnetem Speicher, übernimmt dabei einmalig den Browserspeicher (nur solange das Einstellungsprotokoll leer ist) und
// zeigt die Seiten erst danach, damit jede Seite sie sofort lesen kann (es ist eine kleine Zeile).
//
// Rückgängig der Einstellungen: eigene Schaltflächen und Strg+Z/Strg+Y in den Bereichen, die Einstellungen ändern (Dialog
// „Büro“, Druckprofile). Dort gehören die Tasten nicht dem Projekt (dessen Rückgängig lässt Dialoge ohnehin aus).

import { Button, useToast } from '@tethys/ui-basis';
import type { Einstellungen } from '@tethys/vertrag';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent, ReactElement, ReactNode } from 'react';
import { texte as lvTexte } from '../lv/texte';
import { browserablageUebernehmen, standardLeseablage } from '../sicherung/browserablage';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { einstellungenFuer, type EinstellungenSitzung, type Einstellungshistorienausgang } from './einstellungen';
import { texte } from './texte';

const t = texte.einstellungen;

/** Sitzungen, deren Laden samt Übernahme schon lief (je geöffnetem Speicher einmal). */
const GELADEN = new WeakMap<EinstellungenSitzung, Promise<void>>();

function ladenMitUebernahme(s: EinstellungenSitzung): Promise<void> {
  let p = GELADEN.get(s);
  if (p === undefined) {
    p = (async () => {
      const r = await s.laden();
      if (!r.ok) return;
      await browserablageUebernehmen(s, standardLeseablage(), () => import('@tethys/ausgabe'));
    })().catch(() => undefined);
    GELADEN.set(s, p);
  }
  return p;
}

export function EinstellungenAnbieter({ children }: { children: ReactNode }): ReactElement | null {
  const u = useUmgebung();
  const s = einstellungenFuer(u);
  const [bereit, setBereit] = useState(false);
  useEffect(() => {
    let lebt = true;
    void ladenMitUebernahme(s).then(() => {
      if (lebt) setBereit(true);
    });
    return () => {
      lebt = false;
    };
  }, [s]);
  return bereit ? <>{children}</> : null;
}

/** Die Sitzung der Einstellungen und ihr aktueller Stand (zeichnet bei jeder Änderung neu). */
export function useEinstellungen(): { readonly sitzung: EinstellungenSitzung; readonly zustand: Einstellungen } {
  const s = einstellungenFuer(useUmgebung());
  useSyncExternalStore(s.abonnieren, s.version);
  return { sitzung: s, zustand: s.zustand };
}

/** Rückgängig und Wiederholen der Einstellungen samt Meldung. */
export function useEinstellungenHistorie(): {
  readonly kannRueckgaengig: boolean;
  readonly kannWiederholen: boolean;
  readonly rueckgaengig: () => Promise<void>;
  readonly wiederholen: () => Promise<void>;
  /** Für `onKeyDown` eines Bereichs, der Einstellungen ändert: Strg+Z, Strg+Y, Strg+Umschalt+Z. */
  readonly tasten: (e: KeyboardEvent) => void;
} {
  const { sitzung } = useEinstellungen();
  const { zeige } = useToast();
  const nachher = useCallback(
    (a: Einstellungshistorienausgang, rueckwaerts: boolean): void => {
      if (a.ok) return;
      if (a.grund === 'leer') {
        zeige({ titel: rueckwaerts ? t.nichtsRueckgaengig : t.nichtsWiederholen });
        return;
      }
      zeige({
        titel: rueckwaerts ? t.abgewiesen : t.wiederholenAbgewiesen,
        beschreibung: a.fehler.code === 'konflikt' ? t.konflikt : lvTexte.speicherfehler[a.fehler.code],
        art: 'fehler',
      });
    },
    [zeige],
  );
  const rueckgaengig = useCallback(async () => {
    nachher(await sitzung.rueckgaengig(), true);
  }, [sitzung, nachher]);
  const wiederholen = useCallback(async () => {
    nachher(await sitzung.wiederholen(), false);
  }, [sitzung, nachher]);
  const tasten = useCallback(
    (e: KeyboardEvent): void => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.defaultPrevented) return;
      const taste = e.key.toLowerCase();
      const rueck = taste === 'z' && !e.shiftKey;
      const vor = (taste === 'y' && !e.shiftKey) || (taste === 'z' && e.shiftKey);
      if (!rueck && !vor) return;
      // In einem Eingabefeld gehören die Tasten dem Feld (Text zurücknehmen).
      const ziel = e.target;
      if (ziel instanceof Element && ziel.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      e.stopPropagation();
      void (rueck ? rueckgaengig() : wiederholen());
    },
    [rueckgaengig, wiederholen],
  );
  return {
    kannRueckgaengig: sitzung.kannRueckgaengig,
    kannWiederholen: sitzung.kannWiederholen,
    rueckgaengig,
    wiederholen,
    tasten,
  };
}

/** Die Schaltflächen für Rückgängig und Wiederholen der Einstellungen; deaktiviert, wenn der jeweilige Stapel leer ist. */
export function EinstellungenKnoepfe({
  historie,
}: {
  historie: ReturnType<typeof useEinstellungenHistorie>;
}): ReactElement {
  return (
    <>
      <Button
        onClick={() => void historie.rueckgaengig()}
        disabled={!historie.kannRueckgaengig}
        aria-keyshortcuts="Control+Z"
        title={t.tastenHinweis}
      >
        {t.rueckgaengig}
      </Button>
      <Button
        onClick={() => void historie.wiederholen()}
        disabled={!historie.kannWiederholen}
        aria-keyshortcuts="Control+Y Control+Shift+Z"
        title={t.tastenHinweis}
      >
        {t.wiederholen}
      </Button>
    </>
  );
}
