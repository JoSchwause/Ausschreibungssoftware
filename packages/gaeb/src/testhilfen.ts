// SPDX-License-Identifier: AGPL-3.0-or-later
// Hilfen nur für Tests: deterministische IdQuelle und Dateizugriff. Wird von keinem Produktionscode importiert
// und nicht aus dem Paket exportiert.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  AngebotId,
  Aufmass,
  AufmassId,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvZustand,
  BieterId,
  BildId,
  HinweistextId,
  IdQuelle,
  Langtext,
  LangtextBaustein,
  LangtextInline,
  LangtextInnen,
  LeistungsverzeichnisId,
  LosId,
  Position,
  PositionId,
  ProjektId,
  ProtokollId,
  Textlauf,
  TitelId,
  Zeilenumbruch,
} from '@tethys/vertrag';
import type {
  Auftragnehmer,
  Betrag,
  Einheitspreis,
  Einheitspreisanteile,
  ElternId,
  Knoten,
  Kostengruppennummer,
  LvInhalt,
  Menge,
  Ordnungszahl,
  OzMaske,
  OzStelle,
  Positionsmerkmale,
  Prozent,
  Summenstand,
  Zuschlag,
} from '@tethys/vertrag';

import { summenBerechnen, zuschlagsbasen } from '@tethys/kern';
import { leseGaeb } from './lesen';
import { x31Lesen } from './x31';
import type { ExportPhase, ExportVersion, SchreibOptionen } from './schreiben';

/** Zählende IdQuelle: `position-0001`, `titel-0001` … Gleiche Eingabe ergibt gleiche Kennungen. */
export function testIds(): IdQuelle {
  const zaehler = new Map<string, number>();
  const neu = (art: string): string => {
    const n = (zaehler.get(art) ?? 0) + 1;
    zaehler.set(art, n);
    return `${art}-${String(n).padStart(4, '0')}`;
  };
  return {
    projekt: () => neu('projekt') as ProjektId,
    leistungsverzeichnis: () => neu('lv') as LeistungsverzeichnisId,
    auftragsLeistungsverzeichnis: () => neu('auftrags-lv') as AuftragsLeistungsverzeichnisId,
    angebot: () => neu('angebot') as AngebotId,
    bieter: () => neu('bieter') as BieterId,
    protokoll: () => neu('protokoll') as ProtokollId,
    bild: () => neu('bild') as BildId,
    los: () => neu('los') as LosId,
    titel: () => neu('titel') as TitelId,
    position: () => neu('position') as PositionId,
    hinweistext: () => neu('hinweis') as HinweistextId,
    papierkorbeintrag: () => neu('papierkorb') as ReturnType<IdQuelle['papierkorbeintrag']>,
    lvStand: () => neu('lv-stand') as ReturnType<IdQuelle['lvStand']>,
    // v1.4: mechanisch angepasst, Folgeticket (Ticket 83: X31 legt Aufmaßblätter an)
    aufmass: () => neu('aufmass') as ReturnType<IdQuelle['aufmass']>,
    rechnung: () => neu('rechnung') as ReturnType<IdQuelle['rechnung']>,
    kostenermittlung: () => neu('kostenermittlung') as ReturnType<IdQuelle['kostenermittlung']>,
    // v1.6: mechanisch angepasst, Folgeticket (vertrag v1.6 verlangt die Kennungen der neuen Aggregate)
    bauwerksmodell: () => neu('bauwerksmodell') as ReturnType<IdQuelle['bauwerksmodell']>,
    bauzeitenplan: () => neu('bauzeitenplan') as ReturnType<IdQuelle['bauzeitenplan']>,
    vorgang: () => neu('vorgang') as ReturnType<IdQuelle['vorgang']>,
    honorarberechnung: () => neu('honorarberechnung') as ReturnType<IdQuelle['honorarberechnung']>,
    mangel: () => neu('mangel') as ReturnType<IdQuelle['mangel']>,
    bautagebucheintrag: () => neu('bautagebucheintrag') as ReturnType<IdQuelle['bautagebucheintrag']>,
    // v1.7b: mechanisch angepasst (vertrag v1.7b verlangt die Kennung einer Zahlung, Ticket 128)
    zahlung: () => neu('zahlung') as ReturnType<IdQuelle['zahlung']>,
  };
}

/** Ersatzwert des Aufrufers für den MwSt-Satz in Tests. */
export const TEST_MWST = '19.00' as Prozent;

const WURZEL = new URL('../../..', import.meta.url).pathname;

/** Liest eine Datei relativ zur Repo-Wurzel (Fixtures dürfen nur Tests lesen). */
export function lesePfad(relativ: string): Uint8Array {
  return new Uint8Array(readFileSync(join(WURZEL, relativ)));
}

/** Liest eine Datei unter `packages/gaeb/testdaten/`. */
export function leseTestdatei(relativ: string): Uint8Array {
  return lesePfad(join('packages/gaeb/testdaten', relativ));
}

/** Eine Position ohne jedes Merkmal und ohne Zuschlag (die „normale“ Position). */
export function ohneMerkmale(p: Position | undefined): boolean {
  if (p === undefined) return false;
  const m = p.merkmale;
  return (
    p.zuschlag === null &&
    m.bedarf === null &&
    m.wahl === null &&
    !m.stundenlohn &&
    !m.pauschal &&
    !m.zuschlagskennzeichen
  );
}

type Baustein = LangtextBaustein | Textlauf | Zeilenumbruch;

