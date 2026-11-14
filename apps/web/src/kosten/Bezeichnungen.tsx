// SPDX-License-Identifier: AGPL-3.0-or-later
// Bezeichnungen der Kostengruppen auf den Kostenseiten (Ticket 89, G-16; Ticket 154, B-14): der Abschnitt zum Einlesen der
// CSV des Nutzers (Liste der Kostenermittlungen und jede Kostenermittlung) und ein Hinweis mit Verweis dorthin, solange
// keine Bezeichnungen vorhanden sind. Wo und wie sie gemerkt werden, regelt `bezeichnungen.ts`.

import { Button } from '@tethys/ui-basis';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useAnker } from '../ui/route';
import { Verweis } from '../ui/Verweis';
import { bezeichnungenAusCsv, bezeichnungenGemerkt, bezeichnungenMerken } from './bezeichnungen';
import { BEZEICHNUNGEN_ANKER } from './pfad';
import { texte } from './texte';

const t = texte.editor;

export interface Bezeichnungsstand {
  /** Der CSV-Text; `null`: keiner. */
  readonly csv: string | null;
  /** Nummer → Bezeichnung. */
  readonly bezeichnungen: ReadonlyMap<string, string>;
  /** Merkt einen neuen CSV-Text (`null` vergisst ihn). */
  readonly setzen: (csv: string | null) => void;
}

export function useBezeichnungen(): Bezeichnungsstand {
  const [csv, setCsv] = useState<string | null>(() => bezeichnungenGemerkt());
  const bezeichnungen = useMemo(() => bezeichnungenAusCsv(csv), [csv]);
  return {
    csv,
    bezeichnungen,
    setzen: (neu) => {
      setCsv(neu);
      bezeichnungenMerken(neu);
    },
  };
}

/** Hinweis mit Verweis zum Einlesen (B-14); ohne Inhalt, sobald Bezeichnungen vorhanden sind. */
export function BezeichnungenHinweis({
  stand,
  pfad,
  gehe,
}: {
  stand: Bezeichnungsstand;
  /** Wo der Abschnitt zum Einlesen steht (mit Anker). */
  pfad: string;
  gehe: (pfad: string) => void;
}): ReactElement | null {
  if (stand.bezeichnungen.size > 0) return null;
  return (
    <p className="kosten__hinweis" role="note" data-testid="bezeichnungen-fehlen">
      {texte.bezeichnungen.fehlen} <Verweis pfad={pfad} text={texte.bezeichnungen.einlesen} gehe={gehe} />
    </p>
  );
}

/** Der Abschnitt „Bezeichnungen der Kostengruppen“; ein Verweis mit dem Anker führt hierher und setzt den Fokus. */
export function BezeichnungenBereich({ stand }: { stand: Bezeichnungsstand }): ReactElement {
  const [meldung, setMeldung] = useState<string | null>(null);
  const anker = useAnker();
  const ueberschrift = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (anker !== `#${BEZEICHNUNGEN_ANKER}`) return;
    ueberschrift.current?.scrollIntoView({ block: 'start' });
    ueberschrift.current?.focus();
  }, [anker]);

  const waehlen = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const datei = e.target.files?.[0];
    e.target.value = '';
    if (datei === undefined) return;
    try {
      stand.setzen(await datei.text());
      setMeldung(null);
    } catch {
      setMeldung(t.csvFehler);
    }
  };

  const anzahl = stand.bezeichnungen.size;
  return (
    <section aria-labelledby={BEZEICHNUNGEN_ANKER}>
      <h2 id={BEZEICHNUNGEN_ANKER} ref={ueberschrift} tabIndex={-1}>
        {t.csvTitel}
      </h2>
      <p className="kosten__hinweis">{t.csvHinweis}</p>
      <div className="kosten__datei">
        <label>
          {t.csvWaehlen}{' '}
          <input type="file" accept=".csv,text/csv,text/plain" onChange={(e) => void waehlen(e)} />
        </label>
        <Button
          onClick={() => {
            stand.setzen(null);
            setMeldung(null);
          }}
          disabled={stand.csv === null}
        >
          {t.csvEntfernen}
        </Button>
        <span role="status">{meldung ?? (anzahl > 0 ? t.csvGelesen(anzahl) : t.csvKeine)}</span>
      </div>
    </section>
  );
}
