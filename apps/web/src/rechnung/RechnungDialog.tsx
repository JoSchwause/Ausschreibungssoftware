// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 88: Dialog „Neue Rechnung“ bzw. „Angaben bearbeiten“: Art, Eingang, Rechnungsnummer des Auftragnehmers,
// geforderte Beträge, die abgerechneten Aufmaßblätter (kumuliert, D-34), Umlagen und Einbehaltssätze. Die Felder nehmen
// jede Eingabe an; eine Meldung steht am Feld (U5). Speichern schickt die Befehle als einen Undo-Schritt (A5, U7).

import { Button, Dialog, Eingabefeld, Zahlfeld, type ZahlPruefer } from '@tethys/ui-basis';
import type { AufmassKopf, Zahlenart } from '@tethys/vertrag';
import { useId, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { zahlLesen } from '../lv/zahlen';
import { entwurfLesen, type Rechnungsentwurf, type Rechnungswerte } from './entwurf';
import { texte } from './texte';

const t = texte.formular;
const f = texte.feld;

/** Prüft ein Zahlfeld mit dem Parser des Rands (`dezimal`), nicht nur der Form: leer ist gültig. */
const pruefer =
  (art: Zahlenart): ZahlPruefer =>
  (roh) => {
    if (roh.trim() === '') return { gueltig: true };
    const r = zahlLesen(art, roh);
    return r.ok ? { gueltig: true } : { gueltig: false, meldung: r.fehler };
  };
const BETRAG = pruefer('betrag');
const PROZENT = pruefer('prozent');

export interface RechnungDialogProps {
  /** `null`: Dialog zu. */
  readonly offen: { readonly titel: string; readonly entwurf: Rechnungsentwurf } | null;
  readonly blaetter: readonly AufmassKopf[];
  readonly onSchliessen: () => void;
  /** Speichert die Werte; `true`: geschrieben, der Dialog schließt. */
  readonly onSpeichern: (werte: Rechnungswerte) => Promise<boolean>;
}

export function RechnungDialog(props: RechnungDialogProps): ReactElement {
  const { offen, onSchliessen } = props;
  return (
    <Dialog
      offen={offen !== null}
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={offen?.titel ?? ''}
    >
      {offen === null ? null : <Formular {...props} anfang={offen.entwurf} />}
    </Dialog>
  );
}

function Formular({
  anfang,
  blaetter,
  onSchliessen,
  onSpeichern,
}: RechnungDialogProps & { anfang: Rechnungsentwurf }): ReactElement {
  const formId = useId();
  const [e, setE] = useState<Rechnungsentwurf>(anfang);
  const [gesendet, setGesendet] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const gelesen = useMemo(() => entwurfLesen(e), [e]);
  const fehler = gelesen.ok ? [] : gelesen.fehler;
  // Meldungen erst nach dem ersten Speichern, damit ein halb getipptes Feld nicht sofort rot ist (Zahlfelder prüfen selbst).
  const meldung = (feld: string): { meldung?: string } => {
    const m = gesendet ? fehler.find((x) => x.feld === feld)?.meldung : undefined;
    return m === undefined ? {} : { meldung: m };
  };
  const setze = <K extends keyof Rechnungsentwurf>(k: K, w: Rechnungsentwurf[K]): void => {
    setE((alt) => ({ ...alt, [k]: w }));
  };

  const speichern = async (): Promise<void> => {
    setGesendet(true);
    if (!gelesen.ok || laeuft) return;
    setLaeuft(true);
    const ok = await onSpeichern(gelesen.wert);
    setLaeuft(false);
    if (ok) onSchliessen();
  };

  return (
    <form
      id={formId}
      className="lv-dialog lv-dialog--schmal rechnung-formular"
      onSubmit={(x) => {
        x.preventDefault();
        void speichern();
      }}
    >
      <fieldset className="lv-dialog__bereich">
        <legend>{t.angaben}</legend>
        <div className="rechnung-formular__arten" role="radiogroup" aria-label={f.art}>
          {(['abschlag', 'schluss'] as const).map((art) => (
            <label key={art} className="rechnung-formular__option">
              <input
                type="radio"
                name={`${formId}-art`}
                checked={e.art === art}
                onChange={() => {
                  setze('art', art);
                }}
              />
              {texte.art[art]}
            </label>
          ))}
        </div>
        <div className="lv-dialog__zeile">
          <Eingabefeld
            label={f.eingang}
            hinweis={t.datumHinweis}
            value={e.eingang}
            onWertChange={(w) => {
              setze('eingang', w);
            }}
            {...meldung('eingang')}
          />
          <Eingabefeld
            label={f.rechnungsnummerAuftragnehmer}
            value={e.rechnungsnummerAuftragnehmer}
            onWertChange={(w) => {
              setze('rechnungsnummerAuftragnehmer', w);
            }}
          />
        </div>
      </fieldset>

      <fieldset className="lv-dialog__bereich">
        <legend>{t.gefordert}</legend>
        <div className="lv-dialog__zeile">
          {(['gefordertNetto', 'gefordertBrutto', 'gefordertZahlbetrag'] as const).map((k) => (
            <Zahlfeld
              key={k}
              label={f[k]}
              einheit="€"
              pruefe={BETRAG}
              value={e[k]}
              onWertChange={(w) => {
                setze(k, w);
              }}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="lv-dialog__bereich">
        <legend>{f.aufmasse}</legend>
        {blaetter.length === 0 ? (
          <p className="lv-dialog__hinweis">{t.keineBlaetter}</p>
        ) : (
          <div className="rechnung-formular__blaetter">
            {blaetter.map((b) => (
              <label key={b.id} className="rechnung-formular__option">
                <input
                  type="checkbox"
                  checked={e.aufmassIds.includes(b.id)}
                  onChange={(x) => {
                    const an = x.target.checked;
                    setE((alt) => ({
                      ...alt,
                      aufmassIds: blaetter
                        .map((y) => y.id)
                        .filter((id) => (id === b.id ? an : alt.aufmassIds.includes(id))),
                    }));
                  }}
                />
                {t.blatt(b.nummer, b.bezeichnung)}
              </label>
            ))}
          </div>
        )}
        <p className="lv-dialog__hinweis">{t.hinweisKumuliert}</p>
      </fieldset>

      <fieldset className="lv-dialog__bereich">
        <legend>{t.abzuege}</legend>
        <ul className="lv-dialog__liste" aria-label={f.umlagen}>
          {e.umlagen.map((u, i) => (
            <li key={i}>
              <Eingabefeld
                label={f.umlageBezeichnung(i)}
                value={u.bezeichnung}
                onWertChange={(w) => {
                  setE((alt) => ({
                    ...alt,
                    umlagen: alt.umlagen.map((x, j) => (j === i ? { ...x, bezeichnung: w } : x)),
                  }));
                }}
              />
              <Zahlfeld
                label={f.umlageSatz(i)}
                einheit="%"
                pruefe={(roh) => {
                  const m = gesendet ? fehler.find((x) => x.feld === `umlagen.${String(i)}.satz`) : undefined;
                  return m === undefined ? PROZENT(roh) : { gueltig: false, meldung: m.meldung };
                }}
                value={u.satz}
                onWertChange={(w) => {
                  setE((alt) => ({
                    ...alt,
                    umlagen: alt.umlagen.map((x, j) => (j === i ? { ...x, satz: w } : x)),
                  }));
                }}
              />
              <Button
                groesse="sm"
                aria-label={t.umlageEntfernen(i)}
                onClick={() => {
                  setE((alt) => ({ ...alt, umlagen: alt.umlagen.filter((_, j) => j !== i) }));
                }}
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
        {e.umlagen.length === 0 ? <p className="lv-dialog__hinweis">{t.keineUmlagen}</p> : null}
        <div>
          <Button
            groesse="sm"
            onClick={() => {
              setE((alt) => ({ ...alt, umlagen: [...alt.umlagen, { bezeichnung: '', satz: '' }] }));
            }}
          >
            {t.umlageHinzufuegen}
          </Button>
        </div>
        <div className="lv-dialog__zeile">
          {(['sicherheitSatz', 'gewaehrleistungSatz'] as const).map((k) => (
            <Zahlfeld
              key={k}
              label={f[k]}
              einheit="%"
              pruefe={PROZENT}
              value={e[k]}
              onWertChange={(w) => {
                setze(k, w);
              }}
            />
          ))}
        </div>
        <p className="lv-dialog__hinweis">{t.hinweisEinbehalt}</p>
      </fieldset>

      <p className="lv__meldung" role="status">
        {gesendet && fehler.length > 0 ? t.unlesbar : ''}
      </p>
      <footer className="tx-dialog__fuss">
        <Button onClick={onSchliessen}>{t.abbrechen}</Button>
        <Button type="submit" variante="primaer" disabled={laeuft}>
          {t.speichern}
        </Button>
      </footer>
    </form>
  );
}
