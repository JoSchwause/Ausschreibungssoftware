// SPDX-License-Identifier: AGPL-3.0-or-later
// Fachmodell: Projekt, Leistungsverzeichnis, Angebot, Auftrags-LV (ADR 0011). Nur Typen.
//
// Alle Typen sind reine, serialisierbare Daten (keine Funktionen, kein Date, keine Klassen). Bezeichner
// sind ASCII-transliteriert (ä=ae, ö=oe, ü=ue, ß=ss), siehe GLOSSARY, Abschnitt „Schreibweise im Code“.

import type {
  AngebotId,
  AufmassId,
  AuftragsLeistungsverzeichnisId,
  BieterId,
  BildId,
  ElternId,
  HinweistextId,
  KostenermittlungId,
  Kostengruppennummer,
  LeistungsverzeichnisId,
  LosId,
  Ordnungszahl,
  PapierkorbeintragId,
  PositionId,
  ProjektId,
  RechnungId,
  TitelId,
} from './marken';
import type { Betrag, Einheitspreis, Menge, Prozent } from './zahlen';
import type { Bauteilzuordnung } from './bim';

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

/**
 * Einer der sechs Anteile der Einheitspreisanteile (v1.3): die Feldnamen von `Einheitspreisanteile` außer der
 * Bezeichnung, aus dem Typ abgeleitet, damit beide nie auseinanderlaufen.
 */
export type EpaArt = Exclude<keyof Einheitspreisanteile, 'freiBezeichnung'>;

/** Nummer eines Anteils in der GAEB-Datei (`UPComp1` … `UPComp6`, `LblUPComp1` … `LblUPComp6`). */
export type EpaNummer = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * EPA-Bezeichnung (v1.3, Ticket 53 Punkt 2, D-53.6; Glossar „EPA-Bezeichnung“): welcher Anteil der GAEB-Datei
 * (`UPComp<nummer>`, beschriftet über `LblUPComp<nummer>` im `BoQInfo`) welche `EpaArt` ist und wie das LV ihn nennt. So
 * nimmt der X84-Leser die Zuordnung der Anteile eines Angebots aus dem LV, und der Writer schreibt dieselben Nummern
 * zurück.
 *
 * Regeln für `LvInhaltKopf.epaBezeichnungen` (prüft der Leser bzw. der Kern, nicht der Typ):
 * - Die Liste ist nach `nummer` aufsteigend sortiert; `nummer` und `anteil` kommen je höchstens einmal vor.
 * - Eine fehlende `nummer` heißt: dieser Platz ist keinem Anteil zugeordnet (die Datei beschriftet ihn nicht, oder er
 *   wäre ein zweiter Anteil derselben Art, den das Modell nicht abbildet).
 * - Fehlt das ganze Feld, gilt die feste Belegung des Writers von heute: 1 Lohn, 2 Stoffe, 3 Geräte, 4 Nachunternehmer,
 *   5 Sonstiges, 6 frei.
 * - Writer nummerieren nie um: Sie schreiben `UPComp<nummer>`/`LblUPComp<nummer>` mit der Nummer aus der Liste.
 */
