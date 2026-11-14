// SPDX-License-Identifier: AGPL-3.0-or-later
// Zahlungsstand einer Rechnung (Ticket 143; vertrag v1.7b, D-72, D-128.4, D-128.5, D-128.8, D-93): der Teil der Prüfung nach
// dem Zahlbetrag. Zahlbetrag → Skonto → Bauabzugsteuer → Auszahlung → Zahlungen → offen; jeder Betrag auf 2 Stellen gerundet,
// dann verrechnet (N2, E-07). Skonto und Bauabzugsteuer sind Erfüllung, keine Kürzung der Forderung: Sie wirken nie auf eine
// spätere Rechnung (die liest nur den eingefrorenen Zahlbetrag).
//
// Lesarten:
// - Basis ist der eingefrorene Zahlbetrag, sobald die Rechnung freigegeben ist, sonst der geprüfte (Vorschau; D-128.8). Die
//   Prüfung übergibt ihn (`rechnungPruefen`).
// - Möglicher Skonto round(Zahlbetrag × Satz / 100, 2), 0,00 bei Zahlbetrag ≤ 0,00 oder ohne Fristende (kein Eingang: Befund).
// - Bauabzugsteuer je Auszahlungsszenario round((Zahlbetrag − Skonto des Szenarios) × 15 / 100, 2), 0,00 bei einer Basis ≤ 0,00 (D-93).
// - Verwirklicht: möglicher Skonto > 0,00 und Σ Zahlungen mit Datum ≤ Fristende ≥ Auszahlung mit Skonto.
// - Fristende = Eingang + Frist in Kalendertagen; der Eingangstag zählt nicht, keine Verschiebung auf Werktage. Gerechnet
//   ohne `Date` (A2), wie `datumFehler` in `form.ts`. Ein Eingang, der kein Tag ist, gilt wie kein Eingang (der Ausführer
//   lässt ihn nicht zu).

import {
  NULL_BETRAG,
  prozentVon,
  subtrahiere,
  summiereBetraege,
  vergleiche,
  vorzeichen,
} from '@tethys/dezimal';
import { BAUABZUGSTEUER_SATZ } from '@tethys/vertrag';
import type {
  AuftragsLeistungsverzeichnisId,
  Auszahlungsszenario,
  Betrag,
  Kalenderdatum,
  Rechnung,
  Vertragsstrafe,
  Zahlungsbefund,
  Zahlungsstand,
} from '@tethys/vertrag';
import { datumFehler, tageImMonat } from './form';

const zweistellig = (n: number): string => String(n).padStart(2, '0');

/**
 * `datum` (JJJJ-MM-TT, ein Tag, den es gibt) plus `tage` Kalendertage (ganze Zahl ≥ 0), monatsweise gezählt. `null`, wenn
 * `datum` kein Tag ist oder das Ergebnis hinter das Jahr 9999 fiele.
 */
export function plusKalendertage(datum: string, tage: number): Kalenderdatum | null {
  if (datumFehler(datum) !== null || !Number.isSafeInteger(tage) || tage < 0) return null;
  let [j, m, t] = datum.split('-').map(Number) as [number, number, number];
  let rest = tage;
  while (rest > 0) {
    const bisMonatsende = tageImMonat(j, m) - t;
    if (rest <= bisMonatsende) {
      t += rest;
      rest = 0;
    } else {
      rest -= bisMonatsende + 1;
      t = 1;
      m += 1;
      if (m > 12) {
        m = 1;
        j += 1;
      }
    }
  }
  if (j > 9999) return null;
  return `${String(j).padStart(4, '0')}-${zweistellig(m)}-${zweistellig(t)}` as Kalenderdatum;
}

