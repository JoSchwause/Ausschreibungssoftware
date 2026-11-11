// SPDX-License-Identifier: AGPL-3.0-or-later
// Formale LV-Prüfung (K8, Ticket 41) über Befehle und Fixtures: Handeingabe wird angenommen und gemeldet (U5), Golden-
// Dateien je Fixture, Determinismus, Property-Test „kein Befehl wird wegen einer Regel abgewiesen“, Leistungsbudget.
//
// Golden-Dateien liegen unter `packages/kern/testdaten/golden/` (eine Zeile je Befund). Aktualisieren nach einer gewollten
// Änderung der Regeln:
//
//   GOLDEN_UPDATE=1 pnpm vitest run packages/kern/src/lv-pruefung-fixtures.test.ts
//
// Danach `git diff packages/kern/testdaten/golden` prüfen: jede Zeile ist ein Befund, jede Änderung eine Entscheidung.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type {
  Betrag,
  LeistungsverzeichnisId,
  LvBefehl,
  LvZustand,
  Menge,
  Ordnungszahl,
  OzMaske,
  Position,
} from '@tethys/vertrag';
import { lvBefehlAusfuehren, lvPruefen } from './index';
import { KNOTEN_REGELN, LV_REGELN } from './pruefregeln';
import {
  PROJEKT_ID,
  anwenden,
  erwarteOk,
  fixtureAlsInhalt,
  fixtureLesen,
  id,
  lvMit,
  posKnoten,
  titelKnoten,
} from './testhilfen';
import type { FixtureName } from './testhilfen';

const HIER = dirname(fileURLToPath(import.meta.url));
const GOLDEN = join(HIER, '..', 'testdaten', 'golden');
const AKTUALISIEREN = process.env['GOLDEN_UPDATE'] === '1';

/**
 * Die OZ-Maske der Fixture aus ihrem Maskentext (`fixtures/README.md`: vor dem ersten `:` stehen die Stellen, `N` Ziffer,
 * `[I]` ein Indexbuchstabe, `.` trennt). `fixtureAlsInhalt` setzt stattdessen eine Standardmaske ohne Index; für die
 * Golden-Dateien zählt die Maske der Fixture.
 */
function maskeAusText(text: string): OzMaske {
  const stellen = (text.split(':')[0] ?? '').trim();
  const mitIndex = stellen.endsWith('[I]');
  const gruppen = stellen.replace('[I]', '').split('.');
  const num = (g: string) => ({ laenge: g.length, zeichen: 'numerisch' as const });
  return {
    gliederung: gruppen.slice(0, -1).map(num),
    position: num(gruppen[gruppen.length - 1] ?? ''),
    index: mitIndex ? { laenge: 1, zeichen: 'alphanumerisch' } : null,
    trennzeichen: '.',
  };
}

function fixtureZustand(name: FixtureName): LvZustand {
  const fx = fixtureLesen(name);
  const maske = maskeAusText((fx as unknown as { ozMaske: string }).ozMaske);
  return anwenden(
    null,
    erwarteOk(
      lvBefehlAusfuehren(null, {
        art: 'LeistungsverzeichnisAnlegen',
        id: fx.id as LeistungsverzeichnisId,
        projektId: PROJEKT_ID,
        inhalt: { ...fixtureAlsInhalt(fx), ozMaske: maske },
      }),
    ),
  );
}

const FIXTURES: readonly FixtureName[] = ['winzig', 'typisch', 'gross', 'zuschlag'];
const ZUSTAENDE = new Map(FIXTURES.map((n) => [n, fixtureZustand(n)]));
const zustand = (n: FixtureName): LvZustand => {
  const z = ZUSTAENDE.get(n);
  if (!z) throw new Error(n);
  return z;
};

/** Alle Codes, die die Prüfung liefern kann (Regeln plus `oz-maske-ungueltig` aus `maskePruefen`). */
const CODES = new Set([
  ...LV_REGELN.map((r) => r.code),
  ...KNOTEN_REGELN.map((r) => r.code),
  'oz-maske-ungueltig',
]);

