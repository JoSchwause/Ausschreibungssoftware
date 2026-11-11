// SPDX-License-Identifier: AGPL-3.0-or-later
// Beispieltests für Summen, Nachlass und MwSt (Ticket 07). Zuerst geschrieben (Q1). Property-Tests:
// `summen-eigenschaften.test.ts`, Leistungsbudget: `summen-leistung.test.ts`.

import { describe, expect, it } from 'vitest';
import type {
  Befehlsfehlercode,
  Betrag,
  Einheitspreis,
  Knoten,
  LvBefehl,
  LvZustand,
  Menge,
  Nachlass,
  Prozent,
} from '@tethys/vertrag';
import { prozentVon } from '@tethys/dezimal';
import {
  SUMMEN_ANNAHMEN,
  changeSetUmkehren,
  gesamtsummen,
  lvBefehlAusfuehren,
  nachlassBetrag,
  positionGehtInSumme,
  summenBerechnen,
  ZUSTAENDIGES_TICKET,
} from './index';
import {
  KEINE_SUMMEN,
  ohneReihenfolge,
  anwenden,
  LV_ID,
  PROJEKT_ID,
  betragNachlass,
  erwarteOk,
  fixtureAlsInhalt,
  fixtureLesen,
  handbeispieleLesen,
  id,
  inhalt,
  lvMit,
  posKnoten,
  merkmale,
  wahlzuordnung,
  positionsdaten,
  prozentNachlass,
  sollwerteLesen,
  titelKnoten,
  wende,
} from './testhilfen';
import type { LeistungsverzeichnisId } from '@tethys/vertrag';

const betrag = (s: string): Betrag => s as Betrag;
const prozent = (s: string): Prozent => s as Prozent;

const mengeAendern = (positionId: string, menge: string | null): LvBefehl => ({
  art: 'MengeAendern',
  positionId: id.pos(positionId),
  menge: menge as Menge | null,
});
const epAendern = (positionId: string, ep: string | null): LvBefehl => ({
  art: 'EinheitspreisAendern',
  positionId: id.pos(positionId),
  einheitspreis: ep as Einheitspreis | null,
});
const nachlassSetzen = (nachlass: ReturnType<typeof prozentNachlass>): LvBefehl => ({
  art: 'NachlassSetzen',
  nachlass,
});
const mwstSetzen = (satz: string): LvBefehl => ({ art: 'MwstSatzSetzen', mwstSatz: prozent(satz) });

function fehlercode(z: LvZustand, b: LvBefehl): Befehlsfehlercode {
  const e = lvBefehlAusfuehren(z, b);
  if (e.ok) throw new Error(`Befehl wurde angenommen: ${b.art}`);
  return e.fehler.code;
}

/** Gliederungssumme ohne Bedarfs- und Wahlpositionen (Ausweise 0,00). */
const gs = (gliederungId: string, summe: string) => ({
  gliederungId,
  summe,
  summeBedarfOhneGesamtbetrag: '0.00',
  summeWahl: '0.00',
});

const gp = (z: LvZustand, positionId: string) => z.summen.positionen.find((p) => p.positionId === positionId);
const titelSumme = (z: LvZustand, titelId: string): string | undefined =>
  z.summen.gliederungen.find((g) => g.gliederungId === titelId)?.summe;

// --- Goldene Zahlen (aus N2 herleitbar) -------------------------------------------------------------------------

describe('Goldene Zahlen', () => {
  it('12,35 + 15,20 = 27,55; MwSt 19 % = 5,2345 → 5,23 (nicht 5,24); Brutto 32,78', () => {
    const z = lvMit([
      titelKnoten('T1', LV_ID, 0),
      posKnoten('P1', 'T1', 0, '1.235', '10.000'),
      posKnoten('P2', 'T1', 1, '3.333', '4.560'),
    ]);
    expect(gp(z, 'P1')?.gesamtpreis).toBe('12.35');
    expect(gp(z, 'P2')?.gesamtpreis).toBe('15.20'); // 15,19848
    expect(titelSumme(z, 'T1')).toBe('27.55');
    expect(z.summen.gesamt).toEqual({
      netto: '27.55',
      nachlass: '0.00',
      nettoNachNachlass: '27.55',
      mwst: '5.23',
      brutto: '32.78',
      summeBedarfOhneGesamtbetrag: '0.00',
      summeWahl: '0.00',
    });
  });

  it('402,73 − 3 % = 390,6481 → 390,65; MwSt 19 % = 74,2235 → 74,22; Brutto 464,87', () => {
    const z = lvMit([posKnoten('P1', LV_ID, 0, '1.000', '402.730')], { nachlass: prozentNachlass('3.00') });
    expect(z.summen.gesamt).toEqual({
      netto: '402.73',
      nachlass: '12.08', // 12,0819
      nettoNachNachlass: '390.65',
      mwst: '74.22',
      brutto: '464.87',
      summeBedarfOhneGesamtbetrag: '0.00',
      summeWahl: '0.00',
    });
  });

  it('handbeispiele.json: jede Summenkette ergibt genau die Sollwerte', () => {
    const hb = handbeispieleLesen();
    for (const kette of hb.summenketten) {
      const ep = `${kette.netto}0`; // Betrag (2 Stellen) → EP (3 Stellen)
      const z = lvMit([posKnoten('P1', LV_ID, 0, '1.000', ep)], {
        nachlass: kette.nachlass as Nachlass | null,
        mwstSatz: kette.mwstSatz,
      });
      expect(z.summen.gesamt).toMatchObject(kette.soll);
    }
    for (const g of hb.gesamtpreise) {
      const stellen = g.einheitspreis.split('.')[1]?.length ?? 0;
      const ep = g.einheitspreis + '0'.repeat(3 - stellen); // die Fixture schreibt „10.00“, der EP hat 3 Stellen
      const z = lvMit([posKnoten('P1', LV_ID, 0, g.menge, ep)]);
      expect(gp(z, 'P1')?.gesamtpreis).toBe(g.gp);
    }
  });

  it('absoluter Nachlass: 100,00 − 30,00 = 70,00; MwSt 13,30; Brutto 83,30', () => {
    const z = lvMit([posKnoten('P1', LV_ID, 0, '1.000', '100.000')], { nachlass: betragNachlass('30.00') });
    expect(z.summen.gesamt).toEqual({
      netto: '100.00',
      nachlass: '30.00',
      nettoNachNachlass: '70.00',
      mwst: '13.30',
      brutto: '83.30',
      summeBedarfOhneGesamtbetrag: '0.00',
      summeWahl: '0.00',
    });
  });

  it('negative Beträge: Abzugsposition mit Rundungsgleichstand rundet nach dem Betrag (−0,025 → −0,03)', () => {
    // Glossar „Kaufmännische Rundung“: Menge −2,500 × EP 0,010 = −0,025 ergibt GP −0,03 (nicht −0,02).
    const z = lvMit([
      titelKnoten('T1', LV_ID, 0),
      posKnoten('P1', 'T1', 0, '-2.500', '0.010'),
      posKnoten('P2', 'T1', 1, '2.500', '0.010'),
      posKnoten('P3', 'T1', 2, '10.000', '5.000'),
    ]);
    expect(gp(z, 'P1')?.gesamtpreis).toBe('-0.03');
    expect(gp(z, 'P2')?.gesamtpreis).toBe('0.03');
    expect(titelSumme(z, 'T1')).toBe('50.00'); // −0,03 + 0,03 + 50,00
    // Reine Abzugssumme: negativer Netto, Nachlass 10 % von −0,13 = −0,013 → −0,01; netto danach −0,12.
    const abzug = lvMit([posKnoten('P1', LV_ID, 0, '-1.000', '0.125')], {
      nachlass: prozentNachlass('10.00'),
    });
    expect(abzug.summen.gesamt.netto).toBe('-0.13'); // −0,125 → −0,13
    expect(abzug.summen.gesamt.nachlass).toBe('-0.01'); // −0,0130 → −0,01
    expect(abzug.summen.gesamt.nettoNachNachlass).toBe('-0.12');
    expect(abzug.summen.gesamt.mwst).toBe('-0.02'); // −0,0228 → −0,02
    expect(abzug.summen.gesamt.brutto).toBe('-0.14');
  });
});

