// SPDX-License-Identifier: AGPL-3.0-or-later
// Ansicht eines Bauzeitenplans (Ticket 118): Plan und Ergebnis der Terminrechnung → Spalten und Zeilen des Vergleichsgrids
// mit der Balkenspalte (Ticket 96), Kopfzeile (Projektbeginn, Projektende, kritischer Weg) und die Befunde je Schwere. Die
// Termine rechnet `bauzeit` (A2), die Zeitachse liefert `zeitachseBerechnen`; hier wird nur formatiert (N4, de-DE).

import {
  BAUZEIT_ANNAHMEN,
  KRITISCHE_WEGE_HOECHSTENS,
  balkenlage,
  datumPruefen,
  tagesindex,
  zeitachseBerechnen,
  type Bauzeitbefundcode,
  type Bauzeitenplanergebnis,
  type Datum,
  type Zeitachse,
} from '@tethys/bauzeit';
import { formatiereProzentDe } from '@tethys/dezimal';
import type { Balken, VergleichsSpalte, VergleichsZeile, VergleichsZelle, Zeitleiste } from '@tethys/ui-grid';
import type {
  Bauzeitenplan,
  Befundschwere,
  Pruefbefund,
  Vorgang,
  VorgangId,
  Vorgangsart,
} from '@tethys/vertrag';
import { datumDe } from '../lv/kopfdaten';
import { texte } from './texte';

const STRICH = '–';
/** Tage vor dem ersten und nach dem letzten Termin, damit Balken nicht am Rand kleben. */
const RAND_TAGE = 7;
const PIXEL_JE_TAG = 18;

export interface Befundeintrag {
  readonly befund: Pruefbefund;
  /** Nummer und Bezeichnung des Vorgangs; `null` bei einem Befund zum Plan. */
  readonly ort: string | null;
  readonly vorgangId: VorgangId | null;
  /** Der Text für Planseite und PDF (Ticket 122, D-122.1); nie die Meldung der Rechnung. */
  readonly text: string;
}

export interface Befundgruppe {
  readonly schwere: Befundschwere;
  readonly eintraege: readonly Befundeintrag[];
}

export interface PlanAnsicht {
  readonly spalten: readonly VergleichsSpalte[];
  readonly zeilen: readonly VergleichsZeile[];
  readonly kopf: {
    readonly projektbeginn: string;
    readonly projektende: string;
    readonly kritischerWeg: string;
  };
  readonly befunde: readonly Befundgruppe[];
}

export const vorgangName = (v: Vorgang): string =>
  v.nummer === null ? v.bezeichnung : `${v.nummer} ${v.bezeichnung}`;

/** Datum um `tage` Kalendertage verschoben (nur für den Rand der Achse; gerechnet in UTC, kein Arbeitskalender). */
function verschoben(datum: Datum, tage: number): Datum {
  const [j, m, d] = datum.split('-').map(Number) as [number, number, number];
  const x = new Date(Date.UTC(j, m - 1, d + tage));
  const r = datumPruefen(x.toISOString().slice(0, 10));
  return r.ok ? r.wert : datum;
}

function geprueft(text: string | null | undefined): Datum | null {
  if (text === null || text === undefined) return null;
  const r = datumPruefen(text);
  return r.ok ? r.wert : null;
}

function achseFuer(plan: Bauzeitenplan, ergebnis: Bauzeitenplanergebnis): Zeitachse | null {
  const daten: Datum[] = [];
  const dazu = (d: Datum | null): void => {
    if (d !== null) daten.push(d);
  };
  dazu(ergebnis.projektbeginn ?? geprueft(plan.projektbeginn));
  dazu(ergebnis.projektende);
  for (const r of ergebnis.vorgaenge) {
    dazu(r.termine?.beginn ?? null);
    dazu(r.termine?.ende ?? null);
  }
  for (const v of plan.vorgaenge) {
    dazu(geprueft(v.ist?.beginn));
    dazu(geprueft(v.ist?.ende));
  }
  if (daten.length === 0) return null;
  const sortiert = [...daten].sort();
  const erster = sortiert[0] as Datum;
  const letzter = sortiert.at(-1) as Datum;
  const von =
    ergebnis.projektbeginn !== null && erster === ergebnis.projektbeginn
      ? erster
      : verschoben(erster, -RAND_TAGE);
  const a = zeitachseBerechnen(von, verschoben(letzter, RAND_TAGE), plan.kalender);
  return a.ok ? a.wert : null;
}

