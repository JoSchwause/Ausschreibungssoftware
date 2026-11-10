// SPDX-License-Identifier: AGPL-3.0-or-later
// Alle Regeln zu OZ-Maske und Ordnungszahl an genau einer Stelle (Ticket 06). Befehle (`oz-befehle.ts`) und Tests
// fragen nur diese Konstanten und Funktionen. Eine reine Funktionsdatei: kein Zustand, kein I/O (A2).
//
// BELEGT in der GAEB-Fachdokumentation DA XML 3.3 (Ausgabe 2021-05, im Folgenden „FD 3.3“; PDF-Seitenzahlen der Datei
// `Fachdokumentation_GAEB-DA-XML_3.3_2021-05.pdf`):
//  - Abschnitt 4.2.1 „Ordnungszahl (OZ)“, S. 23: die OZ hat höchstens 14 Stellen aus Stufen, Positionsnummer und
//    einstelligem Index; zulässige Zeichen; der Index ist einstellig und alphanumerisch; das Los belegt die oberste
//    Stufe, zusammen höchstens 5 Stufen.
//  - Abschnitt 4.3.3, S. 25: „Die gesamte OZ darf maximal 14 Stellen lang sein“; mit Index hat der Positionszähler
//    höchstens 13 Stellen.
//  - Abschnitt 4.3.4, S. 26: niedrigere Stufen dürfen unbelegt bleiben; die OZ erscheint dann verkürzt.
//  - Abschnitt 11.2.3, Objekt BoQInfo, Regel 2 und 5, S. 77: die Summe der Längen aller Teilschlüssel einer Gliederung
//    (Stufen, Position, Index) ist höchstens 14; die Position gibt es genau einmal; Regel 6: höchstens 5 Stufen
//    (Los eingeschlossen).
// Nicht belegt, sondern Annahme: alles in `OZ_ANNAHMEN`.

import type { Knoten, Ordnungszahl, OzMaske, OzStelle, OzZeichenart, Pruefbefund } from '@tethys/vertrag';
import { MAX_GLIEDERUNGSEBENEN } from './regeln';

/** FD 3.3, 4.2.1 und 11.2.3 (BoQInfo, Regel 2): Summe aller Stellen der Maske (Stufen, Position, Index). */
export const OZ_MAX_LAENGE = 14;

/** FD 3.3, 4.2.1 und 11.2.3 (BoQBkdn, Regel 2): Der Index ist genau eine Stelle lang. */
export const OZ_INDEX_LAENGE = 1;

/** Ticket 06: Gliederung +1 je Geschwister. */
export const GLIEDERUNG_SCHRITT = 1;

/** Ticket 06: Positionen +10 je Geschwister (Positionen ohne eigenen Zähler siehe `OZ_ANNAHMEN.indexpositionen`). */
export const POSITION_SCHRITT = 10;

/** E-09, F2: Bei Überlauf weicht die Vergabe der Reihe nach auf diese Schritte aus (nur die, die kleiner als der Standard sind). */
export const OZ_RUECKFALL_SCHRITTE: readonly number[] = [5, 2, 1];

/**
 * VORLÄUFIGE ANNAHMEN, ENTSCHEIDUNG OFFEN (P5). Was das Ticket und die FD 3.3 nicht festlegen, ist hier gesammelt und
 * restriktiv gelesen. Jede Lesart lässt sich ohne Datenmigration lockern: Eine nach der engen Regel gültige OZ bleibt nach
 * jeder lockereren gültig. Wer eine Frage entscheidet, ändert nur die benannte Funktion und diesen Eintrag.
 */
