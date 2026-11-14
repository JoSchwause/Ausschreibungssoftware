// SPDX-License-Identifier: AGPL-3.0-or-later
// Typtests für `vertrag` v1.7c (Ticket 160; E8, D-96): „Projekt samt Inhalt löschen“, der Projektbestand und sein ChangeSet.
// Wie `vertrag-v17a.test.ts`: die Typen prüft der Typprüfer, vitest prüft Konstanten und Beispiele zur Laufzeit.

import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  Aenderung,
  AggregatBezug,
  Befehl,
  Befehlsfehler,
  Befehlskurzfassung,
  ChangeSet,
  Ergebnis,
  LvStand,
  Massenbefehlsart,
  Massenbefehlskopf,
  Projekt,
  ProjektBefehl,
  ProjektBefehlAusfuehren,
  ProjektChangeSet,
  ProjektId,
  ProjektLoeschen,
  ProjektSamtInhaltLoeschen,
  ProjektSamtInhaltLoeschenAusfuehren,
  Projektbestand,
  ProjektbestandChangeSet,
  ProjektbestandChangeSetUmkehren,
  Projektdatei,
  Protokolleintrag,
} from './index';
import { MASSENBEFEHLSARTEN } from './index';
import {
  beispielChangeSetProjektSamtInhaltLoeschen,
  beispielChangeSetProjektSamtInhaltLoeschenUmgekehrt,
  beispielLvStand,
  beispielProjektSamtInhaltLoeschen,
  beispielProjektbestand,
  beispielProjektdateiV16,
} from './beispiele';

describe('v1.7c: Projekt samt Inhalt löschen (D-96)', () => {
  it('neuer Befehl ohne Felder in ProjektBefehl; ProjektLoeschen bleibt unverändert', () => {
    expectTypeOf<ProjektSamtInhaltLoeschen>().toEqualTypeOf<{ readonly art: 'ProjektSamtInhaltLoeschen' }>();
    expectTypeOf<ProjektSamtInhaltLoeschen>().toExtend<ProjektBefehl>();
    expectTypeOf<ProjektSamtInhaltLoeschen>().toExtend<Befehl>();
    expectTypeOf<ProjektLoeschen>().toEqualTypeOf<{ readonly art: 'ProjektLoeschen' }>();
    expect(beispielProjektSamtInhaltLoeschen).toEqual({ art: 'ProjektSamtInhaltLoeschen' });
  });

  it('Massenbefehl (E-13, D-96): der Kopf ist der Befehl selbst, der Bestand steht nie im Protokoll', () => {
    expect(MASSENBEFEHLSARTEN).toContain('ProjektSamtInhaltLoeschen');
    expectTypeOf<'ProjektSamtInhaltLoeschen'>().toExtend<Massenbefehlsart>();
    expectTypeOf<'ProjektLoeschen'>().not.toExtend<Massenbefehlsart>();
    expectTypeOf<Extract<Massenbefehlskopf, { art: 'ProjektSamtInhaltLoeschen' }>>().toEqualTypeOf<{
      readonly art: 'ProjektSamtInhaltLoeschen';
    }>();
    const kurz: Befehlskurzfassung = {
      art: 'Befehlskurzfassung',
      kopf: { art: 'ProjektSamtInhaltLoeschen' },
      pruefsumme: { algorithmus: 'sha-256', wert: '0'.repeat(64) },
    };
    expectTypeOf(kurz).toExtend<Protokolleintrag['befehl']>();
  });
});

