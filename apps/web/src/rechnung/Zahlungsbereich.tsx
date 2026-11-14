// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 152 (A5, D-72): die Zahlungsfreigabe in der Prüfansicht. Beide Fälle des Skontos nebeneinander („Bei Zahlung bis
// TT.MM.JJJJ“ / „Danach“) und als Satz, der geltende Fall bis „Offen“, die Zahlungen nach Datum. Zahlungen erfassen,
// ändern und löschen (mit Bestätigung, Q5) nur an einer freigegebenen Rechnung; sonst ist der Knopf gesperrt mit Erklärung.
// Gerechnet hat `abrechnung` (`Rechnungspruefung.zahlungsstand`); hier wird nur formatiert (N4). Bezeichnungen wie im PDF.

import { vorzeichen } from '@tethys/dezimal';
import { Button, Dialog, Eingabefeld, Zahlfeld } from '@tethys/ui-basis';
import type {
  Betrag,
  IdQuelle,
  Kalenderdatum,
  Rechnung,
  RechnungBefehl,
  Zahlung,
  Zahlungsstand,
} from '@tethys/vertrag';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { datumAusUhr } from '../ausgabe/logik';
import { datumDe } from '../lv/kopfdaten';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { formatiereBetragDe, formatiereProzentDe } from '../lv/zahlen';
import { zahlungsfreigabe } from './pruefung';
import { texte } from './texte';
import { LEERE_ZAHLUNG, zahlungBefehl, zahlungEntwurf, zahlungLesen, type Zahlungsentwurf } from './zahlung';

const t = texte.zahlung;

/** Ein Abzug mit Minuszeichen (U+2212), wie in der Kette und im PDF. */
const abzug = (zeichen: string, b: Betrag): string =>
  zeichen === '−' && vorzeichen(b) > 0 ? `−${formatiereBetragDe(b)}` : formatiereBetragDe(b);

type Dialoglage =
  | { readonly art: 'zu' }
  | { readonly art: 'bearbeiten'; readonly zahlung: Zahlung | null }
  | { readonly art: 'loeschen'; readonly zahlung: Zahlung };

