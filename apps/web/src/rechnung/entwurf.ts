// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 88: das Formular einer Rechnung (Neue Rechnung, Angaben bearbeiten). Die Felder stehen als Text, wie der Nutzer
// sie tippt; erst `entwurfLesen` macht daraus Werte des Vertrags (de-DE nur hier am Rand, N4). Ein unlesbares Feld
// verwirft nichts: Das Formular bleibt offen, die Meldung steht am Feld (U5). Aus den Werten werden Befehle (A5); was
// gleich bleibt, wird kein Befehl.

import type {
  AufmassId,
  AufmassKopf,
  AuftragsLeistungsverzeichnisId,
  Betrag,
  Ergebnis,
  ProjektId,
  Prozent,
  Rechnung,
  RechnungAnlegen,
  RechnungBefehl,
  RechnungId,
  RechnungsabzuegeSetzen,
  RechnungsangabenSetzen,
  Rechnungsart,
  Umlage,
} from '@tethys/vertrag';
import { formatiereBetragDe, formatiereProzentDe, zahlLesen } from '../lv/zahlen';
import { texte } from './texte';

/** Eine Umlage im Formular: Bezeichnung und Satz als getippter Text (de-DE). */
export interface Umlageentwurf {
  readonly bezeichnung: string;
  readonly satz: string;
}

/** Das Formular einer Rechnung. Zahlen und Sätze als de-DE-Text, das Eingangsdatum als `JJJJ-MM-TT` oder leer. */
export interface Rechnungsentwurf {
  readonly art: Rechnungsart;
  readonly eingang: string;
  readonly rechnungsnummerAuftragnehmer: string;
  readonly gefordertNetto: string;
  readonly gefordertBrutto: string;
  readonly gefordertZahlbetrag: string;
  readonly aufmassIds: readonly AufmassId[];
  readonly umlagen: readonly Umlageentwurf[];
  readonly sicherheitSatz: string;
  readonly gewaehrleistungSatz: string;
}

/** Die gelesenen Werte, gegliedert wie die Befehle, die sie setzen. */
export interface Rechnungswerte {
  readonly angaben: Omit<RechnungsangabenSetzen, 'art'>;
  readonly aufmassIds: readonly AufmassId[];
  readonly abzuege: Omit<RechnungsabzuegeSetzen, 'art'>;
}

/** Ein Feld, das sich nicht lesen ließ. `feld` heißt wie im Entwurf, Umlagen als `umlagen.<i>.satz`. */
export interface Feldfehler {
  readonly feld: string;
  readonly meldung: string;
}

const text = <T extends string>(wert: T | null, format: (w: T) => string): string =>
  wert === null ? '' : format(wert);

/** Die Blätter in der Reihenfolge ihrer Nummern (die App ordnet nach Blattnummer, siehe `Rechnung.aufmassIds`). */
function nachNummer(ids: readonly AufmassId[], blaetter: readonly AufmassKopf[]): AufmassId[] {
  const nr = new Map(blaetter.map((b) => [b.id, b.nummer]));
  return [...ids].sort((a, b) => (nr.get(a) ?? Number.MAX_SAFE_INTEGER) - (nr.get(b) ?? Number.MAX_SAFE_INTEGER));
}

/** Die Rechnung mit der höchsten Nummer, `undefined` ohne Rechnungen. */
export function letzteRechnung(rechnungen: readonly Rechnung[]): Rechnung | undefined {
  return rechnungen.reduce<Rechnung | undefined>((m, r) => (m === undefined || r.nummer > m.nummer ? r : m), undefined);
}

/** Nummer der nächsten Rechnung des Auftrags-LV: höchste Nummer + 1, die erste ist 1. */
export function naechsteRechnungsnummer(rechnungen: readonly Rechnung[]): number {
  return (letzteRechnung(rechnungen)?.nummer ?? 0) + 1;
}

