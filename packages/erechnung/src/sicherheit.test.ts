// SPDX-License-Identifier: AGPL-3.0-or-later
// Sicherheitstests des XRechnung-Lesers (Ticket 76, Abschnitt 5): Entitäten, DOCTYPE, zu tiefe Verschachtelung, zu große
// Eingabe, fremde Wurzel, kaputtes XML. Jede dieser Dateien wird nicht gelesen: `rechnung` ist `null`, genau ein Befund.

import { describe, expect, it } from 'vitest';
import { STANDARD_MAX_TIEFE, STANDARD_MAX_ZEICHEN, xrechnungLesen } from './index';
import type { XRechnungLesung } from './index';
import { kosit, testdatei } from './testhilfen';

const UBL_KOPF =
  '<ubl:Invoice xmlns:ubl="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" ' +
  'xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">';

/** Abgewiesen mit genau diesem Code, ohne Rechnung. */
function abgewiesen(lesung: XRechnungLesung): string {
  expect(lesung.rechnung).toBeNull();
  expect(lesung.syntax).toBeNull();
  expect(lesung.befunde).toHaveLength(1);
  expect(lesung.befunde[0]?.schwere).toBe('fehler');
  return lesung.befunde[0]?.code ?? '';
}

describe('Entitäten und DOCTYPE', () => {
  it('weist „Billion Laughs“ ab, ohne zu expandieren', () => {
    const lesung = xrechnungLesen(testdatei('entitaet-billion-laughs.xml'));
    expect(abgewiesen(lesung)).toBe('xml-doctype');
    expect(lesung.befunde[0]?.ort).toMatchObject({ zeile: 3, spalte: 1 });
  });

  it('weist eine externe Entität (XXE) ab, ohne etwas zu laden', () => {
    expect(abgewiesen(xrechnungLesen(testdatei('entitaet-extern.xml')))).toBe('xml-doctype');
  });

  it('weist einen DOCTYPE auch ohne Entitäten ab', () => {
    const text = `<?xml version="1.0"?>\n<!DOCTYPE ubl:Invoice>\n${UBL_KOPF}<cbc:ID>1</cbc:ID></ubl:Invoice>`;
    expect(abgewiesen(xrechnungLesen(text))).toBe('xml-doctype');
  });

  it('löst eine nicht vordefinierte Entität ohne DTD nicht auf', () => {
    const text = `${UBL_KOPF}<cbc:ID>&xxe;</cbc:ID></ubl:Invoice>`;
    expect(abgewiesen(xrechnungLesen(text))).toBe('xml-entitaet');
  });

  it('löst die fünf vordefinierten Entitäten und Zeichenreferenzen auf', () => {
    const text = `${UBL_KOPF}<cbc:ID>A&amp;B &lt;1&gt; &quot;x&quot; &apos;y&apos; &#8364; &#x20AC;</cbc:ID></ubl:Invoice>`;
    expect(xrechnungLesen(text).rechnung?.rechnungsnummer).toBe(`A&B <1> "x" 'y' € €`);
  });
});

describe('Grenzen', () => {
  it('weist zu tiefe Verschachtelung ab, ohne den Stapel zu sprengen', () => {
    const tiefe = 100_000;
    const text = `${UBL_KOPF}${'<cbc:Note>'.repeat(tiefe)}${'</cbc:Note>'.repeat(tiefe)}</ubl:Invoice>`;
    const lesung = xrechnungLesen(text);
    expect(abgewiesen(lesung)).toBe('xml-zu-tief');
    expect(lesung.befunde[0]?.meldung).toContain(String(STANDARD_MAX_TIEFE));
  });

  it('liest eine echte Datei unter der Standardtiefe, weist sie mit kleinerer Grenze ab', () => {
    expect(xrechnungLesen(kosit('04.04a-INVOICE_ubl.xml')).rechnung).not.toBeNull();
    expect(abgewiesen(xrechnungLesen(kosit('04.04a-INVOICE_ubl.xml'), { maxTiefe: 4 }))).toBe('xml-zu-tief');
  });

  it('weist eine zu große Eingabe ab, bevor sie gelesen wird', () => {
    const text = kosit('01.01a-INVOICE_ubl.xml');
    expect(abgewiesen(xrechnungLesen(text, { maxZeichen: text.length - 1 }))).toBe('eingabe-zu-gross');
    expect(xrechnungLesen(text, { maxZeichen: text.length }).rechnung).not.toBeNull();
  });

  it('weist eine Eingabe über der Standardgrenze ab', () => {
    const text = `${UBL_KOPF}<cbc:Note>${'x'.repeat(STANDARD_MAX_ZEICHEN)}</cbc:Note></ubl:Invoice>`;
    expect(abgewiesen(xrechnungLesen(text))).toBe('eingabe-zu-gross');
  });
});

describe('Keine XRechnung', () => {
  it('weist eine fremde Wurzel ab (GAEB)', () => {
    expect(abgewiesen(xrechnungLesen(testdatei('fremde-wurzel.xml')))).toBe('keine-xrechnung');
  });

  it.each([
    ['leere Eingabe', ''],
    ['nur Text', 'Rechnung 4711'],
    ['nicht geschlossen', `${UBL_KOPF}<cbc:ID>1</cbc:ID>`],
    ['falsch verschachtelt', `${UBL_KOPF}<cbc:ID>1</ubl:Invoice></cbc:ID>`],
    ['Präfix ohne Namensraum', '<x:Invoice><x:ID>1</x:ID></x:Invoice>'],
    ['bares &', `${UBL_KOPF}<cbc:ID>A & B</cbc:ID></ubl:Invoice>`],
    ['zwei Wurzeln', `${UBL_KOPF}</ubl:Invoice>${UBL_KOPF}</ubl:Invoice>`],
  ])('weist kaputtes XML ab: %s', (_name, text) => {
    expect(abgewiesen(xrechnungLesen(text))).toBe('xml-ungueltig');
  });
});
