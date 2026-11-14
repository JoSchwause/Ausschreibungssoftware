// SPDX-License-Identifier: AGPL-3.0-or-later
// Rechnung mit Vertragsstrafe, Skonto, Bauabzugsteuer und Zahlungen in `speicher` (Ticket 143, D-93; vertrag v1.7b, D-72,
// D-128.2, D-128.7): speichern, laden, Undo; `konflikt`, wenn Zahlungen an einer nicht freigegebenen Rechnung stünden (auch als
// Undo); Rundweg über die Projektdatei (Schema 7 trägt die Felder optional) mit den Werten von `typisch-zahlungen.json`;
// ungültige Formen in der Datei sind `datei-ungueltig`; eine Datei der Version 6 kann die Felder nicht tragen.

import { readFileSync } from 'node:fs';
import type { Rechnung } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { direktTransport, speicherUeberTransport } from './client';
import type { SpeicherKern } from './kern';
import { neuerKern, wert } from './testhilfe/node';
import { umkehren } from './testhilfe/umkehrung';
import { anwenden, aufmass, aufmassCs, AUFTRAG, frei, mitAuftrag, P, rechnung, rechnungCs } from './testhilfe/v14';

type A5 = Pick<Rechnung, 'vertragsstrafe' | 'skonto' | 'bauabzugsteuer' | 'zahlungen'>;
const fx = JSON.parse(
  readFileSync(new URL('../../../fixtures/typisch-zahlungen.json', import.meta.url), 'utf8'),
) as { rechnungen: (Rechnung & A5)[] };
const [fx1, fx2] = fx.rechnungen as [Rechnung, Rechnung];
/** Die Felder aus v1.7b einer Rechnung der Fixture. */
const a5 = (r: Rechnung): A5 => {
  const { vertragsstrafe, skonto, bauabzugsteuer, zahlungen } = r;
  return {
    ...(vertragsstrafe === undefined ? {} : { vertragsstrafe }),
    ...(skonto === undefined ? {} : { skonto }),
    ...(bauabzugsteuer === undefined ? {} : { bauabzugsteuer }),
    ...(zahlungen === undefined ? {} : { zahlungen }),
  };
};
const ohneZahlungen = (r: Rechnung): Rechnung => {
  const x = { ...r };
  delete x.zahlungen;
  return x;
};

const code = (r: { ok: boolean; fehler?: { code: string } }): string | false =>
  !r.ok && (r.fehler?.code ?? '');

/** Auftrags-LV mit zwei Blättern; AR 1 (Skonto, Steuer, eine Zahlung) und AR 2 (Strafe, Skonto, zwei Zahlungen) wie die Fixture. */
async function mitZahlungen(): Promise<{ kern: SpeicherKern; ar1: Rechnung; ar2: Rechnung }> {
  const kern = await mitAuftrag();
  for (const n of [1, 2]) wert(await anwenden(kern, aufmassCs(null, aufmass(n))));
  const ar1 = frei(rechnung(1, [1], a5(fx1)), '8874.40');
  const ar2 = frei(rechnung(2, [1, 2], a5(fx2)), '8570.67');
  for (const r of [ar1, ar2]) {
    const offen = ohneZahlungen({ ...r, freigabe: null });
    wert(await anwenden(kern, rechnungCs(null, offen)));
    wert(await anwenden(kern, rechnungCs(offen, ohneZahlungen(r))));
    wert(await anwenden(kern, rechnungCs(ohneZahlungen(r), r)));
  }
  return { kern, ar1, ar2 };
}

describe('Rechnung mit Abzügen und Zahlungen speichern (v1.7b)', () => {
  it('speichern und laden: die Felder kommen verlustfrei zurück; Undo der Zahlungen entfernt das Feld wieder', async () => {
    const { kern, ar1, ar2 } = await mitZahlungen();
    const s = speicherUeberTransport(direktTransport(kern), null);
    expect(wert(await s.rechnungen.laden(ar1.id))).toEqual({ rechnung: ar1 });
    expect(wert(await s.rechnungen.auflisten(AUFTRAG))).toEqual([ar1, ar2]);
    expect(ar2.vertragsstrafe?.betrag).toBe('1500.00');
    expect(ar1.zahlungen).toHaveLength(1);
    wert(await anwenden(kern, umkehren(rechnungCs(ohneZahlungen(ar2), ar2))));
    const geladen = wert(kern.rechnungLaden(ar2.id)).rechnung;
    expect(geladen).toEqual(ohneZahlungen(ar2));
    expect(Object.hasOwn(geladen, 'zahlungen')).toBe(false);
  });

  it('Zahlungen ohne Freigabe: konflikt, auch als Undo von „Freigeben“ und beim Anlegen; nichts geschrieben (D-128.7)', async () => {
    const { kern, ar1 } = await mitZahlungen();
    const aufheben = rechnungCs(ar1, { ...ar1, freigabe: null });
    expect(code(await anwenden(kern, aufheben))).toBe('konflikt');
    expect(wert(kern.rechnungLaden(ar1.id)).rechnung).toEqual(ar1);
    const r3 = rechnung(3, [1, 2], { zahlungen: fx1.zahlungen ?? [] });
    expect(code(await anwenden(kern, rechnungCs(null, r3)))).toBe('konflikt');
    expect(wert(kern.rechnungenAuflisten(AUFTRAG)).map((r) => r.nummer)).toEqual([1, 2]);
    // Erst die Zahlung löschen, dann lässt sich die Freigabe aufheben (die spätere AR 2 erst zurücknehmen, D-34 (7)).
    wert(await anwenden(kern, rechnungCs(ar1, ohneZahlungen(ar1))));
    const ar2 = wert(kern.rechnungLaden('rechnung-2' as never)).rechnung;
    wert(await anwenden(kern, rechnungCs(ar2, ohneZahlungen(ar2))));
    wert(await anwenden(kern, rechnungCs(ohneZahlungen(ar2), { ...ohneZahlungen(ar2), freigabe: null })));
    wert(await anwenden(kern, rechnungCs(ohneZahlungen(ar1), { ...ohneZahlungen(ar1), freigabe: null })));
  });
});

