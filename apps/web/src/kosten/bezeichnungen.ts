// SPDX-License-Identifier: AGPL-3.0-or-later
// Bezeichnungen der Kostengruppen als Einstellung des Nutzers (Ticket 89, G-16, C1): Die Texte stammen aus einer CSV, die
// der Nutzer mitbringt; sie stehen nie im Repo. Ticket 150 (E15, D-73): Sie liegen in den Einstellungen des Speichers (und so
// in der Sicherung), nicht mehr im Browserspeicher; geschrieben als Befehl `KostengruppenbezeichnungenSetzen`. Die Seiten lesen
// den Stand der geladenen Einstellungen als CSV-Text wie bisher. Der alte Schlüssel des Browserspeichers wird einmalig
// übernommen (`sicherung/browserablage.ts`) und bleibt stehen.

import { bezeichnungenLesen } from '@tethys/kosten';
import { aktuelleEinstellungen, aktuelleEinstellungenSitzung } from '../historie/einstellungen';
import type { Abweisung } from '../lv/befehlsweg';
import { bezeichnungenAlsListe } from '../sicherung/browserablage';

/** Schlüssel im Browserspeicher bis Welle 7; nur noch für die einmalige Übernahme gelesen. */
export const BEZEICHNUNGEN_SCHLUESSEL = 'tethys.kosten.bezeichnungen';

const feld = (text: string): string => `"${text.replaceAll('"', '""')}"`;

/** Die Bezeichnungen der Einstellungen als CSV-Text; `null`, wenn es keine gibt oder keine Einstellungen geladen sind. */
export function bezeichnungenGemerkt(): string | null {
  const liste = aktuelleEinstellungen()?.kostengruppenbezeichnungen ?? [];
  if (liste.length === 0) return null;
  return liste.map((k) => `${k.nummer};${feld(k.bezeichnung)}`).join('\n');
}

/** Wie das Merken ausging (Wellen-Review SB2/PB4, Q5): nichts geht still verloren, nichts gilt still als Erfolg. */
export type Merkausgang =
  | { readonly art: 'gemerkt'; readonly anzahl: number }
  /** Die CSV hatte keine lesbare Zeile; geschrieben wurde nichts, die vorhandenen Bezeichnungen bleiben. */
  | { readonly art: 'leer' }
  /** Befehl oder Speicher haben abgewiesen; der Stand ist unverändert. */
  | { readonly art: 'abgewiesen'; readonly abweisung: Abweisung }
  /** Die Einstellungen sind nicht geladen. */
  | { readonly art: 'ohneEinstellungen' };

/**
 * Merkt die Bezeichnungen des CSV-Texts in den Einstellungen (`null` vergisst sie, wie „Bezeichnungen entfernen“); über die
 * Sitzung der Einstellungen, ein Schritt in deren Rückgängig. Eine CSV ohne lesbare Zeile löscht nichts.
 */
export async function bezeichnungenMerken(csv: string | null): Promise<Merkausgang> {
  const s = aktuelleEinstellungenSitzung();
  if (s === null) return { art: 'ohneEinstellungen' };
  const gelesen = csv === null ? null : bezeichnungenLesen(csv).bezeichnungen;
  if (gelesen !== null && gelesen.size === 0) return { art: 'leer' };
  const bezeichnungen = gelesen === null ? [] : bezeichnungenAlsListe(gelesen);
  const a = await s.befehl({ art: 'KostengruppenbezeichnungenSetzen', bezeichnungen });
  return a.ok
    ? { art: 'gemerkt', anzahl: bezeichnungen.length }
    : { art: 'abgewiesen', abweisung: a.abweisung };
}

/** Nummer → Bezeichnung aus dem CSV-Text; die Befunde des Lesens (übergangene Zeilen) sind für die Anzeige ohne Belang. */
export function bezeichnungenAusCsv(csv: string | null): ReadonlyMap<string, string> {
  if (csv === null) return new Map();
  return bezeichnungenLesen(csv).bezeichnungen;
}