/** Alle Bausteine eines Langtexts in Lesereihenfolge, auch die in Absätzen, Listen, Tabellen und Ergänzungen. */
export function alleBausteine(l: Langtext | LangtextInnen | readonly LangtextInline[]): Baustein[] {
  const aus: Baustein[] = [];
  for (const b of l) {
    aus.push(b);
    if (b.art === 'absatz') aus.push(...alleBausteine(b.inhalt));
    else if (b.art === 'liste') for (const punkt of b.punkte) aus.push(...alleBausteine(punkt));
    else if (b.art === 'tabelle')
      for (const z of b.zeilen) for (const zelle of z.zellen) aus.push(...alleBausteine(zelle.inhalt));
    else if (b.art === 'ergaenzung') aus.push(...b.davor, ...b.inhalt, ...b.danach);
  }
  return aus;
}

// --- Fixtures als Vertragstypen (Ticket 40) ---------------------------------------------------------------------

interface FxKnoten {
  readonly id: string;
  readonly parentId: string;
  readonly art: 'titel' | 'hinweis' | 'position';
  readonly ordnungszahl?: string;
  readonly ozIndex?: string;
  readonly kurztext?: string;
  readonly langtext?: string;
  readonly text?: string;
  readonly positionsart?: 'normal' | 'bedarf' | 'wahl' | 'zuschlag';
  readonly menge?: string | null;
  readonly einheit?: string | null;
  readonly einheitspreis?: string | null;
  readonly bedarfMitGesamtbetrag?: boolean;
  readonly grundpositionId?: string;
  /**
   * Zuschlag in Vertragsform (`zuschlag.json` seit Ticket 37; `typisch`, `gross` seit Ticket 51: Fixture-Format,
   * mechanisch). Kennzeichen und Einheitspreisanteile nur in `zuschlag.json`.
   */
  readonly zuschlag?: Zuschlag;
  readonly zuschlagskennzeichen?: boolean;
  readonly epa?: Einheitspreisanteile;
}

interface FxLv {
  readonly id: string;
  readonly name: string;
  readonly ozMaske: string;
  readonly mwstSatz: string;
  readonly nachlass: { readonly art: 'prozent' | 'betrag'; readonly wert: string } | null;
  readonly knoten: readonly FxKnoten[];
  readonly sollwerte: {
    readonly positionen: Readonly<Record<string, { readonly gp: string | null; readonly inSumme: boolean }>>;
    readonly titel: Readonly<Record<string, { readonly summe: string }>>;
    readonly summen: Readonly<Record<'netto' | 'nachlass' | 'nettoNachNachlass' | 'mwst' | 'brutto', string>>;
    /** Basis und Betrag je Zuschlagsposition (für `ITMarkup` in X86); `zuschlag`, seit Ticket 51 auch `typisch`, `gross`. */
    readonly zuschlaege?: Readonly<Record<string, { readonly basis: string; readonly betrag: string }>>;
  };
}

/** Die Fixtures, die Export, eigene Prüfung, Roundtrip und XSD-Gegenprüfung abdecken (Ticket 40 §6, D-18). */
export const FIXTURES = ['winzig', 'typisch', 'gross', 'zuschlag'] as const;

/** Kostengruppen, die `mitKostengruppen` reihum vergibt (Ebene 1 bis 3, Ticket 84). */
export const TEST_KOSTENGRUPPEN = ['300', '330', '341', '420'] as const;

/**
 * Das LV mit einer Kostengruppe an jeder zweiten Position, reihum aus `TEST_KOSTENGRUPPEN` (Ticket 84). Die Fixtures
 * tragen keine; die übrigen Positionen bleiben ohne, damit der Rundweg auch „fehlt“ prüft.
 */
export function mitKostengruppen(inhalt: LvInhalt): LvInhalt {
  let n = 0;
  const knoten = inhalt.knoten.map((k): Knoten => {
    if (k.art !== 'position') return k;
    n += 1;
    if (n % 2 === 0) return k;
    const kg = TEST_KOSTENGRUPPEN[Math.floor(n / 2) % TEST_KOSTENGRUPPEN.length] ?? '300';
    return { ...k, kostengruppe: kg as Kostengruppennummer };
  });
  return { ...inhalt, knoten };
}
export type FixtureName = (typeof FIXTURES)[number];

/** Maske aus der Fixture-Schreibweise `NN.NN.NNNN[I]: Erläuterung`. */
function fxMaske(text: string): OzMaske {
  const muster = text.split(':')[0] ?? '';
  const index = muster.includes('[I]');
  const teile = muster.replace('[I]', '').split('.');
  const stelle = (t: string): OzStelle => ({ laenge: t.length, zeichen: 'numerisch' });
  return {
    gliederung: teile.slice(0, -1).map(stelle),
    position: stelle(teile.at(-1) ?? 'NNNN'),
    index: index ? { laenge: 1, zeichen: 'alphanumerisch' } : null,
    trennzeichen: '.',
  };
}

const absatz = (text: string | undefined): Langtext =>
  text === undefined || text === '' ? [] : [{ art: 'absatz', inhalt: [{ art: 'text', text }] }];

/**
 * Eine Fixture als `LvInhalt` mit ihrem Summenstand und den Zuschlagsbasen aus den Sollwerten (der Writer rechnet
 * nicht).
 */
