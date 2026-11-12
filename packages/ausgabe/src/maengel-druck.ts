// SPDX-License-Identifier: AGPL-3.0-or-later
// Mängelliste und Mängelanzeige (X4, Ticket 113): das Berichtsmodell aus `Mangel`-Listen und den Befunden der Fristprüfung.
// Nichts wird hier gerechnet (A2): Der Status eines Mangels ist der seines letzten Verlaufseintrags (Glossar
// „Mängelverlauf“), „überfällig“ steht nur, wenn der Aufrufer einen Befund der Quelle `fristpruefung` zum Mangel mitgibt.

import type { Mangel, Mangelverlaufseintrag, Pruefbefund } from '@tethys/vertrag';
import { KEINE_ANGABE, datumOderStrich, druckdatum, textOderStrich } from './bericht';
import type { BerichtAbschnitt, BerichtZeile, Berichtsmodell } from './bericht';

export interface MaengellisteEingabe {
  readonly projekt: string;
  /** Die zu druckenden Mängel (alle oder schon gefiltert); der Druck sortiert nach Nummer. */
  readonly maengel: readonly Mangel[];
  /** Befunde der Fristprüfung (Quelle `fristpruefung`); andere Befunde ignoriert der Druck. */
  readonly befunde: readonly Pruefbefund[];
  /** Name des Auftragnehmers je Auftrags-LV (Der `Mangel` kennt nur die Kennung). */
  readonly auftragnehmer: Readonly<Record<string, string>>;
  /** Beschreibung des Filters für den Kopf, z. B. „Auftragnehmer: Muster Bau GmbH“; fehlt: ungefiltert. */
  readonly filter?: string;
  /** Druckdatum `JJJJ-MM-TT`. */
  readonly datum?: string;
}

export interface MaengelanzeigeEingabe {
  readonly projekt: string;
  readonly auftragnehmer: string;
  /** Die angezeigten Mängel dieses Auftragnehmers. */
  readonly maengel: readonly Mangel[];
  readonly datum?: string;
}

/** Fester Anzeigetext der Mängelanzeige (kein Rechtstext, nur die Aufforderung). */
export const MAENGELANZEIGE_TEXT =
  'Bei der Bauüberwachung wurden die nachstehenden Mängel festgestellt. Wir zeigen sie hiermit an und fordern Sie auf, ' +
  'die Mängel bis zu der jeweils genannten Frist zu beseitigen.';

const nachNummer = (a: Mangel, b: Mangel): number => a.nummer - b.nummer;

function aktuellerStatus(m: Mangel): string {
  const letzter = m.verlauf[m.verlauf.length - 1];
  return letzter === undefined ? KEINE_ANGABE : `${letzter.status} seit ${datumOderStrich(letzter.datum)}`;
}

/** Titel, darunter die Beschreibung, wenn es eine gibt (sie darf im Druck nicht fehlen, Q5). */
const titelMitBeschreibung = (m: Mangel): string =>
  m.beschreibung === null || m.beschreibung.trim() === '' ? m.titel : `${m.titel}\n${m.beschreibung}`;

export function baueMaengellisteModell(e: MaengellisteEingabe): Berichtsmodell {
  const ueberfaellig = new Set<string>(
    e.befunde.filter((b) => b.quelle === 'fristpruefung' && b.ort.mangelId !== undefined).map((b) => b.ort.mangelId as string),
  );
  const zeilen: BerichtZeile[] = [...e.maengel].sort(nachNummer).map((m) => ({
    zellen: [
      String(m.nummer),
      titelMitBeschreibung(m),
      textOderStrich(m.ort),
      m.auftragsLvId === null ? KEINE_ANGABE : (e.auftragnehmer[m.auftragsLvId] ?? KEINE_ANGABE),
      datumOderStrich(m.festgestellt),
      datumOderStrich(m.frist),
      aktuellerStatus(m),
    ],
    ...(ueberfaellig.has(m.id) ? { kleinerText: 'überfällig' } : {}),
  }));
  const abschnitte: BerichtAbschnitt[] =
    zeilen.length === 0
      ? [{ ueberschrift: null, bloecke: [{ art: 'absatz', text: 'Keine Mängel.' }] }]
      : [
          {
            ueberschrift: null,
            bloecke: [
              {
                art: 'tabelle',
                spalten: [
                  { titel: 'Nr.', breite: 22 },
                  { titel: 'Mangel', breite: '*' },
                  { titel: 'Ort', breite: 62 },
                  { titel: 'Auftragnehmer', breite: 74 },
                  { titel: 'Festgestellt', breite: 48 },
                  { titel: 'Frist', breite: 48 },
                  { titel: 'Status', breite: 80 },
                ],
                zeilen,
              },
            ],
          },
        ];
  return {
    titel: 'Mängelliste',
    kopf: [
      { bezeichnung: 'Projekt', wert: e.projekt },
      ...(e.filter === undefined ? [] : [{ bezeichnung: 'Filter', wert: e.filter }]),
      { bezeichnung: 'Anzahl Mängel', wert: String(zeilen.length) },
    ],
    ...druckdatum(e.datum),
    abschnitte,
  };
}

/** Der letzte Verlaufseintrag `angezeigt`: Datum der Anzeige und die mit ihr gesetzte Frist (D-66). */
function letzteAnzeige(m: Mangel): Mangelverlaufseintrag | undefined {
  return [...m.verlauf].reverse().find((v) => v.status === 'angezeigt');
}

export function baueMaengelanzeigeModell(e: MaengelanzeigeEingabe): Berichtsmodell {
  const zeilen: BerichtZeile[] = [...e.maengel].sort(nachNummer).map((m) => {
    const anzeige = letzteAnzeige(m);
    // Die Frist der Anzeige steht im Verlauf; Einträge vor v1.6 tragen keine, dann gilt die Frist am Mangel.
    const frist = anzeige?.frist ?? m.frist;
    return {
      zellen: [
        String(m.nummer),
        titelMitBeschreibung(m),
        textOderStrich(m.ort),
        datumOderStrich(m.festgestellt),
        datumOderStrich(anzeige?.datum),
        datumOderStrich(frist),
      ],
    };
  });
  return {
    titel: 'Mängelanzeige',
    kopf: [
      { bezeichnung: 'Projekt', wert: e.projekt },
      { bezeichnung: 'Auftragnehmer', wert: e.auftragnehmer },
    ],
    ...druckdatum(e.datum),
    abschnitte: [
      { ueberschrift: null, bloecke: [{ art: 'absatz', text: MAENGELANZEIGE_TEXT }] },
      {
        ueberschrift: null,
        bloecke:
          zeilen.length === 0
            ? [{ art: 'absatz', text: 'Keine Mängel angezeigt.' }]
            : [
                {
                  art: 'tabelle',
                  spalten: [
                    { titel: 'Nr.', breite: 22 },
                    { titel: 'Mangel', breite: '*' },
                    { titel: 'Ort', breite: 80 },
                    { titel: 'Festgestellt', breite: 52 },
                    { titel: 'Angezeigt', breite: 52 },
                    { titel: 'Frist', breite: 52 },
                  ],
                  zeilen,
                },
              ],
      },
    ],
  };
}
