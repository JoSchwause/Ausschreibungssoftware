// SPDX-License-Identifier: AGPL-3.0-or-later
// Hilfen nur für Tests dieses Pakets (nicht über index.ts exportiert): kleine LVs und Auftrags-LVs bauen, die Fixtures
// `typisch`, `typisch-angebote` und `typisch-abrechnung` (Tor M4, Ticket 85) in Vertragstypen abbilden. LV und Auftrags-LV
// legt der Kern an; die Summen im Zustand sind seine. Fixtures werden per Dateizugriff gelesen, nicht importiert (A3).
//
// `vergabe` darf dieses Paket nicht importieren (A3), auch nicht in Tests. Das Auftrags-LV aus `typisch` entsteht darum hier
// nach D-21 für den einfachsten Fall (keine gewählte Alternative): Alternativen entfallen, EP, EPA und Zuschlagssatz des
// Bieters, Nachlass des Angebots. Der Test vergleicht seine Summen mit den Sollwerten der Fixture.

import { readFileSync } from 'node:fs';
import { auftragsLvBefehlAusfuehren, lvBefehlAusfuehren, lvChangeSetAnwenden } from '@tethys/kern';
import type {
  Angebot,
  AngebotId,
  Angebotsposition,
  Ansatzzeile,
  Aufmass,
  AufmassId,
  AuftragsLeistungsverzeichnis,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvZustand,
  BieterId,
  ElternId,
  Einheitspreis,
  Ergebnis,
  HinweistextId,
  Knoten,
  LeistungsverzeichnisId,
  LosId,
  LvInhalt,
  LvZustand,
  Menge,
  Nachlass,
  Nachtragsangaben,
  Ordnungszahl,
  OzMaske,
  Position,
  PositionId,
  Positionsmerkmale,
  ProjektId,
  Prozent,
  TitelId,
  Zuschlag,
} from '@tethys/vertrag';

export function erwarteOk<T, F>(e: Ergebnis<T, F>): T {
  if (!e.ok) throw new Error(`Unerwarteter Fehlerwert: ${JSON.stringify(e.fehler)}`);
  return e.wert;
}

export function erwarteFehler<T, F>(e: Ergebnis<T, F>): F {
  if (e.ok) throw new Error(`Unerwartet angenommen: ${JSON.stringify(e.wert).slice(0, 300)}`);
  return e.fehler;
}

/** Die Maske von `typisch` (`NN.NN.NNNN[I]`, Text in der Fixture): zwei Titelebenen, Position vier Ziffern, Index. */
export const MASKE: OzMaske = {
  gliederung: [
    { laenge: 2, zeichen: 'numerisch' },
    { laenge: 2, zeichen: 'numerisch' },
  ],
  position: { laenge: 4, zeichen: 'numerisch' },
  index: { laenge: 1, zeichen: 'alphanumerisch' },
  trennzeichen: '.',
};

/** Eine Maske mit fünf Titelebenen ohne Index (5 × 2 + 4 = 14 Stellen, die Höchstlänge), für tiefe Bäume. */
export const MASKE_5: OzMaske = {
  ...MASKE,
  gliederung: Array.from({ length: 5 }, () => ({ laenge: 2, zeichen: 'numerisch' as const })),
  index: null,
};

const OHNE_MERKMALE: Positionsmerkmale = {
  bedarf: null,
  wahl: null,
  stundenlohn: false,
  pauschal: false,
  zuschlagskennzeichen: false,
};

export const PROJEKT = 'projekt-abrechnung' as ProjektId;

// --- Zustände über den Kern ------------------------------------------------------------------------------------------

