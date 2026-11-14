// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte der Honorarseiten (Ticket 119, L1).

import type { Honorarobjekt, Honorarzone, Leistungsbild } from '@tethys/vertrag';

/**
 * Fester Hinweis (D-56, D-66): kein Befund, nicht Teil des `Honorarergebnis`. Derselbe Wortlaut wie im PDF
 * (`DIN276_HINWEIS` in `ausgabe`); ein Test hält beide gleich, damit das Hauptbündel `ausgabe` (pdfmake) nicht lädt.
 */
export const DIN276_HINWEIS =
  'Hinweis: § 4 Abs. 1 HOAI verweist für die anrechenbaren Kosten auf DIN 276 in der Fassung DIN 276:2008-12.';

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

/** Feste Texte der Befunde zur Kostenermittlung (D-110.4). */
export const BEFUNDTEXT = {
  'kostenermittlung-unbekannt':
    'Die gewählte Kostenermittlung gibt es im Projekt nicht (mehr). Für dieses Objekt entsteht kein Honorar.',
  'kostenberechnung-vorhanden':
    'Das Projekt hat eine Kostenberechnung; nach § 6 Abs. 1 Nr. 2 HOAI ist sie die Grundlage, nicht die Kostenschätzung.',
  'kostenermittlungsstufe-abweichend':
    'Grundlage der anrechenbaren Kosten ist nach § 6 Abs. 1 Nr. 2 HOAI die Kostenberechnung, ohne sie die Kostenschätzung. Die gewählte Kostenermittlung hat eine andere Stufe.',
} as const;

/** Die Felder, die der Ort eines Befunds nennt (`Befundort.feld`), mit ihrem Namen auf der Seite. */
export const FELD_TEXT: Readonly<Record<keyof Honorarobjekt | 'nebenkosten' | 'mwstSatz', string>> = {
  bezeichnung: 'Bezeichnung',
  leistungsbild: 'Leistungsbild',
  honorarzone: 'Honorarzone',
  honorarsatz: 'Honorarsatz',
  anrechenbareKosten: 'Anrechenbare Kosten',
  leistungsphasen: 'Leistungsphasen',
  umbauzuschlagssatz: 'Umbauzuschlag',
  nebenkosten: 'Nebenkosten',
  mwstSatz: 'MwSt-Satz',
};

const KEIN_HONORAR = 'Für dieses Objekt entsteht kein Honorar.';
const WIE_EINGEGEBEN = 'gerechnet wird wie eingegeben.';

/**
 * Texte der übrigen Befunde der Honorarberechnung (Ticket 122): Seite und PDF zeigen dieselben (D-122.1). Die Werte setzt
 * die Seite de-DE ein (N4); `null`: der Wert ist nicht bekannt, der Text kommt ohne ihn aus. Ein Befund zu einer Liste
 * (Leistungsphasen) oder zu mehreren Beträgen nennt nur das Feld; sein Ort trägt kein Element (Lesart des Vertrags).
 */
