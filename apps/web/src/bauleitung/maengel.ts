// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 120: die reine Logik der Mängelseite. Der Rand liest de-DE-Daten (N4) und baut daraus Befehle für `bauleitung`
// (A5); eine Eingabe, die nicht lesbar ist, ist ein Feldfehler und kommt nie in einen Befehl. Die Regeln (Statustabelle,
// Fristprüfung, Auswertung) stehen in `bauleitung`, hier wird nur gelesen, gefiltert und formatiert. Kein `Date.now()`:
// der Stichtag kommt aus der Uhr der App (A2, `datumAusUhr`).

import {
  mangelstatus,
  statuswechselZulaessig,
  type Auftragnehmerangabe,
  type Fristbefundcode,
} from '@tethys/bauleitung';
import type { VergleichsSpalte, VergleichsZelle, VergleichsZeile, KennzeichenText } from '@tethys/ui-grid';
import {
  IFC_GLOBALID_MUSTER,
  type AuftragsLeistungsverzeichnisId,
  type Bauwerksmodell,
  type BauwerksmodellId,
  type BauwerksmodellUebersicht,
  type Ergebnis,
  type IdQuelle,
  type IfcGlobalId,
  type Knoten,
  type Mangel,
  type MangelAnlegen,
  type MangelangabenSetzen,
  type MangelBefehl,
  type Mangelstatus,
  type PositionId,
  type ProjektId,
  type Pruefbefund,
} from '@tethys/vertrag';
import { ifcKlassenName } from '../bim/texte';
import { datumDe, datumLesen } from '../lv/kopfdaten';
import { ozText } from '../lv/oztext';
import type { Feldfehlerkarte } from '../ui/feldfehler';
import { STATUS_TEXT, texte } from './texte';

// --- Auftragnehmer ---------------------------------------------------------------------------------------------------

/** Kopf eines Auftrags-LV, soweit die Mängelseite ihn liest. */
export interface AuftragKopf {
  readonly id: AuftragsLeistungsverzeichnisId;
  readonly name: string;
  readonly auftragnehmer?: { readonly name: string | null } | undefined;
}

/**
 * Der Name des Auftragnehmers je Auftrags-LV: `AuftragsLvKopf.auftragnehmer.name` (der Zuschlag setzt ihn aus dem Bieter), sonst
 * der Name des Auftrags-LV. Reihenfolge wie übergeben (Name des Repositorys).
 */
export function auftragnehmerAngaben(auftraege: readonly AuftragKopf[]): Auftragnehmerangabe[] {
  return auftraege.map((a) => {
    const n = a.auftragnehmer?.name?.trim() ?? '';
    return { auftragsLvId: a.id, auftragnehmer: n === '' ? a.name : n };
  });
}

export const namenJeAuftrag = (angaben: readonly Auftragnehmerangabe[]): Record<string, string> =>
  Object.fromEntries(angaben.map((a) => [a.auftragsLvId, a.auftragnehmer]));

/** Die Namen der Auftragnehmer ohne Wiederholung, deutsch geordnet (zwei Aufträge derselben Firma sind eine Auswahl). */
export function auftragnehmerNamen(angaben: readonly Auftragnehmerangabe[]): string[] {
  const k = new Intl.Collator('de-DE');
  return [...new Set(angaben.map((a) => a.auftragnehmer))].sort((a, b) => k.compare(a, b));
}

// --- Filter ------------------------------------------------------------------------------------------------------------

export const ALLE = 'alle';
export const OHNE = 'ohne';

export interface MangelFilter {
  readonly status: Mangelstatus | typeof ALLE;
  /** Name des Auftragnehmers, `ALLE` oder `OHNE` (Mängel ohne Auftrags-LV). */
  readonly auftragnehmer: string;
}

export const KEIN_FILTER: MangelFilter = { status: ALLE, auftragnehmer: ALLE };

