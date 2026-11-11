// SPDX-License-Identifier: AGPL-3.0-or-later
// Der Positionsdialog als reine Abbildung (U4, Ticket 47): Position → Entwurf (Texte im deutschen Format, N4) und
// Entwurf → Befehle. Je geändertes Feld genau ein Befehl, nur geänderte Felder (A5). Ein ungültiger Zahltext bleibt als
// Fehler am Feld stehen, die übrigen Felder gehen trotzdem hinaus (U5). Was die Werte für Summen heißen, rechnet der Kern.

import { ANTEILE, type Anteil } from '@tethys/kern';
import type {
  Bedarf,
  Einheitspreisanteile,
  Langtext,
  Leitbeschreibung,
  LvBefehl,
  Ordnungszahl,
  Position,
  PositionId,
  Positionsmerkmale,
  Zuschlag,
  Zuschlagsbezug,
} from '@tethys/vertrag';
import { formatiereEinheitspreisDe, formatiereMengeDe, type Zahl } from '@tethys/dezimal';
import { texte } from './texte';
import { formatiereProzentDe, zahlLesen } from './zahlen';

export type Bezugsform = Zuschlagsbezug['art'];

export interface BezugspositionEntwurf {
  readonly positionId: PositionId;
  readonly teilmenge: string;
}

export interface UnterbeschreibungEntwurf {
  readonly nummer: string;
  readonly kurztext: string;
  readonly langtext: Langtext;
  readonly menge: string;
  readonly einheit: string;
}

/** Was der Dialog bearbeitet; Zahlen als eingegebener Text. */
export interface Positionsentwurf {
  readonly ordnungszahl: string;
  readonly kurztext: string;
  readonly langtext: Langtext;
  readonly menge: string;
  readonly einheit: string;
  readonly einheitspreis: string;
  readonly bedarf: Bedarf | null;
  readonly wahl: boolean;
  readonly wahlGruppe: string;
  readonly wahlVariante: string;
  readonly grundpositionId: PositionId | null;
  readonly stundenlohn: boolean;
  readonly pauschal: boolean;
  readonly zuschlagskennzeichen: boolean;
  readonly zuschlag: boolean;
  readonly zuschlagssatz: string;
  readonly bezugsform: Bezugsform;
  readonly bezugspositionen: readonly BezugspositionEntwurf[];
  readonly epa: Readonly<Record<Anteil, string>>;
  readonly freiBezeichnung: string;
  readonly leitbeschreibung: boolean;
  readonly unterbeschreibungen: readonly UnterbeschreibungEntwurf[];
}

/**
 * Schlüssel eines Felds im Dialog, an dem ein Fehler steht: `menge`, `einheitspreis`, `zuschlagssatz`, `wahlGruppe`,
 * `wahlVariante`, `bezug.<i>.teilmenge`, `epa.<anteil>`, `unter.<i>.menge` sowie die Bereiche `merkmale`, `zuschlag`,
 * `bezug`, `epa`, `leitbeschreibung` und `allgemein` für Formfehler des Kerns.
 */
export type Feldfehler = Readonly<Record<string, string>>;

const mengeText = (m: string | null): string => (m === null ? '' : formatiereMengeDe(m as never));
const epText = (e: string | null): string => (e === null ? '' : formatiereEinheitspreisDe(e as never));
const nummerText = (n: number | null | undefined): string => (n === null || n === undefined ? '' : String(n));

export function entwurfVon(p: Position): Positionsentwurf {
  const m = p.merkmale;
  const bezug = p.zuschlag?.bezug;
  const epa = p.epa;
  return {
    ordnungszahl: p.ordnungszahl ?? '',
    kurztext: p.kurztext,
    langtext: p.langtext,
    menge: mengeText(p.menge),
    einheit: p.einheit ?? '',
    einheitspreis: epText(p.einheitspreis),
    bedarf: m.bedarf,
    wahl: m.wahl !== null,
    wahlGruppe: nummerText(m.wahl?.gruppe),
    wahlVariante: nummerText(m.wahl?.variante),
    grundpositionId: m.wahl?.grundpositionId ?? null,
    stundenlohn: m.stundenlohn,
    pauschal: m.pauschal,
    zuschlagskennzeichen: m.zuschlagskennzeichen,
    zuschlag: p.zuschlag !== null,
    zuschlagssatz: p.zuschlag?.prozentsatz == null ? '' : formatiereProzentDe(p.zuschlag.prozentsatz),
    bezugsform: bezug?.art ?? 'gliederung',
    bezugspositionen:
      bezug?.art === 'positionen'
        ? bezug.positionen.map((b) => ({ positionId: b.positionId, teilmenge: mengeText(b.teilmenge) }))
        : [],
    epa: Object.fromEntries(ANTEILE.map((a) => [a, epText(epa?.[a] ?? null)])) as Record<Anteil, string>,
    freiBezeichnung: epa?.freiBezeichnung ?? '',
    leitbeschreibung: p.leitbeschreibung !== undefined,
    unterbeschreibungen: (p.leitbeschreibung?.unterbeschreibungen ?? []).map((u) => ({
      nummer: u.nummer,
      kurztext: u.kurztext,
      langtext: u.langtext,
      menge: mengeText(u.menge),
      einheit: u.einheit ?? '',
    })),
  };
}

