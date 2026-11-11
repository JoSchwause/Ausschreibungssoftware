// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 30: LV als Ganzes anlegen und löschen (v1.1a). Anlegen und Löschen sind Gegenstücke: die Umkehrung des einen
// ist das andere, allein aus dem ChangeSet.

import { describe, expect, it } from 'vitest';
import type {
  LeistungsverzeichnisId,
  LvChangeSet,
  LvInhalt,
  LvZustand,
  OzMaske,
  Position,
} from '@tethys/vertrag';
import {
  ZUSTAENDIGES_TICKET,
  changeSetUmkehren,
  lvBefehlAusfuehren,
  lvChangeSetAnwenden,
  ozMaskeFehler,
} from './index';
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
      summeBedarfOhneGesamtbetrag: '0.00',
      summeWahl: '0.00',
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
        { gliederungId: 'T1', summe: '35.00', summeBedarfOhneGesamtbetrag: '0.00', summeWahl: '0.00' },
        { gliederungId: 'T1a', summe: '15.00', summeBedarfOhneGesamtbetrag: '0.00', summeWahl: '0.00' },
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

const anlegen = (z: Partial<LvInhalt> = {}, lvId: string = LV_ID) =>
  lvBefehlAusfuehren(null, {
    art: 'LeistungsverzeichnisAnlegen',
    id: lvId as LeistungsverzeichnisId,
    projektId: PROJEKT_ID,
    inhalt: { ...inhalt([]), ...z },
  });

describe('LeistungsverzeichnisAnlegen: Wurzel (Punkt 5)', () => {
  it('inhalt.wurzelId weicht von id ab: ungueltige-eingabe, feld inhalt.wurzelId', () => {
    const e = anlegen({}, 'lv-anders');
    expect(e.ok).toBe(false);
    if (!e.ok) {
      expect(e.fehler.code).toBe('ungueltige-eingabe');
      expect(e.fehler.feld).toBe('inhalt.wurzelId');
    }
  });

  it('ein Knoten der obersten Ebene mit anderer elternId wird von den Baumregeln abgewiesen', () => {
    const e = anlegen({ knoten: [posKnoten('P1', 'lv-anders', 0, null, null)] });
    expect(e.ok).toBe(false);
    if (!e.ok) {
      expect(e.fehler.code).toBe('eltern-unbekannt');
      expect(e.fehler.knotenId).toBe('P1');
    }
  });
});

describe('LeistungsverzeichnisAnlegen: Maskenbefund (Punkt 9)', () => {
  const zuLang: OzMaske = {
    gliederung: Array.from({ length: 5 }, () => ({ laenge: 2, zeichen: 'numerisch' as const })),
    position: { laenge: 4, zeichen: 'numerisch' },
    index: { laenge: 1, zeichen: 'alphanumerisch' },
    trennzeichen: '.',
  };

  it('eine beanstandete Maske wird angenommen; der Befund kommt als Hinweis oz-maske-ungueltig', () => {
    const cs = erwarteOk(anlegen({ ozMaske: zuLang }));
    expect(cs.kopf?.nachher?.ozMaske).toEqual(zuLang);
    expect(cs.hinweise).toEqual([
      { code: 'oz-maske-ungueltig', meldung: ozMaskeFehler(zuLang), feld: 'ozMaske' },
    ]);
    expect(cs.hinweise?.[0]?.meldung).toMatch(/15/);
  });

  it('eine gültige Maske: kein Hinweis', () => {
    expect(erwarteOk(anlegen()).hinweise).toBeUndefined();
  });

  it('OzMaskeSetzen weist dieselbe Maske weiter ab (Handeingabe)', () => {
    const e = lvBefehlAusfuehren(lvMit([]), { art: 'OzMaskeSetzen', maske: zuLang });
    expect(e.ok).toBe(false);
    if (!e.ok) expect(e.fehler.code).toBe('maske-ungueltig');
  });
});

describe('LeistungsverzeichnisAnlegen: leere Einheit (Punkt 10)', () => {
  it("'' als Einheit an Position und Unterbeschreibung landet als null; Leerzeichen bleiben Text", () => {
    const p1 = posKnoten('P1', LV_ID, 0, '1.000', '2.000', { einheit: '' });
    const p2: Position = {
      ...posKnoten('P2', LV_ID, 1, null, null, { einheit: ' ' }),
      leitbeschreibung: {
        unterbeschreibungen: [
          { nummer: '01', kurztext: 'a', langtext: [], menge: null, einheit: '' },
          { nummer: '02', kurztext: 'b', langtext: [], menge: null, einheit: 'm' },
        ],
      },
    };
    const z = anwenden(null, erwarteOk(anlegen({ knoten: [p1, p2] })));
    const [k1, k2] = z.leistungsverzeichnis.knoten;
    expect(k1?.art === 'position' && k1.einheit).toBeNull();
    expect(k2?.art === 'position' && k2.einheit).toBe(' ');
    expect(k2?.art === 'position' && k2.leitbeschreibung?.unterbeschreibungen.map((u) => u.einheit)).toEqual([
      null,
      'm',
    ]);
  });
});
