// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests (fast-check) für OZ-Vergabe, Umnummerieren und Maskenänderung (Ticket 06). Zuerst geschrieben (Q1).
//
// Zufällige Bäume aus Baumbefehlen (Titel bis Stufe 5, Positionen mit und ohne Indexbuchstabe, Hinweistexte, Verschieben,
// Löschen) unter Masken mit fünf Stufen. Es gilt:
//  - IDs, Baumstruktur und Array-Reihenfolge bleiben; `summen` bleiben dasselbe Objekt, das ChangeSet nennt keine Summen;
//  - die neue OZ jedes Knotens ist gleich der eines unabhängigen Orakels (Zähler je Elternknoten, Vorsilben der Eltern);
//  - alle OZ (mit Index) sind eindeutig und folgen der Baumordnung;
//  - das ChangeSet nennt genau die Knoten, deren OZ sich ändert; ein bereits kanonischer Baum ergibt ein leeres ChangeSet;
//  - Anwenden und Umkehrung stellen den Vorzustand exakt her;
//  - Teilbaum: nur die Nachfahren ändern sich, das Ergebnis gleicht dem Nummerieren des ganzen Baums;
//  - Maskenänderung: ein ChangeSet mit Kopf und Knoten, Hin- und Rückweg ergeben dieselbe OZ.

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Einfuegeort, Knoten, LvBefehl, LvChangeSet, LvZustand, OzMaske } from '@tethys/vertrag';
import { changeSetUmkehren, doppelteOrdnungszahlen, lvBefehlAusfuehren, pruefeLvInvarianten } from './index';
import {
  KEINE_SUMMEN,
  ohneReihenfolge,
  anwenden,
  LV_ID,
  PROJEKT_ID,
  erwarteOk,
  id,
  inhalt,
  positionsdaten,
} from './testhilfen';

const num = (laenge: number) => ({ laenge, zeichen: 'numerisch' as const });
const alnum = (laenge: number) => ({ laenge, zeichen: 'alphanumerisch' as const });

/** Fünf Stufen, 10 + 3 + 1 = 14 Stellen, mit Trennzeichen. */
const MASKE_A: OzMaske = {
  gliederung: [num(2), num(2), num(2), num(2), num(2)],
  position: num(3),
  index: alnum(1),
  trennzeichen: '.',
};
/** Wie A, aber ohne Trennzeichen und mit einer alphanumerischen Stufe 3. */
const MASKE_B: OzMaske = {
  gliederung: [num(2), num(2), alnum(2), num(2), num(2)],
  position: num(3),
  index: alnum(1),
  trennzeichen: null,
};
/** Fünf Stufen von 1 bis 2 Stellen, Position 4 Stellen, kein Index: wird nur zum Wechseln gebraucht. */
const MASKE_C: OzMaske = {
  gliederung: [num(3), num(2), num(1), num(1), num(1)],
  position: num(4),
  index: null,
  trennzeichen: '-',
};
const MASKEN: readonly OzMaske[] = [MASKE_A, MASKE_B];

interface OrtWahl {
  readonly art: 'nach' | 'anfang' | 'ende';
  readonly ziel: number;
}
type Aktion =
  | { readonly art: 'titel' | 'hinweis'; readonly ort: OrtWahl }
  | { readonly art: 'position'; readonly ort: OrtWahl; readonly index: boolean }
  | { readonly art: 'unterTitel'; readonly ziel: number; readonly position: boolean }
  | { readonly art: 'loeschen'; readonly knoten: number }
  | { readonly art: 'verschieben'; readonly knoten: number; readonly ort: OrtWahl };

