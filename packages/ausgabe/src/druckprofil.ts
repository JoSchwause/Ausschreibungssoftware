// SPDX-License-Identifier: AGPL-3.0-or-later
// Druckprofile (Ticket 77, O3): ein benanntes Bündel von Druckeinstellungen für den LV-Druck. Der Typ lebt hier, nicht im
// Vertrag (D-36 (7)): Die App speichert ein Profil als Einstellung des Nutzers, als JSON (`druckprofilAlsJson`). Alles hier ist
// rein (A2): Ein Profil wird auf `PdfOptionen` abgebildet, das Modell und der Renderer lesen nur diese Optionen.

import type { PdfOptionen } from './pdf';
import type { LangtextUmfang } from './modell';

export { ersetzePlatzhalter } from './platzhalter';
export type { PlatzhalterWerte } from './platzhalter';

/** Version des JSON-Formats; wird bei einer inkompatiblen Änderung erhöht. */
export const DRUCKPROFIL_SCHEMAVERSION = 1;

export interface Druckprofil {
  /** Name, unter dem der Nutzer das Profil wählt. */
  readonly name: string;
  /** `false`: Blankett für Bieter, kein Preis im Druck (auch keine Titelsummen, kein Schlussblock). */
  readonly mitPreisen: boolean;
  /** Langtext voll, gar nicht (nur Kurztext) oder gekürzt auf die ersten `anzahl` Zeilen. */
  readonly langtext: LangtextUmfang;
  readonly titelsummen: boolean;
  /** Netto, Nachlass, MwSt, Brutto sowie Bedarfs- und Wahlsumme getrennt (F4). */
  readonly schlussblock: boolean;
  /** Kopf mit Projekt, Bauherr, Auftraggeber, Vergabeinformationen und LV-Name; aus: nur der LV-Name. */
  readonly deckblatt: boolean;
  /** Freier Text im Seitenkopf mit Platzhaltern `{seite}`, `{seiten}`, `{datum}`, `{lv}`; `null`: Vorgabe. */
  readonly kopfzeile: string | null;
  /** Freier Text im Seitenfuß mit denselben Platzhaltern; `null`: „Stand: Datum“ und „Seite x von y“. */
  readonly fusszeile: string | null;
  readonly seitenrand: 'normal' | 'eng';
}

/** Ein Profil mit den Vorgabewerten (entspricht dem Druck ohne Profil). */
export function neuesDruckprofil(name: string): Druckprofil {
  return {
    name,
    mitPreisen: true,
    langtext: { art: 'voll' },
    titelsummen: true,
    schlussblock: true,
    deckblatt: true,
    kopfzeile: null,
    fusszeile: null,
    seitenrand: 'normal',
  };
}

export const STANDARD_DRUCKPROFILE: readonly Druckprofil[] = [
  {
    ...neuesDruckprofil('Ausschreibung mit Langtext ohne Preise'),
    mitPreisen: false,
    titelsummen: false,
    schlussblock: false,
  },
  {
    ...neuesDruckprofil('Kostenanschlag mit Preisen, nur Kurztext'),
    langtext: { art: 'kein' },
    seitenrand: 'eng',
  },
  neuesDruckprofil('Auftrags-LV mit Preisen'),
];

/** Datum und Projekt gehören nicht zum Profil; die App gibt sie beim Drucken mit. */
export interface DruckEingabe {
  readonly datum?: string;
  readonly projekt?: PdfOptionen['projekt'];
}

/** Bildet ein Profil auf die Optionen von `erzeugePdf` (und `baueAusgabemodell`) ab. */
export function profilAlsOptionen(profil: Druckprofil, eingabe: DruckEingabe = {}): PdfOptionen {
  return {
    mitPreisen: profil.mitPreisen,
    langtext: profil.langtext,
    titelsummen: profil.titelsummen,
    schlussblock: profil.schlussblock,
    deckblatt: profil.deckblatt,
    seitenrand: profil.seitenrand,
    ...(profil.kopfzeile === null ? {} : { kopfzeile: profil.kopfzeile }),
    ...(profil.fusszeile === null ? {} : { fusszeile: profil.fusszeile }),
    ...(eingabe.datum === undefined ? {} : { datum: eingabe.datum }),
    ...(eingabe.projekt === undefined ? {} : { projekt: eingabe.projekt }),
  };
}

// --- JSON ---------------------------------------------------------------------------------------

export type DruckprofilBefundcode =
  'kein-profil' | 'schemaversion-fehlt' | 'schemaversion-unbekannt' | 'unbekanntes-feld' | 'ungueltiger-wert';

export interface DruckprofilBefund {
  readonly code: DruckprofilBefundcode;
  /** Feld im JSON-Objekt, leer beim ganzen Dokument. */
  readonly pfad: string;
  readonly text: string;
}

