// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle der Kostenermittlung aus Formularfeldern (Ticket 89, C3). Der Rand liest de-DE-Text (N4) und Kostengruppennummern;
// eine Eingabe, die nicht lesbar ist, ist ein Feldfehler und kommt nie in einen Befehl (wie eine unlesbare Menge im Grid).
// Beträge sind Nettobeträge mit 2 Stellen (N3); zu viele Stellen weist der Parser am Rand ab.

import { kgLesen } from '@tethys/kosten';
import type {
  Betrag,
  Ergebnis,
  IdQuelle,
  KostenermittlungAnlegen,
  KostenermittlungseintragEntfernen,
  KostenermittlungseintragSetzen,
  KostenermittlungskopfSetzen,
  Kostenermittlungsstufe,
  Kostenermittlungseintrag,
  Kostengruppennummer,
  ProjektId,
} from '@tethys/vertrag';
import { zahlLesen } from '../lv/zahlen';
import { texte } from './texte';

export type Feld = 'nummer' | 'betrag';
export interface Feldfehler {
  readonly feld: Feld;
  readonly meldung: string;
}

/** Eine leere Kostenermittlung; die Einträge folgen mit `KostenermittlungseintragSetzen` (je Eintrag ein Teil) oder aus einer Eingabe. */
export function kostenermittlungAnlegenBefehl(
  ids: IdQuelle,
  projektId: ProjektId,
  name: string,
  stufe: Kostenermittlungsstufe,
  eintraege: readonly Kostenermittlungseintrag[] = [],
): KostenermittlungAnlegen {
  return {
    art: 'KostenermittlungAnlegen',
    kostenermittlung: { id: ids.kostenermittlung(), projektId, stufe, name: name.trim(), eintraege },
  };
}

export function kopfBefehl(name: string, stufe: Kostenermittlungsstufe): KostenermittlungskopfSetzen {
  return { art: 'KostenermittlungskopfSetzen', name: name.trim(), stufe };
}

function nummerLesen(text: string): Ergebnis<Kostengruppennummer, Feldfehler> {
  const r = kgLesen(text);
  return r.ok ? r : { ok: false, fehler: { feld: 'nummer', meldung: texte.editor.fehlerNummer } };
}

/** Ein Eintrag aus den Feldern; Betrag in de-DE (`125.000,00`), Bemerkung leer = keine. */
export function eintragSetzenBefehl(
  nummer: string,
  betrag: string,
  bemerkung: string,
): Ergebnis<KostenermittlungseintragSetzen, Feldfehler> {
  const n = nummerLesen(nummer);
  if (!n.ok) return n;
  const b = zahlLesen('betrag', betrag.trim());
  if (!b.ok) return { ok: false, fehler: { feld: 'betrag', meldung: b.fehler } };
  const text = bemerkung.trim();
  const eintrag: Kostenermittlungseintrag = {
    nummer: n.wert,
    betrag: b.wert as Betrag,
    ...(text === '' ? {} : { bemerkung: text }),
  };
  return { ok: true, wert: { art: 'KostenermittlungseintragSetzen', eintrag } };
}

export function eintragEntfernenBefehl(
  nummer: string,
): Ergebnis<KostenermittlungseintragEntfernen, Feldfehler> {
  const n = nummerLesen(nummer);
  return n.ok ? { ok: true, wert: { art: 'KostenermittlungseintragEntfernen', nummer: n.wert } } : n;
}
