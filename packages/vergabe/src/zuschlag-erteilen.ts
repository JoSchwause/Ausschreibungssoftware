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
  Leistungsverzeichnis,
  LvZustand,
  Position,
  PositionId,
  Projekt,
  WurzelId,
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
 * - `nicht-angeboten`: Der Bieter hat die Position nicht angeboten (oder keinen Eintrag); EP `null`, auch an einer
 *   gewählten Alternative und an einer Zuschlagsposition (dort auch Satz `null`).
 * - `zuschlagssatz-fehlt`: Eine Zuschlagsposition ist angeboten, aber ohne Satz des Bieters; Satz `null` (D-44.1).
 * - `wahl-ohne-grundposition`: Eine gewählte Alternative hat in den Daten keine Grundposition und ersetzt nichts
 *   (etwa ein LV nach einem X83-Rundweg, D-59.2).
 * Je Position stehen die Preiswarnungen vor `wahl-ohne-grundposition` und den Bezügen.
 */
export type Zuschlagswarnung =
  | { readonly code: 'nicht-angeboten'; readonly positionId: PositionId }
  | { readonly code: 'zuschlagssatz-fehlt'; readonly positionId: PositionId }
  | { readonly code: 'wahl-ohne-grundposition'; readonly positionId: PositionId }
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
  // v1.4: D-42 — `nachtrag` und `vorlage` stehen nur am `LvKopf`, nie im Kopf des Auftrags-LV.
  const { nachtrag } = lv.leistungsverzeichnis;
  const l = ohneLvKennzeichen(lv.leistungsverzeichnis);
  const { id: lvId, projektId } = l;
  // v1.4: D-42 — Ein Nachtrags-LV bekommt keinen Zuschlag; ein Nachtrag kommt über `NachtragUebernehmen` ins Auftrags-LV.
  if (nachtrag !== undefined)
    return fehler(
      'Das LV ist ein Nachtrags-LV; es wird über „Nachtrag übernehmen“ beauftragt.',
      'leistungsverzeichnis.nachtrag',
    );
  if (a.leistungsverzeichnisId !== lvId)
    return fehler('Das Angebot gehört nicht zu diesem LV.', 'angebot.leistungsverzeichnisId');
  if (a.projektId !== projektId)
    return fehler('Das Angebot gehört nicht zum Projekt des LV.', 'angebot.projektId');
  if (projekt.id !== projektId) return fehler('Das Projekt ist nicht das Projekt des LV.', 'projekt.id');
  const bieter = projekt.bieter.find((b) => b.id === a.bieterId);
  if (bieter === undefined)
    return fehler('Den Bieter des Angebots kennt das Projekt nicht.', 'angebot.bieterId');
  const wahl = wahlAufloesen(wahlgruppenBilden(l.knoten), gewaehlt);
  if (!wahl.ok) return wahl;
  const { knoten, warnungen } = auftragsKnoten(lv, a, wahl.wert, neueId);
  // v1.7a (E10): Die Anschrift aus den Bieterangaben wird zur Anschrift des Auftragnehmers (eine Kopie zum Zeitpunkt des
  // Zuschlags, wie der Name; spätere Änderungen am Bieter ändern das Auftrags-LV nicht).
  const anschrift = bieter.angaben?.anschrift ?? null;
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
          auftragnehmer: {
            name: bieter.name,
            strasse: anschrift?.strasse ?? null,
            plz: anschrift?.plz ?? null,
            ort: anschrift?.ort ?? null,
          },
          knoten,
        },
      },
      warnungen,
    },
  };
}

// --- Vorschau für den Dialog (Ticket 64) ----------------------------------------------------------------------------

/** Eine Alternative einer Wahlgruppe mit ihrer Variantennummer (`null` in der Verweisform). */
export interface Vorschauvariante {
  readonly positionId: PositionId;
  readonly variante: number | null;
}

/** Eine Wahlgruppe des LV für den Zuschlagsdialog, in Dokumentreihenfolge (nach der ersten Position der Gruppe). */
export interface Vorschaugruppe {
  /** Gruppennummer aus den Daten (`wahl.gruppe` des ersten Mitglieds, das eine trägt); `null` in der Verweisform. */
  readonly gruppe: number | null;
  /** Die Positionen, die eine gewählte Alternative ersetzt; leer, wenn die Daten keine nennen. */
  readonly grundpositionen: readonly PositionId[];
  readonly alternativen: readonly Vorschauvariante[];
  /** Die gewählte Alternative dieser Gruppe (bei mehreren die erste), `null`: keine. */
  readonly gewaehlt: PositionId | null;
}

/**
 * Was ein Zuschlag mit dieser Wahl ergäbe (Ticket 59, für den Dialog in Ticket 64; D-21: die App zeigt vor dem
 * Bestätigen die Zahl der entfallenden und unbepreisten Positionen).
 */
