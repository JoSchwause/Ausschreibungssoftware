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
  const byId = new Map(knoten.map((k) => [k.id, k]));
  const geschwister = new Map();
  for (const k of knoten) {
    if (!geschwister.has(k.parentId)) geschwister.set(k.parentId, []);
    geschwister.get(k.parentId).push(k);
  }
  const eigenerGp = (k) =>
    k.menge == null || k.einheitspreis == null
      ? null
      : gesamtpreis(parse(k.menge, STELLEN.menge), parse(k.einheitspreis, STELLEN.ep));
  const istZuschlag = (k) => k.art === 'position' && k.zuschlag != null;
  const istBasis = (k) => k?.art === 'position' && !istZuschlag(k) && inSumme(k);
  const basisVon = (z) => {
    const bezug = z.zuschlag.bezug;
    let basis = 0n;
    if (bezug.art === 'positionen') {
      for (const b of bezug.positionen) {
        const r = byId.get(b.positionId);
        if (!istBasis(r)) continue;
        const gp = b.teilmenge == null ? eigenerGp(r)
          : r.einheitspreis == null ? null
            : gesamtpreis(parse(b.teilmenge, STELLEN.menge), parse(r.einheitspreis, STELLEN.ep));
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
      const gp = eigenerGp(k);
      if (gp !== null) basis += gp;
    }
    return basis;
  };
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
