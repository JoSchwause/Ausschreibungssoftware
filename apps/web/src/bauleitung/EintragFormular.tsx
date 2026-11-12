// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 120: das Formular „Neuer Bautagebucheintrag“ bzw. „Eintrag bearbeiten“ (ein Dialog). Arbeitskräfte je Firma; die
// Firmen schlägt die Seite aus den Auftragnehmern der Auftrags-LVs vor (Datalist und Schaltflächen). Prüfung und Eintrag
// stehen in `bautagebuch.ts`. Ein Feldfehler sperrt nie die Eingabe (U5), er verhindert nur den Befehl.

import { Button, Dialog, Eingabefeld } from '@tethys/ui-basis';
import { useId, useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import type { EintragEntwurf, Feldfehler } from './bautagebuch';
import { texte } from './texte';

export function EintragFormular({
  titel,
  start,
  vorschlaege,
  onSenden,
  onSchliessen,
}: {
  titel: string;
  start: EintragEntwurf;
  /** Namen der Auftragnehmer, aus denen die Firmen vorgeschlagen werden. */
  vorschlaege: readonly string[];
  /** Gibt die Feldfehler zurück; `null`: gespeichert, der Dialog schließt. */
  onSenden: (e: EintragEntwurf) => Promise<Feldfehler | null>;
  onSchliessen: () => void;
}): ReactElement {
  const formId = useId();
  const listeId = useId();
  const [e, setE] = useState(start);
  const [fehler, setFehler] = useState<Feldfehler>({});
  const t = texte.eintrag;
  const text = (name: Exclude<keyof EintragEntwurf, 'arbeitskraefte'>) => ({
    value: e[name],
    onWertChange: (w: string): void => {
      setE((alt) => ({ ...alt, [name]: w }));
    },
    ...(fehler[name] === undefined ? {} : { meldung: fehler[name] }),
  });
  const zeile = (i: number, teil: Partial<{ firma: string; anzahl: string }>): void => {
    setE((alt) => ({
      ...alt,
      arbeitskraefte: alt.arbeitskraefte.map((z, j) => (j === i ? { ...z, ...teil } : z)),
    }));
  };
  const nochNichtDa = vorschlaege.filter((v) => !e.arbeitskraefte.some((z) => z.firma.trim() === v));
  const senden = async (ev: SyntheticEvent): Promise<void> => {
    ev.preventDefault();
    setFehler((await onSenden(e)) ?? {});
  };
  return (
    <Dialog
      offen
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={titel}
      fuss={
        <>
          <Button onClick={onSchliessen}>{t.abbrechen}</Button>
          <Button type="submit" form={formId} variante="primaer">
            {t.speichern}
          </Button>
        </>
      }
    >
      <form id={formId} className="bauleitung__formular" onSubmit={(ev) => void senden(ev)}>
        <Eingabefeld label={t.datum} {...text('datum')} />
        <Eingabefeld label={t.wetterBeschreibung} {...text('wetter')} />
        <Eingabefeld label={t.temperaturMin} {...text('temperaturMin')} />
        <Eingabefeld label={t.temperaturMax} {...text('temperaturMax')} />

        <fieldset className="bauleitung__breit">
          <legend>{t.arbeitskraefte}</legend>
          <datalist id={listeId}>
            {vorschlaege.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <div className="bauleitung__firmen">
            {e.arbeitskraefte.map((z, i) => (
              // Die Zeilen haben keine Kennung; ihre Reihenfolge ist ihre Identität.
              <div key={i} className="bauleitung__firmenzeile">
                <Eingabefeld
                  label={t.firma(i + 1)}
                  list={listeId}
                  value={z.firma}
                  onWertChange={(w) => {
                    zeile(i, { firma: w });
                  }}
                  {...(fehler[`firma-${String(i)}`] === undefined
                    ? {}
                    : { meldung: fehler[`firma-${String(i)}`] })}
                />
                <Eingabefeld
                  label={t.anzahl(i + 1)}
                  value={z.anzahl}
                  onWertChange={(w) => {
                    zeile(i, { anzahl: w });
                  }}
                  {...(fehler[`anzahl-${String(i)}`] === undefined
                    ? {}
                    : { meldung: fehler[`anzahl-${String(i)}`] })}
                />
                <Button
                  aria-label={t.firmaWeg(i + 1)}
                  variante="schlicht"
                  onClick={() => {
                    setE((alt) => ({ ...alt, arbeitskraefte: alt.arbeitskraefte.filter((_, j) => j !== i) }));
                  }}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
          <div className="lv__werkzeuge">
            <Button
              onClick={() => {
                setE((alt) => ({
                  ...alt,
                  arbeitskraefte: [...alt.arbeitskraefte, { firma: '', anzahl: '' }],
                }));
              }}
            >
              {t.firmaHinzu}
            </Button>
            {nochNichtDa.map((v) => (
              <Button
                key={v}
                variante="schlicht"
                aria-label={`${t.firmenVorschlag}: ${v}`}
                onClick={() => {
                  setE((alt) => ({
                    ...alt,
                    arbeitskraefte: [
                      ...alt.arbeitskraefte.filter((z) => z.firma.trim() !== '' || z.anzahl.trim() !== ''),
                      { firma: v, anzahl: '' },
                    ],
                  }));
                }}
              >
                + {v}
              </Button>
            ))}
          </div>
        </fieldset>

        <div className="bauleitung__breit">
          <Eingabefeld label={t.geraete} {...text('geraete')} />
        </div>
        <div className="bauleitung__breit">
          <Eingabefeld label={t.leistungen} {...text('leistungen')} />
        </div>
        <div className="bauleitung__breit">
          <Eingabefeld label={t.behinderungen} {...text('behinderungen')} />
        </div>
        <div className="bauleitung__breit">
          <Eingabefeld label={t.vorkommnisse} {...text('vorkommnisse')} />
        </div>
      </form>
    </Dialog>
  );
}
