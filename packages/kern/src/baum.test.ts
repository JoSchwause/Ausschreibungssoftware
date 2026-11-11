// SPDX-License-Identifier: AGPL-3.0-or-later
// Beispieltests für den LV-Baum (Ticket 05): Anlegen, Einfügen nach X, Ebenen, Löschen, Verschieben, Fehlerwerte.
// Zuerst geschrieben (Q1). Property-Tests: `eigenschaften.test.ts`, Fixtures: `fixtures.test.ts`.

import { describe, expect, it, vi } from 'vitest';
import type {
  Befehlsfehlercode,
  Einfuegeort,
  Knoten,
  LvBefehl,
  LvZustand,
  Menge,
  Position,
  Titel,
} from '@tethys/vertrag';
import {
  LOS_ANNAHME,
  MAX_GLIEDERUNGSEBENEN,
  ZUSTAENDIGES_TICKET,
  lvBefehlAusfuehren,
  changeSetUmkehren,
  pruefeLvInvarianten,
} from './index';
import {
  ohneReihenfolge,
  anwenden,
  LV_ID,
  PROJEKT_ID,
  erwarteOk,
  id,
  inhalt,
  kinderIds,
  neuesLv,
  positionsdaten,
  wende,
  merkmale,
  wahlzuordnung,
  zuschlagsliste,
} from './testhilfen';

// --- Kurzschreibweisen für Befehle ---------------------------------------------------------------------------

const ende = (eltern: string): Einfuegeort => ({ art: 'ende', elternId: id.eltern(eltern) });
const anfang = (eltern: string): Einfuegeort => ({ art: 'anfang', elternId: id.eltern(eltern) });
const nach = (knoten: string): Einfuegeort => ({ art: 'nach', knotenId: id.knoten(knoten) });

const titel = (i: string, ort: Einfuegeort): LvBefehl => ({
  art: 'GliederungAnlegen',
  id: id.titel(i),
  gliederungsart: 'titel',
  ort,
  kurztext: `Titel ${i}`,
});
const los = (i: string, ort: Einfuegeort): LvBefehl => ({
  art: 'GliederungAnlegen',
  id: id.los(i),
  gliederungsart: 'los',
  ort,
  kurztext: `Los ${i}`,
});
const position = (i: string, ort: Einfuegeort): LvBefehl => ({
  art: 'PositionAnlegen',
  id: id.pos(i),
  ort,
  daten: positionsdaten(`Position ${i}`),
});
const hinweis = (i: string, ort: Einfuegeort): LvBefehl => ({
  art: 'HinweistextAnlegen',
  id: id.hinweis(i),
  ort,
  text: [{ art: 'text', text: `Hinweis ${i}` }],
});
const loesche = (i: string): LvBefehl => ({ art: 'KnotenLoeschen', knotenId: id.knoten(i) });
const verschiebe = (i: string, ziel: Einfuegeort): LvBefehl => ({
  art: 'KnotenVerschieben',
  knotenId: id.knoten(i),
  ziel,
});

function reihe(z: LvZustand | null, ...befehle: LvBefehl[]): LvZustand {
  let aktuell = z ?? neuesLv();
  for (const b of befehle) aktuell = wende(aktuell, b);
  return aktuell;
}

function fehlercode(z: LvZustand | null, b: LvBefehl): Befehlsfehlercode {
  const e = lvBefehlAusfuehren(z, b);
  if (e.ok) throw new Error(`Befehl wurde angenommen: ${b.art}`);
  return e.fehler.code;
}

/** T1 mit P1, P2, P3. */
const basis = (): LvZustand =>
  reihe(
    null,
    titel('T1', ende(LV_ID)),
    position('P1', ende('T1')),
    position('P2', ende('T1')),
    position('P3', ende('T1')),
  );

const knotenVon = (z: LvZustand, i: string): Knoten => {
  const k = z.leistungsverzeichnis.knoten.find((x) => x.id === i);
  if (!k) throw new Error(`Knoten fehlt: ${i}`);
  return k;
};

// --- LeistungsverzeichnisAnlegen ----------------------------------------------------------------------------

