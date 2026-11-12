// SPDX-License-Identifier: AGPL-3.0-or-later
// Bautagebuch für einen Zeitraum (X4, Ticket 113): je Tag ein Abschnitt. Nichts wird gerechnet (A2); die Arbeitskräfte
// stehen je Firma, ohne Summe.

import type { Bautagebucheintrag } from '@tethys/vertrag';
import { KEINE_ANGABE, datumDe, druckdatum, ganzeZahl, textOderStrich } from './bericht';
import type { BerichtAbschnitt, Berichtsmodell } from './bericht';

export interface BautagebuchEingabe {
  readonly projekt: string;
  readonly eintraege: readonly Bautagebucheintrag[];
  /** Erster Tag des Zeitraums, `JJJJ-MM-TT`, einschließlich; fehlt: kein Beginn. */
  readonly von?: string;
  /** Letzter Tag des Zeitraums, einschließlich; fehlt: kein Ende. */
  readonly bis?: string;
  readonly datum?: string;
}

function wetterText(w: Bautagebucheintrag['wetter']): string {
  const teile: string[] = [];
  if (w.beschreibung !== null && w.beschreibung.trim() !== '') teile.push(w.beschreibung);
  if (w.temperaturMin !== null && w.temperaturMax !== null)
    teile.push(`${ganzeZahl(w.temperaturMin)} bis ${ganzeZahl(w.temperaturMax)} °C`);
  else if (w.temperaturMax !== null) teile.push(`höchstens ${ganzeZahl(w.temperaturMax)} °C`);
  else if (w.temperaturMin !== null) teile.push(`mindestens ${ganzeZahl(w.temperaturMin)} °C`);
  return teile.length === 0 ? KEINE_ANGABE : teile.join(', ');
}

function zeitraumText(von: string | undefined, bis: string | undefined): string {
  if (von !== undefined && bis !== undefined) return `${datumDe(von)} bis ${datumDe(bis)}`;
  if (von !== undefined) return `ab ${datumDe(von)}`;
  if (bis !== undefined) return `bis ${datumDe(bis)}`;
  return 'alle Einträge';
}

export function baueBautagebuchModell(e: BautagebuchEingabe): Berichtsmodell {
  const imZeitraum = e.eintraege
    .filter((t) => (e.von === undefined || t.datum >= e.von) && (e.bis === undefined || t.datum <= e.bis))
    .sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));
  const abschnitte: BerichtAbschnitt[] =
    imZeitraum.length === 0
      ? [{ ueberschrift: null, bloecke: [{ art: 'absatz', text: 'Keine Einträge im Zeitraum.' }] }]
      : imZeitraum.map((t) => ({
          ueberschrift: datumDe(t.datum),
          bloecke: [
            {
              art: 'angaben',
              felder: [
                { bezeichnung: 'Wetter', wert: wetterText(t.wetter) },
                ...(t.arbeitskraefte.length === 0
                  ? [{ bezeichnung: 'Arbeitskräfte', wert: KEINE_ANGABE }]
                  : []),
              ],
            },
            ...(t.arbeitskraefte.length === 0
              ? []
              : [
                  {
                    art: 'tabelle' as const,
                    spalten: [
                      { titel: 'Arbeitskräfte, Firma', breite: '*' as const },
                      { titel: 'Anzahl', breite: 50, rechts: true },
                    ],
                    zeilen: t.arbeitskraefte.map((a) => ({ zellen: [a.firma, String(a.anzahl)] })),
                  },
                ]),
            {
              art: 'angaben',
              felder: [
                { bezeichnung: 'Geräte', wert: textOderStrich(t.geraete) },
                { bezeichnung: 'Leistungen', wert: textOderStrich(t.leistungen) },
                { bezeichnung: 'Behinderungen', wert: textOderStrich(t.behinderungen) },
                { bezeichnung: 'Vorkommnisse', wert: textOderStrich(t.vorkommnisse) },
              ],
            },
          ],
        }));
  return {
    titel: 'Bautagebuch',
    kopf: [
      { bezeichnung: 'Projekt', wert: e.projekt },
      { bezeichnung: 'Zeitraum', wert: zeitraumText(e.von, e.bis) },
      { bezeichnung: 'Anzahl Einträge', wert: String(imZeitraum.length) },
    ],
    ...druckdatum(e.datum),
    abschnitte,
  };
}
