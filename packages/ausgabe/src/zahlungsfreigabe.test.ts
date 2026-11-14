// SPDX-License-Identifier: AGPL-3.0-or-later
// Zahlungsfreigabe im PDF der Rechnungsprüfung (Ticket 153, A5, D-72): Vertragsstrafe in der Abzugskette, nach dem
// Zahlbetrag beide Fälle des Skontos, Bauabzugsteuer „an das Finanzamt“, Auszahlung, Zahlungen und offener Betrag. Die
// Zahlen sind Eingaben, hier von Hand nach D-72 hergeleitet (der Druck rechnet nichts, A2).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Betrag, Kalenderdatum, Prozent, Rechnung, ZahlungId, Zahlungsstand } from '@tethys/vertrag';
import { baueRechnungspruefungModell, erzeugeRechnungspruefungPdf } from './index';
import type { BerichtBlock, BerichtZelle, RechnungspruefungEingabe } from './index';
import { alsText, liesPdf } from './pdftext';
import { schriftenAusDateien } from './schriften-node';
import { fixtureZustand } from './testhilfe/bau';
import { PRUEFUNG, RECHNUNG, auftragsLvAus } from './testhilfe/kernkette';

const schriften = schriftenAusDateien();
const normal = (t: string): string => t.replace(/\s+/g, ' ').trim();
const b = (t: string): Betrag => t as Betrag;
const auftragsLv = auftragsLvAus(fixtureZustand('winzig').zustand);

/**
 * Rechnung 2 freigegeben mit 22,25 €, Eingang 12.11.2026, 3 % Skonto in 14 Tagen, Bauabzugsteuer an, eine Teilzahlung von
 * 10,00 € am 20.11.2026.
 */
const rechnung: Rechnung = {
  ...RECHNUNG,
  freigabe: { zahlbetrag: b('22.25') },
  skonto: { satz: '3.00' as Prozent, fristTage: 14 },
  bauabzugsteuer: true,
  zahlungen: [{ id: 'zahlung-1' as ZahlungId, datum: '2026-11-20' as Kalenderdatum, betrag: b('10.00') }],
};

/**
 * Fristende 12.11. + 14 = 26.11.2026. Möglicher Skonto round(22,25 × 3 %) = round(0,6675) = 0,67. Mit Skonto:
 * Bauabzugsteuer round(21,58 × 15 %) = round(3,237) = 3,24, Auszahlung 22,25 − 0,67 − 3,24 = 18,34. Ohne Skonto:
 * round(22,25 × 15 %) = round(3,3375) = 3,34, Auszahlung 18,91. Die 10,00 € bis zum Fristende erreichen 18,34 nicht: nicht
 * verwirklicht, es gilt der Fall ohne Skonto. Offen 22,25 − 0,00 − 3,34 − 10,00 = 8,91.
 */
const zahlungsstand: Zahlungsstand = {
  zahlbetrag: b('22.25'),
  fristende: '2026-11-26' as Kalenderdatum,
  mitSkonto: { skonto: b('0.67'), bauabzugsteuer: b('3.24'), auszahlung: b('18.34') },
  ohneSkonto: { skonto: b('0.00'), bauabzugsteuer: b('3.34'), auszahlung: b('18.91') },
  skontoVerwirklicht: false,
  verwirklichterSkonto: b('0.00'),
  bauabzugsteuer: b('3.34'),
  auszahlung: b('18.91'),
  summeZahlungen: b('10.00'),
  offen: b('8.91'),
};

const eingabe: RechnungspruefungEingabe = {
  rechnung,
  auftragsLv,
  pruefung: { ...PRUEFUNG, zahlungsstand },
  datum: '2026-11-21',
};

const abschnitt = (m: ReturnType<typeof baueRechnungspruefungModell>, titel: string): BerichtBlock[] => [
  ...(m.abschnitte.find((a) => a.ueberschrift === titel)?.bloecke ?? []),
];
const texte = (z: string | BerichtZelle | undefined): string =>
  z === undefined ? '' : typeof z === 'string' ? z : z.werte.map((w) => w.text).join(' | ');
