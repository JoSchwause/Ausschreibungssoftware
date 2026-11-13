// SPDX-License-Identifier: AGPL-3.0-or-later
// Neue Kennungen für eine Projektdatei, die als Kopie eingelesen wird (v1.7a, Ticket 139; E8, D-127.10). Die `IdQuelle` der App
// besteht aus Funktionen und kommt nicht über die Grenze zum Worker (`postMessage` klont nur Daten). Darum fragt der Client den
// Speicher zuerst, wie viele Kennungen je Art die Datei braucht (`Kennungsbedarf`), zieht sie aus der `IdQuelle` und schickt sie
// als Daten mit (`Kennungsvorrat`). Dieses Modul läuft im Hauptthread: Es zieht nichts vom Schreibweg nach.

import type { IdQuelle } from '@tethys/vertrag';

/**
 * Die Arten von Kennungen, die `speicher` global schlüsselt und eine Kopie neu vergibt: Projekt und jedes Aggregat (D-127.10),
 * benannt wie die Methode der `IdQuelle`, die eine neue zieht. Kennungen innerhalb eines Aggregats (Knoten, Bieter,
 * Papierkorbeinträge, Vorgänge) bleiben.
 */
export const KENNUNGSQUELLEN = [
  'projekt',
  'leistungsverzeichnis',
  'lvStand',
  'angebot',
  'auftragsLeistungsverzeichnis',
  'aufmass',
  'rechnung',
  'kostenermittlung',
  'bauwerksmodell',
  'bauzeitenplan',
  'honorarberechnung',
  'mangel',
  'bautagebucheintrag',
] as const satisfies readonly (keyof IdQuelle)[];

export type Kennungsquelle = (typeof KENNUNGSQUELLEN)[number];

/** Wie viele neue Kennungen je Art eine Kopie braucht (fehlt: keine). */
export type Kennungsbedarf = Readonly<Partial<Record<Kennungsquelle, number>>>;

/** Die neuen Kennungen je Art, in der Reihenfolge, in der die Kopie sie vergibt. */
export type Kennungsvorrat = Readonly<Partial<Record<Kennungsquelle, readonly string[]>>>;

/** Zieht so viele Kennungen je Art aus `ids`, wie `bedarf` nennt. */
export function kennungenZiehen(bedarf: Kennungsbedarf, ids: IdQuelle): Kennungsvorrat {
  const vorrat: Partial<Record<Kennungsquelle, string[]>> = {};
  for (const q of KENNUNGSQUELLEN) {
    const n = bedarf[q] ?? 0;
    if (n > 0) vorrat[q] = Array.from({ length: n }, (): string => ids[q]());
  }
  return vorrat;
}
