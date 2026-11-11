// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 87 (A2): Aufmaßblätter in der App. Jede Änderung ist ein Befehl am Blatt (A5), ausgeführt von `abrechnung`
// (Ticket 80), geschrieben über den einen Schreibweg der App (`eintragSchreiben`, U7) und als Undo-Schritt geführt
// (ADR 0006). Gelesen wird über die Repositories aus `vertrag` v1.4 (Ticket 79): das Auftrags-LV und alle Blätter.

import {
  aufmassBefehlAusfuehren,
  aufmassChangeSetAnwenden,
  naechsteAufmassnummer,
} from '@tethys/abrechnung';
import type {
  Aufmass,
  AufmassAnlegen,
  AufmassBefehl,
  AufmassKopf,
  AufmassZustand,
  AuftragsLeistungsverzeichnis,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvZustand,
  Ergebnis,
  IdQuelle,
  ProjektId,
  Protokolleintrag,
  Speicher,
  Speicherfehler,
} from '@tethys/vertrag';
import type { Teil } from '../historie/historie';
import { Sitzung, eintragSchreiben, type Ausgang, type Befehlsweg, type Umgebung } from '../lv/befehlsweg';

export type AufmassSitzung = Sitzung<AufmassZustand | null, AufmassBefehl>;

/** Ein Befehl samt dem Teil für den Undo-Stapel (wie `Lauf` im Befehlsweg). */
type Lauf =
  | (Extract<Ausgang<AufmassZustand | null>, { ok: true }> & { readonly teil: Teil })
  | Extract<Ausgang<AufmassZustand | null>, { ok: false }>;

/** Ein Befehl am Aufmaßblatt durch `abrechnung` und den Speicher; `zustand` ist `null` nur für `AufmassAnlegen`. */
export async function aufmassBefehlAnwenden(
  u: Umgebung,
  projektId: ProjektId,
  zustand: AufmassZustand | null,
  befehl: AufmassBefehl,
): Promise<Lauf> {
  const r = aufmassBefehlAusfuehren(zustand, befehl);
  if (!r.ok) return { ok: false, abweisung: { art: 'befehl', fehler: r.fehler } };
  const cs = r.wert;
  const e: Protokolleintrag = {
    id: u.ids.protokoll(),
    projektId,
    aggregat: { art: 'aufmass', id: cs.aufmassId },
    wer: u.nutzer,
    wann: u.uhr(),
    befehl,
  };
  const s = await eintragSchreiben(u, e, cs);
  if (!s.ok) return { ok: false, abweisung: { art: 'speicher', fehler: s.fehler } };
  const teil: Teil = { protokollId: e.id, projektId, aggregat: e.aggregat, changeSet: cs };
  return { ok: true, zustand: aufmassChangeSetAnwenden(zustand, cs), hinweise: [], teil };
}

/** Eine Sitzung an einem Blatt: Befehle laufen über die gemeinsame Kette des Befehlswegs und sind Undo-Schritte. */
export function aufmassSitzung(
  weg: Befehlsweg,
  projektId: ProjektId,
  zustand: AufmassZustand | null,
): AufmassSitzung {
  return new Sitzung(weg, zustand, (z, b) => aufmassBefehlAnwenden(weg.umgebung, projektId, z, b));
}

/**
 * `AufmassAnlegen` für ein neues Blatt des Auftrags-LV: neue Kennung, die nächste Nummer (höchste + 1, Ticket 80),
 * Bezeichnung und Datum wie eingegeben, die Zeilen (leer oder aus einer X31).
 */
export function neuesBlatt(
  ids: Pick<IdQuelle, 'aufmass'>,
  auftrag: Pick<AuftragsLeistungsverzeichnis, 'id' | 'projektId'>,
  vorhanden: readonly Pick<AufmassKopf, 'nummer'>[],
  kopf: Pick<Aufmass, 'bezeichnung' | 'datum'>,
  positionen: Aufmass['positionen'] = [],
): AufmassAnlegen {
  return {
    art: 'AufmassAnlegen',
    aufmass: {
      id: ids.aufmass(),
      projektId: auftrag.projektId,
      auftragsLvId: auftrag.id,
      nummer: naechsteAufmassnummer(vorhanden),
      bezeichnung: kopf.bezeichnung,
      datum: kopf.datum,
      positionen,
    },
  };
}

export interface Abrechnungsstand {
  readonly auftrag: AuftragsLvZustand;
  /** Alle Blätter des Auftrags-LV, ganz geladen, nach Nummer (D-87.3). */
  readonly blaetter: readonly Aufmass[];
}

/**
 * Das Auftrags-LV und alle seine Blätter. Die Liste des Speichers nennt nur die Köpfe; die Zeilen braucht die Seite
 * trotzdem (Zahl der Positionen, „kumuliert bis hier“, Soll/Ist), also wird jedes Blatt geladen.
 */
export async function abrechnungLaden(
  speicher: Speicher,
  auftragsLvId: AuftragsLeistungsverzeichnisId,
): Promise<Ergebnis<Abrechnungsstand, Speicherfehler>> {
  const auftrag = await speicher.auftragsLeistungsverzeichnisse.laden(auftragsLvId);
  if (!auftrag.ok) return auftrag;
  const koepfe = await speicher.aufmasse.auflisten(auftragsLvId);
  if (!koepfe.ok) return koepfe;
  const blaetter: Aufmass[] = [];
  for (const k of koepfe.wert) {
    const b = await speicher.aufmasse.laden(k.id);
    if (!b.ok) return b;
    blaetter.push(b.wert.aufmass);
  }
  return { ok: true, wert: { auftrag: auftrag.wert, blaetter } };
}
