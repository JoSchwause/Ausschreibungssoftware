// SPDX-License-Identifier: AGPL-3.0-or-later
// Review Welle 7, SB3: Die Preise eines Angebots stehen im gemeinsamen Grid. LV `typisch` über den Kern, das Angebot von
// Bieter A aus `typisch-angebote.json`; Position 01.0010 mit EP 1.814,850.

import { readFileSync } from 'node:fs';
import { lvBefehlAusfuehren, lvChangeSetAnwenden } from '@tethys/kern';
import type {
  Angebot,
  AngebotId,
  BieterId,
  Einheitspreis,
  LvZustand,
  PositionId,
  ProjektId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { fixtureInhalt } from '../../e2e/fixture-inhalt';
import { angebotsentwurf, entwurfsbefehle } from './angebotEntwurf';
import { ANGEBOTSSPALTEN, angebotsAnsicht, entwurfMitPreisen, zuschlagspositionen } from './angebotsgrid';

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
const entwurf = angebotsentwurf(lv, angebot);
const zeileVon = (a: ReturnType<typeof angebotsAnsicht>, id: string) =>
  a.zeilen.find((z) => z.knoten.id === id);

describe('angebotsAnsicht: das Gerüst des LV mit den EP des Angebots', () => {
  it('jede sichtbare Zeile des LV, an Positionen der EP des Entwurfs; keine Summen, keine Befunde des LV', () => {
    const a = angebotsAnsicht(lv, entwurf, new Set());
    expect(a.zeilen.length).toBe(lv.leistungsverzeichnis.knoten.length);
    const z = zeileVon(a, P0010);
    expect(z?.knoten.art === 'position' ? z.knoten.einheitspreis : 'keine Position').toBe('1814.850');
    expect(a.gesamt).toBeNull();
    expect(a.zeilen.every((x) => x.summe === null)).toBe(true);
    expect(ANGEBOTSSPALTEN).not.toContain('gesamtpreis');
  });

  it('zugeklappte Gliederungen verbergen ihre Zeilen wie im LV', () => {
    const titel = lv.leistungsverzeichnis.knoten.find((k) => k.art === 'titel');
    if (titel === undefined) throw new Error('Titel');
    expect(angebotsAnsicht(lv, entwurf, new Set([titel.id])).zeilen.length).toBeLessThan(
      angebotsAnsicht(lv, entwurf, new Set()).zeilen.length,
    );
  });
});

describe('entwurfMitPreisen: was das Grid meldet, kommt in den Entwurf', () => {
  it('ein neuer EP wird zum Text der Zeile; Speichern sendet ihn wie bisher', () => {
    const e = entwurfMitPreisen(lv, entwurf, [
      { art: 'EinheitspreisAendern', positionId: P0010, einheitspreis: '1900.000' as Einheitspreis },
    ]);
    expect(e.zeilen.get(P0010)).toEqual({ positionId: P0010, text: '1.900,000', nichtAngeboten: false });
    expect(entwurfsbefehle(lv, angebot, e).befehle).toEqual([
      {
        art: 'AngebotspositionSetzen',
        position: { positionId: P0010, status: 'angeboten', einheitspreis: '1900.000', epa: null },
      },
    ]);
  });

  it('ein geleerter EP heißt „nicht angeboten“, sichtbar als Hinweis an der Zelle; ein neuer Preis hebt es auf', () => {
    const leer = entwurfMitPreisen(lv, entwurf, [
      { art: 'EinheitspreisAendern', positionId: P0010, einheitspreis: null },
    ]);
    expect(leer.zeilen.get(P0010)).toEqual({ positionId: P0010, text: '', nichtAngeboten: true });
    expect(entwurfsbefehle(lv, angebot, leer).befehle).toEqual([
      { art: 'AngebotspositionSetzen', position: { positionId: P0010, status: 'nicht-angeboten' } },
    ]);
    const z = zeileVon(angebotsAnsicht(lv, leer, new Set()), P0010);
    expect(z?.knoten.art === 'position' ? z.knoten.einheitspreis : 'x').toBeNull();
    expect(z?.befunde.map((b) => [b.code, b.ort.feld])).toEqual([['nicht-angeboten', 'einheitspreis']]);
    const wieder = entwurfMitPreisen(lv, leer, [
      { art: 'EinheitspreisAendern', positionId: P0010, einheitspreis: '1814.850' as Einheitspreis },
    ]);
    expect(entwurfsbefehle(lv, angebot, wieder).befehle).toEqual([]);
  });

  it('eine Position, die das LV nicht hat, und Zuschlagspositionen bleiben unberührt', () => {
    const e = entwurfMitPreisen(lv, entwurf, [
      { art: 'EinheitspreisAendern', positionId: 'fremd' as PositionId, einheitspreis: null },
      ...zuschlagspositionen(lv).map((p) => ({
        art: 'EinheitspreisAendern' as const,
        positionId: p.id,
        einheitspreis: '1.000' as Einheitspreis,
      })),
    ]);
    expect(e.zeilen).toEqual(entwurf.zeilen);
  });
});
