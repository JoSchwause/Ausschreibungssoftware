// SPDX-License-Identifier: AGPL-3.0-or-later
// Spaltenmodell auf TanStack Table (v9). TanStack liefert Spalten-, Kopf-, Zeilen- und Zellenmodell und die
// Spaltenbreiten; Rendern, Baum und Bearbeiten gehören dem Grid. Die Zeilen sind bereits der sichtbare, flache Baum
// (`LvAnsicht.zeilen`), deshalb gibt es hier weder Aufklapp- noch Zeilenmodell-Features.

import { columnSizingFeature, createColumnHelper, tableFeatures } from '@tanstack/react-table';
import type { LvSpalte, LvZeile } from '@tethys/vertrag';
import { SPALTENTITEL } from './texte';
import { spaltenbreite } from './vergleich';
import type { VergleichsSpalte, VergleichsZeile } from './vergleichTypen';

export const features = tableFeatures({ columnSizingFeature });

export const spaltenHelfer = createColumnHelper<typeof features, LvZeile>();

/** Breiten in Pixeln; `kurztext` nimmt zusätzlich den Rest ein. */
export const SPALTENBREITE: Readonly<Record<LvSpalte, number>> = {
  ordnungszahl: 112,
  positionsart: 112,
  kurztext: 320,
  menge: 108,
  einheit: 84,
  einheitspreis: 120,
  gesamtpreis: 128,
};

export const STANDARDSPALTEN: readonly LvSpalte[] = [
  'ordnungszahl',
  'positionsart',
  'kurztext',
  'menge',
  'einheit',
  'einheitspreis',
  'gesamtpreis',
];

export function spaltenDefinitionen(spalten: readonly LvSpalte[]) {
  return spalten.map((s) =>
    spaltenHelfer.display({ id: s, header: SPALTENTITEL[s], size: SPALTENBREITE[s] }),
  );
}

const vergleichsHelfer = createColumnHelper<typeof features, VergleichsZeile>();

/**
 * Spaltenmodell des Vergleichsgrids: aufeinanderfolgende Spalten derselben Gruppe werden eine Gruppenspalte (zweizeiliger
 * Kopf); TanStack liefert daraus die Kopfzeilen mit `colSpan` und `rowSpan`. Die Kennung einer Gruppenspalte ist
 * `gruppe:<Index der ersten Spalte>`, damit eine Gruppe, die zweimal vorkommt, eindeutig bleibt. Eine Balkenspalte
 * (Ticket 96) gehört nie zu einer Gruppe: Ihre Achse braucht beide Kopfzeilen.
 */
export function vergleichsSpaltenDefinitionen(spalten: readonly VergleichsSpalte[]) {
  const ergebnis: ReturnType<typeof vergleichsHelfer.group>[] = [];
  const blatt = (s: VergleichsSpalte) =>
    vergleichsHelfer.display({ id: s.id, header: s.kopf, size: spaltenbreite(s) });
  const gruppeVon = (s: VergleichsSpalte | undefined) => (s?.zeitleiste ? undefined : s?.gruppe);
  let i = 0;
  while (i < spalten.length) {
    const s = spalten[i];
    if (s === undefined) break;
    const gruppe = gruppeVon(s);
    if (gruppe === undefined) {
      ergebnis.push(blatt(s));
      i++;
      continue;
    }
    const start = i;
    const kinder = [];
    while (i < spalten.length && gruppeVon(spalten[i])?.id === gruppe.id) {
      const k = spalten[i];
      if (k !== undefined) kinder.push(blatt(k));
      i++;
    }
    ergebnis.push(
      vergleichsHelfer.group({ id: `gruppe:${String(start)}`, header: gruppe.kopf, columns: kinder }),
    );
  }
  return ergebnis;
}
