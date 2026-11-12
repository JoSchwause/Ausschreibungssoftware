// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 120: das Formular „Neuer Mangel“ bzw. „Mangel bearbeiten“ (ein Dialog) und der Dialog einer Statusaktion. Beide
// lesen nur Text; Prüfung und Befehle stehen in `maengel.ts`. Ein Feldfehler sperrt nie die Eingabe (U5), er verhindert nur
// den Befehl; Enter im Feld übernimmt.

import { Auswahl, Button, Dialog, Eingabefeld } from '@tethys/ui-basis';
import type { Mangel } from '@tethys/vertrag';
import { useId, useState } from 'react';
import type { ReactElement, SyntheticEvent } from 'react';
import { datumDe } from '../lv/kopfdaten';
import type { Feldfehler, MangelEntwurf, Statusaktion, StatusEntwurf, Statusfehler } from './maengel';
import { texte } from './texte';

const KEINE = '-';

export interface Auswahlwert {
  readonly wert: string;
  readonly label: string;
}

export function MangelFormular({
  titel,
  start,
  auftraege,
  modelle,
  nummerFest,
  onSenden,
  onSchliessen,
}: {
  titel: string;
  start: MangelEntwurf;
  auftraege: readonly Auswahlwert[];
  modelle: readonly Auswahlwert[];
  /** Nach dem Anlegen bleibt die Nummer fest (D-57). */
  nummerFest: boolean;
  /** Gibt die Feldfehler zurück; `null`: gespeichert, der Dialog schließt. */
  onSenden: (e: MangelEntwurf) => Promise<Feldfehler | null>;
  onSchliessen: () => void;
}): ReactElement {
  const formId = useId();
  const [e, setE] = useState(start);
  const [fehler, setFehler] = useState<Feldfehler>({});
  const feld = (name: keyof MangelEntwurf) => ({
    value: e[name],
    onWertChange: (w: string): void => {
      setE((alt) => ({ ...alt, [name]: w }));
    },
    ...(fehler[name] === undefined ? {} : { meldung: fehler[name] }),
  });
  const senden = async (ev: SyntheticEvent): Promise<void> => {
    ev.preventDefault();
    setFehler((await onSenden(e)) ?? {});
  };
  const f = texte.formular;
  return (
    <Dialog
      offen
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={titel}
      fuss={
        <>
          <Button onClick={onSchliessen}>{f.abbrechen}</Button>
          <Button type="submit" form={formId} variante="primaer">
            {f.speichern}
          </Button>
        </>
      }
    >
      <form id={formId} className="bauleitung__formular" onSubmit={(ev) => void senden(ev)}>
        <Eingabefeld label={f.nummer} disabled={nummerFest} {...feld('nummer')} />
        <Eingabefeld label={f.festgestellt} {...feld('festgestellt')} />
        <div className="bauleitung__breit">
          <Eingabefeld label={f.titel} {...feld('titel')} />
        </div>
        <div className="bauleitung__breit">
          <Eingabefeld label={f.beschreibung} {...feld('beschreibung')} />
        </div>
        <Eingabefeld label={f.ort} {...feld('ort')} />
        <Eingabefeld label={f.frist} {...feld('frist')} />
        <Auswahl
          label={f.auftrag}
          wert={e.auftragsLvId === '' ? KEINE : e.auftragsLvId}
          onWertChange={(w) => {
            setE((alt) => ({ ...alt, auftragsLvId: w === KEINE ? '' : w, position: '' }));
          }}
          optionen={[{ wert: KEINE, label: f.keinAuftrag }, ...auftraege]}
        />
        <Eingabefeld label={f.position} disabled={e.auftragsLvId === ''} {...feld('position')} />
        <Auswahl
          label={f.modell}
          wert={e.modellId === '' ? KEINE : e.modellId}
          onWertChange={(w) => {
            setE((alt) => ({ ...alt, modellId: w === KEINE ? '' : w }));
          }}
          optionen={[{ wert: KEINE, label: f.jedesModell }, ...modelle]}
        />
        <Eingabefeld label={f.bauteil} {...feld('globalId')} />
      </form>
    </Dialog>
  );
}

export function StatusDialog({
  aktion,
  mangel,
  start,
  onSenden,
  onSchliessen,
}: {
  aktion: Statusaktion;
  mangel: Mangel;
  start: StatusEntwurf;
  /** Gibt die Feldfehler zurück; `null`: übernommen, der Dialog schließt. */
  onSenden: (e: StatusEntwurf) => Promise<Statusfehler | null>;
  onSchliessen: () => void;
}): ReactElement {
  const formId = useId();
  const [e, setE] = useState(start);
  const [fehler, setFehler] = useState<Statusfehler>({});
  const a = texte.aktion;
  const feld = (name: keyof StatusEntwurf) => ({
    value: e[name],
    onWertChange: (w: string): void => {
      setE((alt) => ({ ...alt, [name]: w }));
    },
    ...(fehler[name] === undefined ? {} : { meldung: fehler[name] }),
  });
  return (
    <Dialog
      offen
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={a.titel[aktion]}
      beschreibung={`Mangel ${String(mangel.nummer)} – ${mangel.titel}`}
      fuss={
        <>
          <Button onClick={onSchliessen}>{a.abbrechen}</Button>
          <Button type="submit" form={formId} variante="primaer">
            {a.uebernehmen}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="bauleitung__formular"
        onSubmit={(ev) => {
          ev.preventDefault();
          void onSenden(e).then((f) => {
            setFehler(f ?? {});
          });
        }}
      >
        <Eingabefeld label={a.datum} {...feld('datum')} />
        {aktion === 'anzeigen' ? <Eingabefeld label={a.frist} {...feld('frist')} /> : <span />}
        <div className="bauleitung__breit">
          <Eingabefeld label={a.bemerkung} {...feld('bemerkung')} />
        </div>
      </form>
    </Dialog>
  );
}

/** Vorbelegung der Statusaktion: heute, bei „anzeigen“ die bisherige Frist. */
export function statusStart(mangel: Mangel, aktion: Statusaktion, heute: string): StatusEntwurf {
  return {
    datum: datumDe(heute),
    frist: aktion === 'anzeigen' && mangel.frist !== null ? datumDe(mangel.frist) : '',
    bemerkung: '',
  };
}
