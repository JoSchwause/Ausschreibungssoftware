// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Einstellungen des Geräts in der Sitzung (Ticket 150; E10, E15, D-73, D-82 M1): Büro, eigene Druckprofile und
// Kostengruppenbezeichnungen. Jede Änderung ist ein Befehl: Kern (`einstellungenBefehlAusfuehren`) → Speicher
// (`einstellungen.anwenden`, Eintrag des Einstellungsprotokolls und ChangeSet in einer Transaktion) → Zustand der Sitzung.
// Erst speichern, dann anzeigen (Q5).
//
// Rückgängig und Wiederholen der Einstellungen sind getrennt von denen des Projekts (D-73 nimmt die Einstellungen aus der
// Undo-Historie des Projekts): eigene Stapel, die Umkehrung ist das getauschte ChangeSet, protokolliert als `Rueckgaengig`
// bzw. `Wiederholen` mit der Kennung des ursprünglichen Eintrags (D-127.8). Wie beim Projekt lebt der Verlauf nur in der
// Sitzung.

import { einstellungenBefehlAusfuehren, einstellungenChangeSetUmkehren } from '@tethys/kern';
import { LEERE_EINSTELLUNGEN } from '@tethys/vertrag';
import type {
  Einstellungen,
  EinstellungenBefehl,
  EinstellungenChangeSet,
  EinstellungenProtokolleintrag,
  ProtokollId,
  Speicherfehler,
} from '@tethys/vertrag';
import type { Ausgang, Umgebung } from '../lv/befehlsweg';

/** Ein geschriebener Befehl an den Einstellungen, wie Rückgängig und Wiederholen ihn brauchen. */
interface Schritt {
  readonly protokollId: ProtokollId;
  readonly changeSet: EinstellungenChangeSet;
}

/** Ergebnis von Rückgängig und Wiederholen der Einstellungen. */
export type Einstellungshistorienausgang =
  | { readonly ok: true }
  | { readonly ok: false; readonly grund: 'leer' }
  | { readonly ok: false; readonly grund: 'speicher'; readonly fehler: Speicherfehler };

const OHNE_SPEICHER: Speicherfehler = {
  code: 'nicht-gefunden',
  meldung: 'Dieser Speicher hält keine Einstellungen.',
};

/** Die zuletzt geladenen Einstellungen, für Leser ohne React (etwa `kosten/bezeichnungen.ts`). */
let zuletzt: Einstellungen | null = null;

/** Die Einstellungen der zuletzt geladenen Sitzung; `null`, solange keine geladen ist. */
export function aktuelleEinstellungen(): Einstellungen | null {
  return zuletzt;
}

/** Die zuletzt geladene Sitzung, für Schreiber ohne React (etwa `kosten/bezeichnungen.ts`). */
let letzteSitzung: EinstellungenSitzung | null = null;

function merkeSitzung(s: EinstellungenSitzung, e: Einstellungen): void {
  letzteSitzung = s;
  zuletzt = e;
}

export function aktuelleEinstellungenSitzung(): EinstellungenSitzung | null {
  return letzteSitzung;
}

export class EinstellungenSitzung {
  #stand: Einstellungen = LEERE_EINSTELLUNGEN;
  #rueck: Schritt[] = [];
  #vor: Schritt[] = [];
  #version = 0;
  #kette: Promise<unknown> = Promise.resolve();
  readonly #hoerer = new Set<() => void>();

  constructor(readonly umgebung: Umgebung) {}

  get zustand(): Einstellungen {
    return this.#stand;
  }

  get kannRueckgaengig(): boolean {
    return this.#rueck.length > 0;
  }

  get kannWiederholen(): boolean {
    return this.#vor.length > 0;
  }

  /** Für `useSyncExternalStore`. */
  readonly abonnieren = (h: () => void): (() => void) => {
    this.#hoerer.add(h);
    return () => {
      this.#hoerer.delete(h);
    };
  };

  /** Ändert sich mit jedem neuen Stand und jedem Stapelwechsel. */
  readonly version = (): number => this.#version;

  /** Liest die gespeicherten Einstellungen (auch nach einer Änderung auf anderem Weg, etwa beim Einlesen einer Projektdatei). */
  laden(): Promise<{ readonly ok: true } | { readonly ok: false; readonly fehler: Speicherfehler }> {
    return this.#reihe(() => this.#laden());
  }