function zeitleiste(achse: Zeitachse | null, projektende: Datum | null): Zeitleiste {
  if (achse === null) return { tage: 1, pixelJeTag: PIXEL_JE_TAG, kopf: [] };
  return {
    tage: achse.tage,
    pixelJeTag: PIXEL_JE_TAG,
    kopf: achse.monate.map((m) => ({
      text: texte.monat(m.jahr, m.monat),
      vonTag: m.vonTag,
      bisTag: m.bisTag,
    })),
    unterkopf: achse.kalenderwochen.map((w) => ({
      text: texte.kalenderwoche(w.woche),
      vonTag: w.vonTag,
      bisTag: w.bisTag,
    })),
    freieTage: achse.freieTage,
    markierungen:
      projektende === null
        ? []
        : [
            {
              tag: tagesindex(achse, projektende) + 1,
              art: 'projektende',
              beschreibung: texte.balken.projektende(datumDe(projektende)),
            },
          ],
  };
}

function balken(
  v: Vorgang,
  art: Vorgangsart,
  termine: Bauzeitenplanergebnis['vorgaenge'][number]['termine'],
  achse: Zeitachse | null,
): Balken | undefined {
  if (termine === null || achse === null) return undefined;
  const t = texte.balken;
  const teile =
    art === 'meilenstein'
      ? [t.meilenstein(datumDe(termine.beginn))]
      : [
          t.vonBis(datumDe(termine.beginn), datumDe(termine.ende)),
          art === 'sammelvorgang' ? t.sammelvorgang : texte.arbeitstage(v.dauer),
        ];
  teile.push(termine.kritisch ? t.kritisch : t.puffer(termine.gesamtpuffer));
  const istBeginn = geprueft(v.ist?.beginn);
  const istEnde = geprueft(v.ist?.ende) ?? istBeginn;
  const fortschritt = v.ist?.fortschritt ?? null;
  if (istBeginn !== null && istEnde !== null) teile.push(t.ist(datumDe(istBeginn), datumDe(istEnde)));
  if (fortschritt !== null) teile.push(t.fortschritt(formatiereProzentDe(fortschritt)));
  return {
    ...balkenlage(achse, termine.beginn, termine.ende, art),
    art,
    kritisch: termine.kritisch,
    ...(fortschritt === null ? {} : { fortschritt: Number(fortschritt) }), // Anzeige-Anteil der Balkenspalte, kein Rechenwert
    ...(istBeginn !== null && istEnde !== null && istEnde >= istBeginn
      ? { ist: { vonTag: tagesindex(achse, istBeginn), bisTag: tagesindex(achse, istEnde) + 1 } }
      : {}),
    beschreibung: teile.join(', '),
  };
}

