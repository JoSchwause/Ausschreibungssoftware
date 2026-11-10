// SPDX-License-Identifier: AGPL-3.0-or-later
// Markentypen (Branded Types) und Kennungen. Nur Typen, kein Laufzeitcode.

declare const marke: unique symbol;

/**
 * Marke für nominale Typen über einem Grundtyp. Eine Marke mit mehr Namen ist ein Untertyp
 * der Marke mit weniger Namen: `PositionId` ist zuweisbar an `KnotenId`, nicht umgekehrt.
 */
export type Marke<N extends string> = { readonly [marke]: { readonly [K in N]: true } };

// --- Kennungen (UUIDv7, Regel A7) ---------------------------------------------------------
// Eine Kennung wird von außen erzeugt (Kern und `vertrag` erzeugen nie Kennungen; A2) und ist
// undurchsichtig. Die Ordnungszahl ist nie ein Schlüssel.

export type ProjektId = string & Marke<'ProjektId'>;
export type LeistungsverzeichnisId = string & Marke<'LeistungsverzeichnisId'>;
export type AuftragsLeistungsverzeichnisId = string & Marke<'AuftragsLeistungsverzeichnisId'>;
export type AngebotId = string & Marke<'AngebotId'>;
export type BieterId = string & Marke<'BieterId'>;
export type ProtokollId = string & Marke<'ProtokollId'>;
export type BildId = string & Marke<'BildId'>;

/** Kennung eines Knotens im LV-Baum. Eindeutig innerhalb eines Aggregats (siehe `PositionId`). */
export type KnotenId = string & Marke<'KnotenId'>;
/** Los oder Titel. */
export type GliederungId = string & Marke<'KnotenId' | 'GliederungId'>;
export type LosId = string & Marke<'KnotenId' | 'GliederungId' | 'LosId'>;
export type TitelId = string & Marke<'KnotenId' | 'GliederungId' | 'TitelId'>;
/**
 * Positionsidentität (ADR 0011): Dieselbe `PositionId` bezeichnet die Position im Ausschreibungs-LV, in jedem
 * Angebot und im Auftrags-LV. Eindeutig ist sie je Aggregat; Schlüssel in `speicher` ist (Aggregat, KnotenId).
 */
export type PositionId = string & Marke<'KnotenId' | 'PositionId'>;
export type HinweistextId = string & Marke<'KnotenId' | 'HinweistextId'>;

/** Elternknoten im LV-Baum: die Wurzel (die Kennung des LV selbst) oder eine Gliederung. */
export type ElternId = LeistungsverzeichnisId | AuftragsLeistungsverzeichnisId | GliederungId;

/** Kennung des handelnden Nutzers im Befehlsprotokoll (ADR 0009). In v1 genau ein Wert. */
export type NutzerId = string & Marke<'NutzerId'>;

/**
 * Zeitpunkt als ISO-8601-Zeichenkette in UTC (`2026-11-09T12:00:00.000Z`). Wird von außen geliefert; der Kern
 * liest nie die Uhr (A2). Kein `Date` in Befehlen oder Protokoll (serialisierbar, G-01).
 */
export type Zeitstempel = string & Marke<'Zeitstempel'>;

/** Anzeige-Ordnungszahl ohne Indexbuchstaben (z. B. `01.0010`). Anzeigedatum, nie Schlüssel (A7). */
export type Ordnungszahl = string & Marke<'Ordnungszahl'>;

/**
 * Quelle für neue Kennungen. Wird von außen in Kern, Parser und Oberfläche gereicht (A2: kein Zufall,
 * keine Uhr im reinen Code). Die Umsetzung (UUIDv7) liegt in der App.
 */
export interface IdQuelle {
  projekt(): ProjektId;
  leistungsverzeichnis(): LeistungsverzeichnisId;
  auftragsLeistungsverzeichnis(): AuftragsLeistungsverzeichnisId;
  angebot(): AngebotId;
  bieter(): BieterId;
  protokoll(): ProtokollId;
  bild(): BildId;
  los(): LosId;
  titel(): TitelId;
  position(): PositionId;
  hinweistext(): HinweistextId;
}
