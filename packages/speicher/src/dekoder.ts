// SPDX-License-Identifier: AGPL-3.0-or-later
// Strenge Prüfung einer Projektdatei der aktuellen Schemaversion. Unbekannte Felder, falsche Typen,
// Gleitkommazahlen und Dezimalwerte außerhalb der kanonischen Schreibweise sind `datei-ungueltig`: eine Datei
// wird nie halb oder verlustbehaftet übernommen (Q5).
//
// Befehle im Protokoll werden nur auf `art` und JSON-Tauglichkeit geprüft; ihre fachliche Form zu prüfen ist
// Sache des Kerns, den `speicher` nicht importieren darf (A3).

import { MASSENBEFEHLSARTEN, NACHKOMMASTELLEN } from '@tethys/vertrag';
import type {
  Angebot,
  AngebotId,
  AngebotKopf,
  AngebotZustand,
  Angebotsposition,
  Auftraggeber,
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
  Gesamtsummen,
  GliederungId,
  HinweistextId,
  Knoten,
  Langtext,
  LangtextBaustein,
  LangtextInline,
  LangtextInnen,
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
  Summenstand,
  Tabellenzeile,
  Tabellenzelle,
  Textbild,
  Textfluss,
  Textlauf,
  TitelId,
  Unterbeschreibung,
  Vergabeinformationen,
  Wahlzuordnung,
  Zahlenart,
  Zeitstempel,
  Zuschlag,
  Zuschlagsbezug,
} from '@tethys/vertrag';
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
// unter 1 und eine Textergänzung unterhalb der obersten Ebene sind `datei-ungueltig` mit Pfad. Eine Datei der
// Schemaversion 1 kann damit Bausteine enthalten, die ein älterer Stand der App nicht liest (rückwärts lesen bleibt
// garantiert, vorwärts nicht; A8).

/** Wo ein Baustein steht; jede Ebene erlaubt eine Teilmenge der Arten (Vertrag `modell.ts`). */
type Ebene = 'langtext' | 'innen' | 'absatz' | 'textfluss';

const ARTEN_JE_EBENE: Record<Ebene, readonly string[]> = {
  langtext: ['text', 'umbruch', 'bild', 'absatz', 'liste', 'tabelle', 'ergaenzung'],
  innen: ['text', 'umbruch', 'bild', 'absatz', 'liste', 'tabelle'],
  absatz: ['text', 'umbruch', 'bild'],
  textfluss: ['text', 'umbruch'],
};
const ORT: Record<Ebene, string> = {
  langtext: 'im Langtext',
  innen: 'in einem Listenpunkt oder einer Tabellenzelle',
  absatz: 'in einem Absatz',
  textfluss: 'in einer Textergänzung',
};

const AUSZEICHNUNGEN = ['fett', 'kursiv', 'unterstrichen'] as const;

function textlauf(x: unknown, pfad: string): Textlauf {
  const o = objekt(x, pfad, ['art', 'text', ...AUSZEICHNUNGEN.filter((a) => Object.hasOwn(x as Roh, a))]);
  const t: { -readonly [K in keyof Textlauf]: Textlauf[K] } = {
    art: 'text',
    text: zeichenkette(feld(o, 'text'), `${pfad}.text`),
  };
  for (const a of AUSZEICHNUNGEN) {
    if (!Object.hasOwn(o, a)) continue;
    if (feld(o, a) !== true) ungueltig(`${pfad}.${a}`, 'nur true erlaubt; ohne Auszeichnung fehlt das Feld');
    t[a] = true;
  }
  return t;
}

function textbild(x: unknown, pfad: string): Textbild {
  const o = objekt(x, pfad, ['art', 'bild']);
  const b = objekt(feld(o, 'bild'), `${pfad}.bild`, ['id', 'medientyp', 'daten']);
  return {
    art: 'bild',
    bild: {
      id: zeichenkette(feld(b, 'id'), `${pfad}.bild.id`) as LangtextBildId,
      medientyp: zeichenkette(feld(b, 'medientyp'), `${pfad}.bild.medientyp`),
      daten: zeichenkette(feld(b, 'daten'), `${pfad}.bild.daten`),
    },
  };
}
type LangtextBildId = Textbild['bild']['id'];

const bausteine = (x: unknown, pfad: string, ebene: Ebene): LangtextBaustein[] =>
  liste(x, pfad).map((b, i) => baustein(b, `${pfad}[${String(i)}]`, ebene));

