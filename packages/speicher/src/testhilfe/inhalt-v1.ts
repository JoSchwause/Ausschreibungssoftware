// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests unter Node (Vitest, Playwright-Seite Node): ein Projekt, das jede Positionsart der Schemaversion 1
// enthält, als Projektdatei im aktuellen Modell. Grundlage ist das Fixture `typisch` (normal, Bedarf ohne Gesamtbetrag,
// Wahl mit Grundposition, Zuschlag mit Bezug); dazu kommen Bedarf mit Gesamtbetrag, Wahl ohne Grundposition, Zuschlag
// ohne Bezug, Stundenlohn und eine Pauschalposition mit Index und EPA, außerdem ein Auftrags-LV.

import type {
  Einheitspreis,
  Knoten,
  Position,
  PositionId,
  Positionsmerkmale,
  Projektdatei,
  Zuschlag,
} from '@tethys/vertrag';
import { anlegenSchritte, auftragsLvAus, eintrag, ladeFixture } from './fixtures';

const OHNE: Positionsmerkmale = {
  bedarf: null,
  wahl: null,
  stundenlohn: false,
  pauschal: false,
  zuschlagskennzeichen: false,
};

/** Jede Positionsart der Version 1 (siehe Kopf); `schemaVersion` ist die aktuelle Form des Modells. */
export function inhaltMitAllenAltenArten(schemaVersion: number): Projektdatei {
  const f = ladeFixture('typisch');
  const lv = f.lv.leistungsverzeichnis;
  const vorlage = lv.knoten.find(
    (k): k is Position => k.art === 'position' && k.zuschlag === null && k.merkmale.wahl === null,
  );
  if (vorlage === undefined) throw new Error('typisch hat keine Normalposition');
  let n = lv.knoten.filter((k) => k.elternId === vorlage.elternId).length;
  const neu = (
    id: string,
    merkmale: Partial<Positionsmerkmale>,
    zuschlag: Zuschlag | null = null,
    mehr: Partial<Position> = {},
  ): Position => ({
    ...vorlage,
    id: id as PositionId,
    reihenfolge: n++,
    ordnungszahl: null,
    kurztext: `Altform: ${id}`,
    merkmale: { ...OHNE, ...merkmale },
    zuschlag,
    ...mehr,
  });
  const zusatz: Knoten[] = [
    neu('v1-bedarf-mit', { bedarf: 'mit-gesamtbetrag' }),
    neu('v1-wahl-ohne-grund', { wahl: { gruppe: null, variante: null, grundpositionId: null } }),
    neu('v1-zuschlag-ohne-bezug', {}, { prozentsatz: null, bezug: { art: 'positionen', positionen: [] } }),
    neu('v1-stundenlohn', { stundenlohn: true }),
    neu('v1-pauschal', { pauschal: true }, null, {
      ozIndex: 'a',
      epa: {
        lohn: '6.000' as Einheitspreis,
        stoffe: '4.000' as Einheitspreis,
        geraete: null,
        nachunternehmer: null,
        sonstiges: null,
        frei: null,
        freiBezeichnung: null,
      },
    }),
  ];
  const lvZustand = { ...f.lv, leistungsverzeichnis: { ...lv, knoten: [...lv.knoten, ...zusatz] } };
  const angebot = f.angebote[0];
  if (angebot === undefined) throw new Error('typisch hat keine Angebote');
  const auftrag = auftragsLvAus(lvZustand, angebot.angebot.id);
  const schritte = anlegenSchritte({ ...f, lv: lvZustand });
  return {
    schemaVersion,
    projekt: f.projekt,
    leistungsverzeichnisse: [lvZustand],
    angebote: f.angebote,
    auftragsLeistungsverzeichnisse: [auftrag],
    protokoll: [
      ...schritte.map((s) => s.eintrag),
      eintrag(
        schritte.length + 1,
        f.projekt.id,
        { art: 'auftrags-leistungsverzeichnis', id: auftrag.auftragsLeistungsverzeichnis.id },
        {
          art: 'AuftragsLeistungsverzeichnisAnlegen',
          auftragsLeistungsverzeichnis: auftrag.auftragsLeistungsverzeichnis,
        },
      ),
    ],
  };
}
