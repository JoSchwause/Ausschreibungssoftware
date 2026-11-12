// SPDX-License-Identifier: AGPL-3.0-or-later
// Honorarberechnung nach HOAI 2021 (Ticket 101, D-56): je Honorarobjekt anrechenbare Kosten, Honorarspanne (§ 13),
// Honorar im Honorarsatz, Beträge der beauftragten Leistungsphasen, Grundhonorar und Umbauzuschlag; gesamt Nebenkosten
// (§ 14), Netto, MwSt (Umsatzsteuer nach § 16 Abs. 1) und Brutto. Auffälligkeiten sind Befunde, nie Sperre (U5).
// Eigene Eingabe- und Ergebnistypen, bis Ticket 97 die Vertragstypen bringt (Umstellung in Ticket 110).
// Rein (A2), nur Dezimalarithmetik (N1).

import {
  NULL_BETRAG,
  NULL_PROZENT,
  addiere,
  prozentVon,
  summiereBetraege,
  vergleiche,
  vorzeichen,
} from '@tethys/dezimal';
import type { Befundschwere, Betrag, Prozent } from '@tethys/vertrag';
import type { AnrechenbareKostenangabe, AnrechenbareKostenHerleitung } from './anrechenbare-kosten';
import { anrechenbareKostenHerleiten } from './anrechenbare-kosten';
import type { Honorarzone } from './honorartafeln';
import type { Tafelinterpolation } from './honorarspanne';
import { honorarInSpanne, honorarspanneBerechnen } from './honorarspanne';
import { HUNDERT } from './konstanten';
import type {
  Leistungsbild,
  Leistungsbilddaten,
  Leistungsphase,
  Leistungsphasennummer,
} from './leistungsbilder';
import { LEISTUNGSBILDER } from './leistungsbilder';

// --- Eingabe -----------------------------------------------------------------------------------------------------

/** Eine beauftragte Leistungsphase (§ 8 Abs. 1). */
export interface BeauftragteLeistungsphase {
  readonly nummer: Leistungsphasennummer;
  /**
   * Abweichender Anteil in Prozent des Honorars, etwa nach § 8 Abs. 2 (nicht alle Grundleistungen der Phase), § 51
   * Abs. 2 bis 4 oder § 55 Abs. 2; fehlt er, gilt der Prozentsatz der HOAI. Eine Abweichung ist ein Befund.
   */
  readonly anteil?: Prozent;
}

/** Ein Objekt (§ 2 Abs. 1), dessen Honorar für sich berechnet wird (§ 11 Abs. 1). */
export interface Honorarobjekt {
  readonly bezeichnung: string;
  readonly leistungsbild: Leistungsbild;
  readonly honorarzone: Honorarzone;
  /** Lage in der Honorarspanne in Prozent: 0 = Basishonorarsatz (Standard nach § 7 Abs. 1), 100 = oberer Honorarsatz. */
  readonly honorarsatz: Prozent;
  readonly anrechenbareKosten: AnrechenbareKostenangabe;
  readonly leistungsphasen: readonly BeauftragteLeistungsphase[];
  /** Umbauzuschlag in Prozent des Grundhonorars (§ 6 Abs. 2, § 36); `null`: kein Zuschlag. */
  readonly umbauzuschlagssatz: Prozent | null;
}

/** Nebenkosten nach § 14: in Prozent von Grundhonorar plus Umbauzuschlägen oder als Betrag. */
export type Nebenkostenangabe =
  { readonly art: 'prozent'; readonly satz: Prozent } | { readonly art: 'betrag'; readonly betrag: Betrag };

export interface Honorarberechnung {
  readonly objekte: readonly Honorarobjekt[];
  /** `null`: keine Nebenkosten. */
  readonly nebenkosten: Nebenkostenangabe | null;
  /** MwSt-Satz (Umsatzsteuer nach § 16 Abs. 1) auf das Netto aus Honorar und Nebenkosten. */
  readonly mwstSatz: Prozent;
}

// --- Ergebnis ----------------------------------------------------------------------------------------------------

export interface Phasenbetrag {
  readonly nummer: Leistungsphasennummer;
  readonly name: string;
  /** Der angesetzte Anteil: der Prozentsatz der HOAI oder der abweichende Anteil der Eingabe. */
  readonly anteil: Prozent;
  /** round(Honorar × Anteil / 100, 2). */
  readonly betrag: Betrag;
}

