// SPDX-License-Identifier: AGPL-3.0-or-later
// Kostengruppe an Positionen setzen (Ticket 89, C2): Eingabe lesen und Befehle bauen. Die Rechnung steht in `kosten`
// (`kgLesen`); hier nur der Rand (N4, U5): eine formwidrige Nummer ist ein Zellfehler wie eine unlesbare Menge und kommt
// nie in einen Befehl; eine Nummer außerhalb der Gliederung der Kostenermittlungen ist ein Hinweis, nie eine Sperre.

import { kgElternteil, kgLesen, kgVorfahren } from '@tethys/kosten';
import type {
  Ergebnis,
  Kostengruppennummer,
  Kostenermittlung,
  KostengruppeSetzen,
  Knoten,
  Position,
  PositionId,
} from '@tethys/vertrag';
import { kinderJeEltern } from '../lv/ansicht';
import { texte } from './texte';

/**
 * Liest die Eingabe einer KG-Zelle: leer heißt „Zuordnung entfernen“ (`null`), sonst genau drei Ziffern, die erste nicht 0.
 * Der Fehler ist eine deutsche Meldung für die Zelle.
 */
export function kgEingabe(text: string): Ergebnis<Kostengruppennummer | null, string> {
  if (text.trim() === '') return { ok: true, wert: null };
  const r = kgLesen(text);
  return r.ok ? r : { ok: false, fehler: texte.zuordnung.fehlerForm };
}

/** Die Positionen eines Baums in Dokumentreihenfolge (Tiefensuche nach `reihenfolge`), auch unter zugeklappten Gliederungen. */
export function positionenInReihenfolge(wurzelId: string, knoten: readonly Knoten[]): Position[] {
  const kinder = kinderJeEltern(knoten);
  const aus: Position[] = [];
  const besuche = (elternId: string): void => {
    for (const k of kinder.get(elternId) ?? []) {
      if (k.art === 'position') aus.push(k);
      else besuche(k.id);
    }
  };
  besuche(wurzelId);
  return aus;
}

/**
 * Ein Befehl je Position, deren Kostengruppe sich ändert; Positionen, die den Wert schon haben, bleiben weg (kein
 * leerer Protokolleintrag, kein leerer Undo-Teil). `null` entfernt die Zuordnung.
 */
export function kostengruppenBefehle(
  positionen: readonly Pick<Position, 'id' | 'kostengruppe'>[],
  ids: ReadonlySet<PositionId> | readonly PositionId[],
  kostengruppe: Kostengruppennummer | null,
): KostengruppeSetzen[] {
  const gewaehlt = new Set<PositionId>(ids);
  const befehle: KostengruppeSetzen[] = [];
  for (const p of positionen) {
    if (!gewaehlt.has(p.id)) continue;
    if ((p.kostengruppe ?? null) === kostengruppe) continue;
    befehle.push({ art: 'KostengruppeSetzen', positionId: p.id, kostengruppe });
  }
  return befehle;
}

/**
 * Liegt die Kostengruppe in der Gliederung mindestens einer Kostenermittlung (als Eintrag, als Vorfahre eines Eintrags
 * oder unter einem Eintrag einer gröberen Gruppe)? Sonst ist das der Hinweis der Zuordnung (U5, Ticket 82 Punkt 3).
 */
export function inGliederung(
  nummer: Kostengruppennummer,
  ermittlungen: readonly Pick<Kostenermittlung, 'eintraege'>[],
): boolean {
  const verwandt = new Set<string>([nummer, ...kgVorfahren(nummer)]);
  for (const e of ermittlungen) {
    for (const eintrag of e.eintraege) {
      if (verwandt.has(eintrag.nummer)) return true; // Eintrag auf der Gruppe selbst oder auf einem Vorfahren
      // Eintrag unterhalb der Gruppe: die Gruppe ist Vorfahre des Eintrags
      for (let n = kgElternteil(eintrag.nummer); n !== null; n = kgElternteil(n))
        if (n === nummer) return true;
    }
  }
  return false;
}
