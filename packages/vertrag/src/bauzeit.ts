// SPDX-License-Identifier: AGPL-3.0-or-later
// Bauzeitenplan (v1.6, Ticket 97 Punkt 4; X2, D-57): gespeicherte Eingaben und das gerechnete Ergebnis der Terminrechnung.
// Nur Typen. Die Terminrechnung liefert `bauzeit` (Tickets 102, 109); die App und `ausgabe` lesen das Ergebnis, deshalb
// steht es im Vertrag. Befehle in `befehle.ts`, ChangeSet und Zustand in `changeset.ts`. Die Formen folgen dem Paket
// `bauzeit` (D-102.12), dessen Eingabetypen diese Typen zuweisbar sind.

import type {
  AuftragsLeistungsverzeichnisId,
  BauzeitenplanId,
  GliederungId,
  LeistungsverzeichnisId,
  PositionId,
  ProjektId,
  VorgangId,
} from './marken';
import type { Pruefbefund } from './gaeb';
import type { Prozent } from './zahlen';

/** ISO-Wochentag (ISO 8601): 1 = Montag … 7 = Sonntag (Glossar „Arbeitskalender“). Eine Nummer, kein Betrag (N1 gilt nicht). */
export type Wochentag = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Bundesland als Kürzel nach ISO 3166-2:DE ohne das Länderpräfix `DE-` (Glossar „Arbeitskalender“; D-57, D-102.3): bestimmt
 * die landesweiten Feiertage, die `bauzeit` aus Regeln rechnet. Eine geschlossene Liste der 16 Länder.
 */
export type Bundesland =
  | 'BW'
  | 'BY'
  | 'BE'
  | 'BB'
  | 'HB'
  | 'HH'
  | 'HE'
  | 'MV'
  | 'NI'
  | 'NW'
  | 'RP'
  | 'SL'
  | 'SN'
  | 'ST'
  | 'SH'
  | 'TH';

/**
 * Arbeitskalender eines Bauzeitenplans (Glossar; v1.6, D-57): Arbeitstage der Woche, Bundesland für die gesetzlichen
 * Feiertage und freie Tage des Plans. Ein Tag ist Arbeitstag, wenn sein Wochentag in `arbeitstage` steht und er weder Feiertag
 * noch freier Tag ist. Feiertage stehen nie hier: `bauzeit` rechnet sie rein aus Regeln (Osterformel, Land); nur regionale
 * und einmalige Feiertage trägt der Nutzer als freie Tage ein (D-57).
 *
 * Lesarten (vorläufige Annahme, Entscheidung offen, enge Lesart; der Ausführer prüft die Form):
 * - `arbeitstage` nicht leer, aufsteigend, jeder Tag höchstens einmal (Standard Montag bis Freitag: `[1, 2, 3, 4, 5]`).
 * - `bundesland` `null`: nur die bundesweiten Feiertage.
 * - `freieTage` gültige Daten `JJJJ-MM-TT`, aufsteigend, jeder höchstens einmal. Der Ausführer ordnet beide Listen und weist
 *   Doppelte mit `ungueltige-eingabe` ab.
 */
export interface Arbeitskalender {
  readonly arbeitstage: readonly Wochentag[];
  readonly bundesland: Bundesland | null;
  readonly freieTage: readonly string[];
}

/**
 * Art einer Anordnungsbeziehung (Glossar „Anordnungsbeziehung“; v1.6, D-57). Wie der Abstand je Art zählt, steht in
 * `BAUZEIT_ANNAHMEN` (Paket `bauzeit`).
 */
export type Anordnungsart = 'ende-anfang' | 'anfang-anfang' | 'ende-ende' | 'anfang-ende';

/**
 * Anordnungsbeziehung (Glossar; v1.6, D-57): die Abhängigkeit eines Vorgangs von einem Vorgänger. Sie steht am Nachfolger
 * (`Vorgang.vorgaenger`).
 *
 * Lesarten (vorläufige Annahme, Entscheidung offen, enge Lesart; der Ausführer prüft die Form, `ungueltige-eingabe` mit
 * `feld: 'vorgaenger'`): `vorgaengerId` nennt einen anderen Vorgang desselben Plans; dasselbe Paar aus Vorgänger und Art
 * steht an einem Vorgang höchstens einmal (Anfang-Anfang und Ende-Ende zum selben Vorgänger zugleich ist erlaubt). Ein Zyklus
 * über Anordnungsbeziehungen und eine Beziehung an einem Sammelvorgang sind kein Fehler, sondern Befunde der Terminrechnung
 * (U5).
 */
export interface Anordnungsbeziehung {
  readonly vorgaengerId: VorgangId;
  readonly art: Anordnungsart;
  /** Ganze Arbeitstage, auch 0 oder negativ (negativ heißt Überlappung); eine Anzahl, kein Betrag (N1 gilt nicht). */
  readonly abstand: number;
}

