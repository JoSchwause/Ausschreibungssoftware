// SPDX-License-Identifier: AGPL-3.0-or-later
// Eingefrorene Projektdatei der Schemaversion 4 (Ticket 57, A8, `vertrag` v1.3): Export-Golden mit Mengenansatz (im LV,
// im Papierkorb, im LV-Stand, im Auftrags-LV), EPA-Bezeichnungen und Auftragnehmer. Die Datei wird nie geändert und nie
// neu erzeugt; kommt Version 5, bleibt dieser Test, wie er ist (bis auf die Stellen, an denen der Export byte-gleich
// sein muss), und für Version 5 entsteht eine fünfte Datei. Die Dateien der Versionen 1 bis 3 öffnen weiter.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Position, Projektdatei } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { kanonischesJson } from './kanonisch';
import { SCHEMA_VERSION } from './migrationen';
import { V2_LV, V2_PROJEKT } from './testhilfe/inhalt-v2';
import { schritteV4, V4_AUFTRAG, V4_LV, V4_STAND } from './testhilfe/inhalt-v4';
import { imProtokoll, neuerKern, wert } from './testhilfe/node';
import { ANSATZ, EPA_BEZEICHNUNGEN } from './testhilfe/v13';

const inhalt = readFileSync(new URL('../fixtures/projektdatei-v4.json', import.meta.url), 'utf8');
const SHA256 = '3eb7fdeb6d8396f62901f7fa4b8836238fc60abdbb247c5f9495a813d64b5b3a';

const lese = (n: number): string =>
  readFileSync(new URL(`../fixtures/projektdatei-v${String(n)}.json`, import.meta.url), 'utf8');

