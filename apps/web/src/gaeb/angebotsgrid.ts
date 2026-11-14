// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Preise eines Angebots im gemeinsamen Grid (U2, U3; Review Welle 7, SB3): das Gerüst des LV (Gliederung, OZ, Kurztext,
// Menge, Einheit) mit den EP des Entwurfs. Das Grid ist schreibgeschützt bis auf die Spalte „EP“ (`onEinheitspreise`); was
// es dort meldet, kommt hier in den Entwurf. Rein und ohne React; gerechnet wird nichts (keine GP, keine Summen: Die Summen
// des Angebots rechnet `vergabe` beim Speichern).
//
// Lesarten: Ein geleerter EP heißt „nicht angeboten“ (D-138.6: die Berichtigung ist „nicht angeboten“, ein Eintrag wird nie
// entfernt), ein neuer EP hebt „nicht angeboten“ auf. Eine Zuschlagsposition trägt einen Satz, keinen EP: Ihre Zelle ist im
// Grid gesperrt, der Satz steht in eigenen Feldern unter dem Grid.

import { formatiereEinheitspreisDe, parseDe } from '@tethys/dezimal';
import type {
  EinheitspreisAendern,
  Einheitspreis,
  LvAnsicht,
  LvSpalte,
  LvZeile,
  LvZustand,
  Position,
  PositionId,
  Pruefbefund,
} from '@tethys/vertrag';
import { lvAnsichtBauen } from '../lv/ansicht';
import { positionenInReihenfolge, type Angebotsentwurf, type Preiszeile } from './angebotEntwurf';
import { texte } from './texte';

/** Die Spalten des Angebotsgrids: ohne GP und Art, denn das Grid rechnet nicht und die Art ändert sich nicht. */
export const ANGEBOTSSPALTEN: readonly LvSpalte[] = [
  'ordnungszahl',
  'kurztext',
  'menge',
  'einheit',
  'einheitspreis',
];

const KEINE: readonly Pruefbefund[] = [];

/** Der EP einer Zeile des Entwurfs; `null`: nicht angeboten, kein Preis oder (noch) nicht lesbar. */
function epVon(z: Preiszeile | undefined): Einheitspreis | null {
  if (z === undefined || z.nichtAngeboten || z.text.trim() === '') return null;
  const r = parseDe('einheitspreis', z.text);
  return r.ok ? r.wert : null;
}

const nichtAngeboten = (id: PositionId): Pruefbefund => ({
  schwere: 'warnung',
  quelle: 'lv-pruefung',
  code: 'nicht-angeboten',
  meldung: texte.bearbeiten.nichtAngebotenHinweis,
  ort: { knotenId: id, feld: 'einheitspreis' },
});

/**
 * Die Ansicht des Grids: die sichtbaren Zeilen des LV (zugeklappt wie `zugeklappt`), an jeder Position ohne Zuschlag der EP
 * des Entwurfs; „nicht angeboten“ steht als Hinweis an der Zelle. Keine Summen und keine Befunde des LV.
 */
export function angebotsAnsicht(
  lv: LvZustand,
  entwurf: Angebotsentwurf,
  zugeklappt: ReadonlySet<string>,
): LvAnsicht {
  const basis = lvAnsichtBauen(lv, zugeklappt);
  const zeilen = basis.zeilen.map((z): LvZeile => {
    const k = z.knoten;
    if (k.art !== 'position') return { ...z, summe: null, befunde: KEINE };
    const e = entwurf.zeilen.get(k.id);
    const ep = k.zuschlag === null ? epVon(e) : null;
    return {
      ...z,
      knoten: { ...k, einheitspreis: ep, epa: null },
      summe: null,
      befunde: e?.nichtAngeboten === true ? [nichtAngeboten(k.id)] : KEINE,
    };
  });
  return { wurzelId: basis.wurzelId, zeilen, gesamt: null };
}

/**
 * Übernimmt die EP, die das Grid meldet, in den Entwurf: ein Wert ist ein Preis (und hebt „nicht angeboten“ auf), `null`
 * heißt „nicht angeboten“. Positionen, die der Entwurf nicht kennt, und Zuschlagspositionen bleiben unberührt.
 */
export function entwurfMitPreisen(
  lv: LvZustand,
  entwurf: Angebotsentwurf,
  befehle: readonly EinheitspreisAendern[],
): Angebotsentwurf {
  const positionen = new Map<string, Position>(positionenInReihenfolge(lv).map((p) => [p.id, p]));
  const zeilen = new Map(entwurf.zeilen);
  for (const b of befehle) {
    const p = positionen.get(b.positionId);
    const alt = zeilen.get(b.positionId);
    if (p === undefined || p.zuschlag !== null || alt === undefined) continue;
    zeilen.set(
      b.positionId,
      b.einheitspreis === null
        ? { ...alt, text: '', nichtAngeboten: true }
        : { ...alt, text: formatiereEinheitspreisDe(b.einheitspreis), nichtAngeboten: false },
    );
  }
  return { ...entwurf, zeilen };
}

/** Die Zuschlagspositionen des LV in Dokumentreihenfolge: Ihr Satz steht unter dem Grid. */
export const zuschlagspositionen = (lv: LvZustand): Position[] =>
  positionenInReihenfolge(lv).filter((p) => p.zuschlag !== null);
