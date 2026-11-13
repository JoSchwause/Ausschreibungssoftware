// SPDX-License-Identifier: AGPL-3.0-or-later
// Ablage einer Werkzeuggruppe (Ticket 142): Schaltflächen und Verweise, die innerhalb einer Gruppe stehen, melden sich
// hier an, statt sich selbst zu zeigen; das Menü der Gruppe zeigt sie als Menüpunkte. So bleiben Bausteine der App, die
// eine Schaltfläche samt Dialog mitbringen, unverändert: Sie stehen weiter im Baum (ihr Zustand und ihr Dialog bleiben),
// nur ihre Schaltfläche erscheint im Menü. Ein Dialog setzt die Ablage für seinen Inhalt zurück.

import { createContext, useContext, useId, useLayoutEffect } from 'react';
import type { MouseEvent, ReactNode } from 'react';

interface EintragGemeinsam {
  /** Inhalt des Menüpunkts (Text, auch mit `Tastenkuerzel`). */
  readonly inhalt: ReactNode;
  readonly ariaLabel?: string | undefined;
  readonly title?: string | undefined;
}

/** Eine Schaltfläche: Wählen ruft ihre Aktion, nachdem das Menü zu ist und der Fokus wieder auf seinem Auslöser steht. */
export interface Knopfeintrag extends EintragGemeinsam {
  readonly art: 'knopf';
  readonly waehlen: () => void;
  readonly gesperrt: boolean;
  readonly gefahr: boolean;
  readonly tasten?: string | undefined;
  readonly beschreibung?: string | undefined;
}

/** Ein Verweis: bleibt im Menü ein echter Verweis (Mittelklick, neuer Tab). */
export interface Verweiseintrag extends EintragGemeinsam {
  readonly art: 'verweis';
  readonly href: string;
  readonly onClick: (e: MouseEvent<HTMLAnchorElement>) => void;
}

export type Werkzeugeintrag = Knopfeintrag | Verweiseintrag;

export interface Werkzeugablage {
  /** Meldet einen Eintrag an oder ersetzt ihn; ein ersetzter Eintrag behält seinen Platz. */
  readonly setzen: (id: string, eintrag: Werkzeugeintrag) => void;
  readonly entfernen: (id: string) => void;
  /** Die Einträge in der Reihenfolge ihrer ersten Anmeldung (das ist die Reihenfolge im Baum). */
  readonly lesen: () => readonly (readonly [string, Werkzeugeintrag])[];
  readonly abonnieren: (hoerer: () => void) => () => void;
}

export function neueWerkzeugablage(): Werkzeugablage {
  const eintraege = new Map<string, Werkzeugeintrag>();
  const hoerer = new Set<() => void>();
  let stand: readonly (readonly [string, Werkzeugeintrag])[] = [];
  const melden = (): void => {
    stand = [...eintraege];
    for (const h of hoerer) h();
  };
  return {
    setzen: (id, eintrag) => {
      eintraege.set(id, eintrag);
      melden();
    },
    entfernen: (id) => {
      if (eintraege.delete(id)) melden();
    },
    lesen: () => stand,
    abonnieren: (h) => {
      hoerer.add(h);
      return () => {
        hoerer.delete(h);
      };
    },
  };
}

/** Die Ablage der umgebenden Werkzeuggruppe; `null` außerhalb einer Gruppe und im Inhalt eines Dialogs. */
export const Ablagekontext = createContext<Werkzeugablage | null>(null);

/**
 * Meldet den Eintrag bei der umgebenden Werkzeuggruppe an, nach jedem Rendern neu (Inhalt, Sperre und Aktion bleiben
 * aktuell), und beim Abbau ab. `true` heißt: Das Element steht in einer Gruppe und zeigt sich nicht selbst.
 */
export function useWerkzeugeintrag(eintrag: () => Werkzeugeintrag): boolean {
  const ablage = useContext(Ablagekontext);
  const id = useId();
  useLayoutEffect(() => {
    if (ablage !== null) ablage.setzen(id, eintrag());
  });
  useLayoutEffect(() => {
    if (ablage === null) return;
    return () => {
      ablage.entfernen(id);
    };
  }, [ablage, id]);
  return ablage !== null;
}
