// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/lv/<id>/preisspiegel` (Ticket 63): alle Angebote eines LV im Vergleichsgrid (U2). Rechnung nur in `vergabe`
// (`preisspiegelBerechnen`), Zahlen nur über `dezimal` (A5, N1, N4). Ticket 64: „Zuschlag erteilen“ je Bieter in der
// Bieterübersicht; gibt es zum LV schon ein Auftrags-LV, sind die Knöpfe aus und ein Hinweis nennt den Grund (D-21, Q5).
// Ticket 149: Die Einstellungen (G-26) stehen am LV (D-73, B-29; die Spaltenwahl bleibt Sitzung), der Zuschlag lässt sich
// zurücknehmen (D-74), Bieter verwalten, Ausgaben als PDF (mit Vorschau) und Excel.

import { PREISSPIEGEL_STANDARD } from '@tethys/vergabe';
import { VergleichsGrid, type VergleichsZellort } from '@tethys/ui-grid';
import { Button, Icon, Werkzeuggruppe, Werkzeugleiste } from '@tethys/ui-basis';
import type {
  AngebotZustand,
  AuftragsLvZustand,
  LeistungsverzeichnisId,
  LvZustand,
  PreisspiegelEinstellungen,
  Projekt,
} from '@tethys/vertrag';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { auftragsLvsLaden, auftragZumLv } from '../auftrag/auftrag';
import { texte as atexte } from '../auftrag/texte';
import { auftragPfad } from '../auftrag/ziel';
import { ZuschlagserteilungDialog } from '../auftrag/ZuschlagserteilungDialog';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { befehlswegFuer } from '../lv/befehlsweg';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { Verweis } from '../ui/Verweis';
import {
  STANDARD_WAHL,
  preisspiegelAnsicht,
  preisspiegelRechnen,
  zellDetail,
  type Anbieter,
  type Spaltenwahl,
} from './ansicht';
import { PreisspiegelExcel, PreisspiegelPdf, Vergabevorschlag } from './Ausgaben';
import { BieterVerwalten } from './BieterVerwalten';
import { Bieteruebersicht } from './Bieteruebersicht';
import { Detailleiste } from './Detailleiste';
import { Einstellungen } from './Einstellungen';
import { preisspiegelEinstellungenSetzen } from './schreiben';
import { texte } from './texte';
import { ZuschlagZuruecknehmen } from './ZuschlagZuruecknehmen';
import '@tethys/ui-grid/grid.css';
import '../lv/lv.css';
import './vergabe.css';

/** Eingeklappter Summenblock: das Grid ohne Summenzeilen. */
const KEINE_SUMMEN: readonly never[] = [];

interface Stand {
  readonly lv: LvZustand;
  readonly projekt: Projekt;
  readonly anbieter: readonly Anbieter[];
  /** Das Auftrags-LV zum LV, wenn der Zuschlag schon erteilt ist (höchstens eines, D-21). */
  readonly auftrag: AuftragsLvZustand | null;
}

type Laden = { art: 'laedt' } | { art: 'fehlt' } | { art: 'da'; stand: Stand };

/**
 * LV, Projekt (Bieternamen), alle Angebote des LV, Bieter nach Namen sortiert (stabile Spaltenfolge), und ein schon
 * erteilter Zuschlag (Auftrags-LV zum LV).
 */
async function ladeStand(
  u: ReturnType<typeof useUmgebung>,
  lvId: LeistungsverzeichnisId,
): Promise<Stand | null> {
  const l = await u.speicher.leistungsverzeichnisse.laden(lvId);
  if (!l.ok) return null;
  const p = await u.speicher.projekte.laden(l.wert.leistungsverzeichnis.projektId);
  const ids = await u.speicher.angebote.auflisten(lvId);
  const auftraege = await auftragsLvsLaden(u.speicher, l.wert.leistungsverzeichnis.projektId);
  if (!p.ok || !ids.ok || !auftraege.ok) return null;
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
  return { lv: l.wert, projekt, anbieter, auftrag: auftragZumLv(auftraege.wert, lvId) };
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
  return (
    <Preisspiegel
      stand={lage.stand}
      gehe={gehe}
      neuLaden={() => {
        setLauf((n) => n + 1);
      }}
    />
  );
}

