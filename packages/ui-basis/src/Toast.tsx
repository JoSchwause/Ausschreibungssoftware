// SPDX-License-Identifier: AGPL-3.0-or-later
import * as RadixToast from '@radix-ui/react-toast';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
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

const ICONS: Record<ToastArt, IconName> = {
  info: 'info',
  erfolg: 'haken',
  warnung: 'warnung',
  fehler: 'warnung',
};

export interface ToastAnbieterProps {
  children: ReactNode;
  /** Beschriftung des Bereichs für Screenreader. */
  bereichLabel?: string;
  schliessenLabel?: string;
}

/** Stellt `useToast()` bereit und rendert die Meldungen unten rechts. F8 springt in den Bereich. */
export function ToastAnbieter({
  children,
  bereichLabel = 'Meldungen ({hotkey})',
  schliessenLabel = baustein.toastSchliessen,
}: ToastAnbieterProps): ReactElement {
  const [eintraege, setEintraege] = useState<ToastEintrag[]>([]);
  const [zaehler, setZaehler] = useState(0);

  const zeige = useCallback(
    (inhalt: ToastInhalt) => {
      const id = zaehler + 1;
      setZaehler(id);
      setEintraege((alt) => [...alt, { ...inhalt, id }]);
    },
    [zaehler],
  );
  const kontext = useMemo(() => ({ zeige }), [zeige]);

  return (
    <Kontext.Provider value={kontext}>
      <RadixToast.Provider swipeDirection="right" duration={6000} label={bereichLabel}>
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
        <RadixToast.Viewport className="tx-toast-bereich" />
      </RadixToast.Provider>
    </Kontext.Provider>
  );
}

export function useToast(): ToastKontext {
  const k = useContext(Kontext);
  if (!k) throw new Error('useToast braucht einen ToastAnbieter');
  return k;
}
