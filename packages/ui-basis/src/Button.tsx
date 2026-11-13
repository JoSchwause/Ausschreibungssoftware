// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ComponentPropsWithRef, MouseEvent, ReactElement } from 'react';
import { useWerkzeugeintrag } from './werkzeugablage';

/** React 19: `ref` ist eine normale Eigenschaft und geht an das button-Element (D-26). */
export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variante?: 'primaer' | 'sekundaer' | 'schlicht' | 'gefahr';
  groesse?: 'md' | 'sm';
}

/**
 * Schaltfläche. Innerhalb einer `Werkzeuggruppe` (Ticket 142) zeigt sie sich nicht selbst, sondern erscheint als Punkt
 * im Menü der Gruppe: mit ihrem Inhalt, gesperrt wie sie, `onClick` beim Wählen (ohne Mausereignis, siehe
 * `menueKlick`). Ein `ref` bleibt dort leer.
 */
export function Button({
  variante = 'sekundaer',
  groesse = 'md',
  type = 'button',
  className,
  ...rest
}: ButtonProps): ReactElement | null {
  const imMenue = useWerkzeugeintrag(() => {
    const { onClick } = rest;
    return {
      art: 'knopf',
      inhalt: rest.children,
      waehlen: () => {
        onClick?.(menueKlick());
      },
      gesperrt: rest.disabled === true,
      gefahr: variante === 'gefahr',
      tasten: rest['aria-keyshortcuts'],
      ariaLabel: rest['aria-label'],
      title: rest.title,
      beschreibung: rest['aria-describedby'],
    };
  });
  if (imMenue) return null;

  const klassen = ['tx-button', `tx-button--${variante}`, groesse === 'sm' ? 'tx-button--sm' : '', className]
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={klassen} {...rest} />;
}

/**
 * Ersatz für das Mausereignis, wenn eine Schaltfläche aus einem Menü gewählt wird: Gewählt wird mit Maus oder Tastatur
 * am Menüpunkt, nicht am Knopf. Das Ereignis trägt kein Ziel; Verhindern und Anhalten wirken nicht.
 */
function menueKlick(): MouseEvent<HTMLButtonElement> {
  const ohneWirkung = (): void => undefined;
  const ersatz = {
    nativeEvent: new globalThis.MouseEvent('click'),
    type: 'click',
    target: null,
    currentTarget: null,
    detail: 0,
    button: 0,
    buttons: 0,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    defaultPrevented: false,
    isDefaultPrevented: () => false,
    isPropagationStopped: () => false,
    preventDefault: ohneWirkung,
    stopPropagation: ohneWirkung,
    persist: ohneWirkung,
  };
  return ersatz as unknown as MouseEvent<HTMLButtonElement>;
}

export interface TastenkuerzelProps {
  /** Tasten in Reihenfolge, z. B. `['Strg', 'S']`. */
  tasten: readonly string[];
}

/** Zeigt ein Tastaturkürzel als Hinweis, z. B. neben einem Menüeintrag oder Button. */
export function Tastenkuerzel({ tasten }: TastenkuerzelProps): ReactElement {
  return (
    <span className="tx-kbd-gruppe" aria-hidden="true">
      {tasten.map((taste, i) => (
        <kbd key={`${String(i)}-${taste}`} className="tx-kbd">
          {taste}
        </kbd>
      ))}
    </span>
  );
}
