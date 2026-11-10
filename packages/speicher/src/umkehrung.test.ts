// SPDX-License-Identifier: AGPL-3.0-or-later
// S3, Punkt 1: Jede Art ChangeSet lässt sich als Umkehrung anwenden. Anwenden, Umkehrung anwenden (als `Rueckgaengig`)
// → die Projektdatei ist byte-gleich dem Stand davor; nur das Protokoll (Nebenbuch, ADR 0009) wächst um genau die
// zwei Einträge. Die Umkehrung baut der Test aus dem ChangeSet allein (`testhilfe/umkehrung.ts`, kein Kern).

import type {
  AngebotZustand,
  Befehl,
  ChangeSet,
  ElternId,
  Knoten,
  LvZustand,
  Position,
  PositionId,
  Projekt,
  ProjektId,
  Protokolleintrag,
  TitelId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { kanonischesJson } from './kanonisch';
import type { SpeicherKern } from './kern';
import {
  anlegenSchritte,
  angebotAnlegenChangeSet,
  angebotLoeschenChangeSet,
  auftragsLvAnlegenChangeSet,
  auftragsLvAus,
  eintrag,
  ladeFixture,
  lvAnlegenChangeSet,
  lvLoeschenChangeSet,
  projektChangeSet,
} from './testhilfe/fixtures';
import { imProtokoll, neuerKern, speichere, wert, zaehle } from './testhilfe/node';
import {
  ausBaumNehmen,
  einfuegen,
  eintragEntfernen,
  feldAendern,
  kopfAendern,
  letztenVerschieben,
  mitLeeremVorher,
  standAnlegen,
  umkehren,
} from './testhilfe/umkehrung';

const typisch = ladeFixture('typisch');
const P = typisch.projekt.id;
const LV = typisch.lv.leistungsverzeichnis.id;
const titel = typisch.lv.leistungsverzeichnis.knoten.filter((k) => k.elternId === LV && k.art === 'titel');
const T1 = titel[0]?.id as TitelId;
const T2 = titel[1]?.id as TitelId;
const HINWEIS = typisch.lv.leistungsverzeichnis.knoten.find((k) => k.art === 'hinweis')?.id as string;
const positionen = typisch.lv.leistungsverzeichnis.knoten.filter((k): k is Position => k.art === 'position');
const pos = (i: number): Position =>
  positionen[i] ??
  (() => {
    throw new Error('Position fehlt');
  })();

let nr = 100;
const naechste = (): number => nr++;

type Aggregat = Protokolleintrag['aggregat'];
const lvAggregat: Aggregat = { art: 'leistungsverzeichnis', id: LV };

async function mitTypisch(): Promise<SpeicherKern> {
  const { kern } = await neuerKern();
  await speichere(kern, anlegenSchritte(typisch));
  return kern;
}

/** Projektdatei ohne Protokoll (kanonisch) und das Protokoll getrennt. */
function teile(text: string): { rest: string; protokoll: unknown[] } {
  const d = JSON.parse(text) as Record<string, unknown>;
  const protokoll = d['protokoll'] as unknown[];
  Reflect.deleteProperty(d, 'protokoll');
  return { rest: kanonischesJson(d), protokoll };
}

/**
 * Wendet `cs` mit `befehl` an, dann seine Umkehrung als `Rueckgaengig`, und prüft: Export byte-gleich dem Stand davor
 * (ohne Protokoll), das Protokoll um genau die zwei Einträge länger.
 */
async function hinUndZurueck(
  kern: SpeicherKern,
  aggregat: Aggregat,
  befehl: Befehl,
  cs: ChangeSet,
  projektId: ProjektId = P,
): Promise<void> {
  const davor = teile(wert(kern.projektdateiExportieren(projektId)));
  const hin = eintrag(naechste(), projektId, aggregat, befehl);
  wert(await kern.anwenden(hin, cs));
  expect(teile(wert(kern.projektdateiExportieren(projektId))).rest).not.toBe(davor.rest);
  const zurueck = eintrag(naechste(), projektId, aggregat, { art: 'Rueckgaengig', protokollId: hin.id });
  wert(await kern.anwenden(zurueck, umkehren(cs)));
  const danach = teile(wert(kern.projektdateiExportieren(projektId)));
  expect(danach.rest === davor.rest).toBe(true);
  expect(danach.protokoll).toEqual([...davor.protokoll, imProtokoll(hin), zurueck]);
}

const lv = (kern: SpeicherKern): LvZustand => wert(kern.lvLaden(LV));

const neuePosition = (id: string, elternId: string): Position => ({
  ...pos(0),
  id: id as PositionId,
  elternId: elternId as ElternId,
  reihenfolge: 0,
  kurztext: `Neu ${id}`,
});

describe('Umkehrung je ChangeSet-Art: anwenden, Umkehrung anwenden → Export byte-gleich (S3, Punkt 1)', () => {
  it('Feld ändern (MengeAendern)', async () => {
    const kern = await mitTypisch();
    const p = pos(1);
    const neu: Knoten = { ...p, menge: '7.000' as Position['menge'] };
    await hinUndZurueck(
      kern,
      lvAggregat,
      { art: 'MengeAendern', positionId: p.id, menge: neu.menge },
      feldAendern(lv(kern), p.id, neu, '70.00'),
    );
  });

  it('Knoten anlegen (PositionAnlegen)', async () => {
    const kern = await mitTypisch();
    const n = neuePosition('neu-1', T1);
    await hinUndZurueck(
      kern,
      lvAggregat,
      { art: 'PositionAnlegen', id: n.id, ort: { art: 'ende', elternId: T1 }, daten: {} as never },
      einfuegen(lv(kern), T1, [n]),
    );
  });

  it('Knoten löschen (KnotenLoeschen, Geschwister rücken auf)', async () => {
    const kern = await mitTypisch();
    await hinUndZurueck(
      kern,
      lvAggregat,
      { art: 'KnotenLoeschen', knotenId: HINWEIS as never },
      ausBaumNehmen(lv(kern), [HINWEIS]),
    );
  });

  it('Knoten einfügen (KnotenEinfuegen, Teilbaum)', async () => {
    const kern = await mitTypisch();
    const t: Knoten = {
      ...(titel[0] as Knoten),
      id: 'neu-titel' as TitelId,
      elternId: LV,
      reihenfolge: 0,
    } as Knoten;
    const n = { ...neuePosition('neu-2', 'neu-titel'), reihenfolge: 0 };
    await hinUndZurueck(
      kern,
      lvAggregat,
      { art: 'KnotenEinfuegen', ort: { art: 'ende', elternId: LV }, knoten: [t, n] },
      einfuegen(lv(kern), LV, [t, n]),
    );
  });

  it('Knoten verschieben (KnotenVerschieben)', async () => {
    const kern = await mitTypisch();
    const cs = letztenVerschieben(lv(kern), T1, T2);
    const k = cs.knoten.geaendert[0]?.vorher.id as never;
    await hinUndZurueck(
      kern,
      lvAggregat,
      { art: 'KnotenVerschieben', knotenId: k, ziel: { art: 'ende', elternId: T2 } },
      cs,
    );
  });

  it('Papierkorb hinein (KnotenInPapierkorbLegen)', async () => {
    const kern = await mitTypisch();
    const cs = ausBaumNehmen(lv(kern), [pos(2).id], { id: 'eintrag-1', nummer: 1 });
    await hinUndZurueck(
      kern,
      lvAggregat,
      { art: 'KnotenInPapierkorbLegen', eintragId: 'eintrag-1' as never, knotenIds: [pos(2).id] },
      cs,
    );
  });

  it('Papierkorb zurück (PapierkorbeintragWiederherstellen)', async () => {
    const kern = await mitTypisch();
    const hinein = ausBaumNehmen(lv(kern), [T2], { id: 'eintrag-1', nummer: 1 });
    wert(
      await kern.anwenden(
        eintrag(naechste(), P, lvAggregat, {
          art: 'KnotenInPapierkorbLegen',
          eintragId: 'eintrag-1' as never,
          knotenIds: [T2],
        }),
        hinein,
      ),
    );
    expect(lv(kern).papierkorb?.map((e) => e.id)).toEqual(['eintrag-1']);
    await hinUndZurueck(
      kern,
      lvAggregat,
      { art: 'PapierkorbeintragWiederherstellen', eintragId: 'eintrag-1' as never, ort: null },
      umkehren(hinein),
    );
  });

  it('Papierkorb entfernen (PapierkorbeintragEntfernen)', async () => {
    const kern = await mitTypisch();
    const hinein = ausBaumNehmen(lv(kern), [HINWEIS], { id: 'eintrag-1', nummer: 1 });
    wert(
      await kern.anwenden(
        eintrag(naechste(), P, lvAggregat, {
          art: 'KnotenInPapierkorbLegen',
          eintragId: 'eintrag-1' as never,
          knotenIds: [HINWEIS as never],
        }),
        hinein,
      ),
    );
    const e = lv(kern).papierkorb?.[0];
    if (e === undefined) throw new Error('kein Eintrag');
    await hinUndZurueck(
      kern,
      lvAggregat,
      { art: 'PapierkorbeintragEntfernen', eintragId: e.id },
      eintragEntfernen(lv(kern), e),
    );
  });

  it('Nachlass setzen', async () => {
    const kern = await mitTypisch();
    const nachlass = { art: 'prozent', wert: '3.50' } as const;
    await hinUndZurueck(
      kern,
      lvAggregat,
      { art: 'NachlassSetzen', nachlass: nachlass as never },
      kopfAendern(lv(kern), { nachlass: nachlass as never }, '9.00'),
    );
  });

  it('MwSt-Satz setzen', async () => {
    const kern = await mitTypisch();
    await hinUndZurueck(
      kern,
      lvAggregat,
      { art: 'MwstSatzSetzen', mwstSatz: '7.00' as never },
      kopfAendern(lv(kern), { mwstSatz: '7.00' as never }, '8.00'),
    );
  });

  it('LV anlegen (Umkehrung löscht es wieder)', async () => {
    const kern = await mitTypisch();
    const zweit = ladeFixture('winzig').lv;
    const zweitesLv: LvZustand = {
      ...zweit,
      leistungsverzeichnis: { ...zweit.leistungsverzeichnis, projektId: P },
    };
    const schritt = anlegenSchritte({ projekt: typisch.projekt, lv: zweitesLv, angebote: [] })[1];
    if (schritt === undefined) throw new Error('kein LV-Schritt');
    await hinUndZurueck(
      kern,
      schritt.eintrag.aggregat,
      schritt.eintrag.befehl as Befehl,
      mitLeeremVorher(lvAnlegenChangeSet(zweitesLv)),
    );
  });

  it('LV löschen (Umkehrung legt es samt Papierkorb wieder an)', async () => {
    const winzig = ladeFixture('winzig');
    const { kern } = await neuerKern();
    await speichere(kern, anlegenSchritte(winzig, 10));
    const id = winzig.lv.leistungsverzeichnis.id;
    const z = wert(kern.lvLaden(id));
    const erste = z.leistungsverzeichnis.knoten[0]?.id as string;
    const hinein = ausBaumNehmen(z, [erste], { id: 'eintrag-w', nummer: 1 });
    const agg: Aggregat = { art: 'leistungsverzeichnis', id };
    wert(
      await kern.anwenden(
        eintrag(naechste(), winzig.projekt.id, agg, {
          art: 'KnotenInPapierkorbLegen',
          eintragId: 'eintrag-w' as never,
          knotenIds: [erste as never],
        }),
        hinein,
      ),
    );
    const mitKorb = wert(kern.lvLaden(id));
    const loeschen = {
      ...lvLoeschenChangeSet(mitKorb),
      papierkorb: { hinzugefuegt: [], geaendert: [], entfernt: mitKorb.papierkorb ?? [] },
    };
    await hinUndZurueck(kern, agg, { art: 'LeistungsverzeichnisLoeschen' }, loeschen, winzig.projekt.id);
  });

  it('Angebot anlegen und löschen', async () => {
    const kern = await mitTypisch();
    const a = typisch.angebote[0] as AngebotZustand;
    const neu: AngebotZustand = { ...a, angebot: { ...a.angebot, id: 'angebot-neu' as never } };
    await hinUndZurueck(
      kern,
      { art: 'angebot', id: neu.angebot.id },
      { art: 'AngebotAnlegen', angebot: neu.angebot },
      mitLeeremVorher(angebotAnlegenChangeSet(neu)),
    );
    await hinUndZurueck(
      kern,
      { art: 'angebot', id: a.angebot.id },
      { art: 'AngebotLoeschen' },
      angebotLoeschenChangeSet(wert(kern.angebotLaden(a.angebot.id))),
    );
  });

  it('Auftrags-LV anlegen (Umkehrung löscht es wieder)', async () => {
    const kern = await mitTypisch();
    const auftrag = auftragsLvAus(typisch.lv, typisch.angebote[0]?.angebot.id as never);
    await hinUndZurueck(
      kern,
      { art: 'auftrags-leistungsverzeichnis', id: auftrag.auftragsLeistungsverzeichnis.id },
      {
        art: 'AuftragsLeistungsverzeichnisAnlegen',
        auftragsLeistungsverzeichnis: auftrag.auftragsLeistungsverzeichnis,
      },
      mitLeeremVorher(auftragsLvAnlegenChangeSet(auftrag)),
    );
  });

  it('LV-Stand anlegen (Umkehrung entfernt ihn)', async () => {
    const kern = await mitTypisch();
    await hinUndZurueck(
      kern,
      lvAggregat,
      { art: 'LvStandAnlegen', id: 'stand-1' as never, name: 'Versand' },
      standAnlegen(lv(kern), 'stand-1', 'Versand'),
    );
  });

  it('Projekt ändern (ProjektStammdatenSetzen)', async () => {
    const kern = await mitTypisch();
    const p = typisch.projekt;
    const neu: Projekt = { ...p, name: 'Umbenannt' };
    await hinUndZurueck(
      kern,
      { art: 'projekt', id: P },
      { art: 'ProjektStammdatenSetzen', name: neu.name, bauherr: neu.bauherr },
      { art: 'projekt', projektId: P, projekt: { vorher: p, nachher: neu } },
    );
  });

  it('Projekt anlegen: die Umkehrung löscht es; danach ist der Speicher leer wie vorher', async () => {
    const { kern, db } = await neuerKern();
    const p: Projekt = { ...typisch.projekt, id: 'projekt-allein' as ProjektId };
    const hin = eintrag(
      naechste(),
      p.id,
      { art: 'projekt', id: p.id },
      { art: 'ProjektAnlegen', id: p.id, name: p.name, bauherr: p.bauherr },
    );
    wert(await kern.anwenden(hin, projektChangeSet(p)));
    const zurueck = eintrag(
      naechste(),
      p.id,
      { art: 'projekt', id: p.id },
      { art: 'Rueckgaengig', protokollId: hin.id },
    );
    wert(await kern.anwenden(zurueck, umkehren(projektChangeSet(p))));
    expect(wert(kern.projekteAuflisten())).toEqual([]);
    for (const t of ['projekt', 'bieter', 'protokoll']) expect(zaehle(db, t)).toBe(0);
  });

  it('Projekt löschen: die Umkehrung legt es samt Bietern wieder an; das Protokoll beginnt neu (D-31.1)', async () => {
    const { kern } = await neuerKern();
    const p: Projekt = { ...typisch.projekt, id: 'projekt-allein' as ProjektId };
    wert(
      await kern.anwenden(
        eintrag(
          naechste(),
          p.id,
          { art: 'projekt', id: p.id },
          { art: 'ProjektAnlegen', id: p.id, name: p.name, bauherr: p.bauherr },
        ),
        projektChangeSet(p),
      ),
    );
    const davor = teile(wert(kern.projektdateiExportieren(p.id)));
    const loeschen: ChangeSet = { art: 'projekt', projektId: p.id, projekt: { vorher: p, nachher: null } };
    const hin = eintrag(naechste(), p.id, { art: 'projekt', id: p.id }, { art: 'ProjektLoeschen' });
    wert(await kern.anwenden(hin, loeschen));
    // Der Eintrag des Löschbefehls ging mit dem Protokoll (D-31.1); der Verweis des Rückgängig zeigt deshalb ins Leere.
    const zurueck = eintrag(
      naechste(),
      p.id,
      { art: 'projekt', id: p.id },
      { art: 'Rueckgaengig', protokollId: hin.id },
    );
    wert(await kern.anwenden(zurueck, umkehren(loeschen)));
    const danach = teile(wert(kern.projektdateiExportieren(p.id)));
    expect(danach.rest === davor.rest).toBe(true);
    expect(danach.protokoll).toEqual([zurueck]);
  });
});

describe('Umkehrung gegen einen veränderten Stand (S3, Punkt 1)', () => {
  it('passt vorher nicht mehr zum gespeicherten Stand: konflikt, nichts geändert, kein Protokolleintrag', async () => {
    const kern = await mitTypisch();
    const p = pos(1);
    const erste = feldAendern(lv(kern), p.id, { ...p, menge: '7.000' as Position['menge'] }, '70.00');
    const e1 = eintrag(naechste(), P, lvAggregat, {
      art: 'MengeAendern',
      positionId: p.id,
      menge: '7.000' as never,
    });
    wert(await kern.anwenden(e1, erste));
    const geaendert = lv(kern).leistungsverzeichnis.knoten.find((k) => k.id === p.id) as Position;
    const zweite = feldAendern(lv(kern), p.id, { ...geaendert, kurztext: 'später geändert' }, '71.00');
    wert(
      await kern.anwenden(
        eintrag(naechste(), P, lvAggregat, {
          art: 'KurztextAendern',
          knotenId: p.id,
          kurztext: 'später geändert',
        }),
        zweite,
      ),
    );
    const davor = wert(kern.projektdateiExportieren(P));
    const r = await kern.anwenden(
      eintrag(naechste(), P, lvAggregat, { art: 'Rueckgaengig', protokollId: e1.id }),
      umkehren(erste),
    );
    expect(r).toMatchObject({ ok: false, fehler: { code: 'konflikt' } });
    expect(wert(kern.projektdateiExportieren(P)) === davor).toBe(true);
  });

  it('ein LV-Stand, der nicht (mehr) da ist, lässt sich nicht entfernen: konflikt bzw. nicht-gefunden', async () => {
    const kern = await mitTypisch();
    const cs = standAnlegen(lv(kern), 'stand-1', 'Versand');
    const e1 = eintrag(naechste(), P, lvAggregat, {
      art: 'LvStandAnlegen',
      id: 'stand-1' as never,
      name: 'Versand',
    });
    wert(await kern.anwenden(e1, cs));
    const kopf = cs.lvStand?.nachher;
    if (kopf == null) throw new Error('kein Stand');
    const umbenannt = umkehren({ ...cs, lvStand: { vorher: null, nachher: { ...kopf, name: 'anders' } } });
    const r = await kern.anwenden(
      eintrag(naechste(), P, lvAggregat, { art: 'Rueckgaengig', protokollId: e1.id }),
      umbenannt,
    );
    expect(r).toMatchObject({ ok: false, fehler: { code: 'konflikt' } });
  });
});
