// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests (Node und Browser-Prüfstand): schreibt eine Projektdatei in eine Datenbank der Schemaversion 1, so wie
// `speicher` vor Migration 2 schrieb. Damit lässt sich prüfen, dass Migration 2 alte Datenbanken ohne Verlust hebt
// (Q5, A8), obwohl der Schreibweg der Version 1 nicht mehr existiert. Inhalte, die Version 1 nicht fassen konnte
// (mehrere Merkmale, Gruppe/Variante, Zuschlagssatz, Teilmengen, Leitbeschreibung, Kopfdaten, Ausweise), sind ein
// Fehler im Test, kein stiller Verlust.

import type { Angebotsposition, Knoten, Position, Projektdatei, Summenstand } from '@tethys/vertrag';
import { kanonischKompakt } from '../kanonisch';
import type { Datenbank, SqlWert } from '../sql';

const nichtInV1 = (was: string): never => {
  throw new Error(`Schemaversion 1 fasst das nicht: ${was}`);
};

/** Die Spalten der alten Positionsform: positionsart, pauschal, bedarf_mit_gesamtbetrag, bezugsposition_id, grundposition_id. */
function alteForm(p: Position): SqlWert[] {
  const m = p.merkmale;
  const arten = [p.zuschlag !== null, m.wahl !== null, m.bedarf !== null, m.stundenlohn].filter(
    Boolean,
  ).length;
  if (arten > 1) nichtInV1(`Position ${p.id}: mehrere Merkmale`);
  if (m.zuschlagskennzeichen) nichtInV1(`Position ${p.id}: Zuschlagskennzeichen`);
  if (p.leitbeschreibung !== undefined) nichtInV1(`Position ${p.id}: Leitbeschreibung`);
  if (m.wahl !== null && (m.wahl.gruppe !== null || m.wahl.variante !== null))
    nichtInV1(`Position ${p.id}: Gruppe/Variante`);
  const z = p.zuschlag;
  if (z !== null) {
    if (z.prozentsatz !== null) nichtInV1(`Position ${p.id}: Zuschlagssatz`);
    if (z.bezug.art !== 'positionen' || z.bezug.positionen.length > 1)
      nichtInV1(`Position ${p.id}: Bezugsform`);
    if (z.bezug.art === 'positionen' && z.bezug.positionen.some((b) => b.teilmenge !== null))
      nichtInV1(`Position ${p.id}: Teilmenge`);
  }
  const art =
    z !== null
      ? 'zuschlag'
      : m.wahl !== null
        ? 'wahl'
        : m.bedarf !== null
          ? 'bedarf'
          : m.stundenlohn
            ? 'stundenlohn'
            : 'normal';
  return [
    art,
    m.pauschal ? 1 : 0,
    m.bedarf === 'mit-gesamtbetrag' ? 1 : 0,
    z?.bezug.art === 'positionen' ? (z.bezug.positionen[0]?.positionId ?? null) : null,
    m.wahl?.grundpositionId ?? null,
  ];
}

function knotenZeile(aggregatId: string, k: Knoten): SqlWert[] {
  const kopf: SqlWert[] = [aggregatId, k.id, k.art, k.elternId, k.reihenfolge];
  const leer = (n: number): null[] => Array.from({ length: n }, () => null);
  switch (k.art) {
    case 'los':
    case 'titel':
      return [...kopf, k.ordnungszahl, null, k.kurztext, ...leer(10)];
    case 'hinweis':
      return [...kopf, ...leer(8), JSON.stringify(k.text), ...leer(4)];
    case 'position':
      return [
        ...kopf,
        k.ordnungszahl,
        k.ozIndex,
        k.kurztext,
        ...alteForm(k),
        JSON.stringify(k.langtext),
        k.menge,
        k.einheit,
        k.einheitspreis,
        k.epa === null ? null : kanonischKompakt(k.epa),
      ];
  }
}

function summen(db: Datenbank, aggregatId: string, s: Summenstand): void {
  const g = s.gesamt;
  if (g.summeBedarfOhneGesamtbetrag !== undefined || g.summeWahl !== undefined)
    nichtInV1(`${aggregatId}: Ausweise`);
  db.stapel(
    'INSERT INTO summe_position (aggregat_id, position_id, gesamtpreis, geht_in_summe) VALUES (?, ?, ?, ?)',
    s.positionen.map((p): SqlWert[] => [aggregatId, p.positionId, p.gesamtpreis, p.gehtInSummeEin ? 1 : 0]),
  );
  db.stapel(
    'INSERT INTO summe_gliederung (aggregat_id, gliederung_id, summe) VALUES (?, ?, ?)',
    s.gliederungen.map((x): SqlWert[] => {
      if (x.summeBedarfOhneGesamtbetrag !== undefined || x.summeWahl !== undefined)
        nichtInV1(`${aggregatId}: Ausweise`);
      return [aggregatId, x.gliederungId, x.summe];
    }),
  );
  db.ausfuehren(
    `INSERT INTO summe_gesamt (aggregat_id, netto, nachlass, netto_nach_nachlass, mwst, brutto)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [aggregatId, g.netto, g.nachlass, g.nettoNachNachlass, g.mwst, g.brutto],
  );
}

const knoten = (db: Datenbank, aggregatId: string, ks: readonly Knoten[]): void => {
  db.stapel(
    `INSERT INTO knoten (aggregat_id, id, art, eltern_id, reihenfolge, ordnungszahl, oz_index, kurztext, positionsart,
       pauschal, bedarf_mit_gesamtbetrag, bezugsposition_id, grundposition_id, text_json, menge, einheit,
       einheitspreis, epa) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ks.map((k) => knotenZeile(aggregatId, k)),
  );
};

