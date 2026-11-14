// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 30, Punkt 11: Projektbefehle (ADR 0011). Zuerst geschrieben (Q1).

import { describe, expect, it } from 'vitest';
import type {
  Bauherr,
  Bieter,
  Bieterangaben,
  BieterId,
  Projekt,
  Projektangaben,
  ProjektBefehl,
  ProjektId,
  Projektbestand,
} from '@tethys/vertrag';
import {
  beispielChangeSetProjektSamtInhaltLoeschen,
  beispielChangeSetProjektSamtInhaltLoeschenUmgekehrt,
  beispielProjektbestand,
} from '../../vertrag/src/beispiele';
import {
  bieterangabenFehler,
  bieterangabenNormalisieren,
  projektBefehlAusfuehren,
  projektChangeSetAnwenden,
  projektChangeSetUmkehren,
  projektbestandChangeSetUmkehren,
  projektSamtInhaltLoeschenAusfuehren,
} from './index';
import { erwarteOk } from './testhilfen';

const PID = 'projekt-1' as ProjektId;
const bauherr: Bauherr = { name: 'Gemeinde', anschrift: 'Hauptstraße 1' };
const bieter = (i: string, name = `Bieter ${i}`): Bieter => ({ id: i as BieterId, name });

const anlegen: ProjektBefehl = { art: 'ProjektAnlegen', id: PID, name: 'Schule', bauherr };

/** Führt aus, wendet an und prüft, dass die Umkehrung den Vorzustand herstellt. */
function wende(z: Projekt | null, b: ProjektBefehl): Projekt | null {
  const cs = erwarteOk(projektBefehlAusfuehren(z, b));
  expect(cs.art).toBe('projekt');
  const neu = projektChangeSetAnwenden(z, cs);
  expect(projektChangeSetAnwenden(neu, projektChangeSetUmkehren(cs))).toEqual(z);
  expect(projektChangeSetUmkehren(projektChangeSetUmkehren(cs))).toEqual(cs);
  return neu;
}

function projekt(): Projekt {
  const p = wende(null, anlegen);
  if (p === null) throw new Error('Projekt fehlt');
  return p;
}

const fehlercode = (z: Projekt | null, b: ProjektBefehl): string | undefined => {
  const e = projektBefehlAusfuehren(z, b);
  return e.ok ? undefined : e.fehler.code;
};

describe('ProjektAnlegen', () => {
  it('legt das Projekt ohne Bieter an; ChangeSet vorher null', () => {
    const cs = erwarteOk(projektBefehlAusfuehren(null, anlegen));
    expect(cs).toEqual({
      art: 'projekt',
      projektId: PID,
      projekt: { vorher: null, nachher: { id: PID, name: 'Schule', bauherr, bieter: [] } },
    });
    expect(projekt()).toEqual({ id: PID, name: 'Schule', bauherr, bieter: [] });
  });

  it('leerer Name ist erlaubt (wie FELD_ANNAHMEN)', () => {
    expect(wende(null, { ...anlegen, name: '' })?.name).toBe('');
  });

  it('mit Zustand: befehl-nicht-zustaendig', () => {
    expect(fehlercode(projekt(), anlegen)).toBe('befehl-nicht-zustaendig');
  });

  it('Form: ungueltige-eingabe', () => {
    expect(fehlercode(null, { ...anlegen, id: '' as ProjektId })).toBe('ungueltige-eingabe');
    expect(fehlercode(null, { ...anlegen, name: 3 as unknown as string })).toBe('ungueltige-eingabe');
    expect(fehlercode(null, { ...anlegen, bauherr: null as unknown as Bauherr })).toBe('ungueltige-eingabe');
    expect(fehlercode(null, { ...anlegen, bauherr: { name: 'x', anschrift: 1 } as unknown as Bauherr })).toBe(
      'ungueltige-eingabe',
    );
  });
});

