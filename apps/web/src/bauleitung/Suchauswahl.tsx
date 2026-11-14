// SPDX-License-Identifier: AGPL-3.0-or-later
// Auswahl aus einer möglicherweise langen Liste (Ticket 155: Position und Bauteil werden gewählt, nicht getippt). Bis zur
// Grenze ist es eine gewöhnliche Auswahl; darüber steht ein Suchfeld davor, das die Liste eingrenzt (Pfeile und Buchstaben
// gehen in der Auswahl wie gewohnt, U3). Der gewählte Eintrag bleibt immer in der Liste.

import { Auswahl, Eingabefeld } from '@tethys/ui-basis';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { suchauswahl, type Auswahlwert } from './maengel';
import { texte } from './texte';

/** So viele Einträge zeigt eine Auswahl höchstens auf einmal. */
export const SUCHGRENZE = 100;

const KEINE = '-';

export function Suchauswahl({
  label,
  keine,
  optionen,
  wert,
  onWertChange,
  deaktiviert = false,
  meldung,
  hinweis,
  grenze = SUCHGRENZE,
}: {
  label: string;
  /** Text des Eintrags „keine Angabe“ (Wert `''`). */
  keine: string;
  optionen: readonly Auswahlwert[];
  /** `''`: keine Angabe. */
  wert: string;
  onWertChange: (wert: string) => void;
  deaktiviert?: boolean;
  meldung?: string | undefined;
  hinweis?: string | undefined;
  grenze?: number;
}): ReactElement {
  const [suche, setSuche] = useState('');
  const lang = optionen.length > grenze;
  const { optionen: gezeigt, treffer } = suchauswahl(optionen, lang ? suche : '', wert, grenze);
  const f = texte.formular;
  return (
    <div className="bauleitung__suchauswahl">
      {lang ? (
        <Eingabefeld
          label={f.suchen(label)}
          value={suche}
          disabled={deaktiviert}
          hinweis={treffer > grenze ? f.treffer(grenze, treffer) : f.suchHinweis}
          onWertChange={setSuche}
        />
      ) : null}
      <Auswahl
        label={label}
        wert={wert === '' ? KEINE : wert}
        deaktiviert={deaktiviert}
        onWertChange={(w) => {
          onWertChange(w === KEINE ? '' : w);
        }}
        optionen={[{ wert: KEINE, label: keine }, ...gezeigt]}
      />
      {meldung === undefined ? null : (
        <p className="tx-feld__meldung" role="alert">
          {meldung}
        </p>
      )}
      {hinweis === undefined ? null : <p className="bauleitung__hinweis">{hinweis}</p>}
    </div>
  );
}
