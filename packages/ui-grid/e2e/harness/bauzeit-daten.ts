// SPDX-License-Identifier: AGPL-3.0-or-later
// Ein erfundener Bauzeitenplan für die Testseite der Balkenspalte (Ticket 96). Er spielt die Rolle der App: Die App
// rechnet Termine mit ihrem Arbeitskalender (`bauzeit`) und formatiert sie; das Grid sieht nur Tagesindizes und fertige
// Texte. Hier entstehen Monate, Kalenderwochen und freie Tage aus UTC-Daten ab Freitag, 1. Januar 2027 (Tag 0).
// Nur Testseite, nie Produktivcode.
//
// Ohne `zeilen` ein fester Plan (12 Zeilen, Herleitung je Zeile unten), sonst `zeilen` erzeugte Zeilen für die
// Leistungsmessung (je 20 Zeilen ein Sammelvorgang mit 19 Vorgängen).

import type { Balken, VergleichsSpalte, VergleichsZeile, Zeitabschnitt, Zeitleiste } from '../../src/index';

const TAG_MS = 86_400_000;
/** Tag 0 der Achse: Freitag, 1. Januar 2027. */
const ANFANG = Date.UTC(2027, 0, 1);
const MONATE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];
/** Bundesweite Feiertage Ende 2026 bis 2028 (Ostern 28.03.2027 und 16.04.2028); manche fallen aufs Wochenende. */
const FEIERTAGE = [
  '2026-12-25',
  '2026-12-26',
  '2027-01-01',
  '2027-03-26',
  '2027-03-29',
  '2027-05-01',
  '2027-05-06',
  '2027-05-17',
  '2027-10-03',
  '2027-12-25',
  '2027-12-26',
  '2028-01-01',
  '2028-04-14',
  '2028-04-17',
  '2028-05-01',
  '2028-05-25',
  '2028-06-05',
  '2028-10-03',
  '2028-12-25',
  '2028-12-26',
];

const datum = (tag: number): Date => new Date(ANFANG + tag * TAG_MS);
const zwei = (n: number): string => String(n).padStart(2, '0');
/** Tagesindex als de-DE-Datum, z. B. 10 → „11.01.2027“. */
export function datumText(tag: number): string {
  const d = datum(tag);
  return `${zwei(d.getUTCDate())}.${zwei(d.getUTCMonth() + 1)}.${String(d.getUTCFullYear())}`;
}
const tagVon = (iso: string): number => Math.round((Date.parse(iso) - ANFANG) / TAG_MS);

function monate(tage: number): Zeitabschnitt[] {
  const ergebnis: Zeitabschnitt[] = [];
  for (let tag = 0; tag < tage; ) {
    const d = datum(tag);
    const bis = Math.round((Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - ANFANG) / TAG_MS);
    ergebnis.push({
      text: `${MONATE[d.getUTCMonth()] ?? ''} ${String(d.getUTCFullYear())}`,
      vonTag: tag,
      bisTag: bis,
    });
    tag = bis;
  }
  return ergebnis;
}

/** Kalenderwoche nach ISO 8601: Der Donnerstag der Woche bestimmt das Jahr. */
function isoWoche(montag: number): number {
  const donnerstag = datum(montag + 3);
  const neujahr = Date.UTC(donnerstag.getUTCFullYear(), 0, 1);
  return 1 + Math.floor((donnerstag.getTime() - neujahr) / TAG_MS / 7);
}

/** Kalenderwochen ab dem Montag vor Tag 0 (28.12.2026, KW 53): Die erste ragt über den Anfang der Achse hinaus. */
function kalenderwochen(tage: number): Zeitabschnitt[] {
  const ergebnis: Zeitabschnitt[] = [];
  for (let montag = -((datum(0).getUTCDay() + 6) % 7); montag < tage; montag += 7) {
    ergebnis.push({ text: `KW ${String(isoWoche(montag))}`, vonTag: montag, bisTag: montag + 7 });
  }
  return ergebnis;
}

function istFrei(tag: number): boolean {
  const w = datum(tag).getUTCDay();
  return w === 0 || w === 6 || FEIERTAGE.some((f) => tagVon(f) === tag);
}

