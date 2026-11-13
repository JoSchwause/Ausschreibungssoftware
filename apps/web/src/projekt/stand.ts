// SPDX-License-Identifier: AGPL-3.0-or-later
// Was die Projektübersicht und die Listen je Projekt zeigen (Ticket 131): das Projekt, seine LVs mit der Zahl der Angebote,
// die Auftrags-LVs mit Nachträgen, Aufmaßblättern und Rechnungen und die Zahl der Gegenstände in Kosten und Vorschau. Nur
// Listen der Repositories, kein LV wird ganz geladen.

import type {
  AufmassKopf,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvUebersicht,
  Ergebnis,
  LeistungsverzeichnisId,
  LvUebersicht,
  Projekt,
  ProjektId,
  Rechnung,
  Speicher,
  Speicherfehler,
} from '@tethys/vertrag';

export interface Vorschauzahlen {
  readonly modelle: number;
  readonly bauzeit: number;
  readonly honorar: number;
  readonly maengel: number;
  readonly bautagebuch: number;
}

export interface Projektstand {
  readonly projekt: Projekt;
  /** Nach Name, wie der Speicher sie liefert. */
  readonly lvs: readonly LvUebersicht[];
  /** Zahl der Angebote je LV. */
  readonly angebote: ReadonlyMap<LeistungsverzeichnisId, number>;
  readonly auftraege: readonly AuftragsLvUebersicht[];
  readonly aufmasse: ReadonlyMap<AuftragsLeistungsverzeichnisId, readonly AufmassKopf[]>;
  readonly rechnungen: ReadonlyMap<AuftragsLeistungsverzeichnisId, readonly Rechnung[]>;
  readonly kostenermittlungen: number;
  readonly vorschau: Vorschauzahlen;
}

/** Länge einer Liste; eine Liste, die sich nicht lesen lässt, zählt 0 (die Übersicht soll trotzdem erscheinen). */
const anzahl = (r: Ergebnis<readonly unknown[], Speicherfehler>): number => (r.ok ? r.wert.length : 0);

/** Der Stand der Projektseiten; `null`, wenn es das Projekt nicht (mehr) gibt. */
export async function projektstandLaden(
  speicher: Speicher,
  projektId: ProjektId,
): Promise<Projektstand | null> {
  const p = await speicher.projekte.laden(projektId);
  if (!p.ok) return null;
  // Ein Fehler lässt die Liste leer wie bisher auf der Projektseite.
  const l = await speicher.leistungsverzeichnisse.auflisten(projektId);
  const lvs = l.ok ? l.wert : [];
  const angebote = new Map<LeistungsverzeichnisId, number>();
  for (const lv of lvs) angebote.set(lv.id, anzahl(await speicher.angebote.auflisten(lv.id)));
  const a = await speicher.auftragsLeistungsverzeichnisse.auflisten(projektId);
  const auftraege = a.ok ? a.wert : [];
  const aufmasse = new Map<AuftragsLeistungsverzeichnisId, readonly AufmassKopf[]>();
  const rechnungen = new Map<AuftragsLeistungsverzeichnisId, readonly Rechnung[]>();
  for (const auftrag of auftraege) {
    const am = await speicher.aufmasse.auflisten(auftrag.id);
    aufmasse.set(auftrag.id, am.ok ? am.wert : []);
    const re = await speicher.rechnungen.auflisten(auftrag.id);
    rechnungen.set(auftrag.id, re.ok ? re.wert : []);
  }
  return {
    projekt: p.wert,
    lvs,
    angebote,
    auftraege,
    aufmasse,
    rechnungen,
    kostenermittlungen: anzahl(await speicher.kostenermittlungen.auflisten(projektId)),
    vorschau: {
      modelle: anzahl(await speicher.bauwerksmodelle.auflisten(projektId)),
      bauzeit: anzahl(await speicher.bauzeitenplaene.auflisten(projektId)),
      honorar: anzahl(await speicher.honorarberechnungen.auflisten(projektId)),
      maengel: anzahl(await speicher.maengel.auflisten(projektId)),
      bautagebuch: anzahl(await speicher.bautagebuch.auflisten(projektId)),
    },
  };
}

/** Das Auftrags-LV zu einem LV (höchstens eines, D-21); `null`: noch kein Zuschlag. */
export function auftragZu(stand: Projektstand, lvId: LeistungsverzeichnisId): AuftragsLvUebersicht | null {
  return stand.auftraege.find((a) => a.leistungsverzeichnisId === lvId) ?? null;
}

/** Die Nachtrags-LVs eines Auftrags-LV. */
export function nachtraegeZu(
  stand: Projektstand,
  auftragsLvId: AuftragsLeistungsverzeichnisId,
): LvUebersicht[] {
  return stand.lvs.filter((lv) => lv.nachtrag?.auftragsLvId === auftragsLvId);
}
