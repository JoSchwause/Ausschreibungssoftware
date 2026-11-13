// SPDX-License-Identifier: AGPL-3.0-or-later
// Honorarberechnung nach HOAI 2021 (v1.6, Ticket 97 Punkt 5; X3, D-56): gespeicherte Eingaben und das gerechnete
// Honorarergebnis. Nur Typen. Gerechnet wird im Paket `honorar` (Tickets 101, 110); App und `ausgabe` lesen das Ergebnis,
// deshalb steht es im Vertrag. Namen und Formen folgen dem Paket `honorar` (D-101.10); anders ist nur, was gespeichert wird:
// die anrechenbaren Kosten als Verweis auf eine Kostenermittlung statt als Beträge der Kostengruppen. Befehle in
// `befehle.ts`, ChangeSet und Zustand in `changeset.ts`.

import type { HonorarberechnungId, KostenermittlungId, ProjektId } from './marken';
import type { Pruefbefund } from './gaeb';
import type { Betrag, Prozent } from './zahlen';

/**
 * Leistungsbild der HOAI (Glossar „Leistungsbild & Leistungsphasen“; v1.6, D-56), für das die App Honorare rechnet. Eine
 * geschlossene Liste; welche Honorarzonen und Leistungsphasen ein Leistungsbild hat, weiß `honorar` (`LEISTUNGSBILDER`).
 */
export type Leistungsbild =
  | 'gebaeude'
  | 'innenraeume'
  | 'freianlagen'
  | 'ingenieurbauwerke'
  | 'verkehrsanlagen'
  | 'tragwerksplanung'
  | 'technische-ausruestung';

/**
 * Honorarzone in der Schreibweise der HOAI (Glossar „Honorarzone“; v1.6, D-101.10): `'I'` bis `'V'`. Der Nutzer wählt sie;
 * welche Zonen ein Leistungsbild kennt (Technische Ausrüstung nur I bis III), prüft `honorar` (Befund, keine Sperre).
 */
export type Honorarzone = 'I' | 'II' | 'III' | 'IV' | 'V';

/** Nummer einer Leistungsphase (LP 1 bis LP 9), eine Nummer, kein Betrag (N1 gilt nicht). */
export type Leistungsphasennummer = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/**
 * Eine beauftragte Leistungsphase (§ 8 Abs. 1; v1.6, D-101.4). Nicht beauftragte Phasen stehen nicht in der Liste.
 * `anteil` fehlt: der Prozentsatz der HOAI für diese Phase (aus den Daten von `honorar`). Gesetzt: ein vereinbarter Anteil in
 * Prozent des Honorars (§ 8 Abs. 2, z. B. § 51 Abs. 2 bis 4, § 55 Abs. 2), der den Satz der HOAI ersetzt, auch wenn er ihm
 * gleicht; weicht er ab, ist das ein Befund der Rechnung.
 */
export interface BeauftragteLeistungsphase {
  readonly nummer: Leistungsphasennummer;
  readonly anteil?: Prozent;
}

/**
 * Wie die anrechenbaren Kosten eines Honorarobjekts entstehen (Glossar „Anrechenbare Kosten“; v1.6, Ticket 97 Punkt 5, D-56):
 * - `betrag`: von Hand, netto (§ 4 Abs. 1), für jedes Leistungsbild.
 * - `kostenermittlung`: aus einer Kostenermittlung desselben Projekts nach § 33 (nur Gebäude und Innenräume; sonst ein
 *   Befund): KG 300 und KG 400 rechnet `honorar` aus deren Einträgen (eigener Betrag plus Kinder, D-24), dazu von Hand
 *   `weitereKosten` (§ 33 Abs. 3; mit KG 300 die „sonstigen anrechenbaren Kosten“) und `mitzuverarbeitendeBausubstanz`
 *   (§ 2 Abs. 7, § 4 Abs. 3; `0.00`: keine). `technischeAnlagenAnteilig: true` (der übliche Fall): Der Auftragnehmer plant
 *   oder überwacht die Technischen Anlagen nicht selbst; KG 400 zählt anteilig nach § 33 Abs. 2. `false`: KG 400 zählt hier
 *   nicht. Namen wie in `honorar` (`KostenNachDin276`, D-101.5, D-101.10). Nachtrag Review (D-66): Dieser Name meint nur die
 *   gespeicherte Form; die Eingabe der Rechnung in `honorar` (Betrag oder die Beträge von KG 300 und KG 400) heißt
 *   `AnrechenbareKosteneingabe` (Glossar; Umbenennung in Ticket 110).
 *
 * Lesarten (vorläufige Annahme, Entscheidung offen, enge Lesart): Gespeichert wird der **Verweis** auf die Kostenermittlung,
 * nicht ihre Beträge; eine spätere Änderung der Kostenermittlung ändert das Honorar mit. Grundlage nach § 6 Abs. 1 Nr. 2 ist
 * die Kostenberechnung, ohne sie die Kostenschätzung; eine andere Stufe ist ein Befund, keine Sperre (Ticket 110). Eine
 * Kostenermittlung, auf die eine Honorarberechnung verweist, lässt sich nicht löschen (`konflikt` in `speicher`, Q5); eine
 * Kennung ohne Kostenermittlung im Projekt weist `speicher` ebenso mit `konflikt` ab.
 */
