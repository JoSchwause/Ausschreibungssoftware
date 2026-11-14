// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 88, Punkt 2 und 3: die Prüfansicht einer Rechnung als Daten. Gerechnet wird nur in `abrechnung`
// (`rechnungPruefen`, `freigabeMoeglich`, Ticket 81); hier wird das Ergebnis zu Zeilen der Abzugskette, zum Vergleich
// gefordert/geprüft (D-44), zu deutschen Befundtexten (U5) und zur Lage der Freigabe (D-34 (7)). Beträge bleiben
// Dezimalwerte; formatiert wird erst in der Oberfläche (N4), Sätze in den Bezeichnungen schon hier. Ticket 152 (A5, D-72):
// die Vertragsstrafe als Zeile der Kette und die Zahlungsfreigabe (beide Fälle des Skontos, Bauabzugsteuer, Auszahlung,
// Zahlungen, offen) mit denselben Bezeichnungen wie der Druck.

import {
  freigabeMoeglich,
  rechnungPruefen,
  type Abzugskette,
  type Rechnungsbefund,
  type Rechnungspruefung,
} from '@tethys/abrechnung';
import { vorzeichen } from '@tethys/dezimal';
import { BAUABZUGSTEUER_SATZ } from '@tethys/vertrag';
import type {
  AufmassId,
  Betrag,
  Kalenderdatum,
  LeistungsverzeichnisId,
  Nachtragsstatus,
  PositionId,
  Rechnung,
  Vertragsstrafe,
  Zahlung,
  Zahlungsstand,
} from '@tethys/vertrag';
import { formatiereBetragDe, formatiereProzentDe } from '../lv/zahlen';
import type { Nachtragseintrag } from '../nachtrag/speichern';
import type { Rechnungsstand } from './rechnungen';
import { texte } from './texte';

const t = texte.pruefung;

/** Prüft die Rechnung gegen Auftrags-LV, alle Blätter und die übrigen Rechnungen des Auftrags-LV (D-34). */
export function pruefen(
  rechnung: Rechnung,
  stand: Pick<Rechnungsstand, 'auftrag' | 'aufmasse'>,
  rechnungen: readonly Rechnung[],
): Rechnungspruefung {
  return rechnungPruefen(rechnung, stand.auftrag, stand.aufmasse, rechnungen);
}

/** Der Zahlbetrag der Liste: freigegeben der eingefrorene (D-34 (7)), sonst der heute geprüfte. */
export function gepruefterZahlbetrag(
  rechnung: Rechnung,
  stand: Pick<Rechnungsstand, 'auftrag' | 'aufmasse'>,
  rechnungen: readonly Rechnung[],
): Betrag {
  return rechnung.freigabe?.zahlbetrag ?? pruefen(rechnung, stand, rechnungen).kette.zahlbetrag;
}

/** Eine Infozeile der Prüfung zu einem Nachtrag, der nicht in die Rechnung geht (D-35). */
export interface Nachtragsinfo {
  readonly lvId: LeistungsverzeichnisId;
  readonly nummer: string;
  readonly status: Exclude<Nachtragsstatus, 'beauftragt'>;
  /** Netto des Nachtragsangebots des Auftragnehmers. */
  readonly angebotsnetto: Betrag;
}

/**
 * Je nicht beauftragtem Nachtrag mit Angebot des Auftragnehmers eine Infozeile (D-35), in der Reihenfolge der Nachträge.
 * Ein solcher Nachtrag steht nicht im Auftrags-LV und geht nie in die Abzugskette; „VOB 80“ (Abschlag auf angebotene
 * Nachträge) gibt es in v1 nicht.
 */
export function nachtragsinfo(nachtraege: readonly Nachtragseintrag[]): Nachtragsinfo[] {
  const aus: Nachtragsinfo[] = [];
  for (const n of nachtraege)
    if (n.status !== 'beauftragt' && n.angebotsnetto !== null)
      aus.push({ lvId: n.lvId, nummer: n.nummer, status: n.status, angebotsnetto: n.angebotsnetto });
  return aus;
}

/** Eine Zeile der Abzugskette. `zeichen`: wie der Betrag in die Kette eingeht; `=` ist ein Zwischenergebnis. */
export interface Kettenzeile {
  readonly schluessel: string;
  readonly bezeichnung: string;
  readonly zeichen: '' | '+' | '−' | '=';
  readonly betrag: Betrag;
}

const satz = (s: Parameters<typeof formatiereProzentDe>[0] | null): string | null =>
  s === null ? null : formatiereProzentDe(s);

