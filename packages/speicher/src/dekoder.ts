// SPDX-License-Identifier: AGPL-3.0-or-later
// Strenge Prüfung einer Projektdatei der aktuellen Schemaversion. Unbekannte Felder, falsche Typen,
// Gleitkommazahlen und Dezimalwerte außerhalb der kanonischen Schreibweise sind `datei-ungueltig`: eine Datei
// wird nie halb oder verlustbehaftet übernommen (Q5).
//
// Befehle im Protokoll werden nur auf `art` und JSON-Tauglichkeit geprüft; ihre fachliche Form zu prüfen ist
// Sache des Kerns.

import { langtextFormFehler } from '@tethys/kern';
import {
  BAUTEILMENGENARTEN,
  IFC_GLOBALID_MUSTER,
  IFC_SCHEMATA,
  KALENDERDATUM_MUSTER,
  KOSTENGRUPPENNUMMER_MUSTER,
  MASSENBEFEHLSARTEN,
  MODELLDATEI_HASH_MUSTER,
  NACHKOMMASTELLEN,
  STRUKTURKNOTENARTEN,
} from '@tethys/vertrag';
import type {
  Anschrift,
  Bieterangaben,
  Druckprofil,
  Einstellungen,
  Kalkulationsangaben,
  Kalkulationsansatz,
  Kostengruppenbezeichnung,
  LangtextUmfang,
  PreisspiegelEinstellungen,
  Projektangaben,
  AnrechenbareKostenangabe,
  Anordnungsart,
  Anordnungsbeziehung,
  Bautagebucheintrag,
  BautagebucheintragId,
  BautagebucheintragZustand,
  Bauteil,
  Bauteilmenge,
  Bauteilzuordnung,
  Bauwerksmodell,
  BauwerksmodellId,
  BauwerksmodellZustand,
  Bauzeitenplan,
  BauzeitenplanId,
  BauzeitenplanZustand,
  BeauftragteLeistungsphase,
  Bundesland,
  Honorarberechnung,
  HonorarberechnungId,
  HonorarberechnungZustand,
  Honorarobjekt,
  Honorarzone,
  IfcGlobalId,
  Leistungsbild,
  Leistungsphasennummer,
  Mangel,
  MangelId,
  Mangelstatus,
  Mangelverlaufseintrag,
  MangelZustand,
  Nebenkostenangabe,
  Strukturknoten,
  Vorgang,
  Vorgangsbezug,
  VorgangId,
  Wochentag,
  Angebot,
  AngebotId,
  AngebotKopf,
  AngebotZustand,
  Angebotsposition,
  Ansatzzeile,
  Aufmass,
  AufmassId,
  Aufmassposition,
  AufmassZustand,
  Auftraggeber,
  Auftragnehmer,
  AuftragsLeistungsverzeichnis,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvZustand,
  Befehl,
  Befehlsart,
  Befehlskurzfassung,
  Betrag,
  Bezugsposition,
  Bieter,
  BieterId,
  ElternId,
  Einheitspreis,
  Einheitspreisanteile,
  EpaArt,
  EpaBezeichnung,
  EpaNummer,
  Gesamtsummen,
  GliederungId,
  HinweistextId,
  Knoten,
  Kostenermittlung,
  KostenermittlungId,
  Kostenermittlungseintrag,
  Kostenermittlungsstufe,
  KostenermittlungZustand,
  Kostengruppennummer,
  Langtext,
  Leistungsverzeichnis,
  Leitbeschreibung,
  LeistungsverzeichnisId,
  LosId,
  LvStand,
  LvStandId,
  LvZustand,
  Massenbefehlsart,
  Papierkorbeintrag,
  PapierkorbeintragId,
  Menge,
  Nachlass,
  Nachtragsangaben,
  Nachtragsstatus,
  NutzerId,
  Ordnungszahl,
  OzMaske,
  OzStelle,
  PositionId,
  Positionsmerkmale,
  Projekt,
  ProjektId,
  Projektdatei,
  Protokolleintrag,
  ProtokollId,
  Prozent,
  Pruefsummenalgorithmus,
  Rechnung,
  RechnungId,
  RechnungZustand,
  Kalenderdatum,
  Zahlung,
  ZahlungId,
  Summenstand,
  TitelId,
  Umlage,
  Unterbeschreibung,
  Vergabeinformationen,
  Wahlzuordnung,
  Zahlenart,
  Zeitstempel,
  Zuschlag,
  Zuschlagsbezug,
} from '@tethys/vertrag';
import { AGGREGATART_NAMEN } from './aggregatarten';
import { einstellungenFormfehler } from './einstellungen';
import { abbruch } from './ergebnis';

// --- Grundbausteine ----------------------------------------------------------------------------------------------

type Roh = Record<string, unknown>;

const ungueltig = (pfad: string, was: string): never => abbruch('datei-ungueltig', `${pfad}: ${was}`);

/** Objekt mit genau den Pflichtfeldern `felder` und höchstens den Feldern aus `optional` (fehlt: keine Angabe). */
function objekt(x: unknown, pfad: string, felder: readonly string[], optional: readonly string[] = []): Roh {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return ungueltig(pfad, 'Objekt erwartet');
  const o = x as Roh;
  for (const f of felder) if (!Object.hasOwn(o, f)) return ungueltig(pfad, `Feld „${f}“ fehlt`);
  for (const k of Object.keys(o))
    if (!felder.includes(k) && !optional.includes(k)) return ungueltig(pfad, `unbekanntes Feld „${k}“`);
  return o;
}

/** `{ [name]: f(wert) }`, wenn das optionale Feld da ist, sonst `{}` (der Vertrag kennt nur „fehlt“, nie `undefined`). */
function optional<K extends string, T>(o: Roh, name: K, f: (v: unknown) => T): { [P in K]?: T } {
  return (Object.hasOwn(o, name) ? { [name]: f(o[name]) } : {}) as { [P in K]?: T };
}

function feld(o: Roh, name: string): unknown {
  return o[name];
}

function liste(x: unknown, pfad: string): unknown[] {
  if (!Array.isArray(x)) return ungueltig(pfad, 'Array erwartet');
  return x as unknown[];
}

function zeichenkette(x: unknown, pfad: string): string {
  if (typeof x !== 'string') return ungueltig(pfad, 'Zeichenkette erwartet');
  return x;
}

const oderNull = <T>(x: unknown, f: (v: unknown) => T): T | null => (x === null ? null : f(x));

function wahrheit(x: unknown, pfad: string): boolean {
  if (typeof x !== 'boolean') return ungueltig(pfad, 'Wahrheitswert erwartet');
  return x;
}

function ganz(x: unknown, pfad: string): number {
  if (typeof x !== 'number' || !Number.isSafeInteger(x) || x < 0) {
    return ungueltig(pfad, 'nichtnegative ganze Zahl erwartet');
  }
  return x;
}

const DEZIMAL = /^-?(0|[1-9][0-9]*)\.[0-9]+$/;

/** Dezimalwert in kanonischer Schreibweise mit der Stellenzahl des Typs (N3), ohne negative Null. */
function dezimal(x: unknown, pfad: string, art: Zahlenart): string {
  const s = zeichenkette(x, pfad);
  const stellen = NACHKOMMASTELLEN[art];
  const punkt = s.indexOf('.');
  if (!DEZIMAL.test(s) || s.length - punkt - 1 !== stellen || /^-0\.0+$/.test(s)) {
    return ungueltig(pfad, `kein kanonischer Dezimalwert mit ${String(stellen)} Nachkommastellen: „${s}“`);
  }
  return s;
}

const aufzaehlung = <T extends string>(x: unknown, pfad: string, erlaubt: readonly T[]): T => {
  const s = zeichenkette(x, pfad);
  if (!(erlaubt as readonly string[]).includes(s)) {
    return ungueltig(pfad, `„${s}“ ist keiner von ${erlaubt.join(', ')}`);
  }
  return s as T;
};

// --- Fachbausteine ------------------------------------------------------------------------------------------------

function nachlass(x: unknown, pfad: string): Nachlass | null {
  return oderNull(x, (v) => {
    const o = objekt(v, pfad, ['art', 'wert']);
    return feld(o, 'art') === 'prozent'
      ? { art: 'prozent', wert: dezimal(feld(o, 'wert'), `${pfad}.wert`, 'prozent') as Prozent }
      : {
          art: aufzaehlung(feld(o, 'art'), `${pfad}.art`, ['betrag']),
          wert: dezimal(feld(o, 'wert'), `${pfad}.wert`, 'betrag') as Betrag,
        };
  });
}

function ozStelle(x: unknown, pfad: string): OzStelle {
  const o = objekt(x, pfad, ['laenge', 'zeichen']);
  return {
    laenge: ganz(feld(o, 'laenge'), `${pfad}.laenge`),
    zeichen: aufzaehlung(feld(o, 'zeichen'), `${pfad}.zeichen`, ['numerisch', 'alphanumerisch']),
  };
}

function ozMaske(x: unknown, pfad: string): OzMaske {
  // `losStufe` ist optional (v1.1a, F1); fehlt es, ist die oberste Stufe Titel.
  const o = objekt(x, pfad, ['gliederung', 'position', 'index', 'trennzeichen'], ['losStufe']);
  return {
    gliederung: liste(feld(o, 'gliederung'), `${pfad}.gliederung`).map((s, i) =>
      ozStelle(s, `${pfad}.gliederung[${String(i)}]`),
    ),
    ...optional(o, 'losStufe', (v) => wahrheit(v, `${pfad}.losStufe`)),
    position: ozStelle(feld(o, 'position'), `${pfad}.position`),
    index: oderNull(feld(o, 'index'), (v) => ozStelle(v, `${pfad}.index`)),
    trennzeichen: oderNull(feld(o, 'trennzeichen'), (v) => zeichenkette(v, `${pfad}.trennzeichen`)),
  };
}

// --- Langtext (v1.1b, F6, E-10) -----------------------------------------------------------------------------------
//
// Gelesen wird genau die Form des Vertrags (`LangtextBaustein`), streng wie der Rest der Datei: unbekannte `art`,
// fehlende oder fremde Felder, eine Auszeichnung mit `false` (der Vertrag kennt nur `true` oder fehlend), `spalten`
// unter 1 und eine Textergänzung unterhalb der obersten Ebene sind `datei-ungueltig` mit Pfad. Die Formprüfung ist die
// des Kerns (`langtextFormFehler`, eine Stelle, Review S5): Was der Kern als Befehl annimmt, liest `speicher` zurück,
// und umgekehrt. Eine Datei der Schemaversion 1 kann damit Bausteine enthalten, die ein älterer Stand der App nicht
// liest (rückwärts lesen bleibt garantiert, vorwärts nicht; A8).

function langtext(x: unknown, pfad: string): Langtext {
  const formfehler = langtextFormFehler(x, pfad);
  return formfehler === null ? (x as Langtext) : abbruch('datei-ungueltig', formfehler);
}

function epa(x: unknown, pfad: string): Einheitspreisanteile | null {
  return oderNull(x, (v) => {
    const o = objekt(v, pfad, [
      'lohn',
      'stoffe',
      'geraete',
      'nachunternehmer',
      'sonstiges',
      'frei',
      'freiBezeichnung',
    ]);
    const ep = (n: string): Einheitspreis | null =>
      oderNull(feld(o, n), (w) => dezimal(w, `${pfad}.${n}`, 'einheitspreis') as Einheitspreis);
    return {
      lohn: ep('lohn'),
      stoffe: ep('stoffe'),
      geraete: ep('geraete'),
      nachunternehmer: ep('nachunternehmer'),
      sonstiges: ep('sonstiges'),
      frei: ep('frei'),
      freiBezeichnung: oderNull(feld(o, 'freiBezeichnung'), (w) =>
        zeichenkette(w, `${pfad}.freiBezeichnung`),
      ),
    };
  });
}

// --- Merkmale, Zuschlag, Leitbeschreibung (v1.1b, Punkte 1–3, 6; Schemaversion 2) ------------------------------

const ganzOderNull = (x: unknown, pfad: string): number | null => oderNull(x, (v) => ganz(v, pfad));
const textOderNull = (x: unknown, pfad: string): string | null => oderNull(x, (v) => zeichenkette(v, pfad));

function merkmale(x: unknown, pfad: string): Positionsmerkmale {
  const o = objekt(x, pfad, ['bedarf', 'wahl', 'stundenlohn', 'pauschal', 'zuschlagskennzeichen']);
  return {
    bedarf: oderNull(feld(o, 'bedarf'), (v) =>
      aufzaehlung(v, `${pfad}.bedarf`, ['ohne-gesamtbetrag', 'mit-gesamtbetrag'] as const),
    ),
    wahl: oderNull(feld(o, 'wahl'), (v): Wahlzuordnung => {
      const q = `${pfad}.wahl`;
      const w = objekt(v, q, ['gruppe', 'variante', 'grundpositionId']);
      return {
        gruppe: ganzOderNull(feld(w, 'gruppe'), `${q}.gruppe`),
        variante: ganzOderNull(feld(w, 'variante'), `${q}.variante`),
        grundpositionId: textOderNull(
          feld(w, 'grundpositionId'),
          `${q}.grundpositionId`,
        ) as PositionId | null,
      };
    }),
    stundenlohn: wahrheit(feld(o, 'stundenlohn'), `${pfad}.stundenlohn`),
    pauschal: wahrheit(feld(o, 'pauschal'), `${pfad}.pauschal`),
    zuschlagskennzeichen: wahrheit(feld(o, 'zuschlagskennzeichen'), `${pfad}.zuschlagskennzeichen`),
  };
}

