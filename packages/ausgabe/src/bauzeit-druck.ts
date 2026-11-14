// SPDX-License-Identifier: AGPL-3.0-or-later
// Bauzeitenplan als Tabelle (X2, Ticket 113): Nummer, Vorgang, Dauer, Beginn, Ende, Puffer, kritisch; dazu Projektende und
// kritischer Weg. Die Termine kommen aus dem `Bauzeitenplanergebnis` (A2: kein Termin wird hier gerechnet). Ticket 153 (E12 K):
// dazu ein Balkenplan; hier wird nur die Lage der Termine auf der Zeitachse bestimmt (Kalendertage, Anteil der Achse).

import type {
  Bauzeitenplan,
  Bauzeitenplanergebnis,
  Vorgang,
  VorgangId,
  Vorgangsergebnis,
  Wochentag,
} from '@tethys/vertrag';
import { KEINE_ANGABE, befundZeile, datumOderStrich, druckdatum } from './bericht';
import type {
  AchsenAbschnitt,
  BalkenZeile,
  BerichtAbschnitt,
  BerichtBlock,
  BerichtZeile,
  Befundtext,
  Berichtsmodell,
} from './bericht';

export interface BauzeitenplanEingabe {
  readonly plan: Bauzeitenplan;
  /** Das Ergebnis ohne seine Befunde: Deren Meldungen nennen Vorgänge über ihre Kennung (N4, L1). */
  readonly ergebnis: Omit<Bauzeitenplanergebnis, 'befunde'>;
  /** Die Befunde des Ergebnisses mit den Texten der Planseite (Ticket 122, D-122.1); leer: kein Befundabschnitt. */
  readonly befundtexte: readonly Befundtext[];
  readonly projekt?: string;
  readonly datum?: string;
}

const WOCHENTAG: Readonly<Record<Wochentag, string>> = {
  1: 'Mo',
  2: 'Di',
  3: 'Mi',
  4: 'Do',
  5: 'Fr',
  6: 'Sa',
  7: 'So',
};

const vorgangName = (v: Vorgang): string =>
  v.nummer === null ? v.bezeichnung : `${v.nummer} ${v.bezeichnung}`;

/** Tiefe in der Gliederung über `elternId`; ein Zyklus bricht ab (der Plan ist dann schon befundet). */
function tiefe(v: Vorgang, nachId: ReadonlyMap<VorgangId, Vorgang>): number {
  let n = 0;
  const gesehen = new Set<VorgangId>([v.id]);
  for (let e = v.elternId; e !== null;) {
    if (gesehen.has(e)) break;
    gesehen.add(e);
    n++;
    e = nachId.get(e)?.elternId ?? null;
  }
  return n;
}

/**
 * Trenner der Vorgänge im kritischen Weg. Der Pfeil „→“ (U+2192) fehlt im Latin-Teil von Noto Sans und erschien als leeres
 * Kästchen; „›“ (U+203A) ist enthalten.
 */
const WEG_TRENNER = ' › ';

/** Mehr Monate auf der Achse: ein Abschnitt je Jahr, damit die Beschriftung lesbar bleibt. */
const MAX_MONATE = 14;

/** Tag eines Datums `JJJJ-MM-TT` als fortlaufende Zahl (Tage seit 1970-01-01, UTC; keine Uhr, A2). */
function tagNummer(iso: string): number {
  const [j, m, t] = iso.split('-').map(Number);
  return Date.UTC(j ?? 1970, (m ?? 1) - 1, t ?? 1) / 86_400_000;
}

/** Erster Tag eines Monats (`monat` 0 bis 11, darf überlaufen) als Tagnummer. */
const monatsanfang = (jahr: number, monat: number): number => Date.UTC(jahr, monat, 1) / 86_400_000;

