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
  KnotenId,
  LvZustand,
  PositionId,
  Projekt,
} from '@tethys/vertrag';
import { angebotspositionenNachId, gedachtesLv } from './summen';
import { wahlgruppenBilden } from './wahlgruppen';
import type { Wahlgruppe } from './wahlgruppen';

/**
 * Ein Hinweis zum Zuschlag (U5): Der Befehl entsteht trotzdem. Reihenfolge: `positionen-entfallen` zuerst, dann je
 * Position des Auftrags-LV in Dokumentreihenfolge.
 * - `positionen-entfallen`: Grundpositionen gewählter Gruppen und nicht gewählte Alternativen (Dokumentreihenfolge).
 * - `bezug-entfernt`: ein Listenbezug einer Zuschlagsposition (`zuschlag.bezug.positionen`) oder ein
 *   `merkmale.wahl.grundpositionId` zeigte auf eine Position, die im Auftrags-LV nicht steht (entfallen oder im
 *   Papierkorb des LV); er ist entfernt, nicht umgelenkt.
 */
export type Zuschlagswarnung =
  | {
      readonly code: 'positionen-entfallen';
      readonly anzahl: number;
      readonly positionIds: readonly PositionId[];
    }
  | {
      readonly code: 'bezug-entfernt';
      readonly positionId: PositionId;
      readonly feld: 'zuschlag.bezug.positionen' | 'merkmale.wahl.grundpositionId';
      readonly zielId: PositionId;
    };

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
  const a = 'angebot' in angebot ? angebot.angebot : angebot;
  const l = lv.leistungsverzeichnis;
  const { id: lvId, projektId } = l;
  if (a.leistungsverzeichnisId !== lvId)
    return fehler('Das Angebot gehört nicht zu diesem LV.', 'angebot.leistungsverzeichnisId');
  if (a.projektId !== projektId)
    return fehler('Das Angebot gehört nicht zum Projekt des LV.', 'angebot.projektId');
  if (projekt.id !== projektId) return fehler('Das Projekt ist nicht das Projekt des LV.', 'projekt.id');
  const bieter = projekt.bieter.find((b) => b.id === a.bieterId);
  if (bieter === undefined)
    return fehler('Den Bieter des Angebots kennt das Projekt nicht.', 'angebot.bieterId');
  const wahl = wahlAufloesen(l.knoten, gewaehlt);
  if (!wahl.ok) return wahl;
  const { knoten, warnungen } = auftragsKnoten(lv, a, wahl.wert, neueId);
  return {
    ok: true,
    wert: {
      befehl: {
        art: 'AuftragsLeistungsverzeichnisAnlegen',
        auftragsLeistungsverzeichnis: {
          // Kopfdaten des LV (Name, OZ-Maske, MwSt, Auftraggeber, Vergabeinformationen, EPA-Bezeichnungen); Knoten,
          // Nachlass und Auftragnehmer werden unten ersetzt.
          ...l,
          id: neueId,
          projektId,
          leistungsverzeichnisId: lvId,
          angebotId: a.id,
          nachlass: a.nachlass,
          auftragnehmer: { name: bieter.name, strasse: null, plz: null, ort: null },
          knoten,
        },
      },
      warnungen,
    },
  };
}

function fehler(meldung: string, feld: string, knotenId?: KnotenId): { ok: false; fehler: Befehlsfehler } {
  return {
    ok: false,
    fehler: { code: 'ungueltige-eingabe', meldung, feld, ...(knotenId === undefined ? {} : { knotenId }) },
  };
}

/** Die Wahl je Gruppe: die gewählte Alternative oder `null`. */
interface AufgeloesteWahl {
  readonly gruppe: Wahlgruppe;
  readonly gewaehlt: PositionId | null;
}

/**
 * Prüft die gewählten Kennungen gegen die Wahlgruppen des LV (Punkt 4): Jede muss eine Alternative sein, je Gruppe
 * höchstens eine. Gemeldet wird die erste ungültige Kennung in der Reihenfolge der Menge, bei einer Gruppe die zweite
 * gewählte Alternative in Dokumentreihenfolge.
 */
function wahlAufloesen(
  knoten: readonly Knoten[],
  gewaehlt: ReadonlySet<PositionId>,
): Ergebnis<readonly AufgeloesteWahl[], Befehlsfehler> {
  const gruppen = wahlgruppenBilden(knoten);
  const alternativen = new Set<string>(gruppen.flatMap((g) => g.alternativen));
  for (const id of gewaehlt) {
    if (!alternativen.has(id))
      return fehler(`Die gewählte Kennung ist keine Alternative des LV: ${id}`, 'gewaehlt', id);
  }
  const aus: AufgeloesteWahl[] = [];
  for (const gruppe of gruppen) {
    const wahl = gruppe.alternativen.filter((id) => gewaehlt.has(id));
    const [erste, zweite] = wahl;
    if (zweite !== undefined)
      return fehler(
        `Mehr als eine gewählte Alternative in derselben Wahlgruppe: ${zweite}`,
        'gewaehlt',
        zweite,
      );
    aus.push({ gruppe, gewaehlt: erste ?? null });
  }
  return { ok: true, wert: aus };
}

