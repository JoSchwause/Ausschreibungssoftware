// SPDX-License-Identifier: AGPL-3.0-or-later
// IFC lesen (Ticket 98): STEP-Datei prüfen, Kopf und Schema lesen, dann Struktur, Bauteile, Mengen, Eigenschaften,
// Klassifikation und Material aus den Instanzen holen. Rein (A2): Bytes rein, Werte und Befunde raus.

import { bauteileLesen } from './bauteile';
import type { GelesenesBauteil } from './bauteile';
import { Definitionen } from './definitionen';
import { Eigenschaftenleser } from './eigenschaften';
import { Einheiten } from './einheiten';
import { Klassifikationsleser } from './klassifikation';
import { Materialleser } from './material';
import { Mengenleser } from './mengen';
import { Modellleser, strukturLesen, zerlegungLesen } from './modell';
import type { GelesenerKnoten } from './modell';
import { befund, datenLesen, kopfLesen, textmodusErmitteln } from './step';
import type { StepDaten, StepKopf } from './step';
import type { IfcSchema } from '@tethys/vertrag';
import type { IfcBefund, IfcBefundcode, IfcKopf, IfcLesung, IfcOptionen } from './typen';
import { liste, text, texte } from './werte';

/** Größte Eingabe in Bytes (500 MiB). */
export const STANDARD_MAX_BYTES = 500 * 1024 * 1024;
/** Größte Verschachtelungstiefe der Parameterlisten einer Instanz; IFC braucht kaum mehr als 4. */
export const STANDARD_MAX_TIEFE = 64;

/**
 * Die geöffnete Datei: Schema, Kopf und der Lauf über `DATA` mit den Befunden bis dahin; oder der eine Befund, mit dem sie
 * abgewiesen wird (zu groß, keine IFC-Datei, anderes Schema).
 */
export type GeoeffneteDatei =
  | { readonly ok: false; readonly befund: IfcBefund }
  | {
      readonly ok: true;
      readonly schema: IfcSchema;
      readonly kopf: IfcKopf;
      readonly daten: StepDaten;
      readonly befunde: IfcBefund[];
    };

function abweisen(code: IfcBefundcode, meldung: string, ort: IfcBefund['ort'] = {}): GeoeffneteDatei {
  return { ok: false, befund: befund('fehler', code, meldung, ort) };
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

/** Prüft Größe, Kopf und Schema und läuft einmal über den Abschnitt `DATA` (Ticket 98, Punkt 1). */
export function dateiOeffnen(bytes: Uint8Array, optionen: IfcOptionen = {}): GeoeffneteDatei {
  const maxBytes = optionen.maxBytes ?? STANDARD_MAX_BYTES;
  const maxTiefe = optionen.maxTiefe ?? STANDARD_MAX_TIEFE;
  if (bytes.length > maxBytes)
    return abweisen(
      'eingabe-zu-gross',
      `Die Datei hat ${String(bytes.length)} Bytes; gelesen werden höchstens ${String(maxBytes)} Bytes.`,
    );
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
  if (modus !== 'ascii')
    befunde.push(
      befund(
        'warnung',
        modus === 'utf8' ? 'kodierung-utf8' : 'kodierung-latin1',
        modus === 'utf8'
          ? 'Die Datei enthält Zeichen außerhalb von ASCII und wird als UTF-8 gelesen (die Norm verlangt ASCII).'
          : 'Die Datei enthält Zeichen außerhalb von ASCII und ist kein gültiges UTF-8; sie wird als Latin-1 gelesen.',
      ),
    );
  const daten = datenLesen(bytes, kopf, modus, maxTiefe, befunde);
  if (daten === null) return abweisen('keine-ifc-datei', 'Keine IFC-Datei: Der Abschnitt „DATA;“ fehlt.');
  return { ok: true, schema, kopf: kopfAngaben(kopf.kopf, schemakennung), daten, befunde };
}

/**
 * Der gelesene Inhalt mit den Instanzen der Datei, aus denen er stammt; daraus bildet `bauwerksmodell.ts` das Modell des
 * Vertrags ab (Ticket 107).
 */
export interface GelesenerInhalt {
  readonly leser: Modellleser;
  readonly mengen: Mengenleser;
  readonly struktur: readonly GelesenerKnoten[];
  readonly bauteile: readonly GelesenesBauteil[];
}

/**
 * Liest Struktur und Bauteile der geöffneten Datei. Umfang `vollstaendig` (Ticket 98) liest alles; `modell` (Ticket 107)
 * nur, was das Bauwerksmodell des Vertrags trägt: keine Eigenschaften und Materialien (D-51, bei Bedarf über den
 * Eigenschaftsindex), Klassifikationen nur für den Kostengruppen-Vorschlag.
 */
export function inhaltLesen(
  datei: Extract<GeoeffneteDatei, { ok: true }>,
  umfang: 'vollstaendig' | 'modell',
): GelesenerInhalt {
  const vollstaendig = umfang === 'vollstaendig';
  const leser = new Modellleser(datei.daten, datei.befunde, !vollstaendig);
  const einheiten = new Einheiten(leser);
  const ganzes = zerlegungLesen(leser);
  const definitionen = new Definitionen(leser);
  const mengenleser = new Mengenleser(leser, einheiten, definitionen);
  const eigenschaftenleser = new Eigenschaftenleser(leser, definitionen);
  const klassifikationsleser = new Klassifikationsleser(leser);
  const materialleser = new Materialleser(leser);
  const mengen = (i: number) => mengenleser.mengen(i);
  const struktur = strukturLesen(leser, ganzes, mengen);
  const bauteile = bauteileLesen(leser, ganzes, {
    mengen,
    eigenschaften: (i) => (vollstaendig ? eigenschaftenleser.eigenschaften(i) : []),
    klassifikationen: (i) => klassifikationsleser.klassifikationen(i, definitionen.typ(i)),
    materialien: (i) => (vollstaendig ? materialleser.materialien(i, definitionen.typ(i)) : []),
    typname: (i) => {
      const typ = definitionen.typ(i);
      return typ === undefined ? null : leser.name(typ);
    },
  });
  return { leser, mengen: mengenleser, struktur, bauteile };
}

/**
 * Liest eine IFC-Datei (STEP, IFC 2x3 oder IFC 4) ohne Geometrie. Jede Auffälligkeit ist ein Befund, keine sperrt das
 * Lesen (U5); `modell` ist nur `null`, wenn die Datei zu groß, keine IFC-Datei oder in einem anderen Schema ist.
 */
export function ifcLesen(bytes: Uint8Array, optionen: IfcOptionen = {}): IfcLesung {
  const datei = dateiOeffnen(bytes, optionen);
  if (!datei.ok) return { modell: null, befunde: [datei.befund] };
  const inhalt = inhaltLesen(datei, 'vollstaendig');
  return {
    modell: {
      schema: datei.schema,
      kopf: datei.kopf,
      struktur: inhalt.struktur.map((k) => k.knoten),
      bauteile: inhalt.bauteile.map((b) => b.bauteil),
    },
    befunde: datei.befunde,
  };
}
