// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstellungen (Vertrag v1.7a, D-127.8, D-73; Ticket 137): Büro, eigene Druckprofile und Kostengruppenbezeichnungen als
// globales Aggregat. Der Ausführer prüft die Form und liefert die ganzen Einstellungen vorher und nachher; die Umkehrung ist
// der Tausch (Sitzungs-Undo der App, Review D-82 M1). Zuerst geschrieben (Q1).

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { LEERE_EINSTELLUNGEN } from '@tethys/vertrag';
import type {
  Buero,
  Druckprofil,
  Einstellungen,
  EinstellungenBefehl,
  EinstellungenChangeSet,
  Kostengruppenbezeichnung,
  Kostengruppennummer,
} from '@tethys/vertrag';
import {
  einstellungenBefehlAusfuehren,
  einstellungenChangeSetAnwenden,
  einstellungenChangeSetUmkehren,
} from './index';
import { erwarteOk } from './testhilfen';

const BUERO: Buero = {
  name: 'Planungsbüro Beispiel',
  anschrift: { strasse: 'Am Plan 2', plz: '10115', ort: 'Berlin' },
  telefon: '030 123',
  email: 'post@example.org',
};

const profil = (name: string, ueber: Partial<Druckprofil> = {}): Druckprofil => ({
  name,
  mitPreisen: true,
  langtext: { art: 'voll' },
  titelsummen: true,
  schlussblock: true,
  deckblatt: true,
  kopfzeile: null,
  fusszeile: null,
  seitenrand: 'normal',
  ...ueber,
});

const kg = (nummer: string, bezeichnung: string): Kostengruppenbezeichnung => ({
  nummer: nummer as Kostengruppennummer,
  bezeichnung,
});

/** Führt aus, prüft die Form des ChangeSets und dass die Umkehrung den Vorzustand herstellt. */
function wende(z: Einstellungen, b: EinstellungenBefehl): Einstellungen {
  const cs = erwarteOk(einstellungenBefehlAusfuehren(z, b));
  expect(cs.art).toBe('einstellungen');
  expect(cs.einstellungen.vorher).toBe(z);
  const neu = einstellungenChangeSetAnwenden(z, cs);
  expect(einstellungenChangeSetAnwenden(neu, einstellungenChangeSetUmkehren(cs))).toEqual(z);
  return neu;
}

const fehler = (z: Einstellungen, b: unknown): [string, string | undefined] | null => {
  const e = einstellungenBefehlAusfuehren(z, b as EinstellungenBefehl);
  return e.ok ? null : [e.fehler.code, e.fehler.feld];
};

describe('BueroSetzen', () => {
  it('setzt das Büro; null entfernt es', () => {
    const z = wende(LEERE_EINSTELLUNGEN, { art: 'BueroSetzen', buero: BUERO });
    expect(z).toEqual({ ...LEERE_EINSTELLUNGEN, buero: BUERO });
    expect(wende(z, { art: 'BueroSetzen', buero: null })).toEqual(LEERE_EINSTELLUNGEN);
  });

  it("'' wird null, eine leere Anschrift null; Fremdfelder fallen weg", () => {
    const z = wende(LEERE_EINSTELLUNGEN, {
      art: 'BueroSetzen',
      buero: { ...BUERO, telefon: '', anschrift: { strasse: '', plz: '', ort: '' }, extra: 1 } as Buero,
    });
    expect(z.buero).toEqual({ ...BUERO, telefon: null, anschrift: null });
  });

  it('derselbe Wert: nachher ist der Zustand selbst', () => {
    const z = wende(LEERE_EINSTELLUNGEN, { art: 'BueroSetzen', buero: BUERO });
    const cs = erwarteOk(einstellungenBefehlAusfuehren(z, { art: 'BueroSetzen', buero: { ...BUERO } }));
    expect(cs.einstellungen.nachher).toBe(z);
  });

  it('leerer Name (auch nur Leerraum) und andere Formfehler: ungueltige-eingabe mit dem Feld', () => {
    const z = LEERE_EINSTELLUNGEN;
    expect(fehler(z, { art: 'BueroSetzen', buero: { ...BUERO, name: ' ' } })).toEqual([
      'ungueltige-eingabe',
      'buero.name',
    ]);
    expect(fehler(z, { art: 'BueroSetzen', buero: 'x' })).toEqual(['ungueltige-eingabe', 'buero']);
    expect(fehler(z, { art: 'BueroSetzen', buero: { ...BUERO, email: 1 } })).toEqual([
      'ungueltige-eingabe',
      'buero.email',
    ]);
    expect(
      fehler(z, { art: 'BueroSetzen', buero: { ...BUERO, anschrift: { strasse: 1, plz: null, ort: null } } }),
    ).toEqual(['ungueltige-eingabe', 'buero.anschrift.strasse']);
  });
});

