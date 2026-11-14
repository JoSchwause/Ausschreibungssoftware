// SPDX-License-Identifier: AGPL-3.0-or-later
// „Ausgabe“ der Kostenseiten (Ticket 154, E12): „Als PDF“ und „Als Excel“ öffnen denselben Dialog mit der Vorschau des
// Berichts; heruntergeladen wird erst auf Wunsch. Die gewählte Art ist die Hauptschaltfläche. Das Projekt lädt der Dialog
// beim Öffnen, das Büro (Absender, D-141) kommt aus den Einstellungen (Ticket 150), das Datum von der Uhr der App (A2); den
// Bericht baut die Seite aus ihrem Stand (`bericht`). Das PDF entsteht im Worker (`druck.ts`); Fehler erscheinen als Satz mit
// dem nächsten Schritt, nie als technischer Text. Steht in einer `Werkzeuggruppe`: Die Schaltflächen werden dort zu Menüpunkten.

import type { Berichtsmodell } from '@tethys/ausgabe';
import { Button, Dialog, useToast } from '@tethys/ui-basis';
import type { ProjektId } from '@tethys/vertrag';
import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { herunterladenBytes } from '../ausgabe/datei';
import { datumAusUhr } from '../ausgabe/logik';
import { texte as fehlerTexte } from '../fehler/texte';
import { useEinstellungen } from '../historie/EinstellungenAnbieter';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { BerichtVorschau } from './BerichtVorschau';
import type { Berichtskopf, Endung } from './berichte';
import { berichtExcel, berichtModell, berichtPdf, type Kostenbericht } from './druck';
import { texte } from './texte';

const t = texte.ausgabe;
const TYP: Record<Endung, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

type Lage =
  | { readonly art: 'zu' }
  | { readonly art: 'laedt' }
  | { readonly art: 'da'; readonly bericht: Kostenbericht; readonly modell: Berichtsmodell }
  | { readonly art: 'fehler' };

export function KostenAusgabe({
  projektId,
  titel,
  dateiname,
  bezeichnungen,
  bericht,
}: {
  projektId: ProjektId;
  titel: string;
  dateiname: (endung: Endung) => string;
  /** Die Bezeichnungen der Kostengruppen, wie die Seite sie zeigt. */
  bezeichnungen: ReadonlyMap<string, string>;
  /** Baut den Bericht aus dem Stand der Seite und dem Kopf. */
  bericht: (kopf: Berichtskopf) => Kostenbericht;
}): ReactElement {
  const u = useUmgebung();
  const { zeige } = useToast();
  const buero = useEinstellungen().zustand.buero;
  const [lage, setLage] = useState<Lage>({ art: 'zu' });
  const [haupt, setHaupt] = useState<Endung>('pdf');
  const [laeuft, setLaeuft] = useState(false);
  const lauf = useRef(0);

  const oeffnen = (endung: Endung): void => {
    setHaupt(endung);
    setLage({ art: 'laedt' });
    const nr = ++lauf.current;
    void (async (): Promise<Lage> => {
      try {
        const p = await u.speicher.projekte.laden(projektId);
        const b = bericht({
          projekt: p.ok ? p.wert : null,
          buero,
          datum: datumAusUhr(u.uhr()),
          bezeichnungen,
        });
        return { art: 'da', bericht: b, modell: await berichtModell(b) };
      } catch {
        // Wellen-Review SB1/PB3 (B-26): ein Satz mit dem nächsten Schritt, nie der technische Text.
        return { art: 'fehler' };
      }
    })().then((l) => {
      if (lauf.current === nr) setLage(l);
    });
  };

  const schliessen = (): void => {
    lauf.current++;
    setLaeuft(false);
    setLage({ art: 'zu' });
  };

  const laden = async (endung: Endung): Promise<void> => {
    if (lage.art !== 'da') return;
    setLaeuft(true);
    try {
      const bytes = endung === 'pdf' ? await berichtPdf(lage.bericht) : await berichtExcel(lage.bericht);
      const name = dateiname(endung);
      herunterladenBytes(name, bytes, TYP[endung]);
      zeige({ titel: t.fertig, beschreibung: name, art: 'erfolg' });
    } catch {
      zeige({ titel: t.fehler, beschreibung: fehlerTexte.pdf, art: 'fehler' });
    } finally {
      setLaeuft(false);
    }
  };

  const bereit = lage.art === 'da' && !laeuft;
  const knopf = (endung: Endung): ReactElement => (
    <Button
      variante={endung === haupt ? 'primaer' : 'sekundaer'}
      disabled={!bereit}
      onClick={() => void laden(endung)}
    >
      {endung === 'pdf' ? t.pdfLaden : t.excelLaden}
    </Button>
  );

  return (
    <>
      <Button
        onClick={() => {
          oeffnen('pdf');
        }}
      >
        {t.pdf}
      </Button>
      <Button
        onClick={() => {
          oeffnen('xlsx');
        }}
      >
        {t.excel}
      </Button>
      <Dialog
        offen={lage.art !== 'zu'}
        onOffenChange={(o) => {
          if (!o) schliessen();
        }}
        titel={titel}
        beschreibung={t.beschreibung}
        fuss={
          <>
            <Button onClick={schliessen}>{t.schliessen}</Button>
            {haupt === 'pdf' ? (
              <>
                {knopf('xlsx')}
                {knopf('pdf')}
              </>
            ) : (
              <>
                {knopf('pdf')}
                {knopf('xlsx')}
              </>
            )}
          </>
        }
      >
        <p>
          {t.dateien}: <code data-testid="kosten-datei-pdf">{dateiname('pdf')}</code>,{' '}
          <code data-testid="kosten-datei-xlsx">{dateiname('xlsx')}</code>
        </p>
        {lage.art === 'laedt' ? (
          <p role="status" aria-busy="true">
            {t.laedt}
          </p>
        ) : null}
        {laeuft ? (
          <p role="status" aria-busy="true">
            {t.laeuft}
          </p>
        ) : null}
        {lage.art === 'fehler' ? (
          <p role="alert">
            <strong>{t.fehler}</strong> {t.vorschauFehler}
          </p>
        ) : null}
        {lage.art === 'da' ? <BerichtVorschau modell={lage.modell} /> : null}
      </Dialog>
    </>
  );
}
