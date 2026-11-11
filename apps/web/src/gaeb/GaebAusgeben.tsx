// SPDX-License-Identifier: AGPL-3.0-or-later
// „GAEB ausgeben“ auf der LV-Seite (Ticket 49, Punkt 2): Phase und Version wählen, eigene Prüfung und Warnungen über
// Verworfenes (E-11) zeigen, herunterladen. Mit Fehlern: deutlicher Hinweis „Entwurf“ und `_Entwurf` im Dateinamen
// (G-13), aber kein Sperren (U5, ADR 0010).

import { Auswahl, Button, Dialog, useToast } from '@tethys/ui-basis';
import type { LvZustand } from '@tethys/vertrag';
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { Befundliste } from './Befundliste';
import { herunterladen } from './datei';
import { lvAusgeben } from './gaeb';
import { texte } from './texte';
import './gaeb.css';

type Phase = 'X81' | 'X83' | 'X86';
type Version = '3.3' | '3.2';

export function GaebAusgeben({ zustand }: { zustand: LvZustand }): ReactElement {
  const u = useUmgebung();
  const { zeige } = useToast();
  const [offen, setOffen] = useState(false);
  const [phase, setPhase] = useState<Phase>('X83');
  const [version, setVersion] = useState<Version>('3.3');

  // Die Uhr gehört der App (A2): Datum und Uhrzeit der Datei kommen von `u.uhr`, nicht aus dem Paket.
  const ausgabe = useMemo(
    () => (offen ? lvAusgeben(zustand, phase, version, new Date(u.uhr())) : null),
    [offen, zustand, phase, version, u],
  );
  const fehler = ausgabe?.befunde.filter((b) => b.schwere === 'fehler').length ?? 0;

  return (
    <>
      <Button
        onClick={() => {
          setOffen(true);
        }}
      >
        {texte.ausgabe.knopf}
      </Button>
      <Dialog
        offen={offen}
        onOffenChange={setOffen}
        titel={texte.ausgabe.titel}
        fuss={
          <>
            <Button
              onClick={() => {
                setOffen(false);
              }}
            >
              {texte.ausgabe.schliessen}
            </Button>
            <Button
              variante="primaer"
              onClick={() => {
                if (ausgabe === null) return;
                herunterladen(ausgabe.dateiname, ausgabe.xml, 'application/xml');
                zeige({ titel: texte.ausgabe.ausgegeben, beschreibung: ausgabe.dateiname, art: 'erfolg' });
              }}
            >
              {texte.ausgabe.herunterladen}
            </Button>
          </>
        }
      >
        <div className="gaeb__auswahl">
          <Auswahl
            label={texte.ausgabe.phase}
            optionen={(['X81', 'X83', 'X86'] as const).map((p) => ({
              wert: p,
              label: texte.ausgabe.phasen[p],
            }))}
            wert={phase}
            onWertChange={(w) => {
              setPhase(w as Phase);
            }}
          />
          <Auswahl
            label={texte.ausgabe.version}
            optionen={(['3.3', '3.2'] as const).map((v) => ({ wert: v, label: texte.ausgabe.versionen[v] }))}
            wert={version}
            onWertChange={(w) => {
              setVersion(w as Version);
            }}
          />
        </div>
        {ausgabe === null ? null : (
          <>
            {ausgabe.entwurf ? (
              <p className="gaeb__entwurf" role="alert">
                <strong>{texte.ausgabe.entwurfTitel}:</strong> {texte.ausgabe.entwurfText(fehler)}
              </p>
            ) : (
              <p>{texte.ausgabe.ohneFehler}</p>
            )}
            <p>
              {texte.ausgabe.dateiname}: <code data-testid="ausgabe-dateiname">{ausgabe.dateiname}</code>
            </p>
            <Befundliste befunde={ausgabe.befunde} />
          </>
        )}
      </Dialog>
    </>
  );
}
