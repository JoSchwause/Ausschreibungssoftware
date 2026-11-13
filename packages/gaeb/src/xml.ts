// SPDX-License-Identifier: AGPL-3.0-or-later
// Eigener, kleiner XML-Leser für GAEB (Ticket 22). Rein (A2): Eingabe ist ein String, kein DOM, kein I/O.
//
// Entscheidung gegen eine Bibliothek: Gebraucht wird genau das, was GAEB-Dateien in der Praxis brauchen und was
// übliche Parser nicht bieten: Wiederherstellung nach ungeschlossenen Tags, Zeile/Spalte je Element, harte
// Sicherheitsgrenzen ohne Konfigurationsrisiko (keine DTD, keine Entitäten außer den fünf vordefinierten und
// Zeichenreferenzen) und null Abhängigkeiten.
//
// Sicherheit:
// - Ein DOCTYPE mit `<!ENTITY` (intern, extern, Parameter-Entität) lässt die Datei zurückweisen; es wird nichts
//   aufgelöst und nichts geladen. Ein DOCTYPE ohne Entitäten wird mit Warnung überlesen.
// - Unbekannte Entitäten bleiben als Text stehen (keine Expansion, also kein Billion Laughs).
// - Verschachtelungstiefe ist begrenzt (`maxTiefe`), die Größe prüft der Aufrufer vor dem Dekodieren.
// - Die Zahl der Befunde ist begrenzt, damit eine Datei voller Fehler keinen Speicher frisst.
//
// Toleranz: ungeschlossene Elemente, unerwartete Schließ-Tags, fehlende Anführungszeichen, bare `&` und
// abgeschnittene Dateien ergeben Befunde, der bis dahin gelesene Baum bleibt erhalten.

import type { Befundort } from '@tethys/vertrag';
import type { GaebBefund, GaebBefundcode } from './befunde';

export interface XmlElement {
  /** Lokaler Name ohne Präfix. */
  readonly name: string;
  /** Name wie in der Datei (mit Präfix). */
  readonly qname: string;
  readonly attrs: ReadonlyMap<string, string>;
  readonly children: readonly XmlNode[];
  readonly parent: XmlElement | null;
  /** Position des `<` in der Eingabe (UTF-16-Einheiten); für `XmlErgebnis.ortVon`. */
  readonly offset: number;
}

/** Kindknoten: Element oder Text (Entitäten aufgelöst). */
export type XmlNode = XmlElement | string;

export interface XmlOptionen {
  /** Größte erlaubte Verschachtelungstiefe. Voreinstellung 100. */
  readonly maxTiefe?: number;
  /** Elemente mit reinem Textinhalt: ein weiteres öffnendes Tag schließt sie (Wiederherstellung). */
  readonly blattNamen?: ReadonlySet<string>;
}

export interface XmlErgebnis {
  readonly wurzel: XmlElement | null;
  readonly befunde: readonly GaebBefund[];
  /** `true`: Die Datei wurde aus Sicherheitsgründen zurückgewiesen; `wurzel` ist `null`. */
  readonly abgelehnt: boolean;
  /** Zeile und Spalte (1-basiert) zu einer Position der Eingabe. */
  ortVon(offset: number): { readonly zeile: number; readonly spalte: number };
  /** Pfad `/a/b/c` eines Elements. */
  pfadVon(element: XmlElement): string;
}

export const STANDARD_MAX_TIEFE = 100;
const MAX_BEFUNDE = 10_000;

interface Baumelement extends XmlElement {
  children: XmlNode[];
}

const PREDEFINIERT: Readonly<Record<string, string>> = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  apos: "'",
};