export function druckprofilAlsJson(profil: Druckprofil): string {
  return `${JSON.stringify({ schemaversion: DRUCKPROFIL_SCHEMAVERSION, ...profil }, null, 2)}\n`;
}

const FELDER = new Set([
  'schemaversion',
  'name',
  'mitPreisen',
  'langtext',
  'titelsummen',
  'schlussblock',
  'deckblatt',
  'kopfzeile',
  'fusszeile',
  'seitenrand',
]);

const istObjekt = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

function langtextLesen(x: unknown): LangtextUmfang | null {
  if (!istObjekt(x)) return null;
  if (x['art'] === 'voll') return { art: 'voll' };
  if (x['art'] === 'kein') return { art: 'kein' };
  const anzahl = x['anzahl'];
  if (x['art'] === 'zeilen' && typeof anzahl === 'number' && Number.isInteger(anzahl) && anzahl >= 1)
    return { art: 'zeilen', anzahl };
  return null;
}

/**
 * Liest ein Profil aus JSON. Fehlende Felder bekommen den Standardwert (ohne Befund), unbekannte Felder und ungültige Werte
 * sind ein Befund (das Feld behält dann den Standardwert), eine fehlende oder neuere Schemaversion ebenso. Ist der Text
 * kein JSON-Objekt, ist `profil` `null`. Nichts wirft (U5: Probleme blockieren nie).
 */
export function druckprofilAusJson(text: string): {
  profil: Druckprofil | null;
  befunde: DruckprofilBefund[];
} {
  let roh: unknown;
  try {
    roh = JSON.parse(text);
  } catch {
    roh = undefined;
  }
  if (!istObjekt(roh))
    return {
      profil: null,
      befunde: [
        { code: 'kein-profil', pfad: '', text: 'Die Datei enthält kein Druckprofil (kein JSON-Objekt).' },
      ],
    };
  const befunde: DruckprofilBefund[] = [];
  const ungueltig = (pfad: string, erwartet: string): void => {
    befunde.push({
      code: 'ungueltiger-wert',
      pfad,
      text: `Ungültiger Wert für „${pfad}“ (erwartet: ${erwartet}); Standardwert verwendet.`,
    });
  };
  const version = roh['schemaversion'];
  if (typeof version !== 'number')
    befunde.push({
      code: 'schemaversion-fehlt',
      pfad: 'schemaversion',
      text: 'Die Schemaversion fehlt; Version 1 angenommen.',
    });
  else if (version !== DRUCKPROFIL_SCHEMAVERSION)
    befunde.push({
      code: 'schemaversion-unbekannt',
      pfad: 'schemaversion',
      text: `Unbekannte Schemaversion ${String(version)}; bekannte Felder wurden gelesen.`,
    });
  for (const schluessel of Object.keys(roh))
    if (!FELDER.has(schluessel))
      befunde.push({
        code: 'unbekanntes-feld',
        pfad: schluessel,
        text: `Unbekanntes Feld „${schluessel}“ ignoriert.`,
      });

  const name = roh['name'];
  const hatName = typeof name === 'string' && name.trim() !== '';
  if (!hatName) ungueltig('name', 'nichtleerer Text');
  const standard = neuesDruckprofil(hatName ? name.trim() : 'Druckprofil');

  const wahr = (feld: 'mitPreisen' | 'titelsummen' | 'schlussblock' | 'deckblatt'): boolean => {
    const w = roh[feld];
    if (w === undefined) return standard[feld];
    if (typeof w === 'boolean') return w;
    ungueltig(feld, 'wahr oder falsch');
    return standard[feld];
  };
  const textOderNull = (feld: 'kopfzeile' | 'fusszeile'): string | null => {
    const w = roh[feld];
    if (w === undefined || w === null) return null;
    if (typeof w === 'string') return w;
    ungueltig(feld, 'Text oder null');
    return null;
  };
  let langtext = standard.langtext;
  if (roh['langtext'] !== undefined) {
    const l = langtextLesen(roh['langtext']);
    if (l === null) ungueltig('langtext', '„voll“, „kein“ oder „zeilen“ mit ganzzahliger Anzahl ≥ 1');
    else langtext = l;
  }
  let seitenrand = standard.seitenrand;
  if (roh['seitenrand'] !== undefined) {
    const r = roh['seitenrand'];
    if (r === 'normal' || r === 'eng') seitenrand = r;
    else ungueltig('seitenrand', '„normal“ oder „eng“');
  }
  const profil: Druckprofil = {
    name: standard.name,
    mitPreisen: wahr('mitPreisen'),
    langtext,
    titelsummen: wahr('titelsummen'),
    schlussblock: wahr('schlussblock'),
    deckblatt: wahr('deckblatt'),
    kopfzeile: textOderNull('kopfzeile'),
    fusszeile: textOderNull('fusszeile'),
    seitenrand,
  };
  return { profil, befunde };
}
