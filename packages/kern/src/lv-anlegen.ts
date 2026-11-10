// SPDX-License-Identifier: AGPL-3.0-or-later
// LeistungsverzeichnisAnlegen (Ticket 05): leeres LV oder LV mit vollem Inhalt (GAEB-Import, Fixture).
// Der Inhalt wird vollständig gegen die Baumregeln geprüft; das ChangeSet trägt den Kopf und alle Knoten in
// kanonischer Reihenfolge (Eltern vor Kindern) und die vollständigen Summen des neuen LV (Ticket 07).
// Ein Nachlass, der größer als das Netto ist, wird hier nicht abgewiesen (Import blockiert nie, U5); `NachlassSetzen` prüft ihn.

import type { Befehlsfehler, Ergebnis, LeistungsverzeichnisAnlegen, LvChangeSet } from '@tethys/vertrag';
import { ok } from './fehler';
import { baumfehler, inhaltKopfFehler } from './pruefung';
import { kanonisch, ohneKnoten } from './struktur';
import { summenBerechnen } from './summen';

export function leistungsverzeichnisAnlegen(
  b: LeistungsverzeichnisAnlegen,
): Ergebnis<LvChangeSet, Befehlsfehler> {
  const { inhalt } = b;
  const kopfFehler = inhaltKopfFehler(inhalt);
  if (kopfFehler) return { ok: false, fehler: kopfFehler };
  const [erster] = baumfehler(b.id, inhalt.knoten);
  if (erster) return { ok: false, fehler: erster };
  const stamm = ohneKnoten(inhalt);
  const knoten = kanonisch(b.id, inhalt.knoten);
  const summen = summenBerechnen({ id: b.id, knoten, nachlass: inhalt.nachlass, mwstSatz: inhalt.mwstSatz });
  return ok({
    art: 'leistungsverzeichnis',
    leistungsverzeichnisId: b.id,
    kopf: { vorher: null, nachher: { ...stamm, id: b.id, projektId: b.projektId } },
    knoten: { hinzugefuegt: knoten, geaendert: [], entfernt: [] },
    summen: { positionen: summen.positionen, gliederungen: summen.gliederungen, gesamt: summen.gesamt },
  });
}
