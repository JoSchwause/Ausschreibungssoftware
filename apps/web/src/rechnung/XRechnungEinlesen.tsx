// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 88, Punkt 4: „XRechnung einlesen“: Datei wählen → Vorschau (Rechnungsnummer, Datum, Art, Summen, Befunde aus
// `erechnung`) → Übernehmen in eine neue oder eine offene Rechnung. Die Art kommt aus BT-3 (875/877), sonst wählt der
// Nutzer. Gelesen wird nur über die Dateiauswahl des Browsers (A1).

import { xrechnungLesen, type XRechnungLesung } from '@tethys/erechnung';
import { Button, Dialog, useToast } from '@tethys/ui-basis';
import type { Betrag, Rechnung, RechnungId, Rechnungsart } from '@tethys/vertrag';
import { useId, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { DateiNichtLesbar, dateiBytes, naechsterZug } from '../gaeb/datei';
import { datumDe } from '../lv/kopfdaten';
import { formatiereBetragDe } from '../lv/zahlen';
import { naechsteRechnungsnummer } from './entwurf';
import { texte } from './texte';
import { xrechnungUebernahme, type XRechnungsuebernahme } from './xrechnung';

const t = texte.xrechnung;

interface Lage {
  readonly name: string;
  readonly lesung: XRechnungLesung;
}

export interface XRechnungEinlesenProps {
  readonly rechnungen: readonly Rechnung[];
  /** Vorauswahl des Ziels (z. B. die offene Prüfansicht); `null`: neue Rechnung. */
  readonly ziel?: RechnungId | null;
  /** Übernimmt in die Rechnung `ziel` (`null`: neu); `true`: geschrieben. */
  readonly onUebernehmen: (
    ziel: Rechnung | null,
    uebernahme: XRechnungsuebernahme,
    art: Rechnungsart,
  ) => Promise<boolean>;
}

export function XRechnungEinlesen({ rechnungen, ziel, onUebernehmen }: XRechnungEinlesenProps): ReactElement {
  const datei = useRef<HTMLInputElement>(null);
  const { zeige } = useToast();
  const [lage, setLage] = useState<Lage | null>(null);

  const waehlen = async (f: File): Promise<void> => {
    try {
      await naechsterZug();
      const text = new TextDecoder('utf-8').decode(await dateiBytes(f));
      setLage({ name: f.name, lesung: xrechnungLesen(text) });
    } catch (e) {
      // Erwartet ist nur „Datei nicht lesbar“; jeder andere Fehler ist ein Programmfehler und geht weiter (Q5).
      if (!(e instanceof DateiNichtLesbar)) throw e;
      zeige({ titel: t.nichtLesbar, beschreibung: f.name, art: 'fehler' });
    }
  };

  return (
    <>
      <input
        ref={datei}
        type="file"
        accept=".xml,.XML"
        className="rechnung__datei"
        aria-label={t.datei}
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void waehlen(f);
        }}
      />
      <Button onClick={() => datei.current?.click()}>{t.knopf}</Button>
      <Dialog
        offen={lage !== null}
        onOffenChange={(o) => {
          if (!o) setLage(null);
        }}
        titel={t.titel}
        {...(lage === null ? {} : { beschreibung: lage.name })}
      >
        {lage === null ? null : (
          <Vorschau
            key={lage.name}
            lage={lage}
            rechnungen={rechnungen}
            ziel={ziel ?? null}
            onSchliessen={() => {
              setLage(null);
            }}
            onUebernehmen={onUebernehmen}
          />
        )}
      </Dialog>
    </>
  );
}

const betrag = (b: Betrag | null): string => (b === null ? '–' : `${formatiereBetragDe(b)} €`);

