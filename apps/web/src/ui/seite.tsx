// SPDX-License-Identifier: AGPL-3.0-or-later
// Das gemeinsame Seitengerüst (Ticket 123 Punkt 4, Ticket 131): Laden aus dem Speicher mit Abbruch beim Seitenwechsel
// (`aktiv`), neu Laden nach jedem Rückgängig/Wiederholen (`beiHistorie`) und die Lade- und Nicht-gefunden-Ansicht. Vorher
// stand dasselbe in jeder Seite einzeln.

import type { DependencyList, ReactElement, ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { befehlswegFuer, type Umgebung } from '../lv/befehlsweg';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import '../lv/lv.css';

/** Wo eine Seite beim Laden steht. */
export type Seitenlage<T> =
  { readonly art: 'laedt' } | { readonly art: 'fehlt' } | { readonly art: 'da'; readonly wert: T };

export interface Seitenladen<T> {
  readonly lage: Seitenlage<T>;
  /** Lädt die Seite neu (die alte Ansicht bleibt stehen, bis die neuen Daten da sind). */
  readonly neuLaden: () => void;
}

export interface SeitenladenOptionen<R, T> {
  /**
   * Macht aus frisch geladenen Daten den Wert der Seite; `alt` ist der bisherige Wert (z. B. um eine Sitzung oder
   * geladene Bytes zu behalten). Ohne: die geladenen Daten selbst.
   */
  readonly alsWert?: (neu: R, alt: T | null) => T;
  /** `false`: nach Rückgängig/Wiederholen nicht neu laden. Standard `true`. */
  readonly beiHistorie?: boolean;
}

/**
 * Lädt die Daten einer Seite. `laden` liefert `null`, wenn es das Gesuchte nicht (mehr) gibt. Neu geladen wird, wenn sich
 * `abhaengig` ändert, nach `neuLaden()` und nach jedem Rückgängig/Wiederholen. Ein Ergebnis, das nach einem Seitenwechsel
 * ankommt, wird verworfen.
 */
export function useSeitenladen<R, T = R>(
  laden: (u: Umgebung) => Promise<R | null>,
  abhaengig: DependencyList,
  optionen: SeitenladenOptionen<R, T> = {},
): Seitenladen<T> {
  const u = useUmgebung();
  const [lage, setLage] = useState<Seitenlage<T>>({ art: 'laedt' });
  const [lauf, setLauf] = useState(0);
  const neuLaden = useCallback(() => {
    setLauf((n) => n + 1);
  }, []);
  const { alsWert, beiHistorie = true } = optionen;

  useEffect(() => {
    let aktiv = true;
    void laden(u).then((neu) => {
      if (!aktiv) return;
      setLage((alt): Seitenlage<T> => {
        if (neu === null) return { art: 'fehlt' };
        const wert = alsWert ? alsWert(neu, alt.art === 'da' ? alt.wert : null) : (neu as unknown as T);
        return { art: 'da', wert };
      });
    });
    return () => {
      aktiv = false;
    };
    // `laden` und `alsWert` sind je Darstellung neu; maßgeblich sind die Abhängigkeiten der Seite.
  }, [u, lauf, ...abhaengig]);

  useEffect(
    () => (beiHistorie ? befehlswegFuer(u).beiHistorie(neuLaden) : undefined),
    [u, neuLaden, beiHistorie],
  );

  return { lage, neuLaden };
}

/**
 * Die Ansicht, solange eine Seite lädt oder ihr Gegenstand fehlt. Fehlt er, stehen Rückgängig/Wiederholen bereit (ein
 * Löschen lässt sich so zurücknehmen) und, falls angegeben, `zusatz` (etwa ein Verweis zurück zur Liste).
 */
export function Ladeansicht({
  lage,
  laden,
  nichtGefunden,
  zusatz,
  mitHistorie = true,
}: {
  lage: { readonly art: 'laedt' } | { readonly art: 'fehlt' };
  laden: string;
  nichtGefunden: string;
  zusatz?: ReactNode;
  mitHistorie?: boolean;
}): ReactElement {
  if (lage.art === 'laedt') {
    return (
      <div className="seite" aria-busy="true">
        <p>{laden}</p>
      </div>
    );
  }
  return (
    <div className="seite">
      <h1>{nichtGefunden}</h1>
      {mitHistorie || zusatz !== undefined ? (
        <div className="lv__werkzeuge">
          {mitHistorie ? <HistorieKnoepfe /> : null}
          {zusatz}
        </div>
      ) : null}
    </div>
  );
}
