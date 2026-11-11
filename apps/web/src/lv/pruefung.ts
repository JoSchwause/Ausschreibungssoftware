// SPDX-License-Identifier: AGPL-3.0-or-later
// Formale LV-Prüfung in der App (U5, U6; Ticket 47): Die Befunde kommen aus `lvPruefen` (Kern, K8). Hier nur, was die
// Oberfläche daraus macht: Gruppen für das Prüf-Panel, Befunde je Knoten für die Zellen des Grids, das Ziel eines
// Sprunglinks und der Zeitpunkt der Prüfung (im Leerlauf, nie im Tastendruck).

import type { Befundschwere, Knoten, KnotenId, LvSpalte, PositionId, Pruefbefund } from '@tethys/vertrag';

export interface Pruefeintrag {
  readonly befund: Pruefbefund;
  /** OZ und Kurztext des Knotens; `null` bei LV-weiten Befunden (oder ohne OZ bzw. bei Hinweistexten). */
  readonly oz: string | null;
  readonly kurztext: string | null;
}

export interface Pruefgruppe {
  readonly schwere: Befundschwere;
  readonly eintraege: readonly Pruefeintrag[];
}

const SCHWEREN: readonly Befundschwere[] = ['fehler', 'warnung'];

function knotenNachId(knoten: readonly Knoten[]): ReadonlyMap<string, Knoten> {
  return new Map(knoten.map((x) => [x.id, x]));
}

/** Befunde gruppiert nach Schwere (Fehler zuerst), in der Reihenfolge des Kerns; leere Gruppen fallen weg. */
export function pruefgruppen(
  befunde: readonly Pruefbefund[],
  knoten: readonly Knoten[],
): readonly Pruefgruppe[] {
  const nachId = knotenNachId(knoten);
  const eintrag = (befund: Pruefbefund): Pruefeintrag => {
    const x = befund.ort.knotenId === undefined ? undefined : nachId.get(befund.ort.knotenId);
    if (x === undefined) return { befund, oz: null, kurztext: null };
    if (x.art === 'hinweis') return { befund, oz: null, kurztext: null };
    return { befund, oz: x.ordnungszahl, kurztext: x.kurztext };
  };
  return SCHWEREN.map((schwere) => ({
    schwere,
    eintraege: befunde.filter((x) => x.schwere === schwere).map(eintrag),
  })).filter((g) => g.eintraege.length > 0);
}

/** Befunde je Knoten (für `LvZeile.befunde`); LV-weite Befunde stehen nur im Panel. */
export function befundeJeKnoten(
  befunde: readonly Pruefbefund[],
): ReadonlyMap<string, readonly Pruefbefund[]> {
  const m = new Map<string, Pruefbefund[]>();
  for (const b of befunde) {
    const id = b.ort.knotenId;
    if (id === undefined) continue;
    const liste = m.get(id);
    if (liste) liste.push(b);
    else m.set(id, [b]);
  }
  return m;
}

const GRID_SPALTEN: ReadonlySet<string> = new Set<LvSpalte>([
  'ordnungszahl',
  'positionsart',
  'kurztext',
  'menge',
  'einheit',
  'einheitspreis',
  'gesamtpreis',
]);

export type Sprungziel =
  | { readonly art: 'zelle'; readonly knotenId: KnotenId; readonly spalte?: LvSpalte }
  | { readonly art: 'dialog'; readonly positionId: PositionId }
  | { readonly art: 'lv'; readonly feld?: string };

export interface Sprung {
  /** Vorfahren des Knotens, von innen nach außen; die App klappt sie auf (der Aufklapp-Zustand gehört ihr). */
  readonly aufklappen: readonly KnotenId[];
  readonly ziel: Sprungziel;
}

/**
 * Wohin ein Eintrag springt: zur Zelle im Grid, wenn das Feld eine Spalte ist (Gliederung ohne Feld: die Zeile); an
 * einer Position öffnet ein Feld ohne Spalte (Langtext, Zuschlag, …) oder ein Befund ohne Feld (Zuschlag, Wahl) den
 * Positionsdialog; LV-weite Befunde nennen ihr Feld.
 */
export function sprungZu(b: Pruefbefund, knoten: readonly Knoten[]): Sprung {
  const id = b.ort.knotenId;
  const feld = b.ort.feld;
  if (id === undefined)
    return { aufklappen: [], ziel: feld === undefined ? { art: 'lv' } : { art: 'lv', feld } };
  const nachId = knotenNachId(knoten);
  const aufklappen: KnotenId[] = [];
  for (let x = nachId.get(nachId.get(id)?.elternId ?? ''); x !== undefined; x = nachId.get(x.elternId))
    aufklappen.push(x.id);
  const k = nachId.get(id);
  if ((feld === undefined || !GRID_SPALTEN.has(feld)) && k?.art === 'position')
    return { aufklappen, ziel: { art: 'dialog', positionId: k.id } };
  return {
    aufklappen,
    ziel:
      feld !== undefined && GRID_SPALTEN.has(feld)
        ? { art: 'zelle', knotenId: id, spalte: feld as LvSpalte }
        : { art: 'zelle', knotenId: id },
  };
}

/** Rückfall ohne `requestIdleCallback`: ein kurzes Zeitfenster nach dem Zeichnen. */
const RUECKFALL_MS = 50;

/**
 * Plant `lauf` für den nächsten Leerlauf des Browsers (`requestIdleCallback`, sonst ein kurzes Zeitfenster) und gibt
 * eine Funktion zum Abbrechen zurück. So läuft die Prüfung nie im Tastendruck.
 */
export function imLeerlauf(lauf: () => void): () => void {
  const g = globalThis as {
    requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number;
    cancelIdleCallback?: (h: number) => void;
  };
  if (g.requestIdleCallback && g.cancelIdleCallback) {
    const h = g.requestIdleCallback(lauf, { timeout: 1000 });
    const abbrechen = g.cancelIdleCallback;
    return () => {
      abbrechen(h);
    };
  }
  const t = setTimeout(lauf, RUECKFALL_MS);
  return () => {
    clearTimeout(t);
  };
}
