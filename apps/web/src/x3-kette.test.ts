// SPDX-License-Identifier: AGPL-3.0-or-later
// Tor X3 (Ticket 119, D-58): die Kette der Honorarberechnung ohne Oberfläche, mit den Paketen so, wie die App sie ruft.
// Kostenberechnung aus `fixtures/honorar.json` (KG 300 und KG 400 aus den Einträgen) → Honorarberechnung mit Verweis auf sie
// (gespeicherte Form, D-110.8) über Befehlsweg und Speicher → Neuladen aus dem Speicher → `honorarBerechnen` mit allen
// Kostenermittlungen des Projekts → Tafelzeilen, Spanne, Honorar, Phasen, Zuschläge, Netto, MwSt und Brutto gleich den
// Sollwerten der Fixture; dazu Undo, Befunde der Stufe, fester Hinweis zu DIN 276 und das PDF.
//
// Jede erwartete Zahl steht in `fixtures/honorar.json` (Ticket 112, von Hand hergeleitet), nie aus einem Lauf der Pakete.
// Die Fixture wird gelesen, nicht importiert (A3). Der Test mit der Oberfläche steht in `e2e/x3.spec.ts`.

import { readFileSync } from 'node:fs';
import { honorarBerechnen } from '@tethys/honorar';
import type {
  Honorarberechnung,
  Honorarergebnis,
  Honorarobjekt,
  Kostenermittlung,
  Kostenermittlungseintrag,
  Kostenermittlungsstufe,
  Prozent,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { alsText, liesPdf } from '../../../packages/ausgabe/src/pdftext';
import { befehlswegFuer, projektSitzung } from './lv/befehlsweg';
import { kostenermittlungAnlegenBefehl } from './kosten/befehle';
import { kostenermittlungSitzung } from './kosten/schreiben';
import { projektAnlegenBefehl } from './projekt/befehle';
import { speicherImSpeicher, testUmgebung } from './testhilfen';
import { ergebnisAnsicht } from './honorar/ansicht';
import { DIN276_HINWEIS } from './honorar/texte';
import {
  ergebnisBerechnen,
  honorarberechnungNeu,
  honorarberechnungSitzung,
  honorarberechnungenLaden,
  kostenermittlungenDesProjekts,
} from './honorar/schreiben';

interface FxObjekt {
  readonly bezeichnung: string;
  readonly leistungsbild: Honorarobjekt['leistungsbild'];
  readonly honorarzone: Honorarobjekt['honorarzone'];
  readonly honorarsatz: string;
  readonly anrechenbareKosten: {
    readonly art: 'din-276';
    readonly kg300: string;
    readonly kg400: string;
    readonly technischeAnlagenAnteilig: boolean;
    readonly weitereKosten: string;
    readonly mitzuverarbeitendeBausubstanz: string;
  };
  readonly leistungsphasen: Honorarobjekt['leistungsphasen'];
  readonly umbauzuschlagssatz: string;
}
interface Fx {
  readonly kostenermittlung: {
    readonly stufe: Kostenermittlungsstufe;
    readonly name: string;
    readonly eintraege: readonly Kostenermittlungseintrag[];
  };
  readonly ausKostenermittlung: { readonly kg300: string; readonly kg400: string };
  readonly honorarberechnung: {
    readonly name: string;
    readonly objekte: readonly FxObjekt[];
    readonly nebenkosten: Honorarberechnung['nebenkosten'];
    readonly mwstSatz: Prozent;
  };
  readonly sollwerte: Honorarergebnis;
}
const fx = JSON.parse(readFileSync(new URL('../../../fixtures/honorar.json', import.meta.url), 'utf8')) as Fx;
const SOLL = fx.sollwerte;

/** Die Schriften des PDF: die vier Schnitte aus dem Paket `ausgabe` (wie der Worker der App sie lädt). */
function schriften() {
  const lies = (n: string): Uint8Array =>
    new Uint8Array(readFileSync(new URL(`../../../packages/ausgabe/schriften/${n}.woff`, import.meta.url)));
  return {
    normal: lies('noto-sans-latin-400-normal'),
    fett: lies('noto-sans-latin-700-normal'),
    kursiv: lies('noto-sans-latin-400-italic'),
    fettKursiv: lies('noto-sans-latin-700-italic'),
  };
}

async function aufbau() {
  const speicher = await speicherImSpeicher();
  const u = testUmgebung(speicher);
  const p = await projektSitzung(u, null).befehl(projektAnlegenBefehl(u.ids, 'Bürogebäude', 'Bauherr'));
  if (!p.ok || p.zustand === null) throw new Error('Projekt');
  const projekt = p.zustand;
  const ke = kostenermittlungAnlegenBefehl(
    u.ids,
    projekt.id,
    fx.kostenermittlung.name,
    fx.kostenermittlung.stufe,
    fx.kostenermittlung.eintraege,
  );
  const k = await kostenermittlungSitzung(u, projekt.id, null).befehl(ke);
  if (!k.ok) throw new Error('Kostenermittlung');
  return { speicher, u, projekt, kostenermittlungId: ke.kostenermittlung.id, weg: befehlswegFuer(u) };
}

/** Die gespeicherte Form des Objekts (D-110.8): Verweis auf die Kostenermittlung statt der Beträge KG 300 und KG 400. */
const gespeichert = (o: FxObjekt, kostenermittlungId: Honorarberechnung['id'] | string): Honorarobjekt =>
  ({
    bezeichnung: o.bezeichnung,
    leistungsbild: o.leistungsbild,
    honorarzone: o.honorarzone,
    honorarsatz: o.honorarsatz,
    anrechenbareKosten: {
      art: 'kostenermittlung',
      kostenermittlungId,
      technischeAnlagenAnteilig: o.anrechenbareKosten.technischeAnlagenAnteilig,
      weitereKosten: o.anrechenbareKosten.weitereKosten,
      mitzuverarbeitendeBausubstanz: o.anrechenbareKosten.mitzuverarbeitendeBausubstanz,
    },
    leistungsphasen: o.leistungsphasen,
    umbauzuschlagssatz: o.umbauzuschlagssatz,
  }) as unknown as Honorarobjekt;

async function berechnungAnlegen(a: Awaited<ReturnType<typeof aufbau>>) {
  const objekte = fx.honorarberechnung.objekte.map((o) => gespeichert(o, a.kostenermittlungId));
  const befehl = honorarberechnungNeu(
    a.u.ids,
    a.projekt.id,
    fx.honorarberechnung.name,
    objekte,
    fx.honorarberechnung.nebenkosten,
    fx.honorarberechnung.mwstSatz,
  );
  const s = honorarberechnungSitzung(a.u, a.projekt.id, null);
  const r = await s.befehl(befehl);
  if (!r.ok || r.zustand === null) throw new Error('Honorarberechnung');
  return { s, zustand: r.zustand };
}

async function neuGeladen(a: Awaited<ReturnType<typeof aufbau>>) {
  const h = await honorarberechnungenLaden(a.speicher, a.projekt.id);
  const k = await kostenermittlungenDesProjekts(a.speicher, a.projekt.id);
  if (!h.ok || !k.ok) throw new Error('Laden');
  return { berechnungen: h.wert.map((z) => z.honorarberechnung), kostenermittlungen: k.wert };
}

describe('Tor X3: Honorarberechnung aus der Kostenberechnung', () => {
  it('die Kostenberechnung der Fixture liefert KG 300 und KG 400 der Sollwerte (Eingabe der Herleitung)', async () => {
    const a = await aufbau();
    const { kostenermittlungen } = await neuGeladen(a);
    expect(kostenermittlungen).toHaveLength(1);
    const summe = (anfang: string): string => {
      const c = (kostenermittlungen[0] as Kostenermittlung).eintraege
        .filter((e) => e.nummer.startsWith(anfang))
        .reduce((s, e) => s + BigInt(e.betrag.replace('.', '')), 0n);
      return `${(c / 100n).toString()}.${(c % 100n).toString().padStart(2, '0')}`;
    };
    expect(summe('3')).toBe(fx.ausKostenermittlung.kg300);
    expect(summe('4')).toBe(fx.ausKostenermittlung.kg400);
  });

  it('nach dem Neuladen aus dem Speicher: alle Sollwerte, keine Befunde', async () => {
    const a = await aufbau();
    await berechnungAnlegen(a);
    const { berechnungen, kostenermittlungen } = await neuGeladen(a);
    expect(berechnungen).toHaveLength(1);
    const e = ergebnisBerechnen(berechnungen[0] as Honorarberechnung, kostenermittlungen);
    expect(e).toEqual(SOLL);
    expect(e.brutto).toBe('267595.90');
    expect(e.befunde).toEqual([]);
    // dieselbe Rechnung ohne die App-Hülle
    expect(honorarBerechnen(berechnungen[0] as Honorarberechnung, kostenermittlungen)).toEqual(SOLL);
  });

  it('die Tabelle der Seite zeigt die Herleitung, die Tafelzeilen, die Phasen und die Summen der Sollwerte', async () => {
    const a = await aufbau();
    await berechnungAnlegen(a);
    const { berechnungen, kostenermittlungen } = await neuGeladen(a);
    const ansicht = ergebnisAnsicht(
      ergebnisBerechnen(berechnungen[0] as Honorarberechnung, kostenermittlungen),
    );
    const o = ansicht.objekte[0];
    expect(o?.herleitung?.map((z) => z.wert)).toEqual([
      '1.011.111,10 €',
      '12.345,68 €',
      '1.023.456,78 €',
      '345.678,91 €',
      '255.864,20 €',
      '255.864,20 €',
      '44.907,36 €',
      '49.390,00 €',
      '1.373.618,34 €',
    ]);
    expect(o?.tafel?.map((z) => z.wert)).toEqual([
      'von 115.675,00 € bis 144.268,00 €',
      'von 165.911,00 € bis 206.923,00 €',
      'von 153.213,18 € bis 191.086,11 €',
    ]);
    expect(o?.honorar).toBe('172.149,65 €');
    expect(o?.phasen.map((p) => p.betrag)).toEqual([
      '3.442,99 €',
      '12.050,48 €',
      '25.822,45 €',
      '5.164,49 €',
      '43.037,41 €',
      '17.214,97 €',
      '6.885,99 €',
      '55.087,89 €',
      '3.442,99 €',
    ]);
    expect(o?.grundhonorar).toBe('172.149,66 €');
    expect(o?.umbauzuschlag).toBe('43.037,42 €');
    expect(ansicht.summen.map((z) => z.wert)).toEqual([
      '172.149,66 €',
      '43.037,42 €',
      '9.683,42 €',
      '224.870,50 €',
      '42.725,40 €',
      '267.595,90 €',
    ]);
  });

  it('ein Undo-Schritt je Änderung: Honorarsatz ändern, rückgängig, wiederholen', async () => {
    const a = await aufbau();
    const { s, zustand } = await berechnungAnlegen(a);
    const tiefe = a.weg.historie.tiefe.rueck;
    const b = zustand.honorarberechnung;
    const objekt = { ...(b.objekte[0] as Honorarobjekt), honorarsatz: '100.00' as Prozent };
    const r = await s.befehl({
      art: 'HonorarberechnungSetzen',
      name: b.name,
      objekte: [objekt],
      nebenkosten: b.nebenkosten,
      mwstSatz: b.mwstSatz,
    });
    expect(r.ok).toBe(true);
    expect(a.weg.historie.tiefe.rueck).toBe(tiefe + 1);
    const brutto = async (): Promise<string> => {
      const g = await neuGeladen(a);
      return ergebnisBerechnen(g.berechnungen[0] as Honorarberechnung, g.kostenermittlungen).brutto;
    };
    expect(await brutto()).not.toBe(SOLL.brutto);
    expect((await a.weg.rueckgaengig()).ok).toBe(true);
    expect(await brutto()).toBe(SOLL.brutto);
    expect((await a.weg.wiederholen()).ok).toBe(true);
    expect(await brutto()).not.toBe(SOLL.brutto);
    // Anlegen zurücknehmen: die Berechnung ist weg, die Kostenermittlung bleibt.
    await a.weg.rueckgaengig();
    await a.weg.rueckgaengig();
    const leer = await neuGeladen(a);
    expect(leer.berechnungen).toEqual([]);
    expect(leer.kostenermittlungen).toHaveLength(1);
  });

  it('Kostenermittlung der falschen Stufe: Befund als Warnung, das Honorar wird trotzdem gerechnet', async () => {
    const a = await aufbau();
    await berechnungAnlegen(a);
    const { berechnungen, kostenermittlungen } = await neuGeladen(a);
    const anschlag = kostenermittlungen.map((k) => ({ ...k, stufe: 'kostenanschlag' as const }));
    const e = ergebnisBerechnen(berechnungen[0] as Honorarberechnung, anschlag);
    expect(e.befunde.map((b) => [b.code, b.schwere])).toEqual([
      ['kostenermittlungsstufe-abweichend', 'warnung'],
    ]);
    expect(e.brutto).toBe(SOLL.brutto);
  });

  it('eine Kostenermittlung, auf die die Berechnung verweist, lässt sich nicht löschen (Q5)', async () => {
    const a = await aufbau();
    await berechnungAnlegen(a);
    const z = await a.speicher.kostenermittlungen.laden(a.kostenermittlungId);
    if (!z.ok) throw new Error('laden');
    const r = await kostenermittlungSitzung(a.u, a.projekt.id, z.wert).befehl({
      art: 'KostenermittlungLoeschen',
    });
    expect(r.ok).toBe(false);
    expect((await neuGeladen(a)).kostenermittlungen).toHaveLength(1);
  });

  it('PDF: Sollwerte, Herleitung und der feste Hinweis zu DIN 276 im Text; derselbe Wortlaut wie auf der Seite', async () => {
    const a = await aufbau();
    await berechnungAnlegen(a);
    const { berechnungen, kostenermittlungen } = await neuGeladen(a);
    const berechnung = berechnungen[0] as Honorarberechnung;
    const ergebnis = ergebnisBerechnen(berechnung, kostenermittlungen);
    const ausgabe = await import('@tethys/ausgabe');
    expect(DIN276_HINWEIS).toBe(ausgabe.DIN276_HINWEIS);
    const bytes = await ausgabe.erzeugeHonorarPdf(
      { berechnung, ergebnis, projekt: 'Bürogebäude' },
      schriften(),
    );
    expect(Buffer.from(bytes.subarray(0, 4)).toString('latin1')).toBe('%PDF');
    const text = alsText(await liesPdf(bytes)).replace(/\s+/g, ' ');
    for (const s of [
      '267.595,90',
      '224.870,50',
      '1.373.618,34',
      '172.149,65',
      '172.149,66',
      '43.037,42',
      '9.683,42',
      '42.725,40',
    ]) {
      expect(text).toContain(s);
    }
    expect(text).toContain('DIN 276:2008-12');
  }, 30_000);
});
