// SPDX-License-Identifier: AGPL-3.0-or-later
// Eine Projektdatei als Kopie einlesen (v1.7a, Ticket 139; E8, D-127.10, D-82 S10): neue Kennungen für das Projekt und jedes
// Aggregat (was `speicher` global schlüsselt), alle Verweise darauf umgeschrieben, auch in eingefrorenen LV-Ständen. Kennungen
// innerhalb eines Aggregats bleiben (Positionsidentität, ADR 0011); so überschneidet sich die Kopie nie mit dem Original. Das
// Protokoll kommt nicht mit (seine Befehle nennen die alten Kennungen); Modelldateien sind inhaltsadressiert und werden geteilt.

import type { Projektdatei } from '@tethys/vertrag';
import { AGGREGATART_NAMEN, AGGREGATARTEN } from './aggregatarten';
import { abbruch } from './ergebnis';
import type { Kennungsbedarf, Kennungsquelle, Kennungsvorrat } from './kennungen';

/** Die global geschlüsselten Kennungen der Datei mit ihrer Art, ohne Doppel, in der Reihenfolge der Aggregatarten. */
function kennungenDerDatei(d: Projektdatei): Map<string, Kennungsquelle> {
  const alle = new Map<string, Kennungsquelle>();
  for (const art of AGGREGATART_NAMEN)
    for (const [quelle, id] of AGGREGATARTEN[art].kennungen(d)) if (!alle.has(id)) alle.set(id, quelle);
  return alle;
}

/** Wie viele neue Kennungen je Art die Kopie der Datei braucht. */
export function kennungsbedarf(d: Projektdatei): Kennungsbedarf {
  const bedarf: Partial<Record<Kennungsquelle, number>> = {};
  for (const quelle of kennungenDerDatei(d).values()) bedarf[quelle] = (bedarf[quelle] ?? 0) + 1;
  return bedarf;
}

/**
 * Die Datei als Kopie: Jede global geschlüsselte Kennung bekommt die nächste Kennung ihrer Art aus `vorrat`, und jeder Wert der
 * Aggregate, der eine dieser Kennungen ist, wird durch die neue ersetzt, wo immer er steht (Kopf, Verweise, `elternId` der
 * obersten Knoten, Nachtragsangaben, eingefrorene Stände, Bezüge von Vorgang, Honorar und Mangel). Kennungen sind undurchsichtig
 * und eindeutig (A7); ein Text, der zufällig einer Kennung gleicht, kommt nicht vor. Das Projekt heißt `name`, das Protokoll ist
 * leer. Reicht der Vorrat nicht, `unbekannt` (Programmfehler; nichts geschrieben).
 */
export function alsKopie(d: Projektdatei, vorrat: Kennungsvorrat, name: string): Projektdatei {
  const gezogen: Partial<Record<Kennungsquelle, number>> = {};
  const neu = new Map<string, string>();
  for (const [alt, quelle] of kennungenDerDatei(d)) {
    const i = gezogen[quelle] ?? 0;
    const kennung = vorrat[quelle]?.[i];
    if (typeof kennung !== 'string')
      return abbruch('unbekannt', `Für die Kopie fehlen neue Kennungen der Art ${quelle}.`);
    gezogen[quelle] = i + 1;
    neu.set(alt, kennung);
  }
  const umschreiben = (x: unknown): unknown => {
    if (typeof x === 'string') return neu.get(x) ?? x;
    if (Array.isArray(x)) return x.map(umschreiben);
    if (typeof x === 'object' && x !== null)
      return Object.fromEntries(Object.entries(x).map(([k, w]) => [k, umschreiben(w)]));
    return x;
  };
  // Nicht umgeschrieben: Version, Protokoll (entfällt), Modelldateien (Hash), Einstellungen (gehören keinem Projekt).
  const { schemaVersion, protokoll, modelldateien, einstellungen, ...aggregate } = d;
  void protokoll;
  const kopie = umschreiben(aggregate) as typeof aggregate;
  return {
    ...kopie,
    schemaVersion,
    projekt: { ...kopie.projekt, name },
    protokoll: [],
    ...(modelldateien === undefined ? {} : { modelldateien }),
    ...(einstellungen === undefined ? {} : { einstellungen }),
  };
}
