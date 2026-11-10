// SPDX-License-Identifier: AGPL-3.0-or-later
// Eingabefelder. Eine Meldung ist immer nur ein Hinweis: Das Feld nimmt jede Eingabe an (U5).
// Die Prüfung läuft nach der Eingabe und stoppt sie nie; kein `pattern`, kein `maxLength`, keine
// Tastenfilter. Die Zahlenlogik (Parsen, Runden, Rechnen) gehört nicht hierher, sondern in
// `packages/dezimal`; das Zahlfeld reicht den Rohtext weiter (N1, N4).

import { useId } from 'react';
import type { InputHTMLAttributes, ReactElement, ReactNode } from 'react';
import { baustein } from './texte';

interface FeldRahmenProps {
  id: string;
  label: string;
  hinweis?: string | undefined;
  meldung?: string | undefined;
  meldungsId: string;
  hinweisId: string;
  kompakt?: boolean | undefined;
  children: ReactNode;
}

function FeldRahmen({
  id,
  label,
  hinweis,
  meldung,
  meldungsId,
  hinweisId,
  kompakt,
  children,
}: FeldRahmenProps): ReactElement {
  return (
    <div className={kompakt ? 'tx-feld tx-feld--kompakt' : 'tx-feld'}>
      <label className="tx-feld__label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hinweis ? (
        <p className="tx-feld__hinweis" id={hinweisId}>
          {hinweis}
        </p>
      ) : null}
      {/* Live-Region bleibt im DOM, damit Screenreader neue Meldungen ansagen. */}
      <p className="tx-feld__meldung" id={meldungsId} role="status" aria-live="polite">
        {meldung ?? ''}
      </p>
    </div>
  );
}

type NativAttribute = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value' | 'defaultValue' | 'pattern' | 'maxLength' | 'size' | 'type'
>;

export interface EingabefeldProps extends NativAttribute {
  label: string;
  value: string;
  onWertChange: (wert: string) => void;
  hinweis?: string;
  /** Nicht blockierende Meldung (U5). */
  meldung?: string;
  kompakt?: boolean;
}

export function Eingabefeld({
  label,
  value,
  onWertChange,
  hinweis,
  meldung,
  kompakt,
  className,
  ...rest
}: EingabefeldProps): ReactElement {
  const id = useId();
  const meldungsId = `${id}-meldung`;
  const hinweisId = `${id}-hinweis`;
  return (
    <FeldRahmen
      id={id}
      label={label}
      hinweis={hinweis}
      meldung={meldung}
      meldungsId={meldungsId}
      hinweisId={hinweisId}
      kompakt={kompakt}
    >
      <input
        {...rest}
        id={id}
        type="text"
        className={['tx-eingabe', className].filter(Boolean).join(' ')}
        value={value}
        onChange={(e) => {
          onWertChange(e.target.value);
        }}
        aria-invalid={meldung ? true : undefined}
        aria-describedby={[hinweis ? hinweisId : '', meldungsId].filter(Boolean).join(' ')}
      />
    </FeldRahmen>
  );
}

/** Ergebnis einer Zahlprüfung. `gueltig: false` ist ein Hinweis, kein Verbot. */
export type Zahlpruefung = { gueltig: true } | { gueltig: false; meldung: string };

/** Prüfer für den Rohtext eines Zahlfelds. Der echte de-DE-Parser kommt aus `packages/dezimal`. */
export type ZahlPruefer = (rohtext: string) => Zahlpruefung;

/**
 * Dieselbe Form wie `parseDe` in `packages/dezimal` (ui-basis darf dezimal nicht importieren, A3): optionales `-` oder
 * `−`, Ganzzahlteil als Ziffernfolge oder gruppiert (`1.234`), Nachkommateil mit mindestens einer Ziffer; mindestens
 * einer der beiden Teile ist da (`,5` gilt, `12,` nicht). Ändert sich `parseDe`, ändert sich diese Zeile mit.
 */
const DE_FORM = /^[-−]?(?:(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?|,\d+)$/;

/**
 * Reine Formprüfung für deutsche Zahlen (Tausenderpunkt, Dezimalkomma). Sie wandelt nichts um und
 * rechnet nichts; sie sagt nur, ob der Text wie eine deutsche Zahl aussieht. Leerer Text ist gültig.
 */
export const pruefeZahlformatDeDE: ZahlPruefer = (rohtext) => {
  const t = rohtext.trim();
  if (t === '' || DE_FORM.test(t)) return { gueltig: true };
  return { gueltig: false, meldung: baustein.zahlfeldFormat };
};

export interface ZahlfeldProps extends NativAttribute {
  label: string;
  /** Rohtext, wie er im Feld steht. */
  value: string;
  /** Meldet bei jeder Änderung den Rohtext und das Prüfergebnis. */
  onWertChange: (rohtext: string, pruefung: Zahlpruefung) => void;
  /** Steckbarer Prüfer; Standard: `pruefeZahlformatDeDE`. */
  pruefe?: ZahlPruefer;
  /** Einheit oder Zeichen rechts im Feld, z. B. „m²“ oder „€“. Reiner Text. */
  einheit?: string;
  hinweis?: string;
  kompakt?: boolean;
}

/** Eingabefeld für Zahlen im Format de-DE. Verarbeitet Text, nie Zahlenwerte (N1). */
export function Zahlfeld({
  label,
  value,
  onWertChange,
  pruefe = pruefeZahlformatDeDE,
  einheit,
  hinweis,
  kompakt,
  className,
  ...rest
}: ZahlfeldProps): ReactElement {
  const id = useId();
  const meldungsId = `${id}-meldung`;
  const hinweisId = `${id}-hinweis`;
  const pruefung = pruefe(value);
  const meldung = pruefung.gueltig ? undefined : pruefung.meldung;
  return (
    <FeldRahmen
      id={id}
      label={label}
      hinweis={hinweis}
      meldung={meldung}
      meldungsId={meldungsId}
      hinweisId={hinweisId}
      kompakt={kompakt}
    >
      <span className="tx-zahlfeld">
        <input
          {...rest}
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          className={['tx-eingabe', 'tx-eingabe--zahl', className].filter(Boolean).join(' ')}
          value={value}
          onChange={(e) => {
            onWertChange(e.target.value, pruefe(e.target.value));
          }}
          aria-invalid={meldung ? true : undefined}
          aria-describedby={[hinweis ? hinweisId : '', meldungsId].filter(Boolean).join(' ')}
        />
        {einheit ? <span className="tx-zahlfeld__einheit">{einheit}</span> : null}
      </span>
    </FeldRahmen>
  );
}
