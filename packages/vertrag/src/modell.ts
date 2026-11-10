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

/**
 * Auszeichnung eines Textlaufs (v1.1b, Punkt 5; F6, E-10): fett, kursiv, unterstrichen. Jede Eigenschaft ist
 * entweder `true` oder fehlt; es gibt nur diese eine Schreibweise für „aus“ (kein `false`), damit gleiche Texte
 * gleich aussehen (kanonische JSON-Datei, A8).
 */
export interface Auszeichnung {
  readonly fett?: true;
  readonly kursiv?: true;
  readonly unterstrichen?: true;
}

/**
 * Textlauf: Text mit einheitlicher Auszeichnung. Ein `\n` im Text gilt als Zeilenumbruch (so schreibt der
 * Leser bis v1.1a); neuer Code setzt stattdessen `Zeilenumbruch`.
 */
export interface Textlauf extends Auszeichnung {
  readonly art: 'text';
  readonly text: string;
}

/** Harter Zeilenumbruch innerhalb eines Absatzes (GAEB `br`). */
export interface Zeilenumbruch {
  readonly art: 'umbruch';
}

/** Bild im Text, an seiner Stelle (Ticket 22). */
export interface Textbild {
  readonly art: 'bild';
  readonly bild: Bild;
}

/** Inhalt einer Textergänzung: Textläufe und Zeilenumbrüche, kein Block, kein Bild. */
export type Textfluss = readonly (Textlauf | Zeilenumbruch)[];

/** Wer eine Textergänzung ausfüllt: der Bieter oder der Ausschreibende (GAEB `Kind`: `Bidder`, `Owner`). */
export type Ergaenzungsherkunft = 'bieter' | 'ausschreibender';

/**
 * Textergänzung (v1.1b, Punkt 5): eine Stelle im Text, die einer der beiden Seiten ausfüllt, mit Kennung. Die drei
 * Teile folgen der Datei (GAEB `ComplCaption`, `ComplBody`, `ComplTail`): `davor`, `inhalt`, `danach`; `inhalt` ist
 * die Stelle selbst (beim Bieter die Eingabe, die X84 zurückträgt).
 *
 * Nicht typisiert (Befund beim Import, siehe „Offene Typfragen“, Ticket 26): der Zahlenwert `ComplBodyDec` und
 * die Katalogkennung `ArtChrIdent`.
 */
export interface Textergaenzung {
  readonly art: 'ergaenzung';
  readonly herkunft: Ergaenzungsherkunft;
  /** Kennung der Stelle (GAEB `MarkLbl`), Zeichenkette, weil sie nur Name ist (nie gerechnet). */
  readonly kennung: string;
  /** Attribut `Empty` der Datei; die Bedeutung ist nur aus den Dateien belegt, nicht aus der Fachdokumentation. */
  readonly leer: boolean;
  readonly davor: Textfluss;
  readonly inhalt: Textfluss;
  readonly danach: Textfluss;
}

/** Baustein innerhalb eines Absatzes. Eine Textergänzung steht nicht darin (siehe `LangtextBaustein`). */
export type LangtextInline = Textlauf | Zeilenumbruch | Textbild;

/** Absatz (GAEB `p`, ProseMirror `paragraph`). */
export interface Absatz {
  readonly art: 'absatz';
  readonly inhalt: readonly LangtextInline[];
}

/** Aufzählung (`geordnet: false`) oder nummerierte Liste (GAEB `ul`, `ol`). Jeder Punkt ist selbst ein Langtext. */
export interface Liste {
  readonly art: 'liste';
  readonly geordnet: boolean;
  readonly punkte: readonly LangtextInnen[];
}

/** Zelle einer Tabelle; `spalten` ist die Zahl der überspannten Spalten (GAEB `colspan`, mindestens 1). */
export interface Tabellenzelle {
  readonly spalten: number;
  readonly inhalt: LangtextInnen;
}

export interface Tabellenzeile {
  readonly zellen: readonly Tabellenzelle[];
}

/** Tabelle (GAEB `table`, `tr`, `td`). */
export interface Tabelle {
  readonly art: 'tabelle';
  readonly zeilen: readonly Tabellenzeile[];
}

/**
 * Baustein eines Langtexts innerhalb eines Listenpunkts oder einer Tabellenzelle: alles außer der Textergänzung. Wie
 * in GAEB dürfen Textläufe und Bilder auch ohne Absatz direkt stehen; aufeinanderfolgende solche Bausteine sind ein
 * Absatz (siehe „Offene Typfragen“, Ticket 26).
 */
