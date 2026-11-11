// SPDX-License-Identifier: AGPL-3.0-or-later
// Rechnung in `speicher` (Ticket 79, Vertrag v1.4): ganzes Aggregat im ChangeSet, Bezüge auf Aufmaßblätter und die
// Invariante der Freigaben (D-34 (7), Review-Befund 1 zu v1.4): Die freigegebenen Rechnungen eines Auftrags-LV sind stets
// die mit den kleinsten Nummern. `speicher` hält sie auch gegen ChangeSets ohne Ausführer (Undo).

import type { Rechnung } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { direktTransport, speicherUeberTransport } from './client';
import type { SpeicherKern } from './kern';
import { wert } from './testhilfe/node';
import { umkehren } from './testhilfe/umkehrung';
import {
  anwenden,
  aufmass,
  aufmassCs,
  AUFTRAG,
  frei,
  mitAuftrag,
  rechnung,
  rechnungCs,
} from './testhilfe/v14';

const code = (r: { ok: boolean; fehler?: { code: string } }): string | false =>
  !r.ok && (r.fehler?.code ?? '');

/** Auftrags-LV mit den Blättern 1 und 2. */
async function mitBlaettern(): Promise<SpeicherKern> {
  const kern = await mitAuftrag();
  for (const n of [1, 2]) wert(await anwenden(kern, aufmassCs(null, aufmass(n))));
  return kern;
}

const freigegeben = (kern: SpeicherKern): number[] =>
  wert(kern.rechnungenAuflisten(AUFTRAG))
    .filter((r) => r.freigabe !== null)
    .map((r) => r.nummer);

describe('Rechnung speichern und laden', () => {
  it('Anlegen → Laden; auflisten liefert ganze Rechnungen nach Nummer; Angaben ändern mit Undo', async () => {
    const kern = await mitBlaettern();
    const s = speicherUeberTransport(direktTransport(kern), null);
    const r2 = rechnung(2, [1, 2], { gefordert: null, gewaehrleistungSatz: '3.00' as never });
    wert(await anwenden(kern, rechnungCs(null, r2)));
    wert(await anwenden(kern, rechnungCs(null, rechnung(1, [1]))));
    expect(wert(await s.rechnungen.laden(r2.id))).toEqual({ rechnung: r2 });
    expect(wert(await s.rechnungen.auflisten(AUFTRAG))).toEqual([rechnung(1, [1]), r2]);
    const angaben = rechnungCs(r2, { ...r2, eingang: null, rechnungsnummerAuftragnehmer: null, umlagen: [] });
    wert(await anwenden(kern, angaben));
    expect(wert(kern.rechnungLaden(r2.id)).rechnung.umlagen).toEqual([]);
    wert(await anwenden(kern, umkehren(angaben)));
    expect(wert(kern.rechnungLaden(r2.id)).rechnung).toEqual(r2);
    expect(code(await anwenden(kern, umkehren(angaben)))).toBe('konflikt'); // vorher veraltet
  });

  it('aufmassIds: ein unbekanntes Blatt oder das Blatt eines anderen Auftrags-LV: konflikt', async () => {
    const kern = await mitBlaettern();
    expect(code(await anwenden(kern, rechnungCs(null, rechnung(1, [1, 9]))))).toBe('konflikt');
    const r = rechnung(1, [1]);
    wert(await anwenden(kern, rechnungCs(null, r)));
    expect(code(await anwenden(kern, rechnungCs(r, rechnung(1, [1, 9]))))).toBe('konflikt');
    expect(wert(kern.rechnungLaden(r.id)).rechnung).toEqual(r);
  });

  it('Anlegen: Nummer doppelt, Auftrags-LV nicht im Projekt, Nummer 0: konflikt bzw. unbekannt', async () => {
    const kern = await mitBlaettern();
    wert(await anwenden(kern, rechnungCs(null, rechnung(1, [1]))));
    expect(code(await anwenden(kern, rechnungCs(null, rechnung(2, [], { nummer: 1 }))))).toBe('konflikt');
    expect(
      code(await anwenden(kern, rechnungCs(null, rechnung(3, [], { auftragsLvId: 'fremd' as never })))),
    ).toBe('konflikt');
    expect(code(await anwenden(kern, rechnungCs(null, rechnung(0, []))))).toBe('unbekannt');
    const r = rechnung(1, [1]);
    expect(code(await anwenden(kern, rechnungCs(r, { ...r, nummer: 4 })))).toBe('unbekannt');
  });

  it('auflisten zu einem unbekannten Auftrags-LV: nicht-gefunden; ein Blatt in einer Rechnung lässt sich nicht löschen', async () => {
    const kern = await mitBlaettern();
    expect(code(kern.rechnungenAuflisten('unbekannt' as never))).toBe('nicht-gefunden');
    wert(await anwenden(kern, rechnungCs(null, rechnung(1, [2]))));
    expect(code(await anwenden(kern, aufmassCs(aufmass(2), null)))).toBe('konflikt');
    wert(await anwenden(kern, aufmassCs(aufmass(1), null))); // Blatt 1 steht in keiner Rechnung
    expect(wert(kern.aufmasseAuflisten(AUFTRAG)).map((a) => a.nummer)).toEqual([2]);
  });
});

