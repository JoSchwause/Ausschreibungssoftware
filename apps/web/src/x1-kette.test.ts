// SPDX-License-Identifier: AGPL-3.0-or-later
// Tor X1 (Ticket 117, D-58, `plan.md` §4): die Kette X1-Kern und X1-Erweitert ohne Oberfläche, mit den Paketen so, wie die App
// sie ruft. `ifc` liest das Haus (`haus-v1.ifc` als IFC 4 und als IFC 2x3, `haus-v2.ifc`), `bim` legt die Modelle an
// (`BauwerksmodellAnlegen`) → Kern: LV `typisch`, die Zuordnungen (`BauteileZuordnen`) und die Mengenübernahme aus v1 (`bim`
// baut die Ansatzzeilen, `mengen` rechnet die Menge, der Kern führt `MengenansatzSetzen` aus) → `vergabe`: Zuschlag an Bieter A
// wie in M3, ohne Wahl → `bim`: Aufmaßblatt aus der Auswahl „Geschoss EG“ → `abrechnung`: das Blatt → `bim`: Vergleich v1 → v2,
// Folgen für das LV und „Mengen aktualisieren“ → DIN 277 und Kostenschätzung über Kennwerte (`kosten`).
//
// Jede erwartete Zahl steht in `fixtures/typisch-bim.json` (Ticket 99; Herleitung im README der Fixtures, „BIM: Haus und
// Tor X1“), dazu die Summen von `typisch.json` und die Preise von Bieter A aus `typisch-angebote.json`; nie aus einem Lauf der
// Pakete. Die Befehle baut die App mit ihren reinen Bausteinen (`bim/zuordnung`, `bim/uebernahme`, `bim/aufmassblatt`,
// `modellvergleich/folgen`); ausgeführt werden sie von den reinen Ausführern der Pakete, ohne Speicher (wie M4). Die Fixtures
// werden gelesen, nicht importiert (A3).

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { bauwerksmodellBefehlAusfuehren, bauwerksmodellChangeSetAnwenden } from '@tethys/bim';
import { bauwerksmodellLesen } from '@tethys/ifc';
import { lvBefehlAusfuehren, lvChangeSetAnwenden, zuschlagsbasen } from '@tethys/kern';
import { mengenansatzBerechnen } from '@tethys/mengen';
import type {
  Ansatzzeile,
  Bauwerksmodell,
  BauwerksmodellId,
  Ergebnis,
  IfcGlobalId,
  LvBefehl,
  LvZustand,
  Position,
  ProjektId,
  Pruefbefund,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { fixtureInhalt } from '../e2e/fixture-inhalt';
import { uebernahmeBefehle, uebernahmeVorschau } from './bim/uebernahme';
import { bauteileInModellreihenfolge, zuordnenBefehl } from './bim/zuordnung';

// --- Fixtures ------------------------------------------------------------------------------------------------------

const lies = (pfad: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../fixtures/${pfad}`, import.meta.url), 'utf8'));

interface FxMenge {
  readonly name: string;
  readonly art: string;
  readonly wert: string;
}
interface FxBauteil {
  readonly globalId: string;
  readonly kennung: string;
  readonly klasse: string;
  readonly name: string;
  readonly geschoss: string;
  readonly mengen: readonly FxMenge[];
}
type Stand = 'v1' | 'v2';
interface FxModell {
  readonly stand: Stand;
  readonly datei: string;
  readonly schema: 'IFC4' | 'IFC2X3';
  readonly sha256: string;
}
/** Ansatzzeile der Fixture: Zeile und Formel als Text (keine JSON-Zahlen, README „BIM-Set“). */
interface FxZeile {
  readonly zeile: string;
  readonly formel: string;
  readonly ausdruck: string;
  readonly variable: string | null;
}
interface FxVordersatz {
  readonly positionId: string;
  readonly oz: string;
  readonly mengenansatz: readonly FxZeile[];
  readonly zeilenergebnisse: readonly string[];
  readonly menge: string;
}
interface FxZuordnung {
  readonly positionId: string;
  readonly oz: string;
  readonly einheit: string;
  readonly bauteile: readonly { readonly globalId: string; readonly mengenart: string }[];
}
interface FxSummen {
  readonly netto: string;
  readonly nachlass: string;
  readonly nettoNachNachlass: string;
  readonly mwst: string;
  readonly brutto: string;
}
interface FxAusweis {
  readonly summeBedarfOhneGesamtbetrag: string;
  readonly summeWahl: string;
}
/** Sollwerte eines LV in der Form von `typisch.json` (README der Fixtures, „JSON-Form“). */
interface FxSollwerte {
  readonly positionen: Readonly<Record<string, { readonly gp: string | null; readonly inSumme: boolean }>>;
  readonly titel: Readonly<Record<string, { readonly summe: string }>>;
  readonly summen: FxSummen;
  readonly nichtAngeboten: readonly string[];
  readonly zuschlaege: Readonly<Record<string, { readonly basis: string; readonly betrag: string | null }>>;
  readonly ausweise: { readonly gesamt: FxAusweis; readonly titel: Readonly<Record<string, FxAusweis>> };
}

/** Was dieser Test aus `typisch-bim.json` liest (README der Fixtures, „BIM-Set“). */
interface FxBim {
  readonly lvId: string;
  readonly modelle: readonly FxModell[];
  readonly bauteile: Readonly<Record<Stand, readonly FxBauteil[]>>;
  readonly zuordnungen: readonly FxZuordnung[];
  readonly kern: {
    readonly torweg: { readonly positionIds: readonly string[]; readonly sollwerte: FxSollwerte };
    readonly vordersaetze: readonly FxVordersatz[];
    readonly sollwerte: FxSollwerte;
  };
  readonly erweitert: {
    readonly din277: {
      readonly geschosse: readonly {
        readonly globalId: string;
        readonly name: string;
        readonly bgf: string;
        readonly bri: string;
      }[];
      readonly raeume: readonly {
        readonly globalId: string;
        readonly name: string;
        readonly geschoss: string;
        readonly nrf: string;
      }[];
    };
  };
}

const BIM = lies('typisch-bim.json') as FxBim;
const TYPISCH = lies('typisch.json') as { readonly id: string; readonly sollwerte: FxSollwerte };

function erwarteOk<T, F>(e: Ergebnis<T, F>): T {
  if (!e.ok) throw new Error(`Unerwarteter Fehlerwert: ${JSON.stringify(e.fehler)}`);
  return e.wert;
}

/** Ansatzzeile der Fixture in Vertragsform (Zeile und Formel als Zahl). */
const zeileAusFixture = (z: FxZeile): Ansatzzeile => ({
  zeile: Number(z.zeile),
  formel: Number(z.formel),
  ausdruck: z.ausdruck,
  variable: z.variable,
});

// --- 1. `ifc` → `bim`: die Hausdateien lesen und als Modelle anlegen -------------------------------------------------

const PROJEKT_ID = 'projekt-x1' as ProjektId;

interface Eingelesen {
  readonly fx: FxModell;
  readonly sha256: string;
  readonly befunde: readonly Pruefbefund[];
  readonly modell: Bauwerksmodell;
}

/**
 * Wie die App eine Datei einliest (Ticket 114, `bim/einlesen.ts`): `ifc` liest und bildet ab, dann `BauwerksmodellAnlegen`
 * über den Ausführer von `bim`. Den SHA-256 der Bytes, den in der App `speicher` beim Ablegen liefert, rechnet hier `node:crypto`.
 */
function einlesen(
  stand: Stand,
  schema: FxModell['schema'],
  id: string,
  vorgaengerId: BauwerksmodellId | null,
): Eingelesen {
  const fx = BIM.modelle.find((m) => m.stand === stand && m.schema === schema);
  if (fx === undefined) throw new Error(`Fixture ohne Modell ${stand} ${schema}`);
  const bytes = new Uint8Array(readFileSync(new URL(`../../../fixtures/${fx.datei}`, import.meta.url)));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const dateiname = fx.datei.split('/').at(-1) ?? fx.datei;
  const lesung = bauwerksmodellLesen(bytes, {
    id: id as BauwerksmodellId,
    projektId: PROJEKT_ID,
    name: dateiname.replace(/\.ifc$/, ''),
    datei: { hash: sha256, dateiname, groesse: bytes.length },
    vorgaengerId,
    eingelesen: '2026-11-12',
  });
  if (lesung.bauwerksmodell === null) throw new Error(`${fx.datei} ergibt kein Modell`);
  const angelegt = bauwerksmodellChangeSetAnwenden(
    null,
    erwarteOk(
      bauwerksmodellBefehlAusfuehren(null, {
        art: 'BauwerksmodellAnlegen',
        bauwerksmodell: lesung.bauwerksmodell,
      }),
    ),
  );
  if (angelegt === null) throw new Error(`${fx.datei}: das ChangeSet entfernt das Modell`);
  return { fx, sha256, befunde: lesung.befunde, modell: angelegt.bauwerksmodell };
}

const v1 = einlesen('v1', 'IFC4', 'modell-v1', null);
const v1Ifc2x3 = einlesen('v1', 'IFC2X3', 'modell-v1-ifc2x3', null);
const v2 = einlesen('v2', 'IFC4', 'modell-v2', v1.modell.id);

// --- 2. Kern: LV `typisch`, Zuordnungen, Mengenübernahme aus v1 -----------------------------------------------------

function lvAusfuehren(z: LvZustand | null, b: LvBefehl): LvZustand {
  const danach = lvChangeSetAnwenden(z, erwarteOk(lvBefehlAusfuehren(z, b)));
  if (danach === null) throw new Error(`${b.art} entfernt das LV`);
  return danach;
}

function position(z: LvZustand, id: string): Position {
  const k = z.leistungsverzeichnis.knoten.find((x) => x.id === id);
  if (k?.art !== 'position') throw new Error(`Position ${id} fehlt`);
  return k;
}

/**
 * Zuordnen wie auf der Modellseite (Ticket 115): die Bauteile einer Zuordnung der Fixture als Auswahl, in der Reihenfolge des
 * Modells (D-115.2), je Mengenart ein `BauteileZuordnen` (`zuordnenBefehl`).
 */
function zuordnen(z: LvZustand, modell: Bauwerksmodell, f: FxZuordnung): LvZustand {
  const arten = [...new Set(f.bauteile.map((b) => b.mengenart))];
  return arten.reduce((stand, mengenart) => {
    const auswahl = f.bauteile.filter((b) => b.mengenart === mengenart).map((b) => b.globalId);
    const b = zuordnenBefehl(
      position(stand, f.positionId),
      bauteileInModellreihenfolge(modell, auswahl),
      mengenart,
    );
    if (b === null) throw new Error(`Zuordnen an ${f.oz} ändert nichts`);
    return lvAusfuehren(stand, b);
  }, z);
}

/** „Mengen aus Modell …“ (Ticket 115): Vorschau aus `bim` und `mengen`, je geänderter Position `MengenansatzSetzen`. */
function mengenUebernehmen(z: LvZustand, modell: Bauwerksmodell) {
  const vorschau = uebernahmeVorschau(z.leistungsverzeichnis.knoten, modell);
  const befehle = uebernahmeBefehle(vorschau);
  return { vorschau, befehle, zustand: befehle.reduce<LvZustand>((s, b) => lvAusfuehren(s, b), z) };
}

const inhalt = fixtureInhalt('typisch');
const lv0 = lvAusfuehren(null, {
  art: 'LeistungsverzeichnisAnlegen',
  id: inhalt.wurzelId,
  projektId: PROJEKT_ID,
  inhalt,
});

// X1-Kern (Torweg der E2E, D-99.2): nur die Innenwände des EG an 03.0010.
const TORWEG = new Set(BIM.kern.torweg.positionIds);
const torweg = mengenUebernehmen(
  BIM.zuordnungen.filter((f) => TORWEG.has(f.positionId)).reduce((s, f) => zuordnen(s, v1.modell, f), lv0),
  v1.modell,
);

// Die ganze Kette: alle sieben Zuordnungen, Übernahme aus v1 (IFC 4); dieselbe Übernahme aus v1 als IFC 2x3.
const zugeordnet = BIM.zuordnungen.reduce((s, f) => zuordnen(s, v1.modell, f), lv0);
const uebernahme = mengenUebernehmen(zugeordnet, v1.modell);
const uebernahme2x3 = mengenUebernehmen(zugeordnet, v1Ifc2x3.modell);
const lvNachV1 = uebernahme.zustand;

// --- Abbildungen in die Form der Fixture ---------------------------------------------------------------------------

/** Die Summen eines LV in der Form der Sollwerte von `typisch.json` (Positionen, Titel, Summen, Zuschläge, Ausweise). */
function wieSollwerte(z: LvZustand) {
  const s = z.summen;
  return {
    positionen: Object.fromEntries(
      s.positionen.map((p) => [p.positionId, { gp: p.gesamtpreis, inSumme: p.gehtInSummeEin }]),
    ),
    titel: Object.fromEntries(s.gliederungen.map((g) => [g.gliederungId, { summe: g.summe }])),
    summen: {
      netto: s.gesamt.netto,
      nachlass: s.gesamt.nachlass,
      nettoNachNachlass: s.gesamt.nettoNachNachlass,
      mwst: s.gesamt.mwst,
      brutto: s.gesamt.brutto,
    },
    nichtAngeboten: [],
    zuschlaege: Object.fromEntries(
      [...zuschlagsbasen(z.leistungsverzeichnis)].map(([id, b]) => [
        id,
        { basis: b.basis, betrag: b.betrag },
      ]),
    ),
    ausweise: {
      gesamt: {
        summeBedarfOhneGesamtbetrag: s.gesamt.summeBedarfOhneGesamtbetrag,
        summeWahl: s.gesamt.summeWahl,
      },
      titel: Object.fromEntries(
        s.gliederungen.map((g) => [
          g.gliederungId,
          { summeBedarfOhneGesamtbetrag: g.summeBedarfOhneGesamtbetrag, summeWahl: g.summeWahl },
        ]),
      ),
    },
  };
}

/** Ein Vordersatz der Fixture so, wie ihn die Vorschau der App zeigt (Zeilen aus `bim`, Menge aus `mengen`). */
const vorschauzeile = (v: FxVordersatz) => ({
  positionId: v.positionId,
  oz: v.oz,
  zeilen: v.mengenansatz.map(zeileAusFixture),
  nachher: v.menge,
});

/** Die Zeilenergebnisse von Formel 91, wie `mengen` sie aus den Ansatzzeilen rechnet. */
const zeilenergebnisse = (zeilen: readonly Ansatzzeile[]): (string | null)[] =>
  mengenansatzBerechnen(zeilen).zeilen.map((z) => z.menge);

/** Name des Strukturknotens (Geschoss) zu einer GlobalId, wie die Fixture ihn nennt. */
const knotenname = (m: Bauwerksmodell, id: IfcGlobalId | null): string | null =>
  m.struktur.find((k) => k.globalId === id)?.name ?? null;

/** Die Bauteile eines Modells in seiner Reihenfolge, in der Form von `bauteile` der Fixture (ohne `kennung`). */
const bauteilliste = (m: Bauwerksmodell) =>
  m.bauteile.map((b) => ({
    globalId: b.globalId,
    klasse: b.ifcKlasse,
    name: b.name,
    geschoss: knotenname(m, b.strukturGlobalId),
    mengen: b.mengen.map((q) => ({ name: q.name, art: q.art, wert: q.wert })),
  }));
const fxBauteilliste = (stand: Stand) =>
  BIM.bauteile[stand].map((b) => ({
    globalId: b.globalId,
    klasse: b.klasse,
    name: b.name,
    geschoss: b.geschoss,
    mengen: b.mengen.map((q) => ({ name: q.name, art: q.art, wert: q.wert })),
  }));

/** Mengen eines Strukturknotens nach Namen. */
function knotenmenge(m: Bauwerksmodell, globalId: string, name: string): string | undefined {
  return m.struktur.find((k) => k.globalId === globalId)?.mengen.find((q) => q.name === name)?.wert;
}

// --- Prüfungen ---------------------------------------------------------------------------------------------------

describe('Tor X1: Kette ohne Oberfläche (Sollwerte aus typisch-bim)', () => {
  it('ifc: die drei Hausdateien sind die der Fixture, ohne Befund gelesen und als Modell angelegt', () => {
    for (const e of [v1, v1Ifc2x3, v2]) {
      expect(e.sha256).toBe(e.fx.sha256);
      expect(e.befunde).toEqual([]);
      expect(e.modell.schema).toBe(e.fx.schema);
      expect(e.modell.datei.hash).toBe(e.fx.sha256);
    }
    expect(v2.modell.vorgaengerId).toBe(v1.modell.id);
  });

  it('ifc: v1 und v2 tragen Bauteile, Geschosse und Mengen der Fixture, in deren Reihenfolge', () => {
    expect(bauteilliste(v1.modell)).toEqual(fxBauteilliste('v1'));
    expect(bauteilliste(v2.modell)).toEqual(fxBauteilliste('v2'));
    for (const g of BIM.erweitert.din277.geschosse) {
      expect(knotenname(v1.modell, g.globalId as IfcGlobalId)).toBe(g.name);
      expect(knotenmenge(v1.modell, g.globalId, 'GrossFloorArea')).toBe(g.bgf);
      expect(knotenmenge(v1.modell, g.globalId, 'GrossVolume')).toBe(g.bri);
    }
    for (const r of BIM.erweitert.din277.raeume) {
      expect(knotenname(v1.modell, r.globalId as IfcGlobalId)).toBe(r.name);
      expect(knotenmenge(v1.modell, r.globalId, 'NetFloorArea')).toBe(r.nrf);
    }
  });

  it('ifc: IFC 2x3 (Längen in mm) ergibt dasselbe Modell wie IFC 4, bis auf Kopf und Schema', () => {
    expect(v1Ifc2x3.modell.struktur).toEqual(v1.modell.struktur);
    expect(v1Ifc2x3.modell.bauteile).toEqual(v1.modell.bauteile);
    expect(bauteilliste(v1Ifc2x3.modell)).toEqual(fxBauteilliste('v1'));
  });

  it('Kern: LV `typisch` mit den Summen der Fixture; Zuordnen setzt die Paare der Fixture und ändert keine Summe', () => {
    expect(inhalt.wurzelId).toBe(BIM.lvId);
    expect(wieSollwerte(lv0)).toEqual(TYPISCH.sollwerte);
    for (const f of BIM.zuordnungen) {
      expect(position(zugeordnet, f.positionId).ordnungszahl).toBe(f.oz);
      expect(position(zugeordnet, f.positionId).einheit).toBe(f.einheit);
      expect(position(zugeordnet, f.positionId).bauteile).toEqual(f.bauteile);
    }
    expect(zugeordnet.summen).toEqual(lv0.summen);
  });

  it('X1-Kern: die Innenwände des EG an 03.0010 übernommen ergeben Vordersatz und LV-Summen des Torwegs', () => {
    const soll = BIM.kern.vordersaetze.filter((v) => TORWEG.has(v.positionId));
    expect(
      torweg.vorschau.zeilen.map(({ positionId, oz, zeilen, nachher }) => ({
        positionId,
        oz,
        zeilen,
        nachher,
      })),
    ).toEqual(soll.map(vorschauzeile));
    expect(torweg.vorschau.zeilen.flatMap((z) => z.befunde)).toEqual([]);
    expect(torweg.befehle.map((b) => [b.positionId, b.menge])).toEqual(
      soll.map((v) => [v.positionId, v.menge]),
    );
    for (const v of soll) expect(position(torweg.zustand, v.positionId).menge).toBe(v.menge);
    expect(wieSollwerte(torweg.zustand)).toEqual(BIM.kern.torweg.sollwerte);
  });

  it('Mengenübernahme aus v1: Ansatzzeilen, Zeilenergebnisse und Vordersätze der Fixture, ohne Befund', () => {
    const v = uebernahme.vorschau.zeilen;
    expect(v.map(({ positionId, oz, zeilen, nachher }) => ({ positionId, oz, zeilen, nachher }))).toEqual(
      BIM.kern.vordersaetze.map(vorschauzeile),
    );
    expect(v.map((z) => zeilenergebnisse(z.zeilen))).toEqual(
      BIM.kern.vordersaetze.map((s) => s.zeilenergebnisse),
    );
    expect(v.every((z) => z.geaendert)).toBe(true);
    expect(v.flatMap((z) => z.befunde)).toEqual([]);
    expect(uebernahme.befehle).toEqual(
      BIM.kern.vordersaetze.map((s) => ({
        art: 'MengenansatzSetzen',
        positionId: s.positionId,
        mengenansatz: s.mengenansatz.map(zeileAusFixture),
        menge: s.menge,
      })),
    );
  });

  it('Kern: MengenansatzSetzen setzt die Vordersätze; GP, Titel, Summen, Zuschlag und Ausweise wie `kern.sollwerte`', () => {
    for (const s of BIM.kern.vordersaetze) {
      expect(position(lvNachV1, s.positionId).menge).toBe(s.menge);
      expect(position(lvNachV1, s.positionId).mengenansatz).toEqual(s.mengenansatz.map(zeileAusFixture));
    }
    expect(wieSollwerte(lvNachV1)).toEqual(BIM.kern.sollwerte);
  });

  it('IFC 2x3 liefert dieselben Ansatzzeilen und Vordersätze wie IFC 4', () => {
    expect(uebernahme2x3.vorschau).toEqual(uebernahme.vorschau);
    expect(uebernahme2x3.befehle).toEqual(uebernahme.befehle);
  });
});
