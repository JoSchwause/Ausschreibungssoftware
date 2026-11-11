// SPDX-License-Identifier: AGPL-3.0-or-later
// Neue Positionen und Gliederungen bekommen ihre OZ über den Vorschlag des Kerns (`ozVorschlag`, Ticket 42, D-42.3), und
// zwar im Befehl selbst: Das Protokoll hält den Befehl mit der OZ fest, die Umkehrung kennt sie aus dem ChangeSet. Die App
// ergänzt nur, was fehlt; eine mitgebrachte OZ (z. B. aus Excel eingefügt) bleibt. Weiß der Kern keinen Vorschlag
// (Maske, Stellen erschöpft), bleibt die OZ leer, die LV-Prüfung meldet sie (U5).
//
// Ergänzt wird erst, wenn der Befehl an der Reihe ist (auf dem Stand nach allen früheren Befehlen), damit drei schnell
// hintereinander angelegte Positionen drei verschiedene Nummern bekommen.

import { ozVorschlag } from '@tethys/kern';
import type { Befehlshinweis, LvBefehl, LvZustand } from '@tethys/vertrag';

export interface OzErgaenzt {
  readonly befehl: LvBefehl;
  /** `oz-schritt-ausgewichen`, wenn der Vorschlag vom Standardschritt abwich. */
  readonly hinweis?: Befehlshinweis;
}

export function ozErgaenzen(zustand: LvZustand | null, befehl: LvBefehl): OzErgaenzt {
  if (zustand === null) return { befehl };
  if (befehl.art === 'PositionAnlegen') {
    if (befehl.daten.ordnungszahl !== null) return { befehl };
    const v = ozVorschlag(zustand, befehl.ort, 'position');
    if (v === null) return { befehl };
    return {
      befehl: { ...befehl, daten: { ...befehl.daten, ordnungszahl: v.ordnungszahl } },
      ...(v.hinweis ? { hinweis: v.hinweis } : {}),
    };
  }
  if (befehl.art === 'GliederungAnlegen') {
    if (befehl.ordnungszahl !== undefined && befehl.ordnungszahl !== null) return { befehl };
    const v = ozVorschlag(zustand, befehl.ort, befehl.gliederungsart);
    if (v === null) return { befehl };
    return {
      befehl: { ...befehl, ordnungszahl: v.ordnungszahl },
      ...(v.hinweis ? { hinweis: v.hinweis } : {}),
    };
  }
  return { befehl };
}
