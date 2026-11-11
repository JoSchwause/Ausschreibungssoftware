// SPDX-License-Identifier: AGPL-3.0-or-later
// Kleine SpreadsheetML-Schicht (D-25): ein Arbeitsblatt schreiben (feste Stile, Spaltenbreiten, fixierte Kopfzeilen,
// Zellschutz) und Zellwerte des ersten Arbeitsblatts lesen (Shared Strings, Inline Strings, Zahlen). ZIP über `fflate`.
// Fachfrei: Was in den Zellen steht, entscheidet `excel.ts`. Bytes rein, Bytes raus; gleiche Eingabe, gleiche Bytes.

import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { Zippable } from 'fflate';

// --- Schreiben ---------------------------------------------------------------------------------------------------

/** Feste Zellstile (Index in `cellXfs` von `styles.xml`). */
export const STIL = {
  standard: 0,
  kopf: 1,
  titel: 2,
  text: 3,
  menge: 4,
  eingabePreis: 5,
  betrag: 6,
  eingabeSatz: 7,
  textUmbruch: 8,
} as const;
export type Stil = (typeof STIL)[keyof typeof STIL];

export type Zellwert =
  | { readonly art: 'text'; readonly text: string }
  /** Zahl in Punktnotation (z. B. `12.500`), wird ohne Umweg über `number` geschrieben. */
  | { readonly art: 'zahl'; readonly dezimal: string }
  /** Formel ohne führendes `=`, in englischer Schreibweise (`ROUND(D4*F4,2)`). */
  | { readonly art: 'formel'; readonly formel: string };

export interface Zelle {
  readonly wert: Zellwert | null;
  readonly stil: Stil;
}

export interface Spalte {
  /** Breite in Zeichen. */
  readonly breite: number;
  readonly versteckt?: boolean;
}

export interface Blatt {
  readonly name: string;
  readonly spalten: readonly Spalte[];
  /** Zeilen von oben; `null` in einer Zeile ist eine leere Zelle ohne Stil. */
  readonly zeilen: readonly (readonly (Zelle | null)[])[];
  /** Anzahl der Zeilen oben, die beim Rollen stehen bleiben. */
  readonly fixierteZeilen: number;
  /** Blattschutz ohne Kennwort: Gesperrt sind alle Zellen, deren Stil nicht entsperrt ist. */
  readonly geschuetzt: boolean;
}

export interface Dokumenteigenschaften {
  readonly titel: string;
  /** Erstellungs- und Änderungszeitpunkt (`JJJJ-MM-TT`); bestimmt auch die Zeitstempel im ZIP. */
  readonly datum: string;
}

