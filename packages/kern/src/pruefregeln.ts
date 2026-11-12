// SPDX-License-Identifier: AGPL-3.0-or-later
// Regeln der formalen LV-Prüfung (K8, Ticket 41) an genau einer Stelle. Jede Regel ist eine benannte Funktion mit Code und
// Schwere; `lv-pruefung.ts` ruft sie in fester Reihenfolge auf. Rein (A2): keine Regel ändert einen Befehl oder weist ihn
// ab (U5), sie meldet nur.
//
// Schwere: „fehler“ heißt, ein GAEB-Export würde ungültig oder eine Summe ist fachlich falsch; „warnung“ heißt
// unvollständig oder auffällig.
//
// Grenzen aus dem GAEB-Schema DA XML 3.3 (in der Ticketsitzung gelesen, Ticket 41, in eigenen Worten):
//  - Der Name des LV (`BoQInfo/Name`) fasst höchstens 20 Zeichen; der Export kürzt.
//  - Die Mengeneinheit (`QU`) fasst höchstens 4 Zeichen.
//  - Zahlformate: Menge höchstens 8, Einheitspreis höchstens 10, Gesamtpreis und Summen höchstens 11, Zuschlagssatz
//    höchstens 3 Vorkommastellen.
//  - Ein Kurztext hat keine Längengrenze (deshalb keine Regel dazu); er ist einzeilig gedacht.
// Nicht geprüft, weil der Kern sie schon abweist: Gliederungstiefe, Los neben Titel (F1), unbekannte Bezüge und die
// Formfehler der Merkmale (Ticket 37).

import { NULL_BETRAG, NULL_MENGE, alsMenge, vergleiche } from '@tethys/dezimal';
import type {
  Befundort,
  Befundschwere,
  Gesamtsummen,
  Gliederung,
  Knoten,
  Langtext,
  LangtextInnen,
  LvZustand,
  Position,
  Pruefbefund,
} from '@tethys/vertrag';
import { anteilsumme } from './epa';
import type { Baumindex } from './struktur';
import { rechenmenge } from './summenregeln';

/** Grenzen der Prüfung (N3-Prinzip: an genau einer Stelle). Quelle: GAEB DA XML 3.3, siehe Dateikopf. */
export const PRUEF_GRENZEN = {
  /** `BoQInfo/Name`. */
  lvNameZeichen: 20,
  /** `QU`. */
  einheitZeichen: 4,
  /** Vorkommastellen der GAEB-Zahlformate. */
  vorkommastellen: { menge: 8, einheitspreis: 10, betrag: 11, zuschlagssatz: 3 },
} as const;

/**
 * Lesarten, die das Ticket offen ließ (Demo-Modus, D-41.1 in `entscheidungen-auto.md`). Wer eine Frage entscheidet,
 * ändert die benannte Regel und diesen Eintrag.
 */
export const PRUEF_ANNAHMEN: Readonly<Record<string, string>> = {
  status: 'vorläufige Annahme, Entscheidung offen (Demo D-41.1)',
  leer: 'Leer heißt: kein Zeichen außer Leerraum (Name, Kurztext, Einheit). Ein Langtext ist leer, wenn er weder sichtbaren Text noch Bild, Tabelle mit Inhalt oder Textergänzung trägt',
  zeichen: 'Zeichen werden als Unicode-Codepunkte gezählt, nicht als Bytes',
  steuerzeichen:
    'Steuerzeichen: U+0000–U+001F, U+007F–U+009F, U+2028, U+2029 (Zeilenumbruch, Tabulator usw.)',
  mengeNull:
    'menge-null ist eine Warnung und gilt nur für Positionen ohne Zuschlag (die Zuschlagsposition meldet zuschlag-satz-und-menge)',
  maske:
    'Ist die OZ-Maske selbst ungültig, meldet die Prüfung oz-maske-ungueltig (Warnung, wie beim Anlegen) und prüft die OZ nicht gegen die Maske',
  zuschlagBasis:
    'zuschlag-ohne-bezug: im Bezug steht keine Position, die zur Basis gehören kann (R2: keine Zuschlagsposition, Betrag geht ins Netto); Positionen im Papierkorb zählen nicht',
  summen:
    'GP und Summen liest die Prüfung aus dem Summenstand des Zustands (`LvZustand.summen`), sie rechnet nicht neu',
  reihenfolge:
    'LV-weite Befunde zuerst, dann die Knoten in Dokumentreihenfolge; je Ort nach Code, dann nach Feld',
  leereStruktur:
    'langtext-struktur-leer (Ticket 56, D-22 (iii)): Warnung je Text mit einer leeren Liste, einer Tabelle ohne Zeilen oder einer Zeile ohne Zellen, auch verschachtelt; Feld langtext, text (Hinweistext) oder leitbeschreibung (Unterbeschreibungen); eine leere Zelle oder ein leerer Listenpunkt ist kein Befund',
};

