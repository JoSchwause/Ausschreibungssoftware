// SPDX-License-Identifier: AGPL-3.0-or-later
// Langtext ab v1.1b (F6, E-10): Position und Hinweistext nehmen jeden Langtext des Vertrags an; die Projektdatei liest
// dieselben Bausteine streng und schreibt sie kanonisch.

import type { Hinweistext, Knoten, Langtext, LvChangeSet, Position, Protokolleintrag } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { anlegenSchritte, eintrag, ladeFixture } from './testhilfe/fixtures';
import { neuerKern, speichere, wert } from './testhilfe/node';
import { knotenZuBindung } from './zeilen';
import { LEERES_SUMMENVORHER } from './summenvorher';

const typisch = ladeFixture('typisch');
const projektId = typisch.projekt.id;
const lvId = typisch.lv.leistungsverzeichnis.id;

const bild = { id: 'bild-1' as never, medientyp: 'image/png', daten: 'iVBORw0KGgo=' };

/** Jeder Baustein des Vertrags einmal, auch verschachtelt: Absatz mit Auszeichnung, Liste, Tabelle, Textergänzung. */
const reich: Langtext = [
  {
    art: 'absatz',
    inhalt: [
      { art: 'text', text: 'Fett ', fett: true },
      { art: 'text', text: 'kursiv und unterstrichen', kursiv: true, unterstrichen: true },
      { art: 'umbruch' },
      { art: 'text', text: 'zweite Zeile' },
      { art: 'bild', bild },
    ],
  },
  {
    art: 'liste',
    geordnet: true,
    punkte: [
      [{ art: 'text', text: 'erster Punkt' }],
      [
        { art: 'absatz', inhalt: [{ art: 'text', text: 'zweiter Punkt', fett: true }] },
        { art: 'liste', geordnet: false, punkte: [[{ art: 'text', text: 'eingerückt' }]] },
      ],
    ],
  },
  {
    art: 'tabelle',
    zeilen: [
      { zellen: [{ spalten: 2, inhalt: [{ art: 'text', text: 'Kopf über zwei Spalten', fett: true }] }] },
      {
        zellen: [
          { spalten: 1, inhalt: [{ art: 'text', text: 'links' }] },
          { spalten: 1, inhalt: [{ art: 'absatz', inhalt: [{ art: 'umbruch' }] }] },
        ],
      },
    ],
  },
  {
    art: 'ergaenzung',
    herkunft: 'bieter',
    kennung: '01',
    leer: false,
    davor: [{ art: 'text', text: 'Fabrikat: ' }],
    inhalt: [{ art: 'text', text: 'Muster', kursiv: true }, { art: 'umbruch' }],
    danach: [],
  },
  {
    art: 'ergaenzung',
    herkunft: 'ausschreibender',
    kennung: 'A',
    leer: true,
    davor: [],
    inhalt: [],
    danach: [],
  },
  { art: 'text', text: 'Schluss ohne Absatz' },
];

const knoten = typisch.lv.leistungsverzeichnis.knoten;
const position = knoten.find((k): k is Position => k.art === 'position') ?? never();
const hinweis = knoten.find((k): k is Hinweistext => k.art === 'hinweis') ?? never();

let nr = 700;
const lvEintrag = (): Protokolleintrag =>
  eintrag(
    nr++,
    projektId,
    { art: 'leistungsverzeichnis', id: lvId },
    { art: 'LangtextAendern', positionId: position.id, langtext: reich },
  );

function aendern(paare: readonly [Knoten, Knoten][]): LvChangeSet {
  return {
    art: 'leistungsverzeichnis',
    leistungsverzeichnisId: lvId,
    kopf: null,
    knoten: {
      hinzugefuegt: [],
      geaendert: paare.map(([vorher, nachher]) => ({ vorher, nachher })),
      entfernt: [],
    },
    summen: { positionen: [], gliederungen: [], gesamt: null, vorher: LEERES_SUMMENVORHER },
  };
}

describe('Langtext speichern, laden, exportieren, importieren (v1.1b)', () => {
  it('Position und Hinweistext: jeder Baustein kommt unverändert zurück, die Datei bleibt byte-stabil', async () => {
    const { kern } = await neuerKern();
    await speichere(kern, anlegenSchritte(typisch));
    const p2: Position = { ...position, langtext: reich };
    const h2: Hinweistext = { ...hinweis, text: reich };
    wert(
      await kern.anwenden(
        lvEintrag(),
        aendern([
          [position, p2],
          [hinweis, h2],
        ]),
      ),
    );
    const finde = (ks: readonly Knoten[], id: string): Knoten | undefined => ks.find((k) => k.id === id);
    const geladen = wert(kern.lvLaden(lvId));
    expect(finde(geladen.leistungsverzeichnis.knoten, position.id)).toEqual(p2);
    expect(finde(geladen.leistungsverzeichnis.knoten, hinweis.id)).toEqual(h2);

    const text1 = wert(kern.projektdateiExportieren(projektId));
    const { kern: b } = await neuerKern();
    wert(await b.projektdateiImportieren(text1));
    const importiert = wert(b.lvLaden(lvId));
    expect(importiert).toEqual(geladen);
    expect(wert(b.projektdateiExportieren(projektId)) === text1).toBe(true);
  });

  it('beim Schreiben einer Zeile wird kein Langtext mehr abgewiesen', () => {
    expect(() => knotenZuBindung(lvId, { ...hinweis, text: reich })).not.toThrow();
    expect(() => knotenZuBindung(lvId, { ...position, langtext: reich })).not.toThrow();
  });
});