describe('ProjektStammdatenSetzen', () => {
  it('setzt Name und Bauherr, Bieter bleiben', () => {
    const p0 = wende(projekt(), { art: 'BieterAnlegen', bieter: bieter('b1') });
    const neuerBauherr: Bauherr = { name: 'Landkreis', anschrift: null };
    const p1 = wende(p0, { art: 'ProjektStammdatenSetzen', name: 'Turnhalle', bauherr: neuerBauherr });
    expect(p1).toEqual({ id: PID, name: 'Turnhalle', bauherr: neuerBauherr, bieter: [bieter('b1')] });
  });

  it('dieselben Werte: vorher gleich nachher (keine Änderung)', () => {
    const p = projekt();
    const cs = erwarteOk(
      projektBefehlAusfuehren(p, { art: 'ProjektStammdatenSetzen', name: 'Schule', bauherr }),
    );
    expect(cs.projekt.vorher).toEqual(cs.projekt.nachher);
  });

  it('ohne Zustand: befehl-nicht-zustaendig; Form: ungueltige-eingabe', () => {
    const b: ProjektBefehl = { art: 'ProjektStammdatenSetzen', name: 'x', bauherr };
    expect(fehlercode(null, b)).toBe('befehl-nicht-zustaendig');
    expect(fehlercode(projekt(), { ...b, bauherr: { anschrift: null } as unknown as Bauherr })).toBe(
      'ungueltige-eingabe',
    );
  });
});

describe('BieterAnlegen', () => {
  it('hängt den Bieter hinten an', () => {
    const p1 = wende(projekt(), { art: 'BieterAnlegen', bieter: bieter('b1') });
    const p2 = wende(p1, { art: 'BieterAnlegen', bieter: bieter('b2', '') });
    expect(p2?.bieter).toEqual([bieter('b1'), bieter('b2', '')]);
  });

  it('doppelte Bieter-ID: id-vergeben; ohne Zustand: befehl-nicht-zustaendig; Form: ungueltige-eingabe', () => {
    const p1 = wende(projekt(), { art: 'BieterAnlegen', bieter: bieter('b1') });
    expect(fehlercode(p1, { art: 'BieterAnlegen', bieter: bieter('b1', 'anders') })).toBe('id-vergeben');
    expect(fehlercode(null, { art: 'BieterAnlegen', bieter: bieter('b2') })).toBe('befehl-nicht-zustaendig');
    expect(fehlercode(p1, { art: 'BieterAnlegen', bieter: bieter('') })).toBe('ungueltige-eingabe');
    expect(
      fehlercode(p1, { art: 'BieterAnlegen', bieter: { id: 'b3', name: null } as unknown as Bieter }),
    ).toBe('ungueltige-eingabe');
  });
});

describe('ProjektLoeschen', () => {
  it('nachher null, vorher der volle Stand samt Bietern; die Umkehrung legt es wieder an', () => {
    const p = wende(projekt(), { art: 'BieterAnlegen', bieter: bieter('b1') });
    const cs = erwarteOk(projektBefehlAusfuehren(p, { art: 'ProjektLoeschen' }));
    expect(cs.projekt).toEqual({ vorher: p, nachher: null });
    expect(projektChangeSetAnwenden(p, cs)).toBeNull();
    expect(projektChangeSetAnwenden(null, projektChangeSetUmkehren(cs))).toEqual(p);
    expect(wende(p, { art: 'ProjektLoeschen' })).toBeNull();
  });

  it('ohne Zustand: befehl-nicht-zustaendig', () => {
    expect(fehlercode(null, { art: 'ProjektLoeschen' })).toBe('befehl-nicht-zustaendig');
  });
});

// --- Vertrag v1.7c (Ticket 161; E8, D-96, D-160.4): Projekt samt Inhalt löschen ---------------------------------------------

