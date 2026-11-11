// SPDX-License-Identifier: AGPL-3.0-or-later
import { ToastAnbieter } from '@tethys/ui-basis';
import type { LeistungsverzeichnisId, LvStandId, ProjektId } from '@tethys/vertrag';
import { Suspense, lazy } from 'react';
import type { ReactElement } from 'react';
import { HistorieAnbieter } from './historie/HistorieAnbieter';
import { LvSeite } from './lv/LvSeite';
import { LvStandSeite } from './lv/LvStandSeite';
import { ProjektSeite } from './projekt/ProjektSeite';
import { ProjektlisteSeite } from './projekt/ProjektlisteSeite';
import { SpeicherAnbieter } from './speicher/SpeicherAnbieter';
import { AppAktualisierung } from './sicherung/AppAktualisierung'; // Ticket 62
import { SicherungsAnbieter } from './sicherung/SicherungsAnbieter'; // Ticket 62
import { testpfad } from './testpfad';
import { Huelle } from './ui/Huelle';
import { Platzhalterseite } from './ui/Platzhalterseite';
import { useRoute } from './ui/route';
import { texte } from './ui/texte';
import { PreisspiegelSeite } from './vergabe/PreisspiegelSeite'; // Ticket 63

// Die Katalogseite gibt es nur im Dev-Server. Für E2E-Tests wird sie mit VITE_KATALOG=1 in einen
// Build aufgenommen; ein normaler Produktions-Build enthält sie nicht (Konstante wird zur Bauzeit ersetzt).
const MIT_KATALOG = import.meta.env.DEV || import.meta.env.VITE_KATALOG === '1';
const Katalog = MIT_KATALOG ? lazy(() => import('./katalog/Katalog')) : null;

/**
 * Seiten, die den Speicher brauchen: erst nach dem Öffnen (E-14), sonst eine Meldung; mit Rückgängig und Wiederholen
 * (Ticket 48). Alle Seiten stehen an derselben Stelle unter `SpeicherAnbieter`, damit der Speicher und mit ihm der
 * Undo-Stapel der Sitzung jeden Seitenwechsel übersteht.
 */
function mitSpeicher(inhalt: ReactElement): ReactElement {
  return (
    <SpeicherAnbieter {...testpfad}>
      <SicherungsAnbieter>
        {/* Ticket 62 */}
        <HistorieAnbieter>{inhalt}</HistorieAnbieter>
      </SicherungsAnbieter>
    </SpeicherAnbieter>
  );
}

/** Seiten ohne Speicher: sofort sichtbar, der Speicher bleibt im Hintergrund offen. */
function ohneSpeicher(inhalt: ReactElement): ReactElement {
  return (
    <SpeicherAnbieter {...testpfad} mussOffen={false}>
      {inhalt}
    </SpeicherAnbieter>
  );
}

function waehleSeite({ pfad, gehe }: { pfad: string; gehe: (pfad: string) => void }): {
  titel: string;
  inhalt: ReactElement;
} {
  const projekt = /^\/projekt\/([^/]+)$/.exec(pfad);
  if (projekt?.[1] !== undefined) {
    const id = decodeURIComponent(projekt[1]) as ProjektId;
    return {
      titel: texte.seiten.projekt.titel,
      inhalt: mitSpeicher(<ProjektSeite key={id} id={id} gehe={gehe} />),
    };
  }
  const stand = /^\/lv\/([^/]+)\/stand\/([^/]+)$/.exec(pfad);
  if (stand?.[1] !== undefined && stand[2] !== undefined) {
    const lvId = decodeURIComponent(stand[1]) as LeistungsverzeichnisId;
    const standId = decodeURIComponent(stand[2]) as LvStandId;
    return {
      titel: texte.seiten.lv.titel,
      inhalt: mitSpeicher(<LvStandSeite key={standId} lvId={lvId} standId={standId} gehe={gehe} />),
    };
  }
  // Ticket 63: Preisspiegel eines LV
  const preisspiegel = /^\/lv\/([^/]+)\/preisspiegel$/.exec(pfad);
  if (preisspiegel?.[1] !== undefined) {
    const lvId = decodeURIComponent(preisspiegel[1]) as LeistungsverzeichnisId;
    return {
      titel: texte.seiten.vergabe.titel,
      inhalt: mitSpeicher(<PreisspiegelSeite key={lvId} lvId={lvId} gehe={gehe} />),
    };
  }
  const lv = /^\/lv\/([^/]+)$/.exec(pfad);
  if (lv?.[1] !== undefined) {
    const id = decodeURIComponent(lv[1]) as LeistungsverzeichnisId;
    return { titel: texte.seiten.lv.titel, inhalt: mitSpeicher(<LvSeite key={id} id={id} gehe={gehe} />) };
  }
  switch (pfad) {
    case '/':
      return { titel: texte.seiten.projekt.titel, inhalt: mitSpeicher(<ProjektlisteSeite gehe={gehe} />) };
    case '/lv':
      return {
        titel: texte.seiten.lv.titel,
        inhalt: ohneSpeicher(<Platzhalterseite seite={texte.seiten.lv} />),
      };
    case '/vergabe':
      return {
        titel: texte.seiten.vergabe.titel,
        inhalt: ohneSpeicher(<Platzhalterseite seite={texte.seiten.vergabe} />),
      };
    case '/katalog':
      if (Katalog) {
        return {
          titel: texte.huelle.katalogTitel,
          inhalt: ohneSpeicher(
            <Suspense fallback={null}>
              <Katalog />
            </Suspense>,
          ),
        };
      }
      break;
  }
  return {
    titel: texte.seiten.unbekannt.titel,
    inhalt: ohneSpeicher(
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
      </div>,
    ),
  };
}

export function App(): ReactElement {
  const { pfad, gehe } = useRoute();
  const { titel, inhalt } = waehleSeite({ pfad, gehe });
  return (
    <ToastAnbieter>
      <AppAktualisierung /> {/* Ticket 62 */}
      <Huelle pfad={pfad} gehe={gehe} mitKatalog={MIT_KATALOG} seitenTitel={titel}>
        {inhalt}
      </Huelle>
    </ToastAnbieter>
  );
}