describe('DruckprofilSetzen und DruckprofilEntfernen', () => {
  it('ein neues Profil kommt ans Ende, ein gleichnamiges ersetzt das alte an seiner Stelle', () => {
    let z = wende(LEERE_EINSTELLUNGEN, { art: 'DruckprofilSetzen', druckprofil: profil('A') });
    z = wende(z, { art: 'DruckprofilSetzen', druckprofil: profil('B') });
    z = wende(z, { art: 'DruckprofilSetzen', druckprofil: profil('A', { mitPreisen: false }) });
    expect(z.druckprofile).toEqual([profil('A', { mitPreisen: false }), profil('B')]);
  });

  it('Entfernen nimmt das Profil dieses Namens heraus; Undo legt es an seine Stelle zurück', () => {
    let z = wende(LEERE_EINSTELLUNGEN, { art: 'DruckprofilSetzen', druckprofil: profil('A') });
    z = wende(z, { art: 'DruckprofilSetzen', druckprofil: profil('B') });
    z = wende(z, { art: 'DruckprofilSetzen', druckprofil: profil('C') });
    const cs = erwarteOk(einstellungenBefehlAusfuehren(z, { art: 'DruckprofilEntfernen', name: 'B' }));
    const ohne = einstellungenChangeSetAnwenden(z, cs);
    expect(ohne.druckprofile.map((p) => p.name)).toEqual(['A', 'C']);
    expect(einstellungenChangeSetAnwenden(ohne, einstellungenChangeSetUmkehren(cs)).druckprofile).toEqual(
      z.druckprofile,
    );
  });

  it('Entfernen eines Profils, das es nicht gibt: ungueltige-eingabe, feld name', () => {
    expect(fehler(LEERE_EINSTELLUNGEN, { art: 'DruckprofilEntfernen', name: 'X' })).toEqual([
      'ungueltige-eingabe',
      'name',
    ]);
  });

  it('Langtext in Zeilen: anzahl ganze Zahl ab 1; nur die Felder des Vertrags landen im Profil', () => {
    const p = { ...profil('Z', { langtext: { art: 'zeilen', anzahl: 3 } }), extra: 1 } as Druckprofil;
    const z = wende(LEERE_EINSTELLUNGEN, { art: 'DruckprofilSetzen', druckprofil: p });
    expect(z.druckprofile).toEqual([profil('Z', { langtext: { art: 'zeilen', anzahl: 3 } })]);
    for (const anzahl of [0, 1.5, -1, '2']) {
      expect(
        fehler(LEERE_EINSTELLUNGEN, {
          art: 'DruckprofilSetzen',
          druckprofil: profil('Z', { langtext: { art: 'zeilen', anzahl: anzahl as number } }),
        }),
        String(anzahl),
      ).toEqual(['ungueltige-eingabe', 'druckprofil.langtext.anzahl']);
    }
  });

  it('Formfehler: ungueltige-eingabe mit dem Feld', () => {
    const faelle: [unknown, string][] = [
      ['x', 'druckprofil'],
      [profil(''), 'druckprofil.name'],
      [profil('  '), 'druckprofil.name'],
      [{ ...profil('A'), mitPreisen: 'ja' }, 'druckprofil.mitPreisen'],
      [{ ...profil('A'), titelsummen: null }, 'druckprofil.titelsummen'],
      [{ ...profil('A'), schlussblock: 1 }, 'druckprofil.schlussblock'],
      [{ ...profil('A'), deckblatt: undefined }, 'druckprofil.deckblatt'],
      [{ ...profil('A'), langtext: { art: 'halb' } }, 'druckprofil.langtext'],
      [{ ...profil('A'), kopfzeile: 3 }, 'druckprofil.kopfzeile'],
      [{ ...profil('A'), fusszeile: false }, 'druckprofil.fusszeile'],
      [{ ...profil('A'), seitenrand: 'breit' }, 'druckprofil.seitenrand'],
    ];
    for (const [druckprofil, feld] of faelle)
      expect(fehler(LEERE_EINSTELLUNGEN, { art: 'DruckprofilSetzen', druckprofil }), feld).toEqual([
        'ungueltige-eingabe',
        feld,
      ]);
  });
});