/**
 * Die Knoten des Auftrags-LV (Punkte 1 bis 3): das gedachte LV des Angebots ohne die entfallenen Positionen, gewählte
 * Alternativen ohne Wahl, Bezüge auf fehlende Positionen entfernt, `reihenfolge` je Elternknoten dicht, die Knoten der
 * obersten Ebene unter der neuen Wurzel. OZ bleiben, geleerte Gliederungen bleiben.
 */
function auftragsKnoten(
  lv: LvZustand,
  a: Angebot,
  wahl: readonly AufgeloesteWahl[],
  neueId: AuftragsLeistungsverzeichnisId,
): { knoten: Knoten[]; warnungen: Zuschlagswarnung[] } {
  const lvId = lv.leistungsverzeichnis.id;
  const entfallen = new Set<string>();
  const normal = new Set<string>();
  for (const { gruppe, gewaehlt } of wahl) {
    if (gewaehlt === null) for (const id of gruppe.alternativen) entfallen.add(id);
    else {
      normal.add(gewaehlt);
      for (const id of [...gruppe.grundpositionen, ...gruppe.alternativen])
        if (id !== gewaehlt) entfallen.add(id);
    }
  }
  const nachId = angebotspositionenNachId(a.positionen);
  const bleibt = gedachtesLv(lv, a).knoten.filter((k) => !entfallen.has(k.id));
  const positionen = new Set<string>(bleibt.filter((k) => k.art === 'position').map((k) => k.id));
  const warnungen: Zuschlagswarnung[] = [];
  const entfalleneIds = lv.leistungsverzeichnis.knoten
    .filter((k) => entfallen.has(k.id))
    .map((k) => k.id as PositionId);
  if (entfalleneIds.length > 0)
    warnungen.push({
      code: 'positionen-entfallen',
      anzahl: entfalleneIds.length,
      positionIds: entfalleneIds,
    });

  // Dichte Reihenfolge je Elternknoten in der alten Reihenfolge.
  const reihenfolge = new Map<string, number>();
  const geschwister = new Map<string, Knoten[]>();
  for (const k of bleibt) {
    const liste = geschwister.get(k.elternId) ?? [];
    liste.push(k);
    geschwister.set(k.elternId, liste);
  }
  for (const liste of geschwister.values())
    [...liste].sort((x, y) => x.reihenfolge - y.reihenfolge).forEach((k, i) => reihenfolge.set(k.id, i));

  const knoten = bleibt.map((k): Knoten => {
    const lage = {
      elternId: k.elternId === lvId ? neueId : k.elternId,
      reihenfolge: reihenfolge.get(k.id) ?? k.reihenfolge,
    };
    if (k.art !== 'position') return { ...k, ...lage };
    const eintrag = nachId.get(k.id);
    const mitSatz = k.zuschlag !== null && k.zuschlag.prozentsatz !== null;
    const epa = eintrag?.status === 'angeboten' && !mitSatz ? eintrag.epa : null;
    let { merkmale, zuschlag } = k;
    if (normal.has(k.id)) merkmale = { ...merkmale, wahl: null };
    const grund = merkmale.wahl?.grundpositionId ?? null;
    if (merkmale.wahl !== null && grund !== null && !positionen.has(grund)) {
      merkmale = { ...merkmale, wahl: { ...merkmale.wahl, grundpositionId: null } };
      warnungen.push({
        code: 'bezug-entfernt',
        positionId: k.id,
        feld: 'merkmale.wahl.grundpositionId',
        zielId: grund,
      });
    }
    if (zuschlag !== null && zuschlag.bezug.art === 'positionen') {
      const fehlend = zuschlag.bezug.positionen.filter((b) => !positionen.has(b.positionId));
      for (const b of fehlend)
        warnungen.push({
          code: 'bezug-entfernt',
          positionId: k.id,
          feld: 'zuschlag.bezug.positionen',
          zielId: b.positionId,
        });
      if (fehlend.length > 0)
        zuschlag = {
          ...zuschlag,
          bezug: {
            art: 'positionen',
            positionen: zuschlag.bezug.positionen.filter((b) => positionen.has(b.positionId)),
          },
        };
    }
    return { ...k, ...lage, merkmale, zuschlag, epa };
  });
  return { knoten, warnungen };
}