// --- Fixtures --------------------------------------------------------------------------------------------------------

describe.each(['winzig', 'typisch', 'gross'] as const)('Fixture %s: Sollwerte', (name) => {
  const fx = fixtureLesen(name);
  const soll = sollwerteLesen(name);
  const z = wende(null, {
    art: 'LeistungsverzeichnisAnlegen',
    id: fx.id as LeistungsverzeichnisId,
    projektId: PROJEKT_ID,
    inhalt: fixtureAlsInhalt(fx),
  });

  it('alle Gesamtsummen stimmen exakt', () => {
    expect(z.summen.gesamt).toMatchObject(soll.summen);
  });

  it('alle Titelsummen stimmen exakt', () => {
    const titel = z.summen.gliederungen.filter((g) => g.gliederungId in soll.titel);
    expect(titel).toHaveLength(Object.keys(soll.titel).length);
    for (const g of z.summen.gliederungen) expect(g.summe).toBe(soll.titel[g.gliederungId]?.summe);
  });

  it('jede Position: GP und „geht in die Summe ein“ stimmen exakt', () => {
    const anzahl = z.leistungsverzeichnis.knoten.filter((k) => k.art === 'position').length;
    expect(z.summen.positionen).toHaveLength(anzahl);
    expect(Object.keys(soll.positionen)).toHaveLength(anzahl);
    for (const p of z.summen.positionen) {
      expect(p.gesamtpreis, p.positionId).toBe(soll.positionen[p.positionId]?.gp);
      expect(p.gehtInSummeEin, p.positionId).toBe(soll.positionen[p.positionId]?.inSumme);
    }
  });

  it('die vollständige Neuberechnung (Orakel) liefert denselben Summenstand', () => {
    expect(summenBerechnen(z.leistungsverzeichnis)).toEqual(z.summen);
  });
});

describe('typisch enthält Wahl- und Zuschlagsposition', () => {
  it('Wahlposition: GP ausgewiesen, nicht in der Summe; Zuschlagsposition: in der Summe', () => {
    const fx = fixtureLesen('typisch');
    const soll = sollwerteLesen('typisch');
    const arten = new Map(fx.knoten.map((k) => [k.id, k.positionsart]));
    const wahl = Object.entries(soll.positionen).filter(([i]) => arten.get(i) === 'wahl');
    const zuschlag = Object.entries(soll.positionen).filter(([i]) => arten.get(i) === 'zuschlag');
    expect(wahl.length).toBeGreaterThan(0);
    expect(zuschlag.length).toBeGreaterThan(0);
    for (const [, w] of wahl) expect(w.inSumme).toBe(false);
    for (const [, w] of zuschlag) expect(w.inSumme).toBe(true);
  });
});

// --- Nicht gesetzte Werte ------------------------------------------------------------------------------------------

describe('Menge oder Einheitspreis nicht gesetzt', () => {
  it('gesamtpreis ist null, geht nicht in die Summe ein und trägt nichts bei (nicht gleich 0,00)', () => {
    const z = lvMit([
      titelKnoten('T1', LV_ID, 0),
      posKnoten('A', 'T1', 0, null, '5.000'),
      posKnoten('B', 'T1', 1, '2.000', null),
      posKnoten('C', 'T1', 2, null, null),
      posKnoten('D', 'T1', 3, '2.000', '5.000'),
    ]);
    for (const i of ['A', 'B', 'C'])
      expect(gp(z, i)).toEqual({ positionId: i, gesamtpreis: null, gehtInSummeEin: false });
    expect(gp(z, 'D')).toEqual({ positionId: 'D', gesamtpreis: '10.00', gehtInSummeEin: true });
    expect(titelSumme(z, 'T1')).toBe('10.00');
  });

  it('Menge setzen und leeren verändert die Summen entsprechend; 0,000 ist ein gesetzter Wert', () => {
    const z0 = lvMit([titelKnoten('T1', LV_ID, 0), posKnoten('A', 'T1', 0, null, '5.000')]);
    const z1 = wende(z0, mengeAendern('A', '3.000'));
    expect(gp(z1, 'A')).toEqual({ positionId: 'A', gesamtpreis: '15.00', gehtInSummeEin: true });
    expect(titelSumme(z1, 'T1')).toBe('15.00');
    const z2 = wende(z1, mengeAendern('A', '0.000'));
    expect(gp(z2, 'A')).toEqual({ positionId: 'A', gesamtpreis: '0.00', gehtInSummeEin: true });
    const z3 = wende(z2, mengeAendern('A', null));
    expect(gp(z3, 'A')).toEqual({ positionId: 'A', gesamtpreis: null, gehtInSummeEin: false });
    expect(titelSumme(z3, 'T1')).toBe('0.00');
  });
});

// --- Vorläufige Annahmen -----------------------------------------------------------------------------------------

