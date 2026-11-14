// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 151 (B-18): „Angebot des Auftragnehmers einlesen“ im Kopfband des Nachtrags-LV. Eine Datei (X84 oder Excel, am
// Inhalt erkannt), Vorschau mit dem Auftragnehmer als Bieter (vorbelegt, nicht änderbar: Angebote anderer Bieter gehen über
// „Angebote“) und den Befunden; „Übernehmen“ legt das Angebot für den Auftragnehmer an, ein Undo-Schritt. Gelesen wird mit
// denselben Lesern wie bei „Angebote“ (X84) und „Excel einlesen“; Befunde sperren nie (U5), nichts wird still verworfen (Q5).

import { Button, Dialog, Eingabefeld, useToast } from '@tethys/ui-basis';
import type { BieterId, LvZustand } from '@tethys/vertrag';
import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { ExcelBefunde } from '../ausgabe/ExcelBefunde';
import { excelAngebotLesen, type ExcelVorschau } from '../ausgabe/logik';
import { Befundliste } from '../gaeb/Befundliste';
import { DateiNichtLesbar, dateiBytes, naechsterZug } from '../gaeb/datei';
import { angebotLesen, type Angebotsvorschau } from '../gaeb/gaeb';
import { texte as gtexte } from '../gaeb/texte';
import { befehlswegFuer } from '../lv/befehlsweg';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { auftragnehmerAngebotAnlegen } from './speichern';
import { texte } from './texte';
import '../gaeb/gaeb.css';

const t = texte.einlesen;

type Gelesen =
  | { readonly format: 'x84'; readonly vorschau: Angebotsvorschau }
  | { readonly format: 'excel'; readonly vorschau: ExcelVorschau };

type Lage =
  | { readonly art: 'liest'; readonly name: string }
  | { readonly art: 'da'; readonly name: string; readonly gelesen: Gelesen };

/** Eine .xlsx ist ein ZIP-Archiv („PK“ am Anfang); alles andere wird als GAEB-XML gelesen (D-151.4). */
const istZip = (b: Uint8Array): boolean => b[0] === 0x50 && b[1] === 0x4b;

const gleichNamig = (a: string, b: string): boolean =>
  a.trim().toLocaleLowerCase('de') === b.trim().toLocaleLowerCase('de');

export function AuftragnehmerAngebot({
  zustand,
  auftragnehmer,
  primaer,
  onAngelegt,
}: {
  zustand: LvZustand;
  auftragnehmer: { readonly bieterId: BieterId; readonly name: string };
  /** Der sichtbare nächste Schritt (Schrittanzeige). */
  primaer: boolean;
  onAngelegt: () => void;
}): ReactElement {
  const u = useUmgebung();
  const weg = befehlswegFuer(u);
  const { pruefe } = useMeldungen();
  const { zeige } = useToast();
  const datei = useRef<HTMLInputElement>(null);
  const [lage, setLage] = useState<Lage | null>(null);

  const waehlen = async (f: File): Promise<void> => {
    setLage({ art: 'liest', name: f.name });
    try {
      await naechsterZug();
      const bytes = await dateiBytes(f);
      const gelesen: Gelesen = istZip(bytes)
        ? { format: 'excel', vorschau: await excelAngebotLesen(bytes, f.name, zustand, u.ids) }
        : { format: 'x84', vorschau: angebotLesen(bytes, f.name, zustand, u.ids) };
      setLage({ art: 'da', name: f.name, gelesen });
    } catch (e) {
      setLage(null);
      // Erwartet ist nur „Datei nicht lesbar“; alles andere ist ein Programmfehler und geht weiter (Q5).
      if (!(e instanceof DateiNichtLesbar)) throw e;
      zeige({ titel: t.nichtLesbar, beschreibung: f.name, art: 'fehler' });
    }
  };

  const g = lage?.art === 'da' ? lage.gelesen : null;
  const angebot = g?.vorschau.angebot ?? null;

  const uebernehmen = async (): Promise<void> => {
    if (angebot === null) return;
    const a = await auftragnehmerAngebotAnlegen(weg, zustand, auftragnehmer.bieterId, angebot);
    if (!pruefe(a)) return;
    setLage(null);
    zeige({ titel: t.erfolg, beschreibung: auftragnehmer.name, art: 'erfolg' });
    onAngelegt();
  };

  const angeboten = angebot?.positionen.filter((p) => p.status === 'angeboten').length ?? 0;
  // Nur eine X84 nennt den Bieter selbst; bei Excel ist der Name nur der Dateiname.
  const andererName =
    g?.format === 'x84' && g.vorschau.bieterName !== '' && !gleichNamig(g.vorschau.bieterName, auftragnehmer.name)
      ? g.vorschau.bieterName
      : null;
  return (
    <>
      <input
        ref={datei}
        type="file"
        accept=".x84,.X84,.xml,.xlsx"
        className="gaeb__datei"
        aria-label={t.datei}
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void waehlen(f);
        }}
      />
      <Button {...(primaer ? { variante: 'primaer' as const } : {})} onClick={() => datei.current?.click()}>
        {t.knopf}
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
            {angebot !== null ? (
              <Button variante="primaer" onClick={() => void uebernehmen()}>
                {t.uebernehmen}
              </Button>
            ) : null}
          </>
        }
      >
        {lage?.art === 'liest' ? <p aria-busy="true">{t.liest}</p> : null}
        {g !== null ? (
          <div role="group" aria-label={t.vorschau}>
            <dl className="gaeb__zahlen">
              <dt>{t.format}</dt>
              <dd>{g.format === 'x84' ? t.formatX84 : t.formatExcel}</dd>
              <dt>{t.positionen}</dt>
              <dd data-testid="anzahl-angebotspositionen">{angebot?.positionen.length ?? 0}</dd>
              <dt>{t.angeboten}</dt>
              <dd data-testid="anzahl-angeboten">{angeboten}</dd>
            </dl>
            <Eingabefeld
              label={t.bieter}
              value={auftragnehmer.name}
              readOnly
              hinweis={t.bieterHinweis}
              onWertChange={() => undefined}
            />
            {andererName === null ? null : <p>{t.andererName(andererName)}</p>}
            {angebot === null ? <p>{t.leer}</p> : null}
            {g.format === 'x84' ? (
              <>
                {g.vorschau.phase !== 'X84' ? (
                  <p>{gtexte.angebot.keinX84(g.vorschau.phase, g.vorschau.version)}</p>
                ) : null}
                <Befundliste befunde={g.vorschau.befunde} />
              </>
            ) : (
              <ExcelBefunde befunde={g.vorschau.befunde} />
            )}
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