describe('LeistungsverzeichnisAnlegen', () => {
  it('legt ein leeres LV an; ChangeSet mit Kopf, ohne Knoten, mit den (null) Gesamtsummen', () => {
    const cs = erwarteOk(
      lvBefehlAusfuehren(null, {
        art: 'LeistungsverzeichnisAnlegen',
        id: LV_ID,
        projektId: PROJEKT_ID,
        inhalt: inhalt(),
      }),
    );
    expect(cs.art).toBe('leistungsverzeichnis');
    expect(cs.leistungsverzeichnisId).toBe(LV_ID);
    expect(cs.kopf?.vorher).toBeNull();
    expect(cs.kopf?.nachher).toMatchObject({ id: LV_ID, projektId: PROJEKT_ID, name: 'Testverzeichnis' });
    expect(cs.knoten).toEqual({ hinzugefuegt: [], geaendert: [], entfernt: [] });
    expect(cs.summen).toEqual({
      positionen: [],
      gliederungen: [],
      gesamt: {
        netto: '0.00',
        nachlass: '0.00',
        nettoNachNachlass: '0.00',
        mwst: '0.00',
        brutto: '0.00',
        summeBedarfOhneGesamtbetrag: '0.00',
        summeWahl: '0.00',
      },
      vorher: {
        positionen: [],
        gliederungen: [],
        gesamt: null,
        entfernt: { positionen: [], gliederungen: [] },
      },
    });
    const z = anwenden(null, cs);
    expect(z.leistungsverzeichnis.knoten).toEqual([]);
    expect(pruefeLvInvarianten(z.leistungsverzeichnis)).toEqual([]);
  });

  it('nimmt einen vollen Inhalt an und liefert hinzugefuegt mit Eltern vor Kindern', () => {
    // Absichtlich unsortiert angeliefert: Kind vor Elternknoten im Array.
    const kind: Position = {
      art: 'position',
      id: id.pos('P1'),
      elternId: id.eltern('T1'),
      reihenfolge: 0,
      ...positionsdaten('P1'),
    };
    const eltern: Titel = {
      art: 'titel',
      id: id.titel('T1'),
      elternId: id.eltern(LV_ID),
      reihenfolge: 0,
      ordnungszahl: null,
      kurztext: 'T1',
    };
    const cs = erwarteOk(
      lvBefehlAusfuehren(null, {
        art: 'LeistungsverzeichnisAnlegen',
        id: LV_ID,
        projektId: PROJEKT_ID,
        inhalt: inhalt([kind, eltern]),
      }),
    );
    expect(cs.knoten.hinzugefuegt.map((k) => k.id)).toEqual(['T1', 'P1']);
  });

  it('weist einen Zustand zurück, wenn das LV schon existiert, und andere Befehle ohne Zustand', () => {
    const z = neuesLv();
    expect(
      fehlercode(z, {
        art: 'LeistungsverzeichnisAnlegen',
        id: LV_ID,
        projektId: PROJEKT_ID,
        inhalt: inhalt(),
      }),
    ).toBe('befehl-nicht-zustaendig');
    expect(fehlercode(null, titel('T1', ende(LV_ID)))).toBe('befehl-nicht-zustaendig');
  });

  const anlegen = (knoten: Knoten[]): LvBefehl => ({
    art: 'LeistungsverzeichnisAnlegen',
    id: LV_ID,
    projektId: PROJEKT_ID,
    inhalt: inhalt(knoten),
  });
  const t = (i: string, eltern: string, r = 0): Titel => ({
    art: 'titel',
    id: id.titel(i),
    elternId: id.eltern(eltern),
    reihenfolge: r,
    ordnungszahl: null,
    kurztext: i,
  });
  const p = (i: string, eltern: string, r = 0, ueber: Partial<Position> = {}): Position => ({
    art: 'position',
    id: id.pos(i),
    elternId: id.eltern(eltern),
    reihenfolge: r,
    ...positionsdaten(i),
    ...ueber,
  });

  it('weist Zyklen, unbekannte Eltern, doppelte IDs und Lücken in der Reihenfolge ab', () => {
    expect(fehlercode(null, anlegen([t('A', 'B'), t('B', 'A')]))).toBe('zyklus');
    expect(fehlercode(null, anlegen([t('A', 'gibt-es-nicht')]))).toBe('eltern-unbekannt');
    expect(fehlercode(null, anlegen([t('A', LV_ID, 0), t('A', LV_ID, 1)]))).toBe('id-vergeben');
    expect(fehlercode(null, anlegen([t(LV_ID, LV_ID)]))).toBe('id-vergeben');
    expect(fehlercode(null, anlegen([t('A', LV_ID, 0), t('B', LV_ID, 2)]))).toBe('ungueltige-eingabe');
    expect(fehlercode(null, anlegen([t('A', LV_ID, 1)]))).toBe('ungueltige-eingabe');
  });

  it('weist Kinder unter Positionen und Hinweistexten und zu tiefe Bäume ab', () => {
    expect(fehlercode(null, anlegen([t('T', LV_ID), p('P', 'T'), p('Q', 'P')]))).toBe(
      'knotenart-unzulaessig',
    );
    const kette = ['A', 'B', 'C', 'D', 'E', 'F'].map((n, i, a) =>
      t(n, i === 0 ? LV_ID : (a[i - 1] ?? LV_ID)),
    );
    expect(fehlercode(null, anlegen(kette))).toBe('ebene-ueberschritten');
    expect(erwarteOk(lvBefehlAusfuehren(null, anlegen(kette.slice(0, 5)))).knoten.hinzugefuegt).toHaveLength(
      5,
    );
  });

  it('prüft Form der Positionen: Skala von Menge, Merkmale passend zur Art, Bezüge vorhanden', () => {
    expect(fehlercode(null, anlegen([t('T', LV_ID), p('P', 'T', 0, { menge: '1.5' as Menge })]))).toBe(
      'ungueltige-eingabe',
    );
    // Die Merkmale sind kombinierbar (F5); welche Formen der Kern abweist, prüft `merkmale.test.ts` (Ticket 37).
    expect(
      fehlercode(null, anlegen([t('T', LV_ID), p('Z', 'T', 0, { zuschlag: zuschlagsliste(['fehlt']) })])),
    ).toBe('bezug-unbekannt');
    const ok = anlegen([
      t('T', LV_ID),
      p('P', 'T', 0, { menge: '1.500' as Menge }),
      p('Z', 'T', 1, { zuschlag: zuschlagsliste(['P']) }),
    ]);
    expect(lvBefehlAusfuehren(null, ok).ok).toBe(true);
  });

  it('weist einen Hinweistext mit Menge oder Preis ab (Laufzeitprüfung, auch wenn der Typ es verbietet)', () => {
    const h = {
      art: 'hinweis',
      id: id.hinweis('H'),
      elternId: id.eltern(LV_ID),
      reihenfolge: 0,
      text: [],
      menge: '1.000',
    };
    const e = lvBefehlAusfuehren(null, anlegen([h as unknown as Knoten]));
    expect(e.ok).toBe(false);
    if (!e.ok) {
      expect(e.fehler.code).toBe('ungueltige-eingabe');
      expect(e.fehler.knotenId).toBe('H');
      expect(e.fehler.feld).toBe('menge');
    }
  });
});

