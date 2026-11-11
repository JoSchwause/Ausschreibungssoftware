// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Tethys AVA contributors
//
// Erzeugt die Fixtures v1 (Ticket 19): winzig, typisch, typisch-angebote, gross, handbeispiele; zuschlag (Ticket 37).
// Seit Ticket 51 tragen typisch, typisch-angebote und gross ihre Zuschlagspositionen in GAEB-Form (Satz und Bezug).
// Ticket 69: je Bieter eine X84 unter angebote/ und Preisspiegel-Sollwerte in typisch-angebote.json.
// Aufruf: node fixtures/erzeugen.mjs
// Deterministisch: eigener Seed-PRNG, feste UUIDv7-foermige IDs, keine Zeit, kein Math.random().
// Geld und Mengen werden nur mit BigInt gerechnet (siehe rechnen.mjs). Alle Texte sind erfunden.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  STELLEN, parse, format, gesamtpreis, summen, rundeHalfUp, berechneSollwerte, ausreisser, berechneZuschlagSollwerte,
  berechneSollwerteGaeb, preiseDesLv, preisspiegelSollwerte,
} from './rechnen.mjs';

const SCHEMA = 'fixture-v1';

// OZ-Maske als Text: vor dem ersten ":" stehen die Stellen (N = Ziffer, I = Index), das Trennzeichen "." zaehlt nicht.
// Regel F2 / E-09: hoechstens 14 Stellen einschliesslich des einstelligen Index. Der Fixture-Test prueft das.
// VORLAEUFIGE ANNAHME, ENTSCHEIDUNG OFFEN: Die Masken sind so gekuerzt, dass die vorhandenen OZ unveraendert passen
// (Ticket 25). winzig/typisch haben eine Titelebene und Indexpositionen; gross hat fuenf Titelebenen und keinen Index.
// Alternative: eine einzige Maske fuer alle (5 x 2 + Position 3 + Index 1 = 14), dann muessten alle Positionsnummern
// dreistellig werden.
const MASKE_KLEIN =
  'NN.NN.NNNN[I]: zwei Titelebenen zu je zwei Ziffern (die Fixture nutzt eine), Position vier Ziffern, Index ein Buchstabe';
const MASKE_GROSS =
  'NN.NN.NN.NN.NN.NNNN: fünf Titelebenen zu je zwei Ziffern, Position vier Ziffern, kein Index';
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

/** Tiefensuche ueber parentId; Geschwister behalten ihre Reihenfolge im Eingabearray. */
function dokumentreihenfolge(wurzelId, knoten) {
  const kinder = new Map();
  for (const k of knoten) {
    if (!kinder.has(k.parentId)) kinder.set(k.parentId, []);
    kinder.get(k.parentId).push(k);
  }
  const aus = [];
  const besuche = (id) => {
    for (const k of kinder.get(id) ?? []) {
      aus.push(k);
      besuche(k.id);
    }
  };
  besuche(wurzelId);
  if (aus.length !== knoten.length) throw new Error('Knoten ohne Verbindung zum LV');
  return aus;
}

/**
 * Baut den LV samt Sollwerten. `eintraege` stehen in Dokumentreihenfolge; Eltern per Schluessel `k`. Eine
 * Zuschlagsposition traegt `zuschlag: { satz, bezug: [Schluessel] }` (GAEB-Form, Bezugsform Liste, Ticket 51) und
 * keine Menge, Einheit, EP. `gaebForm`: Sollwerte mit `berechneSollwerteGaeb` (Zuschlagsbetraege, Ausweise); sonst
 * die Sollwerte von Ticket 19 (`winzig`, byte-gleich).
 */
