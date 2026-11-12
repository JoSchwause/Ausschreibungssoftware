// SPDX-License-Identifier: AGPL-3.0-or-later
// Seite `/projekt/<id>/honorar/<hid>` (Ticket 119): eine Honorarberechnung. Je Objekt ein Formular (Leistungsbild, Zone,
// Honorarsatz mit benannten Vorgaben, anrechenbare Kosten von Hand oder aus einer Kostenermittlung des Projekts, Leistungsphasen,
// Umbauzuschlag); darunter das Ergebnis als Tabelle mit Herleitung, die Befunde und der feste Hinweis zu DIN 276. Jede Änderung
// ist ein Befehl durch `honorar` und Speicher (A5) und ein Undo-Schritt; ein Feld, das sich nicht lesen lässt, bleibt als
// Meldung am Feld und kommt nie in einen Befehl (U5, N4). Gerechnet wird nur in `honorar`, hier wird formatiert.

import { Auswahl, Button, Dialog, Eingabefeld, useToast } from '@tethys/ui-basis';
import type {
  Honorarberechnung,
  HonorarberechnungId,
  HonorarberechnungZustand,
  Honorarobjekt,
  Kostenermittlung,
  ProjektId,
  Prozent,
} from '@tethys/vertrag';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { datumAusUhr } from '../ausgabe/logik';
import { herunterladenBytes } from '../ausgabe/datei';
import { dateinameSauber } from '../dateiname';
import { HistorieKnoepfe } from '../historie/HistorieAnbieter';
import { befehlswegFuer } from '../lv/befehlsweg';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { Verweis } from '../ui/Verweis';
import { befundAnsicht, ergebnisAnsicht } from './ansicht';
import {
  HONORARSATZ_VORGABEN,
  LEISTUNGSBILDER_LISTE,
  UMBAUZUSCHLAG_VORSCHLAG,
  formularAus,
  kopfAus,
  kopfFormularAus,
  leistungsbildWechseln,
  neuesObjekt,
  objektAus,
  phasenDes,
  vorgabeZu,
  zonenDes,
  type Feldfehler,
  type KopfFormular,
  type ObjektFormular,
} from './formular';
import { honorarPfad } from './pfad';
import { honorarPdf } from './pdf';
import {
  ergebnisBerechnen,
  honorarberechnungSitzung,
  kostenermittlungenDesProjekts,
  type HonorarberechnungSitzung,
} from './schreiben';
import { DIN276_HINWEIS, LEISTUNGSBILD_TEXT, texte } from './texte';
import { formatiereProzentDe } from '@tethys/dezimal';
import '@tethys/ui-grid/grid.css';
import '../lv/lv.css';
import '../projekt/projekt.css';
import './honorar.css';

const t = texte.editor;

type Laden =
  | { art: 'laedt' }
  | { art: 'fehlt' }
  | {
      art: 'da';
      zustand: HonorarberechnungZustand;
      projektName: string;
      kostenermittlungen: readonly Kostenermittlung[];
    };

export function HonorarSeite({
  projektId,
  id,
  gehe,
}: {
  projektId: ProjektId;
  id: HonorarberechnungId;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const [lage, setLage] = useState<Laden>({ art: 'laedt' });
  const [lauf, setLauf] = useState(0);

  useEffect(() => {
    let aktiv = true;
    void (async (): Promise<Laden> => {
      const h = await u.speicher.honorarberechnungen.laden(id);
      const p = await u.speicher.projekte.laden(projektId);
      const k = await kostenermittlungenDesProjekts(u.speicher, projektId);
      return h.ok && p.ok && k.ok
        ? { art: 'da', zustand: h.wert, projektName: p.wert.name, kostenermittlungen: k.wert }
        : { art: 'fehlt' };
    })().then((l) => {
      if (aktiv) setLage(l);
    });
    return () => {
      aktiv = false;
    };
  }, [u, id, projektId, lauf]);
  // Undo und Redo können sie ändern oder entfernen: neu laden.
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
        <h1>{t.nichtGefunden}</h1>
        <div className="lv__werkzeuge">
          <HistorieKnoepfe />
          <Verweis pfad={honorarPfad(projektId)} text={t.zurueck} gehe={gehe} />
        </div>
      </div>
    );
  }
  return (
    <Editor
      zustand={lage.zustand}
      projektName={lage.projektName}
      kostenermittlungen={lage.kostenermittlungen}
      gehe={gehe}
    />
  );
}

