// SPDX-License-Identifier: AGPL-3.0-or-later
// ChangeSet (A6), Ergebniswerte und Fehler abgewiesener Befehle. Nur Typen.

import type {
  AngebotBefehl,
  AufmassBefehl,
  AuftragsLvBefehl,
  Einfuegeort,
  KostenermittlungBefehl,
  LvBefehl,
  ProjektBefehl,
  RechnungBefehl,
} from './befehle';
import type {
  AngebotId,
  AufmassId,
  AuftragsLeistungsverzeichnisId,
  KnotenId,
  KostenermittlungId,
  LeistungsverzeichnisId,
  LvStandId,
  Ordnungszahl,
  ProjektId,
  RechnungId,
  Zeitstempel,
} from './marken';
import type {
  Angebot,
  AngebotKopf,
  Angebotsposition,
  Aufmass,
  AuftragsLeistungsverzeichnis,
  AuftragsLvKopf,
  Knoten,
  Kostenermittlung,
  Leistungsverzeichnis,
  LvKopf,
  Papierkorbeintrag,
  Projekt,
  Rechnung,
} from './modell';
import type { Summenaenderung, Summenstand } from './summen';

// --- Ergebnis und Fehler ------------------------------------------------------------------------------------

/** Ergebniswert statt Ausnahme: erwartbare Fehler sind Werte. Gilt für Befehle, Parser, Speicher. */
export type Ergebnis<T, F> =
  { readonly ok: true; readonly wert: T } | { readonly ok: false; readonly fehler: F };

/** Grund, aus dem ein Befehl abgewiesen wird. Ein abgewiesener Befehl ändert nichts und erzeugt kein ChangeSet. */
export type Befehlsfehlercode =
  | 'ungueltige-eingabe' // Form oder Wert unzulässig (z. B. Hinweistext mit Menge/Preis, Skala falsch)
  /**
   * Der Baum des Aggregats hat keinen Knoten mit der genannten Kennung (die Kennung der Wurzel ist kein Knoten; eine
   * Position im Papierkorb steht nicht im Baum). v1.5 (D-71.3): nur dann; trifft ein Befehl einen vorhandenen Knoten der
   * falschen Art, gilt `knotenart-unzulaessig`.
   */
  | 'knoten-unbekannt'
  | 'eltern-unbekannt'
  | 'id-vergeben'
  | 'zyklus' // Verschieben unter den eigenen Unterbaum
  | 'ebene-ueberschritten' // mehr als 5 Gliederungsebenen
  /**
   * Die Knotenart passt nicht, z. B. Positionen unter einer Position. v1.5 (D-71.3): ebenso, wenn ein Feldbefehl einen
   * vorhandenen Knoten trifft, der das Feld nicht trägt (etwa eine Gliederung oder einen Hinweistext statt einer Position),
   * im LV wie im Auftrags-LV; siehe „Felder ändern“ in `befehle.ts`.
   */
  | 'knotenart-unzulaessig'
  | 'bezug-unbekannt' // Bezugs- oder Grundposition fehlt
  | 'oz-ungueltig' // Zeichen oder Länge verletzen die Maske
  | 'maske-ungueltig'
  | 'oz-doppelt' // v1.1a: Umnummerieren oder Vergabe würde eine Ordnungszahl doppelt belegen (F2; die Handeingabe lässt sie zu, U5)
  /**
   * v1.1a: Überlauf der Ordnungszahl, nur wenn auch der kleinste Schritt (1) nicht mehr in die Maske passt (F2, E-09).
   * Das Ausweichen von Schritt 10 auf 5, 2, 1 ist kein Fehler, sondern ein Hinweis (`oz-schritt-ausgewichen`,
   * `Befehlshinweis`); der Befehl wird dabei ausgeführt.
   */
  | 'oz-ueberlauf'
  | 'angebot-unbekannt'
  | 'befehl-nicht-zustaendig' // Befehl passt nicht zum übergebenen Zustand
  /**
   * v1.4 (D-34, Q5): Der Befehl würde eine freigegebene Rechnung ändern; an ihr gilt nur `RechnungsfreigabeAufheben`.
   * Der eingefrorene Zahlbetrag ändert sich nie still.
   */
  | 'rechnung-freigegeben';

