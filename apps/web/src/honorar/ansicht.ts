// SPDX-License-Identifier: AGPL-3.0-or-later
// Das Honorarergebnis als Tabellenzeilen für die Seite (Ticket 119): nichts wird gerechnet, nur formatiert (N4); die Zahlen
// kommen aus `honorarBerechnen`. Je Objekt die Herleitung (§ 33), die Tafelzeilen, das Honorar, die Phasen und die Zuschläge.

import { formatiereBetragDe, formatiereProzentDe } from '@tethys/dezimal';
import { LEISTUNGSBILDER } from '@tethys/honorar';
import type { Honorarbefundcode, Leistungsbilddaten } from '@tethys/honorar';
import type {
  Betrag,
  Honorarberechnung,
  Honorarergebnis,
  Honorarobjekt,
  Objektergebnis,
  Prozent,
  Pruefbefund,
} from '@tethys/vertrag';
import { BEFUNDTEXT, FELD_TEXT, LEISTUNGSBILD_TEXT, befundTexte, texte } from './texte';

const t = texte.editor;

export interface Zeile {
  readonly bezeichnung: string;
  readonly wert: string;
}

export interface PhasenZeile {
  readonly phase: string;
  readonly anteil: string;
  readonly betrag: string;
}

export interface ObjektAnsicht {
  readonly titel: string;
  /** Die Zeilen der Herleitung nach § 33; `null` bei anrechenbaren Kosten von Hand. */
  readonly herleitung: readonly Zeile[] | null;
  /** Anrechenbare Kosten, Tafelzeilen (von, bis) und Spanne; `null` ohne Tafelwert. */
  readonly tafel: readonly Zeile[] | null;
  readonly anrechenbareKosten: string | null;
  readonly honorar: string | null;
  readonly phasen: readonly PhasenZeile[];
  readonly grundhonorar: string;
  readonly umbauzuschlag: string;
  readonly berechnet: boolean;
}

export const euro = (b: Betrag): string => `${formatiereBetragDe(b)} €`;
const prozent = (p: Prozent): string => `${formatiereProzentDe(p)} %`;

function objekt(o: Objektergebnis, nr: number): ObjektAnsicht {
  const h = o.herleitung;
  const z = t.zeilen;
  return {
    titel: t.ergebnisObjekt(nr),
    herleitung:
      h === null
        ? null
        : [
            { bezeichnung: z.kg300, wert: euro(h.kg300) },
            { bezeichnung: z.weitereKosten, wert: euro(h.weitereKosten) },
            { bezeichnung: z.sonstige, wert: euro(h.sonstigeAnrechenbareKosten) },
            { bezeichnung: z.kg400, wert: euro(h.kg400) },
            { bezeichnung: z.grenze, wert: euro(h.grenzeTechnischeAnlagen) },
            { bezeichnung: z.kg400Voll, wert: euro(h.kg400Voll) },
            { bezeichnung: z.kg400Haelfte, wert: euro(h.kg400Haelfte) },
            { bezeichnung: z.bausubstanz, wert: euro(h.mitzuverarbeitendeBausubstanz) },
            { bezeichnung: z.anrechenbar, wert: euro(h.anrechenbareKosten) },
          ],
    tafel:
      o.tafel === null
        ? null
        : [
            {
              bezeichnung: t.tafelUnten(formatiereBetragDe(o.tafel.zeileUnten.anrechenbareKosten)),
              wert: spanneText(o.tafel.zeileUnten.spannen[o.honorarzone]),
            },
            {
              bezeichnung: t.tafelOben(formatiereBetragDe(o.tafel.zeileOben.anrechenbareKosten)),
              wert: spanneText(o.tafel.zeileOben.spannen[o.honorarzone]),
            },
            { bezeichnung: t.tafelSpanne, wert: spanneText(o.tafel.spanne) },
          ],
    anrechenbareKosten: o.anrechenbareKosten === null ? null : euro(o.anrechenbareKosten),
    honorar: o.honorar === null ? null : euro(o.honorar),
    phasen: o.phasen.map((p) => ({
      phase: `LPH ${String(p.nummer)} ${p.name}`,
      anteil: `${formatiereProzentDe(p.anteil)} %`,
      betrag: euro(p.betrag),
    })),
    grundhonorar: euro(o.grundhonorar),
    umbauzuschlag: euro(o.umbauzuschlag),
    berechnet: o.honorar !== null,
  };
}

