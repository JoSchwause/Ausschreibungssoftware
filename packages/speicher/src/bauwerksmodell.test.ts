// SPDX-License-Identifier: AGPL-3.0-or-later
// Bauwerksmodell in `speicher` (`vertrag` v1.6 Punkte 1, 2 und 8; D-51, D-53, D-54, D-97.3, D-97.6; Ticket 106 Punkte 1 bis 3):
// Kopf getrennt vom Inhalt gespeichert, die Liste ohne Bauteile, Anlegen nur mit abgelegten Bytes, Umbenennen nur am Kopf,
// Löschen nicht, solange ein späterer Stand es als Vorgänger nennt; Undo durch Tausch; Massenbefehl im Protokoll als Kopf und
// Prüfsumme (E-13); die Bytes bleiben bis zum nächsten Öffnen (D-97.5).

import type { BauwerksmodellId, Protokolleintrag } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { direktTransport, speicherUeberTransport } from './client';
import type { SpeicherKern } from './kern';
import { eintrag } from './testhilfe/fixtures';
import { imProtokoll, kernAufDb, neuerKern, speichere, wert } from './testhilfe/node';
import { umkehren } from './testhilfe/umkehrung';
import { ohne } from './zeilen';
import { anlegenSchritte } from './testhilfe/fixtures';
import { aggregatVon, F, P } from './testhilfe/v14';
import {
  ifcBytes,
  kopfVon,
  modell,
  modellAnlegenCs,
  modellLoeschenCs,
  modellUmbenennenCs,
  sha256,
} from './testhilfe/v16';

const BYTES_1 = ifcBytes('haus-v1');
const BYTES_2 = ifcBytes('haus-v2');
const M1 = modell(1, BYTES_1);
const M2 = modell(2, BYTES_2, { vorgaengerId: M1.id });

let nr = 700;
const anlegenBefehl = (b: typeof M1): Protokolleintrag['befehl'] => ({
  art: 'BauwerksmodellAnlegen',
  bauwerksmodell: b,
});

async function projekt(): Promise<{ kern: SpeicherKern; db: Awaited<ReturnType<typeof neuerKern>>['db'] }> {
  const k = await neuerKern();
  await speichere(k.kern, anlegenSchritte(F).slice(0, 1));
  return k;
}

function schreibe(
  kern: SpeicherKern,
  cs: Parameters<SpeicherKern['anwenden']>[1],
  befehl?: Protokolleintrag['befehl'],
) {
  nr += 1;
  return kern.anwenden(eintrag(nr, P, aggregatVon(cs), befehl ?? { art: 'BauwerksmodellLoeschen' }), cs);
}

