// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle am Bauwerksmodell (Ticket 108 Punkt 1; `vertrag` v1.6, D-97.2, D-97.3): Ausführen, Anwenden, Umkehren. Der
// Ausführer sieht nur das Modell und prüft die Form (`ungueltige-eingabe` mit `feld`); Verweise auf andere Aggregate (der
// Vorgänger) und auf die abgelegten Bytes hält `speicher` (`konflikt`). Doppelte GlobalIds sind kein Fehler (D-50): Ein
// Verweis meint das erste Objekt mit dieser GlobalId in der Reihenfolge des Modells (D-66). Das ChangeSet trägt den Kopf
// immer, Struktur und Bauteile nur beim Anlegen und Löschen (D-45, D-54). Rein (A2).

import { alsMenge } from '@tethys/dezimal';
import { IFC_GLOBALID_MUSTER } from '@tethys/vertrag';
import type {
  Bauteil,
  Bauteilmenge,
  Bauwerksmodell,
  BauwerksmodellBefehlAusfuehren,
  BauwerksmodellChangeSet,
  BauwerksmodellChangeSetAnwenden,
  BauwerksmodellChangeSetUmkehren,
  BauwerksmodellInhalt,
  BauwerksmodellKopf,
  Befehlsfehler,
  Befehlsfehlercode,
  Ergebnis,
  IfcGlobalId,
  Strukturknoten,
} from '@tethys/vertrag';
import { modellIndex } from './form';

type Antwort = Ergebnis<BauwerksmodellChangeSet, Befehlsfehler>;

const HASH = /^[0-9a-f]{64}$/;
const DATUM = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;
const KOSTENGRUPPE = /^[1-9][0-9]{2}$/;
const SCHEMATA: ReadonlySet<string> = new Set(['IFC2X3', 'IFC4']);
const MENGENARTEN: ReadonlySet<string> = new Set([
  'laenge',
  'flaeche',
  'volumen',
  'anzahl',
  'gewicht',
  'zeit',
]);
const KNOTENARTEN: ReadonlySet<string> = new Set(['projekt', 'grundstueck', 'gebaeude', 'geschoss', 'raum']);

function nein(code: Befehlsfehlercode, meldung: string, feld?: string): Antwort {
  return { ok: false, fehler: feld === undefined ? { code, meldung } : { code, meldung, feld } };
}

const istText = (w: unknown): w is string => typeof w === 'string';
const nichtLeer = (w: unknown): boolean => istText(w) && w.trim() !== '';
/** Ob ein (womöglich falsch getypter) Wert in der Menge steht. */
const enthaelt = (ids: ReadonlySet<IfcGlobalId>, w: unknown): boolean => ids.has(w as IfcGlobalId);
const istListe = (w: unknown): boolean => Array.isArray(w);
const istGlobalId = (w: unknown): boolean => istText(w) && IFC_GLOBALID_MUSTER.test(w);

/** Ein Kalendertag `JJJJ-MM-TT` (gregorianisch, ohne Uhr). */
function istDatum(w: unknown): boolean {
  if (!istText(w)) return false;
  const t = DATUM.exec(w);
  if (!t) return false;
  const [jahr, monat, tag] = [Number(t[1]), Number(t[2]), Number(t[3])];
  const schalt = (jahr % 4 === 0 && jahr % 100 !== 0) || jahr % 400 === 0;
  const tage = [31, schalt ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][monat - 1];
  return tage !== undefined && tag >= 1 && tag <= tage;
}

/** Formfehler einer Menge oder `null`. */
function mengeFehler(q: Bauteilmenge): string | null {
  if (q.satz !== null && !istText(q.satz)) return 'Mengensatz ist kein Text';
  if (!nichtLeer(q.name)) return 'Menge ohne Namen';
  if (!MENGENARTEN.has(q.art)) return `Art der Menge ${q.name} unbekannt: ${JSON.stringify(q.art)}`;
  if (!istText(q.wert) || !alsMenge(q.wert).ok)
    return `Menge ${q.name} ist kein Wert mit 3 Stellen: ${JSON.stringify(q.wert)}`;
  return null;
}

function mengenFehler(mengen: readonly Bauteilmenge[]): string | null {
  if (!istListe(mengen)) return 'Mengen sind keine Liste';
  for (const q of mengen) {
    const f = mengeFehler(q);
    if (f) return f;
  }
  return null;
}

/**
 * Sucht einen Ring in einer Verweiskette (Eltern bzw. Ganzes), nur über die ersten Objekte je GlobalId (D-66). Liefert eine
 * GlobalId im Ring oder `null`.
 */
function ring(ids: Iterable<IfcGlobalId>, nach: (id: IfcGlobalId) => IfcGlobalId | null): IfcGlobalId | null {
  const zustand = new Map<IfcGlobalId, 1 | 2>(); // 1: auf dem Weg, 2: fertig
  for (const start of ids) {
    const weg: IfcGlobalId[] = [];
    let id: IfcGlobalId | null = start;
    while (id !== null && zustand.get(id) !== 2) {
      if (zustand.get(id) === 1) return id;
      zustand.set(id, 1);
      weg.push(id);
      id = nach(id);
    }
    for (const w of weg) zustand.set(w, 2);
  }
  return null;
}

