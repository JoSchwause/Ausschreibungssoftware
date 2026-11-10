// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 30, Punkt 8: negatives Netto nach Nachlass (N5, E-06) ist ein Hinweis am Befehl, keine Sperre.

import { describe, expect, it } from 'vitest';
import type { Menge, PositionId } from '@tethys/vertrag';
import { HINWEIS_ANNAHMEN } from './hinweise';
import { changeSetUmkehren, lvBefehlAusfuehren } from './index';
import { LV_ID, anwenden, betragNachlass, erwarteOk, lvMit, posKnoten, titelKnoten } from './testhilfen';

/** Netto 42,50 (T1 mit P1 2 × 10,00 und P2 3 × 5,00, dazu P3 1 × 7,50). */
const lv = () =>
  lvMit([
    titelKnoten('T1', LV_ID, 0),
    posKnoten('P1', 'T1', 0, '2.000', '10.000'),
    posKnoten('P2', 'T1', 1, '3.000', '5.000'),
    posKnoten('P3', LV_ID, 1, '1.000', '7.500'),
  ]);

const NETTO_HINWEIS = { code: 'netto-nach-nachlass-negativ', feld: 'nachlass' };

describe('Hinweis netto-nach-nachlass-negativ', () => {
  it('NachlassSetzen mit Betrag über dem Netto: ChangeSet geliefert, genau ein Hinweis', () => {
    const z = lv();
    const cs = erwarteOk(lvBefehlAusfuehren(z, { art: 'NachlassSetzen', nachlass: betragNachlass('50.00') }));
    expect(cs.summen.gesamt?.nettoNachNachlass).toBe('-7.50');
    expect(cs.hinweise).toHaveLength(1);
    expect(cs.hinweise?.[0]).toMatchObject(NETTO_HINWEIS);
    expect(cs.hinweise?.[0]?.meldung).toContain('-7.50');
    expect(anwenden(z, cs).leistungsverzeichnis.nachlass).toEqual(betragNachlass('50.00'));
  });

  it('Nachlass genau gleich dem Netto (0,00): kein Hinweis', () => {
    const cs = erwarteOk(
      lvBefehlAusfuehren(lv(), { art: 'NachlassSetzen', nachlass: betragNachlass('42.50') }),
    );
    expect(cs.summen.gesamt?.nettoNachNachlass).toBe('0.00');
    expect(cs.hinweise).toBeUndefined();
  });

  it('jedes ChangeSet mit neuen, weiter negativen Gesamtsummen trägt ihn (vorläufige Annahme), andere nicht', () => {
    const z = anwenden(
      lv(),
      erwarteOk(lvBefehlAusfuehren(lv(), { art: 'NachlassSetzen', nachlass: betragNachlass('50.00') })),
    );
    const menge = erwarteOk(
      lvBefehlAusfuehren(z, { art: 'MengeAendern', positionId: 'P3' as PositionId, menge: '2.000' as Menge }),
    );
    expect(menge.summen.gesamt?.nettoNachNachlass).toBe('0.00');
    expect(menge.hinweise).toBeUndefined();
    const weniger = erwarteOk(
      lvBefehlAusfuehren(z, { art: 'MengeAendern', positionId: 'P1' as PositionId, menge: '1.000' as Menge }),
    );
    expect(weniger.hinweise?.map((h) => h.code)).toEqual(['netto-nach-nachlass-negativ']);
    const text = erwarteOk(lvBefehlAusfuehren(z, { art: 'LeistungsverzeichnisUmbenennen', name: 'x' }));
    expect(text.summen.gesamt).toBeNull();
    expect(text.hinweise).toBeUndefined();
    expect(HINWEIS_ANNAHMEN.status).toBe('vorläufige Annahme, Entscheidung offen');
  });

  it('LeistungsverzeichnisAnlegen mit Nachlass über dem Netto: angelegt, mit Hinweis', () => {
    const cs = erwarteOk(
      lvBefehlAusfuehren(null, {
        art: 'LeistungsverzeichnisAnlegen',
        id: LV_ID,
        projektId: lv().leistungsverzeichnis.projektId,
        inhalt: {
          name: 'n',
          ozMaske: lv().leistungsverzeichnis.ozMaske,
          mwstSatz: lv().leistungsverzeichnis.mwstSatz,
          nachlass: betragNachlass('1.00'),
          knoten: [],
          wurzelId: LV_ID,
        },
      }),
    );
    expect(cs.hinweise).toEqual([expect.objectContaining(NETTO_HINWEIS)]);
  });

  it('die Umkehrung trägt keine Hinweise (sie gehören zur Antwort auf den Befehl)', () => {
    const cs = erwarteOk(
      lvBefehlAusfuehren(lv(), { art: 'NachlassSetzen', nachlass: betragNachlass('50.00') }),
    );
    expect(changeSetUmkehren(cs).hinweise).toBeUndefined();
  });
});