const felder = (bl: BerichtBlock | undefined): string[][] =>
  bl?.art === 'felder' ? bl.felder.map((f) => [f.bezeichnung, f.wert]) : [];

describe('Zahlungsfreigabe: Modell', () => {
  const m = baueRechnungspruefungModell(eingabe);
  const z = abschnitt(m, 'Zahlungsfreigabe');

  it('steht nach der Freigabe; die Unterschriftszeilen kommen ans Ende', () => {
    const titel = m.abschnitte.map((a) => a.ueberschrift);
    expect(titel.slice(-3)).toEqual(['Freigabe', 'Zahlungsfreigabe', null]);
    expect(abschnitt(m, 'Freigabe')).toHaveLength(1);
    const letzte = m.abschnitte.at(-1)?.bloecke ?? [];
    expect(letzte.map((x) => (x.art === 'absatz' ? x.text : ''))[0]).toContain(
      'Sachlich und rechnerisch richtig',
    );
  });

  it('zeigt beide Fälle des Skontos nebeneinander', () => {
    const t = z.find((x) => x.art === 'tabelle');
    if (t?.art !== 'tabelle') throw new Error('keine Tabelle');
    expect(t.spalten.map((s) => s.titel)).toEqual(['', 'Bei Zahlung bis 26.11.2026', 'Danach']);
    expect(t.zeilen.map((r) => r.zellen.map(texte))).toEqual([
      ['Zahlbetrag', '22,25', '22,25'],
      ['Skonto (3,00 %)', '−0,67', '0,00'],
      ['Bauabzugsteuer 15,00 % an das Finanzamt', '−3,24', '−3,34'],
      ['Auszahlung an den Auftragnehmer', '18,34', '18,91'],
    ]);
    expect(t.zeilen.at(-1)?.fett).toBe(true);
    const satz = z.find((x) => x.art === 'absatz' && x.text.startsWith('Bei Zahlung bis'));
    expect(satz).toEqual({
      art: 'absatz',
      text: 'Bei Zahlung bis 26.11.2026: Auszahlung 18,34 €, danach: 18,91 €.',
    });
  });

  it('führt den geltenden Fall bis zum offenen Betrag, mit den Zahlungen nach Datum', () => {
    const f = z.filter((x) => x.art === 'felder');
    expect(felder(f[0])).toEqual([
      ['Zahlbetrag (eingefroren)', '22,25 €'],
      // Keine Zahlung nach dem Fristende: Die Frist kann noch laufen, der Skonto ist nur „noch nicht“ verwirklicht.
      ['Skonto (noch nicht verwirklicht)', '0,00 €'],
      ['Bauabzugsteuer 15,00 % an das Finanzamt', '−3,34 €'],
      ['Auszahlung an den Auftragnehmer', '18,91 €'],
      ['Summe der Zahlungen', '−10,00 €'],
      ['Offen', '8,91 €'],
    ]);
    expect(z).toContainEqual({ art: 'liste', punkte: ['Zahlung vom 20.11.2026: 10,00 €'] });
  });

  it('nennt den verwirklichten Skonto, wenn die Zahlung in der Frist die Auszahlung mit Skonto erreicht', () => {
    const v = baueRechnungspruefungModell({
      ...eingabe,
      rechnung: {
        ...rechnung,
        zahlungen: [
          { id: 'z-2' as ZahlungId, datum: '2026-12-01' as Kalenderdatum, betrag: b('0.01') },
          { id: 'z-1' as ZahlungId, datum: '2026-11-26' as Kalenderdatum, betrag: b('18.34') },
        ],
      },
      pruefung: {
        ...PRUEFUNG,
        zahlungsstand: {
          ...zahlungsstand,
          skontoVerwirklicht: true,
          verwirklichterSkonto: b('0.67'),
          bauabzugsteuer: b('3.24'),
          auszahlung: b('18.34'),
          summeZahlungen: b('18.35'),
          offen: b('-0.01'),
        },
      },
    });
    const z2 = abschnitt(v, 'Zahlungsfreigabe');
    expect(felder(z2.find((x) => x.art === 'felder'))).toEqual([
      ['Zahlbetrag (eingefroren)', '22,25 €'],
      ['Skonto (verwirklicht)', '−0,67 €'],
      ['Bauabzugsteuer 15,00 % an das Finanzamt', '−3,24 €'],
      ['Auszahlung an den Auftragnehmer', '18,34 €'],
      ['Summe der Zahlungen', '−18,35 €'],
      ['Offen', '-0,01 €'],
    ]);
    expect(z2).toContainEqual({
      art: 'liste',
      punkte: ['Zahlung vom 26.11.2026: 18,34 €', 'Zahlung vom 01.12.2026: 0,01 €'],
    });
  });

  it('ohne Skonto und Bauabzugsteuer: nur Zahlbetrag, Auszahlung, Zahlungen und offen; vor der Freigabe als geprüft', () => {
    const ohne = baueRechnungspruefungModell({
      ...eingabe,
      rechnung: { ...RECHNUNG },
      pruefung: {
        ...PRUEFUNG,
        zahlungsstand: {
          zahlbetrag: b('22.25'),
          fristende: null,
          mitSkonto: { skonto: b('0.00'), bauabzugsteuer: b('0.00'), auszahlung: b('22.25') },
          ohneSkonto: { skonto: b('0.00'), bauabzugsteuer: b('0.00'), auszahlung: b('22.25') },
          skontoVerwirklicht: false,
          verwirklichterSkonto: b('0.00'),
          bauabzugsteuer: b('0.00'),
          auszahlung: b('22.25'),
          summeZahlungen: b('0.00'),
          offen: b('22.25'),
        },
      },
    });
    const z3 = abschnitt(ohne, 'Zahlungsfreigabe');
    expect(z3.some((x) => x.art === 'tabelle')).toBe(false);
    expect(felder(z3.find((x) => x.art === 'felder'))).toEqual([
      ['Zahlbetrag (geprüft, noch nicht freigegeben)', '22,25 €'],
      ['Auszahlung an den Auftragnehmer', '22,25 €'],
      ['Summe der Zahlungen', '0,00 €'],
      ['Offen', '22,25 €'],
    ]);
    expect(z3).toContainEqual({ art: 'absatz', text: 'Noch keine Zahlung erfasst.' });
  });

  it('Skonto ohne Eingangsdatum: kein zweiter Fall, ein Satz sagt warum', () => {
    const ohneEingang = baueRechnungspruefungModell({
      ...eingabe,
      rechnung: { ...rechnung, eingang: null },
      pruefung: {
        ...PRUEFUNG,
        zahlungsstand: {
          ...zahlungsstand,
          fristende: null,
          mitSkonto: zahlungsstand.ohneSkonto,
        },
      },
    });
    const z4 = abschnitt(ohneEingang, 'Zahlungsfreigabe');
    expect(z4.some((x) => x.art === 'tabelle')).toBe(false);
    expect(z4).toContainEqual({
      art: 'absatz',
      text: 'Skonto 3,00 % vereinbart, aber ohne Eingangsdatum gibt es keine Skontofrist und keinen Skonto.',
    });
  });

  it('ohne Zahlungsstand bleibt der Druck wie bisher (Freigabe mit Unterschriftszeilen, keine Zahlungsfreigabe)', () => {
    const alt = baueRechnungspruefungModell({ ...eingabe, rechnung: RECHNUNG, pruefung: PRUEFUNG });
    expect(alt.abschnitte.map((a) => a.ueberschrift)).not.toContain('Zahlungsfreigabe');
    expect(abschnitt(alt, 'Freigabe')).toHaveLength(3);
  });
});

