// SPDX-License-Identifier: AGPL-3.0-or-later
// Repository-Schnittstellen für `speicher` (S1), Befehlsprotokoll und Projektdatei. Nur Typen.

import type { Befehl } from './befehle';
import type {
  AngebotZustand,
  AufmassZustand,
  AuftragsLvZustand,
  ChangeSet,
  Ergebnis,
  KostenermittlungZustand,
  LvStand,
  LvStandUebersicht,
  LvZustand,
  RechnungZustand,
} from './changeset';
import type {
  AngebotId,
  AufmassId,
  AuftragsLeistungsverzeichnisId,
  KostenermittlungId,
  LeistungsverzeichnisId,
  LvStandId,
  NutzerId,
  ProjektId,
  ProtokollId,
  RechnungId,
  Zeitstempel,
} from './marken';
import type {
  AngebotKopf,
  AufmassKopf,
  AuftragsLvKopf,
  Kostenermittlung,
  LvInhalt,
  Nachtragsangaben,
  Projekt,
  Rechnung,
} from './modell';
import type { Betrag } from './zahlen';
import type { BauwerksmodellKopf } from './bim';

// --- Befehlsprotokoll (ADR 0009) -----------------------------------------------------------------------------

/**
 * Aggregat, auf das ein Befehl wirkt. `art` ist dieselbe wie `ChangeSet.art` des Aggregats. v1.4 (Ticket 70 Punkt 10):
 * dazu Aufmaßblatt, Rechnung und Kostenermittlung; `KostengruppeSetzen` steht mit `leistungsverzeichnis` oder
 * `auftrags-leistungsverzeichnis` im Protokoll.
 */
export type AggregatBezug =
  | { readonly art: 'projekt'; readonly id: ProjektId }
  | { readonly art: 'leistungsverzeichnis'; readonly id: LeistungsverzeichnisId }
  | { readonly art: 'angebot'; readonly id: AngebotId }
  | { readonly art: 'auftrags-leistungsverzeichnis'; readonly id: AuftragsLeistungsverzeichnisId }
  // v1.4
  | { readonly art: 'aufmass'; readonly id: AufmassId }
  | { readonly art: 'rechnung'; readonly id: RechnungId }
  | { readonly art: 'kostenermittlung'; readonly id: KostenermittlungId };

/**
 * Prüfsumme über einen vollständigen Befehl (v1.1b, Punkt 7; E-13). Der Algorithmus ist ein Feld, damit er
 * wechselbar bleibt, ohne dass alte Einträge ungültig werden.
 *
 * Die zwei Werte sind die Hashverfahren, die jede Laufzeit von `speicher` ohne Abhängigkeit liefert (Web Crypto
 * `SubtleCrypto.digest`: Browser und Node); SHA-1 ist ausgeschlossen (Kollisionen bekannt). Die Wahl ist vorläufig
 * (Entscheidung offen); neue Werte brauchen ein Vertragsticket.
 */
export type Pruefsummenalgorithmus = 'sha-256' | 'sha-512';

export interface Pruefsumme {
  readonly algorithmus: Pruefsummenalgorithmus;
  /**
   * Hexadezimal, Kleinbuchstaben. Vorläufige Annahme, Entscheidung offen (enge Lesart): gebildet über die UTF-8-Bytes
   * der kanonischen JSON-Darstellung des vollständigen Befehls (Schlüsselreihenfolge wie in der Projektdatei, G-56).
   * Wer die Summe bildet, ist `speicher`; der Vertrag nennt nur, worüber sie gilt.
   */
  readonly wert: string;
}

/**
 * Kopf eines Massenbefehls: der Befehl ohne seine lange Liste (v1.1b, Punkt 7). Genau die Teile, die ein Mensch
 * im Protokoll lesen will (wer legt was in welchem Projekt an), und nichts, was mit der Zahl der Positionen wächst.
 */
