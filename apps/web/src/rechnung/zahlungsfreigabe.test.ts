// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 152 (A5, D-72): Vertragsstrafe, Skonto, Bauabzugsteuer und Zahlungen auf dem Weg der App (Formular, Befehle,
// Speicher, `rechnungPruefen` aus `abrechnung`) gegen die Sollwerte von `fixtures/typisch-zahlungen.json` (Ticket 143,
// unabhängig hergeleitet): AR 1 mit 3 % Skonto und Bauabzugsteuer, Zahlung am Fristende (offen 0,00); AR 2 mit
// Vertragsstrafe 1.500,00 und 2 % Skonto, Teilzahlung in der Frist und Rest danach (offen 570,67).

import type { Rechnung, RechnungBefehl } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import {
  A5_BEFEHLE,
  A5_PRUEFUNGEN,
  A5_RECHNUNGEN,
  A5_VARIANTEN,
  M4_KORREKTUR,
  M4_NACHTRAG_LV,
  M4_RECHNUNGEN,
  m4Blatt,
  m4Nachtragsknoten,
} from '../../e2e/rechnung-fixture';
import { entwurfLesen, neuerEntwurf, rechnungAnlegenBefehl, type Rechnungsentwurf } from './entwurf';
import { freigabelage, kettenzeilen, pruefen, zahlungsfreigabe } from './pruefung';
import { rechnungenSitzung, rechnungsstandLaden, type RechnungenSitzung } from './rechnungen';
import { mitAuftrag, type Auftragsstand } from './testhilfen';
import { aufmassBefehlSchreiben, aufmassSchreiben, nachtragSchreiben } from './testpfad';

type Stand = Auftragsstand & { s: RechnungenSitzung };
const de = (b: string): string => b.replace('.', ',');

async function m4(): Promise<Stand> {
  const a = await mitAuftrag('b');
  const kopf = a.auftrag.auftragsLeistungsverzeichnis;
  const n = await nachtragSchreiben(a.u, kopf.id, M4_NACHTRAG_LV, m4Nachtragsknoten(kopf.id));
  if (!n.ok) throw new Error(`Nachtrag: ${n.fehler}`);
  const b = await aufmassSchreiben(a.u, m4Blatt(0, kopf.projektId, kopf.id));
  if (!b.ok) throw new Error(`Blatt 1: ${b.fehler}`);
  return { ...a, s: rechnungenSitzung(a.weg, kopf.projektId, []) };
}

async function stand(a: Auftragsstand) {
  const r = await rechnungsstandLaden(a.u.speicher, a.auftrag.auftragsLeistungsverzeichnis.id);
  if (!r.ok) throw new Error(r.fehler.meldung);
  return r.wert;
}

/** Legt die nächste Rechnung an wie der Prüfer im Formular: Vorschlag, darüber `aenderung`. */
async function anlegen(a: Stand, aenderung: Partial<Rechnungsentwurf>): Promise<Rechnung> {
  const st = await stand(a);
  const w = entwurfLesen({ ...neuerEntwurf(a.s.zustand, st.blaetter), ...aenderung });
  if (!w.ok) throw new Error(JSON.stringify(w.fehler));
  const kopf = a.auftrag.auftragsLeistungsverzeichnis;
  const b = rechnungAnlegenBefehl(a.u.ids.rechnung(), kopf.projektId, kopf.id, a.s.zustand, w.wert);
  const r = await a.s.befehl({ rechnungId: null, befehl: b });
  if (!r.ok) throw new Error(JSON.stringify(r.abweisung));
  return b.rechnung;
}

async function senden(a: Stand, r: Rechnung, bs: readonly RechnungBefehl[]): Promise<Rechnung> {
  for (const befehl of bs) {
    const x = await a.s.befehl({ rechnungId: r.id, befehl });
    if (!x.ok) throw new Error(JSON.stringify(x.abweisung));
  }
  const neu = a.s.zustand.find((x) => x.id === r.id);
  if (neu === undefined) throw new Error('weg');
  return neu;
}

const [fx1, fx2] = A5_RECHNUNGEN;
if (fx1 === undefined || fx2 === undefined) throw new Error('Fixture');
const m4ar1 = M4_RECHNUNGEN[0];
if (m4ar1 === undefined) throw new Error('Fixture');
const umlagen = m4ar1.umlagen.map((u) => ({ bezeichnung: u.bezeichnung, satz: de(u.satz) }));

