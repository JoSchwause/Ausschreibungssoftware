// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/projekt/<id>/maengel` (Ticket 120, X4): Mängel eines Projekts im Vergleichsgrid, anlegen und bearbeiten, Status
// ändern, überfällige Mängel als Befund mit Sprunglink, Auswertung je Auftragnehmer und die PDFs „Mängelliste“ und
// „Mängelanzeige“. Der Stichtag der Fristprüfung ist das heutige Datum der App (A2: die Uhr gehört dem Rand). Jede Änderung
// ist ein Befehl durch `bauleitung` und den Speicher (A5), mit Undo (U7); Regeln und Zahlen rechnet `bauleitung`.

import { fristPruefen, maengelAuswerten, naechsteMangelnummer } from '@tethys/bauleitung';
import { Auswahl, Button, Dialog } from '@tethys/ui-basis';
import { VergleichsGrid, type VergleichsSprungziel } from '@tethys/ui-grid';
import type {
  AuftragsLvZustand,
  BauwerksmodellUebersicht,
  Mangel,
  MangelBefehl,
  MangelId,
  Projekt,
  ProjektId,
} from '@tethys/vertrag';
import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { auftragsLvsLaden } from '../auftrag/auftrag';
import { datumAusUhr } from '../ausgabe/logik';
import { ERSATZ_PROJEKT, dateinameSauber } from '../dateiname';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { befehlswegFuer, type Ausgang } from '../lv/befehlsweg';
import { datumDe } from '../lv/kopfdaten';
import { abweisungText, useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { Verweis } from '../ui/Verweis';
import { bautagebuchPfad } from './pfad';
import {
  AKTIONEN,
  ALLE,
  KEIN_FILTER,
  KENNZEICHEN_TEXTE,
  OHNE,
  SPALTEN,
  aktionMoeglich,
  auftragnehmerAngaben,
  auftragnehmerNamen,
  entwurfAusMangel,
  filterBeschreibung,
  filtern,
  fuerAnzeige,
  leererEntwurf,
  maengelZeilen,
  mangelAnlegenBefehl,
  mangelAngabenBefehl,
  namenJeAuftrag,
  ozVonPosition,
  positionenNachOz,
  statusBefehle,
  ueberfaelligeIds,
  verlaufZeilen,
  type Feldfehler,
  type MangelEntwurf,
  type MangelFilter,
  type Statusaktion,
  type StatusEntwurf,
  type Statusfehler,
} from './maengel';
import { MangelFormular, StatusDialog, statusStart } from './MangelFormular';
import { PdfDialog } from './PdfDialog';
import { maengelLaden, mangelSitzung } from './schreiben';
import { STATUS_TEXT, texte } from './texte';
import '@tethys/ui-grid/grid.css';
import '../lv/lv.css';
import '../projekt/projekt.css';
import './bauleitung.css';

interface Stand {
  readonly projekt: Projekt;
  readonly maengel: readonly Mangel[];
  readonly auftraege: readonly AuftragsLvZustand[];
  readonly modelle: readonly BauwerksmodellUebersicht[];
  /** Der Stichtag der Fristprüfung: heute nach der Uhr der App. */
  readonly stichtag: string;
}
type Laden = { art: 'laedt' } | { art: 'fehlt' } | { art: 'da'; stand: Stand };

type Dialogart =
  | { readonly art: 'neu' }
  | { readonly art: 'bearbeiten' }
  | { readonly art: 'status'; readonly aktion: Statusaktion }
  | { readonly art: 'loeschen' }
  | { readonly art: 'liste' }
  | { readonly art: 'anzeige' };

const AKTION_KNOPF: Readonly<Record<Statusaktion, string>> = {
  anzeigen: texte.aktion.anzeigen,
  beseitigt: texte.aktion.beseitigt,
  abnehmen: texte.aktion.abnehmen,
  oeffnen: texte.aktion.oeffnen,
};

/** Befehlsfehler → Feld des Formulars. */
const FELD_VON_BEFEHL: Readonly<Record<string, keyof MangelEntwurf>> = {
  nummer: 'nummer',
  titel: 'titel',
  festgestellt: 'festgestellt',
  frist: 'frist',
  bauteil: 'globalId',
  positionId: 'position',
};

export function MaengelSeite({
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
      const m = await maengelLaden(u.speicher, projektId);
      const a = await auftragsLvsLaden(u.speicher, projektId);
      const mod = await u.speicher.bauwerksmodelle.auflisten(projektId);
      if (!p.ok || !m.ok || !a.ok) return { art: 'fehlt' };
      return {
        art: 'da',
        stand: {
          projekt: p.wert,
          maengel: m.wert,
          auftraege: a.wert,
          modelle: mod.ok ? mod.wert : [],
          stichtag: datumAusUhr(u.uhr()),
        },
      };
    })().then((l) => {
      if (aktiv) setLage(l);
    });
    return () => {
      aktiv = false;
    };
  }, [u, projektId, lauf]);
  // Undo und Redo können Mängel anlegen, ändern oder löschen: neu laden.
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
  return (
    <Maengel
      stand={lage.stand}
      gehe={gehe}
      neuLaden={() => {
        setLauf((n) => n + 1);
      }}
    />
  );
}

