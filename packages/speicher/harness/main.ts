// SPDX-License-Identifier: AGPL-3.0-or-later
// Prüfstand: macht den Speicher im echten Browser (OPFS im Worker) für Playwright-Tests zugänglich.
// Die Tests laufen unter Node, reichen Daten über `page.evaluate` herein und lesen kleine Ergebnisse heraus.

import type {
  AngebotId,
  ChangeSet,
  Ergebnis,
  LeistungsverzeichnisId,
  LvStandId,
  LvStandUebersicht,
  LvZustand,
  AngebotZustand,
  Persistenzstatus,
  ProjektId,
  Projektdatei,
  Protokolleintrag,
  Speicherfehler,
} from '@tethys/vertrag';
import SpeicherWorker from '@tethys/speicher/worker?worker';
import Schema1Worker from './schema1-worker?worker';
import MessWorker from './mess-worker?worker';
import type { Schreibmodus, Workermessung } from './mess-worker';
import { kanonischKompakt } from '../src/kanonisch';
import { speicherOeffnen, type GeoeffneterSpeicher } from '../src/index';
import { normalisiere } from '../src/testhilfe/normalisiere';

export interface PruefSchritt {
  readonly eintrag: Protokolleintrag;
  readonly changeSet: ChangeSet;
}

type Kurz = { ok: true } | { ok: false; code: string; meldung: string };

const kurz = <T>(r: Ergebnis<T, Speicherfehler>): Kurz =>
  r.ok ? { ok: true } : { ok: false, code: r.fehler.code, meldung: r.fehler.meldung };

const offen = new Map<string, GeoeffneterSpeicher>();
/** Letzte Messung des Mess-Workers je Datenbank (Ticket 52). */
const messungen = new Map<string, Workermessung | null>();
const schreibmodi = new Map<string, Schreibmodus>();

/** Ein `anwenden` in Phasen: Zeit im Client (gesamt), im Worker und je SQL-Anweisung. */
export interface Phasenmessung extends Workermessung {
  readonly gesamtMs: number;
}

function neuerWorker(): Worker {
  return new SpeicherWorker();
}

function hole(name: string): GeoeffneterSpeicher {
  const s = offen.get(name);
  if (s === undefined) throw new Error(`Speicher „${name}“ ist nicht geöffnet.`);
  return s;
}