/** Spaltenbuchstaben zu einem 0-basierten Index (`0` → `A`, `26` → `AA`). */
export function spaltenname(index: number): string {
  let n = index + 1;
  let name = '';
  while (n > 0) {
    const rest = (n - 1) % 26;
    name = String.fromCharCode(65 + rest) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

/** Ungültige XML-Zeichen und das Escape-Muster `_xHHHH_` selbst schreibt SpreadsheetML als `_xHHHH_`. */
function textKodieren(text: string): string {
  return text
    .replace(/_x[0-9A-Fa-f]{4}_/g, (m) => `_x005F${m.slice(1)}`)
    .replace(
      // eslint-disable-next-line no-control-regex
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g,
      (z) => `_x${z.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}_`,
    );
}

function xml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Zahl ohne überflüssige Nachkommanullen (`12.500` → `12.5`, `3.000` → `3`). */
function zahlText(dezimal: string): string {
  if (!/^-?[0-9]+(\.[0-9]+)?$/.test(dezimal))
    throw new TypeError(`Keine Dezimalzahl: ${JSON.stringify(dezimal)}`);
  const ohne = dezimal.includes('.') ? dezimal.replace(/0+$/, '').replace(/\.$/, '') : dezimal;
  return ohne === '-0' ? '0' : ohne;
}

function zelleXml(z: Zelle, ref: string): string {
  const s = z.stil === STIL.standard ? '' : ` s="${String(z.stil)}"`;
  const w = z.wert;
  if (w === null) return `<c r="${ref}"${s}/>`;
  switch (w.art) {
    case 'text': {
      const t = textKodieren(w.text);
      const raum = /^\s|\s$|\n/.test(t) ? ' xml:space="preserve"' : '';
      return `<c r="${ref}"${s} t="inlineStr"><is><t${raum}>${xml(t)}</t></is></c>`;
    }
    case 'zahl':
      return `<c r="${ref}"${s}><v>${zahlText(w.dezimal)}</v></c>`;
    case 'formel':
      return `<c r="${ref}"${s}><f>${xml(w.formel)}</f></c>`;
  }
}

function blattXml(blatt: Blatt): string {
  const spalten = blatt.spalten
    .map((sp, i) => {
      const n = String(i + 1);
      const versteckt = sp.versteckt === true ? ' hidden="1"' : '';
      return `<col min="${n}" max="${n}" width="${String(sp.breite)}"${versteckt} customWidth="1"/>`;
    })
    .join('');
  const zeilen = blatt.zeilen
    .map((zeile, zi) => {
      const r = String(zi + 1);
      const zellen = zeile.map((z, si) => (z === null ? '' : zelleXml(z, `${spaltenname(si)}${r}`))).join('');
      return `<row r="${r}">${zellen}</row>`;
    })
    .join('');
  const f = blatt.fixierteZeilen;
  const ansicht =
    f > 0
      ? `<sheetView workbookViewId="0"><pane ySplit="${String(f)}" topLeftCell="A${String(f + 1)}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${String(f + 1)}" sqref="A${String(f + 1)}"/></sheetView>`
      : '<sheetView workbookViewId="0"/>';
  const schutz = blatt.geschuetzt
    ? '<sheetProtection sheet="1" objects="1" scenarios="1" formatColumns="0" formatRows="0"/>'
    : '';
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheetViews>${ansicht}</sheetViews>` +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    `<cols>${spalten}</cols>` +
    `<sheetData>${zeilen}</sheetData>` +
    schutz +
    '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>' +
    '</worksheet>'
  );
}

/**
 * Feste Stile in der Reihenfolge von `STIL`. Eingabezellen (`eingabePreis`, `eingabeSatz`) sind entsperrt und
 * hinterlegt; alle anderen sind gesperrt (Vorgabe von SpreadsheetML).
 */
const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="3">' +
  '<numFmt numFmtId="164" formatCode="#,##0.000"/>' +
  '<numFmt numFmtId="165" formatCode="#,##0.00"/>' +
  '<numFmt numFmtId="166" formatCode="0.00"/>' +
  '</numFmts>' +
  '<fonts count="2">' +
  '<font><sz val="10"/><name val="Arial"/><family val="2"/></font>' +
  '<font><b/><sz val="10"/><name val="Arial"/><family val="2"/></font>' +
  '</fonts>' +
  '<fills count="4">' +
  '<fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/><bgColor indexed="64"/></patternFill></fill>' +
  '</fills>' +
  '<borders count="2">' +
  '<border><left/><right/><top/><bottom/><diagonal/></border>' +
  '<border><left/><right/><top/><bottom style="thin"><color auto="1"/></bottom><diagonal/></border>' +
  '</borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="9">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment wrapText="1"/></xf>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="164" fontId="0" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1" applyProtection="1"><protection locked="0"/></xf>' +
  '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="166" fontId="0" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1" applyProtection="1"><protection locked="0"/></xf>' +
  '<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>' +
  '</cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Standard" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>';

const CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
  '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
  '</Types>';

const ROOT_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
  '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
  '</Relationships>';

const WORKBOOK_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '</Relationships>';

function workbookXml(blattname: string): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<bookViews><workbookView/></bookViews>' +
    `<sheets><sheet name="${xml(blattname)}" sheetId="1" r:id="rId1"/></sheets>` +
    '<calcPr calcId="191029" fullCalcOnLoad="1"/>' +
    '</workbook>'
  );
}

function coreXml(e: Dokumenteigenschaften): string {
  const zeit = `${e.datum}T00:00:00Z`;
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    `<dc:title>${xml(textKodieren(e.titel))}</dc:title>` +
    '<dc:creator>Tethys</dc:creator>' +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${zeit}</dcterms:created>` +
    `<dcterms:modified xsi:type="dcterms:W3CDTF">${zeit}</dcterms:modified>` +
    '</cp:coreProperties>'
  );
}

const APP_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Tethys</Application></Properties>';

/** `JJJJ-MM-TT` als lokale Mitternacht: fflate schreibt die DOS-Zeit aus den lokalen Feldern des `Date`. */
function zipZeit(datum: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datum);
  if (!m) throw new RangeError(`Datum muss JJJJ-MM-TT sein: ${JSON.stringify(datum)}`);
  const jahr = Number(m[1]);
  if (jahr < 1980 || jahr > 2099) throw new RangeError(`ZIP kann nur 1980–2099 darstellen: ${datum}`);
  return new Date(jahr, Number(m[2]) - 1, Number(m[3]));
}