function zuschlagsbezug(x: unknown, pfad: string): Zuschlagsbezug {
  const art = aufzaehlung(
    typeof x === 'object' && x !== null ? (x as Roh)['art'] : undefined,
    `${pfad}.art`,
    ['positionen', 'gliederung', 'kennzeichnung'] as const,
  );
  if (art !== 'positionen') {
    objekt(x, pfad, ['art']);
    return { art };
  }
  const o = objekt(x, pfad, ['art', 'positionen']);
  return {
    art,
    positionen: liste(feld(o, 'positionen'), `${pfad}.positionen`).map((b, i): Bezugsposition => {
      const q = `${pfad}.positionen[${String(i)}]`;
      const bo = objekt(b, q, ['positionId', 'teilmenge']);
      return {
        positionId: zeichenkette(feld(bo, 'positionId'), `${q}.positionId`) as PositionId,
        teilmenge: oderNull(feld(bo, 'teilmenge'), (v) => dezimal(v, `${q}.teilmenge`, 'menge') as Menge),
      };
    }),
  };
}

function zuschlag(x: unknown, pfad: string): Zuschlag | null {
  return oderNull(x, (v) => {
    const o = objekt(v, pfad, ['prozentsatz', 'bezug']);
    return {
      prozentsatz: oderNull(
        feld(o, 'prozentsatz'),
        (w) => dezimal(w, `${pfad}.prozentsatz`, 'prozent') as Prozent,
      ),
      bezug: zuschlagsbezug(feld(o, 'bezug'), `${pfad}.bezug`),
    };
  });
}

function leitbeschreibung(x: unknown, pfad: string): Leitbeschreibung {
  const o = objekt(x, pfad, ['unterbeschreibungen']);
  return {
    unterbeschreibungen: liste(feld(o, 'unterbeschreibungen'), `${pfad}.unterbeschreibungen`).map(
      (u, i): Unterbeschreibung => {
        const q = `${pfad}.unterbeschreibungen[${String(i)}]`;
        const uo = objekt(u, q, ['nummer', 'kurztext', 'langtext', 'menge', 'einheit']);
        return {
          nummer: zeichenkette(feld(uo, 'nummer'), `${q}.nummer`),
          kurztext: zeichenkette(feld(uo, 'kurztext'), `${q}.kurztext`),
          langtext: langtext(feld(uo, 'langtext'), `${q}.langtext`),
          menge: oderNull(feld(uo, 'menge'), (v) => dezimal(v, `${q}.menge`, 'menge') as Menge),
          einheit: textOderNull(feld(uo, 'einheit'), `${q}.einheit`),
        };
      },
    ),
  };
}

// --- Kopfdaten von LV und Auftrags-LV (v1.1b, Punkt 6) --------------------------------------------------------------

function auftraggeber(x: unknown, pfad: string): Auftraggeber {
  const o = objekt(x, pfad, ['name', 'strasse', 'plz', 'ort', 'vergabenummer']);
  const t = (n: string): string | null => textOderNull(feld(o, n), `${pfad}.${n}`);
  return {
    name: t('name'),
    strasse: t('strasse'),
    plz: t('plz'),
    ort: t('ort'),
    vergabenummer: t('vergabenummer'),
  };
}

function vergabeinformationen(x: unknown, pfad: string): Vergabeinformationen {
  const o = objekt(x, pfad, [
    'eroeffnungsdatum',
    'eroeffnungszeit',
    'abgabeort',
    'ausfuehrungsbeginn',
    'ausfuehrungsende',
    'auftragsnummer',
    'auftragsdatum',
    'abnahmeart',
    'gewaehrleistung',
  ]);
  const t = (n: string): string | null => textOderNull(feld(o, n), `${pfad}.${n}`);
  return {
    eroeffnungsdatum: t('eroeffnungsdatum'),
    eroeffnungszeit: t('eroeffnungszeit'),
    abgabeort: t('abgabeort'),
    ausfuehrungsbeginn: t('ausfuehrungsbeginn'),
    ausfuehrungsende: t('ausfuehrungsende'),
    auftragsnummer: t('auftragsnummer'),
    auftragsdatum: t('auftragsdatum'),
    abnahmeart: t('abnahmeart'),
    gewaehrleistung: oderNull(feld(o, 'gewaehrleistung'), (v) => {
      const q = `${pfad}.gewaehrleistung`;
      const g = objekt(v, q, ['dauer', 'einheit']);
      return {
        dauer: ganz(feld(g, 'dauer'), `${q}.dauer`),
        einheit: zeichenkette(feld(g, 'einheit'), `${q}.einheit`),
      };
    }),
  };
}

// --- Auftragnehmer und EPA-Bezeichnungen (v1.3, Ticket 53 Punkte 2 und 6, D-28; Schemaversion 4) --------------------

function auftragnehmer(x: unknown, pfad: string): Auftragnehmer {
  const o = objekt(x, pfad, ['name', 'strasse', 'plz', 'ort']);
  const t = (n: string): string | null => textOderNull(feld(o, n), `${pfad}.${n}`);
  return { name: t('name'), strasse: t('strasse'), plz: t('plz'), ort: t('ort') };
}

const EPA_ARTEN: readonly EpaArt[] = ['lohn', 'stoffe', 'geraete', 'nachunternehmer', 'sonstiges', 'frei'];
const EPA_NUMMERN: readonly EpaNummer[] = [1, 2, 3, 4, 5, 6];

/**
 * EPA-Bezeichnungen (D-28): nicht leer, nach `nummer` aufsteigend (damit je Nummer höchstens ein Eintrag), jede Art
 * höchstens einmal. Lücken sind erlaubt (Platz nicht belegt).
 */
function epaBezeichnungen(x: unknown, pfad: string): EpaBezeichnung[] {
  const eintraege = liste(x, pfad).map((e, i): EpaBezeichnung => {
    const q = `${pfad}[${String(i)}]`;
    const o = objekt(e, q, ['nummer', 'anteil', 'bezeichnung']);
    const nummer = feld(o, 'nummer');
    if (!EPA_NUMMERN.includes(nummer as EpaNummer))
      ungueltig(`${q}.nummer`, 'ganze Zahl von 1 bis 6 erwartet');
    return {
      nummer: nummer as EpaNummer,
      anteil: aufzaehlung(feld(o, 'anteil'), `${q}.anteil`, EPA_ARTEN),
      bezeichnung: textOderNull(feld(o, 'bezeichnung'), `${q}.bezeichnung`),
    };
  });
  if (eintraege.length === 0) ungueltig(pfad, 'leere Liste (das Feld fehlt dann)');
  eintraege.forEach((e, i) => {
    const vorige = eintraege[i - 1];
    if (vorige !== undefined && vorige.nummer >= e.nummer)
      ungueltig(`${pfad}[${String(i)}].nummer`, 'aufsteigend und eindeutig erwartet');
    if (eintraege.findIndex((a) => a.anteil === e.anteil) !== i)
      ungueltig(`${pfad}[${String(i)}].anteil`, 'jede Art höchstens einmal');
  });
  return eintraege;
}

/** Mengenansatz einer Position (v1.3, D-22): nicht leer; die Zeilen werden nicht ausgewertet (A3). */
function mengenansatz(x: unknown, pfad: string): Ansatzzeile[] {
  const zeilen = liste(x, pfad).map((z, i): Ansatzzeile => {
    const q = `${pfad}[${String(i)}]`;
    const o = objekt(z, q, ['zeile', 'formel', 'ausdruck', 'variable']);
    return {
      zeile: ganz(feld(o, 'zeile'), `${q}.zeile`),
      formel: ganz(feld(o, 'formel'), `${q}.formel`),
      ausdruck: zeichenkette(feld(o, 'ausdruck'), `${q}.ausdruck`),
      variable: textOderNull(feld(o, 'variable'), `${q}.variable`),
    };
  });
  if (zeilen.length === 0) ungueltig(pfad, 'leere Liste (das Feld fehlt dann)');
  return zeilen;
}

const KOPFDATEN = ['auftraggeber', 'vergabeinformationen', 'auftragnehmer', 'epaBezeichnungen'] as const;

function kopfdaten(o: Roh, pfad: string): Pick<Leistungsverzeichnis, (typeof KOPFDATEN)[number]> {
  return {
    ...optional(o, 'auftraggeber', (v) => auftraggeber(v, `${pfad}.auftraggeber`)),
    ...optional(o, 'vergabeinformationen', (v) => vergabeinformationen(v, `${pfad}.vergabeinformationen`)),
    ...optional(o, 'auftragnehmer', (v) => auftragnehmer(v, `${pfad}.auftragnehmer`)),
    ...optional(o, 'epaBezeichnungen', (v) => epaBezeichnungen(v, `${pfad}.epaBezeichnungen`)),
  };
}

function knoten(x: unknown, pfad: string): Knoten {
  const art = typeof x === 'object' && x !== null ? (x as Roh)['art'] : undefined;
  const lage = (o: Roh): { elternId: ElternId; reihenfolge: number } => ({
    elternId: zeichenkette(feld(o, 'elternId'), `${pfad}.elternId`) as ElternId,
    reihenfolge: ganz(feld(o, 'reihenfolge'), `${pfad}.reihenfolge`),
  });
  const oz = (o: Roh): Ordnungszahl | null =>
    oderNull(feld(o, 'ordnungszahl'), (v) => zeichenkette(v, `${pfad}.ordnungszahl`) as Ordnungszahl);
  switch (art) {
    case 'los':
    case 'titel': {
      const o = objekt(x, pfad, ['art', 'id', 'elternId', 'reihenfolge', 'ordnungszahl', 'kurztext']);
      const gemeinsam = {
        ...lage(o),
        ordnungszahl: oz(o),
        kurztext: zeichenkette(feld(o, 'kurztext'), `${pfad}.kurztext`),
      };
      const id = zeichenkette(feld(o, 'id'), `${pfad}.id`);
      return art === 'los'
        ? { ...gemeinsam, art: 'los', id: id as LosId }
        : { ...gemeinsam, art: 'titel', id: id as TitelId };
    }
    case 'hinweis': {
      const o = objekt(x, pfad, ['art', 'id', 'elternId', 'reihenfolge', 'text']);
      return {
        ...lage(o),
        art: 'hinweis',
        id: zeichenkette(feld(o, 'id'), `${pfad}.id`) as HinweistextId,
        text: langtext(feld(o, 'text'), `${pfad}.text`),
      };
    }
    case 'position': {
      const o = objekt(
        x,
        pfad,
        [
          'art',
          'id',
          'elternId',
          'reihenfolge',
          'ordnungszahl',
          'ozIndex',
          'merkmale',
          'zuschlag',
          'kurztext',
          'langtext',
          'menge',
          'einheit',
          'einheitspreis',
          'epa',
        ],
        ['leitbeschreibung', 'mengenansatz', 'kostengruppe', 'textquelle', 'bauteile', 'kalkulation'],
      );
      return {
        ...lage(o),
        art: 'position',
        id: zeichenkette(feld(o, 'id'), `${pfad}.id`) as PositionId,
        ordnungszahl: oz(o),
        ozIndex: oderNull(feld(o, 'ozIndex'), (v) => zeichenkette(v, `${pfad}.ozIndex`)),
        merkmale: merkmale(feld(o, 'merkmale'), `${pfad}.merkmale`),
        zuschlag: zuschlag(feld(o, 'zuschlag'), `${pfad}.zuschlag`),
        ...optional(o, 'leitbeschreibung', (v) => leitbeschreibung(v, `${pfad}.leitbeschreibung`)),
        kurztext: zeichenkette(feld(o, 'kurztext'), `${pfad}.kurztext`),
        langtext: langtext(feld(o, 'langtext'), `${pfad}.langtext`),
        menge: oderNull(feld(o, 'menge'), (v) => dezimal(v, `${pfad}.menge`, 'menge') as Menge),
        einheit: oderNull(feld(o, 'einheit'), (v) => zeichenkette(v, `${pfad}.einheit`)),
        einheitspreis: oderNull(
          feld(o, 'einheitspreis'),
          (v) => dezimal(v, `${pfad}.einheitspreis`, 'einheitspreis') as Einheitspreis,
        ),
        epa: epa(feld(o, 'epa'), `${pfad}.epa`),
        ...optional(o, 'mengenansatz', (v) => mengenansatz(v, `${pfad}.mengenansatz`)),
        ...optional(o, 'kostengruppe', (v) => kostengruppe(v, `${pfad}.kostengruppe`)),
        ...optional(o, 'textquelle', (v) => nichtLeer(v, `${pfad}.textquelle`)),
        ...optional(o, 'bauteile', (v) => bauteilzuordnungen(v, `${pfad}.bauteile`)),
        ...optional(o, 'kalkulation', (v) => kalkulationsangaben(v, `${pfad}.kalkulation`)),
      };
    }
    default:
      return ungueltig(pfad, 'Knotenart unbekannt');
  }
}

/** Getrennte Ausweise (v1.1b, Punkt 4); fehlt ein Feld, ist es nicht berechnet. */
const AUSWEISE = ['summeBedarfOhneGesamtbetrag', 'summeWahl'] as const;

function ausweise(o: Roh, pfad: string): Pick<Gesamtsummen, 'summeBedarfOhneGesamtbetrag' | 'summeWahl'> {
  const b = (v: unknown, n: string): Betrag => dezimal(v, `${pfad}.${n}`, 'betrag') as Betrag;
  return {
    ...optional(o, 'summeBedarfOhneGesamtbetrag', (v) => b(v, 'summeBedarfOhneGesamtbetrag')),
    ...optional(o, 'summeWahl', (v) => b(v, 'summeWahl')),
  };
}

