// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 120: die reine Logik der Bautagebuchseite. Der Rand liest de-DE-Daten (N4) und baut den Eintrag für den Befehl
// `BautagebucheintragSetzen` (A5). Ein unlesbares Feld ist ein Feldfehler und kommt nie in einen Befehl. Summen rechnet
// `bauleitung` (`bautagebuchAuswerten`).

import { bautagebuchAuswerten } from '@tethys/bauleitung';
import type { VergleichsSpalte, VergleichsZeile } from '@tethys/ui-grid';
import type { Bautagebucheintrag, BautagebucheintragId, Ergebnis, ProjektId } from '@tethys/vertrag';
import { datumDe, datumLesen } from '../lv/kopfdaten';
import type { Feldfehlerkarte } from '../ui/feldfehler';
import { texte } from './texte';

export interface FirmaEntwurf {
  readonly firma: string;
  readonly anzahl: string;
}

/** Alle Felder als Text, wie sie im Formular stehen. */
export interface EintragEntwurf {
  readonly datum: string;
  readonly wetter: string;
  readonly temperaturMin: string;
  readonly temperaturMax: string;
  readonly arbeitskraefte: readonly FirmaEntwurf[];
  readonly geraete: string;
  readonly leistungen: string;
  readonly behinderungen: string;
  readonly vorkommnisse: string;
}

/** Schlüssel der Feldfehler: die Felder, dazu `firma-<i>` und `anzahl-<i>` je Zeile der Arbeitskräfte. */
export type Feldfehler = Feldfehlerkarte;

export function leererEintrag(heute: string, firmen: readonly string[] = []): EintragEntwurf {
  return {
    datum: datumDe(heute),
    wetter: '',
    temperaturMin: '',
    temperaturMax: '',
    arbeitskraefte: firmen.map((firma) => ({ firma, anzahl: '' })),
    geraete: '',
    leistungen: '',
    behinderungen: '',
    vorkommnisse: '',
  };
}

export function entwurfAusEintrag(e: Bautagebucheintrag): EintragEntwurf {
  const temp = (t: number | null): string => (t === null ? '' : String(t));
  return {
    datum: datumDe(e.datum),
    wetter: e.wetter.beschreibung ?? '',
    temperaturMin: temp(e.wetter.temperaturMin),
    temperaturMax: temp(e.wetter.temperaturMax),
    arbeitskraefte: e.arbeitskraefte.map((a) => ({ firma: a.firma, anzahl: String(a.anzahl) })),
    geraete: e.geraete ?? '',
    leistungen: e.leistungen ?? '',
    behinderungen: e.behinderungen ?? '',
    vorkommnisse: e.vorkommnisse ?? '',
  };
}

const leerZuNull = (t: string): string | null => (t.trim() === '' ? null : t.trim());

/** Ganze Grad Celsius, auch mit echtem Minuszeichen (so druckt sie das PDF); leer: keine Angabe. */
function temperaturLesen(text: string): Ergebnis<number | null, string> {
  const t = text.trim().replace('−', '-');
  if (t === '') return { ok: true, wert: null };
  if (!/^-?\d{1,3}$/.test(t)) return { ok: false, fehler: texte.eintrag.temperaturFehler };
  return { ok: true, wert: Number(t) };
}

/**
 * Liest den Entwurf als Eintrag. `id`: die Kennung des Eintrags (neu oder der bearbeitete). `bestand`: die übrigen Einträge
 * des Projekts; ein anderer Eintrag am selben Datum ist ein Feldfehler am Datum (höchstens einer je Projekt und Datum).
 */
