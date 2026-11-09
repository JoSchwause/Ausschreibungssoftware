// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests des eigenen XML-Lesers (Ticket 22): tolerant, ohne DTD, mit Grenzen. Zuerst geschrieben (Q1).

import { describe, expect, it } from 'vitest';
import { elementKinder, parseXml, textInhalt } from './xml';
import type { XmlElement } from './xml';

const codes = (e: ReturnType<typeof parseXml>): string[] => e.befunde.map((b) => b.code);

describe('parseXml: wohlgeformte Eingaben', () => {
  it('baut den Baum mit lokalen Namen, Attributen und Text', () => {
    const e = parseXml('<?xml version="1.0"?><a xmlns="urn:x" id="1"><b k=\'v\'>Text</b><c/></a>');
    expect(e.abgelehnt).toBe(false);
    expect(e.befunde).toEqual([]);
    const a = e.wurzel as XmlElement;
    expect(a.name).toBe('a');
    expect(a.attrs.get('xmlns')).toBe('urn:x');
    expect(a.attrs.get('id')).toBe('1');
    const [b, c] = elementKinder(a);
    expect(b?.name).toBe('b');
    expect(b?.attrs.get('k')).toBe('v');
    expect(textInhalt(b as XmlElement)).toBe('Text');
    expect(c?.name).toBe('c');
    expect(c?.children).toEqual([]);
  });

  it('entfernt Präfixe aus dem lokalen Namen und behält den qualifizierten', () => {
    const w = parseXml('<g:GAEB xmlns:g="urn:x"><g:Award/></g:GAEB>').wurzel as XmlElement;
    expect(w.name).toBe('GAEB');
    expect(w.qname).toBe('g:GAEB');
    expect(elementKinder(w)[0]?.name).toBe('Award');
  });

  it('löst die fünf vordefinierten Entitäten und Zeichenreferenzen auf', () => {
    const e = parseXml('<a>&lt;&gt;&amp;&quot;&apos; &#65;&#x42;&#x1F600;</a>');
    expect(e.befunde).toEqual([]);
    expect(textInhalt(e.wurzel as XmlElement)).toBe('<>&"\' AB\u{1F600}');
  });

  it('liest CDATA als Text, überspringt Kommentare und Verarbeitungsanweisungen', () => {
    const e = parseXml('<a><!-- k --><?pi x?><![CDATA[<b>&amp;]]>x</a>');
    expect(e.befunde).toEqual([]);
    expect(textInhalt(e.wurzel as XmlElement)).toBe('<b>&amp;x');
  });

  it('meldet Zeile und Spalte (1-basiert) und den Pfad', () => {
    const e = parseXml('<a>\n  <b>\n    <c/>\n  </b>\n</a>');
    const c = elementKinder(elementKinder(e.wurzel as XmlElement)[0] as XmlElement)[0] as XmlElement;
    expect(e.ortVon(c.offset)).toEqual({ zeile: 3, spalte: 5 });
    expect(e.pfadVon(c)).toBe('/a/b/c');
  });
});