function spanneText(s: { readonly von: Betrag; readonly bis: Betrag } | undefined): string {
  return s === undefined ? '–' : `${t.von} ${euro(s.von)} ${t.bis} ${euro(s.bis)}`;
}

export interface ErgebnisAnsicht {
  readonly objekte: readonly ObjektAnsicht[];
  readonly summen: readonly Zeile[];
}

export function ergebnisAnsicht(e: Honorarergebnis): ErgebnisAnsicht {
  const z = t.summenZeilen;
  return {
    objekte: e.objekte.map((o, i) => objekt(o, i + 1)),
    summen: [
      { bezeichnung: z.grundhonorar, wert: euro(e.grundhonorar) },
      { bezeichnung: z.umbauzuschlaege, wert: euro(e.umbauzuschlaege) },
      { bezeichnung: z.nebenkosten, wert: euro(e.nebenkosten) },
      { bezeichnung: z.netto, wert: euro(e.netto) },
      { bezeichnung: z.mwst, wert: euro(e.mwst) },
      { bezeichnung: z.brutto, wert: euro(e.brutto) },
    ],
  };
}

export interface BefundAnsicht {
  readonly schwere: 'fehler' | 'warnung';
  /** Wo: `Objekt 2` und das Feld, nur das Feld (ganze Berechnung) oder `null` (kein Ort). */
  readonly ort: string | null;
  readonly text: string;
  readonly code: string;
}

/** Woraus die Texte ihre Werte nehmen: die Eingabe und das Ergebnis, zu denen die Befunde gehören. */
export interface Befundkontext {
  readonly berechnung: Pick<Honorarberechnung, 'objekte' | 'nebenkosten' | 'mwstSatz'>;
  readonly ergebnis: Pick<Honorarergebnis, 'objekte'>;
}

/** Das Honorarobjekt eines Befunds: Stelle aus dem Pfad `/objekte[n]` (ab 1); `null`: Befund zur ganzen Berechnung. */
function objektStelle(b: Pruefbefund): number | null {
  const m = b.ort.pfad === undefined ? null : /^\/objekte\[(\d+)\]$/.exec(b.ort.pfad);
  return m?.[1] === undefined ? null : Number(m[1]);
}

const leistungsbildDaten = (o: Honorarobjekt | undefined): Leistungsbilddaten | undefined =>
  o !== undefined && Object.hasOwn(LEISTUNGSBILDER, o.leistungsbild)
    ? LEISTUNGSBILDER[o.leistungsbild]
    : undefined;

/** Name des Leistungsbilds; ein unbekannter Wert (aus einer Datei) steht in Anführungszeichen. */
function leistungsbildName(o: Honorarobjekt | undefined): string | null {
  if (o === undefined) return null;
  return Object.hasOwn(LEISTUNGSBILD_TEXT, o.leistungsbild)
    ? LEISTUNGSBILD_TEXT[o.leistungsbild]
    : `„${o.leistungsbild}“`;
}