export const befundTexte = {
  keineHonorartafel: (leistungsbild: string | null): string =>
    `Für ${leistungsbild === null ? 'das gewählte Leistungsbild' : `das Leistungsbild ${leistungsbild}`} gibt es keine Honorartafel. ${KEIN_HONORAR}`,
  herleitungNichtAnwendbar: (leistungsbild: string | null): string =>
    `Anrechenbare Kosten aus einer Kostenermittlung (§ 33 HOAI) gibt es nur für Gebäude und Innenräume, nicht für ${leistungsbild ?? 'dieses Leistungsbild'}. ${KEIN_HONORAR}`,
  ausserhalbHonorartafel: (
    kosten: string | null,
    tafel: { readonly vorschrift: string; readonly von: string; readonly bis: string } | null,
  ): string =>
    `Die anrechenbaren Kosten${kosten === null ? '' : ` von ${kosten}`} liegen außerhalb der Honorartafel${tafel === null ? '' : ` (${tafel.vorschrift} HOAI, ${tafel.von} bis ${tafel.bis})`}. ${KEIN_HONORAR} Die Tafel wird nicht fortgeschrieben.`,
  honorarzoneUnbekannt: (
    zone: string | null,
    tafel: { readonly vorschrift: string; readonly zonen: string } | null,
  ): string =>
    `Die Honorartafel${tafel === null ? '' : ` (${tafel.vorschrift} HOAI)`} kennt ${zone === null ? 'die gewählte Honorarzone' : `die Honorarzone ${zone}`} nicht${tafel === null ? '' : `, nur ${tafel.zonen}`}. ${KEIN_HONORAR}`,
  leistungsphaseUnbekannt: (leistungsbild: string | null): string =>
    `Eine beauftragte Leistungsphase gibt es ${leistungsbild === null ? 'bei diesem Leistungsbild' : `bei ${leistungsbild}`} nicht; sie zählt nicht.`,
  leistungsphaseDoppelt: 'Eine Leistungsphase ist mehrfach beauftragt; sie zählt einmal.',
  anteilAbweichend: (vorschrift: string | null): string =>
    `Der Anteil einer beauftragten Leistungsphase weicht vom Prozentsatz der HOAI ab${vorschrift === null ? '' : ` (${vorschrift} HOAI)`}; gerechnet wird mit dem eingegebenen Anteil.`,
  honorarsatzAusserhalb: (satz: string | null): string =>
    `Der Honorarsatz${satz === null ? '' : ` von ${satz}`} liegt außerhalb von 0 % (Basishonorarsatz) bis 100 % (oberer Honorarsatz); gerechnet wird nach derselben Formel.`,
  umbauzuschlagUeberGrenze: (
    satz: string | null,
    grenze: { readonly satz: string; readonly vorschrift: string } | null,
  ): string =>
    `Der Umbauzuschlag${satz === null ? '' : ` von ${satz}`} liegt über ${grenze === null ? 'dem Satz der HOAI für durchschnittlichen Schwierigkeitsgrad' : `${grenze.satz} (${grenze.vorschrift} HOAI)`}; gerechnet wird mit dem eingegebenen Satz.`,
  negativ: {
    anrechenbareKosten: `Ein Betrag der anrechenbaren Kosten ist negativ; ${WIE_EINGEGEBEN}`,
    umbauzuschlag: (satz: string | null): string =>
      `Der Umbauzuschlag${satz === null ? '' : ` von ${satz}`} ist negativ; ${WIE_EINGEGEBEN}`,
    nebenkosten: (wert: string | null): string =>
      `Die Nebenkosten${wert === null ? '' : ` (${wert})`} sind negativ; ${WIE_EINGEGEBEN}`,
    mwstSatz: (satz: string | null): string =>
      `Der MwSt-Satz${satz === null ? '' : ` von ${satz}`} ist negativ; ${WIE_EINGEGEBEN}`,
    sonst: `Ein Wert ist negativ; ${WIE_EINGEGEBEN}`,
  },
  mehrereObjekte: (anzahl: number): string =>
    `${String(anzahl)} Honorarobjekte werden je für sich gerechnet und summiert (§ 11 Abs. 1 HOAI); Zusammenfassung und Wiederholungen nach § 11 Abs. 2 bis 4 sind nicht berücksichtigt.`,
  unbekannt: 'Die Honorarberechnung meldet einen Befund ohne eigenen Text.',
};

export const texte = {
  projekt: { honorar: 'Honorar' },
  // Ticket 155: Verweise zwischen Honorar und Kostenermittlung, beide Richtungen
  verweis: {
    zumHonorar: (name: string): string => `Zum Honorar „${name}“`,
    zurKostenermittlung: (name: string): string => `Zur Kostenermittlung „${name}“`,
  },
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
    kostenermittlung: 'Bitte eine Kostenermittlung des Projekts wählen.',
  },
  seite: {
    titel: (projekt: string) => `Honorar – ${projekt}`,
    laden: 'Honorarberechnungen werden geladen …',
    nichtGefunden: 'Projekt nicht gefunden',
    zumProjekt: 'Zum Projekt',
    liste: 'Honorarberechnungen des Projekts',
    leer: 'Noch keine Honorarberechnung. Für ein Honorar nach HOAI zuerst eine Honorarberechnung anlegen.',
    anlegenTitel: 'Honorarberechnung anlegen',
    name: 'Name',
    nameFehlt: 'Der Name fehlt.',
    anlegen: 'Honorarberechnung anlegen',
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
    phasenKopf: {
      beauftragt: 'Beauftragt',
      phase: 'Leistungsphase',
      standard: 'Satz der HOAI',
      anteil: 'Anteil (%)',
    },
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
    pdfFehler: 'Das PDF konnte nicht erzeugt werden.',
    grid: 'Honorarobjekte',
  },
};
