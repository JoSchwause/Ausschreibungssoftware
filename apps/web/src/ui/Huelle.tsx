// SPDX-License-Identifier: AGPL-3.0-or-later
// App-Hülle: Seitenleiste links mit Wortmarke, Kopfzeile mit Brotkrumen, Arbeitsfläche, Statuszeile. Seit Ticket 131 folgt
// die Seitenleiste dem geöffneten Projekt; Kopfzeile, markierter Eintrag und Fenstertitel kommen aus demselben
// Navigationsstand (`navigation.ts`), damit sie nie auseinanderlaufen (B-04). Ticket 147: Die Statuszeile zeigt, ob der
// Browser die Daten dauerhaft hält, und die letzte Sicherung (B-30); der Speicherzustand verweist auf die Hilfe dazu.

import { Icon, Tooltip } from '@tethys/ui-basis';
import type { IconName } from '@tethys/ui-basis';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { MouseEvent, ReactElement, ReactNode } from 'react';
import { hilfePfad } from '../hilfe/pfad';
import { useZuSchmal } from './mindestbreite';
import { useModus } from './modus';
import {
  KEINE_NAMEN,
  SEITENLEISTE,
  bereichsPfad,
  istVorschau,
  navigationsstand,
  type Bereich,
  type Namen,
  type Navigationsstand,
  type Ort,
  type Projektbereich,
} from './navigation';
import type { Navigationsspeicher } from './OrtLader';
import { hrefFuer } from './route';
import { sicherungAnzeige, speicherAnzeige, statuszeile } from './statuszeile';
import { texte } from './texte';
import './huelle.css';

const ICON: Partial<Record<Bereich, IconName>> = {
  projekte: 'projekt',
  hilfe: 'info',
  katalog: 'tabelle',
  uebersicht: 'projekt',
  leistungsverzeichnisse: 'verzeichnis',
  vergabe: 'vergabe',
  kosten: 'tabelle',
};

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

/** Ein Klick wechselt die Seite ohne Neuladen; neuer Tab, Strg/Meta-Klick und mittlere Maustaste bleiben beim Browser. */
function klickHandler(gehe: (pfad: string) => void, ziel: string) {
  return (e: MouseEvent<HTMLAnchorElement>): void => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    gehe(ziel);
  };
}

function Eintrag({
  pfad,
  text,
  icon,
  aktiv,
  gehe,
  plakette,
  eingerueckt = false,
}: {
  pfad: string;
  text: string;
  icon?: IconName | undefined;
  aktiv: boolean;
  gehe: (pfad: string) => void;
  plakette?: string;
  eingerueckt?: boolean;
}): ReactElement {
  return (
    <li>
      <a
        className={eingerueckt ? 'huelle__eintrag huelle__eintrag--unter' : 'huelle__eintrag'}
        href={hrefFuer(pfad)}
        aria-current={aktiv ? 'page' : undefined}
        onClick={klickHandler(gehe, pfad)}
      >
        {icon === undefined ? null : <Icon name={icon} />}
        <span>{text}</span>
        {plakette === undefined ? null : <span className="huelle__plakette">{plakette}</span>}
      </a>
    </li>
  );
}

/** Der Stand, solange die Namen der neuen Seite noch laden: das Projekt bleibt, wenn es dasselbe sein kann. */
function vorlaeufig(ort: Ort, zuletzt: Navigationsstand | null): Namen {
  const p = zuletzt?.projekt ?? null;
  if (ort.projekt === null) return KEINE_NAMEN;
  if (ort.projekt.art === 'id') {
    return {
      projekt: p?.id === ort.projekt.id ? p : { id: ort.projekt.id, name: texte.gegenstand.projekt },
      gegenstaende: new Map(),
    };
  }
  return { projekt: p, gegenstaende: new Map() };
}

export interface HuelleProps {
  pfad: string;
  gehe: (pfad: string) => void;
  /** Zeigt den Eintrag zur Katalogseite (nur im Entwicklungs-Build). */
  mitKatalog: boolean;
  /** Wo die Seite liegt (aus der Adresse). */
  ort: Ort;
  /** Die geladenen Namen der Brotkrumen (`OrtLader`). */
  navigation: Navigationsspeicher;
  children: ReactNode;
}

