// SPDX-License-Identifier: AGPL-3.0-or-later
// Kleiner, strenger XML-Leser für XRechnung (Ticket 76, D-76.2). Rein (A2): Eingabe ist ein String, kein DOM, kein I/O.
// Nicht der GAEB-Leser (A3); anders als dieser liest er nicht tolerant: Eine Rechnung, deren XML nicht wohlgeformt ist,
// wird nicht gelesen, weil eine „gerettete“ Rechnung falsche Beträge zeigen könnte.
//
// Sicherheit:
// - Jede Dokumenttyp-Deklaration (`<!DOCTYPE`) wird abgelehnt; es gibt keine DTD und keine eigenen Entitäten, also
//   kein XXE und kein „Billion Laughs“. Aufgelöst werden nur die fünf vordefinierten Entitäten und Zeichenreferenzen.
// - Eingabelänge (`maxZeichen`) und Verschachtelungstiefe (`maxTiefe`) sind begrenzt.
// - Namensräume werden über die URI aufgelöst; ein Präfix ohne Bindung ist ein Fehler.

export interface XmlElement {
  /** Namensraum-URI; leer, wenn das Element in keinem Namensraum steht. */
  readonly ns: string;
  /** Lokaler Name ohne Präfix. */
  readonly name: string;
  /** Attribute ohne Präfix nach Namen; Namensraum-Deklarationen gehören nicht dazu. */
  readonly attrs: ReadonlyMap<string, string>;
  readonly kinder: readonly XmlElement[];
  /** Direkter Textinhalt (ohne Text der Kindelemente), Entitäten aufgelöst. */
  readonly text: string;
  readonly parent: XmlElement | null;
}

export type XmlFehlercode =
  'eingabe-zu-gross' | 'xml-doctype' | 'xml-entitaet' | 'xml-zu-tief' | 'xml-ungueltig';

export type XmlErgebnis =
  | { readonly ok: true; readonly wurzel: XmlElement }
  | { readonly ok: false; readonly code: XmlFehlercode; readonly meldung: string; readonly offset: number };

export interface XmlGrenzen {
  readonly maxZeichen: number;
  readonly maxTiefe: number;
}

interface Baumelement extends XmlElement {
  /** Name wie in der Datei (mit Präfix), für den Abgleich mit dem schließenden Tag. */
  readonly qname: string;
  kinder: XmlElement[];
  text: string;
}

const XML_NS = 'http://www.w3.org/XML/1998/namespace';
const XMLNS_NS = 'http://www.w3.org/2000/xmlns/';

const VORDEFINIERT: Readonly<Record<string, string>> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };

const istLeerraum = (c: number): boolean => c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;

/** Grobe Prüfung eines XML-Namens (mit höchstens einem Doppelpunkt); genügt, um Unsinn abzuweisen. */
const NAME = /^[A-Za-z_À-￿][A-Za-z0-9_.\-·À-￿]*(?::[A-Za-z_À-￿][A-Za-z0-9_.\-·À-￿]*)?$/;

const istXmlZeichen = (c: number): boolean =>
  c === 0x9 ||
  c === 0xa ||
  c === 0xd ||
  (c >= 0x20 && c <= 0xd7ff) ||
  (c >= 0xe000 && c <= 0xfffd) ||
  (c >= 0x10000 && c <= 0x10ffff);

class XmlFehler extends Error {
  constructor(
    readonly code: XmlFehlercode,
    meldung: string,
    readonly offset: number,
  ) {
    super(meldung);
  }
}

/** Erstes Kindelement mit Namensraum und lokalem Namen. */
export function kind(e: XmlElement | undefined, ns: string, name: string): XmlElement | undefined {
  return e?.kinder.find((k) => k.ns === ns && k.name === name);
}

/** Alle Kindelemente mit Namensraum und lokalem Namen, in Dokumentreihenfolge. */
export function kinder(e: XmlElement | undefined, ns: string, name: string): XmlElement[] {
  return e ? e.kinder.filter((k) => k.ns === ns && k.name === name) : [];
}

