// SPDX-License-Identifier: AGPL-3.0-or-later
// v1.1a im Speicher: Fehlercodes `konflikt` und `existiert-bereits`, Löschen von Projekt, LV und Angebot (Punkt 4) und
// das Auftrags-LV als eigenes Aggregat (Punkt 5).

import type {
  AngebotChangeSet,
  AuftragsLvChangeSet,
  AuftragsLvZustand,
  Ergebnis,
  LvChangeSet,
  Position,
  Projekt,
  ProjektChangeSet,
  Protokolleintrag,
  Speicherfehler,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { MIGRATIONEN } from './migrationen';
import { leseProjektdatei } from './projektdatei';
import {
  angebotLoeschenChangeSet,
  anlegenSchritte,
  auftragsLvAnlegenChangeSet,
  auftragsLvAus,
  eintrag,
  ladeFixture,
  lvLoeschenChangeSet,
  normalisiere,
  projektChangeSet,
} from './testhilfe/fixtures';
import { imProtokoll, neuerKern, speichere, wert, zaehle } from './testhilfe/node';
import type { SpeicherKern } from './kern';
import type { Datenbank } from './sql';
import { LEERES_SUMMENVORHER } from './summenvorher';

const typisch = ladeFixture('typisch');
const winzig = ladeFixture('winzig');
const projektId = typisch.projekt.id;
const lvId = typisch.lv.leistungsverzeichnis.id;

const code = (r: Ergebnis<unknown, Speicherfehler>): string | undefined => (r.ok ? undefined : r.fehler.code);

let nr = 500;
const lvEintrag = (p = projektId, id = lvId): Protokolleintrag =>
  eintrag(nr++, p, { art: 'leistungsverzeichnis', id }, { art: 'LeistungsverzeichnisLoeschen' });
const angebotEintrag = (id: string): Protokolleintrag =>
  eintrag(nr++, projektId, { art: 'angebot', id: id as never }, { art: 'AngebotLoeschen' });
const projektEintrag = (p = projektId): Protokolleintrag =>
  eintrag(nr++, p, { art: 'projekt', id: p }, { art: 'ProjektLoeschen' });
const auftragEintrag = (z: AuftragsLvZustand): Protokolleintrag =>
  eintrag(
    nr++,
    projektId,
    { art: 'auftrags-leistungsverzeichnis', id: z.auftragsLeistungsverzeichnis.id },
    {
      art: 'AuftragsLeistungsverzeichnisAnlegen',
      auftragsLeistungsverzeichnis: z.auftragsLeistungsverzeichnis,
    },
  );

/** Zeilen eines Aggregats in allen Tabellen, die nach `aggregat_id` geschlüsselt sind. */
function zeilenVon(db: Datenbank, aggregatId: string): number {
  return ['knoten', 'summe_position', 'summe_gliederung', 'summe_gesamt']
    .map((t) => db.zeilen(`SELECT COUNT(*) AS n FROM ${t} WHERE aggregat_id = ?`, [aggregatId])[0]?.['n'])
    .reduce<number>((a, n) => a + (typeof n === 'number' ? n : 0), 0);
}

/** Die Umkehrung eines LV-Löschens ist das Anlegen (Vertrag, `LvChangeSet`): ohne Kern gebaut, nur aus dem ChangeSet. */
function umkehrLv(cs: LvChangeSet): LvChangeSet {
  const vorher = cs.summen.vorher;
  if (cs.kopf === null) throw new Error('kein Löschen');
  return {
    art: 'leistungsverzeichnis',
    leistungsverzeichnisId: cs.leistungsverzeichnisId,
    kopf: { vorher: null, nachher: cs.kopf.vorher },
    knoten: { hinzugefuegt: cs.knoten.entfernt, geaendert: [], entfernt: [] },
    summen: {
      positionen: vorher.entfernt.positionen,
      gliederungen: vorher.entfernt.gliederungen,
      gesamt: vorher.gesamt,
      vorher: LEERES_SUMMENVORHER,
    },
  };
}

function umkehrAngebot(cs: AngebotChangeSet): AngebotChangeSet {
  const vorher = cs.summen.vorher;
  if (cs.kopf === null) throw new Error('kein Löschen');
  return {
    art: 'angebot',
    angebotId: cs.angebotId,
    kopf: { vorher: null, nachher: cs.kopf.vorher },
    positionen: { hinzugefuegt: cs.positionen.entfernt, geaendert: [], entfernt: [] },
    summen: {
      positionen: vorher.entfernt.positionen,
      gliederungen: vorher.entfernt.gliederungen,
      gesamt: vorher.gesamt,
      vorher: LEERES_SUMMENVORHER,
    },
  };
}

async function mitTypisch(): Promise<{ kern: SpeicherKern; db: Datenbank }> {
  const env = await neuerKern();
  await speichere(env.kern, anlegenSchritte(typisch));
  return env;
}

describe('konflikt (v1.1a, Punkt 3)', () => {
  it('abweichendes vorher am Knoten: konflikt, nichts geschrieben', async () => {
    const { kern, db } = await mitTypisch();
    const p = typisch.lv.leistungsverzeichnis.knoten.find((k): k is Position => k.art === 'position');
    if (p === undefined) throw new Error('keine Position');
    const vorherStand = wert(kern.lvLaden(lvId));
    const protokolle = zaehle(db, 'protokoll');
    const cs: LvChangeSet = {
      art: 'leistungsverzeichnis',
      leistungsverzeichnisId: lvId,
      kopf: null,
      knoten: {
        hinzugefuegt: [],
        geaendert: [{ vorher: { ...p, kurztext: 'veraltet' }, nachher: { ...p, kurztext: 'neu' } }],
        entfernt: [],
      },
      summen: { positionen: [], gliederungen: [], gesamt: null, vorher: LEERES_SUMMENVORHER },
    };
    expect(code(await kern.anwenden(lvEintrag(), cs))).toBe('konflikt');
    expect(wert(kern.lvLaden(lvId))).toEqual(vorherStand);
    expect(zaehle(db, 'protokoll')).toBe(protokolle);
  });

  it('abweichendes vorher beim Löschen: konflikt', async () => {
    const { kern } = await neuerKern();
    await speichere(kern, anlegenSchritte(winzig));
    const id = winzig.lv.leistungsverzeichnis.id;
    const gespeichert = wert(kern.lvLaden(id));
    const cs = lvLoeschenChangeSet(gespeichert);
    const kopf = cs.kopf?.vorher ?? never();
    const falsch: LvChangeSet = { ...cs, kopf: { vorher: { ...kopf, name: 'veraltet' }, nachher: null } };
    expect(code(await kern.anwenden(lvEintrag(winzig.projekt.id, id), falsch))).toBe('konflikt');
    expect(wert(kern.lvLaden(id))).toEqual(gespeichert);
  });
});

describe('existiert-bereits (v1.1a, Punkt 3)', () => {
  it('doppelter Import einer Projektdatei: existiert-bereits, nichts überschrieben', async () => {
    const { kern, db } = await mitTypisch();
    const text = wert(kern.projektdateiExportieren(projektId));
    const knoten = zaehle(db, 'knoten');
    const r = await kern.projektdateiImportieren(text);
    expect(code(r)).toBe('existiert-bereits');
    expect(zaehle(db, 'knoten')).toBe(knoten);
  });
});

describe('LV löschen (v1.1a, Punkt 4)', () => {
  it('löscht alle Zeilen, schreibt den Protokolleintrag; die Umkehrung stellt denselben LvZustand her', async () => {
    const { kern, db } = await neuerKern();
    await speichere(kern, anlegenSchritte(winzig));
    const id = winzig.lv.leistungsverzeichnis.id;
    const p = winzig.projekt.id;
    const vorher = wert(kern.lvLaden(id));
    expect(zeilenVon(db, id)).toBeGreaterThan(0);
    const protokolle = zaehle(db, 'protokoll');

    const cs = lvLoeschenChangeSet(vorher);
    wert(await kern.anwenden(lvEintrag(p, id), cs));
    expect(code(kern.lvLaden(id))).toBe('nicht-gefunden');
    expect(zeilenVon(db, id)).toBe(0);
    expect(zaehle(db, 'protokoll')).toBe(protokolle + 1);
    expect(wert(kern.lvAuflisten(p))).toEqual([]);

    wert(await kern.anwenden(lvEintrag(p, id), umkehrLv(cs)));
    expect(wert(kern.lvLaden(id))).toEqual(vorher);
  });

  it('mit Angeboten: konflikt, nichts gelöscht', async () => {
    const { kern, db } = await mitTypisch();
    const vorher = wert(kern.lvLaden(lvId));
    const r = await kern.anwenden(lvEintrag(), lvLoeschenChangeSet(vorher));
    expect(code(r)).toBe('konflikt');
    expect(!r.ok && r.fehler.meldung).toContain('Angebot');
    expect(wert(kern.lvLaden(lvId))).toEqual(vorher);
    expect(zaehle(db, 'protokoll')).toBe(anlegenSchritte(typisch).length);
  });

  it('nicht alle Knoten im ChangeSet: konflikt (das Löschen wäre nicht umkehrbar)', async () => {
    const { kern } = await neuerKern();
    await speichere(kern, anlegenSchritte(winzig));
    const id = winzig.lv.leistungsverzeichnis.id;
    const vorher = wert(kern.lvLaden(id));
    const cs = lvLoeschenChangeSet(vorher);
    const unvollstaendig: LvChangeSet = {
      ...cs,
      knoten: { ...cs.knoten, entfernt: cs.knoten.entfernt.slice(1) },
    };
    expect(code(await kern.anwenden(lvEintrag(winzig.projekt.id, id), unvollstaendig))).toBe('konflikt');
    expect(wert(kern.lvLaden(id))).toEqual(vorher);
  });

  it('abweichende Summen in summen.vorher: konflikt', async () => {
    const { kern } = await neuerKern();
    await speichere(kern, anlegenSchritte(winzig));
    const id = winzig.lv.leistungsverzeichnis.id;
    const vorher = wert(kern.lvLaden(id));
    const cs = lvLoeschenChangeSet({
      ...vorher,
      summen: { ...vorher.summen, gesamt: { ...vorher.summen.gesamt, netto: '0.01' as never } },
    });
    expect(code(await kern.anwenden(lvEintrag(winzig.projekt.id, id), cs))).toBe('konflikt');
  });

  it('ein nicht vorhandenes LV zu löschen ist nicht-gefunden', async () => {
    const { kern } = await neuerKern();
    await speichere(kern, anlegenSchritte(winzig).slice(0, 1));
    const cs = lvLoeschenChangeSet(winzig.lv);
    expect(
      code(await kern.anwenden(lvEintrag(winzig.projekt.id, winzig.lv.leistungsverzeichnis.id), cs)),
    ).toBe('nicht-gefunden');
  });
});

describe('Angebot löschen (v1.1a, Punkt 4)', () => {
  it('löscht Kopf, Positionen und Summen; die Umkehrung stellt es wieder her', async () => {
    const { kern, db } = await mitTypisch();
    const a = typisch.angebote[0] ?? never();
    const id = a.angebot.id;
    const vorher = wert(kern.angebotLaden(id));
    const cs = angebotLoeschenChangeSet(vorher);
    wert(await kern.anwenden(angebotEintrag(id), cs));
    expect(code(kern.angebotLaden(id))).toBe('nicht-gefunden');
    expect(zeilenVon(db, id)).toBe(0);
    expect(db.zeilen('SELECT 1 FROM angebotsposition WHERE angebot_id = ?', [id])).toHaveLength(0);
    expect(wert(kern.angeboteAuflisten(lvId))).not.toContain(id);
    wert(await kern.anwenden(angebotEintrag(id), umkehrAngebot(cs)));
    expect(wert(kern.angebotLaden(id))).toEqual(vorher);
  });

  it('nicht alle Positionen im ChangeSet: konflikt', async () => {
    const { kern } = await mitTypisch();
    const a = typisch.angebote[0] ?? never();
    const cs = angebotLoeschenChangeSet(wert(kern.angebotLaden(a.angebot.id)));
    const r = await kern.anwenden(angebotEintrag(a.angebot.id), {
      ...cs,
      positionen: { ...cs.positionen, entfernt: cs.positionen.entfernt.slice(1) },
    });
    expect(code(r)).toBe('konflikt');
    expect(wert(kern.angebotLaden(a.angebot.id))).toEqual(normalisiere(a));
  });

  it('ein Auftrags-LV verweist darauf: konflikt', async () => {
    const { kern } = await mitTypisch();
    const a = typisch.angebote[0] ?? never();
    const auftrag = auftragsLvAus(typisch.lv, a.angebot.id);
    wert(await kern.anwenden(auftragEintrag(auftrag), auftragsLvAnlegenChangeSet(auftrag)));
    const r = await kern.anwenden(
      angebotEintrag(a.angebot.id),
      angebotLoeschenChangeSet(wert(kern.angebotLaden(a.angebot.id))),
    );
    expect(code(r)).toBe('konflikt');
    expect(!r.ok && r.fehler.meldung).toContain('Auftrags-LV');
  });
});

describe('Projekt löschen (v1.1a, Punkt 4)', () => {
  const loeschen = (p: Projekt): ProjektChangeSet => ({
    art: 'projekt',
    projektId: p.id,
    projekt: { vorher: p, nachher: null },
  });

  it('mit LV: konflikt, nichts gelöscht', async () => {
    const { kern, db } = await mitTypisch();
    const r = await kern.anwenden(projektEintrag(), loeschen(typisch.projekt));
    expect(code(r)).toBe('konflikt');
    expect(wert(kern.projektLaden(projektId))).toEqual(typisch.projekt);
    expect(zaehle(db, 'protokoll')).toBe(anlegenSchritte(typisch).length);
  });

  it('ohne LV: Projekt, Bieter und Protokoll gehen mit; kein Eintrag für das Löschen; Umkehrung legt es neu an', async () => {
    const { kern, db } = await neuerKern();
    const p = typisch.projekt;
    expect(p.bieter.length).toBeGreaterThan(0);
    const [anlegen] = anlegenSchritte(typisch);
    await speichere(kern, [anlegen ?? never()]);
    wert(await kern.anwenden(projektEintrag(p.id), loeschen(p)));
    expect(code(kern.projektLaden(p.id))).toBe('nicht-gefunden');
    expect(code(kern.protokoll(p.id))).toBe('nicht-gefunden');
    expect(wert(kern.projekteAuflisten())).toEqual([]);
    for (const t of ['projekt', 'bieter', 'protokoll']) expect(zaehle(db, t), t).toBe(0);

    const neu = eintrag(
      nr++,
      p.id,
      { art: 'projekt', id: p.id },
      {
        art: 'ProjektAnlegen',
        id: p.id,
        name: p.name,
        bauherr: p.bauherr,
      },
    );
    wert(await kern.anwenden(neu, projektChangeSet(p)));
    expect(wert(kern.projektLaden(p.id))).toEqual(p);
    expect(wert(kern.protokoll(p.id))).toEqual([neu]);
  });

  it('nach dem Löschen von LV und Angeboten lässt sich das Projekt löschen', async () => {
    const { kern, db } = await mitTypisch();
    for (const a of typisch.angebote) {
      wert(
        await kern.anwenden(
          angebotEintrag(a.angebot.id),
          angebotLoeschenChangeSet(wert(kern.angebotLaden(a.angebot.id))),
        ),
      );
    }
    wert(await kern.anwenden(lvEintrag(), lvLoeschenChangeSet(wert(kern.lvLaden(lvId)))));
    wert(await kern.anwenden(projektEintrag(), loeschen(typisch.projekt)));
    for (const t of [
      'projekt',
      'bieter',
      'leistungsverzeichnis',
      'angebot',
      'knoten',
      'protokoll',
      'summe_gesamt',
    ])
      expect(zaehle(db, t), t).toBe(0);
  });

  it('abweichendes vorher: konflikt', async () => {
    const { kern } = await neuerKern();
    const [anlegen] = anlegenSchritte(typisch);
    await speichere(kern, [anlegen ?? never()]);
    const r = await kern.anwenden(projektEintrag(), loeschen({ ...typisch.projekt, name: 'anders' }));
    expect(code(r)).toBe('konflikt');
    expect(wert(kern.projektLaden(projektId))).toEqual(typisch.projekt);
  });
});

describe('Auftrags-LV (v1.1a, Punkt 5)', () => {
  const angebotId = (typisch.angebote[0] ?? never()).angebot.id;
  const auftrag = auftragsLvAus(typisch.lv, angebotId);
  const auftragId = auftrag.auftragsLeistungsverzeichnis.id;

  it('anlegen: Protokolleintrag geschrieben, über die Projektdatei lesbar; Export → Import → Export byte-gleich', async () => {
    const { kern } = await mitTypisch();
    const e = auftragEintrag(auftrag);
    wert(await kern.anwenden(e, auftragsLvAnlegenChangeSet(auftrag)));
    expect(wert(kern.protokoll(projektId)).at(-1)).toEqual(imProtokoll(e));

    const text1 = wert(kern.projektdateiExportieren(projektId));
    const datei = wert(leseProjektdatei(text1, MIGRATIONEN));
    expect(datei.auftragsLeistungsverzeichnisse).toEqual([
      { ...auftrag, summen: normalisiere(typisch.lv).summen },
    ]);

    const { kern: b } = await neuerKern();
    wert(await b.projektdateiImportieren(text1));
    expect(wert(b.projektdateiExportieren(projektId)) === text1).toBe(true);
  });

  it('ändern wie beim LV: vorher wird geprüft (konflikt); Löschen nur mit vollem Stand (Ticket 43), sonst konflikt', async () => {
    const { kern, db } = await mitTypisch();
    wert(await kern.anwenden(auftragEintrag(auftrag), auftragsLvAnlegenChangeSet(auftrag)));
    const p = auftrag.auftragsLeistungsverzeichnis.knoten.find((k): k is Position => k.art === 'position');
    if (p === undefined) throw new Error('keine Position');
    const aendern = (vorher: Position, nachher: Position): AuftragsLvChangeSet => ({
      art: 'auftrags-leistungsverzeichnis',
      auftragsLeistungsverzeichnisId: auftragId,
      kopf: null,
      knoten: { hinzugefuegt: [], geaendert: [{ vorher, nachher }], entfernt: [] },
      summen: { positionen: [], gliederungen: [], gesamt: null, vorher: LEERES_SUMMENVORHER },
    });
    const neu = { ...p, kurztext: 'Im Auftrag geändert' };
    wert(await kern.anwenden(auftragEintrag(auftrag), aendern(p, neu)));
    expect(code(await kern.anwenden(auftragEintrag(auftrag), aendern(p, neu)))).toBe('konflikt');
    const kopf = auftragsLvAnlegenChangeSet(auftrag).kopf?.nachher ?? never();
    const umbenannt = { ...kopf, name: 'Neuer Name' };
    wert(
      await kern.anwenden(auftragEintrag(auftrag), {
        ...aendern(neu, neu),
        knoten: { hinzugefuegt: [], geaendert: [], entfernt: [] },
        kopf: { vorher: kopf, nachher: umbenannt },
      }),
    );
    const datei = wert(leseProjektdatei(wert(kern.projektdateiExportieren(projektId)), MIGRATIONEN));
    const gelesen = datei.auftragsLeistungsverzeichnisse[0]?.auftragsLeistungsverzeichnis;
    expect(gelesen?.name).toBe('Neuer Name');
    expect(gelesen?.knoten.find((k) => k.id === p.id)).toEqual(neu);

    const loeschen: AuftragsLvChangeSet = {
      ...aendern(neu, neu),
      knoten: { hinzugefuegt: [], geaendert: [], entfernt: [] },
      kopf: { vorher: umbenannt, nachher: null },
    };
    // Ohne Knoten und Summen im ChangeSet fehlt der volle Stand: konflikt, nichts gelöscht (D-31.2).
    expect(code(await kern.anwenden(auftragEintrag(auftrag), loeschen))).toBe('konflikt');
    expect(zaehle(db, 'auftrags_lv')).toBe(1);
  });

  it('LV und Angebot müssen existieren und zum Projekt gehören', async () => {
    const { kern, db } = await mitTypisch();
    const ohneAngebot = auftragsLvAus(typisch.lv, 'gibt-es-nicht' as never);
    expect(
      code(await kern.anwenden(auftragEintrag(ohneAngebot), auftragsLvAnlegenChangeSet(ohneAngebot))),
    ).toBe('nicht-gefunden');
    const ohneLv: AuftragsLvZustand = {
      ...auftrag,
      auftragsLeistungsverzeichnis: {
        ...auftrag.auftragsLeistungsverzeichnis,
        leistungsverzeichnisId: 'x' as never,
      },
    };
    expect(code(await kern.anwenden(auftragEintrag(ohneLv), auftragsLvAnlegenChangeSet(ohneLv)))).toBe(
      'nicht-gefunden',
    );
    // Ein zweites Projekt mit eigenem LV: dessen LV gehört nicht zum Projekt des Auftrags-LV.
    await speichere(kern, anlegenSchritte(winzig, 900));
    const fremdesLv: AuftragsLvZustand = {
      ...auftrag,
      auftragsLeistungsverzeichnis: {
        ...auftrag.auftragsLeistungsverzeichnis,
        leistungsverzeichnisId: winzig.lv.leistungsverzeichnis.id,
      },
    };
    expect(code(await kern.anwenden(auftragEintrag(fremdesLv), auftragsLvAnlegenChangeSet(fremdesLv)))).toBe(
      'unbekannt',
    );
    expect(zaehle(db, 'auftrags_lv')).toBe(0);
  });

  it('am LV hängt ein Auftrags-LV: das LV lässt sich nicht löschen', async () => {
    const { kern } = await mitTypisch();
    wert(await kern.anwenden(auftragEintrag(auftrag), auftragsLvAnlegenChangeSet(auftrag)));
    for (const a of typisch.angebote.slice(1)) {
      wert(
        await kern.anwenden(
          angebotEintrag(a.angebot.id),
          angebotLoeschenChangeSet(wert(kern.angebotLaden(a.angebot.id))),
        ),
      );
    }
    const r = await kern.anwenden(lvEintrag(), lvLoeschenChangeSet(wert(kern.lvLaden(lvId))));
    expect(code(r)).toBe('konflikt');
  });
});

function never(): never {
  throw new Error('Testdaten unvollständig');
}
