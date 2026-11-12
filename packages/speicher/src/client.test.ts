// SPDX-License-Identifier: AGPL-3.0-or-later
// Hauptthread-Client und Worker-Host unter Node, mit einem nachgebildeten Worker (zwei Ereignisziele). Der echte
// Worker mit OPFS wird im Browser getestet (`e2e/`).

import { readdirSync, readFileSync } from 'node:fs';
import type { Ergebnis, Speicherfehler } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { oeffneInMemory, type GeoeffneteDatenbank } from './backends';
import {
  speicherOeffnen,
  speicherUeberTransport,
  type GeoeffneterSpeicher,
  type SpeicherVerwaltung,
} from './client';
import { SpeicherKern } from './kern';
import { RPC_METHODEN, type WorkerLike } from './rpc';
import { betreibeWorker, type Oeffner } from './worker-host';
import { direktTransport } from './client';
import { anlegenSchritte, eintrag, ladeFixture, normalisiere } from './testhilfe/fixtures';
import { neuerKern, wert } from './testhilfe/node';
import { standAnlegen } from './testhilfe/umkehrung';

type Hoerer = (e: { readonly data: unknown }) => void;

/** Ein „Worker“ im selben Thread: Nachrichten gehen asynchron hin und her, `error` lässt sich auslösen. */
function falscherWorker(oeffner: Oeffner): WorkerLike & { abstuerzen(): void; beendet: boolean } {
  const anWorker: Hoerer[] = [];
  const anClient: Hoerer[] = [];
  const fehlerHoerer: ((e: unknown) => void)[] = [];
  betreibeWorker(
    {
      postMessage: (m) => {
        queueMicrotask(() => {
          for (const h of anClient) h({ data: m });
        });
      },
      addEventListener: (_art, f) => {
        anWorker.push(f);
      },
    },
    oeffner,
  );
  const w = {
    beendet: false,
    postMessage: (m: unknown) => {
      // Wie ein echter Worker: Nach `terminate` gehen Nachrichten ins Leere, eine Antwort kommt nie.
      if (w.beendet) return;
      queueMicrotask(() => {
        for (const h of anWorker) h({ data: structuredClone(m) });
      });
    },
    addEventListener: ((art: string, f: (e: never) => void) => {
      if (art === 'message') anClient.push(f as Hoerer);
      else if (art === 'error') fehlerHoerer.push(f as (e: unknown) => void);
    }) as WorkerLike['addEventListener'],
    terminate: () => {
      w.beendet = true;
    },
    abstuerzen: () => {
      for (const h of fehlerHoerer) h(new Error('Worker abgestürzt'));
    },
  };
  return w;
}

const imSpeicher: Oeffner = () => oeffneInMemory();
const fehlercode = (r: Ergebnis<unknown, Speicherfehler>): string | undefined =>
  r.ok ? undefined : r.fehler.code;

