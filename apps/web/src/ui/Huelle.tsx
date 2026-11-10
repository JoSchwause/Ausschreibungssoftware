// SPDX-License-Identifier: AGPL-3.0-or-later
// App-Hülle: Navigationsleiste links mit Wortmarke, Kopfzeile, Arbeitsfläche, Statuszeile.
// Die Einträge sind Platzhalter ohne Fachlogik (Ticket 20).

import { Icon, Tooltip } from '@tethys/ui-basis';
import type { IconName } from '@tethys/ui-basis';
import type { MouseEvent, ReactElement, ReactNode } from 'react';
import { useZuSchmal } from './mindestbreite';
import { useModus } from './modus';
import { hrefFuer } from './route';
import { texte } from './texte';
import './huelle.css';

interface Eintrag {
  pfad: string;
  label: string;
  icon: IconName;
}

const EINTRAEGE: readonly Eintrag[] = [
  { pfad: '/', label: texte.huelle.eintraege.projekt, icon: 'projekt' },
  { pfad: '/lv', label: texte.huelle.eintraege.lv, icon: 'verzeichnis' },
  { pfad: '/vergabe', label: texte.huelle.eintraege.vergabe, icon: 'vergabe' },
];

const KATALOG_EINTRAG: Eintrag = { pfad: '/katalog', label: texte.huelle.eintraege.katalog, icon: 'info' };

/** Eigene Wortmarke: drei Wellenlinien, die an die Titanin der Meere erinnern. */
function Wortmarke(): ReactElement {
  return (
    <span className="huelle__marke">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
        <rect width="24" height="24" rx="5" fill="var(--tx-color-accent)" />
        <path
          d="M4 8.5c2-2 4-2 6 0s4 2 6 0 3-1.5 4-1M4 13c2-2 4-2 6 0s4 2 6 0 3-1.5 4-1M4 17.500c2-2 4-2 6 0s4 2 6 0 3-1.5 4-1"
          fill="none"
          stroke="var(--tx-color-accent-contrast)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <span className="huelle__name">{texte.produkt}</span>
    </span>
  );
}

export interface HuelleProps {
  pfad: string;
  gehe: (pfad: string) => void;
  /** Zeigt den Eintrag zur Katalogseite (nur im Entwicklungs-Build). */
  mitKatalog: boolean;
  seitenTitel: string;
  children: ReactNode;
}

export function Huelle({ pfad, gehe, mitKatalog, seitenTitel, children }: HuelleProps): ReactElement {
  const zuSchmal = useZuSchmal();
  const { modus, wechsle } = useModus();
  const eintraege = mitKatalog ? [...EINTRAEGE, KATALOG_EINTRAG] : EINTRAEGE;

  const klick = (e: MouseEvent<HTMLAnchorElement>, ziel: string) => {
    // Neuer Tab, Strg/Meta-Klick und mittlere Maustaste behalten ihr Browserverhalten.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    gehe(ziel);
  };

  return (
    <div className="huelle-wurzel">
      {zuSchmal ? (
        <div className="huelle__zuschmal" role="status">
          <Icon name="warnung" />
          <span>
            <strong>{texte.huelle.zuSchmal.titel}</strong> {texte.huelle.zuSchmal.text}
          </span>
        </div>
      ) : null}
      <div className="huelle">
        <aside className="huelle__leiste">
          <Wortmarke />
          <nav aria-label={texte.huelle.navigation}>
            <ul className="huelle__liste">
              {eintraege.map((e) => {
                const aktiv = e.pfad === pfad;
                const istKatalog = e === KATALOG_EINTRAG;
                return (
                  <li key={e.pfad} className={istKatalog ? 'huelle__trenner' : undefined}>
                    <a
                      className="huelle__eintrag"
                      href={hrefFuer(e.pfad)}
                      aria-current={aktiv ? 'page' : undefined}
                      onClick={(ev) => {
                        klick(ev, e.pfad);
                      }}
                    >
                      <Icon name={e.icon} />
                      <span>{e.label}</span>
                      {istKatalog ? (
                        <span className="huelle__plakette">{texte.huelle.katalogHinweis}</span>
                      ) : null}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
        <header className="huelle__kopf">
          <p className="huelle__ort">{seitenTitel}</p>
          <Tooltip text={modus === 'hell' ? texte.huelle.modus.zuDunkel : texte.huelle.modus.zuHell}>
            <button
              type="button"
              className="tx-icon-button"
              aria-label={modus === 'hell' ? texte.huelle.modus.zuDunkel : texte.huelle.modus.zuHell}
              onClick={wechsle}
            >
              <Icon name={modus === 'hell' ? 'mond' : 'sonne'} />
            </button>
          </Tooltip>
        </header>
        <main className="huelle__arbeit" aria-label={texte.huelle.arbeitsflaeche}>
          {children}
        </main>
        <footer className="huelle__status">
          <span>{texte.huelle.status.bereit}</span>
          <span className="huelle__status-rechts">
            {modus === 'hell' ? texte.huelle.status.modusHell : texte.huelle.status.modusDunkel}
          </span>
        </footer>
      </div>
    </div>
  );
}