/** Was eine Regel über das LV weiß (einmal je Prüfung gebaut, `lv-pruefung.ts`). */
export interface Pruefkontext {
  readonly zustand: LvZustand;
  readonly baum: Baumindex;
  /** Maske gültig (`maskeFehler`); sonst prüfen die OZ-Regeln nicht gegen sie. */
  readonly maskeGueltig: boolean;
  /** Stufe je Gliederung (eigene) bzw. Position (Zahl der Stufen darüber). */
  readonly stufe: ReadonlyMap<string, number>;
  readonly ozDoppelt: ReadonlySet<string>;
  /** Fehlertext je Knoten, dessen OZ die Maske verletzt. */
  readonly ozMaskenfehler: ReadonlyMap<string, string>;
  /** Knoten, deren vordere OZ-Teile von der OZ der Elterngliederung abweichen. */
  readonly ozAbweichend: ReadonlySet<string>;
  readonly gliederungMitPosition: ReadonlySet<string>;
  readonly zuschlagOhneBasis: ReadonlySet<string>;
  readonly kennzeichenOhneZuschlag: ReadonlySet<string>;
  readonly gesamtpreis: (positionId: string) => string | null;
  readonly gliederungssumme: (gliederungId: string) => string | null;
}

/** Eine Regel: Code, Schwere und die Prüfung. LV-Regeln sehen nur den Kontext, Knotenregeln je einen Knoten. */
export interface LvRegel {
  readonly code: string;
  readonly schwere: Befundschwere;
  readonly pruefe: (ctx: Pruefkontext) => readonly Pruefbefund[];
}
export interface Knotenregel {
  readonly code: string;
  readonly schwere: Befundschwere;
  readonly pruefe: (k: Knoten, ctx: Pruefkontext) => readonly Pruefbefund[];
}

// --- Hilfen ------------------------------------------------------------------------------------------------------

function befund(code: string, schwere: Befundschwere, meldung: string, ort: Befundort): Pruefbefund {
  return { schwere, quelle: 'lv-pruefung', code, meldung, ort };
}

const am = (k: Knoten, feld?: string): Befundort =>
  feld === undefined ? { knotenId: k.id } : { knotenId: k.id, feld };

const zeichenzahl = (text: string): number => Array.from(text).length;
const leer = (text: string): boolean => text.trim() === '';
/** Steuerzeichen (`PRUEF_ANNAHMEN.steuerzeichen`), ohne Regex mit Steuerzeichen (Lint `no-control-regex`). */
function hatSteuerzeichen(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c <= 0x1f || (c >= 0x7f && c <= 0x9f) || c === 0x2028 || c === 0x2029) return true;
  }
  return false;
}

/** Vorkommastellen eines kanonischen Dezimalwerts (ohne Vorzeichen). */
export function vorkommastellen(wert: string): number {
  const punkt = wert.indexOf('.');
  const stellen = punkt < 0 ? wert.length : punkt;
  return wert.startsWith('-') ? stellen - 1 : stellen;
}