export type Massenbefehlskopf =
  | {
      readonly art: 'LeistungsverzeichnisAnlegen';
      readonly id: LeistungsverzeichnisId;
      readonly projektId: ProjektId;
      /** Der Inhalt ohne `knoten`: Name, Maske, MwSt, Nachlass, Wurzel und Kopfdaten. */
      readonly inhalt: Omit<LvInhalt, 'knoten'>;
    }
  | {
      readonly art: 'AngebotAnlegen';
      /** Das Angebot ohne `positionen`. */
      readonly angebot: AngebotKopf;
    }
  | {
      readonly art: 'AuftragsLeistungsverzeichnisAnlegen';
      /** Das Auftrags-LV ohne `knoten`. */
      readonly auftragsLeistungsverzeichnis: AuftragsLvKopf;
    }
  | {
      readonly art: 'AufmassAnlegen';
      /** Das Aufmaßblatt ohne `positionen` (v1.4, Ticket 70 Punkt 10). */
      readonly aufmass: AufmassKopf;
    }
  | {
      readonly art: 'BauwerksmodellAnlegen';
      /** Das Bauwerksmodell ohne `struktur` und `bauteile` (v1.6, Ticket 97 Punkt 1, D-54). */
      readonly bauwerksmodell: BauwerksmodellKopf;
    };

/**
 * Kurzfassung eines Massenbefehls im Protokoll (v1.1b, Punkt 7; E-13, ADR 0009): Kopf und Prüfsumme statt des
 * ganzen Befehls. Der Kopf nennt die Befehlsart (`kopf.art`, immer eine `Massenbefehlsart`).
 */
export interface Befehlskurzfassung {
  readonly art: 'Befehlskurzfassung';
  readonly kopf: Massenbefehlskopf;
  readonly pruefsumme: Pruefsumme;
}

/**
 * Ein Eintrag des Befehlsprotokolls: wer, was, wann. Nebenbuch, kein Quellzustand (ADR 0009). Genau ein Eintrag
 * je Befehl; `wann` liefert der Aufrufer (A2).
 *
 * `befehl` ist der vollständige Befehl, bei einem Massenbefehl (`MASSENBEFEHLSARTEN`) die Kurzfassung (E-13). Der Typ
 * erzwingt das nicht; wer protokolliert (`speicher`), wählt die Kurzfassung für jeden Massenbefehl.
 *
 * v1.2: Auch `Rueckgaengig` und `Wiederholen` (`HistorienBefehl`) stehen hier, je ein eigener Eintrag (A5); ihr
 * `aggregat` ist das des ursprünglichen Befehls. Kein neuer Typ für das Befehlsprotokoll nötig.
 */
export interface Protokolleintrag {
  readonly id: ProtokollId;
  readonly projektId: ProjektId;
  readonly aggregat: AggregatBezug;
  readonly wer: NutzerId;
  readonly wann: Zeitstempel;
  readonly befehl: Befehl | Befehlskurzfassung;
}

// --- Fehler ----------------------------------------------------------------------------------------------------

export type Speicherfehlercode =
  | 'nicht-gefunden'
  | 'konflikt' // v1.1a: ChangeSet passt nicht zum gespeicherten Stand (`vorher` weicht ab, abhängige Aggregate bestehen noch)
  | 'existiert-bereits' // v1.1a: z. B. Projektdatei-Import eines Projekts, das schon vorhanden ist
  | 'speicher-voll' // Quote erschöpft (Q5)
  | 'gesperrt' // z. B. OPFS nicht verfügbar
  | 'datei-ungueltig' // Projektdatei nicht lesbar oder nicht schemakonform
  | 'schema-zu-neu' // Projektdatei stammt von einer neueren Version
  | 'migration-fehlgeschlagen'
  | 'unbekannt';

/** Speicherfehler als Wert: nie stiller Datenverlust (Q5). */
export interface Speicherfehler {
  readonly code: Speicherfehlercode;
  readonly meldung: string;
}

// --- Repositories ---------------------------------------------------------------------------------------------

export interface Projektuebersicht {
  readonly id: ProjektId;
  readonly name: string;
}