describe('Handeingabe wird angenommen und gemeldet (U5)', () => {
  it('doppelte OZ aus OrdnungszahlSetzen: angenommen, oz-doppelt an beiden Knoten', () => {
    const z0 = lvMit([
      { ...titelKnoten('T1', 'lv-test', 0), ordnungszahl: '01' as Ordnungszahl },
      posKnoten('P1', 'T1', 0, '1.000', '1.000', { ordnungszahl: '01.0010' as Ordnungszahl }),
      posKnoten('P2', 'T1', 1, '1.000', '1.000', { ordnungszahl: '01.0020' as Ordnungszahl }),
    ]);
    const e = lvBefehlAusfuehren(z0, {
      art: 'OrdnungszahlSetzen',
      knotenId: id.pos('P2'),
      ordnungszahl: '01.0010' as Ordnungszahl,
      ozIndex: null,
    });
    expect(e.ok).toBe(true);
    const z = anwenden(z0, erwarteOk(e));
    expect(lvPruefen(z).filter((b) => b.code === 'oz-doppelt')).toEqual([
      expect.objectContaining({ schwere: 'fehler', ort: { knotenId: 'P1', feld: 'ordnungszahl' } }),
      expect.objectContaining({ schwere: 'fehler', ort: { knotenId: 'P2', feld: 'ordnungszahl' } }),
    ]);
  });

  it('Absolutnachlass über dem Netto: angenommen, Befund netto-nach-nachlass-negativ', () => {
    const z0 = zustand('winzig');
    const e = lvBefehlAusfuehren(z0, {
      art: 'NachlassSetzen',
      nachlass: { art: 'betrag', wert: '99999999.00' as Betrag },
    });
    expect(e.ok).toBe(true);
    const z = anwenden(z0, erwarteOk(e));
    expect(lvPruefen(z).filter((b) => b.code === 'netto-nach-nachlass-negativ')).toEqual([
      {
        schwere: 'fehler',
        quelle: 'lv-pruefung',
        code: 'netto-nach-nachlass-negativ',
        meldung: expect.any(String) as string,
        ort: { feld: 'nachlass' },
      },
    ]);
    expect(lvPruefen(z0).some((b) => b.code === 'netto-nach-nachlass-negativ')).toBe(false);
  });
});

// --- Golden ------------------------------------------------------------------------------------------------------

const alsZeilen = (befunde: readonly unknown[]): string =>
  befunde.map((b) => JSON.stringify(b)).join('\n') + '\n';

describe('Golden: lvPruefen über die Fixtures', () => {
  it('die Masken der Fixtures sind gültig (sonst prüfte die Prüfung die OZ nicht)', () => {
    for (const name of FIXTURES)
      expect(lvPruefen(zustand(name)).filter((b) => b.code === 'oz-maske-ungueltig')).toEqual([]);
  });

  it.each(FIXTURES)('%s', (name) => {
    const pfad = join(GOLDEN, `lv-pruefung-${name}.golden.jsonl`);
    const ist = alsZeilen(lvPruefen(zustand(name)));
    if (AKTUALISIEREN) {
      mkdirSync(GOLDEN, { recursive: true });
      writeFileSync(pfad, ist);
    }
    expect(existsSync(pfad), `Golden fehlt: ${pfad} (GOLDEN_UPDATE=1 setzen)`).toBe(true);
    expect(ist).toBe(readFileSync(pfad, 'utf8'));
  });

  // Ticket 51: Fixture-Format, mechanisch. Die Fixtures tragen keine Altform mehr (GAEB-Form); die Regel selbst prüft
  // `lv-pruefung.test.ts` („zuschlag-altform: ohne Satz, mit Menge und EP; mit Satz nicht“).
  it.each(FIXTURES)('%s: jede Zuschlagsposition trägt einen Satz, keine meldet die Altform', (name) => {
    const z = zustand(name);
    const ohneSatz = z.leistungsverzeichnis.knoten.filter(
      (k): k is Position => k.art === 'position' && k.zuschlag !== null && k.zuschlag.prozentsatz === null,
    );
    expect(ohneSatz).toEqual([]);
    expect(lvPruefen(z).filter((b) => b.code === 'zuschlag-altform')).toEqual([]);
  });
});

// --- Determinismus und U5 ----------------------------------------------------------------------------------------

describe('Determinismus', () => {
  it('gleiche Eingabe, gleiche Befunde in gleicher Reihenfolge; der Zustand bleibt unverändert', () => {
    for (const name of FIXTURES) {
      const z = zustand(name);
      const vorher = JSON.stringify(z);
      expect(lvPruefen(z)).toEqual(lvPruefen(structuredClone(z)));
      expect(JSON.stringify(z)).toBe(vorher);
    }
  });
});

type Aktion =
  | { art: 'kurztext'; ziel: number; text: string }
  | { art: 'einheit'; ziel: number; text: string }
  | { art: 'menge'; ziel: number; menge: string | null }
  | { art: 'oz'; ziel: number; quelle: number }
  | { art: 'name'; text: string }
  | { art: 'nachlass'; wert: string };

/** Texte, die Regeln auslösen: leer, Leerraum, Umbruch, Steuerzeichen, lang. */
const textArb = fc.oneof(
  fc.constantFrom('', ' ', 'a\nb', 'x\u0007', 'Stück', 'm', 'eine sehr lange Bezeichnung des LV'),
  fc.string({ maxLength: 30 }),
);
const mengeArb = fc.oneof(
  fc.constantFrom(null, '0.000', '1.000', '123456789.000', '-5.000'),
  fc.integer({ min: 0, max: 10_000_000 }).map((n) => `${String(n)}.000`),
);

