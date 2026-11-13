// SPDX-License-Identifier: AGPL-3.0-or-later
import * as RadixDialog from '@radix-ui/react-dialog';
import { useRef } from 'react';
import type { ReactElement, ReactNode, RefObject } from 'react';
import { Icon } from './Icon';
import { baustein } from './texte';

export interface DialogProps {
  offen: boolean;
  onOffenChange: (offen: boolean) => void;
  titel: string;
  beschreibung?: string;
  /** Inhalt des Dialogs. */
  children?: ReactNode;
  /** Schaltflächen unten rechts. */
  fuss?: ReactNode;
  schliessenLabel?: string;
  /**
   * Element, das beim Öffnen den Fokus bekommt (z. B. die Bestätigen-Schaltfläche, damit Enter bestätigt). Ohne
   * Angabe, oder solange die Referenz leer ist, fokussiert Radix das erste fokussierbare Element (das Schließen-Kreuz).
   */
  anfangsfokus?: RefObject<HTMLElement | null>;
}

/**
 * Modaler Dialog auf Radix Dialog: Fokus bleibt im Dialog (Tab), Escape und das Schließen-Kreuz
 * schließen ihn, danach kehrt der Fokus zum Auslöser zurück – außer die App hat ihn beim Schließen schon woandershin
 * gesetzt, etwa ein Sprung aus dem Dialog zu einer Position (Ticket 122; WAI-ARIA: „unless the workflow moves focus“).
 */
export function Dialog({
  offen,
  onOffenChange,
  titel,
  beschreibung,
  children,
  fuss,
  schliessenLabel = baustein.dialogSchliessen,
  anfangsfokus,
}: DialogProps): ReactElement {
  const ausloeser = useRef<HTMLElement | null>(null);
  return (
    <RadixDialog.Root open={offen} onOpenChange={onOffenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="tx-dialog__overlay" />
        <RadixDialog.Content
          className="tx-dialog"
          {...(beschreibung === undefined ? { 'aria-describedby': undefined } : {})}
          onOpenAutoFocus={(e) => {
            // Ohne Radix-Trigger merkt sich der Dialog selbst, wohin der Fokus beim Schließen zurückkehrt.
            const aktiv = document.activeElement;
            ausloeser.current = aktiv instanceof HTMLElement ? aktiv : null;
            const ziel = anfangsfokus?.current;
            if (ziel) {
              e.preventDefault();
              ziel.focus();
            }
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            const jetzt = document.activeElement;
            if (jetzt === null || jetzt === document.body) ausloeser.current?.focus();
          }}
        >
          <header className="tx-dialog__kopf">
            <RadixDialog.Title className="tx-dialog__titel">{titel}</RadixDialog.Title>
            <RadixDialog.Close className="tx-icon-button" aria-label={schliessenLabel}>
              <Icon name="schliessen" />
            </RadixDialog.Close>
          </header>
          {beschreibung ? (
            <RadixDialog.Description className="tx-dialog__beschreibung">
              {beschreibung}
            </RadixDialog.Description>
          ) : null}
          {children ? <div className="tx-dialog__inhalt">{children}</div> : null}
          {fuss ? <footer className="tx-dialog__fuss">{fuss}</footer> : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
