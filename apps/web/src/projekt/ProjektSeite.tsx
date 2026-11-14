// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/projekt/<id>`: die Übersicht des Projekts (Ticket 131, B-03). Kopf mit Stammdaten und gruppierten Aktionen,
// „Projekt löschen“ im Menü „Weitere Aktionen“; darunter Abschnitte mit den LVs (Angebote, Zuschlag), den Auftrags-LVs
// (Nachträge, Aufmaß, Rechnungen), den Kosten und den Modulen in Vorschau. Jede Änderung ist genau ein Befehl durch Kern
// und Speicher (A5).
//
// Die Listen kommen aus den Repositories (`projektstandLaden`), ohne ein LV ganz zu laden (D-43, D-62).

import { Button, Dialog, Eingabefeld, Werkzeuggruppe } from '@tethys/ui-basis';
import type { ProjektId } from '@tethys/vertrag';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { aufmassPfad, sollIstPfad } from '../abrechnung/pfad';
import { AuftragsLvListe } from '../auftrag/AuftragsLvListe'; // Ticket 64
import { bautagebuchPfad, maengelPfad } from '../bauleitung/pfad';
import { bauzeitPfad } from '../bauzeit/pfad';
import { modellePfad } from '../bim/pfad';
import { ERSATZ_PROJEKT, dateinameSauber } from '../dateiname';
import { GaebEinlesen } from '../gaeb/GaebEinlesen';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { texte as htexte } from '../historie/texte';
import { honorarPfad } from '../honorar/pfad';
import { kontrollePfad, kostenPfad } from '../kosten/pfad';
import { befehlswegFuer } from '../lv/befehlsweg';
import { useMeldungen } from '../lv/meldungen';
import { rechnungenPfad } from '../rechnung/pfad';
import { useSicherung } from '../sicherung/SicherungsAnbieter'; // Ticket 62
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { bereichsPfad } from '../ui/navigation';
import { Ladeansicht, useSeitenladen } from '../ui/seite';
import { texte as uiTexte } from '../ui/texte';
import { Verweis } from '../ui/Verweis';
import { projektangabenBefehl, projektFormular, type ProjektFormular } from './angaben'; // Ticket 150
import { FormDialog } from './FormDialog';
import { LvAbschnitt, useLoeschMeldung } from './LvAbschnitt';
import { nachtraegeZu, projektstandLaden, type Projektstand } from './stand';
import { texte } from './texte';
import './projekt.css';

export { lvPfad } from './LvAbschnitt';

function dateiname(name: string): string {
  return `${dateinameSauber(name, ERSATZ_PROJEKT)}.tethys.json`;
}

