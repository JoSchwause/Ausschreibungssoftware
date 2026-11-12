// SPDX-License-Identifier: AGPL-3.0-or-later
// Eigenschaften der Befehle an Mangel und Bautagebucheintrag (Ticket 111 Punkt 5, Q1): Die Umkehrung jedes angenommenen
// Befehls stellt den Zustand wieder her; ein angenommener Mangel hat immer einen Verlauf nach der Statustabelle mit nicht
// fallenden Daten; ein angenommener Eintrag kollidiert mit keinem Datum des Bestands. Zufällige Zustände, Bestände und
// Befehle, auch abgewiesene.

import type {
  Bautagebucheintrag,
  BautagebucheintragBefehl,
  BautagebucheintragZustand,
  Mangel,
  MangelBefehl,
  Mangelstatus,
  Mangelverlaufseintrag,
  MangelZustand,
} from '@tethys/vertrag';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  MANGELSTATUSWECHSEL,
  bautagebucheintragBefehlAusfuehren,
  bautagebucheintragChangeSetAnwenden,
  bautagebucheintragChangeSetUmkehren,
  mangelBefehlAusfuehren,
  mangelChangeSetAnwenden,
  mangelChangeSetUmkehren,
  statuswechselZulaessig,
} from './index';
import { GLOBAL_ID, POSITION, eintrag, eintragId, mangel, mangelId } from './testhilfen';

const runs = { numRuns: 400 };

// Tage im November 2026 und ein paar ungültige.
const tagGen = fc.integer({ min: 1, max: 30 }).map((t) => `2026-11-${String(t).padStart(2, '0')}`);
const datumGen = fc.oneof(
  { weight: 9, arbitrary: tagGen },
  { weight: 1, arbitrary: fc.constantFrom('2026-11-31', '', '1.11.2026') },
);
const statusGen = fc.constantFrom<Mangelstatus>('offen', 'angezeigt', 'beseitigt', 'abgenommen');
const textGen = fc.option(fc.constantFrom('', 'Riss', 'Achse B'), { nil: null });

/** Ein gültiger Verlauf: Regelweg samt Rückweg, Daten nicht fallend ab `start`. */
const verlaufGen: fc.Arbitrary<Mangelverlaufseintrag[]> = fc
  .tuple(fc.array(fc.integer({ min: 0, max: 1 }), { maxLength: 6 }), fc.integer({ min: 1, max: 10 }))
  .map(([wahl, start]) => {
    const verlauf: Mangelverlaufseintrag[] = [];
    let tag = start;
    let status: Mangelstatus = 'offen';
    verlauf.push({ status, datum: `2026-11-${String(tag).padStart(2, '0')}`, bemerkung: null });
    for (const w of wahl) {
      const ziele: readonly Mangelstatus[] = MANGELSTATUSWECHSEL[status];
      const ziel: Mangelstatus | undefined = ziele[w % Math.max(ziele.length, 1)];
      if (ziel === undefined) break;
      status = ziel;
      tag = Math.min(tag + w, 30);
      verlauf.push({
        status,
        datum: `2026-11-${String(tag).padStart(2, '0')}`,
        bemerkung: w ? 'Bemerkung' : null,
      });
    }
    return verlauf;
  });

const mangelGen: fc.Arbitrary<Mangel> = fc
  .tuple(
    fc.integer({ min: 1, max: 5 }),
    verlaufGen,
    fc.option(tagGen, { nil: null }),
    fc.boolean(),
    fc.boolean(),
  )
  .map(([nummer, verlauf, frist, mitPosition, mitBauteil]) =>
    mangel(nummer, {
      verlauf,
      festgestellt: verlauf[0]?.datum ?? '2026-11-01',
      frist,
      positionId: mitPosition ? POSITION : null,
      bauteil: mitBauteil ? { bauwerksmodellId: null, globalId: GLOBAL_ID } : null,
    }),
  );

const zustandGen: fc.Arbitrary<MangelZustand | null> = fc.option(
  mangelGen.map((m) => ({ mangel: m })),
  { nil: null },
);
const bestandGen = fc
  .uniqueArray(fc.integer({ min: 1, max: 6 }), { maxLength: 4 })
  .map((nummern) => nummern.map((n, i) => ({ id: mangelId(10 + i), nummer: n })));

const mangelBefehlGen: fc.Arbitrary<MangelBefehl> = fc.oneof(
  fc.tuple(mangelGen, fc.option(statusGen, { nil: undefined })).map(([m, erster]): MangelBefehl => ({
    art: 'MangelAnlegen',
    mangel:
      erster === undefined
        ? m
        : {
            ...m,
            verlauf: [{ status: erster, datum: m.festgestellt, bemerkung: null }, ...m.verlauf.slice(1)],
          },
  })),
  fc
    .tuple(textGen, textGen, datumGen, fc.option(datumGen, { nil: null }), fc.boolean())
    .map(([beschreibung, ort, festgestellt, frist, ohneLv]): MangelBefehl => ({
      art: 'MangelangabenSetzen',
      titel: 'Neuer Titel',
      beschreibung,
      ort,
      auftragsLvId: ohneLv ? null : mangel(1).auftragsLvId,
      positionId: null,
      bauteil: null,
      festgestellt,
      frist,
    })),
  fc
    .tuple(statusGen, datumGen, textGen, fc.option(datumGen, { nil: undefined }))
    .map(([status, datum, bemerkung, frist]): MangelBefehl => ({
      art: 'MangelstatusSetzen',
      eintrag: frist === undefined ? { status, datum, bemerkung } : { status, datum, bemerkung, frist },
    })),
  fc.constant<MangelBefehl>({ art: 'MangelLoeschen' }),
);

