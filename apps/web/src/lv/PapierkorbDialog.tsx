// SPDX-License-Identifier: AGPL-3.0-or-later
// Papierkorb des LV (Ticket 48, Punkt 3; D-12): Einträge nach `nummer` mit OZ, Kurztext und Zahl der Positionen.
// Wiederherstellen legt die Knoten an die alte Stelle zurück (`ort: null`). Endgültig entfernen und Leeren nur nach
// ausdrücklicher Bestätigung (Q5); in der Sitzung holt „Rückgängig“ beides zurück.

import { Button, Dialog } from '@tethys/ui-basis';
import type { Knoten, LvBefehl, Papierkorbeintrag } from '@tethys/vertrag';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { texte } from '../historie/texte';
import { ozText } from './oztext';

const t = texte.papierkorb;

/** Was ein Eintrag in der Liste zeigt: OZ und Kurztext des ersten obersten Knotens, Zahl der Positionen. */
export function eintragZeile(e: Papierkorbeintrag): { oz: string; kurztext: string; positionen: number } {
  const ids = new Set<string>(e.knoten.map((k) => k.id));
  const wurzel: Knoten | undefined = e.knoten.find((k) => !ids.has(k.elternId));
  const oz = wurzel === undefined ? '' : ozText(wurzel);
  const kurztext = wurzel === undefined || wurzel.art === 'hinweis' ? '' : wurzel.kurztext;
  const wurzeln = e.knoten.filter((k) => !ids.has(k.elternId)).length;
  return {
    oz,
    kurztext: wurzeln > 1 ? `${kurztext} (+${String(wurzeln - 1)})` : kurztext,
    positionen: e.knoten.filter((k) => k.art === 'position').length,
  };
}

type Frage = { readonly art: 'eintrag'; readonly eintrag: Papierkorbeintrag } | { readonly art: 'leeren' };

export function PapierkorbDialog(props: {
  offen: boolean;
  onSchliessen: () => void;
  papierkorb: readonly Papierkorbeintrag[];
  /** Sendet den Befehl; `true`, wenn er geschrieben wurde (Meldungen zeigt der Aufrufer). */
  senden: (b: LvBefehl) => Promise<boolean>;
}): ReactElement {
  const { offen, onSchliessen, papierkorb, senden } = props;
  const [frage, setFrage] = useState<Frage | null>(null);
  const eintraege = [...papierkorb].sort((a, b) => a.nummer - b.nummer);

  const schliessen = (): void => {
    setFrage(null);
    onSchliessen();
  };

  const bestaetigen = async (): Promise<void> => {
    if (frage === null) return;
    const b: LvBefehl =
      frage.art === 'leeren'
        ? { art: 'PapierkorbLeeren' }
        : { art: 'PapierkorbeintragEntfernen', eintragId: frage.eintrag.id };
    setFrage(null);
    await senden(b);
  };

  const fragetext =
    frage === null
      ? ''
      : frage.art === 'leeren'
        ? t.leerenFrage(eintraege.length)
        : t.entfernenFrage(`„${eintragZeile(frage.eintrag).kurztext || eintragZeile(frage.eintrag).oz}“`);

  return (
    <Dialog
      offen={offen}
      onOffenChange={(o) => {
        if (!o) schliessen();
      }}
      titel={t.titel}
      fuss={
        frage === null ? (
          <>
            <Button
              variante="gefahr"
              disabled={eintraege.length === 0}
              onClick={() => {
                setFrage({ art: 'leeren' });
              }}
            >
              {t.leeren}
            </Button>
            <Button onClick={schliessen}>{t.schliessen}</Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => {
                setFrage(null);
              }}
            >
              {t.abbrechen}
            </Button>
            <Button variante="gefahr" onClick={() => void bestaetigen()}>
              {t.bestaetigen}
            </Button>
          </>
        )
      }
    >
      {frage !== null ? (
        <p role="alert">{fragetext}</p>
      ) : eintraege.length === 0 ? (
        <p>{t.leer}</p>
      ) : (
        <table className="lv-papierkorb" aria-label={t.liste}>
          <thead>
            <tr>
              <th scope="col">{t.ordnungszahl}</th>
              <th scope="col">{t.kurztext}</th>
              <th scope="col">{t.positionen}</th>
              <th scope="col" aria-label={t.aktionen} />
            </tr>
          </thead>
          <tbody>
            {eintraege.map((e) => {
              const z = eintragZeile(e);
              return (
                <tr key={e.id}>
                  <td>{z.oz}</td>
                  <td>{z.kurztext}</td>
                  <td className="lv-papierkorb__zahl">{z.positionen}</td>
                  <td className="lv-papierkorb__aktionen">
                    <Button
                      groesse="sm"
                      aria-label={`${t.wiederherstellen}: ${z.kurztext}`}
                      onClick={() =>
                        void senden({ art: 'PapierkorbeintragWiederherstellen', eintragId: e.id, ort: null })
                      }
                    >
                      {t.wiederherstellen}
                    </Button>
                    <Button
                      groesse="sm"
                      variante="gefahr"
                      aria-label={`${t.entfernen}: ${z.kurztext}`}
                      onClick={() => {
                        setFrage({ art: 'eintrag', eintrag: e });
                      }}
                    >
                      {t.entfernen}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Dialog>
  );
}
