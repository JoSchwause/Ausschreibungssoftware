// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle (Regel A5): jede Änderung am Projekt ist ein Befehl `(Zustand, Befehl) → ChangeSet`.
//
// Befehle sind reine Daten: keine Funktionen, kein Date, keine Klassen, alles JSON-tauglich. Sie gehen
// unverändert in das Befehlsprotokoll (ADR 0009) und sind damit später synchronisierbar (G-01). Alle Kennungen
// neuer Knoten bringt der Aufrufer mit (A2). Zeit und Nutzer stehen nicht im Befehl, sondern im
// `Protokolleintrag`. Der Befehlsname im Feld `art` ist der Typname (ASCII, siehe GLOSSARY).

import type {
  AufmassId,
  BieterId,
  ElternId,
  GliederungId,
  HinweistextId,
  KnotenId,
  Kostengruppennummer,
  LeistungsverzeichnisId,
  LvStandId,
  Ordnungszahl,
  PapierkorbeintragId,
  PositionId,
  ProjektId,
  ProtokollId,
  VorgangId,
  ZahlungId,
} from './marken';
import type {
  Angebot,
  Angebotsposition,
  Ansatzzeile,
  Auftraggeber,
  Aufmass,
  Aufmassposition,
  AuftragsLeistungsverzeichnis,
  Bauherr,
  Bieter,
  Bieterangaben,
  Einheit,
  Einheitspreisanteile,
  Kalkulationsangaben,
  PreisspiegelEinstellungen,
  Projektangaben,
  Knoten,
  Kostenermittlung,
  Kostenermittlungseintrag,
  Kostenermittlungsstufe,
  Langtext,
  Leitbeschreibung,
  LvInhalt,
  Nachlass,
  Nachtragsangaben,
  OzMaske,
  Positionsdaten,
  Positionsmerkmale,
  Rechnung,
  Rechnungsart,
  Umlage,
  Vergabeinformationen,
  Zuschlag,
} from './modell';
import type { Bauteilzuordnung, Bauwerksmodell } from './bim';
import type { Arbeitskalender, Bauzeitenplan, Vorgang } from './bauzeit';
import type { Honorarberechnung, Honorarobjekt, Nebenkostenangabe } from './honorar';
import type { Bautagebucheintrag, Mangel, Mangelverlaufseintrag } from './bauleitung';
import type { Buero, Druckprofil, Einstellungen, Kostengruppenbezeichnung } from './einstellungen';
import type { Betrag, Einheitspreis, Menge, Prozent } from './zahlen';
import type { Skonto, Vertragsstrafe, Zahlung } from './zahlung';

/** Wo ein Knoten eingefügt oder hingeschoben wird. */
export type Einfuegeort =
  /** Hinter dem Knoten. Elternknoten: bei einer Position/einem Hinweistext derselbe, bei einem Gliederungsknoten dessen erster Unterknoten (Ticket 05). */
  | { readonly art: 'nach'; readonly knotenId: KnotenId }
  | { readonly art: 'anfang'; readonly elternId: ElternId }
  | { readonly art: 'ende'; readonly elternId: ElternId }
  /**
   * Hinter der Gliederung samt ihrem Unterbaum, als ihr Geschwister (v1.3, Ticket 53 Punkt 5): Elternknoten ist der
   * der Gliederung, der Index der nächste hinter ihr. Ergänzt `nach`, das bei einer Gliederung „als erstes Kind“ heißt
   * und so bleibt (Befehle im Protokoll behalten ihre Bedeutung). Vorläufige Annahme, Entscheidung offen (enge
   * Lesart): nur für Gliederungen; hinter einer Position oder einem Hinweistext gilt weiter `nach` (eine Schreibweise je
   * Ort). Die Kern-Logik liefert Ticket 56; bis dahin weist der Kern diese Form mit `befehl-nicht-zustaendig` ab.
   */
  | { readonly art: 'hinter-gliederung'; readonly gliederungId: GliederungId };

// --- Projekt ---------------------------------------------------------------------------------------

export interface ProjektAnlegen {
  readonly art: 'ProjektAnlegen';
  readonly id: ProjektId;
  readonly name: string;
  readonly bauherr: Bauherr;
}

export interface ProjektStammdatenSetzen {
  readonly art: 'ProjektStammdatenSetzen';
  readonly name: string;
  readonly bauherr: Bauherr;
}

export interface BieterAnlegen {
  readonly art: 'BieterAnlegen';
  readonly bieter: Bieter;
}

/**
 * Löscht das Projekt (v1.1a, Punkt 4). Unumkehrbar im Sinne von Q5: Die Oberfläche braucht eine ausdrückliche
 * Bestätigung; wie das Projekt zurückkommt (Undo oder LV-Stand), entscheidet S3. Das ChangeSet trägt dafür den
 * vollen Stand (`ProjektChangeSet.projekt.vorher`).
 *
 * Gelöscht wird nur das Projekt selbst. Hängen noch LVs, Angebote oder Auftrags-LVs daran, weist `speicher` das
 * ChangeSet mit `konflikt` ab; sie werden vorher mit eigenen Löschbefehlen entfernt (siehe „Offene Typfragen“). v1.4:
 * ebenso Kostenermittlungen, Aufmaßblätter und Rechnungen des Projekts. v1.6 (Ticket 97 Punkt 8): ebenso Bauwerksmodelle,
 * Bauzeitenpläne, Honorarberechnungen, Mängel und Bautagebucheinträge (die Bytes der Modelldateien gibt `speicher` frei,
 * sobald kein Modell sie mehr nennt, siehe `Modelldateiablage`).
 */
export interface ProjektLoeschen {
  readonly art: 'ProjektLoeschen';
}

/**
 * Benennt einen Bieter des Projekts um (v1.7a, Ticket 127; E8). Ein leerer Name ist erlaubt wie bei `BieterAnlegen` (U5).
 * Ein Bieter, den das Projekt nicht hat: `ungueltige-eingabe` (`feld: 'bieterId'`). ChangeSet: das ganze Projekt vorher und
 * nachher (`ProjektChangeSet`), wie jeder Projektbefehl.
 */
export interface BieterUmbenennen {
  readonly art: 'BieterUmbenennen';
  readonly bieterId: BieterId;
  readonly name: string;
}

/**
 * Entfernt einen Bieter aus dem Projekt (v1.7a, Ticket 127; E8), **nur ohne Angebot**. Der Ausführer bekommt die Verweise
 * auf den Bieter als dritten Parameter (`ProjektBefehlAusfuehren`, `verweise`: die Angebote des Bieters als
 * `{ art: 'angebot', anzahl }`); ist die Anzahl größer als 0, weist er mit `verweise-vorhanden` ab und nennt sie in
 * `Befehlsfehler.verweise` (Verweissperre, Q5). Fehlt `verweise`, weist er mit `ungueltige-eingabe` (`feld: 'verweise'`)
 * ab: Ohne Bestand ist das Löschen nicht prüfbar. `speicher` weist ein ChangeSet, das einen Bieter mit Angebot entfernt, mit
 * `konflikt` ab (auch als Undo von `BieterAnlegen`). Ein Bieter, den das Projekt nicht hat: `ungueltige-eingabe`
 * (`feld: 'bieterId'`). Undo stellt ihn an seiner Stelle in `Projekt.bieter` wieder her (ganzes Projekt im ChangeSet).
 */
export interface BieterLoeschen {
  readonly art: 'BieterLoeschen';
  readonly bieterId: BieterId;
}

/**
 * Setzt die Projektangaben (v1.7a, Ticket 127; E10, Glossar „Projektangaben“): Name, Bauherr und die weiteren Angaben in
 * einem Befehl, ein Undo-Schritt für den Dialog „Projektangaben“. Ersetzt für die App `ProjektStammdatenSetzen` (das gültig
 * bleibt, damit Protokolle vor v1.7a ihre Bedeutung behalten, und `Projekt.angaben` unverändert lässt). `angaben: null`
 * entfernt sie (das Feld fehlt danach); `''` in einem Feld legt der Kern als `null` ab, alles `null` als fehlenden Block
 * (siehe `Projektangaben`). ChangeSet: das ganze Projekt vorher und nachher.
 */
export interface ProjektangabenSetzen {
  readonly art: 'ProjektangabenSetzen';
  readonly name: string;
  readonly bauherr: Bauherr;
  readonly angaben: Projektangaben | null;
}

/**
 * Setzt die Bieterangaben (Anschrift, Ansprechperson, E-Mail, Telefon) eines Bieters als ganzen Wert (v1.7a, Ticket 127;
 * E10); `null` entfernt sie. Normalisierung wie `ProjektangabenSetzen`. Ein Bieter, den das Projekt nicht hat:
 * `ungueltige-eingabe` (`feld: 'bieterId'`). Der Name bleibt (`BieterUmbenennen`); ein Dialog, der beides ändert, schreibt
 * beide Befehle als Befehlsfolge (D-12).
 */
export interface BieterangabenSetzen {
  readonly art: 'BieterangabenSetzen';
  readonly bieterId: BieterId;
  readonly angaben: Bieterangaben | null;
}

export type ProjektBefehl =
  | ProjektAnlegen
  | ProjektStammdatenSetzen
  | BieterAnlegen
  | ProjektLoeschen
  // v1.7a
  | BieterUmbenennen
  | BieterLoeschen
  | ProjektangabenSetzen
  | BieterangabenSetzen;

// --- Leistungsverzeichnis: Anlegen und Stammdaten ------------------------------------------------------

/**
 * Legt ein LV an, leer oder mit vollem Inhalt (GAEB-Import, Laden einer Fixture). Der Kern berechnet die Summen
 * und liefert sie im ChangeSet.
 *
 * Die Kennung des LV steht dreimal: in `id`, in `inhalt.wurzelId` und als `elternId` der Knoten der obersten Ebene.
 * Vorläufige Annahme, Entscheidung offen (enge Lesart): `id` ist maßgeblich. Weicht `inhalt.wurzelId` davon ab, weist
 * der Kern den Befehl mit `ungueltige-eingabe` und `feld: 'inhalt.wurzelId'` ab; ebenso Knoten der obersten Ebene, deren
 * `elternId` nicht `id` ist. Alternative (Offene Typfrage H, Ticket 24): `id` aus dem Befehl streichen.
 *
 * v1.2: Eine Maske, die der Kern beanstandet, weist den Befehl nicht ab (U5, GAEB-Import); der Kern nimmt sie an und
 * meldet den Befund als Hinweis `oz-maske-ungueltig` (`Befehlshinweis`, Ticket 30). Eine leere Einheit (`''`) in den
 * Knoten legt der Kern als `null` ab (siehe `Einheit`).
 */
export interface LeistungsverzeichnisAnlegen {
  readonly art: 'LeistungsverzeichnisAnlegen';
  readonly id: LeistungsverzeichnisId;
  readonly projektId: ProjektId;
  readonly inhalt: LvInhalt;
}

export interface LeistungsverzeichnisUmbenennen {
  readonly art: 'LeistungsverzeichnisUmbenennen';
  readonly name: string;
}

