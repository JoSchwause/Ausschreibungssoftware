// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 86 (A1, D-35): Nachträge auf dem Befehlsweg der App (A5, U7). Beide Aktionen sind Befehlsfolgen mit **einem**
// Undo-Schritt und laufen in der Kette des Befehlswegs, damit kein anderer Befehl dazwischenkommt und Nummer und Übernahme
// auf dem gespeicherten Stand entstehen (doppelter Klick, zweiter Tab, E-14):
// - „Nachtrag anlegen“: `LeistungsverzeichnisAnlegen` + `NachtragsangabenSetzen` am neuen LV;
// - „Beauftragen“: `NachtragUebernehmen` am Auftrags-LV, dann `NachtragsangabenSetzen { status: 'beauftragt' }` am
//   Nachtrags-LV (D-35: erst übernehmen, dann Status).
// Weist der Speicher die zweite Hälfte ab, bleibt die erste geschrieben und ist ein eigener Undo-Schritt; die Nachtragsliste
// zeigt den Befund (U5, `nachtragsbefunde`).

import { nachtragsbefunde, type Nachtragsbefund } from '@tethys/abrechnung';
import { auftragsLvBefehlAusfuehren } from '@tethys/kern';
import type {
  Angebot,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvKopf,
  AuftragsLvZustand,
  Betrag,
  BieterId,
  Ergebnis,
  LeistungsverzeichnisId,
  LvZustand,
  Nachtragsstatus,
  Projekt,
  Speicher,
  Speicherfehler,
} from '@tethys/vertrag';
import { bietersummen } from '../gaeb/gaeb';
import type { Teil } from '../historie/historie';
import {
  eintrag,
  lvBefehlAnwenden,
  speichern,
  type Abweisung,
  type Ausgang,
  type Befehlsweg,
  type LvSitzung,
} from '../lv/befehlsweg';
import {
  nachtragAnlegenPlanen,
  nachtragBeauftragenPlanen,
  nachtragsangebot,
  type Beauftragungsplan,
} from './nachtrag';
import { texte } from './texte';

const speicherfehler = (fehler: Speicherfehler): { ok: false; abweisung: Abweisung } => ({
  ok: false,
  abweisung: { art: 'speicher', fehler },
});

export type Nachtragsanlageausgang =
  | { readonly ok: true; readonly lvId: LeistungsverzeichnisId; readonly nummer: string }
  | { readonly ok: false; readonly abweisung: Abweisung };

/** „Nachtrag anlegen“ zu einem Auftrags-LV; die Nummer entsteht in der Kette aus der LV-Liste des Projekts (D-43). */
export function nachtragAnlegen(
  weg: Befehlsweg,
  auftrag: Pick<AuftragsLvKopf, 'id' | 'projektId' | 'ozMaske' | 'mwstSatz'>,
  bezeichnung: string,
): Promise<Nachtragsanlageausgang> {
  const u = weg.umgebung;
  return weg.reihe(async (): Promise<Nachtragsanlageausgang> => {
    const lvs = await u.speicher.leistungsverzeichnisse.auflisten(auftrag.projektId);
    if (!lvs.ok) return speicherfehler(lvs.fehler);
    const plan = nachtragAnlegenPlanen(auftrag, lvs.wert, bezeichnung, u.ids);
    const teile: Teil[] = [];
    try {
      let zustand: LvZustand | null = null;
      for (const befehl of plan.befehle) {
        const a = await lvBefehlAnwenden(u, auftrag.projektId, zustand, befehl);
        if (!a.ok) return { ok: false, abweisung: a.abweisung };
        teile.push(a.teil);
        zustand = a.zustand;
      }
    } finally {
      weg.historie.aufnehmen(teile);
    }
    return { ok: true, lvId: plan.lvId, nummer: plan.nummer };
  });
}

/** Die Angebote zum LV, ganz. */
async function angeboteLaden(
  speicher: Speicher,
  lvId: LeistungsverzeichnisId,
): Promise<Ergebnis<Angebot[], Speicherfehler>> {
  const ids = await speicher.angebote.auflisten(lvId);
  if (!ids.ok) return ids;
  const angebote: Angebot[] = [];
  for (const id of ids.wert) {
    const a = await speicher.angebote.laden(id);
    if (!a.ok) return a;
    angebote.push(a.wert.angebot);
  }
  return { ok: true, wert: angebote };
}

