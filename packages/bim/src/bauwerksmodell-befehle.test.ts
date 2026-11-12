// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle am Bauwerksmodell (Ticket 108 Punkt 1, v1.6): Ausführen prüft die Form, Anwenden und Umkehren mit Kopf und Inhalt
// (D-97.3). Doppelte GlobalIds sind kein Fehler (D-50); einen unbekannten Vorgänger kennt nur `speicher` (`konflikt`).

import { describe, expect, it } from 'vitest';
import type {
  Bauwerksmodell,
  BauwerksmodellBefehl,
  BauwerksmodellChangeSet,
  BauwerksmodellId,
  BauwerksmodellZustand,
  Befehlsfehler,
  Ergebnis,
  IfcGlobalId,
  Kostengruppennummer,
} from '@tethys/vertrag';
import {
  bauwerksmodellBefehlAusfuehren,
  bauwerksmodellChangeSetAnwenden,
  bauwerksmodellChangeSetUmkehren,
} from './index';
import { bauteil, gid, knoten, m, menge, modell } from './testhilfe/bauen';

function ok(e: Ergebnis<BauwerksmodellChangeSet, Befehlsfehler>): BauwerksmodellChangeSet {
  if (!e.ok)
    throw new Error(`Befehl abgewiesen: ${e.fehler.code} ${e.fehler.feld ?? ''} ${e.fehler.meldung}`);
  return e.wert;
}

const anlegen = (bauwerksmodell: Bauwerksmodell): BauwerksmodellBefehl => ({
  art: 'BauwerksmodellAnlegen',
  bauwerksmodell,
});

function angelegt(bm: Bauwerksmodell = modell()): BauwerksmodellZustand {
  const z = bauwerksmodellChangeSetAnwenden(null, ok(bauwerksmodellBefehlAusfuehren(null, anlegen(bm))));
  if (z === null) throw new Error('kein Zustand');
  return z;
}

/** Erwartet die Abweisung mit Code und Feld. */
function abgewiesen(
  e: Ergebnis<BauwerksmodellChangeSet, Befehlsfehler>,
  code: Befehlsfehler['code'],
  feld?: string,
): void {
  expect(e.ok).toBe(false);
  if (e.ok) return;
  expect(e.fehler.code).toBe(code);
  if (feld !== undefined) expect(e.fehler.feld).toBe(feld);
  expect(e.fehler.meldung).not.toBe('');
}