// --- Einfügen nach X ----------------------------------------------------------------------------------------------

describe('Einfügen: Elternknoten und Reihenfolge', () => {
  it('„nach“ einer Position: gleicher Elternknoten, direkt dahinter; die Nachfolger rücken auf und stehen im ChangeSet', () => {
    const z = basis();
    const cs = erwarteOk(lvBefehlAusfuehren(z, position('PX', nach('P1'))));
    expect(cs.knoten.hinzugefuegt).toHaveLength(1);
    expect(cs.knoten.hinzugefuegt[0]).toMatchObject({ id: 'PX', elternId: 'T1', reihenfolge: 1 });
    expect(
      cs.knoten.geaendert.map((g) => [g.vorher.id, g.vorher.reihenfolge, g.nachher.reihenfolge]),
    ).toEqual([
      ['P2', 1, 2],
      ['P3', 2, 3],
    ]);
    expect(cs.knoten.entfernt).toEqual([]);
    expect(kinderIds(anwenden(z, cs), 'T1')).toEqual(['P1', 'PX', 'P2', 'P3']);
  });

  it('„nach“ dem letzten Geschwister hängt an, ohne Änderung der Geschwister', () => {
    const cs = erwarteOk(lvBefehlAusfuehren(basis(), position('PX', nach('P3'))));
    expect(cs.knoten.geaendert).toEqual([]);
    expect(cs.knoten.hinzugefuegt[0]).toMatchObject({ elternId: 'T1', reihenfolge: 3 });
  });

  it('„nach“ einem Hinweistext: gleicher Elternknoten, direkt dahinter', () => {
    const z = reihe(basis(), hinweis('H1', anfang('T1')));
    expect(kinderIds(z, 'T1')).toEqual(['H1', 'P1', 'P2', 'P3']);
    const z2 = wende(z, position('PX', nach('H1')));
    expect(kinderIds(z2, 'T1')).toEqual(['H1', 'PX', 'P1', 'P2', 'P3']);
  });

  it('„nach“ einer Gliederung (Titel): erster Unterknoten dieser Gliederung, nicht Geschwister dahinter', () => {
    const z = basis();
    const z2 = wende(z, position('PX', nach('T1')));
    expect(knotenVon(z2, 'PX')).toMatchObject({ elternId: 'T1', reihenfolge: 0 });
    expect(kinderIds(z2, 'T1')).toEqual(['PX', 'P1', 'P2', 'P3']);
    expect(kinderIds(z2, LV_ID)).toEqual(['T1']);
    const z3 = wende(z2, titel('T2', nach('T1')));
    expect(knotenVon(z3, 'T2')).toMatchObject({ elternId: 'T1', reihenfolge: 0 });
    expect(kinderIds(z3, 'T1')).toEqual(['T2', 'PX', 'P1', 'P2', 'P3']);
  });

  it('„nach“ einem Los: erster Unterknoten des Loses', () => {
    const z = reihe(null, los('L1', ende(LV_ID)), titel('T1', nach('L1')));
    expect(knotenVon(z, 'T1')).toMatchObject({ elternId: 'L1', reihenfolge: 0 });
  });

  it('„anfang“ und „ende“ eines Elternknotens, auch der Wurzel', () => {
    const z = reihe(
      basis(),
      position('A', anfang('T1')),
      position('E', ende('T1')),
      titel('T0', anfang(LV_ID)),
    );
    expect(kinderIds(z, 'T1')).toEqual(['A', 'P1', 'P2', 'P3', 'E']);
    expect(kinderIds(z, LV_ID)).toEqual(['T0', 'T1']);
  });

  it('Fehlerwerte für unbekannte oder unzulässige Ziele', () => {
    const z = basis();
    expect(fehlercode(z, position('X', nach('gibt-es-nicht')))).toBe('knoten-unbekannt');
    expect(fehlercode(z, position('X', nach(LV_ID)))).toBe('knoten-unbekannt'); // die Wurzel ist kein Knoten
    expect(fehlercode(z, position('X', ende('gibt-es-nicht')))).toBe('eltern-unbekannt');
    expect(fehlercode(z, position('X', ende('P1')))).toBe('knotenart-unzulaessig'); // Position hat keine Kinder
    expect(fehlercode(z, titel('X', anfang('P1')))).toBe('knotenart-unzulaessig');
    expect(fehlercode(z, hinweis('X', ende('P1')))).toBe('knotenart-unzulaessig');
  });

  it('IDs kommen aus dem Befehl: vergebene IDs (auch die des LV) werden abgewiesen', () => {
    const z = basis();
    expect(fehlercode(z, position('P1', ende('T1')))).toBe('id-vergeben');
    expect(fehlercode(z, titel('P1', ende('T1')))).toBe('id-vergeben');
    expect(fehlercode(z, position(LV_ID, ende('T1')))).toBe('id-vergeben');
  });

  it('ist deterministisch: weder Zufall noch Uhr, gleiche Eingabe ergibt gleiches ChangeSet', () => {
    const zufall = vi.spyOn(Math, 'random');
    const jetzt = vi.spyOn(Date, 'now');
    const z = basis();
    const a = lvBefehlAusfuehren(z, position('PX', nach('P1')));
    const b = lvBefehlAusfuehren(z, position('PX', nach('P1')));
    expect(a).toEqual(b);
    expect(zufall).not.toHaveBeenCalled();
    expect(jetzt).not.toHaveBeenCalled();
    zufall.mockRestore();
    jetzt.mockRestore();
  });

  it('mutiert weder Zustand noch Befehl', () => {
    const z = basis();
    const vorher = structuredClone(z);
    const befehl = position('PX', nach('P1'));
    const befehlVorher = structuredClone(befehl);
    lvBefehlAusfuehren(z, befehl);
    expect(z).toEqual(vorher);
    expect(befehl).toEqual(befehlVorher);
  });

  it('Position und Hinweistext tragen die Daten des Befehls; der Hinweistext hat keine Menge und keinen Preis', () => {
    const z = reihe(basis(), hinweis('H', ende('T1')));
    const h = knotenVon(z, 'H');
    expect(h.art).toBe('hinweis');
    expect(h).not.toHaveProperty('menge');
    expect(h).not.toHaveProperty('einheitspreis');
    const z2 = wende(z, {
      art: 'PositionAnlegen',
      id: id.pos('PM'),
      ort: ende('T1'),
      daten: positionsdaten('mit Menge', { menge: '2.000' as Menge, einheit: 'm' }),
    });
    expect(knotenVon(z2, 'PM')).toMatchObject({ art: 'position', menge: '2.000', einheit: 'm' });
  });

  it('prüft die Form der Merkmale und des Zuschlags (v1.1b), lässt aber jede Kombination zu', () => {
    const z = basis();
    const rohdaten = (ueber: Record<string, unknown>): LvBefehl => ({
      art: 'PositionAnlegen',
      id: id.pos('X'),
      ort: ende('T1'),
      daten: { ...positionsdaten('x'), ...ueber },
    });
    const feldVon = (b: LvBefehl): string | undefined => {
      const e = lvBefehlAusfuehren(z, b);
      return e.ok ? undefined : `${e.fehler.code}:${e.fehler.feld ?? ''}`;
    };
    const merk = (m: Record<string, unknown>): Record<string, unknown> => ({
      merkmale: { ...positionsdaten('x').merkmale, ...m },
    });
    const zus = (bezug: unknown, prozentsatz: unknown = null): Record<string, unknown> => ({
      zuschlag: { prozentsatz, bezug },
    });
    expect(feldVon(rohdaten({ merkmale: undefined }))).toBe('ungueltige-eingabe:merkmale');
    expect(feldVon(rohdaten({ merkmale: null }))).toBe('ungueltige-eingabe:merkmale');
    expect(feldVon(rohdaten(merk({ bedarf: 'vielleicht' })))).toBe('ungueltige-eingabe:merkmale.bedarf');
    expect(feldVon(rohdaten(zus({ art: 'alle' })))).toBe('ungueltige-eingabe:zuschlag.bezug.art');
    expect(feldVon(rohdaten(zus(undefined)))).toBe('ungueltige-eingabe:zuschlag.bezug.art');
    expect(feldVon(rohdaten(zus({ art: 'gliederung' }, '10.0')))).toBe(
      'ungueltige-eingabe:zuschlag.prozentsatz',
    );
    expect(feldVon(rohdaten(zus({ art: 'gliederung' }, '10,00')))).toBe(
      'ungueltige-eingabe:zuschlag.prozentsatz',
    );
    expect(
      feldVon(
        rohdaten(zus({ art: 'positionen', positionen: [{ positionId: id.pos('P1'), teilmenge: '1.5' }] })),
      ),
    ).toBe('ungueltige-eingabe:zuschlag.bezug.positionen.teilmenge');
    // Gültig und zulässig: jede Kombination der Merkmale (F5), alle Bezugsformen, kanonische Zahlen. Die fünf
    // Formprüfungen der Zuschlagsposition und der Wahl (Ticket 37) stehen in `merkmale.test.ts`.
    expect(
      feldVon(
        rohdaten({
          merkmale: {
            bedarf: 'ohne-gesamtbetrag',
            wahl: { gruppe: null, variante: null, grundpositionId: null },
            stundenlohn: true,
            pauschal: true,
            zuschlagskennzeichen: true,
          },
          zuschlag: null,
        }),
      ),
    ).toBeUndefined();
    expect(
      feldVon(
        rohdaten({
          merkmale: {
            bedarf: 'ohne-gesamtbetrag',
            wahl: { gruppe: 2, variante: 1, grundpositionId: null },
            stundenlohn: false,
            pauschal: false,
            zuschlagskennzeichen: false,
          },
          zuschlag: { prozentsatz: '10.00', bezug: { art: 'kennzeichnung' } },
        }),
      ),
    ).toBeUndefined();
    expect(
      feldVon(
        rohdaten(
          zus({ art: 'positionen', positionen: [{ positionId: id.pos('P1'), teilmenge: '0.500' }] }, '10.00'),
        ),
      ),
    ).toBeUndefined();
  });

  it('weist Positionsdaten ab, die die Form verletzen', () => {
    const z = basis();
    const mit = (daten: ReturnType<typeof positionsdaten>): LvBefehl => ({
      art: 'PositionAnlegen',
      id: id.pos('X'),
      ort: ende('T1'),
      daten,
    });
    expect(fehlercode(z, mit(positionsdaten('x', { menge: '1' as Menge })))).toBe('ungueltige-eingabe');
    // Der Bezug steht in `Positionsdaten.zuschlag` (v1.1b); er muss auf eine andere vorhandene Position zeigen.
    expect(fehlercode(z, mit(positionsdaten('x', { zuschlag: zuschlagsliste(['fehlt']) })))).toBe(
      'bezug-unbekannt',
    );
    expect(
      fehlercode(
        z,
        mit(positionsdaten('x', { merkmale: merkmale({ wahl: wahlzuordnung(null, null, 'T1') }) })),
      ),
    ).toBe('bezug-unbekannt'); // verweist auf einen Titel, nicht auf eine Position
    expect(lvBefehlAusfuehren(z, mit(positionsdaten('x', { zuschlag: zuschlagsliste(['P1']) }))).ok).toBe(
      true,
    );
  });
});

