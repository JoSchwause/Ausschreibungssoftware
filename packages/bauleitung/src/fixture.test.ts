// SPDX-License-Identifier: AGPL-3.0-or-later
// Kettentest Tor X4 (D-58) auf `fixtures/bauleitung.json` (Ticket 112, D-112.5): alle Mängel und Einträge über die Befehle
// anlegen (gegen den wachsenden Bestand), dann Status, Nummernvergabe, Fristprüfung (auch am Stichtag), Mängelauswertung
// und Bautagebuch-Summen gegen die von Hand hergeleiteten Sollwerte. Die Formen der Datei sind die von `vertrag` v1.6.

import type { Bautagebucheintrag, Mangel, Mangelstatus, ProjektId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import {
  type Auftragnehmerangabe,
  bautagebuchAuswerten,
  bautagebucheintragBefehlAusfuehren,
  bautagebucheintragChangeSetAnwenden,
  fristPruefen,
  maengelAuswerten,
  mangelBefehlAusfuehren,
  mangelChangeSetAnwenden,
  mangelstatus,
  naechsteMangelnummer,
} from './index';
import { fixtureJson, wert } from './testhilfen';

interface Zahlen {
  readonly anzahl: number;
  readonly jeStatus: Record<Mangelstatus, number>;
  readonly offen: number;
  readonly ueberfaellig: number;
}
interface Tagebuchsoll {
  readonly von: string;
  readonly bis: string;
  readonly jeTag?: { datum: string; arbeitskraefte: number }[];
  readonly jeFirma: { firma: string; arbeitskraefte: number }[];
  readonly summe: number;
}
interface Fixture {
  readonly projektId: ProjektId;
  readonly auftraege: Auftragnehmerangabe[];
  readonly maengel: Mangel[];
  readonly bautagebuch: Bautagebucheintrag[];
  readonly stichtag: string;
  readonly sollwerte: {
    readonly naechsteMangelnummer: number;
    readonly status: { nummer: number; status: Mangelstatus }[];
    readonly fristpruefung: {
      readonly stichtag: string;
      readonly ueberfaellig: { mangelId: string; nummer: number; frist: string; status: Mangelstatus }[];
      readonly fristAmStichtag: { mangelId: string; nummer: number; frist: string; status: Mangelstatus }[];
    };
    readonly auswertungMaengel: {
      readonly stichtag: string;
      readonly jeAuftragnehmer: (Zahlen & { auftragsLvId: string; auftragnehmer: string })[];
      readonly gesamt: Zahlen;
    };
    readonly auswertungBautagebuch: Tagebuchsoll;
  };
  readonly gegenproben: {
    readonly stichtag20261127: { readonly stichtag: string; readonly ueberfaellig: number[] };
    readonly bautagebuch17bis19: Tagebuchsoll;
  };
}

const f = fixtureJson('bauleitung.json') as Fixture;

/** Alle Mängel der Datei über `MangelAnlegen`, jeder gegen den Bestand der vor ihm angelegten. */
function maengelAnlegen(): Mangel[] {
  const angelegt: Mangel[] = [];
  for (const m of f.maengel) {
    const bestand = angelegt.map(({ id, nummer }) => ({ id, nummer }));
    const cs = wert(mangelBefehlAusfuehren(null, { art: 'MangelAnlegen', mangel: m }, bestand));
    const z = mangelChangeSetAnwenden(null, cs);
    if (z === null) throw new Error('Anlegen ergab keinen Mangel');
    angelegt.push(z.mangel);
  }
  return angelegt;
}

function tagebuchAnlegen(): Bautagebucheintrag[] {
  const angelegt: Bautagebucheintrag[] = [];
  for (const e of f.bautagebuch) {
    const bestand = angelegt.map(({ id, datum }) => ({ id, datum }));
    const cs = wert(
      bautagebucheintragBefehlAusfuehren(null, { art: 'BautagebucheintragSetzen', eintrag: e }, bestand),
    );
    const z = bautagebucheintragChangeSetAnwenden(null, cs);
    if (z === null) throw new Error('Setzen ergab keinen Eintrag');
    angelegt.push(z.bautagebucheintrag);
  }
  return angelegt;
}

const nummerVon = (maengel: readonly Mangel[], id: string | undefined) =>
  maengel.find((m) => m.id === id)?.nummer;

describe('Tor X4: fixtures/bauleitung.json', () => {
  const maengel = maengelAnlegen();
  const tagebuch = tagebuchAnlegen();

  it('alle Mängel und Einträge der Datei werden unverändert angenommen', () => {
    expect(maengel).toEqual(f.maengel);
    expect(tagebuch).toEqual(f.bautagebuch);
  });

  it('Status je Mangel = letzter Verlaufseintrag; nächste Nummer', () => {
    expect(maengel.map((m) => ({ nummer: m.nummer, status: mangelstatus(m) }))).toEqual(f.sollwerte.status);
    expect(naechsteMangelnummer(maengel)).toBe(f.sollwerte.naechsteMangelnummer);
  });

  it('Fristprüfung zum Stichtag: genau die Sollwerte; die Frist am Stichtag ist nicht überfällig', () => {
    const soll = f.sollwerte.fristpruefung;
    expect(soll.stichtag).toBe(f.stichtag);
    const befunde = fristPruefen(maengel, f.stichtag);
    expect(befunde.map((b) => b.ort.mangelId)).toEqual(soll.ueberfaellig.map((u) => u.mangelId));
    expect(
      befunde.every((b) => b.quelle === 'fristpruefung' && b.code === 'mangel-frist-ueberschritten'),
    ).toBe(true);
    expect(befunde.every((b) => b.ort.feld === 'frist')).toBe(true);
    for (const amStichtag of soll.fristAmStichtag) {
      expect(amStichtag.frist).toBe(f.stichtag);
      expect(befunde.some((b) => b.ort.mangelId === amStichtag.mangelId)).toBe(false);
    }
  });

  it('Gegenprobe: einen Tag später ist auch der Mangel mit der Frist am Stichtag überfällig', () => {
    const g = f.gegenproben.stichtag20261127;
    expect(fristPruefen(maengel, g.stichtag).map((b) => nummerVon(maengel, b.ort.mangelId))).toEqual(
      g.ueberfaellig,
    );
  });

  it('Mängelauswertung je Auftragnehmer und gesamt', () => {
    const soll = f.sollwerte.auswertungMaengel;
    expect(maengelAuswerten(maengel, f.auftraege, soll.stichtag)).toEqual(soll);
  });

  it('Bautagebuch: Arbeitskräfte je Tag und je Firma im Zeitraum, mit Gegenprobe', () => {
    for (const soll of [f.sollwerte.auswertungBautagebuch, f.gegenproben.bautagebuch17bis19]) {
      const ist = bautagebuchAuswerten(tagebuch, soll.von, soll.bis);
      if (soll.jeTag !== undefined) expect(ist.jeTag).toEqual(soll.jeTag);
      expect(ist.jeFirma).toEqual(soll.jeFirma);
      expect(ist.arbeitskraefte).toBe(soll.summe);
    }
  });
});
