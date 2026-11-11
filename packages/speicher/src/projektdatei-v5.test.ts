// SPDX-License-Identifier: AGPL-3.0-or-later
// Eingefrorene Projektdatei der Schemaversion 5 (Ticket 79, A8, `vertrag` v1.4): Export-Golden mit Kostengruppe und
// Textquelle (im LV, im Auftrags-LV, im Papierkorb, im LV-Stand), Vorlage, Nachtragsangaben, übernommenem Nachtrag,
// Aufmaßblättern, Rechnungen (eine freigegeben) und einer Kostenermittlung. Die Datei wird nie geändert und nie neu
// erzeugt; kommt Version 6, bleibt dieser Test, wie er ist (bis auf die Stellen, an denen der Export byte-gleich sein
// muss), und für Version 6 entsteht eine sechste Datei. Die Dateien der Versionen 1 bis 4 öffnen weiter.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Position, Projektdatei } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { direktTransport, speicherUeberTransport } from './client';
import { kanonischesJson } from './kanonisch';
import { SCHEMA_VERSION } from './migrationen';
import { V2_LV, V2_PROJEKT } from './testhilfe/inhalt-v2';
import { V4_AUFTRAG } from './testhilfe/inhalt-v4';
import {
  schritteV5,
  V5_BLATT_1,
  V5_KOSTENERMITTLUNG,
  V5_KOSTENGRUPPE,
  V5_NACHTRAG,
  V5_NACHTRAGSPOSITION,
  V5_RECHNUNG_1,
  V5_STAND,
  V5_TEXTQUELLE,
} from './testhilfe/inhalt-v5';
import { imProtokoll, neuerKern, wert } from './testhilfe/node';

const inhalt = readFileSync(new URL('../fixtures/projektdatei-v5.json', import.meta.url), 'utf8');
const SHA256 = 'eb204e56e2de24379904d00b35d43676f850d732b76e05717f3e61d74fda1fc5';

const lese = (n: number): string =>
  readFileSync(new URL(`../fixtures/projektdatei-v${String(n)}.json`, import.meta.url), 'utf8');

