// SPDX-License-Identifier: AGPL-3.0-or-later
// EP kalkulieren (Ticket 89, C4, Ticket 78): Ansatzzeilen und Zuschlagssätze je Kostenart. Gerechnet wird in `kosten`
// (`einzelpreiskalkulationBerechnen`); der Dialog zeigt den Nachweis (Einzelkosten, Zuschlag, Anteil) und den EP. „Übernehmen“
// schreibt Einheitspreisanteile und EP als **ein** Undo-Schritt. Die Ansätze selbst werden nicht gespeichert (D-36 (5)); der Dialog
// sagt das und beginnt bei jedem Öffnen leer. Unlesbare Werte sind Feldfehler wie in jeder Zelle (U5: nichts wird gesperrt).

import { formatiereEinheitspreisDe, formatiereMengeDe, runden } from '@tethys/dezimal';
import { Auswahl, Button, Dialog, Eingabefeld } from '@tethys/ui-basis';
import type { EpaArt, LvBefehl, Position } from '@tethys/vertrag';
import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { ozText } from '../lv/oztext';
import {
  ARTEN,
  LEERES_FORMULAR,
  LEERE_ZEILE,
  kalkulationBefehle,
  kalkulationRechnen,
  type Ansatzzeile,
  type Kalkulationsformular,
} from './kalkulation';
import { texte } from './texte';
import './kosten.css';

const t = texte.kalkulation;

