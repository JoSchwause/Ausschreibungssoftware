// SPDX-License-Identifier: AGPL-3.0-or-later
// Kostenkontrolle (Ticket 82, C3, D-37): Budget, Vergabe, Abrechnung und Abweichung je Kostengruppe, dazu die Zeilen
// „ohne Kostengruppe“, „Nachlass“ und Gesamt, durchgehend netto. Die Positionssummen stehen im Zustand des Auftrags-LV
// (`summen.positionen`, gerechnet vom Kern); `kosten` importiert `kern` nicht (A3). Rein (A2), nur Dezimalarithmetik
// (N1); Auffälligkeiten sind Befunde, nie Sperre (U5).

import { NULL_BETRAG, addiere, subtrahiere, vergleiche } from '@tethys/dezimal';
import type {
  AuftragsLeistungsverzeichnisId,
  AuftragsLvZustand,
  Betrag,
  Kostenermittlung,
  Kostengruppennummer,
  Leistungsstand,
  PositionId,
} from '@tethys/vertrag';
import { kostenermittlungBerechnen } from './kostenermittlung';
import type { Kostengruppenebene } from './kostengruppe';
import { kgEbene, kgSortieren, kgVorfahren } from './kostengruppe';

// --- Schnittstelle ---------------------------------------------------------------------------------------------

export interface Kostenkontrolleingabe {
  /** Die Kostenermittlung, die der Nutzer als Budget wählt; `null`: keine (Spalten Budget und Abweichung leer). */
  readonly budget: Kostenermittlung | null;
  /** Alle Auftrags-LVs des Projekts samt Summenstand des Kerns; sie werden addiert. */
  readonly auftraege: readonly AuftragsLvZustand[];
  /** Je Auftrags-LV der Leistungsstand der Rechnung mit der höchsten Nummer (wählt die App, D-37). */
  readonly leistungsstaende: readonly {
    readonly auftragsLvId: AuftragsLeistungsverzeichnisId;
    readonly leistungsstand: Leistungsstand;
  }[];
}

/** Die vier Spalten einer Zeile. */
export interface Kostenkontrollwerte {
  /** Baumsumme des Budgets; `null`: kein Budget gewählt oder die Zeile liegt nicht in seiner Gliederung (D-82.5). */
  readonly budget: Betrag | null;
  readonly vergabe: Betrag;
  readonly abrechnung: Betrag;
  /**
   * Vergabe − Budget; eine Zeile ohne Budget zählt mit Budget 0, außer sie liegt unter einer Kostengruppe der
   * Budget-Gliederung (dort steht die Abweichung, D-82.5). `null`: kein Budget gewählt oder Zeile unter einer solchen Gruppe.
   */
  readonly abweichung: Betrag | null;
}

export interface Kostenkontrollzeile extends Kostenkontrollwerte {
  readonly nummer: Kostengruppennummer;
  readonly ebene: Kostengruppenebene;
}

export type Kostenkontrollbefundcode =
  | 'kostengruppe-ohne-budget' // KG der Position liegt nicht in der Budget-Gliederung und unter keinem Budget-Eintrag
  | 'kostengruppe-groeber-als-budget' // KG der Position hat kein eigenes Budget, nur Kostengruppen darunter (Hinweis)
  | 'leistungsstand-unbekannt' // Leistungsstand zu einem Auftrags-LV, das nicht übergeben ist; zählt nicht
  | 'leistungsstand-doppelt' // zweiter Leistungsstand zu einem Auftrags-LV; zählt nicht
  | 'summe-abweichend'; // Ebene 1 + ohne KG + Nachlass ≠ Gesamt (Summenstand passt nicht zu den Positionen)

export interface Kostenkontrollbefund {
  readonly code: Kostenkontrollbefundcode;
  readonly schwere: 'warnung' | 'hinweis';
  readonly auftragsLvId: AuftragsLeistungsverzeichnisId | null;
  readonly positionId: PositionId | null;
  readonly nummer: Kostengruppennummer | null;
  /** Bei `summe-abweichend` die Spalte; sonst `null`. */
  readonly spalte: 'vergabe' | 'abrechnung' | null;
  /** Meldung für Entwickler und Protokoll; die deutsche Anzeige entsteht in der Oberfläche. */
  readonly meldung: string;
}