export const OZ_ANNAHMEN: {
  readonly status: string;
  readonly volleOz: string;
  readonly unbelegteStufen: string;
  readonly tieferAlsMaske: string;
  readonly ueberlauf: string;
  readonly indexpositionen: string;
  readonly hinweistexte: string;
  readonly alphanumerisch: string;
  readonly nullteile: string;
  readonly trennzeichen: string;
  readonly teilbaumwurzel: string;
  readonly eindeutigkeit: string;
} = {
  status: 'vorläufige Annahme, Entscheidung offen',
  /** (a) `ozZusammensetzen`: Die OZ eines Knotens trägt die Teile aller Vorfahren, durch das Trennzeichen verbunden. */
  volleOz:
    'Die OZ eines Knotens besteht aus den Teilen seiner Gliederungs-Vorfahren und seinem eigenen Teil, verbunden mit dem Trennzeichen der Maske (wie fixtures/typisch und wie der GAEB-Leser sie bildet); der Index steht nicht darin',
  /** (b) `stellenFuer`: unbelegte untere Stufen (FD 3.3, 4.3.4) lassen ihren Teil weg; der Druck mit „_“ ist Sache der Ausgabe. */
  unbelegteStufen:
    'Eine Position unter einer Stufe, die flacher ist als die Maske, bekommt eine OZ mit weniger Teilen (kein Platzhalter gespeichert); die gedruckte Darstellung mit „_“ nach FD 3.3, 4.3.4 ist nicht Teil des Kerns',
  /** (b) `ebene` zu groß: abgewiesen. */
  tieferAlsMaske:
    'Ein Knoten in einer Stufe, die die Maske nicht hat, wird nicht nummeriert; der Befehl wird mit maske-ungueltig (OzMaskeSetzen, Umnummerieren) oder oz-ungueltig (OrdnungszahlSetzen) abgewiesen und nennt den Knoten',
  /** (c) `nummerAls`: Überlauf. */
  ueberlauf:
    'Passt ein Zähler (Geschwisterzahl mal Schritt) nicht in die Stellen, weicht die Vergabe für diese Geschwistergruppe automatisch auf Schritt 5, dann 2, dann 1 aus (E-09, F2; nur auf Schritte unter dem Standardschritt, Gliederungen haben also keinen Rückfall) und liefert je ausgewichener Gruppe einen Befehlshinweis oz-schritt-ausgewichen an der ersten Position der Gruppe (feld ordnungszahl). Passt auch Schritt 1 nicht (oder eine Gliederungsnummer nicht in ihre Stellen), wird abgewiesen (oz-ueberlauf, nennt den ersten Knoten ohne Platz); nie eine abgeschnittene oder doppelte OZ (doppelt: oz-doppelt)',
  /** (d) Indexpositionen. */
  indexpositionen:
    'ozIndex wird nie verändert. Eine Position mit ozIndex teilt den Grundteil der nächsten vorhergehenden Position unter demselben Elternknoten (Muster in fixtures/typisch: 0050 und 0050 A) und verbraucht keinen Zähler; ohne vorhergehende Position bekommt sie einen eigenen Grundteil. Passt der Index nicht zur Maske oder entstehen gleiche OZ mit Index, wird abgewiesen',
  /** (e) Hinweistexte. */
  hinweistexte: 'Hinweistexte tragen keine OZ und zählen nicht mit',
  /** (f) Alphanumerische Stufen. */
  alphanumerisch:
    'Das Umnummerieren erzeugt nur Ziffern; OrdnungszahlSetzen darf in alphanumerischen Stellen [0-9A-Za-z_] setzen; das Leerzeichen (FD 3.3 erlaubt es) ist nicht zugelassen',
  /** (g) `teilNurFuellzeichen`. */
  nullteile:
    'Ein Teil (Stufe oder Position) nur aus „0“, Leerzeichen und „_“ ist unzulässig (Lesart von FD 3.3, 4.2.1: diese Zeichen nur „in Verbindung mit anderen zugelassenen Zeichen“)',
  /** (h) `maskeFehler`. */
  trennzeichen:
    'Das Trennzeichen ist null oder genau ein Zeichen, das in keinem Teil vorkommen darf (kein [0-9A-Za-z_] und kein Leerzeichen); GAEB überträgt keins',
  /** (i) `Umnummerieren`. */
  teilbaumwurzel:
    'Umnummerieren(teilbaumId) vergibt die OZ der Nachfahren neu; die OZ der Teilbaumwurzel bleibt und muss gültig sein (sie liefert die Vorsilben); beim LV selbst sind es alle Knoten',
  /** (j) Eindeutigkeit. */
  eindeutigkeit:
    'OrdnungszahlSetzen weist Duplikate nicht ab (U5); das Umnummerieren weist ab, wenn eine neu vergebene OZ mit Index auf eine bestehende trifft',
};