const istGliederung = (k: Knoten): k is Gliederung => k.art === 'los' || k.art === 'titel';
const NAMEN: Readonly<Record<Knoten['art'], string>> = {
  los: 'Das Los',
  titel: 'Der Titel',
  position: 'Die Position',
  hinweis: 'Der Hinweistext',
};

function innenLeer(inhalt: LangtextInnen): boolean {
  return inhalt.every((b) => {
    switch (b.art) {
      case 'text':
        return leer(b.text);
      case 'umbruch':
        return true;
      case 'bild':
        return false;
      case 'absatz':
        return b.inhalt.every((i) => (i.art === 'text' ? leer(i.text) : i.art === 'umbruch'));
      case 'liste':
        return b.punkte.every(innenLeer);
      case 'tabelle':
        return b.zeilen.every((z) => z.zellen.every((c) => innenLeer(c.inhalt)));
    }
  });
}

/** Ohne sichtbaren Inhalt (`PRUEF_ANNAHMEN.leer`); eine Textergänzung ist Inhalt. */
export const langtextLeer = (l: Langtext): boolean =>
  l.every((b) => b.art !== 'ergaenzung' && innenLeer([b]));

/** Kein Befund (eine geteilte, eingefrorene Liste: die meisten Regeln treffen nicht, Q4). */
const KEINE: readonly Pruefbefund[] = Object.freeze([]);
const nurWenn = (bedingung: boolean, b: () => Pruefbefund): readonly Pruefbefund[] =>
  bedingung ? [b()] : KEINE;

// --- LV-weite Regeln ---------------------------------------------------------------------------------------------

/** N5, E-06: negatives Netto nach Nachlass (gleicher Code wie der Befehlshinweis). */
export const nettoNachNachlassNegativ: LvRegel = {
  code: 'netto-nach-nachlass-negativ',
  schwere: 'fehler',
  pruefe: ({ zustand }) => {
    const g = zustand.summen.gesamt;
    return nurWenn(vergleiche(g.nettoNachNachlass, NULL_BETRAG) < 0, () =>
      befund(
        'netto-nach-nachlass-negativ',
        'fehler',
        `Das Netto nach Nachlass ist negativ (${g.nettoNachNachlass}); der Nachlass übersteigt das Netto (${g.netto}).`,
        { feld: 'nachlass' },
      ),
    );
  },
};

export const lvNameLeer: LvRegel = {
  code: 'lv-name-leer',
  schwere: 'warnung',
  pruefe: ({ zustand }) =>
    nurWenn(leer(zustand.leistungsverzeichnis.name), () =>
      befund('lv-name-leer', 'warnung', 'Das LV hat keinen Namen.', { feld: 'name' }),
    ),
};

export const lvNameZuLang: LvRegel = {
  code: 'lv-name-zu-lang',
  schwere: 'warnung',
  pruefe: ({ zustand }) => {
    const n = zeichenzahl(zustand.leistungsverzeichnis.name);
    return nurWenn(n > PRUEF_GRENZEN.lvNameZeichen, () =>
      befund(
        'lv-name-zu-lang',
        'warnung',
        `Der Name des LV hat ${String(n)} Zeichen; GAEB fasst ${String(PRUEF_GRENZEN.lvNameZeichen)}, der Export kürzt.`,
        { feld: 'name' },
      ),
    );
  },
};

const GESAMT_FELDER: readonly (keyof Gesamtsummen)[] = [
  'netto',
  'nachlass',
  'nettoNachNachlass',
  'mwst',
  'brutto',
  'summeBedarfOhneGesamtbetrag',
  'summeWahl',
];

const zuGrossMeldung = (was: string, wert: string, grenze: number): string =>
  `${was} ${wert} hat ${String(vorkommastellen(wert))} Vorkommastellen; GAEB fasst höchstens ${String(grenze)}.`;

