// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle am Bauzeitenplan (Ticket 109 Punkt 2; `vertrag` v1.6 Punkt 4, D-57, D-97.9): Ausführen, Anwenden, Umkehren. Der
// Ausführer prüft die Form (Fehler); fachlich Auffälliges bleibt ein Befund der Terminrechnung (U5). Sollwerte aus den
// Lesarten an den Vertragstypen und den Beispielen des Vertrags (Ticket 97).

import type {
  Bauzeitenplan,
  BauzeitenplanBefehl,
  BauzeitenplanChangeSet,
  BauzeitenplanZustand,
  Befehlsfehler,
  Ergebnis,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import {
  beispielBauzeitenplan,
  beispielBauzeitenplanbefehle,
  beispielChangeSetVorgangEntfernen,
  beispielVorgangEntfernen,
  beispielVorgangSetzen,
} from '../../vertrag/src/beispiele';
import {
  bauzeitenplanBefehlAusfuehren,
  bauzeitenplanChangeSetAnwenden,
  bauzeitenplanChangeSetUmkehren,
} from './index';

/** Führt aus und erwartet ein ChangeSet. */
function ok(zustand: BauzeitenplanZustand | null, befehl: BauzeitenplanBefehl): BauzeitenplanChangeSet {
  const e: Ergebnis<BauzeitenplanChangeSet, Befehlsfehler> = bauzeitenplanBefehlAusfuehren(zustand, befehl);
  if (!e.ok) throw new Error(`${e.fehler.code}: ${e.fehler.meldung}`);
  return e.wert;
}
const zustand = (bauzeitenplan: Bauzeitenplan): BauzeitenplanZustand => ({ bauzeitenplan });

describe('BauzeitenplanAnlegen', () => {
  it('legt den Plan an; Anwenden ergibt ihn, die Umkehrung löscht ihn wieder', () => {
    const cs = ok(null, { art: 'BauzeitenplanAnlegen', bauzeitenplan: beispielBauzeitenplan });
    expect(cs).toEqual({
      art: 'bauzeitenplan',
      bauzeitenplanId: beispielBauzeitenplan.id,
      bauzeitenplan: { vorher: null, nachher: beispielBauzeitenplan },
    });
    expect(bauzeitenplanChangeSetAnwenden(null, cs)).toEqual(zustand(beispielBauzeitenplan));
    const zurueck = bauzeitenplanChangeSetUmkehren(cs);
    expect(zurueck.bauzeitenplan).toEqual({ vorher: beispielBauzeitenplan, nachher: null });
    expect(bauzeitenplanChangeSetAnwenden(zustand(beispielBauzeitenplan), zurueck)).toBeNull();
  });
});

describe('Beispiele des Vertrags (Ticket 97)', () => {
  const plan = zustand(beispielBauzeitenplan);
  const ids = (p: Bauzeitenplan | null): string[] => (p?.vorgaenge ?? []).map((v) => v.bezeichnung);

  it('VorgangSetzen legt „Dach“ im Rohbau hinter dem Mauerwerk an', () => {
    const cs = ok(plan, beispielVorgangSetzen);
    expect(cs.bauzeitenplan.vorher).toBe(beispielBauzeitenplan);
    expect(ids(cs.bauzeitenplan.nachher)).toEqual([
      'Rohbau',
      'Erdarbeiten',
      'Mauerwerk EG',
      'Dach',
      'Rohbau fertig',
    ]);
    expect(cs.bauzeitenplan.nachher?.vorgaenge[3]).toBe(beispielVorgangSetzen.vorgang);
  });

  it('VorgangEntfernen nimmt das Mauerwerk und die Beziehung des Meilensteins darauf mit', () => {
    expect(ok(plan, beispielVorgangEntfernen)).toEqual(beispielChangeSetVorgangEntfernen);
  });

  it('BauzeitenplankopfSetzen setzt Name, Projektbeginn und Kalender; die Vorgänge bleiben', () => {
    const [, kopf] = beispielBauzeitenplanbefehle;
    const cs = ok(plan, kopf);
    expect(cs.bauzeitenplan.nachher).toEqual({
      ...beispielBauzeitenplan,
      name: kopf.name,
      projektbeginn: '2026-11-23',
      kalender: { ...beispielBauzeitenplan.kalender, arbeitstage: [1, 2, 3, 4, 5, 6] },
    });
  });

  it('BauzeitenplanLoeschen: nachher null, die Umkehrung bringt den vollen Stand zurück', () => {
    const [, , loeschen] = beispielBauzeitenplanbefehle;
    const cs = ok(plan, loeschen);
    expect(cs.bauzeitenplan).toEqual({ vorher: beispielBauzeitenplan, nachher: null });
    expect(bauzeitenplanChangeSetAnwenden(null, bauzeitenplanChangeSetUmkehren(cs))).toEqual(plan);
  });

  it('der leere Plan aus dem Anlegebeispiel', () => {
    const [anlegen] = beispielBauzeitenplanbefehle;
    expect(ok(null, anlegen).bauzeitenplan.nachher).toEqual({ ...beispielBauzeitenplan, vorgaenge: [] });
  });
});