/** Zulässige Zeichen je Art: FD 3.3, 4.2.1 (ohne Leerzeichen, siehe `OZ_ANNAHMEN.alphanumerisch`). */
const ZEICHEN: Readonly<Record<OzZeichenart, RegExp>> = {
  numerisch: /^[0-9]+$/,
  alphanumerisch: /^[0-9A-Za-z_]+$/,
};

/** Zeichen, die als Trennzeichen ausscheiden, weil sie in einem Teil vorkommen dürfen. */
const TEILZEICHEN = /[0-9A-Za-z_ ]/;

const istGanzzahl = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n);

/** Fehlertext zu einer einzelnen Stelle der Maske oder `null`. */
function stelleFehler(name: string, s: OzStelle): string | null {
  if (!istGanzzahl(s.laenge) || s.laenge < 1) {
    return `${name}: Länge ${String(s.laenge)} ist unzulässig (mindestens 1 Stelle).`;
  }
  if (!Object.hasOwn(ZEICHEN, s.zeichen)) return `${name}: unbekannte Zeichenart „${s.zeichen}“.`;
  return null;
}

/**
 * Ist die Maske zulässig? Liefert den ersten Fehlertext oder `null`.
 *  - jede Stelle (Stufe, Position, Index) hat mindestens eine Stelle Länge (nie 0);
 *  - Position: mindestens eine Ziffer (FD 3.3, 11.2.3 BoQInfo Regel 5: die Position gibt es genau einmal);
 *  - höchstens `MAX_GLIEDERUNGSEBENEN` Stufen (FD 3.3, 4.2.1 und 11.2.3 Regel 6); ein Los zählt als Stufe
 *    (`LOS_ANNAHME`), belegt also eine der Stellen von `gliederung`;
 *  - Index: `null` oder genau `OZ_INDEX_LAENGE` Stelle (FD 3.3, 11.2.3 BoQBkdn Regel 2);
 *  - Summe aller Längen höchstens `OZ_MAX_LAENGE` (FD 3.3, 11.2.3 BoQInfo Regel 2; 4.3.3);
 *  - Trennzeichen siehe `OZ_ANNAHMEN.trennzeichen`.
 */
export function maskeFehler(maske: OzMaske): string | null {
  if (maske.gliederung.length > MAX_GLIEDERUNGSEBENEN) {
    return `Die Maske hat ${String(maske.gliederung.length)} Gliederungsstufen; höchstens ${String(MAX_GLIEDERUNGSEBENEN)} sind zulässig (das Los zählt mit).`;
  }
  for (const [i, s] of maske.gliederung.entries()) {
    const f = stelleFehler(`Gliederungsstufe ${String(i + 1)}`, s);
    if (f !== null) return f;
  }
  const pos = stelleFehler('Position', maske.position);
  if (pos !== null) return pos;
  if (maske.index !== null) {
    const f = stelleFehler('Index', maske.index);
    if (f !== null) return f;
    if (maske.index.laenge !== OZ_INDEX_LAENGE) {
      return `Der Index hat genau ${String(OZ_INDEX_LAENGE)} Stelle, nicht ${String(maske.index.laenge)}.`;
    }
  }
  const summe = maskenLaenge(maske);
  if (summe > OZ_MAX_LAENGE) {
    return `Die Stellen der Maske ergeben ${String(summe)} Zeichen; höchstens ${String(OZ_MAX_LAENGE)} sind zulässig.`;
  }
  const t = maske.trennzeichen;
  if (t !== null && (typeof t !== 'string' || t.length !== 1 || TEILZEICHEN.test(t))) {
    return `Das Trennzeichen muss null oder ein einzelnes Zeichen sein, das in keinem Teil vorkommt (nicht „${t}“).`;
  }
  return null;
}

