// SPDX-License-Identifier: AGPL-3.0-or-later
// Aufmaßblatt → GAEB DA XML 3.3/3.2, Phase X31 (Mengenermittlung; Ticket 83, M3). Rein (A2): Datum, Uhrzeit und
// Programmname liefert der Aufrufer. Umkehrung von `x31Lesen`; Zeilenformat in `reb.ts`.
//
// Lesarten (Entscheidungen D-83.x in Ticket 83):
// - Geschrieben werden Ansatzzeilen der Formel 91. Ein Bezug `Z<n>` und ein Variablenname werden zur Zeilennummer der
//   Datei (fortlaufend über die Datei, Blatt 0001 ab Zeile B0); der Variablenname selbst entfällt mit Warnung.
// - Eine Position mit einer Zeile, die X31 so nicht abbildet (andere Formel, Textform, Bezug ohne frühere Zeile, „=“ oder
//   Zeilenumbruch im Ausdruck), entfällt ganz, mit Warnung: Eine Teilmenge wäre beim Empfänger eine falsche Menge (Q5).
// - Eine Menge ohne Mengenansatz (von Hand) steht in `Qty`; neben einem Ansatz nicht (die Menge rechnet der Empfänger).
// - Bezeichnung und Datum des Blatts hat X31 nicht (D-83.6): Warnung.
// Jeder Export geht durch die eigene Prüfung (ADR 0010); Fehler machen ihn zum Entwurf, sperren ihn aber nie (U5).

import type {
  Ansatzzeile,
  Aufmass,
  Aufmassposition,
  AuftragsLvZustand,
  GaebExport,
  Knoten,
  KnotenId,
  Position,
  PositionId,
  Pruefbefund,
} from '@tethys/vertrag';
import { kinderJeEltern, vorkommastellen, type KinderMap } from '@tethys/kern';
import { XmlAusgabe } from './ausgabe';
import { FORMEL_91, MAX_ZEILEN, VERWEIS, aufteilen, rechenzeile91, zeilennummer } from './reb';
import { DATUM, GRENZEN, UHRZEIT, VERSIONSDATUM, exportKopf, gaebKennung } from './schreiben';
import type { ExportVersion } from './schreiben';

export interface X31SchreibOptionen {
  /** Für `GAEBInfo/Date` und `Time`: `JJJJ-MM-TT`, `HH:MM:SS`. Vom Aufrufer, keine Uhr im Paket (A2). */
  readonly erstellt: { readonly datum: string; readonly zeit: string };
  /** `GAEBInfo/ProgSystem`, höchstens 60 Zeichen. */
  readonly programm: string;
}

/** Verfahren der Zeilen (`QtyDetermInfo/MethodDescription`). */
const VERFAHREN = 'REB23003-2009';
/** Ein Wort im Sinn des freien Rechenansatzes: Bezug `Z<n>` oder Variablenname. */
const WORT = /\p{L}[\p{L}0-9_]*/gu;
const BEZUG = /^Z([0-9]+)$/;

const VERWORFEN_ZEILE =
  'Aufmaßposition mit einer Ansatzzeile, die X31 nicht abbildet (andere Formel als 91, Textform aus einem Import, Bezug ' +
  'oder Name ohne frühere Zeile der Position, „=“ oder Zeilenumbruch im Ausdruck); die Position entfällt ganz';
const VERWORFEN_VARIABLE = 'Variablenname einer Ansatzzeile (X31 verweist über die Zeilennummer)';

/** Was eine Position in der Datei trägt. */
interface Positionszeilen {
  readonly qty: string | null;
  readonly zeilen: readonly string[];
}

class X31Schreiber {
  readonly aus = new XmlAusgabe();
  readonly befunde: Pruefbefund[] = [];
  private readonly verworfen = new Map<string, { anzahl: number; readonly knotenId: string | undefined }>();
  private readonly kinder: KinderMap;
  private readonly aufgemessen = new Map<PositionId, Aufmassposition>();
  private readonly geschrieben = new Map<PositionId, Positionszeilen>();
  private zaehler = 0;

