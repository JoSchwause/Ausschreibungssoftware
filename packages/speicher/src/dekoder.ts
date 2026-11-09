// SPDX-License-Identifier: AGPL-3.0-or-later
// Strenge Prüfung einer Projektdatei der aktuellen Schemaversion. Unbekannte Felder, falsche Typen,
// Gleitkommazahlen und Dezimalwerte außerhalb der kanonischen Schreibweise sind `datei-ungueltig`: eine Datei
// wird nie halb oder verlustbehaftet übernommen (Q5).
//
// Befehle im Protokoll werden nur auf `art` und JSON-Tauglichkeit geprüft; ihre fachliche Form zu prüfen ist
// Sache des Kerns, den `speicher` nicht importieren darf (A3).

import { NACHKOMMASTELLEN } from '@tethys/vertrag';
import type {
  Angebot,
  AngebotId,
  AngebotKopf,
  AngebotZustand,
  Angebotsposition,
  AuftragsLeistungsverzeichnis,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvZustand,
  Befehl,
  Befehlsart,
  Betrag,
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
  Leistungsverzeichnis,
  LeistungsverzeichnisId,
  LosId,
  LvZustand,
  Menge,
  Nachlass,
  NutzerId,
  Ordnungszahl,
  OzMaske,
  OzStelle,
  PositionId,
  Positionsart,
  Projekt,
  ProjektId,
  Projektdatei,
  Protokolleintrag,
  ProtokollId,
  Prozent,
  Summenstand,
  TitelId,
  Zahlenart,
  Zeitstempel,
} from '@tethys/vertrag';
import { abbruch } from './ergebnis';

// --- Grundbausteine ----------------------------------------------------------------------------------------------

type Roh = Record<string, unknown>;

const ungueltig = (pfad: string, was: string): never => abbruch('datei-ungueltig', `${pfad}: ${was}`);

function objekt(x: unknown, pfad: string, felder: readonly string[]): Roh {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return ungueltig(pfad, 'Objekt erwartet');
  const o = x as Roh;
  for (const f of felder) if (!Object.hasOwn(o, f)) return ungueltig(pfad, `Feld „${f}“ fehlt`);
  for (const k of Object.keys(o)) if (!felder.includes(k)) return ungueltig(pfad, `unbekanntes Feld „${k}“`);
  return o;
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
  const o = objekt(x, pfad, ['gliederung', 'position', 'index', 'trennzeichen']);
  return {
    gliederung: liste(feld(o, 'gliederung'), `${pfad}.gliederung`).map((s, i) =>
      ozStelle(s, `${pfad}.gliederung[${String(i)}]`),
    ),
    position: ozStelle(feld(o, 'position'), `${pfad}.position`),
    index: oderNull(feld(o, 'index'), (v) => ozStelle(v, `${pfad}.index`)),
    trennzeichen: oderNull(feld(o, 'trennzeichen'), (v) => zeichenkette(v, `${pfad}.trennzeichen`)),
  };
}

function langtext(x: unknown, pfad: string): Langtext {
  return liste(x, pfad).map((b, i): LangtextBaustein => {
    const p = `${pfad}[${String(i)}]`;
    if (typeof b === 'object' && b !== null && (b as Roh)['art'] === 'bild') {
      const o = objekt(b, p, ['art', 'bild']);
      const bild = objekt(feld(o, 'bild'), `${p}.bild`, ['id', 'medientyp', 'daten']);
      return {
        art: 'bild',
        bild: {
          id: zeichenkette(feld(bild, 'id'), `${p}.bild.id`) as LangtextBildId,
          medientyp: zeichenkette(feld(bild, 'medientyp'), `${p}.bild.medientyp`),
          daten: zeichenkette(feld(bild, 'daten'), `${p}.bild.daten`),
        },
      };
    }
    const o = objekt(b, p, ['art', 'text']);
    aufzaehlung(feld(o, 'art'), `${p}.art`, ['text']);
    return { art: 'text', text: zeichenkette(feld(o, 'text'), `${p}.text`) };
  });
}
type LangtextBildId = Extract<LangtextBaustein, { art: 'bild' }>['bild']['id'];

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