/**
 * Löscht das LV samt allen Knoten (v1.1a, Punkt 4). Unumkehrbar im Sinne von Q5 (Bestätigung in der Oberfläche; die
 * Wiederherstellung per Undo oder LV-Stand regelt S3). Das ChangeSet trägt den vollen Stand: `kopf.vorher`, alle
 * Knoten unter `knoten.entfernt`, alle Summen unter `summen.vorher.entfernt`; `kopf.nachher` ist `null`.
 * Angebote und Auftrags-LV zu diesem LV löscht der Befehl nicht; `speicher` weist mit `konflikt` ab, solange sie bestehen.
 *
 * v1.2: Hat das LV einen Papierkorb, stehen dessen Einträge unter `papierkorb.entfernt` (voller Stand, wie die
 * Knoten). Bestehen LV-Stände des LV, weist `speicher` mit `konflikt` ab wie bei Angeboten (D-12).
 */
export interface LeistungsverzeichnisLoeschen {
  readonly art: 'LeistungsverzeichnisLoeschen';
}

// --- LV-Baum (Ticket 05) ---------------------------------------------------------------------------------

export interface GliederungAnlegen {
  readonly art: 'GliederungAnlegen';
  readonly id: GliederungId;
  /** `los` oder `titel`. */
  readonly gliederungsart: 'los' | 'titel';
  readonly ort: Einfuegeort;
  readonly kurztext: string;
  /**
   * Ordnungszahl des neuen Knotens, wie bei `Positionsdaten.ordnungszahl` (v1.1a, Punkt 9). Fehlt oder `null`: noch
   * keine OZ vergeben. Ob und wie der Kern eine OZ vergibt, wenn sie fehlt, regelt Ticket 06, nicht dieser Typ.
   */
  readonly ordnungszahl?: Ordnungszahl | null;
}

export interface PositionAnlegen {
  readonly art: 'PositionAnlegen';
  readonly id: PositionId;
  readonly ort: Einfuegeort;
  readonly daten: Positionsdaten;
}

export interface HinweistextAnlegen {
  readonly art: 'HinweistextAnlegen';
  readonly id: HinweistextId;
  readonly ort: Einfuegeort;
  readonly text: Langtext;
}

/**
 * Löscht den Knoten und rekursiv alle Unterknoten, endgültig (Umkehrung des Einfügens, Undo). v1.2: Die Oberfläche
 * löscht nicht hierüber, sondern über den Papierkorb (`KnotenInPapierkorbLegen`, U5).
 */
export interface KnotenLoeschen {
  readonly art: 'KnotenLoeschen';
  readonly knotenId: KnotenId;
}

/** Verschiebt den Knoten samt Unterbaum. */
export interface KnotenVerschieben {
  readonly art: 'KnotenVerschieben';
  readonly knotenId: KnotenId;
  readonly ziel: Einfuegeort;
}

// --- Kopieren, Verschieben, Papierkorb (v1.2, K9) -----------------------------------------------------------

/**
 * Fügt einen oder mehrere Teilbäume ein (v1.2, K9): Kopieren im LV, Einfügen aus einem anderen LV oder aus der
 * Zwischenablage. Alle Kennungen bringt der Aufrufer neu mit (A2, A7).
 *
 * `knoten` ist flach, Eltern vor Kindern. Knoten, deren `elternId` nicht in der Liste vorkommt, sind die Wurzeln der
 * Teilbäume: Sie landen in Listenreihenfolge hintereinander am `ort`; ihre `elternId` und `reihenfolge` setzt der Kern
 * (die mitgebrachten Werte zählen dort nicht). Innerhalb eines Teilbaums gelten `elternId` und `reihenfolge` wie
 * mitgebracht. Ob Ordnungszahlen übernommen oder neu vergeben werden, entscheidet K9 (Ticket 42). Eine leere
 * Einheit (`''`) legt der Kern als `null` ab (siehe `Einheit`).
 *
 * Die Kopie samt umgebogener Bezüge innerhalb der kopierten Menge (Zuschlagsbezug, `wahl.grundpositionId`) baut eine
 * reine Hilfsfunktion des Kerns aus Quellknoten und neuen Kennungen (Ticket 42); der Befehl trägt nur das Ergebnis.
 * Kein Massenbefehl (Offene Typfrage, Ticket 29: lange Kopien verkürzt protokollieren).
 */
export interface KnotenEinfuegen {
  readonly art: 'KnotenEinfuegen';
  readonly ort: Einfuegeort;
  readonly knoten: readonly Knoten[];
}

/**
 * Verschiebt eine Mehrfachauswahl als **ein** Befehl (ein Undo-Schritt; v1.2, K9): die Knoten samt Unterbäumen in
 * Listenreihenfolge hintereinander am `ziel`. `KnotenVerschieben` bleibt für den einzelnen Knoten.
 */
export interface KnotenlisteVerschieben {
  readonly art: 'KnotenlisteVerschieben';
  readonly knotenIds: readonly KnotenId[];
  readonly ziel: Einfuegeort;
}

/**
 * Nimmt die Knoten samt Unterbäumen aus dem Baum und legt sie als **einen** Papierkorbeintrag ab (v1.2, K9). Die
 * Kennung des Eintrags bringt der Aufrufer mit (`IdQuelle.papierkorbeintrag`), die `nummer` vergibt der Kern
 * (Höchstwert + 1, D-12). Bezüge anderer Knoten auf die Positionen bleiben stehen (siehe `Papierkorbeintrag`). ChangeSet: `knoten.entfernt` und
 * `papierkorb.hinzugefuegt`; die Summen der Knoten stehen in `summen.vorher.entfernt`.
 */
export interface KnotenInPapierkorbLegen {
  readonly art: 'KnotenInPapierkorbLegen';
  readonly eintragId: PapierkorbeintragId;
  readonly knotenIds: readonly KnotenId[];
}

/**
 * Holt einen Papierkorbeintrag zurück in den Baum (v1.2, K9). `ort: null` heißt an die alte Stelle (die Lage, die die
 * Knoten im Eintrag tragen); sonst wie bei `KnotenEinfuegen` hintereinander am `ort`. Die Kennungen bleiben
 * (Positionsidentität, ADR 0011). ChangeSet: `knoten.hinzugefuegt` und `papierkorb.entfernt`.
 */
export interface PapierkorbeintragWiederherstellen {
  readonly art: 'PapierkorbeintragWiederherstellen';
  readonly eintragId: PapierkorbeintragId;
  readonly ort: Einfuegeort | null;
}

/**
 * Entfernt einen Papierkorbeintrag endgültig (v1.2, K9). Unumkehrbar im Sinne von Q5: Bestätigung in der Oberfläche,
 * abgesichert durch Undo und LV-Stand. ChangeSet: `papierkorb.entfernt`, dazu die Knoten im Baum, deren Bezüge auf
 * eine Position des Eintrags nun entfernt werden, unter `knoten.geaendert` (D-12, siehe `Papierkorbeintrag`).
 *
 * Verweist noch eine Angebotsposition auf eine Position des Eintrags, weist `speicher` mit `konflikt` ab (Q5, D-12):
 * Die Angebotsposition würde sonst still ihre Position verlieren.
 */
export interface PapierkorbeintragEntfernen {
  readonly art: 'PapierkorbeintragEntfernen';
  readonly eintragId: PapierkorbeintragId;
}

/**
 * Entfernt alle Papierkorbeinträge endgültig (v1.2, K9). ChangeSet, Q5 und `konflikt` bei Angebotspositionen wie
 * `PapierkorbeintragEntfernen`, für alle Einträge zugleich.
 */
export interface PapierkorbLeeren {
  readonly art: 'PapierkorbLeeren';
}

// --- LV-Stand (v1.2, S3; ADR 0006) ---------------------------------------------------------------------------

/**
 * Friert den gespeicherten Stand des LV als unveränderlichen LV-Stand ein (v1.2, S3). ChangeSet: nur
 * `lvStand: { vorher: null, nachher: LvStandKopf }`; den Zustand selbst kopiert `speicher` in derselben Transaktion,
 * `angelegt` ist `Protokolleintrag.wann`. Kein Umbenennen, kein Zurückschreiben in das bestehende LV (Offene
 * Typfrage, Ticket 29); ein LV aus einem Stand zurückholen geht über `LeistungsverzeichnisAnlegen` mit dessen Inhalt.
 * Den Handler liefert Ticket 42 (K9), das Einfrieren Ticket 43 (S3). Ein `Wiederholen` nach dem Rückgängigmachen
 * friert neu ein (der dann gespeicherte Stand, neues `angelegt`; D-12).
 */
export interface LvStandAnlegen {
  readonly art: 'LvStandAnlegen';
  readonly id: LvStandId;
  readonly name: string;
}

// --- LV-Stand umbenennen und löschen (v1.7a, Ticket 127; E8) -------------------------------------------------------
//
// Ein LV-Stand bleibt im Inhalt unveränderlich; neu ist nur sein Name und dass er entfernt werden kann (sonst ließe sich
// ein LV mit Ständen nie löschen, D-12). Kein `LvBefehl`: Der Ausführer des LV sieht keine Stände. Eigener Ausführer
// `LvStandBefehlAusfuehren` (Kern, Ticket 137) mit dem ganzen Stand als Zustand; das ChangeSet ist ein `LvChangeSet` des LV,
// dem der Stand gehört (`kopf: null`, keine Knoten, leere Summen), im Protokoll mit diesem LV als Aggregat. Eine Kennung,
// die nicht die des übergebenen Stands ist: `befehl-nicht-zustaendig`.

/**
 * Benennt einen LV-Stand um. Der Name darf nicht leer sein (Leerraum zählt als leer), wie bei `LvStandAnlegen`: sonst
 * `ungueltige-eingabe` (`feld: 'name'`; D-87, D-137.1). ChangeSet: `lvStand` mit beiden Köpfen, die sich nur im `name`
 * unterscheiden; `lvStandInhalt` fehlt.
 */
export interface LvStandUmbenennen {
  readonly art: 'LvStandUmbenennen';
  readonly lvStandId: LvStandId;
  readonly name: string;
}

/**
 * Löscht einen LV-Stand. Unumkehrbar im Sinne von Q5 (Bestätigung in der Oberfläche); das ChangeSet trägt den ganzen Stand
 * (`lvStand.vorher` den Kopf, `lvStandInhalt.vorher` Zeitpunkt und Zustand), damit Undo ihn unverändert, mit seinem
 * `angelegt`, wieder ablegt (siehe `LvChangeSet.lvStandInhalt`). Nichts verweist auf einen Stand; es gibt keine Sperre.
 */
export interface LvStandLoeschen {
  readonly art: 'LvStandLoeschen';
  readonly lvStandId: LvStandId;
}

/** Befehle an einem gespeicherten LV-Stand (v1.7a; Zustand: `LvStand`, Ausführer `LvStandBefehlAusfuehren`). */
export type LvStandBefehl = LvStandUmbenennen | LvStandLoeschen;

// --- Felder ändern (Tickets 07, 21) -----------------------------------------------------------------------
//
// Fehler eines Feldbefehls (v1.5, D-71.3; im LV und im Auftrags-LV): Hat der Baum des Aggregats keinen Knoten mit der
// Kennung, `knoten-unbekannt`; trifft der Befehl einen vorhandenen Knoten, der das Feld nicht trägt (eine Gliederung oder
// einen Hinweistext statt einer Position, eine Position statt eines Hinweistexts), `knotenart-unzulaessig`. Erst danach
// prüft der Kern den Wert (`ungueltige-eingabe` mit `feld`). Das gilt für jeden Befehl dieses Abschnitts und ebenso für
// `LeitbeschreibungSetzen` und `OrdnungszahlSetzen`.

