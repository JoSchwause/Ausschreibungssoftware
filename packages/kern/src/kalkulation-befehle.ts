// SPDX-License-Identifier: AGPL-3.0-or-later
// KalkulationSetzen (Vertrag v1.7a, Ticket 137; E9, D-127.6): Kalkulationsangaben, EP und EPA einer Position in einem
// ChangeSet, wie `MengenansatzSetzen` Ansatz und Menge. Rein (A2). Der Kern rechnet die Kalkulation nie aus (A3: kein
// `kern → kosten`): Die App rechnet EP und EPA mit `kosten` (`kalkulationBerechnen`, D-39) und gibt sie mit; der Kern prüft
// nur die Form und legt alles ab. Summen wie bei `EinheitspreisAendern` (A6). Die Knotenänderung trägt die ganze Position
// vorher und nachher; das ChangeSet ist also aus sich allein umkehrbar.

import { alsEinheitspreis } from '@tethys/dezimal';
import type { Befehlsfehler, Ergebnis, KalkulationSetzen, LvChangeSet, LvZustand } from '@tethys/vertrag';
import { baueChangeSet } from './changeset';
import { anteileFehler } from './epa';
import { nein, ok } from './fehler';
import { gleicherWert } from './merkmal-befehle';
import { kalkulationFehler, kalkulationNormal, positionMitKalkulation } from './positionsfelder';
import { positionAendern, positionFinden } from './summen-befehle';

type Antwort = Ergebnis<LvChangeSet, Befehlsfehler>;

/**
 * `KalkulationSetzen`:
 * - Knoten vor Wert wie jeder Feldbefehl (D-71.3): unbekannte Kennung `knoten-unbekannt`, Gliederung oder Hinweistext
 *   `knotenart-unzulaessig`. Eine Zuschlagsposition (mit Satz oder in der Altform) trägt keine Kalkulation: ebenfalls
 *   `knotenart-unzulaessig` mit `feld: 'kalkulation'`, auch mit `kalkulation: null` (D-82 S3; der Befehl gehört nicht zu
 *   ihr).
 * - Form (`ungueltige-eingabe` mit `feld`): Kalkulation nach `kalkulationFehler`, `einheitspreis` und `epa` wie bei ihren
 *   Feldbefehlen. Ob EP und EPA zur Kalkulation passen, prüft der Kern nicht.
 * - `kalkulation: null` und eine leere Kalkulation entfernen das Feld; EP und EPA werden in jedem Fall gesetzt, wie sie kommen
 *   (der EP wird nicht aus den Anteilen gebildet, anders als bei `EinheitspreisanteileSetzen`).
 * - Dieselben Werte: leeres ChangeSet.
 */
export function kalkulationSetzen(z: LvZustand, b: KalkulationSetzen): Antwort {
  const f = positionFinden(z, b.positionId);
  if (!f.ok) return f;
  const { idx, position } = f.wert;
  if (position.zuschlag !== null)
    return nein(
      'knotenart-unzulaessig',
      'Eine Zuschlagsposition trägt keine Kalkulation.',
      position.id,
      'kalkulation',
    );
  if (b.kalkulation !== null) {
    const k = kalkulationFehler(b.kalkulation);
    if (k !== null) return nein('ungueltige-eingabe', k.meldung, position.id, k.feld);
  }
  if (b.einheitspreis !== null) {
    const e = typeof b.einheitspreis === 'string' ? alsEinheitspreis(b.einheitspreis) : null;
    if (e === null || !e.ok)
      return nein(
        'ungueltige-eingabe',
        e?.ok === false ? e.fehler.meldung : 'Der Einheitspreis ist null oder ein Preis mit 3 Stellen.',
        position.id,
        'einheitspreis',
      );
  }
  if (b.epa !== null) {
    if (typeof b.epa !== 'object' || Array.isArray(b.epa))
      return nein('ungueltige-eingabe', 'Die Anteile sind ein Objekt oder null.', position.id, 'epa');
    const fehler = anteileFehler(b.epa, position.id);
    if (fehler) return { ok: false, fehler };
  }
  const kalkulation = b.kalkulation === null ? null : kalkulationNormal(b.kalkulation);
  const neu = positionMitKalkulation(
    { ...position, einheitspreis: b.einheitspreis, epa: b.epa },
    kalkulation,
  );
  if (gleicherWert(position, neu)) return ok(baueChangeSet(z, {}));
  return ok(positionAendern(z, idx, position, neu));
}
