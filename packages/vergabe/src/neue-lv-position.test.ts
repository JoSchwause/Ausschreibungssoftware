// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 72 (D-57.2): Eine LV-Position, die nach dem Anlegen des Angebots ins LV kam, hat im Angebot keine gespeicherte
// Summe. Bepreist der Bieter sie, nennt `summen.vorher` für sie keinen alten Wert (der gespeicherte Stand ist „keine
// Zeile“); Rückgängig stellt den Summenstand von vorher her, ohne eine Summe mehr.

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { lvBefehlAusfuehren, lvChangeSetAnwenden } from '@tethys/kern';
import type {
  AngebotBefehl,
  AngebotZustand,
  Angebotsposition,
  ElternId,
  LvBefehl,
  LvZustand,
  Menge,
  PositionId,
} from '@tethys/vertrag';
import {
  angebotBefehlAusfuehrer,
  angebotChangeSetAnwenden,
  angebotChangeSetUmkehren,
  angebotSummenBerechnen,
} from './index';
import {
  angebot,
  angebotszeilen,
  ep,
  erwarteOk,
  liste,
  lv,
  nichtAngeboten,
  position,
  projekt,
  prozent,
  satz,
  speicherAnwenden,
  titel,
  wende,
  zuschlagsposition,
} from './testhilfen';

/** LV-Befehl über den Kern ausführen und anwenden. */
function lvBefehl(z: LvZustand, befehl: LvBefehl): LvZustand {
  const neu = lvChangeSetAnwenden(z, erwarteOk(lvBefehlAusfuehren(z, befehl)));
  if (neu === null) throw new Error('Das LV ist weg.');
  return neu;
}

const vorAngebot = lv('lv-1', [
  titel('t1', 'lv-1', 0),
  position('p1', 't1', 0, '10.000'),
  position('p2', 't1', 1, '5.000'),
  titel('t2', 'lv-1', 1),
  position('p3', 't2', 0, '2.000'),
]);
const proj = projekt(['b-a']);

/** Das Angebot auf dem LV ohne `p4`, wie gespeichert. */
const angebotsstand = wende(angebotBefehlAusfuehrer(proj, vorAngebot), null, {
  art: 'AngebotAnlegen',
  angebot: angebot('a1', vorAngebot, 'b-a', [ep('p1', '10.000'), ep('p2', '8.000')]),
}) as AngebotZustand;

/** Danach kommt `p4` (Menge 4) ans Ende von Titel `t1`. */
const nachher = lvBefehl(vorAngebot, {
  art: 'PositionAnlegen',
  id: 'p4' as PositionId,
  ort: { art: 'ende', elternId: 't1' as ElternId },
  daten: {
    ordnungszahl: null,
    ozIndex: null,
    merkmale: position('x', 't1', 0, null).merkmale,
    zuschlag: null,
    kurztext: 'Position p4',
    langtext: [],
    menge: '4.000' as Menge,
    einheit: 'm',
    einheitspreis: null,
    epa: null,
  },
});
const ausfuehren = angebotBefehlAusfuehrer(proj, nachher);