export function Zahlungsbereich({
  rechnung,
  zahlungsstand,
  ids,
  befehle,
}: {
  rechnung: Rechnung;
  zahlungsstand: Zahlungsstand;
  ids: Pick<IdQuelle, 'zahlung'>;
  befehle: (bs: readonly RechnungBefehl[]) => Promise<boolean>;
}): ReactElement {
  const hinweisId = useId();
  const u = useUmgebung();
  const heute = datumAusUhr(u.uhr()) as Kalenderdatum;
  const zf = useMemo(
    () => zahlungsfreigabe(rechnung, zahlungsstand, heute),
    [rechnung, zahlungsstand, heute],
  );
  const [dialog, setDialog] = useState<Dialoglage>({ art: 'zu' });
  const abbrechen = useRef<HTMLButtonElement>(null);
  const tabelle = useRef<HTMLTableElement>(null);
  const erfassen = useRef<HTMLButtonElement>(null);
  /**
   * Nach „Zahlung löschen“: die gelöschte Zahlung und die, deren „Ändern …“ danach den Fokus bekommt (`ziel` `null`:
   * „Zahlung erfassen …“). Gesetzt wird der Fokus, sobald die gelöschte aus der Liste ist.
   */
  const fokusNachLoeschen = useRef<{ readonly geloescht: string; readonly ziel: string | null } | null>(null);
  useEffect(() => {
    const f = fokusNachLoeschen.current;
    if (f === null || zf.zahlungen.some((z) => z.id === f.geloescht)) return;
    fokusNachLoeschen.current = null;
    const ziel = f.ziel;
    const knopf =
      ziel === null
        ? erfassen.current
        : tabelle.current?.querySelector<HTMLButtonElement>(`[data-zahlung-aendern="${CSS.escape(ziel)}"]`);
    knopf?.focus();
  }, [zf.zahlungen]);
  const freigegeben = rechnung.freigabe !== null;

  return (
    <section className="rechnung__abschnitt" aria-labelledby={`${hinweisId}-titel`}>
      <h2 id={`${hinweisId}-titel`} className="auftrag__unterkopf">
        {t.titel}
      </h2>
      {freigegeben ? null : <p className="rechnung__hinweis">{t.vorschau}</p>}
      <div className="rechnung__spalten">
        {zf.faelle === null ? null : (
          <div>
            <table className="rechnung__tabelle" aria-label={t.faelle} data-testid="skonto-faelle">
              <caption>{t.faelle}</caption>
              <thead>
                <tr>
                  <th scope="col">{t.posten}</th>
                  <th scope="col">{t.bis(datumDe(zf.faelle.bis))}</th>
                  <th scope="col">{t.danach}</th>
                </tr>
              </thead>
              <tbody>
                {zf.faelle.zeilen.map((z) => (
                  <tr key={z.schluessel} className={z.zeichen === '=' ? 'rechnung__summe' : undefined}>
                    <th scope="row">{z.bezeichnung}</th>
                    <td className="rechnung__zahl" data-testid={`fall-mit-${z.schluessel}`}>
                      {abzug(z.zeichen, z.mit)}
                    </td>
                    <td className="rechnung__zahl" data-testid={`fall-ohne-${z.schluessel}`}>
                      {abzug(z.zeichen, z.ohne)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p data-testid="skonto-satz">
              {t.satz(
                datumDe(zf.faelle.bis),
                formatiereBetragDe(zahlungsstand.mitSkonto.auszahlung),
                formatiereBetragDe(zahlungsstand.ohneSkonto.auszahlung),
              )}
            </p>
          </div>
        )}
        <div>
          {zf.ohneEingang && rechnung.skonto !== undefined ? (
            <p className="rechnung__hinweis">{t.ohneEingang(formatiereProzentDe(rechnung.skonto.satz))}</p>
          ) : null}
          <table className="rechnung__tabelle rechnung__kette" aria-label={t.geltend}>
            <caption>{t.geltend}</caption>
            <tbody>
              {zf.geltend.map((z) => (
                <tr key={z.schluessel} className={z.zeichen === '=' ? 'rechnung__summe' : undefined}>
                  <th scope="row">{z.bezeichnung}</th>
                  <td className="rechnung__zahl" data-testid={`zahlung-${z.schluessel}`}>
                    {abzug(z.zeichen, z.betrag)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="rechnung__hinweis">{t.hinweis}</p>

      <h3 className="auftrag__unterkopf">{t.zahlungen}</h3>
      {zf.zahlungen.length === 0 ? (
        <p className="rechnung__hinweis">{t.keine}</p>
      ) : (
        <table className="rechnung__tabelle" aria-label={t.zahlungen} data-testid="zahlungen" ref={tabelle}>
          <thead>
            <tr>
              <th scope="col">{t.datum}</th>
              <th scope="col">{t.betrag}</th>
              <th scope="col">{t.aktionen}</th>
            </tr>
          </thead>
          <tbody>
            {zf.zahlungen.map((z) => (
              <tr key={z.id}>
                <td>{datumDe(z.datum)}</td>
                <td className="rechnung__zahl">{formatiereBetragDe(z.betrag)}</td>
                <td>
                  <Button
                    groesse="sm"
                    aria-label={t.aendern(datumDe(z.datum), formatiereBetragDe(z.betrag))}
                    data-zahlung-aendern={z.id}
                    onClick={() => {
                      setDialog({ art: 'bearbeiten', zahlung: z });
                    }}
                  >
                    {t.aendernKurz}
                  </Button>{' '}
                  <Button
                    groesse="sm"
                    variante="gefahr"
                    aria-label={t.loeschen(datumDe(z.datum), formatiereBetragDe(z.betrag))}
                    onClick={() => {
                      setDialog({ art: 'loeschen', zahlung: z });
                    }}
                  >
                    {t.loeschenKurz}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="lv__werkzeuge">
        <Button
          ref={erfassen}
          disabled={!freigegeben}
          aria-describedby={freigegeben ? undefined : `${hinweisId}-gesperrt`}
          onClick={() => {
            setDialog({ art: 'bearbeiten', zahlung: null });
          }}
        >
          {t.erfassen}
        </Button>
      </div>
      {freigegeben ? null : (
        <p id={`${hinweisId}-gesperrt`} className="rechnung__hinweis">
          {t.erstFreigeben}
        </p>
      )}

      <Dialog
        offen={dialog.art === 'bearbeiten'}
        onOffenChange={(o) => {
          if (!o) setDialog({ art: 'zu' });
        }}
        titel={dialog.art === 'bearbeiten' && dialog.zahlung !== null ? t.titelAendern : t.titelNeu}
      >
        {dialog.art === 'bearbeiten' ? (
          <Zahlungsformular
            anfang={dialog.zahlung === null ? LEERE_ZAHLUNG : zahlungEntwurf(dialog.zahlung)}
            onAbbrechen={() => {
              setDialog({ art: 'zu' });
            }}
            onSpeichern={async (w) => {
              const ok = await befehle([zahlungBefehl(dialog.zahlung, () => ids.zahlung(), w)]);
              if (ok) setDialog({ art: 'zu' });
            }}
          />
        ) : null}
      </Dialog>
      <Dialog
        offen={dialog.art === 'loeschen'}
        onOffenChange={(o) => {
          if (!o) setDialog({ art: 'zu' });
        }}
        titel={t.loeschenTitel}
        {...(dialog.art === 'loeschen'
          ? {
              beschreibung: t.loeschenFrage(
                datumDe(dialog.zahlung.datum),
                formatiereBetragDe(dialog.zahlung.betrag),
              ),
            }
          : {})}
        anfangsfokus={abbrechen}
        fuss={
          <>
            <Button
              ref={abbrechen}
              onClick={() => {
                setDialog({ art: 'zu' });
              }}
            >
              {t.abbrechen}
            </Button>
            <Button
              variante="gefahr"
              onClick={() => {
                if (dialog.art !== 'loeschen') return;
                const id = dialog.zahlung.id;
                // R3: Der Fokus geht danach auf „Ändern …“ der nächsten Zahlung, sonst auf „Zahlung erfassen …“.
                const i = zf.zahlungen.findIndex((z) => z.id === id);
                fokusNachLoeschen.current = { geloescht: id, ziel: zf.zahlungen[i + 1]?.id ?? null };
                setDialog({ art: 'zu' });
                void befehle([{ art: 'ZahlungLoeschen', zahlungId: id }]).then((ok) => {
                  if (!ok) fokusNachLoeschen.current = null;
                });
              }}
            >
              {t.loeschenBestaetigen}
            </Button>
          </>
        }
      />
    </section>
  );
}

function Zahlungsformular({
  anfang,
  onAbbrechen,
  onSpeichern,
}: {
  anfang: Zahlungsentwurf;
  onAbbrechen: () => void;
  onSpeichern: (w: { datum: Zahlung['datum']; betrag: Zahlung['betrag'] }) => Promise<void>;
}): ReactElement {
  const [e, setE] = useState<Zahlungsentwurf>(anfang);
  const [gesendet, setGesendet] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const gelesen = zahlungLesen(e);
  const meldung = (feld: string): string | undefined =>
    gesendet && !gelesen.ok ? gelesen.fehler.find((f) => f.feld === feld)?.meldung : undefined;
  const betragMeldung = meldung('betrag');
  const datumMeldung = meldung('datum');
  return (
    <form
      className="lv-dialog lv-dialog--schmal"
      onSubmit={(x) => {
        x.preventDefault();
        setGesendet(true);
        if (!gelesen.ok || laeuft) return;
        setLaeuft(true);
        void onSpeichern(gelesen.wert).finally(() => {
          setLaeuft(false);
        });
      }}
    >
      <div className="lv-dialog__zeile">
        <Eingabefeld
          label={t.datumFeld}
          hinweis={texte.formular.datumHinweis}
          value={e.datum}
          onWertChange={(w) => {
            setE((alt) => ({ ...alt, datum: w }));
          }}
          {...(datumMeldung === undefined ? {} : { meldung: datumMeldung })}
        />
        <Zahlfeld
          label={t.betragFeld}
          einheit="€"
          pruefe={() =>
            betragMeldung === undefined ? { gueltig: true } : { gueltig: false, meldung: betragMeldung }
          }
          value={e.betrag}
          onWertChange={(w) => {
            setE((alt) => ({ ...alt, betrag: w }));
          }}
        />
      </div>
      <footer className="tx-dialog__fuss">
        <Button onClick={onAbbrechen}>{t.abbrechen}</Button>
        <Button type="submit" variante="primaer" disabled={laeuft}>
          {t.speichern}
        </Button>
      </footer>
    </form>
  );
}
