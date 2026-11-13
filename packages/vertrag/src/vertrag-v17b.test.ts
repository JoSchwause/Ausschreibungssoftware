// SPDX-License-Identifier: AGPL-3.0-or-later
// Typtests für `vertrag` v1.7b (Ticket 128; A5, D-72): Vertragsstrafe, Skonto, Bauabzugsteuer und Zahlungen an der Rechnung,
// ihre Befehle und der gerechnete Zahlungsstand. Wie `vertrag-v17a.test.ts`: die Typen prüft der Typprüfer, vitest prüft
// Konstanten und Beispiele zur Laufzeit.

import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  AngebotBefehl,
  AufmassBefehl,
  AuftragsLvBefehl,
  Auszahlungsszenario,
  BauabzugsteuerSetzen,
  Befehl,
  Befehlsfehlercode,
  Betrag,
  IdQuelle,
  Kalenderdatum,
  KostenermittlungBefehl,
  LvBefehl,
  ProjektBefehl,
  Prozent,
  Rechnung,
  RechnungBefehl,
  RechnungId,
  Skonto,
  SkontoSetzen,
  Vertragsstrafe,
  VertragsstrafeSetzen,
  Zahlung,
  ZahlungAendern,
  ZahlungErfassen,
  ZahlungId,
  ZahlungLoeschen,
  Zahlungsbefund,
  Zahlungsstand,
} from './index';
import { BAUABZUGSTEUER_SATZ } from './index';
import {
  beispielChangeSetZahlungErfassen,
  beispielFehlerFreigabeAufhebenMitZahlungen,
  beispielRechnung1,
  beispielRechnung2,
  beispielRechnung2MitVertragsstrafe,
  beispielRechnungMitZahlung,
  beispielZahlungsbefunde,
  beispielZahlungsstand,
  beispieleV17b,
} from './beispiele';

/** Ein `Betrag` in Cent (nur hier im Test, N1 gilt in Tests nicht). */
const cent = (b: Betrag): number => Math.round(Number(b) * 100);
/** round(basis × satz / 100, 2) in Cent, kaufmännisch, für Basis ≥ 0 (N2): `satz` als `Prozent` mit 2 Stellen. */
const anteil = (basisCent: number, satz: Prozent): number =>
  Math.floor((basisCent * Math.round(Number(satz) * 100) + 5_000) / 10_000);

describe('v1.7b: Vertragsstrafe, Skonto und Bauabzugsteuer an der Rechnung (D-72)', () => {
  it('Formen: Vertragsstrafe brutto mit Grund, Skonto mit Satz und Frist in Kalendertagen, Satz 15 als Konstante', () => {
    expectTypeOf<Vertragsstrafe>().toEqualTypeOf<{ readonly betrag: Betrag; readonly grund: string }>();
    expectTypeOf<Skonto>().toEqualTypeOf<{ readonly satz: Prozent; readonly fristTage: number }>();
    expectTypeOf(BAUABZUGSTEUER_SATZ).toEqualTypeOf<Prozent>();
    expect(BAUABZUGSTEUER_SATZ).toBe('15.00');
  });

  it('neue Felder optional, „fehlt“ heißt keine bzw. aus (nie null, nie false, nie []); alte Rechnungen gelten (A8)', () => {
    expectTypeOf<Rechnung['vertragsstrafe']>().toEqualTypeOf<Vertragsstrafe | undefined>();
    expectTypeOf<Rechnung['skonto']>().toEqualTypeOf<Skonto | undefined>();
    expectTypeOf<Rechnung['bauabzugsteuer']>().toEqualTypeOf<true | undefined>();
    expectTypeOf<Rechnung['zahlungen']>().toEqualTypeOf<readonly Zahlung[] | undefined>();
    expectTypeOf<{ readonly bauabzugsteuer: false }>().not.toExtend<Pick<Rechnung, 'bauabzugsteuer'>>();
    expectTypeOf<{ readonly skonto: null }>().not.toExtend<Pick<Rechnung, 'skonto'>>();
    for (const r of [beispielRechnung1, beispielRechnung2])
      for (const feld of ['vertragsstrafe', 'skonto', 'bauabzugsteuer', 'zahlungen'])
        expect(r).not.toHaveProperty(feld);
  });

  it('Vertragsstrafe in der Kette: nach den Umlagen, vor dem Einbehalt auf Brutto kumuliert (Herleitung am Beispiel)', () => {
    const r = beispielRechnung2MitVertragsstrafe;
    expect(r.vertragsstrafe?.betrag).toBe('1.00');
    expect(r.vertragsstrafe?.grund).not.toBe('');
    // Rechnung 2 (Herleitung an `beispielRechnung2`): Brutto kumuliert 59,32, Umlage 0,30, Einbehalt 2,97 (Basis bleibt das
    // Brutto kumuliert, nicht Brutto − Vertragsstrafe), frühere Zahlbeträge 53,42; Zahlbetrag 2,63 ohne, 1,63 mit Strafe.
    const brutto = 5_932;
    const umlage = anteil(brutto, '0.50' as Prozent);
    const einbehalt = anteil(brutto, '5.00' as Prozent);
    expect([umlage, einbehalt]).toEqual([30, 297]);
    expect(brutto - umlage - cent(r.vertragsstrafe?.betrag ?? ('0.00' as Betrag)) - einbehalt - 5_342).toBe(163);
  });
});