export interface KurztextAendern {
  readonly art: 'KurztextAendern';
  readonly knotenId: GliederungId | PositionId;
  readonly kurztext: string;
}

export interface LangtextAendern {
  readonly art: 'LangtextAendern';
  readonly positionId: PositionId;
  readonly langtext: Langtext;
}

export interface HinweistextAendern {
  readonly art: 'HinweistextAendern';
  readonly knotenId: HinweistextId;
  readonly text: Langtext;
}

/**
 * Setzt die Menge von Hand. v1.3 (D-22, Lesart (a)): Hat die Position einen Mengenansatz, entfernt der Kern ihn im
 * selben ChangeSet (Ticket 56); die Menge kommt dann nicht mehr aus dem Ansatz.
 */
export interface MengeAendern {
  readonly art: 'MengeAendern';
  readonly positionId: PositionId;
  /** `null`: Menge leeren. */
  readonly menge: Menge | null;
}

/**
 * Setzt den Mengenansatz einer Position und ihre daraus gerechnete Menge in einem Befehl (v1.3, M2; D-22). Die App rechnet
 * `menge` mit `mengen` (`mengenansatzBerechnen(...).summe`); der Kern legt beides unausgewertet ab und rechnet nie nach
 * (A3: kein `kern → mengen`). Das ChangeSet ist eine Knotenänderung der Position (`knoten.geaendert`) samt Summen.
 *
 * - `mengenansatz: null` entfernt den Ansatz (`Positionsdaten.mengenansatz` fehlt danach); `menge` wird trotzdem
 *   gesetzt (die App gibt die Menge mit, die stehen bleiben soll). Ein leerer Ansatz `[]` ist keiner: Der Kern legt
 *   dafür kein Feld ab wie bei `null` (Normalisierung beim Befehl wie `''` bei der Einheit; Ticket 56).
 * - Lesart (b) (D-22): Ein Ansatz mit Fehler (eine Zeile ohne Ergebnis, `summe: null`) kommt mit `menge: null`; der
 *   Ansatz wird gespeichert, die Menge ist dann nicht gesetzt (U5: der Fehler sperrt die Eingabe nicht).
 * - Lesart (a) (D-22): Ein reiner Mengenbefehl (`MengeAendern`) an einer Position mit Ansatz entfernt den Ansatz im
 *   selben ChangeSet (die Oberfläche fragt vorher); so laufen Menge und Ansatz nie auseinander.
 *
 * Kern-Handler Ticket 56, Speicherung Ticket 57, Panel Ticket 65.
 */
export interface MengenansatzSetzen {
  readonly art: 'MengenansatzSetzen';
  readonly positionId: PositionId;
  readonly mengenansatz: readonly Ansatzzeile[] | null;
  readonly menge: Menge | null;
}

export interface EinheitAendern {
  readonly art: 'EinheitAendern';
  readonly positionId: PositionId;
  /** `null`: Einheit leeren. `''` ist erlaubt (Grid-Eingabe); der Kern legt dafür `null` ab (v1.2, siehe `Einheit`). */
  readonly einheit: Einheit | null;
}

export interface EinheitspreisAendern {
  readonly art: 'EinheitspreisAendern';
  readonly positionId: PositionId;
  /** `null`: Einheitspreis leeren. */
  readonly einheitspreis: Einheitspreis | null;
}

export interface EinheitspreisanteileSetzen {
  readonly art: 'EinheitspreisanteileSetzen';
  readonly positionId: PositionId;
  readonly epa: Einheitspreisanteile | null;
}

/**
 * Setzt die Positionsmerkmale und die Zuschlagsangaben gemeinsam, damit nie ein halber Zustand entsteht
 * (v1.1b, Punkt 1; ersetzt `PositionsartAendern`). Die Wahlzuordnung, der Bedarf und der Zuschlagsbezug stehen als
 * Werte in `merkmale` und `zuschlag`, die Verweise darin gehören zum selben Befehl.
 */
export interface PositionsmerkmaleSetzen {
  readonly art: 'PositionsmerkmaleSetzen';
  readonly positionId: PositionId;
  readonly merkmale: Positionsmerkmale;
  /** `null`: keine Zuschlagsposition. */
  readonly zuschlag: Zuschlag | null;
}

/**
 * Ordnet einer Position eine Kostengruppe zu; `null` entfernt die Zuordnung (das Feld fehlt danach) (v1.4, Ticket 70
 * Punkt 4; C2, D-36 (4)). Gilt im Ausschreibungs-LV (Zuordnung LV ↔ Kostengruppe) und im Auftrags-LV (Grundlage der
 * Kostenkontrolle, D-37): **derselbe** Typ steht in `LvBefehl` und in `AuftragsLvBefehl`, ein Name für eine Handlung
 * (L2); welches Aggregat gemeint ist, sagt im Protokoll `Protokolleintrag.aggregat` (`AggregatBezug`), beim Ausführen der
 * Zustand.
 *
 * Nur an einer Position (eine Kostengruppe je Position). v1.5 (D-71.3): Fehler wie bei jedem Feldbefehl, in beiden
 * Aggregaten: eine Gliederung oder ein Hinweistext `knotenart-unzulaessig`, eine Kennung ohne Knoten im Baum
 * `knoten-unbekannt` (bis v1.4 stand hier für beides `knoten-unbekannt`; den Kern stellt Ticket 105 um). Der Kern prüft die
 * Form der Nummer (drei Ziffern, die erste nicht 0; D-24) mit `ungueltige-eingabe` nach, weil Befehle auch aus Protokoll und
 * Datei kommen; ob die Gruppe in einer Kostenermittlung vorkommt, prüft er nicht. ChangeSet: die Knotenänderung der Position
 * (`knoten.geaendert`), Summen unverändert. Kern-Handler Ticket 71.
 */
export interface KostengruppeSetzen {
  readonly art: 'KostengruppeSetzen';
  readonly positionId: PositionId;
  readonly kostengruppe: Kostengruppennummer | null;
}

/**
 * Setzt die Textquelle einer Position; `null` entfernt sie (das Feld fehlt danach) (v1.4, Ticket 70 Punkt 5; G-17,
 * D-40). Ein leerer Text `''` ist keine Quelle: Der Kern legt dafür kein Feld ab wie bei `null` (Normalisierung beim
 * Befehl wie `''` bei der Einheit). ChangeSet: die Knotenänderung der Position, Summen unverändert. Kern-Handler
 * Ticket 71, ein Feldbefehl wie `KurztextAendern`: eine Gliederung oder ein Hinweistext `knotenart-unzulaessig`, eine
 * Kennung ohne Knoten im Baum `knoten-unbekannt` (v1.5, D-71.3).
 */
export interface TextquelleSetzen {
  readonly art: 'TextquelleSetzen';
  readonly positionId: PositionId;
  readonly textquelle: string | null;
}

/**
 * Setzt die Bauteilzuordnungen einer Position als **ganze Liste** (v1.6, Ticket 97 Punkt 3; X1c, D-52; Glossar
 * „Bauteilzuordnung“), wie `MengenansatzSetzen` den ganzen Ansatz; `null` entfernt sie (das Feld fehlt danach), ein leeres
 * `[]` ebenso (Normalisierung beim Befehl wie bei `MengenansatzSetzen`). Gilt im Ausschreibungs-LV und im Auftrags-LV:
 * **derselbe** Typ steht in `LvBefehl` und in `AuftragsLvBefehl` (wie `KostengruppeSetzen`, D-70.1); welches Aggregat gemeint
 * ist, sagt im Protokoll `Protokolleintrag.aggregat`, beim Ausführen der Zustand.
 *
 * Fehler (Lesart des Kerns, vorläufige Annahme, Entscheidung offen): wie jeder Feldbefehl (v1.5, D-71.3) eine Gliederung oder
 * ein Hinweistext `knotenart-unzulaessig`, eine Kennung ohne Knoten `knoten-unbekannt`; danach `ungueltige-eingabe` mit
 * `feld: 'bauteile'` für eine GlobalId nicht in Form (siehe `IfcGlobalId`), eine leere Mengenart oder dasselbe Paar aus
 * GlobalId und Mengenart zweimal. Der Kern prüft keine GlobalId gegen ein Modell (A3); hängende Zuordnungen meldet die App
 * (Befund). ChangeSet: die Knotenänderung der Position (`knoten.geaendert`), Summen unverändert. Kein Massenbefehl, auch
 * nicht mit 5.000 Zuordnungen (D-54 misst Befehl und Undo in Ticket 105; Offene Typfrage, Ticket 97). Kern-Handler Ticket 105.
 */
export interface BauteileZuordnen {
  readonly art: 'BauteileZuordnen';
  readonly positionId: PositionId;
  readonly bauteile: readonly Bauteilzuordnung[] | null;
}

// --- Kopfdaten bearbeiten (v1.2, D-02, D-07; Kern-Handler Ticket 41, Oberfläche Ticket 47) -------------------

/** Setzt den Auftraggeber des LV als ganzen Wert; `null` entfernt ihn (das Feld fehlt danach am LV). */
export interface AuftraggeberSetzen {
  readonly art: 'AuftraggeberSetzen';
  readonly auftraggeber: Auftraggeber | null;
}

/** Setzt die Vergabeinformationen des LV als ganzen Wert; `null` entfernt sie (das Feld fehlt danach am LV). */
export interface VergabeinformationenSetzen {
  readonly art: 'VergabeinformationenSetzen';
  readonly vergabeinformationen: Vergabeinformationen | null;
}

/**
 * Setzt die Nachtragsangaben des LV als ganzen Wert; `null` entfernt sie, das LV ist dann kein Nachtrags-LV mehr (das
 * Feld fehlt danach am `LvKopf`) (v1.4, Ticket 70 Punkt 3; D-35). ChangeSet: nur der Kopf, keine Summen. Der Kern prüft
 * `nummer` (nicht leer) und `status` (einer der vier Werte), nicht die Kennung des Auftrags-LV und keine Übergänge (siehe
 * `Nachtragsangaben`). Kern-Handler Ticket 71.
 */
export interface NachtragsangabenSetzen {
  readonly art: 'NachtragsangabenSetzen';
  readonly nachtrag: Nachtragsangaben | null;
}

/**
 * Kennzeichnet das LV als Muster-LV (`true`) oder nimmt das Kennzeichen weg (`false`: das Feld `LvKopf.vorlage` fehlt
 * danach) (v1.4, Ticket 70 Punkt 5; C5, D-40). ChangeSet: nur der Kopf, keine Summen. Kern-Handler Ticket 71.
 */
export interface VorlageSetzen {
  readonly art: 'VorlageSetzen';
  readonly vorlage: boolean;
}

/**
 * Setzt die Preisspiegel-Einstellungen des LV als ganzen Wert; `null` entfernt sie, dann gelten die Standardwerte (v1.7a,
 * Ticket 127; E15, D-73). ChangeSet: nur der Kopf, keine Summen. Der Kern prüft die Form (siehe `PreisspiegelEinstellungen`).
 * Name wie der Typ des Werts (v1.7a Nachtrag, Review D-82 S5; bis dahin `PreisspiegeleinstellungenSetzen`, das in keinem
 * Protokoll steht). Ein LV, das aus einem LV-Stand neu entsteht, bekommt die Einstellungen des Stands nur über diesen Befehl,
 * den die App an die Befehlsfolge hängt (Review D-82 S6, Ticket 150).
 */
