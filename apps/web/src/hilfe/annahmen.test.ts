// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Seite „Annahmen“ (Ticket 147, G-62): Sie nennt mindestens die Punkte aus `umfang-welle-7.md` §5, in einfachen Sätzen.
// Die erwarteten Angaben stammen aus den Entscheidungen, auf die §5 verweist (Schwellen, Reihenfolgen, Stellen), nicht aus
// den Texten selbst. Anrede, Kennungen und Schreibung prüft der Sprachtest (`sprache.test.ts`).

import { describe, expect, it } from 'vitest';
import { texte } from './texte';

const abschnitte = texte.annahmen.abschnitte;
const text = (titel: string): string => {
  const a = abschnitte.find((x) => x.titel === titel);
  if (a === undefined) throw new Error(`Abschnitt „${titel}“ fehlt`);
  return a.saetze.join(' ');
};

describe('Seite „Annahmen“', () => {
  it('hat die Abschnitte aus §5 in dieser Reihenfolge', () => {
    expect(abschnitte.map((a) => a.titel)).toEqual([
      'Preisspiegel',
      'Zuschlag',
      'Nachtrag',
      'Soll/Ist',
      'Rechnungsprüfung',
      'Kostenkontrolle',
      'Rundung',
      'Mengenermittlung',
      'Honorar (Vorschau)',
      'Was nicht übernommen wird',
    ]);
  });

  it('Preisspiegel: Min, Mittel und Max nur über Preise über 0,00, Ausreißer ab 20 %, ABC-Klassen 80/95 %, ein Nachlass je Angebot', () => {
    const t = text('Preisspiegel');
    for (const teil of [
      'Min',
      'Mittel',
      'Max',
      '0,00',
      'nicht angeboten',
      '20 %',
      'ABC',
      '80 %',
      '95 %',
      'Nachlass',
    ]) {
      expect(t, teil).toContain(teil);
    }
  });

  it('Preisspiegel: Ausreißer vergleichen den Einheitspreis (EP), der Bezug der ABC-Klasse lässt sich auf den Schätzpreis umschalten', () => {
    const t = text('Preisspiegel');
    expect(t).toMatch(/Ausreißer[^.]*Einheitspreis \(EP\)/);
    expect(t).toMatch(/ABC[^.]*Schätzpreis/);
  });

  it('Zuschlag: nur das Beauftragte, die gewählte Wahlposition wird zur normalen Position', () => {
    const t = text('Zuschlag');
    expect(t).toContain('nur das Beauftragte');
    expect(t).toContain('Wahlposition');
    expect(t).toContain('normalen Position');
  });

  it('Nachtrag: eigenes LV, nach dem Beauftragen als Gliederung im Auftrags-LV, Nachlass des Hauptauftrags', () => {
    const t = text('Nachtrag');
    for (const teil of ['eigenes LV', 'Gliederung', 'Auftrags-LV', 'Nachlass des Hauptauftrags']) {
      expect(t, teil).toContain(teil);
    }
  });

  it('Soll/Ist: Schwellen 110 % und 90 % nach VOB/B § 2 Abs. 3', () => {
    const t = text('Soll/Ist');
    for (const teil of ['110 %', '90 %', 'VOB/B § 2 Abs. 3']) expect(t, teil).toContain(teil);
  });

  it('Rechnungsprüfung: die Abzugskette in ihrer Reihenfolge, eingefrorene Zahlbeträge und das Risiko nach § 48 EStG', () => {
    const t = text('Rechnungsprüfung');
    const kette = [
      'Leistung',
      'Nachlass',
      'Netto nach Nachlass',
      'MwSt',
      'Brutto kumuliert',
      'Umlagen',
      'Vertragsstrafe',
      'Einbehalt',
      'Frühere Zahlbeträge',
      'Zahlbetrag',
      'Skonto',
      'Bauabzugsteuer',
      'Auszahlung',
    ];
    const reihe = abschnitte.find((a) => a.titel === 'Rechnungsprüfung')?.kette ?? [];
    expect(reihe.map((s) => kette.find((k) => s.startsWith(k)) ?? s)).toEqual(kette);
    for (const teil of ['eingefroren', '§ 48 EStG', '15 %', 'Aufrechnungen', 'Kalendertagen']) {
      expect(t, teil).toContain(teil);
    }
  });

  it('Rechnungsprüfung: die Vertragsstrafe ist kumuliert einzutragen und wird aus der vorigen Rechnung vorgeschlagen (D-72)', () => {
    const t = text('Rechnungsprüfung');
    expect(t).toMatch(/Vertragsstrafe[^.]*kumuliert/);
    expect(t).toMatch(/vorige[n]? Rechnung[^.]*vorgeschlagen|vorgeschlagen[^.]*vorige[n]? Rechnung/);
    const reihe = abschnitte.find((a) => a.titel === 'Rechnungsprüfung')?.kette ?? [];
    expect(reihe.find((s) => s.startsWith('Vertragsstrafe'))).toContain('kumuliert');
  });

  it('Kostenkontrolle: netto, Nachlass als eigene Zeile, eine Kostengruppe je Position', () => {
    const t = text('Kostenkontrolle');
    for (const teil of ['netto', 'eigene Zeile', 'eine Kostengruppe']) expect(t, teil).toContain(teil);
  });

  it('Rundung: kaufmännisch, EP mit 3 Stellen, negative Werte nach dem Betrag (−2,5 wird −3)', () => {
    const t = text('Rundung');
    for (const teil of ['kaufmännisch', 'Einheitspreis 3', '−2,5', '−3']) expect(t, teil).toContain(teil);
  });

  it('Mengenermittlung: welche Formeln gerechnet werden, Dezimalkomma', () => {
    const t = text('Mengenermittlung');
    for (const teil of ['Formel 91', 'Dezimalkomma']) expect(t, teil).toContain(teil);
  });

  it('Honorar: HOAI 2021, Tafeln und Rundung der App, nicht amtlich geprüft', () => {
    const t = text('Honorar (Vorschau)');
    for (const teil of ['HOAI 2021', 'Rundung', 'nicht gegen die amtliche Fassung']) {
      expect(t, teil).toContain(teil);
    }
  });

  it('Was nicht übernommen wird: die Liste nach Welle 7 und die GAEB-Angaben ohne Platz im Datenmodell', () => {
    const t = text('Was nicht übernommen wird');
    for (const teil of [
      'Nebenangebote',
      'Losen',
      'mehrere Kostengruppen',
      '§ 650c',
      'ZUGFeRD',
      'Nachlass je Position',
    ]) {
      expect(t, teil).toContain(teil);
    }
  });
});