const samtInhalt = { art: 'ProjektSamtInhaltLoeschen' } as const;
const leererBestand: Projektbestand = {
  leistungsverzeichnisse: [],
  angebote: [],
  auftragsLeistungsverzeichnisse: [],
  protokoll: [],
};

describe('ProjektSamtInhaltLoeschen', () => {
  it('ohne Bestand weist der allgemeine Ausführer ab: ungueltige-eingabe am Feld bestand', () => {
    const e = projektBefehlAusfuehren(projekt(), samtInhalt);
    expect(e.ok ? null : { code: e.fehler.code, feld: e.fehler.feld }).toEqual({
      code: 'ungueltige-eingabe',
      feld: 'bestand',
    });
  });

  it('mit Bestand: Projekt und Bestand vorher, beide nachher null', () => {
    const p = projekt();
    const cs = erwarteOk(projektSamtInhaltLoeschenAusfuehren(p, samtInhalt, beispielProjektbestand));
    expect(cs).toEqual({
      art: 'projektbestand',
      projektId: PID,
      projekt: { vorher: p, nachher: null },
      bestand: { vorher: beispielProjektbestand, nachher: null },
    });
  });

  it('ein leerer Bestand ist erlaubt', () => {
    const cs = erwarteOk(projektSamtInhaltLoeschenAusfuehren(projekt(), samtInhalt, leererBestand));
    expect(cs.bestand.vorher).toEqual(leererBestand);
  });

  it('ohne Projekt: befehl-nicht-zustaendig', () => {
    const e = projektSamtInhaltLoeschenAusfuehren(null, samtInhalt, leererBestand);
    expect(e.ok ? null : e.fehler.code).toBe('befehl-nicht-zustaendig');
  });

  it.each([
    ['kein Objekt', null],
    ['eine Liste', []],
    ['ohne protokoll', { leistungsverzeichnisse: [], angebote: [], auftragsLeistungsverzeichnisse: [] }],
    ['angebote keine Liste', { ...leererBestand, angebote: {} }],
  ])('Bestand %s: ungueltige-eingabe am Feld bestand', (_, bestand) => {
    const e = projektSamtInhaltLoeschenAusfuehren(
      projekt(),
      samtInhalt,
      bestand as unknown as Projektbestand,
    );
    expect(e.ok ? null : { code: e.fehler.code, feld: e.fehler.feld }).toEqual({
      code: 'ungueltige-eingabe',
      feld: 'bestand',
    });
  });

  it('die Umkehrung tauscht Projekt und Bestand; zweimal umgekehrt ist das ChangeSet selbst', () => {
    expect(projektbestandChangeSetUmkehren(beispielChangeSetProjektSamtInhaltLoeschen)).toEqual(
      beispielChangeSetProjektSamtInhaltLoeschenUmgekehrt,
    );
    expect(projektbestandChangeSetUmkehren(beispielChangeSetProjektSamtInhaltLoeschenUmgekehrt)).toEqual(
      beispielChangeSetProjektSamtInhaltLoeschen,
    );
  });
});

// --- Vertrag v1.7a (Ticket 137; E10, D-127.4, D-127.5) -------------------------------------------------------------------

const ANGABEN: Projektangaben = {
  nummer: '2026-017',
  ort: 'Musterstadt',
  baustelle: { strasse: 'Schulweg 3', plz: '12345', ort: 'Musterstadt' },
};

const setzeAngaben = (
  angaben: Projektangaben | null,
  name = 'Schule',
  bh: Bauherr = bauherr,
): ProjektBefehl => ({
  art: 'ProjektangabenSetzen',
  name,
  bauherr: bh,
  angaben,
});