export function filtern(
  maengel: readonly Mangel[],
  filter: MangelFilter,
  namen: Readonly<Record<string, string>>,
): Mangel[] {
  return maengel.filter((m) => {
    if (filter.status !== ALLE && mangelstatus(m) !== filter.status) return false;
    if (filter.auftragnehmer === ALLE) return true;
    const name = m.auftragsLvId === null ? undefined : namen[m.auftragsLvId];
    return filter.auftragnehmer === OHNE ? name === undefined : name === filter.auftragnehmer;
  });
}

/** Beschreibung des Filters für den Kopf der Mängelliste; `null`: ungefiltert. */
export function filterBeschreibung(filter: MangelFilter): string | null {
  const teile: string[] = [];
  if (filter.status !== ALLE) teile.push(`Status: ${STATUS_TEXT[filter.status]}`);
  if (filter.auftragnehmer !== ALLE)
    teile.push(
      `Auftragnehmer: ${filter.auftragnehmer === OHNE ? texte.maengel.ohneAuftragnehmer : filter.auftragnehmer}`,
    );
  return teile.length === 0 ? null : teile.join('; ');
}

/**
 * Die Mängel für eine Mängelanzeige an einen Auftragnehmer (D-120.4): seine Mängel, die schon angezeigt wurden (ein Eintrag
 * `angezeigt` im Verlauf) und noch nicht als beseitigt gemeldet sind (Status angezeigt, oder wieder offen nach einer
 * Anzeige). So behält ein wieder geöffneter Mangel die Frist seiner Anzeige (D-66).
 */
export function fuerAnzeige(
  maengel: readonly Mangel[],
  namen: Readonly<Record<string, string>>,
  auftragnehmer: string,
): Mangel[] {
  return maengel.filter((m) => {
    if (m.auftragsLvId === null || namen[m.auftragsLvId] !== auftragnehmer) return false;
    const status = mangelstatus(m);
    return (status === 'offen' || status === 'angezeigt') && m.verlauf.some((e) => e.status === 'angezeigt');
  });
}

// --- Ansicht im Vergleichsgrid -----------------------------------------------------------------------------------------

export const KENNZEICHEN_TEXTE: Readonly<Record<string, KennzeichenText>> = {
  hinweis: { symbol: '⚠', beschreibung: texte.maengel.ueberfaelligBeschreibung },
};

const zelle = (text: string, extra: Omit<VergleichsZelle, 'text'> = {}): VergleichsZelle => ({
  text,
  ...extra,
});
const tag = (d: string | null): string => (d === null ? texte.maengel.keinWert : datumDe(d));

export const SPALTEN: readonly VergleichsSpalte[] = [
  { id: 'nummer', kopf: texte.maengel.spalten.nummer, ausrichtung: 'rechts', breite: 64 },
  { id: 'titel', kopf: texte.maengel.spalten.titel, breite: 260 },
  { id: 'ort', kopf: texte.maengel.spalten.ort, breite: 200 },
  { id: 'auftragnehmer', kopf: texte.maengel.spalten.auftragnehmer, breite: 200 },
  { id: 'festgestellt', kopf: texte.maengel.spalten.festgestellt, ausrichtung: 'rechts', breite: 110 },
  { id: 'frist', kopf: texte.maengel.spalten.frist, ausrichtung: 'rechts', breite: 110 },
  { id: 'status', kopf: texte.maengel.spalten.status, breite: 110 },
  { id: 'ueberfaellig', kopf: texte.maengel.spalten.ueberfaellig, breite: 120 },
];

/** Die Zeilen der Mängelliste; `ueberfaellig` sind die Kennungen der Mängel mit einem Befund der Fristprüfung. */
export function maengelZeilen(
  maengel: readonly Mangel[],
  namen: Readonly<Record<string, string>>,
  ueberfaellig: ReadonlySet<string>,
): VergleichsZeile[] {
  return maengel.map((m) => ({
    id: m.id,
    art: 'position',
    tiefe: 0,
    hatUnterknoten: false,
    aufgeklappt: false,
    zellen: {
      nummer: zelle(String(m.nummer)),
      titel: zelle(m.titel),
      ort: zelle(m.ort ?? texte.maengel.keinWert),
      auftragnehmer: zelle(
        m.auftragsLvId === null ? texte.maengel.keinWert : (namen[m.auftragsLvId] ?? texte.maengel.keinWert),
      ),
      festgestellt: zelle(tag(m.festgestellt)),
      frist: zelle(tag(m.frist)),
      status: zelle(STATUS_TEXT[mangelstatus(m)]),
      ueberfaellig: ueberfaellig.has(m.id)
        ? zelle(texte.maengel.ueberfaelligText, { kennzeichen: ['hinweis'] })
        : zelle(''),
    },
  }));
}

