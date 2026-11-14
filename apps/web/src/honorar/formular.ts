// SPDX-License-Identifier: AGPL-3.0-or-later
// Das Formular eines Honorarobjekts als Text (Ticket 119, N4): de-DE-Zeichen an den Rändern, Dezimalwerte im Befehl. Ein
// Feld, das sich nicht lesen lässt, ist ein Feldfehler und kommt nie in einen Befehl; was die HOAI anders vorsieht (Honorarsatz
// außerhalb 0 bis 100, Zone oder Phase ohne Tafel, Zuschlag über der Grenze), nimmt die Eingabe an und zeigt der Befund (U5).

import { formatiereBetragDe, formatiereProzentDe } from '@tethys/dezimal';
import { LEISTUNGSBILDER } from '@tethys/honorar';
import type {
  AnrechenbareKostenangabe,
  BeauftragteLeistungsphase,
  Betrag,
  Ergebnis,
  Honorarobjekt,
  Honorarzone,
  KostenermittlungId,
  Leistungsbild,
  Leistungsphasennummer,
  Nebenkostenangabe,
  Prozent,
} from '@tethys/vertrag';
import { zahlLesen } from '../lv/zahlen';
import type { Feldfehler } from '../ui/feldfehler';
import { texte } from './texte';

export const LEISTUNGSBILDER_LISTE: readonly Leistungsbild[] = [
  'gebaeude',
  'innenraeume',
  'freianlagen',
  'ingenieurbauwerke',
  'verkehrsanlagen',
  'tragwerksplanung',
  'technische-ausruestung',
];

/** Die Honorarsatz-Vorgaben der App: benannte Stellen in der Spanne (Prozent der Spanne); „Mittelsatz“ ist kein HOAI-Begriff. */
export const HONORARSATZ_VORGABEN: readonly { readonly satz: string; readonly name: string }[] = [
  { satz: '0.00', name: texte.vorgaben.basis },
  { satz: '25.00', name: texte.vorgaben.viertel },
  { satz: '50.00', name: texte.vorgaben.mittel },
  { satz: '75.00', name: texte.vorgaben.dreiviertel },
  { satz: '100.00', name: texte.vorgaben.oberer },
];

/** Vorschlag für den Umbauzuschlag bei einem Umbau (§ 6 Abs. 2); ein Wert, den der Nutzer ändern kann. */
export const UMBAUZUSCHLAG_VORSCHLAG = '20.00';

export interface PhaseFeld {
  readonly nummer: Leistungsphasennummer;
  readonly beauftragt: boolean;
  /** Vereinbarter Anteil in Prozent (de-DE); leer: der Satz der HOAI. */
  readonly anteil: string;
}

export interface ObjektFormular {
  readonly bezeichnung: string;
  readonly leistungsbild: Leistungsbild;
  readonly honorarzone: Honorarzone;
  readonly honorarsatz: string;
  readonly kostenart: 'betrag' | 'kostenermittlung';
  readonly betrag: string;
  readonly kostenermittlungId: string;
  readonly technischeAnlagenAnteilig: boolean;
  readonly weitereKosten: string;
  readonly bausubstanz: string;
  /** Alle Leistungsphasen des Leistungsbilds, nach Nummer. */
  readonly phasen: readonly PhaseFeld[];
  readonly umbau: boolean;
  readonly umbauzuschlagssatz: string;
}

export type { Feldfehler };

const NULL_BETRAG_DE = formatiereBetragDe('0.00' as Betrag);

/** Die Leistungsphasen des Leistungsbilds (Nummer, Name, Satz der HOAI). */
export function phasenDes(leistungsbild: Leistungsbild): typeof LEISTUNGSBILDER.gebaeude.leistungsphasen {
  return LEISTUNGSBILDER[leistungsbild].leistungsphasen;
}

/** Die Honorarzonen des Leistungsbilds. */
export function zonenDes(leistungsbild: Leistungsbild): readonly Honorarzone[] {
  return LEISTUNGSBILDER[leistungsbild].honorartafel.honorarzonen;
}

/**
 * Vorgabe der Honorarzone eines neuen Objekts als Stelle in den Zonen des Leistungsbilds: die mittlere Zone III (Stelle 2); hat
 * das Leistungsbild weniger Zonen (Technische Ausrüstung: I bis III), die höchste vorhandene (Ticket 122).
 */
const VORGABE_ZONENSTELLE = 2;

