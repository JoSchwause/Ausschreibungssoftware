// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Tethys AVA contributors
//
// Selbsttest von `typisch-zahlungen.json` (Ticket 143, A5): jede Sollzahl ein zweites Mal, eigens aus den Eingaben gerechnet
// (nur BigInt, kein Gleitkomma, kein `Date`, ohne die Pakete `abrechnung` und `dezimal`), dazu die Handrechnung als Literale.
// Regel: D-72 mit den Lesarten D-128.3 bis D-128.8 und D-93 (siehe `regel` in der Fixture und README „Abzüge und Zahlungen“).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const laden = (name) => JSON.parse(readFileSync(join(hier, name), 'utf8'));
const fx = laden('typisch-zahlungen.json');
const m4 = laden('typisch-abrechnung.json');

// --- Cent als BigInt, mit Vorzeichen (nur `offen` kann negativ werden) ----------------------------------------------------

/** "8874.40" → 887440n; "-50.00" → −5000n. Genau 2 Stellen (Betrag und Prozent, N3). */
function cent(text) {
  const m = /^(-?)(\d+)\.(\d{2})$/.exec(text);
  if (!m) throw new Error(`kein Wert mit 2 Stellen: ${text}`);
  const w = BigInt(m[2] + m[3]);
  return m[1] === '-' ? -w : w;
}

/** 887440n → "8874.40"; negativ mit führendem "-", nie "-0.00". */
function text(w) {
  const b = w < 0n ? -w : w;
  const s = b.toString().padStart(3, '0');
  return `${w < 0n ? '-' : ''}${s.slice(0, -2)}.${s.slice(-2)}`;
}

/** round(betrag × satz / 100, 2) kaufmännisch, für eine Basis ≥ 0 (Cent × Satz in Hundertstel → Massstab 6 → 2). */
function prozent(betrag, satz) {
  assert.ok(betrag >= 0n && satz >= 0n);
  return (betrag * satz + 5000n) / 10000n;
}

// --- Kalender ohne `Date`: Tage seit 0001-01-01 und zurück -----------------------------------------------------------------

const schalt = (j) => (j % 4 === 0 && j % 100 !== 0) || j % 400 === 0;
const MONAT = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const monatstage = (j, m) => (m === 2 && schalt(j) ? 29 : MONAT[m - 1]);

/** Kalendertage nach `datum` (JJJJ-MM-TT), Tag für Tag gezählt. */
function plusTage(datum, tage) {
  let [j, m, t] = datum.split('-').map(Number);
  for (let i = 0; i < tage; i++) {
    t += 1;
    if (t > monatstage(j, m)) {
      t = 1;
      m += 1;
      if (m > 12) {
        m = 1;
        j += 1;
      }
    }
  }
  return `${String(j).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(t).padStart(2, '0')}`;
}

// --- Die Regel D-72, eigens gerechnet ------------------------------------------------------------------------------

/** Zahlbetrag nach D-34 (7) mit der Vertragsstrafe aus D-72 zwischen Umlagen und Einbehalt. */
function zahlbetrag(kette) {
  const umlagen = kette.umlagen.reduce((s, u) => s + cent(u.betrag), 0n);
  return (
    cent(kette.bruttoKumuliert) - umlagen - cent(kette.vertragsstrafe) - cent(kette.einbehalt) - cent(kette.fruehereZahlbetraege)
  );
}

/** Zahlungsstand nach D-72 / D-128.8 aus der Rechnung und ihrem Zahlbetrag. */
function zahlungsstand(r, z) {
  const fristende = r.skonto !== undefined && r.eingang !== null ? plusTage(r.eingang, r.skonto.fristTage) : null;
  const moeglich = fristende !== null && z > 0n ? prozent(z, cent(r.skonto.satz)) : 0n;
  const steuer = (basis) => (r.bauabzugsteuer === true && basis > 0n ? prozent(basis, cent(fx.bauabzugsteuerSatz)) : 0n);
  const mit = { skonto: moeglich, steuer: steuer(z - moeglich) };
  const ohne = { skonto: 0n, steuer: steuer(z) };
  const zahlungen = r.zahlungen ?? [];
  const summe = zahlungen.reduce((s, x) => s + cent(x.betrag), 0n);
  // Text-Vergleich genügt bei JJJJ-MM-TT.
  const bisFrist = zahlungen.filter((x) => fristende !== null && x.datum <= fristende).reduce((s, x) => s + cent(x.betrag), 0n);
  const verwirklicht = moeglich > 0n && bisFrist >= z - mit.skonto - mit.steuer;
  const fall = verwirklicht ? mit : ohne;
  const szenario = (f) => ({ skonto: text(f.skonto), bauabzugsteuer: text(f.steuer), auszahlung: text(z - f.skonto - f.steuer) });
  const offen = z - fall.skonto - fall.steuer - summe;
  return {
    zahlungsstand: {
      zahlbetrag: text(z),
      fristende,
      mitSkonto: szenario(mit),
      ohneSkonto: szenario(ohne),
      skontoVerwirklicht: verwirklicht,
      verwirklichterSkonto: text(fall.skonto),
      bauabzugsteuer: text(fall.steuer),
      auszahlung: text(z - fall.skonto - fall.steuer),
      summeZahlungen: text(summe),
      offen: text(offen),
    },
    befunde: [
      ...(r.skonto !== undefined && r.eingang === null ? [{ code: 'skonto-ohne-eingang' }] : []),
      ...(zahlungen.length > 0 && offen < 0n ? [{ code: 'zahlungen-ueber-auszahlung', offen: text(offen) }] : []),
    ],
  };
}

