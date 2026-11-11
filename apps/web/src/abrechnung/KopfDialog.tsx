// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 87: Bezeichnung und Datum eines Aufmaßblatts, beim Anlegen (auch aus einer X31, D-83.6) und zum Ändern
// (`AufmasskopfSetzen`). Ein ungültiges Datum bleibt am Feld markiert; abgeschickt wird erst ein gültiges (U5: die
// Eingabe selbst sperrt nichts).

import { Button, Dialog, Eingabefeld } from '@tethys/ui-basis';
import { useRef, useState } from 'react';
import type { ReactElement, ReactNode, RefObject } from 'react';
import { kopfEingabe, kopfEntwurf, type Kopfangaben, type Kopfentwurf } from './kopf';
import { texte } from './texte';

const t = texte.kopf;

export interface KopfDialogProps {
  offen: boolean;
  titel: string;
  beschreibung?: string;
  /** Der Stand beim Öffnen. */
  anfang: Kopfangaben;
  /** Beschriftung der Bestätigung. */
  bestaetigen: string;
  /** Darf bestätigt werden (z. B. nichts zu übernehmen aus einer X31)? */
  moeglich?: boolean;
  /** Was über den Feldern steht (z. B. die Befunde einer X31). */
  children?: ReactNode;
  onSchliessen: () => void;
  /** `true`: angenommen, der Dialog schließt. */
  onBestaetigen: (k: Kopfangaben) => Promise<boolean>;
}

export function KopfDialog(props: KopfDialogProps): ReactElement {
  const erstes = useRef<HTMLElement>(null);
  return (
    <Dialog
      offen={props.offen}
      onOffenChange={(o) => {
        if (!o) props.onSchliessen();
      }}
      titel={props.titel}
      {...(props.beschreibung === undefined ? {} : { beschreibung: props.beschreibung })}
      anfangsfokus={erstes}
    >
      {props.offen ? <Inhalt {...props} erstes={erstes} /> : null}
    </Dialog>
  );
}

function Inhalt(props: KopfDialogProps & { erstes: RefObject<HTMLElement | null> }): ReactElement {
  const [e, setE] = useState<Kopfentwurf>(() => kopfEntwurf(props.anfang));
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const moeglich = props.moeglich !== false;

  const bestaetigen = async (): Promise<void> => {
    if (laeuft || !moeglich) return;
    const r = kopfEingabe(e);
    if (!r.ok) {
      setFehler(r.fehler);
      return;
    }
    setLaeuft(true);
    const ok = await props.onBestaetigen(r.wert);
    setLaeuft(false);
    if (ok) props.onSchliessen();
  };

  return (
    <form
      ref={(el) => {
        // Der Fokus beginnt in der Bezeichnung; ohne Möglichkeit zum Übernehmen auf „Abbrechen“.
        props.erstes.current =
          el?.querySelector<HTMLElement>(moeglich ? 'input[type="text"]' : 'button[type="button"]') ?? null;
      }}
      className="abrechnung__kopf"
      onSubmit={(ev) => {
        ev.preventDefault();
        void bestaetigen();
      }}
    >
      {props.children}
      <Eingabefeld
        label={t.bezeichnung}
        value={e.bezeichnung}
        onWertChange={(w) => {
          setE({ ...e, bezeichnung: w });
        }}
        disabled={!moeglich}
      />
      <Eingabefeld
        label={t.datum}
        value={e.datum}
        hinweis={t.datumHinweis}
        {...(fehler === null ? {} : { meldung: fehler })}
        onWertChange={(w) => {
          setE({ ...e, datum: w });
          setFehler(null);
        }}
        disabled={!moeglich}
      />
      <footer className="tx-dialog__fuss">
        <Button onClick={props.onSchliessen}>{t.abbrechen}</Button>
        <Button type="submit" variante="primaer" disabled={laeuft || !moeglich}>
          {props.bestaetigen}
        </Button>
      </footer>
    </form>
  );
}
