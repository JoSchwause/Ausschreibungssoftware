// SPDX-License-Identifier: AGPL-3.0-or-later
// Ausdruckssprache des freien Rechenansatzes (Ticket 35, Annahmen in `MENGEN_ANNAHMEN`): Text → Syntaxbaum und
// Syntaxbaum → kanonischer Text. Eigene Grammatik:
//
//   ausdruck = summand { ("+"|"-") summand }
//   summand  = faktor { ("*"|"/") faktor }
//   faktor   = [ "+" | "-" ] faktor | primaer
//   primaer  = zahl | bezug | name | "(" ausdruck ")"
//
// Rein (A2). Fehler sind Werte; intern bricht eine private Ausnahme den Abstieg ab und wird nur hier gefangen.

import { alsDezimal } from '@tethys/dezimal';
import type { Dezimal, Ergebnis } from '@tethys/vertrag';
import { MAX_AUSDRUCK_ZEICHEN, MAX_KLAMMERTIEFE } from './annahmen';
import { formelfehler } from './fehler';
import type { Formelfehler, Formelfehlercode } from './fehler';

// --- Syntaxbaum ------------------------------------------------------------------------------------------------

export type Strichoperator = '+' | '-';
export type Punktoperator = '*' | '/';
export type Operator = Strichoperator | Punktoperator;

/** Knoten des Syntaxbaums. `spalte` ist die Stelle im gelesenen Text (bei Rechnungen die des Operators). */
export type Ausdruck =
  | { readonly art: 'zahl'; readonly wert: Dezimal; readonly spalte: number }
  | { readonly art: 'bezug'; readonly zeile: number; readonly spalte: number }
  | { readonly art: 'name'; readonly name: string; readonly spalte: number }
  | {
      readonly art: 'vorzeichen';
      readonly zeichen: Strichoperator;
      readonly operand: Ausdruck;
      readonly spalte: number;
    }
  | {
      readonly art: 'rechnung';
      readonly operator: Operator;
      readonly links: Ausdruck;
      readonly rechts: Ausdruck;
      readonly spalte: number;
    };

// --- Zerlegen in Zeichen ---------------------------------------------------------------------------------------

type Token =
  | { readonly art: 'zahl'; readonly wert: Dezimal; readonly spalte: number }
  | { readonly art: 'bezug'; readonly zeile: number; readonly spalte: number }
  | { readonly art: 'name'; readonly name: string; readonly spalte: number }
  | { readonly art: 'operator'; readonly operator: Operator; readonly spalte: number }
  | { readonly art: 'auf'; readonly spalte: number }
  | { readonly art: 'zu'; readonly spalte: number };

class Abbruch extends Error {
  constructor(readonly fehler: Formelfehler) {
    super(fehler.meldung);
  }
}

function abbrechen(code: Formelfehlercode, meldung: string, spalte: number | null): never {
  throw new Abbruch(formelfehler(code, meldung, spalte));
}

const OPERATOREN: Readonly<Record<string, Operator>> = {
  '+': '+',
  '-': '-',
  '−': '-',
  '*': '*',
  '×': '*',
  '/': '/',
  '÷': '/',
  ':': '/',
};

const ZIFFER = /[0-9]/;
const LEERRAUM = /\s/u;
const BUCHSTABE = /\p{L}/u;
const NAMENSZEICHEN = /[\p{L}0-9_]/u;
const BEZUG = /^Z([0-9]+)$/;
/** Längste Zeilennummer in einem Bezug; mehr Ziffern wären keine sichere ganze Zahl mehr. */
const MAX_ZEILENZIFFERN = 15;

const istZiffer = (z: string | undefined): boolean => z !== undefined && ZIFFER.test(z);

/** Normalisierte Dezimalzahl aus Vor- und Nachkommaziffern: keine führenden Nullen, keine Nullen am Ende. */
function zahlwert(vor: string, nach: string, spalte: number): Dezimal {
  const kopf = vor.replace(/^0+(?=.)/, '');
  const rest = nach.replace(/0+$/, '') || '0';
  const e = alsDezimal(`${kopf}.${rest}`);
  if (!e.ok) abbrechen('zahl-ungueltig', `Zahl mit zu vielen Stellen: ${e.fehler.meldung}`, spalte);
  return e.wert;
}