/** Was „Beauftragen“ braucht, frisch aus dem Speicher (oder das Nachtrags-LV aus der offenen Seite). */
async function beauftragungLaden(
  speicher: Speicher,
  auftragsLvId: AuftragsLeistungsverzeichnisId,
  nachtragsLvId: LeistungsverzeichnisId,
  sitzung: LvSitzung | undefined,
): Promise<
  Ergebnis<
    {
      auftrag: AuftragsLvZustand;
      auftragsangebot: Angebot;
      nachtragsLv: LvZustand;
      angebote: readonly Angebot[];
    },
    Speicherfehler
  >
> {
  const auftrag = await speicher.auftragsLeistungsverzeichnisse.laden(auftragsLvId);
  if (!auftrag.ok) return auftrag;
  const aa = await speicher.angebote.laden(auftrag.wert.auftragsLeistungsverzeichnis.angebotId);
  if (!aa.ok) return aa;
  let nachtragsLv = sitzung?.zustand ?? null;
  if (nachtragsLv?.leistungsverzeichnis.id !== nachtragsLvId) {
    const l = await speicher.leistungsverzeichnisse.laden(nachtragsLvId);
    if (!l.ok) return l;
    nachtragsLv = l.wert;
  }
  const angebote = await angeboteLaden(speicher, nachtragsLvId);
  if (!angebote.ok) return angebote;
  return {
    ok: true,
    wert: { auftrag: auftrag.wert, auftragsangebot: aa.wert.angebot, nachtragsLv, angebote: angebote.wert },
  };
}

/** Für die Vorschau im Dialog: derselbe Plan, den „Beauftragen“ in der Kette noch einmal frisch rechnet. */
export async function beauftragungVorschau(
  weg: Befehlsweg,
  auftragsLvId: AuftragsLeistungsverzeichnisId,
  nachtragsLvId: LeistungsverzeichnisId,
  sitzung?: LvSitzung,
): Promise<Ergebnis<Beauftragungsplan, Speicherfehler>> {
  const u = weg.umgebung;
  const d = await beauftragungLaden(u.speicher, auftragsLvId, nachtragsLvId, sitzung);
  if (!d.ok) return d;
  return { ok: true, wert: nachtragBeauftragenPlanen({ ...d.wert, ids: u.ids }) };
}

export type Beauftragungsausgang =
  | { readonly ok: true; readonly plan: Beauftragungsplan }
  /** Es geht so nicht (kein Angebot des Auftragnehmers, schon übernommen, …); nichts geschrieben. */
  | { readonly ok: false; readonly art: 'plan'; readonly fehler: string }
  /** Kern oder Speicher hat abgewiesen; `teilweise`: die Übernahme steht, der Status nicht (Befund in der Liste). */
  | {
      readonly ok: false;
      readonly art: 'abweisung';
      readonly abweisung: Abweisung;
      readonly teilweise: boolean;
    };

/**
 * „Beauftragen“ (D-35): in der Kette frisch geplant (`nachtragBeauftragenPlanen`), dann `NachtragUebernehmen` am Auftrags-LV
 * und `NachtragsangabenSetzen { status: 'beauftragt' }` am Nachtrags-LV, ein Undo-Schritt. `sitzung`: die offene Seite des
 * Nachtrags-LV, die den neuen Status gleich zeigt.
 */
