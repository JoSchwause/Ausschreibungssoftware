// SPDX-License-Identifier: AGPL-3.0-or-later
// Preisspiegel als Berichtsmodell (Ticket 141, E11; Glossar „Preisspiegel“): quer, Positionen × Bieter mit EP und GP, dazu
// Schätzpreis und die virtuellen Bieter Min, Mittel, Max, Ausreißer- und ABC-Kennzeichen, Titelsummen und die Summen der
// Bieter mit Nachlass, MwSt, Brutto und Rang. Alle Werte kommen aus dem Preisspiegel, den `vergabe` rechnet, und aus den
// Summen des LV (A2: hier wird nichts gerechnet); die App reicht ihn unverändert durch.

import { formatiereProzentDe } from '@tethys/dezimal';
import type {
  AngebotId,
  Betrag,
  Bieter,
  BieterId,
  Buero,
  Druckprofil,
  Einheitspreis,
  Gesamtsummen,
  GliederungId,
  Knoten,
  LvZustand,
  PositionId,
  Prozent,
} from '@tethys/vertrag';
import { KEINE_ANGABE, berichtSeite, druckdatum, wert, zelle } from './bericht';
import type {
  BerichtAbschnitt,
  BerichtSpalte,
  BerichtWert,
  BerichtZeile,
  BerichtZelle,
  Berichtsmodell,
} from './bericht';
import { Kopffelder, absenderZeilen, anschriftText, projektFelder } from './koepfe';
import type { ProjektKopf } from './koepfe';
import { datumDe, kinderNachReihenfolge } from './modell';

/** Preis eines Bieters an einer Position (wie `Bieterpreis` in `vergabe`). */
interface Bieterpreis {
  readonly angebotId: AngebotId;
  readonly kennzeichen: 'angeboten' | 'nullpreis' | 'nicht-angeboten' | 'zuschlagssatz-fehlt';
  readonly einheitspreis: Einheitspreis | null;
  /** GP; an einer Zuschlagsposition der Zuschlagsbetrag. */
  readonly gesamtpreis: Betrag | null;
  readonly ausreisser: 'hoch' | 'niedrig' | null;
  readonly zuschlag: { readonly satz: Prozent | null; readonly basisUnvollstaendig: boolean } | null;
}

/** Ein Vergleichswert (Schätzpreis, Min, Mittel, Max). */
interface Vergleichspreis {
  readonly einheitspreis: Einheitspreis | null;
  readonly gesamtpreis: Betrag | null;
}

/**
 * Was der Druck aus dem `Preisspiegel` von `vergabe` liest (gleich gebaut, die App reicht ihn unverändert durch). Der Typ
 * steht hier, weil Fachpakete einander nicht importieren (A3).
 */
interface Preisspiegeldaten {
  readonly einstellungen: {
    readonly ausreisserSchwelle: Prozent;
    readonly abcSchwelleA: Prozent;
    readonly abcSchwelleB: Prozent;
    readonly abcBezug: 'mittel' | 'schaetzpreis';
  };
  readonly zeilen: readonly {
    readonly positionId: PositionId;
    readonly gehtInSummeEin: boolean;
    readonly zuschlagsposition: boolean;
    readonly schaetzpreis: Vergleichspreis & {
      readonly zuschlag: { readonly satz: Prozent | null } | null;
    };
    /** Je Angebot, in der Reihenfolge der Angebote. */
    readonly bieter: readonly Bieterpreis[];
    readonly min: Vergleichspreis;
    readonly mittel: Vergleichspreis;
    readonly max: Vergleichspreis;
    readonly abcKlasse: 'A' | 'B' | 'C' | null;
  }[];
  readonly bietersummen: readonly {
    readonly angebotId: AngebotId;
    readonly bieterId: BieterId;
    readonly gesamt: Gesamtsummen;
    readonly nichtAngeboten: number;
    readonly rang: number;
  }[];
  readonly gliederungen: readonly {
    readonly gliederungId: GliederungId;
    readonly summen: readonly { readonly angebotId: AngebotId; readonly summe: Betrag }[];
  }[];
  readonly virtuelleSummen: {
    readonly min: Betrag;
    readonly mittel: Betrag;
    readonly max: Betrag;
    readonly schaetzpreis: Betrag;
  };
}

