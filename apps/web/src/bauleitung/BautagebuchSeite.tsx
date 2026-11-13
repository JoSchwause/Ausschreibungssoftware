// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/projekt/<id>/bautagebuch` (Ticket 120, X4): die Tage des Bautagebuchs im Vergleichsgrid, ein Eintrag je Datum
// (ein zweiter am selben Datum wird mit Hinweis abgewiesen), die Auswertung eines Zeitraums (Arbeitskräfte je Tag und Firma,
// gerechnet in `bauleitung`) und das PDF für einen Zeitraum. Jede Änderung ist ein Befehl durch `bauleitung` und den
// Speicher (A5), mit Undo (U7).

import { bautagebuchAuswerten } from '@tethys/bauleitung';
import { Button, Dialog, Eingabefeld } from '@tethys/ui-basis';
import { VergleichsGrid, type VergleichsSprungziel } from '@tethys/ui-grid';
import type { AuftragsLvZustand, Bautagebucheintrag, Projekt, ProjektId } from '@tethys/vertrag';
import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { auftragsLvsLaden } from '../auftrag/auftrag';
import { datumAusUhr } from '../ausgabe/logik';
import { ERSATZ_PROJEKT, dateinameSauber } from '../dateiname';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import type { Ausgang } from '../lv/befehlsweg';
import { datumDe, datumLesen } from '../lv/kopfdaten';
import { abweisungText, useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { Ladeansicht, useSeitenladen } from '../ui/seite';
import { Verweis } from '../ui/Verweis';
import { EintragFormular } from './EintragFormular';
import { auftragnehmerAngaben, auftragnehmerNamen } from './maengel';
import { maengelPfad } from './pfad';
import { PdfDialog } from './PdfDialog';
import {
  SPALTEN,
  entwurfAusEintrag,
  eintragLesen,
  leererEintrag,
  koepfeJeTag,
  tageZeilen,
  wetterText,
  type EintragEntwurf,
  type Feldfehler,
} from './bautagebuch';
import { bautagebuchLaden, bautagebuchSitzung } from './schreiben';
import { texte } from './texte';
import '@tethys/ui-grid/grid.css';
import '../lv/lv.css';
import '../projekt/projekt.css';
import './bauleitung.css';

interface Stand {
  readonly projekt: Projekt;
  readonly eintraege: readonly Bautagebucheintrag[];
  readonly auftraege: readonly AuftragsLvZustand[];
  /** Heute nach der Uhr der App (`JJJJ-MM-TT`). */
  readonly heute: string;
}
type Dialogart = 'neu' | 'bearbeiten' | 'loeschen' | 'pdf';

export function BautagebuchSeite({
  projektId,
  gehe,
}: {
  projektId: ProjektId;
  gehe: (pfad: string) => void;
}): ReactElement {
  // Undo und Redo können Einträge anlegen, ändern oder löschen: das Gerüst lädt neu.
  const { lage, neuLaden } = useSeitenladen(
    async (u): Promise<Stand | null> => {
      const p = await u.speicher.projekte.laden(projektId);
      const e = await bautagebuchLaden(u.speicher, projektId);
      const a = await auftragsLvsLaden(u.speicher, projektId);
      if (!p.ok || !e.ok || !a.ok) return null;
      return { projekt: p.wert, eintraege: e.wert, auftraege: a.wert, heute: datumAusUhr(u.uhr()) };
    },
    [projektId],
  );

  if (lage.art !== 'da') {
    return <Ladeansicht lage={lage} laden={texte.seite.laden} nichtGefunden={texte.seite.nichtGefunden} />;
  }
  return <Tagebuch stand={lage.wert} gehe={gehe} neuLaden={neuLaden} />;
}

function Tagebuch({
  stand,
  gehe,
  neuLaden,
}: {
  stand: Stand;
  gehe: (pfad: string) => void;
  neuLaden: () => void;
}): ReactElement {
  const { projekt, eintraege, auftraege, heute } = stand;
  const u = useUmgebung();
  const { pruefe } = useMeldungen();
  const [aktivId, setAktivId] = useState<string | null>(null);
  const [sprung, setSprung] = useState<VergleichsSprungziel | undefined>(undefined);
  // Der Eintrag, zu dem die Liste springen soll, sobald er in ihr steht (nach dem Speichern erst nach dem Neuladen).
  const [vorgemerkt, setVorgemerkt] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialogart | null>(null);
  const [vonText, setVonText] = useState('');
  const [bisText, setBisText] = useState('');
  const t = texte.bautagebuch;

  // Ticket 122 (A2): die Köpfe je Tag zählt `bauleitung`, für die Liste und den Kopf des gewählten Tages.
  const koepfe = useMemo(() => koepfeJeTag(eintraege), [eintraege]);
  const zeilen = useMemo(() => tageZeilen(eintraege, koepfe), [eintraege, koepfe]);
  const gewaehlt = eintraege.find((e) => e.id === aktivId) ?? null;
  const firmen = useMemo(
    () => auftragnehmerNamen(auftragnehmerAngaben(auftraege.map((z) => z.auftragsLeistungsverzeichnis))),
    [auftraege],
  );

  // Zeitraum: ohne Eingabe vom ersten bis zum letzten Eintrag; ein unlesbares Datum ist ein Hinweis am Feld, kein Fehler.
  const ersterTag = eintraege.reduce<string | null>(
    (m, e) => (m === null || e.datum < m ? e.datum : m),
    null,
  );
  const letzterTag = eintraege.reduce<string | null>(
    (m, e) => (m === null || e.datum > m ? e.datum : m),
    null,
  );
  const vonLesen = vonText.trim() === '' ? null : datumLesen(vonText);
  const bisLesen = bisText.trim() === '' ? null : datumLesen(bisText);
  const von = vonLesen === null ? ersterTag : vonLesen.ok ? vonLesen.wert : null;
  const bis = bisLesen === null ? letzterTag : bisLesen.ok ? bisLesen.wert : null;
  const auswertung = useMemo(
    () => (von === null || bis === null ? null : bautagebuchAuswerten(eintraege, von, bis)),
    [eintraege, von, bis],
  );
  const imZeitraum =
    von === null || bis === null ? [] : eintraege.filter((e) => von <= e.datum && e.datum <= bis);

  const schreibe = async (
    eintrag: Bautagebucheintrag | null,
    befehl: Parameters<ReturnType<typeof bautagebuchSitzung>['befehl']>[0],
  ): Promise<Ausgang<unknown>> => {
    const a = await bautagebuchSitzung(u, projekt.id, eintrag).befehl(befehl);
    neuLaden();
    return a;
  };

  /** Eine Abweisung: am Datum, wenn der Ausführer es nennt (zweiter Eintrag am selben Tag), sonst als Meldung. */
  const abweisungAlsFeld = (a: Ausgang<unknown>, e: EintragEntwurf): Feldfehler => {
    if (a.ok) return {};
    if (a.abweisung.art === 'befehl' && a.abweisung.fehler.feld === 'datum') {
      const d = datumLesen(e.datum);
      return {
        datum: d.ok ? texte.eintrag.datumVergeben(datumDe(d.wert)) : abweisungText(a.abweisung).beschreibung,
      };
    }
    pruefe(a);
    return { datum: abweisungText(a.abweisung).beschreibung };
  };

  const speichere = async (alt: Bautagebucheintrag | null, e: EintragEntwurf): Promise<Feldfehler | null> => {
    const id = alt?.id ?? u.ids.bautagebucheintrag();
    const r = eintragLesen(e, id, projekt.id, eintraege);
    if (!r.ok) return r.fehler;
    const a = await schreibe(alt, { art: 'BautagebucheintragSetzen', eintrag: r.wert });
    if (!a.ok) return abweisungAlsFeld(a, e);
    setVorgemerkt(id);
    return null;
  };

  const loesche = async (): Promise<void> => {
    if (gewaehlt === null) return;
    const a = await schreibe(gewaehlt, { art: 'BautagebucheintragLoeschen' });
    if (pruefe(a)) setDialog(null);
  };

  useEffect(() => {
    if (vorgemerkt === null || !eintraege.some((e) => e.id === vorgemerkt)) return;
    setVorgemerkt(null);
    setAktivId(vorgemerkt);
    setSprung((s) => ({ zeilenId: vorgemerkt, spalte: 'datum', nr: (s?.nr ?? 0) + 1 }));
  }, [vorgemerkt, eintraege]);

  const dateiBereich = `${von ?? ''} ${bis ?? ''}`.trim();
  return (
    <div className="seite lv projekt bauleitung">
      <div className="lv__kopf">
        <h1>{t.titel(projekt.name)}</h1>
        <Verweis pfad={maengelPfad(projekt.id)} text={texte.seite.zuDenMaengeln} gehe={gehe} />
        <Verweis pfad={`/projekt/${projekt.id}`} text={texte.seite.zumProjekt} gehe={gehe} />
      </div>

      <div className="lv__werkzeuge bauleitung__werkzeuge" role="toolbar" aria-label={t.werkzeuge}>
        <HistorieKnoepfe />
        <Button
          variante="primaer"
          onClick={() => {
            setDialog('neu');
          }}
        >
          {t.neu}
        </Button>
        <Button
          disabled={gewaehlt === null}
          onClick={() => {
            setDialog('bearbeiten');
          }}
        >
          {t.bearbeiten}
        </Button>
        <Button
          variante="gefahr"
          disabled={gewaehlt === null}
          onClick={() => {
            setDialog('loeschen');
          }}
        >
          {t.loeschen}
        </Button>
        <Button
          onClick={() => {
            setDialog('pdf');
          }}
        >
          {texte.bautagebuchPdf.knopf}
        </Button>
      </div>

      {eintraege.length === 0 ? <p>{t.leer}</p> : null}
      <p className="bauleitung__auswahl" data-testid="auswahl">
        {gewaehlt === null ? t.keinerAusgewaehlt : t.ausgewaehlt(datumDe(gewaehlt.datum))}
      </p>
      <div className="lv__grid bauleitung__grid">
        <VergleichsGrid
          beschriftung={t.liste}
          spalten={SPALTEN}
          zeilen={zeilen}
          fixierteSpalten={1}
          {...(sprung === undefined ? {} : { sprungziel: sprung })}
          onZeileAktiv={setAktivId}
        />
      </div>

      {gewaehlt === null ? null : (
        <>
          <h2>{texte.bautagebuch.tag(datumDe(gewaehlt.datum), koepfe.get(gewaehlt.datum) ?? 0)}</h2>
          <dl data-testid="tagesansicht">
            <dt>{t.wetter}</dt>
            <dd>{wetterText(gewaehlt.wetter)}</dd>
            <dt>{texte.eintrag.arbeitskraefte}</dt>
            <dd>
              {gewaehlt.arbeitskraefte.length === 0
                ? '–'
                : gewaehlt.arbeitskraefte.map((a) => `${a.firma}: ${String(a.anzahl)}`).join('; ')}
            </dd>
            <dt>{texte.eintrag.geraete}</dt>
            <dd>{gewaehlt.geraete ?? '–'}</dd>
            <dt>{texte.eintrag.leistungen}</dt>
            <dd>{gewaehlt.leistungen ?? '–'}</dd>
            <dt>{texte.eintrag.behinderungen}</dt>
            <dd>{gewaehlt.behinderungen ?? '–'}</dd>
            <dt>{texte.eintrag.vorkommnisse}</dt>
            <dd>{gewaehlt.vorkommnisse ?? '–'}</dd>
          </dl>
        </>
      )}

      <h2>{t.auswertung}</h2>
      <div className="bauleitung__zeitraum">
        <Eingabefeld
          label={t.von}
          value={vonText}
          placeholder={ersterTag === null ? '' : datumDe(ersterTag)}
          onWertChange={setVonText}
          {...(vonLesen !== null && !vonLesen.ok ? { meldung: t.zeitraumFehler } : {})}
        />
        <Eingabefeld
          label={t.bis}
          value={bisText}
          placeholder={letzterTag === null ? '' : datumDe(letzterTag)}
          onWertChange={setBisText}
          {...(bisLesen !== null && !bisLesen.ok ? { meldung: t.zeitraumFehler } : {})}
        />
      </div>
      {auswertung === null ? null : (
        <div data-testid="tagebuchauswertung">
          <table className="bauleitung__tabelle" aria-label={t.jeFirma}>
            <thead>
              <tr>
                <th scope="col">{t.jeFirma}</th>
                <th scope="col">Köpfe</th>
              </tr>
            </thead>
            <tbody>
              {auswertung.jeFirma.map((f) => (
                <tr key={f.firma} data-testid={`firma-${f.firma}`}>
                  <th scope="row">{f.firma}</th>
                  <td>{f.arbeitskraefte}</td>
                </tr>
              ))}
              <tr data-testid="summe">
                <th scope="row">{t.summe}</th>
                <td>{auswertung.arbeitskraefte}</td>
              </tr>
            </tbody>
          </table>
          <ul className="bauleitung__liste" aria-label="Köpfe je Tag">
            {auswertung.jeTag.map((d) => (
              <li key={d.datum} data-testid={`tag-${d.datum}`}>
                {t.tag(datumDe(d.datum), d.arbeitskraefte)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {dialog === 'neu' ? (
        <EintragFormular
          titel={texte.eintrag.titelNeu}
          start={leererEintrag(heute)}
          vorschlaege={firmen}
          onSenden={async (e) => {
            const f = await speichere(null, e);
            if (f === null) setDialog(null);
            return f;
          }}
          onSchliessen={() => {
            setDialog(null);
          }}
        />
      ) : null}
      {dialog === 'bearbeiten' && gewaehlt !== null ? (
        <EintragFormular
          titel={texte.eintrag.titelBearbeiten(datumDe(gewaehlt.datum))}
          start={entwurfAusEintrag(gewaehlt)}
          vorschlaege={firmen}
          onSenden={async (e) => {
            const f = await speichere(gewaehlt, e);
            if (f === null) setDialog(null);
            return f;
          }}
          onSchliessen={() => {
            setDialog(null);
          }}
        />
      ) : null}
      {dialog === 'loeschen' && gewaehlt !== null ? (
        <Dialog
          offen
          onOffenChange={(o) => {
            if (!o) setDialog(null);
          }}
          titel={texte.eintragLoeschen.titel}
          beschreibung={texte.eintragLoeschen.frage(datumDe(gewaehlt.datum))}
          fuss={
            <>
              <Button
                onClick={() => {
                  setDialog(null);
                }}
              >
                {texte.eintragLoeschen.abbrechen}
              </Button>
              <Button variante="gefahr" onClick={() => void loesche()}>
                {texte.eintragLoeschen.bestaetigen}
              </Button>
            </>
          }
        >
          <p>{texte.eintragLoeschen.frage(datumDe(gewaehlt.datum))}</p>
        </Dialog>
      ) : null}
      {dialog === 'pdf' ? (
        <PdfDialog
          titel={texte.bautagebuchPdf.titel}
          dateiname={`Bautagebuch ${dateinameSauber(projekt.name, ERSATZ_PROJEKT)} ${dateiBereich}.pdf`.replace(
            / +/g,
            ' ',
          )}
          zusammenfassung={`${texte.bautagebuchPdf.anzahl(imZeitraum.length)}${von === null || bis === null ? '' : ` (${datumDe(von)} bis ${datumDe(bis)})`}`}
          hinweis={
            von === null || bis === null
              ? t.zeitraumFehler
              : imZeitraum.length === 0
                ? texte.bautagebuchPdf.keine
                : null
          }
          auftrag={{
            art: 'bautagebuch',
            eingabe: {
              projekt: projekt.name,
              eintraege,
              ...(von === null ? {} : { von }),
              ...(bis === null ? {} : { bis }),
              datum: heute,
            },
          }}
          onSchliessen={() => {
            setDialog(null);
          }}
        />
      ) : null}
    </div>
  );
}