/** Ein neues Objekt: Honorarsatz 0 (§ 7 Abs. 1), anrechenbare Kosten von Hand 0,00, alle Leistungsphasen beauftragt. */
export function neuesObjekt(bezeichnung: string, leistungsbild: Leistungsbild = 'gebaeude'): Honorarobjekt {
  const zonen = zonenDes(leistungsbild);
  return {
    bezeichnung,
    leistungsbild,
    honorarzone: zonen[Math.min(VORGABE_ZONENSTELLE, zonen.length - 1)] ?? 'III',
    honorarsatz: '0.00' as Prozent,
    anrechenbareKosten: { art: 'betrag', betrag: '0.00' as Betrag },
    leistungsphasen: phasenDes(leistungsbild).map((p) => ({ nummer: p.nummer })),
    umbauzuschlagssatz: null,
  };
}

/** Das Formular zu einem gespeicherten Objekt. */
export function formularAus(o: Honorarobjekt, vorschlagKostenermittlung = ''): ObjektFormular {
  const a = o.anrechenbareKosten;
  const gewaehlt = new Map(o.leistungsphasen.map((p) => [p.nummer, p] as const));
  return {
    bezeichnung: o.bezeichnung,
    leistungsbild: o.leistungsbild,
    honorarzone: o.honorarzone,
    honorarsatz: formatiereProzentDe(o.honorarsatz),
    kostenart: a.art,
    betrag: a.art === 'betrag' ? formatiereBetragDe(a.betrag) : NULL_BETRAG_DE,
    kostenermittlungId: a.art === 'kostenermittlung' ? a.kostenermittlungId : vorschlagKostenermittlung,
    technischeAnlagenAnteilig: a.art === 'kostenermittlung' ? a.technischeAnlagenAnteilig : true,
    weitereKosten: a.art === 'kostenermittlung' ? formatiereBetragDe(a.weitereKosten) : NULL_BETRAG_DE,
    bausubstanz:
      a.art === 'kostenermittlung' ? formatiereBetragDe(a.mitzuverarbeitendeBausubstanz) : NULL_BETRAG_DE,
    phasen: phasenDes(o.leistungsbild).map((p) => {
      const g = gewaehlt.get(p.nummer);
      return {
        nummer: p.nummer,
        beauftragt: g !== undefined,
        anteil: g?.anteil === undefined ? '' : formatiereProzentDe(g.anteil),
      };
    }),
    umbau: o.umbauzuschlagssatz !== null,
    umbauzuschlagssatz:
      o.umbauzuschlagssatz === null
        ? formatiereProzentDe(UMBAUZUSCHLAG_VORSCHLAG as Prozent)
        : formatiereProzentDe(o.umbauzuschlagssatz),
  };
}

function lesen<A extends 'betrag' | 'prozent'>(
  art: A,
  feld: string,
  text: string,
): Ergebnis<A extends 'betrag' ? Betrag : Prozent, Feldfehler> {
  const r = zahlLesen(art, text.trim());
  return r.ok
    ? ({ ok: true, wert: r.wert } as Ergebnis<A extends 'betrag' ? Betrag : Prozent, Feldfehler>)
    : { ok: false, fehler: { feld, meldung: r.fehler } };
}

/** Das gespeicherte Objekt aus dem Formular; der erste unlesbare Wert ist ein Feldfehler. */
export function objektAus(f: ObjektFormular): Ergebnis<Honorarobjekt, Feldfehler> {
  if (f.bezeichnung.trim() === '')
    return { ok: false, fehler: { feld: 'bezeichnung', meldung: texte.fehler.bezeichnung } };
  const satz = lesen('prozent', 'honorarsatz', f.honorarsatz);
  if (!satz.ok) return satz;

  let kosten: AnrechenbareKostenangabe;
  if (f.kostenart === 'betrag') {
    const b = lesen('betrag', 'betrag', f.betrag);
    if (!b.ok) return b;
    kosten = { art: 'betrag', betrag: b.wert };
  } else {
    if (f.kostenermittlungId === '')
      return { ok: false, fehler: { feld: 'kostenermittlung', meldung: texte.fehler.kostenermittlung } };
    const w = lesen('betrag', 'weitereKosten', f.weitereKosten);
    if (!w.ok) return w;
    const s = lesen('betrag', 'bausubstanz', f.bausubstanz);
    if (!s.ok) return s;
    kosten = {
      art: 'kostenermittlung',
      kostenermittlungId: f.kostenermittlungId as KostenermittlungId,
      technischeAnlagenAnteilig: f.technischeAnlagenAnteilig,
      weitereKosten: w.wert,
      mitzuverarbeitendeBausubstanz: s.wert,
    };
  }

  const phasen: BeauftragteLeistungsphase[] = [];
  for (const p of f.phasen) {
    if (!p.beauftragt) continue;
    if (p.anteil.trim() === '') {
      phasen.push({ nummer: p.nummer });
      continue;
    }
    const a = lesen('prozent', `anteil${String(p.nummer)}`, p.anteil);
    if (!a.ok) return a;
    phasen.push({ nummer: p.nummer, anteil: a.wert });
  }

  let umbau: Prozent | null = null;
  if (f.umbau) {
    const u = lesen('prozent', 'umbauzuschlagssatz', f.umbauzuschlagssatz);
    if (!u.ok) return u;
    umbau = u.wert;
  }

  return {
    ok: true,
    wert: {
      bezeichnung: f.bezeichnung.trim(),
      leistungsbild: f.leistungsbild,
      honorarzone: f.honorarzone,
      honorarsatz: satz.wert,
      anrechenbareKosten: kosten,
      leistungsphasen: phasen,
      umbauzuschlagssatz: umbau,
    },
  };
}

