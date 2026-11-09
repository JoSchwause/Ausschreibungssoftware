// SPDX-License-Identifier: AGPL-3.0-or-later
// Worker-Seite: öffnet die Datenbank, hält den `SpeicherKern` und beantwortet Anfragen nacheinander
// (ein Schreiber, keine Nebenläufigkeit innerhalb der Datenbank).

import type { Ergebnis, Speicherfehler } from '@tethys/vertrag';
import type { GeoeffneteDatenbank } from './backends';
import { fehler, ok } from './ergebnis';
import { fehlerAusAusnahme } from './fehler';
import { SpeicherKern } from './kern';
import { RPC_METHODEN, type OeffnenOptionen, type RpcAnfrage, type RpcAntwort } from './rpc';

export interface WorkerScope {
  postMessage(nachricht: unknown): void;
  addEventListener(art: 'message', f: (e: { readonly data: unknown }) => void): void;
}

export type Oeffner = (optionen: OeffnenOptionen) => Promise<GeoeffneteDatenbank>;

/** Verteiler der Kernmethoden. Nur Namen aus `RPC_METHODEN` sind erreichbar. */
function aufrufen(kern: SpeicherKern, methode: string, args: readonly unknown[]): Ergebnis<unknown, Speicherfehler> {
  if (!(RPC_METHODEN as readonly string[]).includes(methode)) return fehler('unbekannt', `Unbekannte Methode ${methode}.`);
  const f = (kern as unknown as Record<string, (...a: unknown[]) => Ergebnis<unknown, Speicherfehler>>)[methode];
  if (f === undefined) return fehler('unbekannt', `Unbekannte Methode ${methode}.`);
  return f.apply(kern, [...args]);
}

/** Verbindet einen Worker-Kontext mit dem Kern. `oeffner` liefert die Datenbank (OPFS im Browser). */
export function betreibeWorker(scope: WorkerScope, oeffner: Oeffner): void {
  let kern: SpeicherKern | null = null;
  let offen: GeoeffneteDatenbank | null = null;

  const behandle = async (a: RpcAnfrage): Promise<Ergebnis<unknown, Speicherfehler>> => {
    if (a.methode === 'oeffnen') {
      if (kern !== null) return fehler('unbekannt', 'Der Speicher ist schon geöffnet.');
      const optionen = a.args[0] as OeffnenOptionen;
      try {
        offen = await oeffner(optionen);
      } catch (e) {
        return { ok: false, fehler: fehlerAusAusnahme(e) };
      }
      const geoeffnet = SpeicherKern.oeffnen(offen.db);
      if (!geoeffnet.ok) {
        try {
          offen.db.schliessen();
          await offen.freigeben();
        } catch {
          // Der Öffnungsfehler bleibt maßgeblich.
        }
        offen = null;
        return geoeffnet;
      }
      kern = geoeffnet.wert;
      return ok(null);
    }
    if (kern === null || offen === null) return fehler('gesperrt', 'Der Speicher ist nicht geöffnet.');
    if (a.methode === 'schliessen') {
      const zu = kern.schliessen();
      kern = null;
      try {
        await offen.freigeben();
      } catch (e) {
        return { ok: false, fehler: fehlerAusAusnahme(e) };
      } finally {
        offen = null;
      }
      return zu;
    }
    return aufrufen(kern, a.methode, a.args);
  };

  scope.addEventListener('message', (e) => {
    const anfrage = e.data as RpcAnfrage;
    void behandle(anfrage)
      .catch((fehlerWert: unknown): Ergebnis<unknown, Speicherfehler> => ({ ok: false, fehler: fehlerAusAusnahme(fehlerWert) }))
      .then((ergebnis) => {
        const antwort: RpcAntwort = { id: anfrage.id, ergebnis };
        scope.postMessage(antwort);
      });
  });
}
