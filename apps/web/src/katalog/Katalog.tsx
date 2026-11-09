// SPDX-License-Identifier: AGPL-3.0-or-later
// Bausteinkatalog (/katalog): zeigt jeden Baustein aus @tethys/ui-basis in Hell und Dunkel nebeneinander.
// Nur im Entwicklungs-Build erreichbar (siehe App.tsx). Texte stehen in ../ui/texte.ts.
// Hinweis: Überlagerungen (Dialog, Auswahlliste, Tooltip, Meldungen) hängen am <body> und folgen
// deshalb dem Modus der Kopfzeile, nicht dem Rahmen, in dem sie geöffnet wurden.

import {
  Auswahl,
  Button,
  Dialog,
  Eingabefeld,
  Tabs,
  Tastenkuerzel,
  Tooltip,
  Zahlfeld,
  pruefeZahlformatDeDE,
  useToast,
} from '@tethys/ui-basis';
import type { ToastArt, Zahlpruefung } from '@tethys/ui-basis';
import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { texte } from '../ui/texte';
import './katalog.css';

const t = texte.katalog;

const FARB_TOKENS: Record<string, readonly string[]> = {
  [t.tokens.flaechen]: [
    'surface',
    'surface-raised',
    'surface-sunken',
    'surface-hover',
    'border',
    'border-strong',
  ],
  [t.tokens.text]: ['text', 'text-muted', 'accent', 'accent-hover', 'accent-subtle'],
  [t.tokens.status]: ['danger', 'danger-subtle', 'warning', 'warning-subtle', 'success', 'success-subtle'],
};

const EINHEITEN = [
  { wert: 'm', label: t.auswahl.optionen.m },
  { wert: 'm2', label: t.auswahl.optionen.m2 },
  { wert: 'm3', label: t.auswahl.optionen.m3 },
  { wert: 'st', label: t.auswahl.optionen.st },
  { wert: 'psch', label: t.auswahl.optionen.psch },
  { wert: 'h', label: t.auswahl.optionen.gesperrt, deaktiviert: true },
];

function Abschnitt({ titel, children }: { titel: string; children: ReactNode }): ReactElement {
  return (
    <section className="katalog__abschnitt">
      <h3>{titel}</h3>
      {children}
    </section>
  );
}

