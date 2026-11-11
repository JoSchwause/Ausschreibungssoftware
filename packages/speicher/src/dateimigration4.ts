// SPDX-License-Identifier: AGPL-3.0-or-later
// Dateimigration 4 (Ticket 57, A8): hebt eine Projektdatei der Version 3 auf 4. Das Schema dazu steht in
// `migrationen.ts` (`SCHEMA_V4`). Einmal gemergt, wird hier nichts mehr geändert.
//
// Version 4 bringt nur optionale Felder aus `vertrag` v1.3 dazu (fehlt: keine Angabe): `auftragnehmer` und
// `epaBezeichnungen` am Kopf von LV und Auftrags-LV, `mengenansatz` an der Position. Eine Datei der Version 3 hat sie
// nicht; ihr Inhalt bleibt deshalb, wie er ist. Trägt eine Datei, die sich als Version 3 ausgibt, schon eines der neuen
// Felder (im LV, im Auftrags-LV, im Papierkorb oder in einem LV-Stand), ist sie ungültig (in Version 3 waren sie
// unbekannt), nicht still übernommen (Q5).

import { abbruch } from './ergebnis';

type Roh = Record<string, unknown>;

const istObjekt = (x: unknown): x is Roh => typeof x === 'object' && x !== null && !Array.isArray(x);
const alsListe = (x: unknown): unknown[] => (Array.isArray(x) ? (x as unknown[]) : []);

function ohneFeld(o: unknown, feld: string, pfad: string): void {
  if (istObjekt(o) && Object.hasOwn(o, feld))
    abbruch('datei-ungueltig', `${pfad}: unbekanntes Feld „${feld}“`);
}

function knotenOhneAnsatz(knoten: unknown, pfad: string): void {
  alsListe(knoten).forEach((k, i) => {
    ohneFeld(k, 'mengenansatz', `${pfad}[${String(i)}]`);
  });
}

/** Kopf und Knoten eines LV oder Auftrags-LV (in der Datei ein Objekt mit `knoten`). */
function aggregatOhneNeues(lv: unknown, pfad: string): void {
  ohneFeld(lv, 'auftragnehmer', pfad);
  ohneFeld(lv, 'epaBezeichnungen', pfad);
  if (istObjekt(lv)) knotenOhneAnsatz(lv['knoten'], `${pfad}.knoten`);
}

function lvZustandOhneNeues(z: unknown, pfad: string): void {
  if (!istObjekt(z)) return;
  aggregatOhneNeues(z['leistungsverzeichnis'], `${pfad}.leistungsverzeichnis`);
  alsListe(z['papierkorb']).forEach((e, i) => {
    if (istObjekt(e)) knotenOhneAnsatz(e['knoten'], `${pfad}.papierkorb[${String(i)}].knoten`);
  });
}

/** Projektdatei Version 3 → 4: unverändert, bis auf die Prüfung, dass die neuen Felder noch fehlen. */
export function dateiAuf4(roh: Roh): Roh {
  alsListe(roh['leistungsverzeichnisse']).forEach((z, i) => {
    lvZustandOhneNeues(z, `$.leistungsverzeichnisse[${String(i)}]`);
  });
  alsListe(roh['auftragsLeistungsverzeichnisse']).forEach((z, i) => {
    if (istObjekt(z))
      aggregatOhneNeues(
        z['auftragsLeistungsverzeichnis'],
        `$.auftragsLeistungsverzeichnisse[${String(i)}].auftragsLeistungsverzeichnis`,
      );
  });
  alsListe(roh['lvStaende']).forEach((s, i) => {
    if (istObjekt(s)) lvZustandOhneNeues(s['zustand'], `$.lvStaende[${String(i)}].zustand`);
  });
  return { ...roh };
}
