// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 88, Punkt 2 und 3: Prüfansicht einer Rechnung. Angaben, die Abzugskette Zeile für Zeile, gefordert gegen geprüft
// mit Differenz (D-44), Befunde (U5). Freigeben mit ausdrücklicher Bestätigung (Q5: friert den Zahlbetrag ein), gesperrt
// mit Erklärung, solange eine frühere Rechnung offen ist; „Freigabe aufheben“ und „Rechnung löschen“ ebenfalls mit
// Bestätigung. Gerechnet wird nur in `abrechnung` (`pruefung.ts`), Zahlen nur hier am Rand formatiert (N4).
// Ticket 152 (A5, E11): Vertragsstrafe in der Kette, Zahlungsfreigabe mit Zahlungen (`Zahlungsbereich`), „Freigabe aufheben“
// gesperrt, solange Zahlungen bestehen; „Ausgabe“ mit der Rechnungsprüfung samt Zahlungsfreigabe als PDF (Vorschau) und Excel.

import { Button, Dialog, Werkzeuggruppe, Werkzeugleiste, useToast } from '@tethys/ui-basis';
import { BAUABZUGSTEUER_SATZ } from '@tethys/vertrag';
import type { AufmassId, PositionId, Rechnung, RechnungBefehl } from '@tethys/vertrag';
import { useId, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { datumDe } from '../lv/kopfdaten';
import { formatiereBetragDe, formatiereProzentDe } from '../lv/zahlen';
import { texte as ntexte } from '../nachtrag/texte';
import { BerichtAusgabe } from '../abrechnung/Ausgabe';
import { dateinameRechnungspruefung, rechnungspruefungEingabe } from '../abrechnung/berichte';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { Zahlungsbereich } from './Zahlungsbereich';
import { befundtext, freigabelage, kettenzeilen, nachtragsinfo, pruefen, vergleichszeilen } from './pruefung';
import type { Rechnungsstand } from './rechnungen';
import { texte } from './texte';

const t = texte.pruefung;

type Frage = 'freigeben' | 'aufheben' | 'loeschen';

export function Pruefansicht({
  rechnung,
  rechnungen,
  stand,
  befehle,
  onBearbeiten,
  onGeloescht,
}: {
  rechnung: Rechnung;
  rechnungen: readonly Rechnung[];
  stand: Rechnungsstand;
  /** Schickt die Befehle an diese Rechnung (ein Undo-Schritt); `true`: angenommen. */
  befehle: (bs: readonly RechnungBefehl[]) => Promise<boolean>;
  onBearbeiten: () => void;
  onGeloescht: () => void;
}): ReactElement {
  const { zeige } = useToast();
  const u = useUmgebung();
  const hinweisId = useId();
  const [frage, setFrage] = useState<Frage | null>(null);
  const pruefung = useMemo(() => pruefen(rechnung, stand, rechnungen), [rechnung, stand, rechnungen]);
  const lage = useMemo(() => freigabelage(rechnung, rechnungen), [rechnung, rechnungen]);
  const kette = useMemo(() => kettenzeilen(pruefung.kette, rechnung.vertragsstrafe), [pruefung, rechnung]);
  const vergleich = useMemo(() => vergleichszeilen(pruefung), [pruefung]);
  const nachtraege = useMemo(() => nachtragsinfo(stand.nachtraege), [stand]);
  const blattname = useMemo(() => {
    const m = new Map(
      stand.blaetter.map((b) => [b.id as string, texte.formular.blatt(b.nummer, b.bezeichnung)]),
    );
    return (id: AufmassId): string => m.get(id) ?? id;
  }, [stand]);
  const befunde = useMemo(() => {
    const oz = new Map(
      stand.auftrag.auftragsLeistungsverzeichnis.knoten.map((k) => [
        k.id as string,
        k.art === 'position' || k.art === 'titel' ? (k.ordnungszahl ?? k.id) : k.id,
      ]),
    );
    const bezug = { oz: (id: PositionId): string => oz.get(id) ?? id, blatt: blattname };
    return pruefung.befunde.map((b) => befundtext(b, bezug));
  }, [pruefung, stand, blattname]);
  const freigegeben = rechnung.freigabe !== null;

  const bestaetigt = async (f: Frage): Promise<void> => {
    setFrage(null);
    if (f === 'freigeben') {
      if (await befehle([{ art: 'RechnungFreigeben', zahlbetrag: pruefung.kette.zahlbetrag }]))
        zeige({ titel: texte.freigabe.erfolgt(rechnung.nummer), art: 'erfolg' });
    } else if (f === 'aufheben') {
      await befehle([{ art: 'RechnungsfreigabeAufheben' }]);
    } else if (await befehle([{ art: 'RechnungLoeschen' }])) onGeloescht();
  };

  const fragen: Record<Frage, { titel: string; text: string; knopf: string }> = {
    freigeben: {
      titel: texte.freigabe.titel(rechnung.nummer),
      text: texte.freigabe.frage(formatiereBetragDe(pruefung.kette.zahlbetrag)),
      knopf: texte.freigabe.bestaetigen,
    },
    aufheben: {
      titel: texte.freigabe.aufhebenTitel(rechnung.nummer),
      text: texte.freigabe.aufhebenFrage,
      knopf: texte.freigabe.aufhebenBestaetigen,
    },
    loeschen: {
      titel: texte.aktionen.loeschenTitel(rechnung.nummer),
      text: texte.aktionen.loeschenFrage,
      knopf: texte.aktionen.loeschenBestaetigen,
    },
  };

  return (
    <div className="rechnung__pruefung">
      <section className="rechnung__abschnitt" aria-label={t.angaben}>
        <dl className="auftrag__kopf">
          <dt>{texte.feld.art}</dt>
          <dd>{texte.art[rechnung.art]}</dd>
          <dt>{texte.feld.eingang}</dt>
          <dd>{rechnung.eingang === null ? '–' : datumDe(rechnung.eingang)}</dd>
          <dt>{texte.feld.rechnungsnummerAuftragnehmer}</dt>
          <dd data-testid="rechnungsnummer">{rechnung.rechnungsnummerAuftragnehmer ?? '–'}</dd>
          <dt>{texte.feld.aufmasse}</dt>
          <dd data-testid="blaetter">
            {rechnung.aufmassIds.length === 0 ? '–' : rechnung.aufmassIds.map(blattname).join(', ')}
          </dd>
          <dt>{texte.liste.status}</dt>
          <dd data-testid="freigabe">
            {lage.art === 'freigegeben'
              ? texte.freigabe.status(formatiereBetragDe(lage.zahlbetrag))
              : texte.freigabe.offen}
          </dd>
        </dl>
        <Werkzeugleiste beschriftung={t.aktionen}>
          {lage.art === 'offen' ? (
            <Button
              variante="primaer"
              disabled={!lage.moeglich}
              aria-describedby={lage.grund === null ? undefined : hinweisId}
              onClick={() => {
                setFrage('freigeben');
              }}
            >
              {texte.freigabe.knopf}
            </Button>
          ) : (
            <Button
              disabled={!lage.aufhebbar}
              aria-describedby={lage.grund === null ? undefined : hinweisId}
              onClick={() => {
                setFrage('aufheben');
              }}
            >
              {texte.freigabe.aufheben}
            </Button>
          )}
          <Button
            disabled={freigegeben}
            aria-describedby={freigegeben ? `${hinweisId}-frei` : undefined}
            onClick={onBearbeiten}
          >
            {texte.aktionen.bearbeiten}
          </Button>
          <Button
            variante="gefahr"
            disabled={freigegeben}
            aria-describedby={freigegeben ? `${hinweisId}-frei` : undefined}
            onClick={() => {
              setFrage('loeschen');
            }}
          >
            {texte.aktionen.loeschen}
          </Button>
          <Werkzeuggruppe titel={t.ausgabe}>
            <BerichtAusgabe
              projektId={rechnung.projektId}
              name={t.bericht}
              dateiname={(endung) => dateinameRechnungspruefung(stand.auftrag, rechnung, endung)}
              schluessel={JSON.stringify([rechnung, pruefung.kette.zahlbetrag, befunde])}
              pdf={(kopf) => ({
                art: 'rechnungspruefung',
                eingabe: rechnungspruefungEingabe(rechnung, stand, pruefung, befunde, kopf),
              })}
              excel={async (kopf) => {
                const a = await import('@tethys/ausgabe');
                return a.berichtAlsExcel(
                  a.baueRechnungspruefungModell(
                    rechnungspruefungEingabe(rechnung, stand, pruefung, befunde, kopf),
                  ),
                );
              }}
            />
          </Werkzeuggruppe>
        </Werkzeugleiste>
        {lage.grund === null ? null : (
          <p id={hinweisId} className="rechnung__hinweis">
            {lage.grund}
          </p>
        )}
        {freigegeben ? (
          <p id={`${hinweisId}-frei`} className="rechnung__hinweis">
            {texte.aktionen.gesperrtFreigegeben}
          </p>
        ) : null}
      </section>

      <div className="rechnung__spalten">
        <table className="rechnung__tabelle rechnung__kette" aria-label={t.kette}>
          <caption>{t.kette}</caption>
          <thead>
            <tr>
              <th scope="col">{t.posten}</th>
              <th scope="col" aria-hidden="true" />
              <th scope="col">{t.betrag}</th>
            </tr>
          </thead>
          <tbody>
            {kette.map((z) => (
              <tr key={z.schluessel} className={z.zeichen === '=' ? 'rechnung__summe' : undefined}>
                <th scope="row">{z.bezeichnung}</th>
                <td className="rechnung__zeichen" aria-hidden="true">
                  {z.zeichen}
                </td>
                <td className="rechnung__zahl" data-testid={`kette-${z.schluessel}`}>
                  {formatiereBetragDe(z.betrag)}
                </td>
              </tr>
            ))}
            {rechnung.freigabe === null ? null : (
              <tr>
                <th scope="row">{t.eingefroren}</th>
                <td aria-hidden="true" />
                <td className="rechnung__zahl" data-testid="kette-eingefroren">
                  {formatiereBetragDe(rechnung.freigabe.zahlbetrag)}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="rechnung__rechts">
          <table className="rechnung__tabelle" aria-label={t.vergleich}>
            <caption>{t.vergleich}</caption>
            <thead>
              <tr>
                <th scope="col" />
                <th scope="col">{t.gefordert}</th>
                <th scope="col">{t.geprueft}</th>
                <th scope="col">{t.differenz}</th>
              </tr>
            </thead>
            <tbody>
              {vergleich.map((z) => (
                <tr key={z.feld} className={z.massgeblich ? 'rechnung__massgeblich' : undefined}>
                  <th scope="row">{t.vergleichZeile[z.feld]}</th>
                  <td className="rechnung__zahl" data-testid={`gefordert-${z.feld}`}>
                    {z.gefordert === null ? t.fehlt : formatiereBetragDe(z.gefordert)}
                  </td>
                  <td className="rechnung__zahl" data-testid={`geprueft-${z.feld}`}>
                    {formatiereBetragDe(z.geprueft)}
                  </td>
                  <td className="rechnung__zahl" data-testid={`differenz-${z.feld}`}>
                    {z.differenz === null ? t.fehlt : formatiereBetragDe(z.differenz)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="rechnung__hinweis">{t.vergleichsgrundlage}</p>

          <section aria-label={t.befunde}>
            <h2 className="auftrag__unterkopf">{t.befunde}</h2>
            {befunde.length === 0 ? (
              <p className="rechnung__hinweis">{t.keineBefunde}</p>
            ) : (
              <ul className="auftrag__warnungen" data-testid="befunde">
                {befunde.map((b, i) => (
                  <li key={`${String(i)}-${b}`}>{b}</li>
                ))}
              </ul>
            )}
          </section>

          {nachtraege.length === 0 ? null : (
            <section aria-label={t.nachtraege}>
              <h2 className="auftrag__unterkopf">{t.nachtraege}</h2>
              <ul className="auftrag__warnungen" data-testid="nachtraege">
                {nachtraege.map((n) => (
                  <li key={n.lvId}>
                    {t.nachtragZeile(n.nummer, ntexte.status[n.status], formatiereBetragDe(n.angebotsnetto))}
                  </li>
                ))}
              </ul>
              <p className="rechnung__hinweis">{t.nachtraegeHinweis}</p>
            </section>
          )}

          <section aria-label={texte.feld.umlagen}>
            <h2 className="auftrag__unterkopf">{t.angaben}</h2>
            <dl className="auftrag__kopf">
              <dt>{texte.feld.umlagen}</dt>
              <dd>
                {rechnung.umlagen.length === 0
                  ? '–'
                  : rechnung.umlagen
                      .map((u) => `${u.bezeichnung} ${formatiereProzentDe(u.satz)} %`)
                      .join('; ')}
              </dd>
              <dt>{texte.feld.sicherheitSatz}</dt>
              <dd>
                {rechnung.sicherheitSatz === null ? '–' : `${formatiereProzentDe(rechnung.sicherheitSatz)} %`}
              </dd>
              <dt>{texte.feld.gewaehrleistungSatz}</dt>
              <dd>
                {rechnung.gewaehrleistungSatz === null
                  ? '–'
                  : `${formatiereProzentDe(rechnung.gewaehrleistungSatz)} %`}
              </dd>
              <dt>{texte.feld.vertragsstrafeBetrag}</dt>
              <dd data-testid="angabe-vertragsstrafe">
                {rechnung.vertragsstrafe === undefined
                  ? '–'
                  : t.strafeAngabe(
                      formatiereBetragDe(rechnung.vertragsstrafe.betrag),
                      rechnung.vertragsstrafe.grund,
                    )}
              </dd>
              <dt>{t.skonto}</dt>
              <dd data-testid="angabe-skonto">
                {rechnung.skonto === undefined
                  ? '–'
                  : t.skontoAngabe(formatiereProzentDe(rechnung.skonto.satz), rechnung.skonto.fristTage)}
              </dd>
              <dt>{t.bauabzugsteuer}</dt>
              <dd data-testid="angabe-bauabzugsteuer">
                {rechnung.bauabzugsteuer === true
                  ? t.steuerAn(formatiereProzentDe(BAUABZUGSTEUER_SATZ))
                  : t.steuerAus}
              </dd>
            </dl>
          </section>
        </div>
      </div>

      <Zahlungsbereich
        rechnung={rechnung}
        zahlungsstand={pruefung.zahlungsstand}
        ids={u.ids}
        befehle={befehle}
      />

      <Dialog
        offen={frage !== null}
        onOffenChange={(o) => {
          if (!o) setFrage(null);
        }}
        titel={frage === null ? '' : fragen[frage].titel}
        {...(frage === null ? {} : { beschreibung: fragen[frage].text })}
        fuss={
          frage === null ? null : (
            <>
              <Button
                onClick={() => {
                  setFrage(null);
                }}
              >
                {texte.freigabe.abbrechen}
              </Button>
              <Button
                variante={frage === 'loeschen' ? 'gefahr' : 'primaer'}
                onClick={() => void bestaetigt(frage)}
              >
                {fragen[frage].knopf}
              </Button>
            </>
          )
        }
      />
    </div>
  );
}
