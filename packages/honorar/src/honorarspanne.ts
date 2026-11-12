// SPDX-License-Identifier: AGPL-3.0-or-later
// Honorarspanne nach § 13 HOAI (Ticket 101, D-56): Zwischen zwei Tafelzeilen werden „von“ und „bis“ der Honorarzone je
// für sich linear interpoliert, erst multipliziert, dann geteilt und kaufmännisch auf 2 Stellen gerundet
// (Projektkonvention, die HOAI regelt keine Rundung). Außerhalb der Tafel gibt es keinen Wert (keine Extrapolation).
// Das Honorar liegt nach dem Honorarsatz in der Spanne. Rein (A2), nur Dezimalarithmetik (N1).

import { addiere, dividiere, multipliziere, runden, subtrahiere, vergleiche } from '@tethys/dezimal';
import { NACHKOMMASTELLEN } from '@tethys/vertrag';
import type { Betrag, Dezimal, Ergebnis, Prozent } from '@tethys/vertrag';
import type { Honorarspanne, Honorartafel, Honorarzone, Tafelzeile } from './honorartafeln';
import { HUNDERT } from './konstanten';

/** `zaehler / nenner`, exakt gebildet und einmal kaufmännisch auf 2 Stellen gerundet; `nenner` ist nie null. */
function teileAufBetrag(zaehler: Dezimal, nenner: Dezimal): Betrag {
  const wert = dividiere(zaehler, nenner, NACHKOMMASTELLEN.betrag);
  // Die Teiler hier sind der Zeilenabstand einer streng steigenden Tafel (Datentest) oder 100: null ist ein
  // Programmfehler.
  if (!wert.ok) throw new Error(wert.fehler.meldung);
  return runden(wert.wert, 'betrag');
}

/**
 * Honorar = round(von + (bis − von) × Honorarsatz / 100, 2) (D-56): 0 ist der Basishonorarsatz („von“), 100 der obere
 * Honorarsatz („bis“). Ein Satz außerhalb von 0 bis 100 folgt derselben Formel; den Befund gibt `honorarBerechnen`.
 */
export function honorarInSpanne(spanne: Honorarspanne, honorarsatz: Prozent): Betrag {
  // Exakt als ein Bruch: (von × 100 + (bis − von) × Honorarsatz) / 100, einmal gerundet.
  const zaehler = addiere(
    multipliziere(spanne.von, HUNDERT),
    multipliziere(subtrahiere(spanne.bis, spanne.von), honorarsatz),
  );
  return teileAufBetrag(zaehler, HUNDERT);
}

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
  return teileAufBetrag(zaehler, abstand);
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
