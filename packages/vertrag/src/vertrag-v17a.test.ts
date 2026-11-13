// SPDX-License-Identifier: AGPL-3.0-or-later
// Typtests für `vertrag` v1.7a (Ticket 127): Bedienung (E8), Kalkulationsangaben (E9), Stammdaten (E10), Einstellungen
// (E15), Herkunftsformat (E6) und die Konstanten aus Ticket 123. Wie `vertrag.test.ts`: die Typen prüft der Typprüfer,
// vitest prüft Konstanten und Beispiele zur Laufzeit.

import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  AuftragsLvBefehl,
  AuftragsLvBefehlAusfuehren,
  AuftragsLvChangeSet,
  AuftragsLvZustand,
  Befehl,
  Befehlsfehler,
  Befehlsfehlercode,
  BieterId,
  Ergebnis,
  LvBefehl,
  LvChangeSet,
  LvStand,
  LvStandBefehl,
  LvStandBefehlAusfuehren,
  LvStandId,
  LvStandInhalt,
  Projekt,
  ProjektBefehl,
  ProjektBefehlAusfuehren,
  ProjektChangeSet,
  Verweisanzahl,
  Verweisart,
} from './index';
import {
  beispielChangeSetLvStandLoeschen,
  beispielChangeSetLvStandUmbenennen,
  beispielFehlerZuschlagZuruecknehmen,
  beispieleV17aE8,
} from './beispiele';

describe('v1.7a E8: neue Befehle für die Bedienung', () => {
  it('LV-Stand umbenennen und löschen: eigene Befehlsgruppe, Ausführer mit dem ganzen Stand, ChangeSet am LV', () => {
    expectTypeOf<LvStandBefehl['art']>().toEqualTypeOf<'LvStandUmbenennen' | 'LvStandLoeschen'>();
    expectTypeOf<Extract<LvStandBefehl, { art: 'LvStandUmbenennen' }>>().toEqualTypeOf<{
      readonly art: 'LvStandUmbenennen';
      readonly lvStandId: LvStandId;
      readonly name: string;
    }>();
    expectTypeOf<LvStandBefehlAusfuehren>().toEqualTypeOf<
      (stand: LvStand, befehl: LvStandBefehl) => Ergebnis<LvChangeSet, Befehlsfehler>
    >();
    // nicht im LvBefehl: der Kern des LV sieht keine Stände
    expectTypeOf<Extract<LvBefehl['art'], LvStandBefehl['art']>>().toEqualTypeOf<never>();
    expectTypeOf<LvStandBefehl>().toExtend<Befehl>();
    expectTypeOf<LvStandInhalt>().toEqualTypeOf<Pick<LvStand, 'angelegt' | 'zustand'>>();
  });

  it('Löschen trägt den ganzen Stand (Undo stellt ihn wieder her), Umbenennen nur den Kopf', () => {
    const l = beispielChangeSetLvStandLoeschen;
    expect(l.lvStand?.nachher).toBeNull();
    expect(l.lvStandInhalt?.nachher).toBeNull();
    expect(l.lvStandInhalt?.vorher?.zustand.leistungsverzeichnis.id).toBe(l.leistungsverzeichnisId);
    const u = beispielChangeSetLvStandUmbenennen;
    expect(u).not.toHaveProperty('lvStandInhalt');
    expect(u.lvStand?.vorher?.id).toBe(u.lvStand?.nachher?.id);
    expect(u.lvStand?.vorher?.name).not.toBe(u.lvStand?.nachher?.name);
  });

  it('Bieter umbenennen und löschen sind Projektbefehle; Verweise als optionaler dritter Parameter', () => {
    expectTypeOf<'BieterUmbenennen' | 'BieterLoeschen'>().toExtend<ProjektBefehl['art']>();
    expectTypeOf<Extract<ProjektBefehl, { art: 'BieterLoeschen' }>>().toEqualTypeOf<{
      readonly art: 'BieterLoeschen';
      readonly bieterId: BieterId;
    }>();
    expectTypeOf<ProjektBefehlAusfuehren>().toEqualTypeOf<
      (
        zustand: Projekt | null,
        befehl: ProjektBefehl,
        verweise?: readonly Verweisanzahl[],
      ) => Ergebnis<ProjektChangeSet, Befehlsfehler>
    >();
    // ein Ausführer mit zwei Parametern (der Kern bis Ticket 137) bleibt zuweisbar
    expectTypeOf<
      (z: Projekt | null, b: ProjektBefehl) => Ergebnis<ProjektChangeSet, Befehlsfehler>
    >().toExtend<ProjektBefehlAusfuehren>();
  });

  it('Zuschlag zurücknehmen ist ein Befehl am Auftrags-LV; Sperre mit Art und Anzahl (D-74)', () => {
    expectTypeOf<Extract<AuftragsLvBefehl, { art: 'ZuschlagZuruecknehmen' }>>().toEqualTypeOf<{
      readonly art: 'ZuschlagZuruecknehmen';
    }>();
    expectTypeOf<AuftragsLvBefehlAusfuehren>().toEqualTypeOf<
      (
        zustand: AuftragsLvZustand | null,
        befehl: AuftragsLvBefehl,
        verweise?: readonly Verweisanzahl[],
      ) => Ergebnis<AuftragsLvChangeSet, Befehlsfehler>
    >();
    expectTypeOf<Verweisart>().toEqualTypeOf<'angebot' | 'nachtrag' | 'aufmass' | 'rechnung' | 'mangel'>();
    expectTypeOf<'verweise-vorhanden'>().toExtend<Befehlsfehlercode>();
    expectTypeOf<Befehlsfehler['verweise']>().toEqualTypeOf<readonly Verweisanzahl[] | undefined>();
    const f = beispielFehlerZuschlagZuruecknehmen;
    expect(f.code).toBe('verweise-vorhanden');
    expect(f.verweise).toEqual([
      { art: 'aufmass', anzahl: 2 },
      { art: 'rechnung', anzahl: 1 },
    ]);
  });

  it('jeder neue Befehl hat ein Beispiel, und jedes Beispiel ist ein Befehl', () => {
    const alle: Record<
      LvStandBefehl['art'] | 'BieterUmbenennen' | 'BieterLoeschen' | 'ZuschlagZuruecknehmen',
      true
    > = {
      LvStandUmbenennen: true,
      LvStandLoeschen: true,
      BieterUmbenennen: true,
      BieterLoeschen: true,
      ZuschlagZuruecknehmen: true,
    };
    const beispiele: readonly Befehl[] = beispieleV17aE8;
    expect(new Set(beispiele.map((b) => b.art))).toEqual(new Set(Object.keys(alle)));
    for (const b of beispiele) expect(JSON.parse(JSON.stringify(b))).toEqual(b);
  });
});
