// SPDX-License-Identifier: AGPL-3.0-or-later
// Undo/Redo je Sitzung (Ticket 48, ADR 0006) gegen den echten Speicher auf einer In-Memory-SQLite.
import type {
  Befehl,
  Einheitspreis,
  LvBefehl,
  LvZustand,
  Menge,
  PositionAnlegen,
  PositionId,
  Projekt,
  Prozent,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { lvAnlegenBefehl, projektAnlegenBefehl } from '../projekt/befehle';
import { speicherImSpeicher, testUmgebung, zaehlenderSpeicher } from '../testhilfen';
import { Befehlsweg, type LvSitzung } from '../lv/befehlsweg';
import { ozMaskeLesen } from '../lv/ozmaske';
import { Historie } from './historie';

const maske = (() => {
  const r = ozMaskeLesen('NN.NN.NNNN[I]');
  if (!r.ok) throw new Error(r.fehler);
  return r.wert;
})();

function z(s: LvSitzung): LvZustand {
  if (s.zustand === null) throw new Error('kein LV');
  return s.zustand;
}

async function aufbau() {
  const speicher = zaehlenderSpeicher(await speicherImSpeicher());
  const u = testUmgebung(speicher);
  const weg = new Befehlsweg(u);
  const p = await weg.projekt(null).befehl(projektAnlegenBefehl(u.ids, 'Kita', 'Stadt'));
  if (!p.ok || p.zustand === null) throw new Error('Projekt nicht angelegt');
  const projekt: Projekt = p.zustand;
  const lv = weg.lv(projekt.id, null);
  const a = await lv.befehl(lvAnlegenBefehl(u.ids, projekt.id, 'Rohbau', maske));
  if (!a.ok) throw new Error('LV nicht angelegt');
  weg.anmelden(z(lv).leistungsverzeichnis.id, lv);
  const exportieren = async (): Promise<string> => {
    const r = await speicher.projektdateiExportieren(projekt.id);
    if (!r.ok) throw new Error(r.fehler.meldung);
    // Das Protokoll wächst mit jedem Befehl (ADR 0009); verglichen wird der Stand ohne Protokoll.
    const d = JSON.parse(r.wert) as Record<string, unknown>;
    delete d['protokoll'];
    return JSON.stringify(d);
  };
  return { speicher, u, weg, projekt, lv, exportieren };
}

const position = (id: PositionId, wurzel: string, kurztext: string): PositionAnlegen => ({
  art: 'PositionAnlegen',
  id,
  ort: { art: 'ende', elternId: wurzel as never },
  daten: {
    ordnungszahl: null,
    ozIndex: null,
    merkmale: { bedarf: null, wahl: null, stundenlohn: false, pauschal: false, zuschlagskennzeichen: false },
    zuschlag: null,
    kurztext,
    langtext: [],
    menge: '2.000' as Menge,
    einheit: 'm',
    einheitspreis: '10.000' as Einheitspreis,
    epa: null,
  },
});

describe('Historie (Stapel)', () => {
  const teil = (n: number) => ({ protokollId: `p${String(n)}` }) as never;

  it('eine neue Aktion leert den Redo-Stapel; leere Aktionen zählen nicht', () => {
    const h = new Historie();
    h.aufnehmen([teil(1)]);
    h.aufnehmen([]);
    h.zurueckgenommen(1);
    expect(h.kannWiederholen).toBe(true);
    h.aufnehmen([teil(2)]);
    expect(h.kannWiederholen).toBe(false);
    expect(h.tiefe).toEqual({ rueck: 1, vor: 0 });
  });

  it('hält höchstens `grenze` Schritte, mindestens 100 im Standard', () => {
    const h = new Historie();
    for (let i = 0; i < 300; i++) h.aufnehmen([teil(i)]);
    expect(h.tiefe.rueck).toBeGreaterThanOrEqual(100);
    expect(h.tiefe.rueck).toBe(h.grenze);
  });

  it('teilt einen Schritt, wenn nur ein Teil geschrieben wurde', () => {
    const h = new Historie();
    h.aufnehmen([teil(1), teil(2), teil(3)]);
    h.zurueckgenommen(1); // nur Teil 3 zurückgenommen
    expect(h.naechsterRueckgaengig()).toEqual([teil(1), teil(2)]);
    expect(h.naechsterWiederholen()).toEqual([teil(3)]);
    h.wiederholt(1);
    expect(h.tiefe).toEqual({ rueck: 2, vor: 0 });
  });
});

describe('Befehlsweg: Rückgängig und Wiederholen', () => {
  it('eine Befehlsfolge ist ein Schritt: je ein Rueckgaengig je Befehl in umgekehrter Reihenfolge (D-12)', async () => {
    const { speicher, u, weg, lv, exportieren } = await aufbau();
    const wurzel = z(lv).leistungsverzeichnis.id;
    const vorher = await exportieren();
    const ids = [u.ids.position(), u.ids.position(), u.ids.position()];
    const a = await lv.folge(ids.map((id, i) => position(id, wurzel, `Pos ${String(i)}`)));
    expect(a.every((x) => x.ok)).toBe(true);
    expect(z(lv).summen.gesamt.netto).toBe('60.00');
    const original = speicher.geschrieben.slice(-3).map((s) => s.eintrag.id);

    const r = await weg.rueckgaengig();
    expect(r.ok).toBe(true);
    const undo = speicher.geschrieben.slice(-3).map((s) => s.eintrag.befehl as Befehl);
    expect(undo).toEqual(
      [...original].reverse().map((protokollId) => ({ art: 'Rueckgaengig', protokollId })),
    );
    expect(z(lv).leistungsverzeichnis.knoten).toEqual([]);
    expect(z(lv).summen.gesamt.netto).toBe('0.00');
    expect(await exportieren()).toBe(vorher);

    const w = await weg.wiederholen();
    expect(w.ok).toBe(true);
    const redo = speicher.geschrieben.slice(-3).map((s) => s.eintrag.befehl as Befehl);
    expect(redo).toEqual(original.map((protokollId) => ({ art: 'Wiederholen', protokollId })));
    expect(z(lv).summen.gesamt.netto).toBe('60.00');
    // Nach Redo verweist das nächste Undo wieder auf die ursprünglichen Einträge.
    await weg.rueckgaengig();
    expect((speicher.geschrieben.at(-1)?.eintrag.befehl as Befehl | undefined)?.art).toBe('Rueckgaengig');
    expect(await exportieren()).toBe(vorher);
  });

  it('neue Positionen bekommen die OZ aus dem Vorschlag des Kerns, im Befehl', async () => {
    const { speicher, u, lv } = await aufbau();
    const wurzel = z(lv).leistungsverzeichnis.id;
    await lv.folge([position(u.ids.position(), wurzel, 'A'), position(u.ids.position(), wurzel, 'B')]);
    const oz = z(lv).leistungsverzeichnis.knoten.map((k) => k.ordnungszahl);
    expect(oz[0]).not.toBeNull();
    expect(oz[1]).not.toBeNull();
    expect(oz[0]).not.toBe(oz[1]);
    const befehl = speicher.geschrieben.at(-1)?.eintrag.befehl as LvBefehl;
    expect(befehl.art === 'PositionAnlegen' && befehl.daten.ordnungszahl).toBe(oz[1]);
  });

  it('weist der Speicher eine Umkehrung ab, bleibt der Stand und der Stapel ist heil', async () => {
    const { speicher, u, weg, lv } = await aufbau();
    const wurzel = z(lv).leistungsverzeichnis.id;
    await lv.befehl(position(u.ids.position(), wurzel, 'A'));
    const stand = lv.zustand;
    speicher.fehlerAb('konflikt');
    const r = await weg.rueckgaengig();
    expect(r).toMatchObject({ ok: false, grund: 'speicher', teile: [] });
    expect(lv.zustand).toBe(stand);
    expect(weg.historie.tiefe).toEqual({ rueck: 3, vor: 0 });
    speicher.fehlerAb(null);
    expect((await weg.rueckgaengig()).ok).toBe(true);
    expect(z(lv).leistungsverzeichnis.knoten).toEqual([]);
  });

  it('50 gemischte Änderungen, 50× Undo gleich dem Anfang, 50× Redo gleich dem Ende', async () => {
    const { u, weg, lv, exportieren } = await aufbau();
    const wurzel = z(lv).leistungsverzeichnis.id;
    const anfang = await exportieren();
    for (let i = 0; i < 50; i++) {
      const knoten = z(lv).leistungsverzeichnis.knoten;
      const erste = knoten[0];
      const letzte = knoten.at(-1);
      let b: LvBefehl;
      if (i % 5 === 0 || knoten.length < 2 || erste === undefined || letzte === undefined) {
        b = position(u.ids.position(), wurzel, `P${String(i)}`);
      } else if (i % 5 === 1) {
        b = { art: 'MengeAendern', positionId: letzte.id as PositionId, menge: `${String(i)}.000` as Menge };
      } else if (i % 5 === 2) {
        b = { art: 'KnotenVerschieben', knotenId: erste.id, ziel: { art: 'ende', elternId: wurzel } };
      } else if (i % 5 === 3) {
        b = { art: 'NachlassSetzen', nachlass: { art: 'prozent', wert: `${String(i % 7)}.00` as Prozent } };
      } else {
        b = { art: 'KnotenInPapierkorbLegen', eintragId: u.ids.papierkorbeintrag(), knotenIds: [letzte.id] };
      }
      const a = await lv.befehl(b);
      expect(a.ok, `Befehl ${String(i)} ${b.art}`).toBe(true);
    }
    const ende = await exportieren();
    for (let i = 0; i < 50; i++) expect((await weg.rueckgaengig()).ok).toBe(true);
    expect(await exportieren()).toBe(anfang);
    for (let i = 0; i < 50; i++) expect((await weg.wiederholen()).ok).toBe(true);
    expect(await exportieren()).toBe(ende);
  });

  it('LV-Stand: Undo entfernt ihn, Redo friert neu ein', async () => {
    const { speicher, u, weg, lv } = await aufbau();
    const lvId = z(lv).leistungsverzeichnis.id;
    const staende = speicher.lvStaende;
    if (!staende) throw new Error('kein lvStaende');
    await lv.befehl({ art: 'LvStandAnlegen', id: u.ids.lvStand(), name: 'Versand' });
    expect((await staende.auflisten(lvId)).ok).toBe(true);
    const liste = async () => {
      const r = await staende.auflisten(lvId);
      return r.ok ? r.wert.map((s) => s.name) : null;
    };
    expect(await liste()).toEqual(['Versand']);
    await weg.rueckgaengig();
    expect(await liste()).toEqual([]);
    await weg.wiederholen();
    expect(await liste()).toEqual(['Versand']);
  });
});
