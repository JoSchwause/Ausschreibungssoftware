// SPDX-License-Identifier: AGPL-3.0-or-later
// DIN 277 und Kennwerte auf der Modellseite (Ticket 115, X1e, D-52): Bezugsgrößen aus dem Modell oder, wo das Modell keine
// hergibt, aus der Eingabe des Nutzers (als solche gekennzeichnet); Kostenschätzung über Kennwerte, die der Nutzer eingibt
// (nie aus einem Katalog, C1); Kostenkennwerte einer bestehenden Kostenermittlung. Rechnen tun `bim` und `kosten`; hier wird
// nur am Rand gelesen (de-DE, N4).

import {
  din277Berechnen,
  kostenkennwerteBerechnen,
  kostenschaetzungBerechnen,
  type Bezugsgroesse,
  type Bezugsgroessenart,
  type Din277Groessen,
  type Kennwertansatz,
  type Kostenkennwertzeile,
  type Kostenschaetzung,
} from '@tethys/bim';
import { formatiereBetragDe, formatiereMengeDe, parseBetragDe, parseMengeDe } from '@tethys/dezimal';
import { kostenermittlungBerechnen } from '@tethys/kosten';
import { texte } from './texte';
import type {
  Bauwerksmodell,
  Betrag,
  Kostenermittlungseintrag,
  KostenermittlungId,
  Kostengruppennummer,
  Menge,
  ProjektId,
} from '@tethys/vertrag';

export const BEZUGSGROESSEN: readonly Bezugsgroessenart[] = ['BGF', 'BRI', 'NRF'];
export const EINHEIT: Readonly<Record<Bezugsgroessenart, string>> = { BGF: 'm²', BRI: 'm³', NRF: 'm²' };

/**
 * Die Herleitung eines Betrags der Kostenschätzung für die Bemerkung des Eintrags, etwa „BGF 245,300 m² × 1.250,00 €/m²“;
 * eine Eingabe des Nutzers heißt so. `bim` rechnet, der Rand formatiert (N4, Ticket 122).
 */
export function herleitungstext(g: Bezugsgroesse, kennwert: Betrag): string {
  return texte.kennwerte.herleitung(
    g.art,
    g.wert === null ? '–' : formatiereMengeDe(g.wert),
    EINHEIT[g.art],
    g.quelle === 'eingabe',
    formatiereBetragDe(kennwert),
  );
}

export interface Groessenlesung {
  readonly groessen: Din277Groessen;
  /** Eingaben, die keine Menge sind, je Größe mit Meldung; sie zählen nicht. */
  readonly fehler: Partial<Record<Bezugsgroessenart, string>>;
}

/**
 * Die Bezugsgrößen: eine nicht leere, gültige Eingabe des Nutzers gilt (Quelle `eingabe`), sonst das Modell (`bim`,
 * D-108.9). Die Oberfläche bietet die Eingabe nur für Größen an, die das Modell nicht hergibt.
 */
export function groessenLesen(
  modell: Bauwerksmodell,
  eingaben: Partial<Readonly<Record<Bezugsgroessenart, string>>>,
): Groessenlesung {
  const werte: Partial<Record<Bezugsgroessenart, Menge>> = {};
  const fehler: Partial<Record<Bezugsgroessenart, string>> = {};
  for (const art of BEZUGSGROESSEN) {
    const text = (eingaben[art] ?? '').trim();
    if (text === '') continue;
    const r = parseMengeDe(text);
    if (r.ok) werte[art] = r.wert;
    else fehler[art] = r.fehler.meldung;
  }
  return { groessen: din277Berechnen(modell, werte), fehler };
}

/** Eine Zeile der Kennwerteingabe, wie getippt. */
export interface Kennwertzeile {
  readonly kostengruppe: string;
  readonly bezug: Bezugsgroessenart;
  readonly kennwert: string;
}

export interface Kennwertfehler {
  readonly zeile: number;
  readonly feld: 'kostengruppe' | 'kennwert';
  readonly meldung: string;
}

/** Liest die Zeilen; ganz leere Zeilen zählen nicht. Bei einem Fehler gibt es keine Ansätze (die Schätzung wäre unvollständig). */
export function kennwerteLesen(zeilen: readonly Kennwertzeile[]): {
  readonly ansaetze: readonly Kennwertansatz[];
  readonly fehler: readonly Kennwertfehler[];
} {
  const ansaetze: Kennwertansatz[] = [];
  const fehler: Kennwertfehler[] = [];
  zeilen.forEach((z, i) => {
    const kg = z.kostengruppe.trim();
    const kw = z.kennwert.trim();
    if (kg === '' && kw === '') return;
    const kgOk = /^[1-9]\d{2}$/.test(kg);
    if (!kgOk) fehler.push({ zeile: i, feld: 'kostengruppe', meldung: 'Kostengruppe dreistellig (100–999)' });
    const r = parseBetragDe(kw);
    if (!r.ok) fehler.push({ zeile: i, feld: 'kennwert', meldung: 'Kennwert in € je Einheit, z. B. 148,30' });
    if (kgOk && r.ok)
      ansaetze.push({ kostengruppe: kg as Kostengruppennummer, bezug: z.bezug, kennwert: r.wert });
  });
  return { ansaetze: fehler.length > 0 ? [] : ansaetze, fehler };
}

/** Die Schätzung als Befehl `KostenermittlungAnlegen` (Stufe Kostenschätzung) samt Befunden, oder die Eingabefehler. */
export function schaetzungBauen(angaben: {
  readonly id: KostenermittlungId;
  readonly projektId: ProjektId;
  readonly name: string;
  readonly groessen: Din277Groessen;
  readonly zeilen: readonly Kennwertzeile[];
}): { readonly schaetzung: Kostenschaetzung | null; readonly fehler: readonly Kennwertfehler[] } {
  const { ansaetze, fehler } = kennwerteLesen(angaben.zeilen);
  if (fehler.length > 0 || ansaetze.length === 0) return { schaetzung: null, fehler };
  return {
    schaetzung: kostenschaetzungBerechnen({
      id: angaben.id,
      projektId: angaben.projektId,
      name: angaben.name.trim(),
      groessen: angaben.groessen,
      kennwerte: ansaetze,
      herleitung: herleitungstext,
    }),
    fehler,
  };
}

/** Kostenkennwerte einer bestehenden Kostenermittlung: Summen je KG aus `kosten`, geteilt durch die Größen (`bim`). */
export function kostenkennwerteZeilen(
  eintraege: readonly Kostenermittlungseintrag[],
  groessen: Din277Groessen,
): Kostenkennwertzeile[] {
  return kostenkennwerteBerechnen(kostenermittlungBerechnen(eintraege).gruppen, groessen);
}
