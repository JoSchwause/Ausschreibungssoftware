// SPDX-License-Identifier: AGPL-3.0-or-later
// Bauteilzuordnungen an Positionen (`vertrag` v1.6 Punkt 3, D-52; Ticket 106 Punkt 1): `Positionsdaten.bauteile` im LV und im
// Auftrags-LV wie die übrigen optionalen Positionsfelder. Was der Kern liefert, kommt verlustfrei zurück (Q5): Speichern →
// Laden, Undo, Papierkorb, LV-Stand. Eine leere Liste kennt der Vertrag im Zustand nicht („nie `[]`“): laut abweisen.

import type { AuftragsLvChangeSet, Bauteilzuordnung, IfcGlobalId, Knoten, Position } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { direktTransport, speicherUeberTransport } from './client';
import { wert } from './testhilfe/node';
import { ausBaumNehmen, feldAendern, standAnlegen, umkehren } from './testhilfe/umkehrung';
import { anwenden, AUFTRAG, AUFTRAG_ZUSTAND, F, mitAuftrag } from './testhilfe/v14';

const lv = F.lv.leistungsverzeichnis;
const positionen = (k: readonly Knoten[]): Position[] => k.filter((x): x is Position => x.art === 'position');
const erste = positionen(lv.knoten)[0] as Position;

const ZUORDNUNGEN: readonly Bauteilzuordnung[] = [
  { globalId: '1Wand$Aussen_EG_000001' as IfcGlobalId, mengenart: 'NetVolume' },
  { globalId: '1Wand$Aussen_EG_000002' as IfcGlobalId, mengenart: 'Stueck' },
];
const BEFEHL = { art: 'BauteileZuordnen', positionId: erste.id, bauteile: ZUORDNUNGEN } as const;

describe('Bauteilzuordnungen an Positionen (v1.6)', () => {
  it('im LV setzen und per Undo entfernen; im Papierkorb und im LV-Stand bleiben sie erhalten', async () => {
    const kern = await mitAuftrag();
    const mit: Position = { ...erste, bauteile: ZUORDNUNGEN };
    const setzen = feldAendern(F.lv, erste.id, mit, '9.99');
    wert(await anwenden(kern, setzen, BEFEHL));
    const gesetzt = wert(kern.lvLaden(lv.id));
    expect(positionen(gesetzt.leistungsverzeichnis.knoten)[0]).toEqual(mit);
    wert(await anwenden(kern, umkehren(setzen)));
    expect(wert(kern.lvLaden(lv.id))).toEqual(F.lv);

    wert(await anwenden(kern, setzen));
    wert(await anwenden(kern, standAnlegen(gesetzt, 'stand-v16', 'Mit Bauteilen')));
    const korb = ausBaumNehmen(gesetzt, [erste.id], { id: 'eintrag-v16', nummer: 1 });
    wert(await anwenden(kern, korb));
    expect(wert(kern.lvLaden(lv.id)).papierkorb?.[0]?.knoten[0]).toEqual(mit);
    const stand = wert(kern.lvStandLaden('stand-v16' as never)).zustand;
    expect(positionen(stand.leistungsverzeichnis.knoten)[0]).toEqual(mit);
    wert(await anwenden(kern, umkehren(korb)));
    expect(wert(kern.lvLaden(lv.id))).toEqual(gesetzt);
  });

  it('im Auftrags-LV setzen und per Undo entfernen; geladen über auftragsLeistungsverzeichnisse', async () => {
    const kern = await mitAuftrag();
    const s = speicherUeberTransport(direktTransport(kern), null);
    const vorher = positionen(AUFTRAG_ZUSTAND.auftragsLeistungsverzeichnis.knoten)[0] as Position;
    const leer = { positionen: [], gliederungen: [] };
    const cs: AuftragsLvChangeSet = {
      art: 'auftrags-leistungsverzeichnis',
      auftragsLeistungsverzeichnisId: AUFTRAG,
      kopf: null,
      knoten: {
        hinzugefuegt: [],
        geaendert: [{ vorher, nachher: { ...vorher, bauteile: ZUORDNUNGEN } }],
        entfernt: [],
      },
      summen: { ...leer, gesamt: null, vorher: { ...leer, gesamt: null, entfernt: leer } },
    };
    wert(await anwenden(kern, cs, BEFEHL));
    const geladen = wert(await s.auftragsLeistungsverzeichnisse.laden(AUFTRAG));
    expect(positionen(geladen.auftragsLeistungsverzeichnis.knoten)[0]?.bauteile).toEqual(ZUORDNUNGEN);
    wert(await anwenden(kern, umkehren(cs)));
    expect(wert(await s.auftragsLeistungsverzeichnisse.laden(AUFTRAG))).toEqual(AUFTRAG_ZUSTAND);
  });

  it('eine leere Liste gibt es im Zustand nicht (der Vertrag: „nie []“): unbekannt, nichts geschrieben', async () => {
    const kern = await mitAuftrag();
    const r = await anwenden(kern, feldAendern(F.lv, erste.id, { ...erste, bauteile: [] }, '9.99'));
    expect(!r.ok && r.fehler.code).toBe('unbekannt');
    expect(wert(kern.lvLaden(lv.id))).toEqual(F.lv);
  });
});
