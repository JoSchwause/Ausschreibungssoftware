// SPDX-License-Identifier: AGPL-3.0-or-later
// Baum eines LV aus einer Folge von Ereignissen (Gliederung öffnen und schließen, Hinweistext, Position), unabhängig vom
// Format der Datei (Ticket 144: GAEB 90; für GAEB 2000 in Ticket 145 gedacht). Dieselben Regeln wie der DA-XML-Leser: OZ aus
// den Teilen mit dem Trennzeichen, doppelte OZ als Befund, Wahl mit Verweis auf die Grundposition derselben Gliederung.
// Rein (A2): Kennungen aus der `IdQuelle`.

import type {
  ElternId,
  Einheitspreis,
  Hinweistext,
  IdQuelle,
  Knoten,
  Langtext,
  LeistungsverzeichnisId,
  Menge,
  Ordnungszahl,
  OzMaske,
  Position,
  PositionId,
  Positionsmerkmale,
  Titel,
} from '@tethys/vertrag';
import { MAX_STUFEN } from './lesen';
import type { Zeilenmelder } from './zeilenbefunde';

/** Zugehörigkeit zu einer Wahl, wie die Datei sie nennt; Nummern fehlen, wenn das Format keine trägt (`null`). */
export interface Wahlangabe {
  readonly art: 'grund' | 'alternative';
  readonly gruppe: number | null;
  readonly variante: number | null;
}

/** Was eine Position aus der Datei mitbringt; die Kennung vergibt `LvAufbau`. */
export interface Positionsangaben {
  /** Teile der OZ: Gliederungsstufen, dann die Positionsstelle; `null`: die OZ ist nicht lesbar. */
  readonly teile: readonly string[] | null;
  readonly index: string | null;
  readonly merkmale: Omit<Positionsmerkmale, 'wahl'>;
  readonly wahl: Wahlangabe | null;
  readonly kurztext: string;
  readonly langtext: Langtext;
  readonly menge: Menge | null;
  readonly einheit: string | null;
  readonly einheitspreis: Einheitspreis | null;
  readonly zeile: number | null;
}

interface Ebene {
  readonly id: string;
  readonly teile: readonly string[];
  readonly grundpositionen: { readonly gruppe: number | null; readonly id: PositionId }[];
}

export class LvAufbau {
  readonly knoten: Knoten[] = [];
  readonly wurzelId: LeistungsverzeichnisId;
  private readonly stapel: Ebene[];
  private readonly folge = new Map<string, number>();
  private readonly ozGesehen = new Set<string>();

  constructor(
    private readonly m: Zeilenmelder,
    private readonly ids: IdQuelle,
    private readonly maske: OzMaske,
  ) {
    this.wurzelId = ids.leistungsverzeichnis();
    this.stapel = [{ id: this.wurzelId, teile: [], grundpositionen: [] }];
  }

  private get oben(): Ebene {
    return this.stapel.at(-1) as Ebene;
  }

  private reihenfolge(elternId: string): number {
    const n = this.folge.get(elternId) ?? 0;
    this.folge.set(elternId, n + 1);
    return n;
  }

  private oz(teile: readonly string[]): Ordnungszahl {
    return teile.join(this.maske.trennzeichen ?? '') as Ordnungszahl;
  }

  /** Öffnet eine Gliederung (Titel) unter der aktuellen; `teile` ist ihre OZ in Teilen, `null`: nicht lesbar. */
  oeffne(teile: readonly string[] | null, kurztext: string, zeile: number | null): void {
    const tiefe = this.stapel.length;
    const ordnungszahl = teile === null || teile.length === 0 ? null : this.oz(teile);
    if (tiefe > MAX_STUFEN || tiefe > Math.max(this.maske.gliederung.length, 1))
      this.m.melde(
        'fehler',
        'gliederung-ueberzaehlig',
        `Gliederungsebene ${String(tiefe)}${ordnungszahl === null ? '' : ` (${ordnungszahl})`}: Die Gliederung hat nur ` +
          `${String(this.maske.gliederung.length)} ${this.maske.gliederung.length === 1 ? 'Stufe' : 'Stufen'}.`,
        zeile,
      );
    const titel: Titel = {
      art: 'titel',
      id: this.ids.titel(),
      elternId: this.oben.id as ElternId,
      reihenfolge: this.reihenfolge(this.oben.id),
      ordnungszahl,
      kurztext,
    };
    this.knoten.push(titel);
    this.m.ozBekannt(titel.id, ordnungszahl);
    this.stapel.push({ id: titel.id, teile: teile ?? this.oben.teile, grundpositionen: [] });
  }

