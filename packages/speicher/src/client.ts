// SPDX-License-Identifier: AGPL-3.0-or-later
// Hauptthread-Seite: die asynchrone `Speicher`-Schnittstelle des Vertrags über einen Transport. Der Transport
// ist im Browser ein Worker (OPFS), in Tests auch ein direkter Aufruf des synchronen Kerns.

import type {
  AngebotId,
  AufmassId,
  AuftragsLeistungsverzeichnisId,
  ChangeSet,
  KostenermittlungId,
  Ergebnis,
  LeistungsverzeichnisId,
  LvStandId,
  Persistenzstatus,
  ProjektId,
  Protokolleintrag,
  RechnungId,
  Speicher,
  Speicherfehler,
} from '@tethys/vertrag';
import { fehler } from './ergebnis';
import { fehlerAusAusnahme } from './fehler';
import type { SpeicherKern } from './kern';
import type { OeffnenOptionen, RpcAnfrage, RpcAntwort, RpcMethode, WorkerLike } from './rpc';
import type { Migrationsbefund } from './summenmigration';

/** Schickt eine Anfrage und liefert die Antwort als Wert. Wirft nie. */
export type Transport = (
  methode: RpcAnfrage['methode'],
  args: readonly unknown[],
) => Promise<Ergebnis<unknown, Speicherfehler>>;

/** Teil von `StorageManager`, den wir brauchen (injizierbar für Tests). */
export interface SpeicherVerwaltung {
  persist(): Promise<boolean>;
  persisted(): Promise<boolean>;
}

/**
 * Der geöffnete Speicher: die Schnittstelle des Vertrags (`schliessen` gehört seit v1.1a dazu) und die Befunde der
 * Migrationen (D-17). Nach `schliessen` liefert jeder Aufruf `gesperrt` als Fehlerwert, auch ein zweites `schliessen`;
 * nur `persistenzstatus` antwortet weiter, weil er die Datenbank nicht braucht und keinen Fehlerwert kennt.
 */
export type GeoeffneterSpeicher = Speicher & {
  /** Aggregate, deren Summen eine Migration nicht neu rechnen konnte (D-17); ihre Daten sind unverändert. */
  migrationsbefunde(): Promise<Ergebnis<readonly Migrationsbefund[], Speicherfehler>>;
};

function standardVerwaltung(): SpeicherVerwaltung | null {
  const nav = (globalThis as { navigator?: { storage?: Partial<SpeicherVerwaltung> } }).navigator;
  const s = nav?.storage;
  return s?.persist !== undefined && s.persisted !== undefined ? (s as SpeicherVerwaltung) : null;
}

const geschlossen = (): Ergebnis<never, Speicherfehler> =>
  fehler('gesperrt', 'Der Speicher ist geschlossen; für weitere Aufrufe muss er neu geöffnet werden.');

/**
 * Baut den `Speicher` über einem Transport. Fragt dauerhaften Speicher an (`storage.persist()`, Spec §9);
 * der Zustand ist über `persistenzstatus()` abrufbar. Ist die API nicht vorhanden oder wirft sie, ist
 * `persistent` `null` beziehungsweise `angefragt` `false`.
 *
 * Ab dem Aufruf von `schliessen` geht keine Anfrage mehr über den Transport; jede liefert `gesperrt`. Danach läuft
 * `nachSchliessen` (beim Worker: `terminate`), auch wenn das Schließen selbst einen Fehler meldet.
 */
export function speicherUeberTransport(
  transport: Transport,
  verwaltung: SpeicherVerwaltung | null = standardVerwaltung(),
  nachSchliessen: () => void = () => undefined,
): GeoeffneterSpeicher {
  let zu = false;
  const senden: Transport = (methode, args) =>
    zu ? Promise.resolve(geschlossen()) : transport(methode, args);

  let angefragt = false;
  let anfrage: Promise<void> | null = null;
  const persistenzAnfragen = (): Promise<void> => {
    anfrage ??= (async () => {
      if (verwaltung === null) return;
      try {
        await verwaltung.persist();
        angefragt = true;
      } catch {
        angefragt = false;
      }
    })();
    return anfrage;
  };

  const aufruf = <T>(methode: RpcMethode, ...args: unknown[]): Promise<Ergebnis<T, Speicherfehler>> =>
    senden(methode, args) as Promise<Ergebnis<T, Speicherfehler>>;

  return {
    projekte: {
      auflisten: () => aufruf('projekteAuflisten'),
      laden: (id: ProjektId) => aufruf('projektLaden', id),
    },
    leistungsverzeichnisse: {
      auflisten: (projektId: ProjektId) => aufruf('lvAuflisten', projektId),
      laden: (id: LeistungsverzeichnisId) => aufruf('lvLaden', id),
    },
    angebote: {
      auflisten: (lvId: LeistungsverzeichnisId) => aufruf('angeboteAuflisten', lvId),
      laden: (id: AngebotId) => aufruf('angebotLaden', id),
    },
    lvStaende: {
      auflisten: (lvId: LeistungsverzeichnisId) => aufruf('lvStaendeAuflisten', lvId),
      laden: (id: LvStandId) => aufruf('lvStandLaden', id),
    },
    auftragsLeistungsverzeichnisse: {
      auflisten: (projektId: ProjektId) => aufruf('auftragsLvAuflisten', projektId),
      laden: (id: AuftragsLeistungsverzeichnisId) => aufruf('auftragsLvLaden', id),
    },
    aufmasse: {
      auflisten: (auftragsLvId: AuftragsLeistungsverzeichnisId) => aufruf('aufmasseAuflisten', auftragsLvId),
      laden: (id: AufmassId) => aufruf('aufmassLaden', id),
    },
    rechnungen: {
      auflisten: (auftragsLvId: AuftragsLeistungsverzeichnisId) =>
        aufruf('rechnungenAuflisten', auftragsLvId),
      laden: (id: RechnungId) => aufruf('rechnungLaden', id),
    },
    kostenermittlungen: {
      auflisten: (projektId: ProjektId) => aufruf('kostenermittlungenAuflisten', projektId),
      laden: (id: KostenermittlungId) => aufruf('kostenermittlungLaden', id),
    },
    anwenden: (eintrag: Protokolleintrag, changeSet: ChangeSet) =>
      senden('anwenden', [eintrag, changeSet]) as Promise<Ergebnis<void, Speicherfehler>>,
    protokoll: (projektId: ProjektId) => aufruf('protokoll', projektId),
    persistenzstatus: async (): Promise<Persistenzstatus> => {
      await persistenzAnfragen();
      if (verwaltung === null) return { angefragt: false, persistent: null };
      try {
        return { angefragt, persistent: await verwaltung.persisted() };
      } catch {
        return { angefragt, persistent: null };
      }
    },
    projektdateiExportieren: (projektId: ProjektId) => aufruf('projektdateiExportieren', projektId),
    projektdateiImportieren: (inhalt: string) => aufruf('projektdateiImportieren', inhalt),
    migrationsbefunde: () => aufruf('migrationsbefunde'),
    schliessen: async () => {
      if (zu) return geschlossen();
      zu = true; // auch Aufrufe, die während des Schließens kommen, gehen nicht mehr hinaus
      const r = (await transport('schliessen', [])) as Ergebnis<void, Speicherfehler>;
      nachSchliessen();
      return r;
    },
  };
}