export function fixtureLv(name: FixtureName): {
  inhalt: LvInhalt;
  summen: Summenstand;
  basen?: ReadonlyMap<PositionId, Betrag>;
} {
  const fx = JSON.parse(new TextDecoder().decode(lesePfad(`fixtures/${name}.json`))) as FxLv;
  const folge = new Map<string, number>();
  const knoten = fx.knoten.map((k): Knoten => {
    const reihenfolge = folge.get(k.parentId) ?? 0;
    folge.set(k.parentId, reihenfolge + 1);
    const lage = { elternId: k.parentId as ElternId, reihenfolge };
    if (k.art === 'titel')
      return {
        ...lage,
        art: 'titel',
        id: k.id as TitelId,
        ordnungszahl: (k.ordnungszahl ?? null) as Ordnungszahl | null,
        kurztext: k.kurztext ?? '',
      };
    if (k.art === 'hinweis')
      return { ...lage, art: 'hinweis', id: k.id as HinweistextId, text: absatz(k.text) };
    const art = k.positionsart ?? 'normal';
    return {
      ...lage,
      art: 'position',
      id: k.id as PositionId,
      ordnungszahl: (k.ordnungszahl ?? null) as Ordnungszahl | null,
      ozIndex: k.ozIndex ?? null,
      merkmale: {
        bedarf:
          art === 'bedarf'
            ? k.bedarfMitGesamtbetrag === true
              ? 'mit-gesamtbetrag'
              : 'ohne-gesamtbetrag'
            : null,
        wahl:
          art === 'wahl'
            ? {
                gruppe: null,
                variante: null,
                grundpositionId: (k.grundpositionId ?? null) as PositionId | null,
              }
            : null,
        stundenlohn: false,
        pauschal: false,
        zuschlagskennzeichen: k.zuschlagskennzeichen === true,
      },
      zuschlag: k.zuschlag ?? null, // Ticket 51: Fixture-Format, mechanisch (keine Altform mehr in den Fixtures)
      kurztext: k.kurztext ?? '',
      langtext: absatz(k.langtext),
      menge: (k.menge ?? null) as Menge | null,
      einheit: k.einheit ?? null,
      einheitspreis: (k.einheitspreis ?? null) as Einheitspreis | null,
      epa: k.epa ?? null,
    };
  });
  const inhalt: LvInhalt = {
    name: fx.name,
    ozMaske: fxMaske(fx.ozMaske),
    mwstSatz: fx.mwstSatz as Prozent,
    nachlass:
      fx.nachlass === null
        ? null
        : fx.nachlass.art === 'prozent'
          ? { art: 'prozent', wert: fx.nachlass.wert as Prozent }
          : { art: 'betrag', wert: fx.nachlass.wert as Betrag },
    wurzelId: fx.id as LeistungsverzeichnisId,
    knoten,
  };
  const s = fx.sollwerte;
  const summen: Summenstand = {
    positionen: Object.entries(s.positionen).map(([id, p]) => ({
      positionId: id as PositionId,
      gesamtpreis: p.gp as Betrag | null,
      gehtInSummeEin: p.inSumme,
    })),
    gliederungen: Object.entries(s.titel).map(([id, t]) => ({
      gliederungId: id as TitelId,
      summe: t.summe as Betrag,
    })),
    gesamt: {
      netto: s.summen.netto as Betrag,
      nachlass: s.summen.nachlass as Betrag,
      nettoNachNachlass: s.summen.nettoNachNachlass as Betrag,
      mwst: s.summen.mwst as Betrag,
      brutto: s.summen.brutto as Betrag,
    },
  };
  if (s.zuschlaege === undefined) return { inhalt, summen };
  const basen = new Map(
    Object.entries(s.zuschlaege).map(([id, z]) => [id as PositionId, z.basis as Betrag] as const),
  );
  return { inhalt, summen, basen };
}

// --- Kennungen vergleichbar machen ------------------------------------------------------------------------------

export interface Normiert {
  readonly inhalt: LvInhalt;
  readonly summen?: Summenstand;
  readonly basen?: ReadonlyMap<PositionId, Betrag>;
}

/**
 * Ersetzt alle Kennungen durch die der zählenden `testIds()` in der Reihenfolge, in der der Leser sie vergibt
 * (Baum in Dokumentreihenfolge, Bilder in Lesereihenfolge), und ordnet die Knoten so. Summen und Zuschlagsbasen
 * werden mit umbenannt. So sind ein Ausgangsmodell und das wieder gelesene Modell direkt vergleichbar.
 */
