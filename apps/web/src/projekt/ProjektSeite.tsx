// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/projekt/<id>`: Stammdaten des Projekts (umbenennen), seine LVs (anlegen, umbenennen, öffnen) und der Export
// der Projektdatei. Jede Änderung ist genau ein Befehl durch Kern und Speicher (A5).
//
// Die LV-Liste kommt aus `leistungsverzeichnisse.auflisten` (`LvUebersicht`: Name, Nachtragsangaben, Vorlage, Netto nach
// Nachlass; D-43, D-62), ohne ein LV ganz zu laden. Ganz geladen wird ein LV nur für Umbenennen und Löschen beim Klick.

import { Button, Dialog, Eingabefeld, useToast } from '@tethys/ui-basis';
import type { LeistungsverzeichnisId, LvUebersicht, LvZustand, Projekt, ProjektId } from '@tethys/vertrag';
import { useCallback, useEffect, useId, useState } from 'react';
import type { SyntheticEvent, ReactElement } from 'react';
import { texte as vorlageTexte } from '../vorlage/texte'; // Ticket 90
import { AuftragsLvListe } from '../auftrag/AuftragsLvListe'; // Ticket 64
import { kostenPfad } from '../kosten/pfad'; // Ticket 89
import { texte as kostenTexte } from '../kosten/texte'; // Ticket 89
import { ERSATZ_PROJEKT, dateinameSauber } from '../dateiname';
import { GaebEinlesen } from '../gaeb/GaebEinlesen';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { NachtragKennzeichen } from '../nachtrag/NachtragKennzeichen'; // Ticket 86
import { texte as htexte } from '../historie/texte';
import { befehlswegFuer, type Ausgang } from '../lv/befehlsweg';
import { texte as lvTexte } from '../lv/texte';
import { useMeldungen } from '../lv/meldungen';
import { STANDARD_MASKE_TEXT, ozMaskeLesen } from '../lv/ozmaske';
import { formatiereProzentDe, zahlLesen } from '../lv/zahlen';
import { useSicherung } from '../sicherung/SicherungsAnbieter'; // Ticket 62
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { Verweis } from '../ui/Verweis';
import { STANDARD_MWST, lvAnlegenBefehl } from './befehle';
import { LvNetto } from './LvNetto';
import { texte } from './texte';
import './projekt.css';

export function lvPfad(id: LeistungsverzeichnisId): string {
  return `/lv/${id}`;
}

type Laden =
  { art: 'laedt' } | { art: 'fehlt' } | { art: 'da'; projekt: Projekt; lvs: readonly LvUebersicht[] };

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

/** Dialog mit einem kleinen Formular; Enter im Feld übernimmt. */
function FormDialog(props: {
  offen: boolean;
  titel: string;
  onSchliessen: () => void;
  onSenden: () => void;
  children: ReactElement | ReactElement[];
}): ReactElement {
  const formId = useId();
  return (
    <Dialog
      offen={props.offen}
      onOffenChange={(o) => {
        if (!o) props.onSchliessen();
      }}
      titel={props.titel}
      fuss={
        <>
          <Button onClick={props.onSchliessen}>{texte.projekt.abbrechen}</Button>
          <Button type="submit" form={formId} variante="primaer">
            {texte.projekt.speichern}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          props.onSenden();
        }}
      >
        {props.children}
      </form>
    </Dialog>
  );
}

