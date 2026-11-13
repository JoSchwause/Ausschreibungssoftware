// SPDX-License-Identifier: AGPL-3.0-or-later
// Lädt die Namen der Brotkrumen einer Seite aus dem Speicher (Ticket 131): Projekt, LV, Auftrags-LV, Blatt, Rechnung … Steht
// unterhalb von `SpeicherAnbieter` neben der Seite und meldet den Stand an die Hülle über einen kleinen Speicher, damit nur
// Kopfzeile und Seitenleiste neu zeichnen, nie die Seite. Neu geladen wird nach jedem Befehl, der einen Namen ändern kann,
// und nach Rückgängig/Wiederholen. Ticket 147: meldet von hier aus auch den Stand der Statuszeile (`statusmelder.ts`), weil
// nur diese Stelle der Hülle unterhalb von Speicher und Sicherung steht.

import type {
  LeistungsverzeichnisId,
  LvUebersicht,
  ProjektId,
  Protokolleintrag,
  Speicher,
} from '@tethys/vertrag';
import { useEffect, useState } from 'react';
import { befehlswegFuer, nachJedemEintrag } from '../lv/befehlsweg';
import { useUmgebung } from '../speicher/SpeicherAnbieter';
import {
  gegenstandSchluessel,
  navigationsstand,
  type Bereich,
  type Gegenstand,
  type Namen,
  type Navigationsstand,
  type Ort,
} from './navigation';
import { useStatusmeldung } from './statusmelder';
import { texte } from './texte';

/** Der gemeldete Stand je Adresse; die Hülle liest ihn mit `useSyncExternalStore`. */
export class Navigationsspeicher {
  #stand: { readonly pfad: string; readonly stand: Navigationsstand } | null = null;
  readonly #hoerer = new Set<() => void>();

  readonly abonnieren = (h: () => void): (() => void) => {
    this.#hoerer.add(h);
    return () => {
      this.#hoerer.delete(h);
    };
  };

  readonly lesen = (): { readonly pfad: string; readonly stand: Navigationsstand } | null => this.#stand;

