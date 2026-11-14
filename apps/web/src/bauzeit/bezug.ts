// SPDX-License-Identifier: AGPL-3.0-or-later
// Bezug eines Vorgangs auf einzelne Knoten eines LV und der Vorschlag des Fortschritts aus dem Leistungsstand (Ticket 155;
// Ticket 124 §2 und §5, D-109.7, D-118.7). Rein: Die Knoten zur Wahl baut die App aus dem LV; den Leistungsstand rechnet
// `abrechnung` aus allen Aufmaßblättern des Auftrags-LV (wie Soll/Ist, Rechnungsart „Abschlag“), den Anteil `bauzeit`.

import { leistungsstandBerechnen } from '@tethys/abrechnung';
import { fortschrittVorschlagen } from '@tethys/bauzeit';
import type { ElternId, GliederungId, Knoten, PositionId, Prozent, Vorgangsbezug } from '@tethys/vertrag';
import type { Abrechnungsstand } from '../abrechnung/aufmass';
import { ozText } from '../lv/oztext';
import { texte } from './texte';

/** Ein Knoten zur Wahl: Gliederung (Los, Titel) oder Position, mit OZ und Text, eingerückt nach seiner Tiefe. */
export interface Knotenwahl {
  readonly id: GliederungId | PositionId;
  readonly art: 'los' | 'titel' | 'position';
  readonly label: string;
  /** 0 = oberste Stufe des LV. */
  readonly tiefe: number;
}

/** Gliederungen und Positionen des LV in seiner Reihenfolge; Hinweistexte gehören nicht zum Bezug. */
export function knotenwahl(knoten: readonly Knoten[]): Knotenwahl[] {
  const eltern = new Map<string, ElternId>(knoten.map((k) => [k.id, k.elternId]));
  const tiefe = (k: Knoten): number => {
    let n = 0;
    // Die Kette endet an der Wurzel (dem LV), die kein Knoten ist; höchstens so viele Schritte, wie es Knoten gibt.
    for (
      let e: string | undefined = k.elternId;
      e !== undefined && eltern.has(e) && n < knoten.length;
      e = eltern.get(e)
    )
      n += 1;
    return n;
  };
  const liste: Knotenwahl[] = [];
  for (const k of knoten) {
    if (k.art === 'hinweis') continue;
    const text = [ozText(k), k.kurztext.trim()].filter((x) => x !== '').join(' ');
    liste.push({
      id: k.id,
      art: k.art,
      label: text === '' ? texte.vorgang.knotenOhneText : text,
      tiefe: tiefe(k),
    });
  }
  return liste;
}

/**
 * Die Knoten, die die Liste zeigt: die, deren Text den Suchtext enthält (ohne Groß- und Kleinschreibung), höchstens
 * `grenze` davon, und immer die gewählten; Reihenfolge des LV. `treffer`: alle passenden.
 */
export function knotenFiltern(
  liste: readonly Knotenwahl[],
  suche: string,
  gewaehlt: ReadonlySet<string>,
  grenze: number,
): { readonly zeilen: readonly Knotenwahl[]; readonly treffer: number } {
  const s = suche.trim().toLocaleLowerCase('de-DE');
  let treffer = 0;
  const zeilen = liste.filter((k) => {
    const passt = s === '' || k.label.toLocaleLowerCase('de-DE').includes(s);
    if (passt) treffer += 1;
    return gewaehlt.has(k.id) || (passt && treffer <= grenze);
  });
  return { zeilen, treffer };
}

/**
 * Vorschlag für den Fortschritt (D-109.7) aus dem Auftrags-LV und allen seinen Aufmaßblättern. `null`: kein Vorschlag (kein
 * Bezug auf dieses Auftrags-LV oder keine Soll-Summe über 0).
 */
export function fortschrittAusAbrechnung(
  bezug: Vorgangsbezug | null,
  stand: Abrechnungsstand,
): Prozent | null {
  if (bezug?.art !== 'auftrags-leistungsverzeichnis') return null;
  const { leistungsstand } = leistungsstandBerechnen(stand.auftrag, stand.blaetter, 'abschlag');
  return fortschrittVorschlagen(bezug, stand.auftrag, leistungsstand);
}