  /** Ein Befehl an den Einstellungen; ein neuer Schritt im Verlauf der Einstellungen (leert Wiederholen). */
  befehl(befehl: EinstellungenBefehl, imVerlauf = true): Promise<Ausgang<Einstellungen>> {
    return this.#reihe(async () => {
      const r = einstellungenBefehlAusfuehren(this.#stand, befehl);
      if (!r.ok) return { ok: false, abweisung: { art: 'befehl', fehler: r.fehler } };
      const e = this.#eintrag(befehl);
      const f = await this.#schreibe(e, r.wert);
      if (f !== null) return { ok: false, abweisung: { art: 'speicher', fehler: f } };
      if (imVerlauf) {
        this.#rueck.push({ protokollId: e.id, changeSet: r.wert });
        this.#vor = [];
      }
      this.#setze(r.wert.einstellungen.nachher);
      return { ok: true, zustand: this.#stand, hinweise: [] };
    });
  }

  rueckgaengig(): Promise<Einstellungshistorienausgang> {
    return this.#reihe(async () => {
      const s = this.#rueck.at(-1);
      if (s === undefined) return { ok: false, grund: 'leer' };
      const cs = einstellungenChangeSetUmkehren(s.changeSet);
      const f = await this.#schreibe(this.#eintrag({ art: 'Rueckgaengig', protokollId: s.protokollId }), cs);
      if (f !== null) return this.#abgewiesen(f);
      this.#rueck.pop();
      this.#vor.push(s);
      this.#setze(cs.einstellungen.nachher);
      return { ok: true };
    });
  }

  wiederholen(): Promise<Einstellungshistorienausgang> {
    return this.#reihe(async () => {
      const s = this.#vor.at(-1);
      if (s === undefined) return { ok: false, grund: 'leer' };
      const f = await this.#schreibe(
        this.#eintrag({ art: 'Wiederholen', protokollId: s.protokollId }),
        s.changeSet,
      );
      if (f !== null) return this.#abgewiesen(f);
      this.#vor.pop();
      this.#rueck.push(s);
      this.#setze(s.changeSet.einstellungen.nachher);
      return { ok: true };
    });
  }

  async #laden(): Promise<{ readonly ok: true } | { readonly ok: false; readonly fehler: Speicherfehler }> {
    const repo = this.umgebung.speicher.einstellungen;
    if (repo === undefined) return { ok: false, fehler: OHNE_SPEICHER };
    const r = await repo.laden();
    if (!r.ok) return r;
    this.#setze(r.wert);
    return { ok: true };
  }

  /** Abgewiesen: Der Schritt bleibt im Verlauf; die Sitzung folgt dem gespeicherten Stand (Q5). */
  async #abgewiesen(f: Speicherfehler): Promise<Einstellungshistorienausgang> {
    await this.#laden();
    return { ok: false, grund: 'speicher', fehler: f };
  }

  #eintrag(befehl: EinstellungenProtokolleintrag['befehl']): EinstellungenProtokolleintrag {
    const u = this.umgebung;
    return { id: u.ids.protokoll(), wer: u.nutzer, wann: u.uhr(), befehl };
  }

  /** Schreibt Eintrag und ChangeSet; `null` heißt geschrieben. */
  async #schreibe(
    e: EinstellungenProtokolleintrag,
    cs: EinstellungenChangeSet,
  ): Promise<Speicherfehler | null> {
    const repo = this.umgebung.speicher.einstellungen;
    if (repo === undefined) return OHNE_SPEICHER;
    const r = await repo.anwenden(e, cs);
    return r.ok ? null : r.fehler;
  }

  #setze(e: Einstellungen): void {
    this.#stand = e;
    merkeSitzung(this, e);
    this.#version += 1;
    for (const h of this.#hoerer) h();
  }

  #reihe<T>(f: () => Promise<T>): Promise<T> {
    const lauf = this.#kette.then(f);
    this.#kette = lauf.catch(() => undefined);
    return lauf;
  }
}

/** Eine Sitzung je Umgebung (also je geöffnetem Speicher): Seitenwechsel behalten den Verlauf der Einstellungen. */
const SITZUNGEN = new WeakMap<Umgebung, EinstellungenSitzung>();

export function einstellungenFuer(u: Umgebung): EinstellungenSitzung {
  let s = SITZUNGEN.get(u);
  if (s === undefined) {
    s = new EinstellungenSitzung(u);
    SITZUNGEN.set(u, s);
  }
  return s;
}
