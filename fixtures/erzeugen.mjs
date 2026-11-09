// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Tethys AVA contributors
//
// Erzeugt die Fixtures v1 (Ticket 19): winzig, typisch, typisch-angebote, gross, handbeispiele.
// Aufruf: node fixtures/erzeugen.mjs
// Deterministisch: eigener Seed-PRNG, feste UUIDv7-foermige IDs, keine Zeit, kein Math.random().
// Geld und Mengen werden nur mit BigInt gerechnet (siehe rechnen.mjs). Alle Texte sind erfunden.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  STELLEN, parse, format, gesamtpreis, summen, rundeHalfUp, berechneSollwerte, ausreisser,
} from './rechnen.mjs';

const SCHEMA = 'fixture-v1';
const AUSREISSER_SCHWELLE = 20; // Prozent, Glossar "Ausreisser" (Standard +-20 %)

// ---------------------------------------------------------------- PRNG und IDs

function xmur3(text) {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** sfc32, liefert uint32. */
function prng(seed) {
  const s = xmur3(seed);
  let a = s(), b = s(), c = s(), d = s();
  const next = () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return t >>> 0;
  };
  for (let i = 0; i < 12; i++) next();
  const rng = { next, int: (n) => next() % n };
  return rng;
}

const hex = (n, len) => n.toString(16).padStart(len, '0');

/** UUIDv7-foermig: 48 Bit Zeitstempel (fest, je ID +1 ms), Version 7, Variante 10, Rest aus dem Seed-PRNG. */
function idFabrik(seed, startMs) {
  const rng = prng(`${seed}:ids`);
  let zaehler = 0;
  return () => {
    const ms = BigInt(startMs + zaehler++);
    const t = hex(ms, 12);
    const ra = hex(rng.next() & 0xfff, 3);
    const rb1 = hex(0x8 | (rng.next() & 0x3), 1) + hex(rng.next() & 0xfff, 3);
    const rb2 = hex(rng.next(), 8) + hex(rng.next() & 0xffff, 4);
    return `${t.slice(0, 8)}-${t.slice(8)}-7${ra}-${rb1}-${rb2}`;
  };
}

// ---------------------------------------------------------------- Serialisierung

const istFlach = (v) => v === null || typeof v !== 'object'
  || Object.values(v).every((x) => x === null || typeof x !== 'object');

/** JSON, bei dem jedes Objekt/Array ohne verschachtelte Werte in einer Zeile steht (kleine Dateien, gute Diffs). */
function ser(v, einzug = '') {
  if (istFlach(v)) return JSON.stringify(v);
  const n = `${einzug}  `;
  if (Array.isArray(v)) return `[\n${v.map((x) => n + ser(x, n)).join(',\n')}\n${einzug}]`;
  const zeilen = Object.entries(v).map(([k, x]) => `${n}${JSON.stringify(k)}: ${ser(x, n)}`);
  return `{\n${zeilen.join(',\n')}\n${einzug}}`;
}
const alsDatei = (v) => `${ser(v)}\n`;

// ---------------------------------------------------------------- LV-Aufbau

const T = (k, parent, oz, kurztext) => ({ art: 'titel', k, parent, oz, kurztext });
const H = (parent, text) => ({ art: 'hinweis', parent, text });
const P = (k, parent, oz, kurztext, langtext, menge, einheit, ep, extra = {}) => ({
  art: 'position', positionsart: 'normal', k, parent, oz, kurztext, langtext, menge, einheit, ep, ...extra,
});