describe('Bepreisen einer LV-Position, die nach dem Angebot hinzukam', () => {
  it('Rückgängig stellt den Summenstand von vorher her', () => {
    const cs = erwarteOk(
      ausfuehren(angebotsstand, { art: 'AngebotspositionSetzen', position: ep('p4', '2.500') }),
    );
    const bepreist = angebotChangeSetAnwenden(angebotsstand, cs) as AngebotZustand;
    // 4 × 2,500 = 10,00 kommt zu t1 (100,00 + 40,00) und zum Netto hinzu.
    expect(bepreist.summen.positionen.find((p) => p.positionId === 'p4')?.gesamtpreis).toBe('10.00');
    expect(bepreist.summen.gliederungen.find((g) => g.gliederungId === 't1')?.summe).toBe('150.00');
    expect(bepreist.summen.gesamt.netto).toBe('150.00');

    expect(angebotChangeSetAnwenden(bepreist, angebotChangeSetUmkehren(cs))).toEqual(angebotsstand);
  });

  it('auch in speicher: Rückgängig lässt keine Summenzeile zurück, Wiederholen schreibt sie wieder', () => {
    const cs = erwarteOk(
      ausfuehren(angebotsstand, { art: 'AngebotspositionSetzen', position: ep('p4', '2.500') }),
    );
    const gespeichert = angebotszeilen(angebotsstand);
    const bepreist = speicherAnwenden(gespeichert, cs);
    expect(bepreist).toEqual(angebotszeilen(angebotChangeSetAnwenden(angebotsstand, cs) as AngebotZustand));

    const zurueck = speicherAnwenden(bepreist, angebotChangeSetUmkehren(cs));
    expect(zurueck).toEqual(gespeichert);
    expect(speicherAnwenden(zurueck, cs)).toEqual(bepreist);
  });

  it('Altstand mit Angebotsposition, aber ohne Summe: Gliederung und Netto ändern sich, keine Summenzeile (D-72.3)', () => {
    // So konnte ein Angebot vor Ticket 72 aussehen: `p4` war „nicht angeboten“ gesetzt, die Summe nie geschrieben.
    const altstand: AngebotZustand = {
      ...angebotsstand,
      angebot: {
        ...angebotsstand.angebot,
        positionen: [...angebotsstand.angebot.positionen, nichtAngeboten('p4')],
      },
    };
    const cs = erwarteOk(
      ausfuehren(altstand, { art: 'AngebotspositionSetzen', position: ep('p4', '2.500') }),
    );
    expect(cs.positionen.geaendert).toEqual([{ vorher: nichtAngeboten('p4'), nachher: ep('p4', '2.500') }]);
    expect(cs.summen.positionen).toEqual([]);
    expect(cs.summen.vorher.positionen).toEqual([]);
    const bepreist = angebotChangeSetAnwenden(altstand, cs) as AngebotZustand;
    expect(bepreist.summen.gliederungen.find((g) => g.gliederungId === 't1')?.summe).toBe('150.00');
    expect(bepreist.summen.gesamt.netto).toBe('150.00');

    const umkehrung = angebotChangeSetUmkehren(cs);
    expect(angebotChangeSetAnwenden(bepreist, umkehrung)).toEqual(altstand);
    const zeilen = speicherAnwenden(angebotszeilen(altstand), cs);
    expect(speicherAnwenden(zeilen, umkehrung)).toEqual(angebotszeilen(altstand));
  });
});

// --- Eigenschaft (Q1): LV nach dem Angebot gewachsen ----------------------------------------------------------------

const MIT_ZUSCHLAG = { zuschlagskennzeichen: true } as const;

/** Das LV beim Anlegen des Angebots. */
const lvAlt = lv('lv-w', [
  titel('t1', 'lv-w', 0),
  titel('t11', 't1', 0),
  position('p1', 't11', 0, '3.500', null, MIT_ZUSCHLAG),
  zuschlagsposition('z1', 't11', 1, { art: 'gliederung' }, '3.00'),
  position('p2', 't1', 1, '12.000'),
  titel('t2', 'lv-w', 1),
  position('p3', 't2', 0, '1.000', null, { wahl: { gruppe: 1, variante: 1, grundpositionId: null } }),
  zuschlagsposition('z3', 't2', 1, liste('p1', 'p2')),
]);

/**
 * Dasselbe LV danach: `n1` im Bereich von `z1`, ein neuer Titel `tn` mit der Bedarfsposition `n2`, die neue
 * Zuschlagsposition `zn` (Liste mit einer alten und einer neuen Position) und `n3` direkt unter dem LV.
 */
const lvNeu = lv('lv-w', [
  titel('t1', 'lv-w', 0),
  titel('t11', 't1', 0),
  position('p1', 't11', 0, '3.500', null, MIT_ZUSCHLAG),
  zuschlagsposition('z1', 't11', 1, { art: 'gliederung' }, '3.00'),
  position('n1', 't11', 2, '2.000'),
  position('p2', 't1', 1, '12.000'),
  titel('tn', 't1', 2),
  position('n2', 'tn', 0, '0.250', null, { bedarf: 'ohne-gesamtbetrag' }),
  titel('t2', 'lv-w', 1),
  position('p3', 't2', 0, '1.000', null, { wahl: { gruppe: 1, variante: 1, grundpositionId: null } }),
  zuschlagsposition('z3', 't2', 1, liste('p1', 'p2')),
  zuschlagsposition('zn', 't2', 2, liste('p1', 'n1')),
  position('n3', 'lv-w', 2, '-1.500'),
]);

const ALTE_POSITIONEN = ['p1', 'p2', 'p3', 'z1', 'z3'];
const ALLE_POSITIONEN = [...ALTE_POSITIONEN, 'n1', 'n2', 'n3', 'zn'];
const ZUSCHLAEGE = ['z1', 'z3', 'zn'];

const dezimal = (stellen: number, min: bigint, max: bigint): fc.Arbitrary<string> =>
  fc.bigInt({ min, max }).map((n) => {
    const neg = n < 0n;
    const s = (neg ? -n : n).toString().padStart(stellen + 1, '0');
    return `${neg ? '-' : ''}${s.slice(0, -stellen)}.${s.slice(-stellen)}`;
  });

