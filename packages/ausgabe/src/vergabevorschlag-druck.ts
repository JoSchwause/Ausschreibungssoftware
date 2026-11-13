// SPDX-License-Identifier: AGPL-3.0-or-later
// Vergabevorschlag als Berichtsmodell (Ticket 141, E11): die Rangfolge der Angebote mit ihren geprüften Summen (die
// Bietersummen, die `vergabe` aus den Einheitspreisen der Angebote neu rechnet), der vorgeschlagene Bieter mit seinen
// Angaben, die Begründung als freier Text der Eingabe, das Büro als Absender und das Projekt. Hier wird nichts gerechnet
// (A2); welcher Bieter vorgeschlagen wird, entscheidet der Mensch, nicht der Druck.

import { formatiereProzentDe } from '@tethys/dezimal';
import type { Bieter, BieterId, Buero, Druckprofil, LvZustand } from '@tethys/vertrag';
import { KEINE_ANGABE, berichtSeite, druckdatum, euro, wert, zelle } from './bericht';
import type { BerichtAbschnitt, BerichtBlock, Berichtsmodell } from './bericht';
import { Kopffelder, absenderZeilen, bieterFelder, projektFelder } from './koepfe';
import type { ProjektKopf } from './koepfe';
import { datumDe } from './modell';
import type { PreisspiegelEingabe } from './preisspiegel-druck';

export interface VergabevorschlagEingabe {
  /** Das Ausschreibungs-LV (Name, Vergabenummer, Eröffnung, MwSt-Satz). */
  readonly lv: LvZustand;
  /** Die Bietersummen mit Rang aus dem Preisspiegel von `vergabe`. */
  readonly bietersummen: PreisspiegelEingabe['preisspiegel']['bietersummen'];
  /** Die Bieter des Projekts (Name, Bieterangaben). */
  readonly bieter: readonly Bieter[];
  /** Der Bieter, an den der Auftrag gehen soll; `null`: noch keiner ausgewählt. */
  readonly vorgeschlagen: BieterId | null;
  /** Die Begründung, wie eingegeben; eine Leerzeile trennt Absätze. */
  readonly begruendung: string;
  readonly projekt?: ProjektKopf;
  readonly buero?: Buero | null;
  /** Druckdatum `JJJJ-MM-TT`. */
  readonly datum?: string;
  readonly druckprofil?: Druckprofil;
}

const positionen = (n: number): string =>
  `${String(n)} ${n === 1 ? 'Position' : 'Positionen'} nicht angeboten`;

/** Absätze des freien Texts: Leerzeilen trennen, Zeilenumbrüche im Absatz bleiben. */
function absaetze(text: string): BerichtBlock[] {
  const teile = text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter((t) => t !== '');
  return teile.length === 0
    ? [{ art: 'absatz', text: KEINE_ANGABE }]
    : teile.map((t): BerichtBlock => ({ art: 'absatz', text: t }));
}

