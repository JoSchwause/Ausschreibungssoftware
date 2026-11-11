// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 87: ein Aufmaßblatt als Ansicht des einen Grids (U2: `VergleichsGrid` aus `ui-grid`, keine zweite
// Grid-Implementierung) und die Befehle aus der Mengenermittlung einer Zeile. Rein und ohne React. Die App rechnet nie
// (N1): Die Menge des Blatts kommt aus dem Befehl (gerechnet von `mengen`), „kumuliert bis hier“ aus `abrechnung`; hier
// wird nur über `dezimal` formatiert (N4).

import { sollIstBerechnen } from '@tethys/abrechnung';
import { formatiereMengeDe } from '@tethys/dezimal';
import type { KennzeichenText, VergleichsSpalte, VergleichsZeile, VergleichsZelle } from '@tethys/ui-grid';
import type {
  Aufmass,
  AufmassBefehl,
  Aufmassposition,
  AuftragsLvZustand,
  Knoten,
  Menge,
} from '@tethys/vertrag';
import { kinderJeEltern } from '../lv/ansicht';
import { ozText } from '../lv/oztext';
import type { Mengeneingabe } from '../mengen/ansatz';
import type { Mengenziel } from '../mengen/MengenPanel';
import { texte } from './texte';

export interface BlattEingang {
  readonly auftrag: AuftragsLvZustand;
  readonly blatt: Aufmass;
  /** Kumulierte Menge je Position über die Blätter bis einschließlich diesem (aus `abrechnung`). */
  readonly kumuliert: ReadonlyMap<string, Menge | null>;
  /** Zugeklappte Gliederungen; der Aufklappzustand gehört der Seite. */
  readonly zugeklappt: ReadonlySet<string>;
}

/**
 * „Kumuliert bis hier“: die Ist-Menge von Soll/Ist (`abrechnung`, Ticket 81) über die Blätter bis einschließlich der
 * Nummer, nur für Positionen mit einer Zeile auf einem dieser Blätter (sonst bliebe jede Zeile bei 0,000). Zeilen, die
 * Soll/Ist nicht zählt (ohne Menge, ohne Position), zählen auch hier nicht.
 */
export function kumuliertBisHier(
  auftrag: AuftragsLvZustand,
  blaetter: readonly Aufmass[],
  nummer: number,
): ReadonlyMap<string, Menge | null> {
  const bis = blaetter.filter((b) => b.nummer <= nummer);
  const aufgemessen = new Set<string>(bis.flatMap((b) => b.positionen.map((z) => z.positionId)));
  const aus = new Map<string, Menge | null>();
  for (const z of sollIstBerechnen(auftrag, bis).zeilen)
    if (aufgemessen.has(z.positionId)) aus.set(z.positionId, z.ist);
  return aus;
}

export interface Blattansicht {
  readonly spalten: readonly VergleichsSpalte[];
  readonly zeilen: readonly VergleichsZeile[];
  readonly kennzeichenTexte: Readonly<Record<string, KennzeichenText>>;
}

const s = texte.spalten;
export const BLATT_SPALTEN: readonly VergleichsSpalte[] = [
  { id: 'oz', kopf: s.oz, breite: 104 },
  { id: 'kurztext', kopf: s.kurztext, breite: 320 },
  { id: 'einheit', kopf: s.einheit, breite: 72 },
  { id: 'auftragsmenge', kopf: s.auftragsmenge, ausrichtung: 'rechts', breite: 128 },
  { id: 'blattmenge', kopf: s.blattmenge, ausrichtung: 'rechts', breite: 152 },
  { id: 'kumuliert', kopf: s.kumuliert, ausrichtung: 'rechts', breite: 144 },
];

const KENNZEICHEN: Readonly<Record<string, KennzeichenText>> = {
  mengenansatz: texte.kennzeichen.mengenansatz,
  'menge-fehlt': texte.kennzeichen.mengeFehlt,
};

const menge = (m: Menge | null | undefined): string =>
  m === null || m === undefined ? '' : formatiereMengeDe(m);

function zelle(text: string, kennzeichen: readonly string[] = []): VergleichsZelle {
  return kennzeichen.length > 0 ? { text, kennzeichen } : { text };
}