  constructor(
    private readonly aufmass: Aufmass,
    private readonly lv: AuftragsLvZustand['auftragsLeistungsverzeichnis'],
    private readonly version: ExportVersion,
    private readonly opt: X31SchreibOptionen,
  ) {
    this.kinder = kinderJeEltern(lv.knoten); // Kinder je Elternknoten nach `reihenfolge` (Kern, S9)
    const imLv = new Set(lv.knoten.filter((k) => k.art === 'position').map((k) => k.id as string));
    for (const a of aufmass.positionen) {
      if (!imLv.has(a.positionId))
        this.melde(
          'fehler',
          'position-unbekannt',
          `Die Aufmaßposition zur Kennung ${a.positionId} gehört zu keiner Position des Auftrags-LV; sie wird nicht geschrieben.`,
          a.positionId,
        );
      else if (this.aufgemessen.has(a.positionId))
        this.melde(
          'fehler',
          'position-doppelt',
          'Das Aufmaßblatt hat zu dieser Position mehrere Zeilen; geschrieben wird die erste.',
          a.positionId,
        );
      else this.aufgemessen.set(a.positionId, a);
    }
  }

  // --- Befunde -------------------------------------------------------------------------------------------------

  private melde(schwere: Pruefbefund['schwere'], code: string, meldung: string, knotenId?: string): void {
    this.befunde.push({
      schwere,
      quelle: 'gaeb-pruefung',
      code,
      meldung,
      ort: knotenId === undefined ? {} : { knotenId: knotenId as KnotenId },
    });
  }

  private verwirf(art: string, knotenId?: string): void {
    const v = this.verworfen.get(art);
    if (v) v.anzahl += 1;
    else this.verworfen.set(art, { anzahl: 1, knotenId });
  }

  abschliessen(): void {
    for (const [art, v] of this.verworfen)
      this.melde(
        'warnung',
        'export-verworfen',
        `${art}: in X31 ${this.version} nicht abbildbar, nicht geschrieben (${String(v.anzahl)} Vorkommen).`,
        v.knotenId,
      );
  }

  // --- Zeilen ---------------------------------------------------------------------------------------------------

  /** Die Zeilen aller aufgemessenen Positionen in der Reihenfolge des Auftrags-LV (so werden sie auch geschrieben). */
  vorbereiten(): void {
    if (this.aufmass.bezeichnung !== '') this.verwirf('Bezeichnung des Aufmaßblatts');
    if (this.aufmass.datum !== null) this.verwirf('Datum des Aufmaßblatts');
    const besuche = (eltern: string): void => {
      for (const k of this.kinder.get(eltern) ?? []) {
        if (k.art === 'position') {
          const a = this.aufgemessen.get(k.id);
          if (a !== undefined) this.position(k, a);
        } else besuche(k.id);
      }
    };
    besuche(this.lv.id);
  }

  private position(p: Position, a: Aufmassposition): void {
    if (a.mengenansatz === null) {
      if (a.menge === null) {
        this.verwirf('Aufmaßzeile ohne Menge und ohne Mengenansatz', p.id);
        return;
      }
      if (vorkommastellen(a.menge) > GRENZEN.vorkomma.menge)
        this.melde(
          'fehler',
          'zahl-zu-gross',
          `Die Menge ${a.menge} hat mehr als ${String(GRENZEN.vorkomma.menge)} Vorkommastellen.`,
          p.id,
        );
      this.geschrieben.set(p.id, { qty: a.menge, zeilen: [] });
      return;
    }
    const zeilen = this.ansatzzeilen(a.mengenansatz);
    if (zeilen === null) {
      this.verwirf(VERWORFEN_ZEILE, p.id);
      return;
    }
    if (a.mengenansatz.some((z) => z.variable !== null)) this.verwirf(VERWORFEN_VARIABLE, p.id);
    this.zaehler += zeilen.length;
    if (this.zaehler > MAX_ZEILEN)
      this.melde(
        'fehler',
        'zeilen-zu-viele',
        `Die Datei bräuchte mehr als ${String(MAX_ZEILEN)} Zeilennummern.`,
        p.id,
      );
    this.geschrieben.set(p.id, { qty: null, zeilen });
  }

