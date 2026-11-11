// SPDX-License-Identifier: AGPL-3.0-or-later
// Nachlass und MwSt an der Summenzeile (W-06): Prozent oder Betrag; leeren entfernt den Nachlass. Übernommen wird mit
// Enter oder beim Verlassen des Felds, als genau ein Befehl (`NachlassSetzen`, `NachlassEntfernen`, `MwstSatzSetzen`).
// Ungültige Eingaben bleiben im Feld stehen und sind markiert, nichts wird gesperrt (U5).

import { Auswahl, Zahlfeld } from '@tethys/ui-basis';
import type { Leistungsverzeichnis, LvBefehl, Nachlass } from '@tethys/vertrag';
import { useEffect, useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { nachlassBefehl, nachlassText } from './summeneingabe';
import { texte } from './texte';
import { formatiereProzentDe, zahlLesen } from './zahlen';

type Art = Nachlass['art'];

export function SummenFelder(props: {
  lv: Leistungsverzeichnis;
  senden: (b: LvBefehl) => Promise<boolean>;
}): ReactElement {
  const { lv, senden } = props;
  const [art, setArt] = useState<Art>(lv.nachlass?.art ?? 'prozent');
  const [nachlass, setNachlass] = useState(nachlassText(lv.nachlass));
  const [mwst, setMwst] = useState(formatiereProzentDe(lv.mwstSatz));
  const [meldung, setMeldung] = useState<{ nachlass?: string | undefined; mwst?: string | undefined }>({});

  // Neuer gespeicherter Stand: die Felder zeigen ihn (auch nach einer Änderung an anderer Stelle).
  useEffect(() => {
    setNachlass(nachlassText(lv.nachlass));
    if (lv.nachlass) setArt(lv.nachlass.art);
  }, [lv.nachlass]);
  useEffect(() => {
    setMwst(formatiereProzentDe(lv.mwstSatz));
  }, [lv.mwstSatz]);

  const nachlassUebernehmen = (mitArt: Art = art): void => {
    const b = nachlassBefehl(lv.nachlass, mitArt, nachlass);
    if (typeof b === 'string') {
      setMeldung((m) => ({ ...m, nachlass: b }));
      return;
    }
    setMeldung((m) => ({ ...m, nachlass: undefined }));
    if (b !== null) void senden(b);
  };
  const mwstUebernehmen = (): void => {
    const r = zahlLesen('prozent', mwst);
    if (!r.ok) {
      setMeldung((m) => ({ ...m, mwst: r.fehler }));
      return;
    }
    setMeldung((m) => ({ ...m, mwst: undefined }));
    if (r.wert !== lv.mwstSatz) void senden({ art: 'MwstSatzSetzen', mwstSatz: r.wert });
  };
  const beiEnter = (f: () => void) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      f();
    }
  };

  return (
    <div className="lv__summenfelder" role="group" aria-label={texte.summen.bereich}>
      <Zahlfeld
        kompakt
        label={texte.summen.nachlass}
        value={nachlass}
        einheit={art === 'prozent' ? texte.summen.prozentZeichen : texte.summen.euro}
        hinweis={texte.summen.nachlassHinweis}
        onWertChange={(w) => {
          setNachlass(w);
        }}
        onKeyDown={beiEnter(() => {
          nachlassUebernehmen();
        })}
        onBlur={() => {
          nachlassUebernehmen();
        }}
      />
      <Auswahl
        kompakt
        label={texte.summen.nachlassArt}
        optionen={[
          { wert: 'prozent', label: texte.summen.prozent },
          { wert: 'betrag', label: texte.summen.betrag },
        ]}
        wert={art}
        onWertChange={(w) => {
          const neu: Art = w === 'betrag' ? 'betrag' : 'prozent';
          setArt(neu);
          nachlassUebernehmen(neu);
        }}
      />
      {meldung.nachlass ? (
        <p className="lv__meldung" role="alert">
          {meldung.nachlass}
        </p>
      ) : null}
      <Zahlfeld
        kompakt
        label={texte.summen.mwst}
        value={mwst}
        einheit={texte.summen.prozentZeichen}
        onWertChange={(w) => {
          setMwst(w);
        }}
        onKeyDown={beiEnter(mwstUebernehmen)}
        onBlur={mwstUebernehmen}
      />
      {meldung.mwst ? (
        <p className="lv__meldung" role="alert">
          {meldung.mwst}
        </p>
      ) : null}
    </div>
  );
}