function baueLv({ name, seed, startMs, mwstSatz, nachlass, eintraege, ozMaske, gaebForm = false }) {
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
    if (e.grund) k.grundpositionId = idVon.get(e.grund);
    if (e.zuschlag) {
      k.zuschlag = {
        prozentsatz: e.zuschlag.satz,
        bezug: {
          art: 'positionen',
          positionen: e.zuschlag.bezug.map((b) => {
            if (!idVon.has(b)) throw new Error(`Unbekannte Bezugsposition ${b}`);
            return { positionId: idVon.get(b), teilmenge: null };
          }),
        },
      };
    }
    return k;
  });
  const lv = {
    schemaVersion: SCHEMA,
    art: 'leistungsverzeichnis',
    id: lvId,
    name,
    ozMaske,
    mwstSatz,
    nachlass,
    knoten,
  };
  // Dokumentreihenfolge: Eltern vor Kindern, Geschwister in Arrayreihenfolge. IDs und Werte bleiben, nur die Lage aendert sich.
  lv.knoten = dokumentreihenfolge(lvId, knoten);
  lv.sollwerte = gaebForm
    ? berechneSollwerteGaeb(lv.knoten, preiseDesLv, nachlass, mwstSatz)
    : berechneSollwerte(lv.knoten, (k) => parse(k.einheitspreis, STELLEN.ep), nachlass, mwstSatz);
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
    ozMaske: MASKE_KLEIN,
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

/** EP in kanonischer Schreibweise (3 Stellen) und Menge (3 Stellen); `null` bleibt `null` (Zuschlagsposition). */
function kanonisch(e) {
  if (e.art !== 'position') return e;
  const k = (v, n) => (v === null ? null : format(parse(v, n), n));
  return { ...e, menge: k(e.menge, STELLEN.menge), ep: k(e.ep, STELLEN.ep) };
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
  // GAEB-Form (Ticket 51, E-03): Satz 8,50 % auf die Liste mit 02.0050; Menge, Einheit und EP entfallen.
  // Betrag = round_half_up(6.544,88 x 8,50 / 100, 2) = 556,31 (vorher Altform 38,750 x 14,30 = 554,13).
  e.push(P('p0250a', 't2', '02.0050', 'Zuschlag Frosteinbau', 'Mehraufwand für Betonieren bei Frost, zusätzlich zur Position 02.0050.', null, null, null,
    { positionsart: 'zuschlag', ozIndex: 'A', zuschlag: { satz: '8.50', bezug: ['p0250'] } }));
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
    ozMaske: MASKE_KLEIN,
    eintraege: e.map(kanonisch),
    gaebForm: true,
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
      const f = BigInt(faktor.get(p.id) ?? b.basis + streuung);
      if (p.zuschlag) {
        // Zuschlagsposition (Ticket 51): der Bieter bietet einen Satz statt eines EP (Vertrag v1.2 `zuschlagssatz`),
        // Satz des LV x Promille / 1000, auf 2 Stellen gerundet. Kein EP in der Fixture (der Platzhalter `0.000`
        // des Vertrags ist kein Preis; ihn setzt der Testhelfer beim Abbilden).
        const satz = rundeHalfUp(parse(p.zuschlag.prozentsatz, STELLEN.prozent) * f, STELLEN.prozent + 3, STELLEN.prozent);
        return { positionId: p.id, status: 'angeboten', zuschlagssatz: format(satz, STELLEN.prozent) };
      }
      if (nullEp.has(p.id)) return { positionId: p.id, status: 'angeboten', einheitspreis: format(0n, STELLEN.ep) };
      const ep = rundeHalfUp(parse(p.einheitspreis, STELLEN.ep) * f, STELLEN.ep + 3, STELLEN.ep); // EP x Promille / 1000
      return { positionId: p.id, status: 'angeboten', einheitspreis: format(ep, STELLEN.ep) };
    });
    const preisVon = new Map(zeilen.map((z) => [z.positionId, z.status !== 'angeboten' ? null : {
      ep: z.einheitspreis === undefined ? null : parse(z.einheitspreis, STELLEN.ep),
      satz: z.zuschlagssatz === undefined ? null : parse(z.zuschlagssatz, STELLEN.prozent),
    }]));
    const gpMap = new Map();
    const soll = berechneSollwerteGaeb(lv.knoten, (k) => preisVon.get(k.id), b.nachlass, lv.mwstSatz, gpMap);
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
    preisspiegel: preisspiegelDerAngebote(lv, bieter, angebote),
  };
}

/** Dateiname der X84 eines Bieters relativ zu `fixtures/` (Ticket 69): „Bieter A“ -> `angebote/typisch-bieter-a.x84`. */
const x84Datei = (name) => `angebote/typisch-${name.toLowerCase().replace(/\s+/g, '-')}.x84`;

