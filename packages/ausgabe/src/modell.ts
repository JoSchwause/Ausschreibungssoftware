// SPDX-License-Identifier: AGPL-3.0-or-later
// Ausgabemodell: der LV-Baum als flache Liste druckfertiger Zeilen, alle Zahlen schon de-DE formatiert (N4). Der Renderer
// (pdfmake in `pdf.ts`, später Excel) liest nur dieses Modell, nie den Vertragstyp; so bleibt er tauschbar (ADR 0012).
// Das Paket rechnet nichts (A2): Beträge kommen aus dem `Summenstand` des `LvZustand`, Zahlen werden nur über
// `@tethys/dezimal` formatiert. Ob Preise gedruckt werden, entscheidet `mitPreisen` hier, nicht der Renderer: Ohne Preise
// stehen sie nirgends im Modell.

import {
  formatiereBetragDe,
  formatiereEinheitspreisDe,
  formatiereMengeDe,
  formatiereProzentDe,
  vorzeichen,
} from '@tethys/dezimal';
import type {
  Bauherr,
  Betrag,
  GliederungId,
  HinweistextId,
  Knoten,
  Langtext,
  LvZustand,
  Position,
  PositionId,
  Zuschlag,
} from '@tethys/vertrag';
import { kuerzeBloecke } from './kuerzen';
import { langtextAlsBloecke } from './langtext';
import type { DruckBlock } from './langtext';

export interface KopfFeld {
  readonly bezeichnung: string;
  readonly wert: string;
}

/** Kopf bzw. Deckblatt: nur gesetzte Angaben (E-11). */
export interface Kopf {
  readonly lvName: string;
  /** Projekt, Bauherr, Auftraggeber und Vergabeinformationen als Bezeichnung und Wert, in fester Reihenfolge. */
  readonly felder: readonly KopfFeld[];
}

export interface TitelZeile {
  readonly art: 'titel';
  /** Kennung des Loses bzw. Titels (für Renderer, die zurückgelesen werden, z. B. Excel). */
  readonly knotenId: GliederungId;
  /** 1 = oberste Gliederungsebene. */
  readonly ebene: number;
  readonly ordnungszahl: string;
  readonly kurztext: string;
}

export interface TitelsummeZeile {
  readonly art: 'titelsumme';
  readonly ebene: number;
  readonly ordnungszahl: string;
  readonly kurztext: string;
  readonly summe: string;
  /** Bedarfs- bzw. Wahlsumme unter diesem Titel (F4), `null`: keine oder null. Gehen nicht in `summe` ein. */
  readonly bedarf: string | null;
  readonly wahl: string | null;
}

export interface UnterbeschreibungZeile {
  readonly nummer: string;
  readonly kurztext: string;
  readonly langtext: readonly DruckBlock[];
  /** Leer: keine Mengenangabe. */
  readonly menge: string;
  readonly einheit: string;
}

export interface ZuschlagAngabe {
  /** Zuschlagssatz, z. B. `10,00 %`; leer ohne Preise oder wenn der Satz im LV nicht gesetzt ist. */
  readonly satz: string;
  /** Wortlaut des Bezugs, z. B. `auf die gekennzeichneten Positionen`. */
  readonly bezug: string;
}

export interface PositionZeile {
  readonly art: 'position';
  readonly knotenId: PositionId;
  readonly ordnungszahl: string;
  readonly kurztext: string;
  /** Sichtbare Merkmale (F5): Bedarf, Wahl mit Gruppe und Variante, Stundenlohn, Pauschal. */
  readonly merkmale: readonly string[];
  /** Nur bei einer Zuschlagsposition (F3). Der Betrag steht in `gesamtpreis`, so wie der Kern ihn berechnet hat. */
  readonly zuschlag: ZuschlagAngabe | null;
  readonly langtext: readonly DruckBlock[];
  readonly unterbeschreibungen: readonly UnterbeschreibungZeile[];
  readonly menge: string;
  readonly einheit: string;
  /** Leer ohne Preise. */
  readonly einheitspreis: string;
  /** Leer ohne Preise. */
  readonly gesamtpreis: string;
  /** `false`: Der Kern nimmt die Position nicht in die Summen auf (Bedarf, Wahl); der Druck weist das aus. */
  readonly gehtInSummeEin: boolean;
}

export interface HinweisZeile {
  readonly art: 'hinweis';
  readonly knotenId: HinweistextId;
  readonly text: readonly DruckBlock[];
}

export type AusgabeZeile = TitelZeile | TitelsummeZeile | PositionZeile | HinweisZeile;

