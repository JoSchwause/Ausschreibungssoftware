// SPDX-License-Identifier: AGPL-3.0-or-later
// Befunde der Leser für zeilenweise Formate ohne XML (GAEB 90, Ticket 144; GAEB 2000, Ticket 145): dieselben
// Befunde wie beim DA-XML-Leser (`GaebBefund`, Gruppe „Nicht übernommen“, OZ am Knoten), der Ort ist die Zeile der Datei.
// Rein (A2).

import type { GaebPhase, PositionId } from '@tethys/vertrag';
import { anzahl, text } from './befunde';
import type { GaebBefund, GaebBefundcode } from './befunde';
import type { Phasenquelle } from './erkennung';
import type { Befundangaben, Sammelangaben } from './lesen';

/** Höchstzahl einzeln aufgezeichneter Befunde (wie beim DA-XML-Leser). */
const MAX_BEFUNDE = 10_000;

interface Sammlung {
  anzahl: number;
  readonly zeile: number | null;
  readonly code: GaebBefundcode;
  readonly meldung: (anzahl: number) => string;
  readonly angaben: Sammelangaben;
}

/** Sammelt die Befunde eines Aufrufs; `ergebnis()` gibt sie samt zusammengefasster Befunde und OZ zurück. */
export class Zeilenmelder {
  private readonly befunde: GaebBefund[] = [];
  private readonly sammlungen = new Map<string, Sammlung>();
  private readonly ozJeKnoten = new Map<string, string>();
  private begrenzt = false;

  private ort(zeile: number | null, angaben: Befundangaben): GaebBefund['ort'] {
    return {
      ...(zeile === null ? {} : { zeile }),
      ...(angaben.knotenId === undefined ? {} : { knotenId: angaben.knotenId as PositionId }),
      ...(angaben.feld === undefined ? {} : { feld: angaben.feld }),
    };
  }

  melde(
    schwere: GaebBefund['schwere'],
    code: GaebBefundcode,
    meldung: string,
    zeile: number | null,
    angaben: Befundangaben = {},
  ): void {
    if (this.befunde.length >= MAX_BEFUNDE) {
      if (!this.begrenzt) {
        this.begrenzt = true;
        this.befunde.push({
          schwere: 'warnung',
          quelle: 'gaeb-lesen',
          code: 'befunde-begrenzt',
          meldung: `Weitere Befunde werden nicht mehr aufgezeichnet (höchstens ${String(MAX_BEFUNDE)}).`,
          ort: {},
        });
      }
      return;
    }
    const { werte, oz, nichtUebernommen } = angaben;
    this.befunde.push({
      schwere,
      quelle: 'gaeb-lesen',
      code,
      meldung,
      ort: this.ort(zeile, angaben),
      ...(werte === undefined || Object.keys(werte).length === 0 ? {} : { werte }),
      ...(oz === undefined ? {} : { oz }),
      ...(nichtUebernommen === undefined ? {} : { nichtUebernommen }),
    });
  }

  /** Fasst gleichartige Befunde zu einem zusammen (Anzahl, erste Zeile); der Wert `anzahl` kommt beim Abschluss dazu. */
  sammle(
    schluessel: string,
    code: GaebBefundcode,
    zeile: number | null,
    meldung: (anzahl: number) => string,
    angaben: Sammelangaben = {},
  ): void {
    const vorhanden = this.sammlungen.get(schluessel);
    if (vorhanden) vorhanden.anzahl += 1;
    else this.sammlungen.set(schluessel, { anzahl: 1, zeile, code, meldung, angaben });
  }

  /**
   * Eine Angabe der Datei, die nicht übernommen wird (Gruppe „Nicht übernommen“): `bezeichnung` in Nutzersprache
   * („Währung“), `grund` sagt bei Bedarf warum. Gleiche Bezeichnungen werden zu einem Befund mit Anzahl.
   */
  nichtUebernommen(zeile: number | null, bezeichnung: string, grund?: string): void {
    this.sammle(
      `nicht-abgebildet|${bezeichnung}`,
      'nicht-abgebildet',
      zeile,
      (n) =>
        `${bezeichnung} wird nicht übernommen${grund === undefined ? '' : `: ${grund}`}` +
        `${n > 1 ? ` (${String(n)} Vorkommen)` : ''}.`,
      { werte: { element: text(bezeichnung) }, nichtUebernommen: bezeichnung },
    );
  }