describe('BauwerksmodellAnlegen', () => {
  it('legt das Modell an: Kopf ohne Struktur und Bauteile, Inhalt mit beiden; Anwenden ergibt das Modell', () => {
    const bm = modell();
    const cs = ok(bauwerksmodellBefehlAusfuehren(null, anlegen(bm)));
    expect(cs.art).toBe('bauwerksmodell');
    expect(cs.bauwerksmodellId).toBe(bm.id);
    expect(cs.kopf.vorher).toBeNull();
    expect(cs.kopf.nachher).toEqual({
      id: bm.id,
      projektId: bm.projektId,
      name: 'Haus',
      datei: bm.datei,
      schema: 'IFC4',
      vorgaengerId: null,
      eingelesen: '2026-11-12',
    });
    expect(cs.inhalt).toEqual({ vorher: null, nachher: { struktur: bm.struktur, bauteile: bm.bauteile } });
    expect(bauwerksmodellChangeSetAnwenden(null, cs)).toEqual({ bauwerksmodell: bm });
    expect(JSON.parse(JSON.stringify(cs))).toEqual(cs);
  });

  it('nimmt doppelte GlobalIds an (D-50: beide bleiben, Befund nur in der Modellprüfung)', () => {
    const bm = modell({
      bauteile: [bauteil('W1', [menge('Length', '1.000', 'laenge')]), bauteil('W1', [])],
    });
    expect(bauwerksmodellBefehlAusfuehren(null, anlegen(bm)).ok).toBe(true);
  });

  it('liest Verweise auf doppelte GlobalIds als Verweis auf das erste Objekt (D-66): kein Ring über ein späteres', () => {
    const bm = modell({
      struktur: [knoten('A', 'gebaeude', null), knoten('A', 'gebaeude', 'B'), knoten('B', 'geschoss', 'A')],
      bauteile: [
        bauteil('T', [], { strukturGlobalId: gid('B') }),
        bauteil('T', [], { strukturGlobalId: gid('B'), teilVonGlobalId: gid('U') }),
        bauteil('U', [], { strukturGlobalId: gid('B'), teilVonGlobalId: gid('T') }),
      ],
    });
    expect(bauwerksmodellBefehlAusfuehren(null, anlegen(bm)).ok).toBe(true);
  });

  it('nimmt Teile an, deren Ganzes ein Bauteil des Modells ist, und Kostengruppen-Vorschläge', () => {
    const bm = modell({
      bauteile: [
        bauteil('D1', [], { ifcKlasse: 'IfcRoof', kostengruppe: '363' as Kostengruppennummer }),
        bauteil('D1a', [], { ifcKlasse: 'IfcSlab', teilVonGlobalId: gid('D1') }),
      ],
    });
    expect(bauwerksmodellBefehlAusfuehren(null, anlegen(bm)).ok).toBe(true);
  });

  it('nimmt einen Vorgänger an (ob es ihn gibt, prüft speicher)', () => {
    const bm = modell({ vorgaengerId: 'modell-0' as BauwerksmodellId });
    expect(bauwerksmodellBefehlAusfuehren(null, anlegen(bm)).ok).toBe(true);
  });

  it('weist das Anlegen mit vorhandenem Zustand ab', () => {
    abgewiesen(bauwerksmodellBefehlAusfuehren(angelegt(), anlegen(modell())), 'befehl-nicht-zustaendig');
  });

  const W = (schluessel: string, ueber: Parameters<typeof bauteil>[2] = {}) =>
    bauteil(schluessel, [menge('Length', '1.000', 'laenge')], ueber);
  const fehlerfaelle: readonly [string, Partial<Bauwerksmodell>, string][] = [
    [
      'Hash nicht 64 Hexziffern',
      { datei: { hash: 'A'.repeat(64), dateiname: 'x.ifc', groesse: 1 } },
      'datei.hash',
    ],
    ['Hash zu kurz', { datei: { hash: 'a'.repeat(63), dateiname: 'x.ifc', groesse: 1 } }, 'datei.hash'],
    ['Größe negativ', { datei: { hash: 'a'.repeat(64), dateiname: 'x.ifc', groesse: -1 } }, 'datei.groesse'],
    [
      'Größe keine ganze Zahl',
      { datei: { hash: 'a'.repeat(64), dateiname: 'x.ifc', groesse: 1.5 } },
      'datei.groesse',
    ],
    ['Dateiname leer', { datei: { hash: 'a'.repeat(64), dateiname: '', groesse: 1 } }, 'datei.dateiname'],
    ['Schema unbekannt', { schema: 'IFC5' as 'IFC4' }, 'schema'],
    ['Datum ungültig', { eingelesen: '2026-02-30' }, 'eingelesen'],
    ['Datum nicht in Form', { eingelesen: '12.11.2026' }, 'eingelesen'],
    ['Name leer', { name: '' }, 'name'],
    ['Name nur Leerraum', { name: '  ' }, 'name'],
    ['Vorgänger ist das Modell selbst', { vorgaengerId: 'modell-1' as BauwerksmodellId }, 'vorgaengerId'],
    [
      'GlobalId eines Bauteils nicht in Form',
      { bauteile: [W('W1', { globalId: 'kurz' as IfcGlobalId })] },
      'bauteile',
    ],
    ['IFC-Klasse leer', { bauteile: [W('W1', { ifcKlasse: '' })] }, 'bauteile'],
    ['Menge ohne Namen', { bauteile: [bauteil('W1', [menge('', '1.000')])] }, 'bauteile'],
    ['Menge mit 2 Stellen', { bauteile: [bauteil('W1', [menge('Length', '1.00', 'laenge')])] }, 'bauteile'],
    [
      'Menge kein Dezimalwert',
      { bauteile: [bauteil('W1', [{ ...menge('Length', '1.000'), wert: m('1,000') }])] },
      'bauteile',
    ],
    [
      'Art der Menge unbekannt',
      {
        bauteile: [
          bauteil(
            'W1',
            [menge('X', '1.000')].map((q) => ({ ...q, art: 'masse' as 'laenge' })),
          ),
        ],
      },
      'bauteile',
    ],
    ['Strukturknoten unbekannt', { bauteile: [W('W1', { strukturGlobalId: gid('UG') })] }, 'bauteile'],
    [
      'Strukturknoten ist ein Bauteil',
      { bauteile: [W('W1'), W('W2', { strukturGlobalId: gid('W1') })] },
      'bauteile',
    ],
    ['Ganzes unbekannt', { bauteile: [W('W1', { teilVonGlobalId: gid('X') })] }, 'bauteile'],
    ['Ganzes ist ein Strukturknoten', { bauteile: [W('W1', { teilVonGlobalId: gid('EG') })] }, 'bauteile'],
    ['Teil von sich selbst', { bauteile: [W('W1', { teilVonGlobalId: gid('W1') })] }, 'bauteile'],
    [
      'Ring der Teile',
      { bauteile: [W('A', { teilVonGlobalId: gid('B') }), W('B', { teilVonGlobalId: gid('A') })] },
      'bauteile',
    ],
    [
      'Kostengruppe nicht in Form',
      { bauteile: [W('W1', { kostengruppe: '36' as Kostengruppennummer })] },
      'bauteile',
    ],
    [
      'GlobalId eines Knotens nicht in Form',
      { struktur: [{ ...knoten('P', 'projekt', null), globalId: 'P' as IfcGlobalId }], bauteile: [] },
      'struktur',
    ],
    [
      'Art des Knotens unbekannt',
      { struktur: [knoten('P', 'stockwerk' as 'geschoss', null)], bauteile: [] },
      'struktur',
    ],
    ['Eltern unbekannt', { struktur: [knoten('P', 'projekt', 'X')], bauteile: [] }, 'struktur'],
    [
      'Menge eines Knotens mit 4 Stellen',
      { struktur: [knoten('P', 'projekt', null, [menge('GrossFloorArea', '1.0000')])], bauteile: [] },
      'struktur',
    ],
    [
      'Ring der Struktur',
      { struktur: [knoten('A', 'gebaeude', 'B'), knoten('B', 'geschoss', 'A')], bauteile: [] },
      'struktur',
    ],
    [
      'Knoten ist sein eigener Elternteil',
      { struktur: [knoten('A', 'gebaeude', 'A')], bauteile: [] },
      'struktur',
    ],
  ];
  it.each(fehlerfaelle)('weist ab: %s', (_fall, ueber, feld) => {
    abgewiesen(bauwerksmodellBefehlAusfuehren(null, anlegen(modell(ueber))), 'ungueltige-eingabe', feld);
  });
});

