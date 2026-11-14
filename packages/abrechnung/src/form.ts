// SPDX-License-Identifier: AGPL-3.0-or-later
// Formprüfungen der Ausführer dieses Pakets (Aufmaßblatt, Ticket 80; Rechnung, Ticket 81). Befehle kommen auch aus
// Protokoll und Datei (A5, ADR 0009), darum prüft der Ausführer die Form nach, auch wo der Typ sie schon sagt. Jede Prüfung
// liefert einen Fehlertext oder `null`; den `Befehlsfehler` baut `nein`.

import { alsProzent } from '@tethys/dezimal';
import { KALENDERDATUM_MUSTER } from '@tethys/vertrag';
import type { Befehlsfehler, Befehlsfehlercode, KnotenId, Prozent } from '@tethys/vertrag';

/** Ein abgewiesener Befehl als Ergebniswert (ein abgewiesener Befehl ändert nichts, A5). */
export function nein(
  code: Befehlsfehlercode,
  meldung: string,
  feld?: string,
  knotenId?: string,
): { readonly ok: false; readonly fehler: Befehlsfehler } {
  return {
    ok: false,
    fehler: {
      code,
      meldung,
      ...(feld === undefined ? {} : { feld }),
      ...(knotenId === undefined ? {} : { knotenId: knotenId as KnotenId }),
    },
  };
}

/** Ein fester Prozentwert des Pakets, über die Dezimalprüfung gebaut statt über ein Literal mit Marke (N1). */
export function prozentKonstante(text: string): Prozent {
  const e = alsProzent(text);
  if (!e.ok) throw new Error(e.fehler.meldung);
  return e.wert;
}

export const istObjekt = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

/** Eine Kennung (UUIDv7 aus der `IdQuelle`, A7): ein nicht leerer Text. Die Form der UUID prüft niemand (undurchsichtig). */
export function kennungFehler(id: unknown, name: string): string | null {
  return typeof id === 'string' && id !== '' ? null : `${name} muss eine nicht leere Kennung sein.`;
}

/** Blatt- oder Rechnungsnummer: ganze Zahl ≥ 1 (`AufmassKopf.nummer`, `Rechnung.nummer`). */
export function nummerFehler(nummer: unknown): string | null {
  return Number.isSafeInteger(nummer) && (nummer as number) >= 1
    ? null
    : `Die Nummer muss eine ganze Zahl ab 1 sein, nicht ${String(nummer)}.`;
}

/** Tage eines Monats im proleptischen gregorianischen Kalender; der einzige Kalender dieses Pakets (auch `zahlungsstand.ts`). */
const TAGE = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
const schaltjahr = (j: number): boolean => (j % 4 === 0 && j % 100 !== 0) || j % 400 === 0;
/** Die Zahl der Tage im Monat `m` (1–12) des Jahres `j`; 0 für einen Monat, den es nicht gibt. */
export const tageImMonat = (j: number, m: number): number => (m === 2 && schaltjahr(j) ? 29 : (TAGE[m - 1] ?? 0));

/**
 * Ein Datum, wie der Nutzer es eingibt (`AufmassKopf.datum`, `Rechnung.eingang`): `null` oder `JJJJ-MM-TT` (Form nach
 * `KALENDERDATUM_MUSTER` aus dem Vertrag) mit einem Tag, den der Kalender hat (D-80.4). Keine Uhr, kein `Date` (A2): der
 * Kalender ist hier ausgeschrieben. Dieselbe Regel steht in `erechnung` (`kalenderdatum` in `zahlen.ts`); Fachpakete
 * importieren einander nicht (A3), darum bleibt sie doppelt (Review Welle 5, S4).
 */
export function datumFehler(datum: unknown): string | null {
  if (datum === null) return null;
  const meldung = `Das Datum muss null oder JJJJ-MM-TT sein, nicht ${JSON.stringify(datum)}.`;
  if (typeof datum !== 'string' || !KALENDERDATUM_MUSTER.test(datum)) return meldung;
  const [jahr, monat, tag] = datum.split('-').map(Number) as [number, number, number];
  return tag >= 1 && tag <= tageImMonat(jahr, monat) ? null : `Den Tag ${datum} gibt es im Kalender nicht.`;
}
