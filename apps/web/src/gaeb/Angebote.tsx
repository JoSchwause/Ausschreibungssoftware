// SPDX-License-Identifier: AGPL-3.0-or-later
// Angebote eines LV auf der LV-Seite (Ticket 49, Punkt 3): X84 einlesen, Vorschau mit Bietername (änderbar) und
// Befunden, „Übernehmen“ legt bei Bedarf zuerst den Bieter an, dann das Angebot (**ein** Undo-Schritt). Danach eine
// einfache Liste der Angebote mit Bietersummen aus `vergabe`. Die Preisspiegel-Ansicht ist nicht Teil (V3).
// Ticket 149 (E8, B-15, B-16): In der Liste lässt sich ein Angebot bearbeiten (Preise erfassen und berichtigen, Nachlass setzen
// und entfernen) und nach Bestätigung löschen; je ein Undo-Schritt. Weichen die Bieterangaben einer X84 von denen eines
// vorhandenen Bieters ab, bietet der Einlesedialog an, sie zu übernehmen (D-82 S7), im selben Undo-Schritt wie das Angebot.
// „Bieter verwalten …“ steht mit in der Gruppe.

import { Button, Dialog, Eingabefeld, useToast } from '@tethys/ui-basis';
import type { AngebotZustand, Bieter, LvZustand, Projekt } from '@tethys/vertrag';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { ExcelEinlesen } from '../ausgabe/ExcelEinlesen'; // Ticket 66
import { auftragZumLvLaden } from '../auftrag/auftrag';
import { befehlswegFuer } from '../lv/befehlsweg';
import { useMeldungen } from '../lv/meldungen';
import { formatiereBetragDe } from '../lv/zahlen';
import { PreisspiegelLink } from '../vergabe/PreisspiegelLink'; // Ticket 63
import { angabenWeichenAb } from '../vergabe/bieter'; // Ticket 149
import { BieterVerwalten } from '../vergabe/BieterVerwalten'; // Ticket 149
import { angebotAendern, angebotMitBieterangabenAnlegen } from '../vergabe/schreiben'; // Ticket 149
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { AngebotBearbeiten } from './AngebotBearbeiten';
import { angebotsentwurf, entwurfsbefehle, type Angebotsentwurf } from './angebotEntwurf';
import { BefundeBeimEinlesen } from './BefundeBeimEinlesen';
import { abweisungssatz } from './befunde';
import { DateiNichtLesbar, GAEB_ENDUNGEN, dateiBytes, naechsterZug } from './datei';
import {
  angebotAnlegenPlan,
  angebotLesen,
  bieterVorhanden,
  bietersummen,
  vorhandenerBieter,
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
      /** Angaben der Datei für den vorhandenen Bieter übernehmen (nur wenn sie abweichen). */
      readonly angabenUebernehmen: boolean;
    };

/** Ansicht des Dialogs „Angebote“: Liste, ein Angebot bearbeiten oder die Frage vor dem Löschen. */
type Listenansicht =
  | { readonly art: 'liste' }
  | {
      readonly art: 'bearbeiten';
      readonly angebot: AngebotZustand;
      readonly bieter: string;
      readonly entwurf: Angebotsentwurf;
      readonly fehler: ReadonlyMap<string, string>;
    }
  | {
      readonly art: 'loeschen';
      readonly angebot: AngebotZustand;
      readonly bieter: string;
      readonly beauftragt: boolean;
    };

const KEINE_FEHLER: ReadonlyMap<string, string> = new Map();