export interface PreisspiegelEingabe {
  /** Das Ausschreibungs-LV mit seinen Summen (Gliederung, OZ, Kurztext, Menge, Einheit, Schätzpreise). */
  readonly lv: LvZustand;
  readonly preisspiegel: Preisspiegeldaten;
  /** Die Bieter des Projekts (Name, Bieterangaben); zugeordnet über `bietersummen[].bieterId`. */
  readonly bieter: readonly Bieter[];
  readonly projekt?: ProjektKopf;
  readonly buero?: Buero | null;
  /** Druckdatum `JJJJ-MM-TT`. */
  readonly datum?: string;
  readonly druckprofil?: Druckprofil;
  /** Spalten wie am Bildschirm; Vorgabe beide `true`. */
  readonly spalten?: { readonly schaetzpreis?: boolean; readonly virtuelleBieter?: boolean };
}

/** So viele Bieter stehen nebeneinander auf einer Seite quer; weitere folgen in einer eigenen Tabelle. */
export const BIETER_JE_TABELLE = 5;
const PREISSPALTE = 52;

const LEER: BerichtWert = { text: '' };
const nurGp = (w: BerichtWert): BerichtZelle => ({ werte: [LEER, w] });

/** Der GP einer Position, die laut LV nicht in die Summe eingeht, steht in Klammern (wie im LV-Druck). */
function gp(g: Betrag | null, inSumme: boolean): BerichtWert {
  const w = wert.betrag(g);
  return inSumme || g === null ? w : { ...w, text: `(${w.text})` };
}

/** Satz einer Zuschlagsposition an der Stelle des EP. */
const satz = (s: Prozent | null): BerichtWert =>
  s === null
    ? { text: 'kein Satz' }
    : { text: `${formatiereProzentDe(s)} %`, zahl: { wert: s, art: 'prozent' } };

const KENNZEICHEN: Readonly<Record<Bieterpreis['kennzeichen'], string | null>> = {
  angeboten: null,
  nullpreis: 'Nullpreis',
  'nicht-angeboten': 'nicht angeboten',
  'zuschlagssatz-fehlt': 'Zuschlagssatz fehlt',
};

function bieterZelle(p: Bieterpreis | undefined, zuschlagsposition: boolean, inSumme: boolean): BerichtZelle {
  if (p === undefined) return { werte: [{ text: KEINE_ANGABE }, { text: KEINE_ANGABE }] };
  const hinweise = [
    KENNZEICHEN[p.kennzeichen],
    p.ausreisser === 'hoch' ? 'Ausreißer hoch' : p.ausreisser === 'niedrig' ? 'Ausreißer niedrig' : null,
    p.zuschlag?.basisUnvollstaendig === true ? 'Basis unvollständig' : null,
  ].filter((h): h is string => h !== null);
  const ep =
    zuschlagsposition && p.einheitspreis === null && p.zuschlag !== null
      ? satz(p.zuschlag.satz)
      : wert.einheitspreis(p.einheitspreis);
  return {
    werte: [ep, gp(p.gesamtpreis, inSumme)],
    ...(hinweise.length === 0 ? {} : { hinweis: hinweise.join(', ') }),
  };
}

function vergleichZelle(v: Vergleichspreis | undefined, inSumme: boolean): BerichtZelle {
  return v === undefined
    ? { werte: [{ text: KEINE_ANGABE }, { text: KEINE_ANGABE }] }
    : { werte: [wert.einheitspreis(v.einheitspreis), gp(v.gesamtpreis, inSumme)] };
}

