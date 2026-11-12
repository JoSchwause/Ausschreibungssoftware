// SPDX-License-Identifier: AGPL-3.0-or-later
// Typen des Lesers (Ticket 98): das Leseergebnis einer IFC-Datei, ohne Geometrie, in der Form der Vertragstypen v1.6 mit
// allem, was die Datei sagt. Seit Ticket 107 innen: Nach außen gibt das Paket das `Bauwerksmodell` des Vertrags
// (`bauwerksmodell.ts`) und die Angaben bei Bedarf (`eigenschaftsindex.ts`); öffentlich sind hier nur `Eigenschaft`,
// `Klassifikation`, `IfcBefundcode` und `IfcOptionen` (`index.ts`). Alle Werte sind reine, serialisierbare Daten in der
// Reihenfolge der Datei. Die Typen der STEP-Ebene heißen `Step…` (Ticket 122, L1/L2): Ihre Form weicht vom Vertragstyp gleichen
// Stamms ab (etwa Mengen ohne Wert, GlobalIds nicht in Form), ein Name meint so nie zwei Typen. Das Schema der Datei ist
// `IfcSchema` aus `vertrag`: `IFC4` umfasst `IFC4` und `IFC4X0` samt Zusätzen (`IFC4_ADD2`, `IFC4X0_ADD2`), `IFC2X3` auch mit
// Zusatz (`IFC2X3_TC1`); IFC 4.1 bis 4.3 (`IFC4X1` …) und alle anderen Schemata liest das Paket nicht.

import type { Befundort, Befundschwere, IfcSchema, Kostengruppennummer, Menge } from '@tethys/vertrag';

/**
 * GlobalId (Glossar) als Text der Datei. Die Form (22 Zeichen aus `0-9A-Za-z_$`) prüft der Leser und meldet Abweichungen
 * als Befund; der Wert bleibt, wie er in der Datei steht (`''`, wenn sie fehlt). Die Marke gleichen Namens aus `vertrag`
 * v1.6 trägt nur GlobalIds in Form; ein Objekt ohne sie fällt bei der Abbildung weg (Ticket 107).
 */
export type StepGlobalId = string;

/** Kopf der Datei (`HEADER`): `FILE_DESCRIPTION`, `FILE_NAME`, `FILE_SCHEMA`, wie sie in der Datei stehen. */
export interface IfcKopf {
  /** `FILE_DESCRIPTION.description`, z. B. `ViewDefinition [CoordinationView_V2.0]`. */
  readonly beschreibung: readonly string[];
  /** `FILE_NAME.name`: der Name, den das erzeugende Programm eingetragen hat, nicht der Name der Datei im Dateisystem. */
  readonly name: string | null;
  /** `FILE_NAME.time_stamp` als Text (ISO 8601, ungeprüft). */
  readonly zeitstempel: string | null;
  /** `FILE_NAME.author`. */
  readonly autoren: readonly string[];
  /** `FILE_NAME.organization`. */
  readonly organisationen: readonly string[];
  /** `FILE_NAME.preprocessor_version`. */
  readonly praeprozessor: string | null;
  /** `FILE_NAME.originating_system`, z. B. das Autorenwerkzeug. */
  readonly erzeugendesSystem: string | null;
  /** `FILE_NAME.authorization`. */
  readonly autorisierung: string | null;
  /** `FILE_SCHEMA`, wie in der Datei (z. B. `IFC4X0_ADD2`); das gelesene Schema steht in `Bauwerksmodell.schema`. */
  readonly schemakennung: string;
}

/**
 * Bauteilmenge (Glossar), wie die Datei sie liefert: eine Menge aus einem Mengensatz (`IfcElementQuantity`) eines Bauteils oder
 * Strukturknotens, auch ohne Wert (anders als `Bauteilmenge` des Vertrags).
 */
