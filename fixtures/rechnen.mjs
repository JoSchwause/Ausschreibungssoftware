// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Tethys AVA contributors
//
// Dezimalrechnung der Fixture-Erzeugung: nur BigInt, kein Gleitkomma (N1, N2, N3).
// Ein Wert ist eine ganze Zahl mit festem Massstab ("scaled integer"). Negative Werte sind
// nicht unterstuetzt, solange Ticket 04 die Rundung negativer Betraege nicht entschieden hat. Ausnahme seit Ticket 85:
// `formatMitVorzeichen` schreibt Differenzen (Kostenkontrolle, Nachlasszeile); gerundet wird nie ein negativer Wert.

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
 * Ausreisser (README A7, Ticket 75; Regeln D-05, D-36.1, D-44.1, Annahmen fuer die Demo). `angebote` wie in
 * `typisch-angebote.json` (Zeilen und Sollwerte aus `berechneSollwerteGaeb`). Je Position (Dokumentreihenfolge) ist der
 * verglichene Wert eines Angebots sein EP, an einer Zuschlagsposition sein Betrag. Gezaehlt werden nur Werte > 0: ein
 * Nullpreis (0,000) und „nicht angeboten“ (auch ein Zuschlag ohne Betrag) sind nie Ausreisser. Ab n >= 2 solchen
 * Werten mit Summe S > 0 ist ein Wert w Ausreisser, wenn |w - S/n| / (S/n) > Schwelle, exakt ohne Division:
 * |n x w - S| x 100 > Schwelle x S. Liefert je Angebot die Positions-IDs.
 */
