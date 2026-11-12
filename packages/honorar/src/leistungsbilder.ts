// SPDX-License-Identifier: AGPL-3.0-or-later
// Leistungsbilder der HOAI 2021 als Daten (Ticket 101, D-56): je Leistungsbild die Honorartafel und die Leistungsphasen
// mit ihren Prozentsätzen. Nur Namen, Tafelwerte und Prozentsätze, je mit Vorschrift und Abrufdatum; keine Texte der
// Grundleistungen aus den Anlagen (C1).

import type { Prozent } from '@tethys/vertrag';
import type { Honorartafel, Quelle } from './honorartafeln';
import { TAFEL_35, TAFEL_52, TAFEL_56, quelle } from './honorartafeln';
import { prozent } from './konstanten';

/** Leistungsbild der HOAI, für das die App Honorare rechnet. */
export type Leistungsbild = 'gebaeude' | 'innenraeume' | 'tragwerksplanung' | 'technische-ausruestung';

export type Leistungsphasennummer = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Eine Leistungsphase eines Leistungsbilds mit ihrer Bewertung in Prozent des Honorars. */
export interface Leistungsphase {
  readonly nummer: Leistungsphasennummer;
  /** Name der Leistungsphase wie in der HOAI, z. B. „Vorplanung“. */
  readonly name: string;
  /** Prozentsatz der HOAI für die Leistungsphase. */
  readonly anteil: Prozent;
}

export interface Leistungsbilddaten {
  /** Anzeigename, z. B. „Gebäude“. */
  readonly bezeichnung: string;
  readonly honorartafel: Honorartafel;
  /** In aufsteigender Nummer, ohne Lücke ab 1; die Prozentsätze ergeben zusammen 100. */
  readonly leistungsphasen: readonly Leistungsphase[];
  readonly quelleLeistungsphasen: Quelle;
}

const NUMMERN: readonly Leistungsphasennummer[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Leistungsphasen 1, 2, … aus Paaren (Name, Prozentsatz) in der Reihenfolge der Quelle. */
function leistungsphasen(paare: readonly (readonly [string, string])[]): Leistungsphase[] {
  return paare.map(([name, anteil], i) => {
    const nummer = NUMMERN[i];
    if (nummer === undefined) throw new Error(`Mehr als neun Leistungsphasen: ${name}`);
    return { nummer, name, anteil: prozent(anteil) };
  });
}

const LPH_1 = 'Grundlagenermittlung';
const LPH_2 = 'Vorplanung';
const LPH_3 = 'Entwurfsplanung';
const LPH_4 = 'Genehmigungsplanung';
const LPH_5 = 'Ausführungsplanung';
const LPH_6 = 'Vorbereitung der Vergabe';
const LPH_7 = 'Mitwirkung bei der Vergabe';
const LPH_9 = 'Objektbetreuung';

/**
 * § 34 Abs. 3 Nr. 1 bis 9 HOAI, jeweils der Satz für Gebäude.
 * https://www.gesetze-im-internet.de/hoai_2013/__34.html, abgerufen am 2026-11-12.
 */
const PHASEN_GEBAEUDE = leistungsphasen([
  [LPH_1, '2.00'],
  [LPH_2, '7.00'],
  [LPH_3, '15.00'],
  [LPH_4, '3.00'],
  [LPH_5, '25.00'],
  [LPH_6, '10.00'],
  [LPH_7, '4.00'],
  ['Objektüberwachung – Bauüberwachung und Dokumentation', '32.00'],
  [LPH_9, '2.00'],
]);

/**
 * § 34 Abs. 3 Nr. 1 bis 9 HOAI, jeweils der Satz für Innenräume.
 * https://www.gesetze-im-internet.de/hoai_2013/__34.html, abgerufen am 2026-11-12.
 */
const PHASEN_INNENRAEUME = leistungsphasen([
  [LPH_1, '2.00'],
  [LPH_2, '7.00'],
  [LPH_3, '15.00'],
  [LPH_4, '2.00'],
  [LPH_5, '30.00'],
  [LPH_6, '7.00'],
  [LPH_7, '3.00'],
  ['Objektüberwachung – Bauüberwachung und Dokumentation', '32.00'],
  [LPH_9, '2.00'],
]);

/**
 * § 51 Abs. 1 Nr. 1 bis 6 HOAI (nur Leistungsphasen 1 bis 6; die Abweichungen der Leistungsphase 5 nach Abs. 2 bis 4
 * sind ein abweichender Anteil der Eingabe). https://www.gesetze-im-internet.de/hoai_2013/__51.html,
 * abgerufen am 2026-11-12.
 */
const PHASEN_TRAGWERKSPLANUNG = leistungsphasen([
  [LPH_1, '3.00'],
  [LPH_2, '10.00'],
  [LPH_3, '15.00'],
  [LPH_4, '30.00'],
  [LPH_5, '40.00'],
  [LPH_6, '2.00'],
]);

/**
 * § 55 Abs. 1 Satz 2 Nr. 1 bis 9 HOAI (der Abschlag der Leistungsphase 5 nach Abs. 2 ist ein abweichender Anteil der
 * Eingabe). https://www.gesetze-im-internet.de/hoai_2013/__55.html, abgerufen am 2026-11-12.
 */
const PHASEN_TECHNISCHE_AUSRUESTUNG = leistungsphasen([
  [LPH_1, '2.00'],
  [LPH_2, '9.00'],
  [LPH_3, '17.00'],
  [LPH_4, '2.00'],
  [LPH_5, '22.00'],
  [LPH_6, '7.00'],
  [LPH_7, '5.00'],
  ['Objektüberwachung – Bauüberwachung', '35.00'],
  [LPH_9, '1.00'],
]);

export const LEISTUNGSBILDER: Readonly<Record<Leistungsbild, Leistungsbilddaten>> = {
  // Gebäude und Innenräume teilen die Tafel des § 35 Abs. 1, bewerten die Leistungsphasen aber verschieden.
  gebaeude: {
    bezeichnung: 'Gebäude',
    honorartafel: TAFEL_35,
    leistungsphasen: PHASEN_GEBAEUDE,
    quelleLeistungsphasen: quelle(34, 3),
  },
  innenraeume: {
    bezeichnung: 'Innenräume',
    honorartafel: TAFEL_35,
    leistungsphasen: PHASEN_INNENRAEUME,
    quelleLeistungsphasen: quelle(34, 3),
  },
  tragwerksplanung: {
    bezeichnung: 'Tragwerksplanung',
    honorartafel: TAFEL_52,
    leistungsphasen: PHASEN_TRAGWERKSPLANUNG,
    quelleLeistungsphasen: quelle(51, 1),
  },
  'technische-ausruestung': {
    bezeichnung: 'Technische Ausrüstung',
    honorartafel: TAFEL_56,
    leistungsphasen: PHASEN_TECHNISCHE_AUSRUESTUNG,
    quelleLeistungsphasen: quelle(55, 1),
  },
};