export interface Befehlsfehler {
  readonly code: Befehlsfehlercode;
  /** Meldung für Entwickler und Protokoll; die deutsche Anzeige entsteht in der Oberfläche. */
  readonly meldung: string;
  readonly knotenId?: KnotenId;
  /** Betroffenes Feld, z. B. `menge`. */
  readonly feld?: string;
}

// --- Hinweise aus angenommenen Befehlen (v1.1a, Punkt 10) ------------------------------------------------------

/**
 * Stabiler Code eines Befehlshinweises. Geschlossene Liste wie `Befehlsfehlercode`; ein neuer Wert braucht ein
 * Vertragsticket. Die Zeichenketten sind Teil des Vertrags (Golden-Tests, Oberfläche).
 */
export type Befehlshinweiscode =
  /** F2: Bei Überlauf wich die OZ-Vergabe automatisch auf Schritt 5, 2 oder 1 aus. */
  | 'oz-schritt-ausgewichen'
  /** N5, E-06: Das Netto nach Nachlass ist negativ. Ein Befund, keine Sperre. */
  | 'netto-nach-nachlass-negativ'
  /**
   * v1.2, U5: `LeistungsverzeichnisAnlegen` (GAEB-Import) nahm eine OZ-Maske an, die der Kern beanstandet
   * (`maskePruefen`). Der Befehl wird ausgeführt; der Befund kommt als Hinweis mit (Ticket 30).
   */
  | 'oz-maske-ungueltig';

/**
 * Hinweis zu einem angenommenen Befehl. Der Befehl wird trotzdem ausgeführt und liefert sein ChangeSet; ein Hinweis
 * ist nie ein Grund, ihn abzuweisen (dafür gibt es `Befehlsfehler`). Er ist flüchtig: Er gehört zur Antwort auf den
 * Befehl, wird nicht gespeichert und von `LvChangeSetAnwenden` nicht ausgewertet. Die dauerhafte Fassung des
 * negativen Nettos ist der Prüfbefund der LV-Prüfung (K8), der denselben Code als `Pruefbefund.code` führt.
 */
export interface Befehlshinweis {
  readonly code: Befehlshinweiscode;
  /** Meldung für Entwickler und Protokoll; die deutsche Anzeige entsteht in der Oberfläche. */
  readonly meldung: string;
  readonly knotenId?: KnotenId;
  /** Betroffenes Feld, z. B. `ordnungszahl`. */
  readonly feld?: string;
}

// --- Zustände ------------------------------------------------------------------------------------------------

/** Zustand, auf dem LV-Befehle arbeiten: das LV samt dem zuletzt berechneten Summenstand. */
export interface LvZustand {
  readonly leistungsverzeichnis: Leistungsverzeichnis;
  readonly summen: Summenstand;
  /**
   * Papierkorb des LV (v1.2, D-12), nach `Papierkorbeintrag.nummer` aufsteigend (Reihenfolge des Hineinlegens). Fehlt:
   * leer. Er liegt am Zustand, nicht am LV oder `LvKopf`: Ein Kopf-ChangeSet trägt ihn nie, und ein GAEB-Import oder
   * `LeistungsverzeichnisAnlegen` bringt keinen mit. `LvStand` und `Projektdatei` tragen ihn über `LvZustand`.
   */
  readonly papierkorb?: readonly Papierkorbeintrag[];
}

export interface AngebotZustand {
  readonly angebot: Angebot;
  readonly summen: Summenstand;
}

/** Auftrags-LV samt Summen. */
export interface AuftragsLvZustand {
  readonly auftragsLeistungsverzeichnis: AuftragsLeistungsverzeichnis;
  readonly summen: Summenstand;
}

/**
 * Aufmaßblatt als Zustand seiner Befehle (v1.4, Ticket 70 Punkt 6). Ohne Summen: Die Mengen rechnet die App, Summen
 * entstehen erst in der Rechnungsprüfung (`abrechnung`) und werden nie gespeichert.
 */
