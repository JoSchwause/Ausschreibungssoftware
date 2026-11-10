// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { formatiereBetragDe } from '@tethys/dezimal';
import type { Betrag, Knoten, LvZustand, Position } from '@tethys/vertrag';
import { erzeugeDruckHtml, escapeHtml } from './druck';
import { schriftenAusDateien } from './schriften-node';
import { lvZustandAusFixture } from './testhilfen';

const schriften = schriftenAusDateien();

describe('Druck-HTML (Weg B)', () => {
  it('enthält Sollsummen in de-DE-Schreibweise, Seitenzahl-Randbox und Titel-Umbruchregel', () => {
    const { fx, zustand } = lvZustandAusFixture('typisch');
    const html = erzeugeDruckHtml(zustand, schriften);
    for (const wert of Object.values(fx.sollwerte.summen))
      expect(html).toContain(formatiereBetragDe(wert as Betrag));
    expect(html).toContain('"Seite " counter(page) " von " counter(pages)');
    expect(html).toContain('tr.titel{break-after:avoid');
    expect(html).toContain('<html lang="de">');
  });

  it('maskiert Sonderzeichen im Text', () => {
    expect(escapeHtml(`<b>&"'`)).toBe('&lt;b&gt;&amp;&quot;&#39;');
    const { zustand } = lvZustandAusFixture('winzig');
    const knoten = zustand.leistungsverzeichnis.knoten.map((k): Knoten =>
      k.art === 'position' ? ({ ...k, kurztext: '<script>x</script> Größe m²' } satisfies Position) : k,
    );
    const lv: LvZustand = { ...zustand, leistungsverzeichnis: { ...zustand.leistungsverzeichnis, knoten } };
    const html = erzeugeDruckHtml(lv, schriften);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt; Größe m²');
  });
});
