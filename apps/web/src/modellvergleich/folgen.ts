// SPDX-License-Identifier: AGPL-3.0-or-later
// Folgen eines Modellvergleichs für ein Ausschreibungs-LV und „Mengen aktualisieren“ (Ticket 116 Punkt 3, D-53). Die Mengen
// und Ansatzzeilen kommen aus `bim` (`vergleichsfolgenBerechnen`, `mengenuebernahmeBerechnen`); die Menge im Befehl rechnet
// die App mit `mengen` (D-22). Geschrieben wird je Position `MengenansatzSetzen`, alle als **ein** Undo-Schritt
// (`Sitzung.folge`); nur im Ausschreibungs-LV (D-53).

import { ozText } from '../lv/oztext';
import { mengenuebernahmeBerechnen, vergleichsfolgenBerechnen } from '@tethys/bim';
import { formatiereMengeDe } from '@tethys/dezimal';
import { mengenansatzBerechnen } from '@tethys/mengen';
import type { VergleichsSpalte, VergleichsZeile } from '@tethys/ui-grid';
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
import { texte } from './texte';
import type { Zeilenkopf } from '../ui/zeilenkopf';

export interface Folgezeile extends Zeilenkopf {
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

/** Die OZ einer Position wie überall in der App, mit Index (`ozText`, Ticket 122). */
const oz = (p: Position | undefined): string => (p === undefined ? '' : ozText(p));

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
export function aktualisierungBerechnen(
  lv: LvZustand,
  alt: Bauwerksmodell,
  neu: Bauwerksmodell,
): Aktualisierung {
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

export const FOLGEN_SPALTEN: readonly VergleichsSpalte[] = [
  { id: 'oz', kopf: texte.folgen.oz, breite: 110 },
  { id: 'kurztext', kopf: texte.folgen.kurztext, breite: 220 },
  { id: 'einheit', kopf: texte.folgen.einheit, breite: 70 },
  { id: 'vorher', kopf: texte.folgen.vorher, ausrichtung: 'rechts', breite: 110 },
  { id: 'nachher', kopf: texte.folgen.nachher, ausrichtung: 'rechts', breite: 110 },
  { id: 'differenz', kopf: texte.folgen.differenz, ausrichtung: 'rechts', breite: 110 },
  { id: 'imLv', kopf: texte.folgen.imLv, ausrichtung: 'rechts', breite: 110 },
  { id: 'betroffen', kopf: texte.folgen.betroffen, breite: 90 },
];

const mengeText = (m: Menge | null): string => (m === null ? '' : formatiereMengeDe(m));

/** Zeilen des Grids „Positionen mit Zuordnungen“ (Texte am Rand formatiert, N4). */
export function folgenZeilen(f: Folgenansicht): VergleichsZeile[] {
  return f.zeilen.map((z) => ({
    id: z.positionId,
    art: 'position',
    tiefe: 0,
    hatUnterknoten: false,
    aufgeklappt: false,
    zellen: {
      oz: { text: z.oz },
      kurztext: { text: z.kurztext },
      einheit: { text: z.einheit },
      vorher: { text: mengeText(z.vorher) },
      nachher: { text: mengeText(z.nachher) },
      differenz: { text: mengeText(z.differenz) },
      imLv: { text: mengeText(z.imLv) },
      betroffen: { text: z.betroffen ? texte.folgen.ja : '' },
    },
  }));
}

/**
 * Befunde aus `bim` für die Anzeige: vorn OZ und Kurztext der Position, hinten der Name des Bauteils im alten Stand (ein
 * entferntes Bauteil kennt der neue Stand nicht mehr).
 */
export function befundeErklaert(
  befunde: readonly Pruefbefund[],
  lv: LvZustand,
  alt: Bauwerksmodell,
): Pruefbefund[] {
  const p = positionen(lv);
  const namen = new Map<string, string>();
  for (const b of alt.bauteile) if (b.name !== null && !namen.has(b.globalId)) namen.set(b.globalId, b.name);
  return befunde.map((b) => {
    const pos = b.ort.knotenId === undefined ? undefined : p.get(b.ort.knotenId);
    const vorn = pos === undefined ? '' : `${oz(pos)} ${pos.kurztext}: `;
    const name = b.ort.globalId === undefined ? undefined : namen.get(b.ort.globalId);
    const hinten = name === undefined ? '' : ` (im alten Stand: ${name})`;
    return { ...b, meldung: `${vorn}${b.meldung}${hinten}` };
  });
}

/** Schreibt die Befehle als einen Undo-Schritt; `ok`, wenn alle angenommen sind. */
export async function mengenAktualisieren(
  sitzung: LvSitzung,
  befehle: readonly MengenansatzSetzen[],
): Promise<{ readonly ok: boolean; readonly ausgaenge: readonly Ausgang<LvZustand | null>[] }> {
  const ausgaenge = await sitzung.folge(befehle);
  return { ok: ausgaenge.every((a) => a.ok), ausgaenge };
}
