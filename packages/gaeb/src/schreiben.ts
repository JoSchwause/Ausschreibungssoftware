// SPDX-License-Identifier: AGPL-3.0-or-later
// `LvInhalt` → GAEB DA XML 3.3/3.2, Phasen X81, X83, X86 (Ticket 40). „Tolerant lesen, streng schreiben“.
// Rein (A2): Datum, Uhrzeit und Summen liefert der Aufrufer; der Writer rechnet nicht (Summen und Basen kommen vom Kern
// über den Aufrufer).
//
// Die Abbildung ist die Umkehrung des Lesers (`lesen.ts`, Ticket 22/32). Jeder Export geht durch die eigene
// Prüfung (Befundquelle `gaeb-pruefung`, ADR 0010): Fehler setzen `entwurf` und einen Kommentar „Entwurf: …“ an den
// Anfang, sperren aber nie (U5, G-13). Was das Modell trägt, die Zielphase aber nicht abbilden kann, wird nicht
// geschrieben und als Warnung `export-verworfen` gemeldet, je Art einmal je Datei (E-11).
//
// Grenzen der eigenen Prüfung: aus dem XSD 3.3 (2021-05), in der Ticketsitzung gelesen, nicht im Repo (ADR 0010).
// Hier stehen nur Element- und Typnamen.

import type {
  Auftraggeber,
  Betrag,
  Einheitspreisanteile,
  GaebExport,
  GaebVersion,
  Hinweistext,
  Knoten,
  KnotenId,
  LvInhalt,
  Ordnungszahl,
  OzStelle,
  Position,
  PositionId,
  Pruefbefund,
  Summenstand,
  Vergabeinformationen,
} from '@tethys/vertrag';
import { XmlAusgabe } from './ausgabe';
import type { Attribute } from './ausgabe';
import { schreibeDetailtext, schreibeEinzeiler, schreibeKurztext } from './text-schreiben';
import type { TextMelder } from './text-schreiben';

export type ExportPhase = 'X81' | 'X83' | 'X86';
export type ExportVersion = Extract<GaebVersion, '3.2' | '3.3'>;

export interface SchreibOptionen {
  readonly phase: ExportPhase;
  readonly version: ExportVersion;
  /** Für `GAEBInfo/Date` und `Time`: `JJJJ-MM-TT`, `HH:MM:SS`. Vom Aufrufer, keine Uhr im Paket (A2). */
  readonly erstellt: { readonly datum: string; readonly zeit: string };
  /** `GAEBInfo/ProgSystem`, höchstens 60 Zeichen. */
  readonly programm: string;
  /** Summenstand des LV (vom Kern). Pflicht für X86 (`IT`, `Totals`); in X81/X83 nicht gelesen. */
  readonly summen?: Summenstand;
  /** Basis je Zuschlagsposition (Summe der GP ihrer Bezugspositionen, vom Kern). Für `ITMarkup` in X86. */
  readonly zuschlagsbasen?: ReadonlyMap<PositionId, Betrag>;
  /** Name des Auftragnehmers für `CTR` in X86 (der Bieter des beauftragten Angebots). */
  readonly auftragnehmer?: string;
}

/** `GAEBInfo/VersDate` je Version (Schemastand). */
export const VERSIONSDATUM: Readonly<Record<ExportVersion, string>> = { '3.3': '2021-05', '3.2': '2013-10' };

/** Grenzen aus dem XSD (Typnamen in Klammern). */
export const GRENZEN = {
  /** `BoQInfo/Name` (tgNormalizedString20). */
  name: 20,
  /** `BoQInfo/LblBoQ` (tgNormalizedString60). */
  bezeichnung: 60,
  /** `QU` (tgNormalizedString4). */
  einheit: 4,
  /** OZ einschließlich Index (F2; tgRNoPart bis 14). */
  oz: 14,
  /** Gliederungsstufen einschließlich Los (F1). */
  stufen: 5,
  /** Vorkommastellen: Menge (tgDecimal_11_3), EP (tgDecimal_13_3), Betrag (tgDecimal_13_2), Satz (tgDecimal_9_6). */
  vorkomma: { menge: 8, einheitspreis: 10, betrag: 11, satz: 3 },
  /** `ALNGroupNo` (bis 999), `ALNSerNo` (bis 9), `SubDNo` (1 bis 99). */
  wahlgruppe: 999,
  wahlvariante: 9,
  unterbeschreibung: 99,
} as const;

const RNO_ZEICHEN = /^[0-9A-Za-z_]+$/;
const DATUM = /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
const UHRZEIT = /^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;

/** Zahl der Zeichen (Codepunkte), wie das XSD `maxLength` zählt. */
const zeichen = (s: string): number => Array.from(s).length;
const kuerze = (s: string, n: number): string => Array.from(s).slice(0, n).join('');

function vorkommastellen(wert: string): number {
  const ganz = wert.replace(/^-/, '').split('.')[0] ?? '';
  return ganz.length;
}

/** GAEB-Kennung (xs:ID) aus einer Modellkennung: Präfix plus die Zeichen `[A-Za-z0-9_]`, deterministisch. */
export function gaebKennung(praefix: string, id: string): string {
  return praefix + id.replace(/[^A-Za-z0-9_]/g, '');
}

type Zahlart = keyof typeof GRENZEN.vorkomma;

interface Wahlnummer {
  readonly gruppe: number;
  readonly variante: number;
}

