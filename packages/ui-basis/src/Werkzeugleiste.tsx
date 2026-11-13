// SPDX-License-Identifier: AGPL-3.0-or-later
// Werkzeugleiste mit Gruppen (Ticket 142, U1, U3): eine Zeile aus Schaltflächen und Werkzeuggruppen; eine Gruppe ist
// ein Menü (Radix Dropdown Menu). Schaltflächen (`Button`) und Verweise (`Werkzeugverweis`) innerhalb einer Gruppe
// erscheinen als ihre Menüpunkte; die Bausteine selbst bleiben im Baum (unsichtbar), damit ihr Zustand und ihre Dialoge
// bestehen bleiben. Tastatur: Tab erreicht jedes Element der Leiste, Pfeil links/rechts wandert zwischen ihnen, Enter,
// Leertaste oder Pfeil ab öffnet ein Menü, Pfeile wählen, Enter führt aus, Escape schließt.

import * as Menue from '@radix-ui/react-dropdown-menu';
import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent, MouseEvent, ReactElement, ReactNode } from 'react';
import { Icon } from './Icon';
import { Ablagekontext, neueWerkzeugablage, useWerkzeugeintrag } from './werkzeugablage';
import type { Werkzeugablage } from './werkzeugablage';

export interface WerkzeugleisteProps {
  /** Zugänglicher Name der Leiste. */
  beschriftung: string;
  children?: ReactNode;
  className?: string;
}

/** Bedienbare Elemente der Leiste selbst, ohne den unsichtbaren Inhalt der Gruppen und ohne gesperrte. */
function bedienelemente(leiste: HTMLElement): HTMLElement[] {
  return [...leiste.querySelectorAll<HTMLElement>('button, a[href]')].filter(
    (e) => e.closest('[hidden]') === null && !(e instanceof HTMLButtonElement && e.disabled),
  );
}

export function Werkzeugleiste({ beschriftung, children, className }: WerkzeugleisteProps): ReactElement {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
    // Nur zwischen den Elementen der Leiste; Tasten aus Menüs und Dialogen der Gruppen (Portale) bleiben unberührt.
    const ziele = bedienelemente(e.currentTarget);
    const i = ziele.findIndex((z) => z === e.target);
    if (i < 0) return;
    const neu =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? ziele.length - 1
          : Math.min(ziele.length - 1, Math.max(0, i + (e.key === 'ArrowLeft' ? -1 : 1)));
    e.preventDefault();
    ziele[neu]?.focus();
  };
  return (
    <div
      role="toolbar"
      aria-label={beschriftung}
      className={['tx-werkzeugleiste', className].filter(Boolean).join(' ')}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
}

export interface WerkzeuggruppeProps {
  /** Sichtbare Beschriftung des Auslösers. */
  titel: ReactNode;
  /** Zugänglicher Name des Auslösers, wenn `titel` ihn nicht trägt (z. B. „…“). */
  beschriftung?: string;
  /** Ausrichtung des Menüs am Auslöser; Standard: am Anfang. */
  ausrichtung?: 'start' | 'end';
  /** Pfeil hinter dem Titel; Standard ja (ohne für „…“). */
  pfeil?: boolean;
  /** Schaltflächen und Verweise der Gruppe (auch in Bausteinen der App, die sie samt Dialog mitbringen). */
  children?: ReactNode;
}

