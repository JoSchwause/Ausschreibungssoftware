// SPDX-License-Identifier: AGPL-3.0-or-later
// „Mengen aus Modell …“ auf der LV-Seite (Ticket 115, X1d, D-53; Einhängestelle in `lv/LvSeite.tsx`): Modell(stand) wählen
// → Vorschau je Position mit Zuordnungen (Vordersatz bisher und neu, Ansatzzeilen, Befunde) → Übernehmen: je geänderter
// Position `MengenansatzSetzen`, alles **ein** Undo-Schritt. Nur im Ausschreibungs-LV (D-53). Lädt nur `bim`, nie three.js.

import { formatiereMengeDe } from '@tethys/dezimal';
import { Auswahl, Button, Dialog, useToast } from '@tethys/ui-basis';
import type {
  BauwerksmodellId,
  BauwerksmodellUebersicht,
  Bauwerksmodell,
  KnotenId,
  LvBefehl,
  LvZustand,
  Menge,
} from '@tethys/vertrag';
import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import type { Ausgang } from '../lv/befehlsweg';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { BefundListe } from './BefundListe';
import { ansatzText } from './darstellung';
import { texte } from './texte';
import { uebernahmeBefehle, uebernahmeVorschau } from './uebernahme';

const t = texte.uebernahme;
const menge = (m: Menge | null, einheit: string): string =>
  m === null ? '–' : `${formatiereMengeDe(m)} ${einheit}`.trim();

export function MengenAusModell({
  zustand,
  folge,
  pruefe,
  zurPosition,
}: {
  zustand: LvZustand;
  /** Befehle als ein Undo-Schritt (wie `folge` der LV-Seite). */
  folge: (bs: readonly LvBefehl[]) => Promise<Ausgang<unknown>[]>;
  pruefe: (a: Ausgang<unknown>) => boolean;
  /** Ticket 122 (PC-a1): Sprung aus einem Befund der Vorschau zur Position im LV (der Dialog schließt). */
  zurPosition?: (knotenId: KnotenId) => void;
}): ReactElement {
  const [offen, setOffen] = useState(false);
  return (
    <>
      <Button
        onClick={() => {
          setOffen(true);
        }}
      >
        {t.knopf}
      </Button>
      {offen ? (
        <MengenDialog
          zustand={zustand}
          folge={folge}
          pruefe={pruefe}
          onSchliessen={() => {
            setOffen(false);
          }}
          {...(zurPosition === undefined ? {} : { zurPosition })}
        />
      ) : null}
    </>
  );
}

function MengenDialog({
  zustand,
  folge,
  pruefe,
  onSchliessen,
  zurPosition,
}: {
  zustand: LvZustand;
  folge: (bs: readonly LvBefehl[]) => Promise<Ausgang<unknown>[]>;
  pruefe: (a: Ausgang<unknown>) => boolean;
  onSchliessen: () => void;
  zurPosition?: (knotenId: KnotenId) => void;
}): ReactElement {
  const u = useUmgebung();
  const { zeige } = useToast();
  const projektId = zustand.leistungsverzeichnis.projektId;
  const [modelle, setModelle] = useState<readonly BauwerksmodellUebersicht[] | null>(null);
  const [id, setId] = useState<string | undefined>(undefined);
  const [modell, setModell] = useState<Bauwerksmodell | null>(null);

  useEffect(() => {
    let aktiv = true;
    void u.speicher.bauwerksmodelle.auflisten(projektId).then((r) => {
      if (!aktiv) return;
      const liste = r.ok ? r.wert : [];
      setModelle(liste);
      if (liste.length === 1) setId(liste[0]?.id);
    });
    return () => {
      aktiv = false;
    };
  }, [u, projektId]);
  useEffect(() => {
    let aktiv = true;
    setModell(null);
    if (id === undefined) return;
    void u.speicher.bauwerksmodelle.laden(id as BauwerksmodellId).then((r) => {
      if (aktiv && r.ok) setModell(r.wert.bauwerksmodell);
    });
    return () => {
      aktiv = false;
    };
  }, [u, id]);

  const vorschau = useMemo(
    () => (modell === null ? null : uebernahmeVorschau(zustand.leistungsverzeichnis.knoten, modell)),
    [modell, zustand.leistungsverzeichnis.knoten],
  );
  const befehle = useMemo(() => (vorschau === null ? [] : uebernahmeBefehle(vorschau)), [vorschau]);

  const uebernehmen = async (): Promise<void> => {
    const aus = await folge(befehle);
    let ok = true;
    for (const a of aus) if (!pruefe(a)) ok = false;
    if (ok) zeige({ titel: t.uebernommen(befehle.length), art: 'erfolg' });
    onSchliessen();
  };

  return (
    <Dialog
      offen
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={t.titel}
      fuss={
        <>
          <Button onClick={onSchliessen}>{t.abbrechen}</Button>
          <Button variante="primaer" disabled={befehle.length === 0} onClick={() => void uebernehmen()}>
            {befehle.length === 0 ? t.nichtsZuTun : t.uebernehmen(befehle.length)}
          </Button>
        </>
      }
    >
      {modelle === null ? (
        <p aria-busy="true">{t.laedt}</p>
      ) : modelle.length === 0 ? (
        <p>{t.keinModell}</p>
      ) : (
        <Auswahl
          label={t.modell}
          wert={id}
          optionen={modelle.map((m) => ({
            wert: m.id,
            label: `${m.name} (${m.datei.dateiname}, ${m.eingelesen})`,
          }))}
          onWertChange={setId}
        />
      )}
      {id !== undefined && vorschau === null ? <p aria-busy="true">{t.laedt}</p> : null}
      {vorschau !== null && vorschau.zeilen.length === 0 ? <p>{t.keinePosition}</p> : null}
      {vorschau !== null && vorschau.zeilen.length > 0 ? (
        <>
          <table className="bim__tabelle" aria-label={t.vorschau}>
            <thead>
              <tr>
                {t.spalten.map((s) => (
                  <th key={s} scope="col">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vorschau.zeilen.map((z) => (
                <tr key={z.positionId}>
                  <td>{z.oz}</td>
                  <td>{z.kurztext}</td>
                  <td className="bim__zahl" data-wert="vorher">
                    {menge(z.vorher, z.einheit)}
                  </td>
                  <td className="bim__zahl" data-wert="nachher">
                    {z.zeilen.length === 0
                      ? t.ohneZeile
                      : z.geaendert
                        ? menge(z.nachher, z.einheit)
                        : t.unveraendert}
                  </td>
                  <td>{ansatzText(z.zeilen)}</td>
                  <td>{z.befunde.map((b) => b.meldung).join('; ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {vorschau.zeilen.some((z) => z.befunde.length > 0) ? (
            <BefundListe
              befunde={vorschau.zeilen.flatMap((z) => z.befunde)}
              beschriftung={texte.zuordnung.befunde}
              {...(zurPosition === undefined
                ? {}
                : {
                    onPositionSprung: (k: KnotenId) => {
                      onSchliessen();
                      zurPosition(k);
                    },
                  })}
            />
          ) : null}
        </>
      ) : null}
    </Dialog>
  );
}
