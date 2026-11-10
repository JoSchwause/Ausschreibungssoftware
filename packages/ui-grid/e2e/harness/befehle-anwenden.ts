// SPDX-License-Identifier: AGPL-3.0-or-later
// Testseite des Grids: wendet die vom Grid ausgegebenen Befehle auf die flache Knotenliste an, nur damit sich im
// Browser Bearbeiten und Einfügen von Anfang bis Ende ausprobieren lassen. Das ist kein Ersatz für `kern`:
// Summen und Gesamtpreise werden nicht neu berechnet. Nur Test- und Harness-Code.

import type { Einfuegeort, Knoten, KnotenId, LvBefehl, Position } from '@tethys/vertrag';

const istGliederung = (k: Knoten | undefined): boolean => k?.art === 'titel' || k?.art === 'los';

/**
 * Verschiebt Knoten samt Unterbäumen in Listenreihenfolge an `ziel` (wie `KnotenlisteVerschieben`) bzw. nimmt sie
 * heraus (`ziel` null, Papierkorb). Arbeitet auf der Kinderfolge je Elternknoten und legt die Liste danach wieder flach.
 */
function umhaengen(liste: readonly Knoten[], ids: readonly KnotenId[], ziel: Einfuegeort | null): Knoten[] {
  const byId = new Map(liste.map((k) => [k.id as string, k]));
  const kinder = new Map<string, Knoten[]>();
  const wurzeln: string[] = [];
  for (const k of liste) {
    if (!byId.has(k.elternId) && !wurzeln.includes(k.elternId)) wurzeln.push(k.elternId);
    kinder.set(k.elternId, [...(kinder.get(k.elternId) ?? []), k]);
  }
  const bewegt = ids.flatMap((id) => byId.get(id) ?? []);
  for (const k of bewegt) {
    kinder.set(
      k.elternId,
      (kinder.get(k.elternId) ?? []).filter((x) => x.id !== k.id),
    );
  }
  if (ziel !== null) {
    let eltern: string;
    let index: number;
    if (ziel.art === 'nach') {
      const x = byId.get(ziel.knotenId);
      if (!x) return [...liste];
      if (istGliederung(x)) {
        eltern = x.id;
        index = 0;
      } else {
        eltern = x.elternId;
        index = (kinder.get(eltern) ?? []).findIndex((k) => k.id === x.id) + 1;
      }
    } else {
      eltern = ziel.elternId;
      index = ziel.art === 'anfang' ? 0 : (kinder.get(eltern) ?? []).length;
    }
    const neu = bewegt.map((k) => ({ ...k, elternId: eltern }) as Knoten);
    const folge = [...(kinder.get(eltern) ?? [])];
    folge.splice(index, 0, ...neu);
    kinder.set(eltern, folge);
  }
  const ergebnis: Knoten[] = [];
  const besuche = (eltern: string): void => {
    for (const k of kinder.get(eltern) ?? []) {
      ergebnis.push(k);
      besuche(k.id);
    }
  };
  for (const w of wurzeln) besuche(w);
  return ergebnis;
}

export function wendeAn(knoten: readonly Knoten[], befehle: readonly LvBefehl[]): Knoten[] {
  let liste = [...knoten];
  for (const b of befehle) {
    switch (b.art) {
      case 'KurztextAendern':
        liste = liste.map((k) =>
          k.id === b.knotenId && k.art !== 'hinweis' ? { ...k, kurztext: b.kurztext } : k,
        );
        break;
      case 'MengeAendern':
        liste = liste.map((k) =>
          k.id === b.positionId && k.art === 'position' ? { ...k, menge: b.menge } : k,
        );
        break;
      case 'EinheitAendern':
        liste = liste.map((k) =>
          k.id === b.positionId && k.art === 'position' ? { ...k, einheit: b.einheit } : k,
        );
        break;
      case 'EinheitspreisAendern':
        liste = liste.map((k) =>
          k.id === b.positionId && k.art === 'position' ? { ...k, einheitspreis: b.einheitspreis } : k,
        );
        break;
      case 'PositionAnlegen': {
        let elternId: Position['elternId'];
        let index: number;
        if (b.ort.art === 'nach') {
          const ortId = b.ort.knotenId;
          const i = liste.findIndex((k) => k.id === ortId);
          const bezug = liste[i];
          if (!bezug) break;
          if (bezug.art === 'titel' || bezug.art === 'los') {
            elternId = bezug.id;
            index = i + 1;
          } else {
            elternId = bezug.elternId;
            index = i + 1;
          }
        } else if (b.ort.art === 'ende') {
          elternId = b.ort.elternId;
          index = liste.length;
        } else {
          const ziel = b.ort.elternId;
          elternId = ziel;
          index = Math.max(
            0,
            liste.findIndex((k) => k.elternId === ziel),
          );
        }
        const neu: Position = { ...b.daten, art: 'position', id: b.id, elternId, reihenfolge: 0 };
        liste.splice(index, 0, neu);
        break;
      }
      case 'KnotenVerschieben':
        liste = umhaengen(liste, [b.knotenId], b.ziel);
        break;
      case 'KnotenlisteVerschieben':
        liste = umhaengen(liste, b.knotenIds, b.ziel);
        break;
      case 'KnotenInPapierkorbLegen':
        liste = umhaengen(liste, b.knotenIds, null);
        break;
      default:
        break;
    }
  }
  return liste;
}