export interface StepBauteilmenge {
  /** Name des Mengensatzes (Glossar), z. B. `Qto_WallBaseQuantities`; `null`, wenn die Datei keinen nennt. */
  readonly satz: string | null;
  /** Name der Menge, wie er im Modell steht, z. B. `NetVolume`. */
  readonly name: string;
  /** Art nach der IFC-Klasse: `IfcQuantityLength` … `IfcQuantityTime`. */
  readonly art: 'laenge' | 'flaeche' | 'volumen' | 'anzahl' | 'gewicht' | 'zeit';
  /**
   * Wert in der SI-Grundeinheit (m, m², m³, Stück, kg, s): der Text der Datei exakt als Dezimalwert, exakt umgerechnet und
   * erst am Ende kaufmännisch auf 3 Stellen gerundet (G-21). `null` mit Befund, wenn die Einheit oder die Zahl fehlt oder
   * nicht lesbar ist, nie 0. `vertrag` v1.6 kennt nur Mengen mit Wert: Die Abbildung lässt sie mit Befund weg (Ticket 107).
   */
  readonly wert: Menge | null;
}

/** Strukturknoten (Glossar), wie die Datei ihn liefert: Projekt, Grundstück, Gebäude, Geschoss oder Raum. */
export interface StepStrukturknoten {
  readonly globalId: StepGlobalId;
  /** Nach der IFC-Klasse: `IfcProject`, `IfcSite`, `IfcBuilding`, `IfcBuildingStorey`, `IfcSpace`. */
  readonly art: 'projekt' | 'grundstueck' | 'gebaeude' | 'geschoss' | 'raum';
  /** `Name` der Datei (bei Räumen oft die Raumnummer). */
  readonly name: string | null;
  /** GlobalId des Elternknotens (`IfcRelAggregates`); `null` beim Projekt und bei einem Knoten ohne Eltern (Befund). */
  readonly elternGlobalId: StepGlobalId | null;
  /** Mengen des Knotens, z. B. `Qto_BuildingStoreyBaseQuantities.GrossFloorArea`. */
  readonly mengen: readonly StepBauteilmenge[];
}

/** Eigenschaft (Glossar „Eigenschaftssatz“): `IfcPropertySingleValue` oder `IfcPropertyEnumeratedValue`. */
export interface Eigenschaft {
  /** Name des Eigenschaftssatzes, z. B. `Pset_WallCommon`; `null`, wenn die Datei keinen nennt. */
  readonly satz: string | null;
  readonly name: string;
  /**
   * Werte als Text mit IFC-Typname, z. B. `{ typ: 'IfcBoolean', text: 'TRUE' }`, `{ typ: 'IfcLengthMeasure', text:
   * '0.24' }` (Zahlen exakt als Dezimaltext, ohne Umrechnung). Ein Einzelwert hat höchstens einen Eintrag, eine Aufzählung
   * beliebig viele; kein Eintrag, wenn die Datei keinen Wert nennt.
   */
  readonly werte: readonly { readonly typ: string; readonly text: string }[];
}

/** Klassifikation eines Bauteils (`IfcClassificationReference`), wie sie in der Datei steht. */
export interface Klassifikation {
  /** Name der Klassifikation (`IfcClassification.Name`), z. B. `DIN 276`. */
  readonly system: string | null;
  /** IFC 2x3 `ItemReference`, IFC 4 `Identification`, z. B. `331`. */
  readonly kennung: string | null;
  /** `Name` der Referenz, z. B. `Tragende Außenwände`. */
  readonly name: string | null;
}

/** Bauteil (Glossar), wie die Datei es liefert, mit Eigenschaften, Klassifikationen und Materialien. */
export interface StepBauteil {
  readonly globalId: StepGlobalId;
  /** IFC-Klasse, wie sie in der Datei steht (nicht auf eine Oberklasse vereinheitlicht), z. B. `IfcWallStandardCase`. */
  readonly ifcKlasse: string;
  readonly name: string | null;
  /** Name des Typs (`IfcRelDefinesByType`). */
  readonly typ: string | null;
  /** GlobalId des enthaltenden Strukturknotens; ein Teil ohne eigenen Strukturknoten erbt den des Ganzen. */
  readonly strukturGlobalId: StepGlobalId | null;
  /** GlobalId des Ganzen, wenn das Bauteil ein Teil ist (`IfcRelAggregates`). */
  readonly teilVonGlobalId: StepGlobalId | null;
  /**
   * Kostengruppen-Vorschlag (Glossar „Bauteil“): die Kennung der ersten Klassifikation mit „276“ im Namen des Systems,
   * die eine dreistellige Nummer ist. Nur ein Vorschlag, keine Zuordnung.
   */
  readonly kostengruppe: Kostengruppennummer | null;
  /** Mengen des Bauteils und seines Typs; die Menge am Bauteil überschreibt die gleichnamige desselben Satzes am Typ. */
  readonly mengen: readonly StepBauteilmenge[];
  /** Eigenschaften, getrennt von den Mengen; sie werden nicht gespeichert (D-51). Überschreiben wie bei den Mengen. */
  readonly eigenschaften: readonly Eigenschaft[];
  readonly klassifikationen: readonly Klassifikation[];
  /** Materialnamen (`IfcMaterial.Name`), ohne Wiederholung; die des Typs nur, wenn das Bauteil selbst keine nennt. */
  readonly materialien: readonly string[];
}

