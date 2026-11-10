// SPDX-License-Identifier: AGPL-3.0-or-later
// Einheitspreisanteile (K7, Ticket 37): `EinheitspreisanteileSetzen` und die Anteilsummen je Ebene `epaSummen`.
//
// Beleg für „EP = Summe der Anteile“: BVBS 3.3 AVA X86, 1.10.30.20 `UP` 27,910 = `UPComp1..4` 2,230 + 23,120 + 2,560 +
// 0,000 und 1.10.30.10 30,000 = 5,120 + 4,880 + 0,000 + 20,000.

import { NULL_BETRAG, NULL_EINHEITSPREIS, addiere, alsEinheitspreis, gesamtpreis } from '@tethys/dezimal';
import type {
  Befehlsfehler,
  Betrag,
  Einheitspreis,
  Einheitspreisanteile,
  EinheitspreisanteileSetzen,
  Ergebnis,
  GliederungId,
  Leistungsverzeichnis,
  LvChangeSet,
  LvZustand,
  Position,
} from '@tethys/vertrag';
import { baueChangeSet } from './changeset';
import { befehlsfehler, nein, ok } from './fehler';
import { gleicherWert } from './merkmal-befehle';
import { indexVon, praeorder } from './struktur';
import { positionAendern, positionFinden } from './summen-befehle';
import { betragsziel, eigenerGesamtpreis, rechenmenge } from './summenregeln';

type Antwort = Ergebnis<LvChangeSet, Befehlsfehler>;

/** Die sechs Anteile, in Reihenfolge des Vertrags. */
export const ANTEILE = ['lohn', 'stoffe', 'geraete', 'nachunternehmer', 'sonstiges', 'frei'] as const;
export type Anteil = (typeof ANTEILE)[number];

export const EPA_ANNAHMEN: {
  readonly status: string;
  readonly einheitspreis: string;
  readonly zuschlag: string;
  readonly summen: string;
} = {
  status: 'Demo D-37.3, Mensch bestätigt später',
  einheitspreis:
    'Sind Anteile gesetzt (mindestens einer nicht null), wird der EP im selben ChangeSet die Summe der gesetzten Anteile (Skala 3); ' +
    'epa: null entfernt nur die Anteile, der EP bleibt; Anteile ganz ohne Wert lassen den EP stehen. EinheitspreisAendern lässt Anteile stehen (Abweichung: K8)',
  zuschlag:
    'Anteile an einer Zuschlagsposition mit Satz: knotenart-unzulaessig; die Altform (Menge × EP) darf Anteile tragen',
  summen:
    'je Gliederung und LV und je Anteil: Summe von gerundet(Menge × Anteil, 2) über die Positionen mit GP, deren Betrag ins Netto geht (Pauschal ohne Menge: Menge 1)',
};

function anteileFehler(epa: Einheitspreisanteile, positionId: string): Befehlsfehler | null {
  for (const a of ANTEILE) {
    const w = epa[a];
    if (w === null) continue;
    const e = alsEinheitspreis(w);
    if (!e.ok) return befehlsfehler('ungueltige-eingabe', e.fehler.meldung, positionId, `epa.${a}`);
  }
  if (epa.freiBezeichnung !== null && typeof epa.freiBezeichnung !== 'string')
    return befehlsfehler(
      'ungueltige-eingabe',
      'Die Bezeichnung des freien Anteils ist ein Text oder null.',
      positionId,
      'epa.freiBezeichnung',
    );
  return null;
}

/** Die Summe der gesetzten Anteile (EP-Skala 3); keiner gesetzt: `null`. */
export function anteilsumme(epa: Einheitspreisanteile): Einheitspreis | null {
  let summe: Einheitspreis | null = null;
  for (const a of ANTEILE) {
    const w = epa[a];
    if (w !== null) summe = addiere(summe ?? NULL_EINHEITSPREIS, w);
  }
  return summe;
}