/** AR 1 aus dem Formular (Eingang, Umlage, Sicherheitseinbehalt, 3 % / 14 Tage Skonto, Bauabzugsteuer), freigegeben. */
async function ar1Freigegeben(a: Stand): Promise<Rechnung> {
  const r = await anlegen(a, {
    eingang: '30.10.2026',
    umlagen,
    sicherheitSatz: de(m4ar1?.sicherheitSatz ?? ''),
    skontoSatz: '3,00',
    skontoFrist: '14',
    bauabzugsteuer: true,
  });
  const z = pruefen(r, await stand(a), a.s.zustand).kette.zahlbetrag;
  return senden(a, r, [{ art: 'RechnungFreigeben', zahlbetrag: z }]);
}

describe('Zahlungsfreigabe gegen typisch-zahlungen', () => {
  it('AR 1: beide Fälle des Skontos, Zahlung am Fristende verwirklicht ihn, offen 0,00', async () => {
    const a = await m4();
    const frei = await ar1Freigegeben(a);
    const vorZahlung = zahlungsfreigabe(frei, pruefen(frei, await stand(a), a.s.zustand).zahlungsstand);
    expect(vorZahlung.faelle?.bis).toBe('2026-11-13');
    expect(vorZahlung.faelle?.zeilen.map((z) => [z.bezeichnung, z.mit, z.ohne])).toEqual([
      ['Zahlbetrag', '8874.40', '8874.40'],
      ['Skonto (3,00 %)', '266.23', '0.00'],
      ['Bauabzugsteuer 15,00 % an das Finanzamt', '1291.23', '1331.16'],
      ['Auszahlung an den Auftragnehmer', '7316.94', '7543.24'],
    ]);
    expect(vorZahlung.zahlungen).toEqual([]);

    const ar1 = await senden(a, frei, A5_BEFEHLE.ar1.nachFreigabe);
    const p = pruefen(ar1, await stand(a), a.s.zustand);
    expect(p.zahlungsstand).toEqual(A5_PRUEFUNGEN.ar1.zahlungsstand);
    const zf = zahlungsfreigabe(ar1, p.zahlungsstand);
    expect(zf.geltend.map((z) => [z.bezeichnung, z.betrag])).toEqual([
      ['Zahlbetrag (eingefroren)', '8874.40'],
      ['Skonto (verwirklicht)', '266.23'],
      ['Bauabzugsteuer 15,00 % an das Finanzamt', '1291.23'],
      ['Auszahlung an den Auftragnehmer', '7316.94'],
      ['Summe der Zahlungen', '7316.94'],
      ['Offen', '0.00'],
    ]);
    expect(zf.zahlungen.map((z) => [z.datum, z.betrag])).toEqual([['2026-11-13', '7316.94']]);
    expect(ar1).toMatchObject({ skonto: fx1.skonto, bauabzugsteuer: true, zahlungen: fx1.zahlungen.map((z) => ({ datum: z.datum, betrag: z.betrag })) });
  });

  it('AR 1 mit Zahlung: „Freigabe aufheben“ gesperrt mit Erklärung (Q5, D-128.7)', async () => {
    const a = await m4();
    const ar1 = await senden(a, await ar1Freigegeben(a), A5_BEFEHLE.ar1.nachFreigabe);
    const lage = freigabelage(ar1, a.s.zustand);
    expect(lage).toMatchObject({ art: 'freigegeben', aufhebbar: false });
    expect(lage.grund).toBe('Zur Rechnung 1 ist 1 Zahlung erfasst. Zuerst die Zahlungen löschen.');
  });

  it('AR 2: Vertragsstrafe als Zeile der Kette, Vorschlag aus AR 1, Teilzahlung in der Frist: offen 570,67', async () => {
    const a = await m4();
    await senden(a, await ar1Freigegeben(a), A5_BEFEHLE.ar1.nachFreigabe);
    const kopf = a.auftrag.auftragsLeistungsverzeichnis;
    const b2 = await aufmassSchreiben(a.u, m4Blatt(1, kopf.projektId, kopf.id));
    expect(b2.ok).toBe(true);
    const blatt1 = (await stand(a)).blaetter.find((b) => b.nummer === 1);
    if (blatt1 === undefined) throw new Error('Blatt 1');
    expect((await aufmassBefehlSchreiben(a.u, blatt1.id, M4_KORREKTUR)).ok).toBe(true);

    // Vorschlag aus AR 1: Skonto 3 % / 14 Tage und Bauabzugsteuer; keine Vertragsstrafe (AR 1 hatte keine).
    const st = await stand(a);
    expect(neuerEntwurf(a.s.zustand, st.blaetter)).toMatchObject({
      skontoSatz: '3,00',
      skontoFrist: '14',
      bauabzugsteuer: true,
      vertragsstrafeBetrag: '',
    });
    const strafe = fx2.vertragsstrafe;
    if (strafe === undefined) throw new Error('Fixture');
    const r = await anlegen(a, {
      eingang: '27.11.2026',
      vertragsstrafeBetrag: de(strafe.betrag),
      vertragsstrafeGrund: strafe.grund,
      skontoSatz: '2,00',
      skontoFrist: '10',
      bauabzugsteuer: false,
    });
    const p = pruefen(r, await stand(a), a.s.zustand);
    const k = A5_PRUEFUNGEN.ar2.kette;
    const zeilen = kettenzeilen(p.kette, r.vertragsstrafe);
    expect(zeilen.map((z) => [z.schluessel, z.betrag])).toEqual([
      ['leistung', k.leistung],
      ['nachlass', k.nachlass],
      ['nettoNachNachlass', k.nettoNachNachlass],
      ['mwst', k.mwst],
      ['bruttoKumuliert', k.bruttoKumuliert],
      ['umlage-0', k.umlagen[0]?.betrag],
      ['vertragsstrafe', k.vertragsstrafe],
      ['einbehalt', k.einbehalt],
      ['frueher-1', k.fruehereZahlbetraege],
      ['zahlbetrag', k.zahlbetrag],
    ]);
    expect(zeilen.find((z) => z.schluessel === 'vertragsstrafe')).toMatchObject({
      bezeichnung: `Vertragsstrafe (${strafe.grund})`,
      zeichen: '−',
    });

    // Vorschau vor der Freigabe: vom geprüften Zahlbetrag aus.
    expect(zahlungsfreigabe(r, p.zahlungsstand).geltend[0]).toEqual({
      schluessel: 'zahlbetrag',
      bezeichnung: 'Zahlbetrag (geprüft, noch nicht freigegeben)',
      betrag: k.zahlbetrag,
      zeichen: '',
    });

    const ar2 = await senden(a, r, [{ art: 'RechnungFreigeben', zahlbetrag: p.kette.zahlbetrag }, ...A5_BEFEHLE.ar2.nachFreigabe]);
    const zs = pruefen(ar2, await stand(a), a.s.zustand).zahlungsstand;
    expect(zs).toEqual(A5_PRUEFUNGEN.ar2.zahlungsstand);
    expect(zahlungsfreigabe(ar2, zs).geltend.map((z) => [z.schluessel, z.betrag])).toEqual([
      ['zahlbetrag', '8570.67'],
      ['skonto', '0.00'],
      ['auszahlung', '8570.67'],
      ['summeZahlungen', '8000.00'],
      ['offen', '570.67'],
    ]);
    expect(zahlungsfreigabe(ar2, zs).geltend[1]?.bezeichnung).toBe('Skonto (nicht verwirklicht)');
  });
});

