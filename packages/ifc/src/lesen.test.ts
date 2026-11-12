// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests der Datei als Ganzes (Ticket 98, Punkt 1): Erkennen, Schema, Kopf. Die Sollwerte stehen hier von Hand,
// abgelesen aus den selbst verfassten IFC-Texten (C4); sie werden nie aus dem Leser erzeugt.

import { describe, expect, it } from 'vitest';
import { ifcLesen } from './index';
import { abgewiesen, bytes } from './testhilfen';

describe('Keine IFC-Datei', () => {
  it.each([
    ['leere Eingabe', ''],
    ['Text', 'Hallo Welt'],
    ['ZIP (ifcZIP)', 'PK\u0003\u0004\u0014\u0000\u0000\u0000'],
    ['XML (ifcXML)', '<?xml version="1.0"?>\n<ifcXML/>'],
    ['nur der Anfang', 'ISO-10303-21'],
  ])('weist %s ab', (_name, text) => {
    expect(abgewiesen(ifcLesen(bytes(text)))).toBe('keine-ifc-datei');
  });
});
