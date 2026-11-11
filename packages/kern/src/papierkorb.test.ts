// SPDX-License-Identifier: AGPL-3.0-or-later
// Papierkorb (Ticket 42, Punkt 5; Vertrag v1.2, D-12): Hineinlegen, Wiederherstellen, Entfernen, Leeren. Zuerst
// geschrieben (Q1). Property-Test über gemischte Folgen: `k9-eigenschaften.test.ts`.

import { describe, expect, it } from 'vitest';
import type {
  Befehlsfehlercode,
  Einfuegeort,
  LvBefehl,
  LvZustand,
  PapierkorbeintragId,
  Position,
} from '@tethys/vertrag';
import {
  ZUSTAENDIGES_TICKET,
  changeSetUmkehren,
  lvBefehlAusfuehren,
  pruefeLvInvarianten,
  summenBerechnen,
} from './index';
import {
  LV_ID,
  anwenden,
  erwarteOk,
  id,
  kinderIds,
  lvMit,
  merkmale,
  posKnoten,
  titelKnoten,
  wahlzuordnung,
  wende,
  zuschlagsliste,
} from './testhilfen';

const E = (s: string) => s as PapierkorbeintragId;
const ende = (eltern: string): Einfuegeort => ({ art: 'ende', elternId: id.eltern(eltern) });
const legen = (eintrag: string, ...knoten: string[]): LvBefehl => ({
  art: 'KnotenInPapierkorbLegen',
  eintragId: E(eintrag),
  knotenIds: knoten.map(id.knoten),
});
const zurueck = (eintrag: string, ort: Einfuegeort | null = null): LvBefehl => ({
  art: 'PapierkorbeintragWiederherstellen',
  eintragId: E(eintrag),
  ort,
});
const entfernen = (eintrag: string): LvBefehl => ({
  art: 'PapierkorbeintragEntfernen',
  eintragId: E(eintrag),
});
const LEEREN: LvBefehl = { art: 'PapierkorbLeeren' };

const fehler = (z: LvZustand, b: LvBefehl): [Befehlsfehlercode, string | undefined] | null => {
  const e = lvBefehlAusfuehren(z, b);
  return e.ok ? null : [e.fehler.code, e.fehler.feld];
};

/** T1 [P1 20,00; P2 15,00; Z 10 % auf P1], T2 [P3 100,00; W Wahl zu P3], P4 7,00. */
function basis(): LvZustand {
  return lvMit([
    titelKnoten('T1', LV_ID, 0),
    posKnoten('P1', 'T1', 0, '2.000', '10.000'),
    posKnoten('P2', 'T1', 1, '3.000', '5.000'),
    posKnoten('Z', 'T1', 2, null, null, { zuschlag: zuschlagsliste(['P1'], '10.00') }),
    titelKnoten('T2', LV_ID, 1),
    posKnoten('P3', 'T2', 0, '1.000', '100.000'),
    posKnoten('W', 'T2', 1, '1.000', '90.000', { merkmale: merkmale({ wahl: wahlzuordnung(1, 1, 'P3') }) }),
    posKnoten('P4', LV_ID, 2, '1.000', '7.000'),
  ]);
}

const gp = (z: LvZustand, p: string) => z.summen.positionen.find((s) => s.positionId === p)?.gesamtpreis;
const knoten = (z: LvZustand, k: string) => z.leistungsverzeichnis.knoten.find((n) => n.id === k);
const stimmig = (z: LvZustand): void => {
  expect(z.summen).toEqual(summenBerechnen(z.leistungsverzeichnis));
  expect(pruefeLvInvarianten(z.leistungsverzeichnis, z.papierkorb)).toEqual([]);
};
/** Befehl ausführen, anwenden und prüfen, dass die Umkehrung den Vorzustand exakt herstellt. */
const schritt = (z: LvZustand, b: LvBefehl): LvZustand => {
  const cs = erwarteOk(lvBefehlAusfuehren(z, b));
  const neu = anwenden(z, cs);
  expect(anwenden(neu, changeSetUmkehren(cs))).toEqual(z);
  stimmig(neu);
  return neu;
};

