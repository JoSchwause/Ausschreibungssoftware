// SPDX-License-Identifier: AGPL-3.0-or-later
// Panel der Mengenermittlung (Ticket 65, M2): Ansatzzeilen einer Position als Tabelle. Jede Zeile zeigt ihr Ergebnis
// oder ihren Fehler mit Spalte; gerechnet wird nur von `mengen` (N1). Übernehmen schickt genau einen Befehl
// `MengenansatzSetzen` mit Ansatz und Summe (A5, ein Undo-Schritt). Tastatur zuerst (U3): Enter legt eine Zeile an,
// Strg+Entf löscht, Alt+Pfeil verschiebt, Strg+Enter übernimmt.

import { formatiereMengeDe } from '@tethys/dezimal';
import { Button, Dialog } from '@tethys/ui-basis';
import type { MengenansatzSetzen, Position } from '@tethys/vertrag';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement, RefObject } from 'react';
import {
  ansatzBefehl,
  ansatzBerechnen,
  entwurfAusPosition,
  FORMELNUMMERN,
  zeileAnlegen,
  zeileLeer,
  zeileLoeschen,
  zeileVerschieben,
  type Ansatzentwurf,
} from './ansatz';
import { fehlerText, texte } from './texte';
import './mengen.css';

export interface MengenPanelProps {
  /** Offen, solange eine Position gewählt ist. */
  position: Position | null;
  onSchliessen: () => void;
  /** Schickt den Befehl durch Kern und Speicher; `true`, wenn er angenommen wurde (sonst steht die Meldung schon da). */
  senden: (befehl: MengenansatzSetzen) => Promise<boolean>;
}

const positionsname = (p: Position): string => [p.ordnungszahl, p.kurztext].filter(Boolean).join(' ');

export function MengenPanel(props: MengenPanelProps): ReactElement {
  const { position, onSchliessen } = props;
  const erstes = useRef<HTMLInputElement>(null);
  return (
    <Dialog
      offen={position !== null}
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={position ? `${texte.titel}: ${positionsname(position)}` : texte.titel}
      beschreibung={texte.beschreibung}
      anfangsfokus={erstes}
    >
      {position ? <Inhalt key={position.id} {...props} position={position} erstes={erstes} /> : null}
    </Dialog>
  );
}

