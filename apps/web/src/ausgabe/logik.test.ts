// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 66: reine Teile von Drucken und Excel (Dateinamen, Datum, Angebotsplan aus dem Excel-Rücklauf).

import { lvAlsExcel } from '@tethys/ausgabe';
import type { LvZustand, Zeitstempel } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { fixtureInhalt } from '../../e2e/fixture-inhalt';
import { bietersummen } from '../gaeb/gaeb';
import { befehlswegFuer } from '../lv/befehlsweg';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import {
  bieterNameAusDatei,
  dateinameExcel,
  dateinamePdf,
  datumAusUhr,
  datumDeZuIso,
  datumIsoZuDe,
  excelAngebotPlan,
  excelAngebotLesen,
  istDatumIso,
} from './logik';

describe('Dateinamen', () => {
  it('PDF: LV-Name ohne Sonderzeichen, Endung .pdf', () => {
    expect(dateinamePdf('Typisch Musterhaus erfunden')).toBe('Typisch Musterhaus erfunden.pdf');
    expect(dateinamePdf('A/B: "Rohbau"?')).toBe('AB Rohbau.pdf');
    expect(dateinamePdf('   ')).toBe('Leistungsverzeichnis.pdf');
  });
  it('Excel: -Bieter.xlsx', () => {
    expect(dateinameExcel('Typisch Musterhaus erfunden')).toBe('Typisch Musterhaus erfunden-Bieter.xlsx');
    expect(dateinameExcel('')).toBe('Leistungsverzeichnis-Bieter.xlsx');
  });
  it('Bietername aus dem Dateinamen: ohne Endung', () => {
    expect(bieterNameAusDatei('Mustermann Bau GmbH.xlsx')).toBe('Mustermann Bau GmbH');
    expect(bieterNameAusDatei('angebot.v2.XLSX')).toBe('angebot.v2');
    expect(bieterNameAusDatei('.xlsx')).toBe('');
  });
});

describe('Datum', () => {
  it('Eingabe TT.MM.JJJJ wird JJJJ-MM-TT, schlechte Eingabe null', () => {
    expect(datumDeZuIso('11.11.2026')).toBe('2026-11-11');
    expect(datumDeZuIso(' 1.2.2027 ')).toBe('2027-02-01');
    expect(datumDeZuIso('30.02.2026')).toBeNull();
    expect(datumDeZuIso('2026-11-11')).toBeNull();
    expect(datumIsoZuDe('2026-11-11')).toBe('11.11.2026');
  });
  it('kommt aus der Uhr der App, als JJJJ-MM-TT (Ortszeit)', () => {
    const t = new Date(2026, 10, 11, 23, 30).toISOString() as Zeitstempel;
    expect(datumAusUhr(t)).toBe('2026-11-11');
  });
  it('prüft die Eingabe', () => {
    expect(istDatumIso('2026-11-11')).toBe(true);
    expect(istDatumIso('2026-13-01')).toBe(false);
    expect(istDatumIso('2026-02-30')).toBe(false);
    expect(istDatumIso('11.11.2026')).toBe(false);
    expect(istDatumIso('')).toBe(false);
  });
});

async function lvZustand(): Promise<{ zustand: LvZustand; ids: ReturnType<typeof testUmgebung>['ids'] }> {
  const u = testUmgebung(await speicherImSpeicher());
  const weg = befehlswegFuer(u);
  const p = await weg.projekt(null).befehl({
    art: 'ProjektAnlegen',
    id: u.ids.projekt(),
    name: 'Test',
    bauherr: { name: 'Kreis', anschrift: null },
  });
  if (!p.ok || p.zustand === null) throw new Error('Projekt');
  const inhalt = fixtureInhalt('typisch');
  const a = await weg
    .lv(p.zustand.id, null)
    .befehl({ art: 'LeistungsverzeichnisAnlegen', id: inhalt.wurzelId, projektId: p.zustand.id, inhalt });
  if (!a.ok || a.zustand === null) throw new Error('LV');
  return { zustand: a.zustand, ids: u.ids };
}

describe('excelAngebotLesen', () => {
  it('Datei mit Preisen: Vorschau mit Angebot, Summe gleich der des LV, Plan legt Bieter und Angebot an', async () => {
    const { zustand, ids } = await lvZustand();
    const datei = lvAlsExcel(zustand, { mitPreisen: true });
    const v = await excelAngebotLesen(datei.bytes, 'Mustermann Bau.xlsx', zustand, ids);
    expect(v.uebernehmbar).toBe(true);
    expect(v.bieterName).toBe('Mustermann Bau');
    if (v.angebot === null) throw new Error('Angebot');
    expect(bietersummen(zustand, v.angebot).netto).toBe(zustand.summen.gesamt.netto);

    const projekt = {
      id: zustand.leistungsverzeichnis.projektId,
      name: 'Test',
      bauherr: { name: 'Kreis', anschrift: null },
      bieter: [],
    };
    const plan = excelAngebotPlan(v, v.bieterName, projekt, ids);
    expect(plan?.neuerBieter?.name).toBe('Mustermann Bau');
    expect(plan?.angebot.leistungsverzeichnisId).toBe(zustand.leistungsverzeichnis.id);
  });

  it('ein leeres Blankett hat keine Preise: nichts zu übernehmen', async () => {
    const { zustand, ids } = await lvZustand();
    const v = await excelAngebotLesen(lvAlsExcel(zustand).bytes, 'x.xlsx', zustand, ids);
    expect(v.uebernehmbar).toBe(false);
  });

  it('keine Excel-Datei: Befund, nichts zu übernehmen', async () => {
    const { zustand, ids } = await lvZustand();
    const v = await excelAngebotLesen(new TextEncoder().encode('kein zip'), 'x.xlsx', zustand, ids);
    expect(v.uebernehmbar).toBe(false);
    expect(v.befunde.map((b) => b.code)).toContain('datei-unlesbar');
  });
});
