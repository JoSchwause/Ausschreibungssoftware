// SPDX-License-Identifier: AGPL-3.0-or-later
// LeistungsverzeichnisAnlegen (Ticket 05): leeres LV oder LV mit vollem Inhalt (GAEB-Import, Fixture).
// Der Inhalt wird vollständig gegen die Baumregeln geprüft; das ChangeSet trägt den Kopf und alle Knoten in
// kanonischer Reihenfolge (Eltern vor Kindern). Summen: leer (Ticket 07).

import type { Befehlsfehler, Ergebnis, LeistungsverzeichnisAnlegen, LvChangeSet } from '@tethys/vertrag';
import { LEERE_SUMMENAENDERUNG } from './changeset';
import { ok } from './fehler';
import { baumfehler, inhaltKopfFehler } from './pruefung';
import { kanonisch, ohneKnoten } from './struktur';

export function leistungsverzeichnisAnlegen(
  b: LeistungsverzeichnisAnlegen,
): Ergebnis<LvChangeSet, Befehlsfehler> {
  const { inhalt } = b;
  const kopfFehler = inhaltKopfFehler(inhalt);
  if (kopfFehler) return { ok: false, fehler: kopfFehler };
  const [erster] = baumfehler(b.id, inhalt.knoten);
  if (erster) return { ok: false, fehler: erster };
  const stamm = ohneKnoten(inhalt);
  return ok({
    art: 'leistungsverzeichnis',
    leistungsverzeichnisId: b.id,
    kopf: { vorher: null, nachher: { ...stamm, id: b.id, projektId: b.projektId } },
    knoten: { hinzugefuegt: kanonisch(b.id, inhalt.knoten), geaendert: [], entfernt: [] },
    summen: LEERE_SUMMENAENDERUNG,
  });
}
