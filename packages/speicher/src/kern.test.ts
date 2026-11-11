// SPDX-License-Identifier: AGPL-3.0-or-later
// Kern auf In-Memory-SQLite-WASM unter Node: Repositories, Einzelweg `anwenden`, Konsistenz und Fehlerwerte.

import type {
  AngebotChangeSet,
  Knoten,
  LvChangeSet,
  Position,
  PositionId,
  Protokolleintrag,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import {
  angebotAnlegenChangeSet,
  anlegenSchritte,
  eintrag,
  ladeFixture,
  lvAnlegenChangeSet,
  normalisiere,
} from './testhilfe/fixtures';
import { imProtokoll, kernAufDb, neueDatenbank, neuerKern, speichere, wert, zaehle } from './testhilfe/node';
import { SpeicherKern } from './kern';
import { LEERES_SUMMENVORHER } from './summenvorher';

const typisch = ladeFixture('typisch');
const lvId = typisch.lv.leistungsverzeichnis.id;
const projektId = typisch.projekt.id;

describe('Fixtures speichern und laden', () => {
  it.each(['winzig', 'typisch'] as const)(
    '%s: LV, Angebote und Projekt kommen unverändert zurück',
    async (name) => {
      const f = ladeFixture(name);
      const { kern } = await neuerKern();
      await speichere(kern, anlegenSchritte(f));

      expect(wert(kern.projektLaden(f.projekt.id))).toEqual(f.projekt);
      expect(wert(kern.projekteAuflisten())).toEqual([{ id: f.projekt.id, name: f.projekt.name }]);
      const lv = wert(kern.lvLaden(f.lv.leistungsverzeichnis.id));
      // Die Knotenreihenfolge der Fixtures ist schon kanonisch (Tiefensuche); nur Summenlisten sortiert der Speicher.
      expect(lv).toEqual(normalisiere(f.lv));
      // Die Summenlisten folgen der Knotenreihenfolge wie bei `summenBerechnen` in `kern`, nicht der Kennung.
      const knoten = lv.leistungsverzeichnis.knoten;
      expect(lv.summen.positionen.map((p) => p.positionId)).toEqual(
        knoten.filter((k) => k.art === 'position').map((k) => k.id),
      );
      expect(lv.summen.gliederungen.map((g) => g.gliederungId)).toEqual(
        knoten.filter((k) => k.art === 'titel' || k.art === 'los').map((k) => k.id),
      );
      expect(wert(kern.lvAuflisten(f.projekt.id))).toEqual([
        { id: f.lv.leistungsverzeichnis.id, name: f.lv.leistungsverzeichnis.name },
      ]);
      for (const a of f.angebote) {
        expect(wert(kern.angebotLaden(a.angebot.id))).toEqual(normalisiere(a));
      }
      expect(wert(kern.angeboteAuflisten(f.lv.leistungsverzeichnis.id))).toEqual(
        f.angebote.map((a) => a.angebot.id).sort(),
      );
    },
  );

  it('gross (5.000 Positionen): speichern und laden, Dezimalwerte bleiben Zeichenketten', async () => {
    const f = ladeFixture('gross');
    const { kern } = await neuerKern();
    const t0 = performance.now();
    await speichere(kern, anlegenSchritte(f));
    const t1 = performance.now();
    const lv = wert(kern.lvLaden(f.lv.leistungsverzeichnis.id));
    const t2 = performance.now();
    console.info(
      `[speicher/node] gross: speichern ${(t1 - t0).toFixed(0)} ms, laden ${(t2 - t1).toFixed(0)} ms (In-Memory, Node)`,
    );
    expect(lv.leistungsverzeichnis.knoten.filter((k) => k.art === 'position')).toHaveLength(5000);
    expect(lv).toEqual(normalisiere(f.lv));
  });
});

describe('Protokoll und Einzelweg', () => {
  it('jeder Befehl schreibt genau einen Protokolleintrag, in Reihenfolge', async () => {
    const { kern, db } = await neuerKern();
    const schritte = anlegenSchritte(typisch);
    for (const [i, s] of schritte.entries()) {
      expect(zaehle(db, 'protokoll')).toBe(i);
      wert(await kern.anwenden(s.eintrag, s.changeSet));
      expect(zaehle(db, 'protokoll')).toBe(i + 1);
    }
    const p = wert(kern.protokoll(projektId));
    expect(p.map((e) => e.id)).toEqual(schritte.map((s) => s.eintrag.id));
    expect(p).toEqual(schritte.map((s) => imProtokoll(s.eintrag)));
  });

  it('ein abgewiesenes ChangeSet schreibt weder Daten noch Protokoll', async () => {
    const { kern, db } = await neuerKern();
    const [projekt, lv] = anlegenSchritte(typisch);
    await speichere(kern, [projekt as never]);
    const vorher = zaehle(db, 'protokoll');
    // LV mit Eintrag für ein anderes Aggregat
    const falsch = eintrag(
      99,
      projektId,
      { art: 'leistungsverzeichnis', id: 'anderes-lv' as never },
      lv?.eintrag.befehl as never,
    );
    const r = await kern.anwenden(falsch, lv?.changeSet as never);
    expect(r.ok).toBe(false);
    expect(zaehle(db, 'protokoll')).toBe(vorher);
    expect(zaehle(db, 'knoten')).toBe(0);
    expect(zaehle(db, 'leistungsverzeichnis')).toBe(0);
  });

  it('ChangeSet und Protokolleintrag liegen in einer Transaktion: scheitert der Eintrag, ist auch das ChangeSet weg', async () => {
    const { kern, db } = await neuerKern();
    const schritte = anlegenSchritte(typisch);
    await speichere(kern, schritte.slice(0, 1));
    const lv = schritte[1];
    if (lv === undefined) throw new Error('Schritt fehlt');
    // Protokoll-ID des ersten Eintrags wiederverwenden: der Eintrag verletzt UNIQUE, nachdem das LV schon geschrieben ist.
    const doppelt: Protokolleintrag = { ...lv.eintrag, id: schritte[0]?.eintrag.id as never };
    const r = await kern.anwenden(doppelt, lv.changeSet);
    expect(r.ok).toBe(false);
    expect(zaehle(db, 'leistungsverzeichnis')).toBe(0);
    expect(zaehle(db, 'knoten')).toBe(0);
    expect(zaehle(db, 'summe_position')).toBe(0);
    expect(zaehle(db, 'protokoll')).toBe(1);
  });

  it('Aggregate ohne Projekt, LV oder Angebot liefern nicht-gefunden', async () => {
    const { kern } = await neuerKern();
    const fehlt = (r: { ok: boolean; fehler?: { code: string } }): string | undefined =>
      r.ok ? undefined : r.fehler?.code;
    expect(fehlt(kern.projektLaden(projektId))).toBe('nicht-gefunden');
    expect(fehlt(kern.lvLaden(lvId))).toBe('nicht-gefunden');
    expect(fehlt(kern.lvAuflisten(projektId))).toBe('nicht-gefunden');
    expect(fehlt(kern.angebotLaden(typisch.angebote[0]?.angebot.id as never))).toBe('nicht-gefunden');
    expect(fehlt(kern.protokoll(projektId))).toBe('nicht-gefunden');
    expect(fehlt(kern.projektdateiExportieren(projektId))).toBe('nicht-gefunden');
  });

  it('ein LV für ein unbekanntes Projekt wird mit nicht-gefunden abgewiesen', async () => {
    const { kern, db } = await neuerKern();
    const lv = anlegenSchritte(typisch)[1];
    const r = await kern.anwenden(lv?.eintrag as never, lv?.changeSet as never);
    expect(r).toMatchObject({ ok: false, fehler: { code: 'nicht-gefunden' } });
    expect(zaehle(db, 'protokoll')).toBe(0);
  });
});

describe('ChangeSets auf dem gespeicherten Stand', () => {
  const position = (k: readonly Knoten[], nr = 0): Position => {
    const p = k.filter((x): x is Position => x.art === 'position')[nr];
    if (p === undefined) throw new Error('keine Position');
    return p;
  };

  async function mitTypisch(): Promise<ReturnType<typeof neuerKern> extends Promise<infer T> ? T : never> {
    const env = await neuerKern();
    await speichere(env.kern, anlegenSchritte(typisch));
    return env;
  }
  let nr = 100;
  const lvEintrag = (): Protokolleintrag =>
    eintrag(nr++, projektId, { art: 'leistungsverzeichnis', id: lvId }, { art: 'NachlassEntfernen' });

  it('geaendert: ersetzt den Knoten und die Summen; Dezimalwerte bleiben Zeichenketten', async () => {
    const { kern, db } = await mitTypisch();
    const p = position(typisch.lv.leistungsverzeichnis.knoten);
    const nachher: Position = { ...p, menge: '99.000' as never, einheit: 'Stk' };
    const cs: LvChangeSet = {
      art: 'leistungsverzeichnis',
      leistungsverzeichnisId: lvId,
      kopf: null,
      knoten: { hinzugefuegt: [], geaendert: [{ vorher: p, nachher }], entfernt: [] },
      summen: {
        positionen: [{ positionId: p.id, gesamtpreis: '1.00' as never, gehtInSummeEin: true }],
        gliederungen: [],
        gesamt: { ...typisch.lv.summen.gesamt, netto: '1.00' as never },
        vorher: {
          ...LEERES_SUMMENVORHER,
          positionen: typisch.lv.summen.positionen.filter((s) => s.positionId === p.id),
          gesamt: typisch.lv.summen.gesamt,
        },
      },
    };
    wert(await kern.anwenden(lvEintrag(), cs));
    const geladen = wert(kern.lvLaden(lvId));
    expect(position(geladen.leistungsverzeichnis.knoten)).toEqual(nachher);
    expect(geladen.summen.gesamt.netto).toBe('1.00');
    expect(geladen.summen.positionen.find((s) => s.positionId === p.id)?.gesamtpreis).toBe('1.00');
    expect(db.zeilen('SELECT menge FROM knoten WHERE id = ?', [p.id])[0]?.['menge']).toBe('99.000');
  });

  it('geaendert mit falschem Vorherstand: Fehlerwert, nichts geschrieben, kein Protokoll', async () => {
    const { kern, db } = await mitTypisch();
    const p = position(typisch.lv.leistungsverzeichnis.knoten);
    const veraltet: Position = { ...p, menge: '5.000' as never };
    const vorherStand = wert(kern.lvLaden(lvId));
    const protokolle = zaehle(db, 'protokoll');
    const cs: LvChangeSet = {
      art: 'leistungsverzeichnis',
      leistungsverzeichnisId: lvId,
      kopf: null,
      knoten: {
        hinzugefuegt: [],
        geaendert: [{ vorher: veraltet, nachher: { ...p, menge: '7.000' as never } }],
        entfernt: [],
      },
      summen: {
        positionen: [],
        gliederungen: [],
        gesamt: { ...typisch.lv.summen.gesamt, netto: '0.01' as never },
        vorher: LEERES_SUMMENVORHER,
      },
    };
    const r = await kern.anwenden(lvEintrag(), cs);
    expect(r).toMatchObject({ ok: false, fehler: { code: 'konflikt' } });
    expect(!r.ok && r.fehler.meldung).toContain('Konflikt');
    expect(wert(kern.lvLaden(lvId))).toEqual(vorherStand);
    expect(zaehle(db, 'protokoll')).toBe(protokolle);
  });

  it('entfernt: löscht Knoten und deren Summen; fehlender Knoten ist nicht-gefunden', async () => {
    const { kern } = await mitTypisch();
    const knoten = typisch.lv.leistungsverzeichnis.knoten;
    // Letzte Position der Fixtures: ein Blatt, nach dem keine Geschwister nachrücken.
    const p = [...knoten].reverse().find((k): k is Position => k.art === 'position');
    if (p === undefined) throw new Error('keine Position');
    const geschwisterNachher = knoten.filter(
      (k) => k.elternId === p.elternId && k.reihenfolge > p.reihenfolge,
    );
    expect(geschwisterNachher).toHaveLength(0);
    const cs = (e: Knoten): LvChangeSet => ({
      art: 'leistungsverzeichnis',
      leistungsverzeichnisId: lvId,
      kopf: null,
      knoten: { hinzugefuegt: [], geaendert: [], entfernt: [e] },
      summen: {
        positionen: [],
        gliederungen: [],
        gesamt: null,
        vorher: {
          ...LEERES_SUMMENVORHER,
          entfernt: {
            positionen: typisch.lv.summen.positionen.filter((s) => s.positionId === e.id),
            gliederungen: [],
          },
        },
      },
    });
    wert(await kern.anwenden(lvEintrag(), cs(p)));
    const geladen = wert(kern.lvLaden(lvId));
    expect(geladen.leistungsverzeichnis.knoten.some((k) => k.id === p.id)).toBe(false);
    expect(geladen.summen.positionen.some((s) => s.positionId === p.id)).toBe(false);
    expect(await kern.anwenden(lvEintrag(), cs(p))).toMatchObject({
      ok: false,
      fehler: { code: 'nicht-gefunden' },
    });
  });

  it('hinzugefuegt mit vorhandener Kennung: alles oder nichts, auch die vorangehenden Knoten fehlen danach', async () => {
    const { kern } = await mitTypisch();
    const knoten = typisch.lv.leistungsverzeichnis.knoten;
    const vorhanden = position(knoten);
    const neu: Position = { ...vorhanden, id: 'neue-position' as PositionId, reihenfolge: 99 };
    const vorherStand = wert(kern.lvLaden(lvId));
    const cs: LvChangeSet = {
      art: 'leistungsverzeichnis',
      leistungsverzeichnisId: lvId,
      kopf: null,
      knoten: { hinzugefuegt: [neu, vorhanden], geaendert: [], entfernt: [] },
      summen: { positionen: [], gliederungen: [], gesamt: null, vorher: LEERES_SUMMENVORHER },
    };
    expect((await kern.anwenden(lvEintrag(), cs)).ok).toBe(false);
    expect(wert(kern.lvLaden(lvId))).toEqual(vorherStand);
  });

  it('Knoten ohne vorhandenen Elternknoten oder mit Lücke in der Reihenfolge werden abgewiesen', async () => {
    const { kern } = await mitTypisch();
    const vorhanden = position(typisch.lv.leistungsverzeichnis.knoten);
    const vorherStand = wert(kern.lvLaden(lvId));
    const mit = (n: Knoten): LvChangeSet => ({
      art: 'leistungsverzeichnis',
      leistungsverzeichnisId: lvId,
      kopf: null,
      knoten: { hinzugefuegt: [n], geaendert: [], entfernt: [] },
      summen: { positionen: [], gliederungen: [], gesamt: null, vorher: LEERES_SUMMENVORHER },
    });
    const waise = await kern.anwenden(
      lvEintrag(),
      mit({ ...vorhanden, id: 'x1' as PositionId, elternId: 'gibt-es-nicht' as never }),
    );
    expect(waise).toMatchObject({ ok: false, fehler: { code: 'konflikt' } });
    const luecke = await kern.anwenden(
      lvEintrag(),
      mit({ ...vorhanden, id: 'x2' as PositionId, reihenfolge: 500 }),
    );
    expect(luecke).toMatchObject({ ok: false, fehler: { code: 'konflikt' } });
    expect(wert(kern.lvLaden(lvId))).toEqual(vorherStand);
  });

  it('Angebot: Position ändern und entfernen, Vorherstand wird geprüft', async () => {
    const { kern } = await mitTypisch();
    const a = typisch.angebote[0];
    if (a === undefined) throw new Error('kein Angebot');
    const angeboten = a.angebot.positionen.find((p) => p.status === 'angeboten');
    if (angeboten?.status !== 'angeboten') throw new Error('keine angebotene Position');
    const cs = (vorher: typeof angeboten, nachher: typeof angeboten): AngebotChangeSet => ({
      art: 'angebot',
      angebotId: a.angebot.id,
      kopf: null,
      positionen: { hinzugefuegt: [], geaendert: [{ vorher, nachher }], entfernt: [] },
      summen: { positionen: [], gliederungen: [], gesamt: null, vorher: LEERES_SUMMENVORHER },
    });
    const e = (): Protokolleintrag =>
      eintrag(nr++, projektId, { art: 'angebot', id: a.angebot.id }, { art: 'AngebotsNachlassEntfernen' });
    const neuerPreis = { ...angeboten, einheitspreis: '1.234' as never };
    wert(await kern.anwenden(e(), cs(angeboten, neuerPreis)));
    const geladen = wert(kern.angebotLaden(a.angebot.id));
    expect(geladen.angebot.positionen.find((p) => p.positionId === angeboten.positionId)).toEqual(neuerPreis);
    // zweites Mal mit dem alten Vorherstand: Konflikt
    expect(await kern.anwenden(e(), cs(angeboten, neuerPreis))).toMatchObject({
      ok: false,
      fehler: { code: 'konflikt' },
    });
    // auf „nicht angeboten“ stellen
    wert(
      await kern.anwenden(e(), {
        ...cs(neuerPreis, neuerPreis),
        positionen: {
          hinzugefuegt: [],
          entfernt: [],
          geaendert: [
            {
              vorher: neuerPreis,
              nachher: { positionId: angeboten.positionId, status: 'nicht-angeboten' } as never,
            },
          ],
        },
      }),
    );
    expect(
      wert(kern.angebotLaden(a.angebot.id)).angebot.positionen.find(
        (p) => p.positionId === angeboten.positionId,
      )?.status,
    ).toBe('nicht-angeboten');
    // Angebotsposition, die keine Position des LV ist
    const fremd = { positionId: 'keine-position' as PositionId, status: 'nicht-angeboten' as const };
    const neu: AngebotChangeSet = {
      ...cs(angeboten, angeboten),
      positionen: { hinzugefuegt: [fremd], geaendert: [], entfernt: [] },
    };
    expect(await kern.anwenden(e(), neu)).toMatchObject({ ok: false, fehler: { code: 'nicht-gefunden' } });
  });

  it('LV-Kopf ändern: Vorherstand geprüft; Löschen mit Angeboten abgewiesen', async () => {
    const { kern } = await mitTypisch();
    const kopf = lvAnlegenChangeSet(typisch.lv).kopf?.nachher;
    if (kopf === undefined || kopf === null) throw new Error('kein Kopf');
    const cs = (vorher: typeof kopf | null, nachher: typeof kopf | null): LvChangeSet => ({
      art: 'leistungsverzeichnis',
      leistungsverzeichnisId: lvId,
      kopf: { vorher, nachher },
      knoten: { hinzugefuegt: [], geaendert: [], entfernt: [] },
      summen: { positionen: [], gliederungen: [], gesamt: null, vorher: LEERES_SUMMENVORHER },
    });
    wert(await kern.anwenden(lvEintrag(), cs(kopf, { ...kopf, name: 'Umbenannt', nachlass: null })));
    expect(wert(kern.lvLaden(lvId)).leistungsverzeichnis).toMatchObject({
      name: 'Umbenannt',
      nachlass: null,
    });
    expect(await kern.anwenden(lvEintrag(), cs(kopf, { ...kopf, name: 'x' }))).toMatchObject({
      ok: false,
      fehler: { code: 'konflikt' }, // veralteter Vorherstand
    });
    expect(
      await kern.anwenden(lvEintrag(), cs({ ...kopf, name: 'Umbenannt', nachlass: null }, null)),
    ).toMatchObject({ ok: false, fehler: { code: 'konflikt' } }); // Angebote hängen am LV
    expect(wert(kern.lvLaden(lvId)).leistungsverzeichnis.name).toBe('Umbenannt');
  });

  it('Projekt: Stammdaten und Bieter ändern', async () => {
    const { kern } = await mitTypisch();
    const nachher = { ...typisch.projekt, name: 'Neuer Name', bieter: typisch.projekt.bieter.slice(0, 3) };
    const e = eintrag(
      nr++,
      projektId,
      { art: 'projekt', id: projektId },
      { art: 'ProjektStammdatenSetzen', name: 'Neuer Name', bauherr: typisch.projekt.bauherr },
    );
    wert(
      await kern.anwenden(e, { art: 'projekt', projektId, projekt: { vorher: typisch.projekt, nachher } }),
    );
    expect(wert(kern.projektLaden(projektId)).name).toBe('Neuer Name');
    // Ein Bieter, den ein Angebot braucht, lässt sich nicht entfernen (Fremdschlüssel): Fehlerwert, nichts geändert.
    const ohneBieter = { ...nachher, bieter: [] };
    const e2 = eintrag(
      nr++,
      projektId,
      { art: 'projekt', id: projektId },
      { art: 'ProjektStammdatenSetzen', name: 'Neuer Name', bauherr: typisch.projekt.bauherr },
    );
    const r = await kern.anwenden(e2, {
      art: 'projekt',
      projektId,
      projekt: { vorher: nachher, nachher: ohneBieter },
    });
    expect(r.ok).toBe(false);
    expect(wert(kern.projektLaden(projektId)).bieter).toHaveLength(3);
  });

  it('ein Projekt mit LV lässt sich nicht löschen (konflikt)', async () => {
    const { kern } = await mitTypisch();
    const e = eintrag(nr++, projektId, { art: 'projekt', id: projektId }, { art: 'ProjektLoeschen' });
    expect(
      await kern.anwenden(e, {
        art: 'projekt',
        projektId,
        projekt: { vorher: typisch.projekt, nachher: null },
      }),
    ).toMatchObject({ ok: false, fehler: { code: 'konflikt' } });
    expect(wert(kern.projektLaden(projektId))).toEqual(typisch.projekt);
  });
});

describe('Quote, Sperre und Schema (Q5)', () => {
  it('echte volle Datenbank (SQLITE_FULL): speicher-voll, nichts halb geschrieben, danach weiter nutzbar', async () => {
    const db = await neueDatenbank();
    const kern = kernAufDb(db);
    const gross = ladeFixture('gross');
    const schritte = anlegenSchritte(gross);
    const [projekt, lv] = schritte;
    if (projekt === undefined || lv === undefined) throw new Error('Schritte fehlen');
    wert(await kern.anwenden(projekt.eintrag, projekt.changeSet));
    const seiten = db.zeilen('PRAGMA page_count')[0]?.['page_count'];
    db.skript(`PRAGMA max_page_count = ${String(Number(seiten) + 20)}`);
    const r = await kern.anwenden(lv.eintrag, lv.changeSet);
    expect(r).toMatchObject({ ok: false, fehler: { code: 'speicher-voll' } });
    expect(zaehle(db, 'knoten')).toBe(0);
    expect(zaehle(db, 'leistungsverzeichnis')).toBe(0);
    expect(zaehle(db, 'protokoll')).toBe(1);
    db.skript('PRAGMA max_page_count = 1000000');
    wert(await kern.anwenden(lv.eintrag, lv.changeSet));
    expect(zaehle(db, 'protokoll')).toBe(2);
  });

  it('eingespielte Backend-Fehler (injizierter Ausfall) werden zu Fehlerwerten und rollen zurück', async () => {
    const echt = await neueDatenbank();
    const f = ladeFixture('typisch');
    const [projekt, lv] = anlegenSchritte(f);
    if (projekt === undefined || lv === undefined) throw new Error('Schritte fehlen');

    // Ein Datenbank-Decorator, der bei der n-ten schreibenden Anweisung die gewünschte Ausnahme wirft.
    const ausfall = (ausnahme: () => unknown, nach: number): { db: typeof echt; scharf: () => void } => {
      let scharf = false;
      let zaehler = 0;
      const pruefen = (sql: string): void => {
        if (scharf && /^\s*(INSERT|UPDATE|DELETE)/i.test(sql) && ++zaehler > nach) throw ausnahme();
      };
      return {
        scharf: () => {
          scharf = true;
        },
        db: {
          ...echt,
          ausfuehren: (sql, bind) => {
            pruefen(sql);
            echt.ausfuehren(sql, bind);
          },
          stapel: (sql, bind) => {
            pruefen(sql);
            echt.stapel(sql, bind);
          },
        },
      };
    };

    const faelle: [string, () => unknown, string][] = [
      [
        'Quote (DOMException QuotaExceededError)',
        () => new DOMException('quota', 'QuotaExceededError'),
        'speicher-voll',
      ],
      [
        'OPFS gesperrt (NoModificationAllowedError)',
        () => new DOMException('locked', 'NoModificationAllowedError'),
        'gesperrt',
      ],
      ['SQLite BUSY', () => Object.assign(new Error('database is locked'), { resultCode: 5 }), 'gesperrt'],
      [
        'SQLite FULL',
        () => Object.assign(new Error('database or disk is full'), { resultCode: 13 }),
        'speicher-voll',
      ],
      [
        'SQLite IOERR mit Quota-Hinweis',
        () => Object.assign(new Error('QuotaExceededError in xWrite'), { resultCode: 778 }),
        'speicher-voll',
      ],
      ['sonstiger Fehler', () => new Error('kaputt'), 'unbekannt'],
    ];
    for (const [name, ausnahme, code] of faelle) {
      const { db, scharf } = ausfall(ausnahme, 3);
      const kern = kernAufDb(db);
      wert(await kern.anwenden(projekt.eintrag, projekt.changeSet)); // noch nicht scharf
      scharf();
      const r = await kern.anwenden(lv.eintrag, lv.changeSet);
      expect(r, name).toMatchObject({ ok: false, fehler: { code } });
      // Nach der Ausnahme steht die Datenbank wieder auf dem Stand vor dem Befehl.
      expect(zaehle(echt, 'knoten'), name).toBe(0);
      expect(zaehle(echt, 'protokoll'), name).toBe(1);
      // Aufräumen für den nächsten Fall
      echt.skript('DELETE FROM protokoll; DELETE FROM bieter; DELETE FROM projekt;');
    }
  });

  it('Ein-/Ausgabefehler beim Import der Projektdatei heißt nicht „datei-ungueltig“', async () => {
    const f = ladeFixture('typisch');
    const quelle = kernAufDb(await neueDatenbank());
    await speichere(quelle, anlegenSchritte(f));
    const text = wert(quelle.projektdateiExportieren(f.projekt.id));

    const echt = await neueDatenbank();
    const faelle: [string, () => unknown, string][] = [
      [
        'Ein-/Ausgabefehler',
        () => Object.assign(new Error('disk I/O error'), { resultCode: 10 }),
        'unbekannt',
      ],
      [
        'Integritätsverletzung',
        () => Object.assign(new Error('UNIQUE constraint failed'), { resultCode: 19 }),
        'datei-ungueltig',
      ],
    ];
    for (const [name, ausnahme, code] of faelle) {
      let zaehler = 0;
      const pruefen = (sql: string): void => {
        if (/^\s*INSERT/i.test(sql) && ++zaehler > 3) throw ausnahme();
      };
      const kern = kernAufDb({
        ...echt,
        ausfuehren: (sql, bind) => {
          pruefen(sql);
          echt.ausfuehren(sql, bind);
        },
        stapel: (sql, bind) => {
          pruefen(sql);
          echt.stapel(sql, bind);
        },
      });
      const r = kern.projektdateiImportieren(text);
      expect(r, name).toMatchObject({ ok: false, fehler: { code } });
      expect(zaehle(echt, 'knoten'), name).toBe(0); // Der Import rollt vollständig zurück.
    }
  });

  it('Datenbank mit neuerer Schemaversion: schema-zu-neu statt Beschädigung', async () => {
    const db = await neueDatenbank();
    db.skript('PRAGMA user_version = 99');
    const r = SpeicherKern.oeffnen(db);
    expect(r).toMatchObject({ ok: false, fehler: { code: 'schema-zu-neu' } });
  });

  it('LV- und Angebots-ChangeSets lassen sich aus Zuständen ableiten (Hilfsfunktionen stimmen mit anlegenSchritte überein)', () => {
    expect(anlegenSchritte(typisch)[1]?.changeSet).toEqual(lvAnlegenChangeSet(typisch.lv));
    expect(anlegenSchritte(typisch)[2]?.changeSet).toEqual(
      angebotAnlegenChangeSet(typisch.angebote[0] as never),
    );
  });
});
