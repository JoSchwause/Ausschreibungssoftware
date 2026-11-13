// SPDX-License-Identifier: AGPL-3.0-or-later
// Bieterbefehle (Ticket 138; Vertrag v1.7a, D-127.4, D-127.17): umbenennen, Angaben setzen, löschen nur ohne Angebot.
// Alle übrigen Projektbefehle reicht `projektBefehlAusfuehren` an den Kern weiter.

import { projektChangeSetAnwenden, projektChangeSetUmkehren } from '@tethys/kern';
import type {
  BieterId,
  Befehlsfehler,
  Bieterangaben,
  Projekt,
  ProjektBefehl,
  ProjektChangeSet,
  ProjektId,
  Verweisanzahl,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { projektBefehlAusfuehren } from './index';
import { erwarteOk, projekt } from './testhilfen';

const b = (id: string): BieterId => id as BieterId;
const proj: Projekt = projekt(['b-a', 'b-b', 'b-c']);

function fehler(
  zustand: Projekt | null,
  befehl: ProjektBefehl,
  verweise?: readonly Verweisanzahl[],
): Befehlsfehler {
  const e = projektBefehlAusfuehren(zustand, befehl, verweise);
  if (e.ok) throw new Error('Fehlerwert erwartet');
  return e.fehler;
}

/** Anwenden, Umkehrung anwenden: der Vorzustand kommt exakt zurück (Undo). */
function erwarteUmkehrbar(vorher: Projekt, cs: ProjektChangeSet): Projekt {
  const nachher = projektChangeSetAnwenden(vorher, cs);
  if (nachher === null) throw new Error('Projekt fehlt');
  expect(projektChangeSetAnwenden(nachher, projektChangeSetUmkehren(cs))).toEqual(vorher);
  return nachher;
}

describe('BieterUmbenennen', () => {
  it('ändert nur den Namen dieses Bieters, an seiner Stelle; Undo stellt den alten Namen her', () => {
    const cs = erwarteOk(
      projektBefehlAusfuehren(proj, { art: 'BieterUmbenennen', bieterId: b('b-b'), name: 'Muster Bau' }),
    );
    expect(cs).toMatchObject({ art: 'projekt', projektId: proj.id, projekt: { vorher: proj } });
    const neu = erwarteUmkehrbar(proj, cs);
    expect(neu.bieter.map((x) => x.name)).toEqual(['Bieter b-a', 'Muster Bau', 'Bieter b-c']);
    expect(neu.bieter.map((x) => x.id)).toEqual(['b-a', 'b-b', 'b-c']);
  });

  it('leerer Name ist erlaubt (U5); gleicher Name → vorher gleich nachher', () => {
    const leer = erwarteOk(
      projektBefehlAusfuehren(proj, { art: 'BieterUmbenennen', bieterId: b('b-a'), name: '' }),
    );
    expect(leer.projekt.nachher?.bieter[0]?.name).toBe('');
    const gleich = erwarteOk(
      projektBefehlAusfuehren(proj, { art: 'BieterUmbenennen', bieterId: b('b-a'), name: 'Bieter b-a' }),
    );
    expect(gleich.projekt.nachher).toBe(gleich.projekt.vorher);
  });

  it('behält die Bieterangaben', () => {
    const mit: Projekt = {
      ...proj,
      bieter: [
        {
          id: b('b-a'),
          name: 'A',
          angaben: { anschrift: null, ansprechperson: 'Frau X', email: null, telefon: null },
        },
      ],
    };
    const cs = erwarteOk(
      projektBefehlAusfuehren(mit, { art: 'BieterUmbenennen', bieterId: b('b-a'), name: 'B' }),
    );
    expect(cs.projekt.nachher?.bieter[0]).toEqual({ ...mit.bieter[0], name: 'B' });
  });

  it('unbekannter Bieter → ungueltige-eingabe, feld bieterId; Name kein Text → feld name; ohne Projekt → nicht zuständig', () => {
    expect(fehler(proj, { art: 'BieterUmbenennen', bieterId: b('b-x'), name: 'X' })).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'bieterId',
    });
    expect(
      fehler(proj, { art: 'BieterUmbenennen', bieterId: b('b-a'), name: 3 as unknown as string }),
    ).toMatchObject({ code: 'ungueltige-eingabe', feld: 'name' });
    expect(fehler(null, { art: 'BieterUmbenennen', bieterId: b('b-a'), name: 'X' })).toMatchObject({
      code: 'befehl-nicht-zustaendig',
    });
  });
});