/** Legt ein LV über den Kern an und wendet das ChangeSet an. */
export function lvZustand(
  id: string,
  inhalt: Omit<LvInhalt, 'wurzelId'>,
  projektId: ProjektId = PROJEKT,
  nachtrag?: Nachtragsangaben,
): LvZustand {
  const cs = erwarteOk(
    lvBefehlAusfuehren(null, {
      art: 'LeistungsverzeichnisAnlegen',
      id: id as LeistungsverzeichnisId,
      projektId,
      inhalt: { ...inhalt, wurzelId: id as LeistungsverzeichnisId },
    }),
  );
  const z = lvChangeSetAnwenden(null, cs);
  if (z === null) throw new Error('Das ChangeSet entfernt das LV.');
  if (nachtrag === undefined) return z;
  return { ...z, leistungsverzeichnis: { ...z.leistungsverzeichnis, nachtrag } };
}

/**
 * Legt ein Auftrags-LV über den Kern an. Den Zustand baut die Hilfe aus dem ChangeSet des Anlegens (Kopf, Knoten, Summen),
 * weil `auftragsLvChangeSetAnwenden` erst mit Ticket 71 kommt.
 */
export function auftragsLvZustand(a: AuftragsLeistungsverzeichnis): AuftragsLvZustand {
  const cs = erwarteOk(
    auftragsLvBefehlAusfuehren(null, {
      art: 'AuftragsLeistungsverzeichnisAnlegen',
      auftragsLeistungsverzeichnis: a,
    }),
  );
  const kopf = cs.kopf?.nachher;
  const gesamt = cs.summen.gesamt;
  if (!kopf || gesamt === null) throw new Error('Anlegen ohne Kopf oder Gesamtsummen');
  return {
    auftragsLeistungsverzeichnis: { ...kopf, knoten: cs.knoten.hinzugefuegt },
    summen: { positionen: cs.summen.positionen, gliederungen: cs.summen.gliederungen, gesamt },
  };
}

// --- Kleine Bäume von Hand -------------------------------------------------------------------------------------------

export function titel(id: string, eltern: string, reihenfolge: number, oz: string | null = null): Knoten {
  return {
    art: 'titel',
    id: id as TitelId,
    elternId: eltern as ElternId,
    reihenfolge,
    ordnungszahl: oz as Ordnungszahl | null,
    kurztext: `Titel ${id}`,
  };
}

export function los(id: string, eltern: string, reihenfolge: number, oz: string | null = null): Knoten {
  return {
    art: 'los',
    id: id as LosId,
    elternId: eltern as ElternId,
    reihenfolge,
    ordnungszahl: oz as Ordnungszahl | null,
    kurztext: `Los ${id}`,
  };
}

export function hinweis(id: string, eltern: string, reihenfolge: number): Knoten {
  return {
    art: 'hinweis',
    id: id as HinweistextId,
    elternId: eltern as ElternId,
    reihenfolge,
    text: [{ art: 'text', text: 'Hinweis' }],
  };
}

export function position(
  id: string,
  eltern: string,
  reihenfolge: number,
  oz: string | null,
  menge: string | null,
  einheitspreis: string | null = null,
  merkmale: Partial<Positionsmerkmale> = {},
): Position {
  return {
    art: 'position',
    id: id as PositionId,
    elternId: eltern as ElternId,
    reihenfolge,
    ordnungszahl: oz as Ordnungszahl | null,
    ozIndex: null,
    merkmale: { ...OHNE_MERKMALE, ...merkmale },
    zuschlag: null,
    kurztext: `Position ${id}`,
    langtext: [],
    menge: menge as Menge | null,
    einheit: 'm',
    einheitspreis: einheitspreis as Einheitspreis | null,
    epa: null,
  };
}

/** Zuschlagsposition in GAEB-Form: Satz und Liste der Bezugspositionen, ohne Menge, Einheit und EP. */
export function zuschlagsposition(
  id: string,
  eltern: string,
  reihenfolge: number,
  oz: string | null,
  bezug: readonly string[],
  prozentsatz: string | null = null,
): Position {
  return {
    ...position(id, eltern, reihenfolge, oz, null),
    einheit: null,
    zuschlag: {
      prozentsatz: prozentsatz as Prozent | null,
      bezug: {
        art: 'positionen',
        positionen: bezug.map((b) => ({ positionId: b as PositionId, teilmenge: null })),
      },
    },
  };
}

