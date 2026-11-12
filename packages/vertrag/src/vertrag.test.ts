// SPDX-License-Identifier: AGPL-3.0-or-later
// Typtests für `vertrag` (Ticket 02). Sie laufen im Typprüfer (`pnpm typecheck`); zur Laufzeit prüft vitest
// nur die Konstantentabelle und die Beispiele.

import { createHash } from 'node:crypto';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  IFC_GLOBALID_MUSTER,
  NACHKOMMASTELLEN,
  type Angebotsposition,
  type Befehl,
  type Befehlskurzfassung,
  type Langtext,
  type Textergaenzung,
  type Befehlsart,
  type Befehlsfehler,
  type BefehlsEmpfaenger,
  type Betrag,
  type ChangeSet,
  type Dezimal,
  type ElternId,
  type Einheitspreis,
  type Ergebnis,
  type GliederungId,
  type Hinweistext,
  type HinweistextId,
  type Knoten,
  type KnotenId,
  type LeistungsverzeichnisId,
  type LosId,
  type LvBefehl,
  type LvChangeSet,
  type Menge,
  type MengeAendern,
  type Ordnungszahl,
  type Position,
  type PositionId,
  type Prozent,
  type Protokolleintrag,
  type TitelId,
  type Zeitstempel,
  type Aenderung,
  type AngebotChangeSet,
  type AngebotKopf,
  type AuftragsLvBefehl,
  type AuftragsLvChangeSet,
  type AuftragsLvZustand,
  type Befehlsfehlercode,
  type Befehlshinweis,
  type Befehlshinweiscode,
  type GaebVersion,
  type GliederungAnlegen,
  type GridIdQuelle,
  type GridZahlen,
  type IdQuelle,
  type LvAnsicht,
  type LvChangeSetAnwenden,
  type LvInhalt,
  type LvZustand,
  type OzMaske,
  type Projekt,
  type ProjektChangeSet,
  type Speicher,
  type Speicherfehler,
  type Speicherfehlercode,
  type Summenaenderung,
  type WurzelId,
  type Aenderungen,
  type Auftraggeber,
  type AuftraggeberSetzen,
  type Einfuegeort,
  type HistorienBefehl,
  type KnotenEinfuegen,
  type KnotenInPapierkorbLegen,
  type KnotenlisteVerschieben,
  type Leistungsverzeichnis,
  type LvKopf,
  type Leitbeschreibung,
  type LeitbeschreibungSetzen,
  type LvStand,
  type LvStandAnlegen,
  type LvStandId,
  type LvStandKopf,
  type LvStandRepository,
  type LvStandUebersicht,
  type Papierkorbeintrag,
  type PapierkorbeintragId,
  type PapierkorbeintragWiederherstellen,
  type Projektdatei,
  type ProtokollId,
  type Rueckgaengig,
  type Vergabeinformationen,
  type VergabeinformationenSetzen,
  type Wiederholen,
  type Ansatzzeile,
  type Auftragnehmer,
  type AuftragsLvKopf,
  type Einheitspreisanteile,
  type EpaArt,
  type EpaBezeichnung,
  type LvInhaltKopf,
  type LvRepository,
  type LvUebersicht,
  type MengenansatzSetzen,
  type Massenbefehlsart,
  type Positionsdaten,
  type Summenvorher,
  // v1.4
  type ProjektId,
  type AngebotId,
  type AuftragsLeistungsverzeichnisId,
  type AuftragsLvRepository,
  type AuftragsLvUebersicht,
  type AuftragsLvChangeSetAnwenden,
  type AuftragsLvChangeSetUmkehren,
  type NachtragUebernehmen,
  type Nachtragsangaben,
  type NachtragsangabenSetzen,
  type Nachtragsstatus,
  type Kostengruppennummer,
  type KostengruppeSetzen,
  type TextquelleSetzen,
  type VorlageSetzen,
  type Aufmass,
  type AufmassAnlegen,
  type AufmassBefehl,
  type AufmassChangeSet,
  type AufmassId,
  type AufmassKopf,
  type Aufmassposition,
  type AufmasspositionSetzen,
  type AufmassZustand,
  type Rechnung,
  type Rechnungsart,
  type RechnungBefehl,
  type RechnungChangeSet,
  type RechnungFreigeben,
  type RechnungId,
  type RechnungZustand,
  type RechnungsangabenSetzen,
  type Umlage,
  type Leistungsstand,
  type Kostenermittlung,
  type KostenermittlungBefehl,
  type KostenermittlungChangeSet,
  type KostenermittlungId,
  type Kostenermittlungseintrag,
  type Kostenermittlungsstufe,
  type KostenermittlungZustand,
  MASSENBEFEHLSARTEN,
  type AggregatBezug,
  type AngebotBefehl,
  type AufmassBefehlAusfuehren,
  type AufmassChangeSetAnwenden,
  type AufmassChangeSetUmkehren,
  type AufmassRepository,
  type KostenermittlungBefehlAusfuehren,
  type KostenermittlungChangeSetAnwenden,
  type KostenermittlungChangeSetUmkehren,
  type KostenermittlungRepository,
  type KostenermittlungUebersicht,
  type Massenbefehlskopf,
  type ProjektBefehl,
  type RechnungBefehlAusfuehren,
  type RechnungChangeSetAnwenden,
  type RechnungChangeSetUmkehren,
  type RechnungRepository,
  // v1.5
  type Befundquelle,
  type Pruefbefund,
  type OzVorschlag,
  type OzVorschlagen,
  type Gesamtsummen,
  type LvSpalte,
  type LvZeile,
} from './index';
import {
  beispielAnlegenChangeSet,
  beispielChangeSetEntfernen,
  beispielChangeSetHinzufuegen,
  beispielChangeSetMwst,
  beispielChangeSetNachlass,
  beispielChangeSetVerschieben,
  beispielAuftragsBefehl,
  beispielAuftragsChangeSet,
  beispielBefehl,
  beispielChangeSet,
  beispielChangeSetMitHinweis,
  beispielGliederungMitOz,
  beispielInhaltMitLos,
  beispielLeereAnsicht,
  beispielLoeschbefehle,
  beispielLoeschChangeSet,
  beispielLv,
  beispielAngebotspositionMitZuschlagssatz,
  beispielChangeSetHineinlegen,
  beispielChangeSetPapierkorbeintragEntfernen,
  beispielSummenMitBedarfUndWahl,
  beispielChangeSetWiederherstellen,
  beispielKnotenEinfuegen,
  beispielLvStandChangeSet,
  beispielProtokollRueckgaengig,
  beispielChangeSetMengenansatz,
  beispielChangeSetMengeOhneAnsatz,
  beispielLvKopfV13,
  beispielMengenansatzMitFehler,
  beispielMengenansatzSetzen,
  beispielMengeAendernMitAnsatz,
  beispielVerschiebenHinterGliederung,
  // v1.4
  beispielAuftragsLv,
  beispielAuftragsLvUebersicht,
  beispielChangeSetNachtragUebernehmen,
  beispielNachtragUebernehmen,
  beispielChangeSetNachtragBeauftragt,
  beispielNachtragsangabenSetzen,
  beispielChangeSetKostengruppe,
  beispielKostengruppeSetzen,
  beispielChangeSetTextquelle,
  beispielChangeSetVorlage,
  beispielTextquelleSetzen,
  beispielVorlageSetzen,
  beispielAufmass1,
  beispielAufmassAnlegen,
  beispielAufmasspositionSetzen,
  beispielChangeSetAufmassAnlegen,
  beispielChangeSetAufmasspositionSetzen,
  beispielChangeSetFreigabeAufheben,
  beispielChangeSetRechnungFreigeben,
  beispielRechnung1,
  beispielRechnung2,
  beispielRechnungFreigeben,
  beispielRechnungsfreigabeAufheben,
  beispielAuftragsLvMitNachtrag,
  beispielLeistungsstand,
  beispielChangeSetKostenermittlungseintrag,
  beispielKostenermittlung,
  beispielKostenermittlungseintragSetzen,
  beispielMassenprotokollAufmass,
  beispielAufmassBefehle,
  beispielKostenermittlungsbefehle,
  beispielKostenermittlungUebersicht,
  beispielProjektdateiV14,
  beispielRechnungAnlegen,
  beispielRechnungsbefehle,
  beispielLvUebersichtNachtrag,
  // v1.5
  beispielFehlerKostengruppe,
  beispielBefundeERechnung,
  beispielOzVorschlagAuftragsLv,
  beispielLvUebersichtNetto,
} from './beispiele';
// v1.6 (Ticket 97)
import type {
  Bautagebucheintrag,
  BautagebucheintragBefehl,
  BautagebucheintragChangeSet,
  BautagebucheintragId,
  BautagebucheintragZustand,
  Mangel,
  MangelangabenSetzen,
  MangelBefehl,
  MangelChangeSet,
  MangelId,
  Mangelstatus,
  MangelstatusSetzen,
  Mangelverlaufseintrag,
  MangelZustand,
} from './index';
import type {
  Befundort,
  BautagebuchRepository,
  BautagebucheintragBefehlAusfuehren,
  BautagebucheintragChangeSetAnwenden,
  BautagebucheintragChangeSetUmkehren,
  BauwerksmodellBefehlAusfuehren,
  BauwerksmodellChangeSetAnwenden,
  BauwerksmodellChangeSetUmkehren,
  BauwerksmodellRepository,
  BauwerksmodellUebersicht,
  BauzeitenplanBefehlAusfuehren,
  BauzeitenplanChangeSetAnwenden,
  BauzeitenplanChangeSetUmkehren,
  BauzeitenplanRepository,
  BauzeitenplanUebersicht,
  HonorarberechnungBefehlAusfuehren,
  HonorarberechnungChangeSetAnwenden,
  HonorarberechnungChangeSetUmkehren,
  HonorarberechnungId,
  HonorarberechnungRepository,
  HonorarberechnungUebersicht,
  MangelBefehlAusfuehren,
  MangelChangeSetAnwenden,
  MangelChangeSetUmkehren,
  MangelRepository,
} from './index';
import {
  beispielBauwerksmodellUebersicht,
  beispielBefundeV16,
  beispielMassenprotokollBauwerksmodell,
  beispielProjektdateiV16,
  beispielProtokollBauteileZuordnen,
} from './beispiele';
import {
  beispielBautagebuchbefehle,
  beispielBautagebucheintrag,
  beispielChangeSetBautagebucheintrag,
  beispielChangeSetMangelstatus,
  beispielMangel1,
  beispielMangel2,
  beispielMangelbefehle,
  beispielMangelstatusSetzen,
} from './beispiele';
import type {
  AnrechenbareKostenangabe,
  AnrechenbareKostenHerleitung,
  BeauftragteLeistungsphase,
  Honorarberechnung,
  HonorarberechnungBefehl,
  HonorarberechnungChangeSet,
  HonorarberechnungSetzen,
  HonorarberechnungZustand,
  Honorarergebnis,
  Honorarobjekt,
  Honorarspanne,
  Honorarzone,
  Leistungsbild,
  Leistungsphasennummer,
  Nebenkostenangabe,
  Objektergebnis,
  Phasenbetrag,
  Tafelinterpolation,
  Tafelzeile,
} from './index';
import {
  beispielChangeSetHonorarberechnungSetzen,
  beispielHonorarbefehle,
  beispielHonorarberechnung,
  beispielHonorarergebnis,
  beispielKostenberechnungHoai,
} from './beispiele';
import type {
  Anordnungsart,
  Anordnungsbeziehung,
  Arbeitskalender,
  Bauzeitenplan,
  BauzeitenplanBefehl,
  BauzeitenplanChangeSet,
  Bauzeitenplanergebnis,
  BauzeitenplanId,
  BauzeitenplankopfSetzen,
  BauzeitenplanZustand,
  Bundesland,
  Isttermine,
  Vorgang,
  Vorgangsart,
  Vorgangsbezug,
  Vorgangsergebnis,
  VorgangSetzen,
  Vorgangstermine,
  VorgangId,
  Wochentag,
} from './index';
import {
  beispielBauzeitenplan,
  beispielBauzeitenplanbefehle,
  beispielBauzeitenplanergebnis,
  beispielChangeSetVorgangEntfernen,
  beispielVorgangEntfernen,
  beispielVorgangSetzen,
} from './beispiele';
import type {
  BauteileZuordnen,
  Bauteil,
  Bauteilmenge,
  Bauteilzuordnung,
  Bauwerksmodell,
  BauwerksmodellAnlegen,
  BauwerksmodellBefehl,
  BauwerksmodellChangeSet,
  BauwerksmodellId,
  BauwerksmodellInhalt,
  BauwerksmodellKopf,
  BauwerksmodellUmbenennen,
  BauwerksmodellZustand,
  IfcGlobalId,
  IfcSchema,
  Modelldatei,
  Modelldateiablage,
  Strukturknoten,
  Titel,
} from './index';
import {
  beispielBauteileEntfernen,
  beispielBauteileZuordnen,
  beispielBauwerksmodell,
  beispielBauwerksmodell2Kopf,
  beispielChangeSetBauteileZuordnen,
  beispielBauwerksmodellAnlegen,
  beispielBauwerksmodellLoeschen,
  beispielBauwerksmodellUmbenennen,
  beispielChangeSetBauwerksmodellAnlegen,
  beispielChangeSetBauwerksmodellLoeschen,
  beispielChangeSetBauwerksmodellUmbenennen,
  beispielGlobalIds,
  beispielModelldatei,
  beispielModelldateiInProjektdatei,
} from './beispiele';

/**
 * Die Teile von T, die keine Daten sind (Funktion, Date …); `never`, wenn T nur aus Daten besteht. Seit v1.1b ist
 * `Langtext` rekursiv (Liste in Tabelle in Liste): Die frühere Fassung über einen abgebildeten Typ meldete dafür einen
 * Zirkelfehler (TS2615), eine unbegrenzte Rekursion über die Werte ebenso (TS2589). Darum läuft die Prüfung bis zur
 * Tiefe 14 und nimmt darunter „Daten“ an. **Grenze:** Was tiefer als 14 Ebenen unter der Wurzel liegt, wird nicht
 * geprüft; von `Protokolleintrag` oder `ChangeSet` aus erreicht diese Tiefe schon ein Textlauf in einer Tabellenzelle.
 * Darum gibt es zusätzlich Sonden, die an `Langtext` und an `Knoten` ansetzen (siehe unten), und eine Gegenprobe.
 */
type KeineDaten<T, Tiefe extends unknown[] = []> = Tiefe['length'] extends 14
  ? never
  : T extends string | number | boolean | null | undefined
    ? never
    : T extends (...args: never[]) => unknown
      ? T
      : T extends Date
        ? T
        : T extends readonly (infer U)[]
          ? KeineDaten<U, [...Tiefe, unknown]>
          : T extends object
            ? KeineDaten<T[keyof T], [...Tiefe, unknown]>
            : T;

/** `true`, wenn T nur aus Daten besteht: keine Funktion, kein Date, alles verschachtelt gleich. */
type NurDaten<T> = [KeineDaten<T>] extends [never] ? true : false;

// Sonden ab `Langtext` und `Knoten`: Jedes Langtext-Konstrukt liegt hier flach genug, um geprüft zu werden.
describe('reine Daten bis in den Langtext (v1.1b)', () => {
  it('Langtext und Knoten bestehen nur aus Daten', () => {
    expectTypeOf<NurDaten<Langtext>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<Knoten>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<Textergaenzung>>().toEqualTypeOf<true>();
  });

  it('Gegenprobe: eine Funktion an einem Textlauf in einer Tabellenzelle wird erkannt', () => {
    type Schlecht = readonly [
      {
        readonly art: 'tabelle';
        readonly zeilen: readonly {
          readonly zellen: readonly {
            readonly spalten: number;
            readonly inhalt: readonly {
              readonly art: 'text';
              readonly text: string;
              readonly f: () => void;
            }[];
          }[];
        }[];
      },
    ];
    expectTypeOf<NurDaten<Schlecht>>().toEqualTypeOf<false>();
  });
});

describe('Zahlen (N1)', () => {
  it('number und string sind für Menge, EP, Betrag und Prozent nicht zuweisbar', () => {
    expectTypeOf<number>().not.toExtend<Menge>();
    expectTypeOf<number>().not.toExtend<Einheitspreis>();
    expectTypeOf<number>().not.toExtend<Betrag>();
    expectTypeOf<number>().not.toExtend<Prozent>();
    expectTypeOf<number>().not.toExtend<Dezimal>();
    expectTypeOf<string>().not.toExtend<Menge>();
    expectTypeOf<string>().not.toExtend<Dezimal>();
  });

  it('die vier Zahlentypen sind untereinander nicht austauschbar, aber alle ein Dezimal', () => {
    expectTypeOf<Menge>().toExtend<Dezimal>();
    expectTypeOf<Einheitspreis>().toExtend<Dezimal>();
    expectTypeOf<Betrag>().toExtend<Dezimal>();
    expectTypeOf<Prozent>().toExtend<Dezimal>();
    expectTypeOf<Dezimal>().not.toExtend<Menge>();
    expectTypeOf<Menge>().not.toExtend<Einheitspreis>();
    expectTypeOf<Einheitspreis>().not.toExtend<Betrag>();
    expectTypeOf<Betrag>().not.toExtend<Prozent>();
  });

  it('die Felder der Position sind Dezimaltypen, nie number', () => {
    expectTypeOf<Position['menge']>().toEqualTypeOf<Menge | null>();
    expectTypeOf<Position['einheitspreis']>().toEqualTypeOf<Einheitspreis | null>();
    expectTypeOf<Position['menge']>().not.toExtend<number | null>();
  });

  it('die Nachkommastellen stehen in genau einer Tabelle (N3, G-21)', () => {
    expect(NACHKOMMASTELLEN).toEqual({ menge: 3, einheitspreis: 3, prozent: 2, betrag: 2 });
  });
});

describe('Kennungen (A7, ADR 0011)', () => {
  it('jeder Knoten trägt eine KnotenId, die Ordnungszahl ist kein Schlüssel', () => {
    expectTypeOf<Knoten['id']>().toExtend<KnotenId>();
    expectTypeOf<Position['id']>().toEqualTypeOf<PositionId>();
    expectTypeOf<Ordnungszahl>().not.toExtend<KnotenId>();
    expectTypeOf<Ordnungszahl>().not.toExtend<PositionId>();
    expectTypeOf<string>().not.toExtend<PositionId>();
  });

  it('Kennungen verschiedener Entitäten sind nicht austauschbar', () => {
    expectTypeOf<PositionId>().toExtend<KnotenId>();
    expectTypeOf<TitelId>().toExtend<GliederungId>();
    expectTypeOf<LosId>().toExtend<GliederungId>();
    expectTypeOf<KnotenId>().not.toExtend<PositionId>();
    expectTypeOf<TitelId>().not.toExtend<PositionId>();
    expectTypeOf<HinweistextId>().not.toExtend<GliederungId>();
    expectTypeOf<LeistungsverzeichnisId>().not.toExtend<KnotenId>();
  });

  it('die Wurzel des Baums ist ein zulässiger Elternknoten', () => {
    expectTypeOf<LeistungsverzeichnisId>().toExtend<ElternId>();
    expectTypeOf<GliederungId>().toExtend<ElternId>();
    expectTypeOf<PositionId>().not.toExtend<ElternId>();
  });

  it('Zeitpunkte sind Zeichenketten, kein Date', () => {
    expectTypeOf<Zeitstempel>().toExtend<string>();
    expectTypeOf<Date>().not.toExtend<Zeitstempel>();
  });
});

describe('Knoten', () => {
  it('ein Hinweistext trägt weder Menge noch Preis', () => {
    expectTypeOf<Hinweistext>().not.toHaveProperty('menge');
    expectTypeOf<Hinweistext>().not.toHaveProperty('einheitspreis');
  });

  it('die Knotenarten sind unterscheidbar', () => {
    expectTypeOf<Knoten['art']>().toEqualTypeOf<'los' | 'titel' | 'position' | 'hinweis'>();
  });

  it('„nicht angeboten“ trägt keinen Preis und ist von einem Preis 0 verschieden', () => {
    expectTypeOf<Extract<Angebotsposition, { status: 'nicht-angeboten' }>>().not.toHaveProperty(
      'einheitspreis',
    );
    expectTypeOf<
      Extract<Angebotsposition, { status: 'angeboten' }>['einheitspreis']
    >().toEqualTypeOf<Einheitspreis>();
  });
});

