// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 88, Punkt 2 und 3: die Prüfansicht einer Rechnung als Daten. Gerechnet wird nur in `abrechnung`
// (`rechnungPruefen`, `freigabeMoeglich`, Ticket 81); hier wird das Ergebnis zu Zeilen der Abzugskette, zum Vergleich
// gefordert/geprüft (D-44), zu deutschen Befundtexten (U5) und zur Lage der Freigabe (D-34 (7)). Beträge bleiben
// Dezimalwerte; formatiert wird erst in der Oberfläche (N4), Sätze in den Bezeichnungen schon hier.

import {
  freigabeMoeglich,
  rechnungPruefen,
  type Abzugskette,
  type Rechnungsbefund,
  type Rechnungspruefung,
} from '@tethys/abrechnung';
import type {
  AufmassId,
  Betrag,
  LeistungsverzeichnisId,
  Nachtragsstatus,
  PositionId,
  Rechnung,
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

/** Die Kette Zeile für Zeile (D-34): Leistung … Zahlbetrag; je Umlage und je früherer Rechnung eine Zeile. */
export function kettenzeilen(k: Abzugskette): Kettenzeile[] {
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
    // Befunde des Zahlungsstands (v1.7b, D-72); mechanisch ergänzt, die Oberfläche dazu baut Ticket 152.
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
    return {
      art: 'freigegeben',
      zahlbetrag: r.freigabe.zahlbetrag,
      aufhebbar: spaeter.length === 0,
      grund: spaeter.length === 0 ? null : texte.freigabe.aufhebenGesperrt(spaeter),
    };
  }
  const m = freigabeMoeglich(r, rechnungen);
  const offen = m.hindernisse.flatMap((h) => (h.code === 'fruehere-offen' ? h.nummern : []));
  return {
    art: 'offen',
    moeglich: m.moeglich,
    grund: offen.length === 0 ? null : texte.freigabe.gesperrt(offen),
  };
}