export interface Zuschlagsvorschau {
  /** Zahl der Positionen, die im Auftrags-LV entfallen; `null` bei ungültiger Wahl. */
  readonly entfallend: number | null;
  /**
   * Zahl der Positionen im Auftrags-LV ohne Preis des Bieters (Warnungen `nicht-angeboten` und `zuschlagssatz-fehlt`);
   * `null` bei ungültiger Wahl.
   */
  readonly unbepreist: number | null;
  readonly wahlgruppen: readonly Vorschaugruppe[];
  /** Der Fehler, den `zuschlagErteilen` für diese Wahl meldete (`feld: 'gewaehlt'`); `null`: die Wahl ist gültig. */
  readonly fehler: Befehlsfehler | null;
}

/**
 * Vorschau eines Zuschlags: dieselbe Rechnung wie `zuschlagErteilen`, ohne Projekt und ohne Befehl. Prüft nicht, ob
 * das Angebot zum LV gehört (das meldet erst `zuschlagErteilen`).
 */
export function zuschlagsvorschau(
  lv: LvZustand,
  angebot: AngebotZustand | Angebot,
  gewaehlt: ReadonlySet<PositionId>,
): Zuschlagsvorschau {
  const a = 'angebot' in angebot ? angebot.angebot : angebot;
  const knoten = lv.leistungsverzeichnis.knoten;
  const gruppen = wahlgruppenBilden(knoten);
  const wahlVon = new Map(
    knoten.flatMap((k) => (k.art === 'position' ? [[k.id as string, k.merkmale.wahl]] : [])),
  );
  const wahlgruppen = gruppen.map((g): Vorschaugruppe => ({
    gruppe:
      [...g.grundpositionen, ...g.alternativen]
        .map((id) => wahlVon.get(id)?.gruppe ?? null)
        .find((n) => n !== null) ?? null,
    grundpositionen: g.grundpositionen,
    alternativen: g.alternativen.map((positionId) => ({
      positionId,
      variante: wahlVon.get(positionId)?.variante ?? null,
    })),
    gewaehlt: g.alternativen.find((id) => gewaehlt.has(id)) ?? null,
  }));
  const wahl = wahlAufloesen(gruppen, gewaehlt);
  if (!wahl.ok) return { entfallend: null, unbepreist: null, wahlgruppen, fehler: wahl.fehler };
  const { knoten: auftrag, warnungen } = auftragsKnoten(lv, a, wahl.wert, lv.leistungsverzeichnis.id);
  return {
    entfallend: knoten.length - auftrag.length,
    unbepreist: warnungen.filter((w) => w.code === 'nicht-angeboten' || w.code === 'zuschlagssatz-fehlt')
      .length,
    wahlgruppen,
    fehler: null,
  };
}

/** v1.4: D-42 — das LV ohne die Kennzeichen, die nur am `LvKopf` stehen (`nachtrag`, `vorlage`, Vertrag v1.4). */
function ohneLvKennzeichen(l: Leistungsverzeichnis): Omit<Leistungsverzeichnis, 'nachtrag' | 'vorlage'> {
  const kopie: { -readonly [K in keyof Leistungsverzeichnis]?: Leistungsverzeichnis[K] } = { ...l };
  delete kopie.nachtrag;
  delete kopie.vorlage;
  return kopie as Omit<Leistungsverzeichnis, 'nachtrag' | 'vorlage'>;
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
  gruppen: readonly Wahlgruppe[],
  gewaehlt: ReadonlySet<PositionId>,
): Ergebnis<readonly AufgeloesteWahl[], Befehlsfehler> {
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
  wurzel: WurzelId,
): { knoten: Knoten[]; warnungen: Zuschlagswarnung[] } {
  const lvId = lv.leistungsverzeichnis.id;
  const entfallen = new Set<string>();
  const normal = new Set<string>();
  const ohneGrund = new Set<string>();
  for (const { gruppe, gewaehlt } of wahl) {
    if (gewaehlt === null) for (const id of gruppe.alternativen) entfallen.add(id);
    else {
      normal.add(gewaehlt);
      if (gruppe.grundpositionen.length === 0) ohneGrund.add(gewaehlt);
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
      elternId: k.elternId === lvId ? wurzel : k.elternId,
      reihenfolge: reihenfolge.get(k.id) ?? k.reihenfolge,
    };
    if (k.art !== 'position') return { ...k, ...lage };
    const eintrag = nachId.get(k.id);
    const angeboten = eintrag?.status === 'angeboten';
    const mitSatz = k.zuschlag !== null && k.zuschlag.prozentsatz !== null;
    const epa = eintrag?.status === 'angeboten' && !mitSatz ? eintrag.epa : null;
    if (!angeboten) warnungen.push({ code: 'nicht-angeboten', positionId: k.id });
    else if (k.zuschlag !== null && !mitSatz)
      warnungen.push({ code: 'zuschlagssatz-fehlt', positionId: k.id });
    if (ohneGrund.has(k.id)) warnungen.push({ code: 'wahl-ohne-grundposition', positionId: k.id });
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
    // v1.7a (D-127.6): Die Kalkulationsangaben bleiben im Ausschreibungs-LV; die Preise kommen aus dem Angebot.
    const neu: { -readonly [F in keyof Position]?: Position[F] } = { ...k, ...lage, merkmale, zuschlag, epa };
    delete neu.kalkulation;
    return neu as Position;
  });
  return { knoten, warnungen };
}