const oz = (k: Knoten): string =>
  k.art === 'hinweis' ? '' : `${k.ordnungszahl ?? ''}${k.art === 'position' ? (k.ozIndex ?? '') : ''}`;

function legende(e: Preisspiegeldaten['einstellungen']): string {
  const bezug = e.abcBezug === 'mittel' ? 'des Mittels' : 'des Schätzpreises';
  return (
    'EP und GP in €. Beträge in Klammern gehen nicht in die Summe ein (Bedarf ohne Gesamtbetrag, Wahl). ' +
    `Ausreißer: Der Preis weicht um mehr als ${formatiereProzentDe(e.ausreisserSchwelle)} % vom Mittel ab. ` +
    `ABC-Klasse nach dem GP ${bezug}: A bis ${formatiereProzentDe(e.abcSchwelleA)} %, ` +
    `B bis ${formatiereProzentDe(e.abcSchwelleB)} % der Summe, C der Rest. ` +
    'Min, Mittel und Max bilden sich nur aus Preisen über 0,00; sie sind Vergleichswerte, keine Angebote.'
  );
}

/**
 * Das Berichtsmodell des Preisspiegels. `bieterJeTabelle`: wie viele Bieter nebeneinander stehen (Druck: `BIETER_JE_TABELLE`,
 * Excel: alle in einer Tabelle).
 */