describe('KostengruppenbezeichnungenSetzen', () => {
  it('ersetzt die ganze Liste, nach Nummer geordnet; [] entfernt alle', () => {
    const z = wende(LEERE_EINSTELLUNGEN, {
      art: 'KostengruppenbezeichnungenSetzen',
      bezeichnungen: [kg('300', 'Bauwerk'), kg('100', 'Grundstück'), kg('310', 'Baugrube')],
    });
    expect(z.kostengruppenbezeichnungen).toEqual([
      kg('100', 'Grundstück'),
      kg('300', 'Bauwerk'),
      kg('310', 'Baugrube'),
    ]);
    const neu = wende(z, { art: 'KostengruppenbezeichnungenSetzen', bezeichnungen: [kg('400', 'Technik')] });
    expect(neu.kostengruppenbezeichnungen).toEqual([kg('400', 'Technik')]);
    expect(wende(neu, { art: 'KostengruppenbezeichnungenSetzen', bezeichnungen: [] })).toEqual(
      LEERE_EINSTELLUNGEN,
    );
  });

  it('Nummer außer Form, doppelte Nummer, leere Bezeichnung: ungueltige-eingabe mit dem Feld', () => {
    const faelle: [unknown, string][] = [
      ['x', 'bezeichnungen'],
      [[kg('099', 'x')], 'bezeichnungen.nummer'],
      [[kg('1000', 'x')], 'bezeichnungen.nummer'],
      [[kg('300', 'a'), kg('300', 'b')], 'bezeichnungen.nummer'],
      [[kg('300', '')], 'bezeichnungen.bezeichnung'],
      [[kg('300', ' ')], 'bezeichnungen.bezeichnung'],
      [['300'], 'bezeichnungen'],
    ];
    for (const [bezeichnungen, feld] of faelle)
      expect(
        fehler(LEERE_EINSTELLUNGEN, { art: 'KostengruppenbezeichnungenSetzen', bezeichnungen }),
        JSON.stringify(bezeichnungen),
      ).toEqual(['ungueltige-eingabe', feld]);
  });
});

describe('Einstellungsbefehle allgemein', () => {
  it('eine unbekannte Befehlsart: befehl-nicht-zustaendig', () => {
    expect(fehler(LEERE_EINSTELLUNGEN, { art: 'ProjektLoeschen' })?.[0]).toBe('befehl-nicht-zustaendig');
  });

  it('die Befehle lassen die anderen Teile stehen (dasselbe Objekt)', () => {
    const z = wende(wende(LEERE_EINSTELLUNGEN, { art: 'BueroSetzen', buero: BUERO }), {
      art: 'KostengruppenbezeichnungenSetzen',
      bezeichnungen: [kg('300', 'Bauwerk')],
    });
    const neu = wende(z, { art: 'DruckprofilSetzen', druckprofil: profil('A') });
    expect(neu.buero).toBe(z.buero);
    expect(neu.kostengruppenbezeichnungen).toBe(z.kostengruppenbezeichnungen);
  });

  it('Eigenschaft: die Umkehrung ist der Tausch; zweimal umgekehrt ist das ChangeSet selbst (Sitzungs-Undo, D-82 M1)', () => {
    const befehlArb = fc.oneof(
      fc.constantFrom<EinstellungenBefehl>(
        { art: 'BueroSetzen', buero: BUERO },
        { art: 'BueroSetzen', buero: null },
        { art: 'KostengruppenbezeichnungenSetzen', bezeichnungen: [] },
        {
          art: 'KostengruppenbezeichnungenSetzen',
          bezeichnungen: [kg('300', 'Bauwerk'), kg('100', 'Grund')],
        },
      ),
      fc
        .constantFrom('A', 'B', 'C')
        .map((n): EinstellungenBefehl => ({ art: 'DruckprofilSetzen', druckprofil: profil(n) })),
      fc
        .constantFrom('A', 'B', 'C')
        .map((n): EinstellungenBefehl => ({ art: 'DruckprofilEntfernen', name: n })),
    );
    fc.assert(
      fc.property(fc.array(befehlArb, { maxLength: 12 }), (befehle) => {
        let z = LEERE_EINSTELLUNGEN;
        const verlauf: { z: Einstellungen; cs: EinstellungenChangeSet }[] = [];
        for (const b of befehle) {
          const e = einstellungenBefehlAusfuehren(z, b);
          if (!e.ok) continue;
          expect(einstellungenChangeSetUmkehren(einstellungenChangeSetUmkehren(e.wert))).toEqual(e.wert);
          verlauf.push({ z, cs: e.wert });
          z = einstellungenChangeSetAnwenden(z, e.wert);
        }
        // Alles rückwärts zurücknehmen ergibt den Anfang.
        for (const { z: vorher, cs } of verlauf.reverse()) {
          z = einstellungenChangeSetAnwenden(z, einstellungenChangeSetUmkehren(cs));
          expect(z).toEqual(vorher);
        }
        expect(z).toEqual(LEERE_EINSTELLUNGEN);
      }),
      { numRuns: 100 },
    );
  });
});
