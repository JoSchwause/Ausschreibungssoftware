// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle am Mangel (Ticket 111 Punkt 1; `vertrag` v1.6, D-57, D-97.13): Golden-Fälle für Anlegen, Angaben, Statusverlauf,
// Löschen, die Prüfung der Nummer gegen den Bestand und die Nummernvergabe.

import type { Mangel, MangelZustand } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import {
  mangelBefehlAusfuehren,
  mangelChangeSetAnwenden,
  mangelChangeSetUmkehren,
  naechsteMangelnummer,
} from './index';
import { GLOBAL_ID, POSITION, fehler, mangel, mangelId, wert } from './testhilfen';

const bestandVon = (...m: Mangel[]) => m.map(({ id, nummer }) => ({ id, nummer }));
const zustand = (m: Mangel): MangelZustand => ({ mangel: m });

describe('MangelAnlegen', () => {
  it('legt einen Mangel an: ChangeSet mit vorher null und dem Mangel nachher', () => {
    const m = mangel(1);
    expect(wert(mangelBefehlAusfuehren(null, { art: 'MangelAnlegen', mangel: m }, []))).toEqual({
      art: 'mangel',
      mangelId: m.id,
      mangel: { vorher: null, nachher: m },
    });
  });

  it('weist eine Nummer ab, die im Bestand schon ein anderer Mangel trägt; der eigene Eintrag zählt nicht', () => {
    const m = mangel(2);
    expect(
      fehler(
        mangelBefehlAusfuehren(
          null,
          { art: 'MangelAnlegen', mangel: m },
          bestandVon(mangel(1), mangel(2, { id: mangelId(9) })),
        ),
      ),
    ).toEqual({
      code: 'ungueltige-eingabe',
      feld: 'nummer',
    });
    expect(
      mangelBefehlAusfuehren(null, { art: 'MangelAnlegen', mangel: m }, bestandVon(mangel(1), m)).ok,
    ).toBe(true);
  });

  it('weist eine Nummer ab, die keine ganze Zahl ≥ 1 ist', () => {
    for (const nummer of [0, -1, 1.5, Number.NaN]) {
      expect(
        fehler(mangelBefehlAusfuehren(null, { art: 'MangelAnlegen', mangel: mangel(1, { nummer }) }, [])),
      ).toEqual({
        code: 'ungueltige-eingabe',
        feld: 'nummer',
      });
    }
  });

  it('nimmt einen nacherfassten Verlauf an, wenn jeder Wechsel zulässig ist und die Daten nicht fallen', () => {
    const m = mangel(1, {
      verlauf: [
        { status: 'offen', datum: '2026-11-10', bemerkung: null },
        { status: 'angezeigt', datum: '2026-11-10', bemerkung: 'Mängelanzeige' },
        { status: 'beseitigt', datum: '2026-11-19', bemerkung: null },
        { status: 'offen', datum: '2026-11-23', bemerkung: 'Nachbesserung abgelehnt' },
        { status: 'angezeigt', datum: '2026-11-23', bemerkung: null },
      ],
    });
    expect(mangelBefehlAusfuehren(null, { art: 'MangelAnlegen', mangel: m }, []).ok).toBe(true);
  });

  it('weist einen Verlauf ab, der nicht mit offen beginnt oder einen unzulässigen Wechsel enthält', () => {
    const anlegen = (verlauf: Mangel['verlauf']) =>
      fehler(mangelBefehlAusfuehren(null, { art: 'MangelAnlegen', mangel: mangel(1, { verlauf }) }, []));
    expect(anlegen([{ status: 'angezeigt', datum: '2026-11-10', bemerkung: null }])).toEqual({
      code: 'statuswechsel-unzulaessig',
      feld: 'status',
    });
    expect(
      anlegen([
        { status: 'offen', datum: '2026-11-10', bemerkung: null },
        { status: 'beseitigt', datum: '2026-11-11', bemerkung: null },
      ]),
    ).toEqual({ code: 'statuswechsel-unzulaessig', feld: 'status' });
    expect(
      anlegen([
        { status: 'offen', datum: '2026-11-10', bemerkung: null },
        { status: 'offen', datum: '2026-11-11', bemerkung: null },
      ]),
    ).toEqual({ code: 'statuswechsel-unzulaessig', feld: 'status' });
  });

  it('weist einen leeren Verlauf, fallende Daten und einen Verlauf vor der Feststellung ab', () => {
    const anlegen = (aenderung: Partial<Mangel>) =>
      fehler(mangelBefehlAusfuehren(null, { art: 'MangelAnlegen', mangel: mangel(1, aenderung) }, []));
    expect(anlegen({ verlauf: [] })).toEqual({ code: 'ungueltige-eingabe', feld: 'verlauf' });
    expect(
      anlegen({
        verlauf: [
          { status: 'offen', datum: '2026-11-12', bemerkung: null },
          { status: 'angezeigt', datum: '2026-11-11', bemerkung: null },
        ],
      }),
    ).toEqual({ code: 'ungueltige-eingabe', feld: 'datum' });
    expect(anlegen({ festgestellt: '2026-11-11' })).toEqual({
      code: 'ungueltige-eingabe',
      feld: 'festgestellt',
    });
  });

  it('prüft die Form: Titel, Daten, Position nur mit Auftrags-LV, GlobalId', () => {
    const anlegen = (aenderung: Partial<Mangel>) =>
      fehler(mangelBefehlAusfuehren(null, { art: 'MangelAnlegen', mangel: mangel(1, aenderung) }, []));
    expect(anlegen({ titel: '' })).toEqual({ code: 'ungueltige-eingabe', feld: 'titel' });
    expect(anlegen({ titel: '   ' })).toEqual({ code: 'ungueltige-eingabe', feld: 'titel' });
    expect(anlegen({ festgestellt: '2026-02-29' })).toEqual({
      code: 'ungueltige-eingabe',
      feld: 'festgestellt',
    });
    expect(anlegen({ frist: '20.11.2026' })).toEqual({ code: 'ungueltige-eingabe', feld: 'frist' });
    expect(anlegen({ verlauf: [{ status: 'offen', datum: '2026-11-31', bemerkung: null }] })).toEqual({
      code: 'ungueltige-eingabe',
      feld: 'datum',
    });
    expect(anlegen({ auftragsLvId: null, positionId: POSITION })).toEqual({
      code: 'ungueltige-eingabe',
      feld: 'positionId',
    });
    expect(anlegen({ bauteil: { bauwerksmodellId: null, globalId: 'zu-kurz' as typeof GLOBAL_ID } })).toEqual(
      { code: 'ungueltige-eingabe', feld: 'bauteil' },
    );
  });

  it('nimmt Position und Bauteil an und speichert leere Texte als null', () => {
    const m = mangel(1, {
      positionId: POSITION,
      bauteil: { bauwerksmodellId: null, globalId: GLOBAL_ID },
      beschreibung: '',
      ort: '',
      verlauf: [{ status: 'offen', datum: '2026-11-10', bemerkung: '' }],
    });
    const cs = wert(mangelBefehlAusfuehren(null, { art: 'MangelAnlegen', mangel: m }, []));
    expect(cs.mangel.nachher).toEqual({
      ...m,
      beschreibung: null,
      ort: null,
      verlauf: [{ status: 'offen', datum: '2026-11-10', bemerkung: null }],
    });
  });

  it('braucht den Zustand null', () => {
    expect(
      fehler(mangelBefehlAusfuehren(zustand(mangel(1)), { art: 'MangelAnlegen', mangel: mangel(1) }, [])),
    ).toEqual({
      code: 'befehl-nicht-zustaendig',
    });
  });
});