/** Baut den LV samt Sollwerten. `eintraege` stehen in Dokumentreihenfolge; Eltern per Schluessel `k`. */
function baueLv({ name, seed, startMs, mwstSatz, nachlass, eintraege }) {
  const neueId = idFabrik(seed, startMs);
  const lvId = neueId();
  const idVon = new Map();
  for (const e of eintraege) {
    if (e.k) {
      if (idVon.has(e.k)) throw new Error(`Doppelter Schluessel ${e.k}`);
      idVon.set(e.k, neueId());
    }
  }
  // Hinweise haben keinen Schluessel; ihre IDs folgen nach den Schluessel-IDs, ebenfalls deterministisch.
  const knoten = eintraege.map((e) => {
    const id = e.k ? idVon.get(e.k) : neueId();
    const parentId = e.parent ? idVon.get(e.parent) : lvId;
    if (e.parent && !parentId) throw new Error(`Unbekannter Elternknoten ${e.parent}`);
    if (e.art === 'titel') return { id, parentId, art: 'titel', ordnungszahl: e.oz, kurztext: e.kurztext };
    if (e.art === 'hinweis') return { id, parentId, art: 'hinweis', text: e.text };
    const k = {
      id, parentId, art: 'position', positionsart: e.positionsart, ordnungszahl: e.oz,
    };
    if (e.ozIndex) k.ozIndex = e.ozIndex;
    Object.assign(k, {
      kurztext: e.kurztext, langtext: e.langtext, menge: e.menge, einheit: e.einheit, einheitspreis: e.ep,
    });
    if (e.positionsart === 'bedarf') k.bedarfMitGesamtbetrag = e.bedarfMitGesamtbetrag === true;
    if (e.bezug) k.bezugspositionId = idVon.get(e.bezug);
    if (e.grund) k.grundpositionId = idVon.get(e.grund);
    return k;
  });
  const lv = {
    schemaVersion: SCHEMA,
    art: 'leistungsverzeichnis',
    id: lvId,
    name,
    ozMaske: 'NN.NN.NN.NN.NN.NNNN[I]: je Titelebene zwei Ziffern, Position vier Ziffern, optionaler Index-Buchstabe',
    mwstSatz,
    nachlass,
    knoten,
  };
  lv.sollwerte = berechneSollwerte(knoten, (k) => parse(k.einheitspreis, STELLEN.ep), nachlass, mwstSatz);
  return lv;
}

// ---------------------------------------------------------------- winzig

function erzeugeWinzig() {
  const lv = baueLv({
    name: 'Winzig: Handrechnung (erfunden)',
    seed: 'fixtures-v1/winzig',
    startMs: 1767225600000,
    mwstSatz: '19.00',
    nachlass: null,
    eintraege: [
      T('t1', null, '01', 'Kleine Musterarbeiten'),
      P('p1', 't1', '01.0010', 'Pflaster verlegen', 'Pflasterfläche im Hof herstellen. Erfundener Text für Testzwecke.',
        '1.235', 'm²', '10.00'),
      P('p2', 't1', '01.0020', 'Randstein setzen', 'Randeinfassung entlang des Hofs setzen. Erfundener Text für Testzwecke.',
        '3.333', 'm', '4.56'),
      P('p3', 't1', '01.0030', 'Fläche abdichten', 'Pauschale Abdichtung einer Teilfläche. Erfundener Text für Testzwecke.',
        '5.000', 'm²', '507.49'),
    ].map(kanonisch),
  });
  return lv;
}

/** EP in kanonischer Schreibweise (3 Stellen) und Menge (3 Stellen). */
function kanonisch(e) {
  if (e.art !== 'position') return e;
  return { ...e, menge: format(parse(e.menge, STELLEN.menge), STELLEN.menge), ep: format(parse(e.ep, STELLEN.ep), STELLEN.ep) };
}

// ---------------------------------------------------------------- typisch

