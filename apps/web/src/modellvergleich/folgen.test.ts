// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 116: Folgen des Vergleichs v1 → v2 für das LV `typisch` (nach der Übernahme mit v1) und „Mengen aktualisieren“ als
// ein Undo-Schritt durch Kern und echten Speicher; Sollwerte aus `fixtures/typisch-bim.json` (D-99.8, D-99.12).

import { describe, expect, it } from 'vitest';
import { ansatz, BIM_SOLL } from '../../e2e/modellvergleich-inhalt';
import { aktualisierungBerechnen, befundeErklaert, folgenansicht, mengenAktualisieren } from './folgen';
import { typischImSpeicher, V1, V2 } from './testhilfen';

const SOLL = BIM_SOLL.erweitert;

describe('Folgen für ein LV', () => {
  it('je Position mit Zuordnungen Menge alt, neu, Differenz; betroffen sind 03.0010 und 03.0020', async () => {
    const { lv } = await typischImSpeicher();
    const f = folgenansicht(lv, V1, V2);
    expect(f.zeilen.map((z) => z.oz)).toEqual(BIM_SOLL.zuordnungen.map((z) => z.oz));
    expect(
      f.zeilen
        .filter((z) => z.betroffen)
        .map((z) => ({
          positionId: z.positionId,
          oz: z.oz,
          vorher: z.vorher,
          nachher: z.nachher,
          differenz: z.differenz,
        })),
    ).toEqual(SOLL.betroffenePositionen);
    expect(f.zeilen.find((z) => z.oz === '03.0010')?.imLv).toBe('33.023');
    expect(f.zeilen.find((z) => z.oz === '03.0010')?.befunde.map((b) => [b.code, b.ort.globalId])).toEqual([
      ['bauteil-fehlt', '0pvziGfz13dL7P$C5SooCO'],
    ]);
  });

  it('Aktualisierung: genau die betroffenen Positionen, Ansatz und Menge laut v2', async () => {
    const { lv } = await typischImSpeicher();
    const a = aktualisierungBerechnen(lv, V1, V2);
    const soll = SOLL.mengenAktualisieren.vordersaetze.filter((v) =>
      SOLL.betroffenePositionen.some((b) => b.positionId === v.positionId),
    );
    expect(a.befehle).toEqual(
      soll.map((v) => ({
        art: 'MengenansatzSetzen',
        positionId: v.positionId,
        mengenansatz: ansatz(v.mengenansatz),
        menge: v.menge,
      })),
    );
    expect(a.positionen.map((p) => [p.oz, p.vorher, p.nachher])).toEqual([
      ['03.0010', '33.023', '28.898'],
      ['03.0020', '99.938', '101.337'],
    ]);
  });

  it('Befunde nennen Position und den Namen des Bauteils im alten Stand', async () => {
    const { lv } = await typischImSpeicher();
    const a = aktualisierungBerechnen(lv, V1, V2);
    expect(
      befundeErklaert(
        a.positionen.flatMap((p) => p.befunde),
        lv,
        V1,
      ).map((b) => b.meldung),
    ).toEqual([
      '03.0010 Innenwände mauern: Kein Bauteil 0pvziGfz13dL7P$C5SooCO im Modell (im alten Stand: Raumteiler Wohnen)',
    ]);
  });

  it('Mengen aktualisieren: ein Undo-Schritt, Netto laut Soll; Rückgängig stellt v1 wieder her', async () => {
    const { sitzung, lv, weg } = await typischImSpeicher();
    expect(lv.summen.gesamt.netto).toBe(BIM_SOLL.kern.sollwerte.summen['netto']);
    const vorher = weg.historie.tiefe.rueck;
    const r = await mengenAktualisieren(sitzung, aktualisierungBerechnen(lv, V1, V2).befehle);
    expect(r.ok).toBe(true);
    expect(weg.historie.tiefe.rueck).toBe(vorher + 1);
    const neu = sitzung.zustand;
    expect(neu?.summen.gesamt).toMatchObject(SOLL.mengenAktualisieren.sollwerte.summen);
    for (const v of SOLL.mengenAktualisieren.vordersaetze) {
      const p = neu?.leistungsverzeichnis.knoten.find((k) => k.id === v.positionId);
      expect(p?.art === 'position' ? [p.menge, p.mengenansatz] : null).toEqual([
        v.menge,
        ansatz(v.mengenansatz),
      ]);
    }
    // Danach ist nichts mehr zu tun.
    if (neu === null) throw new Error('LV');
    expect(aktualisierungBerechnen(neu, V1, V2).befehle).toEqual([]);

    weg.anmelden(neu.leistungsverzeichnis.id, sitzung);
    await weg.rueckgaengig();
    expect(sitzung.zustand?.summen.gesamt.netto).toBe(BIM_SOLL.kern.sollwerte.summen['netto']);
  });
});

describe('OZ in den Folgen (Ticket 122)', () => {
  it('die OZ einer Position steht wie überall in der App, Index ohne Leerzeichen (`ozText`)', async () => {
    const { lv } = await typischImSpeicher();
    const ziel = BIM_SOLL.zuordnungen[0]?.positionId;
    const mitIndex = {
      ...lv,
      leistungsverzeichnis: {
        ...lv.leistungsverzeichnis,
        knoten: lv.leistungsverzeichnis.knoten.map((k) =>
          k.art === 'position' && k.id === ziel ? { ...k, ozIndex: 'A' } : k,
        ),
      },
    };
    const f = folgenansicht(mitIndex, V1, V2);
    expect(f.zeilen.find((z) => z.positionId === ziel)?.oz).toBe(`${BIM_SOLL.zuordnungen[0]?.oz ?? ''}A`);
  });
});
