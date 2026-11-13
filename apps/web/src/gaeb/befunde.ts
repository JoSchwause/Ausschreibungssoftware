// SPDX-License-Identifier: AGPL-3.0-or-later
// „Befunde beim Einlesen“ ohne Oberfläche (E7, B-12): Aus den Befunden eines Lesers (GAEB, X84, X31, XRechnung, IFC) wird eine
// Zusammenfassung für Nutzer. Was nicht übernommen wird, steht in einer Zeile („Nicht übernommen: Währung, …“); die übrigen
// Befunde sind nach Code gruppiert, mit Kurztext, gesammelten OZ und Werten im deutschen Format (N4). Eine abgewiesene Datei
// zeigt den Satz des Lesers vorn. Codes, Pfade als Titel und Zeilen, die nichts helfen, erscheinen nicht (L5). Rein.

import { formatiereDe } from '@tethys/dezimal';
import { BEFUNDTEXTE, zeileHilft, type Befundwert, type GaebBefund } from '@tethys/gaeb';
import type { Befundschwere, Pruefbefund } from '@tethys/vertrag';
import { texte } from './texte';

/** Kurztext je Code; fehlt ein Code, steht die Meldung als Titel. */
export type Kurztexte = Readonly<Record<string, string>>;

/** Befunde desselben Codes (ohne Kurztext: derselben Meldung). */
export interface Befundgruppe {
  readonly schwere: Befundschwere;
  readonly titel: string;
  /** Vorkommen in der Datei; ein Befund kann mehrere zählen (Wert `anzahl`). */
  readonly anzahl: number;
  /** OZ der betroffenen Knoten, jede einmal, in der Reihenfolge der Befunde. */
  readonly oz: readonly string[];
  /** Die Werte eines einzelnen Befunds als deutscher Text; `null` ohne Zahlen oder bei mehreren Befunden. */
  readonly werte: string | null;
}

/** Ein Befund in den aufklappbaren Einzelheiten. */
export interface Einzelheit {
  readonly schwere: Befundschwere;
  readonly titel: string;
  /** Die ausführliche Meldung; `null`, wenn sie schon der Titel ist (kein Kurztext bekannt). */
  readonly meldung: string | null;
  readonly oz: string | null;
  /** Zeile der Datei, nur wenn sie hilft (kein Knoten, nicht in „Nicht übernommen“). */
  readonly zeile: number | null;
}

export interface Befundzusammenfassung {
  readonly fehler: number;
  readonly warnungen: number;
  /** Der Satz, mit dem der Leser die Datei abweist (was sie ist, was stattdessen geht); `null`, wenn er sie liest. */
  readonly abweisung: string | null;
  readonly nichtUebernommen: readonly string[];
  readonly gruppen: readonly Befundgruppe[];
  readonly einzelheiten: readonly Einzelheit[];
}

/** Codes der GAEB-Leser, mit denen eine Datei als Ganzes abgewiesen wird; ihre Meldung ist der Satz für Nutzer. */
const ABWEISUNGEN: ReadonlySet<string> = new Set([
  'dateiart-unbekannt',
  'format-nicht-unterstuetzt',
  'phase-nicht-unterstuetzt',
  'version-nicht-unterstuetzt',
  'wurzel-unerwartet',
]);

const alsGaeb = (b: Pruefbefund): Partial<Pick<GaebBefund, 'werte' | 'oz' | 'nichtUebernommen'>> =>
  b as Partial<GaebBefund>;

const istGaebLesen = (b: Pruefbefund): boolean => b.quelle === 'gaeb-lesen';

function zeileVon(b: Pruefbefund): number | null {
  if (b.ort.zeile === undefined) return null;
  if (istGaebLesen(b)) return zeileHilft(b as GaebBefund) ? b.ort.zeile : null;
  return b.ort.knotenId === undefined ? b.ort.zeile : null;
}

