// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Tethys AVA contributors
//
// Dezimalrechnung der Fixture-Erzeugung: nur BigInt, kein Gleitkomma (N1, N2, N3).
// Ein Wert ist eine ganze Zahl mit festem Massstab ("scaled integer"). Negative Werte sind
// nicht unterstuetzt, solange Ticket 04 die Rundung negativer Betraege nicht entschieden hat.

/** Nachkommastellen (N3, G-21). Nur fuer Fixtures; die massgebliche Tabelle gehoert spaeter in `vertrag`. */
export const STELLEN = Object.freeze({ menge: 3, ep: 3, prozent: 2, betrag: 2 });

const pow10 = (n) => 10n ** BigInt(n);

/** "1.235" -> 1235n (Massstab `stellen`). Weniger Nachkommastellen sind erlaubt, mehr nicht. */
export function parse(text, stellen) {
  const m = typeof text === 'string' ? /^(\d+)(?:\.(\d+))?$/.exec(text) : null;
  if (!m) throw new Error(`Ungueltiger Dezimalwert: ${JSON.stringify(text)}`);
  const nach = m[2] ?? '';
  if (nach.length > stellen) throw new Error(`Zu viele Nachkommastellen (${stellen}): ${text}`);
  return BigInt(m[1] + nach.padEnd(stellen, '0'));
}

/** 1235n -> "1.235"; immer mit allen Nachkommastellen (kanonische Schreibweise, Punkt als Trenner). */
export function format(wert, stellen) {
  if (wert < 0n) throw new Error('Negative Werte sind nicht unterstuetzt');
  if (stellen === 0) return wert.toString();
  const s = wert.toString().padStart(stellen + 1, '0');
  return `${s.slice(0, -stellen)}.${s.slice(-stellen)}`;
}

/** Kaufmaennisch runden (half-up) von Massstab `von` auf Massstab `nach`. */
export function rundeHalfUp(wert, von, nach) {
  if (wert < 0n) throw new Error('Negative Werte sind nicht unterstuetzt');
  if (von <= nach) return wert * pow10(nach - von);
  const d = pow10(von - nach);
  return (wert + d / 2n) / d;
}

/** GP = round_half_up(Menge x EP, 2). Eingaben: Menge (3), EP (3). Ergebnis: Betrag (2). */
export function gesamtpreis(menge, ep) {
  return rundeHalfUp(menge * ep, STELLEN.menge + STELLEN.ep, STELLEN.betrag);
}

/** round_half_up(Betrag x Prozent / 100, 2). Eingaben: Betrag (2), Prozent (2). Ergebnis: Betrag (2). */
export function prozentVon(betrag, prozent) {
  // betrag_int * prozent_int / 10^6 = Wert; Massstab 6 -> 2
  return rundeHalfUp(betrag * prozent, 6, STELLEN.betrag);
}

/** Positionsarten, die in die Summen eingehen (Annahmen A1 bis A4, siehe README). */
export function inSumme(knoten) {
  switch (knoten.positionsart) {
    case 'normal': return true;
    case 'bedarf': return knoten.bedarfMitGesamtbetrag === true;
    case 'wahl': return false;
    case 'zuschlag': return true;
    default: throw new Error(`Unbekannte Positionsart: ${knoten.positionsart}`);
  }
}

/** Netto, Nachlass, Netto nach Nachlass, MwSt, Brutto. Alle Argumente und Ergebnisse als Betrag (2). */
export function summen(netto, nachlass, mwstSatz) {
  let nachlassBetrag = 0n;
  if (nachlass) {
    nachlassBetrag = nachlass.art === 'prozent'
      ? prozentVon(netto, parse(nachlass.wert, STELLEN.prozent))
      : parse(nachlass.wert, STELLEN.betrag);
    if (nachlassBetrag > netto) throw new Error('Nachlass groesser als Netto');
  }
  const nettoNach = netto - nachlassBetrag;
  const mwst = prozentVon(nettoNach, parse(mwstSatz, STELLEN.prozent));
  return {
    netto: format(netto, 2),
    nachlass: format(nachlassBetrag, 2),
    nettoNachNachlass: format(nettoNach, 2),
    mwst: format(mwst, 2),
    brutto: format(nettoNach + mwst, 2),
  };
}