export interface SummenBlock {
  readonly netto: string;
  /** `null`: kein Nachlass am LV. */
  readonly nachlass: { readonly bezeichnung: string; readonly betrag: string } | null;
  readonly nettoNachNachlass: string;
  readonly mwstBezeichnung: string;
  readonly mwst: string;
  readonly brutto: string;
  /** Summe der Bedarfspositionen ohne Gesamtbetrag (F4); `null`: das LV hat keine solchen Positionen. */
  readonly bedarf: string | null;
  /** Summe der Wahlpositionen (F4); `null`: das LV hat keine Wahlpositionen. */
  readonly wahl: string | null;
}

export interface Ausgabemodell {
  readonly name: string;
  readonly kopf: Kopf;
  /** Druckdatum `TT.MM.JJJJ` (Eingabe, keine Uhr im Paket); `null`: keines. */
  readonly datum: string | null;
  /** `false`: Blankett für Bieter, es steht kein Preis im Modell. */
  readonly mitPreisen: boolean;
  readonly zeilen: readonly AusgabeZeile[];
  /** `null` ohne Preise oder ohne Schlussblock. */
  readonly summen: SummenBlock | null;
}

/** Wie viel vom Langtext ins Modell kommt (Druckprofil, Ticket 77). */
export type LangtextUmfang =
  | { readonly art: 'voll' }
  | { readonly art: 'kein' }
  /** Die ersten `anzahl` Zeilen (Absatz, Listenpunkt, Tabellenzeile; ein Zeilenumbruch im Absatz zählt mit). */
  | { readonly art: 'zeilen'; readonly anzahl: number };

export interface ModellOptionen {
  /** Vorgabe `true`. `false`: Blankett, EP, GP, Titelsummen und Schlussblock entfallen. */
  readonly mitPreisen?: boolean;
  /** Druckdatum als `JJJJ-MM-TT`. */
  readonly datum?: string;
  /** Projekt des LV (der `LvZustand` kennt nur die `projektId`). */
  readonly projekt?: { readonly name: string; readonly bauherr: Bauherr };
  /** Vorgabe `{ art: 'voll' }`. Gilt für Positionen und Unterbeschreibungen; Hinweistexte bleiben stehen. */
  readonly langtext?: LangtextUmfang;
  /** Vorgabe `true`. `false`: keine Titelsummen (ohne Preise ohnehin keine). */
  readonly titelsummen?: boolean;
  /** Vorgabe `true`. `false`: kein Schlussblock (Netto bis Brutto, Bedarfs- und Wahlsumme); `summen` ist dann `null`. */
  readonly schlussblock?: boolean;
  /** Vorgabe `true`. `false`: der Kopf trägt nur den LV-Namen, keine Angaben zu Projekt, Bauherr, Auftraggeber, Vergabe. */
  readonly deckblatt?: boolean;
}

// --- Formatieren von Kopfangaben ----------------------------------------------------------------

