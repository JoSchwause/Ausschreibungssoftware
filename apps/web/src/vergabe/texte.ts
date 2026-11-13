// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte der Preisspiegel-Seite (Ticket 63, L1).

export const texte = {
  seite: {
    titel: 'Preisspiegel',
    laden: 'Preisspiegel wird geladen …',
    nichtGefunden: 'Leistungsverzeichnis nicht gefunden',
    zumLv: 'Zum Leistungsverzeichnis',
    grid: 'Preisspiegel',
    keineAngebote:
      'Zu diesem Leistungsverzeichnis gibt es noch keine Angebote. Angebote lassen sich auf der LV-Seite einlesen (X84).',
    oeffnen: 'Preisspiegel',
    werkzeuge: 'Werkzeuge des Preisspiegels',
    summen: 'Summen',
  },
  spalten: {
    oz: 'OZ',
    kurztext: 'Kurztext',
    menge: 'Menge',
    einheit: 'Einheit',
    abc: 'ABC',
    ep: 'EP',
    gp: 'GP',
    schaetzpreis: 'Schätzpreis',
    min: 'Min',
    mittel: 'Mittel',
    max: 'Max',
  },
  summen: {
    netto: 'Netto',
    nachlass: 'Nachlass',
    nettoNachNachlass: 'Netto nach Nachlass',
    mwst: 'MwSt',
    brutto: 'Brutto',
    bedarf: 'Bedarfssumme (ohne Gesamtbetrag)',
    wahl: 'Wahlsumme',
    nichtAngeboten: 'Nicht angebotene Positionen',
    rang: 'Rang',
    virtuellNetto: 'Netto ohne Nachlass',
  },
  kennzeichen: {
    zuschlagssatzFehlt: { symbol: '%', beschreibung: 'Zuschlagssatz fehlt (zählt wie nicht angeboten)' },
    basisUnvollstaendig: 'Basis unvollständig: eine Bezugsposition hat keinen Preis des Bieters',
    nichtInSumme: {
      symbol: '( )',
      beschreibung: 'geht nicht in die Summe ein (Bedarf ohne Gesamtbetrag oder Wahl)',
    },
    abc: (k: string) => `ABC-Klasse ${k}`,
  },
  tooltip: {
    mittel: (wert: string) => `Mittel ${wert}`,
    satz: (satz: string, basis: string) => `Zuschlagssatz ${satz} % auf die Basis ${basis}`,
    keinSatz: 'kein Satz',
  },
  detail: {
    leiste: 'Zelle',
    bieter: 'Bieter',
    position: 'Position',
    wert: 'Wert',
    keine: 'Keine Zelle gewählt.',
    ohneKennzeichen: 'ohne Kennzeichen',
    hoch: (schwelle: string, mittel: string) =>
      `Ausreißer nach oben: mehr als ${schwelle} % über dem Mittel ${mittel}.`,
    niedrig: (schwelle: string, mittel: string) =>
      `Ausreißer nach unten: mehr als ${schwelle} % unter dem Mittel ${mittel}.`,
    nichtAngeboten: 'Nicht angeboten: Der Bieter hat zu dieser Position keinen Preis abgegeben.',
    nullpreis:
      'Nullpreis: angebotener Preis 0,00; zählt nicht für Min, Mittel und Max und ist nie Ausreißer.',
    zuschlagssatzFehlt:
      'Zuschlagssatz fehlt: Der Bieter hat die Zuschlagsposition ohne Satz angeboten; sie zählt wie nicht angeboten.',
    basisUnvollstaendig:
      'Basis unvollständig: Eine Bezugsposition hat keinen Preis des Bieters und trägt nichts zur Basis bei.',
    min: 'Niedrigster Preis dieser Position.',
    max: 'Höchster Preis dieser Position.',
    abc: (klasse: string, bezug: string) => `ABC-Klasse ${klasse} (Bezug ${bezug}).`,
    nichtInSumme: 'Die Position geht laut LV nicht in die Summe ein (Bedarf ohne Gesamtbetrag oder Wahl).',
    virtuell: (name: string) => `Virtueller Bieter ${name}: rechnerischer Vergleichswert, kein Angebot.`,
  },
  einstellungen: {
    gruppe: 'Einstellungen des Preisspiegels',
    hinweis: 'Gilt nur für diese Sitzung; wird nicht gespeichert.',
    ausreisser: 'Ausreißer-Schwelle in %',
    abcA: 'ABC-Schwelle A in %',
    abcBezug: 'Bezug der ABC-Klasse',
    bezugMittel: 'Mittel',
    bezugSchaetzpreis: 'Schätzpreis',
    spalten: 'Spalten',
    ep: 'EP',
    gp: 'GP',
    virtuell: 'Virtuelle Bieter (Min, Mittel, Max)',
    schaetzpreis: 'Schätzpreis',
    ungueltig: 'Bitte eine Zahl wie 20 oder 12,5 eingeben.',
    negativ: 'Der Wert darf nicht negativ sein.',
    ueber100: 'Der Wert darf höchstens 100 sein.',
    zuVieleStellen: 'Höchstens zwei Nachkommastellen.',
  },
  bieter: {
    liste: 'Bieter des Preisspiegels',
    bieter: 'Bieter',
    aktion: 'Aktion',
    rang: (r: number) => `Rang ${String(r)}`,
  },
} as const;
