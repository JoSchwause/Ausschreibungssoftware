// SPDX-License-Identifier: AGPL-3.0-or-later
// Web Worker für `ifc` (Ticket 114): Lesen und Abbilden eines Modells (bis 10.000 Bauteile ≈ 2 s, D-54) und der
// Eigenschaftsindex laufen neben dem Hauptthread; `@tethys/ifc` kommt so nie ins Hauptbündel.

import { IfcBearbeiter, type IfcAntwort, type IfcAuftrag } from './ifc-auftrag';

const bearbeiter = new IfcBearbeiter();

self.onmessage = (e: MessageEvent<IfcAuftrag>) => {
  let antwort: IfcAntwort;
  try {
    antwort = bearbeiter.bearbeite(e.data);
  } catch (f) {
    antwort = { nr: e.data.nr, art: 'fehler', meldung: f instanceof Error ? f.message : String(f) };
  }
  (self as unknown as { postMessage: (m: IfcAntwort) => void }).postMessage(antwort);
};
