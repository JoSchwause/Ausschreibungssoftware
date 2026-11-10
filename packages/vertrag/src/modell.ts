// SPDX-License-Identifier: AGPL-3.0-or-later
// Fachmodell: Projekt, Leistungsverzeichnis, Angebot, Auftrags-LV (ADR 0011). Nur Typen.
//
// Alle Typen sind reine, serialisierbare Daten (keine Funktionen, kein Date, keine Klassen). Bezeichner
// sind ASCII-transliteriert (ä=ae, ö=oe, ü=ue, ß=ss), siehe GLOSSARY, Abschnitt „Schreibweise im Code“.

import type {
  AngebotId,
  AuftragsLeistungsverzeichnisId,
  BieterId,
  BildId,
  ElternId,
  HinweistextId,
  LeistungsverzeichnisId,
  LosId,
  Ordnungszahl,
  PositionId,
  ProjektId,
  TitelId,
} from './marken';
import type { Betrag, Einheitspreis, Menge, Prozent } from './zahlen';

// --- Texte ---------------------------------------------------------------------------------

/** Maßeinheit (`m`, `m²`, `psch`, `h` …), freier Text. */
export type Einheit = string;

/** Eingebettetes Bild eines Langtexts. Die Bytes liegen Base64-kodiert im Wert (JSON-tauglich). */
export interface Bild {
  readonly id: BildId;
  /** Medientyp, z. B. `image/png`. */
  readonly medientyp: string;
  /** Inhalt, Base64. */
  readonly daten: string;
}

/** Baustein eines Langtexts: Text oder Bild, in Lesereihenfolge. */
export type LangtextBaustein =
  { readonly art: 'text'; readonly text: string } | { readonly art: 'bild'; readonly bild: Bild };

/**
 * Langtext einer Position und Text eines Hinweistexts: geordnete Bausteine, damit Bilder an ihrer Stelle
 * bleiben (Ticket 22). Ein leerer Text ist `[]`. Auszeichnung (fett, Listen) ist noch nicht typisiert; siehe
 * „Offene Typfragen“ im Ticket 02.
 */
export type Langtext = readonly LangtextBaustein[];

// --- Ordnungszahl-Maske (Glossar „OZ-Maske“, G-25) ------------------------------------------------

export type OzZeichenart = 'numerisch' | 'alphanumerisch';

/** Eine Stelle der Maske: Länge und zulässige Zeichen. */
export interface OzStelle {
  readonly laenge: number;
  readonly zeichen: OzZeichenart;
}

/**
 * Maske der Ordnungszahl, je LV frei definierbar. `gliederung` hat eine Stelle je Gliederungsstufe (Stufe 1
 * zuerst); `position` ist die Positionsstelle, `index` die optionale Indexstelle. `trennzeichen` steht in der
 * Anzeige zwischen den Gruppen (`null`: keines).
 *
 * Los (F1, E-08; v1.1a): Das Los ist die oberste Stufe und zählt zu den höchstens 5 Stufen. Es hat keine eigene
 * Liste, sondern belegt `gliederung[0]`; `losStufe` sagt, ob diese Stufe die Los-Stufe ist.
 */
export interface OzMaske {
  readonly gliederung: readonly OzStelle[];
  /**
   * `true`: Die oberste Gliederungsstufe (`gliederung[0]`) ist die Los-Stufe, alle Knoten der obersten Ebene sind
   * Lose (nie Lose und Titel nebeneinander, F1). `gliederung.length` zählt das Los mit. Fehlt das Feld oder ist es
   * `false`: Die oberste Stufe sind Titel. Das Feld ist optional, damit bestehende Masken gültig bleiben.
   */
  readonly losStufe?: boolean;
  readonly position: OzStelle;
  readonly index: OzStelle | null;
  readonly trennzeichen: string | null;
}

// --- Nachlass, Einheitspreisanteile ---------------------------------------------------------------

/**
 * Nachlass: genau einer je LV und je Angebot (G-23, G-26), prozentual oder als Absolutbetrag, umkehrbar,
 * nie in die EP eingerechnet (N5). Kein Nachlass ist `null` am LV bzw. Angebot.
 */
export type Nachlass =
  { readonly art: 'prozent'; readonly wert: Prozent } | { readonly art: 'betrag'; readonly wert: Betrag };

