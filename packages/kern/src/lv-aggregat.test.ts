// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 30: LV als Ganzes anlegen und löschen (v1.1a). Anlegen und Löschen sind Gegenstücke: die Umkehrung des einen
// ist das andere, allein aus dem ChangeSet.

import { describe, expect, it } from 'vitest';
import type { LvChangeSet, LvZustand } from '@tethys/vertrag';
import { ZUSTAENDIGES_TICKET, changeSetUmkehren, lvBefehlAusfuehren, lvChangeSetAnwenden } from './index';
import {
  LV_ID,
  PROJEKT_ID,
  anwenden,
  erwarteOk,
  inhalt,
  lvMit,
  ohneReihenfolge,
  posKnoten,
  prozentNachlass,
  titelKnoten,
} from './testhilfen';

/** T1 (P1 2 × 10,00), darin T1a (P2 3 × 5,00), daneben P3 1 × 7,50; 10 % Nachlass. */
const mitSummen = (): LvZustand =>
  lvMit(
    [
      titelKnoten('T1', LV_ID, 0),
      posKnoten('P1', 'T1', 0, '2.000', '10.000'),
      titelKnoten('T1a', 'T1', 1),
      posKnoten('P2', 'T1a', 0, '3.000', '5.000'),
      posKnoten('P3', LV_ID, 1, '1.000', '7.500'),
    ],
    { nachlass: prozentNachlass('10.00') },
  );

const loeschen = (z: LvZustand): LvChangeSet =>
  erwarteOk(lvBefehlAusfuehren(z, { art: 'LeistungsverzeichnisLoeschen' }));

describe('LeistungsverzeichnisLoeschen', () => {
  it('ist umgesetzt (kein Eintrag mehr in ZUSTAENDIGES_TICKET)', () => {
    expect(Object.keys(ZUSTAENDIGES_TICKET)).not.toContain('LeistungsverzeichnisLoeschen');
  });

  it('ChangeSet: Kopf vorher → null, alle Knoten entfernt (Eltern vor Kindern), alle Summen unter vorher', () => {
    const z = mitSummen();
    const cs = loeschen(z);
    expect(cs.kopf?.vorher).toMatchObject({ id: LV_ID, projektId: PROJEKT_ID, name: 'Testverzeichnis' });
    expect(cs.kopf?.nachher).toBeNull();
    expect(cs.knoten.hinzugefuegt).toEqual([]);
    expect(cs.knoten.geaendert).toEqual([]);
    expect(cs.knoten.entfernt.map((k) => k.id)).toEqual(['T1', 'P1', 'T1a', 'P2', 'P3']);
    expect(cs.summen.positionen).toEqual([]);
    expect(cs.summen.gliederungen).toEqual([]);
    expect(cs.summen.gesamt).toBeNull();
    expect(cs.summen.vorher?.gesamt).toEqual({
      netto: '42.50',
      nachlass: '4.25',
      nettoNachNachlass: '38.25',
      mwst: '7.27',
      brutto: '45.52',
    });
    expect(cs.summen.vorher?.positionen).toEqual([]);
    expect(cs.summen.vorher?.gliederungen).toEqual([]);
    expect(cs.summen.vorher?.entfernt).toEqual({
      positionen: [
        { positionId: 'P1', gesamtpreis: '20.00', gehtInSummeEin: true },
        { positionId: 'P2', gesamtpreis: '15.00', gehtInSummeEin: true },
        { positionId: 'P3', gesamtpreis: '7.50', gehtInSummeEin: true },
      ],
      gliederungen: [
        { gliederungId: 'T1', summe: '35.00' },
        { gliederungId: 'T1a', summe: '15.00' },
      ],
    });
  });

  it('Anwenden liefert null; die Umkehrung, auf null angewendet, ergibt das LV samt Summen', () => {
    const z = mitSummen();
    const cs = loeschen(z);
    expect(lvChangeSetAnwenden(z, cs)).toBeNull();
    const zurueck = lvChangeSetAnwenden(null, changeSetUmkehren(cs));
    expect(zurueck).toEqual(z);
    expect(ohneReihenfolge(changeSetUmkehren(changeSetUmkehren(cs)))).toEqual(ohneReihenfolge(cs));
  });

  it('leeres LV: ebenso umkehrbar', () => {
    const z = lvMit([]);
    const cs = loeschen(z);
    expect(cs.knoten.entfernt).toEqual([]);
    expect(lvChangeSetAnwenden(z, cs)).toBeNull();
    expect(lvChangeSetAnwenden(null, changeSetUmkehren(cs))).toEqual(z);
  });

  it('ohne Zustand: befehl-nicht-zustaendig', () => {
    const e = lvBefehlAusfuehren(null, { art: 'LeistungsverzeichnisLoeschen' });
    expect(e.ok).toBe(false);
    if (!e.ok) expect(e.fehler.code).toBe('befehl-nicht-zustaendig');
  });
});

describe('LeistungsverzeichnisAnlegen und seine Umkehrung', () => {
  it('die Umkehrung des Anlegens entfernt das LV (Anwenden: null) und ist ein Löschen', () => {
    const z = mitSummen();
    const anlegen = erwarteOk(
      lvBefehlAusfuehren(null, {
        art: 'LeistungsverzeichnisAnlegen',
        id: LV_ID,
        projektId: PROJEKT_ID,
        inhalt: { ...inhalt(z.leistungsverzeichnis.knoten), nachlass: prozentNachlass('10.00') },
      }),
    );
    expect(anwenden(null, anlegen)).toEqual(z);
    const rueck = changeSetUmkehren(anlegen);
    expect(lvChangeSetAnwenden(z, rueck)).toBeNull();
    expect(ohneReihenfolge(rueck)).toEqual(ohneReihenfolge(loeschen(z)));
    expect(ohneReihenfolge(changeSetUmkehren(rueck))).toEqual(ohneReihenfolge(anlegen));
  });
});