/**
 * Prüfbefunde zu einer Maske beim Anlegen eines LV. Rein: `LeistungsverzeichnisAnlegen` nimmt auch eine beanstandete
 * Maske an (ein GAEB-Import darf daran nicht scheitern, U5) und liefert jeden Befund als `Befehlshinweis`
 * `oz-maske-ungueltig` mit `feld: 'ozMaske'` (Vertrag v1.2, Ticket 30). `OzMaskeSetzen` (Handeingabe) weist eine
 * solche Maske dagegen mit `maske-ungueltig` ab. Regeln: allein `maskeFehler`. Schwere und Code sind eine vorläufige Annahme, Entscheidung offen: eine Warnung,
 * Code `oz-maske-ungueltig`, ein Befund je Maske (der erste Fehler).
 */
export function maskePruefen(maske: OzMaske): readonly Pruefbefund[] {
  const fehler = maskeFehler(maske);
  if (fehler === null) return [];
  return [
    {
      schwere: 'warnung',
      quelle: 'lv-pruefung',
      code: 'oz-maske-ungueltig',
      meldung: fehler,
      ort: { feld: 'ozMaske' },
    },
  ];
}

/** Summe aller Stellen der Maske (Stufen, Position, Index); ohne Trennzeichen. */
export function maskenLaenge(maske: OzMaske): number {
  let summe = maske.position.laenge + (maske.index?.laenge ?? 0);
  for (const s of maske.gliederung) summe += s.laenge;
  return summe;
}

/** Gleiche Masken (Wert, nicht Objektidentität). */
export function maskenGleich(a: OzMaske, b: OzMaske): boolean {
  const gleich = (x: OzStelle | null, y: OzStelle | null): boolean =>
    x === null || y === null ? x === y : x.laenge === y.laenge && x.zeichen === y.zeichen;
  return (
    a.gliederung.length === b.gliederung.length &&
    a.gliederung.every((s, i) => gleich(s, b.gliederung[i] ?? null)) &&
    gleich(a.position, b.position) &&
    gleich(a.index, b.index) &&
    a.trennzeichen === b.trennzeichen
  );
}

/**
 * Die Stellen, die ein Knoten in der OZ belegt: die ersten `ebene` Stufen, bei einer Position danach die
 * Positionsstelle. `ebene` ist bei einer Gliederung ihre eigene Stufe (1 für die oberste), bei einer Position die Zahl
 * der Stufen darüber (0 unter der LV-Wurzel). `null`, wenn die Maske so viele Stufen nicht hat.
 * Unbelegte untere Stufen lassen ihren Teil weg (`OZ_ANNAHMEN.unbelegteStufen`, FD 3.3, 4.3.4).
 */
export function stellenFuer(
  maske: OzMaske,
  art: 'gliederung' | 'position',
  ebene: number,
): readonly OzStelle[] | null {
  if (!istGanzzahl(ebene) || ebene < (art === 'gliederung' ? 1 : 0) || ebene > maske.gliederung.length) {
    return null;
  }
  const stufen = maske.gliederung.slice(0, ebene);
  return art === 'position' ? [...stufen, maske.position] : stufen;
}

/** Fügt die Teile zur OZ zusammen (`OZ_ANNAHMEN.volleOz`). */
export function ozZusammensetzen(maske: OzMaske, teile: readonly string[]): Ordnungszahl {
  return teile.join(maske.trennzeichen ?? '') as Ordnungszahl;
}

/**
 * Zerlegt eine OZ in ihre Teile, wenn sie genau zu `stellen` passt (Teilzahl und Längen); sonst `null`.
 * Ohne Trennzeichen entscheidet die Gesamtlänge (die Längen sind eindeutig, weil jede Stelle mindestens 1 lang ist).
 */