/** Die Abschnitte der Achse von `anfang` bis `ende` (Tagnummern, beide eingeschlossen) je Monat oder je Jahr. */
function achse(anfang: string, anfangTag: number, endeTag: number): AchsenAbschnitt[] {
  const n = endeTag - anfangTag + 1;
  const [j0 = 1970, m0 = 1] = anfang.split('-').map(Number);
  const monate: { text: string; von: number; bis: number }[] = [];
  const jahre: { text: string; von: number; bis: number }[] = [];
  for (let i = 0; monatsanfang(j0, m0 - 1 + i) <= endeTag; i++) {
    const a = Math.max(anfangTag, monatsanfang(j0, m0 - 1 + i));
    const b = Math.min(endeTag + 1, monatsanfang(j0, m0 + i));
    const jahr = j0 + Math.floor((m0 - 1 + i) / 12);
    const monat = ((m0 - 1 + i) % 12) + 1;
    monate.push({ text: `${String(monat).padStart(2, '0')}.${String(jahr)}`, von: a, bis: b });
    const letztes = jahre.at(-1);
    if (letztes?.text === String(jahr)) jahre[jahre.length - 1] = { ...letztes, bis: b };
    else jahre.push({ text: String(jahr), von: a, bis: b });
  }
  return (monate.length > MAX_MONATE ? jahre : monate).map((x) => ({
    text: x.text,
    von: (x.von - anfangTag) / n,
    bis: (x.bis - anfangTag) / n,
  }));
}

/** Der Balkenplan: Achse vom Projektbeginn bis zum Projektende (oder weiter, wenn ein Termin darüber hinausgeht). */
function balkenplan(
  plan: Bauzeitenplan,
  ergebnis: BauzeitenplanEingabe['ergebnis'],
  nachId: ReadonlyMap<VorgangId, Vorgang>,
): BerichtBlock[] {
  const termine = ergebnis.vorgaenge.flatMap((r) => (r.termine === null ? [] : [r.termine]));
  const beginn = ergebnis.projektbeginn ?? plan.projektbeginn;
  if (ergebnis.projektende === null || termine.length === 0)
    return [{ art: 'absatz', text: 'Keine Termine berechnet; kein Balkenplan.' }];
  const anfang = [beginn, ...termine.map((t) => t.beginn)].sort()[0] ?? beginn;
  const ende = [ergebnis.projektende, ...termine.map((t) => t.ende)].sort().at(-1) ?? ergebnis.projektende;
  const anfangTag = tagNummer(anfang);
  const n = tagNummer(ende) - anfangTag + 1;
  const ergebnisse = new Map(ergebnis.vorgaenge.map((r) => [r.vorgangId, r]));
  const zeilen = plan.vorgaenge.map((v): BalkenZeile => {
    const r = ergebnisse.get(v.id);
    const t = r?.termine ?? null;
    const stufe = tiefe(v, nachId);
    const kopf = {
      name: vorgangName(v),
      ...(stufe > 0 ? { einrueckung: stufe } : {}),
      ...(r?.art === 'sammelvorgang' ? { fett: true } : {}),
    };
    if (r === undefined || t === null) return { ...kopf, balken: null };
    const von = (tagNummer(t.beginn) - anfangTag) / n;
    if (r.art === 'meilenstein') return { ...kopf, balken: { art: 'meilenstein', von, bis: von } };
    const bis = (tagNummer(t.ende) - anfangTag + 1) / n;
    const art = r.art === 'sammelvorgang' ? 'sammelvorgang' : t.kritisch ? 'kritisch' : 'vorgang';
    return { ...kopf, balken: { art, von, bis } };
  });
  return [
    { art: 'balkenplan', achse: achse(anfang, anfangTag, tagNummer(ende)), zeilen },
    {
      art: 'absatz',
      klein: true,
      text:
        'Balken in Kalendertagen vom Beginn bis zum Ende der frühen Lage; dunkel: auf dem kritischen Weg, schmal: ' +
        'Sammelvorgang, Raute: Meilenstein.',
    },
  ];
}