export interface AufmassZustand {
  readonly aufmass: Aufmass;
}

/**
 * Rechnung als Zustand ihrer Befehle (v1.4, Ticket 70 Punkt 7). Ohne Prüfergebnis: Das rechnet `abrechnung` bei Bedarf
 * aus Auftrags-LV, Aufmaßblättern und früheren Rechnungen (D-36 (2)).
 */
export interface RechnungZustand {
  readonly rechnung: Rechnung;
}

/** Kostenermittlung als Zustand ihrer Befehle (v1.4, Ticket 70 Punkt 9). Ihre Summen rechnet `kosten` bei Bedarf (D-24). */
export interface KostenermittlungZustand {
  readonly kostenermittlung: Kostenermittlung;
}

// --- LV-Stand (v1.2, S3; ADR 0006) -----------------------------------------------------------------------------

/** Kopf eines LV-Stands: was das ChangeSet von `LvStandAnlegen` trägt (`LvChangeSet.lvStand`). */
export interface LvStandKopf {
  readonly id: LvStandId;
  readonly leistungsverzeichnisId: LeistungsverzeichnisId;
  readonly name: string;
}

/**
 * LV-Stand (v1.2, ADR 0006): ein eingefrorener, unveränderlicher Stand eines LV samt Summen. `speicher` legt ihn in
 * derselben Transaktion an wie das ChangeSet von `LvStandAnlegen`, aus dem gespeicherten Stand des LV; `angelegt` ist
 * `Protokolleintrag.wann` dieses Befehls. Er wird nie geändert; ein LV aus einem Stand zurückholen geht über
 * `LeistungsverzeichnisAnlegen` mit dem Inhalt des Stands (kein Zurückschreiben in das bestehende LV).
 */
export interface LvStand extends LvStandKopf {
  readonly angelegt: Zeitstempel;
  readonly zustand: LvZustand;
}

/** LV-Stand ohne den Zustand, für Listen (`LvStandRepository.auflisten`). */
export type LvStandUebersicht = Omit<LvStand, 'zustand'>;

// --- ChangeSet -----------------------------------------------------------------------------------------------

/**
 * Geänderter Wert mit altem und neuem Stand. `vorher: null` heißt neu, `nachher: null` heißt gelöscht. Bei einem
 * Aggregat (Projekt, LV, Angebot, Auftrags-LV) ist `nachher: null` das Löschen (v1.1a, Punkt 4); der volle Stand steht
 * dann in `vorher` und in den entfernten Elementen des ChangeSets.
 */
export interface Aenderung<T> {
  readonly vorher: T | null;
  readonly nachher: T | null;
}

/**
 * Geänderte Elemente einer Sammlung. `geaendert` trägt alten und neuen Stand, `entfernt` den vollständigen
 * Stand der entfernten Elemente: so lässt sich jedes ChangeSet ohne den Kern umkehren (Undo, S3).
 * `hinzugefuegt` ist so geordnet, dass Eltern vor Kindern stehen.
 */
export interface Aenderungen<T> {
  readonly hinzugefuegt: readonly T[];
  readonly geaendert: readonly { readonly vorher: T; readonly nachher: T }[];
  readonly entfernt: readonly T[];
}

export interface ProjektChangeSet {
  readonly art: 'projekt';
  readonly projektId: ProjektId;
  /** `nachher: null`: das Projekt wird gelöscht (`ProjektLoeschen`); `vorher` ist der volle Stand samt Bietern. */
  readonly projekt: Aenderung<Projekt>;
  /** Hinweise zum Befehl (v1.1a); fehlt: keine. */
  readonly hinweise?: readonly Befehlshinweis[];
}

/**
 * ChangeSet am Ausschreibungs-LV: geänderte Knoten und betroffene Summen (A6). `kopf` ist nur gesetzt, wenn sich
 * Stammdaten ändern oder das LV entsteht oder gelöscht wird. Geschwister, deren `reihenfolge` sich ändert, stehen
 * unter `geaendert`.
 *
 * Umkehrbar ohne Vorzustand (v1.1a): `kopf` und `knoten` tragen alte und neue Stände, `summen.vorher` die alten
 * Summen. Anlegen (`kopf.vorher: null`) und Löschen (`kopf.nachher: null`, alle Knoten in `knoten.entfernt`, alle Summen
 * in `summen.vorher.entfernt`) sind Gegenstücke: die Umkehrung des einen ist das andere.
 */
