// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it, vi } from 'vitest';
import type { GridIdQuelle, LvAnsicht, LvBefehl, LvSpalte, PositionId, WurzelId } from '@tethys/vertrag';
import { zahlenAttrappe } from '../e2e/harness/attrappen';
import { schreibrechte } from './schreibrechte';
import { texte } from './texte';

const SPALTEN: readonly LvSpalte[] = ['ordnungszahl', 'kurztext', 'menge', 'einheitspreis', 'gesamtpreis'];
const ansicht: LvAnsicht = { wurzelId: 'lv' as WurzelId, zeilen: [], gesamt: null };
const p1 = 'p1' as PositionId;

describe('schreibrechte: Ausnahme „Preise“ im Schreibschutz (SB3)', () => {
  it('mit onEinheitspreise nimmt nur die Spalte EP Eingaben an; Befehle gehen als eine Folge dorthin', () => {
    const onEinheitspreise = vi.fn();
    const r = schreibrechte(
      { schreibgeschuetzt: true, ansicht, zahlen: zahlenAttrappe, onEinheitspreise },
      SPALTEN,
    );
    expect([...r.bearbeitbareSpalten]).toEqual(['einheitspreis']);
    expect(r.einheitspreise).toBe(true);
    expect(r.nurLesen).toBe(true);
    expect(r.schreibschutzText).toBe(texte.gridNurEinheitspreis);
    const befehl: LvBefehl = { art: 'EinheitspreisAendern', positionId: p1, einheitspreis: null };
    r.eingabe(befehl);
    r.folge([{ art: 'MengeAendern', positionId: p1, menge: null }]);
    expect(onEinheitspreise.mock.calls).toEqual([[[befehl]]]);
  });

  it('ohne die Eigenschaft bleibt das Grid ganz schreibgeschützt; im bearbeitbaren Grid gilt keine Ausnahme', () => {
    const r = schreibrechte({ schreibgeschuetzt: true, ansicht, zahlen: zahlenAttrappe }, SPALTEN);
    expect(r.bearbeitbareSpalten.size).toBe(0);
    expect(r.einheitspreise).toBe(false);
    expect(r.schreibschutzText).toBe(texte.gridSchreibgeschuetzt);
    const ids = { position: () => p1, papierkorbeintrag: () => 'x' } as unknown as GridIdQuelle;
    const b = schreibrechte({ ansicht, zahlen: zahlenAttrappe, ids, onBefehl: vi.fn() }, SPALTEN);
    expect(b.einheitspreise).toBe(false);
    expect(b.bearbeitbareSpalten.has('einheitspreis')).toBe(true);
  });
});
