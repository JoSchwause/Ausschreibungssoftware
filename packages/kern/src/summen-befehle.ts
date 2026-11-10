// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle, die Summen verändern (Ticket 07): MengeAendern, EinheitspreisAendern, NachlassSetzen, NachlassEntfernen,
// MwstSatzSetzen. Jeder Befehl ist `(LvZustand, Befehl) → Ergebnis<LvChangeSet, Befehlsfehler>`: rein, ohne Zufall und
// Uhr (A2). Das ChangeSet nennt die geänderte Position (oder den geänderten Kopf), die betroffenen Summen (nur Werte, die
// sich ändern) und sonst nichts (A6). Ein Befehl, der nichts ändert (gleicher Wert), liefert ein leeres ChangeSet.

import { alsBetrag, alsEinheitspreis, alsMenge, alsProzent } from '@tethys/dezimal';
import type {
  Befehlsfehler,
  Ergebnis,
  EinheitspreisAendern,
  LvChangeSet,
  LvZustand,
  MengeAendern,
  MwstSatzSetzen,
  Nachlass,
  NachlassSetzen,
  Position,
  PositionId,
} from '@tethys/vertrag';
import { baueChangeSet } from './changeset';
import { nein, ok } from './fehler';
import { ohneKnoten, indexVon } from './struktur';
import type { Baumindex } from './struktur';
import { summenAenderung } from './summen';
import { mwstSatzFehler, nachlassFehler } from './summenregeln';

type Antwort = Ergebnis<LvChangeSet, Befehlsfehler>;

export function positionFinden(
  z: LvZustand,
  positionId: PositionId,
): Ergebnis<{ idx: Baumindex; position: Position }, Befehlsfehler> {
  const idx = indexVon(z.leistungsverzeichnis.id, z.leistungsverzeichnis.knoten);
  const k = idx.byId.get(positionId);
  if (!k) return nein('knoten-unbekannt', `Knoten unbekannt: ${positionId}`, positionId);
  if (k.art !== 'position') {
    return nein(
      'knotenart-unzulaessig',
      `Nur eine Position trägt Menge und Preis, nicht „${k.art}“.`,
      positionId,
    );
  }
  return ok({ idx, position: k });
}

/**
 * Position ändern; die Summen folgen aus der Knotenänderung (GP, Ziel, und die Zuschlagspositionen, deren Bereich oder
 * Liste die Position enthält). `summenAenderung` nennt nur Werte, die sich ändern.
 */
export function positionAendern(z: LvZustand, idx: Baumindex, alt: Position, neu: Position): LvChangeSet {
  const geaendert = [{ vorher: alt, nachher: neu }];
  const summen = summenAenderung(z, idx, { knoten: { geaendert } });
  return baueChangeSet(z, { geaendert, summen });
}

/** `null` ist „nicht gesetzt“ und erlaubt; sonst kanonische Schreibweise mit der Skala der Zahlenart. */
export function mengeAendern(z: LvZustand, b: MengeAendern): Antwort {
  const f = positionFinden(z, b.positionId);
  if (!f.ok) return f;
  if (b.menge !== null) {
    const e = alsMenge(b.menge);
    if (!e.ok) return nein('ungueltige-eingabe', e.fehler.meldung, b.positionId, 'menge');
  }
  const { idx, position } = f.wert;
  if (b.menge === position.menge) return ok(baueChangeSet(z, {}));
  return ok(positionAendern(z, idx, position, { ...position, menge: b.menge }));
}

export function einheitspreisAendern(z: LvZustand, b: EinheitspreisAendern): Antwort {
  const f = positionFinden(z, b.positionId);
  if (!f.ok) return f;
  if (b.einheitspreis !== null) {
    const e = alsEinheitspreis(b.einheitspreis);
    if (!e.ok) return nein('ungueltige-eingabe', e.fehler.meldung, b.positionId, 'einheitspreis');
  }
  const { idx, position } = f.wert;
  if (b.einheitspreis === position.einheitspreis) return ok(baueChangeSet(z, {}));
  return ok(positionAendern(z, idx, position, { ...position, einheitspreis: b.einheitspreis }));
}

function gleicherNachlass(a: Nachlass | null, b: Nachlass | null): boolean {
  if (a === null || b === null) return a === b;
  return a.art === b.art && a.wert === b.wert;
}

/** Setzt den Nachlass des LV (genau einer je LV, N5) und liefert den neuen Kopf und die Gesamtsummen. */
function nachlassUmsetzen(z: LvZustand, nachlass: Nachlass | null): LvChangeSet {
  const kopfAlt = ohneKnoten(z.leistungsverzeichnis);
  if (gleicherNachlass(kopfAlt.nachlass, nachlass)) return baueChangeSet(z, {});
  const idx = indexVon(z.leistungsverzeichnis.id, z.leistungsverzeichnis.knoten);
  const summen = summenAenderung(z, idx, { kopf: { nachlass, mwstSatz: kopfAlt.mwstSatz } });
  return baueChangeSet(z, { kopf: { vorher: kopfAlt, nachher: { ...kopfAlt, nachlass } }, summen });
}

export function nachlassSetzen(z: LvZustand, b: NachlassSetzen): Antwort {
  const n = b.nachlass;
  const form = n.art === 'prozent' ? alsProzent(n.wert) : alsBetrag(n.wert);
  if (!form.ok) return nein('ungueltige-eingabe', form.fehler.meldung, undefined, 'nachlass');
  const meldung = nachlassFehler(n);
  if (meldung !== null) return nein('ungueltige-eingabe', meldung, undefined, 'nachlass');
  return ok(nachlassUmsetzen(z, n));
}

export function nachlassEntfernen(z: LvZustand): Antwort {
  return ok(nachlassUmsetzen(z, null));
}

/** Setzt den MwSt-Satz des LV (ein Satz je LV, G-28). Satzwechsel über die Zeit sind nicht Teil des Tickets. */
export function mwstSatzSetzen(z: LvZustand, b: MwstSatzSetzen): Antwort {
  const form = alsProzent(b.mwstSatz);
  if (!form.ok) return nein('ungueltige-eingabe', form.fehler.meldung, undefined, 'mwstSatz');
  const meldung = mwstSatzFehler(b.mwstSatz);
  if (meldung !== null) return nein('ungueltige-eingabe', meldung, undefined, 'mwstSatz');
  const kopfAlt = ohneKnoten(z.leistungsverzeichnis);
  if (kopfAlt.mwstSatz === b.mwstSatz) return ok(baueChangeSet(z, {}));
  const idx = indexVon(z.leistungsverzeichnis.id, z.leistungsverzeichnis.knoten);
  const summen = summenAenderung(z, idx, { kopf: { nachlass: kopfAlt.nachlass, mwstSatz: b.mwstSatz } });
  return ok(
    baueChangeSet(z, { kopf: { vorher: kopfAlt, nachher: { ...kopfAlt, mwstSatz: b.mwstSatz } }, summen }),
  );
}