export function nachtragBeauftragen(
  weg: Befehlsweg,
  ziel: {
    readonly auftragsLvId: AuftragsLeistungsverzeichnisId;
    readonly nachtragsLvId: LeistungsverzeichnisId;
    readonly sitzung?: LvSitzung;
  },
): Promise<Beauftragungsausgang> {
  const u = weg.umgebung;
  return weg.reihe(async (): Promise<Beauftragungsausgang> => {
    const d = await beauftragungLaden(u.speicher, ziel.auftragsLvId, ziel.nachtragsLvId, ziel.sitzung);
    if (!d.ok)
      return { ok: false, art: 'abweisung', abweisung: speicherfehler(d.fehler).abweisung, teilweise: false };
    const { auftrag, nachtragsLv } = d.wert;
    const nachtrag = nachtragsLv.leistungsverzeichnis.nachtrag;
    const plan = nachtragBeauftragenPlanen({ ...d.wert, ids: u.ids });
    if (plan.befehl === null || nachtrag === undefined)
      return { ok: false, art: 'plan', fehler: plan.fehler ?? texte.beauftragen.keinNachtrag };

    const cs = auftragsLvBefehlAusfuehren(auftrag, plan.befehl);
    if (!cs.ok)
      return {
        ok: false,
        art: 'abweisung',
        abweisung: { art: 'befehl', fehler: cs.fehler },
        teilweise: false,
      };
    const a = auftrag.auftragsLeistungsverzeichnis;
    const e = eintrag(u, a.projektId, { art: 'auftrags-leistungsverzeichnis', id: a.id }, plan.befehl);
    const w = await speichern(u, e, cs.wert, () => null);
    if (!w.ok) return { ok: false, art: 'abweisung', abweisung: w.abweisung, teilweise: false };
    const teile: Teil[] = [w.teil];
    try {
      const s = await lvBefehlAnwenden(u, a.projektId, nachtragsLv, {
        art: 'NachtragsangabenSetzen',
        nachtrag: { ...nachtrag, status: 'beauftragt' },
      });
      if (!s.ok) return { ok: false, art: 'abweisung', abweisung: s.abweisung, teilweise: true };
      teile.push(s.teil);
      if (s.zustand !== null) ziel.sitzung?.setze(s.zustand);
      return { ok: true, plan };
    } finally {
      weg.historie.aufnehmen(teile);
    }
  });
}

// --- Geführter Nachtrag (Ticket 151, B-18) --------------------------------------------------------------------------

export interface Auftragnehmerstand {
  /** Der Bieter des beauftragten Angebots; `null`: kein Nachtrags-LV oder das Auftrags-LV ist nicht (mehr) da. */
  readonly auftragnehmer: { readonly bieterId: BieterId; readonly name: string } | null;
  /** Ob zum Nachtrags-LV schon ein Angebot des Auftragnehmers vorliegt (wie „Beauftragen“ es sucht, D-86.3). */
  readonly angebotDesAuftragnehmers: boolean;
}

/**
 * Für Kopfband und Schrittanzeige: wer der Auftragnehmer ist (Bieter des beauftragten Angebots, Name aus dem Projekt) und ob
 * sein Angebot zum Nachtrags-LV schon eingelesen ist. Fehlt das Auftrags-LV (Zuschlag zurückgenommen), ist das kein Fehler.
 */
export async function auftragnehmerLaden(
  speicher: Speicher,
  nachtragsLv: LvZustand,
): Promise<Ergebnis<Auftragnehmerstand, Speicherfehler>> {
  const lv = nachtragsLv.leistungsverzeichnis;
  const ohne: Auftragnehmerstand = { auftragnehmer: null, angebotDesAuftragnehmers: false };
  if (lv.nachtrag === undefined) return { ok: true, wert: ohne };
  const auftrag = await speicher.auftragsLeistungsverzeichnisse.laden(lv.nachtrag.auftragsLvId);
  if (!auftrag.ok) return auftrag.fehler.code === 'nicht-gefunden' ? { ok: true, wert: ohne } : auftrag;
  const kopf = auftrag.wert.auftragsLeistungsverzeichnis;
  const aa = await speicher.angebote.laden(kopf.angebotId);
  if (!aa.ok) return aa;
  const p = await speicher.projekte.laden(lv.projektId);
  if (!p.ok) return p;
  const angebote = await angeboteLaden(speicher, lv.id);
  if (!angebote.ok) return angebote;
  const bieterId = aa.wert.angebot.bieterId;
  const name = p.wert.bieter.find((b) => b.id === bieterId)?.name ?? kopf.auftragnehmer?.name ?? bieterId;
  return {
    ok: true,
    wert: {
      auftragnehmer: { bieterId, name },
      angebotDesAuftragnehmers: nachtragsangebot(angebote.wert, lv.id, aa.wert.angebot) !== null,
    },
  };
}

