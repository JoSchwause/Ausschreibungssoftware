// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/projekt/<id>/kosten/kontrolle` (Ticket 89, C3, D-37): Budget (gewählte Kostenermittlung), Vergabe (Summenstände der
// Auftrags-LVs), Abrechnung (Leistungsstand der jeweils letzten Rechnung je Auftrags-LV) und Abweichung je Kostengruppe, dazu
// „Ohne Kostengruppe“, „Nachlass“ und Gesamt. Gerechnet wird nur in `kosten` (`kostenkontrolleBerechnen`); hier wird geladen und
// angezeigt. Das Budget ist eine Wahl der Sitzung, nichts Gespeichertes (Ticket 82). Hinweise sperren nie (U5).

import { kostenkontrolleBerechnen } from '@tethys/kosten';
import { Auswahl } from '@tethys/ui-basis';
import { VergleichsGrid } from '@tethys/ui-grid';
import type {
  AuftragsLvZustand,
  KostenermittlungId,
  KostenermittlungZustand,
  Projekt,
  ProjektId,
} from '@tethys/vertrag';
import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { befehlswegFuer } from '../lv/befehlsweg';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { KENNZEICHEN_TEXTE, kontrolleAnsicht } from './ansicht';
import { bezeichnungenAusCsv, bezeichnungenGemerkt } from './bezeichnungen';
import { budgetWaehlen, leistungsstaendeLaden, type Leistungsstaende } from './kontrolle';
import { LEISTUNGSSTAND_RECHNER } from './leistungsstand';
import { kostenPfad } from './pfad';
import { auftraegeLaden, kostenermittlungenLaden } from './schreiben';
import { texte } from './texte';
import { Verweis } from '../ui/Verweis';
import '@tethys/ui-grid/grid.css';
import '../lv/lv.css';
import './kosten.css';

const t = texte.kontrolle;
const KEIN_BUDGET = '-';

interface Stand {
  readonly projekt: Projekt;
  readonly ermittlungen: readonly KostenermittlungZustand[];
  readonly auftraege: readonly AuftragsLvZustand[];
  readonly leistungsstaende: Leistungsstaende;
}
type Laden = { art: 'laedt' } | { art: 'fehlt' } | { art: 'da'; stand: Stand };