describe('Vertragsstrafe in der Abzugskette', () => {
  it('steht mit Grund zwischen Umlagen und Einbehalt', () => {
    const m = baueRechnungspruefungModell({
      ...eingabe,
      rechnung: { ...rechnung, vertragsstrafe: { betrag: b('1.00'), grund: 'Zwischenfrist überschritten' } },
      pruefung: {
        ...PRUEFUNG,
        kette: { ...PRUEFUNG.kette, vertragsstrafe: b('1.00'), zahlbetrag: b('21.25') },
      },
    });
    const namen = felder(abschnitt(m, 'Abzugskette')[0]).map((f) => f.join(' '));
    expect(namen.slice(5, 8)).toEqual([
      'Umlage Bauwesenversicherung (0,50 %) −0,17 €',
      'Vertragsstrafe (Zwischenfrist überschritten) −1,00 €',
      'Sicherheitseinbehalt (5,00 %) −1,71 €',
    ]);
  });

  it('fehlt, wenn die Rechnung keine trägt und die Kette 0,00 nennt', () => {
    const m = baueRechnungspruefungModell({
      ...eingabe,
      rechnung: RECHNUNG,
      pruefung: { ...PRUEFUNG, kette: { ...PRUEFUNG.kette, vertragsstrafe: b('0.00') } },
    });
    expect(felder(abschnitt(m, 'Abzugskette')[0]).map((f) => f[0])).not.toContain('Vertragsstrafe');
  });
});