/** Die Kennungen der überfälligen Mängel aus den Befunden der Fristprüfung. */
export function ueberfaelligeIds(befunde: readonly Pruefbefund[]): Set<string> {
  const ids = new Set<string>();
  for (const b of befunde) {
    const ort: { mangelId?: string } = b.ort;
    // Ticket 122 (PB6): nur „Frist überschritten“ heißt überfällig; „angezeigt ohne Frist“ ist ein eigener Befund.
    if (b.quelle === 'fristpruefung' && b.code === UEBERFAELLIG && ort.mangelId !== undefined)
      ids.add(ort.mangelId);
  }
  return ids;
}

/** Der Code der Fristprüfung für einen überfälligen Mangel (`Fristbefundcode` in `bauleitung`). */
const UEBERFAELLIG: Fristbefundcode = 'mangel-frist-ueberschritten';

/** Der Text eines Befunds der Fristprüfung in der Liste der Seite (Ticket 122, PB6): je Code ein eigener, de-DE (N4). */
export function fristbefundText(
  b: Pruefbefund,
  m: Pick<Mangel, 'nummer' | 'titel' | 'frist'>,
  stichtag: string,
): string {
  const t = texte.maengel;
  return b.code === UEBERFAELLIG
    ? t.befund(m.nummer, m.titel, datumDe(m.frist ?? ''), datumDe(stichtag))
    : t.befundOhneFrist(m.nummer, m.titel);
}

// --- Auswahl der Position und des Bauteils (Ticket 155: gewählt, nicht getippt) ---------------------------------------

/** Ein Eintrag einer Auswahlliste des Formulars. */
export interface Auswahlwert {
  readonly wert: string;
  readonly label: string;
}

/** Die Positionen eines Auftrags-LV als Auswahl: OZ (mit Index) und Kurztext, in der Reihenfolge des LV. */
export function positionswahl(knoten: readonly Knoten[]): Auswahlwert[] {
  const liste: Auswahlwert[] = [];
  for (const k of knoten) {
    if (k.art !== 'position') continue;
    const label = [ozText(k), k.kurztext.trim()].filter((x) => x !== '').join(' ');
    liste.push({ wert: k.id, label: label === '' ? texte.formular.positionOhneOz : label });
  }
  return liste;
}

/**
 * Die Bauteile eines Bauwerksmodells als Auswahl: Name, Klasse und Strukturknoten (etwa das Geschoss), in der Reihenfolge des
 * Modells. Jede GlobalId einmal; maßgeblich ist das erste Bauteil (D-66).
 */
export function bauteilwahl(modell: Pick<Bauwerksmodell, 'bauteile' | 'struktur'>): Auswahlwert[] {
  const struktur = new Map(modell.struktur.map((k) => [k.globalId as string, k.name]));
  const gesehen = new Set<string>();
  const liste: Auswahlwert[] = [];
  for (const b of modell.bauteile) {
    if (gesehen.has(b.globalId)) continue;
    gesehen.add(b.globalId);
    const ort = b.strukturGlobalId === null ? null : (struktur.get(b.strukturGlobalId) ?? null);
    const teile = [b.name?.trim() || texte.formular.bauteilOhneNamen, ifcKlassenName(b.ifcKlasse), ort];
    liste.push({ wert: b.globalId, label: teile.filter((x) => x !== null && x !== '').join(' · ') });
  }
  return liste;
}

