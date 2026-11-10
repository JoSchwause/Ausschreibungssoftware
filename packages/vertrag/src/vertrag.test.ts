// SPDX-License-Identifier: AGPL-3.0-or-later
// Typtests für `vertrag` (Ticket 02). Sie laufen im Typprüfer (`pnpm typecheck`); zur Laufzeit prüft vitest
// nur die Konstantentabelle und die Beispiele.

import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  NACHKOMMASTELLEN,
  type Angebotsposition,
  type Befehl,
  type Befehlskurzfassung,
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
} from './beispiele';

/**
 * Die Teile von T, die keine Daten sind (Funktion, Date …); `never`, wenn T nur aus Daten besteht. Seit v1.1b ist
 * `Langtext` rekursiv (Liste in Tabelle in Liste): Die frühere Fassung über einen abgebildeten Typ meldete dafür einen
 * Zirkelfehler (TS2615), eine unbegrenzte Rekursion über die Werte ebenso (TS2589). Darum läuft die Prüfung bis zur
 * Tiefe `D` (Zahl der Glieder in `Tiefe`) und nimmt darunter „Daten“ an. 14 Ebenen decken jeden Pfad bis in die
 * dritte Schachtelung eines Langtexts ab.
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
 * Vertrag dafür alles trägt; die Umsetzung im Kern ist Sache des Folgetickets. Fehlt `summen.vorher`, ist das
 * ChangeSet nicht ohne Zustand umkehrbar: die Funktion wirft.
 */
function umkehren(cs: LvChangeSet): LvChangeSet {
  const v = cs.summen.vorher;
  if (v === undefined) throw new Error('keine alten Summen im ChangeSet');
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
    expect(neu.summen.positionen).toEqual(beispielChangeSetEntfernen.summen.vorher?.entfernt.positionen);
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

  it('ein ChangeSet ohne `vorher` ist nicht ohne Zustand umkehrbar', () => {
    const { positionen, gliederungen, gesamt } = beispielChangeSet.summen;
    const ohne: LvChangeSet = { ...beispielChangeSet, summen: { positionen, gliederungen, gesamt } };
    expect(() => umkehren(ohne)).toThrow();
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
    expect(beispielLoeschChangeSet.summen.vorher?.entfernt.positionen).toHaveLength(1);
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
    expectTypeOf<GridIdQuelle>().toEqualTypeOf<Pick<IdQuelle, 'position'>>();
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
