// SPDX-License-Identifier: AGPL-3.0-or-later
// Testseite des Grids: baut aus den Fixtures (Ticket 19) eine `LvAnsicht`. Dieser Code ersetzt bis zur Anbindung
// an `kern` (Ticket 12) das, was später `kern` und die App leisten: den sichtbaren, flachen Baum und die Summen.
// Er rechnet nichts: Gesamtpreise und Summen stammen aus den Sollwerten der Fixture. Nur Test- und Harness-Code.
// Die Abbildung JSON → vertrag folgt `packages/vertrag/src/fixtures-abbildung.test.ts`.

import type {
  Betrag,
  ElternId,
  Einheitspreis,
  Gesamtsummen,
  HinweistextId,
  Knoten,
  LvAnsicht,
  LvZeile,
  Menge,
  Ordnungszahl,
  PositionId,
  Positionsmerkmale,
  Pruefbefund,
  Zuschlag,
  TitelId,
  WurzelId,
} from '@tethys/vertrag';

type FxKnoten =
  | { id: string; parentId: string; art: 'titel'; ordnungszahl: string; kurztext: string }
  | { id: string; parentId: string; art: 'hinweis'; text: string }
  | {
      id: string;
      parentId: string;
      art: 'position';
      positionsart: 'normal' | 'bedarf' | 'wahl' | 'zuschlag' | 'stundenlohn';
      ordnungszahl: string;
      ozIndex?: string;
      kurztext: string;
      menge: string;
      einheit: string;
      einheitspreis: string;
      bedarfMitGesamtbetrag?: boolean;
      bezugspositionId?: string;
      grundpositionId?: string;
    };

// Die Fixtures behalten dauerhaft ihr Format mit einer einzelnen Positionsart (Ticket 19); diese Abbildung setzt sie
// in die kombinierbaren Merkmale von `vertrag` um. Gruppe und Variante einer Wahl kennt die Fixture nicht (`null`).
type FxPosition = Extract<FxKnoten, { art: 'position' }>;

function fixtureMerkmale(k: FxPosition): Positionsmerkmale {
  return {
    bedarf:
      k.positionsart === 'bedarf'
        ? k.bedarfMitGesamtbetrag === true
          ? 'mit-gesamtbetrag'
          : 'ohne-gesamtbetrag'
        : null,
    wahl:
      k.positionsart === 'wahl'
        ? {
            gruppe: null,
            variante: null,
            grundpositionId: (k.grundpositionId as PositionId | undefined) ?? null,
          }
        : null,
    stundenlohn: k.positionsart === 'stundenlohn',
    pauschal: false,
    zuschlagskennzeichen: false,
  };
}

function fixtureZuschlag(k: FxPosition): Zuschlag | null {
  if (k.positionsart !== 'zuschlag') return null;
  const bezug = k.bezugspositionId as PositionId | undefined;
  return {
    prozentsatz: null,
    bezug: {
      art: 'positionen',
      positionen: bezug === undefined ? [] : [{ positionId: bezug, teilmenge: null }],
    },
  };
}

interface FxLv {
  id: string;
  knoten: FxKnoten[];
  sollwerte: {
    positionen: Record<string, { gp: string | null; inSumme: boolean }>;
    titel: Record<string, { summe: string }>;
    summen: { netto: string; nachlass: string; nettoNachNachlass: string; mwst: string; brutto: string };
  };
}

export type FixtureName = 'typisch' | 'gross';

/** Modell der Testseite: flache Knotenliste (Dokumentreihenfolge, Eltern vor Kindern) plus Sollwerte. */
export interface Modell {
  readonly lvId: ElternId;
  readonly knoten: readonly Knoten[];
  readonly gp: ReadonlyMap<string, { gp: Betrag | null; inSumme: boolean }>;
  readonly titelsumme: ReadonlyMap<string, Betrag>;
  readonly gesamt: Gesamtsummen;
}

/**
 * Lädt eine Fixture; `kopien` > 1 hängt weitere Kopien des Baums mit frischen Kennungen an (für den Test mit
 * 10.000 Zeilen). Die Summen der Kopien sind die der Vorlage, die Gesamtsumme ist die der ersten Kopie: Für die
 * Leistungsmessung zählt nur die Zeilenzahl.
 */
