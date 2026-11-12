// SPDX-License-Identifier: AGPL-3.0-or-later
// Leiste „Kennwerte“ der Modellseite (Ticket 115, X1e, D-52): BGF, BRI, NRF aus dem Modell mit Quelle (fehlt eine Größe,
// gibt der Nutzer sie ein, als Eingabe gekennzeichnet), „Kostenschätzung über Kennwerte …“ (Vorschau → neue
// Kostenermittlung, Stufe Kostenschätzung) und die Kostenkennwerte einer bestehenden Kostenermittlung je KG.

import type { Bezugsgroessenart, Din277Groessen } from '@tethys/bim';
import { formatiereBetragDe, formatiereMengeDe } from '@tethys/dezimal';
import { Auswahl, Button, Dialog, Eingabefeld, useToast } from '@tethys/ui-basis';
import type { Bauwerksmodell, Betrag, KostenermittlungZustand, ProjektId } from '@tethys/vertrag';
import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { kostenermittlungPfad } from '../kosten/pfad';
import { kostenermittlungenLaden, kostenermittlungSitzung } from '../kosten/schreiben';
import { befehlswegFuer } from '../lv/befehlsweg';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { BefundListe } from './BefundListe';
import {
  BEZUGSGROESSEN,
  groessenLesen,
  kostenkennwerteZeilen,
  schaetzungBauen,
  type Kennwertzeile,
} from './kennwerte';
import { texte } from './texte';

const t = texte.kennwerte;
const EINHEIT: Readonly<Record<Bezugsgroessenart, string>> = { BGF: 'm²', BRI: 'm³', NRF: 'm²' };
const groesse = (g: Din277Groessen, art: Bezugsgroessenart) =>
  art === 'BGF' ? g.bgf : art === 'BRI' ? g.bri : g.nrf;

