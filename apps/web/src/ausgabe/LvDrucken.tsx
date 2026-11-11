// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 66 (O1, O2): „Als PDF“ und „Excel für Bieter“ auf der LV-Seite. Das PDF entsteht in einem Web Worker
// (abbrechbar, der Hauptthread bleibt bedienbar); `ausgabe` wird nachgeladen. Das Datum kommt von der Uhr der App.
// Befunde sperren nie (U5), nichts wird still verworfen (Q5): Befunde des Excel-Exports stehen vor dem Download da.

import type { ExcelDatei } from '@tethys/ausgabe';
import { Auswahl, Button, Dialog, Eingabefeld, useToast } from '@tethys/ui-basis';
import type { LvZustand, Projekt } from '@tethys/vertrag';
import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { herunterladenBytes } from './datei';
import { ExcelBefunde } from './ExcelBefunde';
import { datumDe, datumLesen } from '../lv/kopfdaten';
import { dateinameExcel, dateinamePdf, datumAusUhr } from './logik';
import { pdfErzeugen, type PdfLauf, type PdfSchritt } from './pdf-lauf';
import { texte } from './texte';
import '../gaeb/gaeb.css';

type PdfLage =
  | { readonly art: 'bereit' }
  | { readonly art: 'laeuft'; readonly schritt: PdfSchritt | null }
  | { readonly art: 'fehler'; readonly meldung: string };

function useProjekt(
  projektId: LvZustand['leistungsverzeichnis']['projektId'],
  aktiv: boolean,
): Projekt | null {
  const u = useUmgebung();
  const [projekt, setProjekt] = useState<Projekt | null>(null);
  useEffect(() => {
    if (!aktiv) return;
    let lebt = true;
    void u.speicher.projekte.laden(projektId).then((p) => {
      if (lebt && p.ok) setProjekt(p.wert);
    });
    return () => {
      lebt = false;
    };
  }, [u, projektId, aktiv]);
  return projekt;
}

export function LvDrucken({ zustand }: { zustand: LvZustand }): ReactElement {
  return (
    <>
      <PdfAusgabe zustand={zustand} />
      <ExcelAusgabe zustand={zustand} />
    </>
  );
}

function PdfAusgabe({ zustand }: { zustand: LvZustand }): ReactElement {
  const u = useUmgebung();
  const { zeige } = useToast();
  const lv = zustand.leistungsverzeichnis;
  const [offen, setOffen] = useState(false);
  const [mitPreisen, setMitPreisen] = useState(true);
  const [datum, setDatum] = useState('');
  const [lage, setLage] = useState<PdfLage>({ art: 'bereit' });
  const lauf = useRef<PdfLauf | null>(null);
  const projekt = useProjekt(lv.projektId, offen);
  const gelesen = datumLesen(datum);
  const iso = gelesen.ok ? gelesen.wert : null;
  const gueltig = iso !== null;

  // Schließt der Nutzer den Dialog oder die Seite, läuft kein Worker weiter.
  useEffect(
    () => () => {
      lauf.current?.abbrechen();
    },
    [],
  );

  const oeffnen = (): void => {
    setDatum(datumDe(datumAusUhr(u.uhr()))); // „heute“ liest nur die App
    setLage({ art: 'bereit' });
    setOffen(true);
  };

  const schliessen = (): void => {
    lauf.current?.abbrechen();
    lauf.current = null;
    setOffen(false);
  };

  const erzeugen = async (): Promise<void> => {
    if (iso === null) return;
    setLage({ art: 'laeuft', schritt: null });
    const neu = pdfErzeugen(
      zustand,
      {
        mitPreisen,
        datum: iso,
        ...(projekt === null ? {} : { projekt: { name: projekt.name, bauherr: projekt.bauherr } }),
      },
      (schritt) => {
        setLage({ art: 'laeuft', schritt });
      },
    );
    lauf.current = neu;
    try {
      const bytes = await neu.ergebnis;
      if (lauf.current !== neu) return; // geschlossen oder neu gestartet
      lauf.current = null;
      if (bytes === null) {
        setLage({ art: 'bereit' });
        return;
      }
      const name = dateinamePdf(lv.name);
      herunterladenBytes(name, bytes, 'application/pdf');
      zeige({ titel: texte.pdf.fertig, beschreibung: name, art: 'erfolg' });
      setOffen(false);
      setLage({ art: 'bereit' });
    } catch (e) {
      if (lauf.current !== neu) return;
      lauf.current = null;
      setLage({ art: 'fehler', meldung: e instanceof Error ? e.message : String(e) });
    }
  };

  const laeuft = lage.art === 'laeuft';
  return (
    <>
      <Button onClick={oeffnen}>{texte.pdf.knopf}</Button>
      <Dialog
        offen={offen}
        onOffenChange={(o) => {
          if (!o) schliessen();
        }}
        titel={texte.pdf.titel}
        fuss={
          <>
            <Button onClick={schliessen}>{laeuft ? texte.pdf.abbrechen : texte.pdf.schliessen}</Button>
            <Button variante="primaer" disabled={laeuft || !gueltig} onClick={() => void erzeugen()}>
              {texte.pdf.erzeugen}
            </Button>
          </>
        }
      >
        <div className="gaeb__auswahl">
          <Auswahl
            label={texte.pdf.preise}
            optionen={[
              { wert: 'mit', label: texte.pdf.mitPreisen },
              { wert: 'ohne', label: texte.pdf.ohnePreisen },
            ]}
            wert={mitPreisen ? 'mit' : 'ohne'}
            onWertChange={(w) => {
              setMitPreisen(w === 'mit');
            }}
          />
          <Eingabefeld
            label={texte.pdf.datum}
            value={datum}
            disabled={laeuft}
            onWertChange={setDatum}
            {...(gueltig ? {} : { meldung: texte.pdf.datumFehler })}
          />
        </div>
        <p>
          {texte.pdf.dateiname}: <code data-testid="pdf-dateiname">{dateinamePdf(lv.name)}</code>
        </p>
        {lage.art === 'laeuft' ? (
          <p role="status" aria-busy="true" data-testid="pdf-fortschritt">
            {lage.schritt === null ? texte.pdf.schritt.schriften : texte.pdf.schritt[lage.schritt]}
          </p>
        ) : null}
        {lage.art === 'fehler' ? (
          <p className="gaeb__entwurf" role="alert">
            <strong>{texte.pdf.fehler}</strong> {lage.meldung}
          </p>
        ) : null}
      </Dialog>
    </>
  );
}