function herunterladen(name: string, inhalt: string): void {
  const url = URL.createObjectURL(new Blob([inhalt], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

const t = texte.uebersicht;

/** Abschnitt „Aufträge“: die Auftrags-LVs und je Auftrags-LV die Wege zu Nachträgen, Aufmaß und Rechnungen. */
function AuftragsAbschnitt({
  stand,
  gehe,
}: {
  stand: Projektstand;
  gehe: (pfad: string) => void;
}): ReactElement {
  const { projekt, auftraege } = stand;
  return (
    <section className="projekt__abschnitt" aria-label={uiTexte.huelle.gruppen.auftraege}>
      <AuftragsLvListe projekt={projekt} gehe={gehe} /> {/* Ticket 64 */}
      {auftraege.length === 0 ? null : (
        <ul className="projekt__liste projekt__liste--leise" aria-label={t.abrechnung}>
          {auftraege.map((a) => (
            <li key={a.id}>
              <span className="projekt__name">{a.name}</span>
              <Verweis
                pfad={bereichsPfad('nachtraege', projekt.id)}
                text={t.nachtraege(nachtraegeZu(stand, a.id).length)}
                aria-label={t.von(t.nachtraege(nachtraegeZu(stand, a.id).length), a.name)}
                gehe={gehe}
              />
              <Verweis
                pfad={aufmassPfad(projekt.id, a.id)}
                text={t.aufmass(stand.aufmasse.get(a.id)?.length ?? 0)}
                aria-label={t.von(t.aufmass(stand.aufmasse.get(a.id)?.length ?? 0), a.name)}
                gehe={gehe}
              />
              <Verweis
                pfad={sollIstPfad(projekt.id, a.id)}
                text={t.sollIst}
                aria-label={t.von(t.sollIst, a.name)}
                gehe={gehe}
              />
              <Verweis
                pfad={rechnungenPfad(projekt.id, a.id)}
                text={t.rechnungen(stand.rechnungen.get(a.id)?.length ?? 0)}
                aria-label={t.von(t.rechnungen(stand.rechnungen.get(a.id)?.length ?? 0), a.name)}
                gehe={gehe}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Abschnitte „Kosten“ und „Vorschau“: Verweise mit der Zahl der Gegenstände. */
function KostenUndVorschau({
  stand,
  gehe,
}: {
  stand: Projektstand;
  gehe: (pfad: string) => void;
}): ReactElement {
  const p = stand.projekt.id;
  const v = stand.vorschau;
  return (
    <div className="projekt__spalten">
      <section className="projekt__abschnitt" aria-labelledby="projekt-kosten">
        <h2 id="projekt-kosten">{t.kosten}</h2>
        <ul className="projekt__verweise">
          <li>
            <Verweis pfad={kostenPfad(p)} text={t.kostenermittlungen(stand.kostenermittlungen)} gehe={gehe} />
          </li>
          <li>
            <Verweis pfad={kontrollePfad(p)} text={t.kostenkontrolle} gehe={gehe} />
          </li>
        </ul>
      </section>
      <section className="projekt__abschnitt" aria-labelledby="projekt-vorschau">
        <h2 id="projekt-vorschau">
          {t.vorschau}{' '}
          <span className="huelle__plakette huelle__plakette--vorschau">{uiTexte.vorschau.kennzeichen}</span>
        </h2>
        <p className="projekt__leise">{t.vorschauHinweis}</p>
        <ul className="projekt__verweise">
          <li>
            <Verweis pfad={modellePfad(p)} text={t.modelle(v.modelle)} gehe={gehe} />
          </li>
          <li>
            <Verweis pfad={bauzeitPfad(p)} text={t.bauzeit(v.bauzeit)} gehe={gehe} />
          </li>
          <li>
            <Verweis pfad={honorarPfad(p)} text={t.honorar(v.honorar)} gehe={gehe} />
          </li>
          <li>
            <Verweis pfad={maengelPfad(p)} text={t.maengel(v.maengel)} gehe={gehe} />
          </li>
          <li>
            <Verweis pfad={bautagebuchPfad(p)} text={t.bautagebuch(v.bautagebuch)} gehe={gehe} />
          </li>
        </ul>
      </section>
    </div>
  );
}

export function ProjektSeite({ id, gehe }: { id: ProjektId; gehe: (pfad: string) => void }): ReactElement {
  const u = useUmgebung();
  const { pruefe, speicherfehler } = useMeldungen();
  const loeschMeldung = useLoeschMeldung();
  // Undo/Redo kann Projekt und LVs ändern (auch löschen oder zurückholen): das Gerüst lädt neu.
  const { lage, neuLaden } = useSeitenladen(({ speicher }) => projektstandLaden(speicher, id), [id]);
  const sicherung = useSicherung(); // Ticket 62
  const weg = befehlswegFuer(u);
  // --- Löschen des Projekts (Ticket 48, Punkt 5) ------------------------------------------------------------------
  const [loeschen, setLoeschen] = useState(false);
  // --- Projektangaben (Ticket 150, E10) ----------------------------------------------------------------------
  const [angaben, setAngaben] = useState<ProjektFormular | null>(null);
  const [nameFehlt, setNameFehlt] = useState(false);

  if (lage.art !== 'da') {
    return (
      <Ladeansicht
        lage={lage}
        laden={texte.projekt.laden}
        nichtGefunden={texte.projekt.nichtGefunden}
        mitHistorie={false}
        zusatz={<Verweis pfad="/" text={texte.projekt.zurueck} gehe={gehe} />}
      />
    );
  }
  const stand = lage.wert;
  const { projekt, lvs } = stand;

  const angabenSpeichern = async (): Promise<void> => {
    if (angaben === null) return;
    if (angaben.name.trim() === '') {
      setNameFehlt(true);
      return;
    }
    const a = await weg.projekt(projekt).befehl(projektangabenBefehl(projekt, angaben));
    if (!pruefe(a)) return;
    setAngaben(null);
    neuLaden();
  };
  const feld = (schluessel: keyof ProjektFormular, label: string): ReactElement => (
    <Eingabefeld
      label={label}
      value={angaben?.[schluessel] ?? ''}
      onWertChange={(w) => {
        setAngaben((s) => (s ? { ...s, [schluessel]: w } : s));
        if (schluessel === 'name') setNameFehlt(false);
      }}
      {...(schluessel === 'name' && nameFehlt ? { meldung: texte.projekt.nameFehlt } : {})}
    />
  );
  const pa = projekt.angaben;
  const baustelle = [pa?.baustelle?.strasse, [pa?.baustelle?.plz, pa?.baustelle?.ort].filter(Boolean).join(' ')]
    .filter((x) => x !== undefined && x !== null && x !== '')
    .join(', ');

  const loeschenBestaetigt = async (): Promise<void> => {
    setLoeschen(false);
    const a = await weg.projekt(projekt).befehl({ art: 'ProjektLoeschen' });
    if (loeschMeldung(a, htexte.loeschen.projektKonflikt)) gehe('/');
  };

  const exportieren = async (): Promise<void> => {
    const r = await u.speicher.projektdateiExportieren(projekt.id);
    if (!r.ok) {
      speicherfehler(r.fehler, texte.projekt.exportFehler);
      return;
    }
    herunterladen(dateiname(projekt.name), r.wert);
    sicherung.exportVermerken(projekt.id); // Ticket 62
  };

  return (
    <div className="seite projekt">
      <div className="projekt__kopf">
        <h1>{projekt.name}</h1>
        <span className="projekt__leise">
          {texte.projekt.bauherr}: {projekt.bauherr.name}
        </span>
        {/* Ticket 150: die Projektangaben, soweit gesetzt */}
        {pa?.nummer ? (
          <span className="projekt__leise">
            {texte.projekt.nummer}: {pa.nummer}
          </span>
        ) : null}
        {pa?.ort ? (
          <span className="projekt__leise">
            {texte.projekt.ort}: {pa.ort}
          </span>
        ) : null}
        {baustelle !== '' ? (
          <span className="projekt__leise">
            {texte.projekt.baustelle}: {baustelle}
          </span>
        ) : null}
        <Verweis pfad="/" text={texte.projekt.zurueck} gehe={gehe} className="projekt__zurueck" />
      </div>
      <div className="projekt__werkzeuge" role="group" aria-label={t.werkzeuge}>
        <div className="projekt__gruppe">
          <HistorieKnoepfe />
        </div>
        <div className="projekt__gruppe">
          <Button
            onClick={() => {
              setNameFehlt(false);
              setAngaben(projektFormular(projekt));
            }}
          >
            {texte.projekt.angabenKnopf}
          </Button>
          <Button onClick={() => void exportieren()}>{texte.projekt.exportieren}</Button>
        </div>
        <div className="projekt__gruppe">
          <GaebEinlesen projekt={projekt} onAngelegt={neuLaden} />
        </div>
        <Werkzeuggruppe titel="…" beschriftung={t.weitere} ausrichtung="end" pfeil={false}>
          <Button
            variante="gefahr"
            onClick={() => {
              setLoeschen(true);
            }}
          >
            {htexte.loeschen.projektKnopf}
          </Button>
        </Werkzeuggruppe>
      </div>
      <LvAbschnitt stand={stand} neuLaden={neuLaden} gehe={gehe} />
      <AuftragsAbschnitt stand={stand} gehe={gehe} />
      <KostenUndVorschau stand={stand} gehe={gehe} />
      <Dialog
        offen={loeschen}
        onOffenChange={(o) => {
          if (!o) setLoeschen(false);
        }}
        titel={htexte.loeschen.projektTitel}
        fuss={
          <>
            <Button
              onClick={() => {
                setLoeschen(false);
              }}
            >
              {htexte.loeschen.abbrechen}
            </Button>
            <Button variante="gefahr" onClick={() => void loeschenBestaetigt()}>
              {htexte.loeschen.bestaetigen}
            </Button>
          </>
        }
      >
        <p>{htexte.loeschen.projektFrage(projekt.name, lvs.length)}</p>
      </Dialog>
      <FormDialog
        offen={angaben !== null}
        titel={texte.projekt.angabenTitel}
        onSchliessen={() => {
          setAngaben(null);
        }}
        onSenden={() => void angabenSpeichern()}
      >
        {feld('name', texte.anlegen.name)}
        {feld('bauherr', texte.projekt.bauherr)}
        {feld('nummer', texte.projekt.nummer)}
        {feld('ort', texte.projekt.ort)}
        <fieldset className="projekt__gruppe-felder">
          <legend>{texte.projekt.baustelle}</legend>
          {feld('strasse', texte.projekt.strasse)}
          {feld('plz', texte.projekt.plz)}
          {feld('baustelleOrt', texte.projekt.baustelleOrt)}
        </fieldset>
      </FormDialog>
    </div>
  );
}