// --- Gliederungsebenen --------------------------------------------------------------------------------------------

describe('Gliederungsebenen', () => {
  const kette = (z: LvZustand | null, namen: string[], start: string): LvZustand => {
    let eltern = start;
    let aktuell = z ?? neuesLv();
    for (const n of namen) {
      aktuell = wende(aktuell, titel(n, ende(eltern)));
      eltern = n;
    }
    return aktuell;
  };

  it('erlaubt höchstens 5 Ebenen: der sechste Titel in Folge wird abgewiesen', () => {
    expect(MAX_GLIEDERUNGSEBENEN).toBe(5);
    const z = kette(null, ['E1', 'E2', 'E3', 'E4', 'E5'], LV_ID);
    const e = lvBefehlAusfuehren(z, titel('E6', ende('E5')));
    expect(e.ok).toBe(false);
    if (!e.ok) expect(e.fehler.code).toBe('ebene-ueberschritten');
    // Positionen und Hinweistexte unter Ebene 5 sind keine Gliederungsebene.
    expect(lvBefehlAusfuehren(z, position('P', ende('E5'))).ok).toBe(true);
    expect(lvBefehlAusfuehren(z, hinweis('H', ende('E5'))).ok).toBe(true);
    // „nach“ dem Titel der Ebene 5 ist sein erster Unterknoten, also Ebene 6.
    expect(fehlercode(z, titel('E6', nach('E5')))).toBe('ebene-ueberschritten');
  });

  it('VORLÄUFIGE ANNAHME (Entscheidung offen): ein Los zählt als eine der 5 Ebenen', () => {
    expect(LOS_ANNAHME.status).toBe('vorläufige Annahme, Entscheidung offen');
    expect(LOS_ANNAHME.zaehltAlsEbene).toBe(true);
    const z = kette(reihe(null, los('L', ende(LV_ID))), ['E1', 'E2', 'E3', 'E4'], 'L');
    expect(fehlercode(z, titel('E5', ende('E4')))).toBe('ebene-ueberschritten');
  });

  it('VORLÄUFIGE ANNAHME (Entscheidung offen): ein Los steht nur direkt unter der Wurzel', () => {
    expect(LOS_ANNAHME.nurUnterWurzel).toBe(true);
    const z = reihe(null, los('L', ende(LV_ID)), titel('T', ende('L'))); // F1: Titel im Los, nicht daneben
    expect(lvBefehlAusfuehren(z, los('L2', ende(LV_ID))).ok).toBe(true);
    expect(fehlercode(z, los('X', ende('L')))).toBe('knotenart-unzulaessig');
    expect(fehlercode(z, los('X', ende('T')))).toBe('knotenart-unzulaessig');
    expect(fehlercode(z, los('X', nach('L')))).toBe('knotenart-unzulaessig'); // nach einem Los: sein erstes Kind
  });
});

