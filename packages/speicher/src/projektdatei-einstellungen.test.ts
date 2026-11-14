// SPDX-License-Identifier: AGPL-3.0-or-later
// Projektdatei Schema 7 und die Einstellungen (v1.7a, Ticket 139; E15, D-73, D-127.9, D-82 M1): Der Export trägt die Einstellungen
// des Geräts als Block (fehlt, wenn sie leer sind). Das Einlesen übernimmt sie nur mit dem Kopf eines Eintrags im
// Einstellungsprotokoll (`einstellungsuebernahme`), als protokollierter Befehl `EinstellungenUebernehmen`: Es füllt nur Fehlendes
// je Schlüssel, überschreibt nie und berichtet, was übernommen und was belassen wurde. Alles atomar mit dem Projekt (Q5).

import { readFileSync } from 'node:fs';
import {
  LEERE_EINSTELLUNGEN,
  type Einstellungen,
  type EinstellungenProtokolleintrag,
  type Kostengruppennummer,
  type ProjektdateiEinleseoptionen,
  type Projektdatei,
  type ProtokollId,
  type Speicher,
} from '@tethys/vertrag';
import { einstellungenBefehlAusfuehren } from '@tethys/kern';
import { describe, expect, it } from 'vitest';
import { direktTransport, speicherUeberTransport } from './client';
import type { SpeicherKern } from './kern';
import { anlegenSchritte, ladeFixture, NUTZER, ZEIT } from './testhilfe/fixtures';
import { neuerKern, speichere, wert } from './testhilfe/node';
import { DRUCKPROFIL, EINSTELLUNGEN } from './testhilfe/v17';

const lese = (n: number): string =>
  readFileSync(new URL(`../fixtures/projektdatei-v${String(n)}.json`, import.meta.url), 'utf8');

const f = ladeFixture('winzig');
const KOPF: Pick<EinstellungenProtokolleintrag, 'id' | 'wer' | 'wann'> = {
  id: 'uebernahme-1' as ProtokollId,
  wer: NUTZER,
  wann: ZEIT,
};
const MIT_UEBERNAHME: ProjektdateiEinleseoptionen = { einstellungsuebernahme: KOPF };

async function speicherMit(
  e: Einstellungen = LEERE_EINSTELLUNGEN,
): Promise<{ kern: SpeicherKern; s: Speicher }> {
  const { kern } = await neuerKern();
  if (e !== LEERE_EINSTELLUNGEN)
    wert(
      await kern.einstellungenAnwenden(
        {
          id: 'lokal-1' as ProtokollId,
          wer: NUTZER,
          wann: ZEIT,
          befehl: { art: 'BueroSetzen', buero: e.buero },
        },
        { art: 'einstellungen', einstellungen: { vorher: LEERE_EINSTELLUNGEN, nachher: e } },
      ),
    );
  return { kern, s: speicherUeberTransport(direktTransport(kern), null) };
}

/** `Speicher.projektdateiEinlesen` (im Vertrag optional; `speicher` liefert es seit Ticket 139). */
function einlesen(
  s: Speicher,
  inhalt: string,
  optionen?: ProjektdateiEinleseoptionen,
): ReturnType<NonNullable<Speicher['projektdateiEinlesen']>> {
  if (s.projektdateiEinlesen === undefined) throw new Error('projektdateiEinlesen fehlt');
  return s.projektdateiEinlesen(inhalt, optionen);
}

/** `Speicher.einstellungen` (im Vertrag optional). */
function einstellungenVon(s: Speicher): NonNullable<Speicher['einstellungen']> {
  if (s.einstellungen === undefined) throw new Error('Speicher.einstellungen fehlt');
  return s.einstellungen;
}

/** Die Projektdatei des Fixtures `winzig`, exportiert aus einem Speicher mit den Einstellungen `e`. */
async function dateiMit(e: Einstellungen): Promise<string> {
  const { kern } = await speicherMit(e);
  await speichere(kern, anlegenSchritte(f));
  return wert(kern.projektdateiExportieren(f.projekt.id));
}