/** Zahl zu groß für das GAEB-Zahlformat, Gesamtsummen des LV. */
export const summeZuGross: LvRegel = {
  code: 'zahl-zu-gross',
  schwere: 'fehler',
  pruefe: ({ zustand }) => {
    const g = zustand.summen.gesamt;
    const grenze = PRUEF_GRENZEN.vorkommastellen.betrag;
    return GESAMT_FELDER.flatMap((feld) => {
      const wert = g[feld];
      return nurWenn(wert !== undefined && vorkommastellen(wert) > grenze, () =>
        befund('zahl-zu-gross', 'fehler', zuGrossMeldung('Die Summe', wert ?? '', grenze), { feld }),
      );
    });
  },
};

// --- Ordnungszahl ------------------------------------------------------------------------------------------------

export const ozFehlt: Knotenregel = {
  code: 'oz-fehlt',
  schwere: 'warnung',
  pruefe: (k) =>
    nurWenn(k.art !== 'hinweis' && (k.ordnungszahl === null || leer(k.ordnungszahl)), () =>
      befund('oz-fehlt', 'warnung', `${NAMEN[k.art]} hat keine Ordnungszahl.`, am(k, 'ordnungszahl')),
    ),
};

/** F2, E-09: die Handeingabe lässt doppelte OZ zu, die Prüfung meldet sie an jedem beteiligten Knoten. */
export const ozDoppelt: Knotenregel = {
  code: 'oz-doppelt',
  schwere: 'fehler',
  pruefe: (k, ctx) =>
    nurWenn(ctx.ozDoppelt.has(k.id) && k.art !== 'hinweis', () =>
      befund(
        'oz-doppelt',
        'fehler',
        `Die Ordnungszahl ${k.art === 'hinweis' ? '' : String(k.ordnungszahl)} ist im LV mehrfach vergeben.`,
        am(k, 'ordnungszahl'),
      ),
    ),
};

export const ozMaskeVerletzt: Knotenregel = {
  code: 'oz-maske-verletzt',
  schwere: 'fehler',
  pruefe: (k, ctx) => {
    const f = ctx.ozMaskenfehler.get(k.id);
    return nurWenn(f !== undefined, () =>
      befund(
        'oz-maske-verletzt',
        'fehler',
        `Die Ordnungszahl passt nicht zur Maske: ${f ?? ''}`,
        am(k, 'ordnungszahl'),
      ),
    );
  },
};

export const ozPasstNichtZurGliederung: Knotenregel = {
  code: 'oz-passt-nicht-zur-gliederung',
  schwere: 'warnung',
  pruefe: (k, ctx) =>
    nurWenn(ctx.ozAbweichend.has(k.id), () =>
      befund(
        'oz-passt-nicht-zur-gliederung',
        'warnung',
        'Die vorderen Teile der Ordnungszahl weichen von der Ordnungszahl der übergeordneten Gliederung ab.',
        am(k, 'ordnungszahl'),
      ),
    ),
};

// --- Texte -------------------------------------------------------------------------------------------------------

/** W-05 Nr. 2: die Eingabe bleibt erlaubt (`FELD_ANNAHMEN`), die Prüfung meldet. */
export const kurztextLeer: Knotenregel = {
  code: 'kurztext-leer',
  schwere: 'warnung',
  pruefe: (k) =>
    nurWenn(k.art !== 'hinweis' && leer(k.kurztext), () =>
      befund('kurztext-leer', 'warnung', `${NAMEN[k.art]} hat keinen Kurztext.`, am(k, 'kurztext')),
    ),
};

export const kurztextZeilenumbruch: Knotenregel = {
  code: 'kurztext-zeilenumbruch',
  schwere: 'warnung',
  pruefe: (k) =>
    nurWenn(k.art !== 'hinweis' && hatSteuerzeichen(k.kurztext), () =>
      befund(
        'kurztext-zeilenumbruch',
        'warnung',
        'Der Kurztext enthält einen Zeilenumbruch oder ein Steuerzeichen; GAEB liest ihn als eine Zeile.',
        am(k, 'kurztext'),
      ),
    ),
};