export type LangtextInnenBaustein = LangtextInline | Absatz | Liste | Tabelle;

/** Inhalt eines Listenpunkts oder einer Tabellenzelle: wie `Langtext`, aber ohne Textergänzung. */
export type LangtextInnen = readonly LangtextInnenBaustein[];

/**
 * Baustein eines Langtexts, in Lesereihenfolge. Die Textergänzung steht nur auf oberster Ebene, nie in einem Absatz,
 * Listenpunkt oder einer Tabellenzelle: GAEB hält `TextComplement` nur als Geschwister der Textblöcke (geöffnet:
 * BVBS 3.3 Bauausführung X83, neben `Text` in `DetailTxt`), G2 könnte sie sonst nicht ohne Zerteilen schreiben. Die
 * Formen vor v1.1b (`text` ohne Auszeichnung und `bild`) bleiben unverändert gültig.
 */
export type LangtextBaustein = LangtextInnenBaustein | Textergaenzung;

/**
 * Langtext einer Position und Text eines Hinweistexts: geordnete Bausteine, damit Bilder an ihrer Stelle
 * bleiben (Ticket 22). Ein leerer Text ist `[]`. Ab v1.1b trägt er die GAEB-abbildbare Teilmenge (F6, E-10):
 * Auszeichnung (fett, kursiv, unterstrichen), Absätze, Listen, Tabellen, Bilder und Textergänzungen. Schriftart,
 * -größe, Farbe, Ausrichtung, Seitenumbruch und Bildgröße sind nicht abgebildet (Befund beim Import).
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
 * Bedarfsposition (F4, F5): `ohne-gesamtbetrag` wird ausgewiesen und nicht summiert, `mit-gesamtbetrag` summiert.
 * Eine Zeichenfolge statt zweier Felder, damit „mit Gesamtbetrag“ ohne Bedarf nicht darstellbar ist (GAEB `Provis`:
 * `WithTotal`, `WithoutTotal`).
 */
export type Bedarf = 'ohne-gesamtbetrag' | 'mit-gesamtbetrag';

/**
 * Zugehörigkeit zu einer Wahl (F4, E-04; v1.1b, Punkt 3): Gruppen- und Variantennummer aus GAEB (`ALNGroupNo`,
 * `ALNSerNo`). Variante 0 ist die Grundausführung, 1 bis 9 sind Varianten (Fachdokumentation laut Ticket 22,
 * Abschnitt 4.5.2). Es gibt keinen Zustand „gewählt“: Das Wählen geschieht bei der Vergabe (Welle 4, E-04).
 *
 * `gruppe` und `variante` sind nullbar. `null` heißt „keine Nummer bekannt“ und ist der Wert für Wahlpositionen, die
 * nicht aus GAEB stammen oder aus Daten vor v1.1b (Fixtures, gespeicherte Projekte): Diese haben nur den Verweis auf
 * die Grundposition, und eine Nummer erfinden darf kein Paket. Vorläufige Annahme, Entscheidung offen (enge Lesart);
 * Alternative: Pflichtfelder (Offene Typfrage, Ticket 26).
 */
export interface Wahlzuordnung {
  readonly gruppe: number | null;
  readonly variante: number | null;
  /**
   * Die Grundposition (oder eine andere Wahlposition), zu der diese Position die Alternative ist; nur ein Verweis,
   * ersetzt nie (F4). Vorläufige Annahme, Entscheidung offen (enge Lesart): bleibt aus v1.1a erhalten, auch wenn
   * `gruppe` und `variante` sie ableitbar machen (Offene Typfrage, Ticket 26).
   */
  readonly grundpositionId: PositionId | null;
}

/**
 * Kombinierbare Merkmale einer Position (F5, E-05; v1.1b, Punkt 1). Der Typ lässt jede Kombination zu, auch
 * solche, die fachlich unsinnig sind; welche ungültig sind, entscheidet der Kern (P5). Wirkung der Merkmale auf
 * Summen legt `kern` fest (K5), nicht dieser Typ.
 */
