// SPDX-License-Identifier: AGPL-3.0-or-later
// Projektdatei (G-56, A8): kanonisches JSON, Export → Import → Export, eingefrorene Datei der Schemaversion 1,
// strenge Prüfung und Dateimigrationen.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { ProjektId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { kanonischesJson } from './kanonisch';
import type { Migration } from './migrationen';
import { SCHEMA_VERSION } from './migrationen';
import { leseProjektdatei } from './projektdatei';
import { anlegenSchritte, ladeFixture, normalisiere } from './testhilfe/fixtures';
import { neuerKern, speichere, wert, zaehle } from './testhilfe/node';

describe('kanonisches JSON', () => {
  it('sortiert Schlüssel rekursiv, behält die Arrayreihenfolge und hängt einen Zeilenumbruch an', () => {
    expect(kanonischesJson({ b: 1, a: { d: [3, 1, 2], c: null } })).toBe(
      '{\n  "a": {\n    "c": null,\n    "d": [\n      3,\n      1,\n      2\n    ]\n  },\n  "b": 1\n}\n',
    );
  });

  it('lehnt Gleitkommazahlen ab (Geld steht als Zeichenkette, N1)', () => {
    expect(() => kanonischesJson({ betrag: 12.5 })).toThrow(/ganze Zahlen/);
    expect(() => kanonischesJson({ x: Number.NaN })).toThrow();
  });

  it('behandelt „__proto__“ als gewöhnlichen Schlüssel', () => {
    const wert = JSON.parse('{"__proto__": {"x": 1}, "a": 2}') as unknown;
    expect(kanonischesJson(wert)).toContain('"__proto__"');
  });
});

describe.each(['winzig', 'typisch', 'gross'] as const)('Export → Import → Export (%s)', (name) => {
  const f = ladeFixture(name);

  it('ist byte-identisch, in kanonischer Form und lädt denselben Zustand', async () => {
    const a = await neuerKern();
    speichere(a.kern, anlegenSchritte(f));
    const text1 = wert(a.kern.projektdateiExportieren(f.projekt.id));
    expect(text1.endsWith('\n')).toBe(true);
    expect(kanonischesJson(JSON.parse(text1))).toBe(text1);
    expect((JSON.parse(text1) as { schemaVersion: number }).schemaVersion).toBe(SCHEMA_VERSION);

    const b = await neuerKern();
    expect(wert(b.kern.projektdateiImportieren(text1))).toBe(f.projekt.id);
    const text2 = wert(b.kern.projektdateiExportieren(f.projekt.id));
    expect(text2 === text1).toBe(true); // `toBe` auf große Texte würde bei Abweichung riesige Diffs drucken
    expect(wert(b.kern.lvLaden(f.lv.leistungsverzeichnis.id))).toEqual(normalisiere(f.lv));
    for (const x of f.angebote) expect(wert(b.kern.angebotLaden(x.angebot.id))).toEqual(normalisiere(x));
    expect(wert(b.kern.protokoll(f.projekt.id))).toEqual(anlegenSchritte(f).map((s) => s.eintrag));
  });

  it('überschreibt kein vorhandenes Projekt (Q5)', async () => {
    const { kern, db } = await neuerKern();
    speichere(kern, anlegenSchritte(f));
    const text = wert(kern.projektdateiExportieren(f.projekt.id));
    const vorher = zaehle(db, 'knoten');
    const r = kern.projektdateiImportieren(text);
    expect(r).toMatchObject({ ok: false, fehler: { code: 'unbekannt' } });
    expect(!r.ok && r.fehler.meldung).toContain('existiert bereits');
    expect(zaehle(db, 'knoten')).toBe(vorher);
    expect(wert(kern.projekteAuflisten())).toHaveLength(1);
  });
});

