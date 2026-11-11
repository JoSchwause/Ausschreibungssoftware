// SPDX-License-Identifier: AGPL-3.0-or-later
// Die einzige Stelle mit den vorläufigen Annahmen zum Mengenansatz (Ticket 35, G-16). Die Sprache des freien
// Rechenansatzes ist hier in eigenen Worten beschrieben, nicht aus dem REB-Katalog übernommen. Jede Annahme lässt
// sich später ändern, ohne gespeicherte Daten zu migrieren: Gespeichert wird nur der Ausdruckstext.

/** Nachkommastellen der Zwischenergebnisse einer Division (Annahme `zwischenstellen`). */
export const ZWISCHENSTELLEN = 10;

/** Höchstlänge eines Ausdrucks in Zeichen (Schutz gegen Missbrauch). */
export const MAX_AUSDRUCK_ZEICHEN = 1000;

/** Höchste Klammertiefe eines Ausdrucks (Schutz gegen Stapelüberlauf). */
export const MAX_KLAMMERTIEFE = 50;

/** Nummer der REB-Formel für den freien Rechenansatz (Annahme `formel91`). */
export const FREIER_RECHENANSATZ = 91;

export const MENGEN_ANNAHMEN: {
  readonly status: string;
  readonly formel91: string;
  readonly dezimalkomma: string;
  readonly punktStattKomma: string;
  readonly operatoren: string;
  readonly keineFunktionen: string;
  readonly zeilenbezug: string;
  readonly reihenfolge: string;
  readonly variable: string;
  readonly zeileDoppelt: string;
  readonly zwischenstellen: string;
  readonly zeilenergebnis: string;
  readonly summe: string;
  readonly unvollstaendig: string;
} = {
  status: 'vorläufige Annahme, Entscheidung offen',
  formel91:
    'Formel 91 ist der freie Rechenansatz: Der Ausdruck der Ansatzzeile ist ihr einziger Parameter, sein Wert ist das Ergebnis. Andere Formelnummern sind nicht umgesetzt und keiner geometrischen Form zugeordnet',
  dezimalkomma:
    'Zahlen stehen mit Dezimalkomma und ohne Tausendertrennzeichen; ganze Zahlen ohne Komma sind erlaubt, führende Nullen auch; nach dem Komma muss eine Ziffer folgen, vor ihm ebenso („,5“ und „2,“ sind Fehler)',
  punktStattKomma:
    'Ein Punkt in einer Zahl ist ein Fehler, kein Dezimal- oder Tausenderzeichen: Es wird nicht geraten, was gemeint ist',
  operatoren:
    'Grundrechenarten + - * /; zusätzlich × für *, ÷ und : für /, − (U+2212) für -; Punkt vor Strich, links-assoziativ; einstelliges Plus und Minus binden stärker als * und /; Leerraum zählt nicht',
  keineFunktionen:
    'Kein Potenzoperator, keine Funktionen; sie kommen mit den nummerierten Formeln, falls nötig',
  zeilenbezug:
    '„Z“ mit Zeilennummer (Z3) steht für das auf 3 Stellen gerundete Zeilenergebnis einer früheren Ansatzzeile; Groß/Klein zählt, „z3“ ist ein Variablenname',
  reihenfolge:
    'Früher heißt: weiter vorn in der Folge der Ansatzzeilen, nicht kleinere Zeilennummer. Ein Bezug auf die eigene oder eine spätere Zeile ist ein Vorwärtsbezug',
  variable:
    'Ein Variablenname beginnt mit einem Buchstaben (auch Umlaut), danach Buchstaben, Ziffern oder „_“; „Z“ gefolgt nur von Ziffern ist kein Name; der Wert ist das gerundete Zeilenergebnis wie beim Zeilenbezug; ein leerer Name ist ungültig (kein Name heißt `null`)',
  zeileDoppelt:
    'Eine Zeilennummer darf im Mengenansatz nur einmal vorkommen; die spätere Zeile mit derselben Nummer ist fehlerhaft',
  zwischenstellen:
    'Addition, Subtraktion und Multiplikation rechnen exakt; jede Division wird kaufmännisch auf 10 Nachkommastellen gerundet, bevor weitergerechnet wird',
  zeilenergebnis:
    'Das Zeilenergebnis ist der Wert des Ausdrucks, kaufmännisch auf die Stellen der Menge gerundet; negative Werte nach E-07',
  summe:
    'Die Summe des Mengenansatzes ist die Summe der gerundeten Zeilenergebnisse (analog N2); eine fehlerhafte Zeile macht die Summe ungültig, keine Zeile wird still übergangen',
  unvollstaendig:
    'Ein Ausdruck, der mitten in einer Rechnung endet („2+“), ist der Fehler `ausdruck-unvollstaendig` an der Spalte hinter dem letzten Zeichen; fehlt nur eine schließende Klammer, ist es `klammer-fehlt` an der offenen Klammer',
};
