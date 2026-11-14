// SPDX-License-Identifier: AGPL-3.0-or-later
// Angebotspositionen aus einer Angebotsdatei ohne XML (GAEB 90 .d84, Ticket 144; GAEB 2000 .p84, Ticket 145) gegen das LV, auf
// das der Bieter angeboten hat: Zuordnung allein über die OZ (wie beim DA-XML-Leser), je Position der LV-Reihenfolge eine
// Angebotsposition, fehlende gelten als nicht angeboten. Rein (A2).

import { gesamtpreis, vergleiche } from '@tethys/dezimal';
import type { Angebotsposition, Betrag, Einheitspreis, Knoten, Position, PositionId } from '@tethys/vertrag';
import { betragsziel } from '@tethys/kern';
import { deutsch } from './befunde';
import type { Zeilenmelder } from './zeilenbefunde';

const ozVon = (p: Position): string => `${p.ordnungszahl ?? '(ohne OZ)'}${p.ozIndex ?? ''}`;

export class Angebotsaufbau {
  private readonly imLv = new Map<string, Position>();
  private readonly zeilen = new Map<PositionId, Angebotsposition>();

  constructor(
    private readonly m: Zeilenmelder,
    private readonly knoten: readonly Knoten[],
  ) {
    for (const k of knoten)
      if (k.art === 'position' && k.ordnungszahl !== null) {
        m.ozBekannt(k.id, ozVon(k));
        const s = `${k.ordnungszahl}|${k.ozIndex ?? ''}`;
        if (!this.imLv.has(s)) this.imLv.set(s, k);
      }
  }

  /**
   * Ein Preis der Datei. `ordnungszahl` ist die OZ mit dem Trennzeichen des LV, `null`: nicht lesbar; `anzeige` steht in den
   * Befunden. Ohne EP gilt die Position als nicht angeboten.
   */
  preis(
    ordnungszahl: string | null,
    index: string | null,
    anzeige: string,
    ep: Einheitspreis | null,
    gb: Betrag | null,
    zeile: number | null,
  ): void {
    const p = ordnungszahl === null ? undefined : this.imLv.get(`${ordnungszahl}|${index ?? ''}`);
    if (!p) {
      this.m.melde(
        'fehler',
        'position-unbekannt',
        `Die Position ${anzeige} der Angebotsdatei gibt es im LV nicht; die Zeile wird nicht übernommen.`,
        zeile,
        { oz: anzeige },
      );
      return;
    }
    if (this.zeilen.has(p.id)) {
      this.m.melde(
        'fehler',
        'doppelte-ordnungszahl',
        `Die Position ${anzeige} steht mehrfach in der Angebotsdatei; nur die erste Zeile wird übernommen.`,
        zeile,
        { knotenId: p.id },
      );
      return;
    }
    if (ep === null) {
      this.zeilen.set(p.id, { positionId: p.id, status: 'nicht-angeboten' });
      return;
    }
    if (p.zuschlag !== null) {
      this.m.melde(
        'fehler',
        'zuschlag-art-abweichend',
        `Die Position ${anzeige} ist im LV eine Zuschlagsposition, die Angebotsdatei trägt dort einen Einheitspreis; die Zeile ` +
          'wird nicht übernommen.',
        zeile,
        { knotenId: p.id },
      );
      this.zeilen.set(p.id, { positionId: p.id, status: 'nicht-angeboten' });
      return;
    }
    if (gb !== null && p.menge !== null) {
      const soll = gesamtpreis(p.menge, ep);
      const ohneSumme = betragsziel(p) !== 'netto';
      if (!(ohneSumme && vergleiche(gb, '0.00' as Betrag) === 0) && vergleiche(gb, soll) !== 0) {
        const datei = { art: 'betrag', wert: gb } as const;
        const gerechnet = { art: 'betrag', wert: soll } as const;
        this.m.melde(
          'warnung',
          'gp-abweichend',
          `Der Gesamtbetrag der Angebotsdatei (${deutsch(datei)}) weicht von Menge des LV × EP (${deutsch(gerechnet)}) ab; ` +
            'gerechnet wird mit Menge × EP.',
          zeile,
          { knotenId: p.id, feld: 'gesamtpreis', werte: { datei, gerechnet } },
        );
      }
    }
    this.zeilen.set(p.id, { positionId: p.id, status: 'angeboten', einheitspreis: ep, epa: null });
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
          null,
          { knotenId: k.id },
        );
      aus.push(z ?? { positionId: k.id, status: 'nicht-angeboten' });
    }
    return aus;
  }
}