/** Der vorhandene Bieter dieses Namens, wenn die Datei andere Angaben trägt als er (D-82 S7); sonst `null`. */
function abweichenderBieter(projekt: Projekt, name: string, v: Angebotsvorschau): Bieter | null {
  const b = vorhandenerBieter(projekt, name);
  return b !== undefined && v.bieterAngaben !== undefined && angabenWeichenAb(b, v.bieterAngaben) ? b : null;
}

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
  const [listeOffen, setListeOffenRoh] = useState(false);
  const [ansicht, setAnsicht] = useState<Listenansicht>({ art: 'liste' });
  const setListeOffen = (o: boolean): void => {
    setListeOffenRoh(o);
    setAnsicht({ art: 'liste' });
  };
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
        zustand: a,
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
      setLage({
        art: 'da',
        name: f.name,
        vorschau,
        bieter: vorschau.bieterName,
        meldung: null,
        angabenUebernehmen: false,
      });
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
    const vorhanden = abweichenderBieter(p.wert, lage.bieter, lage.vorschau);
    // D-82 S7: Die Angaben der Datei nur auf ausdrücklichen Wunsch, im selben Undo-Schritt wie das Angebot.
    const angaben =
      lage.angabenUebernehmen && vorhanden !== null && lage.vorschau.bieterAngaben !== undefined
        ? { bieterId: vorhanden.id, angaben: lage.vorschau.bieterAngaben }
        : null;
    const a =
      angaben === null
        ? await weg.angebotAnlegen(p.wert, zustand, plan.neuerBieter, plan.angebot)
        : await angebotMitBieterangabenAnlegen(weg, p.wert, zustand, plan.angebot, angaben);
    if (!pruefe(a)) return;
    setLage(null);
    setLauf((n) => n + 1);
    zeige({ titel: texte.angebot.erfolg, beschreibung: lage.bieter.trim(), art: 'erfolg' });
    setListeOffen(true);
  };

  const zurListe = (): void => {
    setAnsicht({ art: 'liste' });
  };

  /** Speichert die Änderungen am Angebot als einen Undo-Schritt; unlesbare Eingaben bleiben mit Meldung stehen. */
  const bearbeitetSpeichern = async (): Promise<void> => {
    if (ansicht.art !== 'bearbeiten') return;
    const { befehle, fehler } = entwurfsbefehle(zustand, ansicht.angebot.angebot, ansicht.entwurf);
    if (fehler.size > 0) {
      setAnsicht({ ...ansicht, fehler });
      return;
    }
    if (befehle.length === 0) {
      zurListe();
      return;
    }
    const r = await angebotAendern(weg, ansicht.angebot.angebot.id, befehle);
    if (!pruefe(r)) return;
    zeige({ titel: texte.bearbeiten.gespeichert, beschreibung: ansicht.bieter, art: 'erfolg' });
    zurListe();
    setLauf((n) => n + 1);
  };

  /** Vor dem Löschen: Ist auf das Angebot der Zuschlag erteilt, sagt der Dialog, was zuerst nötig ist (Q5). */
  const loeschenFragen = async (a: AngebotZustand, bieter: string): Promise<void> => {
    const auftrag = await auftragZumLvLaden(u.speicher, lv.projektId, lv.id);
    const beauftragt = auftrag.ok && auftrag.wert?.auftragsLeistungsverzeichnis.angebotId === a.angebot.id;
    setAnsicht({ art: 'loeschen', angebot: a, bieter, beauftragt });
  };

  const loeschen = async (a: AngebotZustand, bieter: string): Promise<void> => {
    const r = await angebotAendern(weg, a.angebot.id, [{ art: 'AngebotLoeschen' }]);
    if (!pruefe(r)) return;
    zeige({ titel: texte.liste.geloescht, beschreibung: bieter, art: 'erfolg' });
    zurListe();
    setLauf((n) => n + 1);
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
      <BieterVerwalten
        projektId={lv.projektId}
        onGeaendert={() => {
          setLauf((n) => n + 1);
        }}
      />

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
                abweichend={stand !== null && abweichenderBieter(stand.projekt, lage.bieter, v) !== null}
                uebernehmen={lage.angabenUebernehmen}
                onUebernehmen={(an) => {
                  setLage({ ...lage, angabenUebernehmen: an });
                }}
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
        titel={ansicht.art === 'bearbeiten' ? texte.bearbeiten.titel(ansicht.bieter) : texte.liste.titel}
        fuss={
          ansicht.art === 'bearbeiten' ? (
            <>
              <Button onClick={zurListe}>{texte.bearbeiten.abbrechen}</Button>
              <Button variante="primaer" onClick={() => void bearbeitetSpeichern()}>
                {texte.bearbeiten.speichern}
              </Button>
            </>
          ) : ansicht.art === 'loeschen' ? (
            ansicht.beauftragt ? (
              <Button onClick={zurListe}>{texte.liste.schliessen}</Button>
            ) : (
              <>
                <Button onClick={zurListe}>{texte.liste.abbrechen}</Button>
                <Button variante="gefahr" onClick={() => void loeschen(ansicht.angebot, ansicht.bieter)}>
                  {texte.liste.loeschenBestaetigen}
                </Button>
              </>
            )
          ) : (
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
          )
        }
      >
        {ansicht.art === 'bearbeiten' ? (
          <AngebotBearbeiten
            lv={zustand}
            entwurf={ansicht.entwurf}
            fehler={ansicht.fehler}
            summen={ansicht.angebot.summen.gesamt}
            onEntwurf={(e) => {
              setAnsicht({ ...ansicht, entwurf: e, fehler: KEINE_FEHLER });
            }}
            onSpeichern={() => void bearbeitetSpeichern()}
          />
        ) : ansicht.art === 'loeschen' ? (
          <p role="alert">
            {ansicht.beauftragt
              ? texte.liste.beauftragt(ansicht.bieter)
              : texte.liste.loeschenFrage(ansicht.bieter)}
          </p>
        ) : zeilen.length === 0 ? (
          <p>{texte.liste.leer}</p>
        ) : (
          <table className="gaeb__tabelle" aria-label={texte.liste.tabelle}>
            <thead>
              <tr>
                <th scope="col">{texte.liste.bieter}</th>
                <th scope="col">{texte.liste.netto}</th>
                <th scope="col">{texte.liste.nettoNachNachlass}</th>
                <th scope="col">{texte.liste.brutto}</th>
                <th scope="col">{texte.liste.aktionen}</th>
              </tr>
            </thead>
            <tbody>
              {zeilen.map((z) => (
                <tr key={z.id}>
                  <td>{z.bieter}</td>
                  <td>{formatiereBetragDe(z.summen.netto)}</td>
                  <td>{formatiereBetragDe(z.summen.nettoNachNachlass)}</td>
                  <td>{formatiereBetragDe(z.summen.brutto)}</td>
                  <td className="gaeb__aktionen">
                    <Button
                      groesse="sm"
                      aria-label={texte.liste.bearbeitenFuer(z.bieter)}
                      onClick={() => {
                        setAnsicht({
                          art: 'bearbeiten',
                          angebot: z.zustand,
                          bieter: z.bieter,
                          entwurf: angebotsentwurf(zustand, z.zustand.angebot),
                          fehler: KEINE_FEHLER,
                        });
                      }}
                    >
                      {texte.liste.bearbeiten}
                    </Button>
                    <Button
                      groesse="sm"
                      variante="gefahr"
                      aria-label={texte.liste.loeschenFuer(z.bieter)}
                      onClick={() => void loeschenFragen(z.zustand, z.bieter)}
                    >
                      {texte.liste.loeschen}
                    </Button>
                  </td>
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
  abweichend,
  uebernehmen,
  onUebernehmen,
}: {
  vorschau: Angebotsvorschau;
  vorhanden: boolean;
  /** Der vorhandene Bieter trägt andere Angaben: Die App bietet an, sie zu übernehmen (D-82 S7). */
  abweichend: boolean;
  uebernehmen: boolean;
  onUebernehmen: (an: boolean) => void;
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
    <section className="gaeb__bieterangaben">
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
      {vorhanden && abweichend ? (
        <>
          <p className="gaeb__hinweis">{t.bieterAbweichend}</p>
          <label className="gaeb__schalter">
            <input
              type="checkbox"
              checked={uebernehmen}
              onChange={(e) => {
                onUebernehmen(e.target.checked);
              }}
            />
            {t.angabenUebernehmen}
          </label>
        </>
      ) : vorhanden ? (
        <p className="gaeb__hinweis">{t.bieterVorhanden}</p>
      ) : null}
    </section>
  );
}
