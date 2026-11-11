// SPDX-License-Identifier: AGPL-3.0-or-later
// Kostengruppen zuordnen (Ticket 89, C2): Positionen wählen, eine dreistellige Kostengruppe eingeben, für alle gewählten
// setzen. Dieselbe Oberfläche im LV und im Auftrags-LV; der Aufrufer schickt die Befehle (`KostengruppeSetzen`) über seine
// Sitzung als **eine** Aktion, also ein Undo-Schritt. Eine formwidrige Nummer ist ein Feldfehler und kommt nie in einen Befehl
// (wie eine unlesbare Menge); eine Nummer außerhalb jeder Kostenermittlung des Projekts ist ein Hinweis, nie eine Sperre (U5).

import { Button, Dialog, Eingabefeld } from '@tethys/ui-basis';
import type { Kostenermittlung, KostengruppeSetzen, Position, PositionId, ProjektId } from '@tethys/vertrag';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement, RefObject } from 'react';
import { ozText } from '../lv/oztext';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import { inGliederung, kgEingabe, kostengruppenBefehle } from './kostengruppe';
import { kostenermittlungenLaden } from './schreiben';
import { texte } from './texte';
import './kosten.css';

const t = texte.zuordnung;
/** Mehr Zeilen zeigt die Liste nicht auf einmal (große LVs); der Filter grenzt ein. */
const MAX_ZEILEN = 200;

export function KostengruppenDialog({
  offen,
  onSchliessen,
  projektId,
  positionen,
  vorauswahl,
  senden,
}: {
  offen: boolean;
  onSchliessen: () => void;
  projektId: ProjektId;
  /** Alle Positionen in Dokumentreihenfolge. */
  positionen: readonly Position[];
  /** Beim Öffnen gewählt (z. B. die Auswahl im Grid). */
  vorauswahl: readonly PositionId[];
  /** Schickt die Befehle als eine Aktion; `true`, wenn alle angenommen wurden. */
  senden: (befehle: readonly KostengruppeSetzen[]) => Promise<boolean>;
}): ReactElement {
  const u = useUmgebung();
  const [filter, setFilter] = useState('');
  const [kg, setKg] = useState('');
  const [fehler, setFehler] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [gewaehlt, setGewaehlt] = useState<ReadonlySet<PositionId>>(new Set());
  const [ermittlungen, setErmittlungen] = useState<readonly Kostenermittlung[]>([]);
  // Anfangsfokus auf das Feld der Kostengruppe: Eingabefeld nimmt keinen `ref`, also über seinen Rahmen.
  const rahmen = useRef<HTMLDivElement>(null);
  const kgFeld = useMemo<RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        return rahmen.current?.querySelector('input') ?? null;
      },
      set current(_wert) {
        // schreibgeschützt: der Rahmen ist die Quelle
      },
    }),
    [],
  );

  // Beim Öffnen: Auswahl aus dem Grid übernehmen, Kostenermittlungen für den Hinweis laden.
  useEffect(() => {
    if (!offen) return;
    setGewaehlt(new Set(vorauswahl));
    setFilter('');
    setKg('');
    setFehler(null);
    setStatus(null);
    let aktiv = true;
    void kostenermittlungenLaden(u.speicher, projektId).then((r) => {
      if (aktiv && r.ok) setErmittlungen(r.wert.map((z) => z.kostenermittlung));
    });
    return () => {
      aktiv = false;
    };
    // `vorauswahl` ist der Stand beim Öffnen; spätere Änderungen im Grid betreffen den offenen Dialog nicht.
  }, [offen, u, projektId]);

  const sichtbar = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (f === '') return positionen;
    return positionen.filter((p) => `${ozText(p)} ${p.kurztext}`.toLowerCase().includes(f));
  }, [positionen, filter]);
  const gezeigt = sichtbar.slice(0, MAX_ZEILEN);

  const parsed = kgEingabe(kg);
  const hinweis =
    parsed.ok && parsed.wert !== null && !inGliederung(parsed.wert, ermittlungen)
      ? t.hinweisAusserhalb(parsed.wert)
      : null;

  const umschalten = (id: PositionId, an: boolean): void => {
    setGewaehlt((alt) => {
      const neu = new Set(alt);
      if (an) neu.add(id);
      else neu.delete(id);
      return neu;
    });
  };

  const setzen = async (): Promise<void> => {
    setStatus(null);
    const r = kgEingabe(kg);
    if (!r.ok) {
      setFehler(r.fehler);
      return;
    }
    setFehler(null);
    if (gewaehlt.size === 0) {
      setStatus(t.nichtsGewaehlt);
      return;
    }
    const befehle = kostengruppenBefehle(positionen, gewaehlt, r.wert);
    if (befehle.length === 0) {
      setStatus(t.unveraendert);
      return;
    }
    if (await senden(befehle)) {
      setStatus(r.wert === null ? t.entfernt(befehle.length) : t.gesetzt(befehle.length));
      setGewaehlt(new Set());
    }
  };

  return (
    <Dialog
      offen={offen}
      onOffenChange={(o) => {
        if (!o) onSchliessen();
      }}
      titel={t.titel}
      beschreibung={t.einleitung}
      anfangsfokus={kgFeld}
      fuss={<Button onClick={onSchliessen}>{t.schliessen}</Button>}
    >
      <form
        className="zuordnung__werkzeuge"
        onSubmit={(e) => {
          e.preventDefault();
          void setzen();
        }}
      >
        <div ref={rahmen}>
          <Eingabefeld
            label={t.kostengruppe}
            value={kg}
            onWertChange={(w) => {
              setKg(w);
              setFehler(null); // der Feldfehler gilt der alten Eingabe
            }}
            inputMode="numeric"
            {...(fehler === null ? (hinweis === null ? {} : { meldung: hinweis }) : { meldung: fehler })}
          />
        </div>
        <Button type="submit" variante="primaer">
          {t.setzen}
        </Button>
        <Button
          onClick={() => {
            setGewaehlt(new Set(sichtbar.map((p) => p.id)));
          }}
        >
          {t.alleSichtbaren}
        </Button>
        <Button
          onClick={() => {
            setGewaehlt(new Set());
          }}
        >
          {t.keine}
        </Button>
      </form>
      <Eingabefeld label={t.filter} value={filter} onWertChange={setFilter} />
      <p role="status" aria-live="polite" data-testid="zuordnung-status">
        {status ?? t.ausgewaehlt(gewaehlt.size)}
      </p>
      <div className="zuordnung__liste">
        {gezeigt.length === 0 ? (
          <p>{t.keinePositionen}</p>
        ) : (
          <table className="zuordnung__tabelle" aria-label={t.liste}>
            <thead>
              <tr>
                <th aria-label={t.liste} />
                <th>{t.spalteOz}</th>
                <th>{t.spalteKurztext}</th>
                <th>{t.spalteKg}</th>
              </tr>
            </thead>
            <tbody>
              {gezeigt.map((p) => (
                <tr key={p.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={gewaehlt.has(p.id)}
                      aria-label={t.waehlen(`${ozText(p)} ${p.kurztext}`.trim())}
                      onChange={(e) => {
                        umschalten(p.id, e.target.checked);
                      }}
                    />
                  </td>
                  <td>{ozText(p)}</td>
                  <td>{p.kurztext}</td>
                  <td className="zuordnung__kg">{p.kostengruppe ?? t.ohneKg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {sichtbar.length > gezeigt.length ? <p>{t.mehr(sichtbar.length - gezeigt.length)}</p> : null}
    </Dialog>
  );
}
