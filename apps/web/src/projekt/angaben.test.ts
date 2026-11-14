// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 150: Formulare „Projektangaben“ und „Büro (Absender)“ → Befehle.
import { projektBefehlAusfuehren } from '@tethys/vergabe';
import type { Projekt, ProjektId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { bueroAusFormular, bueroFormular, projektangabenBefehl, projektFormular } from './angaben';

const PROJEKT: Projekt = {
  id: 'p1' as ProjektId,
  name: 'Schule',
  bauherr: { name: 'Stadt', anschrift: 'Rathausplatz 1' },
  bieter: [],
};

describe('Projektangaben', () => {
  it('ein leeres Projekt füllt das Formular mit Name und Bauherr; leere Felder fehlen nach dem Befehl', () => {
    const f = projektFormular(PROJEKT);
    expect(f).toEqual({
      name: 'Schule',
      bauherr: 'Stadt',
      nummer: '',
      ort: '',
      strasse: '',
      plz: '',
      baustelleOrt: '',
    });
    const b = projektangabenBefehl(PROJEKT, { ...f, name: ' Schule Nord ' });
    // Die Anschrift des Bauherrn (freier Text) bleibt, wie sie war.
    expect(b).toEqual({
      art: 'ProjektangabenSetzen',
      name: 'Schule Nord',
      bauherr: { name: 'Stadt', anschrift: 'Rathausplatz 1' },
      angaben: null,
    });
  });

  it('Nummer, Ort und Baustelle kommen ins Projekt und zurück ins Formular', () => {
    const b = projektangabenBefehl(PROJEKT, {
      ...projektFormular(PROJEKT),
      nummer: '2026-017',
      ort: 'Musterstadt',
      strasse: 'Schulweg 3',
      plz: '',
      baustelleOrt: 'Musterstadt',
    });
    const r = projektBefehlAusfuehren(PROJEKT, b);
    if (!r.ok) throw new Error(r.fehler.meldung);
    const neu = r.wert.projekt.nachher;
    if (neu === null) throw new Error('Projekt fehlt');
    expect(neu.angaben).toEqual({
      nummer: '2026-017',
      ort: 'Musterstadt',
      baustelle: { strasse: 'Schulweg 3', plz: null, ort: 'Musterstadt' },
    });
    expect(projektFormular(neu)).toMatchObject({ nummer: '2026-017', strasse: 'Schulweg 3', plz: '' });
  });
});

describe('Büro (Absender)', () => {
  it('ganz leer heißt: kein Büro', () => {
    expect(bueroAusFormular(bueroFormular(null))).toEqual({ ok: true, buero: null });
  });

  it('ohne Namen, aber mit anderen Angaben: der Name fehlt', () => {
    expect(bueroAusFormular({ ...bueroFormular(null), telefon: '0123' })).toEqual({ ok: false });
  });

  it('Name und Angaben; leere Felder sind null, eine leere Anschrift fehlt', () => {
    const r = bueroAusFormular({ ...bueroFormular(null), name: ' Planungsbüro ', email: 'a@b.de' });
    expect(r).toEqual({
      ok: true,
      buero: { name: 'Planungsbüro', anschrift: null, telefon: null, email: 'a@b.de' },
    });
    const voll = {
      name: 'Büro',
      anschrift: { strasse: 'Weg 1', plz: '12345', ort: null },
      telefon: '0123',
      email: null,
    };
    expect(bueroAusFormular(bueroFormular(voll))).toEqual({ ok: true, buero: voll });
  });
});