describe('v1.7b: Zahlungen je Rechnung (D-72, Q5)', () => {
  it('eine Zahlung hat eine eigene Kennung, ein Kalenderdatum und einen Betrag; die IdQuelle liefert die Kennung', () => {
    expectTypeOf<Zahlung>().toEqualTypeOf<{
      readonly id: ZahlungId;
      readonly datum: Kalenderdatum;
      readonly betrag: Betrag;
    }>();
    expectTypeOf<string>().not.toExtend<ZahlungId>();
    expectTypeOf<ZahlungId>().not.toExtend<RechnungId>();
    expectTypeOf<ReturnType<IdQuelle['zahlung']>>().toEqualTypeOf<ZahlungId>();
  });

  it('sechs Befehle an der Rechnung: drei setzen ganze Werte, drei erfassen, ändern und löschen Zahlungen', () => {
    expectTypeOf<VertragsstrafeSetzen>().toEqualTypeOf<{
      readonly art: 'VertragsstrafeSetzen';
      readonly vertragsstrafe: Vertragsstrafe | null;
    }>();
    expectTypeOf<SkontoSetzen>().toEqualTypeOf<{ readonly art: 'SkontoSetzen'; readonly skonto: Skonto | null }>();
    expectTypeOf<BauabzugsteuerSetzen>().toEqualTypeOf<{
      readonly art: 'BauabzugsteuerSetzen';
      readonly bauabzugsteuer: boolean;
    }>();
    expectTypeOf<ZahlungErfassen>().toEqualTypeOf<{ readonly art: 'ZahlungErfassen'; readonly zahlung: Zahlung }>();
    expectTypeOf<ZahlungAendern>().toEqualTypeOf<{ readonly art: 'ZahlungAendern'; readonly zahlung: Zahlung }>();
    expectTypeOf<ZahlungLoeschen>().toEqualTypeOf<{ readonly art: 'ZahlungLoeschen'; readonly zahlungId: ZahlungId }>();
    type Neu =
      | VertragsstrafeSetzen
      | SkontoSetzen
      | BauabzugsteuerSetzen
      | ZahlungErfassen
      | ZahlungAendern
      | ZahlungLoeschen;
    expectTypeOf<Neu>().toExtend<RechnungBefehl>();
    expectTypeOf<Neu>().toExtend<Befehl>();
    // jeder Befehlsname gehört zu genau einem Aggregat: die Rechnung
    expectTypeOf<
      Extract<
        Neu['art'],
        | LvBefehl['art']
        | AuftragsLvBefehl['art']
        | AngebotBefehl['art']
        | ProjektBefehl['art']
        | AufmassBefehl['art']
        | KostenermittlungBefehl['art']
      >
    >().toEqualTypeOf<never>();
  });

  it('Freigabe aufheben, solange Zahlungen bestehen: eigener Fehlercode', () => {
    expectTypeOf<'zahlungen-vorhanden'>().toExtend<Befehlsfehlercode>();
    expect(beispielFehlerFreigabeAufhebenMitZahlungen.code).toBe('zahlungen-vorhanden');
  });

  it('Zahlung erfassen: ChangeSet mit der ganzen Rechnung, nur die Zahlungen ändern sich, freigegeben vorher und nachher', () => {
    const { vorher, nachher } = beispielChangeSetZahlungErfassen.rechnung;
    expect(vorher).not.toHaveProperty('zahlungen');
    expect(nachher?.zahlungen).toHaveLength(1);
    expect(vorher?.freigabe).not.toBeNull();
    expect(nachher?.freigabe).toEqual(vorher?.freigabe);
    const { zahlungen: _z, ...ohneZahlungen } = nachher ?? beispielRechnung1;
    expect(ohneZahlungen).toEqual(vorher);
    expect(beispielChangeSetZahlungErfassen.rechnungId).toBe(beispielRechnung1.id);
  });

  it('jeder neue Befehl hat ein Beispiel, und jedes Beispiel ist ein Befehl aus reinen Daten', () => {
    const alle: Record<
      | 'VertragsstrafeSetzen'
      | 'SkontoSetzen'
      | 'BauabzugsteuerSetzen'
      | 'ZahlungErfassen'
      | 'ZahlungAendern'
      | 'ZahlungLoeschen',
      true
    > = {
      VertragsstrafeSetzen: true,
      SkontoSetzen: true,
      BauabzugsteuerSetzen: true,
      ZahlungErfassen: true,
      ZahlungAendern: true,
      ZahlungLoeschen: true,
    };
    const beispiele: readonly RechnungBefehl[] = beispieleV17b;
    expect(new Set(beispiele.map((b) => b.art))).toEqual(new Set(Object.keys(alle)));
    for (const b of beispiele) expect(JSON.parse(JSON.stringify(b))).toEqual(b);
  });
});