function ExcelAusgabe({ zustand }: { zustand: LvZustand }): ReactElement {
  const u = useUmgebung();
  const { zeige } = useToast();
  const lv = zustand.leistungsverzeichnis;
  const [offen, setOffen] = useState(false);
  const [datei, setDatei] = useState<ExcelDatei | null>(null);

  // Das Blankett entsteht beim Öffnen, damit die Befunde vor dem Download zu sehen sind.
  useEffect(() => {
    if (!offen) return;
    let lebt = true;
    void import('@tethys/ausgabe').then(({ lvAlsExcel }) => {
      if (lebt) setDatei(lvAlsExcel(zustand, { mitPreisen: false, datum: datumAusUhr(u.uhr()) }));
    });
    return () => {
      lebt = false;
    };
  }, [offen, zustand, u]);

  const name = dateinameExcel(lv.name);
  return (
    <>
      <Button
        onClick={() => {
          setDatei(null);
          setOffen(true);
        }}
      >
        {texte.excel.knopf}
      </Button>
      <Dialog
        offen={offen}
        onOffenChange={setOffen}
        titel={texte.excel.titel}
        beschreibung={texte.excel.beschreibung}
        fuss={
          <>
            <Button
              onClick={() => {
                setOffen(false);
              }}
            >
              {texte.excel.schliessen}
            </Button>
            <Button
              variante="primaer"
              disabled={datei === null}
              onClick={() => {
                if (datei === null) return;
                herunterladenBytes(
                  name,
                  datei.bytes,
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                );
                zeige({ titel: texte.excel.erzeugt, beschreibung: name, art: 'erfolg' });
              }}
            >
              {texte.excel.herunterladen}
            </Button>
          </>
        }
      >
        <p>
          {texte.excel.dateiname}: <code data-testid="excel-dateiname">{name}</code>
        </p>
        {datei === null ? (
          <p aria-busy="true">…</p>
        ) : (
          <>
            {datei.befunde.length > 0 ? (
              <p role="alert">{texte.excel.befundeHinweis(datei.befunde.length)}</p>
            ) : null}
            <ExcelBefunde befunde={datei.befunde} />
          </>
        )}
      </Dialog>
    </>
  );
}