/**
 * Bauwerksmodell (Glossar), wie die Datei es liefert. Kennung, Projekt, Name, Modelldatei, Vorgänger und Datum des
 * Einlesens setzt die App beim Anlegen (`vertrag` v1.6, Ticket 107).
 */
export interface StepBauwerksmodell {
  readonly schema: IfcSchema;
  readonly kopf: IfcKopf;
  /** Strukturknoten in der Reihenfolge der Datei. */
  readonly struktur: readonly StepStrukturknoten[];
  /** Bauteile in der Reihenfolge der Datei. */
  readonly bauteile: readonly StepBauteil[];
}

export type IfcBefundcode =
  // Die Datei wird nicht gelesen (`modell` ist `null`):
  | 'eingabe-zu-gross'
  | 'keine-ifc-datei'
  | 'schema-nicht-unterstuetzt'
  // STEP: die Datei wird gelesen, betroffene Instanzen fallen weg (U5):
  | 'kodierung-utf8'
  | 'kodierung-latin1'
  | 'datei-unvollstaendig'
  | 'step-syntaxfehler'
  | 'step-zu-tief'
  | 'instanz-doppelt'
  | 'zeichenkette-ungueltig'
  | 'verweis-fehlt'
  // Bauwerksstruktur und Bauteile:
  | 'strukturknoten-ohne-eltern'
  | 'bauteil-mehrfach-enthalten'
  | 'bauteil-ohne-strukturknoten'
  | 'bauteil-ohne-mengen'
  // Einheiten und Mengen:
  | 'projekt-fehlt'
  | 'einheit-fehlt'
  | 'einheit-ungueltig'
  | 'einheit-umgerechnet'
  | 'menge-ungueltig'
  | 'menge-nicht-gelesen'
  | 'eigenschaft-nicht-gelesen'
  // Klassifikation:
  | 'klassifikation-nicht-gelesen'
  | 'kostengruppe-mehrdeutig'
  // GlobalId der Strukturknoten und Bauteile:
  | 'globalid-ungueltig'
  | 'globalid-doppelt'
  // Abbildung auf den Vertrag (Ticket 107): was dabei wegfällt oder umgelenkt wird, nie still.
  | 'menge-ohne-wert'
  | 'bauteil-ohne-ganzes'
  | 'verweis-mehrdeutig'
  | 'strukturknoten-ring'
  | 'bauteil-ring';

/**
 * Befund beim Lesen einer IFC-Datei. Gleicher Aufbau wie `Pruefbefund` aus `vertrag`, aber ohne `quelle` (die Quelle für
 * IFC bringt v1.6). `ort.pfad` nennt die Instanz der Datei (`#123`), `ort.zeile` ihre Zeile, `ort.feld` das Attribut.
 */
export interface IfcBefund {
  readonly schwere: Befundschwere;
  readonly code: IfcBefundcode;
  readonly meldung: string;
  readonly ort: Befundort;
}

/** Ergebnis von `ifcLesen`. `modell` ist `null`, wenn die Datei nicht gelesen werden konnte (dann genau ein Befund). */
export interface IfcLesung {
  readonly modell: StepBauwerksmodell | null;
  readonly befunde: readonly IfcBefund[];
}

export interface IfcOptionen {
  /** Größte Eingabe in Bytes. Voreinstellung `STANDARD_MAX_BYTES`. */
  readonly maxBytes?: number;
  /** Größte Verschachtelungstiefe der Parameterlisten einer Instanz. Voreinstellung `STANDARD_MAX_TIEFE`. */
  readonly maxTiefe?: number;
}