function summenstand(x: unknown, pfad: string): Summenstand {
  const o = objekt(x, pfad, ['positionen', 'gliederungen', 'gesamt']);
  const g = objekt(
    feld(o, 'gesamt'),
    `${pfad}.gesamt`,
    ['netto', 'nachlass', 'nettoNachNachlass', 'mwst', 'brutto'],
    AUSWEISE,
  );
  const b = (n: string): Betrag => dezimal(feld(g, n), `${pfad}.gesamt.${n}`, 'betrag') as Betrag;
  const gesamt: Gesamtsummen = {
    netto: b('netto'),
    nachlass: b('nachlass'),
    nettoNachNachlass: b('nettoNachNachlass'),
    mwst: b('mwst'),
    brutto: b('brutto'),
    ...ausweise(g, `${pfad}.gesamt`),
  };
  return {
    positionen: liste(feld(o, 'positionen'), `${pfad}.positionen`).map((p, i) => {
      const q = `${pfad}.positionen[${String(i)}]`;
      const po = objekt(p, q, ['positionId', 'gesamtpreis', 'gehtInSummeEin']);
      return {
        positionId: zeichenkette(feld(po, 'positionId'), `${q}.positionId`) as PositionId,
        gesamtpreis: oderNull(
          feld(po, 'gesamtpreis'),
          (v) => dezimal(v, `${q}.gesamtpreis`, 'betrag') as Betrag,
        ),
        gehtInSummeEin: wahrheit(feld(po, 'gehtInSummeEin'), `${q}.gehtInSummeEin`),
      };
    }),
    gliederungen: liste(feld(o, 'gliederungen'), `${pfad}.gliederungen`).map((p, i) => {
      const q = `${pfad}.gliederungen[${String(i)}]`;
      const go = objekt(p, q, ['gliederungId', 'summe'], AUSWEISE);
      return {
        gliederungId: zeichenkette(feld(go, 'gliederungId'), `${q}.gliederungId`) as GliederungId,
        summe: dezimal(feld(go, 'summe'), `${q}.summe`, 'betrag') as Betrag,
        ...ausweise(go, q),
      };
    }),
    gesamt,
  };
}

// --- Aggregate --------------------------------------------------------------------------------------------------------

function projekt(x: unknown, pfad: string): Projekt {
  const o = objekt(x, pfad, ['id', 'name', 'bauherr', 'bieter'], ['angaben']);
  const bh = objekt(feld(o, 'bauherr'), `${pfad}.bauherr`, ['name', 'anschrift']);
  return {
    id: zeichenkette(feld(o, 'id'), `${pfad}.id`) as ProjektId,
    name: zeichenkette(feld(o, 'name'), `${pfad}.name`),
    bauherr: {
      name: zeichenkette(feld(bh, 'name'), `${pfad}.bauherr.name`),
      anschrift: oderNull(feld(bh, 'anschrift'), (v) => zeichenkette(v, `${pfad}.bauherr.anschrift`)),
    },
    bieter: liste(feld(o, 'bieter'), `${pfad}.bieter`).map((b, i): Bieter => {
      const q = `${pfad}.bieter[${String(i)}]`;
      const bo = objekt(b, q, ['id', 'name'], ['angaben']);
      return {
        id: zeichenkette(feld(bo, 'id'), `${q}.id`) as BieterId,
        name: zeichenkette(feld(bo, 'name'), `${q}.name`),
        ...optional(bo, 'angaben', (v) => bieterangaben(v, `${q}.angaben`)),
      };
    }),
    ...optional(o, 'angaben', (v) => projektangaben(v, `${pfad}.angaben`)),
  };
}

// --- v1.7a (Schema 7): Angaben, Preisspiegel-Einstellungen, Kalkulation, Einstellungen ------------------------------------
//
// Die Form, die der Vertrag an den Typen nennt (Felder, Texte „nie ''“, kanonische Dezimalwerte, Aufzählungen, „nie leer“ bzw.
// „sind alle null, fehlt der Block“, eindeutige Schlüssel der Einstellungen); keine Fachregeln, die der Ausführer prüft
// (Bereich der Sätze, A ≤ B), damit jeder Export sich wieder einlesen lässt (D-79.4).

const alleNull = (o: object): boolean => Object.values(o).every((w) => w === null);

/** Eine Anschrift (v1.7a): Teile nullbar, nie `''`, nie alle `null` (dann ist die Anschrift selbst `null`). */
function anschrift(x: unknown, pfad: string): Anschrift {
  const o = objekt(x, pfad, ['strasse', 'plz', 'ort']);
  const a: Anschrift = {
    strasse: nichtLeerOderNull(feld(o, 'strasse'), `${pfad}.strasse`),
    plz: nichtLeerOderNull(feld(o, 'plz'), `${pfad}.plz`),
    ort: nichtLeerOderNull(feld(o, 'ort'), `${pfad}.ort`),
  };
  return alleNull(a) ? ungueltig(pfad, 'Anschrift ohne jeden Teil (sie ist dann null)') : a;
}

function projektangaben(x: unknown, pfad: string): Projektangaben {
  const o = objekt(x, pfad, ['nummer', 'ort', 'baustelle']);
  const a: Projektangaben = {
    nummer: nichtLeerOderNull(feld(o, 'nummer'), `${pfad}.nummer`),
    ort: nichtLeerOderNull(feld(o, 'ort'), `${pfad}.ort`),
    baustelle: oderNull(feld(o, 'baustelle'), (v) => anschrift(v, `${pfad}.baustelle`)),
  };
  return alleNull(a) ? ungueltig(pfad, 'Angaben ohne jeden Teil (das Feld fehlt dann)') : a;
}

function bieterangaben(x: unknown, pfad: string): Bieterangaben {
  const o = objekt(x, pfad, ['anschrift', 'ansprechperson', 'email', 'telefon']);
  const a: Bieterangaben = {
    anschrift: oderNull(feld(o, 'anschrift'), (v) => anschrift(v, `${pfad}.anschrift`)),
    ansprechperson: nichtLeerOderNull(feld(o, 'ansprechperson'), `${pfad}.ansprechperson`),
    email: nichtLeerOderNull(feld(o, 'email'), `${pfad}.email`),
    telefon: nichtLeerOderNull(feld(o, 'telefon'), `${pfad}.telefon`),
  };
  return alleNull(a) ? ungueltig(pfad, 'Angaben ohne jeden Teil (das Feld fehlt dann)') : a;
}

function preisspiegelEinstellungen(x: unknown, pfad: string): PreisspiegelEinstellungen {
  const o = objekt(x, pfad, ['ausreisserSchwelle', 'abcSchwelleA', 'abcSchwelleB', 'abcBezug']);
  const satz = (n: string): Prozent => dezimal(feld(o, n), `${pfad}.${n}`, 'prozent') as Prozent;
  return {
    ausreisserSchwelle: satz('ausreisserSchwelle'),
    abcSchwelleA: satz('abcSchwelleA'),
    abcSchwelleB: satz('abcSchwelleB'),
    abcBezug: aufzaehlung(feld(o, 'abcBezug'), `${pfad}.abcBezug`, ['mittel', 'schaetzpreis'] as const),
  };
}

/** Kalkulationsangaben einer Position (v1.7a, E9): nie leer (ohne Ansatz und ohne Satz fehlt das Feld). */
function kalkulationsangaben(x: unknown, pfad: string): Kalkulationsangaben {
  const o = objekt(x, pfad, ['ansaetze', 'zuschlagssaetze']);
  const ansaetze = liste(feld(o, 'ansaetze'), `${pfad}.ansaetze`).map((a, i): Kalkulationsansatz => {
    const q = `${pfad}.ansaetze[${String(i)}]`;
    const ao = objekt(a, q, ['art', 'bezeichnung', 'ansatzmenge', 'kostensatz']);
    return {
      art: aufzaehlung(feld(ao, 'art'), `${q}.art`, EPA_ARTEN),
      bezeichnung: zeichenkette(feld(ao, 'bezeichnung'), `${q}.bezeichnung`),
      ansatzmenge: oderNull(feld(ao, 'ansatzmenge'), (v) => dezimal(v, `${q}.ansatzmenge`, 'menge') as Menge),
      kostensatz: oderNull(
        feld(ao, 'kostensatz'),
        (v) => dezimal(v, `${q}.kostensatz`, 'einheitspreis') as Einheitspreis,
      ),
    };
  });
  const so = objekt(feld(o, 'zuschlagssaetze'), `${pfad}.zuschlagssaetze`, [], EPA_ARTEN);
  const zuschlagssaetze: Partial<Record<EpaArt, Prozent>> = {};
  for (const art of EPA_ARTEN)
    if (Object.hasOwn(so, art))
      zuschlagssaetze[art] = dezimal(feld(so, art), `${pfad}.zuschlagssaetze.${art}`, 'prozent') as Prozent;
  if (ansaetze.length === 0 && Object.keys(zuschlagssaetze).length === 0)
    ungueltig(pfad, 'leere Kalkulation (das Feld fehlt dann)');
  return { ansaetze, zuschlagssaetze };
}

function langtextUmfang(x: unknown, pfad: string): LangtextUmfang {
  const art = typeof x === 'object' && x !== null ? (x as Roh)['art'] : undefined;
  if (art === 'zeilen') {
    const o = objekt(x, pfad, ['art', 'anzahl']);
    return { art: 'zeilen', anzahl: ganzAbEins(feld(o, 'anzahl'), `${pfad}.anzahl`) };
  }
  const o = objekt(x, pfad, ['art']);
  return { art: aufzaehlung(feld(o, 'art'), `${pfad}.art`, ['voll', 'kein'] as const) };
}

function druckprofil(x: unknown, pfad: string): Druckprofil {
  const o = objekt(x, pfad, [
    'name',
    'mitPreisen',
    'langtext',
    'titelsummen',
    'schlussblock',
    'deckblatt',
    'kopfzeile',
    'fusszeile',
    'seitenrand',
  ]);
  return {
    name: nichtLeer(feld(o, 'name'), `${pfad}.name`),
    mitPreisen: wahrheit(feld(o, 'mitPreisen'), `${pfad}.mitPreisen`),
    langtext: langtextUmfang(feld(o, 'langtext'), `${pfad}.langtext`),
    titelsummen: wahrheit(feld(o, 'titelsummen'), `${pfad}.titelsummen`),
    schlussblock: wahrheit(feld(o, 'schlussblock'), `${pfad}.schlussblock`),
    deckblatt: wahrheit(feld(o, 'deckblatt'), `${pfad}.deckblatt`),
    kopfzeile: textOderNull(feld(o, 'kopfzeile'), `${pfad}.kopfzeile`),
    fusszeile: textOderNull(feld(o, 'fusszeile'), `${pfad}.fusszeile`),
    seitenrand: aufzaehlung(feld(o, 'seitenrand'), `${pfad}.seitenrand`, ['normal', 'eng'] as const),
  };
}

/**
 * Der Block `einstellungen` (Schema 7, D-73, D-127.9): nie leer (gleichen sie `LEERE_EINSTELLUNGEN`, fehlt der Block),
 * Druckprofilnamen eindeutig, Kostengruppen nach Nummer geordnet und eindeutig (die Schlüssel der Übernahme).
 */
function einstellungen(x: unknown, pfad: string): Einstellungen {
  const o = objekt(x, pfad, ['buero', 'druckprofile', 'kostengruppenbezeichnungen']);
  const e: Einstellungen = {
    buero: oderNull(feld(o, 'buero'), (v) => {
      const q = `${pfad}.buero`;
      const bo = objekt(v, q, ['name', 'anschrift', 'telefon', 'email']);
      return {
        name: nichtLeer(feld(bo, 'name'), `${q}.name`),
        anschrift: oderNull(feld(bo, 'anschrift'), (a) => anschrift(a, `${q}.anschrift`)),
        telefon: nichtLeerOderNull(feld(bo, 'telefon'), `${q}.telefon`),
        email: nichtLeerOderNull(feld(bo, 'email'), `${q}.email`),
      };
    }),
    druckprofile: liste(feld(o, 'druckprofile'), `${pfad}.druckprofile`).map((d, i) =>
      druckprofil(d, `${pfad}.druckprofile[${String(i)}]`),
    ),
    kostengruppenbezeichnungen: liste(
      feld(o, 'kostengruppenbezeichnungen'),
      `${pfad}.kostengruppenbezeichnungen`,
    ).map((k, i): Kostengruppenbezeichnung => {
      const q = `${pfad}.kostengruppenbezeichnungen[${String(i)}]`;
      const ko = objekt(k, q, ['nummer', 'bezeichnung']);
      return {
        nummer: kostengruppe(feld(ko, 'nummer'), `${q}.nummer`),
        bezeichnung: nichtLeer(feld(ko, 'bezeichnung'), `${q}.bezeichnung`),
      };
    }),
  };
  if (e.buero === null && e.druckprofile.length === 0 && e.kostengruppenbezeichnungen.length === 0)
    ungueltig(pfad, 'leere Einstellungen (der Block fehlt dann)');
  const befund = einstellungenFormfehler(e);
  return befund === null ? e : ungueltig(pfad, befund);
}

/** Ein Papierkorbeintrag (Schema 3): Kennung, Nummer ab 1 und die Knoten mit alter Lage. */
function papierkorbeintrag(x: unknown, pfad: string): Papierkorbeintrag {
  const o = objekt(x, pfad, ['id', 'nummer', 'knoten']);
  const nummer = ganz(feld(o, 'nummer'), `${pfad}.nummer`);
  if (nummer < 1) ungueltig(`${pfad}.nummer`, 'ganze Zahl ab 1 erwartet');
  const knotenListe = liste(feld(o, 'knoten'), `${pfad}.knoten`);
  if (knotenListe.length === 0)
    ungueltig(`${pfad}.knoten`, 'ein Papierkorbeintrag hat mindestens einen Knoten');
  return {
    id: zeichenkette(feld(o, 'id'), `${pfad}.id`) as PapierkorbeintragId,
    nummer,
    knoten: knotenListe.map((k, i) => knoten(k, `${pfad}.knoten[${String(i)}]`)),
  };
}