// --- Löschen --------------------------------------------------------------------------------------------------------

describe('KnotenLoeschen', () => {
  const baum = (): LvZustand =>
    reihe(
      null,
      titel('T1', ende(LV_ID)),
      titel('T2', ende('T1')),
      position('P1', ende('T2')),
      hinweis('H1', ende('T2')),
      position('P2', ende('T1')),
      titel('T3', ende(LV_ID)),
      position('P3', ende('T3')),
    );

  it('löscht rekursiv; entfernt ist Eltern vor Kindern geordnet und trägt den vollen alten Stand', () => {
    const z = baum();
    const cs = erwarteOk(lvBefehlAusfuehren(z, loesche('T1')));
    expect(cs.knoten.entfernt.map((k) => k.id)).toEqual(['T1', 'T2', 'P1', 'H1', 'P2']);
    expect(cs.knoten.entfernt[0]).toEqual(knotenVon(z, 'T1'));
    expect(cs.knoten.hinzugefuegt).toEqual([]);
    const z2 = anwenden(z, cs);
    expect(z2.leistungsverzeichnis.knoten.map((k) => k.id)).toEqual(['T3', 'P3']);
  });

  it('schließt die Lücke: Geschwister dahinter rücken auf und stehen unter geaendert', () => {
    const z = baum();
    const cs = erwarteOk(lvBefehlAusfuehren(z, loesche('T1')));
    expect(
      cs.knoten.geaendert.map((g) => [g.vorher.id, g.vorher.reihenfolge, g.nachher.reihenfolge]),
    ).toEqual([['T3', 1, 0]]);
    const z2 = anwenden(z, cs);
    expect(kinderIds(z2, LV_ID)).toEqual(['T3']);
    expect(pruefeLvInvarianten(z2.leistungsverzeichnis)).toEqual([]);
  });

  it('löscht ein Blatt, ohne andere Knoten anzufassen', () => {
    const cs = erwarteOk(lvBefehlAusfuehren(baum(), loesche('P2')));
    expect(cs.knoten.entfernt.map((k) => k.id)).toEqual(['P2']);
    expect(cs.knoten.geaendert).toEqual([]);
  });

  it('unbekannter Knoten, die Wurzel und eine doppelte Löschung sind Fehlerwerte', () => {
    const z = baum();
    expect(fehlercode(z, loesche('gibt-es-nicht'))).toBe('knoten-unbekannt');
    expect(fehlercode(z, loesche(LV_ID))).toBe('knoten-unbekannt');
    expect(fehlercode(wende(z, loesche('T3')), loesche('T3'))).toBe('knoten-unbekannt');
  });

  it('SUMMEN: Einträge entfernter Knoten fallen beim Anwenden weg, alle anderen bleiben unverändert', () => {
    const z = baum();
    const cs = erwarteOk(lvBefehlAusfuehren(z, loesche('T1')));
    // Die Summen entfernter Knoten stehen nicht im ChangeSet (Vertrag), sie fallen mit dem Knoten weg.
    expect(cs.summen.positionen).toEqual([]);
    expect(cs.summen.gliederungen).toEqual([]);
    const z2 = anwenden(z, cs);
    expect(z2.summen.positionen.map((p) => p.positionId)).toEqual(['P3']);
    expect(z2.summen.gliederungen.map((g) => g.gliederungId)).toEqual(['T3']);
    expect(z2.summen.gesamt).toBe(z.summen.gesamt);
  });
});