function erzeugeTypisch() {
  const e = [];
  e.push(T('t1', null, '01', 'Baustelleneinrichtung und Vorarbeiten'));
  e.push(H('t1', 'Vorbemerkung (erfunden): Die Zufahrt zum Grundstück ist während der gesamten Bauzeit freizuhalten.'));
  e.push(P('p0110', 't1', '01.0010', 'Baustelle einrichten', 'Baustelle einrichten, vorhalten und am Ende räumen. Pauschal.', '1.000', 'psch', '1850.00'));
  e.push(P('p0120', 't1', '01.0020', 'Bauzaun stellen', 'Bauzaun liefern, aufstellen, vorhalten und abbauen.', '86.500', 'm', '7.45'));
  e.push(P('p0130', 't1', '01.0030', 'Baustrom und Bauwasser', 'Baustrom und Bauwasser bereitstellen, je Monat.', '4.000', 'Mon', '215.50'));
  e.push(P('p0140', 't1', '01.0040', 'Verkehrssicherung Zufahrt', 'Verkehrssicherung der Zufahrt nach Anordnung, nur bei Bedarf.', '12.000', 'h', '48.90',
    { positionsart: 'bedarf', bedarfMitGesamtbetrag: false }));
  e.push(P('p0150', 't1', '01.0050', 'Bauschutt entsorgen', 'Container stellen, abfahren und Bauschutt ordnungsgemäß entsorgen.', '3.000', 'St', '389.99'));
  e.push(P('p0160', 't1', '01.0060', 'Grundstück räumen', 'Bewuchs und lose Ablagerungen auf der Baufläche entfernen.', '410.750', 'm²', '2.38'));

  e.push(T('t2', null, '02', 'Erd- und Betonarbeiten'));
  e.push(P('p0210', 't2', '02.0010', 'Oberboden abtragen', 'Oberboden abtragen und seitlich lagern.', '123.450', 'm³', '6.12'));
  e.push(P('p0220', 't2', '02.0020', 'Baugrube ausheben', 'Baugrube ausheben, Aushub seitlich lagern.', '318.200', 'm³', '9.835'));
  e.push(P('p0230', 't2', '02.0030', 'Baugrube verfüllen', 'Arbeitsraum mit gelagertem Aushub verfüllen und verdichten.', '140.000', 'm³', '5.25'));
  e.push(P('p0240', 't2', '02.0040', 'Sauberkeitsschicht', 'Sauberkeitsschicht aus Magerbeton herstellen.', '96.000', 'm²', '11.48'));
  e.push(P('p0250', 't2', '02.0050', 'Fundamente betonieren', 'Streifenfundamente aus Ortbeton herstellen.', '38.750', 'm³', '168.90'));
  e.push(P('p0250a', 't2', '02.0050', 'Zuschlag Frosteinbau', 'Mehraufwand für Betonieren bei Frost, zusätzlich zur Position 02.0050.', '38.750', 'm³', '14.30',
    { positionsart: 'zuschlag', ozIndex: 'A', bezug: 'p0250' }));
  e.push(P('p0260', 't2', '02.0060', 'Betonstahl verlegen', 'Betonstahl liefern, schneiden, biegen und verlegen.', '3350.000', 'kg', '1.64'));
  e.push(P('p0270', 't2', '02.0070', 'Bodenplatte herstellen', 'Bodenplatte aus Ortbeton herstellen.', '96.000', 'm²', '52.70'));
  e.push(P('p0270a', 't2', '02.0070', 'Bodenplatte wasserundurchlässig', 'Alternative zur Position 02.0070: Bodenplatte in wasserundurchlässiger Ausführung.', '96.000', 'm²', '61.25',
    { positionsart: 'wahl', ozIndex: 'A', grund: 'p0270' }));
  e.push(P('p0280', 't2', '02.0080', 'Sockel abdichten', 'Fundamentsockel gegen Feuchtigkeit abdichten.', '42.000', 'm', '18.76'));
  e.push(P('p0290', 't2', '02.0090', 'Drainage verlegen', 'Ringdrainage liefern und verlegen.', '44.250', 'm', '23.91'));

  e.push(T('t3', null, '03', 'Ausbau und Oberflächen'));
  e.push(H('t3', 'Vorbemerkung (erfunden): Alle Oberflächen sind in der Reihenfolge der Positionen abzustimmen.'));
  e.push(P('p0310', 't3', '03.0010', 'Innenwände mauern', 'Nichttragende Innenwände aus Mauerwerk herstellen.', '212.400', 'm²', '48.75'));
  e.push(P('p0320', 't3', '03.0020', 'Innenputz', 'Wandflächen innen verputzen.', '424.800', 'm²', '19.36'));
  e.push(P('p0330', 't3', '03.0030', 'Estrich einbringen', 'Zementestrich einbringen und abglätten.', '88.250', 'm²', '21.80'));
  e.push(P('p0340', 't3', '03.0040', 'Wandanstrich', 'Wandflächen zweimal streichen.', '424.800', 'm²', '5.14'));
  e.push(P('p0350', 't3', '03.0050', 'Türzargen einbauen', 'Stahlzargen liefern und einbauen.', '9.000', 'St', '134.50'));
  e.push(P('p0360', 't3', '03.0060', 'Sockelleiste', 'Sockelleisten liefern und befestigen.', '76.400', 'm', '6.875'));
  e.push(P('p0370', 't3', '03.0070', 'Silikonfuge', 'Anschlussfugen elastisch verfugen.', '31.600', 'm', '4.21'));
  e.push(P('p0380', 't3', '03.0080', 'Endreinigung', 'Bauendreinigung der Räume.', '88.250', 'm²', '2.09'));

  return baueLv({
    name: 'Typisch: Musterhaus (erfunden)',
    seed: 'fixtures-v1/typisch',
    startMs: 1767225600000 + 1_000_000,
    mwstSatz: '19.00',
    nachlass: { art: 'prozent', wert: '2.00' },
    eintraege: e.map(kanonisch),
  });
}