describe('MangelstatusSetzen (Statusverlauf)', () => {
  const setzen = (m: Mangel, status: Mangel['verlauf'][number]['status'], datum: string) =>
    mangelBefehlAusfuehren(
      zustand(m),
      { art: 'MangelstatusSetzen', eintrag: { status, datum, bemerkung: null } },
      [],
    );

  it('hängt einen zulässigen Wechsel an den Verlauf an und lässt alles andere stehen', () => {
    const m = mangel(1);
    const cs = wert(setzen(m, 'angezeigt', '2026-11-11'));
    expect(cs.mangel).toEqual({
      vorher: m,
      nachher: {
        ...m,
        verlauf: [...m.verlauf, { status: 'angezeigt', datum: '2026-11-11', bemerkung: null }],
      },
    });
  });

  it('geht den ganzen Regelweg und den Rückweg nach abgelehnter Nachbesserung', () => {
    let m = mangel(1);
    const schritte: [Mangel['verlauf'][number]['status'], string][] = [
      ['angezeigt', '2026-11-11'],
      ['beseitigt', '2026-11-19'],
      ['offen', '2026-11-23'],
      ['angezeigt', '2026-11-23'],
      ['beseitigt', '2026-11-30'],
      ['abgenommen', '2026-12-02'],
    ];
    for (const [status, datum] of schritte) {
      const cs = wert(setzen(m, status, datum));
      const z = mangelChangeSetAnwenden(zustand(m), cs);
      if (z === null) throw new Error('Mangel verschwunden');
      m = z.mangel;
    }
    expect(m.verlauf.map((e) => e.status)).toEqual([
      'offen',
      'angezeigt',
      'beseitigt',
      'offen',
      'angezeigt',
      'beseitigt',
      'abgenommen',
    ]);
  });

  it('weist unzulässige Wechsel ab, auch zum selben Status und aus abgenommen', () => {
    const angezeigt = mangel(1, {
      verlauf: [
        { status: 'offen', datum: '2026-11-10', bemerkung: null },
        { status: 'angezeigt', datum: '2026-11-11', bemerkung: null },
      ],
    });
    const abgenommen = mangel(2, {
      verlauf: [
        { status: 'offen', datum: '2026-11-10', bemerkung: null },
        { status: 'angezeigt', datum: '2026-11-11', bemerkung: null },
        { status: 'beseitigt', datum: '2026-11-19', bemerkung: null },
        { status: 'abgenommen', datum: '2026-11-23', bemerkung: null },
      ],
    });
    const unzulaessig = { code: 'statuswechsel-unzulaessig', feld: 'status' };
    expect(fehler(setzen(mangel(3), 'beseitigt', '2026-11-12'))).toEqual(unzulaessig);
    expect(fehler(setzen(mangel(3), 'offen', '2026-11-12'))).toEqual(unzulaessig);
    expect(fehler(setzen(angezeigt, 'offen', '2026-11-12'))).toEqual(unzulaessig);
    expect(fehler(setzen(abgenommen, 'offen', '2026-11-24'))).toEqual(unzulaessig);
    expect(fehler(setzen(abgenommen, 'abgenommen', '2026-11-24'))).toEqual(unzulaessig);
  });

  it('übernimmt weitere Felder des Eintrags unverändert (die Frist der Mängelanzeige, D-66; Q5)', () => {
    // `Mangelverlaufseintrag.frist?` kommt mit dem Nachtrag zu Ticket 97; bis dahin nur als zusätzliches Feld.
    const eintrag = {
      status: 'angezeigt',
      datum: '2026-11-11',
      bemerkung: null,
      frist: '2026-11-20',
    } as const;
    const cs = wert(mangelBefehlAusfuehren(zustand(mangel(1)), { art: 'MangelstatusSetzen', eintrag }, []));
    expect(cs.mangel.nachher?.verlauf.at(-1)).toEqual(eintrag);
  });

  it('weist ein Datum vor dem letzten Eintrag ab; derselbe Tag ist zulässig', () => {
    expect(fehler(setzen(mangel(1), 'angezeigt', '2026-11-09'))).toEqual({
      code: 'ungueltige-eingabe',
      feld: 'datum',
    });
    expect(setzen(mangel(1), 'angezeigt', '2026-11-10').ok).toBe(true);
    expect(fehler(setzen(mangel(1), 'angezeigt', '2026-13-01'))).toEqual({
      code: 'ungueltige-eingabe',
      feld: 'datum',
    });
  });

  it('weist einen unbekannten Status ab und braucht einen Zustand', () => {
    expect(
      fehler(setzen(mangel(1), 'erledigt' as Mangel['verlauf'][number]['status'], '2026-11-11')),
    ).toEqual({ code: 'ungueltige-eingabe', feld: 'status' });
    expect(
      fehler(
        mangelBefehlAusfuehren(
          null,
          {
            art: 'MangelstatusSetzen',
            eintrag: { status: 'angezeigt', datum: '2026-11-11', bemerkung: null },
          },
          [],
        ),
      ),
    ).toEqual({ code: 'befehl-nicht-zustaendig' });
  });
});