// --- Verschieben ----------------------------------------------------------------------------------------------------

describe('KnotenVerschieben', () => {
  const baum = (): LvZustand =>
    reihe(
      null,
      titel('T1', ende(LV_ID)),
      titel('T2', ende(LV_ID)),
      position('P1', ende('T1')),
      position('P2', ende('T1')),
      position('P3', ende('T1')),
      position('Q1', ende('T2')),
    );

  it('innerhalb desselben Elternknotens nach hinten: „nach X“ gilt nach dem Herausnehmen', () => {
    const z = wende(baum(), verschiebe('P1', nach('P3')));
    expect(kinderIds(z, 'T1')).toEqual(['P2', 'P3', 'P1']);
    expect(pruefeLvInvarianten(z.leistungsverzeichnis)).toEqual([]);
  });

  it('innerhalb desselben Elternknotens nach vorn', () => {
    const z = wende(baum(), verschiebe('P3', nach('P1')));
    expect(kinderIds(z, 'T1')).toEqual(['P1', 'P3', 'P2']);
    expect(kinderIds(wende(baum(), verschiebe('P3', anfang('T1'))), 'T1')).toEqual(['P3', 'P1', 'P2']);
  });

  it('listet im ChangeSet genau die Knoten, deren Lage sich ändert', () => {
    const cs = erwarteOk(lvBefehlAusfuehren(baum(), verschiebe('P1', nach('P2'))));
    // [P1,P2,P3] -> [P2,P1,P3]: P1 (0→1), P2 (1→0); P3 bleibt.
    expect(cs.knoten.hinzugefuegt).toEqual([]);
    expect(cs.knoten.entfernt).toEqual([]);
    expect(cs.knoten.geaendert.map((g) => g.vorher.id).sort()).toEqual(['P1', 'P2']);
    for (const g of cs.knoten.geaendert) expect(g.vorher).not.toEqual(g.nachher);
  });

  it('unter einen anderen Elternknoten: beide Geschwisterlisten bleiben dicht', () => {
    const z = wende(baum(), verschiebe('P1', ende('T2')));
    expect(kinderIds(z, 'T1')).toEqual(['P2', 'P3']);
    expect(kinderIds(z, 'T2')).toEqual(['Q1', 'P1']);
    expect(knotenVon(z, 'P1')).toMatchObject({ elternId: 'T2', reihenfolge: 1 });
    expect(pruefeLvInvarianten(z.leistungsverzeichnis)).toEqual([]);
  });

  it('nimmt den Unterbaum mit und ändert dessen Kinder nicht', () => {
    const z = wende(baum(), verschiebe('T1', ende('T2')));
    expect(kinderIds(z, 'T2')).toEqual(['Q1', 'T1']);
    expect(kinderIds(z, 'T1')).toEqual(['P1', 'P2', 'P3']);
    const cs = erwarteOk(lvBefehlAusfuehren(baum(), verschiebe('T1', ende('T2'))));
    expect(cs.knoten.geaendert.map((g) => g.vorher.id)).toEqual(expect.arrayContaining(['T1', 'T2']));
    expect(cs.knoten.geaendert.some((g) => g.vorher.id === 'P1')).toBe(false);
  });

  it('„nach“ einer Gliederung verschiebt als ersten Unterknoten', () => {
    const z = wende(baum(), verschiebe('P3', nach('T2')));
    expect(kinderIds(z, 'T2')).toEqual(['P3', 'Q1']);
  });

  it('unter den eigenen Unterbaum ist ein Zyklus', () => {
    const z = reihe(baum(), titel('T11', ende('T1')));
    expect(fehlercode(z, verschiebe('T1', ende('T11')))).toBe('zyklus');
    expect(fehlercode(z, verschiebe('T1', ende('T1')))).toBe('zyklus');
    expect(fehlercode(z, verschiebe('T1', nach('T1')))).toBe('zyklus'); // nach sich selbst = erstes Kind von sich
    expect(fehlercode(z, verschiebe('T1', nach('P1')))).toBe('zyklus'); // P1 liegt unter T1
    expect(fehlercode(z, verschiebe('T1', anfang('T11')))).toBe('zyklus');
  });

  it('eine Position „nach sich selbst“ ändert nichts: ChangeSet ohne Änderungen', () => {
    const cs = erwarteOk(lvBefehlAusfuehren(baum(), verschiebe('P2', nach('P2'))));
    expect(cs.knoten).toEqual({ hinzugefuegt: [], geaendert: [], entfernt: [] });
  });

  it('Fehlerwerte: unbekannter Knoten, unbekanntes Ziel, Ziel ist eine Position, Los unter einen Titel', () => {
    // F1: Lose und Titel nicht nebeneinander auf der obersten Ebene; das Los steht neben einem LV mit Titeln im Los.
    const z = reihe(
      null,
      los('L', ende(LV_ID)),
      titel('T1', ende('L')),
      position('P1', ende('T1')),
      position('P2', ende('T1')),
      los('L0', ende(LV_ID)),
      titel('T0', ende('L0')),
    );
    expect(fehlercode(z, verschiebe('gibt-es-nicht', ende('T1')))).toBe('knoten-unbekannt');
    expect(fehlercode(z, verschiebe('P1', ende('gibt-es-nicht')))).toBe('eltern-unbekannt');
    expect(fehlercode(z, verschiebe('P1', nach('gibt-es-nicht')))).toBe('knoten-unbekannt');
    expect(fehlercode(z, verschiebe('P1', ende('P2')))).toBe('knotenart-unzulaessig');
    expect(fehlercode(z, verschiebe('L', ende('T0')))).toBe('knotenart-unzulaessig');
    expect(lvBefehlAusfuehren(z, verschiebe('L', ende(LV_ID))).ok).toBe(true);
  });

  it('ebene-ueberschritten, wenn der verschobene Unterbaum zu tief würde', () => {
    // T1 hat die Kette T1-A-B (Tiefe 3); Ziel T2-C-D-E (Tiefe 4): T1 unter E ergäbe 7.
    let z = reihe(null, titel('T1', ende(LV_ID)), titel('A', ende('T1')), titel('B', ende('A')));
    z = reihe(z, titel('T2', ende(LV_ID)), titel('C', ende('T2')), titel('D', ende('C')));
    expect(fehlercode(z, verschiebe('T1', ende('D')))).toBe('ebene-ueberschritten'); // D=3, T1=4, A=5, B=6
    expect(lvBefehlAusfuehren(z, verschiebe('T1', ende('C'))).ok).toBe(true); // C=2, T1=3, A=4, B=5
  });
});

