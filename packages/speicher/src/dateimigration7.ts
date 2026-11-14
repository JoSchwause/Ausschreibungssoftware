// SPDX-License-Identifier: AGPL-3.0-or-later
// Dateimigration 7 (Ticket 139, A8): hebt eine Projektdatei der Version 6 auf 7. Das Schema dazu steht in `migrationen.ts`
// (`SCHEMA_V7`). Schema 7 gilt als veröffentlicht ab dem Merge nach `main` (D-104); ab dann wird hier nichts mehr geändert,
// eine weitere Änderung bekommt eine neue Version. Bis dahin durfte es innerhalb der Welle 7 noch wachsen (Ticket 143).
//
// Version 7 bringt nur Neues dazu, das fehlen darf (`vertrag` v1.7a): `angaben` an Projekt und Bieter, `preisspiegel` am Kopf
// des LV, `kalkulation` an der Position, den Block `einstellungen` und die Befehle aus v1.7a. Eine Datei der Version 6 hat
// nichts davon; ihr Inhalt bleibt deshalb, wie er ist (keine Neuberechnung, D-17 nicht nötig: keines der Felder ändert eine
// Summe). Trägt eine Datei, die sich als Version 6 ausgibt, schon eines davon (am Projekt, an einem Bieter, im LV, im
// Auftrags-LV, im Papierkorb, in einem LV-Stand oder im Protokoll), ist sie ungültig (in Version 6 war es unbekannt), nicht
// still übernommen (Q5).
//
// Ticket 143 (D-93): Schema 7 trägt auch die Felder aus `vertrag` v1.7b an der Rechnung (`vertragsstrafe`, `skonto`,
// `bauabzugsteuer`, `zahlungen`, alle optional, kein neues Schema) und ihre sechs Befehle. Eine Datei der Version 6 kann sie
// ebenso nicht tragen; die Prüfung dafür kommt hier dazu (für gültige Dateien ändert sich nichts).

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
    ohneFeld(k, 'kalkulation', `${pfad}[${String(i)}]`);
  });
}

function lvZustandOhneNeues(z: unknown, pfad: string): void {
  if (!istObjekt(z)) return;
  const lv = z['leistungsverzeichnis'];
  ohneFeld(lv, 'preisspiegel', `${pfad}.leistungsverzeichnis`);
  if (istObjekt(lv)) knotenOhneNeues(lv['knoten'], `${pfad}.leistungsverzeichnis.knoten`);
  alsListe(z['papierkorb']).forEach((e, i) => {
    if (istObjekt(e)) knotenOhneNeues(e['knoten'], `${pfad}.papierkorb[${String(i)}].knoten`);
  });
}

/** Die Befehle aus `vertrag` v1.7a im Befehl eines Projekts; in einer Datei der Version 6 kann keiner davon stehen. */
const NEUE_BEFEHLE: readonly unknown[] = [
  'ProjektangabenSetzen',
  'BieterUmbenennen',
  'BieterangabenSetzen',
  'BieterLoeschen',
  'LvStandUmbenennen',
  'LvStandLoeschen',
  'KalkulationSetzen',
  'PreisspiegelEinstellungenSetzen',
  'ZuschlagZuruecknehmen',
  // v1.7b (Ticket 143, D-93)
  'VertragsstrafeSetzen',
  'SkontoSetzen',
  'BauabzugsteuerSetzen',
  'ZahlungErfassen',
  'ZahlungAendern',
  'ZahlungLoeschen',
];

/** Die Felder der Rechnung aus `vertrag` v1.7b (D-93); in einer Datei der Version 6 kann keines davon stehen. */
const NEUE_RECHNUNGSFELDER = ['vertragsstrafe', 'skonto', 'bauabzugsteuer', 'zahlungen'] as const;

/** Projektdatei Version 6 → 7: unverändert, bis auf die Prüfung, dass das Neue aus Version 7 noch fehlt. */
export function dateiAuf7(roh: Roh): Roh {
  ohneFeld(roh, 'einstellungen', '$');
  const projekt = roh['projekt'];
  ohneFeld(projekt, 'angaben', '$.projekt');
  if (istObjekt(projekt))
    alsListe(projekt['bieter']).forEach((b, i) => {
      ohneFeld(b, 'angaben', `$.projekt.bieter[${String(i)}]`);
    });
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
  alsListe(roh['rechnungen']).forEach((z, i) => {
    const r = istObjekt(z) ? z['rechnung'] : undefined;
    for (const f of NEUE_RECHNUNGSFELDER) ohneFeld(r, f, `$.rechnungen[${String(i)}].rechnung`);
  });
  alsListe(roh['lvStaende']).forEach((s, i) => {
    if (istObjekt(s)) lvZustandOhneNeues(s['zustand'], `$.lvStaende[${String(i)}].zustand`);
  });
  alsListe(roh['protokoll']).forEach((e, i) => {
    const b = istObjekt(e) ? e['befehl'] : undefined;
    const bart = istObjekt(b)
      ? b['art'] === 'Befehlskurzfassung' && istObjekt(b['kopf'])
        ? b['kopf']['art']
        : b['art']
      : undefined;
    if (NEUE_BEFEHLE.includes(bart))
      abbruch(
        'datei-ungueltig',
        `$.protokoll[${String(i)}].befehl.art: „${String(bart)}“ gab es in Version 6 nicht`,
      );
  });
  return { ...roh };
}
