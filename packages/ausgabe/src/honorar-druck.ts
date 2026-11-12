// SPDX-License-Identifier: AGPL-3.0-or-later
// Honorarberechnung als Berichtsmodell (X3, Ticket 113). Alle Beträge kommen aus dem `Honorarergebnis` des Pakets `honorar`
// (A2: hier wird nichts gerechnet); gedruckt wird die Herleitung Schritt für Schritt, damit man sie nachrechnen kann.

import type {
  Honorarberechnung,
  Honorarergebnis,
  Honorarobjekt,
  Honorarzone,
  Leistungsbild,
  Objektergebnis,
} from '@tethys/vertrag';
import { KEINE_ANGABE, befundZeile, druckdatum, euro, prozent } from './bericht';
import type { BerichtAbschnitt, BerichtBlock, Befundtext, Berichtsmodell } from './bericht';

export interface HonorarEingabe {
  readonly berechnung: Honorarberechnung;
  /** Das Ergebnis ohne seine Befunde: Deren Meldungen sind nicht für den Druck formatiert (N4). */
  readonly ergebnis: Omit<Honorarergebnis, 'befunde'>;
  /** Die Befunde des Ergebnisses mit den Texten der Seite (Ticket 122, D-122.1); leer: kein Befundabschnitt. */
  readonly befundtexte: readonly Befundtext[];
  readonly projekt?: string;
  readonly datum?: string;
}

/** Fester Hinweis (D-56, D-66): Er ist kein Befund und nicht Teil des `Honorarergebnis`. */
export const DIN276_HINWEIS =
  'Hinweis: § 4 Abs. 1 HOAI verweist für die anrechenbaren Kosten auf DIN 276 in der Fassung DIN 276:2008-12. ' +
  'Die Kostenermittlung muss nach dieser Fassung gegliedert sein.';

const LEISTUNGSBILD: Readonly<Record<Leistungsbild, string>> = {
  gebaeude: 'Gebäude',
  innenraeume: 'Innenräume',
  freianlagen: 'Freianlagen',
  ingenieurbauwerke: 'Ingenieurbauwerke',
  verkehrsanlagen: 'Verkehrsanlagen',
  tragwerksplanung: 'Tragwerksplanung',
  'technische-ausruestung': 'Technische Ausrüstung',
};

