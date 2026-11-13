// SPDX-License-Identifier: AGPL-3.0-or-later
// Aufmaßblatt als Berichtsmodell (Ticket 141, E11; Glossar „Aufmaßblatt“, „Mengenansatz“): je Position des Blatts die Menge
// und darunter die Zeilen ihres Mengenansatzes mit REB-Formel, Ausdruck (wie eingegeben) und Zeilenergebnis. Die Ergebnisse
// rechnet `mengen`, die App reicht sie durch (A2: hier wird nichts gerechnet). Die Positionen stehen in der Reihenfolge des
// Auftrags-LV; eine Zeile ohne Position dort steht am Ende, sichtbar (Q5).

import type {
  Aufmass,
  Aufmassposition,
  AuftragsLvZustand,
  Buero,
  Druckprofil,
  Knoten,
  Menge,
  PositionId,
} from '@tethys/vertrag';
import { KEINE_ANGABE, befundZeile, berichtSeite, datumOderStrich, druckdatum, wert, zelle } from './bericht';
import type { BerichtZeile, Befundtext, Berichtsmodell } from './bericht';
import { Kopffelder, absenderZeilen, projektFelder, verbinde } from './koepfe';
import type { ProjektKopf } from './koepfe';
import { kinderNachReihenfolge } from './modell';

export interface AufmassblattEingabe {
  readonly aufmass: Aufmass;
  /** Das Auftrags-LV des Blatts (OZ, Kurztext, Einheit, Reihenfolge, Auftragnehmer). */
  readonly auftragsLv: AuftragsLvZustand;
  /**
   * Die Zeilenergebnisse der Mengenansätze, wie `mengen` sie rechnet (`Mengenansatzergebnis.zeilen`), je Position; `menge`
   * `null`: die Zeile hat einen Fehler. Fehlt eine Position oder Zeile, steht dort ein Strich.
   */
  readonly ergebnisse?: readonly {
    readonly positionId: PositionId;
    readonly zeilen: readonly { readonly zeile: number; readonly menge: Menge | null }[];
  }[];
  /** Die Befunde des Blatts mit den Texten der Seite; leer oder fehlt: kein Abschnitt. */
  readonly befundtexte?: readonly Befundtext[];
  readonly projekt?: ProjektKopf;
  readonly buero?: Buero | null;
  /** Druckdatum `JJJJ-MM-TT`. */
  readonly datum?: string;
  readonly druckprofil?: Druckprofil;
}

/** Positionen des Baums in Dokumentreihenfolge. */
export function positionenInReihenfolge(knoten: readonly Knoten[], wurzelId: string): Knoten[] {
  const kinder = kinderNachReihenfolge(knoten);
  const folge: Knoten[] = [];
  const besuche = (id: string): void => {
    for (const k of kinder.get(id) ?? []) {
      if (k.art === 'position') folge.push(k);
      besuche(k.id);
    }
  };
  besuche(wurzelId);
  return folge;
}

export const ozText = (k: Knoten): string =>
  k.art === 'hinweis' ? '' : `${k.ordnungszahl ?? ''}${k.art === 'position' ? (k.ozIndex ?? '') : ''}`;