export interface LvChangeSet {
  readonly art: 'leistungsverzeichnis';
  readonly leistungsverzeichnisId: LeistungsverzeichnisId;
  readonly kopf: Aenderung<LvKopf> | null;
  readonly knoten: Aenderungen<Knoten>;
  readonly summen: Summenaenderung;
  /** Hinweise zum Befehl (v1.1a); fehlt: keine. */
  readonly hinweise?: readonly Befehlshinweis[];
  /**
   * Geänderte Papierkorbeinträge (v1.2, K9); fehlt: keine Änderung. Hineinlegen (`KnotenInPapierkorbLegen`) =
   * `knoten.entfernt` + `papierkorb.hinzugefuegt`; Wiederherstellen = `knoten.hinzugefuegt` + `papierkorb.entfernt`;
   * Entfernen und Leeren = `papierkorb.entfernt`, dazu unter `knoten.geaendert` die Knoten im Baum, deren Bezüge
   * (Zuschlags-`Bezugsposition`, `wahl.grundpositionId`) auf eine Position des entfernten Eintrags zeigten und nun
   * entfernt werden (D-12; siehe `Papierkorbeintrag`). Umkehrbar ohne Vorzustand wie seit v1.1a; die Umkehrung des
   * Entfernens legt den Eintrag mit seiner `nummer` zurück.
   */
  readonly papierkorb?: Aenderungen<Papierkorbeintrag>;
  /**
   * LV-Stand (v1.2, S3); fehlt: keine Änderung. `vorher: null`: `LvStandAnlegen`, `speicher` friert den gespeicherten
   * Stand des LV in derselben Transaktion ein. `nachher: null` kommt nur als Umkehrung vor: der Stand entfällt.
   * Ein `Wiederholen` danach friert den dann gespeicherten Stand neu ein, mit neuem `angelegt` (D-12). Ein Stand wird
   * nie geändert (beide Seiten gesetzt kommt nicht vor).
   */
  readonly lvStand?: Aenderung<LvStandKopf>;
}

export interface AngebotChangeSet {
  readonly art: 'angebot';
  readonly angebotId: AngebotId;
  readonly kopf: Aenderung<AngebotKopf> | null;
  readonly positionen: Aenderungen<Angebotsposition>;
  readonly summen: Summenaenderung;
  /** Hinweise zum Befehl (v1.1a); fehlt: keine. */
  readonly hinweise?: readonly Befehlshinweis[];
}

/**
 * ChangeSet am Auftrags-LV (v1.1a, Punkt 5), gleich gebaut wie `LvChangeSet`. Mehr als das Anlegen erzeugt bis zur
 * Vergabe (Welle 4) kein Befehl; der Typ ist aber schon vollständig, damit Speicher und Undo nichts nachrüsten müssen.
 *
 * v1.4 (Ticket 70 Punkt 2): `NachtragUebernehmen` liefert `kopf: null`, neue Knoten unter `knoten.hinzugefuegt` und die
 * betroffenen Summen; `KostengruppeSetzen` eine Knotenänderung ohne Summen. Entfernt ein ChangeSet eine Position, auf die
 * eine Aufmaßposition verweist (die Umkehrung einer Übernahme), oder löscht es das Auftrags-LV, solange Aufmaßblätter,
 * Rechnungen oder Nachtragsangaben eines LV darauf verweisen, weist `speicher` mit `konflikt` ab (Q5, wie beim
 * Papierkorb und Angeboten).
 */
