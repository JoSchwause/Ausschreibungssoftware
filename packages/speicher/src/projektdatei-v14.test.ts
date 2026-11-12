// SPDX-License-Identifier: AGPL-3.0-or-later
// Projektdatei mit Vertrag v1.4 (Ticket 79, G-56, A8): Aufmaßblätter, Rechnungen und Kostenermittlungen als drei optionale
// Listen (leer = weggelassen), Nachtragsangaben, Vorlage, Kostengruppe und Textquelle; Export → Import → Export
// byte-gleich; der Dekoder ist streng (eine Datei wird nie halb übernommen, Q5).

import type { Projektdatei } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import type { SpeicherKern } from './kern';
import { neuerKern, wert } from './testhilfe/node';
import { feldAendern, kopfAendern } from './testhilfe/umkehrung';
import {
  anwenden,
  aufmass,
  aufmassCs,
  AUFTRAG,
  F,
  frei,
  kostenermittlung,
  kostenermittlungCs,
  mitAuftrag,
  P,
  rechnung,
  rechnungCs,
} from './testhilfe/v14';

/** Das Fixture mit allem aus v1.4: Nachtragsangaben, Vorlage, Kostengruppe, Textquelle, zwei Blätter, zwei Rechnungen. */
async function mitAllem(): Promise<SpeicherKern> {
  const kern = await mitAuftrag();
  const p = F.lv.leistungsverzeichnis.knoten.find((k) => k.art === 'position');
  if (p?.art !== 'position') throw new Error('keine Position');
  wert(
    await anwenden(
      kern,
      kopfAendern(
        F.lv,
        { nachtrag: { auftragsLvId: AUFTRAG, nummer: 'N01', status: 'beauftragt' }, vorlage: true },
        '1.00',
      ),
    ),
  );
  const lv = wert(kern.lvLaden(F.lv.leistungsverzeichnis.id));
  wert(
    await anwenden(
      kern,
      feldAendern(lv, p.id, { ...p, kostengruppe: '330' as never, textquelle: 'eigener Text' }, '2.00'),
    ),
  );
  for (const n of [2, 1]) wert(await anwenden(kern, aufmassCs(null, aufmass(n))));
  // In der Datei steht AR 2 vor AR 1 (nach Kennung sortiert wäre es umgekehrt); der Import liest nach Nummer.
  const r1 = rechnung(1, [1], { id: 'rechnung-z' as never });
  const r2 = rechnung(2, [1, 2], { id: 'rechnung-a' as never });
  wert(await anwenden(kern, rechnungCs(null, r1)));
  wert(await anwenden(kern, rechnungCs(null, r2)));
  wert(await anwenden(kern, rechnungCs(r1, frei(r1))));
  wert(await anwenden(kern, rechnungCs(r2, frei(r2, '2.63'))));
  wert(await anwenden(kern, kostenermittlungCs(null, kostenermittlung(1))));
  return kern;
}

