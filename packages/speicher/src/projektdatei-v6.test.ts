// SPDX-License-Identifier: AGPL-3.0-or-later
// Eingefrorene Projektdatei der Schemaversion 6 (Ticket 106, A8, `vertrag` v1.6): Export-Golden mit Bauteilzuordnungen, zwei
// Bauwerksmodellen samt Modelldateien (deflate-raw, Base64), Bauzeitenplan, Honorarberechnung, Mängeln und Bautagebuch. Die
// Datei wird nie geändert und nie neu erzeugt; kommt Version 7, bleibt dieser Test (bis auf die Stellen, an denen der Export
// byte-gleich sein muss). Verglichen wird bei den Modelldateien der SHA-256 der entpackten Bytes, nie der komprimierte Text
// (D-51: deflate ist zwischen Implementierungen nicht byte-stabil); entpackt wird hier mit `node:zlib`, unabhängig von `speicher`.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import type { Position, Projektdatei, ProjektId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { direktTransport, speicherUeberTransport } from './client';
import { kanonischesJson } from './kanonisch';
import { SpeicherKern } from './kern';
import { MIGRATIONEN, SCHEMA_VERSION } from './migrationen';
import { V2_LV, V2_PROJEKT } from './testhilfe/inhalt-v2';
import { V4_AUFTRAG } from './testhilfe/inhalt-v4';
import {
  schritteV6,
  V6_BYTES_1,
  V6_BYTES_2,
  V6_HONORAR,
  V6_MANGEL_1,
  V6_MODELL_1,
  V6_MODELL_2,
  V6_PLAN,
  V6_ZUORDNUNGEN,
} from './testhilfe/inhalt-v6';
import { eintrag } from './testhilfe/fixtures';
import { imProtokoll, neueDatenbank, neuerKern, wert } from './testhilfe/node';

const inhalt = readFileSync(new URL('../fixtures/projektdatei-v6.json', import.meta.url), 'utf8');
const SHA256 = 'd336deab769be5932d9c5709018ead8e427c3079b17625787b050c1fc79cead7';
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
function aendere(text: string, pfad: (string | number)[], wert2: unknown): string {
  const d = JSON.parse(text) as Record<string | number, unknown>;
  let o = d;
  for (const s of pfad.slice(0, -1)) o = o[s] as Record<string | number, unknown>;
  const letzt = pfad[pfad.length - 1] as string | number;
  if (wert2 === undefined) Reflect.deleteProperty(o, letzt);
  else o[letzt] = wert2;
  return JSON.stringify(d);
}

const ungueltig = { ok: false, fehler: { code: 'datei-ungueltig' } };