/**
 * Ein neuer gespeicherter Stand kommt an, während der Dialog offen ist (z. B. der Kurztext aus dem Grid, dessen Befehl
 * noch lief, oder die schon übernommenen Felder): Unberührte Felder (gleich der alten `basis`) zeigen den neuen Stand,
 * vom Nutzer geänderte bleiben. So überschreibt Übernehmen nie einen Wert, den der Nutzer im Dialog nicht angefasst hat.
 */
export function entwurfNachfuehren(
  eingabe: Positionsentwurf,
  basis: Positionsentwurf,
  neu: Positionsentwurf,
): Positionsentwurf {
  const aus: Record<string, unknown> = {};
  for (const k of Object.keys(neu) as (keyof Positionsentwurf)[])
    aus[k] = gleich(eingabe[k], basis[k]) ? neu[k] : eingabe[k];
  return aus as unknown as Positionsentwurf;
}

/** Tiefer Vergleich für Werte aus JSON (Langtext, Merkmale, Zuschlag, Anteile). */
export function gleich(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => gleich(x, b[i]));
  }
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  const ka = Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  const kb = Object.keys(b).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  return (
    ka.length === kb.length &&
    ka.every((k) => gleich((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
  );
}

/** Sammelt Fehler je Feld; `lies` gibt `undefined` zurück, wenn der Text ungültig ist. */
class Leser {
  readonly fehler: Record<string, string> = {};

  zahl<Z extends 'menge' | 'einheitspreis' | 'prozent'>(
    art: Z,
    text: string,
    feld: string,
  ): Zahl<Z> | null | undefined {
    if (text.trim() === '') return null;
    const r = zahlLesen(art, text);
    if (r.ok) return r.wert;
    this.fehler[feld] = r.fehler;
    return undefined;
  }

  ganzzahl(text: string, feld: string): number | null | undefined {
    const t = text.trim();
    if (t === '') return null;
    if (/^\d{1,4}$/.test(t)) return Number(t);
    this.fehler[feld] = texte.dialog.ganzzahl;
    return undefined;
  }
}

function merkmaleUndZuschlag(
  e: Positionsentwurf,
  l: Leser,
): { merkmale: Positionsmerkmale; zuschlag: Zuschlag | null } | undefined {
  const gruppe = e.wahl ? l.ganzzahl(e.wahlGruppe, 'wahlGruppe') : null;
  const variante = e.wahl ? l.ganzzahl(e.wahlVariante, 'wahlVariante') : null;
  let zuschlag: Zuschlag | null | undefined = null;
  if (e.zuschlag) {
    const satz = l.zahl('prozent', e.zuschlagssatz, 'zuschlagssatz');
    let bezug: Zuschlagsbezug | undefined;
    if (e.bezugsform === 'positionen') {
      const positionen = e.bezugspositionen.map((b, i) => ({
        positionId: b.positionId,
        teilmenge: l.zahl('menge', b.teilmenge, `bezug.${String(i)}.teilmenge`),
      }));
      bezug = positionen.every((b) => b.teilmenge !== undefined)
        ? { art: 'positionen', positionen: positionen as never }
        : undefined;
    } else bezug = { art: e.bezugsform };
    zuschlag = satz === undefined || bezug === undefined ? undefined : { prozentsatz: satz, bezug };
  }
  if (gruppe === undefined || variante === undefined || zuschlag === undefined) return undefined;
  return {
    merkmale: {
      bedarf: e.bedarf,
      wahl: e.wahl ? { gruppe, variante, grundpositionId: e.grundpositionId } : null,
      stundenlohn: e.stundenlohn,
      pauschal: e.pauschal,
      zuschlagskennzeichen: e.zuschlagskennzeichen,
    },
    zuschlag,
  };
}

function anteile(e: Positionsentwurf, l: Leser): Einheitspreisanteile | null | undefined {
  const werte = ANTEILE.map((a) => [a, l.zahl('einheitspreis', e.epa[a], `epa.${a}`)] as const);
  if (werte.some(([, w]) => w === undefined)) return undefined;
  const bezeichnung = e.freiBezeichnung.trim() === '' ? null : e.freiBezeichnung;
  if (werte.every(([, w]) => w === null) && bezeichnung === null) return null;
  return { ...(Object.fromEntries(werte) as Record<Anteil, never>), freiBezeichnung: bezeichnung };
}

function leitbeschreibung(e: Positionsentwurf, l: Leser): Leitbeschreibung | null | undefined {
  if (!e.leitbeschreibung) return null;
  const unter = e.unterbeschreibungen.map((u, i) => ({
    nummer: u.nummer,
    kurztext: u.kurztext,
    langtext: u.langtext,
    menge: l.zahl('menge', u.menge, `unter.${String(i)}.menge`),
    einheit: u.einheit.trim() === '' ? null : u.einheit,
  }));
  return unter.every((u) => u.menge !== undefined) ? { unterbeschreibungen: unter as never } : undefined;
}

/**
 * Die Befehle zum Entwurf, in fester Reihenfolge: OZ, Kurztext, Langtext, Menge, Einheit, EP, Merkmale/Zuschlag, Anteile
 * (setzen den EP auf ihre Summe, Ticket 37, deshalb nach dem EP), Leitbeschreibung. Ungültige Felder stehen in `fehler`;
 * ein Befehl, zu dem ein ungültiges Feld gehört, entfällt.
 */
export function entwurfBefehle(
  p: Position,
  e: Positionsentwurf,
): { befehle: readonly LvBefehl[]; fehler: Feldfehler } {
  const l = new Leser();
  const b: LvBefehl[] = [];
  const positionId = p.id;

  const oz = e.ordnungszahl.trim() === '' ? null : (e.ordnungszahl.trim() as Ordnungszahl);
  if (oz !== p.ordnungszahl)
    b.push({ art: 'OrdnungszahlSetzen', knotenId: positionId, ordnungszahl: oz, ozIndex: p.ozIndex });
  if (e.kurztext !== p.kurztext)
    b.push({ art: 'KurztextAendern', knotenId: positionId, kurztext: e.kurztext });
  if (!gleich(e.langtext, p.langtext)) b.push({ art: 'LangtextAendern', positionId, langtext: e.langtext });
  const menge = l.zahl('menge', e.menge, 'menge');
  if (menge !== undefined && menge !== p.menge) b.push({ art: 'MengeAendern', positionId, menge });
  const einheit = e.einheit.trim() === '' ? null : e.einheit.trim();
  if (einheit !== p.einheit) b.push({ art: 'EinheitAendern', positionId, einheit });
  const ep = l.zahl('einheitspreis', e.einheitspreis, 'einheitspreis');
  if (ep !== undefined && ep !== p.einheitspreis)
    b.push({ art: 'EinheitspreisAendern', positionId, einheitspreis: ep });
  const mz = merkmaleUndZuschlag(e, l);
  if (mz && !(gleich(mz.merkmale, p.merkmale) && gleich(mz.zuschlag, p.zuschlag)))
    b.push({ art: 'PositionsmerkmaleSetzen', positionId, ...mz });
  const epa = anteile(e, l);
  if (epa !== undefined && !gleich(epa, p.epa))
    b.push({ art: 'EinheitspreisanteileSetzen', positionId, epa });
  const lb = leitbeschreibung(e, l);
  if (lb !== undefined && !gleich(lb, p.leitbeschreibung ?? null))
    b.push({ art: 'LeitbeschreibungSetzen', positionId, leitbeschreibung: lb });
  return { befehle: b, fehler: l.fehler };
}

/** Der Bereich im Dialog, an dem ein Formfehler des Kerns (`Befehlsfehler.feld`) erscheint. */
export function kernFehlerFeld(feld: string | undefined): string {
  if (feld === undefined) return 'allgemein';
  if (feld === 'merkmale.wahl') return 'wahlGruppe';
  if (feld.startsWith('merkmale')) return 'merkmale';
  if (feld.startsWith('zuschlag.bezug')) return 'bezug';
  if (feld.startsWith('zuschlag')) return 'zuschlag';
  if (feld.startsWith('epa')) return 'epa';
  if (feld.startsWith('leitbeschreibung')) return 'leitbeschreibung';
  return feld;
}