export type AnrechenbareKostenangabe =
  | { readonly art: 'betrag'; readonly betrag: Betrag }
  | {
      readonly art: 'kostenermittlung';
      readonly kostenermittlungId: KostenermittlungId;
      readonly technischeAnlagenAnteilig: boolean;
      readonly weitereKosten: Betrag;
      readonly mitzuverarbeitendeBausubstanz: Betrag;
    };

/**
 * Honorarobjekt (Glossar; v1.6, D-56): ein Objekt (§ 2 Abs. 1), dessen Honorar für sich berechnet wird (§ 11 Abs. 1).
 *
 * Lesarten (vorläufige Annahme, Entscheidung offen): Der Ausführer prüft nur die Form (Werte der Listen, kanonische
 * Dezimalwerte, Leistungsphasen aufsteigend und je höchstens einmal, Bezeichnung nicht leer). Was die HOAI anders vorsieht,
 * ist ein Befund der Rechnung, keine Sperre (U5, D-101.3 bis D-101.5): ein Honorarsatz unter 0 oder über 100, eine Zone oder
 * Leistungsphase, die das Leistungsbild nicht hat, ein Umbauzuschlag über 33 bzw. 50 Prozent, negative Beträge.
 */
export interface Honorarobjekt {
  readonly bezeichnung: string;
  readonly leistungsbild: Leistungsbild;
  readonly honorarzone: Honorarzone;
  /**
   * Lage des Honorars in der Honorarspanne in Prozent der Spanne (Glossar „Honorarsatz“): 0 = Basishonorarsatz (Standard
   * nach § 7 Abs. 1), 100 = oberer Honorarsatz. „Mittelsatz“ ist keine HOAI-Bezeichnung, nur ein Vorschlag der App (50).
   */
  readonly honorarsatz: Prozent;
  readonly anrechenbareKosten: AnrechenbareKostenangabe;
  /** Die beauftragten Leistungsphasen, nach `nummer` aufsteigend; `[]`: keine beauftragt (Honorar 0,00 mit Befund). */
  readonly leistungsphasen: readonly BeauftragteLeistungsphase[];
  /** Umbauzuschlag in Prozent des Grundhonorars (§ 6 Abs. 2, § 36); `null`: kein Zuschlag. */
  readonly umbauzuschlagssatz: Prozent | null;
}

/** Nebenkosten nach § 14 (Glossar „Nebenkosten“): in Prozent von Grundhonorar plus Umbauzuschlägen oder als Betrag. */
export type Nebenkostenangabe =
  { readonly art: 'prozent'; readonly satz: Prozent } | { readonly art: 'betrag'; readonly betrag: Betrag };

/**
 * Honorarberechnung (Glossar; v1.6, Ticket 97 Punkt 5, D-56): die Honorarobjekte eines Auftrags mit Nebenkosten und MwSt-Satz,
 * ein eigenes Aggregat des Projekts (mehrere je Projekt, etwa je Planer). Gespeichert werden nur die Eingaben; das
 * Honorarergebnis rechnet `honorar`, nie gespeichert. Befehle führt `honorar` aus (Ticket 110).
 */
export interface Honorarberechnung {
  readonly id: HonorarberechnungId;
  readonly projektId: ProjektId;
  /** Name, den der Nutzer vergibt (z. B. „Architekt, LPH 1–9“), nicht leer. */
  readonly name: string;
  /** Die Honorarobjekte in Anzeigereihenfolge; Befunde nennen sie über ihre Stelle (`/objekte[n]`, ab 1). */
  readonly objekte: readonly Honorarobjekt[];
  /** `null`: keine Nebenkosten. */
  readonly nebenkosten: Nebenkostenangabe | null;
  /** MwSt-Satz (die Umsatzsteuer nach § 16 Abs. 1) auf das Netto aus Honorar und Nebenkosten. */
  readonly mwstSatz: Prozent;
}

// --- Gerechnet, nie gespeichert (von `honorar` erzeugt, von App und `ausgabe` gelesen; Formen wie in `honorar`) -------------

/** „von“ (Basishonorarsatz) und „bis“ (oberer Honorarsatz) einer Honorarzone in Euro (Glossar „Honorarspanne“). */
export interface Honorarspanne {
  readonly von: Betrag;
  readonly bis: Betrag;
}

/** Eine Zeile einer Honorartafel (Glossar „Honorartafel“): anrechenbare Kosten und je Zone der Tafel die Spanne. */
export interface Tafelzeile {
  readonly anrechenbareKosten: Betrag;
  readonly spannen: Readonly<Partial<Record<Honorarzone, Honorarspanne>>>;
}