/**
 * Die Kette Zeile für Zeile (D-34): Leistung … Zahlbetrag; je Umlage und je früherer Rechnung eine Zeile. Die
 * Vertragsstrafe (D-72) steht zwischen Umlagen und Einbehalt, wenn die Rechnung eine trägt oder die Kette einen Betrag nennt.
 */
export function kettenzeilen(k: Abzugskette, vertragsstrafe?: Vertragsstrafe): Kettenzeile[] {
  const zeilen: Kettenzeile[] = [
    { schluessel: 'leistung', bezeichnung: t.leistung, zeichen: '', betrag: k.leistung },
    { schluessel: 'nachlass', bezeichnung: t.nachlass, zeichen: '−', betrag: k.nachlass },
    {
      schluessel: 'nettoNachNachlass',
      bezeichnung: t.nettoNachNachlass,
      zeichen: '=',
      betrag: k.nettoNachNachlass,
    },
    { schluessel: 'mwst', bezeichnung: t.mwst, zeichen: '+', betrag: k.mwst },
    {
      schluessel: 'bruttoKumuliert',
      bezeichnung: t.bruttoKumuliert,
      zeichen: '=',
      betrag: k.bruttoKumuliert,
    },
  ];
  k.umlagen.forEach((u, i) => {
    zeilen.push({
      schluessel: `umlage-${String(i)}`,
      bezeichnung: t.umlage(u.bezeichnung, formatiereProzentDe(u.satz)),
      zeichen: '−',
      betrag: u.betrag,
    });
  });
  if (vertragsstrafe !== undefined || vorzeichen(k.vertragsstrafe) !== 0)
    zeilen.push({
      schluessel: 'vertragsstrafe',
      bezeichnung: t.vertragsstrafe(vertragsstrafe?.grund ?? null),
      zeichen: '−',
      betrag: k.vertragsstrafe,
    });
  zeilen.push({
    schluessel: 'einbehalt',
    bezeichnung:
      k.einbehalt.art === 'gewaehrleistung'
        ? t.gewaehrleistung(satz(k.einbehalt.satz))
        : t.sicherheit(satz(k.einbehalt.satz)),
    zeichen: '−',
    betrag: k.einbehalt.betrag,
  });
  if (k.fruehere.length === 0)
    zeilen.push({
      schluessel: 'fruehere',
      bezeichnung: t.keineFrueheren,
      zeichen: '−',
      betrag: k.fruehereZahlbetraege,
    });
  for (const f of k.fruehere)
    zeilen.push({
      schluessel: `frueher-${String(f.nummer)}`,
      bezeichnung: t.frueher(f.nummer),
      zeichen: '−',
      betrag: f.zahlbetrag,
    });
  zeilen.push({ schluessel: 'zahlbetrag', bezeichnung: t.zahlbetrag, zeichen: '=', betrag: k.zahlbetrag });
  return zeilen;
}

/** Gefordert gegen geprüft je Wert (D-44): fehlt die Forderung, kein Vergleich („–“, keine Differenz). */
export interface Vergleichszeile {
  readonly feld: 'netto' | 'brutto' | 'zahlbetrag';
  readonly gefordert: Betrag | null;
  readonly geprueft: Betrag;
  /** gefordert − geprüft; `null` ohne Forderung. */
  readonly differenz: Betrag | null;
  /** Die Zeile, die zählt: der Zahlbetrag, sonst Brutto, sonst Netto, je wie gefordert (D-44). */
  readonly massgeblich: boolean;
}

export function vergleichszeilen(p: Rechnungspruefung): Vergleichszeile[] {
  const geprueft = {
    netto: p.kette.nettoNachNachlass,
    brutto: p.kette.bruttoKumuliert,
    zahlbetrag: p.kette.zahlbetrag,
  };
  const f = p.forderung;
  const massgeblich =
    f === null ? undefined : (['zahlbetrag', 'brutto', 'netto'] as const).find((x) => f[x] !== null);
  return (['netto', 'brutto', 'zahlbetrag'] as const).map((feld) => {
    const a = f?.[feld] ?? null;
    return {
      feld,
      gefordert: a?.gefordert ?? null,
      geprueft: a?.geprueft ?? geprueft[feld],
      differenz: a?.differenz ?? null,
      massgeblich: feld === massgeblich,
    };
  });
}

/** Wie die Befunde Positionen und Blätter nennen. */
export interface Befundbezug {
  readonly oz: (positionId: PositionId) => string;
  readonly blatt: (aufmassId: AufmassId) => string;
}