describe('Befehle (A5)', () => {
  it('decken die Befehle der Tickets 05, 06, 07 und 21 ab', () => {
    type Erwartet =
      | 'GliederungAnlegen'
      | 'PositionAnlegen'
      | 'HinweistextAnlegen'
      | 'KnotenLoeschen'
      | 'KnotenVerschieben'
      | 'OzMaskeSetzen'
      | 'OrdnungszahlSetzen'
      | 'Umnummerieren'
      | 'NachlassSetzen'
      | 'NachlassEntfernen'
      | 'MwstSatzSetzen'
      | 'KurztextAendern'
      | 'MengeAendern'
      | 'EinheitAendern'
      | 'EinheitspreisAendern';
    expectTypeOf<Erwartet>().toExtend<Befehlsart>();
  });

  it('sind reine Daten: keine Funktionen, kein Date', () => {
    expectTypeOf<NurDaten<Befehl>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<ChangeSet>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<Protokolleintrag>>().toEqualTypeOf<true>();
    // Gegenprobe: der Prüftyp erkennt Funktionen und Date.
    expectTypeOf<NurDaten<{ f: () => void }>>().toEqualTypeOf<false>();
    expectTypeOf<NurDaten<{ d: Date }>>().toEqualTypeOf<false>();
  });

  it('lassen sich über `art` einengen', () => {
    expectTypeOf<Extract<Befehl, { art: 'MengeAendern' }>>().toEqualTypeOf<MengeAendern>();
    expectTypeOf<Extract<LvBefehl, { art: 'NachlassEntfernen' }>>().toHaveProperty('art');
  });

  it('der Protokolleintrag hält wer, was, wann fest (ADR 0009)', () => {
    expectTypeOf<Protokolleintrag>().toHaveProperty('wer');
    expectTypeOf<Protokolleintrag['befehl']>().toEqualTypeOf<Befehl | Befehlskurzfassung>();
    expectTypeOf<Protokolleintrag['wann']>().toEqualTypeOf<Zeitstempel>();
  });

  it('das Grid gibt Befehle aus', () => {
    expectTypeOf<BefehlsEmpfaenger>().parameter(0).toEqualTypeOf<LvBefehl>();
  });
});

describe('ChangeSet (A6) und Fehlerwert', () => {
  it('ein LV-ChangeSet trägt geänderte Knoten und betroffene Summen', () => {
    expectTypeOf<LvChangeSet>().toHaveProperty('knoten');
    expectTypeOf<LvChangeSet>().toHaveProperty('summen');
    expectTypeOf<LvChangeSet['knoten']['hinzugefuegt']>().toEqualTypeOf<readonly Knoten[]>();
    expectTypeOf<LvChangeSet['knoten']['entfernt']>().toEqualTypeOf<readonly Knoten[]>();
  });

  it('ein abgewiesener Befehl ist ein Fehlerwert, keine Ausnahme', () => {
    const pruefen = (e: Ergebnis<LvChangeSet, Befehlsfehler>): void => {
      if (e.ok) {
        expectTypeOf(e.wert).toEqualTypeOf<LvChangeSet>();
      } else {
        expectTypeOf(e.fehler).toEqualTypeOf<Befehlsfehler>();
      }
    };
    pruefen({ ok: false, fehler: { code: 'zyklus', meldung: 'Knoten liegt im eigenen Unterbaum.' } });
  });
});

describe('Beispiele kompilieren', () => {
  it('Beispielbefehl, Beispiel-ChangeSet und Auszug einer Fixture', () => {
    expectTypeOf(beispielBefehl).toEqualTypeOf<LvBefehl>();
    expectTypeOf(beispielChangeSet).toEqualTypeOf<LvChangeSet>();
    expect(beispielBefehl.art).toBe('MengeAendern');
    expect(beispielChangeSet.knoten.geaendert).toHaveLength(1);
    expect(beispielLv.knoten).toHaveLength(2);
  });
});

// --- v1.1a --------------------------------------------------------------------------------------------------------

/**
 * Umkehrung eines LV-ChangeSets, nur aus dem ChangeSet gelesen (kein Zustand, kein Kern). Der Test belegt, dass der
 * Vertrag dafür alles trägt; die Umsetzung im Kern ist Sache des Folgetickets. `summen.vorher` ist seit v1.3 Pflicht.
 */
function umkehren(cs: LvChangeSet): LvChangeSet {
  const v = cs.summen.vorher;
  const alteP = new Set<string>(v.positionen.map((p) => p.positionId));
  const alteG = new Set<string>(v.gliederungen.map((g) => g.gliederungId));
  const summen: Summenaenderung = {
    // wiederherstellen: alte Werte der geänderten Einträge und die Summen entfernter Knoten
    positionen: [...v.positionen, ...v.entfernt.positionen],
    gliederungen: [...v.gliederungen, ...v.entfernt.gliederungen],
    gesamt: v.gesamt,
    vorher: {
      positionen: cs.summen.positionen.filter((p) => alteP.has(p.positionId)),
      gliederungen: cs.summen.gliederungen.filter((g) => alteG.has(g.gliederungId)),
      gesamt: cs.summen.gesamt,
      entfernt: {
        // neu entstandene Summen fallen bei der Umkehrung weg
        positionen: cs.summen.positionen.filter((p) => !alteP.has(p.positionId)),
        gliederungen: cs.summen.gliederungen.filter((g) => !alteG.has(g.gliederungId)),
      },
    },
  };
  return {
    art: 'leistungsverzeichnis',
    leistungsverzeichnisId: cs.leistungsverzeichnisId,
    kopf: cs.kopf === null ? null : { vorher: cs.kopf.nachher, nachher: cs.kopf.vorher },
    knoten: {
      hinzugefuegt: cs.knoten.entfernt,
      geaendert: cs.knoten.geaendert.map((g) => ({ vorher: g.nachher, nachher: g.vorher })),
      entfernt: cs.knoten.hinzugefuegt,
    },
    summen,
  };
}

describe('v1.1a Punkt 1: Summen umkehrbar', () => {
  it('Summenaenderung nennt alte Werte, Vorwert der Gesamtsummen und die Summen entfernter Knoten', () => {
    expectTypeOf<NonNullable<Summenaenderung['vorher']>>().toHaveProperty('positionen');
    expectTypeOf<NonNullable<Summenaenderung['vorher']>>().toHaveProperty('gliederungen');
    expectTypeOf<NonNullable<Summenaenderung['vorher']>>().toHaveProperty('gesamt');
    expectTypeOf<NonNullable<Summenaenderung['vorher']>>().toHaveProperty('entfernt');
  });

  it('aus einem ChangeSet allein ist die Umkehrung ablesbar, auch für Summen und entfernte Knoten', () => {
    // Änderung: neue Menge → alte Menge und alte Summen kommen zurück.
    const zurueck = umkehren(beispielChangeSet);
    expect(zurueck.knoten.geaendert[0]?.nachher).toEqual(beispielChangeSet.knoten.geaendert[0]?.vorher);
    expect(zurueck.summen.positionen[0]?.gesamtpreis).toBe('10.00');
    expect(zurueck.summen.gliederungen[0]?.summe).toBe('10.00');
    expect(zurueck.summen.gesamt?.brutto).toBe('11.90');
    // Löschen: Die Umkehrung ist das Anlegen mit allen Knoten und allen Summen.
    const neu = umkehren(beispielLoeschChangeSet);
    expect(neu.kopf?.vorher).toBeNull();
    expect(neu.kopf?.nachher).toEqual(beispielLoeschChangeSet.kopf?.vorher);
    expect(neu.knoten.hinzugefuegt).toEqual(beispielLv.knoten);
    expect(neu.summen.positionen).toHaveLength(1);
    expect(neu.summen.gliederungen).toHaveLength(1);
    expect(neu.summen.gesamt).toEqual(beispielChangeSet.summen.gesamt);
  });

  it.each([
    ['Menge ändern', beispielChangeSet],
    ['Knoten hinzufügen', beispielChangeSetHinzufuegen],
    ['Knoten entfernen', beispielChangeSetEntfernen],
    ['Knoten verschieben', beispielChangeSetVerschieben],
    ['LV anlegen', beispielAnlegenChangeSet],
    ['LV löschen', beispielLoeschChangeSet],
    ['Nachlass ändern', beispielChangeSetNachlass],
    ['MwSt-Satz ändern', beispielChangeSetMwst],
  ])('%s: zweimal umkehren ergibt das ChangeSet', (_name, cs) => {
    expect(umkehren(umkehren(cs))).toEqual(cs);
  });

  it('Hinzufügen und Entfernen, Anlegen und Löschen sind Umkehrungen voneinander', () => {
    expect(umkehren(beispielChangeSetHinzufuegen)).toEqual(beispielChangeSetEntfernen);
    expect(umkehren(beispielAnlegenChangeSet)).toEqual(beispielLoeschChangeSet);
  });

  it('Entfernen stellt Knoten und deren Summen aus dem ChangeSet allein wieder her', () => {
    const neu = umkehren(beispielChangeSetEntfernen);
    expect(neu.knoten.hinzugefuegt).toHaveLength(1);
    expect(neu.summen.positionen).toEqual(beispielChangeSetEntfernen.summen.vorher.entfernt.positionen);
    expect(neu.summen.gliederungen[0]?.summe).toBe('22.35');
  });

  it('Verschieben: die alte Lage steht in `geaendert[].vorher`', () => {
    const zurueck = umkehren(beispielChangeSetVerschieben);
    const k = zurueck.knoten.geaendert[0]?.nachher;
    expect(k?.elternId).toBe(beispielChangeSetVerschieben.knoten.geaendert[0]?.vorher.elternId);
    expect(k?.reihenfolge).toBe(1);
    expect(zurueck.summen.gliederungen.map((g) => g.summe)).toEqual(['22.35', '0.00']);
  });

  it('Nachlass und MwSt: alter Kopf und alte Gesamtsummen kommen zurück', () => {
    const n = umkehren(beispielChangeSetNachlass);
    expect(n.kopf?.nachher?.nachlass).toBeNull();
    expect(n.summen.gesamt?.nachlass).toBe('0.00');
    const m = umkehren(beispielChangeSetMwst);
    expect(m.kopf?.nachher?.mwstSatz).toBe('19.00');
    expect(m.summen.gesamt?.brutto).toBe('14.70');
  });

  it('v1.3: ein ChangeSet ohne `vorher` ist kein gültiger Wert mehr (Pflichtfeld, Ticket 53 Punkt 3)', () => {
    const { positionen, gliederungen, gesamt } = beispielChangeSet.summen;
    // @ts-expect-error -- seit v1.3 ist `Summenaenderung.vorher` Pflicht
    const ohne: Summenaenderung = { positionen, gliederungen, gesamt };
    expect(ohne).not.toHaveProperty('vorher');
  });
});

describe('v1.1a Punkt 2: LV-Anlegen umkehrbar', () => {
  it('LvChangeSetAnwenden darf null liefern', () => {
    expectTypeOf<ReturnType<LvChangeSetAnwenden>>().toEqualTypeOf<LvZustand | null>();
    expectTypeOf<Parameters<LvChangeSetAnwenden>[0]>().toEqualTypeOf<LvZustand | null>();
  });

  it('das Anlegen (kopf.vorher: null) und das Löschen (kopf.nachher: null) sind Gegenstücke', () => {
    expect(umkehren(beispielLoeschChangeSet).kopf?.vorher).toBeNull();
    expect(beispielLoeschChangeSet.kopf?.nachher).toBeNull();
  });
});

describe('v1.1a Punkt 3: Speicher', () => {
  it('Speicherfehlercode kennt konflikt und existiert-bereits', () => {
    expectTypeOf<'konflikt'>().toExtend<Speicherfehlercode>();
    expectTypeOf<'existiert-bereits'>().toExtend<Speicherfehlercode>();
  });

  it('Speicher hat schliessen()', () => {
    expectTypeOf<Speicher['schliessen']>().toBeFunction();
    expectTypeOf<ReturnType<Speicher['schliessen']>>().toEqualTypeOf<
      Promise<Ergebnis<void, Speicherfehler>>
    >();
  });
});

describe('v1.1a Punkt 4: Löschen', () => {
  it('Projekt, LV und Angebot haben je einen Löschbefehl, reine Daten', () => {
    expectTypeOf<
      'ProjektLoeschen' | 'LeistungsverzeichnisLoeschen' | 'AngebotLoeschen'
    >().toExtend<Befehlsart>();
    expectTypeOf<Extract<LvBefehl, { art: 'LeistungsverzeichnisLoeschen' }>>().toHaveProperty('art');
    expect(beispielLoeschbefehle.map((b) => b.art)).toEqual([
      'ProjektLoeschen',
      'LeistungsverzeichnisLoeschen',
      'AngebotLoeschen',
    ]);
  });

  it('die ChangeSets stellen das Löschen als nachher: null dar und tragen den vollen Stand', () => {
    expectTypeOf<ProjektChangeSet['projekt']['nachher']>().toEqualTypeOf<Projekt | null>();
    expectTypeOf<AngebotChangeSet['kopf']>().toEqualTypeOf<Aenderung<AngebotKopf> | null>();
    expect(beispielLoeschChangeSet.knoten.entfernt).toEqual(beispielLv.knoten);
    expect(beispielLoeschChangeSet.summen.vorher.entfernt.positionen).toHaveLength(1);
  });
});

describe('v1.1a Punkt 5: Auftrags-LV', () => {
  it('Befehl und ChangeSet legen das Auftrags-LV als Aggregat an', () => {
    expectTypeOf(beispielAuftragsBefehl).toExtend<Befehl>();
    // v1.4 (Ticket 70 Punkt 2): dazu `NachtragUebernehmen` und `KostengruppeSetzen`, siehe unten
    expectTypeOf<'AuftragsLeistungsverzeichnisAnlegen'>().toExtend<AuftragsLvBefehl['art']>();
    expectTypeOf(beispielAuftragsChangeSet).toEqualTypeOf<AuftragsLvChangeSet>();
    expectTypeOf<AuftragsLvChangeSet>().toExtend<ChangeSet>();
    expectTypeOf<AuftragsLvZustand>().toHaveProperty('auftragsLeistungsverzeichnis');
    expect(beispielAuftragsChangeSet.kopf?.vorher).toBeNull();
    expect(beispielAuftragsChangeSet.knoten.hinzugefuegt).toHaveLength(2);
  });
});

describe('v1.1a Punkt 6: Wurzel-ID', () => {
  it('LvInhalt und LvAnsicht kennen die Wurzel', () => {
    expectTypeOf<LvInhalt['wurzelId']>().toEqualTypeOf<LeistungsverzeichnisId>();
    expectTypeOf<LvAnsicht['wurzelId']>().toEqualTypeOf<WurzelId>();
    expectTypeOf<WurzelId>().toExtend<ElternId>();
    expectTypeOf<GliederungId>().not.toExtend<WurzelId>();
    expect(beispielLeereAnsicht.zeilen).toHaveLength(0);
    expect(beispielInhaltMitLos.wurzelId).toBe(beispielLv.id);
  });
});

describe('v1.1a Punkt 7: Ränder des Grids', () => {
  it('GridZahlen und GridIdQuelle stehen im Vertrag; es gibt eine IdQuelle', () => {
    expectTypeOf<GridZahlen['parseMenge']>().returns.toEqualTypeOf<Ergebnis<Menge, string>>();
    expectTypeOf<GridZahlen['parseEinheitspreis']>().returns.toEqualTypeOf<Ergebnis<Einheitspreis, string>>();
    expectTypeOf<GridZahlen['formatBetrag']>().parameter(0).toEqualTypeOf<Betrag>();
    // v1.2 (D-10 (4)): das Grid legt auch Papierkorbeinträge an (`KnotenInPapierkorbLegen`, Ticket 46).
    expectTypeOf<GridIdQuelle>().toEqualTypeOf<Pick<IdQuelle, 'position' | 'papierkorbeintrag'>>();
    expectTypeOf<IdQuelle>().toExtend<GridIdQuelle>();
  });
});

describe('v1.1a Punkt 8: Codes', () => {
  it('GaebVersion kennt 3.1, Befehlsfehlercode kennt OZ doppelt und Überlauf', () => {
    expectTypeOf<'3.1'>().toExtend<GaebVersion>();
    expectTypeOf<'oz-doppelt' | 'oz-ueberlauf'>().toExtend<Befehlsfehlercode>();
  });
});

describe('v1.1a Punkt 9: OZ', () => {
  it('OzMaske hat ein Feld für die Los-Stufe, GliederungAnlegen ein OZ-Feld', () => {
    expectTypeOf<OzMaske>().toHaveProperty('losStufe');
    expectTypeOf<GliederungAnlegen>().toHaveProperty('ordnungszahl');
    expect(beispielInhaltMitLos.ozMaske.losStufe).toBe(true);
    expect(beispielInhaltMitLos.ozMaske.gliederung.length).toBeLessThanOrEqual(5);
    expect(beispielGliederungMitOz.ordnungszahl).toBe('01');
  });
});

describe('v1.1a Punkt 10: Hinweise aus Befehlen', () => {
  it('ein ChangeSet trägt Hinweise; kein Fehlercode weist den Befehl wegen negativen Nettos ab', () => {
    expectTypeOf<LvChangeSet['hinweise']>().toEqualTypeOf<readonly Befehlshinweis[] | undefined>();
    expectTypeOf<'oz-schritt-ausgewichen' | 'netto-nach-nachlass-negativ'>().toExtend<Befehlshinweiscode>();
    expectTypeOf<'netto-nach-nachlass-negativ'>().not.toExtend<Befehlsfehlercode>();
    expectTypeOf<NurDaten<ChangeSet>>().toEqualTypeOf<true>();
    expect(beispielChangeSetMitHinweis.hinweise?.[0]?.code).toBe('netto-nach-nachlass-negativ');
  });
});

// --- v1.2 (Ticket 29) ---------------------------------------------------------------------------------------------

/**
 * Umkehrung ab v1.2: wie `umkehren`, dazu der Papierkorb und der LV-Stand. Fehlt ein Feld im ChangeSet, fehlt es auch
 * in der Umkehrung (Werte vor v1.2 bleiben unverändert).
 */
function umkehrenV12(cs: LvChangeSet): LvChangeSet {
  const basis = umkehren(cs);
  const p = cs.papierkorb;
  const s = cs.lvStand;
  return {
    ...basis,
    ...(p === undefined
      ? {}
      : {
          papierkorb: {
            hinzugefuegt: p.entfernt,
            geaendert: p.geaendert.map((g) => ({ vorher: g.nachher, nachher: g.vorher })),
            entfernt: p.hinzugefuegt,
          },
        }),
    ...(s === undefined ? {} : { lvStand: { vorher: s.nachher, nachher: s.vorher } }),
  };
}

describe('v1.2 Nr. 1: Zuschlagssatz des Bieters', () => {
  it('nur die Variante `angeboten` trägt einen optionalen Zuschlagssatz', () => {
    type Angeboten = Extract<Angebotsposition, { status: 'angeboten' }>;
    expectTypeOf<Angeboten['zuschlagssatz']>().toEqualTypeOf<Prozent | undefined>();
    expectTypeOf<Angeboten['einheitspreis']>().toEqualTypeOf<Einheitspreis>();
    expectTypeOf<Extract<Angebotsposition, { status: 'nicht-angeboten' }>>().not.toHaveProperty(
      'zuschlagssatz',
    );
    const p = beispielAngebotspositionMitZuschlagssatz;
    expect(p.status === 'angeboten' ? p.zuschlagssatz : null).toBe('5.00');
  });
});

describe('v1.2 Nr. 3: Maskenbefund am Befehl', () => {
  it('der Hinweiscode oz-maske-ungueltig ist ein Hinweis, kein Fehler', () => {
    expectTypeOf<'oz-maske-ungueltig'>().toExtend<Befehlshinweiscode>();
    expectTypeOf<'oz-maske-ungueltig'>().not.toExtend<Befehlsfehlercode>();
  });
});