/** Ein Auszahlungsszenario: Skonto, Bauabzugsteuer (0,00 bei Basis ≤ 0,00 oder ausgeschaltet), Auszahlung. */
function auszahlungsszenario(zahlbetrag: Betrag, skonto: Betrag, mitSteuer: boolean): Auszahlungsszenario {
  const basis = subtrahiere(zahlbetrag, skonto);
  const bauabzugsteuer =
    mitSteuer && vorzeichen(basis) > 0 ? prozentVon(basis, BAUABZUGSTEUER_SATZ) : NULL_BETRAG;
  return { skonto, bauabzugsteuer, auszahlung: subtrahiere(basis, bauabzugsteuer) };
}

/**
 * Der Zahlungsstand einer Rechnung zum Zahlbetrag `zahlbetrag` (der eingefrorene, sobald freigegeben, sonst der geprüfte)
 * und seine Befunde in der Reihenfolge von D-128.8 (`skonto-ohne-eingang`, `zahlungen-ueber-auszahlung`). Rein (A2).
 */
export function zahlungsstandBerechnen(
  rechnung: Rechnung,
  zahlbetrag: Betrag,
): { readonly zahlungsstand: Zahlungsstand; readonly befunde: readonly Zahlungsbefund[] } {
  const befunde: Zahlungsbefund[] = [];
  const { skonto, eingang } = rechnung;
  const fristende =
    skonto === undefined || eingang === null ? null : plusKalendertage(eingang, skonto.fristTage);
  if (skonto !== undefined && fristende === null) befunde.push({ code: 'skonto-ohne-eingang' });
  const moeglich =
    skonto !== undefined && fristende !== null && vorzeichen(zahlbetrag) > 0
      ? prozentVon(zahlbetrag, skonto.satz)
      : NULL_BETRAG;
  const steuer = rechnung.bauabzugsteuer === true;
  const mitSkonto = auszahlungsszenario(zahlbetrag, moeglich, steuer);
  const ohneSkonto = auszahlungsszenario(zahlbetrag, NULL_BETRAG, steuer);
  const zahlungen = rechnung.zahlungen ?? [];
  const summeZahlungen = summiereBetraege(zahlungen.map((z) => z.betrag));
  const bisFristende = summiereBetraege(
    zahlungen.filter((z) => fristende !== null && z.datum <= fristende).map((z) => z.betrag),
  );
  const skontoVerwirklicht = vorzeichen(moeglich) > 0 && vergleiche(bisFristende, mitSkonto.auszahlung) >= 0;
  const geltendes = skontoVerwirklicht ? mitSkonto : ohneSkonto;
  const offen = subtrahiere(geltendes.auszahlung, summeZahlungen);
  if (zahlungen.length > 0 && vorzeichen(offen) < 0)
    befunde.push({ code: 'zahlungen-ueber-auszahlung', offen });
  return {
    zahlungsstand: {
      zahlbetrag,
      fristende,
      mitSkonto,
      ohneSkonto,
      skontoVerwirklicht,
      verwirklichterSkonto: geltendes.skonto,
      bauabzugsteuer: geltendes.bauabzugsteuer,
      auszahlung: geltendes.auszahlung,
      summeZahlungen,
      offen,
    },
    befunde,
  };
}

/**
 * Vorschlag der Vertragsstrafe für eine neue Rechnung (D-72, D-128.3): die kumulierte Vertragsstrafe der vorigen Rechnung
 * desselben Auftrags-LV (größte Nummer kleiner `nummer`), wie die App die Einbehaltssätze vorschlägt; `null`: keine vorige
 * oder sie hat keine. Die App trägt den Vorschlag in `RechnungAnlegen.rechnung` ein.
 */
export function vertragsstrafeVorschlag(
  rechnungen: readonly Rechnung[],
  auftragsLvId: AuftragsLeistungsverzeichnisId,
  nummer: number,
): Vertragsstrafe | null {
  let vorige: Rechnung | undefined;
  for (const r of rechnungen)
    if (
      r.auftragsLvId === auftragsLvId &&
      r.nummer < nummer &&
      (vorige === undefined || r.nummer > vorige.nummer)
    )
      vorige = r;
  return vorige?.vertragsstrafe ?? null;
}
