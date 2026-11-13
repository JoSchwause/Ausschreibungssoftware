// SPDX-License-Identifier: AGPL-3.0-or-later
// Repository-Schnittstellen für `speicher` (S1), Befehlsprotokoll und Projektdatei. Nur Typen.

import type { Befehl, EinstellungenBefehl, HistorienBefehl } from './befehle';
import type {
  AngebotZustand,
  AufmassZustand,
  AuftragsLvZustand,
  BautagebucheintragZustand,
  BauwerksmodellZustand,
  BauzeitenplanZustand,
  ChangeSet,
  EinstellungenChangeSet,
  Ergebnis,
  HonorarberechnungZustand,
  KostenermittlungZustand,
  LvStand,
  LvStandUebersicht,
  LvZustand,
  MangelZustand,
  RechnungZustand,
} from './changeset';
import type {
  AngebotId,
  AufmassId,
  AuftragsLeistungsverzeichnisId,
  BautagebucheintragId,
  BauwerksmodellId,
  BauzeitenplanId,
  HonorarberechnungId,
  IdQuelle,
  KostenermittlungId,
  Kostengruppennummer,
  LeistungsverzeichnisId,
  LvStandId,
  MangelId,
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
import type { BauwerksmodellKopf, Modelldatei } from './bim';
import type { BauzeitenplanKopf } from './bauzeit';
import type { Honorarberechnung } from './honorar';
import type { Bautagebucheintrag, Mangel } from './bauleitung';
import type { Einstellungen } from './einstellungen';

// --- Befehlsprotokoll (ADR 0009) -----------------------------------------------------------------------------

/**
 * Aggregat, auf das ein Befehl wirkt. `art` ist dieselbe wie `ChangeSet.art` des Aggregats. v1.4 (Ticket 70 Punkt 10):
 * dazu Aufmaßblatt, Rechnung und Kostenermittlung; `KostengruppeSetzen` steht mit `leistungsverzeichnis` oder
 * `auftrags-leistungsverzeichnis` im Protokoll. v1.6 (Ticket 97 Punkt 8): dazu Bauwerksmodell, Bauzeitenplan,
 * Honorarberechnung, Mangel und Bautagebucheintrag; `BauteileZuordnen` steht wie `KostengruppeSetzen` mit dem LV oder dem
 * Auftrags-LV im Protokoll.
 */
export type AggregatBezug =
  | { readonly art: 'projekt'; readonly id: ProjektId }
  | { readonly art: 'leistungsverzeichnis'; readonly id: LeistungsverzeichnisId }
  | { readonly art: 'angebot'; readonly id: AngebotId }
  | { readonly art: 'auftrags-leistungsverzeichnis'; readonly id: AuftragsLeistungsverzeichnisId }
  // v1.4
  | { readonly art: 'aufmass'; readonly id: AufmassId }
  | { readonly art: 'rechnung'; readonly id: RechnungId }
  | { readonly art: 'kostenermittlung'; readonly id: KostenermittlungId }
  // v1.6
  | { readonly art: 'bauwerksmodell'; readonly id: BauwerksmodellId }
  | { readonly art: 'bauzeitenplan'; readonly id: BauzeitenplanId }
  | { readonly art: 'honorarberechnung'; readonly id: HonorarberechnungId }
  | { readonly art: 'mangel'; readonly id: MangelId }
  | { readonly art: 'bautagebucheintrag'; readonly id: BautagebucheintragId };

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

/**
 * Ein Eintrag des **Einstellungsprotokolls** (v1.7a Nachtrag, Review D-82 M1; Glossar „Einstellungen“): wer, was, wann an den
 * Einstellungen des Geräts. A5 und ADR 0009 gelten ohne Ausnahme: Jeder Befehl an den Einstellungen steht hier, genau ein Eintrag
 * je Befehl, geschrieben mit seinem ChangeSet in einer Transaktion (`EinstellungenRepository.anwenden`). Ohne Projekt und ohne
 * Aggregat (es gibt nur eines); ein Nebenbuch wie das Befehlsprotokoll, kein Quellzustand.
 *
 * - `befehl`: ein `EinstellungenBefehl`, vollständig (keiner ist ein Massenbefehl), oder ein `Rueckgaengig`/`Wiederholen` des
 *   eigenen Rückgängig der Einstellungen in der Sitzung; dessen `protokollId` nennt den Eintrag des ursprünglichen Befehls in
 *   diesem Protokoll (wie beim Projekt, D-12).
 * - `id` aus der `IdQuelle` (`protokoll()`), `wer` und `wann` vom Aufrufer (A2), wie beim `Protokolleintrag`.
 * - Das Einstellungsprotokoll steht nicht in der Projektdatei (es gehört zum Gerät, nicht zum Projekt).
 */
export interface EinstellungenProtokolleintrag {
  readonly id: ProtokollId;
  readonly wer: NutzerId;
  readonly wann: Zeitstempel;
  readonly befehl: EinstellungenBefehl | HistorienBefehl;
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
  | 'unbekannt'
  /**
   * v1.6 (Ticket 97 Punkt 2, D-51): Die Projektdatei würde die Grenze für Zeichenketten der Laufzeit überschreiten (etwa
   * 512 MB Text, meist wegen großer Modelldateien). Der Export schlägt laut fehl und kürzt nie (Q5); es entsteht keine Datei.
   */
  | 'datei-zu-gross';

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

/**
 * Ablage der Modelldateien (v1.6, Ticket 97 Punkt 2; D-51; Glossar „Modelldatei“): die Bytes der IFC-Dateien,
 * inhaltsadressiert über den SHA-256 der unkomprimierten Bytes (`Modelldatei.hash`). Kein Repository eines Aggregats und kein
 * Befehl: Ablegen schreibt keinen Protokolleintrag und kein ChangeSet und gehört nicht zur Undo-Historie. Die Ablage gehört
 * zum ganzen Speicher, nicht zu einem Projekt: Dieselbe Datei in zwei Projekten liegt einmal ab. Bis Ticket 106 antwortet
 * `speicher` auf alle drei Aufrufe mit `unbekannt`.
 *
 * Lesarten (vorläufige Annahme, Entscheidung offen, enge Lesart):
 * - `ablegen` ist idempotent: Dieselben Bytes ergeben denselben Hash und liegen nur einmal ab; ein zweites Ablegen ist kein
 *   Fehler. Eine Größengrenze prüft die Ablage nicht (über etwa 200 MB ist die Datei ein Befund der App, keine Sperre, D-51);
 *   ist die Quote erschöpft, `speicher-voll`.
 * - Die App legt die Bytes ab, **bevor** sie `BauwerksmodellAnlegen` schreibt. Ein ChangeSet, das ein Modell anlegt
 *   (`kopf.vorher: null`), dessen `datei.hash` keine abgelegten Bytes nennt oder dessen `datei.groesse` nicht deren Länge
 *   ist, weist `speicher.anwenden` mit `konflikt` ab (Q5: kein Modell ohne Datei).
 * - Bytes bleiben, solange ein Bauwerksmodell irgendeines Projekts ihren Hash nennt. **Freigabe:** Bytes, die kein Modell
 *   nennt, entfernt `speicher` nur beim Öffnen des Speichers (Beginn einer Sitzung; eine Sitzung je Datenbank, E-14), nie
 *   während einer Sitzung: Die Undo-Historie lebt nur in der Sitzung (ADR 0006), und ein Undo von `BauwerksmodellLoeschen`
 *   oder ein Wiederholen des Anlegens findet die Bytes so noch. Ebenso fallen beim nächsten Öffnen abgelegte Bytes weg, deren
 *   Anlegen nie geschrieben wurde (etwa ein abgebrochenes Einlesen).
 * - `laden` liefert die Bytes unverändert (dieselben, die abgelegt wurden); ein Hash ohne Bytes: `nicht-gefunden`.
 */
export interface Modelldateiablage {
  ablegen(bytes: Uint8Array): Promise<Ergebnis<Modelldatei['hash'], Speicherfehler>>;
  laden(hash: Modelldatei['hash']): Promise<Ergebnis<Uint8Array, Speicherfehler>>;
  vorhanden(hash: Modelldatei['hash']): Promise<Ergebnis<boolean, Speicherfehler>>;
}

// --- Repositories der Aggregate aus v1.6 (Ticket 97 Punkt 8) -----------------------------------------------------------
//
// Nur lesend (A5): geschrieben wird über `Speicher.anwenden`. Bis Ticket 106 antwortet `speicher` auf jeden Aufruf mit
// `unbekannt`. Unbekanntes Projekt: `nicht-gefunden`; Sortierungen am Aufruf.

/**
 * Ein Bauwerksmodell in der Liste des Projekts (v1.6, Ticket 97 Punkt 8, D-51, D-54): der Kopf **ohne** Struktur und Bauteile,
 * dazu die Zahl der Bauteile (die Liste zeigt sie, Ticket 114), damit die Liste kein Modell mit 10.000 Bauteilen lädt.
 * `anzahlBauteile` ist `bauteile.length` des gespeicherten Modells; `speicher` hält sie beim Anlegen fest.
 */
export interface BauwerksmodellUebersicht extends BauwerksmodellKopf {
  readonly anzahlBauteile: number;
}

/** Bauwerksmodelle des Projekts (v1.6, Ticket 97 Punkt 8). */
export interface BauwerksmodellRepository {
  /**
   * Die Modelle des Projekts als Übersicht, sortiert wie die LV-Liste (Name de-DE, gleiche Namen nach Kennung). Die Folge der
   * Stände ergibt sich aus `vorgaengerId`, nicht aus der Ordnung.
   */
  auflisten(projektId: ProjektId): Promise<Ergebnis<readonly BauwerksmodellUebersicht[], Speicherfehler>>;
  /** Das ganze Modell samt Struktur und Bauteilen, ohne die Bytes (die liegen in der `Modelldateiablage`). */
  laden(id: BauwerksmodellId): Promise<Ergebnis<BauwerksmodellZustand, Speicherfehler>>;
}

/** Ein Bauzeitenplan in der Liste des Projekts (v1.6, Ticket 97 Punkt 8): der Kopf ohne Vorgänge. */
export type BauzeitenplanUebersicht = BauzeitenplanKopf;

/** Bauzeitenpläne des Projekts (v1.6, Ticket 97 Punkt 8, D-57: mehrere je Projekt). */
export interface BauzeitenplanRepository {
  /** Die Pläne des Projekts ohne Vorgänge, sortiert wie die LV-Liste (Name de-DE, gleiche Namen nach Kennung). */
  auflisten(projektId: ProjektId): Promise<Ergebnis<readonly BauzeitenplanUebersicht[], Speicherfehler>>;
  laden(id: BauzeitenplanId): Promise<Ergebnis<BauzeitenplanZustand, Speicherfehler>>;
}

/** Eine Honorarberechnung in der Liste des Projekts (v1.6, Ticket 97 Punkt 8): ohne Honorarobjekte. */
export type HonorarberechnungUebersicht = Omit<Honorarberechnung, 'objekte'>;

/** Honorarberechnungen des Projekts (v1.6, Ticket 97 Punkt 8). */
export interface HonorarberechnungRepository {
  /** Die Honorarberechnungen des Projekts ohne Objekte, sortiert wie die LV-Liste (Name de-DE, gleiche nach Kennung). */
  auflisten(projektId: ProjektId): Promise<Ergebnis<readonly HonorarberechnungUebersicht[], Speicherfehler>>;
  laden(id: HonorarberechnungId): Promise<Ergebnis<HonorarberechnungZustand, Speicherfehler>>;
}

/** Mängel des Projekts (v1.6, Ticket 97 Punkt 8, D-57). */
export interface MangelRepository {
  /**
   * Die Mängel des Projekts **ganz**, nach `nummer` aufsteigend: Sie sind klein, und Liste, Fristprüfung und Ausführer (der
   * Bestand, `MangelBefehlAusfuehren`) brauchen alle (wie `RechnungRepository.auflisten`, D-70.10).
   */
  auflisten(projektId: ProjektId): Promise<Ergebnis<readonly Mangel[], Speicherfehler>>;
  laden(id: MangelId): Promise<Ergebnis<MangelZustand, Speicherfehler>>;
}

/** Das Bautagebuch des Projekts: seine Einträge (v1.6, Ticket 97 Punkt 8, D-57). */
export interface BautagebuchRepository {
  /** Die Einträge des Projekts **ganz**, nach `datum` aufsteigend (je Datum höchstens einer). */
  auflisten(projektId: ProjektId): Promise<Ergebnis<readonly Bautagebucheintrag[], Speicherfehler>>;
  laden(id: BautagebucheintragId): Promise<Ergebnis<BautagebucheintragZustand, Speicherfehler>>;
}

/** LV-Stände eines LV (v1.2, S3; ADR 0006). Nur lesend: angelegt wird ein Stand über `LvStandAnlegen`. */
export interface LvStandRepository {
  /**
   * Die Stände des LV nach `angelegt` aufsteigend (ältester zuerst), bei gleichem Zeitpunkt in der Reihenfolge, in der
   * `speicher` sie abgelegt hat (`seq`). v1.7a Nachtrag (Review D-82, S1): Die Umkehrung von `LvStandLoeschen` legt den Stand mit
   * seinem `angelegt` zurück; er steht danach wieder an seinem Platz (unter Ständen mit genau demselben `angelegt` hinter
   * ihnen).
   */
  auflisten(
    leistungsverzeichnisId: LeistungsverzeichnisId,
  ): Promise<Ergebnis<readonly LvStandUebersicht[], Speicherfehler>>;
  laden(id: LvStandId): Promise<Ergebnis<LvStand, Speicherfehler>>;
}

/**
 * Die Einstellungen des Geräts (v1.7a, Ticket 127; E15, D-73; Glossar „Einstellungen“): ein globales Aggregat außerhalb jedes
 * Projekts und seiner Undo-Historie, mit eigenem Protokoll (v1.7a Nachtrag, Review D-82 M1). Liefert `speicher` mit Ticket 139.
 *
 * Lesarten (vorläufige Annahme, Entscheidung offen, enge Lesart):
 * - `laden` liefert `LEERE_EINSTELLUNGEN`, solange nie etwas geschrieben wurde (kein `nicht-gefunden`).
 * - `anwenden` schreibt den Eintrag des Einstellungsprotokolls und das ChangeSet in **einer** Transaktion, genau ein Eintrag je
 *   Befehl (A5, ADR 0009); weicht `vorher` vom gespeicherten Stand ab, `konflikt` und nichts wird geschrieben (Q5). Ein
 *   `Rueckgaengig`/`Wiederholen` kommt mit dem getauschten bzw. ursprünglichen ChangeSet wie jeder andere Eintrag.
 * - `protokoll` liefert das Einstellungsprotokoll in der Reihenfolge des Schreibens (ältester zuerst).
 * - Übernahme aus dem Browserspeicher (`localStorage`, D-73; Review D-82, S8): einmalig durch die App, **nur solange das
 *   Einstellungsprotokoll leer ist** (`protokoll()` liefert `[]`), als gewöhnliche protokollierte Befehle; danach nie wieder,
 *   auch wenn die Einstellungen später wieder leer sind. Die alten Schlüssel bleiben stehen.
 */
export interface EinstellungenRepository {
  laden(): Promise<Ergebnis<Einstellungen, Speicherfehler>>;
  anwenden(
    eintrag: EinstellungenProtokolleintrag,
    changeSet: EinstellungenChangeSet,
  ): Promise<Ergebnis<void, Speicherfehler>>;
  protokoll(): Promise<Ergebnis<readonly EinstellungenProtokolleintrag[], Speicherfehler>>;
}

/**
 * Wie eine Projektdatei eingelesen wird (v1.7a, Ticket 127; E8 „Projektdatei einlesen, wenn das Projekt schon da ist“;
 * `Speicher.projektdateiEinlesen`). Ohne Optionen wie bisher: ein vorhandenes Projekt derselben Kennung ergibt
 * `existiert-bereits`.
 */
export interface ProjektdateiEinleseoptionen {
  /**
   * Als Kopie einlesen: `speicher` vergibt dem Projekt und **jedem Aggregat** der Datei (LV, Angebot, Auftrags-LV, LV-Stand,
   * Aufmaßblatt, Rechnung, Kostenermittlung, Bauwerksmodell, Bauzeitenplan, Honorarberechnung, Mangel, Bautagebucheintrag)
   * eine neue Kennung aus `ids` und biegt alle Verweise zwischen ihnen um (`projektId`, `leistungsverzeichnisId`,
   * `angebotId`, `auftragsLvId`, `aufmassIds`, Nachtragsangaben, Vorgänger eines Modells, Verweise von Honorar, Mangel und
   * Vorgang). Dazu gehört die Wurzel: `elternId` der Knoten der obersten Ebene (im Baum und im Papierkorb) ist die Kennung des
   * LV bzw. Auftrags-LV und wird mit ihr umgeschrieben. Kennungen innerhalb eines Aggregats (Knoten, Positionen, Vorgänge,
   * Bieter, Papierkorbeinträge, Bilder) bleiben: Sie sind nur je Aggregat bzw. Projekt eindeutig (Positionsidentität,
   * ADR 0011), die Kopie ist also ohne Überschneidung mit dem Original. Das Projekt heißt `name` (die App schlägt
   * „<Name> (Kopie)“ vor).
   *
   * Eingefrorene LV-Stände (v1.7a Nachtrag, Review D-82 S10): Sie bekommen eine neue Kennung und ihr `leistungsverzeichnisId`
   * die neue des LV; im eingefrorenen Zustand werden dieselben Kennungen umgeschrieben wie im lebenden LV (Kennung des LV,
   * `projektId`, `nachtrag.auftragsLvId`, die Wurzel als `elternId` in Baum und Papierkorb), sonst nichts. `angelegt` bleibt.
   *
   * Lesart (vorläufige Annahme, Entscheidung offen, enge Lesart; D-127): Das Befehlsprotokoll der Datei kommt **nicht** mit:
   * Seine Befehle nennen die alten Kennungen. Die Kopie beginnt mit leerem Protokoll; die Datei selbst bleibt die Quelle der
   * Geschichte (die App sagt das im Dialog). Modelldateien (Bytes) sind inhaltsadressiert und werden geteilt, nicht kopiert.
   * Einstellungen der Datei gelten wie beim gewöhnlichen Einlesen (`einstellungsuebernahme`).
   */
  readonly alsKopie?: { readonly ids: IdQuelle; readonly name: string };
  /**
   * Kopf des Eintrags im Einstellungsprotokoll, unter dem `speicher` die Übernahme der Einstellungen aus der Datei schreibt
   * (v1.7a Nachtrag, Review D-82 M1: auch diese Änderung ist ein protokollierter Befehl). Trägt die Datei einen Block
   * `einstellungen`, schreibt `speicher` in derselben Transaktion wie das Projekt den Befehl `EinstellungenUebernehmen` mit
   * diesem Block, `id`, `wer` und `wann` von hier und dem ChangeSet nach D-73 (gerechnet mit dem Ausführer des Kerns,
   * `speicher → kern` ist erlaubt, D-19); übernimmt er nichts, schreibt er keinen Eintrag. Fehlt das Feld, bleiben die
   * Einstellungen unberührt (das Ergebnis nennt dann `einstellungen: null`).
   */
  readonly einstellungsuebernahme?: Pick<EinstellungenProtokolleintrag, 'id' | 'wer' | 'wann'>;
}

/**
 * Ein Eintrag der Einstellungen, wie die Übernahme aus einer Projektdatei ihn nennt (v1.7a, D-73): das Büro, ein Druckprofil
 * (über seinen Namen) oder eine Kostengruppenbezeichnung (über ihre Nummer).
 */
export type Einstellungsschluessel =
  | { readonly art: 'buero' }
  | { readonly art: 'druckprofil'; readonly name: string }
  | { readonly art: 'kostengruppenbezeichnung'; readonly nummer: Kostengruppennummer };

/**
 * Ergebnis von `Speicher.projektdateiEinlesen` (v1.7a): das eingelesene Projekt (bei einer Kopie die neue Kennung) und was
 * aus dem Block `einstellungen` der Datei wurde. `einstellungen: null`: Die Datei trägt keinen Block (Schema bis 6), oder der
 * Aufruf nannte keine `einstellungsuebernahme` (dann ist nichts übernommen). Sonst
 * `uebernommen` (lokal fehlte der Eintrag, er steht nun in den Einstellungen) und `belassen` (lokal gab es ihn schon; der
 * Wert der Datei wurde nicht übernommen, auch wenn er gleich war), je in der Reihenfolge der Datei: Büro, Druckprofile,
 * Kostengruppenbezeichnungen. Der Dialog nennt beides (Q5).
 */
export interface ProjektdateiEinleseergebnis {
  readonly projektId: ProjektId;
  readonly einstellungen: {
    readonly uebernommen: readonly Einstellungsschluessel[];
    readonly belassen: readonly Einstellungsschluessel[];
  } | null;
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
 *
 * v1.6 (Ticket 97 Punkt 8; Q5): dazu die ChangeSets von Bauwerksmodell, Bauzeitenplan, Honorarberechnung, Mangel und
 * Bautagebucheintrag und ChangeSets von LV und Auftrags-LV mit Bauteilzuordnungen (bis Ticket 106 `unbekannt`). `konflikt`
 * auch, wenn ein ChangeSet (auch als Undo)
 * - das Projekt löscht, solange eines dieser Aggregate daran hängt (wie bei LVs und Kostenermittlungen);
 * - ein Bauwerksmodell anlegt, dessen Modelldatei nicht (in dieser Größe) abgelegt ist oder dessen `vorgaengerId` kein Modell
 *   des Projekts ist (siehe `Modelldateiablage`, `BauwerksmodellKopf`);
 * - ein Bauwerksmodell löscht, das ein anderes als Vorgänger nennt oder auf das ein Mangel verweist;
 * - eine Kostenermittlung löscht, auf die eine Honorarberechnung verweist, oder eine Honorarberechnung schreibt, die auf eine
 *   Kostenermittlung verweist, die es im Projekt nicht gibt;
 * - einen Mangel schreibt, dessen Nummer im Projekt vergeben ist oder dessen Auftrags-LV oder Modell es im Projekt nicht gibt;
 *   ein Auftrags-LV löscht, auf das ein Mangel verweist;
 * - einen Bautagebucheintrag schreibt, dessen Datum im Projekt schon ein anderer trägt.
 * Schwache Verweise prüft `speicher` nicht (Befunde der App): Vorgangsbezug auf ein LV und seine Knoten, `Mangel.positionId`,
 * Bauteilzuordnungen gegen ein Modell.
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
  /**
   * Die Bytes der Modelldateien (v1.6, Ticket 97 Punkt 2, D-51; Pflicht wie die Repositories). `speicher` liefert sie mit
   * Ticket 106, bis dahin `unbekannt`.
   */
  readonly modelldateien: Modelldateiablage;
  /** Bauwerksmodelle (v1.6, Ticket 97 Punkt 8; Pflicht). `speicher` liefert sie mit Ticket 106, bis dahin `unbekannt`. */
  readonly bauwerksmodelle: BauwerksmodellRepository;
  /** Bauzeitenpläne (v1.6; Pflicht). Bis Ticket 106 `unbekannt`. */
  readonly bauzeitenplaene: BauzeitenplanRepository;
  /** Honorarberechnungen (v1.6; Pflicht). Bis Ticket 106 `unbekannt`. */
  readonly honorarberechnungen: HonorarberechnungRepository;
  /** Mängel (v1.6; Pflicht). Bis Ticket 106 `unbekannt`. */
  readonly maengel: MangelRepository;
  /** Das Bautagebuch (v1.6; Pflicht). Bis Ticket 106 `unbekannt`. */
  readonly bautagebuch: BautagebuchRepository;
  /**
   * Die Einstellungen des Geräts (v1.7a, Ticket 127, E15, D-73). Optional, damit ein Speicher vor Ticket 139 gültig bleibt
   * (A8: additiv); fehlt es, liest die App weiter den Browserspeicher. Pflicht spätestens mit der nächsten Vertragsversion
   * nach Ticket 139.
   */
  readonly einstellungen?: EinstellungenRepository;
  anwenden(eintrag: Protokolleintrag, changeSet: ChangeSet): Promise<Ergebnis<void, Speicherfehler>>;
  protokoll(projektId: ProjektId): Promise<Ergebnis<readonly Protokolleintrag[], Speicherfehler>>;
  persistenzstatus(): Promise<Persistenzstatus>;
  /** Exportiert die Projektdatei (JSON, G-56). Byte-stabil: kanonische Schlüsselreihenfolge. */
  projektdateiExportieren(projektId: ProjektId): Promise<Ergebnis<string, Speicherfehler>>;
  /**
   * Importiert eine Projektdatei beliebiger älterer Schemaversion (A8). `inhalt` ist der JSON-Text. v1.7a Nachtrag (D-82 M1):
   * Er übernimmt keine Einstellungen aus der Datei (ohne Protokollkopf ließe sich die Übernahme nicht protokollieren); das tut
   * `projektdateiEinlesen` mit `einstellungsuebernahme`.
   */
  projektdateiImportieren(inhalt: string): Promise<Ergebnis<ProjektId, Speicherfehler>>;
  /**
   * Liest eine Projektdatei ein wie `projektdateiImportieren`, wahlweise als Kopie, übernimmt mit `einstellungsuebernahme` die
   * Einstellungen der Datei (protokolliert, D-82 M1) und berichtet, was übernommen und was belassen wurde (v1.7a, Ticket 127;
   * E8, E15, D-73). Optional, damit ein Speicher vor Ticket 139 gültig bleibt; liefert `speicher` es, nimmt die App es statt
   * `projektdateiImportieren` (das gültig bleibt). Ohne `alsKopie` ergibt ein vorhandenes Projekt derselben Kennung
   * `existiert-bereits`.
   */
  projektdateiEinlesen?(
    inhalt: string,
    optionen?: ProjektdateiEinleseoptionen,
  ): Promise<Ergebnis<ProjektdateiEinleseergebnis, Speicherfehler>>;
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
  /**
   * Bauwerksmodelle des Projekts (v1.6, Ticket 97 Punkt 2; D-51). Vorläufige Annahme, Entscheidung offen (enge Lesart, wie
   * `aufmasse`): optional, fehlt = keine; `speicher` lässt ein leeres Feld weg. Die Migration (Schema 6) liefert Ticket 106.
   */
  readonly bauwerksmodelle?: readonly BauwerksmodellZustand[];
  /**
   * Die Bytes der Modelldateien, die die Bauwerksmodelle dieser Datei nennen (v1.6, Ticket 97 Punkt 2; D-51), damit eine
   * Sicherung eine einzige Datei bleibt. Optional, fehlt = keine (nur mit `bauwerksmodelle`). Lesarten (vorläufige Annahme,
   * Entscheidung offen, enge Lesart):
   * - Je Hash genau ein Eintrag, nach `hash` aufsteigend (kanonische Datei); `hash` ist der SHA-256 der unkomprimierten
   *   Bytes, `inhalt` die Bytes, mit deflate-raw (RFC 1951) komprimiert und Base64-kodiert (RFC 4648, mit Auffüllung).
   * - Vollständig und nur das Nötige: Der Export schreibt genau die Hashes, die die Modelle der Datei nennen. Fehlt beim
   *   Import ein genannter Hash oder ist der SHA-256 der entpackten Bytes nicht `hash`, weist der Import die ganze Datei mit
   *   `datei-ungueltig` ab (nichts wird halb importiert, Q5); Bytes, die schon abgelegt sind, bleiben unverändert.
   * - Prüfsummen und Tests vergleichen den SHA-256 der unkomprimierten Bytes, nie den Text `inhalt`: deflate ist zwischen
   *   Implementierungen nicht byte-stabil (D-51). Darum ist die Datei mit Modellen nur bis auf `inhalt` byte-stabil.
   * - Nähert sich der Export der Grenze für Zeichenketten (etwa 512 MB Text), schlägt er mit `datei-zu-gross` fehl und kürzt
   *   nie (D-51).
   */
  readonly modelldateien?: readonly { readonly hash: Modelldatei['hash']; readonly inhalt: string }[];
  /**
   * Bauzeitenpläne, Honorarberechnungen, Mängel und Bautagebucheinträge des Projekts (v1.6, Ticket 97 Punkt 8). Vorläufige
   * Annahme, Entscheidung offen (enge Lesart, wie `aufmasse`): optional, fehlt = keine; `speicher` lässt leere Felder weg, so
   * bleibt eine Datei ohne sie bis auf die Schemaversion gleich (A8; Migration 6, Ticket 106).
   */
  readonly bauzeitenplaene?: readonly BauzeitenplanZustand[];
  readonly honorarberechnungen?: readonly HonorarberechnungZustand[];
  readonly maengel?: readonly MangelZustand[];
  readonly bautagebuch?: readonly BautagebucheintragZustand[];
  /**
   * Kopie der Einstellungen des Geräts beim Export (v1.7a, Ticket 127, E15, D-73; Schema 7, Ticket 139), damit eine Sicherung
   * eine Datei bleibt. Optional, fehlt = keine (Dateien bis Schema 6; `speicher` lässt den Block weg, wenn die Einstellungen
   * `LEERE_EINSTELLUNGEN` gleichen). Lesarten (D-73; vorläufige Annahme, Entscheidung offen):
   * - Das Einlesen füllt nur **Fehlendes je Schlüssel** und überschreibt nie: das Büro nur, wenn lokal keines gesetzt ist; ein
   *   Druckprofil nur, wenn lokal keines dieses Namens besteht; eine Kostengruppenbezeichnung nur, wenn lokal keine dieser
   *   Nummer besteht.
   * - Was übernommen und was belassen wurde, liefert `Speicher.projektdateiEinlesen` (`ProjektdateiEinleseergebnis`); der
   *   Dialog nennt es (Q5).
   * - Die Übernahme ist kein Befehl eines Projekts (D-73), aber ein protokollierter Befehl an den Einstellungen
   *   (`EinstellungenUebernehmen` im Einstellungsprotokoll, v1.7a Nachtrag D-82 M1; siehe
   *   `ProjektdateiEinleseoptionen.einstellungsuebernahme`). Das Einstellungsprotokoll selbst steht nicht in der Datei.
   */
  readonly einstellungen?: Einstellungen;
}
