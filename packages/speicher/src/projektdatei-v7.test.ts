// SPDX-License-Identifier: AGPL-3.0-or-later
// Eingefrorene Projektdatei der Schemaversion 7 (Ticket 139, A8, `vertrag` v1.7a): Export-Golden mit Projekt- und Bieterangaben,
// Preisspiegel-Einstellungen, Kalkulationsangaben, umbenanntem und wiederhergestelltem LV-Stand und dem Block der Einstellungen.
// Die Datei wird nie geändert und nie neu erzeugt; kommt Version 8, bleibt dieser Test (bis auf die Stellen, an denen der Export
// byte-gleich sein muss). Bei den Modelldateien wird der SHA-256 der entpackten Bytes verglichen (D-51, wie Version 6).

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { LEERE_EINSTELLUNGEN, type Position, type Projektdatei } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { direktTransport, speicherUeberTransport } from './client';
import { kanonischesJson } from './kanonisch';
import { MIGRATIONEN, SCHEMA_VERSION } from './migrationen';
import { V2_LV, V2_PROJEKT } from './testhilfe/inhalt-v2';
import { V4_STAND } from './testhilfe/inhalt-v4';
import { schritteV7, V7_BIETER, V7_STAND } from './testhilfe/inhalt-v7';
import { imProtokoll, neuerKern, wert } from './testhilfe/node';
import { BIETERANGABEN, EINSTELLUNGEN, KALKULATION, PREISSPIEGEL, PROJEKTANGABEN } from './testhilfe/v17';

const inhalt = readFileSync(new URL('../fixtures/projektdatei-v7.json', import.meta.url), 'utf8');
const SHA256 = 'a00309b95fdbada8fb70558a99172fb7cc756e85f3d55e74bbaf0e5c410ebcbe';
const sha = (b: Uint8Array | string): string => createHash('sha256').update(b).digest('hex');
const lese = (n: number): string =>
  readFileSync(new URL(`../fixtures/projektdatei-v${String(n)}.json`, import.meta.url), 'utf8');

type Roh = Record<string, unknown> & { modelldateien?: { hash: string; inhalt: string }[] };

/** Die Datei mit dem SHA-256 der entpackten Bytes statt des komprimierten Texts (D-51). */
function normalisiert(text: string): Roh {
  const d = JSON.parse(text) as Roh;
  for (const m of d.modelldateien ?? []) m.inhalt = sha(inflateRawSync(Buffer.from(m.inhalt, 'base64')));
  return d;
}

/** Ändert einen Wert der Datei an `pfad` (oder entfernt ihn bei `undefined`). */
function aendere(text: string, pfad: (string | number)[], neu: unknown): string {
  const d = JSON.parse(text) as Record<string | number, unknown>;
  let o = d;
  for (const s of pfad.slice(0, -1)) o = o[s] as Record<string | number, unknown>;
  const letzt = pfad[pfad.length - 1] as string | number;
  if (neu === undefined) Reflect.deleteProperty(o, letzt);
  else o[letzt] = neu;
  return JSON.stringify(d);
}

const positionen = (k: readonly { art: string }[]): Position[] =>
  k.filter((x): x is Position => x.art === 'position');

