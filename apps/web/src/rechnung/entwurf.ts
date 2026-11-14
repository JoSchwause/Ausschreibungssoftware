// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 88: das Formular einer Rechnung (Neue Rechnung, Angaben bearbeiten). Die Felder stehen als Text, wie der Nutzer
// sie tippt; erst `entwurfLesen` macht daraus Werte des Vertrags (de-DE nur hier am Rand, N4). Ein unlesbares Feld
// verwirft nichts: Das Formular bleibt offen, die Meldung steht am Feld (U5). Aus den Werten werden Befehle (A5); was
// gleich bleibt, wird kein Befehl. Ticket 152 (A5, D-72): Vertragsstrafe, Skonto und Bauabzugsteuer stehen im selben
// Formular; „fehlt“ ist die einzige Schreibweise für keine/aus (D-128.2), darum nimmt `RechnungAnlegen` sie nur gesetzt mit.

import { vertragsstrafeVorschlag } from '@tethys/abrechnung';
import { vorzeichen } from '@tethys/dezimal';

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
  Skonto,
  Umlage,
  Vertragsstrafe,
} from '@tethys/vertrag';
import { datumDe, datumLesen } from '../lv/kopfdaten';
import { formatiereBetragDe, formatiereProzentDe, zahlLesen } from '../lv/zahlen';
import { texte } from './texte';

/** Eine Umlage im Formular: Bezeichnung und Satz als getippter Text (de-DE). */
export interface Umlageentwurf {
  readonly bezeichnung: string;
  readonly satz: string;
}

/** Das Formular einer Rechnung. Zahlen, Sätze und das Eingangsdatum (`TT.MM.JJJJ`) als de-DE-Text; leer: keine Angabe. */
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
  /** Vertragsstrafe brutto, kumuliert (de-DE); leer mit leerem Grund: keine. */
  readonly vertragsstrafeBetrag: string;
  readonly vertragsstrafeGrund: string;
  /** Skontosatz in % (de-DE) und Skontofrist in Kalendertagen; beide leer: kein Skonto. */
  readonly skontoSatz: string;
  readonly skontoFrist: string;
  readonly bauabzugsteuer: boolean;
}

/** Vertragsstrafe, Skonto und Bauabzugsteuer (A5); `null` bzw. `false`: keine/aus. */
export interface A5Werte {
  readonly vertragsstrafe: Vertragsstrafe | null;
  readonly skonto: Skonto | null;
  readonly bauabzugsteuer: boolean;
}

/** Die gelesenen Werte, gegliedert wie die Befehle, die sie setzen. */
export interface Rechnungswerte {
  readonly angaben: Omit<RechnungsangabenSetzen, 'art'>;
  readonly aufmassIds: readonly AufmassId[];
  readonly abzuege: Omit<RechnungsabzuegeSetzen, 'art'>;
  readonly a5: A5Werte;
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
  return [...ids].sort(
    (a, b) => (nr.get(a) ?? Number.MAX_SAFE_INTEGER) - (nr.get(b) ?? Number.MAX_SAFE_INTEGER),
  );
}

/** Die Rechnung mit der höchsten Nummer, `undefined` ohne Rechnungen. */
export function letzteRechnung(rechnungen: readonly Rechnung[]): Rechnung | undefined {
  return rechnungen.reduce<Rechnung | undefined>(
    (m, r) => (m === undefined || r.nummer > m.nummer ? r : m),
    undefined,
  );
}

/** Nummer der nächsten Rechnung des Auftrags-LV: höchste Nummer + 1, die erste ist 1. */
export function naechsteRechnungsnummer(rechnungen: readonly Rechnung[]): number {
  return (letzteRechnung(rechnungen)?.nummer ?? 0) + 1;
}

/** Die Felder für Vertragsstrafe, Skonto und Bauabzugsteuer einer Rechnung (oder des Vorschlags). */
function a5Felder(
  vertragsstrafe: Vertragsstrafe | null | undefined,
  skonto: Skonto | null | undefined,
  bauabzugsteuer: boolean,
): Pick<
  Rechnungsentwurf,
  'vertragsstrafeBetrag' | 'vertragsstrafeGrund' | 'skontoSatz' | 'skontoFrist' | 'bauabzugsteuer'