const ortArb: fc.Arbitrary<OrtWahl> = fc.record({
  art: fc.constantFrom('nach', 'anfang', 'ende'),
  ziel: fc.nat(10_000),
});
const aktionArb: fc.Arbitrary<Aktion> = fc.oneof(
  { weight: 5, arbitrary: fc.record({ art: fc.constant('titel' as const), ort: ortArb }) },
  { weight: 1, arbitrary: fc.record({ art: fc.constant('hinweis' as const), ort: ortArb }) },
  {
    weight: 9,
    arbitrary: fc.record({ art: fc.constant('position' as const), ort: ortArb, index: fc.boolean() }),
  },
  {
    weight: 6,
    arbitrary: fc.record({
      art: fc.constant('unterTitel' as const),
      ziel: fc.nat(10_000),
      position: fc.boolean(),
    }),
  },
  { weight: 1, arbitrary: fc.record({ art: fc.constant('loeschen' as const), knoten: fc.nat(10_000) }) },
  {
    weight: 2,
    arbitrary: fc.record({ art: fc.constant('verschieben' as const), knoten: fc.nat(10_000), ort: ortArb }),
  },
);
const folgeArb = fc.array(aktionArb, { minLength: 5, maxLength: 40 });
/** Eindeutige Indexzeichen je Aktion, damit gleiche Buchstaben am selben Grundteil nicht zufällig vorkommen. */
const INDEXZEICHEN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function befehlAus(z: LvZustand, a: Aktion, nr: number): LvBefehl {
  const knoten = z.leistungsverzeichnis.knoten;
  const alle = [LV_ID as string, ...knoten.map((k) => k.id as string)];
  const knotenId = (n: number): string =>
    knoten.length === 0 ? 'gibt-es-nicht' : (knoten[n % knoten.length]?.id ?? 'x');
  const ort = (o: OrtWahl): Einfuegeort =>
    o.art === 'nach'
      ? { art: 'nach', knotenId: id.knoten(knotenId(o.ziel)) }
      : { art: o.art, elternId: id.eltern(alle[o.ziel % alle.length] ?? LV_ID) };
  const neu = `n${String(nr)}`;
  switch (a.art) {
    case 'titel':
      return {
        art: 'GliederungAnlegen',
        id: id.titel(neu),
        gliederungsart: 'titel',
        ort: ort(a.ort),
        kurztext: 'T',
      };
    case 'hinweis':
      return { art: 'HinweistextAnlegen', id: id.hinweis(neu), ort: ort(a.ort), text: [] };
    case 'position':
      return {
        art: 'PositionAnlegen',
        id: id.pos(neu),
        ort: ort(a.ort),
        daten: positionsdaten('P', {
          ozIndex: a.index ? (INDEXZEICHEN[nr % INDEXZEICHEN.length] ?? 'A') : null,
        }),
      };
    case 'unterTitel': {
      const titel = knoten.filter((k) => k.art === 'titel');
      const eltern = id.eltern(titel[a.ziel % Math.max(titel.length, 1)]?.id ?? LV_ID);
      const ende: Einfuegeort = { art: 'ende', elternId: eltern };
      return a.position
        ? { art: 'PositionAnlegen', id: id.pos(neu), ort: ende, daten: positionsdaten('P') }
        : { art: 'GliederungAnlegen', id: id.titel(neu), gliederungsart: 'titel', ort: ende, kurztext: 'T' };
    }
    case 'loeschen':
      return { art: 'KnotenLoeschen', knotenId: id.knoten(knotenId(a.knoten)) };
    case 'verschieben':
      return { art: 'KnotenVerschieben', knotenId: id.knoten(knotenId(a.knoten)), ziel: ort(a.ort) };
  }
}

function bauen(maske: OzMaske, folge: readonly Aktion[]): LvZustand {
  let z = anwenden(
    null,
    erwarteOk(
      lvBefehlAusfuehren(null, {
        art: 'LeistungsverzeichnisAnlegen',
        id: LV_ID,
        projektId: PROJEKT_ID,
        inhalt: { ...inhalt([]), ozMaske: maske },
      }),
    ),
  );
  folge.forEach((a, nr) => {
    const e = lvBefehlAusfuehren(z, befehlAus(z, a, nr));
    if (e.ok) z = anwenden(z, e.wert);
  });
  return z;
}

// --- Unabhängiges Orakel -------------------------------------------------------------------------------------------

/** Erwartete OZ je Knoten: Zähler je Elternknoten, Vorsilben aus den Teilen der Eltern. */
function orakel(
  z: LvZustand,
  maske: OzMaske,
  wurzel: string = LV_ID,
  vorsilbe: string[] = [],
): Map<string, string> {
  const kinder = new Map<string, Knoten[]>();
  for (const k of z.leistungsverzeichnis.knoten)
    kinder.set(k.elternId, [...(kinder.get(k.elternId) ?? []), k]);
  const aus = new Map<string, string>();
  const geh = (eltern: string, teile: string[]): void => {
    const geschwister = (kinder.get(eltern) ?? []).sort((a, b) => a.reihenfolge - b.reihenfolge);
    let g = 0;
    let p = 0;
    let grund: string | null = null;
    // Rückfall (E-09): größter Schritt aus 10, 5, 2, 1, mit dem die Grundpositionen in die Stellen passen
    let grundzahl = 0;
    for (const k of geschwister)
      if (k.art === 'position' && !(k.ozIndex !== null && grundzahl > 0)) grundzahl++;
    const schritt = [10, 5, 2, 1].find((s) => grundzahl * s < 10 ** maske.position.laenge) ?? 1;
    for (const k of geschwister) {
      if (k.art === 'hinweis') continue;
      if (k.art === 'position') {
        if (k.ozIndex !== null && grund !== null) {
          // Indexposition teilt den Grundteil der vorigen Position
        } else {
          p++;
          grund = String(p * schritt).padStart(maske.position.laenge, '0');
        }
        aus.set(k.id, [...teile, grund].join(maske.trennzeichen ?? ''));
      } else {
        g++;
        const stelle = maske.gliederung[teile.length];
        if (stelle === undefined) throw new Error('Baum tiefer als die Maske');
        const teil = String(g).padStart(stelle.laenge, '0');
        aus.set(k.id, [...teile, teil].join(maske.trennzeichen ?? ''));
        geh(k.id, [...teile, teil]);
      }
    }
  };
  geh(wurzel, vorsilbe);
  return aus;
}