describe('Projektdatei mit Vertrag v1.4', () => {
  it('Export → Import → Export ist byte-gleich; die neuen Listen stehen nach Kennung in der Datei', async () => {
    const kern = await mitAllem();
    const text = wert(kern.projektdateiExportieren(P));
    const d = JSON.parse(text) as Projektdatei;
    expect(d.aufmasse?.map((z) => z.aufmass.id)).toEqual(['aufmass-1', 'aufmass-2']);
    expect(d.rechnungen?.map((z) => z.rechnung.id)).toEqual(['rechnung-a', 'rechnung-z']);
    expect(d.kostenermittlungen?.map((z) => z.kostenermittlung.id)).toEqual(['ke-1']);
    const zweite = await neuerKern();
    expect(wert(zweite.kern.projektdateiImportieren(text))).toBe(P);
    expect(wert(zweite.kern.projektdateiExportieren(P)) === text).toBe(true);
    expect(wert(zweite.kern.rechnungenAuflisten(AUFTRAG)).map((r) => r.nummer)).toEqual([1, 2]);
    expect(wert(zweite.kern.lvLaden(F.lv.leistungsverzeichnis.id))).toEqual(
      wert(kern.lvLaden(F.lv.leistungsverzeichnis.id)),
    );
  });

  it('ohne die neuen Aggregate fehlen die drei Listen in der Datei (fehlt = leer, A8)', async () => {
    const kern = await mitAuftrag();
    const d = JSON.parse(wert(kern.projektdateiExportieren(P))) as Record<string, unknown>;
    for (const liste of ['aufmasse', 'rechnungen', 'kostenermittlungen']) expect(d).not.toHaveProperty(liste);
  });

  type Pfad = (string | number)[];
  async function datei(): Promise<string> {
    return wert((await mitAllem()).projektdateiExportieren(P));
  }
  const aendere = (inhalt: string, pfad: Pfad, w: unknown): string => {
    const d = JSON.parse(inhalt) as Record<string | number, unknown>;
    let eltern = d;
    for (const s of pfad.slice(0, -1)) eltern = eltern[s] as Record<string | number, unknown>;
    const letzter = pfad[pfad.length - 1] as string | number;
    if (w === undefined) Reflect.deleteProperty(eltern, letzter);
    else eltern[letzter] = w;
    return JSON.stringify(d);
  };
  const lvKopf: Pfad = ['leistungsverzeichnisse', 0, 'leistungsverzeichnis'];
  const blatt: Pfad = ['aufmasse', 0, 'aufmass'];
  const ar: Pfad = ['rechnungen', 1, 'rechnung']; // rechnung-z, Nummer 1
  const ke: Pfad = ['kostenermittlungen', 0, 'kostenermittlung'];
  const pos = (inhalt: string): number =>
    (JSON.parse(inhalt) as Projektdatei).leistungsverzeichnisse[0]?.leistungsverzeichnis.knoten.findIndex(
      (k) => k.art === 'position' && k.kostengruppe !== undefined,
    ) ?? -1;

  it.each<[string, (d: string) => string]>([
    ['Kostengruppe 030', (d) => aendere(d, [...lvKopf, 'knoten', pos(d), 'kostengruppe'], '030')],
    ['Kostengruppe als Zahl', (d) => aendere(d, [...lvKopf, 'knoten', pos(d), 'kostengruppe'], 330)],
    ['Textquelle leer', (d) => aendere(d, [...lvKopf, 'knoten', pos(d), 'textquelle'], '')],
    ['Kostengruppe an einem Titel', (d) => aendere(d, [...lvKopf, 'knoten', 0, 'kostengruppe'], '330')],
    ['vorlage false', (d) => aendere(d, [...lvKopf, 'vorlage'], false)],
    ['Nachtragsnummer leer', (d) => aendere(d, [...lvKopf, 'nachtrag', 'nummer'], ' ')],
    ['Nachtragsstatus unbekannt', (d) => aendere(d, [...lvKopf, 'nachtrag', 'status'], 'erledigt')],
    ['Nachtrag auf ein fremdes Auftrags-LV', (d) => aendere(d, [...lvKopf, 'nachtrag', 'auftragsLvId'], 'x')],
    [
      'Nachtragsangaben am Auftrags-LV',
      (d) =>
        aendere(d, ['auftragsLeistungsverzeichnisse', 0, 'auftragsLeistungsverzeichnis', 'vorlage'], true),
    ],
    ['Blattnummer 0', (d) => aendere(d, [...blatt, 'nummer'], 0)],
    ['Blattnummer doppelt', (d) => aendere(d, [...blatt, 'nummer'], 2)],
    ['Blatt ohne Datum', (d) => aendere(d, [...blatt, 'datum'], undefined)],
    ['Aufmaßzeile mit leerem Ansatz', (d) => aendere(d, [...blatt, 'positionen', 0, 'mengenansatz'], [])],
    ['Aufmaßzeile mit Menge 1,5', (d) => aendere(d, [...blatt, 'positionen', 1, 'menge'], '1.5')],
    [
      'zwei Zeilen zu einer Position',
      (d) =>
        aendere(
          d,
          [...blatt, 'positionen', 1, 'positionId'],
          (JSON.parse(d) as Projektdatei).aufmasse?.[0]?.aufmass.positionen[0]?.positionId,
        ),
    ],
    ['Blatt eines fremden Auftrags-LV', (d) => aendere(d, [...blatt, 'auftragsLvId'], 'fremd')],
    ['Blatt eines fremden Projekts', (d) => aendere(d, [...blatt, 'projektId'], 'fremd')],
    ['Rechnungsart unbekannt', (d) => aendere(d, [...ar, 'art'], 'teilschluss')],
    [
      'gefordert mit drei null',
      (d) => aendere(d, [...ar, 'gefordert'], { netto: null, brutto: null, zahlbetrag: null }),
    ],
    ['gefordert ohne Zahlbetrag', (d) => aendere(d, [...ar, 'gefordert'], { netto: '1.00', brutto: null })],
    [
      'Rechnungsnummer des Auftragnehmers leer',
      (d) => aendere(d, [...ar, 'rechnungsnummerAuftragnehmer'], ''),
    ],
    ['aufmassIds doppelt', (d) => aendere(d, [...ar, 'aufmassIds'], ['aufmass-1', 'aufmass-1'])],
    ['aufmassIds mit unbekanntem Blatt', (d) => aendere(d, [...ar, 'aufmassIds'], ['aufmass-9'])],
    ['Umlage mit Satz 0,5', (d) => aendere(d, [...ar, 'umlagen', 0, 'satz'], '0.5')],
    ['Freigabe ohne Zahlbetrag', (d) => aendere(d, [...ar, 'freigabe'], {})],
    ['AR 1 offen, AR 2 freigegeben (D-34 (7))', (d) => aendere(d, [...ar, 'freigabe'], null)],
    ['Kostenermittlungsstufe unbekannt', (d) => aendere(d, [...ke, 'stufe'], 'budget')],
    ['Kostenermittlung mit doppelter Nummer', (d) => aendere(d, [...ke, 'eintraege', 1, 'nummer'], '330')],
    ['Kostenermittlung nicht nach Nummer', (d) => aendere(d, [...ke, 'eintraege', 0, 'nummer'], '999')],
    [
      'Kostenermittlungseintrag mit leerer Bemerkung',
      (d) => aendere(d, [...ke, 'eintraege', 0, 'bemerkung'], ''),
    ],
    ['Kostenermittlungseintrag mit Betrag 15', (d) => aendere(d, [...ke, 'eintraege', 0, 'betrag'], '15')],
    [
      'Protokoll mit unbekannter Aggregatart',
      (d) => aendere(d, ['protokoll', 0, 'aggregat', 'art'], 'bieter'),
    ],
  ])('%s: datei-ungueltig, nichts übernommen', async (_name, aenderung) => {
    const text = aenderung(await datei());
    const { kern, db } = await neuerKern();
    expect(kern.projektdateiImportieren(text)).toMatchObject({
      ok: false,
      fehler: { code: 'datei-ungueltig' },
    });
    expect(db.zeilen('SELECT COUNT(*) AS n FROM projekt')[0]?.['n']).toBe(0);
  });
});