> {
  return {
    vertragsstrafeBetrag: text(vertragsstrafe?.betrag ?? null, formatiereBetragDe),
    vertragsstrafeGrund: vertragsstrafe?.grund ?? '',
    skontoSatz: text(skonto?.satz ?? null, formatiereProzentDe),
    skontoFrist: skonto === null || skonto === undefined ? '' : String(skonto.fristTage),
    bauabzugsteuer,
  };
}

/**
 * Vorschlag für eine neue Rechnung: Abschlagsrechnung, alle Aufmaßblätter des Auftrags-LV (kumuliert, D-34), Umlagen und
 * beide Einbehaltssätze aus der vorigen Rechnung (siehe `Rechnung.sicherheitSatz`); Angaben und Forderungen leer. Aus der
 * vorigen Rechnung kommen auch Vertragsstrafe (kumuliert, `vertragsstrafeVorschlag`, D-143.5), Skonto und Bauabzugsteuer
 * (D-128.7: die App schlägt sie aus der vorigen Rechnung vor).
 */
export function neuerEntwurf(
  rechnungen: readonly Rechnung[],
  blaetter: readonly AufmassKopf[],
): Rechnungsentwurf {
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
    umlagen: (vorige?.umlagen ?? []).map((u) => ({
      bezeichnung: u.bezeichnung,
      satz: formatiereProzentDe(u.satz),
    })),
    sicherheitSatz: text(vorige?.sicherheitSatz ?? null, formatiereProzentDe),
    gewaehrleistungSatz: text(vorige?.gewaehrleistungSatz ?? null, formatiereProzentDe),
    ...a5Felder(
      vorige === undefined
        ? null
        : vertragsstrafeVorschlag(rechnungen, vorige.auftragsLvId, naechsteRechnungsnummer(rechnungen)),
      vorige?.skonto,
      vorige?.bauabzugsteuer === true,
    ),
  };
}

/** Das Formular zu einer vorhandenen Rechnung (Angaben bearbeiten). */
export function entwurfAus(r: Rechnung, blaetter: readonly AufmassKopf[] = []): Rechnungsentwurf {
  return {
    art: r.art,
    eingang: r.eingang === null ? '' : datumDe(r.eingang),
    rechnungsnummerAuftragnehmer: r.rechnungsnummerAuftragnehmer ?? '',
    gefordertNetto: text(r.gefordert?.netto ?? null, formatiereBetragDe),
    gefordertBrutto: text(r.gefordert?.brutto ?? null, formatiereBetragDe),
    gefordertZahlbetrag: text(r.gefordert?.zahlbetrag ?? null, formatiereBetragDe),
    aufmassIds: nachNummer(r.aufmassIds, blaetter),
    umlagen: r.umlagen.map((u) => ({ bezeichnung: u.bezeichnung, satz: formatiereProzentDe(u.satz) })),
    sicherheitSatz: text(r.sicherheitSatz, formatiereProzentDe),
    gewaehrleistungSatz: text(r.gewaehrleistungSatz, formatiereProzentDe),
    ...a5Felder(r.vertragsstrafe, r.skonto, r.bauabzugsteuer === true),
  };
}

/** Skontofrist: ganze Zahl von 1 bis 365 Kalendertagen (D-128.4). */
const FRIST = /^\d{1,3}$/;

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

  let eingang: string | null = null;
  if (e.eingang.trim() !== '') {
    const d = datumLesen(e.eingang);
    if (d.ok) eingang = d.wert;
    else fehler.push({ feld: 'eingang', meldung: d.fehler });
  }
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
  const a5 = a5Lesen(e, zahl, fehler);
  if (fehler.length > 0) return { ok: false, fehler };

  const rnr = e.rechnungsnummerAuftragnehmer.trim();
  return {
    ok: true,
    wert: {
      angaben: {
        rechnungsart: e.art,
        eingang,
        rechnungsnummerAuftragnehmer: rnr === '' ? null : rnr,
        gefordert:
          netto === null && brutto === null && zahlbetrag === null ? null : { netto, brutto, zahlbetrag },
      },
      aufmassIds: [...e.aufmassIds],
      abzuege: { umlagen, sicherheitSatz, gewaehrleistungSatz },
      a5,
    },
  };
}