describe('Vorläufige Annahmen (Entscheidung offen), je an einer Stelle gebündelt', () => {
  it('sind als offen gekennzeichnet; Nachlass und Betragsziel sind als entschieden vermerkt (N5, E-06; E-04, E-05)', () => {
    expect(SUMMEN_ANNAHMEN.status).toMatch(/vorläufige Annahme, Entscheidung offen/);
    expect(SUMMEN_ANNAHMEN.status).toMatch(/Betragsziel/);
    expect(SUMMEN_ANNAHMEN.status).toMatch(/entschieden: Nachlass/);
    expect(SUMMEN_ANNAHMEN.nachlassGrenzen).toMatch(/ENTSCHIEDEN/);
  });

  it('(1) welche Merkmale ins Netto führen (E-04, E-05; Einzelfälle in merkmale.test.ts)', () => {
    const p = (ueber: Partial<Parameters<typeof merkmale>[0]>) =>
      positionGehtInSumme({ merkmale: merkmale(ueber) });
    expect(p({})).toBe(true);
    expect(p({ bedarf: 'ohne-gesamtbetrag' })).toBe(false);
    expect(p({ bedarf: 'mit-gesamtbetrag' })).toBe(true);
    expect(p({ wahl: wahlzuordnung() })).toBe(false);
    expect(p({ wahl: wahlzuordnung(0, 1) })).toBe(true); // Grundausführung
    expect(p({ stundenlohn: true })).toBe(true);
    expect(p({ pauschal: true })).toBe(true);
  });

  it('das Merkmal „pauschal“ ändert mit Menge nichts an der Summe (Menge × EP)', () => {
    const z = lvMit([
      posKnoten('A', LV_ID, 0, '1.000', '250.000', {
        merkmale: merkmale({ pauschal: true }),
        einheit: 'psch',
      }),
    ]);
    expect(gp(z, 'A')).toEqual({ positionId: 'A', gesamtpreis: '250.00', gehtInSummeEin: true });
  });

  it('Bedarf ohne Gesamtbetrag: GP ausgewiesen, nicht in der Summe; mit Gesamtbetrag: in der Summe', () => {
    const z = lvMit([
      posKnoten('N', LV_ID, 0, '1.000', '10.000'),
      posKnoten('B1', LV_ID, 1, '1.000', '20.000', { merkmale: merkmale({ bedarf: 'ohne-gesamtbetrag' }) }),
      posKnoten('B2', LV_ID, 2, '1.000', '40.000', { merkmale: merkmale({ bedarf: 'mit-gesamtbetrag' }) }),
      posKnoten('W', LV_ID, 3, '1.000', '80.000', { merkmale: merkmale({ wahl: wahlzuordnung() }) }),
    ]);
    expect(gp(z, 'B1')).toEqual({ positionId: 'B1', gesamtpreis: '20.00', gehtInSummeEin: false });
    expect(gp(z, 'W')).toEqual({ positionId: 'W', gesamtpreis: '80.00', gehtInSummeEin: false });
    expect(z.summen.gesamt.netto).toBe('50.00');
  });

  it('(2) Nachlass-Rundung: Betrag zuerst runden, dann abziehen (Fixture A6); Gleichstand-Beispiel', () => {
    // Netto 0,25, Nachlass 10 %: Nachlass exakt 0,025 → 0,03; Netto danach 0,22 (Lesart der Fixtures).
    // Lesart B (Ergebnis runden): 0,25 × 90 % = 0,225 → 0,23. Beide stimmen außerhalb von Gleichständen überein.
    const z = lvMit([posKnoten('P1', LV_ID, 0, '1.000', '0.250')], { nachlass: prozentNachlass('10.00') });
    expect(z.summen.gesamt.nachlass).toBe('0.03');
    expect(z.summen.gesamt.nettoNachNachlass).toBe('0.22');
    expect(prozentVon(betrag('0.25'), prozent('90.00'))).toBe('0.23'); // Lesart B, nicht verwendet
  });

  it('(2) Nachlass-Rundung: ohne Gleichstand liefern beide Lesarten dasselbe (Ticket-Golden)', () => {
    const netto = betrag('402.73');
    const nachlass = prozentNachlass('3.00');
    expect(nachlassBetrag(netto, nachlass)).toBe('12.08');
    expect(prozentVon(netto, prozent('97.00'))).toBe('390.65');
  });

  it('(3) Nachlass-Grenzen: Prozent 0–100, Betrag nicht negativ; sonst ungueltige-eingabe', () => {
    const z = lvMit([posKnoten('P1', LV_ID, 0, '1.000', '100.000')]);
    for (const n of [
      prozentNachlass('100.01'),
      prozentNachlass('-0.01'),
      prozentNachlass('250.00'),
      betragNachlass('-1.00'),
      betragNachlass('-0.01'),
    ]) {
      expect(fehlercode(z, nachlassSetzen(n)), JSON.stringify(n)).toBe('ungueltige-eingabe');
    }
    // Ränder sind zulässig.
    for (const n of [
      prozentNachlass('0.00'),
      prozentNachlass('100.00'),
      betragNachlass('0.00'),
      betragNachlass('100.00'),
    ]) {
      expect(lvBefehlAusfuehren(z, nachlassSetzen(n)).ok, JSON.stringify(n)).toBe(true);
    }
    expect(wende(z, nachlassSetzen(prozentNachlass('100.00'))).summen.gesamt).toMatchObject({
      nachlass: '100.00',
      nettoNachNachlass: '0.00',
      mwst: '0.00',
      brutto: '0.00',
      summeBedarfOhneGesamtbetrag: '0.00',
      summeWahl: '0.00',
    });
  });

  it('(3) E-06: ein absoluter Nachlass über dem Netto wird angenommen; das Netto danach ist negativ', () => {
    const z = lvMit([posKnoten('P1', LV_ID, 0, '1.000', '100.000')]);
    const cs = erwarteOk(lvBefehlAusfuehren(z, nachlassSetzen(betragNachlass('100.01'))));
    expect(cs.kopf?.nachher?.nachlass).toEqual(betragNachlass('100.01'));
    const z2 = anwenden(z, cs);
    expect(z2.summen.gesamt).toEqual({
      netto: '100.00',
      nachlass: '100.01',
      nettoNachNachlass: '-0.01',
      mwst: '0.00', // −0,0019 → 0,00, nie „−0.00“
      brutto: '-0.01',
      summeBedarfOhneGesamtbetrag: '0.00',
      summeWahl: '0.00',
    });
    expect(z2.summen).toEqual(summenBerechnen(z2.leistungsverzeichnis));
    // deutlich größer, MwSt auf das negative Netto: −400,00 × 19 % = −76,00
    const z3 = wende(z, nachlassSetzen(betragNachlass('500.00')));
    expect(z3.summen.gesamt).toEqual({
      netto: '100.00',
      nachlass: '500.00',
      nettoNachNachlass: '-400.00',
      mwst: '-76.00',
      brutto: '-476.00',
      summeBedarfOhneGesamtbetrag: '0.00',
      summeWahl: '0.00',
    });
    expect(z3.summen).toEqual(summenBerechnen(z3.leistungsverzeichnis));
  });

  it('(3) E-06: ein absoluter Nachlass bei Netto 0 oder negativem Netto wird angenommen', () => {
    const leer = lvMit([]);
    expect(wende(leer, nachlassSetzen(betragNachlass('5.00'))).summen.gesamt).toMatchObject({
      netto: '0.00',
      nachlass: '5.00',
      nettoNachNachlass: '-5.00',
    });
    const z = lvMit([posKnoten('P1', LV_ID, 0, '-1.000', '10.000')]);
    expect(lvBefehlAusfuehren(z, nachlassSetzen(betragNachlass('0.01'))).ok).toBe(true);
    expect(wende(z, nachlassSetzen(betragNachlass('0.01'))).summen.gesamt).toMatchObject({
      netto: '-10.00',
      nettoNachNachlass: '-10.01',
    });
  });

  it('(3) E-06: eine spätere Änderung des Netto bei negativem Netto nach Nachlass bleibt konsistent', () => {
    let z = lvMit([
      titelKnoten('T1', LV_ID, 0),
      posKnoten('P1', 'T1', 0, '1.000', '10.000'),
      posKnoten('P2', 'T1', 1, '2.000', '5.000'),
    ]);
    z = wende(z, nachlassSetzen(betragNachlass('50.00'))); // Netto 20,00 → −30,00
    expect(z.summen.gesamt.nettoNachNachlass).toBe('-30.00');
    const schritte: LvBefehl[] = [
      mengeAendern('P1', '3.000'), // Netto 40,00 → −10,00
      epAendern('P2', '10.000'), // Netto 50,00 → 0,00, nie „−0.00“
      mengeAendern('P2', '2.500'), // Netto 55,00 → 5,00
      mengeAendern('P2', null), // Netto 30,00 → −20,00
      mengeAendern('P1', '0.000'), // Netto 0,00 → −50,00
    ];
    const erwartet = ['-10.00', '0.00', '5.00', '-20.00', '-50.00'];
    schritte.forEach((b, i) => {
      z = wende(z, b);
      expect(z.summen, b.art).toEqual(summenBerechnen(z.leistungsverzeichnis));
      expect(z.summen.gesamt.nettoNachNachlass).toBe(erwartet[i]);
      expect(JSON.stringify(z.summen)).not.toContain('-0.00');
    });
    // Nachlass wieder entfernen: umkehrbar (N5)
    z = wende(z, { art: 'NachlassEntfernen' });
    expect(z.summen.gesamt).toMatchObject({ netto: '0.00', nachlass: '0.00', nettoNachNachlass: '0.00' });
    expect(z.summen).toEqual(summenBerechnen(z.leistungsverzeichnis));
  });

  it('(3) E-06: Nachlassbetrag zuerst auf 2 Stellen runden, dann abziehen, auch bei negativem Netto nach Nachlass', () => {
    // Netto 0,25, Nachlass als Betrag 0,30: Netto danach −0,05
    const z = lvMit([posKnoten('P1', LV_ID, 0, '1.000', '0.250')], { nachlass: betragNachlass('0.30') });
    expect(z.summen.gesamt).toMatchObject({ nachlass: '0.30', nettoNachNachlass: '-0.05' });
    // Prozent bei negativem Netto: Nachlass −0,0130 → −0,01 (Betrag runden), Netto danach −0,12 (siehe oben); hier Gleichstand
    const g = lvMit([posKnoten('P1', LV_ID, 0, '-1.000', '0.250')], { nachlass: prozentNachlass('10.00') });
    expect(g.summen.gesamt).toMatchObject({ netto: '-0.25', nachlass: '-0.03', nettoNachNachlass: '-0.22' });
  });

  it('(3) Ein absoluter Nachlass bei negativem Netto: nur ein negativer Betrag wird abgewiesen', () => {
    const z = lvMit([posKnoten('P1', LV_ID, 0, '-1.000', '10.000')]);
    expect(fehlercode(z, nachlassSetzen(betragNachlass('-0.01')))).toBe('ungueltige-eingabe');
    expect(lvBefehlAusfuehren(z, nachlassSetzen(betragNachlass('0.00'))).ok).toBe(true);
  });
});

