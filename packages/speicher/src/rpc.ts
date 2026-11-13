// SPDX-License-Identifier: AGPL-3.0-or-later
// Nachrichtenprotokoll zwischen Hauptthread (`client.ts`) und Worker (`worker-host.ts`). Alle Nutzdaten sind
// strukturell klonbar (reine Daten, siehe `vertrag`).

import type { Ergebnis, Speicherfehler } from '@tethys/vertrag';

/** Methoden des Kerns, die über den Worker erreichbar sind. */
export const RPC_METHODEN = [
  'projekteAuflisten',
  'projektLaden',
  'lvAuflisten',
  'lvLaden',
  'angeboteAuflisten',
  'angebotLaden',
  'lvStaendeAuflisten',
  'lvStandLaden',
  'auftragsLvAuflisten',
  'auftragsLvLaden',
  'aufmasseAuflisten',
  'aufmassLaden',
  'rechnungenAuflisten',
  'rechnungLaden',
  'kostenermittlungenAuflisten',
  'kostenermittlungLaden',
  // v1.6 (Ticket 106)
  'bauwerksmodelleAuflisten',
  'bauwerksmodellLaden',
  'bauzeitenplaeneAuflisten',
  'bauzeitenplanLaden',
  'honorarberechnungenAuflisten',
  'honorarberechnungLaden',
  'maengelAuflisten',
  'mangelLaden',
  'bautagebuchAuflisten',
  'bautagebucheintragLaden',
  'modelldateiAblegen',
  'modelldateiLaden',
  'modelldateiVorhanden',
  'anwenden',
  'protokoll',
  'projektdateiExportieren',
  'projektdateiImportieren',
  'migrationsbefunde',
  // v1.7a (Ticket 139)
  'einstellungenLaden',
  'einstellungenAnwenden',
] as const;

export type RpcMethode = (typeof RPC_METHODEN)[number];

export interface RpcAnfrage {
  readonly id: number;
  readonly methode: RpcMethode | 'oeffnen' | 'schliessen';
  readonly args: readonly unknown[];
}

export interface RpcAntwort {
  readonly id: number;
  readonly ergebnis: Ergebnis<unknown, Speicherfehler>;
}

export interface OeffnenOptionen {
  /** Name der Datenbank im OPFS; trennt Datenbanken im selben Ursprung. */
  readonly datenbank: string;
}

/** Was von einem Worker gebraucht wird (echter `Worker` oder Testattrappe). */
export interface WorkerLike {
  postMessage(nachricht: unknown): void;
  addEventListener(art: 'message', f: (e: { readonly data: unknown }) => void): void;
  addEventListener(art: 'error' | 'messageerror', f: (e: unknown) => void): void;
  terminate(): void;
}
