// SPDX-License-Identifier: AGPL-3.0-or-later
// Angebotsbefehle (Ticket 36, Punkt 3): Wirkung, minimales ChangeSet, gleicher Wert → leer, Fehlerfälle.

import { describe, expect, it } from 'vitest';
import type {
  AngebotBefehl,
  AngebotZustand,
  Befehlsfehler,
  LeistungsverzeichnisId,
  ProjektId,
} from '@tethys/vertrag';
import { angebotBefehlAusfuehrer, angebotChangeSetAnwenden, angebotSummenBerechnen } from './index';
import {
  angebot,
  betrag,
  ep,
  erwarteOk,
  hinweis,
  lv,
  nichtAngeboten,
  position,
  projekt,
  prozent,
  titel,
  wende,
} from './testhilfen';

const z = lv('lv-1', [
  titel('t1', 'lv-1', 0),
  position('p1', 't1', 0, '10.000'),
  hinweis('h1', 't1', 1),
  position('p2', 't1', 2, '5.000'),
  titel('t2', 'lv-1', 1),
  position('p3', 't2', 0, '2.000'),
]);
const proj = projekt(['b-a', 'b-b']);
const ausfuehren = angebotBefehlAusfuehrer(proj, z);

const anlegen = (
  positionen = [ep('p1', '10.000'), ep('p2', '8.000')],
  nachlass = null as ReturnType<typeof prozent> | null,
): AngebotBefehl => ({
  art: 'AngebotAnlegen',
  angebot: angebot('a1', z, 'b-a', positionen, nachlass),
});

function start(): AngebotZustand {
  const s = wende(ausfuehren, null, anlegen());
  if (s === null) throw new Error('Angebot fehlt');
  return s;
}

function fehler(zustand: AngebotZustand | null, befehl: AngebotBefehl): Befehlsfehler {
  const e = ausfuehren(zustand, befehl);
  if (e.ok) throw new Error('Fehlerwert erwartet');
  return e.fehler;
}

const leer = {
  kopf: null,
  positionen: { hinzugefuegt: [], geaendert: [], entfernt: [] },
  summen: { positionen: [], gliederungen: [], gesamt: null },
};

describe('AngebotAnlegen', () => {
  it('legt das Angebot an; Summen gleich der Neuberechnung; ChangeSet trägt Kopf, Positionen, alle Summen', () => {
    const cs = erwarteOk(ausfuehren(null, anlegen()));
    expect(cs.art).toBe('angebot');
    expect(cs.angebotId).toBe('a1');
    expect(cs.kopf?.vorher).toBeNull();
    expect(cs.kopf?.nachher).toEqual({
      id: 'a1',
      projektId: z.leistungsverzeichnis.projektId,
      leistungsverzeichnisId: 'lv-1',
      bieterId: 'b-a',
      nachlass: null,
    });
    expect(cs.positionen.hinzugefuegt).toEqual([ep('p1', '10.000'), ep('p2', '8.000')]);
    const s = angebotChangeSetAnwenden(null, cs);
    const erwartet = angebot('a1', z, 'b-a', [ep('p1', '10.000'), ep('p2', '8.000')]);
    expect(s?.angebot).toEqual(erwartet);
    expect(s?.summen).toEqual(angebotSummenBerechnen(z, erwartet));
    expect(s?.summen.gesamt.netto).toBe('140.00');
    expect(cs.summen.vorher).toEqual({
      positionen: [],
      gliederungen: [],
      gesamt: null,
      entfernt: { positionen: [], gliederungen: [] },
    });
  });

  it('mit Zustand → befehl-nicht-zustaendig', () => {
    expect(fehler(start(), anlegen()).code).toBe('befehl-nicht-zustaendig');
  });

  it('LV oder Projekt passen nicht → ungueltige-eingabe mit feld', () => {
    const a = angebot('a1', z, 'b-a', []);
    expect(
      fehler(null, {
        art: 'AngebotAnlegen',
        angebot: { ...a, leistungsverzeichnisId: 'lv-x' as LeistungsverzeichnisId },
      }),
    ).toMatchObject({ code: 'ungueltige-eingabe', feld: 'leistungsverzeichnisId' });
    expect(
      fehler(null, { art: 'AngebotAnlegen', angebot: { ...a, projektId: 'pr-x' as ProjektId } }),
    ).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'projektId',
    });
  });

  it('Bieter nicht im Projekt → ungueltige-eingabe, feld bieterId', () => {
    expect(fehler(null, { art: 'AngebotAnlegen', angebot: angebot('a1', z, 'b-x', []) })).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'bieterId',
    });
  });

  it('Position nicht im LV → knoten-unbekannt; Gliederung oder Hinweis → knotenart-unzulaessig', () => {
    expect(fehler(null, anlegen([ep('p9', '1.000')]))).toMatchObject({
      code: 'knoten-unbekannt',
      knotenId: 'p9',
    });
    expect(fehler(null, anlegen([ep('t1', '1.000')]))).toMatchObject({ code: 'knotenart-unzulaessig' });
    expect(fehler(null, anlegen([nichtAngeboten('h1')]))).toMatchObject({ code: 'knotenart-unzulaessig' });
  });

  it('dieselbe Position zweimal → ungueltige-eingabe', () => {
    expect(fehler(null, anlegen([ep('p1', '1.000'), nichtAngeboten('p1')]))).toMatchObject({
      code: 'ungueltige-eingabe',
      knotenId: 'p1',
    });
  });

  it('EP nicht kanonisch → ungueltige-eingabe, feld einheitspreis; negativer EP ist erlaubt (U5)', () => {
    expect(fehler(null, anlegen([ep('p1', '1.00')]))).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'einheitspreis',
    });
    expect(fehler(null, anlegen([ep('p1', '1,000')]))).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'einheitspreis',
    });
    expect(ausfuehren(null, anlegen([ep('p1', '-1.000')])).ok).toBe(true);
  });

  it('Nachlass prüft nachlassFehler des Kerns', () => {
    expect(fehler(null, anlegen([], prozent('100.01')))).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'nachlass',
    });
    expect(fehler(null, anlegen([], betrag('-1.00')))).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'nachlass',
    });
  });
});