function lvZustand(x: unknown, pfad: string): LvZustand {
  const z = objekt(x, pfad, ['leistungsverzeichnis', 'summen'], ['papierkorb']);
  const p = `${pfad}.leistungsverzeichnis`;
  const o = objekt(
    feld(z, 'leistungsverzeichnis'),
    p,
    ['id', 'projektId', 'name', 'ozMaske', 'mwstSatz', 'nachlass', 'knoten'],
    [...KOPFDATEN, 'nachtrag', 'vorlage', 'preisspiegel'],
  );
  const lv: Leistungsverzeichnis = {
    id: zeichenkette(feld(o, 'id'), `${p}.id`) as LeistungsverzeichnisId,
    projektId: zeichenkette(feld(o, 'projektId'), `${p}.projektId`) as ProjektId,
    name: zeichenkette(feld(o, 'name'), `${p}.name`),
    ozMaske: ozMaske(feld(o, 'ozMaske'), `${p}.ozMaske`),
    mwstSatz: dezimal(feld(o, 'mwstSatz'), `${p}.mwstSatz`, 'prozent') as Prozent,
    nachlass: nachlass(feld(o, 'nachlass'), `${p}.nachlass`),
    ...kopfdaten(o, p),
    ...optional(o, 'nachtrag', (v) => nachtragsangaben(v, `${p}.nachtrag`)),
    ...optional(o, 'vorlage', (v) => nurWahr(v, `${p}.vorlage`)),
    ...optional(o, 'preisspiegel', (v) => preisspiegelEinstellungen(v, `${p}.preisspiegel`)),
    knoten: liste(feld(o, 'knoten'), `${p}.knoten`).map((k, i) => knoten(k, `${p}.knoten[${String(i)}]`)),
  };
  return {
    leistungsverzeichnis: lv,
    summen: summenstand(feld(z, 'summen'), `${pfad}.summen`),
    ...optional(z, 'papierkorb', (v) =>
      liste(v, `${pfad}.papierkorb`).map((e, i) => papierkorbeintrag(e, `${pfad}.papierkorb[${String(i)}]`)),
    ),
  };
}

/** Ein LV-Stand (Schema 3): Kopf, `angelegt` und der eingefrorene Zustand des LV, der zum Kopf passt. */
function lvStand(x: unknown, pfad: string): LvStand {
  const o = objekt(x, pfad, ['id', 'leistungsverzeichnisId', 'name', 'angelegt', 'zustand']);
  const s: LvStand = {
    id: zeichenkette(feld(o, 'id'), `${pfad}.id`) as LvStandId,
    leistungsverzeichnisId: zeichenkette(
      feld(o, 'leistungsverzeichnisId'),
      `${pfad}.leistungsverzeichnisId`,
    ) as LeistungsverzeichnisId,
    name: zeichenkette(feld(o, 'name'), `${pfad}.name`),
    angelegt: zeichenkette(feld(o, 'angelegt'), `${pfad}.angelegt`) as Zeitstempel,
    zustand: lvZustand(feld(o, 'zustand'), `${pfad}.zustand`),
  };
  if (s.zustand.leistungsverzeichnis.id !== s.leistungsverzeichnisId)
    ungueltig(`${pfad}.zustand`, 'gehört zu einem anderen LV als der Stand');
  return s;
}

function auftragsLvZustand(x: unknown, pfad: string): AuftragsLvZustand {
  const z = objekt(x, pfad, ['auftragsLeistungsverzeichnis', 'summen']);
  const p = `${pfad}.auftragsLeistungsverzeichnis`;
  const o = objekt(
    feld(z, 'auftragsLeistungsverzeichnis'),
    p,
    [
      'id',
      'projektId',
      'leistungsverzeichnisId',
      'angebotId',
      'name',
      'ozMaske',
      'mwstSatz',
      'nachlass',
      'knoten',
    ],
    KOPFDATEN,
  );
  const lv: AuftragsLeistungsverzeichnis = {
    id: zeichenkette(feld(o, 'id'), `${p}.id`) as AuftragsLeistungsverzeichnisId,
    projektId: zeichenkette(feld(o, 'projektId'), `${p}.projektId`) as ProjektId,
    leistungsverzeichnisId: zeichenkette(
      feld(o, 'leistungsverzeichnisId'),
      `${p}.leistungsverzeichnisId`,
    ) as LeistungsverzeichnisId,
    angebotId: zeichenkette(feld(o, 'angebotId'), `${p}.angebotId`) as AngebotId,
    name: zeichenkette(feld(o, 'name'), `${p}.name`),
    ozMaske: ozMaske(feld(o, 'ozMaske'), `${p}.ozMaske`),
    mwstSatz: dezimal(feld(o, 'mwstSatz'), `${p}.mwstSatz`, 'prozent') as Prozent,
    nachlass: nachlass(feld(o, 'nachlass'), `${p}.nachlass`),
    ...kopfdaten(o, p),
    knoten: liste(feld(o, 'knoten'), `${p}.knoten`).map((k, i) => knoten(k, `${p}.knoten[${String(i)}]`)),
  };
  return { auftragsLeistungsverzeichnis: lv, summen: summenstand(feld(z, 'summen'), `${pfad}.summen`) };
}

function angebotZustand(x: unknown, pfad: string): AngebotZustand {
  const z = objekt(x, pfad, ['angebot', 'summen']);
  const p = `${pfad}.angebot`;
  const o = objekt(feld(z, 'angebot'), p, [
    'id',
    'projektId',
    'leistungsverzeichnisId',
    'bieterId',
    'nachlass',
    'positionen',
  ]);
  const kopf: AngebotKopf = {
    id: zeichenkette(feld(o, 'id'), `${p}.id`) as AngebotId,
    projektId: zeichenkette(feld(o, 'projektId'), `${p}.projektId`) as ProjektId,
    leistungsverzeichnisId: zeichenkette(
      feld(o, 'leistungsverzeichnisId'),
      `${p}.leistungsverzeichnisId`,
    ) as LeistungsverzeichnisId,
    bieterId: zeichenkette(feld(o, 'bieterId'), `${p}.bieterId`) as BieterId,
    nachlass: nachlass(feld(o, 'nachlass'), `${p}.nachlass`),
  };
  const positionen = liste(feld(o, 'positionen'), `${p}.positionen`).map((a, i): Angebotsposition => {
    const q = `${p}.positionen[${String(i)}]`;
    const status = typeof a === 'object' && a !== null ? (a as Roh)['status'] : undefined;
    if (status === 'nicht-angeboten') {
      const ao = objekt(a, q, ['positionId', 'status']);
      return {
        positionId: zeichenkette(feld(ao, 'positionId'), `${q}.positionId`) as PositionId,
        status: 'nicht-angeboten',
      };
    }
    const ao = objekt(a, q, ['positionId', 'status', 'einheitspreis', 'epa'], ['zuschlagssatz']);
    aufzaehlung(feld(ao, 'status'), `${q}.status`, ['angeboten']);
    return {
      positionId: zeichenkette(feld(ao, 'positionId'), `${q}.positionId`) as PositionId,
      status: 'angeboten',
      einheitspreis: dezimal(
        feld(ao, 'einheitspreis'),
        `${q}.einheitspreis`,
        'einheitspreis',
      ) as Einheitspreis,
      epa: epa(feld(ao, 'epa'), `${q}.epa`),
      ...optional(ao, 'zuschlagssatz', (v) => dezimal(v, `${q}.zuschlagssatz`, 'prozent') as Prozent),
    };
  });
  const angebot: Angebot = { ...kopf, positionen };
  return { angebot, summen: summenstand(feld(z, 'summen'), `${pfad}.summen`) };
}

// --- Vertrag v1.4 (Schemaversion 5, Ticket 79; Strenge D-79.4) ---------------------------------------------------------

/**
 * Kostengruppennummer `100` bis `999` (Marke in `vertrag`: Wer sie aus einer Datei liest, prüft die Form nach); die
 * Formregel steht in `vertrag` (`KOSTENGRUPPENNUMMER_MUSTER`, v1.7a).
 */
function kostengruppe(x: unknown, pfad: string): Kostengruppennummer {
  const s = zeichenkette(x, pfad);
  if (!KOSTENGRUPPENNUMMER_MUSTER.test(s)) ungueltig(pfad, `keine Kostengruppennummer: „${s}“`);
  return s as Kostengruppennummer;
}

/** Text, der nicht leer ist (Vertrag: „nie `''`“; das Feld fehlt bzw. ist `null`). */
function nichtLeer(x: unknown, pfad: string): string {
  const s = zeichenkette(x, pfad);
  if (s === '') ungueltig(pfad, 'leerer Text (das Feld fehlt bzw. ist null)');
  return s;
}

/** Kennzeichen, das nur `true` sein kann (fehlt = nein, D-70.2). */
function nurWahr(x: unknown, pfad: string): true {
  if (x !== true) ungueltig(pfad, 'nur true (fehlt = nein)');
  return true;
}

function ganzAbEins(x: unknown, pfad: string): number {
  const n = ganz(x, pfad);
  if (n < 1) ungueltig(pfad, 'ganze Zahl ab 1 erwartet');
  return n;
}

const NACHTRAGSSTATUS: readonly Nachtragsstatus[] = ['angemeldet', 'angeboten', 'beauftragt', 'abgelehnt'];

function nachtragsangaben(x: unknown, pfad: string): Nachtragsangaben {
  const o = objekt(x, pfad, ['auftragsLvId', 'nummer', 'status']);
  const nummer = zeichenkette(feld(o, 'nummer'), `${pfad}.nummer`);
  if (nummer.trim() === '') ungueltig(`${pfad}.nummer`, 'leere Nachtragsnummer');
  return {
    auftragsLvId: zeichenkette(
      feld(o, 'auftragsLvId'),
      `${pfad}.auftragsLvId`,
    ) as AuftragsLeistungsverzeichnisId,
    nummer,
    status: aufzaehlung(feld(o, 'status'), `${pfad}.status`, NACHTRAGSSTATUS),
  };
}

/** Kennungen einer Liste, jede höchstens einmal. */
function eindeutig(werte: readonly string[], pfad: string, was: string): void {
  werte.forEach((w, i) => {
    if (werte.indexOf(w) !== i) ungueltig(`${pfad}[${String(i)}]`, `${was} ${w} doppelt`);
  });
}

function aufmassZustand(x: unknown, pfad: string): AufmassZustand {
  const z = objekt(x, pfad, ['aufmass']);
  const p = `${pfad}.aufmass`;
  const o = objekt(feld(z, 'aufmass'), p, [
    'id',
    'projektId',
    'auftragsLvId',
    'nummer',
    'bezeichnung',
    'datum',
    'positionen',
  ]);
  const positionen = liste(feld(o, 'positionen'), `${p}.positionen`).map((zeile, i): Aufmassposition => {
    const q = `${p}.positionen[${String(i)}]`;
    const zo = objekt(zeile, q, ['positionId', 'mengenansatz', 'menge']);
    return {
      positionId: zeichenkette(feld(zo, 'positionId'), `${q}.positionId`) as PositionId,
      mengenansatz: oderNull(feld(zo, 'mengenansatz'), (v) => mengenansatz(v, `${q}.mengenansatz`)),
      menge: oderNull(feld(zo, 'menge'), (v) => dezimal(v, `${q}.menge`, 'menge') as Menge),
    };
  });
  eindeutig(
    positionen.map((zeile) => zeile.positionId),
    `${p}.positionen`,
    'Zeile zur Position',
  );
  const aufmass: Aufmass = {
    id: zeichenkette(feld(o, 'id'), `${p}.id`) as AufmassId,
    projektId: zeichenkette(feld(o, 'projektId'), `${p}.projektId`) as ProjektId,
    auftragsLvId: zeichenkette(
      feld(o, 'auftragsLvId'),
      `${p}.auftragsLvId`,
    ) as AuftragsLeistungsverzeichnisId,
    nummer: ganzAbEins(feld(o, 'nummer'), `${p}.nummer`),
    bezeichnung: zeichenkette(feld(o, 'bezeichnung'), `${p}.bezeichnung`),
    datum: textOderNull(feld(o, 'datum'), `${p}.datum`),
    positionen,
  };
  return { aufmass };
}

const MONATSTAGE = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** Ein Kalendertag `JJJJ-MM-TT`, den es gibt (v1.7b, `Zahlung.datum`; Form nach `KALENDERDATUM_MUSTER`). */
function kalendertag(x: unknown, pfad: string): Kalenderdatum {
  const s = zeichenkette(x, pfad);
  if (!KALENDERDATUM_MUSTER.test(s)) return ungueltig(pfad, `kein Datum JJJJ-MM-TT: „${s}“`);
  const [j, m, t] = s.split('-').map(Number) as [number, number, number];
  const schalt = (j % 4 === 0 && j % 100 !== 0) || j % 400 === 0;
  const tage = m === 2 && schalt ? 29 : (MONATSTAGE[m - 1] ?? 0);
  if (j < 1 || t < 1 || t > tage) return ungueltig(pfad, `den Tag „${s}“ gibt es nicht`);
  return s as Kalenderdatum;
}

/**
 * Felder der Rechnung aus `vertrag` v1.7b (Ticket 143, D-72, D-93): alle optional, „fehlt“ ist die einzige Schreibweise für
 * keine/aus (nie `null`, `false`, `[]`; D-128.2). Formen wie im Ausführer (D-128.3 bis D-128.6): Beträge > 0,00, Grund nicht
 * leer, Skontosatz zwischen 0,00 und 100,00 (beide ausgeschlossen), Frist 1 bis 365 Tage, Zahlungsdatum ein Tag, den es
 * gibt, Kennungen der Zahlungen eindeutig.
 */
