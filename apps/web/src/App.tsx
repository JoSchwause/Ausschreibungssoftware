// SPDX-License-Identifier: AGPL-3.0-or-later
import { ToastAnbieter } from '@tethys/ui-basis';
import { Suspense, lazy } from 'react';
import type { ReactElement } from 'react';
import { Huelle } from './ui/Huelle';
import { Platzhalterseite } from './ui/Platzhalterseite';
import { useRoute } from './ui/route';
import { texte } from './ui/texte';

// Die Katalogseite gibt es nur im Dev-Server. Für E2E-Tests wird sie mit VITE_KATALOG=1 in einen
// Build aufgenommen; ein normaler Produktions-Build enthält sie nicht (Konstante wird zur Bauzeit ersetzt).
const MIT_KATALOG = import.meta.env.DEV || import.meta.env.VITE_KATALOG === '1';
const Katalog = MIT_KATALOG ? lazy(() => import('./katalog/Katalog')) : null;

function waehleSeite({ pfad, gehe }: { pfad: string; gehe: (pfad: string) => void }): {
  titel: string;
  inhalt: ReactElement;
} {
  switch (pfad) {
    case '/':
      return { titel: texte.seiten.projekt.titel, inhalt: <Platzhalterseite seite={texte.seiten.projekt} /> };
    case '/lv':
      return { titel: texte.seiten.lv.titel, inhalt: <Platzhalterseite seite={texte.seiten.lv} /> };
    case '/vergabe':
      return { titel: texte.seiten.vergabe.titel, inhalt: <Platzhalterseite seite={texte.seiten.vergabe} /> };
    case '/katalog':
      if (Katalog) {
        return {
          titel: texte.katalog.titel,
          inhalt: (
            <Suspense fallback={null}>
              <Katalog />
            </Suspense>
          ),
        };
      }
      break;
  }
  return {
    titel: texte.seiten.unbekannt.titel,
    inhalt: (
      <div className="seite">
        <h1>{texte.seiten.unbekannt.titel}</h1>
        <p>{texte.seiten.unbekannt.text}</p>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            gehe('/');
          }}
        >
          {texte.seiten.unbekannt.zurueck}
        </a>
      </div>
    ),
  };
}

export function App(): ReactElement {
  const { pfad, gehe } = useRoute();
  const { titel, inhalt } = waehleSeite({ pfad, gehe });
  return (
    <ToastAnbieter>
      <Huelle pfad={pfad} gehe={gehe} mitKatalog={MIT_KATALOG} seitenTitel={titel}>
        {inhalt}
      </Huelle>
    </ToastAnbieter>
  );
}