export interface Kostenkontrolle {
  /** Jede Kostengruppe des Budgets und jeder Position samt Vorfahren, nach Nummer (Elternteil vor Kindern). */
  readonly kostengruppen: readonly Kostenkontrollzeile[];
  readonly ohneKostengruppe: Kostenkontrollwerte;
  /** Negativ; ohne Budget. */
  readonly nachlass: Kostenkontrollwerte;
  /** Budget: Gesamtsumme der Kostenermittlung; Vergabe und Abrechnung: Σ Netto nach Nachlass. */
  readonly gesamt: Kostenkontrollwerte;
  /** Erst je Auftrags-LV die Positionen in Knotenreihenfolge, dann die Leistungsstände, dann die Summenprüfung. */
  readonly befunde: readonly Kostenkontrollbefund[];
}

// --- Rechnen ---------------------------------------------------------------------------------------------------

/** Eine Spalte: Baumsummen je Kostengruppe, „ohne Kostengruppe“, Nachlass und Gesamt. */
class Spalte {
  readonly kg = new Map<Kostengruppennummer, Betrag>();
  ohne = NULL_BETRAG;
  nachlass = NULL_BETRAG;
  gesamt = NULL_BETRAG;

  buchen(nummer: Kostengruppennummer | null, betrag: Betrag): void {
    if (nummer === null) {
      this.ohne = addiere(this.ohne, betrag);
      return;
    }
    for (const n of [nummer, ...kgVorfahren(nummer)])
      this.kg.set(n, addiere(this.kg.get(n) ?? NULL_BETRAG, betrag));
  }

  /** Ebene 1 + ohne Kostengruppe + Nachlass. */
  zeilensumme(): Betrag {
    let s = addiere(this.ohne, this.nachlass);
    for (const [n, b] of this.kg) if (kgEbene(n) === 1) s = addiere(s, b);
    return s;
  }
}

