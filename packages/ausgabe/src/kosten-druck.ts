// SPDX-License-Identifier: AGPL-3.0-or-later
// Kostenermittlung und Kostenkontrolle als Berichtsmodell (Ticket 153, E12; Glossar „Kostenermittlung“,
// „Kostenkontrolle“): je Kostengruppe in der Ordnung der Nummern, mit der Bezeichnung des Nutzers, wo eine vorliegt (G-16),
// durchgehend netto. In der Kostenkontrolle stehen „ohne Kostengruppe“ und der Nachlass als eigene Zeilen vor dem Gesamt,
// der Nachlass wird nicht verteilt (D-37). Alle Beträge rechnet `kosten`, die App reicht das Ergebnis durch (A2).

import { vorzeichen } from '@tethys/dezimal';
import type {
  Betrag,
  Buero,
  Druckprofil,
  Kostenermittlungseintrag,
  Kostenermittlungsstufe,
  Kostengruppenbezeichnung,
  Kostengruppennummer,
} from '@tethys/vertrag';
import { KEINE_ANGABE, berichtSeite, druckdatum, wert, zelle } from './bericht';
import type { BerichtAbschnitt, BerichtSpalte, BerichtZeile, BerichtZelle, Berichtsmodell } from './bericht';
import { Kopffelder, absenderZeilen, projektFelder } from './koepfe';
import type { ProjektKopf } from './koepfe';

/** Die Stufen nach DIN 276 als Text (Glossar „Kostenermittlungsstufe“). */
export const KOSTENERMITTLUNGSSTUFE_TEXT: Readonly<Record<Kostenermittlungsstufe, string>> = {
  kostenrahmen: 'Kostenrahmen',
  kostenschaetzung: 'Kostenschätzung',
  kostenberechnung: 'Kostenberechnung',
  kostenanschlag: 'Kostenanschlag',
  kostenfeststellung: 'Kostenfeststellung',
};

/** Gemeinsame Angaben im Kopf beider Berichte. */
interface KostenKopfEingabe {
  /** Die Bezeichnungen der Kostengruppen aus den Einstellungen (G-16); fehlt eine Nummer, bleibt die Zelle leer. */
  readonly bezeichnungen?: readonly Kostengruppenbezeichnung[];
  readonly projekt?: ProjektKopf;
  readonly buero?: Buero | null;
  /** Druckdatum `JJJJ-MM-TT`. */
  readonly datum?: string;
  readonly druckprofil?: Druckprofil;
}

// --- Kostenermittlung --------------------------------------------------------------------------------------------

/**
 * Was der Druck aus `Kostenermittlungsergebnis` von `kosten` liest (gleich gebaut; Fachpakete importieren einander nicht,
 * A3).
 */
interface KostenermittlungDaten {
  readonly gruppen: readonly {
    readonly nummer: Kostengruppennummer;
    readonly ebene: number;
    readonly eigenerBetrag: Betrag | null;
    readonly summe: Betrag;
  }[];
  readonly gesamtsumme: Betrag;
}

export interface KostenermittlungEingabe extends KostenKopfEingabe {
  /** Die gespeicherte Kostenermittlung (Name, Stufe, Bemerkungen der Einträge); eine `Kostenermittlung` passt unverändert. */
  readonly kostenermittlung: {
    readonly name: string;
    readonly stufe: Kostenermittlungsstufe;
    readonly eintraege: readonly Kostenermittlungseintrag[];
  };
  /** Das Ergebnis von `kostenermittlungBerechnen` zu den Einträgen. */
  readonly ergebnis: KostenermittlungDaten;
}

const kgSpalten = (titel: readonly string[]): BerichtSpalte[] => [
  { titel: 'KG', breite: 34 },
  { titel: 'Bezeichnung', breite: '*' },
  ...titel.map((t): BerichtSpalte => ({ titel: t, breite: 74, rechts: true })),
];

const bezeichnungenAlsMap = (b: readonly Kostengruppenbezeichnung[] | undefined): Map<string, string> =>
  new Map((b ?? []).map((x) => [x.nummer as string, x.bezeichnung]));