/**
 * Ist-Termine und Fortschritt eines Vorgangs, von Hand eingetragen (v1.6, D-57; Name wie im Paket `bauzeit`). Sie werden
 * angezeigt, verschieben in v1 aber nichts. Jeder Wert ist nullbar; „nichts erfasst“ hat genau eine Schreibweise, das äußere
 * `null` an `Vorgang.ist`: Ein Objekt mit drei `null` weist der Ausführer mit `ungueltige-eingabe` ab (wie
 * `Rechnung.gefordert`, D-44).
 */
export interface Isttermine {
  /** Tatsächlicher Beginn, `JJJJ-MM-TT`. */
  readonly beginn: string | null;
  /** Tatsächliches Ende (letzter Arbeitstag einschließlich), `JJJJ-MM-TT`. Ein Ende vor dem Beginn ist ein Befund. */
  readonly ende: string | null;
  /** Fortschritt in Prozent, `0.00` bis `100.00` (sonst `ungueltige-eingabe`). */
  readonly fortschritt: Prozent | null;
}

/**
 * Bezug eines Vorgangs auf ein Ausschreibungs-LV oder Auftrags-LV (Glossar „Vorgangsbezug“; v1.6, Ticket 97 Punkt 4, D-57).
 * `art` heißt wie die Art des Aggregats in `AggregatBezug`. `knotenIds: null` ist das ganze LV, auch mit Knoten, die später
 * dazukommen (etwa ein übernommener Nachtrag); sonst die genannten Positionen und Gliederungen (eine Gliederung steht für alle
 * Positionen darunter), nicht leer und ohne Doppelte (sonst `ungueltige-eingabe`).
 *
 * Lesarten (vorläufige Annahme, Entscheidung offen, enge Lesart): Ein Bezug geht nicht in die Terminrechnung ein. Er ist ein
 * schwacher Verweis: Weder der Ausführer noch `speicher` prüft, dass es das LV oder die Knoten gibt; fehlt etwas, ist das ein
 * Befund der App (Q5: der Vorgang behält seinen Bezug, das LV wird nie wegen eines Bauzeitenplans gesperrt). Aus dem
 * Leistungsstand eines Auftrags-LV schlägt `bauzeit` den Fortschritt vor (Ticket 109).
 */
export type Vorgangsbezug =
  | {
      readonly art: 'leistungsverzeichnis';
      readonly id: LeistungsverzeichnisId;
      readonly knotenIds: readonly (GliederungId | PositionId)[] | null;
    }
  | {
      readonly art: 'auftrags-leistungsverzeichnis';
      readonly id: AuftragsLeistungsverzeichnisId;
      readonly knotenIds: readonly (GliederungId | PositionId)[] | null;
    };

/**
 * Vorgang (Glossar; v1.6, Ticket 97 Punkt 4, D-57): eine Tätigkeit im Bauzeitenplan, nur Eingaben; seine Termine rechnet
 * `bauzeit` (`Vorgangstermine`), sie werden nie gespeichert.
 *
 * Lesarten (vorläufige Annahme, Entscheidung offen, enge Lesart; der Ausführer prüft die Form, Ticket 109):
 * - Ein **Sammelvorgang** ist ein Vorgang mit Kindern (Vorgänge, deren `elternId` ihn nennen); seine `dauer` bleibt stehen,
 *   wird aber nicht gelesen. Ein **Meilenstein** hat `dauer` 0 (Beginn = Ende, am Anfang seines Tages; D-102.2, D-63).
 * - `elternId` nennt einen Vorgang desselben Plans (`eltern-unbekannt`), nie den Vorgang selbst oder einen seiner
 *   Nachkommen (`zyklus`).
 * - Eine Terminvorgabe an einem Sammelvorgang ist kein Fehler, sondern ein Befund (U5).
 */
export interface Vorgang {
  readonly id: VorgangId;
  /** Nummer zur Anzeige (z. B. `1.2`), rechnet nicht mit; `null`: keine. Nie `''`. */
  readonly nummer: string | null;
  /** Bezeichnung, nicht leer. */
  readonly bezeichnung: string;
  /** Sammelvorgang, unter dem der Vorgang steht; `null`: oberste Ebene. */
  readonly elternId: VorgangId | null;
  /** Ganze Arbeitstage ≥ 0; 0 = Meilenstein; am Sammelvorgang ohne Bedeutung. Eine Anzahl, kein Betrag (N1 gilt nicht). */
  readonly dauer: number;
  /** Die Anordnungsbeziehungen zu den Vorgängern, in Eingabereihenfolge. */
  readonly vorgaenger: readonly Anordnungsbeziehung[];
  /** Terminvorgabe „Beginn frühestens“ (Glossar „Terminvorgabe“), `JJJJ-MM-TT`; `null`: keine. */
  readonly fruehesterBeginn: string | null;
  /** Bezug auf ein LV oder Auftrags-LV; `null`: keiner. */
  readonly bezug: Vorgangsbezug | null;
  /** Ist-Termine und Fortschritt; `null`: nichts erfasst. */
  readonly ist: Isttermine | null;
}

/**
 * Kopf eines Bauzeitenplans (v1.6): der Plan ohne Vorgänge. Ihn setzt `BauzeitenplankopfSetzen`, ihn liefert die Liste des
 * Projekts (`BauzeitenplanUebersicht`).
 */