function Inhalt(
  props: MengenPanelProps & { position: Position; erstes: RefObject<HTMLInputElement | null> },
) {
  const { position, onSchliessen, senden, erstes } = props;
  const [zeilen, setZeilen] = useState<readonly Ansatzentwurf[]>(() => {
    const e = entwurfAusPosition(position);
    return e.length > 0 ? e : zeileAnlegen([], -1);
  });
  const [laeuft, setLaeuft] = useState(false);
  const felder = useRef(new Map<number, HTMLInputElement>());
  const [fokus, setFokus] = useState<number | null>(null);

  useEffect(() => {
    if (fokus === null) return;
    felder.current.get(fokus)?.focus();
    setFokus(null);
  }, [fokus, zeilen]);

  const ergebnis = useMemo(() => ansatzBerechnen(zeilen), [zeilen]);
  /** Zeilenergebnis je Schlüssel (ganz leere Zeilen haben keins). */
  const jeZeile = useMemo(() => {
    const m = new Map<number, (typeof ergebnis.zeilen)[number]>();
    let i = 0;
    for (const z of zeilen) {
      if (zeileLeer(z)) continue;
      const r = ergebnis.zeilen[i++];
      if (r !== undefined) m.set(z.schluessel, r);
    }
    return m;
  }, [zeilen, ergebnis]);

  const aendere = (schluessel: number, teil: Partial<Ansatzentwurf>): void => {
    setZeilen((alt) => alt.map((z) => (z.schluessel === schluessel ? { ...z, ...teil } : z)));
  };

  const uebernehmen = async (): Promise<void> => {
    if (laeuft) return;
    const b = ansatzBefehl(position, zeilen);
    if (b === null) {
      onSchliessen();
      return;
    }
    setLaeuft(true);
    const ok = await senden(b);
    setLaeuft(false);
    if (ok) onSchliessen();
  };

  /** Tasten in einem Textfeld der Zeile `index`. */
  const taste = (e: KeyboardEvent<HTMLElement>, index: number): void => {
    if (!(e.target instanceof HTMLInputElement)) return;
    const z = zeilen[index];
    if (z === undefined) return;
    const nur = !e.shiftKey && !e.metaKey;
    if (e.key === 'Enter' && e.ctrlKey && nur) {
      e.preventDefault();
      void uebernehmen();
    } else if (e.key === 'Enter' && !e.ctrlKey && !e.altKey && nur) {
      e.preventDefault();
      const neu = zeileAnlegen(zeilen, index);
      setZeilen(neu);
      setFokus(neu[index + 1]?.schluessel ?? null);
    } else if (e.key === 'Delete' && e.ctrlKey && !e.altKey && nur) {
      e.preventDefault();
      setZeilen(zeileLoeschen(zeilen, index));
      setFokus((zeilen[index + 1] ?? zeilen[index - 1])?.schluessel ?? null);
    } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.altKey && !e.ctrlKey && nur) {
      e.preventDefault();
      setZeilen(zeileVerschieben(zeilen, index, e.key === 'ArrowUp' ? -1 : 1));
      setFokus(z.schluessel);
      // Das Feld behält den Fokus; nur der Effekt holt ihn nach dem Umordnen zurück.
    }
  };

  const loeschen = (index: number): void => {
    setZeilen(zeileLoeschen(zeilen, index));
    setFokus((zeilen[index + 1] ?? zeilen[index - 1])?.schluessel ?? null);
  };

  const zuSpalte = (schluessel: number, spalte: number | null): void => {
    const feld = felder.current.get(schluessel);
    if (feld === undefined) return;
    feld.focus();
    if (spalte !== null) feld.setSelectionRange(spalte, Math.min(spalte + 1, feld.value.length));
  };

  return (
    <div className="mengen" data-testid="mengenpanel">
      <table className="mengen__tabelle" aria-label={texte.tabelle}>
        <thead>
          <tr>
            <th scope="col">{texte.spalten.zeile}</th>
            <th scope="col">{texte.spalten.formel}</th>
            <th scope="col">{texte.spalten.ausdruck}</th>
            <th scope="col">{texte.spalten.variable}</th>
            <th scope="col">{texte.spalten.ergebnis}</th>
            <th scope="col">
              <span className="mengen__nur-sr">{texte.spalten.aktionen}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {zeilen.length === 0 ? (
            <tr>
              <td colSpan={6} className="mengen__leer">
                {texte.keinAnsatz}
              </td>
            </tr>
          ) : null}
          {zeilen.map((z, i) => {
            const r = jeZeile.get(z.schluessel);
            const fehler = r?.fehler ?? null;
            return (
              <tr
                key={z.schluessel}
                data-zeile={z.zeile}
                data-fehler={fehler ? fehler.code : undefined}
                onKeyDown={(e) => {
                  taste(e, i);
                }}
              >
                <th scope="row" className="mengen__nr">
                  {z.zeile}
                </th>
                <td>
                  <select
                    className="mengen__auswahl"
                    aria-label={texte.formelLabel(z.zeile)}
                    value={z.formel}
                    onChange={(e) => {
                      aendere(z.schluessel, { formel: Number(e.target.value) });
                    }}
                  >
                    {(FORMELNUMMERN.includes(z.formel) ? FORMELNUMMERN : [...FORMELNUMMERN, z.formel]).map(
                      (n) => (
                        <option key={n} value={n}>
                          {n} {texte.formeln[n] ?? ''}
                        </option>
                      ),
                    )}
                  </select>
                </td>
                <td>
                  <input
                    ref={(el) => {
                      if (el) felder.current.set(z.schluessel, el);
                      else felder.current.delete(z.schluessel);
                      if (i === 0) erstes.current = el;
                    }}
                    type="text"
                    className="tx-eingabe mengen__ausdruck"
                    aria-label={texte.ausdruckLabel(z.zeile)}
                    aria-invalid={fehler ? true : undefined}
                    spellCheck={false}
                    autoComplete="off"
                    value={z.ausdruck}
                    onChange={(e) => {
                      aendere(z.schluessel, { ausdruck: e.target.value });
                    }}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="tx-eingabe mengen__variable"
                    aria-label={texte.variableLabel(z.zeile)}
                    spellCheck={false}
                    autoComplete="off"
                    value={z.variable}
                    onChange={(e) => {
                      aendere(z.schluessel, { variable: e.target.value });
                    }}
                  />
                </td>
                <td className="mengen__ergebnis" aria-live="polite">
                  {fehler ? (
                    <button
                      type="button"
                      className="mengen__fehler"
                      title={texte.fehlerZu(z.zeile)}
                      onClick={() => {
                        zuSpalte(z.schluessel, fehler.spalte);
                      }}
                    >
                      {fehlerText(fehler)}
                    </button>
                  ) : r?.menge ? (
                    <span data-wert="zeilenergebnis">{formatiereMengeDe(r.menge)}</span>
                  ) : null}
                </td>
                <td className="mengen__aktionen">
                  <Button
                    groesse="sm"
                    variante="schlicht"
                    aria-label={texte.obenLabel(z.zeile)}
                    disabled={i === 0}
                    onClick={() => {
                      setZeilen(zeileVerschieben(zeilen, i, -1));
                    }}
                  >
                    ↑
                  </Button>
                  <Button
                    groesse="sm"
                    variante="schlicht"
                    aria-label={texte.untenLabel(z.zeile)}
                    disabled={i === zeilen.length - 1}
                    onClick={() => {
                      setZeilen(zeileVerschieben(zeilen, i, 1));
                    }}
                  >
                    ↓
                  </Button>
                  <Button
                    groesse="sm"
                    variante="schlicht"
                    aria-label={texte.loeschenLabel(z.zeile)}
                    onClick={() => {
                      loeschen(i);
                    }}
                  >
                    {texte.zeileLoeschen}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={4} className="mengen__summe-name">
              {texte.summe}
            </th>
            <td className="mengen__summe" aria-live="polite">
              {ergebnis.summe === null ? (
                <span className="mengen__summe-fehler" data-wert="summe">
                  –
                </span>
              ) : (
                <span data-wert="summe">{formatiereMengeDe(ergebnis.summe)}</span>
              )}{' '}
              <span className="mengen__einheit">{position.einheit ?? ''}</span>
              {ergebnis.summe === null && zeilen.some((z) => !zeileLeer(z)) ? (
                <span className="mengen__nur-sr"> {texte.summeFehler}</span>
              ) : null}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
      <p className="mengen__hinweis">{texte.tastenHinweis}</p>
      <footer className="tx-dialog__fuss">
        <Button
          onClick={() => {
            const neu = zeileAnlegen(zeilen, zeilen.length - 1);
            setZeilen(neu);
            setFokus(neu[neu.length - 1]?.schluessel ?? null);
          }}
        >
          {texte.zeileAnlegen}
        </Button>
        <span className="mengen__abstand" />
        <Button onClick={onSchliessen}>{texte.abbrechen}</Button>
        <Button
          variante="primaer"
          disabled={laeuft}
          onClick={() => {
            void uebernehmen();
          }}
        >
          {texte.uebernehmen}
        </Button>
      </footer>
    </div>
  );
}
