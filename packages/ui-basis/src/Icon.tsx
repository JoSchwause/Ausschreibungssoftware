// SPDX-License-Identifier: AGPL-3.0-or-later
// Eigene, einfache Linien-Icons (24er Raster, 1,75 px Strich). Alle Pfade sind für dieses Projekt
// gezeichnet; es gibt keine fremde Icon-Sammlung und keine Anlehnung an Fremdprodukte (U4, L3).

import type { ReactElement, SVGProps } from 'react';

const PFADE = {
  /** Projekt: aufgeschlagene Mappe */
  projekt: 'M4 7h6l2 2h8v10H4zM4 7V5h6l2 2',
  /** Leistungsverzeichnis: Zeilen mit Einzug */
  verzeichnis: 'M5 6h14M9 12h10M9 18h10M5 12h1M5 18h1',
  /** Vergabe: zwei Schalen, eine Waagschale */
  vergabe: 'M12 4v16M6 20h12M5 8h14M5 8l-2 6h4zM19 8l-2 6h4z',
  sonne:
    'M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8zM12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4',
  mond: 'M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z',
  schliessen: 'M6 6l12 12M18 6L6 18',
  haken: 'M5 12.5l4.5 4.5L19 7.5',
  pfeilUnten: 'M6 9.5l6 6l6-6',
  pfeilOben: 'M6 14.5l6-6l6 6',
  warnung: 'M12 4l9 16H3zM12 10v4M12 17v.5',
  info: 'M12 4a8 8 0 1 0 0 16a8 8 0 0 0 0-16zM12 11v5M12 8v.5',
  /** Aufzählung: drei Punkte mit Zeilen */
  aufzaehlung: 'M9 6h11M9 12h11M9 18h11M4.5 6h.5M4.5 12h.5M4.5 18h.5',
  /** Nummerierte Liste: Ziffern 1 und 2 mit Zeilen */
  nummeriert: 'M10 7h10M10 17h10M4 5.5l1.5-1v5M3.5 14.5a1.5 1.5 0 1 1 2.5 1.2L3.5 19.5h3',
  /** Tabelle: Rahmen mit Zeilen- und Spaltenlinien */
  tabelle: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14',
} as const;

export type IconName = keyof typeof PFADE;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  /** Kantenlänge in Pixeln; Standard 16. */
  groesse?: number;
}

/** Dekoratives Icon; Beschriftung steht immer im umgebenden Element (aria-hidden). */
export function Icon({ name, groesse = 16, ...rest }: IconProps): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width={groesse}
      height={groesse}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PFADE[name]} />
    </svg>
  );
}
