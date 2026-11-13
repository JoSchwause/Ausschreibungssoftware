// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Einstellungen des Geräts (v1.7a, Ticket 139; E15, D-73, D-127.8, D-127.9): was `speicher` über ihre Form wissen muss und
// wie der Block einer Projektdatei in die gespeicherten Einstellungen übergeht. Reine Funktionen; geschrieben wird in
// `schreiben.ts`, gelesen in `lesen.ts`.

import type { Einstellungen, EinstellungenChangeSet, Einstellungsschluessel } from '@tethys/vertrag';

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

/**
 * Die Einstellungen nach der Übernahme des Blocks `datei` einer Projektdatei, nach der Regel von `EinstellungenUebernehmen`
 * (D-73, D-127.9): Das Büro nur, wenn lokal keines gesetzt ist; ein Druckprofil nur, wenn lokal keines dieses Namens besteht (es
 * kommt in der Reihenfolge der Datei ans Ende); eine Kostengruppenbezeichnung nur, wenn lokal keine dieser Nummer besteht (die
 * Liste bleibt nach Nummer geordnet). Nie wird etwas überschrieben.
 *
 * Ausführer dieses Befehls ist der Kern (Ticket 137, `einstellungenBefehlAusfuehren`); bis er gemergt ist, rechnet `speicher`
 * nach derselben Regel (D-127.9 erlaubt beides). Danach ersetzt der Aufruf des Kerns diese Funktion in
 * `uebernimmEinstellungenDerDatei` (eine Zeile); der Bericht folgt ohnehin aus dem ChangeSet (`einstellungsbericht`).
 */
export function einstellungenUebernehmen(lokal: Einstellungen, datei: Einstellungen): Einstellungen {
  const druckprofile = [...lokal.druckprofile];
  for (const p of datei.druckprofile) if (!druckprofile.some((q) => q.name === p.name)) druckprofile.push(p);
  const kostengruppenbezeichnungen = [...lokal.kostengruppenbezeichnungen];
  for (const k of datei.kostengruppenbezeichnungen)
    if (!kostengruppenbezeichnungen.some((q) => q.nummer === k.nummer)) kostengruppenbezeichnungen.push(k);
  kostengruppenbezeichnungen.sort((a, b) => (a.nummer < b.nummer ? -1 : a.nummer > b.nummer ? 1 : 0));
  return { buero: lokal.buero ?? datei.buero, druckprofile, kostengruppenbezeichnungen };
}

/**
 * Was aus dem Block `datei` wurde, abgelesen am ChangeSet der Übernahme (D-127.9, `ProjektdateiEinleseergebnis`): je Schlüssel
 * der Datei „belassen“, wenn es ihn vorher lokal schon gab (auch mit gleichem Wert), sonst „übernommen“, wenn er nachher da ist.
 * Beide Listen in der Reihenfolge der Datei: Büro, Druckprofile, Kostengruppenbezeichnungen.
 */
export function einstellungsbericht(
  datei: Einstellungen,
  cs: EinstellungenChangeSet,
): { readonly uebernommen: Einstellungsschluessel[]; readonly belassen: Einstellungsschluessel[] } {
  const { vorher, nachher } = cs.einstellungen;
  const uebernommen: Einstellungsschluessel[] = [];
  const belassen: Einstellungsschluessel[] = [];
  const einordnen = (s: Einstellungsschluessel, vorherDa: boolean, nachherDa: boolean): void => {
    if (vorherDa) belassen.push(s);
    else if (nachherDa) uebernommen.push(s);
  };
  if (datei.buero !== null) einordnen({ art: 'buero' }, vorher.buero !== null, nachher.buero !== null);
  for (const p of datei.druckprofile)
    einordnen(
      { art: 'druckprofil', name: p.name },
      vorher.druckprofile.some((q) => q.name === p.name),
      nachher.druckprofile.some((q) => q.name === p.name),
    );
  for (const k of datei.kostengruppenbezeichnungen)
    einordnen(
      { art: 'kostengruppenbezeichnung', nummer: k.nummer },
      vorher.kostengruppenbezeichnungen.some((q) => q.nummer === k.nummer),
      nachher.kostengruppenbezeichnungen.some((q) => q.nummer === k.nummer),
    );
  return { uebernommen, belassen };
}
