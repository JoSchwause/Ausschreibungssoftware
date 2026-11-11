// SPDX-License-Identifier: AGPL-3.0-or-later
// Rechnungsprüfung (Ticket 81, D-34 Schritt 4 bis 7, D-44): die Abzugskette einer Rechnung, jeder Schritt auf 2 Stellen
// gerundet und dann verrechnet (N2, N5, E-07), frühere Zahlbeträge eingefroren.

import {
  NULL_BETRAG,
  addiere,
  prozentVon,
  subtrahiere,
  summiereBetraege,
  vergleiche,
  vorzeichen,
} from '@tethys/dezimal';
import type {
  Aufmass,
  AufmassId,
  AuftragsLvZustand,
  Betrag,
  Leistungsstand,
  Prozent,
  Rechnung,
  RechnungId,
} from '@tethys/vertrag';
import { leistungsstandBerechnen } from './leistungsstand';
import type { Leistungsbefund } from './leistungsstand';

/** Eine Umlage der Rechnung mit ihrem Betrag round(Brutto kumuliert × Satz / 100, 2) (D-34 (5)). */
export interface Umlagebetrag {
  readonly bezeichnung: string;
  readonly satz: Prozent;
  readonly betrag: Betrag;
}

/** Eine frühere, freigegebene Rechnung mit ihrem eingefrorenen Zahlbetrag (D-34 (7)). */
export interface FruehereZahlung {
  readonly rechnungId: RechnungId;
  readonly nummer: number;
  readonly zahlbetrag: Betrag;
}

/**
 * Die Abzugskette (D-34): jede Zeile auf 2 Stellen gerundet.
 * - `leistung`, `nachlass`, `nettoNachNachlass`: aus dem Leistungsstand (Schritt 1 bis 3).
 * - `mwst` = round(Netto n. N. × MwSt-Satz des Auftrags-LV / 100, 2); `bruttoKumuliert` = Netto n. N. + MwSt (Schritt 4).
 * - `umlagen`: je Umlage der Rechnung, alle auf `bruttoKumuliert` (Schritt 5).
 * - `einbehalt`: Abschlag: Sicherheitseinbehalt, Schluss: Gewährleistungseinbehalt, round(Brutto kum. × Satz / 100, 2);
 *   Satz `null`: 0,00 (Schritt 6).
 * - `fruehereZahlbetraege` = Σ der eingefrorenen Zahlbeträge der früheren freigegebenen Rechnungen (`fruehere`).
 * - `zahlbetrag` = Brutto kum. − Σ Umlagen − Einbehalt − frühere Zahlbeträge; negativ ist Überzahlung (Schritt 7).
 */
export interface Abzugskette {
  readonly leistung: Betrag;
  readonly nachlass: Betrag;
  readonly nettoNachNachlass: Betrag;
  readonly mwst: Betrag;
  readonly bruttoKumuliert: Betrag;
  readonly umlagen: readonly Umlagebetrag[];
  readonly einbehalt: {
    readonly art: 'sicherheit' | 'gewaehrleistung';
    readonly satz: Prozent | null;
    readonly betrag: Betrag;
  };
  readonly fruehere: readonly FruehereZahlung[];
  readonly fruehereZahlbetraege: Betrag;
  readonly zahlbetrag: Betrag;
}

/**
 * Gefordert gegen geprüft (D-44): `differenz` = gefordert − geprüft. Nicht die Abweichung der Kostenkontrolle
 * (Vergabe − Budget, Glossar).
 */
export interface Forderungsdifferenz {
  readonly gefordert: Betrag;
  readonly geprueft: Betrag;
  readonly differenz: Betrag;
}

/**
 * Was die Rechnung fordert, gegen den geprüften Stand (D-44); je Wert `null`, wenn die Rechnung ihn nicht nennt. Netto
 * gegen `nettoNachNachlass`, Brutto gegen `bruttoKumuliert`, Zahlbetrag gegen `zahlbetrag` (kumuliert gelesen; ob die
 * Forderung kumuliert ist, sagt der Vertrag nicht, Offene Typfrage 8 zu Ticket 70).
 */
export interface Forderungsvergleich {
  readonly netto: Forderungsdifferenz | null;
  readonly brutto: Forderungsdifferenz | null;
  readonly zahlbetrag: Forderungsdifferenz | null;
}

