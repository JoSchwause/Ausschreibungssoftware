// SPDX-License-Identifier: AGPL-3.0-or-later
// Ein Aufmaßblatt gegen sein Auftrags-LV prüfen (Ticket 80, D-70.3, U5). Der Ausführer der Aufmaß-Befehle sieht nur das
// Blatt; was das Auftrags-LV braucht, ist ein Befund, keine Sperre: Ein Blatt aus einem X31-Import oder eines, dessen
// Nachtrag zurückgenommen wurde, bleibt erfassbar. Soll/Ist und Rechnung (Ticket 81) lassen solche Zeilen weg.

import type {
  Aufmass,
  AufmassKopf,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvZustand,
  Knoten,
  PositionId,
} from '@tethys/vertrag';

/**
 * Ein Befund zu einem Aufmaßblatt. Reihenfolge: `auftrags-lv-abweichend` vorweg, dann je Zeile in der Reihenfolge des
 * Blatts.
 * - `auftrags-lv-abweichend`: Das Blatt gehört zu einem anderen Auftrags-LV als dem geprüften (dann ist meist jede Zeile
 *   auch `position-unbekannt`).
 * - `position-unbekannt`: Die Kennung steht nicht im Auftrags-LV (etwa die Position eines zurückgenommenen Nachtrags).
 * - `keine-position`: Die Kennung ist eine Gliederung oder ein Hinweistext.
 * - `zuschlagsposition`: Eine Zuschlagsposition wird nicht aufgemessen; ihr Betrag folgt aus den Bezugspositionen
 *   (D-34 (1)). Die Zeile zählt nicht.
 * - `ohne-einheitspreis`: Die Position hat im Auftrags-LV keinen EP (nicht angeboten, D-21); ihre Leistung zählt 0,00.
 * - `menge-fehlt`: Die Zeile hat keine Menge (ein Ansatz mit Fehler, Lesart (b) aus D-22); sie zählt nicht.
 * Die drei ersten Zeilenbefunde schließen die übrigen derselben Zeile aus; die beiden letzten können zusammen vorkommen.
 */
export type Aufmassbefund =
  | { readonly code: 'auftrags-lv-abweichend'; readonly auftragsLvId: AuftragsLeistungsverzeichnisId }
  | {
      readonly code:
        'position-unbekannt' | 'keine-position' | 'zuschlagsposition' | 'ohne-einheitspreis' | 'menge-fehlt';
      readonly positionId: PositionId;
    };

/** Befunde eines Aufmaßblatts gegen das Auftrags-LV (U5: keine Sperre). Leer: Jede Zeile zählt in Soll/Ist und Rechnung. */
export function aufmassPruefen(aufmass: Aufmass, auftragsLv: AuftragsLvZustand): readonly Aufmassbefund[] {
  const a = auftragsLv.auftragsLeistungsverzeichnis;
  const aus: Aufmassbefund[] = [];
  if (aufmass.auftragsLvId !== a.id)
    aus.push({ code: 'auftrags-lv-abweichend', auftragsLvId: aufmass.auftragsLvId });
  const nachId = new Map<string, Knoten>(a.knoten.map((k) => [k.id, k]));
  for (const { positionId, menge } of aufmass.positionen) {
    const k = nachId.get(positionId);
    if (k === undefined) aus.push({ code: 'position-unbekannt', positionId });
    else if (k.art !== 'position') aus.push({ code: 'keine-position', positionId });
    else if (k.zuschlag !== null) aus.push({ code: 'zuschlagsposition', positionId });
    else {
      if (k.einheitspreis === null) aus.push({ code: 'ohne-einheitspreis', positionId });
      if (menge === null) aus.push({ code: 'menge-fehlt', positionId });
    }
  }
  return aus;
}

/**
 * Die Nummer, die die App für ein neues Aufmaßblatt vorschlägt (`AufmassKopf.nummer`): die höchste vorhandene + 1, ohne
 * Blatt 1. Lücken (ein gelöschtes Blatt mitten in der Reihe) bleiben; die Nummer ist nur ein Vorschlag, eindeutig hält sie
 * `speicher` (`konflikt`).
 */
export function naechsteAufmassnummer(aufmasse: readonly Pick<AufmassKopf, 'nummer'>[]): number {
  return aufmasse.reduce((hoechste, a) => Math.max(hoechste, a.nummer), 0) + 1;
}
