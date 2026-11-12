// SPDX-License-Identifier: AGPL-3.0-or-later
// Panel der Mengenermittlung (Ticket 65, M2): Ansatzzeilen als Tabelle. Jede Zeile zeigt ihr Ergebnis oder ihren Fehler
// mit Spalte; gerechnet wird nur von `mengen` (N1). Übernehmen gibt Ansatz und Summe genau einmal weiter (A5, ein
// Undo-Schritt). Tastatur zuerst (U3): Enter legt eine Zeile an, Strg+Entf löscht, Alt+Pfeil verschiebt, Strg+Enter
// übernimmt.
//
// Ticket 87: allgemein (`MengenansatzPanel`) für eine Position des LV (`MengenPanel`, Befehl `MengenansatzSetzen`) und
// für eine Zeile eines Aufmaßblatts, dort mit einem Feld für eine Menge ohne Ansatz. Zeilen in der Textform aus GAEB X31
// (D-83.2) stehen als Text da, nicht als bearbeitbarer Ausdruck; man kann sie nur löschen.

import { formatiereMengeDe } from '@tethys/dezimal';
import { Button, Dialog } from '@tethys/ui-basis';
import type { Ansatzzeile, Menge, MengenansatzSetzen, Position } from '@tethys/vertrag';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement, RefObject } from 'react';
import {
  ansatzBerechnen,
  entwurfAusAnsatz,
  FORMELNUMMERN,
  istTextform,
  mengeneingabe,
  zeileAnlegen,
  zeileLeer,
  zeileLoeschen,
  zeileVerschieben,
  type Ansatzentwurf,
  type Mengeneingabe,
} from './ansatz';
import { fehlerText, texte } from './texte';
import './mengen.css';

/** Wofür die Menge ermittelt wird: eine Position des LV oder die Zeile einer Position auf einem Aufmaßblatt. */
export interface Mengenziel {
  /** Ein neues Ziel beginnt mit frischem Entwurf (z. B. die Kennung der Position). */
  readonly schluessel: string;
  /** OZ und Kurztext, für den Titel. */
  readonly name: string;
  readonly einheit: string | null;
  /** Der gespeicherte Stand. */
  readonly mengenansatz: readonly Ansatzzeile[] | null;
  readonly menge: Menge | null;
}

export interface MengenansatzPanelProps {
  /** Offen, solange ein Ziel gewählt ist. */
  ziel: Mengenziel | null;
  /** Mit Feld für eine Menge ohne Ansatz (Aufmaßblatt); ohne steht die Menge im Grid (LV). */
  direkteMenge?: boolean;
  onSchliessen: () => void;
  /** Übernimmt Ansatz und Menge, nur wenn sich etwas ändert; `true`, wenn angenommen (sonst steht die Meldung da). */
  uebernehmen: (eingabe: Mengeneingabe) => Promise<boolean>;
}

export function MengenansatzPanel(props: MengenansatzPanelProps): ReactElement {
  const { ziel, onSchliessen } = props;
  const erstes = useRef<HTMLInputElement>(null);
  return (
    <Dialog
      offen={ziel !== null}
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={ziel ? `${texte.titel}: ${ziel.name}` : texte.titel}
      beschreibung={
        props.direkteMenge === true
          ? `${texte.beschreibung} ${texte.direkt.beschreibung}`
          : texte.beschreibung
      }
      anfangsfokus={erstes}
    >
      {ziel ? <Inhalt key={ziel.schluessel} {...props} ziel={ziel} erstes={erstes} /> : null}
    </Dialog>
  );
}

export interface MengenPanelProps {
  /** Offen, solange eine Position gewählt ist. */
  position: Position | null;
  onSchliessen: () => void;
  /** Schickt den Befehl durch Kern und Speicher; `true`, wenn er angenommen wurde (sonst steht die Meldung schon da). */
  senden: (befehl: MengenansatzSetzen) => Promise<boolean>;
}

const positionsname = (p: Position): string => [p.ordnungszahl, p.kurztext].filter(Boolean).join(' ');

/** Das Panel an einer Position des LV (Ticket 65): Übernehmen schickt genau einen Befehl `MengenansatzSetzen`. */
export function MengenPanel({ position, onSchliessen, senden }: MengenPanelProps): ReactElement {
  return (
    <MengenansatzPanel
      ziel={
        position === null
          ? null
          : {
              schluessel: position.id,
              name: positionsname(position),
              einheit: position.einheit,
              mengenansatz: position.mengenansatz ?? null,
              menge: position.menge,
            }
      }
      onSchliessen={onSchliessen}
      uebernehmen={(e) =>
        position === null
          ? Promise.resolve(false)
          : senden({ art: 'MengenansatzSetzen', positionId: position.id, ...e })
      }
    />
  );
}

