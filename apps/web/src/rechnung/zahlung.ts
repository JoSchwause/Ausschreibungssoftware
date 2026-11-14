// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 152 (A5, D-72): eine Zahlung im Formular (Datum `TT.MM.JJJJ`, Betrag de-DE) und der Befehl daraus. de-DE nur hier am
// Rand (N4); ein unlesbares Feld verwirft nichts, die Meldung steht am Feld (U5). Zahlungen gibt es nur an einer
// freigegebenen Rechnung (D-128.7); das prüft die Prüfansicht vor dem Öffnen, der Ausführer ohnehin.

import { vorzeichen } from '@tethys/dezimal';
import type {
  Betrag,
  Ergebnis,
  Kalenderdatum,
  Zahlung,
  ZahlungAendern,
  ZahlungErfassen,
  ZahlungId,
} from '@tethys/vertrag';
import { datumDe, datumLesen } from '../lv/kopfdaten';
import { formatiereBetragDe, zahlLesen } from '../lv/zahlen';
import type { Feldfehler } from './entwurf';
import { texte } from './texte';

export interface Zahlungsentwurf {
  readonly datum: string;
  readonly betrag: string;
}

export interface Zahlungswerte {
  readonly datum: Kalenderdatum;
  readonly betrag: Betrag;
}

export const LEERE_ZAHLUNG: Zahlungsentwurf = { datum: '', betrag: '' };

export const zahlungEntwurf = (z: Zahlung): Zahlungsentwurf => ({
  datum: datumDe(z.datum),
  betrag: formatiereBetragDe(z.betrag),
});

export function zahlungLesen(e: Zahlungsentwurf): Ergebnis<Zahlungswerte, readonly Feldfehler[]> {
  const m = texte.zahlung;
  const fehler: Feldfehler[] = [];
  let datum: Kalenderdatum | null = null;
  if (e.datum.trim() === '') fehler.push({ feld: 'datum', meldung: m.datumFehlt });
  else {
    const d = datumLesen(e.datum);
    if (d.ok) datum = d.wert as Kalenderdatum;
    else fehler.push({ feld: 'datum', meldung: d.fehler });
  }
  let betrag: Betrag | null = null;
  if (e.betrag.trim() === '') fehler.push({ feld: 'betrag', meldung: m.betragFehlt });
  else {
    const b = zahlLesen('betrag', e.betrag);
    if (!b.ok) fehler.push({ feld: 'betrag', meldung: b.fehler });
    else if (vorzeichen(b.wert) <= 0) fehler.push({ feld: 'betrag', meldung: m.betragPositiv });
    else betrag = b.wert;
  }
  if (datum === null || betrag === null) return { ok: false, fehler };
  return { ok: true, wert: { datum, betrag } };
}

/** Neue Zahlung (Kennung aus `IdQuelle.zahlung`, A7) oder Datum und Betrag einer vorhandenen ersetzen. */
export function zahlungBefehl(
  vorhanden: Zahlung | null,
  neueId: () => ZahlungId,
  w: Zahlungswerte,
): ZahlungErfassen | ZahlungAendern {
  return vorhanden === null
    ? { art: 'ZahlungErfassen', zahlung: { id: neueId(), ...w } }
    : { art: 'ZahlungAendern', zahlung: { id: vorhanden.id, ...w } };
}