export function zeitleiste(tage: number, pixelJeTag: number, mitUnterkopf: boolean): Zeitleiste {
  const freieTage: number[] = [];
  for (let t = 0; t < tage; t++) if (istFrei(t)) freieTage.push(t);
  return {
    tage,
    pixelJeTag,
    kopf: monate(tage),
    ...(mitUnterkopf ? { unterkopf: kalenderwochen(tage) } : {}),
    freieTage,
    markierungen: [{ tag: 90, art: 'stichtag', beschreibung: `Stichtag ${datumText(90)}` }],
  };
}

/** Arbeitstage in `[von, bis)`: alle Tage ohne Wochenende und Feiertag. */
function arbeitstage(von: number, bis: number): number {
  let n = 0;
  for (let t = von; t < bis; t++) if (!istFrei(t)) n++;
  return n;
}

export interface Bauzeitenplan {
  readonly spalten: VergleichsSpalte[];
  /** Alle Zeilen, aufgeklappt; die Testseite blendet zugeklappte Unterzeilen aus. */
  readonly zeilen: (VergleichsZeile & { elternId: string | null })[];
}

interface Vorgang {
  readonly id: string;
  readonly elternId: string | null;
  readonly nr: string;
  readonly name: string;
  /** Ohne `balken` bleibt die Zelle der Balkenspalte leer (nur Raster). */
  readonly balken?: Omit<Balken, 'beschreibung'>;
  /** Text rechts neben dem Balken. */
  readonly text?: string;
}

/**
 * Der feste Plan (Tag 0 = Fr 01.01.2027; Montage: 3 = 04.01., 10 = 11.01., 24 = 25.01., 59 = 01.03., 73 = 15.03.,
 * 108 = 19.04.). Bei 120 Tagen endet die Achse mit dem 30.04.2027.
 */
const PLAN: readonly Vorgang[] = [
  { id: 'g0', elternId: null, nr: '0', name: 'Vorlauf' },
  { id: 'p01', elternId: 'g0', nr: '0.1', name: 'Planung', balken: { vonTag: -20, bisTag: 6, art: 'vorgang' } },
  { id: 'g1', elternId: null, nr: '1', name: 'Rohbau', balken: { vonTag: 3, bisTag: 59, art: 'sammelvorgang' } },
  {
    id: 'p1',
    elternId: 'g1',
    nr: '1.1',
    name: 'Baustelle einrichten',
    balken: { vonTag: 3, bisTag: 8, art: 'vorgang', fortschritt: 100 },
  },
  {
    id: 'p2',
    elternId: 'g1',
    nr: '1.2',
    name: 'Erdarbeiten',
    balken: { vonTag: 10, bisTag: 22, art: 'vorgang', kritisch: true, fortschritt: 40 },
    text: 'Fa. Muster Bau',
  },
  {
    id: 'p3',
    elternId: 'g1',
    nr: '1.3',
    name: 'Fundamente',
    balken: { vonTag: 24, bisTag: 36, art: 'vorgang', ist: { vonTag: 26, bisTag: 38 } },
  },
  {
    id: 'p4',
    elternId: 'g1',
    nr: '1.4',
    name: 'Rohbau fertig',
    balken: { vonTag: 59, bisTag: 59, art: 'meilenstein', kritisch: true },
  },
  { id: 'g2', elternId: null, nr: '2', name: 'Ausbau', balken: { vonTag: 59, bisTag: 130, art: 'sammelvorgang' } },
  { id: 'p5', elternId: 'g2', nr: '2.1', name: 'Estrich', balken: { vonTag: 59, bisTag: 73, art: 'vorgang' } },
  {
    id: 'p6',
    elternId: 'g2',
    nr: '2.2',
    name: 'Innenputz',
    balken: { vonTag: 73, bisTag: 101, art: 'vorgang', fortschritt: 50, ist: { vonTag: 75, bisTag: 90 } },
  },
  {
    id: 'p7',
    elternId: 'g2',
    nr: '2.3',
    name: 'Fliesen',
    balken: { vonTag: 108, bisTag: 130, art: 'vorgang', kritisch: true },
  },
  { id: 'p8', elternId: 'g2', nr: '2.4', name: 'Abnahme', balken: { vonTag: 140, bisTag: 140, art: 'meilenstein' } },
];

