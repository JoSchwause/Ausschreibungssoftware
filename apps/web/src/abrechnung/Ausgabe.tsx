// SPDX-License-Identifier: AGPL-3.0-or-later
// Ausgaben der Abrechnung (Ticket 152, E11): ein Bericht als PDF mit Vorschau im Dialog (`PdfMitVorschau` aus `vergabe/`,
// D-98: Datum, „Vorschau erzeugen“, „Herunterladen“ genau dieser Bytes; Druck im Worker) und als Excel. Das Projekt lädt der
// Baustein selbst, das Büro kommt aus den Einstellungen (D-95). Steht in einer `Werkzeuggruppe`: Die Schaltflächen werden
// dort zu Menüpunkten, die Dialoge bleiben.

import { Button, Dialog, useToast } from '@tethys/ui-basis';
import type { Buero, Projekt, ProjektId } from '@tethys/vertrag';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { herunterladenBytes } from '../ausgabe/datei';
import { datumAusUhr } from '../ausgabe/logik';
import { useEinstellungen } from '../historie/EinstellungenAnbieter';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { PdfMitVorschau } from '../vergabe/Ausgaben';
import type { Druckauftrag } from '../vergabe/druck-worker';
import type { Druckkopf, Endung } from './berichte';
import { texte } from './texte';

const t = texte.ausgabe;
const EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Das Projekt für die Köpfe; `null`, solange es lädt oder fehlt (der Kopf nennt es dann nicht). */
export function useProjekt(projektId: ProjektId): Projekt | null {
  const u = useUmgebung();
  const [projekt, setProjekt] = useState<Projekt | null>(null);
  useEffect(() => {
    let aktiv = true;
    void u.speicher.projekte.laden(projektId).then((p) => {
      if (aktiv) setProjekt(p.ok ? p.wert : null);
    });
    return () => {
      aktiv = false;
    };
  }, [u, projektId]);
  return projekt;
}

export interface BerichtAusgabeProps {
  readonly projektId: ProjektId;
  /** Name des Berichts in Schaltflächen und Titeln, etwa „Aufmaßblatt“. */
  readonly name: string;
  readonly dateiname: (endung: Endung) => string;
  /** Ändert sich der Schlüssel, gilt eine erzeugte Vorschau nicht mehr. */
  readonly schluessel: string;
  /** Der Druckauftrag aus dem Stand der Seite und dem Kopf. */
  readonly pdf: (kopf: Druckkopf) => Druckauftrag;
  /** Die Excel-Datei aus dem Stand der Seite und dem Kopf (`ausgabe` wird erst hier geladen). */
  readonly excel: (kopf: Druckkopf) => Promise<Uint8Array>;
}

/** „<Name> als PDF …“ (mit Vorschau) und „<Name> als Excel …“. */
export function BerichtAusgabe(p: BerichtAusgabeProps): ReactElement {
  const projekt = useProjekt(p.projektId);
  return (
    <>
      <PdfMitVorschau
        knopf={t.pdfKnopf(p.name)}
        titel={t.pdfTitel(p.name)}
        dateiname={p.dateiname('pdf')}
        schluessel={p.schluessel}
        auftrag={(datum, buero) => p.pdf({ projekt, buero, datum })}
      />
      <ExcelAusgabe {...p} projekt={projekt} />
    </>
  );
}

type Lage =
  | { readonly art: 'zu' }
  | { readonly art: 'laeuft' }
  | { readonly art: 'da'; readonly bytes: Uint8Array }
  | { readonly art: 'fehler'; readonly meldung: string };

function ExcelAusgabe({
  name,
  dateiname,
  excel,
  projekt,
}: BerichtAusgabeProps & { projekt: Projekt | null }): ReactElement {
  const u = useUmgebung();
  const { zeige } = useToast();
  const buero: Buero | null = useEinstellungen().zustand.buero;
  const [lage, setLage] = useState<Lage>({ art: 'zu' });
  const datei = dateiname('xlsx');

  const oeffnen = (): void => {
    setLage({ art: 'laeuft' });
    void excel({ projekt, buero, datum: datumAusUhr(u.uhr()) }).then(
      (bytes) => {
        setLage((l) => (l.art === 'laeuft' ? { art: 'da', bytes } : l));
      },
      (f: unknown) => {
        setLage((l) =>
          l.art === 'laeuft' ? { art: 'fehler', meldung: f instanceof Error ? f.message : String(f) } : l,
        );
      },
    );
  };
  const schliessen = (): void => {
    setLage({ art: 'zu' });
  };

  return (
    <>
      <Button onClick={oeffnen}>{t.excelKnopf(name)}</Button>
      <Dialog
        offen={lage.art !== 'zu'}
        onOffenChange={(o) => {
          if (!o) schliessen();
        }}
        titel={t.excelTitel(name)}
        beschreibung={t.excelHinweis}
        fuss={
          <>
            <Button onClick={schliessen}>{t.schliessen}</Button>
            <Button
              variante="primaer"
              disabled={lage.art !== 'da'}
              onClick={() => {
                if (lage.art !== 'da') return;
                herunterladenBytes(datei, lage.bytes, EXCEL);
                zeige({ titel: t.gespeichert, beschreibung: datei, art: 'erfolg' });
                schliessen();
              }}
            >
              {t.herunterladen}
            </Button>
          </>
        }
      >
        <p>
          {t.dateiname}: <code data-testid="excel-dateiname">{datei}</code>
        </p>
        {lage.art === 'laeuft' ? (
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
