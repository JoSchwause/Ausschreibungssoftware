// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Tethys AVA contributors
//
// Selbsttest der Fixtures. Aufruf: node --test fixtures/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { erzeugeAlle } from './erzeugen.mjs';
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
  assert.deepEqual(Object.keys(erste).sort(), ['gross.json', 'handbeispiele.json', 'typisch-angebote.json', 'typisch.json', 'winzig.json', 'zuschlag.json']);
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
  // genau ein Bieter-Angebot hat Ausreisser auf den vorgesehenen Positionen (Annahme A7)
  const flags = Object.values(set.ausreisserAnnahmeA7.jeAngebot);
  const posVon = (oz) => lv.knoten.find((k) => k.ordnungszahl + (k.ozIndex ?? '') === oz).id;
  assert.ok(flags[2].includes(posVon('02.0050')));
  assert.ok(flags[2].includes(posVon('03.0030')));
  assert.equal(flags[0].includes(posVon('02.0050')), false);
});

test('Dezimalwerte in JSON sind nie Zahlen', () => {
  const pruefe = (v, pfad) => {
    assert.notEqual(typeof v, 'number', `Zahl bei ${pfad}`);
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) pruefe(x, `${pfad}.${k}`);
  };
  for (const name of [...LVS, 'typisch-angebote.json', 'handbeispiele.json', 'zuschlag.json']) pruefe(laden(name), name);
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