describe('eingefrorene Projektdatei der Schemaversion 1', () => {
  // Diese Datei wird NIE geändert und nie neu erzeugt. Sie hält fest, dass jede spätere Programmversion eine Datei
  // der Version 1 öffnet (A8). Kommt Version 2, bleibt dieser Test unverändert; für Version 2 entsteht eine
  // zweite eingefrorene Datei samt eigenem Test nach demselben Muster.
  const pfad = new URL('../fixtures/projektdatei-v1.json', import.meta.url);
  const inhalt = readFileSync(pfad, 'utf8');
  const SHA256 = '37b58b1c502f8cfcf8bbc49b973b70057ed89044103458c8b3d89b4448e8d122';

  it('die Datei ist unverändert (Prüfsumme)', () => {
    expect(createHash('sha256').update(inhalt).digest('hex')).toBe(SHA256);
    expect((JSON.parse(inhalt) as { schemaVersion: number }).schemaVersion).toBe(1);
  });

  it('wird vom aktuellen Stand geöffnet; Inhalt und Fachwerte stimmen', async () => {
    const { kern, db } = await neuerKern();
    const id = wert(kern.projektdateiImportieren(inhalt));
    expect(id).toBe('projekt-winzig');
    expect(wert(kern.projektLaden(id))).toEqual({
      id: 'projekt-winzig',
      name: 'Eingefroren v1',
      bauherr: { name: 'Bauherr (erfunden)', anschrift: null },
      bieter: [{ id: 'bieter-1', name: 'Musterbau GmbH (erfunden)' }],
    });
    const lv = wert(kern.lvLaden('019b76da-a800-727e-984b-1b9791bc2486' as never));
    expect(lv.leistungsverzeichnis.name).toBe('Winzig: Handrechnung (erfunden)');
    expect(lv.leistungsverzeichnis.knoten).toHaveLength(5); // Titel, drei Positionen, Hinweistext
    expect(lv.summen.gesamt).toEqual({
      netto: '2565.00',
      nachlass: '0.00',
      nettoNachNachlass: '2565.00',
      mwst: '487.35',
      brutto: '3052.35',
    });
    const mitEpa = lv.leistungsverzeichnis.knoten.find((k) => k.art === 'position' && k.epa !== null);
    expect(mitEpa).toMatchObject({
      ozIndex: 'a',
      menge: '1.235',
      einheitspreis: '10.000',
      epa: { lohn: '6.000', stoffe: '4.000' },
    });
    expect(mitEpa?.art === 'position' && mitEpa.langtext[1]).toMatchObject({
      art: 'bild',
      bild: { medientyp: 'image/png' },
    });
    const angebot = wert(kern.angebotLaden('angebot-1' as never));
    expect(angebot.angebot.positionen.map((p) => p.status)).toEqual([
      'angeboten',
      'nicht-angeboten',
      'angeboten',
    ]);
    expect(angebot.summen.gesamt.brutto).toBe('2899.29');
    expect(wert(kern.protokoll(id))).toHaveLength(3);
    expect(zaehle(db, 'auftrags_lv')).toBe(1);
    expect(zaehle(db, 'knoten')).toBe(10); // LV (5) + Auftrags-LV (5)
  });

  it('exportiert im aktuellen Format; in Version 1 ist der Export byte-gleich der eingefrorenen Datei', async () => {
    const { kern } = await neuerKern();
    const id = wert(kern.projektdateiImportieren(inhalt));
    const neu = wert(kern.projektdateiExportieren(id));
    expect((JSON.parse(neu) as { schemaVersion: number }).schemaVersion).toBe(SCHEMA_VERSION);
    if (SCHEMA_VERSION === 1) expect(neu === inhalt).toBe(true);
    // Der Export lässt sich wieder importieren und ist dann stabil.
    const zweite = await neuerKern();
    wert(zweite.kern.projektdateiImportieren(neu));
    expect(wert(zweite.kern.projektdateiExportieren(id)) === neu).toBe(true);
  });
});

