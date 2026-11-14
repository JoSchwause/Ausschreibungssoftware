// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 122 (PC-c2): Die Auswahl „LV für Zuordnung“ nennt keine Muster-LVs (wie der Modellvergleich, D-116.6): Zuordnungen an
// einem Muster-LV verwirft jede Übernahme (D-66 MUST 2), es wäre ein Ziel ohne Wirkung.

import type {
  AuftragsLeistungsverzeichnisId,
  AuftragsLvUebersicht,
  LeistungsverzeichnisId,
  LvUebersicht,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { zuordnungsLvWahlen } from './zuordnungsLv';

const lv = (id: string, name: string, vorlage = false): LvUebersicht => ({
  id: id as LeistungsverzeichnisId,
  name,
  ...(vorlage ? { vorlage: true } : {}),
});
const auftrag = (id: string, name: string): AuftragsLvUebersicht =>
  ({ id: id as AuftragsLeistungsverzeichnisId, name }) as AuftragsLvUebersicht;

describe('Wahl des LV für die Zuordnung', () => {
  it('nennt Ausschreibungs-LVs und Auftrags-LVs, aber keine Muster-LVs; ein Muster-LV wird nie vorgewählt', () => {
    const w = zuordnungsLvWahlen(
      [lv('m', 'Muster Rohbau', true), lv('a', 'Rohbau')],
      [auftrag('x', 'Rohbau A')],
    );
    expect(w.map((x) => x.schluessel)).toEqual(['lv:a', 'auftrag:x']);
    expect(w[0]?.schluessel).toBe('lv:a');
  });

  it('nur Muster-LVs: keine Wahl', () => {
    expect(zuordnungsLvWahlen([lv('m', 'Muster', true)], [])).toEqual([]);
  });
});