export interface PreisspiegelEinstellungenSetzen {
  readonly art: 'PreisspiegelEinstellungenSetzen';
  readonly einstellungen: PreisspiegelEinstellungen | null;
}

/**
 * Setzt die Kalkulationsangaben einer Position zusammen mit dem daraus gerechneten EP und den EPA (v1.7a, Ticket 127; E9,
 * B-19), wie `MengenansatzSetzen` Ansatz und Menge: Die App rechnet `einheitspreis` und `epa` mit `kosten`
 * (`einzelpreiskalkulationBerechnen`, D-39); der Kern legt alles unausgewertet ab und rechnet nie nach (A3: kein
 * `kern → kosten`). ChangeSet: die Knotenänderung der Position samt Summen (der EP kann sich ändern).
 *
 * - `kalkulation: null` entfernt die Kalkulation (das Feld fehlt danach); EP und EPA werden trotzdem gesetzt (die App gibt die
 *   Werte mit, die stehen bleiben sollen). Eine Kalkulation ohne Ansatz und ohne Zuschlagssatz ist keine: Der Kern legt dafür
 *   kein Feld ab wie bei `null` (Normalisierung beim Befehl).
 * - Lesart (a) wie D-22: `EinheitspreisAendern` und `EinheitspreisanteileSetzen` an einer Position mit Kalkulation entfernen
 *   sie im selben ChangeSet (siehe `Positionsdaten.kalkulation`).
 * - Form, die der Kern prüft (`ungueltige-eingabe` mit `feld`): jede `art` eine `EpaArt`, Mengen und Kostensätze kanonisch mit
 *   3 Stellen oder `null`, Sätze kanonisch mit 2 Stellen; `einheitspreis` und `epa` wie bei ihren Feldbefehlen. Ob EP und EPA
 *   zur Kalkulation passen, prüft er nicht.
 * - Fehler wie jeder Feldbefehl (D-71.3): Gliederung oder Hinweistext `knotenart-unzulaessig`, unbekannte Kennung
 *   `knoten-unbekannt`. Nur im Ausschreibungs-LV (nicht in `AuftragsLvBefehl`).
 * - Zuschlagsposition (v1.7a Nachtrag, Review D-82 S3): An einer Position mit `zuschlag !== null` weist der Kern mit
 *   `knotenart-unzulaessig` ab (`feld: 'kalkulation'`), auch mit `kalkulation: null`: Ihr Betrag folgt aus den Bezugspositionen,
 *   nicht aus einem kalkulierten EP. Invariante: Eine Zuschlagsposition trägt nie `kalkulation` (siehe
 *   `Positionsdaten.kalkulation`).
 */
export interface KalkulationSetzen {
  readonly art: 'KalkulationSetzen';
  readonly positionId: PositionId;
  readonly kalkulation: Kalkulationsangaben | null;
  readonly einheitspreis: Einheitspreis | null;
  readonly epa: Einheitspreisanteile | null;
}

/** Setzt die Leitbeschreibung einer Position als ganzen Wert; `null` entfernt sie (das Feld fehlt danach). */
export interface LeitbeschreibungSetzen {
  readonly art: 'LeitbeschreibungSetzen';
  readonly positionId: PositionId;
  readonly leitbeschreibung: Leitbeschreibung | null;
}

// --- Ordnungszahl (Ticket 06) -----------------------------------------------------------------------------

/**
 * Setzt die Maske; der Kern liefert alle dadurch umnummerierten Knoten im selben ChangeSet. Passen Knoten nicht zur neuen
 * Maske, bleibt es bei den vorhandenen Codes (`maske-ungueltig`, `oz-ueberlauf`, an der Los-Stufe `knotenart-unzulaessig`;
 * D-87, D-137.10): Code, Meldung und `knotenId` sind die des ersten Knotens, `Befehlsfehler.knotenIds` nennt alle in
 * Dokumentreihenfolge, wenn es mehrere sind (D-127.14).
 */
export interface OzMaskeSetzen {
  readonly art: 'OzMaskeSetzen';
  readonly maske: OzMaske;
}

/** Handeingabe einer Ordnungszahl (und ihres Indexbuchstabens) an einem Knoten. */
export interface OrdnungszahlSetzen {
  readonly art: 'OrdnungszahlSetzen';
  readonly knotenId: GliederungId | PositionId;
  readonly ordnungszahl: Ordnungszahl | null;
  readonly ozIndex: string | null;
}

/** Vergibt die Ordnungszahlen im Teilbaum unter `teilbaumId` neu (Gliederung +1, Positionen +10). IDs bleiben. */
export interface Umnummerieren {
  readonly art: 'Umnummerieren';
  readonly teilbaumId: ElternId;
}

// --- Nachlass und MwSt (Ticket 07) --------------------------------------------------------------------------

export interface NachlassSetzen {
  readonly art: 'NachlassSetzen';
  readonly nachlass: Nachlass;
}

export interface NachlassEntfernen {
  readonly art: 'NachlassEntfernen';
}

export interface MwstSatzSetzen {
  readonly art: 'MwstSatzSetzen';
  readonly mwstSatz: Prozent;
}

/** Befehle gegen ein Ausschreibungs-LV (Zustand: `LvZustand`). */
export type LvBefehl =
  | LeistungsverzeichnisAnlegen
  | LeistungsverzeichnisUmbenennen
  | GliederungAnlegen
  | PositionAnlegen
  | HinweistextAnlegen
  | KnotenLoeschen
  | KnotenVerschieben
  | KurztextAendern
  | LangtextAendern
  | HinweistextAendern
  | MengeAendern
  | EinheitAendern
  | EinheitspreisAendern
  | EinheitspreisanteileSetzen
  | PositionsmerkmaleSetzen
  | OzMaskeSetzen
  | OrdnungszahlSetzen
  | Umnummerieren
  | NachlassSetzen
  | NachlassEntfernen
  | MwstSatzSetzen
  | LeistungsverzeichnisLoeschen
  // v1.2
  | KnotenEinfuegen
  | KnotenlisteVerschieben
  | KnotenInPapierkorbLegen
  | PapierkorbeintragWiederherstellen
  | PapierkorbeintragEntfernen
  | PapierkorbLeeren
  | LvStandAnlegen
  | AuftraggeberSetzen
  | VergabeinformationenSetzen
  | LeitbeschreibungSetzen
  // v1.3
  | MengenansatzSetzen
  // v1.4
  | NachtragsangabenSetzen
  | KostengruppeSetzen
  | VorlageSetzen
  | TextquelleSetzen
  // v1.6
  | BauteileZuordnen
  // v1.7a
  | KalkulationSetzen
  | PreisspiegelEinstellungenSetzen;

// --- Angebot ---------------------------------------------------------------------------------------------

/** Legt ein Angebot an, leer oder mit Preisen (Erfassung, X84-Import). */
export interface AngebotAnlegen {
  readonly art: 'AngebotAnlegen';
  readonly angebot: Angebot;
}

/** Setzt Preis oder „nicht angeboten“ für eine Position. Ersetzt einen vorhandenen Eintrag. */
export interface AngebotspositionSetzen {
  readonly art: 'AngebotspositionSetzen';
  readonly position: Angebotsposition;
}

export interface AngebotsNachlassSetzen {
  readonly art: 'AngebotsNachlassSetzen';
  readonly nachlass: Nachlass;
}

export interface AngebotsNachlassEntfernen {
  readonly art: 'AngebotsNachlassEntfernen';
}

/**
 * Löscht das Angebot samt allen Angebotspositionen (v1.1a, Punkt 4). Unumkehrbar im Sinne von Q5; das ChangeSet
 * trägt den vollen Stand (`kopf.vorher`, `positionen.entfernt`, `summen.vorher.entfernt`), `kopf.nachher` ist `null`.
 * Ein Angebot, auf das ein Auftrags-LV verweist, weist `speicher` mit `konflikt` ab.
 */
export interface AngebotLoeschen {
  readonly art: 'AngebotLoeschen';
}

/** Befehle gegen ein Angebot (Zustand: `AngebotZustand`). */
export type AngebotBefehl =
  | AngebotAnlegen
  | AngebotspositionSetzen
  | AngebotsNachlassSetzen
  | AngebotsNachlassEntfernen
  | AngebotLoeschen;

// --- Auftrags-LV (v1.1a, Punkt 5) ---------------------------------------------------------------------------

/**
 * Legt ein Auftrags-LV als Aggregat an, mit Kopf, Knoten und Positions-IDs der Ausschreibung. Das ist alles, was
 * dieses Ticket vom Auftrags-LV trägt, damit es angelegt und gespeichert werden kann. Wie aus Ausschreibung und
 * Angebot ein Auftrags-LV entsteht (Zuschlag, Vertragspreise), gehört zur Vergabe (Welle 4) und ist hier nicht
 * festgelegt. Der Zustand ist `null`: das Aggregat entsteht erst.
 */
export interface AuftragsLeistungsverzeichnisAnlegen {
  readonly art: 'AuftragsLeistungsverzeichnisAnlegen';
  readonly auftragsLeistungsverzeichnis: AuftragsLeistungsverzeichnis;
}

/**
 * Übernimmt einen beauftragten Nachtrag in das Auftrags-LV (v1.4, Ticket 70 Punkt 2; D-35, Glossar „Nachtrag“). Den
 * Befehl baut die reine Funktion `nachtragUebernehmen(auftragsLv, nachtragsLv, angebot, neueIds)` in `abrechnung`
 * (Ticket 80) aus dem Nachtrags-LV und dem Nachtragsangebot; der Kern führt ihn aus (Ticket 71). Die App schreibt danach am
 * Nachtrags-LV `NachtragsangabenSetzen` mit Status `beauftragt` (zwei Aggregate, eine Befehlsfolge, D-35).
 *
 * Lesart (D-35, enge Lesart im Typ):
 * - `knoten` ist genau **eine** neue Gliederung auf oberster Ebene des Auftrags-LV samt ihrem Teilbaum, flach, Eltern vor
 *   Kindern. Die Gliederung heißt „Nachtrag <nummer>“, ist ein Los, wenn auf oberster Ebene Lose stehen, sonst ein Titel
 *   (F1), hat `elternId` = Kennung des Auftrags-LV und `reihenfolge` = Zahl der Knoten der obersten Ebene (sie kommt ans
 *   Ende). Darunter steht der Baum des Nachtrags-LV mit den EP und EPA des Nachtragsangebots.
 * - Der Kern übernimmt die Knoten, wie sie kommen (wie `AuftragsLeistungsverzeichnisAnlegen`, nicht wie
 *   `KnotenEinfuegen`): Lage, Ordnungszahlen und Preise setzt `nachtragUebernehmen`, der Kern vergibt nichts neu. Eine
 *   leere Einheit (`''`) legt er als `null` ab (siehe `Einheit`). Abweichungen der OZ von der Maske meldet die
 *   LV-Prüfung (U5), sie sperren nicht.
 * - Kennungen: Positionen behalten ihre `PositionId` aus dem Nachtrags-LV (Positionsidentität mit Nachtrags-LV und
 *   Nachtragsangebot, ADR 0011); Gliederungen und Hinweistexte des Nachtrags behalten ihre Kennung ebenfalls, die neue
 *   oberste Gliederung hat eine neue aus der `IdQuelle`. Keine Kennung darf im Auftrags-LV schon vorkommen (`id-vergeben`);
 *   das sperrt auch eine zweite Übernahme desselben Nachtrags.
 * - Der Kern prüft die Baumregeln wie beim Anlegen: F1 (Lose und Titel nie nebeneinander auf oberster Ebene,
 *   `knotenart-unzulaessig`), höchstens 5 Gliederungsebenen samt der neuen (`ebene-ueberschritten`), Eltern vor Kindern
 *   und dichte `reihenfolge` (`ungueltige-eingabe`), genau eine Wurzel des Teilbaums an der genannten Stelle.
 * - Was der Befehl nicht trägt, prüft `nachtragUebernehmen` vorher (Fehler oder Warnung, nicht der Kern): anderer
 *   MwSt-Satz als das Auftrags-LV (Fehler), nicht angebotene Position (EP `null` mit Warnung, wie D-21), Wahl-Alternativen
 *   (entfallen mit Warnung), Nachlass des Nachtragsangebots (ignoriert mit Warnung).
 * - `nachtragLvId` nennt das Nachtrags-LV für Protokoll und Anzeige; der Kern kennt es nicht und prüft es nicht.
 *
 * ChangeSet: `AuftragsLvChangeSet` mit `kopf: null`, den Knoten unter `knoten.hinzugefuegt` und den betroffenen Summen.
 * Seine Umkehrung (Undo) entfernt die Knoten wieder; verweist dann eine Aufmaßposition auf eine dieser Positionen, weist
 * `speicher` mit `konflikt` ab (siehe `AuftragsLvChangeSet`). Kein Massenbefehl: ein Nachtrag ist kurz.
 */
