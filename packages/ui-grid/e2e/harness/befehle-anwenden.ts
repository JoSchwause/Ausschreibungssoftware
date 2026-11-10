// SPDX-License-Identifier: AGPL-3.0-or-later
// Testseite des Grids: wendet die vom Grid ausgegebenen Befehle auf die flache Knotenliste an, nur damit sich im
// Browser Bearbeiten und Einfügen von Anfang bis Ende ausprobieren lassen. Das ist kein Ersatz für `kern`:
// Summen und Gesamtpreise werden nicht neu berechnet. Nur Test- und Harness-Code.

import type { Knoten, LvBefehl, Position } from '@tethys/vertrag';

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
      default:
        break;
    }
  }
  return liste;
}