describe('Client über Worker-Host', () => {
  it('öffnet, schreibt über anwenden, liest und schließt; Daten sind strukturell geklont', async () => {
    const f = ladeFixture('typisch');
    const w = falscherWorker(imSpeicher);
    const geoeffnet = await speicherOeffnen({ worker: w, verwaltung: null });
    const speicher = wert(geoeffnet);
    for (const s of anlegenSchritte(f)) wert(await speicher.anwenden(s.eintrag, s.changeSet));
    expect(wert(await speicher.projekte.auflisten())).toEqual([{ id: f.projekt.id, name: f.projekt.name }]);
    expect(wert(await speicher.leistungsverzeichnisse.laden(f.lv.leistungsverzeichnis.id))).toEqual(
      normalisiere(f.lv),
    );
    expect(wert(await speicher.protokoll(f.projekt.id))).toHaveLength(2 + f.angebote.length);
    const text = wert(await speicher.projektdateiExportieren(f.projekt.id));
    expect(text.startsWith('{')).toBe(true);
    wert(await speicher.schliessen());
    expect(w.beendet).toBe(true);
  });

  it('LV-Stände über den Worker (v1.2): anlegen über anwenden, auflisten ohne Zustand, laden mit', async () => {
    const f = ladeFixture('winzig');
    const speicher = wert(await speicherOeffnen({ worker: falscherWorker(imSpeicher), verwaltung: null }));
    for (const s of anlegenSchritte(f)) wert(await speicher.anwenden(s.eintrag, s.changeSet));
    const lv = f.lv.leistungsverzeichnis.id;
    const z = wert(await speicher.leistungsverzeichnisse.laden(lv));
    const e = eintrag(
      50,
      f.projekt.id,
      { art: 'leistungsverzeichnis', id: lv },
      {
        art: 'LvStandAnlegen',
        id: 'stand-1' as never,
        name: 'Versand',
      },
    );
    wert(await speicher.anwenden(e, standAnlegen(z, 'stand-1', 'Versand')));
    const staende = speicher.lvStaende;
    expect(wert(await staende.auflisten(lv))).toEqual([
      { id: 'stand-1', leistungsverzeichnisId: lv, name: 'Versand', angelegt: e.wann },
    ]);
    expect(wert(await staende.laden('stand-1' as never)).zustand).toEqual(z);
    wert(await speicher.schliessen());
  });

  it('Fehler beim Öffnen sind Werte und beenden den Worker: OPFS gesperrt, Quote, Schema zu neu', async () => {
    const gesperrt = falscherWorker(() =>
      Promise.reject(new DOMException('Access Handles cannot be created', 'NoModificationAllowedError')),
    );
    expect(fehlercode(await speicherOeffnen({ worker: gesperrt, verwaltung: null }))).toBe('gesperrt');
    expect(gesperrt.beendet).toBe(true);

    const voll = falscherWorker(() => Promise.reject(new DOMException('quota', 'QuotaExceededError')));
    expect(fehlercode(await speicherOeffnen({ worker: voll, verwaltung: null }))).toBe('speicher-voll');

    const neuer: Oeffner = async () => {
      const g: GeoeffneteDatenbank = await oeffneInMemory();
      g.db.skript('PRAGMA user_version = 99');
      return g;
    };
    expect(fehlercode(await speicherOeffnen({ worker: falscherWorker(neuer), verwaltung: null }))).toBe(
      'schema-zu-neu',
    );
  });

  it('stürzt der Worker ab, bekommen offene Anfragen einen Fehlerwert statt zu hängen', async () => {
    const haengt: Oeffner = () => new Promise(() => undefined);
    const w = falscherWorker(haengt);
    const offen = speicherOeffnen({ worker: w, verwaltung: null });
    await Promise.resolve();
    w.abstuerzen();
    expect(fehlercode(await offen)).toBe('gesperrt');
  });

  it('nur die Methoden des Vertrags (und die Migrationsbefunde, D-17) sind über den Worker erreichbar; rohes SQL gibt es nicht (A5)', async () => {
    expect([...RPC_METHODEN].sort()).toEqual(
      [
        'projekteAuflisten',
        'projektLaden',
        'lvAuflisten',
        'lvLaden',
        'angeboteAuflisten',
        'angebotLaden',
        'lvStaendeAuflisten',
        'lvStandLaden',
        'auftragsLvAuflisten',
        'auftragsLvLaden',
        'aufmasseAuflisten',
        'aufmassLaden',
        'rechnungenAuflisten',
        'rechnungLaden',
        'kostenermittlungenAuflisten',
        'kostenermittlungLaden',
        'anwenden',
        'protokoll',
        'projektdateiExportieren',
        'projektdateiImportieren',
        'migrationsbefunde',
      ].sort(),
    );
    const w = falscherWorker(imSpeicher);
    const speicher = wert(await speicherOeffnen({ worker: w, verwaltung: null }));
    const roh = (m: string, ...args: unknown[]): Promise<unknown> =>
      new Promise((resolve) => {
        const id = 9000;
        w.addEventListener('message', (e) => {
          if ((e.data as { id: number }).id === id) resolve((e.data as { ergebnis: unknown }).ergebnis);
        });
        w.postMessage({ id, methode: m, args });
      });
    expect(await roh('zeilen', 'SELECT 1')).toMatchObject({ ok: false, fehler: { code: 'unbekannt' } });
    expect(await roh('ausfuehren', 'DELETE FROM projekt')).toMatchObject({ ok: false });
    expect(await roh('constructor')).toMatchObject({ ok: false });
    await speicher.schliessen();
  });
});

describe('Nach schliessen (v1.1a, Punkt 3): jeder Aufruf ist ein Fehlerwert, keine Ausnahme', () => {
  /** Ruft jede Methode der Speicher-Schnittstelle einmal auf und sammelt die Fehlercodes. */
  async function alleCodes(s: GeoeffneterSpeicher): Promise<(string | undefined)[]> {
    const f = ladeFixture('winzig');
    const [schritt] = anlegenSchritte(f);
    if (schritt === undefined) throw new Error('kein Schritt');
    const p = f.projekt.id;
    const lv = f.lv.leistungsverzeichnis.id;
    const staende = s.lvStaende;
    return [
      fehlercode(await staende.auflisten(lv)),
      fehlercode(await staende.laden('s' as never)),
      fehlercode(await s.projekte.auflisten()),
      fehlercode(await s.projekte.laden(p)),
      fehlercode(await s.leistungsverzeichnisse.auflisten(p)),
      fehlercode(await s.leistungsverzeichnisse.laden(lv)),
      fehlercode(await s.angebote.auflisten(lv)),
      fehlercode(await s.angebote.laden('a' as never)),
      fehlercode(await s.anwenden(schritt.eintrag, schritt.changeSet)),
      fehlercode(await s.protokoll(p)),
      fehlercode(await s.projektdateiExportieren(p)),
      fehlercode(await s.projektdateiImportieren('{}')),
      fehlercode(await s.migrationsbefunde()),
      fehlercode(await s.schliessen()),
    ];
  }

  it('direkter Transport', async () => {
    const { kern } = await neuerKern();
    const s = speicherUeberTransport(direktTransport(kern), null);
    wert(await s.schliessen());
    expect(await alleCodes(s)).toEqual(Array.from({ length: 14 }, () => 'gesperrt'));
  });

  it('Kern direkt: auch ohne Client liefert jede Methode gesperrt', async () => {
    const { kern } = await neuerKern();
    wert(kern.schliessen());
    expect(fehlercode(kern.projekteAuflisten())).toBe('gesperrt');
    expect(fehlercode(kern.projektdateiImportieren('{}'))).toBe('gesperrt');
    expect(fehlercode(kern.schliessen())).toBe('gesperrt');
  });

  it('Worker: der beendete Worker wird nicht mehr angesprochen, nichts hängt', async () => {
    const w = falscherWorker(imSpeicher);
    const s = wert(await speicherOeffnen({ worker: w, verwaltung: null }));
    wert(await s.schliessen());
    expect(w.beendet).toBe(true);
    expect(await alleCodes(s)).toEqual(Array.from({ length: 14 }, () => 'gesperrt'));
  });
});