export interface NachtragUebernehmen {
  readonly art: 'NachtragUebernehmen';
  readonly nachtragLvId: LeistungsverzeichnisId;
  readonly knoten: readonly Knoten[];
}

/**
 * Befehle gegen ein Auftrags-LV (Zustand: `AuftragsLvZustand`). v1.4 (D-36 (4)): genau das Anlegen (Zuschlag, D-21), die
 * Übernahme eines Nachtrags und die Kostengruppe einer Position; sonst ändert nichts das Auftrags-LV. v1.6 (Ticket 97
 * Punkt 3, D-52): dazu die Bauteilzuordnungen einer Position. `MengenansatzSetzen` bleibt ein reiner LV-Befehl: Nach dem
 * Zuschlag führt der Weg vom Modell zur Menge nur über das Aufmaßblatt (D-53).
 */
export type AuftragsLvBefehl =
  | AuftragsLeistungsverzeichnisAnlegen
  | NachtragUebernehmen
  | KostengruppeSetzen
  // v1.6
  | BauteileZuordnen
  // v1.7a
  | ZuschlagZuruecknehmen;

/**
 * Nimmt den Zuschlag zurück: löscht das Auftrags-LV (v1.7a, Ticket 127; E8, D-74; Glossar „Zuschlag zurücknehmen“). Danach
 * lassen sich Angebot, LV und Projekt wieder löschen (Q5: kein Projekt bleibt unlöschbar).
 *
 * - Sperre (D-74): Der Ausführer bekommt die Verweise auf das Auftrags-LV als dritten Parameter
 *   (`AuftragsLvBefehlAusfuehren`, `verweise`): Nachtrags-LVs (`Nachtragsangaben.auftragsLvId`), Aufmaßblätter, Rechnungen
 *   und Mängel (`Mangel.auftragsLvId`), je Art die Anzahl. Ist eine davon größer als 0, weist er mit `verweise-vorhanden` ab
 *   und nennt alle Arten mit Anzahl > 0 in `Befehlsfehler.verweise` (Reihenfolge: nachtrag, aufmass, rechnung, mangel); die
 *   App sagt damit, was zuerst zu entfernen ist. Andere Arten (`angebot`) liest er nicht. Fehlt `verweise`:
 *   `ungueltige-eingabe` (`feld: 'verweise'`). `speicher` hält dieselbe Sperre als `konflikt` (seit v1.4/v1.6), auch für ein
 *   Undo.
 * - Bauzeitenplan und Kostenkontrolle sperren nicht und werden nicht angefasst (D-74): Ein Vorgang behält seinen schwachen
 *   Bezug (Befund der Terminrechnung bzw. der App), Undo stellt alles her.
 * - ChangeSet wie `LeistungsverzeichnisLoeschen`: `kopf.vorher` der ganze Kopf, `kopf.nachher: null`, alle Knoten unter
 *   `knoten.entfernt`, alle Summen unter `summen.vorher.entfernt`, `summen.vorher.gesamt` gesetzt. Die Umkehrung legt das
 *   Auftrags-LV mit derselben Kennung wieder an.
 * - Angebot, LV und Nachtragsangaben bleiben unverändert; einen Status „Zuschlag erteilt“ gibt es nicht (der Zuschlag ist das
 *   Bestehen des Auftrags-LV, D-21).
 */
export interface ZuschlagZuruecknehmen {
  readonly art: 'ZuschlagZuruecknehmen';
}

// --- Aufmaß (v1.4, A2; D-36 (1); Ausführer in `abrechnung`, Ticket 80) ------------------------------------------
//
// Der Ausführer sieht nur das Blatt (Signatur `AufmassBefehlAusfuehren`, D-70.3) und prüft die Form; den Bezug zum
// Auftrags-LV prüft `aufmassPruefen` als Befund (U5), die Eindeutigkeit der Nummer `speicher` (`konflikt`). ChangeSet aller
// Befehle: `AufmassChangeSet` mit dem ganzen Blatt vorher und nachher (D-36 (8)).

/**
 * Legt ein Aufmaßblatt an, leer oder mit Zeilen (Erfassung, GAEB-X31-Import; D-33). Zustand `null`. Der Ausführer prüft die
 * Form: `nummer` ganze Zahl ≥ 1, jede Position höchstens einmal, Mengen kanonisch mit 3 Stellen; einen Ansatz `[]` legt er
 * als `null` ab (siehe `AufmassKopf`, `Aufmassposition`). Massenbefehl (siehe `MASSENBEFEHLSARTEN`): Ein X31-Import trägt
 * eine Zeile je Position mit ihren Ansatzzeilen.
 */
export interface AufmassAnlegen {
  readonly art: 'AufmassAnlegen';
  readonly aufmass: Aufmass;
}

/** Setzt Bezeichnung und Datum des Blatts; die Nummer bleibt (siehe `AufmassKopf.nummer`). */
export interface AufmasskopfSetzen {
  readonly art: 'AufmasskopfSetzen';
  readonly bezeichnung: string;
  readonly datum: string | null;
}

/**
 * Setzt die Zeile einer Position: ersetzt eine vorhandene Zeile derselben Position an ihrer Stelle, sonst kommt sie ans
 * Ende. Ansatz und Menge kommen zusammen (die App rechnet die Menge mit `mengen`; Lesarten wie `MengenansatzSetzen`, D-22,
 * siehe `Aufmassposition`).
 */
export interface AufmasspositionSetzen {
  readonly art: 'AufmasspositionSetzen';
  readonly position: Aufmassposition;
}

/** Entfernt die Zeile der Position aus dem Blatt; hat das Blatt keine, `ungueltige-eingabe` (`feld: 'positionId'`). */
export interface AufmasspositionEntfernen {
  readonly art: 'AufmasspositionEntfernen';
  readonly positionId: PositionId;
}

/**
 * Löscht das Blatt samt Zeilen. Unumkehrbar im Sinne von Q5 (Bestätigung in der Oberfläche, Undo); das ChangeSet trägt
 * den vollen Stand (`aufmass.vorher`). Steht das Blatt in einer Rechnung (`Rechnung.aufmassIds`), weist `speicher` mit
 * `konflikt` ab: Die Rechnung verlöre still einen Teil ihrer Menge.
 */
export interface AufmassLoeschen {
  readonly art: 'AufmassLoeschen';
}

/** Befehle gegen ein Aufmaßblatt (Zustand: `AufmassZustand`; v1.4, Ticket 70 Punkt 6). */
export type AufmassBefehl =
  AufmassAnlegen | AufmasskopfSetzen | AufmasspositionSetzen | AufmasspositionEntfernen | AufmassLoeschen;

// --- Rechnung (v1.4, A3; D-34, D-36 (2); Ausführer in `abrechnung`, Ticket 81) ----------------------------------
//
// Der Ausführer sieht nur die Rechnung (Signatur `RechnungBefehlAusfuehren`, D-70.3) und prüft die Form. Was andere
// Rechnungen braucht, prüft die App vorher (`freigabeMoeglich`, Ticket 81) und `speicher` als `konflikt` (Q5), die übrigen
// Regeln `rechnungPruefen` als Befund (U5). ChangeSet aller Befehle: `RechnungChangeSet` mit der ganzen Rechnung vorher
// und nachher (D-36 (8)). Eine freigegebene Rechnung ändert nur `RechnungsfreigabeAufheben` und (v1.7b) die Zahlungsbefehle;
// jeden anderen Befehl an ihr weist der Ausführer mit `rechnung-freigegeben` ab (Q5, D-70.4, D-128.7).

/**
 * Legt eine Rechnung an (Zustand `null`), von Hand oder aus einer XRechnung (Ticket 76: Angaben und geforderte Beträge).
 * `freigabe` ist `null` (sonst `ungueltige-eingabe`): Freigegeben wird nur über `RechnungFreigeben`. Hat das Auftrags-LV
 * schon eine freigegebene Rechnung mit größerer Nummer, weist `speicher` mit `konflikt` ab (Invariante an `Rechnung`).
 * Kein Massenbefehl. v1.7b (D-128.7): Vertragsstrafe, Skonto und Bauabzugsteuer darf die Rechnung mitbringen (die App
 * schlägt sie aus der vorigen Rechnung vor), Form wie bei ihren Befehlen; `zahlungen` nie (eine neue Rechnung ist nicht
 * freigegeben): sonst `ungueltige-eingabe` (`feld: 'zahlungen'`).
 */
export interface RechnungAnlegen {
  readonly art: 'RechnungAnlegen';
  readonly rechnung: Rechnung;
}

/**
 * Setzt die Angaben der Rechnung als ganze Werte: Art, Eingang, Rechnungsnummer des Auftragnehmers und geforderte Beträge
 * (siehe `Rechnung`). `rechnungsart` heißt hier so, weil `art` der Name des Befehls ist.
 */
export interface RechnungsangabenSetzen {
  readonly art: 'RechnungsangabenSetzen';
  readonly rechnungsart: Rechnungsart;
  readonly eingang: string | null;
  readonly rechnungsnummerAuftragnehmer: string | null;
  readonly gefordert: Rechnung['gefordert'];
}

/** Setzt die abgerechneten Aufmaßblätter als ganze Liste (vollständige kumulierte Menge, siehe `Rechnung.aufmassIds`). */
export interface RechnungsaufmasseSetzen {
  readonly art: 'RechnungsaufmasseSetzen';
  readonly aufmassIds: readonly AufmassId[];
}

/** Setzt die Abzüge als ganze Werte: Umlagen und die beiden Einbehaltssätze (siehe `Rechnung`). */
export interface RechnungsabzuegeSetzen {
  readonly art: 'RechnungsabzuegeSetzen';
  readonly umlagen: readonly Umlage[];
  readonly sicherheitSatz: Prozent | null;
  readonly gewaehrleistungSatz: Prozent | null;
}

