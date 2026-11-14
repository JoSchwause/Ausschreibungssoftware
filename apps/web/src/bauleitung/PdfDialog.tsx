// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 120: der gemeinsame Dialog der drei PDFs (Mängelliste, Mängelanzeige, Bautagebuch). Er zeigt, was gedruckt wird
// (Zahl, Dateiname), erzeugt das PDF im Worker (`pdf-lauf.ts`) und lädt es herunter (A1: kein Netz). Datum und Auswahl
// kommen fertig von der Seite (A2).

import { Button, Dialog, useToast } from '@tethys/ui-basis';
import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { herunterladenBytes } from '../ausgabe/datei';
import { bauleitungPdf } from './pdf-lauf';
import type { Druckauftrag } from './pdf-worker';
import { texte as fehlerTexte } from '../fehler/texte';
import { texte } from './texte';

type Lage =
  | { readonly art: 'bereit' }
  | { readonly art: 'laeuft' }
  | { readonly art: 'fehler'; readonly meldung: string };

export function PdfDialog({
  titel,
  dateiname,
  zusammenfassung,
  hinweis,
  auftrag,
  children,
  onSchliessen,
}: {
  titel: string;
  dateiname: string;
  zusammenfassung: string;
  /** Warum nichts zu drucken ist; sperrt „PDF erzeugen“. */
  hinweis: string | null;
  auftrag: Druckauftrag;
  children?: ReactNode;
  onSchliessen: () => void;
}): ReactElement {
  const { zeige } = useToast();
  const [lage, setLage] = useState<Lage>({ art: 'bereit' });
  const t = texte.pdf;
  const laeuft = lage.art === 'laeuft';

  const erzeugen = async (): Promise<void> => {
    setLage({ art: 'laeuft' });
    try {
      const bytes = await bauleitungPdf(auftrag);
      herunterladenBytes(dateiname, bytes, 'application/pdf');
      zeige({ titel: t.fertig, beschreibung: dateiname, art: 'erfolg' });
      onSchliessen();
    } catch {
      // Ticket 155 (D-94): kein Rohtext der Ausnahme, sondern der nächste Schritt (wie der LV-Druck, Ticket 132).
      setLage({ art: 'fehler', meldung: fehlerTexte.pdf });
    }
  };

  return (
    <Dialog
      offen
      onOffenChange={(o) => {
        if (!o && !laeuft) onSchliessen();
      }}
      titel={titel}
      fuss={
        <>
          <Button disabled={laeuft} onClick={onSchliessen}>
            {t.schliessen}
          </Button>
          <Button variante="primaer" disabled={laeuft || hinweis !== null} onClick={() => void erzeugen()}>
            {t.erzeugen}
          </Button>
        </>
      }
    >
      <div className="bauleitung__pdf">
        {children}
        {hinweis === null ? (
          <p data-testid="pdf-anzahl">{zusammenfassung}</p>
        ) : (
          <p role="status">{hinweis}</p>
        )}
        <p>
          {t.dateiname}: <code data-testid="pdf-dateiname">{dateiname}</code>
        </p>
        {lage.art === 'laeuft' ? (
          <p role="status" aria-busy="true" data-testid="pdf-fortschritt">
            {t.laeuft}
          </p>
        ) : null}
        {lage.art === 'fehler' ? (
          <p role="alert">
            <strong>{t.fehler}</strong> {lage.meldung}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
