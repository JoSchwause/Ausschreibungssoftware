// SPDX-License-Identifier: AGPL-3.0-or-later
// Eingefrorene Projektdatei der Schemaversion 2 (Ticket 38, Punkt 3; A8): Export-Golden, Rundlauf und Abdeckung aller
// Neuerungen. Die Datei wird nie geändert und nie neu erzeugt; kommt Version 3, bleibt dieser Test, wie er ist (bis auf
// die Stelle, an der der Export byte-gleich sein muss), und für Version 3 entsteht eine dritte Datei.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Knoten, Position, Projektdatei } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { kanonischesJson } from './kanonisch';
import { SCHEMA_VERSION } from './migrationen';
import { normalisiere } from './testhilfe/fixtures';
import { inhaltV2, V2_ANGEBOT, V2_LV, V2_PROJEKT } from './testhilfe/inhalt-v2';
import { imProtokoll, neuerKern, speichere, wert } from './testhilfe/node';

const pfad = new URL('../fixtures/projektdatei-v2.json', import.meta.url);
const inhalt = readFileSync(pfad, 'utf8');
const SHA256 = '818836030f5f00140487ad9e9914e430ce5af546ef94cc733d9c9ad588dcf0f2';
const v2 = inhaltV2();

describe('eingefrorene Projektdatei der Schemaversion 2', () => {
  it('die Datei ist unverändert (Prüfsumme) und in kanonischer Form', () => {
    expect(createHash('sha256').update(inhalt).digest('hex')).toBe(SHA256);
    expect((JSON.parse(inhalt) as { schemaVersion: number }).schemaVersion).toBe(2);
    expect(kanonischesJson(JSON.parse(inhalt)) === inhalt).toBe(true);
  });

  it('entsteht aus der Befehlsfolge: speichern → exportieren ist byte-gleich (solange Version 2 aktuell ist)', async () => {
    const { kern } = await neuerKern();
    await speichere(kern, v2.schritte);
    const text = wert(kern.projektdateiExportieren(V2_PROJEKT));
    if (SCHEMA_VERSION === 2) expect(text === inhalt).toBe(true);
  });

  it('Import → Export ist byte-gleich (Export-Golden, solange Version 2 aktuell ist); danach stabil', async () => {
    const { kern } = await neuerKern();
    expect(wert(kern.projektdateiImportieren(inhalt))).toBe(V2_PROJEKT);
    const neu = wert(kern.projektdateiExportieren(V2_PROJEKT));
    expect((JSON.parse(neu) as { schemaVersion: number }).schemaVersion).toBe(SCHEMA_VERSION);
    if (SCHEMA_VERSION === 2) expect(neu === inhalt).toBe(true);
    const zweite = await neuerKern();
    wert(zweite.kern.projektdateiImportieren(neu));
    expect(wert(zweite.kern.projektdateiExportieren(V2_PROJEKT)) === neu).toBe(true);
  });

  it('Rundlauf: jede Position und Angebotsposition kommt nach Speichern und Laden unverändert zurück', async () => {
    const { kern } = await neuerKern();
    wert(kern.projektdateiImportieren(inhalt));
    const lv = wert(kern.lvLaden(V2_LV));
    expect(lv).toEqual(normalisiere(v2.lv));
    for (const k of v2.lv.leistungsverzeichnis.knoten)
      expect(lv.leistungsverzeichnis.knoten.find((x) => x.id === k.id)).toEqual(k);
    const angebot = wert(kern.angebotLaden(V2_ANGEBOT));
    expect(angebot).toEqual(normalisiere(v2.angebot));
    for (const a of v2.angebot.angebot.positionen)
      expect(angebot.angebot.positionen.find((x) => x.positionId === a.positionId)).toEqual(a);
    expect(wert(kern.projektLaden(V2_PROJEKT))).toEqual(v2.projekt);
    expect(wert(kern.protokoll(V2_PROJEKT))).toEqual(v2.schritte.map((s) => imProtokoll(s.eintrag)));
  });

  describe('deckt jede Neuerung der Version 2 ab', () => {
    const d = JSON.parse(inhalt) as Projektdatei;
    const lv = d.leistungsverzeichnisse[0]?.leistungsverzeichnis;
    const positionen = (lv?.knoten ?? []).filter((k: Knoten): k is Position => k.art === 'position');
    const langtexte = JSON.stringify([...(lv?.knoten ?? [])]);

    it.each([
      [
        'Bedarf im Stundenlohn',
        () => positionen.some((p) => p.merkmale.bedarf !== null && p.merkmale.stundenlohn),
      ],
      [
        'Wahl mit Gruppe und Variante',
        () => positionen.some((p) => p.merkmale.wahl?.gruppe != null && p.merkmale.wahl.variante != null),
      ],
      ['Pauschal', () => positionen.some((p) => p.merkmale.pauschal)],
      [
        'Bedarf mit und ohne Gesamtbetrag',
        () =>
          ['mit-gesamtbetrag', 'ohne-gesamtbetrag'].every((x) =>
            positionen.some((p) => p.merkmale.bedarf === x),
          ),
      ],
      ['Zuschlagskennzeichen', () => positionen.some((p) => p.merkmale.zuschlagskennzeichen)],
      ...(['positionen', 'gliederung', 'kennzeichnung'] as const).map((art): [string, () => boolean] => [
        `Zuschlag mit Bezug ${art} und Satz`,
        () => positionen.some((p) => p.zuschlag?.bezug.art === art && p.zuschlag.prozentsatz !== null),
      ]),
      [
        'Zuschlag mit Teilmenge',
        () =>
          positionen.some(
            (p) =>
              p.zuschlag?.bezug.art === 'positionen' &&
              p.zuschlag.bezug.positionen.some((b) => b.teilmenge !== null),
          ),
      ],
      [
        'Zuschlag in Altform',
        () =>
          positionen.some(
            (p) => p.zuschlag !== null && p.zuschlag.prozentsatz === null && p.einheitspreis !== null,
          ),
      ],
      [
        'Leitbeschreibung mit Unterbeschreibungen',
        () => positionen.some((p) => (p.leitbeschreibung?.unterbeschreibungen.length ?? 0) > 1),
      ],
      [
        'Auftraggeber und Vergabeinformationen am LV',
        () => lv?.auftraggeber !== undefined && lv.vergabeinformationen !== undefined,
      ],
      [
        'Kopfdaten am Auftrags-LV',
        () => d.auftragsLeistungsverzeichnisse[0]?.auftragsLeistungsverzeichnis.auftraggeber !== undefined,
      ],
      [
        'beide Ausweise in Gesamt- und Gliederungssummen',
        () =>
          [...d.leistungsverzeichnisse, ...d.angebote].every(
            (z) =>
              z.summen.gesamt.summeBedarfOhneGesamtbetrag !== undefined &&
              z.summen.gesamt.summeWahl !== undefined &&
              z.summen.gliederungen.every(
                (g) => g.summeBedarfOhneGesamtbetrag !== undefined && g.summeWahl !== undefined,
              ),
          ),
      ],
      [
        'Angebot mit zuschlagssatz an einer Zuschlagsposition',
        () =>
          d.angebote[0]?.angebot.positionen.some(
            (a) =>
              a.status === 'angeboten' &&
              a.zuschlagssatz !== undefined &&
              positionen.find((p) => p.id === a.positionId)?.zuschlag != null,
          ) === true,
      ],
      ...(
        [
          '"absatz"',
          '"fett"',
          '"kursiv"',
          '"unterstrichen"',
          '"liste"',
          '"tabelle"',
          '"bild"',
          '"ergaenzung"',
          '"umbruch"',
        ] as const
      ).map((art): [string, () => boolean] => [`Langtext mit ${art}`, () => langtexte.includes(art)]),
      [
        'Befehlskurzfassung im Protokoll',
        () => d.protokoll.some((e) => e.befehl.art === 'Befehlskurzfassung'),
      ],
      [
        'vollständiger Befehl im Protokoll',
        () => d.protokoll.some((e) => e.befehl.art === 'ProjektStammdatenSetzen'),
      ],
    ])('%s', (_name, gilt) => {
      expect(gilt()).toBe(true);
    });
  });
});

