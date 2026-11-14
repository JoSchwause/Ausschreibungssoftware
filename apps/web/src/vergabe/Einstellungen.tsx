// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstellungen des Preisspiegels (Ticket 63, Punkt 2; G-26): Ausreißer-Schwelle, ABC-Schwelle A, Bezug der ABC-Klasse,
// Spalten ein/aus. Ticket 149 (D-73, B-29): Schwellen und Bezug stehen am LV (`PreisspiegelEinstellungenSetzen`, Undo), die
// Spaltenwahl bleibt Sitzungszustand der Seite. Die Schwellen gelten erst mit Enter oder beim Verlassen des Felds: Der
// Preisspiegel rechnet dann einmal neu, nicht bei jedem Tastendruck.

import { formatiereProzentDe, vergleiche } from '@tethys/dezimal';
import type { AbcBezug, PreisspiegelEinstellungen } from '@tethys/vergabe';
import { Auswahl, Button, Eingabefeld } from '@tethys/ui-basis';
import type { Prozent } from '@tethys/vertrag';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import type { Spaltenwahl } from './ansicht';
import { schwelleLesen } from './einstellungen';
import { texte } from './texte';

const t = texte.einstellungen;

function Schwellenfeld({
  label,
  wert,
  art,
  onWert,
}: {
  label: string;
  wert: Prozent;
  art: 'ausreisser' | 'abc';
  /** Gibt eine Meldung zurück, wenn der Wert zusammen mit den übrigen nicht geht (A über B). */
  onWert: (p: Prozent) => string | null;
}): ReactElement {
  const [text, setText] = useState(formatiereProzentDe(wert));
  const [meldung, setMeldung] = useState<string | null>(null);
  useEffect(() => {
    setText(formatiereProzentDe(wert));
  }, [wert]);
  const uebernehmen = (): void => {
    const r = schwelleLesen(text, art);
    if (!r.ok) {
      setMeldung(r.fehler);
      return;
    }
    const nein = r.wert === wert ? null : onWert(r.wert);
    setMeldung(nein);
    if (nein === null) setText(formatiereProzentDe(r.wert));
  };
  return (
    <Eingabefeld
      label={label}
      value={text}
      kompakt
      className="preisspiegel__schwelle"
      onWertChange={(w) => {
        setText(w);
        setMeldung(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          uebernehmen();
        }
      }}
      onBlur={uebernehmen}
      {...(meldung === null ? {} : { meldung })}
    />
  );
}

function Schalter({
  label,
  an,
  onAn,
  gesperrt = false,
}: {
  label: string;
  an: boolean;
  onAn: (an: boolean) => void;
  /** Die letzte Preisspalte (EP oder GP) bleibt an. */
  gesperrt?: boolean;
}): ReactElement {
  return (
    <label className="preisspiegel__schalter">
      <input
        type="checkbox"
        checked={an}
        disabled={gesperrt}
        onChange={(e) => {
          onAn(e.target.checked);
        }}
      />
      {label}
    </label>
  );
}

export function Einstellungen({
  einstellungen,
  onEinstellungen,
  wahl,
  onWahl,
}: {
  einstellungen: PreisspiegelEinstellungen;
  /** Neue Einstellungen für das LV; `null` stellt die Standardwerte her. */
  onEinstellungen: (e: PreisspiegelEinstellungen | null) => void;
  wahl: Spaltenwahl;
  onWahl: (w: Spaltenwahl) => void;
}): ReactElement {
  /** A ≤ B (Glossar „Preisspiegel-Einstellungen“): sonst Meldung am Feld, nichts gesendet (U5: die Eingabe bleibt stehen). */
  const setzen = (e: PreisspiegelEinstellungen): string | null => {
    if (vergleiche(e.abcSchwelleA, e.abcSchwelleB) > 0) return t.aUeberB;
    onEinstellungen(e);
    return null;
  };
  return (
    <fieldset className="preisspiegel__einstellungen">
      <legend>{t.gruppe}</legend>
      <Schwellenfeld
        label={t.ausreisser}
        art="ausreisser"
        wert={einstellungen.ausreisserSchwelle}
        onWert={(p) => setzen({ ...einstellungen, ausreisserSchwelle: p })}
      />
      <Schwellenfeld
        label={t.abcA}
        art="abc"
        wert={einstellungen.abcSchwelleA}
        onWert={(p) => setzen({ ...einstellungen, abcSchwelleA: p })}
      />
      <Schwellenfeld
        label={t.abcB}
        art="abc"
        wert={einstellungen.abcSchwelleB}
        onWert={(p) => setzen({ ...einstellungen, abcSchwelleB: p })}
      />
      <Auswahl
        label={t.abcBezug}
        kompakt
        optionen={[
          { wert: 'mittel', label: t.bezugMittel },
          { wert: 'schaetzpreis', label: t.bezugSchaetzpreis },
        ]}
        wert={einstellungen.abcBezug}
        onWertChange={(w) => {
          onEinstellungen({ ...einstellungen, abcBezug: w as AbcBezug });
        }}
      />
      <div className="preisspiegel__spalten" role="group" aria-label={t.spalten}>
        <span className="preisspiegel__spaltentitel" aria-hidden="true">
          {t.spalten}
        </span>
        <Schalter
          label={t.ep}
          an={wahl.ep}
          gesperrt={wahl.ep && !wahl.gp}
          onAn={(an) => {
            onWahl({ ...wahl, ep: an });
          }}
        />
        <Schalter
          label={t.gp}
          an={wahl.gp}
          gesperrt={wahl.gp && !wahl.ep}
          onAn={(an) => {
            onWahl({ ...wahl, gp: an });
          }}
        />
        <Schalter
          label={t.virtuell}
          an={wahl.virtuell}
          onAn={(an) => {
            onWahl({ ...wahl, virtuell: an });
          }}
        />
        <Schalter
          label={t.schaetzpreis}
          an={wahl.schaetzpreis}
          onAn={(an) => {
            onWahl({ ...wahl, schaetzpreis: an });
          }}
        />
      </div>
      <Button
        groesse="sm"
        onClick={() => {
          onEinstellungen(null);
        }}
      >
        {t.standard}
      </Button>
      <p className="preisspiegel__hinweis">{t.hinweis}</p>
    </fieldset>
  );
}
