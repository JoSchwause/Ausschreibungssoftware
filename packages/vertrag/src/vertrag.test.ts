// SPDX-License-Identifier: AGPL-3.0-or-later
// Typtests für `vertrag` (Ticket 02). Sie laufen im Typprüfer (`pnpm typecheck`); zur Laufzeit prüft vitest
// nur die Konstantentabelle und die Beispiele.

import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  NACHKOMMASTELLEN,
  type Angebotsposition,
  type Befehl,
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
} from './index';
import { beispielBefehl, beispielChangeSet, beispielLv } from './beispiele';

/** `true`, wenn T nur aus Daten besteht: keine Funktion, kein Date, alles verschachtelt gleich. */
type NurDaten<T> = T extends string | number | boolean | null | undefined
  ? true
  : T extends (...args: never[]) => unknown
    ? false
    : T extends Date
      ? false
      : T extends readonly (infer U)[]
        ? NurDaten<U>
        : T extends object
          ? { [K in keyof T]-?: NurDaten<T[K]> }[keyof T]
          : false;

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
    expectTypeOf<Protokolleintrag['befehl']>().toEqualTypeOf<Befehl>();
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
