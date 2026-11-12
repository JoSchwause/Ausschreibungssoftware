// SPDX-License-Identifier: AGPL-3.0-or-later
// Das Honorarergebnis als Tabellenzeilen für die Seite (Ticket 119): nichts wird gerechnet, nur formatiert (N4); die Zahlen
// kommen aus `honorarBerechnen`. Je Objekt die Herleitung (§ 33), die Tafelzeilen, das Honorar, die Phasen und die Zuschläge.

import { formatiereBetragDe, formatiereProzentDe } from '@tethys/dezimal';
import type { Betrag, Honorarergebnis, Objektergebnis, Pruefbefund } from '@tethys/vertrag';
import { BEFUNDTEXT, texte } from './texte';

const t = texte.editor;

export interface Zeile {
  readonly bezeichnung: string;
  readonly wert: string;
}

export interface PhasenZeile {
  readonly phase: string;
  readonly anteil: string;
  readonly betrag: string;
}

export interface ObjektAnsicht {
  readonly titel: string;
  /** Die Zeilen der Herleitung nach § 33; `null` bei anrechenbaren Kosten von Hand. */
  readonly herleitung: readonly Zeile[] | null;
  /** Anrechenbare Kosten, Tafelzeilen (von, bis) und Spanne; `null` ohne Tafelwert. */
  readonly tafel: readonly Zeile[] | null;
  readonly anrechenbareKosten: string | null;
  readonly honorar: string | null;
  readonly phasen: readonly PhasenZeile[];
  readonly grundhonorar: string;
  readonly umbauzuschlag: string;
  readonly berechnet: boolean;
}

export const euro = (b: Betrag): string => `${formatiereBetragDe(b)} €`;

function objekt(o: Objektergebnis, nr: number): ObjektAnsicht {
  const h = o.herleitung;
  const z = t.zeilen;
  return {
    titel: t.ergebnisObjekt(nr),
    herleitung:
      h === null
        ? null
        : [
            { bezeichnung: z.kg300, wert: euro(h.kg300) },
            { bezeichnung: z.weitereKosten, wert: euro(h.weitereKosten) },
            { bezeichnung: z.sonstige, wert: euro(h.sonstigeAnrechenbareKosten) },
            { bezeichnung: z.kg400, wert: euro(h.kg400) },
            { bezeichnung: z.grenze, wert: euro(h.grenzeTechnischeAnlagen) },
            { bezeichnung: z.kg400Voll, wert: euro(h.kg400Voll) },
            { bezeichnung: z.kg400Haelfte, wert: euro(h.kg400Haelfte) },
            { bezeichnung: z.bausubstanz, wert: euro(h.mitzuverarbeitendeBausubstanz) },
            { bezeichnung: z.anrechenbar, wert: euro(h.anrechenbareKosten) },
          ],
    tafel:
      o.tafel === null
        ? null
        : [
            {
              bezeichnung: t.tafelUnten(formatiereBetragDe(o.tafel.zeileUnten.anrechenbareKosten)),
              wert: spanneText(o.tafel.zeileUnten.spannen[o.honorarzone]),
            },
            {
              bezeichnung: t.tafelOben(formatiereBetragDe(o.tafel.zeileOben.anrechenbareKosten)),
              wert: spanneText(o.tafel.zeileOben.spannen[o.honorarzone]),
            },
            { bezeichnung: t.tafelSpanne, wert: spanneText(o.tafel.spanne) },
          ],
    anrechenbareKosten: o.anrechenbareKosten === null ? null : euro(o.anrechenbareKosten),
    honorar: o.honorar === null ? null : euro(o.honorar),
    phasen: o.phasen.map((p) => ({
      phase: `LPH ${String(p.nummer)} ${p.name}`,
      anteil: `${formatiereProzentDe(p.anteil)} %`,
      betrag: euro(p.betrag),
    })),
    grundhonorar: euro(o.grundhonorar),
    umbauzuschlag: euro(o.umbauzuschlag),
    berechnet: o.honorar !== null,
  };
}

function spanneText(s: { readonly von: Betrag; readonly bis: Betrag } | undefined): string {
  return s === undefined ? '–' : `${t.von} ${euro(s.von)} ${t.bis} ${euro(s.bis)}`;
}

export interface ErgebnisAnsicht {
  readonly objekte: readonly ObjektAnsicht[];
  readonly summen: readonly Zeile[];
}

export function ergebnisAnsicht(e: Honorarergebnis): ErgebnisAnsicht {
  const z = t.summenZeilen;
  return {
    objekte: e.objekte.map((o, i) => objekt(o, i + 1)),
    summen: [
      { bezeichnung: z.grundhonorar, wert: euro(e.grundhonorar) },
      { bezeichnung: z.umbauzuschlaege, wert: euro(e.umbauzuschlaege) },
      { bezeichnung: z.nebenkosten, wert: euro(e.nebenkosten) },
      { bezeichnung: z.netto, wert: euro(e.netto) },
      { bezeichnung: z.mwst, wert: euro(e.mwst) },
      { bezeichnung: z.brutto, wert: euro(e.brutto) },
    ],
  };
}

export interface BefundAnsicht {
  readonly schwere: 'fehler' | 'warnung';
  /** Wo: `Objekt 2` und das Feld, oder die ganze Berechnung. */
  readonly ort: string;
  readonly text: string;
  readonly code: string;
}

/** Der Befund für die Seite: eigener Text für die Stufen der Kostenermittlung (D-110.4), sonst die Meldung der Rechnung. */
export function befundAnsicht(b: Pruefbefund): BefundAnsicht {
  const m = b.ort.pfad === undefined ? null : /^\/objekte\[(\d+)\]$/.exec(b.ort.pfad);
  const objekt = m?.[1] === undefined ? null : `Objekt ${m[1]}`;
  const ort = [objekt, b.ort.feld].filter((x): x is string => x !== null && x !== undefined).join(', ');
  return {
    schwere: b.schwere === 'fehler' ? 'fehler' : 'warnung',
    ort,
    text: BEFUNDTEXT[b.code] ?? b.meldung,
    code: b.code,
  };
}