// --- Befehle: Fehlerwerte und Form ------------------------------------------------------------------------------

describe('Fehlerwerte', () => {
  const z = lvMit([titelKnoten('T1', LV_ID, 0), posKnoten('P1', 'T1', 0, '1.000', '10.000')]);

  it('unbekannte Position und Knoten, die keine Position sind', () => {
    expect(fehlercode(z, mengeAendern('gibt-es-nicht', '1.000'))).toBe('knoten-unbekannt');
    expect(fehlercode(z, epAendern('gibt-es-nicht', '1.000'))).toBe('knoten-unbekannt');
    expect(fehlercode(z, mengeAendern('T1', '1.000'))).toBe('knotenart-unzulaessig');
    expect(fehlercode(z, mengeAendern(LV_ID, '1.000'))).toBe('knoten-unbekannt');
  });

  it('Zahlen nur in kanonischer Schreibweise und Skala', () => {
    for (const m of ['1', '1.0', '1,000', '1.0000', '', 'abc', '-0.000']) {
      expect(fehlercode(z, mengeAendern('P1', m)), m).toBe('ungueltige-eingabe');
    }
    for (const e of ['1.00', '10', '1.0000'])
      expect(fehlercode(z, epAendern('P1', e)), e).toBe('ungueltige-eingabe');
    for (const s of ['19', '19.0', '', 'x'])
      expect(fehlercode(z, mwstSetzen(s)), s).toBe('ungueltige-eingabe');
    expect(fehlercode(z, nachlassSetzen(prozentNachlass('3.0')))).toBe('ungueltige-eingabe');
    expect(fehlercode(z, nachlassSetzen(betragNachlass('3')))).toBe('ungueltige-eingabe');
  });

  it('MwSt-Satz: 0 bis 100 (vorläufige Annahme, restriktiv)', () => {
    expect(fehlercode(z, mwstSetzen('-1.00'))).toBe('ungueltige-eingabe');
    expect(fehlercode(z, mwstSetzen('100.01'))).toBe('ungueltige-eingabe');
    expect(lvBefehlAusfuehren(z, mwstSetzen('0.00')).ok).toBe(true);
    expect(lvBefehlAusfuehren(z, mwstSetzen('100.00')).ok).toBe(true);
  });

  it('ein abgewiesener Befehl ändert nichts', () => {
    const vorher = structuredClone(z);
    lvBefehlAusfuehren(z, mengeAendern('P1', '1'));
    expect(z).toEqual(vorher);
  });

  it('die fünf Befehle sind im Kern umgesetzt', () => {
    for (const art of [
      'MengeAendern',
      'EinheitspreisAendern',
      'NachlassSetzen',
      'NachlassEntfernen',
      'MwstSatzSetzen',
    ]) {
      expect(Object.keys(ZUSTAENDIGES_TICKET)).not.toContain(art);
    }
  });
});