export interface EpaBezeichnung {
  readonly nummer: EpaNummer;
  readonly anteil: EpaArt;
  /**
   * Beschriftung, wie das LV sie nennt (z. B. „Lohn“, „Nachunternehmer“); `null`: die Art ist aus GAEB `Type` bekannt,
   * die Beschriftung ist leer. Ist das Feld `epaBezeichnungen` gesetzt, ist es die einzige Quelle aller Beschriftungen,
   * auch der des Anteils `frei`: `Einheitspreisanteile.freiBezeichnung` an der Position wird dann nicht gelesen (Leser
   * legen dort `null` ab). Fehlt das Feld, bleibt `freiBezeichnung` an der Position die Quelle (Daten vor v1.3).
   */
  readonly bezeichnung: string | null;
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
   * `MengenansatzSetzen`). Geändert nur über `MengenansatzSetzen` (und entfernt nach Lesart (a)); Kopien und
   * Anlegebefehle bringen ihn mit, der Kern prüft die Form.
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
  /**
   * Kostengruppe der Position (v1.4, Ticket 70 Punkt 4; C2, D-36 (4); Glossar „Kostengruppe“). Fehlt: keiner zugeordnet
   * (in der Kostenkontrolle die Zeile „ohne Kostengruppe“, D-37). Genau eine je Position; Gliederungen und Hinweistexte
   * tragen keine. Geändert nur über `KostengruppeSetzen` (im LV und im Auftrags-LV); Anlege- und Kopierbefehle bringen sie
   * mit, der Zuschlag (D-21) übernimmt sie mit den Positionsdaten in das Auftrags-LV, danach sind beide unabhängig. Wirkt
   * auf keine Summe des Kerns.
   */
  readonly kostengruppe?: Kostengruppennummer;
  /**
   * Woher der Text der Position stammt (v1.4, Ticket 70 Punkt 5; G-17, D-36 (6), D-40; Glossar „Textquelle“), freier Text,
   * z. B. ein Katalog, ein Muster-LV oder „eigener Text“. Fehlt: keine Angabe; nie `''` im Zustand (ein leerer Text ist
   * keine Quelle, siehe `TextquelleSetzen`). Nur Herkunft: Kurz- und Langtext bleiben die einzige Quelle des Texts, ein
   * Katalog wie STLB-Bau wird nicht angebunden (G-17). Geändert nur über `TextquelleSetzen`; Anlege- und Kopierbefehle
   * bringen sie mit. Hinweistexte tragen keine (Offene Typfrage, Ticket 70; in v1.5 vertagt, D-95.4).
   */
  readonly textquelle?: string;
  /**
   * Die Bauteile, deren Mengen die Position übernimmt (v1.6, Ticket 97 Punkt 3; X1c, D-52, D-53; Glossar
   * „Bauteilzuordnung“). Fehlt: keine; nie `[]` im Zustand (eine leere Liste ist keine, siehe `BauteileZuordnen`). Wirkt auf
   * keine Summe des Kerns; Gliederungen und Hinweistexte tragen keine.
   *
   * Lesarten (vorläufige Annahme, Entscheidung offen, enge Lesart):
   * - Geordnet: In dieser Reihenfolge baut `bim` die Ansatzzeilen der Mengenübernahme (D-53); dasselbe Paar aus GlobalId und
   *   Mengenart steht höchstens einmal darin. Ein Bauteil darf mehreren Positionen zugeordnet sein (D-52).
   * - Geändert nur über `BauteileZuordnen` (im LV und im Auftrags-LV). Anlegebefehle (`PositionAnlegen`, `KnotenEinfuegen`,
   *   `LeistungsverzeichnisAnlegen`, `AuftragsLeistungsverzeichnisAnlegen`, `NachtragUebernehmen`) übernehmen sie, wie sie
   *   kommen (der Kern prüft die Form wie bei `BauteileZuordnen`). **Kopieren verwirft sie** (D-52), damit dasselbe Bauteil
   *   nicht unbemerkt zweimal gezählt wird. Nachtrag Review (D-66), je Weg:
   *   - Kopieren und Einfügen im selben LV (auch aus der Zwischenablage) und das Übernehmen von Textbausteinen aus einem
   *     Muster-LV: Die Kopierhilfe des Kerns (Ticket 42) lässt `bauteile` weg.
   *   - Einen LV-Stand als neues LV übernehmen: Die Zuordnungen **bleiben**, weil das neue LV ein eigenes LV ist und nichts
   *     doppelt zählt. Dafür bekommt die Kopierhilfe in Ticket 105 eine Wahl (Standard: weglassen); der Weg der App aus dem
   *     LV-Stand übergibt „behalten“ (Ticket 121).
   *   Verschieben, Papierkorb und Wiederherstellen behalten sie; ein LV-Stand trägt sie.
   * - Der Zuschlag (`zuschlagErteilen`, D-21) übernimmt sie mit den Positionsdaten ins Auftrags-LV (gemeinsame
   *   Positionsidentität), ebenso `nachtragUebernehmen` aus dem Nachtrags-LV; danach sind beide unabhängig.
   * - Der GAEB-Export schreibt sie nicht (kein GAEB-Element; mit Warnung wie die Textquelle, F6); ein GAEB-Import bringt
   *   keine mit.
   */
  readonly bauteile?: readonly Bauteilzuordnung[];
  /**
   * Die gespeicherten Eingaben der Einzelpreiskalkulation (v1.7a, Ticket 127; E9, B-19; Glossar „Kalkulationsangaben“). Fehlt:
   * keine Kalkulation; nie leer im Zustand (ohne Ansatz und ohne Satz ist es keine, siehe `KalkulationSetzen`). Wirkt auf keine
   * Summe des Kerns: EP und EPA stehen wie bisher in `einheitspreis` und `epa`, die Kalkulation ist nur ihre Herleitung.
   *
   * Lesarten (vorläufige Annahme, Entscheidung offen, enge Lesart; D-127):
   * - Geändert nur über `KalkulationSetzen` (nur im Ausschreibungs-LV), das EP und EPA im selben Befehl mitbringt. Ein reiner
   *   Preisbefehl (`EinheitspreisAendern`, `EinheitspreisanteileSetzen`) an einer Position mit Kalkulation entfernt sie im
   *   selben ChangeSet (wie `MengeAendern` den Mengenansatz, D-22 Lesart (a); die Oberfläche fragt vorher). So laufen
   *   Kalkulation und Preis nie still auseinander. Der Befehl meldet das mit dem Befehlshinweis `kalkulation-entfernt`
   *   (`knotenId` die Position; v1.7a Nachtrag, Review D-82 S4).
   * - **Nie an einer Zuschlagsposition** (v1.7a Nachtrag, Review D-82 S3): `KalkulationSetzen` an einer Position mit
   *   `zuschlag !== null` weist der Kern mit `knotenart-unzulaessig` ab; `PositionsmerkmaleSetzen` mit `zuschlag !== null`
   *   entfernt eine vorhandene Kalkulation im selben ChangeSet (Hinweis `kalkulation-entfernt`). Ein Anlege- oder Kopierbefehl,
   *   der eine Zuschlagsposition mit Kalkulation bringt, wird mit `ungueltige-eingabe` (`feld: 'kalkulation'`) abgewiesen.
   * - Anlege- und Kopierbefehle bringen sie mit (ein Muster-LV trägt Kalkulationsansätze, Glossar „Muster-LV“); der Kern prüft
   *   die Form wie bei `KalkulationSetzen`. Ein LV-Stand trägt sie.
   * - Der Zuschlag (`zuschlagErteilen`) und `nachtragUebernehmen` lassen sie weg: Die Preise des Auftrags-LV stammen aus dem
   *   Angebot, nicht aus der Kalkulation des Schätzpreises. Der GAEB-Export schreibt sie nicht (die EPA tragen das Ergebnis),
   *   ein GAEB-Import bringt keine mit.
   */
  readonly kalkulation?: Kalkulationsangaben;
}