/**
 * Gibt die Rechnung mit ihrem Zahlbetrag frei und friert ihn ein (D-34 (7)). Die App rechnet den Zahlbetrag mit
 * `abrechnung` und gibt ihn mit; der Ausführer rechnet nicht nach (Lesart wie `MengenansatzSetzen`). Nur, wenn alle
 * früheren Rechnungen (kleinere Nummer) freigegeben sind (D-34 (7)): Die App fragt vorher `freigabeMoeglich`, `speicher`
 * weist sonst mit `konflikt` ab. Eine schon freigegebene Rechnung weist der Ausführer mit `rechnung-freigegeben` ab.
 */
export interface RechnungFreigeben {
  readonly art: 'RechnungFreigeben';
  readonly zahlbetrag: Betrag;
}

/**
 * Hebt die Freigabe ausdrücklich auf (`freigabe` wird `null`), damit eine falsch freigegebene Rechnung korrigiert werden
 * kann (D-70.4); das Undo von `RechnungFreigeben` erzeugt dasselbe ChangeSet. Nur, solange keine spätere Rechnung (größere
 * Nummer) freigegeben ist, deren eingefrorener Zahlbetrag diesen abzieht (D-34 (7)): sonst `konflikt` in `speicher`, die
 * App bietet es dann nicht an. Unumkehrbar im Sinne von Q5: Die Oberfläche fragt ausdrücklich nach; eine nicht
 * freigegebene Rechnung weist der Ausführer mit `ungueltige-eingabe` ab. v1.7b (D-72, Q5): Hat die Rechnung Zahlungen, weist
 * der Ausführer mit `zahlungen-vorhanden` ab (erst die Zahlungen löschen); `speicher` hält dieselbe Regel als `konflikt`,
 * auch für das Undo von `RechnungFreigeben` (Invariante an `Rechnung`).
 */
export interface RechnungsfreigabeAufheben {
  readonly art: 'RechnungsfreigabeAufheben';
}

/**
 * Löscht die Rechnung (Q5: Bestätigung, Undo; das ChangeSet trägt den vollen Stand). Nur eine nicht freigegebene
 * (sonst `rechnung-freigegeben`). Kommt danach eine freigegebene Rechnung (größere Nummer), weist `speicher` auch ein
 * ChangeSet ohne Ausführer (Undo des Anlegens) mit `konflikt` ab.
 */
export interface RechnungLoeschen {
  readonly art: 'RechnungLoeschen';
}

// v1.7b (Ticket 128; A5, D-72; Ausführer in `abrechnung`, Ticket 143): Vertragsstrafe, Skonto und Bauabzugsteuer setzen nur
// an einer nicht freigegebenen Rechnung (sie gelten für die Zahlungsfreigabe, die mit der Freigabe entsteht; sonst
// `rechnung-freigegeben`). Zahlungen erfassen, ändern und löschen nur an einer freigegebenen (sonst `ungueltige-eingabe` mit
// `feld: 'freigabe'`, wie `RechnungsfreigabeAufheben` an einer nicht freigegebenen). Kein Befehl ändert den eingefrorenen
// Zahlbetrag.

/**
 * Setzt die Vertragsstrafe als ganzen Wert (siehe `Rechnung.vertragsstrafe`, `Vertragsstrafe`); `null` entfernt sie. Sie
 * ändert den Zahlbetrag, darum nur vor der Freigabe.
 */
export interface VertragsstrafeSetzen {
  readonly art: 'VertragsstrafeSetzen';
  readonly vertragsstrafe: Vertragsstrafe | null;
}

/** Setzt den Skonto als ganzen Wert (Satz und Skontofrist, siehe `Skonto`); `null` entfernt ihn. */
export interface SkontoSetzen {
  readonly art: 'SkontoSetzen';
  readonly skonto: Skonto | null;
}

/** Schaltet die Bauabzugsteuer ein (`true`) oder aus (`false`: danach fehlt `Rechnung.bauabzugsteuer`). */
export interface BauabzugsteuerSetzen {
  readonly art: 'BauabzugsteuerSetzen';
  readonly bauabzugsteuer: boolean;
}

/**
 * Erfasst eine Zahlung am Ende von `Rechnung.zahlungen`; die Kennung kommt aus `IdQuelle.zahlung` (A7). Hat die Rechnung
 * schon eine Zahlung mit dieser Kennung: `id-vergeben`. Form siehe `Zahlung`.
 */
export interface ZahlungErfassen {
  readonly art: 'ZahlungErfassen';
  readonly zahlung: Zahlung;
}

/**
 * Ersetzt Datum und Betrag der Zahlung mit derselben Kennung, an ihrer Stelle. Keine Zahlung mit dieser Kennung:
 * `ungueltige-eingabe` (`feld: 'zahlungId'`). Form wie `ZahlungErfassen`.
 */
export interface ZahlungAendern {
  readonly art: 'ZahlungAendern';
  readonly zahlung: Zahlung;
}

/**
 * Löscht eine Zahlung (Q5: Bestätigung, Undo; das ChangeSet trägt die ganze Rechnung). Mit der letzten Zahlung entfällt das
 * Feld `zahlungen`. Keine Zahlung mit dieser Kennung: `ungueltige-eingabe` (`feld: 'zahlungId'`).
 */
export interface ZahlungLoeschen {
  readonly art: 'ZahlungLoeschen';
  readonly zahlungId: ZahlungId;
}

/** Befehle gegen eine Rechnung (Zustand: `RechnungZustand`; v1.4, Ticket 70 Punkt 7; v1.7b, Ticket 128: sechs neue). */
export type RechnungBefehl =
  | RechnungAnlegen
  | RechnungsangabenSetzen
  | RechnungsaufmasseSetzen
  | RechnungsabzuegeSetzen
  | RechnungFreigeben
  | RechnungsfreigabeAufheben
  | RechnungLoeschen
  // v1.7b (Ticket 128; A5, D-72)
  | VertragsstrafeSetzen
  | SkontoSetzen
  | BauabzugsteuerSetzen
  | ZahlungErfassen
  | ZahlungAendern
  | ZahlungLoeschen;

// --- Kostenermittlung (v1.4, C3; D-36 (3); Ausführer in `kosten`, Ticket 82) ------------------------------------
//
// ChangeSet aller Befehle: `KostenermittlungChangeSet` mit der ganzen Kostenermittlung vorher und nachher (D-36 (8)). Der
// Ausführer prüft die Form der Nummern (Regel von `kgLesen`, D-24) und hält die Einträge nach Nummer geordnet und
// eindeutig (siehe `Kostenermittlung.eintraege`).

/**
 * Legt eine Kostenermittlung an (Zustand `null`), leer, von Hand oder aus einer CSV des Nutzers. Der Ausführer ordnet die
 * Einträge nach Nummer und weist doppelte Nummern mit `ungueltige-eingabe` ab. Kein Massenbefehl (D-70.5): höchstens ein
 * Eintrag je Kostengruppennummer, also höchstens 900 kurze Einträge.
 */
export interface KostenermittlungAnlegen {
  readonly art: 'KostenermittlungAnlegen';
  readonly kostenermittlung: Kostenermittlung;
}

/** Setzt Name und Stufe der Kostenermittlung. */
export interface KostenermittlungskopfSetzen {
  readonly art: 'KostenermittlungskopfSetzen';
  readonly name: string;
  readonly stufe: Kostenermittlungsstufe;
}

/** Setzt den Eintrag seiner Nummer: ersetzt einen vorhandenen, sonst kommt er an seine Stelle in der Ordnung nach Nummer. */
export interface KostenermittlungseintragSetzen {
  readonly art: 'KostenermittlungseintragSetzen';
  readonly eintrag: Kostenermittlungseintrag;
}

/** Entfernt den Eintrag der Nummer; gibt es keinen, `ungueltige-eingabe` (`feld: 'nummer'`). */
export interface KostenermittlungseintragEntfernen {
  readonly art: 'KostenermittlungseintragEntfernen';
  readonly nummer: Kostengruppennummer;
}

/**
 * Löscht die Kostenermittlung samt Einträgen (Q5: Bestätigung, Undo; das ChangeSet trägt den vollen Stand). Das Budget der
 * Kostenkontrolle wählt die App, es verweist nicht auf sie. v1.6 (Ticket 97 Punkt 5, D-56): Verweist eine Honorarberechnung
 * auf sie (`AnrechenbareKostenangabe` mit `art: 'kostenermittlung'`), weist `speicher` mit `konflikt` ab (Q5): Die
 * Honorarberechnung verlöre still ihre Grundlage.
 */
export interface KostenermittlungLoeschen {
  readonly art: 'KostenermittlungLoeschen';
}

/** Befehle gegen eine Kostenermittlung (Zustand: `KostenermittlungZustand`; v1.4, Ticket 70 Punkt 9). */
export type KostenermittlungBefehl =
  | KostenermittlungAnlegen
  | KostenermittlungskopfSetzen
  | KostenermittlungseintragSetzen
  | KostenermittlungseintragEntfernen
  | KostenermittlungLoeschen;

// --- Bauwerksmodell (v1.6, X1; D-50, D-51, D-53; Ausführer in `bim`, Ticket 108) ---------------------------------------
//
// Der Ausführer sieht nur das Modell (Signatur `BauwerksmodellBefehlAusfuehren`) und prüft die Form (`ungueltige-eingabe`
// mit `feld`); Verweise auf andere Aggregate und auf die Ablage der Bytes hält `speicher` (`konflikt`, Q5). ChangeSet:
// `BauwerksmodellChangeSet` (Kopf immer, Struktur und Bauteile nur beim Anlegen und Löschen).

/**
 * Legt ein Bauwerksmodell an (Zustand `null`): aus dem Leseergebnis von `ifc` (Ticket 107) und den Angaben der App (Kennung,
 * Name, Modelldatei, Vorgänger, Tag des Einlesens). Vorher legt die App die Bytes ab (`Speicher.modelldateien.ablegen`);
 * nennt `bauwerksmodell.datei` keine abgelegten Bytes dieser Länge, weist `speicher` mit `konflikt` ab (D-51), ebenso einen
 * Vorgänger, den es im Projekt nicht gibt.
 *
 * **Massenbefehl** (siehe `MASSENBEFEHLSARTEN`): Ein Modell hat bis zu 10.000 Bauteile (D-54); im Protokoll steht der Kopf
 * ohne Struktur und Bauteile.
 *
 * Der Ausführer prüft die Form: `hash` 64 Hexziffern klein, `groesse` ganze Zahl ≥ 0, `schema` einer der Werte, `eingelesen`
 * ein gültiges Datum, `name` nicht leer, `vorgaengerId` nicht die eigene Kennung, jede GlobalId in Form (siehe `IfcGlobalId`),
 * jede Menge mit nicht leerem Namen und kanonischem Wert (3 Stellen), Verweise innerhalb des Modells auf ein Objekt desselben
 * Modells (`elternGlobalId` und `strukturGlobalId` auf einen Strukturknoten, `teilVonGlobalId` auf ein Bauteil), die
 * Struktur ohne Ring. Doppelte GlobalIds weist er nicht ab (D-50: beide bleiben; ein Befund beim Lesen und in der
 * Modellprüfung). Der Befehl heißt im Feld wie das Aggregat (`bauwerksmodell`), wie jedes Anlegen eines Aggregats (D-97.2).
 */
