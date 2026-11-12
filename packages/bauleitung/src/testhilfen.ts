// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests: Beispieldaten (erfunden, C4) und die Fixture `fixtures/bauleitung.json`. Produktivcode importiert diese
// Datei nie (Paketgrenzen).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  AuftragsLeistungsverzeichnisId,
  Bautagebucheintrag,
  BautagebucheintragId,
  Befehlsfehler,
  Ergebnis,
  IfcGlobalId,
  Mangel,
  MangelId,
  PositionId,
  ProjektId,
} from '@tethys/vertrag';

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** Inhalt einer JSON-Datei unter `fixtures/`. */
export function fixtureJson(pfad: string): unknown {
  return JSON.parse(readFileSync(join(wurzel, 'fixtures', pfad), 'utf8'));
}

export const PROJEKT = '019b7a12-a000-7000-8000-000000000001' as ProjektId;
export const AUFTRAG_ROHBAU = '019b7a12-d000-7000-8000-000000000021' as AuftragsLeistungsverzeichnisId;
export const POSITION = '019b7a12-d000-7000-8000-000000000051' as PositionId;
export const GLOBAL_ID = '2O2Fr$t4X7Zf8NOew3FLOH' as IfcGlobalId;

export const mangelId = (n: number): MangelId =>
  `019b7a12-d000-7000-8000-${String(30 + n).padStart(12, '0')}` as MangelId;
export const eintragId = (n: number): BautagebucheintragId =>
  `019b7a12-d000-7000-8000-${String(40 + n).padStart(12, '0')}` as BautagebucheintragId;

/** Ein offener Mangel mit Nummer `nummer` (festgestellt am 10.11.2026, Frist 20.11.2026). */
export function mangel(nummer: number, aenderung: Partial<Mangel> = {}): Mangel {
  return {
    id: mangelId(nummer),
    projektId: PROJEKT,
    nummer,
    titel: `Mangel ${String(nummer)}`,
    beschreibung: null,
    ort: null,
    auftragsLvId: AUFTRAG_ROHBAU,
    positionId: null,
    bauteil: null,
    festgestellt: '2026-11-10',
    frist: '2026-11-20',
    verlauf: [{ status: 'offen', datum: '2026-11-10', bemerkung: null }],
    ...aenderung,
  };
}

/** Ein Bautagebucheintrag zum Tag `datum`. */
export function eintrag(
  n: number,
  datum: string,
  aenderung: Partial<Bautagebucheintrag> = {},
): Bautagebucheintrag {
  return {
    id: eintragId(n),
    projektId: PROJEKT,
    datum,
    wetter: { beschreibung: 'bedeckt', temperaturMin: 2, temperaturMax: 8 },
    arbeitskraefte: [{ firma: 'Rohbau Muster GmbH (erfunden)', anzahl: 6 }],
    geraete: null,
    leistungen: null,
    behinderungen: null,
    vorkommnisse: null,
    ...aenderung,
  };
}

/** Wert eines angenommenen Ergebnisses; ein Fehler lässt den Test scheitern. */
export function wert<T>(e: Ergebnis<T, Befehlsfehler>): T {
  if (!e.ok) throw new Error(`${e.fehler.code}: ${e.fehler.meldung}`);
  return e.wert;
}

/** Fehler eines abgewiesenen Ergebnisses (ohne Meldung, die nur für Entwickler ist). */
export function fehler<T>(e: Ergebnis<T, Befehlsfehler>): Omit<Befehlsfehler, 'meldung'> {
  if (e.ok) throw new Error('Befehl wurde angenommen, erwartet war ein Fehler');
  const { code, feld, knotenId } = e.fehler;
  return { code, ...(feld === undefined ? {} : { feld }), ...(knotenId === undefined ? {} : { knotenId }) };
}