/** Ein Befund der Prüfung als deutscher Satz (U5: Hinweis, keine Sperre). */
export function befundtext(b: Rechnungsbefund, bezug: Befundbezug): string {
  const x = texte.befund;
  switch (b.code) {
    case 'aufmass-unbekannt':
      return x['aufmass-unbekannt'];
    case 'aufmass-fehlt':
      return x['aufmass-fehlt'](bezug.blatt(b.aufmassId), b.nummer);
    case 'fruehere-nicht-freigegeben':
      return x['fruehere-nicht-freigegeben'](b.nummer);
    case 'freigabe-reihenfolge':
      return x['freigabe-reihenfolge'](b.nummer, b.offen);
    case 'schlussrechnung-nicht-letzte':
      return x['schlussrechnung-nicht-letzte'](b.nummer);
    case 'gefordert-abweichend':
      return x['gefordert-abweichend'](t.vergleichZeile[b.feld], formatiereBetragDe(b.differenz));
    case 'ueberzahlung':
      return x.ueberzahlung(formatiereBetragDe(b.zahlbetrag));
    case 'freigabe-abweichend':
      return x['freigabe-abweichend'](formatiereBetragDe(b.eingefroren), formatiereBetragDe(b.geprueft));
    case 'zeile-zaehlt-nicht':
      return x['zeile-zaehlt-nicht'](bezug.oz(b.positionId));
    case 'ohne-einheitspreis':
      return x['ohne-einheitspreis'](bezug.oz(b.positionId));
    case 'ohne-zuschlagssatz':
      return x['ohne-zuschlagssatz'](bezug.oz(b.positionId));
    case 'nachlass-ohne-basis':
      return x['nachlass-ohne-basis'];
    case 'netto-nach-nachlass-negativ':
      return x['netto-nach-nachlass-negativ'];
    // Befunde des Zahlungsstands (v1.7b, D-72; Wortlaut geprüft in Ticket 152, D-97).
    case 'skonto-ohne-eingang':
      return x['skonto-ohne-eingang'];
    case 'zahlungen-ueber-auszahlung':
      return x['zahlungen-ueber-auszahlung'](formatiereBetragDe(b.offen));
  }
}

/**
 * Was die Prüfansicht zur Freigabe anbietet. Offen: „Freigeben“, gesperrt mit Erklärung, solange eine frühere Rechnung
 * offen ist (`freigabeMoeglich`). Freigegeben: „Freigabe aufheben“, gesperrt, solange eine spätere Rechnung freigegeben ist
 * (deren eingefrorener Zahlbetrag zieht diesen ab; Lesart an `RechnungsfreigabeAufheben`, v1.4).
 */
export type Freigabelage =
  | { readonly art: 'offen'; readonly moeglich: boolean; readonly grund: string | null }
  | {
      readonly art: 'freigegeben';
      readonly zahlbetrag: Betrag;
      readonly aufhebbar: boolean;
      readonly grund: string | null;
    };

export function freigabelage(r: Rechnung, rechnungen: readonly Rechnung[]): Freigabelage {
  if (r.freigabe !== null) {
    const spaeter = rechnungen
      .filter((x) => x.auftragsLvId === r.auftragsLvId && x.nummer > r.nummer && x.freigabe !== null)
      .map((x) => x.nummer);
    // Q5, D-128.7: Solange Zahlungen bestehen, bleibt die Freigabe (der Ausführer weist sonst mit `zahlungen-vorhanden` ab).
    const zahlungen = r.zahlungen?.length ?? 0;
    const grund =
      spaeter.length > 0
        ? texte.freigabe.aufhebenGesperrt(spaeter)
        : zahlungen > 0
          ? texte.freigabe.aufhebenZahlungen(r.nummer, zahlungen)
          : null;
    return { art: 'freigegeben', zahlbetrag: r.freigabe.zahlbetrag, aufhebbar: grund === null, grund };
  }
  const m = freigabeMoeglich(r, rechnungen);
  const offen = m.hindernisse.flatMap((h) => (h.code === 'fruehere-offen' ? h.nummern : []));
  return {
    art: 'offen',
    moeglich: m.moeglich,
    grund: offen.length === 0 ? null : texte.freigabe.gesperrt(offen),
  };
}

/** Eine Zeile der beiden Fälle des Skontos: bei Zahlung bis zum Fristende (`mit`) und danach (`ohne`). */
export interface Fallzeile {
  readonly schluessel: 'zahlbetrag' | 'skonto' | 'bauabzugsteuer' | 'auszahlung';
  readonly bezeichnung: string;
  readonly zeichen: '' | '−' | '=';
  readonly mit: Betrag;
  readonly ohne: Betrag;
}

/** Eine Zeile des geltenden Falls bis zum offenen Betrag. */
export interface Freigabezeile {
  readonly schluessel: 'zahlbetrag' | 'skonto' | 'bauabzugsteuer' | 'auszahlung' | 'summeZahlungen' | 'offen';
  readonly bezeichnung: string;
  readonly zeichen: '' | '−' | '=';
  readonly betrag: Betrag;
}

