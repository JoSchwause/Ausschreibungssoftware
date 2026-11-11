// SPDX-License-Identifier: AGPL-3.0-or-later
// EP-Kalkulation in der App (Ticket 89, C4, Ticket 78): Kalkulationszeilen (Text) → Kalkulationsansätze und Zuschlagssätze
// der Kalkulation (de-DE-Rand, N4) → `einzelpreiskalkulationBerechnen` → Befehle. Die Ansätze werden nicht gespeichert (D-36 (5)); der
// Befehlsweg bekommt nur Einheitspreisanteile und EP, als **ein** Undo-Schritt (zwei Befehle über `Sitzung.folge`).

import { einzelpreiskalkulationBerechnen } from '@tethys/kosten';
import type { Einzelpreiskalkulation, Kalkulationsansatz, Kalkulationszuschlagssaetze } from '@tethys/kosten';
import type {
  EinheitspreisAendern,
  EinheitspreisanteileSetzen,
  EpaArt,
  Einheitspreis,
  Menge,
  PositionId,
  Prozent,
} from '@tethys/vertrag';
import { zahlLesen } from '../lv/zahlen';
import { texte } from './texte';

export type { Kalkulationszuschlagssaetze };
/** Die Kostenarten in der Reihenfolge der Einheitspreisanteile; der Typ der Texte erzwingt Vollständigkeit. */
export const ARTEN = Object.keys(texte.kalkulation.kostenart) as readonly EpaArt[];

/** Eine Zeile des Formulars: ein Kalkulationsansatz, alle Felder als Text (nicht die Ansatzzeile eines Mengenansatzes). */
export interface Kalkulationszeile {
  readonly art: EpaArt;
  readonly bezeichnung: string;
  readonly ansatzmenge: string;
  readonly kostensatz: string;
}

export interface Kalkulationsformular {
  readonly zeilen: readonly Kalkulationszeile[];
  /** Zuschlagssatz der Kalkulation je Kostenart als Text; fehlt oder leer: 0 %. */
  readonly saetze: Readonly<Partial<Record<EpaArt, string>>>;
  /** Bezeichnung der freien Kostenart; leer: keine. */
  readonly freiBezeichnung: string;
}

export const LEERE_ZEILE: Kalkulationszeile = {
  art: 'lohn',
  bezeichnung: '',
  ansatzmenge: '',
  kostensatz: '',
};

export const LEERES_FORMULAR: Kalkulationsformular = {
  zeilen: [LEERE_ZEILE],
  saetze: {},
  freiBezeichnung: '',
};

/** Ein unlesbarer Wert: Zeile (Index) und Feld, oder der Satz einer Kostenart; die Meldung ist deutsch. */
export type Formfehler =
  | {
      readonly ort: 'zeile';
      readonly zeile: number;
      readonly feld: 'ansatzmenge' | 'kostensatz';
      readonly meldung: string;
    }
  | { readonly ort: 'satz'; readonly art: EpaArt; readonly meldung: string };

export interface Kalkulationslauf {
  /** Das Ergebnis der Rechnung; unlesbare Werte zählen darin als fehlend. */
  readonly ergebnis: Einzelpreiskalkulation;
  readonly fehler: readonly Formfehler[];
}

/**
 * Liest das Formular (leer = fehlt, unlesbar = Feldfehler und fehlt) und rechnet. Eine Zeile ganz ohne Eingabe (nur die
 * Kostenart) zählt nicht und erzeugt keinen Befund.
 */
export function kalkulationRechnen(
  form: Kalkulationsformular,
  lvHatEpaBezeichnungen: boolean,
): Kalkulationslauf {
  const fehler: Formfehler[] = [];
  const ansaetze: Kalkulationsansatz[] = [];
  form.zeilen.forEach((z, i) => {
    const leer = z.ansatzmenge.trim() === '' && z.kostensatz.trim() === '' && z.bezeichnung.trim() === '';
    if (leer) return;
    let menge: Menge | null = null;
    if (z.ansatzmenge.trim() !== '') {
      const m = zahlLesen('menge', z.ansatzmenge.trim());
      if (m.ok) menge = m.wert;
      else
        fehler.push({ ort: 'zeile', zeile: i, feld: 'ansatzmenge', meldung: texte.kalkulation.fehlerMenge });
    }
    let satz: Einheitspreis | null = null;
    if (z.kostensatz.trim() !== '') {
      const s = zahlLesen('einheitspreis', z.kostensatz.trim());
      if (s.ok) satz = s.wert;
      else
        fehler.push({
          ort: 'zeile',
          zeile: i,
          feld: 'kostensatz',
          meldung: texte.kalkulation.fehlerKostensatz,
        });
    }
    ansaetze.push({ art: z.art, bezeichnung: z.bezeichnung.trim(), ansatzmenge: menge, kostensatz: satz });
  });
  const saetze: Partial<Record<EpaArt, Prozent>> = {};
  for (const art of ARTEN) {
    const text = form.saetze[art]?.trim() ?? '';
    if (text === '') continue;
    const p = zahlLesen('prozent', text);
    if (p.ok) saetze[art] = p.wert;
    else fehler.push({ ort: 'satz', art, meldung: texte.kalkulation.fehlerSatz });
  }
  // Ist `epaBezeichnungen` am LV gesetzt, ist es die einzige Quelle der Beschriftung (D-28): `null` geht weiter.
  const frei =
    lvHatEpaBezeichnungen || form.freiBezeichnung.trim() === '' ? null : form.freiBezeichnung.trim();
  return { ergebnis: einzelpreiskalkulationBerechnen(ansaetze, saetze, frei), fehler };
}

/**
 * Die Befehle für „Übernehmen“: Anteile und EP, in dieser Reihenfolge, für **einen** Undo-Schritt. `null`, wenn die
 * Kalkulation keinen EP hat (keine Kostenart mit Anteil): dann gibt es nichts zu übernehmen.
 */
export function kalkulationBefehle(
  positionId: PositionId,
  ergebnis: Einzelpreiskalkulation,
): readonly [EinheitspreisanteileSetzen, EinheitspreisAendern] | null {
  if (ergebnis.einheitspreis === null) return null;
  return [
    { art: 'EinheitspreisanteileSetzen', positionId, epa: ergebnis.anteile },
    { art: 'EinheitspreisAendern', positionId, einheitspreis: ergebnis.einheitspreis },
  ];
}