const RECHNUNG_V17B = ['vertragsstrafe', 'skonto', 'bauabzugsteuer', 'zahlungen'] as const;

function positiverBetrag(x: unknown, pfad: string): Betrag {
  const b = dezimal(x, pfad, 'betrag');
  if (b.startsWith('-') || /^0\.0+$/.test(b))
    return ungueltig(pfad, `Betrag muss größer als 0,00 sein: „${b}“`);
  return b as Betrag;
}

function rechnungV17b(o: Roh, p: string): Pick<Rechnung, (typeof RECHNUNG_V17B)[number]> {
  const zahlungen = optional(o, 'zahlungen', (v) =>
    nichtLeereListe(v, `${p}.zahlungen`).map((z, i): Zahlung => {
      const q = `${p}.zahlungen[${String(i)}]`;
      const zo = objekt(z, q, ['id', 'datum', 'betrag']);
      return {
        id: nichtLeer(feld(zo, 'id'), `${q}.id`) as ZahlungId,
        datum: kalendertag(feld(zo, 'datum'), `${q}.datum`),
        betrag: positiverBetrag(feld(zo, 'betrag'), `${q}.betrag`),
      };
    }),
  );
  if (zahlungen.zahlungen !== undefined)
    eindeutig(
      zahlungen.zahlungen.map((z) => z.id),
      `${p}.zahlungen`,
      'Zahlung',
    );
  return {
    ...optional(o, 'vertragsstrafe', (v) => {
      const q = `${p}.vertragsstrafe`;
      const vo = objekt(v, q, ['betrag', 'grund']);
      const grund = zeichenkette(feld(vo, 'grund'), `${q}.grund`);
      if (grund.trim() === '') ungueltig(`${q}.grund`, 'leerer Grund');
      return { betrag: positiverBetrag(feld(vo, 'betrag'), `${q}.betrag`), grund };
    }),
    ...optional(o, 'skonto', (v) => {
      const q = `${p}.skonto`;
      const so = objekt(v, q, ['satz', 'fristTage']);
      const satz = dezimal(feld(so, 'satz'), `${q}.satz`, 'prozent');
      if (satz.startsWith('-') || /^0\.0+$/.test(satz) || (satz.split('.')[0] ?? '').length > 2)
        ungueltig(`${q}.satz`, `Skontosatz größer 0,00 und kleiner 100,00 erwartet: „${satz}“`);
      const fristTage = ganzAbEins(feld(so, 'fristTage'), `${q}.fristTage`);
      if (fristTage > 365)
        ungueltig(`${q}.fristTage`, `Skontofrist höchstens 365 Tage, nicht ${String(fristTage)}`);
      return { satz: satz as Prozent, fristTage };
    }),
    ...optional(o, 'bauabzugsteuer', (v) => nurWahr(v, `${p}.bauabzugsteuer`)),
    ...zahlungen,
  };
}

function rechnungZustand(x: unknown, pfad: string): RechnungZustand {
  const z = objekt(x, pfad, ['rechnung']);
  const p = `${pfad}.rechnung`;
  const o = objekt(
    feld(z, 'rechnung'),
    p,
    [
      'id',
      'projektId',
      'auftragsLvId',
      'nummer',
      'art',
      'eingang',
      'rechnungsnummerAuftragnehmer',
      'gefordert',
      'aufmassIds',
      'umlagen',
      'sicherheitSatz',
      'gewaehrleistungSatz',
      'freigabe',
    ],
    RECHNUNG_V17B,
  );
  const betrag = (v: unknown, q: string): Betrag => dezimal(v, q, 'betrag') as Betrag;
  const prozent = (v: unknown, q: string): Prozent => dezimal(v, q, 'prozent') as Prozent;
  const gefordert = oderNull(feld(o, 'gefordert'), (v) => {
    const q = `${p}.gefordert`;
    const g = objekt(v, q, ['netto', 'brutto', 'zahlbetrag']);
    const w = {
      netto: oderNull(feld(g, 'netto'), (b) => betrag(b, `${q}.netto`)),
      brutto: oderNull(feld(g, 'brutto'), (b) => betrag(b, `${q}.brutto`)),
      zahlbetrag: oderNull(feld(g, 'zahlbetrag'), (b) => betrag(b, `${q}.zahlbetrag`)),
    };
    if (w.netto === null && w.brutto === null && w.zahlbetrag === null)
      ungueltig(q, 'alle drei Beträge null (nichts erfasst heißt gefordert: null, D-44)');
    return w;
  });
  const aufmassIds = liste(feld(o, 'aufmassIds'), `${p}.aufmassIds`).map(
    (a, i) => zeichenkette(a, `${p}.aufmassIds[${String(i)}]`) as AufmassId,
  );
  eindeutig(aufmassIds, `${p}.aufmassIds`, 'Aufmaßblatt');
  const rechnung: Rechnung = {
    id: zeichenkette(feld(o, 'id'), `${p}.id`) as RechnungId,
    projektId: zeichenkette(feld(o, 'projektId'), `${p}.projektId`) as ProjektId,
    auftragsLvId: zeichenkette(
      feld(o, 'auftragsLvId'),
      `${p}.auftragsLvId`,
    ) as AuftragsLeistungsverzeichnisId,
    nummer: ganzAbEins(feld(o, 'nummer'), `${p}.nummer`),
    art: aufzaehlung(feld(o, 'art'), `${p}.art`, ['abschlag', 'schluss'] as const),
    eingang: textOderNull(feld(o, 'eingang'), `${p}.eingang`),
    rechnungsnummerAuftragnehmer: oderNull(feld(o, 'rechnungsnummerAuftragnehmer'), (v) =>
      nichtLeer(v, `${p}.rechnungsnummerAuftragnehmer`),
    ),
    gefordert,
    aufmassIds,
    umlagen: liste(feld(o, 'umlagen'), `${p}.umlagen`).map((u, i): Umlage => {
      const q = `${p}.umlagen[${String(i)}]`;
      const uo = objekt(u, q, ['bezeichnung', 'satz']);
      return {
        bezeichnung: zeichenkette(feld(uo, 'bezeichnung'), `${q}.bezeichnung`),
        satz: prozent(feld(uo, 'satz'), `${q}.satz`),
      };
    }),
    sicherheitSatz: oderNull(feld(o, 'sicherheitSatz'), (v) => prozent(v, `${p}.sicherheitSatz`)),
    gewaehrleistungSatz: oderNull(feld(o, 'gewaehrleistungSatz'), (v) =>
      prozent(v, `${p}.gewaehrleistungSatz`),
    ),
    freigabe: oderNull(feld(o, 'freigabe'), (v) => {
      const fo = objekt(v, `${p}.freigabe`, ['zahlbetrag']);
      return { zahlbetrag: betrag(feld(fo, 'zahlbetrag'), `${p}.freigabe.zahlbetrag`) };
    }),
    ...rechnungV17b(o, p),
  };
  // Invariante an `Rechnung` (v1.7b, D-128.7, Q5): Zahlungen gibt es nur an einer freigegebenen Rechnung.
  if (rechnung.zahlungen !== undefined && rechnung.freigabe === null)
    ungueltig(`${p}.zahlungen`, 'Zahlungen an einer nicht freigegebenen Rechnung');
  return { rechnung };
}

const KOSTENERMITTLUNGSSTUFEN: readonly Kostenermittlungsstufe[] = [
  'kostenrahmen',
  'kostenschaetzung',
  'kostenberechnung',
  'kostenanschlag',
  'kostenfeststellung',
];

function kostenermittlungZustand(x: unknown, pfad: string): KostenermittlungZustand {
  const z = objekt(x, pfad, ['kostenermittlung']);
  const p = `${pfad}.kostenermittlung`;
  const o = objekt(feld(z, 'kostenermittlung'), p, ['id', 'projektId', 'stufe', 'name', 'eintraege']);
  const eintraege = liste(feld(o, 'eintraege'), `${p}.eintraege`).map((e, i): Kostenermittlungseintrag => {
    const q = `${p}.eintraege[${String(i)}]`;
    const eo = objekt(e, q, ['nummer', 'betrag'], ['bemerkung']);
    return {
      nummer: kostengruppe(feld(eo, 'nummer'), `${q}.nummer`),
      betrag: dezimal(feld(eo, 'betrag'), `${q}.betrag`, 'betrag') as Betrag,
      ...optional(eo, 'bemerkung', (v) => nichtLeer(v, `${q}.bemerkung`)),
    };
  });
  // Nach Nummer aufsteigend und eindeutig (enge Lesart des Vertrags); dreistellige Nummern vergleichen sich als Text.
  eintraege.forEach((e, i) => {
    const vorige = eintraege[i - 1];
    if (vorige !== undefined && vorige.nummer >= e.nummer)
      ungueltig(`${p}.eintraege[${String(i)}].nummer`, 'nach Nummer aufsteigend und eindeutig erwartet');
  });
  const kostenermittlung: Kostenermittlung = {
    id: zeichenkette(feld(o, 'id'), `${p}.id`) as KostenermittlungId,
    projektId: zeichenkette(feld(o, 'projektId'), `${p}.projektId`) as ProjektId,
    stufe: aufzaehlung(feld(o, 'stufe'), `${p}.stufe`, KOSTENERMITTLUNGSSTUFEN),
    name: zeichenkette(feld(o, 'name'), `${p}.name`),
    eintraege,
  };
  return { kostenermittlung };
}

// --- Vertrag v1.6 (Schemaversion 6, Ticket 106; Strenge wie D-79.4) -----------------------------------------------------
//
// Die Form, die der Vertrag an den Typen nennt (Felder, Listen der Werte, kanonische Dezimalwerte, GlobalIds in Form, Texte
// „nie ''“ bzw. „nicht leer“); keine Fachregeln, die der Ausführer prüft (Ring in der Struktur, Statuswechsel, Datumsformat):
// Strenger als er wäre, ließe Exporte nicht mehr importieren (D-79.4).

function globalId(x: unknown, pfad: string): IfcGlobalId {
  const s = zeichenkette(x, pfad);
  if (!IFC_GLOBALID_MUSTER.test(s))
    ungueltig(pfad, `keine GlobalId (22 Zeichen aus 0-9, A-Z, a-z, _, $): „${s}“`);
  return s as IfcGlobalId;
}

/** Ganze Zahl, auch negativ (Abstand einer Anordnungsbeziehung, Temperatur). */
function ganzeZahl(x: unknown, pfad: string): number {
  if (typeof x !== 'number' || !Number.isSafeInteger(x)) return ungueltig(pfad, 'ganze Zahl erwartet');
  return x;
}

const nichtLeerOderNull = (x: unknown, pfad: string): string | null => oderNull(x, (v) => nichtLeer(v, pfad));

/** Liste, die nicht leer ist (der Vertrag kennt sie im Zustand nur so; leer fehlt das Feld). */
function nichtLeereListe(x: unknown, pfad: string): unknown[] {
  const l = liste(x, pfad);
  if (l.length === 0) ungueltig(pfad, 'leere Liste (das Feld fehlt dann)');
  return l;
}

/** Bauteilzuordnungen einer Position (v1.6, D-52): nicht leer, GlobalId in Form, Mengenart nicht leer. */
function bauteilzuordnungen(x: unknown, pfad: string): Bauteilzuordnung[] {
  return nichtLeereListe(x, pfad).map((z, i): Bauteilzuordnung => {
    const q = `${pfad}[${String(i)}]`;
    const o = objekt(z, q, ['globalId', 'mengenart']);
    return {
      globalId: globalId(feld(o, 'globalId'), `${q}.globalId`),
      mengenart: nichtLeer(feld(o, 'mengenart'), `${q}.mengenart`),
    };
  });
}

function bauteilmengen(x: unknown, pfad: string): Bauteilmenge[] {
  return liste(x, pfad).map((m, i): Bauteilmenge => {
    const q = `${pfad}[${String(i)}]`;
    const o = objekt(m, q, ['satz', 'name', 'art', 'wert']);
    return {
      satz: textOderNull(feld(o, 'satz'), `${q}.satz`),
      name: nichtLeer(feld(o, 'name'), `${q}.name`),
      art: aufzaehlung(feld(o, 'art'), `${q}.art`, BAUTEILMENGENARTEN),
      wert: dezimal(feld(o, 'wert'), `${q}.wert`, 'menge') as Menge,
    };
  });
}

function strukturknoten(x: unknown, pfad: string): Strukturknoten {
  const o = objekt(x, pfad, ['globalId', 'art', 'name', 'elternGlobalId', 'mengen']);
  return {
    globalId: globalId(feld(o, 'globalId'), `${pfad}.globalId`),
    art: aufzaehlung(feld(o, 'art'), `${pfad}.art`, STRUKTURKNOTENARTEN),
    name: textOderNull(feld(o, 'name'), `${pfad}.name`),
    elternGlobalId: oderNull(feld(o, 'elternGlobalId'), (v) => globalId(v, `${pfad}.elternGlobalId`)),
    mengen: bauteilmengen(feld(o, 'mengen'), `${pfad}.mengen`),
  };
}