export interface ProjektRepository {
  auflisten(): Promise<Ergebnis<readonly Projektuebersicht[], Speicherfehler>>;
  laden(id: ProjektId): Promise<Ergebnis<Projekt, Speicherfehler>>;
}

/**
 * Ein LV in der Liste des Projekts (v1.3, Ticket 53 Punkt 1): Kennung und Name, ohne Knoten, wie `Projektuebersicht`.
 * Vorläufige Annahme, Entscheidung offen (enge Lesart): keine Summen (Offene Typfrage, Ticket 53). v1.4 (Review D-43): dazu
 * `nachtrag?` und `vorlage?` aus dem Kopf. v1.5 (Ticket 95 Punkt 5, D-92.4): davon abweichend genau eine Summe, das
 * gespeicherte Netto nach Nachlass; weitere Summen nicht.
 */
export interface LvUebersicht {
  readonly id: LeistungsverzeichnisId;
  readonly name: string;
  /**
   * Nachtragsangaben des LV, wie am `LvKopf` (v1.4, Review D-43, additiv). Fehlt: kein Nachtrags-LV; nie `null`. So zeigt die
   * Projektseite „Nachtrag N01“, ohne jedes LV zu laden (Ticket 86). `speicher` füllt es aus dem Kopf (Ticket 79).
   */
  readonly nachtrag?: Nachtragsangaben;
  /**
   * Kennzeichen „Muster-LV“, wie am `LvKopf` (v1.4, Review D-43, additiv): nur `true` oder fehlt, nie `false`. So findet die
   * App die Vorlagen eines Projekts, ohne jedes LV zu laden (Ticket 90). `speicher` füllt es aus dem Kopf (Ticket 79).
   */
  readonly vorlage?: true;
  /**
   * Das gespeicherte Netto nach Nachlass des LV (v1.5, Ticket 95 Punkt 5; D-92.4, additiv): derselbe Wert wie
   * `LvZustand.summen.gesamt.nettoNachNachlass` des gespeicherten Stands; `speicher` füllt es aus den gespeicherten Summen
   * (Ticket 106) und rechnet nichts nach. So zeigt die Projektseite den Wert, ohne jedes LV zu laden (Ticket 121). Fehlt: noch
   * nicht gerechnet, etwa solange `speicher` es nicht liefert (die App lädt das LV dann wie bisher); nie `null`. Negativ ist
   * möglich (ein Befund der LV-Prüfung, E-06). Der Name ist der aus `Gesamtsummen`, weil `netto` dort das Netto vor Nachlass
   * ist (L2). Alternative: siehe Offene Typfragen, Ticket 95.
   */
  readonly nettoNachNachlass?: Betrag;
}

export interface LvRepository {
  /**
   * Die LVs des Projekts ohne Knoten (v1.3), nach Name deutsch verglichen (`Intl.Collator('de-DE')`), gleiche Namen
   * nach Kennung (wie die Projektliste). Unbekanntes Projekt: `nicht-gefunden`.
   */
  auflisten(projektId: ProjektId): Promise<Ergebnis<readonly LvUebersicht[], Speicherfehler>>;
  laden(id: LeistungsverzeichnisId): Promise<Ergebnis<LvZustand, Speicherfehler>>;
}

export interface AngebotRepository {
  auflisten(
    leistungsverzeichnisId: LeistungsverzeichnisId,
  ): Promise<Ergebnis<readonly AngebotId[], Speicherfehler>>;
  laden(id: AngebotId): Promise<Ergebnis<AngebotZustand, Speicherfehler>>;
}

/**
 * Ein Auftrags-LV in der Liste des Projekts (v1.4, Ticket 70 Punkt 1; D-64.2): Kennung, Name und die zwei Aggregate, aus
 * denen es entstand, ohne Knoten. Damit findet die App das Auftrags-LV zu einem LV (höchstens eines, D-21), ohne die ganze
 * Projektdatei zu exportieren. Keine Summen (anders als `LvUebersicht` seit v1.5; Offene Typfrage 3, Ticket 95).
 */
