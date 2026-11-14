// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 147: „Beispielprojekt laden“ über die Befehlswege der App gegen echten Speicher (In-Memory-SQLite). `lesen` ist hier
// `bauwerksmodellLesen` direkt (in der App im Worker). Die erwarteten Zahlen stehen in den Fixtures (`typisch.json`,
// `typisch-angebote.json`, `typisch-abrechnung.json`, `typisch-bim.json`), nie aus einem Lauf der App.

import { readFileSync } from 'node:fs';
import { bauwerksmodellLesen } from '@tethys/ifc';
import type { ProjektId, Speicher } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { befehlswegFuer } from '../lv/befehlsweg';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import { beispielprojektAnlegen, type Beispielquelle } from './beispielprojekt';

const datei = (pfad: string): Buffer =>
  readFileSync(new URL(`../../../../fixtures/${pfad}`, import.meta.url));
const json = (pfad: string): unknown => JSON.parse(datei(pfad).toString('utf8'));

const quelle: Beispielquelle = {
  lv: datei('typisch.json').toString('utf8'),
  angebote: datei('typisch-angebote.json').toString('utf8'),
  abrechnung: datei('typisch-abrechnung.json').toString('utf8'),
  modell: { dateiname: 'haus-v1.ifc', bytes: new Uint8Array(datei('ifc/haus-v1.ifc')) },
};

const lesen = (bytes: Uint8Array, kopf: Parameters<typeof bauwerksmodellLesen>[1]) =>
  Promise.resolve(bauwerksmodellLesen(bytes, kopf));

interface Summen {
  readonly netto: string;
  readonly nettoNachNachlass: string;
  readonly brutto: string;
}
const TYPISCH = json('typisch.json') as {
  readonly name: string;
  readonly knoten: readonly { readonly id: string }[];
  readonly sollwerte: { readonly summen: Summen };
};
const ANGEBOTE = json('typisch-angebote.json') as {
  readonly bieter: readonly { readonly id: string; readonly name: string }[];
  readonly angebote: readonly {
    readonly bieterId: string;
    readonly sollwerte: { readonly summen: Summen };
  }[];
};
const ABRECHNUNG = json('typisch-abrechnung.json') as {
  readonly zuschlag: { readonly bieterName: string; readonly sollwerte: { readonly summen: Summen } };
  readonly aufmasse: readonly {
    readonly aufmass: {
      readonly positionen: readonly { readonly positionId: string; readonly menge: string }[];
    };
  }[];
  readonly rechnungen: readonly {
    readonly rechnungsnummerAuftragnehmer: string;
    readonly umlagen: readonly { readonly bezeichnung: string; readonly satz: string }[];
    readonly sicherheitSatz: string;
    readonly eingang: string;
  }[];
};
const BIM = json('typisch-bim.json') as { readonly bauteile: { readonly v1: readonly unknown[] } };

const summenAus = (s: {
  readonly netto: string;
  readonly nettoNachNachlass: string;
  readonly brutto: string;
}) => ({
  netto: s.netto,
  nettoNachNachlass: s.nettoNachNachlass,
  brutto: s.brutto,
});

async function wert<T>(
  r: Promise<{ ok: true; wert: T } | { ok: false; fehler: { code: string; meldung: string } }>,
): Promise<T> {
  const x = await r;
  if (!x.ok) throw new Error(`Speicher: ${x.fehler.code} ${x.fehler.meldung}`);
  return x.wert;
}