// ---------------------------------------------------------------- Angebote zu typisch

function erzeugeAngebote(lv) {
  const rng = prng('fixtures-v1/typisch-angebote');
  const neueId = idFabrik('fixtures-v1/typisch-angebote', 1767225600000 + 2_000_000);
  const positionen = lv.knoten.filter((k) => k.art === 'position');
  const jeOz = (oz) => {
    const p = positionen.find((x) => x.ordnungszahl + (x.ozIndex ?? '') === oz);
    if (!p) throw new Error(`Position ${oz} fehlt`);
    return p.id;
  };
  const bieterSpec = [
    { name: 'Bieter A', basis: 1000, nachlass: null, nicht: [], faktor: {}, nullEp: [] },
    { name: 'Bieter B', basis: 1060, nachlass: { art: 'prozent', wert: '3.00' }, nicht: ['03.0070'], faktor: {}, nullEp: [] },
    // Ausreisser: zwei Positionen mit 150 % des Basispreises; 0,000 ist ein angebotener Preis (nicht "nicht angeboten").
    { name: 'Bieter C', basis: 930, nachlass: null, nicht: [], faktor: { '02.0050': 1500, '03.0030': 1500 }, nullEp: ['03.0080'] },
  ];
  const lvId = lv.id;
  const bieter = bieterSpec.map((b) => ({ id: neueId(), name: b.name }));
  const gpMaps = [];
  const angebote = bieterSpec.map((b, i) => {
    const nicht = new Set(b.nicht.map(jeOz));
    const nullEp = new Set(b.nullEp.map(jeOz));
    const faktor = new Map(Object.entries(b.faktor).map(([oz, f]) => [jeOz(oz), f]));
    const zeilen = positionen.map((p) => {
      // Zufallsstreuung immer ziehen, damit die Folge nicht von Sonderfaellen abhaengt: -30..+30 Promille
      const streuung = rng.int(61) - 30;
      if (nicht.has(p.id)) return { positionId: p.id, status: 'nicht-angeboten' };
      if (nullEp.has(p.id)) return { positionId: p.id, status: 'angeboten', einheitspreis: format(0n, STELLEN.ep) };
      const f = BigInt(faktor.get(p.id) ?? b.basis + streuung);
      const ep = rundeHalfUp(parse(p.einheitspreis, STELLEN.ep) * f, STELLEN.ep + 3, STELLEN.ep); // EP x Promille / 1000
      return { positionId: p.id, status: 'angeboten', einheitspreis: format(ep, STELLEN.ep) };
    });
    const epVon = new Map(zeilen.map((z) => [z.positionId, z.status === 'angeboten' ? parse(z.einheitspreis, STELLEN.ep) : null]));
    const gpMap = new Map();
    const soll = berechneSollwerte(lv.knoten, (k) => epVon.get(k.id), b.nachlass, lv.mwstSatz, gpMap);
    gpMaps.push(gpMap);
    return { id: neueId(), bieterId: bieter[i].id, nachlass: b.nachlass, positionen: zeilen, sollwerte: soll };
  });
  const flags = ausreisser(gpMaps, AUSREISSER_SCHWELLE);
  const ausreisserAnnahmeA7 = {
    schwellePromille: String(AUSREISSER_SCHWELLE * 10),
    regel: 'Annahme A7 im README: |GP - Mittel| / Mittel > Schwelle; Mittel aus allen Angeboten, die die Position angeboten haben, mindestens 3 Werte.',
    jeAngebot: Object.fromEntries(angebote.map((a, i) => [a.id, flags[i]])),
  };
  return {
    schemaVersion: SCHEMA,
    art: 'angebotsset',
    lvId,
    lvName: lv.name,
    bieter,
    angebote,
    ausreisserAnnahmeA7,
  };
}

