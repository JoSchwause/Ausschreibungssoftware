// SPDX-License-Identifier: AGPL-3.0-or-later
// Lesarten der Terminrechnung (Ticket 102 Punkt 4, D-102.2): Jede Konvention steht hier an einer Stelle und gilt für
// Rechnung, Tests und Fixtures (C4). Rein (A2).

/** Die Lesarten der Terminrechnung als Text, damit App, PDF und Fixtures sie zitieren können. */
export const BAUZEIT_ANNAHMEN = {
  einheit:
    'Gerechnet wird in ganzen Arbeitstagen des Arbeitskalenders, nie in Kalendertagen; Dauer und Abstand sind ganze Arbeitstage.',
  projektbeginn:
    'Kein Vorgang beginnt vor dem Projektbeginn. Ist der Projektbeginn kein Arbeitstag, gilt der erste Arbeitstag danach.',
  vorgang:
    'Ein Vorgang mit Dauer d ≥ 1 belegt d Arbeitstage: Beginn ist sein erster, Ende sein letzter Arbeitstag (einschließlich). Er beginnt und endet nie an einem freien Tag.',
  meilenstein:
    'Ein Meilenstein (Dauer 0) ist der Zeitpunkt am Anfang seines Arbeitstags: Beginn = Ende = dieser Tag. Er kostet keine Zeit: Ein Nachfolger mit Ende-Anfang und Abstand 0 beginnt am selben Tag; nach einem Vorgang mit Ende-Anfang und Abstand 0 liegt er am nächsten Arbeitstag nach dessen Ende.',
  zeitpunkte:
    'Anfang eines Vorgangs ist der Anfang seines ersten Arbeitstags, Ende der Schluss seines letzten; der Schluss eines Arbeitstags fällt mit dem Anfang des nächsten zusammen. Ein Abstand verschiebt um so viele Arbeitstage.',
  endeAnfang:
    'Ende-Anfang: Anfang des Nachfolgers ≥ Ende des Vorgängers + Abstand. Abstand 0: Beginn am nächsten Arbeitstag nach dem Ende; Abstand −1: am letzten Tag des Vorgängers.',
  anfangAnfang:
    'Anfang-Anfang: Anfang des Nachfolgers ≥ Anfang des Vorgängers + Abstand. Abstand 0: Beginn am selben Tag.',
  endeEnde: 'Ende-Ende: Ende des Nachfolgers ≥ Ende des Vorgängers + Abstand. Abstand 0: Ende am selben Tag.',
  anfangEnde:
    'Anfang-Ende: Ende des Nachfolgers ≥ Anfang des Vorgängers + Abstand. Abstand 0: Ende am Arbeitstag vor dem Beginn des Vorgängers.',
  terminvorgabe:
    'Terminvorgabe „Beginn frühestens“: Der Vorgang beginnt frühestens am ersten Arbeitstag ab dem Datum. An einem Sammelvorgang wird sie in v1 nicht gerechnet (Befund).',
  vorwaertsrechnung:
    'Vorwärtsrechnung: Beginn = spätester Wert aus Projektbeginn, Terminvorgabe und allen Anordnungsbeziehungen. Das ist die frühe Lage und zugleich der Termin des Plans.',
  projektende: 'Projektende = spätestes Ende der frühen Lage über alle Vorgänge.',
  rueckwaertsrechnung:
    'Rückwärtsrechnung vom Projektende: spätestes Ende = frühester Wert aus Projektende und allen Anordnungsbeziehungen zu Nachfolgern; kein Vorgang endet in der späten Lage nach dem Projektende.',
  gesamtpuffer: 'Gesamtpuffer = spätester Beginn − Beginn, in Arbeitstagen. Kritisch heißt Gesamtpuffer ≤ 0.',
  freierPuffer:
    'Freier Puffer = kleinster Spielraum zu einem Nachfolger in der frühen Lage, höchstens bis zum Projektende; nie größer als der Gesamtpuffer.',
  kritischerWeg:
    'Kritischer Weg: Folge kritischer Vorgänge, je zwei durch eine Anordnungsbeziehung ohne Spielraum verbunden; er beginnt am Projektbeginn oder an einer Terminvorgabe und endet am Projektende. Mehrere Wege werden in Eingabereihenfolge aufgezählt, höchstens KRITISCHE_WEGE_HOECHSTENS.',
  sammelvorgang:
    'Sammelvorgang: Beginn = frühester Beginn, Ende = spätestes Ende seiner Kinder (frühe und späte Lage je für sich); Puffer = kleinster Puffer der Kinder; kritisch, wenn ein Kind kritisch ist. Anordnungsbeziehungen an ihm sind in v1 ein Befund und werden nicht gerechnet.',
  zyklus:
    'Vorgänge in einem Zyklus von Anordnungsbeziehungen bleiben ohne Termine (Befund). Ihre Nachfolger werden ohne diese Beziehungen gerechnet, mit Befund.',
  ist: 'Ist-Termine und Fortschritt werden angezeigt, verschieben aber nichts (v1).',
  fortschritt:
    'Vorschlag für den Fortschritt eines Vorgangs mit Bezug auf ein Auftrags-LV: Summe der Gesamtpreise des Leistungsstands geteilt durch die Summe der Gesamtpreise der bezogenen Positionen, in Prozent auf zwei Stellen kaufmännisch gerundet. Beide Summen über dieselben Positionen, die in die Summe des Auftrags-LV eingehen (Bedarf ohne Gesamtbetrag und Wahl nicht); höchstens 100, mindestens 0. Der Nutzer übernimmt den Vorschlag.',
  feiertage:
    'Feiertage folgen aus Regeln: bundesweit und landesweit nach den Feiertagsgesetzen der Länder (Stand 2026, Änderungen ab 1995 mit ihrem ersten Jahr). Regionale und einmalige Feiertage sind freie Tage des Plans.',
} as const;

/** Höchstens so viele kritische Wege zählt die Rechnung auf; darüber ein Befund (D-102.8). */
export const KRITISCHE_WEGE_HOECHSTENS = 20;

/**
 * Größter Betrag von Dauer und Abstand in Arbeitstagen (rund 4.000 Jahre). Darüber ist der Wert ein Befund, damit alle
 * Summen exakte ganze Zahlen bleiben (D-102.7).
 */
export const HOECHSTWERT_ARBEITSTAGE = 1_000_000;