function bauteil(x: unknown, pfad: string): Bauteil {
  const o = objekt(
    x,
    pfad,
    ['globalId', 'ifcKlasse', 'name', 'typ', 'strukturGlobalId', 'mengen'],
    ['teilVonGlobalId', 'kostengruppe'],
  );
  return {
    globalId: globalId(feld(o, 'globalId'), `${pfad}.globalId`),
    ifcKlasse: nichtLeer(feld(o, 'ifcKlasse'), `${pfad}.ifcKlasse`),
    name: textOderNull(feld(o, 'name'), `${pfad}.name`),
    typ: textOderNull(feld(o, 'typ'), `${pfad}.typ`),
    strukturGlobalId: oderNull(feld(o, 'strukturGlobalId'), (v) => globalId(v, `${pfad}.strukturGlobalId`)),
    ...optional(o, 'teilVonGlobalId', (v) => globalId(v, `${pfad}.teilVonGlobalId`)),
    ...optional(o, 'kostengruppe', (v) => kostengruppe(v, `${pfad}.kostengruppe`)),
    mengen: bauteilmengen(feld(o, 'mengen'), `${pfad}.mengen`),
  };
}

function bauwerksmodellZustand(x: unknown, pfad: string): BauwerksmodellZustand {
  const z = objekt(x, pfad, ['bauwerksmodell']);
  const p = `${pfad}.bauwerksmodell`;
  const o = objekt(feld(z, 'bauwerksmodell'), p, [
    'id',
    'projektId',
    'name',
    'datei',
    'schema',
    'vorgaengerId',
    'eingelesen',
    'struktur',
    'bauteile',
  ]);
  const d = objekt(feld(o, 'datei'), `${p}.datei`, ['hash', 'dateiname', 'groesse']);
  const hash = zeichenkette(feld(d, 'hash'), `${p}.datei.hash`);
  if (!MODELLDATEI_HASH_MUSTER.test(hash))
    ungueltig(`${p}.datei.hash`, '64 hexadezimale Stellen (klein) erwartet');
  const id = zeichenkette(feld(o, 'id'), `${p}.id`) as BauwerksmodellId;
  const vorgaengerId = oderNull(feld(o, 'vorgaengerId'), (v) =>
    zeichenkette(v, `${p}.vorgaengerId`),
  ) as BauwerksmodellId | null;
  if (vorgaengerId === id) ungueltig(`${p}.vorgaengerId`, 'ein Modell ist nicht sein eigener Vorgänger');
  const bauwerksmodell: Bauwerksmodell = {
    id,
    projektId: zeichenkette(feld(o, 'projektId'), `${p}.projektId`) as ProjektId,
    name: nichtLeer(feld(o, 'name'), `${p}.name`),
    datei: {
      hash,
      dateiname: zeichenkette(feld(d, 'dateiname'), `${p}.datei.dateiname`),
      groesse: ganz(feld(d, 'groesse'), `${p}.datei.groesse`),
    },
    schema: aufzaehlung(feld(o, 'schema'), `${p}.schema`, IFC_SCHEMATA),
    vorgaengerId,
    eingelesen: zeichenkette(feld(o, 'eingelesen'), `${p}.eingelesen`),
    struktur: liste(feld(o, 'struktur'), `${p}.struktur`).map((k, i) =>
      strukturknoten(k, `${p}.struktur[${String(i)}]`),
    ),
    bauteile: liste(feld(o, 'bauteile'), `${p}.bauteile`).map((b, i) =>
      bauteil(b, `${p}.bauteile[${String(i)}]`),
    ),
  };
  return { bauwerksmodell };
}

/** Ein Eintrag von `modelldateien`: Hash und Base64-Text; ob die Bytes zum Hash passen, prüft der Import (Web Crypto). */
function modelldateiEintrag(x: unknown, pfad: string): { hash: string; inhalt: string } {
  const o = objekt(x, pfad, ['hash', 'inhalt']);
  const hash = zeichenkette(feld(o, 'hash'), `${pfad}.hash`);
  if (!MODELLDATEI_HASH_MUSTER.test(hash))
    ungueltig(`${pfad}.hash`, '64 hexadezimale Stellen (klein) erwartet');
  return { hash, inhalt: zeichenkette(feld(o, 'inhalt'), `${pfad}.inhalt`) };
}

const ANORDNUNGSARTEN: readonly Anordnungsart[] = [
  'ende-anfang',
  'anfang-anfang',
  'ende-ende',
  'anfang-ende',
];
const BUNDESLAENDER: readonly Bundesland[] = [
  'BW',
  'BY',
  'BE',
  'BB',
  'HB',
  'HH',
  'HE',
  'MV',
  'NI',
  'NW',
  'RP',
  'SL',
  'SN',
  'ST',
  'SH',
  'TH',
];

function vorgangsbezug(x: unknown, pfad: string): Vorgangsbezug {
  const o = objekt(x, pfad, ['art', 'id', 'knotenIds']);
  const knotenIds = oderNull(feld(o, 'knotenIds'), (v) =>
    nichtLeereListe(v, `${pfad}.knotenIds`).map(
      (k, i) => zeichenkette(k, `${pfad}.knotenIds[${String(i)}]`) as GliederungId | PositionId,
    ),
  );
  if (knotenIds !== null) eindeutig(knotenIds, `${pfad}.knotenIds`, 'Knoten');
  const art = aufzaehlung(feld(o, 'art'), `${pfad}.art`, [
    'leistungsverzeichnis',
    'auftrags-leistungsverzeichnis',
  ] as const);
  const id = zeichenkette(feld(o, 'id'), `${pfad}.id`);
  return art === 'leistungsverzeichnis'
    ? { art, id: id as LeistungsverzeichnisId, knotenIds }
    : { art, id: id as AuftragsLeistungsverzeichnisId, knotenIds };
}

function vorgang(x: unknown, pfad: string): Vorgang {
  const o = objekt(x, pfad, [
    'id',
    'nummer',
    'bezeichnung',
    'elternId',
    'dauer',
    'vorgaenger',
    'fruehesterBeginn',
    'bezug',
    'ist',
  ]);
  return {
    id: zeichenkette(feld(o, 'id'), `${pfad}.id`) as VorgangId,
    nummer: nichtLeerOderNull(feld(o, 'nummer'), `${pfad}.nummer`),
    bezeichnung: nichtLeer(feld(o, 'bezeichnung'), `${pfad}.bezeichnung`),
    elternId: oderNull(feld(o, 'elternId'), (v) => zeichenkette(v, `${pfad}.elternId`)) as VorgangId | null,
    dauer: ganz(feld(o, 'dauer'), `${pfad}.dauer`),
    vorgaenger: liste(feld(o, 'vorgaenger'), `${pfad}.vorgaenger`).map((b, i): Anordnungsbeziehung => {
      const q = `${pfad}.vorgaenger[${String(i)}]`;
      const bo = objekt(b, q, ['vorgaengerId', 'art', 'abstand']);
      return {
        vorgaengerId: zeichenkette(feld(bo, 'vorgaengerId'), `${q}.vorgaengerId`) as VorgangId,
        art: aufzaehlung(feld(bo, 'art'), `${q}.art`, ANORDNUNGSARTEN),
        abstand: ganzeZahl(feld(bo, 'abstand'), `${q}.abstand`),
      };
    }),
    fruehesterBeginn: textOderNull(feld(o, 'fruehesterBeginn'), `${pfad}.fruehesterBeginn`),
    bezug: oderNull(feld(o, 'bezug'), (v) => vorgangsbezug(v, `${pfad}.bezug`)),
    ist: oderNull(feld(o, 'ist'), (v) => {
      const q = `${pfad}.ist`;
      const io = objekt(v, q, ['beginn', 'ende', 'fortschritt']);
      const ist = {
        beginn: textOderNull(feld(io, 'beginn'), `${q}.beginn`),
        ende: textOderNull(feld(io, 'ende'), `${q}.ende`),
        fortschritt: oderNull(
          feld(io, 'fortschritt'),
          (f) => dezimal(f, `${q}.fortschritt`, 'prozent') as Prozent,
        ),
      };
      if (ist.beginn === null && ist.ende === null && ist.fortschritt === null)
        ungueltig(q, 'alle drei Angaben null (nichts erfasst heißt ist: null)');
      return ist;
    }),
  };
}

function bauzeitenplanZustand(x: unknown, pfad: string): BauzeitenplanZustand {
  const z = objekt(x, pfad, ['bauzeitenplan']);
  const p = `${pfad}.bauzeitenplan`;
  const o = objekt(feld(z, 'bauzeitenplan'), p, [
    'id',
    'projektId',
    'name',
    'projektbeginn',
    'kalender',
    'vorgaenge',
  ]);
  const k = objekt(feld(o, 'kalender'), `${p}.kalender`, ['arbeitstage', 'bundesland', 'freieTage']);
  const vorgaenge = liste(feld(o, 'vorgaenge'), `${p}.vorgaenge`).map((v, i) =>
    vorgang(v, `${p}.vorgaenge[${String(i)}]`),
  );
  eindeutig(
    vorgaenge.map((v) => v.id),
    `${p}.vorgaenge`,
    'Vorgang',
  );
  const bauzeitenplan: Bauzeitenplan = {
    id: zeichenkette(feld(o, 'id'), `${p}.id`) as BauzeitenplanId,
    projektId: zeichenkette(feld(o, 'projektId'), `${p}.projektId`) as ProjektId,
    name: nichtLeer(feld(o, 'name'), `${p}.name`),
    projektbeginn: zeichenkette(feld(o, 'projektbeginn'), `${p}.projektbeginn`),
    kalender: {
      arbeitstage: nichtLeereListe(feld(k, 'arbeitstage'), `${p}.kalender.arbeitstage`).map((t, i) => {
        const q = `${p}.kalender.arbeitstage[${String(i)}]`;
        const tag = ganz(t, q);
        if (tag < 1 || tag > 7) ungueltig(q, 'ISO-Wochentag 1 bis 7 erwartet');
        return tag as Wochentag;
      }),
      bundesland: oderNull(feld(k, 'bundesland'), (v) =>
        aufzaehlung(v, `${p}.kalender.bundesland`, BUNDESLAENDER),
      ),
      freieTage: liste(feld(k, 'freieTage'), `${p}.kalender.freieTage`).map((t, i) =>
        zeichenkette(t, `${p}.kalender.freieTage[${String(i)}]`),
      ),
    },
    vorgaenge,
  };
  return { bauzeitenplan };
}

const LEISTUNGSBILDER: readonly Leistungsbild[] = [
  'gebaeude',
  'innenraeume',
  'freianlagen',
  'ingenieurbauwerke',
  'verkehrsanlagen',
  'tragwerksplanung',
  'technische-ausruestung',
];
const HONORARZONEN: readonly Honorarzone[] = ['I', 'II', 'III', 'IV', 'V'];

function anrechenbareKosten(x: unknown, pfad: string): AnrechenbareKostenangabe {
  const art = typeof x === 'object' && x !== null ? (x as Roh)['art'] : undefined;
  const betrag = (v: unknown, q: string): Betrag => dezimal(v, q, 'betrag') as Betrag;
  if (art === 'betrag') {
    const o = objekt(x, pfad, ['art', 'betrag']);
    return { art, betrag: betrag(feld(o, 'betrag'), `${pfad}.betrag`) };
  }
  if (art === 'kostenermittlung') {
    const o = objekt(x, pfad, [
      'art',
      'kostenermittlungId',
      'technischeAnlagenAnteilig',
      'weitereKosten',
      'mitzuverarbeitendeBausubstanz',
    ]);
    return {
      art,
      kostenermittlungId: zeichenkette(
        feld(o, 'kostenermittlungId'),
        `${pfad}.kostenermittlungId`,
      ) as KostenermittlungId,
      technischeAnlagenAnteilig: wahrheit(
        feld(o, 'technischeAnlagenAnteilig'),
        `${pfad}.technischeAnlagenAnteilig`,
      ),
      weitereKosten: betrag(feld(o, 'weitereKosten'), `${pfad}.weitereKosten`),
      mitzuverarbeitendeBausubstanz: betrag(
        feld(o, 'mitzuverarbeitendeBausubstanz'),
        `${pfad}.mitzuverarbeitendeBausubstanz`,
      ),
    };
  }
  return ungueltig(`${pfad}.art`, 'betrag oder kostenermittlung erwartet');
}

function honorarobjekt(x: unknown, pfad: string): Honorarobjekt {
  const o = objekt(x, pfad, [
    'bezeichnung',
    'leistungsbild',
    'honorarzone',
    'honorarsatz',
    'anrechenbareKosten',
    'leistungsphasen',
    'umbauzuschlagssatz',
  ]);
  const prozent = (v: unknown, q: string): Prozent => dezimal(v, q, 'prozent') as Prozent;
  const phasen = liste(feld(o, 'leistungsphasen'), `${pfad}.leistungsphasen`).map(
    (l, i): BeauftragteLeistungsphase => {
      const q = `${pfad}.leistungsphasen[${String(i)}]`;
      const lo = objekt(l, q, ['nummer'], ['anteil']);
      const nummer = ganz(feld(lo, 'nummer'), `${q}.nummer`);
      if (nummer < 1 || nummer > 9) ungueltig(`${q}.nummer`, 'Leistungsphase 1 bis 9 erwartet');
      return {
        nummer: nummer as Leistungsphasennummer,
        ...optional(lo, 'anteil', (v) => prozent(v, `${q}.anteil`)),
      };
    },
  );
  phasen.forEach((ph, i) => {
    const vorige = phasen[i - 1];
    if (vorige !== undefined && vorige.nummer >= ph.nummer)
      ungueltig(
        `${pfad}.leistungsphasen[${String(i)}].nummer`,
        'nach Nummer aufsteigend und eindeutig erwartet',
      );
  });
  return {
    bezeichnung: nichtLeer(feld(o, 'bezeichnung'), `${pfad}.bezeichnung`),
    leistungsbild: aufzaehlung(feld(o, 'leistungsbild'), `${pfad}.leistungsbild`, LEISTUNGSBILDER),
    honorarzone: aufzaehlung(feld(o, 'honorarzone'), `${pfad}.honorarzone`, HONORARZONEN),
    honorarsatz: prozent(feld(o, 'honorarsatz'), `${pfad}.honorarsatz`),
    anrechenbareKosten: anrechenbareKosten(feld(o, 'anrechenbareKosten'), `${pfad}.anrechenbareKosten`),
    leistungsphasen: phasen,
    umbauzuschlagssatz: oderNull(feld(o, 'umbauzuschlagssatz'), (v) =>
      prozent(v, `${pfad}.umbauzuschlagssatz`),
    ),
  };
}