export interface Objektergebnis {
  readonly bezeichnung: string;
  readonly leistungsbild: Leistungsbild;
  readonly honorarzone: Honorarzone;
  /** `null`, wenn sie sich nicht bestimmen lassen (Befund). */
  readonly anrechenbareKosten: Betrag | null;
  /** Herleitung nach § 33; `null` bei anrechenbaren Kosten von Hand. */
  readonly herleitung: AnrechenbareKostenHerleitung | null;
  /** Tafelzeilen unten und oben und die interpolierte Honorarspanne; `null`: kein Honorar für das Objekt (Befund). */
  readonly tafel: Tafelinterpolation | null;
  /** Honorar im Honorarsatz, bezogen auf alle Leistungsphasen (100 %); `null` ohne Tafelwert. */
  readonly honorar: Betrag | null;
  /** Die angesetzten Leistungsphasen nach Nummer; leer ohne Honorar. */
  readonly phasen: readonly Phasenbetrag[];
  /** Summe der Phasenbeträge; 0,00 ohne Honorar. */
  readonly grundhonorar: Betrag;
  /** round(Grundhonorar × Umbauzuschlagssatz / 100, 2); 0,00 ohne Satz. */
  readonly umbauzuschlag: Betrag;
}

export type Honorarbefundcode =
  | 'keine-honorartafel' // fehler: Leistungsbild ohne Honorartafel, kein Honorar
  | 'herleitung-nicht-anwendbar' // fehler: § 33 gilt nur für Gebäude und Innenräume, kein Honorar
  | 'ausserhalb-honorartafel' // fehler: unter der ersten oder über der letzten Tafelzeile, kein Honorar (RifT später)
  | 'honorarzone-unbekannt' // fehler: die Tafel hat diese Honorarzone nicht, kein Honorar
  | 'leistungsphase-unbekannt' // fehler: das Leistungsbild hat diese Leistungsphase nicht; sie zählt nicht
  | 'leistungsphase-doppelt' // fehler: mehrfach beauftragt; sie zählt einmal
  | 'anteil-abweichend' // warnung: Anteil einer Leistungsphase weicht vom Prozentsatz der HOAI ab
  | 'honorarsatz-ausserhalb-spanne' // warnung: Honorarsatz unter 0 oder über 100; gerechnet nach derselben Formel
  | 'umbauzuschlag-ueber-grenze' // warnung: über 33 % bzw. 50 % (§ 36, § 52 Abs. 4, § 56 Abs. 5)
  | 'wert-negativ' // warnung: negativer Betrag oder Satz; gerechnet wie eingegeben
  | 'mehrere-objekte'; // warnung: je Objekt getrennt gerechnet, § 11 Abs. 2 bis 4 nicht berücksichtigt

export interface Honorarbefund {
  readonly code: Honorarbefundcode;
  /** `fehler`: ein Teil der Eingabe geht nicht in die Rechnung ein; `warnung`: gerechnet, aber auffällig. */
  readonly schwere: Befundschwere;
  /** Index des Honorarobjekts in der Eingabe; `null` bei Befunden über die ganze Berechnung. */
  readonly objekt: number | null;
  /** Meldung für Entwickler und Protokoll; die deutsche Anzeige entsteht in der Oberfläche. */
  readonly meldung: string;
}

export interface Honorarergebnis {
  /** In der Reihenfolge der Eingabe. */
  readonly objekte: readonly Objektergebnis[];
  /** Summe der Grundhonorare der Objekte. */
  readonly grundhonorar: Betrag;
  /** Summe der Umbauzuschläge der Objekte. */
  readonly umbauzuschlaege: Betrag;
  readonly nebenkosten: Betrag;
  /** Grundhonorar + Umbauzuschläge + Nebenkosten. */
  readonly netto: Betrag;
  /** round(Netto × MwSt-Satz / 100, 2) (§ 16 Abs. 1). */
  readonly mwst: Betrag;
  readonly brutto: Betrag;
  /** Erst die Befunde je Objekt in Eingabereihenfolge, je Objekt in der Folge der Rechnung, dann die übrigen. */
  readonly befunde: readonly Honorarbefund[];
}

// --- Rechnen -----------------------------------------------------------------------------------------------------

type Befundgeber = (code: Honorarbefundcode, schwere: Befundschwere, meldung: string) => void;

/** Die Daten des Leistungsbilds; `undefined` für einen Wert, den es nicht gibt (ungeprüfte Eingabe). */
function datenZu(leistungsbild: string): Leistungsbilddaten | undefined {
  return Object.hasOwn(LEISTUNGSBILDER, leistungsbild)
    ? LEISTUNGSBILDER[leistungsbild as Leistungsbild]
    : undefined;
}

function negativPruefen(werte: Readonly<Record<string, Betrag | Prozent>>, befund: Befundgeber): void {
  for (const [feld, wert] of Object.entries(werte))
    if (vorzeichen(wert) < 0) befund('wert-negativ', 'warnung', `${feld} ist negativ: ${wert}`);
}

