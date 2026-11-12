// SPDX-License-Identifier: AGPL-3.0-or-later
// Auswahlabgleich Baum ↔ 3D (Ticket 114, X1b). Die App hält die Auswahl (GlobalIds), die Leinwand meldet nur Klicks
// (`ui-modell`, D-100). Zeile aktiv → ihre Bauteile ausgewählt (Strukturknoten: alle darunter); Klick im 3D → Auswahl und
// Sprung zur Zeile (`sprungziel`), Strg+Klick ergänzt. Der Sprung lässt das Grid die Zeile als aktiv melden; diese eine
// erwartete Meldung ändert die Auswahl nicht, sonst ersetzte sie die Auswahl aus dem 3D (D-114.4).

import type { VergleichsSprungziel } from '@tethys/ui-grid';
import { vorfahren, type Modellbaum } from './baum';

export interface Auswahlstand {
  /** GlobalIds der ausgewählten Bauteile, jede einmal. */
  readonly auswahl: readonly string[];
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
export function auswahlDerZeile(baum: Modellbaum, zeilenId: string): string[] {
  const aus = new Set<string>();
  const stapel = [zeilenId];
  for (let id = stapel.pop(); id !== undefined; id = stapel.pop()) {
    const k = baum.knoten.get(id);
    if (k?.art === 'bauteil') aus.add(k.bauteil.globalId);
    const kinder = baum.kinder.get(id) ?? [];
    for (let i = kinder.length - 1; i >= 0; i--) stapel.push(kinder[i] ?? '');
  }
  return [...aus];
}

/** Das Grid meldet eine neue aktive Zeile (`onZeileAktiv`). Die erste Meldung nach dem Laden wählt nichts (D-114.4). */
export function beiZeileAktiv(stand: Auswahlstand, baum: Modellbaum, zeilenId: string | null): Auswahlstand {
  if (stand.aktiveZeile === undefined || zeilenId === null || zeilenId === stand.erwartet)
    return { ...stand, aktiveZeile: zeilenId, erwartet: null };
  return { ...stand, aktiveZeile: zeilenId, erwartet: null, auswahl: auswahlDerZeile(baum, zeilenId) };
}

/** Klick in der 3D-Ansicht: `[]` ist ein Klick ins Leere; `hinzufuegen` bei Strg/Cmd. */
export function beiKlick3d(
  stand: Auswahlstand,
  baum: Modellbaum,
  globalIds: readonly string[],
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
