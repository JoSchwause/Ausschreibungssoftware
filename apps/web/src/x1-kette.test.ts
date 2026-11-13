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
import { aufmassBefehlAusfuehren, aufmassChangeSetAnwenden, aufmassPruefen } from '@tethys/abrechnung';
import {
  bauteileImStrukturknoten,
  bauwerksmodellBefehlAusfuehren,
  bauwerksmodellChangeSetAnwenden,
  din277Berechnen,
  modellVergleichen,
} from '@tethys/bim';
import { bauwerksmodellLesen } from '@tethys/ifc';
import {
  auftragsLvBefehlAusfuehren,
  auftragsLvChangeSetAnwenden,
  lvBefehlAusfuehren,
  lvChangeSetAnwenden,
  zuschlagsbasen,
} from '@tethys/kern';
import {
  kostenermittlungBefehlAusfuehren,
  kostenermittlungBerechnen,
  kostenermittlungChangeSetAnwenden,
} from '@tethys/kosten';
import { mengenansatzBerechnen } from '@tethys/mengen';
import { zuschlagErteilen } from '@tethys/vergabe';
import type {
  Angebot,
  AngebotId,
  Angebotsposition,
  Ansatzzeile,
  Aufmass,
  AufmassId,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvBefehl,
  AuftragsLvZustand,
  Bauteil,
  Bauwerksmodell,
  BauwerksmodellId,
  BieterId,
  Einheitspreis,
  Ergebnis,
  IfcGlobalId,
  KostenermittlungId,
  LvBefehl,
  LvZustand,
  Nachlass,
  Position,
  PositionId,
  Projekt,
  ProjektId,
  Prozent,
  Pruefbefund,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { fixtureInhalt } from '../e2e/fixture-inhalt';
import { auswahlDerZeile } from './bim/auswahl';
import { aufmassBlattBefehl, aufmassVorschau } from './bim/aufmassblatt';
import { modellbaumBauen } from './bim/baum';
import { kostenkennwerteZeilen, schaetzungBauen } from './bim/kennwerte';
import { uebernahmeBefehle, uebernahmeVorschau } from './bim/uebernahme';
import { bauteileInModellreihenfolge, zuordnenBefehl } from './bim/zuordnung';
import { aktualisierungBerechnen, folgenansicht } from './modellvergleich/folgen';

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
/** Ein Bauteil der Listen „hinzugefügt“ und „entfernt“ des Vergleichs. */
interface FxListeneintrag {
  readonly globalId: string;
  readonly kennung: string;
  readonly klasse: string;
  readonly name: string;
  readonly geschoss: string;
}
/** Ein geändertes Bauteil des Vergleichs (README der Fixtures: „Geändert“). */
interface FxAenderung {
  readonly globalId: string;
  readonly kennung: string;
  readonly felder: readonly string[];
  readonly name?: { readonly vorher: string; readonly nachher: string };
  readonly strukturknoten?: { readonly vorher: string; readonly nachher: string };
  readonly mengen?: readonly { readonly name: string; readonly vorher: string; readonly nachher: string }[];
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
    readonly aufmassAusAuswahl: {
      readonly modell: Stand;
      readonly auswahl: { readonly art: string; readonly globalId: string; readonly name: string };
      readonly positionen: readonly (FxVordersatz & { readonly bauteile: readonly string[] })[];
    };
    readonly vergleich: {
      readonly vorher: Stand;
      readonly nachher: Stand;
      readonly hinzugefuegt: readonly FxListeneintrag[];
      readonly entfernt: readonly FxListeneintrag[];
      readonly geaendert: readonly FxAenderung[];
    };
    readonly betroffenePositionen: readonly {
      readonly positionId: string;
      readonly oz: string;
      readonly vorher: string;
      readonly nachher: string;
      readonly differenz: string;
    }[];
    readonly mengenAktualisieren: {
      readonly modell: Stand;
      readonly vordersaetze: readonly FxVordersatz[];
      readonly befunde: readonly {
        readonly positionId: string;
        readonly oz: string;
        readonly art: string;
        readonly globalId: string;
        readonly kennung: string;
      }[];
      readonly sollwerte: FxSollwerte;
    };
    readonly kostenschaetzung: {
      readonly stufe: string;
      readonly name: string;
      readonly bezugsgroesse: {
        readonly art: 'BGF' | 'BRI' | 'NRF';
        readonly wert: string;
        readonly einheit: string;
      };
      readonly kennwerte: readonly { readonly nummer: string; readonly kennwert: string }[];
      readonly eintraege: readonly {
        readonly nummer: string;
        readonly betrag: string;
        readonly bemerkung: string;
      }[];
      readonly gesamt: string;
    };
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
      readonly summen: { readonly bgf: string; readonly bri: string; readonly nrf: string };
    };
  };
}

