// SPDX-License-Identifier: AGPL-3.0-or-later
// Undo/Redo je Sitzung (ADR 0006, Ticket 48): zwei Stapel aus Schritten. Ein Schritt ist eine Benutzeraktion, also ein
// Befehl oder eine Befehlsfolge (Einfügen aus der Zwischenablage, Übernehmen im Positionsdialog). Jeder Teil eines
// Schritts ist ein geschriebener Befehl mit seinem ChangeSet und dem Protokolleintrag, auf den `Rueckgaengig` und
// `Wiederholen` verweisen. Das Befehlsprotokoll liest die Historie nie (ADR 0009); sie lebt nur im Arbeitsspeicher und
// ist nach dem Neuladen leer.
//
// Die Stapel selbst schreiben nichts. Der Befehlsweg (`befehlsweg.ts`) schreibt die Umkehrungen und meldet zurück, wie
// viele Teile des obersten Schritts geschrieben wurden. Weist der Speicher mitten in einer Folge ab, wird der Schritt
// geteilt: Das Geschriebene wandert auf den anderen Stapel, der Rest bleibt, wo er war. So passt jeder Stapel immer zum
// gespeicherten Stand (der Stapel wird nicht beschädigt).

import type { ChangeSet, ProjektId, Protokolleintrag, ProtokollId } from '@tethys/vertrag';

/** Ein geschriebener Befehl, wie ihn Undo und Redo brauchen. */
export interface Teil {
  /** Eintrag des ursprünglichen Befehls; `Rueckgaengig` und `Wiederholen` verweisen immer hierauf. */
  readonly protokollId: ProtokollId;
  readonly projektId: ProjektId;
  readonly aggregat: Protokolleintrag['aggregat'];
  /** Jede Aggregatart des Vertrags; Umkehrung und Ziel je Art stehen in `arten.ts` (S7). */
  readonly changeSet: ChangeSet;
}

/** Ein Undo-Schritt: die Teile in der Reihenfolge, in der sie geschrieben wurden. */
export type Schritt = readonly Teil[];

/** Mindestens 100 Schritte verlangt das Ticket; ältere fallen heraus. */
export const HISTORIE_GRENZE = 200;

export class Historie {
  #rueck: Schritt[] = [];
  #vor: Schritt[] = [];
  #version = 0;
  readonly #hoerer = new Set<() => void>();

  constructor(readonly grenze: number = HISTORIE_GRENZE) {}

  /** Für `useSyncExternalStore`. */
  readonly abonnieren = (h: () => void): (() => void) => {
    this.#hoerer.add(h);
    return () => {
      this.#hoerer.delete(h);
    };
  };

  /** Ändert sich mit jedem Stapelwechsel (für `useSyncExternalStore`). */
  readonly version = (): number => this.#version;

  get kannRueckgaengig(): boolean {
    return this.#rueck.length > 0;
  }

  get kannWiederholen(): boolean {
    return this.#vor.length > 0;
  }

  /** Zahl der Schritte auf dem Undo- bzw. Redo-Stapel. */
  get tiefe(): { readonly rueck: number; readonly vor: number } {
    return { rueck: this.#rueck.length, vor: this.#vor.length };
  }

  /** Eine neue Benutzeraktion. Leert den Redo-Stapel; eine leere Aktion (nichts geschrieben) zählt nicht. */
  aufnehmen(teile: Schritt): void {
    if (teile.length === 0) return;
    this.#rueck.push(teile);
    if (this.#rueck.length > this.grenze) this.#rueck.splice(0, this.#rueck.length - this.grenze);
    this.#vor = [];
    this.#geaendert();
  }

  /** Der Schritt, den das nächste Rückgängig zurücknimmt (Teile in umgekehrter Reihenfolge zurücknehmen). */
  naechsterRueckgaengig(): Schritt | undefined {
    return this.#rueck.at(-1);
  }

  /** Der Schritt, den das nächste Wiederholen wieder schreibt (Teile in Reihenfolge). */
  naechsterWiederholen(): Schritt | undefined {
    return this.#vor.at(-1);
  }

  /** Die letzten `n` Teile des obersten Undo-Schritts sind zurückgenommen (alle, wenn nichts abgewiesen wurde). */
  zurueckgenommen(n: number): void {
    const s = this.#rueck.at(-1);
    if (s === undefined || n <= 0) return;
    this.#rueck.pop();
    const bleibt = s.slice(0, s.length - n);
    if (bleibt.length > 0) this.#rueck.push(bleibt);
    this.#vor.push(s.slice(s.length - n));
    this.#geaendert();
  }

  /** Die ersten `n` Teile des obersten Redo-Schritts sind wieder geschrieben. */
  wiederholt(n: number): void {
    const s = this.#vor.at(-1);
    if (s === undefined || n <= 0) return;
    this.#vor.pop();
    const bleibt = s.slice(n);
    if (bleibt.length > 0) this.#vor.push(bleibt);
    this.#rueck.push(s.slice(0, n));
    this.#geaendert();
  }

  #geaendert(): void {
    this.#version += 1;
    for (const h of this.#hoerer) h();
  }
}
