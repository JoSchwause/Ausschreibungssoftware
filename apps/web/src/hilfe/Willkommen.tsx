// SPDX-License-Identifier: AGPL-3.0-or-later
// Erster Start (Ticket 147, E2, B-02): Bei leerer Projektliste ein kurzer Begrüßungstext und drei Wege: das Beispielprojekt
// laden (aus den Fixtures, über Befehle, `beispielprojekt.ts`), mit einer GAEB-Datei beginnen, ein leeres Projekt anlegen (das
// Formular der Projektliste). Dazu der Hinweis, wo die Daten liegen und wie man sichert.
//
// „GAEB-Datei einlesen“: das Einlesen ohne offenes Projekt (`GaebEinlesen` mit `projekt={null}`). Erst „Übernehmen“ legt das
// Projekt an (Name aus der Datei, änderbar), zusammen mit dem LV als ein Undo-Schritt; Abbrechen lässt nichts zurück.

import { Button, useToast } from '@tethys/ui-basis';
import { useId, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { IfcArbeiter } from '../bim/ifc-arbeiter';
import { GaebEinlesen } from '../gaeb/GaebEinlesen';
import { abweisungText } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { projektPfad } from '../ui/pfade';
import { beispielprojektAnlegen } from './beispielprojekt';
import { beispielquelleLaden } from './beispielquelle';
import { Datenhinweis } from './Datenhinweis';
import { texte } from './texte';
import './hilfe.css';

type Gehe = (pfad: string) => void;

function BeispielWeg({ gehe }: { gehe: Gehe }): ReactElement {
  const t = texte.start.beispiel;
  const u = useUmgebung();
  const { zeige } = useToast();
  const titel = useId();
  const [laedt, setLaedt] = useState(false);

  const laden = async (): Promise<void> => {
    setLaedt(true);
    const arbeiter = new IfcArbeiter();
    try {
      const e = await beispielprojektAnlegen(u, await beispielquelleLaden(), (b, kopf) =>
        arbeiter.lesen(b, kopf),
      );
      if (e.ok) {
        zeige({ titel: t.erfolg, beschreibung: t.erfolgText, art: 'erfolg' });
        gehe(projektPfad(e.projektId));
        return;
      }
      // Was angelegt ist, bleibt (Q5) und ist ein Undo-Schritt; die Meldung nennt den Grund.
      zeige({ titel: t.fehler, beschreibung: abweisungText(e.abweisung).beschreibung, art: 'fehler' });
      if (e.projektId !== null) gehe(projektPfad(e.projektId));
    } catch {
      // Das Bündel mit den Daten oder der Leser des Modells ließ sich nicht laden (etwa nach einem neuen Stand der App).
      zeige({ titel: t.fehler, beschreibung: t.nichtLesbar, art: 'fehler' });
    } finally {
      arbeiter.beenden();
      setLaedt(false);
    }
  };

  return (
    <section className="hilfe-start__weg" aria-labelledby={titel}>
      <h3 id={titel}>{t.titel}</h3>
      <p>{t.text}</p>
      <div className="hilfe-start__aktion">
        <Button variante="primaer" disabled={laedt} onClick={() => void laden()}>
          {t.knopf}
        </Button>
        {laedt ? (
          <span className="hilfe-start__leise" aria-busy="true">
            {t.laedt}
          </span>
        ) : null}
      </div>
    </section>
  );
}

function GaebWeg({ gehe }: { gehe: Gehe }): ReactElement {
  const t = texte.start.gaeb;
  const titel = useId();
  return (
    <section className="hilfe-start__weg" aria-labelledby={titel}>
      <h3 id={titel}>{t.titel}</h3>
      <p>{t.text}</p>
      <div className="hilfe-start__aktion">
        <GaebEinlesen
          projekt={null}
          onAngelegt={(ziel) => {
            gehe(projektPfad(ziel.projektId));
          }}
        />
      </div>
    </section>
  );
}

export function Willkommen({
  gehe,
  leer,
  formular,
}: {
  gehe: Gehe;
  /** „Noch keine Projekte.“ aus den Texten der Projektliste. */
  leer: string;
  /** Das Formular „Neues Projekt“ der Projektliste, der dritte Weg. */
  formular: ReactNode;
}): ReactElement {
  const t = texte.start;
  const titel = useId();
  const leerTitel = useId();
  return (
    <section className="hilfe-start" aria-labelledby={titel}>
      <h2 id={titel}>{t.titel}</h2>
      <p>{leer}</p>
      <p>{t.text}</p>
      <div className="hilfe-start__wege" role="group" aria-label={t.wege}>
        <BeispielWeg gehe={gehe} />
        <GaebWeg gehe={gehe} />
        <section className="hilfe-start__weg" aria-labelledby={leerTitel}>
          <h3 id={leerTitel}>{t.leer.titel}</h3>
          <p>{t.leer.text}</p>
          {formular}
        </section>
      </div>
      <Datenhinweis gehe={gehe} />
    </section>
  );
}