describe('Persistenzstatus (Spec §9)', () => {
  const kern = async (): Promise<ReturnType<typeof direktTransport>> =>
    direktTransport((await neuerKern()).kern);

  it('fragt storage.persist() an und liefert den Zustand aus storage.persisted()', async () => {
    const aufrufe: string[] = [];
    const verwaltung: SpeicherVerwaltung = {
      persist: () => {
        aufrufe.push('persist');
        return Promise.resolve(true);
      },
      persisted: () => {
        aufrufe.push('persisted');
        return Promise.resolve(true);
      },
    };
    const speicher = speicherUeberTransport(await kern(), verwaltung);
    expect(await speicher.persistenzstatus()).toEqual({ angefragt: true, persistent: true });
    expect(await speicher.persistenzstatus()).toEqual({ angefragt: true, persistent: true });
    expect(aufrufe.filter((a) => a === 'persist')).toHaveLength(1); // nur einmal angefragt
  });

  it('nicht gewährt: angefragt, aber persistent false', async () => {
    const speicher = speicherUeberTransport(await kern(), {
      persist: () => Promise.resolve(false),
      persisted: () => Promise.resolve(false),
    });
    expect(await speicher.persistenzstatus()).toEqual({ angefragt: true, persistent: false });
  });

  it('ohne storage-API oder bei Fehlern: kein Absturz, Zustand unbekannt', async () => {
    expect(await speicherUeberTransport(await kern(), null).persistenzstatus()).toEqual({
      angefragt: false,
      persistent: null,
    });
    const wirft: SpeicherVerwaltung = {
      persist: () => Promise.reject(new Error('x')),
      persisted: () => Promise.reject(new Error('y')),
    };
    expect(await speicherUeberTransport(await kern(), wirft).persistenzstatus()).toEqual({
      angefragt: false,
      persistent: null,
    });
  });
});

describe('Kein direkter Tabellenschreibzugriff (A5)', () => {
  const dateien = readdirSync(new URL('.', import.meta.url)).filter(
    (n) => n.endsWith('.ts') && !n.endsWith('.test.ts'),
  );

  it('schreibende SQL-Anweisungen stehen nur in schreiben.ts (Daten) und migrationen.ts (Schema)', () => {
    const schreibend =
      /\b(INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|REPLACE\s+INTO|CREATE\s+(TABLE|INDEX|TRIGGER|VIEW)|DROP\s+|ALTER\s+TABLE)/i;
    const treffer = dateien.filter((n) => schreibend.test(readFileSync(new URL(n, import.meta.url), 'utf8')));
    expect(treffer.sort()).toEqual(['migrationen.ts', 'schreiben.ts']);
  });

  it('der Kern gibt die Datenbank nicht heraus; der Client hat genau die Methoden der Speicher-Schnittstelle und die Migrationsbefunde (D-17)', async () => {
    const { kern } = await neuerKern();
    expect(Object.getOwnPropertyNames(kern)).toEqual([]);
    expect(SpeicherKern.prototype).not.toHaveProperty('db');
    const speicher = speicherUeberTransport(direktTransport(kern), null);
    expect(Object.keys(speicher).sort()).toEqual([
      'angebote',
      'anwenden',
      'aufmasse',
      'auftragsLeistungsverzeichnisse',
      'kostenermittlungen',
      'leistungsverzeichnisse',
      'lvStaende',
      'migrationsbefunde',
      'persistenzstatus',
      'projektdateiExportieren',
      'projektdateiImportieren',
      'projekte',
      'protokoll',
      'rechnungen',
      'schliessen',
    ]);
  });
});