/** Die Zelle „Menge dieses Blatts“: die Menge, Σ bei einem Ansatz (neutral wie im LV, D-74.2), ein Strich ohne Menge. */
function blattzelle(z: Aufmassposition | undefined): VergleichsZelle {
  if (z === undefined) return zelle('');
  const k: string[] = [];
  if (z.mengenansatz !== null) k.push('mengenansatz');
  if (z.menge === null) k.push('menge-fehlt');
  return zelle(menge(z.menge), k);
}

/** Die sichtbaren Zeilen: der Baum des Auftrags-LV ohne Hinweistexte, zugeklappte Unterknoten fehlen. */
export function blattAnsicht(e: BlattEingang): Blattansicht {
  const lv = e.auftrag.auftragsLeistungsverzeichnis;
  const kinder = kinderJeEltern(lv.knoten);
  const zeilenJePosition = new Map(e.blatt.positionen.map((z) => [z.positionId as string, z]));
  const zeilen: VergleichsZeile[] = [];
  const besuche = (elternId: string, tiefe: number): void => {
    for (const k of kinder.get(elternId) ?? []) {
      if (k.art === 'hinweis') continue;
      const unter = (kinder.get(k.id) ?? []).filter((x) => x.art !== 'hinweis');
      const hatUnterknoten = unter.length > 0;
      const aufgeklappt = hatUnterknoten && !e.zugeklappt.has(k.id);
      const basis = { oz: zelle(ozText(k)), kurztext: zelle(k.kurztext) };
      zeilen.push(
        k.art === 'position'
          ? {
              id: k.id,
              art: 'position',
              tiefe,
              hatUnterknoten,
              aufgeklappt,
              zellen: {
                ...basis,
                einheit: zelle(k.einheit ?? ''),
                auftragsmenge: zelle(menge(k.menge)),
                blattmenge: blattzelle(zeilenJePosition.get(k.id)),
                kumuliert: zelle(menge(e.kumuliert.get(k.id))),
              },
            }
          : { id: k.id, art: 'gliederung', tiefe, hatUnterknoten, aufgeklappt, zellen: basis },
      );
      if (aufgeklappt) besuche(k.id, tiefe + 1);
    }
  };
  besuche(lv.id, 0);
  return { spalten: BLATT_SPALTEN, zeilen, kennzeichenTexte: KENNZEICHEN };
}

/** Was die Mengenermittlung an einer Zeile öffnet: das Ziel, oder warum es dort keins gibt. */
export type Zeilenziel =
  | { readonly art: 'ziel'; readonly ziel: Mengenziel }
  | { readonly art: 'keine-position' }
  | { readonly art: 'zuschlagsposition' };

const name = (k: Knoten): string =>
  [ozText(k), k.art === 'hinweis' ? '' : k.kurztext].filter(Boolean).join(' ');

/** Das Ziel des Panels an einer Zeile des Grids: die Position mit dem gespeicherten Stand ihrer Zeile auf dem Blatt. */
export function zeilenZiel(auftrag: AuftragsLvZustand, blatt: Aufmass, knotenId: string): Zeilenziel {
  const k = auftrag.auftragsLeistungsverzeichnis.knoten.find((x) => x.id === knotenId);
  if (k?.art !== 'position') return { art: 'keine-position' };
  if (k.zuschlag !== null) return { art: 'zuschlagsposition' };
  const z = blatt.positionen.find((x) => x.positionId === k.id);
  return {
    art: 'ziel',
    ziel: {
      schluessel: k.id,
      name: name(k),
      einheit: k.einheit,
      mengenansatz: z?.mengenansatz ?? null,
      menge: z?.menge ?? null,
    },
  };
}

/**
 * Der Befehl aus dem Panel (A5, ein Undo-Schritt): Ansatz und Menge setzen; ohne beides wird eine vorhandene Zeile
 * entfernt (eine Zeile ohne Ansatz und ohne Menge sagt nichts), ohne Zeile gibt es nichts zu tun.
 */
export function zeilenBefehl(blatt: Aufmass, positionId: string, e: Mengeneingabe): AufmassBefehl | null {
  const z = blatt.positionen.find((x) => x.positionId === positionId);
  if (e.mengenansatz === null && e.menge === null) {
    return z === undefined ? null : { art: 'AufmasspositionEntfernen', positionId: z.positionId };
  }
  const k = z?.positionId ?? (positionId as Aufmassposition['positionId']);
  return {
    art: 'AufmasspositionSetzen',
    position: { positionId: k, mengenansatz: e.mengenansatz, menge: e.menge },
  };
}