/**
 * Sollwerte zu einer Menge von Positionen. `preisVon(knoten)` liefert den EP (Massstab 3) oder null
 * (nicht angeboten). Titelsummen enthalten alle darunterliegenden Positionen, die in die Summe eingehen.
 * `gpMap` (optional) wird mit id -> GP (BigInt) gefuellt.
 */
export function berechneSollwerte(knoten, preisVon, nachlass, mwstSatz, gpMap = new Map()) {
  const eltern = new Map(knoten.map((k) => [k.id, k.parentId]));
  const titelSumme = new Map(knoten.filter((k) => k.art === 'titel').map((k) => [k.id, 0n]));
  const positionen = {};
  const nichtAngeboten = [];
  let netto = 0n;
  for (const k of knoten) {
    if (k.art !== 'position') continue;
    const ep = preisVon(k);
    if (ep === null) {
      positionen[k.id] = { gp: null, inSumme: false };
      nichtAngeboten.push(k.id);
      continue;
    }
    const gp = gesamtpreis(parse(k.menge, STELLEN.menge), ep);
    gpMap.set(k.id, gp);
    const zaehlt = inSumme(k);
    positionen[k.id] = { gp: format(gp, 2), inSumme: zaehlt };
    if (!zaehlt) continue;
    netto += gp;
    for (let t = eltern.get(k.id); titelSumme.has(t); t = eltern.get(t)) {
      titelSumme.set(t, titelSumme.get(t) + gp);
    }
  }
  const titel = {};
  for (const [id, s] of titelSumme) titel[id] = { summe: format(s, 2) };
  return { positionen, titel, summen: summen(netto, nachlass, mwstSatz), nichtAngeboten };
}

/**
 * Annahme A7 (README): Ausreisser, wenn |GP - Mittel| / Mittel > schwelle Prozent. Mittel = arithmetisches
 * Mittel der GP aller Angebote, die die Position angeboten haben (mindestens 3 Werte, Mittel > 0).
 * Exakter Vergleich ohne Division: |n*GP - S| * 100 > schwelle * S.
 */
export function ausreisser(gpJeAngebot, schwelleProzent) {
  const schwelle = BigInt(schwelleProzent);
  const ergebnis = gpJeAngebot.map(() => []);
  const alleIds = new Set(gpJeAngebot.flatMap((m) => [...m.keys()]));
  for (const id of alleIds) {
    const werte = gpJeAngebot.map((m) => m.get(id) ?? null);
    const vorhanden = werte.filter((w) => w !== null);
    const n = BigInt(vorhanden.length);
    const s = vorhanden.reduce((a, b) => a + b, 0n);
    if (n < 3n || s === 0n) continue;
    werte.forEach((w, i) => {
      if (w === null) return;
      const abw = n * w > s ? n * w - s : s - n * w;
      if (abw * 100n > schwelle * s) ergebnis[i].push(id);
    });
  }
  return ergebnis;
}

/**
 * Ziel eines Betrags (Ticket 37, Teil 1; D-37.1): Wahlposition -> Wahlsumme, sonst Bedarf ohne Gesamtbetrag ->
 * Bedarfssumme, sonst Netto. Das Fixture-Format kennt keine Variante; eine Wahlposition ist immer Wahl (Variante
 * `null`). `netto` heisst dasselbe wie `inSumme` (Annahmen A1 bis A3).
 */
export function betragsziel(knoten) {
  if (knoten.positionsart === 'wahl') return 'wahl';
  if (knoten.positionsart === 'bedarf' && knoten.bedarfMitGesamtbetrag !== true) return 'bedarf';
  return 'netto';
}

