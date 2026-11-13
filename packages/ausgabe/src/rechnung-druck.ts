// SPDX-License-Identifier: AGPL-3.0-or-later
// Rechnungsprüfung als Berichtsmodell (Ticket 141, E11; Glossar „Rechnungsprüfung / Abzugskette“, „Zahlbetrag / Freigabe“):
// die abgerechneten Aufmaßblätter, der Leistungsstand je Position, die Abzugskette nach D-34 Zeile für Zeile bis zum
// Zahlbetrag, der Vergleich mit der Forderung, die Befunde und die Freigabe. Alle Beträge rechnet `abrechnung`
// (`rechnungPruefen`), die App reicht das Ergebnis durch (A2). Die Zeilen nach dem Zahlbetrag (Skonto, Bauabzugsteuer,
// Zahlungen; A5, D-72) gehören nicht hierher.

import { formatiereProzentDe, vorzeichen } from '@tethys/dezimal';
import type {
  AufmassKopf,
  AuftragsLvZustand,
  Betrag,
  Buero,
  Druckprofil,
  Leistungsstand,
  Prozent,
  Rechnung,
  RechnungId,
} from '@tethys/vertrag';
import { ozText, positionenInReihenfolge } from './aufmass-druck';
import {
  KEINE_ANGABE,
  befundZeile,
  berichtSeite,
  betragFeld,
  datumOderStrich,
  druckdatum,
  euro,
  wert,
  zelle,
} from './bericht';
import type { BerichtAbschnitt, BerichtFeld, BerichtWert, Befundtext, Berichtsmodell } from './bericht';
import { Kopffelder, absenderZeilen, projektFelder, verbinde } from './koepfe';
import type { ProjektKopf } from './koepfe';

/** Eine Forderungsdifferenz: gefordert − geprüft (D-44). */
interface Forderungsdifferenz {
  readonly gefordert: Betrag;
  readonly geprueft: Betrag;
  readonly differenz: Betrag;
}

/** Was der Druck aus `Rechnungspruefung` von `abrechnung` liest (gleich gebaut; Fachpakete importieren einander nicht, A3). */
interface Pruefdaten {
  readonly leistungsstand: Leistungsstand;
  readonly kette: {
    readonly leistung: Betrag;
    readonly nachlass: Betrag;
    readonly nettoNachNachlass: Betrag;
    readonly mwst: Betrag;
    readonly bruttoKumuliert: Betrag;
    readonly umlagen: readonly {
      readonly bezeichnung: string;
      readonly satz: Prozent;
      readonly betrag: Betrag;
    }[];
    readonly einbehalt: {
      readonly art: 'sicherheit' | 'gewaehrleistung';
      readonly satz: Prozent | null;
      readonly betrag: Betrag;
    };
    readonly fruehere: readonly {
      readonly rechnungId: RechnungId;
      readonly nummer: number;
      readonly zahlbetrag: Betrag;
    }[];
    readonly fruehereZahlbetraege: Betrag;
    readonly zahlbetrag: Betrag;
  };
  readonly forderung: {
    readonly netto: Forderungsdifferenz | null;
    readonly brutto: Forderungsdifferenz | null;
    readonly zahlbetrag: Forderungsdifferenz | null;
  } | null;
}

export interface RechnungspruefungEingabe {
  readonly rechnung: Rechnung;
  /** Das Auftrags-LV der Rechnung (OZ, Kurztext, Einheit, Vertrags-EP, MwSt-Satz, Nachlass, Auftragnehmer). */
  readonly auftragsLv: AuftragsLvZustand;
  readonly pruefung: Pruefdaten;
  /** Die Köpfe der Aufmaßblätter des Auftrags-LV (Nummer, Bezeichnung, Datum) für die Liste der abgerechneten Blätter. */
  readonly aufmasse?: readonly AufmassKopf[];
  /** Die Befunde der Prüfung mit den Texten der Seite; leer oder fehlt: kein Abschnitt. */
  readonly befundtexte?: readonly Befundtext[];
  readonly projekt?: ProjektKopf;
  readonly buero?: Buero | null;
  /** Druckdatum `JJJJ-MM-TT`. */
  readonly datum?: string;
  readonly druckprofil?: Druckprofil;
}

const RECHNUNGSART = { abschlag: 'Abschlagsrechnung', schluss: 'Schlussrechnung' } as const;
const satzText = (s: Prozent): string => `${formatiereProzentDe(s)} %`;

