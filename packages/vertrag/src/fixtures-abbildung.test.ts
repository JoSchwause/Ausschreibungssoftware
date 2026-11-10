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
  PositionId,
  Positionsart,
  Prozent,
  Summenstand,
  TitelId,
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
type FxKnoten =
  | { id: string; parentId: string; art: 'titel'; ordnungszahl: string; kurztext: string }
  | { id: string; parentId: string; art: 'hinweis'; text: string }
  | {
      id: string;
      parentId: string;
      art: 'position';
      positionsart: Positionsart;
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
 * Die Fixtures beschreiben ihre Maske nur als Text (`NN.NN.NN.NN.NN.NNNN[I]`, 15 Stellen) und verletzen damit die
 * Grenze von 14 Zeichen einschließlich Index (F2, E-09). Hier steht die Maske als strukturierter Wert und wird aus den
 * Ordnungszahlen der Fixture abgeleitet, damit alle vorhandenen Werte hineinpassen: je Gliederungsstufe zwei Ziffern,
 * die Position vier Ziffern, ein Indexbuchstabe nur, wenn die Fixture einen verwendet. `gross` hat fünf Stufen und
 * keinen Index (5 × 2 + 4 = 14 Stellen), `typisch` hat Indexpositionen bei einer Stufe (2 + 4 + 1 = 7 Stellen).
 * Fünf Stufen und ein Index zusammen (15 Stellen) kommen in keiner Fixture vor und wären nicht zulässig.
 */
function fixtureMaske(fx: FxLv): OzMaske {
  const stufen = Math.max(
    1,
    ...fx.knoten.flatMap((k) => (k.art === 'position' ? [k.ordnungszahl.split('.').length - 1] : [])),
  );
  const mitIndex = fx.knoten.some((k) => k.art === 'position' && k.ozIndex !== undefined);
  return {
    gliederung: Array.from({ length: stufen }, () => ({ laenge: 2, zeichen: 'numerisch' as const })),
    position: { laenge: 4, zeichen: 'numerisch' },
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
      positionsart: k.positionsart,
      pauschal: false,
      bedarfMitGesamtbetrag: k.bedarfMitGesamtbetrag ?? false,
      bezugspositionId: (k.bezugspositionId as PositionId | undefined) ?? null,
      grundpositionId: (k.grundpositionId as PositionId | undefined) ?? null,
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
    ozMaske: fixtureMaske(fx),
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
        positionsart: k.positionsart,
        ordnungszahl: k.ordnungszahl ?? '',
        kurztext: k.kurztext,
        langtext: text(k.langtext),
        menge: k.menge ?? '',
        einheit: k.einheit ?? '',
        einheitspreis: k.einheitspreis ?? '',
      };
      if (k.ozIndex !== null) fx.ozIndex = k.ozIndex;
      if (k.positionsart === 'bedarf') fx.bedarfMitGesamtbetrag = k.bedarfMitGesamtbetrag;
      if (k.bezugspositionId !== null) fx.bezugspositionId = k.bezugspositionId;
      if (k.grundpositionId !== null) fx.grundpositionId = k.grundpositionId;
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

    it('die Maske hat höchstens 14 Stellen einschließlich Index, und jede Ordnungszahl passt hinein (F2)', () => {
      const m = lv.ozMaske;
      const stellen =
        m.gliederung.reduce((n, g) => n + g.laenge, 0) + m.position.laenge + (m.index?.laenge ?? 0);
      expect(stellen).toBeLessThanOrEqual(14);
      for (const k of lv.knoten) {
        if (k.art !== 'position' || k.ordnungszahl === null) continue;
        expect(k.ordnungszahl.split('.').length - 1).toBeLessThanOrEqual(m.gliederung.length);
        if (k.ozIndex !== null) expect(m.index).not.toBeNull();
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
        if (k.bezugspositionId !== null) expect(positionen.has(k.bezugspositionId)).toBe(true);
        if (k.grundpositionId !== null) expect(positionen.has(k.grundpositionId)).toBe(true);
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