export const langtextLeerRegel: Knotenregel = {
  code: 'langtext-leer',
  schwere: 'warnung',
  pruefe: (k) =>
    nurWenn(k.art === 'position' && langtextLeer(k.langtext), () =>
      befund('langtext-leer', 'warnung', 'Die Position hat keinen Langtext.', am(k, 'langtext')),
    ),
};

/** Arten leerer Strukturen im Langtext (v1.3, D-22 (iii), Ticket 56), in fester Reihenfolge für die Meldung. */
type LeereStruktur = 'liste' | 'tabelle' | 'zeile';
const LEERE_STRUKTUR_TEXT: Readonly<Record<LeereStruktur, string>> = {
  liste: 'eine leere Liste',
  tabelle: 'eine Tabelle ohne Zeilen',
  zeile: 'eine Tabellenzeile ohne Zellen',
};

/** Sammelt leere Listen, Tabellen ohne Zeilen und Zeilen ohne Zellen, auch in Listenpunkten und Zellen. */
function leereStrukturen(inhalt: Langtext | LangtextInnen, aus: Set<LeereStruktur>): void {
  for (const b of inhalt) {
    if (b.art === 'liste') {
      if (b.punkte.length === 0) aus.add('liste');
      for (const p of b.punkte) leereStrukturen(p, aus);
    } else if (b.art === 'tabelle') {
      if (b.zeilen.length === 0) aus.add('tabelle');
      for (const z of b.zeilen) {
        if (z.zellen.length === 0) aus.add('zeile');
        for (const c of z.zellen) leereStrukturen(c.inhalt, aus);
      }
    }
  }
}

/** Texte eines Knotens mit ihrem Feld (Sprungziel): Langtext und Unterbeschreibungen einer Position, Text eines Hinweises. */
function texteVon(k: Knoten): readonly (readonly [string, readonly Langtext[]])[] {
  if (k.art === 'hinweis') return [['text', [k.text]]];
  if (k.art !== 'position') return [];
  const unter = k.leitbeschreibung?.unterbeschreibungen ?? [];
  return unter.length === 0
    ? [['langtext', [k.langtext]]]
    : [
        ['langtext', [k.langtext]],
        ['leitbeschreibung', unter.map((u) => u.langtext)],
      ];
}

/**
 * Leere Strukturen im Langtext (v1.3, D-22 (iii), Ticket 56): eine leere Liste, eine Tabelle ohne Zeilen oder eine Zeile
 * ohne Zellen. Der Vertrag lässt sie zu, der Langtext-Editor kann sie nicht darstellen und der GAEB-Writer verwirft sie
 * mit Warnung (Ticket 68). Ein Befund je Text (`PRUEF_ANNAHMEN.leereStruktur`); eine leere Zelle ist keiner.
 */
export const langtextStrukturLeer: Knotenregel = {
  code: 'langtext-struktur-leer',
  schwere: 'warnung',
  pruefe: (k) => {
    let aus: Pruefbefund[] | null = null;
    for (const [feld, texte] of texteVon(k)) {
      const gefunden = new Set<LeereStruktur>();
      for (const t of texte) leereStrukturen(t, gefunden);
      if (gefunden.size === 0) continue;
      const was = (['liste', 'tabelle', 'zeile'] as const).filter((s) => gefunden.has(s));
      aus ??= [];
      aus.push(
        befund(
          'langtext-struktur-leer',
          'warnung',
          `Der Text enthält ${was.map((s) => LEERE_STRUKTUR_TEXT[s]).join(', ')}; der Editor zeigt sie nicht, der GAEB-Export lässt sie weg.`,
          am(k, feld),
        ),
      );
    }
    return aus ?? KEINE;
  },
};