describe('v1.2 Nr. 4: Kopieren, Verschieben, Papierkorb (K9)', () => {
  it('die neuen LV-Befehle stehen in LvBefehl', () => {
    type Neu =
      | 'KnotenEinfuegen'
      | 'KnotenlisteVerschieben'
      | 'KnotenInPapierkorbLegen'
      | 'PapierkorbeintragWiederherstellen'
      | 'PapierkorbeintragEntfernen'
      | 'PapierkorbLeeren';
    expectTypeOf<Neu>().toExtend<LvBefehl['art']>();
    expectTypeOf<KnotenEinfuegen['knoten']>().toEqualTypeOf<readonly Knoten[]>();
    expectTypeOf<KnotenlisteVerschieben['knotenIds']>().toEqualTypeOf<readonly KnotenId[]>();
    expectTypeOf<KnotenInPapierkorbLegen['eintragId']>().toEqualTypeOf<PapierkorbeintragId>();
    expectTypeOf<PapierkorbeintragWiederherstellen['ort']>().toEqualTypeOf<Einfuegeort | null>();
  });

  it('KnotenEinfuegen: ein Titel mit zwei Positionen, Eltern vor Kindern', () => {
    const b = beispielKnotenEinfuegen;
    expect(b.knoten.map((k) => k.art)).toEqual(['titel', 'position', 'position']);
    const ids = new Set<string>(b.knoten.map((k) => k.id));
    // genau eine Wurzel des Teilbaums: der Titel; die Positionen hängen an ihm
    expect(b.knoten.filter((k) => !ids.has(k.elternId))).toHaveLength(1);
    expect(b.knoten.slice(1).every((k) => k.elternId === b.knoten[0]?.id)).toBe(true);
  });

  it('der Papierkorb liegt am Zustand, nicht am LV oder Kopf, und ist ohne Feld leer (D-12)', () => {
    expectTypeOf<LvZustand['papierkorb']>().toEqualTypeOf<readonly Papierkorbeintrag[] | undefined>();
    expectTypeOf<Leistungsverzeichnis>().not.toHaveProperty('papierkorb');
    expectTypeOf<LvKopf>().not.toHaveProperty('papierkorb');
    expectTypeOf<LvStand['zustand']['papierkorb']>().toEqualTypeOf<
      readonly Papierkorbeintrag[] | undefined
    >();
    expectTypeOf<Papierkorbeintrag['knoten']>().toEqualTypeOf<readonly Knoten[]>();
    expectTypeOf<Papierkorbeintrag['nummer']>().toEqualTypeOf<number>();
    expectTypeOf<LvChangeSet['papierkorb']>().toEqualTypeOf<Aenderungen<Papierkorbeintrag> | undefined>();
  });

  it('Entfernen eines Eintrags nimmt hängende Bezüge mit; die Umkehrung stellt Eintrag (mit Nummer) und Bezug her', () => {
    const e = beispielChangeSetPapierkorbeintragEntfernen;
    expect(e.papierkorb?.entfernt.map((p) => p.nummer)).toEqual([1]);
    expect(e.knoten.entfernt).toHaveLength(0);
    const bezugVorher = e.knoten.geaendert[0]?.vorher;
    const bezugNachher = e.knoten.geaendert[0]?.nachher;
    const bezuege = (k: Knoten | undefined): unknown =>
      k?.art === 'position' && k.zuschlag?.bezug.art === 'positionen'
        ? k.zuschlag.bezug.positionen.map((b) => b.positionId)
        : null;
    expect(bezuege(bezugVorher)).toContain(e.papierkorb?.entfernt[0]?.knoten[0]?.id);
    expect(bezuege(bezugNachher)).not.toContain(e.papierkorb?.entfernt[0]?.knoten[0]?.id);
    const zurueck = umkehrenV12(e);
    expect(zurueck.papierkorb?.hinzugefuegt).toEqual(e.papierkorb?.entfernt);
    expect(zurueck.knoten.geaendert[0]?.nachher).toEqual(bezugVorher);
    expect(umkehrenV12(zurueck)).toEqual(e);
  });

  it('Hineinlegen und Wiederherstellen sind Umkehrungen voneinander, allein aus dem ChangeSet', () => {
    expect(umkehrenV12(beispielChangeSetHineinlegen)).toEqual(beispielChangeSetWiederherstellen);
    expect(umkehrenV12(beispielChangeSetWiederherstellen)).toEqual(beispielChangeSetHineinlegen);
    expect(umkehrenV12(umkehrenV12(beispielChangeSetHineinlegen))).toEqual(beispielChangeSetHineinlegen);
  });

  it('Hineinlegen: Knoten aus dem Baum, ein Eintrag mit alter Lage; die Summe der Position fällt weg', () => {
    const h = beispielChangeSetHineinlegen;
    const eintrag = h.papierkorb?.hinzugefuegt[0];
    expect(h.knoten.entfernt).toEqual(eintrag?.knoten);
    expect(eintrag?.knoten[0]?.reihenfolge).toBe(1);
    expect(h.summen.positionen).toHaveLength(0);
    expect(h.summen.vorher.entfernt.positionen).toHaveLength(1);
    const w = beispielChangeSetWiederherstellen;
    expect(w.knoten.hinzugefuegt).toEqual(eintrag?.knoten);
    expect(w.papierkorb?.entfernt).toEqual([eintrag]);
  });
});

describe('v1.2 Nr. 5: Rückgängig, Wiederholen, LV-Stand (S3)', () => {
  it('Rückgängig und Wiederholen sind Befehle, aber keine LV-Befehle', () => {
    expectTypeOf<HistorienBefehl>().toExtend<Befehl>();
    expectTypeOf<HistorienBefehl['art']>().toEqualTypeOf<'Rueckgaengig' | 'Wiederholen'>();
    expectTypeOf<'Rueckgaengig' | 'Wiederholen'>().not.toExtend<LvBefehl['art']>();
    expectTypeOf<Rueckgaengig['protokollId']>().toEqualTypeOf<ProtokollId>();
    expectTypeOf<Wiederholen['protokollId']>().toEqualTypeOf<ProtokollId>();
    expect(beispielProtokollRueckgaengig.befehl.art).toBe('Rueckgaengig');
  });

  it('LV-Stand: Kopf, unveränderlicher Stand, Übersicht ohne Zustand', () => {
    expectTypeOf<LvStand['zustand']>().toEqualTypeOf<LvZustand>();
    expectTypeOf<LvStand['angelegt']>().toEqualTypeOf<Zeitstempel>();
    expectTypeOf<LvStand>().toExtend<LvStandKopf>();
    expectTypeOf<LvStandUebersicht>().not.toHaveProperty('zustand');
    expectTypeOf<LvStandAnlegen['id']>().toEqualTypeOf<LvStandId>();
    expectTypeOf<'LvStandAnlegen'>().toExtend<LvBefehl['art']>();
    expectTypeOf<LvChangeSet['lvStand']>().toEqualTypeOf<Aenderung<LvStandKopf> | undefined>();
  });

  it('ChangeSet von LvStandAnlegen: nur der neue Kopf, umkehrbar zum Entfallen des Stands', () => {
    const cs = beispielLvStandChangeSet;
    expect(cs.lvStand?.vorher).toBeNull();
    expect(cs.knoten).toEqual({ hinzugefuegt: [], geaendert: [], entfernt: [] });
    const zurueck = umkehrenV12(cs);
    expect(zurueck.lvStand?.nachher).toBeNull();
    expect(umkehrenV12(zurueck)).toEqual(cs);
  });

  it('Speicher und Projektdatei kennen LV-Stände (am Speicher Pflicht seit v1.3, in der Datei optional)', () => {
    expectTypeOf<Speicher['lvStaende']>().toEqualTypeOf<LvStandRepository>();
    expectTypeOf<Projektdatei['lvStaende']>().toEqualTypeOf<readonly LvStand[] | undefined>();
    expectTypeOf<ReturnType<LvStandRepository['laden']>>().toEqualTypeOf<
      Promise<Ergebnis<LvStand, Speicherfehler>>
    >();
    expectTypeOf<ReturnType<LvStandRepository['auflisten']>>().toEqualTypeOf<
      Promise<Ergebnis<readonly LvStandUebersicht[], Speicherfehler>>
    >();
  });
});

describe('v1.2 Nr. 6: Kennungen', () => {
  it('IdQuelle liefert Papierkorbeinträge und LV-Stände; die Marken sind nicht austauschbar', () => {
    expectTypeOf<ReturnType<IdQuelle['papierkorbeintrag']>>().toEqualTypeOf<PapierkorbeintragId>();
    expectTypeOf<ReturnType<IdQuelle['lvStand']>>().toEqualTypeOf<LvStandId>();
    expectTypeOf<PapierkorbeintragId>().not.toExtend<KnotenId>();
    expectTypeOf<LvStandId>().not.toExtend<LeistungsverzeichnisId>();
    expectTypeOf<string>().not.toExtend<LvStandId>();
  });
});

describe('v1.2 Nr. 8: Kopfdaten bearbeiten', () => {
  it('je ein Befehl mit dem ganzen neuen Wert, null entfernt', () => {
    expectTypeOf<'AuftraggeberSetzen' | 'VergabeinformationenSetzen' | 'LeitbeschreibungSetzen'>().toExtend<
      LvBefehl['art']
    >();
    expectTypeOf<AuftraggeberSetzen['auftraggeber']>().toEqualTypeOf<Auftraggeber | null>();
    expectTypeOf<
      VergabeinformationenSetzen['vergabeinformationen']
    >().toEqualTypeOf<Vergabeinformationen | null>();
    expectTypeOf<LeitbeschreibungSetzen['leitbeschreibung']>().toEqualTypeOf<Leitbeschreibung | null>();
    expectTypeOf<LeitbeschreibungSetzen['positionId']>().toEqualTypeOf<PositionId>();
  });
});

describe('v1.2: reine Daten und Werte vor v1.2', () => {
  it('NurDaten deckt die neuen Befehle, ChangeSets, LV-Stände und den Papierkorb ab', () => {
    expectTypeOf<NurDaten<HistorienBefehl>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<KnotenEinfuegen>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<Befehl>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<LvChangeSet>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<Papierkorbeintrag>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<LvStand>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<Projektdatei>>().toEqualTypeOf<true>();
  });

  it('Angebotsposition ohne Zuschlagssatz, Zustand ohne Papierkorb, ChangeSet ohne Papierkorb und LV-Stand bleiben gültig', () => {
    const alt: Angebotsposition = {
      positionId: '019b76e9-0000-7000-8000-000000000003' as PositionId,
      status: 'angeboten',
      einheitspreis: '10.000' as Einheitspreis,
      epa: null,
    };
    const zustand: LvZustand = {
      leistungsverzeichnis: beispielLv,
      summen: { positionen: [], gliederungen: [], gesamt: beispielSummenMitBedarfUndWahl },
    };
    const cs: LvChangeSet = beispielChangeSet;
    expect('zuschlagssatz' in alt).toBe(false);
    expect(zustand.papierkorb).toBeUndefined();
    expect(cs.papierkorb).toBeUndefined();
    expect(cs.lvStand).toBeUndefined();
    // die Umkehrung ab v1.2 erfindet keine Felder
    expect(Object.keys(umkehrenV12(cs))).not.toContain('papierkorb');
    expect(Object.keys(umkehrenV12(cs))).not.toContain('lvStand');
  });
});

// --- v1.3 (Ticket 53) -------------------------------------------------------------------------------------------

/** Die Position eines Knotens oder `undefined`. */
const alsPosition = (k: Knoten | undefined): Position | undefined => (k?.art === 'position' ? k : undefined);

describe('v1.3 Punkt 1: LV-Übersicht', () => {
  it('auflisten liefert Kennung und Name, keine Knoten', () => {
    expectTypeOf<ReturnType<LvRepository['auflisten']>>().toEqualTypeOf<
      Promise<Ergebnis<readonly LvUebersicht[], Speicherfehler>>
    >();
    expectTypeOf<LvUebersicht['id']>().toEqualTypeOf<LeistungsverzeichnisId>();
    expectTypeOf<LvUebersicht['name']>().toEqualTypeOf<string>();
    expectTypeOf<LvUebersicht>().not.toHaveProperty('knoten');
  });
});

describe('v1.3 Punkte 2 und 6: EPA-Bezeichnungen und Auftragnehmer am LV-Kopf', () => {
  it('EpaArt sind genau die Anteile von Einheitspreisanteile', () => {
    expectTypeOf<EpaArt>().toEqualTypeOf<Exclude<keyof Einheitspreisanteile, 'freiBezeichnung'>>();
    expectTypeOf<EpaArt>().toEqualTypeOf<
      'lohn' | 'stoffe' | 'geraete' | 'nachunternehmer' | 'sonstiges' | 'frei'
    >();
    expectTypeOf<EpaBezeichnung['anteil']>().toEqualTypeOf<EpaArt>();
    expectTypeOf<EpaBezeichnung['nummer']>().toEqualTypeOf<1 | 2 | 3 | 4 | 5 | 6>();
    expectTypeOf<EpaBezeichnung['bezeichnung']>().toEqualTypeOf<string | null>();
    expectTypeOf<LvInhaltKopf['epaBezeichnungen']>().toEqualTypeOf<readonly EpaBezeichnung[] | undefined>();
  });

  it('Auftragnehmer: optional am gemeinsamen Kopf, also auch am Auftrags-LV; alle Felder nullbar', () => {
    expectTypeOf<LvInhaltKopf['auftragnehmer']>().toEqualTypeOf<Auftragnehmer | undefined>();
    expectTypeOf<AuftragsLvKopf['auftragnehmer']>().toEqualTypeOf<Auftragnehmer | undefined>();
    expectTypeOf<Auftragnehmer[keyof Auftragnehmer]>().toEqualTypeOf<string | null>();
  });

  it('Beispiel (D-53.6): nach Nummer sortiert, Nummer und Art je höchstens einmal, Lücke = nicht zugeordnet', () => {
    const b = beispielLvKopfV13.epaBezeichnungen ?? [];
    expect(b.map((e) => e.nummer)).toEqual([1, 2, 4, 5]);
    expect(b.map((e) => e.anteil)).toEqual(['lohn', 'stoffe', 'nachunternehmer', 'sonstiges']);
    expect(new Set(b.map((e) => e.nummer)).size).toBe(b.length);
    expect(new Set(b.map((e) => e.anteil)).size).toBe(b.length);
    expect(b.find((e) => e.nummer === 5)?.bezeichnung).toBeNull();
    expect(beispielLvKopfV13.auftragnehmer?.plz).toBeNull();
  });
});

describe('v1.3 Punkte 3 und 4: Pflichtfelder', () => {
  it('Summenaenderung.vorher und Speicher.lvStaende sind Pflicht, Projektdatei.lvStaende bleibt optional', () => {
    expectTypeOf<Summenaenderung['vorher']>().toEqualTypeOf<Summenvorher>();
    expectTypeOf<Speicher['lvStaende']>().toEqualTypeOf<LvStandRepository>();
    expectTypeOf<Projektdatei['lvStaende']>().toEqualTypeOf<readonly LvStand[] | undefined>();
  });
});

describe('v1.3 Punkt 5: Einfügen hinter einer Gliederung', () => {
  it('neue Form nur für Gliederungen; `nach` bleibt unverändert', () => {
    type Hinter = Extract<Einfuegeort, { art: 'hinter-gliederung' }>;
    expectTypeOf<Hinter['gliederungId']>().toEqualTypeOf<GliederungId>();
    expectTypeOf<PositionId>().not.toExtend<Hinter['gliederungId']>();
    expectTypeOf<Extract<Einfuegeort, { art: 'nach' }>['knotenId']>().toEqualTypeOf<KnotenId>();
    expectTypeOf<Einfuegeort['art']>().toEqualTypeOf<'nach' | 'anfang' | 'ende' | 'hinter-gliederung'>();
    expect(beispielVerschiebenHinterGliederung.ziel).toEqual({
      art: 'hinter-gliederung',
      gliederungId: '019b76e9-0000-7000-8000-000000000002',
    });
  });
});

describe('v1.3 Punkte 7 und 8: kein Typ für Positionsnachlass und Bieterergänzung, Langtext bleibt weit', () => {
  it('Angebotsposition unverändert (G-26, Offene Typfrage)', () => {
    expectTypeOf<Extract<Angebotsposition, { status: 'angeboten' }>>().not.toHaveProperty('nachlass');
  });

  it('leere Liste, Tabelle ohne Zeilen und Zeile ohne Zellen sind gültige Langtexte (D-22)', () => {
    const leer: Langtext = [
      { art: 'liste', geordnet: false, punkte: [] },
      { art: 'tabelle', zeilen: [] },
      { art: 'tabelle', zeilen: [{ zellen: [] }] },
    ];
    expect(leer).toHaveLength(3);
  });
});

describe('v1.3 Punkt 9: Mengenansatz an der Position', () => {
  it('Ansatzzeile liegt im Vertrag; die Position trägt den Ansatz optional', () => {
    expectTypeOf<Positionsdaten['mengenansatz']>().toEqualTypeOf<readonly Ansatzzeile[] | undefined>();
    expectTypeOf<Ansatzzeile>().toEqualTypeOf<{
      readonly zeile: number;
      readonly formel: number;
      readonly ausdruck: string;
      readonly variable: string | null;
    }>();
  });

  it('MengenansatzSetzen ist ein LV-Befehl mit Ansatz (oder null) und gerechneter Menge, kein Massenbefehl', () => {
    expectTypeOf<MengenansatzSetzen>().toExtend<LvBefehl>();
    expectTypeOf<MengenansatzSetzen['positionId']>().toEqualTypeOf<PositionId>();
    expectTypeOf<MengenansatzSetzen['mengenansatz']>().toEqualTypeOf<readonly Ansatzzeile[] | null>();
    expectTypeOf<MengenansatzSetzen['menge']>().toEqualTypeOf<Menge | null>();
    expectTypeOf<'MengenansatzSetzen'>().not.toExtend<Massenbefehlsart>();
    expect(beispielMengenansatzSetzen.menge).toBe('1.235');
    // Lesart (b): ein Ansatz mit Fehler kommt ohne Menge
    expect(beispielMengenansatzMitFehler.menge).toBeNull();
    expect(beispielMengenansatzMitFehler.mengenansatz).toHaveLength(2);
  });

  it('ChangeSet: Ansatz und Menge in einer Knotenänderung; die Umkehrung nimmt den Ansatz wieder weg', () => {
    const g = beispielChangeSetMengenansatz.knoten.geaendert[0];
    expect(alsPosition(g?.nachher)?.mengenansatz).toEqual(beispielMengenansatzSetzen.mengenansatz);
    expect(alsPosition(g?.nachher)?.menge).toBe(beispielMengenansatzSetzen.menge);
    expect(alsPosition(g?.vorher)).not.toHaveProperty('mengenansatz');
    const zurueck = umkehren(beispielChangeSetMengenansatz);
    expect(alsPosition(zurueck.knoten.geaendert[0]?.nachher)).not.toHaveProperty('mengenansatz');
    expect(umkehren(zurueck)).toEqual(beispielChangeSetMengenansatz);
  });

  it('Lesart (a): ein reiner Mengenbefehl entfernt den Ansatz im selben ChangeSet', () => {
    expect(beispielMengeAendernMitAnsatz.art).toBe('MengeAendern');
    const g = beispielChangeSetMengeOhneAnsatz.knoten.geaendert[0];
    expect(alsPosition(g?.vorher)?.mengenansatz).toHaveLength(2);
    expect(alsPosition(g?.nachher)).not.toHaveProperty('mengenansatz');
    expect(alsPosition(g?.nachher)?.menge).toBe(beispielMengeAendernMitAnsatz.menge);
    expect(beispielChangeSetMengeOhneAnsatz.summen.gesamt?.netto).toBe('10.00');
    expect(beispielChangeSetMengeOhneAnsatz.summen.vorher.gesamt?.netto).toBe('12.35');
  });
});

describe('v1.3: reine Daten und Werte vor v1.3', () => {
  it('NurDaten deckt die neuen Typen ab', () => {
    expectTypeOf<NurDaten<MengenansatzSetzen>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<LvUebersicht>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<LvInhaltKopf>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<Einfuegeort>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<Befehl>>().toEqualTypeOf<true>();
  });

  it('Position ohne Ansatz und Kopf ohne Auftragnehmer und EPA-Bezeichnungen bleiben gültig', () => {
    const p = alsPosition(beispielLv.knoten.find((k) => k.art === 'position'));
    expect(p).toBeDefined();
    expect(p).not.toHaveProperty('mengenansatz');
    expect(beispielLv).not.toHaveProperty('auftragnehmer');
    expect(beispielLv).not.toHaveProperty('epaBezeichnungen');
  });
});

// --- v1.4 (Ticket 70) -------------------------------------------------------------------------------------------

describe('v1.4 Punkt 1: Auftrags-LV lesen', () => {
  it('die Übersicht trägt Kennung, Name, LV und Angebot, keine Knoten', () => {
    expectTypeOf<AuftragsLvUebersicht['id']>().toEqualTypeOf<AuftragsLeistungsverzeichnisId>();
    expectTypeOf<AuftragsLvUebersicht['name']>().toEqualTypeOf<string>();
    expectTypeOf<AuftragsLvUebersicht['leistungsverzeichnisId']>().toEqualTypeOf<LeistungsverzeichnisId>();
    expectTypeOf<AuftragsLvUebersicht['angebotId']>().toEqualTypeOf<AngebotId>();
    expectTypeOf<AuftragsLvUebersicht>().not.toHaveProperty('knoten');
    expect(beispielAuftragsLvUebersicht).toEqual({
      id: beispielAuftragsLv.id,
      name: 'Beispiel',
      leistungsverzeichnisId: beispielLv.id,
      angebotId: beispielAuftragsLv.angebotId,
    });
  });

  it('das Repository listet je Projekt und lädt den Zustand; am Speicher Pflicht', () => {
    expectTypeOf<AuftragsLvRepository['auflisten']>().parameter(0).toEqualTypeOf<ProjektId>();
    expectTypeOf<ReturnType<AuftragsLvRepository['auflisten']>>().toEqualTypeOf<
      Promise<Ergebnis<readonly AuftragsLvUebersicht[], Speicherfehler>>
    >();
    expectTypeOf<AuftragsLvRepository['laden']>()
      .parameter(0)
      .toEqualTypeOf<AuftragsLeistungsverzeichnisId>();
    expectTypeOf<ReturnType<AuftragsLvRepository['laden']>>().toEqualTypeOf<
      Promise<Ergebnis<AuftragsLvZustand, Speicherfehler>>
    >();
    expectTypeOf<Speicher['auftragsLeistungsverzeichnisse']>().toEqualTypeOf<AuftragsLvRepository>();
  });
});

/**
 * Umkehrung eines Auftrags-LV-ChangeSets, nur aus dem ChangeSet (v1.4): gleich gebaut wie beim LV, darum über `umkehren`
 * mit vertauschtem Kopf. Belegt, dass der Vertrag alles trägt; die Umsetzung liefert der Kern (Ticket 71).
 */
function umkehrenAuftragsLv(cs: AuftragsLvChangeSet): AuftragsLvChangeSet {
  const alsLv = umkehren({
    art: 'leistungsverzeichnis',
    leistungsverzeichnisId: cs.auftragsLeistungsverzeichnisId as string as LeistungsverzeichnisId,
    kopf: null,
    knoten: cs.knoten,
    summen: cs.summen,
  });
  return {
    art: cs.art,
    auftragsLeistungsverzeichnisId: cs.auftragsLeistungsverzeichnisId,
    kopf: cs.kopf === null ? null : { vorher: cs.kopf.nachher, nachher: cs.kopf.vorher },
    knoten: alsLv.knoten,
    summen: alsLv.summen,
  };
}

