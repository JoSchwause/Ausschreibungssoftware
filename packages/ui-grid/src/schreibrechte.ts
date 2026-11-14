// SPDX-License-Identifier: AGPL-3.0-or-later
// Was sich in einem LV-Grid ändern lässt und wohin die Befehle gehen, an einer Stelle (Ticket 130, Ticket 123 Punkt 6).
// Hier wohnen auch die Ausnahmen vom Schreibschutz: die Spalte „KG“ (Ticket 93, D-93.1), die sich mit Lesefunktion der
// App auch im schreibgeschützten Grid bearbeiten lässt, wenn die App einen Ausgang dafür gibt, und ebenso die Spalte „EP“
// (SB3: Preise eines Angebots auf dem Gerüst des LV, ohne zweites Grid, U2). Das Grid, die Zeilen und der Editor fragen nur
// diese Rechte und die Eingabeart je Spalte; keiner verzweigt selbst auf die Ausnahmen.

import type { EinheitspreisAendern, KostengruppeSetzen, LvBefehl, LvSpalte } from '@tethys/vertrag';
import { pruefeZahlformatDeDE } from '@tethys/ui-basis';
import { leseKostengruppe, nimmtEingabe } from './eingabe';
import { texte } from './texte';
import type { KostengruppeLesen, LvGridBearbeitbar, LvGridProps } from './typen';

/** Wie ein Eingabefeld einer Spalte tippt und welchen Hinweis zur Form es zeigt (nie sperrend, U5). */
export interface Eingabeart {
  readonly inputMode: 'decimal' | 'numeric' | 'text';
  /** Meldung zur Form des Entwurfs oder `undefined`; nur eine Markierung am Feld. */
  readonly pruefen?: ((text: string) => string | undefined) | undefined;
}

export interface Schreibrechte {
  /** Das bearbeitbare Grid (Befehle, Kennungen) oder `null` im schreibgeschützten (Ticket 54, Punkt 3). */
  readonly aenderung: LvGridBearbeitbar | null;
  /** Das Grid ist als Ganzes schreibgeschützt (`aria-readonly`); einzelne Spalten können es trotzdem nicht sein. */
  readonly nurLesen: boolean;
  /** Spalten, die sich in diesem Grid bearbeiten lassen (an den passenden Zeilen, `istBearbeitbar`). */
  readonly bearbeitbareSpalten: ReadonlySet<LvSpalte>;
  /** Ansage bei einem Änderungsversuch im schreibgeschützten Grid. */
  readonly schreibschutzText: string;
  /** Lesefunktion der Spalte „KG“, wenn sie hier bearbeitbar ist. */
  readonly kostengruppeLesen: KostengruppeLesen | undefined;
  /** Ausnahme „Preise“ im Schreibschutz: Die Spalte „EP“ nimmt Eingaben an, an Zuschlagspositionen nicht (`istBearbeitbar`). */
  readonly einheitspreise: boolean;
  /** Ein Befehl aus einer Zelleingabe. */
  readonly eingabe: (befehl: LvBefehl) => void;
  /** Mehrere Befehle aus einer Benutzeraktion als eine Folge (ein Undo-Schritt); leere Folgen gehen nicht hinaus. */
  readonly folge: (befehle: readonly LvBefehl[]) => void;
}

/**
 * Die Rechte eines Grids aus seinen Eigenschaften. Im bearbeitbaren Grid gehen Eingaben über `onBefehl`, Folgen über
 * `onBefehlsfolge` (ohne sie einzeln). Im schreibgeschützten Grid gibt es keinen Befehl, außer der Ausnahme: Mit
 * `kostengruppeLesen` und `onKostengruppen` lässt sich die Spalte „KG“ ändern, und jede Aktion dort geht als eine Folge
 * hinaus, auch ein einzelner Befehl.
 */
export function schreibrechte(props: LvGridProps, spalten: readonly LvSpalte[]): Schreibrechte {
  const aenderung = props.schreibgeschuetzt === true ? null : props;
  const nurLesen = aenderung === null;
  const kgAusgang = props.schreibgeschuetzt === true ? props.onKostengruppen : undefined;
  const epAusgang = props.schreibgeschuetzt === true ? props.onEinheitspreise : undefined;
  const kostengruppeLesen = nurLesen && kgAusgang === undefined ? undefined : props.kostengruppeLesen;
  // Im Schreibschutz nehmen nur die Spalten mit eigenem Ausgang Eingaben an: „KG“ und „EP“.
  const mitAusgang = (s: LvSpalte): boolean =>
    s === 'kostengruppe' || (s === 'einheitspreis' && epAusgang !== undefined);
  const bearbeitbareSpalten = new Set(
    spalten.filter((s) => nimmtEingabe(s, kostengruppeLesen) && (!nurLesen || mitAusgang(s))),
  );
  const folge = (befehle: readonly LvBefehl[]): void => {
    if (befehle.length === 0) return;
    if (aenderung) {
      if (aenderung.onBefehlsfolge) aenderung.onBefehlsfolge(befehle);
      else for (const b of befehle) aenderung.onBefehl(b);
      return;
    }
    const kg = befehle.filter((b): b is KostengruppeSetzen => b.art === 'KostengruppeSetzen');
    if (kg.length > 0) kgAusgang?.(kg);
    const ep = befehle.filter((b): b is EinheitspreisAendern => b.art === 'EinheitspreisAendern');
    if (ep.length > 0) epAusgang?.(ep);
  };
  return {
    aenderung,
    nurLesen,
    bearbeitbareSpalten,
    schreibschutzText: !nurLesen
      ? texte.gridSchreibgeschuetzt
      : bearbeitbareSpalten.has('einheitspreis')
        ? bearbeitbareSpalten.has('kostengruppe')
          ? texte.gridNurEinheitspreisUndKostengruppe
          : texte.gridNurEinheitspreis
        : bearbeitbareSpalten.has('kostengruppe')
          ? texte.gridNurKostengruppe
          : texte.gridSchreibgeschuetzt,
    kostengruppeLesen,
    einheitspreise: nurLesen && bearbeitbareSpalten.has('einheitspreis'),
    eingabe: (befehl) => {
      if (aenderung) aenderung.onBefehl(befehl);
      else folge([befehl]);
    },
    folge,
  };
}

const TEXT: Eingabeart = { inputMode: 'text' };
const ZAHL: Eingabeart = {
  inputMode: 'decimal',
  pruefen: (text) => {
    const p = pruefeZahlformatDeDE(text);
    return p.gueltig ? undefined : p.meldung;
  },
};

/**
 * Eingabeart je Spalte: Menge und EP tippen Dezimalzahlen mit Hinweis zum Zahlenformat, die Spalte „KG“ Ziffern mit
 * Hinweis aus der Lesefunktion der App (`lesen` liefert immer die aktuelle), alle anderen Text.
 */
export function eingabeart(spalte: LvSpalte, lesen: () => KostengruppeLesen | undefined): Eingabeart {
  switch (spalte) {
    case 'menge':
    case 'einheitspreis':
      return ZAHL;
    case 'kostengruppe':
      return {
        inputMode: 'numeric',
        pruefen: (text) => {
          const l = lesen();
          if (l === undefined) return undefined;
          const r = leseKostengruppe(text, l);
          return r.ok ? undefined : r.meldung;
        },
      };
    default:
      return TEXT;
  }
}
