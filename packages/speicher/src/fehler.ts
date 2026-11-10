// SPDX-License-Identifier: AGPL-3.0-or-later
// Abbildung von Ausnahmen des Speicher-Backends (SQLite, OPFS) auf Speicherfehlercodes (Q5).

import type { Ergebnis, Speicherfehler } from '@tethys/vertrag';
import { SpeicherAbbruch } from './ergebnis';

// Primäre SQLite-Ergebniscodes (untere 8 Bit eines erweiterten Codes).
const SQLITE_PERM = 3;
const SQLITE_BUSY = 5;
const SQLITE_LOCKED = 6;
const SQLITE_READONLY = 8;
const SQLITE_IOERR = 10;
const SQLITE_CORRUPT = 11;
const SQLITE_FULL = 13;
const SQLITE_CANTOPEN = 14;
const SQLITE_CONSTRAINT = 19;
const SQLITE_NOTADB = 26;

const GESPERRT_NAMEN =
  /NoModificationAllowed|InvalidStateError|NotAllowedError|SecurityError|NotSupportedError/i;
const QUOTA = /quota|no space|disk full/i;

function textVon(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  if (typeof e === 'string') return e;
  if (typeof e === 'object' && e !== null && 'message' in e && typeof e.message === 'string')
    return e.message;
  return 'unbekannter Fehler';
}

function resultCode(e: unknown): number | null {
  if (typeof e === 'object' && e !== null && 'resultCode' in e && typeof e.resultCode === 'number') {
    return e.resultCode;
  }
  return null;
}

/**
 * Ist die Ausnahme ein Ein-/Ausgabefehler des Speichers (SQLITE_IOERR)? Solche Fehler sagen nichts über den
 * Inhalt einer Datei; wer Dateiinhalt prüft, darf sie nicht als „Datei ungültig“ melden.
 */
export function istAusgabefehler(e: unknown): boolean {
  const rc = resultCode(e);
  return rc !== null && (rc & 0xff) === SQLITE_IOERR;
}

/** Ordnet eine geworfene Ausnahme einem Speicherfehlercode zu. Nie stiller Datenverlust (Q5). */
export function fehlerAusAusnahme(e: unknown): Speicherfehler {
  if (e instanceof SpeicherAbbruch) return e.fehler;
  const text = textVon(e);
  const voll = (): Speicherfehler => ({ code: 'speicher-voll', meldung: `Speicherplatz erschöpft: ${text}` });
  const gesperrt = (): Speicherfehler => ({
    code: 'gesperrt',
    meldung: `Speicher gesperrt oder nicht zugänglich: ${text}`,
  });
  const rc = resultCode(e);
  if (rc !== null) {
    switch (rc & 0xff) {
      case SQLITE_FULL:
        return voll();
      case SQLITE_BUSY:
      case SQLITE_LOCKED:
      case SQLITE_READONLY:
      case SQLITE_PERM:
      case SQLITE_CANTOPEN:
        return gesperrt();
      case SQLITE_IOERR:
        if (QUOTA.test(text)) return voll();
        return GESPERRT_NAMEN.test(text)
          ? gesperrt()
          : { code: 'unbekannt', meldung: `Ein-/Ausgabefehler im Speicher: ${text}` };
      case SQLITE_CORRUPT:
      case SQLITE_NOTADB:
        return { code: 'datei-ungueltig', meldung: `Datenbank beschädigt oder keine SQLite-Datei: ${text}` };
      case SQLITE_CONSTRAINT:
        return { code: 'unbekannt', meldung: `Integritätsregel der Datenbank verletzt: ${text}` };
      default:
        return { code: 'unbekannt', meldung: text };
    }
  }
  if (QUOTA.test(text)) return voll();
  if (GESPERRT_NAMEN.test(text)) return gesperrt();
  return { code: 'unbekannt', meldung: text };
}

/** Führt `f` aus und macht aus jeder Ausnahme einen Fehlerwert. */
export function fange<T>(f: () => T): Ergebnis<T, Speicherfehler> {
  try {
    return { ok: true, wert: f() };
  } catch (e) {
    return { ok: false, fehler: fehlerAusAusnahme(e) };
  }
}
