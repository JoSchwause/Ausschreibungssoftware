// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 66 (O2): „Excel einlesen“ neben „X84 einlesen“ in der Angebotsliste. Datei wählen, Vorschau mit Bietername
// (änderbar) und Befunden, „Übernehmen“ legt bei Bedarf zuerst den Bieter an, dann das Angebot (**ein** Undo-Schritt,
// wie beim X84-Import). Befunde sperren nie (U5); eine Zeile mit Befund in einer Zahlzelle ergibt keine
// Angebotsposition, nichts wird still verworfen (Q5).

import { Button, Dialog, Eingabefeld, useToast } from '@tethys/ui-basis';
import type { LvZustand } from '@tethys/vertrag';
import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { DateiNichtLesbar, dateiBytes, naechsterZug } from '../gaeb/datei';
import { befehlswegFuer } from '../lv/befehlsweg';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { ExcelBefunde } from './ExcelBefunde';
import { excelAngebotLesen, excelAngebotPlan, type ExcelVorschau } from './logik';
import { texte } from './texte';
import '../gaeb/gaeb.css';

type Lage =
  | { readonly art: 'liest'; readonly name: string }
  | {
      readonly art: 'da';
      readonly name: string;
      readonly vorschau: ExcelVorschau;
      readonly bieter: string;
      readonly meldung: string | null;
    };

export function ExcelEinlesen({
  zustand,
  onAngelegt,
}: {
  zustand: LvZustand;
  /** Das Angebot ist angelegt; die Angebotsliste lädt neu. */
  onAngelegt: () => void;
}): ReactElement {
  const u = useUmgebung();
  const weg = befehlswegFuer(u);
  const { pruefe } = useMeldungen();
  const { zeige } = useToast();
  const datei = useRef<HTMLInputElement>(null);
  const [lage, setLage] = useState<Lage | null>(null);
  const lv = zustand.leistungsverzeichnis;

  const waehlen = async (f: File): Promise<void> => {
    setLage({ art: 'liest', name: f.name });
    try {
      await naechsterZug();
      const vorschau = await excelAngebotLesen(await dateiBytes(f), f.name, zustand, u.ids);
      setLage({ art: 'da', name: f.name, vorschau, bieter: vorschau.bieterName, meldung: null });
    } catch (e) {
      setLage(null);
      // Erwartet ist nur „Datei nicht lesbar“; alles andere ist ein Programmfehler und geht weiter (Q5).
      if (!(e instanceof DateiNichtLesbar)) throw e;
      zeige({ titel: texte.einlesen.nichtLesbar, beschreibung: f.name, art: 'fehler' });
    }
  };

  const uebernehmen = async (): Promise<void> => {
    if (lage?.art !== 'da') return;
    if (lage.bieter.trim() === '') {
      setLage({ ...lage, meldung: texte.einlesen.bieterFehlt });
      return;
    }
    // Das Projekt frisch laden: Der Bieter kann inzwischen angelegt oder zurückgenommen worden sein.
    const p = await u.speicher.projekte.laden(lv.projektId);
    if (!p.ok) return;
    const plan = excelAngebotPlan(lage.vorschau, lage.bieter, p.wert, u.ids);
    if (plan === null) return;
    const a = await weg.angebotAnlegen(p.wert, zustand, plan.neuerBieter, plan.angebot);
    if (!pruefe(a)) return;
    setLage(null);
    zeige({ titel: texte.einlesen.erfolg, beschreibung: lage.bieter.trim(), art: 'erfolg' });
    onAngelegt();
  };

  const v = lage?.art === 'da' ? lage.vorschau : null;
  const angeboten = v?.angebot?.positionen.filter((p) => p.status === 'angeboten').length ?? 0;
  return (
    <>
      <input
        ref={datei}
        type="file"
        accept=".xlsx"
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
        {lage?.art === 'da' && v !== null ? (
          <div role="group" aria-label={texte.einlesen.vorschau}>
            <dl className="gaeb__zahlen">
              <dt>{texte.einlesen.positionen}</dt>
              <dd data-testid="anzahl-excel-positionen">{v.angebot?.positionen.length ?? 0}</dd>
              <dt>{texte.einlesen.angeboten}</dt>
              <dd data-testid="anzahl-excel-angeboten">{angeboten}</dd>
            </dl>
            {v.uebernehmbar ? (
              <Eingabefeld
                label={texte.einlesen.bieter}
                value={lage.bieter}
                hinweis={texte.einlesen.bieterHinweis}
                onWertChange={(w) => {
                  setLage({ ...lage, bieter: w, meldung: null });
                }}
                {...(lage.meldung === null ? {} : { meldung: lage.meldung })}
              />
            ) : (
              <p>{texte.einlesen.leer}</p>
            )}
            <ExcelBefunde befunde={v.befunde} />
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
