// SPDX-License-Identifier: AGPL-3.0-or-later
// LV-Stände (Ticket 48, Punkt 4; ADR 0006): einen Stand anlegen (`LvStandAnlegen` mit Name) und die Stände des LV mit
// Zeitpunkt auflisten (`Speicher.lvStaende.auflisten`). „Öffnen“ zeigt den Stand schreibgeschützt (`LvStandSeite`).
// Ticket 150 (E8, B-16): umbenennen und löschen (mit Bestätigung, Rückgängig holt den Stand zurück); die Befehle führt
// `historie/staende.ts` aus.

import { Button, Dialog, Eingabefeld } from '@tethys/ui-basis';
import type { LeistungsverzeichnisId, LvBefehl, LvStandUebersicht } from '@tethys/vertrag';
import { useCallback, useEffect, useId, useState } from 'react';
import type { ReactElement } from 'react';
import { lvStandBefehlAnwenden } from '../historie/staende'; // Ticket 150
import { texte } from '../historie/texte';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { hrefFuer } from '../ui/route';
import { befehlswegFuer } from './befehlsweg';
import { useMeldungen } from './meldungen';

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
  const { pruefe } = useMeldungen();
  const umbenennenId = useId();
  const [umbenennen, setUmbenennen] = useState<{ stand: LvStandUebersicht; name: string } | null>(null);
  const [loeschen, setLoeschen] = useState<LvStandUebersicht | null>(null);

  const laden = useCallback(async () => {
    const r = await u.speicher.lvStaende.auflisten(lvId); // v1.3: mechanisch angepasst, Folgeticket (Speicher.lvStaende Pflicht)
    setListe(r.ok ? r.wert : []);
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

  const umbenennenSpeichern = async (): Promise<void> => {
    if (umbenennen === null) return;
    const a = await lvStandBefehlAnwenden(u, {
      art: 'LvStandUmbenennen',
      lvStandId: umbenennen.stand.id,
      name: umbenennen.name.trim(),
    });
    if (!pruefe(a)) return;
    setUmbenennen(null);
    await laden();
  };

  const loeschenBestaetigt = async (): Promise<void> => {
    if (loeschen === null) return;
    const a = await lvStandBefehlAnwenden(u, { art: 'LvStandLoeschen', lvStandId: loeschen.id });
    setLoeschen(null);
    if (pruefe(a)) await laden();
  };

  return (
    <>
      <Dialog
        offen={offen}
        onOffenChange={(o) => {
          if (!o) onSchliessen();
        }}
        titel={t.titel}
        fuss={<Button onClick={onSchliessen}>{t.schliessen}</Button>}
      >
        {/* v1.3: mechanisch angepasst, Folgeticket (Speicher.lvStaende Pflicht): kein Zweig „nicht verfügbar“ mehr;
          die Klammer bleibt, damit der Block nicht neu eingerückt wird (Ticket 67 räumt auf) */}
        {
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
                    <Button
                      groesse="sm"
                      aria-label={t.aktion(t.umbenennen, s.name)}
                      onClick={() => {
                        setUmbenennen({ stand: s, name: s.name });
                      }}
                    >
                      {t.umbenennen}
                    </Button>
                    <Button
                      groesse="sm"
                      variante="gefahr"
                      aria-label={t.aktion(t.loeschen, s.name)}
                      onClick={() => {
                        setLoeschen(s);
                      }}
                    >
                      {t.loeschen}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </>
        }
      </Dialog>
      <Dialog
        offen={umbenennen !== null}
        onOffenChange={(o) => {
          if (!o) setUmbenennen(null);
        }}
        titel={t.umbenennenTitel}
        fuss={
          <>
            <Button
              onClick={() => {
                setUmbenennen(null);
              }}
            >
              {t.abbrechen}
            </Button>
            <Button type="submit" form={umbenennenId} variante="primaer">
              {t.speichern}
            </Button>
          </>
        }
      >
        <form
          id={umbenennenId}
          onSubmit={(e) => {
            e.preventDefault();
            void umbenennenSpeichern();
          }}
        >
          <Eingabefeld
            label={t.neuerStandName}
            value={umbenennen?.name ?? ''}
            onWertChange={(w) => {
              setUmbenennen((x) => (x === null ? x : { ...x, name: w }));
            }}
          />
        </form>
      </Dialog>
      <Dialog
        offen={loeschen !== null}
        onOffenChange={(o) => {
          if (!o) setLoeschen(null);
        }}
        titel={t.loeschenTitel}
        beschreibung={loeschen === null ? '' : t.loeschenFrage(loeschen.name)}
        fuss={
          <>
            <Button
              onClick={() => {
                setLoeschen(null);
              }}
            >
              {t.abbrechen}
            </Button>
            <Button variante="gefahr" onClick={() => void loeschenBestaetigt()}>
              {t.loeschenBestaetigen}
            </Button>
          </>
        }
      />
    </>
  );
}