/**
 * „Angebot des Auftragnehmers einlesen“ (D-151.3): das aus X84 oder Excel gelesene Angebot wird dem Auftragnehmer
 * zugeordnet, ohne einen Bieter anzulegen; ein Undo-Schritt wie jedes Einlesen. Das Projekt wird frisch geladen.
 */
export async function auftragnehmerAngebotAnlegen(
  weg: Befehlsweg,
  nachtragsLv: LvZustand,
  bieterId: BieterId,
  gelesen: Angebot,
): Promise<Ausgang<Projekt>> {
  const lv = nachtragsLv.leistungsverzeichnis;
  const p = await weg.umgebung.speicher.projekte.laden(lv.projektId);
  if (!p.ok) return speicherfehler(p.fehler);
  return weg.angebotAnlegen(p.wert, nachtragsLv, null, {
    ...gelesen,
    projektId: lv.projektId,
    leistungsverzeichnisId: lv.id,
    bieterId,
  });
}

// --- Nachtragsliste -----------------------------------------------------------------------------------------------

export interface Nachtragseintrag {
  readonly lvId: LeistungsverzeichnisId;
  readonly nummer: string;
  /** Name des Nachtrags-LV („Nachtrag N01 – …“). */
  readonly name: string;
  readonly status: Nachtragsstatus;
  /** Netto des Nachtragsangebots des Auftragnehmers; `null`: keines. */
  readonly angebotsnetto: Betrag | null;
}

export interface Nachtragsliste {
  readonly nachtraege: readonly Nachtragseintrag[];
  /** `nachtragsbefunde` in Worten (U5: Hinweis, keine Sperre). */
  readonly befunde: readonly string[];
}

function befundText(b: Nachtragsbefund): string {
  return b.code === 'beauftragt-nicht-uebernommen'
    ? texte.befund.nichtUebernommen(b.nummer, b.positionIds.length)
    : texte.befund.nichtBeauftragt(b.nummer, b.positionIds.length, texte.status[b.status]);
}

/**
 * Die Nachträge eines Auftrags-LV: welche LVs es sind, steht in der LV-Übersicht (`LvUebersicht.nachtrag`, D-43); geladen
 * werden nur diese LVs und ihre Angebote (für die Summe und die Befunde), nicht alle LVs des Projekts. Nach Nummer sortiert.
 */
export async function nachtraegeLaden(
  speicher: Speicher,
  auftrag: AuftragsLvZustand,
): Promise<Ergebnis<Nachtragsliste, Speicherfehler>> {
  const a = auftrag.auftragsLeistungsverzeichnis;
  const liste = await speicher.leistungsverzeichnisse.auflisten(a.projektId);
  if (!liste.ok) return liste;
  const aa = await speicher.angebote.laden(a.angebotId);
  if (!aa.ok) return aa;
  const ids = liste.wert
    .filter((l) => l.nachtrag?.auftragsLvId === a.id)
    .sort((x, y) =>
      (x.nachtrag?.nummer ?? '').localeCompare(y.nachtrag?.nummer ?? '', 'de', { numeric: true }),
    );
  const lvs: LvZustand[] = [];
  const nachtraege: Nachtragseintrag[] = [];
  for (const { id } of ids) {
    const l = await speicher.leistungsverzeichnisse.laden(id);
    if (!l.ok) return l;
    const n = l.wert.leistungsverzeichnis.nachtrag;
    if (n === undefined) continue;
    const angebote = await angeboteLaden(speicher, id);
    if (!angebote.ok) return angebote;
    const wahl = nachtragsangebot(angebote.wert, id, aa.wert.angebot);
    lvs.push(l.wert);
    nachtraege.push({
      lvId: id,
      nummer: n.nummer,
      name: l.wert.leistungsverzeichnis.name,
      status: n.status,
      angebotsnetto: wahl === null ? null : bietersummen(l.wert, wahl.angebot).netto,
    });
  }
  return { ok: true, wert: { nachtraege, befunde: nachtragsbefunde(auftrag, lvs).map(befundText) } };
}