// --- ChangeSet: nur Betroffenes (A6) --------------------------------------------------------------------------------

describe('ChangeSet einer Mengenänderung', () => {
  const baum = (): LvZustand =>
    lvMit(
      [
        titelKnoten('T1', LV_ID, 0),
        titelKnoten('T1a', 'T1', 0),
        titelKnoten('T1b', 'T1', 1),
        titelKnoten('T2', LV_ID, 1),
        posKnoten('P1', 'T1a', 0, '2.000', '10.000'),
        posKnoten('P2', 'T1a', 1, '1.000', '5.000'),
        posKnoten('P3', 'T1b', 0, '1.000', '7.000'),
        posKnoten('P4', 'T2', 0, '1.000', '9.000'),
        posKnoten('H', 'T1a', 2, null, null, {}), // gleicht einer leeren Position
      ],
      { nachlass: prozentNachlass('2.00') },
    );

  it('nennt genau die Position, die Summen ihrer Vorfahren und die LV-Summen, nichts sonst', () => {
    const z = baum();
    const cs = erwarteOk(lvBefehlAusfuehren(z, mengeAendern('P1', '3.000')));
    expect(cs.kopf).toBeNull();
    expect(cs.knoten.hinzugefuegt).toEqual([]);
    expect(cs.knoten.entfernt).toEqual([]);
    expect(cs.knoten.geaendert.map((g) => g.nachher.id)).toEqual(['P1']);
    expect(cs.summen.positionen).toEqual([{ positionId: 'P1', gesamtpreis: '30.00', gehtInSummeEin: true }]);
    expect(cs.summen.gliederungen).toEqual([gs('T1', '42.00'), gs('T1a', '35.00')]);
    expect(cs.summen.gliederungen.map((g) => g.gliederungId)).not.toContain('T1b');
    expect(cs.summen.gliederungen.map((g) => g.gliederungId)).not.toContain('T2');
    expect(cs.summen.gesamt).toEqual({
      netto: '51.00',
      nachlass: '1.02',
      nettoNachNachlass: '49.98',
      mwst: '9.50', // 9,4962
      brutto: '59.48',
      summeBedarfOhneGesamtbetrag: '0.00',
      summeWahl: '0.00',
    });
  });

  it('dieselbe Menge noch einmal: leeres ChangeSet, keine unveränderten Summen', () => {
    const z = baum();
    const cs = erwarteOk(lvBefehlAusfuehren(z, mengeAendern('P1', '2.000')));
    expect(cs.knoten).toEqual({ hinzugefuegt: [], geaendert: [], entfernt: [] });
    expect(cs.summen).toEqual(KEINE_SUMMEN);
    expect(anwenden(z, cs)).toBe(z);
  });

  it('Menge ändert sich, GP nicht (EP 0,000): Position geändert, aber keine Summe', () => {
    const z = lvMit([titelKnoten('T1', LV_ID, 0), posKnoten('P1', 'T1', 0, '2.000', '0.000')]);
    const cs = erwarteOk(lvBefehlAusfuehren(z, mengeAendern('P1', '5.000')));
    expect(cs.knoten.geaendert).toHaveLength(1);
    expect(cs.summen).toEqual(KEINE_SUMMEN);
  });

  it('Menge ändert sich, EP nicht gesetzt: GP bleibt null, keine Summe im ChangeSet', () => {
    const z = lvMit([titelKnoten('T1', LV_ID, 0), posKnoten('P1', 'T1', 0, '2.000', null)]);
    const cs = erwarteOk(lvBefehlAusfuehren(z, mengeAendern('P1', '5.000')));
    expect(cs.summen).toEqual(KEINE_SUMMEN);
  });

  it('Position, die nicht in die Summe eingeht (Wahl): eigener GP und nur die Wahlsummen ändern sich', () => {
    const z = lvMit([
      titelKnoten('T1', LV_ID, 0),
      posKnoten('W', 'T1', 0, '1.000', '10.000', { merkmale: merkmale({ wahl: wahlzuordnung() }) }),
    ]);
    const cs = erwarteOk(lvBefehlAusfuehren(z, mengeAendern('W', '4.000')));
    expect(cs.summen.positionen).toEqual([{ positionId: 'W', gesamtpreis: '40.00', gehtInSummeEin: false }]);
    expect(cs.summen.gliederungen).toEqual([{ ...gs('T1', '0.00'), summeWahl: '40.00' }]);
    expect(cs.summen.gesamt).toMatchObject({ netto: '0.00', brutto: '0.00', summeWahl: '40.00' });
  });

  it('Einheitspreis ändern: gleiche Form', () => {
    const z = baum();
    const cs = erwarteOk(lvBefehlAusfuehren(z, epAendern('P3', '8.000')));
    expect(cs.knoten.geaendert.map((g) => g.nachher.id)).toEqual(['P3']);
    expect(cs.summen.positionen.map((p) => p.positionId)).toEqual(['P3']);
    expect(cs.summen.gliederungen).toEqual([gs('T1', '33.00'), gs('T1b', '8.00')]);
    expect(cs.summen.gesamt?.netto).toBe('42.00' as Betrag);
  });
});

describe('Anwenden einer Mengenänderung', () => {
  it('liefert denselben Zustand wie die vollständige Neuberechnung', () => {
    const z = lvMit(
      [
        titelKnoten('T1', LV_ID, 0),
        posKnoten('P1', 'T1', 0, '1.000', '3.333'),
        posKnoten('P2', 'T1', 1, '1.000', '1.000'),
      ],
      { nachlass: betragNachlass('1.00') },
    );
    const z2 = wende(z, mengeAendern('P1', '7.777'));
    expect(z2.summen).toEqual(summenBerechnen(z2.leistungsverzeichnis));
    expect(z2.summen.gesamt.netto).toBe('26.92'); // 7,777 × 3,333 = 25,920741 → 25,92; dazu 1,00
  });
});

// --- Strukturbefehle liefern die betroffenen Summen -------------------------------------------------------------

