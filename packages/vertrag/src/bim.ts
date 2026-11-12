// SPDX-License-Identifier: AGPL-3.0-or-later
// Bauwerksmodell (v1.6, Ticket 97 Punkte 1 bis 3; X1, D-50 bis D-53): ein eingelesenes IFC-Modell ohne Geometrie und die
// Zuordnung seiner Bauteile zu Positionen. Nur Typen. Die Datei liest `ifc` (Tickets 98, 107), die Fachlogik
// (Mengenübernahme, Aufmaß aus Auswahl, DIN 277, Kennwerte, Vergleich) liegt in `bim` (Ticket 108), die Geometrie nur in
// `ui-modell` (Ticket 100). Befehle in `befehle.ts`, ChangeSet und Zustand in `changeset.ts`, die Ablage der Bytes in
// `speicher.ts` (`Modelldateiablage`).

import type { BauwerksmodellId, IfcGlobalId, Kostengruppennummer, ProjektId } from './marken';
import type { Menge } from './zahlen';

/**
 * Schema der IFC-Datei laut `FILE_SCHEMA` (v1.6, D-50): IFC 2x3 oder IFC 4. `IFC4` umfasst die Fassungen und Zusätze, die
 * `ifc` als IFC 4 liest (z. B. `IFC4X0_ADD2`, Ticket 98); eine Datei in einem anderen Schema ergibt kein Bauwerksmodell (Fehler
 * beim Lesen). Eine geschlossene Liste: Ein weiteres Schema braucht ein Vertragsticket.
 */
export type IfcSchema = 'IFC2X3' | 'IFC4';

/**
 * Die Datei eines Bauwerksmodells (Glossar „Modelldatei“; v1.6, Ticket 97 Punkt 2, D-51): nur, was das Aggregat über die
 * Bytes weiß. Die Bytes selbst liegen inhaltsadressiert in der `Modelldateiablage` (`Speicher.modelldateien`) und stehen nie
 * im Aggregat, im ChangeSet, im Befehlsprotokoll oder in der Undo-Historie.
 */
export interface Modelldatei {
  /**
   * SHA-256 der **unkomprimierten** Bytes, 64 Hexziffern in Kleinbuchstaben: der Schlüssel der Ablage. `speicher` bildet ihn
   * beim Ablegen (`Modelldateiablage.ablegen` liefert ihn); nie über komprimierten Text (deflate ist zwischen
   * Implementierungen nicht byte-stabil, D-51).
   */
  readonly hash: string;
  /**
   * Name der Datei, wie der Nutzer sie gewählt hat, ohne Pfad (z. B. `haus-v2.ifc`); nur Anzeige, nie Schlüssel. Nicht der
   * Name im Kopf der Datei (`FILE_NAME`), den das erzeugende Programm einträgt.
   */
  readonly dateiname: string;
  /**
   * Größe der unkomprimierten Datei in Bytes, ganze Zahl ≥ 0 (eine Anzahl; N1 gilt nicht). Sie ist die Länge der abgelegten
   * Bytes; weicht sie davon ab, weist `speicher` das Anlegen mit `konflikt` ab. Über etwa 200 MB ist sie ein Befund der App,
   * keine Sperre (D-51).
   */
  readonly groesse: number;
}

/**
 * Bauteilmenge (Glossar; v1.6): eine Menge aus einem Mengensatz (`IfcElementQuantity`) eines Bauteils oder Strukturknotens,
 * wie die Datei sie nennt; nie aus der Geometrie gerechnet.
 *
 * Lesarten (vorläufige Annahme, Entscheidung offen, enge Lesart):
 * - `wert` steht in der SI-Grundeinheit der `art`: m (`laenge`), m² (`flaeche`), m³ (`volumen`), Stück (`anzahl`), kg
 *   (`gewicht`), s (`zeit`). `ifc` liest den Text der Datei exakt, rechnet exakt um und rundet erst dann kaufmännisch auf
 *   3 Stellen (N1, N3, D-53).
 * - Nur Mengen mit Wert: Eine Menge, deren Zahl oder Einheit die Datei nicht hergibt, kommt nicht ins Bauwerksmodell (Befund
 *   beim Lesen, Quelle `ifc-lesen`; nie 0, D-53). Wer sie übernehmen will, bekommt in `bim` den Befund „Menge fehlt“.
 *   Alternative: `wert: Menge | null` (Offene Typfrage, Ticket 97).
 * - Am Bauteil stehen die Mengen des Bauteils und seines Typs; eine Menge des Bauteils ersetzt die gleichnamige desselben
 *   Satzes am Typ (`ifc`, Ticket 98). Derselbe `name` in zwei Sätzen ergibt zwei Bauteilmengen. Reihenfolge wie in der
 *   Datei.
 */