describe('Papierkorb: zuständig', () => {
  it('die vier Papierkorb-Befehle stehen nicht mehr in ZUSTAENDIGES_TICKET', () => {
    for (const art of [
      'KnotenInPapierkorbLegen',
      'PapierkorbeintragWiederherstellen',
      'PapierkorbeintragEntfernen',
      'PapierkorbLeeren',
    ])
      expect(Object.keys(ZUSTAENDIGES_TICKET)).not.toContain(art);
  });
});

describe('KnotenInPapierkorbLegen', () => {
  it('nimmt die Position aus dem Baum, legt einen Eintrag mit Nummer 1 an; der Bezug bleibt und zählt nichts', () => {
    const z = basis();
    const cs = erwarteOk(lvBefehlAusfuehren(z, legen('E1', 'P1')));
    const p1 = knoten(z, 'P1');
    expect(cs.knoten.entfernt).toEqual([p1]);
    expect(cs.knoten.hinzugefuegt).toEqual([]);
    expect(cs.knoten.geaendert.map((g) => [g.nachher.id, g.nachher.reihenfolge])).toEqual([
      ['P2', 0],
      ['Z', 1],
    ]);
    expect(cs.papierkorb).toEqual({
      hinzugefuegt: [{ id: E('E1'), nummer: 1, knoten: [p1] }],
      geaendert: [],
      entfernt: [],
    });
    const n = schritt(z, legen('E1', 'P1'));
    expect(n.papierkorb).toEqual([{ id: E('E1'), nummer: 1, knoten: [p1] }]);
    // Z nennt P1 weiter, die Basis ist aber 0,00 (D-12); P1 hat keine Positionssumme mehr.
    const zz = knoten(n, 'Z') as Position;
    expect(zz.zuschlag).toEqual(zuschlagsliste(['P1'], '10.00'));
    expect(gp(n, 'Z')).toBe('0.00');
    expect(gp(n, 'P1')).toBeUndefined();
    expect(n.summen.gliederungen.find((g) => g.gliederungId === 'T1')?.summe).toBe('15.00');
  });

  it('mehrere Knoten werden ein Eintrag in Dokumentreihenfolge; Nachfahren eines genannten Knotens zählen nicht eigens', () => {
    const z = basis();
    const n = schritt(z, legen('E1', 'P4', 'P3', 'T2'));
    const e = n.papierkorb?.[0];
    expect(e?.knoten.map((k) => k.id)).toEqual(['T2', 'P3', 'W', 'P4']);
    expect(kinderIds(n, LV_ID)).toEqual(['T1']);
    // W (Wahl zu P3) liegt mit im Eintrag; sein Bezug ist intern.
    expect(n.summen.gesamt.netto).toBe('37.00');
  });

  it('nummer = Höchstwert + 1, im leeren Papierkorb 1', () => {
    let z = schritt(basis(), legen('E1', 'P1'));
    z = schritt(z, legen('E2', 'P2'));
    expect(z.papierkorb?.map((e) => [e.id, e.nummer])).toEqual([
      ['E1', 1],
      ['E2', 2],
    ]);
    z = schritt(z, entfernen('E1'));
    z = schritt(z, legen('E3', 'P3'));
    expect(z.papierkorb?.map((e) => [e.id, e.nummer])).toEqual([
      ['E2', 2],
      ['E3', 3],
    ]);
    z = schritt(z, LEEREN);
    z = schritt(z, legen('E4', 'P4'));
    expect(z.papierkorb?.map((e) => [e.id, e.nummer])).toEqual([['E4', 1]]);
  });

  it('Fehler: leere Liste, unbekannter Knoten, Eintragskennung vergeben', () => {
    const z = schritt(basis(), legen('E1', 'P1'));
    expect(fehler(z, legen('E2'))).toEqual(['ungueltige-eingabe', 'knotenIds']);
    expect(fehler(z, legen('E2', 'gibt-es-nicht'))?.[0]).toBe('knoten-unbekannt');
    expect(fehler(z, legen('E2', 'P1'))?.[0]).toBe('knoten-unbekannt'); // liegt schon im Papierkorb
    expect(fehler(z, legen('E1', 'P2'))).toEqual(['id-vergeben', 'eintragId']);
  });
});