describe('Strukturbefehle sind summenbewusst', () => {
  const baum = (): LvZustand =>
    lvMit([
      titelKnoten('T1', LV_ID, 0),
      titelKnoten('T1a', 'T1', 0),
      titelKnoten('T1b', 'T1', 1),
      titelKnoten('T2', LV_ID, 1),
      posKnoten('P1', 'T1a', 0, '1.000', '10.000'),
      posKnoten('P2', 'T1b', 0, '1.000', '20.000'),
      posKnoten('P3', 'T2', 0, '1.000', '40.000'),
    ]);

  it('LeistungsverzeichnisAnlegen liefert die vollständigen Summen des neuen LV', () => {
    const cs = erwarteOk(
      lvBefehlAusfuehren(null, {
        art: 'LeistungsverzeichnisAnlegen',
        id: LV_ID,
        projektId: PROJEKT_ID,
        inhalt: inhalt(baum().leistungsverzeichnis.knoten),
      }),
    );
    expect(cs.summen.positionen.map((p) => p.positionId).sort()).toEqual(['P1', 'P2', 'P3']);
    expect(cs.summen.gliederungen).toHaveLength(4);
    expect(cs.summen.gesamt).toEqual({
      netto: '70.00',
      nachlass: '0.00',
      nettoNachNachlass: '70.00',
      mwst: '13.30',
      brutto: '83.30',
      summeBedarfOhneGesamtbetrag: '0.00',
      summeWahl: '0.00',
    });
  });

  it('PositionAnlegen: eigener GP und Summen der Vorfahren, sonst nichts', () => {
    const z = baum();
    const cs = erwarteOk(
      lvBefehlAusfuehren(z, {
        art: 'PositionAnlegen',
        id: id.pos('P9'),
        ort: { art: 'ende', elternId: id.eltern('T1b') },
        daten: positionsdaten('neu', { menge: '2.000' as Menge, einheitspreis: '5.000' as Einheitspreis }),
      }),
    );
    expect(cs.summen.positionen).toEqual([{ positionId: 'P9', gesamtpreis: '10.00', gehtInSummeEin: true }]);
    expect(cs.summen.gliederungen).toEqual([gs('T1', '40.00'), gs('T1b', '30.00')]);
    expect(cs.summen.gesamt?.netto).toBe('80.00');
    expect(summenBerechnen(anwenden(z, cs).leistungsverzeichnis)).toEqual(anwenden(z, cs).summen);
  });

  it('PositionAnlegen ohne Menge: Eintrag mit gesamtpreis null, sonst keine Summe', () => {
    const cs = erwarteOk(
      lvBefehlAusfuehren(baum(), {
        art: 'PositionAnlegen',
        id: id.pos('P9'),
        ort: { art: 'ende', elternId: id.eltern('T1b') },
        daten: positionsdaten('neu'),
      }),
    );
    expect(cs.summen).toEqual({
      positionen: [{ positionId: 'P9', gesamtpreis: null, gehtInSummeEin: false }],
      gliederungen: [],
      gesamt: null,
      vorher: {
        positionen: [],
        gliederungen: [],
        gesamt: null,
        entfernt: { positionen: [], gliederungen: [] },
      },
    });
  });

  it('HinweistextAnlegen: keine Summen', () => {
    const cs = erwarteOk(
      lvBefehlAusfuehren(baum(), {
        art: 'HinweistextAnlegen',
        id: id.hinweis('H1'),
        ort: { art: 'ende', elternId: id.eltern('T1') },
        text: [],
      }),
    );
    expect(cs.summen).toEqual(KEINE_SUMMEN);
  });

  it('GliederungAnlegen: neue Gliederung mit Summe 0,00, Vorfahren unverändert', () => {
    const cs = erwarteOk(
      lvBefehlAusfuehren(baum(), {
        art: 'GliederungAnlegen',
        id: id.titel('T3'),
        gliederungsart: 'titel',
        ort: { art: 'ende', elternId: id.eltern('T2') },
        kurztext: 'neu',
      }),
    );
    expect(cs.summen).toEqual({
      positionen: [],
      gliederungen: [gs('T3', '0.00')],
      gesamt: null,
      vorher: {
        positionen: [],
        gliederungen: [],
        gesamt: null,
        entfernt: { positionen: [], gliederungen: [] },
      },
    });
  });

  it('KnotenLoeschen einer Position: Summen der Vorfahren sinken, der Eintrag der Position fällt weg', () => {
    const z = baum();
    const cs = erwarteOk(lvBefehlAusfuehren(z, { art: 'KnotenLoeschen', knotenId: id.knoten('P2') }));
    expect(cs.summen.positionen).toEqual([]);
    expect(cs.summen.gliederungen).toEqual([gs('T1', '10.00'), gs('T1b', '0.00')]);
    expect(cs.summen.gesamt?.netto).toBe('50.00');
    const z2 = anwenden(z, cs);
    expect(gp(z2, 'P2')).toBeUndefined();
    expect(z2.summen).toEqual(summenBerechnen(z2.leistungsverzeichnis));
  });

  it('KnotenLoeschen einer Gliederung mit Unterbaum', () => {
    const z = baum();
    const z2 = wende(z, { art: 'KnotenLoeschen', knotenId: id.knoten('T1') });
    expect(z2.summen.gesamt.netto).toBe('40.00');
    expect(z2.summen.gliederungen.map((g) => g.gliederungId)).toEqual(['T2']);
    expect(z2.summen.positionen.map((p) => p.positionId)).toEqual(['P3']);
    expect(z2.summen).toEqual(summenBerechnen(z2.leistungsverzeichnis));
  });

  it('KnotenVerschieben einer Position zwischen Geschwister-Titeln: gemeinsame Vorfahren bleiben ungenannt', () => {
    const z = baum();
    const cs = erwarteOk(
      lvBefehlAusfuehren(z, {
        art: 'KnotenVerschieben',
        knotenId: id.knoten('P2'),
        ziel: { art: 'ende', elternId: id.eltern('T1a') },
      }),
    );
    expect(cs.summen.positionen).toEqual([]);
    expect(cs.summen.gliederungen).toEqual([gs('T1a', '30.00'), gs('T1b', '0.00')]); // T1 und die LV-Summe ändern sich nicht
    expect(cs.summen.gesamt).toBeNull();
  });

  it('KnotenVerschieben in einen anderen Zweig: alte und neue Kette, LV-Summe unverändert', () => {
    const z = baum();
    const cs = erwarteOk(
      lvBefehlAusfuehren(z, {
        art: 'KnotenVerschieben',
        knotenId: id.knoten('P2'),
        ziel: { art: 'ende', elternId: id.eltern('T2') },
      }),
    );
    expect(cs.summen.gliederungen).toEqual([gs('T1', '10.00'), gs('T1b', '0.00'), gs('T2', '60.00')]);
    expect(cs.summen.gesamt).toBeNull();
    const z2 = anwenden(z, cs);
    expect(z2.summen).toEqual(summenBerechnen(z2.leistungsverzeichnis));
  });

  it('KnotenVerschieben einer Gliederung nimmt ihre Summe mit; ihre eigene Summe ändert sich nicht', () => {
    const z = baum();
    const cs = erwarteOk(
      lvBefehlAusfuehren(z, {
        art: 'KnotenVerschieben',
        knotenId: id.knoten('T1b'),
        ziel: { art: 'ende', elternId: id.eltern('T2') },
      }),
    );
    expect(cs.summen.gliederungen).toEqual([gs('T1', '10.00'), gs('T2', '60.00')]);
  });

  it('Verschieben innerhalb desselben Elternknotens ändert keine Summe', () => {
    const z = baum();
    const cs = erwarteOk(
      lvBefehlAusfuehren(z, {
        art: 'KnotenVerschieben',
        knotenId: id.knoten('T1a'),
        ziel: { art: 'ende', elternId: id.eltern('T1') },
      }),
    );
    expect(cs.summen).toEqual(KEINE_SUMMEN);
  });

  it('Positionen und Hinweistexte direkt unter der Wurzel zählen zum Netto', () => {
    const z = lvMit([posKnoten('P1', LV_ID, 0, '1.000', '12.000')]);
    expect(z.summen.gesamt.netto).toBe('12.00');
    const z2 = wende(z, mengeAendern('P1', '2.000'));
    expect(z2.summen.gesamt.netto).toBe('24.00');
  });
});

