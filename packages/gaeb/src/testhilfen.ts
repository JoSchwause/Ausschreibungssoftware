// SPDX-License-Identifier: AGPL-3.0-or-later
// Hilfen nur für Tests: deterministische IdQuelle und Dateizugriff. Wird von keinem Produktionscode importiert
// und nicht aus dem Paket exportiert.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  AngebotId,
  AuftragsLeistungsverzeichnisId,
  BieterId,
  BildId,
  HinweistextId,
  IdQuelle,
  LeistungsverzeichnisId,
  LosId,
  Position,
  PositionId,
  ProjektId,
  ProtokollId,
  TitelId,
} from '@tethys/vertrag';
import type { Prozent } from '@tethys/vertrag';

/** Zählende IdQuelle: `position-0001`, `titel-0001` … Gleiche Eingabe ergibt gleiche Kennungen. */
export function testIds(): IdQuelle {
  const zaehler = new Map<string, number>();
  const neu = (art: string): string => {
    const n = (zaehler.get(art) ?? 0) + 1;
    zaehler.set(art, n);
    return `${art}-${String(n).padStart(4, '0')}`;
  };
  return {
    projekt: () => neu('projekt') as ProjektId,
    leistungsverzeichnis: () => neu('lv') as LeistungsverzeichnisId,
    auftragsLeistungsverzeichnis: () => neu('auftrags-lv') as AuftragsLeistungsverzeichnisId,
    angebot: () => neu('angebot') as AngebotId,
    bieter: () => neu('bieter') as BieterId,
    protokoll: () => neu('protokoll') as ProtokollId,
    bild: () => neu('bild') as BildId,
    los: () => neu('los') as LosId,
    titel: () => neu('titel') as TitelId,
    position: () => neu('position') as PositionId,
    hinweistext: () => neu('hinweis') as HinweistextId,
  };
}

/** Ersatzwert des Aufrufers für den MwSt-Satz in Tests. */
export const TEST_MWST = '19.00' as Prozent;

const WURZEL = new URL('../../..', import.meta.url).pathname;

/** Liest eine Datei relativ zur Repo-Wurzel (Fixtures dürfen nur Tests lesen). */
export function lesePfad(relativ: string): Uint8Array {
  return new Uint8Array(readFileSync(join(WURZEL, relativ)));
}

/** Liest eine Datei unter `packages/gaeb/testdaten/`. */
export function leseTestdatei(relativ: string): Uint8Array {
  return lesePfad(join('packages/gaeb/testdaten', relativ));
}

// v1.1b: mechanisch angepasst, Folgeticket. Seit v1.1b hat eine Position keine einzelne Positionsart und keinen einzelnen Bezug mehr. Die Tests des
// Lesers lesen weiter „die Art“ und „den Bezug“ wie vor v1.1b; diese Hilfen leiten sie aus `merkmale` und `zuschlag` ab.

/** Die Art einer Position wie vor v1.1b (`undefined` für `undefined`). */
export function positionsartVon(p: Position | undefined): string | undefined {
  if (p === undefined) return undefined;
  if (p.zuschlag !== null) return 'zuschlag';
  if (p.merkmale.wahl !== null) return 'wahl';
  if (p.merkmale.bedarf !== null) return 'bedarf';
  if (p.merkmale.stundenlohn) return 'stundenlohn';
  return 'normal';
}

/** Der erste Bezug einer Zuschlagsposition als Positionskennung, sonst `null`. */
export function bezugVon(p: Position | undefined): string | null {
  const b = p?.zuschlag?.bezug;
  return b?.art === 'positionen' ? (b.positionen[0]?.positionId ?? null) : null;
}
