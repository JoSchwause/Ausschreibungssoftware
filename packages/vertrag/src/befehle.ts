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

export type ProjektBefehl = ProjektAnlegen | ProjektStammdatenSetzen | BieterAnlegen;

// --- Leistungsverzeichnis: Anlegen und Stammdaten ------------------------------------------------------

/**
 * Legt ein LV an, leer oder mit vollem Inhalt (GAEB-Import, Laden einer Fixture). Der Kern berechnet die Summen
 * und liefert sie im ChangeSet.
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

// --- LV-Baum (Ticket 05) ---------------------------------------------------------------------------------

export interface GliederungAnlegen {
  readonly art: 'GliederungAnlegen';
  readonly id: GliederungId;
  /** `los` oder `titel`. */
  readonly gliederungsart: 'los' | 'titel';
  readonly ort: Einfuegeort;
  readonly kurztext: string;
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
  | MwstSatzSetzen;

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

/** Befehle gegen ein Angebot (Zustand: `AngebotZustand`). */
export type AngebotBefehl =
  AngebotAnlegen | AngebotspositionSetzen | AngebotsNachlassSetzen | AngebotsNachlassEntfernen;

/** Jeder Befehl, den das Befehlsprotokoll aufnimmt. */
export type Befehl = ProjektBefehl | LvBefehl | AngebotBefehl;

/** Name eines Befehls, wie er im Protokoll steht. */
export type Befehlsart = Befehl['art'];