  melden(pfad: string, stand: Navigationsstand): void {
    const alt = this.#stand;
    if (alt !== null && alt.pfad === pfad && JSON.stringify(alt.stand) === JSON.stringify(stand)) return;
    this.#stand = { pfad, stand };
    for (const h of [...this.#hoerer]) h();
  }
}

/** Zu welchem Projekt ein LV gehört; LV-Adressen tragen kein Projekt. Merkt sich, was es einmal gefunden hat. */
const PROJEKT_DES_LV = new Map<LeistungsverzeichnisId, ProjektId>();

async function lvsDes(speicher: Speicher, projektId: ProjektId): Promise<readonly LvUebersicht[]> {
  const r = await speicher.leistungsverzeichnisse.auflisten(projektId);
  return r.ok ? r.wert : [];
}

async function projektDesLv(speicher: Speicher, lvId: LeistungsverzeichnisId): Promise<ProjektId | null> {
  const bekannt = PROJEKT_DES_LV.get(lvId);
  if (bekannt !== undefined) return bekannt;
  const projekte = await speicher.projekte.auflisten();
  if (!projekte.ok) return null;
  for (const p of projekte.wert) {
    for (const lv of await lvsDes(speicher, p.id)) PROJEKT_DES_LV.set(lv.id, p.id);
    if (PROJEKT_DES_LV.get(lvId) === p.id) return p.id;
  }
  return null;
}

/** Name eines Gegenstands aus den Listen des Speichers; `null`, wenn es ihn nicht (mehr) gibt. */
async function nameVon(
  speicher: Speicher,
  projektId: ProjektId | null,
  g: Gegenstand,
  lvs: () => Promise<readonly LvUebersicht[]>,
): Promise<string | null> {
  const finde = <T extends { readonly id: string }>(
    r: { ok: true; wert: readonly T[] } | { ok: false },
    name: (t: T) => string,
  ): string | null => {
    if (!r.ok) return null;
    const t = r.wert.find((x) => x.id === g.id);
    return t === undefined ? null : name(t);
  };
  switch (g.art) {
    case 'lv':
      return (await lvs()).find((l) => l.id === g.id)?.name ?? null;
    case 'lvStand':
      return finde(await speicher.lvStaende.auflisten(g.lvId), (s) => s.name);
    case 'aufmass':
      return finde(await speicher.aufmasse.auflisten(g.auftragsLvId), (a) =>
        texte.gegenstand.aufmassNummer(a.nummer, a.bezeichnung),
      );
    case 'rechnung':
      return finde(await speicher.rechnungen.auflisten(g.auftragsLvId), (r) =>
        texte.gegenstand.rechnungNummer(r.nummer),
      );
    default:
      break;
  }
  if (projektId === null) return null;
  switch (g.art) {
    case 'auftragsLv':
      return finde(await speicher.auftragsLeistungsverzeichnisse.auflisten(projektId), (a) => a.name);
    case 'kostenermittlung':
      return finde(await speicher.kostenermittlungen.auflisten(projektId), (k) => k.name);
    case 'modell':
      return finde(await speicher.bauwerksmodelle.auflisten(projektId), (m) => m.name);
    case 'bauzeitenplan':
      return finde(await speicher.bauzeitenplaene.auflisten(projektId), (b) => b.name);
    case 'honorarberechnung':
      return finde(await speicher.honorarberechnungen.auflisten(projektId), (h) => h.name);
  }
}

/** Projekt und Namen der Gegenstände eines Orts. */
export async function namenLaden(speicher: Speicher, ort: Ort): Promise<Namen> {
  const projektId =
    ort.projekt === null
      ? null
      : ort.projekt.art === 'id'
        ? ort.projekt.id
        : await projektDesLv(speicher, ort.projekt.lvId);
  let projekt: Namen['projekt'] = null;
  if (projektId !== null) {
    const p = await speicher.projekte.laden(projektId);
    if (p.ok) projekt = { id: projektId, name: p.wert.name };
  }
  let lvListe: Promise<readonly LvUebersicht[]> | null = null;
  const lvs = (): Promise<readonly LvUebersicht[]> =>
    (lvListe ??= projektId === null ? Promise.resolve([]) : lvsDes(speicher, projektId));
  const gegenstaende = new Map<string, string>();
  let bereich: Bereich | undefined;
  for (const k of ort.krumen) {
    if (k.teil.art === 'text') continue;
    const name = await nameVon(speicher, projektId, k.teil, lvs);
    if (name !== null) gegenstaende.set(gegenstandSchluessel(k.teil), name);
    // Ein Nachtrags-LV gehört in der Seitenleiste zu „Nachträge“.
    const g = k.teil;
    if (g.art === 'lv' && ort.bereich === 'leistungsverzeichnisse') {
      if ((await lvs()).find((l) => l.id === g.id)?.nachtrag !== undefined) bereich = 'nachtraege';
    }
  }
  return { projekt, gegenstaende, ...(bereich === undefined ? {} : { bereich }) };
}

/** Befehle, nach denen sich kein Name geändert haben kann: Arbeit in einem LV oder an einem Angebot. */
function aendertKeinenNamen(e: Protokolleintrag): boolean {
  if (e.aggregat.art === 'angebot') return true;
  return (
    e.aggregat.art === 'leistungsverzeichnis' &&
    e.befehl.art !== 'LeistungsverzeichnisUmbenennen' &&
    e.befehl.art !== 'LeistungsverzeichnisAnlegen'
  );
}

/** Lädt die Namen für `ort` und meldet den Stand für `pfad`. Zeichnet nichts. */
export function OrtLader({
  pfad,
  ort,
  speicher,
}: {
  pfad: string;
  ort: Ort;
  speicher: Navigationsspeicher;
}): null {
  const u = useUmgebung();
  useStatusmeldung(); // Ticket 147
  const [lauf, setLauf] = useState(0);
  useEffect(() => {
    const neu = (): void => {
      setLauf((n) => n + 1);
    };
    const ab1 = nachJedemEintrag(u, (e) => {
      if (!aendertKeinenNamen(e)) neu();
    });
    const ab2 = befehlswegFuer(u).beiHistorie(neu);
    return () => {
      ab1();
      ab2();
    };
  }, [u]);
  useEffect(() => {
    let aktiv = true;
    void namenLaden(u.speicher, ort).then((namen) => {
      if (aktiv) speicher.melden(pfad, navigationsstand(ort, namen));
    });
    return () => {
      aktiv = false;
    };
    // `ort` folgt aus `pfad`.
  }, [u, pfad, lauf, speicher]);
  return null;
}