describe('ohne Zustand', () => {
  it('jeder andere Befehl → befehl-nicht-zustaendig', () => {
    for (const b of [
      { art: 'AngebotspositionSetzen', position: ep('p1', '1.000') },
      { art: 'AngebotsNachlassSetzen', nachlass: prozent('1.00') },
      { art: 'AngebotsNachlassEntfernen' },
      { art: 'AngebotLoeschen' },
    ] as const) {
      expect(fehler(null, b).code).toBe('befehl-nicht-zustaendig');
    }
  });
});

describe('AngebotspositionSetzen', () => {
  it('neuer Preis: Position hinzugefügt, nur geänderte Summen (Position, Titel t2, Gesamt), vorher gefüllt', () => {
    const s = start();
    const cs = erwarteOk(ausfuehren(s, { art: 'AngebotspositionSetzen', position: ep('p3', '50.000') }));
    expect(cs.kopf).toBeNull();
    expect(cs.positionen).toEqual({ hinzugefuegt: [ep('p3', '50.000')], geaendert: [], entfernt: [] });
    expect(cs.summen.positionen).toEqual([{ positionId: 'p3', gesamtpreis: '100.00', gehtInSummeEin: true }]);
    expect(cs.summen.gliederungen).toEqual([
      { gliederungId: 't2', summe: '100.00', summeBedarfOhneGesamtbetrag: '0.00', summeWahl: '0.00' },
    ]);
    expect(cs.summen.gesamt?.netto).toBe('240.00');
    expect(cs.summen.vorher).toEqual({
      positionen: [{ positionId: 'p3', gesamtpreis: null, gehtInSummeEin: false }],
      gliederungen: [
        { gliederungId: 't2', summe: '0.00', summeBedarfOhneGesamtbetrag: '0.00', summeWahl: '0.00' },
      ],
      gesamt: s.summen.gesamt,
      entfernt: { positionen: [], gliederungen: [] },
    });
    const n = angebotChangeSetAnwenden(s, cs);
    expect(n?.angebot.positionen).toEqual([ep('p1', '10.000'), ep('p2', '8.000'), ep('p3', '50.000')]);
    expect(n?.summen).toEqual(angebotSummenBerechnen(z, n?.angebot ?? s.angebot));
  });

  it('geänderter Preis: geaendert mit vorher und nachher', () => {
    const s = start();
    const cs = erwarteOk(ausfuehren(s, { art: 'AngebotspositionSetzen', position: ep('p1', '11.000') }));
    expect(cs.positionen.geaendert).toEqual([{ vorher: ep('p1', '10.000'), nachher: ep('p1', '11.000') }]);
    expect(cs.summen.gliederungen).toEqual([
      { gliederungId: 't1', summe: '150.00', summeBedarfOhneGesamtbetrag: '0.00', summeWahl: '0.00' },
    ]);
  });

  it('nicht angeboten statt Preis: GP entfällt, Summen sinken', () => {
    const s = start();
    const cs = erwarteOk(ausfuehren(s, { art: 'AngebotspositionSetzen', position: nichtAngeboten('p2') }));
    expect(cs.summen.positionen).toEqual([{ positionId: 'p2', gesamtpreis: null, gehtInSummeEin: false }]);
    expect(cs.summen.gesamt?.netto).toBe('100.00');
  });

  it('nicht angeboten statt kein Eintrag: Position neu, Summen unverändert', () => {
    const cs = erwarteOk(
      ausfuehren(start(), { art: 'AngebotspositionSetzen', position: nichtAngeboten('p3') }),
    );
    expect(cs.positionen.hinzugefuegt).toEqual([nichtAngeboten('p3')]);
    expect(cs.summen.positionen).toEqual([]);
    expect(cs.summen.gliederungen).toEqual([]);
    expect(cs.summen.gesamt).toBeNull();
  });

  it('gleicher Wert → leeres ChangeSet; anwenden liefert denselben Zustand', () => {
    const s = start();
    const cs = erwarteOk(ausfuehren(s, { art: 'AngebotspositionSetzen', position: ep('p1', '10.000') }));
    expect(cs).toMatchObject(leer);
    expect(angebotChangeSetAnwenden(s, cs)).toBe(s);
  });

  it('Fehlerfälle: unbekannte Position, Gliederung, EP nicht kanonisch', () => {
    const s = start();
    expect(fehler(s, { art: 'AngebotspositionSetzen', position: ep('p9', '1.000') }).code).toBe(
      'knoten-unbekannt',
    );
    expect(fehler(s, { art: 'AngebotspositionSetzen', position: ep('t2', '1.000') }).code).toBe(
      'knotenart-unzulaessig',
    );
    expect(fehler(s, { art: 'AngebotspositionSetzen', position: ep('p1', '1.0000') })).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'einheitspreis',
    });
  });

  it('ein Angebot zu einem anderen LV → ungueltige-eingabe', () => {
    const anderes = lv('lv-2', [position('p1', 'lv-2', 0, '1.000')]);
    const s = wende(angebotBefehlAusfuehrer(proj, anderes), null, {
      art: 'AngebotAnlegen',
      angebot: angebot('a2', anderes, 'b-a', []),
    });
    expect(fehler(s, { art: 'AngebotspositionSetzen', position: ep('p1', '1.000') })).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'leistungsverzeichnisId',
    });
  });
});

