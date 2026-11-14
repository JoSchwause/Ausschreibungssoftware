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
  // E9
  Einheitspreis,
  Einheitspreisanteile,
  EpaArt,
  KalkulationSetzen,
  Kalkulationsangaben,
  Kalkulationsansatz,
  Kalkulationszuschlagssaetze,
  Menge,
  PositionId,
  Positionsdaten,
  Prozent,
  // E10
  Anschrift,
  Bauherr,
  Bieter,
  Bieterangaben,
  BieterangabenSetzen,
  Buero,
  ProjektId,
  Projektangaben,
  ProjektangabenSetzen,
  // E15
  AbcBezug,
  AuftragsLvKopf,
  LvInhaltKopf,
  LvKopf,
  PreisspiegelEinstellungen,
  PreisspiegelEinstellungenSetzen,
  // E15 Einstellungen
  ChangeSet,
  Druckprofil,
  Einstellungen,
  EinstellungenBefehl,
  EinstellungenBefehlAusfuehren,
  EinstellungenChangeSet,
  EinstellungenRepository,
  IdQuelle,
  Kostengruppenbezeichnung,
  Kostengruppennummer,
  LangtextUmfang,
  Projektdatei,
  ProjektdateiEinleseoptionen,
  ProjektdateiEinleseergebnis,
  Einstellungsschluessel,
  Speicher,
  Speicherfehler,
  KnotenId,
  // Nachtrag D-82
  Befehlshinweiscode,
  EinstellungenChangeSetUmkehren,
  EinstellungenProtokolleintrag,
  HistorienBefehl,
  NutzerId,
  ProtokollId,
  Zeitstempel,
  // E6, Ticket 123
  Bauteilmenge,
  Bauteilmengenart,
  GaebExport,
  GaebFormat,
  GaebLesung,
  GaebPhase,
  GaebVersion,
  IfcSchema,
  Kalenderdatum,
  Strukturknoten,
} from './index';
import {
  BAUTEILMENGENARTEN,
  IFC_SCHEMATA,
  KALENDERDATUM_MUSTER,
  KOSTENGRUPPENNUMMER_MUSTER,
  LEERE_EINSTELLUNGEN,
  MENGENART_STUECK,
  MODELLDATEI_HASH_MUSTER,
  STRUKTURKNOTENARTEN,
} from './index';
import {
  beispielBieterangabenSetzen,
  beispielChangeSetBueroSetzen,
  beispielChangeSetBueroSetzenUmgekehrt,
  beispielEinstellungenUebernehmen,
  beispielEinstellungsprotokoll,
  beispielHinweisKalkulationEntfernt,
  beispielChangeSetLvStandLoeschen,
  beispielChangeSetLvStandUmbenennen,
  beispielFehlerZuschlagZuruecknehmen,
  beispielKalkulationSetzen,
  beispielPreisspiegelEinstellungenSetzen,
  beispielProjektangabenSetzen,
  beispielProjektdateiV17a,
  beispielProjektMitAngaben,
  beispieleEinstellungenbefehle,
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
    // additiv für Fehler über mehrere Knoten (OZ-Maske, Ticket 137)
    expectTypeOf<Befehlsfehler['knotenIds']>().toEqualTypeOf<readonly KnotenId[] | undefined>();
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

describe('v1.7a E9: Kalkulationsangaben an der Position', () => {
  it('Form wie die Rechnung in `kosten`: Ansätze und Zuschlagssätze je Kostenart, nur Dezimaltypen (N1)', () => {
    expectTypeOf<Kalkulationsansatz>().toEqualTypeOf<{
      readonly art: EpaArt;
      readonly bezeichnung: string;
      readonly ansatzmenge: Menge | null;
      readonly kostensatz: Einheitspreis | null;
    }>();
    expectTypeOf<Kalkulationszuschlagssaetze>().toEqualTypeOf<Readonly<Partial<Record<EpaArt, Prozent>>>>();
    expectTypeOf<Kalkulationsangaben>().toEqualTypeOf<{
      readonly ansaetze: readonly Kalkulationsansatz[];
      readonly zuschlagssaetze: Kalkulationszuschlagssaetze;
    }>();
    expectTypeOf<Positionsdaten['kalkulation']>().toEqualTypeOf<Kalkulationsangaben | undefined>();
  });

  it('KalkulationSetzen trägt Angaben, EP und EPA zusammen (wie MengenansatzSetzen); nur im LV', () => {
    expectTypeOf<KalkulationSetzen>().toEqualTypeOf<{
      readonly art: 'KalkulationSetzen';
      readonly positionId: PositionId;
      readonly kalkulation: Kalkulationsangaben | null;
      readonly einheitspreis: Einheitspreis | null;
      readonly epa: Einheitspreisanteile | null;
    }>();
    expectTypeOf<KalkulationSetzen>().toExtend<LvBefehl>();
    expectTypeOf<Extract<AuftragsLvBefehl['art'], 'KalkulationSetzen'>>().toEqualTypeOf<never>();
    const b = beispielKalkulationSetzen;
    expect(b.kalkulation?.ansaetze.map((a) => a.art)).toEqual(['lohn', 'stoffe']);
    expect(JSON.parse(JSON.stringify(b))).toEqual(b);
  });

  it('Nachtrag D-82 S4: ein Befehl, der die Kalkulation entfernt, meldet es mit einem Hinweis an der Position', () => {
    expectTypeOf<'kalkulation-entfernt'>().toExtend<Befehlshinweiscode>();
    const h = beispielHinweisKalkulationEntfernt;
    expect(h).toMatchObject({ code: 'kalkulation-entfernt', knotenId: beispielKalkulationSetzen.positionId });
  });
});

describe('v1.7a E10: Stammdaten von Projekt, Bieter und Büro', () => {
  it('Anschrift in Teilen wie Auftraggeber und Auftragnehmer; Projektangaben und Bieterangaben als optionale Blöcke', () => {
    expectTypeOf<Anschrift>().toEqualTypeOf<{
      readonly strasse: string | null;
      readonly plz: string | null;
      readonly ort: string | null;
    }>();
    expectTypeOf<Projektangaben>().toEqualTypeOf<{
      readonly nummer: string | null;
      readonly ort: string | null;
      readonly baustelle: Anschrift | null;
    }>();
    expectTypeOf<Projekt['angaben']>().toEqualTypeOf<Projektangaben | undefined>();
    expectTypeOf<Bieterangaben>().toEqualTypeOf<{
      readonly anschrift: Anschrift | null;
      readonly ansprechperson: string | null;
      readonly email: string | null;
      readonly telefon: string | null;
    }>();
    expectTypeOf<Bieter['angaben']>().toEqualTypeOf<Bieterangaben | undefined>();
    expectTypeOf<Buero>().toEqualTypeOf<{
      readonly name: string;
      readonly anschrift: Anschrift | null;
      readonly telefon: string | null;
      readonly email: string | null;
    }>();
  });

  it('ProjektangabenSetzen setzt Name, Bauherr und Angaben in einem Befehl; Bieterangaben eigener Befehl', () => {
    expectTypeOf<ProjektangabenSetzen>().toEqualTypeOf<{
      readonly art: 'ProjektangabenSetzen';
      readonly name: string;
      readonly bauherr: Bauherr;
      readonly angaben: Projektangaben | null;
    }>();
    expectTypeOf<BieterangabenSetzen>().toEqualTypeOf<{
      readonly art: 'BieterangabenSetzen';
      readonly bieterId: BieterId;
      readonly angaben: Bieterangaben | null;
    }>();
    expectTypeOf<ProjektangabenSetzen | BieterangabenSetzen>().toExtend<ProjektBefehl>();
    // ältere Projekte und Bieter (ohne Angaben) bleiben gültig
    const alt: Projekt = {
      id: '1' as ProjektId,
      name: 'A',
      bauherr: { name: 'B', anschrift: null },
      bieter: [],
    };
    expect(alt).not.toHaveProperty('angaben');
    expect(beispielProjektMitAngaben.angaben?.baustelle?.ort).toBe('Musterstadt');
  });
});

describe('v1.7a E15: Preisspiegel-Einstellungen am LV', () => {
  it('Form wie in `vergabe`; optional am LvKopf (nicht am Auftrags-LV, nicht aus GAEB); ein LV-Befehl', () => {
    expectTypeOf<PreisspiegelEinstellungen>().toEqualTypeOf<{
      readonly ausreisserSchwelle: Prozent;
      readonly abcSchwelleA: Prozent;
      readonly abcSchwelleB: Prozent;
      readonly abcBezug: AbcBezug;
    }>();
    expectTypeOf<AbcBezug>().toEqualTypeOf<'mittel' | 'schaetzpreis'>();
    expectTypeOf<LvKopf['preisspiegel']>().toEqualTypeOf<PreisspiegelEinstellungen | undefined>();
    expectTypeOf<'preisspiegel'>().not.toExtend<keyof LvInhaltKopf>();
    expectTypeOf<'preisspiegel'>().not.toExtend<keyof AuftragsLvKopf>();
    expectTypeOf<PreisspiegelEinstellungenSetzen>().toEqualTypeOf<{
      readonly art: 'PreisspiegelEinstellungenSetzen';
      readonly einstellungen: PreisspiegelEinstellungen | null;
    }>();
    expectTypeOf<PreisspiegelEinstellungenSetzen>().toExtend<LvBefehl>();
  });
});

describe('v1.7a E15: Einstellungen als globales Aggregat (D-73)', () => {
  it('Büro, eigene Druckprofile (Form wie `ausgabe`), Kostengruppenbezeichnungen; leer als Konstante', () => {
    expectTypeOf<Einstellungen>().toEqualTypeOf<{
      readonly buero: Buero | null;
      readonly druckprofile: readonly Druckprofil[];
      readonly kostengruppenbezeichnungen: readonly Kostengruppenbezeichnung[];
    }>();
    expectTypeOf<Kostengruppenbezeichnung>().toEqualTypeOf<{
      readonly nummer: Kostengruppennummer;
      readonly bezeichnung: string;
    }>();
    expectTypeOf<Druckprofil['langtext']>().toEqualTypeOf<LangtextUmfang>();
    expect(LEERE_EINSTELLUNGEN).toEqual({ buero: null, druckprofile: [], kostengruppenbezeichnungen: [] });
  });

  it('Befehle außerhalb des Projektprotokolls: nicht in `Befehl`, ChangeSet nicht in `ChangeSet`', () => {
    expectTypeOf<EinstellungenBefehl['art']>().toEqualTypeOf<
      | 'BueroSetzen'
      | 'DruckprofilSetzen'
      | 'DruckprofilEntfernen'
      | 'KostengruppenbezeichnungenSetzen'
      | 'EinstellungenUebernehmen'
    >();
    expectTypeOf<Extract<Befehl['art'], EinstellungenBefehl['art']>>().toEqualTypeOf<never>();
    expectTypeOf<Extract<ChangeSet['art'], 'einstellungen'>>().toEqualTypeOf<never>();
    expectTypeOf<EinstellungenBefehlAusfuehren>().toEqualTypeOf<
      (zustand: Einstellungen, befehl: EinstellungenBefehl) => Ergebnis<EinstellungenChangeSet, Befehlsfehler>
    >();
    expectTypeOf<EinstellungenChangeSetUmkehren>().toEqualTypeOf<
      (changeSet: EinstellungenChangeSet) => EinstellungenChangeSet
    >();
    const alle: Record<EinstellungenBefehl['art'], true> = {
      BueroSetzen: true,
      DruckprofilSetzen: true,
      DruckprofilEntfernen: true,
      KostengruppenbezeichnungenSetzen: true,
      EinstellungenUebernehmen: true,
    };
    expect(new Set(beispieleEinstellungenbefehle.map((b) => b.art))).toEqual(new Set(Object.keys(alle)));
    expect(beispielChangeSetBueroSetzen.einstellungen.vorher).toEqual(LEERE_EINSTELLUNGEN);
  });

  it('Nachtrag D-82 M1: jeder Befehl an den Einstellungen steht im Einstellungsprotokoll, auch das Rückgängig', () => {
    expectTypeOf<EinstellungenProtokolleintrag>().toEqualTypeOf<{
      readonly id: ProtokollId;
      readonly wer: NutzerId;
      readonly wann: Zeitstempel;
      readonly befehl: EinstellungenBefehl | HistorienBefehl;
    }>();
    expectTypeOf<EinstellungenRepository['anwenden']>().toEqualTypeOf<
      (
        eintrag: EinstellungenProtokolleintrag,
        changeSet: EinstellungenChangeSet,
      ) => Promise<Ergebnis<void, Speicherfehler>>
    >();
    expectTypeOf<EinstellungenRepository['protokoll']>().toEqualTypeOf<
      () => Promise<Ergebnis<readonly EinstellungenProtokolleintrag[], Speicherfehler>>
    >();
    // kein Projekt, kein Aggregat: das Einstellungsprotokoll gehört zum Gerät
    expectTypeOf<'projektId' | 'aggregat'>().not.toExtend<keyof EinstellungenProtokolleintrag>();
    const [setzen, rueckgaengig] = beispielEinstellungsprotokoll;
    expect(rueckgaengig.befehl).toEqual({ art: 'Rueckgaengig', protokollId: setzen.id });
    for (const e of beispielEinstellungsprotokoll) expect(JSON.parse(JSON.stringify(e))).toEqual(e);
    // die Umkehrung ist das getauschte ChangeSet
    const cs = beispielChangeSetBueroSetzen.einstellungen;
    expect(beispielChangeSetBueroSetzenUmgekehrt.einstellungen).toEqual({
      vorher: cs.nachher,
      nachher: cs.vorher,
    });
  });

  it('eigenes Repository (optional am Speicher), Block in der Projektdatei, Einlesen als Kopie', () => {
    expectTypeOf<Speicher['einstellungen']>().toEqualTypeOf<EinstellungenRepository | undefined>();
    expectTypeOf<Projektdatei['einstellungen']>().toEqualTypeOf<Einstellungen | undefined>();
    // `projektdateiImportieren` bleibt unverändert; neu und optional: Einlesen mit Optionen und Bericht (D-73)
    expectTypeOf<Parameters<Speicher['projektdateiImportieren']>>().toEqualTypeOf<[inhalt: string]>();
    expectTypeOf<NonNullable<Speicher['projektdateiEinlesen']>>().toEqualTypeOf<
      (
        inhalt: string,
        optionen?: ProjektdateiEinleseoptionen,
      ) => Promise<Ergebnis<ProjektdateiEinleseergebnis, Speicherfehler>>
    >();
    expectTypeOf<Einstellungsschluessel['art']>().toEqualTypeOf<
      'buero' | 'druckprofil' | 'kostengruppenbezeichnung'
    >();
    const bericht: ProjektdateiEinleseergebnis = {
      projektId: '1' as ProjektId,
      einstellungen: {
        uebernommen: [{ art: 'druckprofil', name: 'Kurz für Bauherr' }],
        belassen: [
          { art: 'buero' },
          { art: 'kostengruppenbezeichnung', nummer: '300' as Kostengruppennummer },
        ],
      },
    };
    expect(JSON.parse(JSON.stringify(bericht))).toEqual(bericht);
    expectTypeOf<ProjektdateiEinleseoptionen['alsKopie']>().toEqualTypeOf<
      { readonly ids: IdQuelle; readonly name: string } | undefined
    >();
    // Nachtrag D-82 M1: die Übernahme der Einstellungen ist ein protokollierter Befehl; der Aufrufer gibt dessen Kopf
    expectTypeOf<ProjektdateiEinleseoptionen['einstellungsuebernahme']>().toEqualTypeOf<
      Pick<EinstellungenProtokolleintrag, 'id' | 'wer' | 'wann'> | undefined
    >();
    expect(beispielEinstellungenUebernehmen.einstellungen).toEqual(beispielProjektdateiV17a.einstellungen);
    const x = beispielProjektdateiV17a;
    expect(JSON.parse(JSON.stringify(x))).toEqual(x);
    // Dateien bis Schema 6 bleiben gültig: kein Block
    const alt: Projektdatei = {
      schemaVersion: 6,
      projekt: x.projekt,
      leistungsverzeichnisse: [],
      angebote: [],
      auftragsLeistungsverzeichnisse: [],
      protokoll: [],
    };
    expect(alt).not.toHaveProperty('einstellungen');
  });
});

describe('v1.7a E6: Herkunftsformat beim Lesen; alle Austauschphasen erkennbar', () => {
  it('Format optional am Leseergebnis (fehlt: DA XML wie bisher), Version nur bei DA XML', () => {
    expectTypeOf<GaebFormat>().toEqualTypeOf<'da-xml' | 'gaeb-90' | 'gaeb-2000'>();
    expectTypeOf<GaebLesung['format']>().toEqualTypeOf<GaebFormat | undefined>();
    expectTypeOf<'X80' | 'X87' | 'X88'>().toExtend<GaebPhase>();
    expectTypeOf<GaebExport['version']>().toEqualTypeOf<GaebVersion>();
    const l: GaebLesung = { phase: 'X83', version: null, format: 'gaeb-90', inhalt: null, befunde: [] };
    expect(l.format).toBe('gaeb-90');
  });
});

describe('v1.7a Ticket 123: Konstanten neben den Typen, gemeinsamer Datumstyp', () => {
  it('Muster der Kostengruppennummer und des Modelldatei-Hashs (ohne Flag g)', () => {
    expect(KOSTENGRUPPENNUMMER_MUSTER.flags).toBe('');
    expect(['100', '330', '999'].every((x) => KOSTENGRUPPENNUMMER_MUSTER.test(x))).toBe(true);
    expect(['099', '1000', '33', '3a0', ' 330'].some((x) => KOSTENGRUPPENNUMMER_MUSTER.test(x))).toBe(false);
    expect(MODELLDATEI_HASH_MUSTER.flags).toBe('');
    expect(MODELLDATEI_HASH_MUSTER.test('0123456789abcdef'.repeat(4))).toBe(true);
    expect(MODELLDATEI_HASH_MUSTER.test('0123456789ABCDEF'.repeat(4))).toBe(false);
    expect(MODELLDATEI_HASH_MUSTER.test('0'.repeat(63))).toBe(false);
  });

  it('Listen der Mengen-, Struktur- und Schemaarten decken genau die Typen ab', () => {
    expectTypeOf<(typeof BAUTEILMENGENARTEN)[number]>().toEqualTypeOf<Bauteilmenge['art']>();
    expectTypeOf<Bauteilmengenart>().toEqualTypeOf<Bauteilmenge['art']>();
    expectTypeOf<(typeof STRUKTURKNOTENARTEN)[number]>().toEqualTypeOf<Strukturknoten['art']>();
    expectTypeOf<(typeof IFC_SCHEMATA)[number]>().toEqualTypeOf<IfcSchema>();
    expect(BAUTEILMENGENARTEN).toEqual(['laenge', 'flaeche', 'volumen', 'anzahl', 'gewicht', 'zeit']);
    expect(STRUKTURKNOTENARTEN).toEqual(['projekt', 'grundstueck', 'gebaeude', 'geschoss', 'raum']);
    expect(IFC_SCHEMATA).toEqual(['IFC2X3', 'IFC4']);
  });

  it('MENGENART_STUECK ist der feste Wert „jedes Bauteil zählt 1“ einer Bauteilzuordnung', () => {
    expect(MENGENART_STUECK).toBe('Stueck');
    expectTypeOf(MENGENART_STUECK).toEqualTypeOf<'Stueck'>();
  });

  it('Kalenderdatum: Marke über Text `JJJJ-MM-TT`; das Muster prüft nur die Form', () => {
    expectTypeOf<Kalenderdatum>().toExtend<string>();
    expectTypeOf<string>().not.toExtend<Kalenderdatum>();
    expect(KALENDERDATUM_MUSTER.flags).toBe('');
    expect(KALENDERDATUM_MUSTER.test('2026-11-13')).toBe(true);
    expect(
      ['2026-1-13', '26-11-13', '2026-11-13T00:00', ' 2026-11-13'].some((x) => KALENDERDATUM_MUSTER.test(x)),
    ).toBe(false);
  });
});

describe('v1.7a: Beispiele für E9, E10, E15 sind Befehle und reine Daten', () => {
  it('jeder neue Projekt- und LV-Befehl hat ein Beispiel', () => {
    const beispiele: readonly Befehl[] = [
      beispielKalkulationSetzen,
      beispielProjektangabenSetzen,
      beispielBieterangabenSetzen,
      beispielPreisspiegelEinstellungenSetzen,
    ];
    for (const b of beispiele) expect(JSON.parse(JSON.stringify(b))).toEqual(b);
    expect(beispiele.map((b) => b.art)).toEqual([
      'KalkulationSetzen',
      'ProjektangabenSetzen',
      'BieterangabenSetzen',
      'PreisspiegelEinstellungenSetzen',
    ]);
  });
});