export function ozZerlegen(maske: OzMaske, oz: string, stellen: readonly OzStelle[]): string[] | null {
  const t = maske.trennzeichen;
  if (t !== null) {
    const teile = oz.split(t);
    if (teile.length !== stellen.length) return null;
    return stellen.every((s, i) => teile[i]?.length === s.laenge) ? teile : null;
  }
  const soll = stellen.reduce((a, s) => a + s.laenge, 0);
  if (oz.length !== soll) return null;
  let von = 0;
  return stellen.map((s) => {
    const teil = oz.slice(von, von + s.laenge);
    von += s.laenge;
    return teil;
  });
}

/** Ein Teil nur aus „0“, Leerzeichen und „_“ (`OZ_ANNAHMEN.nullteile`). */
export const teilNurFuellzeichen = (teil: string): boolean => !/[^0_ ]/.test(teil);

/** Fehlertext zu einem Teil (Zeichen und Füllzeichen; die Länge prüft `ozZerlegen`) oder `null`. */
export function teilFehler(stelle: OzStelle, teil: string): string | null {
  if (teil.length !== stelle.laenge) {
    return `Teil „${teil}“ hat ${String(teil.length)} Zeichen, die Maske verlangt ${String(stelle.laenge)}.`;
  }
  if (!ZEICHEN[stelle.zeichen].test(teil)) {
    return `Teil „${teil}“ enthält Zeichen, die in einer ${stelle.zeichen}en Stelle nicht zulässig sind.`;
  }
  if (teilNurFuellzeichen(teil)) {
    return `Teil „${teil}“ besteht nur aus 0, Leerzeichen oder Unterstrich.`;
  }
  return null;
}

/** Fehlertext zum Indexbuchstaben einer Position oder `null`. Gliederungen haben keinen Index. */
export function indexFehler(
  maske: OzMaske,
  art: 'gliederung' | 'position',
  ozIndex: string | null,
): string | null {
  if (ozIndex === null) return null;
  if (art === 'gliederung') return 'Eine Gliederung hat keinen Index.';
  if (maske.index === null) return 'Die Maske hat keine Indexstelle.';
  if (ozIndex.length !== maske.index.laenge) {
    return `Der Index „${ozIndex}“ hat ${String(ozIndex.length)} Zeichen, die Maske verlangt ${String(maske.index.laenge)}.`;
  }
  if (!ZEICHEN[maske.index.zeichen].test(ozIndex)) {
    return `Der Index „${ozIndex}“ enthält Zeichen, die in einer ${maske.index.zeichen}en Stelle nicht zulässig sind.`;
  }
  return null;
}

/**
 * Prüft eine von Hand gesetzte OZ samt Index gegen die Maske: Gesamtlänge, Teilzahl, Länge und Zeichen jedes Teils,
 * Index. Fehlertext oder `null`. Eindeutigkeit prüft diese Funktion nicht (`doppelteOrdnungszahlen`, U5), ebenso nicht,
 * ob die Vorsilben zur OZ der Eltern passen.
 */
export function ozFehler(
  maske: OzMaske,
  oz: string,
  ozIndex: string | null,
  art: 'gliederung' | 'position',
  ebene: number,
): string | null {
  const stellen = stellenFuer(maske, art, ebene);
  if (stellen === null) {
    return `Der Knoten liegt in Stufe ${String(ebene)}; die Maske hat nur ${String(maske.gliederung.length)} Gliederungsstufen.`;
  }
  const t = maske.trennzeichen;
  const stellenzahl = (t === null ? oz : oz.split(t).join('')).length;
  if (stellenzahl > OZ_MAX_LAENGE) {
    return `Die OZ hat ${String(stellenzahl)} Stellen; höchstens ${String(OZ_MAX_LAENGE)} sind zulässig.`;
  }
  const teile = ozZerlegen(maske, oz, stellen);
  if (teile === null) {
    const soll = stellen.map((s) => 'N'.repeat(s.laenge)).join(t ?? '');
    return `Die OZ „${oz}“ passt nicht zur Maske an dieser Stelle im Baum (erwartet: ${soll}).`;
  }
  for (const [i, teil] of teile.entries()) {
    const s = stellen[i];
    const f = s === undefined ? null : teilFehler(s, teil);
    if (f !== null) return f;
  }
  return indexFehler(maske, art, ozIndex);
}

