// SPDX-License-Identifier: AGPL-3.0-or-later
// Summen nach Migration 2 neu rechnen (D-17, Review C1). Version 1 kannte weder Bedarfs- und Wahlsumme noch Pauschal
// ohne Menge (D-37.1); der Kern rechnet nach einer Änderung aber nur Differenzen auf die gespeicherten Summen (A6).
// Deshalb rechnet `speicher` nach dem Schritt auf Version 2 jede gespeicherte Summe vollständig mit dem Kern neu
// (`summenBerechnen`), auf dem Datenbankweg in der Transaktion der Migration, auf dem Dateiweg vor dem Schreiben in der
// Transaktion des Imports. `speicher` rechnet dabei nichts selbst.
//
// Weist der Kern die Daten eines Aggregats ab (Baumregeln, `pruefeLvInvarianten`, oder eine Ausnahme beim Rechnen),
// bleiben Daten und Summen dieses Aggregats, wie sie sind, und es entsteht ein `Migrationsbefund`; die Migration
// bricht nicht ab (Q5: lieber alte Summen als keine Daten).

import { pruefeLvInvarianten, summenBerechnen } from '@tethys/kern';
import type {
  AggregatBezug,
  Angebot,
  AngebotId,
  AuftragsLeistungsverzeichnisId,
  Knoten,
  Leistungsverzeichnis,
  LeistungsverzeichnisId,
  Nachlass,
  Projektdatei,
  Prozent,
  Summenstand,
} from '@tethys/vertrag';
import { fehlerAusAusnahme } from './fehler';
import { leseAngebot, leseAuftragsLvKopf, leseKnoten, leseLvKopf, listeIds } from './lesen';
import { ersetzeSummen } from './schreiben';
import type { Datenbank } from './sql';

/** Ein Aggregat, dessen Summen nicht neu gerechnet wurden, weil der Kern seine Daten abweist (D-17). */
export interface Migrationsbefund {
  readonly aggregat: AggregatBezug;
  readonly meldung: string;
}

/** Was der Kern für die Summen eines Baums braucht. `id` ist die Wurzel (LV oder Auftrags-LV). */
interface Rechenbasis {
  readonly id: string;
  readonly knoten: readonly Knoten[];
  readonly nachlass: Nachlass | null;
  readonly mwstSatz: Prozent;
}

/** Die vollständigen Summen des Kerns oder der Grund, warum er die Daten abweist. */
function rechne(basis: Rechenbasis): { ok: true; summen: Summenstand } | { ok: false; grund: string } {
  // Die Baumregeln sind für LV und Auftrags-LV dieselben; nur die Wurzel heißt anders.
  const fehler = pruefeLvInvarianten({ id: basis.id as LeistungsverzeichnisId, knoten: basis.knoten });
  if (fehler.length > 0) return { ok: false, grund: fehler.join('; ') };
  try {
    return { ok: true, summen: summenBerechnen(basis) };
  } catch (e) {
    return { ok: false, grund: fehlerAusAusnahme(e).meldung };
  }
}

/**
 * Das gedachte LV eines Angebots (R7): die Knoten des LV mit den EP des Bieters (nicht angeboten oder ohne Eintrag:
 * kein EP), Nachlass des Angebots, MwSt-Satz des LV. Version 1 kennt keinen Zuschlagssatz, weder im Angebot noch am LV
 * (Altform); für diese Daten ist das genau die Regel von `vergabe` (`angebotsKnoten`). Nur hier, für Migration 2.
 */
function angebotsbasis(lv: Leistungsverzeichnis, a: Pick<Angebot, 'positionen' | 'nachlass'>): Rechenbasis {
  const eintraege = new Map(a.positionen.map((p) => [p.positionId as string, p]));
  const knoten = lv.knoten.map((k): Knoten => {
    if (k.art !== 'position') return k;
    const p = eintraege.get(k.id);
    return { ...k, einheitspreis: p?.status === 'angeboten' ? p.einheitspreis : null };
  });
  return { id: lv.id, knoten, nachlass: a.nachlass, mwstSatz: lv.mwstSatz };
}

const befund = (aggregat: AggregatBezug, grund: string): Migrationsbefund => ({
  aggregat,
  meldung: `Summen nicht neu berechnet, der Kern weist die Daten ab; die gespeicherten Summen bleiben: ${grund}`,
});