/**
 * Künstliche Wahlnummern (D-16) für Wahlpositionen ohne Gruppen- oder Variantennummer (aus v1 migriert, D-37.1: Wahl).
 * GAEB kennt eine Wahl nur über `ALNGroupNo`/`ALNSerNo`; als gewöhnliches `Item` ginge ihr Betrag beim Wiederlesen ins
 * Netto. Deterministisch: eine Gruppe je Grundposition, eine eigene Gruppe je Wahl ohne Grundposition, nummeriert in
 * LV-Reihenfolge oberhalb der höchsten belegten Gruppe; Varianten 1..n in LV-Reihenfolge. Die Grundposition selbst
 * bleibt, wie sie ist (die Migration erfindet keine Fachdaten). Über 9 Varianten oder 999 Gruppen prüft `merkmale`.
 */
function kuenstlicheWahlnummern(
  wurzelId: string,
  knoten: readonly Knoten[],
  kinder: ReadonlyMap<string, readonly Knoten[]>,
): ReadonlyMap<string, Wahlnummer> {
  let hoechste = 0;
  for (const k of knoten) {
    const g = k.art === 'position' ? k.merkmale.wahl?.gruppe : null;
    if (typeof g === 'number' && Number.isInteger(g) && g > hoechste) hoechste = g;
  }
  const aus = new Map<string, Wahlnummer>();
  const gruppeJeGrund = new Map<string, { readonly gruppe: number; varianten: number }>();
  const besuche = (eltern: string): void => {
    for (const k of kinder.get(eltern) ?? []) {
      const w = k.art === 'position' ? k.merkmale.wahl : null;
      if (w !== null && (w.gruppe === null || w.variante === null)) {
        const grund = w.grundpositionId;
        let g = grund === null ? undefined : gruppeJeGrund.get(grund);
        if (g === undefined) {
          hoechste += 1;
          g = { gruppe: hoechste, varianten: 0 };
          if (grund !== null) gruppeJeGrund.set(grund, g);
        }
        g.varianten += 1;
        aus.set(k.id, { gruppe: g.gruppe, variante: g.varianten });
      }
      besuche(k.id);
    }
  };
  besuche(wurzelId);
  return aus;
}

interface Verworfen {
  anzahl: number;
  readonly knotenId: string | undefined;
}

class Schreiber {
  readonly aus = new XmlAusgabe();
  readonly befunde: Pruefbefund[] = [];
  private readonly verworfen = new Map<string, Verworfen>();
  private readonly kinder = new Map<string, Knoten[]>();
  private readonly ids = new Set<string>();
  private readonly verweise: { ref: string; knotenId: string }[] = [];
  private readonly ozGesehen = new Set<string>();
  private readonly positionssummen = new Map<string, Betrag | null>();
  private readonly gliederungssummen = new Map<string, Betrag>();
  private readonly mitAnteilen: boolean;
  private readonly kuenstlicheWahl: ReadonlyMap<string, Wahlnummer>;
  private freiBezeichnung: string | null = null;

  constructor(
    private readonly inhalt: LvInhalt,
    private readonly opt: SchreibOptionen,
  ) {
    for (const k of inhalt.knoten) {
      const liste = this.kinder.get(k.elternId) ?? [];
      liste.push(k);
      this.kinder.set(k.elternId, liste);
    }
    for (const liste of this.kinder.values()) liste.sort((a, b) => a.reihenfolge - b.reihenfolge);
    this.kuenstlicheWahl = kuenstlicheWahlnummern(inhalt.wurzelId, inhalt.knoten, this.kinder);
    if (opt.summen) {
      for (const p of opt.summen.positionen) this.positionssummen.set(p.positionId, p.gesamtpreis);
      for (const g of opt.summen.gliederungen) this.gliederungssummen.set(g.gliederungId, g.summe);
    }
    this.mitAnteilen =
      opt.phase === 'X86' && inhalt.knoten.some((k) => k.art === 'position' && k.epa !== null);
  }

  get x86(): boolean {
    return this.opt.phase === 'X86';
  }

  // --- Befunde -----------------------------------------------------------------------------------------------

  melde(
    schwere: Pruefbefund['schwere'],
    code: string,
    meldung: string,
    knotenId?: string,
    feld?: string,
  ): void {
    this.befunde.push({
      schwere,
      quelle: 'gaeb-pruefung',
      code,
      meldung,
      ort: {
        ...(knotenId === undefined ? {} : { knotenId: knotenId as KnotenId }),
        ...(feld === undefined ? {} : { feld }),
      },
    });
  }

  fehler(code: string, meldung: string, knotenId?: string, feld?: string): void {
    this.melde('fehler', code, meldung, knotenId, feld);
  }

  verwirf(art: string, knotenId?: string): void {
    const v = this.verworfen.get(art);
    if (v) v.anzahl += 1;
    else this.verworfen.set(art, { anzahl: 1, knotenId });
  }

  melder(knotenId: string): TextMelder {
    return {
      verworfen: (art) => {
        this.verwirf(art, knotenId);
      },
      fehler: (code, meldung) => {
        this.fehler(code, meldung, knotenId, 'langtext');
      },
    };
  }

  abschliessen(): void {
    const ziel = `${this.opt.phase} ${this.opt.version}`;
    for (const [art, v] of this.verworfen)
      this.melde(
        'warnung',
        'export-verworfen',
        `${art}: in ${ziel} nicht abbildbar, nicht geschrieben (${String(v.anzahl)} ${v.anzahl === 1 ? 'Vorkommen' : 'Vorkommen'}).`,
        v.knotenId,
      );
    for (const v of this.verweise)
      if (!this.ids.has(v.ref))
        this.fehler(
          'verweis-ohne-ziel',
          `Der Verweis „${v.ref}“ zeigt auf kein geschriebenes Element.`,
          v.knotenId,
          'zuschlag.bezug',
        );
  }