function objektAbschnitt(
  nr: number,
  o: Objektergebnis,
  eingabe: Honorarobjekt | undefined,
): BerichtAbschnitt {
  const zone: Honorarzone = o.honorarzone;
  const bloecke: BerichtBlock[] = [
    {
      art: 'angaben',
      felder: [
        { bezeichnung: 'Leistungsbild', wert: LEISTUNGSBILD[o.leistungsbild] },
        { bezeichnung: 'Honorarzone', wert: zone },
        {
          bezeichnung: 'Honorarsatz',
          wert: eingabe === undefined ? KEINE_ANGABE : prozent(eingabe.honorarsatz),
        },
      ],
    },
  ];

  const h = o.herleitung;
  if (h !== null) {
    bloecke.push({
      art: 'felder',
      felder: [
        { bezeichnung: 'KG 300 Bauwerk – Baukonstruktionen', wert: euro(h.kg300) },
        { bezeichnung: 'Weitere Kosten', wert: euro(h.weitereKosten) },
        { bezeichnung: 'Sonstige anrechenbare Kosten', wert: euro(h.sonstigeAnrechenbareKosten) },
        { bezeichnung: 'KG 400 Bauwerk – Technische Anlagen', wert: euro(h.kg400) },
        {
          bezeichnung: 'Grenze Technische Anlagen (25 % der sonstigen anrechenbaren Kosten)',
          wert: euro(h.grenzeTechnischeAnlagen),
        },
        { bezeichnung: 'KG 400 bis zur Grenze, voll angerechnet', wert: euro(h.kg400Voll) },
        { bezeichnung: 'KG 400 über der Grenze, zur Hälfte angerechnet', wert: euro(h.kg400Haelfte) },
        { bezeichnung: 'Mitzuverarbeitende Bausubstanz', wert: euro(h.mitzuverarbeitendeBausubstanz) },
        { bezeichnung: 'Anrechenbare Kosten', wert: euro(h.anrechenbareKosten), fett: true },
      ],
    });
  } else if (o.anrechenbareKosten !== null) {
    bloecke.push({
      art: 'felder',
      felder: [{ bezeichnung: 'Anrechenbare Kosten (Betrag)', wert: euro(o.anrechenbareKosten), fett: true }],
    });
  } else {
    bloecke.push({ art: 'absatz', text: 'Anrechenbare Kosten: nicht berechnet (siehe Befunde).' });
  }

  const t = o.tafel;
  if (t !== null) {
    const spanneUnten = t.zeileUnten.spannen[zone];
    const spanneOben = t.zeileOben.spannen[zone];
    const zeile = (kosten: string, von: string, bis: string) => ({ zellen: [kosten, von, bis] });
    bloecke.push({
      art: 'tabelle',
      spalten: [
        { titel: 'Honorartafel, Anrechenbare Kosten', breite: '*' },
        { titel: `Zone ${zone} von`, breite: 90, rechts: true },
        { titel: `Zone ${zone} bis`, breite: 90, rechts: true },
      ],
      zeilen: [
        zeile(
          `Tafelwert unten ${euro(t.zeileUnten.anrechenbareKosten)}`,
          spanneUnten === undefined ? KEINE_ANGABE : euro(spanneUnten.von),
          spanneUnten === undefined ? KEINE_ANGABE : euro(spanneUnten.bis),
        ),
        zeile(
          `Tafelwert oben ${euro(t.zeileOben.anrechenbareKosten)}`,
          spanneOben === undefined ? KEINE_ANGABE : euro(spanneOben.von),
          spanneOben === undefined ? KEINE_ANGABE : euro(spanneOben.bis),
        ),
        { ...zeile('Interpolierte Spanne', euro(t.spanne.von), euro(t.spanne.bis)), fett: true },
      ],
    });
  }

  if (o.honorar === null) bloecke.push({ art: 'absatz', text: 'Honorar: nicht berechnet (siehe Befunde).' });
  else
    bloecke.push({
      art: 'felder',
      felder: [
        {
          bezeichnung: `Honorar in der Spanne (Honorarsatz ${eingabe === undefined ? KEINE_ANGABE : prozent(eingabe.honorarsatz)})`,
          wert: euro(o.honorar),
          fett: true,
        },
      ],
    });

  if (o.phasen.length > 0)
    bloecke.push({
      art: 'tabelle',
      spalten: [
        { titel: 'LP', breite: 24 },
        { titel: 'Leistungsphase', breite: '*' },
        { titel: 'Anteil', breite: 50, rechts: true },
        { titel: 'Honorar', breite: 80, rechts: true },
      ],
      zeilen: o.phasen.map((p) => ({
        zellen: [String(p.nummer), p.name, prozent(p.anteil), euro(p.betrag)],
      })),
    });

  bloecke.push({
    art: 'felder',
    felder: [
      { bezeichnung: 'Grundhonorar (Summe der Phasen)', wert: euro(o.grundhonorar), fett: true },
      ...(eingabe?.umbauzuschlagssatz == null
        ? []
        : [
            {
              bezeichnung: `Umbauzuschlag ${prozent(eingabe.umbauzuschlagssatz)}`,
              wert: euro(o.umbauzuschlag),
            },
          ]),
    ],
  });
  return { ueberschrift: `Objekt ${String(nr)}: ${o.bezeichnung}`, bloecke };
}

export function baueHonorarModell(e: HonorarEingabe): Berichtsmodell {
  const { berechnung: b, ergebnis: r } = e;
  const nk = b.nebenkosten;
  const nebenkostenLabel =
    nk === null
      ? 'Nebenkosten'
      : nk.art === 'prozent'
        ? `Nebenkosten (${prozent(nk.satz)} des Honorars)`
        : 'Nebenkosten (Betrag)';
  const abschnitte: BerichtAbschnitt[] = [
    ...r.objekte.map((o, i) => objektAbschnitt(i + 1, o, b.objekte[i])),
    {
      ueberschrift: 'Gesamt',
      bloecke: [
        {
          art: 'felder',
          felder: [
            { bezeichnung: 'Grundhonorare', wert: euro(r.grundhonorar) },
            { bezeichnung: 'Umbauzuschläge', wert: euro(r.umbauzuschlaege) },
            { bezeichnung: nebenkostenLabel, wert: euro(r.nebenkosten) },
            { bezeichnung: 'Netto', wert: euro(r.netto), fett: true },
            { bezeichnung: `Umsatzsteuer ${prozent(b.mwstSatz)}`, wert: euro(r.mwst) },
            { bezeichnung: 'Brutto', wert: euro(r.brutto), fett: true },
          ],
        },
      ],
    },
    ...(e.befundtexte.length === 0
      ? []
      : [
          {
            ueberschrift: 'Befunde',
            bloecke: [{ art: 'liste' as const, punkte: e.befundtexte.map(befundZeile) }],
          },
        ]),
    { ueberschrift: 'Hinweise', bloecke: [{ art: 'absatz', text: DIN276_HINWEIS }] },
  ];
  return {
    titel: 'Honorarberechnung',
    kopf: [
      ...(e.projekt === undefined ? [] : [{ bezeichnung: 'Projekt', wert: e.projekt }]),
      { bezeichnung: 'Berechnung', wert: b.name },
    ],
    ...druckdatum(e.datum),
    abschnitte,
  };
}