export interface BauwerksmodellAnlegen {
  readonly art: 'BauwerksmodellAnlegen';
  readonly bauwerksmodell: Bauwerksmodell;
}

/**
 * Benennt das Modell um, das Einzige, was sich nach dem Anlegen ändert; `name` nicht leer (sonst `ungueltige-eingabe`).
 * ChangeSet: nur der Kopf, ohne Struktur und Bauteile (D-45, D-54). Der Ausführer bekommt wie jeder den ganzen Zustand, die
 * App lädt dafür das Modell (`bauwerksmodelle.laden`); Ticket 106 und 114 messen `laden` bei 10.000 Bauteilen (Nachtrag
 * Review, D-66; Offene Typfrage 6, Ticket 97).
 */
export interface BauwerksmodellUmbenennen {
  readonly art: 'BauwerksmodellUmbenennen';
  readonly name: string;
}

/**
 * Löscht das Modell samt Struktur und Bauteilen. Unumkehrbar im Sinne von Q5: Die Oberfläche fragt ausdrücklich (D-51); das
 * ChangeSet trägt den vollen Stand für Undo. `speicher` weist mit `konflikt` ab, solange ein anderes Modell dieses als
 * Vorgänger nennt oder ein Mangel auf es verweist (`Mangel.bauteil.bauwerksmodellId`). Die Bytes der Datei bleiben in der
 * Ablage, bis kein Modell sie mehr nennt (siehe `Modelldateiablage`); so findet ein Undo in derselben Sitzung sie wieder.
 */
export interface BauwerksmodellLoeschen {
  readonly art: 'BauwerksmodellLoeschen';
}

/** Befehle gegen ein Bauwerksmodell (Zustand: `BauwerksmodellZustand`; v1.6, Ticket 97 Punkt 1). */
export type BauwerksmodellBefehl = BauwerksmodellAnlegen | BauwerksmodellUmbenennen | BauwerksmodellLoeschen;

// --- Bauzeitenplan (v1.6, X2; D-57; Ausführer in `bauzeit`, Ticket 109) ------------------------------------------------
//
// Der Ausführer sieht nur den Plan (Signatur `BauzeitenplanBefehlAusfuehren`) und prüft die Form (`ungueltige-eingabe` mit
// `feld`; Lesarten an `Bauzeitenplan`, `Vorgang`, `Anordnungsbeziehung`, `Arbeitskalender`, `Isttermine`). Fachliche
// Auffälligkeiten (Zyklus über Anordnungsbeziehungen, Beziehung oder Terminvorgabe an einem Sammelvorgang) sind Befunde der
// Terminrechnung, keine Fehler (U5). ChangeSet aller Befehle: `BauzeitenplanChangeSet` mit dem ganzen Plan vorher und nachher
// (D-57; Ticket 106 misst Undo bei 1.000 Vorgängen, über dem Budget folgt `Aenderungen<Vorgang>`).

/**
 * Legt einen Bauzeitenplan an (Zustand `null`), leer oder mit Vorgängen (etwa als Kopie eines Plans oder aus einer Fixture).
 * Der Ausführer prüft die Form aller Teile und die Dokumentreihenfolge der Vorgänge (siehe `Bauzeitenplan`); doppelte
 * Kennungen von Vorgängen: `ungueltige-eingabe`. Kein Massenbefehl (D-97.9): Ein Plan entsteht meist leer und wächst über
 * `VorgangSetzen`.
 */
export interface BauzeitenplanAnlegen {
  readonly art: 'BauzeitenplanAnlegen';
  readonly bauzeitenplan: Bauzeitenplan;
}

/** Setzt Name, Projektbeginn und Arbeitskalender des Plans als ganze Werte; die Vorgänge bleiben. */
export interface BauzeitenplankopfSetzen {
  readonly art: 'BauzeitenplankopfSetzen';
  readonly name: string;
  readonly projektbeginn: string;
  readonly kalender: Arbeitskalender;
}

/**
 * Setzt einen Vorgang: legt ihn an (seine Kennung steht noch nicht im Plan) oder ersetzt den Vorgang mit dieser Kennung, und
 * legt seine Lage fest (Lesart, vorläufige Annahme, Entscheidung offen):
 * - Lage: unter `vorgang.elternId` direkt hinter dem Geschwister `nach` (ein Vorgang mit derselben `elternId`, sonst
 *   `ungueltige-eingabe` mit `feld: 'nach'`); `nach: null` heißt als erstes Kind (bzw. als erster Vorgang der obersten Ebene).
 *   Beim Ersetzen zieht der Teilbaum des Vorgangs mit; wer ihn nicht verschieben will, nennt das Geschwister, hinter dem er
 *   schon steht.
 * - Die Kinder eines ersetzten Vorgangs bleiben seine Kinder; seine Kennung ändert sich nie.
 * - Anordnungsbeziehungen nennen nur Vorgänge, die nach dem Befehl im Plan stehen (sonst `ungueltige-eingabe`); einen
 *   Vorgänger, den es noch nicht gibt, setzt die App nach dessen Anlegen.
 */
export interface VorgangSetzen {
  readonly art: 'VorgangSetzen';
  readonly vorgang: Vorgang;
  readonly nach: VorgangId | null;
}

/**
 * Entfernt einen Vorgang samt seinem Teilbaum (Lesart wie `KnotenLoeschen`, vorläufige Annahme, Entscheidung offen) und
 * im selben ChangeSet jede Anordnungsbeziehung anderer Vorgänge, die einen entfernten Vorgang nennt, damit nie ein Verweis
 * hängt. Eine Kennung ohne Vorgang im Plan: `knoten-unbekannt` (ein Vorgang ist ein Knoten des Plans). Q5: Hat der Vorgang
 * Kinder oder Nachfolger, fragt die Oberfläche nach; das ChangeSet trägt den ganzen Plan vorher (Undo).
 */
export interface VorgangEntfernen {
  readonly art: 'VorgangEntfernen';
  readonly vorgangId: VorgangId;
}

/** Löscht den Plan samt Vorgängen (Q5: Bestätigung, Undo; das ChangeSet trägt den vollen Stand). Kein Aggregat verweist darauf. */
export interface BauzeitenplanLoeschen {
  readonly art: 'BauzeitenplanLoeschen';
}

/** Befehle gegen einen Bauzeitenplan (Zustand: `BauzeitenplanZustand`; v1.6, Ticket 97 Punkt 4). */
export type BauzeitenplanBefehl =
  BauzeitenplanAnlegen | BauzeitenplankopfSetzen | VorgangSetzen | VorgangEntfernen | BauzeitenplanLoeschen;

// --- Honorarberechnung (v1.6, X3; D-56; Ausführer in `honorar`, Ticket 110) --------------------------------------------
//
// Der Ausführer sieht nur die Honorarberechnung (Signatur `HonorarberechnungBefehlAusfuehren`) und prüft die Form
// (`ungueltige-eingabe` mit `feld`); was die HOAI anders vorsieht, ist ein Befund der Rechnung (siehe `Honorarobjekt`, U5). Den
// Verweis auf eine Kostenermittlung hält `speicher` (`konflikt`, Q5). ChangeSet aller Befehle: `HonorarberechnungChangeSet`
// mit der ganzen Honorarberechnung vorher und nachher.

/** Legt eine Honorarberechnung an (Zustand `null`), leer oder mit Objekten. Kein Massenbefehl (wenige, kurze Objekte). */
export interface HonorarberechnungAnlegen {
  readonly art: 'HonorarberechnungAnlegen';
  readonly honorarberechnung: Honorarberechnung;
}

/**
 * Setzt den ganzen Inhalt der Honorarberechnung (Name, Objekte, Nebenkosten, MwSt-Satz) als ganze Werte; Kennung und Projekt
 * bleiben. Ein Befehl für jede Änderung im Formular (ein Undo-Schritt), auch das Umbenennen.
 */
export interface HonorarberechnungSetzen {
  readonly art: 'HonorarberechnungSetzen';
  readonly name: string;
  readonly objekte: readonly Honorarobjekt[];
  readonly nebenkosten: Nebenkostenangabe | null;
  readonly mwstSatz: Prozent;
}

/** Löscht die Honorarberechnung (Q5: Bestätigung, Undo; das ChangeSet trägt den vollen Stand). Kein Aggregat verweist darauf. */
export interface HonorarberechnungLoeschen {
  readonly art: 'HonorarberechnungLoeschen';
}

/** Befehle gegen eine Honorarberechnung (Zustand: `HonorarberechnungZustand`; v1.6, Ticket 97 Punkt 5). */
export type HonorarberechnungBefehl =
  HonorarberechnungAnlegen | HonorarberechnungSetzen | HonorarberechnungLoeschen;

// --- Mängel und Bautagebuch (v1.6, X4; D-57; Ausführer in `bauleitung`, Ticket 111) -------------------------------------
//
// Kleine Einzelaggregate (D-57). Anders als die übrigen Ausführer sieht der Ausführer hier außer seinem Aggregat den **Bestand**
// des Projekts (die übrigen Mängel bzw. Bautagebucheinträge), weil er die eindeutige Nummer bzw. das eindeutige Datum prüft
// (D-57; Signaturen `MangelBefehlAusfuehren`, `BautagebucheintragBefehlAusfuehren`); `speicher` hält beides zusätzlich
// (`konflikt`, auch für ein Undo ohne Ausführer). ChangeSets: das ganze, kleine Aggregat vorher und nachher.

/**
 * Legt einen Mangel an (Zustand `null`). Der Ausführer prüft die Form (siehe `Mangel`), den ganzen Verlauf (erster Eintrag
 * `offen`, jeder weitere ein zulässiger Wechsel, sonst `statuswechsel-unzulaessig`; Daten nicht fallend) und die Nummer gegen
 * den Bestand. Mit einem Verlauf aus mehreren Einträgen lässt sich ein schon angezeigter Mangel nacherfassen.
 */
export interface MangelAnlegen {
  readonly art: 'MangelAnlegen';
  readonly mangel: Mangel;
}

/**
 * Setzt die Angaben des Mangels als ganze Werte: alles außer Kennung, Projekt, Nummer und Verlauf (die Nummer bleibt fest, der
 * Verlauf ändert sich nur über `MangelstatusSetzen`). `festgestellt` nach dem Datum des ersten Verlaufseintrags:
 * `ungueltige-eingabe` (`feld: 'festgestellt'`). Name wie `RechnungsangabenSetzen` (D-97.13).
 */
export interface MangelangabenSetzen {
  readonly art: 'MangelangabenSetzen';
  readonly titel: string;
  readonly beschreibung: string | null;
  readonly ort: string | null;
  readonly auftragsLvId: Mangel['auftragsLvId'];
  readonly positionId: Mangel['positionId'];
  readonly bauteil: Mangel['bauteil'];
  readonly festgestellt: string;
  readonly frist: string | null;
}

/**
 * Wechselt den Status: hängt `eintrag` an den Verlauf an (Glossar „Mängelverlauf“). Ein Wechsel, den `Mangelstatus` nicht
 * zulässt (auch zum selben Status): `statuswechsel-unzulaessig`; ein Datum vor dem letzten Eintrag: `ungueltige-eingabe`
 * (`feld: 'datum'`). Eine neue Frist (etwa zur Mängelanzeige) setzt die App im selben Undo-Schritt mit `MangelangabenSetzen`;
 * seit dem Nachtrag Review (D-66) trägt ein Eintrag `angezeigt` dieselbe Frist auch selbst (`Mangelverlaufseintrag.frist`).
 */