const istZuschlag = (k) => k?.art === 'position' && k.zuschlag != null;

/**
 * Basis einer Zuschlagsposition in GAEB-Form (Ticket 37, R2 bis R5; D-03, D-37.2). `gpVon(k)` liefert den GP einer
 * Position (Betrag, Massstab 2) oder null, `epVon(k)` ihren EP (Massstab 3) oder null (nur fuer Teilmengen).
 * R2: nur Bezugspositionen, die selbst einen GP haben, ins Netto gehen und keine Zuschlagsposition sind.
 * R3 `gliederung`: rueckwaerts ab der Zuschlagsposition erst unmittelbar davorstehende Zuschlagspositionen (und
 * Hinweise, Untergliederungen) ueberspringen, dann Positionen sammeln bis zur naechsten Zuschlagsposition oder zum
 * Anfang des Elternknotens. R4 `kennzeichnung`: davon nur `zuschlagskennzeichen`. R5 `positionen`: die genannten
 * Positionen, wo immer sie stehen (Teilmenge x EP, falls gesetzt).
 */
function zuschlagsbasis(z, { byId, geschwister, gpVon, epVon }) {
  const bezug = z.zuschlag.bezug;
  const istBasis = (k) => k?.art === 'position' && !istZuschlag(k) && betragsziel(k) === 'netto';
  let basis = 0n;
  if (bezug.art === 'positionen') {
    for (const b of bezug.positionen) {
      const r = byId.get(b.positionId);
      if (!istBasis(r)) continue;
      let gp;
      if (b.teilmenge == null) gp = gpVon(r);
      else {
        const ep = epVon(r);
        gp = ep === null ? null : gesamtpreis(parse(b.teilmenge, STELLEN.menge), ep);
      }
      if (gp !== null) basis += gp;
    }
    return basis;
  }
  const g = geschwister.get(z.parentId);
  let i = g.indexOf(z) - 1;
  while (i >= 0 && (g[i].art !== 'position' || istZuschlag(g[i]))) i--;
  for (; i >= 0; i--) {
    const k = g[i];
    if (k.art !== 'position') continue;
    if (istZuschlag(k)) break;
    if (!istBasis(k) || (bezug.art === 'kennzeichnung' && k.zuschlagskennzeichen !== true)) continue;
    const gp = gpVon(k);
    if (gp !== null) basis += gp;
  }
  return basis;
}

function geschwisterVon(knoten) {
  const geschwister = new Map();
  for (const k of knoten) {
    if (!geschwister.has(k.parentId)) geschwister.set(k.parentId, []);
    geschwister.get(k.parentId).push(k);
  }
  return geschwister;
}

/** Preise eines LV: EP der Position, Satz der Zuschlagsposition (beide null, wenn nicht gesetzt). */
export const preiseDesLv = (k) => ({
  ep: k.einheitspreis == null ? null : parse(k.einheitspreis, STELLEN.ep),
  satz: k.zuschlag?.prozentsatz == null ? null : parse(k.zuschlag.prozentsatz, STELLEN.prozent),
});

/**
 * Sollwerte eines LV oder Angebots mit Zuschlagspositionen in GAEB-Form (Ticket 51: `typisch`, `typisch-angebote`,
 * `gross`). Unabhaengig vom Kern geschrieben, nur BigInt. `preisVon(knoten)` liefert `null` (nicht angeboten) oder
 * `{ ep, satz }`: EP (Massstab 3) einer Position, Satz (Massstab 2) einer Zuschlagsposition, je null, wenn nicht
 * gesetzt. Regeln: GP = round_half_up(Menge x EP, 2); Betrag einer Zuschlagsposition (R1) = round_half_up(Basis x
 * Satz / 100, 2), ohne Satz kein Betrag; Basis nach `zuschlagsbasis` (R2 bis R5) aus den GP derselben Preisquelle
 * (R7: ein Angebot rechnet mit den EP und Saetzen des Bieters). Jeder Betrag geht nach `betragsziel` ins Netto (und
 * in die Titelsummen), in die Bedarfs- oder in die Wahlsumme (R6, F4); Bedarfs- und Wahlsumme je Titel und fuer das
 * LV unter `ausweise`. `gpMap` (optional) wird mit id -> Betrag (BigInt) gefuellt.
 */
