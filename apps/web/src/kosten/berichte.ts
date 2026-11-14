// SPDX-License-Identifier: AGPL-3.0-or-later
// Ausgaben der Kosten (Ticket 154, E12): Kostenermittlung und Kostenkontrolle als PDF und Excel. Hier entstehen nur die
// Eingaben für `ausgabe` (D-153.1: die Ergebnisse von `kosten` gehen unverändert durch); gerechnet wird in `kosten`, gesetzt
// in `ausgabe`. Die Bezeichnungen der Kostengruppen sind dieselben wie am Bildschirm, die Hinweise tragen die Sätze der
// Seite. Ohne Abhängigkeit auf den Laufzeitteil von `ausgabe` (nur Typen), damit pdfmake nicht ins Hauptbündel kommt.

import type { KostenermittlungEingabe, KostenkontrolleEingabe } from '@tethys/ausgabe';
import { kostenermittlungBerechnen } from '@tethys/kosten';
import type { Kostenkontrolle } from '@tethys/kosten';
import type {
  AuftragsLvZustand,
  Buero,
  Kostenermittlung,
  Kostengruppenbezeichnung,
  Kostengruppennummer,
  Projekt,
} from '@tethys/vertrag';
import { dateinameSauber } from '../dateiname';
import { kontrollbefundText } from './kontrolle';

/** Was beide Berichte im Kopf tragen. */
export interface Berichtskopf {
  readonly projekt: Projekt | null;
  /** Das Büro als Absender aus den Einstellungen; `null`: keins. */
  readonly buero: Buero | null;
  /** Druckdatum `JJJJ-MM-TT` aus der Uhr der App (A2). */
  readonly datum: string;
  /** Nummer → Bezeichnung, wie am Bildschirm (G-16). */
  readonly bezeichnungen: ReadonlyMap<string, string>;
}

const kopfEingabe = (k: Berichtskopf) => ({
  bezeichnungen: [...k.bezeichnungen].map(([nummer, bezeichnung]): Kostengruppenbezeichnung => ({
    nummer: nummer as Kostengruppennummer,
    bezeichnung,
  })),
  buero: k.buero,
  datum: k.datum,
  ...(k.projekt === null ? {} : { projekt: k.projekt }),
});

export function kostenermittlungEingabe(k: Kostenermittlung, kopf: Berichtskopf): KostenermittlungEingabe {
  return { ...kopfEingabe(kopf), kostenermittlung: k, ergebnis: kostenermittlungBerechnen(k.eintraege) };
}

export interface KontrollStand {
  readonly kontrolle: Kostenkontrolle;
  /** Die gewählte Kostenermittlung als Budget; `null`: keins. */
  readonly budget: Kostenermittlung | null;
  readonly auftraege: readonly AuftragsLvZustand[];
  /** `false`: noch keine Rechnung, die Spalte Abrechnung bleibt leer (wie am Bildschirm). */
  readonly mitAbrechnung: boolean;
}

export function kostenkontrolleEingabe(s: KontrollStand, kopf: Berichtskopf): KostenkontrolleEingabe {
  return {
    ...kopfEingabe(kopf),
    kontrolle: s.kontrolle,
    budget: s.budget === null ? null : { name: s.budget.name, stufe: s.budget.stufe },
    mitAbrechnung: s.mitAbrechnung,
    auftragsLvs: s.auftraege.map((a) => a.auftragsLeistungsverzeichnis.name),
    hinweise: s.kontrolle.befunde.map(kontrollbefundText),
  };
}

export type Endung = 'pdf' | 'xlsx';

/** `Kostenermittlung <Name>.pdf`, bereinigt wie jeder Dateiname der App. */
export const dateinameKostenermittlung = (name: string, endung: Endung): string =>
  `${dateinameSauber(`Kostenermittlung ${name}`, 'Kostenermittlung')}.${endung}`;

/** `Kostenkontrolle <Projekt>.xlsx`, bereinigt wie jeder Dateiname der App. */
export const dateinameKostenkontrolle = (projekt: string, endung: Endung): string =>
  `${dateinameSauber(`Kostenkontrolle ${projekt}`, 'Kostenkontrolle')}.${endung}`;