function Editor({
  zustand,
  projektName,
  kostenermittlungen,
  gehe,
}: {
  zustand: HonorarberechnungZustand;
  projektName: string;
  kostenermittlungen: readonly Kostenermittlung[];
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const { pruefe } = useMeldungen();
  const { zeige } = useToast();
  const projektId = zustand.honorarberechnung.projektId;
  // Eine Sitzung für die ganze Lebensdauer der Seite: Befehle laufen nacheinander auf dem Stand nach dem vorigen.
  const [sitzung] = useState<HonorarberechnungSitzung>(() => honorarberechnungSitzung(u, projektId, zustand));
  useEffect(() => {
    if (sitzung.zustand !== zustand) sitzung.setze(zustand); // neu geladen (Undo/Redo)
  }, [sitzung, zustand]);
  const aktuell = useSyncExternalStore(sitzung.abonnieren, sitzung.lesen);
  const b = aktuell?.honorarberechnung ?? zustand.honorarberechnung;

  const ergebnis = useMemo(() => ergebnisBerechnen(b, kostenermittlungen), [b, kostenermittlungen]);
  const ansicht = useMemo(() => ergebnisAnsicht(ergebnis), [ergebnis]);
  const befunde = useMemo(() => ergebnis.befunde.map(befundAnsicht), [ergebnis]);

  // Alle Änderungen der Seite laufen nacheinander und lesen den Stand erst, wenn sie an der Reihe sind (kein verlorener Wert,
  // wenn ein Feld verlassen und gleich danach eine Auswahl geändert wird).
  const reihe = useRef<Promise<void>>(Promise.resolve());
  const aendere = useCallback(
    (
      neu: (
        alt: Honorarberechnung,
      ) => Pick<Honorarberechnung, 'name' | 'objekte' | 'nebenkosten' | 'mwstSatz'>,
    ): void => {
      reihe.current = reihe.current.then(async () => {
        const alt = sitzung.zustand?.honorarberechnung;
        if (alt === undefined) return;
        const n = neu(alt);
        const a = await sitzung.befehl({ art: 'HonorarberechnungSetzen', ...n });
        pruefe(a);
      });
    },
    [sitzung, pruefe],
  );

  const objektSetzen = useCallback(
    (index: number, o: Honorarobjekt): void => {
      aendere((alt) => ({ ...alt, objekte: alt.objekte.map((x, i) => (i === index ? o : x)) }));
    },
    [aendere],
  );

  const [loeschen, setLoeschen] = useState(false);
  const loeschenBestaetigt = async (): Promise<void> => {
    setLoeschen(false);
    const a = await sitzung.befehl({ art: 'HonorarberechnungLoeschen' });
    if (pruefe(a)) gehe(honorarPfad(projektId));
  };

  const pdfErzeugen = async (): Promise<void> => {
    try {
      const bytes = await honorarPdf(b, ergebnis, projektName, datumAusUhr(u.uhr()));
      herunterladenBytes(`${dateinameSauber(b.name, 'Honorarberechnung')}.pdf`, bytes, 'application/pdf');
    } catch {
      zeige({ titel: t.pdfFehler, art: 'fehler' });
    }
  };

  return (
    <div className="seite projekt honorar">
      <div className="lv__kopf">
        <h1>{t.titel(b.name)}</h1>
        <Verweis pfad={honorarPfad(projektId)} text={t.zurueck} gehe={gehe} />
      </div>
      <div className="lv__werkzeuge" role="toolbar" aria-label={texte.seite.werkzeuge}>
        <HistorieKnoepfe />
        <Button
          onClick={() => {
            void pdfErzeugen();
          }}
        >
          {t.pdf}
        </Button>
        <Button
          variante="gefahr"
          onClick={() => {
            setLoeschen(true);
          }}
        >
          {t.loeschen}
        </Button>
      </div>

      <h2>{t.kopf}</h2>
      <Kopf b={b} aendere={aendere} />

      <h2>{t.objekte}</h2>
      {b.objekte.length === 0 ? <p>{t.keineObjekte}</p> : null}
      {b.objekte.map((o, i) => (
        <ObjektKarte
          // Die Stelle ist die Identität des Formulars; Inhalt und Undo setzen den Entwurf über `objekt` zurück.
          key={i}
          nummer={i + 1}
          objekt={o}
          kostenermittlungen={kostenermittlungen}
          uebernehmen={(neu) => {
            objektSetzen(i, neu);
          }}
          entfernen={() => {
            aendere((alt) => ({ ...alt, objekte: alt.objekte.filter((_, k) => k !== i) }));
          }}
        />
      ))}
      <div className="honorar__formular">
        <Button
          onClick={() => {
            aendere((alt) => ({
              ...alt,
              objekte: [...alt.objekte, neuesObjekt(`Objekt ${String(alt.objekte.length + 1)}`)],
            }));
          }}
        >
          {t.objektHinzu}
        </Button>
      </div>

      <h2>{t.ergebnis}</h2>
      {ansicht.objekte.map((o, i) => (
        <section key={o.titel} aria-label={o.titel} className="honorar__ergebnis">
          <h3>{o.titel}</h3>
          {!o.berechnet ? <p role="status">{t.nichtBerechnet}</p> : null}
          {o.anrechenbareKosten === null ? null : (
            <table className="honorar__tabelle" aria-label={`${t.herleitung} ${String(i + 1)}`}>
              <caption>{t.herleitung}</caption>
              <tbody>
                {(o.herleitung ?? []).map((z) => (
                  <tr key={z.bezeichnung}>
                    <th scope="row">{z.bezeichnung}</th>
                    <td className="honorar__zahl">{z.wert}</td>
                  </tr>
                ))}
                {o.herleitung === null ? (
                  <tr>
                    <th scope="row">{t.zeilen.anrechenbar}</th>
                    <td className="honorar__zahl">{o.anrechenbareKosten}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
          {o.tafel === null ? null : (
            <table className="honorar__tabelle" aria-label={`${t.tafel} ${String(i + 1)}`}>
              <caption>{t.tafel}</caption>
              <tbody>
                {o.tafel.map((z) => (
                  <tr key={z.bezeichnung}>
                    <th scope="row">{z.bezeichnung}</th>
                    <td className="honorar__zahl">{z.wert}</td>
                  </tr>
                ))}
                <tr className="honorar__summe">
                  <th scope="row">{t.honorar}</th>
                  <td className="honorar__zahl">{o.honorar ?? '–'}</td>
                </tr>
              </tbody>
            </table>
          )}
          {o.phasen.length === 0 ? null : (
            <table className="honorar__tabelle" aria-label={`${t.phasenErgebnis} ${String(i + 1)}`}>
              <caption>{t.phasenErgebnis}</caption>
              <thead>
                <tr>
                  <th scope="col">{t.spalten.phase}</th>
                  <th scope="col" className="honorar__zahl">
                    {t.spalten.anteil}
                  </th>
                  <th scope="col" className="honorar__zahl">
                    {t.spalten.betrag}
                  </th>
                </tr>
              </thead>
              <tbody>
                {o.phasen.map((p) => (
                  <tr key={p.phase}>
                    <th scope="row">{p.phase}</th>
                    <td className="honorar__zahl">{p.anteil}</td>
                    <td className="honorar__zahl">{p.betrag}</td>
                  </tr>
                ))}
                <tr className="honorar__summe">
                  <th scope="row">{t.grundhonorar}</th>
                  <td />
                  <td className="honorar__zahl">{o.grundhonorar}</td>
                </tr>
                <tr>
                  <th scope="row">{t.umbauzuschlag}</th>
                  <td />
                  <td className="honorar__zahl">{o.umbauzuschlag}</td>
                </tr>
              </tbody>
            </table>
          )}
        </section>
      ))}
      <table className="honorar__tabelle" aria-label={t.summen}>
        <caption>{t.summen}</caption>
        <tbody>
          {ansicht.summen.map((z, i) => (
            <tr
              key={z.bezeichnung}
              className={i === ansicht.summen.length - 1 ? 'honorar__summe' : undefined}
            >
              <th scope="row">{z.bezeichnung}</th>
              <td className="honorar__zahl">{z.wert}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{t.befunde}</h2>
      {befunde.length === 0 ? (
        <p>{t.keineBefunde}</p>
      ) : (
        <ul className="honorar__befunde" aria-label={t.befunde}>
          {befunde.map((x, i) => (
            <li key={`${x.code}-${String(i)}`} className={`honorar__befund--${x.schwere}`}>
              {x.schwere === 'fehler' ? t.befundFehler : t.befundWarnung}
              {x.ort === '' ? '' : ` (${x.ort})`}: {x.text}
            </li>
          ))}
        </ul>
      )}
      <h2>{t.din276Titel}</h2>
      <p className="honorar__hinweis" data-testid="din276-hinweis">
        {DIN276_HINWEIS}
      </p>

      <Dialog
        offen={loeschen}
        onOffenChange={(o) => {
          if (!o) setLoeschen(false);
        }}
        titel={t.loeschenTitel}
        beschreibung={t.loeschenFrage(b.name)}
        fuss={
          <>
            <Button
              onClick={() => {
                setLoeschen(false);
              }}
            >
              {t.abbrechen}
            </Button>
            <Button variante="gefahr" onClick={() => void loeschenBestaetigt()}>
              {t.loeschenBestaetigen}
            </Button>
          </>
        }
      />
    </div>
  );
}

// --- Name, Nebenkosten, MwSt ----------------------------------------------------------------------------------------------

function Kopf({
  b,
  aendere,
}: {
  b: Honorarberechnung;
  aendere: (
    neu: (alt: Honorarberechnung) => Pick<Honorarberechnung, 'name' | 'objekte' | 'nebenkosten' | 'mwstSatz'>,
  ) => void;
}): ReactElement {
  const [f, setF] = useState<KopfFormular>(() => kopfFormularAus(b.name, b.nebenkosten, b.mwstSatz));
  const [fehler, setFehler] = useState<Feldfehler | null>(null);
  // Von außen geändert (Undo, Redo): der Entwurf folgt dem gespeicherten Stand.
  useEffect(() => {
    const r = kopfAus(f);
    const gleich =
      r.ok &&
      r.wert.name === b.name &&
      r.wert.mwstSatz === b.mwstSatz &&
      JSON.stringify(r.wert.nebenkosten) === JSON.stringify(b.nebenkosten);
    if (!gleich) setF(kopfFormularAus(b.name, b.nebenkosten, b.mwstSatz));
    // nur wenn sich der gespeicherte Stand ändert
  }, [b.name, b.nebenkosten, b.mwstSatz]);

  const uebernehmen = (neu: KopfFormular): void => {
    const r = kopfAus(neu);
    if (!r.ok) {
      setFehler(r.fehler);
      return;
    }
    setFehler(null);
    const w = r.wert;
    aendere((alt) => {
      return { ...alt, name: w.name, nebenkosten: w.nebenkosten, mwstSatz: w.mwstSatz };
    });
  };
  const meldung = (feld: string): { meldung: string } | Record<string, never> =>
    fehler?.feld === feld ? { meldung: fehler.meldung } : {};
  const taste = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') uebernehmen(f);
  };

  return (
    <div className="honorar__formular" role="group" aria-label={t.kopf}>
      <Eingabefeld
        label={t.name}
        value={f.name}
        onWertChange={(v) => {
          setF({ ...f, name: v });
        }}
        onBlur={() => {
          uebernehmen(f);
        }}
        onKeyDown={taste}
        {...meldung('name')}
      />
      <Auswahl
        label={t.nebenkosten}
        wert={f.nebenArt}
        onWertChange={(w) => {
          const neu = {
            ...f,
            nebenArt: w as KopfFormular['nebenArt'],
            nebenWert: w === 'keine' ? '' : f.nebenWert,
          };
          setF(neu);
          if (w === 'keine' || neu.nebenWert.trim() !== '') uebernehmen(neu);
        }}
        optionen={(['keine', 'prozent', 'betrag'] as const).map((w) => ({ wert: w, label: t.nebenArt[w] }))}
      />
      {f.nebenArt === 'keine' ? null : (
        <Eingabefeld
          label={t.nebenWert}
          value={f.nebenWert}
          onWertChange={(v) => {
            setF({ ...f, nebenWert: v });
          }}
          onBlur={() => {
            uebernehmen(f);
          }}
          onKeyDown={taste}
          inputMode="decimal"
          {...meldung('nebenkosten')}
        />
      )}
      <Eingabefeld
        label={t.mwst}
        value={f.mwstSatz}
        onWertChange={(v) => {
          setF({ ...f, mwstSatz: v });
        }}
        onBlur={() => {
          uebernehmen(f);
        }}
        onKeyDown={taste}
        inputMode="decimal"
        {...meldung('mwstSatz')}
      />
    </div>
  );
}

// --- Ein Objekt -----------------------------------------------------------------------------------------------------------

function ObjektKarte({
  nummer,
  objekt,
  kostenermittlungen,
  uebernehmen,
  entfernen,
}: {
  nummer: number;
  objekt: Honorarobjekt;
  kostenermittlungen: readonly Kostenermittlung[];
  uebernehmen: (o: Honorarobjekt) => void;
  entfernen: () => void;
}): ReactElement {
  const vorschlag = kostenermittlungen[0]?.id ?? '';
  const [f, setF] = useState<ObjektFormular>(() => formularAus(objekt, vorschlag));
  const [fehler, setFehler] = useState<Feldfehler | null>(null);
  // Von außen geändert (Undo, Redo, anderes Objekt an dieser Stelle): der Entwurf folgt dem gespeicherten Stand.
  useEffect(() => {
    const r = objektAus(f);
    if (!r.ok || JSON.stringify(r.wert) !== JSON.stringify(objekt)) {
      setF(formularAus(objekt, vorschlag));
      setFehler(null);
    }
    // nur wenn sich der gespeicherte Stand ändert
  }, [objekt]);

  const commit = (neu: ObjektFormular): void => {
    const r = objektAus(neu);
    if (!r.ok) {
      setFehler(r.fehler);
      return;
    }
    setFehler(null);
    if (JSON.stringify(r.wert) !== JSON.stringify(objekt)) uebernehmen(r.wert);
  };
  /** Auswahl und Schalter: übernehmen und sofort speichern. */
  const sofort = (neu: ObjektFormular): void => {
    setF(neu);
    commit(neu);
  };
  const meldung = (feld: string): { meldung: string } | Record<string, never> =>
    fehler?.feld === feld ? { meldung: fehler.meldung } : {};
  const taste = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') commit(f);
  };
  const text = (
    label: string,
    schluessel:
      'bezeichnung' | 'honorarsatz' | 'betrag' | 'weitereKosten' | 'bausubstanz' | 'umbauzuschlagssatz',
    feld: string = schluessel,
    zahl = true,
  ): ReactElement => (
    <Eingabefeld
      label={label}
      value={f[schluessel]}
      onWertChange={(v) => {
        setF({ ...f, [schluessel]: v });
      }}
      onBlur={() => {
        commit(f);
      }}
      onKeyDown={taste}
      {...(zahl ? { inputMode: 'decimal' as const } : {})}
      {...meldung(feld)}
    />
  );

  const standard = new Map(phasenDes(f.leistungsbild).map((p) => [p.nummer, p] as const));
  const vorgabe = vorgabeZu(f.honorarsatz);
  const kosten = kostenermittlungen;

  return (
    <section className="honorar__objekt" aria-label={t.objektTitel(nummer, f.bezeichnung)}>
      <h3>{t.objektTitel(nummer, f.bezeichnung)}</h3>
      <div className="honorar__formular">
        {text(t.bezeichnung, 'bezeichnung', 'bezeichnung', false)}
        <Auswahl
          label={t.leistungsbild}
          wert={f.leistungsbild}
          onWertChange={(w) => {
            sofort(leistungsbildWechseln(f, w as ObjektFormular['leistungsbild']));
          }}
          optionen={LEISTUNGSBILDER_LISTE.map((l) => ({ wert: l, label: LEISTUNGSBILD_TEXT[l] }))}
        />
        <Auswahl
          label={t.honorarzone}
          wert={f.honorarzone}
          onWertChange={(w) => {
            sofort({ ...f, honorarzone: w as ObjektFormular['honorarzone'] });
          }}
          optionen={zonenDes(f.leistungsbild).map((z) => ({ wert: z, label: `Honorarzone ${z}` }))}
        />
      </div>
      <div className="honorar__formular">
        <Auswahl
          label={t.honorarsatzVorgabe}
          wert={vorgabe}
          onWertChange={(w) => {
            if (w === 'frei') return;
            sofort({ ...f, honorarsatz: formatiereProzentDe(w as Prozent) });
          }}
          optionen={[
            ...HONORARSATZ_VORGABEN.map((v) => ({
              wert: v.satz,
              label: `${v.name} (${formatiereProzentDe(v.satz as Prozent)} %)`,
            })),
            { wert: 'frei', label: t.honorarsatzFrei },
          ]}
        />
        {text(t.honorarsatz, 'honorarsatz')}
        <p className="honorar__hinweistext">{t.honorarsatzHinweis}</p>
      </div>

      <h3>{t.kosten}</h3>
      <div className="honorar__formular">
        <Auswahl
          label={t.kostenart}
          wert={f.kostenart}
          deaktiviert={false}
          onWertChange={(w) => {
            sofort({ ...f, kostenart: w as ObjektFormular['kostenart'] });
          }}
          optionen={[
            { wert: 'betrag', label: t.kostenartBetrag },
            { wert: 'kostenermittlung', label: t.kostenartKostenermittlung },
          ]}
        />
        {f.kostenart === 'betrag' ? (
          text(t.betrag, 'betrag')
        ) : (
          <>
            {kosten.length === 0 ? (
              <p role="status">{t.keineKostenermittlung}</p>
            ) : (
              <Auswahl
                label={t.kostenermittlung}
                wert={f.kostenermittlungId === '' ? undefined : f.kostenermittlungId}
                onWertChange={(w) => {
                  sofort({ ...f, kostenermittlungId: w });
                }}
                optionen={kosten.map((k) => ({ wert: k.id, label: k.name }))}
              />
            )}
            {text(t.weitereKosten, 'weitereKosten')}
            {text(t.bausubstanz, 'bausubstanz')}
            <label className="honorar__schalter">
              <input
                type="checkbox"
                checked={f.technischeAnlagenAnteilig}
                onChange={(e) => {
                  sofort({ ...f, technischeAnlagenAnteilig: e.target.checked });
                }}
              />
              {t.technischeAnlagen}
            </label>
          </>
        )}
        {fehler?.feld === 'kostenermittlung' ? <p role="status">{fehler.meldung}</p> : null}
      </div>

      <h3>{t.phasen}</h3>
      <table className="honorar__tabelle honorar__phasen" aria-label={`${t.phasen} ${String(nummer)}`}>
        <thead>
          <tr>
            <th scope="col">{t.phasenKopf.beauftragt}</th>
            <th scope="col">{t.phasenKopf.phase}</th>
            <th scope="col" className="honorar__zahl">
              {t.phasenKopf.standard}
            </th>
            <th scope="col">{t.phasenKopf.anteil}</th>
          </tr>
        </thead>
        <tbody>
          {f.phasen.map((p) => {
            const s = standard.get(p.nummer);
            return (
              <tr key={p.nummer}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={t.phaseBeauftragt(p.nummer)}
                    checked={p.beauftragt}
                    onChange={(e) => {
                      sofort({
                        ...f,
                        phasen: f.phasen.map((x) =>
                          x.nummer === p.nummer ? { ...x, beauftragt: e.target.checked } : x,
                        ),
                      });
                    }}
                  />
                </td>
                <th scope="row">{`LPH ${String(p.nummer)} ${s?.name ?? ''}`}</th>
                <td className="honorar__zahl">
                  {s === undefined ? '' : `${formatiereProzentDe(s.anteil)} %`}
                </td>
                <td>
                  <Eingabefeld
                    kompakt
                    label={t.phaseAnteil(p.nummer)}
                    value={p.anteil}
                    placeholder={s === undefined ? '' : formatiereProzentDe(s.anteil)}
                    inputMode="decimal"
                    onWertChange={(v) => {
                      setF({
                        ...f,
                        phasen: f.phasen.map((x) => (x.nummer === p.nummer ? { ...x, anteil: v } : x)),
                      });
                    }}
                    onBlur={() => {
                      commit(f);
                    }}
                    onKeyDown={taste}
                    {...meldung(`anteil${String(p.nummer)}`)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="honorar__formular">
        <label className="honorar__schalter">
          <input
            type="checkbox"
            checked={f.umbau}
            onChange={(e) => {
              // Bei „Umbau“ der Vorschlag 20 % (§ 6 Abs. 2), solange der Nutzer keinen anderen Satz eingetragen hat.
              const vorschlagSatz =
                f.umbauzuschlagssatz.trim() === ''
                  ? formatiereProzentDe(UMBAUZUSCHLAG_VORSCHLAG as Prozent)
                  : f.umbauzuschlagssatz;
              sofort({ ...f, umbau: e.target.checked, umbauzuschlagssatz: vorschlagSatz });
            }}
          />
          {t.umbau}
        </label>
        {f.umbau ? text(t.umbauSatz, 'umbauzuschlagssatz') : null}
        {f.umbau ? <p className="honorar__hinweistext">{t.umbauHinweis}</p> : null}
      </div>
      <div className="honorar__formular">
        <Button variante="gefahr" onClick={entfernen}>
          {t.objektEntfernen}
        </Button>
      </div>
    </section>
  );
}