describe('eingefrorene Projektdatei der Schemaversion 6', () => {
  it('die Datei ist unverändert (Prüfsumme), kanonisch, und ihre Modelldateien entpacken zu den genannten Hashes', () => {
    expect(sha(inhalt)).toBe(SHA256);
    const d = JSON.parse(inhalt) as Projektdatei;
    expect(d.schemaVersion).toBe(6);
    expect(kanonischesJson(d) === inhalt).toBe(true);
    expect(normalisiert(inhalt).modelldateien).toEqual(
      [sha(V6_BYTES_1), sha(V6_BYTES_2)].sort().map((h) => ({ hash: h, inhalt: h })),
    );
  });

  it('entsteht aus der Befehlsfolge: speichern → exportieren ist gleich bis auf den komprimierten Text (solange Version 6 aktuell ist)', async () => {
    const { kern } = await neuerKern();
    const schritte = await schritteV6(kern);
    const neu = wert(kern.projektdateiExportieren(V2_PROJEKT));
    if (SCHEMA_VERSION === 6) expect(normalisiert(neu)).toEqual(normalisiert(inhalt));
    expect(wert(kern.protokoll(V2_PROJEKT))).toEqual(schritte.map((s) => imProtokoll(s.eintrag)));
  });

  it('Import → Export ist byte-gleich, auch der komprimierte Text (die Bytes bleiben, wie die Datei sie bringt)', async () => {
    const { kern } = await neuerKern();
    expect(wert(await kern.projektdateiImportieren(inhalt))).toBe(V2_PROJEKT);
    const neu = wert(kern.projektdateiExportieren(V2_PROJEKT));
    if (SCHEMA_VERSION === 6) expect(neu === inhalt).toBe(true);
    const zweite = await neuerKern();
    wert(await zweite.kern.projektdateiImportieren(neu));
    expect(wert(zweite.kern.projektdateiExportieren(V2_PROJEKT)) === neu).toBe(true);
  });

  it('Rundlauf: alles aus v1.6 kommt nach Import über die Repositories und die Ablage zurück', async () => {
    const { kern } = await neuerKern();
    wert(await kern.projektdateiImportieren(inhalt));
    const s = speicherUeberTransport(direktTransport(kern), null);
    const d = JSON.parse(inhalt) as Projektdatei;
    const pos = (k: readonly { art: string }[]): Position[] =>
      k.filter((x): x is Position => x.art === 'position');
    const lv = wert(await s.leistungsverzeichnisse.laden(V2_LV)).leistungsverzeichnis;
    expect(pos(lv.knoten).find((p) => p.bauteile !== undefined)?.bauteile).toEqual(V6_ZUORDNUNGEN);
    const auftrag = wert(
      await s.auftragsLeistungsverzeichnisse.laden(V4_AUFTRAG),
    ).auftragsLeistungsverzeichnis;
    expect(pos(auftrag.knoten).find((p) => p.bauteile !== undefined)?.bauteile).toHaveLength(2);
    const modelle = wert(await s.bauwerksmodelle.auflisten(V2_PROJEKT));
    expect(modelle.map((m) => [m.id, m.anzahlBauteile, m.vorgaengerId])).toEqual([
      [V6_MODELL_2, 10, V6_MODELL_1],
      [V6_MODELL_1, 12, null],
    ]);
    expect(wert(await s.bauwerksmodelle.laden(V6_MODELL_1))).toEqual(d.bauwerksmodelle?.[0]);
    for (const [m, bytes] of [
      [V6_MODELL_1, V6_BYTES_1],
      [V6_MODELL_2, V6_BYTES_2],
    ] as const) {
      const hash = wert(await s.bauwerksmodelle.laden(m)).bauwerksmodell.datei.hash;
      expect(wert(await s.modelldateien.laden(hash))).toEqual(bytes);
    }
    expect(wert(await s.bauzeitenplaene.laden(V6_PLAN))).toEqual(d.bauzeitenplaene?.[0]);
    expect(wert(await s.honorarberechnungen.laden(V6_HONORAR))).toEqual(d.honorarberechnungen?.[0]);
    expect(wert(await s.maengel.auflisten(V2_PROJEKT)).map((m) => m.verlauf.at(-1)?.status)).toEqual([
      'angezeigt',
      'angezeigt',
    ]);
    expect(wert(await s.maengel.laden(V6_MANGEL_1)).mangel.bauteil?.bauwerksmodellId).toBe(V6_MODELL_1);
    expect(wert(await s.bautagebuch.auflisten(V2_PROJEKT)).map((t) => t.datum)).toEqual([
      '2026-11-23',
      '2026-11-24',
    ]);
  });

  it('die Dateien der Versionen 1 bis 5 öffnen weiter; eine Datei ohne das Neue ist gleich der Version 5 bis auf die Versionsnummer', async () => {
    for (const v of [1, 2, 3, 4, 5]) {
      const { kern } = await neuerKern();
      const projekt = wert(await kern.projektdateiImportieren(lese(v)));
      const neu = JSON.parse(wert(kern.projektdateiExportieren(projekt))) as Record<string, unknown>;
      expect(neu['schemaVersion']).toBe(SCHEMA_VERSION);
      for (const liste of [
        'bauwerksmodelle',
        'modelldateien',
        'bauzeitenplaene',
        'honorarberechnungen',
        'maengel',
        'bautagebuch',
      ])
        expect(neu).not.toHaveProperty(liste);
    }
    const { kern } = await neuerKern();
    wert(await kern.projektdateiImportieren(lese(5)));
    const neu = wert(kern.projektdateiExportieren(V2_PROJEKT));
    if (SCHEMA_VERSION === 6) expect(neu).toBe(lese(5).replace('"schemaVersion": 5', '"schemaVersion": 6'));
  });

  it('eine Frist am Verlaufseintrag angezeigt (D-66) kommt nach Import unverändert zurück', async () => {
    const text = aendere(inhalt, ['maengel', 0, 'mangel', 'verlauf', 1, 'frist'], '2026-12-04');
    const { kern } = await neuerKern();
    wert(await kern.projektdateiImportieren(text));
    expect(wert(kern.mangelLaden(V6_MANGEL_1)).mangel.verlauf[1]).toEqual({
      status: 'angezeigt',
      datum: '2026-11-21',
      bemerkung: null,
      frist: '2026-12-04',
    });
    expect(wert(kern.projektdateiExportieren(V2_PROJEKT))).toBe(kanonischesJson(JSON.parse(text)));
  });

  it('schon abgelegte Bytes bleiben beim Import unverändert; ein zweiter Import desselben Projekts: existiert-bereits', async () => {
    const { kern } = await neuerKern();
    wert(await kern.modelldateiAblegen(V6_BYTES_1));
    wert(await kern.projektdateiImportieren(inhalt));
    expect(wert(kern.modelldateiLaden(sha(V6_BYTES_1)))).toEqual(V6_BYTES_1);
    expect(await kern.projektdateiImportieren(inhalt)).toMatchObject({
      ok: false,
      fehler: { code: 'existiert-bereits' },
    });
  });
});

