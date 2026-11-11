// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle an der Kostenermittlung (Ticket 82, `vertrag` v1.4 Punkt 9): Ausführen, Anwenden, Umkehren. Das ChangeSet trägt
// die ganze Kostenermittlung vorher und nachher (D-36 (8)). Der Ausführer sieht nur sein Aggregat und prüft die Form
// (D-70.3): Nummer nach der Regel von `kgLesen` (D-24), Betrag kanonisch mit 2 Stellen (N3), jede Nummer höchstens
// einmal; die Einträge stehen nach Nummer geordnet, `bemerkung: ''` fällt weg. Negative Beträge und eigene Beträge neben
// Beträgen der Kinder sind Befunde der Rechnung (`kostenermittlungBerechnen`), keine Sperre (U5). Rein (A2).

import { alsBetrag } from '@tethys/dezimal';
import type {
  Befehlsfehler,
  Befehlsfehlercode,
  Ergebnis,
  Kostenermittlung,
  KostenermittlungBefehlAusfuehren,
  KostenermittlungChangeSet,
  Kostenermittlungseintrag,
  Kostenermittlungsstufe,
} from '@tethys/vertrag';
import { kgLesen, kgVergleichen } from './kostengruppe';

type Antwort = Ergebnis<KostenermittlungChangeSet, Befehlsfehler>;

const STUFEN: ReadonlySet<Kostenermittlungsstufe> = new Set<Kostenermittlungsstufe>([
  'kostenrahmen',
  'kostenschaetzung',
  'kostenberechnung',
  'kostenanschlag',
  'kostenfeststellung',
]);

function nein(code: Befehlsfehlercode, meldung: string, feld?: string): Antwort {
  return { ok: false, fehler: feld === undefined ? { code, meldung } : { code, meldung, feld } };
}

/** Formfehler eines Eintrags oder `null`. Gespeichert wird nur die genaue Form (kein Leerraum, den `kgLesen` duldet). */
function eintragFehler(e: Kostenermittlungseintrag): Antwort | null {
  const n = kgLesen(e.nummer);
  if (!n.ok || n.wert !== e.nummer)
    return nein('ungueltige-eingabe', `Keine Kostengruppennummer: ${JSON.stringify(e.nummer)}`, 'nummer');
  const betrag = alsBetrag(e.betrag);
  if (!betrag.ok)
    return nein('ungueltige-eingabe', `Betrag zu ${e.nummer}: ${betrag.fehler.meldung}`, 'betrag');
  if (e.bemerkung !== undefined && typeof e.bemerkung !== 'string')
    return nein('ungueltige-eingabe', `Bemerkung zu ${e.nummer} ist kein Text`, 'bemerkung');
  return null;
}

/** Ein Eintrag in Speicherform: ohne leere Bemerkung. */
function normal(e: Kostenermittlungseintrag): Kostenermittlungseintrag {
  return e.bemerkung === '' ? { nummer: e.nummer, betrag: e.betrag } : e;
}

/** Prüft alle Einträge und gibt sie geordnet in Speicherform zurück. */
function eintraegeLesen(
  eintraege: readonly Kostenermittlungseintrag[],
): Antwort | Kostenermittlungseintrag[] {
  const gesehen = new Set<string>();
  for (const e of eintraege) {
    const f = eintragFehler(e);
    if (f) return f;
    if (gesehen.has(e.nummer))
      return nein('ungueltige-eingabe', `Nummer ${e.nummer} kommt mehrfach vor`, 'nummer');
    gesehen.add(e.nummer);
  }
  return eintraege.map(normal).sort((a, b) => kgVergleichen(a.nummer, b.nummer));
}

function kopfFehler(k: Pick<Kostenermittlung, 'name' | 'stufe'>): Antwort | null {
  if (!STUFEN.has(k.stufe))
    return nein('ungueltige-eingabe', `Unbekannte Stufe: ${JSON.stringify(k.stufe)}`, 'stufe');
  if (typeof k.name !== 'string') return nein('ungueltige-eingabe', 'Der Name ist kein Text', 'name');
  return null;
}

function changeSet(vorher: Kostenermittlung | null, nachher: Kostenermittlung): Antwort {
  return {
    ok: true,
    wert: { art: 'kostenermittlung', kostenermittlungId: nachher.id, kostenermittlung: { vorher, nachher } },
  };
}

export const kostenermittlungBefehlAusfuehren: KostenermittlungBefehlAusfuehren = (zustand, befehl) => {
  if (befehl.art === 'KostenermittlungAnlegen') {
    if (zustand !== null)
      return nein('befehl-nicht-zustaendig', `${befehl.art}: die Kostenermittlung existiert schon.`);
    const k = befehl.kostenermittlung;
    const f = kopfFehler(k);
    if (f) return f;
    const eintraege = eintraegeLesen(k.eintraege);
    if (!Array.isArray(eintraege)) return eintraege;
    return changeSet(null, { ...k, eintraege });
  }
  throw new Error(`noch nicht umgesetzt: ${befehl.art}`);
};