  // --- Werte ----------------------------------------------------------------------------------------------

  kennung(praefix: string, id: string): string {
    const g = gaebKennung(praefix, id);
    if (this.ids.has(g))
      this.fehler(
        'kennung-doppelt',
        `Die GAEB-Kennung „${g}“ entsteht mehrfach (Modellkennung „${id}“).`,
        id,
      );
    this.ids.add(g);
    return g;
  }

  zahl(wert: string, art: Zahlart, bezeichnung: string, knotenId?: string, feld?: string): string {
    const grenze = GRENZEN.vorkomma[art];
    if (vorkommastellen(wert) > grenze)
      this.fehler(
        'zahl-zu-gross',
        `${bezeichnung} ${wert} hat ${String(vorkommastellen(wert))} Vorkommastellen; GAEB erlaubt höchstens ${String(grenze)}.`,
        knotenId,
        feld,
      );
    return wert;
  }

  /** Text mit Längengrenze; zu lang ist ein Fehler, geschrieben wird der Wert unverändert. */
  text(wert: string, grenze: number, bezeichnung: string, feld: string): string {
    if (zeichen(wert) > grenze)
      this.fehler(
        'wert-zu-lang',
        `${bezeichnung} „${wert}“ hat ${String(zeichen(wert))} Zeichen; GAEB erlaubt höchstens ${String(grenze)}.`,
        undefined,
        feld,
      );
    return wert;
  }

  muster(wert: string, muster: RegExp, bezeichnung: string, feld: string): string {
    if (!muster.test(wert))
      this.fehler(
        'wert-ungueltig',
        `${bezeichnung} „${wert}“ hat nicht die verlangte Form.`,
        undefined,
        feld,
      );
    return wert;
  }

  // --- Dokument ---------------------------------------------------------------------------------------------

  schreibe(): void {
    const { phase, version } = this.opt;
    const ns = `http://www.gaeb.de/GAEB_DA_XML/DA${phase.slice(1)}/${version}`;
    const a = this.aus;
    a.element('GAEB', [['xmlns', ns]], () => {
      a.element('GAEBInfo', [], () => {
        a.blatt('Version', version);
        a.blatt('VersDate', VERSIONSDATUM[version]);
        a.blatt(
          'Date',
          this.muster(this.opt.erstellt.datum, DATUM, 'Das Erstellungsdatum', 'erstellt.datum'),
        );
        a.blatt('Time', this.muster(this.opt.erstellt.zeit, UHRZEIT, 'Die Erstellungszeit', 'erstellt.zeit'));
        a.blatt('ProgSystem', this.text(this.opt.programm, 60, 'Der Programmname', 'programm'));
      });
      a.element('Award', [], () => {
        a.blatt('DP', phase.slice(1));
        this.kopfdaten();
        a.element('BoQ', [['ID', this.kennung('L', this.inhalt.wurzelId)]], () => {
          this.boqInfo();
          this.koerper(this.inhalt.wurzelId, 0, null, 0, true);
        });
      });
    });
    this.preiseDesLv();
  }

  private preiseDesLv(): void {
    if (this.x86) {
      if (!this.opt.summen)
        this.fehler(
          'pflichtelement-fehlt',
          'X86 verlangt Gesamtbeträge (Totals); der Aufrufer hat keinen Summenstand übergeben.',
          undefined,
          'summen',
        );
      return;
    }
    if (this.inhalt.nachlass !== null) this.verwirf('Nachlass des LV');
    this.verwirf('MwSt-Satz des LV');
  }

  // --- Kopfdaten (E-11) -----------------------------------------------------------------------------------

  private kopfdaten(): void {
    const { vergabeinformationen: vi, auftraggeber: ag } = this.inhalt;
    if (vi) this.vergabeinformationen(vi);
    if (ag || this.x86) {
      if (!ag && this.x86)
        this.melde(
          'warnung',
          'angabe-leer',
          'X86 verlangt einen Auftraggeber (OWN); das LV hat keinen, die Adresse wird leer geschrieben.',
          undefined,
          'auftraggeber',
        );
      this.auftraggeber(ag);
    }
    if (this.x86) {
      if (this.opt.auftragnehmer === undefined)
        this.melde(
          'warnung',
          'angabe-leer',
          'X86 verlangt einen Auftragnehmer (CTR); der Aufrufer hat keinen genannt, die Adresse wird leer geschrieben.',
          undefined,
          'auftragnehmer',
        );
      this.aus.element('CTR', [], () => {
        this.adresse(
          { name: this.opt.auftragnehmer ?? null, strasse: null, plz: null, ort: null },
          'auftragnehmer',
        );
      });
    }
  }

  private adresse(ag: Pick<Auftraggeber, 'name' | 'strasse' | 'plz' | 'ort'>, feld: string): void {
    this.aus.element('Address', [], () => {
      this.aus.blatt('Name1', this.text(ag.name ?? '', 40, 'Der Name', `${feld}.name`));
      this.aus.blatt('Street', this.text(ag.strasse ?? '', 40, 'Die Straße', `${feld}.strasse`));
      this.aus.blatt('PCode', this.text(ag.plz ?? '', 20, 'Die Postleitzahl', `${feld}.plz`));
      this.aus.blatt('City', this.text(ag.ort ?? '', 40, 'Der Ort', `${feld}.ort`));
    });
  }