function baustein(x: unknown, pfad: string, ebene: Ebene): LangtextBaustein {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return ungueltig(pfad, 'Objekt erwartet');
  const art = aufzaehlung((x as Roh)['art'], `${pfad}.art`, ARTEN_JE_EBENE.langtext);
  if (!ARTEN_JE_EBENE[ebene].includes(art))
    return ungueltig(`${pfad}.art`, `„${art}“ steht nicht ${ORT[ebene]}`);
  switch (art) {
    case 'text':
      return textlauf(x, pfad);
    case 'umbruch':
      objekt(x, pfad, ['art']);
      return { art: 'umbruch' };
    case 'bild':
      return textbild(x, pfad);
    case 'absatz': {
      const o = objekt(x, pfad, ['art', 'inhalt']);
      return {
        art: 'absatz',
        inhalt: bausteine(feld(o, 'inhalt'), `${pfad}.inhalt`, 'absatz') as LangtextInline[],
      };
    }
    case 'liste': {
      const o = objekt(x, pfad, ['art', 'geordnet', 'punkte']);
      return {
        art: 'liste',
        geordnet: wahrheit(feld(o, 'geordnet'), `${pfad}.geordnet`),
        punkte: liste(feld(o, 'punkte'), `${pfad}.punkte`).map(
          (p, i) => bausteine(p, `${pfad}.punkte[${String(i)}]`, 'innen') as LangtextInnen,
        ),
      };
    }
    case 'tabelle': {
      const o = objekt(x, pfad, ['art', 'zeilen']);
      return {
        art: 'tabelle',
        zeilen: liste(feld(o, 'zeilen'), `${pfad}.zeilen`).map((z, i): Tabellenzeile => {
          const q = `${pfad}.zeilen[${String(i)}]`;
          const zo = objekt(z, q, ['zellen']);
          return {
            zellen: liste(feld(zo, 'zellen'), `${q}.zellen`).map((c, j): Tabellenzelle => {
              const r = `${q}.zellen[${String(j)}]`;
              const co = objekt(c, r, ['spalten', 'inhalt']);
              const spalten = ganz(feld(co, 'spalten'), `${r}.spalten`);
              if (spalten < 1) ungueltig(`${r}.spalten`, 'mindestens 1 erwartet');
              return {
                spalten,
                inhalt: bausteine(feld(co, 'inhalt'), `${r}.inhalt`, 'innen') as LangtextInnen,
              };
            }),
          };
        }),
      };
    }
    default: {
      const o = objekt(x, pfad, ['art', 'herkunft', 'kennung', 'leer', 'davor', 'inhalt', 'danach']);
      const fluss = (n: string): Textfluss => bausteine(feld(o, n), `${pfad}.${n}`, 'textfluss') as Textfluss;
      return {
        art: 'ergaenzung',
        herkunft: aufzaehlung(feld(o, 'herkunft'), `${pfad}.herkunft`, ['bieter', 'ausschreibender']),
        kennung: zeichenkette(feld(o, 'kennung'), `${pfad}.kennung`),
        leer: wahrheit(feld(o, 'leer'), `${pfad}.leer`),
        davor: fluss('davor'),
        inhalt: fluss('inhalt'),
        danach: fluss('danach'),
      };
    }
  }
}

const langtext = (x: unknown, pfad: string): Langtext => bausteine(x, pfad, 'langtext');

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

const KOPFDATEN = ['auftraggeber', 'vergabeinformationen'] as const;

function kopfdaten(
  o: Roh,
  pfad: string,
): Pick<Leistungsverzeichnis, 'auftraggeber' | 'vergabeinformationen'> {
  return {
    ...optional(o, 'auftraggeber', (v) => auftraggeber(v, `${pfad}.auftraggeber`)),
    ...optional(o, 'vergabeinformationen', (v) => vergabeinformationen(v, `${pfad}.vergabeinformationen`)),
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
        ['leitbeschreibung'],
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
  const o = objekt(x, pfad, ['id', 'name', 'bauherr', 'bieter']);
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
      const bo = objekt(b, q, ['id', 'name']);
      return {
        id: zeichenkette(feld(bo, 'id'), `${q}.id`) as BieterId,
        name: zeichenkette(feld(bo, 'name'), `${q}.name`),
      };
    }),
  };
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
    KOPFDATEN,
  );
  const lv: Leistungsverzeichnis = {
    id: zeichenkette(feld(o, 'id'), `${p}.id`) as LeistungsverzeichnisId,
    projektId: zeichenkette(feld(o, 'projektId'), `${p}.projektId`) as ProjektId,
    name: zeichenkette(feld(o, 'name'), `${p}.name`),
    ozMaske: ozMaske(feld(o, 'ozMaske'), `${p}.ozMaske`),
    mwstSatz: dezimal(feld(o, 'mwstSatz'), `${p}.mwstSatz`, 'prozent') as Prozent,
    nachlass: nachlass(feld(o, 'nachlass'), `${p}.nachlass`),
    ...kopfdaten(o, p),
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

/** Die lange Liste, die ein Massenbefehlskopf nicht trägt (E-13), je Befehlsart: Feld und Feld darin. */
const LANGE_LISTE: Record<Massenbefehlsart, [string, string]> = {
  LeistungsverzeichnisAnlegen: ['inhalt', 'knoten'],
  AngebotAnlegen: ['angebot', 'positionen'],
  AuftragsLeistungsverzeichnisAnlegen: ['auftragsLeistungsverzeichnis', 'knoten'],
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
  const [aussen, liste] = LANGE_LISTE[art];
  const teil = feld(kopf, aussen);
  if (typeof teil !== 'object' || teil === null || Array.isArray(teil))
    ungueltig(`${pfad}.kopf.${aussen}`, 'Objekt erwartet');
  else if (Object.hasOwn(teil, liste))
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
  const art = aufzaehlung(feld(ag, 'art'), `${pfad}.aggregat.art`, [
    'projekt',
    'leistungsverzeichnis',
    'angebot',
    'auftrags-leistungsverzeichnis',
  ]);
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
    ['lvStaende'],
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
  };
  // Alle Teile gehören zum Projekt der Datei.
  const fremd = [
    ...datei.leistungsverzeichnisse.map((z) => z.leistungsverzeichnis.projektId),
    ...datei.angebote.map((z) => z.angebot.projektId),
    ...datei.auftragsLeistungsverzeichnisse.map((z) => z.auftragsLeistungsverzeichnis.projektId),
    ...datei.protokoll.map((e) => e.projektId),
    ...(datei.lvStaende ?? []).map((s) => s.zustand.leistungsverzeichnis.projektId),
  ].find((id) => id !== p.id);
  if (fremd !== undefined) ungueltig('$', `enthält Daten des fremden Projekts ${fremd}`);
  pruefeHistorienbezuege(datei.protokoll);
  return datei;
}
