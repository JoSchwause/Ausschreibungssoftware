// SPDX-License-Identifier: AGPL-3.0-or-later
// ChangeSet anwenden und umkehren (Ticket 05). Beides sind reine Funktionen; die App nutzt sie für den Zustand,
// der Kern in Tests, `changeSetUmkehren` bereitet Undo vor.

import { NULL_BETRAG } from '@tethys/dezimal';
import type {
  Gesamtsummen,
  Knoten,
  Leistungsverzeichnis,
  LvChangeSet,
  LvChangeSetAnwenden,
  LvZustand,
  Summenaenderung,
  Summenstand,
} from '@tethys/vertrag';
import { kanonisch, ohneKnoten } from './struktur';

/** Keine Summenänderung. Ticket 05 liefert nur diese; Ticket 07 füllt `summen` im ChangeSet. */
export const LEERE_SUMMENAENDERUNG: Summenaenderung = { positionen: [], gliederungen: [], gesamt: null };

/** Alle Gesamtsummen null. Platzhalter für ein neues LV, bis Ticket 07 die Summen berechnet. */
const NULL_GESAMT: Gesamtsummen = {
  netto: NULL_BETRAG,
  nachlass: NULL_BETRAG,
  nettoNachNachlass: NULL_BETRAG,
  mwst: NULL_BETRAG,
  brutto: NULL_BETRAG,
};

export const LEERER_SUMMENSTAND: Summenstand = { positionen: [], gliederungen: [], gesamt: NULL_GESAMT };

function summenAnwenden(alt: Summenstand, cs: LvChangeSet): Summenstand {
  const weg = new Set<string>(cs.knoten.entfernt.map((k) => k.id));
  const s = cs.summen;
  const nichtsZuTun =
    s.positionen.length === 0 &&
    s.gliederungen.length === 0 &&
    s.gesamt === null &&
    !alt.positionen.some((p) => weg.has(p.positionId)) &&
    !alt.gliederungen.some((g) => weg.has(g.gliederungId));
  if (nichtsZuTun) return alt;

  const neuePositionen = new Map(s.positionen.map((p) => [p.positionId as string, p]));
  const neueGliederungen = new Map(s.gliederungen.map((g) => [g.gliederungId as string, g]));
  const positionen = alt.positionen
    .filter((p) => !weg.has(p.positionId))
    .map((p) => neuePositionen.get(p.positionId) ?? p);
  const gliederungen = alt.gliederungen
    .filter((g) => !weg.has(g.gliederungId))
    .map((g) => neueGliederungen.get(g.gliederungId) ?? g);
  const vorhandenP = new Set<string>(positionen.map((p) => p.positionId));
  const vorhandenG = new Set<string>(gliederungen.map((g) => g.gliederungId));
  for (const p of s.positionen) if (!vorhandenP.has(p.positionId)) positionen.push(p);
  for (const g of s.gliederungen) if (!vorhandenG.has(g.gliederungId)) gliederungen.push(g);
  return { positionen, gliederungen, gesamt: s.gesamt ?? alt.gesamt };
}

/**
 * Wendet ein ChangeSet auf einen Zustand an. `zustand: null`: das LV entsteht; dann muss `kopf.nachher` gesetzt sein.
 *
 * - Knoten: entfernen, ersetzen (`geaendert`), hinzufügen; das Ergebnis steht in kanonischer Reihenfolge
 *   (Vorordnung, siehe `struktur.ts`).
 * - Summen (Stand Ticket 05): `zustand.summen` läuft unverändert durch, nur die Einträge entfernter Knoten fallen
 *   weg. Was `cs.summen` an Werten trägt (Ticket 07), ersetzt oder ergänzt die Einträge.
 *
 * Ein ChangeSet, das sich nicht anwenden lässt (kein Zustand und kein neuer Kopf; ein ChangeSet, das das LV
 * entfernt), ist ein Programmfehler, kein erwartbarer Fehler: die Funktion wirft. Der Kern selbst erzeugt solche
 * ChangeSets nicht.
 */
export const lvChangeSetAnwenden: LvChangeSetAnwenden = (zustand, cs) => {
  let kopf: Omit<Leistungsverzeichnis, 'knoten'>;
  if (cs.kopf !== null) {
    if (cs.kopf.nachher === null)
      throw new Error('ChangeSet entfernt das LV: als LvZustand nicht darstellbar.');
    kopf = cs.kopf.nachher;
  } else if (zustand !== null) {
    kopf = ohneKnoten(zustand.leistungsverzeichnis);
  } else {
    throw new Error('ChangeSet ohne Kopf lässt sich nicht auf „kein LV“ anwenden.');
  }

  const weg = new Set<string>(cs.knoten.entfernt.map((k) => k.id));
  const ersatz = new Map<string, Knoten>(cs.knoten.geaendert.map((g) => [g.nachher.id, g.nachher]));
  const rest: Knoten[] = [];
  for (const k of zustand?.leistungsverzeichnis.knoten ?? []) {
    if (weg.has(k.id)) continue;
    rest.push(ersatz.get(k.id) ?? k);
  }
  for (const k of cs.knoten.hinzugefuegt) rest.push(k);

  const knoten = kanonisch(kopf.id, rest);
  const summen = summenAnwenden(zustand?.summen ?? LEERER_SUMMENSTAND, cs);
  return { leistungsverzeichnis: { ...kopf, knoten }, summen } satisfies LvZustand;
};

/**
 * Die Umkehrung eines ChangeSets (Undo): `vorher`/`nachher` und `hinzugefuegt`/`entfernt` vertauscht.
 * `entfernt` steht wie `hinzugefuegt` mit Eltern vor Kindern, so lässt sich die Umkehrung ohne Umsortieren anwenden.
 *
 * Grenze: `Summenaenderung` trägt nur neue Werte, keine Vorwerte; die Umkehrung kann sie nicht herstellen und
 * liefert eine leere `summen`. Solange `summen` leer ist (Ticket 05), ist das verlustfrei; Ticket 07 muss Vorwerte
 * mitführen oder neu berechnen lassen (siehe Ticket 05, „Lücken im Vertrag“).
 * Die Umkehrung eines LV-Anlegens (`kopf.nachher: null`) kann `lvChangeSetAnwenden` nicht anwenden.
 */
export function changeSetUmkehren(cs: LvChangeSet): LvChangeSet {
  return {
    art: cs.art,
    leistungsverzeichnisId: cs.leistungsverzeichnisId,
    kopf: cs.kopf === null ? null : { vorher: cs.kopf.nachher, nachher: cs.kopf.vorher },
    knoten: {
      hinzugefuegt: cs.knoten.entfernt,
      geaendert: cs.knoten.geaendert.map((g) => ({ vorher: g.nachher, nachher: g.vorher })),
      entfernt: cs.knoten.hinzugefuegt,
    },
    summen: LEERE_SUMMENAENDERUNG,
  };
}