export interface AuftragsLvChangeSet {
  readonly art: 'auftrags-leistungsverzeichnis';
  readonly auftragsLeistungsverzeichnisId: AuftragsLeistungsverzeichnisId;
  readonly kopf: Aenderung<AuftragsLvKopf> | null;
  readonly knoten: Aenderungen<Knoten>;
  readonly summen: Summenaenderung;
  /** Hinweise zum Befehl (v1.1a); fehlt: keine. */
  readonly hinweise?: readonly Befehlshinweis[];
}

/**
 * ChangeSet an einem Aufmaßblatt (v1.4, Ticket 70 Punkt 6; D-36 (8)): das ganze Blatt vorher und nachher, ohne Summen.
 * `aufmass.vorher: null` legt an, `nachher: null` löscht (der volle Stand steht dann in `vorher`), beide gesetzt ändern.
 * Umkehrbar ohne Vorzustand durch Tausch von `vorher` und `nachher` (Undo, ADR 0006). Bewusst grob: Auch eine einzelne
 * Zeile trägt das ganze Blatt (D-36 (8); Offene Typfrage, Ticket 70). In v1.5 vertagt (D-95.4): Ticket 94 misst ein Blatt
 * mit 5.000 Zeilen und versucht zuerst die Lösung in `speicher` (D-45, D-47).
 */
export interface AufmassChangeSet {
  readonly art: 'aufmass';
  readonly aufmassId: AufmassId;
  readonly aufmass: Aenderung<Aufmass>;
}

/**
 * ChangeSet an einer Rechnung (v1.4, Ticket 70 Punkt 7; D-36 (8)): die ganze Rechnung vorher und nachher, Lesart wie
 * `AufmassChangeSet`. Freigeben und Freigabe aufheben sind Gegenstücke (nur `freigabe` unterscheidet `vorher` und
 * `nachher`).
 *
 * Invariante (Q5, D-34 (7)): Die freigegebenen Rechnungen eines Auftrags-LV sind stets die mit den kleinsten Nummern.
 * `speicher` hält sie und weist mit `konflikt` ab, auch wenn das ChangeSet ohne Ausführer kommt (Undo): eine Freigabe,
 * solange eine frühere Rechnung desselben Auftrags-LV nicht freigegeben ist; das Löschen einer Rechnung oder das Entfernen
 * ihrer Freigabe, solange eine spätere freigegeben ist; das Anlegen einer Rechnung (`rechnung.vorher: null`), solange das
 * Auftrags-LV eine freigegebene Rechnung mit größerer Nummer hat (sonst würde eine gelöschte und neu angelegte Rechnung
 * zwischen eingefrorene Zahlbeträge geschoben und doppelt bezahlt). Dazu `konflikt` für eine Kennung in `aufmassIds`, zu
 * der es kein Blatt dieses Auftrags-LV gibt. Umsetzung Ticket 79, Befund der Prüfung Ticket 81.
 */
export interface RechnungChangeSet {
  readonly art: 'rechnung';
  readonly rechnungId: RechnungId;
  readonly rechnung: Aenderung<Rechnung>;
}

/**
 * ChangeSet an einer Kostenermittlung (v1.4, Ticket 70 Punkt 9; D-36 (8)): die ganze Kostenermittlung vorher und nachher,
 * Lesart wie `AufmassChangeSet`.
 */
export interface KostenermittlungChangeSet {
  readonly art: 'kostenermittlung';
  readonly kostenermittlungId: KostenermittlungId;
  readonly kostenermittlung: Aenderung<Kostenermittlung>;
}

/** Jedes ChangeSet, das `speicher` schreibt. v1.4 (Ticket 70 Punkt 10): dazu Aufmaßblatt, Rechnung und Kostenermittlung. */
export type ChangeSet =
  | ProjektChangeSet
  | LvChangeSet
  | AngebotChangeSet
  | AuftragsLvChangeSet
  // v1.4
  | AufmassChangeSet
  | RechnungChangeSet
  | KostenermittlungChangeSet;

// --- Signaturen für Kern und Vergabe -----------------------------------------------------------------------

/** Aus Befehl und Zustand wird ein ChangeSet oder ein Fehlerwert; rein und deterministisch (A2). */
export type LvBefehlAusfuehren = (
  zustand: LvZustand | null,
  befehl: LvBefehl,
) => Ergebnis<LvChangeSet, Befehlsfehler>;