describe('PapierkorbeintragWiederherstellen', () => {
  it('mit ort null an die alte Stelle: Umkehrung des Hineinlegens, Bezug gilt wieder', () => {
    const z = basis();
    for (const ids of [['P1'], ['P2', 'P4'], ['T2'], ['P1', 'Z', 'P3']]) {
      const drin = schritt(z, legen('E1', ...ids));
      const raus = schritt(drin, zurueck('E1'));
      expect(raus).toEqual(z);
    }
  });

  it('fehlt der alte Elternknoten: ans Ende der Wurzel; Kennungen und OZ bleiben', () => {
    let z = schritt(basis(), legen('E1', 'P1'));
    z = schritt(z, legen('E2', 'T1'));
    z = schritt(z, zurueck('E1'));
    expect(kinderIds(z, LV_ID)).toEqual(['T2', 'P4', 'P1']);
    expect(gp(z, 'P1')).toBe('20.00');
    expect(z.papierkorb?.map((e) => e.id)).toEqual(['E2']);
  });

  it('mit ort: hintereinander am Ort, wie Einfügen', () => {
    let z = schritt(basis(), legen('E1', 'P1', 'P2'));
    z = schritt(z, zurueck('E1', ende('T2')));
    expect(kinderIds(z, 'T2')).toEqual(['P3', 'W', 'P1', 'P2']);
    expect(kinderIds(z, 'T1')).toEqual(['Z']);
    // Z nennt P1 in einer anderen Gliederung (R5): die Basis gilt wieder.
    expect(gp(z, 'Z')).toBe('2.00');
  });

  it('Fehler: unbekannter Eintrag, Kennung im Baum schon vergeben, unzulässiger Ort', () => {
    const z = schritt(basis(), legen('E1', 'P1'));
    expect(fehler(z, zurueck('E9'))).toEqual(['ungueltige-eingabe', 'eintragId']);
    expect(fehler(z, zurueck('E1', ende('P2')))?.[0]).toBe('knotenart-unzulaessig');
    expect(fehler(z, zurueck('E1', ende('gibt-es-nicht')))?.[0]).toBe('eltern-unbekannt');
    const doppelt: LvZustand = {
      ...z,
      papierkorb: [{ id: E('E2'), nummer: 2, knoten: [posKnoten('P2', 'T1', 0, null, null)] }],
    };
    expect(fehler(doppelt, zurueck('E2'))?.[0]).toBe('id-vergeben');
  });
});

