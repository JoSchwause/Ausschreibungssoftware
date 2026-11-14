// SPDX-License-Identifier: AGPL-3.0-or-later
// Schreibwege der Vergabe in der App (Ticket 149; E8, E15, B-15, B-16): Angebot ändern und löschen, Bieter ändern und löschen,
// Zuschlag zurücknehmen, Preisspiegel-Einstellungen am LV. Alles läuft über die Kette des Befehlswegs (A5, U7): frisch aus
// dem Speicher lesen, Befehl ausführen, schreiben, ein Undo-Schritt. Gerechnet und geprüft wird nur in `vergabe` und im Kern;
// die App zählt für die beiden löschenden Befehle die Verweise aus dem Speicher (D-82 S9, D-138.7) und gibt sie mit.

import { angebotChangeSetAnwenden, bieterLoeschen, zuschlagZuruecknehmen } from '@tethys/vergabe';
import { angebotBefehlAusfuehrer } from '@tethys/vergabe';
import { projektChangeSetAnwenden } from '@tethys/kern';
import type {
  Angebot,
  AngebotBefehl,
  AngebotId,
  AngebotZustand,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvZustand,
  Betrag,
  Bieterangaben,
  BieterId,
  Ergebnis,
  LvZustand,
  PreisspiegelEinstellungen,
  Projekt,
  ProjektId,
  Speicher,
  Speicherfehler,
  Verweisanzahl,
} from '@tethys/vertrag';
import type { Teil } from '../historie/historie';
import {
  eintrag,
  projektBefehlAnwenden,
  speichern,
  type Abweisung,
  type Ausgang,
  type Befehlsweg,
} from '../lv/befehlsweg';

type Lesung<T> = Ergebnis<T, Speicherfehler>;

const speicherfehler = (fehler: Speicherfehler): { ok: false; abweisung: Abweisung } => ({
  ok: false,
  abweisung: { art: 'speicher', fehler },
});

// --- Angebot ---------------------------------------------------------------------------------------------------------

/**
 * Führt Befehle an einem Angebot nacheinander aus (Preise erfassen und berichtigen, Nachlass setzen und entfernen, löschen) und
 * nimmt die geschriebenen als **einen** Undo-Schritt auf. Angebot, Projekt und LV werden in der Kette frisch gelesen. Der erste
 * abgewiesene Befehl hält die übrigen auf; was davor geschrieben ist, bleibt (einzeln rückgängig zu machen). Ergebnis: das
 * Angebot nach dem letzten Befehl (`null` nach dem Löschen).
 */
export function angebotAendern(
  weg: Befehlsweg,
  angebotId: AngebotId,
  befehle: readonly AngebotBefehl[],
): Promise<Ausgang<AngebotZustand | null>> {
  const u = weg.umgebung;
  return weg.reihe(async (): Promise<Ausgang<AngebotZustand | null>> => {
    const a = await u.speicher.angebote.laden(angebotId);
    if (!a.ok) return speicherfehler(a.fehler);
    const kopf = a.wert.angebot;
    const lv = await u.speicher.leistungsverzeichnisse.laden(kopf.leistungsverzeichnisId);
    if (!lv.ok) return speicherfehler(lv.fehler);
    const p = await u.speicher.projekte.laden(kopf.projektId);
    if (!p.ok) return speicherfehler(p.fehler);
    const ausfuehren = angebotBefehlAusfuehrer(p.wert, lv.wert);
    const teile: Teil[] = [];
    let stand: AngebotZustand | null = a.wert;
    try {
      for (const befehl of befehle) {
        const r = ausfuehren(stand, befehl);
        if (!r.ok) return { ok: false, abweisung: { art: 'befehl', fehler: r.fehler } };
        const vorher: AngebotZustand | null = stand;
        const e = eintrag(u, kopf.projektId, { art: 'angebot', id: angebotId }, befehl);
        const cs = r.wert;
        const s = await speichern(u, e, cs, (): AngebotZustand | null =>
          angebotChangeSetAnwenden(vorher, cs),
        );
        if (!s.ok) return s;
        teile.push(s.teil);
        stand = s.zustand;
      }
      return { ok: true, zustand: stand, hinweise: [] };
    } finally {
      weg.historie.aufnehmen(teile);
    }
  });
}

/**
 * Ein Angebot eines vorhandenen Bieters anlegen und dabei die Bieterangaben aus der Datei übernehmen (X84, D-82 S7): erst
 * `BieterangabenSetzen`, dann `AngebotAnlegen`, **ein** Undo-Schritt wie `Befehlsweg.angebotAnlegen`. Wird das Angebot
 * abgewiesen, bleiben die Angaben gesetzt und sind einzeln rückgängig zu machen.
 */