type Zahlleser = <Z extends 'betrag' | 'prozent'>(
  art: Z,
  feld: string,
  t: string,
) => (Z extends 'betrag' ? Betrag : Prozent) | null;

/** Satz größer 0 und kleiner 100 (D-128.4). */
const skontosatzGueltig = (s: Prozent): boolean => vorzeichen(s) > 0 && Number(s) < 100;

/**
 * Vertragsstrafe und Skonto gehören je zu zweit: ein Teil allein ist eine Meldung am fehlenden Feld. Die Formen prüft der
 * Ausführer ebenso (D-128.3, D-128.4); hier steht die Meldung am Feld, bevor etwas gesendet wird (U5).
 */
function a5Lesen(e: Rechnungsentwurf, zahl: Zahlleser, fehler: Feldfehler[]): A5Werte {
  const m = texte.formular;
  const grund = e.vertragsstrafeGrund.trim();
  const betragLeer = e.vertragsstrafeBetrag.trim() === '';
  const betrag = zahl('betrag', 'vertragsstrafeBetrag', e.vertragsstrafeBetrag);
  if (betragLeer && grund !== '') fehler.push({ feld: 'vertragsstrafeBetrag', meldung: m.strafeBetragFehlt });
  else if (betrag !== null && vorzeichen(betrag) <= 0)
    fehler.push({ feld: 'vertragsstrafeBetrag', meldung: m.strafeBetragPositiv });
  if (!betragLeer && grund === '') fehler.push({ feld: 'vertragsstrafeGrund', meldung: m.strafeGrundFehlt });
  const vertragsstrafe = betrag !== null && vorzeichen(betrag) > 0 && grund !== '' ? { betrag, grund } : null;

  const satzLeer = e.skontoSatz.trim() === '';
  const fristText = e.skontoFrist.trim();
  const satz = zahl('prozent', 'skontoSatz', e.skontoSatz);
  if (satzLeer && fristText !== '') fehler.push({ feld: 'skontoSatz', meldung: m.skontoSatzFehlt });
  else if (satz !== null && !skontosatzGueltig(satz))
    fehler.push({ feld: 'skontoSatz', meldung: m.skontoSatzBereich });
  let fristTage: number | null = null;
  if (fristText === '') {
    if (!satzLeer) fehler.push({ feld: 'skontoFrist', meldung: m.skontoFristFehlt });
  } else if (FRIST.test(fristText) && Number(fristText) >= 1 && Number(fristText) <= 365)
    fristTage = Number(fristText);
  else fehler.push({ feld: 'skontoFrist', meldung: m.skontoFristBereich });
  const skonto = satz !== null && fristTage !== null && skontosatzGueltig(satz) ? { satz, fristTage } : null;

  return { vertragsstrafe, skonto, bauabzugsteuer: e.bauabzugsteuer };
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
      ...(w.a5.vertragsstrafe === null ? {} : { vertragsstrafe: w.a5.vertragsstrafe }),
      ...(w.a5.skonto === null ? {} : { skonto: w.a5.skonto }),
      ...(w.a5.bauabzugsteuer ? { bauabzugsteuer: true as const } : {}),
    },
  };
}

const gleich = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * Die Befehle, die eine Rechnung auf die Werte des Formulars bringen, in der Reihenfolge Angaben, Aufmaßblätter, Abzüge,
 * Vertragsstrafe, Skonto, Bauabzugsteuer;
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
  const abzuege = {
    umlagen: r.umlagen,
    sicherheitSatz: r.sicherheitSatz,
    gewaehrleistungSatz: r.gewaehrleistungSatz,
  };
  if (!gleich(abzuege, w.abzuege)) befehle.push({ art: 'RechnungsabzuegeSetzen', ...w.abzuege });
  if (!gleich(r.vertragsstrafe ?? null, w.a5.vertragsstrafe))
    befehle.push({ art: 'VertragsstrafeSetzen', vertragsstrafe: w.a5.vertragsstrafe });
  if (!gleich(r.skonto ?? null, w.a5.skonto)) befehle.push({ art: 'SkontoSetzen', skonto: w.a5.skonto });
  if ((r.bauabzugsteuer === true) !== w.a5.bauabzugsteuer)
    befehle.push({ art: 'BauabzugsteuerSetzen', bauabzugsteuer: w.a5.bauabzugsteuer });
  return befehle;
}
