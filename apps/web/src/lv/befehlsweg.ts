// SPDX-License-Identifier: AGPL-3.0-or-later
// Der Befehlsweg der App (A5, U7): Befehl → Kern → `speicher.anwenden(Protokolleintrag, ChangeSet)` → Zustand der App
// fortschreiben → neu zeichnen. Erst speichern, dann anzeigen (Q5): Weist der Speicher ab, bleibt der Zustand der
// Sitzung beim alten Stand und der Aufrufer bekommt den Grund als Wert. Es gibt keinen anderen Schreibweg; auch Undo und
// Redo (Ticket 48) schreiben hier.

import {
  changeSetUmkehren,
  lvBefehlAusfuehren,
  lvChangeSetAnwenden,
  projektBefehlAusfuehren,
  projektChangeSetAnwenden,
  projektChangeSetUmkehren,
} from '@tethys/kern';
import type {
  Befehlsfehler,
  Befehlshinweis,
  IdQuelle,
  LeistungsverzeichnisId,
  LvBefehl,
  LvChangeSet,
  LvZustand,
  NutzerId,
  Projekt,
  ProjektBefehl,
  ProjektChangeSet,
  ProjektId,
  Protokolleintrag,
  Speicher,
  Speicherfehler,
  Zeitstempel,
} from '@tethys/vertrag';
import { Historie, type Teil } from '../historie/historie';
import { ozErgaenzen } from './ozergaenzen';

/** Alles, was der Befehlsweg von außen braucht. Zufall und Uhr gibt es nur hier, nie im Kern (A2). */
export interface Umgebung {
  readonly speicher: Speicher;
  readonly ids: IdQuelle;
  readonly uhr: () => Zeitstempel;
  /** Der eine Nutzer (ADR 0009). */
  readonly nutzer: NutzerId;
}

/** Warum ein Befehl nicht angekommen ist: der Kern hat ihn abgewiesen oder der Speicher hat ihn nicht geschrieben. */
export type Abweisung =
  | { readonly art: 'befehl'; readonly fehler: Befehlsfehler }
  | { readonly art: 'speicher'; readonly fehler: Speicherfehler };

export type Ausgang<Z> =
  | { readonly ok: true; readonly zustand: Z; readonly hinweise: readonly Befehlshinweis[] }
  | { readonly ok: false; readonly abweisung: Abweisung };

/** Der eine Nutzer der Einzelplatz-App (ADR 0009). */
export const EINZIGER_NUTZER = 'nutzer' as NutzerId;

/** Ein angenommener Befehl samt dem, was der Undo-Stapel von ihm braucht. */
type Lauf<Z> =
  (Extract<Ausgang<Z>, { ok: true }> & { readonly teil: Teil }) | Extract<Ausgang<Z>, { ok: false }>;

function eintrag(
  u: Umgebung,
  projektId: ProjektId,
  aggregat: Protokolleintrag['aggregat'],
  befehl: Protokolleintrag['befehl'],
): Protokolleintrag {
  return { id: u.ids.protokoll(), projektId, aggregat, wer: u.nutzer, wann: u.uhr(), befehl };
}

async function speichern<Z>(
  u: Umgebung,
  e: Protokolleintrag,
  cs: LvChangeSet | ProjektChangeSet,
  neu: () => Z,
  hinweise: readonly Befehlshinweis[] = cs.hinweise ?? [],
): Promise<Lauf<Z>> {
  const r = await u.speicher.anwenden(e, cs);
  if (!r.ok) return { ok: false, abweisung: { art: 'speicher', fehler: r.fehler } };
  const teil: Teil = { protokollId: e.id, projektId: e.projektId, aggregat: e.aggregat, changeSet: cs };
  return { ok: true, zustand: neu(), hinweise, teil };
}

/**
 * Ein LV-Befehl auf dem Weg durch Kern und Speicher. `zustand` ist `null` nur für `LeistungsverzeichnisAnlegen`.
 * Fehlt einer neuen Position oder Gliederung die OZ, ergänzt sie der Vorschlag des Kerns (`ozergaenzen.ts`).
 */
export async function lvBefehlAnwenden(
  u: Umgebung,
  projektId: ProjektId,
  zustand: LvZustand | null,
  befehl: LvBefehl,
): Promise<Lauf<LvZustand | null>> {
  const oz = ozErgaenzen(zustand, befehl);
  const r = lvBefehlAusfuehren(zustand, oz.befehl);
  if (!r.ok) return { ok: false, abweisung: { art: 'befehl', fehler: r.fehler } };
  const cs = r.wert;
  const e = eintrag(u, projektId, { art: 'leistungsverzeichnis', id: cs.leistungsverzeichnisId }, oz.befehl);
  const hinweise = oz.hinweis ? [oz.hinweis, ...(cs.hinweise ?? [])] : (cs.hinweise ?? []);
  return speichern(u, e, cs, () => lvChangeSetAnwenden(zustand, cs), hinweise);
}

