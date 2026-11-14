// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 152 (E11, D-95): die Eingaben der Ausgaben Aufmaßblatt (mit Mengenansätzen), Soll/Ist und Rechnungsprüfung mit
// Zahlungsfreigabe. Die App rechnet nichts (A2): Zeilenergebnisse kommen aus `mengen`, Soll/Ist und Prüfung aus
// `abrechnung`, unverändert durchgereicht (D-141.1); Büro (Einstellungen) und Projekt mit Projektangaben stehen in jedem
// Kopf (D-141.6, D-95), das Druckdatum kommt von der Uhr der App. Befunde gehen mit den Texten der Seite in den Druck.

import type {
  AufmassblattEingabe,
  Befundtext,
  RechnungspruefungEingabe,
  SollIstEingabe,
} from '@tethys/ausgabe';
import type { Rechnungspruefung } from '@tethys/abrechnung';
import { mengenansatzBerechnen } from '@tethys/mengen';
import type { Aufmass, AuftragsLvZustand, Buero, Projekt, Rechnung } from '@tethys/vertrag';
import { dateinameSauber } from '../dateiname';
import type { Rechnungsstand } from '../rechnung/rechnungen';
import type { SollIstStand } from './sollist';

/** Was jeder Kopf trägt: Projekt (mit Projektangaben), Büro als Absender, Druckdatum `JJJJ-MM-TT`. */
export interface Druckkopf {
  readonly projekt: Projekt | null;
  readonly buero: Buero | null;
  readonly datum: string;
}

export type Endung = 'pdf' | 'xlsx';

const kopf = (k: Druckkopf): { projekt?: Projekt; buero: Buero | null; datum: string } => ({
  ...(k.projekt === null ? {} : { projekt: k.projekt }),
  buero: k.buero,
  datum: k.datum,
});

/** Befunde mit den Texten der Seite; alle sind Hinweise ohne Sperre (U5). */
export const alsBefundtexte = (texte: readonly string[]): Befundtext[] =>
  texte.map((text) => ({ schwere: 'warnung', ort: null, text }));

/** Aufmaßblatt mit Mengenansätzen: je Position mit Ansatz die Zeilenergebnisse, wie `mengen` sie rechnet. */
export function aufmassblattEingabe(
  auftragsLv: AuftragsLvZustand,
  aufmass: Aufmass,
  k: Druckkopf,
  befunde: readonly string[] = [],
): AufmassblattEingabe {
  return {
    aufmass,
    auftragsLv,
    ergebnisse: aufmass.positionen.flatMap((p) =>
      p.mengenansatz === null
        ? []
        : [
            {
              positionId: p.positionId,
              zeilen: mengenansatzBerechnen(p.mengenansatz).zeilen.map((z) => ({
                zeile: z.zeile,
                menge: z.menge,
              })),
            },
          ],
    ),
    befundtexte: alsBefundtexte(befunde),
    ...kopf(k),
  };
}

/** Soll/Ist mit den Schwellen der Seite; ohne Schlussrechnung gelten Befunde nur über der oberen Schwelle. */
export function sollIstEingabe(
  auftragsLv: AuftragsLvZustand,
  sollIst: SollIstStand,
  abgeschlossen: boolean,
  k: Druckkopf,
): SollIstEingabe {
  return {
    auftragsLv,
    sollIst,
    optionen: { abgeschlossen, oberSchwelle: sollIst.oberSchwelle, unterSchwelle: sollIst.unterSchwelle },
    ...kopf(k),
  };
}

/** Rechnungsprüfung mit Kette, Befunden (Texte der Seite) und Zahlungsfreigabe (`pruefung.zahlungsstand`, A5). */
export function rechnungspruefungEingabe(
  rechnung: Rechnung,
  stand: Pick<Rechnungsstand, 'auftrag' | 'blaetter'>,
  pruefung: Rechnungspruefung,
  befunde: readonly string[],
  k: Druckkopf,
): RechnungspruefungEingabe {
  return {
    rechnung,
    auftragsLv: stand.auftrag,
    pruefung,
    aufmasse: stand.blaetter,
    befundtexte: alsBefundtexte(befunde),
    ...kopf(k),
  };
}

const name = (art: string, auftragsLv: AuftragsLvZustand, endung: Endung): string =>
  `${dateinameSauber(`${art} ${auftragsLv.auftragsLeistungsverzeichnis.name}`, art)}.${endung}`;

export const dateinameAufmassblatt = (a: AuftragsLvZustand, blatt: Aufmass, endung: Endung): string =>
  name(`Aufmaßblatt ${String(blatt.nummer)}`, a, endung);
export const dateinameSollIst = (a: AuftragsLvZustand, endung: Endung): string => name('Soll-Ist', a, endung);
export const dateinameRechnungspruefung = (a: AuftragsLvZustand, r: Rechnung, endung: Endung): string =>
  name(`Rechnungsprüfung ${String(r.nummer)}`, a, endung);
