// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Einstellungen in der Sitzung (Ticket 150; D-73, D-82 M1): Befehle laufen durch den Kern ins Einstellungsprotokoll, das
// Rückgängig der Einstellungen ist getrennt von dem des Projekts.
import type { Buero, Speicher } from '@tethys/vertrag';
import { LEERE_EINSTELLUNGEN } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { befehlswegFuer } from '../lv/befehlsweg';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import { EinstellungenSitzung, aktuelleEinstellungen, einstellungenFuer } from './einstellungen';

const BUERO: Buero = {
  name: 'Planungsbüro Muster',
  anschrift: { strasse: 'Hauptstraße 1', plz: '12345', ort: 'Musterstadt' },
  telefon: null,
  email: null,
};

async function sitzung(): Promise<{ s: EinstellungenSitzung; speicher: Speicher }> {
  const speicher = await speicherImSpeicher();
  const s = new EinstellungenSitzung(testUmgebung(speicher));
  expect((await s.laden()).ok).toBe(true);
  return { s, speicher };
}

async function protokollArten(speicher: Speicher): Promise<string[]> {
  const p = await speicher.einstellungen?.protokoll();
  if (!p?.ok) throw new Error('kein Protokoll');
  return p.wert.map((e) => e.befehl.art);
}

describe('Einstellungen in der Sitzung', () => {
  it('beginnt mit leeren Einstellungen und schreibt einen Befehl ins Einstellungsprotokoll', async () => {
    const { s, speicher } = await sitzung();
    expect(s.zustand).toEqual(LEERE_EINSTELLUNGEN);
    const a = await s.befehl({ art: 'BueroSetzen', buero: BUERO });
    expect(a.ok).toBe(true);
    expect(s.zustand.buero?.name).toBe('Planungsbüro Muster');
    const gespeichert = await speicher.einstellungen?.laden();
    expect(gespeichert?.ok && gespeichert.wert.buero?.name).toBe('Planungsbüro Muster');
    expect(await protokollArten(speicher)).toEqual(['BueroSetzen']);
  });

  it('weist einen falsch geformten Befehl ab, ohne zu schreiben', async () => {
    const { s, speicher } = await sitzung();
    const a = await s.befehl({ art: 'BueroSetzen', buero: { ...BUERO, name: '  ' } });
    expect(a.ok).toBe(false);
    expect(s.zustand.buero).toBeNull();
    expect(await protokollArten(speicher)).toEqual([]);
    expect(s.kannRueckgaengig).toBe(false);
  });

  it('Rückgängig und Wiederholen schreiben den getauschten bzw. ursprünglichen Stand, mit der Kennung des Eintrags', async () => {
    const { s, speicher } = await sitzung();
    await s.befehl({ art: 'BueroSetzen', buero: BUERO });
    await s.befehl({ art: 'BueroSetzen', buero: { ...BUERO, name: 'Büro Neu' } });
    expect((await s.rueckgaengig()).ok).toBe(true);
    expect(s.zustand.buero?.name).toBe('Planungsbüro Muster');
    expect(s.kannWiederholen).toBe(true);
    expect((await s.wiederholen()).ok).toBe(true);
    expect(s.zustand.buero?.name).toBe('Büro Neu');
    await s.rueckgaengig();
    await s.rueckgaengig();
    expect(s.zustand).toEqual(LEERE_EINSTELLUNGEN);
    expect(await s.rueckgaengig()).toEqual({ ok: false, grund: 'leer' });

    const p = await speicher.einstellungen?.protokoll();
    if (!p?.ok) throw new Error('kein Protokoll');
    expect(p.wert.map((e) => e.befehl.art)).toEqual([
      'BueroSetzen',
      'BueroSetzen',
      'Rueckgaengig',
      'Wiederholen',
      'Rueckgaengig',
      'Rueckgaengig',
    ]);
    const [erster, zweiter, undo1] = p.wert;
    expect(undo1?.befehl).toEqual({ art: 'Rueckgaengig', protokollId: zweiter?.id });
    expect(p.wert[5]?.befehl).toEqual({ art: 'Rueckgaengig', protokollId: erster?.id });
    const neu = await speicher.einstellungen?.laden();
    expect(neu?.ok && neu.wert).toEqual(LEERE_EINSTELLUNGEN);
  });

  it('ist vom Rückgängig des Projekts getrennt', async () => {
    const speicher = await speicherImSpeicher();
    const u = testUmgebung(speicher);
    const s = einstellungenFuer(u);
    await s.laden();
    await s.befehl({ art: 'BueroSetzen', buero: BUERO });
    expect(befehlswegFuer(u).historie.kannRueckgaengig).toBe(false);
    expect(einstellungenFuer(u)).toBe(s);
    expect(aktuelleEinstellungen()?.buero?.name).toBe('Planungsbüro Muster');
  });

  it('ein Konflikt beim Rückgängig schreibt nichts und lässt den Schritt im Verlauf', async () => {
    const { s, speicher } = await sitzung();
    await s.befehl({ art: 'BueroSetzen', buero: BUERO });
    // Ein anderer Weg ändert die Einstellungen (etwa das Einlesen einer Projektdatei): der Stand passt nicht mehr.
    const fremd = new EinstellungenSitzung(testUmgebung(speicher));
    await fremd.laden();
    await fremd.befehl({ art: 'BueroSetzen', buero: { ...BUERO, name: 'Fremd' } });
    const a = await s.rueckgaengig();
    expect(a.ok).toBe(false);
    expect(s.kannRueckgaengig).toBe(true);
    // Die Sitzung liest danach den gespeicherten Stand, damit die Anzeige ihm folgt.
    expect(s.zustand.buero?.name).toBe('Fremd');
  });
});
