// SPDX-License-Identifier: AGPL-3.0-or-later
// Texte von GAEB 2000 (Ticket 145): ab Version 1.1 als RTF, in 1.0 auch als einfacher Text. Eigener kleiner Leser für die
// Teilmenge, die das Modell hält (F6): Absätze (`\par`), Zeilenumbrüche (`\line`), fett, kursiv, unterstrichen, Sonderzeichen
// (`\'hh` in Windows-1252, `\uN`). Alles andere (Schrift, Größe, Farbe, Einzüge, Tabellen, Bilder) zählt als verworfen und wird
// vom Leser als Befund gemeldet. Listen erkennt der Leser nicht (keine Quelle dafür, D-145.5); ihr Text bleibt als Absatz.
// Rein (A2).

/** Ein Textlauf mit seiner Auszeichnung oder ein Zeilenumbruch. */
export type Inline =
  | {
      readonly art: 'text';
      readonly text: string;
      readonly fett: boolean;
      readonly kursiv: boolean;
      readonly unterstrichen: boolean;
    }
  | { readonly art: 'umbruch' };

export interface Textinhalt {
  /** Absätze; leere Absätze fallen weg, Leerraum am Anfang und Ende eines Absatzes auch. */
  readonly absaetze: readonly (readonly Inline[])[];
  /** Zahl der verworfenen Steuerwörter (Formatierung ohne Platz im Modell). */
  readonly verworfen: number;
  /** Zahl der Bilder im Text (nicht übernommen). */
  readonly bilder: number;
}

/** Gruppen, deren Inhalt kein Text ist (Tabellen der Schriften, Farben, Formatvorlagen, Kopf- und Fußzeilen …). */
const UEBERSPRINGEN: ReadonlySet<string> = new Set([
  'fonttbl',
  'colortbl',
  'stylesheet',
  'info',
  'listtable',
  'listoverridetable',
  'generator',
  'header',
  'headerl',
  'headerr',
  'headerf',
  'footer',
  'footerl',
  'footerr',
  'footerf',
  'xmlnstbl',
  'rsidtbl',
  'themedata',
  'colorschememapping',
  'latentstyles',
  'datastore',
  'pgdsctbl',
  'object',
]);

/** Steuerwörter des Dateikopfs und Grundeinstellungen, die nichts am Text ändern: still übergangen. */
const STILL: ReadonlySet<string> = new Set([
  'rtf',
  'ansi',
  'ansicpg',
  'mac',
  'pc',
  'pca',
  'deff',
  'deflang',
  'deflangfe',
  'pard',
  'f',
  'lang',
  'langfe',
  'langnp',
  'langfenp',
  'nouicompat',
  'viewkind',
  'ltrpar',
  'ltrch',
  'rtlch',
  'sectd',
  'loch',
  'hich',
  'dbch',
  'uc',
]);

/** Sonderzeichen als Steuerwort. */
const ZEICHEN: Readonly<Record<string, string>> = {
  tab: '\t',
  emdash: '—',
  endash: '–',
  bullet: '•',
  lquote: '‘',
  rquote: '’',
  ldblquote: '“',
  rdblquote: '”',
  emspace: ' ',
  enspace: ' ',
};

let ansi: string | null = null;
/** Ein Byte in Windows-1252 (die Codepage von `\ansi`). */
function ansiZeichen(byte: number): string {
  if (byte < 0x80) return String.fromCharCode(byte);
  ansi ??= new TextDecoder('windows-1252').decode(Uint8Array.from({ length: 128 }, (_, i) => 0x80 + i));
  return ansi.charAt(byte - 0x80);
}

interface Zustand {
  fett: boolean;
  kursiv: boolean;
  unterstrichen: boolean;
  uc: number;
  ueberspringen: boolean;
}