/**
 * Pfad aus lokalen Namen, z. B. `/Invoice/InvoiceLine[2]/LineExtensionAmount`. Ein Index steht nur, wenn das
 * Elternelement mehrere gleichnamige Kinder hat.
 */
export function pfadVon(e: XmlElement): string {
  const teile: string[] = [];
  for (let k: XmlElement | null = e; k !== null; k = k.parent) {
    const geschwister = k.parent ? k.parent.kinder.filter((g) => g.ns === k.ns && g.name === k.name) : [k];
    teile.push(geschwister.length > 1 ? `${k.name}[${String(geschwister.indexOf(k) + 1)}]` : k.name);
  }
  return '/' + teile.reverse().join('/');
}

/** Zeile und Spalte (1-basiert) einer Position der Eingabe. */
export function ortVon(text: string, offset: number): { readonly zeile: number; readonly spalte: number } {
  let zeile = 1;
  let anfang = 0;
  for (let p = text.indexOf('\n'); p !== -1 && p < offset; p = text.indexOf('\n', p + 1)) {
    zeile++;
    anfang = p + 1;
  }
  return { zeile, spalte: offset - anfang + 1 };
}

export function xmlLesen(text: string, grenzen: XmlGrenzen): XmlErgebnis {
  if (text.length > grenzen.maxZeichen) {
    return {
      ok: false,
      code: 'eingabe-zu-gross',
      meldung: `Die Eingabe hat ${String(text.length)} Zeichen; zulässig sind höchstens ${String(grenzen.maxZeichen)}.`,
      offset: 0,
    };
  }
  try {
    return { ok: true, wurzel: lies(text, grenzen.maxTiefe) };
  } catch (e) {
    if (e instanceof XmlFehler) return { ok: false, code: e.code, meldung: e.message, offset: e.offset };
    throw e;
  }
}