describe('v1.4 Punkt 2: Befehle am Auftrags-LV, Nachtrag übernehmen', () => {
  it('NachtragUebernehmen ist ein Befehl am Auftrags-LV, nicht am LV, und kein Massenbefehl', () => {
    expectTypeOf<NachtragUebernehmen['nachtragLvId']>().toEqualTypeOf<LeistungsverzeichnisId>();
    expectTypeOf<NachtragUebernehmen['knoten']>().toEqualTypeOf<readonly Knoten[]>();
    expectTypeOf<NachtragUebernehmen>().toExtend<AuftragsLvBefehl>();
    expectTypeOf<'NachtragUebernehmen'>().not.toExtend<LvBefehl['art']>();
    expectTypeOf<'NachtragUebernehmen'>().not.toExtend<Massenbefehlsart>();
  });

  it('Lesart D-35: genau eine neue Gliederung auf oberster Ebene samt Teilbaum, Eltern vor Kindern', () => {
    const b = beispielNachtragUebernehmen;
    const ids = new Set<string>(b.knoten.map((k) => k.id));
    const wurzeln = b.knoten.filter((k) => !ids.has(k.elternId));
    expect(wurzeln).toHaveLength(1);
    expect(wurzeln[0]?.art).toBe('titel');
    expect(wurzeln[0]?.elternId).toBe(beispielAuftragsLv.id);
    // hinter dem einen Knoten der obersten Ebene des Auftrags-LV
    expect(wurzeln[0]?.reihenfolge).toBe(1);
    const gesehen = new Set<string>([beispielAuftragsLv.id]);
    for (const k of b.knoten) {
      expect(gesehen.has(k.elternId)).toBe(true);
      gesehen.add(k.id);
    }
    // keine Kennung des Auftrags-LV kommt noch einmal vor (sonst `id-vergeben`)
    const vorhanden = new Set<string>(beispielAuftragsLv.knoten.map((k) => k.id));
    expect(b.knoten.some((k) => vorhanden.has(k.id))).toBe(false);
  });

  it('Anwenden und Umkehren des Auftrags-LV-ChangeSets sind Signaturen wie beim LV (Ticket 71)', () => {
    expectTypeOf<AuftragsLvChangeSetAnwenden>().toEqualTypeOf<
      (zustand: AuftragsLvZustand | null, changeSet: AuftragsLvChangeSet) => AuftragsLvZustand | null
    >();
    expectTypeOf<AuftragsLvChangeSetUmkehren>().toEqualTypeOf<
      (changeSet: AuftragsLvChangeSet) => AuftragsLvChangeSet
    >();
  });

  it('ChangeSet der Übernahme: neue Knoten und Summen, kein Kopf; die Umkehrung nimmt beides wieder heraus', () => {
    const cs = beispielChangeSetNachtragUebernehmen;
    expect(cs.kopf).toBeNull();
    expect(cs.knoten.hinzugefuegt).toEqual(beispielNachtragUebernehmen.knoten);
    expect(cs.summen.gesamt?.netto).toBe('62.35');
    const zurueck = umkehrenAuftragsLv(cs);
    expect(zurueck.knoten.entfernt).toEqual(beispielNachtragUebernehmen.knoten);
    expect(zurueck.summen.vorher.entfernt.positionen).toHaveLength(2);
    expect(zurueck.summen.gesamt?.netto).toBe('12.35');
    expect(umkehrenAuftragsLv(zurueck)).toEqual(cs);
  });
});

describe('v1.4 Punkt 3: Nachtrag (D-35)', () => {
  it('Nachtragsstatus und Nachtragsangaben', () => {
    expectTypeOf<Nachtragsstatus>().toEqualTypeOf<'angemeldet' | 'angeboten' | 'beauftragt' | 'abgelehnt'>();
    expectTypeOf<Nachtragsangaben['auftragsLvId']>().toEqualTypeOf<AuftragsLeistungsverzeichnisId>();
    expectTypeOf<Nachtragsangaben['nummer']>().toEqualTypeOf<string>();
    expectTypeOf<Nachtragsangaben['status']>().toEqualTypeOf<Nachtragsstatus>();
  });

  it('enge Lesart: am LvKopf, nicht am gemeinsamen Kopf (also weder im Import noch am Auftrags-LV)', () => {
    expectTypeOf<LvKopf['nachtrag']>().toEqualTypeOf<Nachtragsangaben | undefined>();
    expectTypeOf<LvInhaltKopf>().not.toHaveProperty('nachtrag');
    expectTypeOf<LvInhalt>().not.toHaveProperty('nachtrag');
    expectTypeOf<AuftragsLvKopf>().not.toHaveProperty('nachtrag');
  });

  it('NachtragsangabenSetzen ist ein LV-Befehl; null entfernt die Angaben', () => {
    expectTypeOf<NachtragsangabenSetzen>().toExtend<LvBefehl>();
    expectTypeOf<NachtragsangabenSetzen['nachtrag']>().toEqualTypeOf<Nachtragsangaben | null>();
    expectTypeOf<'NachtragsangabenSetzen'>().not.toExtend<AuftragsLvBefehl['art']>();
    expect(beispielNachtragsangabenSetzen.nachtrag?.status).toBe('beauftragt');
  });

  it('ChangeSet: nur der Kopf; die Umkehrung nimmt den Status zurück', () => {
    const cs = beispielChangeSetNachtragBeauftragt;
    expect(cs.kopf?.vorher?.nachtrag?.status).toBe('angeboten');
    expect(cs.kopf?.nachher?.nachtrag?.status).toBe('beauftragt');
    expect(cs.knoten).toEqual({ hinzugefuegt: [], geaendert: [], entfernt: [] });
    expect(cs.summen.gesamt).toBeNull();
    const zurueck = umkehren(cs);
    expect(zurueck.kopf?.nachher?.nachtrag?.status).toBe('angeboten');
    expect(umkehren(zurueck)).toEqual(cs);
  });
});

describe('v1.4 Punkt 4: Kostengruppe der Position (C2)', () => {
  it('die Marke Kostengruppennummer liegt im Vertrag; string ist nicht zuweisbar', () => {
    expectTypeOf<Kostengruppennummer>().toExtend<string>();
    expectTypeOf<string>().not.toExtend<Kostengruppennummer>();
    expectTypeOf<Kostengruppennummer>().not.toExtend<Ordnungszahl>();
    expectTypeOf<Positionsdaten['kostengruppe']>().toEqualTypeOf<Kostengruppennummer | undefined>();
  });

  it('KostengruppeSetzen gilt im LV und im Auftrags-LV, derselbe Typ in beiden Unions', () => {
    expectTypeOf<KostengruppeSetzen>().toExtend<LvBefehl>();
    expectTypeOf<KostengruppeSetzen>().toExtend<AuftragsLvBefehl>();
    expectTypeOf<Extract<Befehl, { art: 'KostengruppeSetzen' }>>().toEqualTypeOf<KostengruppeSetzen>();
    expectTypeOf<KostengruppeSetzen['positionId']>().toEqualTypeOf<PositionId>();
    expectTypeOf<KostengruppeSetzen['kostengruppe']>().toEqualTypeOf<Kostengruppennummer | null>();
  });

  it('AuftragsLvBefehl ist genau Anlegen, Nachtrag übernehmen und Kostengruppe setzen (D-36 (4))', () => {
    // v1.6 (Ticket 97 Punkt 3): dazu `BauteileZuordnen`, siehe dort.
    expectTypeOf<Exclude<AuftragsLvBefehl['art'], 'BauteileZuordnen'>>().toEqualTypeOf<
      'AuftragsLeistungsverzeichnisAnlegen' | 'NachtragUebernehmen' | 'KostengruppeSetzen'
    >();
  });

  it('ChangeSet: eine Knotenänderung ohne Summen; die Umkehrung nimmt die Kostengruppe wieder weg', () => {
    const cs = beispielChangeSetKostengruppe;
    const g = cs.knoten.geaendert[0];
    expect(alsPosition(g?.vorher)).not.toHaveProperty('kostengruppe');
    expect(alsPosition(g?.nachher)?.kostengruppe).toBe(beispielKostengruppeSetzen.kostengruppe);
    expect(cs.summen.gesamt).toBeNull();
    const zurueck = umkehrenAuftragsLv(cs);
    expect(alsPosition(zurueck.knoten.geaendert[0]?.nachher)).not.toHaveProperty('kostengruppe');
    expect(umkehrenAuftragsLv(zurueck)).toEqual(cs);
  });
});

describe('v1.4 Punkt 5: Muster-LV und Textquelle (C5, G-17, D-40)', () => {
  it('Vorlage: am LvKopf, nur true oder fehlt; Textquelle: optional an der Position', () => {
    expectTypeOf<LvKopf['vorlage']>().toEqualTypeOf<true | undefined>();
    expectTypeOf<LvInhaltKopf>().not.toHaveProperty('vorlage');
    expectTypeOf<AuftragsLvKopf>().not.toHaveProperty('vorlage');
    expectTypeOf<Positionsdaten['textquelle']>().toEqualTypeOf<string | undefined>();
  });

  it('VorlageSetzen und TextquelleSetzen sind LV-Befehle, nicht am Auftrags-LV', () => {
    expectTypeOf<VorlageSetzen>().toExtend<LvBefehl>();
    expectTypeOf<TextquelleSetzen>().toExtend<LvBefehl>();
    expectTypeOf<VorlageSetzen['vorlage']>().toEqualTypeOf<boolean>();
    expectTypeOf<TextquelleSetzen['positionId']>().toEqualTypeOf<PositionId>();
    expectTypeOf<TextquelleSetzen['textquelle']>().toEqualTypeOf<string | null>();
    expectTypeOf<'VorlageSetzen' | 'TextquelleSetzen'>().not.toExtend<AuftragsLvBefehl['art']>();
    expect(beispielVorlageSetzen.vorlage).toBe(true);
    expect(beispielTextquelleSetzen.textquelle).toBe('Muster-LV Rohbau (erfunden)');
  });

  it('Review (D-43): die LV-Übersicht trägt Nachtrag und Vorlage additiv, in der Schreibweise des Kopfs', () => {
    expectTypeOf<LvUebersicht['nachtrag']>().toEqualTypeOf<Nachtragsangaben | undefined>();
    expectTypeOf<LvUebersicht['vorlage']>().toEqualTypeOf<true | undefined>();
    expectTypeOf<LvUebersicht>().not.toHaveProperty('knoten');
    const alt: LvUebersicht = { id: beispielLv.id, name: beispielLv.name };
    expect(alt).not.toHaveProperty('vorlage');
    expect(beispielLvUebersichtNachtrag.nachtrag?.nummer).toBe('N01');
    expect(beispielLvUebersichtNachtrag).not.toHaveProperty('vorlage');
  });

  it('ChangeSets: Vorlage im Kopf, Textquelle an der Position; beide umkehrbar', () => {
    const v = beispielChangeSetVorlage;
    expect(v.kopf?.vorher).not.toHaveProperty('vorlage');
    expect(v.kopf?.nachher?.vorlage).toBe(true);
    expect(umkehren(umkehren(v))).toEqual(v);
    const t = beispielChangeSetTextquelle;
    expect(alsPosition(t.knoten.geaendert[0]?.nachher)?.textquelle).toBe(beispielTextquelleSetzen.textquelle);
    expect(alsPosition(umkehren(t).knoten.geaendert[0]?.nachher)).not.toHaveProperty('textquelle');
  });
});

/** Umkehrung eines ChangeSets, das ein ganzes Aggregat trägt (v1.4, D-36 (8)): `vorher` und `nachher` tauschen. */
const tauschen = <T>(a: Aenderung<T>): Aenderung<T> => ({ vorher: a.nachher, nachher: a.vorher });

describe('v1.4 Punkt 6: Aufmaßblatt (A2, D-36 (1))', () => {
  it('Kennung, Kopf und Zeile; die Kennung ist mit keiner anderen austauschbar', () => {
    expectTypeOf<string>().not.toExtend<AufmassId>();
    expectTypeOf<AufmassId>().not.toExtend<AuftragsLeistungsverzeichnisId>();
    expectTypeOf<AufmassKopf['id']>().toEqualTypeOf<AufmassId>();
    expectTypeOf<AufmassKopf['auftragsLvId']>().toEqualTypeOf<AuftragsLeistungsverzeichnisId>();
    expectTypeOf<AufmassKopf['nummer']>().toEqualTypeOf<number>();
    expectTypeOf<AufmassKopf['datum']>().toEqualTypeOf<string | null>();
    expectTypeOf<Aufmassposition>().toEqualTypeOf<{
      readonly positionId: PositionId;
      readonly mengenansatz: readonly Ansatzzeile[] | null;
      readonly menge: Menge | null;
    }>();
    expectTypeOf<Aufmass>().toExtend<AufmassKopf>();
    expectTypeOf<Aufmass['positionen']>().toEqualTypeOf<readonly Aufmassposition[]>();
    expectTypeOf<AufmassZustand['aufmass']>().toEqualTypeOf<Aufmass>();
  });

  it('Befehle und ChangeSet als ganzes Aggregat', () => {
    expectTypeOf<AufmassBefehl['art']>().toEqualTypeOf<
      | 'AufmassAnlegen'
      | 'AufmasskopfSetzen'
      | 'AufmasspositionSetzen'
      | 'AufmasspositionEntfernen'
      | 'AufmassLoeschen'
    >();
    expectTypeOf<AufmassAnlegen['aufmass']>().toEqualTypeOf<Aufmass>();
    expectTypeOf<AufmasspositionSetzen['position']>().toEqualTypeOf<Aufmassposition>();
    expectTypeOf<AufmassChangeSet['aufmass']>().toEqualTypeOf<Aenderung<Aufmass>>();
    expectTypeOf<AufmassChangeSet['art']>().toEqualTypeOf<'aufmass'>();
  });

  it('Beispiel: Nummer ab 1, je Position höchstens eine Zeile, Ansatz mit gerechneter Menge oder Menge von Hand', () => {
    const a = beispielAufmass1;
    expect(a.nummer).toBeGreaterThanOrEqual(1);
    expect(new Set(a.positionen.map((p) => p.positionId)).size).toBe(a.positionen.length);
    expect(a.positionen[0]?.mengenansatz).toHaveLength(1);
    expect(a.positionen[1]?.mengenansatz).toBeNull();
    expect(a.auftragsLvId).toBe(beispielAuftragsLv.id);
    expect(beispielAufmassAnlegen.aufmass).toBe(a);
  });

  it('Anlegen, Zeile setzen und Löschen: Umkehrung durch Tausch, ohne Vorzustand', () => {
    const anlegen = beispielChangeSetAufmassAnlegen;
    expect(anlegen.aufmass.vorher).toBeNull();
    expect(tauschen(anlegen.aufmass)).toEqual({ vorher: beispielAufmass1, nachher: null });
    const setzen = beispielChangeSetAufmasspositionSetzen;
    const neu = setzen.aufmass.nachher?.positionen.find(
      (p) => p.positionId === beispielAufmasspositionSetzen.position.positionId,
    );
    expect(neu).toEqual(beispielAufmasspositionSetzen.position);
    // ersetzt an ihrer Stelle: Reihenfolge der Zeilen bleibt
    expect(setzen.aufmass.nachher?.positionen.map((p) => p.positionId)).toEqual(
      setzen.aufmass.vorher?.positionen.map((p) => p.positionId),
    );
    expect(tauschen(tauschen(setzen.aufmass))).toEqual(setzen.aufmass);
  });
});

describe('v1.4 Punkt 7: Rechnung (A3, D-34)', () => {
  it('Kennung, Art, Umlage und die Felder der Rechnung', () => {
    expectTypeOf<string>().not.toExtend<RechnungId>();
    expectTypeOf<RechnungId>().not.toExtend<AufmassId>();
    expectTypeOf<Rechnungsart>().toEqualTypeOf<'abschlag' | 'schluss'>();
    expectTypeOf<Umlage>().toEqualTypeOf<{ readonly bezeichnung: string; readonly satz: Prozent }>();
    expectTypeOf<Rechnung['auftragsLvId']>().toEqualTypeOf<AuftragsLeistungsverzeichnisId>();
    expectTypeOf<Rechnung['art']>().toEqualTypeOf<Rechnungsart>();
    // Review (D-44): dazu der geforderte Zahlbetrag (XRechnung BT-115); jeder Wert einzeln nullbar
    expectTypeOf<Rechnung['gefordert']>().toEqualTypeOf<{
      readonly netto: Betrag | null;
      readonly brutto: Betrag | null;
      readonly zahlbetrag: Betrag | null;
    } | null>();
    expectTypeOf<RechnungsangabenSetzen['gefordert']>().toEqualTypeOf<Rechnung['gefordert']>();
    expectTypeOf<Rechnung['aufmassIds']>().toEqualTypeOf<readonly AufmassId[]>();
    expectTypeOf<Rechnung['umlagen']>().toEqualTypeOf<readonly Umlage[]>();
    expectTypeOf<Rechnung['sicherheitSatz']>().toEqualTypeOf<Prozent | null>();
    expectTypeOf<Rechnung['gewaehrleistungSatz']>().toEqualTypeOf<Prozent | null>();
    expectTypeOf<Rechnung['freigabe']>().toEqualTypeOf<{ readonly zahlbetrag: Betrag } | null>();
    expectTypeOf<RechnungZustand['rechnung']>().toEqualTypeOf<Rechnung>();
  });

  it('Befehle; Freigeben trägt den Zahlbetrag, den die App gerechnet hat', () => {
    expectTypeOf<RechnungBefehl['art']>().toEqualTypeOf<
      | 'RechnungAnlegen'
      | 'RechnungsangabenSetzen'
      | 'RechnungsaufmasseSetzen'
      | 'RechnungsabzuegeSetzen'
      | 'RechnungFreigeben'
      | 'RechnungsfreigabeAufheben'
      | 'RechnungLoeschen'
    >();
    expectTypeOf<RechnungFreigeben['zahlbetrag']>().toEqualTypeOf<Betrag>();
    expectTypeOf<RechnungChangeSet['rechnung']>().toEqualTypeOf<Aenderung<Rechnung>>();
    expectTypeOf<'rechnung-freigegeben'>().toExtend<Befehlsfehlercode>();
  });

  it('Beispiel: kumulierte Abschlagsrechnungen; die zweite rechnet alle Blätter ab, die erste ist eingefroren', () => {
    const r1 = beispielRechnung1;
    const r2 = beispielRechnung2;
    expect([r1.nummer, r2.nummer]).toEqual([1, 2]);
    expect(r1.aufmassIds.every((a) => r2.aufmassIds.includes(a))).toBe(true);
    expect(r1.freigabe?.zahlbetrag).toBe('53.42');
    // gefordert: „nichts erfasst“ nur als äußeres null, sonst mindestens ein Wert (D-44)
    expect(r1.gefordert?.zahlbetrag).toBe('53.42');
    expect(r2.gefordert).toBeNull();
    const angaben = beispielRechnungsbefehle[0].gefordert;
    expect(angaben?.zahlbetrag).toBeNull();
    expect(angaben?.netto).toBe('49.85');
    expect(r2.freigabe).toBeNull();
    expect(r1.gewaehrleistungSatz).toBeNull();
  });

  it('Freigeben und Freigabe aufheben: Gegenstücke, umkehrbar durch Tausch', () => {
    const f = beispielChangeSetRechnungFreigeben;
    expect(f.rechnung.vorher?.freigabe).toBeNull();
    expect(f.rechnung.nachher?.freigabe).toEqual({ zahlbetrag: beispielRechnungFreigeben.zahlbetrag });
    expect(tauschen(f.rechnung)).toEqual(beispielChangeSetFreigabeAufheben.rechnung);
    expect(beispielRechnungsfreigabeAufheben.art).toBe('RechnungsfreigabeAufheben');
  });
});

/** Cent eines Betrags (2 Stellen, Punktnotation) als ganze Zahl; nur für Prüfungen im Test, nie für Geld im Code (N1). */
const cent = (b: Betrag): bigint => BigInt(b.replace('.', ''));

describe('v1.4 Punkt 8: Leistungsstand (D-34, D-37)', () => {
  it('je Position Menge und GP, dazu Leistung, Nachlass und Netto nach Nachlass; reine Daten', () => {
    expectTypeOf<Leistungsstand['positionen'][number]>().toEqualTypeOf<{
      readonly positionId: PositionId;
      readonly menge: Menge | null;
      readonly gp: Betrag;
    }>();
    expectTypeOf<Leistungsstand['leistung']>().toEqualTypeOf<Betrag>();
    expectTypeOf<Leistungsstand['nachlass']>().toEqualTypeOf<Betrag>();
    expectTypeOf<Leistungsstand['nettoNachNachlass']>().toEqualTypeOf<Betrag>();
    expectTypeOf<NurDaten<Leistungsstand>>().toEqualTypeOf<true>();
  });

  it('Beispiel zu Rechnung 2: eine Zeile je Position, Leistung = Σ GP, Netto nach Nachlass = Leistung − Nachlass', () => {
    const l = beispielLeistungsstand;
    expect(l.positionen.map((p) => p.positionId)).toEqual(
      beispielAuftragsLvMitNachtrag.knoten.filter((k) => k.art === 'position').map((k) => k.id),
    );
    expect(l.positionen.reduce((s, p) => s + cent(p.gp), 0n)).toBe(cent(l.leistung));
    expect(cent(l.leistung) - cent(l.nachlass)).toBe(cent(l.nettoNachNachlass));
    expect(l.positionen.find((p) => p.menge === null)?.gp).toBe('0.00');
  });
});