export function planAnsicht(
  plan: Bauzeitenplan,
  ergebnis: Bauzeitenplanergebnis,
  zugeklappt: ReadonlySet<string>,
): PlanAnsicht {
  const t = texte.spalten;
  const nachId = new Map(plan.vorgaenge.map((v) => [v.id, v]));
  const ergebnisse = new Map(ergebnis.vorgaenge.map((r) => [r.vorgangId, r]));
  const hatKinder = new Set(plan.vorgaenge.flatMap((v) => (v.elternId === null ? [] : [v.elternId])));
  const achse = achseFuer(plan, ergebnis);

  const spalten: VergleichsSpalte[] = [
    { id: 'nummer', kopf: t.nummer, breite: 70 },
    { id: 'vorgang', kopf: t.vorgang, breite: 240 },
    { id: 'dauer', kopf: t.dauer, breite: 100, ausrichtung: 'rechts' },
    { id: 'beginn', kopf: t.beginn, breite: 96, ausrichtung: 'rechts' },
    { id: 'ende', kopf: t.ende, breite: 96, ausrichtung: 'rechts' },
    { id: 'puffer', kopf: t.puffer, breite: 110, ausrichtung: 'rechts' },
    { id: 'balken', kopf: texte.plan.zeitplan, zeitleiste: zeitleiste(achse, ergebnis.projektende) },
  ];

  // Tiefe und Sichtbarkeit in Dokumentreihenfolge (Elternteil steht immer davor).
  const tiefe = new Map<VorgangId, number>();
  const verborgen = new Set<VorgangId>();
  const zeilen: VergleichsZeile[] = [];
  for (const v of plan.vorgaenge) {
    const eltern = v.elternId === null ? undefined : nachId.get(v.elternId);
    const ebene = eltern === undefined ? 0 : (tiefe.get(eltern.id) ?? 0) + 1;
    tiefe.set(v.id, ebene);
    if (eltern !== undefined && (verborgen.has(eltern.id) || zugeklappt.has(eltern.id))) {
      verborgen.add(v.id);
      continue;
    }
    const r = ergebnisse.get(v.id);
    const art: Vorgangsart =
      r?.art ?? (hatKinder.has(v.id) ? 'sammelvorgang' : v.dauer === 0 ? 'meilenstein' : 'vorgang');
    const termine = r?.termine ?? null;
    const b = balken(v, art, termine, achse);
    const zellen: Record<string, VergleichsZelle> = {
      nummer: { text: v.nummer ?? '' },
      vorgang: { text: v.bezeichnung, ...(termine?.kritisch === true ? { kennzeichen: ['kritisch'] } : {}) },
      dauer:
        art === 'sammelvorgang'
          ? { text: '' }
          : art === 'meilenstein'
            ? { text: texte.meilenstein, tooltip: BAUZEIT_ANNAHMEN.meilenstein }
            : { text: String(v.dauer) },
      beginn: { text: termine === null ? STRICH : datumDe(termine.beginn) },
      ende: { text: termine === null ? STRICH : datumDe(termine.ende) },
      puffer: { text: termine === null ? STRICH : String(termine.gesamtpuffer) },
      balken: { text: '', ...(b === undefined ? {} : { balken: b }) },
    };
    const sammel = hatKinder.has(v.id);
    zeilen.push({
      id: v.id,
      art: sammel ? 'gliederung' : 'position',
      tiefe: ebene,
      hatUnterknoten: sammel,
      aufgeklappt: sammel && !zugeklappt.has(v.id),
      zellen,
    });
  }

  const name = (id: VorgangId): string => {
    const v = nachId.get(id);
    return v === undefined ? STRICH : (v.nummer ?? v.bezeichnung);
  };
  const kritischerWeg =
    ergebnis.kritischeWege.length === 0
      ? texte.plan.keinWeg
      : ergebnis.kritischeWege.map((w) => w.map(name).join(' → ')).join('; ');

  const eintraege = befundEintraege(plan, ergebnis);
  const befunde = (['fehler', 'warnung'] as const).map((schwere) => ({
    schwere,
    eintraege: eintraege.filter((e) => e.befund.schwere === schwere),
  }));

  return {
    spalten,
    zeilen,
    kopf: {
      projektbeginn: datumDe(ergebnis.projektbeginn ?? plan.projektbeginn),
      projektende: ergebnis.projektende === null ? texte.plan.nichtGerechnet : datumDe(ergebnis.projektende),
      kritischerWeg,
    },
    befunde,
  };
}

/** Der Vorgänger einer Anordnungsbeziehung aus dem Pfad `/vorgaenge[n]/vorgaenger[m]` (D-66, beide ab 1). */
function vorgaengerAusPfad(
  plan: Bauzeitenplan,
  nachId: ReadonlyMap<VorgangId, Vorgang>,
  pfad: string | undefined,
): Vorgang | undefined {
  const m = pfad === undefined ? null : /^\/vorgaenge\[(\d+)\]\/vorgaenger\[(\d+)\]$/.exec(pfad);
  if (m?.[1] === undefined || m[2] === undefined) return undefined;
  const beziehung = plan.vorgaenge[Number(m[1]) - 1]?.vorgaenger[Number(m[2]) - 1];
  return beziehung === undefined ? undefined : nachId.get(beziehung.vorgaengerId);
}

