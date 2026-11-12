// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle am Aufmaßblatt ausführen (Ticket 80, D-36 (1), D-70.3). Der Ausführer sieht nur das Blatt (Signatur
// `AufmassBefehlAusfuehren`) und prüft die Form; den Bezug zum Auftrags-LV meldet `aufmassPruefen` als Befund (U5), die
// Eindeutigkeit der Blattnummer hält `speicher` (`konflikt`). ChangeSet jedes Befehls: das ganze Blatt vorher und nachher
// (D-36 (8), D-45).
//
// Lesarten (vertrag v1.4, D-22):
// - Menge und Ansatz kommen zusammen und werden unausgewertet abgelegt (die App rechnet die Menge mit `mengen`, A3); ein
//   Ansatz mit Fehler kommt mit `menge: null` (Lesart (b)); ein leerer Ansatz `[]` ist keiner und wird `null`.
// - Höchstens eine Zeile je Position; `AufmasspositionSetzen` ersetzt eine vorhandene an ihrer Stelle, sonst kommt sie ans
//   Ende. Die Blattnummer bleibt nach dem Anlegen fest (D-70.9).
// - Das Blatt im ChangeSet ist kanonisch: genau die Felder des Vertrags, in Vertragsreihenfolge (kanonische Datei, A8).

import { alsMenge } from '@tethys/dezimal';
import { mengenansatzFehler } from '@tethys/kern';
import type {
  Ansatzzeile,
  Aufmass,
  AufmassBefehlAusfuehren,
  AufmassChangeSet,
  Aufmassposition,
  Befehlsfehler,
  Ergebnis,
  Menge,
} from '@tethys/vertrag';
import { datumFehler, istObjekt, kennungFehler, nein, nummerFehler } from './form';

type Antwort = Ergebnis<AufmassChangeSet, Befehlsfehler>;
type Geprueft<T> = Ergebnis<T, Befehlsfehler>;

const ungueltig = (meldung: string, feld: string, knotenId?: string): { ok: false; fehler: Befehlsfehler } =>
  nein('ungueltige-eingabe', meldung, feld, knotenId);

/** Eine Zeile in kanonischer Form, oder der Formfehler. */
function zeilePruefen(roh: unknown): Geprueft<Aufmassposition> {
  if (!istObjekt(roh)) return ungueltig('Eine Aufmaßposition muss ein Objekt sein.', 'positionen');
  const p = roh as unknown as Aufmassposition;
  const kf = kennungFehler(p.positionId, 'positionId');
  if (kf !== null) return ungueltig(kf, 'positionId');
  const menge: unknown = p.menge;
  if (menge !== null) {
    const e = typeof menge === 'string' ? alsMenge(menge) : null;
    if (e === null || !e.ok)
      return ungueltig(
        e?.ok === false ? e.fehler.meldung : 'Die Menge muss null oder ein Text sein.',
        'menge',
        p.positionId,
      );
  }
  const ansatz: unknown = p.mengenansatz;
  if (ansatz !== null) {
    const af = mengenansatzFehler(ansatz);
    if (af !== null) return ungueltig(af, 'mengenansatz', p.positionId);
  }
  const zeilen = p.mengenansatz;
  return {
    ok: true,
    wert: {
      positionId: p.positionId,
      mengenansatz:
        zeilen === null || zeilen.length === 0
          ? null
          : zeilen.map((z): Ansatzzeile => ({
              zeile: z.zeile,
              formel: z.formel,
              ausdruck: z.ausdruck,
              variable: z.variable,
            })),
      menge: menge as Menge | null,
    },
  };
}

function kopfPruefen(bezeichnung: unknown, datum: unknown): Befehlsfehler | null {
  if (typeof bezeichnung !== 'string')
    return ungueltig('Die Bezeichnung muss ein Text sein.', 'bezeichnung').fehler;
  const df = datumFehler(datum);
  return df === null ? null : ungueltig(df, 'datum').fehler;
}