describe('Zahlungsfreigabe: PDF', () => {
  it('trägt beide Fälle, die Steuer an das Finanzamt, Zahlungen und den offenen Betrag im Seitentext', async () => {
    const t = normal(alsText(await liesPdf(await erzeugeRechnungspruefungPdf(eingabe, schriften))));
    for (const s of [
      'Zahlungsfreigabe',
      'Bei Zahlung bis 26.11.2026',
      'Skonto (3,00 %) −0,67 0,00',
      'Bauabzugsteuer 15,00 % an das Finanzamt −3,24 −3,34',
      'Auszahlung an den Auftragnehmer 18,34 18,91',
      'Bei Zahlung bis 26.11.2026: Auszahlung 18,34 €, danach: 18,91 €.',
      'Zahlung vom 20.11.2026: 10,00 €',
      'Summe der Zahlungen −10,00 €',
      'Offen 8,91 €',
      'Sachlich und rechnerisch richtig',
    ])
      expect(t, s).toContain(s);
  });
});

// --- Sollwerte aus `fixtures/typisch-zahlungen.json` (hergeleitet nach D-72, D-34; C4) ------------------------------------

interface Fixturekette {
  readonly leistung: Betrag;
  readonly nachlass: Betrag;
  readonly nettoNachNachlass: Betrag;
  readonly mwst: Betrag;
  readonly bruttoKumuliert: Betrag;
  readonly umlagen: RechnungspruefungEingabe['pruefung']['kette']['umlagen'];
  readonly vertragsstrafe: Betrag;
  readonly einbehalt: Betrag;
  readonly fruehereZahlbetraege: Betrag;
  readonly zahlbetrag: Betrag;
}
const fixture = JSON.parse(
  readFileSync(new URL('../../../fixtures/typisch-zahlungen.json', import.meta.url), 'utf8'),
) as {
  readonly rechnungen: readonly Rechnung[];
  readonly pruefungen: Readonly<
    Record<'ar1' | 'ar2', { readonly kette: Fixturekette; readonly zahlungsstand: Zahlungsstand }>
  >;
};