export function normiereKennungen(
  inhalt: LvInhalt,
  summen?: Summenstand,
  basen?: ReadonlyMap<PositionId, Betrag>,
): Normiert {
  const ids = testIds();
  const neu = new Map<string, string>();
  const kinder = new Map<string, Knoten[]>();
  for (const k of inhalt.knoten) kinder.set(k.elternId, [...(kinder.get(k.elternId) ?? []), k]);
  const folge: Knoten[] = [];
  const besuche = (eltern: string): void => {
    for (const k of [...(kinder.get(eltern) ?? [])].sort((a, b) => a.reihenfolge - b.reihenfolge)) {
      folge.push(k);
      besuche(k.id);
    }
  };
  besuche(inhalt.wurzelId);
  neu.set(inhalt.wurzelId, ids.leistungsverzeichnis());
  const bilder = <T extends LangtextBaustein>(l: readonly T[]): T[] =>
    l.map((b): T => {
      if (b.art === 'bild') return { ...b, bild: { ...b.bild, id: ids.bild() } };
      if (b.art === 'absatz') return { ...b, inhalt: bilder(b.inhalt) };
      if (b.art === 'liste') return { ...b, punkte: b.punkte.map((p) => bilder(p)) };
      if (b.art === 'tabelle')
        return {
          ...b,
          zeilen: b.zeilen.map((z) => ({
            zellen: z.zellen.map((c) => ({ ...c, inhalt: bilder(c.inhalt) })),
          })),
        };
      return b;
    });
  const vergib = (k: Knoten): string => {
    const id =
      k.art === 'los'
        ? ids.los()
        : k.art === 'titel'
          ? ids.titel()
          : k.art === 'hinweis'
            ? ids.hinweistext()
            : ids.position();
    neu.set(k.id, id);
    return id;
  };
  const zwischen = folge.map((k): Knoten => {
    const id = vergib(k);
    if (k.art === 'los') return { ...k, id: id as LosId };
    if (k.art === 'titel') return { ...k, id: id as TitelId };
    if (k.art === 'hinweis') return { ...k, id: id as HinweistextId, text: bilder(k.text) };
    const langtext = bilder(k.langtext);
    const leit = k.leitbeschreibung;
    return {
      ...k,
      id: id as PositionId,
      langtext,
      ...(leit === undefined
        ? {}
        : {
            leitbeschreibung: {
              unterbeschreibungen: leit.unterbeschreibungen.map((u) => ({
                ...u,
                langtext: bilder(u.langtext),
              })),
            },
          }),
    };
  });
  const n = <T extends string>(id: T): T => (neu.get(id) ?? id) as T;
  const knoten = zwischen.map((k): Knoten => {
    if (k.art !== 'position') return { ...k, elternId: n(k.elternId) };
    const wahl = k.merkmale.wahl;
    const z = k.zuschlag;
    return {
      ...k,
      elternId: n(k.elternId),
      merkmale: {
        ...k.merkmale,
        wahl:
          wahl === null
            ? null
            : { ...wahl, grundpositionId: wahl.grundpositionId === null ? null : n(wahl.grundpositionId) },
      },
      zuschlag:
        z === null || z.bezug.art !== 'positionen'
          ? z
          : {
              ...z,
              bezug: {
                art: 'positionen',
                positionen: z.bezug.positionen.map((b) => ({ ...b, positionId: n(b.positionId) })),
              },
            },
    };
  });
  return {
    inhalt: { ...inhalt, wurzelId: n(inhalt.wurzelId), knoten },
    ...(summen === undefined
      ? {}
      : {
          summen: {
            positionen: summen.positionen.map((p) => ({ ...p, positionId: n(p.positionId) })),
            gliederungen: summen.gliederungen.map((g) => ({ ...g, gliederungId: n(g.gliederungId) })),
            gesamt: summen.gesamt,
          },
        }),
    ...(basen === undefined ? {} : { basen: new Map([...basen].map(([k, v]) => [n(k), v])) }),
  };
}

// --- Kleine LVs von Hand (Writer-Tests, XSD-Gegenprüfung) ---------------------------------------------------------

export const LV = 'lv-1' as LeistungsverzeichnisId;

export const KEINE_MERKMALE: Positionsmerkmale = {
  bedarf: null,
  wahl: null,
  stundenlohn: false,
  pauschal: false,
  zuschlagskennzeichen: false,
};

export const titel = (id: string, oz: string | null, reihenfolge = 0, eltern: string = LV): Knoten => ({
  art: 'titel',
  id: id as TitelId,
  elternId: eltern as ElternId,
  reihenfolge,
  ordnungszahl: oz as Ordnungszahl | null,
  kurztext: `Titel ${id}`,
});

export function position(
  id: string,
  oz: string | null,
  reihenfolge: number,
  ueber: Partial<Position> = {},
): Position {
  return {
    art: 'position',
    id: id as PositionId,
    elternId: 't1' as ElternId,
    reihenfolge,
    ordnungszahl: oz as Ordnungszahl | null,
    ozIndex: null,
    merkmale: KEINE_MERKMALE,
    zuschlag: null,
    kurztext: `Position ${id}`,
    langtext: [],
    menge: '1.000' as Menge,
    einheit: 'm',
    einheitspreis: null,
    epa: null,
    ...ueber,
  };
}

/**
 * Ein LV mit leeren Langtext-Strukturen (v1.3, D-22 (iii)): leere Liste, Tabelle ohne Zeilen, Zeile ohne Zellen, auch
 * verschachtelt, in Position, Hinweistext und Unterbeschreibung. Der Writer verwirft sie mit Warnung; die
 * XSD-Gegenprüfung zeigt, dass der Export gültig bleibt.
 */
export function leereStrukturenLv(): Normiert {
  const leer: Langtext = [
    { art: 'liste', geordnet: false, punkte: [] },
    { art: 'tabelle', zeilen: [] },
    { art: 'tabelle', zeilen: [{ zellen: [] }] },
    {
      art: 'liste',
      geordnet: true,
      punkte: [
        [
          { art: 'text', text: 'Punkt' },
          { art: 'liste', geordnet: false, punkte: [] },
        ],
      ],
    },
    {
      art: 'tabelle',
      zeilen: [
        { zellen: [] },
        { zellen: [{ spalten: 1, inhalt: [{ art: 'tabelle', zeilen: [{ zellen: [] }] }] }] },
      ],
    },
  ];
  const hinweis: Knoten = {
    art: 'hinweis',
    id: 'h1' as HinweistextId,
    elternId: 't1' as ElternId,
    reihenfolge: 0,
    text: leer,
  };
  const p = position('p1', '01.0010', 1, {
    langtext: leer,
    leitbeschreibung: {
      unterbeschreibungen: [{ nummer: '1', kurztext: 'U', langtext: leer, menge: null, einheit: null }],
    },
  });
  const inhalt: LvInhalt = {
    name: 'Leere Strukturen',
    ozMaske: {
      gliederung: [{ laenge: 2, zeichen: 'numerisch' }],
      position: { laenge: 4, zeichen: 'numerisch' },
      index: null,
      trennzeichen: '.',
    },
    mwstSatz: '19.00' as Prozent,
    nachlass: null,
    wurzelId: LV,
    knoten: [titel('t1', '01'), hinweis, p],
  };
  const b = (x: string): Betrag => x as Betrag;
  const summen: Summenstand = {
    positionen: [{ positionId: 'p1' as PositionId, gesamtpreis: null, gehtInSummeEin: true }],
    gliederungen: [{ gliederungId: 't1' as TitelId, summe: b('0.00') }],
    gesamt: {
      netto: b('0.00'),
      nachlass: b('0.00'),
      nettoNachNachlass: b('0.00'),
      mwst: b('0.00'),
      brutto: b('0.00'),
    },
  };
  return normiereKennungen(inhalt, summen);
}