describe('Bauwerksmodell anlegen und laden', () => {
  it('nach dem Ablegen der Bytes: laden liefert das ganze Modell, auflisten den Kopf mit anzahlBauteile', async () => {
    const { kern } = await projekt();
    const s = speicherUeberTransport(direktTransport(kern), null);
    expect(wert(await s.modelldateien.ablegen(BYTES_1))).toBe(M1.datei.hash);
    wert(await schreibe(kern, modellAnlegenCs(M1), anlegenBefehl(M1)));
    expect(wert(await s.bauwerksmodelle.laden(M1.id))).toEqual({ bauwerksmodell: M1 });
    expect(wert(await s.bauwerksmodelle.auflisten(P))).toEqual([{ ...kopfVon(M1), anzahlBauteile: 6 }]);
  });

  it('der Massenbefehl steht als Kopf und Prüfsumme im Protokoll (E-13)', async () => {
    const { kern } = await projekt();
    await kern.modelldateiAblegen(BYTES_1);
    const e = eintrag(750, P, aggregatVon(modellAnlegenCs(M1)), anlegenBefehl(M1));
    wert(await kern.anwenden(e, modellAnlegenCs(M1)));
    expect(wert(kern.protokoll(P)).at(-1)).toEqual(imProtokoll(e));
  });

  it('ohne abgelegte Bytes oder mit falscher Größe: konflikt, nichts geschrieben (auch kein Protokolleintrag)', async () => {
    const { kern } = await projekt();
    const vorher = wert(kern.protokoll(P)).length;
    const ohne = await schreibe(kern, modellAnlegenCs(M1), anlegenBefehl(M1));
    expect(!ohne.ok && ohne.fehler.code).toBe('konflikt');
    await kern.modelldateiAblegen(BYTES_1);
    const falsch = { ...M1, datei: { ...M1.datei, groesse: M1.datei.groesse + 1 } };
    const r = await schreibe(kern, modellAnlegenCs(falsch), anlegenBefehl(falsch));
    expect(!r.ok && r.fehler.code).toBe('konflikt');
    expect(wert(kern.protokoll(P))).toHaveLength(vorher);
    expect(wert(kern.bauwerksmodelleAuflisten(P))).toEqual([]);
  });

  it('der Vorgänger muss ein Modell des Projekts sein (konflikt); ein späterer Stand nennt ihn', async () => {
    const { kern } = await projekt();
    await kern.modelldateiAblegen(BYTES_1);
    await kern.modelldateiAblegen(BYTES_2);
    const r = await schreibe(kern, modellAnlegenCs(M2), anlegenBefehl(M2));
    expect(!r.ok && r.fehler.code).toBe('konflikt');
    wert(await schreibe(kern, modellAnlegenCs(M1), anlegenBefehl(M1)));
    wert(await schreibe(kern, modellAnlegenCs(M2), anlegenBefehl(M2)));
    expect(wert(kern.bauwerksmodellLaden(M2.id)).bauwerksmodell.vorgaengerId).toBe(M1.id);
  });

  it('auflisten nach Name deutsch, gleiche Namen nach Kennung; unbekanntes Projekt bzw. Modell: nicht-gefunden', async () => {
    const { kern } = await projekt();
    await kern.modelldateiAblegen(BYTES_1);
    for (const [id, name] of [
      ['modell-c', 'Zebra'],
      ['modell-b', 'Ärztehaus'],
      ['modell-a', 'Zebra'],
    ] as const)
      wert(await schreibe(kern, modellAnlegenCs({ ...M1, id: id as BauwerksmodellId, name })));
    expect(wert(kern.bauwerksmodelleAuflisten(P)).map((u) => u.id)).toEqual([
      'modell-b',
      'modell-a',
      'modell-c',
    ]);
    const a = kern.bauwerksmodelleAuflisten('p-?' as never);
    const b = kern.bauwerksmodellLaden('modell-?' as BauwerksmodellId);
    expect([!a.ok && a.fehler.code, !b.ok && b.fehler.code]).toEqual(['nicht-gefunden', 'nicht-gefunden']);
  });

  it('Inhalt nur beim Anlegen und Löschen; ein Modell ohne Projekt: nicht-gefunden', async () => {
    const { kern } = await projekt();
    await kern.modelldateiAblegen(BYTES_1);
    const ohneInhalt = ohne(modellAnlegenCs(M1), 'inhalt');
    const r = await schreibe(kern, ohneInhalt);
    expect(!r.ok && r.fehler.code).toBe('unbekannt');
    const fremd = { ...M1, projektId: 'p-?' as never };
    const e = await kern.anwenden(
      eintrag(799, fremd.projektId, aggregatVon(modellAnlegenCs(fremd)), anlegenBefehl(fremd)),
      modellAnlegenCs(fremd),
    );
    expect(!e.ok && e.fehler.code).toBe('nicht-gefunden');
  });
});