  /** Merkt die OZ eines Knotens für die Befunde an ihm. */
  ozBekannt(knotenId: string, oz: string | null): void {
    if (oz !== null && oz !== '') this.ozJeKnoten.set(knotenId, oz);
  }

  /** Alle Befunde: einzelne in Meldereihenfolge, dann die zusammengefassten; an Knoten mit bekannter OZ diese OZ. */
  ergebnis(): GaebBefund[] {
    const gesammelt: GaebBefund[] = [...this.sammlungen.values()].map((s) => ({
      schwere: 'warnung',
      quelle: 'gaeb-lesen',
      code: s.code,
      meldung: s.meldung(s.anzahl),
      ort: this.ort(s.zeile, {}),
      werte: { ...s.angaben.werte, anzahl: anzahl(s.anzahl) },
      ...(s.angaben.nichtUebernommen === undefined ? {} : { nichtUebernommen: s.angaben.nichtUebernommen }),
    }));
    return [...this.befunde, ...gesammelt].map((b) => {
      const oz = b.ort.knotenId === undefined ? undefined : this.ozJeKnoten.get(b.ort.knotenId);
      return b.oz !== undefined || oz === undefined ? b : { ...b, oz };
    });
  }
}

/** Der Befund zum Zeichensatz einer Datei ohne XML: Name des gelesenen Zeichensatzes und Meldung. */
export interface Zeichensatzbefund {
  readonly name: string;
  readonly meldung: string;
}

/** Die Datei nennt ihren Zeichensatz nicht; er wurde am Inhalt erkannt (GAEB 90 immer, GAEB 2000 ohne Angabe). */
export const zeichensatzAmInhalt = (name: string): Zeichensatzbefund => ({
  name,
  meldung: `Die Datei nennt ihren Zeichensatz nicht; am Inhalt erkannt und gelesen als ${name}. Umlaute bitte prüfen.`,
});

/** Was die Grundbefunde einer Datei ohne XML brauchen. */
export interface Grundangaben {
  readonly format: 'GAEB 90' | 'GAEB 2000';
  readonly zeichensatz: Zeichensatzbefund | null;
  readonly phase: GaebPhase | null;
  readonly phasenquelle: Phasenquelle | null;
  readonly endungsphase: GaebPhase | null;
  /** Die Zeile, in der die Datei ihre Phase nennt; `null`: nicht bekannt. */
  readonly phasenzeile: number | null;
}

/**
 * Befunde, die jeder Import einer Datei ohne XML trägt (GAEB 90 und GAEB 2000 gleich): der feste Hinweis (D-71), der
 * Zeichensatz und ein Widerspruch zwischen Inhalt und Endung.
 */
export function grundbefunde(m: Zeilenmelder, a: Grundangaben): void {
  m.melde(
    'warnung',
    'format-ungeprueft',
    `Das Lesen von ${a.format} ist nach der Formatbeschreibung gebaut und nicht an Dateien aus anderer Software geprüft; ` +
      'bitte die Summen mit denen des Absenders vergleichen.',
    null,
    { werte: { format: text(a.format) } },
  );
  if (a.zeichensatz !== null)
    m.melde('warnung', 'zeichensatz-erkannt', a.zeichensatz.meldung, null, {
      werte: { zeichensatz: text(a.zeichensatz.name) },
    });
  if (a.phasenquelle === 'inhalt' && a.endungsphase !== null && a.endungsphase !== a.phase)
    m.melde(
      'warnung',
      'phase-endung-widerspruch',
      `Die Dateiendung weist auf ${a.endungsphase}, die Datei selbst nennt ${a.phase ?? ''}; es gilt die Datei.`,
      a.phasenzeile,
      { werte: { phase: text(a.phase ?? ''), endung: text(a.endungsphase) } },
    );
}