describe('Prüfung beim Import: nichts wird halb übernommen (Q5)', () => {
  const original = readFileSync(new URL('../fixtures/projektdatei-v1.json', import.meta.url), 'utf8');
  type Pfad = (string | number)[];
  const stelle = (d: unknown, pfad: Pfad): Record<string | number, unknown> => {
    let aktuell = d as Record<string | number, unknown>;
    for (const schritt of pfad) aktuell = aktuell[schritt] as Record<string | number, unknown>;
    return aktuell;
  };
  /** Setzt (oder mit `undefined` löscht) den Wert am Pfad der geparsten Originaldatei und liefert den JSON-Text. */
  const aendere = (pfad: Pfad, wert: unknown): string => {
    const d = JSON.parse(original) as unknown;
    const letzter = pfad[pfad.length - 1] as string | number;
    const eltern = stelle(d, pfad.slice(0, -1));
    if (wert === undefined) Reflect.deleteProperty(eltern, letzter);
    else eltern[letzter] = wert;
    return JSON.stringify(d);
  };
  const lv = ['leistungsverzeichnisse', 0, 'leistungsverzeichnis'] as const;
  const knoten = (i: number, feld: string): Pfad => [...lv, 'knoten', i, feld];
  const idVon = (i: number): unknown => stelle(JSON.parse(original), [...lv, 'knoten', i])['id'];

  const faelle: [string, string, string][] = [
    ['kein JSON', '{ nicht json', 'datei-ungueltig'],
    ['kein Objekt', '[1, 2]', 'datei-ungueltig'],
    ['ohne Schemaversion', aendere(['schemaVersion'], undefined), 'datei-ungueltig'],
    ['Schemaversion als Text', aendere(['schemaVersion'], '1'), 'datei-ungueltig'],
    ['Schemaversion 0', aendere(['schemaVersion'], 0), 'datei-ungueltig'],
    ['Schemaversion 1,5', aendere(['schemaVersion'], 1.5), 'datei-ungueltig'],
    ['neuere Schemaversion', aendere(['schemaVersion'], SCHEMA_VERSION + 1), 'schema-zu-neu'],
    ['unbekanntes Feld', aendere(['projekt', 'extra'], 1), 'datei-ungueltig'],
    ['fehlendes Feld', aendere(['projekt', 'name'], undefined), 'datei-ungueltig'],
    ['Dezimalkomma', aendere(knoten(1, 'menge'), '1,235'), 'datei-ungueltig'],
    ['falsche Nachkommastellen', aendere(knoten(1, 'menge'), '1.23'), 'datei-ungueltig'],
    ['Geld als Zahl', aendere(knoten(1, 'einheitspreis'), 10), 'datei-ungueltig'],
    [
      'negative Null',
      aendere(['leistungsverzeichnisse', 0, 'summen', 'gesamt', 'nachlass'], '-0.00'),
      'datei-ungueltig',
    ],
    ['unbekannte Knotenart', aendere(knoten(0, 'art'), 'ordner'), 'datei-ungueltig'],
    ['unbekannte Positionsart', aendere(knoten(1, 'positionsart'), 'sonder'), 'datei-ungueltig'],
    [
      'unbekannter Befehl im Protokoll',
      aendere(['protokoll', 0, 'befehl', 'art'], 'Zaubern'),
      'datei-ungueltig',
    ],
    ['Gleitkommazahl im Befehl', aendere(['protokoll', 0, 'befehl', 'x'], 0.5), 'datei-ungueltig'],
    ['Daten eines fremden Projekts', aendere(['protokoll', 0, 'projektId'], 'fremd'), 'datei-ungueltig'],
    ['Knoten ohne Elternknoten', aendere(knoten(1, 'elternId'), 'gibt-es-nicht'), 'datei-ungueltig'],
    ['Lücke in der Reihenfolge', aendere(knoten(1, 'reihenfolge'), 7), 'datei-ungueltig'],
    ['doppelte Knotenkennung', aendere(knoten(2, 'id'), idVon(1)), 'datei-ungueltig'],
    [
      'Angebot mit unbekanntem Bieter',
      aendere(['angebote', 0, 'angebot', 'bieterId'], 'niemand'),
      'datei-ungueltig',
    ],
    [
      'Angebot auf unbekannte Position',
      aendere(['angebote', 0, 'angebot', 'positionen', 0, 'positionId'], 'nix'),
      'datei-ungueltig',
    ],
  ];

  it.each(faelle)('%s', async (_name, text, code) => {
    const { kern, db } = await neuerKern();
    const r = kern.projektdateiImportieren(text);
    expect(r).toMatchObject({ ok: false, fehler: { code } });
    for (const t of [
      'projekt',
      'bieter',
      'leistungsverzeichnis',
      'knoten',
      'angebot',
      'angebotsposition',
      'auftrags_lv',
      'protokoll',
      'summe_position',
      'summe_gesamt',
    ]) {
      expect(zaehle(db, t), t).toBe(0);
    }
  });
});

