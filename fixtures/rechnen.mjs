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