describe('BauwerksmodellUmbenennen', () => {
  it('ändert nur den Namen; das ChangeSet trägt nur den Kopf, Anwenden behält Struktur und Bauteile', () => {
    const z = angelegt();
    const cs = ok(
      bauwerksmodellBefehlAusfuehren(z, { art: 'BauwerksmodellUmbenennen', name: 'Haus Stand 2' }),
    );
    expect(cs.inhalt).toBeUndefined();
    expect(cs.kopf.vorher?.name).toBe('Haus');
    expect(cs.kopf.nachher?.name).toBe('Haus Stand 2');
    expect(Object.keys(cs.kopf.nachher ?? {})).not.toContain('bauteile');
    const neu = bauwerksmodellChangeSetAnwenden(z, cs);
    expect(neu?.bauwerksmodell).toEqual({ ...z.bauwerksmodell, name: 'Haus Stand 2' });
    expect(neu?.bauwerksmodell.bauteile).toBe(z.bauwerksmodell.bauteile);
    expect(neu?.bauwerksmodell.struktur).toBe(z.bauwerksmodell.struktur);
  });

  it('weist einen leeren Namen ab und ohne Zustand', () => {
    abgewiesen(
      bauwerksmodellBefehlAusfuehren(angelegt(), { art: 'BauwerksmodellUmbenennen', name: ' ' }),
      'ungueltige-eingabe',
      'name',
    );
    abgewiesen(
      bauwerksmodellBefehlAusfuehren(null, { art: 'BauwerksmodellUmbenennen', name: 'x' }),
      'befehl-nicht-zustaendig',
    );
  });
});

describe('BauwerksmodellLoeschen', () => {
  it('trägt den vollen Stand für Undo; Anwenden ergibt null', () => {
    const z = angelegt();
    const cs = ok(bauwerksmodellBefehlAusfuehren(z, { art: 'BauwerksmodellLoeschen' }));
    expect(cs.kopf.nachher).toBeNull();
    expect(cs.inhalt).toEqual({
      vorher: { struktur: z.bauwerksmodell.struktur, bauteile: z.bauwerksmodell.bauteile },
      nachher: null,
    });
    expect(bauwerksmodellChangeSetAnwenden(z, cs)).toBeNull();
  });

  it('weist das Löschen ohne Zustand ab', () => {
    abgewiesen(
      bauwerksmodellBefehlAusfuehren(null, { art: 'BauwerksmodellLoeschen' }),
      'befehl-nicht-zustaendig',
    );
  });
});

describe('Umkehren (Undo)', () => {
  it('Anlegen, Umbenennen und Löschen lassen sich umkehren; zweimal umkehren ändert nichts', () => {
    const bm = modell();
    const anlegeCs = ok(bauwerksmodellBefehlAusfuehren(null, anlegen(bm)));
    const z = bauwerksmodellChangeSetAnwenden(null, anlegeCs);
    expect(bauwerksmodellChangeSetAnwenden(z, bauwerksmodellChangeSetUmkehren(anlegeCs))).toBeNull();

    const umCs = ok(bauwerksmodellBefehlAusfuehren(z, { art: 'BauwerksmodellUmbenennen', name: 'Neu' }));
    const umbenannt = bauwerksmodellChangeSetAnwenden(z, umCs);
    expect(bauwerksmodellChangeSetAnwenden(umbenannt, bauwerksmodellChangeSetUmkehren(umCs))).toEqual(z);

    const loeschCs = ok(bauwerksmodellBefehlAusfuehren(z, { art: 'BauwerksmodellLoeschen' }));
    expect(bauwerksmodellChangeSetAnwenden(null, bauwerksmodellChangeSetUmkehren(loeschCs))).toEqual({
      bauwerksmodell: bm,
    });

    for (const cs of [anlegeCs, umCs, loeschCs])
      expect(bauwerksmodellChangeSetUmkehren(bauwerksmodellChangeSetUmkehren(cs))).toEqual(cs);
  });
});