/** Ein Abzug der Kette: Betrag mit Minuszeichen (U+2212), wenn er etwas abzieht. */
const abzug = (bezeichnung: string, b: Betrag): BerichtFeld => ({
  bezeichnung,
  wert: vorzeichen(b) > 0 ? `−${euro(b)}` : euro(b),
});

export function baueRechnungspruefungModell(e: RechnungspruefungEingabe): Berichtsmodell {
  const r = e.rechnung;
  const alv = e.auftragsLv.auftragsLeistungsverzeichnis;
  const { kette, leistungsstand } = e.pruefung;

  // --- Abgerechnete Blätter ---
  const blaetter = new Map((e.aufmasse ?? []).map((a) => [a.id as string, a]));
  const bekannte = r.aufmassIds
    .flatMap((id) => {
      const a = blaetter.get(id);
      return a === undefined ? [] : [a];
    })
    .sort((a, b) => a.nummer - b.nummer);
  const unbekannt = r.aufmassIds.filter((id) => !blaetter.has(id)).length;
  const blattAbschnitt: BerichtAbschnitt = {
    ueberschrift: 'Abgerechnete Aufmaßblätter',
    bloecke:
      r.aufmassIds.length === 0
        ? [{ art: 'absatz', text: 'Noch kein Aufmaßblatt abgerechnet.' }]
        : [
            {
              art: 'liste',
              punkte: [
                ...bekannte.map(
                  (a) =>
                    `Blatt ${String(a.nummer)}: ${a.bezeichnung.trim() === '' ? KEINE_ANGABE : a.bezeichnung}` +
                    (a.datum === null ? '' : ` (${datumOderStrich(a.datum)})`),
                ),
                ...Array.from(
                  { length: unbekannt },
                  () => 'Ein Blatt, das es nicht mehr gibt (nicht gezählt)',
                ),
              ],
            },
          ],
  };

  // --- Leistungsstand: aufgemessene Positionen ---
  const stand = new Map(leistungsstand.positionen.map((p) => [p.positionId as string, p]));
  const leistungsZeilen = positionenInReihenfolge(alv.knoten, alv.id).flatMap((k) => {
    const p = stand.get(k.id);
    if (k.art !== 'position' || p === undefined || (p.menge === null && vorzeichen(p.gp) === 0)) return [];
    const ep: BerichtWert =
      k.zuschlag !== null
        ? { text: k.zuschlag.prozentsatz === null ? 'kein Satz' : satzText(k.zuschlag.prozentsatz) }
        : wert.einheitspreis(k.einheitspreis);
    return [
      {
        zellen: [
          ozText(k),
          k.kurztext,
          zelle(wert.menge(p.menge)),
          k.einheit ?? '',
          zelle(ep),
          zelle(wert.betrag(p.gp)),
        ],
      },
    ];
  });
  const leistungAbschnitt: BerichtAbschnitt = {
    ueberschrift: 'Leistungsstand je Position',
    bloecke: [
      {
        art: 'tabelle',
        spalten: [
          { titel: 'OZ', breite: 50 },
          { titel: 'Kurztext', breite: '*' },
          { titel: 'Menge kumuliert', breite: 56, rechts: true },
          { titel: 'Einh.', breite: 26 },
          { titel: 'EP', breite: 56, rechts: true },
          { titel: 'GP', breite: 60, rechts: true },
        ],
        zeilen: [
          ...leistungsZeilen,
          {
            fett: true,
            zellen: ['', 'Leistung (kumuliert)', '', '', '', zelle(wert.betrag(leistungsstand.leistung))],
          },
        ],
      },
      {
        art: 'absatz',
        klein: true,
        text: 'Beträge in €. Menge: Summe der abgerechneten Aufmaßblätter; Positionen ohne Aufmaß sind nicht aufgeführt.',
      },
    ],
  };

  // --- Abzugskette (D-34) ---
  const nachlass = alv.nachlass;
  const einbehalt = kette.einbehalt;
  const einbehaltName = einbehalt.art === 'sicherheit' ? 'Sicherheitseinbehalt' : 'Gewährleistungseinbehalt';
  const ketteAbschnitt: BerichtAbschnitt = {
    ueberschrift: 'Abzugskette',
    bloecke: [
      {
        art: 'felder',
        felder: [
          betragFeld('Leistung (kumuliert)', kette.leistung),
          nachlass?.art === 'prozent'
            ? abzug(`Nachlass (${satzText(nachlass.wert)})`, kette.nachlass)
            : abzug('Nachlass', kette.nachlass),
          betragFeld('Netto nach Nachlass', kette.nettoNachNachlass),
          betragFeld(`MwSt ${satzText(alv.mwstSatz)}`, kette.mwst),
          betragFeld('Brutto kumuliert', kette.bruttoKumuliert),
          ...kette.umlagen.map((u) => abzug(`Umlage ${u.bezeichnung} (${satzText(u.satz)})`, u.betrag)),
          abzug(
            einbehalt.satz === null
              ? `${einbehaltName} (kein Satz)`
              : `${einbehaltName} (${satzText(einbehalt.satz)})`,
            einbehalt.betrag,
          ),
          ...kette.fruehere.map((f) =>
            abzug(`Zahlbetrag Rechnung ${String(f.nummer)} (freigegeben)`, f.zahlbetrag),
          ),
          betragFeld('Zahlbetrag', kette.zahlbetrag, true),
        ],
      },
      {
        art: 'absatz',
        klein: true,
        text:
          'Jeder Schritt ist auf 2 Stellen gerundet. Umlagen und Einbehalt beziehen sich auf das Brutto kumuliert; ' +
          'die Zahlbeträge früherer Rechnungen sind die bei ihrer Freigabe eingefrorenen.',
      },
    ],
  };

  // --- Forderung ---
  const f = e.pruefung.forderung;
  const vergleich = (bezeichnung: string, d: Forderungsdifferenz | null) =>
    d === null
      ? []
      : [
          {
            zellen: [
              bezeichnung,
              zelle(wert.betrag(d.gefordert)),
              zelle(wert.betrag(d.geprueft)),
              zelle(wert.betrag(d.differenz)),
            ],
          },
        ];
  const forderungAbschnitt: BerichtAbschnitt[] =
    f === null
      ? []
      : [
          {
            ueberschrift: 'Gefordert und geprüft',
            bloecke: [
              {
                art: 'tabelle',
                spalten: [
                  { titel: '', breite: '*' },
                  { titel: 'Gefordert', breite: 70, rechts: true },
                  { titel: 'Geprüft', breite: 70, rechts: true },
                  { titel: 'Differenz', breite: 70, rechts: true },
                ],
                zeilen: [
                  ...vergleich('Netto (kumuliert)', f.netto),
                  ...vergleich('Brutto (kumuliert)', f.brutto),
                  ...vergleich('Zahlbetrag', f.zahlbetrag),
                ],
              },
              {
                art: 'absatz',
                klein: true,
                text: 'Beträge in €. Differenz: gefordert minus geprüft. Verglichen wird bevorzugt der Zahlbetrag.',
              },
            ],
          },
        ];

  const befunde = e.befundtexte ?? [];
  const freigabe: BerichtAbschnitt = {
    ueberschrift: 'Freigabe',
    bloecke: [
      r.freigabe === null
        ? { art: 'absatz', text: 'Die Rechnung ist noch nicht freigegeben.' }
        : {
            art: 'felder',
            felder: [betragFeld('Freigegebener Zahlbetrag (eingefroren)', r.freigabe.zahlbetrag, true)],
          },
      { art: 'absatz', text: 'Sachlich und rechnerisch richtig: ______________________________' },
      { art: 'absatz', text: 'Datum, Unterschrift: ______________________________' },
    ],
  };

  const deckblatt = e.druckprofil?.deckblatt ?? true;
  const kopf = new Kopffelder()
    .feld('Rechnung', `${RECHNUNGSART[r.art]} ${String(r.nummer)}`)
    .feld('Rechnungsnummer des Auftragnehmers', r.rechnungsnummerAuftragnehmer)
    .feld('Eingang', r.eingang === null ? null : datumOderStrich(r.eingang))
    .feld('Auftrags-LV', alv.name);
  if (deckblatt) {
    const an = alv.auftragnehmer;
    if (an) kopf.feld('Auftragnehmer', verbinde([an.name, an.strasse, verbinde([an.plz, an.ort], ' ')]));
    kopf.felder.push(...projektFelder(e.projekt));
  }
  return {
    titel: `Rechnungsprüfung: ${RECHNUNGSART[r.art]} ${String(r.nummer)}`,
    absender: deckblatt ? absenderZeilen(e.buero) : [],
    kopf: kopf.felder,
    ...druckdatum(e.datum),
    seite: berichtSeite(e.druckprofil, 'hoch', alv.name),
    abschnitte: [
      blattAbschnitt,
      leistungAbschnitt,
      ketteAbschnitt,
      ...forderungAbschnitt,
      ...(befunde.length === 0
        ? []
        : [
            {
              ueberschrift: 'Befunde',
              bloecke: [{ art: 'liste' as const, punkte: befunde.map(befundZeile) }],
            },
          ]),
      freigabe,
    ],
  };
}
