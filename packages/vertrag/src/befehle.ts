// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle (Regel A5): jede Änderung am Projekt ist ein Befehl `(Zustand, Befehl) → ChangeSet`.
//
// Befehle sind reine Daten: keine Funktionen, kein Date, keine Klassen, alles JSON-tauglich. Sie gehen
// unverändert in das Befehlsprotokoll (ADR 0009) und sind damit später synchronisierbar (G-01). Alle Kennungen
// neuer Knoten bringt der Aufrufer mit (A2). Zeit und Nutzer stehen nicht im Befehl, sondern im
// `Protokolleintrag`. Der Befehlsname im Feld `art` ist der Typname (ASCII, siehe GLOSSARY).

import type {
  ElternId,
  GliederungId,
  HinweistextId,
  KnotenId,
  LeistungsverzeichnisId,
  Ordnungszahl,
  PositionId,
  ProjektId,
} from './marken';
import type {
  Angebot,
  Angebotsposition,
  AuftragsLeistungsverzeichnis,
  Bauherr,
  Bieter,
  Einheit,
  Einheitspreisanteile,
  Langtext,
  LvInhalt,
  Nachlass,
  OzMaske,
  Positionsart,
  Positionsdaten,
} from './modell';
import type { Einheitspreis, Menge, Prozent } from './zahlen';

/** Wo ein Knoten eingefügt oder hingeschoben wird. */
export type Einfuegeort =
  /** Hinter dem Knoten. Elternknoten: bei einer Position/einem Hinweistext derselbe, bei einem Gliederungsknoten dessen erster Unterknoten (Ticket 05). */
  | { readonly art: 'nach'; readonly knotenId: KnotenId }
  | { readonly art: 'anfang'; readonly elternId: ElternId }
  | { readonly art: 'ende'; readonly elternId: ElternId };

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
 * ChangeSet mit `konflikt` ab; sie werden vorher mit eigenen Löschbefehlen entfernt (siehe „Offene Typfragen“).
 */
export interface ProjektLoeschen {
  readonly art: 'ProjektLoeschen';
}

export type ProjektBefehl = ProjektAnlegen | ProjektStammdatenSetzen | BieterAnlegen | ProjektLoeschen;

// --- Leistungsverzeichnis: Anlegen und Stammdaten ------------------------------------------------------

/**
 * Legt ein LV an, leer oder mit vollem Inhalt (GAEB-Import, Laden einer Fixture). Der Kern berechnet die Summen
 * und liefert sie im ChangeSet. `id` und `inhalt.wurzelId` sind dieselbe Kennung (v1.1a); die Prüfung liegt im Kern.
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

/** Löscht den Knoten und rekursiv alle Unterknoten. */
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

// --- Felder ändern (Tickets 07, 21) -----------------------------------------------------------------------

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

export interface MengeAendern {
  readonly art: 'MengeAendern';
  readonly positionId: PositionId;
  /** `null`: Menge leeren. */
  readonly menge: Menge | null;
}

export interface EinheitAendern {
  readonly art: 'EinheitAendern';
  readonly positionId: PositionId;
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

/** Setzt Positionsart und die davon abhängigen Merkmale gemeinsam, damit nie ein halber Zustand entsteht. */
export interface PositionsartAendern {
  readonly art: 'PositionsartAendern';
  readonly positionId: PositionId;
  readonly positionsart: Positionsart;
  readonly pauschal: boolean;
  readonly bedarfMitGesamtbetrag: boolean;
  readonly bezugspositionId: PositionId | null;
  readonly grundpositionId: PositionId | null;
}

// --- Ordnungszahl (Ticket 06) -----------------------------------------------------------------------------

/** Setzt die Maske; der Kern liefert alle dadurch umnummerierten Knoten im selben ChangeSet. */
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
  | PositionsartAendern
  | OzMaskeSetzen
  | OrdnungszahlSetzen
  | Umnummerieren
  | NachlassSetzen
  | NachlassEntfernen
  | MwstSatzSetzen
  | LeistungsverzeichnisLoeschen;

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

/** Befehle gegen ein Auftrags-LV (Zustand: `AuftragsLvZustand`). Bis zur Vergabe nur das Anlegen. */
export type AuftragsLvBefehl = AuftragsLeistungsverzeichnisAnlegen;

/** Jeder Befehl, den das Befehlsprotokoll aufnimmt. */
export type Befehl = ProjektBefehl | LvBefehl | AngebotBefehl | AuftragsLvBefehl;

/** Name eines Befehls, wie er im Protokoll steht. */
export type Befehlsart = Befehl['art'];
