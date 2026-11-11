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
  LvZustand,
  PositionId,
  Projekt,
} from '@tethys/vertrag';
import { gedachtesLv } from './summen';

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
  void projekt;
  void gewaehlt;
  const a = 'angebot' in angebot ? angebot.angebot : angebot;
  const l = lv.leistungsverzeichnis;
  const g = gedachtesLv(lv, a);
  const knoten = g.knoten.map((k) => (k.elternId === l.id ? { ...k, elternId: neueId } : k));
  return {
    ok: true,
    wert: {
      befehl: {
        art: 'AuftragsLeistungsverzeichnisAnlegen',
        auftragsLeistungsverzeichnis: {
          id: neueId,
          projektId: l.projektId,
          leistungsverzeichnisId: l.id,
          angebotId: a.id,
          name: l.name,
          ozMaske: l.ozMaske,
          mwstSatz: l.mwstSatz,
          nachlass: a.nachlass,
          knoten,
        },
      },
      warnungen: [],
    },
  };
}
