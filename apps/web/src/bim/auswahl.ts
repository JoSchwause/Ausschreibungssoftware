// SPDX-License-Identifier: AGPL-3.0-or-later
// Auswahlabgleich Baum ↔ 3D (Ticket 114, X1b). Die App hält die Auswahl (GlobalIds), die Leinwand meldet nur Klicks
// (`ui-modell`, D-100). Zeile aktiv → ihre Bauteile ausgewählt (Strukturknoten: alle darunter); Klick im 3D → Auswahl und
// Sprung zur Zeile (`sprungziel`), Strg+Klick ergänzt. Der Sprung lässt das Grid die Zeile als aktiv melden; diese eine
// erwartete Meldung ändert die Auswahl nicht, sonst ersetzte sie die Auswahl aus dem 3D (D-114.4).
// Per Tastatur (Ticket 122, U3, D-122.2): Die Tasten bewegen nur die aktive Zeile, die Auswahl bleibt; die Leertaste wählt die
// aktive Zeile (wie ein Klick), Strg+Leertaste nimmt sie in die Auswahl auf oder heraus (wie Strg+Klick).

import type { VergleichsSprungziel } from '@tethys/ui-grid';
import type { IfcGlobalId } from '@tethys/vertrag';
import { vorfahren, type Modellbaum } from './baum';

export interface Auswahlstand {
  /** GlobalIds der ausgewählten Bauteile, jede einmal. */
  readonly auswahl: readonly IfcGlobalId[];
  /** Die aktive Zeile des Grids; `undefined`, solange das Grid noch keine gemeldet hat. */
  readonly aktiveZeile: string | null | undefined;
  readonly sprungziel: VergleichsSprungziel | null;
  /** Die Zeile, die der letzte Sprung aktiv macht; ihre Meldung behält die Auswahl. */
  readonly erwartet: string | null;
  readonly zugeklappt: ReadonlySet<string>;
}

export const AUSWAHL_START: Auswahlstand = {
  auswahl: [],
  aktiveZeile: undefined,
  sprungziel: null,
  erwartet: null,
  zugeklappt: new Set(),
};

/** Die Bauteile einer Zeile und aller Zeilen darunter (Teile unter ihrem Ganzen), in Baumreihenfolge, jede GlobalId einmal. */
export function auswahlDerZeile(baum: Modellbaum, zeilenId: string): IfcGlobalId[] {
  const aus = new Set<IfcGlobalId>();
  const stapel = [zeilenId];
  for (let id = stapel.pop(); id !== undefined; id = stapel.pop()) {
    const k = baum.knoten.get(id);
    if (k?.art === 'bauteil') aus.add(k.bauteil.globalId);
    const kinder = baum.kinder.get(id) ?? [];
    for (let i = kinder.length - 1; i >= 0; i--) stapel.push(kinder[i] ?? '');
  }
  return [...aus];
}

/**
 * Das Grid meldet eine neue aktive Zeile (`onZeileAktiv`). Die erste Meldung nach dem Laden wählt nichts (D-114.4).
 * `hinzufuegen` (Strg/Cmd beim Klick, Ticket 115): die Bauteile der Zeile ergänzen die Auswahl.
 */
export function beiZeileAktiv(
  stand: Auswahlstand,
  baum: Modellbaum,
  zeilenId: string | null,
  hinzufuegen = false,
): Auswahlstand {
  if (stand.aktiveZeile === undefined || zeilenId === null || zeilenId === stand.erwartet)
    return { ...stand, aktiveZeile: zeilenId, erwartet: null };
  const neu = auswahlDerZeile(baum, zeilenId);
  const auswahl = hinzufuegen ? [...new Set([...stand.auswahl, ...neu])] : neu;
  return { ...stand, aktiveZeile: zeilenId, erwartet: null, auswahl };
}