describe('Nachlass', () => {
  it('setzen: Kopf geändert, nur Gesamtsummen neu; EP und Positions-GP bleiben', () => {
    const s = start();
    const cs = erwarteOk(ausfuehren(s, { art: 'AngebotsNachlassSetzen', nachlass: prozent('10.00') }));
    expect(cs.kopf?.vorher?.nachlass).toBeNull();
    expect(cs.kopf?.nachher?.nachlass).toEqual(prozent('10.00'));
    expect(cs.positionen).toEqual({ hinzugefuegt: [], geaendert: [], entfernt: [] });
    expect(cs.summen.positionen).toEqual([]);
    expect(cs.summen.gliederungen).toEqual([]);
    expect(cs.summen.gesamt).toMatchObject({
      netto: '140.00',
      nachlass: '14.00',
      nettoNachNachlass: '126.00',
    });
    // v1.3: mechanisch angepasst, Folgeticket (Summenaenderung.vorher Pflicht)
    expect(cs.summen.vorher.gesamt).toEqual(s.summen.gesamt);
  });

  it('gleicher Nachlass → leer; Entfernen ohne Nachlass → leer', () => {
    const s = wende(ausfuehren, null, anlegen(undefined, prozent('3.00')));
    if (s === null) throw new Error('fehlt');
    expect(
      erwarteOk(ausfuehren(s, { art: 'AngebotsNachlassSetzen', nachlass: prozent('3.00') })),
    ).toMatchObject(leer);
    expect(erwarteOk(ausfuehren(start(), { art: 'AngebotsNachlassEntfernen' }))).toMatchObject(leer);
  });

  it('Nachlass entfernen ändert keinen EP und keinen Positions-GP, nur die Bietersumme', () => {
    const s = wende(ausfuehren, null, anlegen(undefined, betrag('40.00')));
    if (s === null) throw new Error('fehlt');
    const n = wende(ausfuehren, s, { art: 'AngebotsNachlassEntfernen' });
    expect(n?.angebot.positionen).toEqual(s.angebot.positionen);
    expect(n?.summen.positionen).toEqual(s.summen.positionen);
    expect(n?.summen.gliederungen).toEqual(s.summen.gliederungen);
    expect(s.summen.gesamt.nettoNachNachlass).toBe('100.00');
    expect(n?.summen.gesamt.nettoNachNachlass).toBe('140.00');
    expect(n?.angebot.nachlass).toBeNull();
  });

  it('unzulässiger Nachlass → ungueltige-eingabe, feld nachlass', () => {
    expect(fehler(start(), { art: 'AngebotsNachlassSetzen', nachlass: prozent('-1.00') })).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'nachlass',
    });
  });
});

describe('AngebotLoeschen', () => {
  it('kopf.nachher null, alle Positionen entfernt, alle Summen in vorher.entfernt; anwenden → null', () => {
    const s = start();
    const cs = erwarteOk(ausfuehren(s, { art: 'AngebotLoeschen' }));
    expect(cs.kopf?.nachher).toBeNull();
    expect(cs.kopf?.vorher?.id).toBe('a1');
    expect(cs.positionen.entfernt).toEqual(s.angebot.positionen);
    expect(cs.summen).toEqual({
      positionen: [],
      gliederungen: [],
      gesamt: null,
      vorher: {
        positionen: [],
        gliederungen: [],
        gesamt: s.summen.gesamt,
        entfernt: { positionen: s.summen.positionen, gliederungen: s.summen.gliederungen },
      },
    });
    expect(angebotChangeSetAnwenden(s, cs)).toBeNull();
  });
});
