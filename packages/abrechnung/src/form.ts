// SPDX-License-Identifier: AGPL-3.0-or-later
// Formprüfungen der Ausführer dieses Pakets (Aufmaßblatt, Ticket 80; Rechnung, Ticket 81). Befehle kommen auch aus
// Protokoll und Datei (A5, ADR 0009), darum prüft der Ausführer die Form nach, auch wo der Typ sie schon sagt. Jede Prüfung
// liefert einen Fehlertext oder `null`; den `Befehlsfehler` baut `nein`.

import type { Befehlsfehler, Befehlsfehlercode, KnotenId } from '@tethys/vertrag';

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

const TAGE = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
const schaltjahr = (j: number): boolean => (j % 4 === 0 && j % 100 !== 0) || j % 400 === 0;

/**
 * Ein Datum, wie der Nutzer es eingibt (`AufmassKopf.datum`, `Rechnung.eingang`): `null` oder `JJJJ-MM-TT` mit einem Tag,
 * den der Kalender hat (D-80.4). Keine Uhr, kein `Date` (A2): der Kalender ist hier ausgeschrieben.
 */
export function datumFehler(datum: unknown): string | null {
  if (datum === null) return null;
  const m = typeof datum === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(datum) : null;
  const meldung = `Das Datum muss null oder JJJJ-MM-TT sein, nicht ${JSON.stringify(datum)}.`;
  if (m === null) return meldung;
  const [jahr, monat, tag] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const tage = monat === 2 && schaltjahr(jahr) ? 29 : (TAGE[monat - 1] ?? 0);
  return tag >= 1 && tag <= tage ? null : `Den Tag ${m[0]} gibt es im Kalender nicht.`;
}

/**
 * Form eines Mengenansatzes wie im Kern (Ticket 56, D-22; `mengenansatzFehler`, dort nicht ausgeführt): eine Liste von
 * Ansatzzeilen mit ganzzahliger Zeilen- und Formelnummer, dem Ausdruck als Text und dem Variablennamen als Text oder `null`.
 * Ausgewertet wird nie (die Menge rechnet die App mit `mengen`, A3).
 */
export function ansatzFehler(ansatz: unknown): string | null {
  if (!Array.isArray(ansatz)) return 'Der Mengenansatz muss null oder eine Liste von Ansatzzeilen sein.';
  for (const z of ansatz as readonly unknown[]) {
    if (!istObjekt(z)) return 'Eine Ansatzzeile muss ein Objekt sein.';
    if (!Number.isSafeInteger(z['zeile'])) return 'Die Zeilennummer einer Ansatzzeile ist ganzzahlig.';
    if (!Number.isSafeInteger(z['formel'])) return 'Die Formelnummer einer Ansatzzeile ist ganzzahlig.';
    if (typeof z['ausdruck'] !== 'string') return 'Der Ausdruck einer Ansatzzeile ist ein Text.';
    if (z['variable'] !== null && typeof z['variable'] !== 'string')
      return 'Der Variablenname einer Ansatzzeile ist ein Text oder null.';
  }
  return null;
}
