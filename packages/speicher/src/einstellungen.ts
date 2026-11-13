// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Einstellungen des Geräts (v1.7a, Ticket 139; E15, D-73, D-127.8, D-127.9): was `speicher` über ihre Form wissen muss und
// wie der Block einer Projektdatei in die gespeicherten Einstellungen übergeht. Reine Funktionen; geschrieben wird in
// `schreiben.ts`, gelesen in `lesen.ts`.

import type { Einstellungen, Einstellungsschluessel } from '@tethys/vertrag';

/**
 * Was der Vertrag an `Einstellungen` als eindeutig nennt und `speicher` zum Zusammenführen braucht: Druckprofilnamen eindeutig,
 * Kostengruppennummern aufsteigend und eindeutig. `null`: in Ordnung; sonst der Befund als Text. Den übrigen Wert prüft der
 * Ausführer (Kern) bzw. beim Einlesen der Dekoder.
 */
export function einstellungenFormfehler(e: Einstellungen): string | null {
  const namen = e.druckprofile.map((p) => p.name);
  const doppelt = namen.find((n, i) => namen.indexOf(n) !== i);
  if (doppelt !== undefined) return `Das Druckprofil „${doppelt}“ steht zweimal in den Einstellungen.`;
  const nummern = e.kostengruppenbezeichnungen.map((k) => k.nummer as string);
  const falsch = nummern.findIndex((n, i) => i > 0 && (nummern[i - 1] ?? '') >= n);
  if (falsch > 0)
    return `Die Kostengruppenbezeichnungen sind nicht nach Nummer geordnet oder doppelt (${nummern[falsch] ?? ''}).`;
  return null;
}

/** Was aus dem Block `einstellungen` einer Projektdatei wurde (`ProjektdateiEinleseergebnis.einstellungen`). */
export interface Einstellungsuebernahme {
  readonly ergebnis: Einstellungen;
  readonly uebernommen: readonly Einstellungsschluessel[];
  readonly belassen: readonly Einstellungsschluessel[];
}

/**
 * Füllt die gespeicherten Einstellungen `lokal` aus dem Block `datei` einer Projektdatei, nur wo je Schlüssel nichts gesetzt ist
 * (D-73, D-127.9): das Büro nur, wenn lokal keines gesetzt ist; ein Druckprofil nur, wenn lokal keines dieses Namens besteht
 * (es kommt ans Ende, wie bei `DruckprofilSetzen`); eine Kostengruppenbezeichnung nur, wenn lokal keine dieser Nummer besteht
 * (die Liste bleibt nach Nummer geordnet). Nie wird etwas überschrieben; „belassen“ heißt lokal vorhanden, auch bei gleichem
 * Wert. Beide Listen des Berichts stehen in der Reihenfolge der Datei: Büro, Druckprofile, Kostengruppenbezeichnungen.
 */
export function einstellungenUebernehmen(lokal: Einstellungen, datei: Einstellungen): Einstellungsuebernahme {
  const uebernommen: Einstellungsschluessel[] = [];
  const belassen: Einstellungsschluessel[] = [];
  let buero = lokal.buero;
  if (datei.buero !== null) {
    if (buero === null) {
      buero = datei.buero;
      uebernommen.push({ art: 'buero' });
    } else belassen.push({ art: 'buero' });
  }
  const druckprofile = [...lokal.druckprofile];
  for (const p of datei.druckprofile) {
    const schluessel: Einstellungsschluessel = { art: 'druckprofil', name: p.name };
    if (druckprofile.some((q) => q.name === p.name)) belassen.push(schluessel);
    else {
      druckprofile.push(p);
      uebernommen.push(schluessel);
    }
  }
  const kostengruppenbezeichnungen = [...lokal.kostengruppenbezeichnungen];
  for (const k of datei.kostengruppenbezeichnungen) {
    const schluessel: Einstellungsschluessel = { art: 'kostengruppenbezeichnung', nummer: k.nummer };
    if (kostengruppenbezeichnungen.some((q) => q.nummer === k.nummer)) belassen.push(schluessel);
    else {
      kostengruppenbezeichnungen.push(k);
      uebernommen.push(schluessel);
    }
  }
  kostengruppenbezeichnungen.sort((a, b) => (a.nummer < b.nummer ? -1 : a.nummer > b.nummer ? 1 : 0));
  return { ergebnis: { buero, druckprofile, kostengruppenbezeichnungen }, uebernommen, belassen };
}
