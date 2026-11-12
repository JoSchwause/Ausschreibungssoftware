// SPDX-License-Identifier: AGPL-3.0-or-later
// Folgen eines Modellvergleichs für ein Ausschreibungs-LV und „Mengen aktualisieren“ (Ticket 116 Punkt 3, D-53). Die Mengen
// und Ansatzzeilen kommen aus `bim` (`vergleichsfolgenBerechnen`, `mengenuebernahmeBerechnen`); die Menge im Befehl rechnet
// die App mit `mengen` (D-22). Geschrieben wird je Position `MengenansatzSetzen`, alle als **ein** Undo-Schritt
// (`Sitzung.folge`); nur im Ausschreibungs-LV (D-53).

import { mengenuebernahmeBerechnen, vergleichsfolgenBerechnen } from '@tethys/bim';
import { mengenansatzBerechnen } from '@tethys/mengen';
import type {
  Ansatzzeile,
  Bauwerksmodell,
  LvZustand,
  Menge,
  MengenansatzSetzen,
  Position,
  PositionId,
  Pruefbefund,
} from '@tethys/vertrag';
import type { Ausgang, LvSitzung } from '../lv/befehlsweg';

export interface Folgezeile {
  readonly positionId: PositionId;
  readonly oz: string;
  readonly kurztext: string;
  readonly einheit: string;
  /** Menge laut altem bzw. neuem Stand (Summe der Zeilen aus `bim`); `null`, wenn keine Zeile entsteht. */
  readonly vorher: Menge | null;
  readonly nachher: Menge | null;
  readonly differenz: Menge | null;
  /** Die Menge, die heute im LV steht. */
  readonly imLv: Menge | null;
  readonly betroffen: boolean;
  /** Befunde des neuen Stands (z. B. `bauteil-fehlt`). */
  readonly befunde: readonly Pruefbefund[];
}

export interface Folgenansicht {
  readonly zeilen: readonly Folgezeile[];
}

function positionen(lv: LvZustand): Map<string, Position> {
  const m = new Map<string, Position>();
  for (const k of lv.leistungsverzeichnis.knoten) if (k.art === 'position') m.set(k.id, k);
  return m;
}

const oz = (p: Position | undefined): string =>
  p === undefined ? '' : `${p.ordnungszahl ?? ''}${p.ozIndex === null ? '' : ` ${p.ozIndex}`}`;

/** Je Position mit Zuordnungen (Reihenfolge des LV) Menge alt, neu, Differenz und die Menge im LV. */
export function folgenansicht(lv: LvZustand, alt: Bauwerksmodell, neu: Bauwerksmodell): Folgenansicht {
  const p = positionen(lv);
  return {
    zeilen: vergleichsfolgenBerechnen(lv.leistungsverzeichnis.knoten, alt, neu).positionen.map((f) => {
      const pos = p.get(f.positionId);
      return {
        positionId: f.positionId,
        oz: oz(pos),
        kurztext: pos?.kurztext ?? '',
        einheit: pos?.einheit ?? '',
        vorher: f.vorher,
        nachher: f.nachher,
        differenz: f.differenz,
        imLv: pos?.menge ?? null,
        betroffen: f.betroffen,
        befunde: f.befunde,
      };
    }),
  };
}

export interface Aktualisierungsposition {
  readonly positionId: PositionId;
  readonly oz: string;
  readonly kurztext: string;
  /** Menge heute im LV und nach dem Aktualisieren. */
  readonly vorher: Menge | null;
  readonly nachher: Menge;
  readonly zeilen: readonly Ansatzzeile[];
  readonly befunde: readonly Pruefbefund[];
}

export interface Aktualisierung {
  readonly positionen: readonly Aktualisierungsposition[];
  readonly befehle: readonly MengenansatzSetzen[];
}

/**
 * Was „Mengen aktualisieren“ schreibt (D-116.2): jede Position, die der Vergleich betrifft und deren Ansatz im LV von den
 * Zeilen des neuen Stands abweicht; ohne Zeile bleibt die Position, wie sie ist (nie 0, Q5, D-108.6).
 */
export function aktualisierungBerechnen(lv: LvZustand, alt: Bauwerksmodell, neu: Bauwerksmodell): Aktualisierung {
  const knoten = lv.leistungsverzeichnis.knoten;
  const betroffen = new Set(
    vergleichsfolgenBerechnen(knoten, alt, neu)
      .positionen.filter((f) => f.betroffen)
      .map((f) => f.positionId),
  );
  const p = positionen(lv);
  const aus: Aktualisierungsposition[] = [];
  const befehle: MengenansatzSetzen[] = [];
  for (const u of mengenuebernahmeBerechnen(knoten, neu).positionen) {
    if (!betroffen.has(u.positionId) || !u.geaendert || u.zeilen.length === 0) continue;
    const menge = mengenansatzBerechnen(u.zeilen).summe;
    if (menge === null) continue;
    const pos = p.get(u.positionId);
    aus.push({
      positionId: u.positionId,
      oz: oz(pos),
      kurztext: pos?.kurztext ?? '',
      vorher: u.vorher.menge,
      nachher: menge,
      zeilen: u.zeilen,
      befunde: u.befunde,
    });
    befehle.push({ art: 'MengenansatzSetzen', positionId: u.positionId, mengenansatz: u.zeilen, menge });
  }
  return { positionen: aus, befehle };
}

/** Schreibt die Befehle als einen Undo-Schritt; `ok`, wenn alle angenommen sind. */
export async function mengenAktualisieren(
  sitzung: LvSitzung,
  befehle: readonly MengenansatzSetzen[],
): Promise<{ readonly ok: boolean; readonly ausgaenge: readonly Ausgang<LvZustand | null>[] }> {
  const ausgaenge = await sitzung.folge(befehle);
  return { ok: ausgaenge.every((a) => a.ok), ausgaenge };
}