export interface Bauteilmenge {
  /** Name des Mengensatzes (Glossar „Mengensatz“), z. B. `Qto_WallBaseQuantities`; `null`, wenn die Datei keinen nennt. */
  readonly satz: string | null;
  /** Name der Menge, wie er im Modell steht, z. B. `NetVolume`; nicht leer. Auf ihn verweist `Bauteilzuordnung.mengenart`. */
  readonly name: string;
  /** Art nach der IFC-Klasse der Menge (`IfcQuantityLength` … `IfcQuantityTime`); sie bestimmt die Einheit von `wert`. */
  readonly art: 'laenge' | 'flaeche' | 'volumen' | 'anzahl' | 'gewicht' | 'zeit';
  readonly wert: Menge;
}

/**
 * Strukturknoten (Glossar „Bauwerksstruktur / Strukturknoten“; v1.6): Projekt, Grundstück, Gebäude, Geschoss oder Raum des
 * Modells (`IfcProject`, `IfcSite`, `IfcBuilding`, `IfcBuildingStorey`, `IfcSpace`, verbunden über `IfcRelAggregates`).
 */
export interface Strukturknoten {
  readonly globalId: IfcGlobalId;
  readonly art: 'projekt' | 'grundstueck' | 'gebaeude' | 'geschoss' | 'raum';
  /** `Name` der Datei (bei Räumen oft die Raumnummer); `null`: keiner. */
  readonly name: string | null;
  /**
   * GlobalId des Elternknotens, ein Strukturknoten desselben Modells; `null` beim Projekt und bei einem Knoten, dessen Eltern
   * die Datei nicht nennt (Befund beim Lesen). Kein Ring.
   */
  readonly elternGlobalId: IfcGlobalId | null;
  /**
   * Mengen des Knotens, z. B. `Qto_BuildingStoreyBaseQuantities.GrossFloorArea` eines Geschosses oder
   * `Qto_SpaceBaseQuantities.NetFloorArea` eines Raums; aus ihnen rechnet `bim` BGF, BRI und NRF (DIN 277, Ticket 108).
   */
  readonly mengen: readonly Bauteilmenge[];
}

/**
 * Bauteil (Glossar; v1.6, D-50, D-51): ein Produkt des Modells mit GlobalId, das in einem Strukturknoten steht, oder ein Teil
 * eines solchen (Öffnungen, virtuelle Elemente, Beschriftungen und Raster sind keine Bauteile, Ticket 98).
 *
 * Gespeichert werden nur Klasse, Name, Typ, Lage, Kostengruppen-Vorschlag und Mengen. Eigenschaften (Psets),
 * Klassifikationen und Materialien stehen **nicht** im Typ (D-51): Die App liest sie bei Bedarf aus der Modelldatei (`ifc`,
 * Ticket 107), damit ein Modell mit 10.000 Bauteilen klein bleibt (D-54).
 */
export interface Bauteil {
  readonly globalId: IfcGlobalId;
  /** IFC-Klasse, wie sie in der Datei steht (z. B. `IfcWallStandardCase`, nicht auf eine Oberklasse vereinheitlicht). */
  readonly ifcKlasse: string;
  readonly name: string | null;
  /** Name des Typs (`IfcRelDefinesByType`); `null`: keiner. */
  readonly typ: string | null;
  /**
   * GlobalId des enthaltenden Strukturknotens desselben Modells (`IfcRelContainedInSpatialStructure`); ein Teil ohne eigenen
   * Strukturknoten hat den des Ganzen. `null`: keiner (Befund beim Lesen).
   */
  readonly strukturGlobalId: IfcGlobalId | null;
  /**
   * GlobalId des Ganzen, eines Bauteils desselben Modells, wenn dieses Bauteil ein Teil davon ist (`IfcRelAggregates`).
   * Fehlt: kein Teil; nie `null`.
   */
  readonly teilVonGlobalId?: IfcGlobalId;
  /**
   * Kostengruppen-**Vorschlag** (Glossar „Bauteil“): die dreistellige Nummer aus einer DIN-276-Klassifikation der Datei
   * (`ifc`, Ticket 98). Fehlt: keiner; nie `null`. Nur ein Vorschlag, keine Zuordnung: Die Kostengruppe eines Bauteils in LV
   * und Kostenkontrolle ist die seiner Position (D-52).
   */
  readonly kostengruppe?: Kostengruppennummer;
  readonly mengen: readonly Bauteilmenge[];
}

/**
 * Kopf eines Bauwerksmodells (v1.6, Ticket 97 Punkt 1): das Modell ohne Struktur und Bauteile. Ihn tragen die Liste des
 * Projekts (`BauwerksmodellUebersicht`), der Kopf des Massenbefehls im Protokoll und das ChangeSet des Umbenennens.
 */