function Beispiele(): ReactElement {
  const [text, setText] = useState<string>(t.felder.textWert);
  const [zahl, setZahl] = useState<string>(t.felder.zahlWert);
  const [preis, setPreis] = useState<string>(t.felder.preisWert);
  const [einheit, setEinheit] = useState<string | undefined>('m2');
  const [dialogOffen, setDialogOffen] = useState(false);
  const [probe, setProbe] = useState<string>(t.validierung.startWert);
  const [probePruefung, setProbePruefung] = useState<Zahlpruefung>(
    pruefeZahlformatDeDE(t.validierung.startWert),
  );
  const { zeige } = useToast();

  const toast = (art: ToastArt, titel: string, beschreibung: string) => {
    zeige({ art, titel, beschreibung });
  };

  return (
    <>
      <Abschnitt titel={t.abschnitte.tokens}>
        {Object.entries(FARB_TOKENS).map(([gruppe, namen]) => (
          <div key={gruppe} className="katalog__farben">
            <span className="katalog__gruppe">{gruppe}</span>
            {namen.map((n) => (
              <span key={n} className="katalog__farbe" title={`--tx-color-${n}`}>
                <span className="katalog__muster" style={{ background: `var(--tx-color-${n})` }} />
                <code>{n}</code>
              </span>
            ))}
          </div>
        ))}
      </Abschnitt>

      <Abschnitt titel={t.abschnitte.button}>
        <div className="katalog__zeile">
          <Button variante="primaer">{t.button.primaer}</Button>
          <Button>{t.button.sekundaer}</Button>
          <Button variante="schlicht">{t.button.schlicht}</Button>
          <Button variante="gefahr">{t.button.gefahr}</Button>
          <Button groesse="sm">{t.button.klein}</Button>
          <Button disabled>{t.button.deaktiviert}</Button>
        </div>
      </Abschnitt>

      <Abschnitt titel={t.abschnitte.felder}>
        <div className="katalog__raster">
          <Eingabefeld
            label={t.felder.text}
            hinweis={t.felder.textHinweis}
            value={text}
            onWertChange={setText}
          />
          <Zahlfeld
            label={t.felder.zahl}
            einheit={t.felder.zahlEinheit}
            value={zahl}
            onWertChange={(roh) => {
              setZahl(roh);
            }}
          />
          <Zahlfeld
            label={t.felder.preis}
            einheit={t.felder.preisEinheit}
            value={preis}
            onWertChange={(roh) => {
              setPreis(roh);
            }}
          />
        </div>
      </Abschnitt>

      <Abschnitt titel={t.abschnitte.auswahl}>
        <div className="katalog__raster">
          <Auswahl
            label={t.auswahl.label}
            platzhalter={t.auswahl.platzhalter}
            optionen={EINHEITEN}
            wert={einheit}
            onWertChange={setEinheit}
          />
        </div>
      </Abschnitt>

      <Abschnitt titel={t.abschnitte.dialog}>
        <div className="katalog__zeile">
          <Button
            onClick={() => {
              setDialogOffen(true);
            }}
          >
            {t.dialog.oeffnen}
          </Button>
        </div>
        <Dialog
          offen={dialogOffen}
          onOffenChange={setDialogOffen}
          titel={t.dialog.titel}
          beschreibung={t.dialog.beschreibung}
          fuss={
            <>
              <Button
                onClick={() => {
                  setDialogOffen(false);
                }}
              >
                {t.dialog.abbrechen}
              </Button>
              <Button
                variante="gefahr"
                onClick={() => {
                  setDialogOffen(false);
                }}
              >
                {t.dialog.bestaetigen}
              </Button>
            </>
          }
        />
      </Abschnitt>

      <Abschnitt titel={t.abschnitte.tabs}>
        <Tabs
          label={t.tabs.label}
          reiter={[
            { wert: 'eins', label: t.tabs.eins, inhalt: t.tabs.inhaltEins },
            { wert: 'zwei', label: t.tabs.zwei, inhalt: t.tabs.inhaltZwei },
            { wert: 'drei', label: t.tabs.drei, inhalt: t.tabs.inhaltDrei },
          ]}
        />
      </Abschnitt>

      <Abschnitt titel={t.abschnitte.tooltip}>
        <div className="katalog__zeile">
          <Tooltip text={t.tooltip.text} kuerzel={t.tooltip.kuerzel}>
            <Button>{t.tooltip.ausloeser}</Button>
          </Tooltip>
          <span className="katalog__leise">{t.tooltip.kuerzelBeschreibung}</span>
          <Tastenkuerzel tasten={['Strg', 'S']} />
          <Tastenkuerzel tasten={['F2']} />
          <Tastenkuerzel tasten={['Esc']} />
        </div>
      </Abschnitt>

      <Abschnitt titel={t.abschnitte.toast}>
        <div className="katalog__zeile">
          <Button
            onClick={() => {
              toast('info', t.toast.titelInfo, t.toast.beschreibungInfo);
            }}
          >
            {t.toast.info}
          </Button>
          <Button
            onClick={() => {
              toast('erfolg', t.toast.titelErfolg, t.toast.beschreibungErfolg);
            }}
          >
            {t.toast.erfolg}
          </Button>
          <Button
            onClick={() => {
              toast('warnung', t.toast.titelWarnung, t.toast.beschreibungWarnung);
            }}
          >
            {t.toast.warnung}
          </Button>
          <Button
            onClick={() => {
              toast('fehler', t.toast.titelFehler, t.toast.beschreibungFehler);
            }}
          >
            {t.toast.fehler}
          </Button>
        </div>
      </Abschnitt>

      <Abschnitt titel={t.abschnitte.validierung}>
        <p className="katalog__leise">{t.validierung.erklaerung}</p>
        <div className="katalog__raster">
          <Zahlfeld
            label={t.validierung.label}
            value={probe}
            onWertChange={(roh, pruefung) => {
              setProbe(roh);
              setProbePruefung(pruefung);
            }}
          />
        </div>
        <p className="katalog__leise">
          {t.validierung.zuletzt} <code data-testid="probe-roh">{probe}</code> (
          {probePruefung.gueltig ? t.validierung.gueltig : t.validierung.ungueltig})
        </p>
      </Abschnitt>
    </>
  );
}

function Rahmen({ modus, titel }: { modus: 'light' | 'dark'; titel: string }): ReactElement {
  return (
    <section className="katalog__rahmen" data-theme={modus} aria-label={titel}>
      <h2 className="katalog__modus">{titel}</h2>
      <Beispiele />
    </section>
  );
}

export default function Katalog(): ReactElement {
  return (
    <div className="seite katalog">
      <h1>{t.titel}</h1>
      <p className="seite__leise">{t.einleitung}</p>
      <div className="katalog__modi">
        <Rahmen modus="light" titel={t.modi.hell} />
        <Rahmen modus="dark" titel={t.modi.dunkel} />
      </div>
    </div>
  );
}