  private auftraggeber(ag: Auftraggeber | undefined): void {
    this.aus.element('OWN', [], () => {
      const adresse = ag && (ag.name !== null || ag.strasse !== null || ag.plz !== null || ag.ort !== null);
      if (adresse || this.x86)
        this.adresse(ag ?? { name: null, strasse: null, plz: null, ort: null }, 'auftraggeber');
      if (ag?.vergabenummer != null)
        this.aus.blatt(
          'AwardNo',
          this.text(ag.vergabenummer, 60, 'Die Vergabenummer', 'auftraggeber.vergabenummer'),
        );
    });
  }

  private vergabeinformationen(vi: Vergabeinformationen): void {
    const a = this.aus;
    const datum = (name: string, w: string | null, feld: string): void => {
      if (w !== null)
        a.blatt(name, this.muster(w, DATUM, `Das Datum ${name}`, `vergabeinformationen.${feld}`));
    };
    const text = (name: string, w: string | null, grenze: number, feld: string): void => {
      if (w !== null) a.blatt(name, this.text(w, grenze, `Der Wert ${name}`, `vergabeinformationen.${feld}`));
    };
    a.element('AwardInfo', [], () => {
      if (this.x86) {
        // AwardInfo in X86 kennt Eröffnungstermin und Abgabeort nicht.
        if (vi.eroeffnungsdatum !== null || vi.eroeffnungszeit !== null) this.verwirf('Eröffnungstermin');
        if (vi.abgabeort !== null) this.verwirf('Abgabeort');
      } else {
        datum('OpenDate', vi.eroeffnungsdatum, 'eroeffnungsdatum');
        if (vi.eroeffnungszeit !== null) {
          if (vi.eroeffnungsdatum === null) this.verwirf('Eröffnungszeit ohne Eröffnungsdatum');
          else
            a.blatt(
              'OpenTime',
              this.muster(
                vi.eroeffnungszeit,
                UHRZEIT,
                'Die Eröffnungszeit',
                'vergabeinformationen.eroeffnungszeit',
              ),
            );
        }
        text('SubmLoc', vi.abgabeort, 60, 'abgabeort');
      }
      datum('CnstStart', vi.ausfuehrungsbeginn, 'ausfuehrungsbeginn');
      datum('CnstEnd', vi.ausfuehrungsende, 'ausfuehrungsende');
      text('ContrNo', vi.auftragsnummer, 20, 'auftragsnummer');
      datum('ContrDate', vi.auftragsdatum, 'auftragsdatum');
      text('AcceptType', vi.abnahmeart, 60, 'abnahmeart');
      const g = vi.gewaehrleistung;
      if (g !== null) {
        if (
          !Number.isInteger(g.dauer) ||
          g.dauer < 0 ||
          g.dauer > 99 ||
          !['Years', 'Months'].includes(g.einheit)
        )
          this.fehler(
            'wert-ungueltig',
            `Die Gewährleistung (${String(g.dauer)} ${g.einheit}) braucht eine ganze Zahl von 0 bis 99 und die Einheit Years oder Months.`,
            undefined,
            'vergabeinformationen.gewaehrleistung',
          );
        a.blatt('WarrDur', String(g.dauer));
        a.blatt('WarrUnit', g.einheit);
      }
    });
  }

  // --- BoQInfo ----------------------------------------------------------------------------------------------

  private boqInfo(): void {
    const a = this.aus;
    const { name, ozMaske: m } = this.inhalt;
    if (zeichen(name) > GRENZEN.name)
      this.melde(
        'warnung',
        'name-gekuerzt',
        `Der LV-Name hat ${String(zeichen(name))} Zeichen; BoQInfo/Name trägt höchstens ${String(GRENZEN.name)}. ` +
          `Er wird gekürzt geschrieben, der volle Name steht in LblBoQ${zeichen(name) > GRENZEN.bezeichnung ? ` (dort gekürzt auf ${String(GRENZEN.bezeichnung)} Zeichen)` : ''}.`,
        undefined,
        'name',
      );
    this.pruefeMaske();
    a.element('BoQInfo', [], () => {
      a.blatt('Name', kuerze(name, GRENZEN.name).trimEnd());
      a.blatt('LblBoQ', kuerze(name, GRENZEN.bezeichnung));
      a.blatt('OutlCompl', 'AllTxt');
      const stufe = (typ: string, s: OzStelle): void => {
        a.element('BoQBkdn', [], () => {
          a.blatt('Type', typ);
          a.blatt('Length', String(s.laenge));
          a.blatt('Num', s.zeichen === 'numerisch' ? 'Yes' : 'No');
        });
      };
      m.gliederung.forEach((s, i) => {
        stufe(i === 0 && m.losStufe === true ? 'Lot' : 'BoQLevel', s);
      });
      stufe('Item', m.position);
      if (m.index) stufe('Index', m.index);
      if (this.mitAnteilen) this.anteilsbezeichnungen();
      if (this.x86 && this.opt.summen) this.lvSummen(this.opt.summen);
    });
  }

  private pruefeMaske(): void {
    const m = this.inhalt.ozMaske;
    const stellen = [...m.gliederung, m.position, ...(m.index ? [m.index] : [])];
    const gesamt = stellen.reduce((s, x) => s + x.laenge, 0);
    const probleme: string[] = [];
    if (m.gliederung.length > GRENZEN.stufen)
      probleme.push(`${String(m.gliederung.length)} Gliederungsstufen (höchstens ${String(GRENZEN.stufen)})`);
    if (gesamt > GRENZEN.oz) probleme.push(`${String(gesamt)} Stellen (höchstens ${String(GRENZEN.oz)})`);
    if (stellen.some((s) => !Number.isInteger(s.laenge) || s.laenge < 1 || s.laenge > GRENZEN.oz))
      probleme.push('eine Stelle ohne Länge von 1 bis 14');
    if (m.index && m.index.laenge !== 1) probleme.push('ein Index, der nicht genau 1 Stelle hat');
    if (probleme.length > 0)
      this.fehler(
        'maske-ungueltig',
        `Die OZ-Maske ist ungültig: ${probleme.join(', ')}.`,
        undefined,
        'ozMaske',
      );
  }

