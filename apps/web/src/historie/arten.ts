// SPDX-License-Identifier: AGPL-3.0-or-later
// Je Aggregatart eines ChangeSets an einer Stelle (Review Welle 5, S7): wie Undo es umkehrt und wohin die App nach einem
// Undo/Redo-Teil wechselt, damit die Änderung sichtbar ist. Eine neue Aggregatart im Vertrag (`ChangeSet['art']`) ist hier
// eine Zeile; der Typ der Tabelle erzwingt sie. Befehlsweg (Umkehren), Historie (`Teil`) und Bedienung (Ziel) lesen nur hier.

import { aufmassChangeSetUmkehren, rechnungChangeSetUmkehren } from '@tethys/abrechnung';
import { bautagebucheintragChangeSetUmkehren, mangelChangeSetUmkehren } from '@tethys/bauleitung'; // Ticket 120
import { bauzeitenplanChangeSetUmkehren } from '@tethys/bauzeit'; // Ticket 118
import { bauwerksmodellChangeSetUmkehren } from '@tethys/bim'; // Ticket 114
import { auftragsLvChangeSetUmkehren, changeSetUmkehren, projektChangeSetUmkehren } from '@tethys/kern';
import { honorarberechnungChangeSetUmkehren } from '@tethys/honorar'; // Ticket 119
import { kostenermittlungChangeSetUmkehren } from '@tethys/kosten';
import { angebotChangeSetUmkehren } from '@tethys/vergabe';
import type { AngebotChangeSet, ChangeSet, LvChangeSet, ProjektChangeSet, ProjektId } from '@tethys/vertrag';
import { aufmassZiel } from '../abrechnung/pfad'; // Ticket 87
import { auftragPfad, auftragZiel } from '../auftrag/ziel'; // Ticket 64, 86
import { honorarZiel } from '../honorar/pfad'; // Ticket 119
import { bautagebuchZiel, mangelZiel } from '../bauleitung/pfad'; // Ticket 120
import { bauzeitZiel } from '../bauzeit/pfad'; // Ticket 118
import { bimZiel } from '../bim/pfad'; // Ticket 114
import { kostenZiel } from '../kosten/pfad'; // Ticket 89
import { rechnungZiel } from '../rechnung/pfad'; // Ticket 88
import type { Teil } from './historie';

type Art = ChangeSet['art'];
type Von<A extends Art> = Extract<ChangeSet, { readonly art: A }>;

/** Was die App je Aggregatart für Undo/Redo braucht. */
interface Aggregatart<A extends Art> {
  readonly umkehren: (cs: Von<A>) => Von<A>;
  /** Wohin nach einem Teil dieser Art (`rueckwaerts`: Undo); `null`: bleiben. */
  readonly ziel: (projektId: ProjektId, cs: Von<A>, rueckwaerts: boolean, pfad: string) => string | null;
}

function projektZiel(
  projektId: ProjektId,
  cs: ProjektChangeSet,
  rueckwaerts: boolean,
  pfad: string,
): string | null {
  const projektPfad = `/projekt/${projektId}`;
  const geschrieben = rueckwaerts ? projektChangeSetUmkehren(cs) : cs;
  const { vorher, nachher } = geschrieben.projekt;
  // Nur die Bieter haben sich geändert (X84-Import): Weder Liste noch Projektseite zeigen sie, also bleiben.
  if (
    vorher !== null &&
    nachher !== null &&
    vorher.name === nachher.name &&
    JSON.stringify(vorher.bauherr) === JSON.stringify(nachher.bauherr)
  )
    return null;
  if (nachher === null) return pfad === '/' ? null : '/';
  if (vorher === null && pfad === '/') return null;
  return pfad === projektPfad ? null : projektPfad;
}

