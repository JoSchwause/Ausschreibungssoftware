// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Zuordnung der Zeilen einer Angebotsdatei zum LV, auf das der Bieter angeboten hat, mit ihren Befunden: ein Weg für alle
// Formate (GAEB DA XML, GAEB 90 .d84, GAEB 2000 .p84). Zuordnung allein über die OZ (A7), je Position der LV-Reihenfolge eine
// Angebotsposition, fehlende gelten als nicht angeboten. Die Formate unterscheiden sich nur im Ort eines Befunds (Element der
// XML-Datei oder Zeile der Datei). Rein (A2).

import { NULL_BETRAG, gesamtpreis, vergleiche } from '@tethys/dezimal';
import { betragsziel } from '@tethys/kern';
import type { Angebotsposition, Betrag, Einheitspreis, Knoten, Position, PositionId } from '@tethys/vertrag';
import { deutsch } from './befunde';
import type { Befundwert, GaebBefund, GaebBefundcode } from './befunde';
import type { Befundangaben } from './lesen';

/** Was die Zuordnung von einem Leser braucht; `O` ist der Ort eines Befunds im Format des Lesers. */
export interface Angebotsmelder<O> {
  melde(schwere: GaebBefund['schwere'], code: GaebBefundcode, meldung: string, ort: O, angaben?: Befundangaben): void;
  ozBekannt(knotenId: string, oz: string | null): void;
}

/** Die OZ einer Position zur Anzeige in Befunden. */
export const ozVon = (p: Position): string => `${p.ordnungszahl ?? '(ohne OZ)'}${p.ozIndex ?? ''}`;

export class Angebotszuordnung<O> {
  /** OZ-Schlüssel (`oz|index`) → Position des LV; bei doppelter OZ im LV die erste. */
  private readonly imLv = new Map<string, Position>();
  /** Gelesene Zeilen je Position des LV; `null`: Zeile vorhanden, aber nicht übernommen. */
  private readonly zeilen = new Map<PositionId, Angebotsposition | null>();

  /** `ohneOrt`: der Ort eines Befunds, der an keiner Stelle der Datei hängt (eine im Angebot fehlende Position). */
  constructor(
    private readonly m: Angebotsmelder<O>,
    private readonly knoten: readonly Knoten[],
    private readonly ohneOrt: O,
  ) {
    for (const k of knoten)
      if (k.art === 'position' && k.ordnungszahl !== null) {
        m.ozBekannt(k.id, ozVon(k));
        const s = `${k.ordnungszahl}|${k.ozIndex ?? ''}`;
        if (!this.imLv.has(s)) this.imLv.set(s, k);
      }
  }

  /**
   * Die Position des LV zu einer Zeile der Datei. `ordnungszahl` ist die OZ mit dem Trennzeichen des LV, `null`: nicht
   * lesbar; `anzeige` steht in den Befunden. Gibt es sie nicht oder hat sie schon eine Zeile, Befund und `null`.
   */
  position(ordnungszahl: string | null, index: string | null, anzeige: string, ort: O): Position | null {
    const p = ordnungszahl === null ? undefined : this.imLv.get(`${ordnungszahl}|${index ?? ''}`);
    if (!p) {
      this.m.melde(
        'fehler',
        'position-unbekannt',
        `Die Position ${anzeige} der Angebotsdatei gibt es im LV nicht; die Zeile wird nicht übernommen.`,
        ort,
        ordnungszahl === null ? {} : { oz: anzeige },
      );
      return null;
    }
    if (this.zeilen.has(p.id)) {
      this.m.melde(
        'fehler',
        'doppelte-ordnungszahl',
        `Die Position ${anzeige} steht mehrfach in der Angebotsdatei; nur die erste Zeile wird übernommen.`,
        ort,
        { knotenId: p.id },
      );
      return null;
    }
    return p;
  }