export function bauePreisspiegelModell(
  e: PreisspiegelEingabe,
  bieterJeTabelle: number = BIETER_JE_TABELLE,
): Berichtsmodell {
  const { lv: zustand, preisspiegel: ps } = e;
  const lv = zustand.leistungsverzeichnis;
  const mitSchaetzpreis = e.spalten?.schaetzpreis ?? true;
  const mitVirtuellen = e.spalten?.virtuelleBieter ?? true;
  const namen = new Map(e.bieter.map((b) => [b.id as string, b]));
  const summen = ps.bietersummen;
  const bieterName = (id: BieterId): string => namen.get(id)?.name ?? KEINE_ANGABE;
  const zeileJePosition = new Map(ps.zeilen.map((z) => [z.positionId as string, z]));
  const gliederungJeId = new Map(ps.gliederungen.map((g) => [g.gliederungId as string, g]));
  const lvGliederung = new Map(zustand.summen.gliederungen.map((g) => [g.gliederungId as string, g.summe]));
  const mwst = `MwSt ${formatiereProzentDe(lv.mwstSatz)} %`;

  // --- Bieter nach Rang ---
  const nachRang = summen
    .map((s, i) => ({ s, i }))
    .sort((a, b) => a.s.rang - b.s.rang || a.i - b.i)
    .map(({ s }) => s);
  const bieterAbschnitt: BerichtAbschnitt = {
    ueberschrift: 'Bieter nach Rang',
    bloecke: [
      {
        art: 'tabelle',
        spalten: [
          { titel: 'Rang', breite: 30, rechts: true },
          { titel: 'Bieter', breite: 150 },
          { titel: 'Anschrift', breite: '*' },
          { titel: 'Netto', breite: 62, rechts: true },
          { titel: 'Nachlass', breite: 56, rechts: true },
          { titel: 'Netto nach Nachlass', breite: 62, rechts: true },
          { titel: mwst, breite: 56, rechts: true },
          { titel: 'Brutto', breite: 62, rechts: true },
          { titel: 'Nicht angeboten', breite: 50, rechts: true },
        ],
        zeilen: nachRang.map((s): BerichtZeile => ({
          zellen: [
            String(s.rang),
            bieterName(s.bieterId),
            anschriftText(namen.get(s.bieterId)?.angaben?.anschrift) || KEINE_ANGABE,
            zelle(wert.betrag(s.gesamt.netto)),
            zelle(wert.betrag(s.gesamt.nachlass)),
            zelle(wert.betrag(s.gesamt.nettoNachNachlass)),
            zelle(wert.betrag(s.gesamt.mwst)),
            zelle(wert.betrag(s.gesamt.brutto)),
            String(s.nichtAngeboten),
          ],
        })),
      },
    ],
  };

  // --- Positionen × Bieter, in Gruppen von `bieterJeTabelle` ---
  const kinder = kinderNachReihenfolge(lv.knoten);
  const gruppen: number[][] = [];
  for (let i = 0; i < summen.length; i += Math.max(1, bieterJeTabelle))
    gruppen.push(summen.slice(i, i + Math.max(1, bieterJeTabelle)).map((_, j) => i + j));
  if (gruppen.length === 0) gruppen.push([]);
  const hatBedarf = summen.some((s) => s.gesamt.summeBedarfOhneGesamtbetrag !== undefined);
  const hatWahl = summen.some((s) => s.gesamt.summeWahl !== undefined);

  const positionsTabelle = (
    indizes: readonly number[],
  ): Extract<BerichtAbschnitt['bloecke'][number], { art: 'tabelle' }> => {
    const preisspalte = (titel: string): BerichtSpalte => ({
      titel,
      breite: PREISSPALTE,
      rechts: true,
      teile: ['EP', 'GP'],
    });
    const spalten: BerichtSpalte[] = [
      { titel: 'OZ', breite: 44 },
      { titel: 'Kurztext', breite: '*' },
      { titel: 'Menge', breite: 40, rechts: true },
      { titel: 'Einh.', breite: 24 },
      { titel: 'ABC', breite: 20 },
      ...(mitSchaetzpreis ? [preisspalte('Schätzpreis')] : []),
      ...indizes.map((i) => preisspalte(bieterName(summen[i]?.bieterId ?? ('' as BieterId)))),
      ...(mitVirtuellen ? ['Min', 'Mittel', 'Max'].map(preisspalte) : []),
    ];
    const leer = (): BerichtZelle => ({ werte: [LEER, LEER] });
    /** Eine Summenzeile: Bezeichnung im Kurztext, Werte nur im GP-Teil. */
    const summenZeile = (
      bezeichnung: string,
      schaetz: BerichtWert | null,
      jeBieter: (i: number) => BerichtWert,
      virtuell: readonly [BerichtWert, BerichtWert, BerichtWert] | null,
    ): BerichtZeile => ({
      fett: true,
      zellen: [
        '',
        bezeichnung,
        '',
        '',
        '',
        ...(mitSchaetzpreis ? [schaetz === null ? leer() : nurGp(schaetz)] : []),
        ...indizes.map((i) => nurGp(jeBieter(i))),
        ...(mitVirtuellen ? (virtuell ?? [LEER, LEER, LEER]).map(nurGp) : []),
      ],
    });
    const zeilen: BerichtZeile[] = [];
    const besuche = (elternId: string, ebene: number): void => {
      for (const k of kinder.get(elternId) ?? []) {
        if (k.art === 'los' || k.art === 'titel') {
          zeilen.push({ fett: true, einrueckung: ebene - 1, zellen: [oz(k), k.kurztext] });
          besuche(k.id, ebene + 1);
          const g = gliederungJeId.get(k.id);
          const jeAngebot = new Map((g?.summen ?? []).map((s) => [s.angebotId as string, s.summe]));
          zeilen.push(
            summenZeile(
              `Summe ${oz(k)} ${k.kurztext}`,
              wert.betrag(lvGliederung.get(k.id) ?? null),
              (i) => wert.betrag(jeAngebot.get(summen[i]?.angebotId ?? '') ?? null),
              null,
            ),
          );
        } else if (k.art === 'position') {
          const z = zeileJePosition.get(k.id);
          const inSumme = z?.gehtInSummeEin ?? true;
          const zuschlag = z?.zuschlagsposition ?? k.zuschlag !== null;
          const schaetz: BerichtZelle =
            z === undefined
              ? { werte: [{ text: KEINE_ANGABE }, { text: KEINE_ANGABE }] }
              : zuschlag && z.schaetzpreis.einheitspreis === null && z.schaetzpreis.zuschlag !== null
                ? { werte: [satz(z.schaetzpreis.zuschlag.satz), gp(z.schaetzpreis.gesamtpreis, inSumme)] }
                : vergleichZelle(z.schaetzpreis, inSumme);
          const merkmal = inSumme ? undefined : 'nicht in der Summe';
          zeilen.push({
            zellen: [
              oz(k),
              merkmal === undefined ? k.kurztext : { werte: [{ text: k.kurztext }], hinweis: merkmal },
              zelle(wert.menge(k.menge)),
              k.einheit ?? '',
              z?.abcKlasse ?? '',
              ...(mitSchaetzpreis ? [schaetz] : []),
              ...indizes.map((i) =>
                z === undefined
                  ? bieterZelle(undefined, zuschlag, inSumme)
                  : bieterZelle(
                      z.bieter.find((p) => p.angebotId === summen[i]?.angebotId),
                      zuschlag,
                      inSumme,
                    ),
              ),
              ...(mitVirtuellen ? [z?.min, z?.mittel, z?.max].map((v) => vergleichZelle(v, inSumme)) : []),
            ],
          });
        }
      }
    };
    besuche(lv.id, 1);
    const v = ps.virtuelleSummen;
    const gesamt = (f: (g: Gesamtsummen) => Betrag | undefined) => (i: number) =>
      wert.betrag(f(summen[i]?.gesamt ?? ({} as Gesamtsummen)) ?? null);
    zeilen.push(
      summenZeile(
        'Netto',
        wert.betrag(v.schaetzpreis),
        gesamt((g) => g.netto),
        [wert.betrag(v.min), wert.betrag(v.mittel), wert.betrag(v.max)],
      ),
      summenZeile(
        'Nachlass',
        null,
        gesamt((g) => g.nachlass),
        null,
      ),
      summenZeile(
        'Netto nach Nachlass',
        null,
        gesamt((g) => g.nettoNachNachlass),
        null,
      ),
      summenZeile(
        mwst,
        null,
        gesamt((g) => g.mwst),
        null,
      ),
      summenZeile(
        'Brutto',
        null,
        gesamt((g) => g.brutto),
        null,
      ),
      ...(hatBedarf
        ? [
            summenZeile(
              'Bedarfssumme (nicht im Netto)',
              null,
              gesamt((g) => g.summeBedarfOhneGesamtbetrag),
              null,
            ),
          ]
        : []),
      ...(hatWahl
        ? [
            summenZeile(
              'Wahlsumme (nicht im Netto)',
              null,
              gesamt((g) => g.summeWahl),
              null,
            ),
          ]
        : []),
      summenZeile('Rang', null, (i) => ({ text: String(summen[i]?.rang ?? KEINE_ANGABE) }), null),
    );
    return { art: 'tabelle', spalten, zeilen };
  };

  const deckblatt = e.druckprofil?.deckblatt ?? true;
  const kopf = new Kopffelder();
  if (deckblatt) {
    kopf.felder.push(...projektFelder(e.projekt));
    kopf.feld('Leistungsverzeichnis', lv.name).feld('Vergabenummer', lv.auftraggeber?.vergabenummer);
    const eroeffnung = lv.vergabeinformationen?.eroeffnungsdatum;
    kopf.feld('Eröffnung', eroeffnung === null || eroeffnung === undefined ? null : datumDe(eroeffnung));
    kopf.feld('Angebote', String(summen.length));
  }
  return {
    titel: 'Preisspiegel',
    absender: deckblatt ? absenderZeilen(e.buero) : [],
    kopf: kopf.felder,
    ...druckdatum(e.datum),
    seite: berichtSeite(e.druckprofil, 'quer', lv.name),
    abschnitte: [
      bieterAbschnitt,
      {
        ueberschrift: 'Positionen',
        bloecke: [
          ...gruppen.map(positionsTabelle),
          { art: 'absatz', text: legende(ps.einstellungen), klein: true },
        ],
      },
    ],
  };
}