describe('BieterangabenSetzen', () => {
  const angaben: Bieterangaben = {
    anschrift: { strasse: 'Hauptstraße 1', plz: '12345', ort: 'Musterstadt' },
    ansprechperson: 'Frau Beispiel',
    email: 'info@example.org',
    telefon: '0123 456789',
  };
  const setzen = (zustand: Projekt, a: Bieterangaben | null, bieterId = b('b-b')): ProjektChangeSet =>
    erwarteOk(projektBefehlAusfuehren(zustand, { art: 'BieterangabenSetzen', bieterId, angaben: a }));

  it('setzt die Angaben dieses Bieters, Name und Stelle bleiben; Undo entfernt sie wieder', () => {
    const neu = erwarteUmkehrbar(proj, setzen(proj, angaben));
    expect(neu.bieter[1]).toEqual({ id: 'b-b', name: 'Bieter b-b', angaben });
    expect(neu.bieter[0]).toBe(proj.bieter[0]);
    expect(neu.bieter[2]).toBe(proj.bieter[2]);
  });

  it("normalisiert: '' → null, Anschrift ohne Teil → null, Angaben ohne Feld → Block fehlt", () => {
    const neu = erwarteUmkehrbar(
      proj,
      setzen(proj, {
        anschrift: { strasse: '', plz: '', ort: '' },
        ansprechperson: 'Herr Y',
        email: '',
        telefon: '',
      }),
    );
    expect(neu.bieter[1]?.angaben).toEqual({
      anschrift: null,
      ansprechperson: 'Herr Y',
      email: null,
      telefon: null,
    });
    const teil = setzen(proj, { ...angaben, anschrift: { strasse: '', plz: '12345', ort: null } }).projekt
      .nachher;
    expect(teil?.bieter[1]?.angaben?.anschrift).toEqual({ strasse: null, plz: '12345', ort: null });
    const leer = setzen(proj, {
      anschrift: { strasse: null, plz: '', ort: null },
      ansprechperson: '',
      email: null,
      telefon: '',
    }).projekt.nachher;
    expect(leer?.bieter[1]).toEqual({ id: 'b-b', name: 'Bieter b-b' });
    expect(leer?.bieter[1] && 'angaben' in leer.bieter[1]).toBe(false);
  });

  it('null entfernt die Angaben (Feld fehlt danach); Undo bringt sie zurück', () => {
    const mit = projektChangeSetAnwenden(proj, setzen(proj, angaben)) as Projekt;
    const ohne = erwarteUmkehrbar(mit, setzen(mit, null));
    expect(ohne.bieter[1]).toEqual({ id: 'b-b', name: 'Bieter b-b' });
    expect(ohne.bieter[1] && 'angaben' in ohne.bieter[1]).toBe(false);
  });

  it('gleicher Wert nach Normalisierung → vorher gleich nachher; null ohne Angaben ebenso', () => {
    const mit = projektChangeSetAnwenden(proj, setzen(proj, angaben)) as Projekt;
    const gleich = setzen(mit, { ...angaben });
    expect(gleich.projekt.nachher).toBe(gleich.projekt.vorher);
    const nichts = setzen(proj, null);
    expect(nichts.projekt.nachher).toBe(nichts.projekt.vorher);
    const leer = setzen(proj, { anschrift: null, ansprechperson: '', email: null, telefon: null });
    expect(leer.projekt.nachher).toBe(leer.projekt.vorher);
  });

  it('kein Formatcheck für E-Mail und Telefon (U5)', () => {
    const neu = setzen(proj, { ...angaben, email: 'keine Adresse', telefon: 'abends' }).projekt.nachher;
    expect(neu?.bieter[1]?.angaben).toMatchObject({ email: 'keine Adresse', telefon: 'abends' });
  });

  it('Form: unbekannter Bieter, Angaben kein Objekt, Feld kein Text → ungueltige-eingabe mit feld', () => {
    const befehl = (a: unknown, bieterId = b('b-a')): ProjektBefehl => ({
      art: 'BieterangabenSetzen',
      bieterId,
      angaben: a as Bieterangaben,
    });
    expect(fehler(proj, befehl(angaben, b('b-x')))).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'bieterId',
    });
    expect(fehler(proj, befehl('Text'))).toMatchObject({ code: 'ungueltige-eingabe', feld: 'angaben' });
    expect(fehler(proj, befehl({ ...angaben, email: 5 }))).toMatchObject({
      code: 'ungueltige-eingabe',
      feld: 'angaben.email',
    });
    expect(fehler(proj, befehl({ ...angaben, ansprechperson: undefined }))).toMatchObject({
      feld: 'angaben.ansprechperson',
    });
    expect(fehler(proj, befehl({ ...angaben, anschrift: 'Hauptstraße 1' }))).toMatchObject({
      feld: 'angaben.anschrift',
    });
    expect(
      fehler(proj, befehl({ ...angaben, anschrift: { strasse: null, plz: 12345, ort: null } })),
    ).toMatchObject({
      feld: 'angaben.anschrift.plz',
    });
    expect(fehler(null, befehl(angaben))).toMatchObject({ code: 'befehl-nicht-zustaendig' });
  });
});