function Preisspiegel({
  stand,
  gehe,
  neuLaden,
}: {
  stand: Stand;
  gehe: (pfad: string) => void;
  neuLaden: () => void;
}): ReactElement {
  const { lv, anbieter, projekt, auftrag } = stand;
  const kopf = lv.leistungsverzeichnis;
  const u = useUmgebung();
  const { pruefe } = useMeldungen();
  // Am LV gespeichert (D-73); fehlt der Wert, gelten die Standardwerte nach D-05.
  const einstellungen = kopf.preisspiegel ?? PREISSPIEGEL_STANDARD;
  const einstellungenSetzen = (e: PreisspiegelEinstellungen | null): void => {
    void preisspiegelEinstellungenSetzen(befehlswegFuer(u), lv, e).then((r) => {
      if (pruefe(r)) neuLaden();
    });
  };
  const [wahl, setWahl] = useState<Spaltenwahl>(STANDARD_WAHL);
  const [zugeklappt, setZugeklappt] = useState<ReadonlySet<string>>(new Set());
  const [ort, setOrt] = useState<VergleichsZellort | null>(null);
  const [erteilenAn, setErteilenAn] = useState<Anbieter | null>(null);
  const vergebenId = useId();
  // Ticket 142: Der Summenblock des Grids ist eingeklappt, bis der Nutzer ihn öffnet; die Summen je Bieter stehen in der
  // Bieterübersicht. So zeigt das Grid bei 1280×800 Positionen statt nur Summen.
  const [summenOffen, setSummenOffen] = useState(false);
  const gridId = useId();

  // Die Rechnung nur bei neuem Stand oder neuen Einstellungen; Spalten und Aufklappen bauen nur die Ansicht neu.
  const preisspiegel = useMemo(
    () => preisspiegelRechnen(lv, anbieter, einstellungen),
    [lv, anbieter, einstellungen],
  );
  const ausgabe = useMemo(() => ({ lv, projekt, preisspiegel }), [lv, projekt, preisspiegel]);
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

  const zuschlagKnopf = (a: Anbieter): ReactElement => (
    <Button
      groesse="sm"
      aria-label={atexte.knopf.erteilenFuer(a.name)}
      disabled={auftrag !== null}
      {...(auftrag === null ? {} : { 'aria-describedby': vergebenId })}
      onClick={() => {
        setErteilenAn(a);
      }}
    >
      {atexte.knopf.erteilen}
    </Button>
  );

  const lvPfad = `/lv/${kopf.id}`;
  return (
    <div className="seite lv preisspiegel">
      <div className="lv__kopf">
        <h1>
          {texte.seite.titel} – {kopf.name}
        </h1>
        <Verweis pfad={lvPfad} text={texte.seite.zumLv} gehe={gehe} />
      </div>
      <Werkzeugleiste beschriftung={texte.seite.werkzeuge}>
        <HistorieKnoepfe />
        {anbieter.length === 0 ? null : (
          <Werkzeuggruppe titel={texte.ausgabe.gruppe}>
            <PreisspiegelPdf stand={ausgabe} wahl={wahl} />
            <PreisspiegelExcel stand={ausgabe} wahl={wahl} />
            {kopf.nachtrag === undefined ? <Vergabevorschlag stand={ausgabe} /> : null}
          </Werkzeuggruppe>
        )}
        <BieterVerwalten projektId={projekt.id} onGeaendert={neuLaden} />
        {anbieter.length === 0 ? null : (
          <Button
            aria-expanded={summenOffen}
            aria-controls={gridId}
            onClick={() => {
              setSummenOffen((o) => !o);
            }}
          >
            {texte.seite.summen}
            <Icon name={summenOffen ? 'pfeilOben' : 'pfeilUnten'} groesse={14} />
          </Button>
        )}
      </Werkzeugleiste>
      <Einstellungen
        einstellungen={einstellungen}
        onEinstellungen={einstellungenSetzen}
        wahl={wahl}
        onWahl={setWahl}
      />
      {anbieter.length === 0 ? (
        <p>{texte.seite.keineAngebote}</p>
      ) : (
        <>
          <div className="lv__grid preisspiegel__grid" id={gridId}>
            <VergleichsGrid
              beschriftung={texte.seite.grid}
              spalten={ansicht.spalten}
              zeilen={ansicht.zeilen}
              summen={summenOffen ? ansicht.summen : KEINE_SUMMEN}
              kennzeichenTexte={ansicht.kennzeichenTexte}
              fixierteSpalten={2}
              baumspalte="kurztext"
              onAufklappen={aufklappen}
              onZelleAktiv={setOrt}
            />
          </div>
          <div className="preisspiegel__unten">
            <Detailleiste detail={detail} />
            <div className="preisspiegel__vergabe">
              {kopf.nachtrag === undefined ? null : (
                // D-42: Ein Nachtrags-LV bekommt keinen Zuschlag; es wird auf seiner LV-Seite beauftragt.
                <p className="auftrag__vergeben">{atexte.nachtragOhneZuschlag(kopf.nachtrag.nummer)}</p>
              )}
              {auftrag === null ? null : (
                <p id={vergebenId} className="auftrag__vergeben">
                  {atexte.knopf.vergeben(auftrag.auftragsLeistungsverzeichnis.auftragnehmer?.name ?? '–')}{' '}
                  <Verweis
                    pfad={auftragPfad(projekt.id, auftrag.auftragsLeistungsverzeichnis.id)}
                    text={atexte.knopf.oeffnen}
                    gehe={gehe}
                  />{' '}
                  <ZuschlagZuruecknehmen auftrag={auftrag} onZurueckgenommen={neuLaden} />
                </p>
              )}
              <Bieteruebersicht
                anbieter={anbieter}
                preisspiegel={preisspiegel}
                {...(kopf.nachtrag !== undefined ? {} : { aktion: zuschlagKnopf })}
              />
            </div>
          </div>
          <ZuschlagserteilungDialog
            lv={lv}
            projekt={projekt}
            bieter={erteilenAn}
            onSchliessen={() => {
              setErteilenAn(null);
            }}
            onErteilt={(id) => {
              setErteilenAn(null);
              gehe(auftragPfad(projekt.id, id));
            }}
          />
        </>
      )}
    </div>
  );
}