/** Ein Wert in deutscher Schreibweise (N4); Text bleibt wörtlich, Anzahlen mit Tausenderpunkt. */
export function wertDeutsch(w: Befundwert): string {
  switch (w.art) {
    case 'text':
      return w.wert;
    case 'anzahl':
      return w.wert.toLocaleString('de-DE');
    case 'betrag':
      return `${formatiereDe(w.wert)} €`;
    case 'prozent':
      return `${formatiereDe(w.wert)} %`;
    case 'menge':
    case 'einheitspreis':
      return formatiereDe(w.wert);
  }
}

/** Die Zahlen eines Befunds als Text: ein Wert allein, mehrere mit ihrem Namen. Texte und Anzahlen stehen nicht hier. */
function zahlenText(b: Pruefbefund): string | null {
  const werte = Object.entries(alsGaeb(b).werte ?? {}).filter(([, w]) => w.art !== 'text' && w.art !== 'anzahl');
  if (werte.length === 0) return null;
  if (werte.length === 1) return werte[0] === undefined ? null : wertDeutsch(werte[0][1]);
  const namen: Readonly<Record<string, string>> = texte.befunde.wertnamen;
  const teile = werte.filter(([n]) => namen[n] !== undefined).map(([n, w]) => `${namen[n] ?? n} ${wertDeutsch(w)}`);
  return teile.length === 0 ? null : teile.join(', ');
}

function vorkommen(b: Pruefbefund): number {
  const a = alsGaeb(b).werte?.['anzahl'];
  return a?.art === 'anzahl' ? a.wert : 1;
}

/** Fasst die Befunde eines Einlesens für Nutzer zusammen (Kurztexte: Standard die der GAEB-Leser). */
export function befundeZusammenfassen(
  befunde: readonly Pruefbefund[],
  kurztexte: Kurztexte = BEFUNDTEXTE,
): Befundzusammenfassung {
  const abgewiesen = befunde.find((b) => istGaebLesen(b) && ABWEISUNGEN.has(b.code));
  const rest = befunde.filter((b) => b !== abgewiesen);
  const titel = (b: Pruefbefund): string => kurztexte[b.code] ?? b.meldung;

  const nichtUebernommen: string[] = [];
  const gruppen = new Map<string, { b: Pruefbefund[]; schwere: Befundschwere }>();
  for (const b of rest) {
    const n = alsGaeb(b).nichtUebernommen;
    if (n !== undefined) {
      if (!nichtUebernommen.includes(n)) nichtUebernommen.push(n);
      continue;
    }
    const schluessel = `${b.schwere}\u0000${kurztexte[b.code] === undefined ? `${b.code}\u0000${b.meldung}` : b.code}`;
    const g = gruppen.get(schluessel);
    if (g === undefined) gruppen.set(schluessel, { b: [b], schwere: b.schwere });
    else g.b.push(b);
  }
  const alle = [...gruppen.values()];
  const geordnet = [...alle.filter((g) => g.schwere === 'fehler'), ...alle.filter((g) => g.schwere !== 'fehler')];

  return {
    fehler: befunde.filter((b) => b.schwere === 'fehler').length,
    warnungen: befunde.filter((b) => b.schwere !== 'fehler').length,
    abweisung: abgewiesen?.meldung ?? null,
    nichtUebernommen,
    gruppen: geordnet.map(({ b, schwere }): Befundgruppe => {
      const erster = b[0] as Pruefbefund;
      const oz: string[] = [];
      for (const x of b) {
        const o = alsGaeb(x).oz;
        if (o !== undefined && !oz.includes(o)) oz.push(o);
      }
      return {
        schwere,
        titel: titel(erster),
        anzahl: b.reduce((s, x) => s + vorkommen(x), 0),
        oz,
        werte: b.length === 1 ? zahlenText(erster) : null,
      };
    }),
    einzelheiten: rest.map(
      (b): Einzelheit => ({
        schwere: b.schwere,
        titel: titel(b),
        meldung: kurztexte[b.code] === undefined ? null : b.meldung,
        oz: alsGaeb(b).oz ?? null,
        zeile: zeileVon(b),
      }),
    ),
  };
}