describe('zahlungsfreigabe: Varianten der Fixture', () => {
  const variante = (name: string) => {
    const v = A5_VARIANTEN.find((x) => x.name === name);
    if (v === undefined) throw new Error(name);
    return zahlungsfreigabe(v.rechnung, v.zahlungsstand);
  };

  it('ohne neue Felder: keine Fälle, nur Zahlbetrag, Auszahlung, Summe der Zahlungen, offen', () => {
    const z = variante('ar1-ohne-neue-felder');
    expect(z.faelle).toBeNull();
    expect(z.ohneEingang).toBe(false);
    expect(z.geltend.map((x) => [x.schluessel, x.betrag])).toEqual([
      ['zahlbetrag', '8874.40'],
      ['auszahlung', '8874.40'],
      ['summeZahlungen', '0.00'],
      ['offen', '8874.40'],
    ]);
  });

  it('Skonto ohne Eingangsdatum: keine Fälle, ein Hinweis statt des zweiten Falls', () => {
    const z = variante('ar2-ohne-eingang');
    expect(z.faelle).toBeNull();
    expect(z.ohneEingang).toBe(true);
  });

  it('Zahlung nach Fristende: Skonto nicht verwirklicht, Steuer des Falls ohne Skonto, offen 226,30', () => {
    const z = variante('ar1-zahlung-nach-fristende');
    expect(z.geltend.map((x) => [x.schluessel, x.betrag])).toEqual([
      ['zahlbetrag', '8874.40'],
      ['skonto', '0.00'],
      ['bauabzugsteuer', '1331.16'],
      ['auszahlung', '7543.24'],
      ['summeZahlungen', '7316.94'],
      ['offen', '226.30'],
    ]);
  });
});
