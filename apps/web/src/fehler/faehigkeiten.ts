// SPDX-License-Identifier: AGPL-3.0-or-later
// Startprüfung (E13, D-77): Was der Browser können muss, damit Tethys AVA läuft. Geprüft werden Fähigkeiten, nie
// Browsernamen. Die Umgebung wird übergeben (Standard: `globalThis`), damit der Test sie nachbilden kann.

/** Eine Fähigkeit, ohne die die App nicht startet. Reihenfolge = Reihenfolge der Meldung. */
export type Faehigkeit =
  'opfs' | 'worker' | 'modulWorker' | 'kryptografie' | 'webassembly' | 'dateien' | 'textkodierung';

/** Der Ausschnitt aus `globalThis`, den die Prüfung liest. Alles optional: Fehlt es, fehlt die Fähigkeit. */
export interface BrowserUmgebung {
  readonly isSecureContext?: boolean;
  readonly navigator?: { readonly storage?: { readonly getDirectory?: unknown } };
  readonly Worker?: unknown;
  readonly crypto?: { readonly subtle?: unknown; readonly getRandomValues?: unknown };
  readonly WebAssembly?: unknown;
  readonly Blob?: unknown;
  readonly File?: unknown;
  readonly URL?: { readonly createObjectURL?: unknown };
  readonly TextDecoder?: unknown;
  readonly TextEncoder?: unknown;
}

const vorhanden = (x: unknown): boolean => x !== undefined && x !== null;
const funktion = (x: unknown): boolean => typeof x === 'function';

/**
 * Kann der Browser Worker als Module starten (der Speicher-Worker ist ein Modul)? Ein Browser, der das kann, liest die
 * Option `type` schon beim Umwandeln der Argumente; die ungültige Adresse lässt den Aufruf danach scheitern, ohne dass
 * ein Worker entsteht oder etwas geladen wird (auch keine Verletzung der Inhaltsrichtlinie).
 */
function modulWorkerMoeglich(worker: unknown): boolean {
  if (!funktion(worker)) return false;
  let gelesen = false;
  const optionen = {
    get type(): 'module' {
      gelesen = true;
      return 'module';
    },
  };
  try {
    const w = new (worker as new (url: string, o: object) => { terminate(): void })('http://[', optionen);
    w.terminate();
  } catch {
    // erwartet: die Adresse ist absichtlich ungültig
  }
  return gelesen;
}

/** Die fehlenden Fähigkeiten in fester Reihenfolge; leer, wenn alles da ist. */
export function fehlendeFaehigkeiten(g: BrowserUmgebung = globalThis): Faehigkeit[] {
  const fehlt: Faehigkeit[] = [];
  if (!funktion(g.navigator?.storage?.getDirectory)) fehlt.push('opfs');
  if (!funktion(g.Worker)) fehlt.push('worker');
  if (!modulWorkerMoeglich(g.Worker)) fehlt.push('modulWorker');
  if (!vorhanden(g.crypto?.subtle) || !funktion(g.crypto?.getRandomValues)) fehlt.push('kryptografie');
  if (!vorhanden(g.WebAssembly)) fehlt.push('webassembly');
  if (!funktion(g.Blob) || !funktion(g.File) || !funktion(g.URL?.createObjectURL)) fehlt.push('dateien');
  if (!funktion(g.TextDecoder) || !funktion(g.TextEncoder)) fehlt.push('textkodierung');
  return fehlt;
}
