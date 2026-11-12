// SPDX-License-Identifier: AGPL-3.0-or-later
// Bauleitung (v1.6, Ticket 97 Punkt 6; X4, D-57): Mängel und Bautagebuch als kleine Einzelaggregate des Projekts. Nur Typen.
// Befehle führt `bauleitung` aus (Ticket 111), Befehle in `befehle.ts`, ChangeSets und Zustände in `changeset.ts`. Keine
// Fotos in v1.6 (D-57).

import type {
  AuftragsLeistungsverzeichnisId,
  BautagebucheintragId,
  BauwerksmodellId,
  IfcGlobalId,
  MangelId,
  PositionId,
  ProjektId,
} from './marken';

/**
 * Stand eines Mangels (Glossar „Mangelstatus“; v1.6, D-57). Zulässige Wechsel (Lesart, vorläufige Annahme, Entscheidung
 * offen; die Tabelle steht in `bauleitung`, Ticket 111): `offen` → `angezeigt` → `beseitigt` → `abgenommen` und `beseitigt`
 * → `offen` (die Beseitigung wird nicht anerkannt). Jeder andere Wechsel, auch zum selben Status, wird mit
 * `statuswechsel-unzulaessig` abgewiesen; `abgenommen` ist endgültig. Ein weiterer Status oder Wechsel braucht einen Grund
 * und ein Vertragsticket (Alternativen: Offene Typfragen, Ticket 97).
 */
export type Mangelstatus = 'offen' | 'angezeigt' | 'beseitigt' | 'abgenommen';

/** Ein Eintrag des Mängelverlaufs (Glossar „Mängelverlauf“; v1.6): ein Statuswechsel mit Datum und wahlweise Bemerkung. */
export interface Mangelverlaufseintrag {
  readonly status: Mangelstatus;
  /** Tag des Wechsels, `JJJJ-MM-TT`, vom Nutzer (keine Uhr, A2). */
  readonly datum: string;
  /** Freier Text, z. B. „Nachbesserung unzureichend“; `null`: keine. Nie `''`. */
  readonly bemerkung: string | null;
}

/**
 * Mangel (Glossar; v1.6, Ticket 97 Punkt 6, D-57): ein festgestellter Ausführungsmangel als eigenes Aggregat des Projekts.
 *
 * Lesarten (vorläufige Annahme, Entscheidung offen, enge Lesart):
 * - Der **Verlauf ist die Quelle des Status**: Der Status eines Mangels ist der seines letzten Verlaufseintrags; es gibt kein
 *   eigenes Feld dafür. Der Verlauf hat mindestens einen Eintrag, der erste ist `offen`, jeder weitere ein zulässiger Wechsel
 *   (siehe `Mangelstatus`); die Daten fallen nicht und liegen nicht vor `festgestellt`. Ein Statuswechsel hängt einen
 *   Eintrag an (`MangelstatusSetzen`), nichts wird überschrieben.
 * - **Überfällig** ist nichts Gespeichertes, sondern ein Befund der Fristprüfung zu einem Stichtag, den die App übergibt (A2;
 *   Quelle `fristpruefung`, Glossar „Fristprüfung“).
 * - Verweise: `auftragsLvId` nennt ein Auftrags-LV desselben Projekts (und damit den Auftragnehmer); `speicher` weist eine
 *   Kennung ohne Auftrags-LV mit `konflikt` ab und ebenso das Entfernen eines Auftrags-LV, auf das ein Mangel verweist (wie
 *   bei Aufmaßblättern, Q5). `bauteil.bauwerksmodellId` hält `speicher` genauso (das Löschen eines Modells, auf das ein Mangel
 *   verweist: `konflikt`). `positionId` ist ein schwacher Verweis: Eine Position, die es im Auftrags-LV nicht (mehr) gibt,
 *   ist ein Befund der App, keine Sperre.
 */