/** Ein LV mit allem, was der Vertrag trägt: Los, Merkmale, Wahl, Zuschläge, Leitbeschreibung, EPA, Langtext, Kopf. */
export function reichesLv(): {
  inhalt: LvInhalt;
  summen: Summenstand;
  basen: ReadonlyMap<PositionId, Betrag>;
} {
  const maske: LvInhalt['ozMaske'] = {
    gliederung: [
      { laenge: 1, zeichen: 'numerisch' },
      { laenge: 2, zeichen: 'alphanumerisch' },
    ],
    losStufe: true,
    position: { laenge: 4, zeichen: 'numerisch' },
    index: { laenge: 1, zeichen: 'alphanumerisch' },
    trennzeichen: '.',
  };
  const los: Knoten = {
    art: 'los',
    id: 'los1' as LosId,
    elternId: LV as ElternId,
    reihenfolge: 0,
    ordnungszahl: '1' as Ordnungszahl,
    kurztext: 'Los 1',
  };
  const t = { ...titel('t1', '1.A1', 0, 'los1'), kurztext: 'Rohbau & Ausbau <innen>' };
  const hinweis: Knoten = {
    art: 'hinweis',
    id: 'h1' as HinweistextId,
    elternId: 't1' as ElternId,
    reihenfolge: 0,
    text: [{ art: 'absatz', inhalt: [{ art: 'text', text: 'Vorbemerkung', fett: true }] }],
  };
  const pos = (id: string, oz: string, r: number, ueber: Partial<Position> = {}): Position =>
    position(id, oz, r, { einheitspreis: '10.000' as Einheitspreis, ...ueber });
  const keine = KEINE_MERKMALE;
  const knoten: Knoten[] = [
    los,
    t,
    hinweis,
    pos('a', '1.A1.0010', 1, {
      merkmale: { ...keine, zuschlagskennzeichen: true, pauschal: true },
      langtext: [
        {
          art: 'absatz',
          inhalt: [
            { art: 'text', text: 'Normal, ' },
            { art: 'text', text: 'fett', fett: true },
            { art: 'umbruch' },
            { art: 'text', text: 'kursiv unterstrichen', kursiv: true, unterstrichen: true },
          ],
        },
        {
          art: 'liste',
          geordnet: true,
          punkte: [
            [{ art: 'absatz', inhalt: [{ art: 'text', text: 'eins' }] }],
            [{ art: 'text', text: 'zwei' }],
          ],
        },
        {
          art: 'tabelle',
          zeilen: [
            {
              zellen: [{ spalten: 2, inhalt: [{ art: 'absatz', inhalt: [{ art: 'text', text: 'Kopf' }] }] }],
            },
            {
              zellen: [
                { spalten: 1, inhalt: [{ art: 'text', text: 'A' }] },
                { spalten: 1, inhalt: [] },
              ],
            },
          ],
        },
        {
          art: 'absatz',
          inhalt: [
            { art: 'bild', bild: { id: 'bild-x' as never, medientyp: 'image/png', daten: 'iVBORw0KGgo=' } },
          ],
        },
        { art: 'bild', bild: { id: 'bild-y' as never, medientyp: 'image/gif', daten: 'R0lGODlh' } },
        {
          art: 'ergaenzung',
          herkunft: 'bieter',
          kennung: '1',
          leer: true,
          davor: [{ art: 'text', text: 'Fabrikat: ' }],
          inhalt: [],
          danach: [{ art: 'text', text: ' o. glw.' }],
        },
        {
          art: 'ergaenzung',
          herkunft: 'ausschreibender',
          kennung: '2',
          leer: false,
          davor: [],
          inhalt: [{ art: 'text', text: 'B25' }],
          danach: [],
        },
      ],
      epa: {
        lohn: '4.000' as Einheitspreis,
        stoffe: '3.000' as Einheitspreis,
        geraete: null,
        nachunternehmer: '1.000' as Einheitspreis,
        sonstiges: null,
        frei: '2.000' as Einheitspreis,
        // v1.3: Die Bezeichnung des freien Anteils steht in `epaBezeichnungen` (D-53.6).
        freiBezeichnung: null,
      },
    }),
    pos('b', '1.A1.0020', 2, {
      merkmale: { ...keine, bedarf: 'ohne-gesamtbetrag', stundenlohn: true, zuschlagskennzeichen: true },
      menge: '12.500' as Menge,
      einheit: 'h',
    }),
    pos('c', '1.A1.0030', 3, {
      merkmale: { ...keine, wahl: { gruppe: 1, variante: 0, grundpositionId: null } },
    }),
    pos('d', '1.A1.0030', 4, {
      ozIndex: 'A',
      merkmale: {
        ...keine,
        bedarf: 'mit-gesamtbetrag',
        wahl: { gruppe: 1, variante: 1, grundpositionId: 'c' as PositionId },
      },
    }),
    pos('e', '1.A1.0040', 5, {
      leitbeschreibung: {
        unterbeschreibungen: [
          {
            nummer: '01',
            kurztext: 'Teil 1',
            langtext: [{ art: 'absatz', inhalt: [{ art: 'text', text: 'Text 1' }] }],
            menge: '2.000' as Menge,
            einheit: 'St',
          },
          { nummer: '2', kurztext: 'Teil 2', langtext: [], menge: null, einheit: null },
        ],
      },
    }),
    pos('z1', '1.A1.0050', 6, {
      menge: null,
      einheit: null,
      einheitspreis: null,
      zuschlag: {
        prozentsatz: '10.00' as Prozent,
        bezug: {
          art: 'positionen',
          positionen: [
            { positionId: 'a' as PositionId, teilmenge: null },
            { positionId: 'e' as PositionId, teilmenge: '0.500' as Menge },
          ],
        },
      },
    }),
    pos('z2', '1.A1.0060', 7, {
      menge: null,
      einheit: null,
      einheitspreis: null,
      zuschlag: { prozentsatz: '5.50' as Prozent, bezug: { art: 'gliederung' } },
    }),
    pos('z3', '1.A1.0070', 8, {
      menge: null,
      einheit: null,
      einheitspreis: null,
      merkmale: { ...keine, bedarf: 'mit-gesamtbetrag' },
      zuschlag: { prozentsatz: '3.00' as Prozent, bezug: { art: 'kennzeichnung' } },
    }),
  ].map((k) => (k.art === 'position' ? { ...k, elternId: 't1' as ElternId } : k));
  const inhalt: LvInhalt = {
    name: 'Reiches LV (erfunden), mit allem, was der Vertrag trägt',
    ozMaske: maske,
    mwstSatz: '7.00' as Prozent,
    nachlass: { art: 'betrag', wert: '12.34' as Betrag },
    auftraggeber: {
      name: 'Gemeinde Musterstadt',
      strasse: 'Am Markt 1',
      plz: '12345',
      ort: 'Musterstadt',
      vergabenummer: 'V-1',
    },
    auftragnehmer: {
      name: 'Beispielbau (erfunden)',
      strasse: 'Werkstraße 2',
      plz: '54321',
      ort: 'Beispielhausen',
    },
    // v1.3 (D-28): andere Reihenfolge als die feste Belegung, eine Lücke (5) und eine leere Beschriftung (3).
    epaBezeichnungen: [
      { nummer: 1, anteil: 'stoffe', bezeichnung: 'Material' },
      { nummer: 2, anteil: 'lohn', bezeichnung: 'Lohn' },
      { nummer: 3, anteil: 'geraete', bezeichnung: null },
      { nummer: 4, anteil: 'nachunternehmer', bezeichnung: 'Nachunternehmer' },
      { nummer: 6, anteil: 'frei', bezeichnung: 'Entsorgung' },
    ],
    vergabeinformationen: {
      eroeffnungsdatum: null,
      eroeffnungszeit: null,
      abgabeort: null,
      ausfuehrungsbeginn: '2027-03-01',
      ausfuehrungsende: '2027-09-30',
      auftragsnummer: 'A-17',
      auftragsdatum: '2027-02-01',
      abnahmeart: 'förmlich',
      gewaehrleistung: { dauer: 5, einheit: 'Years' },
    },
    wurzelId: LV,
    knoten,
  };
  const b = (s: string): Betrag => s as Betrag;
  const summen: Summenstand = {
    positionen: ['a', 'b', 'c', 'd', 'e', 'z1', 'z2', 'z3'].map((id) => ({
      positionId: id as PositionId,
      gesamtpreis: b('10.00'),
      gehtInSummeEin: true,
    })),
    gliederungen: [
      { gliederungId: 'los1' as LosId, summe: b('80.00') },
      { gliederungId: 't1' as TitelId, summe: b('80.00') },
    ],
    gesamt: {
      netto: b('80.00'),
      nachlass: b('12.34'),
      nettoNachNachlass: b('67.66'),
      mwst: b('4.74'),
      brutto: b('72.40'),
    },
  };
  const basen = new Map<PositionId, Betrag>([
    ['z1' as PositionId, b('15.00')],
    ['z2' as PositionId, b('50.00')],
    ['z3' as PositionId, b('20.00')],
  ]);
  return { inhalt, summen, basen };
}