// --- Einzelpreiskalkulation (v1.7a, E9; D-39) ------------------------------------------------------------------------

/**
 * Eine Zeile der Einzelpreiskalkulation (Glossar „Kalkulationsansatz“; v1.7a, Ticket 127, E9): aus `kosten` hierher gewandert,
 * gleich gebaut, weil die Position sie nun trägt (A4); `kosten` rechnet sie (`einzelpreiskalkulationBerechnen`, D-39) und
 * importiert den Typ ab Ticket 137 von hier. Eine Zeile ohne Ansatzmenge oder ohne Kostensatz zählt nicht (Befund in `kosten`,
 * keine Sperre, U5); der Kern speichert sie trotzdem.
 */
export interface Kalkulationsansatz {
  readonly art: EpaArt;
  readonly bezeichnung: string;
  /** Ansatzmenge je Einheit der Position (z. B. `0.450` h je m²), 3 Stellen; bei `lohn` Lohnstunden. `null`: fehlt. */
  readonly ansatzmenge: Menge | null;
  /** Kostensatz je Einheit des Ansatzes (z. B. `48.500` € je h), 3 Stellen wie ein EP. `null`: fehlt. */
  readonly kostensatz: Einheitspreis | null;
}

/**
 * Zuschlagssatz der Kalkulation je Kostenart (Glossar „Zuschlagssatz der Kalkulation“; v1.7a, aus `kosten` gewandert). Eine
 * fehlende Kostenart rechnet mit 0 %; ein Satz `0.00` und ein fehlender Schlüssel rechnen gleich, der Kern legt ab, was kommt.
 */
export type Kalkulationszuschlagssaetze = Readonly<Partial<Record<EpaArt, Prozent>>>;

/**
 * Kalkulationsangaben einer Position (v1.7a, Ticket 127, E9; Glossar): die Eingaben, aus denen `kosten` EP und EPA rechnet.
 * `ansaetze` in Anzeigereihenfolge (die Zeilen des Dialogs).
 */