/**
 * Wechsel des Leistungsbilds: Die Phasen des neuen Leistungsbilds, bereits beauftragte Nummern bleiben (mit ihrem Anteil),
 * neue sind beauftragt; eine Zone, die die Tafel nicht kennt, wird die höchste der Tafel.
 */
export function leistungsbildWechseln(f: ObjektFormular, neu: Leistungsbild): ObjektFormular {
  if (neu === f.leistungsbild) return f;
  const alt = new Map(f.phasen.map((p) => [p.nummer, p] as const));
  const zonen = zonenDes(neu);
  const lbDaten = LEISTUNGSBILDER[neu];
  return {
    ...f,
    leistungsbild: neu,
    honorarzone: zonen.includes(f.honorarzone) ? f.honorarzone : (zonen[zonen.length - 1] ?? f.honorarzone),
    phasen: lbDaten.leistungsphasen.map(
      (p) => alt.get(p.nummer) ?? { nummer: p.nummer, beauftragt: true, anteil: '' },
    ),
    // § 33 gilt nur für Gebäude und Innenräume: sonst von Hand
    kostenart: lbDaten.kostenNachDin276 ? f.kostenart : 'betrag',
  };
}

/** Honorarsatz-Vorgabe, die zum Text passt (`'frei'`, wenn keine). */
export function vorgabeZu(honorarsatzText: string): string {
  const r = zahlLesen('prozent', honorarsatzText.trim());
  if (!r.ok) return 'frei';
  return HONORARSATZ_VORGABEN.find((v) => v.satz === r.wert)?.satz ?? 'frei';
}

// --- Berechnung (Nebenkosten, MwSt) ---------------------------------------------------------------------------------

export interface KopfFormular {
  readonly name: string;
  readonly nebenArt: 'keine' | 'prozent' | 'betrag';
  readonly nebenWert: string;
  readonly mwstSatz: string;
}

export function kopfFormularAus(
  name: string,
  nebenkosten: Nebenkostenangabe | null,
  mwstSatz: Prozent,
): KopfFormular {
  return {
    name,
    nebenArt: nebenkosten === null ? 'keine' : nebenkosten.art,
    nebenWert:
      nebenkosten === null
        ? ''
        : nebenkosten.art === 'prozent'
          ? formatiereProzentDe(nebenkosten.satz)
          : formatiereBetragDe(nebenkosten.betrag),
    mwstSatz: formatiereProzentDe(mwstSatz),
  };
}

export interface KopfWerte {
  readonly name: string;
  readonly nebenkosten: Nebenkostenangabe | null;
  readonly mwstSatz: Prozent;
}

export function kopfAus(f: KopfFormular): Ergebnis<KopfWerte, Feldfehler> {
  if (f.name.trim() === '') return { ok: false, fehler: { feld: 'name', meldung: texte.fehler.name } };
  const mwst = lesen('prozent', 'mwstSatz', f.mwstSatz);
  if (!mwst.ok) return mwst;
  let nebenkosten: Nebenkostenangabe | null = null;
  if (f.nebenArt === 'prozent') {
    const s = lesen('prozent', 'nebenkosten', f.nebenWert);
    if (!s.ok) return s;
    nebenkosten = { art: 'prozent', satz: s.wert };
  } else if (f.nebenArt === 'betrag') {
    const b = lesen('betrag', 'nebenkosten', f.nebenWert);
    if (!b.ok) return b;
    nebenkosten = { art: 'betrag', betrag: b.wert };
  }
  return { ok: true, wert: { name: f.name.trim(), nebenkosten, mwstSatz: mwst.wert } };
}