describe('ProjektangabenSetzen', () => {
  it('setzt Name, Bauherr und Angaben in einem Schritt; Bieter bleiben; Undo stellt alles her', () => {
    const p0 = wende(projekt(), { art: 'BieterAnlegen', bieter: bieter('b1') });
    const neuerBauherr: Bauherr = { name: 'Landkreis', anschrift: 'Kreishaus' };
    const p1 = wende(p0, setzeAngaben(ANGABEN, 'Turnhalle', neuerBauherr));
    expect(p1).toEqual({
      id: PID,
      name: 'Turnhalle',
      bauherr: neuerBauherr,
      bieter: [bieter('b1')],
      angaben: ANGABEN,
    });
  });

  it("'' wird null, eine leere Anschrift null, ganz leere Angaben fehlen; null entfernt sie", () => {
    const p1 = wende(
      projekt(),
      setzeAngaben({ nummer: '', ort: 'Ort', baustelle: { strasse: '', plz: null, ort: '' } }),
    );
    expect(p1?.angaben).toEqual({ nummer: null, ort: 'Ort', baustelle: null });
    const p2 = wende(p1, setzeAngaben({ nummer: '', ort: '', baustelle: { strasse: '', plz: '', ort: '' } }));
    expect(p2).not.toHaveProperty('angaben');
    const p3 = wende(wende(p2, setzeAngaben(ANGABEN)), setzeAngaben(null));
    expect(p3).toEqual(projekt());
  });

  it('Leerraum bleibt Text (U5), die Nummer ist freier Text', () => {
    const p = wende(projekt(), setzeAngaben({ nummer: ' 007a ', ort: ' ', baustelle: null }));
    expect(p?.angaben).toEqual({ nummer: ' 007a ', ort: ' ', baustelle: null });
  });

  it('dieselben Werte: nachher ist der Zustand selbst (keine Änderung)', () => {
    const p = wende(projekt(), setzeAngaben(ANGABEN));
    if (p === null) throw new Error('Projekt fehlt');
    const cs = erwarteOk(projektBefehlAusfuehren(p, setzeAngaben(structuredClone(ANGABEN))));
    expect(cs.projekt.nachher).toBe(p);
    const ohne = erwarteOk(projektBefehlAusfuehren(projekt(), setzeAngaben(null)));
    expect(ohne.projekt.vorher).toEqual(ohne.projekt.nachher);
  });

  it('ProjektStammdatenSetzen lässt die Angaben unverändert', () => {
    const p = wende(wende(projekt(), setzeAngaben(ANGABEN)), {
      art: 'ProjektStammdatenSetzen',
      name: 'Neu',
      bauherr,
    });
    expect(p?.angaben).toEqual(ANGABEN);
  });

  it('nur die Felder des Vertrags landen am Projekt', () => {
    const mehr = { ...ANGABEN, extra: 1, baustelle: { ...ANGABEN.baustelle, land: 'DE' } } as Projektangaben;
    expect(wende(projekt(), setzeAngaben(mehr))?.angaben).toEqual(ANGABEN);
  });

  it('ohne Zustand: befehl-nicht-zustaendig; Form: ungueltige-eingabe mit dem Feld', () => {
    expect(fehlercode(null, setzeAngaben(ANGABEN))).toBe('befehl-nicht-zustaendig');
    const feld = (b: ProjektBefehl): string | undefined => {
      const e = projektBefehlAusfuehren(projekt(), b);
      return e.ok ? undefined : `${e.fehler.code} ${e.fehler.feld ?? ''}`;
    };
    expect(feld(setzeAngaben(ANGABEN, 3 as unknown as string))).toBe('ungueltige-eingabe name');
    expect(feld(setzeAngaben(ANGABEN, 'x', { name: 1 } as unknown as Bauherr))).toBe(
      'ungueltige-eingabe bauherr',
    );
    expect(feld(setzeAngaben('x' as unknown as Projektangaben))).toBe('ungueltige-eingabe angaben');
    expect(feld(setzeAngaben({ ...ANGABEN, nummer: 7 } as unknown as Projektangaben))).toBe(
      'ungueltige-eingabe angaben.nummer',
    );
    expect(feld(setzeAngaben({ ...ANGABEN, baustelle: 'x' } as unknown as Projektangaben))).toBe(
      'ungueltige-eingabe angaben.baustelle',
    );
    expect(
      feld(
        setzeAngaben({
          ...ANGABEN,
          baustelle: { strasse: null, plz: 1, ort: null },
        } as unknown as Projektangaben),
      ),
    ).toBe('ungueltige-eingabe angaben.baustelle.plz');
  });
});