/**
 * Was eine Auswahl aus einer langen Liste zeigt: die Einträge, deren Text den Suchtext enthält (ohne Groß- und
 * Kleinschreibung), höchstens `grenze` davon; der gewählte Eintrag bleibt immer in der Liste. `treffer`: alle passenden.
 */
export function suchauswahl(
  optionen: readonly Auswahlwert[],
  suche: string,
  wert: string,
  grenze: number,
): { readonly optionen: readonly Auswahlwert[]; readonly treffer: number } {
  const s = suche.trim().toLocaleLowerCase('de-DE');
  const passend = s === '' ? optionen : optionen.filter((o) => o.label.toLocaleLowerCase('de-DE').includes(s));
  const gezeigt = passend.slice(0, grenze);
  const gewaehlt = optionen.find((o) => o.wert === wert);
  if (gewaehlt !== undefined && !gezeigt.includes(gewaehlt)) gezeigt.push(gewaehlt);
  return { optionen: gezeigt, treffer: passend.length };
}

/** Der zuletzt eingelesene Stand des Projekts (Bauteilauswahl „in jedem Modellstand“); `null` ohne Modell. */
export function neuesterStand(modelle: readonly BauwerksmodellUebersicht[]): BauwerksmodellId | null {
  let neu: BauwerksmodellUebersicht | null = null;
  for (const m of modelle) if (neu === null || m.eingelesen > neu.eingelesen) neu = m;
  return neu?.id ?? null;
}

// --- Formular --------------------------------------------------------------------------------------------------------

/** Alle Felder als Text, wie sie im Formular stehen. */
export interface MangelEntwurf {
  readonly nummer: string;
  readonly titel: string;
  readonly beschreibung: string;
  readonly ort: string;
  /** Kennung des Auftrags-LV; `''`: keines. */
  readonly auftragsLvId: string;
  /** Kennung der Position im Auftrags-LV (aus der Auswahl); `''`: keine. */
  readonly positionId: string;
  /** Kennung des Modells; `''`: in jedem Modellstand. */
  readonly modellId: string;
  readonly globalId: string;
  readonly festgestellt: string;
  readonly frist: string;
}

export type MangelFeld = keyof MangelEntwurf;
export type Feldfehler = Feldfehlerkarte<MangelFeld>;

export function leererEntwurf(nummer: number, heute: string): MangelEntwurf {
  return {
    nummer: String(nummer),
    titel: '',
    beschreibung: '',
    ort: '',
    auftragsLvId: '',
    positionId: '',
    modellId: '',
    globalId: '',
    festgestellt: datumDe(heute),
    frist: '',
  };
}

export function entwurfAusMangel(m: Mangel): MangelEntwurf {
  return {
    nummer: String(m.nummer),
    titel: m.titel,
    beschreibung: m.beschreibung ?? '',
    ort: m.ort ?? '',
    auftragsLvId: m.auftragsLvId ?? '',
    positionId: m.positionId ?? '',
    modellId: m.bauteil?.bauwerksmodellId ?? '',
    globalId: m.bauteil?.globalId ?? '',
    festgestellt: datumDe(m.festgestellt),
    frist: m.frist === null ? '' : datumDe(m.frist),
  };
}

type Angaben = Omit<MangelangabenSetzen, 'art'>;

const leerZuNull = (t: string): string | null => (t.trim() === '' ? null : t.trim());

/**
 * Liest die Angaben aus dem Entwurf. `positionen`: die Kennungen der Positionen des gewählten Auftrags-LV (`null`: es ist
 * keines gewählt oder noch nicht geladen). `ersterEintrag`: Datum des ersten Verlaufseintrags (beim Bearbeiten); die Feststellung
 * liegt nicht danach.
 */
