// SPDX-License-Identifier: AGPL-3.0-or-later
// Abzüge und Zahlungen in der Rechnungsprüfung (Ticket 143, D-72, D-128.3 bis D-128.8, D-93): Golden-Tests gegen
// `typisch-zahlungen.json` (Sollwerte von Hand hergeleitet, im Selbsttest der Fixture eigens nachgerechnet), dazu kleine
// Hand-Beispiele mit Rechenweg für die Ränder (Basis ≤ 0, Schaltjahr, Jahreswechsel, Vorschlag der Vertragsstrafe).

import type { Betrag, Kalenderdatum, Prozent, Rechnung, ZahlungId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { rechnungPruefen } from './rechnung-pruefen';
import type { Abzugskette } from './rechnung-pruefen';
import { vertragsstrafeVorschlag, zahlungsstandBerechnen } from './zahlungsstand';
import type { FxZahlungen } from './testhilfen';
import { m4Stand, zahlungsFixture } from './testhilfen';

const fx = zahlungsFixture();
const m4 = m4Stand();
const [ar1, ar2] = fx.rechnungen as [Rechnung, Rechnung];

/** Die Kette in den Feldnamen der Fixture. */
function wieFixture(k: Abzugskette): FxZahlungen['pruefungen']['ar1']['kette'] {
  return {
    leistung: k.leistung,
    nachlass: k.nachlass,
    nettoNachNachlass: k.nettoNachNachlass,
    mwst: k.mwst,
    bruttoKumuliert: k.bruttoKumuliert,
    umlagen: k.umlagen.map((u) => ({ bezeichnung: u.bezeichnung, satz: u.satz, betrag: u.betrag })),
    vertragsstrafe: k.vertragsstrafe,
    einbehalt: k.einbehalt.betrag,
    fruehereZahlbetraege: k.fruehereZahlbetraege,
    zahlbetrag: k.zahlbetrag,
  };
}

/** AR 1 vor der Korrektur (Blatt 1), AR 2 nach der Korrektur (Blatt 1 korrigiert und Blatt 2), wie die Fixture sagt. */
const pruefeAr1 = (r: Rechnung) => rechnungPruefen(r, m4.auftrag, [m4.blatt1, m4.blatt2], [r, ar2]);
const pruefeAr2 = (r: Rechnung) => rechnungPruefen(r, m4.auftrag, [m4.blatt1Korrigiert, m4.blatt2], [ar1, r]);

describe('rechnungPruefen mit Abzügen und Zahlungen (typisch-zahlungen)', () => {
  it('AR 1: Skonto 3 % und Bauabzugsteuer, Zahlung am Fristende: verwirklicht, offen 0,00', () => {
    const p = pruefeAr1(ar1);
    expect(wieFixture(p.kette)).toEqual(fx.pruefungen.ar1.kette);
    expect(p.zahlungsstand).toEqual(fx.pruefungen.ar1.zahlungsstand);
    expect(p.befunde).toEqual(fx.pruefungen.ar1.befunde);
  });

  it('AR 2: Vertragsstrafe 1.500,00 vor dem Einbehalt, Zahlbetrag 8.570,67; Teilzahlung: kein Skonto, offen 570,67', () => {
    const p = pruefeAr2(ar2);
    expect(wieFixture(p.kette)).toEqual(fx.pruefungen.ar2.kette);
    expect(p.zahlungsstand).toEqual(fx.pruefungen.ar2.zahlungsstand);
    expect(p.befunde).toEqual(fx.pruefungen.ar2.befunde);
  });

  it.each(fx.varianten.map((v) => [v.name, v] as const))('Variante %s', (_name, v) => {
    const p = v.basis === 'ar1' ? pruefeAr1(v.rechnung) : pruefeAr2(v.rechnung);
    expect(p.zahlungsstand).toEqual(v.zahlungsstand);
    expect(p.befunde).toEqual(v.befunde);
  });

  it('Folgerechnungen lesen nur den eingefrorenen Zahlbetrag: Skonto, Steuer und Zahlungen von AR 1 wirken nicht auf AR 2', () => {
    const ohneA5 = { ...ar1 };
    delete ohneA5.skonto;
    delete ohneA5.bauabzugsteuer;
    delete ohneA5.zahlungen;
    const mit = rechnungPruefen(ar2, m4.auftrag, [m4.blatt1Korrigiert, m4.blatt2], [ar1, ar2]);
    const ohne = rechnungPruefen(ar2, m4.auftrag, [m4.blatt1Korrigiert, m4.blatt2], [ohneA5, ar2]);
    expect(mit.kette).toEqual(ohne.kette);
  });

  it('ohne Freigabe ist der Zahlungsstand eine Vorschau auf den geprüften Zahlbetrag', () => {
    const offen: Rechnung = { ...ar2, freigabe: null };
    delete (offen as { zahlungen?: unknown }).zahlungen;
    const p = pruefeAr2(offen);
    expect(p.zahlungsstand.zahlbetrag).toBe('8570.67');
    expect(p.zahlungsstand.mitSkonto.auszahlung).toBe('8399.26');
    expect(p.zahlungsstand.offen).toBe('8570.67');
  });
});

// --- Ränder, von Hand -------------------------------------------------------------------------------------------------

const zid = (n: number) => `019b7a43-5a00-7000-8000-0000000009${String(n).padStart(2, '0')}` as ZahlungId;
const zahlung = (n: number, datum: string, betrag: string) => ({
  id: zid(n),
  datum: datum as Kalenderdatum,
  betrag: betrag as Betrag,
});

describe('zahlungsstandBerechnen: Ränder', () => {
  const basis: Rechnung = { ...ar1, freigabe: { zahlbetrag: '100.00' as Betrag } };

  it('Bauabzugsteuer und Skonto 0,00 bei einem Zahlbetrag ≤ 0 (D-72, D-93); Zahlbetrag −20,00 ohne Zahlungen: kein Befund hier', () => {
    const r: Rechnung = { ...basis, freigabe: { zahlbetrag: '-20.00' as Betrag } };
    delete (r as { zahlungen?: unknown }).zahlungen;
    const { zahlungsstand, befunde } = zahlungsstandBerechnen(r, '-20.00' as Betrag);
    expect(zahlungsstand.mitSkonto).toEqual({ skonto: '0.00', bauabzugsteuer: '0.00', auszahlung: '-20.00' });
    expect(zahlungsstand.ohneSkonto).toEqual({
      skonto: '0.00',
      bauabzugsteuer: '0.00',
      auszahlung: '-20.00',
    });
    expect(zahlungsstand.skontoVerwirklicht).toBe(false);
    expect(zahlungsstand.offen).toBe('-20.00');
    expect(befunde).toEqual([]);
  });

  it('kein möglicher Skonto (0,01 × 3 % = 0,0003 → 0,00): nie verwirklicht, auch bei rechtzeitiger Zahlung', () => {
    const r: Rechnung = { ...basis, zahlungen: [zahlung(1, '2026-10-31', '0.01')] };
    delete (r as { bauabzugsteuer?: unknown }).bauabzugsteuer;
    const { zahlungsstand } = zahlungsstandBerechnen(r, '0.01' as Betrag);
    expect(zahlungsstand.mitSkonto.skonto).toBe('0.00');
    expect(zahlungsstand.skontoVerwirklicht).toBe(false);
    expect(zahlungsstand.offen).toBe('0.00');
  });

  it('Fristende über Monats-, Jahres- und Schalttag (Kalender ohne Uhr, A2)', () => {
    const ende = (eingang: string, fristTage: number) =>
      zahlungsstandBerechnen(
        { ...basis, eingang, skonto: { satz: '2.00' as Prozent, fristTage } },
        '100.00' as Betrag,
      ).zahlungsstand.fristende;
    expect(ende('2026-12-25', 10)).toBe('2027-01-04');
    expect(ende('2028-02-25', 5)).toBe('2028-03-01'); // 26., 27., 28., 29.02., 01.03.
    expect(ende('2027-02-25', 5)).toBe('2027-03-02');
    expect(ende('2100-02-28', 1)).toBe('2100-03-01');
    expect(ende('2026-01-01', 365)).toBe('2027-01-01');
  });

  it('Zahlungen bis zum Fristende zählen zusammen: zwei Teilzahlungen in der Frist erreichen die Auszahlung mit Skonto', () => {
    // 100,00 × 3 % = 3,00; Steuer (100,00 − 3,00) × 15 % = 14,55; Auszahlung 82,45 = 40,00 + 42,45.
    const r: Rechnung = {
      ...basis,
      zahlungen: [zahlung(1, '2026-11-02', '40.00'), zahlung(2, '2026-11-13', '42.45')],
    };
    const { zahlungsstand } = zahlungsstandBerechnen(r, '100.00' as Betrag);
    expect(zahlungsstand.mitSkonto).toEqual({ skonto: '3.00', bauabzugsteuer: '14.55', auszahlung: '82.45' });
    expect(zahlungsstand.skontoVerwirklicht).toBe(true);
    expect(zahlungsstand.offen).toBe('0.00');
    // Ein Cent zu wenig in der Frist: ohne Skonto, Steuer 15,00, Auszahlung 85,00, offen 85,00 − 82,44 = 2,56.
    const knapp = zahlungsstandBerechnen(
      { ...r, zahlungen: [zahlung(1, '2026-11-02', '40.00'), zahlung(2, '2026-11-13', '42.44')] },
      '100.00' as Betrag,
    ).zahlungsstand;
    expect(knapp.skontoVerwirklicht).toBe(false);
    expect([knapp.bauabzugsteuer, knapp.auszahlung, knapp.offen]).toEqual(['15.00', '85.00', '2.56']);
  });
});

describe('vertragsstrafeVorschlag', () => {
  const strafe = { betrag: '250.00' as Betrag, grund: 'Zwischenfrist überschritten' };
  const r = (nummer: number, mit: boolean, auftragsLvId = ar1.auftragsLvId): Rechnung => {
    const x: Rechnung = { ...ar1, id: `r${String(nummer)}` as Rechnung['id'], nummer, auftragsLvId };
    delete (x as { vertragsstrafe?: unknown }).vertragsstrafe;
    return mit ? { ...x, vertragsstrafe: strafe } : x;
  };

  it('die kumulierte Strafe der vorigen Rechnung (größte kleinere Nummer desselben Auftrags-LV), sonst null', () => {
    expect(vertragsstrafeVorschlag([], ar1.auftragsLvId, 1)).toBeNull();
    expect(vertragsstrafeVorschlag([r(1, true), r(2, false)], ar1.auftragsLvId, 3)).toBeNull();
    expect(vertragsstrafeVorschlag([r(2, true), r(1, false)], ar1.auftragsLvId, 3)).toEqual(strafe);
    expect(vertragsstrafeVorschlag([r(1, true), r(3, false)], ar1.auftragsLvId, 2)).toEqual(strafe);
    const fremd = r(1, true, 'anderes' as Rechnung['auftragsLvId']);
    expect(vertragsstrafeVorschlag([fremd], ar1.auftragsLvId, 2)).toBeNull();
  });
});