/**
 * Preisspiegel-Sollwerte (Ticket 69, additiv): je Bieter Datei, Summen und Titelsummen (Titel über die OZ, weil ein
 * per X83 eingelesenes LV andere IDs hat), dazu Rang und virtuelle Bieter fuer alle drei Angebote und jedes Paar
 * (das Tor M3 liest zwei Dateien ein). Gerechnet in `rechnen.mjs` (`preisspiegelSollwerte`), nie aus `vergabe`.
 */
function preisspiegelDerAngebote(lv, bieter, angebote) {
  const titelOz = new Map(lv.knoten.filter((k) => k.art === 'titel').map((k) => [k.id, k.ordnungszahl]));
  const auswahlen = [[0, 1, 2], [0, 1], [0, 2], [1, 2]];
  return {
    regel: 'Ticket 69, README „Preisspiegel-Sollwerte“: Rang nach Netto nach Nachlass (1, 1, 3); virtuelle Bieter je '
      + 'eingehender Position über Werte > 0 (EP, an Zuschlagspositionen der Betrag), Mittel = Summe / Anzahl '
      + 'kaufmännisch auf 3 (EP) bzw. 2 Stellen (Betrag), Netto ohne Nachlass (D-05, D-36.1, D-44.1).',
    bieter: angebote.map((a, i) => ({
      angebotId: a.id,
      bieterId: a.bieterId,
      name: bieter[i].name,
      datei: x84Datei(bieter[i].name),
      summen: a.sollwerte.summen,
      titel: Object.fromEntries(Object.entries(a.sollwerte.titel).map(([id, t]) => [titelOz.get(id), t.summe])),
    })),
    vergleiche: auswahlen.map((ix) => preisspiegelSollwerte(lv.knoten, ix.map((i) => angebote[i]), lv.sollwerte)),
  };
}

// ---------------------------------------------------------------- X84 der Angebote (Ticket 69)

// Eigener, kleiner XML-Baustein, unabhaengig vom Writer in `packages/gaeb`. Form nach den amtlichen X84
// (fixtures/extern/bvbs/3.3-*) und dem X84-Leser (Ticket 45): je Position nur `UP` und `IT`, an der Zuschlagsposition
// `ITMarkup`, `Markup`, `IT`; „nicht angeboten“ ist eine Zeile ohne `UP` (Ticket 45); der Nachlass des Angebots steht
// in `BoQInfo/Totals`. Feste Zeitangaben (deterministisch).

const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Element: `inhalt` ist ein Text, eine Liste von Elementen oder fehlt (leeres Element). */
const xe = (name, inhalt, attrs = {}) => ({ name, inhalt, attrs });

function xmlZeilen(e, einzug = '') {
  const a = Object.entries(e.attrs).map(([k, v]) => ` ${k}="${xmlEsc(v)}"`).join('');
  if (e.inhalt === undefined) return [`${einzug}<${e.name}${a}/>`];
  if (!Array.isArray(e.inhalt)) return [`${einzug}<${e.name}${a}>${xmlEsc(e.inhalt)}</${e.name}>`];
  return [`${einzug}<${e.name}${a}>`, ...e.inhalt.flatMap((k) => xmlZeilen(k, `${einzug}  `)), `${einzug}</${e.name}>`];
}

/** BoQBkdn aus der Fixture-Maske `NN.NN.NNNN[I]: …` (wie der X83-Export von `typisch`: Index alphanumerisch). */
function boqBkdn(ozMaske) {
  const muster = ozMaske.split(':')[0];
  const teile = muster.replace('[I]', '').split('.');
  const stufe = (typ, laenge, num) => xe('BoQBkdn', [xe('Type', typ), xe('Length', String(laenge)), xe('Num', num)]);
  return [
    ...teile.slice(0, -1).map((t) => stufe('BoQLevel', t.length, 'Yes')),
    stufe('Item', teile.at(-1).length, 'Yes'),
    ...(muster.includes('[I]') ? [stufe('Index', 1, 'No')] : []),
  ];
}