/** Die Angebote zu `typisch` (Ticket 51, 69) und der Preisspiegel des Tors M3. */
interface FxAngebote {
  readonly bieter: readonly { readonly id: string; readonly name: string }[];
  readonly angebote: readonly {
    readonly id: string;
    readonly bieterId: string;
    readonly nachlass: Nachlass | null;
    readonly positionen: readonly {
      readonly positionId: string;
      readonly status: 'angeboten' | 'nicht-angeboten';
      readonly einheitspreis?: string;
      readonly zuschlagssatz?: string;
    }[];
  }[];
  readonly preisspiegel: {
    readonly bieter: readonly { readonly angebotId: string; readonly name: string }[];
    readonly vergleiche: readonly {
      readonly angebotIds: readonly string[];
      readonly rang: Readonly<Record<string, string>>;
    }[];
  };
}

const BIM = lies('typisch-bim.json') as FxBim;
const TYPISCH = lies('typisch.json') as {
  readonly id: string;
  readonly knoten: readonly { readonly id: string; readonly positionsart?: string }[];
  readonly sollwerte: FxSollwerte;
};
const ANGEBOTE = lies('typisch-angebote.json') as FxAngebote;

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

// --- 3. `vergabe`: Zuschlag wie in M3 an den Ersten des Paars A+B (Bieter A), ohne Wahl -----------------------------

// Das Paar des Tors M3 und sein Rang (Ticket 69); ohne Wahl bleibt die Grundposition 02.0070 mit ihrer Zuordnung im
// Auftrags-LV, die Alternative entfällt (D-21).
const PAAR = ANGEBOTE.preisspiegel.bieter.filter((b) => b.name === 'Bieter A' || b.name === 'Bieter B');
const RANG =
  ANGEBOTE.preisspiegel.vergleiche.find(
    (v) => v.angebotIds.length === 2 && PAAR.every((b) => v.angebotIds.includes(b.angebotId)),
  )?.rang ?? {};
const ERSTER = PAAR.find((b) => RANG[b.angebotId] === '1');
const fxErster = ANGEBOTE.angebote.find((a) => a.id === ERSTER?.angebotId);
if (fxErster === undefined) throw new Error('Fixture ohne Angebot des Ersten im Paar A+B');

const projekt: Projekt = {
  id: PROJEKT_ID,
  name: 'Musterhaus',
  bauherr: { name: 'Bauherr', anschrift: null },
  bieter: ANGEBOTE.bieter.map((b) => ({ id: b.id as BieterId, name: b.name })),
};
/** Das Angebot der Fixture in Vertragsform (einen Zuschlagssatz bietet der Bieter mit dem Platzhalter-EP an). */
const angebotErster: Angebot = {
  id: fxErster.id as AngebotId,
  projektId: PROJEKT_ID,
  leistungsverzeichnisId: lvNachV1.leistungsverzeichnis.id,
  bieterId: fxErster.bieterId as BieterId,
  nachlass: fxErster.nachlass,
  positionen: fxErster.positionen.map((p): Angebotsposition => {
    const positionId = p.positionId as PositionId;
    if (p.status !== 'angeboten') return { positionId, status: 'nicht-angeboten' };
    if (p.zuschlagssatz !== undefined)
      return {
        positionId,
        status: 'angeboten',
        einheitspreis: '0.000' as Einheitspreis,
        epa: null,
        zuschlagssatz: p.zuschlagssatz as Prozent,
      };
    return {
      positionId,
      status: 'angeboten',
      einheitspreis: (p.einheitspreis ?? '') as Einheitspreis,
      epa: null,
    };
  }),
};