/** Schreibt eine Arbeitsmappe mit genau einem Blatt. Gleiche Eingabe, gleiche Bytes. */
export function schreibeXlsx(blatt: Blatt, eigenschaften: Dokumenteigenschaften): Uint8Array {
  const mtime = zipZeit(eigenschaften.datum);
  const datei = (text: string): [Uint8Array, { mtime: Date; level: 6 }] => [
    strToU8(text),
    { mtime, level: 6 },
  ];
  const teile: Zippable = {
    '[Content_Types].xml': datei(CONTENT_TYPES),
    '_rels/.rels': datei(ROOT_RELS),
    'docProps/core.xml': datei(coreXml(eigenschaften)),
    'docProps/app.xml': datei(APP_XML),
    'xl/workbook.xml': datei(workbookXml(blatt.name)),
    'xl/_rels/workbook.xml.rels': datei(WORKBOOK_RELS),
    'xl/styles.xml': datei(STYLES_XML),
    'xl/worksheets/sheet1.xml': datei(blattXml(blatt)),
  };
  return zipSync(teile);
}

// --- Lesen -------------------------------------------------------------------------------------------------------

interface Element {
  readonly name: string;
  readonly attribute: ReadonlyMap<string, string>;
  readonly kinder: (Element | string)[];
}

const ENTITAETEN: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };

function entitaetenAufloesen(text: string): string {
  return text.replace(/&(#x[0-9A-Fa-f]+|#[0-9]+|[a-z]+);/g, (m, e: string) => {
    if (e.startsWith('#x')) return String.fromCodePoint(parseInt(e.slice(2), 16));
    if (e.startsWith('#')) return String.fromCodePoint(parseInt(e.slice(1), 10));
    return ENTITAETEN[e] ?? m;
  });
}

/** Lokaler Name ohne Namensraum-Präfix (`x:c` → `c`). */
const lokal = (name: string): string => name.slice(name.indexOf(':') + 1);

/** Kleiner, toleranter XML-Leser für die wenigen Teile einer Arbeitsmappe. Wirft bei grob kaputtem XML. */
function parseXml(text: string): Element {
  const wurzel: Element = { name: '#dokument', attribute: new Map(), kinder: [] };
  const stapel: Element[] = [wurzel];
  const muster =
    /<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<(\/?)([^\s/>]+)([^>]*?)(\/?)>|([^<]+)/g;
  const attr = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  for (const m of text.matchAll(muster)) {
    const oben = stapel[stapel.length - 1];
    if (oben === undefined) throw new Error('XML: zu viele schließende Elemente.');
    const [, cdata, schliessend, name, attributeText, selbst, textteil] = m;
    if (cdata !== undefined) oben.kinder.push(cdata);
    else if (textteil !== undefined) oben.kinder.push(entitaetenAufloesen(textteil));
    else if (name !== undefined) {
      if (schliessend === '/') {
        if (stapel.length <= 1 || lokal(oben.name) !== lokal(name))
          throw new Error(`XML: </${name}> passt nicht zu <${oben.name}>.`);
        stapel.pop();
      } else {
        const attribute = new Map<string, string>();
        for (const a of (attributeText ?? '').matchAll(attr))
          attribute.set(lokal(a[1] ?? ''), entitaetenAufloesen(a[2] ?? a[3] ?? ''));
        const el: Element = { name: lokal(name), attribute, kinder: [] };
        oben.kinder.push(el);
        if (selbst !== '/') stapel.push(el);
      }
    }
  }
  if (stapel.length !== 1) throw new Error('XML: Element nicht geschlossen.');
  return wurzel;
}

const elemente = (e: Element, name: string): Element[] =>
  e.kinder.filter((k): k is Element => typeof k !== 'string' && k.name === name);
const erstes = (e: Element, name: string): Element | undefined => elemente(e, name)[0];

function suche(e: Element, name: string): Element | undefined {
  for (const k of e.kinder) {
    if (typeof k === 'string') continue;
    if (k.name === name) return k;
    const t = suche(k, name);
    if (t) return t;
  }
  return undefined;
}