/** Transport über einen echten oder nachgebildeten Worker. Ein Absturz des Workers beantwortet alle offenen Anfragen mit einem Fehlerwert. */
export function workerTransport(worker: WorkerLike): Transport {
  let zaehler = 0;
  const offen = new Map<number, (e: Ergebnis<unknown, Speicherfehler>) => void>();
  const alleAbbrechen = (grund: string): void => {
    for (const antwort of offen.values()) antwort(fehler('gesperrt', grund));
    offen.clear();
  };
  worker.addEventListener('message', (e) => {
    const a = e.data as RpcAntwort;
    const antwort = offen.get(a.id);
    if (antwort === undefined) return;
    offen.delete(a.id);
    antwort(a.ergebnis);
  });
  worker.addEventListener('error', () => {
    alleAbbrechen('Der Speicher-Worker ist abgestürzt oder konnte nicht gestartet werden.');
  });
  worker.addEventListener('messageerror', () => {
    alleAbbrechen('Der Speicher-Worker hat eine nicht lesbare Nachricht geliefert.');
  });
  return (methode, args) =>
    new Promise((resolve) => {
      const id = ++zaehler;
      offen.set(id, resolve);
      try {
        worker.postMessage({ id, methode, args } satisfies RpcAnfrage);
      } catch (e) {
        offen.delete(id);
        resolve({ ok: false, fehler: fehlerAusAusnahme(e) });
      }
    });
}

export interface SpeicherOeffnenOptionen {
  /** Der gestartete Speicher-Worker (`@tethys/speicher/worker`). */
  readonly worker: WorkerLike;
  /** Name der Datenbank im OPFS. Standard: `projekte`. */
  readonly datenbank?: string;
  /** Für Tests; Standard: `navigator.storage`. */
  readonly verwaltung?: SpeicherVerwaltung | null;
}

/**
 * Öffnet den Speicher im Worker (OPFS, Migrationen) und fragt dauerhaften Speicher an. Gibt einen Fehlerwert
 * zurück, wenn OPFS fehlt, gesperrt ist (`gesperrt`) oder die Datenbank neuer ist als diese Version
 * (`schema-zu-neu`); der Worker wird dann beendet.
 */
export async function speicherOeffnen(
  optionen: SpeicherOeffnenOptionen,
): Promise<Ergebnis<GeoeffneterSpeicher, Speicherfehler>> {
  const senden = workerTransport(optionen.worker);
  const o: OeffnenOptionen = { datenbank: optionen.datenbank ?? 'projekte' };
  const r = await senden('oeffnen', [o]);
  if (!r.ok) {
    optionen.worker.terminate();
    return r;
  }
  const speicher = speicherUeberTransport(senden, optionen.verwaltung, () => {
    optionen.worker.terminate();
  });
  void speicher.persistenzstatus();
  return { ok: true, wert: speicher };
}

/** Transport ohne Worker: ruft den Kern direkt auf (Tests, Skripte). */
export function direktTransport(kern: SpeicherKern): Transport {
  return (methode, args) => {
    if (methode === 'oeffnen') return Promise.resolve(fehler('unbekannt', 'Der Kern ist schon geöffnet.'));
    if (methode === 'schliessen') return Promise.resolve(kern.schliessen());
    const f = (
      kern as unknown as Record<
        string,
        (...a: unknown[]) => Ergebnis<unknown, Speicherfehler> | Promise<Ergebnis<unknown, Speicherfehler>>
      >
    )[methode];
    return Promise.resolve(
      f === undefined ? fehler('unbekannt', `Unbekannte Methode ${methode}.`) : f.apply(kern, [...args]),
    );
  };
}