describe('Invariante der Freigaben (D-34 (7))', () => {
  /** AR 1 (freigegeben), AR 2 und AR 3 (offen). */
  async function dreiRechnungen(): Promise<{ kern: SpeicherKern; r: Rechnung[] }> {
    const kern = await mitBlaettern();
    const r = [rechnung(1, [1]), rechnung(2, [1, 2]), rechnung(3, [1, 2])];
    for (const x of r) wert(await anwenden(kern, rechnungCs(null, x)));
    wert(await anwenden(kern, rechnungCs(r[0] as Rechnung, frei(r[0] as Rechnung))));
    return { kern, r };
  }

  it('Review-Befund 1: AR 2 löschen, AR 3 freigeben, AR 2 neu anlegen: konflikt (keine Doppelzahlung)', async () => {
    const { kern, r } = await dreiRechnungen();
    const [, r2, r3] = r as [Rechnung, Rechnung, Rechnung];
    wert(await anwenden(kern, rechnungCs(r2, null)));
    wert(await anwenden(kern, rechnungCs(r3, frei(r3, '2.63'))));
    expect(freigegeben(kern)).toEqual([1, 3]);
    expect(code(await anwenden(kern, rechnungCs(null, r2)))).toBe('konflikt');
    // Auch freigegeben angelegt (ein Wiederholen ohne Ausführer) nicht: Die Nummer 2 läge vor der freigegebenen 3.
    expect(code(await anwenden(kern, rechnungCs(null, frei(r2))))).toBe('konflikt');
    expect(wert(kern.rechnungenAuflisten(AUFTRAG)).map((x) => x.nummer)).toEqual([1, 3]);
  });

  it('freigeben, solange eine frühere offen ist: konflikt; der Reihe nach: erlaubt', async () => {
    const { kern, r } = await dreiRechnungen();
    const [, r2, r3] = r as [Rechnung, Rechnung, Rechnung];
    expect(code(await anwenden(kern, rechnungCs(r3, frei(r3))))).toBe('konflikt');
    wert(await anwenden(kern, rechnungCs(r2, frei(r2))));
    wert(await anwenden(kern, rechnungCs(r3, frei(r3))));
    expect(freigegeben(kern)).toEqual([1, 2, 3]);
  });

  it('Freigabe aufheben oder löschen, solange eine spätere freigegeben ist: konflikt (auch als Undo)', async () => {
    const { kern, r } = await dreiRechnungen();
    const [r1, r2] = r as [Rechnung, Rechnung, Rechnung];
    const freigabe2 = rechnungCs(r2, frei(r2));
    wert(await anwenden(kern, freigabe2));
    expect(code(await anwenden(kern, rechnungCs(frei(r1), r1)))).toBe('konflikt'); // Aufheben von AR 1
    expect(code(await anwenden(kern, rechnungCs(frei(r1), null)))).toBe('konflikt'); // Löschen von AR 1
    expect(freigegeben(kern)).toEqual([1, 2]);
    // Rückwärts geht es: erst die Freigabe von AR 2 zurücknehmen (Undo), dann die von AR 1 aufheben.
    wert(await anwenden(kern, umkehren(freigabe2)));
    wert(await anwenden(kern, rechnungCs(frei(r1), r1)));
    expect(freigegeben(kern)).toEqual([]);
  });

  it('eine offene Rechnung zwischen offenen löschen und das Löschen rückgängig machen: erlaubt', async () => {
    const { kern, r } = await dreiRechnungen();
    const [, r2] = r as [Rechnung, Rechnung, Rechnung];
    const loeschen = rechnungCs(r2, null);
    wert(await anwenden(kern, loeschen));
    wert(await anwenden(kern, umkehren(loeschen)));
    expect(wert(kern.rechnungenAuflisten(AUFTRAG)).map((x) => x.nummer)).toEqual([1, 2, 3]);
  });
});
