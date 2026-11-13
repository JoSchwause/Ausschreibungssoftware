// SPDX-License-Identifier: AGPL-3.0-or-later
// Erster Start (Ticket 147, E2, B-02): Bei leerer Projektliste ein kurzer Begrüßungstext und drei Wege: das Beispielprojekt
// laden (aus den Fixtures, über Befehle, `beispielprojekt.ts`), mit einer GAEB-Datei beginnen, ein leeres Projekt anlegen (das
// Formular der Projektliste). Dazu der Hinweis, wo die Daten liegen und wie man sichert.
//
// „GAEB-Datei einlesen“ bis Ticket 146: legt ein Projekt „Neues Projekt“ an und öffnet darin das vorhandene Einlesen
// (`GaebEinlesen`, Dateiauswahl, Vorschau, „Übernehmen“). Ticket 146 ersetzt das durch das Einlesen ohne offenes Projekt, das
// das Projekt aus der Datei anlegt (Name aus der Datei, nichts angelegt beim Abbrechen).

import { Button, useToast } from '@tethys/ui-basis';
import type { Projekt } from '@tethys/vertrag';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { IfcArbeiter } from '../bim/ifc-arbeiter';
import { GaebEinlesen } from '../gaeb/GaebEinlesen';
import { befehlswegFuer } from '../lv/befehlsweg';
import { abweisungText, useMeldungen } from '../lv/meldungen';
import { projektAnlegenBefehl } from '../projekt/befehle';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { projektPfad } from '../ui/pfade';
import { Verweis } from '../ui/Verweis';
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
  const u = useUmgebung();
  const { pruefe } = useMeldungen();
  const titel = useId();
  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const huelle = useRef<HTMLDivElement>(null);

  // Rückgängig kann das neue Projekt wieder entfernen; dann beginnt der Weg von vorn.
  useEffect(
    () =>
      befehlswegFuer(u).beiHistorie(() => {
        setProjekt(null);
      }),
    [u],
  );
  // Sobald das Projekt steht, öffnet das vorhandene Einlesen seine Dateiauswahl (noch im Zug des Klicks). Öffnet der
  // Browser sie nicht, bleibt die Schaltfläche des Einlesens darunter.
  useEffect(() => {
    if (projekt !== null) huelle.current?.querySelector<HTMLInputElement>('input[type="file"]')?.click();
  }, [projekt]);

  const anlegen = async (): Promise<void> => {
    const a = await befehlswegFuer(u)
      .projekt(null)
      .befehl(projektAnlegenBefehl(u.ids, t.projektname, ''));
    if (pruefe(a) && a.zustand !== null) setProjekt(a.zustand);
  };

  return (
    <section className="hilfe-start__weg" aria-labelledby={titel}>
      <h3 id={titel}>{t.titel}</h3>
      <p>{t.text}</p>
      {projekt === null ? (
        <div className="hilfe-start__aktion">
          <Button onClick={() => void anlegen()}>{t.knopf}</Button>
        </div>
      ) : (
        <>
          <p role="status">{t.angelegt(projekt.name)}</p>
          <div className="hilfe-start__aktion" ref={huelle}>
            <GaebEinlesen
              projekt={projekt}
              onAngelegt={() => {
                gehe(projektPfad(projekt.id));
              }}
            />
            <Verweis pfad={projektPfad(projekt.id)} text={t.zumProjekt} gehe={gehe} />
          </div>
        </>
      )}
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