// --- Nachlass und MwSt ---------------------------------------------------------------------------------------------

describe('Nachlass', () => {
  const basis = (): LvZustand =>
    lvMit([titelKnoten('T1', LV_ID, 0), posKnoten('P1', 'T1', 0, '1.000', '402.730')]);

  it('NachlassSetzen: ChangeSet mit Kopf und Gesamtsummen, ohne Knoten und Positionssummen', () => {
    const z = basis();
    const cs = erwarteOk(lvBefehlAusfuehren(z, nachlassSetzen(prozentNachlass('3.00'))));
    expect(cs.knoten).toEqual({ hinzugefuegt: [], geaendert: [], entfernt: [] });
    expect(cs.kopf?.vorher?.nachlass).toBeNull();
    expect(cs.kopf?.nachher?.nachlass).toEqual(prozentNachlass('3.00'));
    expect(cs.summen.positionen).toEqual([]);
    expect(cs.summen.gliederungen).toEqual([]);
    expect(cs.summen.gesamt).toEqual({
      netto: '402.73',
      nachlass: '12.08',
      nettoNachNachlass: '390.65',
      mwst: '74.22',
      brutto: '464.87',
      summeBedarfOhneGesamtbetrag: '0.00',
      summeWahl: '0.00',
    });
    const z2 = anwenden(z, cs);
    expect(z2.leistungsverzeichnis.nachlass).toEqual(prozentNachlass('3.00'));
    expect(z2.leistungsverzeichnis.knoten).toBe(z.leistungsverzeichnis.knoten);
  });

  it('NachlassEntfernen stellt die Summen wieder her (Umkehrbarkeit, N5)', () => {
    const z = basis();
    const z1 = wende(z, nachlassSetzen(prozentNachlass('3.00')));
    const z2 = wende(z1, { art: 'NachlassEntfernen' });
    expect(z2).toEqual(z);
    expect(z2.summen.gesamt.nachlass).toBe('0.00');
  });

  it('ein Nachlass geht nie in die EP oder die Positionssummen ein', () => {
    const z = wende(basis(), nachlassSetzen(prozentNachlass('3.00')));
    expect(gp(z, 'P1')?.gesamtpreis).toBe('402.73');
    expect(titelSumme(z, 'T1')).toBe('402.73');
    const p = z.leistungsverzeichnis.knoten.find((k) => k.id === 'P1');
    expect(p?.art === 'position' && p.einheitspreis).toBe('402.730');
  });

  it('einen Nachlass ersetzen: genau einer je LV; derselbe Nachlass noch einmal ist ein leeres ChangeSet', () => {
    const z1 = wende(basis(), nachlassSetzen(prozentNachlass('3.00')));
    const z2 = wende(z1, nachlassSetzen(betragNachlass('10.00')));
    expect(z2.leistungsverzeichnis.nachlass).toEqual(betragNachlass('10.00'));
    expect(z2.summen.gesamt.nettoNachNachlass).toBe('392.73');
    const leer = erwarteOk(lvBefehlAusfuehren(z2, nachlassSetzen(betragNachlass('10.00'))));
    expect(leer.kopf).toBeNull();
    expect(leer.summen).toEqual(KEINE_SUMMEN);
  });

  it('NachlassEntfernen ohne Nachlass: leeres ChangeSet', () => {
    const cs = erwarteOk(lvBefehlAusfuehren(basis(), { art: 'NachlassEntfernen' }));
    expect(cs.kopf).toBeNull();
    expect(cs.summen.gesamt).toBeNull();
  });

  it('prozentualer Nachlass bleibt prozentual, wenn sich das Netto ändert', () => {
    const z = wende(basis(), nachlassSetzen(prozentNachlass('10.00')));
    const z2 = wende(z, mengeAendern('P1', '2.000'));
    expect(z2.summen.gesamt).toMatchObject({
      netto: '805.46',
      nachlass: '80.55',
      nettoNachNachlass: '724.91',
    });
  });

  it('ein absoluter Nachlass bleibt bei Nettoänderung stehen; er wird nicht nachträglich verworfen', () => {
    const z = wende(basis(), nachlassSetzen(betragNachlass('400.00')));
    const z2 = wende(z, mengeAendern('P1', '0.500')); // Netto 201,37 < Nachlass: erlaubt (U5), Summen rechnen weiter
    expect(z2.summen.gesamt).toMatchObject({
      netto: '201.37',
      nachlass: '400.00',
      nettoNachNachlass: '-198.63',
    });
    expect(z2.summen).toEqual(summenBerechnen(z2.leistungsverzeichnis));
  });
});

describe('MwSt-Satz', () => {
  it('MwstSatzSetzen: ChangeSet mit Kopf und neuen Gesamtsummen; Satz auf die Nettosumme nach Nachlass', () => {
    const z = lvMit([posKnoten('P1', LV_ID, 0, '1.000', '402.730')], { nachlass: prozentNachlass('3.00') });
    const cs = erwarteOk(lvBefehlAusfuehren(z, mwstSetzen('7.00')));
    expect(cs.knoten).toEqual({ hinzugefuegt: [], geaendert: [], entfernt: [] });
    expect(cs.kopf?.vorher?.mwstSatz).toBe('19.00');
    expect(cs.kopf?.nachher?.mwstSatz).toBe('7.00');
    expect(cs.summen.positionen).toEqual([]);
    expect(cs.summen.gliederungen).toEqual([]);
    expect(cs.summen.gesamt).toEqual({
      netto: '402.73',
      nachlass: '12.08',
      nettoNachNachlass: '390.65',
      mwst: '27.35', // 27,3455
      brutto: '418.00',
      summeBedarfOhneGesamtbetrag: '0.00',
      summeWahl: '0.00',
    });
    const z2 = anwenden(z, cs);
    expect(z2.leistungsverzeichnis.mwstSatz).toBe('7.00');
    expect(anwenden(z2, changeSetUmkehren(cs))).toEqual(z);
  });

  it('derselbe Satz noch einmal: leeres ChangeSet', () => {
    const z = lvMit([posKnoten('P1', LV_ID, 0, '1.000', '10.000')]);
    const cs = erwarteOk(lvBefehlAusfuehren(z, mwstSetzen('19.00')));
    expect(cs.kopf).toBeNull();
    expect(cs.summen.gesamt).toBeNull();
  });

  it('MwSt wird einmal auf die Summe gerechnet, nicht je Position', () => {
    // 5 × 0,03 netto: je Position 19 % = 0,0057 → 0,01 (zusammen 0,05); auf die Summe 0,15 × 19 % = 0,0285 → 0,03.
    const knoten = [0, 1, 2, 3, 4].map((i) => posKnoten(`P${String(i)}`, LV_ID, i, '1.000', '0.030'));
    const z = lvMit(knoten);
    expect(z.summen.gesamt.netto).toBe('0.15');
    expect(z.summen.gesamt.mwst).toBe('0.03');
  });
});