export function angabenLesen(
  e: MangelEntwurf,
  positionen: ReadonlySet<string> | null,
  ersterEintrag: string | null,
): Ergebnis<Angaben, Feldfehler> {
  const fehler: { -readonly [K in MangelFeld]?: string } = {};
  const titel = e.titel.trim();
  if (titel === '') fehler.titel = texte.formular.titelFehlt;
  const festgestellt = datumLesen(e.festgestellt);
  if (e.festgestellt.trim() === '' || !festgestellt.ok)
    fehler.festgestellt = texte.formular.festgestelltFehlt;
  else if (ersterEintrag !== null && festgestellt.wert > ersterEintrag)
    fehler.festgestellt = texte.formular.festgestelltNachVerlauf(datumDe(ersterEintrag));
  let frist: string | null = null;
  if (e.frist.trim() !== '') {
    const f = datumLesen(e.frist);
    if (f.ok) frist = f.wert;
    else fehler.frist = f.fehler;
  }
  const auftragsLvId = e.auftragsLvId === '' ? null : (e.auftragsLvId as AuftragsLeistungsverzeichnisId);
  let positionId: PositionId | null = null;
  if (e.positionId !== '') {
    if (auftragsLvId === null) fehler.positionId = texte.formular.positionOhneAuftrag;
    else if (positionen?.has(e.positionId) !== true) fehler.positionId = texte.formular.positionUnbekannt;
    else positionId = e.positionId as PositionId;
  }
  let bauteil: Angaben['bauteil'] = null;
  if (e.globalId.trim() !== '') {
    const g = e.globalId.trim();
    if (!IFC_GLOBALID_MUSTER.test(g)) fehler.globalId = texte.formular.globalIdFehler;
    else
      bauteil = {
        bauwerksmodellId: e.modellId === '' ? null : (e.modellId as BauwerksmodellId),
        globalId: g as IfcGlobalId,
      };
  }
  if (Object.keys(fehler).length > 0 || !festgestellt.ok) return { ok: false, fehler };
  return {
    ok: true,
    wert: {
      titel,
      beschreibung: leerZuNull(e.beschreibung),
      ort: leerZuNull(e.ort),
      auftragsLvId,
      positionId,
      bauteil,
      festgestellt: festgestellt.wert,
      frist,
    },
  };
}

/** Der Befehl `MangelAnlegen` aus dem Entwurf: Verlauf mit `offen` am Tag der Feststellung. */
export function mangelAnlegenBefehl(
  ids: IdQuelle,
  projektId: ProjektId,
  e: MangelEntwurf,
  positionen: ReadonlySet<string> | null,
  vergebeneNummern: readonly number[],
): Ergebnis<MangelAnlegen, Feldfehler> {
  const a = angabenLesen(e, positionen, null);
  const fehler: { -readonly [K in MangelFeld]?: string } = a.ok ? {} : { ...a.fehler };
  const nummer = /^\d{1,9}$/.test(e.nummer.trim()) ? Number(e.nummer.trim()) : 0;
  if (nummer < 1) fehler.nummer = texte.formular.nummerFehler;
  else if (vergebeneNummern.includes(nummer)) fehler.nummer = texte.formular.nummerVergeben;
  if (!a.ok || Object.keys(fehler).length > 0) return { ok: false, fehler };
  return {
    ok: true,
    wert: {
      art: 'MangelAnlegen',
      mangel: {
        id: ids.mangel(),
        projektId,
        nummer,
        ...a.wert,
        verlauf: [{ status: 'offen', datum: a.wert.festgestellt, bemerkung: null }],
      },
    },
  };
}

/** Der Befehl `MangelangabenSetzen` aus dem Entwurf; `null`, wenn sich nichts ändert. */
export function mangelAngabenBefehl(
  e: MangelEntwurf,
  positionen: ReadonlySet<string> | null,
  mangel: Mangel,
): Ergebnis<MangelangabenSetzen | null, Feldfehler> {
  const a = angabenLesen(e, positionen, mangel.verlauf[0]?.datum ?? null);
  if (!a.ok) return a;
  const gleich =
    a.wert.titel === mangel.titel &&
    a.wert.beschreibung === mangel.beschreibung &&
    a.wert.ort === mangel.ort &&
    a.wert.auftragsLvId === mangel.auftragsLvId &&
    a.wert.positionId === mangel.positionId &&
    JSON.stringify(a.wert.bauteil) === JSON.stringify(mangel.bauteil) &&
    a.wert.festgestellt === mangel.festgestellt &&
    a.wert.frist === mangel.frist;
  return { ok: true, wert: gleich ? null : { art: 'MangelangabenSetzen', ...a.wert } };
}