describe('MangelangabenSetzen', () => {
  const angaben = (m: Mangel) => ({
    art: 'MangelangabenSetzen' as const,
    titel: m.titel,
    beschreibung: m.beschreibung,
    ort: m.ort,
    auftragsLvId: m.auftragsLvId,
    positionId: m.positionId,
    bauteil: m.bauteil,
    festgestellt: m.festgestellt,
    frist: m.frist,
  });

  it('setzt die Angaben als ganze Werte; Kennung, Projekt, Nummer und Verlauf bleiben', () => {
    const m = mangel(4);
    const neu = { ...angaben(m), titel: 'Riss', frist: '2026-12-04', ort: 'Achse B', beschreibung: '' };
    const cs = wert(mangelBefehlAusfuehren(zustand(m), neu, []));
    expect(cs.mangel).toEqual({
      vorher: m,
      nachher: { ...m, titel: 'Riss', frist: '2026-12-04', ort: 'Achse B', beschreibung: null },
    });
  });

  it('weist eine Feststellung nach dem ersten Verlaufseintrag und Formfehler ab', () => {
    const m = mangel(1);
    expect(
      fehler(mangelBefehlAusfuehren(zustand(m), { ...angaben(m), festgestellt: '2026-11-11' }, [])),
    ).toEqual({
      code: 'ungueltige-eingabe',
      feld: 'festgestellt',
    });
    expect(mangelBefehlAusfuehren(zustand(m), { ...angaben(m), festgestellt: '2026-11-09' }, []).ok).toBe(
      true,
    );
    expect(fehler(mangelBefehlAusfuehren(zustand(m), { ...angaben(m), frist: '2026-11' }, []))).toEqual({
      code: 'ungueltige-eingabe',
      feld: 'frist',
    });
    expect(
      fehler(
        mangelBefehlAusfuehren(zustand(m), { ...angaben(m), auftragsLvId: null, positionId: POSITION }, []),
      ),
    ).toEqual({ code: 'ungueltige-eingabe', feld: 'positionId' });
  });
});