const REFERENZ = /&(?:#([0-9]+)|#x([0-9A-Fa-f]+)|([A-Za-z_][A-Za-z0-9_.:-]*));/y;

const istLeerraum = (c: number): boolean => c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;

const istNamensanfang = (c: number): boolean =>
  (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a) || c === 0x5f || c === 0x3a || c > 0x7f;

const istXmlZeichen = (c: number): boolean =>
  c === 0x9 ||
  c === 0xa ||
  c === 0xd ||
  (c >= 0x20 && c <= 0xd7ff) ||
  (c >= 0xe000 && c <= 0xfffd) ||
  (c >= 0x10000 && c <= 0x10ffff);

const lokalerName = (qname: string): string => {
  const k = qname.indexOf(':');
  return k < 0 ? qname : qname.slice(k + 1);
};

/** Kindelemente eines Elements in Dokumentreihenfolge. */
export function elementKinder(e: XmlElement): XmlElement[] {
  return e.children.filter((k): k is XmlElement => typeof k !== 'string');
}

/** Gesamter Text unterhalb eines Elements (alle Nachfahren, in Reihenfolge). */
export function textInhalt(e: XmlElement): string {
  let s = '';
  for (const k of e.children) s += typeof k === 'string' ? k : textInhalt(k);
  return s;
}

export function parseXml(text: string, optionen: XmlOptionen = {}): XmlErgebnis {
  const maxTiefe = optionen.maxTiefe ?? STANDARD_MAX_TIEFE;
  const blatt = optionen.blattNamen;
  const befunde: GaebBefund[] = [];
  const stapel: Baumelement[] = [];
  const n = text.length;
  let wurzel: Baumelement | null = null;
  let wurzelFertig = false;
  let abgelehnt = false;
  let abgebrochen = false;
  let begrenzt = false;
  let zeilenanfaenge: number[] | null = null;

  const ortVon = (offset: number): { zeile: number; spalte: number } => {
    if (zeilenanfaenge === null) {
      zeilenanfaenge = [0];
      for (let p = text.indexOf('\n'); p !== -1; p = text.indexOf('\n', p + 1)) zeilenanfaenge.push(p + 1);
    }
    let lo = 0;
    let hi = zeilenanfaenge.length - 1;
    while (lo < hi) {
      const mitte = (lo + hi + 1) >> 1;
      if ((zeilenanfaenge[mitte] ?? 0) <= offset) lo = mitte;
      else hi = mitte - 1;
    }
    return { zeile: lo + 1, spalte: offset - (zeilenanfaenge[lo] ?? 0) + 1 };
  };

  const pfadVon = (e: XmlElement): string => {
    const teile: string[] = [];
    for (let k: XmlElement | null = e; k !== null; k = k.parent) teile.push(k.name);
    return '/' + teile.reverse().join('/');
  };

  const melde = (
    schwere: GaebBefund['schwere'],
    code: GaebBefundcode,
    meldung: string,
    offset: number,
    element?: XmlElement,
  ): void => {
    if (befunde.length >= MAX_BEFUNDE) {
      if (!begrenzt) {
        begrenzt = true;
        befunde.push({
          schwere: 'warnung',
          quelle: 'gaeb-lesen',
          code: 'befunde-begrenzt',
          meldung: `Weitere Befunde werden nicht mehr aufgezeichnet (Grenze ${String(MAX_BEFUNDE)}).`,
          ort: {},
        });
      }
      return;
    }
    const bezug = element ?? stapel.at(-1);
    const { zeile, spalte } = ortVon(offset);
    const ort: Befundort = { ...(bezug ? { pfad: pfadVon(bezug) } : {}), zeile, spalte };
    befunde.push({ schwere, quelle: 'gaeb-lesen', code, meldung, ort });
  };

  /** Löst Entitäten und Zeichenreferenzen auf; alles andere bleibt stehen und wird gemeldet. */
  const dekodiere = (roh: string, basis: number): string => {
    let p = roh.indexOf('&');
    if (p < 0) return roh;
    let aus = '';
    let von = 0;
    while (p >= 0) {
      aus += roh.slice(von, p);
      REFERENZ.lastIndex = p;
      const m = REFERENZ.exec(roh);
      if (m === null) {
        melde(
          'warnung',
          'xml-entitaet-unbekannt',
          'Ein „&“ ohne gültige Entität bleibt als Text stehen.',
          basis + p,
        );
        aus += '&';
        von = p + 1;
      } else {
        const [ganz, dez, hex, name] = m;
        if (name !== undefined) {
          const ersatz = PREDEFINIERT[name];
          if (ersatz === undefined) {
            melde(
              'warnung',
              'xml-entitaet-unbekannt',
              `Entität „${ganz}“ ist nicht vordefiniert und wird nicht aufgelöst.`,
              basis + p,
            );
            aus += ganz;
          } else aus += ersatz;
        } else {
          const code = dez !== undefined ? Number.parseInt(dez, 10) : Number.parseInt(hex ?? '', 16);
          if (Number.isFinite(code) && istXmlZeichen(code)) aus += String.fromCodePoint(code);
          else {
            melde(
              'warnung',
              'xml-zeichenreferenz-ungueltig',
              `Zeichenreferenz „${ganz}“ ist kein zulässiges XML-Zeichen.`,
              basis + p,
            );
            aus += '�';
          }
        }
        von = p + ganz.length;
      }
      p = roh.indexOf('&', von);
    }
    return aus + roh.slice(von);
  };

  const fuegeText = (s: string): void => {
    if (s === '') return;
    const oben = stapel.at(-1);
    if (oben === undefined) return;
    const letzter = oben.children.at(-1);
    if (typeof letzter === 'string') oben.children[oben.children.length - 1] = letzter + s;
    else oben.children.push(s);
  };

  const meldeUngeschlossen = (e: Baumelement): void => {
    melde(
      'fehler',
      'xml-tag-nicht-geschlossen',
      `Das Element <${e.qname}> wird nicht geschlossen.`,
      e.offset,
      e,
    );
  };

  let i = 0;
  while (i < n) {
    const lt = text.indexOf('<', i);
    const ende = lt === -1 ? n : lt;
    if (ende > i) {
      const roh = text.slice(i, ende);
      if (stapel.length > 0) fuegeText(dekodiere(roh, i));
      else if (roh.trim() !== '')
        melde('warnung', 'xml-text-ausserhalb', 'Text außerhalb des Wurzelelements wird ignoriert.', i);
    }
    if (lt === -1) break;
    i = lt;

    if (text.startsWith('<!--', i)) {
      const j = text.indexOf('-->', i + 4);
      if (j < 0) {
        melde('fehler', 'xml-abschnitt-offen', 'Kommentar ohne Ende.', i);
        i = n;
      } else i = j + 3;
    } else if (text.startsWith('<![CDATA[', i)) {
      const j = text.indexOf(']]>', i + 9);
      if (j < 0) {
        melde('fehler', 'xml-abschnitt-offen', 'CDATA-Abschnitt ohne Ende.', i);
        fuegeText(text.slice(i + 9));
        i = n;
      } else {
        fuegeText(text.slice(i + 9, j));
        i = j + 3;
      }
    } else if (text.startsWith('<?', i)) {
      const j = text.indexOf('?>', i + 2);
      if (j < 0) {
        melde('fehler', 'xml-abschnitt-offen', 'Verarbeitungsanweisung ohne Ende.', i);
        i = n;
      } else i = j + 2;
    } else if (text.startsWith('<!DOCTYPE', i)) {
      // Ende suchen: `>` außerhalb von Anführungszeichen und eckigen Klammern.
      let j = i + 9;
      let anf = 0;
      let unter = false;
      let gefunden = false;
      for (; j < n; j++) {
        const c = text.charCodeAt(j);
        if (anf !== 0) {
          if (c === anf) anf = 0;
        } else if (c === 0x22 || c === 0x27) anf = c;
        else if (c === 0x5b) unter = true;
        else if (c === 0x5d) unter = false;
        else if (c === 0x3e && !unter) {
          gefunden = true;
          break;
        }
      }
      const rumpf = text.slice(i, gefunden ? j + 1 : n);
      if (rumpf.includes('<!ENTITY')) {
        melde(
          'fehler',
          'xml-doctype-entitaeten',
          'Der DOCTYPE deklariert Entitäten; die Datei wird aus Sicherheitsgründen zurückgewiesen.',
          i,
        );
        abgelehnt = true;
        break;
      }
      if (!gefunden) {
        melde(
          'fehler',
          'xml-doctype-ungueltig',
          'Der DOCTYPE ist nicht abgeschlossen; die Datei wird zurückgewiesen.',
          i,
        );
        abgelehnt = true;
        break;
      }
      melde('warnung', 'xml-doctype-ignoriert', 'Ein DOCTYPE wird ignoriert (GAEB-Dateien haben keinen).', i);
      i = j + 1;
    } else if (text.startsWith('<!', i)) {
      const j = text.indexOf('>', i + 2);
      melde('warnung', 'xml-zeichen-unerwartet', 'Unbekannte Deklaration wird ignoriert.', i);
      i = j < 0 ? n : j + 1;
    } else if (text.charCodeAt(i + 1) === 0x2f) {
      // Schließ-Tag
      const j = text.indexOf('>', i + 2);
      if (j < 0) {
        melde('fehler', 'xml-abschnitt-offen', 'Schließendes Tag ohne „>“.', i);
        break;
      }
      const qname = text.slice(i + 2, j).trim();
      let k = stapel.length - 1;
      while (k >= 0 && stapel[k]?.qname !== qname) k--;
      if (k < 0)
        melde(
          'warnung',
          'xml-schliessendes-tag-unerwartet',
          `Schließendes Tag </${qname}> ohne öffnendes.`,
          i,
        );
      else {
        while (stapel.length - 1 > k) {
          const offen = stapel.pop();
          if (offen) meldeUngeschlossen(offen);
        }
        stapel.pop();
        if (stapel.length === 0) wurzelFertig = true;
      }
      i = j + 1;
    } else if (istNamensanfang(text.charCodeAt(i + 1))) {
      // Öffnendes Tag
      if (stapel.length === 0 && wurzelFertig) {
        melde('warnung', 'xml-mehrere-wurzeln', 'Ein zweites Wurzelelement wird nicht gelesen.', i);
        break;
      }
      const start = i;
      let j = i + 1;
      while (j < n) {
        const c = text.charCodeAt(j);
        if (istLeerraum(c) || c === 0x2f || c === 0x3e || c === 0x3c) break;
        j++;
      }
      const qname = text.slice(i + 1, j);
      const attrs = new Map<string, string>();
      let selbstschliessend = false;
      for (;;) {
        while (j < n && istLeerraum(text.charCodeAt(j))) j++;
        if (j >= n) break;
        const c = text.charCodeAt(j);
        if (c === 0x3e) {
          j++;
          break;
        }
        if (c === 0x2f) {
          if (text.charCodeAt(j + 1) === 0x3e) {
            selbstschliessend = true;
            j += 2;
            break;
          }
          j++;
          continue;
        }
        if (c === 0x3c) {
          melde(
            'warnung',
            'xml-zeichen-unerwartet',
            `Das Tag <${qname}> ist nicht mit „>“ abgeschlossen.`,
            start,
          );
          break;
        }
        const an = j;
        while (j < n) {
          const d = text.charCodeAt(j);
          if (istLeerraum(d) || d === 0x3d || d === 0x3e || d === 0x2f || d === 0x3c) break;
          j++;
        }
        const aname = text.slice(an, j);
        if (aname === '') {
          j++;
          continue;
        }
        while (j < n && istLeerraum(text.charCodeAt(j))) j++;
        let wert = '';
        if (text.charCodeAt(j) === 0x3d) {
          j++;
          while (j < n && istLeerraum(text.charCodeAt(j))) j++;
          const q = text.charCodeAt(j);
          if (q === 0x22 || q === 0x27) {
            const e = text.indexOf(String.fromCharCode(q), j + 1);
            const rest = e < 0 ? n : e;
            if (e < 0)
              melde(
                'warnung',
                'xml-attribut-fehlerhaft',
                `Attribut „${aname}“ ohne schließendes Anführungszeichen.`,
                an,
              );
            wert = dekodiere(text.slice(j + 1, rest), j + 1);
            j = e < 0 ? n : e + 1;
          } else {
            const wa = j;
            while (j < n) {
              const d = text.charCodeAt(j);
              if (istLeerraum(d) || d === 0x3e || (d === 0x2f && text.charCodeAt(j + 1) === 0x3e)) break;
              j++;
            }
            melde('warnung', 'xml-attribut-fehlerhaft', `Attribut „${aname}“ ohne Anführungszeichen.`, an);
            wert = dekodiere(text.slice(wa, j), wa);
          }
        } else melde('warnung', 'xml-attribut-fehlerhaft', `Attribut „${aname}“ ohne Wert.`, an);
        if (attrs.has(aname))
          melde('warnung', 'xml-attribut-fehlerhaft', `Attribut „${aname}“ ist doppelt; das erste gilt.`, an);
        else attrs.set(aname, wert);
      }
      i = j;

      // Wiederherstellung: ein Blattelement kann kein Kind haben.
      if (blatt) {
        for (let oben = stapel.at(-1); oben !== undefined && blatt.has(oben.name); oben = stapel.at(-1)) {
          stapel.pop();
          meldeUngeschlossen(oben);
        }
      }
      if (stapel.length >= maxTiefe) {
        melde(
          'fehler',
          'xml-tiefe-ueberschritten',
          `Verschachtelungstiefe über ${String(maxTiefe)}; der Rest wird nicht gelesen.`,
          start,
        );
        abgebrochen = true;
        break;
      }
      const el: Baumelement = {
        name: lokalerName(qname),
        qname,
        attrs,
        children: [],
        parent: stapel.at(-1) ?? null,
        offset: start,
      };
      if (el.parent) (el.parent as Baumelement).children.push(el);
      else wurzel = el;
      if (selbstschliessend) {
        if (el.parent === null) wurzelFertig = true;
      } else stapel.push(el);
    } else {
      melde('warnung', 'xml-zeichen-unerwartet', 'Ein „<“ ohne Tag wird als Text behandelt.', i);
      fuegeText('<');
      i += 1;
    }
  }

  if (abgelehnt) return { wurzel: null, befunde, abgelehnt, ortVon, pfadVon };

  if (!abgebrochen) {
    for (let e = stapel.pop(); e !== undefined; e = stapel.pop()) meldeUngeschlossen(e);
  }
  if (wurzel === null) melde('fehler', 'xml-keine-wurzel', 'Die Eingabe enthält kein XML-Element.', 0);
  return { wurzel, befunde, abgelehnt, ortVon, pfadVon };
}
