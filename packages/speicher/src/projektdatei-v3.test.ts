// SPDX-License-Identifier: AGPL-3.0-or-later
// Eingefrorene Projektdatei der Schemaversion 3 (Ticket 43, A8): Export-Golden mit LV-Stand und Papierkorb. Die Datei
// wird nie geändert und nie neu erzeugt; kommt Version 4, bleibt dieser Test, wie er ist (bis auf die Stellen, an denen
// der Export byte-gleich sein muss), und für Version 4 entsteht eine vierte Datei. Die Dateien der Versionen 1 und 2
// öffnen weiter (`projektdatei.test.ts`, `projektdatei-v2.test.ts`).

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Projektdatei } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { kanonischesJson } from './kanonisch';
import { SCHEMA_VERSION } from './migrationen';
import { V2_ANGEBOT, V2_LV, V2_PROJEKT } from './testhilfe/inhalt-v2';
import { schritteV3, V3_EINTRAG_1, V3_STAND } from './testhilfe/inhalt-v3';
import { imProtokoll, neuerKern, wert } from './testhilfe/node';

const inhalt = readFileSync(new URL('../fixtures/projektdatei-v3.json', import.meta.url), 'utf8');
const SHA256 = '5ab4dd074b6597e324bca8b9868ca5cd12380c39f99af2e474e829a4f2671444';

describe('eingefrorene Projektdatei der Schemaversion 3', () => {
  it('die Datei ist unverändert (Prüfsumme) und in kanonischer Form', () => {
    expect(createHash('sha256').update(inhalt).digest('hex')).toBe(SHA256);
    expect((JSON.parse(inhalt) as { schemaVersion: number }).schemaVersion).toBe(3);
    expect(kanonischesJson(JSON.parse(inhalt)) === inhalt).toBe(true);
  });

  it('entsteht aus der Befehlsfolge: speichern → exportieren ist byte-gleich (solange Version 3 aktuell ist)', async () => {
    const { kern } = await neuerKern();
    const schritte = await schritteV3(kern);
    if (SCHEMA_VERSION === 3) expect(wert(kern.projektdateiExportieren(V2_PROJEKT)) === inhalt).toBe(true);
    expect(wert(kern.protokoll(V2_PROJEKT))).toEqual(schritte.map((s) => imProtokoll(s.eintrag)));
  });

  it('Import → Export ist byte-gleich (Export-Golden, solange Version 3 aktuell ist); danach stabil', async () => {
    const { kern } = await neuerKern();
    expect(wert(await kern.projektdateiImportieren(inhalt))).toBe(V2_PROJEKT);
    const neu = wert(kern.projektdateiExportieren(V2_PROJEKT));
    if (SCHEMA_VERSION === 3) expect(neu === inhalt).toBe(true);
    const zweite = await neuerKern();
    wert(await zweite.kern.projektdateiImportieren(neu));
    expect(wert(zweite.kern.projektdateiExportieren(V2_PROJEKT)) === neu).toBe(true);
  });

  it('Rundlauf: Papierkorb, Stand und Angebot auf die Position im Papierkorb kommen nach Import und Laden zurück', async () => {
    const { kern } = await neuerKern();
    wert(await kern.projektdateiImportieren(inhalt));
    const d = JSON.parse(inhalt) as Projektdatei;
    const lv = wert(kern.lvLaden(V2_LV));
    expect(lv).toEqual(d.leistungsverzeichnisse[0]);
    expect(lv.papierkorb?.map((e) => [e.id, e.nummer])).toEqual([[V3_EINTRAG_1, 1]]);
    const stand = wert(kern.lvStandLaden(V3_STAND as never));
    expect(stand).toEqual(d.lvStaende?.[0]);
    expect(stand.zustand.papierkorb).toEqual(lv.papierkorb);
    expect(stand.zustand).not.toEqual(lv); // das LV wurde nach dem Stand weiter geändert
    const imKorb = lv.papierkorb?.[0]?.knoten[0]?.id;
    const angebot = wert(kern.angebotLaden(V2_ANGEBOT));
    expect(angebot.angebot.positionen.some((p) => p.positionId === imKorb)).toBe(true);
  });

  type Pfad = (string | number)[];
  const aendere = (pfad: Pfad, w: unknown): string => {
    const d = JSON.parse(inhalt) as Record<string | number, unknown>;
    let eltern = d;
    for (const s of pfad.slice(0, -1)) eltern = eltern[s] as Record<string | number, unknown>;
    const letzter = pfad[pfad.length - 1] as string | number;
    if (w === undefined) Reflect.deleteProperty(eltern, letzter);
    else eltern[letzter] = w;
    return JSON.stringify(d);
  };
  const korb: Pfad = ['leistungsverzeichnisse', 0, 'papierkorb', 0];
  const stand: Pfad = ['lvStaende', 0];

  it.each<[string, string]>([
    ['Papierkorbeintrag mit Nummer 0', aendere([...korb, 'nummer'], 0)],
    ['Papierkorbeintrag ohne Knoten', aendere([...korb, 'knoten'], [])],
    ['Papierkorbeintrag mit fremdem Feld', aendere([...korb, 'grund'], 'x')],
    ['Papierkorb als Objekt', aendere(['leistungsverzeichnisse', 0, 'papierkorb'], {})],
    [
      'Knoten zugleich im Baum',
      aendere(
        [...korb, 'knoten'],
        [(JSON.parse(inhalt) as Projektdatei).leistungsverzeichnisse[0]?.leistungsverzeichnis.knoten[3]],
      ),
    ],
    ['Stand ohne Zustand', aendere([...stand, 'zustand'], undefined)],
    ['Stand zu einem fremden LV', aendere([...stand, 'leistungsverzeichnisId'], 'anderes-lv')],
    ['Stand mit fremdem Projekt', aendere([...stand, 'zustand', 'leistungsverzeichnis', 'projektId'], 'x')],
    ['Stände als Objekt', aendere(['lvStaende'], {})],
  ])('%s: datei-ungueltig, nichts übernommen', async (_name, text) => {
    const { kern, db } = await neuerKern();
    expect(await kern.projektdateiImportieren(text)).toMatchObject({
      ok: false,
      fehler: { code: 'datei-ungueltig' },
    });
    expect(db.zeilen('SELECT COUNT(*) AS n FROM projekt')[0]?.['n']).toBe(0);
  });

  it('eine Datei der Version 2 mit Papierkorb oder Ständen ist ungültig (die Felder gab es dort nicht)', async () => {
    const { kern } = await neuerKern();
    const alt = aendere(['schemaVersion'], 2);
    expect(await kern.projektdateiImportieren(alt)).toMatchObject({
      ok: false,
      fehler: { code: 'datei-ungueltig' },
    });
  });
});