function honorarberechnungZustand(x: unknown, pfad: string): HonorarberechnungZustand {
  const z = objekt(x, pfad, ['honorarberechnung']);
  const p = `${pfad}.honorarberechnung`;
  const o = objekt(feld(z, 'honorarberechnung'), p, [
    'id',
    'projektId',
    'name',
    'objekte',
    'nebenkosten',
    'mwstSatz',
  ]);
  const nebenkosten = oderNull(feld(o, 'nebenkosten'), (v): Nebenkostenangabe => {
    const q = `${p}.nebenkosten`;
    const art = typeof v === 'object' && v !== null ? (v as Roh)['art'] : undefined;
    if (art === 'prozent') {
      const no = objekt(v, q, ['art', 'satz']);
      return { art, satz: dezimal(feld(no, 'satz'), `${q}.satz`, 'prozent') as Prozent };
    }
    if (art === 'betrag') {
      const no = objekt(v, q, ['art', 'betrag']);
      return { art, betrag: dezimal(feld(no, 'betrag'), `${q}.betrag`, 'betrag') as Betrag };
    }
    return ungueltig(`${q}.art`, 'prozent oder betrag erwartet');
  });
  const honorarberechnung: Honorarberechnung = {
    id: zeichenkette(feld(o, 'id'), `${p}.id`) as HonorarberechnungId,
    projektId: zeichenkette(feld(o, 'projektId'), `${p}.projektId`) as ProjektId,
    name: nichtLeer(feld(o, 'name'), `${p}.name`),
    objekte: liste(feld(o, 'objekte'), `${p}.objekte`).map((x2, i) =>
      honorarobjekt(x2, `${p}.objekte[${String(i)}]`),
    ),
    nebenkosten,
    mwstSatz: dezimal(feld(o, 'mwstSatz'), `${p}.mwstSatz`, 'prozent') as Prozent,
  };
  return { honorarberechnung };
}

const MANGELSTATUS: readonly Mangelstatus[] = ['offen', 'angezeigt', 'beseitigt', 'abgenommen'];

function mangelZustand(x: unknown, pfad: string): MangelZustand {
  const z = objekt(x, pfad, ['mangel']);
  const p = `${pfad}.mangel`;
  const o = objekt(feld(z, 'mangel'), p, [
    'id',
    'projektId',
    'nummer',
    'titel',
    'beschreibung',
    'ort',
    'auftragsLvId',
    'positionId',
    'bauteil',
    'festgestellt',
    'frist',
    'verlauf',
  ]);
  const mangel: Mangel = {
    id: zeichenkette(feld(o, 'id'), `${p}.id`) as MangelId,
    projektId: zeichenkette(feld(o, 'projektId'), `${p}.projektId`) as ProjektId,
    nummer: ganzAbEins(feld(o, 'nummer'), `${p}.nummer`),
    titel: nichtLeer(feld(o, 'titel'), `${p}.titel`),
    beschreibung: nichtLeerOderNull(feld(o, 'beschreibung'), `${p}.beschreibung`),
    ort: nichtLeerOderNull(feld(o, 'ort'), `${p}.ort`),
    auftragsLvId: oderNull(feld(o, 'auftragsLvId'), (v) =>
      zeichenkette(v, `${p}.auftragsLvId`),
    ) as AuftragsLeistungsverzeichnisId | null,
    positionId: oderNull(feld(o, 'positionId'), (v) =>
      zeichenkette(v, `${p}.positionId`),
    ) as PositionId | null,
    bauteil: oderNull(feld(o, 'bauteil'), (v) => {
      const bo = objekt(v, `${p}.bauteil`, ['bauwerksmodellId', 'globalId']);
      return {
        bauwerksmodellId: oderNull(feld(bo, 'bauwerksmodellId'), (w) =>
          zeichenkette(w, `${p}.bauteil.bauwerksmodellId`),
        ) as BauwerksmodellId | null,
        globalId: globalId(feld(bo, 'globalId'), `${p}.bauteil.globalId`),
      };
    }),
    festgestellt: zeichenkette(feld(o, 'festgestellt'), `${p}.festgestellt`),
    frist: textOderNull(feld(o, 'frist'), `${p}.frist`),
    verlauf: nichtLeereListe(feld(o, 'verlauf'), `${p}.verlauf`).map((e, i): Mangelverlaufseintrag => {
      const q = `${p}.verlauf[${String(i)}]`;
      const eo = objekt(e, q, ['status', 'datum', 'bemerkung'], ['frist']);
      const status = aufzaehlung(feld(eo, 'status'), `${q}.status`, MANGELSTATUS);
      // Nachtrag Review (D-66): die Frist einer Mängelanzeige, nur an einem Eintrag `angezeigt`; fehlt: keine Angabe.
      if (Object.hasOwn(eo, 'frist') && status !== 'angezeigt')
        ungueltig(`${q}.frist`, 'eine Frist steht nur an einem Eintrag angezeigt');
      return {
        status,
        datum: zeichenkette(feld(eo, 'datum'), `${q}.datum`),
        bemerkung: nichtLeerOderNull(feld(eo, 'bemerkung'), `${q}.bemerkung`),
        ...optional(eo, 'frist', (v) => nichtLeer(v, `${q}.frist`)),
      };
    }),
  };
  if (mangel.positionId !== null && mangel.auftragsLvId === null)
    ungueltig(`${p}.positionId`, 'eine Position nur mit Auftrags-LV');
  return { mangel };
}

function bautagebucheintragZustand(x: unknown, pfad: string): BautagebucheintragZustand {
  const z = objekt(x, pfad, ['bautagebucheintrag']);
  const p = `${pfad}.bautagebucheintrag`;
  const o = objekt(feld(z, 'bautagebucheintrag'), p, [
    'id',
    'projektId',
    'datum',
    'wetter',
    'arbeitskraefte',
    'geraete',
    'leistungen',
    'behinderungen',
    'vorkommnisse',
  ]);
  const w = objekt(feld(o, 'wetter'), `${p}.wetter`, ['beschreibung', 'temperaturMin', 'temperaturMax']);
  const firmen = liste(feld(o, 'arbeitskraefte'), `${p}.arbeitskraefte`).map((a, i) => {
    const q = `${p}.arbeitskraefte[${String(i)}]`;
    const ao = objekt(a, q, ['firma', 'anzahl']);
    return {
      firma: nichtLeer(feld(ao, 'firma'), `${q}.firma`),
      anzahl: ganz(feld(ao, 'anzahl'), `${q}.anzahl`),
    };
  });
  eindeutig(
    firmen.map((a) => a.firma),
    `${p}.arbeitskraefte`,
    'Firma',
  );
  const bautagebucheintrag: Bautagebucheintrag = {
    id: zeichenkette(feld(o, 'id'), `${p}.id`) as BautagebucheintragId,
    projektId: zeichenkette(feld(o, 'projektId'), `${p}.projektId`) as ProjektId,
    datum: zeichenkette(feld(o, 'datum'), `${p}.datum`),
    wetter: {
      beschreibung: nichtLeerOderNull(feld(w, 'beschreibung'), `${p}.wetter.beschreibung`),
      temperaturMin: oderNull(feld(w, 'temperaturMin'), (v) => ganzeZahl(v, `${p}.wetter.temperaturMin`)),
      temperaturMax: oderNull(feld(w, 'temperaturMax'), (v) => ganzeZahl(v, `${p}.wetter.temperaturMax`)),
    },
    arbeitskraefte: firmen,
    geraete: nichtLeerOderNull(feld(o, 'geraete'), `${p}.geraete`),
    leistungen: nichtLeerOderNull(feld(o, 'leistungen'), `${p}.leistungen`),
    behinderungen: nichtLeerOderNull(feld(o, 'behinderungen'), `${p}.behinderungen`),
    vorkommnisse: nichtLeerOderNull(feld(o, 'vorkommnisse'), `${p}.vorkommnisse`),
  };
  return { bautagebucheintrag };
}

/**
 * `modelldateien` der Datei (D-51, D-97.5): nach `hash` streng aufsteigend (also je Hash genau einmal) und genau die Hashes, die
 * die Bauwerksmodelle der Datei nennen: Fehlt einer oder ist einer zu viel, ist die Datei ungültig (nichts halb importiert).
 */
function pruefeModelldateien(datei: Projektdatei): void {
  const eintraege = datei.modelldateien ?? [];
  eintraege.forEach((e, i) => {
    const vorige = eintraege[i - 1];
    if (vorige !== undefined && vorige.hash >= e.hash)
      ungueltig(
        `$.modelldateien[${String(i)}].hash`,
        'nach hash streng aufsteigend erwartet (je Hash ein Eintrag)',
      );
  });
  const da = new Set(eintraege.map((e) => e.hash));
  const genannt = new Set((datei.bauwerksmodelle ?? []).map((z) => z.bauwerksmodell.datei.hash));
  for (const h of genannt)
    if (!da.has(h)) ungueltig('$.modelldateien', `die Bytes der Modelldatei ${h} fehlen`);
  for (const h of da)
    if (!genannt.has(h))
      ungueltig('$.modelldateien', `die Modelldatei ${h} nennt kein Bauwerksmodell der Datei`);
}

/** Alle Befehlsnamen des Vertrags. Der Typ erzwingt Vollständigkeit: ein neuer Befehl bricht die Übersetzung. */
const BEFEHLSARTEN: Record<Befehlsart, true> = {
  ProjektAnlegen: true,
  ProjektStammdatenSetzen: true,
  BieterAnlegen: true,
  LeistungsverzeichnisAnlegen: true,
  LeistungsverzeichnisUmbenennen: true,
  GliederungAnlegen: true,
  PositionAnlegen: true,
  HinweistextAnlegen: true,
  KnotenLoeschen: true,
  KnotenVerschieben: true,
  KurztextAendern: true,
  LangtextAendern: true,
  HinweistextAendern: true,
  MengeAendern: true,
  EinheitAendern: true,
  EinheitspreisAendern: true,
  EinheitspreisanteileSetzen: true,
  PositionsmerkmaleSetzen: true,
  OzMaskeSetzen: true,
  OrdnungszahlSetzen: true,
  Umnummerieren: true,
  NachlassSetzen: true,
  NachlassEntfernen: true,
  MwstSatzSetzen: true,
  AngebotAnlegen: true,
  AngebotspositionSetzen: true,
  AngebotsNachlassSetzen: true,
  AngebotsNachlassEntfernen: true,
  ProjektLoeschen: true,
  LeistungsverzeichnisLoeschen: true,
  AngebotLoeschen: true,
  AuftragsLeistungsverzeichnisAnlegen: true,
  // v1.2: mechanisch angepasst, Folgeticket (speicher: Papierkorb, LV-Stände und Undo umsetzen, Ticket 43)
  KnotenEinfuegen: true,
  KnotenlisteVerschieben: true,
  KnotenInPapierkorbLegen: true,
  PapierkorbeintragWiederherstellen: true,
  PapierkorbeintragEntfernen: true,
  PapierkorbLeeren: true,
  LvStandAnlegen: true,
  AuftraggeberSetzen: true,
  VergabeinformationenSetzen: true,
  LeitbeschreibungSetzen: true,
  Rueckgaengig: true,
  Wiederholen: true,
  MengenansatzSetzen: true,
  // v1.4 (Ticket 70; gespeichert seit Ticket 79)
  NachtragUebernehmen: true,
  NachtragsangabenSetzen: true,
  KostengruppeSetzen: true,
  VorlageSetzen: true,
  TextquelleSetzen: true,
  AufmassAnlegen: true,
  AufmasskopfSetzen: true,
  AufmasspositionSetzen: true,
  AufmasspositionEntfernen: true,
  AufmassLoeschen: true,
  RechnungAnlegen: true,
  RechnungsangabenSetzen: true,
  RechnungsaufmasseSetzen: true,
  RechnungsabzuegeSetzen: true,
  RechnungFreigeben: true,
  RechnungsfreigabeAufheben: true,
  RechnungLoeschen: true,
  // v1.7b (Ticket 128; die neuen Felder der Rechnung liest und prüft `speicher` seit Ticket 143, D-93)
  VertragsstrafeSetzen: true,
  SkontoSetzen: true,
  BauabzugsteuerSetzen: true,
  ZahlungErfassen: true,
  ZahlungAendern: true,
  ZahlungLoeschen: true,
  KostenermittlungAnlegen: true,
  KostenermittlungskopfSetzen: true,
  KostenermittlungseintragSetzen: true,
  KostenermittlungseintragEntfernen: true,
  KostenermittlungLoeschen: true,
  // v1.6 (Ticket 97; gespeichert seit Ticket 106)
  BauwerksmodellAnlegen: true,
  BauwerksmodellUmbenennen: true,
  BauwerksmodellLoeschen: true,
  BauteileZuordnen: true,
  BauzeitenplanAnlegen: true,
  BauzeitenplankopfSetzen: true,
  VorgangSetzen: true,
  VorgangEntfernen: true,
  BauzeitenplanLoeschen: true,
  HonorarberechnungAnlegen: true,
  HonorarberechnungSetzen: true,
  HonorarberechnungLoeschen: true,
  MangelAnlegen: true,
  MangelangabenSetzen: true,
  MangelstatusSetzen: true,
  MangelLoeschen: true,
  BautagebucheintragSetzen: true,
  BautagebucheintragLoeschen: true,
  // v1.7a (Ticket 127; mechanisch, gespeichert ab Ticket 139)
  BieterUmbenennen: true,
  BieterLoeschen: true,
  ProjektangabenSetzen: true,
  BieterangabenSetzen: true,
  LvStandUmbenennen: true,
  LvStandLoeschen: true,
  KalkulationSetzen: true,
  PreisspiegelEinstellungenSetzen: true,
  ZuschlagZuruecknehmen: true,
};