function kostenKopf(
  e: KostenKopfEingabe,
  titel: string,
  lv: string,
  kopf: Kopffelder,
): Omit<Berichtsmodell, 'abschnitte'> {
  const deckblatt = e.druckprofil?.deckblatt ?? true;
  if (deckblatt) kopf.felder.push(...projektFelder(e.projekt));
  return {
    titel,
    absender: deckblatt ? absenderZeilen(e.buero) : [],
    kopf: kopf.felder,
    ...druckdatum(e.datum),
    seite: berichtSeite(e.druckprofil, 'hoch', lv),
  };
}

export function baueKostenermittlungModell(e: KostenermittlungEingabe): Berichtsmodell {
  const ke = e.kostenermittlung;
  const bezeichnung = bezeichnungenAlsMap(e.bezeichnungen);
  const bemerkung = new Map(ke.eintraege.map((x) => [x.nummer as string, x.bemerkung ?? '']));
  const zeilen: BerichtZeile[] = e.ergebnis.gruppen.map((g) => ({
    ...(g.ebene === 1 ? { fett: true } : {}),
    zellen: [
      g.nummer,
      bezeichnung.get(g.nummer) ?? '',
      g.eigenerBetrag === null ? '' : zelle(wert.betrag(g.eigenerBetrag)),
      zelle(wert.betrag(g.summe)),
      bemerkung.get(g.nummer) ?? '',
    ],
  }));
  zeilen.push({ fett: true, zellen: ['', 'Gesamt', '', zelle(wert.betrag(e.ergebnis.gesamtsumme)), ''] });

  const stufe = KOSTENERMITTLUNGSSTUFE_TEXT[ke.stufe];
  const tabelle: BerichtAbschnitt = {
    ueberschrift: null,
    bloecke: [
      ...(e.ergebnis.gruppen.length === 0 ? [{ art: 'absatz' as const, text: 'Noch keine Einträge.' }] : []),
      {
        art: 'tabelle',
        spalten: [...kgSpalten(['Eigener Betrag', 'Summe']), { titel: 'Bemerkung', breite: 120 }],
        zeilen,
      },
      {
        art: 'absatz',
        klein: true,
        text:
          'Alle Beträge netto in €. Summe: eigener Betrag der Kostengruppe und die Summen der Kostengruppen darunter; ' +
          'Gesamt: Summe der Kostengruppen der ersten Ebene.',
      },
    ],
  };
  return {
    ...kostenKopf(e, stufe, ke.name, new Kopffelder().feld('Kostenermittlung', ke.name)),
    abschnitte: [tabelle],
  };
}

// --- Kostenkontrolle ---------------------------------------------------------------------------------------------

/** Die vier Spalten einer Zeile, wie `Kostenkontrollwerte` von `kosten` (gleich gebaut, A3). */
interface Kontrollwerte {
  readonly budget: Betrag | null;
  readonly vergabe: Betrag;
  readonly abrechnung: Betrag;
  readonly abweichung: Betrag | null;
}

/** Was der Druck aus `Kostenkontrolle` von `kosten` liest (gleich gebaut, A3). */
interface KostenkontrolleDaten {
  readonly kostengruppen: readonly (Kontrollwerte & {
    readonly nummer: Kostengruppennummer;
    readonly ebene: number;
  })[];
  readonly ohneKostengruppe: Kontrollwerte;
  readonly nachlass: Kontrollwerte;
  readonly gesamt: Kontrollwerte;
}

export interface KostenkontrolleEingabe extends KostenKopfEingabe {
  /** Das Ergebnis von `kostenkontrolleBerechnen`. */
  readonly kontrolle: KostenkontrolleDaten;
  /** Die als Budget gewählte Kostenermittlung (Name und Stufe); `null`: keine. */
  readonly budget: { readonly name: string; readonly stufe: Kostenermittlungsstufe } | null;
  /**
   * `false`: Es gibt noch keine Rechnung, die Spalte Abrechnung bleibt leer (wie am Bildschirm). Fehlt: `true`.
   */
  readonly mitAbrechnung?: boolean;
  /** Die Namen der Auftrags-LVs, deren Werte addiert sind. */
  readonly auftragsLvs?: readonly string[];
  /** Die Hinweise der Kostenkontrolle mit den Texten der Seite (de-DE, fertig); leer oder fehlt: kein Abschnitt. */
  readonly hinweise?: readonly string[];
}

