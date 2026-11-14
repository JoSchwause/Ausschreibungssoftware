// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 149: Angebot bearbeiten, vom Entwurf (Texte der Felder) zu den Befehlen. LV `typisch` über den Kern, das Angebot von
// Bieter A aus `typisch-angebote.json`. Position 01.0010: EP 1.814,850.

import { readFileSync } from 'node:fs';
import { lvBefehlAusfuehren, lvChangeSetAnwenden } from '@tethys/kern';
import type { Angebot, AngebotId, BieterId, LvZustand, PositionId, ProjektId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { fixtureInhalt } from '../../e2e/fixture-inhalt';
import {
  angebotsentwurf,
  entwurfsbefehle,
  positionenInReihenfolge,
  type Angebotsentwurf,
} from './angebotEntwurf';

const P0010 = '019b76e9-ea42-7a6c-9180-36c38b8c3b9e' as PositionId;

function typisch(): LvZustand {
  const inhalt = fixtureInhalt('typisch');
  const r = lvBefehlAusfuehren(null, {
    art: 'LeistungsverzeichnisAnlegen',
    id: inhalt.wurzelId,
    projektId: 'p' as ProjektId,
    inhalt,
  });
  if (!r.ok) throw new Error(r.fehler.meldung);
  const z = lvChangeSetAnwenden(null, r.wert);
  if (z === null) throw new Error('LV');
  return z;
}

const lv = typisch();
const fx = JSON.parse(
  readFileSync(new URL('../../../../fixtures/typisch-angebote.json', import.meta.url), 'utf8'),
) as { angebote: readonly { id: string; bieterId: string; positionen: Angebot['positionen'] }[] };
const a0 = fx.angebote[0];
if (a0 === undefined) throw new Error('Fixture');
const angebot: Angebot = {
  id: a0.id as AngebotId,
  projektId: 'p' as ProjektId,
  leistungsverzeichnisId: lv.leistungsverzeichnis.id,
  bieterId: a0.bieterId as BieterId,
  nachlass: null,
  positionen: a0.positionen,
};

const mitZeile = (e: Angebotsentwurf, text: string, nichtAngeboten = false): Angebotsentwurf => ({
  ...e,
  zeilen: new Map(e.zeilen).set(P0010, { positionId: P0010, text, nichtAngeboten }),
});

describe('angebotsentwurf und entwurfsbefehle', () => {
  const e = angebotsentwurf(lv, angebot);

  it('der Entwurf zeigt die gespeicherten Preise deutsch; unverändert ergibt keine Befehle', () => {
    expect(positionenInReihenfolge(lv)[0]?.id).toBe(P0010);
    expect(e.zeilen.get(P0010)).toEqual({ positionId: P0010, text: '1.814,850', nichtAngeboten: false });
    expect(e.nachlassart).toBe('kein');
    expect(entwurfsbefehle(lv, angebot, e)).toEqual({ befehle: [], fehler: new Map() });
  });

  it('ein berichtigter Preis: AngebotspositionSetzen mit kanonischem EP, ohne Anteile', () => {
    expect(entwurfsbefehle(lv, angebot, mitZeile(e, '1900')).befehle).toEqual([
      {
        art: 'AngebotspositionSetzen',
        position: { positionId: P0010, status: 'angeboten', einheitspreis: '1900.000', epa: null },
      },
    ]);
  });

  it('„nicht angeboten“ und Nachlass in %', () => {
    const r = entwurfsbefehle(lv, angebot, {
      ...mitZeile(e, '', true),
      nachlassart: 'prozent',
      nachlass: '5',
    });
    expect(r.befehle).toEqual([
      { art: 'AngebotspositionSetzen', position: { positionId: P0010, status: 'nicht-angeboten' } },
      { art: 'AngebotsNachlassSetzen', nachlass: { art: 'prozent', wert: '5.00' } },
    ]);
  });

  it('Nachlass entfernen, wenn einer gespeichert ist', () => {
    const mitNachlass: Angebot = { ...angebot, nachlass: { art: 'betrag', wert: '100.00' as never } };
    const g = angebotsentwurf(lv, mitNachlass);
    expect(g.nachlassart).toBe('betrag');
    expect(g.nachlass).toBe('100,00');
    expect(entwurfsbefehle(lv, mitNachlass, { ...g, nachlassart: 'kein' }).befehle).toEqual([
      { art: 'AngebotsNachlassEntfernen' },
    ]);
  });

  it('unlesbare oder leere Eingaben sind Meldungen am Feld; nichts gesendet für dieses Feld', () => {
    const r = entwurfsbefehle(lv, angebot, { ...mitZeile(e, 'viel'), nachlassart: 'betrag', nachlass: '' });
    expect(r.befehle).toEqual([]);
    expect(r.fehler.get(P0010)).toBe('Bitte eine Zahl wie 12,50 eingeben.');
    expect(r.fehler.get('nachlass')).toBe('Bitte einen Wert für den Nachlass eingeben.');
    expect(entwurfsbefehle(lv, angebot, mitZeile(e, '')).fehler.get(P0010)).toBe(
      'Bitte einen Preis eingeben oder „nicht angeboten“ wählen.',
    );
    expect(entwurfsbefehle(lv, angebot, mitZeile(e, '1,2345')).fehler.get(P0010)).toBe(
      'Zu viele Nachkommastellen.',
    );
  });
});
