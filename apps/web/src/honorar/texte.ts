// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte der Honorarseiten (Ticket 119, L1).

import type { Honorarzone, Leistungsbild } from '@tethys/vertrag';

/**
 * Fester Hinweis (D-56, D-66): kein Befund, nicht Teil des `Honorarergebnis`. Derselbe Wortlaut wie im PDF
 * (`DIN276_HINWEIS` in `ausgabe`); ein Test hält beide gleich, damit das Hauptbündel `ausgabe` (pdfmake) nicht lädt.
 */
export const DIN276_HINWEIS =
  'Hinweis: § 4 Abs. 1 HOAI verweist für die anrechenbaren Kosten auf DIN 276 in der Fassung DIN 276:2008-12. ' +
  'Die Kostenermittlung muss nach dieser Fassung gegliedert sein.';

export const LEISTUNGSBILD_TEXT: Readonly<Record<Leistungsbild, string>> = {
  gebaeude: 'Gebäude',
  innenraeume: 'Innenräume',
  freianlagen: 'Freianlagen',
  ingenieurbauwerke: 'Ingenieurbauwerke',
  verkehrsanlagen: 'Verkehrsanlagen',
  tragwerksplanung: 'Tragwerksplanung',
  'technische-ausruestung': 'Technische Ausrüstung',
};

export const ZONEN: readonly Honorarzone[] = ['I', 'II', 'III', 'IV', 'V'];

/** Befunde der Honorarberechnung, die die App mit eigenem Text zeigt (D-110.4); alle anderen zeigen die Meldung der Rechnung. */
export const BEFUNDTEXT: Readonly<Record<string, string>> = {
  'kostenermittlung-unbekannt':
    'Die gewählte Kostenermittlung gibt es im Projekt nicht (mehr). Für dieses Objekt entsteht kein Honorar.',
  'kostenberechnung-vorhanden':
    'Das Projekt hat eine Kostenberechnung; nach § 6 Abs. 1 Nr. 2 HOAI ist sie die Grundlage, nicht die Kostenschätzung.',
  'kostenermittlungsstufe-abweichend':
    'Grundlage der anrechenbaren Kosten ist nach § 6 Abs. 1 Nr. 2 HOAI die Kostenberechnung, ohne sie die Kostenschätzung. Die gewählte Kostenermittlung hat eine andere Stufe.',
};

