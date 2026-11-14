// SPDX-License-Identifier: AGPL-3.0-or-later
import * as RadixToast from '@radix-ui/react-toast';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { baustein } from './texte';

export type ToastArt = 'info' | 'erfolg' | 'warnung' | 'fehler';

export interface ToastInhalt {
  titel: string;
  beschreibung?: string;
  art?: ToastArt;
}

interface ToastEintrag extends ToastInhalt {
  id: number;
}

interface ToastKontext {
  zeige: (inhalt: ToastInhalt) => void;
}

const Kontext = createContext<ToastKontext | null>(null);

/**
 * Offene Auswahlliste (Radix Select) oder offenes Menü (Radix DropdownMenu/ContextMenu). Radix gibt Escape der zuletzt
 * geöffneten Ebene; eine Meldung, die jetzt erschiene, nähme der Liste die Taste weg (D-162.3). Darum wartet sie.
 */
const OFFENE_LISTE = '[role="listbox"][data-state="open"], [role="menu"][data-state="open"]';
const listeOffen = (): boolean =>
  typeof document !== 'undefined' && document.querySelector(OFFENE_LISTE) !== null;

const ICONS: Record<ToastArt, IconName> = {
  info: 'info',
  erfolg: 'haken',
  warnung: 'warnung',
  fehler: 'warnung',
};

export interface ToastAnbieterProps {
  children: ReactNode;
  /** Beschriftung des Bereichs (Radix ersetzt {hotkey} durch F8) und Vorspann der Ansage. */
  meldungLabel?: string;
  bereichLabel?: string;
  schliessenLabel?: string;
}

/**
 * Stellt `useToast()` bereit und rendert die Meldungen oben rechts. F8 springt in den Bereich. Ist eine Auswahlliste oder ein
 * Menü offen, erscheint eine Meldung erst, wenn es zu ist (sie nähme ihm sonst die Escape-Taste, D-162.3).
 */
export function ToastAnbieter({
  children,
  bereichLabel = 'Meldungen ({hotkey})',
  meldungLabel = 'Meldung',
  schliessenLabel = baustein.toastSchliessen,
}: ToastAnbieterProps): ReactElement {
  const [eintraege, setEintraege] = useState<ToastEintrag[]>([]);
  const [wartend, setWartend] = useState<ToastEintrag[]>([]);
  const zaehler = useRef(0);

  const zeige = useCallback((inhalt: ToastInhalt) => {
    zaehler.current += 1;
    const id = zaehler.current;
    if (listeOffen()) setWartend((alt) => [...alt, { ...inhalt, id }]);
    else setEintraege((alt) => [...alt, { ...inhalt, id }]);
  }, []);

  // Wartende Meldungen erscheinen, sobald keine Liste mehr offen ist (beobachtet nur, solange eine wartet).
  useEffect(() => {
    if (wartend.length === 0) return;
    const freigeben = (): boolean => {
      if (listeOffen()) return false;
      setEintraege((alt) => [...alt, ...wartend]);
      setWartend([]);
      return true;
    };
    if (freigeben()) return;
    const beobachter = new MutationObserver(() => {
      if (freigeben()) beobachter.disconnect();
    });
    beobachter.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-state'],
    });
    return () => {
      beobachter.disconnect();
    };
  }, [wartend]);
  const kontext = useMemo(() => ({ zeige }), [zeige]);

  return (
    <Kontext.Provider value={kontext}>
      <RadixToast.Provider swipeDirection="right" duration={6000} label={meldungLabel}>
        {children}
        {eintraege.map((e) => {
          const art = e.art ?? 'info';
          return (
            <RadixToast.Root
              key={e.id}
              className={`tx-toast tx-toast--${art}`}
              onOpenChange={(offen) => {
                if (!offen) setEintraege((alt) => alt.filter((x) => x.id !== e.id));
              }}
            >
              <span className="tx-toast__icon">
                <Icon name={ICONS[art]} />
              </span>
              <div className="tx-toast__text">
                <RadixToast.Title className="tx-toast__titel">{e.titel}</RadixToast.Title>
                {e.beschreibung ? (
                  <RadixToast.Description className="tx-toast__beschreibung">
                    {e.beschreibung}
                  </RadixToast.Description>
                ) : null}
              </div>
              <RadixToast.Close className="tx-icon-button" aria-label={schliessenLabel}>
                <Icon name="schliessen" groesse={14} />
              </RadixToast.Close>
            </RadixToast.Root>
          );
        })}
        <RadixToast.Viewport className="tx-toast-bereich" label={bereichLabel} />
      </RadixToast.Provider>
    </Kontext.Provider>
  );
}

export function useToast(): ToastKontext {
  const k = useContext(Kontext);
  if (!k) throw new Error('useToast braucht einen ToastAnbieter');
  return k;
}