describe('MangelLoeschen und Umkehrung', () => {
  it('löscht mit dem vollen Stand vorher; die Umkehrung legt ihn wieder an', () => {
    const m = mangel(1);
    const cs = wert(mangelBefehlAusfuehren(zustand(m), { art: 'MangelLoeschen' }, []));
    expect(cs).toEqual({ art: 'mangel', mangelId: m.id, mangel: { vorher: m, nachher: null } });
    expect(mangelChangeSetAnwenden(zustand(m), cs)).toBeNull();
    const zurueck = mangelChangeSetUmkehren(cs);
    expect(zurueck).toEqual({ art: 'mangel', mangelId: m.id, mangel: { vorher: null, nachher: m } });
    expect(mangelChangeSetAnwenden(null, zurueck)).toEqual({ mangel: m });
  });

  it('braucht einen Zustand', () => {
    expect(fehler(mangelBefehlAusfuehren(null, { art: 'MangelLoeschen' }, []))).toEqual({
      code: 'befehl-nicht-zustaendig',
    });
  });
});

describe('naechsteMangelnummer', () => {
  it('schlägt die höchste Nummer + 1 vor, 1 im leeren Projekt; Lücken bleiben', () => {
    expect(naechsteMangelnummer([])).toBe(1);
    expect(naechsteMangelnummer(bestandVon(mangel(1), mangel(2), mangel(5)))).toBe(6);
    expect(naechsteMangelnummer(bestandVon(mangel(3), mangel(1)))).toBe(4);
  });
});