// --- Exportfälle (Roundtrip, Golden, XSD-Gegenprüfung) ------------------------------------------------------------

/** Fester Zeitpunkt der Test-Exporte (A2: die Uhr liefert der Aufrufer). */
export const TEST_ERSTELLT = { datum: '2026-11-10', zeit: '12:00:00' } as const;

/** Exportoptionen der Tests; X86 bekommt Summen und Zuschlagsbasen. */
export function exportOptionen(phase: ExportPhase, version: ExportVersion, n: Normiert): SchreibOptionen {
  return {
    phase,
    version,
    erstellt: TEST_ERSTELLT,
    programm: 'Tethys AVA (Test)',
    ...(n.summen === undefined ? {} : { summen: n.summen }),
    ...(n.basen === undefined ? {} : { zuschlagsbasen: n.basen }),
  };
}

/** Erfundener Auftragnehmer der X86-Exporte (C4: kein echter Name). */
export const ERFUNDENER_AUFTRAGNEHMER: Auftragnehmer = {
  name: 'Auftragnehmer (erfunden)',
  strasse: null,
  plz: null,
  ort: null,
};

/** Der Inhalt ohne Auftragnehmer: so liest ihn eine X81/X83 wieder (CTR gibt es nur in X86). */
export function ohneAuftragnehmer(inhalt: LvInhalt): LvInhalt {
  const kopie = { ...inhalt };
  Reflect.deleteProperty(kopie, 'auftragnehmer');
  return kopie;
}

