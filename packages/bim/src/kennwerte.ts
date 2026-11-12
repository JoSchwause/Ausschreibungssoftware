// SPDX-License-Identifier: AGPL-3.0-or-later
// Kosten aus dem Modell (Ticket 108 Punkt 5, X1e, D-52; Glossar „Kostenschätzung über Kennwerte“): Kennwerte je
// Kostengruppe, die der Nutzer vorgibt (nie aus einem Katalog, C1), mal Bezugsgröße ergeben die Einträge einer
// Kostenschätzung; umgekehrt die Kostenkennwerte einer bestehenden Kostenermittlung (nur Anzeige). Rein (A2).

import {
  NULL_BETRAG,
  addiere,
  dividiere,
  formatiereDe,
  multipliziere,
  runden,
  vorzeichen,
} from '@tethys/dezimal';
import type {
  Betrag,
  KostenermittlungAnlegen,
  KostenermittlungId,
  Kostenermittlungseintrag,
  Kostengruppennummer,
  Menge,
  ProjektId,
  Pruefbefund,
} from '@tethys/vertrag';
import { modellbefund } from './befunde';
import type { Bezugsgroesse, Bezugsgroessenart, Din277Groessen } from './din277';

/** Ein Kennwert, den der Nutzer vorgibt: Kostengruppe, Bezugsgröße und Kennwert in € je Einheit der Größe (2 Stellen). */
export interface Kennwertansatz {
  readonly kostengruppe: Kostengruppennummer;
  readonly bezug: Bezugsgroessenart;
  readonly kennwert: Betrag;
}

/** Angaben für die Kostenschätzung: Kennung und Projekt (von der App), Name, Bezugsgrößen und Kennwerte. */
export interface Kostenschaetzungsangaben {
  readonly id: KostenermittlungId;
  readonly projektId: ProjektId;
  readonly name: string;
  readonly groessen: Pick<Din277Groessen, 'bgf' | 'bri' | 'nrf'>;
  readonly kennwerte: readonly Kennwertansatz[];
}

/**
 * Die Kostenschätzung als Befehl (Vorschau und Schreiben in einem). Die Einträge stehen nach Nummer geordnet, je
 * Kostengruppe einer: Doppelte Kostengruppen werden addiert (je Zeile gerundet, Bemerkungen mit „; “ verbunden, Befund),
 * eine Zeile ohne Bezugsgröße fällt weg (Befund). `gesamt` ist die Summe der Einträge (nur Anzeige; die Summen je Gruppe
 * rechnet `kosten`).
 */
export interface Kostenschaetzung {
  readonly befehl: KostenermittlungAnlegen;
  readonly gesamt: Betrag;
  readonly befunde: readonly Pruefbefund[];
}

/** Kostenkennwerte einer Kostengruppe: Summe je m² BGF, je m³ BRI und je m² NRF; `null` ohne Größe oder bei 0. */
export interface Kostenkennwertzeile {
  readonly nummer: Kostengruppennummer;
  readonly summe: Betrag;
  readonly jeBgf: Betrag | null;
  readonly jeBri: Betrag | null;
  readonly jeNrf: Betrag | null;
}

const EINHEIT: Readonly<Record<Bezugsgroessenart, string>> = { BGF: 'm²', BRI: 'm³', NRF: 'm²' };

function groesseZu(groessen: Kostenschaetzungsangaben['groessen'], art: Bezugsgroessenart): Bezugsgroesse {
  return art === 'BGF' ? groessen.bgf : art === 'BRI' ? groessen.bri : groessen.nrf;
}

/** Herleitung eines Betrags, etwa „BGF 245,300 m² × 1.250,00 €/m²“; eine Eingabe des Nutzers heißt so. */
function herleitung(g: Bezugsgroesse, wert: Menge, kennwert: Betrag): string {
  const e = EINHEIT[g.art];
  const quelle = g.quelle === 'eingabe' ? ' (Eingabe)' : '';
  return `${g.art} ${formatiereDe(wert)} ${e}${quelle} × ${formatiereDe(kennwert)} €/${e}`;
}

/** Kostenschätzung über Kennwerte (Ticket 108 Punkt 5): Betrag = round(Bezugsgröße × Kennwert, 2) je Zeile (N2). */
export function kostenschaetzungBerechnen(angaben: Kostenschaetzungsangaben): Kostenschaetzung {
  const befunde: Pruefbefund[] = [];
  const je = new Map<Kostengruppennummer, { betrag: Betrag; bemerkungen: string[] }>();
  for (const k of angaben.kennwerte) {
    const g = groesseZu(angaben.groessen, k.bezug);
    if (g.wert === null) {
      befunde.push(
        modellbefund('bezugsgroesse-fehlt', `KG ${k.kostengruppe}: ${k.bezug} hat keinen Wert`, {
          feld: k.bezug,
        }),
      );
      continue;
    }
    const betrag = runden(multipliziere(g.wert, k.kennwert), 'betrag');
    const bemerkung = herleitung(g, g.wert, k.kennwert);
    const da = je.get(k.kostengruppe);
    if (da === undefined) {
      je.set(k.kostengruppe, { betrag, bemerkungen: [bemerkung] });
      continue;
    }
    befunde.push(
      modellbefund(
        'kostengruppe-doppelt',
        `KG ${k.kostengruppe} steht mehrfach; die Beträge werden addiert`,
        {
          feld: 'kostengruppe',
        },
      ),
    );
    da.betrag = addiere(da.betrag, betrag);
    da.bemerkungen.push(bemerkung);
  }
  const eintraege: Kostenermittlungseintrag[] = [...je.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([nummer, { betrag, bemerkungen }]) => ({ nummer, betrag, bemerkung: bemerkungen.join('; ') }));
  return {
    befehl: {
      art: 'KostenermittlungAnlegen',
      kostenermittlung: {
        id: angaben.id,
        projektId: angaben.projektId,
        stufe: 'kostenschaetzung',
        name: angaben.name,
        eintraege,
      },
    },
    gesamt: eintraege.reduce((s, e) => addiere(s, e.betrag), NULL_BETRAG),
    befunde,
  };
}

function je(summe: Betrag, g: Bezugsgroesse): Betrag | null {
  if (g.wert === null || vorzeichen(g.wert) === 0) return null;
  const q = dividiere(summe, g.wert, 2);
  return q.ok ? runden(q.wert, 'betrag') : null;
}

/**
 * Kostenkennwerte einer bestehenden Kostenermittlung (Ticket 108 Punkt 5, nur Anzeige): je Kostengruppe Summe / BGF, / BRI
 * und / NRF, kaufmännisch auf 2 Stellen. Die Summen je Kostengruppe rechnet die App mit `kosten`
 * (`kostenermittlungBerechnen(...).gruppen`, D-24; A3: `bim` importiert `kosten` nicht); Reihenfolge wie übergeben.
 */
export function kostenkennwerteBerechnen(
  gruppen: readonly { readonly nummer: Kostengruppennummer; readonly summe: Betrag }[],
  groessen: Pick<Din277Groessen, 'bgf' | 'bri' | 'nrf'>,
): Kostenkennwertzeile[] {
  return gruppen.map((g) => ({
    nummer: g.nummer,
    summe: g.summe,
    jeBgf: je(g.summe, groessen.bgf),
    jeBri: je(g.summe, groessen.bri),
    jeNrf: je(g.summe, groessen.nrf),
  }));
}