/**
 * Der Zähler als Teil mit führenden Nullen, `null` bei Überlauf (`OZ_ANNAHMEN.ueberlauf`): ein Wert, der nicht in die
 * Stellen passt, würde abgeschnitten oder verlängert. Erzeugt nur Ziffern (`OZ_ANNAHMEN.alphanumerisch`).
 */
export function nummerAls(stelle: OzStelle, wert: number): string | null {
  const text = String(wert);
  if (!istGanzzahl(wert) || wert < 1 || text.length > stelle.laenge) return null;
  return text.padStart(stelle.laenge, '0');
}

/**
 * Der Schritt, mit dem `anzahl` Geschwister in `stelle` passen: zuerst `standard`, dann die kleineren Schritte aus
 * `OZ_RUECKFALL_SCHRITTE` (E-09, `OZ_ANNAHMEN.ueberlauf`). `null`, wenn auch Schritt 1 nicht reicht.
 */
export function zaehlerSchritt(stelle: OzStelle, anzahl: number, standard: number): number | null {
  const kandidaten = [standard, ...OZ_RUECKFALL_SCHRITTE.filter((s) => s < standard)];
  return kandidaten.find((schritt) => nummerAls(stelle, anzahl * schritt) !== null) ?? null;
}

/** Teil der n-ten Gliederung unter demselben Elternknoten (n ab 1): `n × schritt` (Standard `GLIEDERUNG_SCHRITT`). */
export const gliederungsTeil = (
  stelle: OzStelle,
  n: number,
  schritt: number = GLIEDERUNG_SCHRITT,
): string | null => nummerAls(stelle, n * schritt);

/** Teil der n-ten Position unter demselben Elternknoten (n ab 1): `n × schritt` (Standard `POSITION_SCHRITT`). */
export const positionsTeil = (
  stelle: OzStelle,
  n: number,
  schritt: number = POSITION_SCHRITT,
): string | null => nummerAls(stelle, n * schritt);

/** Eine OZ (mit Index), die mehrfach vorkommt. */
export interface DoppelteOrdnungszahl {
  readonly ordnungszahl: Ordnungszahl;
  readonly ozIndex: string | null;
  /** Mindestens zwei Knoten, in Reihenfolge des übergebenen Arrays. */
  readonly knotenIds: readonly string[];
}

/** Schlüssel für die Eindeutigkeit: OZ und Index (FD 3.3, 4.2.1: die OZ ist im LV eindeutig). */
export const ozSchluessel = (oz: string, ozIndex: string | null): string => `${oz}\u0000${ozIndex ?? ''}`;

/**
 * Doppelte Ordnungszahlen (mit Index) unter den Knoten. Reine Hilfe für die formale LV-Prüfung (U5): Eingabe wird nie
 * abgewiesen, weil eine OZ doppelt ist. Knoten ohne OZ und Hinweistexte zählen nicht.
 */
export function doppelteOrdnungszahlen(knoten: readonly Knoten[]): readonly DoppelteOrdnungszahl[] {
  const gruppen = new Map<string, { oz: Ordnungszahl; index: string | null; ids: string[] }>();
  for (const k of knoten) {
    if (k.art === 'hinweis' || k.ordnungszahl === null) continue;
    const index = k.art === 'position' ? k.ozIndex : null;
    const s = ozSchluessel(k.ordnungszahl, index);
    const g = gruppen.get(s);
    if (g) g.ids.push(k.id);
    else gruppen.set(s, { oz: k.ordnungszahl, index, ids: [k.id] });
  }
  return [...gruppen.values()]
    .filter((g) => g.ids.length > 1)
    .map((g) => ({ ordnungszahl: g.oz, ozIndex: g.index, knotenIds: g.ids }));
}
