// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests des XRechnung-Lesers (Ticket 76, Q1). Die Orakel rechnen unabhängig vom Leser: Beträge sind ganze Cent
// (`bigint`) im Test; Text und Erwartungswert entstehen hier.

import { alsBetrag, alsDezimal } from '@tethys/dezimal';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { xrechnungLesen } from './index';
import type { Rechnungsposition } from './index';
import { kosit } from './testhilfen';

const runs = { numRuns: 200 };

/** Kanonischer Betragstext aus ganzen Cent, ohne `dezimal`. */
function centText(cent: bigint): string {
  const neg = cent < 0n;
  const abs = neg ? -cent : cent;
  return `${neg ? '-' : ''}${(abs / 100n).toString()}.${(abs % 100n).toString().padStart(2, '0')}`;
}

/** Kleinste CII-Rechnung: Positionen mit Nettobetrag, BT-106 wie angegeben, Steuer 0, Rest passend zu BT-106. */
function cii(positionen: readonly bigint[], bt106: bigint): string {
  const zeilen = positionen
    .map(
      (cent, i) =>
        `<ram:IncludedSupplyChainTradeLineItem><ram:AssociatedDocumentLineDocument><ram:LineID>${String(i + 1)}` +
        `</ram:LineID></ram:AssociatedDocumentLineDocument><ram:SpecifiedLineTradeSettlement>` +
        `<ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${centText(cent)}` +
        `</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation></ram:SpecifiedLineTradeSettlement>` +
        `</ram:IncludedSupplyChainTradeLineItem>`,
    )
    .join('');
  const s = centText(bt106);
  return (
    '<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" ' +
    'xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" ' +
    'xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">' +
    '<rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>' +
    'urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</ram:ID>' +
    '</ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext>' +
    '<rsm:ExchangedDocument><ram:ID>P-1</ram:ID><ram:TypeCode>380</ram:TypeCode><ram:IssueDateTime>' +
    '<udt:DateTimeString format="102">20261111</udt:DateTimeString></ram:IssueDateTime></rsm:ExchangedDocument>' +
    `<rsm:SupplyChainTradeTransaction>${zeilen}<ram:ApplicableHeaderTradeSettlement>` +
    '<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode><ram:SpecifiedTradeSettlementHeaderMonetarySummation>' +
    `<ram:LineTotalAmount>${s}</ram:LineTotalAmount><ram:TaxBasisTotalAmount>${s}</ram:TaxBasisTotalAmount>` +
    `<ram:GrandTotalAmount>${s}</ram:GrandTotalAmount><ram:DuePayableAmount>${s}</ram:DuePayableAmount>` +
    '</ram:SpecifiedTradeSettlementHeaderMonetarySummation></ram:ApplicableHeaderTradeSettlement>' +
    '</rsm:SupplyChainTradeTransaction></rsm:CrossIndustryInvoice>'
  );
}

const centGen = fc.bigInt({ min: -10_000_000n, max: 10_000_000n });

