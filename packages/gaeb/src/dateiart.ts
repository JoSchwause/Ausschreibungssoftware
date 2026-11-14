// SPDX-License-Identifier: AGPL-3.0-or-later
// Dateiart am Inhalt erkennen (Ticket 136, E7, B-11): GAEB DA XML (mit Version und Phase), GAEB 90, GAEB 2000 oder unbekannt,
// dazu die Kodierung. Die Dateiendung ist nur ein Hinweis auf die Phase, nie auf die Art. Rein (A2), ohne XML-Parser: Für DA XML
// genügt der Anfang der Datei (Wurzelelement, `GAEBInfo/Version`, `Award/DP`); dieselben Regeln wie der Leser
// (`erkennung.ts`).
//
// Merkmale der beiden älteren Formate (eigene Worte, Lesart D-136.2; die Leser kommen später):
// - GAEB 90: Sätze fester Länge (80 Zeichen je Zeile), jeder beginnt mit der zweistelligen Satzart und endet mit der
//   Satznummer; der erste Satz ist der Eröffnungssatz `00` oder `T0`. Die Phase (Datenart) steht im Satz `00` in den Stellen
//   11 und 12, sonst gilt die Endung (`.d83` → X83). Berichtigt nach der Formatbeschreibung in Ticket 144 (D-144.1).
// - GAEB 2000: Schlüsselwortformat, Abschnitte als `#begin[Name]` … `#end[Name]`, Werte als `[Name]Wert[end]`; die Phase steht
//   in `[DP]`, sonst gilt die Endung (`.p83` → X83).

import type { GaebFormat, GaebPhase } from '@tethys/vertrag';
import { PHASEN, erkenneKopf, phaseAusEndung } from './erkennung';
import type { Kopfangaben, Phasenquelle } from './erkennung';
import { dekodiereBytes } from './kodierung';
import { schaetzeZeichensatz } from './zeichensatz';

export type { Phasenquelle } from './erkennung';

/** Was eine Datei ist, am Inhalt erkannt. */
export interface GaebDateiart {
  /** `null`: weder GAEB DA XML noch GAEB 90 noch GAEB 2000 (auch XML mit einem anderen Wurzelelement). */
  readonly format: GaebFormat | null;
  /**
   * DA XML: die Version im Wortlaut der Datei (`3.3`, `3.1`, auch nicht gelesene wie `3.0`), `null`: keine Angabe. GAEB 90
   * und GAEB 2000 haben keine DA-XML-Version (`null`, wie `GaebLesung.version`).
   */
  readonly version: string | null;
  readonly phase: GaebPhase | null;
  /** `inhalt`: aus Namensraum, `Award/DP` oder `[DP]`; `endung`: nur aus der Dateiendung (ein Hinweis). */
  readonly phasenquelle: Phasenquelle | null;
  /**
   * Kodierung der Bytes: DA XML wie der Leser (`utf-8`, `utf-16le`, `utf-16be`, die deklarierte wie `iso-8859-1`, oder
   * `windows-1252` für ungültiges UTF-8); GAEB 90, GAEB 2000 und unbekannt am Inhalt geschätzt: `ascii` (nur 7 Bit),
   * `utf-8`, `cp850` (DOS-Codepage 437/850, Umlaute zwischen 0x80 und 0x9A) oder `iso-8859-1`. `null` bei Text als Eingabe.
   */
  readonly kodierung: string | null;
}

/** So viel vom Anfang der Datei sieht die Erkennung an. Die Kopfangaben stehen in jeder bekannten Datei weit davor. */
const KOPF_ZEICHEN = 64 * 1024;
/** Satzlänge von GAEB 90. */
const SATZLAENGE = 80;

const UNBEKANNT = { format: null, version: null, phase: null, phasenquelle: null } as const;

/** Der Anfang des Texts ohne Byte-Order-Mark, ohne den ganzen Text zu kopieren. */
const kopfVon = (text: string): string => {
  const start = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  return text.slice(start, start + KOPF_ZEICHEN);
};

/** Beginnt der Text (nach Leerraum) mit `<`? Dann liest ihn der XML-Weg (DA XML oder ein fremdes XML). */
export const siehtAusWieXml = (text: string): boolean => /^\s*</.test(kopfVon(text));

// --- DA XML ---------------------------------------------------------------------------------------------------