describe('Eigenschaften der Mangelbefehle', () => {
  it('anwenden ∘ umkehren = Identität für jeden angenommenen Befehl; umkehren ist eine Involution', () => {
    fc.assert(
      fc.property(zustandGen, mangelBefehlGen, bestandGen, (zustand, befehl, bestand) => {
        const antwort = mangelBefehlAusfuehren(zustand, befehl, bestand);
        if (!antwort.ok) return;
        const cs = antwort.wert;
        expect(cs.mangel.vorher).toEqual(zustand?.mangel ?? null);
        const nachher = mangelChangeSetAnwenden(zustand, cs);
        expect(mangelChangeSetAnwenden(nachher, mangelChangeSetUmkehren(cs))).toEqual(zustand);
        expect(mangelChangeSetUmkehren(mangelChangeSetUmkehren(cs))).toEqual(cs);
      }),
      runs,
    );
  });

  it('ein angenommener Mangel hat einen Verlauf nach der Statustabelle, nicht fallend, ab der Feststellung, Frist nur bei angezeigt; angelegt mit freier Nummer', () => {
    fc.assert(
      fc.property(zustandGen, mangelBefehlGen, bestandGen, (zustand, befehl, bestand) => {
        const antwort = mangelBefehlAusfuehren(zustand, befehl, bestand);
        if (!antwort.ok || antwort.wert.mangel.nachher === null) return;
        const m = antwort.wert.mangel.nachher;
        let vorher: Mangelverlaufseintrag | null = null;
        for (const e of m.verlauf) {
          expect(statuswechselZulaessig(vorher?.status ?? null, e.status)).toBe(true);
          expect(e.datum >= (vorher?.datum ?? m.festgestellt)).toBe(true);
          if (e.frist !== undefined) expect(e.status).toBe('angezeigt');
          vorher = e;
        }
        // Die Nummer prüft nur das Anlegen; danach ist sie fest (der Bestand des Generators passt nicht zum Zustand).
        if (befehl.art === 'MangelAnlegen')
          expect(bestand.some((b) => b.id !== m.id && b.nummer === m.nummer)).toBe(false);
      }),
      runs,
    );
  });
});

// --- Bautagebuch -------------------------------------------------------------------------------------------------------

const temperaturGen = fc.option(fc.oneof(fc.integer({ min: -20, max: 35 }), fc.constant(0.5)), { nil: null });
const eintragGen = (n: number): fc.Arbitrary<Bautagebucheintrag> =>
  fc
    .tuple(
      datumGen,
      temperaturGen,
      temperaturGen,
      fc.uniqueArray(
        fc.record({
          firma: fc.constantFrom('Rohbau', 'Tiefbau', 'Elektro', ''),
          anzahl: fc.integer({ min: -1, max: 9 }),
        }),
        { selector: (a) => a.firma, maxLength: 3 },
      ),
      textGen,
    )
    .map(([datum, temperaturMin, temperaturMax, arbeitskraefte, leistungen]) =>
      eintrag(n, datum, {
        wetter: { beschreibung: null, temperaturMin, temperaturMax },
        arbeitskraefte,
        leistungen,
      }),
    );
/** Ein gespeicherter Eintrag: in Form (wie nach einem Ausführer). */
const gespeichertGen = fc
  .tuple(tagGen, fc.integer({ min: 0, max: 9 }))
  .map(([datum, anzahl]) => eintrag(1, datum, { arbeitskraefte: [{ firma: 'Rohbau', anzahl }] }));
const tagebuchZustandGen: fc.Arbitrary<BautagebucheintragZustand | null> = fc.option(
  gespeichertGen.map((e) => ({ bautagebucheintrag: e })),
  { nil: null },
);
const tagebuchBestandGen = fc
  .uniqueArray(tagGen, { maxLength: 5 })
  .map((tage) => tage.map((datum, i) => ({ id: eintragId(10 + i), datum })));
const tagebuchBefehlGen: fc.Arbitrary<BautagebucheintragBefehl> = fc.oneof(
  fc
    .oneof(eintragGen(1), eintragGen(2))
    .map((e): BautagebucheintragBefehl => ({ art: 'BautagebucheintragSetzen', eintrag: e })),
  fc.constant<BautagebucheintragBefehl>({ art: 'BautagebucheintragLoeschen' }),
);

describe('Eigenschaften der Bautagebuchbefehle', () => {
  it('anwenden ∘ umkehren = Identität für jeden angenommenen Befehl; kein angenommenes Datum ist doppelt', () => {
    fc.assert(
      fc.property(tagebuchZustandGen, tagebuchBefehlGen, tagebuchBestandGen, (zustand, befehl, bestand) => {
        const antwort = bautagebucheintragBefehlAusfuehren(zustand, befehl, bestand);
        if (!antwort.ok) return;
        const cs = antwort.wert;
        expect(cs.bautagebucheintrag.vorher).toEqual(zustand?.bautagebucheintrag ?? null);
        const nachher = bautagebucheintragChangeSetAnwenden(zustand, cs);
        expect(bautagebucheintragChangeSetAnwenden(nachher, bautagebucheintragChangeSetUmkehren(cs))).toEqual(
          zustand,
        );
        expect(bautagebucheintragChangeSetUmkehren(bautagebucheintragChangeSetUmkehren(cs))).toEqual(cs);
        const neu = cs.bautagebucheintrag.nachher;
        if (neu !== null) {
          expect(bestand.some((b) => b.id !== neu.id && b.datum === neu.datum)).toBe(false);
          expect(neu.arbeitskraefte.every((a) => Number.isSafeInteger(a.anzahl) && a.anzahl >= 0)).toBe(true);
        }
      }),
      runs,
    );
  });
});