/** Angebot angelegt oder zurückgenommen: sichtbar in der Angebotsliste des LV. */
function angebotZiel(
  _projektId: ProjektId,
  cs: AngebotChangeSet,
  _rueckwaerts: boolean,
  pfad: string,
): string | null {
  const lvId = (cs.kopf?.nachher ?? cs.kopf?.vorher)?.leistungsverzeichnisId;
  return lvId === undefined || pfad === `/lv/${lvId}` ? null : `/lv/${lvId}`;
}

function lvZiel(projektId: ProjektId, cs: LvChangeSet, rueckwaerts: boolean, pfad: string): string | null {
  const projektPfad = `/projekt/${projektId}`;
  const geschrieben = rueckwaerts ? changeSetUmkehren(cs) : cs;
  const lvPfad = `/lv/${cs.leistungsverzeichnisId}`;
  const kopf = geschrieben.kopf;
  // LV angelegt oder gelöscht: sichtbar in der Liste der Projektseite.
  if (kopf !== null && (kopf.vorher === null || kopf.nachher === null))
    return pfad === projektPfad ? null : projektPfad;
  // Nur Stammdaten des LV (z. B. Name) und die Projektseite ist offen: dort sichtbar.
  const nurKopf =
    kopf !== null &&
    geschrieben.knoten.hinzugefuegt.length +
      geschrieben.knoten.geaendert.length +
      geschrieben.knoten.entfernt.length ===
      0;
  if (nurKopf && pfad === projektPfad) return null;
  // Nur Nachtragsangaben (Status, Nummer): auch in der Nachtragsliste des Auftrags-LV sichtbar; dort bleiben (D-86.7,
  // Review Welle 5: Wiederholen einer Beauftragung bleibt auf dem Auftrags-LV).
  const nachtrag = kopf?.nachher?.nachtrag ?? kopf?.vorher?.nachtrag;
  if (nurKopf && nachtrag !== undefined && pfad === auftragPfad(projektId, nachtrag.auftragsLvId))
    return null;
  return pfad === lvPfad ? null : lvPfad;
}

const ARTEN: { readonly [A in Art]: Aggregatart<A> } = {
  projekt: { umkehren: projektChangeSetUmkehren, ziel: projektZiel },
  leistungsverzeichnis: { umkehren: changeSetUmkehren, ziel: lvZiel },
  angebot: { umkehren: angebotChangeSetUmkehren, ziel: angebotZiel },
  'auftrags-leistungsverzeichnis': { umkehren: auftragsLvChangeSetUmkehren, ziel: auftragZiel },
  aufmass: { umkehren: aufmassChangeSetUmkehren, ziel: aufmassZiel },
  rechnung: { umkehren: rechnungChangeSetUmkehren, ziel: rechnungZiel },
  kostenermittlung: { umkehren: kostenermittlungChangeSetUmkehren, ziel: kostenZiel },
  bauwerksmodell: { umkehren: bauwerksmodellChangeSetUmkehren, ziel: bimZiel }, // Ticket 114
  bauzeitenplan: { umkehren: bauzeitenplanChangeSetUmkehren, ziel: bauzeitZiel }, // Ticket 118
  honorarberechnung: { umkehren: honorarberechnungChangeSetUmkehren, ziel: honorarZiel }, // Ticket 119
  mangel: { umkehren: mangelChangeSetUmkehren, ziel: mangelZiel }, // Ticket 120
  bautagebucheintrag: { umkehren: bautagebucheintragChangeSetUmkehren, ziel: bautagebuchZiel }, // Ticket 120
};

const art = <A extends Art>(cs: Von<A>): Aggregatart<A> => ARTEN[cs.art];

/** Die Umkehrung eines ChangeSets, je Aggregatart aus Kern oder Fachpaket. */
export const umkehren = <A extends Art>(cs: Von<A>): Von<A> => art(cs).umkehren(cs);

/** Wohin die App nach einem Undo/Redo-Teil wechselt, damit die Änderung sichtbar ist; `null`: bleiben. */
export const zielNach = (teil: Teil, rueckwaerts: boolean, pfad: string): string | null =>
  art(teil.changeSet).ziel(teil.projektId, teil.changeSet, rueckwaerts, pfad);
