// SPDX-License-Identifier: AGPL-3.0-or-later
import { ToastAnbieter } from '@tethys/ui-basis';
import type {
  AuftragsLeistungsverzeichnisId, // Ticket 64
  LeistungsverzeichnisId,
  LvStandId,
  ProjektId,
} from '@tethys/vertrag';
import { Suspense, lazy } from 'react';
import type { ReactElement } from 'react';
import { AbrechnungSeite } from './abrechnung/AbrechnungSeite'; // Ticket 87
import { abrechnungsseite } from './abrechnung/pfad'; // Ticket 87
import { texte as abrechnungTexte } from './abrechnung/texte'; // Ticket 87
import { AuftragsLvSeite } from './auftrag/AuftragsLvSeite'; // Ticket 64
import { BautagebuchSeite } from './bauleitung/BautagebuchSeite'; // Ticket 120
import { MaengelSeite } from './bauleitung/MaengelSeite'; // Ticket 120
import { bauleitungRoute } from './bauleitung/pfad'; // Ticket 120
import { texte as bauleitungTexte } from './bauleitung/texte'; // Ticket 120
import { BauzeitListeSeite } from './bauzeit/BauzeitListeSeite'; // Ticket 118
import { BauzeitenplanSeite } from './bauzeit/BauzeitenplanSeite'; // Ticket 118
import { bauzeitRoute } from './bauzeit/pfad'; // Ticket 118
import { texte as bauzeitTexte } from './bauzeit/texte'; // Ticket 118
import { HistorieAnbieter } from './historie/HistorieAnbieter';
import { HonorarListeSeite } from './honorar/HonorarListeSeite'; // Ticket 119
import { HonorarSeite } from './honorar/HonorarSeite'; // Ticket 119
import { honorarRoute } from './honorar/pfad'; // Ticket 119
import { texte as honorarTexte } from './honorar/texte'; // Ticket 119
import { KostenListeSeite } from './kosten/KostenListeSeite'; // Ticket 89
import { KostenermittlungSeite } from './kosten/KostenermittlungSeite'; // Ticket 89
import { KostenkontrolleSeite } from './kosten/KostenkontrolleSeite'; // Ticket 89
import { kostenRoute } from './kosten/pfad'; // Ticket 89
import { texte as kostenTexte } from './kosten/texte'; // Ticket 89
import { LvSeite } from './lv/LvSeite';
import { LvStandSeite } from './lv/LvStandSeite';
import { ProjektSeite } from './projekt/ProjektSeite';
import { ProjektlisteSeite } from './projekt/ProjektlisteSeite';
import { rechnungsadresse } from './rechnung/pfad'; // Ticket 88
import { RechnungenSeite } from './rechnung/RechnungenSeite'; // Ticket 88
import { SpeicherAnbieter } from './speicher/SpeicherAnbieter';
import { AppAktualisierung } from './sicherung/AppAktualisierung'; // Ticket 62
import { SicherungsAnbieter } from './sicherung/SicherungsAnbieter'; // Ticket 62
import { testpfad } from './testpfad';
import { Huelle } from './ui/Huelle';
import { Platzhalterseite } from './ui/Platzhalterseite';
import { useRoute } from './ui/route';
import { texte } from './ui/texte';
import { PreisspiegelSeite } from './vergabe/PreisspiegelSeite'; // Ticket 63
import { preisspiegelLvId } from './vergabe/pfad';

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
  // Ticket 87: Aufmaßblätter und Soll/Ist eines Auftrags-LV
  const abrechnung = abrechnungsseite(pfad);
  if (abrechnung !== null) {
    return {
      titel: abrechnungTexte.seitentitel,
      inhalt: mitSpeicher(<AbrechnungSeite key={pfad} seite={abrechnung} gehe={gehe} />),
    };
  }
  // Ticket 88: Rechnungen eines Auftrags-LV (Liste und Prüfansicht); dieselbe Seite, damit der Wechsel nicht neu lädt
  const rechnungen = rechnungsadresse(pfad);
  if (rechnungen !== null) {
    return {
      titel: texte.seiten.vergabe.titel,
      inhalt: mitSpeicher(<RechnungenSeite key={rechnungen.auftragsLvId} adresse={rechnungen} gehe={gehe} />),
    };
  }
  // Ticket 64: Auftrags-LV eines Projekts
  const auftrag = /^\/projekt\/([^/]+)\/auftrag\/([^/]+)$/.exec(pfad);
  if (auftrag?.[1] !== undefined && auftrag[2] !== undefined) {
    const projektId = decodeURIComponent(auftrag[1]) as ProjektId;
    const id = decodeURIComponent(auftrag[2]) as AuftragsLeistungsverzeichnisId;
    return {
      titel: texte.seiten.vergabe.titel,
      inhalt: mitSpeicher(<AuftragsLvSeite key={id} projektId={projektId} id={id} gehe={gehe} />),
    };
  }
  // Ticket 89: Kostenermittlungen und Kostenkontrolle eines Projekts
  const kosten = kostenRoute(pfad);
  if (kosten !== null) {
    const seite =
      kosten.art === 'liste' ? (
        <KostenListeSeite key={kosten.projektId} projektId={kosten.projektId} gehe={gehe} />
      ) : kosten.art === 'kontrolle' ? (
        <KostenkontrolleSeite key={kosten.projektId} projektId={kosten.projektId} gehe={gehe} />
      ) : (
        <KostenermittlungSeite key={kosten.id} projektId={kosten.projektId} id={kosten.id} gehe={gehe} />
      );
    return { titel: kostenTexte.projekt.kosten, inhalt: mitSpeicher(seite) };
  }
  // Ticket 119: Honorarberechnungen eines Projekts (Liste und Berechnung)
  const honorar = honorarRoute(pfad);
  if (honorar !== null) {
    const seite =
      honorar.art === 'liste' ? (
        <HonorarListeSeite key={honorar.projektId} projektId={honorar.projektId} gehe={gehe} />
      ) : (
        <HonorarSeite key={honorar.id} projektId={honorar.projektId} id={honorar.id} gehe={gehe} />
      );
    return { titel: honorarTexte.projekt.honorar, inhalt: mitSpeicher(seite) };
  }
  // Ticket 120: Mängel und Bautagebuch eines Projekts
  const bauleitung = bauleitungRoute(pfad);
  if (bauleitung !== null) {
    return bauleitung.art === 'maengel'
      ? {
          titel: bauleitungTexte.projekt.maengel,
          inhalt: mitSpeicher(
            <MaengelSeite key={`m-${bauleitung.projektId}`} projektId={bauleitung.projektId} gehe={gehe} />,
          ),
        }
      : {
          titel: bauleitungTexte.projekt.bautagebuch,
          inhalt: mitSpeicher(
            <BautagebuchSeite
              key={`b-${bauleitung.projektId}`}
              projektId={bauleitung.projektId}
              gehe={gehe}
            />,
          ),
        };
  }
  // Ticket 118: Bauzeitenpläne eines Projekts
  const bauzeit = bauzeitRoute(pfad);
  if (bauzeit !== null) {
    const seite =
      bauzeit.art === 'liste' ? (
        <BauzeitListeSeite key={bauzeit.projektId} projektId={bauzeit.projektId} gehe={gehe} />
      ) : (
        <BauzeitenplanSeite key={bauzeit.id} projektId={bauzeit.projektId} id={bauzeit.id} gehe={gehe} />
      );
    return { titel: bauzeitTexte.projekt.bauzeit, inhalt: mitSpeicher(seite) };
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
  const lvId = preisspiegelLvId(pfad);
  if (lvId !== null) {
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