describe('Bauwerksmodell umbenennen und löschen, Undo', () => {
  async function mitModellen(): Promise<{
    kern: SpeicherKern;
    db: Awaited<ReturnType<typeof neuerKern>>['db'];
  }> {
    const k = await projekt();
    await k.kern.modelldateiAblegen(BYTES_1);
    await k.kern.modelldateiAblegen(BYTES_2);
    wert(await schreibe(k.kern, modellAnlegenCs(M1), anlegenBefehl(M1)));
    wert(await schreibe(k.kern, modellAnlegenCs(M2), anlegenBefehl(M2)));
    return k;
  }

  it('umbenennen ändert nur den Namen; Undo stellt ihn wieder her; der Inhalt bleibt', async () => {
    const { kern } = await mitModellen();
    const cs = modellUmbenennenCs(M1, 'Haus, Entwurf');
    wert(await schreibe(kern, cs, { art: 'BauwerksmodellUmbenennen', name: 'Haus, Entwurf' }));
    expect(wert(kern.bauwerksmodellLaden(M1.id))).toEqual({
      bauwerksmodell: { ...M1, name: 'Haus, Entwurf' },
    });
    wert(await schreibe(kern, umkehren(cs)));
    expect(wert(kern.bauwerksmodellLaden(M1.id))).toEqual({ bauwerksmodell: M1 });
  });

  it('umbenennen mit falschem Vorherstand: konflikt; mit einem anderen Kopffeld: unbekannt (nur der Name ändert sich)', async () => {
    const { kern } = await mitModellen();
    const alt = modellUmbenennenCs({ ...M1, name: 'anders' }, 'neu');
    const r = await schreibe(kern, alt);
    expect(!r.ok && r.fehler.code).toBe('konflikt');
    const cs = modellUmbenennenCs(M1, 'neu');
    const k = cs.kopf.nachher;
    if (k === null) throw new Error('nachher');
    const r2 = await schreibe(kern, {
      ...cs,
      kopf: { ...cs.kopf, nachher: { ...k, eingelesen: '2027-01-01' } },
    });
    expect(!r2.ok && r2.fehler.code).toBe('unbekannt');
    const r3 = await schreibe(kern, { ...cs, inhalt: { vorher: M1, nachher: M1 } });
    expect(!r3.ok && r3.fehler.code).toBe('unbekannt');
  });

  it('ein Modell mit späterem Stand lässt sich nicht löschen (konflikt, D-97.6); zuerst der spätere, dann der frühere', async () => {
    const { kern } = await mitModellen();
    const r = await schreibe(kern, modellLoeschenCs(M1));
    expect(!r.ok && r.fehler.code).toBe('konflikt');
    wert(await schreibe(kern, modellLoeschenCs(M2)));
    wert(await schreibe(kern, modellLoeschenCs(M1)));
    expect(wert(kern.bauwerksmodelleAuflisten(P))).toEqual([]);
  });

  it('löschen mit einem Inhalt, der nicht zum gespeicherten Modell passt (andere Zahl Bauteile): konflikt', async () => {
    const { kern } = await mitModellen();
    const cs = modellLoeschenCs(M2);
    const kurz = { struktur: M2.struktur, bauteile: M2.bauteile.slice(1) };
    const r = await schreibe(kern, { ...cs, inhalt: { vorher: kurz, nachher: null } });
    expect(!r.ok && r.fehler.code).toBe('konflikt');
  });

  it('Undo von BauwerksmodellLoeschen in derselben Sitzung findet die Bytes noch; das nächste Öffnen gibt sie erst frei, wenn kein Modell sie nennt', async () => {
    const { kern, db } = await mitModellen();
    const loeschen = modellLoeschenCs(M2);
    wert(await schreibe(kern, loeschen));
    expect(wert(kern.modelldateiVorhanden(M2.datei.hash))).toBe(true);
    wert(await schreibe(kern, umkehren(loeschen)));
    expect(wert(kern.bauwerksmodellLaden(M2.id))).toEqual({ bauwerksmodell: M2 });

    wert(await schreibe(kern, loeschen));
    const neu = kernAufDb(db);
    expect(wert(neu.modelldateiVorhanden(M2.datei.hash))).toBe(false);
    expect(wert(neu.modelldateiVorhanden(M1.datei.hash))).toBe(true);
    expect(wert(neu.modelldateiLaden(M1.datei.hash))).toEqual(BYTES_1);
    // In der neuen Sitzung gibt es kein Undo mehr; ein solches ChangeSet fände die Bytes nicht (konflikt, kein Modell ohne Datei).
    const r = await neu.anwenden(
      eintrag(798, P, aggregatVon(loeschen), anlegenBefehl(M2)),
      umkehren(loeschen),
    );
    expect(!r.ok && r.fehler.code).toBe('konflikt');
    expect(sha256(BYTES_1)).toBe(M1.datei.hash);
  });

  it('ein Projekt mit Bauwerksmodell lässt sich nicht löschen (konflikt)', async () => {
    const { kern } = await mitModellen();
    const r = await kern.anwenden(eintrag(797, P, { art: 'projekt', id: P }, { art: 'ProjektLoeschen' }), {
      art: 'projekt',
      projektId: P,
      projekt: { vorher: F.projekt, nachher: null },
    });
    expect(!r.ok && r.fehler.code).toBe('konflikt');
  });
});
