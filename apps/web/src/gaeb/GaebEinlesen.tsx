// SPDX-License-Identifier: AGPL-3.0-or-later
// „GAEB einlesen“ auf der Projektseite (Ticket 49, Punkt 1): Datei wählen, Vorschau mit Zahlen und Befunden,
// „Übernehmen“ legt das LV mit **einem** Befehl an (Massenbefehl, E-13). Befunde sperren nie (U5), nichts wird still
// verworfen (Q5). Eine Datei ohne Inhalt zeigt die Befunde und bietet kein Übernehmen an.

import { Button, Dialog, useToast } from '@tethys/ui-basis';
import type { Projekt } from '@tethys/vertrag';
import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { befehlswegFuer } from '../lv/befehlsweg';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { Befundliste } from './Befundliste';
import { DateiNichtLesbar, dateiBytes, naechsterZug } from './datei';
import { lvLesen, type Lesevorschau } from './gaeb';
import { texte } from './texte';
import './gaeb.css';

type Lage =
  | { readonly art: 'liest'; readonly name: string }
  | { readonly art: 'da'; readonly name: string; readonly vorschau: Lesevorschau };

export function GaebEinlesen({
  projekt,
  onAngelegt,
}: {
  projekt: Projekt;
  /** Das LV ist angelegt; die Seite lädt ihre Liste neu. */
  onAngelegt: () => void;
}): ReactElement {
  const u = useUmgebung();
  const { pruefe } = useMeldungen();
  const { zeige } = useToast();
  const datei = useRef<HTMLInputElement>(null);
  const [lage, setLage] = useState<Lage | null>(null);

  const waehlen = async (f: File): Promise<void> => {
    setLage({ art: 'liest', name: f.name });
    try {
      // Der Leser läuft auf dem Thread der Seite (bis 100 MiB, Ticket 22); die Wartemeldung erscheint vorher.
      await naechsterZug();
      const vorschau = lvLesen(await dateiBytes(f), f.name, u.ids);
      setLage({ art: 'da', name: f.name, vorschau });
    } catch (e) {
      setLage(null);
      // Erwartet ist nur „Datei nicht lesbar“; ein Fehler des Lesers ist ein Programmfehler und geht weiter (Q5).
      if (!(e instanceof DateiNichtLesbar)) throw e;
      zeige({ titel: texte.einlesen.nichtLesbar, beschreibung: f.name, art: 'fehler' });
    }
  };

  const uebernehmen = async (): Promise<void> => {
    if (lage?.art !== 'da' || lage.vorschau.inhalt === null) return;
    const inhalt = lage.vorschau.inhalt;
    const a = await befehlswegFuer(u)
      .lv(projekt.id, null)
      .befehl({ art: 'LeistungsverzeichnisAnlegen', id: inhalt.wurzelId, projektId: projekt.id, inhalt });
    if (!pruefe(a)) return;
    setLage(null);
    zeige({ titel: texte.einlesen.erfolg, beschreibung: inhalt.name, art: 'erfolg' });
    onAngelegt();
  };

  const v = lage?.art === 'da' ? lage.vorschau : null;
  return (
    <>
      <input
        ref={datei}
        type="file"
        accept=".x81,.x83,.x84,.x86,.xml,.X81,.X83,.X84,.X86"
        className="gaeb__datei"
        aria-label={texte.einlesen.datei}
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void waehlen(f);
        }}
      />
      <Button onClick={() => datei.current?.click()}>{texte.einlesen.knopf}</Button>
      <Dialog
        offen={lage !== null}
        onOffenChange={(o) => {
          if (!o) setLage(null);
        }}
        titel={texte.einlesen.titel}
        {...(lage === null ? {} : { beschreibung: lage.name })}
        fuss={
          <>
            <Button
              onClick={() => {
                setLage(null);
              }}
            >
              {texte.einlesen.schliessen}
            </Button>
            {v?.uebernehmbar === true ? (
              <Button variante="primaer" onClick={() => void uebernehmen()}>
                {texte.einlesen.uebernehmen}
              </Button>
            ) : null}
          </>
        }
      >
        {lage?.art === 'liest' ? <p aria-busy="true">{texte.einlesen.liest}</p> : null}
        {v === null ? null : (
          <div aria-label={texte.einlesen.vorschau} role="group">
            <dl className="gaeb__zahlen">
              <dt>{texte.einlesen.phase}</dt>
              <dd>{v.phase ?? texte.einlesen.unbekannt}</dd>
              <dt>{texte.einlesen.version}</dt>
              <dd>{v.version ?? texte.einlesen.unbekannt}</dd>
              <dt>{texte.einlesen.gliederungen}</dt>
              <dd data-testid="anzahl-gliederungen">{v.anzahl.gliederungen}</dd>
              <dt>{texte.einlesen.positionen}</dt>
              <dd data-testid="anzahl-positionen">{v.anzahl.positionen}</dd>
              <dt>{texte.einlesen.hinweistexte}</dt>
              <dd data-testid="anzahl-hinweistexte">{v.anzahl.hinweistexte}</dd>
            </dl>
            {v.uebernehmbar ? null : <p>{texte.einlesen.leer}</p>}
            <Befundliste befunde={v.befunde} />
          </div>
        )}
      </Dialog>
    </>
  );
}