function auftragsLvAusfuehren(z: AuftragsLvZustand | null, b: AuftragsLvBefehl): AuftragsLvZustand {
  const danach = auftragsLvChangeSetAnwenden(z, erwarteOk(auftragsLvBefehlAusfuehren(z, b)));
  if (danach === null) throw new Error(`${b.art} entfernt das Auftrags-LV`);
  return danach;
}

const AUFTRAGS_LV_ID = 'auftrag-x1' as AuftragsLeistungsverzeichnisId;
const zuschlag = erwarteOk(
  zuschlagErteilen(lvNachV1, angebotErster, projekt, new Set<PositionId>(), AUFTRAGS_LV_ID),
);
const auftrag = auftragsLvAusfuehren(null, zuschlag.befehl);

// --- 4. `bim` → `abrechnung`: Aufmaßblatt aus der Auswahl „Geschoss EG“ am Auftrags-LV ------------------------------

// Die Auswahl, wie die Modellseite sie aus der Zeile des Geschosses bildet (Ticket 114, `auswahlDerZeile`).
const AUSWAHL = BIM.erweitert.aufmassAusAuswahl;
const baumV1 = modellbaumBauen(v1.modell);
const egZeile = baumV1.zeileVon(AUSWAHL.auswahl.globalId);
if (egZeile === undefined) throw new Error('Geschoss der Auswahl fehlt im Baum');
const auswahlEg = auswahlDerZeile(baumV1, egZeile);
const aufmassvorschau = aufmassVorschau(auftrag.auftragsLeistungsverzeichnis.knoten, v1.modell, auswahlEg);
const blattBefehl = aufmassBlattBefehl(
  { aufmass: () => 'aufmass-x1' as AufmassId },
  auftrag.auftragsLeistungsverzeichnis,
  [],
  { bezeichnung: `Aus Modell ${v1.modell.name}`, datum: '2026-11-12' },
  aufmassvorschau,
);
const blatt: Aufmass | undefined = aufmassChangeSetAnwenden(
  null,
  erwarteOk(aufmassBefehlAusfuehren(null, blattBefehl)),
)?.aufmass;

// --- 5. `bim`: Vergleich v1 → v2, Folgen für das LV, „Mengen aktualisieren“ (nur Ausschreibungs-LV, D-53) ------------

const vergleich = modellVergleichen(v1.modell, v2.modell);
const folgen = folgenansicht(lvNachV1, v1.modell, v2.modell);
// Die neuen Ansätze aller Positionen mit Zuordnungen laut v2 (Vorschau „Mengen aus Modell“ mit dem neuen Stand).
const neueAnsaetze = uebernahmeVorschau(lvNachV1.leistungsverzeichnis.knoten, v2.modell);
const aktualisierung = aktualisierungBerechnen(lvNachV1, v1.modell, v2.modell);
const lvNachV2 = aktualisierung.befehle.reduce<LvZustand>((s, b) => lvAusfuehren(s, b), lvNachV1);

// --- 6. DIN 277 und Kostenschätzung über Kennwerte (`bim`, `kosten`) -------------------------------------------------

const KS = BIM.erweitert.kostenschaetzung;
const groessen = din277Berechnen(v1.modell);
// Wie der Dialog „Kostenschätzung über Kennwerte“: Kennwerte als Eingabe in de-DE (`bim/kennwerte`, N4).
const schaetzung = schaetzungBauen({
  id: 'kostenschaetzung-x1' as KostenermittlungId,
  projektId: PROJEKT_ID,
  name: KS.name,
  groessen,
  zeilen: KS.kennwerte.map((k) => ({
    kostengruppe: k.nummer,
    bezug: KS.bezugsgroesse.art,
    kennwert: k.kennwert.replace('.', ','),
  })),
});
const ermittlung = schaetzung.schaetzung
  ? kostenermittlungChangeSetAnwenden(
      null,
      erwarteOk(kostenermittlungBefehlAusfuehren(null, schaetzung.schaetzung.befehl)),
    )?.kostenermittlung
  : undefined;

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

