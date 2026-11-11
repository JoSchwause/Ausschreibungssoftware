// SPDX-License-Identifier: AGPL-3.0-or-later
// Testhilfen für den Excel-Rundlauf (Ticket 61), nicht exportiert über index.ts: Angebote der Fixture
// `typisch-angebote` in Vertragsform und ein Bieter, der Zellen eines Blanketts füllt, indem er die XML des
// Arbeitsblatts ändert (so wie Excel sie schreiben würde: Zahlzellen, Textzellen, Shared Strings).

import { readFileSync } from 'node:fs';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { Angebotsposition, Einheitspreis, PositionId, Prozent } from '@tethys/vertrag';
import { leseXlsx } from '../xlsx';

type FxAngebotsposition =
  | { positionId: string; status: 'angeboten'; einheitspreis: string }
  | { positionId: string; status: 'angeboten'; zuschlagssatz: string }
  | { positionId: string; status: 'nicht-angeboten' };

interface FxAngebotsset {
  lvId: string;
  bieter: { id: string; name: string }[];
  angebote: {
    id: string;
    bieterId: string;
    positionen: FxAngebotsposition[];
    sollwerte: { positionen: Record<string, { gp: string | null }> };
  }[];
}

export interface FixtureAngebot {
  readonly bieter: string;
  /** In Vertragsform; an Zuschlagspositionen mit Platzhalter-EP `0.000` (D-29.1). */
  readonly positionen: readonly Angebotsposition[];
  /** Roh aus der Fixture (Punktnotation). */
  readonly roh: readonly FxAngebotsposition[];
  /** Sollwerte der Fixture: GP je Position (Punktnotation, 2 Stellen). */
  readonly sollGp: ReadonlyMap<string, string | null>;
}

export function typischAngebote(): FixtureAngebot[] {
  const set = JSON.parse(
    readFileSync(new URL('../../../../fixtures/typisch-angebote.json', import.meta.url), 'utf8'),
  ) as FxAngebotsset;
  const namen = new Map(set.bieter.map((b) => [b.id, b.name]));
  return set.angebote.map((a) => ({
    bieter: namen.get(a.bieterId) ?? a.bieterId,
    roh: a.positionen,
    sollGp: new Map(Object.entries(a.sollwerte.positionen).map(([id, w]) => [id, w.gp])),
    positionen: a.positionen.map((p): Angebotsposition => {
      const positionId = p.positionId as PositionId;
      if (p.status === 'nicht-angeboten') return { positionId, status: 'nicht-angeboten' };
      if ('zuschlagssatz' in p)
        return {
          positionId,
          status: 'angeboten',
          einheitspreis: '0.000' as Einheitspreis,
          epa: null,
          zuschlagssatz: p.zuschlagssatz as Prozent,
        };
      return { positionId, status: 'angeboten', einheitspreis: p.einheitspreis as Einheitspreis, epa: null };
    }),
  }));
}

/** Spalten des Blanketts (0-basiert), wie sie `lvAlsExcel` schreibt. */
export const SPALTE = { oz: 0, ep: 5, satz: 7, id: 8 } as const;
export const SPALTENBUCHSTABE = { oz: 'A', ep: 'F', satz: 'H', id: 'I' } as const;

/** Zeile (1-basiert) eines Knotens im Blankett, über die versteckte ID-Spalte. */
export function zeileVon(bytes: Uint8Array, knotenId: string): number {
  const l = leseXlsx(bytes);
  if (!l.ok) throw new Error(l.meldung);
  for (const [n, zellen] of l.zeilen) {
    const z = zellen.get(SPALTE.id);
    if (z?.wert.art === 'text' && z.wert.text === knotenId) return n;
  }
  throw new Error(`Knoten ${knotenId} nicht im Blatt.`);
}

export interface Eintrag {
  /** Zellbezug, z. B. `F7`. */
  readonly ref: string;
  /** Neue Zelle als XML (ohne `r`; wird ergänzt), oder `null`: Zelle entfernen. */
  readonly xml: string | null;
}

