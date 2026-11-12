// SPDX-License-Identifier: AGPL-3.0-or-later
// STEP-Leser (ISO 10303-21, „IFC-SPF“) für Ticket 98, eigene Umsetzung nach der Norm (D-50, C1).
//
// Zwei Schritte: Ein schneller Lauf über die Bytes legt für jede Instanz `#n=NAME(...);` Nummer, Name, Lage und Zeile ab;
// die Parameter einer Instanz zerlegt `parameter()` erst, wenn der Leser sie braucht. Die Geometrie, der größte Teil einer
// Datei, wird so nie zerlegt. Kaputte Daten sind Befunde, kein Absturz: Die betroffene Instanz fällt weg, der Rest wird
// gelesen. Rein (A2): Bytes rein, Werte und Befunde raus.

import type { IfcBefund, IfcBefundcode } from './typen';

/** Ein Parameterwert einer Instanz. Zahlen bleiben Text, wie er in der Datei steht (N1: nie über `number`). */
export type StepWert =
  | { readonly art: 'fehlt' } // `$`
  | { readonly art: 'abgeleitet' } // `*`
  | { readonly art: 'verweis'; readonly id: number } // `#12`
  | { readonly art: 'text'; readonly wert: string } // `'…'`, entschlüsselt
  | { readonly art: 'zahl'; readonly text: string } // INTEGER oder REAL, z. B. `1.E-05`
  | { readonly art: 'aufzaehlung'; readonly wert: string } // `.T.`, `.ELEMENT.` ohne Punkte
  | { readonly art: 'binaer'; readonly text: string } // `"0FF"` ohne Anführungszeichen
  | { readonly art: 'liste'; readonly werte: readonly StepWert[] }
  | { readonly art: 'getypt'; readonly typ: string; readonly wert: StepWert }; // `IFCLABEL('…')`

const FEHLT: StepWert = { art: 'fehlt' };
const ABGELEITET: StepWert = { art: 'abgeleitet' };

/** Wie die Bytes außerhalb von ASCII zu lesen sind: nach Norm nur ASCII; Abweichungen mit Befund (Ticket 98, Punkt 1). */
export type Textmodus = 'ascii' | 'utf8' | 'latin1';

const LF = 0x0a;
const CR = 0x0d;
const SP = 0x20;
const TAB = 0x09;
const FF = 0x0c;
const VT = 0x0b;
const APOSTROPH = 0x27;
const ANFUEHRUNG = 0x22;
const RAUTE = 0x23;
const DOLLAR = 0x24;
const STERN = 0x2a;
const KLAMMER_AUF = 0x28;
const KLAMMER_ZU = 0x29;
const KOMMA = 0x2c;
const PUNKT = 0x2e;
const SCHRAEG = 0x2f;
const SEMIKOLON = 0x3b;
const GLEICH = 0x3d;
const PLUS = 0x2b;
const MINUS = 0x2d;

const istZiffer = (c: number): boolean => c >= 0x30 && c <= 0x39;
const istBuchstabe = (c: number): boolean => (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a);
const istWortzeichen = (c: number): boolean => istBuchstabe(c) || istZiffer(c) || c === 0x5f;
const istHex = (c: number): boolean => istZiffer(c) || (c >= 0x41 && c <= 0x46) || (c >= 0x61 && c <= 0x66);

/** Ermittelt den Textmodus: ASCII nach Norm, sonst gültiges UTF-8, sonst Latin-1 (ISO 8859-1). */
export function textmodusErmitteln(b: Uint8Array): Textmodus {
  const n = b.length;
  let i = 0;
  while (i < n && (b[i] ?? 0) < 0x80) i++;
  if (i === n) return 'ascii';
  return gueltigesUtf8(b, i) ? 'utf8' : 'latin1';
}

