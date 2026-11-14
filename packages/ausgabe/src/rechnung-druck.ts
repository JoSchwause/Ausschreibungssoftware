// SPDX-License-Identifier: AGPL-3.0-or-later
// Rechnungsprüfung als Berichtsmodell (Ticket 141, E11; Glossar „Rechnungsprüfung / Abzugskette“, „Zahlbetrag / Freigabe“):
// die abgerechneten Aufmaßblätter, der Leistungsstand je Position, die Abzugskette nach D-34 Zeile für Zeile bis zum
// Zahlbetrag, der Vergleich mit der Forderung, die Befunde und die Freigabe. Alle Beträge rechnet `abrechnung`
// (`rechnungPruefen`), die App reicht das Ergebnis durch (A2). Ticket 153 (A5, D-72): die Vertragsstrafe in der Kette und
// nach dem Zahlbetrag die Zahlungsfreigabe mit beiden Fällen des Skontos, der Bauabzugsteuer „an das Finanzamt“, der
// Auszahlung, den Zahlungen und dem offenen Betrag (`Zahlungsstand` aus `vertrag`).

import { formatiereBetragDe, formatiereProzentDe, vorzeichen } from '@tethys/dezimal';
import { BAUABZUGSTEUER_SATZ } from '@tethys/vertrag';
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
  Zahlungsstand,
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
import type {
  BerichtAbschnitt,
  BerichtBlock,
  BerichtFeld,
  BerichtWert,
  BerichtZeile,
  Befundtext,
  Berichtsmodell,
} from './bericht';
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
    /** Vertragsstrafe (brutto, kumuliert; D-72, D-128.3), 0,00 ohne; fehlt bei einer Kette vor A5. */
    readonly vertragsstrafe?: Betrag;
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
  /** Der Teil nach dem Zahlbetrag (A5, D-72); fehlt: keine Zahlungsfreigabe im Druck (wie vor A5). */
  readonly zahlungsstand?: Zahlungsstand;
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

const BAUABZUGSTEUER = `Bauabzugsteuer ${satzText(BAUABZUGSTEUER_SATZ)} an das Finanzamt`;
const AUSZAHLUNG = 'Auszahlung an den Auftragnehmer';

/** Ein Abzug in einer Tabellenzelle: Betrag ohne „€“, mit Minuszeichen (U+2212), wenn er etwas abzieht. */
const abzugWert = (b: Betrag): BerichtWert => ({
  text: vorzeichen(b) > 0 ? `−${formatiereBetragDe(b)}` : formatiereBetragDe(b),
});

/**
 * Die Zahlungsfreigabe nach D-72: beide Fälle des Skontos (wenn es ein Fristende gibt), dann der geltende Fall bis zum
 * offenen Betrag und die Zahlungen nach Datum. Skonto und Bauabzugsteuer mindern nur die Auszahlung, nie den Zahlbetrag.
 */
