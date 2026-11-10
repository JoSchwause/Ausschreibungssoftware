// SPDX-License-Identifier: AGPL-3.0-or-later
// Das LV als Ganzes: LeistungsverzeichnisAnlegen (Ticket 05) und LeistungsverzeichnisLoeschen (Ticket 30). Beide sind
// Gegenstücke: die Umkehrung des einen ist das andere (`changeSetUmkehren`).
//
// LeistungsverzeichnisAnlegen: leeres LV oder LV mit vollem Inhalt (GAEB-Import, Fixture).
// Der Inhalt wird vollständig gegen die Baumregeln geprüft; das ChangeSet trägt den Kopf und alle Knoten in
// kanonischer Reihenfolge (Eltern vor Kindern) und die vollständigen Summen des neuen LV (Ticket 07).
// Ein Nachlass, der größer als das Netto ist, wird hier nicht abgewiesen (Import blockiert nie, U5); `NachlassSetzen` prüft ihn.

import type {
  Befehlsfehler,
  Ergebnis,
  LeistungsverzeichnisAnlegen,
  LvChangeSet,
  LvZustand,
} from '@tethys/vertrag';
import { ok } from './fehler';
import { baumfehler, inhaltKopfFehler } from './pruefung';
import { kanonisch, ohneKnoten } from './struktur';
import { LEERES_SUMMENVORHER, summenBerechnen, summenDerKnoten } from './summen';

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
    summen: {
      positionen: summen.positionen,
      gliederungen: summen.gliederungen,
      gesamt: summen.gesamt,
      vorher: LEERES_SUMMENVORHER,
    },
  });
}

/**
 * `LeistungsverzeichnisLoeschen` (v1.1a; der Befehl trägt keine Felder): das ChangeSet trägt den vollen Stand, damit die Umkehrung das LV ohne
 * Vorzustand wieder anlegt. `kopf.nachher: null`, alle Knoten unter `knoten.entfernt` (kanonisch: Eltern vor Kindern),
 * keine neuen Summen, `summen.vorher` mit `gesamt` und allen Summen unter `entfernt`. Ein Papierkorb (v1.2) steht unter
 * `papierkorb.entfernt`. Ob Angebote, Auftrags-LV oder LV-Stände am LV hängen, prüft `speicher` (`konflikt`).
 */
export function leistungsverzeichnisLoeschen(z: LvZustand): Ergebnis<LvChangeSet, Befehlsfehler> {
  const lv = z.leistungsverzeichnis;
  const papierkorb = z.papierkorb ?? [];
  return ok({
    art: 'leistungsverzeichnis',
    leistungsverzeichnisId: lv.id,
    kopf: { vorher: ohneKnoten(lv), nachher: null },
    knoten: { hinzugefuegt: [], geaendert: [], entfernt: lv.knoten },
    summen: {
      positionen: [],
      gliederungen: [],
      gesamt: null,
      vorher: {
        positionen: [],
        gliederungen: [],
        gesamt: z.summen.gesamt,
        entfernt: summenDerKnoten(z.summen, lv.knoten),
      },
    },
    ...(papierkorb.length === 0
      ? {}
      : { papierkorb: { hinzugefuegt: [], geaendert: [], entfernt: papierkorb } }),
  });
}
