// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 90: Logik von Muster-LV und Textquelle (Befehle, Vorlagenliste, Baum, Übernahme in ein anderes LV).

import { lvBefehlAusfuehren, lvChangeSetAnwenden } from '@tethys/kern';
import type {
  KnotenId,
  LeistungsverzeichnisId,
  LvUebersicht,
  LvZustand,
  Position,
  ProjektId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { fixtureInhalt } from '../../e2e/fixture-inhalt';
import { befehlswegFuer } from '../lv/befehlsweg';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import {
  auswahlUmschalten,
  baumZeilen,
  einfuegeOrt,
  textquelleBefehl,
  uebernahmeBauen,
  vorlageBefehl,
  vorlagenAus,
} from './logik';

async function vorlageUndZiel() {
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
  if (!a.ok || a.zustand === null) throw new Error('Vorlage');
  const zielInhalt = { ...fixtureInhalt('winzig') };
  const b = await weg.lv(p.zustand.id, null).befehl({
    art: 'LeistungsverzeichnisAnlegen',
    id: zielInhalt.wurzelId,
    projektId: p.zustand.id,
    inhalt: zielInhalt,
  });
  if (!b.ok || b.zustand === null) throw new Error('Ziel');
  return { vorlage: a.zustand, ziel: b.zustand, ids: u.ids };
}

const positionen = (z: LvZustand): Position[] =>
  z.leistungsverzeichnis.knoten.filter((k): k is Position => k.art === 'position');

describe('Kennzeichen und Textquelle als Befehle', () => {
  it('vorlageBefehl: nur bei einer Änderung', () => {
    expect(vorlageBefehl({}, false)).toBeNull();
    expect(vorlageBefehl({ vorlage: true }, true)).toBeNull();
    expect(vorlageBefehl({}, true)).toEqual({ art: 'VorlageSetzen', vorlage: true });
    expect(vorlageBefehl({ vorlage: true }, false)).toEqual({ art: 'VorlageSetzen', vorlage: false });
  });
  it('textquelleBefehl: trimmt, leer entfernt, unverändert ist kein Befehl', () => {
    const p = { id: 'p' as Position['id'] };
    expect(textquelleBefehl(p, '  Muster-LV Hochbau 2026 ')).toEqual({
      art: 'TextquelleSetzen',
      positionId: 'p',
      textquelle: 'Muster-LV Hochbau 2026',
    });
    expect(textquelleBefehl(p, '   ')).toBeNull();
    expect(textquelleBefehl({ ...p, textquelle: 'X' }, 'X ')).toBeNull();
    expect(textquelleBefehl({ ...p, textquelle: 'X' }, '')).toEqual({
      art: 'TextquelleSetzen',
      positionId: 'p',
      textquelle: null,
    });
  });
});

describe('Vorlagenliste', () => {
  const lv = (id: string, name: string, vorlage?: true): LvUebersicht => ({
    id: id as LeistungsverzeichnisId,
    name,
    ...(vorlage ? { vorlage } : {}),
  });
  it('nur Muster-LVs, aller Projekte, ohne das offene LV', () => {
    const projekte = [
      { id: 'p1' as ProjektId, name: 'Alt', lvs: [lv('a', 'A', true), lv('b', 'B')] },
      { id: 'p2' as ProjektId, name: 'Neu', lvs: [lv('c', 'C', true), lv('d', 'D', true)] },
    ];
    expect(vorlagenAus(projekte).map((v) => `${v.projektName}/${v.lvName}`)).toEqual([
      'Alt/A',
      'Neu/C',
      'Neu/D',
    ]);
    expect(vorlagenAus(projekte, 'c' as LeistungsverzeichnisId).map((v) => v.lvName)).toEqual(['A', 'D']);
    expect(vorlagenAus([])).toEqual([]);
  });
});

describe('Baum und Auswahl', () => {
  it('Eltern vor Kindern, Tiefe, Nachfahren; eine Gliederung zieht alles darunter mit', async () => {
    const { vorlage } = await vorlageUndZiel();
    const zeilen = baumZeilen(vorlage);
    expect(zeilen).toHaveLength(vorlage.leistungsverzeichnis.knoten.length);
    expect(zeilen[0]?.tiefe).toBe(0);
    const titel = zeilen.find((z) => z.art === 'titel' && z.nachfahren.length > 0);
    if (titel === undefined) throw new Error('kein Titel mit Inhalt');
    const an = auswahlUmschalten(new Set(), titel);
    expect(an.size).toBe(1 + titel.nachfahren.length);
    expect(auswahlUmschalten(an, titel).size).toBe(0);
  });
});

describe('Übernahme in ein anderes LV', () => {
  it('Alles: ein KnotenEinfuegen mit neuen Kennungen, Textquelle = Name der Vorlage, Kern nimmt es an', async () => {
    const { vorlage, ziel, ids } = await vorlageUndZiel();
    const alle = new Set(baumZeilen(vorlage).map((z) => z.id));
    const r = uebernahmeBauen(vorlage, alle, ids, einfuegeOrt(ziel, null));
    if (r === null || r.befehl.art !== 'KnotenEinfuegen') throw new Error('keine Übernahme');
    expect(r.ohneBezug).toBe(0);
    expect(r.positionen).toBe(positionen(vorlage).length);
    const alteIds = new Set<string>(vorlage.leistungsverzeichnis.knoten.map((k) => k.id));
    expect(r.befehl.knoten.some((k) => alteIds.has(k.id))).toBe(false);
    for (const k of r.befehl.knoten)
      if (k.art === 'position') expect(k.textquelle).toBe(vorlage.leistungsverzeichnis.name);
    const e = lvBefehlAusfuehren(ziel, r.befehl);
    expect(e.ok).toBe(true);
    if (!e.ok) return;
    const neu = lvChangeSetAnwenden(ziel, e.wert);
    expect(neu?.leistungsverzeichnis.knoten.length).toBe(
      ziel.leistungsverzeichnis.knoten.length + vorlage.leistungsverzeichnis.knoten.length,
    );
  });

  it('eine vorhandene Textquelle bleibt, die Vorlage bleibt unverändert', async () => {
    const { vorlage, ids, ziel } = await vorlageUndZiel();
    const erste = positionen(vorlage)[0];
    if (erste === undefined) throw new Error('keine Position');
    const mitQuelle: LvZustand = {
      ...vorlage,
      leistungsverzeichnis: {
        ...vorlage.leistungsverzeichnis,
        knoten: vorlage.leistungsverzeichnis.knoten.map((k) =>
          k.id === erste.id ? { ...erste, textquelle: 'Eigener Text' } : k,
        ),
      },
    };
    const vorher = JSON.stringify(mitQuelle);
    const r = uebernahmeBauen(mitQuelle, new Set([erste.id as KnotenId]), ids, einfuegeOrt(ziel, null));
    if (r === null || r.befehl.art !== 'KnotenEinfuegen') throw new Error('keine Übernahme');
    expect((r.befehl.knoten[0] as Position).textquelle).toBe('Eigener Text');
    expect(JSON.stringify(mitQuelle)).toBe(vorher);
  });

  it('Bezüge aus der Auswahl hinaus (Zuschlag, Grundposition) werden entfernt und gezählt', async () => {
    const { vorlage, ziel, ids } = await vorlageUndZiel();
    const einzeln = positionen(vorlage).filter(
      (p) =>
        (p.zuschlag ?? null) !== null ||
        (p.merkmale.wahl !== null && p.merkmale.wahl.grundpositionId !== null),
    );
    expect(einzeln.length).toBeGreaterThan(0);
    const r = uebernahmeBauen(
      vorlage,
      new Set(einzeln.map((p) => p.id as KnotenId)),
      ids,
      einfuegeOrt(ziel, null),
    );
    if (r === null || r.befehl.art !== 'KnotenEinfuegen') throw new Error('keine Übernahme');
    expect(r.ohneBezug).toBeGreaterThan(0);
    const e = lvBefehlAusfuehren(ziel, r.befehl);
    expect(e.ok).toBe(true);
    const aussen = new Set(vorlage.leistungsverzeichnis.knoten.map((k) => k.id));
    for (const k of r.befehl.knoten) {
      if (k.art !== 'position') continue;
      if (k.zuschlag?.bezug.art === 'positionen')
        for (const b of k.zuschlag.bezug.positionen) expect(aussen.has(b.positionId)).toBe(false);
      const g = k.merkmale.wahl?.grundpositionId;
      if (g !== undefined && g !== null) expect(aussen.has(g)).toBe(false);
    }
  });

  it('leere Auswahl: keine Übernahme; Einfügeort: hinter der aktiven Zeile, sonst Ende', async () => {
    const { vorlage, ziel, ids } = await vorlageUndZiel();
    expect(uebernahmeBauen(vorlage, new Set(), ids, einfuegeOrt(ziel, null))).toBeNull();
    const k = ziel.leistungsverzeichnis.knoten[0];
    if (k === undefined) throw new Error('leer');
    expect(einfuegeOrt(ziel, k.id as KnotenId)).toEqual({ art: 'nach', knotenId: k.id });
    expect(einfuegeOrt(ziel, null)).toEqual({ art: 'ende', elternId: ziel.leistungsverzeichnis.id });
    expect(einfuegeOrt(ziel, 'gibt-es-nicht' as KnotenId)).toEqual({
      art: 'ende',
      elternId: ziel.leistungsverzeichnis.id,
    });
  });
});
