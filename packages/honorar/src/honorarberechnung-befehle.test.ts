// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle an der Honorarberechnung (Ticket 110; vertrag v1.6 Punkt 5, D-97.12): Ausführen, Anwenden, Umkehren. Der Ausführer
// prüft nur die Form (`ungueltige-eingabe` mit `feld`); was die HOAI anders vorsieht, nimmt er an: Das ist ein Befund der
// Rechnung (U5, D-64). ChangeSet jedes Befehls: die ganze Honorarberechnung vorher und nachher.

import type {
  Befehlsfehler,
  Ergebnis,
  Honorarberechnung,
  HonorarberechnungBefehl,
  HonorarberechnungChangeSet,
  Honorarobjekt,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import {
  beispielChangeSetHonorarberechnungSetzen,
  beispielHonorarbefehle,
  beispielHonorarberechnung,
} from '../../vertrag/src/beispiele';
import {
  honorarberechnungBefehlAusfuehren,
  honorarberechnungChangeSetAnwenden,
  honorarberechnungChangeSetUmkehren,
} from './index';

const [ANLEGEN, SETZEN, LOESCHEN] = beispielHonorarbefehle;
const H = beispielHonorarberechnung;
const ZUSTAND = { honorarberechnung: H };
const OBJEKT = H.objekte[0] as Honorarobjekt;

function ok(e: Ergebnis<HonorarberechnungChangeSet, Befehlsfehler>): HonorarberechnungChangeSet {
  if (!e.ok) throw new Error(`abgewiesen: ${e.fehler.code} ${e.fehler.feld ?? ''} ${e.fehler.meldung}`);
  return e.wert;
}

/** Code und Feld des Fehlers, `null` bei Annahme. */
function abgewiesen(
  e: Ergebnis<HonorarberechnungChangeSet, Befehlsfehler>,
): [string, string | undefined] | null {
  return e.ok ? null : [e.fehler.code, e.fehler.feld];
}

/** Setzt den Inhalt der Beispielberechnung mit den Änderungen `teile`. */
const setzen = (teile: Partial<Honorarberechnung>): HonorarberechnungBefehl => {
  const x = { ...H, ...teile };
  return {
    art: 'HonorarberechnungSetzen',
    name: x.name,
    objekte: x.objekte,
    nebenkosten: x.nebenkosten,
    mwstSatz: x.mwstSatz,
  };
};
/** Setzt ein Objekt mit den Änderungen `teile` (ungeprüft, wie aus Protokoll oder Datei). */
const mitObjekt = (teile: Record<string, unknown>): HonorarberechnungBefehl =>
  setzen({ objekte: [{ ...OBJEKT, ...teile }] });

describe('Ausführen', () => {
  it('Anlegen: ChangeSet von null zur ganzen Honorarberechnung', () => {
    expect(ok(honorarberechnungBefehlAusfuehren(null, ANLEGEN))).toEqual({
      art: 'honorarberechnung',
      honorarberechnungId: H.id,
      honorarberechnung: { vorher: null, nachher: H },
    });
  });

  it('Setzen: der ganze Inhalt, Kennung und Projekt bleiben (Beispiel des Vertrags)', () => {
    expect(ok(honorarberechnungBefehlAusfuehren(ZUSTAND, SETZEN))).toEqual(
      beispielChangeSetHonorarberechnungSetzen,
    );
  });

  it('Setzen: Nebenkosten und MwSt-Satz', () => {
    const cs = ok(
      honorarberechnungBefehlAusfuehren(
        ZUSTAND,
        setzen({ nebenkosten: { art: 'betrag', betrag: '1000.00' as never }, mwstSatz: '7.00' as never }),
      ),
    );
    expect(cs.honorarberechnung.nachher).toEqual({
      ...H,
      nebenkosten: { art: 'betrag', betrag: '1000.00' },
      mwstSatz: '7.00',
    });
  });

  it('Löschen: ChangeSet zur ganzen Honorarberechnung nach null', () => {
    expect(ok(honorarberechnungBefehlAusfuehren(ZUSTAND, LOESCHEN)).honorarberechnung).toEqual({
      vorher: H,
      nachher: null,
    });
  });

  it('Anlegen auf einer bestehenden, Setzen und Löschen ohne Honorarberechnung: befehl-nicht-zustaendig', () => {
    expect(abgewiesen(honorarberechnungBefehlAusfuehren(ZUSTAND, ANLEGEN))).toEqual([
      'befehl-nicht-zustaendig',
      undefined,
    ]);
    expect(abgewiesen(honorarberechnungBefehlAusfuehren(null, SETZEN))?.[0]).toBe('befehl-nicht-zustaendig');
    expect(abgewiesen(honorarberechnungBefehlAusfuehren(null, LOESCHEN))?.[0]).toBe(
      'befehl-nicht-zustaendig',
    );
  });
});

describe('Form: ungueltige-eingabe mit Feld', () => {
  it.each<[string, Partial<Honorarberechnung>, string]>([
    ['Kennung leer', { id: '' as never }, 'id'],
    ['Projekt leer', { projektId: '' as never }, 'projektId'],
    ['Name leer', { name: '' }, 'name'],
    ['Name nur Leerraum', { name: '  ' }, 'name'],
    ['Objekte keine Liste', { objekte: null as never }, 'objekte'],
    [
      'Nebenkostensatz nicht kanonisch',
      { nebenkosten: { art: 'prozent', satz: '5' as never } },
      'nebenkosten',
    ],
    ['Nebenkosten unbekannter Art', { nebenkosten: { art: 'pauschal' } as never }, 'nebenkosten'],
    [
      'Nebenkostenbetrag nicht kanonisch',
      { nebenkosten: { art: 'betrag', betrag: '1.5' as never } },
      'nebenkosten',
    ],
    ['MwSt-Satz nicht kanonisch', { mwstSatz: '19' as never }, 'mwstSatz'],
  ])('Anlegen: %s', (_, teile, feld) => {
    const befehl: HonorarberechnungBefehl = {
      art: 'HonorarberechnungAnlegen',
      honorarberechnung: { ...H, ...teile },
    };
    expect(abgewiesen(honorarberechnungBefehlAusfuehren(null, befehl))).toEqual(['ungueltige-eingabe', feld]);
  });

  it.each<[string, Record<string, unknown>, string]>([
    ['Bezeichnung leer', { bezeichnung: '' }, 'bezeichnung'],
    ['Leistungsbild unbekannt', { leistungsbild: 'flaechenplanung' }, 'leistungsbild'],
    ['Honorarzone unbekannt', { honorarzone: 'VI' }, 'honorarzone'],
    ['Honorarsatz nicht kanonisch', { honorarsatz: '50' }, 'honorarsatz'],
    ['Umbauzuschlagssatz nicht kanonisch', { umbauzuschlagssatz: '20' }, 'umbauzuschlagssatz'],
    ['Leistungsphasen keine Liste', { leistungsphasen: {} }, 'leistungsphasen'],
    ['Leistungsphase 10', { leistungsphasen: [{ nummer: 10 }] }, 'leistungsphasen'],
    ['Leistungsphase 0', { leistungsphasen: [{ nummer: 0 }] }, 'leistungsphasen'],
    ['Leistungsphase doppelt', { leistungsphasen: [{ nummer: 1 }, { nummer: 1 }] }, 'leistungsphasen'],
    ['Leistungsphasen absteigend', { leistungsphasen: [{ nummer: 2 }, { nummer: 1 }] }, 'leistungsphasen'],
    ['Anteil nicht kanonisch', { leistungsphasen: [{ nummer: 1, anteil: '2' }] }, 'leistungsphasen'],
    [
      'anrechenbare Kosten als Beträge nach DIN 276 (nicht die gespeicherte Form)',
      {
        anrechenbareKosten: {
          art: 'din-276',
          kg300: '1.00',
          kg400: '1.00',
          technischeAnlagenAnteilig: true,
          weitereKosten: '0.00',
          mitzuverarbeitendeBausubstanz: '0.00',
        },
      },
      'anrechenbareKosten',
    ],
    [
      'Betrag von Hand nicht kanonisch',
      { anrechenbareKosten: { art: 'betrag', betrag: '1' } },
      'anrechenbareKosten',
    ],
    [
      'Kennung der Kostenermittlung leer',
      { anrechenbareKosten: { ...OBJEKT.anrechenbareKosten, kostenermittlungId: '' } },
      'anrechenbareKosten',
    ],
    [
      'technischeAnlagenAnteilig kein Wahrheitswert',
      { anrechenbareKosten: { ...OBJEKT.anrechenbareKosten, technischeAnlagenAnteilig: 'ja' } },
      'anrechenbareKosten',
    ],
    [
      'weitere Kosten nicht kanonisch',
      { anrechenbareKosten: { ...OBJEKT.anrechenbareKosten, weitereKosten: '18000' } },
      'anrechenbareKosten',
    ],
    [
      'Bausubstanz nicht kanonisch',
      { anrechenbareKosten: { ...OBJEKT.anrechenbareKosten, mitzuverarbeitendeBausubstanz: '1e4' } },
      'anrechenbareKosten',
    ],
  ])('Objekt: %s', (_, teile, feld) => {
    expect(abgewiesen(honorarberechnungBefehlAusfuehren(ZUSTAND, mitObjekt(teile)))).toEqual([
      'ungueltige-eingabe',
      `objekte[1].${feld}`,
    ]);
  });

  it('das Feld nennt das Objekt mit seiner Stelle (ab 1)', () => {
    const befehl = setzen({ objekte: [OBJEKT, { ...OBJEKT, bezeichnung: '' }] });
    expect(abgewiesen(honorarberechnungBefehlAusfuehren(ZUSTAND, befehl))).toEqual([
      'ungueltige-eingabe',
      'objekte[2].bezeichnung',
    ]);
  });
});

describe('Was die HOAI nicht vorsieht, ist kein Fehler des Ausführers (U5, D-97.12)', () => {
  it.each<[string, Record<string, unknown>]>([
    ['Honorarsatz über 100', { honorarsatz: '120.00' }],
    ['Honorarsatz unter 0', { honorarsatz: '-5.00' }],
    ['Zone, die das Leistungsbild nicht hat', { leistungsbild: 'technische-ausruestung', honorarzone: 'V' }],
    [
      'Phase, die das Leistungsbild nicht hat',
      { leistungsbild: 'tragwerksplanung', leistungsphasen: [{ nummer: 9 }] },
    ],
    ['Umbauzuschlag über der Grenze', { umbauzuschlagssatz: '80.00' }],
    ['negativer Betrag', { anrechenbareKosten: { art: 'betrag', betrag: '-1.00' } }],
    ['abweichender Anteil', { leistungsphasen: [{ nummer: 8, anteil: '30.00' }] }],
    ['keine Leistungsphase', { leistungsphasen: [] }],
    ['ohne Umbauzuschlag', { umbauzuschlagssatz: null }],
  ])('%s: angenommen', (_, teile) => {
    expect(abgewiesen(honorarberechnungBefehlAusfuehren(ZUSTAND, mitObjekt(teile)))).toBeNull();
  });

  it('negative Nebenkosten und MwSt-Satz, keine Nebenkosten: angenommen', () => {
    for (const teile of [
      { nebenkosten: { art: 'prozent' as const, satz: '-1.00' as never } },
      { mwstSatz: '-19.00' as never },
      { nebenkosten: null },
    ])
      expect(abgewiesen(honorarberechnungBefehlAusfuehren(ZUSTAND, setzen(teile)))).toBeNull();
  });
});

describe('gespeicherte Form', () => {
  it('genau die Felder des Vertrags: fremde Felder fallen weg, ein fehlender Anteil bleibt ohne Schlüssel', () => {
    const objekt = {
      ...OBJEKT,
      fremd: 1,
      anrechenbareKosten: { art: 'betrag', betrag: '500000.00', fremd: 2 },
      leistungsphasen: [{ nummer: 1, anteil: undefined, fremd: 3 }],
    } as unknown as Honorarobjekt;
    const cs = ok(honorarberechnungBefehlAusfuehren(ZUSTAND, setzen({ objekte: [objekt] })));
    expect(JSON.stringify(cs.honorarberechnung.nachher?.objekte)).toBe(
      JSON.stringify([
        {
          bezeichnung: OBJEKT.bezeichnung,
          leistungsbild: OBJEKT.leistungsbild,
          honorarzone: OBJEKT.honorarzone,
          honorarsatz: OBJEKT.honorarsatz,
          anrechenbareKosten: { art: 'betrag', betrag: '500000.00' },
          leistungsphasen: [{ nummer: 1 }],
          umbauzuschlagssatz: OBJEKT.umbauzuschlagssatz,
        },
      ]),
    );
  });
});

describe('Anwenden und Umkehren', () => {
  it('Anwenden ergibt den Stand nachher; Löschen ergibt null', () => {
    const angelegt = ok(honorarberechnungBefehlAusfuehren(null, ANLEGEN));
    expect(honorarberechnungChangeSetAnwenden(null, angelegt)).toEqual(ZUSTAND);
    const geloescht = ok(honorarberechnungBefehlAusfuehren(ZUSTAND, LOESCHEN));
    expect(honorarberechnungChangeSetAnwenden(ZUSTAND, geloescht)).toBeNull();
  });

  it.each([
    ['Anlegen', null, ANLEGEN],
    ['Setzen', ZUSTAND, SETZEN],
    ['Löschen', ZUSTAND, LOESCHEN],
  ] as const)(
    '%s: die Umkehrung stellt den Stand vorher wieder her (Undo), zweimal umgekehrt ist das Original',
    (_, vorher, befehl) => {
      const cs = ok(honorarberechnungBefehlAusfuehren(vorher, befehl));
      const nachher = honorarberechnungChangeSetAnwenden(vorher, cs);
      const umgekehrt = honorarberechnungChangeSetUmkehren(cs);
      expect(umgekehrt.honorarberechnungId).toBe(H.id);
      expect(honorarberechnungChangeSetAnwenden(nachher, umgekehrt)).toEqual(vorher);
      expect(honorarberechnungChangeSetUmkehren(umgekehrt)).toEqual(cs);
    },
  );
});
