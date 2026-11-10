// SPDX-License-Identifier: AGPL-3.0-or-later
// Zeigt, dass die Fixtures (Ticket 19) vollständig auf `vertrag`-Typen abbildbar sind: JSON → vertrag → JSON
// ergibt wieder dasselbe JSON. Die Abbildung steht nur in diesem Test; sie ist keine Paketlogik. Die `as`-Casts
// auf Dezimal- und Kennungstypen ersetzen hier `dezimal` und die App (Konstruktion ist nicht Aufgabe von `vertrag`).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type {
  Angebot,
  Angebotsposition,
  Betrag,
  ElternId,
  Einheitspreis,
  Gesamtsummen,
  GliederungId,
  HinweistextId,
  Knoten,
  Leistungsverzeichnis,
  LeistungsverzeichnisId,
  Menge,
  Nachlass,
  Ordnungszahl,
  OzMaske,
  Position,
  PositionId,
  Positionsmerkmale,
  Prozent,
  Summenstand,
  TitelId,
  Zuschlag,
  AngebotId,
  BieterId,
  ProjektId,
} from './index';

// --- Form der Fixture-Dateien (README, „JSON-Form“) ---------------------------------------------------------

interface FxNachlass {
  art: 'prozent' | 'betrag';
  wert: string;
}
interface FxSummen {
  netto: string;
  nachlass: string;
  nettoNachNachlass: string;
  mwst: string;
  brutto: string;
}
interface FxSollwerte {
  positionen: Record<string, { gp: string | null; inSumme: boolean }>;
  titel: Record<string, { summe: string }>;
  summen: FxSummen;
  nichtAngeboten?: string[];
}
/**
 * Positionsart in der Fixture-Datei (Ticket 19). `vertrag` kennt seit v1.1b keinen einzelnen Wert mehr; die Abbildung
 * unten setzt sie in `Positionsmerkmale` und `Zuschlag` um und wieder zurück.
 */
type FxPositionsart = 'normal' | 'bedarf' | 'wahl' | 'zuschlag' | 'stundenlohn';
type FxKnoten =
  | { id: string; parentId: string; art: 'titel'; ordnungszahl: string; kurztext: string }
  | { id: string; parentId: string; art: 'hinweis'; text: string }
  | {
      id: string;
      parentId: string;
      art: 'position';
      positionsart: FxPositionsart;
      ordnungszahl: string;
      ozIndex?: string;
      kurztext: string;
      langtext: string;
      menge: string;
      einheit: string;
      einheitspreis: string;
      bedarfMitGesamtbetrag?: boolean;
      bezugspositionId?: string;
      grundpositionId?: string;
    };
interface FxLv {
  id: string;
  ozMaske: string;
  name: string;
  mwstSatz: string;
  nachlass: FxNachlass | null;
  knoten: FxKnoten[];
  sollwerte: FxSollwerte;
}
type FxAngebotsposition =
  | { positionId: string; status: 'angeboten'; einheitspreis: string }
  | { positionId: string; status: 'nicht-angeboten' };
interface FxAngebotsset {
  lvId: string;
  bieter: { id: string; name: string }[];
  angebote: {
    id: string;
    bieterId: string;
    nachlass: FxNachlass | null;
    positionen: FxAngebotsposition[];
    sollwerte: FxSollwerte;
  }[];
}