/** Alles, was zum Projekt im Speicher steht, gelesen über die Repositories (wie die Seiten der App). */
async function inhalt(speicher: Speicher, projektId: ProjektId) {
  const projekt = await wert(speicher.projekte.laden(projektId));
  const [lvUebersicht] = await wert(speicher.leistungsverzeichnisse.auflisten(projektId));
  if (lvUebersicht === undefined) throw new Error('kein LV');
  const lv = await wert(speicher.leistungsverzeichnisse.laden(lvUebersicht.id));
  const angebote = await Promise.all(
    (await wert(speicher.angebote.auflisten(lvUebersicht.id))).map((id) => wert(speicher.angebote.laden(id))),
  );
  const auftraege = await wert(speicher.auftragsLeistungsverzeichnisse.auflisten(projektId));
  const auftrag =
    auftraege[0] === undefined
      ? null
      : await wert(speicher.auftragsLeistungsverzeichnisse.laden(auftraege[0].id));
  const blaetter =
    auftrag === null ? [] : await wert(speicher.aufmasse.auflisten(auftrag.auftragsLeistungsverzeichnis.id));
  const blatt = blaetter[0] === undefined ? null : await wert(speicher.aufmasse.laden(blaetter[0].id));
  const rechnungen =
    auftrag === null
      ? []
      : await wert(speicher.rechnungen.auflisten(auftrag.auftragsLeistungsverzeichnis.id));
  const modelle = await wert(speicher.bauwerksmodelle.auflisten(projektId));
  const protokoll = await wert(speicher.protokoll(projektId));
  return { projekt, lv, angebote, auftraege, auftrag, blaetter, blatt, rechnungen, modelle, protokoll };
}

