// SPDX-License-Identifier: AGPL-3.0-or-later
// Dateimigration 6 (Ticket 106, A8): hebt eine Projektdatei der Version 5 auf 6. Das Schema dazu steht in `migrationen.ts`
// (`SCHEMA_V6`). Einmal gemergt, wird hier nichts mehr geändert.
//
// Version 6 bringt nur Neues dazu, das fehlen darf (`vertrag` v1.6): `bauteile` an der Position, die Listen
// `bauwerksmodelle`, `modelldateien`, `bauzeitenplaene`, `honorarberechnungen`, `maengel` und `bautagebuch`, die fünf neuen
// Aggregatarten im Protokoll und die Befehle aus v1.6. Eine Datei der Version 5 hat nichts davon; ihr Inhalt bleibt deshalb,
// wie er ist (keine Neuberechnung, D-17 nicht nötig). Trägt eine Datei, die sich als Version 5 ausgibt, schon eines davon (im
// LV, im Auftrags-LV, im Papierkorb, in einem LV-Stand oder im Protokoll), ist sie ungültig (in Version 5 war es unbekannt),
// nicht still übernommen (Q5).

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
    ohneFeld(k, 'bauteile', `${pfad}[${String(i)}]`);
  });
}

function lvZustandOhneNeues(z: unknown, pfad: string): void {
  if (!istObjekt(z)) return;
  const lv = z['leistungsverzeichnis'];
  if (istObjekt(lv)) knotenOhneNeues(lv['knoten'], `${pfad}.leistungsverzeichnis.knoten`);
  alsListe(z['papierkorb']).forEach((e, i) => {
    if (istObjekt(e)) knotenOhneNeues(e['knoten'], `${pfad}.papierkorb[${String(i)}].knoten`);
  });
}

const NEUE_LISTEN = [
  'bauwerksmodelle',
  'modelldateien',
  'bauzeitenplaene',
  'honorarberechnungen',
  'maengel',
  'bautagebuch',
] as const;

const NEUE_AGGREGATARTEN: readonly unknown[] = [
  'bauwerksmodell',
  'bauzeitenplan',
  'honorarberechnung',
  'mangel',
  'bautagebucheintrag',
];

/** Die Befehle aus `vertrag` v1.6; in einer Datei der Version 5 kann keiner davon stehen. */
const NEUE_BEFEHLE: readonly unknown[] = [
  'BauwerksmodellAnlegen',
  'BauwerksmodellUmbenennen',
  'BauwerksmodellLoeschen',
  'BauteileZuordnen',
  'BauzeitenplanAnlegen',
  'BauzeitenplankopfSetzen',
  'VorgangSetzen',
  'VorgangEntfernen',
  'BauzeitenplanLoeschen',
  'HonorarberechnungAnlegen',
  'HonorarberechnungSetzen',
  'HonorarberechnungLoeschen',
  'MangelAnlegen',
  'MangelangabenSetzen',
  'MangelstatusSetzen',
  'MangelLoeschen',
  'BautagebucheintragSetzen',
  'BautagebucheintragLoeschen',
];

/** Projektdatei Version 5 → 6: unverändert, bis auf die Prüfung, dass das Neue aus Version 6 noch fehlt. */
export function dateiAuf6(roh: Roh): Roh {
  for (const liste of NEUE_LISTEN) ohneFeld(roh, liste, '$');
  alsListe(roh['leistungsverzeichnisse']).forEach((z, i) => {
    lvZustandOhneNeues(z, `$.leistungsverzeichnisse[${String(i)}]`);
  });
  alsListe(roh['auftragsLeistungsverzeichnisse']).forEach((z, i) => {
    const a = istObjekt(z) ? z['auftragsLeistungsverzeichnis'] : undefined;
    if (istObjekt(a))
      knotenOhneNeues(
        a['knoten'],
        `$.auftragsLeistungsverzeichnisse[${String(i)}].auftragsLeistungsverzeichnis.knoten`,
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
        `$.protokoll[${String(i)}].aggregat.art: „${String(art)}“ gab es in Version 5 nicht`,
      );
    const b = istObjekt(e) ? e['befehl'] : undefined;
    const bart = istObjekt(b)
      ? b['art'] === 'Befehlskurzfassung' && istObjekt(b['kopf'])
        ? b['kopf']['art']
        : b['art']
      : undefined;
    if (NEUE_BEFEHLE.includes(bart))
      abbruch(
        'datei-ungueltig',
        `$.protokoll[${String(i)}].befehl.art: „${String(bart)}“ gab es in Version 5 nicht`,
      );
  });
  return { ...roh };
}
