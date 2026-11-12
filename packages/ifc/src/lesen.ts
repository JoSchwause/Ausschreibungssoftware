// SPDX-License-Identifier: AGPL-3.0-or-later
// IFC lesen (Ticket 98): STEP-Datei prüfen, Kopf und Schema lesen, dann Struktur, Bauteile, Mengen, Eigenschaften,
// Klassifikation und Material aus den Instanzen holen. Rein (A2): Bytes rein, Werte und Befunde raus.

import { befund, kopfLesen, textmodusErmitteln } from './step';
import type { IfcBefund, IfcBefundcode, IfcLesung, IfcOptionen } from './typen';

/** Größte Eingabe in Bytes (500 MiB). */
export const STANDARD_MAX_BYTES = 500 * 1024 * 1024;
/** Größte Verschachtelungstiefe der Parameterlisten einer Instanz; IFC braucht kaum mehr als 4. */
export const STANDARD_MAX_TIEFE = 64;

function abweisen(code: IfcBefundcode, meldung: string, ort: IfcBefund['ort'] = {}): IfcLesung {
  return { modell: null, befunde: [befund('fehler', code, meldung, ort)] };
}

/**
 * Liest eine IFC-Datei (STEP, IFC 2x3 oder IFC 4) ohne Geometrie. Jede Auffälligkeit ist ein Befund, keine sperrt das
 * Lesen (U5); `modell` ist nur `null`, wenn die Datei zu groß, keine IFC-Datei oder in einem anderen Schema ist.
 */
export function ifcLesen(bytes: Uint8Array, optionen: IfcOptionen = {}): IfcLesung {
  const maxTiefe = optionen.maxTiefe ?? STANDARD_MAX_TIEFE;
  const modus = textmodusErmitteln(bytes);
  const kopf = kopfLesen(bytes, modus, maxTiefe);
  if (!kopf.ok) return abweisen('keine-ifc-datei', `Keine IFC-Datei: ${kopf.meldung}`, { zeile: kopf.zeile });
  return { modell: null, befunde: [] };
}