/** Ist der Wert RTF (beginnt mit `{\rtf`)? */
export const istRtf = (wert: string): boolean => /^\s*\{\\rtf/.test(wert);

class Sammler {
  readonly absaetze: Inline[][] = [];
  private aktuell: Inline[] = [];

  text(t: string, z: Zustand): void {
    const letzter = this.aktuell.at(-1);
    if (
      letzter?.art === 'text' &&
      letzter.fett === z.fett &&
      letzter.kursiv === z.kursiv &&
      letzter.unterstrichen === z.unterstrichen
    )
      this.aktuell[this.aktuell.length - 1] = { ...letzter, text: letzter.text + t };
    else
      this.aktuell.push({
        art: 'text',
        text: t,
        fett: z.fett,
        kursiv: z.kursiv,
        unterstrichen: z.unterstrichen,
      });
  }

  umbruch(): void {
    this.aktuell.push({ art: 'umbruch' });
  }

  absatz(): void {
    const a = bereinige(this.aktuell);
    if (a.length > 0) this.absaetze.push(a);
    this.aktuell = [];
  }
}

/** Leerraum am Anfang und Ende eines Absatzes weg, leere Läufe weg; ein Absatz ohne Text ist leer. */
function bereinige(inhalt: readonly Inline[]): Inline[] {
  const a = [...inhalt];
  const kuerze = (i: number, art: 'anfang' | 'ende'): void => {
    const l = a[i];
    if (l?.art !== 'text') return;
    const t = art === 'anfang' ? l.text.trimStart() : l.text.trimEnd();
    a[i] = { ...l, text: t };
  };
  kuerze(0, 'anfang');
  kuerze(a.length - 1, 'ende');
  const ohneLeer = a.filter((l) => l.art !== 'text' || l.text !== '');
  return ohneLeer.some((l) => l.art === 'text' && l.text.trim() !== '') ? ohneLeer : [];
}

/**
 * RTF → Absätze. Zeilenwechsel der Datei sind kein Text (wie in RTF); Einrückungen am Zeilenanfang sind Gestaltung der Datei und
 * fallen weg (Lesart D-145.6). Unausgeglichene Klammern werden toleriert.
 */
export function rtfLesen(roh: string): Textinhalt {
  const s = roh.replace(/\r\n|\n|\r/g, '\n').replace(/\n[ \t]+/g, '\n');
  const aus = new Sammler();
  const stapel: Zustand[] = [
    { fett: false, kursiv: false, unterstrichen: false, uc: 1, ueberspringen: false },
  ];
  const z = (): Zustand => stapel.at(-1) as Zustand;
  let geradeGeoeffnet = false;
  let nochUeberspringen = 0;
  let verworfen = 0;
  let bilder = 0;
  const zeichen = (t: string): void => {
    if (z().ueberspringen) return;
    if (nochUeberspringen > 0) {
      nochUeberspringen -= 1;
      return;
    }
    aus.text(t, z());
  };
  let i = 0;
  while (i < s.length) {
    const c = s.charAt(i);
    if (c === '{') {
      stapel.push({ ...z() });
      geradeGeoeffnet = true;
      i += 1;
      continue;
    }
    if (c === '}') {
      if (stapel.length > 1) stapel.pop();
      geradeGeoeffnet = false;
      i += 1;
      continue;
    }
    const ersterInGruppe = geradeGeoeffnet;
    geradeGeoeffnet = false;
    if (c === '\n' || c === '\r') {
      i += 1;
      continue;
    }
    if (c !== '\\') {
      zeichen(c);
      i += 1;
      continue;
    }
    // Steuerzeichen oder Steuerwort
    const n = s.charAt(i + 1);
    if (/[A-Za-z]/.test(n)) {
      const m = /^([A-Za-z]+)(-?[0-9]+)?( )?/.exec(s.slice(i + 1, i + 40)) as RegExpExecArray;
      const wort = m[1] ?? '';
      const zahl = m[2] === undefined ? null : Number(m[2]);
      i += 1 + m[0].length;
      const st = z();
      if (ersterInGruppe && UEBERSPRINGEN.has(wort)) {
        st.ueberspringen = true;
        continue;
      }
      if (wort === 'pict' || wort === 'shppict' || wort === 'nonshppict') {
        if (!st.ueberspringen && wort === 'pict') bilder += 1;
        st.ueberspringen = true;
        continue;
      }
      if (st.ueberspringen) continue;
      switch (wort) {
        case 'par':
        case 'sect':
        case 'page':
          aus.absatz();
          break;
        case 'line':
          aus.umbruch();
          break;
        case 'b':
          st.fett = zahl !== 0;
          break;
        case 'i':
          st.kursiv = zahl !== 0;
          break;
        case 'ul':
          st.unterstrichen = zahl !== 0;
          break;
        case 'ulnone':
          st.unterstrichen = false;
          break;
        case 'plain':
          st.fett = false;
          st.kursiv = false;
          st.unterstrichen = false;
          break;
        case 'uc':
          st.uc = zahl ?? 1;
          break;
        case 'u':
          if (zahl !== null) {
            aus.text(String.fromCharCode(zahl < 0 ? zahl + 65536 : zahl), st);
            nochUeberspringen = st.uc;
          }
          break;
        case 'cell':
          verworfen += 1;
          zeichen(' ');
          break;
        case 'row':
          verworfen += 1;
          aus.absatz();
          break;
        default: {
          const sonder = ZEICHEN[wort];
          if (sonder !== undefined) zeichen(sonder);
          else if (!STILL.has(wort)) verworfen += 1;
        }
      }
      continue;
    }
    i += 2;
    switch (n) {
      case "'": {
        const hex = s.slice(i, i + 2);
        i += 2;
        if (/^[0-9A-Fa-f]{2}$/.test(hex)) zeichen(ansiZeichen(parseInt(hex, 16)));
        break;
      }
      case '*':
        if (ersterInGruppe) z().ueberspringen = true;
        break;
      case '~':
        zeichen(' ');
        break;
      case '_':
        zeichen('-');
        break;
      case '-':
        break;
      case '\n':
        if (!z().ueberspringen) aus.absatz();
        break;
      case '':
        break;
      default:
        // `\\`, `\{`, `\}` und andere Steuerzeichen: das Zeichen selbst.
        zeichen(n);
    }
  }
  aus.absatz();
  return { absaetze: aus.absaetze, verworfen, bilder };
}

/**
 * Einfacher Text (GAEB 2000 1.0): Einrückungen am Zeilenanfang fallen weg (Gestaltung der Datei), aufeinanderfolgende Zeilen
 * sind ein Absatz mit Zeilenumbrüchen, eine leere Zeile beginnt einen neuen Absatz (wie bei GAEB 90).
 */
export function klartextLesen(roh: string): Textinhalt {
  const aus = new Sammler();
  const z: Zustand = { fett: false, kursiv: false, unterstrichen: false, uc: 1, ueberspringen: false };
  let leer = true;
  for (const zeile of roh.split(/\r\n|\n|\r/).map((t) => t.trim())) {
    if (zeile === '') {
      aus.absatz();
      leer = true;
      continue;
    }
    if (!leer) aus.umbruch();
    aus.text(zeile, z);
    leer = false;
  }
  aus.absatz();
  return { absaetze: aus.absaetze, verworfen: 0, bilder: 0 };
}

/** Ein Wert als Text: RTF oder einfacher Text. */
export const textinhalt = (wert: string): Textinhalt => (istRtf(wert) ? rtfLesen(wert) : klartextLesen(wert));
