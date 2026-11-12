// SPDX-License-Identifier: AGPL-3.0-or-later
// Modellvergleich (Ticket 108 Punkt 6, X1f, D-53; Glossar „Modellvergleich“): zwei Modellstände über die GlobalId, und die
// Folgen für ein LV (Menge laut altem und neuem Stand, Ansatzzeilen für „Mengen aktualisieren“). Rein (A2); für zwei Modelle
// mit je 10.000 Bauteilen in höchstens 500 ms (D-54).

import { subtrahiere, vergleiche } from '@tethys/dezimal';
import type {
  Ansatzzeile,
  Bauteil,
  Bauteilmenge,
  Bauwerksmodell,
  IfcGlobalId,
  Knoten,
  Menge,
  PositionId,
  Pruefbefund,
} from '@tethys/vertrag';
import { modellbefund } from './befunde';
import type { Modellindex } from './form';
import { modellIndex } from './form';
import { zeilenLesen, zugeordnetePositionen } from './mengenuebernahme';

/** Ein Feld, in dem sich ein Bauteil zwischen zwei Ständen ändern kann (D-53). */
export type Vergleichsfeld = 'klasse' | 'name' | 'strukturknoten' | 'mengen';

/**
 * Eine geänderte Menge: gleich sind Satz und Name (bei demselben Paar mehrmals an einem Bauteil: das n-te mit dem n-ten);
 * `vorher` bzw. `nachher` ist `null`, wenn es die Menge nur im anderen Stand gibt. Geändert heißt: anderer Wert oder andere Art.
 */
export interface Mengenaenderung {
  readonly satz: string | null;
  readonly name: string;
  readonly vorher: Bauteilmenge | null;
  readonly nachher: Bauteilmenge | null;
}

/**
 * Ein Bauteil, das in beiden Ständen steht und sich geändert hat. `felder` in der Reihenfolge Klasse, Name, Strukturknoten,
 * Mengen; `mengen` nur die geänderten Mengen, in der Reihenfolge des alten Stands, danach die neuen in der des neuen.
 * `strukturknoten` vergleicht `strukturGlobalId` (den Namen des Knotens findet die App in `struktur`).
 */
export interface Bauteilaenderung {
  readonly globalId: IfcGlobalId;
  readonly felder: readonly Vergleichsfeld[];
  readonly vorher: Bauteil;
  readonly nachher: Bauteil;
  readonly mengen: readonly Mengenaenderung[];
}

/**
 * Ergebnis des Vergleichs. Je GlobalId zählt das erste Bauteil eines Stands (D-66); eine GlobalId, die in einem Stand
 * mehrfach steht, ist ein Befund (`globalid-doppelt`, je Stand und GlobalId). Teilen die Stände weniger als die Hälfte der
 * GlobalIds des kleineren Stands, kommt `ueberdeckung-gering` dazu (ohne Ort).
 */
export interface Modellvergleich {
  /** Nur im neuen Stand, in dessen Reihenfolge. */
  readonly hinzugefuegt: readonly Bauteil[];
  /** Nur im alten Stand, in dessen Reihenfolge. */
  readonly entfernt: readonly Bauteil[];
  /** In beiden Ständen und geändert, in der Reihenfolge des alten Stands. */
  readonly geaendert: readonly Bauteilaenderung[];
  /** In beiden Ständen und gleich (Anzahl; eine Zahl, kein Betrag). */
  readonly anzahlUnveraendert: number;
  readonly befunde: readonly Pruefbefund[];
}

/**
 * Die Folgen eines Vergleichs für eine Position mit Zuordnungen: Menge laut altem und neuem Stand (Summe der Zeilen der
 * Mengenübernahme), `differenz` = nachher − vorher (nur, wenn es beide gibt), `betroffen`, wenn sich die Ansatzzeilen
 * ändern (auch durch ein fehlendes Bauteil, D-99.8). `zeilen` und `befunde` sind die des neuen Stands: mit ihnen setzt die App
 * bei „Mengen aktualisieren“ `MengenansatzSetzen` (nur Ausschreibungs-LV, Menge aus `mengen`, nie mit leeren Zeilen).
 */
export interface Vergleichsfolge {
  readonly positionId: PositionId;
  readonly vorher: Menge | null;
  readonly nachher: Menge | null;
  readonly differenz: Menge | null;
  readonly betroffen: boolean;
  readonly zeilen: readonly Ansatzzeile[];
  readonly befunde: readonly Pruefbefund[];
}

export interface Vergleichsfolgen {
  /** Je Position mit Zuordnungen, in der Reihenfolge des LV. */
  readonly positionen: readonly Vergleichsfolge[];
}

const schluessel = (q: Bauteilmenge): string =>
  `${q.satz === null ? '\u0000' : `\u0001${q.satz}`}\u0002${q.name}`;

function gleicheMenge(a: Bauteilmenge, b: Bauteilmenge): boolean {
  return a.art === b.art && (a.wert === b.wert || vergleiche(a.wert, b.wert) === 0);
}

/** Schlüssel je Menge (Satz, Name, Vorkommen). */
function verschluesselt(mengen: readonly Bauteilmenge[]): [string, Bauteilmenge][] {
  const zaehler = new Map<string, number>();
  return mengen.map((q) => {
    const s = schluessel(q);
    const n = zaehler.get(s) ?? 0;
    zaehler.set(s, n + 1);
    return [`${s}\u0003${String(n)}`, q];
  });
}

