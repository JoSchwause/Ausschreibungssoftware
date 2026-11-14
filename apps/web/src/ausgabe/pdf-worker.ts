// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 66: Web Worker für den LV-Druck (Ticket 28 maß 2,5–3 s bei 5.000 Zeilen; der Hauptthread bleibt bedienbar).
// `@tethys/ausgabe` (pdfmake) und die Schriften lädt `ui/pdf-worker-basis.ts` erst hier, nie ins Hauptbündel; dort stehen
// auch die Schritte „schriften“ und „setzen“, die der Dialog anzeigt (Wellen-Review SB7: ein Schriftlader für alle Drucke).

import type { PdfOptionen } from '@tethys/ausgabe';
import type { LvZustand } from '@tethys/vertrag';
import { pdfAuftraegeBedienen } from '../ui/pdf-worker-basis';

export interface PdfAuftrag {
  readonly zustand: LvZustand;
  readonly optionen: PdfOptionen;
}

self.onmessage = pdfAuftraegeBedienen<PdfAuftrag>((ausgabe, a, schriften) =>
  ausgabe.erzeugePdf(a.zustand, schriften, a.optionen),
);