export const ep = (positionId: string, einheitspreis: string): Angebotsposition => ({
  positionId: positionId as PositionId,
  status: 'angeboten',
  einheitspreis: einheitspreis as Einheitspreis,
  epa: null,
});

export const satz = (positionId: string, zuschlagssatz: string): Angebotsposition => ({
  positionId: positionId as PositionId,
  status: 'angeboten',
  einheitspreis: '0.000' as Einheitspreis,
  epa: null,
  zuschlagssatz: zuschlagssatz as Prozent,
});

export const nichtAngeboten = (positionId: string): Angebotsposition => ({
  positionId: positionId as PositionId,
  status: 'nicht-angeboten',
});

export function angebot(
  id: string,
  lv: LvZustand,
  bieterId: string,
  positionen: readonly Angebotsposition[],
  nachlass: Nachlass | null = null,
): Angebot {
  return {
    id: id as AngebotId,
    projektId: lv.leistungsverzeichnis.projektId,
    leistungsverzeichnisId: lv.leistungsverzeichnis.id,
    bieterId: bieterId as BieterId,
    nachlass,
    positionen,
  };
}

/** Ein Auftrags-LV mit den Knoten wie gegeben (Kopf wie ein LV mit Maske `MASKE`, MwSt 19 %, kein Nachlass). */
export function auftragsLv(
  id: string,
  knoten: readonly Knoten[],
  optionen: { maske?: OzMaske; mwstSatz?: string; nachlass?: Nachlass | null; angebotId?: string } = {},
): AuftragsLvZustand {
  return auftragsLvZustand({
    id: id as AuftragsLeistungsverzeichnisId,
    projektId: PROJEKT,
    leistungsverzeichnisId: `lv-zu-${id}` as LeistungsverzeichnisId,
    angebotId: (optionen.angebotId ?? `angebot-zu-${id}`) as AngebotId,
    name: `Auftrags-LV ${id}`,
    ozMaske: optionen.maske ?? MASKE,
    mwstSatz: (optionen.mwstSatz ?? '19.00') as Prozent,
    nachlass: optionen.nachlass ?? null,
    knoten,
  });
}

// --- Fixtures --------------------------------------------------------------------------------------------------------

/** Ein Knoten im Fixture-Format (`fixtures/README.md`, „JSON-Form“). */
export interface FxKnoten {
  id: string;
  parentId: string;
  art: 'titel' | 'hinweis' | 'position';
  ordnungszahl?: string;
  kurztext?: string;
  langtext?: string;
  text?: string;
  positionsart?: 'normal' | 'bedarf' | 'wahl' | 'zuschlag';
  ozIndex?: string;
  menge?: string | null;
  einheit?: string | null;
  einheitspreis?: string | null;
  bedarfMitGesamtbetrag?: boolean;
  grundpositionId?: string;
  zuschlag?: Zuschlag;
}

interface FxLv {
  id: string;
  name: string;
  mwstSatz: string;
  nachlass: Nachlass | null;
  knoten: FxKnoten[];
}

interface FxAngebot {
  id: string;
  bieterId: string;
  nachlass: Nachlass | null;
  positionen: {
    positionId: string;
    status: 'angeboten' | 'nicht-angeboten';
    einheitspreis?: string;
    zuschlagssatz?: string;
  }[];
}

interface FxSummen {
  netto: string;
  nachlass: string;
  nettoNachNachlass: string;
  mwst: string;
  brutto: string;
}

interface FxAufmass {
  id: string;
  projektId: string;
  auftragsLvId: string;
  nummer: string;
  bezeichnung: string;
  datum: string | null;
  positionen: {
    positionId: string;
    mengenansatz: { zeile: string; formel: string; ausdruck: string; variable: string | null }[] | null;
    menge: string | null;
  }[];
}