async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const harness = {
  umgebung: () => ({
    crossOriginIsolated: window.crossOriginIsolated,
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    opfs: typeof navigator.storage.getDirectory === 'function',
  }),

  async oeffnen(name: string): Promise<Kurz> {
    const r = await speicherOeffnen({ worker: neuerWorker(), datenbank: name });
    if (r.ok) offen.set(name, r.wert);
    return kurz(r);
  },

  async schliessen(name: string): Promise<Kurz> {
    const s = hole(name);
    offen.delete(name);
    return kurz(await s.schliessen());
  },

  /** Schreibt die Schritte nacheinander. Bricht beim ersten Fehler ab und meldet ihn. */
  async anwenden(name: string, schritte: readonly PruefSchritt[]): Promise<Kurz & { ms: number }> {
    const s = hole(name);
    const t0 = performance.now();
    for (const x of schritte) {
      const r = kurz(await s.anwenden(x.eintrag, x.changeSet));
      if (!r.ok) return { ...r, ms: performance.now() - t0 };
    }
    return { ok: true, ms: performance.now() - t0 };
  },

  /**
   * Öffnet die Datenbank über den Mess-Worker (Ticket 52): Jede Antwort trägt die Zeit im Worker und je SQL-Anweisung.
   * Der eigene Empfänger steht vor dem des Clients, die Messung liegt also vor, wenn `anwenden` zurückkommt.
   */
  async oeffnenMessend(name: string): Promise<Kurz> {
    const worker = new MessWorker();
    worker.addEventListener(
      'message',
      (e: MessageEvent<{ messung?: Workermessung; schreibmodus?: Schreibmodus }>) => {
        if (e.data.schreibmodus !== undefined) schreibmodi.set(name, e.data.schreibmodus);
        else messungen.set(name, e.data.messung ?? null);
      },
    );
    const r = await speicherOeffnen({ worker, datenbank: name });
    if (r.ok) offen.set(name, r.wert);
    return kurz(r);
  },

  /** Schreibmodus der über den Mess-Worker geöffneten Datenbank (PRAGMA-Werte). */
  schreibmodus(name: string): Schreibmodus | null {
    return schreibmodi.get(name) ?? null;
  },

  /** Wie `anwendenGemessen`, dazu die Phasen aus dem Mess-Worker je Aufruf. */
  async anwendenPhasen(
    name: string,
    schritte: readonly PruefSchritt[],
  ): Promise<{ ok: boolean; messungen: Phasenmessung[] }> {
    const s = hole(name);
    const liste: Phasenmessung[] = [];
    for (const x of schritte) {
      messungen.set(name, null);
      const t0 = performance.now();
      const r = await s.anwenden(x.eintrag, x.changeSet);
      const gesamtMs = performance.now() - t0;
      const m = messungen.get(name);
      if (!r.ok || m === null || m === undefined) return { ok: false, messungen: liste };
      liste.push({ gesamtMs, ...m });
    }
    return { ok: true, messungen: liste };
  },

  /** Wendet jedes ChangeSet einzeln an und misst jeden Aufruf (Speichern bei jedem Befehl, G-35). */
  async anwendenGemessen(
    name: string,
    schritte: readonly PruefSchritt[],
  ): Promise<{ ok: boolean; zeiten: number[] }> {
    const s = hole(name);
    const zeiten: number[] = [];
    for (const x of schritte) {
      const t0 = performance.now();
      const r = await s.anwenden(x.eintrag, x.changeSet);
      zeiten.push(performance.now() - t0);
      if (!r.ok) return { ok: false, zeiten };
    }
    return { ok: true, zeiten };
  },

  async anwendenEinzeln(name: string, eintrag: Protokolleintrag, changeSet: ChangeSet): Promise<Kurz> {
    return kurz(await hole(name).anwenden(eintrag, changeSet));
  },

  async projekte(name: string): Promise<{ id: string; name: string }[]> {
    const r = await hole(name).projekte.auflisten();
    return r.ok ? [...r.wert] : [];
  },

  async protokollAnzahl(name: string, projektId: ProjektId): Promise<number> {
    const r = await hole(name).protokoll(projektId);
    return r.ok ? r.wert.length : -1;
  },

  /** Lädt das LV (gemessen, einschließlich Worker-Nachricht) und vergleicht es kanonisch mit dem Erwarteten. */
  async lvPruefen(
    name: string,
    id: LeistungsverzeichnisId,
    erwartet: LvZustand,
  ): Promise<{ ms: number; gleich: boolean; knoten: number; positionen: number }> {
    const t0 = performance.now();
    const r = await hole(name).leistungsverzeichnisse.laden(id);
    const ms = performance.now() - t0;
    if (!r.ok) return { ms, gleich: false, knoten: -1, positionen: -1 };
    const knoten = r.wert.leistungsverzeichnis.knoten;
    return {
      ms,
      gleich: kanonischKompakt(r.wert) === kanonischKompakt(normalisiere(erwartet)),
      knoten: knoten.length,
      positionen: knoten.filter((k) => k.art === 'position').length,
    };
  },

  async lvLadezeit(name: string, id: LeistungsverzeichnisId, wiederholungen: number): Promise<number[]> {
    const zeiten: number[] = [];
    for (let i = 0; i < wiederholungen; i++) {
      const t0 = performance.now();
      const r = await hole(name).leistungsverzeichnisse.laden(id);
      zeiten.push(performance.now() - t0);
      if (!r.ok) throw new Error(r.fehler.meldung);
    }
    return zeiten;
  },

  /** Zeiten von `leistungsverzeichnisse.auflisten` (LV-Übersicht, Ticket 57) über den Worker, in ms. */
  async lvListezeit(name: string, projekt: ProjektId, wiederholungen: number): Promise<number[]> {
    const zeiten: number[] = [];
    for (let i = 0; i < wiederholungen; i++) {
      const t0 = performance.now();
      const r = await hole(name).leistungsverzeichnisse.auflisten(projekt);
      zeiten.push(performance.now() - t0);
      if (!r.ok) throw new Error(r.fehler.meldung);
    }
    return zeiten;
  },

  /** LV-Stände des LV ohne Zustand (`Speicher.lvStaende.auflisten`). */
  async lvStaende(name: string, id: LeistungsverzeichnisId): Promise<LvStandUebersicht[] | Kurz> {
    const repo = hole(name).lvStaende;
    const r = await repo.auflisten(id);
    return r.ok ? [...r.wert] : kurz(r);
  },

  /** Lädt einen LV-Stand und vergleicht seinen eingefrorenen Zustand kanonisch mit dem Erwarteten. */
  async lvStandPruefen(
    name: string,
    id: LvStandId,
    erwartet: LvZustand,
  ): Promise<Kurz & { gleich?: boolean }> {
    const repo = hole(name).lvStaende;
    const r = await repo.laden(id);
    if (!r.ok) return kurz(r);
    return {
      ok: true,
      gleich: kanonischKompakt(r.wert.zustand) === kanonischKompakt(normalisiere(erwartet)),
    };
  },

  async angebotPruefen(name: string, id: AngebotId, erwartet: AngebotZustand): Promise<boolean> {
    const r = await hole(name).angebote.laden(id);
    return r.ok && kanonischKompakt(r.wert) === kanonischKompakt(normalisiere(erwartet));
  },

  /** Export in einer Datenbank, Import in eine zweite (anderer OPFS-Name), erneuter Export: byte-gleich? */
  async exportImportRunde(
    von: string,
    nach: string,
    projektId: ProjektId,
  ): Promise<{ gleich: boolean; bytes: number; hash: string; exportMs: number; importMs: number }> {
    const t0 = performance.now();
    const e1 = await hole(von).projektdateiExportieren(projektId);
    const t1 = performance.now();
    if (!e1.ok) throw new Error(e1.fehler.meldung);
    const imp = await hole(nach).projektdateiImportieren(e1.wert);
    const t2 = performance.now();
    if (!imp.ok) throw new Error(imp.fehler.meldung);
    const e2 = await hole(nach).projektdateiExportieren(projektId);
    if (!e2.ok) throw new Error(e2.fehler.meldung);
    return {
      gleich: e1.wert === e2.wert,
      bytes: new TextEncoder().encode(e1.wert).length,
      hash: await sha256(e1.wert),
      exportMs: t1 - t0,
      importMs: t2 - t1,
    };
  },

  /** Legt im OPFS eine Datenbank der Schemaversion 1 mit dem Inhalt `datei` an (eigener Worker, danach freigegeben). */
  async schema1Anlegen(
    name: string,
    datei: Projektdatei,
  ): Promise<{ ok: boolean; version?: number; meldung?: string }> {
    const w = new Schema1Worker();
    try {
      return await new Promise((fertig) => {
        w.addEventListener(
          'message',
          (e: MessageEvent<{ ok: boolean; version?: number; meldung?: string }>) => {
            fertig(e.data);
          },
        );
        w.addEventListener('error', (e) => {
          fertig({ ok: false, meldung: e.message });
        });
        w.postMessage({ name, datei });
      });
    } finally {
      w.terminate();
    }
  },

  async exportieren(name: string, projektId: ProjektId): Promise<Kurz & { text?: string }> {
    const r = await hole(name).projektdateiExportieren(projektId);
    return r.ok ? { ok: true, text: r.wert } : kurz(r);
  },

  async importieren(name: string, text: string): Promise<Kurz> {
    return kurz(await hole(name).projektdateiImportieren(text));
  },

  async persistenz(name: string): Promise<Persistenzstatus> {
    return hole(name).persistenzstatus();
  },

  /** Öffnet die Datenbank ein zweites Mal (zweiter Worker): zeigt die Sperre des OPFS-SAH-Pools. */
  async zweitesMalOeffnen(name: string): Promise<Kurz> {
    const r = await speicherOeffnen({ worker: neuerWorker(), datenbank: name, verwaltung: null });
    if (r.ok) await r.wert.schliessen();
    return kurz(r);
  },
};

export type Pruefstand = typeof harness;
(window as unknown as { pruefstand: Pruefstand }).pruefstand = harness;