export const hinweistextLeer: Knotenregel = {
  code: 'hinweistext-leer',
  schwere: 'warnung',
  pruefe: (k) =>
    nurWenn(k.art === 'hinweis' && langtextLeer(k.text), () =>
      befund('hinweistext-leer', 'warnung', 'Der Hinweistext hat keinen Text.', am(k, 'text')),
    ),
};

// --- Gliederung --------------------------------------------------------------------------------------------------

export const gliederungLeer: Knotenregel = {
  code: 'gliederung-leer',
  schwere: 'warnung',
  pruefe: (k, ctx) =>
    nurWenn(istGliederung(k) && !ctx.gliederungMitPosition.has(k.id), () =>
      befund('gliederung-leer', 'warnung', `${NAMEN[k.art]} enthält keine Position.`, am(k)),
    ),
};

// --- Positionen: Einheit, Menge, Zahlen ------------------------------------------------------------------------

const position = (k: Knoten): Position | null => (k.art === 'position' ? k : null);

export const einheitFehlt: Knotenregel = {
  code: 'einheit-fehlt',
  schwere: 'warnung',
  pruefe: (k) => {
    const p = position(k);
    return nurWenn(
      p !== null && p.zuschlag === null && !p.merkmale.pauschal && (p.einheit === null || leer(p.einheit)),
      () =>
        befund(
          'einheit-fehlt',
          'warnung',
          'Die Position hat keine Einheit (für X83 Pflicht).',
          am(k, 'einheit'),
        ),
    );
  },
};

export const einheitZuLang: Knotenregel = {
  code: 'einheit-zu-lang',
  schwere: 'fehler',
  pruefe: (k) => {
    const e = position(k)?.einheit ?? null;
    return nurWenn(e !== null && zeichenzahl(e) > PRUEF_GRENZEN.einheitZeichen, () =>
      befund(
        'einheit-zu-lang',
        'fehler',
        `Die Einheit „${e ?? ''}“ hat mehr als ${String(PRUEF_GRENZEN.einheitZeichen)} Zeichen.`,
        am(k, 'einheit'),
      ),
    );
  },
};

export const einheitZeichen: Knotenregel = {
  code: 'einheit-zeichen',
  schwere: 'fehler',
  pruefe: (k) => {
    const e = position(k)?.einheit ?? null;
    return nurWenn(e !== null && hatSteuerzeichen(e), () =>
      befund(
        'einheit-zeichen',
        'fehler',
        'Die Einheit enthält einen Zeilenumbruch oder ein Steuerzeichen.',
        am(k, 'einheit'),
      ),
    );
  },
};

export const mengeFehlt: Knotenregel = {
  code: 'menge-fehlt',
  schwere: 'warnung',
  pruefe: (k) => {
    const p = position(k);
    return nurWenn(p !== null && p.zuschlag === null && !p.merkmale.pauschal && p.menge === null, () =>
      befund('menge-fehlt', 'warnung', 'Die Position hat keine Menge.', am(k, 'menge')),
    );
  },
};

export const mengeNull: Knotenregel = {
  code: 'menge-null',
  schwere: 'warnung',
  pruefe: (k) => {
    const p = position(k);
    return nurWenn(
      // Kanonische Schreibweise (N3): die Null ist genau `0.000`, nie `-0.000`.
      p !== null && p.zuschlag === null && p.menge === NULL_MENGE,
      () => befund('menge-null', 'warnung', 'Die Menge der Position ist 0,000.', am(k, 'menge')),
    );
  },
};

const EINS = (() => {
  const e = alsMenge('1.000');
  if (!e.ok) throw new Error('Konstante 1.000 ist keine Menge');
  return e.wert;
})();

export const pauschalMenge: Knotenregel = {
  code: 'pauschal-menge',
  schwere: 'warnung',
  pruefe: (k) => {
    const p = position(k);
    return nurWenn(p !== null && p.merkmale.pauschal && p.menge !== null && p.menge !== EINS, () =>
      befund(
        'pauschal-menge',
        'warnung',
        `Die Pauschalposition hat die Menge ${p?.menge ?? ''} statt 1,000.`,
        am(k, 'menge'),
      ),
    );
  },
};

