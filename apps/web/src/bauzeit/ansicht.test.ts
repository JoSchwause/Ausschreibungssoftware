// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 118: Ansicht des Bauzeitenplans (Grid-Zeilen, Balken, Kopfzeile, Befunde) auf dem Plan aus `fixtures/bauzeit.json`.
// Die erwarteten Texte folgen aus den Sollwerten der Fixture (Ticket 112, von Hand hergeleitet), in de-DE geschrieben.

import { readFileSync } from 'node:fs';
import { BAUZEIT_ANNAHMEN, BAUZEITBEFUNDE, bauzeitenplanBerechnen } from '@tethys/bauzeit';
import type { Bauzeitenplan, Bundesland, Prozent, Pruefbefund, VorgangId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { befundEintraege, planAnsicht } from './ansicht';

const fx = JSON.parse(
  readFileSync(new URL('../../../../fixtures/bauzeit.json', import.meta.url), 'utf8'),
) as {
  plan: Bauzeitenplan;
};
const plan = fx.plan;
const ergebnis = bauzeitenplanBerechnen(plan);
const id = (n: string): VorgangId => `019b7a12-b000-7000-8000-0000000000${n}` as VorgangId;

const zelle = (a: ReturnType<typeof planAnsicht>, zeile: string, spalte: string): string | undefined =>
  a.zeilen.find((z) => z.id === zeile)?.zellen[spalte]?.text;

describe('Ansicht des Bauzeitenplans', () => {
  const a = planAnsicht(plan, ergebnis, new Set());

  it('Kopfzeile: Projektbeginn, Projektende, kritischer Weg über die Nummern', () => {
    expect(a.kopf).toEqual({
      projektbeginn: '02.11.2026',
      projektende: '24.11.2026',
      kritischerWeg: '1.1 → 1.2 → 1.3 → 2 → 3',
    });
  });

  it('Spalten: Nr., Vorgang, Dauer, Beginn, Ende, Gesamtpuffer und die Balkenspalte', () => {
    expect(a.spalten.map((s) => s.kopf)).toEqual([
      'Nr.',
      'Vorgang',
      'Dauer (AT)',
      'Beginn',
      'Ende',
      'Gesamtpuffer',
      'Zeitplan',
    ]);
  });

  it('Zeilen in Planreihenfolge mit Baum, Terminen und Puffer laut Soll', () => {
    expect(a.zeilen.map((z) => [z.id, z.tiefe, z.art, z.hatUnterknoten])).toEqual([
      [id('11'), 0, 'gliederung', true],
      [id('12'), 1, 'position', false],
      [id('13'), 1, 'position', false],
      [id('14'), 1, 'position', false],
      [id('15'), 0, 'position', false],
      [id('16'), 0, 'position', false],
      [id('17'), 0, 'position', false],
      [id('18'), 0, 'position', false],
    ]);
    const zeilen = a.zeilen.map((z) =>
      ['nummer', 'dauer', 'beginn', 'ende', 'puffer'].map((s) => zelle(a, z.id, s)),
    );
    expect(zeilen).toEqual([
      ['1', '', '02.11.2026', '13.11.2026', '0'],
      ['1.1', '4', '02.11.2026', '05.11.2026', '0'],
      ['1.2', '4', '04.11.2026', '09.11.2026', '0'],
      ['1.3', '5', '09.11.2026', '13.11.2026', '0'],
      ['2', 'Meilenstein', '16.11.2026', '16.11.2026', '0'],
      ['3', '6', '16.11.2026', '24.11.2026', '0'],
      ['4', '2', '12.11.2026', '13.11.2026', '4'],
      ['5', '3', '13.11.2026', '17.11.2026', '4'],
    ]);
  });

  it('kritische Vorgänge tragen das Kennzeichen, die übrigen nicht; der Meilenstein erklärt seine Lesart (D-63)', () => {
    const kritisch = a.zeilen
      .filter((z) => z.zellen['vorgang']?.kennzeichen?.includes('kritisch'))
      .map((z) => z.id);
    expect(kritisch).toEqual([id('11'), id('12'), id('13'), id('14'), id('15'), id('16')]);
    expect(a.zeilen.find((z) => z.id === id('15'))?.zellen['dauer']?.tooltip).toBe(
      BAUZEIT_ANNAHMEN.meilenstein,
    );
  });

  it('Balken: Tagesindex ab dem Projektbeginn, Ende exklusiv, Meilenstein ohne Breite', () => {
    const achse = a.spalten.at(-1)?.zeitleiste;
    // Achse ab Mo 02.11.2026; freie Tage: Wochenenden und Buß- und Bettag (Index 16)
    expect(achse?.freieTage?.slice(0, 5)).toEqual([5, 6, 12, 13, 16]);
    expect(achse?.kopf[0]?.text).toBe('November 2026');
    expect(achse?.unterkopf?.[0]).toEqual({ text: 'KW 45', vonTag: 0, bisTag: 7 });
    expect(achse?.markierungen).toEqual([
      { tag: 23, art: 'projektende', beschreibung: 'Projektende 24.11.2026' },
    ]);
    const balken = (n: string) => a.zeilen.find((z) => z.id === id(n))?.zellen['balken']?.balken;
    expect(balken('11')).toMatchObject({ vonTag: 0, bisTag: 12, art: 'sammelvorgang', kritisch: true });
    expect(balken('13')).toMatchObject({ vonTag: 2, bisTag: 8, art: 'vorgang', kritisch: true });
    expect(balken('15')).toMatchObject({ vonTag: 14, bisTag: 14, art: 'meilenstein' });
    expect(balken('17')).toMatchObject({ vonTag: 10, bisTag: 12, kritisch: false });
    expect(balken('17')?.beschreibung).toBe(
      '12.11.2026 bis 13.11.2026, 2 Arbeitstage, Gesamtpuffer 4 Arbeitstage',
    );
    expect(balken('15')?.beschreibung).toBe('Meilenstein am 16.11.2026, kritisch');
  });

  it('Zugeklappter Sammelvorgang verbirgt seine Kinder', () => {
    const zu = planAnsicht(plan, ergebnis, new Set([id('11')]));
    expect(zu.zeilen.map((z) => z.id)).toEqual([id('11'), id('15'), id('16'), id('17'), id('18')]);
    expect(zu.zeilen[0]?.aufgeklappt).toBe(false);
  });

  it('Ist-Termine und Fortschritt als zweiter Balken bzw. Anteil', () => {
    const mitIst: Bauzeitenplan = {
      ...plan,
      vorgaenge: plan.vorgaenge.map((v) =>
        v.id === id('12')
          ? { ...v, ist: { beginn: '2026-11-03', ende: '2026-11-06', fortschritt: '50.00' as never } }
          : v,
      ),
    };
    const b = planAnsicht(mitIst, bauzeitenplanBerechnen(mitIst), new Set()).zeilen.find(
      (z) => z.id === id('12'),
    )?.zellen['balken']?.balken;
    expect(b?.ist).toEqual({ vonTag: 1, bisTag: 5 });
    expect(b?.fortschritt).toBe(50);
  });

  it('Befunde je Schwere mit Ort am Vorgang (Sprungziel)', () => {
    const zyklus: Bauzeitenplan = {
      ...plan,
      vorgaenge: plan.vorgaenge.map((v) =>
        v.id === id('12')
          ? { ...v, vorgaenger: [{ vorgaengerId: id('13'), art: 'ende-anfang', abstand: 0 }] }
          : v,
      ),
    };
    const b = planAnsicht(zyklus, bauzeitenplanBerechnen(zyklus), new Set());
    const fehler = b.befunde.find((g) => g.schwere === 'fehler')?.eintraege ?? [];
    expect(fehler.map((e) => [e.befund.code, e.ort, e.vorgangId])).toEqual([
      ['zyklus', '1.1 Erdarbeiten', id('12')],
      ['zyklus', '1.2 Streifenfundamente', id('13')],
    ]);
    // ohne Termine: Striche
    expect(zelle(b, id('12'), 'beginn')).toBe('–');
  });
});

/** Eine Kennung der App (UUID, A7): Sie gehört nie in einen Befundtext (L1). */
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
/** Eine Zahl in kanonischer Form (`120.00`); Nummern wie `1.2` sind keine Zahl (N4). */
const KANONISCHE_ZAHL = /(?<![\d.])\d+\.\d{2,3}(?![\d.,])/;

describe('Befundtexte der Terminrechnung für Planseite und PDF (Ticket 122, N4)', () => {
  const mit = (aendern: (v: Bauzeitenplan['vorgaenge'][number]) => Bauzeitenplan['vorgaenge'][number]) =>
    plan.vorgaenge.map(aendern);
  const fehlerhaft: Bauzeitenplan = {
    ...plan,
    kalender: { ...plan.kalender, bundesland: 'XX' as Bundesland },
    vorgaenge: mit((v) => {
      if (v.id === id('11')) return { ...v, fruehesterBeginn: '2026-11-03' };
      if (v.id === id('12'))
        return { ...v, ist: { beginn: null, ende: null, fortschritt: '120.00' as Prozent } };
      if (v.id === id('13'))
        return {
          ...v,
          vorgaenger: [...v.vorgaenger, { vorgaengerId: id('11'), art: 'ende-anfang', abstand: 0 }],
        };
      if (v.id === id('16'))
        return {
          ...v,
          vorgaenger: [
            ...v.vorgaenger,
            {
              vorgaengerId: '019b7a12-b000-7000-8000-0000000000ff' as VorgangId,
              art: 'ende-anfang',
              abstand: 0,
            },
          ],
        };
      if (v.id === id('17')) return { ...v, dauer: 2.5 };
      if (v.id === id('18'))
        return { ...v, vorgaenger: [{ vorgaengerId: id('16'), art: 'ende-ende', abstand: 1.5 }] };
      return v;
    }),
  };
  const ergebnisFehlerhaft = bauzeitenplanBerechnen(fehlerhaft);
  const eintraege = befundEintraege(fehlerhaft, ergebnisFehlerhaft);

  it('jede Meldung wird ein de-DE-Text: keine Kennung, keine kanonische Zahl; Vorgänge über Nummer und Bezeichnung', () => {
    const codes = new Set(ergebnisFehlerhaft.befunde.map((b) => b.code));
    for (const c of [
      'bundesland-unbekannt',
      'terminvorgabe-an-sammelvorgang',
      'ist-ungueltig',
      'beziehung-an-sammelvorgang',
      'vorgaenger-unbekannt',
      'dauer-ungueltig',
      'abstand-ungueltig',
    ])
      expect(codes, c).toContain(c);
    const meldungen = ergebnisFehlerhaft.befunde.map((b) => b.meldung).join(' ');
    expect(meldungen).toMatch(UUID);
    expect(meldungen).toMatch(KANONISCHE_ZAHL);
    expect(eintraege).toHaveLength(ergebnisFehlerhaft.befunde.length);
    for (const e of eintraege) {
      expect(e.text, e.befund.meldung).not.toBe(e.befund.meldung);
      expect(`${e.ort ?? ''} ${e.text}`, e.befund.meldung).not.toMatch(UUID);
      expect(`${e.ort ?? ''} ${e.text}`, e.befund.meldung).not.toMatch(KANONISCHE_ZAHL);
    }
  });

  it('eine Anordnungsbeziehung nennt ihren Vorgänger mit Nummer und Bezeichnung; das Land steht im Text', () => {
    const zu = (code: string) => eintraege.find((e) => e.befund.code === code);
    expect(zu('beziehung-an-sammelvorgang')?.ort).toBe('1.2 Streifenfundamente');
    expect(zu('beziehung-an-sammelvorgang')?.text).toContain('1 Gründung');
    expect(zu('vorgaenger-unbekannt')?.ort).toBe('3 Mauerwerk Erdgeschoss');
    expect(zu('bundesland-unbekannt')?.ort).toBeNull();
    expect(zu('bundesland-unbekannt')?.text).toContain('„XX“');
  });

  it('die Planseite zeigt dieselben Einträge (Gruppen je Schwere)', () => {
    const a = planAnsicht(fehlerhaft, ergebnisFehlerhaft, new Set());
    expect(
      a.befunde
        .flatMap((g) => g.eintraege)
        .map((e) => e.text)
        .sort(),
    ).toEqual(eintraege.map((e) => e.text).sort());
  });

  it('jeder Code der Rechnung hat einen eigenen Text (die Meldung erscheint nie)', () => {
    for (const code of Object.keys(BAUZEITBEFUNDE)) {
      const roh: Pruefbefund = {
        schwere: 'warnung',
        quelle: 'terminrechnung',
        code,
        meldung: `Meldung ${code} 019b7a12-b000-7000-8000-0000000000ff 12.50`,
        ort: { vorgangId: id('13'), feld: 'vorgaenger', pfad: '/vorgaenge[3]/vorgaenger[1]' },
      };
      const [e] = befundEintraege(plan, { ...ergebnis, befunde: [roh] });
      expect(e?.text, code).toBeDefined();
      expect(e?.text, code).not.toContain('Meldung');
      expect(e?.text, code).not.toMatch(UUID);
      expect(e?.ort, code).toBe('1.2 Streifenfundamente');
    }
  });
});
