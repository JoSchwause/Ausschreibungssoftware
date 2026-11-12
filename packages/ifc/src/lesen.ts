// SPDX-License-Identifier: AGPL-3.0-or-later
// IFC lesen (Ticket 98): STEP-Datei prüfen, Kopf und Schema lesen, dann Struktur, Bauteile, Mengen, Eigenschaften,
// Klassifikation und Material aus den Instanzen holen. Rein (A2): Bytes rein, Werte und Befunde raus.

import { bauteileLesen } from './bauteile';
import { Definitionen } from './definitionen';
import { Eigenschaftenleser } from './eigenschaften';
import { Einheiten } from './einheiten';
import { Mengenleser } from './mengen';
import { Modellleser, strukturLesen, zerlegungLesen } from './modell';
import { befund, datenLesen, kopfLesen, textmodusErmitteln } from './step';
import type { StepKopf } from './step';
import type { IfcBefund, IfcBefundcode, IfcKopf, IfcLesung, IfcOptionen, IfcSchema } from './typen';
import { liste, text, texte } from './werte';

/** Größte Eingabe in Bytes (500 MiB). */
export const STANDARD_MAX_BYTES = 500 * 1024 * 1024;
/** Größte Verschachtelungstiefe der Parameterlisten einer Instanz; IFC braucht kaum mehr als 4. */
export const STANDARD_MAX_TIEFE = 64;

function abweisen(code: IfcBefundcode, meldung: string, ort: IfcBefund['ort'] = {}): IfcLesung {
  return { modell: null, befunde: [befund('fehler', code, meldung, ort)] };
}

/** Schema aus der Kennung in `FILE_SCHEMA` (Ticket 98, Punkt 1); `null` für jedes andere Schema. */
function schemaErkennen(kennung: string): IfcSchema | null {
  const name = kennung.trim().toUpperCase().split(/[\s{]/)[0] ?? '';
  if (/^IFC2X3(_|$)/.test(name)) return 'IFC2X3';
  if (/^IFC4(X0)?(_|$)/.test(name)) return 'IFC4';
  return null;
}

function kopfAngaben(kopf: StepKopf, schemakennung: string): IfcKopf {
  const beschreibung = kopf.get('FILE_DESCRIPTION') ?? [];
  const datei = kopf.get('FILE_NAME') ?? [];
  return {
    beschreibung: texte(beschreibung[0]),
    name: text(datei[0]),
    zeitstempel: text(datei[1]),
    autoren: texte(datei[2]),
    organisationen: texte(datei[3]),
    praeprozessor: text(datei[4]),
    erzeugendesSystem: text(datei[5]),
    autorisierung: text(datei[6]),
    schemakennung,
  };
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
  const schemaEintrag = kopf.kopf.get('FILE_SCHEMA');
  if (schemaEintrag === undefined)
    return abweisen('keine-ifc-datei', 'Keine IFC-Datei: Der Kopf nennt kein FILE_SCHEMA.');
  const schemakennung = liste(schemaEintrag[0])
    .map((w) => (w.art === 'text' ? w.wert : ''))
    .join(',');
  const schema = schemaErkennen(schemakennung);
  if (schema === null)
    return abweisen(
      'schema-nicht-unterstuetzt',
      schemakennung.trim() === ''
        ? 'FILE_SCHEMA nennt kein Schema; gelesen werden IFC 2x3 und IFC 4.'
        : `Das Schema „${schemakennung}“ wird nicht gelesen; gelesen werden IFC 2x3 und IFC 4.`,
    );
  const befunde: IfcBefund[] = [];
  const daten = datenLesen(bytes, kopf, modus, maxTiefe, befunde);
  if (daten === null) return abweisen('keine-ifc-datei', 'Keine IFC-Datei: Der Abschnitt „DATA;“ fehlt.');
  const leser = new Modellleser(daten, befunde);
  const einheiten = new Einheiten(leser);
  const ganzes = zerlegungLesen(leser);
  const definitionen = new Definitionen(leser);
  const mengenleser = new Mengenleser(leser, einheiten, definitionen);
  const eigenschaftenleser = new Eigenschaftenleser(leser, definitionen);
  const mengen = (i: number) => mengenleser.mengen(i);
  const struktur = strukturLesen(leser, ganzes, mengen);
  const bauteile = bauteileLesen(leser, ganzes, {
    mengen,
    eigenschaften: (i) => eigenschaftenleser.eigenschaften(i),
    typname: (i) => {
      const typ = definitionen.typ(i);
      return typ === undefined ? null : leser.name(typ);
    },
  });
  return {
    modell: { schema, kopf: kopfAngaben(kopf.kopf, schemakennung), struktur, bauteile },
    befunde,
  };
}
