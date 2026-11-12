// SPDX-License-Identifier: AGPL-3.0-or-later
// Honorarspanne nach § 13 HOAI (Ticket 101, D-56): Zwischen zwei Tafelzeilen werden „von“ und „bis“ der Honorarzone je
// für sich linear interpoliert, erst multipliziert, dann geteilt und kaufmännisch auf 2 Stellen gerundet
// (Projektkonvention, die HOAI regelt keine Rundung). Außerhalb der Tafel gibt es keinen Wert (keine Extrapolation).
// Rein (A2), nur Dezimalarithmetik (N1).

import { addiere, dividiere, multipliziere, runden, subtrahiere, vergleiche } from '@tethys/dezimal';
import { NACHKOMMASTELLEN } from '@tethys/vertrag';
import type { Betrag, Ergebnis } from '@tethys/vertrag';
import type { Honorarspanne, Honorartafel, Honorarzone, Tafelzeile } from './honorartafeln';

/** Warum eine Tafel für anrechenbare Kosten und Honorarzone keine Honorarspanne liefert. */
export type Spannenfehler =
  | 'ausserhalb-honorartafel' // anrechenbare Kosten unter der ersten oder über der letzten Tafelzeile
  | 'honorarzone-unbekannt'; // die Tafel hat diese Honorarzone nicht (§ 56: nur I bis III)

/** Die beiden Tafelzeilen um die anrechenbaren Kosten und die daraus interpolierte Honorarspanne der Zone. */
export interface Tafelinterpolation {
  /** Die Zeile mit den nächstkleineren anrechenbaren Kosten; bei einem Treffer die getroffene Zeile. */
  readonly zeileUnten: Tafelzeile;
  /** Die Zeile mit den nächstgrößeren anrechenbaren Kosten; bei einem Treffer dieselbe Zeile wie unten. */
  readonly zeileOben: Tafelzeile;
  readonly spanne: Honorarspanne;
}

/**
 * w(aK) = w_u + (aK − aK_u) × (w_o − w_u) / (aK_o − aK_u), exakt als ein Bruch gebildet
 * ((w_u × (aK_o − aK_u) + (aK − aK_u) × (w_o − w_u)) / (aK_o − aK_u)) und einmal kaufmännisch auf 2 Stellen gerundet.
 */
function interpolieren(
  anrechenbareKosten: Betrag,
  kostenUnten: Betrag,
  kostenOben: Betrag,
  wertUnten: Betrag,
  wertOben: Betrag,
): Betrag {
  const abstand = subtrahiere(kostenOben, kostenUnten);
  const zaehler = addiere(
    multipliziere(wertUnten, abstand),
    multipliziere(subtrahiere(anrechenbareKosten, kostenUnten), subtrahiere(wertOben, wertUnten)),
  );
  const wert = dividiere(zaehler, abstand, NACHKOMMASTELLEN.betrag);
  // Die Zeilen einer Tafel steigen streng (Datentest); ein Abstand von null ist ein Programmfehler.
  if (!wert.ok) throw new Error(`Tafelzeilen ohne Abstand: ${kostenUnten} und ${kostenOben}`);
  return runden(wert.wert, 'betrag');
}

function spanneDerZone(zeile: Tafelzeile, honorarzone: Honorarzone): Honorarspanne {
  const spanne = zeile.spannen[honorarzone];
  // Jede Zeile hat alle Zonen der Tafel (Datentest); geprüft wird die Zone vorher gegen `honorarzonen`.
  if (spanne === undefined)
    throw new Error(`Tafelzeile ${zeile.anrechenbareKosten} ohne Zone ${honorarzone}`);
  return spanne;
}

/**
 * Honorarspanne der Honorarzone für die anrechenbaren Kosten nach § 13. Liegen die Kosten genau auf einer Tafelzeile,
 * gelten deren Werte; unter der ersten oder über der letzten Zeile gibt es keine Spanne.
 */
export function honorarspanneBerechnen(
  tafel: Honorartafel,
  honorarzone: Honorarzone,
  anrechenbareKosten: Betrag,
): Ergebnis<Tafelinterpolation, Spannenfehler> {
  if (!tafel.honorarzonen.includes(honorarzone)) return { ok: false, fehler: 'honorarzone-unbekannt' };
  const index = tafel.zeilen.findIndex((z) => vergleiche(z.anrechenbareKosten, anrechenbareKosten) >= 0);
  const zeileOben = tafel.zeilen[index];
  if (zeileOben === undefined) return { ok: false, fehler: 'ausserhalb-honorartafel' };
  const oben = spanneDerZone(zeileOben, honorarzone);
  if (vergleiche(zeileOben.anrechenbareKosten, anrechenbareKosten) === 0)
    return { ok: true, wert: { zeileUnten: zeileOben, zeileOben, spanne: oben } };
  const zeileUnten = tafel.zeilen[index - 1];
  if (zeileUnten === undefined) return { ok: false, fehler: 'ausserhalb-honorartafel' };
  const unten = spanneDerZone(zeileUnten, honorarzone);
  const wert = (u: Betrag, o: Betrag): Betrag =>
    interpolieren(anrechenbareKosten, zeileUnten.anrechenbareKosten, zeileOben.anrechenbareKosten, u, o);
  return {
    ok: true,
    wert: {
      zeileUnten,
      zeileOben,
      spanne: { von: wert(unten.von, oben.von), bis: wert(unten.bis, oben.bis) },
    },
  };
}