describe('Projektdatei Version 7 mit den Feldern aus v1.7b (D-93)', () => {
  it('Rundweg: exportieren → in einen neuen Speicher einlesen → dieselben Rechnungen, und der Export ist gleich', async () => {
    const { kern, ar1, ar2 } = await mitZahlungen();
    const datei = wert(kern.projektdateiExportieren(P));
    const d = JSON.parse(datei) as { schemaVersion: number; rechnungen: { rechnung: Rechnung }[] };
    expect(d.schemaVersion).toBe(7);
    expect(d.rechnungen.map((z) => z.rechnung)).toEqual([ar1, ar2]);
    const { kern: neu } = await neuerKern();
    wert(await neu.projektdateiImportieren(datei));
    expect(wert(neu.rechnungenAuflisten(AUFTRAG))).toEqual([ar1, ar2]);
    expect(wert(neu.projektdateiExportieren(P))).toBe(datei);
  });

  describe('ungültige Formen: datei-ungueltig, nichts übernommen (Q5)', () => {
    async function dateiMit(aendern: (r: Record<string, unknown>) => void, schema?: number): Promise<string> {
      const { kern } = await mitZahlungen();
      const d = JSON.parse(wert(kern.projektdateiExportieren(P))) as {
        schemaVersion: number;
        rechnungen: { rechnung: Record<string, unknown> }[];
      };
      const r = d.rechnungen[0]?.rechnung;
      if (r === undefined) throw new Error('keine Rechnung');
      aendern(r);
      if (schema !== undefined) d.schemaVersion = schema;
      return JSON.stringify(d);
    }
    const faelle: [string, (r: Record<string, unknown>) => void][] = [
      ['Bauabzugsteuer false', (r) => (r['bauabzugsteuer'] = false)],
      ['Vertragsstrafe null', (r) => (r['vertragsstrafe'] = null)],
      ['Vertragsstrafe 0,00', (r) => (r['vertragsstrafe'] = { betrag: '0.00', grund: 'x' })],
      ['Vertragsstrafe ohne Grund', (r) => (r['vertragsstrafe'] = { betrag: '1.00', grund: ' ' })],
      ['Skonto 100 %', (r) => (r['skonto'] = { satz: '100.00', fristTage: 14 })],
      ['Skonto 0 %', (r) => (r['skonto'] = { satz: '0.00', fristTage: 14 })],
      ['Skontofrist 0', (r) => (r['skonto'] = { satz: '3.00', fristTage: 0 })],
      ['Skontofrist 366', (r) => (r['skonto'] = { satz: '3.00', fristTage: 366 })],
      ['Skonto mit unbekanntem Feld', (r) => (r['skonto'] = { satz: '3.00', fristTage: 14, art: 'x' })],
      ['Zahlungen leer', (r) => (r['zahlungen'] = [])],
      ['Zahlung 0,00', (r) => (r['zahlungen'] = [{ id: 'z', datum: '2026-11-13', betrag: '0.00' }])],
      ['Zahlung negativ', (r) => (r['zahlungen'] = [{ id: 'z', datum: '2026-11-13', betrag: '-1.00' }])],
      ['Zahlung am 31.11.', (r) => (r['zahlungen'] = [{ id: 'z', datum: '2026-11-31', betrag: '1.00' }])],
      ['Zahlungsdatum deutsch', (r) => (r['zahlungen'] = [{ id: 'z', datum: '13.11.2026', betrag: '1.00' }])],
      [
        'Zahlungskennung doppelt',
        (r) =>
          (r['zahlungen'] = [
            { id: 'z', datum: '2026-11-13', betrag: '1.00' },
            { id: 'z', datum: '2026-11-14', betrag: '2.00' },
          ]),
      ],
      ['Zahlungen ohne Freigabe', (r) => (r['freigabe'] = null)],
      ['unbekanntes Feld', (r) => (r['skontoSatz'] = '3.00')],
    ];
    it.each(faelle)('%s', async (_name, aendern) => {
      const { kern } = await neuerKern();
      expect(await kern.projektdateiImportieren(await dateiMit(aendern))).toMatchObject({
        ok: false,
        fehler: { code: 'datei-ungueltig' },
      });
      expect(wert(kern.projekteAuflisten())).toEqual([]);
    });

    it('eine Datei der Version 6 mit einem der Felder ist ungültig (die Felder gab es dort nicht)', async () => {
      for (const feld of ['vertragsstrafe', 'skonto', 'bauabzugsteuer', 'zahlungen']) {
        const text = await dateiMit((r) => {
          for (const f of ['vertragsstrafe', 'skonto', 'bauabzugsteuer', 'zahlungen'])
            if (f !== feld) Reflect.deleteProperty(r, f);
          if (feld === 'vertragsstrafe') r['vertragsstrafe'] = { betrag: '1.00', grund: 'x' };
        }, 6);
        const { kern } = await neuerKern();
        expect(await kern.projektdateiImportieren(text)).toMatchObject({
          ok: false,
          fehler: { code: 'datei-ungueltig', meldung: expect.stringContaining(feld) as unknown },
        });
      }
    });
  });
});
