// SPDX-License-Identifier: AGPL-3.0-or-later
// Dialog „PDF mit Vorschau“ (Ticket 149, B-22; seit dem Wellen-Review in `ui/`, D-98): Datum (und was der Aufrufer dazugibt),
// „Vorschau erzeugen“ zeigt das PDF im Dialog, „Herunterladen“ speichert genau diese Bytes. Ändert sich eine Eingabe
// (`schluessel`, Datum), gilt die Vorschau nicht mehr. Gedruckt wird im Web Worker (`drucken`, abbrechbar); scheitert der
// Druck, steht ein deutscher Satz mit dem nächsten Schritt im Dialog, nie der technische Text (B-26, E13).

import { Button, Dialog, Eingabefeld, useToast } from '@tethys/ui-basis';
import { useEffect, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { herunterladenBytes } from '../ausgabe/datei';
import { texte as fehlerTexte } from '../fehler/texte';
import { datumDe, datumLesen } from '../lv/kopfdaten';
import type { PdfLauf } from './pdf-lauf';
import { texte } from './texte';
import './pdf-vorschau.css';

const t = texte.pdfVorschau;

type Lage =
  | { readonly art: 'bereit' }
  | { readonly art: 'laeuft' }
  | { readonly art: 'fehler' }
  | { readonly art: 'vorschau'; readonly bytes: Uint8Array; readonly url: string };

export function PdfMitVorschau({
  knopf,
  titel,
  dateiname,
  schluessel,
  heute,
  drucken,
  children,
}: {
  knopf: string;
  titel: string;
  dateiname: string;
  /** Ändert er sich, gilt eine erzeugte Vorschau nicht mehr. */
  schluessel: string;
  /** Vorgabe des Druckdatums beim Öffnen, `JJJJ-MM-TT` (Uhr der App). */
  heute: () => string;
  /** Startet den Druck mit dem gewählten Datum (`JJJJ-MM-TT`). */
  drucken: (datum: string) => PdfLauf;
  children?: ReactNode;
}): ReactElement {
  const { zeige } = useToast();
  const [offen, setOffen] = useState(false);
  const [datum, setDatum] = useState('');
  const [lage, setLage] = useState<Lage>({ art: 'bereit' });
  const lauf = useRef<PdfLauf | null>(null);
  const gelesen = datumLesen(datum);

  const verwerfen = (): void => {
    lauf.current?.abbrechen();
    lauf.current = null;
    setLage((l) => {
      if (l.art === 'vorschau') URL.revokeObjectURL(l.url);
      return { art: 'bereit' };
    });
  };
  // Neue Eingaben: die Vorschau zeigt nicht mehr, was heruntergeladen würde.
  useEffect(verwerfen, [schluessel, datum]);
  useEffect(() => verwerfen, []);

  const schliessen = (): void => {
    verwerfen();
    setOffen(false);
  };

  const erzeugen = async (): Promise<void> => {
    if (!gelesen.ok) return;
    verwerfen();
    setLage({ art: 'laeuft' });
    const neu = drucken(gelesen.wert);
    lauf.current = neu;
    try {
      const bytes = await neu.ergebnis;
      if (lauf.current !== neu) return;
      lauf.current = null;
      if (bytes === null) {
        setLage({ art: 'bereit' });
        return;
      }
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
      setLage({ art: 'vorschau', bytes, url });
    } catch {
      if (lauf.current !== neu) return;
      lauf.current = null;
      setLage({ art: 'fehler' });
    }
  };

  return (
    <>
      <Button
        onClick={() => {
          setDatum(datumDe(heute()));
          setLage({ art: 'bereit' });
          setOffen(true);
        }}
      >
        {knopf}
      </Button>
      <Dialog
        offen={offen}
        onOffenChange={(o) => {
          if (!o) schliessen();
        }}
        titel={titel}
        fuss={
          <>
            <Button onClick={schliessen}>{lage.art === 'laeuft' ? t.abbrechen : t.schliessen}</Button>
            <Button disabled={lage.art === 'laeuft' || !gelesen.ok} onClick={() => void erzeugen()}>
              {t.vorschauErzeugen}
            </Button>
            <Button
              variante="primaer"
              disabled={lage.art !== 'vorschau'}
              onClick={() => {
                if (lage.art !== 'vorschau') return;
                herunterladenBytes(dateiname, lage.bytes, 'application/pdf');
                zeige({ titel: t.gespeichert, beschreibung: dateiname, art: 'erfolg' });
                schliessen();
              }}
            >
              {t.herunterladen}
            </Button>
          </>
        }
      >
        <div className="pdf-vorschau__formular">
          <Eingabefeld
            label={t.datum}
            value={datum}
            onWertChange={setDatum}
            {...(gelesen.ok ? {} : { meldung: t.datumFehler })}
          />
          {children}
        </div>
        <p>
          {t.dateiname}: <code data-testid="pdf-dateiname">{dateiname}</code>
        </p>
        {lage.art === 'laeuft' ? (
          <p role="status" aria-busy="true">
            {t.laeuft}
          </p>
        ) : null}
        {lage.art === 'fehler' ? (
          <p className="pdf-vorschau__fehler" role="alert">
            <strong>{t.fehler}</strong> {fehlerTexte.pdf}
          </p>
        ) : null}
        {lage.art === 'vorschau' ? (
          <iframe className="pdf-vorschau__bild" title={t.vorschau} src={lage.url} />
        ) : null}
      </Dialog>
    </>
  );
}
