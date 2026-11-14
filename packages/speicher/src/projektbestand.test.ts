// SPDX-License-Identifier: AGPL-3.0-or-later
// Vertrag v1.7c (Ticket 160, D-96), mechanische Folgezeilen bis Ticket 161: Das ChangeSet „projektbestand“ wird noch nicht
// geschrieben (`unbekannt`, nichts geschrieben); `ProjektSamtInhaltLoeschen` ist ein Massenbefehl, dessen Kopf der ganze
// Befehl ist.

import { createHash } from 'node:crypto';
import type { Befehlskurzfassung, ProjektbestandChangeSet, ProjektSamtInhaltLoeschen } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { kanonischesJson } from './kanonisch';
import { befehlskurzfassung } from './kurzfassung';
import { anlegenSchritte, eintrag, ladeFixture } from './testhilfe/fixtures';
import { neuerKern, wert, zaehle } from './testhilfe/node';

const winzig = ladeFixture('winzig');
const befehl: ProjektSamtInhaltLoeschen = { art: 'ProjektSamtInhaltLoeschen' };

describe('Projekt samt Inhalt löschen (Vertrag v1.7c, bis Ticket 161)', () => {
  it('anwenden weist das ChangeSet „projektbestand“ mit unbekannt ab und schreibt nichts', async () => {
    const { kern, db } = await neuerKern();
    for (const s of anlegenSchritte(winzig)) wert(await kern.anwenden(s.eintrag, s.changeSet));
    const protokoll = zaehle(db, 'protokoll');
    const cs: ProjektbestandChangeSet = {
      art: 'projektbestand',
      projektId: winzig.projekt.id,
      projekt: { vorher: winzig.projekt, nachher: null },
      bestand: {
        vorher: {
          leistungsverzeichnisse: [winzig.lv],
          angebote: [],
          auftragsLeistungsverzeichnisse: [],
          protokoll: [],
        },
        nachher: null,
      },
    };
    const e = eintrag(99, winzig.projekt.id, { art: 'projekt', id: winzig.projekt.id }, befehl);
    const r = await kern.anwenden(e, cs);
    expect(r.ok ? null : r.fehler.code).toBe('unbekannt');
    expect(zaehle(db, 'projekt')).toBe(1);
    expect(zaehle(db, 'protokoll')).toBe(protokoll);
  });

  it('der Dekoder liest die Kurzfassung nur mit `art` im Kopf', async () => {
    const a = await neuerKern();
    for (const s of anlegenSchritte(winzig)) wert(await a.kern.anwenden(s.eintrag, s.changeSet));
    const d = JSON.parse(wert(a.kern.projektdateiExportieren(winzig.projekt.id))) as { protokoll: unknown[] };
    const mitKopf = async (kopf: object): Promise<boolean> => {
      const kurz = { ...(await befehlskurzfassung(befehl)), kopf } as Befehlskurzfassung;
      const e = eintrag(99, winzig.projekt.id, { art: 'projekt', id: winzig.projekt.id }, kurz);
      const { kern } = await neuerKern();
      const r = await kern.projektdateiImportieren(JSON.stringify({ ...d, protokoll: [...d.protokoll, e] }));
      return r.ok;
    };
    expect(await mitKopf({ art: 'ProjektSamtInhaltLoeschen' })).toBe(true);
    expect(await mitKopf({ art: 'ProjektSamtInhaltLoeschen', bestand: {} })).toBe(false);
  });

  it('die Kurzfassung trägt den ganzen Befehl als Kopf und die SHA-256 über ihn', async () => {
    const kurz = await befehlskurzfassung(befehl);
    expect(kurz.kopf).toEqual({ art: 'ProjektSamtInhaltLoeschen' });
    expect(kurz.pruefsumme).toEqual({
      algorithmus: 'sha-256',
      wert: createHash('sha256').update(kanonischesJson(befehl), 'utf8').digest('hex'),
    });
  });
});