/**
 * Der Inhalt, den die Tests in eine Phase schreiben: X86 ist die Auftragserteilung und bekommt den erfundenen
 * Auftragnehmer, wenn das LV keinen hat (v1.3, Ticket 68: der Auftragnehmer kommt aus dem Modell, nicht aus einer Option).
 */
export function exportInhalt(phase: ExportPhase, n: Normiert): LvInhalt {
  return phase === 'X86' && n.inhalt.auftragnehmer === undefined
    ? { ...n.inhalt, auftragnehmer: ERFUNDENER_AUFTRAGNEHMER }
    : n.inhalt;
}

/** Amtliche 3.3-Dateien, deren gelesener Inhalt als X81/X83 wieder geschrieben wird. */
export const AMTLICH_LESBAR = [
  { name: 'bvbs-ava', pfad: 'fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X81' },
  {
    name: 'bvbs-bauausfuehrung',
    pfad: 'fixtures/extern/bvbs/3.3-bauausfuehrung/Pruefdatei_3.3_Bauausfuehrung_V-04-04-2024.x83',
  },
  {
    name: 'bvbs-texterstellung',
    pfad: 'fixtures/extern/bvbs/3.3-texterstellung/Pruefdatei_3.3_Texterstellung_V-11-06-2021.x81',
  },
] as const;

/** Inhalt einer amtlichen Datei, wie der Leser ihn liefert, mit normierten Kennungen. */
export function amtlichLv(pfad: string): Normiert {
  const l = leseGaeb(lesePfad(pfad), { ids: testIds(), standardMwstSatz: TEST_MWST });
  if (l.inhalt === null) throw new Error(`${pfad}: kein Inhalt`);
  return normiereKennungen(l.inhalt);
}

/** Die amtlichen Musterdateien GAEB DA XML 3.1 mit LV (Ticket 129); die X84 ist ein Angebot. */
export const AMTLICH_31 = [
  'Musterdatei_3.1_2008-001.X81',
  'Musterdatei_3.1_2008-001.X83',
  'Musterdatei_3.1_2008-001.X86',
  'Musterdatei_3.1_2008-002.X86',
  'Musterdatei_3.1_2008-003.X86',
  'Musterdatei_3.1_2008-004.X83',
  'Musterdatei_3.1_2008-004.X86',
] as const;

/**
 * Inhalt einer 3.1-Musterdatei wie `amtlichLv`, dazu die Phase der Datei und für X86 Summen und Zuschlagsbasen vom Kern
 * (der Writer rechnet nicht).
 */
export function amtlich31Lv(datei: (typeof AMTLICH_31)[number]): { n: Normiert; phase: ExportPhase } {
  const phase = `X${datei.slice(-2)}` as ExportPhase;
  const l = leseGaeb(lesePfad(`fixtures/extern/gaeb/3.1-musterdateien/${datei}`), {
    ids: testIds(),
    dateiname: datei,
    standardMwstSatz: TEST_MWST,
  });
  if (l.inhalt === null) throw new Error(`${datei}: kein Inhalt`);
  if (phase !== 'X86') return { n: normiereKennungen(l.inhalt), phase };
  const lv = { ...l.inhalt, id: l.inhalt.wurzelId };
  const basen = new Map([...zuschlagsbasen(lv)].map(([id, z]) => [id, z.basis] as const));
  return { n: normiereKennungen(l.inhalt, summenBerechnen(lv), basen), phase };
}

export interface Exportfall {
  /** Dateiname ohne Verzeichnis, z. B. `typisch-X86-3.3.x86`. */
  readonly datei: string;
  readonly n: Normiert;
  readonly phase: ExportPhase;
  readonly version: ExportVersion;
}

/**
 * Alle Exporte der XSD-Gegenprüfung: jede Fixture, `reichesLv` und `leereStrukturenLv` × X81/X83/X86 × 3.3/3.2 und die gelesenen Inhalte der amtlichen
 * Dateien × X81/X83 × 3.3/3.2 (X86 bräuchte Summen vom Kern), dazu die gelesenen 3.1-Musterdateien in ihrer Phase × 3.3/3.2
 * (Ticket 129, Summen vom Kern).
 */