/** Kennung (`AW-EG-S` …) je GlobalId, über beide Stände (README der Fixtures: die `Tag`-Angabe der Datei). */
const KENNUNG: ReadonlyMap<string, string> = new Map(
  [...BIM.bauteile.v1, ...BIM.bauteile.v2].map((b) => [b.globalId, b.kennung]),
);

/** Ein Bauteil in der Form der Listen „hinzugefügt“ und „entfernt“ der Fixture. */
const listeneintrag =
  (m: Bauwerksmodell) =>
  (b: Bauteil): FxListeneintrag => ({
    globalId: b.globalId,
    kennung: KENNUNG.get(b.globalId) ?? '',
    klasse: b.ifcKlasse,
    name: b.name ?? '',
    geschoss: knotenname(m, b.strukturGlobalId) ?? '',
  });

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

  it('vergabe: Zuschlag wie M3 an Bieter A ohne Wahl; das Auftrags-LV trägt Zuordnungen und Vordersätze aus v1', () => {
    expect(ERSTER?.name).toBe('Bieter A');
    // Ohne Wahl entfällt die Alternative (02.0070 A), sonst nichts; Bieter A hat alles angeboten.
    const alternativen = TYPISCH.knoten.filter((k) => k.positionsart === 'wahl').map((k) => k.id);
    expect(zuschlag.warnungen).toEqual([
      { code: 'positionen-entfallen', anzahl: alternativen.length, positionIds: alternativen },
    ]);
    const a = auftrag.auftragsLeistungsverzeichnis;
    expect([a.id, a.leistungsverzeichnisId, a.angebotId]).toEqual([AUFTRAGS_LV_ID, BIM.lvId, fxErster.id]);
    const knoten = new Map(a.knoten.map((k) => [k.id as string, k]));
    for (const f of BIM.zuordnungen) {
      const k = knoten.get(f.positionId);
      expect(k?.art === 'position' ? k.bauteile : undefined).toEqual(f.bauteile);
    }
    for (const v of BIM.kern.vordersaetze) {
      const k = knoten.get(v.positionId);
      expect(k?.art === 'position' ? k.menge : undefined).toBe(v.menge);
    }
  });

  it('bim: Aufmaß aus der Auswahl „Geschoss EG“: Bauteile, Zeilen, Zeilenergebnisse und Mengen der Fixture', () => {
    const imEg = BIM.bauteile.v1.filter((b) => b.geschoss === AUSWAHL.auswahl.name).map((b) => b.globalId);
    expect([...auswahlEg].sort()).toEqual([...imEg].sort());
    expect(bauteileImStrukturknoten(v1.modell, AUSWAHL.auswahl.globalId as IfcGlobalId).sort()).toEqual(
      [...imEg].sort(),
    );
    expect(
      aufmassvorschau.zeilen.map(({ positionId, oz, bauteile, zeilen, menge }) => ({
        positionId,
        oz,
        bauteile,
        zeilen,
        menge,
      })),
    ).toEqual(
      AUSWAHL.positionen.map((p) => ({
        positionId: p.positionId,
        oz: p.oz,
        bauteile: p.bauteile,
        zeilen: p.mengenansatz.map(zeileAusFixture),
        menge: p.menge,
      })),
    );
    expect(aufmassvorschau.zeilen.map((z) => zeilenergebnisse(z.zeilen))).toEqual(
      AUSWAHL.positionen.map((p) => p.zeilenergebnisse),
    );
    expect(aufmassvorschau.zeilen.flatMap((z) => z.befunde)).toEqual([]);
    expect(aufmassvorschau.hinweise).toEqual(['bauteil-auf-mehreren-blaettern-nicht-erkennbar']);
  });

  it('abrechnung: Blatt 1 trägt je Position Ansatz und Menge der Fixture, ohne Befund gegen das Auftrags-LV', () => {
    if (blatt === undefined) throw new Error('Blatt fehlt');
    expect([blatt.nummer, blatt.auftragsLvId, blatt.projektId]).toEqual([1, AUFTRAGS_LV_ID, PROJEKT_ID]);
    expect(blatt.positionen).toEqual(
      AUSWAHL.positionen.map((p) => ({
        positionId: p.positionId,
        mengenansatz: p.mengenansatz.map(zeileAusFixture),
        menge: p.menge,
      })),
    );
    expect(aufmassPruefen(blatt, auftrag)).toEqual([]);
  });

  it('bim: Vergleich v1 → v2: hinzugefügt, entfernt und geändert wie die Fixture, ohne Befund', () => {
    const soll = BIM.erweitert.vergleich;
    expect([soll.vorher, soll.nachher]).toEqual(['v1', 'v2']);
    expect(vergleich.hinzugefuegt.map(listeneintrag(v2.modell))).toEqual(soll.hinzugefuegt);
    expect(vergleich.entfernt.map(listeneintrag(v1.modell))).toEqual(soll.entfernt);
    expect(
      vergleich.geaendert.map((a): FxAenderung => ({
        globalId: a.globalId,
        kennung: KENNUNG.get(a.globalId) ?? '',
        felder: a.felder,
        ...(a.felder.includes('name')
          ? { name: { vorher: a.vorher.name ?? '', nachher: a.nachher.name ?? '' } }
          : {}),
        ...(a.felder.includes('strukturknoten')
          ? {
              strukturknoten: {
                vorher: knotenname(v1.modell, a.vorher.strukturGlobalId) ?? '',
                nachher: knotenname(v2.modell, a.nachher.strukturGlobalId) ?? '',
              },
            }
          : {}),
        ...(a.felder.includes('mengen')
          ? {
              mengen: a.mengen.map((q) => ({
                name: q.name,
                vorher: q.vorher?.wert ?? '',
                nachher: q.nachher?.wert ?? '',
              })),
            }
          : {}),
      })),
    ).toEqual(soll.geaendert);
    expect(vergleich.anzahlUnveraendert).toBe(
      BIM.bauteile.v1.length - soll.entfernt.length - soll.geaendert.length,
    );
    expect(vergleich.befunde).toEqual([]);
  });

  it('Folgen für das LV: betroffene Positionen mit Menge laut v1 und v2 und Differenz wie die Fixture', () => {
    expect(folgen.zeilen.map((z) => z.positionId)).toEqual(BIM.zuordnungen.map((f) => f.positionId));
    expect(
      folgen.zeilen
        .filter((z) => z.betroffen)
        .map(({ positionId, oz, vorher, nachher, differenz }) => ({
          positionId,
          oz,
          vorher,
          nachher,
          differenz,
        })),
    ).toEqual(BIM.erweitert.betroffenePositionen);
    // Im LV steht vor dem Aktualisieren der Vordersatz laut v1.
    const v1Menge = new Map(BIM.kern.vordersaetze.map((v) => [v.positionId, v.menge]));
    expect(folgen.zeilen.map((z) => z.imLv)).toEqual(folgen.zeilen.map((z) => v1Menge.get(z.positionId)));
  });

  it('„Mengen aktualisieren“: neue Ansätze und Befund laut Fixture; nur die betroffenen werden gesetzt, Summen wie die Fixture', () => {
    const soll = BIM.erweitert.mengenAktualisieren;
    expect(soll.modell).toBe('v2');
    expect(
      neueAnsaetze.zeilen.map(({ positionId, oz, zeilen, nachher }) => ({ positionId, oz, zeilen, nachher })),
    ).toEqual(soll.vordersaetze.map(vorschauzeile));
    expect(neueAnsaetze.zeilen.map((z) => zeilenergebnisse(z.zeilen))).toEqual(
      soll.vordersaetze.map((v) => v.zeilenergebnisse),
    );
    expect(
      neueAnsaetze.zeilen.flatMap((z) =>
        z.befunde.map((b) => ({
          positionId: b.ort.knotenId,
          oz: z.oz,
          art: b.code,
          globalId: b.ort.globalId,
          kennung: KENNUNG.get(b.ort.globalId ?? ''),
        })),
      ),
    ).toEqual(soll.befunde);
    // D-116.2: geschrieben wird je betroffener Position mit neuen Zeilen ein `MengenansatzSetzen` (Menge aus `mengen`).
    expect(aktualisierung.befehle.map((b) => [b.positionId, b.menge])).toEqual(
      BIM.erweitert.betroffenePositionen.map((p) => [p.positionId, p.nachher]),
    );
    for (const v of soll.vordersaetze) {
      expect(position(lvNachV2, v.positionId).mengenansatz).toEqual(v.mengenansatz.map(zeileAusFixture));
      expect(position(lvNachV2, v.positionId).menge).toBe(v.menge);
    }
    expect(wieSollwerte(lvNachV2)).toEqual(soll.sollwerte);
  });

  it('DIN 277 aus v1: BGF, BRI und NRF der Fixture, Quelle Modell, ohne Befund', () => {
    const s = BIM.erweitert.din277.summen;
    expect([groessen.bgf, groessen.bri, groessen.nrf]).toEqual([
      { art: 'BGF', wert: s.bgf, quelle: 'modell' },
      { art: 'BRI', wert: s.bri, quelle: 'modell' },
      { art: 'NRF', wert: s.nrf, quelle: 'modell' },
    ]);
    expect(groessen.befunde).toEqual([]);
    expect(groessen.bgf.wert).toBe(KS.bezugsgroesse.wert);
  });

  it('Kostenschätzung über Kennwerte: Stufe, Einträge mit Herleitung und Gesamt wie die Fixture; `kosten` rechnet dieselbe Summe', () => {
    expect(schaetzung.fehler).toEqual([]);
    expect(schaetzung.schaetzung?.befunde).toEqual([]);
    if (ermittlung === undefined) throw new Error('Kostenermittlung fehlt');
    expect([ermittlung.stufe, ermittlung.name, ermittlung.projektId]).toEqual([
      KS.stufe,
      KS.name,
      PROJEKT_ID,
    ]);
    expect(ermittlung.eintraege.map(({ nummer, betrag }) => ({ nummer, betrag }))).toEqual(
      KS.eintraege.map(({ nummer, betrag }) => ({ nummer, betrag })),
    );
    // Herleitung in `bemerkung` (D-52): Bezugsgröße und Kennwert der Fixture, in de-DE.
    const groesse = `${KS.bezugsgroesse.art} ${KS.bezugsgroesse.wert.replace('.', ',')} ${KS.bezugsgroesse.einheit}`;
    for (const e of ermittlung.eintraege) {
      const kennwert = KS.kennwerte.find((k) => k.nummer === e.nummer)?.kennwert ?? '';
      expect(e.bemerkung).toContain(groesse);
      expect(e.bemerkung).toContain(`${kennwert.replace('.', ',')} €/${KS.bezugsgroesse.einheit}`);
    }
    expect(schaetzung.schaetzung?.gesamt).toBe(KS.gesamt);
    expect(kostenermittlungBerechnen(ermittlung.eintraege).gesamtsumme).toBe(KS.gesamt);
  });

  it('Kostenkennwerte der neuen Ermittlung: je Kostengruppe wieder der Kennwert der Fixture je m² BGF', () => {
    const zeilen = kostenkennwerteZeilen(ermittlung?.eintraege ?? [], groessen);
    expect(KS.kennwerte.map((k) => zeilen.find((z) => z.nummer === k.nummer)?.jeBgf)).toEqual(
      KS.kennwerte.map((k) => k.kennwert),
    );
  });
});