export function baueBauzeitenplanModell(e: BauzeitenplanEingabe): Berichtsmodell {
  const { plan, ergebnis } = e;
  const nachId = new Map(plan.vorgaenge.map((v) => [v.id, v]));
  const ergebnisse = new Map<VorgangId, Vorgangsergebnis>(ergebnis.vorgaenge.map((r) => [r.vorgangId, r]));
  const hatKinder = new Set(plan.vorgaenge.flatMap((v) => (v.elternId === null ? [] : [v.elternId])));

  const zeilen: BerichtZeile[] = plan.vorgaenge.map((v) => {
    const r = ergebnisse.get(v.id);
    // Ohne Ergebnis (Rechnung abgebrochen) gilt die Art aus dem Plan: Kinder = Sammelvorgang, Dauer 0 = Meilenstein.
    const art = r?.art ?? (hatKinder.has(v.id) ? 'sammelvorgang' : v.dauer === 0 ? 'meilenstein' : 'vorgang');
    const t = r?.termine ?? null;
    return {
      zellen: [
        v.nummer ?? KEINE_ANGABE,
        v.bezeichnung,
        art === 'sammelvorgang' ? KEINE_ANGABE : art === 'meilenstein' ? 'Meilenstein' : String(v.dauer),
        t === null ? KEINE_ANGABE : datumOderStrich(t.beginn),
        t === null ? KEINE_ANGABE : datumOderStrich(t.ende),
        t === null ? KEINE_ANGABE : String(t.gesamtpuffer),
        t === null ? KEINE_ANGABE : t.kritisch ? 'ja' : 'nein',
      ],
      einrueckung: tiefe(v, nachId),
      ...(art === 'sammelvorgang' ? { fett: true } : {}),
    };
  });

  const abschnitte: BerichtAbschnitt[] = [
    {
      ueberschrift: null,
      bloecke: [
        {
          art: 'tabelle',
          spalten: [
            { titel: 'Nr.', breite: 30 },
            { titel: 'Vorgang', breite: '*' },
            { titel: 'Dauer (AT)', breite: 52, rechts: true },
            { titel: 'Beginn', breite: 56, rechts: true },
            { titel: 'Ende', breite: 56, rechts: true },
            { titel: 'Puffer (AT)', breite: 48, rechts: true },
            { titel: 'Kritisch', breite: 38 },
          ],
          zeilen,
        },
      ],
    },
    {
      ueberschrift: 'Balkenplan',
      bloecke: balkenplan(plan, ergebnis, nachId),
    },
    {
      ueberschrift: 'Kritischer Weg',
      bloecke:
        ergebnis.kritischeWege.length === 0
          ? [{ art: 'absatz', text: 'Kein kritischer Weg berechnet.' }]
          : [
              {
                art: 'liste',
                punkte: ergebnis.kritischeWege.map((weg) =>
                  weg
                    .map((id) =>
                      nachId.get(id) === undefined ? KEINE_ANGABE : vorgangName(nachId.get(id) as Vorgang),
                    )
                    .join(WEG_TRENNER),
                ),
              },
            ],
    },
  ];

  const mitIst = plan.vorgaenge.filter((v) => v.ist !== null).length;
  if (mitIst > 0)
    abschnitte.push({
      ueberschrift: null,
      bloecke: [
        {
          art: 'absatz',
          klein: true,
          text: `[Ist-Termine] Für ${String(mitIst)} Vorgänge sind Ist-Termine oder ein Fortschritt erfasst; sie stehen nicht in dieser Tabelle.`,
        },
      ],
    });
  if (e.befundtexte.length > 0)
    abschnitte.push({
      ueberschrift: 'Befunde',
      bloecke: [{ art: 'liste', punkte: e.befundtexte.map(befundZeile) }],
    });

  const k = plan.kalender;
  return {
    titel: `Bauzeitenplan: ${plan.name}`,
    kopf: [
      ...(e.projekt === undefined ? [] : [{ bezeichnung: 'Projekt', wert: e.projekt }]),
      { bezeichnung: 'Projektbeginn', wert: datumOderStrich(ergebnis.projektbeginn ?? plan.projektbeginn) },
      { bezeichnung: 'Projektende', wert: datumOderStrich(ergebnis.projektende) },
      {
        bezeichnung: 'Arbeitskalender',
        wert: `${k.arbeitstage.map((t) => WOCHENTAG[t]).join(', ')}${k.bundesland === null ? '' : `, Feiertage ${k.bundesland}`}${k.freieTage.length === 0 ? '' : `, ${String(k.freieTage.length)} freie Tage`}`,
      },
    ],
    ...druckdatum(e.datum),
    abschnitte,
  };
}
