// SPDX-License-Identifier: AGPL-3.0-or-later
// Typtests für `vertrag` (Ticket 02). Sie laufen im Typprüfer (`pnpm typecheck`); zur Laufzeit prüft vitest
// nur die Konstantentabelle und die Beispiele.

import { describe, expect, expectTypeOf, it } from 'vitest';
import {
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
    expectTypeOf<AuftragsLvBefehl['art']>().toEqualTypeOf<'AuftragsLeistungsverzeichnisAnlegen'>();
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
    expectTypeOf<EpaBezeichnung['anteil']>().toEqualTypeOf<EpaArt>();
    expectTypeOf<LvInhaltKopf['epaBezeichnungen']>().toEqualTypeOf<readonly EpaBezeichnung[] | undefined>();
  });

  it('Auftragnehmer: optional am gemeinsamen Kopf, also auch am Auftrags-LV; alle Felder nullbar', () => {
    expectTypeOf<LvInhaltKopf['auftragnehmer']>().toEqualTypeOf<Auftragnehmer | undefined>();
    expectTypeOf<AuftragsLvKopf['auftragnehmer']>().toEqualTypeOf<Auftragnehmer | undefined>();
    expectTypeOf<Auftragnehmer[keyof Auftragnehmer]>().toEqualTypeOf<string | null>();
  });

  it('Beispiel: Reihenfolge der Bezeichnungen ist die der Anteile in der Datei, jede Art höchstens einmal', () => {
    const b = beispielLvKopfV13.epaBezeichnungen ?? [];
    expect(b.map((e) => e.anteil)).toEqual(['lohn', 'stoffe', 'nachunternehmer']);
    expect(new Set(b.map((e) => e.anteil)).size).toBe(b.length);
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