export interface Mangel {
  readonly id: MangelId;
  readonly projektId: ProjektId;
  /**
   * Laufende Nummer, ganze Zahl ≥ 1, je Projekt eindeutig (D-57); fest nach dem Anlegen (wie die Blattnummer, D-70.9). Der
   * Ausführer prüft die Eindeutigkeit gegen den Bestand (`ungueltige-eingabe` mit `feld: 'nummer'`), `speicher` hält sie
   * (`konflikt`); die App schlägt die höchste + 1 vor (`naechsteMangelnummer`, Ticket 111).
   */
  readonly nummer: number;
  /** Kurzer Titel, nicht leer. */
  readonly titel: string;
  /** Beschreibung, freier Text; `null`: keine. Nie `''`. */
  readonly beschreibung: string | null;
  /** Ort als freier Text (z. B. „EG, Raum 0.01, Nordwand“); `null`: keiner. Nie `''`. Plan-Pinning gibt es in v1.6 nicht. */
  readonly ort: string | null;
  /** Das Auftrags-LV, dessen Leistung mangelhaft ist (damit sein Auftragnehmer); `null`: keines. */
  readonly auftragsLvId: AuftragsLeistungsverzeichnisId | null;
  /** Eine Position dieses Auftrags-LV; nur mit `auftragsLvId` (sonst `ungueltige-eingabe`, `feld: 'positionId'`). */
  readonly positionId: PositionId | null;
  /**
   * Das betroffene Bauteil über seine GlobalId; `bauwerksmodellId: null` heißt: in jedem Modellstand, in dem es steht
   * (GlobalIds bleiben über Stände gleich, D-53); gesetzt: in genau diesem Modell. `null`: kein Bauteil.
   */
  readonly bauteil: {
    readonly bauwerksmodellId: BauwerksmodellId | null;
    readonly globalId: IfcGlobalId;
  } | null;
  /** Tag der Feststellung, `JJJJ-MM-TT`. */
  readonly festgestellt: string;
  /** Frist zur Beseitigung, `JJJJ-MM-TT`; `null`: keine. Eine Frist am Stichtag ist nicht überfällig (Ticket 111). */
  readonly frist: string | null;
  /** Der Mängelverlauf, ältester Eintrag zuerst, mindestens einer. */
  readonly verlauf: readonly Mangelverlaufseintrag[];
}

/**
 * Bautagebucheintrag (Glossar; v1.6, Ticket 97 Punkt 6, D-57): der Eintrag zu einem Tag eines Projekts, eigenes Aggregat.
 * Temperaturen in ganzen Grad Celsius und Köpfe sind ganze Zahlen, keine Mengen oder Beträge (N1 gilt nicht).
 *
 * Lesarten (vorläufige Annahme, Entscheidung offen, enge Lesart; der Ausführer prüft die Form, `ungueltige-eingabe` mit
 * `feld`): höchstens ein Eintrag je Projekt und Datum (der Ausführer prüft gegen den Bestand, `speicher` hält es mit
 * `konflikt`); Temperaturen ganze Zahlen, `temperaturMin` ≤ `temperaturMax`, wenn beide gesetzt sind; je Firma höchstens
 * eine Zeile, `firma` nicht leer, `anzahl` ganze Zahl ≥ 0; Texte `null` statt `''`. Keine Fotos in v1.6.
 */
export interface Bautagebucheintrag {
  readonly id: BautagebucheintragId;
  readonly projektId: ProjektId;
  /** Der Tag, `JJJJ-MM-TT`, je Projekt eindeutig. */
  readonly datum: string;
  readonly wetter: {
    /** Freier Text, z. B. „sonnig, trocken“; `null`: keine Angabe. */
    readonly beschreibung: string | null;
    /** Tiefste Temperatur des Tages in ganzen Grad Celsius; `null`: keine Angabe. */
    readonly temperaturMin: number | null;
    /** Höchste Temperatur des Tages in ganzen Grad Celsius; `null`: keine Angabe. */
    readonly temperaturMax: number | null;
  };
  /** Arbeitskräfte je Firma in der Reihenfolge der Eingabe; `[]`: keine Angabe. */
  readonly arbeitskraefte: readonly { readonly firma: string; readonly anzahl: number }[];
  /** Eingesetzte Geräte als Text; `null`: keine Angabe. */
  readonly geraete: string | null;
  /** Ausgeführte Leistungen; `null`: keine Angabe. */
  readonly leistungen: string | null;
  /** Behinderungen (etwa nach VOB/B § 6 angezeigt); `null`: keine. */
  readonly behinderungen: string | null;
  /** Besondere Vorkommnisse, Abnahmen, Besuche; `null`: keine. */
  readonly vorkommnisse: string | null;
}
