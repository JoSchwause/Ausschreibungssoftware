// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests unter Node (Vitest, Playwright-Seite Node): ein Projekt, das jede Positionsart der Schemaversion 1
// enthält, als Projektdatei im aktuellen Modell. Grundlage ist das Fixture `typisch` (normal, Bedarf ohne Gesamtbetrag,
// Wahl mit Grundposition, Zuschlag mit Bezug); dazu kommen Bedarf mit Gesamtbetrag, Wahl ohne Grundposition, Zuschlag
// ohne Bezug, Stundenlohn und eine Pauschalposition mit Index und EPA, außerdem ein Auftrags-LV.

import { summenBerechnen } from '@tethys/kern';
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
import { normalisiere } from './normalisiere';

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

/**
 * Erwarteter Stand nach Migration 2 (D-17): dieselben Daten, jede Summe so, wie der Kern sie vollständig rechnet. Für
 * ein Angebot ist das das gedachte LV (R7): Knoten des LV mit den EP des Bieters (Version 1 kennt keinen Satz).
 * Unabhängig vom Produktivweg (`summenmigration.ts`) gebildet; die Angebotssummen nach Kennung wie im Speicher.
 */
export function mitKernSummen(d: Projektdatei): Projektdatei {
  const lvs = new Map(d.leistungsverzeichnisse.map((z) => [z.leistungsverzeichnis.id as string, z]));
  return {
    ...d,
    leistungsverzeichnisse: d.leistungsverzeichnisse.map((z) => ({
      ...z,
      summen: summenBerechnen(z.leistungsverzeichnis),
    })),
    angebote: d.angebote.map((z) => {
      const lv = lvs.get(z.angebot.leistungsverzeichnisId)?.leistungsverzeichnis;
      if (lv === undefined) throw new Error(`LV zu Angebot ${z.angebot.id} fehlt`);
      const ep = new Map(z.angebot.positionen.map((p) => [p.positionId as string, p]));
      const knoten = lv.knoten.map((k) => {
        if (k.art !== 'position') return k;
        const p = ep.get(k.id);
        return { ...k, einheitspreis: p?.status === 'angeboten' ? p.einheitspreis : null };
      });
      const summen = summenBerechnen({
        id: lv.id,
        knoten,
        nachlass: z.angebot.nachlass,
        mwstSatz: lv.mwstSatz,
      });
      return normalisiere({ ...z, summen });
    }),
    auftragsLeistungsverzeichnisse: d.auftragsLeistungsverzeichnisse.map((z) => ({
      ...z,
      summen: summenBerechnen(z.auftragsLeistungsverzeichnis),
    })),
  };
}