const POSITIONSARTEN: readonly Positionsart[] = ['normal', 'bedarf', 'wahl', 'zuschlag', 'stundenlohn'];

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
      const o = objekt(x, pfad, [
        'art',
        'id',
        'elternId',
        'reihenfolge',
        'ordnungszahl',
        'ozIndex',
        'positionsart',
        'pauschal',
        'bedarfMitGesamtbetrag',
        'bezugspositionId',
        'grundpositionId',
        'kurztext',
        'langtext',
        'menge',
        'einheit',
        'einheitspreis',
        'epa',
      ]);
      const pid = (n: string): PositionId | null =>
        oderNull(feld(o, n), (v) => zeichenkette(v, `${pfad}.${n}`) as PositionId);
      return {
        ...lage(o),
        art: 'position',
        id: zeichenkette(feld(o, 'id'), `${pfad}.id`) as PositionId,
        ordnungszahl: oz(o),
        ozIndex: oderNull(feld(o, 'ozIndex'), (v) => zeichenkette(v, `${pfad}.ozIndex`)),
        positionsart: aufzaehlung(feld(o, 'positionsart'), `${pfad}.positionsart`, POSITIONSARTEN),
        pauschal: wahrheit(feld(o, 'pauschal'), `${pfad}.pauschal`),
        bedarfMitGesamtbetrag: wahrheit(feld(o, 'bedarfMitGesamtbetrag'), `${pfad}.bedarfMitGesamtbetrag`),
        bezugspositionId: pid('bezugspositionId'),
        grundpositionId: pid('grundpositionId'),
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

function summenstand(x: unknown, pfad: string): Summenstand {
  const o = objekt(x, pfad, ['positionen', 'gliederungen', 'gesamt']);
  const g = objekt(feld(o, 'gesamt'), `${pfad}.gesamt`, [
    'netto',
    'nachlass',
    'nettoNachNachlass',
    'mwst',
    'brutto',
  ]);
  const b = (n: string): Betrag => dezimal(feld(g, n), `${pfad}.gesamt.${n}`, 'betrag') as Betrag;
  const gesamt: Gesamtsummen = {
    netto: b('netto'),
    nachlass: b('nachlass'),
    nettoNachNachlass: b('nettoNachNachlass'),
    mwst: b('mwst'),
    brutto: b('brutto'),
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
      const go = objekt(p, q, ['gliederungId', 'summe']);
      return {
        gliederungId: zeichenkette(feld(go, 'gliederungId'), `${q}.gliederungId`) as GliederungId,
        summe: dezimal(feld(go, 'summe'), `${q}.summe`, 'betrag') as Betrag,
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

function lvZustand(x: unknown, pfad: string): LvZustand {
  const z = objekt(x, pfad, ['leistungsverzeichnis', 'summen']);
  const p = `${pfad}.leistungsverzeichnis`;
  const o = objekt(feld(z, 'leistungsverzeichnis'), p, [
    'id',
    'projektId',
    'name',
    'ozMaske',
    'mwstSatz',
    'nachlass',
    'knoten',
  ]);
  const lv: Leistungsverzeichnis = {
    id: zeichenkette(feld(o, 'id'), `${p}.id`) as LeistungsverzeichnisId,
    projektId: zeichenkette(feld(o, 'projektId'), `${p}.projektId`) as ProjektId,
    name: zeichenkette(feld(o, 'name'), `${p}.name`),
    ozMaske: ozMaske(feld(o, 'ozMaske'), `${p}.ozMaske`),
    mwstSatz: dezimal(feld(o, 'mwstSatz'), `${p}.mwstSatz`, 'prozent') as Prozent,
    nachlass: nachlass(feld(o, 'nachlass'), `${p}.nachlass`),
    knoten: liste(feld(o, 'knoten'), `${p}.knoten`).map((k, i) => knoten(k, `${p}.knoten[${String(i)}]`)),
  };
  return { leistungsverzeichnis: lv, summen: summenstand(feld(z, 'summen'), `${pfad}.summen`) };
}

function auftragsLvZustand(x: unknown, pfad: string): AuftragsLvZustand {
  const z = objekt(x, pfad, ['auftragsLeistungsverzeichnis', 'summen']);
  const p = `${pfad}.auftragsLeistungsverzeichnis`;
  const o = objekt(feld(z, 'auftragsLeistungsverzeichnis'), p, [
    'id',
    'projektId',
    'leistungsverzeichnisId',
    'angebotId',
    'name',
    'ozMaske',
    'mwstSatz',
    'nachlass',
    'knoten',
  ]);
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
    const ao = objekt(a, q, ['positionId', 'status', 'einheitspreis', 'epa']);
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
  PositionsartAendern: true,
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
  if (!Object.hasOwn(BEFEHLSARTEN, bart)) ungueltig(`${pfad}.befehl.art`, `unbekannter Befehl „${bart}“`);
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
    befehl: befehl as Befehl,
  };
}

/** Prüft eine bereits auf die aktuelle Version gehobene Projektdatei und liefert sie typisiert. */
export function dekodiereProjektdatei(roh: unknown, version: number): Projektdatei {
  const o = objekt(roh, '$', [
    'schemaVersion',
    'projekt',
    'leistungsverzeichnisse',
    'angebote',
    'auftragsLeistungsverzeichnisse',
    'protokoll',
  ]);
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
  };
  // Alle Teile gehören zum Projekt der Datei.
  const fremd = [
    ...datei.leistungsverzeichnisse.map((z) => z.leistungsverzeichnis.projektId),
    ...datei.angebote.map((z) => z.angebot.projektId),
    ...datei.auftragsLeistungsverzeichnisse.map((z) => z.auftragsLeistungsverzeichnis.projektId),
    ...datei.protokoll.map((e) => e.projektId),
  ].find((id) => id !== p.id);
  if (fremd !== undefined) ungueltig('$', `enthält Daten des fremden Projekts ${fremd}`);
  return datei;
}
