// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte für Rückgängig, Wiederholen, Papierkorb, LV-Stände und Löschen (L1). Keine Übersetzung in v1.

export const texte = {
  historie: {
    rueckgaengig: 'Rückgängig',
    wiederholen: 'Wiederholen',
    tastenRueckgaengig: ['Strg', 'Z'],
    tastenWiederholen: ['Strg', 'Y'],
    nichtsRueckgaengig: 'Es gibt nichts rückgängig zu machen.',
    nichtsWiederholen: 'Es gibt nichts zu wiederholen.',
    abgewiesen: 'Rückgängig nicht möglich',
    wiederholenAbgewiesen: 'Wiederholen nicht möglich',
    konflikt:
      'Der gespeicherte Stand passt nicht mehr zu diesem Schritt. Es wurde nichts geändert; der Schritt bleibt im Verlauf.',
    teilweise: 'Ein Teil des Schritts wurde geschrieben, der Rest bleibt im Verlauf.',
  },
  papierkorb: {
    knopf: 'Papierkorb',
    titel: 'Papierkorb',
    leer: 'Der Papierkorb ist leer.',
    liste: 'Einträge im Papierkorb',
    ordnungszahl: 'OZ',
    kurztext: 'Kurztext',
    positionen: 'Positionen',
    aktionen: 'Aktionen',
    wiederherstellen: 'Wiederherstellen',
    entfernen: 'Endgültig entfernen',
    leeren: 'Papierkorb leeren',
    schliessen: 'Schließen',
    abbrechen: 'Abbrechen',
    entfernenFrage: (was: string): string =>
      `${was} endgültig entfernen? Das lässt sich nur in dieser Sitzung über „Rückgängig“ zurückholen.`,
    leerenFrage: (n: number): string =>
      `Alle ${String(n)} Einträge endgültig entfernen? Das lässt sich nur in dieser Sitzung über „Rückgängig“ zurückholen.`,
    bestaetigen: 'Endgültig entfernen',
    wiederhergestellt: 'Wiederhergestellt',
    konflikt:
      'Ein Angebot verweist auf eine Position in diesem Eintrag. Der Eintrag bleibt im Papierkorb, bis das Angebot sie nicht mehr nennt.',
  },
  staende: {
    knopf: 'LV-Stände',
    titel: 'LV-Stände',
    name: 'Name des Stands',
    namePlatzhalter: 'z. B. Versand',
    anlegen: 'Stand anlegen',
    nameFehlt: 'Bitte einen Namen eingeben.',
    leer: 'Noch kein LV-Stand angelegt.',
    liste: 'LV-Stände',
    oeffnen: 'Öffnen',
    angelegt: 'angelegt',
    schliessen: 'Schließen',
    nichtVerfuegbar: 'LV-Stände sind in diesem Speicher nicht verfügbar.',
    seiteLaden: 'Der LV-Stand wird geladen …',
    nichtGefunden: 'Diesen LV-Stand gibt es nicht (mehr).',
    schreibgeschuetzt: 'Stand ist schreibgeschützt',
    schreibgeschuetztText: 'Ein LV-Stand lässt sich nicht ändern. Änderungen gehen im LV selbst.',
    kennzeichen: 'schreibgeschützt',
    zumLv: 'Zum LV',
    alsNeuesLv: 'Als neues LV übernehmen',
    neuerName: (lv: string, stand: string): string => `${lv} (Stand ${stand})`,
    grid: 'Positionen des Stands',
  },
  loeschen: {
    lvKnopf: 'LV löschen',
    lvTitel: 'LV löschen',
    lvFrage: (name: string, positionen: number, papierkorb: number): string =>
      `Das LV „${name}“ mit ${String(positionen)} ${positionen === 1 ? 'Position' : 'Positionen'}` +
      (papierkorb > 0 ? ` und ${String(papierkorb)} Papierkorbeinträgen` : '') +
      ' wird gelöscht. Angebote, Auftrags-LV und LV-Stände dieses LV verhindern das Löschen. In dieser Sitzung holt „Rückgängig“ es zurück.',
    projektKnopf: 'Projekt löschen',
    projektTitel: 'Projekt löschen',
    projektFrage: (name: string, lvs: number): string =>
      `Das Projekt „${name}“ wird mit seinen Bietern und seinem Befehlsprotokoll gelöscht.` +
      (lvs > 0
        ? ` Es hat noch ${String(lvs)} ${lvs === 1 ? 'LV' : 'LVs'}; diese, ihre Angebote und das Auftrags-LV müssen zuerst gelöscht werden.`
        : '') +
      ' In dieser Sitzung holt „Rückgängig“ es zurück.',
    bestaetigen: 'Endgültig löschen',
    abbrechen: 'Abbrechen',
    lvKonflikt: 'Das LV hat noch Angebote, ein Auftrags-LV oder LV-Stände. Es wurde nicht gelöscht.',
    projektKonflikt:
      'Das Projekt hat noch LVs, Angebote oder ein Auftrags-LV. Bitte diese zuerst löschen; es wurde nichts gelöscht.',
  },
} as const;
