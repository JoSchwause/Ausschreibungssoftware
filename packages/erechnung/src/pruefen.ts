// SPDX-License-Identifier: AGPL-3.0-or-later
// Rechenprüfung einer gelesenen XRechnung (Ticket 76, Abschnitt 4): die Summenregeln der EN 16931 (BR-CO-10, -13,
// -14, -15, -16). Nur Befunde, nie eine Sperre (U5). Gerechnet wird nur mit `dezimal` (N1); fehlende optionale Beträge
// (BT-107, BT-108, BT-110, BT-113, BT-114) zählen 0. Fehlt ein Wert, ohne den eine Regel nichts aussagt, entfällt sie;
// die fehlende Angabe ist dann schon selbst ein Befund.

import {
  NULL_BETRAG,
  addiere,
  formatiereBetragDe,
  subtrahiere,
  summiereBetraege,
  vergleiche,
} from '@tethys/dezimal';
import type { Betrag } from '@tethys/vertrag';
import type { Eingangsrechnung, XRechnungBefund, XRechnungBefundcode } from './typen';

/** Alle Werte vorhanden? Dann die Liste ohne `null`, sonst `null`. */
function alle(werte: readonly (Betrag | null)[]): Betrag[] | null {
  const ohne = werte.filter((w): w is Betrag => w !== null);
  return ohne.length === werte.length ? ohne : null;
}

export function summenregelnPruefen(rechnung: Eingangsrechnung): XRechnungBefund[] {
  const befunde: XRechnungBefund[] = [];
  const s = rechnung.summen;
  const oderNull = (b: Betrag | null): Betrag => b ?? NULL_BETRAG;

  const pruefe = (
    code: XRechnungBefundcode,
    feld: string,
    name: string,
    datei: Betrag | null,
    soll: Betrag | null,
    regel: string,
  ): void => {
    if (datei === null || soll === null || vergleiche(datei, soll) === 0) return;
    befunde.push({
      schwere: 'fehler',
      code,
      meldung: `${feld} (${name}) ist ${formatiereBetragDe(datei)}; ${regel} ergibt ${formatiereBetragDe(soll)}.`,
      ort: { feld },
    });
  };

  const nettobetraege = alle(rechnung.positionen.map((p) => p.nettobetrag));
  pruefe(
    'summe-positionen-falsch',
    'BT-106',
    'Summe der Nettobeträge der Positionen',
    s.summePositionen,
    nettobetraege && summiereBetraege(nettobetraege),
    'die Summe der Positionen (BT-131)',
  );

  pruefe(
    'netto-falsch',
    'BT-109',
    'Gesamtbetrag ohne Umsatzsteuer',
    s.netto,
    s.summePositionen &&
      addiere(subtrahiere(s.summePositionen, oderNull(s.summeAbschlaege)), oderNull(s.summeZuschlaege)),
    'BT-106 − BT-107 + BT-108',
  );

  const steuerbetraege = alle(rechnung.umsatzsteueraufschluesselung.map((u) => u.betrag));
  if (s.umsatzsteuer !== null || rechnung.umsatzsteueraufschluesselung.length > 0) {
    pruefe(
      'umsatzsteuer-falsch',
      'BT-110',
      'Summe der Umsatzsteuer',
      oderNull(s.umsatzsteuer),
      steuerbetraege && summiereBetraege(steuerbetraege),
      'die Summe der Umsatzsteueraufschlüsselung (BT-117)',
    );
  }

  pruefe(
    'brutto-falsch',
    'BT-112',
    'Gesamtbetrag einschließlich Umsatzsteuer',
    s.brutto,
    s.netto && addiere(s.netto, oderNull(s.umsatzsteuer)),
    'BT-109 + BT-110',
  );

  pruefe(
    'zahlbetrag-falsch',
    'BT-115',
    'Fälliger Zahlbetrag',
    s.zahlbetrag,
    s.brutto && addiere(subtrahiere(s.brutto, oderNull(s.bereitsGezahlt)), oderNull(s.rundungsbetrag)),
    'BT-112 − BT-113 + BT-114',
  );

  return befunde;
}