/**
 * Einheitspreisanteile (EPA): Aufgliederung des EP in bis zu sechs Kostenarten (Glossar). Fehlende Anteile
 * sind `null`. Dass die Summe der Anteile den EP ergibt, prüft der Kern, nicht der Typ.
 */
export interface Einheitspreisanteile {
  readonly lohn: Einheitspreis | null;
  readonly stoffe: Einheitspreis | null;
  readonly geraete: Einheitspreis | null;
  readonly nachunternehmer: Einheitspreis | null;
  readonly sonstiges: Einheitspreis | null;
  readonly frei: Einheitspreis | null;
  /** Bezeichnung des frei definierbaren Anteils. */
  readonly freiBezeichnung: string | null;
}

// --- LV-Baum --------------------------------------------------------------------------------------

/**
 * Positionsart. Pauschal ist ein Merkmal (`pauschal`), keine Art; ebenso ist „Bedarf mit/ohne Gesamtbetrag“
 * ein Merkmal (`bedarfMitGesamtbetrag`) an der Art `bedarf` (Flags als Felder, ADR 0011/Ticket 02).
 * Hinweistexte sind keine Positionen, sondern eigene Knoten (`Hinweistext`).
 */
export type Positionsart = 'normal' | 'bedarf' | 'wahl' | 'zuschlag' | 'stundenlohn';

/** Fachliche Daten einer Position. Wirkung der Art auf Summen legt `kern` fest, nicht dieser Typ (P5). */
export interface Positionsdaten {
  /** `null`: noch keine Ordnungszahl vergeben (Ticket 05 legt Knoten vor der OZ-Vergabe an). */
  readonly ordnungszahl: Ordnungszahl | null;
  /** Indexbuchstabe neben der Ordnungszahl (Indexposition), `null`: keiner. Reines Anzeigedatum. */
  readonly ozIndex: string | null;
  readonly positionsart: Positionsart;
  readonly pauschal: boolean;
  /** Nur sinnvoll bei `bedarf`; sonst `false`. */
  readonly bedarfMitGesamtbetrag: boolean;
  /** Nur bei `zuschlag`: die Bezugsposition. Nur ein Verweis. */
  readonly bezugspositionId: PositionId | null;
  /** Nur bei `wahl`: die Grundposition (oder andere Wahlposition). Nur ein Verweis. */
  readonly grundpositionId: PositionId | null;
  readonly kurztext: string;
  readonly langtext: Langtext;
  /** `null`: nicht gesetzt (z. B. X81 ohne Menge). Nicht gleichbedeutend mit 0. */
  readonly menge: Menge | null;
  readonly einheit: Einheit | null;
  /** Im Ausschreibungs-LV ein Schätzpreis; `null`: nicht gesetzt. Nicht gleichbedeutend mit 0. */
  readonly einheitspreis: Einheitspreis | null;
  readonly epa: Einheitspreisanteile | null;
}

/**
 * Gemeinsame Lage eines Knotens im Baum. Die Geschwisterreihenfolge steht in `reihenfolge`: dichter Index
 * 0..n-1 je Elternknoten. Ein Einfügen oder Verschieben listet im ChangeSet alle Geschwister, deren Index sich ändert.
 */
export interface Knotenlage {
  readonly elternId: ElternId;
  readonly reihenfolge: number;
}

/** Los: nur gliedernd (G-29), steht auf der obersten Ebene. */
export interface Los extends Knotenlage {
  readonly art: 'los';
  readonly id: LosId;
  readonly ordnungszahl: Ordnungszahl | null;
  readonly kurztext: string;
}

/** Titel/Abschnitt: bis zu 5 Gliederungsebenen (Prüfung im Kern). */
export interface Titel extends Knotenlage {
  readonly art: 'titel';
  readonly id: TitelId;
  readonly ordnungszahl: Ordnungszahl | null;
  readonly kurztext: string;
}

export interface Position extends Knotenlage, Positionsdaten {
  readonly art: 'position';
  readonly id: PositionId;
}

/** Hinweistext/Vorbemerkung: ohne Menge, Einheit und Preis. */
export interface Hinweistext extends Knotenlage {
  readonly art: 'hinweis';
  readonly id: HinweistextId;
  readonly text: Langtext;
}

export type Gliederung = Los | Titel;
export type Knoten = Los | Titel | Position | Hinweistext;