/** Erzeugte Zeilen für die Leistungsmessung: Balken über die ganze Achse verteilt, mit allen Arten und Merkmalen. */
function erzeugePlan(anzahl: number, tage: number): Vorgang[] {
  const ergebnis: Vorgang[] = [];
  let gruppe: Vorgang | null = null;
  for (let i = 0; i < anzahl; i++) {
    if (i % 20 === 0) {
      const von = (i * 11) % Math.max(1, tage - 60);
      gruppe = {
        id: `g${String(i)}`,
        elternId: null,
        nr: String(i / 20 + 1),
        name: `Abschnitt ${String(i / 20 + 1)}`,
        balken: { vonTag: von, bisTag: von + 60, art: 'sammelvorgang' },
      };
      ergebnis.push(gruppe);
      continue;
    }
    const von = (i * 37) % Math.max(1, tage - 30);
    const dauer = 5 + ((i * 7) % 25);
    const meilenstein = i % 13 === 0;
    ergebnis.push({
      id: `p${String(i)}`,
      elternId: gruppe?.id ?? null,
      nr: `${gruppe?.nr ?? ''}.${String(i % 20)}`,
      name: `Vorgang ${String(i)}`,
      balken: {
        vonTag: von,
        bisTag: meilenstein ? von : von + dauer,
        art: meilenstein ? 'meilenstein' : 'vorgang',
        ...(i % 7 === 0 ? { kritisch: true } : {}),
        ...(i % 5 === 0 && !meilenstein ? { fortschritt: (i * 3) % 101 } : {}),
        ...(i % 9 === 0 && !meilenstein ? { ist: { vonTag: von + 2, bisTag: von + dauer + 3 } } : {}),
      },
      text: i % 4 === 0 ? `Firma ${String(i % 17)}` : '',
    });
  }
  return ergebnis;
}

export function erfindeBauzeitenplan(
  anzahlZeilen: number | null,
  zl: Zeitleiste,
  mitGruppe: boolean,
): Bauzeitenplan {
  const termine = mitGruppe ? { gruppe: { id: 'termine', kopf: 'Termine' } } : {};
  const spalten: VergleichsSpalte[] = [
    { id: 'nr', kopf: 'Nr.', breite: 64 },
    { id: 'vorgang', kopf: 'Vorgang', breite: 220 },
    { id: 'dauer', kopf: 'Dauer', ausrichtung: 'rechts', breite: 72 },
    { id: 'anfang', kopf: 'Anfang', breite: 96, ...termine },
    { id: 'ende', kopf: 'Ende', breite: 96, ...termine },
    { id: 'balken', kopf: 'Zeitplan', zeitleiste: zl },
  ];
  const plan = anzahlZeilen === null ? PLAN : erzeugePlan(anzahlZeilen, zl.tage);
  const hatKinder = new Set(plan.map((v) => v.elternId));
  const zeilen = plan.map((v) => {
    const b = v.balken;
    const bis = b ? (b.art === 'meilenstein' ? b.vonTag : b.bisTag) : 0;
    const at = b ? arbeitstage(b.vonTag, bis) : 0;
    const beschreibung = b
      ? b.art === 'meilenstein'
        ? `Meilenstein ${datumText(b.vonTag)}${b.kritisch ? ', kritisch' : ''}`
        : `${datumText(b.vonTag)} bis ${datumText(bis - 1)}, ${String(at)} Arbeitstage${b.kritisch ? ', kritisch' : ''}`
      : '';
    return {
      id: v.id,
      elternId: v.elternId,
      art: v.elternId === null ? ('gliederung' as const) : ('position' as const),
      tiefe: v.elternId === null ? 0 : 1,
      hatUnterknoten: hatKinder.has(v.id),
      aufgeklappt: true,
      zellen: {
        nr: { text: v.nr },
        vorgang: { text: v.name },
        ...(b
          ? {
              dauer: { text: `${String(at)} AT` },
              anfang: { text: datumText(b.vonTag) },
              ende: { text: datumText(b.art === 'meilenstein' ? b.vonTag : bis - 1) },
              balken: { text: v.text ?? '', balken: { ...b, beschreibung } },
            }
          : {}),
      },
    };
  });
  return { spalten, zeilen };
}
