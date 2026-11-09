// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ButtonHTMLAttributes, ReactElement } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'primaer' | 'sekundaer' | 'schlicht' | 'gefahr';
  groesse?: 'md' | 'sm';
}

export function Button({
  variante = 'sekundaer',
  groesse = 'md',
  type = 'button',
  className,
  ...rest
}: ButtonProps): ReactElement {
  const klassen = ['tx-button', `tx-button--${variante}`, groesse === 'sm' ? 'tx-button--sm' : '', className]
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={klassen} {...rest} />;
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
