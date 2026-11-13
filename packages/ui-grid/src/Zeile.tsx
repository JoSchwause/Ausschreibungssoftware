// SPDX-License-Identifier: AGPL-3.0-or-later
// Eine sichtbare Zeile des Grids. Reine Darstellung: Zustand und Ereignisse gehören dem Grid (Delegation am
// Wurzelelement). Memoisiert, damit beim Scrollen und Tippen nur betroffene Zeilen neu gerendert werden.

import { memo, useMemo } from 'react';
import type { ReactElement } from 'react';
import type { Row } from '@tanstack/react-table';
import type { GridZahlen, LvSpalte, LvZeile, Pruefbefund } from '@tethys/vertrag';
import { Icon } from '@tethys/ui-basis';
import { Baumeinzug } from './Baumeinzug';
import { Editor } from './Editor';
import type { EditorAktionen } from './Editor';
import { anzeigeText, istBearbeitbar } from './eingabe';
import { texte } from './texte';
import type { features } from './tabelle';

/** Eingabe, die das Grid nicht in einen Befehl übersetzen konnte. Sichtbar markiert, nie verworfen (U5). */
export interface Abgelehnt {
  readonly text: string;
  readonly meldung: string;
  /** Anzeigetext der Zelle zum Zeitpunkt der Ablehnung: Ändern die Eigenschaften den Wert, ist die Markierung hinfällig. */
  readonly basis: string;
}

export interface Bearbeitungszeile {
  readonly spalte: LvSpalte;
  readonly entwurf: string;
}

export interface ZeileProps {
  readonly row: Row<typeof features, LvZeile>;
  readonly index: number;
  readonly versatz: number;
  readonly hoehe: number;
  readonly vorlage: string;
  readonly breite: number;
  /** Zelle mit `tabindex="0"` (roving tabindex), sonst `null`. */
  readonly tabbar: LvSpalte | null;
  readonly aktiv: LvSpalte | null;
  readonly ausgewaehlt: boolean;
  /** Mit Strg+X ausgeschnitten und noch nicht eingefügt. */
  readonly ausgeschnitten: boolean;
  readonly bearbeitung: Bearbeitungszeile | null;
  readonly abgelehnt: ReadonlyMap<LvSpalte, Abgelehnt> | undefined;
  readonly baumspalte: LvSpalte;
  readonly zahlen: GridZahlen;
  /**
   * Spalten, die sich in diesem Grid bearbeiten lassen (an passenden Zeilen, `istBearbeitbar`); im schreibgeschützten
   * Grid keine oder nur die Spalte „KG“ (Ticket 93). Stabil halten (Memo).
   */
  readonly bearbeitbareSpalten: ReadonlySet<LvSpalte>;
  /**
   * Das Grid ist als Ganzes schreibgeschützt (`aria-readonly` am Grid). Eine bearbeitbare Zelle darin (Spalte „KG“,
   * Ticket 93) hebt das für sich mit `aria-readonly="false"` auf.
   */
  readonly gridSchreibgeschuetzt: boolean;
  readonly editor: EditorAktionen;
  /** Hinweis zur Form des Entwurfs in der Spalte „KG“ (Editor); stabil halten. */
  readonly kgPruefen?: ((text: string) => string | undefined) | undefined;
}

const NUMERISCH: ReadonlySet<LvSpalte> = new Set<LvSpalte>(['menge', 'einheitspreis', 'gesamtpreis']);

function befundeJeSpalte(
  befunde: readonly Pruefbefund[],
  spalten: readonly LvSpalte[],
): ReadonlyMap<LvSpalte, readonly Pruefbefund[]> {
  const erste = spalten[0];
  const karte = new Map<LvSpalte, Pruefbefund[]>();
  for (const b of befunde) {
    const feld = spalten.find((s) => s === b.ort.feld) ?? erste;
    if (feld === undefined) continue;
    const liste = karte.get(feld) ?? [];
    liste.push(b);
    karte.set(feld, liste);
  }
  return karte;
}

