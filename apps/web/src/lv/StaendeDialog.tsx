// SPDX-License-Identifier: AGPL-3.0-or-later
// LV-Stände (Ticket 48, Punkt 4; ADR 0006): einen Stand anlegen (`LvStandAnlegen` mit Name) und die Stände des LV mit
// Zeitpunkt auflisten (`Speicher.lvStaende.auflisten`). „Öffnen“ zeigt den Stand schreibgeschützt (`LvStandSeite`).

import { Button, Dialog, Eingabefeld } from '@tethys/ui-basis';
import type { LeistungsverzeichnisId, LvBefehl, LvStandUebersicht } from '@tethys/vertrag';
import { useCallback, useEffect, useId, useState } from 'react';
import type { ReactElement } from 'react';
import { texte } from '../historie/texte';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { hrefFuer } from '../ui/route';
import { befehlswegFuer } from './befehlsweg';

const t = texte.staende;

/** Zeitpunkt eines Stands in deutscher Schreibweise (Ortszeit des Browsers). */
export function zeitpunktDe(wann: string): string {
  const d = new Date(wann);
  if (Number.isNaN(d.getTime())) return wann;
  return d.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}

export function standPfad(lvId: LeistungsverzeichnisId, standId: string): string {
  return `/lv/${lvId}/stand/${standId}`;
}

export function StaendeDialog(props: {
  lvId: LeistungsverzeichnisId;
  offen: boolean;
  onSchliessen: () => void;
  senden: (b: LvBefehl) => Promise<boolean>;
  gehe: (pfad: string) => void;
}): ReactElement {
  const { lvId, offen, onSchliessen, senden, gehe } = props;
  const u = useUmgebung();
  const formId = useId();
  const [name, setName] = useState('');
  const [nameFehlt, setNameFehlt] = useState(false);
  const [liste, setListe] = useState<readonly LvStandUebersicht[] | null>(null);

  const laden = useCallback(async () => {
    const r = await u.speicher.lvStaende?.auflisten(lvId);
    setListe(r?.ok ? r.wert : []);
  }, [u, lvId]);

  useEffect(() => {
    if (!offen) return;
    void laden();
    // Undo/Redo eines `LvStandAnlegen` ändert die Liste.
    return befehlswegFuer(u).beiHistorie(() => void laden());
  }, [offen, laden, u]);

  const anlegen = async (): Promise<void> => {
    if (name.trim() === '') {
      setNameFehlt(true);
      return;
    }
    if (await senden({ art: 'LvStandAnlegen', id: u.ids.lvStand(), name: name.trim() })) {
      setName('');
      await laden();
    }
  };

  return (
    <Dialog
      offen={offen}
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={t.titel}
      fuss={<Button onClick={onSchliessen}>{t.schliessen}</Button>}
    >
      {u.speicher.lvStaende === undefined ? (
        <p>{t.nichtVerfuegbar}</p>
      ) : (
        <>
          <form
            id={formId}
            className="lv-staende__formular"
            onSubmit={(e) => {
              e.preventDefault();
              void anlegen();
            }}
          >
            <Eingabefeld
              label={t.name}
              placeholder={t.namePlatzhalter}
              value={name}
              onWertChange={(w) => {
                setName(w);
                setNameFehlt(false);
              }}
              {...(nameFehlt ? { meldung: t.nameFehlt } : {})}
            />
            <Button type="submit" variante="primaer">
              {t.anlegen}
            </Button>
          </form>
          {liste === null ? null : liste.length === 0 ? (
            <p>{t.leer}</p>
          ) : (
            <ul className="lv-staende" aria-label={t.liste}>
              {liste.map((s) => (
                <li key={s.id}>
                  <span className="lv-staende__name">{s.name}</span>
                  <span className="lv-staende__zeit">
                    {t.angelegt} {zeitpunktDe(s.angelegt)}
                  </span>
                  <a
                    className="tx-button tx-button--sekundaer tx-button--sm"
                    href={hrefFuer(standPfad(lvId, s.id))}
                    aria-label={`${t.oeffnen}: ${s.name}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onSchliessen();
                      gehe(standPfad(lvId, s.id));
                    }}
                  >
                    {t.oeffnen}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Dialog>
  );
}
