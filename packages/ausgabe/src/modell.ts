// SPDX-License-Identifier: AGPL-3.0-or-later
// Ausgabemodell: der LV-Baum als flache Liste druckfertiger Zeilen, alle Zahlen schon de-DE formatiert (N4).
// Beide Wege (pdfmake, Browser-Druck) lesen dieses Modell. Der Spike rechnet nichts: Beträge kommen aus dem
// `Summenstand` des `LvZustand`, die Zahlen werden nur über `@tethys/dezimal` formatiert.

import {
  formatiereBetragDe,
  formatiereEinheitspreisDe,
  formatiereMengeDe,
  formatiereProzentDe,
} from '@tethys/dezimal';
import type { Knoten, Langtext, LvZustand, Position } from '@tethys/vertrag';

export interface TitelZeile {
  readonly art: 'titel';
  /** 1 = oberste Gliederungsebene. */
  readonly ebene: number;
  readonly ordnungszahl: string;
  readonly kurztext: string;
}

export interface TitelsummeZeile {
  readonly art: 'titelsumme';
  readonly ebene: number;
  readonly ordnungszahl: string;
  readonly kurztext: string;
  readonly summe: string;
}

export interface PositionZeile {
  readonly art: 'position';
  readonly ordnungszahl: string;
  readonly kurztext: string;
  /** Langtext als einfacher Text (Bilder und Auszeichnung entfallen). Leer: keine Langtextzeile. */
  readonly langtext: string;
  readonly menge: string;
  readonly einheit: string;
  readonly einheitspreis: string;
  readonly gesamtpreis: string;
  /** `false`: Der Kern nimmt die Position nicht in die Summen auf (Bedarf, Wahl); der Druck weist das aus. */
  readonly gehtInSummeEin: boolean;
}

export interface HinweisZeile {
  readonly art: 'hinweis';
  readonly text: string;
}

export type AusgabeZeile = TitelZeile | TitelsummeZeile | PositionZeile | HinweisZeile;

export interface SummenBlock {
  readonly netto: string;
  /** `null`: kein Nachlass am LV. */
  readonly nachlass: { readonly bezeichnung: string; readonly betrag: string } | null;
  readonly nettoNachNachlass: string;
  readonly mwstBezeichnung: string;
  readonly mwst: string;
  readonly brutto: string;
}

export interface Ausgabemodell {
  readonly name: string;
  readonly zeilen: readonly AusgabeZeile[];
  readonly summen: SummenBlock;
}

/** Einfacher Text eines Langtexts: Textbausteine in Reihenfolge; Bilder entfallen (Nicht-Ziel des Spikes). */
export function langtextAlsText(langtext: Langtext): string {
  const teile: string[] = [];
  for (const baustein of langtext)
    if (baustein.art === 'text' && baustein.text !== '') teile.push(baustein.text);
  return teile.join('\n');
}

export function baueAusgabemodell(zustand: LvZustand): Ausgabemodell {
  const { leistungsverzeichnis: lv, summen } = zustand;
  const kinder = new Map<string, Knoten[]>();
  for (const k of lv.knoten) {
    const liste = kinder.get(k.elternId);
    if (liste) liste.push(k);
    else kinder.set(k.elternId, [k]);
  }
  for (const liste of kinder.values()) liste.sort((a, b) => a.reihenfolge - b.reihenfolge);
  const positionssumme = new Map(summen.positionen.map((s) => [s.positionId as string, s]));
  const gliederungssumme = new Map(summen.gliederungen.map((s) => [s.gliederungId as string, s.summe]));

  const zeilen: AusgabeZeile[] = [];
  const oz = (o: string | null, index?: string | null): string => `${o ?? ''}${index ?? ''}`;
  const positionZeile = (p: Position): PositionZeile => {
    const s = positionssumme.get(p.id);
    return {
      art: 'position',
      ordnungszahl: oz(p.ordnungszahl, p.ozIndex),
      kurztext: p.kurztext,
      langtext: langtextAlsText(p.langtext),
      menge: p.menge === null ? '' : formatiereMengeDe(p.menge),
      einheit: p.einheit ?? '',
      einheitspreis: p.einheitspreis === null ? '' : formatiereEinheitspreisDe(p.einheitspreis),
      gesamtpreis: s?.gesamtpreis == null ? '' : formatiereBetragDe(s.gesamtpreis),
      gehtInSummeEin: s?.gehtInSummeEin ?? false,
    };
  };
  const besuche = (elternId: string, ebene: number): void => {
    for (const k of kinder.get(elternId) ?? []) {
      switch (k.art) {
        case 'los':
        case 'titel': {
          const o = oz(k.ordnungszahl);
          zeilen.push({ art: 'titel', ebene, ordnungszahl: o, kurztext: k.kurztext });
          besuche(k.id, ebene + 1);
          const summe = gliederungssumme.get(k.id);
          zeilen.push({
            art: 'titelsumme',
            ebene,
            ordnungszahl: o,
            kurztext: k.kurztext,
            summe: summe === undefined ? '' : formatiereBetragDe(summe),
          });
          break;
        }
        case 'position':
          zeilen.push(positionZeile(k));
          break;
        case 'hinweis':
          zeilen.push({ art: 'hinweis', text: langtextAlsText(k.text) });
          break;
      }
    }
  };
  besuche(lv.id, 1);

  const g = summen.gesamt;
  return {
    name: lv.name,
    zeilen,
    summen: {
      netto: formatiereBetragDe(g.netto),
      nachlass:
        lv.nachlass === null
          ? null
          : {
              bezeichnung:
                lv.nachlass.art === 'prozent'
                  ? `Nachlass ${formatiereProzentDe(lv.nachlass.wert)} %`
                  : 'Nachlass',
              betrag: formatiereBetragDe(g.nachlass),
            },
      nettoNachNachlass: formatiereBetragDe(g.nettoNachNachlass),
      mwstBezeichnung: `MwSt ${formatiereProzentDe(lv.mwstSatz)} %`,
      mwst: formatiereBetragDe(g.mwst),
      brutto: formatiereBetragDe(g.brutto),
    },
  };
}
