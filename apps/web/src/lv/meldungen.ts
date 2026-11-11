// SPDX-License-Identifier: AGPL-3.0-or-later
// Abgewiesene Befehle als Meldung (Toast aus ui-basis). Sie sperren nichts (U5); bei einem Speicherfehler bleibt die
// Anzeige beim alten Stand (Q5) und die Meldung nennt den Grund.

import { useToast } from '@tethys/ui-basis';
import type { Speicherfehler } from '@tethys/vertrag';
import { useCallback } from 'react';
import type { Abweisung, Ausgang } from './befehlsweg';
import { texte } from './texte';

export function abweisungText(a: Abweisung): { titel: string; beschreibung: string } {
  return a.art === 'befehl'
    ? { titel: texte.meldungen.befehlAbgewiesen, beschreibung: texte.befehlsfehler[a.fehler.code] }
    : { titel: texte.meldungen.nichtGespeichert, beschreibung: texte.speicherfehler[a.fehler.code] };
}

/** Zeigt die Abweisung eines Befehls oder einen Speicherfehler als Toast; gibt `true` zurück, wenn alles gut ging. */
export function useMeldungen(): {
  pruefe: <Z>(a: Ausgang<Z>) => a is Extract<Ausgang<Z>, { ok: true }>;
  speicherfehler: (f: Speicherfehler, titel?: string) => void;
} {
  const { zeige } = useToast();
  const pruefe = useCallback(
    <Z>(a: Ausgang<Z>): a is Extract<Ausgang<Z>, { ok: true }> => {
      if (!a.ok) zeige({ ...abweisungText(a.abweisung), art: 'fehler' });
      return a.ok;
    },
    [zeige],
  );
  const speicherfehler = useCallback(
    (f: Speicherfehler, titel: string = texte.meldungen.nichtGespeichert) => {
      zeige({ titel, beschreibung: texte.speicherfehler[f.code], art: 'fehler' });
    },
    [zeige],
  );
  return { pruefe, speicherfehler };
}