function mengenaenderungen(
  vorher: readonly Bauteilmenge[],
  nachher: readonly Bauteilmenge[],
): Mengenaenderung[] {
  // Schneller Weg: gleiche Liste in gleicher Reihenfolge (der übliche Fall bei 10.000 Bauteilen).
  if (
    vorher === nachher ||
    (vorher.length === nachher.length &&
      vorher.every((q, i) => {
        const r = nachher[i];
        return r !== undefined && q.satz === r.satz && q.name === r.name && gleicheMenge(q, r);
      }))
  )
    return [];
  const alt = verschluesselt(vorher);
  const neu = new Map(verschluesselt(nachher));
  const aenderungen: Mengenaenderung[] = [];
  for (const [s, q] of alt) {
    const r = neu.get(s);
    neu.delete(s);
    if (r !== undefined && gleicheMenge(q, r)) continue;
    aenderungen.push({ satz: q.satz, name: q.name, vorher: q, nachher: r ?? null });
  }
  for (const r of neu.values()) aenderungen.push({ satz: r.satz, name: r.name, vorher: null, nachher: r });
  return aenderungen;
}

function aenderung(vorher: Bauteil, nachher: Bauteil): Bauteilaenderung | null {
  const felder: Vergleichsfeld[] = [];
  if (vorher.ifcKlasse !== nachher.ifcKlasse) felder.push('klasse');
  if (vorher.name !== nachher.name) felder.push('name');
  if (vorher.strukturGlobalId !== nachher.strukturGlobalId) felder.push('strukturknoten');
  const mengen = mengenaenderungen(vorher.mengen, nachher.mengen);
  if (mengen.length > 0) felder.push('mengen');
  return felder.length === 0 ? null : { globalId: vorher.globalId, felder, vorher, nachher, mengen };
}

function doppelte(modell: Bauwerksmodell, index: Modellindex, stand: string): Pruefbefund[] {
  const gemeldet = new Set<IfcGlobalId>();
  const befunde: Pruefbefund[] = [];
  for (const b of modell.bauteile)
    if (index.doppelteBauteile.has(b.globalId) && !gemeldet.has(b.globalId)) {
      gemeldet.add(b.globalId);
      befunde.push(
        modellbefund(
          'globalid-doppelt',
          `GlobalId ${b.globalId} steht im ${stand} Stand mehrfach; verglichen wird das erste Bauteil`,
          { globalId: b.globalId },
        ),
      );
    }
  return befunde;
}

/** Vergleicht zwei Modellstände über die GlobalId (Ticket 108 Punkt 6). */
export function modellVergleichen(vorher: Bauwerksmodell, nachher: Bauwerksmodell): Modellvergleich {
  const alt = modellIndex(vorher);
  const neu = modellIndex(nachher);
  const entfernt: Bauteil[] = [];
  const geaendert: Bauteilaenderung[] = [];
  let anzahlUnveraendert = 0;
  for (const [id, a] of alt.bauteil) {
    const n = neu.bauteil.get(id);
    if (n === undefined) {
      entfernt.push(a);
      continue;
    }
    const d = aenderung(a, n);
    if (d === null) anzahlUnveraendert++;
    else geaendert.push(d);
  }
  const hinzugefuegt = [...neu.bauteil.values()].filter((n) => !alt.bauteil.has(n.globalId));
  const befunde = [...doppelte(vorher, alt, 'alten'), ...doppelte(nachher, neu, 'neuen')];
  const gemeinsam = alt.bauteil.size - entfernt.length;
  const kleiner = Math.min(alt.bauteil.size, neu.bauteil.size);
  if (kleiner > 0 && 2 * gemeinsam < kleiner)
    befunde.push(
      modellbefund(
        'ueberdeckung-gering',
        `Die Stände teilen ${String(gemeinsam)} von ${String(kleiner)} GlobalIds des kleineren Stands; ` +
          'vielleicht hat das Autorenwerkzeug die GlobalIds neu vergeben',
      ),
    );
  return { hinzugefuegt, entfernt, geaendert, anzahlUnveraendert, befunde };
}

function gleicheZeilen(a: readonly Ansatzzeile[], b: readonly Ansatzzeile[]): boolean {
  return (
    a.length === b.length && a.every((z, i) => z.ausdruck === b[i]?.ausdruck && z.formel === b[i].formel)
  );
}

/** Die Folgen eines Vergleichs für ein LV (Ticket 108 Punkt 6): je Position mit Zuordnungen Mengen und Differenz. */
export function vergleichsfolgenBerechnen(
  knoten: readonly Knoten[],
  vorher: Bauwerksmodell,
  nachher: Bauwerksmodell,
): Vergleichsfolgen {
  const alt = modellIndex(vorher);
  const neu = modellIndex(nachher);
  return {
    positionen: zugeordnetePositionen(knoten).map((p) => {
      const a = zeilenLesen(p, alt);
      const n = zeilenLesen(p, neu);
      return {
        positionId: p.id,
        vorher: a.menge,
        nachher: n.menge,
        differenz: a.menge === null || n.menge === null ? null : subtrahiere(n.menge, a.menge),
        betroffen: !gleicheZeilen(a.zeilen, n.zeilen),
        zeilen: n.zeilen,
        befunde: n.befunde,
      };
    }),
  };
}