  // --- Preise (X86) -----------------------------------------------------------------------------------------

  private anteilsbezeichnungen(): void {
    const a = this.aus;
    a.blatt('NoUPComps', '6');
    for (const k of this.inhalt.knoten)
      if (k.art === 'position' && k.epa?.freiBezeichnung != null) {
        this.freiBezeichnung = k.epa.freiBezeichnung;
        break;
      }
    a.blatt('LblUPComp1', 'Lohn', [['Type', 'Wages']]);
    a.blatt('LblUPComp2', 'Stoffe', [['Type', 'Materials']]);
    a.blatt('LblUPComp3', 'Geräte', [['Type', 'Plant']]);
    a.blatt('LblUPComp4', 'Nachunternehmer', [['Type', 'Miscellaneous']]);
    a.blatt('LblUPComp5', 'Sonstiges', [['Type', 'Miscellaneous']]);
    a.blatt(
      'LblUPComp6',
      this.text(this.freiBezeichnung ?? '', 20, 'Die Bezeichnung des freien Anteils', 'epa.freiBezeichnung'),
      [['Type', 'Unknown']],
    );
  }

  private anteile(epa: Einheitspreisanteile, id: string): void {
    if (epa.freiBezeichnung !== null && epa.freiBezeichnung !== this.freiBezeichnung)
      this.verwirf('Abweichende Bezeichnung des freien EP-Anteils (GAEB kennt eine je LV)', id);
    const werte = [epa.lohn, epa.stoffe, epa.geraete, epa.nachunternehmer, epa.sonstiges, epa.frei];
    werte.forEach((w, i) => {
      if (w !== null)
        this.aus.blatt(`UPComp${String(i + 1)}`, this.zahl(w, 'einheitspreis', 'Der EP-Anteil', id, 'epa'));
    });
  }

  private lvSummen(s: Summenstand): void {
    const a = this.aus;
    const g = s.gesamt;
    a.element('Totals', [], () => {
      a.blatt('Total', this.zahl(g.netto, 'betrag', 'Die Nettosumme', undefined, 'summen.netto'));
      const n = this.inhalt.nachlass;
      if (n !== null) {
        if (n.art === 'prozent')
          a.blatt('DiscountPcnt', this.zahl(n.wert, 'satz', 'Der Nachlass', undefined, 'nachlass'));
        else a.blatt('DiscountAmt', this.zahl(n.wert, 'betrag', 'Der Nachlass', undefined, 'nachlass'));
        a.blatt(
          'TotAfterDisc',
          this.zahl(g.nettoNachNachlass, 'betrag', 'Die Summe nach Nachlass', undefined, 'summen'),
        );
      }
      a.blatt('VAT', this.zahl(this.inhalt.mwstSatz, 'satz', 'Der MwSt-Satz', undefined, 'mwstSatz'));
      a.blatt('VATAmount', this.zahl(g.mwst, 'betrag', 'Die MwSt', undefined, 'summen.mwst'));
      a.blatt('TotalGross', this.zahl(g.brutto, 'betrag', 'Die Bruttosumme', undefined, 'summen.brutto'));
    });
  }

  // --- Gliederung ---------------------------------------------------------------------------------------------

  /**
   * Schreibt den `BoQBody` der Kinder von `elternId`. `tiefe`: Gliederungstiefe des Elternknotens (0 = LV);
   * `ozEltern`: dessen Ordnungszahl; `stellen`: Länge der RNoPart-Kette bis dorthin.
   */
  private koerper(
    elternId: string,
    tiefe: number,
    ozEltern: string | null,
    stellen: number,
    wurzel: boolean,
  ): void {
    const kinder = this.kinder.get(elternId) ?? [];
    if (kinder.length === 0) {
      if (wurzel) this.aus.leer('BoQBody');
      return;
    }
    const gliederungen = kinder.filter((k) => k.art === 'los' || k.art === 'titel');
    const positionen = kinder.filter((k) => k.art === 'position');
    if (gliederungen.length > 0 && positionen.length > 0)
      this.fehler(
        'gliederung-gemischt',
        'Unter demselben Knoten stehen Gliederungen und Positionen; GAEB erlaubt in einem LV-Bereich nur das eine oder das andere.',
        positionen[0]?.id,
      );
    this.aus.element('BoQBody', [], () => {
      if (gliederungen.length === 0) {
        this.positionsliste(kinder, ozEltern, stellen);
        return;
      }
      for (const k of kinder)
        if (k.art === 'los' || k.art === 'titel') this.gliederung(k, tiefe + 1, ozEltern, stellen);
        else if (k.art === 'hinweis') this.hinweis(k);
      if (positionen.length > 0) this.positionsliste(positionen, ozEltern, stellen);
    });
  }

