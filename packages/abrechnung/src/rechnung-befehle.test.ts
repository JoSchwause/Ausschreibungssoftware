// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle an der Rechnung (Ticket 81; vertrag v1.4, D-70.3, D-70.4, D-44): Golden an AR 1 und AR 2 des Tors M4,
// Formprüfungen, `rechnung-freigegeben`, Anwenden und Umkehren.

import type {
  AufmassId,
  Betrag,
  Befehlsfehler,
  Prozent,
  Rechnung,
  RechnungBefehl,
  RechnungChangeSet,
  RechnungId,
  RechnungZustand,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { rechnungBefehlAusfuehren } from './rechnung-befehle';
import { rechnungChangeSetAnwenden, rechnungChangeSetUmkehren } from './rechnung-changeset';
import { erwarteFehler, erwarteOk, m4Stand } from './testhilfen';

const m4 = m4Stand();
const ar1Offen: Rechnung = { ...m4.ar1, freigabe: null };
const offen: RechnungZustand = { rechnung: ar1Offen };
const frei: RechnungZustand = { rechnung: m4.ar1 };
const b = (x: string): Betrag => x as Betrag;

/** Führt aus und wendet an; prüft dabei, dass die Umkehrung den Ausgangszustand zurückgibt. */
function ausfuehren(
  z: RechnungZustand | null,
  befehl: RechnungBefehl,
): { cs: RechnungChangeSet; danach: RechnungZustand | null } {
  const cs = erwarteOk(rechnungBefehlAusfuehren(z, befehl));
  const danach = rechnungChangeSetAnwenden(z, cs);
  expect(rechnungChangeSetAnwenden(danach, rechnungChangeSetUmkehren(cs))).toEqual(z);
  return { cs, danach };
}

const fehler = (z: RechnungZustand | null, befehl: RechnungBefehl): Befehlsfehler =>
  erwarteFehler(rechnungBefehlAusfuehren(z, befehl));

describe('rechnungBefehlAusfuehren: Tor M4', () => {
  it('AR 2 anlegen: die ganze Rechnung, vorher keine', () => {
    const { cs, danach } = ausfuehren(null, { art: 'RechnungAnlegen', rechnung: m4.ar2 });
    expect(cs).toEqual({
      art: 'rechnung',
      rechnungId: m4.ar2.id,
      rechnung: { vorher: null, nachher: m4.ar2 },
    });
    expect(danach).toEqual({ rechnung: m4.ar2 });
  });

  it('AR 1 freigeben friert 8.874,40 ein; Aufheben ist das Gegenstück (D-70.4)', () => {
    const { cs, danach } = ausfuehren(offen, { art: 'RechnungFreigeben', zahlbetrag: b('8874.40') });
    expect(cs.rechnung).toEqual({ vorher: ar1Offen, nachher: m4.ar1 });
    expect(danach).toEqual(frei);
    const aufheben = ausfuehren(frei, { art: 'RechnungsfreigabeAufheben' });
    expect(aufheben.cs).toEqual(rechnungChangeSetUmkehren(cs));
  });
});

describe('rechnungBefehlAusfuehren: Angaben, Blätter, Abzüge, Löschen', () => {
  it('Angaben setzen; eine leere Rechnungsnummer des Auftragnehmers ist keine (null)', () => {
    const { danach } = ausfuehren(offen, {
      art: 'RechnungsangabenSetzen',
      rechnungsart: 'schluss',
      eingang: '2026-12-01',
      rechnungsnummerAuftragnehmer: '',
      gefordert: { netto: null, brutto: null, zahlbetrag: b('100.00') },
    });
    expect(danach?.rechnung).toEqual({
      ...ar1Offen,
      art: 'schluss',
      eingang: '2026-12-01',
      rechnungsnummerAuftragnehmer: null,
      gefordert: { netto: null, brutto: null, zahlbetrag: '100.00' },
    });
  });

  it('Blätter und Abzüge setzen; Löschen trägt den vollen Stand', () => {
    const ids = ['a2', 'a1'] as AufmassId[];
    expect(
      ausfuehren(offen, { art: 'RechnungsaufmasseSetzen', aufmassIds: ids }).danach?.rechnung.aufmassIds,
    ).toEqual(ids);
    const abzuege = ausfuehren(offen, {
      art: 'RechnungsabzuegeSetzen',
      umlagen: [],
      sicherheitSatz: null,
      gewaehrleistungSatz: '3.00' as Prozent,
    }).danach?.rechnung;
    expect(abzuege).toMatchObject({ umlagen: [], sicherheitSatz: null, gewaehrleistungSatz: '3.00' });
    const { cs, danach } = ausfuehren(offen, { art: 'RechnungLoeschen' });
    expect(cs.rechnung).toEqual({ vorher: ar1Offen, nachher: null });
    expect(danach).toBeNull();
  });

  it('eine freigegebene Rechnung ändert nur „Freigabe aufheben“ (rechnung-freigegeben)', () => {
    for (const befehl of [
      {
        art: 'RechnungsangabenSetzen',
        rechnungsart: 'abschlag',
        eingang: null,
        rechnungsnummerAuftragnehmer: null,
        gefordert: null,
      },
      { art: 'RechnungsaufmasseSetzen', aufmassIds: [] },
      { art: 'RechnungsabzuegeSetzen', umlagen: [], sicherheitSatz: null, gewaehrleistungSatz: null },
      { art: 'RechnungFreigeben', zahlbetrag: b('1.00') },
      { art: 'RechnungLoeschen' },
    ] as const)
      expect(fehler(frei, befehl).code).toBe('rechnung-freigegeben');
  });

  it('Anlegen nur ohne Zustand, alles andere nur mit (befehl-nicht-zustaendig)', () => {
    expect(fehler(offen, { art: 'RechnungAnlegen', rechnung: m4.ar2 }).code).toBe('befehl-nicht-zustaendig');
    expect(fehler(null, { art: 'RechnungLoeschen' }).code).toBe('befehl-nicht-zustaendig');
    expect(fehler(null, { art: 'RechnungsfreigabeAufheben' }).code).toBe('befehl-nicht-zustaendig');
  });
});

describe('rechnungBefehlAusfuehren: Formprüfungen (ungueltige-eingabe)', () => {
  const anlegen = (aenderung: Partial<Record<keyof Rechnung, unknown>>): Befehlsfehler =>
    fehler(null, { art: 'RechnungAnlegen', rechnung: { ...m4.ar2, ...aenderung } as Rechnung });

  it('Anlegen mit Freigabe; Aufheben ohne Freigabe (D-70 Folgearbeit)', () => {
    expect(anlegen({ freigabe: { zahlbetrag: '1.00' } })).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'freigabe',
    });
    expect(fehler(offen, { art: 'RechnungsfreigabeAufheben' })).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'freigabe',
    });
  });

  it('Kennungen, Nummer, Art, Eingang', () => {
    expect(anlegen({ id: '' })).toMatchObject({ feld: 'id' });
    expect(anlegen({ auftragsLvId: '' })).toMatchObject({ feld: 'auftragsLvId' });
    for (const nummer of [0, 2.5, -1]) expect(anlegen({ nummer })).toMatchObject({ feld: 'nummer' });
    expect(anlegen({ art: 'teilschluss' })).toMatchObject({ feld: 'art' });
    expect(anlegen({ eingang: '30.10.2026' })).toMatchObject({ feld: 'eingang' });
    expect(anlegen({ rechnungsnummerAuftragnehmer: 7 })).toMatchObject({
      feld: 'rechnungsnummerAuftragnehmer',
    });
  });

  it('gefordert: null oder mindestens ein Betrag (D-44); Beträge kanonisch mit 2 Stellen', () => {
    expect(anlegen({ gefordert: { netto: null, brutto: null, zahlbetrag: null } })).toMatchObject({
      feld: 'gefordert',
    });
    expect(anlegen({ gefordert: { netto: '1.0', brutto: null, zahlbetrag: null } })).toMatchObject({
      feld: 'gefordert.netto',
    });
    expect(anlegen({ gefordert: { netto: null, brutto: null } })).toMatchObject({
      feld: 'gefordert.zahlbetrag',
    });
  });

  it('Blätter höchstens einmal; Umlagen und Sätze kanonisch', () => {
    expect(anlegen({ aufmassIds: ['a', 'a'] })).toMatchObject({ feld: 'aufmassIds' });
    expect(anlegen({ aufmassIds: [''] })).toMatchObject({ feld: 'aufmassIds' });
    expect(anlegen({ umlagen: [{ bezeichnung: 'x', satz: '0.5' }] })).toMatchObject({ feld: 'umlagen.satz' });
    expect(anlegen({ umlagen: [{ bezeichnung: 3, satz: '0.50' }] })).toMatchObject({
      feld: 'umlagen.bezeichnung',
    });
    expect(anlegen({ sicherheitSatz: '5' })).toMatchObject({ feld: 'sicherheitSatz' });
    expect(anlegen({ gewaehrleistungSatz: '3,00' })).toMatchObject({ feld: 'gewaehrleistungSatz' });
    expect(fehler(offen, { art: 'RechnungFreigeben', zahlbetrag: b('8874.4') })).toMatchObject({
      feld: 'zahlbetrag',
    });
  });
});

describe('rechnungChangeSetAnwenden', () => {
  it('ein ChangeSet, das nicht zum Zustand passt, ist ein Programmfehler', () => {
    const anlegen = erwarteOk(rechnungBefehlAusfuehren(null, { art: 'RechnungAnlegen', rechnung: m4.ar2 }));
    expect(() => rechnungChangeSetAnwenden(offen, anlegen)).toThrow();
    const loeschen = erwarteOk(rechnungBefehlAusfuehren(offen, { art: 'RechnungLoeschen' }));
    expect(() => rechnungChangeSetAnwenden(null, loeschen)).toThrow();
    expect(() =>
      rechnungChangeSetAnwenden({ rechnung: { ...ar1Offen, id: 'x' as RechnungId } }, loeschen),
    ).toThrow();
  });
});
