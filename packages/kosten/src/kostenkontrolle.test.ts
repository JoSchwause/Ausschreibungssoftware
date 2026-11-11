// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests der Kostenkontrolle (Ticket 82, D-37). Regeln: Budget = Baumsummen der gewählten Kostenermittlung (D-24);
// Vergabe = Σ GP der Positionen, die ins Netto eingehen (F4), je KG der Position; Abrechnung = Σ `Leistungsstand.gp` je
// KG; Nachlass als eigene, negative Zeile; Gesamt = Σ Netto nach Nachlass; Abweichung = Vergabe − Budget. Die
// Erwartungswerte sind von Hand hergeleitet (Rechnung im Kommentar). Nummern und Beträge sind erfunden (G-16).

import type {
  AngebotId,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvZustand,
  Betrag,
  Kostenermittlung,
  KostenermittlungId,
  Kostengruppennummer,
  LeistungsverzeichnisId,
  Leistungsstand,
  Position,
  PositionId,
  ProjektId,
  Prozent,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { kostenkontrolleBerechnen } from './index';

const kg = (n: string): Kostengruppennummer => n as Kostengruppennummer;
const b = (t: string): Betrag => t as Betrag;
const PROJEKT = '019b76e9-0000-7000-8000-000000000001' as ProjektId;

/** Budget: 330 15.000,00 · 340 10.000,00 · 410 25.000,00 (Baum: 300 = 25.000,00, 400 = 25.000,00, gesamt 50.000,00). */
const BUDGET: Kostenermittlung = {
  id: '019b76e9-0000-7000-8000-000000000130' as KostenermittlungId,
  projektId: PROJEKT,
  stufe: 'kostenberechnung',
  name: 'Kostenberechnung',
  eintraege: [
    { nummer: kg('330'), betrag: b('15000.00') },
    { nummer: kg('340'), betrag: b('10000.00') },
    { nummer: kg('410'), betrag: b('25000.00') },
  ],
};

interface Pos {
  readonly id: string;
  readonly kg?: string;
  /** GP aus `summen.positionen`; `null`: kein GP. */
  readonly gp: string | null;
  /** `gehtInSummeEin` (F4: z. B. Wahlposition `false`). */
  readonly zaehlt: boolean;
}

function position(p: Pos, eltern: AuftragsLeistungsverzeichnisId, reihenfolge: number): Position {
  return {
    art: 'position',
    id: p.id as PositionId,
    elternId: eltern,
    reihenfolge,
    ordnungszahl: null,
    ozIndex: null,
    merkmale: { bedarf: null, wahl: null, stundenlohn: false, pauschal: false, zuschlagskennzeichen: false },
    zuschlag: null,
    kurztext: `Position ${p.id}`,
    langtext: [],
    menge: null,
    einheit: null,
    einheitspreis: null,
    epa: null,
    ...(p.kg === undefined ? {} : { kostengruppe: kg(p.kg) }),
  };
}

/** Auftrags-LV mit Summenstand, wie der Kern ihn führt; `netto` = Σ GP der zählenden Positionen. */
function auftrag(
  id: string,
  positionen: readonly Pos[],
  nachlass: string,
  nettoNachNachlass: string,
): AuftragsLvZustand {
  const lvId = id as AuftragsLeistungsverzeichnisId;
  return {
    auftragsLeistungsverzeichnis: {
      id: lvId,
      projektId: PROJEKT,
      leistungsverzeichnisId: `lv-${id}` as LeistungsverzeichnisId,
      angebotId: `angebot-${id}` as AngebotId,
      name: `Auftrag ${id}`,
      ozMaske: {
        gliederung: [],
        position: { laenge: 4, zeichen: 'numerisch' },
        index: null,
        trennzeichen: null,
      },
      mwstSatz: '19.00' as Prozent,
      nachlass: null,
      knoten: positionen.map((p, i) => position(p, lvId, i)),
    },
    summen: {
      positionen: positionen.map((p) => ({
        positionId: p.id as PositionId,
        gesamtpreis: p.gp === null ? null : b(p.gp),
        gehtInSummeEin: p.zaehlt && p.gp !== null,
      })),
      gliederungen: [],
      gesamt: {
        netto: b('0.00'), // liest die Kostenkontrolle nicht
        nachlass: b(nachlass),
        nettoNachNachlass: b(nettoNachNachlass),
        mwst: b('0.00'),
        brutto: b('0.00'),
      },
    },
  };
}

function stand(
  gps: readonly [string, string][],
  nachlass: string,
  nettoNachNachlass: string,
): Leistungsstand {
  const positionen = gps.map(([id, gp]) => ({ positionId: id as PositionId, menge: null, gp: b(gp) }));
  return { positionen, leistung: b('0.00'), nachlass: b(nachlass), nettoNachNachlass: b(nettoNachNachlass) };
}

// Auftrag A: a1 331 8.000,00 · a2 340 11.500,00 · a3 ohne KG 1.000,00 · a4 330 Wahl 2.000,00 (zählt nicht) ·
//            a5 500 700,00 · a6 300 300,00; netto 21.500,00, Nachlass 3 % = 645,00, Netto nach Nachlass 20.855,00
// Auftrag B: b1 410 24.000,00 · b2 410 2.345,67; netto 26.345,67, kein Nachlass
const A = auftrag(
  'A',
  [
    { id: 'a1', kg: '331', gp: '8000.00', zaehlt: true },
    { id: 'a2', kg: '340', gp: '11500.00', zaehlt: true },
    { id: 'a3', gp: '1000.00', zaehlt: true },
    { id: 'a4', kg: '330', gp: '2000.00', zaehlt: false },
    { id: 'a5', kg: '500', gp: '700.00', zaehlt: true },
    { id: 'a6', kg: '300', gp: '300.00', zaehlt: true },
  ],
  '645.00',
  '20855.00',
);
const B = auftrag(
  'B',
  [
    { id: 'b1', kg: '410', gp: '24000.00', zaehlt: true },
    { id: 'b2', kg: '410', gp: '2345.67', zaehlt: true },
  ],
  '0.00',
  '26345.67',
);
// Leistungsstand A: a1 4.000,00 · a2 5.000,00 · a3 500,00 · a4 0,00 · a5 0,00 · a6 300,00; Leistung 9.800,00,
//                   Nachlass 3 % = 294,00, Netto nach Nachlass 9.506,00
// Leistungsstand B: b1 12.000,00 · b2 0,00; kein Nachlass
const STAND_A = stand(
  [
    ['a1', '4000.00'],
    ['a2', '5000.00'],
    ['a3', '500.00'],
    ['a4', '0.00'],
    ['a5', '0.00'],
    ['a6', '300.00'],
  ],
  '294.00',
  '9506.00',
);
const STAND_B = stand(
  [
    ['b1', '12000.00'],
    ['b2', '0.00'],
  ],
  '0.00',
  '12000.00',
);
const A_ID = 'A' as AuftragsLeistungsverzeichnisId;
const B_ID = 'B' as AuftragsLeistungsverzeichnisId;

describe('kostenkontrolleBerechnen', () => {
  // Vergabe:    331 = 8.000,00 → 330 = 8.000,00 (a4 zählt nicht); 340 = 11.500,00; 300 = 8.000,00 + 11.500,00 + 300,00
  //             (eigener Wert a6) = 19.800,00; 410 = 400 = 24.000,00 + 2.345,67 = 26.345,67; 500 = 700,00;
  //             ohne KG 1.000,00; Nachlass −645,00; Gesamt 20.855,00 + 26.345,67 = 47.200,67
  //             (Probe: 19.800,00 + 26.345,67 + 700,00 + 1.000,00 − 645,00 = 47.200,67)
  // Abrechnung: 331 = 330 = 4.000,00; 340 = 5.000,00; 300 = 4.000,00 + 5.000,00 + 300,00 = 9.300,00;
  //             410 = 400 = 12.000,00; 500 = 0,00; ohne KG 500,00; Nachlass −294,00; Gesamt 9.506,00 + 12.000,00 = 21.506,00
  //             (Probe: 9.300,00 + 12.000,00 + 0,00 + 500,00 − 294,00 = 21.506,00)
  // Abweichung: 300: 19.800,00 − 25.000,00 = −5.200,00; 330: 8.000,00 − 15.000,00 = −7.000,00; 331 ohne eigenes Budget
  //             unter 330: keine; 340: 11.500,00 − 10.000,00 = 1.500,00; 400 = 410: 26.345,67 − 25.000,00 = 1.345,67;
  //             500 (kein Budget im Zweig): 700,00; ohne KG 1.000,00; Nachlass −645,00;
  //             Gesamt 47.200,67 − 50.000,00 = −2.799,33 (Probe: −5.200,00 + 1.345,67 + 700,00 + 1.000,00 − 645,00)
  it('zwei Auftrags-LVs, Budget und Leistungsstände: Zeilen, Gesamt und Befunde', () => {
    const r = kostenkontrolleBerechnen({
      budget: BUDGET,
      auftraege: [A, B],
      leistungsstaende: [
        { auftragsLvId: A_ID, leistungsstand: STAND_A },
        { auftragsLvId: B_ID, leistungsstand: STAND_B },
      ],
    });
    expect(
      r.kostengruppen.map((z) => [z.nummer, z.ebene, z.budget, z.vergabe, z.abrechnung, z.abweichung]),
    ).toEqual([
      ['300', 1, '25000.00', '19800.00', '9300.00', '-5200.00'],
      ['330', 2, '15000.00', '8000.00', '4000.00', '-7000.00'],
      ['331', 3, null, '8000.00', '4000.00', null],
      ['340', 2, '10000.00', '11500.00', '5000.00', '1500.00'],
      ['400', 1, '25000.00', '26345.67', '12000.00', '1345.67'],
      ['410', 2, '25000.00', '26345.67', '12000.00', '1345.67'],
      ['500', 1, null, '700.00', '0.00', '700.00'],
    ]);
    expect(r.ohneKostengruppe).toEqual({
      budget: null,
      vergabe: '1000.00',
      abrechnung: '500.00',
      abweichung: '1000.00',
    });
    expect(r.nachlass).toEqual({
      budget: null,
      vergabe: '-645.00',
      abrechnung: '-294.00',
      abweichung: '-645.00',
    });
    expect(r.gesamt).toEqual({
      budget: '50000.00',
      vergabe: '47200.67',
      abrechnung: '21506.00',
      abweichung: '-2799.33',
    });
    expect(r.befunde.map((x) => [x.code, x.schwere, x.auftragsLvId, x.positionId, x.nummer])).toEqual([
      ['kostengruppe-ohne-budget', 'warnung', 'A', 'a5', '500'],
      ['kostengruppe-groeber-als-budget', 'hinweis', 'A', 'a6', '300'],
    ]);
  });

  // Ohne Budget: Spalten Budget und Abweichung leer, keine Befunde zur Budget-Gliederung. Vergabe wie oben für B:
  // 400 = 410 = 26.345,67; ohne Leistungsstand Abrechnung 0,00.
  it('ohne Budget und ohne Leistungsstand', () => {
    const r = kostenkontrolleBerechnen({ budget: null, auftraege: [B], leistungsstaende: [] });
    expect(r.kostengruppen.map((z) => [z.nummer, z.budget, z.vergabe, z.abrechnung, z.abweichung])).toEqual([
      ['400', null, '26345.67', '0.00', null],
      ['410', null, '26345.67', '0.00', null],
    ]);
    expect(r.ohneKostengruppe).toEqual({
      budget: null,
      vergabe: '0.00',
      abrechnung: '0.00',
      abweichung: null,
    });
    expect(r.nachlass).toEqual({ budget: null, vergabe: '0.00', abrechnung: '0.00', abweichung: null });
    expect(r.gesamt).toEqual({ budget: null, vergabe: '26345.67', abrechnung: '0.00', abweichung: null });
    expect(r.befunde).toEqual([]);
  });

  // Nur der erste Leistungsstand zu B zählt (12.000,00); der zweite und der zu einem fremden Auftrags-LV nicht.
  it('Leistungsstand doppelt oder zu einem unbekannten Auftrags-LV: Befund, zählt nicht', () => {
    const r = kostenkontrolleBerechnen({
      budget: null,
      auftraege: [B],
      leistungsstaende: [
        { auftragsLvId: B_ID, leistungsstand: STAND_B },
        { auftragsLvId: A_ID, leistungsstand: STAND_A },
        { auftragsLvId: B_ID, leistungsstand: STAND_B },
      ],
    });
    expect(r.gesamt.abrechnung).toBe('12000.00');
    expect(r.kostengruppen.map((z) => [z.nummer, z.abrechnung])).toEqual([
      ['400', '12000.00'],
      ['410', '12000.00'],
    ]);
    expect(r.befunde.map((x) => [x.code, x.schwere, x.auftragsLvId])).toEqual([
      ['leistungsstand-unbekannt', 'warnung', 'A'],
      ['leistungsstand-doppelt', 'warnung', 'B'],
    ]);
  });

  // Summenstand passt nicht: Netto nach Nachlass 26.000,00, die Positionen ergeben 26.345,67. Gesamt bleibt der Wert des
  // Summenstands (D-37), die Abweichung der Zeilen ist ein Befund.
  it('Zeilen ergeben nicht das Gesamt: Befund, Gesamt aus dem Summenstand', () => {
    const falsch: AuftragsLvZustand = {
      ...B,
      summen: { ...B.summen, gesamt: { ...B.summen.gesamt, nettoNachNachlass: b('26000.00') } },
    };
    const r = kostenkontrolleBerechnen({ budget: null, auftraege: [falsch], leistungsstaende: [] });
    expect(r.gesamt.vergabe).toBe('26000.00');
    expect(r.befunde.map((x) => [x.code, x.spalte])).toEqual([['summe-abweichend', 'vergabe']]);
  });

  // Budget nur auf 332: Position auf 331 liegt in keinem Budget-Eintrag (Warnung); 330 ist Gliederung des Budgets, 331
  // nicht: Zeile 331 ohne Budget und ohne Abweichung (die steht an 330: 500,00 − 1.000,00 = −500,00).
  it('Kostengruppe neben einem Budget-Eintrag derselben Gruppe darüber', () => {
    const r = kostenkontrolleBerechnen({
      budget: { ...BUDGET, eintraege: [{ nummer: kg('332'), betrag: b('1000.00') }] },
      auftraege: [auftrag('C', [{ id: 'c1', kg: '331', gp: '500.00', zaehlt: true }], '0.00', '500.00')],
      leistungsstaende: [],
    });
    expect(r.kostengruppen.map((z) => [z.nummer, z.budget, z.vergabe, z.abweichung])).toEqual([
      ['300', '1000.00', '500.00', '-500.00'],
      ['330', '1000.00', '500.00', '-500.00'],
      ['331', null, '500.00', null],
      ['332', '1000.00', '0.00', '-1000.00'],
    ]);
    expect(r.befunde.map((x) => [x.code, x.nummer])).toEqual([['kostengruppe-ohne-budget', '331']]);
  });
});