describe('eingefrorene Projektdatei der Schemaversion 7', () => {
  it('die Datei ist unverändert (Prüfsumme), kanonisch und trägt alles Neue aus Version 7', () => {
    expect(sha(inhalt)).toBe(SHA256);
    const d = JSON.parse(inhalt) as Projektdatei;
    expect(d.schemaVersion).toBe(7);
    expect(kanonischesJson(d) === inhalt).toBe(true);
    expect(d.projekt.angaben).toEqual(PROJEKTANGABEN);
    expect(d.projekt.bieter.filter((b) => b.angaben !== undefined).map((b) => b.id)).toEqual([
      'bieter-1',
      V7_BIETER,
    ]);
    expect(d.einstellungen).toEqual(EINSTELLUNGEN);
  });

  it('entsteht aus der Befehlsfolge: speichern → exportieren ist gleich bis auf den komprimierten Text (solange Version 7 aktuell ist)', async () => {
    const { kern } = await neuerKern();
    const schritte = await schritteV7(kern);
    const neu = wert(kern.projektdateiExportieren(V2_PROJEKT));
    if (SCHEMA_VERSION === 7) expect(normalisiert(neu)).toEqual(normalisiert(inhalt));
    expect(wert(kern.protokoll(V2_PROJEKT))).toEqual(schritte.map((s) => imProtokoll(s.eintrag)));
  });

  it('Import → Export ist byte-gleich (auch der komprimierte Text)', async () => {
    const { kern } = await neuerKern();
    expect(wert(await kern.projektdateiImportieren(inhalt))).toBe(V2_PROJEKT);
    const neu = wert(kern.projektdateiExportieren(V2_PROJEKT));
    if (SCHEMA_VERSION === 7) expect(neu === inhalt).toBe(true);
    const zweite = await neuerKern();
    wert(await zweite.kern.projektdateiImportieren(neu));
    expect(wert(zweite.kern.projektdateiExportieren(V2_PROJEKT)) === neu).toBe(true);
  });

  it('Rundlauf: alles aus v1.7a kommt nach dem Einlesen über die Repositories zurück', async () => {
    const { kern } = await neuerKern();
    const s = speicherUeberTransport(direktTransport(kern), null);
    if (s.projektdateiEinlesen === undefined || s.einstellungen === undefined) throw new Error('v1.7a fehlt');
    const bericht = wert(await s.projektdateiEinlesen(inhalt));
    expect(bericht.einstellungen?.belassen).toEqual([]);
    expect(bericht.einstellungen?.uebernommen).toHaveLength(5);
    expect(wert(await s.einstellungen.laden())).toEqual(EINSTELLUNGEN);
    const projekt = wert(await s.projekte.laden(V2_PROJEKT));
    expect(projekt.angaben).toEqual(PROJEKTANGABEN);
    expect(projekt.bieter[0]?.angaben).toEqual(BIETERANGABEN);
    expect(projekt.bieter.find((b) => b.id === V7_BIETER)?.name).toBe('Neubau GmbH & Co. KG (erfunden)');
    const lv = wert(await s.leistungsverzeichnisse.laden(V2_LV)).leistungsverzeichnis;
    expect(lv.preisspiegel).toEqual(PREISSPIEGEL);
    expect(
      positionen(lv.knoten)
        .filter((p) => p.kalkulation !== undefined)
        .map((p) => p.kalkulation),
    ).toEqual([KALKULATION]);
    const staende = wert(await s.lvStaende.auflisten(V2_LV));
    expect(staende.map((x) => x.name)).toContain('Mit Mengenansatz (umbenannt)');
    expect(staende.at(-1)).toMatchObject({ id: V7_STAND, angelegt: '2026-11-13T09:08:00.000Z' });
    const stand = wert(await s.lvStaende.laden(V7_STAND)).zustand.leistungsverzeichnis;
    expect(stand.preisspiegel).toEqual(PREISSPIEGEL);
    expect(positionen(stand.knoten).some((p) => p.kalkulation !== undefined)).toBe(true);
    expect(wert(await s.lvStaende.laden(V4_STAND as never)).name).toBe('Mit Mengenansatz (umbenannt)');
  });

  it('die Dateien der Versionen 1 bis 6 öffnen weiter; eine Datei ohne das Neue ist gleich der Version 6 bis auf die Versionsnummer', async () => {
    for (const v of [1, 2, 3, 4, 5, 6]) {
      const { kern } = await neuerKern();
      const projekt = wert(await kern.projektdateiImportieren(lese(v)));
      const neu = JSON.parse(wert(kern.projektdateiExportieren(projekt))) as Record<string, unknown>;
      expect(neu['schemaVersion']).toBe(SCHEMA_VERSION);
      expect(neu).not.toHaveProperty('einstellungen');
      expect(wert(kern.einstellungenLaden())).toEqual(LEERE_EINSTELLUNGEN);
    }
    const { kern } = await neuerKern();
    wert(await kern.projektdateiImportieren(lese(6)));
    const neu = wert(kern.projektdateiExportieren(V2_PROJEKT));
    if (SCHEMA_VERSION === 7) expect(neu).toBe(lese(6).replace('"schemaVersion": 6', '"schemaVersion": 7'));
  });

  it('eine Datei der Version 6 mit einem der neuen Felder ist ungültig (die Felder gab es dort nicht)', async () => {
    const d = JSON.parse(inhalt) as Record<string, unknown>;
    for (const text of [
      JSON.stringify({ ...d, schemaVersion: 6 }),
      JSON.stringify({ ...JSON.parse(lese(6)), einstellungen: d['einstellungen'] }),
    ]) {
      const { kern } = await neuerKern();
      expect(await kern.projektdateiImportieren(text)).toMatchObject({
        ok: false,
        fehler: { code: 'datei-ungueltig' },
      });
    }
  });

  it('die Dateimigration hebt nichts an Version 7 an (sie ist die letzte)', () => {
    expect(MIGRATIONEN.at(-1)?.version).toBe(SCHEMA_VERSION);
  });
});