const eintrag = (ids: readonly string[]): fc.Arbitrary<Angebotsposition> =>
  fc.oneof(
    fc.tuple(fc.constantFrom(...ids), dezimal(3, -50_000n, 2_000_000n)).map(([p, e]) => ep(p, e)),
    fc.constantFrom(...ids).map((p) => nichtAngeboten(p)),
    fc
      .tuple(fc.constantFrom(...ZUSCHLAEGE.filter((z) => ids.includes(z))), dezimal(2, -500n, 2_500n))
      .map(([p, s]) => satz(p, s)),
  );

const angebotsbefehl: fc.Arbitrary<AngebotBefehl> = fc.oneof(
  {
    weight: 6,
    arbitrary: eintrag(ALLE_POSITIONEN).map((position): AngebotBefehl => ({
      art: 'AngebotspositionSetzen',
      position,
    })),
  },
  {
    weight: 1,
    arbitrary: dezimal(2, 0n, 5_000n).map((wert): AngebotBefehl => ({
      art: 'AngebotsNachlassSetzen',
      nachlass: prozent(wert),
    })),
  },
);

const nachId = <T>(liste: readonly T[], id: (x: T) => string): Map<string, T> =>
  new Map(liste.map((x) => [id(x), x]));

describe('Eigenschaft: Angebotsbefehle auf einem LV, das nach dem Angebot gewachsen ist', () => {
  const ausfuehrenNeu = angebotBefehlAusfuehrer(projekt(['b']), lvNeu);

  it('vorher nennt nur Gespeichertes; Rückgängig stellt Zustand und speicher-Zeilen her; gespeicherte Summen = Neuberechnung', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(eintrag(ALTE_POSITIONEN), { selector: (p) => p.positionId, maxLength: 5 }),
        fc.array(angebotsbefehl, { maxLength: 25 }),
        (start, befehle) => {
          let zustand = wende(angebotBefehlAusfuehrer(projekt(['b']), lvAlt), null, {
            art: 'AngebotAnlegen',
            angebot: angebot('a', lvAlt, 'b', start),
          }) as AngebotZustand;
          for (const b of befehle) {
            const cs = erwarteOk(ausfuehrenNeu(zustand, b));
            const gespeichertP = nachId(zustand.summen.positionen, (p) => p.positionId);
            const gespeichertG = nachId(zustand.summen.gliederungen, (g) => g.gliederungId);
            // `vorher` gibt den gespeicherten Stand wieder: kein alter Wert ohne gespeicherte Summe (D-57.2).
            for (const p of cs.summen.vorher.positionen) expect(gespeichertP.get(p.positionId)).toEqual(p);
            for (const g of cs.summen.vorher.gliederungen)
              expect(gespeichertG.get(g.gliederungId)).toEqual(g);
            // Minimal: jede geschriebene Positionssumme ist anders als die gespeicherte oder gehört zu einer neuen
            // Angebotsposition (deren Umkehrung löscht in `speicher` die Summe mit; D-72.3).
            const neueEintraege = new Set(cs.positionen.hinzugefuegt.map((p) => p.positionId as string));
            for (const p of cs.summen.positionen)
              if (!neueEintraege.has(p.positionId)) expect(p).not.toEqual(gespeichertP.get(p.positionId));

            const neu = angebotChangeSetAnwenden(zustand, cs) as AngebotZustand;
            const umkehrung = angebotChangeSetUmkehren(cs);
            expect(angebotChangeSetAnwenden(neu, umkehrung)).toEqual(zustand);
            expect(angebotChangeSetUmkehren(umkehrung)).toEqual(cs);

            const zeilen = speicherAnwenden(angebotszeilen(zustand), cs);
            expect(zeilen).toEqual(angebotszeilen(neu));
            expect(speicherAnwenden(zeilen, umkehrung)).toEqual(angebotszeilen(zustand));

            // Jede gespeicherte Summe gleicht der Neuberechnung auf dem gewachsenen LV; jede Angebotsposition hat eine.
            const voll = angebotSummenBerechnen(lvNeu, neu.angebot);
            const vollP = nachId(voll.positionen, (p) => p.positionId);
            const vollG = nachId(voll.gliederungen, (g) => g.gliederungId);
            for (const p of neu.summen.positionen) expect(p).toEqual(vollP.get(p.positionId));
            for (const g of neu.summen.gliederungen) expect(g).toEqual(vollG.get(g.gliederungId));
            expect(neu.summen.gesamt).toEqual(voll.gesamt);
            const mitSumme = new Set(neu.summen.positionen.map((p) => p.positionId as string));
            for (const a of neu.angebot.positionen) expect(mitSumme.has(a.positionId)).toBe(true);
            zustand = neu;
          }
        },
      ),
      { numRuns: 300 },
    );
  });
});