describe('BieterLoeschen', () => {
  const loeschen = (bieterId: string): ProjektBefehl => ({ art: 'BieterLoeschen', bieterId: b(bieterId) });

  it('ohne Angebot: entfernt den Bieter; Undo stellt ihn an seiner Stelle wieder her', () => {
    const mit: Projekt = {
      ...proj,
      bieter: proj.bieter.map((x) =>
        x.id === 'b-b'
          ? { ...x, angaben: { anschrift: null, ansprechperson: 'Frau X', email: null, telefon: null } }
          : x,
      ),
    };
    const cs = erwarteOk(projektBefehlAusfuehren(mit, loeschen('b-b'), [{ art: 'angebot', anzahl: 0 }]));
    expect(cs.projekt.vorher).toBe(mit);
    const neu = erwarteUmkehrbar(mit, cs);
    expect(neu.bieter.map((x) => x.id)).toEqual(['b-a', 'b-c']);
    expect(neu.name).toBe(mit.name);
  });

  it('fehlende Art zählt 0; andere Arten liest der Befehl nicht', () => {
    expect(projektBefehlAusfuehren(proj, loeschen('b-a'), []).ok).toBe(true);
    expect(projektBefehlAusfuehren(proj, loeschen('b-a'), [{ art: 'nachtrag', anzahl: 3 }]).ok).toBe(true);
  });

  it('mit Angeboten → verweise-vorhanden mit Art und Anzahl (Verweissperre)', () => {
    const f = fehler(proj, loeschen('b-a'), [
      { art: 'rechnung', anzahl: 1 },
      { art: 'angebot', anzahl: 2 },
    ]);
    expect(f.code).toBe('verweise-vorhanden');
    expect(f.verweise).toEqual([{ art: 'angebot', anzahl: 2 }]);
    expect(f.feld).toBeUndefined();
  });

  it('ohne verweise → ungueltige-eingabe, feld verweise (ohne Bestand nicht prüfbar)', () => {
    expect(fehler(proj, loeschen('b-a'))).toMatchObject({ code: 'ungueltige-eingabe', feld: 'verweise' });
  });

  it('verweise in falscher Form → ungueltige-eingabe, feld verweise', () => {
    const falsch: unknown[] = [
      [{ art: 'angebot', anzahl: -1 }],
      [{ art: 'angebot', anzahl: 1.5 }],
      [{ art: 'angebot', anzahl: '1' }],
      [
        { art: 'angebot', anzahl: 0 },
        { art: 'angebot', anzahl: 0 },
      ],
      [{ art: 'bauzeitenplan', anzahl: 0 }],
      'keine Liste',
    ];
    for (const v of falsch)
      expect(fehler(proj, loeschen('b-a'), v as Verweisanzahl[])).toMatchObject({
        code: 'ungueltige-eingabe',
        feld: 'verweise',
      });
  });

  it('unbekannter Bieter → ungueltige-eingabe, feld bieterId; ohne Projekt → nicht zuständig', () => {
    expect(fehler(proj, loeschen('b-x'), [])).toMatchObject({ code: 'ungueltige-eingabe', feld: 'bieterId' });
    expect(fehler(null, loeschen('b-a'), [])).toMatchObject({ code: 'befehl-nicht-zustaendig' });
  });
});

describe('übrige Projektbefehle gehen an den Kern', () => {
  it('ProjektAnlegen, BieterAnlegen, ProjektStammdatenSetzen, ProjektLoeschen: dasselbe Ergebnis wie im Kern', () => {
    const anlegen: ProjektBefehl = {
      art: 'ProjektAnlegen',
      id: 'p-neu' as ProjektId,
      name: 'Neu',
      bauherr: { name: 'B', anschrift: null },
    };
    const neu = projektChangeSetAnwenden(null, erwarteOk(projektBefehlAusfuehren(null, anlegen))) as Projekt;
    expect(neu).toEqual({ id: 'p-neu', name: 'Neu', bauherr: { name: 'B', anschrift: null }, bieter: [] });
    const mitBieter = projektChangeSetAnwenden(
      neu,
      erwarteOk(
        projektBefehlAusfuehren(neu, { art: 'BieterAnlegen', bieter: { id: b('b-1'), name: 'Eins' } }),
      ),
    ) as Projekt;
    expect(mitBieter.bieter).toEqual([{ id: 'b-1', name: 'Eins' }]);
    expect(
      fehler(mitBieter, { art: 'BieterAnlegen', bieter: { id: b('b-1'), name: 'Doppelt' } }),
    ).toMatchObject({ code: 'id-vergeben' });
    const stamm = erwarteOk(
      projektBefehlAusfuehren(mitBieter, {
        art: 'ProjektStammdatenSetzen',
        name: 'Anders',
        bauherr: { name: 'B', anschrift: null },
      }),
    );
    expect(stamm.projekt.nachher?.name).toBe('Anders');
    expect(
      erwarteOk(projektBefehlAusfuehren(mitBieter, { art: 'ProjektLoeschen' })).projekt.nachher,
    ).toBeNull();
  });
});