const ozMap = (z: LvZustand): Map<string, string | null> =>
  new Map(
    z.leistungsverzeichnis.knoten.map((k) => [k.id, k.art === 'hinweis' ? null : k.ordnungszahl] as const),
  );
const lage = (z: LvZustand): string[] =>
  z.leistungsverzeichnis.knoten.map((k) => `${k.id}|${k.art}|${k.elternId}|${String(k.reihenfolge)}`);
const ohneOz = (k: Knoten): unknown => (k.art === 'hinweis' ? k : { ...k, ordnungszahl: null });
const umnummerieren = (z: LvZustand, teilbaum: string = LV_ID): LvChangeSet =>
  erwarteOk(lvBefehlAusfuehren(z, { art: 'Umnummerieren', teilbaumId: id.eltern(teilbaum) }));

describe('Umnummerieren des ganzen LV (Property)', () => {
  it('IDs und Struktur bleiben, OZ = Orakel, eindeutig, ChangeSet genau die Änderungen, Undo exakt, idempotent', () => {
    let positionenMitIndex = 0;
    let geaendert = 0;
    let tiefe3 = 0;
    fc.assert(
      fc.property(fc.constantFrom(...MASKEN), folgeArb, (maske, folge) => {
        const z = bauen(maske, folge);
        const vorher = structuredClone(z);
        const cs = umnummerieren(z);
        expect(z).toEqual(vorher); // reine Funktion
        expect(umnummerieren(z)).toEqual(cs); // deterministisch
        const neu = anwenden(z, cs);

        // IDs, Struktur, Reihenfolge, Summen
        expect(lage(neu)).toEqual(lage(z));
        expect(neu.summen).toBe(z.summen);
        expect(cs.summen).toEqual(KEINE_SUMMEN);
        expect(cs.kopf).toBeNull();
        expect(cs.knoten.hinzugefuegt).toEqual([]);
        expect(cs.knoten.entfernt).toEqual([]);
        expect(pruefeLvInvarianten(neu.leistungsverzeichnis)).toEqual([]);
        // außer der OZ ändert sich kein Feld
        const alt = new Map(z.leistungsverzeichnis.knoten.map((k) => [k.id as string, k]));
        for (const k of neu.leistungsverzeichnis.knoten) {
          expect(ohneOz(k)).toEqual(ohneOz(alt.get(k.id) as Knoten));
        }

        // OZ = Orakel; Hinweistexte ohne OZ
        const soll = orakel(z, maske);
        if ([...soll.values()].some((oz) => oz.split(maske.trennzeichen ?? '\u0000').length >= 3)) tiefe3++;
        for (const k of neu.leistungsverzeichnis.knoten) {
          if (k.art === 'hinweis') expect(soll.has(k.id)).toBe(false);
          else expect(k.ordnungszahl, k.id).toBe(soll.get(k.id));
          if (k.art === 'position' && k.ozIndex !== null) positionenMitIndex++;
        }
        expect(soll.size).toBe(z.leistungsverzeichnis.knoten.filter((k) => k.art !== 'hinweis').length);

        // Eindeutigkeit und Baumordnung: Gliederungen und Positionen je Elternknoten aufsteigend
        expect(doppelteOrdnungszahlen(neu.leistungsverzeichnis.knoten)).toEqual([]);
        const sep = maske.trennzeichen ?? '';
        const neuOz = ozMap(neu);
        const nachEltern = new Map<string, Knoten[]>();
        for (const k of neu.leistungsverzeichnis.knoten)
          nachEltern.set(k.elternId, [...(nachEltern.get(k.elternId) ?? []), k]);
        for (const [eltern, ks] of nachEltern) {
          const vorsilbe = eltern === LV_ID ? '' : `${neuOz.get(eltern) ?? ''}${sep}`;
          let letzteG = '';
          let letzteP = '';
          for (const k of ks.sort((a, b) => a.reihenfolge - b.reihenfolge)) {
            if (k.art === 'hinweis' || k.ordnungszahl === null) continue;
            expect(k.ordnungszahl.startsWith(vorsilbe)).toBe(true);
            if (k.art === 'position') {
              expect(k.ordnungszahl >= letzteP).toBe(true);
              letzteP = k.ordnungszahl;
            } else {
              expect(k.ordnungszahl > letzteG).toBe(true);
              letzteG = k.ordnungszahl;
            }
          }
        }

        // ChangeSet = genau die Knoten, deren OZ sich ändert (mit altem und neuem Stand)
        const o0 = ozMap(z);
        const o1 = ozMap(neu);
        const erwartet = z.leistungsverzeichnis.knoten
          .filter((k) => o0.get(k.id) !== o1.get(k.id))
          .map((k) => k.id);
        expect(cs.knoten.geaendert.map((g) => g.nachher.id)).toEqual(erwartet);
        for (const g of cs.knoten.geaendert) expect(g.vorher).toBe(alt.get(g.nachher.id));
        geaendert += cs.knoten.geaendert.length;

        // Undo
        expect(cs.summen.vorher).toBeDefined(); // v1.1a
        expect(anwenden(neu, changeSetUmkehren(cs))).toEqual(z);
        expect(ohneReihenfolge(changeSetUmkehren(changeSetUmkehren(cs)))).toEqual(ohneReihenfolge(cs));

        // Idempotenz
        const wieder = umnummerieren(neu);
        expect(wieder.knoten.geaendert).toEqual([]);
        expect(anwenden(neu, wieder)).toBe(neu);
      }),
      { numRuns: 300 },
    );
    expect(positionenMitIndex).toBeGreaterThan(100);
    expect(geaendert).toBeGreaterThan(1000);
    expect(tiefe3).toBeGreaterThan(30);
  });
});

