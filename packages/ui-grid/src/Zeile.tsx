// SPDX-License-Identifier: AGPL-3.0-or-later
// Eine sichtbare Zeile des Grids. Reine Darstellung: Zustand und Ereignisse gehören dem Grid (Delegation am
// Wurzelelement). Memoisiert, damit beim Scrollen und Tippen nur betroffene Zeilen neu gerendert werden.

import { memo, useMemo } from 'react';
import type { ReactElement } from 'react';
import type { Row } from '@tanstack/react-table';
import type { GridZahlen, LvSpalte, LvZeile, Pruefbefund } from '@tethys/vertrag';
import { Icon } from '@tethys/ui-basis';
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
  /** Schreibgeschütztes Grid: keine Zelle ist bearbeitbar. */
  readonly schreibgeschuetzt: boolean;
  readonly editor: EditorAktionen;
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
  const { abgelehnt, baumspalte, zahlen, schreibgeschuetzt, editor } = props;
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
        const bearbeitbar = !schreibgeschuetzt && istBearbeitbar(zeile, spalte);
        const hinweise = befunde.get(spalte) ?? [];
        const hatFehler = hinweise.some((b) => b.schwere === 'fehler');
        const a = abgelehnt?.get(spalte);
        const ungueltig = a !== undefined && a.basis === text ? a : undefined;
        const beschreibung = [
          ...hinweise.map((b) => `${b.schwere === 'fehler' ? texte.fehler : texte.warnung}: ${b.meldung}`),
          ...(ungueltig ? [`${texte.eingabeUngueltig}: ${ungueltig.meldung}`] : []),
        ];
        const beschreibungsId = `${zelle.id}-hinweis`;

        const z = ['tx-grid__zelle', `tx-grid__zelle--${spalte}`];
        if (NUMERISCH.has(spalte)) z.push('tx-grid__zelle--zahl');
        if (aktiv === spalte) z.push('tx-grid__zelle--aktiv');
        if (hinweise.length > 0) z.push(hatFehler ? 'tx-grid__zelle--fehler' : 'tx-grid__zelle--warnung');
        if (ungueltig) z.push('tx-grid__zelle--ungueltig');
        if (spalte === 'gesamtpreis' && zeile.gehtInSummeEin === false) z.push('tx-grid__zelle--ohne-summe');

        return (
          <div
            key={zelle.id}
            role="gridcell"
            className={z.join(' ')}
            data-spalte={spalte}
            aria-colindex={si + 1}
            tabIndex={tabbar === spalte ? 0 : -1}
            aria-readonly={bearbeitbar ? undefined : true}
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
              <span className="tx-grid__baum" style={{ paddingInlineStart: zeile.tiefe * 16 }}>
                {zeile.hatUnterknoten ? (
                  <button
                    type="button"
                    tabIndex={-1}
                    data-aufklappen=""
                    className="tx-grid__knopf"
                    aria-label={zeile.aufgeklappt ? texte.zuklappen : texte.aufklappen}
                  >
                    <Icon
                      name="pfeilUnten"
                      groesse={14}
                      className={zeile.aufgeklappt ? undefined : 'tx-grid__pfeil--zu'}
                    />
                  </button>
                ) : (
                  <span className="tx-grid__platz" aria-hidden="true" />
                )}
              </span>
            ) : null}
            {bearbeitung?.spalte === spalte ? (
              <Editor spalte={spalte} entwurf={bearbeitung.entwurf} aktionen={editor} />
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
