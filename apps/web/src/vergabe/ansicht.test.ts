// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 63: vom Preisspiegel aus `vergabe` zur Ansicht des Vergleichsgrids. Integration ohne Oberfläche: LV `typisch`
// über den Kern, die drei Angebote aus den X84-Dateien von Ticket 69 über den GAEB-Weg der App. Die Sollwerte stehen
// in der Fixture (`typisch-angebote.json`, Block `preisspiegel`), nicht in einem Lauf des Kerns.

import { readFileSync } from 'node:fs';
import { lvBefehlAusfuehren, lvChangeSetAnwenden } from '@tethys/kern';
import { angebotSummenBerechnen } from '@tethys/vergabe';
import type { AngebotZustand, LvZustand, ProjektId, Prozent } from '@tethys/vertrag';
import type { VergleichsZelle } from '@tethys/ui-grid';
import { describe, expect, it } from 'vitest';
import { fixtureInhalt } from '../../e2e/fixture-inhalt';
import { angebotLesen } from '../gaeb/gaeb';
import { appIdQuelle } from '../lv/ids';
import {
  STANDARD_WAHL,
  preisspiegelAnsicht,
  preisspiegelRechnen,
  zellDetail,
  type Anbieter,
  type AnsichtEingang,
} from './ansicht';

const wurzel = new URL('../../../../', import.meta.url);
const datei = (pfad: string): Uint8Array => new Uint8Array(readFileSync(new URL(pfad, wurzel)));

interface FxPreisspiegel {
  readonly bieter: readonly {
    readonly angebotId: string;
    readonly name: string;
    readonly datei: string;
    readonly summen: Readonly<Record<'netto' | 'nachlass' | 'nettoNachNachlass' | 'mwst' | 'brutto', string>>;
    readonly ausweise: Readonly<Record<'summeBedarfOhneGesamtbetrag' | 'summeWahl', string>>;
    readonly titel: Readonly<Record<string, string>>;
  }[];
  readonly vergleiche: readonly {
    readonly angebotIds: readonly string[];
    readonly rang: Readonly<Record<string, string>>;
    readonly virtuelleSummen: Readonly<Record<'min' | 'mittel' | 'max' | 'schaetzpreis', string>>;
  }[];
}
const fx = (
  JSON.parse(readFileSync(new URL('fixtures/typisch-angebote.json', wurzel), 'utf8')) as {
    preisspiegel: FxPreisspiegel;
  }
).preisspiegel;

/** Kanonischer Betrag der Fixture (`55481.84`) in der Anzeige de-DE (`55.481,84`); reine Textumformung. */
function betragDe(wert: string): string {
  const [ganz = '', rest = ''] = wert.split('.');
  return `${ganz.replace(/\B(?=(\d{3})+$)/g, '.')},${rest}`;
}

function typisch(): LvZustand {
  const inhalt = fixtureInhalt('typisch');
  const r = lvBefehlAusfuehren(null, {
    art: 'LeistungsverzeichnisAnlegen',
    id: inhalt.wurzelId,
    projektId: 'p' as ProjektId,
    inhalt,
  });
  if (!r.ok) throw new Error(r.fehler.meldung);
  const z = lvChangeSetAnwenden(null, r.wert);
  if (z === null) throw new Error('LV');
  return z;
}

const lv = typisch();
const ids = appIdQuelle();
/** Die Angebote so, wie die App sie einliest: X84 gegen das LV; Name aus der Datei. */
const eingelesen = fx.bieter.map((b) => {
  const v = angebotLesen(datei(`fixtures/${b.datei}`), b.datei, lv, ids);
  if (v.angebot === null) throw new Error(b.datei);
  const zustand: AngebotZustand = { angebot: v.angebot, summen: angebotSummenBerechnen(lv, v.angebot) };
  return { fx: b, name: v.bieterName, zustand };
});
const anbieter: Anbieter[] = eingelesen.map((e) => ({ name: e.name, zustand: e.zustand }));
const angebotId = (name: string): string =>
  eingelesen.find((e) => e.name === name)?.zustand.angebot.id ?? 'fehlt';

const zelle = (
  zeilen: readonly { id: string; zellen: Readonly<Record<string, VergleichsZelle | undefined>> }[],
  zeilenId: string,
  spalte: string,
): VergleichsZelle | undefined => zeilen.find((z) => z.id === zeilenId)?.zellen[spalte];

const positionsId = (oz: string, index: string | null = null): string => {
  const p = lv.leistungsverzeichnis.knoten.find(
    (k) => k.art === 'position' && k.ordnungszahl === oz && k.ozIndex === index,
  );
  if (p === undefined) throw new Error(oz);
  return p.id;
};