describe('v1.7b: Zahlungsstand, gerechnet und nie gespeichert (D-72)', () => {
  it('Form: Basis, Fristende, Auszahlung mit und ohne Skonto, verwirklichter Skonto, Steuer, Auszahlung, Summe, offen', () => {
    expectTypeOf<Auszahlungsszenario>().toEqualTypeOf<{
      readonly skonto: Betrag;
      readonly bauabzugsteuer: Betrag;
      readonly auszahlung: Betrag;
    }>();
    expectTypeOf<Zahlungsstand>().toEqualTypeOf<{
      readonly zahlbetrag: Betrag;
      readonly fristende: Kalenderdatum | null;
      readonly mitSkonto: Auszahlungsszenario;
      readonly ohneSkonto: Auszahlungsszenario;
      readonly skontoVerwirklicht: boolean;
      readonly verwirklichterSkonto: Betrag;
      readonly bauabzugsteuer: Betrag;
      readonly auszahlung: Betrag;
      readonly summeZahlungen: Betrag;
      readonly offen: Betrag;
    }>();
  });

  it('Beispiel Rechnung 1: 3 % Skonto in 14 Tagen, Bauabzugsteuer an, Zahlung in der Frist; nachgerechnet in Cent', () => {
    const r = beispielRechnungMitZahlung;
    const z = beispielZahlungsstand;
    expect(r.freigabe?.zahlbetrag).toBe(z.zahlbetrag);
    expect(r.skonto).toEqual({ satz: '3.00', fristTage: 14 });
    expect(r.bauabzugsteuer).toBe(true);
    // Eingang 05.11.2026, der Eingangstag zählt nicht: Tag 14 ist der 19.11.2026; keine Verschiebung auf einen Werktag.
    expect([r.eingang, z.fristende]).toEqual(['2026-11-05', '2026-11-19']);
    const zahlbetrag = cent(z.zahlbetrag);
    const skonto = anteil(zahlbetrag, r.skonto?.satz ?? ('0.00' as Prozent));
    const steuerMit = anteil(zahlbetrag - skonto, BAUABZUGSTEUER_SATZ);
    const steuerOhne = anteil(zahlbetrag, BAUABZUGSTEUER_SATZ);
    expect([skonto, steuerMit, steuerOhne]).toEqual([160, 777, 801]);
    expect([z.mitSkonto, z.ohneSkonto].map((s) => [s.skonto, s.bauabzugsteuer, s.auszahlung].map(cent))).toEqual([
      [skonto, steuerMit, zahlbetrag - skonto - steuerMit],
      [0, steuerOhne, zahlbetrag - steuerOhne],
    ]);
    // die Zahlung am 18.11. erreicht die Auszahlung mit Skonto: verwirklicht, nichts mehr offen
    const zahlungen = r.zahlungen ?? [];
    const inDerFrist = zahlungen.filter((x) => x.datum <= (z.fristende ?? '')).map((x) => cent(x.betrag));
    expect(inDerFrist.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(cent(z.mitSkonto.auszahlung));
    expect(z.skontoVerwirklicht).toBe(true);
    expect([z.verwirklichterSkonto, z.bauabzugsteuer, z.auszahlung].map(cent)).toEqual([
      skonto,
      steuerMit,
      zahlbetrag - skonto - steuerMit,
    ]);
    expect(cent(z.summeZahlungen)).toBe(zahlungen.map((x) => cent(x.betrag)).reduce((a, b) => a + b, 0));
    expect(cent(z.offen)).toBe(zahlbetrag - skonto - steuerMit - cent(z.summeZahlungen));
    expect(z.offen).toBe('0.00');
    expect(JSON.parse(JSON.stringify(z))).toEqual(z);
  });

  it('Befunde: Skonto ohne Eingangsdatum; mehr gezahlt als auszuzahlen', () => {
    expectTypeOf<Zahlungsbefund>().toEqualTypeOf<
      | { readonly code: 'skonto-ohne-eingang' }
      | { readonly code: 'zahlungen-ueber-auszahlung'; readonly offen: Betrag }
    >();
    expect(beispielZahlungsbefunde.map((b) => b.code)).toEqual(['skonto-ohne-eingang', 'zahlungen-ueber-auszahlung']);
    for (const b of beispielZahlungsbefunde) if (b.code === 'zahlungen-ueber-auszahlung') expect(cent(b.offen)).toBeLessThan(0);
  });
});