/**
 * Ein Befund der Rechnungsprüfung (U5: keine Sperre), dazu die Befunde des Leistungsstands. Reihenfolge: Blätter
 * (`aufmass-unbekannt`, `aufmass-fehlt`), frühere Rechnungen (`fruehere-nicht-freigegeben`, `freigabe-reihenfolge`),
 * Leistungsstand, `schlussrechnung-nicht-letzte`, `gefordert-abweichend`, `ueberzahlung`, `freigabe-abweichend`; innerhalb
 * eines Codes nach Rechnungsnummer bzw. in der Reihenfolge der Kennungen.
 * - `aufmass-unbekannt`: Eine Kennung aus `aufmassIds` hat kein Blatt in `aufmasse`; sie zählt nichts.
 * - `aufmass-fehlt`: Ein Blatt einer früheren Rechnung fehlt in `aufmassIds` (kumuliert, D-34 (1)).
 * - `fruehere-nicht-freigegeben`: Eine frühere Rechnung ist nicht freigegeben; ihr Zahlbetrag fehlt in der Kette.
 * - `freigabe-reihenfolge`: Eine freigegebene Rechnung hat eine größere Nummer als offene Rechnungen (Invariante an
 *   `Rechnung`, Review D-42); `offen` nennt deren Nummern.
 * - `schlussrechnung-nicht-letzte`: Eine Schlussrechnung (diese oder eine frühere) ist nicht die mit der größten Nummer.
 * - `gefordert-abweichend`: Der geforderte Betrag weicht ab; verglichen wird der Zahlbetrag, sonst Brutto, sonst Netto (D-44).
 * - `ueberzahlung`: Der Zahlbetrag ist negativ (D-34 (7)).
 * - `freigabe-abweichend`: Die Rechnung ist freigegeben, ihr eingefrorener Zahlbetrag ist nicht der heute geprüfte (etwa
 *   nach einer Aufmaßkorrektur, D-38); gilt bleibt der eingefrorene.
 */
export type Rechnungsbefund =
  | Leistungsbefund
  | { readonly code: 'aufmass-unbekannt'; readonly aufmassId: AufmassId }
  | {
      readonly code: 'aufmass-fehlt';
      readonly aufmassId: AufmassId;
      readonly rechnungId: RechnungId;
      readonly nummer: number;
    }
  | { readonly code: 'fruehere-nicht-freigegeben'; readonly rechnungId: RechnungId; readonly nummer: number }
  | {
      readonly code: 'freigabe-reihenfolge';
      readonly rechnungId: RechnungId;
      readonly nummer: number;
      readonly offen: readonly number[];
    }
  | {
      readonly code: 'schlussrechnung-nicht-letzte';
      readonly rechnungId: RechnungId;
      readonly nummer: number;
    }
  | ({
      readonly code: 'gefordert-abweichend';
      readonly feld: 'zahlbetrag' | 'brutto' | 'netto';
    } & Forderungsdifferenz)
  | { readonly code: 'ueberzahlung'; readonly zahlbetrag: Betrag }
  | {
      readonly code: 'freigabe-abweichend';
      readonly eingefroren: Betrag;
      readonly geprueft: Betrag;
      /** eingefroren − geprüft */
      readonly differenz: Betrag;
    };

/** Das Prüfergebnis einer Rechnung; gerechnet, nie gespeichert (D-36 (2)). */
export interface Rechnungspruefung {
  readonly rechnungId: RechnungId;
  readonly leistungsstand: Leistungsstand;
  readonly kette: Abzugskette;
  /** `null`: Die Rechnung nennt keine Forderung (`gefordert: null`). */
  readonly forderung: Forderungsvergleich | null;
  readonly befunde: readonly Rechnungsbefund[];
}

/** Die Rechnungen desselben Auftrags-LV samt der geprüften (ihre Fassung gilt), nach Nummer. */
function rechnungenDesAuftrags(rechnung: Rechnung, rechnungen: readonly Rechnung[]): Rechnung[] {
  const andere = rechnungen.filter((r) => r.auftragsLvId === rechnung.auftragsLvId && r.id !== rechnung.id);
  return [...andere, rechnung].sort((a, b) => a.nummer - b.nummer);
}

/** Je Prozentsatz round(Basis × Satz / 100, 2) (N2); Satz `null`: 0,00. */
const anteil = (basis: Betrag, satz: Prozent | null): Betrag =>
  satz === null ? NULL_BETRAG : prozentVon(basis, satz);