function textInhalt(e: Element): string {
  return e.kinder.map((k) => (typeof k === 'string' ? k : textInhalt(k))).join('');
}

/** `_xHHHH_` zurück in das Zeichen (Gegenstück zu `textKodieren`). */
function textDekodieren(text: string): string {
  return text.replace(/_x([0-9A-Fa-f]{4})_/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
}

/** Text eines `si` bzw. `is`: `<t>` direkt oder die `<t>` der Läufe `<r>`; Lautschrift (`rPh`) zählt nicht. */
function zeichenkette(e: Element): string {
  const t = erstes(e, 't');
  if (t) return textDekodieren(textInhalt(t));
  return elemente(e, 'r')
    .map((r) => {
      const rt = erstes(r, 't');
      return rt ? textDekodieren(textInhalt(rt)) : '';
    })
    .join('');
}

export type GelesenerWert =
  | { readonly art: 'text'; readonly text: string }
  /** Der Zahltext so, wie er in der Datei steht (`18.440999999999999`, `1E-3`). */
  | { readonly art: 'zahl'; readonly text: string }
  | { readonly art: 'wahrheitswert'; readonly text: string }
  | { readonly art: 'fehler'; readonly text: string }
  /** Nur bei einer Formel ohne gespeichertes Ergebnis. */
  | { readonly art: 'leer' };

export interface GeleseneZelle {
  /** 1-basiert wie in der Tabelle. */
  readonly zeile: number;
  /** 0-basiert (`A` = 0). */
  readonly spalte: number;
  readonly wert: GelesenerWert;
  /** Die Zelle trägt eine Formel; `wert` ist ihr zuletzt berechnetes Ergebnis. */
  readonly formel: boolean;
}

export type XlsxLesung =
  | { readonly ok: true; readonly zeilen: ReadonlyMap<number, ReadonlyMap<number, GeleseneZelle>> }
  | { readonly ok: false; readonly meldung: string };

function spalteAusRef(ref: string): { spalte: number; zeile: number } | null {
  const m = /^\$?([A-Za-z]{1,3})\$?([0-9]+)$/.exec(ref);
  if (!m) return null;
  let spalte = 0;
  for (const z of (m[1] ?? '').toUpperCase()) spalte = spalte * 26 + (z.charCodeAt(0) - 64);
  return { spalte: spalte - 1, zeile: Number(m[2]) };
}

/** Pfad eines Ziels relativ zu `xl/` auflösen (`worksheets/sheet1.xml`, `/xl/worksheets/sheet1.xml`). */
function zielpfad(ziel: string): string {
  if (ziel.startsWith('/')) return ziel.slice(1);
  const teile: string[] = ['xl'];
  for (const t of ziel.split('/')) {
    if (t === '..') teile.pop();
    else if (t !== '.' && t !== '') teile.push(t);
  }
  return teile.join('/');
}

function erstesBlattPfad(dateien: Record<string, Uint8Array>): string | null {
  const wb = dateien['xl/workbook.xml'];
  const rels = dateien['xl/_rels/workbook.xml.rels'];
  if (wb && rels) {
    const blatt = suche(parseXml(strFromU8(wb)), 'sheet');
    const id = blatt?.attribute.get('id');
    const rel = elemente(
      suche(parseXml(strFromU8(rels)), 'Relationships') ?? parseXml(''),
      'Relationship',
    ).find((r) => r.attribute.get('Id') === id);
    const ziel = rel?.attribute.get('Target');
    if (ziel !== undefined && dateien[zielpfad(ziel)]) return zielpfad(ziel);
  }
  return dateien['xl/worksheets/sheet1.xml'] ? 'xl/worksheets/sheet1.xml' : null;
}

/** Liest die Zellwerte des ersten Arbeitsblatts. Leere Zellen fehlen in der Lesung. */
export function leseXlsx(bytes: Uint8Array): XlsxLesung {
  let dateien: Record<string, Uint8Array>;
  try {
    dateien = unzipSync(bytes);
  } catch {
    return { ok: false, meldung: 'Die Datei ist kein ZIP-Archiv (keine .xlsx-Datei).' };
  }
  try {
    const pfad = erstesBlattPfad(dateien);
    const blattBytes = pfad === null ? undefined : dateien[pfad];
    if (blattBytes === undefined) return { ok: false, meldung: 'Die Datei enthält kein Arbeitsblatt.' };
    const sstBytes = dateien['xl/sharedStrings.xml'];
    const sst = sstBytes
      ? elemente(suche(parseXml(strFromU8(sstBytes)), 'sst') ?? parseXml(''), 'si').map(zeichenkette)
      : [];
    const daten = suche(parseXml(strFromU8(blattBytes)), 'sheetData');
    const zeilen = new Map<number, Map<number, GeleseneZelle>>();
    let letzteZeile = 0;
    for (const row of daten ? elemente(daten, 'row') : []) {
      const r = row.attribute.get('r');
      const zeile = r === undefined ? letzteZeile + 1 : Number(r);
      letzteZeile = zeile;
      const zellen = new Map<number, GeleseneZelle>();
      let letzteSpalte = -1;
      for (const c of elemente(row, 'c')) {
        const ref = c.attribute.get('r');
        const ort = ref === undefined ? null : spalteAusRef(ref);
        const spalte = ort === null ? letzteSpalte + 1 : ort.spalte;
        letzteSpalte = spalte;
        const typ = c.attribute.get('t') ?? 'n';
        const v = erstes(c, 'v');
        const vText = v ? textInhalt(v) : undefined;
        const formel = erstes(c, 'f') !== undefined;
        let wert: GelesenerWert | null = null;
        if (typ === 'inlineStr') {
          const is = erstes(c, 'is');
          wert = { art: 'text', text: is ? zeichenkette(is) : '' };
        } else if (vText === undefined) wert = formel ? { art: 'leer' } : null;
        else if (typ === 's') wert = { art: 'text', text: sst[Number(vText)] ?? '' };
        else if (typ === 'str' || typ === 'd') wert = { art: 'text', text: textDekodieren(vText) };
        else if (typ === 'b') wert = { art: 'wahrheitswert', text: vText };
        else if (typ === 'e') wert = { art: 'fehler', text: vText };
        else wert = { art: 'zahl', text: vText.trim() };
        if (wert !== null) zellen.set(spalte, { zeile, spalte, wert, formel });
      }
      zeilen.set(zeile, zellen);
    }
    return { ok: true, zeilen };
  } catch (e) {
    return {
      ok: false,
      meldung: `Die Arbeitsmappe ist nicht lesbar: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/**
 * Den Zahltext einer Zelle als Dezimalzahl in Punktnotation, wie Excel sie meint: Exponenten werden aufgelöst, und
 * ein Text mit mehr als 15 geltenden Ziffern wird auf 15 gebracht, weil Excel nur 15 Ziffern hält und die
 * restlichen nur das Abbild der Gleitkommazahl sind (`18.440999999999999` → `18.441`). `null`: keine Zahl.
 */
export function excelZahl(text: string): string | null {
  const m = /^([+-]?)([0-9]*)(?:\.([0-9]*))?(?:[eE]([+-]?[0-9]+))?$/.exec(text.trim());
  if (!m || ((m[2] ?? '') === '' && (m[3] ?? '') === '')) return null;
  const minus = m[1] === '-';
  const ganz = m[2] ?? '';
  const nach = m[3] ?? '';
  const exponent = Number(m[4] ?? '0');
  if (Math.abs(exponent) > 400) return null;
  // Ziffern ohne Komma; der Wert ist ziffern × 10^(-stellen).
  let ziffern = (ganz + nach).replace(/^0+/, '');
  let stellen = nach.length - exponent;
  if (ziffern === '') return '0';
  if (ziffern.length > 15) {
    const weg = ziffern.length - 15;
    const kopf = BigInt(ziffern.slice(0, 15));
    const auf = Number(ziffern[15]) >= 5 ? 1n : 0n;
    ziffern = (kopf + auf).toString() + '0'.repeat(weg);
  }
  // Nachkommanullen entfernen.
  while (stellen > 0 && ziffern.endsWith('0')) {
    ziffern = ziffern.slice(0, -1);
    stellen--;
  }
  if (stellen < 0) {
    ziffern += '0'.repeat(-stellen);
    stellen = 0;
  }
  const voll = ziffern.padStart(stellen + 1, '0');
  const text2 =
    stellen === 0 ? voll : `${voll.slice(0, voll.length - stellen)}.${voll.slice(voll.length - stellen)}`;
  return minus && /[1-9]/.test(text2) ? `-${text2}` : text2;
}
