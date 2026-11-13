// SPDX-License-Identifier: AGPL-3.0-or-later
// Fristprüfung der Mängel zu einem Stichtag (Ticket 111 Punkt 2; D-57, D-97.11, Glossar „Fristprüfung“, „Frist“,
// „Stichtag“). Der Stichtag kommt vom Aufrufer (A2: keine Uhr). Rein.

import type { Mangel, Pruefbefund } from '@tethys/vertrag';
import { istKalendertag } from './datum';
import { istOffenerStatus, mangelstatus } from './mangelstatus';

/**
 * Codes der Befunde dieses Pakets (Quelle `fristpruefung`); die Liste führt das Paket selbst (D-97.11). Nur
 * `mangel-frist-ueberschritten` heißt „überfällig“; `mangel-angezeigt-ohne-frist` meldet einen angezeigten Mangel ohne Frist,
 * der nie überfällig werden kann (Ticket 122, PB6: ein Befund statt einer Sperre, U5).
 */
export type Fristbefundcode = 'mangel-frist-ueberschritten' | 'mangel-angezeigt-ohne-frist';

/** Was die Fristprüfung von einem Mangel liest. */
export type Fristangaben = Pick<Mangel, 'id' | 'nummer' | 'frist' | 'verlauf'>;

/** Wirft, wenn der Stichtag kein Kalendertag ist: Den übergibt die App, ein falscher ist ein Programmfehler (D-111.6). */
export function stichtagPruefen(stichtag: string): void {
  if (!istKalendertag(stichtag))
    throw new RangeError(`Kein Kalendertag als Stichtag: ${JSON.stringify(stichtag)}`);
}

/**
 * Ist der Mangel zum Stichtag überfällig? Ja, wenn er eine Frist hat, die (streng) vor dem Stichtag liegt, und sein Status
 * (der letzte Verlaufseintrag, D-111.5) offen oder angezeigt ist. Eine Frist am Stichtag ist nicht überfällig. Der Stichtag
 * muss geprüft sein (`stichtagPruefen`); Fristen gespeicherter Mängel hat der Ausführer geprüft.
 */
export function istUeberfaellig(mangel: Pick<Mangel, 'frist' | 'verlauf'>, stichtag: string): boolean {
  if (mangel.frist === null || mangel.frist >= stichtag) return false;
  return istOffenerStatus(mangelstatus(mangel));
}

/**
 * Angezeigt, aber ohne Frist: Die geltende Frist ist `Mangel.frist` (Lesart des Vertrags); fehlt sie, kann der Mangel nie
 * überfällig werden, auch wenn der Verlaufseintrag eine Frist trägt (Ticket 111: „offen → angezeigt (mit Frist)“).
 */
export const angezeigtOhneFrist = (mangel: Pick<Mangel, 'frist' | 'verlauf'>): boolean =>
  mangel.frist === null && mangelstatus(mangel) === 'angezeigt';

function fristbefund(m: Fristangaben, stichtag: string): Pruefbefund | null {
  const ort = { mangelId: m.id, feld: 'frist' };
  if (istUeberfaellig(m, stichtag))
    return {
      schwere: 'warnung',
      quelle: 'fristpruefung',
      code: 'mangel-frist-ueberschritten' satisfies Fristbefundcode,
      meldung: `Mangel ${String(m.nummer)}: Frist ${String(m.frist)} vor dem Stichtag ${stichtag} überschritten (Status ${mangelstatus(m)})`,
      ort,
    };
  if (angezeigtOhneFrist(m))
    return {
      schwere: 'warnung',
      quelle: 'fristpruefung',
      code: 'mangel-angezeigt-ohne-frist' satisfies Fristbefundcode,
      meldung: `Mangel ${String(m.nummer)}: angezeigt ohne Frist; er kann nicht überfällig werden`,
      ort,
    };
  return null;
}

/**
 * Prüft die Fristen der Mängel eines Projekts zu einem Stichtag (`JJJJ-MM-TT`). Je überfälligem Mangel ein Prüfbefund
 * (Warnung, Quelle `fristpruefung`, Code `mangel-frist-ueberschritten`, Ort: der Mangel und `feld: 'frist'`), ebenso je
 * angezeigtem Mangel ohne Frist (`mangel-angezeigt-ohne-frist`, Ticket 122); nach der Nummer geordnet. Ein Stichtag, der
 * kein Kalendertag ist: `RangeError`.
 */
export function fristPruefen(maengel: readonly Fristangaben[], stichtag: string): Pruefbefund[] {
  stichtagPruefen(stichtag);
  return [...maengel]
    .sort((a, b) => a.nummer - b.nummer)
    .flatMap((m) => {
      const b = fristbefund(m, stichtag);
      return b === null ? [] : [b];
    });
}