export function berechneSollwerteGaeb(knoten, preisVon, nachlass, mwstSatz, gpMap = new Map()) {
  const byId = new Map(knoten.map((k) => [k.id, k]));
  const geschwister = geschwisterVon(knoten);
  const preise = new Map();
  for (const k of knoten) if (k.art === 'position') preise.set(k.id, preisVon(k));
  const gpEigen = new Map();
  for (const [id, p] of preise) {
    const k = byId.get(id);
    if (p === null || istZuschlag(k) || p.ep === null || k.menge == null) continue;
    gpEigen.set(id, gesamtpreis(parse(k.menge, STELLEN.menge), p.ep));
  }
  const kontext = {
    byId, geschwister, gpVon: (k) => gpEigen.get(k.id) ?? null, epVon: (k) => preise.get(k.id)?.ep ?? null,
  };
  const eltern = new Map(knoten.map((k) => [k.id, k.parentId]));
  const titelIds = knoten.filter((k) => k.art === 'titel').map((k) => k.id);
  const titelSumme = new Map(titelIds.map((id) => [id, 0n]));
  const titelAusweis = new Map(titelIds.map((id) => [id, { bedarf: 0n, wahl: 0n }]));
  const gesamtAusweis = { bedarf: 0n, wahl: 0n };
  const positionen = {};
  const zuschlaege = {};
  const nichtAngeboten = [];
  let netto = 0n;
  for (const k of knoten) {
    if (k.art !== 'position') continue;
    const p = preise.get(k.id);
    if (p === null) {
      positionen[k.id] = { gp: null, inSumme: false };
      nichtAngeboten.push(k.id);
      continue;
    }
    let gp = gpEigen.get(k.id) ?? null;
    if (istZuschlag(k)) {
      const basis = zuschlagsbasis(k, kontext);
      gp = p.satz === null ? null : prozentVon(basis, p.satz);
      zuschlaege[k.id] = { basis: format(basis, 2), betrag: gp === null ? null : format(gp, 2) };
    }
    const ziel = betragsziel(k);
    positionen[k.id] = { gp: gp === null ? null : format(gp, 2), inSumme: gp !== null && ziel === 'netto' };
    if (gp === null) continue;
    gpMap.set(k.id, gp);
    if (ziel === 'netto') netto += gp;
    else gesamtAusweis[ziel] += gp;
    for (let t = eltern.get(k.id); titelSumme.has(t); t = eltern.get(t)) {
      if (ziel === 'netto') titelSumme.set(t, titelSumme.get(t) + gp);
      else titelAusweis.get(t)[ziel] += gp;
    }
  }
  const ausweis = (a) => ({ summeBedarfOhneGesamtbetrag: format(a.bedarf, 2), summeWahl: format(a.wahl, 2) });
  return {
    positionen,
    titel: Object.fromEntries(titelIds.map((id) => [id, { summe: format(titelSumme.get(id), 2) }])),
    summen: summen(netto, nachlass, mwstSatz),
    nichtAngeboten,
    zuschlaege,
    ausweise: {
      gesamt: ausweis(gesamtAusweis),
      titel: Object.fromEntries(titelIds.map((id) => [id, ausweis(titelAusweis.get(id))])),
    },
  };
}

