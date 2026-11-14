// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 66: ein PDF-Lauf des LV-Drucks im Web Worker, abbrechbar, über den gemeinsamen Worker-Start (`ui/pdf-lauf.ts`,
// Wellen-Review SB7). Der Worker wird je Lauf angelegt und danach beendet; Abbrechen beendet ihn sofort (die Seite bleibt
// bedienbar, es bleibt nichts zurück).

import type { PdfOptionen } from '@tethys/ausgabe';
import type { LvZustand } from '@tethys/vertrag';
import { pdfLauf, type PdfLauf } from '../ui/pdf-lauf';
import type { PdfAuftrag } from './pdf-worker';

export type { PdfLauf } from '../ui/pdf-lauf';

export type PdfSchritt = 'schriften' | 'setzen';

const istSchritt = (s: string): s is PdfSchritt => s === 'schriften' || s === 'setzen';

export function pdfErzeugen(
  zustand: LvZustand,
  optionen: PdfOptionen,
  beiSchritt: (s: PdfSchritt) => void,
): PdfLauf {
  const auftrag: PdfAuftrag = { zustand, optionen };
  return pdfLauf(
    new Worker(new URL('./pdf-worker.ts', import.meta.url), { type: 'module' }),
    auftrag,
    (s) => {
      if (istSchritt(s)) beiSchritt(s);
    },
  );
}
