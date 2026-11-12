// SPDX-License-Identifier: AGPL-3.0-or-later
// Felder für Name, Projektbeginn und Arbeitskalender (Ticket 118), beim Anlegen und auf der Planseite gleich. Die Felder
// nehmen jede Eingabe an; Fehler stehen als Meldung am Feld (U5).

import { BUNDESLAENDER } from '@tethys/bauzeit';
import { Auswahl, Eingabefeld } from '@tethys/ui-basis';
import type { Bundesland, Wochentag } from '@tethys/vertrag';
import type { ReactElement } from 'react';
import type { Feldfehler, Kopfentwurf } from './befehle';
import { WOCHENTAGE, texte } from './texte';

const KEIN_LAND = 'keins';

export function KopfFelder({
  entwurf,
  onEntwurf,
  fehler,
}: {
  entwurf: Kopfentwurf;
  onEntwurf: (e: Kopfentwurf) => void;
  fehler: readonly Feldfehler[];
}): ReactElement {
  const t = texte.kopf;
  const meldung = (feld: string): { meldung?: string } => {
    const f = fehler.find((x) => x.feld === feld);
    return f === undefined ? {} : { meldung: f.meldung };
  };
  const tagUmschalten = (tag: Wochentag, an: boolean): void => {
    const rest = entwurf.arbeitstage.filter((x) => x !== tag);
    onEntwurf({ ...entwurf, arbeitstage: an ? [...rest, tag].sort((a, b) => a - b) : rest });
  };
  const tageFehler = fehler.find((x) => x.feld === 'arbeitstage');
  return (
    <>
      <Eingabefeld
        label={t.name}
        value={entwurf.name}
        onWertChange={(name) => {
          onEntwurf({ ...entwurf, name });
        }}
        {...meldung('name')}
      />
      <Eingabefeld
        label={t.projektbeginn}
        value={entwurf.projektbeginn}
        hinweis={t.datumHinweis}
        onWertChange={(projektbeginn) => {
          onEntwurf({ ...entwurf, projektbeginn });
        }}
        {...meldung('projektbeginn')}
      />
      <fieldset className="bauzeit__tage">
        <legend>{t.arbeitstage}</legend>
        {WOCHENTAGE.map((tag) => (
          <label key={tag} className="bauzeit__tag">
            <input
              type="checkbox"
              checked={entwurf.arbeitstage.includes(tag)}
              onChange={(x) => {
                tagUmschalten(tag, x.target.checked);
              }}
            />
            {texte.wochentag[tag]}
          </label>
        ))}
        <p className="tx-feld__meldung" role="status" aria-live="polite">
          {tageFehler?.meldung ?? ''}
        </p>
      </fieldset>
      <Auswahl
        label={t.bundesland}
        wert={entwurf.bundesland ?? KEIN_LAND}
        onWertChange={(w) => {
          onEntwurf({ ...entwurf, bundesland: w === KEIN_LAND ? null : (w as Bundesland) });
        }}
        optionen={[
          { wert: KEIN_LAND, label: texte.ohneLand },
          ...BUNDESLAENDER.map((b) => ({ wert: b, label: texte.bundesland[b] })),
        ]}
      />
      <Eingabefeld
        label={t.freieTage}
        value={entwurf.freieTage}
        hinweis={t.freieTageHinweis}
        onWertChange={(freieTage) => {
          onEntwurf({ ...entwurf, freieTage });
        }}
        {...meldung('freieTage')}
      />
    </>
  );
}