function Inhalt(
  props: MengenansatzPanelProps & { ziel: Mengenziel; erstes: RefObject<HTMLInputElement | null> },
) {
  const { ziel, onSchliessen, erstes } = props;
  const direkteMenge = props.direkteMenge === true;
  const [zeilen, setZeilen] = useState<readonly Ansatzentwurf[]>(() => {
    const e = entwurfAusAnsatz(ziel.mengenansatz);
    return e.length > 0 ? e : zeileAnlegen([], -1);
  });
  // Menge ohne Ansatz (nur Aufmaßblatt): Eine gespeicherte Menge von Hand steht im Feld, der Fokus beginnt dort.
  const vonHand = direkteMenge && ziel.mengenansatz === null && ziel.menge !== null;
  const [direkt, setDirekt] = useState(() =>
    direkteMenge && ziel.mengenansatz === null && ziel.menge !== null ? formatiereMengeDe(ziel.menge) : '',
  );
  const [direktFehler, setDirektFehler] = useState<string | null>(null);
  const direktFeld = useRef<HTMLInputElement | null>(null);
  const direktId = useId();
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
  const mitZeilen = zeilen.some((z) => !zeileLeer(z));

  const aendere = (schluessel: number, teil: Partial<Ansatzentwurf>): void => {
    setZeilen((alt) => alt.map((z) => (z.schluessel === schluessel ? { ...z, ...teil } : z)));
  };

  const uebernehmen = async (): Promise<void> => {
    if (laeuft) return;
    const r = mengeneingabe(ziel, zeilen, direkteMenge ? direkt : null);
    if (!r.ok) {
      setDirektFehler(r.fehler);
      direktFeld.current?.focus();
      return;
    }
    if (r.wert === null) {
      onSchliessen();
      return;
    }
    setLaeuft(true);
    const ok = await props.uebernehmen(r.wert);
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
            const textform = istTextform(z);
            const fehler = textform ? null : (r?.fehler ?? null);
            return (
              <tr
                key={z.schluessel}
                data-zeile={z.zeile}
                data-fehler={fehler ? fehler.code : undefined}
                data-textform={textform ? true : undefined}
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
                    disabled={textform}
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
                      if (i === 0 && !vonHand) erstes.current = el;
                    }}
                    type="text"
                    className={
                      textform
                        ? 'tx-eingabe mengen__ausdruck mengen__textform'
                        : 'tx-eingabe mengen__ausdruck'
                    }
                    aria-label={texte.ausdruckLabel(z.zeile)}
                    aria-invalid={fehler ? true : undefined}
                    readOnly={textform}
                    title={textform ? texte.textform : undefined}
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
                    readOnly={textform}
                    spellCheck={false}
                    autoComplete="off"
                    value={z.variable}
                    onChange={(e) => {
                      aendere(z.schluessel, { variable: e.target.value });
                    }}
                  />
                </td>
                <td className="mengen__ergebnis" aria-live="polite">
                  {textform ? (
                    <span className="mengen__textform-hinweis">{texte.textformKurz}</span>
                  ) : fehler ? (
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
              <span className="mengen__einheit">{ziel.einheit ?? ''}</span>
              {ergebnis.summe === null && mitZeilen ? (
                <span className="mengen__nur-sr"> {texte.summeFehler}</span>
              ) : null}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
      {direkteMenge ? (
        <div className="mengen__direkt">
          <label htmlFor={direktId}>{texte.direkt.label}</label>
          <input
            ref={(el) => {
              direktFeld.current = el;
              if (vonHand) erstes.current = el;
            }}
            id={direktId}
            type="text"
            inputMode="decimal"
            className="tx-eingabe mengen__direkt-feld"
            spellCheck={false}
            autoComplete="off"
            disabled={mitZeilen}
            aria-invalid={direktFehler !== null && !mitZeilen ? true : undefined}
            aria-describedby={`${direktId}-hinweis`}
            value={mitZeilen ? '' : direkt}
            onChange={(e) => {
              setDirekt(e.target.value);
              setDirektFehler(null);
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || e.shiftKey || e.altKey || e.metaKey) return;
              e.preventDefault();
              void uebernehmen();
            }}
          />
          <span className="mengen__einheit">{ziel.einheit ?? ''}</span>
          <span
            id={`${direktId}-hinweis`}
            className={
              direktFehler !== null && !mitZeilen
                ? 'mengen__direkt-hinweis mengen__direkt-fehler'
                : 'mengen__direkt-hinweis'
            }
            role="status"
          >
            {mitZeilen ? texte.direkt.ausAnsatz : (direktFehler ?? texte.direkt.hinweis)}
          </span>
        </div>
      ) : null}
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