/** Klick in der 3D-Ansicht: `[]` ist ein Klick ins Leere; `hinzufuegen` bei Strg/Cmd. */
export function beiKlick3d(
  stand: Auswahlstand,
  baum: Modellbaum,
  globalIds: readonly IfcGlobalId[],
  hinzufuegen: boolean,
): Auswahlstand {
  const auswahl = hinzufuegen ? [...new Set([...stand.auswahl, ...globalIds])] : [...new Set(globalIds)];
  const erste = globalIds[0];
  const ziel = erste === undefined ? undefined : baum.zeileVon(erste);
  if (ziel === undefined) return { ...stand, auswahl };
  const zugeklappt = new Set(stand.zugeklappt);
  for (const v of vorfahren(baum, ziel)) zugeklappt.delete(v);
  const nr = (stand.sprungziel?.nr ?? 0) + 1;
  return {
    ...stand,
    auswahl,
    zugeklappt,
    sprungziel: { zeilenId: ziel, nr },
    erwartet: ziel === stand.aktiveZeile ? null : ziel,
  };
}

/** Auf- oder Zuklappen im Grid (`onAufklappen`). */
export function beiAufklappen(stand: Auswahlstand, zeilenId: string, aufgeklappt: boolean): Auswahlstand {
  const zugeklappt = new Set(stand.zugeklappt);
  if (aufgeklappt) zugeklappt.delete(zeilenId);
  else zugeklappt.add(zeilenId);
  return { ...stand, zugeklappt };
}

/** Die Tasten eines `KeyboardEvent`, soweit die Auswahl sie braucht. */
export interface Taste {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
}

/** Leertaste allein: Die Bauteile der aktiven Zeile werden die Auswahl (wie ein Klick). */
export const istWaehltaste = (t: Taste): boolean =>
  t.key === ' ' && !t.ctrlKey && !t.metaKey && !t.altKey && !t.shiftKey;

/** Strg+Leertaste (auf dem Mac auch Cmd+Leertaste): die aktive Zeile in die Auswahl aufnehmen oder herausnehmen. */
export const istUmschalttaste = (t: Taste): boolean =>
  t.key === ' ' && (t.ctrlKey || t.metaKey) && !t.altKey && !t.shiftKey;

/**
 * Die Tastatur hat die aktive Zeile bewegt (Pfeile, Tab, Pos1/Ende, Bild auf/ab): Die Auswahl bleibt, nur die Eigenschaften
 * folgen der Zeile. So verlässt man den Baum per Tastatur, ohne eine Mehrfachauswahl zu verlieren (U3).
 */
export const beiTastenfokus = (stand: Auswahlstand, zeilenId: string | null): Auswahlstand => ({
  ...stand,
  aktiveZeile: zeilenId,
  erwartet: null,
});

/** Leertaste: die Bauteile der aktiven Zeile (und darunter) ersetzen die Auswahl. Ohne aktive Zeile ändert sich nichts. */
export function zeileWaehlen(stand: Auswahlstand, baum: Modellbaum): Auswahlstand {
  const zeilenId = stand.aktiveZeile;
  if (zeilenId === undefined || zeilenId === null) return stand;
  return { ...stand, auswahl: auswahlDerZeile(baum, zeilenId) };
}

/**
 * Strg+Leertaste: Sind alle Bauteile der aktiven Zeile gewählt, fallen sie aus der Auswahl; sonst kommen die fehlenden dazu.
 * Die übrige Auswahl bleibt. Ohne aktive Zeile ändert sich nichts.
 */
export function auswahlUmschalten(stand: Auswahlstand, baum: Modellbaum): Auswahlstand {
  const zeilenId = stand.aktiveZeile;
  if (zeilenId === undefined || zeilenId === null) return stand;
  const zeile = auswahlDerZeile(baum, zeilenId);
  if (zeile.length === 0) return stand;
  const gewaehlt = new Set(stand.auswahl);
  const alle = zeile.every((g) => gewaehlt.has(g));
  const weg = new Set(zeile);
  const auswahl = alle
    ? stand.auswahl.filter((g) => !weg.has(g))
    : [...new Set([...stand.auswahl, ...zeile])];
  return { ...stand, auswahl };
}