export interface Positionsmerkmale {
  /** `null`: keine Bedarfsposition. */
  readonly bedarf: Bedarf | null;
  /** `null`: nicht Teil einer Wahl. Eine Position mit `variante` 0 ist die Grundausführung, keine Alternative. */
  readonly wahl: Wahlzuordnung | null;
  /** Stundenlohnposition (GAEB `HourIt`; nur aus den amtlichen Dateien belegt, Ticket 22). */
  readonly stundenlohn: boolean;
  readonly pauschal: boolean;
  /**
   * Kennzeichnung für den Zuschlag (GAEB `MarkupIt`): Die Position gehört zum Bezug einer Zuschlagsposition mit
   * `Zuschlagsbezug.art === 'kennzeichnung'`. Vorläufige Annahme, Entscheidung offen (enge Lesart): ein einziges
   * Kennzeichen; mit mehreren solchen Zuschlagspositionen ist nicht unterscheidbar, welche gemeint ist.
   */
  readonly zuschlagskennzeichen: boolean;
}

/** Eine Bezugsposition einer Zuschlagsposition, optional mit Teilmenge (GAEB `MarkupSubQty`/`RefItem`). */
export interface Bezugsposition {
  readonly positionId: PositionId;
  /**
   * Teilmenge der Bezugsposition, auf die sich der Zuschlag bezieht; `null`: keine Angabe. Die amtlichen Dateien
   * zeigen nur `RefItem` ohne Menge; die Teilmenge stammt aus Ticket 22 (Fachdokumentation 11.2.3, dort zitiert).
   */
  readonly teilmenge: Menge | null;
}

/**
 * Bezug einer Zuschlagsposition: die drei Formen aus den amtlichen Dateien (Ticket 22; GAEB `MarkupType`).
 * - `positionen`: eine Liste einzelner Positionen, je mit optionaler Teilmenge (`ListInSubQty`). Leer: noch kein Bezug.
 * - `gliederung`: alle Positionen der Gliederung, unter der die Zuschlagsposition steht (`AllInCat`); die Gliederung
 *   ist der Elternknoten, es gibt keine zweite Angabe.
 * - `kennzeichnung`: alle Positionen mit `Positionsmerkmale.zuschlagskennzeichen` (`IdentAsMark`).
 * Welche dieser Positionen eingehen (alle davorstehenden?) und wie gerechnet wird, legt K6 fest.
 */
export type Zuschlagsbezug =
  | { readonly art: 'positionen'; readonly positionen: readonly Bezugsposition[] }
  | { readonly art: 'gliederung' }
  | { readonly art: 'kennzeichnung' };

/**
 * Zuschlagsposition (F3, E-03; v1.1b, Punkt 2): GAEB-Semantik (`MarkupItem`), ein Prozentsatz auf die Summe der
 * Bezugspositionen statt Menge × EP. Der Vertrag hält nur die Bezüge und den Satz; die Rechenregel legt K6 fest,
 * nachdem die Fachdokumentation wörtlich zitiert ist.
 *
 * Eine Zuschlagsposition braucht keine Menge und keinen Einheitspreis: `Positionsdaten.menge`, `einheit` und
 * `einheitspreis` bleiben nullbar. Bis K6 rechnet der Kern eine Zuschlagsposition mit Menge und EP vorläufig wie
 * bisher (Fixture `typisch`, Annahme A4); sie sind dann weiter gesetzt.
 */
export interface Zuschlag {
  /** `null`: nicht gesetzt (die Ausschreibungsdateien X81/X83 tragen keinen Satz, X84/X86 tragen ihn als `Markup`). */
  readonly prozentsatz: Prozent | null;
  readonly bezug: Zuschlagsbezug;
}

/**
 * Unterbeschreibung einer Leitbeschreibung (E-11; GAEB `SubDescr`): eine Teilleistung mit eigenem Text und
 * optionaler Menge. Nicht typisiert (Befund): Katalognummer und Textergänzungs-Kennzeichen.
 */
export interface Unterbeschreibung {
  /** Nummer in der Leitbeschreibung (GAEB `SubDNo`), Zeichenkette, weil führende Nullen vorkommen (`01`). */
  readonly nummer: string;
  readonly kurztext: string;
  readonly langtext: Langtext;
  /** `null`: keine Mengenangabe (GAEB `QtySpec` nicht `Yes`). */
  readonly menge: Menge | null;
  readonly einheit: Einheit | null;
}

/**
 * Leitbeschreibung (E-11; GAEB `SumDescr`): Die Position fasst Unterbeschreibungen zusammen; ihr eigener Text
 * ist der Leittext. Ob eine Leitbeschreibung ohne Unterbeschreibungen vorkommt, ist offen; der Typ lässt sie zu.
 */
export interface Leitbeschreibung {
  readonly unterbeschreibungen: readonly Unterbeschreibung[];
}

