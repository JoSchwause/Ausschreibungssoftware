// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 115 (X1d, D-53): Zuordnen → Vorschau → Mengen übernehmen durch Kern und echten Speicher (In-Memory-SQLite), ein
// Undo-Schritt. Sollwerte aus `fixtures/typisch-bim.json` (Ticket 99, Torweg D-99.2), nie aus einem Lauf dieses Codes.

import { readFileSync } from 'node:fs';
import type { Ansatzzeile, IfcGlobalId, LvZustand, Position, PositionId, Projekt } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { fixtureInhalt } from '../../e2e/fixture-inhalt';
import { befehlswegFuer, lvSitzung, projektSitzung } from '../lv/befehlsweg';
import { projektAnlegenBefehl } from '../projekt/befehle';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import { hausModell, menge, modell, bauteil, knoten as sknoten } from './testhilfen';
import { uebernahmeBefehle, uebernahmeVorschau } from './uebernahme';
import { zuordnenBefehl } from './zuordnung';

/** Ansatzzeile in der Form der Fixture: Zeile und Formel als Text (D-85.4). */
interface FxZeile {
  readonly zeile: string;
  readonly formel: string;
  readonly ausdruck: string;
  readonly variable: null;
}
interface FxVordersatz {
  readonly positionId: string;
  readonly mengenansatz: readonly FxZeile[];
  readonly menge: string;
}
interface Vordersatz {
  readonly positionId: string;
  readonly mengenansatz: readonly Ansatzzeile[];
  readonly menge: string;
}
const fx = JSON.parse(
  readFileSync(new URL('../../../../fixtures/typisch-bim.json', import.meta.url), 'utf8'),
) as {
  readonly zuordnungen: readonly {
    positionId: string;
    bauteile: { globalId: string; mengenart: string }[];
  }[];
  readonly kern: {
    readonly torweg: {
      readonly positionIds: readonly string[];
      readonly sollwerte: { summen: { netto: string } };
    };
    readonly vordersaetze: readonly FxVordersatz[];
    readonly sollwerte: { summen: { netto: string } };
  };
};
const POS = fx.kern.torweg.positionIds[0] as PositionId;
const soll = (id: string): Vordersatz => {
  const v = fx.kern.vordersaetze.find((x) => x.positionId === id);
  if (v === undefined) throw new Error(id);
  // Der Vertrag führt Zeile und Formel als Zahl.
  return {
    ...v,
    mengenansatz: v.mengenansatz.map((z) => ({ ...z, zeile: Number(z.zeile), formel: Number(z.formel) })),
  };
};

async function aufbau() {
  const u = testUmgebung(await speicherImSpeicher());
  const p = await projektSitzung(u, null).befehl(projektAnlegenBefehl(u.ids, 'Haus', 'Bauherr'));
  if (!p.ok || p.zustand === null) throw new Error('Projekt');
  const projekt: Projekt = p.zustand;
  const inhalt = fixtureInhalt('typisch');
  const s = lvSitzung(u, projekt.id, null);
  const a = await s.befehl({
    art: 'LeistungsverzeichnisAnlegen',
    id: inhalt.wurzelId,
    projektId: projekt.id,
    inhalt,
  });
  if (!a.ok) throw new Error('LV');
  befehlswegFuer(u).anmelden(inhalt.wurzelId, s);
  return { u, s, weg: befehlswegFuer(u) };
}
const pos = (z: LvZustand | null, id: string): Position => {
  const k = z?.leistungsverzeichnis.knoten.find((x) => x.id === id);
  if (k?.art !== 'position') throw new Error(id);
  return k;
};