function gueltigesUtf8(b: Uint8Array, ab: number): boolean {
  const n = b.length;
  let i = ab;
  while (i < n) {
    const c = b[i] ?? 0;
    if (c < 0x80) {
      i++;
      continue;
    }
    let folge: number;
    let kleinster: number;
    if (c >= 0xc2 && c <= 0xdf) [folge, kleinster] = [1, 0x80];
    else if (c >= 0xe0 && c <= 0xef) [folge, kleinster] = [2, 0x800];
    else if (c >= 0xf0 && c <= 0xf4) [folge, kleinster] = [3, 0x10000];
    else return false;
    let zeichen = c & (0x3f >> folge);
    for (let k = 1; k <= folge; k++) {
      const d = b[i + k];
      if (d === undefined || (d & 0xc0) !== 0x80) return false;
      zeichen = (zeichen << 6) | (d & 0x3f);
    }
    if (zeichen < kleinster || zeichen > 0x10ffff || (zeichen >= 0xd800 && zeichen <= 0xdfff)) return false;
    i += folge + 1;
  }
  return true;
}

const UTF8 = new TextDecoder('utf-8');

/** Bytes `[von, bis)` als Text im gegebenen Modus. ASCII und Latin-1: ein Byte, ein Zeichen. */
function bytesAlsText(b: Uint8Array, von: number, bis: number, modus: Textmodus): string {
  if (modus === 'utf8') return UTF8.decode(b.subarray(von, bis));
  let s = '';
  for (let i = von; i < bis; i += 4096) s += String.fromCharCode(...b.subarray(i, Math.min(bis, i + 4096)));
  return s;
}

// --- Zeichenketten -------------------------------------------------------------------------------------------------

/** Dekodierer für die Codeseiten `\PB\` bis `\PI\` (ISO 8859-2 bis -9), bei Bedarf angelegt. */
const codeseiten = new Map<string, InstanceType<typeof TextDecoder> | null>();

function codeseitenzeichen(seite: string, byte: number): string | null {
  if (seite === 'A') return String.fromCharCode(byte);
  let d = codeseiten.get(seite);
  if (d === undefined) {
    const teil = seite.charCodeAt(0) - 0x40; // B → 2 … I → 9
    try {
      d = new TextDecoder(`iso-8859-${String(teil)}`, { fatal: true });
    } catch {
      d = null;
    }
    codeseiten.set(seite, d);
  }
  if (d === null) return null;
  try {
    return d.decode(Uint8Array.of(byte));
  } catch {
    return null;
  }
}

const HEX = /^[0-9A-Fa-f]+$/;

/**
 * Entschlüsselt eine STEP-Zeichenkette (Inhalt zwischen den Apostrophen, schon nach dem Textmodus gelesen): `''`, `\\`,
 * `\S\`, `\P?\`, `\X\hh`, `\X2\…\X0\`, `\X4\…\X0\`; `\N\`, `\F\` und Zeilenumbrüche entfallen. Eine ungültige Anweisung
 * bleibt als Text stehen und ergibt `fehler`.
 */