describe('Projektdatei Version 7: ungültige Formen der neuen Felder (datei-ungueltig, nichts übernommen, Q5)', () => {
  const projekt = ['projekt'];
  const bieter = ['projekt', 'bieter', 0];
  const d = JSON.parse(inhalt) as Projektdatei;
  const lvIndex = d.leistungsverzeichnisse.findIndex(
    (z) => z.leistungsverzeichnis.preisspiegel !== undefined,
  );
  const lvMit = ['leistungsverzeichnisse', lvIndex, 'leistungsverzeichnis'];
  const knoten = d.leistungsverzeichnisse[lvIndex]?.leistungsverzeichnis.knoten ?? [];
  const kalkIndex = knoten.findIndex((k) => k.art === 'position' && k.kalkulation !== undefined);
  const kalk = [...lvMit, 'knoten', kalkIndex, 'kalkulation'];
  const faelle: [string, (string | number)[], unknown][] = [
    ['Projektangaben ohne jeden Teil', [...projekt, 'angaben'], { nummer: null, ort: null, baustelle: null }],
    ['Projektnummer leer', [...projekt, 'angaben', 'nummer'], ''],
    ['Projektangaben mit unbekanntem Feld', [...projekt, 'angaben', 'zusatz'], 'x'],
    [
      'Baustelle ohne jeden Teil',
      [...projekt, 'angaben', 'baustelle'],
      { strasse: null, plz: null, ort: null },
    ],
    [
      'Bieterangaben ohne jeden Teil',
      [...bieter, 'angaben'],
      { anschrift: null, ansprechperson: null, email: null, telefon: null },
    ],
    ['E-Mail leer', [...bieter, 'angaben', 'email'], ''],
    ['Bieterangaben null', [...bieter, 'angaben'], null],
    ['Preisspiegel: Satz nicht kanonisch', [...lvMit, 'preisspiegel', 'abcSchwelleA'], '70'],
    ['Preisspiegel: unbekannter Bezug', [...lvMit, 'preisspiegel', 'abcBezug'], 'median'],
    ['Preisspiegel null', [...lvMit, 'preisspiegel'], null],
    [
      'Preisspiegel am Auftrags-LV',
      ['auftragsLeistungsverzeichnisse', 0, 'auftragsLeistungsverzeichnis', 'preisspiegel'],
      {},
    ],
    ['Kalkulation leer', kalk, { ansaetze: [], zuschlagssaetze: {} }],
    ['Kalkulation: unbekannte Kostenart', [...kalk, 'ansaetze', 0, 'art'], 'maschinen'],
    ['Kalkulation: Ansatzmenge nicht kanonisch', [...kalk, 'ansaetze', 0, 'ansatzmenge'], '0.45'],
    ['Kalkulation: Zuschlag einer unbekannten Art', [...kalk, 'zuschlagssaetze', 'gewinn'], '5.00'],
    ['Kalkulation: Zuschlagssatz als Zahl', [...kalk, 'zuschlagssaetze', 'lohn'], 12.5],
  ];
  it.each(faelle)('%s', async (_was, pfad, wert2) => {
    const { kern } = await neuerKern();
    expect(await kern.projektdateiImportieren(aendere(inhalt, pfad, wert2))).toMatchObject({
      ok: false,
      fehler: { code: 'datei-ungueltig' },
    });
    expect(wert(kern.projekteAuflisten())).toEqual([]);
    expect(wert(kern.einstellungenLaden())).toEqual(LEERE_EINSTELLUNGEN);
  });
});