describe('Preisspiegel-Ansicht mit typisch und drei X84-Angeboten', () => {
  const eingang = (mehr: Partial<AnsichtEingang> = {}): AnsichtEingang => ({
    lv,
    anbieter,
    preisspiegel: preisspiegelRechnen(lv, anbieter),
    wahl: STANDARD_WAHL,
    zugeklappt: new Set(),
    ...mehr,
  });
  const a = preisspiegelAnsicht(eingang());

  it('Summenzeilen: Netto, Nachlass, Netto nach Nachlass, MwSt, Brutto und Rang je Bieter wie die Fixture', () => {
    const alle = fx.vergleiche[0];
    for (const e of eingelesen) {
      const gp = `${e.zustand.angebot.id}:gp`;
      expect(zelle(a.summen, 'summe:netto', gp)?.text).toBe(betragDe(e.fx.summen.netto));
      expect(zelle(a.summen, 'summe:nachlass', gp)?.text).toBe(betragDe(e.fx.summen.nachlass));
      expect(zelle(a.summen, 'summe:nettoNachNachlass', gp)?.text).toBe(
        betragDe(e.fx.summen.nettoNachNachlass),
      );
      expect(zelle(a.summen, 'summe:mwst', gp)?.text).toBe(betragDe(e.fx.summen.mwst));
      expect(zelle(a.summen, 'summe:brutto', gp)?.text).toBe(betragDe(e.fx.summen.brutto));
      expect(zelle(a.summen, 'summe:rang', gp)?.text).toBe(alle?.rang[e.fx.angebotId]);
    }
    expect(zelle(a.summen, 'summe:netto', 'kurztext')?.text).toBe('Netto');
    expect(zelle(a.summen, 'summe:rang', 'kurztext')?.text).toBe('Rang');
  });

  it('Summenzeilen: Bedarfs- und Wahlsumme je Bieter wie die Fixture (F4, Review Welle 4 P1)', () => {
    for (const e of eingelesen) {
      const gp = `${e.zustand.angebot.id}:gp`;
      expect(zelle(a.summen, 'summe:bedarf', gp)?.text).toBe(
        betragDe(e.fx.ausweise.summeBedarfOhneGesamtbetrag),
      );
      expect(zelle(a.summen, 'summe:wahl', gp)?.text).toBe(betragDe(e.fx.ausweise.summeWahl));
    }
  });

  it('virtuelle Bieter und Schätzpreis: Netto in der Summenzeile wie die Fixture', () => {
    const v = fx.vergleiche[0]?.virtuelleSummen;
    for (const w of ['min', 'mittel', 'max', 'schaetzpreis'] as const)
      expect(zelle(a.summen, 'summe:netto', `${w}:gp`)?.text).toBe(betragDe(v?.[w] ?? ''));
  });

  it('Gliederungssummen je Bieter wie die Titelsummen der Fixture', () => {
    for (const e of eingelesen)
      for (const [oz, summe] of Object.entries(e.fx.titel)) {
        const titel = lv.leistungsverzeichnis.knoten.find((k) => k.art === 'titel' && k.ordnungszahl === oz);
        expect(zelle(a.zeilen, titel?.id ?? '', `${e.zustand.angebot.id}:gp`)?.text).toBe(betragDe(summe));
      }
  });

  it('Kennzeichen: Ausreißer nach oben, nicht angeboten, Nullpreis am verglichenen EP', () => {
    // Fixture: Annahme A7 nennt für Bieter C 02.0050, 03.0030 und 03.0080; 03.0080 ist bei C ein Preis 0,000 und damit
    // nach D-05 Nullpreis, nie Ausreißer. Bieter B hat 03.0070 nicht angeboten.
    const c = angebotId('Bieter C');
    expect(zelle(a.zeilen, positionsId('02.0050'), `${c}:ep`)?.kennzeichen).toContain('hoch');
    expect(zelle(a.zeilen, positionsId('03.0030'), `${c}:ep`)?.kennzeichen).toContain('hoch');
    expect(zelle(a.zeilen, positionsId('03.0080'), `${c}:ep`)?.kennzeichen).toEqual(['nullpreis']);
    expect(zelle(a.zeilen, positionsId('03.0070'), `${angebotId('Bieter B')}:ep`)).toEqual({
      text: '',
      kennzeichen: ['nicht-angeboten'],
    });
    expect(zelle(a.zeilen, positionsId('02.0050'), `${c}:ep`)?.tooltip).toMatch(/^Mittel \d/);
  });

  it('Eine Schwelle von 200 % lässt bei drei Bietern keinen Ausreißer übrig', () => {
    // Bei n Bietern liegt ein Preis > 0 höchstens (n − 1) · 100 % über und weniger als 100 % unter dem Mittel.
    const ohne = preisspiegelAnsicht(
      eingang({
        preisspiegel: preisspiegelRechnen(lv, anbieter, { ausreisserSchwelle: '200.00' as Prozent }),
      }),
    );
    const marken = ohne.zeilen.flatMap((z) => Object.values(z.zellen).flatMap((x) => x?.kennzeichen ?? []));
    expect(marken).not.toContain('hoch');
    expect(marken).not.toContain('niedrig');
    expect(marken).toContain('nicht-angeboten');
  });

  it('Zuschlagsposition: Satz des Bieters im EP-Feld, Betrag im GP, Kennzeichen am Betrag', () => {
    const z = positionsId('02.0050', 'A');
    const b = angebotId('Bieter A');
    expect(zelle(a.zeilen, z, `${b}:ep`)?.text).toBe('8,51 %');
    expect(zelle(a.zeilen, z, `${b}:gp`)?.text).toBe('544,71');
  });

  it('Spaltenwahl: ohne GP stehen Summen im EP; ohne virtuelle Bieter und Schätzpreis fehlen deren Spalten', () => {
    const b = angebotId('Bieter A');
    const ohneGp = preisspiegelAnsicht(
      eingang({ wahl: { ep: true, gp: false, virtuell: false, schaetzpreis: false } }),
    );
    expect(ohneGp.spalten.map((s) => s.id)).toEqual([
      'oz',
      'kurztext',
      'menge',
      'einheit',
      'abc',
      ...anbieter.map((x) => `${x.zustand.angebot.id}:ep`),
    ]);
    expect(zelle(ohneGp.summen, 'summe:brutto', `${b}:ep`)?.text).toBe(
      betragDe(eingelesen.find((e) => e.name === 'Bieter A')?.fx.summen.brutto ?? ''),
    );
    const nurGp = preisspiegelAnsicht(eingang({ wahl: { ...STANDARD_WAHL, ep: false } }));
    expect(zelle(nurGp.zeilen, positionsId('02.0050'), `${angebotId('Bieter C')}:gp`)?.kennzeichen).toContain(
      'hoch',
    );
  });

  it('Zugeklappte Gliederung: ihre Positionen fehlen, die Gliederung bleibt mit Summe', () => {
    const titel = lv.leistungsverzeichnis.knoten.find((k) => k.art === 'titel' && k.ordnungszahl === '02');
    const zu = preisspiegelAnsicht(eingang({ zugeklappt: new Set([titel?.id ?? '']) }));
    expect(zu.zeilen.find((z) => z.id === titel?.id)?.aufgeklappt).toBe(false);
    expect(zu.zeilen.some((z) => z.id === positionsId('02.0010'))).toBe(false);
    expect(zu.zeilen.some((z) => z.id === positionsId('03.0010'))).toBe(true);
  });
});