export function KalkulationsDialog({
  position,
  epaBezeichnungenGesetzt,
  onSchliessen,
  senden,
}: {
  /** Die Position, deren EP kalkuliert wird; `null`: Dialog zu. */
  position: Position | null;
  /** Das LV legt die Beschriftung der Kostenarten selbst fest (`epaBezeichnungen`, D-28): keine freie Bezeichnung. */
  epaBezeichnungenGesetzt: boolean;
  onSchliessen: () => void;
  /** Schickt die Befehle als eine Aktion (ein Undo-Schritt); `true`, wenn alle angenommen wurden. */
  senden: (befehle: readonly LvBefehl[]) => Promise<boolean>;
}): ReactElement {
  const [form, setForm] = useState<Kalkulationsformular>(LEERES_FORMULAR);
  const [meldung, setMeldung] = useState<string | null>(null);

  // Jedes Öffnen beginnt leer: Die Ansätze werden nicht gespeichert.
  useEffect(() => {
    setForm(LEERES_FORMULAR);
    setMeldung(null);
  }, [position?.id]);

  const lauf = useMemo(
    () => kalkulationRechnen(form, epaBezeichnungenGesetzt),
    [form, epaBezeichnungenGesetzt],
  );
  const { ergebnis, fehler } = lauf;

  const zeileAendern = (i: number, neu: Partial<Ansatzzeile>): void => {
    setForm((f) => ({ ...f, zeilen: f.zeilen.map((z, j) => (j === i ? { ...z, ...neu } : z)) }));
  };
  const feldFehler = (i: number, feld: 'ansatzmenge' | 'kostensatz'): string | undefined =>
    fehler.find((x) => x.ort === 'zeile' && x.zeile === i && x.feld === feld)?.meldung;
  const satzFehler = (art: EpaArt): string | undefined =>
    fehler.find((x) => x.ort === 'satz' && x.art === art)?.meldung;

  const uebernehmen = async (): Promise<void> => {
    if (position === null) return;
    const befehle = kalkulationBefehle(position.id, ergebnis);
    if (befehle === null) {
      setMeldung(t.nichtsZuUebernehmen);
      return;
    }
    if (await senden(befehle)) onSchliessen();
  };

  const titel = position === null ? t.titel : `${t.titel}: ${ozText(position)} ${position.kurztext}`.trim();
  return (
    <Dialog
      offen={position !== null}
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={titel}
      beschreibung={position === null ? '' : t.einleitung(`${ozText(position)} ${position.kurztext}`.trim())}
      fuss={
        <>
          <Button onClick={onSchliessen}>{t.abbrechen}</Button>
          <Button variante="primaer" onClick={() => void uebernehmen()}>
            {t.uebernehmen}
          </Button>
        </>
      }
    >
      <p className="kosten__hinweis" data-testid="kalkulation-nicht-gespeichert">
        {t.nichtGespeichert}
      </p>
      <h3>{t.ansaetze}</h3>
      <div className="kalkulation__zeilen">
        {form.zeilen.map((z, i) => (
          // Die Zeilen sind unbenannt und nur nach Index zu unterscheiden; ein Entfernen mischt nur Textfelder.
          <ZeilenFelder
            key={i}
            nr={i + 1}
            zeile={z}
            fehlerMenge={feldFehler(i, 'ansatzmenge')}
            fehlerSatz={feldFehler(i, 'kostensatz')}
            onChange={(neu) => {
              zeileAendern(i, neu);
            }}
            onEntfernen={() => {
              setForm((f) => ({ ...f, zeilen: f.zeilen.filter((_, j) => j !== i) }));
            }}
          />
        ))}
      </div>
      <Button
        onClick={() => {
          setForm((f) => ({ ...f, zeilen: [...f.zeilen, LEERE_ZEILE] }));
        }}
      >
        {t.zeileHinzu}
      </Button>

      <h3>{t.saetze}</h3>
      <div className="kalkulation__saetze">
        {ARTEN.map((art) => (
          <Eingabefeld
            key={art}
            label={t.satz(t.kostenart[art])}
            value={form.saetze[art] ?? ''}
            inputMode="decimal"
            kompakt
            onWertChange={(w) => {
              setForm((f) => ({ ...f, saetze: { ...f.saetze, [art]: w } }));
            }}
            {...(satzFehler(art) === undefined ? {} : { meldung: satzFehler(art) as string })}
          />
        ))}
      </div>
      {epaBezeichnungenGesetzt ? null : (
        <Eingabefeld
          label={t.freiBezeichnung}
          value={form.freiBezeichnung}
          onWertChange={(w) => {
            setForm((f) => ({ ...f, freiBezeichnung: w }));
          }}
        />
      )}

      <h3>{t.nachweis}</h3>
      <table className="kalkulation__nachweis" aria-label={t.nachweisTabelle}>
        <thead>
          <tr>
            <th>{t.spalteArt}</th>
            <th>{t.spalteEinzelkosten}</th>
            <th>{t.spalteZuschlag}</th>
            <th>{t.spalteAnteil}</th>
          </tr>
        </thead>
        <tbody>
          {ergebnis.kostenarten.map((k) => (
            <tr key={k.art}>
              <td>{t.kostenart[k.art]}</td>
              <td>{formatiereEinheitspreisDe(runden(k.einzelkosten, 'einheitspreis'))}</td>
              <td>{formatiereEinheitspreisDe(runden(k.kalkulationszuschlag, 'einheitspreis'))}</td>
              <td>{formatiereEinheitspreisDe(k.anteil)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="kalkulation__ep">
            <td>{t.ep}</td>
            <td />
            <td />
            <td data-testid="kalkulation-ep">
              {ergebnis.einheitspreis === null ? t.epLeer : formatiereEinheitspreisDe(ergebnis.einheitspreis)}
            </td>
          </tr>
          <tr>
            <td>{t.lohnstunden}</td>
            <td />
            <td />
            <td data-testid="kalkulation-lohnstunden">{formatiereMengeDe(ergebnis.lohnstundenJeEinheit)}</td>
          </tr>
        </tfoot>
      </table>
      {ergebnis.befunde.length > 0 ? (
        <ul className="kosten__befunde" aria-label="Hinweise zur Kalkulation">
          {ergebnis.befunde.map((b, i) => (
            <li key={`${b.code}-${String(i)}`}>
              {b.zeile === null ? '' : `Ansatz ${String(b.zeile + 1)}: `}
              {t.befund[b.code]}
            </li>
          ))}
        </ul>
      ) : null}
      <p role="status" aria-live="polite">
        {meldung ?? ''}
      </p>
    </Dialog>
  );
}

function ZeilenFelder({
  nr,
  zeile,
  fehlerMenge,
  fehlerSatz,
  onChange,
  onEntfernen,
}: {
  nr: number;
  zeile: Ansatzzeile;
  fehlerMenge: string | undefined;
  fehlerSatz: string | undefined;
  onChange: (neu: Partial<Ansatzzeile>) => void;
  onEntfernen: () => void;
}): ReactElement {
  return (
    <>
      <Auswahl
        label={t.art(nr)}
        wert={zeile.art}
        onWertChange={(w) => {
          onChange({ art: w as EpaArt });
        }}
        optionen={ARTEN.map((a) => ({ wert: a, label: t.kostenart[a] }))}
        kompakt
      />
      <Eingabefeld
        label={t.bezeichnung(nr)}
        value={zeile.bezeichnung}
        onWertChange={(w) => {
          onChange({ bezeichnung: w });
        }}
        kompakt
      />
      <Eingabefeld
        label={t.ansatzmenge(nr)}
        value={zeile.ansatzmenge}
        inputMode="decimal"
        onWertChange={(w) => {
          onChange({ ansatzmenge: w });
        }}
        kompakt
        {...(fehlerMenge === undefined ? {} : { meldung: fehlerMenge })}
      />
      <Eingabefeld
        label={t.kostensatz(nr)}
        value={zeile.kostensatz}
        inputMode="decimal"
        onWertChange={(w) => {
          onChange({ kostensatz: w });
        }}
        kompakt
        {...(fehlerSatz === undefined ? {} : { meldung: fehlerSatz })}
      />
      <Button onClick={onEntfernen} aria-label={t.zeileEntfernen(nr)}>
        −
      </Button>
    </>
  );
}