describe('v1.4 Punkt 9: Kostenermittlung (C3, D-36 (3))', () => {
  it('Kennung, Stufe, Eintrag (kanonischer Betrag) und Aggregat', () => {
    expectTypeOf<string>().not.toExtend<KostenermittlungId>();
    expectTypeOf<KostenermittlungId>().not.toExtend<ProjektId>();
    expectTypeOf<Kostenermittlungsstufe>().toEqualTypeOf<
      'kostenrahmen' | 'kostenschaetzung' | 'kostenberechnung' | 'kostenanschlag' | 'kostenfeststellung'
    >();
    expectTypeOf<Kostenermittlungseintrag['nummer']>().toEqualTypeOf<Kostengruppennummer>();
    expectTypeOf<Kostenermittlungseintrag['betrag']>().toEqualTypeOf<Betrag>();
    expectTypeOf<Kostenermittlungseintrag['bemerkung']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<Kostenermittlung['projektId']>().toEqualTypeOf<ProjektId>();
    expectTypeOf<Kostenermittlung['stufe']>().toEqualTypeOf<Kostenermittlungsstufe>();
    expectTypeOf<Kostenermittlung['eintraege']>().toEqualTypeOf<readonly Kostenermittlungseintrag[]>();
    expectTypeOf<KostenermittlungZustand['kostenermittlung']>().toEqualTypeOf<Kostenermittlung>();
  });

  it('Befehle und ChangeSet als ganzes Aggregat', () => {
    expectTypeOf<KostenermittlungBefehl['art']>().toEqualTypeOf<
      | 'KostenermittlungAnlegen'
      | 'KostenermittlungskopfSetzen'
      | 'KostenermittlungseintragSetzen'
      | 'KostenermittlungseintragEntfernen'
      | 'KostenermittlungLoeschen'
    >();
    expectTypeOf<KostenermittlungChangeSet['kostenermittlung']>().toEqualTypeOf<
      Aenderung<Kostenermittlung>
    >();
  });

  it('enge Lesart: Nummern eindeutig und aufsteigend; Eintrag setzen fügt an seiner Stelle ein', () => {
    const nummern = (k: Kostenermittlung | null | undefined): string[] =>
      (k?.eintraege ?? []).map((e) => e.nummer);
    const aufsteigend = (n: readonly string[]): boolean => n.every((x, i) => i === 0 || (n[i - 1] ?? '') < x);
    expect(aufsteigend(nummern(beispielKostenermittlung))).toBe(true);
    const cs = beispielChangeSetKostenermittlungseintrag;
    expect(nummern(cs.kostenermittlung.nachher)).toEqual(['330', '340', '350', '410']);
    expect(aufsteigend(nummern(cs.kostenermittlung.nachher))).toBe(true);
    expect(tauschen(tauschen(cs.kostenermittlung))).toEqual(cs.kostenermittlung);
    expect(beispielKostenermittlungseintragSetzen.eintrag).not.toHaveProperty('bemerkung');
  });
});

describe('v1.4 Punkt 10: Rand (Protokoll, Unions, Signaturen, Speicher, Projektdatei)', () => {
  type Aggregatarten =
    | 'projekt'
    | 'leistungsverzeichnis'
    | 'angebot'
    | 'auftrags-leistungsverzeichnis'
    | 'aufmass'
    | 'rechnung'
    | 'kostenermittlung';

  it('AggregatBezug und ChangeSet kennen Aufmaß, Rechnung und Kostenermittlung', () => {
    // v1.6 (Ticket 97 Punkt 8): dazu fünf Aggregate, siehe dort.
    type Neu16 = 'bauwerksmodell' | 'bauzeitenplan' | 'honorarberechnung' | 'mangel' | 'bautagebucheintrag';
    expectTypeOf<Exclude<AggregatBezug['art'], Neu16>>().toEqualTypeOf<Aggregatarten>();
    expectTypeOf<Exclude<ChangeSet['art'], Neu16>>().toEqualTypeOf<Aggregatarten>();
    expectTypeOf<Extract<AggregatBezug, { art: 'aufmass' }>['id']>().toEqualTypeOf<AufmassId>();
    expectTypeOf<Extract<AggregatBezug, { art: 'rechnung' }>['id']>().toEqualTypeOf<RechnungId>();
    expectTypeOf<
      Extract<AggregatBezug, { art: 'kostenermittlung' }>['id']
    >().toEqualTypeOf<KostenermittlungId>();
    expectTypeOf<AufmassChangeSet | RechnungChangeSet | KostenermittlungChangeSet>().toExtend<ChangeSet>();
  });

  it('Befehl umfasst die neuen Befehle; jeder Name gehört zu genau einem Aggregat, außer KostengruppeSetzen', () => {
    expectTypeOf<AufmassBefehl | RechnungBefehl | KostenermittlungBefehl>().toExtend<Befehl>();
    expectTypeOf<
      Extract<
        AufmassBefehl['art'] | RechnungBefehl['art'] | KostenermittlungBefehl['art'],
        LvBefehl['art'] | AuftragsLvBefehl['art'] | AngebotBefehl['art'] | ProjektBefehl['art']
      >
    >().toEqualTypeOf<never>();
    expectTypeOf<
      Extract<AufmassBefehl['art'], RechnungBefehl['art'] | KostenermittlungBefehl['art']>
    >().toEqualTypeOf<never>();
    // v1.6 (Ticket 97 Punkt 3): ebenso `BauteileZuordnen`.
    expectTypeOf<Extract<LvBefehl['art'], AuftragsLvBefehl['art']>>().toEqualTypeOf<
      'KostengruppeSetzen' | 'BauteileZuordnen'
    >();
  });

  it('Signaturen für Ausführen, Anwenden und Umkehren je neuem Aggregat', () => {
    expectTypeOf<AufmassBefehlAusfuehren>().toEqualTypeOf<
      (zustand: AufmassZustand | null, befehl: AufmassBefehl) => Ergebnis<AufmassChangeSet, Befehlsfehler>
    >();
    expectTypeOf<AufmassChangeSetAnwenden>().toEqualTypeOf<
      (zustand: AufmassZustand | null, changeSet: AufmassChangeSet) => AufmassZustand | null
    >();
    expectTypeOf<AufmassChangeSetUmkehren>().toEqualTypeOf<
      (changeSet: AufmassChangeSet) => AufmassChangeSet
    >();
    expectTypeOf<RechnungBefehlAusfuehren>().toEqualTypeOf<
      (zustand: RechnungZustand | null, befehl: RechnungBefehl) => Ergebnis<RechnungChangeSet, Befehlsfehler>
    >();
    expectTypeOf<RechnungChangeSetAnwenden>().toEqualTypeOf<
      (zustand: RechnungZustand | null, changeSet: RechnungChangeSet) => RechnungZustand | null
    >();
    expectTypeOf<RechnungChangeSetUmkehren>().toEqualTypeOf<
      (changeSet: RechnungChangeSet) => RechnungChangeSet
    >();
    expectTypeOf<KostenermittlungBefehlAusfuehren>().toEqualTypeOf<
      (
        zustand: KostenermittlungZustand | null,
        befehl: KostenermittlungBefehl,
      ) => Ergebnis<KostenermittlungChangeSet, Befehlsfehler>
    >();
    expectTypeOf<KostenermittlungChangeSetAnwenden>().toEqualTypeOf<
      (
        zustand: KostenermittlungZustand | null,
        changeSet: KostenermittlungChangeSet,
      ) => KostenermittlungZustand | null
    >();
    expectTypeOf<KostenermittlungChangeSetUmkehren>().toEqualTypeOf<
      (changeSet: KostenermittlungChangeSet) => KostenermittlungChangeSet
    >();
  });

  it('Repositories am Speicher (Pflicht): Aufmaßblätter und Rechnungen je Auftrags-LV, Kostenermittlungen je Projekt', () => {
    expectTypeOf<Speicher['aufmasse']>().toEqualTypeOf<AufmassRepository>();
    expectTypeOf<Speicher['rechnungen']>().toEqualTypeOf<RechnungRepository>();
    expectTypeOf<Speicher['kostenermittlungen']>().toEqualTypeOf<KostenermittlungRepository>();
    expectTypeOf<AufmassRepository['auflisten']>()
      .parameter(0)
      .toEqualTypeOf<AuftragsLeistungsverzeichnisId>();
    expectTypeOf<ReturnType<AufmassRepository['auflisten']>>().toEqualTypeOf<
      Promise<Ergebnis<readonly AufmassKopf[], Speicherfehler>>
    >();
    expectTypeOf<ReturnType<AufmassRepository['laden']>>().toEqualTypeOf<
      Promise<Ergebnis<AufmassZustand, Speicherfehler>>
    >();
    expectTypeOf<RechnungRepository['auflisten']>()
      .parameter(0)
      .toEqualTypeOf<AuftragsLeistungsverzeichnisId>();
    expectTypeOf<ReturnType<RechnungRepository['auflisten']>>().toEqualTypeOf<
      Promise<Ergebnis<readonly Rechnung[], Speicherfehler>>
    >();
    expectTypeOf<ReturnType<RechnungRepository['laden']>>().toEqualTypeOf<
      Promise<Ergebnis<RechnungZustand, Speicherfehler>>
    >();
    expectTypeOf<KostenermittlungRepository['auflisten']>().parameter(0).toEqualTypeOf<ProjektId>();
    expectTypeOf<ReturnType<KostenermittlungRepository['auflisten']>>().toEqualTypeOf<
      Promise<Ergebnis<readonly KostenermittlungUebersicht[], Speicherfehler>>
    >();
    expectTypeOf<KostenermittlungUebersicht>().toEqualTypeOf<Omit<Kostenermittlung, 'eintraege'>>();
    expectTypeOf<ReturnType<KostenermittlungRepository['laden']>>().toEqualTypeOf<
      Promise<Ergebnis<KostenermittlungZustand, Speicherfehler>>
    >();
  });

  it('Projektdatei: drei optionale Listen, fehlt = leer (wie lvStaende)', () => {
    expectTypeOf<Projektdatei['aufmasse']>().toEqualTypeOf<readonly AufmassZustand[] | undefined>();
    expectTypeOf<Projektdatei['rechnungen']>().toEqualTypeOf<readonly RechnungZustand[] | undefined>();
    expectTypeOf<Projektdatei['kostenermittlungen']>().toEqualTypeOf<
      readonly KostenermittlungZustand[] | undefined
    >();
  });

  it('Massenbefehle: AufmassAnlegen ja (X31), RechnungAnlegen und KostenermittlungAnlegen nein', () => {
    expect(MASSENBEFEHLSARTEN).toContain('AufmassAnlegen');
    expect(MASSENBEFEHLSARTEN).not.toContain('KostenermittlungAnlegen');
    expect(MASSENBEFEHLSARTEN).not.toContain('RechnungAnlegen');
    expectTypeOf<'KostenermittlungAnlegen' | 'RechnungAnlegen'>().not.toExtend<Massenbefehlsart>();
    expectTypeOf<
      Extract<Massenbefehlskopf, { art: 'AufmassAnlegen' }>['aufmass']
    >().toEqualTypeOf<AufmassKopf>();
    const b = beispielMassenprotokollAufmass.befehl;
    expect(b.art === 'Befehlskurzfassung' && b.kopf).toEqual({
      art: 'AufmassAnlegen',
      aufmass: {
        id: beispielAufmass1.id,
        projektId: beispielAufmass1.projektId,
        auftragsLvId: beispielAufmass1.auftragsLvId,
        nummer: 1,
        bezeichnung: beispielAufmass1.bezeichnung,
        datum: beispielAufmass1.datum,
      },
    });
    expect(beispielMassenprotokollAufmass.aggregat).toEqual({ art: 'aufmass', id: beispielAufmass1.id });
  });

  it('IdQuelle liefert die Kennungen der neuen Aggregate', () => {
    expectTypeOf<ReturnType<IdQuelle['aufmass']>>().toEqualTypeOf<AufmassId>();
    expectTypeOf<ReturnType<IdQuelle['rechnung']>>().toEqualTypeOf<RechnungId>();
    expectTypeOf<ReturnType<IdQuelle['kostenermittlung']>>().toEqualTypeOf<KostenermittlungId>();
  });
});

describe('v1.4 Punkt 11: Beispiele für jeden neuen Befehl und die Zustände', () => {
  it('jeder neue Befehl hat ein Beispiel, und jedes Beispiel ist ein Befehl', () => {
    const beispiele: readonly Befehl[] = [
      beispielNachtragUebernehmen,
      beispielNachtragsangabenSetzen,
      beispielKostengruppeSetzen,
      beispielVorlageSetzen,
      beispielTextquelleSetzen,
      beispielAufmassAnlegen,
      beispielAufmasspositionSetzen,
      ...beispielAufmassBefehle,
      beispielRechnungAnlegen,
      ...beispielRechnungsbefehle,
      beispielRechnungFreigeben,
      beispielRechnungsfreigabeAufheben,
      beispielKostenermittlungseintragSetzen,
      ...beispielKostenermittlungsbefehle,
    ];
    type Neu =
      | AufmassBefehl['art']
      | RechnungBefehl['art']
      | KostenermittlungBefehl['art']
      | 'NachtragUebernehmen'
      | 'NachtragsangabenSetzen'
      | 'KostengruppeSetzen'
      | 'VorlageSetzen'
      | 'TextquelleSetzen';
    const alle: Record<Neu, true> = {
      AufmassAnlegen: true,
      AufmasskopfSetzen: true,
      AufmasspositionSetzen: true,
      AufmasspositionEntfernen: true,
      AufmassLoeschen: true,
      RechnungAnlegen: true,
      RechnungsangabenSetzen: true,
      RechnungsaufmasseSetzen: true,
      RechnungsabzuegeSetzen: true,
      RechnungFreigeben: true,
      RechnungsfreigabeAufheben: true,
      RechnungLoeschen: true,
      KostenermittlungAnlegen: true,
      KostenermittlungskopfSetzen: true,
      KostenermittlungseintragSetzen: true,
      KostenermittlungseintragEntfernen: true,
      KostenermittlungLoeschen: true,
      NachtragUebernehmen: true,
      NachtragsangabenSetzen: true,
      KostengruppeSetzen: true,
      VorlageSetzen: true,
      TextquelleSetzen: true,
    };
    expect(new Set(beispiele.map((b) => b.art))).toEqual(new Set(Object.keys(alle)));
    expect(beispielRechnungAnlegen.rechnung.freigabe).toBeNull();
  });

  it('Projektdatei mit Aufmaßblättern, Rechnungen und Kostenermittlung; Übersicht ohne Einträge', () => {
    const d = beispielProjektdateiV14;
    expect(d.aufmasse?.map((a) => a.aufmass.nummer)).toEqual([1, 2]);
    expect(d.rechnungen?.map((r) => r.rechnung.nummer)).toEqual([1, 2]);
    expect(d.kostenermittlungen).toHaveLength(1);
    expect(beispielKostenermittlungUebersicht).not.toHaveProperty('eintraege');
    // Jede Rechnung verweist nur auf Blätter derselben Datei und desselben Auftrags-LV.
    const blaetter = new Map(d.aufmasse?.map((a) => [a.aufmass.id, a.aufmass.auftragsLvId]));
    for (const { rechnung } of d.rechnungen ?? []) {
      for (const id of rechnung.aufmassIds) expect(blaetter.get(id)).toBe(rechnung.auftragsLvId);
    }
  });
});

describe('v1.4: reine Daten und Werte vor v1.4', () => {
  it('NurDaten deckt die neuen Typen ab', () => {
    expectTypeOf<NurDaten<Befehl>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<ChangeSet>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<Protokolleintrag>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<Projektdatei>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<Aufmass>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<Rechnung>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<Kostenermittlung>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<NachtragUebernehmen>>().toEqualTypeOf<true>();
  });

  it('LV, Position, Projektdatei und Auftrags-LV ohne die neuen Felder bleiben gültig', () => {
    const p = alsPosition(beispielLv.knoten.find((k) => k.art === 'position'));
    expect(p).not.toHaveProperty('kostengruppe');
    expect(p).not.toHaveProperty('textquelle');
    expect(beispielLv).not.toHaveProperty('nachtrag');
    expect(beispielLv).not.toHaveProperty('vorlage');
    const datei: Projektdatei = {
      schemaVersion: 4,
      projekt: {
        id: beispielLv.projektId,
        name: 'Beispiel',
        bauherr: { name: 'B', anschrift: null },
        bieter: [],
      },
      leistungsverzeichnisse: [],
      angebote: [],
      auftragsLeistungsverzeichnisse: [],
      protokoll: [],
    };
    expect(datei).not.toHaveProperty('aufmasse');
  });
});

// --- v1.5 (Ticket 95) -------------------------------------------------------------------------------------------

describe('v1.5 Punkt 1: ein Fehlercode für Feldbefehle an der falschen Knotenart (D-71.3)', () => {
  it('kein neuer Code: die geschlossene Liste bleibt die aus v1.4 (die App führt je Code einen Text)', () => {
    // v1.6 (Ticket 97 Punkt 6): dazu `statuswechsel-unzulaessig`, siehe dort.
    expectTypeOf<Exclude<Befehlsfehlercode, 'statuswechsel-unzulaessig'>>().toEqualTypeOf<
      | 'ungueltige-eingabe'
      | 'knoten-unbekannt'
      | 'eltern-unbekannt'
      | 'id-vergeben'
      | 'zyklus'
      | 'ebene-ueberschritten'
      | 'knotenart-unzulaessig'
      | 'bezug-unbekannt'
      | 'oz-ungueltig'
      | 'maske-ungueltig'
      | 'oz-doppelt'
      | 'oz-ueberlauf'
      | 'angebot-unbekannt'
      | 'befehl-nicht-zustaendig'
      | 'rechnung-freigegeben'
    >();
  });

  it('KostengruppeSetzen an einer Gliederung: knotenart-unzulaessig; an einer Kennung ohne Knoten: knoten-unbekannt', () => {
    const [anGliederung, ohneKnoten] = beispielFehlerKostengruppe;
    const art = (id: KnotenId | undefined): Knoten['art'] | undefined =>
      beispielAuftragsLv.knoten.find((k) => k.id === id)?.art;
    expect(anGliederung.code).toBe('knotenart-unzulaessig');
    expect(art(anGliederung.knotenId)).toBe('titel');
    expect(ohneKnoten.code).toBe('knoten-unbekannt');
    expect(ohneKnoten.knotenId).toBeDefined();
    expect(art(ohneKnoten.knotenId)).toBeUndefined();
  });
});

describe('v1.5 Punkt 2: Befundquelle für E-Rechnungen (Ticket 76, D-76.4)', () => {
  it('die gemeinsame Befundliste kennt das Lesen einer E-Rechnung; die übrigen Quellen bleiben', () => {
    // v1.6 (Ticket 97 Punkt 7): dazu die Quellen der Module X1 bis X4, siehe dort.
    expectTypeOf<
      Exclude<
        Befundquelle,
        'ifc-lesen' | 'modell-pruefung' | 'terminrechnung' | 'honorarberechnung' | 'fristpruefung'
      >
    >().toEqualTypeOf<
      'gaeb-lesen' | 'gaeb-pruefung' | 'lv-pruefung' | 'xsd-gegenpruefung' | 'erechnung-lesen'
    >();
    expectTypeOf(beispielBefundeERechnung).toEqualTypeOf<readonly [Pruefbefund, Pruefbefund]>();
  });

  it('Ort: der Business Term in `feld`, das Element (lokale Namen, `[n]` ab 1) in `pfad`, nie ein Knoten', () => {
    const [wert, regel] = beispielBefundeERechnung;
    for (const b of beispielBefundeERechnung) {
      expect(b.quelle).toBe('erechnung-lesen');
      expect(b.ort.feld).toMatch(/^BT-[0-9]+$/);
      expect(b.ort).not.toHaveProperty('knotenId');
      // Zeile und Spalte nur, wenn die Datei kein lesbares XML ist
      expect(b.ort).not.toHaveProperty('zeile');
    }
    expect(wert.ort.pfad).toMatch(/^(\/[A-Za-z][A-Za-z0-9]*(\[[1-9][0-9]*\])?)+$/);
    // Eine Summenregel betrifft keinen einzelnen Wert der Datei: nur der Business Term.
    expect(regel.ort).toEqual({ feld: 'BT-115' });
  });
});

/**
 * Die Wurzel eines Zustands, wie sie der OZ-Vorschlag liest (v1.5): aus beiden Aggregaten ohne Umdeutung einer Kennung (kein
 * `as`). Belegt, dass die Signatur ohne die Leseansicht aus D-80.1 umsetzbar ist; die Umsetzung liefert der Kern (Ticket 105).
 */
const wurzelVon = (z: Parameters<OzVorschlagen>[0]): WurzelId =>
  'leistungsverzeichnis' in z ? z.leistungsverzeichnis.id : z.auftragsLeistungsverzeichnis.id;