// --- Tests ---------------------------------------------------------------------------------------------------------

test('zahlungen: Kalender ohne Date (Fristende, Monats- und Jahreswechsel, Schaltjahr)', () => {
  assert.equal(plusTage('2026-10-30', 14), '2026-11-13');
  assert.equal(plusTage('2026-11-27', 10), '2026-12-07');
  assert.equal(plusTage('2026-12-25', 10), '2027-01-04');
  assert.equal(plusTage('2028-02-25', 5), '2028-03-01'); // 2028 ist ein Schaltjahr: 26., 27., 28., 29.02., 01.03.
  assert.equal(plusTage('2100-02-28', 1), '2100-03-01'); // 2100 nicht
});

test('zahlungen: die Ketten bauen auf M4 auf (gleiche Zeilen, dazu die Vertragsstrafe)', () => {
  const ohneStrafe = (kette) => {
    const rest = { ...kette };
    delete rest.vertragsstrafe;
    return rest;
  };
  assert.deepEqual(ohneStrafe(fx.pruefungen.ar1.kette), m4.pruefungen.ar1.kette);
  assert.deepEqual(ohneStrafe(fx.pruefungen.ar2.kette), {
    ...m4.pruefungen.ar2NachKorrektur.kette,
    zahlbetrag: fx.pruefungen.ar2.kette.zahlbetrag,
  });
  assert.equal(fx.pruefungen.ar1.kette.vertragsstrafe, '0.00');
  assert.equal(fx.pruefungen.ar2.kette.vertragsstrafe, fx.rechnungen[1].vertragsstrafe.betrag);
  // Die Strafe mindert den Zahlbetrag genau um ihren Betrag (keine MwSt-Wirkung, Basis von Umlage und Einbehalt bleibt).
  assert.equal(cent(m4.pruefungen.ar2NachKorrektur.kette.zahlbetrag) - cent(fx.pruefungen.ar2.kette.zahlbetrag), 150000n);
});

test('zahlungen: Zahlbetrag und Zahlungsstand je Rechnung eigens gerechnet = Sollwert', () => {
  const [ar1, ar2] = fx.rechnungen;
  for (const [r, p] of [
    [ar1, fx.pruefungen.ar1],
    [ar2, fx.pruefungen.ar2],
  ]) {
    assert.equal(p.rechnungId, r.id);
    const z = zahlbetrag(p.kette);
    assert.equal(text(z), p.kette.zahlbetrag);
    assert.equal(r.freigabe.zahlbetrag, p.kette.zahlbetrag, 'freigegeben mit dem geprüften Zahlbetrag');
    const ist = zahlungsstand(r, z);
    assert.deepEqual(ist.zahlungsstand, p.zahlungsstand);
    assert.deepEqual(ist.befunde, p.befunde);
  }
});

test('zahlungen: Handrechnung als Literale (Herleitung in der Fixture)', () => {
  // AR 1
  assert.equal(text(cent('9390.89') - cent('46.95') - cent('0.00') - cent('469.54') - 0n), '8874.40');
  assert.equal(text(prozent(cent('8874.40'), cent('3.00'))), '266.23'); // 266,232
  assert.equal(text(prozent(cent('8608.17'), cent('15.00'))), '1291.23'); // 1.291,2255
  assert.equal(text(prozent(cent('8874.40'), cent('15.00'))), '1331.16');
  assert.equal(text(cent('8874.40') - cent('266.23') - cent('1291.23')), '7316.94');
  assert.equal(text(cent('8874.40') - cent('1331.16')), '7543.24');
  // AR 2
  assert.equal(text(cent('20047.70') - cent('100.24') - cent('1500.00') - cent('1002.39') - cent('8874.40')), '8570.67');
  assert.equal(text(prozent(cent('8570.67'), cent('2.00'))), '171.41'); // 171,4134
  assert.equal(text(cent('8570.67') - cent('171.41')), '8399.26');
  assert.equal(text(cent('8570.67') - cent('8000.00')), '570.67');
  // Varianten
  assert.equal(text(cent('8874.40') - cent('1331.16') - cent('7316.94')), '226.30');
  assert.equal(text(cent('8874.40') - cent('266.23') - cent('1291.23') - cent('7366.94')), '-50.00');
});