/**
 * Sollwerte eines LV mit Zuschlagspositionen in GAEB-Form (Ticket 37, `zuschlag.json`). Unabhaengig vom Kern
 * geschrieben, nur BigInt. Regeln (amtliche Pruefdateien, D-03): Betrag = round_half_up(Basis x Satz / 100, 2);
 * Basis = Summe der GP der Bezugspositionen, die selbst in die Summe eingehen und keine Zuschlagsposition sind.
 * `gliederung`: rueckwaerts ab der Zuschlagsposition erst unmittelbar davorstehende Zuschlagspositionen (und
 * Hinweise) ueberspringen, dann Positionen sammeln bis zur naechsten Zuschlagsposition oder zum Anfang des
 * Elternknotens; `kennzeichnung`: davon nur `zuschlagskennzeichen`; `positionen`: die genannten Positionen (Teilmenge
 * x EP, falls gesetzt). Der Betrag geht wie ein GP in Titelsummen und Netto.
 * Dazu je Titel und fuer das LV die Summen der Einheitspreisanteile: Summe von round_half_up(Menge x Anteil, 2).
 */
export function berechneZuschlagSollwerte(knoten, nachlass, mwstSatz) {
  const eigenerGp = (k) =>
    k.menge == null || k.einheitspreis == null
      ? null
      : gesamtpreis(parse(k.menge, STELLEN.menge), parse(k.einheitspreis, STELLEN.ep));
  const kontext = {
    byId: new Map(knoten.map((k) => [k.id, k])),
    geschwister: geschwisterVon(knoten),
    gpVon: eigenerGp,
    epVon: (k) => (k.einheitspreis == null ? null : parse(k.einheitspreis, STELLEN.ep)),
  };
  const basisVon = (z) => zuschlagsbasis(z, kontext);
  const eltern = new Map(knoten.map((k) => [k.id, k.parentId]));
  const titelSumme = new Map(knoten.filter((k) => k.art === 'titel').map((k) => [k.id, 0n]));
  const ANTEILE = ['lohn', 'stoffe', 'geraete', 'nachunternehmer', 'sonstiges', 'frei'];
  const leer = () => Object.fromEntries(ANTEILE.map((a) => [a, 0n]));
  const epaTitel = new Map(knoten.filter((k) => k.art === 'titel').map((k) => [k.id, leer()]));
  const epaGesamt = leer();
  const positionen = {};
  const zuschlaege = {};
  let netto = 0n;
  for (const k of knoten) {
    if (k.art !== 'position') continue;
    let gp;
    if (istZuschlag(k) && k.zuschlag.prozentsatz != null) {
      const basis = basisVon(k);
      gp = prozentVon(basis, parse(k.zuschlag.prozentsatz, STELLEN.prozent));
      zuschlaege[k.id] = { basis: format(basis, 2), betrag: format(gp, 2) };
    } else gp = eigenerGp(k);
    const zaehlt = gp !== null && inSumme(k);
    positionen[k.id] = { gp: gp === null ? null : format(gp, 2), inSumme: zaehlt };
    if (!zaehlt) continue;
    netto += gp;
    const anteile = k.epa
      ? ANTEILE.map((a) => [a, k.epa[a] == null ? 0n
        : gesamtpreis(parse(k.menge, STELLEN.menge), parse(k.epa[a], STELLEN.ep))])
      : [];
    for (const [a, w] of anteile) epaGesamt[a] += w;
    for (let t = eltern.get(k.id); titelSumme.has(t); t = eltern.get(t)) {
      titelSumme.set(t, titelSumme.get(t) + gp);
      for (const [a, w] of anteile) epaTitel.get(t)[a] += w;
    }
  }
  const alsText = (o) => Object.fromEntries(Object.entries(o).map(([a, w]) => [a, format(w, 2)]));
  const titel = {};
  for (const [id, s] of titelSumme) titel[id] = { summe: format(s, 2) };
  return {
    positionen,
    zuschlaege,
    titel,
    summen: summen(netto, nachlass, mwstSatz),
    epa: {
      gesamt: alsText(epaGesamt),
      titel: Object.fromEntries([...epaTitel].map(([id, o]) => [id, alsText(o)])),
    },
  };
}

