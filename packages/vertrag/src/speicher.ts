// SPDX-License-Identifier: AGPL-3.0-or-later
// Repository-Schnittstellen für `speicher` (S1), Befehlsprotokoll und Projektdatei. Nur Typen.

import type { Befehl } from './befehle';
import type {
  AngebotZustand,
  AuftragsLvZustand,
  ChangeSet,
  Ergebnis,
  LvStand,
  LvStandUebersicht,
  LvZustand,
} from './changeset';
import type {
  AngebotId,
  AuftragsLeistungsverzeichnisId,
  LeistungsverzeichnisId,
  LvStandId,
  NutzerId,
  ProjektId,
  ProtokollId,
  Zeitstempel,
} from './marken';
import type { AngebotKopf, AuftragsLvKopf, LvInhalt, Projekt } from './modell';

// --- Befehlsprotokoll (ADR 0009) -----------------------------------------------------------------------------

/** Aggregat, auf das ein Befehl wirkt. */
export type AggregatBezug =
  | { readonly art: 'projekt'; readonly id: ProjektId }
  | { readonly art: 'leistungsverzeichnis'; readonly id: LeistungsverzeichnisId }
  | { readonly art: 'angebot'; readonly id: AngebotId }
  | { readonly art: 'auftrags-leistungsverzeichnis'; readonly id: AuftragsLeistungsverzeichnisId };

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
 * Vorläufige Annahme, Entscheidung offen (enge Lesart): keine Summen (Offene Typfrage, Ticket 53).
 */
export interface LvUebersicht {
  readonly id: LeistungsverzeichnisId;
  readonly name: string;
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
 */
export interface Speicher {
  readonly projekte: ProjektRepository;
  readonly leistungsverzeichnisse: LvRepository;
  readonly angebote: AngebotRepository;
  /** LV-Stände (v1.2; seit v1.3 Pflicht, Ticket 53 Punkt 4: `speicher` liefert sie seit Ticket 43). */
  readonly lvStaende: LvStandRepository;
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
}
