// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 116: die Ansicht des Modellvergleichs aus `haus-v1.ifc` und `haus-v2.ifc` (über `ifc` gelesen wie in der App),
// gegen die Sollwerte aus `fixtures/typisch-bim.json` (Ticket 99, D-99.8).

import { describe, expect, it } from 'vitest';
import { BIM_SOLL } from '../../e2e/modellvergleich-inhalt';
import { V1, V2 } from './testhilfen';
import { vergleichsansicht } from './vergleich';

const SOLL = BIM_SOLL.erweitert.vergleich;

describe('Vergleichsansicht v1 → v2', () => {
  const a = vergleichsansicht(V1, V2);

  it('Zusammenfassung: 1 hinzugefügt, 1 entfernt, 5 geändert, 24 unverändert (30 − 1 − 5)', () => {
    expect(a.zusammenfassung).toEqual({ hinzugefuegt: 1, entfernt: 1, geaendert: 5, unveraendert: 24 });
  });

  it('Liste: hinzugefügt, entfernt, geändert mit Klasse, Name, Geschoss und Änderung (alt → neu)', () => {
    const tabelle = a.zeilen.map((z) => [
      z.zellen['art']?.text,
      z.zellen['klasse']?.text,
      z.zellen['name']?.text,
      z.zellen['geschoss']?.text,
    ]);
    expect(tabelle).toEqual([
      ...SOLL.hinzugefuegt.map((b) => ['Hinzugefügt', b.klasse, b.name, b.geschoss]),
      ...SOLL.entfernt.map((b) => ['Entfernt', b.klasse, b.name, b.geschoss]),
      ...SOLL.geaendert.map((g) => {
        const b = BIM_SOLL.bauteile.v2.find((x) => x.globalId === g.globalId);
        return ['Geändert', b?.klasse, b?.name, b?.geschoss];
      }),
    ]);
    const aenderung = (gid: string): string | undefined =>
      a.zeilen.find((z) => z.id === `g-${gid}`)?.zellen['aenderung']?.text;
    expect(aenderung('2eblKqOK$lqqMETwZexG5z')).toBe('Name: Bodenplatte → Bodenplatte WU-Beton');
    expect(aenderung('3C178gmUgMjLVcOGcxq1j2')).toBe('Geschoss: EG → OG');
    expect(aenderung('2AhrUbBTe1LU5FWu_DQQz5')).toBe(
      'NetSideArea: 19,254 → 20,653; NetVolume: 7,028 → 7,538',
    );
  });

  it('Färbung: hinzugefügt und geändert am neuen Modell; entfernte nur in der Liste', () => {
    expect(Object.fromEntries(a.faerbung)).toEqual({
      ...Object.fromEntries(SOLL.hinzugefuegt.map((b) => [b.globalId, 'hinzugefuegt'])),
      ...Object.fromEntries(SOLL.geaendert.map((g) => [g.globalId, 'geaendert'])),
    });
  });

  it('keine Befunde zwischen v1 und v2; ein Stand mit sich selbst ist leer', () => {
    expect(a.befunde).toEqual([]);
    const leer = vergleichsansicht(V1, V1);
    expect(leer.zeilen).toEqual([]);
    expect(leer.zusammenfassung).toEqual({ hinzugefuegt: 0, entfernt: 0, geaendert: 0, unveraendert: 30 });
  });
});