export function KennwerteBereich({
  projektId,
  modell,
  gehe,
}: {
  projektId: ProjektId;
  modell: Bauwerksmodell;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const [eingaben, setEingaben] = useState<Partial<Record<Bezugsgroessenart, string>>>({});
  const [dialog, setDialog] = useState(false);
  const ausModell = useMemo(() => groessenLesen(modell, {}).groessen, [modell]);
  const lesung = useMemo(() => groessenLesen(modell, eingaben), [modell, eingaben]);
  const [ermittlungen, setErmittlungen] = useState<readonly KostenermittlungZustand[] | null>(null);
  const [ermittlung, setErmittlung] = useState<string | undefined>(undefined);
  const [lauf, setLauf] = useState(0);

  useEffect(
    () =>
      befehlswegFuer(u).beiHistorie(() => {
        setLauf((n) => n + 1);
      }),
    [u],
  );
  useEffect(() => {
    let aktiv = true;
    void kostenermittlungenLaden(u.speicher, projektId).then((r) => {
      if (aktiv) setErmittlungen(r.ok ? r.wert : []);
    });
    return () => {
      aktiv = false;
    };
  }, [u, projektId, lauf]);
  const gewaehlt = ermittlungen?.find((k) => k.kostenermittlung.id === ermittlung);
  const kk = useMemo(
    () => (gewaehlt === undefined ? [] : kostenkennwerteZeilen(gewaehlt.kostenermittlung.eintraege, lesung.groessen)),
    [gewaehlt, lesung.groessen],
  );
  const zahl = (b: Betrag | null): string => (b === null ? '–' : formatiereBetragDe(b));

  return (
    <section className="bim__leiste bim__kennwerte" aria-label={t.region}>
      <h2>{t.region}</h2>
      <dl className="bim__eigenschaften">
        {BEZUGSGROESSEN.map((art) => {
          const g = groesse(lesung.groessen, art);
          const eingabeMoeglich = groesse(ausModell, art).wert === null;
          return (
            <div key={art} className="bim__groesse" data-groesse={art}>
              <dt>{art}</dt>
              <dd>
                <span data-wert="wert">
                  {g.wert === null ? t.fehlt : `${formatiereMengeDe(g.wert)} ${EINHEIT[art]}`}
                </span>{' '}
                <span data-wert="quelle">({g.quelle === 'eingabe' ? t.quelleEingabe : t.quelleModell})</span>
                {eingabeMoeglich ? (
                  <Eingabefeld
                    kompakt
                    label={t.eingabe(art, EINHEIT[art])}
                    value={eingaben[art] ?? ''}
                    onWertChange={(w) => {
                      setEingaben((e) => ({ ...e, [art]: w }));
                    }}
                    {...(lesung.fehler[art] === undefined ? {} : { meldung: lesung.fehler[art] })}
                  />
                ) : null}
              </dd>
            </div>
          );
        })}
      </dl>
      {lesung.groessen.befunde.length > 0 ? (
        <BefundListe befunde={lesung.groessen.befunde} beschriftung={t.befunde} />
      ) : null}
      <div className="bim__aktionen">
        <Button
          onClick={() => {
            setDialog(true);
          }}
        >
          {t.schaetzung}
        </Button>
      </div>
      <h3>{t.kostenkennwerte}</h3>
      {ermittlungen !== null && ermittlungen.length === 0 ? (
        <p>{t.keineErmittlung}</p>
      ) : (
        <Auswahl
          kompakt
          label={t.ermittlung}
          wert={ermittlung}
          optionen={(ermittlungen ?? []).map((k) => ({
            wert: k.kostenermittlung.id,
            label: k.kostenermittlung.name,
          }))}
          onWertChange={setErmittlung}
        />
      )}
      {kk.length > 0 ? (
        <table className="bim__tabelle" aria-label={t.kostenkennwerte}>
          <thead>
            <tr>
              {t.kkSpalten.map((s) => (
                <th key={s} scope="col">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {kk.map((z) => (
              <tr key={z.nummer}>
                <td>{z.nummer}</td>
                <td className="bim__zahl">{zahl(z.summe)}</td>
                <td className="bim__zahl">{zahl(z.jeBgf)}</td>
                <td className="bim__zahl">{zahl(z.jeBri)}</td>
                <td className="bim__zahl">{zahl(z.jeNrf)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {dialog ? (
        <KostenschaetzungDialog
          projektId={projektId}
          modell={modell}
          groessen={lesung.groessen}
          onSchliessen={() => {
            setDialog(false);
          }}
          gehe={gehe}
        />
      ) : null}
    </section>
  );
}

const LEERE_ZEILE: Kennwertzeile = { kostengruppe: '', bezug: 'BGF', kennwert: '' };

function KostenschaetzungDialog({
  projektId,
  modell,
  groessen,
  onSchliessen,
  gehe,
}: {
  projektId: ProjektId;
  modell: Bauwerksmodell;
  groessen: Din277Groessen;
  onSchliessen: () => void;
  gehe: (pfad: string) => void;
}): ReactElement {
  const u = useUmgebung();
  const { pruefe } = useMeldungen();
  const { zeige } = useToast();
  const [name, setName] = useState(t.nameVorschlag(modell.name));
  const [zeilen, setZeilen] = useState<readonly Kennwertzeile[]>([LEERE_ZEILE]);
  const [id] = useState(() => u.ids.kostenermittlung());
  const r = useMemo(
    () => schaetzungBauen({ id, projektId, name, groessen, zeilen }),
    [id, projektId, name, groessen, zeilen],
  );
  const setze = (i: number, z: Partial<Kennwertzeile>): void => {
    setZeilen((alt) => alt.map((x, j) => (j === i ? { ...x, ...z } : x)));
  };
  const fehler = (i: number, feld: 'kostengruppe' | 'kennwert'): { meldung?: string } => {
    const f = r.fehler.find((x) => x.zeile === i && x.feld === feld);
    return f === undefined ? {} : { meldung: f.meldung };
  };
  const s = r.schaetzung;
  const anlegbar = s !== null && name.trim() !== '' && s.befehl.kostenermittlung.eintraege.length > 0;
  const anlegen = async (): Promise<void> => {
    if (s === null) return;
    const a = await kostenermittlungSitzung(u, projektId, null).befehl(s.befehl);
    if (!pruefe(a)) return;
    zeige({ titel: t.angelegt, art: 'erfolg' });
    onSchliessen();
    gehe(kostenermittlungPfad(projektId, s.befehl.kostenermittlung.id));
  };

  return (
    <Dialog
      offen
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={t.schaetzungTitel}
      fuss={
        <>
          <Button onClick={onSchliessen}>{t.abbrechen}</Button>
          <Button variante="primaer" disabled={!anlegbar} onClick={() => void anlegen()}>
            {t.anlegen}
          </Button>
        </>
      }
    >
      <Eingabefeld label={t.name} value={name} onWertChange={setName} />
      {zeilen.map((z, i) => (
        <div key={i} className="bim__aktionen">
          <Eingabefeld
            kompakt
            label={t.kostengruppe(i + 1)}
            value={z.kostengruppe}
            onWertChange={(w) => {
              setze(i, { kostengruppe: w });
            }}
            {...fehler(i, 'kostengruppe')}
          />
          <Auswahl
            kompakt
            label={t.bezug(i + 1)}
            wert={z.bezug}
            optionen={BEZUGSGROESSEN.map((b) => ({ wert: b, label: `${b} (${EINHEIT[b]})` }))}
            onWertChange={(w) => {
              setze(i, { bezug: w as Bezugsgroessenart });
            }}
          />
          <Eingabefeld
            kompakt
            label={t.kennwert(i + 1)}
            value={z.kennwert}
            onWertChange={(w) => {
              setze(i, { kennwert: w });
            }}
            {...fehler(i, 'kennwert')}
          />
        </div>
      ))}
      <Button
        onClick={() => {
          setZeilen((alt) => [...alt, LEERE_ZEILE]);
        }}
      >
        {t.zeileDazu}
      </Button>
      {s === null ? (
        <p>{t.keineZeile}</p>
      ) : (
        <>
          <table className="bim__tabelle" aria-label={t.vorschau}>
            <thead>
              <tr>
                {t.spalten.map((x) => (
                  <th key={x} scope="col">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.befehl.kostenermittlung.eintraege.map((e) => (
                <tr key={e.nummer}>
                  <td>{e.nummer}</td>
                  <td className="bim__zahl">{formatiereBetragDe(e.betrag)}</td>
                  <td>{e.bemerkung ?? ''}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">{t.gesamt}</th>
                <td className="bim__zahl" data-wert="gesamt">
                  {formatiereBetragDe(s.gesamt)}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
          {s.befunde.length > 0 ? <BefundListe befunde={s.befunde} beschriftung={texte.seite.befunde} /> : null}
        </>
      )}
    </Dialog>
  );
}