describe('Prüfung der neuen Felder beim Import: nichts wird halb übernommen (Q5)', () => {
  type Pfad = (string | number)[];
  /** Setzt (oder mit `undefined` löscht) den Wert am Pfad der eingefrorenen Datei und liefert den JSON-Text. */
  const aendere = (pfad: Pfad, w: unknown): string => {
    const d = JSON.parse(inhalt) as Record<string | number, unknown>;
    let eltern = d;
    for (const s of pfad.slice(0, -1)) eltern = eltern[s] as Record<string | number, unknown>;
    const letzter = pfad[pfad.length - 1] as string | number;
    if (w === undefined) Reflect.deleteProperty(eltern, letzter);
    else eltern[letzter] = w;
    return JSON.stringify(d);
  };
  const lv: Pfad = ['leistungsverzeichnisse', 0, 'leistungsverzeichnis'];
  const pos = (i: number): Pfad => [...lv, 'knoten', i];
  const knoten =
    (JSON.parse(inhalt) as Projektdatei).leistungsverzeichnisse[0]?.leistungsverzeichnis.knoten ?? [];
  const platz = (n: number): number =>
    knoten.findIndex((k) => k.id.endsWith(`0000000001${String(n).padStart(2, '0')}`));
  const ap: Pfad = ['angebote', 0, 'angebot', 'positionen'];

  it.each<[string, string]>([
    ['Merkmale fehlen', aendere([...pos(platz(1)), 'merkmale'], undefined)],
    ['Merkmale mit fremdem Feld', aendere([...pos(platz(1)), 'merkmale', 'positionsart'], 'normal')],
    ['alte Positionsart in Version 2', aendere([...pos(platz(1)), 'positionsart'], 'normal')],
    ['unbekannter Bedarf', aendere([...pos(platz(2)), 'merkmale', 'bedarf'], 'immer')],
    ['negative Variante', aendere([...pos(platz(3)), 'merkmale', 'wahl', 'variante'], -1)],
    ['Gruppe als Text', aendere([...pos(platz(3)), 'merkmale', 'wahl', 'gruppe'], '1')],
    ['unbekannte Bezugsform', aendere([...pos(platz(5)), 'zuschlag', 'bezug', 'art'], 'alles')],
    ['Bezugsform Gliederung mit Liste', aendere([...pos(platz(5)), 'zuschlag', 'bezug', 'positionen'], [])],
    [
      'Teilmenge mit falschen Stellen',
      aendere([...pos(platz(6)), 'zuschlag', 'bezug', 'positionen', 0, 'teilmenge'], '4.0'),
    ],
    ['Satz mit falschen Stellen', aendere([...pos(platz(6)), 'zuschlag', 'prozentsatz'], '10.0')],
    [
      'Unterbeschreibung ohne Nummer',
      aendere([...pos(platz(7)), 'leitbeschreibung', 'unterbeschreibungen', 0, 'nummer'], undefined),
    ],
    ['Leitbeschreibung null', aendere([...pos(platz(7)), 'leitbeschreibung'], null)],
    ['Auftraggeber mit fremdem Feld', aendere([...lv, 'auftraggeber', 'telefon'], '0')],
    ['Gewährleistung als Bruch', aendere([...lv, 'vergabeinformationen', 'gewaehrleistung', 'dauer'], 1.5)],
    ['Ausweis als Zahl', aendere(['leistungsverzeichnisse', 0, 'summen', 'gesamt', 'summeWahl'], 150)],
    [
      'Ausweis mit falschen Stellen',
      aendere(['leistungsverzeichnisse', 0, 'summen', 'gliederungen', 0, 'summeWahl'], '150.0'),
    ],
    ['Zuschlagssatz als Zahl', aendere([...ap, 4, 'zuschlagssatz'], 4)],
    ['Zuschlagssatz bei nicht angeboten', aendere([...ap, 1, 'zuschlagssatz'], '4.00')],
    ['losStufe als Text', aendere([...lv, 'ozMaske', 'losStufe'], 'ja')],
  ])('%s: datei-ungueltig', async (_name, text) => {
    const { kern, db } = await neuerKern();
    expect(kern.projektdateiImportieren(text)).toMatchObject({
      ok: false,
      fehler: { code: 'datei-ungueltig' },
    });
    expect(db.zeilen('SELECT COUNT(*) AS n FROM projekt')[0]?.['n']).toBe(0);
  });
});
