// SPDX-License-Identifier: AGPL-3.0-or-later
// Projektdatei Schema 7 und die Einstellungen (v1.7a, Ticket 139; E15, D-73, D-127.9): Der Export trägt die Einstellungen des
// Geräts als Block (fehlt, wenn sie leer sind); das Einlesen füllt nur Fehlendes je Schlüssel, überschreibt nie und berichtet,
// was übernommen und was belassen wurde. Alles atomar mit dem Projekt (Q5).

import { readFileSync } from 'node:fs';
import {
  LEERE_EINSTELLUNGEN,
  type Einstellungen,
  type EinstellungenChangeSet,
  type Kostengruppennummer,
  type Projektdatei,
  type Speicher,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { direktTransport, speicherUeberTransport } from './client';
import type { SpeicherKern } from './kern';
import { anlegenSchritte, ladeFixture } from './testhilfe/fixtures';
import { neuerKern, speichere, wert } from './testhilfe/node';
import { DRUCKPROFIL, EINSTELLUNGEN } from './testhilfe/v17';

const lese = (n: number): string =>
  readFileSync(new URL(`../fixtures/projektdatei-v${String(n)}.json`, import.meta.url), 'utf8');

const f = ladeFixture('winzig');
const aendern = (vorher: Einstellungen, nachher: Einstellungen): EinstellungenChangeSet => ({
  art: 'einstellungen',
  einstellungen: { vorher, nachher },
});

async function speicherMit(
  e: Einstellungen = LEERE_EINSTELLUNGEN,
): Promise<{ kern: SpeicherKern; s: Speicher }> {
  const { kern } = await neuerKern();
  if (e !== LEERE_EINSTELLUNGEN) wert(await kern.einstellungenAnwenden(aendern(LEERE_EINSTELLUNGEN, e)));
  return { kern, s: speicherUeberTransport(direktTransport(kern), null) };
}

/** `Speicher.projektdateiEinlesen` (im Vertrag optional; `speicher` liefert es seit Ticket 139). */
function einlesen(s: Speicher, inhalt: string): ReturnType<NonNullable<Speicher['projektdateiEinlesen']>> {
  if (s.projektdateiEinlesen === undefined) throw new Error('projektdateiEinlesen fehlt');
  return s.projektdateiEinlesen(inhalt);
}

/** `Speicher.einstellungen.laden` (im Vertrag optional). */
async function einstellungenVon(s: Speicher): Promise<Einstellungen> {
  if (s.einstellungen === undefined) throw new Error('Speicher.einstellungen fehlt');
  return wert(await s.einstellungen.laden());
}

/** Die Projektdatei des Fixtures `winzig`, exportiert aus einem Speicher mit den Einstellungen `e`. */
async function dateiMit(e: Einstellungen): Promise<string> {
  const { kern } = await speicherMit(e);
  await speichere(kern, anlegenSchritte(f));
  return wert(kern.projektdateiExportieren(f.projekt.id));
}

describe('Projektdatei Schema 7: der Block der Einstellungen', () => {
  it('der Export trägt die Einstellungen; sind sie leer, fehlt der Block', async () => {
    const ohne = JSON.parse(await dateiMit(LEERE_EINSTELLUNGEN)) as Projektdatei;
    expect(ohne.schemaVersion).toBe(7);
    expect(ohne).not.toHaveProperty('einstellungen');
    const mit = JSON.parse(await dateiMit(EINSTELLUNGEN)) as Projektdatei;
    expect(mit.einstellungen).toEqual(EINSTELLUNGEN);
  });

  it('Einlesen in einen Speicher ohne Einstellungen übernimmt alles, in der Reihenfolge der Datei berichtet', async () => {
    const text = await dateiMit(EINSTELLUNGEN);
    const { s } = await speicherMit();
    expect(wert(await einlesen(s, text))).toEqual({
      projektId: f.projekt.id,
      einstellungen: {
        uebernommen: [
          { art: 'buero' },
          { art: 'druckprofil', name: 'Bieterversand (erfunden)' },
          { art: 'druckprofil', name: 'Mit Preisen (erfunden)' },
          { art: 'kostengruppenbezeichnung', nummer: '330' },
          { art: 'kostengruppenbezeichnung', nummer: '340' },
        ],
        belassen: [],
      },
    });
    expect(await einstellungenVon(s)).toEqual(EINSTELLUNGEN);
  });

  it('füllt nur Fehlendes je Schlüssel und überschreibt nie, auch nicht bei gleichem Namen mit anderem Inhalt', async () => {
    const text = await dateiMit(EINSTELLUNGEN);
    const lokal: Einstellungen = {
      buero: { name: 'Eigenes Büro (erfunden)', anschrift: null, telefon: null, email: 'buero@example.org' },
      druckprofile: [{ ...DRUCKPROFIL, mitPreisen: true, seitenrand: 'normal' }],
      kostengruppenbezeichnungen: [
        { nummer: '330' as Kostengruppennummer, bezeichnung: 'Außenwände (lokal)' },
        { nummer: '350' as Kostengruppennummer, bezeichnung: 'Decken (lokal)' },
      ],
    };
    const { s } = await speicherMit(lokal);
    const bericht = wert(await einlesen(s, text));
    expect(bericht.einstellungen).toEqual({
      uebernommen: [
        { art: 'druckprofil', name: 'Mit Preisen (erfunden)' },
        { art: 'kostengruppenbezeichnung', nummer: '340' },
      ],
      belassen: [
        { art: 'buero' },
        { art: 'druckprofil', name: 'Bieterversand (erfunden)' },
        { art: 'kostengruppenbezeichnung', nummer: '330' },
      ],
    });
    const zweitesProfil = EINSTELLUNGEN.druckprofile[1];
    const kg340 = EINSTELLUNGEN.kostengruppenbezeichnungen[1];
    if (zweitesProfil === undefined || kg340 === undefined) throw new Error('Beispiel unvollständig');
    expect(await einstellungenVon(s)).toEqual({
      buero: lokal.buero,
      druckprofile: [...lokal.druckprofile, zweitesProfil],
      kostengruppenbezeichnungen: [
        lokal.kostengruppenbezeichnungen[0],
        kg340,
        lokal.kostengruppenbezeichnungen[1],
      ],
    });
  });

  it('eine Datei ohne Block (Schema bis 6 oder leere Einstellungen): einstellungen null, lokal bleibt alles', async () => {
    for (const text of [lese(6), await dateiMit(LEERE_EINSTELLUNGEN)]) {
      const { s } = await speicherMit(EINSTELLUNGEN);
      const r = wert(await einlesen(s, text));
      expect(r.einstellungen).toBeNull();
      expect(await einstellungenVon(s)).toEqual(EINSTELLUNGEN);
    }
  });

  it('projektdateiImportieren übernimmt ebenso (ohne Bericht); ein abgewiesenes Einlesen übernimmt nichts (atomar)', async () => {
    const text = await dateiMit(EINSTELLUNGEN);
    const { kern, s } = await speicherMit();
    expect(wert(await s.projektdateiImportieren(text))).toBe(f.projekt.id);
    expect(wert(kern.einstellungenLaden())).toEqual(EINSTELLUNGEN);
    const zweiter = await speicherMit();
    await speichere(zweiter.kern, anlegenSchritte(f));
    expect(await zweiter.s.projektdateiImportieren(text)).toMatchObject({
      ok: false,
      fehler: { code: 'existiert-bereits' },
    });
    expect(wert(zweiter.kern.einstellungenLaden())).toEqual(LEERE_EINSTELLUNGEN);
  });

  it('der Block wird streng geprüft (datei-ungueltig, nichts übernommen)', async () => {
    const d = JSON.parse(await dateiMit(EINSTELLUNGEN)) as Projektdatei & { einstellungen: Einstellungen };
    const e = d.einstellungen;
    const profil = e.druckprofile[0];
    const kg = e.kostengruppenbezeichnungen;
    if (profil === undefined || kg[0] === undefined || kg[1] === undefined)
      throw new Error('Beispiel unvollständig');
    const faelle: [string, unknown][] = [
      ['leerer Block', LEERE_EINSTELLUNGEN],
      ['unbekanntes Feld', { ...e, zusatz: 1 }],
      ['Büro ohne Namen', { ...e, buero: { ...e.buero, name: '' } }],
      ['Büro mit leerem Telefon', { ...e, buero: { ...e.buero, telefon: '' } }],
      [
        'Anschrift ohne jeden Teil',
        { ...e, buero: { ...e.buero, anschrift: { strasse: null, plz: null, ort: null } } },
      ],
      ['doppelter Profilname', { ...e, druckprofile: [profil, profil] }],
      ['Profil ohne Namen', { ...e, druckprofile: [{ ...profil, name: '' }] }],
      [
        'Langtext mit 0 Zeilen',
        { ...e, druckprofile: [{ ...profil, langtext: { art: 'zeilen', anzahl: 0 } }] },
      ],
      ['unbekannter Seitenrand', { ...e, druckprofile: [{ ...profil, seitenrand: 'breit' }] }],
      ['Kostengruppen ungeordnet', { ...e, kostengruppenbezeichnungen: [kg[1], kg[0]] }],
      ['Kostengruppe doppelt', { ...e, kostengruppenbezeichnungen: [kg[0], kg[0]] }],
      ['Kostengruppe in falscher Form', { ...e, kostengruppenbezeichnungen: [{ ...kg[0], nummer: '33' }] }],
      ['leere Bezeichnung', { ...e, kostengruppenbezeichnungen: [{ ...kg[0], bezeichnung: '' }] }],
    ];
    for (const [was, block] of faelle) {
      const { kern, s } = await speicherMit();
      const r = await s.projektdateiImportieren(JSON.stringify({ ...d, einstellungen: block }));
      expect(r, was).toMatchObject({ ok: false, fehler: { code: 'datei-ungueltig' } });
      expect(wert(kern.einstellungenLaden()), was).toEqual(LEERE_EINSTELLUNGEN);
    }
  });
});
