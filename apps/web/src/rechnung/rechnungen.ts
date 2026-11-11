// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 88: die Rechnungen eines Auftrags-LV in der App. Laden über die Repositories des Speichers (Ticket 79), schreiben
// nur über Befehle (A5, U7): Ausführer (`abrechnung`) → `speicher.anwenden` mit Protokolleintrag am Aggregat Rechnung →
// Zustand der Seite. Eine Sitzung hält die Rechnungen des Auftrags-LV nach Nummer; mehrere Befehle einer Aktion
// (`folge`) sind ein Undo-Schritt. Weist der Speicher ab (z. B. `konflikt` bei der Reihenfolge der Freigaben, D-34 (7)),
// bleibt der Zustand und der Grund kommt als Wert zurück (Q5).

import type {
  Aufmass,
  AufmassKopf,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvZustand,
  Ergebnis,
  ProjektId,
  Rechnung,
  RechnungBefehl,
  RechnungId,
  Speicher,
  Speicherfehler,
} from '@tethys/vertrag';
import type { Teil } from '../historie/historie';
import { nachtraegeLaden, type Nachtragseintrag } from '../nachtrag/speichern';
import { Sitzung, eintragSchreiben, type Befehlsweg, type Umgebung } from '../lv/befehlsweg';
import { rechnungBefehlAusfuehren, rechnungChangeSetAnwenden } from './ausfuehrer';

/** Ein Befehl an eine Rechnung; `rechnungId: null` nur für `RechnungAnlegen`. */
export interface Rechnungsauftrag {
  readonly rechnungId: RechnungId | null;
  readonly befehl: RechnungBefehl;
}

export type RechnungenSitzung = Sitzung<readonly Rechnung[], Rechnungsauftrag>;

const nachNummer = (rs: readonly Rechnung[]): readonly Rechnung[] =>
  [...rs].sort((a, b) => a.nummer - b.nummer);

async function ausfuehren(
  u: Umgebung,
  projektId: ProjektId,
  rechnungen: readonly Rechnung[],
  a: Rechnungsauftrag,
) {
  const vorher = a.rechnungId === null ? undefined : rechnungen.find((r) => r.id === a.rechnungId);
  const zustand = vorher === undefined ? null : { rechnung: vorher };
  const r = rechnungBefehlAusfuehren(zustand, a.befehl);
  if (!r.ok) return { ok: false, abweisung: { art: 'befehl', fehler: r.fehler } } as const;
  const cs = r.wert;
  const e = {
    id: u.ids.protokoll(),
    projektId,
    aggregat: { art: 'rechnung', id: cs.rechnungId },
    wer: u.nutzer,
    wann: u.uhr(),
    befehl: a.befehl,
  } as const;
  const s = await eintragSchreiben(u, e, cs);
  if (!s.ok) return { ok: false, abweisung: { art: 'speicher', fehler: s.fehler } } as const;
  const nachher = rechnungChangeSetAnwenden(zustand, cs);
  const uebrige = rechnungen.filter((x) => x.id !== cs.rechnungId);
  const teil: Teil = { protokollId: e.id, projektId, aggregat: e.aggregat, changeSet: cs };
  return {
    ok: true,
    zustand: nachNummer(nachher === null ? uebrige : [...uebrige, nachher.rechnung]),
    hinweise: [],
    teil,
  } as const;
}

/** Sitzung über den Rechnungen eines Auftrags-LV (Zustand: die Rechnungen nach Nummer). */
export function rechnungenSitzung(
  weg: Befehlsweg,
  projektId: ProjektId,
  rechnungen: readonly Rechnung[],
): RechnungenSitzung {
  return new Sitzung(weg, nachNummer(rechnungen), (z, a) => ausfuehren(weg.umgebung, projektId, z, a));
}

/** Was die Seiten der Rechnungen brauchen: Auftrags-LV, Aufmaßblätter (Köpfe und ganz) und Rechnungen. */
export interface Rechnungsstand {
  readonly auftrag: AuftragsLvZustand;
  /** Köpfe der Blätter nach Nummer (Auswahl im Formular). */
  readonly blaetter: readonly AufmassKopf[];
  /** Die Blätter mit Zeilen (Prüfung). */
  readonly aufmasse: readonly Aufmass[];
  /** Nach Nummer. */
  readonly rechnungen: readonly Rechnung[];
  /**
   * Die Nachträge des Auftrags-LV mit Status und Netto des Nachtragsangebots, nach Nummer. Nur zur Information: Gerechnet
   * wird ein Nachtrag erst, wenn er beauftragt und übernommen ist (D-35).
   */
  readonly nachtraege: readonly Nachtragseintrag[];
}

export async function rechnungsstandLaden(
  speicher: Speicher,
  auftragsLvId: AuftragsLeistungsverzeichnisId,
): Promise<Ergebnis<Rechnungsstand, Speicherfehler>> {
  const [auftrag, blaetter, rechnungen] = await Promise.all([
    speicher.auftragsLeistungsverzeichnisse.laden(auftragsLvId),
    speicher.aufmasse.auflisten(auftragsLvId),
    speicher.rechnungen.auflisten(auftragsLvId),
  ]);
  if (!auftrag.ok) return auftrag;
  if (!blaetter.ok) return blaetter;
  if (!rechnungen.ok) return rechnungen;
  const nachtraege = await nachtraegeLaden(speicher, auftrag.wert);
  if (!nachtraege.ok) return nachtraege;
  const aufmasse: Aufmass[] = [];
  for (const b of blaetter.wert) {
    const a = await speicher.aufmasse.laden(b.id);
    if (!a.ok) return a;
    aufmasse.push(a.wert.aufmass);
  }
  return {
    ok: true,
    wert: {
      auftrag: auftrag.wert,
      blaetter: blaetter.wert,
      aufmasse,
      rechnungen: nachNummer(rechnungen.wert),
      nachtraege: nachtraege.wert.nachtraege,
    },
  };
}