export function einheitspreisanteileSetzen(z: LvZustand, b: EinheitspreisanteileSetzen): Antwort {
  const f = positionFinden(z, b.positionId);
  if (!f.ok) return f;
  const { idx, position } = f.wert;
  if (b.epa !== null) {
    if (position.zuschlag !== null && position.zuschlag.prozentsatz !== null)
      return nein(
        'knotenart-unzulaessig',
        'Eine Zuschlagsposition mit Satz hat keinen Einheitspreis und keine Anteile.',
        position.id,
      );
    if (typeof b.epa !== 'object')
      return nein('ungueltige-eingabe', 'Die Anteile sind ein Objekt oder null.', position.id, 'epa');
    const fehler = anteileFehler(b.epa, position.id);
    if (fehler) return { ok: false, fehler };
  }
  const einheitspreis =
    b.epa === null ? position.einheitspreis : (anteilsumme(b.epa) ?? position.einheitspreis);
  if (gleicherWert(position.epa, b.epa) && einheitspreis === position.einheitspreis)
    return ok(baueChangeSet(z, {}));
  const neu: Position = { ...position, epa: b.epa, einheitspreis };
  return ok(positionAendern(z, idx, position, neu));
}

// --- Anteilsummen je Ebene (altes Ticket 17) ----------------------------------------------------------------------

/** Je Anteil eine Summe (Betrag, 2 Stellen). */
export type Anteilsummen = Readonly<Record<Anteil, Betrag>>;

export interface EpaSummen {
  readonly gesamt: Anteilsummen;
  /** Jede Gliederung des LV, auch ohne Anteile (dann alles 0,00). */
  readonly gliederungen: ReadonlyMap<GliederungId, Anteilsummen>;
}

const NULL_ANTEILSUMMEN: Anteilsummen = {
  lohn: NULL_BETRAG,
  stoffe: NULL_BETRAG,
  geraete: NULL_BETRAG,
  nachunternehmer: NULL_BETRAG,
  sonstiges: NULL_BETRAG,
  frei: NULL_BETRAG,
};

const plus = (a: Anteilsummen, b: Anteilsummen): Anteilsummen => ({
  lohn: addiere(a.lohn, b.lohn),
  stoffe: addiere(a.stoffe, b.stoffe),
  geraete: addiere(a.geraete, b.geraete),
  nachunternehmer: addiere(a.nachunternehmer, b.nachunternehmer),
  sonstiges: addiere(a.sonstiges, b.sonstiges),
  frei: addiere(a.frei, b.frei),
});

/** Was eine Position beiträgt: je Anteil gerundet(Menge × Anteil, 2), wenn ihr GP ins Netto geht. */
function anteileDerPosition(p: Position): Anteilsummen {
  const menge = rechenmenge(p);
  if (p.epa === null || menge === null) return NULL_ANTEILSUMMEN;
  if (p.zuschlag?.prozentsatz != null) return NULL_ANTEILSUMMEN;
  if (eigenerGesamtpreis(p) === null || betragsziel(p) !== 'netto') return NULL_ANTEILSUMMEN;
  const epa = p.epa;
  const je = (a: Anteil): Betrag => {
    const w = epa[a];
    return w === null ? NULL_BETRAG : gesamtpreis(menge, w);
  };
  return {
    lohn: je('lohn'),
    stoffe: je('stoffe'),
    geraete: je('geraete'),
    nachunternehmer: je('nachunternehmer'),
    sonstiges: je('sonstiges'),
    frei: je('frei'),
  };
}

/**
 * Anteilsummen je Gliederung und für das LV (rein, vollständig aus dem LV): je Anteil die Summe von gerundet(Menge ×
 * Anteil, 2) über die Positionen, die ins Netto gehen. Nicht im ChangeSet (der Vertrag hat dafür kein Feld).
 */
export function epaSummen(lv: Pick<Leistungsverzeichnis, 'id' | 'knoten'>): EpaSummen {
  const index = indexVon(lv.id, lv.knoten);
  const reihe = praeorder(lv.id, index.kinder);
  const summen = new Map<string, Anteilsummen>();
  const ablegen = (eltern: string, a: Anteilsummen): void => {
    summen.set(eltern, plus(summen.get(eltern) ?? NULL_ANTEILSUMMEN, a));
  };
  for (let i = reihe.length - 1; i >= 0; i--) {
    const k = reihe[i];
    if (!k || k.art === 'hinweis') continue;
    if (k.art === 'position') ablegen(k.elternId, anteileDerPosition(k));
    else ablegen(k.elternId, summen.get(k.id) ?? NULL_ANTEILSUMMEN);
  }
  const gliederungen = new Map<GliederungId, Anteilsummen>();
  for (const k of lv.knoten)
    if (k.art === 'los' || k.art === 'titel') gliederungen.set(k.id, summen.get(k.id) ?? NULL_ANTEILSUMMEN);
  return { gesamt: summen.get(lv.id) ?? NULL_ANTEILSUMMEN, gliederungen };
}
