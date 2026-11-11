// SPDX-License-Identifier: AGPL-3.0-or-later
// „Als X31 ausgeben“ je Aufmaßblatt (Ticket 87, M3): wie „GAEB X86 ausgeben“ des Auftrags-LV. Eigene Prüfung des
// Writers (Ticket 83) sichtbar, mit Fehlern ein Entwurf, nie gesperrt (U5, G-13, ADR 0010).

import { Auswahl, Button, Dialog, useToast } from '@tethys/ui-basis';
import type { Aufmass, AuftragsLvZustand } from '@tethys/vertrag';
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { Befundliste } from '../gaeb/Befundliste';
import { herunterladen } from '../gaeb/datei';
import { texte as gtexte } from '../gaeb/texte';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { texte } from './texte';
import { blattAlsX31 } from './x31';

type Version = '3.3' | '3.2';
const t = texte.x31;

export function X31Ausgeben({ blatt, auftrag }: { blatt: Aufmass; auftrag: AuftragsLvZustand }): ReactElement {
  const u = useUmgebung();
  const { zeige } = useToast();
  const [offen, setOffen] = useState(false);
  const [version, setVersion] = useState<Version>('3.3');
  const ausgabe = useMemo(
    () => (offen ? blattAlsX31(blatt, auftrag, version, new Date(u.uhr())) : null),
    [offen, blatt, auftrag, version, u],
  );
  const fehler = ausgabe?.befunde.filter((b) => b.schwere === 'fehler').length ?? 0;

  return (
    <>
      <Button
        onClick={() => {
          setOffen(true);
        }}
      >
        {t.ausgeben}
      </Button>
      <Dialog
        offen={offen}
        onOffenChange={setOffen}
        titel={t.ausgabeTitel}
        fuss={
          <>
            <Button
              onClick={() => {
                setOffen(false);
              }}
            >
              {t.schliessen}
            </Button>
            <Button
              variante="primaer"
              onClick={() => {
                if (ausgabe === null) return;
                herunterladen(ausgabe.dateiname, ausgabe.xml, 'application/xml');
                zeige({ titel: t.ausgegeben, beschreibung: ausgabe.dateiname, art: 'erfolg' });
              }}
            >
              {t.herunterladen}
            </Button>
          </>
        }
      >
        <Auswahl
          label={t.version}
          optionen={(['3.3', '3.2'] as const).map((v) => ({ wert: v, label: gtexte.ausgabe.versionen[v] }))}
          wert={version}
          onWertChange={(w) => {
            setVersion(w as Version);
          }}
        />
        {ausgabe === null ? null : (
          <>
            {ausgabe.entwurf ? (
              <p className="gaeb__entwurf" role="alert">
                <strong>{gtexte.ausgabe.entwurfTitel}:</strong> {gtexte.ausgabe.entwurfText(fehler)}
              </p>
            ) : (
              <p>{gtexte.ausgabe.ohneFehler}</p>
            )}
            <p>
              {gtexte.ausgabe.dateiname}: <code data-testid="ausgabe-dateiname">{ausgabe.dateiname}</code>
            </p>
            <Befundliste befunde={ausgabe.befunde} />
          </>
        )}
      </Dialog>
    </>
  );
}