  /** Die Dateizeilen eines Mengenansatzes, oder `null`, wenn eine Zeile nicht abbildbar ist. */
  private ansatzzeilen(ansatz: readonly Ansatzzeile[]): string[] | null {
    const jeZeile = new Map<number, string>();
    const jeName = new Map<string, string>();
    const aus: string[] = [];
    for (const z of ansatz) {
      if (z.formel !== FORMEL_91 || z.ausdruck.startsWith('*') || /[=\r\n\t]/.test(z.ausdruck)) return null;
      let ersetzt = 0;
      const fehlend: string[] = [];
      const text = z.ausdruck.replace(WORT, (wort) => {
        const b = BEZUG.exec(wort);
        const nummer = b ? jeZeile.get(Number(b[1])) : jeName.get(wort);
        if (nummer === undefined) {
          fehlend.push(wort);
          return wort;
        }
        ersetzt += 1;
        return nummer;
      });
      // Jeder Verweis muss beim Lesen wieder einer sein (nicht an eine Zahl angehängt) und sonst kein Buchstabe bleiben.
      if (
        fehlend.length > 0 ||
        (text.match(VERWEIS) ?? []).length !== ersetzt ||
        /\p{L}/u.test(text.replace(VERWEIS, ''))
      )
        return null;
      const teile = aufteilen(text);
      let nummer = '';
      for (const teil of teile) {
        nummer = zeilennummer(this.zaehler + aus.length);
        aus.push(rechenzeile91(teil, nummer));
      }
      if (jeZeile.has(z.zeile)) return null;
      jeZeile.set(z.zeile, nummer);
      if (z.variable !== null && !jeName.has(z.variable)) jeName.set(z.variable, nummer);
    }
    return aus;
  }

  // --- Dokument -----------------------------------------------------------------------------------------------

  schreibe(): void {
    const a = this.aus;
    const { erstellt, programm } = this.opt;
    if (!DATUM.test(erstellt.datum))
      this.melde(
        'fehler',
        'wert-ungueltig',
        `Das Erstellungsdatum „${erstellt.datum}“ hat nicht die Form JJJJ-MM-TT.`,
      );
    if (!UHRZEIT.test(erstellt.zeit))
      this.melde(
        'fehler',
        'wert-ungueltig',
        `Die Erstellungszeit „${erstellt.zeit}“ hat nicht die Form HH:MM:SS.`,
      );
    if (Array.from(programm).length > 60)
      this.melde('fehler', 'wert-zu-lang', `Der Programmname hat mehr als 60 Zeichen.`);
    a.element('GAEB', [['xmlns', `http://www.gaeb.de/GAEB_DA_XML/DA31/${this.version}`]], () => {
      a.element('GAEBInfo', [], () => {
        a.blatt('Version', this.version);
        a.blatt('VersDate', VERSIONSDATUM[this.version]);
        a.blatt('Date', erstellt.datum);
        a.blatt('Time', erstellt.zeit);
        a.blatt('ProgSystem', programm);
      });
      a.element('QtyDeterm', [], () => {
        a.element('QtyDetermInfo', [], () => {
          a.blatt('MethodDescription', VERFAHREN);
        });
        a.blatt('DP', '31');
        a.element('BoQ', [['ID', gaebKennung('L', this.lv.id)]], () => {
          this.maske();
          this.koerper(this.lv.id, null, true);
        });
      });
    });
  }

  private maske(): void {
    const a = this.aus;
    const m = this.lv.ozMaske;
    const stufe = (typ: string, laenge: number, numerisch: boolean): void => {
      a.element('BoQBkdn', [], () => {
        a.blatt('Type', typ);
        a.blatt('Length', String(laenge));
        a.blatt('Num', numerisch ? 'Yes' : 'No');
      });
    };
    m.gliederung.forEach((s, i) => {
      stufe(i === 0 && m.losStufe === true ? 'Lot' : 'BoQLevel', s.laenge, s.zeichen === 'numerisch');
    });
    stufe('Item', m.position.laenge, m.position.zeichen === 'numerisch');
    if (m.index) stufe('Index', m.index.laenge, m.index.zeichen === 'numerisch');
  }