describe('v1.5 Punkt 3: OZ-Vorschlag des Kerns, auch für das Auftrags-LV (D-80.1)', () => {
  it('Signatur am Rand wie die übrigen Kern-Signaturen: LV oder Auftrags-LV, Ort und Knotenart ohne Hinweistext', () => {
    expectTypeOf<OzVorschlagen>().toEqualTypeOf<
      (
        zustand: LvZustand | AuftragsLvZustand,
        ort: Einfuegeort,
        art: 'position' | 'titel' | 'los',
      ) => OzVorschlag | null
    >();
    expectTypeOf<Parameters<OzVorschlagen>[2]>().toEqualTypeOf<Exclude<Knoten['art'], 'hinweis'>>();
    expectTypeOf<OzVorschlag>().toEqualTypeOf<{
      readonly ordnungszahl: Ordnungszahl;
      readonly ozIndex: string | null;
      readonly hinweis?: Befehlshinweis;
    }>();
    expectTypeOf<NurDaten<OzVorschlag>>().toEqualTypeOf<true>();
  });

  it('ohne umgedeutete Kennung: das Auftrags-LV ist selbst Wurzel und Elternknoten des Orts', () => {
    expectTypeOf<AuftragsLeistungsverzeichnisId>().toExtend<ElternId>();
    expectTypeOf<AuftragsLvZustand>().toExtend<Parameters<OzVorschlagen>[0]>();
    const { zustand, ort, art } = beispielOzVorschlagAuftragsLv;
    expect(wurzelVon(zustand)).toBe(beispielAuftragsLv.id);
    expect(ort).toEqual({ art: 'ende', elternId: beispielAuftragsLv.id });
    expect(art).toBe('titel');
  });

  it('Beispiel: die Gliederung „Nachtrag N01“ bekommt hinter dem Titel 01 den Vorschlag 02 (D-42.3: Vorgänger + 1)', () => {
    const { vorschlag } = beispielOzVorschlagAuftragsLv;
    const neu = beispielNachtragUebernehmen.knoten.find((k) => k.elternId === beispielAuftragsLv.id);
    expect(neu?.art === 'titel' ? neu.ordnungszahl : undefined).toBe(vorschlag.ordnungszahl);
    expect(vorschlag).toEqual({ ordnungszahl: '02', ozIndex: null });
  });
});

describe('v1.5 Punkt 4: Offene Typfragen aus Ticket 70 gesichtet (D-95.4)', () => {
  it('Typfrage 8 entschieden: Netto und Brutto der Forderung sind kumuliert wie die Abzugskette (D-34 (1))', () => {
    // Rechnung 2 rechnet Blatt 1 und 2 ab: gefordert ist die ganze Leistung bis dahin, nicht der Zuwachs seit Rechnung 1.
    const gefordert = beispielRechnungsbefehle[0].gefordert;
    expect(gefordert?.netto).toBe(beispielLeistungsstand.nettoNachNachlass);
    expect(gefordert?.netto).not.toBe(beispielRechnung1.gefordert?.netto);
    // kein Kennzeichen „kumuliert“ am Typ
    expectTypeOf<NonNullable<Rechnung['gefordert']>>().toEqualTypeOf<{
      readonly netto: Betrag | null;
      readonly brutto: Betrag | null;
      readonly zahlbetrag: Betrag | null;
    }>();
  });

  it('vertagt: kein Rechnungsdatum (15), keine Bemerkung je Aufmaßposition (10), keine Textquelle am Hinweistext (4)', () => {
    expectTypeOf<Rechnung>().not.toHaveProperty('rechnungsdatum');
    expectTypeOf<Aufmassposition>().not.toHaveProperty('bemerkung');
    expectTypeOf<Hinweistext>().not.toHaveProperty('textquelle');
  });

  it('Typfrage 6 entschieden: das Aufmaßblatt bleibt ganzes Aggregat im ChangeSet (Ticket 94 hält das Budget)', () => {
    expectTypeOf<AufmassChangeSet['aufmass']>().toEqualTypeOf<Aenderung<Aufmass>>();
  });
});

describe('v1.5 Punkt 5: das gespeicherte Netto nach Nachlass in der LV-Übersicht (D-92.4)', () => {
  it('additiv und optional, ein Betrag; fehlt = noch nicht gerechnet, nie null', () => {
    expectTypeOf<LvUebersicht['nettoNachNachlass']>().toEqualTypeOf<Betrag | undefined>();
    const alt: LvUebersicht = { id: beispielLv.id, name: beispielLv.name };
    expect(alt).not.toHaveProperty('nettoNachNachlass');
  });

  it('der Name der Gesamtsummen (L2): `netto` hieße dort das Netto vor Nachlass', () => {
    expectTypeOf<LvUebersicht['nettoNachNachlass']>().toEqualTypeOf<
      Gesamtsummen['nettoNachNachlass'] | undefined
    >();
    expectTypeOf<LvUebersicht>().not.toHaveProperty('netto');
  });

  it('Beispiel: nach 10 % Nachlass trägt die Übersicht 11,11, nicht das Netto 12,35', () => {
    const gesamt = beispielChangeSetNachlass.summen.gesamt;
    expect(beispielLvUebersichtNetto.id).toBe(beispielLv.id);
    expect(beispielLvUebersichtNetto.nettoNachNachlass).toBe(gesamt?.nettoNachNachlass);
    expect(beispielLvUebersichtNetto.nettoNachNachlass).not.toBe(gesamt?.netto);
  });
});

describe('v1.5 Punkt 6: Spalte „KG“ im LV-Grid (D-89.1, Ticket 93)', () => {
  it('LvSpalte kennt die Kostengruppe; die bisherigen sieben Spalten bleiben', () => {
    expectTypeOf<LvSpalte>().toEqualTypeOf<
      | 'ordnungszahl'
      | 'positionsart'
      | 'kurztext'
      | 'menge'
      | 'einheit'
      | 'einheitspreis'
      | 'gesamtpreis'
      | 'kostengruppe'
    >();
  });

  it('die Spalte heißt wie das Feld der Position, das sie zeigt, und wie `Befundort.feld` einer Zelle', () => {
    expectTypeOf<'kostengruppe'>().toExtend<keyof Positionsdaten>();
    expectTypeOf<Positionsdaten['kostengruppe']>().toEqualTypeOf<Kostengruppennummer | undefined>();
    expectTypeOf<'kostengruppe'>().toExtend<NonNullable<LvZeile['befunde'][number]['ort']['feld']>>();
  });
});

describe('v1.5: reine Daten und Werte vor v1.5', () => {
  it('NurDaten deckt die neuen und geänderten Typen ab', () => {
    expectTypeOf<NurDaten<OzVorschlag>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<LvUebersicht>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<Pruefbefund>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<Befehl>>().toEqualTypeOf<true>();
  });

  it('jeder Wert aus v1.4 bleibt gültig: v1.5 ist additiv oder eine Lesart, kein Befehl ändert sich', () => {
    const uebersicht: LvUebersicht = beispielLvUebersichtNachtrag;
    expect(uebersicht).not.toHaveProperty('nettoNachNachlass');
    const befund: Pruefbefund = {
      schwere: 'warnung',
      quelle: 'gaeb-lesen',
      code: 'dezimalkomma',
      meldung: 'Dezimalkomma statt Punkt (erfunden).',
      ort: { pfad: '/GAEB/Award/BoQ/BoQBody', zeile: 12 },
    };
    expect(befund.ort).not.toHaveProperty('feld');
    expectTypeOf<KostengruppeSetzen>().toEqualTypeOf<{
      readonly art: 'KostengruppeSetzen';
      readonly positionId: PositionId;
      readonly kostengruppe: Kostengruppennummer | null;
    }>();
  });
});

// --- v1.6 (Ticket 97) -------------------------------------------------------------------------------------------

/** Form einer GlobalId (22 Zeichen aus dem IFC-Base64-Alphabet, siehe `IfcGlobalId`). */
const GLOBALID = IFC_GLOBALID_MUSTER; // Nachtrag Review (D-66): die Konstante aus dem Vertrag