interface Kosten {
  readonly anrechenbareKosten: Betrag | null;
  readonly herleitung: AnrechenbareKostenHerleitung | null;
}

function kostenErmitteln(
  angabe: AnrechenbareKostenangabe,
  daten: Leistungsbilddaten,
  befund: Befundgeber,
): Kosten {
  if (angabe.art === 'von-hand') return { anrechenbareKosten: angabe.betrag, herleitung: null };
  if (!daten.kostenNachDin276) {
    befund(
      'herleitung-nicht-anwendbar',
      'fehler',
      `Anrechenbare Kosten nach § 33 nur für Gebäude und Innenräume, nicht für ${daten.bezeichnung}; kein Honorar`,
    );
    return { anrechenbareKosten: null, herleitung: null };
  }
  negativPruefen(
    {
      kg300: angabe.kg300,
      kg400: angabe.kg400,
      weitereKosten: angabe.weitereKosten,
      mitzuverarbeitendeBausubstanz: angabe.mitzuverarbeitendeBausubstanz,
    },
    befund,
  );
  const herleitung = anrechenbareKostenHerleiten(angabe);
  return { anrechenbareKosten: herleitung.anrechenbareKosten, herleitung };
}

function tafelErmitteln(
  objekt: Honorarobjekt,
  anrechenbareKosten: Betrag,
  daten: Leistungsbilddaten,
  befund: Befundgeber,
): Tafelinterpolation | null {
  const tafel = daten.honorartafel;
  const e = honorarspanneBerechnen(tafel, objekt.honorarzone, anrechenbareKosten);
  if (e.ok) return e.wert;
  const erste = tafel.zeilen[0]?.anrechenbareKosten ?? '';
  const letzte = tafel.zeilen[tafel.zeilen.length - 1]?.anrechenbareKosten ?? '';
  befund(
    e.fehler,
    'fehler',
    e.fehler === 'ausserhalb-honorartafel'
      ? `Anrechenbare Kosten ${anrechenbareKosten} außerhalb der Honorartafel ${tafel.quelle.vorschrift} ` +
          `(${erste} bis ${letzte}); kein Honorar, keine Extrapolation`
      : `Honorarzone ${objekt.honorarzone} nicht in der Honorartafel ${tafel.quelle.vorschrift} ` +
          `(${tafel.honorarzonen.join(', ')}); kein Honorar`,
  );
  return null;
}

interface AngesetztePhase {
  readonly phase: Leistungsphase;
  readonly anteil: Prozent;
}

/** Die beauftragten Leistungsphasen, die das Leistungsbild kennt, je einmal, nach Nummer. */
function phasenAnsetzen(
  objekt: Honorarobjekt,
  daten: Leistungsbilddaten,
  befund: Befundgeber,
): AngesetztePhase[] {
  const angesetzt = new Map<Leistungsphasennummer, AngesetztePhase>();
  for (const beauftragt of objekt.leistungsphasen) {
    const n = String(beauftragt.nummer);
    const phase = daten.leistungsphasen.find((ph) => ph.nummer === beauftragt.nummer);
    if (phase === undefined) {
      befund(
        'leistungsphase-unbekannt',
        'fehler',
        `Leistungsphase ${n} gibt es bei ${daten.bezeichnung} nicht; sie zählt nicht`,
      );
      continue;
    }
    if (angesetzt.has(phase.nummer)) {
      befund(
        'leistungsphase-doppelt',
        'fehler',
        `Leistungsphase ${n} ist mehrfach beauftragt; sie zählt einmal`,
      );
      continue;
    }
    const anteil = beauftragt.anteil ?? phase.anteil;
    if (vergleiche(anteil, phase.anteil) !== 0)
      befund(
        'anteil-abweichend',
        'warnung',
        `Leistungsphase ${n}: Anteil ${anteil} statt ${phase.anteil} nach ${daten.quelleLeistungsphasen.vorschrift}`,
      );
    angesetzt.set(phase.nummer, { phase, anteil });
  }
  return [...angesetzt.values()].sort((a, c) => a.phase.nummer - c.phase.nummer);
}

function saetzePruefen(objekt: Honorarobjekt, daten: Leistungsbilddaten, befund: Befundgeber): void {
  if (vergleiche(objekt.honorarsatz, NULL_PROZENT) < 0 || vergleiche(objekt.honorarsatz, HUNDERT) > 0)
    befund(
      'honorarsatz-ausserhalb-spanne',
      'warnung',
      `Honorarsatz ${objekt.honorarsatz} liegt außerhalb von 0 (Basishonorarsatz) bis 100 (oberer Honorarsatz)`,
    );
  const satz = objekt.umbauzuschlagssatz;
  if (satz === null) return;
  negativPruefen({ umbauzuschlagssatz: satz }, befund);
  if (vergleiche(satz, daten.umbauzuschlagBis) > 0)
    befund(
      'umbauzuschlag-ueber-grenze',
      'warnung',
      `Umbauzuschlag ${satz} % über ${daten.umbauzuschlagBis} % (${daten.quelleUmbauzuschlag.vorschrift})`,
    );
}