  /** Der Teil der OZ, den dieser Knoten zur Kette beiträgt (RNoPart), geprüft gegen die Maske. */
  private ozTeil(
    k: { readonly id: string; readonly ordnungszahl: Ordnungszahl | null },
    ozEltern: string | null,
    stelle: OzStelle | undefined,
    bez: string,
  ): string {
    const oz = k.ordnungszahl;
    if (oz === null) {
      this.fehler('oz-fehlt', `${bez} hat keine Ordnungszahl; GAEB verlangt RNoPart.`, k.id, 'ordnungszahl');
      return '';
    }
    const trenn = this.inhalt.ozMaske.trennzeichen ?? '';
    const praefix = ozEltern === null || ozEltern === '' ? '' : ozEltern + trenn;
    let teil: string;
    if (oz.startsWith(praefix) && oz.length > praefix.length) teil = oz.slice(praefix.length);
    else {
      teil = trenn === '' ? oz : (oz.split(trenn).at(-1) ?? oz);
      this.fehler(
        'oz-passt-nicht-zur-maske',
        `Die Ordnungszahl ${oz} beginnt nicht mit der Ordnungszahl ${ozEltern ?? ''} des übergeordneten Bereichs.`,
        k.id,
        'ordnungszahl',
      );
    }
    if (
      !RNO_ZEICHEN.test(teil) ||
      (stelle !== undefined &&
        (teil.length > stelle.laenge || (stelle.zeichen === 'numerisch' && !/^[0-9]+$/.test(teil))))
    )
      this.fehler(
        'oz-passt-nicht-zur-maske',
        `Der Teil „${teil}“ der Ordnungszahl ${oz} passt nicht zur Stelle der Maske` +
          (stelle
            ? ` (${String(stelle.laenge)} ${stelle.zeichen === 'numerisch' ? 'Ziffern' : 'Zeichen'})`
            : '') +
          '.',
        k.id,
        'ordnungszahl',
      );
    return teil;
  }

  private gliederung(
    k: Extract<Knoten, { art: 'los' | 'titel' }>,
    tiefe: number,
    ozEltern: string | null,
    stellen: number,
  ): void {
    const m = this.inhalt.ozMaske;
    const stelle = m.gliederung[tiefe - 1];
    if (stelle === undefined)
      this.fehler(
        'gliederung-zu-tief',
        `Der Bereich liegt auf Stufe ${String(tiefe)}; die Maske hat ${String(m.gliederung.length)} Gliederungsstufen.`,
        k.id,
      );
    const teil = this.ozTeil(k, ozEltern, stelle, k.art === 'los' ? 'Das Los' : 'Der Titel');
    const a = this.aus;
    a.element(
      'BoQCtgy',
      [
        ['ID', this.kennung('G', k.id)],
        ['RNoPart', teil],
      ],
      () => {
        schreibeEinzeiler(a, 'LblTx', k.kurztext);
        this.koerper(k.id, tiefe, k.ordnungszahl ?? ozEltern, stellen + teil.length, false);
        if (this.x86 && this.opt.summen) {
          const summe = this.gliederungssummen.get(k.id);
          if (summe === undefined)
            this.fehler(
              'pflichtelement-fehlt',
              'X86 verlangt die Summe jedes LV-Bereichs (Totals); der Summenstand hat keine.',
              k.id,
            );
          else
            a.element('Totals', [], () => {
              a.blatt('Total', this.zahl(summe, 'betrag', 'Die Bereichssumme', k.id, 'summe'));
            });
        }
      },
    );
  }

  private hinweis(h: Hinweistext): void {
    const a = this.aus;
    a.element('Remark', [['ID', this.kennung('H', h.id)]], () => {
      a.element('Description', [], () => {
        a.element('CompleteText', [], () => {
          schreibeDetailtext(a, h.text, this.melder(h.id));
        });
      });
    });
  }

  private positionsliste(kinder: readonly Knoten[], ozEltern: string | null, stellen: number): void {
    this.aus.element('Itemlist', [], () => {
      for (const k of kinder)
        if (k.art === 'hinweis') this.hinweis(k);
        else if (k.art === 'position') this.position(k, ozEltern, stellen);
        else this.fehler('gliederung-gemischt', 'Ein Bereich steht zwischen Positionen.', k.id);
    });
  }

  // --- Positionen ----------------------------------------------------------------------------------------------

  private ozAttribute(p: Position, ozEltern: string | null, stellen: number): Attribute {
    const m = this.inhalt.ozMaske;
    const teil = this.ozTeil(p, ozEltern, m.position, 'Die Position');
    const index = p.ozIndex;
    if (index !== null && (zeichen(index) !== 1 || !RNO_ZEICHEN.test(index) || m.index === null))
      this.fehler(
        'oz-index-ungueltig',
        m.index === null
          ? `Die Position hat den Index „${index}“, die Maske aber keine Indexstelle.`
          : `Der Index „${index}“ muss genau ein Zeichen aus Buchstaben, Ziffern oder _ sein.`,
        p.id,
        'ozIndex',
      );
    const laenge = stellen + teil.length + (index?.length ?? 0);
    if (laenge > GRENZEN.oz)
      this.fehler(
        'oz-zu-lang',
        `Die Ordnungszahl ist ${String(laenge)} Stellen lang (mit Index); zulässig sind höchstens ${String(GRENZEN.oz)}.`,
        p.id,
        'ordnungszahl',
      );
    if (p.ordnungszahl !== null) {
      const schluessel = `${p.ordnungszahl}|${index ?? ''}`;
      if (this.ozGesehen.has(schluessel))
        this.fehler(
          'oz-doppelt',
          `Die Ordnungszahl ${p.ordnungszahl}${index ?? ''} kommt mehrfach vor.`,
          p.id,
          'ordnungszahl',
        );
      this.ozGesehen.add(schluessel);
    }
    return [
      ['ID', this.kennung('P', p.id)],
      ['RNoPart', teil],
      ['RNoIndex', index],
    ];
  }