const rohdaten = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../fixtures/${name}.json`, import.meta.url), 'utf8'));
const lesenLv = (name: string): FxLv => rohdaten(name) as FxLv;
const lesenAngebotsset = (name: string): FxAngebotsset => rohdaten(name) as FxAngebotsset;

// --- Abbildung JSON → vertrag ---------------------------------------------------------------------------------

/**
 * Die Fixtures beschreiben ihre Maske als Text vor dem Doppelpunkt (`NN.NN.NNNN[I]`: je `N` eine Ziffer, `[I]` ein
 * Indexbuchstabe, die letzte Gruppe ist die Position, die davor sind die Gliederungsstufen). Hier wird genau dieser
 * Text in einen `OzMaske` abgebildet, nichts wird aus den Ordnungszahlen abgeleitet.
 */
function fixtureMaske(text: string): OzMaske {
  const muster = text.split(':')[0]?.trim() ?? '';
  const mitIndex = muster.endsWith('[I]');
  const gruppen = (mitIndex ? muster.slice(0, -3) : muster).split('.');
  const stellen = gruppen.map((g) => ({ laenge: g.length, zeichen: 'numerisch' as const }));
  const position = stellen.pop();
  if (position === undefined || gruppen.some((g) => !/^N+$/.test(g))) {
    throw new Error(`Maskentext nicht lesbar: ${text}`);
  }
  return {
    gliederung: stellen,
    position,
    index: mitIndex ? { laenge: 1, zeichen: 'alphanumerisch' } : null,
    trennzeichen: '.',
  };
}

const nachlass = (n: FxNachlass | null): Nachlass | null =>
  n === null
    ? null
    : n.art === 'prozent'
      ? { art: 'prozent', wert: n.wert as Prozent }
      : { art: 'betrag', wert: n.wert as Betrag };

function merkmale(k: Extract<FxKnoten, { art: 'position' }>): Positionsmerkmale {
  const m: Positionsmerkmale = {
    bedarf: null,
    wahl: null,
    stundenlohn: k.positionsart === 'stundenlohn',
    pauschal: false,
    zuschlagskennzeichen: false,
  };
  if (k.positionsart === 'bedarf') {
    return { ...m, bedarf: k.bedarfMitGesamtbetrag === true ? 'mit-gesamtbetrag' : 'ohne-gesamtbetrag' };
  }
  if (k.positionsart === 'wahl') {
    // Die Fixtures kennen keine Gruppen- und Variantennummern (README A3): `null`, nichts erfunden.
    return {
      ...m,
      wahl: {
        gruppe: null,
        variante: null,
        grundpositionId: (k.grundpositionId as PositionId | undefined) ?? null,
      },
    };
  }
  return m;
}

/**
 * Die Zuschlagsposition der Fixture: ein einzelner Bezug als Liste mit einer Position, ohne Teilmenge, ohne
 * Prozentsatz (die Fixture hat keinen). Vermerk: Die Fixture `typisch` rechnet die Zuschlagsposition bis K6 weiter wie
 * bisher mit eigener Menge × EP (README A4); Menge, Einheit und EP stehen deshalb unverändert an der Position.
 */
function zuschlag(k: Extract<FxKnoten, { art: 'position' }>): Zuschlag | null {
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

/** Rückweg: die Fixture-Positionsart aus den Merkmalen (nur für die Gegenprobe). */
function positionsart(k: Position): FxPositionsart {
  // Die alte Ausschließlichkeit der Art bleibt hier behauptet: mehr als ein Merkmal in diesem Test ist ein Fehler.
  const gesetzt = [
    k.zuschlag !== null,
    k.merkmale.wahl !== null,
    k.merkmale.bedarf !== null,
    k.merkmale.stundenlohn,
  ];
  if (gesetzt.filter(Boolean).length > 1)
    throw new Error('Mehrere Positionsmerkmale zugleich gesetzt (Art nicht eindeutig).');
  if (k.zuschlag !== null) return 'zuschlag';
  if (k.merkmale.wahl !== null) return 'wahl';
  if (k.merkmale.bedarf !== null) return 'bedarf';
  if (k.merkmale.stundenlohn) return 'stundenlohn';
  return 'normal';
}

function abbilden(fx: FxLv): Leistungsverzeichnis {
  const zaehler = new Map<string, number>();
  const knoten: Knoten[] = fx.knoten.map((k): Knoten => {
    const reihenfolge = zaehler.get(k.parentId) ?? 0;
    zaehler.set(k.parentId, reihenfolge + 1);
    const lage = { elternId: k.parentId as ElternId, reihenfolge };
    if (k.art === 'titel') {
      return {
        ...lage,
        art: 'titel',
        id: k.id as TitelId,
        ordnungszahl: k.ordnungszahl as Ordnungszahl,
        kurztext: k.kurztext,
      };
    }
    if (k.art === 'hinweis') {
      return { ...lage, art: 'hinweis', id: k.id as HinweistextId, text: [{ art: 'text', text: k.text }] };
    }
    return {
      ...lage,
      art: 'position',
      id: k.id as PositionId,
      ordnungszahl: k.ordnungszahl as Ordnungszahl,
      ozIndex: k.ozIndex ?? null,
      merkmale: merkmale(k),
      zuschlag: zuschlag(k),
      kurztext: k.kurztext,
      langtext: [{ art: 'text', text: k.langtext }],
      menge: k.menge as Menge,
      einheit: k.einheit,
      einheitspreis: k.einheitspreis as Einheitspreis,
      epa: null,
    };
  });
  return {
    id: fx.id as LeistungsverzeichnisId,
    projektId: 'projekt-der-fixture' as ProjektId,
    name: fx.name,
    ozMaske: fixtureMaske(fx.ozMaske),
    mwstSatz: fx.mwstSatz as Prozent,
    nachlass: nachlass(fx.nachlass),
    knoten,
  };
}

function summenstand(s: FxSollwerte): Summenstand {
  const gesamt: Gesamtsummen = {
    netto: s.summen.netto as Betrag,
    nachlass: s.summen.nachlass as Betrag,
    nettoNachNachlass: s.summen.nettoNachNachlass as Betrag,
    mwst: s.summen.mwst as Betrag,
    brutto: s.summen.brutto as Betrag,
  };
  return {
    positionen: Object.entries(s.positionen).map(([id, w]) => ({
      positionId: id as PositionId,
      gesamtpreis: w.gp as Betrag | null,
      gehtInSummeEin: w.inSumme,
    })),
    gliederungen: Object.entries(s.titel).map(([id, w]) => ({
      gliederungId: id as GliederungId,
      summe: w.summe as Betrag,
    })),
    gesamt,
  };
}

// --- Abbildung vertrag → JSON (Gegenprobe) --------------------------------------------------------------------

const text = (t: readonly { art: string; text?: string }[]): string => t.map((b) => b.text ?? '').join('');

function zurueck(k: Knoten): FxKnoten {
  switch (k.art) {
    case 'titel':
      return {
        id: k.id,
        parentId: k.elternId,
        art: 'titel',
        ordnungszahl: k.ordnungszahl ?? '',
        kurztext: k.kurztext,
      };
    case 'hinweis':
      return { id: k.id, parentId: k.elternId, art: 'hinweis', text: text(k.text) };
    case 'position': {
      const fx: FxKnoten = {
        id: k.id,
        parentId: k.elternId,
        art: 'position',
        positionsart: positionsart(k),
        ordnungszahl: k.ordnungszahl ?? '',
        kurztext: k.kurztext,
        langtext: text(k.langtext),
        menge: k.menge ?? '',
        einheit: k.einheit ?? '',
        einheitspreis: k.einheitspreis ?? '',
      };
      if (k.ozIndex !== null) fx.ozIndex = k.ozIndex;
      if (k.merkmale.bedarf !== null) fx.bedarfMitGesamtbetrag = k.merkmale.bedarf === 'mit-gesamtbetrag';
      const bezug = k.zuschlag?.bezug;
      if (bezug?.art === 'positionen' && bezug.positionen[0] !== undefined) {
        fx.bezugspositionId = bezug.positionen[0].positionId;
      }
      if (k.merkmale.wahl?.grundpositionId != null) fx.grundpositionId = k.merkmale.wahl.grundpositionId;
      return fx;
    }
    case 'los':
      throw new Error('Fixtures enthalten keine Lose (README A9).');
  }
}

// --- Tests --------------------------------------------------------------------------------------------------------

describe.each(['winzig', 'typisch', 'gross'])(
  'Fixture %s lässt sich vollständig auf vertrag abbilden',
  (name) => {
    const fx = lesenLv(name);
    const lv = abbilden(fx);

    it('die Maske der Fixture hat höchstens 14 Stellen einschließlich Index, und jede Ordnungszahl passt Stufe für Stufe hinein (F2)', () => {
      const m = lv.ozMaske;
      const stellen =
        m.gliederung.reduce((n, g) => n + g.laenge, 0) + m.position.laenge + (m.index?.laenge ?? 0);
      expect(stellen).toBeLessThanOrEqual(14);
      for (const k of lv.knoten) {
        if (k.art === 'hinweis' || k.ordnungszahl === null) continue;
        const teile = k.ordnungszahl.split('.');
        if (k.art === 'position') {
          expect(teile.length - 1).toBeLessThanOrEqual(m.gliederung.length);
          expect(teile.at(-1)?.length).toBe(m.position.laenge);
          teile.slice(0, -1).forEach((t, n) => {
            expect(t.length).toBe(m.gliederung[n]?.laenge);
          });
          if (k.ozIndex !== null) {
            expect(m.index).not.toBeNull();
            expect(k.ozIndex).toHaveLength(m.index?.laenge ?? -1);
          }
        } else {
          expect(teile.length).toBeLessThanOrEqual(m.gliederung.length);
          teile.forEach((t, n) => {
            expect(t.length).toBe(m.gliederung[n]?.laenge);
          });
        }
      }
    });

    it('verliert kein Feld: JSON → vertrag → JSON ist die Identität', () => {
      expect(lv.knoten.map(zurueck)).toEqual(fx.knoten);
    });

    it('jeder Knoten hat eine eindeutige Kennung und einen vorhandenen Elternknoten', () => {
      const ids = new Set<string>([lv.id]);
      for (const k of lv.knoten) {
        expect(ids.has(k.id)).toBe(false);
        expect(ids.has(k.elternId)).toBe(true); // Eltern stehen vor Kindern
        ids.add(k.id);
      }
    });

    it('Bezugs- und Grundpositionen verweisen auf vorhandene Positionen', () => {
      const positionen = new Set(lv.knoten.filter((k) => k.art === 'position').map((k) => k.id as string));
      for (const k of lv.knoten) {
        if (k.art !== 'position') continue;
        for (const b of k.zuschlag?.bezug.art === 'positionen' ? k.zuschlag.bezug.positionen : []) {
          expect(positionen.has(b.positionId)).toBe(true);
        }
        const grund = k.merkmale.wahl?.grundpositionId ?? null;
        if (grund !== null) expect(positionen.has(grund)).toBe(true);
      }
    });

    it('die Sollwerte passen in Summenstand, Gesamtsummen und Nachlass', () => {
      const s = summenstand(fx.sollwerte);
      expect(s.positionen.length).toBe(Object.keys(fx.sollwerte.positionen).length);
      expect(s.gesamt.brutto).toBe(fx.sollwerte.summen.brutto);
      expect(lv.nachlass?.art ?? null).toBe(fx.nachlass?.art ?? null);
    });

    it('ist JSON-tauglich (Rundreise ohne Verlust)', () => {
      expect(JSON.parse(JSON.stringify(lv))).toEqual(lv);
    });
  },
);

describe('Angebote zu typisch', () => {
  const set = lesenAngebotsset('typisch-angebote');
  const lv = abbilden(lesenLv('typisch'));

  const angebote: Angebot[] = set.angebote.map((a) => ({
    id: a.id as AngebotId,
    projektId: 'projekt-der-fixture' as ProjektId,
    leistungsverzeichnisId: set.lvId as LeistungsverzeichnisId,
    bieterId: a.bieterId as BieterId,
    nachlass: nachlass(a.nachlass),
    positionen: a.positionen.map((p): Angebotsposition =>
      p.status === 'angeboten'
        ? {
            positionId: p.positionId as PositionId,
            status: 'angeboten',
            einheitspreis: p.einheitspreis as Einheitspreis,
            epa: null,
          }
        : { positionId: p.positionId as PositionId, status: 'nicht-angeboten' },
    ),
  }));

  it('bildet Bieter, Nachlass und „nicht angeboten“ ab', () => {
    expect(angebote).toHaveLength(3);
    const nichtAngeboten = angebote.flatMap((a) =>
      a.positionen.filter((p) => p.status === 'nicht-angeboten'),
    );
    expect(nichtAngeboten.length).toBeGreaterThan(0);
    for (const p of nichtAngeboten) expect(p).not.toHaveProperty('einheitspreis');
  });

  it('jede Angebotsposition trägt die Kennung einer Position des LV (gemeinsame Positionsidentität)', () => {
    const positionen = new Set(lv.knoten.filter((k) => k.art === 'position').map((k) => k.id as string));
    for (const a of angebote) for (const p of a.positionen) expect(positionen.has(p.positionId)).toBe(true);
  });

  it('die Sollwerte der Angebote passen in Summenstand; kein GP bei „nicht angeboten“ ist null', () => {
    for (const a of set.angebote) {
      const s = summenstand(a.sollwerte);
      for (const id of a.sollwerte.nichtAngeboten ?? []) {
        expect(s.positionen.find((p) => p.positionId === id)?.gesamtpreis ?? null).toBeNull();
      }
    }
  });
});