/** Zahl zu groß für das GAEB-Zahlformat, an einem Knoten: Menge, EP, GP, Zuschlagssatz; Gliederungssumme. */
export const zahlZuGross: Knotenregel = {
  code: 'zahl-zu-gross',
  schwere: 'fehler',
  pruefe: (k, ctx) => {
    const v = PRUEF_GRENZEN.vorkommastellen;
    const aus: Pruefbefund[] = [];
    const pruefe = (was: string, wert: string | null, grenze: number, feld: string): void => {
      if (wert !== null && vorkommastellen(wert) > grenze)
        aus.push(befund('zahl-zu-gross', 'fehler', zuGrossMeldung(was, wert, grenze), am(k, feld)));
    };
    if (istGliederung(k)) pruefe('Die Summe', ctx.gliederungssumme(k.id), v.betrag, 'gesamtpreis');
    if (k.art === 'position') {
      pruefe('Die Menge', k.menge, v.menge, 'menge');
      pruefe('Der Einheitspreis', k.einheitspreis, v.einheitspreis, 'einheitspreis');
      pruefe('Der Gesamtpreis', ctx.gesamtpreis(k.id), v.betrag, 'gesamtpreis');
      pruefe('Der Zuschlagssatz', k.zuschlag?.prozentsatz ?? null, v.zuschlagssatz, 'zuschlag');
    }
    return aus;
  },
};

// --- Zuschlagsposition (Ticket 37) ------------------------------------------------------------------------------

export const zuschlagOhneBezug: Knotenregel = {
  code: 'zuschlag-ohne-bezug',
  schwere: 'warnung',
  pruefe: (k, ctx) =>
    nurWenn(ctx.zuschlagOhneBasis.has(k.id), () =>
      befund(
        'zuschlag-ohne-bezug',
        'warnung',
        'Die Zuschlagsposition hat keine Bezugsposition; ihre Basis ist leer.',
        am(k),
      ),
    ),
};

/** R8 (Ticket 37, D-10): ohne Satz, aber mit Menge und EP rechnet sie Menge × EP. */
export const zuschlagAltform: Knotenregel = {
  code: 'zuschlag-altform',
  schwere: 'warnung',
  pruefe: (k) => {
    const p = position(k);
    return nurWenn(
      p !== null &&
        p.zuschlag !== null &&
        p.zuschlag.prozentsatz === null &&
        p.menge !== null &&
        p.einheitspreis !== null,
      () =>
        befund(
          'zuschlag-altform',
          'warnung',
          'Die Zuschlagsposition hat keinen Zuschlagssatz, aber Menge und Einheitspreis; sie rechnet Menge × EP (Altform).',
          am(k),
        ),
    );
  },
};

export const zuschlagSatzUndMenge: Knotenregel = {
  code: 'zuschlag-satz-und-menge',
  schwere: 'warnung',
  pruefe: (k) => {
    const p = position(k);
    return nurWenn(
      p !== null &&
        p.zuschlag !== null &&
        p.zuschlag.prozentsatz !== null &&
        (p.menge !== null || p.einheitspreis !== null),
      () =>
        befund(
          'zuschlag-satz-und-menge',
          'warnung',
          'Die Zuschlagsposition hat einen Zuschlagssatz und zugleich Menge oder Einheitspreis; diese werden nicht gerechnet.',
          am(k, 'menge'),
        ),
    );
  },
};

export const zuschlagskennzeichenOhneZuschlag: Knotenregel = {
  code: 'zuschlagskennzeichen-ohne-zuschlag',
  schwere: 'warnung',
  pruefe: (k, ctx) =>
    nurWenn(ctx.kennzeichenOhneZuschlag.has(k.id), () =>
      befund(
        'zuschlagskennzeichen-ohne-zuschlag',
        'warnung',
        'Die Position ist für einen Zuschlag gekennzeichnet, in ihrem Bereich steht aber keine Zuschlagsposition auf gekennzeichnete Positionen.',
        am(k),
      ),
    ),
};