describe('v1.7c: Projektbestand in der Form der Projektdatei (Schema 7)', () => {
  type Ohne = 'schemaVersion' | 'projekt' | 'modelldateien' | 'einstellungen';

  it('alles aus der Projektdatei außer Schemaversion, Projekt, Modell-Bytes und Einstellungen', () => {
    expectTypeOf<Projektbestand>().toEqualTypeOf<Omit<Projektdatei, Ohne>>();
    expectTypeOf<keyof Projektbestand>().toEqualTypeOf<Exclude<keyof Projektdatei, Ohne>>();
    for (const feld of ['schemaVersion', 'projekt', 'modelldateien', 'einstellungen'])
      expect(beispielProjektbestand).not.toHaveProperty(feld);
  });

  it('trägt LV-Stände, das Befehlsprotokoll und die Modellverweise (D-96 geprüft)', () => {
    expectTypeOf<Projektbestand['lvStaende']>().toEqualTypeOf<readonly LvStand[] | undefined>();
    expectTypeOf<Projektbestand['protokoll']>().toEqualTypeOf<readonly Protokolleintrag[]>();
    expectTypeOf<Projektbestand['bauwerksmodelle']>().toEqualTypeOf<Projektdatei['bauwerksmodelle']>();
    expect(beispielProjektbestand.lvStaende).toEqual([beispielLvStand]);
    expect(beispielProjektbestand.protokoll.length).toBeGreaterThan(0);
    // Modellverweis: das Modell nennt den Hash seiner Datei; die Bytes liegen in der Ablage, nicht im Bestand.
    const hash = beispielProjektbestand.bauwerksmodelle?.[0]?.bauwerksmodell.datei.hash;
    expect(hash).toBe(beispielProjektdateiV16.modelldateien?.[0]?.hash);
  });

  it('Bestand und Projekt ergeben zusammen die Projektdatei ohne Modell-Bytes und Einstellungen', () => {
    const { schemaVersion, projekt, modelldateien, ...rest } = beispielProjektdateiV16;
    expect(schemaVersion).toBe(6);
    expect(modelldateien).toHaveLength(1);
    expect(beispielChangeSetProjektSamtInhaltLoeschen.projekt.vorher).toEqual(projekt);
    expect(beispielProjektbestand).toEqual({
      ...rest,
      leistungsverzeichnisse: [beispielLvStand.zustand],
      lvStaende: [beispielLvStand],
    });
  });
});

describe('v1.7c: ChangeSet „projektbestand“', () => {
  it('Form: Projekt und Bestand je vorher und nachher, mit der Kennung des Projekts', () => {
    expectTypeOf<ProjektbestandChangeSet>().toEqualTypeOf<{
      readonly art: 'projektbestand';
      readonly projektId: ProjektId;
      readonly projekt: Aenderung<Projekt>;
      readonly bestand: Aenderung<Projektbestand>;
    }>();
    expectTypeOf<ProjektbestandChangeSet>().toExtend<ChangeSet>();
    expectTypeOf<Extract<ChangeSet, { art: 'projektbestand' }>>().toEqualTypeOf<ProjektbestandChangeSet>();
  });

  it('kein Aggregat: im Protokoll steht der Befehl mit dem Projekt als Aggregat', () => {
    expectTypeOf<'projektbestand'>().not.toExtend<AggregatBezug['art']>();
    expectTypeOf<Exclude<ChangeSet['art'], AggregatBezug['art']>>().toEqualTypeOf<'projektbestand'>();
  });

  it('Löschen: beide Seiten nachher null; die Umkehrung tauscht beide (Undo legt alles mit denselben Kennungen an)', () => {
    const cs = beispielChangeSetProjektSamtInhaltLoeschen;
    expect(cs.projekt.nachher).toBeNull();
    expect(cs.bestand.nachher).toBeNull();
    expect(cs.bestand.vorher).toBe(beispielProjektbestand);
    expect(cs.projektId).toBe(cs.projekt.vorher?.id);
    const um = beispielChangeSetProjektSamtInhaltLoeschenUmgekehrt;
    expect(um.projekt).toEqual({ vorher: null, nachher: cs.projekt.vorher });
    expect(um.bestand).toEqual({ vorher: null, nachher: cs.bestand.vorher });
  });

  it('Signaturen: eigener Ausführer mit dem Bestand als Pflichtparameter, Umkehren; der allgemeine bleibt', () => {
    expectTypeOf<ProjektSamtInhaltLoeschenAusfuehren>().toEqualTypeOf<
      (
        zustand: Projekt | null,
        befehl: ProjektSamtInhaltLoeschen,
        bestand: Projektbestand,
      ) => Ergebnis<ProjektbestandChangeSet, Befehlsfehler>
    >();
    expectTypeOf<ProjektbestandChangeSetUmkehren>().toEqualTypeOf<
      (changeSet: ProjektbestandChangeSet) => ProjektbestandChangeSet
    >();
    expectTypeOf<ReturnType<ProjektBefehlAusfuehren>>().toEqualTypeOf<
      Ergebnis<ProjektChangeSet, Befehlsfehler>
    >();
  });
});
