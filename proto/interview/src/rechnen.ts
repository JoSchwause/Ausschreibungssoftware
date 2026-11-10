// Wegwerfcode. Rechnung nach Regel N2 mit @tethys/dezimal: nie `number` fuer Betraege.
// Einzige Ausnahme: Mittelwert und Abweichung im Preisspiegel. `dezimal` hat keine Division; dort wird mit
// BigInt auf Cent-Basis gerechnet (exakt, ohne Gleitkomma).
import {
  addiere,
  alsBetrag,
  alsMenge,
  alsEinheitspreis,
  alsProzent,
  formatiereBetragDe,
  gesamtpreis,
  prozentVon,
  subtrahiere,
  summiereBetraege,
  NULL_BETRAG,
} from '@tethys/dezimal';
import type { Betrag, Einheitspreis, Knoten, Menge, Position, Prozent, Titel } from '@tethys/vertrag';
import lvJson from './daten/lv.json';
import angeboteJson from './daten/angebote.json';

// ---------- Daten laden ----------

const ok = <T>(r: { ok: true; wert: T } | { ok: false }): T => {
  if (!r.ok) throw new Error('Ungueltiger Dezimalwert in den Prototyp-Daten');
  return r.wert;
};
export const betrag = (s: string): Betrag => ok(alsBetrag(s));
export const prozent = (s: string): Prozent => ok(alsProzent(s));

export function ladeLv(): { id: string; name: string; knoten: Knoten[]; mwst: Prozent; nachlass: Prozent } {
  const reihenfolge = new Map<string, number>();
  const knoten: Knoten[] = [];
  for (const k of lvJson.knoten as any[]) {
    const r = reihenfolge.get(k.parentId) ?? 0;
    reihenfolge.set(k.parentId, r + 1);
    const lage = { elternId: k.parentId, reihenfolge: r };
    if (k.art === 'titel') {
      knoten.push({ ...lage, art: 'titel', id: k.id, ordnungszahl: k.ordnungszahl, kurztext: k.kurztext } as Titel);
    } else if (k.art === 'hinweis') {
      knoten.push({ ...lage, art: 'hinweis', id: k.id, text: [{ art: 'text', text: k.text }] } as Knoten);
    } else {
      knoten.push({
        ...lage,
        art: 'position',
        id: k.id,
        ordnungszahl: k.ordnungszahl,
        ozIndex: k.ozIndex ?? null,
        merkmale: { bedarf: null, wahl: null, stundenlohn: false, pauschal: false, zuschlagskennzeichen: false },
        zuschlag: null,
        kurztext: k.kurztext,
        langtext: [],
        menge: ok(alsMenge(k.menge)),
        einheit: k.einheit,
        einheitspreis: ok(alsEinheitspreis(k.einheitspreis)),
        epa: null,
      } as Position);
    }
  }
  return {
    id: lvJson.id,
    name: lvJson.name,
    knoten,
    mwst: prozent(lvJson.mwstSatz),
    nachlass: prozent(lvJson.nachlass?.wert ?? '0.00'),
  };
}

export interface BieterDaten {
  id: string;
  name: string;
  /** Nachlass in Prozent, `null` = keiner. */
  nachlass: Prozent | null;
  /** Je Position: Menge aus der Ausschreibung (eingefroren), EP des Bieters oder `null` = nicht angeboten. */
  ep: Map<string, Einheitspreis | null>;
}

export function ladeBieter(): BieterDaten[] {
  return angeboteJson.angebote.map((a, i) => ({
    id: a.id,
    name: angeboteJson.bieter[i]!.name,
    nachlass: a.nachlass ? prozent(a.nachlass.wert) : null,
    ep: new Map(
      a.positionen.map((p) => [
        p.positionId,
        p.status === 'angeboten' ? ok(alsEinheitspreis((p as any).einheitspreis)) : null,
      ]),
    ),
  }));
}

// ---------- Rechnung ----------

export interface Summen {
  netto: Betrag;
  nachlass: Betrag;
  nettoNachNachlass: Betrag;
  mwst: Betrag;
  brutto: Betrag;
}

export interface Rechnung {
  /** GP je Position; `null` = kein GP (Menge oder EP fehlt, bzw. nicht angeboten). */
  gp: Map<string, Betrag | null>;
  /** Titelsumme je Titel-ID (einschliesslich Untertitel). */
  titel: Map<string, Betrag>;
  summen: Summen;
}

export function summenAus(netto: Betrag, nachlassProzent: Prozent | null, mwst: Prozent): Summen {
  const nachlass = nachlassProzent ? prozentVon(netto, nachlassProzent) : NULL_BETRAG;
  const nach = subtrahiere(netto, nachlass);
  const m = prozentVon(nach, mwst);
  return { netto, nachlass, nettoNachNachlass: nach, mwst: m, brutto: addiere(nach, m) };
}

/** Rechnet einen Baum. `gpVon` liefert den GP einer Position (LV: Menge x EP; Angebot: Menge x EP des Bieters). */
export function rechne(
  knoten: readonly Knoten[],
  gpVon: (p: Position) => Betrag | null,
  nachlassProzent: Prozent | null,
  mwst: Prozent,
): Rechnung {
  const gp = new Map<string, Betrag | null>();
  const kinder = new Map<string, Knoten[]>();
  for (const k of knoten) {
    const l = kinder.get(k.elternId) ?? [];
    l.push(k);
    kinder.set(k.elternId, l);
    if (k.art === 'position') gp.set(k.id, gpVon(k));
  }
  const titel = new Map<string, Betrag>();
  const summeUnter = (id: string): Betrag => {
    const teile: Betrag[] = [];
    for (const k of kinder.get(id) ?? []) {
      if (k.art === 'position') {
        const g = gp.get(k.id);
        if (g) teile.push(g);
      } else if (k.art === 'titel' || k.art === 'los') {
        const s = summeUnter(k.id);
        titel.set(k.id, s);
        teile.push(s);
      }
    }
    return summiereBetraege(teile);
  };
  const wurzel = knoten.find((k) => !knoten.some((x) => x.id === k.elternId));
  const netto = wurzel ? summeUnter(wurzel.elternId) : NULL_BETRAG;
  return { gp, titel, summen: summenAus(netto, nachlassProzent, mwst) };
}

export const gpLv = (p: Position): Betrag | null =>
  p.menge && p.einheitspreis ? gesamtpreis(p.menge, p.einheitspreis) : null;

export const euro = (b: Betrag | null | undefined): string => (b ? formatiereBetragDe(b) : '–');
export const gpOderLeer = (m: Menge | null, e: Einheitspreis | null): Betrag | null =>
  m && e ? gesamtpreis(m, e) : null;