describe('Summenprüfung', () => {
  it('hängt nicht von der Reihenfolge der Positionen ab und meldet BT-106 genau bei Abweichung', () => {
    fc.assert(
      fc.property(
        fc.array(centGen, { minLength: 1, maxLength: 30 }),
        fc.option(centGen, { nil: null }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (cents, abweichung, saat) => {
          const summe = cents.reduce((a, b) => a + b, 0n);
          const bt106 = abweichung === null ? summe : summe + abweichung;
          // Durchmischen (Fisher-Yates mit fester Saat), unabhängig vom Leser.
          const gemischt = [...cents];
          let z = saat;
          for (let i = gemischt.length - 1; i > 0; i--) {
            z = (z * 1_103_515_245 + 12_345) % 2_147_483_648;
            const j = z % (i + 1);
            [gemischt[i], gemischt[j]] = [gemischt[j] ?? 0n, gemischt[i] ?? 0n];
          }
          const vorher = xrechnungLesen(cii(cents, bt106));
          const nachher = xrechnungLesen(cii(gemischt, bt106));
          expect(nachher.befunde).toEqual(vorher.befunde);
          const gemeldet = vorher.befunde.some((b) => b.code === 'summe-positionen-falsch');
          expect(gemeldet).toBe(bt106 !== summe);
          expect(vorher.befunde.filter((b) => b.code !== 'summe-positionen-falsch')).toEqual([]);
        },
      ),
      runs,
    );
  });
});

describe('Robustheit', () => {
  /** Jeder gelesene Betrag ist kanonisch, jede Menge ein kanonischer Dezimaltext. */
  function pruefeWerte(p: Rechnungsposition): void {
    if (p.nettobetrag !== null) expect(alsBetrag(p.nettobetrag).ok).toBe(true);
    if (p.menge !== null) expect(alsDezimal(p.menge).ok).toBe(true);
    p.unterpositionen.forEach(pruefeWerte);
  }

  it('stürzt bei beliebigem Text nicht ab', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary', maxLength: 400 }), (text) => {
        const lesung = xrechnungLesen(text);
        expect(Array.isArray(lesung.befunde)).toBe(true);
        if (lesung.rechnung === null) expect(lesung.befunde.length).toBeGreaterThan(0);
      }),
      { numRuns: 1000 },
    );
  });

  it('stürzt bei XML-artigem Text nicht ab', () => {
    const baustein = fc.constantFrom(
      '<',
      '>',
      '/>',
      '</',
      '&',
      ';',
      '&amp;',
      '&#x0;',
      '&#65;',
      '"',
      "'",
      '=',
      ':',
      'xmlns="',
      'xmlns:ram="',
      'ram:',
      'cbc:',
      'Invoice',
      'ID',
      '<!--',
      '-->',
      '<![CDATA[',
      ']]>',
      '<?',
      '?>',
      '<!DOCTYPE',
      ' ',
      '12.345',
      '-0',
    );
    fc.assert(
      fc.property(fc.array(baustein, { maxLength: 80 }), (teile) => {
        expect(() => xrechnungLesen(teile.join(''))).not.toThrow();
      }),
      { numRuns: 1000 },
    );
  });

  it('stürzt bei verstümmelten echten Dateien nicht ab; was gelesen wird, ist kanonisch', () => {
    const quellen = [kosit('01.01a-INVOICE_ubl.xml'), kosit('01.01a-INVOICE_uncefact.xml')];
    fc.assert(
      fc.property(
        fc.constantFrom(...quellen),
        fc.array(
          fc.record({
            stelle: fc.nat(),
            loeschen: fc.nat({ max: 20 }),
            einfuegen: fc.constantFrom('', '<', '>', '&', '9', '.', '-', ',', '</cbc:ID>', '<ram:ID>', 'x'),
          }),
          { minLength: 1, maxLength: 5 },
        ),
        (quelle, eingriffe) => {
          let text = quelle;
          for (const e of eingriffe) {
            const p = e.stelle % (text.length + 1);
            text = text.slice(0, p) + e.einfuegen + text.slice(p + e.loeschen);
          }
          const lesung = xrechnungLesen(text);
          const r = lesung.rechnung;
          if (r === null) return;
          const summen: Record<string, string | null> = { ...r.summen };
          for (const b of Object.values(summen)) if (b !== null) expect(alsBetrag(b).ok).toBe(true);
          r.positionen.forEach(pruefeWerte);
        },
      ),
      runs,
    );
  });

  it('liest jede Schreibweise eines Betrags wie das Orakel (Vorzeichen, Nullen, fehlende Stellen)', () => {
    fc.assert(
      fc.property(
        centGen,
        fc.constantFrom('', '0', '00'),
        fc.boolean(),
        fc.constantFrom('', '0', '000'),
        (cent, fuehrend, plus, haengend) => {
          const kanon = centText(cent);
          const neg = kanon.startsWith('-');
          const ohne = neg ? kanon.slice(1) : kanon;
          const text = `${neg ? '-' : plus ? '+' : ''}${fuehrend}${ohne}${haengend}`;
          const lesung = xrechnungLesen(
            cii([cent], cent).replace(`<ram:LineTotalAmount>${kanon}<`, `<ram:LineTotalAmount>${text}<`),
          );
          expect(lesung.rechnung?.positionen[0]?.nettobetrag).toBe(kanon);
          const nichtKanonisch = lesung.befunde.some((b) => b.code === 'betrag-nicht-kanonisch');
          expect(nichtKanonisch).toBe(haengend !== '');
        },
      ),
      runs,
    );
  });
});