// --- Andere Befehle -------------------------------------------------------------------------------------------------

describe('Befehle anderer Tickets', () => {
  const z = basis();
  it('jeder LV-Befehl hat einen Handler (Ticket 42 schließt K9): ZUSTAENDIGES_TICKET ist leer', () => {
    expect(ZUSTAENDIGES_TICKET).toEqual({});
  });

  it('die Befehle der Tickets 06 (OZ) und 07 (Summen) sind umgesetzt', () => {
    const meldung = (b: LvBefehl): string => {
      const e = lvBefehlAusfuehren(z, b);
      return e.ok ? '' : e.fehler.meldung;
    };
    expect(meldung({ art: 'Umnummerieren', teilbaumId: id.eltern(LV_ID) })).toBe('');
    expect(
      meldung({ art: 'OrdnungszahlSetzen', knotenId: id.titel('T1'), ordnungszahl: null, ozIndex: null }),
    ).toBe('');
    expect(meldung({ art: 'NachlassEntfernen' })).toBe('');
    expect(meldung({ art: 'MengeAendern', positionId: id.pos('P1'), menge: null })).toBe('');
  });
});

// --- ChangeSet anwenden und umkehren ------------------------------------------------------------------------------

describe('lvChangeSetAnwenden und changeSetUmkehren', () => {
  it('die Umkehrung eines Einfügens, Löschens und Verschiebens stellt den Zustand exakt wieder her', () => {
    const z = reihe(basis(), titel('T2', ende(LV_ID)), hinweis('H', ende('T1')));
    for (const b of [
      position('PX', nach('P1')),
      loesche('T1'),
      verschiebe('P1', ende('T2')),
      verschiebe('T1', ende('T2')),
      titel('TX', nach('T1')),
    ]) {
      const cs = erwarteOk(lvBefehlAusfuehren(z, b));
      const danach = anwenden(z, cs);
      expect(danach).not.toEqual(z);
      expect(anwenden(danach, changeSetUmkehren(cs))).toEqual(z);
    }
  });

  it('Umkehren vertauscht vorher/nachher und hinzugefuegt/entfernt, ohne das Original zu ändern', () => {
    const z = basis();
    const cs = erwarteOk(lvBefehlAusfuehren(z, position('PX', nach('P1'))));
    const kopie = structuredClone(cs);
    const u = changeSetUmkehren(cs);
    expect(cs).toEqual(kopie);
    expect(u.knoten.entfernt).toEqual(cs.knoten.hinzugefuegt);
    expect(u.knoten.hinzugefuegt).toEqual(cs.knoten.entfernt);
    expect(u.knoten.geaendert[0]?.vorher).toEqual(cs.knoten.geaendert[0]?.nachher);
    expect(ohneReihenfolge(changeSetUmkehren(u))).toEqual(ohneReihenfolge(cs));
  });

  it('ohne Zustand und ohne Kopf lässt sich ein ChangeSet nicht anwenden (Programmfehler)', () => {
    const cs = erwarteOk(lvBefehlAusfuehren(basis(), position('PX', nach('P1'))));
    expect(() => anwenden(null, cs)).toThrow();
  });
});
