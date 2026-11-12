// SPDX-License-Identifier: AGPL-3.0-or-later
// Kleine Baumhilfen für Leistungsstand und Soll/Ist: Dokumentreihenfolge eines Auftrags-LV, gebaut aus den Baumhilfen des
// Kerns (`kinderJeEltern`, `dokumentreihenfolge`; Review Welle 5, S9).

import { dokumentreihenfolge as vorordnung, kinderJeEltern } from '@tethys/kern';
import type { Knoten } from '@tethys/vertrag';

/**
 * Die Knoten unter `wurzel` in Dokumentreihenfolge (Vorordnung: Eltern vor Kindern, Geschwister nach `reihenfolge`).
 * Knoten, die von der Wurzel nicht erreichbar sind, fehlen (ein gültiges Auftrags-LV hat keine).
 */
export const dokumentreihenfolge = (wurzel: string, knoten: readonly Knoten[]): Knoten[] =>
  vorordnung(wurzel, kinderJeEltern(knoten));