function zerlegen(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const z = text[i] ?? '';
    if (LEERRAUM.test(z)) {
      i += 1;
      continue;
    }
    const op = OPERATOREN[z];
    if (op !== undefined) {
      tokens.push({ art: 'operator', operator: op, spalte: i });
      i += 1;
    } else if (z === '(') {
      tokens.push({ art: 'auf', spalte: i });
      i += 1;
    } else if (z === ')') {
      tokens.push({ art: 'zu', spalte: i });
      i += 1;
    } else if (z === '.') {
      abbrechen('punkt-statt-komma', 'Punkt statt Dezimalkomma', i);
    } else if (z === ',') {
      abbrechen('zahl-ungueltig', 'Komma ohne Ziffer davor', i);
    } else if (istZiffer(z)) {
      const start = i;
      while (istZiffer(text[i])) i += 1;
      const vor = text.slice(start, i);
      let nach = '';
      if (text[i] === ',') {
        if (!istZiffer(text[i + 1])) abbrechen('zahl-ungueltig', 'Komma ohne Ziffer danach', i);
        const komma = i + 1;
        i = komma;
        while (istZiffer(text[i])) i += 1;
        nach = text.slice(komma, i);
        if (text[i] === ',') abbrechen('zahl-ungueltig', 'Zweites Komma in einer Zahl', i);
      }
      if (text[i] === '.') abbrechen('punkt-statt-komma', 'Punkt in einer Zahl', i);
      tokens.push({ art: 'zahl', wert: zahlwert(vor, nach, start), spalte: start });
    } else if (BUCHSTABE.test(z)) {
      const start = i;
      i += 1;
      while (i < text.length && NAMENSZEICHEN.test(text[i] ?? '')) i += 1;
      const wort = text.slice(start, i);
      const bezug = BEZUG.exec(wort);
      if (bezug) {
        const ziffern = (bezug[1] ?? '').replace(/^0+(?=.)/, '');
        if (ziffern.length > MAX_ZEILENZIFFERN) abbrechen('zahl-ungueltig', 'Zeilennummer zu lang', start);
        tokens.push({ art: 'bezug', zeile: Number(ziffern), spalte: start });
      } else {
        tokens.push({ art: 'name', name: wort, spalte: start });
      }
    } else {
      abbrechen('zeichen-unerwartet', `Unerwartetes Zeichen ${JSON.stringify(z)}`, i);
    }
  }
  return tokens;
}

/** Klammern paarweise und nicht zu tief; vor dem Abstieg geprüft, damit der Abstieg begrenzt bleibt. */
function klammernPruefen(tokens: readonly Token[]): void {
  const offen: number[] = [];
  for (const t of tokens) {
    if (t.art === 'auf') {
      offen.push(t.spalte);
      if (offen.length > MAX_KLAMMERTIEFE)
        abbrechen('zu-tief', `Mehr als ${String(MAX_KLAMMERTIEFE)} Klammern ineinander`, t.spalte);
    } else if (t.art === 'zu') {
      if (offen.pop() === undefined)
        abbrechen('klammer-zu-viel', 'Schließende Klammer ohne öffnende', t.spalte);
    }
  }
  const erste = offen[0];
  if (erste !== undefined) abbrechen('klammer-fehlt', 'Schließende Klammer fehlt', erste);
}

// --- Abstieg ---------------------------------------------------------------------------------------------------

class Leser {
  private pos = 0;
  constructor(
    private readonly tokens: readonly Token[],
    private readonly ende: number,
  ) {}

  ganzerAusdruck(): Ausdruck {
    const a = this.ausdruck();
    const rest = this.tokens[this.pos];
    if (rest !== undefined) this.unerwartet(rest);
    return a;
  }

  private ausdruck(): Ausdruck {
    let links = this.summand();
    for (;;) {
      const t = this.tokens[this.pos];
      if (t?.art !== 'operator' || (t.operator !== '+' && t.operator !== '-')) return links;
      this.pos += 1;
      links = { art: 'rechnung', operator: t.operator, links, rechts: this.summand(), spalte: t.spalte };
    }
  }

  private summand(): Ausdruck {
    let links = this.faktor();
    for (;;) {
      const t = this.tokens[this.pos];
      if (t?.art !== 'operator' || (t.operator !== '*' && t.operator !== '/')) return links;
      this.pos += 1;
      links = { art: 'rechnung', operator: t.operator, links, rechts: this.faktor(), spalte: t.spalte };
    }
  }