/** Zahlzelle, wie Excel sie schreibt (`<v>` mit Gleitkommatext). */
export const zahl = (v: string): string => `<c><v>${v}</v></c>`;
/** Textzelle als Inline String. */
export const text = (t: string): string => `<c t="inlineStr"><is><t>${t}</t></is></c>`;

const BLATT = 'xl/worksheets/sheet1.xml';

/** Ändert Zellen des ersten Blatts; jede Zeile muss es geben. Gibt neue Bytes zurück. */
export function zellenSetzen(bytes: Uint8Array, eintraege: readonly Eintrag[]): Uint8Array {
  const dateien = unzipSync(bytes);
  let xml = strFromU8(dateien[BLATT] ?? new Uint8Array());
  for (const e of eintraege) {
    const zeile = /[0-9]+$/.exec(e.ref)?.[0] ?? '';
    const zelle = new RegExp(`<c r="${e.ref}"(?:[^>]*/>|[^>]*>.*?</c>)`);
    const neu = e.xml === null ? '' : e.xml.replace(/^<c/, `<c r="${e.ref}"`);
    if (zelle.test(xml)) xml = xml.replace(zelle, neu);
    else {
      const ende = new RegExp(`(<row r="${zeile}"[^>]*>.*?)(</row>)`);
      if (!ende.test(xml)) throw new Error(`Zeile ${zeile} fehlt im Blatt.`);
      xml = xml.replace(ende, `$1${neu}$2`);
    }
  }
  dateien[BLATT] = strToU8(xml);
  return zipSync(dateien);
}

/** Ersetzt einen Teil der Arbeitsmappe roh (für Kopf- und Strukturfehler). */
export function teilErsetzen(bytes: Uint8Array, pfad: string, aendern: (xml: string) => string): Uint8Array {
  const dateien = unzipSync(bytes);
  dateien[pfad] = strToU8(aendern(strFromU8(dateien[pfad] ?? new Uint8Array())));
  return zipSync(dateien);
}

export function teilLesen(bytes: Uint8Array, pfad: string): string {
  const d = unzipSync(bytes)[pfad];
  if (d === undefined) throw new Error(`${pfad} fehlt.`);
  return strFromU8(d);
}

export function teile(bytes: Uint8Array): string[] {
  return Object.keys(unzipSync(bytes)).sort();
}

/** Gleitkommatext, wie Excel ihn für eine eingetippte Dezimalzahl meist schreibt: ohne Nachkommanullen. */
export const excelText = (dezimal: string): string => dezimal.replace(/\.?0+$/, '');
/** de-DE-Text, wie ein Bieter ihn in eine Textzelle tippt (`1814.850` → `1.814,85`). */
export const deText = (dezimal: string): string => {
  const [ganz = '', nach = ''] = dezimal.split('.');
  const rest = nach.replace(/0+$/, '');
  return ganz.replace(/\B(?=(?:[0-9]{3})+$)/g, '.') + (rest === '' ? '' : `,${rest}`);
};

/** Trägt die Preise eines Fixture-Angebots ein: EP in Spalte F, Satz in Spalte H; „nicht angeboten“ bleibt leer. */
export function ausfuellen(
  bytes: Uint8Array,
  angebot: FixtureAngebot,
  zelle: (dezimal: string) => string,
): Uint8Array {
  const eintraege: Eintrag[] = [];
  for (const p of angebot.roh) {
    if (p.status === 'nicht-angeboten') continue;
    const n = String(zeileVon(bytes, p.positionId));
    if ('zuschlagssatz' in p)
      eintraege.push({ ref: `${SPALTENBUCHSTABE.satz}${n}`, xml: zelle(p.zuschlagssatz) });
    else eintraege.push({ ref: `${SPALTENBUCHSTABE.ep}${n}`, xml: zelle(p.einheitspreis) });
  }
  return zellenSetzen(bytes, eintraege);
}
