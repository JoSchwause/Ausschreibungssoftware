// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 88, Punkt 2 und 3: die Prüfansicht als Daten, auf dem Weg der App (Speicher, Befehle, `rechnungPruefen` aus
// `abrechnung`) gegen die Sollwerte der M4-Fixture (Ticket 85, unabhängig hergeleitet): AR 1 = 8.874,40; AR 2 zieht den
// eingefrorenen Zahlbetrag von AR 1 ab (10.100,84 vor der Korrektur). Dazu D-44 (gefordert, Differenz) und die Lage der
// Freigabe (D-34 (7)).

import type { AufmassId, Betrag, Prozent, Rechnung } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import {
  M4_NACHTRAG_LV,
  M4_PRUEFUNGEN,
  M4_RECHNUNGEN,
  m4Blatt,
  m4Nachtragsknoten,
  type FxKette,
} from '../../e2e/rechnung-fixture';
import { entwurfLesen, neuerEntwurf, rechnungAnlegenBefehl } from './entwurf';
import { freigabelage, gepruefterZahlbetrag, kettenzeilen, pruefen, vergleichszeilen } from './pruefung';
import { rechnungenSitzung, rechnungsstandLaden, type RechnungenSitzung } from './rechnungen';
import { mitAuftrag, type Auftragsstand } from './testhilfen';
import { aufmassSchreiben, nachtragSchreiben } from './testpfad';