// --- Statusaktionen ----------------------------------------------------------------------------------------------------

export type Statusaktion = 'anzeigen' | 'beseitigt' | 'abnehmen' | 'oeffnen';

export const AKTIONEN: readonly Statusaktion[] = ['anzeigen', 'beseitigt', 'abnehmen', 'oeffnen'];

/** Der Status, zu dem die Aktion wechselt (Tabelle der Wechsel: `bauleitung`). */
export const AKTION_NACH: Readonly<Record<Statusaktion, Mangelstatus>> = {
  anzeigen: 'angezeigt',
  beseitigt: 'beseitigt',
  abnehmen: 'abgenommen',
  oeffnen: 'offen',
};

export const aktionMoeglich = (m: Mangel, aktion: Statusaktion): boolean =>
  statuswechselZulaessig(mangelstatus(m), AKTION_NACH[aktion]);

export interface StatusEntwurf {
  readonly datum: string;
  readonly frist: string;
  readonly bemerkung: string;
}

export type Statusfehler = Partial<Record<keyof StatusEntwurf, string>>;

/**
 * Die Befehle einer Statusaktion, ein Undo-Schritt (`Sitzung.folge`): der Verlaufseintrag und, bei „Mangel anzeigen“, die
 * neue Frist im Eintrag (D-66) und am Mangel (`MangelangabenSetzen`). Das Datum liegt nicht vor dem letzten Eintrag.
 */
export function statusBefehle(
  m: Mangel,
  aktion: Statusaktion,
  e: StatusEntwurf,
): Ergebnis<MangelBefehl[], Statusfehler> {
  const fehler: { -readonly [K in keyof StatusEntwurf]?: string } = {};
  const datum = datumLesen(e.datum);
  const letzter = m.verlauf.at(-1);
  if (e.datum.trim() === '') fehler.datum = texte.aktion.datumFehlt;
  else if (!datum.ok) fehler.datum = datum.fehler;
  else if (letzter !== undefined && datum.wert < letzter.datum)
    fehler.datum = texte.aktion.datumVorLetztem(datumDe(letzter.datum));
  let frist: string | null = null;
  if (aktion === 'anzeigen') {
    const f = datumLesen(e.frist);
    if (e.frist.trim() === '') fehler.frist = texte.aktion.fristFehlt;
    else if (!f.ok) fehler.frist = f.fehler;
    else frist = f.wert;
  }
  if (Object.keys(fehler).length > 0 || !datum.ok) return { ok: false, fehler };
  const bemerkung = leerZuNull(e.bemerkung);
  const befehle: MangelBefehl[] = [
    {
      art: 'MangelstatusSetzen',
      eintrag: {
        status: AKTION_NACH[aktion],
        datum: datum.wert,
        bemerkung,
        ...(frist === null ? {} : { frist }),
      },
    },
  ];
  if (frist !== null && frist !== m.frist)
    befehle.push({
      art: 'MangelangabenSetzen',
      titel: m.titel,
      beschreibung: m.beschreibung,
      ort: m.ort,
      auftragsLvId: m.auftragsLvId,
      positionId: m.positionId,
      bauteil: m.bauteil,
      festgestellt: m.festgestellt,
      frist,
    });
  return { ok: true, wert: befehle };
}

/** Die Zeilen des Verlaufs für die Anzeige, ältester zuerst. */
export function verlaufZeilen(m: Mangel): string[] {
  return m.verlauf.map((v) =>
    texte.maengel.verlaufEintrag(
      datumDe(v.datum),
      STATUS_TEXT[v.status],
      v.bemerkung,
      v.frist === undefined ? null : datumDe(v.frist),
    ),
  );
}