function Vorschau({
  lage,
  rechnungen,
  ziel,
  onSchliessen,
  onUebernehmen,
}: {
  lage: Lage;
  rechnungen: readonly Rechnung[];
  ziel: RechnungId | null;
  onSchliessen: () => void;
  onUebernehmen: XRechnungEinlesenProps['onUebernehmen'];
}): ReactElement {
  const id = useId();
  const r = lage.lesung.rechnung;
  const u = r === null ? null : xrechnungUebernahme(r);
  const offene = rechnungen.filter((x) => x.freigabe === null);
  const [art, setArt] = useState<Rechnungsart | null>(u?.art ?? null);
  const [wohin, setWohin] = useState<string>(offene.some((x) => x.id === ziel) ? (ziel ?? '') : '');
  const [laeuft, setLaeuft] = useState(false);

  const uebernehmen = async (): Promise<void> => {
    if (u === null || art === null || laeuft) return;
    setLaeuft(true);
    const ok = await onUebernehmen(offene.find((x) => x.id === wohin) ?? null, u, art);
    setLaeuft(false);
    if (ok) onSchliessen();
  };

  return (
    <div className="rechnung-xrechnung">
      {r === null || u === null ? (
        <p className="auftrag__fehler" role="alert">
          {t.keineRechnung}
        </p>
      ) : (
        <>
          <dl className="auftrag__zahlen" aria-label={t.vorschau}>
            <dt>{t.rechnungsnummer}</dt>
            <dd data-testid="xr-nummer">{u.rechnungsnummer ?? '–'}</dd>
            <dt>{t.datum}</dt>
            <dd data-testid="xr-datum">{u.datum === null ? '–' : datumDe(u.datum)}</dd>
            <dt>{t.art}</dt>
            <dd data-testid="xr-art">{u.art === null ? t.artUnbekannt(u.artCode) : texte.art[u.art]}</dd>
            <dt>{t.netto}</dt>
            <dd data-testid="xr-netto">{betrag(r.summen.netto)}</dd>
            <dt>{t.umsatzsteuer}</dt>
            <dd data-testid="xr-umsatzsteuer">{betrag(r.summen.umsatzsteuer)}</dd>
            <dt>{t.brutto}</dt>
            <dd data-testid="xr-brutto">{betrag(r.summen.brutto)}</dd>
            <dt>{t.zahlbetrag}</dt>
            <dd data-testid="xr-zahlbetrag">{betrag(r.summen.zahlbetrag)}</dd>
          </dl>
          <fieldset className="lv-dialog__bereich">
            <legend>{t.artWaehlen}</legend>
            <div className="rechnung-formular__arten">
              {(['abschlag', 'schluss'] as const).map((a) => (
                <label key={a} className="rechnung-formular__option">
                  <input
                    type="radio"
                    name={`${id}-art`}
                    checked={art === a}
                    onChange={() => {
                      setArt(a);
                    }}
                  />
                  {texte.art[a]}
                </label>
              ))}
            </div>
            {art === null ? <p className="lv-dialog__hinweis">{t.artFehlt}</p> : null}
          </fieldset>
          <fieldset className="lv-dialog__bereich">
            <legend>{t.ziel}</legend>
            <label className="rechnung-formular__option">
              <input
                type="radio"
                name={`${id}-ziel`}
                checked={wohin === ''}
                onChange={() => {
                  setWohin('');
                }}
              />
              {t.neueRechnung(naechsteRechnungsnummer(rechnungen))}
            </label>
            {offene.map((x) => (
              <label key={x.id} className="rechnung-formular__option">
                <input
                  type="radio"
                  name={`${id}-ziel`}
                  checked={wohin === x.id}
                  onChange={() => {
                    setWohin(x.id);
                  }}
                />
                {t.vorhandene(x.nummer)}
              </label>
            ))}
          </fieldset>
          <p className="lv-dialog__hinweis">{t.uebernimmt}</p>
        </>
      )}
      <section aria-label={t.befunde}>
        <h3 className="auftrag__unterkopf">{t.befunde}</h3>
        {lage.lesung.befunde.length === 0 ? (
          <p className="lv-dialog__hinweis">{t.keineBefunde}</p>
        ) : (
          <ul className="auftrag__warnungen">
            {lage.lesung.befunde.map((b, i) => (
              <li key={`${String(i)}-${b.code}`}>{b.meldung}</li>
            ))}
          </ul>
        )}
      </section>
      <footer className="tx-dialog__fuss">
        <Button onClick={onSchliessen}>{t.schliessen}</Button>
        {u === null ? null : (
          <Button variante="primaer" disabled={art === null || laeuft} onClick={() => void uebernehmen()}>
            {t.uebernehmen}
          </Button>
        )}
      </footer>
    </div>
  );
}