  /** Schließt die aktuelle Gliederung; nennt die Datei eine andere OZ als die geöffnete, ist das ein Befund. */
  schliesse(teile: readonly string[] | null, zeile: number | null): void {
    if (this.stapel.length === 1) {
      this.m.melde(
        'warnung',
        'gliederungsende-abweichend',
        'Das Ende einer Gliederung steht, ohne dass eine Gliederung offen ist; es wird übergangen.',
        zeile,
      );
      return;
    }
    const offen = this.stapel.pop() as Ebene;
    if (teile !== null && this.oz(teile) !== this.oz(offen.teile))
      this.m.melde(
        'warnung',
        'gliederungsende-abweichend',
        `Das Ende der Gliederung nennt die OZ ${this.oz(teile)}, offen ist ${this.oz(offen.teile)}; die offene Gliederung ` +
          'wird geschlossen.',
        zeile,
        { knotenId: offen.id },
      );
  }

  /** Ein Hinweistext (Vor- oder Nachtext) an der aktuellen Stelle. */
  hinweis(text: Langtext): void {
    const h: Hinweistext = {
      art: 'hinweis',
      id: this.ids.hinweistext(),
      elternId: this.oben.id as ElternId,
      reihenfolge: this.reihenfolge(this.oben.id),
      text,
    };
    this.knoten.push(h);
  }

  /** Eine Position unter der aktuellen Gliederung. */
  position(p: Positionsangaben): Position {
    const id = this.ids.position();
    const ordnungszahl = p.teile === null ? null : this.oz(p.teile);
    if (ordnungszahl !== null) {
      const schluessel = `${ordnungszahl}|${p.index ?? ''}`;
      if (this.ozGesehen.has(schluessel))
        this.m.melde(
          'warnung',
          'doppelte-ordnungszahl',
          `Die Ordnungszahl ${ordnungszahl}${p.index ?? ''} kommt mehrfach vor.`,
          p.zeile,
          { knotenId: id },
        );
      else this.ozGesehen.add(schluessel);
    }
    this.m.ozBekannt(id, ordnungszahl === null ? null : `${ordnungszahl}${p.index ?? ''}`);
    const pos: Position = {
      art: 'position',
      id,
      elternId: this.oben.id as ElternId,
      reihenfolge: this.reihenfolge(this.oben.id),
      ordnungszahl,
      ozIndex: p.index,
      merkmale: { ...p.merkmale, wahl: this.wahl(p.wahl, id, p.zeile) },
      zuschlag: null,
      kurztext: p.kurztext,
      langtext: p.langtext,
      menge: p.menge,
      einheit: p.einheit,
      einheitspreis: p.einheitspreis,
      epa: null,
    };
    this.knoten.push(pos);
    return pos;
  }

  /**
   * Grundposition: Variante 0, wenn die Datei keine nennt (Grundausführung). Alternative: Verweis auf die Grundposition derselben
   * Gruppe in derselben Gliederung davor, nur wenn es genau eine gibt (ohne Nummern zählen alle Grundpositionen ohne Gruppe);
   * sonst kein Verweis und ein Befund (Lesart D-144.6: lieber Befund als raten).
   */
  private wahl(w: Wahlangabe | null, id: PositionId, zeile: number | null): Positionsmerkmale['wahl'] {
    if (w === null) return null;
    const ebene = this.oben;
    if (w.art === 'grund') {
      ebene.grundpositionen.push({ gruppe: w.gruppe, id });
      return { gruppe: w.gruppe, variante: w.variante ?? 0, grundpositionId: null };
    }
    const kandidaten = ebene.grundpositionen.filter((g) => g.gruppe === w.gruppe);
    const grund = kandidaten.length === 1 ? (kandidaten[0]?.id ?? null) : null;
    if (grund === null)
      this.m.melde(
        'warnung',
        'wahl-ohne-grundposition',
        kandidaten.length === 0
          ? 'Zur Wahlposition gibt es in derselben Gliederung davor keine Grundposition.'
          : `Zur Wahlposition gibt es in derselben Gliederung ${String(kandidaten.length)} Grundpositionen; die Datei sagt ` +
              'nicht, zu welcher sie gehört. Die Wahlposition bleibt ohne Verweis.',
        zeile,
        { knotenId: id, feld: 'grundpositionId' },
      );
    return { gruppe: w.gruppe, variante: w.variante, grundpositionId: grund };
  }

  /** Am Ende der Datei: offene Gliederungen sind ein Befund. */
  ende(zeile: number | null): void {
    if (this.stapel.length > 1)
      this.m.melde(
        'warnung',
        'gliederungsende-abweichend',
        `${String(this.stapel.length - 1)} ${this.stapel.length === 2 ? 'Gliederung ist' : 'Gliederungen sind'} am Ende der ` +
          'Datei nicht geschlossen.',
        zeile,
      );
  }
}
