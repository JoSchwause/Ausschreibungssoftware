// SPDX-License-Identifier: AGPL-3.0-or-later
// Prüf-Panel (U5, U6; Ticket 47): die Befunde der formalen LV-Prüfung, gruppiert nach Schwere, mit Zahl im Kopf. Jeder
// Eintrag ist ein Sprunglink. Tastatur (U3, U8): F8 springt ins Panel (die App ruft `fokussieren`), Pfeile wandern durch
// die Einträge, Enter springt. Einklappbar; der Kopf mit der Zahl bleibt sichtbar.

import type { Pruefbefund } from '@tethys/vertrag';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import type { Pruefgruppe } from './pruefung';
import { texte } from './texte';

const t = texte.pruefung;

export interface PruefPanelSteuerung {
  /** Fokus auf den ersten Eintrag (oder den Kopf, wenn es keine Einträge gibt); klappt das Panel auf. */
  fokussieren(): void;
}

export interface PruefPanelProps {
  gruppen: readonly Pruefgruppe[];
  /** `false`, solange die erste Prüfung noch aussteht. */
  geprueft: boolean;
  offen: boolean;
  onOffenChange: (offen: boolean) => void;
  onSprung: (b: Pruefbefund) => void;
}

export const PruefPanel = forwardRef<PruefPanelSteuerung, PruefPanelProps>(function PruefPanel(
  { gruppen, geprueft, offen, onOffenChange, onSprung },
  ref,
): ReactElement {
  const liste = useRef<HTMLDivElement>(null);
  const kopf = useRef<HTMLButtonElement>(null);
  const anzahl = gruppen.reduce((n, g) => n + g.eintraege.length, 0);
  const eintraege = (): HTMLButtonElement[] => [
    ...(liste.current?.querySelectorAll<HTMLButtonElement>('[data-pruefeintrag]') ?? []),
  ];

  useImperativeHandle(ref, () => ({
    fokussieren() {
      if (!offen) onOffenChange(true);
      // Nach dem Aufklappen steht die Liste erst im nächsten Bild.
      requestAnimationFrame(() => {
        (eintraege()[0] ?? kopf.current)?.focus();
      });
    },
  }));

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    const alle = eintraege();
    const i = alle.findIndex((x) => x === document.activeElement);
    if (i < 0) return;
    const ziel =
      e.key === 'ArrowDown'
        ? alle[Math.min(i + 1, alle.length - 1)]
        : e.key === 'ArrowUp'
          ? alle[Math.max(i - 1, 0)]
          : e.key === 'Home'
            ? alle[0]
            : e.key === 'End'
              ? alle.at(-1)
              : undefined;
    if (ziel === undefined) return;
    e.preventDefault();
    ziel.focus();
  };

  let lauf = 0;
  return (
    <aside className={offen ? 'lv-pruefung' : 'lv-pruefung lv-pruefung--zu'} aria-label={t.panel}>
      <div className="lv-pruefung__kopf">
        <button
          ref={kopf}
          type="button"
          className="tx-button tx-button--schlicht tx-button--sm"
          aria-expanded={offen}
          aria-keyshortcuts="F8"
          onClick={() => {
            onOffenChange(!offen);
          }}
        >
          <span className="lv-pruefung__titel">{t.titel}</span>{' '}
          <span className="lv-pruefung__zahl" data-anzahl={anzahl}>
            {geprueft ? String(anzahl) : '…'}
          </span>
        </button>
      </div>
      {offen ? (
        <div className="lv-pruefung__liste" ref={liste} onKeyDown={onKeyDown}>
          {geprueft && anzahl === 0 ? <p className="lv-pruefung__leer">{t.keineBefunde}</p> : null}
          {gruppen.map((g) => (
            <section key={g.schwere} className={`lv-pruefung__gruppe lv-pruefung__gruppe--${g.schwere}`}>
              <h2>
                {t.schwere[g.schwere]} ({String(g.eintraege.length)})
              </h2>
              <ul>
                {g.eintraege.map((e) => {
                  const nr = lauf++;
                  const ort = [e.oz, e.kurztext].filter(Boolean).join(' ') || t.lvWeit;
                  return (
                    <li key={`${String(nr)}-${e.befund.code}`}>
                      <button
                        type="button"
                        className="lv-pruefung__eintrag"
                        data-pruefeintrag=""
                        data-code={e.befund.code}
                        tabIndex={nr === 0 ? 0 : -1}
                        onClick={() => {
                          onSprung(e.befund);
                        }}
                      >
                        <span className="lv-pruefung__ort">{ort}</span>
                        <span className="lv-pruefung__meldung">{e.befund.meldung}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
    </aside>
  );
});