export const texte = {
  projekt: { honorar: 'Honorar' },
  vorgaben: {
    basis: 'Basishonorarsatz',
    viertel: 'Viertelsatz',
    mittel: 'Mittelsatz',
    dreiviertel: 'Dreiviertelsatz',
    oberer: 'Oberer Honorarsatz',
  },
  fehler: {
    name: 'Der Name fehlt.',
    bezeichnung: 'Die Bezeichnung fehlt.',
    kostenermittlung: 'Wähle eine Kostenermittlung des Projekts.',
  },
  seite: {
    titel: (projekt: string) => `Honorar – ${projekt}`,
    laden: 'Honorarberechnungen werden geladen …',
    nichtGefunden: 'Projekt nicht gefunden',
    zumProjekt: 'Zum Projekt',
    liste: 'Honorarberechnungen des Projekts',
    leer: 'Noch keine Honorarberechnung. Lege eine an, um ein Honorar nach HOAI zu berechnen.',
    anlegenTitel: 'Honorarberechnung anlegen',
    name: 'Name',
    nameFehlt: 'Der Name fehlt.',
    anlegen: 'Anlegen',
    werkzeuge: 'Werkzeuge der Honorarseite',
    brutto: (name: string) => `Brutto ${name}`,
  },
  editor: {
    titel: (name: string) => `Honorarberechnung – ${name}`,
    zurueck: 'Zur Liste',
    nichtGefunden: 'Honorarberechnung nicht gefunden',
    loeschen: 'Honorarberechnung löschen',
    loeschenTitel: 'Honorarberechnung löschen',
    loeschenFrage: (name: string) =>
      `Die Honorarberechnung „${name}“ samt aller Objekte wird gelöscht. Rückgängig holt sie zurück.`,
    abbrechen: 'Abbrechen',
    loeschenBestaetigen: 'Löschen',
    kopf: 'Name, Nebenkosten und MwSt',
    name: 'Name',
    umbenennen: 'Umbenennen',
    nebenkosten: 'Nebenkosten',
    nebenArt: { keine: 'keine', prozent: 'Prozent', betrag: 'Betrag' },
    nebenWert: 'Nebenkosten (% oder €)',
    mwst: 'MwSt-Satz (%)',
    objekte: 'Objekte',
    objektHinzu: 'Objekt hinzufügen',
    objektEntfernen: 'Objekt entfernen',
    objektTitel: (n: number, name: string) => `Objekt ${String(n)}: ${name}`,
    keineObjekte: 'Noch kein Objekt.',
    bezeichnung: 'Bezeichnung',
    leistungsbild: 'Leistungsbild',
    honorarzone: 'Honorarzone',
    honorarsatzVorgabe: 'Honorarsatz (Vorgabe)',
    honorarsatzFrei: 'Eigener Wert',
    honorarsatz: 'Honorarsatz (%)',
    honorarsatzHinweis: 'Standard 0 (Basishonorarsatz, § 7 Abs. 1 HOAI)',
    kosten: 'Anrechenbare Kosten',
    kostenart: 'Anrechenbare Kosten aus',
    kostenartBetrag: 'Betrag von Hand',
    kostenartKostenermittlung: 'Kostenermittlung des Projekts (§ 33)',
    betrag: 'Anrechenbare Kosten (netto, €)',
    kostenermittlung: 'Kostenermittlung',
    keineKostenermittlung: 'Das Projekt hat noch keine Kostenermittlung.',
    technischeAnlagen: 'Technische Anlagen nicht selbst geplant (§ 33 Abs. 2)',
    weitereKosten: 'Weitere anrechenbare Kosten (§ 33 Abs. 3, €)',
    bausubstanz: 'Mitzuverarbeitende Bausubstanz (§ 4 Abs. 3, €)',
    phasen: 'Leistungsphasen',
    phaseBeauftragt: (nummer: number) => `Leistungsphase ${String(nummer)} beauftragt`,
    phaseAnteil: (nummer: number) => `Anteil Leistungsphase ${String(nummer)} (%)`,
    phasenKopf: { beauftragt: 'Beauftragt', phase: 'Leistungsphase', standard: 'Satz der HOAI', anteil: 'Anteil (%)' },
    umbau: 'Umbau (Umbauzuschlag nach § 6 Abs. 2)',
    umbauSatz: 'Umbauzuschlag (% des Grundhonorars)',
    umbauHinweis: 'Vorschlag 20 %',
    befunde: 'Befunde und Hinweise',
    keineBefunde: 'Keine Befunde.',
    befundFehler: 'Fehler',
    befundWarnung: 'Warnung',
    din276Titel: 'Hinweis zur Kostengliederung',
    ergebnis: 'Ergebnis',
    ergebnisObjekt: (n: number) => `Ergebnis Objekt ${String(n)}`,
    nichtBerechnet: 'Für dieses Objekt entsteht kein Honorar (siehe Befunde).',
    herleitung: 'Herleitung der anrechenbaren Kosten (§ 33)',
    zeilen: {
      kg300: 'KG 300',
      weitereKosten: 'Weitere Kosten (§ 33 Abs. 3)',
      sonstige: 'Sonstige anrechenbare Kosten',
      kg400: 'KG 400',
      grenze: 'Grenze 25 % (§ 33 Abs. 2 Nr. 1)',
      kg400Voll: 'KG 400 voll angerechnet',
      kg400Haelfte: 'KG 400 zur Hälfte angerechnet',
      bausubstanz: 'Mitzuverarbeitende Bausubstanz',
      anrechenbar: 'Anrechenbare Kosten',
    },
    tafel: 'Honorartafel (§ 13, lineare Interpolation)',
    tafelUnten: (kosten: string) => `Tafelzeile unten (${kosten} €)`,
    tafelOben: (kosten: string) => `Tafelzeile oben (${kosten} €)`,
    tafelSpanne: 'Interpolierte Spanne',
    von: 'von',
    bis: 'bis',
    honorar: 'Honorar im Honorarsatz',
    phasenErgebnis: 'Leistungsphasen',
    spalten: { phase: 'Leistungsphase', anteil: 'Anteil', betrag: 'Betrag' },
    grundhonorar: 'Grundhonorar',
    umbauzuschlag: 'Umbauzuschlag',
    summen: 'Summen',
    summenZeilen: {
      grundhonorar: 'Grundhonorar',
      umbauzuschlaege: 'Umbauzuschläge',
      nebenkosten: 'Nebenkosten',
      netto: 'Netto',
      mwst: 'MwSt',
      brutto: 'Brutto',
    },
    pdf: 'Als PDF',
    pdfFehler: 'Das PDF ließ sich nicht erzeugen.',
    grid: 'Honorarobjekte',
  },
};
