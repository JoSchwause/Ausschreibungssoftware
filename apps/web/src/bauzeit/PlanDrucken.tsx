// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 118: „Als PDF“ auf der Planseite, Dialog wie die übrigen Drucke (Ticket 66). Das PDF entsteht in einem Web Worker
// über `ausgabe` (Ticket 113, `erzeugeBauzeitenplanPdf`); Termine und Befunde hat die App mit `bauzeit` gerechnet (A2). Das
// Datum kommt von der Uhr der App.

import type { BauzeitenplanEingabe } from '@tethys/ausgabe';
import type { Bauzeitenplanergebnis } from '@tethys/bauzeit';
import { Button, Dialog, Eingabefeld, useToast } from '@tethys/ui-basis';
import type { Bauzeitenplan } from '@tethys/vertrag';
import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { herunterladenBytes } from '../ausgabe/datei';
import { datumAusUhr } from '../ausgabe/logik';
import { dateinameSauber } from '../dateiname';
import { datumDe, datumLesen } from '../lv/kopfdaten';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import type { PlanPdfAntwort } from './pdf-worker';
import { texte } from './texte';

const t = texte.pdf;

/** Dateiname des Plan-PDF: `Bauzeitenplan <Name>.pdf`, bereinigt wie jeder Dateiname der App. */
export const dateinamePlanPdf = (name: string): string =>
  `${dateinameSauber(`Bauzeitenplan ${name}`, 'Bauzeitenplan')}.pdf`;

type Lage = { art: 'bereit' } | { art: 'laeuft' } | { art: 'fehler'; meldung: string };

export function PlanDrucken({
  plan,
  ergebnis,
  projekt,
}: {
  plan: Bauzeitenplan;
  ergebnis: Bauzeitenplanergebnis;
  projekt: string | null;
}): ReactElement {
  const u = useUmgebung();
  const { zeige } = useToast();
  const [offen, setOffen] = useState(false);
  const [datum, setDatum] = useState('');
  const [lage, setLage] = useState<Lage>({ art: 'bereit' });
  const worker = useRef<Worker | null>(null);
  const gelesen = datumLesen(datum);

  const beenden = (): void => {
    worker.current?.terminate();
    worker.current = null;
  };
  // Schließt der Nutzer die Seite, läuft kein Worker weiter.
  useEffect(() => beenden, []);

  const schliessen = (): void => {
    beenden();
    setLage({ art: 'bereit' });
    setOffen(false);
  };

  const erzeugen = (): void => {
    if (!gelesen.ok) return;
    beenden();
    setLage({ art: 'laeuft' });
    const w = new Worker(new URL('./pdf-worker.ts', import.meta.url), { type: 'module' });
    worker.current = w;
    const name = dateinamePlanPdf(plan.name);
    w.onmessage = (e: MessageEvent<PlanPdfAntwort>) => {
      if (worker.current !== w) return;
      beenden();
      if (e.data.art === 'fertig') {
        herunterladenBytes(name, e.data.bytes, 'application/pdf');
        zeige({ titel: t.fertig, beschreibung: name, art: 'erfolg' });
        setLage({ art: 'bereit' });
        setOffen(false);
      } else setLage({ art: 'fehler', meldung: e.data.meldung });
    };
    w.onerror = (e) => {
      if (worker.current !== w) return;
      beenden();
      setLage({ art: 'fehler', meldung: e.message || t.fehler });
    };
    const auftrag: BauzeitenplanEingabe = {
      plan,
      ergebnis,
      datum: gelesen.wert,
      ...(projekt === null ? {} : { projekt }),
    };
    w.postMessage(auftrag);
  };

  const laeuft = lage.art === 'laeuft';
  return (
    <>
      <Button
        onClick={() => {
          setDatum(datumDe(datumAusUhr(u.uhr())));
          setLage({ art: 'bereit' });
          setOffen(true);
        }}
      >
        {t.knopf}
      </Button>
      <Dialog
        offen={offen}
        onOffenChange={(o) => {
          if (!o) schliessen();
        }}
        titel={t.titel}
        fuss={
          <>
            <Button onClick={schliessen}>{laeuft ? t.abbrechen : t.schliessen}</Button>
            <Button variante="primaer" disabled={laeuft || !gelesen.ok} onClick={erzeugen}>
              {t.erzeugen}
            </Button>
          </>
        }
      >
        <Eingabefeld
          label={t.datum}
          value={datum}
          disabled={laeuft}
          onWertChange={setDatum}
          {...(gelesen.ok ? {} : { meldung: t.datumFehler })}
        />
        <p>
          {t.dateiname}: <code data-testid="pdf-dateiname">{dateinamePlanPdf(plan.name)}</code>
        </p>
        {laeuft ? (
          <p role="status" aria-busy="true">
            {t.laeuft}
          </p>
        ) : null}
        {lage.art === 'fehler' ? (
          <p role="alert">
            <strong>{t.fehler}</strong> {lage.meldung}
          </p>
        ) : null}
      </Dialog>
    </>
  );
}