export function ausreisserSollwerte(knoten, angebote, schwelleProzent) {
  const schwelle = BigInt(schwelleProzent);
  const zeilen = angebote.map((a) => new Map(a.positionen.map((z) => [z.positionId, z])));
  const ergebnis = angebote.map(() => []);
  for (const k of knoten) {
    if (k.art !== 'position') continue;
    const werte = angebote.map((a, i) => {
      if (istZuschlag(k)) {
        const betrag = a.sollwerte.zuschlaege[k.id]?.betrag;
        return betrag == null ? null : parse(betrag, STELLEN.betrag);
      }
      const z = zeilen[i].get(k.id);
      return z?.status === 'angeboten' && z.einheitspreis !== undefined ? parse(z.einheitspreis, STELLEN.ep) : null;
    });
    const positiv = werte.map((w) => w !== null && w > 0n);
    const n = BigInt(positiv.filter(Boolean).length);
    const s = werte.reduce((a, w, i) => (positiv[i] ? a + w : a), 0n);
    if (n < 2n || s === 0n) continue;
    werte.forEach((w, i) => {
      if (!positiv[i]) return;
      const abw = n * w > s ? n * w - s : s - n * w;
      if (abw * 100n > schwelle * s) ergebnis[i].push(k.id);
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

// ---------------------------------------------------------------- M4: Abrechnung (Ticket 85)
//
// Sollwerte des Tors M4 (D-38), unabhaengig von `abrechnung` und `kosten` geschrieben, nur BigInt. Regeln: D-34
// (Abzugskette), D-35 (Soll/Ist, VOB/B § 2 Abs. 3), D-37 (Kostenkontrolle), N2, N5, E-07. Die Lesarten, die diese Regeln
// offen lassen, stehen in der README („M4-Abrechnung“) und im Ticket 85 (D-85.x).

/** Betrag mit Vorzeichen (E-07: Vorzeichen vor den Betrag): -179411n -> "-1794.11". Rundet nicht. */
export function formatMitVorzeichen(wert, stellen) {
  return wert < 0n ? `-${format(-wert, stellen)}` : format(wert, stellen);
}

/** Kumulierte Aufmassmenge je Position (D-34 (1)): Summe der Blattmengen (3 Stellen); Zeilen ohne Menge zaehlen nicht. */
export function kumulierteMengen(aufmasse) {
  const mengen = new Map();
  for (const a of aufmasse) {
    for (const z of a.positionen) {
      if (z.menge === null) continue;
      mengen.set(z.positionId, (mengen.get(z.positionId) ?? 0n) + parse(z.menge, STELLEN.menge));
    }
  }
  return mengen;
}

/**
 * Leistungsstand einer Rechnung (D-34 (1)-(3); Vertragstyp `Leistungsstand`, Lesart D-70.7). `positionen`: die Positionen
 * des Auftrags-LV in Dokumentreihenfolge als `{ id, ep, zuschlag }` (EP Massstab 3 oder null; `zuschlag` = `{ satz,
 * bezug: [positionId] }` oder null). Je Position eine Zeile: GP = round(kumulierte Menge x EP, 2), ohne Menge oder EP 0,00;
 * Bedarf zaehlt, sobald aufgemessen (die Funktion kennt keine Merkmale). Zuschlagsposition: Menge null, GP =
 * round(Summe GP der Bezugspositionen x Satz / 100, 2). Nachlass `prozent`: round(Leistung x Satz / 100, 2) ueber alle
 * Positionen samt Nachtrag (D-34 (2), N5); der absolute Nachlass kommt in M4 nicht vor (D-38).
 */
export function leistungsstandBerechnen(positionen, mengen, nachlass) {
  if (nachlass?.art !== 'prozent') throw new Error('M4 rechnet nur mit Prozent-Nachlass (D-38)');
  const gp = new Map();
  for (const p of positionen) {
    if (p.zuschlag) continue;
    const m = mengen.get(p.id) ?? null;
    gp.set(p.id, m === null || p.ep === null ? 0n : gesamtpreis(m, p.ep));
  }
  for (const p of positionen) {
    if (!p.zuschlag) continue;
    gp.set(p.id, prozentVon(p.zuschlag.bezug.reduce((s, id) => s + gp.get(id), 0n), p.zuschlag.satz));
  }
  const leistung = [...gp.values()].reduce((a, b) => a + b, 0n);
  const nachlassBetrag = prozentVon(leistung, parse(nachlass.wert, STELLEN.prozent));
  return {
    positionen: positionen.map((p) => ({
      positionId: p.id,
      menge: !p.zuschlag && mengen.has(p.id) ? format(mengen.get(p.id), STELLEN.menge) : null,
      gp: format(gp.get(p.id), STELLEN.betrag),
    })),
    leistung: format(leistung, STELLEN.betrag),
    nachlass: format(nachlassBetrag, STELLEN.betrag),
    nettoNachNachlass: format(leistung - nachlassBetrag, STELLEN.betrag),
  };
}

/**
 * Pruefkette einer Abschlagsrechnung (D-34 (4)-(7)): MwSt = round(Netto n. N. x Satz, 2); Brutto kumuliert = Netto n. N.
 * + MwSt; je Umlage round(Brutto kumuliert x Satz, 2), alle auf derselben Basis; Sicherheitseinbehalt round(Brutto
 * kumuliert x Satz, 2); Zahlbetrag = Brutto kumuliert - Umlagen - Einbehalt - Summe der frueheren, eingefrorenen
 * Zahlbetraege (Massstab 2). Jeder Schritt auf 2 Stellen gerundet, dann verrechnet (N2).
 */
export function abschlagsketteBerechnen(leistungsstand, { mwstSatz, umlagen, sicherheitSatz, fruehereZahlbetraege }) {
  const nnn = parse(leistungsstand.nettoNachNachlass, STELLEN.betrag);
  const mwst = prozentVon(nnn, parse(mwstSatz, STELLEN.prozent));
  const brutto = nnn + mwst;
  const umlagebetraege = umlagen.map((u) => prozentVon(brutto, parse(u.satz, STELLEN.prozent)));
  const einbehalt = sicherheitSatz === null ? 0n : prozentVon(brutto, parse(sicherheitSatz, STELLEN.prozent));
  const zahlbetrag = brutto - umlagebetraege.reduce((a, b) => a + b, 0n) - einbehalt - fruehereZahlbetraege;
  return {
    leistung: leistungsstand.leistung,
    nachlass: leistungsstand.nachlass,
    nettoNachNachlass: leistungsstand.nettoNachNachlass,
    mwst: format(mwst, STELLEN.betrag),
    bruttoKumuliert: format(brutto, STELLEN.betrag),
    umlagen: umlagen.map((u, i) => ({ bezeichnung: u.bezeichnung, satz: u.satz, betrag: format(umlagebetraege[i], 2) })),
    einbehalt: format(einbehalt, STELLEN.betrag),
    fruehereZahlbetraege: format(fruehereZahlbetraege, STELLEN.betrag),
    zahlbetrag: formatMitVorzeichen(zahlbetrag, STELLEN.betrag),
  };
}

/**
 * Soll/Ist (D-35, VOB/B § 2 Abs. 3). `positionen`: `{ id, soll }` in Dokumentreihenfolge (Soll Massstab 3 oder null).
 * Zeilen nur fuer Positionen mit Aufmass: Soll, Ist (Summe der Blaetter), Anteil = round_half_up(Ist / Soll x 100, 2).
 * Befund `ueber-schwelle` bei Ist > 110 % von Soll, streng und exakt (Ist x 100 > Soll x 110); `unter-schwelle` bei
 * Ist < 90 % nur mit `abgeschlossen` (M4 hat keine Schlussrechnung). Kein Befund bei Soll 0 oder null.
 */
export function sollIstBerechnen(positionen, mengen, { abgeschlossen = false } = {}) {
  const zeilen = [];
  const befunde = [];
  for (const p of positionen) {
    if (!mengen.has(p.id) || p.soll === null || p.soll === 0n) continue;
    const ist = mengen.get(p.id);
    const anteil = format(teileHalfUp(ist * 10000n, p.soll), STELLEN.prozent);
    zeilen.push({ positionId: p.id, soll: format(p.soll, 3), ist: format(ist, 3), anteil });
    if (ist * 100n > p.soll * 110n) befunde.push({ positionId: p.id, art: 'ueber-schwelle', anteil });
    else if (abgeschlossen && ist * 100n < p.soll * 90n) befunde.push({ positionId: p.id, art: 'unter-schwelle', anteil });
  }
  return { zeilen, befunde };
}

/** Kostengruppe und ihre Vorfahren aus den Ziffern (D-24): XYZ -> XY0 -> X00, ohne Doppel. */
function kgMitVorfahren(nummer) {
  return [...new Set([nummer, `${nummer.slice(0, 2)}0`, `${nummer[0]}00`])];
}

/**
 * Kostenkontrolle (D-37). `budget`: Eintraege `{ nummer, betrag }` der Kostenermittlung; `positionen`: `{ kostengruppe |
 * null, vergabe, abrechnung }` (Massstab 2; Vergabe = GP nur zaehlender Positionen nach F4, sonst 0; Abrechnung =
 * `Leistungsstand.gp`); `nachlass`: `{ vergabe, abrechnung }` (Nachlass des Auftrags-LV und des Leistungsstands, >= 0).
 * Zeilen: jede Kostengruppe aus Budget und Positionen samt Vorfahren, nach Nummer; Baumsumme = eigener Wert + Kinder
 * (D-24). Dazu „ohne Kostengruppe“, „Nachlass“ (negativ) und Gesamt. Budget ohne Eintrag 0,00; Abweichung = Vergabe -
 * Budget in jeder Zeile (D-85.3). Gesamt = Summe der Ebene 1 + ohne KG + Nachlass (geht auf den Cent auf).
 */
export function kostenkontrolleBerechnen({ budget, positionen, nachlass }) {
  const leer = () => ({ budget: 0n, vergabe: 0n, abrechnung: 0n });
  const zeilen = new Map();
  const buche = (nummer, feld, wert) => {
    for (const n of kgMitVorfahren(nummer)) {
      if (!zeilen.has(n)) zeilen.set(n, leer());
      zeilen.get(n)[feld] += wert;
    }
  };
  for (const e of budget) buche(e.nummer, 'budget', parse(e.betrag, STELLEN.betrag));
  const ohne = leer();
  for (const p of positionen) {
    if (p.kostengruppe === null) {
      ohne.vergabe += p.vergabe;
      ohne.abrechnung += p.abrechnung;
    } else {
      buche(p.kostengruppe, 'vergabe', p.vergabe);
      buche(p.kostengruppe, 'abrechnung', p.abrechnung);
    }
  }
  const nachlassZeile = { budget: 0n, vergabe: -nachlass.vergabe, abrechnung: -nachlass.abrechnung };
  const gesamt = leer();
  const ebene1 = [...zeilen].filter(([n]) => n.endsWith('00')).map(([, z]) => z);
  for (const z of [...ebene1, ohne, nachlassZeile]) {
    for (const f of ['budget', 'vergabe', 'abrechnung']) gesamt[f] += z[f];
  }
  const text = (z) => ({
    budget: formatMitVorzeichen(z.budget, STELLEN.betrag),
    vergabe: formatMitVorzeichen(z.vergabe, STELLEN.betrag),
    abrechnung: formatMitVorzeichen(z.abrechnung, STELLEN.betrag),
    abweichung: formatMitVorzeichen(z.vergabe - z.budget, STELLEN.betrag),
  });
  return {
    zeilen: [...zeilen.keys()].sort().map((n) => ({ kostengruppe: n, ...text(zeilen.get(n)) })),
    ohneKostengruppe: text(ohne),
    nachlass: text(nachlassZeile),
    gesamt: text(gesamt),
  };
}