export interface BauwerksmodellKopf {
  readonly id: BauwerksmodellId;
  readonly projektId: ProjektId;
  /**
   * Name, den der Nutzer vergibt (die App schlägt den Dateinamen ohne Endung vor), nicht leer. Das Einzige, was sich nach dem
   * Anlegen ändert (`BauwerksmodellUmbenennen`).
   */
  readonly name: string;
  readonly datei: Modelldatei;
  readonly schema: IfcSchema;
  /**
   * Der vorige Modellstand derselben Planung (Glossar „Modellstand“, D-53): ein Bauwerksmodell desselben Projekts, nie das
   * Modell selbst; `null`: erster Stand. Fest nach dem Anlegen. Gegen ihn vergleicht die App standardmäßig (Ticket 116).
   * `speicher` weist mit `konflikt` ab, wenn es den Vorgänger im Projekt nicht gibt, und ebenso das Löschen eines Modells,
   * das ein anderes als Vorgänger nennt (vorläufige Annahme, Entscheidung offen, enge Lesart; Offene Typfrage, Ticket 97).
   */
  readonly vorgaengerId: BauwerksmodellId | null;
  /** Tag des Einlesens, `JJJJ-MM-TT`, von der Uhr der App gesetzt (Rand, A2); nur Anzeige und Ordnung der Stände. */
  readonly eingelesen: string;
}

/**
 * Bauwerksmodell (Glossar; v1.6, Ticket 97 Punkt 1, D-50, D-51, D-53): ein eingelesenes IFC-Modell als eigenes Aggregat des
 * Projekts. Befehle führt `bim` aus (Ticket 108), gespeichert wird es von `speicher` (Ticket 106, Kopf getrennt von Struktur
 * und Bauteilen).
 *
 * Lesarten (vorläufige Annahme, Entscheidung offen, enge Lesart):
 * - **Unveränderlich** nach dem Anlegen bis auf `name`. Ein neuer Stand der Datei ist ein neues Bauwerksmodell mit
 *   `vorgaengerId` (D-53); es gibt keinen Befehl, der Struktur oder Bauteile ändert.
 * - `struktur` und `bauteile` stehen in der Reihenfolge der Datei (deterministisch, Ticket 98); Eltern stehen nicht
 *   notwendig vor ihren Kindern. Verweise innerhalb des Modells (`elternGlobalId`, `strukturGlobalId`, `teilVonGlobalId`)
 *   nennen ein Objekt desselben Modells (der Ausführer prüft es, siehe `BauwerksmodellAnlegen`).
 * - **Doppelte GlobalIds** sind zulässig: Beide Objekte bleiben (D-50), nichts wird still verworfen; sie sind ein Befund
 *   beim Lesen und in der Modellprüfung (`bim`, D-53), das dort festlegt, wie Zuordnung und Vergleich mit ihnen umgehen.
 * - Bis zu 10.000 Bauteile (D-54): Darum trägt die Liste nur den Kopf und ein Umbenennen nur den Kopf im ChangeSet.
 */
export interface Bauwerksmodell extends BauwerksmodellKopf {
  readonly struktur: readonly Strukturknoten[];
  readonly bauteile: readonly Bauteil[];
}

/** Was ein Bauwerksmodell aus der Datei trägt (v1.6): Struktur und Bauteile, unveränderlich nach dem Anlegen. */
export type BauwerksmodellInhalt = Pick<Bauwerksmodell, 'struktur' | 'bauteile'>;

// --- Zuordnung Bauteil ↔ Position (v1.6, Ticket 97 Punkt 3; X1c, D-52, D-53) ---------------------------------------

/**
 * Bauteilzuordnung (Glossar; v1.6, Ticket 97 Punkt 3, D-52): ein Bauteil, dessen Menge eine Position übernimmt. Steht an der
 * Position (`Positionsdaten.bauteile`), im Ausschreibungs-LV wie im Auftrags-LV; gesetzt mit `BauteileZuordnen`.
 *
 * Lesarten (vorläufige Annahme, Entscheidung offen, enge Lesart):
 * - Sie nennt **kein Modell**: Sie gilt für jeden Modellstand, in dem ein Bauteil mit dieser GlobalId steht (GlobalIds
 *   bleiben über Stände gleich, D-53). Steht die GlobalId im gewählten Modell nicht, ist das eine hängende Zuordnung: ein
 *   Befund der App bzw. von `bim` (Quelle `modell-pruefung`), keine Sperre und kein Fehler des Kerns (A3: der Kern kennt keine
 *   Modelle).
 * - `mengenart` (Glossar „Mengenart“) ist der Name einer Bauteilmenge, wie er im Modell steht (`Bauteilmenge.name`, z. B.
 *   `NetVolume`), oder fest `'Stueck'`: dann zählt jedes Bauteil 1, auch wenn ein Modell eine Menge dieses Namens hätte.
 *   Nicht leer. Den Mengensatz nennt sie nicht: Trägt das Bauteil den Namen in zwei Sätzen, ist die Mengenart mehrdeutig
 *   (Befund in `bim`, nie eine Wahl nach Gutdünken). Alternative: `satz` in der Zuordnung (Offene Typfrage, Ticket 97).
 */
export interface Bauteilzuordnung {
  readonly globalId: IfcGlobalId;
  readonly mengenart: string;
}
