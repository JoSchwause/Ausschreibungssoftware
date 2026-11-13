// SPDX-License-Identifier: AGPL-3.0-or-later
// Angebote eines LV auf der LV-Seite (Ticket 49, Punkt 3): X84 einlesen, Vorschau mit Bietername (änderbar) und
// Befunden, „Übernehmen“ legt bei Bedarf zuerst den Bieter an, dann das Angebot (**ein** Undo-Schritt). Danach eine
// einfache Liste der Angebote mit Bietersummen aus `vergabe`. Die Preisspiegel-Ansicht ist nicht Teil (V3).

import { Button, Dialog, Eingabefeld, useToast } from '@tethys/ui-basis';
import type { AngebotZustand, LvZustand, Projekt } from '@tethys/vertrag';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { ExcelEinlesen } from '../ausgabe/ExcelEinlesen'; // Ticket 66
import { befehlswegFuer } from '../lv/befehlsweg';
import { useMeldungen } from '../lv/meldungen';
import { formatiereBetragDe } from '../lv/zahlen';
import { PreisspiegelLink } from '../vergabe/PreisspiegelLink'; // Ticket 63
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { BefundeBeimEinlesen } from './BefundeBeimEinlesen';
import { abweisungssatz } from './befunde';
import { DateiNichtLesbar, GAEB_ENDUNGEN, dateiBytes, naechsterZug } from './datei';
import {
  angebotAnlegenPlan,
  angebotLesen,
  bieterVorhanden,
  bietersummen,
  type Angebotsvorschau,
} from './gaeb';
import { texte } from './texte';
import './gaeb.css';

type Lage =
  | { readonly art: 'liest'; readonly name: string }
  | {
      readonly art: 'da';
      readonly name: string;
      readonly vorschau: Angebotsvorschau;
      readonly bieter: string;
      readonly meldung: string | null;
    };

interface Stand {
  readonly projekt: Projekt;
  readonly angebote: readonly AngebotZustand[];
}

