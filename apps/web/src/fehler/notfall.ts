// SPDX-License-Identifier: AGPL-3.0-or-later
// Notfallsicherung der Fehlerseite (E13): Die Fehlergrenze steht über allen Anbietern und kommt nicht an deren Kontext.
// Der Speicher meldet sich deshalb hier an, solange er offen ist. Das offene Projekt steht in der Adresse: direkt
// (`/projekt/<id>…`) oder über ein LV (`/lv/<id>…`, LV-Adressen tragen kein Projekt); dann sucht es der Speicher.

import type { LeistungsverzeichnisId, ProjektId, Speicher } from '@tethys/vertrag';
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

/** Worauf die Adresse zeigt: ein Projekt oder ein LV (dessen Projekt der Speicher kennt). */
type Ziel =
  | { readonly art: 'projekt'; readonly id: ProjektId }
  | { readonly art: 'lv'; readonly id: LeistungsverzeichnisId };

/** Die Adresse ohne die Basis des Builds (wie `ui/route.ts`). */
function pfadOhneBasis(): string {
  const basis = import.meta.env.BASE_URL.replace(/\/$/, '');
  const p = window.location.pathname;
  return basis !== '' && p.startsWith(basis) ? p.slice(basis.length) : p;
}

function zielAusPfad(pfad: string): Ziel | null {
  const m = /^\/(projekt|lv)\/([^/]+)/.exec(pfad);
  if (m?.[1] === undefined || m[2] === undefined) return null;
  let id: string;
  try {
    id = decodeURIComponent(m[2]);
  } catch {
    return null;
  }
  return m[1] === 'projekt'
    ? { art: 'projekt', id: id as ProjektId }
    : { art: 'lv', id: id as LeistungsverzeichnisId };
}

/** Ist eine Notfallsicherung möglich: Der Speicher lebt und die Adresse zeigt auf ein Projekt oder ein LV? */
export function sicherungMoeglich(): boolean {
  return offen !== null && zielAusPfad(pfadOhneBasis()) !== null;
}

async function projektVon(speicher: Speicher, ziel: Ziel): Promise<ProjektId | null> {
  if (ziel.art === 'projekt') return ziel.id;
  const projekte = await speicher.projekte.auflisten();
  if (!projekte.ok) return null;
  for (const p of projekte.wert) {
    const lvs = await speicher.leistungsverzeichnisse.auflisten(p.id);
    if (lvs.ok && lvs.wert.some((lv) => lv.id === ziel.id)) return p.id;
  }
  return null;
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
  const ziel = zielAusPfad(pfadOhneBasis());
  if (speicher === null || ziel === null) return false;
  try {
    const id = await projektVon(speicher, ziel);
    if (id === null) return false;
    const datei = await speicher.projektdateiExportieren(id);
    if (!datei.ok) return false;
    const projekt = await speicher.projekte.laden(id);
    herunterladen(sicherungsdateiname(projekt.ok ? projekt.wert.name : '', new Date()), datei.wert);
    return true;
  } catch {
    return false;
  }
}