/** Die Teile von `typisch-abrechnung.json`, die dieses Ticket liest. */
export interface FxAbrechnung {
  lvId: string;
  projektId: string;
  zuschlag: {
    angebotId: string;
    bieterId: string;
    auftragsLvId: string;
    entfallen: string[];
    sollwerte: { summen: FxSummen };
  };
  nachtrag: {
    lv: FxLv & { nachtrag: Nachtragsangaben };
    angebot: FxAngebot & { sollwerte: { summen: FxSummen } };
    uebernahme: {
      art: 'NachtragUebernehmen';
      nachtragLvId: string;
      gliederungReihenfolge: string;
      knoten: FxKnoten[];
    };
    sollwerte: { summen: FxSummen; titel: Record<string, { summe: string }> };
  };
  aufmasse: { aufmass: FxAufmass }[];
  korrektur: {
    aufmassId: string;
    befehl: { art: 'AufmasspositionSetzen'; position: FxAufmass['positionen'][number] };
    aufmassNachher: FxAufmass;
  };
}

function lies(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../../../fixtures/${name}.json`, import.meta.url), 'utf8'));
}

function fxMerkmale(k: FxKnoten): Positionsmerkmale {
  const art = k.positionsart ?? 'normal';
  return {
    ...OHNE_MERKMALE,
    bedarf:
      art === 'bedarf' ? (k.bedarfMitGesamtbetrag === true ? 'mit-gesamtbetrag' : 'ohne-gesamtbetrag') : null,
    wahl:
      art === 'wahl'
        ? { gruppe: null, variante: null, grundpositionId: (k.grundpositionId ?? null) as PositionId | null }
        : null,
  };
}

/**
 * Knoten im Fixture-Format als Vertragstypen; `reihenfolge` zählt je Elternknoten in der Reihenfolge der Liste, außer
 * `reihenfolge` nennt sie für einzelne Kennungen ausdrücklich.
 */
export function fxKnoten(
  liste: readonly FxKnoten[],
  reihenfolge: ReadonlyMap<string, number> = new Map(),
): Knoten[] {
  const zaehler = new Map<string, number>();
  return liste.map((k): Knoten => {
    const n = zaehler.get(k.parentId) ?? 0;
    zaehler.set(k.parentId, n + 1);
    const lage = { elternId: k.parentId as ElternId, reihenfolge: reihenfolge.get(k.id) ?? n };
    if (k.art === 'titel')
      return {
        ...lage,
        art: 'titel',
        id: k.id as TitelId,
        ordnungszahl: (k.ordnungszahl ?? null) as Ordnungszahl | null,
        kurztext: k.kurztext ?? '',
      };
    if (k.art === 'hinweis')
      return {
        ...lage,
        art: 'hinweis',
        id: k.id as HinweistextId,
        text: [{ art: 'text', text: k.text ?? '' }],
      };
    return {
      ...lage,
      art: 'position',
      id: k.id as PositionId,
      ordnungszahl: (k.ordnungszahl ?? null) as Ordnungszahl | null,
      ozIndex: k.ozIndex ?? null,
      merkmale: fxMerkmale(k),
      zuschlag: k.zuschlag ?? null,
      kurztext: k.kurztext ?? '',
      langtext: k.langtext === undefined ? [] : [{ art: 'text', text: k.langtext }],
      menge: (k.menge ?? null) as Menge | null,
      einheit: k.einheit ?? null,
      einheitspreis: (k.einheitspreis ?? null) as Einheitspreis | null,
      epa: null,
    };
  });
}

function fxAngebot(fx: FxAngebot, lv: LvZustand): Angebot {
  return angebot(
    fx.id,
    lv,
    fx.bieterId,
    fx.positionen.map((p) =>
      p.status !== 'angeboten'
        ? nichtAngeboten(p.positionId)
        : p.zuschlagssatz !== undefined
          ? satz(p.positionId, p.zuschlagssatz)
          : ep(p.positionId, p.einheitspreis ?? ''),
    ),
    fx.nachlass,
  );
}

export const abrechnungsFixture = (): FxAbrechnung => lies('typisch-abrechnung') as FxAbrechnung;

/**
 * Das Auftrags-LV des Tors M4 (Ticket 85, D-85.1): `typisch` mit dem Angebot von Bieter B nach D-21 ohne gewählte
 * Alternative. Alternativen entfallen, `reihenfolge` dicht je Elternknoten, EP des Bieters (nicht angeboten: `null`),
 * Zuschlagssatz des Bieters, Nachlass des Angebots, Auftragnehmer Bieter B.
 */
export function m4AuftragsLv(): AuftragsLvZustand {
  const fx = abrechnungsFixture();
  const lv = lies('typisch') as FxLv;
  const set = lies('typisch-angebote') as { angebote: FxAngebot[] };
  const b = set.angebote.find((a) => a.id === fx.zuschlag.angebotId);
  if (b === undefined) throw new Error('Angebot von Bieter B fehlt in typisch-angebote');
  const entfallen = new Set(fx.zuschlag.entfallen);
  const auftragsLvId = fx.zuschlag.auftragsLvId;
  const preise = new Map(b.positionen.map((p) => [p.positionId, p]));
  const knoten = fxKnoten(lv.knoten.filter((k) => !entfallen.has(k.id))).map((k): Knoten => {
    const lage = { elternId: (k.elternId === lv.id ? auftragsLvId : k.elternId) as ElternId };
    if (k.art !== 'position') return { ...k, ...lage };
    const p = preise.get(k.id);
    const angeboten = p?.status === 'angeboten';
    if (k.zuschlag !== null)
      return {
        ...k,
        ...lage,
        einheitspreis: null,
        zuschlag: {
          ...k.zuschlag,
          prozentsatz: (angeboten ? (p.zuschlagssatz ?? null) : null) as Prozent | null,
        },
      };
    return {
      ...k,
      ...lage,
      einheitspreis: (angeboten ? (p.einheitspreis ?? null) : null) as Einheitspreis | null,
    };
  });
  return auftragsLvZustand({
    id: auftragsLvId as AuftragsLeistungsverzeichnisId,
    projektId: fx.projektId as ProjektId,
    leistungsverzeichnisId: lv.id as LeistungsverzeichnisId,
    angebotId: b.id as AngebotId,
    name: lv.name,
    ozMaske: MASKE,
    mwstSatz: lv.mwstSatz as Prozent,
    nachlass: b.nachlass,
    auftragnehmer: { name: 'Bieter B', strasse: null, plz: null, ort: null },
    knoten,
  });
}

/** Das Nachtrags-LV N01 des Tors M4 und das Nachtragsangebot des Auftragnehmers (Bieter B). */
export function m4Nachtrag(): { lv: LvZustand; angebot: Angebot } {
  const fx = abrechnungsFixture();
  const n = fx.nachtrag.lv;
  const lv = lvZustand(
    n.id,
    {
      name: n.name,
      ozMaske: MASKE,
      mwstSatz: n.mwstSatz as Prozent,
      nachlass: n.nachlass,
      knoten: fxKnoten(n.knoten),
    },
    fx.projektId as ProjektId,
    n.nachtrag,
  );
  return { lv, angebot: fxAngebot(fx.nachtrag.angebot, lv) };
}

/** Ein Aufmaßblatt im Fixture-Format als Vertragstyp (Zahlen stehen dort als Text, D-85.4). */
export function fxAufmass(a: FxAufmass): Aufmass {
  return {
    id: a.id as AufmassId,
    projektId: a.projektId as ProjektId,
    auftragsLvId: a.auftragsLvId as AuftragsLeistungsverzeichnisId,
    nummer: Number(a.nummer),
    bezeichnung: a.bezeichnung,
    datum: a.datum,
    positionen: a.positionen.map((p) => fxAufmassposition(p)),
  };
}

export function fxAufmassposition(p: FxAufmass['positionen'][number]): Aufmass['positionen'][number] {
  return {
    positionId: p.positionId as PositionId,
    mengenansatz:
      p.mengenansatz === null
        ? null
        : p.mengenansatz.map((z): Ansatzzeile => ({
            zeile: Number(z.zeile),
            formel: Number(z.formel),
            ausdruck: z.ausdruck,
            variable: z.variable,
          })),
    menge: p.menge as Menge | null,
  };
}