export async function ladeFixture(name: FixtureName, kopien = 1): Promise<Modell> {
  // Die Dateien liefert das Vite-Plugin aus `vite.config.ts`: Das Paket darf `fixtures/` nicht importieren (A3).
  const antwort = await fetch(new URL(`fixtures/${name}.json`, document.baseURI));
  const fx = (await antwort.json()) as FxLv;
  const lvId = fx.id as ElternId;
  const knoten: Knoten[] = [];
  const gp = new Map<string, { gp: Betrag | null; inSumme: boolean }>();
  const titelsumme = new Map<string, Betrag>();
  for (let kopie = 0; kopie < kopien; kopie++) {
    const id = (alt: string): string => (kopie === 0 ? alt : `${alt}~${String(kopie)}`);
    const eltern = (alt: string): ElternId => (alt === fx.id ? lvId : (id(alt) as ElternId));
    const reihenfolge = new Map<string, number>();
    for (const k of fx.knoten) {
      const r = reihenfolge.get(k.parentId) ?? 0;
      reihenfolge.set(k.parentId, r + 1);
      const lage = { elternId: eltern(k.parentId), reihenfolge: r };
      if (k.art === 'titel') {
        knoten.push({
          ...lage,
          art: 'titel',
          id: id(k.id) as TitelId,
          ordnungszahl: k.ordnungszahl as Ordnungszahl,
          kurztext: k.kurztext,
        });
      } else if (k.art === 'hinweis') {
        knoten.push({
          ...lage,
          art: 'hinweis',
          id: id(k.id) as HinweistextId,
          text: [{ art: 'text', text: k.text }],
        });
      } else {
        knoten.push({
          ...lage,
          art: 'position',
          id: id(k.id) as PositionId,
          ordnungszahl: k.ordnungszahl as Ordnungszahl,
          ozIndex: k.ozIndex ?? null,
          merkmale: fixtureMerkmale(k),
          zuschlag: fixtureZuschlag(k),
          kurztext: k.kurztext,
          langtext: [],
          menge: k.menge as Menge,
          einheit: k.einheit,
          einheitspreis: k.einheitspreis as Einheitspreis,
          epa: null,
        });
      }
    }
    for (const [pid, w] of Object.entries(fx.sollwerte.positionen)) {
      gp.set(id(pid), { gp: w.gp as Betrag | null, inSumme: w.inSumme });
    }
    for (const [tid, w] of Object.entries(fx.sollwerte.titel)) titelsumme.set(id(tid), w.summe as Betrag);
  }
  const s = fx.sollwerte.summen;
  const gesamt: Gesamtsummen = {
    netto: s.netto as Betrag,
    nachlass: s.nachlass as Betrag,
    nettoNachNachlass: s.nettoNachNachlass as Betrag,
    mwst: s.mwst as Betrag,
    brutto: s.brutto as Betrag,
  };
  return { lvId, knoten, gp, titelsumme, gesamt };
}

/** Sichtbarer, flacher Baum: Kinder eines Knotens stehen nur, wenn er aufgeklappt ist. */
export function baueAnsicht(
  modell: Modell,
  aufgeklappt: ReadonlySet<string>,
  befunde: ReadonlyMap<string, readonly Pruefbefund[]> = new Map(),
): LvAnsicht {
  const kinder = new Map<string, Knoten[]>();
  for (const k of modell.knoten) {
    const liste = kinder.get(k.elternId) ?? [];
    liste.push(k);
    kinder.set(k.elternId, liste);
  }
  const zeilen: LvZeile[] = [];
  const besuche = (elternId: string, tiefe: number): void => {
    for (const k of kinder.get(elternId) ?? []) {
      const unter = k.art === 'titel' || k.art === 'los' ? (kinder.get(k.id) ?? []) : [];
      const offen = aufgeklappt.has(k.id);
      const p = k.art === 'position' ? modell.gp.get(k.id) : undefined;
      zeilen.push({
        knoten: k,
        tiefe,
        hatUnterknoten: unter.length > 0,
        aufgeklappt: offen,
        summe:
          k.art === 'position'
            ? (p?.gp ?? null)
            : k.art === 'hinweis'
              ? null
              : (modell.titelsumme.get(k.id) ?? null),
        gehtInSummeEin: k.art === 'position' ? (p?.inSumme ?? null) : null,
        befunde: befunde.get(k.id) ?? [],
      });
      if (offen && unter.length > 0) besuche(k.id, tiefe + 1);
    }
  };
  besuche(modell.lvId, 0);
  return { wurzelId: modell.lvId as WurzelId, zeilen, gesamt: modell.gesamt };
}

/** Alle Gliederungsknoten (zum Aufklappen aller Ebenen). */
export function alleGliederungen(modell: Modell): Set<string> {
  return new Set(modell.knoten.filter((k) => k.art === 'titel' || k.art === 'los').map((k) => k.id));
}