describe('Beispielprojekt laden', () => {
  it('legt das Projekt mit LV, drei Angeboten, Zuschlag, Aufmaßblatt, Rechnung und Modell an, alles über Befehle', async () => {
    const speicher = await speicherImSpeicher();
    const u = testUmgebung(speicher);
    const e = await beispielprojektAnlegen(u, quelle, lesen);
    expect(e.ok).toBe(true);
    if (!e.ok) return;
    const x = await inhalt(speicher, e.projektId);

    // LV „typisch“ mit den Summen der Fixture
    expect(x.lv.leistungsverzeichnis.name).toBe(TYPISCH.name);
    expect(summenAus(x.lv.summen.gesamt)).toEqual(summenAus(TYPISCH.sollwerte.summen));
    expect(x.lv.leistungsverzeichnis.knoten).toHaveLength(30);

    // drei Bieter mit je einem Angebot; Summen je Bieter wie in der Fixture
    expect(x.projekt.bieter.map((b) => b.name)).toEqual(ANGEBOTE.bieter.map((b) => b.name));
    const sollJeBieter = new Map(
      ANGEBOTE.angebote.map((a) => [
        ANGEBOTE.bieter.find((b) => b.id === a.bieterId)?.name,
        summenAus(a.sollwerte.summen),
      ]),
    );
    const istJeBieter = new Map(
      x.angebote.map((a) => [
        x.projekt.bieter.find((b) => b.id === a.angebot.bieterId)?.name,
        summenAus(a.summen.gesamt),
      ]),
    );
    expect(istJeBieter).toEqual(sollJeBieter);

    // Zuschlag an den Bieter der Fixture, Auftrags-LV mit dessen Summen
    expect(x.auftraege).toHaveLength(1);
    const auftrag = x.auftrag;
    if (auftrag === null) throw new Error('kein Auftrags-LV');
    expect(auftrag.auftragsLeistungsverzeichnis.auftragnehmer?.name).toBe(ABRECHNUNG.zuschlag.bieterName);
    expect(summenAus(auftrag.summen.gesamt)).toEqual(summenAus(ABRECHNUNG.zuschlag.sollwerte.summen));
    // Kostengruppen aus der Abrechnungs-Fixture, mit dem Zuschlag ins Auftrags-LV übernommen
    const kg = new Map(
      auftrag.auftragsLeistungsverzeichnis.knoten.flatMap((k) =>
        k.art === 'position' ? [[k.ordnungszahl, k.kostengruppe ?? null] as const] : [],
      ),
    );
    expect([kg.get('01.0010' as never), kg.get('02.0040' as never), kg.get('03.0070' as never)]).toEqual([
      '391',
      '322',
      null,
    ]);

    // ein Aufmaßblatt: die Zeilen von Blatt 1 der Fixture ohne die Nachtragsposition (es gibt keinen Nachtrag)
    const imLv = new Set(TYPISCH.knoten.map((k) => k.id));
    const [blatt1] = ABRECHNUNG.aufmasse;
    const sollMengen = (blatt1?.aufmass.positionen ?? [])
      .filter((p) => imLv.has(p.positionId))
      .map((p) => p.menge);
    expect(sollMengen).toHaveLength(5);
    expect(x.blaetter).toHaveLength(1);
    expect(x.blatt?.aufmass.positionen.map((p) => p.menge)).toEqual(sollMengen);

    // eine Abschlagsrechnung über das Blatt, nicht freigegeben, mit Umlage und Sicherheitseinbehalt der Fixture
    const [soll] = ABRECHNUNG.rechnungen;
    if (soll === undefined) throw new Error('keine Rechnung in der Fixture');
    expect(x.rechnungen).toHaveLength(1);
    expect(x.rechnungen[0]).toMatchObject({
      nummer: 1,
      art: 'abschlag',
      eingang: soll.eingang,
      rechnungsnummerAuftragnehmer: soll.rechnungsnummerAuftragnehmer,
      umlagen: soll.umlagen,
      sicherheitSatz: soll.sicherheitSatz,
      aufmassIds: x.blaetter.map((b) => b.id),
      freigabe: null,
    });

    // das Haus als Bauwerksmodell
    expect(x.modelle.map((m) => [m.name, m.anzahlBauteile])).toEqual([['haus-v1', BIM.bauteile.v1.length]]);

    // jeder Schritt ist ein Befehl im Befehlsprotokoll (Massenbefehle als Kurzfassung mit ihrem Kopf, E-13)
    const arten = x.protokoll.map((p) =>
      p.befehl.art === 'Befehlskurzfassung' ? p.befehl.kopf.art : p.befehl.art,
    );
    expect(arten).toEqual([
      'ProjektAnlegen',
      'LeistungsverzeichnisAnlegen',
      'BieterAnlegen',
      'AngebotAnlegen',
      'BieterAnlegen',
      'AngebotAnlegen',
      'BieterAnlegen',
      'AngebotAnlegen',
      'AuftragsLeistungsverzeichnisAnlegen',
      'AufmassAnlegen',
      'RechnungAnlegen',
      'BauwerksmodellAnlegen',
    ]);
  });

  it('ist ein Undo-Schritt: Rückgängig nimmt das ganze Beispielprojekt zurück', async () => {
    const speicher = await speicherImSpeicher();
    const u = testUmgebung(speicher);
    const weg = befehlswegFuer(u);
    const e = await beispielprojektAnlegen(u, quelle, lesen);
    expect(e.ok).toBe(true);
    expect(weg.historie.tiefe).toEqual({ rueck: 1, vor: 0 });
    const r = await weg.rueckgaengig();
    expect(r.ok).toBe(true);
    expect(await wert(speicher.projekte.auflisten())).toEqual([]);
  });

  it('lässt sich mehrmals laden: jedes Mal ein eigenes Projekt mit neuen Kennungen', async () => {
    const speicher = await speicherImSpeicher();
    const u = testUmgebung(speicher);
    const a = await beispielprojektAnlegen(u, quelle, lesen);
    const b = await beispielprojektAnlegen(u, quelle, lesen);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.projektId).not.toBe(b.projektId);
    const [x, y] = await Promise.all([inhalt(speicher, a.projektId), inhalt(speicher, b.projektId)]);
    expect(x.lv.leistungsverzeichnis.id).not.toBe(y.lv.leistungsverzeichnis.id);
    expect(y.rechnungen).toHaveLength(1);
    expect(y.modelle).toHaveLength(1);
  });
});