const aktionArb: fc.Arbitrary<Aktion> = fc.oneof(
  fc.record({ art: fc.constant('kurztext' as const), ziel: fc.nat(), text: textArb }),
  fc.record({ art: fc.constant('einheit' as const), ziel: fc.nat(), text: textArb }),
  fc.record({ art: fc.constant('menge' as const), ziel: fc.nat(), menge: mengeArb }),
  fc.record({ art: fc.constant('oz' as const), ziel: fc.nat(), quelle: fc.nat() }),
  fc.record({ art: fc.constant('name' as const), text: textArb }),
  fc.record({
    art: fc.constant('nachlass' as const),
    wert: fc.integer({ min: 0, max: 1_000_000 }).map((n) => `${String(n)}.00`),
  }),
);

/** Ein Befehl zur Aktion: Ziele unter den Positionen ohne Zuschlag; doppelte OZ unter Geschwistern derselben Stufe. */
function befehl(z: LvZustand, a: Aktion): LvBefehl {
  const positionen = z.leistungsverzeichnis.knoten.filter(
    (k): k is Position => k.art === 'position' && k.zuschlag === null,
  );
  const ziel = (n: number): Position => {
    const p = positionen[n % positionen.length];
    if (!p) throw new Error('keine Position');
    return p;
  };
  switch (a.art) {
    case 'kurztext':
      return { art: 'KurztextAendern', knotenId: ziel(a.ziel).id, kurztext: a.text };
    case 'einheit':
      return { art: 'EinheitAendern', positionId: ziel(a.ziel).id, einheit: a.text };
    case 'menge':
      return { art: 'MengeAendern', positionId: ziel(a.ziel).id, menge: a.menge as Menge | null };
    case 'oz': {
      const p = ziel(a.ziel);
      const geschwister = positionen.filter((q) => q.elternId === p.elternId && q.ordnungszahl !== null);
      const quelle = geschwister[a.quelle % Math.max(1, geschwister.length)] ?? p;
      return {
        art: 'OrdnungszahlSetzen',
        knotenId: p.id,
        ordnungszahl: quelle.ordnungszahl,
        ozIndex: null,
      };
    }
    case 'name':
      return { art: 'LeistungsverzeichnisUmbenennen', name: a.text };
    case 'nachlass':
      return { art: 'NachlassSetzen', nachlass: { art: 'betrag', wert: a.wert as Betrag } };
  }
}

describe('Eigenschaft: kein Befehl wird wegen einer Regel abgewiesen (U5)', () => {
  it('Befehle, die Befunde auslösen, werden angenommen; die Prüfung liefert nur bekannte Codes, deterministisch', () => {
    const start = zustand('typisch');
    fc.assert(
      fc.property(fc.array(aktionArb, { minLength: 1, maxLength: 25 }), (aktionen) => {
        let z = start;
        for (const a of aktionen) {
          const b = befehl(z, a);
          const e = lvBefehlAusfuehren(z, b);
          // Einzige erlaubte Abweisung: negative Menge ist ein Formfehler (Skala/Wert), keine Prüfregel.
          if (!e.ok) {
            expect(a.art === 'menge' && (a.menge ?? '').startsWith('-'), JSON.stringify(e.fehler)).toBe(true);
            continue;
          }
          z = anwenden(z, e.wert);
        }
        const befunde = lvPruefen(z);
        for (const b of befunde) {
          expect(CODES.has(b.code), b.code).toBe(true);
          expect(b.quelle).toBe('lv-pruefung');
        }
        expect(lvPruefen(z)).toEqual(befunde);
      }),
      { numRuns: 60 },
    );
  });
});

// --- Leistung (Q4) -----------------------------------------------------------------------------------------------

const BUDGET_MS = 50;
const mitte = (w: readonly number[]): number => [...w].sort((a, b) => a - b)[Math.floor(w.length / 2)] ?? 0;

describe('Leistungsbudget (Q4)', () => {
  it(`lvPruefen(gross): warm, Median unter ${String(BUDGET_MS)} ms`, () => {
    const z = zustand('gross');
    const werte: number[] = [];
    for (let i = 0; i < 25; i++) {
      // Jede Runde ein neues Knotenarray, damit kein Index aus einem Cache die Messung verfälscht.
      const frisch: LvZustand = {
        ...z,
        leistungsverzeichnis: { ...z.leistungsverzeichnis, knoten: [...z.leistungsverzeichnis.knoten] },
      };
      const t0 = performance.now();
      lvPruefen(frisch);
      werte.push(performance.now() - t0);
    }
    const median = mitte(werte.slice(5));
    console.info(`lvPruefen(gross): Median ${median.toFixed(2)} ms`);
    expect(median).toBeLessThan(BUDGET_MS);
  });
});