export function kostenkontrolleBerechnen(eingabe: Kostenkontrolleingabe): Kostenkontrolle {
  const befunde: Kostenkontrollbefund[] = [];
  const befund = (
    code: Kostenkontrollbefundcode,
    auftragsLvId: AuftragsLeistungsverzeichnisId | null,
    positionId: PositionId | null,
    nummer: Kostengruppennummer | null,
    meldung: string,
    spalte: 'vergabe' | 'abrechnung' | null = null,
  ): void => {
    const schwere = code === 'kostengruppe-groeber-als-budget' ? 'hinweis' : 'warnung';
    befunde.push({ code, schwere, auftragsLvId, positionId, nummer, spalte, meldung });
  };

  // Budget: Baumsummen nach D-24; Gruppen mit eigenem Eintrag decken ihren Teilbaum.
  const budget = eingabe.budget === null ? null : kostenermittlungBerechnen(eingabe.budget.eintraege);
  const budgetSumme = new Map<Kostengruppennummer, Betrag>(
    budget?.gruppen.map((g) => [g.nummer, g.summe]) ?? [],
  );
  const mitEintrag = new Set(
    budget?.gruppen.filter((g) => g.eigenerBetrag !== null).map((g) => g.nummer) ?? [],
  );

  const zeilen = new Set<Kostengruppennummer>(budgetSumme.keys());
  const vergabe = new Spalte();
  const abrechnung = new Spalte();
  const kgJeAuftrag = new Map<AuftragsLeistungsverzeichnisId, Map<PositionId, Kostengruppennummer | null>>();

  for (const { auftragsLeistungsverzeichnis: lv, summen } of eingabe.auftraege) {
    const kgVon = new Map<PositionId, Kostengruppennummer | null>();
    for (const k of lv.knoten) {
      if (k.art !== 'position') continue;
      const n = k.kostengruppe ?? null;
      kgVon.set(k.id, n);
      if (n === null) continue;
      zeilen.add(n);
      for (const v of kgVorfahren(n)) zeilen.add(v);
      if (budget === null || [n, ...kgVorfahren(n)].some((x) => mitEintrag.has(x))) continue;
      if (budgetSumme.has(n))
        befund(
          'kostengruppe-groeber-als-budget',
          lv.id,
          k.id,
          n,
          `Kostengruppe ${n} hat kein eigenes Budget, nur Kostengruppen darunter`,
        );
      else befund('kostengruppe-ohne-budget', lv.id, k.id, n, `Kostengruppe ${n} liegt nicht im Budget`);
    }
    kgJeAuftrag.set(lv.id, kgVon);
    for (const p of summen.positionen)
      if (p.gehtInSummeEin && p.gesamtpreis !== null)
        vergabe.buchen(kgVon.get(p.positionId) ?? null, p.gesamtpreis);
    vergabe.nachlass = subtrahiere(vergabe.nachlass, summen.gesamt.nachlass);
    vergabe.gesamt = addiere(vergabe.gesamt, summen.gesamt.nettoNachNachlass);
  }

  const gelesen = new Set<AuftragsLeistungsverzeichnisId>();
  for (const { auftragsLvId, leistungsstand } of eingabe.leistungsstaende) {
    const kgVon = kgJeAuftrag.get(auftragsLvId);
    if (kgVon === undefined) {
      befund(
        'leistungsstand-unbekannt',
        auftragsLvId,
        null,
        null,
        `Kein Auftrags-LV ${auftragsLvId}; zählt nicht`,
      );
      continue;
    }
    if (gelesen.has(auftragsLvId)) {
      befund(
        'leistungsstand-doppelt',
        auftragsLvId,
        null,
        null,
        `Zweiter Leistungsstand zu ${auftragsLvId}; zählt nicht`,
      );
      continue;
    }
    gelesen.add(auftragsLvId);
    for (const p of leistungsstand.positionen) abrechnung.buchen(kgVon.get(p.positionId) ?? null, p.gp);
    abrechnung.nachlass = subtrahiere(abrechnung.nachlass, leistungsstand.nachlass);
    abrechnung.gesamt = addiere(abrechnung.gesamt, leistungsstand.nettoNachNachlass);
  }

  for (const [name, s] of [
    ['vergabe', vergabe],
    ['abrechnung', abrechnung],
  ] as const) {
    const summe = s.zeilensumme();
    if (vergleiche(summe, s.gesamt) !== 0)
      befund('summe-abweichend', null, null, null, `Zeilen ergeben ${summe}, Gesamt ist ${s.gesamt}`, name);
  }

  const abweichung = (v: Betrag, b: Betrag | null): Betrag | null =>
    budget === null ? null : subtrahiere(v, b ?? NULL_BETRAG);

  const kostengruppen = kgSortieren([...zeilen]).map((nummer): Kostenkontrollzeile => {
    const b = budgetSumme.get(nummer) ?? null;
    const v = vergabe.kg.get(nummer) ?? NULL_BETRAG;
    const unterBudget = b === null && kgVorfahren(nummer).some((x) => budgetSumme.has(x));
    return {
      nummer,
      ebene: kgEbene(nummer),
      budget: b,
      vergabe: v,
      abrechnung: abrechnung.kg.get(nummer) ?? NULL_BETRAG,
      abweichung: unterBudget ? null : abweichung(v, b),
    };
  });

  return {
    kostengruppen,
    ohneKostengruppe: {
      budget: null,
      vergabe: vergabe.ohne,
      abrechnung: abrechnung.ohne,
      abweichung: abweichung(vergabe.ohne, null),
    },
    nachlass: {
      budget: null,
      vergabe: vergabe.nachlass,
      abrechnung: abrechnung.nachlass,
      abweichung: abweichung(vergabe.nachlass, null),
    },
    gesamt: {
      budget: budget?.gesamtsumme ?? null,
      vergabe: vergabe.gesamt,
      abrechnung: abrechnung.gesamt,
      abweichung: abweichung(vergabe.gesamt, budget?.gesamtsumme ?? null),
    },
    befunde,
  };
}