describe('Detailleiste: aktive Zelle in Worten', () => {
  const eingang: AnsichtEingang = {
    lv,
    anbieter,
    preisspiegel: preisspiegelRechnen(lv, anbieter),
    wahl: STANDARD_WAHL,
    zugeklappt: new Set(),
  };

  it('Ausreißer: Bieter, Position und die Erklärung mit Schwelle', () => {
    const d = zellDetail(eingang, {
      zeilenId: positionsId('02.0050'),
      spalte: `${angebotId('Bieter C')}:ep`,
    });
    expect(d.bieter).toBe('Bieter C');
    expect(d.position).toBe('02.0050 Fundamente betonieren');
    expect(d.wert).toBe('EP 253,350');
    expect(d.erklaerungen.join(' ')).toMatch(/^Ausreißer nach oben: mehr als 20,00 % über dem Mittel \d/);
  });

  it('nicht angeboten und Nullpreis in Worten', () => {
    const b = zellDetail(eingang, {
      zeilenId: positionsId('03.0070'),
      spalte: `${angebotId('Bieter B')}:gp`,
    });
    expect(b.erklaerungen).toContain(
      'Nicht angeboten: Der Bieter hat zu dieser Position keinen Preis abgegeben.',
    );
    const c = zellDetail(eingang, {
      zeilenId: positionsId('03.0080'),
      spalte: `${angebotId('Bieter C')}:ep`,
    });
    expect(c.erklaerungen.some((t) => t.startsWith('Nullpreis'))).toBe(true);
  });

  it('Summenzeile und virtueller Bieter', () => {
    const r = zellDetail(eingang, { zeilenId: 'summe:rang', spalte: `${angebotId('Bieter A')}:gp` });
    expect(r).toMatchObject({ bieter: 'Bieter A', position: 'Rang', wert: 'Rang 1' });
    const m = zellDetail(eingang, { zeilenId: positionsId('01.0010'), spalte: 'mittel:ep' });
    expect(m.bieter).toBe('Mittel');
    expect(m.erklaerungen[0]).toMatch(/^Virtueller Bieter Mittel/);
  });

  it('Gliederung: Titelsumme des Bieters wie die Fixture', () => {
    const titel = lv.leistungsverzeichnis.knoten.find((k) => k.art === 'titel' && k.ordnungszahl === '02');
    const a = eingelesen.find((e) => e.name === 'Bieter A');
    const d = zellDetail(eingang, { zeilenId: titel?.id ?? '', spalte: `${angebotId('Bieter A')}:gp` });
    expect(d).toMatchObject({
      bieter: 'Bieter A',
      position: '02 Erd- und Betonarbeiten',
      wert: `GP ${betragDe(a?.fx.titel['02'] ?? '')}`,
    });
  });

  it('Zelle ohne Bieter: nur die Position, ABC-Klasse erklärt', () => {
    const d = zellDetail(eingang, { zeilenId: positionsId('02.0060'), spalte: 'abc' });
    expect(d.bieter).toBeNull();
    expect(d.erklaerungen.some((t) => t.startsWith('ABC-Klasse'))).toBe(true);
  });
});
