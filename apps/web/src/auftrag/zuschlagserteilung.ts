// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 64 (V4, D-21): was der Dialog „Zuschlag erteilen“ zeigt und abschickt. Rein: Die Rechnung liegt in `vergabe`
// (`zuschlagsvorschau`, `zuschlagErteilen`); hier nur die Aufbereitung für die Oberfläche (Wahlgruppen zum Ankreuzen,
// Zahlen, Warnungen in Worten) und der Befehl `AuftragsLeistungsverzeichnisAnlegen` für den Befehlsweg (A5).

import { zuschlagErteilen, zuschlagsvorschau, type Zuschlagswarnung } from '@tethys/vergabe';
import type {
  Angebot,
  AngebotZustand,
  AuftragsLeistungsverzeichnisAnlegen,
  AuftragsLeistungsverzeichnisId,
  Knoten,
  LvZustand,
  PositionId,
  Projekt,
} from '@tethys/vertrag';
import { ozText } from '../lv/oztext';
import { texte } from './texte';

/** Eine Alternative zum Ankreuzen. */
export interface Alternativwahl {
  readonly positionId: PositionId;
  /** OZ und Kurztext. */
  readonly text: string;
  readonly gewaehlt: boolean;
}

/** Eine Wahlgruppe im Dialog: höchstens eine Alternative ist gewählt (D-21). */
export interface Wahlgruppenwahl {
  /** Überschrift: die Grundpositionen, die eine gewählte Alternative ersetzt (oder die Gruppennummer). */
  readonly titel: string;
  readonly alternativen: readonly Alternativwahl[];
}

export interface Zuschlagserteilungsplan {
  /** Zahl der Positionen, die im Auftrags-LV entfallen; `null` bei ungültiger Wahl. */
  readonly entfallend: number | null;
  /** Zahl der Positionen ohne Preis des Bieters im Auftrags-LV; `null` bei ungültiger Wahl. */
  readonly unbepreist: number | null;
  readonly wahlgruppen: readonly Wahlgruppenwahl[];
  /** Die Warnungen von `zuschlagErteilen` in Worten, in ihrer Reihenfolge. */
  readonly warnungen: readonly string[];
  /** Warum der Zuschlag so nicht geht; dann ist `befehl` `null`. */
  readonly fehler: string | null;
  readonly befehl: AuftragsLeistungsverzeichnisAnlegen | null;
}

export interface Zuschlagserteilungseingang {
  readonly lv: LvZustand;
  readonly angebot: AngebotZustand | Angebot;
  readonly projekt: Projekt;
  readonly gewaehlt: ReadonlySet<PositionId>;
  /** Kennung des neuen Auftrags-LV (aus der `IdQuelle` der App, A2). */
  readonly neueId: AuftragsLeistungsverzeichnisId;
}

/** OZ (mit Index) und Kurztext einer Position, wie sie das Grid zeigt. */
function positionText(knoten: ReadonlyMap<string, Knoten>, id: PositionId): string {
  const k = knoten.get(id);
  if (k?.art !== 'position') return id;
  return [ozText(k), k.kurztext].filter((s) => s !== '').join(' ');
}

function warnungText(w: Zuschlagswarnung, knoten: ReadonlyMap<string, Knoten>): string {
  const t = texte.warnung;
  switch (w.code) {
    case 'positionen-entfallen':
      return t.entfallen(
        w.anzahl,
        w.positionIds.map((p) => positionText(knoten, p)),
      );
    case 'nicht-angeboten':
      return t.nichtAngeboten(positionText(knoten, w.positionId));
    case 'zuschlagssatz-fehlt':
      return t.satzFehlt(positionText(knoten, w.positionId));
    case 'wahl-ohne-grundposition':
      return t.ohneGrundposition(positionText(knoten, w.positionId));
    case 'bezug-entfernt':
      return w.feld === 'zuschlag.bezug.positionen'
        ? t.bezugEntfernt(positionText(knoten, w.positionId), positionText(knoten, w.zielId))
        : t.grundpositionEntfernt(positionText(knoten, w.positionId), positionText(knoten, w.zielId));
  }
}

/** Vorschau und Befehl des Zuschlags für die gewählten Alternativen. */
export function zuschlagserteilungPlanen(e: Zuschlagserteilungseingang): Zuschlagserteilungsplan {
  const knoten = new Map<string, Knoten>(e.lv.leistungsverzeichnis.knoten.map((k) => [k.id, k]));
  const v = zuschlagsvorschau(e.lv, e.angebot, e.gewaehlt);
  const wahlgruppen = v.wahlgruppen.map((g): Wahlgruppenwahl => ({
    titel:
      g.grundpositionen.length > 0
        ? texte.wahl.statt(g.grundpositionen.map((p) => positionText(knoten, p)))
        : texte.wahl.gruppe(g.gruppe),
    alternativen: g.alternativen.map((x) => ({
      positionId: x.positionId,
      text: positionText(knoten, x.positionId),
      gewaehlt: e.gewaehlt.has(x.positionId),
    })),
  }));
  const r = zuschlagErteilen(e.lv, e.angebot, e.projekt, e.gewaehlt, e.neueId);
  if (!r.ok) {
    return {
      entfallend: v.entfallend,
      unbepreist: v.unbepreist,
      wahlgruppen,
      warnungen: [],
      fehler: r.fehler.meldung,
      befehl: null,
    };
  }
  return {
    entfallend: v.entfallend,
    unbepreist: v.unbepreist,
    wahlgruppen,
    warnungen: r.wert.warnungen.map((w) => warnungText(w, knoten)),
    fehler: null,
    befehl: r.wert.befehl,
  };
}

/** Kreuzt eine Alternative an oder ab; ankreuzen nimmt die anderen Alternativen derselben Gruppe weg. */
export function wahlSetzen(
  gewaehlt: ReadonlySet<PositionId>,
  gruppe: Wahlgruppenwahl,
  positionId: PositionId,
  an: boolean,
): ReadonlySet<PositionId> {
  const neu = new Set(gewaehlt);
  if (an) for (const x of gruppe.alternativen) neu.delete(x.positionId);
  if (an) neu.add(positionId);
  else neu.delete(positionId);
  return neu;
}
