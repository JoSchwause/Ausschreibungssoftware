// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle am Bautagebucheintrag (Ticket 111 Punkt 4; `vertrag` v1.6, D-57): Anlegen und Ersetzen, Löschen, ein Eintrag je
// Datum gegen den Bestand, ganzzahlige Temperaturen und Köpfe.

import type { Bautagebucheintrag, BautagebucheintragZustand } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import {
  bautagebucheintragBefehlAusfuehren,
  bautagebucheintragChangeSetAnwenden,
  bautagebucheintragChangeSetUmkehren,
} from './index';
import { PROJEKT, eintrag, eintragId, fehler, wert } from './testhilfen';

const zustand = (e: Bautagebucheintrag): BautagebucheintragZustand => ({ bautagebucheintrag: e });
const bestandVon = (...e: Bautagebucheintrag[]) => e.map(({ id, datum }) => ({ id, datum }));
const setzen = (z: BautagebucheintragZustand | null, e: Bautagebucheintrag, bestand = bestandVon()) =>
  bautagebucheintragBefehlAusfuehren(z, { art: 'BautagebucheintragSetzen', eintrag: e }, bestand);

describe('BautagebucheintragSetzen', () => {
  it('legt ohne Zustand einen Eintrag an', () => {
    const e = eintrag(1, '2026-11-16');
    expect(wert(setzen(null, e))).toEqual({
      art: 'bautagebucheintrag',
      bautagebucheintragId: e.id,
      bautagebucheintrag: { vorher: null, nachher: e },
    });
  });

  it('ersetzt mit Zustand den Eintrag; Kennung und Projekt bleiben gleich', () => {
    const alt = eintrag(1, '2026-11-16');
    const neu = eintrag(1, '2026-11-17', { leistungen: 'Mauerwerk EG' });
    expect(wert(setzen(zustand(alt), neu, bestandVon(alt))).bautagebucheintrag).toEqual({
      vorher: alt,
      nachher: neu,
    });
    expect(fehler(setzen(zustand(alt), eintrag(2, '2026-11-16')))).toEqual({
      code: 'ungueltige-eingabe',
      feld: 'id',
    });
    expect(fehler(setzen(zustand(alt), { ...alt, projektId: 'anderes' as typeof PROJEKT }))).toEqual({
      code: 'ungueltige-eingabe',
      feld: 'projektId',
    });
  });

  it('weist ein Datum ab, das im Bestand schon ein anderer Eintrag trägt; der eigene zählt nicht', () => {
    const vorhanden = eintrag(1, '2026-11-16');
    expect(fehler(setzen(null, eintrag(2, '2026-11-16'), bestandVon(vorhanden)))).toEqual({
      code: 'ungueltige-eingabe',
      feld: 'datum',
    });
    expect(setzen(null, eintrag(2, '2026-11-17'), bestandVon(vorhanden)).ok).toBe(true);
    expect(
      setzen(zustand(vorhanden), eintrag(1, '2026-11-16', { geraete: 'Kran' }), bestandVon(vorhanden)).ok,
    ).toBe(true);
  });

  it('prüft Datum, ganzzahlige Temperaturen (Min ≤ Max) und Köpfe (ganz, ≥ 0), Firma nicht leer und einmal', () => {
    const anlegen = (aenderung: Partial<Bautagebucheintrag>) =>
      fehler(setzen(null, eintrag(1, '2026-11-16', aenderung)));
    const wetter = (temperaturMin: number | null, temperaturMax: number | null) => ({
      wetter: { beschreibung: null, temperaturMin, temperaturMax },
    });
    expect(anlegen({ datum: '2026-11-31' })).toEqual({ code: 'ungueltige-eingabe', feld: 'datum' });
    expect(anlegen(wetter(2.5, 8))).toEqual({ code: 'ungueltige-eingabe', feld: 'temperaturMin' });
    expect(anlegen(wetter(2, Number.NaN))).toEqual({ code: 'ungueltige-eingabe', feld: 'temperaturMax' });
    expect(anlegen(wetter(9, 8))).toEqual({ code: 'ungueltige-eingabe', feld: 'temperaturMin' });
    expect(anlegen({ arbeitskraefte: [{ firma: 'A', anzahl: -1 }] })).toEqual({
      code: 'ungueltige-eingabe',
      feld: 'anzahl',
    });
    expect(anlegen({ arbeitskraefte: [{ firma: 'A', anzahl: 1.5 }] })).toEqual({
      code: 'ungueltige-eingabe',
      feld: 'anzahl',
    });
    expect(anlegen({ arbeitskraefte: [{ firma: ' ', anzahl: 1 }] })).toEqual({
      code: 'ungueltige-eingabe',
      feld: 'firma',
    });
    expect(
      anlegen({
        arbeitskraefte: [
          { firma: 'A', anzahl: 1 },
          { firma: 'A', anzahl: 2 },
        ],
      }),
    ).toEqual({ code: 'ungueltige-eingabe', feld: 'firma' });
  });

  it('nimmt Frost, null-Temperaturen, null Köpfe und keine Arbeitskräfte an; leere Texte werden null', () => {
    const e = eintrag(1, '2026-11-19', {
      wetter: { beschreibung: '', temperaturMin: -3, temperaturMax: null },
      arbeitskraefte: [{ firma: 'Elektro', anzahl: 0 }],
      geraete: '',
      leistungen: '',
      behinderungen: '',
      vorkommnisse: '',
    });
    expect(wert(setzen(null, e)).bautagebucheintrag.nachher).toEqual({
      ...e,
      wetter: { beschreibung: null, temperaturMin: -3, temperaturMax: null },
      geraete: null,
      leistungen: null,
      behinderungen: null,
      vorkommnisse: null,
    });
    expect(setzen(null, eintrag(1, '2026-11-19', { arbeitskraefte: [] })).ok).toBe(true);
  });
});

describe('BautagebucheintragLoeschen und Umkehrung', () => {
  it('löscht mit dem vollen Stand vorher; die Umkehrung legt ihn wieder an', () => {
    const e = eintrag(1, '2026-11-16');
    const cs = wert(
      bautagebucheintragBefehlAusfuehren(zustand(e), { art: 'BautagebucheintragLoeschen' }, []),
    );
    expect(cs).toEqual({
      art: 'bautagebucheintrag',
      bautagebucheintragId: eintragId(1),
      bautagebucheintrag: { vorher: e, nachher: null },
    });
    expect(bautagebucheintragChangeSetAnwenden(zustand(e), cs)).toBeNull();
    const zurueck = bautagebucheintragChangeSetUmkehren(cs);
    expect(bautagebucheintragChangeSetAnwenden(null, zurueck)).toEqual(zustand(e));
  });

  it('braucht einen Zustand', () => {
    expect(
      fehler(bautagebucheintragBefehlAusfuehren(null, { art: 'BautagebucheintragLoeschen' }, [])),
    ).toEqual({
      code: 'befehl-nicht-zustaendig',
    });
  });
});
