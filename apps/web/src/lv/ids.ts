// SPDX-License-Identifier: AGPL-3.0-or-later
// Die eine `IdQuelle` der App (A7): UUIDv7 nach RFC 9562. Uhr und Zufall gibt es nur hier, am Rand (A2).

import type { IdQuelle, Zeitstempel } from '@tethys/vertrag';

export interface IdQuelleOptionen {
  /** Millisekunden seit 1970 (Standard: `Date.now`). */
  readonly jetzt?: () => number;
  /** Füllt das Feld mit Zufallsbytes (Standard: `crypto.getRandomValues`). */
  readonly zufall?: (bytes: Uint8Array) => void;
}

const hex = (b: number): string => b.toString(16).padStart(2, '0');

/**
 * Erzeugt UUIDv7-Kennungen. Innerhalb derselben Millisekunde zählt der 12-Bit-Teil `rand_a` hoch (RFC 9562, 6.2
 * Methode 1), damit die Kennungen einer Sitzung streng aufsteigend sind; läuft er über, rückt die Zeit um 1 ms vor.
 */
export function uuidV7Quelle(optionen: IdQuelleOptionen = {}): () => string {
  const jetzt = optionen.jetzt ?? (() => Date.now());
  const zufall =
    optionen.zufall ??
    ((bytes: Uint8Array) => {
      crypto.getRandomValues(bytes);
    });
  let letzteZeit = -1;
  let zaehler = 0;
  return () => {
    let zeit = jetzt();
    const bytes = new Uint8Array(16);
    zufall(bytes);
    if (zeit <= letzteZeit) {
      zeit = letzteZeit;
      zaehler += 1;
      if (zaehler > 0xfff) {
        zeit += 1;
        zaehler = 0;
      }
    } else {
      zaehler = ((bytes[6] ?? 0) & 0x07) * 256 + (bytes[7] ?? 0); // Start im unteren Bereich, Platz zum Hochzählen
    }
    letzteZeit = zeit;
    let t = zeit;
    for (let i = 5; i >= 0; i--) {
      bytes[i] = t % 256;
      t = Math.floor(t / 256);
    }
    bytes[6] = 0x70 | (zaehler >> 8);
    bytes[7] = zaehler & 0xff;
    bytes[8] = 0x80 | ((bytes[8] ?? 0) & 0x3f);
    const h = [...bytes].map(hex).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  };
}

/** Die `IdQuelle` des Vertrags über einer UUIDv7-Quelle; alle Kennungsarten teilen dieselbe Folge. */
export function appIdQuelle(optionen: IdQuelleOptionen = {}): IdQuelle {
  const neu = uuidV7Quelle(optionen);
  // Alle Kennungen sind dieselbe Art Zeichenkette; die Marken unterscheidet nur der Typ (A7).
  const k = neu as () => never;
  return {
    projekt: k,
    leistungsverzeichnis: k,
    auftragsLeistungsverzeichnis: k,
    angebot: k,
    bieter: k,
    protokoll: k,
    bild: k,
    los: k,
    titel: k,
    position: k,
    hinweistext: k,
    papierkorbeintrag: k,
    lvStand: k,
  };
}

/** Uhr der App für `Protokolleintrag.wann`: ISO 8601 in UTC. */
export const appUhr = (): Zeitstempel => new Date().toISOString() as Zeitstempel;