function zahlungsfreigabe(r: Rechnung, zs: Zahlungsstand): BerichtBlock[] {
  const bloecke: BerichtBlock[] = [];
  const steuer = r.bauabzugsteuer === true;
  const skonto = r.skonto;
  if (skonto !== undefined && zs.fristende !== null) {
    const bis = datumOderStrich(zs.fristende);
    const fall = (bezeichnung: string, mit: BerichtWert, ohne: BerichtWert, fett = false): BerichtZeile => ({
      zellen: [bezeichnung, zelle(mit), zelle(ohne)],
      ...(fett ? { fett: true } : {}),
    });
    bloecke.push(
      {
        art: 'tabelle',
        spalten: [
          { titel: '', breite: '*' },
          { titel: `Bei Zahlung bis ${bis}`, breite: 110, rechts: true },
          { titel: 'Danach', breite: 80, rechts: true },
        ],
        zeilen: [
          fall('Zahlbetrag', wert.betrag(zs.zahlbetrag), wert.betrag(zs.zahlbetrag)),
          fall(
            `Skonto (${satzText(skonto.satz)})`,
            abzugWert(zs.mitSkonto.skonto),
            abzugWert(zs.ohneSkonto.skonto),
          ),
          ...(steuer
            ? [
                fall(
                  BAUABZUGSTEUER,
                  abzugWert(zs.mitSkonto.bauabzugsteuer),
                  abzugWert(zs.ohneSkonto.bauabzugsteuer),
                ),
              ]
            : []),
          fall(AUSZAHLUNG, wert.betrag(zs.mitSkonto.auszahlung), wert.betrag(zs.ohneSkonto.auszahlung), true),
        ],
      },
      {
        art: 'absatz',
        text: `Bei Zahlung bis ${bis}: Auszahlung ${euro(zs.mitSkonto.auszahlung)}, danach: ${euro(zs.ohneSkonto.auszahlung)}.`,
      },
    );
  } else if (skonto !== undefined)
    bloecke.push({
      art: 'absatz',
      text: `Skonto ${satzText(skonto.satz)} vereinbart, aber ohne Eingangsdatum gibt es keine Skontofrist und keinen Skonto.`,
    });

  bloecke.push({
    art: 'felder',
    felder: [
      betragFeld(
        r.freigabe === null ? 'Zahlbetrag (geprüft, noch nicht freigegeben)' : 'Zahlbetrag (eingefroren)',
        zs.zahlbetrag,
      ),
      ...(skonto === undefined
        ? []
        : [
            abzug(
              zs.skontoVerwirklicht ? 'Skonto (verwirklicht)' : 'Skonto (nicht verwirklicht)',
              zs.verwirklichterSkonto,
            ),
          ]),
      ...(steuer ? [abzug(BAUABZUGSTEUER, zs.bauabzugsteuer)] : []),
      betragFeld(AUSZAHLUNG, zs.auszahlung, true),
      abzug('Summe der Zahlungen', zs.summeZahlungen),
      betragFeld('Offen', zs.offen, true),
    ],
  });

  const zahlungen = [...(r.zahlungen ?? [])].sort((a, b) =>
    a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0,
  );
  bloecke.push(
    zahlungen.length === 0
      ? { art: 'absatz', text: 'Noch keine Zahlung erfasst.' }
      : {
          art: 'liste',
          punkte: zahlungen.map((z) => `Zahlung vom ${datumOderStrich(z.datum)}: ${euro(z.betrag)}`),
        },
    {
      art: 'absatz',
      klein: true,
      text:
        'Skonto und Bauabzugsteuer mindern nur die Auszahlung, nicht den Zahlbetrag. Der Skonto ist verwirklicht, wenn die ' +
        'Zahlungen bis zum Ende der Skontofrist die Auszahlung mit Skonto erreichen. Die Bauabzugsteuer (§ 48 EStG) geht an ' +
        'das Finanzamt; Grundlage ist der Zahlbetrag nach Skonto. Offen: Auszahlung minus Summe der Zahlungen.',
    },
  );
  return bloecke;
}

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
          ...(r.vertragsstrafe !== undefined ||
          (kette.vertragsstrafe !== undefined && vorzeichen(kette.vertragsstrafe) !== 0)
            ? [
                abzug(
                  r.vertragsstrafe === undefined
                    ? 'Vertragsstrafe'
                    : `Vertragsstrafe (${r.vertragsstrafe.grund})`,
                  kette.vertragsstrafe ?? r.vertragsstrafe?.betrag ?? ('0.00' as Betrag),
                ),
              ]
            : []),
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
          (r.vertragsstrafe === undefined
            ? ''
            : 'die Vertragsstrafe ist ein Bruttobetrag ohne MwSt, kumuliert bis zu dieser Rechnung; ') +
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
  const freigabeStand: BerichtBlock =
    r.freigabe === null
      ? { art: 'absatz', text: 'Die Rechnung ist noch nicht freigegeben.' }
      : {
          art: 'felder',
          felder: [betragFeld('Freigegebener Zahlbetrag (eingefroren)', r.freigabe.zahlbetrag, true)],
        };
  const unterschrift: BerichtBlock[] = [
    { art: 'absatz', text: 'Sachlich und rechnerisch richtig: ______________________________' },
    { art: 'absatz', text: 'Datum, Unterschrift: ______________________________' },
  ];
  const zs = e.pruefung.zahlungsstand;
  // Ohne Zahlungsstand wie vor A5: Freigabe mit den Unterschriftszeilen.
  const schluss: BerichtAbschnitt[] =
    zs === undefined
      ? [{ ueberschrift: 'Freigabe', bloecke: [freigabeStand, ...unterschrift] }]
      : [
          { ueberschrift: 'Freigabe', bloecke: [freigabeStand] },
          { ueberschrift: 'Zahlungsfreigabe', bloecke: zahlungsfreigabe(r, zs) },
          { ueberschrift: null, bloecke: unterschrift },
        ];
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
      ...schluss,
    ],
  };
}
