// SPDX-License-Identifier: AGPL-3.0-or-later
// „GAEB einlesen“ (Ticket 49, Punkt 1; E7): Datei wählen, Vorschau mit Zahlen und Befunden, „Übernehmen“ legt das LV mit
// **einem** Befehl an (Massenbefehl, E-13). Ohne offenes Projekt (`projekt: null`, z. B. beim ersten Start) legt
// „Übernehmen“ das Projekt mit an, Name und Bauherr sind vorgeschlagen und änderbar; Projekt und LV sind ein Undo-Schritt.
// Befunde sperren nie (U5), nichts wird still verworfen (Q5). Eine abgewiesene Datei zeigt den Satz des Lesers und bietet
// kein Übernehmen an.

import { Button, Dialog, Eingabefeld, useToast } from '@tethys/ui-basis';
import type { LeistungsverzeichnisId, Projekt, ProjektId } from '@tethys/vertrag';
import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { befehlswegFuer } from '../lv/befehlsweg';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { BefundeBeimEinlesen } from './BefundeBeimEinlesen';
import { abweisungssatz } from './befunde';
import { DateiNichtLesbar, GAEB_ENDUNGEN, dateiBytes, naechsterZug } from './datei';
import { projektAusGaebAnlegen, projektVorschlag, type Projektvorschlag } from './einlesen';
import { lvLesen, type Lesevorschau } from './gaeb';
import { texte } from './texte';
import './gaeb.css';

type Lage =
  | { readonly art: 'liest'; readonly name: string }
  | {
      readonly art: 'da';
      readonly name: string;
      readonly vorschau: Lesevorschau;
      /** Nur ohne offenes Projekt: Name und Bauherr des neuen Projekts. */
      readonly neu: Projektvorschlag;
    };

/** Wo das eingelesene LV steht. */
export interface Eingelesen {
  readonly projektId: ProjektId;
  readonly lvId: LeistungsverzeichnisId;
}

export function GaebEinlesen({
  projekt,
  onAngelegt,
}: {
  /** `null`: kein Projekt offen; „Übernehmen“ legt es aus der Datei an. */
  projekt: Projekt | null;
  /** Das LV (und ohne offenes Projekt auch das Projekt) ist angelegt. */
  onAngelegt: (ziel: Eingelesen) => void;
}): ReactElement {
  const u = useUmgebung();
  const { pruefe } = useMeldungen();
  const { zeige } = useToast();
  const datei = useRef<HTMLInputElement>(null);
  const [lage, setLage] = useState<Lage | null>(null);
  const t = texte.einlesen;

  const waehlen = async (f: File): Promise<void> => {
    setLage({ art: 'liest', name: f.name });
    try {
      // Der Leser läuft auf dem Thread der Seite (bis 100 MiB, Ticket 22); die Wartemeldung erscheint vorher.
      await naechsterZug();
      const vorschau = lvLesen(await dateiBytes(f), f.name, u.ids);
      setLage({ art: 'da', name: f.name, vorschau, neu: projektVorschlag(vorschau, f.name) });
    } catch (e) {
      setLage(null);
      // Erwartet ist nur „Datei nicht lesbar“; ein Fehler des Lesers ist ein Programmfehler und geht weiter (Q5).
      if (!(e instanceof DateiNichtLesbar)) throw e;
      zeige({ titel: t.nichtLesbar, beschreibung: f.name, art: 'fehler' });
    }
  };

  const uebernehmen = async (): Promise<void> => {
    if (lage?.art !== 'da' || lage.vorschau.inhalt === null) return;
    const inhalt = lage.vorschau.inhalt;
    if (projekt === null) {
      const a = await projektAusGaebAnlegen(u, lage.neu, inhalt);
      if (!a.ok) {
        pruefe(a);
        return;
      }
      setLage(null);
      zeige({ titel: t.erfolgProjekt, beschreibung: a.projekt.name, art: 'erfolg' });
      onAngelegt({ projektId: a.projekt.id, lvId: a.lv.leistungsverzeichnis.id });
      return;
    }
    const a = await befehlswegFuer(u)
      .lv(projekt.id, null)
      .befehl({ art: 'LeistungsverzeichnisAnlegen', id: inhalt.wurzelId, projektId: projekt.id, inhalt });
    if (!pruefe(a)) return;
    setLage(null);
    zeige({ titel: t.erfolg, beschreibung: inhalt.name, art: 'erfolg' });
    onAngelegt({ projektId: projekt.id, lvId: inhalt.wurzelId });
  };

  const v = lage?.art === 'da' ? lage.vorschau : null;
  return (
    <>
      <input
        ref={datei}
        type="file"
        accept={GAEB_ENDUNGEN}
        className="gaeb__datei"
        aria-label={t.datei}
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void waehlen(f);
        }}
      />
      <Button onClick={() => datei.current?.click()}>
        {projekt === null ? t.knopfOhneProjekt : t.knopf}
      </Button>
      <Dialog
        offen={lage !== null}
        onOffenChange={(o) => {
          if (!o) setLage(null);
        }}
        titel={t.titel}
        {...(lage === null ? {} : { beschreibung: lage.name })}
        fuss={
          <>
            <Button
              onClick={() => {
                setLage(null);
              }}
            >
              {t.schliessen}
            </Button>
            {v?.uebernehmbar === true ? (
              <Button variante="primaer" onClick={() => void uebernehmen()}>
                {t.uebernehmen}
              </Button>
            ) : null}
          </>
        }
      >
        {lage?.art === 'liest' ? <p aria-busy="true">{t.liest}</p> : null}
        {lage?.art !== 'da' || v === null ? null : (
          <div aria-label={t.vorschau} role="group">
            {projekt === null && v.uebernehmbar ? (
              <fieldset className="gaeb__neu">
                <legend>{t.neuesProjekt}</legend>
                <Eingabefeld
                  label={t.projektname}
                  value={lage.neu.name}
                  hinweis={t.neuesProjektHinweis}
                  onWertChange={(name) => {
                    setLage({ ...lage, neu: { ...lage.neu, name } });
                  }}
                />
                <Eingabefeld
                  label={t.bauherr}
                  value={lage.neu.bauherr}
                  hinweis={t.bauherrHinweis}
                  onWertChange={(bauherr) => {
                    setLage({ ...lage, neu: { ...lage.neu, bauherr } });
                  }}
                />
              </fieldset>
            ) : null}
            <dl className="gaeb__zahlen">
              <dt>{t.phase}</dt>
              <dd>{v.phase ?? t.unbekannt}</dd>
              <dt>{t.version}</dt>
              <dd>{v.version ?? t.unbekannt}</dd>
              <dt>{t.gliederungen}</dt>
              <dd data-testid="anzahl-gliederungen">{v.anzahl.gliederungen.toLocaleString('de-DE')}</dd>
              <dt>{t.positionen}</dt>
              <dd data-testid="anzahl-positionen">{v.anzahl.positionen.toLocaleString('de-DE')}</dd>
              <dt>{t.hinweistexte}</dt>
              <dd data-testid="anzahl-hinweistexte">{v.anzahl.hinweistexte.toLocaleString('de-DE')}</dd>
            </dl>
            {v.uebernehmbar || abweisungssatz(v.befunde) !== null ? null : <p>{t.leer}</p>}
            <BefundeBeimEinlesen befunde={v.befunde} />
          </div>
        )}
      </Dialog>
    </>
  );
}