export function exportfaelle(): Exportfall[] {
  const faelle: Exportfall[] = [];
  const versionen: readonly ExportVersion[] = ['3.3', '3.2'];
  const fall = (name: string, n: Normiert, phase: ExportPhase, version: ExportVersion): Exportfall => ({
    datei: `${name}-${phase}-${version}.${phase.toLowerCase()}`,
    n,
    phase,
    version,
  });
  for (const name of FIXTURES) {
    const { inhalt, summen, basen } = fixtureLv(name);
    const n = normiereKennungen(inhalt, summen, basen);
    for (const phase of ['X81', 'X83', 'X86'] as const)
      for (const version of versionen) faelle.push(fall(name, n, phase, version));
  }
  const r = reichesLv();
  const reich = normiereKennungen(r.inhalt, r.summen, r.basen);
  for (const phase of ['X81', 'X83', 'X86'] as const)
    for (const version of versionen) faelle.push(fall('reich', reich, phase, version));
  // Ticket 84: Kostengruppen als Katalogzuordnung (Ctlg im BoQInfo, CtlgAssign an Item und MarkupItem).
  const t = fixtureLv('typisch');
  const mitKg = normiereKennungen(mitKostengruppen(t.inhalt), t.summen, t.basen);
  for (const phase of ['X81', 'X83', 'X86'] as const)
    for (const version of versionen) faelle.push(fall('typisch-kg', mitKg, phase, version));
  const leer = leereStrukturenLv();
  for (const phase of ['X81', 'X83', 'X86'] as const)
    for (const version of versionen) faelle.push(fall('leer', leer, phase, version));
  for (const a of AMTLICH_LESBAR) {
    const n = amtlichLv(a.pfad);
    for (const phase of ['X81', 'X83'] as const)
      for (const version of versionen) faelle.push(fall(a.name, n, phase, version));
  }
  // Ticket 129: die gelesenen 3.1-Musterdateien, in ihrer Phase als 3.3 und 3.2 geschrieben.
  for (const datei of AMTLICH_31) {
    const { n, phase } = amtlich31Lv(datei);
    const name = `gaeb31-${datei.slice('Musterdatei_3.1_'.length, -4)}`;
    for (const version of versionen) faelle.push(fall(name, n, phase, version));
  }
  return faelle;
}

// --- Mengenermittlung X31 (Ticket 83) ----------------------------------------------------------------------------

/** Die BVBS-Prüfdatei Mengenermittlung 3.3 (ohne Endung: `.x31` und die X86 mit dem LV dazu). */
export const BVBS_MENGENERMITTLUNG =
  'fixtures/extern/bvbs/3.3-mengenermittlung/Pruefdatei_3.3_Mengenermittlung_V-11-06-2021';

const NULL_BETRAG = '0.00' as Betrag;

/** Das Auftrags-LV aus einer X86, wie die App es nach dem Zuschlag hält (Summen sind für X31 ohne Belang). */
export function auftragsLvAus(bytes: Uint8Array): AuftragsLvZustand {
  const l = leseGaeb(bytes, { ids: testIds(), standardMwstSatz: TEST_MWST });
  if (l.inhalt === null) throw new Error('Auftrags-LV nicht lesbar');
  const { wurzelId, knoten, ...kopf } = l.inhalt;
  return {
    auftragsLeistungsverzeichnis: {
      ...kopf,
      id: wurzelId as string as AuftragsLeistungsverzeichnisId,
      projektId: 'projekt-1' as ProjektId,
      leistungsverzeichnisId: 'lv-1' as LeistungsverzeichnisId,
      angebotId: 'angebot-1' as AngebotId,
      knoten,
    },
    summen: {
      positionen: [],
      gliederungen: [],
      gesamt: {
        netto: NULL_BETRAG,
        nachlass: NULL_BETRAG,
        nettoNachNachlass: NULL_BETRAG,
        mwst: NULL_BETRAG,
        brutto: NULL_BETRAG,
      },
    },
  };
}

/** Kennung der Position mit dieser OZ (mit Index) im Auftrags-LV. */
export function positionId(lv: AuftragsLvZustand, oz: string): PositionId {
  const p = lv.auftragsLeistungsverzeichnis.knoten.find(
    (k): k is Position => k.art === 'position' && `${k.ordnungszahl ?? ''}${k.ozIndex ?? ''}` === oz,
  );
  if (!p) throw new Error(`keine Position ${oz}`);
  return p.id;
}

export interface X31Exportfall {
  readonly datei: string;
  readonly aufmass: Aufmass;
  readonly lv: AuftragsLvZustand;
  readonly version: ExportVersion;
}

/**
 * Die X31-Exporte der XSD-Gegenprüfung: das gelesene Blatt der BVBS-Prüfdatei und ein eigenes Blatt (mehrzeiliger
 * Ausdruck, Bezug, Variable, Menge von Hand, negative Menge) × 3.3/3.2.
 */
export function x31Exportfaelle(): X31Exportfall[] {
  const lv = auftragsLvAus(lesePfad(`${BVBS_MENGENERMITTLUNG}.x86`));
  const kopf = {
    id: 'aufmass-1' as AufmassId,
    projektId: 'projekt-1' as ProjektId,
    auftragsLvId: lv.auftragsLeistungsverzeichnis.id,
    nummer: 1,
    bezeichnung: '',
    datum: null,
  };
  const gelesen = x31Lesen(lesePfad(`${BVBS_MENGENERMITTLUNG}.x31`), lv).aufmass;
  if (gelesen === null) throw new Error('BVBS-X31 nicht lesbar');
  const z = (zeile: number, ausdruck: string, variable: string | null = null) => ({
    zeile,
    formel: 91,
    ausdruck,
    variable,
  });
  const eigen: Aufmass = {
    ...kopf,
    positionen: [
      {
        positionId: positionId(lv, '001.001.0010'),
        mengenansatz: [
          z(1, '(12,345 + 23,456 + 34,567 + 45,678) * (1,5 + 2,25) - 7,125 / 3', 'flaeche'),
          z(2, 'flaeche * 0,5 + Z1'),
        ],
        menge: null,
      },
      { positionId: positionId(lv, '001.003.0010'), mengenansatz: null, menge: '-12.500' as Menge },
    ],
  };
  const faelle: X31Exportfall[] = [];
  for (const version of ['3.3', '3.2'] as const) {
    faelle.push({ datei: `aufmass-bvbs-X31-${version}.x31`, aufmass: { ...kopf, ...gelesen }, lv, version });
    faelle.push({ datei: `aufmass-eigen-X31-${version}.x31`, aufmass: eigen, lv, version });
  }
  return faelle;
}