export interface AuftragsLvUebersicht {
  readonly id: AuftragsLeistungsverzeichnisId;
  readonly name: string;
  /** Das Ausschreibungs-LV, aus dem es entstand (`AuftragsLvKopf.leistungsverzeichnisId`). */
  readonly leistungsverzeichnisId: LeistungsverzeichnisId;
  /** Das beauftragte Angebot (`AuftragsLvKopf.angebotId`). */
  readonly angebotId: AngebotId;
}

/**
 * Auftrags-LVs des Projekts (v1.4, Ticket 70 Punkt 1). Nur lesend: geschrieben wird über `Speicher.anwenden` (A5). Bis
 * Ticket 79 antwortet `speicher` auf beide Aufrufe mit `unbekannt`.
 */
export interface AuftragsLvRepository {
  /**
   * Die Auftrags-LVs des Projekts ohne Knoten, sortiert wie die LV-Liste: nach Name deutsch verglichen
   * (`Intl.Collator('de-DE')`), gleiche Namen nach Kennung. Unbekanntes Projekt: `nicht-gefunden`.
   */
  auflisten(projektId: ProjektId): Promise<Ergebnis<readonly AuftragsLvUebersicht[], Speicherfehler>>;
  laden(id: AuftragsLeistungsverzeichnisId): Promise<Ergebnis<AuftragsLvZustand, Speicherfehler>>;
}

/**
 * Aufmaßblätter (v1.4, Ticket 70 Punkt 10). Nur lesend (A5); bis Ticket 79 antwortet `speicher` mit `unbekannt`.
 */
export interface AufmassRepository {
  /** Die Blätter des Auftrags-LV ohne Zeilen, nach `nummer` aufsteigend. Unbekanntes Auftrags-LV: `nicht-gefunden`. */
  auflisten(
    auftragsLvId: AuftragsLeistungsverzeichnisId,
  ): Promise<Ergebnis<readonly AufmassKopf[], Speicherfehler>>;
  laden(id: AufmassId): Promise<Ergebnis<AufmassZustand, Speicherfehler>>;
}

/**
 * Rechnungen (v1.4, Ticket 70 Punkt 10). Nur lesend (A5); bis Ticket 79 antwortet `speicher` mit `unbekannt`.
 */
export interface RechnungRepository {
  /**
   * Die Rechnungen des Auftrags-LV, ganz, nach `nummer` aufsteigend. Vorläufige Annahme, Entscheidung offen: ganze
   * Rechnungen statt einer Übersicht, weil sie klein sind und die Prüfung einer Rechnung alle früheren braucht (D-34 (7)).
   * Unbekanntes Auftrags-LV: `nicht-gefunden`.
   */
  auflisten(
    auftragsLvId: AuftragsLeistungsverzeichnisId,
  ): Promise<Ergebnis<readonly Rechnung[], Speicherfehler>>;
  laden(id: RechnungId): Promise<Ergebnis<RechnungZustand, Speicherfehler>>;
}

/** Eine Kostenermittlung in der Liste des Projekts (v1.4, Ticket 70 Punkt 10): ohne Einträge. */
export type KostenermittlungUebersicht = Omit<Kostenermittlung, 'eintraege'>;

/**
 * Kostenermittlungen des Projekts (v1.4, Ticket 70 Punkt 10). Nur lesend (A5); bis Ticket 79 antwortet `speicher` mit
 * `unbekannt`.
 */
export interface KostenermittlungRepository {
  /**
   * Die Kostenermittlungen des Projekts ohne Einträge, sortiert wie die LV-Liste (Name de-DE, gleiche Namen nach
   * Kennung). Unbekanntes Projekt: `nicht-gefunden`.
   */
  auflisten(projektId: ProjektId): Promise<Ergebnis<readonly KostenermittlungUebersicht[], Speicherfehler>>;
  laden(id: KostenermittlungId): Promise<Ergebnis<KostenermittlungZustand, Speicherfehler>>;
}

