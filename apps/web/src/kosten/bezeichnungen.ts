// SPDX-License-Identifier: AGPL-3.0-or-later
// Bezeichnungen der Kostengruppen als Einstellung des Nutzers (Ticket 89, G-16, C1): Die Texte stammen aus einer CSV, die
// der Nutzer mitbringt; sie stehen nie im Repo. Ticket 150 (E15, D-73): Sie liegen in den Einstellungen des Speichers (und so
// in der Sicherung), nicht mehr im Browserspeicher; geschrieben als Befehl `KostengruppenbezeichnungenSetzen`. Die Seiten lesen
// den Stand der geladenen Einstellungen als CSV-Text wie bisher. Der alte Schlüssel des Browserspeichers wird einmalig
// übernommen (`sicherung/browserablage.ts`) und bleibt stehen.

import { bezeichnungenLesen } from '@tethys/kosten';
import { aktuelleEinstellungen, aktuelleEinstellungenSitzung } from '../historie/einstellungen';
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

/**
 * Merkt die Bezeichnungen des CSV-Texts in den Einstellungen (`null` vergisst sie). Geschrieben wird im Hintergrund über die
 * Sitzung der Einstellungen (Rückgängig der Einstellungen). `false`, wenn keine Einstellungen geladen sind.
 */
export function bezeichnungenMerken(csv: string | null): boolean {
  const s = aktuelleEinstellungenSitzung();
  if (s === null) return false;
  const bezeichnungen = csv === null ? [] : bezeichnungenAlsListe(bezeichnungenLesen(csv).bezeichnungen);
  void s.befehl({ art: 'KostengruppenbezeichnungenSetzen', bezeichnungen });
  return true;
}

/** Nummer → Bezeichnung aus dem CSV-Text; die Befunde des Lesens (übergangene Zeilen) sind für die Anzeige ohne Belang. */
export function bezeichnungenAusCsv(csv: string | null): ReadonlyMap<string, string> {
  if (csv === null) return new Map();
  return bezeichnungenLesen(csv).bezeichnungen;
}