/**
 * Vorschlag für eine neue Rechnung: Abschlagsrechnung, alle Aufmaßblätter des Auftrags-LV (kumuliert, D-34), Umlagen und
 * beide Einbehaltssätze aus der vorigen Rechnung (siehe `Rechnung.sicherheitSatz`); Angaben und Forderungen leer.
 */
export function neuerEntwurf(rechnungen: readonly Rechnung[], blaetter: readonly AufmassKopf[]): Rechnungsentwurf {
  const vorige = letzteRechnung(rechnungen);
  return {
    art: 'abschlag',
    eingang: '',
    rechnungsnummerAuftragnehmer: '',
    gefordertNetto: '',
    gefordertBrutto: '',
    gefordertZahlbetrag: '',
    aufmassIds: nachNummer(
      blaetter.map((b) => b.id),
      blaetter,
    ),
    umlagen: (vorige?.umlagen ?? []).map((u) => ({ bezeichnung: u.bezeichnung, satz: formatiereProzentDe(u.satz) })),
    sicherheitSatz: text(vorige?.sicherheitSatz ?? null, formatiereProzentDe),
    gewaehrleistungSatz: text(vorige?.gewaehrleistungSatz ?? null, formatiereProzentDe),
  };
}

/** Das Formular zu einer vorhandenen Rechnung (Angaben bearbeiten). */
export function entwurfAus(r: Rechnung, blaetter: readonly AufmassKopf[] = []): Rechnungsentwurf {
  return {
    art: r.art,
    eingang: r.eingang ?? '',
    rechnungsnummerAuftragnehmer: r.rechnungsnummerAuftragnehmer ?? '',
    gefordertNetto: text(r.gefordert?.netto ?? null, formatiereBetragDe),
    gefordertBrutto: text(r.gefordert?.brutto ?? null, formatiereBetragDe),
    gefordertZahlbetrag: text(r.gefordert?.zahlbetrag ?? null, formatiereBetragDe),
    aufmassIds: nachNummer(r.aufmassIds, blaetter),
    umlagen: r.umlagen.map((u) => ({ bezeichnung: u.bezeichnung, satz: formatiereProzentDe(u.satz) })),
    sicherheitSatz: text(r.sicherheitSatz, formatiereProzentDe),
    gewaehrleistungSatz: text(r.gewaehrleistungSatz, formatiereProzentDe),
  };
}

/** `JJJJ-MM-TT` eines Tags, den es gibt. */
function istDatum(t: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (m === null) return false;
  const [j, mo, ta] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(j, mo - 1, ta));
  return d.getUTCFullYear() === j && d.getUTCMonth() === mo - 1 && d.getUTCDate() === ta;
}

/**
 * Liest das Formular. Leere Felder sind `null`; drei leere Forderungen sind das äußere `null` (D-44). Eine Umlage ohne
 * Bezeichnung und ohne Satz ist eine leere Zeile und fällt weg; mit Bezeichnung braucht sie einen Satz.
 */