/** Der Text eines Befunds aus Code, Ort und den Werten des Objekts (N4: hier wird nur formatiert, nichts geprüft). */
function befundText(b: Pruefbefund, k: Befundkontext, stelle: number | null): string {
  const o = stelle === null ? undefined : k.berechnung.objekte[stelle - 1];
  const r = stelle === null ? undefined : k.ergebnis.objekte[stelle - 1];
  const daten = leistungsbildDaten(o);
  const tafel = daten?.honorartafel;
  const t = befundTexte;
  const code = b.code as Honorarbefundcode;
  switch (code) {
    case 'kostenermittlung-unbekannt':
    case 'kostenberechnung-vorhanden':
    case 'kostenermittlungsstufe-abweichend':
      return BEFUNDTEXT[code];
    case 'keine-honorartafel':
      return t.keineHonorartafel(leistungsbildName(o));
    case 'herleitung-nicht-anwendbar':
      return t.herleitungNichtAnwendbar(leistungsbildName(o));
    case 'ausserhalb-honorartafel': {
      const erste = tafel?.zeilen[0]?.anrechenbareKosten;
      const letzte = tafel?.zeilen[tafel.zeilen.length - 1]?.anrechenbareKosten;
      return t.ausserhalbHonorartafel(
        r?.anrechenbareKosten == null ? null : euro(r.anrechenbareKosten),
        tafel === undefined || erste === undefined || letzte === undefined
          ? null
          : { vorschrift: tafel.quelle.vorschrift, von: euro(erste), bis: euro(letzte) },
      );
    }
    case 'honorarzone-unbekannt':
      return t.honorarzoneUnbekannt(
        o === undefined ? null : o.honorarzone,
        tafel === undefined
          ? null
          : { vorschrift: tafel.quelle.vorschrift, zonen: tafel.honorarzonen.join(', ') },
      );
    case 'leistungsphase-unbekannt':
      return t.leistungsphaseUnbekannt(leistungsbildName(o));
    case 'leistungsphase-doppelt':
      return t.leistungsphaseDoppelt;
    case 'anteil-abweichend':
      return t.anteilAbweichend(daten === undefined ? null : daten.quelleLeistungsphasen.vorschrift);
    case 'honorarsatz-ausserhalb-spanne':
      return t.honorarsatzAusserhalb(o === undefined ? null : prozent(o.honorarsatz));
    case 'umbauzuschlag-ueber-grenze':
      return t.umbauzuschlagUeberGrenze(
        o?.umbauzuschlagssatz == null ? null : prozent(o.umbauzuschlagssatz),
        daten === undefined
          ? null
          : { satz: prozent(daten.umbauzuschlagBis), vorschrift: daten.quelleUmbauzuschlag.vorschrift },
      );
    case 'wert-negativ':
      return negativText(b.ort.feld, o, k);
    case 'mehrere-objekte':
      return t.mehrereObjekte(k.berechnung.objekte.length);
    default:
      return t.unbekannt;
  }
}

function negativText(feld: string | undefined, o: Honorarobjekt | undefined, k: Befundkontext): string {
  const n = befundTexte.negativ;
  const nk = k.berechnung.nebenkosten;
  switch (feld) {
    case 'anrechenbareKosten':
      return n.anrechenbareKosten;
    case 'umbauzuschlagssatz':
      return n.umbauzuschlag(o?.umbauzuschlagssatz == null ? null : prozent(o.umbauzuschlagssatz));
    case 'nebenkosten':
      return n.nebenkosten(nk === null ? null : nk.art === 'prozent' ? prozent(nk.satz) : euro(nk.betrag));
    case 'mwstSatz':
      return n.mwstSatz(prozent(k.berechnung.mwstSatz));
    default:
      return n.sonst;
  }
}

/** Der Ort für Seite und PDF: `Objekt 2, Honorarsatz`, nur das Feld oder `null`. */
function befundOrt(b: Pruefbefund, stelle: number | null): string | null {
  const feld = b.ort.feld;
  const feldText =
    feld === undefined
      ? null
      : Object.hasOwn(FELD_TEXT, feld)
        ? FELD_TEXT[feld as keyof typeof FELD_TEXT]
        : feld;
  const teile = [stelle === null ? null : `Objekt ${String(stelle)}`, feldText].filter(
    (x): x is string => x !== null,
  );
  return teile.length === 0 ? null : teile.join(', ');
}

/**
 * Der Befund für Seite und PDF (Ticket 122, D-122.1): eigener de-DE-Text je Code mit den Werten des Objekts (N4, L1); die
 * Meldung der Rechnung (kanonische Zahlen, Kennungen) erscheint nie. Die Stufen der Kostenermittlung haben ihren festen Text
 * aus D-110.4.
 */
export function befundAnsicht(b: Pruefbefund, k: Befundkontext): BefundAnsicht {
  const stelle = objektStelle(b);
  return {
    schwere: b.schwere === 'fehler' ? 'fehler' : 'warnung',
    ort: befundOrt(b, stelle),
    text: befundText(b, k, stelle),
    code: b.code,
  };
}
