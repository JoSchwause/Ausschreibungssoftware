// SPDX-License-Identifier: AGPL-3.0-or-later
// Der Befehlsweg der App (A5, U7): Befehl → Kern → `speicher.anwenden(Protokolleintrag, ChangeSet)` → Zustand der App
// fortschreiben → neu zeichnen. Erst speichern, dann anzeigen (Q5): Weist der Speicher ab, bleibt der Zustand der
// Sitzung beim alten Stand und der Aufrufer bekommt den Grund als Wert. Es gibt keinen anderen Schreibweg.

import {
  lvBefehlAusfuehren,
  lvChangeSetAnwenden,
  projektBefehlAusfuehren,
  projektChangeSetAnwenden,
} from '@tethys/kern';
import type {
  Befehlsfehler,
  Befehlshinweis,
  ChangeSet,
  IdQuelle,
  LvBefehl,
  LvZustand,
  NutzerId,
  Projekt,
  ProjektBefehl,
  ProjektId,
  Protokolleintrag,
  Speicher,
  Speicherfehler,
  Zeitstempel,
} from '@tethys/vertrag';

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
  { readonly art: 'befehl'; readonly fehler: Befehlsfehler } | { readonly art: 'speicher'; readonly fehler: Speicherfehler };

export type Ausgang<Z> =
  | { readonly ok: true; readonly zustand: Z; readonly hinweise: readonly Befehlshinweis[] }
  | { readonly ok: false; readonly abweisung: Abweisung };

/** Der eine Nutzer der Einzelplatz-App (ADR 0009). */
export const EINZIGER_NUTZER = 'nutzer' as NutzerId;

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
  cs: ChangeSet,
  neu: () => Z,
): Promise<Ausgang<Z>> {
  const r = await u.speicher.anwenden(e, cs);
  if (!r.ok) return { ok: false, abweisung: { art: 'speicher', fehler: r.fehler } };
  return { ok: true, zustand: neu(), hinweise: cs.hinweise ?? [] };
}

/** Ein LV-Befehl auf dem Weg durch Kern und Speicher. `zustand` ist `null` nur für `LeistungsverzeichnisAnlegen`. */
export async function lvBefehlAnwenden(
  u: Umgebung,
  projektId: ProjektId,
  zustand: LvZustand | null,
  befehl: LvBefehl,
): Promise<Ausgang<LvZustand | null>> {
  const r = lvBefehlAusfuehren(zustand, befehl);
  if (!r.ok) return { ok: false, abweisung: { art: 'befehl', fehler: r.fehler } };
  const cs = r.wert;
  const e = eintrag(u, projektId, { art: 'leistungsverzeichnis', id: cs.leistungsverzeichnisId }, befehl);
  return speichern(u, e, cs, () => lvChangeSetAnwenden(zustand, cs));
}

/** Ein Projektbefehl auf dem Weg durch Kern und Speicher. `zustand` ist `null` nur für `ProjektAnlegen`. */
export async function projektBefehlAnwenden(
  u: Umgebung,
  zustand: Projekt | null,
  befehl: ProjektBefehl,
): Promise<Ausgang<Projekt | null>> {
  const r = projektBefehlAusfuehren(zustand, befehl);
  if (!r.ok) return { ok: false, abweisung: { art: 'befehl', fehler: r.fehler } };
  const cs = r.wert;
  const e = eintrag(u, cs.projektId, { art: 'projekt', id: cs.projektId }, befehl);
  return speichern(u, e, cs, () => projektChangeSetAnwenden(zustand, cs));
}

/**
 * Hält den Zustand eines Aggregats für die Oberfläche und führt Befehle **nacheinander** aus: Jeder Befehl läuft auf
 * dem Stand nach dem vorigen, auch wenn der Nutzer schneller tippt, als der Speicher antwortet. Abonnenten hören nur
 * angenommene Änderungen (erst speichern, dann anzeigen).
 */
export class Sitzung<Z, B> {
  private stand: Z;
  private kette: Promise<unknown> = Promise.resolve();
  private readonly hoerer = new Set<() => void>();

  constructor(
    zustand: Z,
    private readonly ausfuehren: (zustand: Z, befehl: B) => Promise<Ausgang<Z>>,
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
  befehl(befehl: B): Promise<Ausgang<Z>> {
    const lauf = this.kette.then(async () => {
      const a = await this.ausfuehren(this.stand, befehl);
      if (a.ok) {
        this.stand = a.zustand;
        for (const h of this.hoerer) h();
      }
      return a;
    });
    this.kette = lauf.catch(() => undefined);
    return lauf;
  }
}

export type LvSitzung = Sitzung<LvZustand | null, LvBefehl>;
export type ProjektSitzung = Sitzung<Projekt | null, ProjektBefehl>;

export function lvSitzung(u: Umgebung, projektId: ProjektId, zustand: LvZustand | null): LvSitzung {
  return new Sitzung(zustand, (z, b) => lvBefehlAnwenden(u, projektId, z, b));
}

export function projektSitzung(u: Umgebung, zustand: Projekt | null): ProjektSitzung {
  return new Sitzung(zustand, (z, b) => projektBefehlAnwenden(u, z, b));
}