describe('PapierkorbeintragEntfernen und PapierkorbLeeren', () => {
  it('Entfernen: voller Eintrag in papierkorb.entfernt, hängende Bezüge in knoten.geaendert, Summen unverändert', () => {
    let z = schritt(basis(), legen('E1', 'P1', 'P3'));
    z = schritt(z, legen('E2', 'P2'));
    const cs = erwarteOk(lvBefehlAusfuehren(z, entfernen('E1')));
    expect(cs.papierkorb).toEqual({ hinzugefuegt: [], geaendert: [], entfernt: [z.papierkorb?.[0]] });
    expect(cs.knoten.hinzugefuegt).toEqual([]);
    expect(cs.knoten.entfernt).toEqual([]);
    const nachher = new Map<string, Position>(
      cs.knoten.geaendert.map((g) => [g.nachher.id, g.nachher as Position]),
    );
    expect([...nachher.keys()].sort()).toEqual(['W', 'Z']);
    expect(nachher.get('Z')?.zuschlag).toEqual(zuschlagsliste([], '10.00'));
    expect(nachher.get('W')?.merkmale.wahl).toEqual(wahlzuordnung(1, 1, null));
    expect(cs.summen.positionen).toEqual([]);
    expect(cs.summen.gesamt).toBeNull();
    const n = schritt(z, entfernen('E1'));
    expect(n.papierkorb?.map((e) => e.id)).toEqual(['E2']);
  });

  it('Entfernen löst auch Bezüge aus anderen Einträgen (papierkorb.geaendert)', () => {
    let z = schritt(basis(), legen('E1', 'P1'));
    z = schritt(z, legen('E2', 'Z'));
    const cs = erwarteOk(lvBefehlAusfuehren(z, entfernen('E1')));
    expect(cs.papierkorb?.geaendert.map((g) => g.nachher.id)).toEqual(['E2']);
    const n = schritt(z, entfernen('E1'));
    const zn = n.papierkorb?.[0]?.knoten[0] as Position;
    expect(zn.zuschlag).toEqual(zuschlagsliste([], '10.00'));
    // Kommt Z zurück, nennt es keine Position mehr; die Invarianten halten.
    stimmig(schritt(n, zurueck('E2')));
  });

  it('Entfernen eines unbekannten Eintrags: ungueltige-eingabe', () => {
    expect(fehler(basis(), entfernen('E1'))).toEqual(['ungueltige-eingabe', 'eintragId']);
  });

  it('Leeren: alle Einträge, alle hängenden Bezüge; leerer Papierkorb ergibt ein leeres ChangeSet', () => {
    let z = schritt(basis(), legen('E1', 'P1'));
    z = schritt(z, legen('E2', 'P3'));
    const cs = erwarteOk(lvBefehlAusfuehren(z, LEEREN));
    expect(cs.papierkorb?.entfernt.map((e) => e.id)).toEqual(['E1', 'E2']);
    expect(cs.knoten.geaendert.map((g) => g.nachher.id).sort()).toEqual(['W', 'Z']);
    const n = schritt(z, LEEREN);
    expect(n.papierkorb).toBeUndefined();
    const leer = erwarteOk(lvBefehlAusfuehren(n, LEEREN));
    expect(leer.papierkorb).toBeUndefined();
    expect(leer.knoten).toEqual({ hinzugefuegt: [], geaendert: [], entfernt: [] });
    expect(anwenden(n, leer)).toBe(n);
  });
});

describe('Invarianten mit Papierkorb', () => {
  it('Bezug in den Papierkorb ist gültig, ohne den Papierkorb ein Bezugsfehler', () => {
    const z = wende(basis(), legen('E1', 'P1'));
    expect(pruefeLvInvarianten(z.leistungsverzeichnis, z.papierkorb)).toEqual([]);
    expect(pruefeLvInvarianten(z.leistungsverzeichnis).join()).toContain('bezug-unbekannt');
  });

  it('ein Knoten im Baum und im Papierkorb zugleich ist ein Verstoß', () => {
    const z = basis();
    const p1 = knoten(z, 'P1');
    if (p1 === undefined) throw new Error('P1 fehlt');
    const v = pruefeLvInvarianten(z.leistungsverzeichnis, [{ id: E('E1'), nummer: 1, knoten: [p1] }]);
    expect(v.join()).toContain('id-vergeben');
  });
});

describe('Bezüge auf Positionen im Papierkorb in anderen Befehlen', () => {
  it('PositionsmerkmaleSetzen und PositionAnlegen nehmen einen Bezug in den Papierkorb an (er zählt nichts)', () => {
    const z = schritt(basis(), legen('E1', 'P3', 'P1'));
    schritt(z, {
      art: 'PositionsmerkmaleSetzen',
      positionId: id.pos('W'),
      merkmale: merkmale({ wahl: wahlzuordnung(2, 1, 'P3'), bedarf: 'ohne-gesamtbetrag' }),
      zuschlag: null,
    });
    const n = schritt(z, {
      art: 'PositionAnlegen',
      id: id.pos('Z2'),
      ort: ende('T2'),
      daten: { ...posKnoten('Z2', 'T2', 0, null, null), zuschlag: zuschlagsliste(['P1'], '5.00') },
    });
    expect(gp(n, 'Z2')).toBe('0.00');
  });

  it('PositionAnlegen mit einer Kennung aus dem Papierkorb: id-vergeben', () => {
    const z = schritt(basis(), legen('E1', 'P1'));
    const e = lvBefehlAusfuehren(z, {
      art: 'PositionAnlegen',
      id: id.pos('P1'),
      ort: ende('T2'),
      daten: posKnoten('P1', 'T2', 0, null, null),
    });
    expect(e.ok ? null : e.fehler.code).toBe('id-vergeben');
  });
});
