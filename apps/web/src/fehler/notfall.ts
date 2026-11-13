// SPDX-License-Identifier: AGPL-3.0-or-later
// Notfallsicherung der Fehlerseite (E13): Die Fehlergrenze steht über allen Anbietern und kommt nicht an deren Kontext.
// Der Speicher meldet sich deshalb hier an, solange er offen ist; das offene Projekt steht in der Adresse.

import type { ProjektId, Speicher } from '@tethys/vertrag';
import { sicherungsdateiname } from '../sicherung/dateiname';

let offen: Speicher | null = null;

/** Vom Speicher-Anbieter: der geöffnete Speicher, `null` nach dem Schließen. */
export function speicherMelden(speicher: Speicher | null): void {
  offen = speicher;
}

/** Vom Speicher-Anbieter beim Schließen: meldet ab, wenn dieser Speicher der gemeldete ist. */
export function speicherAbmelden(speicher: Speicher): void {
  if (offen === speicher) offen = null;
}

/** Das Projekt der Adresse (`…/projekt/<id>…`), sonst `null`. */
export function projektAusPfad(pfad: string): ProjektId | null {
  const m = /\/projekt\/([^/]+)/.exec(pfad);
  if (m?.[1] === undefined) return null;
  try {
    return decodeURIComponent(m[1]) as ProjektId;
  } catch {
    return null;
  }
}

/** Ist eine Notfallsicherung möglich (Projekt offen, Speicher lebt)? Dann das Projekt. */
export function sicherbaresProjekt(): ProjektId | null {
  if (offen === null) return null;
  return projektAusPfad(window.location.pathname);
}

function herunterladen(name: string, inhalt: string): void {
  const url = URL.createObjectURL(new Blob([inhalt], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

/** Lädt die Projektdatei des offenen Projekts herunter; `false`, wenn das nicht ging. Wirft nie. */
export async function projektdateiSichern(): Promise<boolean> {
  const speicher = offen;
  const id = sicherbaresProjekt();
  if (speicher === null || id === null) return false;
  try {
    const datei = await speicher.projektdateiExportieren(id);
    if (!datei.ok) return false;
    const projekt = await speicher.projekte.laden(id);
    herunterladen(sicherungsdateiname(projekt.ok ? projekt.wert.name : '', new Date()), datei.wert);
    return true;
  } catch {
    return false;
  }
}