describe('eingefrorene Projektdatei der Schemaversion 5', () => {
  it('die Datei ist unverändert (Prüfsumme) und in kanonischer Form', () => {
    expect(createHash('sha256').update(inhalt).digest('hex')).toBe(SHA256);
    expect((JSON.parse(inhalt) as { schemaVersion: number }).schemaVersion).toBe(5);
    expect(kanonischesJson(JSON.parse(inhalt)) === inhalt).toBe(true);
  });

  it('entsteht aus der Befehlsfolge: speichern → exportieren ist byte-gleich (solange Version 5 aktuell ist)', async () => {
    const { kern } = await neuerKern();
    const schritte = await schritteV5(kern);
    if (SCHEMA_VERSION === 5) expect(wert(kern.projektdateiExportieren(V2_PROJEKT)) === inhalt).toBe(true);
    expect(wert(kern.protokoll(V2_PROJEKT))).toEqual(schritte.map((s) => imProtokoll(s.eintrag)));
  });

  it('Import → Export ist byte-gleich (Export-Golden, solange Version 5 aktuell ist); danach stabil', async () => {
    const { kern } = await neuerKern();
    expect(wert(kern.projektdateiImportieren(inhalt))).toBe(V2_PROJEKT);
    const neu = wert(kern.projektdateiExportieren(V2_PROJEKT));
    if (SCHEMA_VERSION === 5) expect(neu === inhalt).toBe(true);
    const zweite = await neuerKern();
    wert(zweite.kern.projektdateiImportieren(neu));
    expect(wert(zweite.kern.projektdateiExportieren(V2_PROJEKT)) === neu).toBe(true);
  });

  it('Rundlauf: alles aus v1.4 kommt nach Import über die Repositories zurück', async () => {
    const { kern } = await neuerKern();
    wert(kern.projektdateiImportieren(inhalt));
    const s = speicherUeberTransport(direktTransport(kern), null);
    const d = JSON.parse(inhalt) as Projektdatei;
    const lv = wert(await s.leistungsverzeichnisse.laden(V2_LV));
    expect(lv).toEqual(d.leistungsverzeichnisse.find((z) => z.leistungsverzeichnis.id === V2_LV));
    expect(lv.leistungsverzeichnis.vorlage).toBe(true);
    const pos = (k: readonly { art: string }[]): Position[] =>
      k.filter((x): x is Position => x.art === 'position');
    expect(
      pos(lv.leistungsverzeichnis.knoten).filter((p) => p.kostengruppe === V5_KOSTENGRUPPE),
    ).toHaveLength(1);
    expect(pos(lv.papierkorb?.at(-1)?.knoten ?? [])[0]?.textquelle).toBe(V5_TEXTQUELLE);
    const stand = wert(await s.lvStaende.laden(V5_STAND as never)).zustand.leistungsverzeichnis;
    expect(stand.vorlage).toBe(true);
    expect(
      pos(stand.knoten)
        .map((p) => p.textquelle ?? p.kostengruppe)
        .filter(Boolean),
    ).toEqual([V5_KOSTENGRUPPE, V5_TEXTQUELLE]);
    const liste = wert(await s.leistungsverzeichnisse.auflisten(V2_PROJEKT));
    expect(liste.find((u) => u.id === V5_NACHTRAG)?.nachtrag?.status).toBe('beauftragt');
    expect(liste.find((u) => u.id === V2_LV)?.vorlage).toBe(true);
    const auftrag = wert(
      await s.auftragsLeistungsverzeichnisse.laden(V4_AUFTRAG),
    ).auftragsLeistungsverzeichnis;
    expect(auftrag.knoten.map((k) => k.id)).toContain(V5_NACHTRAGSPOSITION);
    expect(wert(await s.auftragsLeistungsverzeichnisse.auflisten(V2_PROJEKT))).toHaveLength(2);
    expect(wert(await s.aufmasse.auflisten(V4_AUFTRAG)).map((a) => a.nummer)).toEqual([1, 2]);
    expect(wert(await s.aufmasse.laden(V5_BLATT_1)).aufmass.positionen[1]?.menge).toBe('2.400');
    const rechnungen = wert(await s.rechnungen.auflisten(V4_AUFTRAG));
    expect(rechnungen.map((r) => [r.nummer, r.freigabe?.zahlbetrag ?? null])).toEqual([
      [1, '190.61'],
      [2, null],
    ]);
    expect(wert(await s.rechnungen.laden(V5_RECHNUNG_1)).rechnung.art).toBe('abschlag');
    expect(wert(await s.kostenermittlungen.auflisten(V2_PROJEKT))).toEqual([
      {
        id: V5_KOSTENERMITTLUNG,
        projektId: V2_PROJEKT,
        stufe: 'kostenberechnung',
        name: 'Kostenberechnung Entwurf (erfunden)',
      },
    ]);
    const ke = wert(await s.kostenermittlungen.laden(V5_KOSTENERMITTLUNG)).kostenermittlung;
    expect(ke.eintraege.map((e) => e.nummer)).toEqual(['330', '340', '410']);
  });

  it('die eingefrorenen Dateien der Versionen 1 bis 4 öffnen weiter und exportieren in der aktuellen Version', async () => {
    for (const v of [1, 2, 3, 4]) {
      const { kern } = await neuerKern();
      const projekt = wert(kern.projektdateiImportieren(lese(v)));
      const neu = JSON.parse(wert(kern.projektdateiExportieren(projekt))) as Record<string, unknown>;
      expect(neu['schemaVersion']).toBe(SCHEMA_VERSION);
      for (const liste of ['aufmasse', 'rechnungen', 'kostenermittlungen'])
        expect(neu).not.toHaveProperty(liste);
    }
  });

  it('eine Datei der Version 4 mit einem der neuen Felder ist ungültig (die Felder gab es dort nicht)', async () => {
    const d = JSON.parse(inhalt) as Record<string, unknown>;
    for (const text of [
      JSON.stringify({ ...d, schemaVersion: 4 }),
      JSON.stringify({ ...JSON.parse(lese(4)), kostenermittlungen: d['kostenermittlungen'] }),
    ]) {
      const { kern } = await neuerKern();
      expect(kern.projektdateiImportieren(text)).toMatchObject({
        ok: false,
        fehler: { code: 'datei-ungueltig' },
      });
    }
  });
});