describe('Projektdatei-Dekoder liest Langtext streng (datei-ungueltig mit Pfad)', () => {
  async function exportMitReich(): Promise<{ text: string; index: number }> {
    const { kern } = await neuerKern();
    await speichere(kern, anlegenSchritte(typisch));
    wert(await kern.anwenden(lvEintrag(), aendern([[position, { ...position, langtext: reich }]])));
    const text = wert(kern.projektdateiExportieren(projektId));
    const d = JSON.parse(text) as {
      leistungsverzeichnisse: { leistungsverzeichnis: { knoten: { id: string }[] } }[];
    };
    const index = d.leistungsverzeichnisse[0]?.leistungsverzeichnis.knoten.findIndex(
      (k) => k.id === position.id,
    );
    return { text, index: index ?? -1 };
  }

  type Aenderer = (lt: unknown[]) => void;
  const tabelle = (lt: unknown[]): { zeilen: { zellen: { spalten: unknown; inhalt: unknown[] }[] }[] } =>
    lt[2] as never;
  const ergaenzung = (lt: unknown[]): Record<string, unknown> => lt[3] as never;

  const faelle: [string, Aenderer, string][] = [
    [
      'unbekannte Art',
      (lt) => {
        lt.push({ art: 'formel', text: 'x' });
      },
      '.langtext[6].art',
    ],
    [
      'fett: false statt fehlend',
      (lt) => {
        lt[5] = { art: 'text', text: 'x', fett: false };
      },
      '.langtext[5].fett',
    ],
    [
      'fremdes Feld am Textlauf',
      (lt) => {
        lt[5] = { art: 'text', text: 'x', farbe: 'rot' };
      },
      '.langtext[5]',
    ],
    [
      'fehlendes Feld an der Liste',
      (lt) => {
        Reflect.deleteProperty(lt[1] as object, 'geordnet');
      },
      '.langtext[1]',
    ],
    [
      'spalten 0',
      (lt) => {
        const z = tabelle(lt).zeilen[0]?.zellen[0];
        if (z !== undefined) z.spalten = 0;
      },
      '.langtext[2].zeilen[0].zellen[0].spalten',
    ],
    [
      'Textergänzung in einer Zelle',
      (lt) => {
        tabelle(lt).zeilen[1]?.zellen[0]?.inhalt.push(ergaenzung(lt));
      },
      '.langtext[2].zeilen[1].zellen[0].inhalt[1]',
    ],
    [
      'Textergänzung in einem Absatz',
      (lt) => {
        (lt[0] as { inhalt: unknown[] }).inhalt.push(ergaenzung(lt));
      },
      '.langtext[0].inhalt[5]',
    ],
    [
      'Textergänzung in einem Listenpunkt',
      (lt) => {
        (lt[1] as { punkte: unknown[][] }).punkte[0]?.push(ergaenzung(lt));
      },
      '.langtext[1].punkte[0][1]',
    ],
    [
      'Bild in einer Textergänzung',
      (lt) => {
        (ergaenzung(lt)['inhalt'] as unknown[]).push({ art: 'bild', bild });
      },
      '.langtext[3].inhalt[2]',
    ],
    [
      'Absatz im Absatz',
      (lt) => {
        (lt[0] as { inhalt: unknown[] }).inhalt.push({ art: 'absatz', inhalt: [] });
      },
      '.langtext[0].inhalt[5]',
    ],
    [
      'unbekannte Herkunft',
      (lt) => {
        ergaenzung(lt)['herkunft'] = 'dritter';
      },
      '.langtext[3].herkunft',
    ],
  ];

  it.each(faelle)('%s', async (_name, aendere, pfad) => {
    const { text, index } = await exportMitReich();
    const d = JSON.parse(text) as {
      leistungsverzeichnisse: { leistungsverzeichnis: { knoten: { langtext: unknown[] }[] } }[];
    };
    const k = d.leistungsverzeichnisse[0]?.leistungsverzeichnis.knoten[index] ?? never();
    aendere(k.langtext);
    const { kern } = await neuerKern();
    const r = await kern.projektdateiImportieren(JSON.stringify(d));
    expect(r).toMatchObject({ ok: false, fehler: { code: 'datei-ungueltig' } });
    expect(!r.ok && r.fehler.meldung).toContain(
      `$.leistungsverzeichnisse[0].leistungsverzeichnis.knoten[${String(index)}]${pfad}`,
    );
    expect(wert(kern.projekteAuflisten())).toEqual([]);
  });
});

function never(): never {
  throw new Error('Testdaten unvollständig');
}