export function Angebote({ zustand }: { zustand: LvZustand }): ReactElement {
  const u = useUmgebung();
  const weg = befehlswegFuer(u);
  const { pruefe } = useMeldungen();
  const { zeige } = useToast();
  const datei = useRef<HTMLInputElement>(null);
  const [lage, setLage] = useState<Lage | null>(null);
  const [listeOffen, setListeOffen] = useState(false);
  const [stand, setStand] = useState<Stand | null>(null);
  const [lauf, setLauf] = useState(0);
  const lv = zustand.leistungsverzeichnis;

  const laden = useCallback(async (): Promise<Stand | null> => {
    const p = await u.speicher.projekte.laden(lv.projektId);
    const ids = await u.speicher.angebote.auflisten(lv.id);
    if (!p.ok || !ids.ok) return null;
    const angebote: AngebotZustand[] = [];
    for (const id of ids.wert) {
      const a = await u.speicher.angebote.laden(id);
      if (a.ok) angebote.push(a.wert);
    }
    return { projekt: p.wert, angebote };
  }, [u, lv.id, lv.projektId]);

  useEffect(() => {
    let aktiv = true;
    void laden().then((s) => {
      if (aktiv && s !== null) setStand(s);
    });
    return () => {
      aktiv = false;
    };
  }, [laden, lauf]);
  // Undo und Redo können Angebot und Bieter schreiben oder zurücknehmen.
  useEffect(
    () =>
      weg.beiHistorie(() => {
        setLauf((n) => n + 1);
      }),
    [weg],
  );

  const zeilen = useMemo(() => {
    if (stand === null) return [];
    return stand.angebote
      .map((a) => ({
        id: a.angebot.id,
        bieter: stand.projekt.bieter.find((b) => b.id === a.angebot.bieterId)?.name ?? a.angebot.bieterId,
        summen: bietersummen(zustand, a.angebot),
      }))
      .sort((x, y) => x.bieter.localeCompare(y.bieter, 'de'));
  }, [stand, zustand]);

  const waehlen = async (f: File): Promise<void> => {
    setLage({ art: 'liest', name: f.name });
    try {
      await naechsterZug();
      const vorschau = angebotLesen(await dateiBytes(f), f.name, zustand, u.ids);
      setLage({ art: 'da', name: f.name, vorschau, bieter: vorschau.bieterName, meldung: null });
    } catch (e) {
      setLage(null);
      // Erwartet ist nur „Datei nicht lesbar“; ein Fehler des Lesers ist ein Programmfehler und geht weiter (Q5).
      if (!(e instanceof DateiNichtLesbar)) throw e;
      zeige({ titel: texte.einlesen.nichtLesbar, beschreibung: f.name, art: 'fehler' });
    }
  };

  const uebernehmen = async (): Promise<void> => {
    if (lage?.art !== 'da') return;
    if (lage.bieter.trim() === '') {
      setLage({ ...lage, meldung: texte.angebot.bieterFehlt });
      return;
    }
    // Das Projekt frisch laden: Der Bieter kann inzwischen angelegt oder zurückgenommen worden sein.
    const p = await u.speicher.projekte.laden(lv.projektId);
    if (!p.ok) return;
    const plan = angebotAnlegenPlan(lage.vorschau, lage.bieter, p.wert, u.ids);
    if (plan === null) return;
    const a = await weg.angebotAnlegen(p.wert, zustand, plan.neuerBieter, plan.angebot);
    if (!pruefe(a)) return;
    setLage(null);
    setLauf((n) => n + 1);
    zeige({ titel: texte.angebot.erfolg, beschreibung: lage.bieter.trim(), art: 'erfolg' });
    setListeOffen(true);
  };

  const v = lage?.art === 'da' ? lage.vorschau : null;
  const positionen = v?.angebot?.positionen.length ?? 0;
  return (
    <>
      <input
        ref={datei}
        type="file"
        accept={GAEB_ENDUNGEN}
        className="gaeb__datei"
        aria-label={texte.angebot.datei}
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void waehlen(f);
        }}
      />
      <Button onClick={() => datei.current?.click()}>{texte.angebot.knopf}</Button>
      {/* Ticket 66 */}
      <ExcelEinlesen
        zustand={zustand}
        onAngelegt={() => {
          setLauf((n) => n + 1);
          setListeOffen(true);
        }}
      />
      <Button
        onClick={() => {
          setListeOffen(true);
        }}
      >
        {texte.liste.knopf(zeilen.length)}
      </Button>

      <Dialog
        offen={lage !== null}
        onOffenChange={(o) => {
          if (!o) setLage(null);
        }}
        titel={texte.angebot.titel}
        {...(lage === null ? {} : { beschreibung: lage.name })}
        fuss={
          <>
            <Button
              onClick={() => {
                setLage(null);
              }}
            >
              {texte.angebot.schliessen}
            </Button>
            {v?.uebernehmbar === true ? (
              <Button variante="primaer" onClick={() => void uebernehmen()}>
                {texte.angebot.uebernehmen}
              </Button>
            ) : null}
          </>
        }
      >
        {lage?.art === 'liest' ? <p aria-busy="true">{texte.angebot.liest}</p> : null}
        {lage?.art === 'da' && v !== null ? (
          <div role="group" aria-label={texte.einlesen.vorschau}>
            <dl className="gaeb__zahlen">
              <dt>{texte.angebot.phase}</dt>
              <dd>{v.phase ?? texte.einlesen.unbekannt}</dd>
              <dt>{texte.angebot.version}</dt>
              <dd>{v.version ?? texte.einlesen.unbekannt}</dd>
              <dt>{texte.angebot.positionen}</dt>
              <dd data-testid="anzahl-angebotspositionen">{positionen}</dd>
            </dl>
            {v.uebernehmbar ? (
              <Eingabefeld
                label={texte.angebot.bieter}
                value={lage.bieter}
                hinweis={texte.angebot.bieterHinweis}
                onWertChange={(w) => {
                  setLage({ ...lage, bieter: w, meldung: null });
                }}
                {...(lage.meldung === null ? {} : { meldung: lage.meldung })}
              />
            ) : (
              <p>{texte.angebot.leer}</p>
            )}
            {v.uebernehmbar && v.bieterAngaben !== undefined ? (
              <BieterangabenDerDatei
                vorschau={v}
                vorhanden={stand !== null && bieterVorhanden(stand.projekt, lage.bieter)}
              />
            ) : null}
            {v.phase !== 'X84' && abweisungssatz(v.befunde) === null ? (
              <p>{texte.angebot.keinX84(v.phase, v.version)}</p>
            ) : null}
            <BefundeBeimEinlesen befunde={v.befunde} />
          </div>
        ) : null}
      </Dialog>

      <Dialog
        offen={listeOffen}
        onOffenChange={setListeOffen}
        titel={texte.liste.titel}
        fuss={
          <>
            {zeilen.length > 0 ? <PreisspiegelLink lvId={lv.id} /> : null} {/* Ticket 63 */}
            <Button
              onClick={() => {
                setListeOffen(false);
              }}
            >
              {texte.liste.schliessen}
            </Button>
          </>
        }
      >
        {zeilen.length === 0 ? (
          <p>{texte.liste.leer}</p>
        ) : (
          <table className="gaeb__tabelle" aria-label={texte.liste.tabelle}>
            <thead>
              <tr>
                <th scope="col">{texte.liste.bieter}</th>
                <th scope="col">{texte.liste.netto}</th>
                <th scope="col">{texte.liste.nettoNachNachlass}</th>
                <th scope="col">{texte.liste.brutto}</th>
              </tr>
            </thead>
            <tbody>
              {zeilen.map((z) => (
                <tr key={z.id}>
                  <td>{z.bieter}</td>
                  <td>{formatiereBetragDe(z.summen.netto)}</td>
                  <td>{formatiereBetragDe(z.summen.nettoNachNachlass)}</td>
                  <td>{formatiereBetragDe(z.summen.brutto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Dialog>
    </>
  );
}

/** Anschrift und Kontakt aus der Datei; bei einem vorhandenen Bieter der Hinweis, dass sie nicht übernommen werden. */
function BieterangabenDerDatei({
  vorschau,
  vorhanden,
}: {
  vorschau: Angebotsvorschau;
  vorhanden: boolean;
}): ReactElement | null {
  const a = vorschau.bieterAngaben;
  if (a === undefined) return null;
  const t = texte.angebot;
  const ort =
    a.anschrift === null ? '' : [a.anschrift.plz, a.anschrift.ort].filter((x) => x !== null).join(' ');
  const anschrift =
    a.anschrift === null ? null : [a.anschrift.strasse ?? '', ort].filter((x) => x !== '').join(', ');
  const zeilen: readonly (readonly [string, string | null])[] = [
    [t.anschrift, anschrift],
    [t.ansprechperson, a.ansprechperson],
    [t.telefon, a.telefon],
    [t.email, a.email],
  ];
  return (
    <section aria-label={t.angaben}>
      <h3 className="gaeb__unterkopf">{t.angaben}</h3>
      <dl className="gaeb__zahlen" data-testid="bieterangaben">
        {zeilen.map(([dt, dd]) =>
          dd === null || dd === '' ? null : (
            <Fragment key={dt}>
              <dt>{dt}</dt>
              <dd>{dd}</dd>
            </Fragment>
          ),
        )}
      </dl>
      {vorhanden ? <p className="gaeb__hinweis">{t.bieterVorhanden}</p> : null}
    </section>
  );
}