describe('Umnummerieren eines Teilbaums (Property)', () => {
  it('nur die Nachfahren ändern sich; das Ergebnis gleicht dem des ganzen Baums; Undo exakt', () => {
    let geprueft = 0;
    fc.assert(
      fc.property(fc.constantFrom(...MASKEN), folgeArb, fc.nat(10_000), (maske, folge, wahl) => {
        const z0 = bauen(maske, folge);
        const z1 = anwenden(z0, umnummerieren(z0));
        const gliederungen = z1.leistungsverzeichnis.knoten.filter(
          (k) => k.art === 'titel' || k.art === 'los',
        );
        if (gliederungen.length === 0) return;
        const wurzel = gliederungen[wahl % gliederungen.length];
        if (wurzel === undefined) return;
        // Nachfahren der Wurzel: OZ löschen
        const nachfahren = new Set<string>();
        const dazu = (eltern: string): void => {
          for (const k of z1.leistungsverzeichnis.knoten)
            if (k.elternId === eltern) {
              nachfahren.add(k.id);
              dazu(k.id);
            }
        };
        dazu(wurzel.id);
        const verstellt: LvZustand = {
          ...z1,
          leistungsverzeichnis: {
            ...z1.leistungsverzeichnis,
            knoten: z1.leistungsverzeichnis.knoten.map((k) =>
              nachfahren.has(k.id) && k.art !== 'hinweis' ? { ...k, ordnungszahl: null } : k,
            ),
          },
        };
        const cs = umnummerieren(verstellt, wurzel.id);
        const danach = anwenden(verstellt, cs);
        expect(danach.leistungsverzeichnis.knoten).toEqual(z1.leistungsverzeichnis.knoten);
        for (const g of cs.knoten.geaendert) expect(nachfahren.has(g.nachher.id)).toBe(true);
        expect(cs.summen).toEqual(KEINE_SUMMEN);
        expect(anwenden(danach, changeSetUmkehren(cs))).toEqual(verstellt);
        // die Wurzel selbst und alles außerhalb bleibt unberührt
        const o = ozMap(verstellt);
        for (const k of danach.leistungsverzeichnis.knoten)
          if (!nachfahren.has(k.id)) expect(ozMap(danach).get(k.id)).toBe(o.get(k.id));
        geprueft++;
      }),
      { numRuns: 200 },
    );
    expect(geprueft).toBeGreaterThan(100);
  });
});

