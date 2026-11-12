// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Tethys AVA contributors
//
// Selbsttest der Fixtures. Aufruf: node --test fixtures/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { erzeugeAlle } from './erzeugen.mjs';
import { erzeugeModell } from './ifc/erzeugen.mjs';
import {
  parse, format, gesamtpreis, prozentVon, summen, rundeHalfUp, berechneZuschlagSollwerte,
  berechneSollwerteGaeb, preiseDesLv,
} from './rechnen.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const datei = (name) => join(hier, name);
const laden = (name) => JSON.parse(readFileSync(datei(name), 'utf8'));
const UUID7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DEZIMAL = /^\d+\.\d+$/;
const LVS = ['winzig.json', 'typisch.json', 'gross.json'];

test('(a) Erzeugung ist deterministisch und byte-identisch mit den eingecheckten Dateien', () => {
  const erste = erzeugeAlle();
  const zweite = erzeugeAlle();
  assert.deepEqual(Object.keys(erste).sort(), [
    'angebote/typisch-bieter-a.x84', 'angebote/typisch-bieter-b.x84', 'angebote/typisch-bieter-c.x84', // Ticket 69
    'gross.json', 'handbeispiele.json', 'ifc/haus-v1-ifc2x3.ifc', 'ifc/haus-v1.ifc', // Ticket 99
    'typisch-abrechnung.json', // Ticket 85
    'typisch-angebote.json', 'typisch.json', 'winzig.json', 'zuschlag.json',
  ]);
  for (const [name, inhalt] of Object.entries(erste)) {
    assert.equal(inhalt, zweite[name], `${name}: zweite Erzeugung weicht ab`);
    assert.equal(readFileSync(datei(name), 'utf8'), inhalt, `${name}: weicht von der eingecheckten Datei ab (node fixtures/erzeugen.mjs ausfuehren)`);
  }
});

test('(b) Handbeispiele aus Ticket 19 und 07', () => {
  const gp = (m, ep) => format(gesamtpreis(parse(m, 3), parse(ep, 3)), 2);
  assert.equal(gp('1.235', '10.00'), '12.35');
  assert.equal(gp('3.333', '4.56'), '15.20'); // exakt 15,19848
  assert.equal(format(parse('3.333', 3) * parse('4.56', 3), 6), '15.198480');
  const s = summen(parse('27.55', 2), null, '19.00');
  assert.equal(format(parse('27.55', 2) * parse('19.00', 2), 4), '523.4500'); // 27,55 x 19 = 523,45; /100 = 5,2345
  assert.deepEqual(s, { netto: '27.55', nachlass: '0.00', nettoNachNachlass: '27.55', mwst: '5.23', brutto: '32.78' });
  const t = summen(parse('402.73', 2), { art: 'prozent', wert: '3.00' }, '19.00');
  assert.deepEqual(t, { netto: '402.73', nachlass: '12.08', nettoNachNachlass: '390.65', mwst: '74.22', brutto: '464.87' });
  assert.deepEqual(summen(parse('2565.00', 2), null, '19.00').brutto, '3052.35');
  assert.equal(format(prozentVon(parse('2565.00', 2), parse('19.00', 2)), 2), '487.35');
  // half-up an der Grenze
  assert.equal(format(rundeHalfUp(1505n, 3, 2), 2), '1.51');
  assert.equal(format(rundeHalfUp(1504n, 3, 2), 2), '1.50');

  const hand = laden('handbeispiele.json');
  assert.deepEqual(hand.gesamtpreise.map((x) => x.gp), ['12.35', '15.20']);
  assert.equal(hand.summenketten[0].soll.mwst, '5.23');
  assert.equal(hand.summenketten[0].soll.brutto, '32.78');
  assert.equal(hand.summenketten[1].soll.brutto, '464.87');
});

test('winzig: Sollwerte wie von Hand nachgerechnet', () => {
  const lv = laden('winzig.json');
  const gps = Object.values(lv.sollwerte.positionen).map((p) => p.gp);
  assert.deepEqual(gps, ['12.35', '15.20', '2537.45']);
  assert.deepEqual(lv.sollwerte.summen, {
    netto: '2565.00', nachlass: '0.00', nettoNachNachlass: '2565.00', mwst: '487.35', brutto: '3052.35',
  });
});

for (const name of LVS) {
  test(`(c) Struktur ${name}`, () => {
    const lv = laden(name);
    const ids = [lv.id, ...lv.knoten.map((k) => k.id)];
    assert.equal(new Set(ids).size, ids.length, 'IDs nicht eindeutig');
    for (const id of ids) assert.match(id, UUID7);
    const bekannt = new Set(ids);
    const art = new Map(lv.knoten.map((k) => [k.id, k.art]));
    const positionsart = new Map(lv.knoten.map((k) => [k.id, k.positionsart]));
    for (const k of lv.knoten) {
      assert.ok(bekannt.has(k.parentId), `Elternknoten fehlt: ${k.id}`);
      assert.ok(k.parentId === lv.id || art.get(k.parentId) === 'titel', 'Eltern sind nur LV oder Titel');
      if (k.art === 'position') {
        assert.equal('bezugspositionId' in k, false, 'Altform der Zuschlagsposition (seit Ticket 51 GAEB-Form)');
        if (k.positionsart === 'zuschlag') {
          // GAEB-Form (Ticket 51): Satz und Bezugsform Liste, keine Menge, Einheit, EP; Bezug ist eine Normalposition
          assert.deepEqual([k.menge, k.einheit, k.einheitspreis], [null, null, null]);
          assert.match(k.zuschlag.prozentsatz, /^\d+\.\d{2}$/);
          assert.equal(k.zuschlag.bezug.art, 'positionen');
          assert.ok(k.zuschlag.bezug.positionen.length > 0);
          for (const b of k.zuschlag.bezug.positionen) {
            assert.equal(art.get(b.positionId), 'position');
            assert.equal(positionsart.get(b.positionId), 'normal');
            assert.equal(b.teilmenge, null);
          }
        } else {
          assert.equal(k.zuschlag, undefined);
          assert.match(k.menge, DEZIMAL);
          assert.equal(k.menge.split('.')[1].length, 3);
          assert.equal(k.einheitspreis.split('.')[1].length, 3);
        }
        if (k.grundpositionId) assert.equal(art.get(k.grundpositionId), 'position');
        if (k.positionsart === 'wahl') assert.ok(k.grundpositionId);
      }
    }
    // Elternkette ist azyklisch und erreicht das LV
    const eltern = new Map(lv.knoten.map((k) => [k.id, k.parentId]));
    for (const k of lv.knoten) {
      let id = k.id, schritte = 0;
      while (id !== lv.id) { id = eltern.get(id); assert.ok(++schritte < 10, 'Zyklus oder zu tief'); }
    }
    // alle Dezimalwerte der Sollwerte sind Strings
    const s = lv.sollwerte;
    for (const p of Object.values(s.positionen)) assert.match(p.gp, DEZIMAL);
    // Ausweise (Ticket 51, nur GAEB-Form): Summe der obersten Titel = LV-Wert; Netto = Summe der Beträge mit inSumme
    if (s.ausweise) {
      const obersteTitel = lv.knoten.filter((k) => k.art === 'titel' && k.parentId === lv.id);
      for (const feld of ['summeBedarfOhneGesamtbetrag', 'summeWahl']) {
        const summe = obersteTitel.reduce((a, k) => a + parse(s.ausweise.titel[k.id][feld], 2), 0n);
        assert.equal(format(summe, 2), s.ausweise.gesamt[feld], feld);
      }
      let netto = 0n;
      for (const p of Object.values(s.positionen)) if (p.inSumme) netto += parse(p.gp, 2);
      assert.equal(format(netto, 2), s.summen.netto);
    }
    for (const t of Object.values(s.titel)) assert.match(t.summe, DEZIMAL);
    for (const v of Object.values(s.summen)) assert.match(v, DEZIMAL);
    assert.deepEqual(Object.keys(s.titel).sort(), lv.knoten.filter((k) => k.art === 'titel').map((k) => k.id).sort());
    // Summe der Titel der obersten Ebene = Netto
    const oben = lv.knoten.filter((k) => k.art === 'titel' && k.parentId === lv.id);
    const summeOben = oben.reduce((a, k) => a + parse(s.titel[k.id].summe, 2), 0n);
    assert.equal(format(summeOben, 2), s.summen.netto);
    // Nachlass: Rundungsvariante "Netto nach Nachlass runden" liefert dasselbe (Annahme A6)
    if (lv.nachlass?.art === 'prozent') {
      const n6 = parse(s.summen.netto, 2) * 10000n - parse(s.summen.netto, 2) * parse(lv.nachlass.wert, 2);
      assert.equal(format(rundeHalfUp(n6, 6, 2), 2), s.summen.nettoNachNachlass);
    }
    assert.ok(statSync(datei(name)).size < 5 * 1024 * 1024, 'Datei >= 5 MB');
  });
}

test('typisch: Umfang und Positionsarten', () => {
  const lv = laden('typisch.json');
  const pos = lv.knoten.filter((k) => k.art === 'position');
  assert.equal(lv.knoten.filter((k) => k.art === 'titel').length, 3);
  assert.ok(pos.length >= 24 && pos.length <= 26, `Positionen: ${pos.length}`);
  const arten = (a) => pos.filter((p) => p.positionsart === a).length;
  assert.equal(arten('bedarf'), 1);
  assert.equal(arten('wahl'), 1);
  assert.equal(arten('zuschlag'), 1);
  assert.equal(pos.filter((p) => p.ozIndex).length, 2);
  assert.equal(lv.mwstSatz, '19.00');
  assert.ok(lv.nachlass);
  // Bedarf ohne Gesamtbetrag und Wahl: GP vorhanden, aber nicht in der Summe (Annahmen A1, A3)
  for (const p of pos.filter((x) => x.positionsart === 'bedarf' || x.positionsart === 'wahl')) {
    assert.equal(lv.sollwerte.positionen[p.id].inSumme, false);
  }
});

// ---------------------------------------------------------------- Ticket 51

test('typisch: Zuschlagsposition 02.0050 A in GAEB-Form, Zahlen aus Ticket 51 (von Hand nachgerechnet)', () => {
  const lv = laden('typisch.json');
  const s = lv.sollwerte;
  const nachOz = (oz) => lv.knoten.find((k) => k.ordnungszahl + (k.ozIndex ?? '') === oz);
  const z = nachOz('02.0050A');
  assert.equal(z.positionsart, 'zuschlag');
  assert.deepEqual(z.zuschlag, {
    prozentsatz: '8.50', bezug: { art: 'positionen', positionen: [{ positionId: nachOz('02.0050').id, teilmenge: null }] },
  });
  // Basis = GP 02.0050 = 38,750 x 168,900 = 6.544,875 -> 6.544,88; Betrag = 6.544,88 x 8,50 / 100 = 556,3148 -> 556,31
  assert.equal(s.positionen[nachOz('02.0050').id].gp, '6544.88');
  assert.deepEqual(s.zuschlaege, { [z.id]: { basis: '6544.88', betrag: '556.31' } });
  assert.deepEqual(s.positionen[z.id], { gp: '556.31', inSumme: true });
  const titel = (oz) => s.titel[nachOz(oz).id].summe;
  assert.equal(titel('01'), '5503.99');
  assert.equal(titel('02'), '25222.42'); // vorher 25.220,24 mit 554,13 (Altform); + 2,18
  assert.equal(titel('03'), '24739.18');
  // Netto 55.465,59; Nachlass 2 % = 1.109,3118 -> 1.109,31; MwSt 19 % von 54.356,28 = 10.327,6932 -> 10.327,69
  assert.deepEqual(s.summen, {
    netto: '55465.59', nachlass: '1109.31', nettoNachNachlass: '54356.28', mwst: '10327.69', brutto: '64683.97',
  });
  // Bedarf ohne Gesamtbetrag 01.0040 = 12,000 x 48,900 = 586,80; Wahl 02.0070 A = 96,000 x 61,250 = 5.880,00 (F4)
  assert.deepEqual(s.ausweise.gesamt, { summeBedarfOhneGesamtbetrag: '586.80', summeWahl: '5880.00' });
  assert.deepEqual(s.ausweise.titel[nachOz('01').id], { summeBedarfOhneGesamtbetrag: '586.80', summeWahl: '0.00' });
  assert.deepEqual(s.ausweise.titel[nachOz('02').id], { summeBedarfOhneGesamtbetrag: '0.00', summeWahl: '5880.00' });
  assert.deepEqual(s.ausweise.titel[nachOz('03').id], { summeBedarfOhneGesamtbetrag: '0.00', summeWahl: '0.00' });
  assert.deepEqual(berechneSollwerteGaeb(lv.knoten, preiseDesLv, lv.nachlass, lv.mwstSatz), s);
});

test('typisch-angebote: Zuschlagssatz statt EP, Betrag aus der Basis des Bieters', () => {
  const lv = laden('typisch.json');
  const set = laden('typisch-angebote.json');
  const nachOz = (oz) => lv.knoten.find((k) => k.ordnungszahl + (k.ozIndex ?? '') === oz).id;
  const z = nachOz('02.0050A');
  const bezug = nachOz('02.0050');
  const menge = parse(lv.knoten.find((k) => k.id === bezug).menge, 3);
  const saetze = [];
  for (const a of set.angebote) {
    const zeile = a.positionen.find((p) => p.positionId === z);
    assert.deepEqual(Object.keys(zeile).sort(), ['positionId', 'status', 'zuschlagssatz']);
    assert.match(zeile.zuschlagssatz, /^\d+\.\d{2}$/);
    saetze.push(zeile.zuschlagssatz);
    // Basis = round(Menge x EP des Bieters an 02.0050, 2), Betrag = round(Basis x Satz / 100, 2) (R1, R5, R7)
    const ep = parse(a.positionen.find((p) => p.positionId === bezug).einheitspreis, 3);
    const basis = gesamtpreis(menge, ep);
    const betrag = prozentVon(basis, parse(zeile.zuschlagssatz, 2));
    assert.deepEqual(a.sollwerte.zuschlaege[z], { basis: format(basis, 2), betrag: format(betrag, 2) });
    assert.deepEqual(a.sollwerte.positionen[z], { gp: format(betrag, 2), inSumme: true });
    const preise = new Map(a.positionen.map((p) => [p.positionId, p.status !== 'angeboten' ? null : {
      ep: p.einheitspreis === undefined ? null : parse(p.einheitspreis, 3),
      satz: p.zuschlagssatz === undefined ? null : parse(p.zuschlagssatz, 2),
    }]));
    assert.deepEqual(berechneSollwerteGaeb(lv.knoten, (k) => preise.get(k.id), a.nachlass, lv.mwstSatz), a.sollwerte);
  }
  // Satz des LV 8,50 x Promille des Bieters (A 1000, B 1060, C 930, je mit Streuung aus dem Seed), auf 2 Stellen
  assert.deepEqual(saetze, ['8.51', '9.10', '7.87']);
  assert.deepEqual(set.angebote.map((a) => a.sollwerte.zuschlaege[z]), [
    { basis: '6400.88', betrag: '544.71' }, // 38,750 x 165,184 = 6.400,88; x 8,51 % = 544,7149 -> 544,71
    { basis: '6780.48', betrag: '617.02' }, // 6.780,475 -> 6.780,48; x 9,10 % = 617,0237 -> 617,02
    { basis: '9817.31', betrag: '772.62' }, // 150 % des LV-EP: 9.817,3125 -> 9.817,31; x 7,87 % = 772,6223 -> 772,62
  ]);
  assert.deepEqual(set.angebote.map((a) => a.sollwerte.summen.brutto), ['66023.39', '67363.25', '67498.10']);
});

test('gross: genau 5.000 Positionen, 5 Gliederungsebenen, unter 5 MB', () => {
  const lv = laden('gross.json');
  assert.equal(lv.knoten.filter((k) => k.art === 'position').length, 5000);
  const eltern = new Map(lv.knoten.map((k) => [k.id, k.parentId]));
  let tiefe = 0;
  for (const k of lv.knoten.filter((x) => x.art === 'titel')) {
    let d = 0;
    for (let id = k.id; id !== lv.id; id = eltern.get(id)) d++;
    tiefe = Math.max(tiefe, d);
  }
  assert.equal(tiefe, 5);
  assert.ok(statSync(datei('gross.json')).size < 5 * 1024 * 1024);
});

