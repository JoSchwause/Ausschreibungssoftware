// SPDX-License-Identifier: AGPL-3.0-or-later
// Bauzeitenplan als Tabelle (X2, Ticket 113): Nummer, Vorgang, Dauer, Beginn, Ende, Puffer, kritisch; dazu Projektende und
// kritischer Weg. Die Termine kommen aus dem `Bauzeitenplanergebnis` (A2: nichts wird hier gerechnet), ohne Balken.

import type {
  Bauzeitenplan,
  Bauzeitenplanergebnis,
  Vorgang,
  VorgangId,
  Vorgangsergebnis,
  Wochentag,
} from '@tethys/vertrag';
import { KEINE_ANGABE, datumOderStrich, druckdatum } from './bericht';
import type { BerichtAbschnitt, BerichtZeile, Berichtsmodell } from './bericht';

export interface BauzeitenplanEingabe {
  readonly plan: Bauzeitenplan;
  readonly ergebnis: Bauzeitenplanergebnis;
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
                    .join(' → '),
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
  if (ergebnis.befunde.length > 0)
    abschnitte.push({
      ueberschrift: 'Befunde',
      bloecke: [
        {
          art: 'liste',
          punkte: ergebnis.befunde.map(
            (b) => `${b.schwere === 'fehler' ? 'Fehler' : 'Warnung'}: ${b.meldung}`,
          ),
        },
      ],
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
