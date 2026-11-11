// SPDX-License-Identifier: AGPL-3.0-or-later
// „X31 einlesen“ (Ticket 87, M3): Datei wählen, gegen das Auftrags-LV lesen (Ticket 83), Befunde zeigen (U5: sie sperren
// nie), Bezeichnung und Datum abfragen (D-83.6) und ein neues Blatt anlegen. Nichts davon schreibt, bevor der Nutzer
// bestätigt; das Anlegen ist ein Befehl (A5), Rückgängig nimmt es zurück.

import { Button, useToast } from '@tethys/ui-basis';
import type { Aufmassposition, AuftragsLvZustand } from '@tethys/vertrag';
import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Befundliste } from '../gaeb/Befundliste';
import { DateiNichtLesbar, dateiBytes, naechsterZug } from '../gaeb/datei';
import { KopfDialog } from './KopfDialog';
import type { Kopfangaben } from './kopf';
import { texte } from './texte';
import { x31Vorschau, type X31Vorschau } from './x31';

const t = texte.x31;

interface Gelesen {
  readonly datei: string;
  readonly vorschau: X31Vorschau;
}

export function X31Einlesen({
  auftrag,
  naechsteNummer,
  anlegen,
}: {
  auftrag: AuftragsLvZustand;
  naechsteNummer: number;
  /** Legt das Blatt an (Befehlsweg); `true`, wenn angenommen. */
  anlegen: (kopf: Kopfangaben, positionen: readonly Aufmassposition[]) => Promise<boolean>;
}): ReactElement {
  const { zeige } = useToast();
  const datei = useRef<HTMLInputElement>(null);
  const [gelesen, setGelesen] = useState<Gelesen | null>(null);
  const [liest, setLiest] = useState(false);

  const lesen = async (f: File): Promise<void> => {
    setLiest(true);
    await naechsterZug();
    try {
      const bytes = await dateiBytes(f);
      setGelesen({ datei: f.name, vorschau: x31Vorschau(bytes, auftrag) });
    } catch (e) {
      if (!(e instanceof DateiNichtLesbar)) throw e;
      zeige({ titel: t.nichtLesbar(f.name), art: 'fehler' });
    } finally {
      setLiest(false);
    }
  };

  const v = gelesen?.vorschau ?? null;
  return (
    <>
      <input
        ref={datei}
        type="file"
        accept=".x31,.X31,.xml"
        aria-label={t.dateiWaehlen}
        className="abrechnung__datei"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void lesen(f);
        }}
      />
      <Button onClick={() => datei.current?.click()} disabled={liest} aria-busy={liest || undefined}>
        {liest ? t.liest : t.einlesen}
      </Button>
      <KopfDialog
        offen={gelesen !== null}
        titel={t.titel}
        {...(gelesen === null ? {} : { beschreibung: gelesen.datei })}
        anfang={{ bezeichnung: gelesen?.datei.replace(/\.[^.]*$/, '') ?? '', datum: null }}
        bestaetigen={t.uebernehmen}
        moeglich={v?.uebernehmbar ?? false}
        onSchliessen={() => {
          setGelesen(null);
        }}
        onBestaetigen={(k) => (v === null ? Promise.resolve(false) : anlegen(k, v.positionen))}
      >
        {v === null ? null : (
          <>
            <p data-testid="x31-zusammenfassung">
              {v.uebernehmbar
                ? t.zusammenfassung(v.positionen.length, naechsteNummer)
                : t.nichtsZuUebernehmen}
            </p>
            {v.ungerechnet > 0 ? <p>{t.ungerechnet(v.ungerechnet)}</p> : null}
            <Befundliste befunde={v.befunde} />
          </>
        )}
      </KopfDialog>
    </>
  );
}