  /**
   * Prüft, ob die Zeile zur Art der Position passt (Zuschlagsposition oder nicht). Passt sie nicht: Befund, die Zeile wird
   * nicht übernommen (die Position gilt als nicht angeboten), Ergebnis `false`. `wert` ist der Satz oder Preis der Zeile.
   */
  artPasst(p: Position, anzeige: string, zuschlagszeile: boolean, wert: Befundwert | null, ort: O): boolean {
    if (zuschlagszeile === (p.zuschlag !== null)) return true;
    const angabe = `${zuschlagszeile ? 'einen Zuschlagssatz' : 'einen Einheitspreis'}${wert === null ? '' : ` (${deutsch(wert)})`}`;
    this.m.melde(
      'fehler',
      'zuschlag-art-abweichend',
      `Die Position ${anzeige} ist im LV ${p.zuschlag === null ? 'keine' : 'eine'} Zuschlagsposition, die Angebotsdatei ` +
        `trägt dort ${angabe}; die Zeile wird nicht übernommen.`,
      ort,
      { knotenId: p.id, ...(wert === null ? {} : { werte: { wert } }) },
    );
    this.zeilen.set(p.id, null);
    return false;
  }

  /**
   * Der Gesamtpreis der Datei gegen gerundet(Menge des LV × EP, 2) (N2); nur Befund, gerechnet wird mit Menge × EP. Eine
   * Position, die nicht ins Netto eingeht (Wahl, Bedarf ohne Gesamtbetrag), trägt in der Datei 0,00 (BVBS Bauausführung,
   * 001.002.0050); das ist kein abweichender Gesamtpreis (D-45.1). Wohin ein Betrag geht, sagt allein der Kern
   * (`betragsziel`, D-16).
   */
  gesamtpreisPruefen(p: Position, ep: Einheitspreis, gp: Betrag, ort: O): void {
    if (p.menge === null) return;
    if (betragsziel(p) !== 'netto' && vergleiche(gp, NULL_BETRAG) === 0) return;
    const soll = gesamtpreis(p.menge, ep);
    if (vergleiche(gp, soll) === 0) return;
    const datei = { art: 'betrag', wert: gp } as const;
    const gerechnet = { art: 'betrag', wert: soll } as const;
    this.m.melde(
      'warnung',
      'gp-abweichend',
      `Der Gesamtpreis der Angebotsdatei (${deutsch(datei)}) weicht von Menge des LV × EP (${deutsch(gerechnet)}) ab; ` +
        'gerechnet wird mit Menge × EP.',
      ort,
      { knotenId: p.id, feld: 'gesamtpreis', werte: { datei, gerechnet } },
    );
  }

  /** Übernimmt die Zeile einer Position. */
  setze(z: Angebotsposition): void {
    this.zeilen.set(z.positionId, z);
  }

  /** Je Position des LV eine Angebotsposition in LV-Reihenfolge; was die Datei nicht nennt, ist nicht angeboten (Befund). */
  positionen(): Angebotsposition[] {
    const aus: Angebotsposition[] = [];
    for (const k of this.knoten) {
      if (k.art !== 'position') continue;
      const z = this.zeilen.get(k.id);
      if (z === undefined)
        this.m.melde(
          'warnung',
          'position-fehlt-im-angebot',
          `Die Position ${ozVon(k)} des LV fehlt in der Angebotsdatei; sie gilt als nicht angeboten.`,
          this.ohneOrt,
          { knotenId: k.id },
        );
      aus.push(z ?? { positionId: k.id, status: 'nicht-angeboten' });
    }
    return aus;
  }
}

/**
 * Eine Preiszeile der Formate ohne XML (GAEB 90, GAEB 2000): nur Einheitspreis und Gesamtpreis, keine Zuschlagssätze und
 * keine Einheitspreisanteile. Ohne EP gilt die Position als nicht angeboten.
 */
export function preiszeileOhneXml(
  z: Angebotszuordnung<number | null>,
  ordnungszahl: string | null,
  index: string | null,
  anzeige: string,
  ep: Einheitspreis | null,
  gp: Betrag | null,
  zeile: number | null,
): void {
  const p = z.position(ordnungszahl, index, anzeige, zeile);
  if (p === null) return;
  if (ep === null) {
    z.setze({ positionId: p.id, status: 'nicht-angeboten' });
    return;
  }
  if (!z.artPasst(p, anzeige, false, { art: 'einheitspreis', wert: ep }, zeile)) return;
  if (gp !== null) z.gesamtpreisPruefen(p, ep, gp, zeile);
  z.setze({ positionId: p.id, status: 'angeboten', einheitspreis: ep, epa: null });
}