// --- Undo: Umkehrung stellt Zustand und Summen exakt her ---------------------------------------------------------

describe('Umkehrung mit Summen', () => {
  const fx = fixtureLesen('typisch');
  const z0 = wende(null, {
    art: 'LeistungsverzeichnisAnlegen',
    id: fx.id as LeistungsverzeichnisId,
    projektId: PROJEKT_ID,
    inhalt: fixtureAlsInhalt(fx),
  });
  const ersteIds = z0.leistungsverzeichnis.knoten.filter(
    (k): k is Extract<Knoten, { art: 'position' }> => k.art === 'position',
  );
  const inSumme = ersteIds.filter(
    (p) => p.zuschlag === null && p.merkmale.wahl === null && p.merkmale.bedarf === null,
  );
  const p1 = inSumme[3]?.id ?? 'x';
  const p2 = inSumme[10]?.id ?? 'x';
  const titel1 = z0.leistungsverzeichnis.knoten.find((k) => k.art === 'titel')?.id ?? 'x';

  const befehle: LvBefehl[] = [
    mengeAendern(p1, '123.456'),
    mengeAendern(p1, null),
    epAendern(p2, '99.999'),
    epAendern(p2, null),
    nachlassSetzen(betragNachlass('50.00')),
    { art: 'NachlassEntfernen' },
    mwstSetzen('7.00'),
    { art: 'KnotenLoeschen', knotenId: id.knoten(p1) },
    { art: 'KnotenLoeschen', knotenId: id.knoten(titel1) },
    {
      art: 'KnotenVerschieben',
      knotenId: id.knoten(p2),
      ziel: { art: 'anfang', elternId: id.eltern(titel1) },
    },
    {
      art: 'PositionAnlegen',
      id: id.pos('neu'),
      ort: { art: 'nach', knotenId: id.knoten(p1) },
      daten: positionsdaten('neu', { menge: '2.000' as Menge, einheitspreis: '3.333' as Einheitspreis }),
    },
    {
      art: 'GliederungAnlegen',
      id: id.titel('neuT'),
      gliederungsart: 'titel',
      ort: { art: 'ende', elternId: id.eltern(titel1) },
      kurztext: 'n',
    },
  ];

  it.each(befehle.map((b, i) => [`${String(i)} ${b.art}`, b] as const))(
    '%s: anwenden und Umkehrung anwenden ergibt exakt den Vorzustand einschließlich der Summen',
    (_name, b) => {
      const cs = erwarteOk(lvBefehlAusfuehren(z0, b));
      const z1 = anwenden(z0, cs);
      const rueck = changeSetUmkehren(cs);
      expect(anwenden(z1, rueck)).toEqual(z0);
      expect(ohneReihenfolge(changeSetUmkehren(rueck))).toEqual(ohneReihenfolge(cs));
    },
  );

  it('die Umkehrung liest die alten Summen allein aus dem ChangeSet (summen.vorher, v1.1a)', () => {
    const cs = erwarteOk(lvBefehlAusfuehren(z0, mengeAendern(p1, '123.456')));
    // v1.3: mechanisch angepasst, Folgeticket (`summen.vorher` Pflicht: kein `?.`)
    expect(cs.summen.vorher.gesamt).toEqual(z0.summen.gesamt);
    expect(cs.summen.vorher.positionen).toEqual(z0.summen.positionen.filter((p) => p.positionId === p1));
    const rueck = changeSetUmkehren(cs);
    expect(rueck.summen.positionen.length).toBeGreaterThan(0);
    expect(rueck.summen.gesamt).toEqual(z0.summen.gesamt);
  });

  it('ohne summen.vorher (vor v1.1a erzeugt) ist ein ChangeSet nicht umkehrbar (Programmfehler)', () => {
    const cs = erwarteOk(lvBefehlAusfuehren(z0, mengeAendern(p1, '123.456')));
    const alt = {
      positionen: cs.summen.positionen,
      gliederungen: cs.summen.gliederungen,
      gesamt: cs.summen.gesamt,
    };
    // v1.3: mechanisch angepasst, Folgeticket (seit v1.3 ist `vorher` Pflicht, der Wert ist kein gültiges ChangeSet mehr)
    // @ts-expect-error -- Summenaenderung ohne vorher
    expect(() => changeSetUmkehren({ ...cs, summen: alt })).toThrow();
  });
});

// --- Orakel ----------------------------------------------------------------------------------------------------------

describe('summenBerechnen (vollständige Neuberechnung)', () => {
  it('leeres LV: alle Summen 0,00', () => {
    const z = lvMit([]);
    expect(z.summen).toEqual({
      positionen: [],
      gliederungen: [],
      gesamt: {
        netto: '0.00',
        nachlass: '0.00',
        nettoNachNachlass: '0.00',
        mwst: '0.00',
        brutto: '0.00',
        summeBedarfOhneGesamtbetrag: '0.00',
        summeWahl: '0.00',
      },
    });
  });

  it('gesamtsummen: Nachlass, MwSt und Brutto aus Netto, Nachlass und Satz', () => {
    expect(gesamtsummen(betrag('27.55'), null, prozent('19.00'))).toEqual({
      netto: '27.55',
      nachlass: '0.00',
      nettoNachNachlass: '27.55',
      mwst: '5.23',
      brutto: '32.78',
    });
    expect(
      gesamtsummen(betrag('27.55'), null, prozent('19.00'), { bedarf: betrag('1.00'), wahl: betrag('2.00') }),
    ).toMatchObject({ netto: '27.55', summeBedarfOhneGesamtbetrag: '1.00', summeWahl: '2.00' });
  });
});