const nachlass = (n: { art: string; wert: string } | null): SqlWert[] =>
  n === null ? [null, null] : [n.art, n.wert];

function angebotsposition(angebotId: string, p: Angebotsposition): SqlWert[] {
  if (p.status === 'nicht-angeboten') return [angebotId, p.positionId, 'nicht-angeboten', null, null];
  if (p.zuschlagssatz !== undefined) nichtInV1(`Angebotsposition ${p.positionId}: Zuschlagssatz`);
  return [
    angebotId,
    p.positionId,
    'angeboten',
    p.einheitspreis,
    p.epa === null ? null : kanonischKompakt(p.epa),
  ];
}

/**
 * Schreibt `d` in eine Datenbank, die genau auf Schemaversion 1 steht (Fremdschlüssel wie beim Öffnen). Läuft in einer
 * Transaktion; wirft bei Inhalten, die Version 1 nicht fasst.
 */
export function schreibeInSchema1(db: Datenbank, d: Projektdatei): void {
  db.ausfuehren('BEGIN IMMEDIATE');
  try {
    const p = d.projekt;
    db.ausfuehren('INSERT INTO projekt (id, name, bauherr_name, bauherr_anschrift) VALUES (?, ?, ?, ?)', [
      p.id,
      p.name,
      p.bauherr.name,
      p.bauherr.anschrift,
    ]);
    db.stapel(
      'INSERT INTO bieter (projekt_id, id, name, reihenfolge) VALUES (?, ?, ?, ?)',
      p.bieter.map((b, i): SqlWert[] => [p.id, b.id, b.name, i]),
    );
    for (const z of d.leistungsverzeichnisse) {
      const lv = z.leistungsverzeichnis;
      if (lv.auftraggeber !== undefined || lv.vergabeinformationen !== undefined)
        nichtInV1(`LV ${lv.id}: Kopfdaten`);
      db.ausfuehren(
        `INSERT INTO leistungsverzeichnis (id, projekt_id, name, oz_maske, mwst_satz, nachlass_art, nachlass_wert)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [lv.id, lv.projektId, lv.name, kanonischKompakt(lv.ozMaske), lv.mwstSatz, ...nachlass(lv.nachlass)],
      );
      knoten(db, lv.id, lv.knoten);
      summen(db, lv.id, z.summen);
    }
    for (const z of d.angebote) {
      const a = z.angebot;
      db.ausfuehren(
        `INSERT INTO angebot (id, projekt_id, leistungsverzeichnis_id, bieter_id, nachlass_art, nachlass_wert)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [a.id, a.projektId, a.leistungsverzeichnisId, a.bieterId, ...nachlass(a.nachlass)],
      );
      db.stapel(
        'INSERT INTO angebotsposition (angebot_id, position_id, status, einheitspreis, epa) VALUES (?, ?, ?, ?, ?)',
        a.positionen.map((x) => angebotsposition(a.id, x)),
      );
      summen(db, a.id, z.summen);
    }
    for (const z of d.auftragsLeistungsverzeichnisse) {
      const lv = z.auftragsLeistungsverzeichnis;
      if (lv.auftraggeber !== undefined || lv.vergabeinformationen !== undefined)
        nichtInV1(`Auftrags-LV ${lv.id}: Kopfdaten`);
      db.ausfuehren(
        `INSERT INTO auftrags_lv (id, projekt_id, leistungsverzeichnis_id, angebot_id, name, oz_maske, mwst_satz,
           nachlass_art, nachlass_wert) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          lv.id,
          lv.projektId,
          lv.leistungsverzeichnisId,
          lv.angebotId,
          lv.name,
          kanonischKompakt(lv.ozMaske),
          lv.mwstSatz,
          ...nachlass(lv.nachlass),
        ],
      );
      knoten(db, lv.id, lv.knoten);
      summen(db, lv.id, z.summen);
    }
    db.stapel(
      `INSERT INTO protokoll (id, projekt_id, aggregat_art, aggregat_id, wer, wann, befehl)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      d.protokoll.map((e): SqlWert[] => [
        e.id,
        e.projektId,
        e.aggregat.art,
        e.aggregat.id,
        e.wer,
        e.wann,
        kanonischKompakt(e.befehl),
      ]),
    );
    db.ausfuehren('COMMIT');
  } catch (e) {
    db.ausfuehren('ROLLBACK');
    throw e;
  }
}
