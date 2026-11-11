// SPDX-License-Identifier: AGPL-3.0-or-later
// Dateimigration 5 (Ticket 79, A8): hebt eine Projektdatei der Version 4 auf 5. Das Schema dazu steht in
// `migrationen.ts` (`SCHEMA_V5`). Einmal gemergt, wird hier nichts mehr geändert.
//
// Version 5 bringt nur Neues dazu, das fehlen darf (`vertrag` v1.4): `nachtrag` und `vorlage` am Kopf des LV,
// `kostengruppe` und `textquelle` an der Position, die Listen `aufmasse`, `rechnungen` und `kostenermittlungen` und die
// Aggregatarten `aufmass`, `rechnung` und `kostenermittlung` im Protokoll. Eine Datei der Version 4 hat nichts davon; ihr
// Inhalt bleibt deshalb, wie er ist (keine Neuberechnung, D-17 nicht nötig). Trägt eine Datei, die sich als Version 4
// ausgibt, schon eines davon (im LV, im Auftrags-LV, im Papierkorb, in einem LV-Stand oder im Protokoll), ist sie ungültig
// (in Version 4 war es unbekannt), nicht still übernommen (Q5).

import { abbruch } from './ergebnis';

type Roh = Record<string, unknown>;

const istObjekt = (x: unknown): x is Roh => typeof x === 'object' && x !== null && !Array.isArray(x);
const alsListe = (x: unknown): unknown[] => (Array.isArray(x) ? (x as unknown[]) : []);

function ohneFeld(o: unknown, feld: string, pfad: string): void {
  if (istObjekt(o) && Object.hasOwn(o, feld))
    abbruch('datei-ungueltig', `${pfad}: unbekanntes Feld „${feld}“`);
}

function knotenOhneNeues(knoten: unknown, pfad: string): void {
  alsListe(knoten).forEach((k, i) => {
    ohneFeld(k, 'kostengruppe', `${pfad}[${String(i)}]`);
    ohneFeld(k, 'textquelle', `${pfad}[${String(i)}]`);
  });
}

/** Kopf und Knoten eines LV oder Auftrags-LV (in der Datei ein Objekt mit `knoten`). */
function aggregatOhneNeues(lv: unknown, pfad: string): void {
  ohneFeld(lv, 'nachtrag', pfad);
  ohneFeld(lv, 'vorlage', pfad);
  if (istObjekt(lv)) knotenOhneNeues(lv['knoten'], `${pfad}.knoten`);
}

function lvZustandOhneNeues(z: unknown, pfad: string): void {
  if (!istObjekt(z)) return;
  aggregatOhneNeues(z['leistungsverzeichnis'], `${pfad}.leistungsverzeichnis`);
  alsListe(z['papierkorb']).forEach((e, i) => {
    if (istObjekt(e)) knotenOhneNeues(e['knoten'], `${pfad}.papierkorb[${String(i)}].knoten`);
  });
}

const NEUE_AGGREGATARTEN: readonly unknown[] = ['aufmass', 'rechnung', 'kostenermittlung'];

/** Projektdatei Version 4 → 5: unverändert, bis auf die Prüfung, dass das Neue aus Version 5 noch fehlt. */
export function dateiAuf5(roh: Roh): Roh {
  for (const liste of ['aufmasse', 'rechnungen', 'kostenermittlungen']) ohneFeld(roh, liste, '$');
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
  alsListe(roh['protokoll']).forEach((e, i) => {
    const art = istObjekt(e) && istObjekt(e['aggregat']) ? e['aggregat']['art'] : undefined;
    if (NEUE_AGGREGATARTEN.includes(art))
      abbruch(
        'datei-ungueltig',
        `$.protokoll[${String(i)}].aggregat.art: „${String(art)}“ gab es in Version 4 nicht`,
      );
  });
  return { ...roh };
}