test('typisch-angebote: drei Bieter, nicht angeboten ist nicht 0,00, Summen', () => {
  const lv = laden('typisch.json');
  const set = laden('typisch-angebote.json');
  assert.equal(set.lvId, lv.id);
  assert.equal(set.bieter.length, 3);
  assert.equal(set.angebote.length, 3);
  const alle = [lv.id, ...lv.knoten.map((k) => k.id), ...set.bieter.map((b) => b.id), ...set.angebote.map((a) => a.id)];
  assert.equal(new Set(alle).size, alle.length, 'IDs ueber LV und Angebote nicht eindeutig');
  for (const id of alle) assert.match(id, UUID7);
  const posIds = lv.knoten.filter((k) => k.art === 'position').map((k) => k.id);
  let nicht = 0, null0 = 0, nachlaesse = 0;
  for (const a of set.angebote) {
    assert.deepEqual(a.positionen.map((z) => z.positionId), posIds);
    for (const z of a.positionen) {
      if (z.status === 'nicht-angeboten') {
        nicht++;
        assert.equal('einheitspreis' in z, false);
        assert.equal(a.sollwerte.positionen[z.positionId].gp, null);
      } else if ('zuschlagssatz' in z) {
        assert.equal('einheitspreis' in z, false, 'Satz statt EP (Ticket 51)');
      } else {
        assert.match(z.einheitspreis, DEZIMAL);
        if (z.einheitspreis === '0.000') null0++;
      }
    }
    if (a.nachlass) nachlaesse++;
    assert.equal(a.sollwerte.nichtAngeboten.length, a.positionen.filter((z) => z.status === 'nicht-angeboten').length);
  }
  assert.equal(nicht, 1);
  assert.equal(null0, 1);
  assert.equal(nachlaesse, 1);
});

// ---------------------------------------------------------------- Ticket 75: Ausreißer nach D-05

/**
 * Ausreißer je Angebot, hier eigens aus den Angebotszeilen gerechnet (nicht über rechnen.mjs; Regel D-05, D-36.1,
 * D-44.1, README A7): je Position der EP des Bieters, an einer Zuschlagsposition sein Betrag; verglichen werden nur
 * Werte > 0 (Nullpreis und „nicht angeboten“ nie); ab 2 solchen Werten und Summe > 0 ist ein Wert Ausreißer, wenn
 * |n x Wert - Summe| x 100 > Schwelle x Summe (strikt, ganzzahlig). Liefert je Angebot die Positions-IDs in
 * Dokumentreihenfolge.
 */
function ausreisserGegenrechnung(lv, angebote, schwelleProzent) {
  const aus = angebote.map(() => []);
  for (const p of lv.knoten.filter((k) => k.art === 'position')) {
    const werte = angebote.map((a) => {
      if (p.zuschlag) {
        const betrag = a.sollwerte.zuschlaege[p.id]?.betrag;
        return betrag == null ? null : parse(betrag, 2);
      }
      const z = a.positionen.find((x) => x.positionId === p.id);
      return z.status === 'angeboten' ? parse(z.einheitspreis, 3) : null;
    });
    const bepreist = werte.filter((w) => w !== null && w > 0n);
    const n = BigInt(bepreist.length);
    const summe = bepreist.reduce((x, y) => x + y, 0n);
    if (n < 2n || summe === 0n) continue;
    werte.forEach((w, i) => {
      if (w === null || w <= 0n) return;
      const abw = n * w > summe ? n * w - summe : summe - n * w;
      if (abw * 100n > BigInt(schwelleProzent) * summe) aus[i].push(p.id);
    });
  }
  return aus;
}

test('typisch-angebote: Ausreißer nach D-05 (Werte > 0, Nullpreis und „nicht angeboten“ nie Ausreißer)', () => {
  const lv = laden('typisch.json');
  const set = laden('typisch-angebote.json');
  const a7 = set.ausreisserAnnahmeA7;
  const ozVon = new Map(lv.knoten.filter((k) => k.art === 'position').map((k) => [k.id, k.ordnungszahl + (k.ozIndex ?? '')]));
  assert.equal(a7.schwellePromille, '200');
  assert.match(a7.regel, /D-05/);
  assert.deepEqual(Object.keys(a7.jeAngebot), set.angebote.map((a) => a.id));
  assert.deepEqual(Object.values(a7.jeAngebot), ausreisserGegenrechnung(lv, set.angebote, 20));
  // Von Hand (README A7): nur Bieter C, an 02.0050 und 03.0030, beide nach oben.
  // 02.0050: EP 165,184 / 174,980 / 253,350; Summe 593,514; C: 3 x 253,350 - 593,514 = 166,536 > 0,20 x 593,514 = 118,7028.
  // 03.0030: EP 21,647 / 23,609 / 32,700; Summe 77,956; C: 98,100 - 77,956 = 20,144 > 15,5912.
  // 03.0080: C bietet 0,000 (Nullpreis, D-05), zählt nicht; A 2,107 und B 2,261 liegen je 0,077 (3,5 %) vom Mittel 2,184.
  // 02.0050 A (Beträge 544,71 / 617,02 / 772,62; Summe 1.934,35): C 383,51 < 386,87, knapp kein Ausreißer.
  assert.deepEqual(Object.values(a7.jeAngebot).map((ids) => ids.map((id) => ozVon.get(id))), [[], [], ['02.0050', '03.0030']]);
  // Schwelle 200 % (D-63.9): Bei 3 Werten > 0 liegt keiner mehr als 200 % über oder 100 % unter dem Mittel.
  assert.deepEqual(ausreisserGegenrechnung(lv, set.angebote, 200), [[], [], []]);
});

// ---------------------------------------------------------------- Ticket 75: Bedarfs- und Wahlsumme der LV-Fixtures

test('LV-Fixtures: Bedarfs- und Wahlsumme unabhängig gegengerechnet (F4; Sollwerte für den LV-Druck)', () => {
  for (const name of [...LVS, 'zuschlag.json']) {
    const lv = laden(name);
    // Hier eigens aus den Knoten: Summe von round_half_up(Menge x EP, 2) über Bedarf ohne Gesamtbetrag bzw. Wahl,
    // je Titel einschließlich Untertitel und für das LV (nicht über berechneSollwerteGaeb).
    const leer = () => ({ summeBedarfOhneGesamtbetrag: 0n, summeWahl: 0n });
    const titel = new Map(lv.knoten.filter((k) => k.art === 'titel').map((k) => [k.id, leer()]));
    const eltern = new Map(lv.knoten.map((k) => [k.id, k.parentId]));
    const gesamt = leer();
    let anzahl = 0;
    for (const k of lv.knoten) {
      if (k.art !== 'position') continue;
      const feld = k.positionsart === 'wahl' ? 'summeWahl'
        : k.positionsart === 'bedarf' && k.bedarfMitGesamtbetrag !== true ? 'summeBedarfOhneGesamtbetrag' : null;
      if (feld === null) continue;
      anzahl++;
      assert.equal(k.zuschlag, undefined, `${name}: Bedarf/Wahl als Zuschlagsposition kommt nicht vor`);
      const gp = gesamtpreis(parse(k.menge, 3), parse(k.einheitspreis, 3));
      gesamt[feld] += gp;
      for (let t = eltern.get(k.id); titel.has(t); t = eltern.get(t)) titel.get(t)[feld] += gp;
    }
    const alsText = (a) => ({
      summeBedarfOhneGesamtbetrag: format(a.summeBedarfOhneGesamtbetrag, 2), summeWahl: format(a.summeWahl, 2),
    });
    const ausweise = lv.sollwerte.ausweise;
    if (ausweise === undefined) {
      // winzig, zuschlag: keine Bedarfs- und keine Wahlposition, also beide Summen 0,00 (im Druck keine Zeile, D-58.4)
      assert.equal(anzahl, 0, `${name}: Bedarf oder Wahl, aber keine ausweise`);
      continue;
    }
    assert.ok(anzahl > 0, `${name}: ausweise ohne Bedarf und Wahl`);
    assert.deepEqual(ausweise.gesamt, alsText(gesamt), name);
    assert.deepEqual(ausweise.titel, Object.fromEntries([...titel].map(([id, a]) => [id, alsText(a)])), name);
  }
  // Von Hand (README): typisch 01.0040 = 12,000 x 48,900 = 586,80 (Titel 01); 02.0070 A = 96,000 x 61,250 = 5.880,00 (Titel 02).
  assert.deepEqual(laden('typisch.json').sollwerte.ausweise.gesamt, { summeBedarfOhneGesamtbetrag: '586.80', summeWahl: '5880.00' });
});

test('Dezimalwerte in JSON sind nie Zahlen', () => {
  const pruefe = (v, pfad) => {
    assert.notEqual(typeof v, 'number', `Zahl bei ${pfad}`);
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) pruefe(x, `${pfad}.${k}`);
  };
  for (const name of [...LVS, 'typisch-angebote.json', 'handbeispiele.json', 'zuschlag.json', 'typisch-abrechnung.json']) {
    pruefe(laden(name), name);
  }
});

// ---------------------------------------------------------------- Ticket 25

test('OZ-Maske: höchstens 14 Stellen einschließlich Index, Index genau 1 Zeichen (F2)', () => {
  for (const name of LVS) {
    const maske = laden(name).ozMaske.split(':')[0];
    assert.match(maske, /^[N.]+(\[I\])?$/, `${name}: Maske nicht lesbar: ${maske}`);
    const stellen = (maske.match(/N/g) ?? []).length + (maske.includes('[I]') ? 1 : 0);
    assert.ok(stellen <= 14, `${name}: Maske hat ${stellen} Stellen`);
  }
});

test('OZ-Maske: die vorhandenen Ordnungszahlen passen zur Maske der Datei', () => {
  for (const name of LVS) {
    const lv = laden(name);
    const maske = lv.ozMaske.split(':')[0];
    const teile = maske.replace('[I]', '').split('.');
    const mitIndex = maske.includes('[I]');
    for (const k of lv.knoten) {
      if (k.art === 'hinweis') continue;
      const oz = k.ordnungszahl.split('.');
      const soll = k.art === 'position' ? [...teile.slice(0, oz.length - 1), teile.at(-1)] : teile.slice(0, oz.length);
      assert.deepEqual(oz.map((t) => t.length), soll.map((t) => t.length), `${name}: ${k.ordnungszahl}`);
      if (k.ozIndex) assert.ok(mitIndex && k.ozIndex.length === 1, `${name}: Index ${k.ozIndex}`);
    }
  }
});

test('handbeispiele: jeder Dezimalwert in kanonischer Stellenzahl (N3)', () => {
  const hand = laden('handbeispiele.json');
  const stellen = (wert, n, pfad) => {
    assert.match(wert, DEZIMAL, pfad);
    assert.equal(wert.split('.')[1].length, n, `${pfad}: ${wert} hat nicht ${n} Nachkommastellen`);
  };
  for (const [i, g] of hand.gesamtpreise.entries()) {
    stellen(g.menge, 3, `gesamtpreise[${i}].menge`);
    stellen(g.einheitspreis, 3, `gesamtpreise[${i}].einheitspreis`);
    stellen(g.exakt, 6, `gesamtpreise[${i}].exakt`); // exaktes Zwischenergebnis Menge x EP, keine N3-Größe
    stellen(g.gp, 2, `gesamtpreise[${i}].gp`);
  }
  for (const [i, k] of hand.summenketten.entries()) {
    stellen(k.netto, 2, `summenketten[${i}].netto`);
    stellen(k.mwstSatz, 2, `summenketten[${i}].mwstSatz`);
    if (k.nachlass) stellen(k.nachlass.wert, 2, `summenketten[${i}].nachlass.wert`);
    for (const [feld, v] of Object.entries(k.soll)) stellen(v, 2, `summenketten[${i}].soll.${feld}`);
  }
});

test('gross: Dokumentreihenfolge (Eltern vor Kindern, Geschwister in Arrayreihenfolge), Sollwerte unverändert', () => {
  const lv = laden('gross.json');
  const kinder = new Map();
  for (const k of lv.knoten) {
    if (!kinder.has(k.parentId)) kinder.set(k.parentId, []);
    kinder.get(k.parentId).push(k.id);
  }
  const lauf = [];
  const besuche = (id) => { for (const kind of kinder.get(id) ?? []) { lauf.push(kind); besuche(kind); } };
  besuche(lv.id);
  assert.deepEqual(lv.knoten.map((k) => k.id), lauf);
  // Summen seit Ticket 51 eingefroren (Zuschlagspositionen in GAEB-Form; in der Altform, Stand 4396721: Netto
  // 147.417.712,57, Brutto 172.795.671,79). Einzelwerte neu aus den Knoten gerechnet.
  assert.deepEqual(lv.sollwerte.summen, {
    netto: '144513647.54', nachlass: '2167704.71', nettoNachNachlass: '142345942.83', mwst: '27045729.14', brutto: '169391671.97',
  });
  assert.deepEqual(lv.sollwerte.ausweise.gesamt, { summeBedarfOhneGesamtbetrag: '5442164.43', summeWahl: '3600459.51' });
  const neu = berechneSollwerteGaeb(lv.knoten, preiseDesLv, lv.nachlass, lv.mwstSatz);
  assert.deepEqual(neu, lv.sollwerte);
  // Zuschlagspositionen: Satz 1,00 bis 15,00 %, Betrag = round(GP der Bezugsposition x Satz / 100, 2)
  const byId = new Map(lv.knoten.map((k) => [k.id, k]));
  const zuschlaege = lv.knoten.filter((k) => k.positionsart === 'zuschlag');
  assert.equal(zuschlaege.length, 102);
  for (const k of zuschlaege) {
    const satz = parse(k.zuschlag.prozentsatz, 2);
    assert.ok(satz >= 100n && satz <= 1500n, k.zuschlag.prozentsatz);
    const bezug = byId.get(k.zuschlag.bezug.positionen[0].positionId);
    const gp = gesamtpreis(parse(bezug.menge, 3), parse(bezug.einheitspreis, 3));
    assert.deepEqual(lv.sollwerte.zuschlaege[k.id], { basis: format(gp, 2), betrag: format(prozentVon(gp, satz), 2) });
  }
});

// ---------------------------------------------------------------- Ticket 37

test('zuschlag: Sollwerte gleich den Goldens aus den amtlichen Prüfdateien (D-03)', () => {
  const lv = laden('zuschlag.json');
  const s = lv.sollwerte;
  const nachOz = (oz) => lv.knoten.find((k) => k.ordnungszahl === oz);
  const titel = (oz) => s.titel[nachOz(oz).id].summe;
  assert.equal(titel('01.01'), '1450.50');
  assert.equal(titel('01.02'), '1790.00');
  assert.equal(titel('01.03'), '819.10');
  assert.equal(titel('01'), '4059.60');
  assert.equal(titel('02'), '2791.00');
  assert.deepEqual(s.summen, {
    netto: '6850.60', nachlass: '0.00', nettoNachNachlass: '6850.60', mwst: '1301.61', brutto: '8152.21',
  });
  const betrag = (oz) => s.zuschlaege[nachOz(oz).id];
  assert.deepEqual(betrag('01.01.0040'), { basis: '955.00', betrag: '95.50' });
  assert.deepEqual(betrag('01.02.0040'), { basis: '1400.00', betrag: '140.00' });
  assert.deepEqual(betrag('01.02.0050'), { basis: '1400.00', betrag: '140.00' });
  assert.deepEqual(betrag('01.02.0070'), { basis: '100.00', betrag: '10.00' });
  assert.deepEqual(betrag('01.03.0030'), { basis: '400.00', betrag: '40.00' });
  assert.deepEqual(betrag('01.03.0040'), { basis: '2791.00', betrag: '279.10' });
  assert.deepEqual(s.epa.titel[nachOz('02').id], {
    lohn: '223.00', stoffe: '2312.00', geraete: '256.00', nachunternehmer: '0.00', sonstiges: '0.00', frei: '0.00',
  });
  // EP = Summe der Anteile (BVBS X86, 1.10.30.20: 27,910 = 2,230 + 23,120 + 2,560 + 0,000)
  const p = nachOz('02.0010');
  const summe = ['lohn', 'stoffe', 'geraete', 'nachunternehmer'].reduce((a, x) => a + parse(p.epa[x], 3), 0n);
  assert.equal(format(summe, 3), p.einheitspreis);
  assert.deepEqual(berechneZuschlagSollwerte(lv.knoten, lv.nachlass, lv.mwstSatz), s);
});

