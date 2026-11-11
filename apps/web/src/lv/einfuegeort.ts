// SPDX-License-Identifier: AGPL-3.0-or-later
// Wohin die Schaltflächen über dem Grid einen neuen Knoten legen. Jeder Ort ist ein `Einfuegeort` des Vertrags, damit
// jede Aktion genau ein Befehl bleibt. „Hinter einer Gliederung“ heißt dort „als erstes Kind“ (Ticket 05); ein Titel
// auf derselben Ebene direkt hinter einem Titel, der nicht der letzte ist, lässt sich so nicht ausdrücken. Deshalb:
//
// - Position: hinter der aktiven Zeile, wie Strg+Plus im Grid (bei einer Gliederung als erstes Kind).
// - Titel: auf derselben Ebene wie die Gliederung der aktiven Zeile, am Ende dieser Ebene.
// - Untertitel: als letztes Kind der Gliederung der aktiven Zeile.
//
// „Gliederung der aktiven Zeile“ ist die Zeile selbst, wenn sie eine Gliederung ist, sonst ihr Elternknoten.
// Ohne aktive Zeile (leeres LV) kommt alles ans Ende der Wurzel.

import type { Einfuegeort, ElternId, KnotenId, Leistungsverzeichnis } from '@tethys/vertrag';

function gliederungDer(lv: Leistungsverzeichnis, aktiv: KnotenId | null): ElternId | null {
  const k = aktiv === null ? undefined : lv.knoten.find((x) => x.id === aktiv);
  if (k === undefined) return null;
  if (k.art === 'titel' || k.art === 'los') return k.id;
  return k.elternId === lv.id ? null : k.elternId;
}

export function positionOrt(lv: Leistungsverzeichnis, aktiv: KnotenId | null): Einfuegeort {
  const vorhanden = aktiv !== null && lv.knoten.some((k) => k.id === aktiv);
  return vorhanden ? { art: 'nach', knotenId: aktiv } : { art: 'ende', elternId: lv.id };
}

export function titelOrt(lv: Leistungsverzeichnis, aktiv: KnotenId | null): Einfuegeort {
  const g = gliederungDer(lv, aktiv);
  const eltern = g === null ? lv.id : (lv.knoten.find((k) => k.id === g)?.elternId ?? lv.id);
  return { art: 'ende', elternId: eltern };
}

export function untertitelOrt(lv: Leistungsverzeichnis, aktiv: KnotenId | null): Einfuegeort {
  return { art: 'ende', elternId: gliederungDer(lv, aktiv) ?? lv.id };
}
