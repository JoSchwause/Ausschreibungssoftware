// SPDX-License-Identifier: AGPL-3.0-or-later
// Nachtragsbefunde (Ticket 80, D-35): Status eines Nachtrags und seine Übernahme ins Auftrags-LV passen nicht zusammen. Die
// App schreibt erst `NachtragUebernehmen`, dann den Status `beauftragt` (zwei Aggregate, eine Befehlsfolge); wer eine der
// beiden Hälften allein zurücknimmt oder den Status von Hand ändert, bekommt hier einen Befund (U5: keine Sperre).
//
// „Übernommen“ heißt: Positionen des Nachtrags-LV stehen mit ihrer Kennung im Auftrags-LV (ADR 0011). Wahl-Alternativen
// zählen nicht mit, sie kommen nie ins Auftrags-LV (D-35). Die Gliederung „Nachtrag <nummer>“ trägt keine Herkunft
// (Offene Typfrage 13 aus Ticket 70), darum entscheiden allein die Positionen.

import type {
  AuftragsLvZustand,
  LeistungsverzeichnisId,
  LvZustand,
  Nachtragsstatus,
  PositionId,
} from '@tethys/vertrag';
import { istAlternative } from './nachtrag-uebernehmen';

/**
 * Ein Befund zu einem Nachtrag des Auftrags-LV:
 * - `beauftragt-nicht-uebernommen`: Status `beauftragt`, aber diese Positionen des Nachtrags-LV fehlen im Auftrags-LV
 *   (Dokumentreihenfolge des Nachtrags-LV);
 * - `uebernommen-nicht-beauftragt`: Diese Positionen stehen im Auftrags-LV, der Status ist aber nicht `beauftragt`.
 */
export type Nachtragsbefund =
  | {
      readonly code: 'beauftragt-nicht-uebernommen';
      readonly nachtragLvId: LeistungsverzeichnisId;
      readonly nummer: string;
      readonly positionIds: readonly PositionId[];
    }
  | {
      readonly code: 'uebernommen-nicht-beauftragt';
      readonly nachtragLvId: LeistungsverzeichnisId;
      readonly nummer: string;
      readonly status: Exclude<Nachtragsstatus, 'beauftragt'>;
      readonly positionIds: readonly PositionId[];
    };

/**
 * Befunde zu den Nachträgen eines Auftrags-LV. `nachtragsLvs` darf alle LVs des Projekts enthalten; gelesen werden nur die
 * mit Nachtragsangaben zu diesem Auftrags-LV, in der übergebenen Reihenfolge.
 */
export function nachtragsbefunde(
  auftragsLv: AuftragsLvZustand,
  nachtragsLvs: readonly LvZustand[],
): readonly Nachtragsbefund[] {
  const a = auftragsLv.auftragsLeistungsverzeichnis;
  const imAuftrag = new Set<string>(a.knoten.filter((k) => k.art === 'position').map((k) => k.id));
  const aus: Nachtragsbefund[] = [];
  for (const { leistungsverzeichnis: l } of nachtragsLvs) {
    const n = l.nachtrag;
    if (n?.auftragsLvId !== a.id) continue;
    const positionen = l.knoten
      .filter((k) => k.art === 'position' && !istAlternative(k))
      .map((k) => k.id as PositionId);
    if (n.status === 'beauftragt') {
      const fehlend = positionen.filter((id) => !imAuftrag.has(id));
      if (fehlend.length > 0)
        aus.push({
          code: 'beauftragt-nicht-uebernommen',
          nachtragLvId: l.id,
          nummer: n.nummer,
          positionIds: fehlend,
        });
    } else {
      const drin = positionen.filter((id) => imAuftrag.has(id));
      if (drin.length > 0)
        aus.push({
          code: 'uebernommen-nicht-beauftragt',
          nachtragLvId: l.id,
          nummer: n.nummer,
          status: n.status,
          positionIds: drin,
        });
    }
  }
  return aus;
}
