// SPDX-License-Identifier: AGPL-3.0-or-later
// Mengen aus dem Modell ins Ausschreibungs-LV (Ticket 115, X1d, D-53): Vorschau je Position mit Zuordnungen (alter und neuer
// Vordersatz, Ansatzzeilen, Befunde) und die Befehle `MengenansatzSetzen`. Die Ansatzzeilen baut `bim`, die Menge rechnet die
// App mit `mengen` (D-22); geschrieben wird alles als **ein** Undo-Schritt (`Sitzung.folge`). Im Auftrags-LV gibt es diesen
// Weg nicht (D-53, `MengenansatzSetzen` ist kein AuftragsLvBefehl).

import { ozText } from '../lv/oztext';
import { mengenuebernahmeBerechnen } from '@tethys/bim';
import { mengenansatzBerechnen } from '@tethys/mengen';
import type {
  Ansatzzeile,
  Bauwerksmodell,
  Knoten,
  Menge,
  MengenansatzSetzen,
  Pruefbefund,
} from '@tethys/vertrag';
import type { Zeilenkopf } from '../ui/zeilenkopf';

export interface Uebernahmezeile extends Zeilenkopf {
  /** Der gespeicherte Vordersatz. */
  readonly vorher: Menge | null;
  /** Die Menge aus den neuen Zeilen, gerechnet mit `mengen`; `null` ohne Zeile. */
  readonly nachher: Menge | null;
  readonly zeilen: readonly Ansatzzeile[];
  /** Wahr, wenn es Zeilen gibt und sie vom gespeicherten Ansatz abweichen (D-108.6): nur dann wird geschrieben. */
  readonly geaendert: boolean;
  readonly befunde: readonly Pruefbefund[];
}

export interface Uebernahmevorschau {
  /** Je Position mit Zuordnungen, in LV-Reihenfolge. */
  readonly zeilen: readonly Uebernahmezeile[];
}

/** Die Vorschau der Mengenübernahme eines LV aus einem Modell(stand). */
export function uebernahmeVorschau(knoten: readonly Knoten[], modell: Bauwerksmodell): Uebernahmevorschau {
  const positionen = new Map(knoten.map((k) => [k.id as string, k]));
  const zeilen = mengenuebernahmeBerechnen(knoten, modell).positionen.map((u): Uebernahmezeile => {
    const p = positionen.get(u.positionId);
    const position = p?.art === 'position' ? p : null;
    return {
      positionId: u.positionId,
      oz: position === null ? '' : ozText(position), // Ticket 122: mit Index, wie überall in der App
      kurztext: position?.kurztext ?? '',
      einheit: position?.einheit ?? '',
      vorher: position?.menge ?? null,
      nachher: u.zeilen.length === 0 ? null : mengenansatzBerechnen(u.zeilen).summe,
      zeilen: u.zeilen,
      geaendert: u.geaendert,
      befunde: u.befunde,
    };
  });
  return { zeilen };
}

/** Je geänderter Position `MengenansatzSetzen` mit den Zeilen aus `bim` und der Menge aus `mengen`. */
export function uebernahmeBefehle(v: Uebernahmevorschau): MengenansatzSetzen[] {
  return v.zeilen
    .filter((z) => z.geaendert && z.zeilen.length > 0)
    .map((z) => ({
      art: 'MengenansatzSetzen',
      positionId: z.positionId,
      mengenansatz: z.zeilen,
      menge: z.nachher,
    }));
}