  private faktor(): Ausdruck {
    const t = this.tokens[this.pos];
    if (t?.art === 'operator' && (t.operator === '+' || t.operator === '-')) {
      this.pos += 1;
      return { art: 'vorzeichen', zeichen: t.operator, operand: this.faktor(), spalte: t.spalte };
    }
    return this.primaer();
  }

  private primaer(): Ausdruck {
    const t = this.tokens[this.pos];
    if (t === undefined) return abbrechen('ausdruck-unvollstaendig', 'Ausdruck endet zu früh', this.ende);
    switch (t.art) {
      case 'zahl':
      case 'bezug':
      case 'name':
        this.pos += 1;
        return t;
      case 'auf': {
        this.pos += 1;
        const innen = this.ausdruck();
        const zu = this.tokens[this.pos];
        if (zu?.art !== 'zu') {
          // `klammernPruefen` sichert die schließende Klammer zu; davor steht also ein unerwartetes Zeichen.
          return zu === undefined
            ? abbrechen('klammer-fehlt', 'Schließende Klammer fehlt', t.spalte)
            : this.unerwartet(zu);
        }
        this.pos += 1;
        return innen;
      }
      default:
        return this.unerwartet(t);
    }
  }

  private unerwartet(t: Token): never {
    return abbrechen('zeichen-unerwartet', `Unerwartetes Zeichen an Spalte ${String(t.spalte)}`, t.spalte);
  }
}

/** Liest einen Rechenausdruck des freien Rechenansatzes. Wirft nie; jeder Fehler ist ein Wert mit Spalte. */
export function ausdruckLesen(text: string): Ergebnis<Ausdruck, Formelfehler> {
  if (text.length > MAX_AUSDRUCK_ZEICHEN) {
    return {
      ok: false,
      fehler: formelfehler(
        'ausdruck-zu-lang',
        `Ausdruck länger als ${String(MAX_AUSDRUCK_ZEICHEN)} Zeichen`,
        null,
      ),
    };
  }
  try {
    const tokens = zerlegen(text);
    if (tokens.length === 0)
      return { ok: false, fehler: formelfehler('ausdruck-leer', 'Leerer Ausdruck', null) };
    klammernPruefen(tokens);
    return { ok: true, wert: new Leser(tokens, text.length).ganzerAusdruck() };
  } catch (e) {
    if (e instanceof Abbruch) return { ok: false, fehler: e.fehler };
    throw e;
  }
}

// --- Formatieren -----------------------------------------------------------------------------------------------

/** Bindungsstärke: Strich 1, Punkt 2, alles andere 3. */
function rang(a: Ausdruck): number {
  if (a.art !== 'rechnung') return 3;
  return a.operator === '+' || a.operator === '-' ? 1 : 2;
}

function zahlText(wert: Dezimal): string {
  const [vor = '', nach = ''] = wert.split('.');
  const rest = nach.replace(/0+$/, '');
  return rest === '' ? vor : `${vor},${rest}`;
}

const klammern = (text: string, noetig: boolean): string => (noetig ? `(${text})` : text);

/**
 * Kanonischer Text eines Syntaxbaums: Dezimalkomma, `*` und `/`, Leerzeichen um `+` und `-` (zweistellig), nur
 * nötige Klammern. `ausdruckLesen` liest ihn wieder zum selben Baum (bis auf die Spalten).
 */
export function ausdruckFormatieren(a: Ausdruck): string {
  switch (a.art) {
    case 'zahl':
      return zahlText(a.wert);
    case 'bezug':
      return `Z${String(a.zeile)}`;
    case 'name':
      return a.name;
    case 'vorzeichen':
      return `${a.zeichen}${klammern(ausdruckFormatieren(a.operand), a.operand.art === 'rechnung')}`;
    case 'rechnung': {
      const r = rang(a);
      const links = klammern(ausdruckFormatieren(a.links), rang(a.links) < r);
      const rechts = klammern(ausdruckFormatieren(a.rechts), rang(a.rechts) <= r);
      return r === 1 ? `${links} ${a.operator} ${rechts}` : `${links}${a.operator}${rechts}`;
    }
  }
}
