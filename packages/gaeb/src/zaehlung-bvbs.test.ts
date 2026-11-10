// SPDX-License-Identifier: AGPL-3.0-or-later
// Zweiter, vom Leser unabhängiger Zähler (Ticket 25, Punkt 5; E-16): Die Prüfdatei Bauausführung X83 wird hier mit einem
// einfachen Durchlauf über die Start-Tags des Rohtexts gezählt, ohne `parseXml`, ohne Leser, ohne Modell. Die eigene
// Zählung (Ticket 22) lautet 12 Titel, 28 Positionen (27 Item + 1 MarkupItem), 4 Hinweistexte; die BVBS-Prüfkriterien
// nennen keine Zahl. Stimmt der Zähler nicht, wird das gemeldet und nichts angepasst.

import { describe, expect, it } from 'vitest';
import type { Knoten } from '@tethys/vertrag';
import { leseGaeb } from './index';
import { lesePfad, testIds } from './testhilfen';

const BAU_X83 = 'fixtures/extern/bvbs/3.3-bauausfuehrung/Pruefdatei_3.3_Bauausfuehrung_V-04-04-2024.x83';

/** Zählt Start-Tags nach Elementname im Rohtext; Kommentare und CDATA werden vorher entfernt. */
function zaehleStartTags(text: string): Map<string, number> {
  const ohne = text.replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  const zaehler = new Map<string, number>();
  for (const m of ohne.matchAll(/<([A-Za-z][A-Za-z0-9]*)(?=[\s/>])/g)) {
    const name = m[1] ?? '';
    zaehler.set(name, (zaehler.get(name) ?? 0) + 1);
  }
  return zaehler;
}

describe('Zweiter Zähler: BVBS Bauausführung X83', () => {
  const text = new TextDecoder('utf-8').decode(lesePfad(BAU_X83));
  const tags = zaehleStartTags(text);
  const n = (name: string): number => tags.get(name) ?? 0;

  it('zählt 12 Titel, 28 Positionen (27 Item + 1 MarkupItem) und 4 Hinweistexte', () => {
    expect({
      titel: n('BoQCtgy'),
      items: n('Item'),
      zuschlagspositionen: n('MarkupItem'),
      hinweistexte: n('Remark'),
    }).toEqual({ titel: 12, items: 27, zuschlagspositionen: 1, hinweistexte: 4 });
    expect(n('Item') + n('MarkupItem')).toBe(28);
  });

  it('der Leser liefert dieselben Zahlen', () => {
    const l = leseGaeb(lesePfad(BAU_X83), { ids: testIds(), dateiname: 'x.x83' });
    const knoten: readonly Knoten[] = l.inhalt?.knoten ?? [];
    const je = (art: Knoten['art']): number => knoten.filter((k) => k.art === art).length;
    expect(je('titel')).toBe(n('BoQCtgy'));
    expect(je('position')).toBe(n('Item') + n('MarkupItem'));
    expect(je('hinweis')).toBe(n('Remark'));
  });
});