export function zeichenketteEntschluesseln(roh: string): {
  readonly text: string;
  readonly fehler: string | null;
} {
  if (!/['\\\r\n]/.test(roh)) return { text: roh, fehler: null };
  let aus = '';
  let fehler: string | null = null;
  let seite = 'A';
  const n = roh.length;
  let i = 0;
  const ungueltig = (grund: string): void => {
    fehler ??= grund;
    aus += '\\';
    i++;
  };
  while (i < n) {
    const c = roh[i] ?? '';
    if (c === "'") {
      aus += "'";
      i += roh[i + 1] === "'" ? 2 : 1;
      continue;
    }
    if (c === '\r' || c === '\n') {
      i++;
      continue;
    }
    if (c !== '\\') {
      aus += c;
      i++;
      continue;
    }
    const a = roh[i + 1] ?? '';
    const b = roh[i + 2] ?? '';
    if (a === '\\') {
      aus += '\\';
      i += 2;
    } else if (a === 'S' && b === '\\') {
      const z = roh.charCodeAt(i + 3);
      const zeichen = z >= 0x20 && z <= 0x7e ? codeseitenzeichen(seite, z + 0x80) : null;
      if (zeichen === null) ungueltig(`\\S\\ ohne gültiges Zeichen oder Codeseite ${seite} nicht lesbar`);
      else {
        aus += zeichen;
        i += 4;
      }
    } else if (a === 'P' && b >= 'A' && b <= 'I' && roh[i + 3] === '\\') {
      seite = b;
      i += 4;
    } else if ((a === 'N' || a === 'F') && b === '\\') {
      i += 3;
    } else if (a === 'X' && b === '\\') {
      const hh = roh.slice(i + 3, i + 5);
      if (hh.length === 2 && HEX.test(hh)) {
        aus += String.fromCharCode(Number.parseInt(hh, 16));
        i += 5;
      } else ungueltig('\\X\\ ohne zwei Hexziffern');
    } else if (a === 'X' && (b === '2' || b === '4') && roh[i + 3] === '\\') {
      const ende = roh.indexOf('\\X0\\', i + 4);
      const breite = b === '2' ? 4 : 8;
      const hex = ende < 0 ? '' : roh.slice(i + 4, ende);
      if (ende < 0 || hex.length === 0 || hex.length % breite !== 0 || !HEX.test(hex)) {
        ungueltig(`\\X${b}\\ ohne gültigen Inhalt oder ohne \\X0\\`);
        continue;
      }
      let teil = '';
      let gut = true;
      for (let k = 0; k < hex.length; k += breite) {
        const wert = Number.parseInt(hex.slice(k, k + breite), 16);
        if (breite === 4) teil += String.fromCharCode(wert);
        else if (wert <= 0x10ffff) teil += String.fromCodePoint(wert);
        else gut = false;
      }
      if (gut) {
        aus += teil;
        i = ende + 4;
      } else ungueltig('\\X4\\ mit Zeichen über U+10FFFF');
    } else ungueltig(`unbekannte Anweisung \\${a}`);
  }
  return { text: aus, fehler };
}

// --- Der Lauf über die Bytes -----------------------------------------------------------------------------------------

/** Kopf der Datei: die Einträge `FILE_DESCRIPTION`, `FILE_NAME`, `FILE_SCHEMA` mit ihren Parametern. */
export type StepKopf = ReadonlyMap<string, readonly StepWert[]>;

export type StepKopfergebnis =
  | { readonly ok: false; readonly meldung: string; readonly zeile: number }
  | { readonly ok: true; readonly kopf: StepKopf; readonly pos: number; readonly zeile: number };

/** Befund mit Ort einer Instanz (`#n`, Zeile). */
export function befund(
  schwere: IfcBefund['schwere'],
  code: IfcBefundcode,
  meldung: string,
  ort: IfcBefund['ort'] = {},
): IfcBefund {
  return { schwere, code, meldung, ort };
}

class Lauf {
  pos = 0;
  zeile = 1;
  readonly n: number;
  constructor(readonly b: Uint8Array) {
    this.n = b.length;
  }

  /** Überspringt Leerraum und Kommentare; `false`, wenn ein Kommentar nicht endet. */
  leer(): boolean {
    const b = this.b;
    const n = this.n;
    let p = this.pos;
    let z = this.zeile;
    let gut = true;
    while (p < n) {
      const c = b[p] ?? 0;
      if (c === LF) z++;
      else if (c === SCHRAEG && b[p + 1] === STERN) {
        p += 2;
        while (p < n && !(b[p] === STERN && b[p + 1] === SCHRAEG)) {
          if (b[p] === LF) z++;
          p++;
        }
        if (p >= n) {
          gut = false;
          break;
        }
        p += 2;
        continue;
      } else if (c !== SP && c !== CR && c !== TAB && c !== FF && c !== VT) break;
      p++;
    }
    this.pos = p;
    this.zeile = z;
    return gut;
  }

  /** Steht an der Stelle genau dieser ASCII-Text? */
  bei(text: string): boolean {
    for (let k = 0; k < text.length; k++) if (this.b[this.pos + k] !== text.charCodeAt(k)) return false;
    return true;
  }

  /** Schlüsselwort `[A-Za-z_!][A-Za-z0-9_]*` in Großbuchstaben, sonst `null`. */
  schluesselwort(): string | null {
    const b = this.b;
    const start = this.pos;
    const c = b[start] ?? 0;
    if (!istBuchstabe(c) && c !== 0x5f && c !== 0x21) return null;
    let p = start + 1;
    while (p < this.n && istWortzeichen(b[p] ?? 0)) p++;
    this.pos = p;
    return bytesAlsText(b, start, p, 'ascii').toUpperCase();
  }

  /** Erwartet ein Zeichen nach Leerraum; rückt dahinter. */
  zeichen(c: number): boolean {
    if (!this.leer() || this.b[this.pos] !== c) return false;
    this.pos++;
    return true;
  }

  /**
   * Sucht das `;`, das eine Instanz beendet, außerhalb von Zeichenketten, Binärwerten und Kommentaren; zählt die Zeilen
   * mit. Liefert seine Stelle oder −1 am Dateiende.
   */
  semikolon(): number {
    const b = this.b;
    const n = this.n;
    let p = this.pos;
    let z = this.zeile;
    let ergebnis = -1;
    while (p < n) {
      const c = b[p] ?? 0;
      if (c === SEMIKOLON) {
        ergebnis = p;
        break;
      }
      if (c === LF) z++;
      else if (c === APOSTROPH) {
        p++;
        while (p < n) {
          const d = b[p] ?? 0;
          if (d === APOSTROPH) {
            if (b[p + 1] !== APOSTROPH) break;
            p++;
          } else if (d === LF) z++;
          p++;
        }
      } else if (c === ANFUEHRUNG) {
        p++;
        while (p < n && b[p] !== ANFUEHRUNG) {
          if (b[p] === LF) z++;
          p++;
        }
      } else if (c === SCHRAEG && b[p + 1] === STERN) {
        p += 2;
        while (p < n && !(b[p] === STERN && b[p + 1] === SCHRAEG)) {
          if (b[p] === LF) z++;
          p++;
        }
        p++;
      }
      p++;
    }
    this.pos = ergebnis < 0 ? n : ergebnis + 1;
    this.zeile = z;
    return ergebnis;
  }
}

/** Liest Anfang und Kopf (`ISO-10303-21;` `HEADER;` … `ENDSEC;`); `pos` steht danach vor dem Abschnitt `DATA`. */
export function kopfLesen(b: Uint8Array, modus: Textmodus, maxTiefe: number): StepKopfergebnis {
  const lauf = new Lauf(b);
  const nein = (meldung: string): StepKopfergebnis => ({ ok: false, meldung, zeile: lauf.zeile });
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) lauf.pos = 3;
  if (!lauf.leer() || !lauf.bei('ISO-10303-21')) return nein('Die Datei beginnt nicht mit „ISO-10303-21;“.');
  lauf.pos += 'ISO-10303-21'.length;
  if (!lauf.zeichen(SEMIKOLON)) return nein('Nach „ISO-10303-21“ fehlt „;“.');
  if (!lauf.leer() || lauf.schluesselwort() !== 'HEADER' || !lauf.zeichen(SEMIKOLON))
    return nein('Der Abschnitt „HEADER;“ fehlt.');
  const kopf = new Map<string, readonly StepWert[]>();
  for (;;) {
    if (!lauf.leer()) return nein('Kommentar im Kopf ohne Ende.');
    const wort = lauf.schluesselwort();
    if (wort === null) return nein('Der Kopf endet nicht mit „ENDSEC;“.');
    if (wort === 'ENDSEC') {
      if (!lauf.zeichen(SEMIKOLON)) return nein('Nach „ENDSEC“ fehlt „;“.');
      break;
    }
    if (!lauf.leer() || b[lauf.pos] !== KLAMMER_AUF) return nein(`Kopfeintrag ${wort} ohne Parameter.`);
    const zerlegt = zerlegen(b, lauf.pos, b.length, modus, maxTiefe, () => undefined);
    if (!zerlegt.ok) return nein(`Kopfeintrag ${wort}: ${zerlegt.grund}`);
    lauf.pos = zerlegt.ende;
    if (!lauf.zeichen(SEMIKOLON)) return nein(`Nach dem Kopfeintrag ${wort} fehlt „;“.`);
    if (!kopf.has(wort)) kopf.set(wort, zerlegt.werte);
  }
  return { ok: true, kopf, pos: lauf.pos, zeile: lauf.zeile };
}

// --- Parameter zerlegen ------------------------------------------------------------------------------------------------

/** Überspringt Leerraum und Kommentare in `[p, bis)`; −1, wenn ein Kommentar nicht endet. */
function leerraumUeberspringen(b: Uint8Array, von: number, bis: number): number {
  let p = von;
  while (p < bis) {
    const c = b[p] ?? 0;
    if (c === SCHRAEG && b[p + 1] === STERN) {
      p += 2;
      while (p < bis && !(b[p] === STERN && b[p + 1] === SCHRAEG)) p++;
      if (p >= bis) return -1;
      p += 2;
    } else if (c === SP || c === LF || c === CR || c === TAB || c === FF || c === VT) p++;
    else break;
  }
  return p;
}

type Zerlegung =
  | { readonly ok: true; readonly werte: readonly StepWert[]; readonly ende: number }
  | { readonly ok: false; readonly grund: string; readonly zuTief: boolean };

/**
 * Zerlegt die Parameterliste ab der öffnenden Klammer an `von` (ohne Rekursion, mit Tiefengrenze). `ende` ist die
 * Stelle hinter der schließenden Klammer. `textfehler` erhält ungültige Zeichenketten-Anweisungen.
 */
function zerlegen(
  b: Uint8Array,
  von: number,
  bis: number,
  modus: Textmodus,
  maxTiefe: number,
  textfehler: (grund: string) => void,
): Zerlegung {
  const nein = (grund: string, zuTief = false): Zerlegung => ({ ok: false, grund, zuTief });
  interface Rahmen {
    readonly werte: StepWert[];
    readonly typ: string | null;
  }
  const stapel: Rahmen[] = [];
  let aktuell: Rahmen = { werte: [], typ: null };
  let p = von + 1;
  let erwarteWert = true;
  let nachKomma = false;
  for (;;) {
    p = leerraumUeberspringen(b, p, bis);
    if (p < 0) return nein('Kommentar ohne Ende.');
    if (p >= bis) return nein('Parameterliste ohne schließende Klammer.');
    const c = b[p] ?? 0;
    if (!erwarteWert) {
      if (c === KOMMA) {
        erwarteWert = true;
        nachKomma = true;
        p++;
        continue;
      }
      if (c !== KLAMMER_ZU)
        return nein(`Unerwartetes Zeichen „${String.fromCharCode(c)}“ statt „,“ oder „)“.`);
    }
    if (c === KLAMMER_ZU) {
      if (erwarteWert && nachKomma) return nein('Wert fehlt vor „)“.');
      p++;
      const fertig = aktuell;
      const oben = stapel.pop();
      if (oben === undefined) return { ok: true, werte: fertig.werte, ende: p };
      let wert: StepWert;
      if (fertig.typ === null) wert = { art: 'liste', werte: fertig.werte };
      else {
        const [einziger] = fertig.werte;
        if (fertig.werte.length !== 1 || einziger === undefined)
          return nein(`Getypter Wert ${fertig.typ} braucht genau einen Parameter.`);
        wert = { art: 'getypt', typ: fertig.typ, wert: einziger };
      }
      aktuell = oben;
      aktuell.werte.push(wert);
      erwarteWert = false;
      nachKomma = false;
      continue;
    }
    // Ein Wert
    nachKomma = false;
    erwarteWert = false;
    if (c === DOLLAR) {
      aktuell.werte.push(FEHLT);
      p++;
    } else if (c === STERN) {
      aktuell.werte.push(ABGELEITET);
      p++;
    } else if (c === APOSTROPH) {
      const start = p + 1;
      let q = start;
      for (;;) {
        if (q >= bis) return nein('Zeichenkette ohne Ende.');
        if (b[q] === APOSTROPH) {
          if (b[q + 1] !== APOSTROPH) break;
          q += 2;
        } else q++;
      }
      const roh = bytesAlsText(b, start, q, modus);
      const { text, fehler } = zeichenketteEntschluesseln(roh);
      if (fehler !== null) textfehler(fehler);
      aktuell.werte.push({ art: 'text', wert: text });
      p = q + 1;
    } else if (c === ANFUEHRUNG) {
      let q = p + 1;
      while (q < bis && istHex(b[q] ?? 0)) q++;
      if (b[q] !== ANFUEHRUNG) return nein('Binärwert ohne Ende oder mit Zeichen außer Hexziffern.');
      aktuell.werte.push({ art: 'binaer', text: bytesAlsText(b, p + 1, q, 'ascii') });
      p = q + 1;
    } else if (c === PUNKT) {
      let q = p + 1;
      while (q < bis && istWortzeichen(b[q] ?? 0)) q++;
      if (q === p + 1 || b[q] !== PUNKT) return nein('Aufzählungswert ohne schließenden Punkt.');
      aktuell.werte.push({ art: 'aufzaehlung', wert: bytesAlsText(b, p + 1, q, 'ascii').toUpperCase() });
      p = q + 1;
    } else if (c === RAUTE) {
      let q = p + 1;
      while (q < bis && istZiffer(b[q] ?? 0)) q++;
      if (q === p + 1 || q - p - 1 > 15) return nein('Verweis ohne gültige Nummer.');
      aktuell.werte.push({ art: 'verweis', id: Number(bytesAlsText(b, p + 1, q, 'ascii')) });
      p = q;
    } else if (istZiffer(c) || c === PLUS || c === MINUS) {
      let q = p + (istZiffer(c) ? 0 : 1);
      const ziffernAb = q;
      while (q < bis && istZiffer(b[q] ?? 0)) q++;
      if (q === ziffernAb) return nein('Vorzeichen ohne Zahl.');
      if (b[q] === PUNKT) {
        q++;
        while (q < bis && istZiffer(b[q] ?? 0)) q++;
      }
      if (b[q] === 0x45 || b[q] === 0x65) {
        q++;
        if (b[q] === PLUS || b[q] === MINUS) q++;
        const exponentAb = q;
        while (q < bis && istZiffer(b[q] ?? 0)) q++;
        if (q === exponentAb) return nein('Exponent ohne Ziffern.');
      }
      aktuell.werte.push({ art: 'zahl', text: bytesAlsText(b, p, q, 'ascii') });
      p = q;
    } else if (istBuchstabe(c) || c === 0x5f || c === 0x21) {
      let q = p + 1;
      while (q < bis && istWortzeichen(b[q] ?? 0)) q++;
      const typ = bytesAlsText(b, p, q, 'ascii').toUpperCase();
      q = leerraumUeberspringen(b, q, bis);
      if (q < 0 || b[q] !== KLAMMER_AUF) return nein(`Getypter Wert ${typ} ohne „(“.`);
      if (stapel.length + 2 > maxTiefe) return nein(`Verschachtelung tiefer als ${String(maxTiefe)}.`, true);
      stapel.push(aktuell);
      aktuell = { werte: [], typ };
      p = q + 1;
      erwarteWert = true;
    } else if (c === KLAMMER_AUF) {
      if (stapel.length + 2 > maxTiefe) return nein(`Verschachtelung tiefer als ${String(maxTiefe)}.`, true);
      stapel.push(aktuell);
      aktuell = { werte: [], typ: null };
      p++;
      erwarteWert = true;
    } else return nein(`Unerwartetes Zeichen „${String.fromCharCode(c)}“.`);
  }
}

// --- Daten ------------------------------------------------------------------------------------------------------------

/** Die Instanzen des Abschnitts `DATA` in der Reihenfolge der Datei, Parameter erst bei Bedarf zerlegt. */
export interface StepDaten {
  /** Zahl der Instanzen; jede hat einen Index `0 … anzahl - 1` in der Reihenfolge der Datei. */
  readonly anzahl: number;
  /** Instanznummer (`#n`). */
  id(i: number): number;
  /** Klassenname in Großbuchstaben, z. B. `IFCWALL`; `''` bei einer komplexen Instanz `#n=(…);`. */
  name(i: number): string;
  zeile(i: number): number;
  /** Index der Instanz `#id`, `undefined`, wenn sie fehlt. */
  index(id: number): number | undefined;
  /** Indizes aller Instanzen einer Klasse (Großbuchstaben) in der Reihenfolge der Datei. */
  klasse(name: string): readonly number[];
  /** Parameter der Instanz, beim ersten Aufruf zerlegt; `null` (mit Befund), wenn sie nicht lesbar ist. */
  parameter(i: number): readonly StepWert[] | null;
  /**
   * Befunde beim Zerlegen der Instanz (Syntax, Tiefe, Zeichenketten), in ihrer Reihenfolge; leer, solange sie nicht zerlegt
   * ist. Gemeldet werden sie vom Leser, der die Parameter braucht (`Modellleser.parameter`), damit jeder Leser sie einmal
   * meldet: der Eigenschaftsindex je Abfrage (Ticket 107).
   */
  zerlegungsbefunde(i: number): readonly IfcBefund[];
}

/** Liest den Abschnitt `DATA` ab `pos` (hinter dem Kopf). Befunde landen in `befunde`. */
export function datenLesen(
  b: Uint8Array,
  ab: { readonly pos: number; readonly zeile: number },
  modus: Textmodus,
  maxTiefe: number,
  befunde: IfcBefund[],
): StepDaten | null {
  const lauf = new Lauf(b);
  lauf.pos = ab.pos;
  lauf.zeile = ab.zeile;
  if (!lauf.leer() || lauf.schluesselwort() !== 'DATA') return null;
  if (lauf.leer() && b[lauf.pos] === KLAMMER_AUF) {
    const zerlegt = zerlegen(b, lauf.pos, b.length, modus, maxTiefe, () => undefined);
    if (!zerlegt.ok) return null;
    lauf.pos = zerlegt.ende;
  }
  if (!lauf.zeichen(SEMIKOLON)) return null;

  const ids: number[] = [];
  const namen: string[] = [];
  const anfang: number[] = [];
  const ende: number[] = [];
  const zeilen: number[] = [];
  const nachId = new Map<number, number>();
  const nachKlasse = new Map<string, number[]>();
  const unvollstaendig = (meldung: string): void => {
    befunde.push(befund('warnung', 'datei-unvollstaendig', meldung, { zeile: lauf.zeile }));
  };

  for (;;) {
    if (!lauf.leer()) {
      unvollstaendig('Kommentar ohne Ende; die Datei endet darin.');
      break;
    }
    if (lauf.pos >= lauf.n) {
      unvollstaendig('Die Datei endet ohne „ENDSEC;“ und „END-ISO-10303-21;“.');
      break;
    }
    const zeile = lauf.zeile;
    const start = lauf.pos;
    const syntaxfehler = (meldung: string): void => {
      befunde.push(befund('fehler', 'step-syntaxfehler', meldung, { zeile }));
      lauf.pos = start;
      lauf.zeile = zeile;
      lauf.semikolon();
    };
    if (b[lauf.pos] === RAUTE) {
      let q = lauf.pos + 1;
      while (q < lauf.n && istZiffer(b[q] ?? 0)) q++;
      if (q === lauf.pos + 1 || q - lauf.pos - 1 > 15) {
        syntaxfehler('Instanz ohne gültige Nummer.');
        continue;
      }
      const id = Number(bytesAlsText(b, lauf.pos + 1, q, 'ascii'));
      lauf.pos = q;
      if (!lauf.zeichen(GLEICH) || !lauf.leer()) {
        syntaxfehler(`#${String(id)}: „=“ fehlt.`);
        continue;
      }
      let name = '';
      if (b[lauf.pos] !== KLAMMER_AUF) {
        const wort = lauf.schluesselwort();
        if (wort === null || !lauf.leer() || b[lauf.pos] !== KLAMMER_AUF) {
          syntaxfehler(`#${String(id)}: Klassenname oder „(“ fehlt.`);
          continue;
        }
        name = wort;
      }
      const parameterAb = lauf.pos;
      const semikolon = lauf.semikolon();
      if (semikolon < 0) {
        unvollstaendig(`#${String(id)} endet nicht mit „;“; die Datei ist abgeschnitten.`);
        break;
      }
      if (nachId.has(id)) {
        befunde.push(
          befund('fehler', 'instanz-doppelt', `#${String(id)} steht zweimal in der Datei; die erste gilt.`, {
            pfad: `#${String(id)}`,
            zeile,
          }),
        );
        continue;
      }
      const i = ids.length;
      ids.push(id);
      namen.push(name);
      anfang.push(parameterAb);
      ende.push(semikolon);
      zeilen.push(zeile);
      nachId.set(id, i);
      const liste = nachKlasse.get(name);
      if (liste === undefined) nachKlasse.set(name, [i]);
      else liste.push(i);
      continue;
    }
    if (lauf.bei('END-ISO-10303-21')) {
      unvollstaendig('„END-ISO-10303-21;“ ohne vorheriges „ENDSEC;“.');
      break;
    }
    const wort = lauf.schluesselwort();
    if (wort === 'ENDSEC') {
      if (!lauf.zeichen(SEMIKOLON) || !lauf.leer()) {
        unvollstaendig('Nach „ENDSEC“ fehlt „;“.');
        break;
      }
      // Weitere DATA-Abschnitte (ISO 10303-21, 3. Ausgabe) werden mitgelesen.
      const vorher = lauf.pos;
      if (lauf.schluesselwort() === 'DATA') {
        if (lauf.leer() && b[lauf.pos] === KLAMMER_AUF) {
          const zerlegt = zerlegen(b, lauf.pos, b.length, modus, maxTiefe, () => undefined);
          if (zerlegt.ok) lauf.pos = zerlegt.ende;
        }
        if (lauf.zeichen(SEMIKOLON)) continue;
      }
      lauf.pos = vorher;
      if (!lauf.bei('END-ISO-10303-21')) unvollstaendig('Nach dem Abschnitt DATA fehlt „END-ISO-10303-21;“.');
      break;
    }
    syntaxfehler(wort === null ? 'Unerwartetes Zeichen statt einer Instanz.' : `Unerwartetes Wort ${wort}.`);
  }

  const zerlegt = new Map<number, readonly StepWert[] | null>();
  const zerlegungsbefunde = new Map<number, IfcBefund[]>();
  const keine: readonly number[] = [];
  const keineBefunde: readonly IfcBefund[] = [];
  return {
    anzahl: ids.length,
    id: (i) => ids[i] ?? -1,
    name: (i) => namen[i] ?? '',
    zeile: (i) => zeilen[i] ?? 0,
    index: (id) => nachId.get(id),
    klasse: (name) => nachKlasse.get(name) ?? keine,
    parameter(i) {
      const fertig = zerlegt.get(i);
      if (fertig !== undefined) return fertig;
      const id = ids[i] ?? -1;
      const name = namen[i] ?? '';
      const ort = { pfad: `#${String(id)}`, zeile: zeilen[i] ?? 0 };
      let werte: readonly StepWert[] | null = null;
      const gemeldet: IfcBefund[] = [];
      if (name !== '') {
        const ergebnis = zerlegen(b, anfang[i] ?? 0, ende[i] ?? 0, modus, maxTiefe, (grund) =>
          gemeldet.push(befund('warnung', 'zeichenkette-ungueltig', `#${String(id)}: ${grund}.`, ort)),
        );
        if (ergebnis.ok) {
          if (leerraumUeberspringen(b, ergebnis.ende, ende[i] ?? 0) === (ende[i] ?? 0))
            werte = ergebnis.werte;
          else
            gemeldet.push(
              befund('fehler', 'step-syntaxfehler', `#${String(id)}: Text nach der Parameterliste.`, ort),
            );
        } else
          gemeldet.push(
            befund(
              'fehler',
              ergebnis.zuTief ? 'step-zu-tief' : 'step-syntaxfehler',
              `#${String(id)} (${name}): ${ergebnis.grund}`,
              ort,
            ),
          );
      }
      if (gemeldet.length > 0) zerlegungsbefunde.set(i, gemeldet);
      zerlegt.set(i, werte);
      return werte;
    },
    zerlegungsbefunde: (i) => zerlegungsbefunde.get(i) ?? keineBefunde,
  };
}