/** Das ganze Blatt in kanonischer Form (Anlegen), oder der erste Formfehler. */
function blattPruefen(a: Aufmass): Geprueft<Aufmass> {
  if (!istObjekt(a)) return ungueltig('Das Aufmaßblatt muss ein Objekt sein.', 'aufmass');
  for (const feld of ['id', 'projektId', 'auftragsLvId'] as const) {
    const kf = kennungFehler(a[feld], feld);
    if (kf !== null) return ungueltig(kf, feld);
  }
  const nf = nummerFehler(a.nummer);
  if (nf !== null) return ungueltig(nf, 'nummer');
  const kf = kopfPruefen(a.bezeichnung, a.datum);
  if (kf !== null) return { ok: false, fehler: kf };
  const roh: unknown = a.positionen;
  if (!Array.isArray(roh)) return ungueltig('Die Aufmaßpositionen müssen eine Liste sein.', 'positionen');
  const positionen: Aufmassposition[] = [];
  const gesehen = new Set<string>();
  for (const z of roh as readonly unknown[]) {
    const p = zeilePruefen(z);
    if (!p.ok) return p;
    if (gesehen.has(p.wert.positionId))
      return ungueltig(
        `Die Position ${p.wert.positionId} hat schon eine Zeile auf diesem Blatt.`,
        'positionen',
        p.wert.positionId,
      );
    gesehen.add(p.wert.positionId);
    positionen.push(p.wert);
  }
  return { ok: true, wert: blatt(a, a.bezeichnung, a.datum, positionen) };
}

/** Das Blatt mit diesen Kopfangaben und Zeilen, Felder in Vertragsreihenfolge. */
function blatt(
  a: Aufmass,
  bezeichnung: string,
  datum: string | null,
  positionen: readonly Aufmassposition[],
): Aufmass {
  return {
    id: a.id,
    projektId: a.projektId,
    auftragsLvId: a.auftragsLvId,
    nummer: a.nummer,
    bezeichnung,
    datum,
    positionen,
  };
}

function changeSet(vorher: Aufmass | null, nachher: Aufmass | null): Antwort {
  const id = (nachher ?? vorher)?.id;
  if (id === undefined) throw new Error('Ein Aufmaß-ChangeSet braucht ein Blatt');
  return { ok: true, wert: { art: 'aufmass', aufmassId: id, aufmass: { vorher, nachher } } };
}

/**
 * Führt einen Befehl am Aufmaßblatt aus. `AufmassAnlegen` verlangt `zustand === null`, jeder andere Befehl ein Blatt
 * (sonst `befehl-nicht-zustaendig`). Rein und deterministisch (A2); erwartbare Fehler sind Werte.
 */
export const aufmassBefehlAusfuehren: AufmassBefehlAusfuehren = (zustand, befehl) => {
  if (befehl.art === 'AufmassAnlegen') {
    if (zustand !== null)
      return nein('befehl-nicht-zustaendig', 'AufmassAnlegen: das Aufmaßblatt existiert schon.');
    const b = blattPruefen(befehl.aufmass);
    return b.ok ? changeSet(null, b.wert) : b;
  }
  if (zustand === null) return nein('befehl-nicht-zustaendig', `${befehl.art} verlangt ein Aufmaßblatt.`);
  const a = zustand.aufmass;
  switch (befehl.art) {
    case 'AufmasskopfSetzen': {
      const f = kopfPruefen(befehl.bezeichnung, befehl.datum);
      if (f !== null) return { ok: false, fehler: f };
      return changeSet(a, blatt(a, befehl.bezeichnung, befehl.datum, a.positionen));
    }
    case 'AufmasspositionSetzen': {
      const p = zeilePruefen(befehl.position);
      if (!p.ok) return p;
      const i = a.positionen.findIndex((z) => z.positionId === p.wert.positionId);
      const positionen =
        i < 0 ? [...a.positionen, p.wert] : a.positionen.map((z, j) => (j === i ? p.wert : z));
      return changeSet(a, blatt(a, a.bezeichnung, a.datum, positionen));
    }
    case 'AufmasspositionEntfernen': {
      const positionen = a.positionen.filter((z) => z.positionId !== befehl.positionId);
      if (positionen.length === a.positionen.length)
        return ungueltig(
          `Die Position ${String(befehl.positionId)} hat auf diesem Blatt keine Zeile.`,
          'positionId',
          befehl.positionId,
        );
      return changeSet(a, blatt(a, a.bezeichnung, a.datum, positionen));
    }
    case 'AufmassLoeschen':
      return changeSet(a, null);
  }
};
