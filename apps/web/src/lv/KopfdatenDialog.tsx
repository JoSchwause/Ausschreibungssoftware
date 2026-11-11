// SPDX-License-Identifier: AGPL-3.0-or-later
// Dialog „LV-Angaben“ (D-07, Ticket 47): Auftraggeber und Vergabeinformationen. Übernehmen schickt je geänderten Teil
// genau einen Befehl; Abbrechen verwirft. Ungültiges Datum oder ungültige Uhrzeit bleiben am Feld markiert, der andere
// Teil wird trotzdem übernommen (U5).

import { Button, Dialog, Eingabefeld } from '@tethys/ui-basis';
import type { Leistungsverzeichnis, LvBefehl } from '@tethys/vertrag';
import { useId, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import type { Ausgang } from './befehlsweg';
import {
  AUFTRAGGEBER_FELDER,
  DATUM_FELDER,
  VERGABE_FELDER,
  kopfdatenBefehle,
  kopfdatenEntwurf,
  type KopfdatenEntwurf,
} from './kopfdaten';
import type { Feldfehler } from './positionsentwurf';
import { texte } from './texte';

const t = texte.kopfdaten;

export function KopfdatenDialog(props: {
  lv: Leistungsverzeichnis;
  offen: boolean;
  onSchliessen: () => void;
  /** Die Befehle des Übernehmens, nacheinander und als ein Undo-Schritt (Ticket 48). */
  folge: (befehle: readonly LvBefehl[]) => Promise<Ausgang<unknown>[]>;
  abweisung: (a: Ausgang<unknown>) => void;
}): ReactElement {
  const { offen, onSchliessen } = props;
  return (
    <Dialog
      offen={offen}
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={t.titel}
    >
      {offen ? <Inhalt {...props} /> : null}
    </Dialog>
  );
}

function Inhalt(props: {
  lv: Leistungsverzeichnis;
  onSchliessen: () => void;
  /** Die Befehle des Übernehmens, nacheinander und als ein Undo-Schritt (Ticket 48). */
  folge: (befehle: readonly LvBefehl[]) => Promise<Ausgang<unknown>[]>;
  abweisung: (a: Ausgang<unknown>) => void;
}): ReactElement {
  const { lv, onSchliessen, folge, abweisung } = props;
  const formId = useId();
  const [e, setE] = useState<KopfdatenEntwurf>(() => kopfdatenEntwurf(lv));
  const [gesendet, setGesendet] = useState(false);
  const { fehler } = useMemo((): { fehler: Feldfehler } => kopfdatenBefehle(lv, e), [lv, e]);

  const uebernehmen = async (): Promise<void> => {
    const r = kopfdatenBefehle(lv, e);
    let ok = true;
    for (const a of await folge(r.befehle)) {
      if (!a.ok) {
        ok = false;
        abweisung(a);
      }
    }
    setGesendet(true);
    if (ok && Object.keys(r.fehler).length === 0) onSchliessen();
  };

  const meldung = (f: string): { meldung?: string } => {
    const m = fehler[f];
    return m === undefined ? {} : { meldung: m };
  };

  return (
    <form
      id={formId}
      className="lv-dialog lv-dialog--schmal"
      onSubmit={(x) => {
        x.preventDefault();
        void uebernehmen();
      }}
    >
      <fieldset className="lv-dialog__bereich">
        <legend>{t.auftraggeber}</legend>
        <div className="lv-dialog__raster">
          {AUFTRAGGEBER_FELDER.map((f) => (
            <Eingabefeld
              key={f}
              kompakt
              label={`${t.auftraggeber}: ${t.felder[f]}`}
              value={e.auftraggeber[f]}
              onWertChange={(w) => {
                setE((alt) => ({ ...alt, auftraggeber: { ...alt.auftraggeber, [f]: w } }));
              }}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="lv-dialog__bereich">
        <legend>{t.vergabe}</legend>
        <div className="lv-dialog__raster">
          {[...VERGABE_FELDER, 'gewaehrleistungDauer' as const, 'gewaehrleistungEinheit' as const].map(
            (f) => (
              <Eingabefeld
                key={f}
                kompakt
                label={t.felder[f]}
                value={e.vergabe[f]}
                onWertChange={(w) => {
                  setE((alt) => ({ ...alt, vergabe: { ...alt.vergabe, [f]: w } }));
                }}
                {...((DATUM_FELDER as readonly string[]).includes(f)
                  ? { hinweis: t.datumHinweis }
                  : f === 'eroeffnungszeit'
                    ? { hinweis: t.zeitHinweis }
                    : {})}
                {...meldung(f.startsWith('gewaehrleistung') ? 'gewaehrleistung' : f)}
              />
            ),
          )}
        </div>
      </fieldset>
      <p className="lv__meldung" role="status">
        {gesendet && Object.keys(fehler).length > 0 ? texte.dialog.nichtUebernommen : ''}
      </p>
      <footer className="tx-dialog__fuss">
        <Button onClick={onSchliessen}>{texte.dialog.abbrechen}</Button>
        <Button type="submit" variante="primaer">
          {texte.dialog.uebernehmen}
        </Button>
      </footer>
    </form>
  );
}