/** Die Zahlungsfreigabe als Daten (A5, D-72), gegliedert wie im Druck. */
export interface Zahlungsfreigabe {
  /** Beide Fälle, wenn ein Skonto mit Fristende vereinbart ist; sonst `null`. */
  readonly faelle: { readonly bis: Kalenderdatum; readonly zeilen: readonly Fallzeile[] } | null;
  /** Skonto vereinbart, aber kein Eingangsdatum: kein Fristende, kein Skonto (Befund `skonto-ohne-eingang`). */
  readonly ohneEingang: boolean;
  /** Der geltende Fall: Zahlbetrag, Skonto (falls vereinbart), Bauabzugsteuer (falls an), Auszahlung, Zahlungen, offen. */
  readonly geltend: readonly Freigabezeile[];
  /** Die Zahlungen nach Datum (bei gleichem Datum in der Reihenfolge des Erfassens). */
  readonly zahlungen: readonly Zahlung[];
}

/** Zahlungen nach Datum; gleiches Datum in der Reihenfolge des Erfassens (stabil). */
export const nachDatum = (zs: readonly Zahlung[]): Zahlung[] =>
  [...zs].sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));

/**
 * Die Zahlungsfreigabe einer Rechnung aus ihrem Zahlungsstand (gerechnet in `abrechnung`, D-128.8). Bezeichnungen wie im
 * Druck: „Bauabzugsteuer 15,00 % an das Finanzamt“, „Auszahlung an den Auftragnehmer“, „Summe der Zahlungen“, „Offen“.
 * Skonto und Bauabzugsteuer mindern nur die Auszahlung, nie den Zahlbetrag.
 */
export function zahlungsfreigabe(r: Rechnung, zs: Zahlungsstand): Zahlungsfreigabe {
  const z = texte.zahlung;
  const steuer = r.bauabzugsteuer === true;
  const steuerText = z.bauabzugsteuer(formatiereProzentDe(BAUABZUGSTEUER_SATZ));
  const skonto = r.skonto;
  let faelle: Zahlungsfreigabe['faelle'] = null;
  if (skonto !== undefined && zs.fristende !== null) {
    const zeilen: Fallzeile[] = [
      {
        schluessel: 'zahlbetrag',
        bezeichnung: z.zahlbetrag,
        zeichen: '',
        mit: zs.zahlbetrag,
        ohne: zs.zahlbetrag,
      },
      {
        schluessel: 'skonto',
        bezeichnung: z.skonto(formatiereProzentDe(skonto.satz)),
        zeichen: '−',
        mit: zs.mitSkonto.skonto,
        ohne: zs.ohneSkonto.skonto,
      },
    ];
    if (steuer)
      zeilen.push({
        schluessel: 'bauabzugsteuer',
        bezeichnung: steuerText,
        zeichen: '−',
        mit: zs.mitSkonto.bauabzugsteuer,
        ohne: zs.ohneSkonto.bauabzugsteuer,
      });
    zeilen.push({
      schluessel: 'auszahlung',
      bezeichnung: z.auszahlung,
      zeichen: '=',
      mit: zs.mitSkonto.auszahlung,
      ohne: zs.ohneSkonto.auszahlung,
    });
    faelle = { bis: zs.fristende, zeilen };
  }
  const geltend: Freigabezeile[] = [
    {
      schluessel: 'zahlbetrag',
      bezeichnung: r.freigabe === null ? z.zahlbetragVorschau : z.zahlbetragEingefroren,
      zeichen: '',
      betrag: zs.zahlbetrag,
    },
  ];
  if (skonto !== undefined)
    geltend.push({
      schluessel: 'skonto',
      bezeichnung: zs.skontoVerwirklicht ? z.skontoVerwirklicht : z.skontoNichtVerwirklicht,
      zeichen: '−',
      betrag: zs.verwirklichterSkonto,
    });
  if (steuer)
    geltend.push({
      schluessel: 'bauabzugsteuer',
      bezeichnung: steuerText,
      zeichen: '−',
      betrag: zs.bauabzugsteuer,
    });
  geltend.push(
    { schluessel: 'auszahlung', bezeichnung: z.auszahlung, zeichen: '=', betrag: zs.auszahlung },
    { schluessel: 'summeZahlungen', bezeichnung: z.summeZahlungen, zeichen: '−', betrag: zs.summeZahlungen },
    { schluessel: 'offen', bezeichnung: z.offen, zeichen: '=', betrag: zs.offen },
  );
  return {
    faelle,
    ohneEingang: skonto !== undefined && zs.fristende === null,
    geltend,
    zahlungen: nachDatum(r.zahlungen ?? []),
  };
}