const PROLOG = /^\s*(?:<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE[^>[]*(?:\[[\s\S]*?\])?\s*>)/;
const START_TAG = /^\s*<([A-Za-z_][\w.:-]*)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*\/?>/;
const ATTRIBUT = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const VERSION = /<(?:[\w.-]+:)?Version\s*>([^<]*)</;
const DP = /<(?:[\w.-]+:)?DP\s*>([^<]*)</;

/** Kopfangaben aus dem Anfang einer XML-Datei; `null`: kein Wurzelelement `GAEB`. */
function xmlKopf(kopf: string): Kopfangaben | null {
  let rest = kopf;
  for (let m = PROLOG.exec(rest); m !== null; m = PROLOG.exec(rest)) rest = rest.slice(m[0].length);
  const start = START_TAG.exec(rest);
  if (!start) return null;
  const qname = start[1] ?? '';
  const k = qname.indexOf(':');
  if ((k < 0 ? qname : qname.slice(k + 1)) !== 'GAEB') return null;
  const nsAttribut = k < 0 ? 'xmlns' : `xmlns:${qname.slice(0, k)}`;
  let namensraum: string | null = null;
  for (const a of (start[2] ?? '').matchAll(ATTRIBUT))
    if (a[1] === nsAttribut) namensraum = a[2] ?? a[3] ?? '';
  const version = VERSION.exec(rest)?.[1]?.trim() ?? null;
  const dp = DP.exec(rest)?.[1]?.trim() ?? null;
  return { namensraum, infoVersion: version === '' ? null : version, dp };
}

// --- GAEB 90 und GAEB 2000 --------------------------------------------------------------------------------------

/** Das Zeichen, mit dem DOS-Dateien enden können (Strg+Z). */
const DOS_ENDE = String.fromCharCode(0x1a);

/** Die Zeilen des Anfangs; eine vom Abschneiden zerteilte letzte Zeile, Leerzeilen am Ende und ein DOS-Dateiende fallen weg. */
function zeilen(kopf: string, abgeschnitten: boolean): string[] {
  const z = kopf.split(/\r\n|\n|\r/);
  if (abgeschnitten) z.pop();
  while (z.length > 0 && (z.at(-1) ?? '').replaceAll(DOS_ENDE, '').trim() === '') z.pop();
  return z;
}

/**
 * GAEB 90 (Lesart D-144.1 nach der Formatbeschreibung, berichtigt D-136.2): Die Datei beginnt mit dem Eröffnungssatz `00` oder
 * mit `T0` (vertragliche Regelungen davor); jede Zeile beginnt mit der Satzart (zwei Ziffern oder `T` und eine Ziffer), keine
 * ist länger als 80 Zeichen, und fast alle sind genau 80 Zeichen lang mit der sechsstelligen Satznummer in den Stellen 75 bis 80.
 */
function istGaeb90(z: readonly string[]): boolean {
  const erste = z[0] ?? '';
  if (!erste.startsWith('00') && !erste.startsWith('T0')) return false;
  if (!z.every((s) => s.length <= SATZLAENGE && /^(?:[0-9]{2}|T[0-9])/.test(s))) return false;
  const voll = z.filter((s) => s.length === SATZLAENGE && /^[0-9]{6}$/.test(s.slice(74))).length;
  return voll * 5 >= z.length * 4;
}

/** GAEB 90: die Datenart (Phase) in den Stellen 11 und 12 des Eröffnungssatzes `00`, z. B. `83`. */
function datenart90(z: readonly string[]): GaebPhase | null {
  const kopf = z.find((s) => s.startsWith('00'));
  const da = kopf?.slice(10, 12) ?? '';
  const phase = /^[0-9]{2}$/.test(da) ? `X${da}` : '';
  return PHASEN.has(phase as GaebPhase) ? (phase as GaebPhase) : null;
}

/** GAEB 2000: die erste Zeile öffnet einen Abschnitt `#begin[…]`. */
const istGaeb2000 = (z: readonly string[]): boolean => /^\s*#begin\[[A-Za-z0-9]+\]/.test(z[0] ?? '');

const DP_2000 = /\[DP\]\s*([0-9]{2})/;

// --- Einstieg ---------------------------------------------------------------------------------------------------

/**
 * Die Dateiart aus dem schon dekodierten Text (für den Vorlauf der Leser, ohne zweites Dekodieren). `bytes` und
 * `kodierung` (die des Dekodierens) fehlen, wenn die Eingabe Text war.
 */
export function dateiartAusText(
  text: string,
  dateiname: string | undefined,
  bytes: Uint8Array | null,
  kodierung: string | null,
): GaebDateiart {
  const kopf = kopfVon(text);
  if (/^\s*</.test(kopf)) {
    const k = xmlKopf(kopf);
    if (k === null) return { ...UNBEKANNT, kodierung };
    const e = erkenneKopf(k, dateiname);
    return {
      format: 'da-xml',
      version: e.versionText,
      phase: e.phase,
      phasenquelle: e.phasenquelle,
      kodierung,
    };
  }
  const geschaetzt =
    bytes === null ? null : kodierung?.startsWith('utf-16') === true ? kodierung : schaetzeZeichensatz(bytes);
  const z = zeilen(kopf, text.length - (text.charCodeAt(0) === 0xfeff ? 1 : 0) > KOPF_ZEICHEN);
  const endung = phaseAusEndung(dateiname);
  const nachEndung = { phase: endung, phasenquelle: endung === null ? null : ('endung' as const) };
  if (istGaeb2000(z)) {
    const dp = DP_2000.exec(kopf)?.[1];
    const phase = dp === undefined ? null : `X${dp}`;
    const ausInhalt =
      phase !== null && PHASEN.has(phase as GaebPhase)
        ? { phase: phase as GaebPhase, phasenquelle: 'inhalt' as const }
        : nachEndung;
    return { format: 'gaeb-2000', version: null, ...ausInhalt, kodierung: geschaetzt };
  }
  if (istGaeb90(z)) {
    const da = datenart90(z);
    const phase = da === null ? nachEndung : { phase: da, phasenquelle: 'inhalt' as const };
    return { format: 'gaeb-90', version: null, ...phase, kodierung: geschaetzt };
  }
  return { ...UNBEKANNT, kodierung: geschaetzt };
}

/**
 * Erkennt am Inhalt, was eine Datei ist: GAEB DA XML (Version und Phase wie der Leser), GAEB 90, GAEB 2000 oder unbekannt,
 * dazu die Kodierung. Die Endung (`dateiname`) ist nur ein Hinweis auf die Phase, wenn der Inhalt keine nennt. Wirft nie.
 */
export function erkenneGaebDatei(eingabe: Uint8Array | string, dateiname?: string): GaebDateiart {
  if (typeof eingabe === 'string') return dateiartAusText(eingabe, dateiname, null, null);
  const d = dekodiereBytes(eingabe);
  return dateiartAusText(d.text, dateiname, eingabe, d.kodierung);
}