/** LV-Stände eines LV (v1.2, S3; ADR 0006). Nur lesend: angelegt wird ein Stand über `LvStandAnlegen`. */
export interface LvStandRepository {
  /** Die Stände des LV in der Reihenfolge des Anlegens (ältester zuerst). */
  auflisten(
    leistungsverzeichnisId: LeistungsverzeichnisId,
  ): Promise<Ergebnis<readonly LvStandUebersicht[], Speicherfehler>>;
  laden(id: LvStandId): Promise<Ergebnis<LvStand, Speicherfehler>>;
}

/** Zustand der Persistenz des Browser-Speichers (Spec §9). */
export interface Persistenzstatus {
  readonly angefragt: boolean;
  /** `null`: unbekannt oder nicht unterstützt. */
  readonly persistent: boolean | null;
}

/**
 * Einziger Schreibweg (A5): ChangeSet und Protokolleintrag werden in einer Transaktion gespeichert, genau ein
 * Eintrag je Befehl. Schreibt der Aufrufer nur über `anwenden`, gibt es keinen direkten Tabellenzugriff.
 * Speichern bei jedem Befehl (G-35).
 *
 * v1.1a: `anwenden` nimmt auch ChangeSets, die ein Aggregat anlegen (`kopf.vorher: null`) oder löschen
 * (`nachher: null`), und ChangeSets des Auftrags-LV. Löschen verlangt, dass nichts mehr am Aggregat hängt (Angebote
 * und Auftrags-LV am LV, LVs am Projekt); sonst `konflikt`.
 *
 * v1.4 (Ticket 70 Punkt 10; Q5): dazu die ChangeSets von Aufmaßblatt, Rechnung und Kostenermittlung (ganze Aggregate,
 * D-36 (8); bis Ticket 79 `unbekannt`). `konflikt` auch, wenn ein ChangeSet (auch ohne Ausführer, als Undo)
 * - das Auftrags-LV löscht, solange ein Aufmaßblatt, eine Rechnung oder die Nachtragsangaben eines LV darauf verweisen;
 * - eine Position aus dem Auftrags-LV entfernt, auf die eine Aufmaßposition verweist (Umkehrung von `NachtragUebernehmen`);
 * - ein Aufmaßblatt löscht, das in einer Rechnung steht (`Rechnung.aufmassIds`);
 * - die Invariante der Freigaben verletzen würde (D-34 (7)): **Die freigegebenen Rechnungen eines Auftrags-LV sind stets
 *   die mit den kleinsten Nummern.** Also `konflikt`, wenn ein `RechnungChangeSet` eine Rechnung freigibt, solange eine
 *   frühere nicht freigegeben ist; eine Rechnung löscht oder ihre Freigabe entfernt, solange eine spätere freigegeben ist;
 *   oder eine Rechnung anlegt (`vorher: null`), solange dasselbe Auftrags-LV eine freigegebene Rechnung mit größerer Nummer
 *   hat (sonst: AR 2 löschen, AR 3 freigeben, AR 2 neu anlegen und freigeben → Doppelzahlung);
 * - auf ein Auftrags-LV, Aufmaßblatt oder eine Kennung verweist, die es im Projekt nicht gibt (Nachtragsangaben,
 *   `auftragsLvId`, `aufmassIds`);
 * - eine Blatt- oder Rechnungsnummer doppelt vergäbe (je Auftrags-LV eindeutig).
 */