export type AngebotBefehlAusfuehren = (
  zustand: AngebotZustand | null,
  befehl: AngebotBefehl,
) => Ergebnis<AngebotChangeSet, Befehlsfehler>;

export type ProjektBefehlAusfuehren = (
  zustand: Projekt | null,
  befehl: ProjektBefehl,
) => Ergebnis<ProjektChangeSet, Befehlsfehler>;

export type AuftragsLvBefehlAusfuehren = (
  zustand: AuftragsLvZustand | null,
  befehl: AuftragsLvBefehl,
) => Ergebnis<AuftragsLvChangeSet, Befehlsfehler>;

/**
 * Wendet ein ChangeSet auf einen Zustand an (reine Funktion). `null` als Zustand: das Aggregat entsteht erst
 * (`changeSet.kopf.vorher` ist `null`). `null` als Ergebnis (v1.1a): das Aggregat verschwindet
 * (`changeSet.kopf.nachher` ist `null`, also das Löschen eines LV oder die Umkehrung des Anlegens). Wer diese
 * Funktion liefert, ist `kern`.
 */
export type LvChangeSetAnwenden = (zustand: LvZustand | null, changeSet: LvChangeSet) => LvZustand | null;

/**
 * Wendet ein ChangeSet des Auftrags-LV an (v1.4, Ticket 70 Punkt 2), Lesart wie `LvChangeSetAnwenden`: `null` als
 * Zustand heißt „entsteht erst“, `null` als Ergebnis „verschwindet“ (die Umkehrung des Anlegens). Liefert `kern`
 * (Ticket 71).
 */
export type AuftragsLvChangeSetAnwenden = (
  zustand: AuftragsLvZustand | null,
  changeSet: AuftragsLvChangeSet,
) => AuftragsLvZustand | null;

/**
 * Kehrt ein ChangeSet des Auftrags-LV ohne Vorzustand um (v1.4, Ticket 70 Punkt 2; Undo, ADR 0006): Kopf und Knoten
 * vertauscht, Summen aus `summen.vorher`, wie beim LV. Liefert `kern` (Ticket 71); die App gibt dann ihren Umweg über die
 * Umkehrung eines LV-ChangeSets auf (D-64.4).
 */
export type AuftragsLvChangeSetUmkehren = (changeSet: AuftragsLvChangeSet) => AuftragsLvChangeSet;

// --- Signaturen der Aggregate aus v1.4 (Ticket 70 Punkt 10) ------------------------------------------------------
//
// Wie bei LV und Angebot: Ausführen ist rein und deterministisch (A2). Ein Ausführer sieht nur sein Aggregat und prüft die
// Form (D-70.3); Regeln über mehrere Aggregate prüfen reine Funktionen als Befund (`aufmassPruefen`, `rechnungPruefen`)
// oder vor dem Befehl (`freigabeMoeglich`), was nie verletzt sein darf `speicher` (`konflikt`). Anwenden: `null` als
// Zustand heißt „entsteht erst“, `null` als Ergebnis „wird gelöscht“. Umkehren: Tausch von `vorher` und `nachher` (ganze
// Aggregate, D-36 (8)). Liefern: `abrechnung` (Aufmaß Ticket 80, Rechnung Ticket 81), `kosten` (Kostenermittlung
// Ticket 82).

export type AufmassBefehlAusfuehren = (
  zustand: AufmassZustand | null,
  befehl: AufmassBefehl,
) => Ergebnis<AufmassChangeSet, Befehlsfehler>;

export type AufmassChangeSetAnwenden = (
  zustand: AufmassZustand | null,
  changeSet: AufmassChangeSet,
) => AufmassZustand | null;

export type AufmassChangeSetUmkehren = (changeSet: AufmassChangeSet) => AufmassChangeSet;

export type RechnungBefehlAusfuehren = (
  zustand: RechnungZustand | null,
  befehl: RechnungBefehl,
) => Ergebnis<RechnungChangeSet, Befehlsfehler>;