function strukturFehler(struktur: readonly Strukturknoten[]): string | null {
  if (!istListe(struktur)) return 'Struktur ist keine Liste';
  const ids = new Set<IfcGlobalId>();
  for (const k of struktur) ids.add(k.globalId);
  for (const [i, k] of struktur.entries()) {
    const wo = `struktur[${String(i)}]`;
    if (!istGlobalId(k.globalId)) return `${wo}: GlobalId nicht in Form: ${JSON.stringify(k.globalId)}`;
    if (!KNOTENARTEN.has(k.art)) return `${wo} (${k.globalId}): Art unbekannt: ${JSON.stringify(k.art)}`;
    if (k.name !== null && !istText(k.name)) return `${wo} (${k.globalId}): Name ist kein Text`;
    if (k.elternGlobalId !== null && !ids.has(k.elternGlobalId))
      return `${wo} (${k.globalId}): Elternknoten ${String(k.elternGlobalId)} steht nicht in der Struktur`;
    const q = mengenFehler(k.mengen);
    if (q) return `${wo} (${k.globalId}): ${q}`;
  }
  const index = modellIndex({ struktur, bauteile: [] });
  const r = ring(index.knoten.keys(), (id) => index.knoten.get(id)?.elternGlobalId ?? null);
  return r === null ? null : `Die Struktur hat einen Ring über ${r}`;
}

function bauteilFehler(
  b: Bauteil,
  wo: string,
  knoten: ReadonlySet<IfcGlobalId>,
  bauteile: ReadonlySet<IfcGlobalId>,
) {
  if (!istGlobalId(b.globalId)) return `${wo}: GlobalId nicht in Form: ${JSON.stringify(b.globalId)}`;
  const was = `${wo} (${b.globalId})`;
  if (!nichtLeer(b.ifcKlasse)) return `${was}: IFC-Klasse fehlt`;
  if (b.name !== null && !istText(b.name)) return `${was}: Name ist kein Text`;
  if (b.typ !== null && !istText(b.typ)) return `${was}: Typ ist kein Text`;
  if (b.strukturGlobalId !== null && !knoten.has(b.strukturGlobalId))
    return `${was}: Strukturknoten ${String(b.strukturGlobalId)} steht nicht in der Struktur`;
  if ('teilVonGlobalId' in b && !enthaelt(bauteile, b.teilVonGlobalId))
    return `${was}: Ganzes ${String(b.teilVonGlobalId)} ist kein Bauteil des Modells`;
  if ('kostengruppe' in b && !(istText(b.kostengruppe) && KOSTENGRUPPE.test(b.kostengruppe)))
    return `${was}: Kostengruppe nicht in Form: ${JSON.stringify(b.kostengruppe)}`;
  const q = mengenFehler(b.mengen);
  return q ? `${was}: ${q}` : null;
}

function bauteileFehler(bm: Pick<Bauwerksmodell, 'struktur' | 'bauteile'>): string | null {
  if (!istListe(bm.bauteile)) return 'Bauteile sind keine Liste';
  const knoten = new Set<IfcGlobalId>(bm.struktur.map((k) => k.globalId));
  const index = modellIndex(bm);
  const ids = new Set<IfcGlobalId>(index.bauteil.keys());
  for (const [i, b] of bm.bauteile.entries()) {
    const f = bauteilFehler(b, `bauteile[${String(i)}]`, knoten, ids);
    if (f) return f;
  }
  const r = ring(index.bauteil.keys(), (id) => index.bauteil.get(id)?.teilVonGlobalId ?? null);
  return r === null ? null : `Die Teile haben einen Ring über ${r}`;
}

/** Formfehler des ganzen Modells beim Anlegen oder `null`. */
function modellFehler(bm: Bauwerksmodell): Antwort | null {
  const u = (meldung: string, feld: string) => nein('ungueltige-eingabe', meldung, feld);
  if (!nichtLeer(bm.name)) return u('Der Name ist leer', 'name');
  const d = bm.datei;
  if (!istText(d.hash) || !HASH.test(d.hash))
    return u(`Hash nicht 64 Hexziffern klein: ${JSON.stringify(d.hash)}`, 'datei.hash');
  if (!nichtLeer(d.dateiname)) return u('Der Dateiname ist leer', 'datei.dateiname');
  if (!Number.isSafeInteger(d.groesse) || d.groesse < 0)
    return u(`Größe keine ganze Zahl ≥ 0: ${String(d.groesse)}`, 'datei.groesse');
  if (!SCHEMATA.has(bm.schema)) return u(`Schema unbekannt: ${JSON.stringify(bm.schema)}`, 'schema');
  if (!istDatum(bm.eingelesen))
    return u(`Kein Tag JJJJ-MM-TT: ${JSON.stringify(bm.eingelesen)}`, 'eingelesen');
  if (bm.vorgaengerId === bm.id) return u('Das Modell nennt sich selbst als Vorgänger', 'vorgaengerId');
  const s = strukturFehler(bm.struktur);
  if (s) return u(s, 'struktur');
  const b = bauteileFehler(bm);
  if (b) return u(b, 'bauteile');
  return null;
}

