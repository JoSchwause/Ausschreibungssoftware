// SPDX-License-Identifier: AGPL-3.0-or-later
// Befunde des Excel-Rundlaufs (Ticket 66). Seit dem Wellen-Review (D-92, E7) im gemeinsamen Baustein „Befunde beim Einlesen“:
// Zahl der Befunde, Gruppen in Nutzersprache, Einzelheiten aufklappbar, keine Codes als Lesetext. `ExcelBefund` lebt in
// `ausgabe` und ist kein `Pruefbefund`; für die Anzeige wird er in dessen Form gebracht. Sperrt nie (U5).

import type { ExcelBefund } from '@tethys/ausgabe';
import type { Pruefbefund } from '@tethys/vertrag';
import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { BefundeBeimEinlesen } from '../gaeb/BefundeBeimEinlesen';
import { texte } from './texte';

/** Keine Kurztexte: Die Meldungen der Excel-Leser sind schon Nutzersprache und bilden die Gruppen. */
const OHNE_KURZTEXTE = {};

/**
 * Nur für die Anzeige: Die Quelle „Excel“ gibt es unter den Befundquellen nicht. Der Baustein unterscheidet nur die GAEB-Leser
 * (Abweisungssatz, Zeilenangabe) von allen übrigen; als übrige Quelle zeigt er die Tabellenzeile, wenn keine Position
 * genannt ist.
 */
const alsPruefbefund = (b: ExcelBefund): Pruefbefund => ({ ...b, quelle: 'lv-pruefung' });

export function ExcelBefunde({ befunde }: { befunde: readonly ExcelBefund[] }): ReactElement {
  const liste = useMemo(() => befunde.map(alsPruefbefund), [befunde]);
  return (
    <BefundeBeimEinlesen befunde={liste} kurztexte={OHNE_KURZTEXTE} beschriftung={texte.einlesen.befunde} />
  );
}