/** Eine Angebotsdatei X84 (GAEB DA XML 3.3) zu einem Angebot aus `typisch-angebote.json`. */
function schreibeX84(lv, angebot, bieterName) {
  const s = angebot.sollwerte;
  const zeilen = new Map(angebot.positionen.map((z) => [z.positionId, z]));
  const kinder = new Map();
  for (const k of lv.knoten) {
    if (!kinder.has(k.parentId)) kinder.set(k.parentId, []);
    kinder.get(k.parentId).push(k);
  }
  let nr = 0;
  const gaebId = (praefix) => `${praefix}${String(++nr).padStart(4, '0')}`;
  const letzterTeil = (oz) => oz.split('.').at(-1);

  const zeile = (p) => {
    const attrs = { ID: gaebId('P'), RNoPart: letzterTeil(p.ordnungszahl), ...(p.ozIndex ? { RNoIndex: p.ozIndex } : {}) };
    const z = zeilen.get(p.id);
    if (z.status !== 'angeboten') return xe('Item', undefined, attrs);
    const soll = s.positionen[p.id];
    if (p.zuschlag) {
      return xe('MarkupItem', [
        xe('ITMarkup', s.zuschlaege[p.id].basis), xe('Markup', z.zuschlagssatz), xe('IT', soll.gp),
      ], attrs);
    }
    return xe('Item', [xe('UP', z.einheitspreis), xe('IT', soll.gp)], attrs);
  };
  const koerper = (elternId) => {
    const k = (kinder.get(elternId) ?? []).filter((x) => x.art !== 'hinweis'); // Hinweise traegt das LV, nicht das Angebot
    const titel = k.filter((x) => x.art === 'titel');
    if (titel.length > 0 && titel.length < k.length) throw new Error('Titel und Positionen auf einer Ebene');
    if (titel.length > 0) {
      return titel.map((t) => {
        const attrs = { ID: gaebId('G'), RNoPart: letzterTeil(t.ordnungszahl) }; // IDs in Dokumentreihenfolge
        return xe('BoQCtgy', [xe('BoQBody', koerper(t.id)), xe('Totals', [xe('Total', s.titel[t.id].summe)])], attrs);
      });
    }
    return [xe('Itemlist', k.map(zeile))];
  };

  const totals = [xe('Total', s.summen.netto)];
  if (angebot.nachlass) {
    totals.push(xe(angebot.nachlass.art === 'prozent' ? 'DiscountPcnt' : 'DiscountAmt', angebot.nachlass.wert));
    totals.push(xe('TotAfterDisc', s.summen.nettoNachNachlass));
  }
  totals.push(xe('VAT', lv.mwstSatz), xe('VATAmount', s.summen.mwst), xe('TotalGross', s.summen.brutto));

  const gaeb = xe('GAEB', [
    xe('GAEBInfo', [
      xe('Version', '3.3'), xe('VersDate', '2021-05'), xe('Date', '2026-01-01'), xe('Time', '12:00:00'),
      xe('ProgSystem', 'Tethys AVA Fixtures (fixtures/erzeugen.mjs)'),
    ]),
    xe('PrjInfo', [xe('NamePrj', lv.name)]),
    xe('Award', [
      xe('DP', '84'),
      xe('AwardInfo', [xe('Cur', 'EUR'), xe('CurLbl', 'Euro')]),
      xe('CTR', [xe('Address', [xe('Name1', bieterName)])]),
      xe('BoQ', [
        xe('BoQInfo', [xe('Name', lv.name), ...boqBkdn(lv.ozMaske), xe('Totals', totals)]),
        xe('BoQBody', koerper(lv.id)),
      ], { ID: 'Q0001' }),
    ]),
  ], { xmlns: 'http://www.gaeb.de/GAEB_DA_XML/DA84/3.3' });
  return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlZeilen(gaeb).join('\n')}\n`;
}

/** Je Bieter eine X84 (Dateiname -> Inhalt). */
function erzeugeX84(lv, set) {
  return Object.fromEntries(set.preisspiegel.bieter.map((b) => {
    const angebot = set.angebote.find((a) => a.id === b.angebotId);
    return [b.datei, schreibeX84(lv, angebot, b.name)];
  }));
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
  // Eigener Strom fuer die Zuschlagssaetze (Ticket 51), damit alle uebrigen Werte gleich bleiben: 1,00 bis 15,00 %.
  const satzRng = prng('fixtures-v1/gross/zuschlagssatz');
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
      else if (art === 'zuschlag') {
        const satz = format(BigInt(100 + satzRng.int(1401)), STELLEN.prozent);
        Object.assign(extra, { positionsart: 'zuschlag', zuschlag: { satz, bezug: [letzteNormal] } });
      }
      const einheit = wahl(EINHEITEN); // immer ziehen, damit die Folge gleich bleibt
      const oz = `${teile.join('.')}.${String((i + 1) * 10).padStart(4, '0')}`;
      // Zuschlagsposition in GAEB-Form (Ticket 51): Menge, Einheit und EP gezogen, aber nicht gesetzt.
      if (art === 'zuschlag') e.push(P(pk, key, oz, kurz, lang, null, null, null, extra));
      else e.push(P(pk, key, oz, kurz, lang, menge, einheit, ep, extra));
      if (art === 'normal') letzteNormal = pk;
    }
  });
  return baueLv({
    name: 'Groß: Leistungstest (erfunden)',
    seed: 'fixtures-v1/gross',
    startMs: 1767225600000 + 10_000_000,
    mwstSatz: '19.00',
    nachlass: { art: 'prozent', wert: '1.50' },
    ozMaske: MASKE_GROSS,
    eintraege: e,
    gaebForm: true,
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
    gesamtpreise: [gp('1.235', '10.000'), gp('3.333', '4.560')],
    summenketten: [
      { ...kette('27.55', null, '19.00'), exaktMwst: '5.2345' },
      { ...kette('402.73', { art: 'prozent', wert: '3.00' }, '19.00'), exaktNachlass: '12.0819', exaktMwst: '74.2235' },
    ],
  };
}

// ---------------------------------------------------------------- zuschlag (Ticket 37)

/**
 * LV mit Zuschlagspositionen in GAEB-Form (alle drei Bezugsformen) und Einheitspreisanteilen. Texte selbst verfasst,
 * Mengen, EP und Saetze aus den amtlichen Pruefdateien (BVBS 3.3 AVA X86, Bereich 1.30 und 1.10.30.20; D-03, C4).
 * Sollwerte rechnet `berechneZuschlagSollwerte` (rechnen.mjs, BigInt), unabhaengig vom Kern.
 */
function erzeugeZuschlag() {
  const neueId = idFabrik('fixtures-v1/zuschlag', 1767225600000 + 20_000_000);
  const lvId = neueId();
  const N = (k, parent, oz, kurztext, menge, einheit, ep, extra = {}) => ({
    art: 'position', k, parent, oz, kurztext, menge, einheit, ep, ...extra,
  });
  const Z = (k, parent, oz, kurztext, satz, bezug) => ({ art: 'zuschlag', k, parent, oz, kurztext, satz, bezug });
  const e = [
    T('t01', null, '01', 'Zuschläge'),
    T('t0101', 't01', '01.01', 'Zuschlag auf gekennzeichnete Positionen'),
    N('p010110', 't0101', '01.01.0010', 'Leitung verlegen, gekennzeichnet', '10.000', 'm', '10.000', { kennz: true }),
    N('p010120', 't0101', '01.01.0020', 'Leitung verlegen, ohne Kennzeichen', '20.000', 'm', '20.000'),
    N('p010130', 't0101', '01.01.0030', 'Schutzrohr verlegen, gekennzeichnet', '30.000', 'm', '28.500', { kennz: true }),
    Z('z010140', 't0101', '01.01.0040', 'Zuschlag für Erschwernis auf gekennzeichnete Positionen', '10.00', 'kennzeichnung'),
    T('t0102', 't01', '01.02', 'Zuschläge auf davorstehende Positionen'),
    N('p010210', 't0102', '01.02.0010', 'Graben ausheben', '10.000', 'm', '10.000'),
    N('p010220', 't0102', '01.02.0020', 'Graben verfüllen', '20.000', 'm', '20.000'),
    N('p010230', 't0102', '01.02.0030', 'Oberfläche wiederherstellen', '30.000', 'm', '30.000'),
    Z('z010240', 't0102', '01.02.0040', 'Zuschlag Nachtarbeit auf die Positionen davor', '10.00', 'gliederung'),
    Z('z010250', 't0102', '01.02.0050', 'Zuschlag Verkehrssicherung auf dieselbe Basis', '10.00', 'gliederung'),
    N('p010260', 't0102', '01.02.0060', 'Schacht setzen', '10.000', 'm', '10.000'),
    Z('z010270', 't0102', '01.02.0070', 'Zuschlag Nachtarbeit auf die Position seit dem letzten Zuschlag', '10.00', 'gliederung'),
    T('t0103', 't01', '01.03', 'Zuschläge auf genannte Positionen'),
    N('p010310', 't0103', '01.03.0010', 'Kabel einziehen', '10.000', 'm', '10.000'),
    N('p010320', 't0103', '01.03.0020', 'Kabel anschließen', '20.000', 'm', '20.000'),
    Z('z010330', 't0103', '01.03.0030', 'Zuschlag auf Position 01.03.0020', '10.00', ['p010320']),
    Z('z010340', 't0103', '01.03.0040', 'Zuschlag auf Position 02.0010', '10.00', ['p0210']),
    T('t02', null, '02', 'Leitungsbau'),
    N('p0210', 't02', '02.0010', 'Druckleitung herstellen, mit Anteilen', '100.000', 'm', '27.910', {
      epa: { lohn: '2.230', stoffe: '23.120', geraete: '2.560', nachunternehmer: '0.000' },
    }),
  ];
  const idVon = new Map(e.map((x) => [x.k, neueId()]));
  const knoten = e.map((x) => {
    const id = idVon.get(x.k);
    const parentId = x.parent ? idVon.get(x.parent) : lvId;
    if (x.art === 'titel') return { id, parentId, art: 'titel', ordnungszahl: x.oz, kurztext: x.kurztext };
    const langtext = `${x.kurztext}. Erfundener Text für Testzwecke.`;
    if (x.art === 'zuschlag') {
      const bezug = Array.isArray(x.bezug)
        ? { art: 'positionen', positionen: x.bezug.map((b) => ({ positionId: idVon.get(b), teilmenge: null })) }
        : { art: x.bezug };
      return {
        id, parentId, art: 'position', positionsart: 'zuschlag', ordnungszahl: x.oz, kurztext: x.kurztext, langtext,
        menge: null, einheit: null, einheitspreis: null, zuschlag: { prozentsatz: x.satz, bezug },
      };
    }
    const k = {
      id, parentId, art: 'position', positionsart: 'normal', ordnungszahl: x.oz, kurztext: x.kurztext, langtext,
      menge: x.menge, einheit: x.einheit, einheitspreis: x.ep,
    };
    if (x.kennz) k.zuschlagskennzeichen = true;
    if (x.epa) k.epa = { sonstiges: null, frei: null, freiBezeichnung: null, ...x.epa };
    return k;
  });
  const lv = {
    schemaVersion: SCHEMA,
    art: 'leistungsverzeichnis',
    id: lvId,
    name: 'Zuschlag: Bezugsformen und Anteile (erfunden)',
    ozMaske: MASKE_KLEIN,
    mwstSatz: '19.00',
    nachlass: null,
    knoten: dokumentreihenfolge(lvId, knoten),
  };
  lv.sollwerte = berechneZuschlagSollwerte(lv.knoten, lv.nachlass, lv.mwstSatz);
  return lv;
}

// ---------------------------------------------------------------- Ausgabe

/** Liefert Dateiname -> Dateiinhalt. */
export function erzeugeAlle() {
  const typisch = erzeugeTypisch();
  const angebote = erzeugeAngebote(typisch);
  return {
    'winzig.json': alsDatei(erzeugeWinzig()),
    'typisch.json': alsDatei(typisch),
    'typisch-angebote.json': alsDatei(angebote),
    'gross.json': alsDatei(erzeugeGross()),
    'handbeispiele.json': alsDatei(erzeugeHandbeispiele()),
    'zuschlag.json': alsDatei(erzeugeZuschlag()),
    ...erzeugeX84(typisch, angebote),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ziel = dirname(fileURLToPath(import.meta.url));
  for (const [name, inhalt] of Object.entries(erzeugeAlle())) {
    mkdirSync(dirname(join(ziel, name)), { recursive: true });
    writeFileSync(join(ziel, name), inhalt, 'utf8');
    console.log(`${name}: ${Buffer.byteLength(inhalt)} Bytes`);
  }
}