function ZeileKomponente(props: ZeileProps): ReactElement {
  const {
    row,
    index,
    versatz,
    hoehe,
    vorlage,
    breite,
    tabbar,
    aktiv,
    ausgewaehlt,
    ausgeschnitten,
    bearbeitung,
  } = props;
  const { abgelehnt, baumspalte, zahlen, bearbeitbareSpalten, gridSchreibgeschuetzt, editor, kgPruefen } =
    props;
  const zeile = row.original;
  const k = zeile.knoten;
  const zellen = row.getAllCells();
  const spaltenIds = useMemo(() => zellen.map((c) => c.column.id as LvSpalte), [zellen]);
  const befunde = useMemo(() => befundeJeSpalte(zeile.befunde, spaltenIds), [zeile.befunde, spaltenIds]);

  const klassen = ['tx-grid__zeile', `tx-grid__zeile--${k.art}`];
  if (ausgewaehlt) klassen.push('tx-grid__zeile--ausgewaehlt');
  if (ausgeschnitten) klassen.push('tx-grid__zeile--ausgeschnitten');
  if (zeile.gehtInSummeEin === false) klassen.push('tx-grid__zeile--ohne-summe');

  return (
    <div
      role="row"
      className={klassen.join(' ')}
      data-i={index}
      aria-rowindex={index + 2}
      aria-level={zeile.tiefe + 1}
      aria-expanded={zeile.hatUnterknoten ? zeile.aufgeklappt : undefined}
      aria-selected={ausgewaehlt}
      style={{
        height: hoehe,
        width: '100%',
        minWidth: breite,
        transform: `translateY(${String(versatz)}px)`,
        gridTemplateColumns: vorlage,
      }}
    >
      {zellen.map((zelle, si) => {
        const spalte = spaltenIds[si];
        if (spalte === undefined) return null;
        const text = anzeigeText(zeile, spalte, zahlen);
        const bearbeitbar = bearbeitbareSpalten.has(spalte) && istBearbeitbar(zeile, spalte);
        const hinweise = befunde.get(spalte) ?? [];
        const hatFehler = hinweise.some((b) => b.schwere === 'fehler');
        const a = abgelehnt?.get(spalte);
        const ungueltig = a !== undefined && a.basis === text ? a : undefined;
        // Neutrales Kennzeichen (Ticket 74, D-65.2): Die Menge stammt aus einem Mengenansatz. Kein Befund, kein Warnstil.
        const ansatz = spalte === 'menge' && k.art === 'position' && (k.mengenansatz?.length ?? 0) > 0;
        const beschreibung = [
          ...(ansatz ? [texte.mengenansatz] : []),
          ...hinweise.map((b) => `${b.schwere === 'fehler' ? texte.fehler : texte.warnung}: ${b.meldung}`),
          ...(ungueltig ? [`${texte.eingabeUngueltig}: ${ungueltig.meldung}`] : []),
        ];
        const beschreibungsId = `${zelle.id}-hinweis`;

        const z = ['tx-grid__zelle', `tx-grid__zelle--${spalte}`];
        if (NUMERISCH.has(spalte)) z.push('tx-grid__zelle--zahl');
        if (aktiv === spalte) z.push('tx-grid__zelle--aktiv');
        if (hinweise.length > 0) z.push(hatFehler ? 'tx-grid__zelle--fehler' : 'tx-grid__zelle--warnung');
        if (ungueltig) z.push('tx-grid__zelle--ungueltig');
        if (ansatz) z.push('tx-grid__zelle--mengenansatz');
        if (spalte === 'gesamtpreis' && zeile.gehtInSummeEin === false) z.push('tx-grid__zelle--ohne-summe');

        return (
          <div
            key={zelle.id}
            role="gridcell"
            className={z.join(' ')}
            data-spalte={spalte}
            aria-colindex={si + 1}
            tabIndex={tabbar === spalte ? 0 : -1}
            aria-readonly={bearbeitbar ? (gridSchreibgeschuetzt ? false : undefined) : true}
            aria-invalid={hatFehler || ungueltig ? true : undefined}
            aria-describedby={beschreibung.length > 0 ? beschreibungsId : undefined}
            title={
              spalte === 'gesamtpreis' && zeile.gehtInSummeEin === false && beschreibung.length === 0
                ? texte.nichtInSumme
                : beschreibung.length > 0
                  ? beschreibung.join('\n')
                  : undefined
            }
          >
            {spalte === baumspalte ? (
              <Baumeinzug
                tiefe={zeile.tiefe}
                hatUnterknoten={zeile.hatUnterknoten}
                aufgeklappt={zeile.aufgeklappt}
              />
            ) : null}
            {bearbeitung?.spalte === spalte ? (
              <Editor
                spalte={spalte}
                entwurf={bearbeitung.entwurf}
                aktionen={editor}
                pruefen={spalte === 'kostengruppe' ? kgPruefen : undefined}
              />
            ) : (
              <span className="tx-grid__text">{ungueltig ? ungueltig.text : text}</span>
            )}
            {hinweise.length > 0 || ungueltig ? (
              <Icon
                name="warnung"
                groesse={12}
                className="tx-grid__marke"
                aria-hidden="true"
                focusable="false"
              />
            ) : null}
            {ansatz && bearbeitung?.spalte !== spalte ? (
              <span
                className="tx-grid__kennzeichen tx-grid__kennzeichen--mengenansatz"
                data-kennzeichen="mengenansatz"
                aria-hidden="true"
              >
                {texte.mengenansatzSymbol}
              </span>
            ) : null}
            {beschreibung.length > 0 ? (
              <span id={beschreibungsId} className="tx-grid__nur-sr">
                {beschreibung.join('. ')}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export const Zeile = memo(ZeileKomponente);
