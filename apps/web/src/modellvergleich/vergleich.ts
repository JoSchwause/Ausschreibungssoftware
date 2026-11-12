// SPDX-License-Identifier: AGPL-3.0-or-later
// Ansicht des Modellvergleichs (Ticket 116, X1f): Zusammenfassung, Zeilen der Änderungsliste (`VergleichsGrid`, U2) und die
// Färbung des neuen Stands für `ui-modell`. Rein: die Vergleichslogik steht in `bim` (`modellVergleichen`), hier werden nur
// Texte gebaut und Mengen am Rand formatiert (N4).

import { modellVergleichen } from '@tethys/bim';
import { formatiereMengeDe } from '@tethys/dezimal';
import type { VergleichsSpalte, VergleichsZeile } from '@tethys/ui-grid';
import type { Bauteilkennzeichen } from '@tethys/ui-modell';
import type { Bauteil, Bauwerksmodell, IfcGlobalId, Pruefbefund } from '@tethys/vertrag';
import { texte } from './texte';

export interface Vergleichszusammenfassung {
  readonly hinzugefuegt: number;
  readonly entfernt: number;
  readonly geaendert: number;
  readonly unveraendert: number;
}

export interface Vergleichsansicht {
  readonly zusammenfassung: Vergleichszusammenfassung;
  /** Hinzugefügt (Reihenfolge des neuen Stands), entfernt und geändert (Reihenfolge des alten), D-108.11. */
  readonly zeilen: readonly VergleichsZeile[];
  /** Färbung des **neuen** Stands: hinzugefügt und geändert; entfernte stehen nur in der Liste (Ticket 116 Punkt 2). */
  readonly faerbung: ReadonlyMap<string, Bauteilkennzeichen>;
  readonly befunde: readonly Pruefbefund[];
}

export const LISTE_SPALTEN: readonly VergleichsSpalte[] = [
  { id: 'art', kopf: texte.liste.art, breite: 140 },
  { id: 'klasse', kopf: texte.liste.klasse, breite: 110 },
  { id: 'name', kopf: texte.liste.name, breite: 190 },
  { id: 'geschoss', kopf: texte.liste.geschoss, breite: 80 },
  { id: 'aenderung', kopf: texte.liste.aenderung, breite: 480 },
];

/** Name des Geschosses über einem Strukturknoten (der Knoten selbst, wenn keiner darüber ein Geschoss ist). */
function geschossname(modell: Bauwerksmodell, strukturGlobalId: IfcGlobalId | null): string {
  if (strukturGlobalId === null) return '';
  const erster = new Map<string, Bauwerksmodell['struktur'][number]>();
  for (const k of modell.struktur) if (!erster.has(k.globalId)) erster.set(k.globalId, k);
  const start = erster.get(strukturGlobalId);
  const besucht = new Set<string>();
  for (let k = start; k !== undefined && !besucht.has(k.globalId);) {
    if (k.art === 'geschoss') return k.name ?? '';
    besucht.add(k.globalId);
    k = k.elternGlobalId === null ? undefined : erster.get(k.elternGlobalId);
  }
  return start?.name ?? '';
}

const name = (b: Bauteil): string => b.name ?? texte.liste.ohneName;
const mengeText = (m: { readonly wert: string } | null): string =>
  m === null ? texte.liste.fehlt : formatiereMengeDe(m.wert as Parameters<typeof formatiereMengeDe>[0]);

function zeile(
  id: string,
  art: string,
  b: Bauteil,
  modell: Bauwerksmodell,
  aenderung: string,
  kennzeichen: Bauteilkennzeichen,
): VergleichsZeile {
  return {
    id,
    art: 'position',
    tiefe: 0,
    hatUnterknoten: false,
    aufgeklappt: false,
    zellen: {
      art: { text: art, kennzeichen: [kennzeichen] },
      klasse: { text: b.ifcKlasse },
      name: { text: name(b) },
      geschoss: { text: geschossname(modell, b.strukturGlobalId) },
      aenderung: { text: aenderung },
    },
  };
}

/** Zwei Stände für die Vergleichsseite: `alt` ist der frühere (Standard der Vorgänger), `neu` der gezeigte. */
export function vergleichsansicht(alt: Bauwerksmodell, neu: Bauwerksmodell): Vergleichsansicht {
  const v = modellVergleichen(alt, neu);
  const faerbung = new Map<string, Bauteilkennzeichen>();
  const zeilen: VergleichsZeile[] = [];
  for (const b of v.hinzugefuegt) {
    faerbung.set(b.globalId, 'hinzugefuegt');
    zeilen.push(zeile(`h-${b.globalId}`, texte.liste.hinzugefuegt, b, neu, '', 'hinzugefuegt'));
  }
  for (const b of v.entfernt)
    zeilen.push(zeile(`e-${b.globalId}`, texte.liste.entfernt, b, alt, '', 'entfernt'));
  for (const g of v.geaendert) {
    faerbung.set(g.globalId, 'geaendert');
    const teile: string[] = [];
    for (const f of g.felder) {
      if (f === 'klasse')
        teile.push(`${texte.liste.feld.klasse}: ${g.vorher.ifcKlasse} → ${g.nachher.ifcKlasse}`);
      else if (f === 'name') teile.push(`${texte.liste.feld.name}: ${name(g.vorher)} → ${name(g.nachher)}`);
      else if (f === 'strukturknoten')
        teile.push(
          `${texte.liste.feld.strukturknoten}: ${geschossname(alt, g.vorher.strukturGlobalId)} → ${geschossname(neu, g.nachher.strukturGlobalId)}`,
        );
      else
        for (const m of g.mengen) teile.push(`${m.name}: ${mengeText(m.vorher)} → ${mengeText(m.nachher)}`);
    }
    zeilen.push(
      zeile(`g-${g.globalId}`, texte.liste.geaendert, g.nachher, neu, teile.join('; '), 'geaendert'),
    );
  }
  return {
    zusammenfassung: {
      hinzugefuegt: v.hinzugefuegt.length,
      entfernt: v.entfernt.length,
      geaendert: v.geaendert.length,
      unveraendert: v.anzahlUnveraendert,
    },
    zeilen,
    faerbung,
    befunde: v.befunde,
  };
}