/** Der Text eines Befunds aus Code und Ort; Vorgänge über Nummer und Bezeichnung (N4, L1: nur formatiert, nichts geprüft). */
function befundText(
  befund: Pruefbefund,
  plan: Bauzeitenplan,
  nachId: ReadonlyMap<VorgangId, Vorgang>,
): string {
  const t = texte.befunde.texte;
  const v = vorgaengerAusPfad(plan, nachId, befund.ort.pfad);
  const vorgaenger = v === undefined ? null : vorgangName(v);
  const code = befund.code as Bauzeitbefundcode;
  switch (code) {
    case 'projektbeginn-ungueltig':
      return t.projektbeginnUngueltig;
    case 'kalender-ohne-arbeitstage':
      return t.kalenderOhneArbeitstage;
    case 'arbeitstag-ungueltig':
      return t.arbeitstagUngueltig;
    case 'bundesland-unbekannt':
      return t.bundeslandUnbekannt(plan.kalender.bundesland);
    case 'freier-tag-ungueltig':
      return t.freierTagUngueltig;
    case 'id-doppelt':
      return t.idDoppelt;
    case 'eltern-unbekannt':
      return t.elternUnbekannt;
    case 'eltern-zyklus':
      return t.elternZyklus;
    case 'dauer-ungueltig':
      return t.dauerUngueltig;
    case 'terminvorgabe-ungueltig':
      return t.terminvorgabeUngueltig;
    case 'terminvorgabe-an-sammelvorgang':
      return t.terminvorgabeAnSammelvorgang;
    case 'ist-ungueltig':
      return t.istUngueltig;
    case 'vorgaenger-unbekannt':
      return t.vorgaengerUnbekannt;
    case 'anordnungsart-unbekannt':
      return t.anordnungsartUnbekannt(vorgaenger);
    case 'abstand-ungueltig':
      return t.abstandUngueltig(vorgaenger);
    case 'beziehung-an-sammelvorgang':
      return t.beziehungAnSammelvorgang(vorgaenger);
    case 'zyklus':
      return t.zyklus;
    case 'vorgaenger-ohne-termine':
      return t.vorgaengerOhneTermine(vorgaenger);
    case 'termin-ausserhalb-kalender':
      return befund.ort.feld === 'projektbeginn'
        ? t.ausserhalbKalender.projektbeginn
        : befund.ort.feld === 'fruehesterBeginn'
          ? t.ausserhalbKalender.terminvorgabe
          : t.ausserhalbKalender.vorgang;
    case 'kritische-wege-gekuerzt':
      return t.kritischeWegeGekuerzt(KRITISCHE_WEGE_HOECHSTENS);
    default:
      return t.unbekannt;
  }
}

/**
 * Die Befunde der Terminrechnung für Planseite und PDF (Ticket 122, D-122.1): je Befund der Vorgang als Ort (Sprungziel) und
 * ein eigener de-DE-Text je Code; die Meldung der Rechnung (Kennungen, kanonische Zahlen) erscheint nie.
 */
export function befundEintraege(
  plan: Bauzeitenplan,
  ergebnis: Pick<Bauzeitenplanergebnis, 'befunde'>,
): Befundeintrag[] {
  const nachId = new Map(plan.vorgaenge.map((v) => [v.id, v]));
  return ergebnis.befunde.map((befund) => {
    const vid = befund.ort.vorgangId;
    const v = vid === undefined ? undefined : nachId.get(vid);
    return {
      befund,
      ort: v === undefined ? null : vorgangName(v),
      vorgangId: v?.id ?? null,
      text: befundText(befund, plan, nachId),
    };
  });
}

/** Die Befunde für das PDF in der Reihenfolge der Planseite (Fehler, dann Warnungen), mit denselben Texten. */
export function befundtexteFuerDruck(
  plan: Bauzeitenplan,
  ergebnis: Pick<Bauzeitenplanergebnis, 'befunde'>,
): { schwere: Befundschwere; ort: string | null; text: string }[] {
  const eintraege = befundEintraege(plan, ergebnis);
  return (['fehler', 'warnung'] as const).flatMap((schwere) =>
    eintraege.filter((e) => e.befund.schwere === schwere).map((e) => ({ schwere, ort: e.ort, text: e.text })),
  );
}