/** Der Kopf eines Modells: alles außer Struktur und Bauteilen, ausdrücklich gebaut (keine Kopie der Listen). */
function kopfVon(bm: BauwerksmodellKopf): BauwerksmodellKopf {
  return {
    id: bm.id,
    projektId: bm.projektId,
    name: bm.name,
    datei: bm.datei,
    schema: bm.schema,
    vorgaengerId: bm.vorgaengerId,
    eingelesen: bm.eingelesen,
  };
}

const inhaltVon = (bm: Bauwerksmodell): BauwerksmodellInhalt => ({
  struktur: bm.struktur,
  bauteile: bm.bauteile,
});

/**
 * Führt einen Befehl am Bauwerksmodell aus. `BauwerksmodellAnlegen` braucht `zustand === null`, jeder andere Befehl einen
 * Zustand; sonst `befehl-nicht-zustaendig` (wie Kern und `kosten`).
 */
export const bauwerksmodellBefehlAusfuehren: BauwerksmodellBefehlAusfuehren = (zustand, befehl) => {
  if (befehl.art === 'BauwerksmodellAnlegen') {
    if (zustand !== null)
      return nein('befehl-nicht-zustaendig', `${befehl.art}: das Modell existiert schon.`);
    const bm = befehl.bauwerksmodell;
    const f = modellFehler(bm);
    if (f) return f;
    return {
      ok: true,
      wert: {
        art: 'bauwerksmodell',
        bauwerksmodellId: bm.id,
        kopf: { vorher: null, nachher: kopfVon(bm) },
        inhalt: { vorher: null, nachher: inhaltVon(bm) },
      },
    };
  }
  if (zustand === null)
    return nein('befehl-nicht-zustaendig', `${befehl.art}: kein Bauwerksmodell übergeben.`);
  const bm = zustand.bauwerksmodell;
  switch (befehl.art) {
    case 'BauwerksmodellUmbenennen': {
      if (!nichtLeer(befehl.name)) return nein('ungueltige-eingabe', 'Der Name ist leer', 'name');
      const kopf = kopfVon(bm);
      return {
        ok: true,
        wert: {
          art: 'bauwerksmodell',
          bauwerksmodellId: bm.id,
          kopf: { vorher: kopf, nachher: { ...kopf, name: befehl.name } },
        },
      };
    }
    case 'BauwerksmodellLoeschen':
      return {
        ok: true,
        wert: {
          art: 'bauwerksmodell',
          bauwerksmodellId: bm.id,
          kopf: { vorher: kopfVon(bm), nachher: null },
          inhalt: { vorher: inhaltVon(bm), nachher: null },
        },
      };
  }
};

/**
 * Wendet ein ChangeSet an: Anlegen mit Kopf und Inhalt, Löschen ergibt `null`, Umbenennen ersetzt den Kopf und behält
 * Struktur und Bauteile des Zustands (dieselben Listen, keine Kopie). Ein ChangeSet, das die Form aus `vertrag` verletzt
 * (Anlegen oder Löschen ohne `inhalt`, Umbenennen mit `inhalt` oder ohne Zustand), ist ein Programmfehler (D-66).
 */
export const bauwerksmodellChangeSetAnwenden: BauwerksmodellChangeSetAnwenden = (zustand, changeSet) => {
  const { kopf, inhalt } = changeSet;
  const entstehtOderVergeht = kopf.vorher === null || kopf.nachher === null;
  if (entstehtOderVergeht !== (inhalt !== undefined))
    throw new Error(
      `Bauwerksmodell ${changeSet.bauwerksmodellId}: inhalt passt nicht zum Kopf des ChangeSets`,
    );
  if (kopf.nachher === null) return null;
  if (inhalt !== undefined) {
    if (inhalt.nachher === null)
      throw new Error(`Bauwerksmodell ${changeSet.bauwerksmodellId}: Anlegen ohne Struktur und Bauteile`);
    return { bauwerksmodell: { ...kopfVon(kopf.nachher), ...inhalt.nachher } };
  }
  if (zustand === null)
    throw new Error(`Bauwerksmodell ${changeSet.bauwerksmodellId}: Umbenennen ohne Zustand`);
  return { bauwerksmodell: { ...kopfVon(kopf.nachher), ...inhaltVon(zustand.bauwerksmodell) } };
};

/** Kehrt ein ChangeSet um: Tausch von `vorher` und `nachher` in Kopf und Inhalt. */
export const bauwerksmodellChangeSetUmkehren: BauwerksmodellChangeSetUmkehren = (changeSet) => {
  const kopf = { vorher: changeSet.kopf.nachher, nachher: changeSet.kopf.vorher };
  const { inhalt } = changeSet;
  return inhalt === undefined
    ? { art: changeSet.art, bauwerksmodellId: changeSet.bauwerksmodellId, kopf }
    : {
        art: changeSet.art,
        bauwerksmodellId: changeSet.bauwerksmodellId,
        kopf,
        inhalt: { vorher: inhalt.nachher, nachher: inhalt.vorher },
      };
};
