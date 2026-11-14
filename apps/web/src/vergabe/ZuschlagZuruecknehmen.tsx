// SPDX-License-Identifier: AGPL-3.0-or-later
// „Zuschlag zurücknehmen …“ (Ticket 149; E8, D-74, B-16, Q5): Der Dialog zählt beim Öffnen, was am Auftrags-LV hängt. Sperren
// Nachträge, Aufmaßblätter, Rechnungen oder Mängel, nennt er Art, Anzahl und wie sie sich lösen lassen, und bietet nichts an.
// Sonst fragt er ausdrücklich nach und nennt, was nicht sperrt: Vorgänge im Bauzeitenplan (sie behalten den Bezug) und den
// Auftragswert, der in der Kostenkontrolle entfällt. Ein Undo-Schritt holt das Auftrags-LV zurück.

import { formatiereBetragDe } from '@tethys/dezimal';
import { Button, Dialog, useToast } from '@tethys/ui-basis';
import type { AuftragsLvZustand } from '@tethys/vertrag';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { befehlswegFuer } from '../lv/befehlsweg';
import { useMeldungen } from '../lv/meldungen';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { ruecknahmelage, zuschlagZuruecknehmenSchreiben, type Ruecknahmelage } from './schreiben';
import { texte } from './texte';

const t = texte.ruecknahme;

export function ZuschlagZuruecknehmen({
  auftrag,
  onZurueckgenommen,
}: {
  auftrag: AuftragsLvZustand;
  onZurueckgenommen: () => void;
}): ReactElement {
  const u = useUmgebung();
  const weg = befehlswegFuer(u);
  const { pruefe, speicherfehler } = useMeldungen();
  const { zeige } = useToast();
  const [offen, setOffen] = useState(false);
  const [lage, setLage] = useState<Ruecknahmelage | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const name = auftrag.auftragsLeistungsverzeichnis.auftragnehmer?.name ?? '–';

  useEffect(() => {
    if (!offen) return;
    let aktiv = true;
    void ruecknahmelage(u.speicher, auftrag).then((r) => {
      if (!aktiv) return;
      if (r.ok) setLage(r.wert);
      else {
        speicherfehler(r.fehler);
        setOffen(false);
      }
    });
    return () => {
      aktiv = false;
    };
  }, [offen, u, auftrag, speicherfehler]);

  const sperren = lage?.verweise.filter((v) => v.anzahl > 0) ?? [];

  const zuruecknehmen = async (): Promise<void> => {
    setLaeuft(true);
    const r = await zuschlagZuruecknehmenSchreiben(weg, auftrag.auftragsLeistungsverzeichnis.id);
    setLaeuft(false);
    if (!pruefe(r)) return;
    setOffen(false);
    zeige({ titel: t.erfolg, beschreibung: name, art: 'erfolg' });
    onZurueckgenommen();
  };

  return (
    <>
      <Button
        groesse="sm"
        onClick={() => {
          setLage(null);
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
          lage === null || sperren.length > 0 ? (
            <Button
              onClick={() => {
                setOffen(false);
              }}
            >
              {t.schliessen}
            </Button>
          ) : (
            <>
              <Button
                onClick={() => {
                  setOffen(false);
                }}
              >
                {t.abbrechen}
              </Button>
              <Button variante="gefahr" disabled={laeuft} onClick={() => void zuruecknehmen()}>
                {t.bestaetigen}
              </Button>
            </>
          )
        }
      >
        {lage === null ? (
          <p aria-busy="true">{t.laden}</p>
        ) : sperren.length > 0 ? (
          <div role="alert">
            <p>{t.gesperrt}</p>
            <ul aria-label={t.sperrliste}>
              {sperren.map((v) => (
                <li key={v.art}>{t.sperre(v.art, v.anzahl)}</li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <p>{t.frage(name)}</p>
            {lage.vorgaenge.length > 0 ? (
              <>
                <p>{t.vorgaenge(lage.vorgaenge.length)}</p>
                <ul aria-label={t.vorgangsliste}>
                  {lage.vorgaenge.map((v, i) => (
                    <li key={i}>{t.vorgang(v.plan, v.vorgang)}</li>
                  ))}
                </ul>
              </>
            ) : null}
            <p>{t.kosten(formatiereBetragDe(lage.auftragswert))}</p>
          </>
        )}
      </Dialog>
    </>
  );
}
