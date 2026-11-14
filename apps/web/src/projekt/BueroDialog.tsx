// SPDX-License-Identifier: AGPL-3.0-or-later
// Dialog „Büro (Absender)“ (Ticket 150; E10, D-73): das Büro einmal für alle Projekte, als Befehl an den Einstellungen
// (`BueroSetzen`). Der Dialog bleibt nach dem Speichern offen; „Einstellung rückgängig“ und Strg+Z nehmen die Änderung im
// Dialog zurück (eigenes Rückgängig der Einstellungen, D-82 M1).

import { Button, Dialog, Eingabefeld, useToast } from '@tethys/ui-basis';
import { useEffect, useId, useState } from 'react';
import type { ReactElement } from 'react';
import {
  EinstellungenKnoepfe,
  useEinstellungen,
  useEinstellungenHistorie,
} from '../historie/EinstellungenAnbieter';
import { useMeldungen } from '../lv/meldungen';
import { bueroAusFormular, bueroFormular, type BueroFormular } from './angaben';
import { texte } from './texte';

const t = texte.buero;

export function BueroDialog({
  offen,
  onSchliessen,
}: {
  offen: boolean;
  onSchliessen: () => void;
}): ReactElement {
  const formId = useId();
  const { sitzung, zustand } = useEinstellungen();
  const historie = useEinstellungenHistorie();
  const { pruefe } = useMeldungen();
  const { zeige } = useToast();
  const [form, setForm] = useState<BueroFormular>(() => bueroFormular(zustand.buero));
  const [nameFehlt, setNameFehlt] = useState(false);

  // Beim Öffnen und nach jeder Änderung der Einstellungen (auch Rückgängig) zeigt das Formular den gespeicherten Stand.
  useEffect(() => {
    if (!offen) return;
    setForm(bueroFormular(zustand.buero));
    setNameFehlt(false);
  }, [offen, zustand.buero]);

  const speichern = async (): Promise<void> => {
    const r = bueroAusFormular(form);
    if (!r.ok) {
      setNameFehlt(true);
      return;
    }
    const a = await sitzung.befehl({ art: 'BueroSetzen', buero: r.buero });
    if (pruefe(a)) zeige({ titel: t.gespeichert, art: 'erfolg' });
  };

  const feld = (schluessel: keyof BueroFormular, label: string): ReactElement => (
    <Eingabefeld
      label={label}
      value={form[schluessel]}
      onWertChange={(w) => {
        setForm((f) => ({ ...f, [schluessel]: w }));
        if (schluessel === 'name') setNameFehlt(false);
      }}
      {...(schluessel === 'name' && nameFehlt ? { meldung: t.nameFehlt } : {})}
    />
  );

  return (
    <Dialog
      offen={offen}
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={t.titel}
      beschreibung={t.hinweis}
      fuss={
        <>
          <Button onClick={onSchliessen}>{texte.importieren.schliessen}</Button>
          <Button type="submit" form={formId} variante="primaer">
            {texte.projekt.speichern}
          </Button>
        </>
      }
    >
      <div onKeyDown={historie.tasten}>
        <form
          id={formId}
          onSubmit={(e) => {
            e.preventDefault();
            void speichern();
          }}
        >
          {feld('name', t.name)}
          <fieldset className="projekt__gruppe-felder">
            <legend>{t.anschrift}</legend>
            {feld('strasse', t.strasse)}
            {feld('plz', t.plz)}
            {feld('ort', t.ort)}
          </fieldset>
          {feld('telefon', t.telefon)}
          {feld('email', t.email)}
        </form>
        <div className="projekt__werkzeuge">
          <EinstellungenKnoepfe historie={historie} />
        </div>
      </div>
    </Dialog>
  );
}
