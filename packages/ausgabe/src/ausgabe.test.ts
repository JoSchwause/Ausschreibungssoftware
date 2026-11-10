// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { formatiereBetragDe } from '@tethys/dezimal';
import type { Knoten, LvZustand, Position, Betrag } from '@tethys/vertrag';
import { erzeugePdf } from './index';
import { schriftenAusDateien } from './schriften-node';
import { alsText, liesPdf } from './pdftext';
import { lvZustandAusFixture } from './testhilfen';

const schriften = schriftenAusDateien();

describe.each(['winzig', 'typisch'] as const)('PDF der Fixture %s', (name) => {
  const { fx, zustand } = lvZustandAusFixture(name);

  it('enthält Name, Sollsummen und Titelsummen in de-DE-Schreibweise', async () => {
    const pdf = await erzeugePdf(zustand, schriften);
    expect(new TextDecoder('latin1').decode(pdf.subarray(0, 5))).toBe('%PDF-');
    const text = alsText(await liesPdf(pdf));
    expect(text).toContain(fx.name);
    const s = fx.sollwerte.summen;
    for (const wert of [s.netto, s.nettoNachNachlass, s.mwst, s.brutto]) {
      expect(text).toContain(formatiereBetragDe(wert as Betrag));
    }
    if (fx.nachlass !== null) expect(text).toContain(formatiereBetragDe(s.nachlass as Betrag));
    for (const t of Object.values(fx.sollwerte.titel))
      expect(text).toContain(formatiereBetragDe(t.summe as Betrag));
  });

  it('trägt Seitenzahl „Seite x von y“ auf jeder Seite', async () => {
    const inhalt = await liesPdf(await erzeugePdf(zustand, schriften));
    const n = inhalt.seiten.length;
    inhalt.seiten.forEach((seite, i) => {
      expect(seite.map((t) => t.text).join(' ')).toContain(`Seite ${String(i + 1)} von ${String(n)}`);
    });
  });
});

/** Winzig-LV mit Sonderzeichen in Kurztext, Langtext und Einheit; der Kern rechnet die Summen unverändert. */
function mitSonderzeichen(zustand: LvZustand): LvZustand {
  const knoten = zustand.leistungsverzeichnis.knoten.map((k): Knoten => {
    if (k.art !== 'position') return k;
    const p: Position = {
      ...k,
      kurztext: 'Größe Ärger Übung ß ö',
      einheit: 'm²',
      langtext: [{ art: 'text', text: 'Preis in € je m² – Maß ½' }],
    };
    return p;
  });
  return { ...zustand, leistungsverzeichnis: { ...zustand.leistungsverzeichnis, knoten } };
}

describe('Zeichen und Schrift', () => {
  it('Umlaute, m² und € stehen im PDF; die Schrift ist eingebettet', async () => {
    const { zustand } = lvZustandAusFixture('winzig');
    const pdf = await erzeugePdf(mitSonderzeichen(zustand), schriften);
    const inhalt = await liesPdf(pdf);
    const text = alsText(inhalt);
    expect(text).toContain('Größe Ärger Übung ß ö');
    expect(text).toContain('m²');
    expect(text).toContain('Preis in € je m²');
    // Eingebettet: Schriftdatei-Stream vorhanden, keine der 14 Standardschriften referenziert.
    const roh = new TextDecoder('latin1').decode(pdf);
    expect(roh).toMatch(/\/FontFile2?\b/);
    expect(roh).toMatch(/\/BaseFont\s*\/[A-Z]{6}\+NotoSans/);
    expect(roh).not.toMatch(/\/BaseFont\s*\/(Helvetica|Times|Courier)/);
  });
});

describe('Seitenumbruch', () => {
  it('trennt keinen Titel vom ersten Kind (Titelzeile steht nie ganz unten auf der Seite)', async () => {
    const { zustand: basis } = lvZustandAusFixture('winzig');
    const lv = basis.leistungsverzeichnis;
    const vorlageTitel = lv.knoten.find((k) => k.art === 'titel');
    const vorlagePos = lv.knoten.find((k) => k.art === 'position');
    if (vorlageTitel?.art !== 'titel' || vorlagePos?.art !== 'position')
      throw new Error('Fixture ohne Titel/Position');
    // 300 Titel mit je einer Position mit unterschiedlich langem Langtext: so fallen Titelzeilen auf mehrere Seitenenden.
    const knoten: Knoten[] = [];
    for (let i = 0; i < 300; i++) {
      const tid = `titel-${String(i)}` as typeof vorlageTitel.id;
      knoten.push({
        ...vorlageTitel,
        id: tid,
        elternId: lv.id,
        reihenfolge: i,
        kurztext: `Abschnitt ${String(i)}`,
      });
      knoten.push({
        ...vorlagePos,
        id: `pos-${String(i)}` as typeof vorlagePos.id,
        elternId: tid,
        reihenfolge: 0,
        kurztext: `Leistung ${String(i)}`,
        langtext: [{ art: 'text', text: 'Zeile\n'.repeat((i * 3) % 7) }],
      });
    }
    const zustand: LvZustand = { ...basis, leistungsverzeichnis: { ...lv, knoten } };
    const inhalt = await liesPdf(await erzeugePdf(zustand, schriften));
    expect(inhalt.seiten.length).toBeGreaterThan(1);
    let checked = 0;
    for (const seite of inhalt.seiten) {
      const titel = seite.filter((t) => /^(?!Summe).*Abschnitt \d+$/.test(t.text));
      const positionen = seite.filter((t) => /^Leistung \d+$/.test(t.text));
      if (titel.length === 0) continue;
      checked++;
      const tiefsterTitel = Math.min(...titel.map((t) => t.y));
      const tiefstePosition = Math.min(...positionen.map((t) => t.y));
      expect(tiefstePosition, `Seite endet mit einem Titel (y=${String(tiefsterTitel)})`).toBeLessThan(
        tiefsterTitel,
      );
    }
    expect(checked).toBeGreaterThan(1);
  });
});