/** `JJJJ-MM-TT` als `TT.MM.JJJJ`; anderes bleibt unverändert. */
export function datumDe(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3] ?? ''}.${m[2] ?? ''}.${m[1] ?? ''}` : iso;
}

function zeitDe(zeit: string): string {
  const m = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(zeit);
  return m ? `${m[1] ?? ''}:${m[2] ?? ''} Uhr` : zeit;
}

const DAUEREINHEITEN: Record<string, readonly [string, string]> = {
  Years: ['Jahr', 'Jahre'],
  Months: ['Monat', 'Monate'],
  Weeks: ['Woche', 'Wochen'],
  Days: ['Tag', 'Tage'],
};

const verbinde = (teile: readonly (string | null | undefined)[], mit = ', '): string =>
  teile.filter((t): t is string => t !== null && t !== undefined && t.trim() !== '').join(mit);

function baueKopf(zustand: LvZustand, optionen: ModellOptionen): Kopf {
  const lv = zustand.leistungsverzeichnis;
  const felder: KopfFeld[] = [];
  const feld = (bezeichnung: string, wert: string | null | undefined): void => {
    if (wert !== null && wert !== undefined && wert.trim() !== '') felder.push({ bezeichnung, wert });
  };
  const { projekt } = optionen;
  if (projekt) {
    feld('Projekt', projekt.name);
    feld('Bauherr', verbinde([projekt.bauherr.name, projekt.bauherr.anschrift]));
  }
  const ag = lv.auftraggeber;
  if (ag) {
    feld('Auftraggeber', verbinde([ag.name, ag.strasse, verbinde([ag.plz, ag.ort], ' ')]));
    feld('Vergabenummer', ag.vergabenummer);
  }
  const v = lv.vergabeinformationen;
  if (v) {
    feld(
      'Eröffnung',
      verbinde([
        v.eroeffnungsdatum === null ? null : datumDe(v.eroeffnungsdatum),
        v.eroeffnungszeit === null ? null : zeitDe(v.eroeffnungszeit),
      ]),
    );
    feld('Abgabeort', v.abgabeort);
    feld('Ausführungsbeginn', v.ausfuehrungsbeginn === null ? null : datumDe(v.ausfuehrungsbeginn));
    feld('Ausführungsende', v.ausfuehrungsende === null ? null : datumDe(v.ausfuehrungsende));
    feld('Auftragsnummer', v.auftragsnummer);
    feld('Auftragsdatum', v.auftragsdatum === null ? null : datumDe(v.auftragsdatum));
    feld('Abnahmeart', v.abnahmeart);
    if (v.gewaehrleistung !== null) {
      const { dauer, einheit } = v.gewaehrleistung;
      const namen = DAUEREINHEITEN[einheit];
      feld('Gewährleistung', `${String(dauer)} ${namen ? (dauer === 1 ? namen[0] : namen[1]) : einheit}`);
    }
  }
  return { lvName: lv.name, felder };
}

// --- Modell ------------------------------------------------------------------------------------

function merkmalTexte(p: Position): string[] {
  const m = p.merkmale;
  const texte: string[] = [];
  if (m.bedarf !== null)
    texte.push(
      m.bedarf === 'mit-gesamtbetrag'
        ? 'Bedarfsposition mit Gesamtbetrag'
        : 'Bedarfsposition ohne Gesamtbetrag',
    );
  if (m.wahl !== null)
    texte.push(
      verbinde([
        'Wahlposition',
        m.wahl.gruppe === null ? null : `Gruppe ${String(m.wahl.gruppe)}`,
        m.wahl.variante === null ? null : `Variante ${String(m.wahl.variante)}`,
      ]),
    );
  if (m.stundenlohn) texte.push('Stundenlohnarbeiten');
  if (m.pauschal) texte.push('Pauschal');
  return texte;
}

/** Die Kinder jedes Knotens (und der Wurzel) nach `reihenfolge`; für Druck und Excel an einer Stelle (S6). */
export function kinderNachReihenfolge(knoten: readonly Knoten[]): Map<string, Knoten[]> {
  const kinder = new Map<string, Knoten[]>();
  for (const k of knoten) {
    const liste = kinder.get(k.elternId);
    if (liste) liste.push(k);
    else kinder.set(k.elternId, [k]);
  }
  for (const liste of kinder.values()) liste.sort((a, b) => a.reihenfolge - b.reihenfolge);
  return kinder;
}

export function baueAusgabemodell(zustand: LvZustand, optionen: ModellOptionen = {}): Ausgabemodell {
  const mitPreisen = optionen.mitPreisen ?? true;
  const umfang = optionen.langtext ?? { art: 'voll' };
  const mitTitelsummen = mitPreisen && (optionen.titelsummen ?? true);
  const mitSchlussblock = mitPreisen && (optionen.schlussblock ?? true);
  const fuerPosition = (l: Langtext): readonly DruckBlock[] => {
    const bloecke = langtextAlsBloecke(l);
    return umfang.art === 'voll'
      ? bloecke
      : umfang.art === 'kein'
        ? []
        : kuerzeBloecke(bloecke, umfang.anzahl);
  };
  const { leistungsverzeichnis: lv, summen } = zustand;
  const kinder = kinderNachReihenfolge(lv.knoten);
  const positionssumme = new Map(summen.positionen.map((s) => [s.positionId as string, s]));
  const gliederungssumme = new Map(summen.gliederungen.map((s) => [s.gliederungId as string, s]));
  const oz = (o: string | null, index?: string | null): string => `${o ?? ''}${index ?? ''}`;
  const ozJeId = new Map<string, string>();
  for (const k of lv.knoten) {
    if (k.art === 'position') ozJeId.set(k.id, oz(k.ordnungszahl, k.ozIndex));
    else if (k.art !== 'hinweis') ozJeId.set(k.id, oz(k.ordnungszahl));
  }

  const zuschlagBezug = (z: Zuschlag, elternId: string): string => {
    switch (z.bezug.art) {
      case 'kennzeichnung':
        return 'auf die gekennzeichneten Positionen';
      case 'gliederung': {
        const o = ozJeId.get(elternId);
        return o === undefined || o === ''
          ? 'auf alle Positionen des Leistungsverzeichnisses'
          : `auf alle Positionen der Gliederung ${o}`;
      }
      case 'positionen': {
        const ziele = z.bezug.positionen.map((b) => {
          const o = ozJeId.get(b.positionId) ?? '(ohne Ordnungszahl)';
          return b.teilmenge === null ? o : `${o} (Teilmenge ${formatiereMengeDe(b.teilmenge)})`;
        });
        if (ziele.length === 0) return 'ohne Bezug';
        return `auf ${ziele.length === 1 ? 'Position' : 'Positionen'} ${ziele.join(', ')}`;
      }
    }
  };

  const zeilen: AusgabeZeile[] = [];
  const positionZeile = (p: Position): PositionZeile => {
    const s = positionssumme.get(p.id);
    return {
      art: 'position',
      knotenId: p.id,
      ordnungszahl: oz(p.ordnungszahl, p.ozIndex),
      kurztext: p.kurztext,
      merkmale: merkmalTexte(p),
      zuschlag:
        p.zuschlag === null
          ? null
          : {
              satz:
                mitPreisen && p.zuschlag.prozentsatz !== null
                  ? `${formatiereProzentDe(p.zuschlag.prozentsatz)} %`
                  : '',
              bezug: zuschlagBezug(p.zuschlag, p.elternId),
            },
      langtext: fuerPosition(p.langtext),
      unterbeschreibungen: (p.leitbeschreibung?.unterbeschreibungen ?? []).map((u) => ({
        nummer: u.nummer,
        kurztext: u.kurztext,
        langtext: fuerPosition(u.langtext),
        menge: u.menge === null ? '' : formatiereMengeDe(u.menge),
        einheit: u.einheit ?? '',
      })),
      menge: p.menge === null ? '' : formatiereMengeDe(p.menge),
      einheit: p.einheit ?? '',
      einheitspreis:
        !mitPreisen || p.einheitspreis === null ? '' : formatiereEinheitspreisDe(p.einheitspreis),
      gesamtpreis: !mitPreisen || s?.gesamtpreis == null ? '' : formatiereBetragDe(s.gesamtpreis),
      gehtInSummeEin: s?.gehtInSummeEin ?? false,
    };
  };
  const ausweis = (b: Betrag | undefined): string | null =>
    b === undefined || vorzeichen(b) === 0 ? null : formatiereBetragDe(b);
  const besuche = (elternId: string, ebene: number): void => {
    for (const k of kinder.get(elternId) ?? []) {
      switch (k.art) {
        case 'los':
        case 'titel': {
          const o = oz(k.ordnungszahl);
          zeilen.push({ art: 'titel', knotenId: k.id, ebene, ordnungszahl: o, kurztext: k.kurztext });
          besuche(k.id, ebene + 1);
          if (mitTitelsummen) {
            const s = gliederungssumme.get(k.id);
            zeilen.push({
              art: 'titelsumme',
              ebene,
              ordnungszahl: o,
              kurztext: k.kurztext,
              summe: s === undefined ? '' : formatiereBetragDe(s.summe),
              bedarf: ausweis(s?.summeBedarfOhneGesamtbetrag),
              wahl: ausweis(s?.summeWahl),
            });
          }
          break;
        }
        case 'position':
          zeilen.push(positionZeile(k));
          break;
        case 'hinweis':
          zeilen.push({ art: 'hinweis', knotenId: k.id, text: langtextAlsBloecke(k.text) });
          break;
      }
    }
  };
  besuche(lv.id, 1);

  const g = summen.gesamt;
  const hatBedarf = lv.knoten.some((k) => k.art === 'position' && k.merkmale.bedarf === 'ohne-gesamtbetrag');
  const hatWahl = lv.knoten.some((k) => k.art === 'position' && k.merkmale.wahl !== null);
  const summenBlock: SummenBlock = {
    netto: formatiereBetragDe(g.netto),
    nachlass:
      lv.nachlass === null
        ? null
        : {
            bezeichnung:
              lv.nachlass.art === 'prozent'
                ? `Nachlass ${formatiereProzentDe(lv.nachlass.wert)} %`
                : 'Nachlass',
            betrag: formatiereBetragDe(g.nachlass),
          },
    nettoNachNachlass: formatiereBetragDe(g.nettoNachNachlass),
    mwstBezeichnung: `MwSt ${formatiereProzentDe(lv.mwstSatz)} %`,
    mwst: formatiereBetragDe(g.mwst),
    brutto: formatiereBetragDe(g.brutto),
    bedarf:
      hatBedarf && g.summeBedarfOhneGesamtbetrag !== undefined
        ? formatiereBetragDe(g.summeBedarfOhneGesamtbetrag)
        : null,
    wahl: hatWahl && g.summeWahl !== undefined ? formatiereBetragDe(g.summeWahl) : null,
  };
  return {
    name: lv.name,
    kopf: optionen.deckblatt === false ? { lvName: lv.name, felder: [] } : baueKopf(zustand, optionen),
    datum: optionen.datum === undefined ? null : datumDe(optionen.datum),
    mitPreisen,
    zeilen,
    summen: mitSchlussblock ? summenBlock : null,
  };
}
