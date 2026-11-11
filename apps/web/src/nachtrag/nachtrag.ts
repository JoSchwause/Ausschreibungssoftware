// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 86 (A1, D-35): Nachträge in der App. Ein Nachtrag ist ein gewöhnliches Ausschreibungs-LV mit Nachtragsangaben;
// hier stehen nur reine Funktionen für die Oberfläche: Nummernvergabe, die Befehle zum Anlegen und die Vorschau der
// Beauftragung. Fachliches rechnen Kern (`auftragsLvBefehlAusfuehren`) und `abrechnung` (`nachtragUebernehmen`); geschrieben
// wird über den Befehlsweg (`speichern.ts`, A5).

import { nachtragUebernehmen, type NachtragIdQuelle, type Nachtragswarnung } from '@tethys/abrechnung';
import { auftragsLvBefehlAusfuehren, auftragsLvChangeSetAnwenden } from '@tethys/kern';
import type {
  Angebot,
  AngebotId,
  AngebotKopf,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvKopf,
  AuftragsLvZustand,
  Befehlsfehler,
  Betrag,
  Gesamtsummen,
  IdQuelle,
  Knoten,
  LeistungsverzeichnisAnlegen,
  LeistungsverzeichnisId,
  LvUebersicht,
  LvZustand,
  NachtragsangabenSetzen,
  NachtragUebernehmen,
} from '@tethys/vertrag';
import { bietersummen } from '../gaeb/gaeb';
import { ozText } from '../lv/oztext';
import { texte } from './texte';

const NUMMER = /^N(\d+)$/i;

/**
 * Die nächste Nachtragsnummer eines Auftrags-LV: die höchste vergebene der Form `N<Ziffern>` plus 1, mindestens zweistellig
 * (`N01`, `N02`, …, `N100`). Frei vergebene Nummern anderer Form zählen nicht (D-86.1).
 */
export function naechsteNachtragsnummer(
  lvs: readonly LvUebersicht[],
  auftragsLvId: AuftragsLeistungsverzeichnisId,
): string {
  let hoechste = 0;
  for (const l of lvs) {
    if (l.nachtrag?.auftragsLvId !== auftragsLvId) continue;
    const m = NUMMER.exec(l.nachtrag.nummer.trim());
    if (m?.[1] !== undefined) hoechste = Math.max(hoechste, Number(m[1]));
  }
  return `N${String(hoechste + 1).padStart(2, '0')}`;
}

export interface Nachtragsanlage {
  readonly nummer: string;
  readonly lvId: LeistungsverzeichnisId;
  /** Eine Befehlsfolge am neuen LV, ein Undo-Schritt: erst anlegen, dann die Nachtragsangaben setzen (D-35, Vertrag). */
  readonly befehle: readonly [LeistungsverzeichnisAnlegen, NachtragsangabenSetzen];
}

/**
 * „Nachtrag anlegen“ auf der Seite eines Auftrags-LV: ein leeres Ausschreibungs-LV mit OZ-Maske und MwSt-Satz des Auftrags-LV,
 * ohne Nachlass, Name „Nachtrag <Nummer> – <Bezeichnung>“, dazu die Nachtragsangaben mit der nächsten freien Nummer und dem
 * Status `angemeldet`.
 */
export function nachtragAnlegenPlanen(
  auftrag: Pick<AuftragsLvKopf, 'id' | 'projektId' | 'ozMaske' | 'mwstSatz'>,
  lvs: readonly LvUebersicht[],
  bezeichnung: string,
  ids: Pick<IdQuelle, 'leistungsverzeichnis'>,
): Nachtragsanlage {
  const nummer = naechsteNachtragsnummer(lvs, auftrag.id);
  const lvId = ids.leistungsverzeichnis();
  const anlegen: LeistungsverzeichnisAnlegen = {
    art: 'LeistungsverzeichnisAnlegen',
    id: lvId,
    projektId: auftrag.projektId,
    inhalt: {
      name: texte.lvName(nummer, bezeichnung.trim()),
      ozMaske: auftrag.ozMaske,
      mwstSatz: auftrag.mwstSatz,
      nachlass: null,
      wurzelId: lvId,
      knoten: [],
    },
  };
  const setzen: NachtragsangabenSetzen = {
    art: 'NachtragsangabenSetzen',
    nachtrag: { auftragsLvId: auftrag.id, nummer, status: 'angemeldet' },
  };
  return { nummer, lvId, befehle: [anlegen, setzen] };
}

export interface Beauftragungseingang {
  readonly auftrag: AuftragsLvZustand;
  /** Das beauftragte Angebot des Auftrags-LV; sein Bieter ist der Auftragnehmer. */
  readonly auftragsangebot: Pick<AngebotKopf, 'id' | 'bieterId'>;
  readonly nachtragsLv: LvZustand;
  /** Die Angebote zum Nachtrags-LV (alle Bieter); genommen wird das des Auftragnehmers. */
  readonly angebote: readonly Angebot[];
  /** Kennung der neuen Gliederung „Nachtrag <Nummer>“ (A2: Kennungen kommen von der App). */
  readonly ids: NachtragIdQuelle;
}