export interface MangelstatusSetzen {
  readonly art: 'MangelstatusSetzen';
  readonly eintrag: Mangelverlaufseintrag;
}

/** Löscht den Mangel (Q5: Bestätigung, Undo; das ChangeSet trägt den vollen Stand). Kein Aggregat verweist auf ihn. */
export interface MangelLoeschen {
  readonly art: 'MangelLoeschen';
}

/** Befehle gegen einen Mangel (Zustand: `MangelZustand`; v1.6, Ticket 97 Punkt 6). */
export type MangelBefehl = MangelAnlegen | MangelangabenSetzen | MangelstatusSetzen | MangelLoeschen;

/**
 * Setzt einen Bautagebucheintrag: mit Zustand `null` legt er ihn an, sonst ersetzt er den Eintrag des Zustands (gleiche
 * Kennung und gleiches Projekt, sonst `ungueltige-eingabe`). Ein Datum, das im Bestand schon ein anderer Eintrag trägt:
 * `ungueltige-eingabe` (`feld: 'datum'`); die App zeigt dazu einen eigenen Hinweis (Ticket 120).
 */
export interface BautagebucheintragSetzen {
  readonly art: 'BautagebucheintragSetzen';
  readonly eintrag: Bautagebucheintrag;
}

/** Löscht den Eintrag (Q5: Bestätigung, Undo; das ChangeSet trägt den vollen Stand). */
export interface BautagebucheintragLoeschen {
  readonly art: 'BautagebucheintragLoeschen';
}

/**
 * Befehle gegen einen Bautagebucheintrag (Zustand: `BautagebucheintragZustand`; v1.6, Ticket 97 Punkt 6). Name nach dem
 * Aggregat wie bei jedem anderen (`MangelBefehl`), nicht nach dem ganzen Bautagebuch (D-97.13).
 */
export type BautagebucheintragBefehl = BautagebucheintragSetzen | BautagebucheintragLoeschen;

// --- Einstellungen (v1.7a, Ticket 127; E10, E15, D-73; Ausführer in `kern`, Ticket 137) -------------------------------
//
// Befehle am globalen Aggregat `Einstellungen` (siehe `einstellungen.ts`): nicht im `Befehl` eines Projekts, nicht im
// Befehlsprotokoll und nicht in der Undo-Historie eines Projekts (D-73), sondern im Einstellungsprotokoll
// (`EinstellungenProtokolleintrag`; Nachtrag Review D-82, M1: A5 und ADR 0009 gelten ohne Ausnahme). Der Ausführer
// (`EinstellungenBefehlAusfuehren`) prüft die Form (`ungueltige-eingabe` mit `feld`); ChangeSet: `EinstellungenChangeSet` mit
// den ganzen Einstellungen vorher und nachher.

/** Setzt das Büro als ganzen Wert; `null` entfernt es. Leerer Name: `ungueltige-eingabe` (`feld: 'buero.name'`). */
export interface BueroSetzen {
  readonly art: 'BueroSetzen';
  readonly buero: Buero | null;
}

/**
 * Setzt ein eigenes Druckprofil: ersetzt das Profil gleichen Namens an seiner Stelle, sonst kommt es ans Ende. Umbenennen ist
 * `DruckprofilEntfernen` und `DruckprofilSetzen` hintereinander. Leerer Name oder `langtext.anzahl` keine ganze Zahl ≥ 1:
 * `ungueltige-eingabe`.
 */
export interface DruckprofilSetzen {
  readonly art: 'DruckprofilSetzen';
  readonly druckprofil: Druckprofil;
}

/** Entfernt das eigene Druckprofil dieses Namens; gibt es keines, `ungueltige-eingabe` (`feld: 'name'`). */
export interface DruckprofilEntfernen {
  readonly art: 'DruckprofilEntfernen';
  readonly name: string;
}

/**
 * Setzt die Kostengruppenbezeichnungen als ganze Liste (eine eingelesene CSV ersetzt die vorige; `[]` entfernt alle). Der
 * Ausführer ordnet nach Nummer, prüft die Form der Nummern (wie `KostengruppeSetzen`) und weist doppelte Nummern und leere
 * Bezeichnungen mit `ungueltige-eingabe` ab (die App fasst eine CSV vorher mit `bezeichnungenLesen` zusammen).
 */
export interface KostengruppenbezeichnungenSetzen {
  readonly art: 'KostengruppenbezeichnungenSetzen';
  readonly bezeichnungen: readonly Kostengruppenbezeichnung[];
}

/**
 * Übernimmt die Einstellungen aus einer Projektdatei nach D-73 (v1.7a Nachtrag, D-82 M1): füllt nur, was lokal fehlt, und
 * überschreibt nie. `einstellungen` ist der Block der Datei (`Projektdatei.einstellungen`), unverändert.
 *
 * - Büro: nur, wenn lokal keines gesetzt ist (`buero: null`).
 * - Druckprofile: jedes Profil der Datei, dessen Name lokal fehlt, kommt in der Reihenfolge der Datei ans Ende.
 * - Kostengruppenbezeichnungen: jede Bezeichnung der Datei, deren Nummer lokal fehlt, kommt an ihre Stelle in der Ordnung
 *   nach Nummer.
 *
 * Die Form prüft der Ausführer wie bei den einzelnen Befehlen. Was übernommen und was belassen wurde, folgt aus dem ChangeSet
 * (vorher und nachher je Schlüssel). Geschrieben wird der Befehl beim Einlesen einer Projektdatei von `speicher`
 * (`Speicher.projektdateiEinlesen` mit `einstellungsuebernahme`) in derselben Transaktion wie das Projekt; nur, wenn er etwas
 * übernimmt. Er gehört nicht zum Rückgängig der Einstellungen in der Sitzung: Er überschreibt nichts (Q5).
 */
export interface EinstellungenUebernehmen {
  readonly art: 'EinstellungenUebernehmen';
  readonly einstellungen: Einstellungen;
}

/**
 * Befehle an den Einstellungen (v1.7a; Zustand: `Einstellungen`). Nicht Teil von `Befehl` (D-73); protokolliert im
 * Einstellungsprotokoll (`EinstellungenProtokolleintrag`, D-82 M1).
 */
export type EinstellungenBefehl =
  | BueroSetzen
  | DruckprofilSetzen
  | DruckprofilEntfernen
  | KostengruppenbezeichnungenSetzen
  // v1.7a Nachtrag (D-82 M1)
  | EinstellungenUebernehmen;

// --- Rückgängig und Wiederholen (v1.2, S3; ADR 0006) ---------------------------------------------------------

/**
 * Macht den Befehl rückgängig, dessen Protokolleintrag `protokollId` ist (v1.2, S3). Kein Kern führt ihn aus: Sein
 * ChangeSet ist die Umkehrung des ChangeSets aus dem Undo-Stapel der Sitzung (ADR 0006; umkehrbar ohne Vorzustand
 * seit v1.1a). `speicher` schreibt ihn wie jeden Befehl, ein Eintrag je Befehl (A5); `Protokolleintrag.aggregat` ist
 * das Aggregat des ursprünglichen Befehls.
 *
 * Eine Befehlsfolge (mehrere Befehle aus einer Nutzeraktion) wird mit je einem `Rueckgaengig` je Befehl der Folge
 * zurückgenommen, in umgekehrter Reihenfolge (D-12); es gibt keinen Sammelbefehl.
 */
export interface Rueckgaengig {
  readonly art: 'Rueckgaengig';
  readonly protokollId: ProtokollId;
}

/**
 * Wiederholt einen rückgängig gemachten Befehl (v1.2, S3). `protokollId` nennt den Eintrag des **ursprünglichen**
 * Befehls (nicht den des `Rueckgaengig`); sein ChangeSet ist wieder das Original. Sonst wie `Rueckgaengig`.
 */
export interface Wiederholen {
  readonly art: 'Wiederholen';
  readonly protokollId: ProtokollId;
}

/** Befehle auf der Historie der Sitzung (v1.2). Nicht in `LvBefehl`: kein Kern führt sie aus. */
export type HistorienBefehl = Rueckgaengig | Wiederholen;

/**
 * Jeder Befehl, den das Befehlsprotokoll aufnimmt. v1.4 (Ticket 70 Punkt 10): dazu die Befehle an Aufmaßblatt, Rechnung
 * und Kostenermittlung. Jeder Befehlsname gehört zu genau einem Aggregat, außer `KostengruppeSetzen` und (v1.6)
 * `BauteileZuordnen` (je LV und Auftrags-LV; `Protokolleintrag.aggregat` unterscheidet).
 */
export type Befehl =
  | ProjektBefehl
  | LvBefehl
  | AngebotBefehl
  | AuftragsLvBefehl
  | HistorienBefehl
  // v1.4
  | AufmassBefehl
  | RechnungBefehl
  | KostenermittlungBefehl
  // v1.6 (Ticket 97)
  | BauwerksmodellBefehl
  | BauzeitenplanBefehl
  | HonorarberechnungBefehl
  | MangelBefehl
  | BautagebucheintragBefehl
  // v1.7a (Ticket 127): im Protokoll mit dem LV des Stands als Aggregat
  | LvStandBefehl;

/** Name eines Befehls, wie er im Protokoll steht. */
export type Befehlsart = Befehl['art'];

// --- Massenbefehle (v1.1b, Punkt 7; A5, E-13) ---------------------------------------------------------------

/**
 * Die Befehle, die ein ganzes Aggregat mit einer langen Liste von Knoten oder Zeilen anlegen (GAEB-Import, Laden
 * einer Fixture, X84-Import). Für sie genügen im Befehlsprotokoll Kopf und Prüfsumme (E-13, ADR 0009):
 * `Befehlskurzfassung` in `speicher.ts`. Alle anderen Befehle bleiben vollständig im Protokoll.
 *
 * Eine Liste, kein Merkmal am Befehl, damit der Typ `Befehl` und seine Handler unverändert bleiben. Ein neuer
 * Massenbefehl braucht ein Vertragsticket.
 *
 * v1.4 (Ticket 70 Punkt 10, D-70.5): dazu `AufmassAnlegen` (ein X31-Import trägt eine Zeile je Position des Auftrags-LV
 * samt Ansatzzeilen, wächst also mit dem LV wie `AngebotAnlegen`). Nicht: `NachtragUebernehmen` (ein Nachtrag ist kurz),
 * `RechnungAnlegen` (keine lange Liste), `KostenermittlungAnlegen` (höchstens ein Eintrag je Kostengruppennummer).
 *
 * v1.6 (Ticket 97 Punkt 1, D-54): dazu `BauwerksmodellAnlegen` (bis zu 10.000 Bauteile; der Kopf ist das Modell ohne
 * Struktur und Bauteile).
 */
export const MASSENBEFEHLSARTEN = [
  'LeistungsverzeichnisAnlegen',
  'AngebotAnlegen',
  'AuftragsLeistungsverzeichnisAnlegen',
  // v1.4
  'AufmassAnlegen',
  // v1.6 (Ticket 97 Punkt 1, D-54): bis zu 10.000 Bauteile; der Kopf ohne Struktur und Bauteile
  'BauwerksmodellAnlegen',
] as const;

/** Name eines Massenbefehls. */
export type Massenbefehlsart = (typeof MASSENBEFEHLSARTEN)[number];
