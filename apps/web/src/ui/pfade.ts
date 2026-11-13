// SPDX-License-Identifier: AGPL-3.0-or-later
// Pfadbaukasten (Ticket 123 Punkt 4, Ticket 131): Adressen der Seiten „Liste je Projekt“ und „ein Gegenstand der Liste“,
// ihre Erkennung und das Ziel nach Rückgängig/Wiederholen, an einer Stelle statt in jedem Ordner kopiert. Ohne Abhängigkeit
// auf Fachpakete oder Speicher, damit Hülle, `App.tsx` und Historie es billig importieren.

import type { Aenderung, ProjektId } from '@tethys/vertrag';

/** Die Übersichtsseite eines Projekts. */
export function projektPfad(projektId: ProjektId): string {
  return `/projekt/${projektId}`;
}

/** Eine Seite einer Liste je Projekt: die Liste selbst oder ein Gegenstand daraus. */
export type Listenroute<Art extends string, Id extends string> =
  | { readonly art: 'liste'; readonly projektId: ProjektId }
  | { readonly art: Art; readonly projektId: ProjektId; readonly id: Id };

export interface Projektliste<Art extends string, Id extends string> {
  /** Die Liste eines Projekts, z. B. `/projekt/<p>/bauzeit`. */
  readonly liste: (projektId: ProjektId) => string;
  /** Ein Gegenstand der Liste, z. B. `/projekt/<p>/bauzeit/<id>`. */
  readonly einzeln: (projektId: ProjektId, id: Id) => string;
  /** Erkennt einen Pfad dieser Liste; `null`, wenn er keiner ist. */
  readonly route: (pfad: string) => Listenroute<Art, Id> | null;
  /**
   * Wohin nach einem Teil an einem Gegenstand (Rückgängig/Wiederholen): Steht er danach, auf seine Seite; ist er weg, auf
   * die Liste. `null`: bleiben (schon dort oder nichts zu zeigen).
   */
  readonly ziel: (
    projektId: ProjektId,
    aenderung: Aenderung<{ readonly id: Id }>,
    rueckwaerts: boolean,
    pfad: string,
  ) => string | null;
}

/** Baukasten für eine Liste je Projekt unter `/projekt/<p>/<abschnitt>`; `art` benennt die Seite eines Gegenstands. */
export function projektliste<Art extends string, Id extends string>(
  abschnitt: string,
  art: Art,
): Projektliste<Art, Id> {
  const liste = (projektId: ProjektId): string => `${projektPfad(projektId)}/${abschnitt}`;
  const einzeln = (projektId: ProjektId, id: Id): string => `${liste(projektId)}/${id}`;
  const muster = new RegExp(`^/projekt/([^/]+)/${abschnitt}(?:/([^/]+))?$`);
  return {
    liste,
    einzeln,
    route: (pfad) => {
      const m = muster.exec(pfad);
      if (m?.[1] === undefined) return null;
      const projektId = decodeURIComponent(m[1]) as ProjektId;
      if (m[2] === undefined) return { art: 'liste', projektId };
      return { art, projektId, id: decodeURIComponent(m[2]) as Id };
    },
    ziel: (projektId, aenderung, rueckwaerts, pfad) => {
      const nachher = rueckwaerts ? aenderung.vorher : aenderung.nachher;
      const g = nachher ?? (rueckwaerts ? aenderung.nachher : aenderung.vorher);
      if (g === null) return null;
      const ziel = nachher !== null ? einzeln(projektId, g.id) : liste(projektId);
      return ziel === pfad ? null : ziel;
    },
  };
}