export function angebotMitBieterangabenAnlegen(
  weg: Befehlsweg,
  projekt: Projekt,
  lv: LvZustand,
  angebot: Angebot,
  angaben: { readonly bieterId: BieterId; readonly angaben: Bieterangaben },
): Promise<Ausgang<Projekt>> {
  const u = weg.umgebung;
  return weg.reihe(async (): Promise<Ausgang<Projekt>> => {
    const teile: Teil[] = [];
    try {
      const a = await projektBefehlAnwenden(u, projekt, { art: 'BieterangabenSetzen', ...angaben });
      if (!a.ok) return a;
      teile.push(a.teil);
      const stand = a.zustand ?? projekt;
      const befehl = { art: 'AngebotAnlegen', angebot } as const;
      const r = angebotBefehlAusfuehrer(stand, lv)(null, befehl);
      if (!r.ok) return { ok: false, abweisung: { art: 'befehl', fehler: r.fehler } };
      const e = eintrag(u, stand.id, { art: 'angebot', id: r.wert.angebotId }, befehl);
      const s = await speichern(u, e, r.wert, () => stand);
      if (!s.ok) return s;
      teile.push(s.teil);
      return { ok: true, zustand: stand, hinweise: [] };
    } finally {
      weg.historie.aufnehmen(teile);
    }
  });
}

// --- Bieter ----------------------------------------------------------------------------------------------------------

/** Je Bieter die Zahl seiner Angebote in allen LVs des Projekts (auch Nachtragsangebote); Bieter ohne Angebot fehlen. */
export async function angeboteJeBieter(
  speicher: Speicher,
  projektId: ProjektId,
): Promise<Lesung<ReadonlyMap<BieterId, number>>> {
  const lvs = await speicher.leistungsverzeichnisse.auflisten(projektId);
  if (!lvs.ok) return lvs;
  const anzahl = new Map<BieterId, number>();
  for (const lv of lvs.wert) {
    const ids = await speicher.angebote.auflisten(lv.id);
    if (!ids.ok) return ids;
    for (const id of ids.wert) {
      const a = await speicher.angebote.laden(id);
      if (!a.ok) return a;
      const b = a.wert.angebot.bieterId;
      anzahl.set(b, (anzahl.get(b) ?? 0) + 1);
    }
  }
  return { ok: true, wert: anzahl };
}

/**
 * Löscht einen Bieter, nur ohne Angebot (D-127.2): In der Kette liest die App das Projekt und zählt die Angebote des Bieters;
 * `vergabe` weist mit `verweise-vorhanden` ab, solange eines besteht. Ein Undo-Schritt.
 */
export function bieterLoeschenSchreiben(
  weg: Befehlsweg,
  projektId: ProjektId,
  bieterId: BieterId,
): Promise<Ausgang<Projekt>> {
  const u = weg.umgebung;
  return weg.reihe(async (): Promise<Ausgang<Projekt>> => {
    const p = await u.speicher.projekte.laden(projektId);
    if (!p.ok) return speicherfehler(p.fehler);
    const zaehlung = await angeboteJeBieter(u.speicher, projektId);
    if (!zaehlung.ok) return speicherfehler(zaehlung.fehler);
    const befehl = { art: 'BieterLoeschen', bieterId } as const;
    const verweise: Verweisanzahl[] = [{ art: 'angebot', anzahl: zaehlung.wert.get(bieterId) ?? 0 }];
    const r = bieterLoeschen(p.wert, befehl, verweise);
    if (!r.ok) return { ok: false, abweisung: { art: 'befehl', fehler: r.fehler } };
    const e = eintrag(u, projektId, { art: 'projekt', id: projektId }, befehl);
    const s = await speichern(u, e, r.wert, () => projektChangeSetAnwenden(p.wert, r.wert));
    if (!s.ok) return s;
    weg.historie.aufnehmen([s.teil]);
    if (s.zustand === null) throw new Error('bieterLoeschenSchreiben: Projekt fehlt');
    return { ok: true, zustand: s.zustand, hinweise: [] };
  });
}

// --- Zuschlag zurücknehmen -------------------------------------------------------------------------------------------

/** Ein Vorgang eines Bauzeitenplans, der auf das Auftrags-LV verweist (sperrt nicht, D-74). */
export interface VorgangMitBezug {
  readonly plan: string;
  readonly vorgang: string;
}

/** Was die Rücknahme eines Zuschlags berührt (D-74): Sperren, Bauzeitenplan und Kostenkontrolle. */
export interface Ruecknahmelage {
  /** Nachträge, Aufmaßblätter, Rechnungen, Mängel mit ihrer Anzahl (jede Art einmal, auch mit 0). */
  readonly verweise: readonly Verweisanzahl[];
  /** Vorgänge mit Bezug auf das Auftrags-LV; sie behalten ihn. */
  readonly vorgaenge: readonly VorgangMitBezug[];
  /** Das Netto nach Nachlass des Auftrags-LV; es entfällt in der Kostenkontrolle. */
  readonly auftragswert: Betrag;
}