function objektBerechnen(objekt: Honorarobjekt, index: number, befunde: Honorarbefund[]): Objektergebnis {
  const befund: Befundgeber = (code, schwere, meldung) => {
    befunde.push({ code, schwere, objekt: index, meldung });
  };
  const ohneHonorar = (kosten: Kosten): Objektergebnis => ({
    bezeichnung: objekt.bezeichnung,
    leistungsbild: objekt.leistungsbild,
    honorarzone: objekt.honorarzone,
    ...kosten,
    tafel: null,
    honorar: null,
    phasen: [],
    grundhonorar: NULL_BETRAG,
    umbauzuschlag: NULL_BETRAG,
  });

  const daten = datenZu(objekt.leistungsbild);
  if (daten === undefined) {
    befund(
      'keine-honorartafel',
      'fehler',
      `Leistungsbild ${JSON.stringify(objekt.leistungsbild)} hat keine Honorartafel; kein Honorar`,
    );
    return ohneHonorar({ anrechenbareKosten: null, herleitung: null });
  }
  // Befunde in der Folge der Rechnung, auch wenn das Objekt am Ende kein Honorar hat.
  const kosten = kostenErmitteln(objekt.anrechenbareKosten, daten, befund);
  const tafel =
    kosten.anrechenbareKosten === null
      ? null
      : tafelErmitteln(objekt, kosten.anrechenbareKosten, daten, befund);
  const angesetzt = phasenAnsetzen(objekt, daten, befund);
  saetzePruefen(objekt, daten, befund);
  if (tafel === null) return ohneHonorar(kosten);

  const honorar = honorarInSpanne(tafel.spanne, objekt.honorarsatz);
  const phasen = angesetzt.map(({ phase, anteil }): Phasenbetrag => ({
    nummer: phase.nummer,
    name: phase.name,
    anteil,
    betrag: prozentVon(honorar, anteil),
  }));
  const grundhonorar = summiereBetraege(phasen.map((ph) => ph.betrag));
  return {
    bezeichnung: objekt.bezeichnung,
    leistungsbild: objekt.leistungsbild,
    honorarzone: objekt.honorarzone,
    ...kosten,
    tafel,
    honorar,
    phasen,
    grundhonorar,
    umbauzuschlag:
      objekt.umbauzuschlagssatz === null ? NULL_BETRAG : prozentVon(grundhonorar, objekt.umbauzuschlagssatz),
  };
}

/** Honorarberechnung nach HOAI 2021 mit der Rundungskette aus D-56. */
export function honorarBerechnen(berechnung: Honorarberechnung): Honorarergebnis {
  const befunde: Honorarbefund[] = [];
  const objekte = berechnung.objekte.map((objekt, index) => objektBerechnen(objekt, index, befunde));
  const gesamt: Befundgeber = (code, schwere, meldung) => {
    befunde.push({ code, schwere, objekt: null, meldung });
  };
  if (objekte.length > 1)
    gesamt(
      'mehrere-objekte',
      'warnung',
      `${String(objekte.length)} Honorarobjekte je für sich gerechnet und summiert (§ 11 Abs. 1); ` +
        'Zusammenfassung und Wiederholungen nach § 11 Abs. 2 bis 4 sind nicht berücksichtigt',
    );
  const grundhonorar = summiereBetraege(objekte.map((o) => o.grundhonorar));
  const umbauzuschlaege = summiereBetraege(objekte.map((o) => o.umbauzuschlag));
  const angabe = berechnung.nebenkosten;
  let nebenkosten = NULL_BETRAG;
  if (angabe?.art === 'prozent') {
    negativPruefen({ nebenkostensatz: angabe.satz }, gesamt);
    nebenkosten = prozentVon(addiere(grundhonorar, umbauzuschlaege), angabe.satz);
  } else if (angabe?.art === 'betrag') {
    negativPruefen({ nebenkosten: angabe.betrag }, gesamt);
    nebenkosten = angabe.betrag;
  }
  negativPruefen({ mwstSatz: berechnung.mwstSatz }, gesamt);
  const netto = summiereBetraege([grundhonorar, umbauzuschlaege, nebenkosten]);
  const mwst = prozentVon(netto, berechnung.mwstSatz);
  return {
    objekte,
    grundhonorar,
    umbauzuschlaege,
    nebenkosten,
    netto,
    mwst,
    brutto: addiere(netto, mwst),
    befunde,
  };
}