describe('parseXml: Toleranz', () => {
  it('schließt ein ungeschlossenes Element beim nächsten passenden Schließ-Tag', () => {
    const e = parseXml('<a><b><c>x</b><d/></a>');
    expect(codes(e)).toEqual(['xml-tag-nicht-geschlossen']);
    expect(e.befunde[0]?.schwere).toBe('fehler');
    expect(e.befunde[0]?.ort.pfad).toBe('/a/b/c');
    const a = e.wurzel as XmlElement;
    expect(elementKinder(a).map((k) => k.name)).toEqual(['b', 'd']);
  });

  it('schließt bekannte Blattelemente, bevor ein weiteres Element beginnt', () => {
    const blatt = new Set(['QU']);
    const e = parseXml('<Item><QU>m3<Description/></Item>', { blattNamen: blatt });
    expect(codes(e)).toEqual(['xml-tag-nicht-geschlossen']);
    const item = e.wurzel as XmlElement;
    expect(elementKinder(item).map((k) => k.name)).toEqual(['QU', 'Description']);
    expect(textInhalt(elementKinder(item)[0] as XmlElement)).toBe('m3');
  });

  it('ignoriert ein unerwartetes Schließ-Tag', () => {
    const e = parseXml('<a></b></a>');
    expect(codes(e)).toEqual(['xml-schliessendes-tag-unerwartet']);
    expect(e.wurzel?.name).toBe('a');
  });

  it('liefert bei abgeschnittener Datei alles bis dahin und meldet jedes offene Element', () => {
    const e = parseXml('<a><b>1</b><c><d>2');
    expect(codes(e)).toEqual([
      'xml-tag-nicht-geschlossen',
      'xml-tag-nicht-geschlossen',
      'xml-tag-nicht-geschlossen',
    ]);
    expect(e.befunde.map((b) => b.ort.pfad)).toEqual(['/a/c/d', '/a/c', '/a']);
    const a = e.wurzel as XmlElement;
    expect(elementKinder(a).map((k) => k.name)).toEqual(['b', 'c']);
  });

  it('lässt unbekannte Entitäten und ungültige Zeichenreferenzen stehen und meldet sie', () => {
    const e = parseXml('<a>x&nbsp;y &#0; &#xD800; & z</a>');
    expect(codes(e)).toEqual([
      'xml-entitaet-unbekannt',
      'xml-zeichenreferenz-ungueltig',
      'xml-zeichenreferenz-ungueltig',
      'xml-entitaet-unbekannt',
    ]);
    expect(textInhalt(e.wurzel as XmlElement)).toBe('x&nbsp;y � � & z');
  });

  it('meldet fehlende Anführungszeichen und Attribute ohne Wert, liest aber weiter', () => {
    const e = parseXml('<a x=1 y z="3"><b/></a>');
    expect(codes(e)).toEqual(['xml-attribut-fehlerhaft', 'xml-attribut-fehlerhaft']);
    const a = e.wurzel as XmlElement;
    expect(a.attrs.get('x')).toBe('1');
    expect(a.attrs.get('y')).toBe('');
    expect(a.attrs.get('z')).toBe('3');
    expect(elementKinder(a)).toHaveLength(1);
  });

  it('meldet fehlende Wurzel', () => {
    const e = parseXml('nur Text');
    expect(e.wurzel).toBeNull();
    expect(codes(e)).toContain('xml-keine-wurzel');
  });

  it('meldet ein zweites Wurzelelement und liest nicht weiter', () => {
    const e = parseXml('<a/><b/>');
    expect(codes(e)).toEqual(['xml-mehrere-wurzeln']);
    expect(e.wurzel?.name).toBe('a');
  });
});

describe('parseXml: Sicherheit', () => {
  it('weist DOCTYPE mit Entitätsdeklaration zurück (Billion Laughs)', () => {
    const lol = '<?xml version="1.0"?><!DOCTYPE l [<!ENTITY a "x"><!ENTITY b "&a;&a;&a;&a;">]><l>&b;</l>';
    const e = parseXml(lol);
    expect(e.abgelehnt).toBe(true);
    expect(e.wurzel).toBeNull();
    expect(codes(e)).toEqual(['xml-doctype-entitaeten']);
    expect(e.befunde[0]?.schwere).toBe('fehler');
  });

  it('weist eine externe Entität zurück, ohne sie zu laden', () => {
    const e = parseXml('<!DOCTYPE x [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><x>&xxe;</x>');
    expect(e.abgelehnt).toBe(true);
    expect(codes(e)).toEqual(['xml-doctype-entitaeten']);
  });

  it('weist auch Parameter-Entitäten und nicht abgeschlossene DOCTYPE zurück', () => {
    expect(parseXml('<!DOCTYPE x [<!ENTITY % p "q">]><x/>').abgelehnt).toBe(true);
    expect(parseXml('<!DOCTYPE x [<!ELEMENT x ANY>').abgelehnt).toBe(true);
  });

  it('akzeptiert einen DOCTYPE ohne Entitäten mit Warnung und löst Entitäten nicht auf', () => {
    const e = parseXml('<!DOCTYPE x SYSTEM "x.dtd"><x>&foo;</x>');
    expect(e.abgelehnt).toBe(false);
    expect(codes(e)).toEqual(['xml-doctype-ignoriert', 'xml-entitaet-unbekannt']);
    expect(textInhalt(e.wurzel as XmlElement)).toBe('&foo;');
  });

  it('bricht bei zu tiefer Verschachtelung ab und liefert den Rest bis dahin', () => {
    const tief = '<a>'.repeat(50) + 'x' + '</a>'.repeat(50);
    const e = parseXml(tief, { maxTiefe: 10 });
    expect(codes(e)).toContain('xml-tiefe-ueberschritten');
    expect(e.befunde.find((b) => b.code === 'xml-tiefe-ueberschritten')?.schwere).toBe('fehler');
    expect(e.wurzel?.name).toBe('a');
  });

  it('hält sehr viele gleichartige Befunde in Grenzen', () => {
    const e = parseXml(`<a>${'&x;'.repeat(50_000)}</a>`);
    expect(e.befunde.length).toBeLessThanOrEqual(10_001);
    expect(e.befunde.at(-1)?.code).toBe('befunde-begrenzt');
  });
});