export type RechnungChangeSetAnwenden = (
  zustand: RechnungZustand | null,
  changeSet: RechnungChangeSet,
) => RechnungZustand | null;

export type RechnungChangeSetUmkehren = (changeSet: RechnungChangeSet) => RechnungChangeSet;

export type KostenermittlungBefehlAusfuehren = (
  zustand: KostenermittlungZustand | null,
  befehl: KostenermittlungBefehl,
) => Ergebnis<KostenermittlungChangeSet, Befehlsfehler>;

export type KostenermittlungChangeSetAnwenden = (
  zustand: KostenermittlungZustand | null,
  changeSet: KostenermittlungChangeSet,
) => KostenermittlungZustand | null;

export type KostenermittlungChangeSetUmkehren = (
  changeSet: KostenermittlungChangeSet,
) => KostenermittlungChangeSet;

// --- OZ-Vorschlag (v1.5, Ticket 95 Punkt 3; K9, F2, D-42.3, D-80.1) -----------------------------------------------

/**
 * Vorschlag des Kerns für die Ordnungszahl eines neuen Knotens (Glossar „OZ-Vorschlag“). Kein Befehl und kein ChangeSet: Wer
 * einen Befehl baut (die App, `nachtragUebernehmen` in `abrechnung`), fragt vorher und legt die OZ als Wert in den Befehl
 * (Befehle bleiben reine Daten). `ozIndex` ist für einen neuen Knoten immer `null`. `hinweis` ist gesetzt
 * (`oz-schritt-ausgewichen`), wenn der Standardschritt nicht passte (F2, D-42.3); ihn reicht der Aufrufer weiter oder
 * verwirft ihn, gespeichert wird er nie. v1.5: aus `kern` in den Vertrag übernommen, gleich gebaut; der Kern führt bis
 * Ticket 105 noch seinen eigenen Typ dieses Namens.
 */
export interface OzVorschlag {
  readonly ordnungszahl: Ordnungszahl;
  readonly ozIndex: string | null;
  readonly hinweis?: Befehlshinweis;
}

/**
 * OZ-Vorschlag für einen neuen Knoten der Art `art` am Ort `ort` (v1.5, Ticket 95 Punkt 3; D-80.1), rein und deterministisch
 * (A2). `null`: kein Vorschlag (kein Platz, ein Ort, den es im Baum nicht gibt, eine ungültige Maske, ein Elternknoten ohne
 * lesbare OZ oder eine Stufe, die die Maske nicht hat); die OZ bleibt dann leer, die LV-Prüfung meldet sie (U5, K8).
 *
 * Lesart (vorläufige Annahme, Entscheidung offen, enge Lesart):
 * - Eine Regel für LV und Auftrags-LV (D-42.3), mit Maske und Baum des übergebenen Aggregats. Wurzel ist dessen eigene
 *   Kennung (`WurzelId`): `LvZustand.leistungsverzeichnis.id` bzw. `AuftragsLvZustand.auftragsLeistungsverzeichnis.id`, im
 *   `ort` als `elternId`. Eine Kennung des Auftrags-LV wird dafür nie als LV-Kennung umgedeutet (so liest
 *   `nachtragUebernehmen` heute, D-80.1, bis der Kern diese Signatur liefert).
 * - Am Auftrags-LV legt kein Befehl einen einzelnen Knoten an oder nummeriert um (`AuftragsLvBefehl`). Der Vorschlag dient
 *   dort `nachtragUebernehmen` (Ticket 80): Die Gliederung „Nachtrag <nummer>“ bekommt die OZ für
 *   `{ art: 'ende', elternId: <Kennung des Auftrags-LV> }` (D-35, D-80.1).
 *
 * Liefert `kern` (Ticket 105; heute `ozVorschlag` nur mit `LvZustand`). Erweitert er den ersten Parameter seiner Funktion auf
 * beide Zustände, bleibt jeder heutige Aufruf gültig.
 */
export type OzVorschlagen = (
  zustand: LvZustand | AuftragsLvZustand,
  ort: Einfuegeort,
  art: 'position' | 'titel' | 'los',
) => OzVorschlag | null;