describe('Projektdatei Schema 7: der Block der Einstellungen', () => {
  it('die Übernahme rechnet der Ausführer des Kerns (`EinstellungenUebernehmen`, D-87 (3))', async () => {
    const text = await dateiMit(EINSTELLUNGEN);
    const lokal: Einstellungen = {
      ...LEERE_EINSTELLUNGEN,
      druckprofile: [{ ...DRUCKPROFIL, mitPreisen: true }],
    };
    const { s } = await speicherMit(lokal);
    wert(await einlesen(s, text, MIT_UEBERNAHME));
    const erwartet = einstellungenBefehlAusfuehren(lokal, {
      art: 'EinstellungenUebernehmen',
      einstellungen: EINSTELLUNGEN,
    });
    if (!erwartet.ok) throw new Error(erwartet.fehler.meldung);
    expect(wert(await einstellungenVon(s).laden())).toEqual(erwartet.wert.einstellungen.nachher);
  });

  it('der Export trägt die Einstellungen; sind sie leer, fehlt der Block; das Einstellungsprotokoll steht nicht darin', async () => {
    const ohne = JSON.parse(await dateiMit(LEERE_EINSTELLUNGEN)) as Projektdatei;
    expect(ohne.schemaVersion).toBe(7);
    expect(ohne).not.toHaveProperty('einstellungen');
    const mit = JSON.parse(await dateiMit(EINSTELLUNGEN)) as Projektdatei;
    expect(mit.einstellungen).toEqual(EINSTELLUNGEN);
    expect(JSON.stringify(mit)).not.toContain('lokal-1');
  });

  it('Einlesen mit Kopf in einen Speicher ohne Einstellungen übernimmt alles und schreibt genau einen Eintrag', async () => {
    const text = await dateiMit(EINSTELLUNGEN);
    const { s } = await speicherMit();
    expect(wert(await einlesen(s, text, MIT_UEBERNAHME))).toEqual({
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
    expect(wert(await einstellungenVon(s).laden())).toEqual(EINSTELLUNGEN);
    expect(wert(await einstellungenVon(s).protokoll())).toEqual([
      { ...KOPF, befehl: { art: 'EinstellungenUebernehmen', einstellungen: EINSTELLUNGEN } },
    ]);
    // Das Projekt selbst bekommt dafür keinen Eintrag.
    expect(wert(await s.protokoll(f.projekt.id))).toHaveLength(anlegenSchritte(f).length);
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
    const bericht = wert(await einlesen(s, text, MIT_UEBERNAHME));
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
    expect(wert(await einstellungenVon(s).laden())).toEqual({
      buero: lokal.buero,
      druckprofile: [...lokal.druckprofile, zweitesProfil],
      kostengruppenbezeichnungen: [
        lokal.kostengruppenbezeichnungen[0],
        kg340,
        lokal.kostengruppenbezeichnungen[1],
      ],
    });
    expect(wert(await einstellungenVon(s).protokoll()).map((e) => e.befehl.art)).toEqual([
      'BueroSetzen',
      'EinstellungenUebernehmen',
    ]);
  });

  it('übernimmt es nichts (alles lokal schon da), berichtet es nur und schreibt keinen Eintrag', async () => {
    const text = await dateiMit(EINSTELLUNGEN);
    const { s } = await speicherMit(EINSTELLUNGEN);
    const r = wert(await einlesen(s, text, MIT_UEBERNAHME));
    expect(r.einstellungen?.uebernommen).toEqual([]);
    expect(r.einstellungen?.belassen).toHaveLength(5);
    expect(wert(await einstellungenVon(s).protokoll())).toHaveLength(1);
  });

  it('ohne Kopf, ohne Block oder mit projektdateiImportieren: einstellungen null (nichts übernommen), lokal bleibt alles', async () => {
    const text = await dateiMit(EINSTELLUNGEN);
    for (const [was, lesen] of [
      ['ohne Kopf', (s: Speicher) => einlesen(s, text)],
      ['Datei der Version 6', (s: Speicher) => einlesen(s, lese(6), MIT_UEBERNAHME)],
      [
        'leere Einstellungen',
        async (s: Speicher) => einlesen(s, await dateiMit(LEERE_EINSTELLUNGEN), MIT_UEBERNAHME),
      ],
    ] as const) {
      const { s } = await speicherMit();
      expect(wert(await lesen(s)).einstellungen, was).toBeNull();
      expect(wert(await einstellungenVon(s).laden()), was).toEqual(LEERE_EINSTELLUNGEN);
      expect(wert(await einstellungenVon(s).protokoll()), was).toEqual([]);
    }
    const { s } = await speicherMit();
    expect(wert(await s.projektdateiImportieren(text))).toBe(f.projekt.id);
    expect(wert(await einstellungenVon(s).laden())).toEqual(LEERE_EINSTELLUNGEN);
  });

  it('ein abgewiesenes Einlesen übernimmt nichts (atomar mit dem Projekt)', async () => {
    const text = await dateiMit(EINSTELLUNGEN);
    const { kern, s } = await speicherMit();
    await speichere(kern, anlegenSchritte(f));
    expect(await einlesen(s, text, MIT_UEBERNAHME)).toMatchObject({
      ok: false,
      fehler: { code: 'existiert-bereits' },
    });
    expect(wert(kern.einstellungenLaden())).toEqual(LEERE_EINSTELLUNGEN);
    expect(wert(kern.einstellungenProtokoll())).toEqual([]);
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
      const r = await einlesen(s, JSON.stringify({ ...d, einstellungen: block }), MIT_UEBERNAHME);
      expect(r, was).toMatchObject({ ok: false, fehler: { code: 'datei-ungueltig' } });
      expect(wert(kern.einstellungenLaden()), was).toEqual(LEERE_EINSTELLUNGEN);
    }
  });
});