export function eintragLesen(
  e: EintragEntwurf,
  id: BautagebucheintragId,
  projektId: ProjektId,
  bestand: readonly Pick<Bautagebucheintrag, 'id' | 'datum'>[],
): Ergebnis<Bautagebucheintrag, Feldfehler> {
  const fehler: Record<string, string> = {};
  const datum = datumLesen(e.datum);
  if (e.datum.trim() === '') fehler['datum'] = texte.eintrag.datumFehlt;
  else if (!datum.ok) fehler['datum'] = datum.fehler;
  else if (bestand.some((b) => b.id !== id && b.datum === datum.wert))
    fehler['datum'] = texte.eintrag.datumVergeben(datumDe(datum.wert));
  const min = temperaturLesen(e.temperaturMin);
  const max = temperaturLesen(e.temperaturMax);
  if (!min.ok) fehler['temperaturMin'] = min.fehler;
  if (!max.ok) fehler['temperaturMax'] = max.fehler;
  if (min.ok && max.ok && min.wert !== null && max.wert !== null && min.wert > max.wert)
    fehler['temperaturMin'] = texte.eintrag.temperaturReihenfolge;
  const kraefte: { firma: string; anzahl: number }[] = [];
  const gesehen = new Set<string>();
  e.arbeitskraefte.forEach((z, i) => {
    const firma = z.firma.trim();
    const leer = firma === '' && z.anzahl.trim() === '';
    if (leer) return; // eine nicht ausgefüllte Zeile fällt weg
    if (firma === '') fehler[`firma-${String(i)}`] = texte.eintrag.firmaFehlt;
    else if (gesehen.has(firma)) fehler[`firma-${String(i)}`] = texte.eintrag.firmaDoppelt;
    gesehen.add(firma);
    const anzahl = z.anzahl.trim();
    if (!/^\d{1,5}$/.test(anzahl)) fehler[`anzahl-${String(i)}`] = texte.eintrag.anzahlFehler;
    else kraefte.push({ firma, anzahl: Number(anzahl) });
  });
  if (Object.keys(fehler).length > 0 || !datum.ok || !min.ok || !max.ok) return { ok: false, fehler };
  return {
    ok: true,
    wert: {
      id,
      projektId,
      datum: datum.wert,
      wetter: { beschreibung: leerZuNull(e.wetter), temperaturMin: min.wert, temperaturMax: max.wert },
      arbeitskraefte: kraefte,
      geraete: leerZuNull(e.geraete),
      leistungen: leerZuNull(e.leistungen),
      behinderungen: leerZuNull(e.behinderungen),
      vorkommnisse: leerZuNull(e.vorkommnisse),
    },
  };
}

/** Köpfe je Tag über alle Einträge (Datum → Summe der Arbeitskräfte); gezählt von `bauleitung` (A2, Ticket 122). */
export function koepfeJeTag(eintraege: readonly Bautagebucheintrag[]): ReadonlyMap<string, number> {
  const tage = eintraege.map((e) => e.datum).sort();
  const erster = tage[0];
  const letzter = tage[tage.length - 1];
  if (erster === undefined || letzter === undefined) return new Map();
  return new Map(
    bautagebuchAuswerten(eintraege, erster, letzter).jeTag.map((t) => [t.datum, t.arbeitskraefte]),
  );
}

// --- Liste der Tage im Vergleichsgrid ----------------------------------------------------------------------------------

export const SPALTEN: readonly VergleichsSpalte[] = [
  { id: 'datum', kopf: 'Datum', breite: 110 },
  { id: 'wetter', kopf: 'Wetter', breite: 260 },
  { id: 'koepfe', kopf: 'Köpfe', ausrichtung: 'rechts', breite: 80 },
  { id: 'leistungen', kopf: 'Leistungen', breite: 360 },
];

export function wetterText(w: Bautagebucheintrag['wetter']): string {
  const teile: string[] = [];
  if (w.beschreibung !== null) teile.push(w.beschreibung);
  if (w.temperaturMin !== null && w.temperaturMax !== null)
    teile.push(`${grad(w.temperaturMin)} bis ${grad(w.temperaturMax)} °C`);
  else if (w.temperaturMax !== null) teile.push(`höchstens ${grad(w.temperaturMax)} °C`);
  else if (w.temperaturMin !== null) teile.push(`mindestens ${grad(w.temperaturMin)} °C`);
  return teile.length === 0 ? '–' : teile.join(', ');
}

const grad = (t: number): string => String(t).replace('-', '−');

/** Eine Zeile je Tag, nach Datum aufsteigend (wie das Repository); die Köpfe aus `koepfeJeTag`. */
export function tageZeilen(
  eintraege: readonly Bautagebucheintrag[],
  koepfe: ReadonlyMap<string, number> = koepfeJeTag(eintraege),
): VergleichsZeile[] {
  return [...eintraege]
    .sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0))
    .map((e) => ({
      id: e.id,
      art: 'position',
      tiefe: 0,
      hatUnterknoten: false,
      aufgeklappt: false,
      zellen: {
        datum: { text: datumDe(e.datum) },
        wetter: { text: wetterText(e.wetter) },
        koepfe: { text: String(koepfe.get(e.datum) ?? 0) },
        leistungen: { text: e.leistungen ?? '–' },
      },
    }));
}
