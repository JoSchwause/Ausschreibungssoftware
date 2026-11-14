// SPDX-License-Identifier: AGPL-3.0-or-later
// Projekt samt Inhalt löschen (E8, D-96): den Bestand lesen, die Anzahl je Art zählen und den Befehl durch Kern und Speicher
// schreiben, als ein Undo-Schritt (A5, Q5). Der Bestand kommt aus der exportierten Projektdatei (D-160.4): genau die Form, gegen
// die der Speicher vergleicht; das Protokoll zählt nicht als Art.

import { projektSamtInhaltLoeschenAusfuehren } from '@tethys/kern';
import type {
  Ergebnis,
  Projekt,
  Projektbestand,
  Projektdatei,
  ProjektId,
  Speicher,
  Speicherfehler,
} from '@tethys/vertrag';
import { eintrag, speichern, type Ausgang, type Befehlsweg } from '../lv/befehlsweg';

/** Das gespeicherte Projekt und sein Bestand. */
export interface Projektinhalt {
  readonly projekt: Projekt;
  readonly bestand: Projektbestand;
}

/** Was die Projektdatei trägt, aber nicht zum Bestand gehört (Vertrag, `Projektbestand`). */
const NICHT_IM_BESTAND = new Set(['schemaVersion', 'projekt', 'modelldateien', 'einstellungen']);

/** Liest Projekt und Bestand aus der Projektdatei, wie der Speicher sie exportiert. */
export async function projektinhaltLesen(
  speicher: Speicher,
  id: ProjektId,
): Promise<Ergebnis<Projektinhalt, Speicherfehler>> {
  const r = await speicher.projektdateiExportieren(id);
  if (!r.ok) return r;
  const d = JSON.parse(r.wert) as Projektdatei;
  const bestand = Object.fromEntries(
    Object.entries(d).filter(([k]) => !NICHT_IM_BESTAND.has(k)),
  ) as unknown as Projektbestand;
  return { ok: true, wert: { projekt: d.projekt, bestand } };
}

/** Die Arten des Bestands, wie der Dialog sie zählt, in der Reihenfolge der Projektseite. */
export const INHALTSARTEN = [
  'leistungsverzeichnisse',
  'lvStaende',
  'angebote',
  'auftragsLeistungsverzeichnisse',
  'aufmasse',
  'rechnungen',
  'kostenermittlungen',
  'bauwerksmodelle',
  'bauzeitenplaene',
  'honorarberechnungen',
  'maengel',
  'bautagebuch',
] as const satisfies readonly Exclude<keyof Projektbestand, 'protokoll'>[];

export type Inhaltsart = (typeof INHALTSARTEN)[number];

/** Anzahl je Art, nur Arten mit mindestens einem Eintrag; leer: Das Projekt hat keinen Inhalt. */
export function anzahlJeArt(
  b: Projektbestand,
): readonly { readonly art: Inhaltsart; readonly anzahl: number }[] {
  return INHALTSARTEN.map((art) => ({ art, anzahl: b[art]?.length ?? 0 })).filter((x) => x.anzahl > 0);
}

/**
 * Löscht das Projekt samt Inhalt: liest den Bestand in der Kette des Befehlswegs (so ist er der gespeicherte, auch wenn kurz
 * vorher noch ein Befehl lief), führt den Befehl im Kern aus und schreibt ihn. Ein Undo-Schritt; Rückgängig stellt alles her.
 */
export function projektSamtInhaltLoeschen(weg: Befehlsweg, id: ProjektId): Promise<Ausgang<null>> {
  const u = weg.umgebung;
  return weg.reihe(async (): Promise<Ausgang<null>> => {
    const inhalt = await projektinhaltLesen(u.speicher, id);
    if (!inhalt.ok) return { ok: false, abweisung: { art: 'speicher', fehler: inhalt.fehler } };
    const befehl = { art: 'ProjektSamtInhaltLoeschen' } as const;
    const r = projektSamtInhaltLoeschenAusfuehren(inhalt.wert.projekt, befehl, inhalt.wert.bestand);
    if (!r.ok) return { ok: false, abweisung: { art: 'befehl', fehler: r.fehler } };
    const e = eintrag(u, id, { art: 'projekt', id }, befehl);
    const a = await speichern(u, e, r.wert, () => null, []);
    if (!a.ok) return a;
    weg.historie.aufnehmen([a.teil]);
    return { ok: true, zustand: null, hinweise: [] };
  });
}