/** Ein Projektbefehl auf dem Weg durch Kern und Speicher. `zustand` ist `null` nur für `ProjektAnlegen`. */
export async function projektBefehlAnwenden(
  u: Umgebung,
  zustand: Projekt | null,
  befehl: ProjektBefehl,
): Promise<Lauf<Projekt | null>> {
  const r = projektBefehlAusfuehren(zustand, befehl);
  if (!r.ok) return { ok: false, abweisung: { art: 'befehl', fehler: r.fehler } };
  const cs = r.wert;
  const e = eintrag(u, cs.projektId, { art: 'projekt', id: cs.projektId }, befehl);
  return speichern(u, e, cs, () => projektChangeSetAnwenden(zustand, cs));
}

/**
 * Hält den Zustand eines Aggregats für die Oberfläche. Befehle laufen über die gemeinsame Kette des Befehlswegs
 * **nacheinander**: Jeder Befehl läuft auf dem Stand nach dem vorigen, auch wenn der Nutzer schneller tippt, als der
 * Speicher antwortet. Abonnenten hören nur angenommene Änderungen (erst speichern, dann anzeigen).
 */
export class Sitzung<Z, B> {
  private stand: Z;
  private readonly hoerer = new Set<() => void>();

  constructor(
    private readonly weg: Befehlsweg,
    zustand: Z,
    private readonly ausfuehren: (zustand: Z, befehl: B) => Promise<Lauf<Z>>,
  ) {
    this.stand = zustand;
  }

  get zustand(): Z {
    return this.stand;
  }

  /** Für `useSyncExternalStore`. */
  readonly abonnieren = (hoerer: () => void): (() => void) => {
    this.hoerer.add(hoerer);
    return () => {
      this.hoerer.delete(hoerer);
    };
  };

  readonly lesen = (): Z => this.stand;

  /** Reiht den Befehl ein; das Ergebnis kommt, sobald er (nach allen früheren) durch Kern und Speicher ist. */
  async befehl(befehl: B): Promise<Ausgang<Z>> {
    const [a] = await this.folge([befehl]);
    if (a === undefined) throw new Error('Sitzung.befehl: kein Ausgang');
    return a;
  }

  /**
   * Mehrere Befehle aus **einer** Benutzeraktion: nacheinander, jeder auf dem Stand nach dem vorigen, ohne fremde
   * Befehle dazwischen. Die angenommenen bilden einen Undo-Schritt; ein abgewiesener hält die übrigen nicht auf.
   */
  folge(befehle: readonly B[]): Promise<Ausgang<Z>[]> {
    return this.weg.reihe(async () => {
      const ausgaenge: Ausgang<Z>[] = [];
      const teile: Teil[] = [];
      for (const b of befehle) {
        const a = await this.ausfuehren(this.stand, b);
        if (a.ok) {
          teile.push(a.teil);
          this.setze(a.zustand);
          ausgaenge.push({ ok: true, zustand: a.zustand, hinweise: a.hinweise });
        } else ausgaenge.push(a);
      }
      this.weg.historie.aufnehmen(teile);
      return ausgaenge;
    });
  }

  /** Neuer gespeicherter Stand von außen (Undo/Redo hat ein ChangeSet dieses Aggregats geschrieben). */
  setze(zustand: Z): void {
    this.stand = zustand;
    for (const h of this.hoerer) h();
  }
}

export type LvSitzung = Sitzung<LvZustand | null, LvBefehl>;
export type ProjektSitzung = Sitzung<Projekt | null, ProjektBefehl>;

/** Ergebnis von Rückgängig und Wiederholen. `teile` sind die geschriebenen (bei einer Abweisung die vor ihr). */
export type Historienausgang =
  | { readonly ok: true; readonly teile: readonly Teil[] }
  | { readonly ok: false; readonly grund: 'leer' }
  | {
      readonly ok: false;
      readonly grund: 'speicher';
      readonly fehler: Speicherfehler;
      readonly teile: readonly Teil[];
    };

const umkehren = (cs: LvChangeSet | ProjektChangeSet): LvChangeSet | ProjektChangeSet =>
  cs.art === 'leistungsverzeichnis' ? changeSetUmkehren(cs) : projektChangeSetUmkehren(cs);

/**
 * Der eine Schreibweg der App (A5, U7) samt Undo/Redo je Sitzung (ADR 0006). Alle Schreibvorgänge, Befehle wie
 * Umkehrungen, laufen über eine Kette, damit keiner einen Stand überholt. Rückgängig: der Kern kehrt die ChangeSets des
 * Schritts in umgekehrter Reihenfolge um, der Speicher schreibt jede Umkehrung als `Rueckgaengig { protokollId }` (je
 * Befehl ein Eintrag, D-12). Wiederholen schreibt die ursprünglichen ChangeSets als `Wiederholen` mit derselben
 * `protokollId`. Undo liest nie das Befehlsprotokoll (ADR 0009). Jede Umkehrung wird sofort gespeichert (U7).
 */