/**
 * Fachliche Daten einer Position. Wirkung der Merkmale auf Summen legt `kern` fest, nicht dieser Typ (P5).
 * Hinweistexte sind keine Positionen, sondern eigene Knoten (`Hinweistext`). Den einzelnen Wert `positionsart`
 * gibt es seit v1.1b nicht mehr; die Art ergibt sich aus `merkmale` und `zuschlag`.
 */
export interface Positionsdaten {
  /** `null`: noch keine Ordnungszahl vergeben (Ticket 05 legt Knoten vor der OZ-Vergabe an). */
  readonly ordnungszahl: Ordnungszahl | null;
  /** Indexbuchstabe neben der Ordnungszahl (Indexposition), `null`: keiner. Reines Anzeigedatum. */
  readonly ozIndex: string | null;
  readonly merkmale: Positionsmerkmale;
  /** `null`: keine Zuschlagsposition. Kombinierbar mit den `merkmale` (GAEB: Bedarf mit jeder Art). */
  readonly zuschlag: Zuschlag | null;
  /** Fehlt: keine Leitbeschreibung (v1.1b, Punkt 6). */
  readonly leitbeschreibung?: Leitbeschreibung;
  readonly kurztext: string;
  readonly langtext: Langtext;
  /** `null`: nicht gesetzt (z. B. X81 ohne Menge, Zuschlagsposition). Nicht gleichbedeutend mit 0. */
  readonly menge: Menge | null;
  readonly einheit: Einheit | null;
  /** Im Ausschreibungs-LV ein Schätzpreis; `null`: nicht gesetzt (auch bei Zuschlagsposition). Nicht gleichbedeutend mit 0. */
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

/**
 * Auftraggeber am LV (E-11, v1.1b, Punkt 6; GAEB `OWN`). Nur Felder, die die amtlichen Dateien zeigen
 * (`OWN/Address`: `Name1`, `Street`, `PCode`, `City`; `OWN/AwardNo`); jedes ist nullbar, denn die Dateien tragen
 * verschiedene Teilmengen. Nicht typisiert: `DPNo` (Bedeutung nicht belegt) und weitere Adressfelder. Nicht
 * gleichgesetzt mit `Bauherr` des Projekts (Offene Typfrage, Ticket 26).
 */
export interface Auftraggeber {
  readonly name: string | null;
  readonly strasse: string | null;
  readonly plz: string | null;
  readonly ort: string | null;
  /** Vergabenummer des Auftraggebers (GAEB `AwardNo`). */
  readonly vergabenummer: string | null;
}

/** Gewährleistung als Dauer mit Einheit (GAEB `WarrDur`, `WarrUnit`). */
export interface Gewaehrleistung {
  readonly dauer: number;
  /** Einheit, wie die Datei sie nennt (`Years` in der amtlichen Datei); die Abbildung auf eine Aufzählung ist offen. */
  readonly einheit: string;
}

/**
 * Vergabeinformationen am LV (E-11, v1.1b, Punkt 6; GAEB `AwardInfo`). Nur Felder, die die amtliche AVA-Datei
 * mit erkennbarem Inhalt zeigt; die deutschen Namen folgen den Elementnamen und den Werten, die Bedeutung ist nicht aus der
 * Fachdokumentation belegt. Alle nullbar. Daten als `JJJJ-MM-TT`, Zeiten als `HH:MM:SS` (Ortszeit, keine
 * `Zeitstempel`). Nicht typisiert: `Cat`, `EvalEnd`, `Cur`, `CurLbl` (v1 rechnet nur in Euro).
 */
export interface Vergabeinformationen {
  readonly eroeffnungsdatum: string | null;
  readonly eroeffnungszeit: string | null;
  readonly abgabeort: string | null;
  readonly ausfuehrungsbeginn: string | null;
  readonly ausfuehrungsende: string | null;
  readonly auftragsnummer: string | null;
  readonly auftragsdatum: string | null;
  readonly abnahmeart: string | null;
  readonly gewaehrleistung: Gewaehrleistung | null;
}

/** Stammdaten eines LV ohne Knoten (Ausschreibung). MwSt: ein Satz je LV (G-28). */
export interface LvInhaltKopf {
  readonly name: string;
  readonly ozMaske: OzMaske;
  readonly mwstSatz: Prozent;
  readonly nachlass: Nachlass | null;
  /** Fehlt: keine Angabe (v1.1b, Punkt 6). */
  readonly auftraggeber?: Auftraggeber;
  /** Fehlt: keine Angabe (v1.1b, Punkt 6). */
  readonly vergabeinformationen?: Vergabeinformationen;
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