describe('Projektdatei Version 6: ungültige Formen (datei-ungueltig, nichts übernommen, Q5)', () => {
  const modell: (string | number)[] = ['bauwerksmodelle', 0, 'bauwerksmodell'];
  const datei = ['modelldateien', 0];
  const plan = ['bauzeitenplaene', 0, 'bauzeitenplan'];
  const honorar = ['honorarberechnungen', 0, 'honorarberechnung'];
  const mangel = ['maengel', 0, 'mangel'];
  const tag = ['bautagebuch', 0, 'bautagebucheintrag'];
  const fremd = Buffer.from(deflateRawSync(Buffer.from('fremde Bytes'))).toString('base64');
  const anders = Buffer.from(deflateRawSync(Buffer.from(V6_BYTES_2))).toString('base64');
  const positionMitBauteilen = (d: string): number =>
    (JSON.parse(d) as Projektdatei).leistungsverzeichnisse[0]?.leistungsverzeichnis.knoten.findIndex(
      (k) => k.art === 'position' && k.bauteile !== undefined,
    ) ?? -1;
  const lvKnoten = ['leistungsverzeichnisse', 0, 'leistungsverzeichnis', 'knoten'];

  it.each<[string, (d: string) => string]>([
    ['Bytes, deren SHA-256 nicht der Hash ist', (d) => aendere(d, [...datei, 'inhalt'], fremd)],
    ['Bytes eines anderen Modells unter dem Hash', (d) => aendere(d, [...datei, 'inhalt'], anders)],
    ['inhalt ist kein Base64', (d) => aendere(d, [...datei, 'inhalt'], 'kein base64!')],
    ['inhalt ohne Auffüllung', (d) => aendere(d, [...datei, 'inhalt'], 'AAAAA')],
    [
      'inhalt ist kein deflate-raw',
      (d) => aendere(d, [...datei, 'inhalt'], Buffer.from('xyz').toString('base64')),
    ],
    [
      'eine genannte Modelldatei fehlt',
      (d) => aendere(d, ['modelldateien'], [(JSON.parse(d) as Roh).modelldateien?.[1]]),
    ],
    [
      'eine Modelldatei, die kein Modell nennt',
      (d) => aendere(d, [...modell, 'datei', 'hash'], 'a'.repeat(64)),
    ],
    [
      'Modelldateien nicht nach Hash',
      (d) => aendere(d, ['modelldateien'], [...((JSON.parse(d) as Roh).modelldateien ?? [])].reverse()),
    ],
    ['Modelldateien ohne Modelle', (d) => aendere(d, ['bauwerksmodelle'], undefined)],
    ['Größe der Datei passt nicht', (d) => aendere(d, [...modell, 'datei', 'groesse'], 1)],
    ['Hash in Großbuchstaben', (d) => aendere(d, [...datei, 'hash'], 'A'.repeat(64))],
    ['GlobalId zu kurz', (d) => aendere(d, [...modell, 'bauteile', 0, 'globalId'], 'kurz')],
    ['Menge mit 2 Stellen', (d) => aendere(d, [...modell, 'bauteile', 0, 'mengen', 0, 'wert'], '1.00')],
    ['Mengenart unbekannt', (d) => aendere(d, [...modell, 'bauteile', 0, 'mengen', 0, 'art'], 'masse')],
    ['Kostengruppe 31', (d) => aendere(d, [...modell, 'bauteile', 0, 'kostengruppe'], '31')],
    ['teilVonGlobalId null', (d) => aendere(d, [...modell, 'bauteile', 1, 'teilVonGlobalId'], null)],
    ['Schema IFC5', (d) => aendere(d, [...modell, 'schema'], 'IFC5')],
    ['Ring der Vorgänger', (d) => aendere(d, [...modell, 'vorgaengerId'], V6_MODELL_2)],
    ['Modell ist sein eigener Vorgänger', (d) => aendere(d, [...modell, 'vorgaengerId'], V6_MODELL_1)],
    ['Vorgänger gibt es nicht', (d) => aendere(d, [...modell, 'vorgaengerId'], 'gibt-es-nicht')],
    ['Bauteilzuordnung leer', (d) => aendere(d, [...lvKnoten, positionMitBauteilen(d), 'bauteile'], [])],
    [
      'Mengenart leer',
      (d) => aendere(d, [...lvKnoten, positionMitBauteilen(d), 'bauteile', 0, 'mengenart'], ''),
    ],
    ['Bauteilzuordnung an einem Titel', (d) => aendere(d, [...lvKnoten, 0, 'bauteile'], V6_ZUORDNUNGEN)],
    ['Wochentag 8', (d) => aendere(d, [...plan, 'kalender', 'arbeitstage'], [1, 8])],
    ['Bundesland XX', (d) => aendere(d, [...plan, 'kalender', 'bundesland'], 'XX')],
    ['Anordnung unbekannt', (d) => aendere(d, [...plan, 'vorgaenge', 2, 'vorgaenger', 0, 'art'], 'folge')],
    ['Abstand 1,5', (d) => aendere(d, [...plan, 'vorgaenge', 2, 'vorgaenger', 0, 'abstand'], 1.5)],
    [
      'Vorgang doppelt',
      (d) =>
        aendere(
          d,
          [...plan, 'vorgaenge', 1, 'id'],
          (JSON.parse(d) as { bauzeitenplaene: { bauzeitenplan: { vorgaenge: { id: string }[] } }[] })
            .bauzeitenplaene[0]?.bauzeitenplan.vorgaenge[0]?.id,
        ),
    ],
    [
      'Ist mit drei null',
      (d) => aendere(d, [...plan, 'vorgaenge', 1, 'ist'], { beginn: null, ende: null, fortschritt: null }),
    ],
    [
      'Vorgangsbezug mit leerer Liste',
      (d) => aendere(d, [...plan, 'vorgaenge', 1, 'bezug', 'knotenIds'], []),
    ],
    ['Vorgangsnummer leer', (d) => aendere(d, [...plan, 'vorgaenge', 0, 'nummer'], '')],
    ['Honorarzone VI', (d) => aendere(d, [...honorar, 'objekte', 0, 'honorarzone'], 'VI')],
    ['Leistungsphase 10', (d) => aendere(d, [...honorar, 'objekte', 0, 'leistungsphasen', 0, 'nummer'], 10)],
    [
      'Leistungsphasen nicht aufsteigend',
      (d) => aendere(d, [...honorar, 'objekte', 0, 'leistungsphasen', 0, 'nummer'], 3),
    ],
    [
      'anrechenbare Kosten unbekannter Art',
      (d) => aendere(d, [...honorar, 'objekte', 0, 'anrechenbareKosten', 'art'], 'din-276'),
    ],
    [
      'Kostenermittlung, die es nicht gibt',
      (d) => aendere(d, [...honorar, 'objekte', 0, 'anrechenbareKosten', 'kostenermittlungId'], 'x'),
    ],
    [
      'Nebenkosten unbekannter Art',
      (d) => aendere(d, [...honorar, 'nebenkosten'], { art: 'pauschal', betrag: '1.00' }),
    ],
    ['Mangelnummer 0', (d) => aendere(d, [...mangel, 'nummer'], 0)],
    ['Mangelnummer doppelt', (d) => aendere(d, [...mangel, 'nummer'], 2)],
    ['Mangelstatus unbekannt', (d) => aendere(d, [...mangel, 'verlauf', 0, 'status'], 'erledigt')],
    ['Mangel ohne Verlauf', (d) => aendere(d, [...mangel, 'verlauf'], [])],
    [
      'Frist an einem Verlaufseintrag offen (D-66)',
      (d) => aendere(d, [...mangel, 'verlauf', 0, 'frist'], '2026-12-04'),
    ],
    ['Frist eines Verlaufseintrags null (D-66)', (d) => aendere(d, [...mangel, 'verlauf', 1, 'frist'], null)],
    ['Mangelbeschreibung leer', (d) => aendere(d, [...mangel, 'beschreibung'], '')],
    ['Mangel an einem fremden Auftrags-LV', (d) => aendere(d, [...mangel, 'auftragsLvId'], 'fremd')],
    [
      'Mangel an einem fremden Modell',
      (d) => aendere(d, [...mangel, 'bauteil', 'bauwerksmodellId'], 'fremd'),
    ],
    ['Mangel mit Position ohne Auftrags-LV', (d) => aendere(d, ['maengel', 1, 'mangel', 'positionId'], 'p')],
    [
      'Bautagebuch mit doppeltem Datum',
      (d) => aendere(d, ['bautagebuch', 1, 'bautagebucheintrag', 'datum'], '2026-11-23'),
    ],
    ['Temperatur 1,5', (d) => aendere(d, [...tag, 'wetter', 'temperaturMin'], 1.5)],
    [
      'Firma doppelt',
      (d) => aendere(d, [...tag, 'arbeitskraefte', 1, 'firma'], 'Muster Bau GmbH (erfunden)'),
    ],
    ['Leistungen leer', (d) => aendere(d, [...tag, 'leistungen'], '')],
    [
      'Massenbefehl mit Struktur im Kopf',
      (d) =>
        aendere(
          d,
          [
            'protokoll',
            (JSON.parse(d) as Projektdatei).protokoll.findIndex(
              (e) => e.befehl.art === 'Befehlskurzfassung' && e.befehl.kopf.art === 'BauwerksmodellAnlegen',
            ),
            'befehl',
            'kopf',
            'bauwerksmodell',
            'struktur',
          ],
          [],
        ),
    ],
    ['Daten eines fremden Projekts', (d) => aendere(d, [...tag, 'projektId'], 'fremd')],
  ])('%s', async (_name, aenderung) => {
    const text = aenderung(inhalt);
    const { kern, db } = await neuerKern();
    expect(await kern.projektdateiImportieren(text)).toMatchObject(ungueltig);
    expect(db.zeilen('SELECT COUNT(*) AS n FROM projekt')[0]?.['n']).toBe(0);
    expect(db.zeilen('SELECT COUNT(*) AS n FROM modelldatei')[0]?.['n']).toBe(0);
  });

  it('eine Datei der Version 5 mit den neuen Listen ist ungültig (die gab es dort nicht)', async () => {
    const { kern } = await neuerKern();
    expect(await kern.projektdateiImportieren(aendere(inhalt, ['schemaVersion'], 5))).toMatchObject(
      ungueltig,
    );
  });
});

