// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle für Vertragsstrafe, Skonto, Bauabzugsteuer und Zahlungen (Ticket 143; vertrag v1.7b, D-72, D-128.3 bis D-128.7):
// Setzen nur vor der Freigabe, Zahlungen nur danach, „Freigabe aufheben“ gesperrt, solange Zahlungen bestehen (Q5);
// Formprüfungen, kanonische Feldfolge, Anwenden und Umkehren.

import type {
  Befehlsfehler,
  Betrag,
  Kalenderdatum,
  Prozent,
  Rechnung,
  RechnungBefehl,
  RechnungChangeSet,
  RechnungZustand,
  Zahlung,
  ZahlungId,
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
const zahlung = (n: number, datum: string, betrag: string): Zahlung => ({
  id: `019b7a43-5a00-7000-8000-0000000007${String(n).padStart(2, '0')}` as ZahlungId,
  datum: datum as Kalenderdatum,
  betrag: b(betrag),
});
const strafe = { betrag: b('1500.00'), grund: 'Zwischenfrist Rohbau überschritten' };
const skonto = { satz: '3.00' as Prozent, fristTage: 14 };

function ausfuehren(
  z: RechnungZustand | null,
  befehl: RechnungBefehl,
): { cs: RechnungChangeSet; danach: RechnungZustand | null } {
  const cs = erwarteOk(rechnungBefehlAusfuehren(z, befehl));
  const danach = rechnungChangeSetAnwenden(z, cs);
  expect(rechnungChangeSetAnwenden(danach, rechnungChangeSetUmkehren(cs))).toEqual(z);
  return { cs, danach };
}
const nach = (z: RechnungZustand | null, ...befehle: RechnungBefehl[]): RechnungZustand => {
  let x = z;
  for (const befehl of befehle) x = ausfuehren(x, befehl).danach;
  if (x === null) throw new Error('Rechnung fehlt');
  return x;
};
const fehler = (z: RechnungZustand | null, befehl: RechnungBefehl): Befehlsfehler =>
  erwarteFehler(rechnungBefehlAusfuehren(z, befehl));
const ungueltig = (feld: string) => ({ code: 'ungueltige-eingabe', feld });

describe('Vertragsstrafe, Skonto, Bauabzugsteuer setzen (vor der Freigabe)', () => {
  it('setzen und entfernen; die neuen Felder stehen am Ende in Vertragsfolge, „fehlt“ heißt keine/aus (D-128.2)', () => {
    const z = nach(
      offen,
      { art: 'BauabzugsteuerSetzen', bauabzugsteuer: true },
      { art: 'SkontoSetzen', skonto },
      { art: 'VertragsstrafeSetzen', vertragsstrafe: strafe },
    );
    expect(z.rechnung).toEqual({ ...ar1Offen, vertragsstrafe: strafe, skonto, bauabzugsteuer: true });
    expect(Object.keys(z.rechnung).slice(-4)).toEqual([
      'freigabe',
      'vertragsstrafe',
      'skonto',
      'bauabzugsteuer',
    ]);
    const leer = nach(
      z,
      { art: 'BauabzugsteuerSetzen', bauabzugsteuer: false },
      { art: 'SkontoSetzen', skonto: null },
      { art: 'VertragsstrafeSetzen', vertragsstrafe: null },
    );
    expect(leer.rechnung).toEqual(ar1Offen);
    expect(Object.keys(leer.rechnung)).toEqual(Object.keys(ar1Offen));
  });

  it('andere Befehle lassen die neuen Felder stehen', () => {
    const z = nach(
      offen,
      { art: 'SkontoSetzen', skonto },
      { art: 'VertragsstrafeSetzen', vertragsstrafe: strafe },
    );
    const d = nach(z, {
      art: 'RechnungsabzuegeSetzen',
      umlagen: [],
      sicherheitSatz: null,
      gewaehrleistungSatz: null,
    });
    expect(d.rechnung.skonto).toEqual(skonto);
    expect(d.rechnung.vertragsstrafe).toEqual(strafe);
  });

  it('an einer freigegebenen Rechnung: rechnung-freigegeben (sie ändern die Zahlungsfreigabe, D-128.7)', () => {
    for (const befehl of [
      { art: 'VertragsstrafeSetzen', vertragsstrafe: strafe },
      { art: 'SkontoSetzen', skonto: null },
      { art: 'BauabzugsteuerSetzen', bauabzugsteuer: true },
    ] as const)
      expect(fehler(frei, befehl).code).toBe('rechnung-freigegeben');
  });

  it('Formprüfungen (D-128.3, D-128.4)', () => {
    const vs = (v: unknown) =>
      fehler(offen, { art: 'VertragsstrafeSetzen', vertragsstrafe: v } as RechnungBefehl);
    expect(vs({ betrag: '0.00', grund: 'x' })).toMatchObject(ungueltig('vertragsstrafe.betrag'));
    expect(vs({ betrag: '-1.00', grund: 'x' })).toMatchObject(ungueltig('vertragsstrafe.betrag'));
    expect(vs({ betrag: '1.5', grund: 'x' })).toMatchObject(ungueltig('vertragsstrafe.betrag'));
    expect(vs({ betrag: '1.50', grund: '' })).toMatchObject(ungueltig('vertragsstrafe.grund'));
    expect(vs({ betrag: '1.50', grund: '   ' })).toMatchObject(ungueltig('vertragsstrafe.grund'));
    expect(vs({ betrag: '1.50' })).toMatchObject(ungueltig('vertragsstrafe.grund'));
    expect(vs('1.50')).toMatchObject(ungueltig('vertragsstrafe'));
    const sk = (s: unknown) => fehler(offen, { art: 'SkontoSetzen', skonto: s } as RechnungBefehl);
    expect(sk({ satz: '0.00', fristTage: 14 })).toMatchObject(ungueltig('skonto.satz'));
    expect(sk({ satz: '100.00', fristTage: 14 })).toMatchObject(ungueltig('skonto.satz'));
    expect(sk({ satz: '3', fristTage: 14 })).toMatchObject(ungueltig('skonto.satz'));
    expect(sk({ satz: '3.00', fristTage: 0 })).toMatchObject(ungueltig('skonto.fristTage'));
    expect(sk({ satz: '3.00', fristTage: 366 })).toMatchObject(ungueltig('skonto.fristTage'));
    expect(sk({ satz: '3.00', fristTage: 1.5 })).toMatchObject(ungueltig('skonto.fristTage'));
    expect(sk({ satz: '3.00', fristTage: '14' })).toMatchObject(ungueltig('skonto.fristTage'));
    expect(
      fehler(offen, { art: 'BauabzugsteuerSetzen', bauabzugsteuer: 'ja' } as unknown as RechnungBefehl),
    ).toMatchObject(ungueltig('bauabzugsteuer'));
    // Die Grenzen selbst sind zulässig.
    ausfuehren(offen, { art: 'SkontoSetzen', skonto: { satz: '99.99' as Prozent, fristTage: 365 } });
    ausfuehren(offen, { art: 'SkontoSetzen', skonto: { satz: '0.01' as Prozent, fristTage: 1 } });
    ausfuehren(offen, { art: 'VertragsstrafeSetzen', vertragsstrafe: { betrag: b('0.01'), grund: 'x' } });
  });
});

describe('RechnungAnlegen mit den neuen Feldern (D-128.7)', () => {
  it('Vertragsstrafe, Skonto und Bauabzugsteuer darf die neue Rechnung mitbringen, Zahlungen nie', () => {
    const neu: Rechnung = { ...m4.ar2, vertragsstrafe: strafe, skonto, bauabzugsteuer: true };
    const { danach } = ausfuehren(null, { art: 'RechnungAnlegen', rechnung: neu });
    expect(danach?.rechnung).toEqual(neu);
    expect(
      fehler(null, {
        art: 'RechnungAnlegen',
        rechnung: { ...m4.ar2, zahlungen: [zahlung(1, '2026-12-01', '1.00')] },
      }),
    ).toMatchObject(ungueltig('zahlungen'));
  });

  it('„fehlt“ ist die einzige Schreibweise für keine/aus: null, false und [] weist der Ausführer ab', () => {
    const anlegen = (extra: Record<string, unknown>) =>
      fehler(null, { art: 'RechnungAnlegen', rechnung: { ...m4.ar2, ...extra } });
    expect(anlegen({ vertragsstrafe: null })).toMatchObject(ungueltig('vertragsstrafe'));
    expect(anlegen({ skonto: null })).toMatchObject(ungueltig('skonto'));
    expect(anlegen({ bauabzugsteuer: false })).toMatchObject(ungueltig('bauabzugsteuer'));
    expect(anlegen({ zahlungen: [] })).toMatchObject(ungueltig('zahlungen'));
    expect(anlegen({ skonto: { satz: '3.00', fristTage: 0 } })).toMatchObject(ungueltig('skonto.fristTage'));
  });

  it('kanonisch: die Felder in Vertragsfolge, egal in welcher Folge sie kommen', () => {
    // Dieselben Felder, nur die neuen vorn: die Objektfolge kommt aus Protokoll oder Datei, nicht aus dem Typ.
    const verdreht = { bauabzugsteuer: true, skonto, vertragsstrafe: strafe, ...m4.ar2 } as Rechnung;
    const { danach } = ausfuehren(null, { art: 'RechnungAnlegen', rechnung: verdreht });
    expect(Object.keys(danach?.rechnung ?? {}).slice(-4)).toEqual([
      'freigabe',
      'vertragsstrafe',
      'skonto',
      'bauabzugsteuer',
    ]);
  });
});

describe('Zahlungen (nur an einer freigegebenen Rechnung, D-128.6, D-128.7)', () => {
  const z1 = zahlung(1, '2026-11-13', '7316.94');
  const z2 = zahlung(2, '2026-11-20', '50.00');

  it('erfassen hängt an, ändern ersetzt an der Stelle, löschen entfernt; die letzte entfernt das Feld', () => {
    const { cs } = ausfuehren(frei, { art: 'ZahlungErfassen', zahlung: z1 });
    expect(cs.rechnung).toEqual({ vorher: m4.ar1, nachher: { ...m4.ar1, zahlungen: [z1] } });
    const zwei = nach(frei, { art: 'ZahlungErfassen', zahlung: z1 }, { art: 'ZahlungErfassen', zahlung: z2 });
    expect(zwei.rechnung.zahlungen).toEqual([z1, z2]);
    const geaendert = nach(zwei, { art: 'ZahlungAendern', zahlung: { ...z1, betrag: b('7000.00') } });
    expect(geaendert.rechnung.zahlungen).toEqual([{ ...z1, betrag: '7000.00' }, z2]);
    const eine = nach(geaendert, { art: 'ZahlungLoeschen', zahlungId: z1.id });
    expect(eine.rechnung.zahlungen).toEqual([z2]);
    const keine = nach(eine, { art: 'ZahlungLoeschen', zahlungId: z2.id });
    expect(keine.rechnung).toEqual(m4.ar1);
    expect(Object.hasOwn(keine.rechnung, 'zahlungen')).toBe(false);
    // Die Freigabe bleibt bei jedem Zahlungsbefehl gleich.
    expect(geaendert.rechnung.freigabe).toEqual(m4.ar1.freigabe);
  });

  it('an einer nicht freigegebenen Rechnung: ungueltige-eingabe (feld freigabe)', () => {
    expect(fehler(offen, { art: 'ZahlungErfassen', zahlung: z1 })).toMatchObject(ungueltig('freigabe'));
    expect(fehler(offen, { art: 'ZahlungAendern', zahlung: z1 })).toMatchObject(ungueltig('freigabe'));
    expect(fehler(offen, { art: 'ZahlungLoeschen', zahlungId: z1.id })).toMatchObject(ungueltig('freigabe'));
  });

  it('Kennung schon da: id-vergeben; unbekannt beim Ändern und Löschen: ungueltige-eingabe (feld zahlungId)', () => {
    const z = nach(frei, { art: 'ZahlungErfassen', zahlung: z1 });
    expect(fehler(z, { art: 'ZahlungErfassen', zahlung: { ...z1, betrag: b('1.00') } }).code).toBe(
      'id-vergeben',
    );
    expect(fehler(z, { art: 'ZahlungAendern', zahlung: z2 })).toMatchObject(ungueltig('zahlungId'));
    expect(fehler(z, { art: 'ZahlungLoeschen', zahlungId: z2.id })).toMatchObject(ungueltig('zahlungId'));
    expect(fehler(frei, { art: 'ZahlungLoeschen', zahlungId: z2.id })).toMatchObject(ungueltig('zahlungId'));
  });

  it('Form: Betrag > 0,00 mit 2 Stellen, Datum ein Tag, den es gibt, Kennung nicht leer', () => {
    const erfassen = (z: unknown) => fehler(frei, { art: 'ZahlungErfassen', zahlung: z } as RechnungBefehl);
    expect(erfassen({ ...z1, betrag: '0.00' })).toMatchObject(ungueltig('zahlung.betrag'));
    expect(erfassen({ ...z1, betrag: '-5.00' })).toMatchObject(ungueltig('zahlung.betrag'));
    expect(erfassen({ ...z1, betrag: '5' })).toMatchObject(ungueltig('zahlung.betrag'));
    expect(erfassen({ ...z1, datum: '2026-02-29' })).toMatchObject(ungueltig('zahlung.datum'));
    expect(erfassen({ ...z1, datum: '13.11.2026' })).toMatchObject(ungueltig('zahlung.datum'));
    expect(erfassen({ ...z1, datum: null })).toMatchObject(ungueltig('zahlung.datum'));
    expect(erfassen({ ...z1, id: '' })).toMatchObject(ungueltig('zahlung.id'));
    expect(erfassen(null)).toMatchObject(ungueltig('zahlung'));
    expect(
      fehler(nach(frei, { art: 'ZahlungErfassen', zahlung: z1 }), {
        art: 'ZahlungAendern',
        zahlung: { ...z1, datum: '2026-11-31' as Kalenderdatum },
      }),
    ).toMatchObject(ungueltig('zahlung.datum'));
  });

  it('Freigabe aufheben, solange Zahlungen bestehen: zahlungen-vorhanden (Q5); nach dem Löschen wieder möglich', () => {
    const z = nach(frei, { art: 'ZahlungErfassen', zahlung: z1 });
    expect(fehler(z, { art: 'RechnungsfreigabeAufheben' })).toEqual({
      code: 'zahlungen-vorhanden',
      meldung: 'RechnungsfreigabeAufheben: Zur Rechnung 1 ist 1 Zahlung erfasst.',
    });
    const zwei = nach(z, { art: 'ZahlungErfassen', zahlung: z2 });
    expect(fehler(zwei, { art: 'RechnungsfreigabeAufheben' }).meldung).toBe(
      'RechnungsfreigabeAufheben: Zur Rechnung 1 sind 2 Zahlungen erfasst.',
    );
    const ohne = nach(z, { art: 'ZahlungLoeschen', zahlungId: z1.id }, { art: 'RechnungsfreigabeAufheben' });
    expect(ohne.rechnung).toEqual(ar1Offen);
  });

  it('Löschen der freigegebenen Rechnung bleibt gesperrt, auch mit Zahlungen (rechnung-freigegeben)', () => {
    const z = nach(frei, { art: 'ZahlungErfassen', zahlung: z1 });
    expect(fehler(z, { art: 'RechnungLoeschen' }).code).toBe('rechnung-freigegeben');
  });
});