  /** Gemeinsame Merkmale von Item und MarkupItem, in Schemareihenfolge bis `HourIt`. */
  private merkmale(p: Position, zuschlag: boolean): void {
    const a = this.aus;
    const m = p.merkmale;
    const w = m.wahl;
    if (w !== null) {
      const kuenstlich = this.kuenstlicheWahl.get(p.id);
      const { gruppe, variante } = kuenstlich ?? w;
      if (kuenstlich !== undefined)
        this.melde(
          'warnung',
          'wahl-nummer-vergeben',
          `Die Wahlposition hat keine Gruppen- und Variantennummer; sie wird als Gruppe ${String(kuenstlich.gruppe)}, ` +
            `Variante ${String(kuenstlich.variante)} geschrieben (künstlich vergeben, D-16).`,
          p.id,
          'merkmale.wahl',
        );
      if (gruppe !== null && variante !== null) {
        if (
          !Number.isInteger(gruppe) ||
          gruppe < 0 ||
          gruppe > GRENZEN.wahlgruppe ||
          !Number.isInteger(variante) ||
          variante < 0 ||
          variante > GRENZEN.wahlvariante
        )
          this.fehler(
            'wahl-nummer-ungueltig',
            `Gruppe ${String(gruppe)} und Variante ${String(variante)} der Wahl liegen außerhalb von 0–999 bzw. 0–9.`,
            p.id,
            'merkmale.wahl',
          );
        a.blatt('ALNGroupNo', String(gruppe));
        a.blatt('ALNSerNo', String(variante));
      }
    }
    if (m.bedarf !== null) a.blatt('Provis', m.bedarf === 'mit-gesamtbetrag' ? 'WithTotal' : 'WithoutTotal');
    if (m.pauschal) {
      if (zuschlag) this.verwirf('Pauschal an einer Zuschlagsposition', p.id);
      else a.blatt('LumpSumItem', 'Yes');
    }
    if (m.stundenlohn) a.blatt('HourIt', 'Yes');
    if (m.zuschlagskennzeichen) {
      if (zuschlag) this.verwirf('Zuschlagskennzeichen an einer Zuschlagsposition', p.id);
      else a.blatt('MarkupIt', 'Yes');
    }
  }

  private beschreibung(p: Position): void {
    const a = this.aus;
    a.element('Description', [], () => {
      a.element('CompleteText', [], () => {
        schreibeDetailtext(a, p.langtext, this.melder(p.id));
        schreibeKurztext(a, p.kurztext);
      });
    });
  }

  private position(p: Position, ozEltern: string | null, stellen: number): void {
    const z = p.zuschlag;
    const altform = z !== null && z.prozentsatz === null && (p.menge !== null || p.einheitspreis !== null);
    if (z !== null && !(altform && this.x86)) {
      this.zuschlagsposition(p, ozEltern, stellen, altform);
      return;
    }
    if (altform)
      this.verwirf(
        'Altform der Zuschlagsposition (Menge × EP ohne Satz): als Position ohne Zuschlagsbezug geschrieben',
        p.id,
      );
    const a = this.aus;
    a.element('Item', this.ozAttribute(p, ozEltern, stellen), () => {
      this.merkmale(p, false);
      if (p.menge !== null) a.blatt('Qty', this.zahl(p.menge, 'menge', 'Die Menge', p.id, 'menge'));
      else if (this.opt.phase === 'X83') {
        a.blatt('QtyTBD', 'Yes');
        this.melde(
          'warnung',
          'menge-offen',
          'Die Position hat keine Menge; X83 schreibt „Menge noch festzulegen“ (QtyTBD).',
          p.id,
          'menge',
        );
      }
      this.einheit(p.einheit, p.id, 'einheit', this.opt.phase === 'X83');
      this.preise(p);
      this.beschreibung(p);
      this.leitbeschreibung(p);
    });
  }

  private einheit(einheit: string | null, id: string, feld: string, pflicht: boolean): void {
    if (einheit === null) {
      if (pflicht)
        this.fehler('einheit-fehlt', 'X83 verlangt je Position eine Mengeneinheit (QU).', id, feld);
      return;
    }
    if (zeichen(einheit) > GRENZEN.einheit || /[\r\n]/.test(einheit))
      this.fehler(
        'einheit-ungueltig',
        `Die Einheit „${einheit}“ muss einzeilig sein und darf höchstens ${String(GRENZEN.einheit)} Zeichen haben.`,
        id,
        feld,
      );
    this.aus.blatt('QU', einheit);
  }

  private preise(p: Position): void {
    if (!this.x86) {
      if (p.einheitspreis !== null) this.verwirf('Einheitspreise', p.id);
      if (p.epa !== null) this.verwirf('Einheitspreisanteile', p.id);
      return;
    }
    if (p.einheitspreis !== null) {
      this.aus.blatt(
        'UP',
        this.zahl(p.einheitspreis, 'einheitspreis', 'Der Einheitspreis', p.id, 'einheitspreis'),
      );
      if (p.epa !== null) this.anteile(p.epa, p.id);
    } else if (p.epa !== null) this.verwirf('Einheitspreisanteile ohne Einheitspreis', p.id);
    const gp = this.positionssummen.get(p.id);
    if (gp != null) this.aus.blatt('IT', this.zahl(gp, 'betrag', 'Der Gesamtpreis', p.id, 'gesamtpreis'));
  }