/** round_half_up(summe / n) fuer summe >= 0, n > 0 (BigInt, gleicher Massstab): floor((2 x summe + n) / (2 x n)). */
function teileHalfUp(summe, n) {
  if (summe < 0n || n <= 0n) throw new Error('Nur nicht negative Summe und positive Anzahl');
  return (2n * summe + n) / (2n * n);
}

/**
 * Preisspiegel-Sollwerte einer Auswahl von Angeboten (Ticket 69; Regeln D-05, D-36.1, D-44.1, Annahmen fuer die Demo).
 * Unabhaengig von `vergabe` geschrieben, nur BigInt. `angebote`: `[{ id, positionen, sollwerte }]` wie in
 * `typisch-angebote.json` (Sollwerte aus `berechneSollwerteGaeb`); `lvSollwerte`: Sollwerte des LV.
 * - Rang: 1 + Anzahl der Angebote mit kleinerem Netto nach Nachlass (Gleichstand gleicher Rang: 1, 1, 3).
 * - Virtuelle Bieter (Min, Mittel, Max) je Position, die laut LV ins Netto geht (`betragsziel` = netto): verglichen
 *   werden nur Werte > 0 (0,000 und „nicht angeboten“ zaehlen nicht); an einer Normalposition der EP, an einer
 *   Zuschlagsposition der Betrag des Bieters. Mittel = round_half_up(Summe / Anzahl) auf die Stellen des Werts (EP 3,
 *   Betrag 2). GP des virtuellen Bieters = round_half_up(Menge x EP, 2) bzw. der Betrag. Ohne Wert > 0 traegt die
 *   Position nichts bei. Netto = Summe dieser GP, ohne Nachlass. Schaetzpreis = Netto des LV.
 */
export function preisspiegelSollwerte(knoten, angebote, lvSollwerte) {
  const nettoNach = angebote.map((a) => parse(a.sollwerte.summen.nettoNachNachlass, STELLEN.betrag));
  const rang = Object.fromEntries(angebote.map((a, i) => [
    a.id, String(1 + nettoNach.filter((x) => x < nettoNach[i]).length),
  ]));
  const zeilen = angebote.map((a) => new Map(a.positionen.map((z) => [z.positionId, z])));
  const summe = { min: 0n, mittel: 0n, max: 0n };
  for (const k of knoten) {
    if (k.art !== 'position' || betragsziel(k) !== 'netto') continue;
    const werte = [];
    angebote.forEach((a, i) => {
      let w = null;
      if (istZuschlag(k)) {
        const betrag = a.sollwerte.zuschlaege[k.id]?.betrag;
        if (betrag != null) w = parse(betrag, STELLEN.betrag);
      } else {
        const z = zeilen[i].get(k.id);
        if (z?.status === 'angeboten' && z.einheitspreis !== undefined) w = parse(z.einheitspreis, STELLEN.ep);
      }
      if (w !== null && w > 0n) werte.push(w);
    });
    if (werte.length === 0) continue;
    const gp = istZuschlag(k) ? (w) => w : (w) => gesamtpreis(parse(k.menge, STELLEN.menge), w);
    summe.min += gp(werte.reduce((x, y) => (y < x ? y : x)));
    summe.mittel += gp(teileHalfUp(werte.reduce((x, y) => x + y, 0n), BigInt(werte.length)));
    summe.max += gp(werte.reduce((x, y) => (y > x ? y : x)));
  }
  return {
    angebotIds: angebote.map((a) => a.id),
    rang,
    virtuelleSummen: {
      min: format(summe.min, STELLEN.betrag),
      mittel: format(summe.mittel, STELLEN.betrag),
      max: format(summe.max, STELLEN.betrag),
      schaetzpreis: lvSollwerte.summen.netto,
    },
  };
}
