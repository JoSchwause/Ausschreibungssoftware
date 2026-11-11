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
  PapierkorbeintragId,
  PositionId,
  ProjektId,
  TitelId,
} from './marken';
import type { Betrag, Einheitspreis, Menge, Prozent } from './zahlen';

// --- Texte ---------------------------------------------------------------------------------

/**
 * Maßeinheit (`m`, `m²`, `psch`, `h` …), freier Text.
 *
 * v1.2 (D-06, W-05 Nr. 3): Eine leere Zeichenkette ist keine Einheit. Ein Befehl darf `''` tragen (Rand: Grid,
 * GAEB-Import); der Kern legt dafür `null` ab (Normalisierung beim Befehl, Ticket 30; für `KnotenEinfuegen` Ticket 42).
 * Im Zustand (`Leistungsverzeichnis`, `LvZustand`, ChangeSet) steht nie `''`, nur eine nicht leere Einheit oder `null`.
 */
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

/**
 * Aufzählung (`geordnet: false`) oder nummerierte Liste (GAEB `ul`, `ol`). Jeder Punkt ist selbst ein Langtext.
 *
 * v1.3 (D-22, Ticket 53 Punkt 8): Der Typ bleibt weit; eine leere Liste (`punkte: []`) ist zulässig, obwohl der
 * Langtext-Editor sie nicht darstellen kann (D-T34). Die formale LV-Prüfung meldet sie als Befund (Ticket 56), der
 * GAEB-Writer verwirft sie mit Warnung (Ticket 68). Dasselbe gilt für eine Tabelle ohne Zeilen und eine Zeile ohne Zellen.
 */
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

/** Tabelle (GAEB `table`, `tr`, `td`). Ohne Zeilen oder mit einer Zeile ohne Zellen zulässig (v1.3, siehe `Liste`). */
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

/** Einer der sechs Anteile der Einheitspreisanteile (v1.3): die Feldnamen von `Einheitspreisanteile` außer der Bezeichnung. */
export type EpaArt = 'lohn' | 'stoffe' | 'geraete' | 'nachunternehmer' | 'sonstiges' | 'frei';

/**
 * EPA-Bezeichnung (v1.3, Ticket 53 Punkt 2; Glossar „EPA-Bezeichnung“): wie das LV einen Anteil beschriftet (GAEB
 * `LblUPComp<n>` im `BoQInfo`, mit `NoUPComps` als Anzahl). Die Liste `LvInhaltKopf.epaBezeichnungen` ist geordnet:
 * Eintrag `i` beschriftet den Anteil `UPComp<i+1>` der Datei. So nimmt der X84-Leser die Zuordnung der Anteile eines
 * Angebots aus dem LV, und der Writer schreibt die Beschriftungen in derselben Reihenfolge zurück.
 *
 * Vorläufige Annahme, Entscheidung offen (enge Lesart): Jede `EpaArt` kommt höchstens einmal vor (prüft der Leser bzw.
 * der Kern, nicht der Typ). Die Bezeichnung des Anteils `frei` an der Position (`Einheitspreisanteile.freiBezeichnung`)
 * bleibt daneben bestehen (Offene Typfrage, Ticket 53).
 */
export interface EpaBezeichnung {
  readonly anteil: EpaArt;
  /** Beschriftung, wie das LV sie nennt (z. B. „Lohn“, „Nachunternehmer“); nicht leer. */
  readonly bezeichnung: string;
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
  /**
   * Zuschlagssatz im LV (Glossar „Zuschlagssatz“; im Angebot `Angebotsposition.zuschlagssatz`). `null`: nicht gesetzt
   * (die Ausschreibungsdateien X81/X83 tragen keinen Satz, X84/X86 tragen ihn als `Markup`).
   */
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
  /** `null`: keine Einheit. Nie `''` im Zustand (v1.2, siehe `Einheit`). */
  readonly einheit: Einheit | null;
}