const KONTAKT: Bieterangaben = {
  anschrift: { strasse: 'Werkstraße 1', plz: '54321', ort: 'Bauhausen' },
  ansprechperson: 'Frau Muster',
  email: 'info@example.org',
  telefon: '0123 456',
};

describe('BieterAnlegen mit Angaben (D-127.4)', () => {
  it('legt die Angaben am Bieter ab, normalisiert', () => {
    const p = wende(projekt(), {
      art: 'BieterAnlegen',
      bieter: {
        ...bieter('b1'),
        angaben: { ...KONTAKT, telefon: '', anschrift: { strasse: '', plz: '', ort: '' } },
      },
    });
    expect(p?.bieter).toEqual([{ ...bieter('b1'), angaben: { ...KONTAKT, telefon: null, anschrift: null } }]);
  });

  it('ganz leere Angaben: das Feld fehlt; Fremdfelder fallen weg', () => {
    const leer: Bieterangaben = { anschrift: null, ansprechperson: '', email: null, telefon: '' };
    const p = wende(projekt(), { art: 'BieterAnlegen', bieter: { ...bieter('b1'), angaben: leer } });
    expect(p?.bieter[0]).toEqual(bieter('b1'));
    const q = wende(projekt(), {
      art: 'BieterAnlegen',
      bieter: { ...bieter('b2'), angaben: KONTAKT, extra: 1 } as Bieter,
    });
    expect(q?.bieter[0]).toEqual({ ...bieter('b2'), angaben: KONTAKT });
  });

  it('Angaben außer Form: ungueltige-eingabe mit dem Feld', () => {
    const e = projektBefehlAusfuehren(projekt(), {
      art: 'BieterAnlegen',
      bieter: { ...bieter('b1'), angaben: { ...KONTAKT, email: 5 } as unknown as Bieterangaben },
    });
    expect(e.ok ? null : [e.fehler.code, e.fehler.feld]).toEqual([
      'ungueltige-eingabe',
      'bieter.angaben.email',
    ]);
  });
});

describe('Normalisierer der Bieterangaben (für die Vergabe, D-82 S9)', () => {
  it("'' wird null, eine leere Anschrift null, ganz leere Angaben null (das Feld fehlt dann)", () => {
    expect(bieterangabenNormalisieren(KONTAKT)).toEqual(KONTAKT);
    expect(
      bieterangabenNormalisieren({ ...KONTAKT, email: '', anschrift: { strasse: '', plz: null, ort: '' } }),
    ).toEqual({
      ...KONTAKT,
      email: null,
      anschrift: null,
    });
    expect(
      bieterangabenNormalisieren({ anschrift: null, ansprechperson: '', email: '', telefon: null }),
    ).toBeNull();
    expect(bieterangabenNormalisieren(null)).toBeNull();
  });

  it('die Form prüft jedes Feld mit dem Pfad, den der Aufrufer vorgibt', () => {
    expect(bieterangabenFehler(KONTAKT, 'angaben')).toBeNull();
    expect(bieterangabenFehler([], 'angaben')?.feld).toBe('angaben');
    expect(bieterangabenFehler({ ...KONTAKT, telefon: undefined }, 'angaben')?.feld).toBe('angaben.telefon');
    expect(
      bieterangabenFehler({ ...KONTAKT, anschrift: { strasse: 1, plz: null, ort: null } }, 'angaben')?.feld,
    ).toBe('angaben.anschrift.strasse');
  });
});