  /** Enthält der Teilbaum unter `id` eine geschriebene Position? */
  private traegt(k: Knoten): boolean {
    if (k.art === 'position') return this.geschrieben.has(k.id);
    if (k.art === 'hinweis') return false;
    return (this.kinder.get(k.id) ?? []).some((c) => this.traegt(c));
  }

  private teil(k: Knoten & { readonly ordnungszahl: string | null }, ozEltern: string | null): string {
    const oz = k.ordnungszahl;
    if (oz === null) {
      this.melde('fehler', 'oz-fehlt', 'Der Knoten hat keine Ordnungszahl; GAEB verlangt RNoPart.', k.id);
      return '';
    }
    const trenn = this.lv.ozMaske.trennzeichen ?? '';
    const praefix = ozEltern === null || ozEltern === '' ? '' : ozEltern + trenn;
    if (oz.startsWith(praefix) && oz.length > praefix.length) return oz.slice(praefix.length);
    this.melde(
      'fehler',
      'oz-passt-nicht-zur-maske',
      `Die Ordnungszahl ${oz} beginnt nicht mit der Ordnungszahl ${ozEltern ?? ''} des übergeordneten Bereichs.`,
      k.id,
    );
    return trenn === '' ? oz : (oz.split(trenn).at(-1) ?? oz);
  }

  private koerper(elternId: string, ozEltern: string | null, wurzel: boolean): void {
    const kinder = (this.kinder.get(elternId) ?? []).filter((k) => this.traegt(k));
    if (kinder.length === 0) {
      if (wurzel) this.aus.leer('BoQBody');
      return;
    }
    const gliederungen = kinder.filter((k) => k.art === 'los' || k.art === 'titel');
    const positionen = kinder.filter((k): k is Position => k.art === 'position');
    if (gliederungen.length > 0 && positionen.length > 0)
      this.melde(
        'fehler',
        'gliederung-gemischt',
        'Unter demselben Knoten stehen Gliederungen und aufgemessene Positionen; X31 erlaubt in einem LV-Bereich nur das eine oder das andere.',
        positionen[0]?.id,
      );
    const a = this.aus;
    a.element('BoQBody', [], () => {
      for (const g of gliederungen)
        a.element(
          'BoQCtgy',
          [
            ['ID', gaebKennung('G', g.id)],
            ['RNoPart', this.teil(g, ozEltern)],
          ],
          () => {
            this.koerper(g.id, g.ordnungszahl ?? ozEltern, false);
          },
        );
      if (positionen.length > 0)
        a.element('Itemlist', [], () => {
          for (const p of positionen) this.item(p, ozEltern);
        });
    });
  }

  private item(p: Position, ozEltern: string | null): void {
    const z = this.geschrieben.get(p.id);
    if (z === undefined) return;
    const a = this.aus;
    a.element(
      'Item',
      [
        ['ID', gaebKennung('P', p.id)],
        ['RNoPart', this.teil(p, ozEltern)],
        ['RNoIndex', p.ozIndex],
      ],
      () => {
        a.element('QtyDeterm', [], () => {
          if (z.qty !== null) a.blatt('Qty', z.qty);
          for (const row of z.zeilen)
            a.element('QDetermItem', [], () => {
              a.leer('QTakeoff', [['Row', row]]);
            });
        });
      },
    );
  }
}

/**
 * Schreibt ein Aufmaßblatt als GAEB DA XML X31 gegen das Auftrags-LV, dessen Positionen es aufmisst. Wirft nie bei
 * Inhalt: Probleme sind Befunde der eigenen Prüfung (`gaeb-pruefung`); ein Fehler macht den Export zum Entwurf, sperrt ihn
 * aber nicht (U5).
 */
export function aufmassAlsX31(
  aufmass: Aufmass,
  auftragsLv: AuftragsLvZustand,
  version: ExportVersion,
  opt: X31SchreibOptionen,
): GaebExport {
  const s = new X31Schreiber(aufmass, auftragsLv.auftragsLeistungsverzeichnis, version, opt);
  s.vorbereiten();
  s.schreibe();
  s.abschliessen();
  const { kopf, entwurf } = exportKopf(s.befunde);
  return { phase: 'X31', version, xml: kopf + s.aus.text(), befunde: s.befunde, entwurf };
}