export function Huelle({ pfad, gehe, mitKatalog, ort, navigation, children }: HuelleProps): ReactElement {
  const zuSchmal = useZuSchmal();
  const { modus, wechsle } = useModus();
  const gemeldet = useSyncExternalStore(navigation.abonnieren, navigation.lesen);
  const stand = useMemo(
    () =>
      gemeldet !== null && gemeldet.pfad === pfad
        ? gemeldet.stand
        : navigationsstand(ort, vorlaeufig(ort, gemeldet?.stand ?? null)),
    [gemeldet, pfad, ort],
  );
  useEffect(() => {
    document.title = stand.titel;
  }, [stand.titel]);
  const status = useSyncExternalStore(statuszeile.abonnieren, statuszeile.lesen);
  // Bis der Speicher antwortet (etwa auf der Hilfeseite, die ihn nicht braucht), fragt die Hülle den Browser selbst.
  useEffect(() => {
    if (statuszeile.lesen().dauerhaft !== undefined) return;
    const verwaltung = (navigator as Partial<Navigator>).storage;
    if (typeof verwaltung?.persisted !== 'function') {
      statuszeile.melden({ dauerhaft: null });
      return;
    }
    verwaltung.persisted().then(
      (p) => {
        if (statuszeile.lesen().dauerhaft === undefined) statuszeile.melden({ dauerhaft: p });
      },
      () => {
        if (statuszeile.lesen().dauerhaft === undefined) statuszeile.melden({ dauerhaft: null });
      },
    );
  }, []);

  const { bereich, projekt } = stand;
  const speicher = speicherAnzeige(status.dauerhaft);
  const sicherung = sicherungAnzeige(status.sicherungen, projekt?.id ?? null);
  const projektEintrag = (b: Projektbereich, eingerueckt: boolean): ReactElement | null =>
    projekt === null ? null : (
      <Eintrag
        key={b}
        pfad={bereichsPfad(b, projekt.id)}
        text={texte.huelle.eintraege[b]}
        icon={eingerueckt ? undefined : ICON[b]}
        aktiv={bereich === b}
        gehe={gehe}
        eingerueckt={eingerueckt}
      />
    );

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
              <Eintrag
                pfad="/"
                text={texte.huelle.eintraege.projekte}
                icon={ICON.projekte}
                aktiv={bereich === 'projekte'}
                gehe={gehe}
              />
              {projekt === null
                ? null
                : SEITENLEISTE.map(({ gruppe, bereiche }, i) =>
                    gruppe === null ? (
                      bereiche.map((b) => projektEintrag(b, false))
                    ) : (
                      <li key={`gruppe-${String(i)}`} className="huelle__gruppe">
                        <span className="huelle__gruppenname">
                          {gruppe === texte.huelle.gruppen.vorschau ? (
                            <span className="huelle__plakette huelle__plakette--vorschau">{gruppe}</span>
                          ) : (
                            gruppe
                          )}
                        </span>
                        <ul className="huelle__liste">{bereiche.map((b) => projektEintrag(b, true))}</ul>
                      </li>
                    ),
                  )}
              <li className="huelle__trenner" aria-hidden="true" />
              <Eintrag
                pfad="/hilfe"
                text={texte.huelle.eintraege.hilfe}
                icon={ICON.hilfe}
                aktiv={bereich === 'hilfe'}
                gehe={gehe}
              />
              {mitKatalog ? (
                <Eintrag
                  pfad="/katalog"
                  text={texte.huelle.eintraege.katalog}
                  icon={ICON.katalog}
                  aktiv={bereich === 'katalog'}
                  gehe={gehe}
                  plakette={texte.huelle.katalogHinweis}
                />
              ) : null}
            </ul>
          </nav>
        </aside>
        <header className="huelle__kopf">
          <nav aria-label={texte.huelle.pfad} className="huelle__pfad">
            <ol className="huelle__krumen">
              {stand.krumen.map((k, i) => (
                <li key={`${String(i)}-${k.text}`}>
                  {k.pfad === null ? (
                    <span className="huelle__krume huelle__krume--hier" aria-current="page">
                      {k.text}
                    </span>
                  ) : (
                    <a className="huelle__krume" href={hrefFuer(k.pfad)} onClick={klickHandler(gehe, k.pfad)}>
                      {k.text}
                    </a>
                  )}
                </li>
              ))}
            </ol>
            {istVorschau(bereich) ? (
              <span className="huelle__vorschau" role="note">
                <span className="huelle__plakette huelle__plakette--vorschau">
                  {texte.vorschau.kennzeichen}
                </span>
                <span className="huelle__vorschautext">
                  {bereich === 'honorar' ? texte.vorschau.honorar : texte.vorschau.hinweis}
                </span>
              </span>
            ) : null}
          </nav>
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
        <footer className="huelle__status" aria-label={texte.huelle.status.name}>
          {speicher === null ? null : (
            <a
              className="huelle__status-teil huelle__status-verweis"
              href={hrefFuer(hilfePfad('daten'))}
              title={speicher.hinweis}
              onClick={klickHandler(gehe, hilfePfad('daten'))}
            >
              {speicher.text}
            </a>
          )}
          {sicherung === null ? null : <span className="huelle__status-teil">{sicherung}</span>}
          <span className="huelle__status-rechts">
            {modus === 'hell' ? texte.huelle.status.modusHell : texte.huelle.status.modusDunkel}
          </span>
        </footer>
      </div>
    </div>
  );
}