export function entwurfLesen(e: Rechnungsentwurf): Ergebnis<Rechnungswerte, readonly Feldfehler[]> {
  const fehler: Feldfehler[] = [];
  const zahl = <Z extends 'betrag' | 'prozent'>(
    art: Z,
    feld: string,
    t: string,
  ): (Z extends 'betrag' ? Betrag : Prozent) | null => {
    if (t.trim() === '') return null;
    const r = zahlLesen(art, t);
    if (r.ok) return r.wert as Z extends 'betrag' ? Betrag : Prozent;
    fehler.push({ feld, meldung: r.fehler });
    return null;
  };

  const eingang = e.eingang.trim();
  if (eingang !== '' && !istDatum(eingang)) fehler.push({ feld: 'eingang', meldung: texte.formular.datumUngueltig });
  const netto = zahl('betrag', 'gefordertNetto', e.gefordertNetto);
  const brutto = zahl('betrag', 'gefordertBrutto', e.gefordertBrutto);
  const zahlbetrag = zahl('betrag', 'gefordertZahlbetrag', e.gefordertZahlbetrag);
  const umlagen: Umlage[] = [];
  e.umlagen.forEach((u, i) => {
    const bezeichnung = u.bezeichnung.trim();
    if (bezeichnung === '' && u.satz.trim() === '') return;
    const feld = `umlagen.${String(i)}.satz`;
    if (u.satz.trim() === '') {
      fehler.push({ feld, meldung: texte.formular.satzFehlt });
      return;
    }
    const satz = zahl('prozent', feld, u.satz);
    if (satz !== null) umlagen.push({ bezeichnung, satz });
  });
  const sicherheitSatz = zahl('prozent', 'sicherheitSatz', e.sicherheitSatz);
  const gewaehrleistungSatz = zahl('prozent', 'gewaehrleistungSatz', e.gewaehrleistungSatz);
  if (fehler.length > 0) return { ok: false, fehler };

  const rnr = e.rechnungsnummerAuftragnehmer.trim();
  return {
    ok: true,
    wert: {
      angaben: {
        rechnungsart: e.art,
        eingang: eingang === '' ? null : eingang,
        rechnungsnummerAuftragnehmer: rnr === '' ? null : rnr,
        gefordert: netto === null && brutto === null && zahlbetrag === null ? null : { netto, brutto, zahlbetrag },
      },
      aufmassIds: [...e.aufmassIds],
      abzuege: { umlagen, sicherheitSatz, gewaehrleistungSatz },
    },
  };
}

/** Legt die nächste Rechnung des Auftrags-LV mit den Werten des Formulars an (nicht freigegeben). */
export function rechnungAnlegenBefehl(
  id: RechnungId,
  projektId: ProjektId,
  auftragsLvId: AuftragsLeistungsverzeichnisId,
  rechnungen: readonly Rechnung[],
  w: Rechnungswerte,
): RechnungAnlegen {
  return {
    art: 'RechnungAnlegen',
    rechnung: {
      id,
      projektId,
      auftragsLvId,
      nummer: naechsteRechnungsnummer(rechnungen),
      art: w.angaben.rechnungsart,
      eingang: w.angaben.eingang,
      rechnungsnummerAuftragnehmer: w.angaben.rechnungsnummerAuftragnehmer,
      gefordert: w.angaben.gefordert,
      aufmassIds: w.aufmassIds,
      umlagen: w.abzuege.umlagen,
      sicherheitSatz: w.abzuege.sicherheitSatz,
      gewaehrleistungSatz: w.abzuege.gewaehrleistungSatz,
      freigabe: null,
    },
  };
}

const gleich = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * Die Befehle, die eine Rechnung auf die Werte des Formulars bringen, in der Reihenfolge Angaben, Aufmaßblätter, Abzüge;
 * nur die Teile, die sich ändern. Die Reihenfolge der Blätter allein ist keine Änderung (`Rechnung.aufmassIds`).
 */
export function aenderungsbefehle(r: Rechnung, w: Rechnungswerte): RechnungBefehl[] {
  const befehle: RechnungBefehl[] = [];
  const angaben = {
    rechnungsart: r.art,
    eingang: r.eingang,
    rechnungsnummerAuftragnehmer: r.rechnungsnummerAuftragnehmer,
    gefordert: r.gefordert,
  };
  if (!gleich(angaben, w.angaben)) befehle.push({ art: 'RechnungsangabenSetzen', ...w.angaben });
  if (!gleich([...r.aufmassIds].sort(), [...w.aufmassIds].sort()))
    befehle.push({ art: 'RechnungsaufmasseSetzen', aufmassIds: w.aufmassIds });
  const abzuege = { umlagen: r.umlagen, sicherheitSatz: r.sicherheitSatz, gewaehrleistungSatz: r.gewaehrleistungSatz };
  if (!gleich(abzuege, w.abzuege)) befehle.push({ art: 'RechnungsabzuegeSetzen', ...w.abzuege });
  return befehle;
}