export function baueVergabevorschlagModell(e: VergabevorschlagEingabe): Berichtsmodell {
  const lv = e.lv.leistungsverzeichnis;
  const bieter = new Map(e.bieter.map((b) => [b.id as string, b]));
  const name = (id: BieterId): string => bieter.get(id)?.name ?? KEINE_ANGABE;
  const nachRang = e.bietersummen
    .map((s, i) => ({ s, i }))
    .sort((a, b) => a.s.rang - b.s.rang || a.i - b.i)
    .map(({ s }) => s);
  const mwst = `MwSt ${formatiereProzentDe(lv.mwstSatz)} %`;

  const rangfolge: BerichtAbschnitt = {
    ueberschrift: 'Rangfolge der Angebote',
    bloecke: [
      {
        art: 'tabelle',
        spalten: [
          { titel: 'Rang', breite: 28, rechts: true },
          { titel: 'Bieter', breite: '*' },
          { titel: 'Netto', breite: 60, rechts: true },
          { titel: 'Nachlass', breite: 50, rechts: true },
          { titel: 'Netto nach Nachlass', breite: 60, rechts: true },
          { titel: mwst, breite: 52, rechts: true },
          { titel: 'Brutto', breite: 60, rechts: true },
        ],
        zeilen: nachRang.map((s) => {
          const hinweise = [
            ...(s.nichtAngeboten > 0 ? [positionen(s.nichtAngeboten)] : []),
            ...(s.bieterId === e.vorgeschlagen ? ['vorgeschlagen'] : []),
          ];
          return {
            ...(s.bieterId === e.vorgeschlagen ? { fett: true } : {}),
            zellen: [
              String(s.rang),
              hinweise.length === 0
                ? name(s.bieterId)
                : { werte: [{ text: name(s.bieterId) }], hinweis: hinweise.join(', ') },
              zelle(wert.betrag(s.gesamt.netto)),
              zelle(wert.betrag(s.gesamt.nachlass)),
              zelle(wert.betrag(s.gesamt.nettoNachNachlass)),
              zelle(wert.betrag(s.gesamt.mwst)),
              zelle(wert.betrag(s.gesamt.brutto)),
            ],
          };
        }),
      },
      {
        art: 'absatz',
        klein: true,
        text:
          'Beträge in €. Die Summen sind rechnerisch geprüft: aus den Einheitspreisen der Angebote neu gerechnet, mit dem ' +
          'Nachlass des Angebots und dem MwSt-Satz des Leistungsverzeichnisses. Rang nach Netto nach Nachlass.',
      },
    ],
  };

  const gewaehlt = e.vorgeschlagen;
  const summe = e.bietersummen.find((s) => s.bieterId === gewaehlt);
  const vorschlag: BerichtAbschnitt = {
    ueberschrift: 'Vorschlag',
    bloecke:
      gewaehlt === null
        ? [{ art: 'absatz', text: 'Es ist noch kein Bieter ausgewählt.' }]
        : [
            {
              art: 'absatz',
              text:
                `Es wird vorgeschlagen, den Auftrag an ${name(gewaehlt)} zu vergeben` +
                (summe === undefined
                  ? ' (ohne Angebot im Preisspiegel).'
                  : ` (Rang ${String(summe.rang)}, Angebotssumme ${euro(summe.gesamt.brutto)} brutto).`),
            },
            ...(() => {
              const felder = bieterFelder(bieter.get(gewaehlt)?.angaben);
              return felder.length === 0 ? [] : [{ art: 'angaben' as const, felder }];
            })(),
          ],
  };

  const deckblatt = e.druckprofil?.deckblatt ?? true;
  const kopf = new Kopffelder();
  if (deckblatt) {
    kopf.felder.push(...projektFelder(e.projekt));
    kopf.feld('Leistungsverzeichnis', lv.name).feld('Vergabenummer', lv.auftraggeber?.vergabenummer);
    const eroeffnung = lv.vergabeinformationen?.eroeffnungsdatum;
    kopf.feld('Eröffnung', eroeffnung === null || eroeffnung === undefined ? null : datumDe(eroeffnung));
    kopf.feld('Angebote', String(e.bietersummen.length));
  }
  const datum = druckdatum(e.datum);
  const aufgestellt = [e.buero?.name, datum.datum].filter((t): t is string => t !== null && t !== undefined);
  return {
    titel: 'Vergabevorschlag',
    absender: deckblatt ? absenderZeilen(e.buero) : [],
    kopf: kopf.felder,
    ...datum,
    seite: berichtSeite(e.druckprofil, 'hoch', lv.name),
    abschnitte: [
      rangfolge,
      vorschlag,
      { ueberschrift: 'Begründung', bloecke: absaetze(e.begruendung) },
      {
        ueberschrift: null,
        bloecke: [
          ...(aufgestellt.length === 0
            ? []
            : [{ art: 'absatz' as const, text: `Aufgestellt: ${aufgestellt.join(', ')}` }]),
          { art: 'absatz', text: 'Unterschrift: ______________________________' },
        ],
      },
    ],
  };
}