  private leitbeschreibung(p: Position): void {
    const l = p.leitbeschreibung;
    if (l === undefined) return;
    const a = this.aus;
    a.blatt('SumDescr', 'Yes');
    for (const u of l.unterbeschreibungen)
      a.element('SubDescr', [], () => {
        const n = /^[0-9]+$/.test(u.nummer) ? Number(u.nummer) : NaN;
        if (!(n >= 1 && n <= GRENZEN.unterbeschreibung))
          this.fehler(
            'unterbeschreibung-nummer-ungueltig',
            `Die Nummer „${u.nummer}“ der Unterbeschreibung muss eine Zahl von 1 bis 99 sein.`,
            p.id,
            'leitbeschreibung',
          );
        a.blatt('SubDNo', u.nummer);
        a.element('Description', [], () => {
          a.element('CompleteText', [], () => {
            schreibeDetailtext(a, u.langtext, this.melder(p.id));
            schreibeKurztext(a, u.kurztext);
          });
        });
        if (u.menge !== null) {
          a.blatt('QtySpec', 'Yes');
          a.blatt(
            'Qty',
            this.zahl(u.menge, 'menge', 'Die Menge der Unterbeschreibung', p.id, 'leitbeschreibung'),
          );
          this.einheit(u.einheit, p.id, 'leitbeschreibung', false);
        } else if (u.einheit !== null) this.verwirf('Einheit einer Unterbeschreibung ohne Menge', p.id);
      });
  }

  private zuschlagsposition(p: Position, ozEltern: string | null, stellen: number, altform: boolean): void {
    const z = p.zuschlag;
    if (z === null) return;
    const a = this.aus;
    if (altform)
      this.verwirf('Menge, Einheit und EP der Altform einer Zuschlagsposition (Menge × EP ohne Satz)', p.id);
    else if (p.menge !== null || p.einheit !== null || p.einheitspreis !== null || p.epa !== null)
      this.verwirf('Menge, Einheit und EP einer Zuschlagsposition', p.id);
    if (p.leitbeschreibung !== undefined) this.verwirf('Leitbeschreibung an einer Zuschlagsposition', p.id);
    a.element('MarkupItem', this.ozAttribute(p, ozEltern, stellen), () => {
      this.merkmale(p, true);
      const b = z.bezug;
      a.blatt(
        'MarkupType',
        b.art === 'positionen' ? 'ListInSubQty' : b.art === 'gliederung' ? 'AllInCat' : 'IdentAsMark',
      );
      if (b.art === 'positionen')
        for (const bp of b.positionen)
          a.element('MarkupSubQty', [], () => {
            const ref = gaebKennung('P', bp.positionId);
            this.verweise.push({ ref, knotenId: p.id });
            a.leer('RefItem', [['IDRef', ref]]);
            if (bp.teilmenge !== null)
              a.blatt('SubQty', this.zahl(bp.teilmenge, 'menge', 'Die Teilmenge', p.id, 'zuschlag.bezug'));
          });
      if (this.x86) {
        const basis = this.opt.zuschlagsbasen?.get(p.id);
        if (basis === undefined)
          this.fehler(
            'pflichtelement-fehlt',
            'X86 verlangt die Basis der Zuschlagsposition (ITMarkup); der Aufrufer hat keine übergeben.',
            p.id,
            'zuschlag',
          );
        else a.blatt('ITMarkup', this.zahl(basis, 'betrag', 'Die Zuschlagsbasis', p.id, 'zuschlag'));
        if (z.prozentsatz === null)
          this.fehler(
            'pflichtelement-fehlt',
            'X86 verlangt den Zuschlagssatz (Markup); die Zuschlagsposition hat keinen.',
            p.id,
            'zuschlag.prozentsatz',
          );
        else
          a.blatt(
            'Markup',
            this.zahl(z.prozentsatz, 'satz', 'Der Zuschlagssatz', p.id, 'zuschlag.prozentsatz'),
          );
        const gp = this.positionssummen.get(p.id);
        if (gp != null) a.blatt('IT', this.zahl(gp, 'betrag', 'Der Zuschlagsbetrag', p.id, 'gesamtpreis'));
      } else if (z.prozentsatz !== null) this.verwirf('Zuschlagssätze', p.id);
      this.beschreibung(p);
    });
  }
}

function kommentar(s: string): string {
  return s.replace(/-{2,}/g, '–').replace(/-$/, '–');
}

/**
 * Schreibt ein LV als GAEB DA XML. Wirft nie bei Inhalt: Probleme sind Befunde der eigenen Prüfung; ein Fehler
 * macht den Export zum Entwurf (`entwurf: true`, Kommentar am Anfang), sperrt ihn aber nicht (U5).
 */
export function schreibeGaeb(inhalt: LvInhalt, optionen: SchreibOptionen): GaebExport {
  const s = new Schreiber(inhalt, optionen);
  s.schreibe();
  s.abschliessen();
  const fehler = s.befunde.filter((b) => b.schwere === 'fehler');
  const entwurf = fehler.length > 0;
  let kopf = '<?xml version="1.0" encoding="UTF-8"?>\n';
  if (entwurf) {
    const erster = fehler[0];
    kopf += `<!-- ${kommentar(
      `Entwurf: Die eigene Prüfung fand ${String(fehler.length)} ${fehler.length === 1 ? 'Fehler' : 'Fehler'}` +
        (erster ? `, zuerst ${erster.code}: ${erster.meldung}` : '') +
        ' Die Datei ist nicht zur Weitergabe bestimmt.',
    )} -->\n`;
  }
  return {
    phase: optionen.phase,
    version: optionen.version,
    xml: kopf + s.aus.text(),
    befunde: s.befunde,
    entwurf,
  };
}