export const teilmengeZuGross: Knotenregel = {
  code: 'teilmenge-zu-gross',
  schwere: 'warnung',
  pruefe: (k, ctx) => {
    const bezug = position(k)?.zuschlag?.bezug;
    if (bezug?.art !== 'positionen') return KEINE;
    return bezug.positionen.flatMap((b) => {
      const ziel = ctx.baum.byId.get(b.positionId);
      const menge = ziel?.art === 'position' ? rechenmenge(ziel) : null;
      return nurWenn(b.teilmenge !== null && menge !== null && vergleiche(b.teilmenge, menge) > 0, () =>
        befund(
          'teilmenge-zu-gross',
          'warnung',
          `Die Teilmenge ${b.teilmenge ?? ''} ist größer als die Menge ${menge ?? ''} der Bezugsposition ${b.positionId}.`,
          am(k, 'zuschlag'),
        ),
      );
    });
  },
};

// --- Wahl, Einheitspreisanteile ---------------------------------------------------------------------------------

export const wahlOhneZuordnung: Knotenregel = {
  code: 'wahl-ohne-zuordnung',
  schwere: 'warnung',
  pruefe: (k) => {
    const w = position(k)?.merkmale.wahl ?? null;
    return nurWenn(w !== null && w.gruppe === null && w.variante === null && w.grundpositionId === null, () =>
      befund(
        'wahl-ohne-zuordnung',
        'warnung',
        'Die Wahlposition hat weder Gruppe noch Variante noch Grundposition.',
        am(k),
      ),
    );
  },
};

/** K7 (Ticket 37): gesetzte Anteile, deren Summe nicht der EP ist. */
export const epaSummeAbweichend: Knotenregel = {
  code: 'epa-summe-abweichend',
  schwere: 'warnung',
  pruefe: (k) => {
    const p = position(k);
    const summe = p === null || p.epa === null ? null : anteilsumme(p.epa);
    return nurWenn(
      p !== null && summe !== null && (p.einheitspreis === null || vergleiche(summe, p.einheitspreis) !== 0),
      () =>
        befund(
          'epa-summe-abweichend',
          'warnung',
          `Die Einheitspreisanteile ergeben ${summe ?? ''}, der Einheitspreis ist ${p?.einheitspreis ?? 'leer'}.`,
          am(k, 'einheitspreis'),
        ),
    );
  },
};

// --- Reihenfolge der Regeln -----------------------------------------------------------------------------------------

/** Die LV-weiten Regeln. `oz-maske-ungueltig` (Maske selbst) kommt aus `maskePruefen` (`ozregeln.ts`). */
export const LV_REGELN: readonly LvRegel[] = [
  nettoNachNachlassNegativ,
  lvNameLeer,
  lvNameZuLang,
  summeZuGross,
];

/** Die Regeln je Knoten. */
export const KNOTEN_REGELN: readonly Knotenregel[] = [
  ozFehlt,
  ozDoppelt,
  ozMaskeVerletzt,
  ozPasstNichtZurGliederung,
  kurztextLeer,
  kurztextZeilenumbruch,
  langtextLeerRegel,
  langtextStrukturLeer,
  hinweistextLeer,
  gliederungLeer,
  einheitFehlt,
  einheitZuLang,
  einheitZeichen,
  mengeFehlt,
  mengeNull,
  pauschalMenge,
  zahlZuGross,
  zuschlagOhneBezug,
  zuschlagAltform,
  zuschlagSatzUndMenge,
  zuschlagskennzeichenOhneZuschlag,
  teilmengeZuGross,
  wahlOhneZuordnung,
  epaSummeAbweichend,
];