export function baueAufmassblattModell(e: AufmassblattEingabe): Berichtsmodell {
  const a = e.aufmass;
  const alv = e.auftragsLv.auftragsLeistungsverzeichnis;
  const ergebnisse = new Map(
    (e.ergebnisse ?? []).map((r) => [
      r.positionId as string,
      new Map(r.zeilen.map((z) => [z.zeile, z.menge])),
    ]),
  );
  const reihenfolge = positionenInReihenfolge(alv.knoten, alv.id);
  const rang = new Map(reihenfolge.map((k, i) => [k.id as string, i]));
  const knoten = new Map(reihenfolge.map((k) => [k.id as string, k]));
  const zeilen = [...a.positionen]
    .map((p, i) => ({ p, i }))
    .sort(
      (x, y) =>
        (rang.get(x.p.positionId) ?? Number.MAX_SAFE_INTEGER) -
          (rang.get(y.p.positionId) ?? Number.MAX_SAFE_INTEGER) || x.i - y.i,
    )
    .flatMap(({ p }) => positionsZeilen(p, knoten.get(p.positionId), ergebnisse.get(p.positionId)));

  const deckblatt = e.druckprofil?.deckblatt ?? true;
  const kopf = new Kopffelder()
    .feld('Bezeichnung', a.bezeichnung)
    .feld('Aufgemessen am', a.datum === null ? null : datumOderStrich(a.datum))
    .feld('Auftrags-LV', alv.name);
  if (deckblatt) {
    const an = alv.auftragnehmer;
    if (an) kopf.feld('Auftragnehmer', verbinde([an.name, an.strasse, verbinde([an.plz, an.ort], ' ')]));
    kopf.felder.push(...projektFelder(e.projekt));
  }
  const befunde = e.befundtexte ?? [];
  return {
    titel: `Aufmaßblatt ${String(a.nummer)}`,
    absender: deckblatt ? absenderZeilen(e.buero) : [],
    kopf: kopf.felder,
    ...druckdatum(e.datum),
    seite: berichtSeite(e.druckprofil, 'hoch', alv.name),
    abschnitte: [
      {
        ueberschrift: 'Mengen',
        bloecke: [
          {
            art: 'tabelle',
            spalten: [
              { titel: 'OZ', breite: 50 },
              { titel: 'Kurztext', breite: '*' },
              { titel: 'Zeile', breite: 26, rechts: true },
              { titel: 'Formel', breite: 30, rechts: true },
              { titel: 'Ansatz', breite: 130 },
              { titel: 'Ergebnis', breite: 50, rechts: true },
              { titel: 'Menge', breite: 54, rechts: true },
              { titel: 'Einh.', breite: 26 },
            ],
            zeilen,
          },
          {
            art: 'absatz',
            klein: true,
            text:
              'Ergebnis: das Ergebnis der Ansatzzeile, auf 3 Stellen gerundet. Menge: die Menge dieses Blatts zur Position; ' +
              'eine Menge ohne Mengenansatz ist von Hand gesetzt.',
          },
        ],
      },
      ...(befunde.length === 0
        ? []
        : [
            {
              ueberschrift: 'Befunde',
              bloecke: [{ art: 'liste' as const, punkte: befunde.map(befundZeile) }],
            },
          ]),
    ],
  };
}

function positionsZeilen(
  p: Aufmassposition,
  k: Knoten | undefined,
  ergebnisse: ReadonlyMap<number, Menge | null> | undefined,
): BerichtZeile[] {
  const position = k?.art === 'position' ? k : undefined;
  const menge =
    p.menge === null
      ? { werte: [{ text: KEINE_ANGABE }], hinweis: 'keine Menge' }
      : zelle(wert.menge(p.menge));
  const ansatz = p.mengenansatz;
  const kopf: BerichtZeile = {
    fett: true,
    zellen: [
      position === undefined ? KEINE_ANGABE : ozText(position),
      position === undefined ? 'Position nicht im Auftrags-LV' : position.kurztext,
      '',
      '',
      ansatz === null ? 'ohne Mengenansatz' : '',
      '',
      menge,
      position?.einheit ?? '',
    ],
  };
  const zeilen = (ansatz ?? []).map((z): BerichtZeile => {
    const ergebnis = ergebnisse?.get(z.zeile);
    return {
      zellen: [
        '',
        '',
        String(z.zeile),
        String(z.formel),
        z.variable === null ? z.ausdruck : `${z.variable} = ${z.ausdruck}`,
        ergebnis === undefined ? KEINE_ANGABE : ergebnis === null ? 'Fehler' : zelle(wert.menge(ergebnis)),
        '',
        '',
      ],
    };
  });
  return [kopf, ...zeilen];
}