/** Zählt aus dem Speicher, was am Auftrags-LV hängt (Nachtrags-LVs, Aufmaßblätter, Rechnungen, Mängel, Vorgänge). */
export async function ruecknahmelage(
  speicher: Speicher,
  auftrag: AuftragsLvZustand,
): Promise<Lesung<Ruecknahmelage>> {
  const a = auftrag.auftragsLeistungsverzeichnis;
  const lvs = await speicher.leistungsverzeichnisse.auflisten(a.projektId);
  if (!lvs.ok) return lvs;
  const aufmasse = await speicher.aufmasse.auflisten(a.id);
  if (!aufmasse.ok) return aufmasse;
  const rechnungen = await speicher.rechnungen.auflisten(a.id);
  if (!rechnungen.ok) return rechnungen;
  const maengel = await speicher.maengel.auflisten(a.projektId);
  if (!maengel.ok) return maengel;
  const plaene = await speicher.bauzeitenplaene.auflisten(a.projektId);
  if (!plaene.ok) return plaene;
  const vorgaenge: VorgangMitBezug[] = [];
  for (const uebersicht of plaene.wert) {
    const plan = await speicher.bauzeitenplaene.laden(uebersicht.id);
    if (!plan.ok) return plan;
    for (const v of plan.wert.bauzeitenplan.vorgaenge)
      if (v.bezug?.art === 'auftrags-leistungsverzeichnis' && v.bezug.id === a.id)
        vorgaenge.push({ plan: plan.wert.bauzeitenplan.name, vorgang: v.bezeichnung });
  }
  return {
    ok: true,
    wert: {
      verweise: [
        { art: 'nachtrag', anzahl: lvs.wert.filter((l) => l.nachtrag?.auftragsLvId === a.id).length },
        { art: 'aufmass', anzahl: aufmasse.wert.length },
        { art: 'rechnung', anzahl: rechnungen.wert.length },
        { art: 'mangel', anzahl: maengel.wert.filter((m) => m.auftragsLvId === a.id).length },
      ],
      vorgaenge,
      auftragswert: auftrag.summen.gesamt.nettoNachNachlass,
    },
  };
}

/**
 * Nimmt den Zuschlag zurück (D-74): In der Kette liest die App das Auftrags-LV und zählt die Verweise neu; `vergabe` löscht
 * es oder weist mit `verweise-vorhanden` ab (die Abweisung nennt Art und Anzahl). Ein Undo-Schritt stellt es wieder her.
 */
export function zuschlagZuruecknehmenSchreiben(
  weg: Befehlsweg,
  auftragsLvId: AuftragsLeistungsverzeichnisId,
): Promise<Ausgang<null>> {
  const u = weg.umgebung;
  return weg.reihe(async (): Promise<Ausgang<null>> => {
    const z = await u.speicher.auftragsLeistungsverzeichnisse.laden(auftragsLvId);
    if (!z.ok) return speicherfehler(z.fehler);
    const lage = await ruecknahmelage(u.speicher, z.wert);
    if (!lage.ok) return speicherfehler(lage.fehler);
    const befehl = { art: 'ZuschlagZuruecknehmen' } as const;
    const r = zuschlagZuruecknehmen(z.wert, befehl, lage.wert.verweise);
    if (!r.ok) return { ok: false, abweisung: { art: 'befehl', fehler: r.fehler } };
    const projektId = z.wert.auftragsLeistungsverzeichnis.projektId;
    const e = eintrag(u, projektId, { art: 'auftrags-leistungsverzeichnis', id: auftragsLvId }, befehl);
    const s = await speichern(u, e, r.wert, () => null);
    if (!s.ok) return s;
    weg.historie.aufnehmen([s.teil]);
    return { ok: true, zustand: null, hinweise: [] };
  });
}

// --- Preisspiegel-Einstellungen --------------------------------------------------------------------------------------

/** Setzt die Preisspiegel-Einstellungen am LV (D-73, B-29); `null` stellt die Standardwerte her. Ein Undo-Schritt. */
export async function preisspiegelEinstellungenSetzen(
  weg: Befehlsweg,
  lv: LvZustand,
  einstellungen: PreisspiegelEinstellungen | null,
): Promise<Ausgang<LvZustand | null>> {
  return weg
    .lv(lv.leistungsverzeichnis.projektId, lv)
    .befehl({ art: 'PreisspiegelEinstellungenSetzen', einstellungen });
}