export interface Speicher {
  readonly projekte: ProjektRepository;
  readonly leistungsverzeichnisse: LvRepository;
  readonly angebote: AngebotRepository;
  /** LV-Stände (v1.2; seit v1.3 Pflicht, Ticket 53 Punkt 4: `speicher` liefert sie seit Ticket 43). */
  readonly lvStaende: LvStandRepository;
  /**
   * Auftrags-LVs (v1.4, Ticket 70 Punkt 1; Pflicht wie `lvStaende`). Ersetzt den Umweg der App über den Export der
   * Projektdatei (D-64.2); `speicher` liefert es mit Ticket 79, bis dahin `unbekannt`.
   */
  readonly auftragsLeistungsverzeichnisse: AuftragsLvRepository;
  /** Aufmaßblätter (v1.4, Ticket 70 Punkt 10; Pflicht). `speicher` liefert sie mit Ticket 79, bis dahin `unbekannt`. */
  readonly aufmasse: AufmassRepository;
  /** Rechnungen (v1.4, Ticket 70 Punkt 10; Pflicht). `speicher` liefert sie mit Ticket 79, bis dahin `unbekannt`. */
  readonly rechnungen: RechnungRepository;
  /** Kostenermittlungen (v1.4, Ticket 70 Punkt 10; Pflicht). `speicher` liefert sie mit Ticket 79, bis dahin `unbekannt`. */
  readonly kostenermittlungen: KostenermittlungRepository;
  anwenden(eintrag: Protokolleintrag, changeSet: ChangeSet): Promise<Ergebnis<void, Speicherfehler>>;
  protokoll(projektId: ProjektId): Promise<Ergebnis<readonly Protokolleintrag[], Speicherfehler>>;
  persistenzstatus(): Promise<Persistenzstatus>;
  /** Exportiert die Projektdatei (JSON, G-56). Byte-stabil: kanonische Schlüsselreihenfolge. */
  projektdateiExportieren(projektId: ProjektId): Promise<Ergebnis<string, Speicherfehler>>;
  /** Importiert eine Projektdatei beliebiger älterer Schemaversion (A8). `inhalt` ist der JSON-Text. */
  projektdateiImportieren(inhalt: string): Promise<Ergebnis<ProjektId, Speicherfehler>>;
  /**
   * Schließt den Speicher und gibt seine Betriebsmittel frei (v1.1a), z. B. die OPFS-Handles des Workers. Danach
   * sind keine weiteren Aufrufe zulässig; ein neuer Speicher wird mit einem neuen Öffnen erzeugt (das Öffnen liegt
   * bei `speicher`, nicht im Vertrag).
   */
  schliessen(): Promise<Ergebnis<void, Speicherfehler>>;
}

// --- Projektdatei (G-56, A8) -----------------------------------------------------------------------------------

/** Schemaversion der Projektdatei: positive ganze Zahl, bei jeder Migration erhöht (liegt bei `speicher`). */
export type Schemaversion = number;

/**
 * Inhalt der JSON-Projektdatei in der aktuellen Schemaversion. Dezimalwerte stehen als Zeichenketten
 * (siehe `Dezimal`). Ältere Versionen liest `speicher` über Migrationen; dafür gibt es hier keinen Typ.
 */
export interface Projektdatei {
  readonly schemaVersion: Schemaversion;
  readonly projekt: Projekt;
  readonly leistungsverzeichnisse: readonly LvZustand[];
  readonly angebote: readonly AngebotZustand[];
  readonly auftragsLeistungsverzeichnisse: readonly AuftragsLvZustand[];
  readonly protokoll: readonly Protokolleintrag[];
  /**
   * LV-Stände aller LVs des Projekts (v1.2, S3). Fehlt: keine (`speicher` lässt das Feld bei null Ständen weg,
   * kanonische Datei der Schemaversion 3, Ticket 43). Bleibt in v1.3 optional, anders als `Speicher.lvStaende`: Pflicht
   * hieße `lvStaende: []` in jeder Datei, also eine neue Schemaversion (A8; Offene Typfrage, Ticket 53).
   */
  readonly lvStaende?: readonly LvStand[];
  /**
   * Aufmaßblätter, Rechnungen und Kostenermittlungen des Projekts (v1.4, Ticket 70 Punkt 10). Vorläufige Annahme,
   * Entscheidung offen (enge Lesart, wie `lvStaende`): optional, fehlt = keine; `speicher` lässt ein leeres Feld weg, so
   * bleibt die kanonische Datei der bisherigen Schemaversion gleich (A8). Die Migration liefert Ticket 79.
   */
  readonly aufmasse?: readonly AufmassZustand[];
  readonly rechnungen?: readonly RechnungZustand[];
  readonly kostenermittlungen?: readonly KostenermittlungZustand[];
}
