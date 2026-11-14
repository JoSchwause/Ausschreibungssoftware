// SPDX-License-Identifier: AGPL-3.0-or-later
// Eingaben der Kostenkontrolle aus dem Speicher (Ticket 89, C3, D-37). Das Budget wählt der Nutzer unter den
// Kostenermittlungen des Projekts; Vergabe kommt aus den Summenständen der Auftrags-LVs (Kern); Abrechnung aus dem
// Leistungsstand der Rechnung mit der höchsten Nummer je Auftrags-LV (freigegeben oder nicht). Den Leistungsstand rechnet
// `abrechnung`; die App reicht ihn als Rechner herein (A3: eine Funktion, kein Import hier), ohne Rechner bleibt die Spalte
// Abrechnung leer.

import type { Kostenkontrollbefund, Kostenkontrolleingabe } from '@tethys/kosten';
import type {
  Aufmass,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvZustand,
  Ergebnis,
  KostenermittlungId,
  KostenermittlungZustand,
  Leistungsstand,
  Rechnung,
  Speicher,
  Speicherfehler,
} from '@tethys/vertrag';
import { texte } from './texte';

/** Rechnet den Leistungsstand einer Rechnung aus Auftrags-LV und den Aufmaßblättern der Rechnung (`leistungsstandBerechnen`). */
export type LeistungsstandRechner = (
  auftrag: AuftragsLvZustand,
  rechnung: Rechnung,
  aufmasse: readonly Aufmass[],
) => Leistungsstand;

export type Leistungsstaende = Kostenkontrolleingabe['leistungsstaende'];

/**
 * Je Auftrags-LV der Leistungsstand der Rechnung mit der höchsten Nummer (D-37). Ein Auftrags-LV ohne Rechnung steht
 * nicht in der Liste. Ohne `rechner` gibt es keine Leistungsstände.
 */
export async function leistungsstaendeLaden(
  speicher: Speicher,
  auftraege: readonly AuftragsLvZustand[],
  rechner: LeistungsstandRechner | null,
): Promise<Ergebnis<Leistungsstaende, Speicherfehler>> {
  if (rechner === null) return { ok: true, wert: [] };
  const aus: { auftragsLvId: AuftragsLeistungsverzeichnisId; leistungsstand: Leistungsstand }[] = [];
  for (const auftrag of auftraege) {
    const id = auftrag.auftragsLeistungsverzeichnis.id;
    const liste = await speicher.rechnungen.auflisten(id);
    if (!liste.ok) return liste;
    // Nach Nummer aufsteigend (Vertrag); sicherheitshalber nach Nummer ordnen und die letzte nehmen.
    const letzte = [...liste.wert].sort((a, b) => a.nummer - b.nummer).at(-1);
    if (letzte === undefined) continue;
    const aufmasse: Aufmass[] = [];
    for (const aid of letzte.aufmassIds) {
      const a = await speicher.aufmasse.laden(aid);
      if (!a.ok) return a;
      aufmasse.push(a.wert.aufmass);
    }
    aus.push({ auftragsLvId: id, leistungsstand: rechner(auftrag, letzte, aufmasse) });
  }
  return { ok: true, wert: aus };
}

/** Das gewählte Budget aus den Kostenermittlungen; unbekannte Kennung oder `null` heißt: kein Budget. */
export function budgetWaehlen(
  ermittlungen: readonly KostenermittlungZustand[],
  id: KostenermittlungId | null,
): KostenermittlungZustand['kostenermittlung'] | null {
  if (id === null) return null;
  return ermittlungen.find((z) => z.kostenermittlung.id === id)?.kostenermittlung ?? null;
}

/** Ein Hinweis der Kostenkontrolle als deutscher Satz; derselbe Text auf der Seite und im Druck (Ticket 154). */
export function kontrollbefundText(b: Kostenkontrollbefund): string {
  const k = texte.kontrolle.befund;
  switch (b.code) {
    case 'kostengruppe-ohne-budget':
      return k['kostengruppe-ohne-budget'](b.nummer ?? '');
    case 'kostengruppe-groeber-als-budget':
      return k['kostengruppe-groeber-als-budget'](b.nummer ?? '');
    case 'leistungsstand-unbekannt':
      return k['leistungsstand-unbekannt']();
    case 'leistungsstand-doppelt':
      return k['leistungsstand-doppelt']();
    case 'summe-abweichend':
      return k['summe-abweichend'](
        b.spalte === 'abrechnung' ? texte.kontrolle.spalteAbrechnung : texte.kontrolle.spalteVergabe,
      );
  }
}