describe('Mengen aus dem Modell (Torweg X1-Kern)', () => {
  it('03.0010 bekommt den Vordersatz aus den drei Innenwänden, Netto = Soll; Undo und Redo als ein Schritt', async () => {
    const { s, weg } = await aufbau();
    const zuordnung = fx.zuordnungen.find((x) => x.positionId === POS);
    const z = zuordnenBefehl(
      pos(s.zustand, POS),
      (zuordnung?.bauteile ?? []).map((b) => b.globalId as IfcGlobalId),
      'NetSideArea',
    );
    if (z === null) throw new Error('kein Befehl');
    expect((await s.befehl(z)).ok).toBe(true);

    const vorschau = uebernahmeVorschau(s.zustand?.leistungsverzeichnis.knoten ?? [], hausModell());
    expect(vorschau.zeilen).toHaveLength(1);
    const v = vorschau.zeilen[0];
    expect(v).toMatchObject({
      positionId: POS,
      oz: '03.0010',
      kurztext: 'Innenwände mauern',
      einheit: 'm²',
      vorher: '212.400',
      nachher: soll(POS).menge,
      geaendert: true,
      befunde: [],
    });
    expect(v?.zeilen).toEqual(soll(POS).mengenansatz);

    const befehle = uebernahmeBefehle(vorschau);
    expect(befehle).toEqual([
      { art: 'MengenansatzSetzen', positionId: POS, mengenansatz: soll(POS).mengenansatz, menge: '33.023' },
    ]);
    const tiefe = weg.historie.tiefe.rueck;
    const aus = await s.folge(befehle);
    expect(aus.every((a) => a.ok)).toBe(true);
    expect(weg.historie.tiefe.rueck).toBe(tiefe + 1);
    expect(pos(s.zustand, POS).menge).toBe('33.023');
    expect(s.zustand?.summen.gesamt.netto).toBe(fx.kern.torweg.sollwerte.summen.netto);

    // Nach der Übernahme ist nichts mehr zu tun.
    expect(
      uebernahmeBefehle(uebernahmeVorschau(s.zustand?.leistungsverzeichnis.knoten ?? [], hausModell())),
    ).toEqual([]);

    await weg.rueckgaengig();
    expect(pos(s.zustand, POS).menge).toBe('212.400');
    expect(pos(s.zustand, POS).bauteile).toHaveLength(3);
    await weg.wiederholen();
    expect(pos(s.zustand, POS).menge).toBe('33.023');
  });

  it('alle sieben Zuordnungen der Fixture: Vordersätze und Netto wie `kern.sollwerte`', async () => {
    const { s } = await aufbau();
    for (const f of fx.zuordnungen) {
      const p = pos(s.zustand, f.positionId);
      const bs = [...new Set(f.bauteile.map((b) => b.mengenart))].map((mengenart) => ({
        mengenart,
        ids: f.bauteile.filter((b) => b.mengenart === mengenart).map((b) => b.globalId as IfcGlobalId),
      }));
      for (const b of bs) {
        const befehl = zuordnenBefehl(pos(s.zustand, p.id), b.ids, b.mengenart);
        if (befehl !== null) expect((await s.befehl(befehl)).ok).toBe(true);
      }
    }
    const befehle = uebernahmeBefehle(
      uebernahmeVorschau(s.zustand?.leistungsverzeichnis.knoten ?? [], hausModell()),
    );
    expect(befehle).toHaveLength(fx.kern.vordersaetze.length);
    await s.folge(befehle);
    for (const v of fx.kern.vordersaetze) expect(pos(s.zustand, v.positionId).menge).toBe(v.menge);
    expect(s.zustand?.summen.gesamt.netto).toBe(fx.kern.sollwerte.summen.netto);
  });
});

describe('Vorschau mit Befunden', () => {
  it('eine hängende Zuordnung ergibt keine Zeile und keinen Befehl, aber einen Befund (nie 0, Q5)', () => {
    const m = modell(
      [sknoten('EG', 'geschoss', null)],
      [bauteil('W1', 'EG', { mengen: [menge('NetSideArea', 'flaeche', '8.5')] })],
    );
    const p = pos(
      {
        leistungsverzeichnis: { knoten: fixtureInhalt('typisch').knoten },
      } as unknown as LvZustand,
      POS,
    );
    const mit: Position = {
      ...p,
      bauteile: [{ globalId: 'FEHLT00000000000000000' as IfcGlobalId, mengenart: 'NetSideArea' }],
    };
    const v = uebernahmeVorschau([mit], m);
    expect(v.zeilen).toHaveLength(1);
    expect(v.zeilen[0]?.nachher).toBeNull();
    expect(v.zeilen[0]?.geaendert).toBe(false);
    expect(v.zeilen[0]?.befunde.map((b) => b.code)).toEqual(['bauteil-fehlt']);
    expect(uebernahmeBefehle(v)).toEqual([]);
  });
});
