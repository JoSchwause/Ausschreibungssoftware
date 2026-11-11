// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/lv/<id>/preisspiegel` (Ticket 63): alle Angebote eines LV im Vergleichsgrid (U2). Rechnung nur in `vergabe`
// (`preisspiegelBerechnen`), Zahlen nur über `dezimal` (A5, N1, N4). Die Einstellungen (G-26) gelten für die Sitzung
// und werden nicht gespeichert. Ticket 64 hängt „Zuschlag erteilen“ je Bieter in die Bieterübersicht.

import type { PreisspiegelEinstellungen } from '@tethys/vergabe';
import { PREISSPIEGEL_STANDARD } from '@tethys/vergabe';
import { VergleichsGrid, type VergleichsZellort } from '@tethys/ui-grid';
import type { AngebotZustand, LeistungsverzeichnisId, LvZustand, Projekt } from '@tethys/vertrag';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { befehlswegFuer } from '../lv/befehlsweg';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { hrefFuer } from '../ui/route';
import {
  STANDARD_WAHL,
  preisspiegelAnsicht,
  preisspiegelRechnen,
  zellDetail,
  type Anbieter,
  type Spaltenwahl,
} from './ansicht';
import { Bieteruebersicht } from './Bieteruebersicht';
import { Detailleiste } from './Detailleiste';
import { Einstellungen } from './Einstellungen';
import { texte } from './texte';
import '@tethys/ui-grid/grid.css';
import '../lv/lv.css';
import './vergabe.css';

interface Stand {
  readonly lv: LvZustand;
  readonly anbieter: readonly Anbieter[];
}

type Laden = { art: 'laedt' } | { art: 'fehlt' } | { art: 'da'; stand: Stand };

/** LV, Projekt (Bieternamen) und alle Angebote des LV; Bieter nach Namen sortiert (stabile Spaltenfolge). */
async function ladeStand(
  u: ReturnType<typeof useUmgebung>,
  lvId: LeistungsverzeichnisId,
): Promise<Stand | null> {
  const l = await u.speicher.leistungsverzeichnisse.laden(lvId);
  if (!l.ok) return null;
  const p = await u.speicher.projekte.laden(l.wert.leistungsverzeichnis.projektId);
  const ids = await u.speicher.angebote.auflisten(lvId);
  if (!p.ok || !ids.ok) return null;
  const projekt: Projekt = p.wert;
  const angebote: AngebotZustand[] = [];
  for (const id of ids.wert) {
    const a = await u.speicher.angebote.laden(id);
    if (a.ok) angebote.push(a.wert);
  }
  const anbieter = angebote
    .map((z) => ({
      name: projekt.bieter.find((b) => b.id === z.angebot.bieterId)?.name ?? z.angebot.bieterId,
      zustand: z,
    }))
    .sort(
      (x, y) =>
        x.name.localeCompare(y.name, 'de') || x.zustand.angebot.id.localeCompare(y.zustand.angebot.id),
    );
  return { lv: l.wert, anbieter };
}

export function PreisspiegelSeite({
  lvId,
  gehe,
}: {
  lvId: LeistungsverzeichnisId;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const weg = befehlswegFuer(u);
  const [lage, setLage] = useState<Laden>({ art: 'laedt' });
  const [lauf, setLauf] = useState(0);

  useEffect(() => {
    let aktiv = true;
    void ladeStand(u, lvId).then((s) => {
      if (aktiv) setLage(s === null ? { art: 'fehlt' } : { art: 'da', stand: s });
    });
    return () => {
      aktiv = false;
    };
  }, [u, lvId, lauf]);
  // Undo und Redo können Angebote, Bieter und das LV ändern: neu laden.
  useEffect(
    () =>
      weg.beiHistorie(() => {
        setLauf((n) => n + 1);
      }),
    [weg],
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
      </div>
    );
  }
  return <Preisspiegel stand={lage.stand} gehe={gehe} />;
}

function Preisspiegel({ stand, gehe }: { stand: Stand; gehe: (pfad: string) => void }): ReactElement {
  const { lv, anbieter } = stand;
  const kopf = lv.leistungsverzeichnis;
  const [einstellungen, setEinstellungen] = useState<PreisspiegelEinstellungen>(PREISSPIEGEL_STANDARD);
  const [wahl, setWahl] = useState<Spaltenwahl>(STANDARD_WAHL);
  const [zugeklappt, setZugeklappt] = useState<ReadonlySet<string>>(new Set());
  const [ort, setOrt] = useState<VergleichsZellort | null>(null);

  // Die Rechnung nur bei neuem Stand oder neuen Einstellungen; Spalten und Aufklappen bauen nur die Ansicht neu.
  const preisspiegel = useMemo(
    () => preisspiegelRechnen(lv, anbieter, einstellungen),
    [lv, anbieter, einstellungen],
  );
  const eingang = useMemo(
    () => ({ lv, anbieter, preisspiegel, wahl, zugeklappt }),
    [lv, anbieter, preisspiegel, wahl, zugeklappt],
  );
  const ansicht = useMemo(() => preisspiegelAnsicht(eingang), [eingang]);
  const detail = useMemo(() => (ort === null ? null : zellDetail(eingang, ort)), [eingang, ort]);
  const aufklappen = useCallback((zeilenId: string, auf: boolean) => {
    setZugeklappt((alt) => {
      const neu = new Set(alt);
      if (auf) neu.delete(zeilenId);
      else neu.add(zeilenId);
      return neu;
    });
  }, []);

  const lvPfad = `/lv/${kopf.id}`;
  return (
    <div className="seite lv preisspiegel">
      <div className="lv__kopf">
        <h1>
          {texte.seite.titel} – {kopf.name}
        </h1>
        <a
          href={hrefFuer(lvPfad)}
          onClick={(e) => {
            e.preventDefault();
            gehe(lvPfad);
          }}
        >
          {texte.seite.zumLv}
        </a>
      </div>
      <div className="lv__werkzeuge" role="toolbar" aria-label={texte.seite.werkzeuge}>
        <HistorieKnoepfe />
      </div>
      <Einstellungen
        einstellungen={einstellungen}
        onEinstellungen={setEinstellungen}
        wahl={wahl}
        onWahl={setWahl}
      />
      {anbieter.length === 0 ? (
        <p>{texte.seite.keineAngebote}</p>
      ) : (
        <>
          <div className="lv__grid preisspiegel__grid">
            <VergleichsGrid
              beschriftung={texte.seite.grid}
              spalten={ansicht.spalten}
              zeilen={ansicht.zeilen}
              summen={ansicht.summen}
              kennzeichenTexte={ansicht.kennzeichenTexte}
              fixierteSpalten={2}
              baumspalte="kurztext"
              onAufklappen={aufklappen}
              onZelleAktiv={setOrt}
            />
          </div>
          <div className="preisspiegel__unten">
            <Detailleiste detail={detail} />
            {/* Ticket 64: „Zuschlag erteilen“ je Bieter über die Eigenschaft `aktion` der Bieterübersicht. */}
            <Bieteruebersicht anbieter={anbieter} preisspiegel={preisspiegel} />
          </div>
        </>
      )}
    </div>
  );
}