function forderungsdifferenz(gefordert: Betrag | null, geprueft: Betrag): Forderungsdifferenz | null {
  return gefordert === null ? null : { gefordert, geprueft, differenz: subtrahiere(gefordert, geprueft) };
}

/** Freigabe-Invariante (D-34 (7), Review D-42): je freigegebener Rechnung die offenen mit kleinerer Nummer. */
function reihenfolgeBefunde(alle: readonly Rechnung[]): Rechnungsbefund[] {
  const aus: Rechnungsbefund[] = [];
  for (const f of alle) {
    if (f.freigabe === null) continue;
    const offen = alle.filter((r) => r.freigabe === null && r.nummer < f.nummer).map((r) => r.nummer);
    if (offen.length > 0)
      aus.push({ code: 'freigabe-reihenfolge', rechnungId: f.id, nummer: f.nummer, offen });
  }
  return aus;
}

/**
 * Prüft eine Rechnung (D-34). `aufmasse`: die Blätter des Auftrags-LV (gezählt werden die aus `rechnung.aufmassIds`);
 * `rechnungen`: die übrigen Rechnungen des Auftrags-LV (die Liste aus `RechnungRepository.auflisten` darf die geprüfte
 * selbst enthalten; Rechnungen anderer Auftrags-LV zählen nicht). Frühere sind die mit kleinerer Nummer; ihre Zahlbeträge
 * sind die gespeicherten `freigabe.zahlbetrag`, nie neu gerechnet (eingefroren, D-34 (7)). Jeder Schritt der Kette auf 2
 * Stellen gerundet, dann verrechnet (N2, N5, E-07).
 */
