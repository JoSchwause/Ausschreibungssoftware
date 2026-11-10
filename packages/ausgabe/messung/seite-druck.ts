// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstieg nur zur Messung der Bündelgröße von Weg B (HTML-Erzeugung, ohne PDF-Bibliothek).

import { erzeugeDruckHtml } from '../src/druck';

(globalThis as unknown as { druck: unknown }).druck = erzeugeDruckHtml;