export function ProjektSeite({ id, gehe }: { id: ProjektId; gehe: (pfad: string) => void }): ReactElement {
  const u = useUmgebung();
  const { pruefe, speicherfehler } = useMeldungen();
  const [lage, setLage] = useState<Laden>({ art: 'laedt' });

  const laden = useCallback(async () => {
    const p = await u.speicher.projekte.laden(id);
    if (!p.ok) {
      setLage({ art: 'fehlt' });
      return;
    }
    // Nach Name sortiert liefert der Speicher (Vertrag); ein Fehler lässt die Liste leer wie bisher.
    const lvs = await u.speicher.leistungsverzeichnisse.auflisten(id);
    setLage({ art: 'da', projekt: p.wert, lvs: lvs.ok ? lvs.wert : [] });
  }, [u, id]);

  /** Das ganze LV für Umbenennen und Löschen, frisch aus dem Speicher; `null` mit Meldung, wenn es nicht geht. */
  const lvLaden = async (lvId: LeistungsverzeichnisId): Promise<LvZustand | null> => {
    const r = await u.speicher.leistungsverzeichnisse.laden(lvId);
    if (r.ok) return r.wert;
    speicherfehler(r.fehler, texte.lvs.ladeFehler);
    return null;
  };

  useEffect(() => {
    void laden();
  }, [laden]);
  // Undo/Redo kann Projekt und LVs ändern (auch löschen oder zurückholen): neu laden.
  useEffect(() => befehlswegFuer(u).beiHistorie(() => void laden()), [u, laden]);
  const { zeige } = useToast();
  const sicherung = useSicherung(); // Ticket 62
  const weg = befehlswegFuer(u);
  // --- Löschen (Ticket 48, Punkt 5) ------------------------------------------------------------------------------
  const [loeschen, setLoeschen] = useState<{ art: 'projekt' } | { art: 'lv'; lv: LvZustand } | null>(null);

  // --- Projekt umbenennen -------------------------------------------------------------------------------------
  const [stammdaten, setStammdaten] = useState<{ name: string; bauherr: string } | null>(null);
  // --- LV umbenennen --------------------------------------------------------------------------------------------
  const [umbenennen, setUmbenennen] = useState<{ lv: LvUebersicht; name: string } | null>(null);
  // --- LV anlegen -----------------------------------------------------------------------------------------------
  const [lvName, setLvName] = useState('');
  const [maske, setMaske] = useState(STANDARD_MASKE_TEXT);
  const [mwst, setMwst] = useState(formatiereProzentDe(STANDARD_MWST));
  const [lvMeldung, setLvMeldung] = useState<{ feld: 'name' | 'maske' | 'mwst'; text: string } | null>(null);

  if (lage.art === 'laedt') {
    return (
      <div className="seite projekt" aria-busy="true">
        <p>{texte.projekt.laden}</p>
      </div>
    );
  }
  if (lage.art === 'fehlt') {
    return (
      <div className="seite projekt">
        <h1>{texte.projekt.nichtGefunden}</h1>
        <Verweis pfad="/" text={texte.projekt.zurueck} gehe={gehe} />
      </div>
    );
  }
  const { projekt, lvs } = lage;

  const stammdatenSpeichern = async (): Promise<void> => {
    if (stammdaten === null) return;
    const a = await weg.projekt(projekt).befehl({
      art: 'ProjektStammdatenSetzen',
      name: stammdaten.name.trim(),
      bauherr: { name: stammdaten.bauherr.trim(), anschrift: projekt.bauherr.anschrift },
    });
    if (!pruefe(a)) return;
    setStammdaten(null);
    await laden();
  };

  const lvUmbenennen = async (): Promise<void> => {
    if (umbenennen === null) return;
    const zustand = await lvLaden(umbenennen.lv.id);
    if (zustand === null) return;
    const a = await weg.lv(projekt.id, zustand).befehl({
      art: 'LeistungsverzeichnisUmbenennen',
      name: umbenennen.name.trim(),
    });
    if (!pruefe(a)) return;
    setUmbenennen(null);
    await laden();
  };

  const lvAnlegen = async (e: SyntheticEvent): Promise<void> => {
    e.preventDefault();
    if (lvName.trim() === '') {
      setLvMeldung({ feld: 'name', text: texte.lvAnlegen.nameFehlt });
      return;
    }
    const m = ozMaskeLesen(maske);
    if (!m.ok) {
      setLvMeldung({ feld: 'maske', text: m.fehler });
      return;
    }
    const satz = zahlLesen('prozent', mwst);
    if (!satz.ok) {
      setLvMeldung({ feld: 'mwst', text: satz.fehler });
      return;
    }
    const befehl = lvAnlegenBefehl(u.ids, projekt.id, lvName.trim(), m.wert, satz.wert);
    const a = await weg.lv(projekt.id, null).befehl(befehl);
    if (pruefe(a)) gehe(lvPfad(befehl.id));
  };

  /** Konflikt des Speichers beim Löschen (abhängige Aggregate) als verständliche Meldung, sonst wie überall. */
  const loeschMeldung = (a: Ausgang<unknown>, konflikt: string): boolean => {
    if (!a.ok && a.abweisung.art === 'speicher' && a.abweisung.fehler.code === 'konflikt') {
      zeige({ titel: lvTexte.meldungen.nichtGespeichert, beschreibung: konflikt, art: 'fehler' });
      return false;
    }
    return pruefe(a);
  };

  const loeschenBestaetigt = async (): Promise<void> => {
    if (loeschen === null) return;
    const was = loeschen;
    setLoeschen(null);
    if (was.art === 'lv') {
      const a = await weg.lv(projekt.id, was.lv).befehl({ art: 'LeistungsverzeichnisLoeschen' });
      if (loeschMeldung(a, htexte.loeschen.lvKonflikt)) await laden();
      return;
    }
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

  const meldung = (feld: 'name' | 'maske' | 'mwst') =>
    lvMeldung?.feld === feld ? { meldung: lvMeldung.text } : {};

  return (
    <div className="seite projekt">
      <div className="projekt__kopf">
        <h1>{projekt.name}</h1>
        <span className="projekt__leise">
          {texte.projekt.bauherr}: {projekt.bauherr.name}
        </span>
      </div>
      <div className="projekt__werkzeuge">
        <HistorieKnoepfe />
        <Button
          onClick={() => {
            setStammdaten({ name: projekt.name, bauherr: projekt.bauherr.name });
          }}
        >
          {texte.projekt.umbenennen}
        </Button>
        <Button
          variante="gefahr"
          onClick={() => {
            setLoeschen({ art: 'projekt' });
          }}
        >
          {htexte.loeschen.projektKnopf}
        </Button>
        <Button onClick={() => void exportieren()}>{texte.projekt.exportieren}</Button>
        {/* Ticket 89 */}
        <Verweis
          pfad={kostenPfad(projekt.id)}
          text={kostenTexte.projekt.kosten}
          gehe={gehe}
          className="tx-button tx-button--schlicht"
        />
        <GaebEinlesen projekt={projekt} onAngelegt={() => void laden()} />
        <Verweis
          pfad="/"
          text={texte.projekt.zurueck}
          gehe={gehe}
          className="tx-button tx-button--schlicht"
        />
      </div>
      <h2>{texte.lvs.titel}</h2>
      {lvs.length === 0 ? (
        <p>{texte.lvs.leer}</p>
      ) : (
        <ul className="projekt__liste" aria-label={texte.lvs.tabelle}>
          {lvs.map((lv) => (
            <li key={lv.id}>
              <Verweis pfad={lvPfad(lv.id)} text={lv.name} gehe={gehe} />
              <NachtragKennzeichen nachtrag={lv.nachtrag} /> {/* Ticket 86 */}
              {/* Ticket 90: Kennzeichen Muster-LV */}
              {lv.vorlage === true ? (
                <span className="projekt__kennzeichen" data-testid="kennzeichen-vorlage">
                  {vorlageTexte.kennzeichen}
                </span>
              ) : null}
              <LvNetto name={lv.name} netto={lv.nettoNachNachlass} />
              <Button
                groesse="sm"
                aria-label={`${texte.lvs.umbenennen}: ${lv.name}`}
                onClick={() => {
                  setUmbenennen({ lv, name: lv.name });
                }}
              >
                {texte.lvs.umbenennen}
              </Button>
              <Button
                groesse="sm"
                variante="gefahr"
                aria-label={`${htexte.loeschen.lvKnopf}: ${lv.name}`}
                onClick={() => {
                  void lvLaden(lv.id).then((z) => {
                    if (z !== null) setLoeschen({ art: 'lv', lv: z });
                  });
                }}
              >
                {htexte.loeschen.lvKnopf}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <AuftragsLvListe projekt={projekt} gehe={gehe} /> {/* Ticket 64 */}
      <form
        className="projekt__formular"
        onSubmit={(e) => void lvAnlegen(e)}
        aria-label={texte.lvAnlegen.titel}
      >
        <h2>{texte.lvAnlegen.titel}</h2>
        <div className="projekt__felder">
          <Eingabefeld
            label={texte.lvAnlegen.name}
            value={lvName}
            onWertChange={(w) => {
              setLvName(w);
              setLvMeldung(null);
            }}
            {...meldung('name')}
          />
          <Eingabefeld
            label={texte.lvAnlegen.maske}
            value={maske}
            hinweis={texte.lvAnlegen.maskeHinweis}
            onWertChange={(w) => {
              setMaske(w);
              setLvMeldung(null);
            }}
            {...meldung('maske')}
          />
          <Eingabefeld
            label={texte.lvAnlegen.mwst}
            value={mwst}
            onWertChange={(w) => {
              setMwst(w);
              setLvMeldung(null);
            }}
            {...meldung('mwst')}
          />
          <Button type="submit" variante="primaer">
            {texte.lvAnlegen.knopf}
          </Button>
        </div>
      </form>
      <Dialog
        offen={loeschen !== null}
        onOffenChange={(o) => {
          if (!o) setLoeschen(null);
        }}
        titel={loeschen?.art === 'lv' ? htexte.loeschen.lvTitel : htexte.loeschen.projektTitel}
        fuss={
          <>
            <Button
              onClick={() => {
                setLoeschen(null);
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
        <p>
          {loeschen?.art === 'lv'
            ? htexte.loeschen.lvFrage(
                loeschen.lv.leistungsverzeichnis.name,
                loeschen.lv.leistungsverzeichnis.knoten.filter((k) => k.art === 'position').length,
                loeschen.lv.papierkorb?.length ?? 0,
              )
            : htexte.loeschen.projektFrage(projekt.name, lvs.length)}
        </p>
      </Dialog>
      <FormDialog
        offen={stammdaten !== null}
        titel={texte.projekt.umbenennen}
        onSchliessen={() => {
          setStammdaten(null);
        }}
        onSenden={() => void stammdatenSpeichern()}
      >
        <Eingabefeld
          label={texte.anlegen.name}
          value={stammdaten?.name ?? ''}
          onWertChange={(w) => {
            setStammdaten((s) => (s ? { ...s, name: w } : s));
          }}
        />
        <Eingabefeld
          label={texte.projekt.bauherr}
          value={stammdaten?.bauherr ?? ''}
          onWertChange={(w) => {
            setStammdaten((s) => (s ? { ...s, bauherr: w } : s));
          }}
        />
      </FormDialog>
      <FormDialog
        offen={umbenennen !== null}
        titel={texte.lvs.umbenennenTitel}
        onSchliessen={() => {
          setUmbenennen(null);
        }}
        onSenden={() => void lvUmbenennen()}
      >
        <Eingabefeld
          label={texte.lvs.neuerName}
          value={umbenennen?.name ?? ''}
          onWertChange={(w) => {
            setUmbenennen((s) => (s ? { ...s, name: w } : s));
          }}
        />
      </FormDialog>
    </div>
  );
}
