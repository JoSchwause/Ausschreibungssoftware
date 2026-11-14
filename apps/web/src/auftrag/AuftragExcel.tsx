// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 151 (B-17): „Excel“ im Menü „Ausgabe“ des Auftrags-LV, über die vorhandene LV-Excel-Ausgabe mit den Preisen des
// Auftrags-LV (`auftragExcel`). Die Datei entsteht beim Öffnen, damit Befunde vor dem Download zu sehen sind; sie sperren nie
// (U5), nichts wird still verworfen (Q5). Das Datum kommt von der Uhr der App (A2).

import type { ExcelDatei } from '@tethys/ausgabe';
import { Button, Dialog, useToast } from '@tethys/ui-basis';
import type { AuftragsLvZustand } from '@tethys/vertrag';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { herunterladenBytes } from '../ausgabe/datei';
import { ExcelBefunde } from '../ausgabe/ExcelBefunde';
import { datumAusUhr } from '../ausgabe/logik';
import { texte as atexte } from '../ausgabe/texte';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { auftragExcel } from './ausgabe';
import { texte } from './texte';

const t = texte.excel;

export function AuftragExcel({ auftrag }: { auftrag: AuftragsLvZustand }): ReactElement {
  const u = useUmgebung();
  const { zeige } = useToast();
  const [offen, setOffen] = useState(false);
  const [ergebnis, setErgebnis] = useState<{ dateiname: string; datei: ExcelDatei } | null>(null);

  useEffect(() => {
    if (!offen) return;
    let lebt = true;
    void auftragExcel(auftrag, datumAusUhr(u.uhr())).then((r) => {
      if (lebt) setErgebnis(r);
    });
    return () => {
      lebt = false;
    };
  }, [offen, auftrag, u]);

  return (
    <>
      <Button
        onClick={() => {
          setErgebnis(null);
          setOffen(true);
        }}
      >
        {t.knopf}
      </Button>
      <Dialog
        offen={offen}
        onOffenChange={setOffen}
        titel={t.titel}
        beschreibung={t.beschreibung}
        fuss={
          <>
            <Button
              onClick={() => {
                setOffen(false);
              }}
            >
              {t.schliessen}
            </Button>
            <Button
              variante="primaer"
              disabled={ergebnis === null}
              onClick={() => {
                if (ergebnis === null) return;
                herunterladenBytes(
                  ergebnis.dateiname,
                  ergebnis.datei.bytes,
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                );
                zeige({ titel: t.erzeugt, beschreibung: ergebnis.dateiname, art: 'erfolg' });
              }}
            >
              {t.herunterladen}
            </Button>
          </>
        }
      >
        {ergebnis === null ? (
          <p aria-busy="true">…</p>
        ) : (
          <>
            <p>
              {t.dateiname}: <code data-testid="excel-dateiname">{ergebnis.dateiname}</code>
            </p>
            {ergebnis.datei.befunde.length > 0 ? (
              <p role="alert">{atexte.excel.befundeHinweis(ergebnis.datei.befunde.length)}</p>
            ) : null}
            <ExcelBefunde befunde={ergebnis.datei.befunde} />
          </>
        )}
      </Dialog>
    </>
  );
}