describe('eingefrorene Projektdatei der Schemaversion 4', () => {
  it('die Datei ist unverändert (Prüfsumme) und in kanonischer Form', () => {
    expect(createHash('sha256').update(inhalt).digest('hex')).toBe(SHA256);
    expect((JSON.parse(inhalt) as { schemaVersion: number }).schemaVersion).toBe(4);
    expect(kanonischesJson(JSON.parse(inhalt)) === inhalt).toBe(true);
  });

  it('entsteht aus der Befehlsfolge: speichern → exportieren ist byte-gleich (solange Version 4 aktuell ist)', async () => {
    const { kern } = await neuerKern();
    const schritte = await schritteV4(kern);
    if (SCHEMA_VERSION === 4) expect(wert(kern.projektdateiExportieren(V2_PROJEKT)) === inhalt).toBe(true);
    expect(wert(kern.protokoll(V2_PROJEKT))).toEqual(schritte.map((s) => imProtokoll(s.eintrag)));
  });

  it('Import → Export ist byte-gleich (Export-Golden, solange Version 4 aktuell ist); danach stabil', async () => {
    const { kern } = await neuerKern();
    expect(wert(kern.projektdateiImportieren(inhalt))).toBe(V2_PROJEKT);
    const neu = wert(kern.projektdateiExportieren(V2_PROJEKT));
    if (SCHEMA_VERSION === 4) expect(neu === inhalt).toBe(true);
    const zweite = await neuerKern();
    wert(zweite.kern.projektdateiImportieren(neu));
    expect(wert(zweite.kern.projektdateiExportieren(V2_PROJEKT)) === neu).toBe(true);
  });

  it('Rundlauf: Mengenansatz, EPA-Bezeichnungen und Auftragnehmer kommen nach Import und Laden zurück', async () => {
    const { kern } = await neuerKern();
    wert(kern.projektdateiImportieren(inhalt));
    const d = JSON.parse(inhalt) as Projektdatei;
    const lv = wert(kern.lvLaden(V2_LV));
    expect(lv).toEqual(d.leistungsverzeichnisse.find((z) => z.leistungsverzeichnis.id === V2_LV));
    const mitAnsatz = (k: readonly { art: string }[]): number =>
      k.filter((x) => x.art === 'position' && (x as Position).mengenansatz !== undefined).length;
    expect(mitAnsatz(lv.leistungsverzeichnis.knoten)).toBe(1);
    expect(mitAnsatz(lv.papierkorb?.at(-1)?.knoten ?? [])).toBe(1);
    expect(mitAnsatz(wert(kern.lvStandLaden(V4_STAND as never)).zustand.leistungsverzeichnis.knoten)).toBe(2);
    const importiert = wert(kern.lvLaden(V4_LV)).leistungsverzeichnis;
    expect(importiert.epaBezeichnungen).toEqual(EPA_BEZEICHNUNGEN);
    expect(importiert.knoten.find((k): k is Position => k.art === 'position')?.mengenansatz).toEqual(ANSATZ);
    const auftrag = d.auftragsLeistungsverzeichnisse.find(
      (z) => z.auftragsLeistungsverzeichnis.id === V4_AUFTRAG,
    );
    expect(auftrag?.auftragsLeistungsverzeichnis.auftragnehmer?.name).toBe('Beispiel AG (erfunden)');
  });

  it('die eingefrorenen Dateien der Versionen 1 bis 3 öffnen weiter und bleiben, wie sie waren', async () => {
    for (const v of [1, 2, 3]) {
      const { kern } = await neuerKern();
      const projekt = wert(kern.projektdateiImportieren(lese(v)));
      const neu = JSON.parse(wert(kern.projektdateiExportieren(projekt))) as { schemaVersion: number };
      expect(neu.schemaVersion).toBe(SCHEMA_VERSION);
    }
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
  const neuesLv = (JSON.parse(inhalt) as Projektdatei).leistungsverzeichnisse.findIndex(
    (z) => z.leistungsverzeichnis.id === V4_LV,
  );
  const kopf: Pfad = ['leistungsverzeichnisse', neuesLv, 'leistungsverzeichnis'];
  const epa: Pfad = [...kopf, 'epaBezeichnungen'];
  const ansatz: Pfad = [...kopf, 'knoten', 1, 'mengenansatz'];
  const auftragnehmer: Pfad = [
    'auftragsLeistungsverzeichnisse',
    1,
    'auftragsLeistungsverzeichnis',
    'auftragnehmer',
  ];

  it.each<[string, string]>([
    ['EPA-Bezeichnungen leer', aendere(epa, [])],
    ['EPA-Bezeichnung mit Nummer 7', aendere([...epa, 0, 'nummer'], 7)],
    ['EPA-Bezeichnung mit Nummer 0', aendere([...epa, 0, 'nummer'], 0)],
    ['EPA-Bezeichnungen nicht aufsteigend', aendere([...epa, 2, 'nummer'], 1)],
    ['EPA-Bezeichnung mit doppelter Art', aendere([...epa, 1, 'anteil'], 'lohn')],
    ['EPA-Bezeichnung mit unbekannter Art', aendere([...epa, 1, 'anteil'], 'freiBezeichnung')],
    ['EPA-Bezeichnung ohne Beschriftung', aendere([...epa, 0, 'bezeichnung'], undefined)],
    ['Mengenansatz leer', aendere(ansatz, [])],
    ['Ansatzzeile mit Zahl als Ausdruck', aendere([...ansatz, 0, 'ausdruck'], 12)],
    ['Ansatzzeile mit fremdem Feld', aendere([...ansatz, 0, 'ergebnis'], '12.000')],
    ['Mengenansatz an einem Titel', aendere([...kopf, 'knoten', 0, 'mengenansatz'], [])],
    ['Auftragnehmer ohne Ort', aendere([...auftragnehmer, 'ort'], undefined)],
    ['Auftragnehmer mit Vergabenummer', aendere([...auftragnehmer, 'vergabenummer'], null)],
  ])('%s: datei-ungueltig, nichts übernommen', async (_name, text) => {
    const { kern, db } = await neuerKern();
    expect(kern.projektdateiImportieren(text)).toMatchObject({
      ok: false,
      fehler: { code: 'datei-ungueltig' },
    });
    expect(db.zeilen('SELECT COUNT(*) AS n FROM projekt')[0]?.['n']).toBe(0);
  });

  it('eine Datei der Version 3 mit einem der neuen Felder ist ungültig (die Felder gab es dort nicht)', async () => {
    const { kern } = await neuerKern();
    const alt = JSON.parse(lese(3)) as Record<string | number, unknown>;
    const lv = (alt['leistungsverzeichnisse'] as Record<string, Record<string, unknown>>[])[0];
    if (lv?.['leistungsverzeichnis'] === undefined) throw new Error('kein LV');
    lv['leistungsverzeichnis']['epaBezeichnungen'] = EPA_BEZEICHNUNGEN;
    expect(kern.projektdateiImportieren(JSON.stringify(alt))).toMatchObject({
      ok: false,
      fehler: { code: 'datei-ungueltig' },
    });
  });
});
