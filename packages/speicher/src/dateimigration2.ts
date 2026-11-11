// SPDX-License-Identifier: AGPL-3.0-or-later
// Dateimigration 2 (Ticket 38, A8): hebt eine Projektdatei der Version 1 auf 2. Das Schema dazu steht in
// `migrationen.ts` (`SCHEMA_V2`). Einmal gemergt, wird hier nichts mehr geändert; spätere Änderungen sind Migration 3.
//
// Positionen werden genau so überführt, wie Version 1 sie gelesen hat: Merkmale und Zuschlag aus der einen
// Positionsart, Gruppe und Variante der Wahl `null`, kein Zuschlagssatz (Altform, Ticket 37, R8), keine Teilmenge,
// kein Zuschlagskennzeichen. Die Migration erfindet nichts.

import { abbruch } from './ergebnis';

// --- Projektdatei Version 1 → 2 ------------------------------------------------------------------------------------

type Roh = Record<string, unknown>;

const istObjekt = (x: unknown): x is Roh => typeof x === 'object' && x !== null && !Array.isArray(x);

const ungueltig = (pfad: string, was: string): never => abbruch('datei-ungueltig', `${pfad}: ${was}`);

const ALTE_POSITIONSARTEN = ['normal', 'bedarf', 'wahl', 'zuschlag', 'stundenlohn'];
const ALTE_FELDER = [
  'positionsart',
  'pauschal',
  'bedarfMitGesamtbetrag',
  'bezugspositionId',
  'grundpositionId',
];
const NEUE_FELDER = ['merkmale', 'zuschlag', 'leitbeschreibung'];

/**
 * Eine Position der Version 1 in der Form von Version 2. Die alten Felder werden so streng gelesen wie in Version 1:
 * unbekannte Art, falscher Typ und ein Wert außerhalb seiner Art (z. B. `bezugspositionId` ohne Zuschlag) sind
 * `datei-ungueltig`, nie still verworfen (Q5). Alles andere bleibt, wie es ist; die strenge Prüfung der übrigen
 * Felder macht danach der Dekoder.
 */
function positionAuf2(p: Roh, pfad: string): Roh {
  for (const f of ALTE_FELDER) if (!Object.hasOwn(p, f)) ungueltig(pfad, `Feld „${f}“ fehlt`);
  for (const f of NEUE_FELDER) if (Object.hasOwn(p, f)) ungueltig(pfad, `unbekanntes Feld „${f}“`);
  const art = p['positionsart'];
  if (typeof art !== 'string' || !ALTE_POSITIONSARTEN.includes(art)) {
    return ungueltig(`${pfad}.positionsart`, `„${String(art)}“ ist keine Positionsart der Version 1`);
  }
  const wahrheit = (f: string): boolean => {
    const w = p[f];
    return typeof w === 'boolean' ? w : ungueltig(`${pfad}.${f}`, 'Wahrheitswert erwartet');
  };
  const kennungOderNull = (f: string): string | null => {
    const w = p[f];
    return w === null || typeof w === 'string'
      ? w
      : ungueltig(`${pfad}.${f}`, 'Zeichenkette oder null erwartet');
  };
  const pauschal = wahrheit('pauschal');
  const mit = wahrheit('bedarfMitGesamtbetrag');
  const bezug = kennungOderNull('bezugspositionId');
  const grund = kennungOderNull('grundpositionId');
  const fremd = (f: string, gesetzt: boolean, nur: string): void => {
    if (gesetzt && art !== nur) ungueltig(`${pfad}.${f}`, `nur bei positionsart „${nur}“ zulässig`);
  };
  fremd('bedarfMitGesamtbetrag', mit, 'bedarf');
  fremd('bezugspositionId', bezug !== null, 'zuschlag');
  fremd('grundpositionId', grund !== null, 'wahl');
  const rest: Roh = {};
  for (const [k, w] of Object.entries(p)) if (!ALTE_FELDER.includes(k)) rest[k] = w;
  return {
    ...rest,
    merkmale: {
      bedarf: art === 'bedarf' ? (mit ? 'mit-gesamtbetrag' : 'ohne-gesamtbetrag') : null,
      wahl: art === 'wahl' ? { gruppe: null, variante: null, grundpositionId: grund } : null,
      stundenlohn: art === 'stundenlohn',
      pauschal,
      zuschlagskennzeichen: false,
    },
    zuschlag:
      art === 'zuschlag'
        ? {
            prozentsatz: null,
            bezug: {
              art: 'positionen',
              positionen: bezug === null ? [] : [{ positionId: bezug, teilmenge: null }],
            },
          }
        : null,
  };
}

/** Hebt die Knoten in `liste[i][aggregat].knoten`; was nicht die erwartete Form hat, bleibt für den Dekoder. */
function knotenAuf2(liste: unknown, aggregat: string, pfad: string): unknown {
  if (!Array.isArray(liste)) return liste;
  return (liste as unknown[]).map((z, i) => {
    if (!istObjekt(z) || !istObjekt(z[aggregat]) || !Array.isArray(z[aggregat]['knoten'])) return z;
    const a = z[aggregat];
    const knoten = (a['knoten'] as unknown[]).map((k, j) =>
      istObjekt(k) && k['art'] === 'position'
        ? positionAuf2(k, `${pfad}[${String(i)}].${aggregat}.knoten[${String(j)}]`)
        : k,
    );
    return { ...z, [aggregat]: { ...a, knoten } };
  });
}

/**
 * Projektdatei Version 1 → 2: Positionen der LV und Auftrags-LV von der alten Form in `merkmale`/`zuschlag`. Felder,
 * die es in Version 1 nicht gab (Leitbeschreibung, Kopfdaten, Ausweise, Zuschlagssatz), fehlen danach weiter. Das
 * Protokoll bleibt unverändert: Es ist ein Nebenbuch und hält die Befehle in der Form fest, in der sie liefen (ADR 0009).
 */
export function dateiAuf2(roh: Roh): Roh {
  const neu: Roh = { ...roh };
  if (Object.hasOwn(roh, 'leistungsverzeichnisse'))
    neu['leistungsverzeichnisse'] = knotenAuf2(
      roh['leistungsverzeichnisse'],
      'leistungsverzeichnis',
      '$.leistungsverzeichnisse',
    );
  if (Object.hasOwn(roh, 'auftragsLeistungsverzeichnisse'))
    neu['auftragsLeistungsverzeichnisse'] = knotenAuf2(
      roh['auftragsLeistungsverzeichnisse'],
      'auftragsLeistungsverzeichnis',
      '$.auftragsLeistungsverzeichnisse',
    );
  return neu;
}
