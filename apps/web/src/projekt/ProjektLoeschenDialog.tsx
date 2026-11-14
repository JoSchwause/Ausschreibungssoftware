// SPDX-License-Identifier: AGPL-3.0-or-later
// Dialog „Projekt löschen“ (Ticket 48) mit dem Weg „Projekt samt Inhalt löschen …“ (E8, D-96, Q5): Ohne Inhalt löscht er das
// Projekt allein. Mit Inhalt nennt er die Anzahl je Art und bietet nur das Löschen samt Inhalt an; dieser zweite Schritt zeigt
// zuerst „Projektdatei sichern“, verlangt eine ausdrückliche Bestätigung (Ankreuzfeld) und sagt, dass Rückgängig alles herstellt.

import { Button, Dialog } from '@tethys/ui-basis';
import type { Projekt } from '@tethys/vertrag';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { texte as htexte } from '../historie/texte';
import type { anzahlJeArt } from './samtInhalt';
import { texte } from './texte';

const t = texte.samtInhalt;

export type Anzahlen = ReturnType<typeof anzahlJeArt>;

export interface ProjektLoeschenDialogProps {
  readonly projekt: Projekt;
  /** `null`: geschlossen. Sonst die Anzahl je Art (leer: das Projekt hat keinen Inhalt). */
  readonly anzahlen: Anzahlen | null;
  readonly onSchliessen: () => void;
  /** Das Projekt allein löschen (`ProjektLoeschen`). */
  readonly onLoeschen: () => void;
  /** Das Projekt samt Inhalt löschen. */
  readonly onSamtInhaltLoeschen: () => void;
  readonly onSichern: () => void;
}

function Inhaltsliste({ anzahlen }: { anzahlen: Anzahlen }): ReactElement {
  return (
    <ul className="projekt__inhalt" aria-label={t.liste}>
      {anzahlen.map(({ art, anzahl }) => (
        <li key={art}>{t.arten[art](anzahl)}</li>
      ))}
    </ul>
  );
}

export function ProjektLoeschenDialog({
  projekt,
  anzahlen,
  onSchliessen,
  onLoeschen,
  onSamtInhaltLoeschen,
  onSichern,
}: ProjektLoeschenDialogProps): ReactElement {
  const [samtInhalt, setSamtInhalt] = useState(false);
  const [bestaetigt, setBestaetigt] = useState(false);
  const sichern = useRef<HTMLButtonElement>(null);
  const feldId = useId();
  const offen = anzahlen !== null;
  const mitInhalt = (anzahlen?.length ?? 0) > 0;

  // Jedes Öffnen beginnt mit der Frage und ohne Bestätigung.
  useEffect(() => {
    if (!offen) {
      setSamtInhalt(false);
      setBestaetigt(false);
    }
  }, [offen]);
  // Im zweiten Schritt steht der Fokus zuerst auf „Projektdatei sichern“.
  useEffect(() => {
    if (samtInhalt) sichern.current?.focus();
  }, [samtInhalt]);

  const abbrechen = (
    <Button onClick={onSchliessen}>{samtInhalt ? t.abbrechen : htexte.loeschen.abbrechen}</Button>
  );
  let fuss: ReactElement;
  if (samtInhalt)
    fuss = (
      <>
        {abbrechen}
        <Button variante="gefahr" disabled={!bestaetigt} onClick={onSamtInhaltLoeschen}>
          {t.loeschen}
        </Button>
      </>
    );
  else if (mitInhalt)
    fuss = (
      <>
        {abbrechen}
        <Button
          variante="gefahr"
          onClick={() => {
            setSamtInhalt(true);
          }}
        >
          {t.knopf}
        </Button>
      </>
    );
  else
    fuss = (
      <>
        {abbrechen}
        <Button variante="gefahr" onClick={onLoeschen}>
          {htexte.loeschen.bestaetigen}
        </Button>
      </>
    );

  return (
    <Dialog
      offen={offen}
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={samtInhalt ? t.titel : htexte.loeschen.projektTitel}
      fuss={fuss}
    >
      {samtInhalt && anzahlen !== null ? (
        <>
          <p>{t.sichernHinweis}</p>
          <p>
            <Button ref={sichern} onClick={onSichern}>
              {t.sichern}
            </Button>
          </p>
          <p>{t.einleitung(projekt.name)}</p>
          <Inhaltsliste anzahlen={anzahlen} />
          <p>{t.rueckgaengig}</p>
          <label className="projekt__bestaetigung" htmlFor={feldId}>
            <input
              id={feldId}
              type="checkbox"
              checked={bestaetigt}
              onChange={(e) => {
                setBestaetigt(e.target.checked);
              }}
            />
            <span>{t.bestaetigung(projekt.name)}</span>
          </label>
        </>
      ) : mitInhalt && anzahlen !== null ? (
        <>
          <p>{t.frage(projekt.name)}</p>
          <Inhaltsliste anzahlen={anzahlen} />
        </>
      ) : (
        <p>{htexte.loeschen.projektFrage(projekt.name, 0)}</p>
      )}
    </Dialog>
  );
}