function Maengel({
  stand,
  gehe,
  neuLaden,
}: {
  stand: Stand;
  gehe: (pfad: string) => void;
  neuLaden: () => void;
}): ReactElement {
  const { projekt, maengel, auftraege, modelle, stichtag } = stand;
  const u = useUmgebung();
  const { pruefe } = useMeldungen();
  const [filter, setFilter] = useState<MangelFilter>(KEIN_FILTER);
  const [aktivId, setAktivId] = useState<string | null>(null);
  const [sprung, setSprung] = useState<VergleichsSprungziel | undefined>(undefined);
  const [dialog, setDialog] = useState<Dialogart | null>(null);

  const angaben = useMemo(
    () => auftragnehmerAngaben(auftraege.map((z) => z.auftragsLeistungsverzeichnis)),
    [auftraege],
  );
  const namen = useMemo(() => namenJeAuftrag(angaben), [angaben]);
  const firmen = useMemo(() => auftragnehmerNamen(angaben), [angaben]);
  const befunde = useMemo(() => fristPruefen(maengel, stichtag), [maengel, stichtag]);
  const ueberfaellig = useMemo(() => ueberfaelligeIds(befunde), [befunde]);
  const auswertung = useMemo(
    () => maengelAuswerten(maengel, angaben, stichtag),
    [maengel, angaben, stichtag],
  );
  const sichtbar = useMemo(() => filtern(maengel, filter, namen), [maengel, filter, namen]);
  const zeilen = useMemo(() => maengelZeilen(sichtbar, namen, ueberfaellig), [sichtbar, namen, ueberfaellig]);
  const gewaehlt = maengel.find((m) => m.id === aktivId) ?? null;
  const t = texte.maengel;

  const positionenFuer = (auftragsLvId: string) => {
    const z = auftraege.find((a) => a.auftragsLeistungsverzeichnis.id === auftragsLvId);
    return z === undefined ? null : positionenNachOz(z.auftragsLeistungsverzeichnis.knoten);
  };

  /** Schreibt die Befehle als einen Undo-Schritt; `true`, wenn alle angenommen wurden. Meldet jede Abweisung. */
  const schreibe = async (
    mangel: Mangel | null,
    befehle: readonly MangelBefehl[],
  ): Promise<readonly Ausgang<unknown>[]> => {
    const aus = await mangelSitzung(u, projekt.id, mangel).folge(befehle);
    neuLaden();
    return aus;
  };

  const springeZu = (id: MangelId): void => {
    if (!filtern(maengel, filter, namen).some((m) => m.id === id)) setFilter(KEIN_FILTER);
    setSprung((s) => ({ zeilenId: id, spalte: 'nummer', nr: (s?.nr ?? 0) + 1 }));
    setAktivId(id);
  };

  // --- Formular: neu und bearbeiten ------------------------------------------------------------------------------
  const neuerEntwurf = (): MangelEntwurf => leererEntwurf(naechsteMangelnummer(maengel), stichtag);

  const speichereNeu = async (e: MangelEntwurf): Promise<Feldfehler | null> => {
    const b = mangelAnlegenBefehl(
      u.ids,
      projekt.id,
      e,
      positionenFuer(e.auftragsLvId),
      maengel.map((m) => m.nummer),
    );
    if (!b.ok) return b.fehler;
    const [a] = await schreibe(null, [b.wert]);
    if (a === undefined || !a.ok) return abweisungAlsFeld(a);
    setAktivId(b.wert.mangel.id);
    setSprung((s) => ({ zeilenId: b.wert.mangel.id, spalte: 'nummer', nr: (s?.nr ?? 0) + 1 }));
    return null;
  };

  const speichereAenderung = async (e: MangelEntwurf): Promise<Feldfehler | null> => {
    if (gewaehlt === null) return null;
    const b = mangelAngabenBefehl(e, positionenFuer(e.auftragsLvId), gewaehlt);
    if (!b.ok) return b.fehler;
    if (b.wert === null) return null;
    const [a] = await schreibe(gewaehlt, [b.wert]);
    return a === undefined || !a.ok ? abweisungAlsFeld(a) : null;
  };

  /** Eine Abweisung des Ausführers: am Feld, wenn es eines nennt, sonst als Meldung (Toast); der Dialog bleibt offen. */
  const abweisungAlsFeld = (a: Ausgang<unknown> | undefined): Feldfehler => {
    if (a === undefined || a.ok) return {};
    if (a.abweisung.art === 'befehl') {
      const feld = FELD_VON_BEFEHL[a.abweisung.fehler.feld ?? ''];
      if (feld !== undefined) return { [feld]: abweisungText(a.abweisung).beschreibung };
    }
    pruefe(a);
    return { titel: abweisungText(a.abweisung).beschreibung };
  };

  const statusUebernehmen = async (aktion: Statusaktion, e: StatusEntwurf): Promise<Statusfehler | null> => {
    if (gewaehlt === null) return null;
    const b = statusBefehle(gewaehlt, aktion, e);
    if (!b.ok) return b.fehler;
    const aus = await schreibe(gewaehlt, b.wert);
    let ok = true;
    for (const a of aus) if (!pruefe(a)) ok = false;
    return ok ? null : {};
  };

  const loesche = async (): Promise<void> => {
    if (gewaehlt === null) return;
    const [a] = await schreibe(gewaehlt, [{ art: 'MangelLoeschen' }]);
    if (a !== undefined && pruefe(a)) setDialog(null);
  };

  const auftragsOptionen = auftraege.map((z) => ({
    wert: z.auftragsLeistungsverzeichnis.id,
    label: `${z.auftragsLeistungsverzeichnis.name} (${namen[z.auftragsLeistungsverzeichnis.id] ?? ''})`,
  }));
  const modellOptionen = modelle.map((m) => ({ wert: m.id, label: m.name }));
  const projektName = dateinameSauber(projekt.name, ERSATZ_PROJEKT);

  return (
    <div className="seite lv projekt bauleitung">
      <div className="lv__kopf">
        <h1>{t.titel(projekt.name)}</h1>
        <Verweis pfad={bautagebuchPfad(projekt.id)} text={texte.seite.zumBautagebuch} gehe={gehe} />
        <Verweis pfad={`/projekt/${projekt.id}`} text={texte.seite.zumProjekt} gehe={gehe} />
      </div>
      <p>{t.stichtag(datumDe(stichtag))}</p>

      <div className="lv__werkzeuge bauleitung__werkzeuge" role="toolbar" aria-label={t.werkzeuge}>
        <HistorieKnoepfe />
        <Button
          variante="primaer"
          onClick={() => {
            setDialog({ art: 'neu' });
          }}
        >
          {t.neu}
        </Button>
        <Button
          disabled={gewaehlt === null}
          onClick={() => {
            setDialog({ art: 'bearbeiten' });
          }}
        >
          {t.bearbeiten}
        </Button>
        {AKTIONEN.map((a) => (
          <Button
            key={a}
            disabled={gewaehlt === null || !aktionMoeglich(gewaehlt, a)}
            onClick={() => {
              setDialog({ art: 'status', aktion: a });
            }}
          >
            {AKTION_KNOPF[a]}
          </Button>
        ))}
        <Button
          variante="gefahr"
          disabled={gewaehlt === null}
          onClick={() => {
            setDialog({ art: 'loeschen' });
          }}
        >
          {t.loeschen}
        </Button>
        <Button
          onClick={() => {
            setDialog({ art: 'liste' });
          }}
        >
          {texte.pdf.liste}
        </Button>
        <Button
          onClick={() => {
            setDialog({ art: 'anzeige' });
          }}
        >
          {texte.pdf.anzeige}
        </Button>
      </div>

      <div className="lv__werkzeuge bauleitung__werkzeuge" role="group" aria-label="Filter">
        <Auswahl
          label={t.filterStatus}
          kompakt
          wert={filter.status}
          onWertChange={(w) => {
            setFilter((f) => ({ ...f, status: w as MangelFilter['status'] }));
          }}
          optionen={[
            { wert: ALLE, label: t.alle },
            ...(['offen', 'angezeigt', 'beseitigt', 'abgenommen'] as const).map((s) => ({
              wert: s,
              label: STATUS_TEXT[s],
            })),
          ]}
        />
        <Auswahl
          label={t.filterAuftragnehmer}
          kompakt
          wert={filter.auftragnehmer}
          onWertChange={(w) => {
            setFilter((f) => ({ ...f, auftragnehmer: w }));
          }}
          optionen={[
            { wert: ALLE, label: t.alle },
            ...firmen.map((n) => ({ wert: n, label: n })),
            { wert: OHNE, label: t.ohneAuftragnehmer },
          ]}
        />
      </div>

      {maengel.length === 0 ? <p>{t.leer}</p> : null}
      <p className="bauleitung__auswahl" data-testid="auswahl">
        {gewaehlt === null ? t.keinerAusgewaehlt : t.ausgewaehlt(gewaehlt.nummer, gewaehlt.titel)}
      </p>
      <div className="lv__grid bauleitung__grid">
        <VergleichsGrid
          beschriftung={t.grid}
          spalten={SPALTEN}
          zeilen={zeilen}
          kennzeichenTexte={KENNZEICHEN_TEXTE}
          fixierteSpalten={2}
          {...(sprung === undefined ? {} : { sprungziel: sprung })}
          onZeileAktiv={setAktivId}
        />
      </div>

      <h2>{t.befunde}</h2>
      {befunde.length === 0 ? (
        <p>{t.keineBefunde}</p>
      ) : (
        <ul className="bauleitung__befunde" aria-label={t.befunde}>
          {befunde.map((b) => {
            const m = maengel.find((x) => x.id === (b.ort as { mangelId?: string }).mangelId);
            if (m === undefined) return null;
            return (
              <li key={m.id} className="bauleitung__befund">
                <span>{t.befund(m.nummer, m.titel, datumDe(m.frist ?? ''), datumDe(stichtag))}</span>
                <Button
                  groesse="sm"
                  variante="schlicht"
                  aria-label={`${t.zumMangel} ${String(m.nummer)}`}
                  onClick={() => {
                    springeZu(m.id);
                  }}
                >
                  {t.zumMangel}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {gewaehlt === null ? null : (
        <>
          <h2>{t.verlauf}</h2>
          <ul className="bauleitung__liste" aria-label={`${t.verlauf} Mangel ${String(gewaehlt.nummer)}`}>
            {verlaufZeilen(gewaehlt).map((z, i) => (
              <li key={`${String(i)}-${z}`}>{z}</li>
            ))}
          </ul>
        </>
      )}

      <h2>{t.auswertung}</h2>
      <table className="bauleitung__tabelle" aria-label={t.auswertung} data-testid="auswertung">
        <thead>
          <tr>
            <th scope="col">{texte.maengel.spalten.auftragnehmer}</th>
            <th scope="col">{t.anzahl}</th>
            <th scope="col">{t.offen}</th>
            <th scope="col">{t.ueberfaellig}</th>
          </tr>
        </thead>
        <tbody>
          {auswertung.jeAuftragnehmer.map((z) => (
            <tr key={z.auftragsLvId ?? 'ohne'} data-testid={`auswertung-${z.auftragnehmer ?? 'ohne'}`}>
              <th scope="row">{z.auftragnehmer ?? t.ohneAuftragnehmer}</th>
              <td data-feld="anzahl">{z.anzahl}</td>
              <td data-feld="offen">{z.offen}</td>
              <td data-feld="ueberfaellig">{z.ueberfaellig}</td>
            </tr>
          ))}
          <tr data-testid="auswertung-gesamt">
            <th scope="row">{t.gesamt}</th>
            <td data-feld="anzahl">{auswertung.gesamt.anzahl}</td>
            <td data-feld="offen">{auswertung.gesamt.offen}</td>
            <td data-feld="ueberfaellig">{auswertung.gesamt.ueberfaellig}</td>
          </tr>
        </tbody>
      </table>

      {dialog?.art === 'neu' ? (
        <MangelFormular
          titel={texte.formular.titelNeu}
          start={neuerEntwurf()}
          auftraege={auftragsOptionen}
          modelle={modellOptionen}
          nummerFest={false}
          onSenden={async (e) => {
            const f = await speichereNeu(e);
            if (f === null) setDialog(null);
            return f;
          }}
          onSchliessen={() => {
            setDialog(null);
          }}
        />
      ) : null}
      {dialog?.art === 'bearbeiten' && gewaehlt !== null ? (
        <MangelFormular
          titel={texte.formular.titelBearbeiten(gewaehlt.nummer)}
          start={entwurfAusMangel(
            gewaehlt,
            gewaehlt.auftragsLvId === null || gewaehlt.positionId === null
              ? ''
              : ozVonPosition(
                  auftraege.find((a) => a.auftragsLeistungsverzeichnis.id === gewaehlt.auftragsLvId)
                    ?.auftragsLeistungsverzeichnis.knoten ?? [],
                  gewaehlt.positionId,
                ),
          )}
          auftraege={auftragsOptionen}
          modelle={modellOptionen}
          nummerFest
          onSenden={async (e) => {
            const f = await speichereAenderung(e);
            if (f === null) setDialog(null);
            return f;
          }}
          onSchliessen={() => {
            setDialog(null);
          }}
        />
      ) : null}
      {dialog?.art === 'status' && gewaehlt !== null ? (
        <StatusDialog
          aktion={dialog.aktion}
          mangel={gewaehlt}
          start={statusStart(gewaehlt, dialog.aktion, stichtag)}
          onSenden={async (e) => {
            const f = await statusUebernehmen(dialog.aktion, e);
            if (f === null) setDialog(null);
            return f;
          }}
          onSchliessen={() => {
            setDialog(null);
          }}
        />
      ) : null}
      {dialog?.art === 'loeschen' && gewaehlt !== null ? (
        <Dialog
          offen
          onOffenChange={(o) => {
            if (!o) setDialog(null);
          }}
          titel={texte.loeschen.titel}
          beschreibung={texte.loeschen.frage(gewaehlt.nummer, gewaehlt.titel)}
          fuss={
            <>
              <Button
                onClick={() => {
                  setDialog(null);
                }}
              >
                {texte.loeschen.abbrechen}
              </Button>
              <Button variante="gefahr" onClick={() => void loesche()}>
                {texte.loeschen.bestaetigen}
              </Button>
            </>
          }
        >
          <p>{texte.loeschen.frage(gewaehlt.nummer, gewaehlt.titel)}</p>
        </Dialog>
      ) : null}
      {dialog?.art === 'liste' ? (
        <PdfDialog
          titel={texte.pdf.dialogListe}
          dateiname={`Maengelliste ${projektName}.pdf`}
          zusammenfassung={`${texte.pdf.anzahl(sichtbar.length)}; ${filterBeschreibung(filter) ?? texte.pdf.ungefiltert}`}
          hinweis={sichtbar.length === 0 ? t.leer : null}
          auftrag={{
            art: 'maengelliste',
            eingabe: {
              projekt: projekt.name,
              maengel: sichtbar,
              befunde,
              auftragnehmer: namen,
              ...(filterBeschreibung(filter) === null ? {} : { filter: filterBeschreibung(filter) ?? '' }),
              datum: stichtag,
            },
          }}
          onSchliessen={() => {
            setDialog(null);
          }}
        />
      ) : null}
      {dialog?.art === 'anzeige' ? (
        <AnzeigeDialog
          projektName={projekt.name}
          dateiProjekt={projektName}
          maengel={maengel}
          namen={namen}
          firmen={firmen}
          stichtag={stichtag}
          onSchliessen={() => {
            setDialog(null);
          }}
        />
      ) : null}
    </div>
  );
}

/** Mängelanzeige für einen Auftragnehmer (D-120.4): seine angezeigten, noch nicht beseitigten Mängel. */
function AnzeigeDialog({
  projektName,
  dateiProjekt,
  maengel,
  namen,
  firmen,
  stichtag,
  onSchliessen,
}: {
  projektName: string;
  dateiProjekt: string;
  maengel: readonly Mangel[];
  namen: Readonly<Record<string, string>>;
  firmen: readonly string[];
  stichtag: string;
  onSchliessen: () => void;
}): ReactElement {
  const mitMaengeln = firmen.filter((f) => fuerAnzeige(maengel, namen, f).length > 0);
  const [firma, setFirma] = useState<string>(mitMaengeln[0] ?? firmen[0] ?? '');
  const gewaehlt = fuerAnzeige(maengel, namen, firma);
  return (
    <PdfDialog
      titel={texte.pdf.dialogAnzeige}
      dateiname={`Maengelanzeige ${dateinameSauber(firma, 'Auftragnehmer')} ${dateiProjekt}.pdf`}
      zusammenfassung={texte.pdf.anzahl(gewaehlt.length)}
      hinweis={
        firma === '' ? texte.pdf.keinAuftragnehmer : gewaehlt.length === 0 ? texte.pdf.keineMaengel : null
      }
      auftrag={{
        art: 'maengelanzeige',
        eingabe: { projekt: projektName, auftragnehmer: firma, maengel: gewaehlt, datum: stichtag },
      }}
      onSchliessen={onSchliessen}
    >
      <Auswahl
        label={texte.pdf.auftragnehmer}
        wert={firma === '' ? undefined : firma}
        onWertChange={setFirma}
        optionen={firmen.map((f) => ({ wert: f, label: f }))}
      />
    </PdfDialog>
  );
}