export function rechnungPruefen(
  rechnung: Rechnung,
  auftragsLv: AuftragsLvZustand,
  aufmasse: readonly Aufmass[],
  rechnungen: readonly Rechnung[],
): Rechnungspruefung {
  const befunde: Rechnungsbefund[] = [];
  const blaetter = new Map<string, Aufmass>(aufmasse.map((a) => [a.id, a]));
  const gezaehlt: Aufmass[] = [];
  for (const id of rechnung.aufmassIds) {
    const b = blaetter.get(id);
    if (b === undefined) befunde.push({ code: 'aufmass-unbekannt', aufmassId: id });
    else gezaehlt.push(b);
  }

  const alle = rechnungenDesAuftrags(rechnung, rechnungen);
  const fruehereRechnungen = alle.filter((r) => r.nummer < rechnung.nummer);
  const drin = new Set<string>(rechnung.aufmassIds);
  for (const r of fruehereRechnungen)
    for (const id of r.aufmassIds)
      if (!drin.has(id))
        befunde.push({ code: 'aufmass-fehlt', aufmassId: id, rechnungId: r.id, nummer: r.nummer });
  const fruehere: FruehereZahlung[] = [];
  for (const r of fruehereRechnungen) {
    if (r.freigabe === null)
      befunde.push({ code: 'fruehere-nicht-freigegeben', rechnungId: r.id, nummer: r.nummer });
    else fruehere.push({ rechnungId: r.id, nummer: r.nummer, zahlbetrag: r.freigabe.zahlbetrag });
  }
  befunde.push(...reihenfolgeBefunde(alle));

  // (1) bis (3): Leistung, Nachlass, Netto nach Nachlass.
  const { leistungsstand, befunde: leistungsbefunde } = leistungsstandBerechnen(
    auftragsLv,
    gezaehlt,
    rechnung.art,
  );
  befunde.push(...leistungsbefunde);
  // (4) MwSt auf das Netto nach Nachlass, Brutto kumuliert.
  const { nettoNachNachlass } = leistungsstand;
  const mwst = prozentVon(nettoNachNachlass, auftragsLv.auftragsLeistungsverzeichnis.mwstSatz);
  const bruttoKumuliert = addiere(nettoNachNachlass, mwst);
  // (5) Umlagen, alle auf dieselbe Basis.
  const umlagen = rechnung.umlagen.map((u): Umlagebetrag => ({
    bezeichnung: u.bezeichnung,
    satz: u.satz,
    betrag: prozentVon(bruttoKumuliert, u.satz),
  }));
  // (6) Einbehalt: Abschlag Sicherheit, Schluss Gewährleistung.
  const einbehalt =
    rechnung.art === 'schluss'
      ? {
          art: 'gewaehrleistung' as const,
          satz: rechnung.gewaehrleistungSatz,
          betrag: anteil(bruttoKumuliert, rechnung.gewaehrleistungSatz),
        }
      : {
          art: 'sicherheit' as const,
          satz: rechnung.sicherheitSatz,
          betrag: anteil(bruttoKumuliert, rechnung.sicherheitSatz),
        };
  // (7) Zahlbetrag nach Abzug der eingefrorenen früheren Zahlbeträge.
  const fruehereZahlbetraege = summiereBetraege(fruehere.map((f) => f.zahlbetrag));
  const abzuege = summiereBetraege([...umlagen.map((u) => u.betrag), einbehalt.betrag, fruehereZahlbetraege]);
  const zahlbetrag = subtrahiere(bruttoKumuliert, abzuege);
  const kette: Abzugskette = {
    leistung: leistungsstand.leistung,
    nachlass: leistungsstand.nachlass,
    nettoNachNachlass,
    mwst,
    bruttoKumuliert,
    umlagen,
    einbehalt,
    fruehere,
    fruehereZahlbetraege,
    zahlbetrag,
  };

  for (const r of alle)
    if (r.art === 'schluss' && r.nummer < (alle.at(-1)?.nummer ?? r.nummer))
      befunde.push({ code: 'schlussrechnung-nicht-letzte', rechnungId: r.id, nummer: r.nummer });

  const g = rechnung.gefordert;
  const forderung: Forderungsvergleich | null =
    g === null
      ? null
      : {
          netto: forderungsdifferenz(g.netto, nettoNachNachlass),
          brutto: forderungsdifferenz(g.brutto, bruttoKumuliert),
          zahlbetrag: forderungsdifferenz(g.zahlbetrag, zahlbetrag),
        };
  if (forderung !== null) {
    const feld = (['zahlbetrag', 'brutto', 'netto'] as const).find((f) => forderung[f] !== null);
    const a = feld === undefined ? null : forderung[feld];
    if (feld !== undefined && a !== null && vorzeichen(a.differenz) !== 0)
      befunde.push({ code: 'gefordert-abweichend', feld, ...a });
  }
  if (vorzeichen(zahlbetrag) < 0) befunde.push({ code: 'ueberzahlung', zahlbetrag });
  const eingefroren = rechnung.freigabe?.zahlbetrag ?? null;
  if (eingefroren !== null && vergleiche(eingefroren, zahlbetrag) !== 0)
    befunde.push({
      code: 'freigabe-abweichend',
      eingefroren,
      geprueft: zahlbetrag,
      differenz: subtrahiere(eingefroren, zahlbetrag),
    });

  return { rechnungId: rechnung.id, leistungsstand, kette, forderung, befunde };
}

/** Warum eine Rechnung nicht freigegeben werden kann (D-34 (7), D-70.4). */
export type Freigabehindernis =
  | { readonly code: 'schon-freigegeben' }
  | { readonly code: 'fruehere-offen'; readonly nummern: readonly number[] };

/**
 * Darf die Rechnung jetzt freigegeben werden? Nur, wenn sie nicht freigegeben ist und alle früheren Rechnungen desselben
 * Auftrags-LV (kleinere Nummer) freigegeben sind. Die App fragt das vor `RechnungFreigeben`; `speicher` hält dieselbe Regel
 * als `konflikt`. `rechnungen` darf die Rechnung selbst und Rechnungen anderer Auftrags-LV enthalten.
 */
export function freigabeMoeglich(
  rechnung: Rechnung,
  rechnungen: readonly Rechnung[],
): { readonly moeglich: boolean; readonly hindernisse: readonly Freigabehindernis[] } {
  const hindernisse: Freigabehindernis[] = [];
  if (rechnung.freigabe !== null) hindernisse.push({ code: 'schon-freigegeben' });
  const offen = rechnungenDesAuftrags(rechnung, rechnungen)
    .filter((r) => r.nummer < rechnung.nummer && r.freigabe === null)
    .map((r) => r.nummer);
  if (offen.length > 0) hindernisse.push({ code: 'fruehere-offen', nummern: offen });
  return { moeglich: hindernisse.length === 0, hindernisse };
}
