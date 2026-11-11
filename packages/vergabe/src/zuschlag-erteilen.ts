// SPDX-License-Identifier: AGPL-3.0-or-later
// Zuschlag → Auftrags-LV (Ticket 59, D-21). Eine reine Funktion baut aus Ausschreibungs-LV und beauftragtem Angebot den
// vorhandenen Befehl `AuftragsLeistungsverzeichnisAnlegen`; den Befehl prüft und rechnet der Kern. Grundlage ist das
// gedachte LV des Angebots (R7): EP und Zuschlagssatz des Bieters, Nachlass des Angebots, MwSt des LV.

import type {
  Angebot,
  AngebotZustand,
  AuftragsLeistungsverzeichnisAnlegen,
  AuftragsLeistungsverzeichnisId,
  Befehlsfehler,
  Ergebnis,
  Knoten,
  LvZustand,
  PositionId,
  Projekt,
} from '@tethys/vertrag';
import { angebotspositionenNachId, gedachtesLv } from './summen';

/** Ein Hinweis zum Zuschlag (U5): Der Befehl entsteht trotzdem. */
export type Zuschlagswarnung = never;

export interface Zuschlagsergebnis {
  readonly befehl: AuftragsLeistungsverzeichnisAnlegen;
  readonly warnungen: readonly Zuschlagswarnung[];
}

export function zuschlagErteilen(
  lv: LvZustand,
  angebot: AngebotZustand | Angebot,
  projekt: Projekt,
  gewaehlt: ReadonlySet<PositionId>,
  neueId: AuftragsLeistungsverzeichnisId,
): Ergebnis<Zuschlagsergebnis, Befehlsfehler> {
  void gewaehlt;
  const a = 'angebot' in angebot ? angebot.angebot : angebot;
  const { id: lvId, projektId, knoten: _lvKnoten, auftragnehmer: _keiner, ...kopf } = lv.leistungsverzeichnis;
  const bieter = projekt.bieter.find((b) => b.id === a.bieterId);
  const nachId = angebotspositionenNachId(a.positionen);
  const knoten = gedachtesLv(lv, a).knoten.map((k): Knoten => {
    const lage = k.elternId === lvId ? { elternId: neueId } : {};
    if (k.art !== 'position') return { ...k, ...lage };
    const eintrag = nachId.get(k.id);
    const mitSatz = k.zuschlag !== null && k.zuschlag.prozentsatz !== null;
    const epa = eintrag?.status === 'angeboten' && !mitSatz ? eintrag.epa : null;
    return { ...k, ...lage, epa };
  });
  return {
    ok: true,
    wert: {
      befehl: {
        art: 'AuftragsLeistungsverzeichnisAnlegen',
        auftragsLeistungsverzeichnis: {
          ...kopf,
          id: neueId,
          projektId,
          leistungsverzeichnisId: lvId,
          angebotId: a.id,
          nachlass: a.nachlass,
          auftragnehmer: { name: bieter?.name ?? null, strasse: null, plz: null, ort: null },
          knoten,
        },
      },
      warnungen: [],
    },
  };
}