/**
 * Leitbeschreibung (E-11; GAEB `SumDescr`): Die Position fasst Unterbeschreibungen zusammen; ihr eigener Text
 * ist der Leittext. Ob eine Leitbeschreibung ohne Unterbeschreibungen vorkommt, ist offen; der Typ lässt sie zu.
 */
export interface Leitbeschreibung {
  readonly unterbeschreibungen: readonly Unterbeschreibung[];
}

// --- Mengenansatz (v1.3, M2; D-22) ---------------------------------------------------------------------------------

/**
 * Eine Zeile eines Mengenansatzes (Glossar „Ansatzzeile“; v1.3, D-22: aus `mengen` hierher gewandert, `mengen` rechnet
 * und importiert den Typ). `zeile` ist die Zeilennummer (Bezug `Z3`), `formel` die Nummer der REB-Formel (91: freier
 * Rechenansatz), `ausdruck` der Rechenausdruck als Text (de-DE, wie eingegeben), `variable` der Name des
 * Zeilenergebnisses für spätere Zeilen (`null`: kein Name). Die Zahlen sind Nummern, keine Mengen (N1 gilt nicht).
 */
export interface Ansatzzeile {
  readonly zeile: number;
  readonly formel: number;
  readonly ausdruck: string;
  readonly variable: string | null;
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
  /**
   * Mengenansatz der Position (v1.3, M2; D-22). Fehlt: kein Ansatz, die Menge ist von Hand gesetzt. Gesetzt: die Zeilen,
   * aus denen die App mit `mengen` die `menge` gerechnet hat; der Kern speichert beide unausgewertet (A3: kein
   * `kern → mengen`) und rechnet nie nach. Nie `[]` im Zustand (ein leerer Ansatz ist keiner, siehe
   * `MengenansatzSetzen`). Gesetzt nur über `MengenansatzSetzen`; ein reiner Mengenbefehl entfernt ihn (siehe dort).
   */
  readonly mengenansatz?: readonly Ansatzzeile[];
  /**
   * `null`: keine Einheit (z. B. Zuschlagsposition). Im Zustand nie `''`; ein Befehl mit `''` (Rand, Import) wird
   * vom Kern zu `null` normalisiert (v1.2, siehe `Einheit`).
   */
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

/**
 * Auftragnehmer (v1.3, Ticket 53 Punkt 6; Glossar „Auftragnehmer“; GAEB `CTR`): der Bieter, der den Zuschlag erhalten
 * hat, mit den Adressfeldern, die die Dateien in `CTR/Address` zeigen (`Name1`, `Street`, `PCode`, `City`). Jedes Feld
 * ist nullbar wie beim `Auftraggeber`. Nicht typisiert (Befund beim Import): Kontakt, `DPNo`, `AwardNo` und weitere
 * Adressfelder. Nicht gleichgesetzt mit dem `Bieter` des Projekts, der nur einen Namen hat (Offene Typfrage, Ticket 53).
 */
export interface Auftragnehmer {
  readonly name: string | null;
  readonly strasse: string | null;
  readonly plz: string | null;
  readonly ort: string | null;
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
  /**
   * Fehlt: keine Angabe (v1.3, Ticket 53 Punkt 6). Gehört zur Auftragserteilung (X86, Auftrags-LV): Der X86-Leser legt
   * `CTR` hier ab, der Writer schreibt es zurück (Ticket 68). Vorläufige Annahme, Entscheidung offen (enge Lesart): am
   * gemeinsamen Kopf, weil Leser und Writer mit `LvInhalt` arbeiten; ein Ausschreibungs-LV trägt es nicht (der Typ
   * verbietet es nicht). Alternative: nur am `AuftragsLvKopf` (Offene Typfrage, Ticket 53).
   */
  readonly auftragnehmer?: Auftragnehmer;
  /**
   * Beschriftung der Einheitspreisanteile, geordnet nach der Nummer des Anteils in der Datei (v1.3, Ticket 53 Punkt 2;
   * siehe `EpaBezeichnung`). Fehlt: keine Angabe; nie `[]` (ein Erzeuger ohne Beschriftungen lässt das Feld weg). Leser
   * und Writer schließt Ticket 68 an, die Speicherung Ticket 57.
   */
  readonly epaBezeichnungen?: readonly EpaBezeichnung[];
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

/**
 * Papierkorbeintrag (v1.2, K9): die Knoten, die ein `KnotenInPapierkorbLegen` aus dem Baum genommen hat, samt ihren
 * Unterbäumen, als **ein** Eintrag. Flach, Eltern vor Kindern. Die Knoten tragen ihre alte Lage (`elternId`,
 * `reihenfolge`), damit `PapierkorbeintragWiederherstellen` mit `ort: null` sie an die alte Stelle zurücklegt. Die
 * Kennungen bleiben (Positionsidentität, ADR 0011): Angebote finden ihre Positionen nach dem Wiederherstellen wieder.
 *
 * Positionen im Papierkorb gehen in keine Summe ein und haben keine `Positionssumme`.
 *
 * Bezüge auf Positionen im Papierkorb (D-12): Ein Zuschlagsbezug (`Bezugsposition`) oder ein `wahl.grundpositionId`
 * eines Knotens im Baum, der auf eine Position in einem Eintrag zeigt, bleibt stehen und zählt nichts, solange das
 * Ziel im Papierkorb liegt (nach dem Wiederherstellen gilt er wieder). `PapierkorbeintragEntfernen` und
 * `PapierkorbLeeren` entfernen die dann hängenden Bezüge im selben ChangeSet (`knoten.geaendert`).
 */
export interface Papierkorbeintrag {
  readonly id: PapierkorbeintragId;
  /**
   * Laufende Nummer des Eintrags im LV (D-12): Reihenfolge des Hineinlegens. Der Kern vergibt den Höchstwert der
   * vorhandenen Einträge + 1 (1 im leeren Papierkorb); keine Uhr (A2). Der Papierkorb wird nach `nummer` sortiert
   * gelesen; so stellt die Umkehrung eines Entfernens den Platz des Eintrags aus dem ChangeSet allein wieder her.
   */
  readonly nummer: number;
  readonly knoten: readonly Knoten[];
}

/** Ausschreibungs-LV. Den Papierkorb trägt der Zustand (`LvZustand.papierkorb`), nicht das LV (D-12). */
export interface Leistungsverzeichnis extends LvKopf {
  readonly knoten: readonly Knoten[];
}

/** Eine Angebotszeile: Preis eines Bieters zu einer Position, oder „nicht angeboten“ (≠ 0,00; Spec §6a). */
export type Angebotsposition =
  | {
      readonly positionId: PositionId;
      readonly status: 'angeboten';
      /**
       * Bei gesetztem `zuschlagssatz` nie gerechnet. Vorläufige Annahme, Entscheidung offen (v1.2): Der Erzeuger
       * (X84-Import, Erfassung) setzt hier den EP aus der Datei, wenn sie einen nennt, sonst `0.000` (Platzhalter).
       * Wer `zuschlagssatz` nicht auswertet, darf die Position nicht rechnen (D-12): Der Platzhalter ist kein Preis.
       * Alternative (Offene Typfrage, Ticket 29): eigene Variante `status: 'zuschlag-angeboten'` ohne EP.
       */
      readonly einheitspreis: Einheitspreis;
      readonly epa: Einheitspreisanteile | null;
      /**
       * Zuschlagssatz des Bieters (v1.2, D-04; GAEB `Markup` in X84). Nur an einer Position, die im LV eine
       * Zuschlagsposition ist (`Positionsdaten.zuschlag !== null`): der Prozentsatz, den der Bieter anbietet. Fehlt:
       * kein Satz angeboten. Die Rechnung (Ticket 44) liest bei gesetztem Satz nur den Satz, nie `einheitspreis`.
       * Ob ein Satz an einer Position ohne Zuschlag ein Fehler ist, entscheidet die Rechnung, nicht der Typ.
       */
      readonly zuschlagssatz?: Prozent;
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
