// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Statuszeile der Hülle (Ticket 147, B-30): ob der Browser die Daten dauerhaft hält und wann zuletzt gesichert wurde.
// Den Stand meldet `useStatusmeldung` (unterhalb von Speicher und Sicherung, aus `OrtLader`) über einen kleinen Speicher an
// die Hülle, wie die Namen der Brotkrumen; die Hülle liest ihn mit `useSyncExternalStore`. Ohne React und ohne Speicher.

import type { ProjektId } from '@tethys/vertrag';
import { texte } from './texte';

/** Die letzte Sicherung eines Projekts (ms seit 1970; `null`: noch nie). */
export interface Sicherungsstand {
  readonly id: ProjektId;
  readonly name: string;
  readonly zeit: number | null;
}

export interface Statusstand {
  /** Hält der Browser die Daten dauerhaft? `null`: Der Browser sagt es nicht; `undefined`: noch nicht abgefragt. */
  readonly dauerhaft: boolean | null | undefined;
  /** Die Sicherungen aller Projekte; `null`: noch nicht geladen. */
  readonly sicherungen: readonly Sicherungsstand[] | null;
}

const ANFANG: Statusstand = { dauerhaft: undefined, sicherungen: null };

/** Der gemeldete Stand; Hörer hören nur echte Änderungen. */
export class Statusspeicher {
  #stand: Statusstand = ANFANG;
  readonly #hoerer = new Set<() => void>();

  readonly abonnieren = (h: () => void): (() => void) => {
    this.#hoerer.add(h);
    return () => {
      this.#hoerer.delete(h);
    };
  };

  readonly lesen = (): Statusstand => this.#stand;

  melden(teil: Partial<Statusstand>): void {
    const neu = { ...this.#stand, ...teil };
    if (JSON.stringify(neu) === JSON.stringify(this.#stand)) return;
    this.#stand = neu;
    for (const h of [...this.#hoerer]) h();
  }
}

/** Der eine Stand der Statuszeile der App (ein Fenster, eine Hülle). */
export const statuszeile = new Statusspeicher();

/** Text und Erklärung des Speicherzustands; `null`, solange er nicht abgefragt ist. */
export function speicherAnzeige(
  dauerhaft: Statusstand['dauerhaft'],
): { readonly text: string; readonly hinweis: string } | null {
  const t = texte.huelle.status;
  if (dauerhaft === undefined) return null;
  if (dauerhaft === null) return { text: t.speicher.unbekannt, hinweis: t.speicherHinweis.unbekannt };
  return dauerhaft
    ? { text: t.speicher.dauerhaft, hinweis: t.speicherHinweis.dauerhaft }
    : { text: t.speicher.nichtDauerhaft, hinweis: t.speicherHinweis.nichtDauerhaft };
}

/** Datum und Uhrzeit in deutscher Schreibweise („13.11.2026, 14:05“), in der Zeitzone des Browsers. */
export function zeitpunktText(ms: number, zeitzone?: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(zeitzone === undefined ? {} : { timeZone: zeitzone }),
  }).format(ms);
}

/**
 * Die letzte Sicherung: in einem Projekt dessen eigene, sonst die jüngste aller Projekte mit dem Namen des Projekts.
 * `null`: nichts zu zeigen (die Liste lädt noch, oder es gibt keine Projekte).
 */
export function sicherungAnzeige(
  sicherungen: Statusstand['sicherungen'],
  projektId: ProjektId | null,
  zeitzone?: string,
): string | null {
  const t = texte.huelle.status;
  if (sicherungen === null) return null;
  if (projektId !== null) {
    const zeit = sicherungen.find((s) => s.id === projektId)?.zeit ?? null;
    return zeit === null ? t.nichtGesichert : t.sicherung(zeitpunktText(zeit, zeitzone));
  }
  if (sicherungen.length === 0) return null;
  type Gesichert = Sicherungsstand & { readonly zeit: number };
  const juengste = sicherungen
    .filter((s): s is Gesichert => s.zeit !== null)
    .reduce<Gesichert | null>((m, s) => (m === null || s.zeit > m.zeit ? s : m), null);
  return juengste === null
    ? t.keineSicherung
    : t.sicherungVon(zeitpunktText(juengste.zeit, zeitzone), juengste.name);
}