/** Die Eingabe des Drucks zu einer Rechnung der Fixture: Kette und Zahlungsstand unverändert, wie die App sie durchreicht. */
function ausFixture(nr: 1 | 2): RechnungspruefungEingabe {
  const r = fixture.rechnungen[nr - 1];
  const vorige = fixture.rechnungen[0];
  if (r === undefined || vorige === undefined) throw new Error('Rechnung fehlt in der Fixture');
  const { kette, zahlungsstand: zs } = fixture.pruefungen[nr === 1 ? 'ar1' : 'ar2'];
  return {
    rechnung: r,
    auftragsLv,
    pruefung: {
      leistungsstand: {
        positionen: [],
        leistung: kette.leistung,
        nachlass: kette.nachlass,
        nettoNachNachlass: kette.nettoNachNachlass,
      },
      kette: {
        ...kette,
        einbehalt: { art: 'sicherheit', satz: r.sicherheitSatz, betrag: kette.einbehalt },
        fruehere:
          nr === 1 || vorige.freigabe === null
            ? []
            : [{ rechnungId: vorige.id, nummer: 1, zahlbetrag: vorige.freigabe.zahlbetrag }],
      },
      forderung: null,
      zahlungsstand: zs,
    },
    datum: '2026-12-16',
  };
}

describe('Zahlungsfreigabe: Sollwerte der Fixture typisch-zahlungen', () => {
  it('AR 1: Skonto verwirklicht, Bauabzugsteuer an das Finanzamt, nichts offen', async () => {
    const t = normal(alsText(await liesPdf(await erzeugeRechnungspruefungPdf(ausFixture(1), schriften))));
    for (const s of [
      'Zahlbetrag 8.874,40 €',
      'Bei Zahlung bis 13.11.2026',
      'Skonto (3,00 %) −266,23 0,00',
      'Bauabzugsteuer 15,00 % an das Finanzamt −1.291,23 −1.331,16',
      'Auszahlung an den Auftragnehmer 7.316,94 7.543,24',
      'Bei Zahlung bis 13.11.2026: Auszahlung 7.316,94 €, danach: 7.543,24 €.',
      'Zahlbetrag (eingefroren) 8.874,40 €',
      'Skonto (verwirklicht) −266,23 €',
      'Bauabzugsteuer 15,00 % an das Finanzamt −1.291,23 €',
      'Auszahlung an den Auftragnehmer 7.316,94 €',
      'Summe der Zahlungen −7.316,94 €',
      'Offen 0,00 €',
      'Zahlung vom 13.11.2026: 7.316,94 €',
    ])
      expect(t, s).toContain(s);
    expect(t).not.toContain('Vertragsstrafe');
  });

  it('AR 2: Vertragsstrafe in der Kette, Zahlung nach der Frist, ohne Bauabzugsteuer, 570,67 offen', async () => {
    const t = normal(alsText(await liesPdf(await erzeugeRechnungspruefungPdf(ausFixture(2), schriften))));
    for (const s of [
      'Umlage Bauwesenversicherung (0,50 %) −100,24 € ' +
        'Vertragsstrafe (Zwischenfrist Rohbau um 3 Werktage überschritten (erfunden)) −1.500,00 € ' +
        'Sicherheitseinbehalt (5,00 %) −1.002,39 €',
      'Zahlbetrag Rechnung 1 (freigegeben) −8.874,40 €',
      'Zahlbetrag 8.570,67 €',
      'Bei Zahlung bis 07.12.2026',
      'Skonto (2,00 %) −171,41 0,00',
      'Auszahlung an den Auftragnehmer 8.399,26 8.570,67',
      // Die Zahlung vom 15.12. liegt nach dem Fristende 07.12.: Der Skonto ist endgültig nicht verwirklicht.
      'Skonto (nicht verwirklicht) 0,00 €',
      'Summe der Zahlungen −8.000,00 €',
      'Offen 570,67 €',
      'Zahlung vom 04.12.2026: 5.000,00 €',
      'Zahlung vom 15.12.2026: 3.000,00 €',
    ])
      expect(t, s).toContain(s);
    expect(t).not.toContain('Bauabzugsteuer 15,00 %');
  });
});