// ---------------------------------------------------------------- gross

const WORTE = {
  gewerk: ['Mauerwerk', 'Putz', 'Estrich', 'Beton', 'Anstrich', 'Dämmung', 'Fliesen', 'Trockenbau', 'Rohrleitung', 'Kabelführung'],
  tat: ['herstellen', 'liefern und einbauen', 'verlegen', 'montieren', 'ausbessern', 'abdichten', 'beschichten', 'verfugen'],
  ort: ['Treppenhaus', 'Flur', 'Technikraum', 'Kellerraum', 'Hof', 'Erdgeschoss', 'Obergeschoss', 'Dachgeschoss'],
  mass: ['leichte', 'mittlere', 'schwere', 'einfache', 'erhöhte'],
};
const EINHEITEN = ['m', 'm²', 'm³', 'St', 'kg', 'h', 'psch'];

function erzeugeGross() {
  const rng = prng('fixtures-v1/gross');
  const wahl = (liste) => liste[rng.int(liste.length)];
  const e = [];
  const ebenen = [5, 3, 3, 3, 3]; // Titel je Ebene: 5 * 3 * 3 * 3 * 3 = 405 Titel der 5. Ebene
  const blaetter = [];
  const zwei = (n) => String(n).padStart(2, '0');
  const baue = (ebene, parentKey, ozTeile) => {
    for (let i = 1; i <= ebenen[ebene]; i++) {
      const teile = [...ozTeile, zwei(i)];
      const key = `t${teile.join('.')}`;
      e.push(T(key, parentKey, teile.join('.'), `${wahl(WORTE.ort)}, Abschnitt ${teile.join('.')}`));
      if (ebene === 0) e.push(H(key, `Vorbemerkung (erfunden) zum Titel ${zwei(i)}: Angaben gelten für alle Untertitel.`));
      if (ebene + 1 < ebenen.length) baue(ebene + 1, key, teile);
      else blaetter.push({ key, teile });
    }
  };
  baue(0, null, []);
  let gesamt = 0;
  blaetter.forEach(({ key, teile }, bi) => {
    const anzahl = 12 + (bi < 140 ? 1 : 0); // 405 * 12 + 140 = 5000
    let letzteNormal = null;
    for (let i = 0; i < anzahl; i++) {
      const pk = `p${++gesamt}`;
      const r = i === 0 ? 0 : rng.int(100);
      const art = r < 90 ? 'normal' : r < 94 ? 'bedarf-ohne' : r < 96 ? 'bedarf-mit' : r < 98 ? 'wahl' : 'zuschlag';
      const menge = format(BigInt(1000 + rng.int(499_000)), STELLEN.menge);
      const ep = format(BigInt(500 + rng.int(249_500)), STELLEN.ep);
      const kurz = `${wahl(WORTE.gewerk)} ${wahl(WORTE.tat)}`;
      const lang = `${wahl(WORTE.mass)} Ausführung im Bereich ${wahl(WORTE.ort)}; ${kurz}. Erfundener Text für Leistungstests.`;
      const extra = {};
      if (art === 'bedarf-ohne') Object.assign(extra, { positionsart: 'bedarf', bedarfMitGesamtbetrag: false });
      else if (art === 'bedarf-mit') Object.assign(extra, { positionsart: 'bedarf', bedarfMitGesamtbetrag: true });
      else if (art === 'wahl') Object.assign(extra, { positionsart: 'wahl', grund: letzteNormal });
      else if (art === 'zuschlag') Object.assign(extra, { positionsart: 'zuschlag', bezug: letzteNormal });
      e.push(P(pk, key, `${teile.join('.')}.${String((i + 1) * 10).padStart(4, '0')}`, kurz, lang, menge, wahl(EINHEITEN), ep, extra));
      if (art === 'normal') letzteNormal = pk;
    }
  });
  return baueLv({
    name: 'Groß: Leistungstest (erfunden)',
    seed: 'fixtures-v1/gross',
    startMs: 1767225600000 + 10_000_000,
    mwstSatz: '19.00',
    nachlass: { art: 'prozent', wert: '1.50' },
    eintraege: e,
  });
}

