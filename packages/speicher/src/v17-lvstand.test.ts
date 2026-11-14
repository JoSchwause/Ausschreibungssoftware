// SPDX-License-Identifier: AGPL-3.0-or-later
// LV-Stand umbenennen und löschen (v1.7a, Ticket 139; D-127.1, D-82 M2, S1, S2): Umbenennen ändert nur den Namen; Löschen
// trägt den ganzen Stand im ChangeSet (`lvStandInhalt`), und dessen Umkehrung legt genau diesen Stand mit seinem `angelegt` an
// seinen Platz zurück, statt neu einzufrieren. Eingefroren wird nur bei `LvStandAnlegen` und dessen `Wiederholen` (M2).
// Stände sind nach `angelegt`, dann nach der Reihenfolge des Schreibens geordnet (S1).

import type {
  Befehl,
  ChangeSet,
  LvChangeSet,
  LvStand,
  LvStandKopf,
  LvZustand,
  Position,
  Protokolleintrag,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import type { SpeicherKern } from './kern';
import { anlegenSchritte, eintrag, ladeFixture, lvLoeschenChangeSet } from './testhilfe/fixtures';
import { neuerKern, speichere, wert } from './testhilfe/node';
import { feldAendern, standAnlegen, umkehren } from './testhilfe/umkehrung';
import { LEERES_SUMMENVORHER } from './summenvorher';

const typisch = ladeFixture('typisch');
const P = typisch.projekt.id;
const LV = typisch.lv.leistungsverzeichnis.id;
const erste = typisch.lv.leistungsverzeichnis.knoten.find(
  (k): k is Position => k.art === 'position',
) as Position;
const lvAggregat: Protokolleintrag['aggregat'] = { art: 'leistungsverzeichnis', id: LV };

let nr = 3000;
const um = (n: number): Protokolleintrag['wann'] =>
  `2026-11-12T08:${String(n).padStart(2, '0')}:00.000Z` as Protokolleintrag['wann'];

async function mitTypisch(): Promise<SpeicherKern> {
  const { kern } = await neuerKern();
  await speichere(kern, anlegenSchritte(typisch));
  return kern;
}

const lv = (kern: SpeicherKern): LvZustand => wert(kern.lvLaden(LV));
const stand = (kern: SpeicherKern, id: string): LvStand => wert(kern.lvStandLaden(id as never));

/** Wendet an (Zeit `wann`, sonst die feste Zeit) und liefert das Ergebnis samt Eintrag. */
async function versuche(kern: SpeicherKern, befehl: Befehl, cs: ChangeSet, wann?: Protokolleintrag['wann']) {
  nr += 1;
  const e = { ...eintrag(nr, P, lvAggregat, befehl), ...(wann === undefined ? {} : { wann }) };
  return { e, r: await kern.anwenden(e, cs) };
}
async function schreibe(
  kern: SpeicherKern,
  befehl: Befehl,
  cs: ChangeSet,
  wann?: Protokolleintrag['wann'],
): Promise<Protokolleintrag> {
  const { e, r } = await versuche(kern, befehl, cs, wann);
  wert(r);
  return e;
}

/** Rahmen eines ChangeSets am Stand (D-127.1): kein Kopf, keine Knoten, leere Summen. */
const rahmen = (): Omit<LvChangeSet, 'lvStand' | 'lvStandInhalt'> => ({
  art: 'leistungsverzeichnis',
  leistungsverzeichnisId: LV,
  kopf: null,
  knoten: { hinzugefuegt: [], geaendert: [], entfernt: [] },
  summen: { positionen: [], gliederungen: [], gesamt: null, vorher: LEERES_SUMMENVORHER },
});
const kopfVon = (s: LvStand): LvStandKopf => ({
  id: s.id,
  leistungsverzeichnisId: s.leistungsverzeichnisId,
  name: s.name,
});
const umbenennen = (s: LvStand, name: string): LvChangeSet => ({
  ...rahmen(),
  lvStand: { vorher: kopfVon(s), nachher: { ...kopfVon(s), name } },
});
const loeschen = (s: LvStand): LvChangeSet => ({
  ...rahmen(),
  lvStand: { vorher: kopfVon(s), nachher: null },
  lvStandInhalt: { vorher: { angelegt: s.angelegt, zustand: s.zustand }, nachher: null },
});
const anlegen = (kern: SpeicherKern, id: string, name: string, wann: Protokolleintrag['wann']) =>
  schreibe(kern, { art: 'LvStandAnlegen', id: id as never, name }, standAnlegen(lv(kern), id, name), wann);
const mengeAendern = (kern: SpeicherKern, menge: string): Promise<Protokolleintrag> => {
  const z = lv(kern);
  const p = z.leistungsverzeichnis.knoten.find((k) => k.id === erste.id) as Position;
  return schreibe(
    kern,
    { art: 'MengeAendern', positionId: p.id, menge: menge as never },
    feldAendern(z, p.id, { ...p, menge: menge as Position['menge'] }, '7.00'),
  );
};
const fehlercode = (r: { ok: boolean; fehler?: { code: string } }): string | undefined => r.fehler?.code;

describe('LV-Stand umbenennen (D-127.1, D-82 S2)', () => {
  it('ändert nur den Namen: angelegt, Zustand und Platz bleiben; Undo stellt den Namen wieder her', async () => {
    const kern = await mitTypisch();
    await anlegen(kern, 'stand-1', 'Versand', um(1));
    await anlegen(kern, 'stand-2', 'Auftrag', um(2));
    const vorher = stand(kern, 'stand-1');
    const cs = umbenennen(vorher, 'Versand an Bieter');
    const original = await schreibe(
      kern,
      { art: 'LvStandUmbenennen', lvStandId: vorher.id, name: 'Versand an Bieter' },
      cs,
    );
    expect(stand(kern, 'stand-1')).toEqual({ ...vorher, name: 'Versand an Bieter' });
    expect(wert(kern.lvStaendeAuflisten(LV)).map((s) => [s.id, s.name])).toEqual([
      ['stand-1', 'Versand an Bieter'],
      ['stand-2', 'Auftrag'],
    ]);
    await schreibe(kern, { art: 'Rueckgaengig', protokollId: original.id }, umkehren(cs));
    expect(stand(kern, 'stand-1')).toEqual(vorher);
  });

  it('abweichender Vorherstand: konflikt; Kennung oder LV gewechselt oder Inhalt dabei: unbekannt; nichts geschrieben', async () => {
    const kern = await mitTypisch();
    await anlegen(kern, 'stand-1', 'Versand', um(1));
    const s = stand(kern, 'stand-1');
    const b: Befehl = { art: 'LvStandUmbenennen', lvStandId: s.id, name: 'neu' };
    const falsch = umbenennen({ ...s, name: 'anders' }, 'neu');
    expect(fehlercode((await versuche(kern, b, falsch)).r)).toBe('konflikt');
    const kopf = kopfVon(s);
    for (const nachher of [
      { ...kopf, id: 'stand-x' as never, name: 'neu' },
      { ...kopf, leistungsverzeichnisId: 'anderes' as never, name: 'neu' },
    ])
      expect(
        fehlercode((await versuche(kern, b, { ...rahmen(), lvStand: { vorher: kopf, nachher } })).r),
      ).toBe('unbekannt');
    const mitInhalt: LvChangeSet = {
      ...umbenennen(s, 'neu'),
      lvStandInhalt: { vorher: { angelegt: s.angelegt, zustand: s.zustand }, nachher: null },
    };
    expect(fehlercode((await versuche(kern, b, mitInhalt)).r)).toBe('unbekannt');
    expect(stand(kern, 'stand-1')).toEqual(s);
  });
});

describe('LV-Stand löschen und wiederherstellen (D-127.1, D-82 S1, S2)', () => {
  it('Löschen entfernt den Stand; Undo legt genau diesen Stand (angelegt, Zustand) an seinen Platz zurück', async () => {
    const kern = await mitTypisch();
    await anlegen(kern, 'stand-1', 'Versand', um(1));
    await mengeAendern(kern, '2.000');
    await anlegen(kern, 'stand-2', 'Nach Mengenänderung', um(3));
    await mengeAendern(kern, '3.000');
    await anlegen(kern, 'stand-3', 'Auftrag', um(5));
    const zwei = stand(kern, 'stand-2');
    const cs = loeschen(zwei);
    const original = await schreibe(kern, { art: 'LvStandLoeschen', lvStandId: zwei.id }, cs, um(6));
    expect(wert(kern.lvStaendeAuflisten(LV)).map((s) => s.id)).toEqual(['stand-1', 'stand-3']);
    expect(kern.lvStandLaden(zwei.id)).toMatchObject({ ok: false, fehler: { code: 'nicht-gefunden' } });
    // Das LV ändert sich weiter; die Umkehrung friert es nicht ein, sie legt den gelöschten Stand zurück.
    await mengeAendern(kern, '4.000');
    await schreibe(kern, { art: 'Rueckgaengig', protokollId: original.id }, umkehren(cs), um(8));
    expect(stand(kern, 'stand-2')).toEqual(zwei);
    expect(wert(kern.lvStaendeAuflisten(LV)).map((s) => [s.id, s.angelegt])).toEqual([
      ['stand-1', um(1)],
      ['stand-2', um(3)],
      ['stand-3', um(5)],
    ]);
    // Wiederholen löscht ihn wieder.
    await schreibe(kern, { art: 'Wiederholen', protokollId: original.id }, cs, um(9));
    expect(wert(kern.lvStaendeAuflisten(LV)).map((s) => s.id)).toEqual(['stand-1', 'stand-3']);
  });

  it('ein Inhalt, der nicht der gespeicherte ist (angelegt oder Zustand): konflikt, nichts geschrieben', async () => {
    const kern = await mitTypisch();
    await anlegen(kern, 'stand-1', 'Versand', um(1));
    const s = stand(kern, 'stand-1');
    const b: Befehl = { art: 'LvStandLoeschen', lvStandId: s.id };
    const andererZustand: LvZustand = {
      ...s.zustand,
      leistungsverzeichnis: { ...s.zustand.leistungsverzeichnis, name: 'anders (erfunden)' },
    };
    for (const anders of [
      { ...s, angelegt: um(2) },
      { ...s, zustand: andererZustand },
    ]) {
      expect(fehlercode((await versuche(kern, b, loeschen(anders))).r)).toBe('konflikt');
    }
    expect(wert(kern.lvStaendeAuflisten(LV))).toHaveLength(1);
  });

  it('nach dem Löschen aller Stände lässt sich das LV löschen (Q5, D-12)', async () => {
    const winzig = ladeFixture('winzig');
    const { kern } = await neuerKern();
    await speichere(kern, anlegenSchritte(winzig, 10));
    const id = winzig.lv.leistungsverzeichnis.id;
    const agg: Protokolleintrag['aggregat'] = { art: 'leistungsverzeichnis', id };
    const e = (b: Befehl): Protokolleintrag => eintrag((nr += 1), winzig.projekt.id, agg, b);
    wert(
      await kern.anwenden(
        e({ art: 'LvStandAnlegen', id: 'stand-w' as never, name: 'Versand' }),
        standAnlegen(wert(kern.lvLaden(id)), 'stand-w', 'Versand'),
      ),
    );
    const s = wert(kern.lvStandLaden('stand-w' as never));
    wert(
      await kern.anwenden(e({ art: 'LvStandLoeschen', lvStandId: s.id }), {
        ...loeschen(s),
        leistungsverzeichnisId: id,
      }),
    );
    wert(
      await kern.anwenden(
        e({ art: 'LeistungsverzeichnisLoeschen' }),
        lvLoeschenChangeSet(wert(kern.lvLaden(id))),
      ),
    );
    expect(wert(kern.lvAuflisten(winzig.projekt.id))).toEqual([]);
  });
});

describe('Einfrieren nur bei LvStandAnlegen (D-82 M2) und die Form von lvStandInhalt', () => {
  it('ein Stand ohne Inhalt entsteht nur über LvStandAnlegen oder dessen Wiederholen; sonst unbekannt', async () => {
    const kern = await mitTypisch();
    const cs = standAnlegen(lv(kern), 'stand-1', 'Versand');
    for (const b of [
      { art: 'LvStandUmbenennen', lvStandId: 'stand-1' as never, name: 'Versand' },
      { art: 'MengeAendern', positionId: erste.id, menge: '1.000' as never },
    ] as const)
      expect(fehlercode((await versuche(kern, b, cs)).r)).toBe('unbekannt');
    // Rückgängig eines Löschens ohne den Inhalt des Stands: würde neu einfrieren statt zurückzulegen.
    const original = await anlegen(kern, 'stand-1', 'Versand', um(1));
    const s = stand(kern, 'stand-1');
    const geloescht = await schreibe(kern, { art: 'LvStandLoeschen', lvStandId: s.id }, loeschen(s), um(2));
    expect(
      fehlercode((await versuche(kern, { art: 'Rueckgaengig', protokollId: geloescht.id }, cs, um(3))).r),
    ).toBe('unbekannt');
    expect(fehlercode((await versuche(kern, { art: 'Wiederholen', protokollId: geloescht.id }, cs)).r)).toBe(
      'unbekannt',
    );
    // Wiederholen des Anlegens friert das LV neu ein (D-12).
    await schreibe(kern, { art: 'Wiederholen', protokollId: original.id }, cs, um(4));
    expect(stand(kern, 'stand-1')).toEqual({ ...s, angelegt: um(4) });
  });

  it('ein Stand ohne Inhalt entfällt nur als Rückgängig eines LvStandAnlegen; sonst unbekannt (D-82 M2)', async () => {
    const kern = await mitTypisch();
    const angelegt = await anlegen(kern, 'stand-1', 'Versand', um(1));
    const ohneInhalt = umkehren(standAnlegen(lv(kern), 'stand-1', 'Versand'));
    for (const b of [
      { art: 'LvStandLoeschen', lvStandId: 'stand-1' as never },
      { art: 'MengeAendern', positionId: erste.id, menge: '1.000' as never },
      { art: 'Wiederholen', protokollId: angelegt.id },
    ] as const)
      expect(fehlercode((await versuche(kern, b, ohneInhalt)).r), b.art).toBe('unbekannt');
    // Ein Rückgängig, das auf einen anderen Befehl als LvStandAnlegen verweist, ebenso.
    const umbenannt = await schreibe(
      kern,
      { art: 'LvStandUmbenennen', lvStandId: 'stand-1' as never, name: 'Versand' },
      umbenennen(stand(kern, 'stand-1'), 'Versand'),
    );
    expect(
      fehlercode((await versuche(kern, { art: 'Rueckgaengig', protokollId: umbenannt.id }, ohneInhalt)).r),
    ).toBe('unbekannt');
    expect(wert(kern.lvStaendeAuflisten(LV))).toHaveLength(1);
    await schreibe(kern, { art: 'Rueckgaengig', protokollId: angelegt.id }, ohneInhalt);
    expect(wert(kern.lvStaendeAuflisten(LV))).toEqual([]);
  });

  it('lvStandInhalt ohne lvStand, auf der anderen Seite null als lvStand oder mit beiden Seiten: unbekannt', async () => {
    const kern = await mitTypisch();
    await anlegen(kern, 'stand-1', 'Versand', um(1));
    const s = stand(kern, 'stand-1');
    const inhalt = { angelegt: s.angelegt, zustand: s.zustand };
    const b: Befehl = { art: 'LvStandLoeschen', lvStandId: s.id };
    for (const cs of [
      { ...rahmen(), lvStandInhalt: { vorher: inhalt, nachher: null } },
      {
        ...rahmen(),
        lvStand: { vorher: kopfVon(s), nachher: null },
        lvStandInhalt: { vorher: null, nachher: inhalt },
      },
      {
        ...rahmen(),
        lvStand: { vorher: kopfVon(s), nachher: null },
        lvStandInhalt: { vorher: inhalt, nachher: inhalt },
      },
      {
        ...rahmen(),
        lvStand: { vorher: null, nachher: kopfVon(s) },
        lvStandInhalt: { vorher: inhalt, nachher: null },
      },
    ] as LvChangeSet[])
      expect(fehlercode((await versuche(kern, b, cs)).r)).toBe('unbekannt');
    expect(stand(kern, 'stand-1')).toEqual(s);
  });

  it('Wiederherstellen: eine vergebene Kennung ist konflikt, ein Stand eines anderen LV unbekannt', async () => {
    const kern = await mitTypisch();
    await anlegen(kern, 'stand-1', 'Versand', um(1));
    const s = stand(kern, 'stand-1');
    const geloescht = await schreibe(kern, { art: 'LvStandLoeschen', lvStandId: s.id }, loeschen(s), um(2));
    const b: Befehl = { art: 'Rueckgaengig', protokollId: geloescht.id };
    const zurueck = umkehren(loeschen(s));
    await schreibe(kern, b, zurueck, um(3));
    expect(fehlercode((await versuche(kern, b, zurueck)).r)).toBe('konflikt');
    const fremd: LvStand = {
      ...s,
      id: 'stand-f' as never,
      zustand: {
        ...s.zustand,
        leistungsverzeichnis: { ...s.zustand.leistungsverzeichnis, id: 'anderes' as never },
      },
    };
    expect(fehlercode((await versuche(kern, b, umkehren(loeschen(fremd)))).r)).toBe('unbekannt');
    const fremderKopf: LvStand = { ...s, id: 'stand-g' as never, leistungsverzeichnisId: 'anderes' as never };
    expect(fehlercode((await versuche(kern, b, umkehren(loeschen(fremderKopf)))).r)).toBe('unbekannt');
    expect(wert(kern.lvStaendeAuflisten(LV)).map((x) => x.id)).toEqual(['stand-1']);
  });
});