test('zahlungen: Varianten eigens gerechnet = Sollwert', () => {
  assert.deepEqual(
    fx.varianten.map((v) => v.name),
    ['ar1-ohne-neue-felder', 'ar1-zahlung-nach-fristende', 'ar1-ueberzahlung', 'ar2-ohne-eingang'],
  );
  for (const v of fx.varianten) {
    const z = cent(fx.pruefungen[v.basis].kette.zahlbetrag);
    assert.equal(v.rechnung.id, fx.pruefungen[v.basis].rechnungId, v.name);
    const ist = zahlungsstand(v.rechnung, z);
    assert.deepEqual(ist.zahlungsstand, v.zahlungsstand, v.name);
    assert.deepEqual(ist.befunde, v.befunde, v.name);
  }
});

test('zahlungen: Rechnungen = M4-Rechnungen + Felder aus den Befehlen; Form wie im Vertrag v1.7b', () => {
  const NEU = ['vertragsstrafe', 'skonto', 'bauabzugsteuer', 'zahlungen'];
  fx.rechnungen.forEach((r, i) => {
    const alt = m4.rechnungen[i];
    const name = i === 0 ? 'ar1' : 'ar2';
    const kopf = Object.fromEntries(Object.entries(r).filter(([k]) => !NEU.includes(k)));
    assert.deepEqual(kopf, { ...alt, nummer: Number(alt.nummer), freigabe: { zahlbetrag: fx.pruefungen[name].kette.zahlbetrag } });
    // Feldfolge des Vertrags: die neuen Felder am Ende, in dieser Reihenfolge, fehlend statt null/false/[] (D-128.2).
    const neu = Object.keys(r).filter((k) => NEU.includes(k));
    assert.deepEqual(neu, NEU.filter((k) => neu.includes(k)));
    assert.deepEqual(Object.keys(r).slice(-neu.length), neu);
    const b = fx.befehle[name];
    for (const x of b.vorFreigabe) {
      if (x.art === 'SkontoSetzen') assert.deepEqual(r.skonto, x.skonto);
      if (x.art === 'VertragsstrafeSetzen') assert.deepEqual(r.vertragsstrafe, x.vertragsstrafe);
      if (x.art === 'BauabzugsteuerSetzen') assert.equal(r.bauabzugsteuer, x.bauabzugsteuer);
    }
    assert.equal(b.freigabe.zahlbetrag, r.freigabe.zahlbetrag);
    assert.deepEqual(r.zahlungen, b.nachFreigabe.map((x) => x.zahlung));
    for (const z of r.zahlungen) {
      assert.match(z.id, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      assert.ok(cent(z.betrag) > 0n);
    }
  });
  // Bauabzugsteuer an genau einer Rechnung, Vertragsstrafe an AR 2, Skonto an beiden (D-72-Szenarien).
  assert.deepEqual(fx.rechnungen.map((r) => r.bauabzugsteuer ?? null), [true, null]);
  assert.deepEqual(fx.rechnungen.map((r) => r.vertragsstrafe?.betrag ?? null), [null, '1500.00']);
});

test('C4: die Regel nennt ihre Belege (§ 48 EStG, § 16 VOB/B, §§ 187, 188 BGB) und trennt Lesarten davon', () => {
  const belege = ['§ 48 Abs. 1 Satz 1 EStG', '§ 48 Abs. 3 EStG', '§ 16 Abs. 5 Nr. 2 VOB/B', '§ 187 Abs. 1 BGB', '§ 188 Abs. 1 BGB'];
  for (const beleg of belege) assert.ok(fx.regel.includes(beleg), beleg);
  assert.match(fx.regel, /Lesart von D-72/);
  const readme = readFileSync(join(hier, 'README.md'), 'utf8');
  const abschnitt = readme.slice(readme.indexOf('## Abzüge und Zahlungen: A5'), readme.indexOf('## Handrechnung `winzig`'));
  for (const beleg of belege) assert.ok(abschnitt.includes(beleg), beleg);
});
