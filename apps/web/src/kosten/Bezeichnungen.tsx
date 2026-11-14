// SPDX-License-Identifier: AGPL-3.0-or-later
// Bezeichnungen der Kostengruppen auf den Kostenseiten (Ticket 89, G-16; Ticket 154, B-14): der Abschnitt zum Einlesen der
// CSV des Nutzers (Liste der Kostenermittlungen und jede Kostenermittlung) und ein Hinweis mit Verweis dorthin, solange
// keine Bezeichnungen vorhanden sind. Sie liegen in den Einstellungen (Ticket 150, D-73); gelesen wird deren aktueller Stand,
// so folgt die Seite auch dem eigenen Rückgängig der Einstellungen, das der Abschnitt mitbringt (D-82 M1). Geschrieben wird
// über `bezeichnungen.ts`; eine Abweisung erscheint als Meldung, eine CSV ohne lesbare Zeile löscht nichts (Q5).

import { Button, useToast } from '@tethys/ui-basis';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import {
  EinstellungenKnoepfe,
  useEinstellungen,
  useEinstellungenHistorie,
} from '../historie/EinstellungenAnbieter';
import { useAnker } from '../ui/route';
import { Verweis } from '../ui/Verweis';
import { abweisungText } from '../lv/meldungen';
import { bezeichnungenMerken, type Merkausgang } from './bezeichnungen';
import { BEZEICHNUNGEN_ANKER } from './pfad';
import { texte } from './texte';

const t = texte.editor;

export interface Bezeichnungsstand {
  /** Nummer → Bezeichnung; leer: keine eingelesen. */
  readonly bezeichnungen: ReadonlyMap<string, string>;
  /** Merkt einen neuen CSV-Text (`null` vergisst ihn); sagt, wie es ausging. */
  readonly setzen: (csv: string | null) => Promise<Merkausgang>;
}

export function useBezeichnungen(): Bezeichnungsstand {
  const liste = useEinstellungen().zustand.kostengruppenbezeichnungen;
  const bezeichnungen = useMemo(
    () => new Map(liste.map((k) => [k.nummer as string, k.bezeichnung])),
    [liste],
  );
  return {
    bezeichnungen,
    setzen: bezeichnungenMerken,
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
  const { zeige } = useToast();
  const anker = useAnker();
  const historie = useEinstellungenHistorie();
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
    let text: string;
    try {
      text = await datei.text();
    } catch {
      setMeldung(t.csvFehler);
      return;
    }
    melden(await stand.setzen(text));
  };

  // Wellen-Review SB2/PB4 (Q5): Eine Abweisung erscheint als Meldung, eine CSV ohne lesbare Zeile löscht nichts.
  const melden = (a: Merkausgang): void => {
    if (a.art === 'gemerkt') setMeldung(null);
    else if (a.art === 'leer') setMeldung(t.csvLeer);
    else if (a.art === 'ohneEinstellungen') setMeldung(t.csvOhneEinstellungen);
    else {
      setMeldung(null);
      zeige({ ...abweisungText(a.abweisung), art: 'fehler' });
    }
  };

  const anzahl = stand.bezeichnungen.size;
  return (
    // Strg+Z und Strg+Y wirken in diesem Abschnitt auf die Einstellungen, nicht auf das Projekt (wie im Dialog „Büro“).
    <section aria-labelledby={BEZEICHNUNGEN_ANKER} onKeyDown={historie.tasten}>
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
            void stand.setzen(null).then(melden);
          }}
          disabled={anzahl === 0}
        >
          {t.csvEntfernen}
        </Button>
        <EinstellungenKnoepfe historie={historie} />
        <span role="status">{meldung ?? (anzahl > 0 ? t.csvGelesen(anzahl) : t.csvKeine)}</span>
      </div>
    </section>
  );
}