function lies(text: string, maxTiefe: number): XmlElement {
  const n = text.length;
  const stapel: Baumelement[] = [];
  const bereiche: Map<string, string>[] = [new Map([['xml', XML_NS]])];
  let wurzel: Baumelement | null = null;
  const start = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let i = start;

  function fehler(code: XmlFehlercode, meldung: string, offset: number): never {
    throw new XmlFehler(code, meldung, offset);
  }

  const dekodiere = (roh: string, basis: number): string => {
    let p = roh.indexOf('&');
    if (p < 0) return roh;
    let aus = '';
    let von = 0;
    while (p >= 0) {
      aus += roh.slice(von, p);
      const ende = roh.indexOf(';', p + 1);
      const name = ende < 0 ? '' : roh.slice(p + 1, ende);
      if (ende < 0 || name === '' || /[\s&<]/.test(name)) {
        fehler('xml-ungueltig', 'Ein „&“ ohne Entitätsname und „;“ ist kein wohlgeformtes XML.', basis + p);
      }
      if (name.startsWith('#')) {
        const hex = /^#x([0-9A-Fa-f]{1,6})$/.exec(name);
        const dez = /^#([0-9]{1,7})$/.exec(name);
        const code = hex ? Number.parseInt(hex[1] ?? '', 16) : dez ? Number.parseInt(dez[1] ?? '', 10) : -1;
        if (!istXmlZeichen(code)) {
          fehler('xml-ungueltig', `Zeichenreferenz „&${name};“ ist kein zulässiges XML-Zeichen.`, basis + p);
        }
        aus += String.fromCodePoint(code);
      } else {
        const ersatz = VORDEFINIERT[name];
        if (ersatz === undefined) {
          fehler(
            'xml-entitaet',
            `Entität „&${name};“ ist nicht vordefiniert; eigene Entitäten werden aus Sicherheitsgründen nicht aufgelöst.`,
            basis + p,
          );
        }
        aus += ersatz;
      }
      von = ende + 1;
      p = roh.indexOf('&', von);
    }
    return aus + roh.slice(von);
  };

  const loese = (qname: string, bereich: ReadonlyMap<string, string>, offset: number, attribut: boolean) => {
    const k = qname.indexOf(':');
    if (k < 0) return { ns: attribut ? '' : (bereich.get('') ?? ''), name: qname };
    const praefix = qname.slice(0, k);
    const ns = bereich.get(praefix);
    if (ns === undefined || ns === '') {
      fehler('xml-ungueltig', `Das Präfix „${praefix}“ ist an keinen Namensraum gebunden.`, offset);
    }
    return { ns, name: qname.slice(k + 1) };
  };

  while (i < n) {
    const lt = text.indexOf('<', i);
    const ende = lt === -1 ? n : lt;
    if (ende > i) {
      const roh = text.slice(i, ende);
      const oben = stapel.at(-1);
      if (oben) oben.text += dekodiere(roh, i);
      else if (roh.trim() !== '') fehler('xml-ungueltig', 'Text außerhalb des Wurzelelements.', i);
    }
    if (lt === -1) break;
    i = lt;

    if (text.startsWith('<!--', i)) {
      const j = text.indexOf('-->', i + 4);
      if (j < 0) fehler('xml-ungueltig', 'Kommentar ohne Ende.', i);
      i = j + 3;
    } else if (text.startsWith('<![CDATA[', i)) {
      const oben = stapel.at(-1);
      if (!oben) fehler('xml-ungueltig', 'CDATA außerhalb des Wurzelelements.', i);
      const j = text.indexOf(']]>', i + 9);
      if (j < 0) fehler('xml-ungueltig', 'CDATA-Abschnitt ohne Ende.', i);
      oben.text += text.slice(i + 9, j);
      i = j + 3;
    } else if (text.startsWith('<!DOCTYPE', i)) {
      fehler(
        'xml-doctype',
        'Die Datei enthält eine Dokumenttyp-Deklaration (DOCTYPE); sie wird aus Sicherheitsgründen nicht gelesen.',
        i,
      );
    } else if (text.startsWith('<!', i)) {
      fehler('xml-ungueltig', 'Unbekannte Deklaration „<!“.', i);
    } else if (text.startsWith('<?', i)) {
      const j = text.indexOf('?>', i + 2);
      if (j < 0) fehler('xml-ungueltig', 'Verarbeitungsanweisung ohne Ende.', i);
      const ziel = /^[^\s?]*/.exec(text.slice(i + 2, j))?.[0] ?? '';
      if (ziel.toLowerCase() === 'xml' && i !== start) {
        fehler('xml-ungueltig', 'Die XML-Deklaration steht nicht am Anfang der Datei.', i);
      }
      i = j + 2;
    } else if (text.charCodeAt(i + 1) === 0x2f) {
      const j = text.indexOf('>', i + 2);
      if (j < 0) fehler('xml-ungueltig', 'Schließendes Tag ohne „>“.', i);
      const qname = text.slice(i + 2, j).trimEnd();
      const oben = stapel.pop();
      if (!oben || oben.qname !== qname) {
        fehler(
          'xml-ungueltig',
          oben ? `</${qname}> schließt <${oben.qname}> nicht.` : `</${qname}> ohne öffnendes Tag.`,
          i,
        );
      }
      bereiche.pop();
      i = j + 1;
    } else {
      if (wurzel !== null && stapel.length === 0) fehler('xml-ungueltig', 'Ein zweites Wurzelelement.', i);
      const tagStart = i;
      let j = i + 1;
      while (j < n) {
        const c = text.charCodeAt(j);
        if (istLeerraum(c) || c === 0x2f || c === 0x3e) break;
        j++;
      }
      const qname = text.slice(i + 1, j);
      if (!NAME.test(qname)) fehler('xml-ungueltig', `Ungültiger Elementname „${qname.slice(0, 40)}“.`, i);
      const roheAttrs: { qname: string; wert: string; offset: number }[] = [];
      let selbstschliessend = false;
      for (;;) {
        const vorher = j;
        while (j < n && istLeerraum(text.charCodeAt(j))) j++;
        if (j >= n) fehler('xml-ungueltig', `Das Tag <${qname}> ist nicht abgeschlossen.`, tagStart);
        const c = text.charCodeAt(j);
        if (c === 0x3e) {
          j++;
          break;
        }
        if (c === 0x2f) {
          if (text.charCodeAt(j + 1) !== 0x3e) fehler('xml-ungueltig', `„/“ ohne „>“ in <${qname}>.`, j);
          selbstschliessend = true;
          j += 2;
          break;
        }
        if (j === vorher) fehler('xml-ungueltig', `Attribute in <${qname}> ohne Leerraum dazwischen.`, j);
        const an = j;
        while (j < n) {
          const d = text.charCodeAt(j);
          if (istLeerraum(d) || d === 0x3d || d === 0x3e || d === 0x2f) break;
          j++;
        }
        const aname = text.slice(an, j);
        if (!NAME.test(aname)) fehler('xml-ungueltig', `Ungültiger Attributname in <${qname}>.`, an);
        while (j < n && istLeerraum(text.charCodeAt(j))) j++;
        if (text.charCodeAt(j) !== 0x3d) fehler('xml-ungueltig', `Attribut „${aname}“ ohne Wert.`, an);
        j++;
        while (j < n && istLeerraum(text.charCodeAt(j))) j++;
        const q = text.charCodeAt(j);
        if (q !== 0x22 && q !== 0x27)
          fehler('xml-ungueltig', `Attribut „${aname}“ ohne Anführungszeichen.`, an);
        const e = text.indexOf(String.fromCharCode(q), j + 1);
        if (e < 0) fehler('xml-ungueltig', `Attribut „${aname}“ ohne schließendes Anführungszeichen.`, an);
        const roh = text.slice(j + 1, e);
        if (roh.includes('<')) fehler('xml-ungueltig', `„<“ im Wert des Attributs „${aname}“.`, an);
        if (roheAttrs.some((a) => a.qname === aname))
          fehler('xml-ungueltig', `Attribut „${aname}“ ist doppelt.`, an);
        roheAttrs.push({ qname: aname, wert: dekodiere(roh, j + 1), offset: an });
        j = e + 1;
      }

      const bereich = new Map(bereiche.at(-1));
      for (const a of roheAttrs) {
        if (a.qname === 'xmlns') bereich.set('', a.wert);
        else if (a.qname.startsWith('xmlns:')) {
          if (a.wert === '')
            fehler('xml-ungueltig', `Präfix „${a.qname.slice(6)}“ an leeren Namensraum.`, a.offset);
          bereich.set(a.qname.slice(6), a.wert);
        }
      }
      const attrs = new Map<string, string>();
      for (const a of roheAttrs) {
        if (a.qname === 'xmlns' || a.qname.startsWith('xmlns:')) continue;
        const { ns, name } = loese(a.qname, bereich, a.offset, true);
        if (ns === XMLNS_NS) continue;
        attrs.set(ns === '' ? name : `{${ns}}${name}`, a.wert);
      }
      const { ns, name } = loese(qname, bereich, tagStart, false);
      if (stapel.length >= maxTiefe) {
        fehler(
          'xml-zu-tief',
          `Verschachtelungstiefe über ${String(maxTiefe)}; die Datei wird nicht gelesen.`,
          tagStart,
        );
      }
      const parent = stapel.at(-1) ?? null;
      const el: Baumelement = { ns, name, qname, attrs, kinder: [], text: '', parent };
      if (parent) parent.kinder.push(el);
      else wurzel = el;
      if (!selbstschliessend) {
        stapel.push(el);
        bereiche.push(bereich);
      }
      i = j;
    }
  }

  const offen = stapel.at(-1);
  if (offen) fehler('xml-ungueltig', `Das Element <${offen.qname}> wird nicht geschlossen.`, n);
  if (wurzel === null) fehler('xml-ungueltig', 'Die Eingabe enthält kein XML-Element.', 0);
  return wurzel;
}
