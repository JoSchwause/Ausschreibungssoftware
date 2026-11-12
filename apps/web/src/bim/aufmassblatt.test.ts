// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 115 (X1d, D-53): Aufmaßblatt aus Auswahl. Vorschau je Position und `AufmassAnlegen` mit Mengen aus `mengen`;
// Sollwerte aus `fixtures/typisch-bim.json` (`erweitert.aufmassAusAuswahl`, D-99.9).

import { readFileSync } from 'node:fs';
import { aufmassBefehlAusfuehren } from '@tethys/abrechnung';
import { bauteileImStrukturknoten } from '@tethys/bim';
import type { AuftragsLeistungsverzeichnisId, IfcGlobalId, Knoten, ProjektId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { fixtureInhalt } from '../../e2e/fixture-inhalt';
import { aufmassBlattBefehl, aufmassVorschau } from './aufmassblatt';
import { hausModell } from './testhilfen';

const fx = JSON.parse(
  readFileSync(new URL('../../../../fixtures/typisch-bim.json', import.meta.url), 'utf8'),
) as {
  zuordnungen: { positionId: string; bauteile: { globalId: string; mengenart: string }[] }[];
  erweitert: {
    aufmassAusAuswahl: {
      auswahl: { globalId: string };
      positionen: {
        positionId: string;
        oz: string;
        bauteile: string[];
        mengenansatz: { zeile: string; formel: string; ausdruck: string; variable: null }[];
        menge: string;
      }[];
    };
  };
};
const A = fx.erweitert.aufmassAusAuswahl;

/** Die Positionen von `typisch` mit allen sieben Zuordnungen der Fixture. */
function knotenMitZuordnungen(): Knoten[] {
  const z = new Map(fx.zuordnungen.map((x) => [x.positionId, x.bauteile]));
  return fixtureInhalt('typisch').knoten.map((k) => {
    const b = z.get(k.id);
    return k.art === 'position' && b !== undefined
      ? { ...k, bauteile: b.map((x) => ({ globalId: x.globalId as IfcGlobalId, mengenart: x.mengenart })) }
      : k;
  });
}

describe('Aufmaßblatt aus Auswahl „Geschoss EG“', () => {
  const auswahl = bauteileImStrukturknoten(hausModell(), A.auswahl.globalId as IfcGlobalId);

  it('Vorschau: je zugeordneter Position die ausgewählten Bauteile, Zeilen und Menge der Fixture; Hinweis sichtbar', () => {
    const v = aufmassVorschau(knotenMitZuordnungen(), hausModell(), auswahl);
    expect(v.zeilen.map((z) => [z.oz, z.menge])).toEqual(A.positionen.map((p) => [p.oz, p.menge]));
    expect(v.zeilen.map((z) => z.bauteile)).toEqual(A.positionen.map((p) => p.bauteile));
    expect(v.hinweise).toEqual(['bauteil-auf-mehreren-blaettern-nicht-erkennbar']);
  });

  it('AufmassAnlegen: nächste Nummer, je Position mit Zeilen eine Aufmaßposition; `abrechnung` nimmt es an', () => {
    const v = aufmassVorschau(knotenMitZuordnungen(), hausModell(), auswahl);
    const befehl = aufmassBlattBefehl(
      { aufmass: () => 'a9' as never },
      { id: 'auf1' as AuftragsLeistungsverzeichnisId, projektId: 'p1' as ProjektId },
      [{ nummer: 1 }],
      { bezeichnung: 'EG aus dem Modell', datum: '2026-11-12' },
      v,
    );
    expect(befehl.aufmass.nummer).toBe(2);
    expect(befehl.aufmass.positionen.map((p) => [p.positionId, p.menge])).toEqual(
      A.positionen.map((p) => [p.positionId, p.menge]),
    );
    expect(befehl.aufmass.positionen[1]?.mengenansatz).toEqual(
      A.positionen[1]?.mengenansatz.map((z) => ({ ...z, zeile: Number(z.zeile), formel: Number(z.formel) })),
    );
    expect(aufmassBefehlAusfuehren(null, befehl).ok).toBe(true);
  });

  it('ohne zugeordnetes Bauteil in der Auswahl: leere Vorschau', () => {
    expect(aufmassVorschau(fixtureInhalt('typisch').knoten, hausModell(), auswahl).zeilen).toEqual([]);
  });
});