const kontrollZellen = (w: Kontrollwerte, mitAbrechnung: boolean): (string | BerichtZelle)[] => {
  const abw = w.abweichung;
  const hinweis =
    abw === null || vorzeichen(abw) === 0 ? undefined : vorzeichen(abw) > 0 ? 'über Budget' : 'unter Budget';
  return [
    zelle(wert.betrag(w.budget)),
    zelle(wert.betrag(w.vergabe)),
    mitAbrechnung ? zelle(wert.betrag(w.abrechnung)) : zelle({ text: KEINE_ANGABE }),
    hinweis === undefined ? zelle(wert.betrag(abw)) : zelle(wert.betrag(abw), { hinweis }),
  ];
};

export function baueKostenkontrolleModell(e: KostenkontrolleEingabe): Berichtsmodell {
  const k = e.kontrolle;
  const mitAbrechnung = e.mitAbrechnung ?? true;
  const bezeichnung = bezeichnungenAlsMap(e.bezeichnungen);
  const zeilen: BerichtZeile[] = [
    ...k.kostengruppen.map((g): BerichtZeile => ({
      ...(g.ebene === 1 ? { fett: true } : {}),
      zellen: [g.nummer, bezeichnung.get(g.nummer) ?? '', ...kontrollZellen(g, mitAbrechnung)],
    })),
    { zellen: ['', 'Ohne Kostengruppe', ...kontrollZellen(k.ohneKostengruppe, mitAbrechnung)] },
    { zellen: ['', 'Nachlass', ...kontrollZellen(k.nachlass, mitAbrechnung)] },
    { fett: true, zellen: ['', 'Gesamt', ...kontrollZellen(k.gesamt, mitAbrechnung)] },
  ];

  const erklaerung =
    'Alle Beträge netto in €. Budget: Summen der gewählten Kostenermittlung. Vergabe: Gesamtpreise der Positionen der ' +
    'Auftrags-LVs je Kostengruppe; der Nachlass steht als eigene Zeile und wird nicht auf die Kostengruppen verteilt, ' +
    'Gesamt ist das Netto nach Nachlass. Abrechnung: Leistungsstand der jeweils letzten Rechnung je Auftrags-LV, ' +
    'ohne Umlagen, Einbehalt und MwSt. Abweichung: Vergabe minus Budget.';
  const hinweise = e.hinweise ?? [];
  const abschnitte: BerichtAbschnitt[] = [
    {
      ueberschrift: null,
      bloecke: [
        ...(mitAbrechnung
          ? []
          : [{ art: 'absatz' as const, text: 'Noch keine Rechnung: Die Spalte Abrechnung bleibt leer.' }]),
        {
          art: 'tabelle',
          spalten: kgSpalten(['Budget', 'Vergabe', 'Abrechnung', 'Abweichung']),
          zeilen,
        },
        { art: 'absatz', klein: true, text: erklaerung },
      ],
    },
    ...(hinweise.length === 0
      ? []
      : [{ ueberschrift: 'Hinweise', bloecke: [{ art: 'liste' as const, punkte: [...hinweise] }] }]),
  ];

  const kopf = new Kopffelder()
    .feld(
      'Budget',
      e.budget === null
        ? 'Kein Budget gewählt'
        : `${e.budget.name} (${KOSTENERMITTLUNGSSTUFE_TEXT[e.budget.stufe]})`,
    )
    .feld('Auftrags-LV', (e.auftragsLvs ?? []).join(', '));
  return { ...kostenKopf(e, 'Kostenkontrolle', 'Kostenkontrolle', kopf), abschnitte };
}