describe('Dateimigrationen (Mechanismus, mit künstlichen Versionen 2 und 3)', () => {
  const original = readFileSync(new URL('../fixtures/projektdatei-v1.json', import.meta.url), 'utf8');
  const aufgerufen: number[] = [];
  const v1: Migration = { version: 1, name: 'eins', hoch: () => undefined, datei: null };
  const stufe = (
    version: number,
    f?: (r: Record<string, unknown>) => Record<string, unknown>,
  ): Migration => ({
    version,
    name: `stufe ${String(version)}`,
    hoch: () => undefined,
    datei: (roh) => {
      aufgerufen.push(version);
      return f?.(roh) ?? roh;
    },
  });

  it('hebt eine Datei Version für Version auf die aktuelle und setzt die Schemaversion', () => {
    aufgerufen.length = 0;
    const r = leseProjektdatei(original, [v1, stufe(2), stufe(3)]);
    expect(r).toMatchObject({ ok: true, wert: { schemaVersion: 3 } });
    expect(aufgerufen).toEqual([2, 3]);
    aufgerufen.length = 0;
    const schonZwei = original.replace('"schemaVersion": 1', '"schemaVersion": 2');
    expect(leseProjektdatei(schonZwei, [v1, stufe(2), stufe(3)]).ok).toBe(true);
    expect(aufgerufen).toEqual([3]);
  });

  it('eine Migration darf den Inhalt umformen; das Ergebnis wird streng gegen die aktuelle Form geprüft', () => {
    const r = leseProjektdatei(original, [
      v1,
      stufe(2, (roh) => ({ ...roh, projekt: { ...(roh['projekt'] as object), name: 'Hochgestuft' } })),
    ]);
    expect(r).toMatchObject({ ok: true, wert: { projekt: { name: 'Hochgestuft' } } });
    const kaputt = leseProjektdatei(original, [v1, stufe(2, (roh) => ({ ...roh, zusatz: true }))]);
    expect(kaputt).toMatchObject({ ok: false, fehler: { code: 'datei-ungueltig' } });
  });

  it('eine fehlschlagende Dateimigration ergibt migration-fehlgeschlagen', () => {
    const r = leseProjektdatei(original, [
      v1,
      stufe(2, () => {
        throw new Error('nein');
      }),
    ]);
    expect(r).toMatchObject({ ok: false, fehler: { code: 'migration-fehlgeschlagen' } });
  });

  it('eine Datei neuer als die bekannte Reihe ergibt schema-zu-neu', () => {
    const r = leseProjektdatei(original.replace('"schemaVersion": 1', '"schemaVersion": 5'), [v1, stufe(2)]);
    expect(r).toMatchObject({ ok: false, fehler: { code: 'schema-zu-neu' } });
  });
});

describe('Projekt-Kennung', () => {
  it('der Import liefert die Kennung des Projekts der Datei', async () => {
    const f = ladeFixture('winzig');
    const a = await neuerKern();
    speichere(a.kern, anlegenSchritte(f));
    const b = await neuerKern();
    const id: ProjektId = wert(
      b.kern.projektdateiImportieren(wert(a.kern.projektdateiExportieren(f.projekt.id))),
    );
    expect(id).toBe(f.projekt.id);
  });
});