export class Befehlsweg {
  readonly historie: Historie;
  #kette: Promise<unknown> = Promise.resolve();
  readonly #lvSitzungen = new Map<string, Set<LvSitzung>>();
  readonly #hoerer = new Set<(teil: Teil) => void>();

  constructor(
    readonly umgebung: Umgebung,
    grenze?: number,
  ) {
    this.historie = new Historie(grenze);
  }

  /** Reiht `f` in die gemeinsame Kette ein. */
  reihe<T>(f: () => Promise<T>): Promise<T> {
    const lauf = this.#kette.then(f);
    this.#kette = lauf.catch(() => undefined);
    return lauf;
  }

  lv(projektId: ProjektId, zustand: LvZustand | null): LvSitzung {
    return new Sitzung(this, zustand, (z, b) => lvBefehlAnwenden(this.umgebung, projektId, z, b));
  }

  projekt(zustand: Projekt | null): ProjektSitzung {
    return new Sitzung(this, zustand, (z, b) => projektBefehlAnwenden(this.umgebung, z, b));
  }

  /** Eine offene LV-Seite: Undo und Redo an diesem LV schreiben ihren Zustand fort. */
  anmelden(lvId: LeistungsverzeichnisId, s: LvSitzung): () => void {
    const menge = this.#lvSitzungen.get(lvId) ?? new Set<LvSitzung>();
    menge.add(s);
    this.#lvSitzungen.set(lvId, menge);
    return () => {
      menge.delete(s);
    };
  }

  /** Nach jedem Teil, den Undo oder Redo geschrieben hat (Seiten, die aus dem Speicher laden, laden neu). */
  beiHistorie(h: (teil: Teil) => void): () => void {
    this.#hoerer.add(h);
    return () => {
      this.#hoerer.delete(h);
    };
  }

  rueckgaengig(): Promise<Historienausgang> {
    return this.reihe(async () => {
      const s = this.historie.naechsterRueckgaengig();
      if (s === undefined) return { ok: false, grund: 'leer' };
      const geschrieben: Teil[] = [];
      for (const t of [...s].reverse()) {
        const f = await this.#schreibe(t, umkehren(t.changeSet), {
          art: 'Rueckgaengig',
          protokollId: t.protokollId,
        });
        if (f !== null) {
          this.historie.zurueckgenommen(geschrieben.length);
          return { ok: false, grund: 'speicher', fehler: f, teile: geschrieben };
        }
        geschrieben.push(t);
      }
      this.historie.zurueckgenommen(geschrieben.length);
      return { ok: true, teile: geschrieben };
    });
  }

  wiederholen(): Promise<Historienausgang> {
    return this.reihe(async () => {
      const s = this.historie.naechsterWiederholen();
      if (s === undefined) return { ok: false, grund: 'leer' };
      const geschrieben: Teil[] = [];
      for (const t of s) {
        const f = await this.#schreibe(t, t.changeSet, { art: 'Wiederholen', protokollId: t.protokollId });
        if (f !== null) {
          this.historie.wiederholt(geschrieben.length);
          return { ok: false, grund: 'speicher', fehler: f, teile: geschrieben };
        }
        geschrieben.push(t);
      }
      this.historie.wiederholt(geschrieben.length);
      return { ok: true, teile: geschrieben };
    });
  }

  /** Schreibt ein ChangeSet als Historienbefehl und führt offene Sitzungen nach; `null` heißt geschrieben. */
  async #schreibe(
    t: Teil,
    cs: LvChangeSet | ProjektChangeSet,
    befehl: Protokolleintrag['befehl'],
  ): Promise<Speicherfehler | null> {
    const e = eintrag(this.umgebung, t.projektId, t.aggregat, befehl);
    const r = await this.umgebung.speicher.anwenden(e, cs);
    if (!r.ok) return r.fehler;
    if (cs.art === 'leistungsverzeichnis') {
      const anlegen = cs.kopf !== null && cs.kopf.vorher === null;
      for (const s of this.#lvSitzungen.get(cs.leistungsverzeichnisId) ?? []) {
        if (s.zustand !== null || anlegen) s.setze(lvChangeSetAnwenden(s.zustand, cs));
      }
    }
    for (const h of this.#hoerer) h(t);
    return null;
  }
}

/** Ein Befehlsweg je Umgebung (also je geöffnetem Speicher): Seitenwechsel behalten den Undo-Stapel. */
const WEGE = new WeakMap<Umgebung, Befehlsweg>();

export function befehlswegFuer(u: Umgebung): Befehlsweg {
  let w = WEGE.get(u);
  if (w === undefined) {
    w = new Befehlsweg(u);
    WEGE.set(u, w);
  }
  return w;
}

export function lvSitzung(u: Umgebung, projektId: ProjektId, zustand: LvZustand | null): LvSitzung {
  return befehlswegFuer(u).lv(projektId, zustand);
}

export function projektSitzung(u: Umgebung, zustand: Projekt | null): ProjektSitzung {
  return befehlswegFuer(u).projekt(zustand);
}