export interface Beauftragungsplan {
  /** `NachtragUebernehmen` für das Auftrags-LV; `null`, wenn es so nicht geht (`fehler`). */
  readonly befehl: NachtragUebernehmen | null;
  readonly fehler: string | null;
  /** Das Nachtragsangebot, dessen Preise übernommen werden. */
  readonly angebotId: AngebotId | null;
  /** Zahl der Positionen, die ins Auftrags-LV kommen. */
  readonly positionen: number;
  /** Netto des Nachtragsangebots (wie in der Nachtragsliste). */
  readonly angebotsnetto: Betrag | null;
  /** Summen des Auftrags-LV vor und nach der Übernahme, gerechnet vom Kern. */
  readonly auftrag: { readonly vorher: Gesamtsummen; readonly nachher: Gesamtsummen } | null;
  /** Hinweise in Worten (U5): Der Befehl entsteht trotzdem. */
  readonly warnungen: readonly string[];
}

/**
 * Das Nachtragsangebot des Auftragnehmers zum Nachtrags-LV: das Angebot mit dem Bieter des Auftrags; gibt es mehrere, das
 * zuletzt angelegte (größte Kennung, UUIDv7), D-86.3. `null`: keines.
 */
export function nachtragsangebot(
  angebote: readonly Angebot[],
  nachtragsLvId: LeistungsverzeichnisId,
  auftragsangebot: Pick<AngebotKopf, 'bieterId'>,
): { readonly angebot: Angebot; readonly anzahl: number } | null {
  const vom = angebote
    .filter((a) => a.leistungsverzeichnisId === nachtragsLvId && a.bieterId === auftragsangebot.bieterId)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const angebot = vom.at(-1);
  return angebot === undefined ? null : { angebot, anzahl: vom.length };
}

function fehlerText(f: Befehlsfehler): string {
  if (f.code === 'id-vergeben') return texte.beauftragen.schonUebernommen;
  if (f.code === 'ebene-ueberschritten') return texte.beauftragen.zuTief;
  if (f.feld === 'nachtragsLv.mwstSatz') return texte.beauftragen.andereMwst;
  return f.meldung;
}

function warnungText(w: Nachtragswarnung, knoten: ReadonlyMap<string, Knoten>): string {
  const t = texte.warnung;
  const p = (id: string): string => {
    const k = knoten.get(id);
    if (k === undefined) return id;
    if (k.art === 'hinweis') return t.hinweistext;
    return [ozText(k), k.kurztext].filter((x) => x !== '').join(' ');
  };
  switch (w.code) {
    case 'nachlass-ignoriert':
      return t.nachlassIgnoriert;
    case 'alternativen-entfallen':
      return t.alternativenEntfallen(w.positionIds.map(p));
    case 'los-wird-titel':
      return t.losWirdTitel(p(w.knotenId));
    case 'nicht-angeboten':
      return t.nichtAngeboten(p(w.positionId));
    case 'zuschlagssatz-fehlt':
      return t.satzFehlt(p(w.positionId));
    case 'bezug-entfernt':
      return t.bezugEntfernt(p(w.positionId), p(w.zielId));
    case 'oz-unpassend':
      return t.ozUnpassend(w.knotenIds.map(p));
  }
}

/**
 * Vorschau und Befehl für „Beauftragen“ (D-35): `nachtragUebernehmen` aus `abrechnung` mit dem Angebot des Auftragnehmers,
 * dazu die Summen des Auftrags-LV vorher und nachher aus dem Kern. Den Status `beauftragt` setzt der Befehlsweg danach
 * (`speichern.ts`).
 */
export function nachtragBeauftragenPlanen(e: Beauftragungseingang): Beauftragungsplan {
  const leer = {
    befehl: null,
    angebotId: null,
    positionen: 0,
    angebotsnetto: null,
    auftrag: null,
    warnungen: [],
  };
  const lv = e.nachtragsLv.leistungsverzeichnis;
  const wahl = nachtragsangebot(e.angebote, lv.id, e.auftragsangebot);
  if (wahl === null) {
    const name = e.auftrag.auftragsLeistungsverzeichnis.auftragnehmer?.name ?? null;
    return { ...leer, fehler: texte.beauftragen.keinAngebot(name) };
  }
  const r = nachtragUebernehmen(e.auftrag, e.nachtragsLv, wahl.angebot, e.auftragsangebot, e.ids);
  if (!r.ok) return { ...leer, angebotId: wahl.angebot.id, fehler: fehlerText(r.fehler) };
  const befehl = r.wert.befehl;
  const cs = auftragsLvBefehlAusfuehren(e.auftrag, befehl);
  if (!cs.ok) return { ...leer, angebotId: wahl.angebot.id, fehler: fehlerText(cs.fehler) };
  const nachher = auftragsLvChangeSetAnwenden(e.auftrag, cs.wert);
  // Namen aus dem Auftrags-LV danach (neue OZ), entfallene Alternativen aus dem Nachtrags-LV.
  const knoten = new Map<string, Knoten>([...lv.knoten, ...befehl.knoten].map((k) => [k.id, k]));
  const warnungen = r.wert.warnungen.map((w) => warnungText(w, knoten));
  if (wahl.anzahl > 1) warnungen.unshift(texte.warnung.mehrereAngebote(wahl.anzahl));
  return {
    befehl,
    fehler: null,
    angebotId: wahl.angebot.id,
    positionen: befehl.knoten.filter((k) => k.art === 'position').length,
    angebotsnetto: bietersummen(e.nachtragsLv, wahl.angebot).netto,
    auftrag: nachher === null ? null : { vorher: e.auftrag.summen.gesamt, nachher: nachher.summen.gesamt },
    warnungen,
  };
}