// --- Aggregate (ADR 0011) -------------------------------------------------------------------------

/** Bauherr des Projekts. Felder vorläufig, siehe „Offene Typfragen“. */
export interface Bauherr {
  readonly name: string;
  readonly anschrift: string | null;
}

/** Bieter eines Projekts, von Angeboten über `BieterId` referenziert. */
export interface Bieter {
  readonly id: BieterId;
  readonly name: string;
}

/** Oberste Ebene: Name, Bauherr, Bieter. Die LVs und Angebote verweisen mit `projektId` auf das Projekt. */
export interface Projekt {
  readonly id: ProjektId;
  readonly name: string;
  readonly bauherr: Bauherr;
  readonly bieter: readonly Bieter[];
}

/** Stammdaten eines LV ohne Knoten (Ausschreibung). MwSt: ein Satz je LV (G-28). */
export interface LvInhaltKopf {
  readonly name: string;
  readonly ozMaske: OzMaske;
  readonly mwstSatz: Prozent;
  readonly nachlass: Nachlass | null;
}

/** Inhalt eines LV ohne Kennung und Projekt, z. B. das Ergebnis eines GAEB-Imports. */
export interface LvInhalt extends LvInhaltKopf {
  /**
   * Die Wurzel des Baums (v1.1a): die Kennung, die die Knoten der obersten Ebene als `elternId` tragen. Der Aufrufer
   * (GAEB-Leser, Fixture) setzt sie aus seiner `IdQuelle`; die App muss die Wurzel nicht mehr umhängen.
   *
   * Vorläufige Annahme, Entscheidung offen (enge Lesart): Beim Anlegen ist `LeistungsverzeichnisAnlegen.id`
   * maßgeblich; weicht `wurzelId` davon ab, weist der Kern mit `ungueltige-eingabe` und `feld: 'inhalt.wurzelId'` ab
   * (Offene Typfrage H, Ticket 24).
   */
  readonly wurzelId: LeistungsverzeichnisId;
  /** Flach, in Dokumentreihenfolge; Eltern vor Kindern. Lage über `elternId` und `reihenfolge`. */
  readonly knoten: readonly Knoten[];
}

export interface LvKopf extends LvInhaltKopf {
  readonly id: LeistungsverzeichnisId;
  readonly projektId: ProjektId;
}

/** Ausschreibungs-LV. */
export interface Leistungsverzeichnis extends LvKopf {
  readonly knoten: readonly Knoten[];
}

/** Eine Angebotszeile: Preis eines Bieters zu einer Position, oder „nicht angeboten“ (≠ 0,00; Spec §6a). */
export type Angebotsposition =
  | {
      readonly positionId: PositionId;
      readonly status: 'angeboten';
      readonly einheitspreis: Einheitspreis;
      readonly epa: Einheitspreisanteile | null;
    }
  | { readonly positionId: PositionId; readonly status: 'nicht-angeboten' };

export interface AngebotKopf {
  readonly id: AngebotId;
  readonly projektId: ProjektId;
  /** Das Ausschreibungs-LV, auf das sich das Angebot bezieht (Positionsidentität). */
  readonly leistungsverzeichnisId: LeistungsverzeichnisId;
  readonly bieterId: BieterId;
  /** Eigener Nachlass des Angebots (G-26); erbt den des LV nicht. */
  readonly nachlass: Nachlass | null;
}

/** Angebot eines Bieters. Der MwSt-Satz ist der des LV. */
export interface Angebot extends AngebotKopf {
  readonly positionen: readonly Angebotsposition[];
}

/** Stammdaten des Auftrags-LV. Die Positionsidentität bleibt die des Ausschreibungs-LV. */
export interface AuftragsLvKopf extends LvInhaltKopf {
  readonly id: AuftragsLeistungsverzeichnisId;
  readonly projektId: ProjektId;
  /** Das Ausschreibungs-LV, aus dem es entstand. */
  readonly leistungsverzeichnisId: LeistungsverzeichnisId;
  /** Das beauftragte Angebot. */
  readonly angebotId: AngebotId;
}

/** Auftrags-LV: eigenes Aggregat, Knoten mit den Positions-IDs der Ausschreibung. */
export interface AuftragsLeistungsverzeichnis extends AuftragsLvKopf {
  readonly knoten: readonly Knoten[];
}