describe('Grenze des Exports (D-51, datei-zu-gross)', () => {
  async function kernMitGrenze(grenze: number): Promise<SpeicherKern> {
    const db = await neueDatenbank();
    const r = SpeicherKern.oeffnen(db, MIGRATIONEN, { grenzeZeichen: grenze });
    if (!r.ok) throw new Error(r.fehler.meldung);
    wert(await r.wert.projektdateiImportieren(inhalt));
    return r.wert;
  }

  it('übersteigen schon die Modelldateien die Grenze: datei-zu-gross, es entsteht keine (gekürzte) Datei', async () => {
    const kern = await kernMitGrenze(100);
    expect(kern.projektdateiExportieren(V2_PROJEKT)).toMatchObject({
      ok: false,
      fehler: { code: 'datei-zu-gross' },
    });
  });

  it('übersteigt erst der ganze Text die Grenze: ebenso datei-zu-gross; knapp darüber geht es', async () => {
    const kern = await kernMitGrenze(inhalt.length - 1);
    expect(kern.projektdateiExportieren(V2_PROJEKT)).toMatchObject({
      ok: false,
      fehler: { code: 'datei-zu-gross' },
    });
    const genau = await kernMitGrenze(inhalt.length);
    expect(wert(genau.projektdateiExportieren(V2_PROJEKT))).toBe(inhalt);
  });

  it('ein Projekt ohne Modelle ist von den Bytes anderer Projekte nicht betroffen', async () => {
    const kern = await kernMitGrenze(2000);
    const p = {
      id: 'projekt-ohne-modell' as ProjektId,
      name: 'Ohne Modell',
      bauherr: { name: 'B', anschrift: null },
      bieter: [],
    };
    wert(
      await kern.anwenden(
        eintrag(
          9001,
          p.id,
          { art: 'projekt', id: p.id },
          { art: 'ProjektAnlegen', id: p.id, name: p.name, bauherr: p.bauherr },
        ),
        { art: 'projekt', projektId: p.id, projekt: { vorher: null, nachher: p } },
      ),
    );
    expect(kern.projektdateiExportieren(p.id).ok).toBe(true);
    expect(kern.projektdateiExportieren(V2_PROJEKT)).toMatchObject({
      ok: false,
      fehler: { code: 'datei-zu-gross' },
    });
  });
});