// ---------------------------------------------------------------- Handbeispiele

function erzeugeHandbeispiele() {
  const gp = (m, ep) => {
    const exakt = parse(m, 3) * parse(ep, 3);
    return { menge: m, einheitspreis: ep, exakt: format(exakt, 6), gp: format(gesamtpreis(parse(m, 3), parse(ep, 3)), 2) };
  };
  const kette = (netto, nachlass, satz) => {
    const n = parse(netto, 2);
    const s = summen(n, nachlass, satz);
    return { netto, nachlass, mwstSatz: satz, soll: s };
  };
  return {
    schemaVersion: SCHEMA,
    art: 'handbeispiele',
    regel: 'GP = round_half_up(Menge x EP, 2); MwSt auf Netto nach Nachlass, round_half_up auf 2 (N2).',
    gesamtpreise: [gp('1.235', '10.00'), gp('3.333', '4.56')],
    summenketten: [
      { ...kette('27.55', null, '19.00'), exaktMwst: '5.2345' },
      { ...kette('402.73', { art: 'prozent', wert: '3.00' }, '19.00'), exaktNachlass: '12.0819', exaktMwst: '74.2235' },
    ],
  };
}

// ---------------------------------------------------------------- Ausgabe

/** Liefert Dateiname -> Dateiinhalt. */
export function erzeugeAlle() {
  const typisch = erzeugeTypisch();
  return {
    'winzig.json': alsDatei(erzeugeWinzig()),
    'typisch.json': alsDatei(typisch),
    'typisch-angebote.json': alsDatei(erzeugeAngebote(typisch)),
    'gross.json': alsDatei(erzeugeGross()),
    'handbeispiele.json': alsDatei(erzeugeHandbeispiele()),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ziel = dirname(fileURLToPath(import.meta.url));
  for (const [name, inhalt] of Object.entries(erzeugeAlle())) {
    writeFileSync(join(ziel, name), inhalt, 'utf8');
    console.log(`${name}: ${Buffer.byteLength(inhalt)} Bytes`);
  }
}
