// SPDX-License-Identifier: AGPL-3.0-or-later
// Prüf-Panel (U5, U6; Ticket 47): die Befunde der formalen LV-Prüfung, gruppiert nach Schwere. Jeder Eintrag ist ein
// Sprunglink. Tastatur (U3, U8): F8 springt ins Panel (die App ruft `fokussieren`), Pfeile wandern durch die Einträge,
// Enter springt, Escape blendet es aus. Ticket 142: Das Panel ist beim Öffnen der Seite ausgeblendet, damit das Grid die
// ganze Breite hat; die Schaltfläche „Prüfung“ der Werkzeugleiste (`PruefKnopf`) zeigt die Zahl der Befunde und blendet
// es ein und aus.

import { Button, Icon, Tastenkuerzel } from '@tethys/ui-basis';
import type { Pruefbefund } from '@tethys/vertrag';
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import type { KeyboardEvent, ReactElement, RefObject } from 'react';
import { pruefstand, type Pruefgruppe } from './pruefung';
import { texte } from './texte';

const t = texte.pruefung;

export interface PruefPanelSteuerung {
  /** Fokus auf den ersten Eintrag (oder das Schließen-Kreuz, wenn es keine Einträge gibt); blendet das Panel ein. */
  fokussieren(): void;
}

export interface PruefPanelProps {
  /** Kennung des Panels, für `aria-controls` der Schaltfläche. */
  id: string;
  gruppen: readonly Pruefgruppe[];
  /** `false`, solange die erste Prüfung noch aussteht. */
  geprueft: boolean;
  offen: boolean;
  onOffenChange: (offen: boolean) => void;
  onSprung: (b: Pruefbefund) => void;
  /** Bekommt den Fokus, wenn das Panel aus sich heraus ausgeblendet wird (die Schaltfläche der Werkzeugleiste). */
  zurueck?: RefObject<HTMLElement | null>;
}

export const PruefPanel = forwardRef<PruefPanelSteuerung, PruefPanelProps>(function PruefPanel(
  { id, gruppen, geprueft, offen, onOffenChange, onSprung, zurueck },
  ref,
): ReactElement | null {
  const liste = useRef<HTMLDivElement>(null);
  const schliessenKnopf = useRef<HTMLButtonElement>(null);
  const { anzahl } = pruefstand(gruppen);
  const eintraege = (): HTMLButtonElement[] => [
    ...(liste.current?.querySelectorAll<HTMLButtonElement>('[data-pruefeintrag]') ?? []),
  ];

  // Der Fokus geht mit dem Tastendruck (bzw. Klick) selbst ins Panel, nicht erst im nächsten Bild: Bei langsamen Bildern
  // käme ein verspäteter Fokus erst an, nachdem der Nutzer schon zu einem anderen Eintrag gewechselt ist, und nähme ihm
  // den wieder weg. Ist das Panel zu, fokussiert der Effekt gleich nach dem Aufklappen; React schreibt das Aufklappen
  // aus einem Tastendruck oder Klick fest, bevor das nächste Ereignis kommt.
  const fokusNachAufklappen = useRef(false);
  const ersterEintragFokussieren = (): void => {
    (eintraege()[0] ?? schliessenKnopf.current)?.focus();
  };
  useLayoutEffect(() => {
    if (!offen || !fokusNachAufklappen.current) return;
    fokusNachAufklappen.current = false;
    ersterEintragFokussieren();
  });

  useImperativeHandle(ref, () => ({
    fokussieren() {
      if (offen) {
        ersterEintragFokussieren();
        return;
      }
      fokusNachAufklappen.current = true;
      onOffenChange(true);
    },
  }));

  const ausblenden = (): void => {
    onOffenChange(false);
    zurueck?.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>): void => {
    if (e.key === 'Escape' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      ausblenden();
      return;
    }
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

  if (!offen) return null;
  let lauf = 0;
  return (
    <aside id={id} className="lv-pruefung" aria-label={t.panel} onKeyDown={onKeyDown}>
      <div className="lv-pruefung__kopf">
        <span className="lv-pruefung__titel">{t.titel}</span>
        <span className="lv-pruefung__anzahl">{geprueft ? String(anzahl) : '…'}</span>
        <button
          ref={schliessenKnopf}
          type="button"
          className="tx-icon-button lv-pruefung__schliessen"
          aria-label={t.ausblenden}
          onClick={ausblenden}
        >
          <Icon name="schliessen" groesse={14} />
        </button>
      </div>
      <div className="lv-pruefung__liste" ref={liste}>
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
    </aside>
  );
});

/**
 * Schaltfläche „Prüfung“ für die Werkzeugleiste: Zahl der Befunde (die Farbe nennt die schwerste Schwere, der Text
 * zählt), blendet das Panel ein und aus; F8 springt hinein.
 */
export function PruefKnopf({
  panelId,
  gruppen,
  geprueft,
  offen,
  onOffenChange,
  knopf,
}: {
  panelId: string;
  gruppen: readonly Pruefgruppe[];
  geprueft: boolean;
  offen: boolean;
  onOffenChange: (offen: boolean) => void;
  knopf?: RefObject<HTMLButtonElement | null>;
}): ReactElement | null {
  const { anzahl, schwerste } = pruefstand(gruppen);
  return (
    <Button
      ref={knopf}
      className="lv-pruefknopf"
      aria-expanded={offen}
      {...(offen ? { 'aria-controls': panelId } : {})}
      aria-keyshortcuts="F8"
      onClick={() => {
        onOffenChange(!offen);
      }}
    >
      {t.titel}
      <span
        className="lv-pruefung__zahl"
        data-anzahl={geprueft ? anzahl : undefined}
        data-schwere={geprueft ? (schwerste ?? 'keine') : undefined}
      >
        {geprueft ? String(anzahl) : '…'}
      </span>
      <Tastenkuerzel tasten={t.tasten} />
    </Button>
  );
}
