// SPDX-License-Identifier: AGPL-3.0-or-later
import { ToastAnbieter } from '@tethys/ui-basis';
import type {
  AuftragsLeistungsverzeichnisId, // Ticket 64
  LeistungsverzeichnisId,
  LvStandId,
  ProjektId,
} from '@tethys/vertrag';
import { Suspense, lazy, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { AbrechnungSeite } from './abrechnung/AbrechnungSeite'; // Ticket 87
import { abrechnungsseite, aufmassPfad, blattPfad, sollIstPfad } from './abrechnung/pfad'; // Ticket 87
import { AuftragsLvSeite } from './auftrag/AuftragsLvSeite'; // Ticket 64
import { auftragPfad } from './auftrag/ziel';
import { BautagebuchSeite } from './bauleitung/BautagebuchSeite'; // Ticket 120
import { MaengelSeite } from './bauleitung/MaengelSeite'; // Ticket 120
import { bauleitungRoute } from './bauleitung/pfad'; // Ticket 120
import { BauzeitListeSeite } from './bauzeit/BauzeitListeSeite'; // Ticket 118
import { BauzeitenplanSeite } from './bauzeit/BauzeitenplanSeite'; // Ticket 118
import { bauzeitRoute, bauzeitenplanPfad } from './bauzeit/pfad'; // Ticket 118
import { ModellListeSeite } from './bim/ModellListeSeite'; // Ticket 114
import { bimRoute, modellPfad } from './bim/pfad'; // Ticket 114
import { HilfeSeite } from './hilfe/HilfeSeite'; // Ticket 131: Zielseite, Ticket 147 füllt sie
import { HistorieAnbieter } from './historie/HistorieAnbieter';
import { HonorarListeSeite } from './honorar/HonorarListeSeite'; // Ticket 119
import { HonorarSeite } from './honorar/HonorarSeite'; // Ticket 119
import { honorarRoute, honorarberechnungPfad } from './honorar/pfad'; // Ticket 119
import { KostenListeSeite } from './kosten/KostenListeSeite'; // Ticket 89
import { KostenermittlungSeite } from './kosten/KostenermittlungSeite'; // Ticket 89
import { KostenkontrolleSeite } from './kosten/KostenkontrolleSeite'; // Ticket 89
import { kontrollePfad, kostenRoute, kostenermittlungPfad } from './kosten/pfad'; // Ticket 89
import { LvSeite } from './lv/LvSeite';
import { LvStandSeite } from './lv/LvStandSeite';
import { vergleichPfad, vergleichRoute } from './modellvergleich/pfad'; // Ticket 116
import { ProjektbereichSeite } from './projekt/ProjektbereichSeite'; // Ticket 131
import { ProjektSeite } from './projekt/ProjektSeite';
import { ProjektlisteSeite } from './projekt/ProjektlisteSeite';
import { rechnungPfad, rechnungenPfad, rechnungsadresse } from './rechnung/pfad'; // Ticket 88
import { RechnungenSeite } from './rechnung/RechnungenSeite'; // Ticket 88
import { SpeicherAnbieter } from './speicher/SpeicherAnbieter';
import { AppAktualisierung } from './sicherung/AppAktualisierung'; // Ticket 62
import { SicherungsAnbieter } from './sicherung/SicherungsAnbieter'; // Ticket 62
import { testpfad } from './testpfad';
import { Huelle } from './ui/Huelle';
import { festerOrt, projektlistenRoute, type Ort, type Ortskrume } from './ui/navigation';
import { Navigationsspeicher, OrtLader } from './ui/OrtLader';
import { useRoute } from './ui/route';
import { texte } from './ui/texte';
import { Verweis } from './ui/Verweis';
import { PreisspiegelSeite } from './vergabe/PreisspiegelSeite'; // Ticket 63
import { preisspiegelLvId, preisspiegelPfad } from './vergabe/pfad';

// Die Katalogseite gibt es nur im Dev-Server. Für E2E-Tests wird sie mit VITE_KATALOG=1 in einen
// Build aufgenommen; ein normaler Produktions-Build enthält sie nicht (Konstante wird zur Bauzeit ersetzt).
const MIT_KATALOG = import.meta.env.DEV || import.meta.env.VITE_KATALOG === '1';
const Katalog = MIT_KATALOG ? lazy(() => import('./katalog/Katalog')) : null;
// Ticket 114: die Modellseite bringt three.js und web-ifc mit; ihr Bündel lädt erst beim Öffnen.
const ModellSeite = lazy(() => import('./bim/ModellSeite').then((m) => ({ default: m.ModellSeite })));
// Ticket 116: der Modellvergleich bringt ebenfalls three.js mit; eigenes Bündel, lädt erst beim Öffnen.
const ModellvergleichSeite = lazy(() =>
  import('./modellvergleich/ModellvergleichSeite').then((m) => ({ default: m.ModellvergleichSeite })),
);

/** Eine Seite: wo sie liegt (Seitenleiste, Brotkrumen, Titel), ihr Inhalt und ob sie den Speicher braucht. */
interface Seite {
  readonly ort: Ort;
  readonly inhalt: ReactElement;
  /** `false`: Die Seite erscheint sofort, ohne auf den Speicher zu warten (E-14). */
  readonly speicher?: false;
}

type Gehe = (pfad: string) => void;

const lvPfad = (id: LeistungsverzeichnisId): string => `/lv/${id}`;

/** Ein Ort in einem Projekt mit Bereich der Seitenleiste und Krumen nach „Projekte › Projekt › Bereich“. */
const imProjekt = (
  projektId: ProjektId,
  bereich: Ort['bereich'],
  krumen: readonly Ortskrume[] = [],
): Ort => ({
  bereich,
  projekt: { art: 'id', id: projektId },
  krumen,
});

/** Ein Ort unter einem LV; das Projekt findet `OrtLader` über das LV. */
const imLv = (lvId: LeistungsverzeichnisId, bereich: Ort['bereich'], krumen: readonly Ortskrume[]): Ort => ({
  bereich,
  projekt: { art: 'lv', lvId },
  krumen: [{ teil: { art: 'lv', id: lvId }, pfad: lvPfad(lvId) }, ...krumen],
});

const text = (t: string, pfad: string): Ortskrume => ({ teil: { art: 'text', text: t }, pfad });

/**
 * Die Seiten der App als Regeln: Jede erkennt ihre Adressen und beschreibt Ort und Inhalt; die erste passende gilt. Ticket
 * 131: eine Tabelle statt verschachtelter Weichen, die Wahl zwischen Liste und Gegenstand trifft je Bereich ein Ausdruck.
 */
const REGELN: readonly ((pfad: string, gehe: Gehe) => Seite | null)[] = [
  (pfad, gehe) => {
    const m = /^\/projekt\/([^/]+)$/.exec(pfad);
    if (m?.[1] === undefined) return null;
    const id = decodeURIComponent(m[1]) as ProjektId;
    return {
      ort: { ...imProjekt(id, 'uebersicht'), seite: texte.seite.uebersicht },
      inhalt: <ProjektSeite key={id} id={id} gehe={gehe} />,
    };
  },
  // Ticket 131: Listen je Projekt für die Seitenleiste (LVs, Vergabe, Auftrags-LVs, Nachträge, Aufmaß, Rechnungen)
  (pfad, gehe) => {
    const r = projektlistenRoute(pfad);
    if (r === null) return null;
    return {
      ort: imProjekt(r.projektId, r.art),
      inhalt: <ProjektbereichSeite key={pfad} art={r.art} projektId={r.projektId} gehe={gehe} />,
    };
  },
  // Ticket 87: Aufmaßblätter und Soll/Ist eines Auftrags-LV
  (pfad, gehe) => {
    const a = abrechnungsseite(pfad);
    if (a === null) return null;
    const auftrag: Ortskrume = {
      teil: { art: 'auftragsLv', id: a.auftragsLvId },
      pfad: aufmassPfad(a.projektId, a.auftragsLvId),
    };
    const krumen: readonly Ortskrume[] =
      a.art === 'blatt'
        ? [
            auftrag,
            {
              teil: { art: 'aufmass', auftragsLvId: a.auftragsLvId, id: a.aufmassId },
              pfad: blattPfad(a.projektId, a.auftragsLvId, a.aufmassId),
            },
          ]
        : a.art === 'soll-ist'
          ? [auftrag, text(texte.seite.sollIst, sollIstPfad(a.projektId, a.auftragsLvId))]
          : [auftrag];
    return {
      ort: imProjekt(a.projektId, 'aufmass', krumen),
      inhalt: <AbrechnungSeite key={pfad} seite={a} gehe={gehe} />,
    };
  },
  // Ticket 88: Rechnungen eines Auftrags-LV (Liste und Prüfansicht); dieselbe Seite, damit der Wechsel nicht neu lädt
  (pfad, gehe) => {
    const r = rechnungsadresse(pfad);
    if (r === null) return null;
    const krumen: Ortskrume[] = [
      { teil: { art: 'auftragsLv', id: r.auftragsLvId }, pfad: rechnungenPfad(r.projektId, r.auftragsLvId) },
    ];
    if (r.rechnungId !== null) {
      krumen.push({
        teil: { art: 'rechnung', auftragsLvId: r.auftragsLvId, id: r.rechnungId },
        pfad: rechnungPfad(r.projektId, r.auftragsLvId, r.rechnungId),
      });
    }
    return {
      ort: imProjekt(r.projektId, 'rechnungen', krumen),
      inhalt: <RechnungenSeite key={r.auftragsLvId} adresse={r} gehe={gehe} />,
    };
  },
  // Ticket 64: Auftrags-LV eines Projekts
  (pfad, gehe) => {
    const m = /^\/projekt\/([^/]+)\/auftrag\/([^/]+)$/.exec(pfad);
    if (m?.[1] === undefined || m[2] === undefined) return null;
    const projektId = decodeURIComponent(m[1]) as ProjektId;
    const id = decodeURIComponent(m[2]) as AuftragsLeistungsverzeichnisId;
    return {
      ort: imProjekt(projektId, 'auftraege', [
        { teil: { art: 'auftragsLv', id }, pfad: auftragPfad(projektId, id) },
      ]),
      inhalt: <AuftragsLvSeite key={id} projektId={projektId} id={id} gehe={gehe} />,
    };
  },
  // Ticket 89: Kostenermittlungen und Kostenkontrolle eines Projekts
  (pfad, gehe) => {
    const k = kostenRoute(pfad);
    if (k === null) return null;
    const p = k.projektId;
    if (k.art === 'liste') {
      return { ort: imProjekt(p, 'kosten'), inhalt: <KostenListeSeite key={p} projektId={p} gehe={gehe} /> };
    }
    if (k.art === 'kontrolle') {
      return {
        ort: imProjekt(p, 'kosten', [text(texte.seite.kostenkontrolle, kontrollePfad(p))]),
        inhalt: <KostenkontrolleSeite key={p} projektId={p} gehe={gehe} />,
      };
    }
    return {
      ort: imProjekt(p, 'kosten', [
        { teil: { art: 'kostenermittlung', id: k.id }, pfad: kostenermittlungPfad(p, k.id) },
      ]),
      inhalt: <KostenermittlungSeite key={k.id} projektId={p} id={k.id} gehe={gehe} />,
    };
  },
  // Ticket 119: Honorarberechnungen eines Projekts (Liste und Berechnung)
  (pfad, gehe) => {
    const h = honorarRoute(pfad);
    if (h === null) return null;
    const p = h.projektId;
    return h.art === 'liste'
      ? { ort: imProjekt(p, 'honorar'), inhalt: <HonorarListeSeite key={p} projektId={p} gehe={gehe} /> }
      : {
          ort: imProjekt(p, 'honorar', [
            { teil: { art: 'honorarberechnung', id: h.id }, pfad: honorarberechnungPfad(p, h.id) },
          ]),
          inhalt: <HonorarSeite key={h.id} projektId={p} id={h.id} gehe={gehe} />,
        };
  },
  // Ticket 120: Mängel und Bautagebuch eines Projekts
  (pfad, gehe) => {
    const b = bauleitungRoute(pfad);
    if (b === null) return null;
    const p = b.projektId;
    return b.art === 'maengel'
      ? { ort: imProjekt(p, 'maengel'), inhalt: <MaengelSeite key={`m-${p}`} projektId={p} gehe={gehe} /> }
      : {
          ort: imProjekt(p, 'bautagebuch'),
          inhalt: <BautagebuchSeite key={`b-${p}`} projektId={p} gehe={gehe} />,
        };
  },
  // Ticket 118: Bauzeitenpläne eines Projekts
  (pfad, gehe) => {
    const b = bauzeitRoute(pfad);
    if (b === null) return null;
    const p = b.projektId;
    return b.art === 'liste'
      ? { ort: imProjekt(p, 'bauzeit'), inhalt: <BauzeitListeSeite key={p} projektId={p} gehe={gehe} /> }
      : {
          ort: imProjekt(p, 'bauzeit', [
            { teil: { art: 'bauzeitenplan', id: b.id }, pfad: bauzeitenplanPfad(p, b.id) },
          ]),
          inhalt: <BauzeitenplanSeite key={b.id} projektId={p} id={b.id} gehe={gehe} />,
        };
  },
  // Ticket 116: Vergleich zweier Modellstände (Standard: der Vorgänger)
  (pfad, gehe) => {
    const v = vergleichRoute(pfad);
    if (v === null) return null;
    return {
      ort: imProjekt(v.projektId, 'modelle', [
        { teil: { art: 'modell', id: v.neuId }, pfad: modellPfad(v.projektId, v.neuId) },
        text(texte.seite.vergleich, vergleichPfad(v.projektId, v.neuId)),
      ]),
      inhalt: (
        <Suspense fallback={null}>
          <ModellvergleichSeite key={pfad} {...v} gehe={gehe} />
        </Suspense>
      ),
    };
  },
  // Ticket 114: Bauwerksmodelle eines Projekts (Liste) und ein Modell (Baum, 3D, Eigenschaften)
  (pfad, gehe) => {
    const b = bimRoute(pfad);
    if (b === null) return null;
    const p = b.projektId;
    return b.art === 'liste'
      ? { ort: imProjekt(p, 'modelle'), inhalt: <ModellListeSeite key={p} projektId={p} gehe={gehe} /> }
      : {
          ort: imProjekt(p, 'modelle', [{ teil: { art: 'modell', id: b.id }, pfad: modellPfad(p, b.id) }]),
          inhalt: (
            <Suspense fallback={null}>
              <ModellSeite key={b.id} projektId={p} id={b.id} gehe={gehe} />
            </Suspense>
          ),
        };
  },
  (pfad, gehe) => {
    const m = /^\/lv\/([^/]+)\/stand\/([^/]+)$/.exec(pfad);
    if (m?.[1] === undefined || m[2] === undefined) return null;
    const lvId = decodeURIComponent(m[1]) as LeistungsverzeichnisId;
    const standId = decodeURIComponent(m[2]) as LvStandId;
    return {
      ort: imLv(lvId, 'leistungsverzeichnisse', [{ teil: { art: 'lvStand', lvId, id: standId }, pfad }]),
      inhalt: <LvStandSeite key={standId} lvId={lvId} standId={standId} gehe={gehe} />,
    };
  },
  // Ticket 63: Preisspiegel eines LV
  (pfad, gehe) => {
    const lvId = preisspiegelLvId(pfad);
    if (lvId === null) return null;
    return {
      ort: imLv(lvId, 'vergabe', [text(texte.seite.preisspiegel, preisspiegelPfad(lvId))]),
      inhalt: <PreisspiegelSeite key={lvId} lvId={lvId} gehe={gehe} />,
    };
  },
  (pfad, gehe) => {
    const m = /^\/lv\/([^/]+)$/.exec(pfad);
    if (m?.[1] === undefined) return null;
    const id = decodeURIComponent(m[1]) as LeistungsverzeichnisId;
    return { ort: imLv(id, 'leistungsverzeichnisse', []), inhalt: <LvSeite key={id} id={id} gehe={gehe} /> };
  },
  (pfad, gehe) =>
    pfad === '/'
      ? {
          ort: festerOrt('projekte', texte.huelle.eintraege.projekte, '/'),
          inhalt: <ProjektlisteSeite gehe={gehe} />,
        }
      : null,
  (pfad) =>
    pfad === '/hilfe'
      ? {
          ort: festerOrt('hilfe', texte.huelle.eintraege.hilfe, '/hilfe'),
          inhalt: <HilfeSeite />,
          speicher: false,
        }
      : null,
  (pfad) =>
    pfad === '/katalog' && Katalog
      ? {
          ort: festerOrt('katalog', texte.huelle.katalogTitel, '/katalog'),
          inhalt: (
            <Suspense fallback={null}>
              <Katalog />
            </Suspense>
          ),
          speicher: false,
        }
      : null,
];

function unbekannt(pfad: string, gehe: Gehe): Seite {
  return {
    ort: festerOrt(null, texte.seiten.unbekannt.titel, pfad),
    inhalt: (
      <div className="seite">
        <h1>{texte.seiten.unbekannt.titel}</h1>
        <p>{texte.seiten.unbekannt.text}</p>
        <Verweis pfad="/" text={texte.seiten.unbekannt.zurueck} gehe={gehe} />
      </div>
    ),
    speicher: false,
  };
}

function waehleSeite(pfad: string, gehe: Gehe): Seite {
  for (const regel of REGELN) {
    const s = regel(pfad, gehe);
    if (s !== null) return s;
  }
  return unbekannt(pfad, gehe);
}

export function App(): ReactElement {
  const { pfad, gehe } = useRoute();
  const [navigation] = useState(() => new Navigationsspeicher());
  const seite = useMemo(() => waehleSeite(pfad, gehe), [pfad, gehe]);
  // Alle Seiten stehen an derselben Stelle unter `SpeicherAnbieter`, damit der Speicher und mit ihm der Undo-Stapel der
  // Sitzung jeden Seitenwechsel übersteht (Ticket 48). Seiten mit Speicher erscheinen erst nach dem Öffnen (E-14).
  const inhalt =
    seite.speicher === false ? (
      <SpeicherAnbieter {...testpfad} mussOffen={false}>
        {seite.inhalt}
      </SpeicherAnbieter>
    ) : (
      <SpeicherAnbieter {...testpfad}>
        <SicherungsAnbieter>
          {/* Ticket 62 */}
          <HistorieAnbieter>
            <OrtLader pfad={pfad} ort={seite.ort} speicher={navigation} />
            {seite.inhalt}
          </HistorieAnbieter>
        </SicherungsAnbieter>
      </SpeicherAnbieter>
    );
  return (
    <ToastAnbieter>
      <AppAktualisierung /> {/* Ticket 62 */}
      <Huelle pfad={pfad} gehe={gehe} mitKatalog={MIT_KATALOG} ort={seite.ort} navigation={navigation}>
        {inhalt}
      </Huelle>
    </ToastAnbieter>
  );
}