export function Werkzeuggruppe({
  titel,
  beschriftung,
  ausrichtung = 'start',
  pfeil = true,
  children,
}: WerkzeuggruppeProps): ReactElement {
  const ablage = useMemo(neueWerkzeugablage, []);
  const [offen, setOffen] = useState(false);
  const ausloeser = useRef<HTMLButtonElement>(null);
  // Die Aktion eines gewählten Punkts läuft erst, wenn das Menü zu ist und der Fokus wieder auf dem Auslöser steht:
  // Ein Dialog, den sie öffnet, gibt den Fokus beim Schließen dorthin zurück.
  const danach = useRef<(() => void) | null>(null);
  return (
    <>
      <Ablagekontext.Provider value={ablage}>
        <div hidden className="tx-werkzeuggruppe__ablage">
          {children}
        </div>
      </Ablagekontext.Provider>
      <Menue.Root open={offen} onOpenChange={setOffen} modal={false}>
        <Menue.Trigger asChild>
          <button
            ref={ausloeser}
            type="button"
            className={`tx-button tx-button--sekundaer tx-werkzeuggruppe${pfeil ? ' tx-werkzeuggruppe--pfeil' : ''}`}
            {...(beschriftung === undefined ? {} : { 'aria-label': beschriftung })}
          >
            {titel}
            {pfeil ? <Icon name="pfeilUnten" groesse={14} /> : null}
          </button>
        </Menue.Trigger>
        <Menue.Portal>
          <Menue.Content
            className="tx-menue"
            align={ausrichtung}
            sideOffset={4}
            loop
            onCloseAutoFocus={(e) => {
              const aktion = danach.current;
              if (aktion === null) return;
              danach.current = null;
              e.preventDefault();
              ausloeser.current?.focus();
              aktion();
            }}
          >
            <Menuepunkte
              ablage={ablage}
              onWahl={(aktion) => {
                danach.current = aktion;
              }}
              schliessen={() => {
                setOffen(false);
              }}
            />
          </Menue.Content>
        </Menue.Portal>
      </Menue.Root>
    </>
  );
}

function Menuepunkte({
  ablage,
  onWahl,
  schliessen,
}: {
  ablage: Werkzeugablage;
  onWahl: (aktion: () => void) => void;
  schliessen: () => void;
}): ReactElement {
  const eintraege = useSyncExternalStore(ablage.abonnieren, ablage.lesen, ablage.lesen);
  return (
    <>
      {eintraege.map(([id, e]) =>
        e.art === 'knopf' ? (
          <Menue.Item
            key={id}
            className={e.gefahr ? 'tx-menue__punkt tx-menue__punkt--gefahr' : 'tx-menue__punkt'}
            disabled={e.gesperrt}
            {...(e.tasten === undefined ? {} : { 'aria-keyshortcuts': e.tasten })}
            {...(e.ariaLabel === undefined ? {} : { 'aria-label': e.ariaLabel })}
            {...(e.beschreibung === undefined ? {} : { 'aria-describedby': e.beschreibung })}
            {...(e.title === undefined ? {} : { title: e.title })}
            onSelect={() => {
              onWahl(e.waehlen);
            }}
          >
            {e.inhalt}
          </Menue.Item>
        ) : (
          <Menue.Item key={id} asChild className="tx-menue__punkt">
            <a
              href={e.href}
              {...(e.ariaLabel === undefined ? {} : { 'aria-label': e.ariaLabel })}
              {...(e.title === undefined ? {} : { title: e.title })}
              onClick={(ereignis) => {
                e.onClick(ereignis);
                // Ein Wechsel in der App verhindert den des Browsers; Radix schließt dann nicht selbst.
                if (ereignis.defaultPrevented) schliessen();
              }}
            >
              {e.inhalt}
            </a>
          </Menue.Item>
        ),
      )}
    </>
  );
}

export interface WerkzeugverweisProps {
  href: string;
  /**
   * Ein einfacher Klick (linke Taste, ohne Zusatztaste) ruft dies statt des Seitenwechsels des Browsers, etwa für einen
   * Wechsel innerhalb der App. Mittelklick und Strg+Klick öffnen weiter einen neuen Tab.
   */
  onFolgen?: () => void;
  children?: ReactNode;
  'aria-label'?: string;
  className?: string;
}

/**
 * Ein Verweis, der in der Leiste wie eine Schaltfläche aussieht und in einer Werkzeuggruppe als Menüpunkt erscheint;
 * in beiden Fällen ein echtes `<a href>`.
 */
export function Werkzeugverweis({
  href,
  onFolgen,
  children,
  'aria-label': ariaLabel,
  className,
}: WerkzeugverweisProps): ReactElement | null {
  const klick = (e: MouseEvent<HTMLAnchorElement>): void => {
    if (onFolgen === undefined || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onFolgen();
  };
  const imMenue = useWerkzeugeintrag(() => ({
    art: 'verweis',
    href,
    onClick: klick,
    inhalt: children,
    ariaLabel,
  }));
  if (imMenue) return null;
  return (
    <a
      href={href}
      className={['tx-button', 'tx-button--sekundaer', 'tx-verweisknopf', className]
        .filter(Boolean)
        .join(' ')}
      {...(ariaLabel === undefined ? {} : { 'aria-label': ariaLabel })}
      onClick={klick}
    >
      {children}
    </a>
  );
}