describe('v1.6 Punkt 1: Bauwerksmodell (X1, D-50, D-51, D-53)', () => {
  it('Kennungen: BauwerksmodellId und IfcGlobalId sind Marken, nicht austauschbar mit string oder anderen Kennungen', () => {
    expectTypeOf<string>().not.toExtend<BauwerksmodellId>();
    expectTypeOf<string>().not.toExtend<IfcGlobalId>();
    expectTypeOf<IfcGlobalId>().not.toExtend<BauwerksmodellId>();
    expectTypeOf<BauwerksmodellId>().not.toExtend<ProjektId>();
    expectTypeOf<IfcGlobalId>().not.toExtend<KnotenId>();
    for (const id of Object.values(beispielGlobalIds)) expect(id).toMatch(GLOBALID);
  });

  it('Schema, Modelldatei und Bauteilmenge in der Form des Tickets', () => {
    expectTypeOf<IfcSchema>().toEqualTypeOf<'IFC2X3' | 'IFC4'>();
    expectTypeOf<Modelldatei>().toEqualTypeOf<{
      readonly hash: string;
      readonly dateiname: string;
      readonly groesse: number;
    }>();
    expectTypeOf<Bauteilmenge['art']>().toEqualTypeOf<
      'laenge' | 'flaeche' | 'volumen' | 'anzahl' | 'gewicht' | 'zeit'
    >();
    // Nur Mengen mit Wert (enge Lesart): eine Menge ohne Zahl oder Einheit kommt nicht ins Modell.
    expectTypeOf<Bauteilmenge['wert']>().toEqualTypeOf<Menge>();
    expect(beispielModelldatei.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('D-51: ein Bauteil trägt keine Eigenschaften, Klassifikationen oder Materialien; Teil und KG-Vorschlag optional', () => {
    expectTypeOf<Bauteil>().not.toHaveProperty('eigenschaften');
    expectTypeOf<Bauteil>().not.toHaveProperty('klassifikationen');
    expectTypeOf<Bauteil>().not.toHaveProperty('materialien');
    expectTypeOf<Bauteil['teilVonGlobalId']>().toEqualTypeOf<IfcGlobalId | undefined>();
    expectTypeOf<Bauteil['kostengruppe']>().toEqualTypeOf<Kostengruppennummer | undefined>();
    expectTypeOf<Strukturknoten['art']>().toEqualTypeOf<
      'projekt' | 'grundstueck' | 'gebaeude' | 'geschoss' | 'raum'
    >();
  });

  it('Kopf und Inhalt: der Kopf trägt weder Struktur noch Bauteile; zusammen sind sie das Modell', () => {
    expectTypeOf<BauwerksmodellKopf>().not.toHaveProperty('struktur');
    expectTypeOf<BauwerksmodellKopf>().not.toHaveProperty('bauteile');
    expectTypeOf<BauwerksmodellKopf & BauwerksmodellInhalt>().toExtend<Bauwerksmodell>();
    expectTypeOf<Bauwerksmodell>().toExtend<BauwerksmodellKopf & BauwerksmodellInhalt>();
    expectTypeOf<BauwerksmodellKopf['vorgaengerId']>().toEqualTypeOf<BauwerksmodellId | null>();
    expectTypeOf<BauwerksmodellZustand>().toEqualTypeOf<{ readonly bauwerksmodell: Bauwerksmodell }>();
  });

  it('Beispiel: Verweise innerhalb des Modells nennen ein Objekt desselben Modells (Lesart des Ausführers)', () => {
    const m = beispielBauwerksmodell;
    const knoten = new Set(m.struktur.map((k) => k.globalId));
    const bauteile = new Set(m.bauteile.map((b) => b.globalId));
    for (const k of m.struktur) if (k.elternGlobalId !== null) expect(knoten).toContain(k.elternGlobalId);
    for (const b of m.bauteile) {
      if (b.strukturGlobalId !== null) expect(knoten).toContain(b.strukturGlobalId);
      if (b.teilVonGlobalId !== undefined) expect(bauteile).toContain(b.teilVonGlobalId);
      for (const menge of b.mengen) expect(menge.wert).toMatch(/^-?(0|[1-9][0-9]*)\.[0-9]{3}$/);
    }
    // Optionale Felder fehlen statt `null` zu sein.
    expect(m.bauteile.find((b) => b.globalId === beispielGlobalIds.wandOg)).not.toHaveProperty(
      'kostengruppe',
    );
    expect(m.bauteile.find((b) => b.globalId === beispielGlobalIds.wandOg)).not.toHaveProperty(
      'teilVonGlobalId',
    );
    expect(beispielBauwerksmodell2Kopf.vorgaengerId).toBe(m.id);
  });

  it('Befehle: Anlegen (Massenbefehl), Umbenennen, Löschen; das Feld heißt wie das Aggregat', () => {
    expectTypeOf<BauwerksmodellBefehl['art']>().toEqualTypeOf<
      'BauwerksmodellAnlegen' | 'BauwerksmodellUmbenennen' | 'BauwerksmodellLoeschen'
    >();
    expectTypeOf<BauwerksmodellBefehl>().toExtend<Befehl>();
    expectTypeOf<BauwerksmodellAnlegen['bauwerksmodell']>().toEqualTypeOf<Bauwerksmodell>();
    expectTypeOf<BauwerksmodellUmbenennen>().toEqualTypeOf<{
      readonly art: 'BauwerksmodellUmbenennen';
      readonly name: string;
    }>();
    expect(MASSENBEFEHLSARTEN).toContain('BauwerksmodellAnlegen');
    expectTypeOf<'BauwerksmodellUmbenennen' | 'BauwerksmodellLoeschen'>().not.toExtend<Massenbefehlsart>();
    expectTypeOf<
      Extract<Massenbefehlskopf, { art: 'BauwerksmodellAnlegen' }>['bauwerksmodell']
    >().toEqualTypeOf<BauwerksmodellKopf>();
  });

  it('ChangeSet: Anlegen und Löschen tragen Kopf und Inhalt, Umbenennen nur den Kopf (D-45, D-54)', () => {
    expectTypeOf<BauwerksmodellChangeSet['art']>().toEqualTypeOf<'bauwerksmodell'>();
    expectTypeOf<BauwerksmodellChangeSet['kopf']>().toEqualTypeOf<Aenderung<BauwerksmodellKopf>>();
    expectTypeOf<BauwerksmodellChangeSet['inhalt']>().toEqualTypeOf<
      Aenderung<BauwerksmodellInhalt> | undefined
    >();
    const umbenennen = beispielChangeSetBauwerksmodellUmbenennen;
    expect(umbenennen).not.toHaveProperty('inhalt');
    expect(umbenennen.kopf.vorher).not.toHaveProperty('bauteile');
    expect({ ...umbenennen.kopf.vorher, name: '' }).toEqual({ ...umbenennen.kopf.nachher, name: '' });
    const anlegen = beispielChangeSetBauwerksmodellAnlegen;
    expect({ ...anlegen.kopf.nachher, ...anlegen.inhalt?.nachher }).toEqual(beispielBauwerksmodell);
  });

  it('Umkehrung ohne Vorzustand: Tausch von vorher und nachher macht aus dem Anlegen das Löschen', () => {
    const tausch = <T>(a: Aenderung<T>): Aenderung<T> => ({ vorher: a.nachher, nachher: a.vorher });
    const cs = beispielChangeSetBauwerksmodellAnlegen;
    expect({
      ...cs,
      kopf: tausch(cs.kopf),
      ...(cs.inhalt === undefined ? {} : { inhalt: tausch(cs.inhalt) }),
    }).toEqual(beispielChangeSetBauwerksmodellLoeschen);
    expect(beispielBauwerksmodellLoeschen).toEqual({ art: 'BauwerksmodellLoeschen' });
  });

  it('D-51: die Bytes stehen nie im Aggregat oder ChangeSet (nur Daten, kein Uint8Array)', () => {
    expectTypeOf<NurDaten<Bauwerksmodell>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<BauwerksmodellChangeSet>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<BauwerksmodellBefehl>>().toEqualTypeOf<true>();
    expectTypeOf<Uint8Array>().not.toExtend<Modelldatei[keyof Modelldatei]>();
  });
});

describe('v1.6 Punkt 2: Modelldateien (D-51)', () => {
  it('eine inhaltsadressierte Ablage am Speicher, kein Befehl: ablegen liefert den Hash, laden die Bytes', () => {
    expectTypeOf<Speicher['modelldateien']>().toEqualTypeOf<Modelldateiablage>();
    expectTypeOf<Modelldateiablage['ablegen']>().parameter(0).toEqualTypeOf<Uint8Array>();
    expectTypeOf<ReturnType<Modelldateiablage['ablegen']>>().toEqualTypeOf<
      Promise<Ergebnis<Modelldatei['hash'], Speicherfehler>>
    >();
    expectTypeOf<Modelldateiablage['laden']>().parameter(0).toEqualTypeOf<Modelldatei['hash']>();
    expectTypeOf<ReturnType<Modelldateiablage['laden']>>().toEqualTypeOf<
      Promise<Ergebnis<Uint8Array, Speicherfehler>>
    >();
    expectTypeOf<ReturnType<Modelldateiablage['vorhanden']>>().toEqualTypeOf<
      Promise<Ergebnis<boolean, Speicherfehler>>
    >();
    // Ablegen ist kein Befehl: Es gibt keinen Befehlsnamen dafür.
    expectTypeOf<Extract<Befehlsart, `Modelldatei${string}`>>().toEqualTypeOf<never>();
  });

  it('Projektdatei: Modelle und Modelldateien optional (fehlt = keine); die Bytes als deflate-raw in Base64', () => {
    expectTypeOf<Projektdatei['bauwerksmodelle']>().toEqualTypeOf<
      readonly BauwerksmodellZustand[] | undefined
    >();
    expectTypeOf<Projektdatei['modelldateien']>().toEqualTypeOf<
      readonly { readonly hash: string; readonly inhalt: string }[] | undefined
    >();
  });

  it('Beispiel: verglichen wird der SHA-256 der entpackten Bytes, nie der komprimierte Text', () => {
    const { hash, inhalt } = beispielModelldateiInProjektdatei;
    const bytes = inflateRawSync(Buffer.from(inhalt, 'base64'));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash);
    expect(bytes.length).toBe(beispielModelldatei.groesse);
    expect(hash).toBe(beispielBauwerksmodell.datei.hash);
    // Ein anderer Packer liefert anderen Text für dieselben Bytes: Der Hash bleibt derselbe.
    const anders = deflateRawSync(bytes, { level: 1 }).toString('base64');
    expect(
      createHash('sha256')
        .update(inflateRawSync(Buffer.from(anders, 'base64')))
        .digest('hex'),
    ).toBe(hash);
  });

  it('ein eigener Fehlercode für einen Export über der Grenze für Zeichenketten (kürzt nie, D-51)', () => {
    expectTypeOf<'datei-zu-gross'>().toExtend<Speicherfehlercode>();
  });
});

describe('v1.6 Punkt 3: Zuordnung Bauteil ↔ Position (X1c, D-52)', () => {
  it('Bauteilzuordnung: GlobalId und Mengenart; kein Modell, kein Mengensatz (enge Lesart)', () => {
    expectTypeOf<Bauteilzuordnung>().toEqualTypeOf<{
      readonly globalId: IfcGlobalId;
      readonly mengenart: string;
    }>();
    expectTypeOf<Bauteilzuordnung>().not.toHaveProperty('bauwerksmodellId');
    expectTypeOf<Bauteilzuordnung>().not.toHaveProperty('satz');
  });

  it('an der Position optional (fehlt = keine), geordnet; ein Hinweistext und eine Gliederung tragen keine', () => {
    expectTypeOf<Positionsdaten['bauteile']>().toEqualTypeOf<readonly Bauteilzuordnung[] | undefined>();
    expectTypeOf<Hinweistext>().not.toHaveProperty('bauteile');
    expectTypeOf<Titel>().not.toHaveProperty('bauteile');
    expect(alsPosition(beispielLv.knoten.find((k) => k.art === 'position'))).not.toHaveProperty('bauteile');
  });

  it('BauteileZuordnen: ganze Liste oder null, ein Typ im LV und im Auftrags-LV (wie KostengruppeSetzen)', () => {
    expectTypeOf<BauteileZuordnen>().toEqualTypeOf<{
      readonly art: 'BauteileZuordnen';
      readonly positionId: PositionId;
      readonly bauteile: readonly Bauteilzuordnung[] | null;
    }>();
    expectTypeOf<BauteileZuordnen>().toExtend<LvBefehl>();
    expectTypeOf<BauteileZuordnen>().toExtend<AuftragsLvBefehl>();
    expectTypeOf<'BauteileZuordnen'>().not.toExtend<Massenbefehlsart>();
    // D-53: Nach dem Zuschlag führt der Weg zur Menge nur über das Aufmaßblatt, nicht über den Mengenansatz.
    expectTypeOf<'MengenansatzSetzen'>().not.toExtend<AuftragsLvBefehl['art']>();
  });

  it('Beispiel: zwei Wände, je die Länge; dasselbe Paar steht nur einmal; null entfernt', () => {
    const liste = beispielBauteileZuordnen.bauteile ?? [];
    const paare = liste.map((z) => `${z.globalId}|${z.mengenart}`);
    expect(new Set(paare).size).toBe(paare.length);
    const modell = new Set(beispielBauwerksmodell.bauteile.map((b) => b.globalId));
    for (const z of liste) {
      expect(z.globalId).toMatch(GLOBALID);
      expect(modell).toContain(z.globalId);
    }
    expect(beispielBauteileEntfernen.bauteile).toBeNull();
  });

  it('ChangeSet: eine Knotenänderung der Position ohne Summen; die Umkehrung nimmt die Zuordnungen weg', () => {
    const [g] = beispielChangeSetBauteileZuordnen.knoten.geaendert;
    expect(g?.vorher).not.toHaveProperty('bauteile');
    expect(g?.nachher).toEqual({ ...g?.vorher, bauteile: beispielBauteileZuordnen.bauteile });
    expect(beispielChangeSetBauteileZuordnen.summen.positionen).toEqual([]);
    expect(beispielChangeSetBauteileZuordnen.kopf).toBeNull();
  });

  it('offene Typfrage (D-53): eine Ansatzzeile nennt keine GlobalId', () => {
    expectTypeOf<Ansatzzeile>().not.toHaveProperty('globalId');
  });
});

describe('v1.6 Punkt 4: Bauzeitenplan (X2, D-57)', () => {
  it('Kennungen, Wochentag, Bundesland (16 Kürzel ohne DE-), Arbeitskalender und Anordnungsart', () => {
    expectTypeOf<string>().not.toExtend<BauzeitenplanId>();
    expectTypeOf<VorgangId>().not.toExtend<BauzeitenplanId>();
    expectTypeOf<Wochentag>().toEqualTypeOf<1 | 2 | 3 | 4 | 5 | 6 | 7>();
    const laender: Record<Bundesland, true> = {
      BW: true,
      BY: true,
      BE: true,
      BB: true,
      HB: true,
      HH: true,
      HE: true,
      MV: true,
      NI: true,
      NW: true,
      RP: true,
      SL: true,
      SN: true,
      ST: true,
      SH: true,
      TH: true,
    };
    expect(Object.keys(laender)).toHaveLength(16);
    expectTypeOf<Arbeitskalender>().toEqualTypeOf<{
      readonly arbeitstage: readonly Wochentag[];
      readonly bundesland: Bundesland | null;
      readonly freieTage: readonly string[];
    }>();
    expectTypeOf<Anordnungsart>().toEqualTypeOf<
      'ende-anfang' | 'anfang-anfang' | 'ende-ende' | 'anfang-ende'
    >();
    expectTypeOf<Anordnungsbeziehung>().toEqualTypeOf<{
      readonly vorgaengerId: VorgangId;
      readonly art: Anordnungsart;
      readonly abstand: number;
    }>();
  });

  it('Vorgang: nur Eingaben; Nummer, Terminvorgabe, Bezug und Ist nullbar; nichts Gerechnetes', () => {
    expectTypeOf<Vorgang['nummer']>().toEqualTypeOf<string | null>();
    expectTypeOf<Vorgang['elternId']>().toEqualTypeOf<VorgangId | null>();
    expectTypeOf<Vorgang['bezug']>().toEqualTypeOf<Vorgangsbezug | null>();
    expectTypeOf<Vorgang['ist']>().toEqualTypeOf<Isttermine | null>();
    expectTypeOf<Isttermine['fortschritt']>().toEqualTypeOf<Prozent | null>();
    expectTypeOf<Vorgang>().not.toHaveProperty('termine');
    expectTypeOf<Vorgang>().not.toHaveProperty('beginn');
    expectTypeOf<Bauzeitenplan>().not.toHaveProperty('kritischeWege');
  });

  it('Vorgangsbezug: LV oder Auftrags-LV wie im AggregatBezug, ganz (null) oder Positionen und Gliederungen', () => {
    expectTypeOf<Vorgangsbezug['art']>().toEqualTypeOf<
      'leistungsverzeichnis' | 'auftrags-leistungsverzeichnis'
    >();
    expectTypeOf<NonNullable<Vorgangsbezug['knotenIds']>[number]>().toEqualTypeOf<
      GliederungId | PositionId
    >();
    expectTypeOf<HinweistextId>().not.toExtend<NonNullable<Vorgangsbezug['knotenIds']>[number]>();
    const [rohbau, , mauerwerk] = beispielBauzeitenplan.vorgaenge;
    expect(rohbau?.bezug?.knotenIds).toBeNull();
    expect(mauerwerk?.bezug?.knotenIds).toHaveLength(1);
  });

  it('Beispiel: Dokumentreihenfolge, Vorgänger und Eltern im Plan, Kennungen eindeutig', () => {
    const v = beispielBauzeitenplan.vorgaenge;
    const ids = v.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    v.forEach((x, i) => {
      if (x.elternId !== null) expect(ids.indexOf(x.elternId)).toBeLessThan(i);
      for (const b of x.vorgaenger) expect(ids).toContain(b.vorgaengerId);
      expect(Number.isSafeInteger(x.dauer) && x.dauer >= 0).toBe(true);
    });
    expect(beispielBauzeitenplan.kalender.arbeitstage).toEqual([1, 2, 3, 4, 5]);
  });

  it('Ergebnis: je Vorgang Art und Termine (oder null), mehrere kritische Wege möglich, Befunde der gemeinsamen Liste', () => {
    expectTypeOf<Bauzeitenplanergebnis['vorgaenge'][number]>().toEqualTypeOf<Vorgangsergebnis>();
    expectTypeOf<Vorgangsergebnis['termine']>().toEqualTypeOf<Vorgangstermine | null>();
    expectTypeOf<Vorgangsart>().toEqualTypeOf<'vorgang' | 'sammelvorgang' | 'meilenstein'>();
    expectTypeOf<Bauzeitenplanergebnis['kritischeWege']>().toEqualTypeOf<readonly (readonly VorgangId[])[]>();
    expectTypeOf<Bauzeitenplanergebnis['befunde']>().toEqualTypeOf<readonly Pruefbefund[]>();
    const e = beispielBauzeitenplanergebnis;
    expect(e.vorgaenge.map((x) => x.vorgangId)).toEqual(beispielBauzeitenplan.vorgaenge.map((x) => x.id));
    const meilenstein = e.vorgaenge.find((x) => x.art === 'meilenstein')?.termine;
    expect(meilenstein?.beginn).toBe(meilenstein?.ende);
    expect(e.projektende).toBe(meilenstein?.ende);
    // Sammelvorgänge gehören nie zum kritischen Weg.
    const sammel = new Set(e.vorgaenge.filter((x) => x.art === 'sammelvorgang').map((x) => x.vorgangId));
    for (const weg of e.kritischeWege) for (const id of weg) expect(sammel.has(id)).toBe(false);
  });

  it('Befehle: Anlegen, Kopf setzen, Vorgang setzen (mit Lage), Vorgang entfernen, Löschen; kein Massenbefehl', () => {
    expectTypeOf<BauzeitenplanBefehl['art']>().toEqualTypeOf<
      | 'BauzeitenplanAnlegen'
      | 'BauzeitenplankopfSetzen'
      | 'VorgangSetzen'
      | 'VorgangEntfernen'
      | 'BauzeitenplanLoeschen'
    >();
    expectTypeOf<BauzeitenplanBefehl>().toExtend<Befehl>();
    expectTypeOf<VorgangSetzen['nach']>().toEqualTypeOf<VorgangId | null>();
    expectTypeOf<BauzeitenplankopfSetzen>().toEqualTypeOf<{
      readonly art: 'BauzeitenplankopfSetzen';
      readonly name: string;
      readonly projektbeginn: string;
      readonly kalender: Arbeitskalender;
    }>();
    expectTypeOf<'BauzeitenplanAnlegen'>().not.toExtend<Massenbefehlsart>();
    const { vorgang, nach } = beispielVorgangSetzen;
    const geschwister = beispielBauzeitenplan.vorgaenge.filter((x) => x.elternId === vorgang.elternId);
    expect(geschwister.map((x) => x.id)).toContain(nach);
  });

  it('ChangeSet als ganzer Plan; Entfernen nimmt die Beziehungen auf den Vorgang mit, die Umkehrung durch Tausch', () => {
    expectTypeOf<BauzeitenplanChangeSet['bauzeitenplan']>().toEqualTypeOf<Aenderung<Bauzeitenplan>>();
    expectTypeOf<BauzeitenplanZustand>().toEqualTypeOf<{ readonly bauzeitenplan: Bauzeitenplan }>();
    const { vorher, nachher } = beispielChangeSetVorgangEntfernen.bauzeitenplan;
    const weg = beispielVorgangEntfernen.vorgangId;
    expect(vorher?.vorgaenge.some((x) => x.id === weg)).toBe(true);
    expect(nachher?.vorgaenge.some((x) => x.id === weg)).toBe(false);
    for (const x of nachher?.vorgaenge ?? [])
      expect(x.vorgaenger.map((b) => b.vorgaengerId)).not.toContain(weg);
    expect(beispielBauzeitenplanbefehle.map((b) => b.art)).toEqual([
      'BauzeitenplanAnlegen',
      'BauzeitenplankopfSetzen',
      'BauzeitenplanLoeschen',
    ]);
  });

  it('die vertraglichen Eingaben passen in die Form, die `bauzeit` rechnet (reine Daten)', () => {
    expectTypeOf<NurDaten<Bauzeitenplan>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<Bauzeitenplanergebnis>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<BauzeitenplanBefehl>>().toEqualTypeOf<true>();
  });
});

describe('v1.6 Punkt 5: Honorarberechnung (X3, D-56; Namen wie `honorar`, D-101.10)', () => {
  it('Leistungsbilder, Honorarzonen in der Schreibweise der HOAI, Leistungsphasen 1 bis 9', () => {
    expectTypeOf<Leistungsbild>().toEqualTypeOf<
      | 'gebaeude'
      | 'innenraeume'
      | 'freianlagen'
      | 'ingenieurbauwerke'
      | 'verkehrsanlagen'
      | 'tragwerksplanung'
      | 'technische-ausruestung'
    >();
    expectTypeOf<Honorarzone>().toEqualTypeOf<'I' | 'II' | 'III' | 'IV' | 'V'>();
    expectTypeOf<Leistungsphasennummer>().toEqualTypeOf<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9>();
    expectTypeOf<BeauftragteLeistungsphase>().toEqualTypeOf<{
      readonly nummer: Leistungsphasennummer;
      readonly anteil?: Prozent;
    }>();
  });

  it('anrechenbare Kosten: Betrag von Hand oder Verweis auf eine Kostenermittlung mit den Angaben nach § 33', () => {
    expectTypeOf<AnrechenbareKostenangabe['art']>().toEqualTypeOf<'betrag' | 'kostenermittlung'>();
    type AusKostenermittlung = Extract<AnrechenbareKostenangabe, { art: 'kostenermittlung' }>;
    expectTypeOf<AusKostenermittlung['kostenermittlungId']>().toEqualTypeOf<KostenermittlungId>();
    expectTypeOf<AusKostenermittlung['technischeAnlagenAnteilig']>().toEqualTypeOf<boolean>();
    expectTypeOf<AusKostenermittlung['weitereKosten']>().toEqualTypeOf<Betrag>();
    expectTypeOf<AusKostenermittlung['mitzuverarbeitendeBausubstanz']>().toEqualTypeOf<Betrag>();
    // Gespeichert wird der Verweis, nie die Beträge der Kostengruppen.
    expectTypeOf<AusKostenermittlung>().not.toHaveProperty('kg300');
  });

  it('Honorarobjekt und Honorarberechnung: Umbauzuschlagssatz (Prozent) neben dem Ergebnis Umbauzuschlag (Betrag)', () => {
    expectTypeOf<Honorarobjekt['umbauzuschlagssatz']>().toEqualTypeOf<Prozent | null>();
    expectTypeOf<Objektergebnis['umbauzuschlag']>().toEqualTypeOf<Betrag>();
    expectTypeOf<Honorarobjekt>().not.toHaveProperty('umbauzuschlag');
    expectTypeOf<Honorarberechnung['nebenkosten']>().toEqualTypeOf<Nebenkostenangabe | null>();
    expectTypeOf<Honorarberechnung>().not.toHaveProperty('ergebnis');
    expectTypeOf<HonorarberechnungZustand>().toEqualTypeOf<{
      readonly honorarberechnung: Honorarberechnung;
    }>();
  });

  it('Beispiel: der Verweis nennt eine Kostenberechnung (§ 6 Abs. 1 Nr. 2); Phasen aufsteigend, je einmal', () => {
    const [objekt] = beispielHonorarberechnung.objekte;
    const k = objekt?.anrechenbareKosten;
    expect(k?.art === 'kostenermittlung' && k.kostenermittlungId).toBe(beispielKostenberechnungHoai.id);
    expect(beispielKostenberechnungHoai.stufe).toBe('kostenberechnung');
    expect(objekt?.leistungsphasen.map((p) => p.nummer)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('Ergebnis (Form wie `honorar`): Kette Grundhonorar + Zuschläge + Nebenkosten = Netto, Befunde in der gemeinsamen Liste', () => {
    expectTypeOf<Honorarergebnis['befunde']>().toEqualTypeOf<readonly Pruefbefund[]>();
    expectTypeOf<Tafelzeile['spannen']>().toEqualTypeOf<
      Readonly<Partial<Record<Honorarzone, Honorarspanne>>>
    >();
    expectTypeOf<Tafelinterpolation>().toEqualTypeOf<{
      readonly zeileUnten: Tafelzeile;
      readonly zeileOben: Tafelzeile;
      readonly spanne: Honorarspanne;
    }>();
    expectTypeOf<Objektergebnis['herleitung']>().toEqualTypeOf<AnrechenbareKostenHerleitung | null>();
    expectTypeOf<Objektergebnis['phasen']>().toEqualTypeOf<readonly Phasenbetrag[]>();
    const e = beispielHonorarergebnis;
    const cent = (b: string): number => Math.round(Number(b) * 100);
    expect(cent(e.netto)).toBe(cent(e.grundhonorar) + cent(e.umbauzuschlaege) + cent(e.nebenkosten));
    expect(cent(e.brutto)).toBe(cent(e.netto) + cent(e.mwst));
    const [o] = e.objekte;
    expect(o?.phasen.reduce((s, p) => s + cent(p.betrag), 0)).toBe(cent(o?.grundhonorar ?? '0'));
    const h = o?.herleitung;
    expect(cent(h?.sonstigeAnrechenbareKosten ?? '0')).toBe(
      cent(h?.kg300 ?? '0') + cent(h?.weitereKosten ?? '0'),
    );
  });

  it('Befehle: Anlegen, Setzen (ganzer Inhalt), Löschen; ChangeSet als ganzes Aggregat; kein Massenbefehl', () => {
    expectTypeOf<HonorarberechnungBefehl['art']>().toEqualTypeOf<
      'HonorarberechnungAnlegen' | 'HonorarberechnungSetzen' | 'HonorarberechnungLoeschen'
    >();
    expectTypeOf<HonorarberechnungBefehl>().toExtend<Befehl>();
    expectTypeOf<Omit<HonorarberechnungSetzen, 'art'>>().toEqualTypeOf<
      Omit<Honorarberechnung, 'id' | 'projektId'>
    >();
    expectTypeOf<HonorarberechnungChangeSet['honorarberechnung']>().toEqualTypeOf<
      Aenderung<Honorarberechnung>
    >();
    expectTypeOf<'HonorarberechnungAnlegen'>().not.toExtend<Massenbefehlsart>();
    const { vorher, nachher } = beispielChangeSetHonorarberechnungSetzen.honorarberechnung;
    expect(nachher?.id).toBe(vorher?.id);
    expect(nachher?.objekte[0]?.honorarsatz).toBe('25.00');
    expect(beispielHonorarbefehle.map((b) => b.art)).toEqual([
      'HonorarberechnungAnlegen',
      'HonorarberechnungSetzen',
      'HonorarberechnungLoeschen',
    ]);
    expectTypeOf<NurDaten<Honorarberechnung>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<Honorarergebnis>>().toEqualTypeOf<true>();
  });
});

/** Die zulässigen Wechsel des Mangelstatus (Lesart an `Mangelstatus`; die Tabelle des Ausführers liefert Ticket 111). */
const MANGELWECHSEL: Readonly<Record<Mangelstatus, readonly Mangelstatus[]>> = {
  offen: ['angezeigt'],
  angezeigt: ['beseitigt'],
  beseitigt: ['abgenommen', 'offen'],
  abgenommen: [],
};

describe('v1.6 Punkt 6: Mängel und Bautagebuch (X4, D-57)', () => {
  it('Kennungen, Status und Verlaufseintrag', () => {
    expectTypeOf<string>().not.toExtend<MangelId>();
    expectTypeOf<MangelId>().not.toExtend<BautagebucheintragId>();
    expectTypeOf<Mangelstatus>().toEqualTypeOf<'offen' | 'angezeigt' | 'beseitigt' | 'abgenommen'>();
    expectTypeOf<Mangelverlaufseintrag>().toEqualTypeOf<{
      readonly status: Mangelstatus;
      readonly datum: string;
      readonly bemerkung: string | null;
      readonly frist?: string; // Nachtrag Review (D-66), additiv
    }>();
  });

  it('der Verlauf ist die Quelle des Status: kein eigenes Feld, kein gespeichertes „überfällig“', () => {
    expectTypeOf<Mangel>().not.toHaveProperty('status');
    expectTypeOf<Mangel>().not.toHaveProperty('ueberfaellig');
    expectTypeOf<Mangel['bauteil']>().toEqualTypeOf<{
      readonly bauwerksmodellId: BauwerksmodellId | null;
      readonly globalId: IfcGlobalId;
    } | null>();
    expectTypeOf<Mangel>().not.toHaveProperty('fotos');
  });

  it('Beispiele: erster Eintrag offen, jeder Wechsel zulässig, Daten nicht fallend und nicht vor der Feststellung', () => {
    for (const m of [beispielMangel1, beispielMangel2, beispielChangeSetMangelstatus.mangel.nachher]) {
      if (m === null) throw new Error('Mangel erwartet');
      expect(m.verlauf[0]?.status).toBe('offen');
      m.verlauf.forEach((e, i) => {
        expect(e.datum >= m.festgestellt).toBe(true);
        const vorher = m.verlauf[i - 1];
        if (vorher === undefined) return;
        expect(MANGELWECHSEL[vorher.status]).toContain(e.status);
        expect(e.datum >= vorher.datum).toBe(true);
      });
      if (m.positionId !== null) expect(m.auftragsLvId).not.toBeNull();
    }
    expect(beispielMangel2.verlauf.at(-1)?.status).toBe('offen');
    expect(new Set([beispielMangel1.nummer, beispielMangel2.nummer]).size).toBe(2);
  });

  it('Befehle: Anlegen, Angaben setzen (ohne Nummer und Verlauf), Status setzen (hängt an), Löschen', () => {
    expectTypeOf<MangelBefehl['art']>().toEqualTypeOf<
      'MangelAnlegen' | 'MangelangabenSetzen' | 'MangelstatusSetzen' | 'MangelLoeschen'
    >();
    expectTypeOf<Omit<MangelangabenSetzen, 'art'>>().toEqualTypeOf<
      Omit<Mangel, 'id' | 'projektId' | 'nummer' | 'verlauf'>
    >();
    expectTypeOf<MangelstatusSetzen['eintrag']>().toEqualTypeOf<Mangelverlaufseintrag>();
    expectTypeOf<'statuswechsel-unzulaessig'>().toExtend<Befehlsfehlercode>();
    const { vorher, nachher } = beispielChangeSetMangelstatus.mangel;
    expect(nachher?.verlauf.slice(0, -1)).toEqual(vorher?.verlauf);
    expect(nachher?.verlauf.at(-1)).toEqual(beispielMangelstatusSetzen.eintrag);
    expect(beispielMangelbefehle.map((b) => b.art)).toEqual([
      'MangelAnlegen',
      'MangelangabenSetzen',
      'MangelLoeschen',
    ]);
  });

  it('Bautagebucheintrag: ganze Zahlen für Grad und Köpfe, je Firma eine Zeile, keine Fotos', () => {
    expectTypeOf<Bautagebucheintrag['wetter']['temperaturMin']>().toEqualTypeOf<number | null>();
    expectTypeOf<Bautagebucheintrag['arbeitskraefte'][number]>().toEqualTypeOf<{
      readonly firma: string;
      readonly anzahl: number;
    }>();
    expectTypeOf<Bautagebucheintrag>().not.toHaveProperty('fotos');
    const e = beispielBautagebucheintrag;
    const firmen = e.arbeitskraefte.map((a) => a.firma);
    expect(new Set(firmen).size).toBe(firmen.length);
    for (const a of e.arbeitskraefte) expect(Number.isSafeInteger(a.anzahl) && a.anzahl >= 0).toBe(true);
    const { temperaturMin, temperaturMax } = e.wetter;
    expect(Number.isSafeInteger(temperaturMin) && Number.isSafeInteger(temperaturMax)).toBe(true);
    expect((temperaturMin ?? 0) <= (temperaturMax ?? 0)).toBe(true);
  });

  it('Bautagebuchbefehle nach dem Aggregat benannt; kleine ChangeSets je Aggregat', () => {
    expectTypeOf<BautagebucheintragBefehl['art']>().toEqualTypeOf<
      'BautagebucheintragSetzen' | 'BautagebucheintragLoeschen'
    >();
    expectTypeOf<MangelBefehl | BautagebucheintragBefehl>().toExtend<Befehl>();
    expectTypeOf<MangelChangeSet['mangel']>().toEqualTypeOf<Aenderung<Mangel>>();
    expectTypeOf<BautagebucheintragChangeSet['bautagebucheintrag']>().toEqualTypeOf<
      Aenderung<Bautagebucheintrag>
    >();
    expectTypeOf<MangelZustand>().toEqualTypeOf<{ readonly mangel: Mangel }>();
    expectTypeOf<BautagebucheintragZustand>().toEqualTypeOf<{
      readonly bautagebucheintrag: Bautagebucheintrag;
    }>();
    expect(beispielChangeSetBautagebucheintrag.bautagebucheintrag.vorher).toBeNull();
    expect(beispielBautagebuchbefehle.map((b) => b.art)).toEqual([
      'BautagebucheintragSetzen',
      'BautagebucheintragLoeschen',
    ]);
    expectTypeOf<NurDaten<Mangel>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<Bautagebucheintrag>>().toEqualTypeOf<true>();
  });
});

describe('v1.6 Punkt 7: Befundquellen der Module X1 bis X4 in der gemeinsamen Befundliste (D-97.11)', () => {
  it('fünf neue Quellen; die Ergebnisse von Terminrechnung und Honorarberechnung tragen Prüfbefunde', () => {
    expectTypeOf<
      'ifc-lesen' | 'modell-pruefung' | 'terminrechnung' | 'honorarberechnung' | 'fristpruefung'
    >().toExtend<Befundquelle>();
    expectTypeOf<Bauzeitenplanergebnis['befunde'][number]>().toEqualTypeOf<Pruefbefund>();
    expectTypeOf<Honorarergebnis['befunde'][number]>().toEqualTypeOf<Pruefbefund>();
  });

  it('der Ort kennt additiv GlobalId, Vorgang und Mangel als Sprungziel; alles Bisherige bleibt', () => {
    expectTypeOf<Befundort['globalId']>().toEqualTypeOf<IfcGlobalId | undefined>();
    expectTypeOf<Befundort['vorgangId']>().toEqualTypeOf<VorgangId | undefined>();
    expectTypeOf<Befundort['mangelId']>().toEqualTypeOf<MangelId | undefined>();
    expectTypeOf<Befundort['knotenId']>().toEqualTypeOf<KnotenId | undefined>();
    expectTypeOf<Befundort['pfad']>().toEqualTypeOf<string | undefined>();
  });

  it('Beispiel: je Quelle der Ort nach ihrer Lesart', () => {
    const nach = new Map(beispielBefundeV16.map((b) => [b.quelle, b.ort]));
    expect(nach.get('ifc-lesen')?.pfad).toMatch(/^#[1-9][0-9]*$/);
    expect(nach.get('modell-pruefung')?.knotenId).toBeDefined();
    expect(nach.get('modell-pruefung')?.globalId).toMatch(GLOBALID);
    expect(nach.get('terminrechnung')?.vorgangId).toBeDefined();
    expect(nach.get('honorarberechnung')?.pfad).toMatch(/^\/objekte\[[1-9][0-9]*\]$/);
    expect(nach.get('fristpruefung')).toEqual({ mangelId: beispielMangel1.id, feld: 'frist' });
    for (const b of beispielBefundeV16) expect(b.ort).not.toHaveProperty('spalte');
  });
});

describe('v1.6 Punkt 8: Rand (Protokoll, Unions, Signaturen, Repositories, Projektdatei, Kennungen)', () => {
  type Neu = 'bauwerksmodell' | 'bauzeitenplan' | 'honorarberechnung' | 'mangel' | 'bautagebucheintrag';

  it('AggregatBezug und ChangeSet kennen die fünf neuen Aggregate mit ihren Kennungen', () => {
    expectTypeOf<Neu>().toExtend<AggregatBezug['art']>();
    expectTypeOf<Extract<ChangeSet['art'], Neu>>().toEqualTypeOf<Neu>();
    expectTypeOf<Exclude<AggregatBezug['art'], ChangeSet['art']>>().toEqualTypeOf<never>();
    expectTypeOf<Extract<AggregatBezug, { art: 'bauwerksmodell' }>['id']>().toEqualTypeOf<BauwerksmodellId>();
    expectTypeOf<Extract<AggregatBezug, { art: 'bauzeitenplan' }>['id']>().toEqualTypeOf<BauzeitenplanId>();
    expectTypeOf<
      Extract<AggregatBezug, { art: 'honorarberechnung' }>['id']
    >().toEqualTypeOf<HonorarberechnungId>();
    expectTypeOf<Extract<AggregatBezug, { art: 'mangel' }>['id']>().toEqualTypeOf<MangelId>();
    expectTypeOf<
      Extract<AggregatBezug, { art: 'bautagebucheintrag' }>['id']
    >().toEqualTypeOf<BautagebucheintragId>();
  });

  it('jeder Befehlsname gehört zu genau einem Aggregat, außer KostengruppeSetzen und BauteileZuordnen', () => {
    type Alt =
      | LvBefehl['art']
      | AuftragsLvBefehl['art']
      | AngebotBefehl['art']
      | ProjektBefehl['art']
      | AufmassBefehl['art']
      | RechnungBefehl['art']
      | KostenermittlungBefehl['art'];
    type Neu16 =
      | BauwerksmodellBefehl['art']
      | BauzeitenplanBefehl['art']
      | HonorarberechnungBefehl['art']
      | MangelBefehl['art']
      | BautagebucheintragBefehl['art'];
    expectTypeOf<Extract<Neu16, Alt>>().toEqualTypeOf<never>();
    expectTypeOf<
      Extract<BauwerksmodellBefehl['art'], BauzeitenplanBefehl['art'] | HonorarberechnungBefehl['art']>
    >().toEqualTypeOf<never>();
    expectTypeOf<Extract<MangelBefehl['art'], BautagebucheintragBefehl['art']>>().toEqualTypeOf<never>();
  });

  it('Signaturen je neuem Aggregat; Mangel und Bautagebuch bekommen den Bestand (D-57)', () => {
    expectTypeOf<BauwerksmodellBefehlAusfuehren>().toEqualTypeOf<
      (
        zustand: BauwerksmodellZustand | null,
        befehl: BauwerksmodellBefehl,
      ) => Ergebnis<BauwerksmodellChangeSet, Befehlsfehler>
    >();
    expectTypeOf<BauwerksmodellChangeSetAnwenden>().toEqualTypeOf<
      (
        zustand: BauwerksmodellZustand | null,
        changeSet: BauwerksmodellChangeSet,
      ) => BauwerksmodellZustand | null
    >();
    expectTypeOf<BauwerksmodellChangeSetUmkehren>().toEqualTypeOf<
      (changeSet: BauwerksmodellChangeSet) => BauwerksmodellChangeSet
    >();
    expectTypeOf<BauzeitenplanBefehlAusfuehren>().toEqualTypeOf<
      (
        zustand: BauzeitenplanZustand | null,
        befehl: BauzeitenplanBefehl,
      ) => Ergebnis<BauzeitenplanChangeSet, Befehlsfehler>
    >();
    expectTypeOf<BauzeitenplanChangeSetUmkehren>().toEqualTypeOf<
      (changeSet: BauzeitenplanChangeSet) => BauzeitenplanChangeSet
    >();
    expectTypeOf<ReturnType<BauzeitenplanChangeSetAnwenden>>().toEqualTypeOf<BauzeitenplanZustand | null>();
    expectTypeOf<HonorarberechnungBefehlAusfuehren>().toEqualTypeOf<
      (
        zustand: HonorarberechnungZustand | null,
        befehl: HonorarberechnungBefehl,
      ) => Ergebnis<HonorarberechnungChangeSet, Befehlsfehler>
    >();
    expectTypeOf<
      ReturnType<HonorarberechnungChangeSetAnwenden>
    >().toEqualTypeOf<HonorarberechnungZustand | null>();
    expectTypeOf<HonorarberechnungChangeSetUmkehren>().toEqualTypeOf<
      (changeSet: HonorarberechnungChangeSet) => HonorarberechnungChangeSet
    >();
    expectTypeOf<MangelBefehlAusfuehren>().toEqualTypeOf<
      (
        zustand: MangelZustand | null,
        befehl: MangelBefehl,
        bestand: readonly Pick<Mangel, 'id' | 'nummer'>[],
      ) => Ergebnis<MangelChangeSet, Befehlsfehler>
    >();
    expectTypeOf<ReturnType<MangelChangeSetAnwenden>>().toEqualTypeOf<MangelZustand | null>();
    expectTypeOf<MangelChangeSetUmkehren>().toEqualTypeOf<(changeSet: MangelChangeSet) => MangelChangeSet>();
    expectTypeOf<BautagebucheintragBefehlAusfuehren>().toEqualTypeOf<
      (
        zustand: BautagebucheintragZustand | null,
        befehl: BautagebucheintragBefehl,
        bestand: readonly Pick<Bautagebucheintrag, 'id' | 'datum'>[],
      ) => Ergebnis<BautagebucheintragChangeSet, Befehlsfehler>
    >();
    expectTypeOf<
      ReturnType<BautagebucheintragChangeSetAnwenden>
    >().toEqualTypeOf<BautagebucheintragZustand | null>();
    expectTypeOf<BautagebucheintragChangeSetUmkehren>().toEqualTypeOf<
      (changeSet: BautagebucheintragChangeSet) => BautagebucheintragChangeSet
    >();
    // Der ganze Bestand (wie `MangelRepository.auflisten` ihn liefert) passt als Parameter.
    expectTypeOf<readonly Mangel[]>().toExtend<Parameters<MangelBefehlAusfuehren>[2]>();
    expectTypeOf<readonly Bautagebucheintrag[]>().toExtend<
      Parameters<BautagebucheintragBefehlAusfuehren>[2]
    >();
  });

  it('Repositories am Speicher (Pflicht): Modellliste ohne Struktur und Bauteile, Mängel und Bautagebuch ganz', () => {
    expectTypeOf<Speicher['bauwerksmodelle']>().toEqualTypeOf<BauwerksmodellRepository>();
    expectTypeOf<Speicher['bauzeitenplaene']>().toEqualTypeOf<BauzeitenplanRepository>();
    expectTypeOf<Speicher['honorarberechnungen']>().toEqualTypeOf<HonorarberechnungRepository>();
    expectTypeOf<Speicher['maengel']>().toEqualTypeOf<MangelRepository>();
    expectTypeOf<Speicher['bautagebuch']>().toEqualTypeOf<BautagebuchRepository>();
    expectTypeOf<BauwerksmodellUebersicht>().not.toHaveProperty('bauteile');
    expectTypeOf<BauwerksmodellUebersicht>().not.toHaveProperty('struktur');
    expectTypeOf<BauwerksmodellUebersicht['anzahlBauteile']>().toEqualTypeOf<number>();
    expectTypeOf<ReturnType<BauwerksmodellRepository['laden']>>().toEqualTypeOf<
      Promise<Ergebnis<BauwerksmodellZustand, Speicherfehler>>
    >();
    expectTypeOf<BauzeitenplanUebersicht>().not.toHaveProperty('vorgaenge');
    expectTypeOf<HonorarberechnungUebersicht>().toEqualTypeOf<Omit<Honorarberechnung, 'objekte'>>();
    expectTypeOf<ReturnType<MangelRepository['auflisten']>>().toEqualTypeOf<
      Promise<Ergebnis<readonly Mangel[], Speicherfehler>>
    >();
    expectTypeOf<ReturnType<BautagebuchRepository['auflisten']>>().toEqualTypeOf<
      Promise<Ergebnis<readonly Bautagebucheintrag[], Speicherfehler>>
    >();
    for (const r of [
      expectTypeOf<BauwerksmodellRepository['auflisten']>(),
      expectTypeOf<BauzeitenplanRepository['auflisten']>(),
      expectTypeOf<HonorarberechnungRepository['auflisten']>(),
      expectTypeOf<MangelRepository['auflisten']>(),
      expectTypeOf<BautagebuchRepository['auflisten']>(),
    ])
      r.parameter(0).toEqualTypeOf<ProjektId>();
    expect(beispielBauwerksmodellUebersicht).not.toHaveProperty('bauteile');
    expect(beispielBauwerksmodellUebersicht.anzahlBauteile).toBe(4);
  });

  it('Projektdatei: sechs optionale Listen (fehlt = keine); eine Datei ohne sie bleibt gültig', () => {
    expectTypeOf<Projektdatei['bauzeitenplaene']>().toEqualTypeOf<
      readonly BauzeitenplanZustand[] | undefined
    >();
    expectTypeOf<Projektdatei['honorarberechnungen']>().toEqualTypeOf<
      readonly HonorarberechnungZustand[] | undefined
    >();
    expectTypeOf<Projektdatei['maengel']>().toEqualTypeOf<readonly MangelZustand[] | undefined>();
    expectTypeOf<Projektdatei['bautagebuch']>().toEqualTypeOf<
      readonly BautagebucheintragZustand[] | undefined
    >();
    const d = beispielProjektdateiV16;
    // Jeder Hash, den ein Modell nennt, steht in der Datei, je einmal (vollständig, D-51).
    const hashes = (d.modelldateien ?? []).map((m) => m.hash);
    expect(new Set(hashes).size).toBe(hashes.length);
    for (const { bauwerksmodell } of d.bauwerksmodelle ?? [])
      expect(hashes).toContain(bauwerksmodell.datei.hash);
    // Der Verweis der Honorarberechnung nennt eine Kostenermittlung derselben Datei (sonst `konflikt`).
    const kosten = new Set((d.kostenermittlungen ?? []).map((k) => k.kostenermittlung.id));
    for (const { honorarberechnung } of d.honorarberechnungen ?? [])
      for (const o of honorarberechnung.objekte)
        if (o.anrechenbareKosten.art === 'kostenermittlung')
          expect(kosten.has(o.anrechenbareKosten.kostenermittlungId)).toBe(true);
    expect(beispielProjektdateiV14).not.toHaveProperty('bauwerksmodelle');
  });

  it('Protokoll: das Modell als Kurzfassung ohne Struktur und Bauteile; BauteileZuordnen mit dem LV als Aggregat', () => {
    const b = beispielMassenprotokollBauwerksmodell.befehl;
    expect(b.art).toBe('Befehlskurzfassung');
    expect(b.art === 'Befehlskurzfassung' && b.kopf.art).toBe('BauwerksmodellAnlegen');
    expect(JSON.stringify(b)).not.toContain('bauteile');
    expect(beispielMassenprotokollBauwerksmodell.aggregat).toEqual({
      art: 'bauwerksmodell',
      id: beispielBauwerksmodell.id,
    });
    expect(beispielProtokollBauteileZuordnen.aggregat.art).toBe('leistungsverzeichnis');
  });

  it('IdQuelle liefert die Kennungen der neuen Aggregate und der Vorgänge', () => {
    expectTypeOf<ReturnType<IdQuelle['bauwerksmodell']>>().toEqualTypeOf<BauwerksmodellId>();
    expectTypeOf<ReturnType<IdQuelle['bauzeitenplan']>>().toEqualTypeOf<BauzeitenplanId>();
    expectTypeOf<ReturnType<IdQuelle['vorgang']>>().toEqualTypeOf<VorgangId>();
    expectTypeOf<ReturnType<IdQuelle['honorarberechnung']>>().toEqualTypeOf<HonorarberechnungId>();
    expectTypeOf<ReturnType<IdQuelle['mangel']>>().toEqualTypeOf<MangelId>();
    expectTypeOf<ReturnType<IdQuelle['bautagebucheintrag']>>().toEqualTypeOf<BautagebucheintragId>();
    // Eine GlobalId kommt aus der Datei, nie aus der IdQuelle.
    expectTypeOf<ReturnType<IdQuelle[keyof IdQuelle]>>().not.toEqualTypeOf<IfcGlobalId>();
  });
});

describe('v1.6 Punkt 9: Beispiele für jeden neuen Befehl; reine Daten; Werte vor v1.6', () => {
  it('jeder neue Befehl hat ein Beispiel, und jedes Beispiel ist ein Befehl', () => {
    const beispiele: readonly Befehl[] = [
      beispielBauwerksmodellAnlegen,
      beispielBauwerksmodellUmbenennen,
      beispielBauwerksmodellLoeschen,
      beispielBauteileZuordnen,
      ...beispielBauzeitenplanbefehle,
      beispielVorgangSetzen,
      beispielVorgangEntfernen,
      ...beispielHonorarbefehle,
      ...beispielMangelbefehle,
      beispielMangelstatusSetzen,
      ...beispielBautagebuchbefehle,
    ];
    type Neu =
      | BauwerksmodellBefehl['art']
      | BauzeitenplanBefehl['art']
      | HonorarberechnungBefehl['art']
      | MangelBefehl['art']
      | BautagebucheintragBefehl['art']
      | 'BauteileZuordnen';
    const alle: Record<Neu, true> = {
      BauwerksmodellAnlegen: true,
      BauwerksmodellUmbenennen: true,
      BauwerksmodellLoeschen: true,
      BauteileZuordnen: true,
      BauzeitenplanAnlegen: true,
      BauzeitenplankopfSetzen: true,
      VorgangSetzen: true,
      VorgangEntfernen: true,
      BauzeitenplanLoeschen: true,
      HonorarberechnungAnlegen: true,
      HonorarberechnungSetzen: true,
      HonorarberechnungLoeschen: true,
      MangelAnlegen: true,
      MangelangabenSetzen: true,
      MangelstatusSetzen: true,
      MangelLoeschen: true,
      BautagebucheintragSetzen: true,
      BautagebucheintragLoeschen: true,
    };
    expect(new Set(beispiele.map((b) => b.art))).toEqual(new Set(Object.keys(alle)));
  });

  it('jedes neue ChangeSet hat ein Beispiel', () => {
    const beispiele: readonly ChangeSet[] = [
      beispielChangeSetBauwerksmodellAnlegen,
      beispielChangeSetVorgangEntfernen,
      beispielChangeSetHonorarberechnungSetzen,
      beispielChangeSetMangelstatus,
      beispielChangeSetBautagebucheintrag,
    ];
    expect(new Set(beispiele.map((c) => c.art))).toEqual(
      new Set(['bauwerksmodell', 'bauzeitenplan', 'honorarberechnung', 'mangel', 'bautagebucheintrag']),
    );
  });

  it('NurDaten deckt die neuen Typen ab (die Bytes der Modelldateien stehen in keinem davon)', () => {
    expectTypeOf<NurDaten<Befehl>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<ChangeSet>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<Protokolleintrag>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<Projektdatei>>().toEqualTypeOf<true>();
    expectTypeOf<NurDaten<Pruefbefund>>().toEqualTypeOf<true>();
  });

  it('JSON-Rundweg: die neuen Beispiele überstehen JSON unverändert (Protokoll und Projektdatei, G-56)', () => {
    for (const x of [
      beispielProjektdateiV16,
      beispielBauzeitenplanergebnis,
      beispielHonorarergebnis,
      beispielBefundeV16,
    ])
      expect(JSON.parse(JSON.stringify(x))).toEqual(x);
  });

  it('Werte vor v1.6 bleiben gültig: v1.6 ist additiv (bis auf die geschlossenen Listen, siehe Comments)', () => {
    const p = alsPosition(beispielLv.knoten.find((k) => k.art === 'position'));
    expect(p).not.toHaveProperty('bauteile');
    const datei: Projektdatei = beispielProjektdateiV14;
    expect(datei).not.toHaveProperty('modelldateien');
    const ort: Befundort = { pfad: '/GAEB/Award/BoQ/BoQBody', zeile: 12 };
    expect(ort).not.toHaveProperty('globalId');
    expectTypeOf<KostengruppeSetzen>().toEqualTypeOf<{
      readonly art: 'KostengruppeSetzen';
      readonly positionId: PositionId;
      readonly kostengruppe: Kostengruppennummer | null;
    }>();
  });
});

describe('v1.6 Nachtrag Review (D-66): Lesarten und additive Felder', () => {
  it('MUSS 1: der Hinweis auf DIN 276 (Fassung 2008-12) ist kein Teil des Honorarergebnisses', () => {
    expectTypeOf<Honorarergebnis>().not.toHaveProperty('hinweise');
    expect(beispielHonorarergebnis.befunde).toEqual([]);
  });

  it('SOLL 6: das Muster der GlobalId ist eine Konstante des Vertrags ohne Zustand', () => {
    expect(IFC_GLOBALID_MUSTER.flags).not.toContain('g');
    for (const id of Object.values(beispielGlobalIds)) expect(IFC_GLOBALID_MUSTER.test(id)).toBe(true);
    for (const falsch of ['', '1Wand$Aussen_EG_00000', '1Wand$Aussen_EG_0000001', '1Wand-Aussen_EG_000001'])
      expect(IFC_GLOBALID_MUSTER.test(falsch)).toBe(false);
  });

  it('SOLL 7: ein Befund zu einer Anordnungsbeziehung nennt sie über den Pfad im Plan', () => {
    const b = beispielBefundeV16.find((x) => x.quelle === 'terminrechnung');
    const m = /^\/vorgaenge\[([1-9][0-9]*)\]\/vorgaenger\[([1-9][0-9]*)\]$/.exec(b?.ort.pfad ?? '');
    const vorgang = beispielBauzeitenplan.vorgaenge[Number(m?.[1]) - 1];
    expect(vorgang?.id).toBe(b?.ort.vorgangId);
    expect(vorgang?.vorgaenger[Number(m?.[2]) - 1]).toBeDefined();
  });

  it('SOLL 10: die Frist einer Mängelanzeige steht am Eintrag `angezeigt` (additiv; ältere Einträge ohne bleiben gültig)', () => {
    expectTypeOf<Mangelverlaufseintrag['frist']>().toEqualTypeOf<string | undefined>();
    for (const m of [beispielMangel1, beispielMangel2])
      for (const e of m.verlauf) if (e.frist !== undefined) expect(e.status).toBe('angezeigt');
    const alt: Mangelverlaufseintrag = { status: 'offen', datum: '2026-11-20', bemerkung: null };
    expect(alt).not.toHaveProperty('frist');
    // Die geltende Frist bleibt am Mangel; die der letzten Anzeige ist bei Mangel 1 dieselbe.
    expect(beispielMangel1.verlauf.at(-1)?.frist).toBe(beispielMangel1.frist);
  });
});