describe('OzMaskeSetzen (Property)', () => {
  it('ein ChangeSet mit Kopf und Knoten; neue OZ = Orakel; Hin- und Rückweg gleich; Undo exakt', () => {
    let gewechselt = 0;
    fc.assert(
      fc.property(folgeArb, (folge) => {
        const z0 = bauen(MASKE_A, folge);
        const z1 = anwenden(z0, umnummerieren(z0));
        // Zielmaske B: gleiche Stufenzahl; C hat mit 3, 2, 1, 1, 1 Stellen oft zu wenig Platz (Überlauf bei Schritt 1 wird abgewiesen).
        for (const ziel of [MASKE_B, MASKE_C]) {
          const e = lvBefehlAusfuehren(z1, { art: 'OzMaskeSetzen', maske: ziel });
          if (!e.ok) {
            // alles oder nichts: nur ein Fehlerwert, der Zustand bleibt, der Fehler nennt den Knoten
            expect(['maske-ungueltig', 'oz-ueberlauf']).toContain(e.fehler.code);
            expect(e.fehler.knotenId).toBeDefined();
            expect(ziel).toBe(MASKE_C);
            continue;
          }
          const cs = e.wert;
          expect(cs.kopf?.vorher?.ozMaske).toEqual(MASKE_A);
          expect(cs.kopf?.nachher?.ozMaske).toEqual(ziel);
          expect(cs.summen).toEqual(KEINE_SUMMEN);
          const z2 = anwenden(z1, cs);
          expect(z2.leistungsverzeichnis.ozMaske).toEqual(ziel);
          expect(lage(z2)).toEqual(lage(z1));
          expect(z2.summen).toBe(z1.summen);
          const soll = orakel(z2, ziel);
          for (const k of z2.leistungsverzeichnis.knoten)
            if (k.art !== 'hinweis') expect(k.ordnungszahl, k.id).toBe(soll.get(k.id));
          const o1 = ozMap(z1);
          const o2 = ozMap(z2);
          expect(cs.knoten.geaendert.map((g) => g.nachher.id)).toEqual(
            z1.leistungsverzeichnis.knoten.filter((k) => o1.get(k.id) !== o2.get(k.id)).map((k) => k.id),
          );
          expect(anwenden(z2, changeSetUmkehren(cs))).toEqual(z1);
          // Rückweg über den Befehl: wieder Maske A, dieselbe OZ wie zuvor
          const z3 = anwenden(
            z2,
            erwarteOk(lvBefehlAusfuehren(z2, { art: 'OzMaskeSetzen', maske: MASKE_A })),
          );
          expect(z3).toEqual(z1);
          gewechselt++;
        }
      }),
      { numRuns: 150 },
    );
    expect(gewechselt).toBeGreaterThan(100);
  });

  it('eine Maske mit zu wenig Stufen: Fehlerwert mit dem Knoten, wenn der Baum tiefer ist, sonst Erfolg', () => {
    const zwei: OzMaske = {
      gliederung: [num(2), num(2)],
      position: num(4),
      index: alnum(1),
      trennzeichen: '.',
    };
    let abgewiesen = 0;
    fc.assert(
      fc.property(folgeArb, (folge) => {
        const z = bauen(MASKE_A, folge);
        const vorher = structuredClone(z);
        const knoten = z.leistungsverzeichnis.knoten;
        const byId = new Map(knoten.map((k) => [k.id as string, k]));
        const stufe = (k: Knoten): number => {
          let n = 0;
          for (let x: Knoten | undefined = k; x !== undefined; x = byId.get(x.elternId))
            if (x.art === 'titel') n++;
          return n;
        };
        const zu_tief = knoten.find((k) => k.art !== 'hinweis' && k.art !== 'position' && stufe(k) > 2);
        const e = lvBefehlAusfuehren(z, { art: 'OzMaskeSetzen', maske: zwei });
        expect(z).toEqual(vorher);
        if (zu_tief === undefined) {
          expect(e.ok).toBe(true);
        } else {
          expect(e.ok).toBe(false);
          if (!e.ok) {
            expect(e.fehler.code).toBe('maske-ungueltig');
            const k = byId.get(e.fehler.knotenId ?? '');
            expect(k).toBeDefined();
            abgewiesen++;
          }
        }
      }),
      { numRuns: 150 },
    );
    expect(abgewiesen).toBeGreaterThan(5);
  });
});