export function KostenkontrolleSeite({
  projektId,
  gehe,
}: {
  projektId: ProjektId;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const [lage, setLage] = useState<Laden>({ art: 'laedt' });
  const [lauf, setLauf] = useState(0);

  useEffect(() => {
    let aktiv = true;
    void (async (): Promise<Laden> => {
      const p = await u.speicher.projekte.laden(projektId);
      const k = await kostenermittlungenLaden(u.speicher, projektId);
      const a = await auftraegeLaden(u.speicher, projektId);
      if (!p.ok || !k.ok || !a.ok) return { art: 'fehlt' };
      const l = await leistungsstaendeLaden(u.speicher, a.wert, LEISTUNGSSTAND_RECHNER);
      if (!l.ok) return { art: 'fehlt' };
      return {
        art: 'da',
        stand: { projekt: p.wert, ermittlungen: k.wert, auftraege: a.wert, leistungsstaende: l.wert },
      };
    })().then((s) => {
      if (aktiv) setLage(s);
    });
    return () => {
      aktiv = false;
    };
  }, [u, projektId, lauf]);
  // Undo und Redo können Positionen, Kostengruppen und Kostenermittlungen ändern: neu laden.
  useEffect(
    () =>
      befehlswegFuer(u).beiHistorie(() => {
        setLauf((n) => n + 1);
      }),
    [u],
  );

  if (lage.art === 'laedt') {
    return (
      <div className="seite" aria-busy="true">
        <p>{texte.seite.laden}</p>
      </div>
    );
  }
  if (lage.art === 'fehlt') {
    return (
      <div className="seite">
        <h1>{texte.seite.nichtGefunden}</h1>
        <div className="lv__werkzeuge">
          <HistorieKnoepfe />
        </div>
      </div>
    );
  }
  return <Kontrolle stand={lage.stand} gehe={gehe} />;
}

function Kontrolle({ stand, gehe }: { stand: Stand; gehe: (pfad: string) => void }): ReactElement {
  const { projekt, ermittlungen, auftraege, leistungsstaende } = stand;
  // Das Budget: die erste Kostenermittlung, bis der Nutzer eine andere (oder keine) wählt.
  const [wahl, setWahl] = useState<string | null>(null);
  const budgetId: KostenermittlungId | null =
    wahl === null
      ? (ermittlungen[0]?.kostenermittlung.id ?? null)
      : wahl === KEIN_BUDGET
        ? null
        : (wahl as KostenermittlungId);
  const budget = budgetWaehlen(ermittlungen, budgetId);
  const [zugeklappt, setZugeklappt] = useState<ReadonlySet<string>>(new Set());
  const bezeichnungen = useMemo(() => bezeichnungenAusCsv(bezeichnungenGemerkt()), []);

  const kontrolle = useMemo(
    () => kostenkontrolleBerechnen({ budget, auftraege, leistungsstaende }),
    [budget, auftraege, leistungsstaende],
  );
  const mitAbrechnung = leistungsstaende.length > 0;
  const ansicht = useMemo(
    () => kontrolleAnsicht(kontrolle, bezeichnungen, zugeklappt, mitAbrechnung),
    [kontrolle, bezeichnungen, zugeklappt, mitAbrechnung],
  );

  return (
    <div className="seite lv kosten">
      <div className="lv__kopf">
        <h1>{t.titel(projekt.name)}</h1>
        <Verweis pfad={kostenPfad(projekt.id)} text={texte.projekt.kosten} gehe={gehe} />
        <Verweis pfad={`/projekt/${projekt.id}`} text={texte.seite.zumProjekt} gehe={gehe} />
      </div>
      <div className="lv__werkzeuge" role="toolbar" aria-label={texte.seite.werkzeuge}>
        <HistorieKnoepfe />
        <Auswahl
          label={t.budgetWahl}
          wert={budgetId ?? KEIN_BUDGET}
          onWertChange={setWahl}
          optionen={[
            { wert: KEIN_BUDGET, label: t.keinBudget },
            ...ermittlungen.map((z) => ({
              wert: z.kostenermittlung.id,
              label: `${z.kostenermittlung.name} (${texte.stufe[z.kostenermittlung.stufe]})`,
            })),
          ]}
          kompakt
        />
      </div>
      {auftraege.length === 0 ? <p>{t.keineAuftraege}</p> : null}
      {mitAbrechnung ? <p className="kosten__hinweis">{t.abrechnungHinweis}</p> : <p>{t.keineAbrechnung}</p>}

      <div className="lv__grid kosten__grid">
        <VergleichsGrid
          beschriftung={t.grid}
          spalten={ansicht.spalten}
          zeilen={ansicht.zeilen}
          summen={ansicht.summen}
          kennzeichenTexte={KENNZEICHEN_TEXTE}
          baumspalte="nummer"
          onAufklappen={(zeilenId, auf) => {
            setZugeklappt((alt) => {
              const neu = new Set(alt);
              if (auf) neu.delete(zeilenId);
              else neu.add(zeilenId);
              return neu;
            });
          }}
        />
      </div>

      <h2>{t.befunde}</h2>
      {kontrolle.befunde.length === 0 ? (
        <p>{t.keineBefunde}</p>
      ) : (
        <ul className="kosten__befunde" aria-label={t.befunde}>
          {kontrolle.befunde.map((b, i) => (
            <li key={`${b.code}-${String(i)}`}>{befundText(b)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function befundText(b: ReturnType<typeof kostenkontrolleBerechnen>['befunde'][number]): string {
  const k = texte.kontrolle.befund;
  switch (b.code) {
    case 'kostengruppe-ohne-budget':
      return k['kostengruppe-ohne-budget'](b.nummer ?? '');
    case 'kostengruppe-groeber-als-budget':
      return k['kostengruppe-groeber-als-budget'](b.nummer ?? '');
    case 'leistungsstand-unbekannt':
      return k['leistungsstand-unbekannt']();
    case 'leistungsstand-doppelt':
      return k['leistungsstand-doppelt']();
    case 'summe-abweichend':
      return k['summe-abweichend'](b.spalte === 'abrechnung' ? t.spalteAbrechnung : t.spalteVergabe);
  }
}