/** Rechnet die Summen jedes Aggregats; `schreibe` bekommt nur, was der Kern annimmt. */
function neuRechnen(
  lvs: readonly Leistungsverzeichnis[],
  angebote: readonly Pick<Angebot, 'id' | 'leistungsverzeichnisId' | 'positionen' | 'nachlass'>[],
  auftraege: readonly (Rechenbasis & { readonly id: AuftragsLeistungsverzeichnisId })[],
  schreibe: (aggregat: AggregatBezug, summen: Summenstand) => void,
): Migrationsbefund[] {
  const befunde: Migrationsbefund[] = [];
  const abgewiesen = new Set<string>();
  const nachId = new Map(lvs.map((lv) => [lv.id as string, lv]));
  const versuche = (aggregat: AggregatBezug, basis: Rechenbasis): boolean => {
    const r = rechne(basis);
    if (r.ok) schreibe(aggregat, r.summen);
    else befunde.push(befund(aggregat, r.grund));
    return r.ok;
  };
  for (const lv of lvs) {
    if (!versuche({ art: 'leistungsverzeichnis', id: lv.id }, lv)) abgewiesen.add(lv.id);
  }
  for (const a of angebote) {
    const aggregat: AggregatBezug = { art: 'angebot', id: a.id };
    const lv = nachId.get(a.leistungsverzeichnisId);
    if (lv === undefined) befunde.push(befund(aggregat, `LV ${a.leistungsverzeichnisId} fehlt`));
    else if (abgewiesen.has(lv.id)) befunde.push(befund(aggregat, `das LV ${lv.id} ist abgewiesen`));
    else versuche(aggregat, angebotsbasis(lv, a));
  }
  for (const a of auftraege) versuche({ art: 'auftrags-leistungsverzeichnis', id: a.id }, a);
  return befunde;
}

/** Dateiweg: die Projektdatei (schon auf Version 2 gehoben und geprüft) mit den Summen des Kerns. */
export function summenDerDateiNeuRechnen(d: Projektdatei): {
  readonly datei: Projektdatei;
  readonly befunde: readonly Migrationsbefund[];
} {
  const neu = new Map<string, Summenstand>();
  const befunde = neuRechnen(
    d.leistungsverzeichnisse.map((z) => z.leistungsverzeichnis),
    d.angebote.map((z) => z.angebot),
    d.auftragsLeistungsverzeichnisse.map((z) => z.auftragsLeistungsverzeichnis),
    (aggregat, summen) => neu.set(aggregat.id, summen),
  );
  return {
    datei: {
      ...d,
      leistungsverzeichnisse: d.leistungsverzeichnisse.map((z) => ({
        ...z,
        summen: neu.get(z.leistungsverzeichnis.id) ?? z.summen,
      })),
      angebote: d.angebote.map((z) => ({ ...z, summen: neu.get(z.angebot.id) ?? z.summen })),
      auftragsLeistungsverzeichnisse: d.auftragsLeistungsverzeichnisse.map((z) => ({
        ...z,
        summen: neu.get(z.auftragsLeistungsverzeichnis.id) ?? z.summen,
      })),
    },
    befunde,
  };
}

/**
 * Datenbankweg: liest alle Aggregate und ersetzt ihre Summen durch die des Kerns. Läuft in der Transaktion der
 * Migration (`migriere`), unmittelbar nach dem Schemaschritt auf Version 2.
 *
 * Gelesen wird mit den Lesefunktionen des aktuellen Stands. Ändert eine spätere Migration `knoten`, `angebotsposition`
 * oder die Summentabellen so, dass diese auf Version 2 nicht mehr lesen, muss dieser Weg mitziehen (die Tests mit einer
 * Datenbank der Version 1 zeigen es).
 */
export function summenDerDatenbankNeuRechnen(db: Datenbank): Migrationsbefund[] {
  const ids = (tabelle: string): string[] => listeIds(db, `SELECT id FROM ${tabelle} ORDER BY id`, []);
  const lvs = ids('leistungsverzeichnis').flatMap((id): Leistungsverzeichnis[] => {
    const kopf = leseLvKopf(db, id as LeistungsverzeichnisId);
    return kopf === null ? [] : [{ ...kopf, knoten: leseKnoten(db, id) }];
  });
  const angebote = ids('angebot').flatMap((id): Angebot[] => {
    const z = leseAngebot(db, id as AngebotId);
    return z === null ? [] : [z.angebot];
  });
  const auftraege = ids('auftrags_lv').flatMap((id) => {
    const kopf = leseAuftragsLvKopf(db, id as AuftragsLeistungsverzeichnisId);
    return kopf === null ? [] : [{ ...kopf, knoten: leseKnoten(db, id) }];
  });
  return neuRechnen(lvs, angebote, auftraege, (aggregat, summen) => {
    ersetzeSummen(db, aggregat.id, summen);
  });
}