/** Die Tafelzeilen um die anrechenbaren Kosten und die nach § 13 interpolierte Spanne der Zone (bei einem Treffer gleich). */
export interface Tafelinterpolation {
  readonly zeileUnten: Tafelzeile;
  readonly zeileOben: Tafelzeile;
  readonly spanne: Honorarspanne;
}

/** Die Herleitung der anrechenbaren Kosten nach § 33, jeder Teilbetrag mit 2 Stellen (D-56; Form wie in `honorar`). */
export interface AnrechenbareKostenHerleitung {
  readonly kg300: Betrag;
  readonly weitereKosten: Betrag;
  /** KG 300 plus weitere Kosten: die sonstigen anrechenbaren Kosten des § 33 Abs. 2. */
  readonly sonstigeAnrechenbareKosten: Betrag;
  readonly kg400: Betrag;
  /** 25 % der sonstigen anrechenbaren Kosten (§ 33 Abs. 2 Nr. 1). */
  readonly grenzeTechnischeAnlagen: Betrag;
  /** Der Teil von KG 400 bis zur Grenze, voll angerechnet; 0,00, wenn nicht anteilig. */
  readonly kg400Voll: Betrag;
  /** Die Hälfte des Teils von KG 400 über der Grenze (Nr. 2); 0,00, wenn nicht anteilig. */
  readonly kg400Haelfte: Betrag;
  readonly mitzuverarbeitendeBausubstanz: Betrag;
  /** Sonstige anrechenbare Kosten + KG 400 voll + KG 400 zur Hälfte + mitzuverarbeitende Bausubstanz. */
  readonly anrechenbareKosten: Betrag;
}

/** Betrag einer angesetzten Leistungsphase: round(Honorar × Anteil / 100, 2) (D-56). */
export interface Phasenbetrag {
  readonly nummer: Leistungsphasennummer;
  /** Name der Leistungsphase wie in der HOAI, z. B. „Vorplanung“ (aus den Daten von `honorar`). */
  readonly name: string;
  /** Der angesetzte Anteil: der Satz der HOAI oder der vereinbarte Anteil der Eingabe. */
  readonly anteil: Prozent;
  readonly betrag: Betrag;
}

/** Ergebnis eines Honorarobjekts (D-56), in der Reihenfolge der Eingabe. */
export interface Objektergebnis {
  readonly bezeichnung: string;
  readonly leistungsbild: Leistungsbild;
  readonly honorarzone: Honorarzone;
  /** `null`, wenn sie sich nicht bestimmen lassen (Befund). */
  readonly anrechenbareKosten: Betrag | null;
  /** Herleitung nach § 33; `null` bei anrechenbaren Kosten von Hand. */
  readonly herleitung: AnrechenbareKostenHerleitung | null;
  /** `null`: kein Honorar für das Objekt (außerhalb der Tafel, Zone unbekannt; Befund). */
  readonly tafel: Tafelinterpolation | null;
  /** Honorar im Honorarsatz, bezogen auf alle Leistungsphasen (100 %); `null` ohne Tafelwert. */
  readonly honorar: Betrag | null;
  /** Die angesetzten Leistungsphasen nach Nummer; leer ohne Honorar. */
  readonly phasen: readonly Phasenbetrag[];
  /** Summe der Phasenbeträge; 0,00 ohne Honorar. */
  readonly grundhonorar: Betrag;
  /** round(Grundhonorar × Umbauzuschlagssatz / 100, 2); 0,00 ohne Satz. */
  readonly umbauzuschlag: Betrag;
}

/**
 * Honorarergebnis (Glossar „Honorarberechnung“; v1.6, Ticket 97 Punkt 5, D-56): je Objekt und gesamt, nie gespeichert. Form
 * wie `Honorarergebnis` in `honorar` (Ticket 101); die Befunde stehen in der gemeinsamen Befundliste (D-97.11).
 */
export interface Honorarergebnis {
  readonly objekte: readonly Objektergebnis[];
  readonly grundhonorar: Betrag;
  readonly umbauzuschlaege: Betrag;
  readonly nebenkosten: Betrag;
  /** Grundhonorar + Umbauzuschläge + Nebenkosten. */
  readonly netto: Betrag;
  /** round(Netto × MwSt-Satz / 100, 2) (§ 16 Abs. 1). */
  readonly mwst: Betrag;
  readonly brutto: Betrag;
  /**
   * Befunde der Honorarberechnung (Quelle `honorarberechnung`, Ort siehe `Befundort`): erst je Objekt in Eingabereihenfolge,
   * je Objekt in der Folge der Rechnung, dann die übrigen (D-101.7).
   *
   * Nachtrag Review (D-66): Der Hinweis, dass § 4 Abs. 1 auf DIN 276 in der Fassung 2008-12 verweist (D-56), ist **nie** ein
   * Befund und kein Teil des Honorarergebnisses; er gilt für jede Berechnung gleich. App (Ticket 119) und PDF (Ticket 113)
   * drucken ihn als festen Text. Eine Berechnung ohne Auffälligkeiten hat `befunde: []` (so auch `fixtures/honorar.json`).
   */
  readonly befunde: readonly Pruefbefund[];
}