export interface BauzeitenplanKopf {
  readonly id: BauzeitenplanId;
  readonly projektId: ProjektId;
  /** Name, den der Nutzer vergibt (mehrere Pläne je Projekt, D-57), nicht leer. */
  readonly name: string;
  /**
   * Projektbeginn (Glossar „Bauzeitenplan“), `JJJJ-MM-TT`: Kein Vorgang beginnt davor; ist er kein Arbeitstag, beginnt die
   * Rechnung am ersten Arbeitstag danach (`BAUZEIT_ANNAHMEN`).
   */
  readonly projektbeginn: string;
  readonly kalender: Arbeitskalender;
}

/**
 * Bauzeitenplan (Glossar; v1.6, Ticket 97 Punkt 4, D-57): ein Aggregat je Plan, mehrere je Projekt. Gespeichert werden nur die
 * Eingaben; Termine, Puffer und kritische Wege rechnet `bauzeit` (`Bauzeitenplanergebnis`), nie gespeichert. Befehle führt
 * `bauzeit` aus (Ticket 109).
 *
 * Lesart (vorläufige Annahme, Entscheidung offen, enge Lesart): `vorgaenge` steht in **Dokumentreihenfolge**: jeder
 * Sammelvorgang vor seinen Kindern, sein Teilbaum zusammenhängend direkt dahinter, Geschwister in Anzeigereihenfolge (eine
 * Liste je Baum, kanonisch). Kennungen sind im Plan eindeutig. Der Ausführer hält die Reihenfolge (`VorgangSetzen` mit Lage)
 * und weist beim Anlegen eine andere Reihenfolge mit `ungueltige-eingabe` ab.
 */
export interface Bauzeitenplan extends BauzeitenplanKopf {
  readonly vorgaenge: readonly Vorgang[];
}

// --- Gerechnet, nie gespeichert (von `bauzeit` erzeugt, von App und `ausgabe` gelesen) ------------------------------------

/**
 * Art eines Vorgangs im Ergebnis (v1.6; wie in `bauzeit` und mit denselben Gliedern wie `Balkenart` der Balkenspalte von
 * `ui-grid`): `sammelvorgang` hat Kinder, `meilenstein` Dauer 0, sonst `vorgang`.
 */
export type Vorgangsart = 'vorgang' | 'sammelvorgang' | 'meilenstein';

/**
 * Gerechnete Termine eines Vorgangs (Glossar „Gesamtpuffer“, „Freier Puffer“; v1.6, D-57), nie gespeichert. Daten
 * `JJJJ-MM-TT`, Puffer in ganzen Arbeitstagen. Die frühe Lage (`beginn`, `ende`; Ende einschließlich) ist der Termin des Plans;
 * die späte Lage stammt aus der Rückwärtsrechnung vom Projektende. Kritisch heißt Gesamtpuffer ≤ 0.
 */
export interface Vorgangstermine {
  readonly beginn: string;
  readonly ende: string;
  readonly spaetesterBeginn: string;
  readonly spaetestesEnde: string;
  readonly gesamtpuffer: number;
  readonly freierPuffer: number;
  readonly kritisch: boolean;
}

/**
 * Ergebnis eines Vorgangs (v1.6): seine Art und seine Termine. `termine: null`: nicht gerechnet, etwa in einem Zyklus; ein
 * Befund nennt den Grund. Der Verweis heißt `vorgangId` wie in jeder Ergebniszeile des Vertrags (`Positionssumme.positionId`;
 * in `bauzeit` bis Ticket 109 `id`).
 */
export interface Vorgangsergebnis {
  readonly vorgangId: VorgangId;
  readonly art: Vorgangsart;
  readonly termine: Vorgangstermine | null;
}

/**
 * Ergebnis der Terminrechnung eines Bauzeitenplans (Glossar „Bauzeitenplan“, „Kritischer Weg“; v1.6, Ticket 97 Punkt 4, D-57,
 * D-102.12), nie gespeichert. Name wie im Paket `bauzeit` und wie `Honorarergebnis` (D-97.10).
 */
export interface Bauzeitenplanergebnis {
  /** Erster Arbeitstag ab dem Projektbeginn des Plans; `null`, wenn nichts gerechnet werden konnte. */
  readonly projektbeginn: string | null;
  /** Spätestes Ende der frühen Lage; `null` ohne gerechneten Vorgang. */
  readonly projektende: string | null;
  /** Je Vorgang des Plans genau ein Ergebnis, in der Reihenfolge des Plans. */
  readonly vorgaenge: readonly Vorgangsergebnis[];
  /**
   * Die kritischen Wege (mehrere sind möglich, D-102.8) als Folgen von Vorgängen vom Projektbeginn oder einer Terminvorgabe
   * bis zum Projektende; Sammelvorgänge gehören nie dazu. Höchstens so viele, wie `bauzeit` aufzählt, sonst ein Befund.
   */
  readonly kritischeWege: readonly (readonly VorgangId[])[];
  /** Befunde der Terminrechnung (Quelle `terminrechnung`; Ort siehe `Befundort`), in der Folge der Rechnung. */
  readonly befunde: readonly Pruefbefund[];
}
