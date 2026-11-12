// SPDX-License-Identifier: AGPL-3.0-or-later
// Fristprüfung der Mängel zu einem Stichtag (Ticket 111 Punkt 2; D-57, D-97.11, Glossar „Fristprüfung“, „Frist“,
// „Stichtag“). Der Stichtag kommt vom Aufrufer (A2: keine Uhr). Rein.

import type { Mangel, Pruefbefund } from '@tethys/vertrag';
import { istKalendertag } from './datum';
import { mangelstatus } from './mangelstatus';

/** Codes der Befunde dieses Pakets (Quelle `fristpruefung`); die Liste führt das Paket selbst (D-97.11). */
export type Fristbefundcode = 'mangel-frist-ueberschritten';

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
  const status = mangelstatus(mangel);
  return status === 'offen' || status === 'angezeigt';
}

/**
 * Prüft die Fristen der Mängel eines Projekts zu einem Stichtag (`JJJJ-MM-TT`). Je überfälligem Mangel ein Prüfbefund
 * (Warnung, Quelle `fristpruefung`, Code `mangel-frist-ueberschritten`, Ort: der Mangel und `feld: 'frist'`), nach der
 * Nummer geordnet. Ein Stichtag, der kein Kalendertag ist: `RangeError`.
 */
export function fristPruefen(maengel: readonly Fristangaben[], stichtag: string): Pruefbefund[] {
  stichtagPruefen(stichtag);
  return maengel
    .filter((m) => istUeberfaellig(m, stichtag))
    .sort((a, b) => a.nummer - b.nummer)
    .map((m) => ({
      schwere: 'warnung',
      quelle: 'fristpruefung',
      code: 'mangel-frist-ueberschritten' satisfies Fristbefundcode,
      meldung: `Mangel ${String(m.nummer)}: Frist ${String(m.frist)} vor dem Stichtag ${stichtag} überschritten (Status ${mangelstatus(m)})`,
      ort: { mangelId: m.id, feld: 'frist' },
    }));
}
