// SPDX-License-Identifier: AGPL-3.0-or-later
// Das LV als Ganzes: LeistungsverzeichnisAnlegen (Ticket 05) und LeistungsverzeichnisLoeschen (Ticket 30). Beide sind
// Gegenstücke: die Umkehrung des einen ist das andere (`changeSetUmkehren`).
//
// LeistungsverzeichnisAnlegen: leeres LV oder LV mit vollem Inhalt (GAEB-Import, Fixture).
// Der Inhalt wird vollständig gegen die Baumregeln geprüft; das ChangeSet trägt den Kopf und alle Knoten in
// kanonischer Reihenfolge (Eltern vor Kindern) und die vollständigen Summen des neuen LV (Ticket 07).
// Ein Nachlass, der größer als das Netto ist, wird nie abgewiesen (U5, N5); das negative Netto kommt als Hinweis mit.

import type {
  Befehlsfehler,
  Ergebnis,
  LeistungsverzeichnisAnlegen,
  LvChangeSet,
  LvZustand,
} from '@tethys/vertrag';
import { positionMitEinheiten } from './einheit';
import { nein, ok } from './fehler';
import { befehlshinweis, nettoHinweise } from './hinweise';
import { maskePruefen } from './ozregeln';
import { baumfehler, inhaltKopfFehler } from './pruefung';
import { kanonisch, ohneKnoten, ohneWurzel } from './struktur';
import { LEERES_SUMMENVORHER, summenBerechnen, summenDerKnoten } from './summen';

/**
 * Prüft und legt an. Ticket 30: `inhalt.wurzelId` muss `id` sein (`ungueltige-eingabe`, `feld: 'inhalt.wurzelId'`);
 * Knoten der obersten Ebene mit anderer `elternId` weisen die Baumregeln ab. `''` als Einheit wird `null` (v1.2). Eine
 * Maske, die `maskeFehler` beanstandet, wird angenommen (U5, GAEB-Import) und als Hinweis `oz-maske-ungueltig`
 * gemeldet; ein negatives Netto nach Nachlass als Hinweis `netto-nach-nachlass-negativ`.
 */
export function leistungsverzeichnisAnlegen(
  b: LeistungsverzeichnisAnlegen,
): Ergebnis<LvChangeSet, Befehlsfehler> {
  const { inhalt } = b;
  if (inhalt.wurzelId !== b.id) {
    return nein(
      'ungueltige-eingabe',
      `inhalt.wurzelId (${String(inhalt.wurzelId)}) weicht von der Kennung des LV (${b.id}) ab.`,
      undefined,
      'inhalt.wurzelId',
    );
  }
  const kopfFehler = inhaltKopfFehler(inhalt);
  if (kopfFehler) return { ok: false, fehler: kopfFehler };
  const [erster] = baumfehler(b.id, inhalt.knoten);
  if (erster) return { ok: false, fehler: erster };
  // Die Wurzel ist die Kennung des LV und kein Feld des Kopfs (`LvKopf` hat keine `wurzelId`).
  const stamm = ohneWurzel(ohneKnoten(inhalt));
  const knoten = kanonisch(
    b.id,
    inhalt.knoten.map((k) => (k.art === 'position' ? positionMitEinheiten(k) : k)),
  );
  const summen = summenBerechnen({ id: b.id, knoten, nachlass: inhalt.nachlass, mwstSatz: inhalt.mwstSatz });
  const hinweise = [
    ...maskePruefen(inhalt.ozMaske).map((p) =>
      befehlshinweis('oz-maske-ungueltig', p.meldung, undefined, 'ozMaske'),
    ),
    ...nettoHinweise(summen.gesamt),
  ];
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
    ...(hinweise.length === 0 ? {} : { hinweise }),
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
