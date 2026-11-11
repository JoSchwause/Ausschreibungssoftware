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
/** Kennung eines Papierkorbeintrags (v1.2): eine Ablage aus `KnotenInPapierkorbLegen`, eindeutig je LV. */
export type PapierkorbeintragId = string & Marke<'PapierkorbeintragId'>;
/** Kennung eines LV-Stands (v1.2; ADR 0006): ein eingefrorener, unveränderlicher Stand eines LV. */
export type LvStandId = string & Marke<'LvStandId'>;
/** Kennung eines Aufmaßblatts (v1.4, Ticket 70 Punkt 6): eigenes Aggregat, eindeutig im Projekt. */
export type AufmassId = string & Marke<'AufmassId'>;
/** Kennung einer Rechnung (v1.4, Ticket 70 Punkt 7): eigenes Aggregat, eindeutig im Projekt. */
export type RechnungId = string & Marke<'RechnungId'>;

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

/**
 * Wurzel des LV-Baums (v1.1a): die Kennung des LV selbst bzw. des Auftrags-LV. Knoten der obersten Ebene tragen sie
 * als `elternId`. `LvInhalt.wurzelId` und `LvAnsicht.wurzelId` nennen sie, damit niemand sie getrennt durchreichen muss.
 */
export type WurzelId = LeistungsverzeichnisId | AuftragsLeistungsverzeichnisId;

/** Elternknoten im LV-Baum: die Wurzel (die Kennung des LV selbst) oder eine Gliederung. */
export type ElternId = WurzelId | GliederungId;

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
 * Dreistellige Kostengruppennummer `100` bis `999` (Glossar „Kostengruppe“; D-24): genau drei Ziffern, die erste nicht 0.
 * v1.4 (Ticket 70 Punkt 4): aus `kosten` hierher gewandert, weil LV, Auftrags-LV und Kostenermittlung sie tragen (A4);
 * `kosten` importiert sie von hier. Erzeugt wird sie weiter nur von `kgLesen` in `kosten` (aus Text, an den Rändern);
 * Ebene, Elternteil und Sortierung folgen dort allein aus den Ziffern. Die Bezeichnungen der Norm stehen nicht im Repo (G-16).
 * Wer eine Nummer aus einem Befehl oder einer Datei liest (Kern, `speicher`), prüft die Form selbst nach.
 */
export type Kostengruppennummer = string & Marke<'Kostengruppennummer'>;

/**
 * Quelle für neue Kennungen. Wird von außen in Kern, Parser und Oberfläche gereicht (A2: kein Zufall,
 * keine Uhr im reinen Code). Die Umsetzung (UUIDv7) liegt in der App.
 *
 * Es gibt genau diese eine Schnittstelle (v1.1a). Wer nur einen Teil braucht, schneidet sie mit `Pick` zu, z. B.
 * `GridIdQuelle` in `ansicht.ts`; eine zweite, eigene ID-Quelle in einem Paket ist nicht vorgesehen.
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
  /** v1.2: für `KnotenInPapierkorbLegen`. */
  papierkorbeintrag(): PapierkorbeintragId;
  /** v1.2: für `LvStandAnlegen`. */
  lvStand(): LvStandId;
}
