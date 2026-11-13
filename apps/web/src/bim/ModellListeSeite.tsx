// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/projekt/<id>/modelle` (Ticket 114, X1a): die Bauwerksmodelle des Projekts, „IFC einlesen …“, „Neuer Stand …“,
// Umbenennen, Löschen mit Bestätigung (Q5). Jede Änderung ist ein Befehl durch `bim` und Speicher (A5); gelesen wird die
// IFC-Datei im Web Worker (`ifc`). Diese Seite lädt weder three.js noch web-ifc (die 3D-Ansicht nur auf der Modellseite).

import { Button, Dialog, Eingabefeld } from '@tethys/ui-basis';
import type {
  BauwerksmodellId,
  BauwerksmodellUebersicht,
  Projekt,
  ProjektId,
  Pruefbefund,
} from '@tethys/vertrag';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { befehlswegFuer } from '../lv/befehlsweg';
import { datumDe } from '../lv/kopfdaten';
import { abweisungText, useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { Verweis } from '../ui/Verweis';
import { BefundListe } from './BefundListe';
import { modellEinlesen } from './einlesen';
import { IfcArbeiter } from './ifc-arbeiter';
import { modellPfad } from './pfad';
import { bauwerksmodellLaden, bauwerksmodellSitzung } from './schreiben';
import { texte } from './texte';
import '../lv/lv.css';
import './bim.css';

type Laden =
  | { art: 'laedt' }
  | { art: 'fehlt' }
  | { art: 'da'; projekt: Projekt; modelle: readonly BauwerksmodellUebersicht[] };

type Ergebnis =
  | { art: 'laeuft'; datei: string }
  | { art: 'fertig'; datei: string; id: BauwerksmodellId | null; befunde: readonly Pruefbefund[] };

export function ModellListeSeite({
  projektId,
  gehe,
}: {
  projektId: ProjektId;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const { pruefe, speicherfehler } = useMeldungen();
  const [lage, setLage] = useState<Laden>({ art: 'laedt' });
  const [lauf, setLauf] = useState(0);
  const neuLaden = useCallback(() => {
    setLauf((n) => n + 1);
  }, []);
  const datei = useRef<HTMLInputElement>(null);
  const [vorgaenger, setVorgaenger] = useState<BauwerksmodellId | null>(null);
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);
  const [umbenennen, setUmbenennen] = useState<{
    m: BauwerksmodellUebersicht;
    name: string;
    fehlt: boolean;
  } | null>(null);
  const [loeschen, setLoeschen] = useState<BauwerksmodellUebersicht | null>(null);
  const abbrechenRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let aktiv = true;
    void (async (): Promise<Laden> => {
      const p = await u.speicher.projekte.laden(projektId);
      const m = await u.speicher.bauwerksmodelle.auflisten(projektId);
      return p.ok && m.ok ? { art: 'da', projekt: p.wert, modelle: m.wert } : { art: 'fehlt' };
    })().then((l) => {
      if (aktiv) setLage(l);
    });
    return () => {
      aktiv = false;
    };
  }, [u, projektId, lauf]);
  // Undo und Redo legen Modelle an, benennen sie um oder löschen sie: neu laden.
  useEffect(() => befehlswegFuer(u).beiHistorie(neuLaden), [u, neuLaden]);

  if (lage.art === 'laedt') {
    return (
      <div className="seite" aria-busy="true">
        <p>{texte.liste.laden}</p>
      </div>
    );
  }
  if (lage.art === 'fehlt') {
    return (
      <div className="seite">
        <h1>{texte.liste.nichtGefunden}</h1>
        <div className="lv__werkzeuge">
          <HistorieKnoepfe />
        </div>
      </div>
    );
  }
  const { projekt, modelle } = lage;
  const nameVon = (id: BauwerksmodellId | null): string =>
    id === null ? texte.liste.keinVorgaenger : (modelle.find((m) => m.id === id)?.name ?? id);

  const einlesen = async (f: File): Promise<void> => {
    setErgebnis({ art: 'laeuft', datei: f.name });
    const bytes = new Uint8Array(await f.arrayBuffer());
    const arbeiter = new IfcArbeiter();
    try {
      const e = await modellEinlesen(
        u,
        projekt.id,
        { name: f.name, bytes },
        {
          lesen: (b, kopf) => arbeiter.lesen(b, kopf),
          vorgaengerId: vorgaenger,
        },
      );
      if (e.art === 'abgewiesen') {
        setErgebnis(null);
        const t = abweisungText(e.abweisung);
        speicherfehler(
          e.abweisung.art === 'speicher'
            ? e.abweisung.fehler
            : { code: 'unbekannt', meldung: t.beschreibung },
          t.titel,
        );
        return;
      }
      setErgebnis({
        art: 'fertig',
        datei: f.name,
        id: e.art === 'angelegt' ? e.id : null,
        befunde: e.befunde,
      });
      neuLaden();
    } catch {
      setErgebnis({
        art: 'fertig',
        datei: f.name,
        id: null,
        befunde: [
          {
            schwere: 'fehler',
            quelle: 'ifc-lesen',
            code: 'worker',
            meldung: texte.einlesen.workerFehler,
            ort: {},
          },
        ],
      });
    } finally {
      arbeiter.beenden();
    }
  };

  const umbenennenSpeichern = async (): Promise<void> => {
    if (umbenennen === null) return;
    if (umbenennen.name.trim() === '') {
      setUmbenennen({ ...umbenennen, fehlt: true });
      return;
    }
    const z = await bauwerksmodellLaden(u.speicher, umbenennen.m.id);
    if (z === null) return;
    const a = await bauwerksmodellSitzung(u, projekt.id, z).befehl({
      art: 'BauwerksmodellUmbenennen',
      name: umbenennen.name.trim(),
    });
    if (!pruefe(a)) return;
    setUmbenennen(null);
    neuLaden();
  };

  const loeschenBestaetigt = async (): Promise<void> => {
    if (loeschen === null) return;
    const z = await bauwerksmodellLaden(u.speicher, loeschen.id);
    setLoeschen(null);
    if (z === null) return;
    const a = await bauwerksmodellSitzung(u, projekt.id, z).befehl({ art: 'BauwerksmodellLoeschen' });
    if (pruefe(a)) neuLaden();
  };

  const waehlen = (v: BauwerksmodellId | null): void => {
    setVorgaenger(v);
    datei.current?.click();
  };

  return (
    <div className="seite projekt bim">
      <div className="lv__kopf">
        <h1>{texte.liste.titel(projekt.name)}</h1>
        <Verweis pfad={`/projekt/${projekt.id}`} text={texte.liste.zumProjekt} gehe={gehe} />
      </div>
      <div className="lv__werkzeuge" role="toolbar" aria-label={texte.liste.werkzeuge}>
        <HistorieKnoepfe />
        <input
          ref={datei}
          type="file"
          accept=".ifc,.IFC"
          className="bim__datei"
          aria-label={texte.einlesen.datei}
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void einlesen(f);
          }}
        />
        <Button
          onClick={() => {
            waehlen(null);
          }}
          disabled={ergebnis?.art === 'laeuft'}
        >
          {texte.einlesen.knopf}
        </Button>
        {ergebnis?.art === 'laeuft' ? (
          <span role="status" aria-busy="true">
            {texte.einlesen.laeuft(ergebnis.datei)}
          </span>
        ) : null}
      </div>
      {modelle.length === 0 ? (
        <p>{texte.liste.leer}</p>
      ) : (
        <table className="bim__tabelle" aria-label={texte.liste.liste}>
          <thead>
            <tr>
              {texte.liste.spalten.map((s) => (
                <th key={s} scope="col">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modelle.map((m) => (
              <tr key={m.id}>
                <th scope="row">
                  <Verweis pfad={modellPfad(projekt.id, m.id)} text={m.name} gehe={gehe} />
                </th>
                <td>{m.datei.dateiname}</td>
                <td>{texte.liste.schema[m.schema]}</td>
                <td>{datumDe(m.eingelesen)}</td>
                <td className="bim__zahl">{m.anzahlBauteile.toLocaleString('de-DE')}</td>
                <td>{nameVon(m.vorgaengerId)}</td>
                <td className="bim__aktionen">
                  <Button
                    groesse="sm"
                    aria-label={texte.liste.neuerStandVon(m.name)}
                    disabled={ergebnis?.art === 'laeuft'}
                    onClick={() => {
                      waehlen(m.id);
                    }}
                  >
                    {texte.liste.neuerStand}
                  </Button>
                  <Button
                    groesse="sm"
                    aria-label={texte.liste.umbenennenVon(m.name)}
                    onClick={() => {
                      setUmbenennen({ m, name: m.name, fehlt: false });
                    }}
                  >
                    {texte.liste.umbenennen}
                  </Button>
                  <Button
                    groesse="sm"
                    variante="gefahr"
                    aria-label={texte.liste.loeschenVon(m.name)}
                    onClick={() => {
                      setLoeschen(m);
                    }}
                  >
                    {texte.liste.loeschen}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Dialog
        offen={ergebnis?.art === 'fertig'}
        onOffenChange={(o) => {
          if (!o) setErgebnis(null);
        }}
        titel={
          ergebnis?.art === 'fertig' && ergebnis.id !== null
            ? texte.einlesen.titelOk
            : texte.einlesen.titelNicht
        }
        {...(ergebnis === null ? {} : { beschreibung: ergebnis.datei })}
        fuss={
          <>
            <Button
              onClick={() => {
                setErgebnis(null);
              }}
            >
              {texte.einlesen.schliessen}
            </Button>
            {ergebnis?.art === 'fertig' && ergebnis.id !== null ? (
              <Button
                variante="primaer"
                onClick={() => {
                  const id = ergebnis.id;
                  setErgebnis(null);
                  if (id !== null) gehe(modellPfad(projekt.id, id));
                }}
              >
                {texte.einlesen.oeffnen}
              </Button>
            ) : null}
          </>
        }
      >
        {ergebnis?.art === 'fertig' ? (
          <BefundListe befunde={ergebnis.befunde} beschriftung={texte.einlesen.befunde} />
        ) : null}
      </Dialog>

      <Dialog
        offen={umbenennen !== null}
        onOffenChange={(o) => {
          if (!o) setUmbenennen(null);
        }}
        titel={texte.liste.umbenennenTitel}
        fuss={
          <>
            <Button
              onClick={() => {
                setUmbenennen(null);
              }}
            >
              {texte.liste.abbrechen}
            </Button>
            <Button type="submit" form="bim-umbenennen" variante="primaer">
              {texte.liste.speichern}
            </Button>
          </>
        }
      >
        <form
          id="bim-umbenennen"
          onSubmit={(e) => {
            e.preventDefault();
            void umbenennenSpeichern();
          }}
        >
          <Eingabefeld
            label={texte.liste.name}
            value={umbenennen?.name ?? ''}
            onWertChange={(name) => {
              if (umbenennen !== null) setUmbenennen({ ...umbenennen, name, fehlt: false });
            }}
            {...(umbenennen?.fehlt === true ? { meldung: texte.liste.nameFehlt } : {})}
          />
        </form>
      </Dialog>

      <Dialog
        offen={loeschen !== null}
        onOffenChange={(o) => {
          if (!o) setLoeschen(null);
        }}
        titel={texte.liste.loeschenTitel}
        {...(loeschen === null ? {} : { beschreibung: texte.liste.loeschenText(loeschen.name) })}
        anfangsfokus={abbrechenRef}
        fuss={
          <>
            <Button
              ref={abbrechenRef}
              onClick={() => {
                setLoeschen(null);
              }}
            >
              {texte.liste.abbrechen}
            </Button>
            <Button variante="gefahr" onClick={() => void loeschenBestaetigt()}>
              {texte.liste.loeschenBestaetigen}
            </Button>
          </>
        }
      />
    </div>
  );
}
