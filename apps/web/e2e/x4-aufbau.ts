// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 120 (Tor X4): Aufbau für E2E und Kettentest. Die Fixture `bauleitung.json` kennt zwei Auftrags-LVs mit zwei
// Auftragnehmern (Rohbau und Tiefbau). Zu einem LV gibt es höchstens ein Auftrags-LV (D-21), also braucht es zwei LVs: das
// LV `typisch` (Bieter A, Rohbau) und eine Kopie mit neuen Kennungen (Bieter B, Tiefbau). Der Zuschlag macht den Bieter zum
// Auftragnehmer des Auftrags-LV (`auftragnehmer.name`).

import { readFileSync } from 'node:fs';
import type { LvInhalt } from '@tethys/vertrag';
import { fixtureInhalt } from './fixture-inhalt';

/** Eine Kopie des LV mit anderen Kennungen (alle Kennungen der Fixture beginnen mit `019b76e9-`) und eigenem Namen. */
export function lvKopie(name: string): LvInhalt {
  const roh = JSON.stringify(fixtureInhalt('typisch')).replaceAll('019b76e9-', '019b76ea-');
  return { ...(JSON.parse(roh) as LvInhalt), name };
}

export interface X4Auftrag {
  /** Auftragnehmer in der Fixture `bauleitung.json` (`auftraege[].auftragnehmer`). */
  readonly fixtureAuftragnehmer: string;
  /** Name des Bieters, der den Zuschlag bekommt; er wird der Auftragnehmer des Auftrags-LV. */
  readonly bieter: string;
  readonly lvName: string;
  /** X84-Datei des Bieters (Ticket 69), relativ zum Repository. */
  readonly datei: string;
  readonly inhalt: () => LvInhalt;
}

export const X4_AUFTRAEGE: readonly X4Auftrag[] = [
  {
    fixtureAuftragnehmer: 'Rohbau Muster GmbH (erfunden)',
    bieter: 'Bieter A',
    lvName: 'Rohbau Haus',
    datei: 'fixtures/angebote/typisch-bieter-a.x84',
    inhalt: () => ({ ...fixtureInhalt('typisch'), name: 'Rohbau Haus' }),
  },
  {
    fixtureAuftragnehmer: 'Tiefbau Beispiel KG (erfunden)',
    bieter: 'Bieter B',
    lvName: 'Tiefbau Haus',
    datei: 'fixtures/angebote/typisch-bieter-b.x84',
    inhalt: () => lvKopie('Tiefbau Haus'),
  },
];

/** Die Fixture der Bauleitung (Ticket 112) in der Form, die E2E und Kettentest lesen. */
export interface X4Fixture {
  readonly auftraege: readonly { readonly auftragsLvId: string; readonly auftragnehmer: string }[];
  readonly maengel: readonly {
    readonly id: string;
    readonly nummer: number;
    readonly titel: string;
    readonly beschreibung: string | null;
    readonly ort: string | null;
    readonly auftragsLvId: string | null;
    readonly festgestellt: string;
    readonly frist: string | null;
    readonly verlauf: readonly {
      readonly status: 'offen' | 'angezeigt' | 'beseitigt' | 'abgenommen';
      readonly datum: string;
      readonly bemerkung: string | null;
    }[];
  }[];
  readonly bautagebuch: readonly {
    readonly datum: string;
    readonly wetter: {
      readonly beschreibung: string | null;
      readonly temperaturMin: number | null;
      readonly temperaturMax: number | null;
    };
    readonly arbeitskraefte: readonly { readonly firma: string; readonly anzahl: number }[];
    readonly geraete: string | null;
    readonly leistungen: string | null;
    readonly behinderungen: string | null;
    readonly vorkommnisse: string | null;
  }[];
  readonly stichtag: string;
  readonly sollwerte: {
    readonly naechsteMangelnummer: number;
    readonly status: readonly { readonly nummer: number; readonly status: string }[];
    readonly fristpruefung: {
      readonly stichtag: string;
      readonly ueberfaellig: readonly {
        readonly nummer: number;
        readonly frist: string;
        readonly status: string;
      }[];
      readonly fristAmStichtag: readonly { readonly nummer: number }[];
    };
    readonly auswertungMaengel: {
      readonly jeAuftragnehmer: readonly {
        readonly auftragsLvId: string;
        readonly auftragnehmer: string;
        readonly anzahl: number;
        readonly jeStatus: Readonly<Record<string, number>>;
        readonly offen: number;
        readonly ueberfaellig: number;
      }[];
      readonly gesamt: {
        readonly anzahl: number;
        readonly jeStatus: Readonly<Record<string, number>>;
        readonly offen: number;
        readonly ueberfaellig: number;
      };
    };
    readonly auswertungBautagebuch: {
      readonly von: string;
      readonly bis: string;
      readonly jeTag: readonly { readonly datum: string; readonly arbeitskraefte: number }[];
      readonly jeFirma: readonly { readonly firma: string; readonly arbeitskraefte: number }[];
      readonly summe: number;
    };
  };
  readonly gegenproben: {
    readonly stichtag20261127: { readonly stichtag: string; readonly ueberfaellig: readonly number[] };
    readonly bautagebuch17bis19: {
      readonly von: string;
      readonly bis: string;
      readonly jeFirma: readonly { readonly firma: string; readonly arbeitskraefte: number }[];
      readonly summe: number;
    };
  };
}

export function x4Fixture(): X4Fixture {
  return JSON.parse(
    readFileSync(new URL('../../../fixtures/bauleitung.json', import.meta.url), 'utf8'),
  ) as X4Fixture;
}

/** `JJJJ-MM-TT` als `TT.MM.JJJJ` (so tippt es der Nutzer). */
export const datumDeFx = (iso: string): string => iso.split('-').reverse().join('.');

/**
 * Der Weg eines Mangels zu seinem letzten Status: je Eintrag nach dem ersten die Aktion der Oberfläche. Der erste Eintrag
 * (`offen`) entsteht beim Anlegen. Mangel 2 hat „neue Frist“ erst nach dem Wiederöffnen (Bemerkung der Fixture): Dort
 * wird die Frist der ersten Anzeige gesetzt und später über „Bearbeiten“ auf die der Fixture geändert (siehe Spec).
 */
export const AKTION_ZU_STATUS = {
  angezeigt: 'Mangel anzeigen (Frist)',
  beseitigt: 'Beseitigung gemeldet',
  abgenommen: 'Abnehmen',
  offen: 'Wieder öffnen',
} as const;

/** Frist der ersten Anzeige von Mangel 2: „Frist zuerst 19.11.2026“ (Bemerkung in der Fixture). */
export const ERSTE_FRIST_MANGEL_2 = '2026-11-19';