/** Zuschlag an Bieter B, Nachtrag N01 übernommen, Blatt 1 der Fixture (D-85.1). */
async function m4(): Promise<Auftragsstand & { s: RechnungenSitzung }> {
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

/** Rechnung `i` der Fixture anlegen wie der Prüfer im Formular: Vorschlag, dann Umlage und Sicherheitseinbehalt. */
async function rechnungAnlegen(a: Auftragsstand & { s: RechnungenSitzung }, i: number): Promise<Rechnung> {
  const fx = M4_RECHNUNGEN[i];
  if (fx === undefined) throw new Error('Fixture');
  const st = await stand(a);
  const w = entwurfLesen({
    ...neuerEntwurf(a.s.zustand, st.blaetter),
    umlagen: fx.umlagen.map((u) => ({ bezeichnung: u.bezeichnung, satz: u.satz.replace('.', ',') })),
    sicherheitSatz: (fx.sicherheitSatz ?? '').replace('.', ','),
  });
  if (!w.ok) throw new Error('unlesbar');
  const kopf = a.auftrag.auftragsLeistungsverzeichnis;
  const b = rechnungAnlegenBefehl(a.u.ids.rechnung(), kopf.projektId, kopf.id, a.s.zustand, w.wert);
  const r = await a.s.befehl({ rechnungId: null, befehl: b });
  if (!r.ok) throw new Error(JSON.stringify(r.abweisung));
  return b.rechnung;
}

/** Die Sollkette der Fixture als Zeilen (Schlüssel → Betrag), so wie die Prüfansicht sie zeigt. */
function sollzeilen(k: FxKette, frueher: readonly number[]): [string, string][] {
  return [
    ['leistung', k.leistung],
    ['nachlass', k.nachlass],
    ['nettoNachNachlass', k.nettoNachNachlass],
    ['mwst', k.mwst],
    ['bruttoKumuliert', k.bruttoKumuliert],
    ...k.umlagen.map((u, i): [string, string] => [`umlage-${String(i)}`, u.betrag]),
    ['einbehalt', k.einbehalt],
    ...(frueher.length === 0
      ? [['fruehere', k.fruehereZahlbetraege] as [string, string]]
      : frueher.map((n): [string, string] => [`frueher-${String(n)}`, k.fruehereZahlbetraege])),
    ['zahlbetrag', k.zahlbetrag],
  ];
}

describe('Prüfansicht gegen die M4-Fixture', () => {
  it('AR 1: jede Zeile der Abzugskette wie die Fixture, Zahlbetrag 8.874,40', async () => {
    const a = await m4();
    const ar1 = await rechnungAnlegen(a, 0);
    const p = pruefen(ar1, await stand(a), a.s.zustand);
    const zeilen = kettenzeilen(p.kette);
    expect(zeilen.map((z) => [z.schluessel, z.betrag])).toEqual(sollzeilen(M4_PRUEFUNGEN.ar1.kette, []));
    expect(zeilen.map((z) => z.zeichen)).toEqual(['', '−', '=', '+', '=', '−', '−', '−', '=']);
    expect(zeilen.find((z) => z.schluessel === 'umlage-0')?.bezeichnung).toBe(
      'Umlage Bauwesenversicherung (0,50 %)',
    );
    expect(zeilen.find((z) => z.schluessel === 'einbehalt')?.bezeichnung).toBe(
      'Sicherheitseinbehalt (5,00 %)',
    );
    expect(p.kette.zahlbetrag).toBe('8874.40');
  });

  it('AR 1 freigegeben, Blatt 2, AR 2: zieht den eingefrorenen Zahlbetrag ab (10.100,84)', async () => {
    const a = await m4();
    const ar1 = await rechnungAnlegen(a, 0);
    const z1 = pruefen(ar1, await stand(a), a.s.zustand).kette.zahlbetrag;
    const f = await a.s.befehl({ rechnungId: ar1.id, befehl: { art: 'RechnungFreigeben', zahlbetrag: z1 } });
    expect(f.ok).toBe(true);
    const kopf = a.auftrag.auftragsLeistungsverzeichnis;
    const b2 = await aufmassSchreiben(a.u, m4Blatt(1, kopf.projektId, kopf.id));
    expect(b2.ok).toBe(true);
    const ar2 = await rechnungAnlegen(a, 1);
    const st = await stand(a);
    expect(ar2.aufmassIds).toEqual(st.blaetter.map((b) => b.id)); // Vorschlag: alle Blätter, kumuliert (D-34)
    const p = pruefen(ar2, st, a.s.zustand);
    expect(kettenzeilen(p.kette).map((z) => [z.schluessel, z.betrag])).toEqual(
      sollzeilen(M4_PRUEFUNGEN.ar2VorKorrektur.kette, [1]),
    );
    expect(gepruefterZahlbetrag(ar2, st, a.s.zustand)).toBe('10100.84');
    expect(gepruefterZahlbetrag(a.s.zustand[0] ?? ar1, st, a.s.zustand)).toBe('8874.40');
  });
});

describe('Freigabe', () => {
  it('gesperrt mit Erklärung, solange eine frühere Rechnung offen ist; Aufheben gesperrt, solange eine spätere freigegeben ist', async () => {
    const a = await m4();
    const ar1 = await rechnungAnlegen(a, 0);
    const ar2 = await rechnungAnlegen(a, 1);
    expect(freigabelage(ar1, a.s.zustand)).toEqual({ art: 'offen', moeglich: true, grund: null });
    expect(freigabelage(ar2, a.s.zustand)).toEqual({
      art: 'offen',
      moeglich: false,
      grund: 'Erst Rechnung 1 freigeben: Freigegeben wird in der Reihenfolge der Nummern.',
    });
    // Der Speicher hält dieselbe Regel (konflikt), auch wenn die App sie umginge.
    const vorbei = await a.s.befehl({
      rechnungId: ar2.id,
      befehl: { art: 'RechnungFreigeben', zahlbetrag: '1.00' as Betrag },
    });
    expect(vorbei).toMatchObject({ ok: false, abweisung: { art: 'speicher', fehler: { code: 'konflikt' } } });

    for (const r of [ar1, ar2])
      expect(
        (
          await a.s.befehl({
            rechnungId: r.id,
            befehl: { art: 'RechnungFreigeben', zahlbetrag: '1.00' as Betrag },
          })
        ).ok,
      ).toBe(true);
    const [f1, f2] = a.s.zustand;
    if (f1 === undefined || f2 === undefined) throw new Error('Rechnungen');
    expect(freigabelage(f1, a.s.zustand)).toEqual({
      art: 'freigegeben',
      zahlbetrag: '1.00',
      aufhebbar: false,
      grund:
        'Rechnung 2 ist schon freigegeben und zieht diesen Zahlbetrag ab. Zuerst deren Freigabe aufheben.',
    });
    expect(freigabelage(f2, a.s.zustand)).toMatchObject({ art: 'freigegeben', aufhebbar: true, grund: null });
  });
});

describe('vergleichszeilen (D-44)', () => {
  const basis: Rechnung = {
    ...(M4_RECHNUNGEN[0] as unknown as Rechnung),
    nummer: 1,
    aufmassIds: [] as AufmassId[],
    umlagen: [],
    sicherheitSatz: null as Prozent | null,
    freigabe: null,
  };

  it('ohne Forderung: „–“ und keine Differenz in allen drei Zeilen, keine maßgeblich', async () => {
    const a = await m4();
    const p = pruefen(
      { ...basis, auftragsLvId: a.auftrag.auftragsLeistungsverzeichnis.id },
      await stand(a),
      [],
    );
    expect(vergleichszeilen(p).map((z) => [z.feld, z.gefordert, z.differenz, z.massgeblich])).toEqual([
      ['netto', null, null, false],
      ['brutto', null, null, false],
      ['zahlbetrag', null, null, false],
    ]);
  });

  it('nur Brutto gefordert: Brutto maßgeblich mit Differenz gefordert − geprüft; Zahlbetrag bevorzugt, wenn genannt', async () => {
    const a = await m4();
    const st = await stand(a);
    const auftragsLvId = a.auftrag.auftragsLeistungsverzeichnis.id;
    const blatt1 = st.blaetter.map((b) => b.id);
    const mitBlatt = { ...basis, auftragsLvId, aufmassIds: blatt1 };
    // Ohne Abzüge ist der Zahlbetrag das Brutto kumuliert: Leistung 8.135,57 → Brutto 9.390,89 (Fixture, AR 1).
    const brutto = pruefen(
      { ...mitBlatt, gefordert: { netto: null, brutto: '9400.00' as Betrag, zahlbetrag: null } },
      st,
      [],
    );
    expect(
      vergleichszeilen(brutto).map((z) => [z.feld, z.gefordert, z.geprueft, z.differenz, z.massgeblich]),
    ).toEqual([
      ['netto', null, '7891.50', null, false],
      ['brutto', '9400.00', '9390.89', '9.11', true],
      ['zahlbetrag', null, '9390.89', null, false],
    ]);
    const beide = pruefen(
      {
        ...mitBlatt,
        gefordert: { netto: null, brutto: '9400.00' as Betrag, zahlbetrag: '9390.89' as Betrag },
      },
      st,
      [],
    );
    expect(vergleichszeilen(beide).map((z) => [z.feld, z.differenz, z.massgeblich])).toEqual([
      ['netto', null, false],
      ['brutto', '9.11', false],
      ['zahlbetrag', '0.00', true],
    ]);
  });
});