export interface Kalkulationsangaben {
  readonly ansaetze: readonly Kalkulationsansatz[];
  readonly zuschlagssaetze: Kalkulationszuschlagssaetze;
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

/**
 * Postanschrift in Teilen (v1.7a, Ticket 127, E10; Glossar „Anschrift“), wie `Auftraggeber` und `Auftragnehmer` sie führen
 * (GAEB `Street`, `PCode`, `City`): `strasse` mit Hausnummer. Jedes Teil nullbar, nie `''` (der Kern legt `''` als `null` ab).
 * Eine Anschrift ohne jedes Teil gibt es nicht: Wo sie nullbar ist, legt der Kern dafür `null` ab. Die Anschrift des Bauherrn
 * bleibt freier Text (`Bauherr.anschrift`).
 */
export interface Anschrift {
  readonly strasse: string | null;
  readonly plz: string | null;
  readonly ort: string | null;
}

/**
 * Bieterangaben (v1.7a, Ticket 127, E10; Glossar „Bieter“): Kontaktdaten eines Bieters. Jedes Feld nullbar, nie `''`
 * (Normalisierung im Ausführer wie bei `Anschrift`); sind alle `null`, fehlt der Block am Bieter (eine Schreibweise für „keine
 * Angaben“). Der Kern prüft kein Format von E-Mail oder Telefon (U5).
 */
export interface Bieterangaben {
  readonly anschrift: Anschrift | null;
  readonly ansprechperson: string | null;
  readonly email: string | null;
  readonly telefon: string | null;
}

/**
 * Bieter eines Projekts, von Angeboten über `BieterId` referenziert.
 *
 * v1.7a (Ticket 127, E8, E10): umbenennen (`BieterUmbenennen`), Angaben setzen (`BieterangabenSetzen`), löschen nur ohne
 * Angebot (`BieterLoeschen`). `BieterAnlegen` darf `angaben` mitbringen; der Kern normalisiert sie wie bei
 * `BieterangabenSetzen`. Woher (v1.7a Nachtrag, Review D-82 S7): nur ein X84 bringt Bieterangaben mit (Ticket 136); ein X86
 * füllt nur `LvInhaltKopf.auftragnehmer`, nie die Angaben eines Bieters. Ein Bieter, den das Projekt schon hat, wird beim
 * Einlesen nicht überschrieben; trägt die Datei andere Angaben, bietet die App `BieterangabenSetzen` an (Ticket 149).
 */
export interface Bieter {
  readonly id: BieterId;
  readonly name: string;
  /** Fehlt: keine Angaben (v1.7a, additiv; Bieter vor v1.7a bleiben gültig). Nie `null`. */
  readonly angaben?: Bieterangaben;
}

/**
 * Projektangaben über Name und Bauherr hinaus (v1.7a, Ticket 127, E10; Glossar „Projektangaben“): Projektnummer, Ort (der
 * Bauort als freier Text) und Anschrift der Baustelle. Jedes Feld nullbar, nie `''`; sind alle `null`, fehlt der Block am
 * Projekt (Normalisierung im Kern wie bei `Bieterangaben`). Die Nummer ist freier Text (führende Nullen, Buchstaben), nie
 * Schlüssel (A7) und nicht eindeutig geprüft.
 */
export interface Projektangaben {
  readonly nummer: string | null;
  readonly ort: string | null;
  readonly baustelle: Anschrift | null;
}

/** Oberste Ebene: Name, Bauherr, Bieter. Die LVs und Angebote verweisen mit `projektId` auf das Projekt. */
export interface Projekt {
  readonly id: ProjektId;
  readonly name: string;
  readonly bauherr: Bauherr;
  readonly bieter: readonly Bieter[];
  /**
   * Fehlt: keine weiteren Angaben (v1.7a, Ticket 127, E10; additiv, Projekte vor v1.7a bleiben gültig). Nie `null`. Gesetzt
   * über `ProjektangabenSetzen`; `ProjektStammdatenSetzen` lässt es unverändert, `ProjektAnlegen` legt ohne an.
   */
  readonly angaben?: Projektangaben;
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
 * ist nullbar wie beim `Auftraggeber`. Nicht typisiert (Befund beim Import): Kontakt (Telefon, E-Mail, Ansprechperson),
 * `DPNo`, `AwardNo` und weitere Adressfelder. Nicht gleichgesetzt mit dem `Bieter` des Projekts (Offene Typfrage, Ticket 53).
 * v1.7a Nachtrag (Review D-82 S7): Seit v1.7a trägt der `Bieter` eigene `Bieterangaben`; ein X86 füllt trotzdem **nur** diesen
 * Auftragnehmer am LV-Kopf, nie die Angaben eines Bieters, und seine Kontaktangaben bleiben ein Befund beim Import.
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
   * Zuordnung und Beschriftung der Einheitspreisanteile, nach `nummer` sortiert (v1.3, Ticket 53 Punkt 2, D-53.6; siehe
   * `EpaBezeichnung`). Fehlt: feste Belegung des Writers (1 Lohn … 6 frei); nie `[]` (ein Erzeuger ohne Zuordnung lässt
   * das Feld weg). Leser und Writer schließt Ticket 68 an, die Speicherung Ticket 57.
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

// --- Nachtrag (v1.4, A1; D-35) ------------------------------------------------------------------------------------

/**
 * Stand eines Nachtrags (v1.4, Ticket 70 Punkt 3; D-35; Glossar „Nachtragsstatus“): `angemeldet` (der Auftragnehmer hat
 * die geänderte oder zusätzliche Leistung angezeigt), `angeboten` (das Nachtragsangebot liegt vor), `beauftragt` (der
 * Auftraggeber hat beauftragt; der Nachtrag steht über `NachtragUebernehmen` im Auftrags-LV), `abgelehnt`.
 *
 * Nur ein beauftragter Nachtrag steht im Auftrags-LV und geht damit in Aufmaß und Rechnung; ein anderer erscheint dort
 * höchstens als Infozeile (D-35; die zweite Bedeutung von „VOB 80“, 80 % in Abschlagsrechnungen, ist nicht in v1).
 * Übergänge prüft der Kern nicht: Er sieht nur das Nachtrags-LV, nicht das Auftrags-LV. `beauftragt` setzt die App erst,
 * nachdem `NachtragUebernehmen` geschrieben ist (D-35).
 */
export type Nachtragsstatus = 'angemeldet' | 'angeboten' | 'beauftragt' | 'abgelehnt';

/**
 * Nachtragsangaben (v1.4, Ticket 70 Punkt 3; D-35; Glossar „Nachtrag“, „Nachtragsangaben“): Sie machen ein gewöhnliches
 * Ausschreibungs-LV zum Nachtrags-LV. Das Nachtragsangebot ist ein gewöhnliches `Angebot` zu diesem LV mit der `bieterId`
 * des beauftragten Angebots (der Typ prüft das nicht); Preisspiegel, GAEB und Grid arbeiten mit ihm wie mit jedem LV.
 */
export interface Nachtragsangaben {
  /**
   * Das Auftrags-LV desselben Projekts, zu dem der Nachtrag gehört. Der Kern prüft die Kennung nicht (anderes Aggregat);
   * `speicher` weist eine Kennung ohne Auftrags-LV im Projekt mit `konflikt` ab, ebenso die Umkehrung des Anlegens dieses
   * Auftrags-LV, solange Nachtragsangaben darauf verweisen (Q5).
   */
  readonly auftragsLvId: AuftragsLeistungsverzeichnisId;
  /**
   * Nachtragsnummer, wie die Beteiligten sie führen (z. B. `N01`); freier Text, nicht leer (der Kern weist `''` und reinen
   * Leerraum mit `ungueltige-eingabe` ab). Ob sie je Auftrags-LV eindeutig ist, sieht der Kern nicht (ein Aggregat); die
   * App weist darauf hin, sperrt aber nicht (U5). Die Gliederung im Auftrags-LV heißt „Nachtrag <nummer>“.
   */
  readonly nummer: string;
  readonly status: Nachtragsstatus;
}

export interface LvKopf extends LvInhaltKopf {
  readonly id: LeistungsverzeichnisId;
  readonly projektId: ProjektId;
  /**
   * Fehlt: kein Nachtrag (v1.4, Ticket 70 Punkt 3; D-35). Gesetzt: das LV ist ein Nachtrags-LV, siehe `Nachtragsangaben`.
   * Geändert nur über `NachtragsangabenSetzen`. Ein Nachtrags-LV bekommt keinen Zuschlag (`zuschlagErteilen` weist es ab,
   * D-42); seine Positionen kommen über `NachtragUebernehmen` ins Auftrags-LV. Der Zuschlag eines Muster-LV lässt `vorlage`
   * weg: Beide Felder gibt es am `AuftragsLvKopf` nicht.
   *
   * Vorläufige Annahme, Entscheidung offen (enge Lesart): am `LvKopf`, nicht am gemeinsamen `LvInhaltKopf`. So trägt das
   * Auftrags-LV es nie, und weder `LeistungsverzeichnisAnlegen` noch der GAEB-Leser bringen es mit: Die App legt das
   * Nachtrags-LV an und setzt die Angaben im selben Schritt (Befehlsfolge, ein Undo-Schritt). Ein LV, das aus einem
   * LV-Stand zurückgeholt wird, ist kein Nachtrag mehr. Alternative: am `LvInhaltKopf` (Offene Typfrage, Ticket 70).
   */
  readonly nachtrag?: Nachtragsangaben;
  /**
   * Kennzeichen „Muster-LV“ (v1.4, Ticket 70 Punkt 5; C5, G-17, D-36 (6), D-40; Glossar „Muster-LV“). Fehlt: ein
   * gewöhnliches LV. `true`: ein Muster-LV, dessen Positionen und Hinweistexte die Textbausteine sind, die man in andere
   * LVs kopiert (`KnotenEinfuegen`, K9); einen eigenen Typ für Textbausteine gibt es nicht. Das Kennzeichen rechnet und
   * sperrt nichts; ob ein Muster-LV Angebote, einen Zuschlag oder Nachtragsangaben haben darf, prüft der Typ nicht.
   * Geändert nur über `VorlageSetzen`.
   *
   * Vorläufige Annahme, Entscheidung offen (enge Lesart): nur `true` oder fehlt, eine Schreibweise für „kein Muster-LV“
   * (wie bei `Auszeichnung`; kanonische Datei); am `LvKopf` wie `nachtrag`, also nie aus einem Import und nie am
   * Auftrags-LV. Alternative: `vorlage?: boolean` (Offene Typfrage, Ticket 70).
   */
  readonly vorlage?: true;
  /**
   * Einstellungen des Preisspiegels zu diesem LV (v1.7a, Ticket 127, E15, D-73; Glossar „Preisspiegel-Einstellungen“). Fehlt:
   * die Standardwerte nach D-05 (`PREISSPIEGEL_STANDARD` in `vergabe`: 20 %, 80 %, 95 %, Mittel); nie `null`. Geändert nur über
   * `PreisspiegelEinstellungenSetzen` (Undo, wandert mit dem LV-Stand). Am `LvKopf` wie `nachtrag` und `vorlage`: nie aus
   * einem GAEB-Import, nie am Auftrags-LV, und ein LV aus einem LV-Stand (`LeistungsverzeichnisAnlegen`) bringt es nicht von
   * selbst mit: Trägt der Stand Einstellungen, hängt die App `PreisspiegelEinstellungenSetzen` an die Befehlsfolge „Als neues
   * LV übernehmen“ (v1.7a Nachtrag, Review D-82 S6; Ticket 150). Ändert D-36 (7) für diesen Teil (D-73).
   */
  readonly preisspiegel?: PreisspiegelEinstellungen;
}

/** Bezug der ABC-Klasse im Preisspiegel (v1.7a, aus `vergabe` gewandert): der virtuelle Bieter Mittel oder der Schätzpreis. */
export type AbcBezug = 'mittel' | 'schaetzpreis';

/**
 * Preisspiegel-Einstellungen (v1.7a, Ticket 127, E15; Glossar): gleich gebaut wie in `vergabe` (das ab Ticket 138 den Typ von
 * hier nimmt). Der Kern prüft die Form (`PreisspiegelEinstellungenSetzen`): jeder Satz ein kanonisches `Prozent` von `0.00` bis
 * `100.00`, `abcSchwelleA` ≤ `abcSchwelleB`, `abcBezug` einer der beiden Werte; sonst `ungueltige-eingabe` mit dem Feld.
 */
export interface PreisspiegelEinstellungen {
  /** Ausreißer, wenn ein EP um mehr als diesen Anteil vom Mittel abweicht (G-26, D-05; Standard `20.00`). */
  readonly ausreisserSchwelle: Prozent;
  /** Obergrenze der Klasse A am Anteil der Summe (Standard `80.00`). */
  readonly abcSchwelleA: Prozent;
  /** Obergrenze der Klasse B (Standard `95.00`). */
  readonly abcSchwelleB: Prozent;
  readonly abcBezug: AbcBezug;
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

// --- Aufmaß (v1.4, A2; D-36 (1)) ----------------------------------------------------------------------------------
//
// Aufmaßblatt, Rechnung und Kostenermittlung sind eigene Aggregate (wie Angebot und Auftrags-LV, ADR 0011). Ihre
// ChangeSets tragen das ganze Aggregat vorher und nachher, ohne Summen (D-36 (8)); was aus ihnen gerechnet wird (Menge
// aus dem Ansatz, Prüfergebnis der Rechnung, Summen der Kostenermittlung), wird nie gespeichert.
//
// Lesart (D-70.3): Ihre Ausführer sehen nur das eigene Aggregat (Signaturen in `changeset.ts`) und prüfen die Form.
// Regeln über mehrere Aggregate prüfen reine Funktionen als Befund (U5: `aufmassPruefen`, `rechnungPruefen`, Tickets 80,
// 81) oder vor dem Befehl (`freigabeMoeglich`); was nie verletzt sein darf, hält `speicher` (`konflikt`, Q5).

/**
 * Kopf eines Aufmaßblatts (v1.4, Ticket 70 Punkt 6; D-36 (1); Glossar „Aufmaßblatt“): das Blatt ohne seine Zeilen. Es
 * misst die Positionen genau eines Auftrags-LV auf; Befehle führt `abrechnung` aus (Ticket 80), gespeichert wird es von
 * `speicher` (Ticket 79), ein GAEB-X31-Import legt es an (D-33, Ticket 83).
 */
export interface AufmassKopf {
  readonly id: AufmassId;
  readonly projektId: ProjektId;
  /** Das Auftrags-LV desselben Projekts, dessen Positionen das Blatt aufmisst; bleibt nach dem Anlegen fest. */
  readonly auftragsLvId: AuftragsLeistungsverzeichnisId;
  /**
   * Blattnummer, ganze Zahl ≥ 1, je Auftrags-LV eindeutig; Listen ordnen nach ihr. Der Befehl bringt sie mit (die App
   * schlägt die höchste vorhandene + 1 vor, `naechsteAufmassnummer`, Ticket 80). Der Ausführer prüft die Form
   * (`ungueltige-eingabe`, `feld: 'nummer'`), `speicher` hält sie als eindeutigen Schlüssel (`konflikt`). Vorläufige
   * Annahme, Entscheidung offen (enge Lesart, D-70.9): Sie bleibt nach dem Anlegen fest (`AufmasskopfSetzen` setzt nur
   * Bezeichnung und Datum; Offene Typfrage, Ticket 70).
   */
  readonly nummer: number;
  /** Bezeichnung des Blatts, freier Text (z. B. „Erdarbeiten Achse 1–4“); `''` ist zulässig. */
  readonly bezeichnung: string;
  /**
   * Tag, an dem das Blatt aufgemessen wurde, als `JJJJ-MM-TT`, vom Nutzer eingegeben (keine Uhr, A2; wie
   * `Vergabeinformationen`); `null`: keine Angabe.
   */
  readonly datum: string | null;
}

/**
 * Eine Zeile eines Aufmaßblatts (v1.4, Ticket 70 Punkt 6; Glossar „Aufmaßposition“): die Menge, die dieses Blatt für eine
 * Position des Auftrags-LV aufmisst, mit dem Mengenansatz, aus dem sie stammt. Lesarten wie bei `MengenansatzSetzen`
 * (D-22): Die App rechnet die Menge mit `mengen`, der Ausführer legt beides unausgewertet ab und rechnet nie nach.
 *
 * - Höchstens eine Zeile je Position und Blatt (der Ausführer weist eine zweite mit `ungueltige-eingabe` ab); mehrere
 *   Blätter ergeben zusammen die kumulierte Menge einer Rechnung.
 * - Gemeint sind Positionen des Auftrags-LV (auch aus einem übernommenen Nachtrag), keine Zuschlagspositionen: Deren
 *   Betrag folgt aus den Bezugspositionen (D-34 (1)). Eine Zeile, deren Kennung keine solche Position ist, ist ein Befund
 *   von `aufmassPruefen` (Ticket 80; U5) und zählt in Soll/Ist und Rechnung nicht; der Ausführer sieht das Auftrags-LV
 *   nicht.
 * - Keine Bemerkung je Zeile (Offene Typfrage 10, Ticket 70; in v1.5 vertagt, D-95.4): Textzeilen einer X31 stehen in der
 *   Textform der Ansatzzeile (D-83.2).
 */
export interface Aufmassposition {
  readonly positionId: PositionId;
  /**
   * Die Zeilen, aus denen die App die `menge` gerechnet hat (eigene Zeilennummern je Aufmaßposition); `null`: kein Ansatz,
   * die Menge ist von Hand gesetzt. Nie `[]` im Zustand: ein leerer Ansatz ist keiner, der Ausführer legt `null` ab.
   */
  readonly mengenansatz: readonly Ansatzzeile[] | null;
  /**
   * Menge dieses Blatts (nicht kumuliert), 3 Stellen; negativ ist zulässig (Abzug). `null`: keine Menge, etwa ein Ansatz
   * mit Fehler (Lesart (b) aus D-22); zählt in Soll/Ist und Rechnung nicht (Befund dort, keine Sperre, U5).
   */
  readonly menge: Menge | null;
}

/**
 * Aufmaßblatt (v1.4, Ticket 70 Punkt 6): Kopf und Zeilen. Die Zeilen stehen in der Reihenfolge, in der sie dazukamen
 * (`AufmasspositionSetzen` ersetzt eine vorhandene Zeile an ihrer Stelle und hängt eine neue ans Ende); die Anzeige
 * ordnet nach dem Baum des Auftrags-LV.
 */
export interface Aufmass extends AufmassKopf {
  readonly positionen: readonly Aufmassposition[];
}

// --- Rechnung (v1.4, A3; D-34, D-36 (2)) --------------------------------------------------------------------------

/**
 * Art einer Rechnung (v1.4, Ticket 70 Punkt 7; D-34; Glossar „Rechnungsart“): `abschlag` (kumulierte Abschlagsrechnung)
 * oder `schluss` (Schlussrechnung). Eine Schlussrechnung ist die letzte Rechnung des Auftrags-LV (höchste Nummer, nur
 * eine); eine Schlussrechnung, die das nicht ist, ist ein Befund der Prüfung (Ticket 81), keine Sperre (U5).
 * Teilschlussrechnungen gibt es in v1 nicht.
 */
export type Rechnungsart = 'abschlag' | 'schluss';

/**
 * Umlage (v1.4, Ticket 70 Punkt 7; D-34 (5); Glossar „Umlage“): ein Abzug des Auftraggebers für eine gemeinsam genutzte
 * Leistung. Die Prüfung rechnet je Umlage round(Brutto kumuliert × `satz` / 100, 2) (`'0.50'` heißt 0,5 %), alle auf
 * derselben Basis, nicht aufeinander; sie mindern die Steuerbasis nicht (Gegenforderung des Auftraggebers nach der MwSt).
 */
export interface Umlage {
  /** Bezeichnung, wie die Beteiligten sie führen (z. B. „Bauwesenversicherung“), freier Text. */
  readonly bezeichnung: string;
  readonly satz: Prozent;
}

/**
 * Rechnung des Auftragnehmers zu einem Auftrags-LV, wie der Auftraggeber sie prüft (v1.4, Ticket 70 Punkt 7; A3, D-34,
 * D-36 (2); Glossar „Rechnung“). Eigenes Aggregat; Befehle führt `abrechnung` aus (Ticket 81), der Ausführer sieht nur die
 * Rechnung (D-70.3). Gespeichert sind nur Angaben, Abzüge und die Freigabe: Das
 * Prüfergebnis (Leistung → Nachlass → MwSt → Umlagen → Einbehalt → Zahlbetrag, D-34) wird gerechnet, nie gespeichert;
 * eingefroren wird nur der freigegebene Zahlbetrag.
 *
 * Vorläufige Annahme, Entscheidung offen (enge Lesart): Eine freigegebene Rechnung (`freigabe` gesetzt) ändert nur
 * `RechnungsfreigabeAufheben` (Q5); jeden anderen Befehl, auch `RechnungLoeschen`, weist der Ausführer mit
 * `rechnung-freigegeben` ab.
 *
 * Invariante (D-34 (7), Q5): **Die freigegebenen Rechnungen eines Auftrags-LV sind stets die mit den kleinsten Nummern.**
 * Nur so ist „Σ frühere Zahlbeträge“ eindeutig; `speicher` hält sie (`konflikt`, siehe `RechnungChangeSet`), auch gegen das
 * Anlegen einer Rechnung unterhalb einer schon freigegebenen.
 */
export interface Rechnung {
  readonly id: RechnungId;
  readonly projektId: ProjektId;
  /** Das Auftrags-LV desselben Projekts, das die Rechnung abrechnet; bleibt nach dem Anlegen fest. */
  readonly auftragsLvId: AuftragsLeistungsverzeichnisId;
  /**
   * Laufende Nummer, ganze Zahl ≥ 1, je Auftrags-LV eindeutig; legt die Reihenfolge fest: „frühere Rechnungen“ sind die mit
   * kleinerer Nummer (D-34 (7)). Prüfung wie `AufmassKopf.nummer` (Form im Ausführer, Eindeutigkeit in `speicher`); bleibt
   * nach dem Anlegen fest (D-70.9).
   */
  readonly nummer: number;
  readonly art: Rechnungsart;
  /**
   * Eingangsdatum beim Auftraggeber, `JJJJ-MM-TT`, vom Nutzer; `null`: keine Angabe. Nicht das Rechnungsdatum der XRechnung
   * (BT-2), das die App höchstens vorschlägt (ein eigenes Feld dafür: Offene Typfrage, Ticket 70; in v1.5 vertagt, D-95.4).
   */
  readonly eingang: string | null;
  /** Rechnungsnummer, die der Auftragnehmer vergeben hat (XRechnung BT-1), freier Text; `null`: keine. Nie `''`. */
  readonly rechnungsnummerAuftragnehmer: string | null;
  /**
   * Was die Rechnung des Auftragnehmers fordert, wie sie es nennt (v1.4, Review D-44): Netto ohne und Brutto mit
   * Umsatzsteuer (XRechnung BT-109, BT-112) und der Zahlbetrag (BT-115; Ticket 76), ungeprüft übernommen; jeder Wert
   * `null`, wenn die Rechnung ihn nicht nennt. Nur zum Vergleich mit dem geprüften Stand, nie Grundlage der Prüfung (die
   * rechnet aus den Aufmaßblättern). „Nichts erfasst“ hat genau eine Schreibweise, das äußere `null`: Ein Objekt mit allen
   * drei Werten `null` weist der Ausführer mit `ungueltige-eingabe` ab.
   *
   * v1.5 (Ticket 95, D-95.4; Offene Typfrage 8 aus Ticket 70 entschieden, ohne Typänderung): `netto` und `brutto` sind
   * kumuliert wie die Abschlagsrechnung (D-34 (1)), also die ganze bis dahin abgerechnete Leistung; die Prüfung stellt sie
   * Netto nach Nachlass und Brutto kumuliert gegenüber. `zahlbetrag` ist, was diese Rechnung jetzt fordert (BT-115: nach
   * Abzug des bereits Gezahlten), nie kumuliert. Nennt eine Rechnung bei Netto und Brutto nur den Zuwachs, zeigt der
   * Vergleich dort eine Forderungsdifferenz; darum vergleicht die Prüfung zuerst den Zahlbetrag (D-44).
   */
  readonly gefordert: {
    readonly netto: Betrag | null;
    readonly brutto: Betrag | null;
    readonly zahlbetrag: Betrag | null;
  } | null;
  /**
   * Die Aufmaßblätter, deren Mengen die Rechnung abrechnet, und zwar **alle** bis dahin, auch die schon in früheren
   * Rechnungen (kumulierte Abschlagsrechnung, D-34 (1)): die vollständige kumulierte Menge. Jedes Blatt höchstens einmal
   * (der Ausführer weist Doppelte mit `ungueltige-eingabe` ab); die Reihenfolge hat keine Bedeutung (die App ordnet nach
   * Blattnummer). Nur Blätter desselben Auftrags-LV: eine Kennung ohne solches Blatt weist `speicher` mit `konflikt` ab.
   * Fehlt einer späteren Rechnung ein Blatt einer früheren, ist das ein Befund der Prüfung (Ticket 81), keine Sperre (U5).
   * `[]`: noch keine Leistung.
   */
  readonly aufmassIds: readonly AufmassId[];
  /** Umlagen in Anzeigereihenfolge; `[]`: keine. */
  readonly umlagen: readonly Umlage[];
  /**
   * Satz des Sicherheitseinbehalts (D-34 (6)): round(Brutto kumuliert × Satz / 100, 2), nur bei `art: 'abschlag'`
   * gelesen. `null`: kein Einbehalt. Bei `schluss` bleibt er stehen, wird aber nicht gelesen (die App übernimmt beide Sätze als
   * Vorschlag aus der vorigen Rechnung).
   */
  readonly sicherheitSatz: Prozent | null;
  /** Satz des Gewährleistungseinbehalts (D-34 (6)), nur bei `art: 'schluss'` gelesen; sonst wie `sicherheitSatz`. */
  readonly gewaehrleistungSatz: Prozent | null;
  /**
   * `null`: nicht freigegeben. Gesetzt nur durch `RechnungFreigeben`, mit dem Zahlbetrag, den die App mit `abrechnung`
   * gerechnet und der Prüfer bestätigt hat; der Ausführer rechnet nicht nach (Lesart wie `MengenansatzSetzen`). Der Betrag
   * ist **eingefroren** (D-34 (7)): Spätere Rechnungen ziehen ihn ab, auch wenn sich danach ein Aufmaß ändert (D-38).
   * Negativ heißt Überzahlung (ein Befund, keine Sperre).
   */
  readonly freigabe: { readonly zahlbetrag: Betrag } | null;
}

// --- Kostenermittlung (v1.4, C3; D-36 (3)) ------------------------------------------------------------------------

/**
 * Stufe einer Kostenermittlung nach DIN 276 (v1.4, Ticket 70 Punkt 9; Glossar „Kostenermittlungsstufe“), nur als Name;
 * die Stufe rechnet nichts. Welche Kostenermittlung die Kostenkontrolle als Budget nimmt, wählt der Nutzer in der App
 * (D-37, D-38: die Kostenberechnung).
 */
export type Kostenermittlungsstufe =
  'kostenrahmen' | 'kostenschaetzung' | 'kostenberechnung' | 'kostenanschlag' | 'kostenfeststellung';

/**
 * Ein gespeicherter Eintrag einer Kostenermittlung (v1.4, Ticket 70 Punkt 9; D-36 (3); Glossar „Kostenermittlung“):
 * Nettobetrag auf einer Kostengruppe. Kanonisch: `betrag` ist ein `Betrag` mit 2 Stellen. Der ungeprüfte Text einer
 * Eingabe (Grid, CSV) bleibt eine Funktion in `kosten` und heißt dort `Kostenermittlungseingabe` (`betrag: string`; Ticket
 * 82, damit ist Offene Typfrage 12 aus Ticket 70 erledigt). Negative Beträge sind zulässig (ein Befund in `kosten`, keine
 * Sperre, U5).
 */
export interface Kostenermittlungseintrag {
  readonly nummer: Kostengruppennummer;
  readonly betrag: Betrag;
  /** Freier Text; fehlt: keine Bemerkung. Nie `''` (der Ausführer lässt das Feld weg). */
  readonly bemerkung?: string;
}

/**
 * Kostenermittlung des Projekts (v1.4, Ticket 70 Punkt 9; C3, D-36 (3)): eigenes Aggregat, Befehle führt `kosten` aus
 * (Ticket 82). Summen je Kostengruppe und Gesamtsumme rechnet `kosten` (`kostenermittlungBerechnen`, D-24); gespeichert
 * werden nur die Einträge.
 */
export interface Kostenermittlung {
  readonly id: KostenermittlungId;
  readonly projektId: ProjektId;
  readonly stufe: Kostenermittlungsstufe;
  /** Name, wie der Nutzer ihn vergibt (z. B. „Kostenberechnung Entwurf“); die Liste des Projekts ordnet danach. */
  readonly name: string;
  /**
   * Die Einträge, nach `nummer` aufsteigend (wie `kgSortieren`), jede Nummer höchstens einmal. Vorläufige Annahme,
   * Entscheidung offen (enge Lesart): eindeutig im gespeicherten Stand. Doppelte Nummern einer Eingabe (CSV) bleiben ein
   * Befund der Rechnung in `kosten` (D-55.4, U5); `kosten` fasst sie für `KostenermittlungAnlegen` zusammen (Beträge
   * addiert, mit Befund; Ticket 82), der Ausführer weist sie sonst mit `ungueltige-eingabe` ab. Ein eigener Betrag neben
   * Beträgen der Kinder ist zulässig (Befund in `kosten`). Alternative: doppelte Nummern speichern (Offene Typfrage,
   * Ticket 70).
   */
  readonly eintraege: readonly Kostenermittlungseintrag[];
}