test('zuschlag: Struktur (IDs, Bezüge, alle drei Bezugsformen)', () => {
  const lv = laden('zuschlag.json');
  const ids = [lv.id, ...lv.knoten.map((k) => k.id)];
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, UUID7);
  const art = new Map(lv.knoten.map((k) => [k.id, k]));
  const formen = new Set();
  for (const k of lv.knoten.filter((x) => x.art === 'position')) {
    if (k.zuschlag) {
      formen.add(k.zuschlag.bezug.art);
      assert.equal(k.positionsart, 'zuschlag');
      assert.equal(k.menge, null);
      assert.equal(k.zuschlagskennzeichen, undefined);
      for (const b of k.zuschlag.bezug.positionen ?? []) {
        assert.equal(art.get(b.positionId)?.art, 'position');
        assert.equal(art.get(b.positionId)?.zuschlag, undefined);
      }
    } else {
      assert.match(k.menge, DEZIMAL);
      assert.equal(k.einheitspreis.split('.')[1].length, 3);
    }
  }
  assert.deepEqual([...formen].sort(), ['gliederung', 'kennzeichnung', 'positionen']);
});

// ---------------------------------------------------------------- Ticket 69: X84 der Angebote, Preisspiegel-Sollwerte

/**
 * Kleiner Prüfer für Wohlgeformtheit (XML 1.0, nur was die Fixtures brauchen: Deklaration, Elemente, Attribute, Text,
 * die fünf vordefinierten Entitäten). Liefert den Baum `{ name, attrs, kinder, text }`; wirft bei jedem Verstoß.
 */
