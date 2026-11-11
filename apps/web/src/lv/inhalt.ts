// SPDX-License-Identifier: AGPL-3.0-or-later
// Der LV-Kopf ohne Kennungen und Knoten, an genau einer Stelle gebaut (Review Welle 4, S5). Wer ein LV oder Auftrags-LV
// an den GAEB-Writer oder in die Form eines LV-Zustands gibt, nimmt den Kopf von hier; so geht kein Kopffeld still
// verloren (Q5), wenn der Vertrag eines hinzufügt: `KOPF_FELDER` muss jedes Feld von `LvInhaltKopf` nennen.

import type { Leistungsverzeichnis, LvInhalt, LvInhaltKopf } from '@tethys/vertrag';

/** Jedes Feld von `LvInhaltKopf`; ein neues Feld im Vertrag macht diese Liste zum Typfehler. */
const KOPF_FELDER = {
  name: true,
  ozMaske: true,
  mwstSatz: true,
  nachlass: true,
  auftraggeber: true,
  vergabeinformationen: true,
  auftragnehmer: true,
  epaBezeichnungen: true,
} as const satisfies Record<keyof LvInhaltKopf, true>;

/** Die Stammdaten ohne Kennungen und Knoten; fehlende (optionale) Felder bleiben weg. */
export function inhaltKopf(k: LvInhaltKopf): LvInhaltKopf {
  const kopf: Partial<Record<keyof LvInhaltKopf, unknown>> = {};
  for (const feld of Object.keys(KOPF_FELDER) as (keyof LvInhaltKopf)[]) {
    if (k[feld] !== undefined) kopf[feld] = k[feld];
  }
  return kopf as LvInhaltKopf;
}

/** Das LV als Inhalt für den GAEB-Writer: Kopf, Wurzel (die Kennung des LV) und Knoten. */
export function lvInhalt(l: Leistungsverzeichnis): LvInhalt {
  return { ...inhaltKopf(l), wurzelId: l.id, knoten: l.knoten };
}
