// SPDX-License-Identifier: AGPL-3.0-or-later
// „GAEB X86 ausgeben“ auf der Seite des Auftrags-LV (Ticket 64): wie „GAEB ausgeben“ der LV-Seite (Ticket 49), aber nur
// X86 (Auftragserteilung). Eigene Prüfung und Befunde sichtbar, mit Fehlern ein Entwurf, nie gesperrt (U5, G-13).

import { Auswahl, Button, Dialog, useToast } from '@tethys/ui-basis';
import type { AuftragsLvZustand } from '@tethys/vertrag';
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { PdfAusgabe } from '../ausgabe/LvDrucken'; // Ticket 90
import { Befundliste } from '../gaeb/Befundliste';
import { herunterladen } from '../gaeb/datei';
import { texte as gtexte } from '../gaeb/texte';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { alsLvZustand } from './auftrag'; // Ticket 90
import { auftragAusgeben } from './ausgabe';
import { texte } from './texte';

type Version = '3.3' | '3.2';
const t = texte.ausgabe;

export function AuftragAusgeben({ auftrag }: { auftrag: AuftragsLvZustand }): ReactElement {
  const u = useUmgebung();
  const { zeige } = useToast();
  const [offen, setOffen] = useState(false);
  const [version, setVersion] = useState<Version>('3.3');
  const ausgabe = useMemo(
    () => (offen ? auftragAusgeben(auftrag, version, new Date(u.uhr())) : null),
    [offen, auftrag, version, u],
  );
  const fehler = ausgabe?.befunde.filter((b) => b.schwere === 'fehler').length ?? 0;

  const lvZustand = useMemo(() => alsLvZustand(auftrag), [auftrag]); // Ticket 90
  return (
    <>
      <PdfAusgabe zustand={lvZustand} /> {/* Ticket 90: Druckprofile auch für das Auftrags-LV */}
      <Button
        onClick={() => {
          setOffen(true);
        }}
      >
        {t.knopf}
      </Button>
      <Dialog
        offen={offen}
        onOffenChange={setOffen}
        titel={t.titel}
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