function jsonWert(x: unknown, pfad: string): void {
  if (x === null || typeof x === 'string' || typeof x === 'boolean') return;
  if (typeof x === 'number') {
    if (!Number.isSafeInteger(x))
      ungueltig(pfad, 'nur ganze Zahlen sind erlaubt (Geld steht als Zeichenkette)');
    return;
  }
  if (Array.isArray(x)) {
    (x as unknown[]).forEach((w, i) => {
      jsonWert(w, `${pfad}[${String(i)}]`);
    });
    return;
  }
  if (typeof x === 'object') {
    for (const [k, w] of Object.entries(x)) jsonWert(w, `${pfad}.${k}`);
    return;
  }
  ungueltig(pfad, 'kein JSON-Wert');
}

/** Hexadezimale Stellen je Prüfsummenalgorithmus (256 bzw. 512 Bit). */
const PRUEFSUMMENLAENGE: Record<Pruefsummenalgorithmus, number> = { 'sha-256': 64, 'sha-512': 128 };

/** Die langen Listen, die ein Massenbefehlskopf nicht trägt (E-13), je Befehlsart: Feld und Felder darin. */
const LANGE_LISTE: Record<Massenbefehlsart, [string, readonly string[]]> = {
  LeistungsverzeichnisAnlegen: ['inhalt', ['knoten']],
  AngebotAnlegen: ['angebot', ['positionen']],
  AuftragsLeistungsverzeichnisAnlegen: ['auftragsLeistungsverzeichnis', ['knoten']],
  AufmassAnlegen: ['aufmass', ['positionen']],
  // v1.6 (D-54): das Modell ohne Struktur und Bauteile
  BauwerksmodellAnlegen: ['bauwerksmodell', ['struktur', 'bauteile']],
};

/**
 * Kurzfassung eines Massenbefehls (E-13): Kopf eines Massenbefehls ohne seine lange Liste und eine Prüfsumme in
 * gültiger Form (bekannter Algorithmus, hexadezimal klein, passende Länge). Den Kopf selbst prüft der Dekoder wie
 * jeden Befehl nur auf seine Art (siehe Dateikopf); ob die Summe zum Befehl passt, kann ohne den Befehl niemand prüfen.
 */
function befehlskurzfassung(b: Roh, pfad: string): void {
  objekt(b, pfad, ['art', 'kopf', 'pruefsumme']);
  const kopf = objekt(feld(b, 'kopf'), `${pfad}.kopf`, Object.keys(feld(b, 'kopf') ?? {}));
  const art = aufzaehlung(feld(kopf, 'art'), `${pfad}.kopf.art`, MASSENBEFEHLSARTEN);
  const [aussen, listen] = LANGE_LISTE[art];
  const teil = feld(kopf, aussen);
  if (typeof teil !== 'object' || teil === null || Array.isArray(teil))
    ungueltig(`${pfad}.kopf.${aussen}`, 'Objekt erwartet');
  else
    for (const liste of listen)
      if (Object.hasOwn(teil, liste))
        ungueltig(`${pfad}.kopf.${aussen}.${liste}`, 'gehört nicht in den Kopf eines Massenbefehls');
  const q = `${pfad}.pruefsumme`;
  const ps = objekt(feld(b, 'pruefsumme'), q, ['algorithmus', 'wert']);
  const algorithmus = aufzaehlung(feld(ps, 'algorithmus'), `${q}.algorithmus`, [
    'sha-256',
    'sha-512',
  ] as const);
  const wert = zeichenkette(feld(ps, 'wert'), `${q}.wert`);
  const laenge = PRUEFSUMMENLAENGE[algorithmus];
  if (!new RegExp(`^[0-9a-f]{${String(laenge)}}$`).test(wert))
    ungueltig(`${q}.wert`, `${String(laenge)} hexadezimale Stellen (klein) erwartet für ${algorithmus}`);
}

function protokolleintrag(x: unknown, pfad: string): Protokolleintrag {
  const o = objekt(x, pfad, ['id', 'projektId', 'aggregat', 'wer', 'wann', 'befehl']);
  const ag = objekt(feld(o, 'aggregat'), `${pfad}.aggregat`, ['art', 'id']);
  const art = aufzaehlung(feld(ag, 'art'), `${pfad}.aggregat.art`, AGGREGATART_NAMEN);
  const befehl = feld(o, 'befehl');
  const b = objekt(
    befehl,
    `${pfad}.befehl`,
    Object.keys(befehl !== null && typeof befehl === 'object' ? befehl : {}),
  );
  const bart = zeichenkette(feld(b, 'art'), `${pfad}.befehl.art`);
  if (bart === 'Befehlskurzfassung') befehlskurzfassung(b, `${pfad}.befehl`);
  else if (bart === 'Rueckgaengig' || bart === 'Wiederholen') {
    // Historienbefehle (v1.2) haben genau eine Form; ihr Verweis wird in `pruefeHistorienbezuege` geprüft.
    const h = objekt(b, `${pfad}.befehl`, ['art', 'protokollId']);
    zeichenkette(feld(h, 'protokollId'), `${pfad}.befehl.protokollId`);
  } else if (!Object.hasOwn(BEFEHLSARTEN, bart))
    ungueltig(`${pfad}.befehl.art`, `unbekannter Befehl „${bart}“`);
  jsonWert(befehl, `${pfad}.befehl`);
  return {
    id: zeichenkette(feld(o, 'id'), `${pfad}.id`) as ProtokollId,
    projektId: zeichenkette(feld(o, 'projektId'), `${pfad}.projektId`) as ProjektId,
    aggregat: {
      art,
      id: zeichenkette(feld(ag, 'id'), `${pfad}.aggregat.id`),
    } as Protokolleintrag['aggregat'],
    wer: zeichenkette(feld(o, 'wer'), `${pfad}.wer`) as NutzerId,
    wann: zeichenkette(feld(o, 'wann'), `${pfad}.wann`) as Zeitstempel,
    befehl: befehl as Befehl | Befehlskurzfassung,
  };
}

/**
 * `Rueckgaengig`/`Wiederholen` im Protokoll der Datei (v1.2, S3): `protokollId` zeigt auf einen früheren Eintrag
 * derselben Datei (also desselben Projekts) mit demselben Aggregat, der kein Historienbefehl ist. Wie `anwenden`, nur
 * als `datei-ungueltig`. Ausnahme wie dort (D-31.1): Am Projekt darf der Verweis ins Leere zeigen, weil das Löschen des
 * Projekts sein Protokoll mitnahm, bevor die Umkehrung es wieder anlegte.
 */
function pruefeHistorienbezuege(protokoll: readonly Protokolleintrag[]): void {
  const frueher = new Map<string, Protokolleintrag>();
  protokoll.forEach((e, i) => {
    const b = e.befehl;
    if (b.art === 'Rueckgaengig' || b.art === 'Wiederholen') {
      const ziel = frueher.get(b.protokollId);
      const passt =
        ziel === undefined
          ? e.aggregat.art === 'projekt' && !protokoll.some((x) => x.id === b.protokollId)
          : ziel.aggregat.art === e.aggregat.art &&
            ziel.aggregat.id === e.aggregat.id &&
            ziel.befehl.art !== 'Rueckgaengig' &&
            ziel.befehl.art !== 'Wiederholen';
      if (!passt)
        ungueltig(
          `$.protokoll[${String(i)}].befehl.protokollId`,
          'zeigt auf keinen früheren ursprünglichen Befehl am selben Aggregat',
        );
    }
    frueher.set(e.id, e);
  });
}

/** Prüft eine bereits auf die aktuelle Version gehobene Projektdatei und liefert sie typisiert. */
export function dekodiereProjektdatei(roh: unknown, version: number): Projektdatei {
  const o = objekt(
    roh,
    '$',
    [
      'schemaVersion',
      'projekt',
      'leistungsverzeichnisse',
      'angebote',
      'auftragsLeistungsverzeichnisse',
      'protokoll',
    ],
    [
      'lvStaende',
      'aufmasse',
      'rechnungen',
      'kostenermittlungen',
      'bauwerksmodelle',
      'modelldateien',
      'bauzeitenplaene',
      'honorarberechnungen',
      'maengel',
      'bautagebuch',
      'einstellungen',
    ],
  );
  if (feld(o, 'schemaVersion') !== version) ungueltig('$.schemaVersion', `erwartet ${String(version)}`);
  const p = projekt(feld(o, 'projekt'), '$.projekt');
  const datei: Projektdatei = {
    schemaVersion: version,
    projekt: p,
    leistungsverzeichnisse: liste(feld(o, 'leistungsverzeichnisse'), '$.leistungsverzeichnisse').map((x, i) =>
      lvZustand(x, `$.leistungsverzeichnisse[${String(i)}]`),
    ),
    angebote: liste(feld(o, 'angebote'), '$.angebote').map((x, i) =>
      angebotZustand(x, `$.angebote[${String(i)}]`),
    ),
    auftragsLeistungsverzeichnisse: liste(
      feld(o, 'auftragsLeistungsverzeichnisse'),
      '$.auftragsLeistungsverzeichnisse',
    ).map((x, i) => auftragsLvZustand(x, `$.auftragsLeistungsverzeichnisse[${String(i)}]`)),
    protokoll: liste(feld(o, 'protokoll'), '$.protokoll').map((x, i) =>
      protokolleintrag(x, `$.protokoll[${String(i)}]`),
    ),
    ...optional(o, 'lvStaende', (v) =>
      liste(v, '$.lvStaende').map((s, i) => lvStand(s, `$.lvStaende[${String(i)}]`)),
    ),
    ...optional(o, 'aufmasse', (v) =>
      liste(v, '$.aufmasse').map((x, i) => aufmassZustand(x, `$.aufmasse[${String(i)}]`)),
    ),
    ...optional(o, 'rechnungen', (v) =>
      liste(v, '$.rechnungen').map((x, i) => rechnungZustand(x, `$.rechnungen[${String(i)}]`)),
    ),
    ...optional(o, 'kostenermittlungen', (v) =>
      liste(v, '$.kostenermittlungen').map((x, i) =>
        kostenermittlungZustand(x, `$.kostenermittlungen[${String(i)}]`),
      ),
    ),
    // Schema 6 (v1.6): wie die Listen aus Version 5 nur, wenn es welche gibt.
    ...optional(o, 'bauwerksmodelle', (v) =>
      liste(v, '$.bauwerksmodelle').map((x, i) =>
        bauwerksmodellZustand(x, `$.bauwerksmodelle[${String(i)}]`),
      ),
    ),
    ...optional(o, 'modelldateien', (v) =>
      liste(v, '$.modelldateien').map((x, i) => modelldateiEintrag(x, `$.modelldateien[${String(i)}]`)),
    ),
    ...optional(o, 'bauzeitenplaene', (v) =>
      liste(v, '$.bauzeitenplaene').map((x, i) => bauzeitenplanZustand(x, `$.bauzeitenplaene[${String(i)}]`)),
    ),
    ...optional(o, 'honorarberechnungen', (v) =>
      liste(v, '$.honorarberechnungen').map((x, i) =>
        honorarberechnungZustand(x, `$.honorarberechnungen[${String(i)}]`),
      ),
    ),
    ...optional(o, 'maengel', (v) =>
      liste(v, '$.maengel').map((x, i) => mangelZustand(x, `$.maengel[${String(i)}]`)),
    ),
    ...optional(o, 'bautagebuch', (v) =>
      liste(v, '$.bautagebuch').map((x, i) => bautagebucheintragZustand(x, `$.bautagebuch[${String(i)}]`)),
    ),
    // Schema 7 (v1.7a, D-127.9): die Einstellungen des Geräts als optionaler Block.
    ...optional(o, 'einstellungen', (v) => einstellungen(v, '$.einstellungen')),
  };
  // Alle Teile gehören zum Projekt der Datei.
  const fremd = [
    ...datei.leistungsverzeichnisse.map((z) => z.leistungsverzeichnis.projektId),
    ...datei.angebote.map((z) => z.angebot.projektId),
    ...datei.auftragsLeistungsverzeichnisse.map((z) => z.auftragsLeistungsverzeichnis.projektId),
    ...datei.protokoll.map((e) => e.projektId),
    ...(datei.lvStaende ?? []).map((s) => s.zustand.leistungsverzeichnis.projektId),
    ...(datei.aufmasse ?? []).map((z) => z.aufmass.projektId),
    ...(datei.rechnungen ?? []).map((z) => z.rechnung.projektId),
    ...(datei.kostenermittlungen ?? []).map((z) => z.kostenermittlung.projektId),
    ...(datei.bauwerksmodelle ?? []).map((z) => z.bauwerksmodell.projektId),
    ...(datei.bauzeitenplaene ?? []).map((z) => z.bauzeitenplan.projektId),
    ...(datei.honorarberechnungen ?? []).map((z) => z.honorarberechnung.projektId),
    ...(datei.maengel ?? []).map((z) => z.mangel.projektId),
    ...(datei.bautagebuch ?? []).map((z) => z.bautagebucheintrag.projektId),
  ].find((id) => id !== p.id);
  if (fremd !== undefined) ungueltig('$', `enthält Daten des fremden Projekts ${fremd}`);
  pruefeModelldateien(datei);
  pruefeHistorienbezuege(datei.protokoll);
  return datei;
}