function parseXmlStreng(text) {
  assert.ok(text.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n'), 'XML-Deklaration fehlt');
  const rest = text.slice(text.indexOf('\n') + 1);
  const NAME = '[A-Za-z_][A-Za-z0-9_.-]*';
  const TEXT_OK = /^(?:[^<>&]|&(?:amp|lt|gt|quot|apos);)*$/;
  const ATTR = new RegExp(`\\s+(${NAME})="((?:[^"<&]|&(?:amp|lt|gt|quot|apos);)*)"`, 'gy');
  const stapel = [];
  let wurzel = null;
  for (const m of rest.matchAll(/<[^>]*>|[^<]+/g)) {
    const t = m[0];
    if (!t.startsWith('<')) {
      assert.match(t, TEXT_OK, `ungültiger Text: ${t}`);
      if (stapel.length === 0) assert.equal(t.trim(), '', 'Text außerhalb des Wurzelelements');
      else stapel.at(-1).text += t;
      continue;
    }
    const ende = new RegExp(`^</(${NAME})\\s*>$`).exec(t);
    if (ende) {
      const offen = stapel.pop();
      assert.ok(offen, `schließendes Tag ohne öffnendes: ${t}`);
      assert.equal(ende[1], offen.name, `Tag ${offen.name} mit ${t} geschlossen`);
      continue;
    }
    const kopf = new RegExp(`^<(${NAME})`).exec(t);
    assert.ok(kopf, `ungültiges Tag: ${t}`);
    const leer = t.endsWith('/>');
    const attrText = t.slice(kopf[0].length, leer ? -2 : -1);
    const attrs = {};
    ATTR.lastIndex = 0;
    let pos = 0;
    for (let a = ATTR.exec(attrText); a; a = ATTR.exec(attrText)) {
      assert.equal(a[1] in attrs, false, `doppeltes Attribut ${a[1]}`);
      attrs[a[1]] = a[2];
      pos = ATTR.lastIndex;
    }
    assert.equal(attrText.slice(pos).trim(), '', `ungültige Attribute in ${t}`);
    const el = { name: kopf[1], attrs, kinder: [], text: '' };
    if (stapel.length === 0) {
      assert.equal(wurzel, null, 'mehr als ein Wurzelelement');
      wurzel = el;
    } else stapel.at(-1).kinder.push(el);
    if (!leer) stapel.push(el);
  }
  assert.equal(stapel.length, 0, 'nicht geschlossene Elemente');
  assert.ok(wurzel, 'kein Wurzelelement');
  return wurzel;
}

const kindEl = (el, name) => el?.kinder.find((k) => k.name === name);
const wertVon = (el, name) => kindEl(el, name)?.text;

test('typisch-angebote: X84 je Bieter wohlgeformt, Inhalt gleich dem Angebot (Ticket 69)', () => {
  const lv = laden('typisch.json');
  const set = laden('typisch-angebote.json');
  const ps = set.preisspiegel;
  assert.equal(ps.bieter.length, 3);
  const titelOz = new Map(lv.knoten.filter((k) => k.art === 'titel').map((k) => [k.id, k.ordnungszahl]));
  for (const [i, a] of set.angebote.entries()) {
    const b = ps.bieter[i];
    assert.equal(b.angebotId, a.id);
    assert.equal(b.bieterId, a.bieterId);
    assert.equal(b.name, set.bieter[i].name);
    assert.match(b.datei, /^angebote\/typisch-bieter-[a-c]\.x84$/);
    const text = readFileSync(datei(b.datei), 'utf8');
    const gaeb = parseXmlStreng(text);
    assert.equal(gaeb.name, 'GAEB');
    assert.equal(gaeb.attrs.xmlns, 'http://www.gaeb.de/GAEB_DA_XML/DA84/3.3');
    assert.equal(wertVon(kindEl(gaeb, 'GAEBInfo'), 'Version'), '3.3');
    const award = kindEl(gaeb, 'Award');
    assert.equal(wertVon(award, 'DP'), '84');
    assert.equal(wertVon(kindEl(kindEl(award, 'CTR'), 'Address'), 'Name1'), set.bieter[i].name);
    // C4: kein echter Firmenname, keine Adresse
    assert.deepEqual(kindEl(kindEl(award, 'CTR'), 'Address').kinder.map((k) => k.name), ['Name1']);
    const boq = kindEl(award, 'BoQ');
    const info = kindEl(boq, 'BoQInfo');
    // Maske wie der X83-Export von typisch: zwei Titelebenen je 2, Position 4, Index 1 (alphanumerisch)
    assert.deepEqual(
      info.kinder.filter((k) => k.name === 'BoQBkdn')
        .map((k) => `${wertVon(k, 'Type')}:${wertVon(k, 'Length')}:${wertVon(k, 'Num')}`),
      ['BoQLevel:2:Yes', 'BoQLevel:2:Yes', 'Item:4:Yes', 'Index:1:No'],
    );
    // Summen und Nachlass des Angebots in BoQInfo/Totals (Nachlass G-26: genau einer, auf LV-Ebene)
    const tot = kindEl(info, 'Totals');
    const s = a.sollwerte.summen;
    assert.equal(wertVon(tot, 'Total'), s.netto);
    assert.equal(wertVon(tot, 'DiscountPcnt'), a.nachlass?.wert);
    assert.equal(wertVon(tot, 'TotAfterDisc'), a.nachlass ? s.nettoNachNachlass : undefined);
    assert.equal(wertVon(tot, 'VAT'), lv.mwstSatz);
    assert.equal(wertVon(tot, 'VATAmount'), s.mwst);
    assert.equal(wertVon(tot, 'TotalGross'), s.brutto);
    // Zeilen: je Position genau eine, über OZ (Titel-RNoPart + Item-RNoPart + RNoIndex) zugeordnet
    const zeilen = new Map();
    for (const ctgy of kindEl(boq, 'BoQBody').kinder) {
      assert.equal(ctgy.name, 'BoQCtgy');
      const titel = lv.knoten.find((k) => k.art === 'titel' && k.ordnungszahl === ctgy.attrs.RNoPart);
      assert.ok(titel, `Titel ${ctgy.attrs.RNoPart}`);
      assert.equal(wertVon(kindEl(ctgy, 'Totals'), 'Total'), a.sollwerte.titel[titel.id].summe);
      for (const z of kindEl(kindEl(ctgy, 'BoQBody'), 'Itemlist').kinder) {
        const oz = `${ctgy.attrs.RNoPart}.${z.attrs.RNoPart}${z.attrs.RNoIndex ?? ''}`;
        assert.equal(zeilen.has(oz), false, `doppelte OZ ${oz}`);
        zeilen.set(oz, z);
      }
    }
    const ids = [...text.matchAll(/ ID="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, 'GAEB-IDs nicht eindeutig');
    for (const id of ids) assert.match(id, /^[A-Za-z][A-Za-z0-9]*$/);
    const positionen = lv.knoten.filter((k) => k.art === 'position');
    assert.equal(zeilen.size, positionen.length);
    for (const p of positionen) {
      const z = zeilen.get(p.ordnungszahl + (p.ozIndex ?? ''));
      assert.ok(z, `Zeile ${p.ordnungszahl}${p.ozIndex ?? ''} fehlt`);
      assert.equal(titelOz.get(p.parentId), p.ordnungszahl.split('.')[0]);
      const ap = a.positionen.find((x) => x.positionId === p.id);
      const soll = a.sollwerte.positionen[p.id];
      if (ap.status === 'nicht-angeboten') {
        // „nicht angeboten“: Zeile ohne UP und ohne IT (Ticket 45: UP fehlt -> nicht angeboten)
        assert.deepEqual([z.name, z.kinder.length], ['Item', 0]);
      } else if (p.zuschlag) {
        assert.equal(z.name, 'MarkupItem');
        assert.deepEqual(z.kinder.map((k) => k.name), ['ITMarkup', 'Markup', 'IT']);
        assert.equal(wertVon(z, 'ITMarkup'), a.sollwerte.zuschlaege[p.id].basis);
        assert.equal(wertVon(z, 'Markup'), ap.zuschlagssatz);
        assert.equal(wertVon(z, 'IT'), soll.gp);
      } else {
        assert.equal(z.name, 'Item');
        assert.deepEqual(z.kinder.map((k) => k.name), ['UP', 'IT']);
        assert.equal(wertVon(z, 'UP'), ap.einheitspreis);
        assert.equal(wertVon(z, 'IT'), soll.gp);
      }
    }
  }
});

test('typisch-angebote: Preisspiegel-Sollwerte, Rang und virtuelle Bieter (Ticket 69, D-05, D-36.1)', () => {
  const lv = laden('typisch.json');
  const set = laden('typisch-angebote.json');
  const ps = set.preisspiegel;
  const titelOz = new Map(lv.knoten.filter((k) => k.art === 'titel').map((k) => [k.id, k.ordnungszahl]));
  for (const [i, a] of set.angebote.entries()) {
    assert.deepEqual(ps.bieter[i].summen, a.sollwerte.summen);
    assert.deepEqual(
      ps.bieter[i].titel,
      Object.fromEntries(Object.entries(a.sollwerte.titel).map(([id, t]) => [titelOz.get(id), t.summe])),
    );
  }
  // Bedarfs- und Wahlsumme je Bieter (F4, Review Welle 4 P1), hier eigens aus den Zeilen der Angebote gegengerechnet:
  // Summe von round_half_up(Menge x EP des Bieters, 2) über Bedarf ohne Gesamtbetrag bzw. Wahl.
  const ausweis = (a, passt) => format(lv.knoten.filter((k) => k.art === 'position' && passt(k)).reduce((s, k) => {
    const z = a.positionen.find((x) => x.positionId === k.id);
    return z.status === 'angeboten' ? s + gesamtpreis(parse(k.menge, 3), parse(z.einheitspreis, 3)) : s;
  }, 0n), 2);
  for (const [i, a] of set.angebote.entries()) {
    assert.deepEqual(ps.bieter[i].ausweise, {
      summeBedarfOhneGesamtbetrag: ausweis(a, (k) => k.positionsart === 'bedarf' && k.bedarfMitGesamtbetrag !== true),
      summeWahl: ausweis(a, (k) => k.positionsart === 'wahl'),
    });
  }
  // Von Hand (README): Bieter A 12,000 x 50,123 = 601,476 -> 601,48; 96,000 x 60,148 = 5.774,208 -> 5.774,21.
  assert.deepEqual(ps.bieter[0].ausweise, { summeBedarfOhneGesamtbetrag: '601.48', summeWahl: '5774.21' });
  const [A, B, C] = set.angebote.map((a) => a.id);
  assert.deepEqual(ps.vergleiche.map((v) => v.angebotIds), [[A, B, C], [A, B], [A, C], [B, C]]);
  // Rang nach Netto nach Nachlass: A 55.481,84 < B 56.607,77 < C 56.721,09
  assert.deepEqual(ps.vergleiche.map((v) => v.rang), [
    { [A]: '1', [B]: '2', [C]: '3' }, { [A]: '1', [B]: '2' }, { [A]: '1', [C]: '2' }, { [B]: '1', [C]: '2' },
  ]);

  // Gegenrechnung der virtuellen Bieter, hier eigens aus den Zeilen der Angebote (nicht über rechnen.mjs):
  // je eingehender Position des LV Werte > 0 (EP; an der Zuschlagsposition der Betrag); Min, Max; Mittel = Σ / n
  // kaufmännisch auf 3 (EP) bzw. 2 Stellen (Betrag); GP = round_half_up(Menge x EP, 2); Netto = Summe der GP.
  const eingehend = lv.knoten.filter((k) => k.art === 'position'
    && (k.positionsart === 'normal' || k.positionsart === 'zuschlag' || k.bedarfMitGesamtbetrag === true));
  const virtuell = (angebote) => {
    const sum = { min: 0n, mittel: 0n, max: 0n };
    for (const p of eingehend) {
      const werte = angebote.flatMap((a) => {
        if (p.zuschlag) {
          const betrag = a.sollwerte.zuschlaege[p.id]?.betrag;
          return betrag == null ? [] : [parse(betrag, 2)];
        }
        const z = a.positionen.find((x) => x.positionId === p.id);
        return z.status === 'angeboten' ? [parse(z.einheitspreis, 3)] : [];
      }).filter((w) => w > 0n);
      if (werte.length === 0) continue;
      const n = BigInt(werte.length);
      const summe = werte.reduce((x, y) => x + y, 0n);
      const mittel = (summe * 2n + n) / (2n * n); // round_half_up(summe / n), Werte >= 0
      const gp = (w) => (p.zuschlag ? w : gesamtpreis(parse(p.menge, 3), w));
      sum.min += gp(werte.reduce((x, y) => (y < x ? y : x)));
      sum.max += gp(werte.reduce((x, y) => (y > x ? y : x)));
      sum.mittel += gp(mittel);
    }
    return {
      min: format(sum.min, 2), mittel: format(sum.mittel, 2), max: format(sum.max, 2),
      schaetzpreis: lv.sollwerte.summen.netto,
    };
  };
  for (const v of ps.vergleiche) {
    const angebote = v.angebotIds.map((id) => set.angebote.find((a) => a.id === id));
    assert.deepEqual(v.virtuelleSummen, virtuell(angebote));
    const w = [v.virtuelleSummen.min, v.virtuelleSummen.mittel, v.virtuelleSummen.max].map((x) => parse(x, 2));
    assert.ok(w[0] <= w[1] && w[1] <= w[2], 'Min <= Mittel <= Max');
  }
  // Von Hand: 02.0050 A vergleicht Beträge 544,71 / 617,02 / 772,62; Mittel 1.934,35 / 3 = 644,7833 -> 644,78.
  // 03.0070 (B nicht angeboten): Mittel über A und C. 03.0080 (C 0,000): Mittel nur über A und B (D-05).
  assert.equal(ps.vergleiche[0].virtuelleSummen.schaetzpreis, '55465.59');
});

// ---------------------------------------------------------------- Ticket 85: M4-Abrechnung (D-38)
//
// Sollwerte des Tors M4 (D-38): Zuschlag an Bieter B (D-21), Nachtrag N01 (D-35), Aufmaßblätter mit Formel 91,
// Abschlagsrechnungen nach der Abzugskette (D-34), Soll/Ist (D-35, VOB/B § 2 Abs. 3), Kostenkontrolle (D-37).
// Jede Zahl wird hier ein zweites Mal gerechnet: von Hand (Literale mit Rechenweg) und eigens aus den Eingaben der
// Fixture (Gegenrechnung ohne die M4-Funktionen von rechnen.mjs, nur mit parse/format/gesamtpreis/prozentVon).
// Nie aus `kern`, `vergabe`, `abrechnung`, `kosten` oder `mengen`.

const M4 = 'typisch-abrechnung.json';
/** Betrag mit Vorzeichen (E-07: Vorzeichen vor den Betrag); -179411n -> "-1794.11". */
const mitVz = (w) => (w < 0n ? `-${format(-w, 2)}` : format(w, 2));
const ohneVz = (t) => (t.startsWith('-') ? -parse(t.slice(1), 2) : parse(t, 2));

/**
 * Formel 91 (freier Rechenansatz, Ticket 35; MENGEN_ANNAHMEN): eigens gerechnet für die Teilmenge, die die Fixture
 * nutzt: Zahlen mit Dezimalkomma, + - * und Klammern, Punkt vor Strich, exakt; das Zeilenergebnis kaufmännisch auf 3
 * Stellen (Menge, N3). Eine Division kommt absichtlich nicht vor (sie würde vorher auf 10 Stellen runden).
 */
function formel91(ausdruck) {
  const t = ausdruck.match(/\d+(?:,\d+)?|[-+*()]/g) ?? [];
  assert.equal(t.join(''), ausdruck, `nur Zahlen, + - * und Klammern ohne Leerraum: ${ausdruck}`);
  let i = 0;
  const zahl = (s) => {
    const [ganz, nach = ''] = s.split(',');
    return { w: BigInt(ganz + nach), s: nach.length };
  };
  const primaer = () => {
    const x = t[i++];
    if (x !== '(') return zahl(x);
    const v = summe();
    assert.equal(t[i++], ')');
    return v;
  };
  const produkt = () => {
    let v = primaer();
    while (t[i] === '*') {
      i++;
      const r = primaer();
      v = { w: v.w * r.w, s: v.s + r.s };
    }
    return v;
  };
  const summe = () => {
    let v = produkt();
    while (t[i] === '+' || t[i] === '-') {
      const op = t[i++];
      const r = produkt();
      const s = Math.max(v.s, r.s);
      const a = v.w * 10n ** BigInt(s - v.s);
      const b = r.w * 10n ** BigInt(s - r.s);
      v = { w: op === '+' ? a + b : a - b, s };
    }
    return v;
  };
  const v = summe();
  assert.equal(i, t.length, `Rest im Ausdruck: ${ausdruck}`);
  assert.ok(v.w >= 0n, 'negative Zeilen kommen in der Fixture nicht vor');
  return format(rundeHalfUp(v.w, v.s, 3), 3);
}

/** Eingaben der Gegenrechnung, nur aus typisch, typisch-angebote und den Eingabefeldern der M4-Fixture. */
function m4Eingaben() {
  const lv = laden('typisch.json');
  const set = laden('typisch-angebote.json');
  const fx = laden(M4);
  const angebot = set.angebote.find((a) => a.id === fx.zuschlag.angebotId);
  const zeile = new Map([...angebot.positionen, ...fx.nachtrag.angebot.positionen].map((z) => [z.positionId, z]));
  const knoten = new Map([...lv.knoten, ...fx.nachtrag.lv.knoten].map((k) => [k.id, k]));
  const ep = (id) => {
    const z = zeile.get(id);
    return z?.status === 'angeboten' && z.einheitspreis !== undefined ? parse(z.einheitspreis, 3) : null;
  };
  const ozVon = new Map(fx.positionen.map((p) => [p.positionId, p.oz]));
  const idVon = new Map(fx.positionen.map((p) => [p.oz, p.positionId]));
  return { lv, set, fx, angebot, zeile, knoten, ep, ozVon, idVon };
}

/** Kumulierte Aufmaßmenge je Position (D-34 (1)): Summe der Blattmengen, Zeilen ohne Menge zählen nicht. */
function kumuliert(aufmasse) {
  const m = new Map();
  for (const a of aufmasse) {
    for (const z of a.positionen) {
      if (z.menge !== null) m.set(z.positionId, (m.get(z.positionId) ?? 0n) + parse(z.menge, 3));
    }
  }
  return m;
}

/**
 * Leistungsstand (D-34 (1)-(3), D-70.7) eigens gerechnet: je Position des Auftrags-LV eine Zeile; GP =
 * round(kumulierte Menge x Vertrags-EP, 2), ohne Menge oder EP 0,00; Bedarf zählt, sobald aufgemessen; Zuschlagsposition
 * = round(Σ GP der Bezugspositionen x Satz / 100, 2); Nachlass = round(Leistung x 3,00 %, 2).
 */
function leistungsstandGegen(e, aufmasse) {
  const kum = kumuliert(aufmasse);
  const gp = new Map();
  for (const p of e.fx.positionen) {
    const m = kum.get(p.positionId) ?? null;
    const preis = e.ep(p.positionId);
    gp.set(p.positionId, m === null || preis === null ? 0n : gesamtpreis(m, preis));
  }
  for (const p of e.fx.positionen) {
    const k = e.knoten.get(p.positionId);
    if (!k.zuschlag) continue;
    const basis = k.zuschlag.bezug.positionen.reduce((s, b) => s + gp.get(b.positionId), 0n);
    gp.set(p.positionId, prozentVon(basis, parse(e.zeile.get(p.positionId).zuschlagssatz, 2)));
  }
  const leistung = [...gp.values()].reduce((a, b) => a + b, 0n);
  const nachlass = prozentVon(leistung, parse(e.fx.zuschlag.nachlass.wert, 2));
  return {
    positionen: e.fx.positionen.map((p) => ({
      positionId: p.positionId,
      menge: kum.has(p.positionId) ? format(kum.get(p.positionId), 3) : null,
      gp: format(gp.get(p.positionId), 2),
    })),
    leistung: format(leistung, 2),
    nachlass: format(nachlass, 2),
    nettoNachNachlass: format(leistung - nachlass, 2),
  };
}

/** Abzugskette D-34 (4)-(7), eigens gerechnet: jeder Schritt auf 2 Stellen, dann verrechnet. */
function ketteGegen(ls, rechnung, frueher) {
  const nnn = parse(ls.nettoNachNachlass, 2);
  const mwst = prozentVon(nnn, parse('19.00', 2));
  const brutto = nnn + mwst;
  const umlagen = rechnung.umlagen.map((u) => ({
    bezeichnung: u.bezeichnung, satz: u.satz, betrag: format(prozentVon(brutto, parse(u.satz, 2)), 2),
  }));
  const einbehalt = prozentVon(brutto, parse(rechnung.sicherheitSatz, 2));
  const zahl = brutto - umlagen.reduce((s, u) => s + parse(u.betrag, 2), 0n) - einbehalt - frueher;
  return {
    leistung: ls.leistung, nachlass: ls.nachlass, nettoNachNachlass: ls.nettoNachNachlass, mwst: format(mwst, 2),
    bruttoKumuliert: format(brutto, 2), umlagen, einbehalt: format(einbehalt, 2),
    fruehereZahlbetraege: format(frueher, 2), zahlbetrag: mitVz(zahl),
  };
}

test('typisch-abrechnung: Struktur, Kennungen und Bezüge (Ticket 85)', () => {
  const { lv, set, fx } = m4Eingaben();
  assert.equal(fx.schemaVersion, 'fixture-v1');
  assert.equal(fx.art, 'abrechnungsset');
  assert.equal(fx.lvId, lv.id);
  // Kennungen: UUIDv7-förmig und über typisch, typisch-angebote und diese Datei eindeutig
  const neu = [
    fx.projektId, fx.zuschlag.auftragsLvId, fx.nachtrag.lv.id, ...fx.nachtrag.lv.knoten.map((k) => k.id),
    fx.nachtrag.angebot.id, fx.nachtrag.uebernahme.knoten[0].id, fx.kostenermittlung.id,
    ...fx.aufmasse.map((a) => a.aufmass.id), ...fx.rechnungen.map((r) => r.id),
  ];
  for (const id of neu) assert.match(id, UUID7);
  const alle = [
    lv.id, ...lv.knoten.map((k) => k.id), ...set.bieter.map((b) => b.id), ...set.angebote.map((a) => a.id), ...neu,
  ];
  assert.equal(new Set(alle).size, alle.length, 'Kennungen nicht eindeutig');
  // Zuschlag an Bieter B mit 3,00 % Nachlass (D-38), ohne Wahl (D-85.1)
  const b = set.bieter.find((x) => x.name === 'Bieter B');
  assert.deepEqual([fx.zuschlag.bieterId, fx.zuschlag.bieterName], [b.id, 'Bieter B']);
  assert.equal(set.angebote.find((a) => a.id === fx.zuschlag.angebotId).bieterId, b.id);
  assert.deepEqual(fx.zuschlag.nachlass, { art: 'prozent', wert: '3.00' });
  assert.deepEqual(fx.zuschlag.gewaehlt, []);
  // Positionen des Auftrags-LV nach dem Nachtrag: typisch ohne die Wahl-Alternative, dann die zwei Nachtragspositionen
  const typischPos = lv.knoten.filter((k) => k.art === 'position' && k.positionsart !== 'wahl');
  const nachtragPos = fx.nachtrag.lv.knoten.filter((k) => k.art === 'position');
  assert.deepEqual(fx.positionen.map((p) => p.positionId), [...typischPos, ...nachtragPos].map((k) => k.id));
  // Aufmaß- und Rechnungsbezüge
  const posIds = new Set(fx.positionen.map((p) => p.positionId));
  const blattIds = fx.aufmasse.map((a) => a.aufmass.id);
  for (const { aufmass } of [...fx.aufmasse, { aufmass: fx.korrektur.aufmassNachher }]) {
    assert.deepEqual([aufmass.projektId, aufmass.auftragsLvId], [fx.projektId, fx.zuschlag.auftragsLvId]);
    for (const z of aufmass.positionen) assert.ok(posIds.has(z.positionId), z.positionId);
    const ids = new Set(aufmass.positionen.map((z) => z.positionId));
    assert.equal(ids.size, aufmass.positionen.length, 'eine Zeile je Position');
  }
  assert.deepEqual(fx.aufmasse.map((a) => a.aufmass.nummer), ['1', '2']); // Nummern als Text (D-85.4)
  assert.deepEqual(fx.rechnungen.map((r) => [r.nummer, r.art, r.aufmassIds]), [
    ['1', 'abschlag', [blattIds[0]]], ['2', 'abschlag', blattIds],
  ]);
  for (const r of fx.rechnungen) {
    assert.deepEqual([r.projektId, r.auftragsLvId, r.gefordert], [fx.projektId, fx.zuschlag.auftragsLvId, null]);
    assert.deepEqual(r.umlagen, [{ bezeichnung: 'Bauwesenversicherung', satz: '0.50' }]);
    assert.deepEqual([r.sicherheitSatz, r.gewaehrleistungSatz], ['5.00', null]);
  }
  // Freigabe: AR 1 eingefroren mit dem geprüften Zahlbetrag, AR 2 offen (Freigaben sind die kleinsten Nummern)
  assert.deepEqual(fx.rechnungen[0].freigabe, { zahlbetrag: fx.pruefungen.ar1.kette.zahlbetrag });
  assert.equal(fx.rechnungen[1].freigabe, null);
  assert.equal(fx.korrektur.aufmassId, blattIds[0]);
  assert.equal(fx.kostenermittlung.stufe, 'kostenberechnung');
  assert.equal(fx.kostenermittlung.projektId, fx.projektId);
});

test('typisch-abrechnung: Zuschlag an Bieter B ergibt das Auftrags-LV (D-21), von Hand', () => {
  const { lv, set, fx, idVon } = m4Eingaben();
  const s = fx.zuschlag.sollwerte;
  // Die Alternative 02.0070 A entfällt (keine Wahl, D-21), 03.0070 hat keinen Preis (B nicht angeboten, Warnung).
  const ozLv = (oz) => lv.knoten.find((k) => k.ordnungszahl + (k.ozIndex ?? '') === oz).id;
  assert.deepEqual(fx.zuschlag.entfallen, [ozLv('02.0070A')]);
  assert.deepEqual(fx.zuschlag.ohnePreis, [ozLv('03.0070')]);
  assert.deepEqual(s.nichtAngeboten, [ozLv('03.0070')]);
  assert.equal(idVon.has('02.0070A'), false);
  // Netto wie das Angebot B (die Wahl war nie im Netto): 58.358,53; Nachlass 58.358,53 x 3 % = 1.750,7559 -> 1.750,76;
  // MwSt 56.607,77 x 19 % = 10.755,4763 -> 10.755,48; Brutto 67.363,25 (N2, N5).
  assert.deepEqual(s.summen, {
    netto: '58358.53', nachlass: '1750.76', nettoNachNachlass: '56607.77', mwst: '10755.48', brutto: '67363.25',
  });
  // Bedarf bleibt Bedarf (12,000 x 50,709 = 608,508 -> 608,51), die Wahlsumme ist leer (Alternative entfallen).
  assert.deepEqual(s.ausweise.gesamt, { summeBedarfOhneGesamtbetrag: '608.51', summeWahl: '0.00' });
  const titel = (oz) => s.titel[lv.knoten.find((k) => k.art === 'titel' && k.ordnungszahl === oz).id].summe;
  assert.deepEqual(['01', '02', '03'].map(titel), ['5770.45', '26416.34', '26171.74']);
  // Gegenrechnung: GP je Position mit den EP und dem Satz von B, Summen nach N2/N5.
  const b = set.angebote.find((a) => a.id === fx.zuschlag.angebotId);
  const preise = new Map(b.positionen.map((p) => [p.positionId, p.status !== 'angeboten' ? null : {
    ep: p.einheitspreis === undefined ? null : parse(p.einheitspreis, 3),
    satz: p.zuschlagssatz === undefined ? null : parse(p.zuschlagssatz, 2),
  }]));
  const knoten = lv.knoten.filter((k) => k.positionsart !== 'wahl');
  assert.deepEqual(berechneSollwerteGaeb(knoten, (k) => preise.get(k.id), fx.zuschlag.nachlass, lv.mwstSatz), s);
  for (const [id, p] of Object.entries(s.positionen)) assert.equal(p.gp, b.sollwerte.positionen[id].gp, id);
});

test('typisch-abrechnung: Nachtrag N01, Knoten nach der Übernahme und Summen danach (D-35), von Hand', () => {
  const { fx } = m4Eingaben();
  const n = fx.nachtrag;
  assert.equal(n.lv.mwstSatz, '19.00'); // gleicher Satz wie das Auftrags-LV, sonst Fehler (D-35)
  assert.equal(n.lv.nachlass, null);
  assert.deepEqual(n.lv.nachtrag, { auftragsLvId: fx.zuschlag.auftragsLvId, nummer: 'N01', status: 'angeboten' });
  assert.equal(n.statusNachUebernahme, 'beauftragt');
  assert.equal(n.angebot.bieterId, fx.zuschlag.bieterId); // Nachtragsangebot vom Auftragnehmer (D-35)
  assert.equal(n.angebot.nachlass, null);
  const [titel, p1, p2] = n.lv.knoten;
  assert.deepEqual([titel.art, titel.ordnungszahl, titel.parentId], ['titel', '01', n.lv.id]);
  assert.deepEqual([p1, p2].map((p) => [p.ordnungszahl, p.menge, p.einheit, p.einheitspreis]), [
    ['01.0010', '24.000', 'm³', null], ['01.0020', '6.000', 'St', null], // Nachtrags-LV ohne Schätzpreis (D-85.6)
  ]);
  assert.deepEqual(n.angebot.positionen.map((z) => [z.positionId, z.status, z.einheitspreis]), [
    [p1.id, 'angeboten', '38.437'], [p2.id, 'angeboten', '87.125'],
  ]);
  // Übernahme (D-35, D-85.2): neue Gliederung „Nachtrag N01“ als Titel auf oberster Ebene (dort stehen Titel, F1), nächste
  // freie OZ 04 nach 01, 02, 03, ans Ende (Reihenfolge 3); darunter der Baum des Nachtrags mit seinen Kennungen, OZ mit
  // 04 davor, EP aus dem Angebot.
  const u = n.uebernahme;
  assert.deepEqual([u.art, u.nachtragLvId, u.gliederungReihenfolge], ['NachtragUebernehmen', n.lv.id, '3']);
  assert.deepEqual(u.knoten.map((k) => [k.art, k.ordnungszahl, k.kurztext]), [
    ['titel', '04', 'Nachtrag N01'], ['titel', '04.01', titel.kurztext],
    ['position', '04.01.0010', p1.kurztext], ['position', '04.01.0020', p2.kurztext],
  ]);
  assert.deepEqual(u.knoten.map((k) => k.parentId), [fx.zuschlag.auftragsLvId, u.knoten[0].id, titel.id, titel.id]);
  assert.deepEqual(u.knoten.slice(1).map((k) => k.id), [titel.id, p1.id, p2.id]);
  assert.deepEqual(u.knoten.slice(2).map((k) => [k.menge, k.einheit, k.einheitspreis]), [
    ['24.000', 'm³', '38.437'], ['6.000', 'St', '87.125'],
  ]);
  // Nachtragsangebot: 24,000 x 38,437 = 922,488 -> 922,49; 6,000 x 87,125 = 522,750 -> 522,75; Netto 1.445,24;
  // MwSt 1.445,24 x 19 % = 274,5956 -> 274,60; Brutto 1.719,84.
  assert.deepEqual(n.angebot.sollwerte.summen, {
    netto: '1445.24', nachlass: '0.00', nettoNachNachlass: '1445.24', mwst: '274.60', brutto: '1719.84',
  });
  // Auftrags-LV danach: Netto 58.358,53 + 1.445,24 = 59.803,77; Nachlass 3 % über das ganze Auftrags-LV samt Nachtrag
  // (D-34 (2), N5): 1.794,1131 -> 1.794,11; Netto n. N. 58.009,66; MwSt 11.021,8354 -> 11.021,84; Brutto 69.031,50.
  const s = n.sollwerte;
  assert.deepEqual(s.summen, {
    netto: '59803.77', nachlass: '1794.11', nettoNachNachlass: '58009.66', mwst: '11021.84', brutto: '69031.50',
  });
  assert.deepEqual([s.titel[u.knoten[0].id], s.titel[titel.id]], [{ summe: '1445.24' }, { summe: '1445.24' }]);
  assert.deepEqual([s.positionen[p1.id], s.positionen[p2.id]], [
    { gp: '922.49', inSumme: true }, { gp: '522.75', inSumme: true },
  ]);
  // Gegenrechnung: Netto = Netto vorher + GP der Nachtragspositionen; Nachlass, MwSt nach N2/N5.
  const netto = parse(fx.zuschlag.sollwerte.summen.netto, 2) + parse('922.49', 2) + parse('522.75', 2);
  assert.deepEqual(s.summen, summen(netto, fx.zuschlag.nachlass, '19.00'));
  assert.deepEqual(fx.gliederungen.map((g) => g.oz), ['01', '02', '03', '04', '04.01']);
});

test('typisch-abrechnung: Aufmaßblätter, Formel-91-Zeilen eigens gerechnet', () => {
  const { fx, ozVon } = m4Eingaben();
  const blaetter = [...fx.aufmasse, { aufmass: fx.korrektur.aufmassNachher, zeilenergebnisse: null }];
  for (const { aufmass, zeilenergebnisse } of blaetter) {
    for (const z of aufmass.positionen) {
      if (z.mengenansatz === null) continue;
      const ergebnisse = z.mengenansatz.map((a) => {
        assert.deepEqual([a.formel, a.variable], ['91', null]);
        return formel91(a.ausdruck);
      });
      if (zeilenergebnisse) assert.deepEqual(zeilenergebnisse[z.positionId], ergebnisse, ozVon.get(z.positionId));
      // Menge = Summe der gerundeten Zeilenergebnisse (MENGEN_ANNAHMEN.summe)
      assert.equal(z.menge, format(ergebnisse.reduce((s, x) => s + parse(x, 3), 0n), 3), ozVon.get(z.positionId));
    }
  }
  // Von Hand (Blatt 1): 0,5 = 0,500; 2*(25,5+17,75) = 2 x 43,25 = 86,500; 17*21*0,25 = 89,250; 12*9 = 108,000;
  // 02.0050 zwei Zeilen: 2*(12+9)*0,6*0,8 = 42 x 0,48 = 20,160 und 2,5*1,75*0,3 = 1,3125 -> 1,313 (kaufmännisch, .5),
  // zusammen 21,473; Nachtrag 04.01.0010: 6*4*0,5 = 12,000.
  const menge = (a) => Object.fromEntries(a.positionen.map((z) => [ozVon.get(z.positionId), z.menge]));
  assert.deepEqual(menge(fx.aufmasse[0].aufmass), {
    '01.0010': '0.500', '01.0020': '86.500', '02.0010': '89.250', '02.0040': '108.000', '02.0050': '21.473',
    '04.01.0010': '12.000',
  });
  const b1 = fx.aufmasse[0];
  assert.deepEqual(b1.zeilenergebnisse[b1.aufmass.positionen[4].positionId], ['20.160', '1.313']);
  // Blatt 2: 2*3,5 = 7,000 (Bedarf); 6*5,5*0,3 = 9,900; 2*(6+4,5)*0,6*0,8 = 21 x 0,48 = 10,080;
  // (12,5+8,25)*2,75*2 = 20,75 x 5,5 = 114,125; 6*4*0,6 = 14,400; 04.01.0020 von Hand 4,000 (kein Ansatz).
  assert.deepEqual(menge(fx.aufmasse[1].aufmass), {
    '01.0040': '7.000', '02.0010': '9.900', '02.0050': '10.080', '03.0010': '114.125', '04.01.0010': '14.400',
    '04.01.0020': '4.000',
  });
  assert.equal(fx.aufmasse[1].aufmass.positionen.at(-1).mengenansatz, null);
  // Korrektur an Blatt 1 nach der Freigabe von AR 1: 02.0010 mit 20 m statt 21 m Breite, 17*20*0,25 = 85,000; die Zeile
  // bleibt an ihrer Stelle (AufmasspositionSetzen), sonst ändert sich nichts.
  const k = fx.korrektur;
  assert.equal(k.befehl.art, 'AufmasspositionSetzen');
  assert.deepEqual([ozVon.get(k.befehl.position.positionId), k.befehl.position.menge, k.zeilenergebnisse], [
    '02.0010', '85.000', ['85.000'],
  ]);
  assert.deepEqual(k.aufmassNachher, {
    ...b1.aufmass,
    positionen: b1.aufmass.positionen.map((z) => (z.positionId === k.befehl.position.positionId ? k.befehl.position : z)),
  });
});

test('typisch-abrechnung: Abschlagsrechnungen nach der Abzugskette (D-34), eingefrorener Zahlbetrag (D-38)', () => {
  const e = m4Eingaben();
  const { fx } = e;
  const [b1, b2] = fx.aufmasse.map((a) => a.aufmass);
  const b1k = fx.korrektur.aufmassNachher;
  const [ar1, ar2] = fx.rechnungen;
  const p = fx.pruefungen;
  assert.deepEqual(
    [p.ar1.rechnungId, p.ar2VorKorrektur.rechnungId, p.ar2NachKorrektur.rechnungId], [ar1.id, ar2.id, ar2.id],
  );
  assert.deepEqual(
    [p.ar1.korrigiert, p.ar2VorKorrektur.korrigiert, p.ar2NachKorrektur.korrigiert], [false, false, true],
  );

  // Gegenrechnung jeder Zeile (Leistungsstand in Vertragsform, D-70.7) und jeder Zwischenzahl der Kette.
  const ls1 = leistungsstandGegen(e, [b1]);
  const ls2v = leistungsstandGegen(e, [b1, b2]);
  const ls2n = leistungsstandGegen(e, [b1k, b2]);
  assert.deepEqual(p.ar1.leistungsstand, ls1);
  assert.deepEqual(p.ar2VorKorrektur.leistungsstand, ls2v);
  assert.deepEqual(p.ar2NachKorrektur.leistungsstand, ls2n);
  assert.deepEqual(p.ar1.kette, ketteGegen(ls1, ar1, 0n));
  const eingefroren = parse(ar1.freigabe.zahlbetrag, 2); // gespeichert, nie neu gerechnet (D-34 (7))
  assert.deepEqual(p.ar2VorKorrektur.kette, ketteGegen(ls2v, ar2, eingefroren));
  assert.deepEqual(p.ar2NachKorrektur.kette, ketteGegen(ls2n, ar2, eingefroren));

  // Von Hand, AR 1 (Blatt 1): 0,500 x 1.951,750 = 975,875 -> 975,88 (kaufmännisch, .5); 86,500 x 7,726 = 668,299 ->
  // 668,30; 89,250 x 6,506 = 580,6605 -> 580,66; 108,000 x 12,502 = 1.350,216 -> 1.350,22; 21,473 x 174,980 =
  // 3.757,34554 -> 3.757,35; Zuschlag 02.0050 A: 3.757,35 x 9,10 % = 341,91885 -> 341,92; 04.01.0010: 12,000 x 38,437 =
  // 461,244 -> 461,24. Leistung 8.135,57; Nachlass 8.135,57 x 3 % = 244,0671 -> 244,07; Netto n. N. 7.891,50;
  // MwSt 7.891,50 x 19 % = 1.499,385 -> 1.499,39 (kaufmännisch, .5); Brutto 9.390,89; Umlage 0,50 % = 46,95445 -> 46,95;
  // Sicherheitseinbehalt 5 % = 469,5445 -> 469,54; Zahlbetrag 9.390,89 - 46,95 - 469,54 = 8.874,40.
  const gp = (ls) => Object.fromEntries(
    ls.positionen.filter((z) => z.gp !== '0.00').map((z) => [e.ozVon.get(z.positionId), z.gp]),
  );
  assert.deepEqual(gp(p.ar1.leistungsstand), {
    '01.0010': '975.88', '01.0020': '668.30', '02.0010': '580.66', '02.0040': '1350.22', '02.0050': '3757.35',
    '02.0050A': '341.92', '04.01.0010': '461.24',
  });
  const umlage = (betrag) => [{ bezeichnung: 'Bauwesenversicherung', satz: '0.50', betrag }];
  assert.deepEqual(p.ar1.kette, {
    leistung: '8135.57', nachlass: '244.07', nettoNachNachlass: '7891.50', mwst: '1499.39', bruttoKumuliert: '9390.89',
    umlagen: umlage('46.95'), einbehalt: '469.54', fruehereZahlbetraege: '0.00', zahlbetrag: '8874.40',
  });
  assert.equal(ar1.freigabe.zahlbetrag, '8874.40');

  // Von Hand, AR 2 vor der Korrektur (Blatt 1 + 2, kumuliert): dazu 01.0040 (Bedarf, zählt aufgemessen) 7,000 x 50,709 =
  // 354,963 -> 354,96; 02.0010 99,150 x 6,506 = 645,0699 -> 645,07; 02.0050 31,553 x 174,980 = 5.521,14394 -> 5.521,14;
  // Zuschlag 5.521,14 x 9,10 % = 502,42374 -> 502,42; 03.0010 114,125 x 52,699 = 6.014,273375 -> 6.014,27;
  // 04.01.0010 26,400 x 38,437 = 1.014,7368 -> 1.014,74; 04.01.0020 4,000 x 87,125 = 348,50. Leistung 17.395,50;
  // Nachlass 17.395,50 x 3 % = 521,865 -> 521,87 (kaufmännisch, .5); Netto n. N. 16.873,63; MwSt 3.205,9897 -> 3.205,99;
  // Brutto 20.079,62; Umlage 100,3981 -> 100,40; Einbehalt 1.003,981 -> 1.003,98;
  // Zahlbetrag 20.079,62 - 100,40 - 1.003,98 - 8.874,40 (eingefroren) = 10.100,84.
  assert.deepEqual(p.ar2VorKorrektur.kette, {
    leistung: '17395.50', nachlass: '521.87', nettoNachNachlass: '16873.63', mwst: '3205.99',
    bruttoKumuliert: '20079.62', umlagen: umlage('100.40'), einbehalt: '1003.98', fruehereZahlbetraege: '8874.40',
    zahlbetrag: '10100.84',
  });

  // Von Hand, AR 2 nach der Korrektur: 02.0010 85,000 + 9,900 = 94,900 x 6,506 = 617,4194 -> 617,42; Leistung
  // 17.395,50 - 645,07 + 617,42 = 17.367,85; Nachlass 521,0355 -> 521,04; Netto n. N. 16.846,81; MwSt 3.200,8939 ->
  // 3.200,89; Brutto 20.047,70; Umlage 100,2385 -> 100,24; Einbehalt 1.002,385 -> 1.002,39 (kaufmännisch, .5);
  // Zahlbetrag 20.047,70 - 100,24 - 1.002,39 - 8.874,40 = 10.070,67. AR 1 bleibt 8.874,40 (eingefroren).
  assert.deepEqual(p.ar2NachKorrektur.kette, {
    leistung: '17367.85', nachlass: '521.04', nettoNachNachlass: '16846.81', mwst: '3200.89',
    bruttoKumuliert: '20047.70', umlagen: umlage('100.24'), einbehalt: '1002.39', fruehereZahlbetraege: '8874.40',
    zahlbetrag: '10070.67',
  });

  // Gegenprobe ohne Einfrieren: AR 1 nach der Korrektur neu geprüft wäre 8.844,23 (Leistung 8.107,92; Nachlass
  // 243,2376 -> 243,24; MwSt 1.494,2892 -> 1.494,29; Brutto 9.358,97; Umlage 46,79485 -> 46,79; Einbehalt 467,9485 ->
  // 467,95), AR 2 damit 10.100,84, also gleich dem Wert vor der Korrektur: Ohne Einfrieren hebt sich die Korrektur auf.
  const ar1Neu = ketteGegen(leistungsstandGegen(e, [b1k]), ar1, 0n);
  assert.equal(ar1Neu.zahlbetrag, '8844.23');
  const ar2Ohne = ketteGegen(ls2n, ar2, parse(ar1Neu.zahlbetrag, 2));
  assert.deepEqual(fx.gegenprobeOhneEinfrieren, { ar1Zahlbetrag: '8844.23', ar2Zahlbetrag: ar2Ohne.zahlbetrag });
  assert.equal(ar2Ohne.zahlbetrag, '10100.84');
  assert.notEqual(ar2Ohne.zahlbetrag, p.ar2NachKorrektur.kette.zahlbetrag);
});

test('typisch-abrechnung: Soll/Ist, genau ein Befund über 110 %, keiner unter 90 % (D-35, VOB/B § 2 Abs. 3)', () => {
  const e = m4Eingaben();
  const { fx, ozVon } = e;
  const [b1, b2] = fx.aufmasse.map((a) => a.aufmass);
  const soll = (id) => parse(e.knoten.get(id).menge, 3);
  // Eigens: Ist = Σ Blattmengen; Anteil = round_half_up(Ist / Soll x 100, 2); Befund `ueber-schwelle` bei
  // Ist x 100 > Soll x 110 (streng); `unter-schwelle` nur mit `abgeschlossen` (keine Schlussrechnung: nie).
  const gegen = (aufmasse) => {
    const kum = kumuliert(aufmasse);
    const zeilen = fx.positionen.filter((p) => kum.has(p.positionId)).map((p) => {
      const s = soll(p.positionId);
      const ist = kum.get(p.positionId);
      return {
        positionId: p.positionId, soll: format(s, 3), ist: format(ist, 3),
        anteil: format((2n * ist * 10000n + s) / (2n * s), 2),
      };
    });
    const befunde = zeilen.filter((z) => parse(z.ist, 3) * 100n > parse(z.soll, 3) * 110n)
      .map((z) => ({ positionId: z.positionId, art: 'ueber-schwelle', anteil: z.anteil }));
    return { zeilen, befunde };
  };
  const faelle = [
    ['nachBlatt1', [b1]], ['nachBlatt2', [b1, b2]], ['nachKorrektur', [fx.korrektur.aufmassNachher, b2]],
  ];
  for (const [name, blaetter] of faelle) {
    const si = fx.sollIst[name];
    assert.deepEqual(si.aufmassIds, blaetter.map((a) => a.id), name);
    assert.deepEqual({ zeilen: si.zeilen, befunde: si.befunde }, gegen(blaetter), name);
    // Von Hand: 02.0040 108,000 / 96,000 = 112,50 % > 110 %, der einzige Befund; nie `unter-schwelle`.
    assert.deepEqual(
      si.befunde.map((b) => [ozVon.get(b.positionId), b.art, b.anteil]), [['02.0040', 'ueber-schwelle', '112.50']],
    );
  }
  // Grenzfall streng: 04.01.0010 nach Blatt 2 mit 12,000 + 14,400 = 26,400 von 24,000 = genau 110,00 %, kein Befund.
  const anteil = (name, oz) => fx.sollIst[name].zeilen.find((z) => ozVon.get(z.positionId) === oz).anteil;
  assert.equal(anteil('nachBlatt2', '04.01.0010'), '110.00');
  // 89,250 / 123,450 = 72,2965 -> 72,30; 7 / 12 = 58,333 -> 58,33; 4 / 6 = 66,667 -> 66,67; 94,9 / 123,45 = 76,873 -> 76,87
  assert.deepEqual([
    anteil('nachBlatt1', '02.0010'), anteil('nachBlatt2', '01.0040'), anteil('nachBlatt2', '04.01.0020'),
    anteil('nachKorrektur', '02.0010'),
  ], ['72.30', '58.33', '66.67', '76.87']);
});

test('typisch-abrechnung: Kostenkontrolle nach AR 2 (D-37), Zeilensumme = Gesamt auf den Cent', () => {
  const { fx } = m4Eingaben();
  const kk = fx.kostenkontrolle;
  assert.deepEqual([kk.rechnungId, kk.kostenermittlungId], [fx.rechnungen[1].id, fx.kostenermittlung.id]);
  // Zuordnung (D-85.3): fast alle Positionen haben eine KG; zwei der Ebene 3 unter verschiedenen Ebene-2-Gruppen und
  // eine Position auf Ebene 2 (340); ohne KG: 03.0070 (ohne Preis), 03.0080, 04.01.0020.
  const kg = Object.fromEntries(fx.positionen.map((p) => [p.oz, p.kostengruppe]));
  assert.deepEqual(
    Object.entries(kg).filter(([, n]) => n === null).map(([oz]) => oz), ['03.0070', '03.0080', '04.01.0020'],
  );
  assert.deepEqual(
    [...new Set(Object.values(kg).filter((n) => n !== null))].sort(), ['214', '311', '322', '340', '352', '391'],
  );
  for (const n of Object.values(kg)) if (n !== null) assert.match(n, /^[1-9][0-9]{2}$/);

  // Gegenrechnung. Vorfahren einer Nummer aus den Ziffern (D-24): XYZ -> XY0 -> X00.
  const vorfahren = (n) => [...new Set([n, `${n.slice(0, 2)}0`, `${n[0]}00`])];
  const zeilen = new Map();
  const buche = (n, feld, w) => {
    for (const v of vorfahren(n)) {
      if (!zeilen.has(v)) zeilen.set(v, { budget: 0n, vergabe: 0n, abrechnung: 0n });
      zeilen.get(v)[feld] += w;
    }
  };
  for (const x of fx.kostenermittlung.eintraege) buche(x.nummer, 'budget', parse(x.betrag, 2));
  const ohne = { budget: 0n, vergabe: 0n, abrechnung: 0n };
  const vergabe = fx.nachtrag.sollwerte.positionen; // GP des Auftrags-LV nach dem Nachtrag; nur zählende (F4)
  const ls = fx.pruefungen.ar2NachKorrektur.leistungsstand; // Rechnung mit der höchsten Nummer (D-37)
  const abrechnung = new Map(ls.positionen.map((z) => [z.positionId, z.gp]));
  for (const p of fx.positionen) {
    const v = vergabe[p.positionId].inSumme ? parse(vergabe[p.positionId].gp, 2) : 0n;
    const a = parse(abrechnung.get(p.positionId), 2);
    if (p.kostengruppe === null) {
      ohne.vergabe += v;
      ohne.abrechnung += a;
    } else {
      buche(p.kostengruppe, 'vergabe', v);
      buche(p.kostengruppe, 'abrechnung', a);
    }
  }
  const text = (z) => ({
    budget: mitVz(z.budget), vergabe: mitVz(z.vergabe), abrechnung: mitVz(z.abrechnung),
    abweichung: mitVz(z.vergabe - z.budget),
  });
  assert.deepEqual(kk.zeilen, [...zeilen.keys()].sort().map((n) => ({ kostengruppe: n, ...text(zeilen.get(n)) })));
  assert.deepEqual(kk.ohneKostengruppe, text(ohne));
  const nachlass = {
    budget: 0n, vergabe: -parse(fx.nachtrag.sollwerte.summen.nachlass, 2), abrechnung: -parse(ls.nachlass, 2),
  };
  assert.deepEqual(kk.nachlass, text(nachlass));
  // Gesamt (D-37): Budget = Σ Einträge, Vergabe = Netto n. N. des Auftrags-LV, Abrechnung = Netto n. N. des Leistungsstands
  const gesamt = {
    budget: fx.kostenermittlung.eintraege.reduce((s, x) => s + parse(x.betrag, 2), 0n),
    vergabe: parse(fx.nachtrag.sollwerte.summen.nettoNachNachlass, 2),
    abrechnung: parse(ls.nettoNachNachlass, 2),
  };
  assert.deepEqual(kk.gesamt, text(gesamt));
  // Property (D-37, Ticket 82): Ebene 1 + ohne KG + Nachlass = Gesamt, je Spalte auf den Cent.
  for (const feld of ['budget', 'vergabe', 'abrechnung', 'abweichung']) {
    const summe = [...kk.zeilen.filter((z) => z.kostengruppe.endsWith('00')), kk.ohneKostengruppe, kk.nachlass]
      .reduce((s, z) => s + ohneVz(z[feld]), 0n);
    assert.equal(mitVz(summe), kk.gesamt[feld], feld);
  }

  // Von Hand: Vergabe 391 = 1.951,75 + 668,30 + 930,96 + 1.208,58 = 4.759,59 (Bedarf 01.0040 zählt nicht, F4);
  // 322 = 1.200,19 + 6.780,48 + 617,02 + 5.725,15 + 5.256,48 + 842,27 + 1.146,87 + 922,49 = 22.490,95;
  // Abrechnung 391 = 975,88 + 668,30 + 354,96 (Bedarf, aufgemessen) = 1.999,14; 322 = 1.350,22 + 5.521,14 + 502,42 +
  // 1.014,74 = 8.388,52; ohne KG = 199,53 + 522,75 = 722,28 (Vergabe) bzw. 348,50 (Abrechnung).
  const z = (n) => kk.zeilen.find((x) => x.kostengruppe === n);
  assert.deepEqual(kk.zeilen.map((x) => x.kostengruppe), [
    '200', '210', '214', '300', '310', '311', '320', '322', '330', '340', '350', '352', '390', '391',
  ]);
  const zeileSoll = (kostengruppe, budget, vergabe, abrechnung, abweichung) => ({
    kostengruppe, budget, vergabe, abrechnung, abweichung,
  });
  assert.deepEqual(z('391'), zeileSoll('391', '5200.00', '4759.59', '1999.14', '-440.41'));
  assert.deepEqual(z('322'), zeileSoll('322', '21800.00', '22490.95', '8388.52', '690.95'));
  assert.deepEqual(z('330'), zeileSoll('330', '3000.00', '0.00', '0.00', '-3000.00'));
  assert.deepEqual(z('340'), zeileSoll('340', '22500.00', '23346.13', '6014.27', '846.13'));
  assert.deepEqual(z('300'), zeileSoll('300', '59800.00', '58070.63', '17019.35', '-1729.37'));
  assert.deepEqual(z('200'), zeileSoll('200', '1100.00', '1010.86', '0.00', '-89.14'));
  assert.deepEqual(kk.ohneKostengruppe, { budget: '0.00', vergabe: '722.28', abrechnung: '348.50', abweichung: '722.28' });
  assert.deepEqual(kk.nachlass, { budget: '0.00', vergabe: '-1794.11', abrechnung: '-521.04', abweichung: '-1794.11' });
  assert.deepEqual(kk.gesamt, {
    budget: '60900.00', vergabe: '58009.66', abrechnung: '16846.81', abweichung: '-2890.34',
  });
});

// ---------------------------------------------------------------- Ticket 99: IFC-Haus, großes Modell, Sollwerte X1
//
// Eigener kleiner STEP-Leser (ISO 10303-21) nur für diesen Selbsttest, unabhängig von `packages/ifc` und vom Erzeuger:
// Zeilen `#n=NAME(...);`, Attribute rekursiv, Zeichenketten mit '' sowie \X\ und \X2\ dekodiert. Zahlen bleiben Text und
// werden exakt als Dezimalwert gerechnet (BigInt), nie über `number` (N1). Die Attributzahl je Klasse steht hier nach den
// öffentlichen Schemata IFC 4 (ADD2 TC1) und IFC 2x3 (TC1); eine Klasse, die hier fehlt, ist ein Fehler.

const ATTRIBUTZAHL_GEMEINSAM = {
  IFCPERSON: 8, IFCORGANIZATION: 5, IFCPERSONANDORGANIZATION: 3, IFCAPPLICATION: 4, IFCOWNERHISTORY: 8,
  IFCSIUNIT: 4, IFCUNITASSIGNMENT: 1, IFCCARTESIANPOINT: 1, IFCDIRECTION: 1, IFCAXIS2PLACEMENT2D: 2,
  IFCAXIS2PLACEMENT3D: 3, IFCLOCALPLACEMENT: 2, IFCGEOMETRICREPRESENTATIONCONTEXT: 6,
  IFCGEOMETRICREPRESENTATIONSUBCONTEXT: 10, IFCPROJECT: 9, IFCSITE: 14, IFCBUILDING: 12, IFCBUILDINGSTOREY: 10,
  IFCSPACE: 11, IFCRELAGGREGATES: 6, IFCRELCONTAINEDINSPATIALSTRUCTURE: 6, IFCSLAB: 9, IFCFOOTING: 9,
  IFCRELVOIDSELEMENT: 6, IFCRELFILLSELEMENT: 6, IFCPRODUCTDEFINITIONSHAPE: 3, IFCSHAPEREPRESENTATION: 4,
  IFCEXTRUDEDAREASOLID: 4, IFCRECTANGLEPROFILEDEF: 5, IFCPOLYLINE: 1, IFCELEMENTQUANTITY: 6, IFCRELDEFINESBYPROPERTIES: 6,
  IFCPROPERTYSET: 5, IFCPROPERTYSINGLEVALUE: 4, IFCWALLTYPE: 10, IFCRELDEFINESBYTYPE: 6, IFCRELASSOCIATESMATERIAL: 6,
  IFCRELASSOCIATESCLASSIFICATION: 6,
};
const ATTRIBUTZAHL = {
  IFC4: {
    ...ATTRIBUTZAHL_GEMEINSAM, IFCWALL: 9, IFCWINDOW: 13, IFCDOOR: 13, IFCOPENINGELEMENT: 9, IFCQUANTITYLENGTH: 5,
    IFCQUANTITYAREA: 5, IFCQUANTITYVOLUME: 5, IFCMATERIAL: 3, IFCCLASSIFICATION: 7, IFCCLASSIFICATIONREFERENCE: 6,
  },
  IFC2X3: {
    ...ATTRIBUTZAHL_GEMEINSAM, IFCWALL: 8, IFCWINDOW: 10, IFCDOOR: 10, IFCOPENINGELEMENT: 8, IFCQUANTITYLENGTH: 4,
    IFCQUANTITYAREA: 4, IFCQUANTITYVOLUME: 4, IFCMATERIAL: 1, IFCCLASSIFICATION: 4, IFCCLASSIFICATIONREFERENCE: 4,
  },
};
/** Klassen unter IfcRoot: Attribut 1 ist die GlobalId (22 Zeichen IFC-Base64, das erste trägt nur 2 Bit). */
const IFC_ROOT = new Set([
  'IFCPROJECT', 'IFCSITE', 'IFCBUILDING', 'IFCBUILDINGSTOREY', 'IFCSPACE', 'IFCRELAGGREGATES',
  'IFCRELCONTAINEDINSPATIALSTRUCTURE', 'IFCWALL', 'IFCSLAB', 'IFCFOOTING', 'IFCWINDOW', 'IFCDOOR', 'IFCOPENINGELEMENT',
  'IFCRELVOIDSELEMENT', 'IFCRELFILLSELEMENT', 'IFCELEMENTQUANTITY', 'IFCRELDEFINESBYPROPERTIES', 'IFCPROPERTYSET',
  'IFCWALLTYPE', 'IFCRELDEFINESBYTYPE', 'IFCRELASSOCIATESMATERIAL', 'IFCRELASSOCIATESCLASSIFICATION',
]);
const GLOBALID = /^[0-3][0-9A-Za-z_$]{21}$/;
/** Bauteile im Sinn von Ticket 98: Produkte in einem Strukturknoten, ohne Öffnungen. */
const BAUTEILKLASSEN = new Set(['IFCWALL', 'IFCSLAB', 'IFCFOOTING', 'IFCWINDOW', 'IFCDOOR']);
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

/** Zeichenkette nach ISO 10303-21 dekodieren ('' ist schon aufgelöst): \X2\hhhh…\X0\, \X\hh, \\. */
function stepDekodieren(s) {
  const rest = s.replace(/\\X2\\(?:[0-9A-F]{4})+\\X0\\|\\X\\[0-9A-F]{2}|\\\\/g, '');
  assert.equal(rest.includes('\\'), false, `unbekannte Kodierung: ${s}`);
  return s.replace(/\\X2\\((?:[0-9A-F]{4})+)\\X0\\|\\X\\([0-9A-F]{2})|\\\\/g, (_, x2, x) => {
    if (x2) return x2.match(/.{4}/g).map((h) => String.fromCharCode(parseInt(h, 16))).join('');
    if (x) return String.fromCharCode(parseInt(x, 16));
    return '\\';
  });
}

const RE_ENUM = /\.([A-Z0-9_]+)\./y;
const RE_REF = /#(\d+)/y;
const RE_ZAHL = /-?\d+\.\d*(?:E[-+]?\d+)?|-?\d+/y;
const RE_TYP = /([A-Z0-9_]+)\(/y;

/** Attribute einer Instanz: null ($), {abgeleitet} (*), Text, {enum}, {ref}, {zahl} (Text), Liste, {typ, wert}. */
function stepAttribute(text, zeile) {
  let i = 0;
  const treffer = (re) => {
    re.lastIndex = i;
    const m = re.exec(text);
    if (m) i = re.lastIndex;
    return m;
  };
  const wert = () => {
    const c = text[i];
    if (c === '$') { i++; return null; }
    if (c === '*') { i++; return { abgeleitet: true }; }
    if (c === "'") {
      let s = '';
      for (i++; ; i++) {
        assert.ok(i < text.length, `Zeichenkette nicht beendet: ${zeile}`);
        if (text[i] !== "'") s += text[i];
        else if (text[i + 1] === "'") { s += "'"; i++; }
        else { i++; return stepDekodieren(s); }
      }
    }
    if (c === '(') {
      const liste = [];
      i++;
      if (text[i] === ')') { i++; return liste; }
      for (;;) {
        liste.push(wert());
        if (text[i] === ')') { i++; return liste; }
        assert.equal(text[i], ',', zeile);
        i++;
      }
    }
    let m = treffer(RE_ENUM);
    if (m) return { enum: m[1] };
    m = treffer(RE_REF);
    if (m) return { ref: Number(m[1]) };
    m = treffer(RE_ZAHL);
    if (m) return { zahl: m[0] };
    m = treffer(RE_TYP);
    assert.ok(m, `unlesbar an Stelle ${i}: ${zeile}`);
    const w = wert();
    assert.equal(text[i], ')', zeile);
    i++;
    return { typ: m[1], wert: w };
  };
  const attr = [];
  for (;;) {
    attr.push(wert());
    if (i === text.length) return attr;
    assert.equal(text[i], ',', zeile);
    i++;
  }
}

/**
 * Liest eine IFC-Datei streng als STEP: Kopf (FILE_DESCRIPTION, FILE_NAME mit fester Zeit, FILE_SCHEMA), Datenteil mit
 * eindeutigen #n, Attributzahl je Klasse nach Schema, GlobalIds gültig und eindeutig, jeder Verweis auflösbar.
 */
function stepLesen(text) {
  const zeilen = text.split('\n');
  assert.equal(zeilen.pop(), '', 'die Datei endet mit einem Zeilenumbruch');
  assert.deepEqual(zeilen.slice(0, 2), ['ISO-10303-21;', 'HEADER;']);
  const kopfEnde = zeilen.indexOf('ENDSEC;');
  const kopf = zeilen.slice(2, kopfEnde);
  assert.equal(kopf.length, 3, 'Kopf: FILE_DESCRIPTION, FILE_NAME, FILE_SCHEMA');
  assert.match(kopf[0], /^FILE_DESCRIPTION\(\('.*'\),'2;1'\);$/);
  assert.match(kopf[1], /^FILE_NAME\('[a-z0-9-]+\.ifc','2026-11-12T00:00:00',\('.*'\),\('.*'\),'.*','.*',''\);$/);
  const schema = /^FILE_SCHEMA\(\('(IFC4|IFC2X3)'\)\);$/.exec(kopf[2])?.[1];
  assert.ok(schema, `Schema: ${kopf[2]}`);
  assert.equal(zeilen[kopfEnde + 1], 'DATA;');
  assert.deepEqual(zeilen.slice(-2), ['ENDSEC;', 'END-ISO-10303-21;']);
  const instanzen = new Map();
  const globalIds = new Set();
  for (const zeile of zeilen.slice(kopfEnde + 2, -2)) {
    const m = /^#(\d+)=([A-Z0-9_]+)\((.*)\);$/.exec(zeile);
    assert.ok(m, `keine Instanzzeile: ${zeile}`);
    const nr = Number(m[1]);
    assert.equal(instanzen.has(nr), false, `#${nr} doppelt`);
    const attr = stepAttribute(m[3], zeile);
    assert.equal(attr.length, ATTRIBUTZAHL[schema][m[2]], `${schema}: Attributzahl von ${m[2]} (${zeile})`);
    if (IFC_ROOT.has(m[2])) {
      assert.match(attr[0], GLOBALID, zeile);
      assert.equal(globalIds.has(attr[0]), false, `GlobalId doppelt: ${attr[0]}`);
      globalIds.add(attr[0]);
    }
    instanzen.set(nr, { nr, typ: m[2], attr });
  }
  const verweise = (w) => {
    if (Array.isArray(w)) return w.flatMap(verweise);
    if (w?.ref !== undefined) return [w.ref];
    return w?.typ ? verweise(w.wert) : [];
  };
  for (const i of instanzen.values()) {
    for (const r of verweise(i.attr)) assert.ok(instanzen.has(r), `#${i.nr} verweist auf die fehlende #${r}`);
  }
  return { schema, kopf, instanzen };
}

test('IFC-Erzeuger: kleines Modell ist gültiges STEP, Bauteile gleichmäßig auf die Geschosse verteilt (Ticket 99)', () => {
  const { schema, instanzen } = stepLesen(erzeugeModell({ bauteile: 37, geschosse: 3 }));
  assert.equal(schema, 'IFC4');
  const alle = [...instanzen.values()];
  const von = (typ) => alle.filter((i) => i.typ === typ);
  const bauteile = alle.filter((i) => BAUTEILKLASSEN.has(i.typ));
  assert.equal(bauteile.length, 37);
  const geschosse = von('IFCBUILDINGSTOREY');
  assert.equal(geschosse.length, 3);
  // je Geschoss eine Enthaltensbeziehung; 37 = 13 + 12 + 12 (der Rest der Teilung geht an die unteren Geschosse)
  const enthalten = von('IFCRELCONTAINEDINSPATIALSTRUCTURE');
  assert.deepEqual(enthalten.map((r) => r.attr[5].ref), geschosse.map((g) => g.nr));
  assert.deepEqual(enthalten.map((r) => r.attr[4].length), [13, 12, 12]);
  const enthaltenIn = enthalten.flatMap((r) => r.attr[4].map((e) => e.ref)).sort((a, b) => a - b);
  assert.deepEqual(enthaltenIn, bauteile.map((b) => b.nr));
  // jedes Bauteil hat Geometrie (Körper als extrudiertes Rechteck) und genau einen Mengensatz
  const mengensaetze = new Map();
  for (const r of von('IFCRELDEFINESBYPROPERTIES')) {
    if (instanzen.get(r.attr[5].ref).typ !== 'IFCELEMENTQUANTITY') continue;
    for (const o of r.attr[4]) mengensaetze.set(o.ref, (mengensaetze.get(o.ref) ?? 0) + 1);
  }
  for (const b of bauteile) {
    assert.equal(mengensaetze.get(b.nr), 1, `#${b.nr} ${b.typ}: ein Mengensatz`);
    const darstellungen = instanzen.get(b.attr[6].ref).attr[2].map((r) => instanzen.get(r.ref));
    const koerper = darstellungen.filter((x) => x.attr[1] === 'Body');
    assert.deepEqual(koerper.map((x) => x.attr[2]), ['SweptSolid'], `#${b.nr} ${b.typ}: ein Körper`);
    assert.equal(instanzen.get(koerper[0].attr[3][0].ref).typ, 'IFCEXTRUDEDAREASOLID');
  }
  // Fenster und Türen füllen eine Öffnung, die eine Wand ausspart
  const fuellt = new Map(von('IFCRELFILLSELEMENT').map((r) => [r.attr[5].ref, r.attr[4].ref]));
  const spartAus = new Map(von('IFCRELVOIDSELEMENT').map((r) => [r.attr[5].ref, r.attr[4].ref]));
  for (const b of bauteile.filter((x) => x.typ === 'IFCWINDOW' || x.typ === 'IFCDOOR')) {
    assert.equal(instanzen.get(spartAus.get(fuellt.get(b.nr))).typ, 'IFCWALL', `#${b.nr} sitzt in einer Wand`);
  }
});

test('IFC-Erzeuger: 10.000 Bauteile auf 10 Geschossen, deterministisch (gleicher SHA-256), etwa 25 MB (D-54)', () => {
  const erster = erzeugeModell();
  const zweiter = erzeugeModell({ bauteile: 10000, geschosse: 10 });
  assert.equal(sha256(zweiter), sha256(erster));
  assert.equal(zweiter, erster);
  const zaehle = (re) => erster.match(re)?.length ?? 0;
  assert.equal(zaehle(/^#\d+=IFC(?:WALL|SLAB|FOOTING|WINDOW|DOOR)\(/gm), 10000);
  assert.equal(zaehle(/^#\d+=IFCBUILDINGSTOREY\(/gm), 10);
  // je Geschoss 1.000 Bauteile: 166 volle Felder zu 6 (Außenwand, Fenster, Innenwand, Tür, Innenwand, Deckenfeld) + 4
  assert.equal(zaehle(/^#\d+=IFCWINDOW\(/gm), 1670);
  assert.equal(zaehle(/^#\d+=IFCSLAB\(/gm), 1660);
  const megabyte = Buffer.byteLength(erster) / 1e6;
  assert.ok(megabyte > 18 && megabyte < 30, `${megabyte} MB`);
  // Verweise (außerhalb von Zeichenketten) zeigen nur auf vorhandene, also frühere Instanzen
  let hoechste = 0;
  for (const zeile of erster.split('\n')) {
    const m = /^#(\d+)=/.exec(zeile);
    if (!m) continue;
    const nr = Number(m[1]);
    assert.equal(nr, hoechste + 1, 'fortlaufend nummeriert');
    hoechste = nr;
    for (const r of zeile.slice(m[0].length).replace(/'(?:[^']|'')*'/g, '').matchAll(/#(\d+)/g)) {
      assert.ok(Number(r[1]) < nr, `#${nr} verweist auf #${r[1]}`);
    }
  }
});

test('IFC-Erzeuger: Kommandozeile liefert denselben Text wie die Funktion', () => {
  const aus = execFileSync(process.execPath, [datei('ifc/erzeugen.mjs'), '--bauteile', '12', '--geschosse', '2'], {
    encoding: 'utf8',
  });
  assert.equal(aus, erzeugeModell({ bauteile: 12, geschosse: 2 }));
  assert.throws(() => erzeugeModell({ bauteile: 0 }), /bauteile/);
});

const ifcDatei = (name) => readFileSync(datei(`ifc/${name}`), 'utf8');

/** Exakter Dezimalwert `{ w, s }` aus STEP- oder JSON-Zahltext ("11.99", "3.", "-0.1175"); Rechnung nur mit BigInt. */
function dz(text) {
  const m = /^(-?)(\d+)\.?(\d*)$/.exec(text);
  assert.ok(m, `keine Dezimalzahl: ${text}`);
  const w = BigInt(m[2] + m[3]);
  return { w: m[1] ? -w : w, s: m[3].length };
}
const dzMal = (...xs) => xs.reduce((a, b) => ({ w: a.w * b.w, s: a.s + b.s }));
const dzPlus = (a, b) => {
  const s = Math.max(a.s, b.s);
  return { w: a.w * 10n ** BigInt(s - a.s) + b.w * 10n ** BigInt(s - b.s), s };
};
const dzMinus = (a, b) => dzPlus(a, { w: -b.w, s: b.s });
/** Kanonischer Text ohne nachlaufende Nullen ("32.9725", "3", "-4.125"). */
function dzText(a) {
  let { w, s } = a;
  while (s > 0 && w % 10n === 0n) { w /= 10n; s--; }
  const z = (w < 0n ? -w : w).toString().padStart(s + 1, '0');
  return `${w < 0n ? '-' : ''}${s === 0 ? z : `${z.slice(0, -s)}.${z.slice(-s)}`}`;
}
/** Länge aus der Datei in m: Faktor "1" (Datei in m) oder "1000" (Datei in mm, exakt durch 1000). */
const inMeter = (text, faktor) => ({ ...dz(text), s: dz(text).s + (faktor === '1000' ? 3 : 0) });
/** Mengen in SI-Einheit als `[Name, Text]`: Längen umgerechnet, Flächen in m², Volumen in m³ wie gelesen. */
const mengenInSi = (werte, faktor) => [...werte].map(([name, q]) => [
  name, dzText(q.klasse === 'IFCQUANTITYLENGTH' ? inMeter(q.text, faktor) : dz(q.text)),
]);

/**
 * Sicht auf eine gelesene IFC-Datei: Strukturknoten über IfcRelAggregates, Bauteile mit Kennung (Tag), Geschoss
 * (IfcRelContainedInSpatialStructure), Mengen als Text je Name (IfcElementQuantity), Eigenschaften, Körpermaßen
 * (Profil XDim, YDim, Tiefe) und Öffnungen (IfcRelVoidsElement, IfcRelFillsElement), Klassifikation, Material, Typ.
 */
function modellLesen(text) {
  const { schema, instanzen } = stepLesen(text);
  const alle = [...instanzen.values()];
  const von = (typ) => alle.filter((i) => i.typ === typ);
  const get = (w) => instanzen.get(w.ref);
  const teile = (ganzes) =>
    von('IFCRELAGGREGATES').filter((r) => r.attr[4].ref === ganzes.nr).flatMap((r) => r.attr[5].map(get));
  const zuordnung = (klasse, wert) => {
    const karte = new Map();
    for (const r of von(klasse)) for (const o of r.attr[4]) karte.set(o.ref, wert(get(r.attr[5])));
    return karte;
  };
  const mengen = new Map();
  const psets = new Map();
  for (const r of von('IFCRELDEFINESBYPROPERTIES')) {
    const satz = get(r.attr[5]);
    for (const o of r.attr[4]) {
      if (satz.typ === 'IFCELEMENTQUANTITY') {
        assert.equal(mengen.has(o.ref), false, `#${o.ref}: ein Mengensatz`);
        mengen.set(o.ref, {
          satz: satz.attr[2],
          werte: new Map(satz.attr[5].map(get).map((q) => [q.attr[0], { klasse: q.typ, text: q.attr[3].zahl }])),
        });
      } else {
        if (!psets.has(o.ref)) psets.set(o.ref, new Map());
        psets.get(o.ref).set(satz.attr[2], new Map(satz.attr[4].map(get).map((p) => [p.attr[0], p.attr[2]])));
      }
    }
  }
  const quader = (produkt) => {
    const darstellungen = get(produkt.attr[6]).attr[2].map(get);
    const koerper = get(darstellungen.find((x) => x.attr[1] === 'Body').attr[3][0]);
    const profil = get(koerper.attr[0]);
    return { dx: profil.attr[3].zahl, dy: profil.attr[4].zahl, dz: koerper.attr[3].zahl };
  };
  const geschossVon = zuordnung('IFCRELCONTAINEDINSPATIALSTRUCTURE', (g) => g.attr[2]);
  const kgVon = zuordnung('IFCRELASSOCIATESCLASSIFICATION', (k) => k.attr[1]);
  const materialVon = zuordnung('IFCRELASSOCIATESMATERIAL', (k) => k.attr[0]);
  const typVon = zuordnung('IFCRELDEFINESBYTYPE', (k) => k.attr[2]);
  const oeffnungenVon = new Map();
  for (const r of von('IFCRELVOIDSELEMENT')) {
    if (!oeffnungenVon.has(r.attr[4].ref)) oeffnungenVon.set(r.attr[4].ref, []);
    oeffnungenVon.get(r.attr[4].ref).push(get(r.attr[5]));
  }
  const fuellungVon = new Map(von('IFCRELFILLSELEMENT').map((r) => [r.attr[4].ref, get(r.attr[5])]));
  const bauteile = alle.filter((i) => BAUTEILKLASSEN.has(i.typ)).map((i) => ({
    nr: i.nr, globalId: i.attr[0], klasse: i.typ, name: i.attr[2], kennung: i.attr[7],
    geschoss: geschossVon.get(i.nr), kg: kgVon.get(i.nr), material: materialVon.get(i.nr), typ: typVon.get(i.nr),
    mengen: mengen.get(i.nr), psets: psets.get(i.nr) ?? new Map(), quader: quader(i),
    oeffnungen: (oeffnungenVon.get(i.nr) ?? []).map((o) => ({
      name: o.attr[2], quader: quader(o), fuellung: fuellungVon.get(o.nr)?.attr[7] ?? null,
    })),
  }));
  const einheit = (art) => von('IFCSIUNIT').find((u) => u.attr[1].enum === art);
  return {
    schema, instanzen, von, get, teile, bauteile, mengen, einheit,
    bauteil: (kennung) => bauteile.find((b) => b.kennung === kennung),
  };
}

test('IFC-Haus v1: IFC 4 in m, Struktur Projekt → Grundstück → Gebäude → EG/OG → Räume, Bauteile (Ticket 99)', () => {
  const text = ifcDatei('haus-v1.ifc');
  const m = modellLesen(text);
  assert.equal(m.schema, 'IFC4');
  assert.deepEqual(['LENGTHUNIT', 'AREAUNIT', 'VOLUMEUNIT'].map((a) => [m.einheit(a).attr[2], m.einheit(a).attr[3].enum]), [
    [null, 'METRE'], [null, 'SQUARE_METRE'], [null, 'CUBIC_METRE'],
  ]);
  const [projekt] = m.von('IFCPROJECT');
  assert.equal(projekt.attr[2], 'Musterhaus (erfunden)');
  const [grundstueck] = m.teile(projekt);
  const [gebaeude] = m.teile(grundstueck);
  assert.deepEqual([grundstueck.typ, gebaeude.typ], ['IFCSITE', 'IFCBUILDING']);
  const geschosse = m.teile(gebaeude);
  assert.deepEqual(geschosse.map((g) => [g.typ, g.attr[2], g.attr[7], g.attr[9].zahl]), [
    ['IFCBUILDINGSTOREY', 'EG', 'Erdgeschoss', '0.'], ['IFCBUILDINGSTOREY', 'OG', 'Obergeschoss', '3.'],
  ]);
  assert.deepEqual(geschosse.map((g) => m.teile(g).map((r) => `${r.typ} ${r.attr[2]} ${r.attr[7]}`)), [
    ['IFCSPACE E.01 Wohnen', 'IFCSPACE E.02 Flur', 'IFCSPACE E.03 Küche'],
    ['IFCSPACE O.01 Schlafen', 'IFCSPACE O.02 Flur', 'IFCSPACE O.03 Kind'],
  ]);
  // Bauteile je Geschoss und Klasse in Dateireihenfolge (Kennung = Tag)
  const kennungen = (g, klasse) => m.bauteile.filter((b) => b.geschoss === g && b.klasse === klasse).map((b) => b.kennung);
  assert.deepEqual(kennungen('EG', 'IFCFOOTING'), ['FU-S', 'FU-N', 'FU-W', 'FU-O']);
  assert.deepEqual(kennungen('EG', 'IFCSLAB'), ['PL-EG']);
  assert.deepEqual(kennungen('EG', 'IFCWALL'), ['AW-EG-S', 'AW-EG-N', 'AW-EG-W', 'AW-EG-O', 'IW-EG-1', 'IW-EG-2', 'IW-EG-3']);
  assert.deepEqual(kennungen('EG', 'IFCWINDOW'), ['F-EG-S', 'F-EG-N', 'F-EG-W']);
  assert.deepEqual(kennungen('EG', 'IFCDOOR'), ['T-EG-H', 'T-EG-1']);
  assert.deepEqual(kennungen('OG', 'IFCSLAB'), ['DE-OG', 'DA-OG']);
  assert.deepEqual(kennungen('OG', 'IFCWALL'), ['AW-OG-S', 'AW-OG-N', 'AW-OG-W', 'AW-OG-O', 'IW-OG-1', 'IW-OG-2']);
  assert.deepEqual(kennungen('OG', 'IFCWINDOW'), ['F-OG-S', 'F-OG-F', 'F-OG-N']);
  assert.deepEqual(kennungen('OG', 'IFCDOOR'), ['T-OG-1', 'T-OG-2']);
  assert.equal(m.bauteile.length, 30);
  // Namen mit Umlauten stehen als \X2\…\X0\ in der Datei und werden zum Klartext
  assert.equal(m.bauteil('AW-EG-S').name, 'Außenwand Süd EG');
  assert.ok(text.includes("'Au\\X2\\00DF\\X0\\enwand S\\X2\\00FC\\X0\\d EG'"));
  // Öffnungen: jedes Fenster und jede Tür füllt eine Öffnung in einer Wand; die Bodenplatte hat eine Aussparung ohne Füllung
  assert.equal(m.von('IFCOPENINGELEMENT').length, 11);
  const fuellungen = m.bauteile.flatMap((b) => b.oeffnungen.map((o) => [b.klasse, b.kennung, o.fuellung]));
  assert.deepEqual(fuellungen.filter(([klasse]) => klasse !== 'IFCWALL'), [['IFCSLAB', 'PL-EG', null]]);
  const gefuellt = fuellungen.filter(([klasse]) => klasse === 'IFCWALL').map(([, , f]) => f).sort();
  assert.deepEqual(gefuellt, m.bauteile.filter((b) => b.klasse === 'IFCWINDOW' || b.klasse === 'IFCDOOR')
    .map((b) => b.kennung).sort());
  assert.deepEqual(m.bauteil('AW-EG-S').oeffnungen.map((o) => o.fuellung), ['F-EG-S', 'T-EG-H']);
  // Pset_WallCommon an jeder Wand: außen tragend, innen nichttragend; Wandtyp, Material, DIN-276-Kostengruppe
  for (const b of m.bauteile.filter((x) => x.klasse === 'IFCWALL')) {
    const aussen = b.kennung.startsWith('AW');
    const p = b.psets.get('Pset_WallCommon');
    assert.deepEqual([p.get('IsExternal'), p.get('LoadBearing')], [
      { typ: 'IFCBOOLEAN', wert: { enum: aussen ? 'T' : 'F' } }, { typ: 'IFCBOOLEAN', wert: { enum: aussen ? 'T' : 'F' } },
    ], b.kennung);
    assert.equal(b.kg, aussen ? '331' : '342');
  }
  assert.deepEqual(m.bauteil('AW-EG-S').psets.get('Pset_WallCommon').get('AcousticRating'), {
    typ: 'IFCLABEL', wert: "R'w 52 dB",
  });
  assert.deepEqual([m.bauteil('IW-EG-1').typ, m.bauteil('IW-EG-1').material], [
    'Innenwand Kalksandstein 11,5', 'Mauerwerk Kalksandstein',
  ]);
  assert.deepEqual([m.bauteil('IW-OG-1').typ, m.bauteil('IW-OG-1').material], ['Trockenbauwand 10', 'Gipskarton']);
  const [klassifikation] = m.von('IFCCLASSIFICATION');
  assert.equal(klassifikation.attr[3], 'DIN 276');
  assert.deepEqual(['FU-S', 'PL-EG', 'F-EG-S', 'T-EG-H', 'T-EG-1', 'DE-OG', 'DA-OG'].map((k) => m.bauteil(k).kg), [
    '322', '322', '334', '334', '344', '351', '361',
  ]);
  for (const b of m.bauteile) assert.match(b.kg, /^[1-9]\d\d$/, b.kennung);
});

/**
 * Prüft jede Menge eines Hauses gegen seine Geometrie, exakt: Wand und Fundament Länge/Dicke/Höhe aus dem Profil (die
 * längere Seite ist die Länge) und der Tiefe; Seitenfläche brutto Länge × Höhe, netto minus Σ Breite × Höhe der
 * Öffnungskörper; Volumen = Seitenfläche × Dicke. Platte: Fläche dx × dy, netto minus Aussparungen, Volumen × Dicke.
 * Fenster und Tür: Breite und Höhe ihrer Öffnung, Fläche = Breite × Höhe, gleich OverallWidth/OverallHeight. Räume:
 * Bruttofläche = Profil; Geschosse: Volumen = Fläche × Bruttohöhe. `faktor`: Länge der Datei je m ("1" oder "1000").
 */
function mengenGegenGeometrie(m, faktor) {
  const inM = (text) => inMeter(text, faktor);
  const menge = (werte, name) => {
    const q = werte.get(name);
    assert.ok(q, `Menge ${name} fehlt`);
    return q.klasse === 'IFCQUANTITYLENGTH' ? inM(q.text) : dz(q.text);
  };
  const gleich = (ist, soll, text) => assert.equal(dzText(ist), dzText(soll), text);
  const laengs = (q) => dzMinus(inM(q.dx), inM(q.dy)).w > 0n;
  for (const b of m.bauteile) {
    const w = b.mengen.werte;
    const [x, y, h] = [b.quader.dx, b.quader.dy, b.quader.dz].map(inM);
    const t = (name) => `${b.kennung} ${name}`;
    if (b.klasse === 'IFCWALL' || b.klasse === 'IFCFOOTING') {
      const [l, dicke] = laengs(b.quader) ? [x, y] : [y, x];
      gleich(menge(w, 'Length'), l, t('Length'));
      gleich(menge(w, 'Width'), dicke, t('Width'));
      gleich(menge(w, 'Height'), h, t('Height'));
      if (b.klasse === 'IFCFOOTING') {
        for (const n of ['GrossVolume', 'NetVolume']) gleich(menge(w, n), dzMal(l, dicke, h), t(n));
        continue;
      }
      const brutto = dzMal(l, h);
      const netto = b.oeffnungen
        .map((o) => dzMal(inM(laengs(b.quader) ? o.quader.dx : o.quader.dy), inM(o.quader.dz)))
        .reduce(dzMinus, brutto);
      gleich(menge(w, 'GrossSideArea'), brutto, t('GrossSideArea'));
      gleich(menge(w, 'NetSideArea'), netto, t('NetSideArea'));
      gleich(menge(w, 'GrossVolume'), dzMal(brutto, dicke), t('GrossVolume'));
      gleich(menge(w, 'NetVolume'), dzMal(netto, dicke), t('NetVolume'));
    } else if (b.klasse === 'IFCSLAB') {
      const brutto = dzMal(x, y);
      const netto = b.oeffnungen.map((o) => dzMal(inM(o.quader.dx), inM(o.quader.dy))).reduce(dzMinus, brutto);
      gleich(menge(w, 'Width'), h, t('Width'));
      gleich(menge(w, 'Perimeter'), dzMal(dz('2'), dzPlus(x, y)), t('Perimeter'));
      gleich(menge(w, 'GrossArea'), brutto, t('GrossArea'));
      gleich(menge(w, 'NetArea'), netto, t('NetArea'));
      gleich(menge(w, 'GrossVolume'), dzMal(brutto, h), t('GrossVolume'));
      gleich(menge(w, 'NetVolume'), dzMal(netto, h), t('NetVolume'));
    } else {
      const wirt = m.bauteile.find((x2) => x2.oeffnungen.some((o) => o.fuellung === b.kennung));
      const oeffnung = wirt.oeffnungen.find((o) => o.fuellung === b.kennung);
      const breite = inM(laengs(wirt.quader) ? oeffnung.quader.dx : oeffnung.quader.dy);
      const hoehe = inM(oeffnung.quader.dz);
      gleich(menge(w, 'Width'), breite, t('Width'));
      gleich(menge(w, 'Height'), hoehe, t('Height'));
      gleich(menge(w, 'Area'), dzMal(breite, hoehe), t('Area'));
      const produkt = m.instanzen.get(b.nr);
      gleich(inM(produkt.attr[8].zahl), hoehe, t('OverallHeight'));
      gleich(inM(produkt.attr[9].zahl), breite, t('OverallWidth'));
    }
  }
  for (const raum of m.von('IFCSPACE')) {
    const p = m.get(m.get(m.get(raum.attr[6]).attr[2][0]).attr[3][0]);
    const profil = m.get(p.attr[0]);
    gleich(menge(m.mengen.get(raum.nr).werte, 'GrossFloorArea'), dzMal(inM(profil.attr[3].zahl), inM(profil.attr[4].zahl)));
  }
  for (const g of m.von('IFCBUILDINGSTOREY')) {
    const w = m.mengen.get(g.nr).werte;
    gleich(menge(w, 'GrossVolume'), dzMal(menge(w, 'GrossFloorArea'), menge(w, 'GrossHeight')), g.attr[2]);
  }
}

test('IFC-Haus v1: Mengen passen zur Geometrie (Netto = Brutto − Öffnung), von Hand nachgerechnet (C4)', () => {
  const m = modellLesen(ifcDatei('haus-v1.ifc'));
  mengenGegenGeometrie(m, '1');
  const t = (k, name) => m.bauteil(k).mengen.werte.get(name).text;
  // Außenwand Süd EG: 11,99 × 2,75 = 32,9725; Fenster 1,26 × 1,385 = 1,7451 und Haustür 1,135 × 2,135 = 2,423225,
  // zusammen 4,168325; netto 28,804175; Volumen × 0,365: 12,0349625 und 10,513523875.
  assert.deepEqual(['GrossSideArea', 'NetSideArea', 'GrossVolume', 'NetVolume'].map((n) => t('AW-EG-S', n)), [
    '32.9725', '28.804175', '12.0349625', '10.513523875',
  ]);
  assert.equal(t('AW-EG-O', 'NetSideArea'), '20.6525'); // 7,51 × 2,75 ohne Öffnung; 3 Stellen: 20,653 (.5 aufgerundet)
  assert.equal(t('IW-EG-1', 'NetSideArea'), '18.87365'); // 20,6525 − Tür 0,885 × 2,01 = 1,77885
  assert.equal(t('IW-EG-2', 'NetSideArea'), '8.64875'); // 3,145 × 2,75
  assert.equal(t('IW-EG-3', 'NetSideArea'), '5.5'); // 2 × 2,75
  assert.deepEqual(['GrossArea', 'NetArea'].map((n) => t('PL-EG', n)), ['98.7976', '98.6376']); // 11,99 × 8,24 − 0,4 × 0,4
  assert.deepEqual(['FU-S', 'FU-N', 'FU-W', 'FU-O'].map((k) => t(k, 'NetVolume')), ['5.868', '5.868', '3.492', '3.492']);
  assert.equal(t('T-EG-1', 'Area'), '1.77885');
  // Räume: Lichtmaß; Wohnen netto ohne die Grundfläche des Raumteilers 2 × 0,115 = 0,23 (D-99.6)
  const raum = (name) => {
    const r = m.von('IFCSPACE').find((x) => x.attr[2] === name);
    return ['GrossFloorArea', 'NetFloorArea'].map((n) => m.mengen.get(r.nr).werte.get(n).text);
  };
  assert.deepEqual(raum('E.01'), ['47.87625', '47.64625']); // 6,375 × 7,51
  assert.deepEqual(raum('E.02'), ['17.33895', '17.33895']); // 4,77 × 3,635
  assert.deepEqual(raum('O.03'), ['18.063375', '18.063375']); // 4,785 × 3,775
  // Geschosse: BGF aus dem Außenmaß 11,99 × 8,24 = 98,7976; BRI EG × 3,25 (−0,25 bis 3,00), OG × 3,00 (3,00 bis 6,00)
  const geschoss = (name) => {
    const g = m.von('IFCBUILDINGSTOREY').find((x) => x.attr[2] === name);
    return ['GrossHeight', 'GrossFloorArea', 'GrossVolume'].map((n) => m.mengen.get(g.nr).werte.get(n).text);
  };
  assert.deepEqual(geschoss('EG'), ['3.25', '98.7976', '321.0922']);
  assert.deepEqual(geschoss('OG'), ['3.', '98.7976', '296.3928']);
});

test('IFC-Haus v1 in IFC 2x3: Längen in mm, nach Umrechnung dieselben Mengen und GlobalIds wie IFC 4 (Ticket 99)', () => {
  const text = ifcDatei('haus-v1-ifc2x3.ifc');
  const drei = modellLesen(text);
  const vier = modellLesen(ifcDatei('haus-v1.ifc'));
  assert.equal(drei.schema, 'IFC2X3');
  const einheiten = (m) => ['LENGTHUNIT', 'AREAUNIT', 'VOLUMEUNIT'].map((a) => [m.einheit(a).attr[2]?.enum ?? null, m.einheit(a).attr[3].enum]);
  assert.deepEqual(einheiten(drei), [['MILLI', 'METRE'], [null, 'SQUARE_METRE'], [null, 'CUBIC_METRE']]);
  mengenGegenGeometrie(drei, '1000');
  // Gleicher Inhalt: Bauteile mit GlobalId, Klasse, Name, Kennung, Geschoss, KG, Material, Typ, Eigenschaften, Mengen in m
  const bauteile = (m, faktor) => m.bauteile.map((b) => ({
    globalId: b.globalId, klasse: b.klasse, name: b.name, kennung: b.kennung, geschoss: b.geschoss, kg: b.kg,
    material: b.material, typ: b.typ, satz: b.mengen.satz, mengen: mengenInSi(b.mengen.werte, faktor),
    psets: [...b.psets].map(([satz, werte]) => [satz, [...werte].map(([n, w]) => [n, w.typ, w.wert.zahl ?? w.wert])]),
    oeffnungen: b.oeffnungen.map((o) => [o.name, o.fuellung]),
  }));
  assert.deepEqual(bauteile(drei, '1000'), bauteile(vier, '1'));
  // Strukturknoten mit denselben GlobalIds; Raum- und Geschossmengen in m gleich
  const knoten = (m, faktor) => ['IFCPROJECT', 'IFCSITE', 'IFCBUILDING', 'IFCBUILDINGSTOREY', 'IFCSPACE'].flatMap((typ) =>
    m.von(typ).map((k) => [typ, k.attr[0], k.attr[2], m.mengen.has(k.nr) ? mengenInSi(m.mengen.get(k.nr).werte, faktor) : null]));
  assert.deepEqual(knoten(drei, '1000'), knoten(vier, '1'));
  // Beispiel: Außenwand Süd EG, Länge 11990 mm = 11,99 m; Seitenfläche in m² wie in IFC 4
  const aw = drei.bauteil('AW-EG-S').mengen.werte;
  assert.deepEqual([aw.get('Length').text, aw.get('NetSideArea').text], ['11990.', '28.804175']);
  assert.equal(drei.von('IFCBUILDINGSTOREY')[1].attr[9].zahl, '3000.');
  // IFC 2x3 schreibt Umlaute als \X\hh (Latin-1), IFC 4 als \X2\hhhh\X0\
  assert.ok(text.includes("'Au\\X\\DFenwand S\\X\\FCd EG'"));
});
