// SPDX-License-Identifier: AGPL-3.0-or-later
// Hilfen nur für Tests: deterministische IdQuelle und Dateizugriff. Wird von keinem Produktionscode importiert
// und nicht aus dem Paket exportiert.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  AngebotId,
  AuftragsLeistungsverzeichnisId,
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
  Betrag,
  Einheitspreis,
  ElternId,
  Knoten,
  LvInhalt,
  Menge,
  Ordnungszahl,
  OzMaske,
  OzStelle,
  Prozent,
  Summenstand,
} from '@tethys/vertrag';

import { leseGaeb } from './lesen';
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
  readonly menge?: string;
  readonly einheit?: string;
  readonly einheitspreis?: string;
  readonly bedarfMitGesamtbetrag?: boolean;
  readonly bezugspositionId?: string;
  readonly grundpositionId?: string;
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
  };
}

/** Die Fixtures, die der Export und die XSD-Gegenprüfung abdecken. */
export const FIXTURES = ['winzig', 'typisch', 'gross'] as const;
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

/** Eine Fixture als `LvInhalt` mit ihrem Summenstand aus den Sollwerten (der Writer rechnet nicht). */
export function fixtureLv(name: FixtureName): { inhalt: LvInhalt; summen: Summenstand } {
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
        zuschlagskennzeichen: false,
      },
      zuschlag:
        art === 'zuschlag'
          ? {
              prozentsatz: null,
              bezug: {
                art: 'positionen',
                positionen:
                  k.bezugspositionId === undefined
                    ? []
                    : [{ positionId: k.bezugspositionId as PositionId, teilmenge: null }],
              },
            }
          : null,
      kurztext: k.kurztext ?? '',
      langtext: absatz(k.langtext),
      menge: (k.menge ?? null) as Menge | null,
      einheit: k.einheit ?? null,
      einheitspreis: (k.einheitspreis ?? null) as Einheitspreis | null,
      epa: null,
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
  return { inhalt, summen };
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

// --- Exportfälle (Roundtrip, Golden, XSD-Gegenprüfung) ------------------------------------------------------------

/** Fester Zeitpunkt der Test-Exporte (A2: die Uhr liefert der Aufrufer). */
export const TEST_ERSTELLT = { datum: '2026-11-10', zeit: '12:00:00' } as const;

/** Exportoptionen der Tests; X86 bekommt Summen, Zuschlagsbasen und einen erfundenen Auftragnehmer. */
export function exportOptionen(phase: ExportPhase, version: ExportVersion, n: Normiert): SchreibOptionen {
  return {
    phase,
    version,
    erstellt: TEST_ERSTELLT,
    programm: 'Tethys AVA (Test)',
    ...(n.summen === undefined ? {} : { summen: n.summen }),
    ...(n.basen === undefined ? {} : { zuschlagsbasen: n.basen }),
    ...(phase === 'X86' ? { auftragnehmer: 'Auftragnehmer (erfunden)' } : {}),
  };
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

export interface Exportfall {
  /** Dateiname ohne Verzeichnis, z. B. `typisch-X86-3.3.x86`. */
  readonly datei: string;
  readonly n: Normiert;
  readonly phase: ExportPhase;
  readonly version: ExportVersion;
}

/**
 * Alle Exporte der XSD-Gegenprüfung: jede Fixture × X81/X83/X86 × 3.3/3.2 und die gelesenen Inhalte der amtlichen
 * Dateien × X81/X83 × 3.3/3.2 (X86 bräuchte Summen vom Kern).
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
    const { inhalt, summen } = fixtureLv(name);
    const n = normiereKennungen(inhalt, summen);
    for (const phase of ['X81', 'X83', 'X86'] as const)
      for (const version of versionen) faelle.push(fall(name, n, phase, version));
  }
  for (const a of AMTLICH_LESBAR) {
    const n = amtlichLv(a.pfad);
    for (const phase of ['X81', 'X83'] as const)
      for (const version of versionen) faelle.push(fall(a.name, n, phase, version));
  }
  return faelle;
}
