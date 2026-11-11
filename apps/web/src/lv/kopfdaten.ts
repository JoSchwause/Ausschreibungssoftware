// SPDX-License-Identifier: AGPL-3.0-or-later
// LV-Angaben (D-07, Ticket 47): Auftraggeber und Vergabeinformationen als Entwurf im deutschen Format und zurück als je
// ein Befehl (`AuftraggeberSetzen`, `VergabeinformationenSetzen`) mit dem ganzen neuen Wert. Leere Eingabe heißt `null`;
// Datum und Uhrzeit werden am Rand umgewandelt (N4): `TT.MM.JJJJ` ↔ `JJJJ-MM-TT`, `HH:MM` ↔ `HH:MM:SS`.

import type { Auftraggeber, Ergebnis, LvBefehl, LvInhaltKopf, Vergabeinformationen } from '@tethys/vertrag';
import { gleich, type Feldfehler } from './positionsentwurf';
import { texte } from './texte';

type Textfelder<T> = { readonly [K in keyof T]-?: string };

export type AuftraggeberEntwurf = Textfelder<Auftraggeber>;
export type VergabeEntwurf = Textfelder<Omit<Vergabeinformationen, 'gewaehrleistung'>> & {
  readonly gewaehrleistungDauer: string;
  readonly gewaehrleistungEinheit: string;
};

export interface KopfdatenEntwurf {
  readonly auftraggeber: AuftraggeberEntwurf;
  readonly vergabe: VergabeEntwurf;
}

type Kopf = Pick<LvInhaltKopf, 'auftraggeber' | 'vergabeinformationen'>;

export const AUFTRAGGEBER_FELDER = ['name', 'strasse', 'plz', 'ort', 'vergabenummer'] as const;
export const DATUM_FELDER = [
  'eroeffnungsdatum',
  'ausfuehrungsbeginn',
  'ausfuehrungsende',
  'auftragsdatum',
] as const;
export const VERGABE_FELDER = [
  'eroeffnungsdatum',
  'eroeffnungszeit',
  'abgabeort',
  'ausfuehrungsbeginn',
  'ausfuehrungsende',
  'auftragsnummer',
  'auftragsdatum',
  'abnahmeart',
] as const;

const zwei = (n: number): string => String(n).padStart(2, '0');

/** `TT.MM.JJJJ` (auch ohne führende Null) oder schon `JJJJ-MM-TT` → `JJJJ-MM-TT`; nur echte Kalendertage. */
export function datumLesen(text: string): Ergebnis<string, string> {
  const t = text.trim();
  const de = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(t);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  const [j, m, d] = de ? [de[3], de[2], de[1]] : iso ? [iso[1], iso[2], iso[3]] : [];
  if (j === undefined || m === undefined || d === undefined)
    return { ok: false, fehler: texte.kopfdaten.datumUngueltig };
  const tag = new Date(Date.UTC(Number(j), Number(m) - 1, Number(d)));
  if (
    tag.getUTCFullYear() !== Number(j) ||
    tag.getUTCMonth() !== Number(m) - 1 ||
    tag.getUTCDate() !== Number(d)
  )
    return { ok: false, fehler: texte.kopfdaten.datumUngueltig };
  return { ok: true, wert: `${j}-${zwei(Number(m))}-${zwei(Number(d))}` };
}

export function datumDe(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3] ?? ''}.${m[2] ?? ''}.${m[1] ?? ''}` : iso;
}

/** `HH:MM` oder `HH:MM:SS` → `HH:MM:SS`. */
export function zeitLesen(text: string): Ergebnis<string, string> {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text.trim());
  const [h, min, s] = m ? [Number(m[1]), Number(m[2]), Number(m[3] ?? '0')] : [NaN, NaN, NaN];
  if (!(h >= 0 && h <= 23 && min >= 0 && min <= 59 && s >= 0 && s <= 59))
    return { ok: false, fehler: texte.kopfdaten.zeitUngueltig };
  return { ok: true, wert: `${zwei(h)}:${zwei(min)}:${zwei(s)}` };
}

/** `HH:MM:SS` → `HH:MM` (Sekunden nur, wenn nicht 00). */
const zeitDe = (z: string): string => (z.endsWith(':00') && z.length === 8 ? z.slice(0, 5) : z);

export function kopfdatenEntwurf(kopf: Kopf): KopfdatenEntwurf {
  const ag = kopf.auftraggeber;
  const vi = kopf.vergabeinformationen;
  const vergabe = Object.fromEntries(
    VERGABE_FELDER.map((f) => {
      const w = vi?.[f] ?? null;
      const text =
        w === null
          ? ''
          : (DATUM_FELDER as readonly string[]).includes(f)
            ? datumDe(w)
            : f === 'eroeffnungszeit'
              ? zeitDe(w)
              : w;
      return [f, text];
    }),
  ) as Record<(typeof VERGABE_FELDER)[number], string>;
  return {
    auftraggeber: Object.fromEntries(
      AUFTRAGGEBER_FELDER.map((f) => [f, ag?.[f] ?? '']),
    ) as AuftraggeberEntwurf,
    vergabe: {
      ...vergabe,
      gewaehrleistungDauer: vi?.gewaehrleistung ? String(vi.gewaehrleistung.dauer) : '',
      gewaehrleistungEinheit: vi?.gewaehrleistung?.einheit ?? '',
    },
  };
}

const leerZuNull = (t: string): string | null => (t.trim() === '' ? null : t.trim());

/** Je geänderter Teil ein Befehl. Ungültige Felder stehen in `fehler`; dann entfällt nur der Befehl dieses Teils. */
export function kopfdatenBefehle(
  kopf: Kopf,
  e: KopfdatenEntwurf,
): { befehle: readonly LvBefehl[]; fehler: Feldfehler } {
  const befehle: LvBefehl[] = [];
  const fehler: Record<string, string> = {};

  const ag = Object.fromEntries(
    AUFTRAGGEBER_FELDER.map((f) => [f, leerZuNull(e.auftraggeber[f])]),
  ) as unknown as Auftraggeber;
  const agNeu = Object.values(ag).every((w) => w === null) ? null : ag;
  if (!gleich(agNeu, kopf.auftraggeber ?? null))
    befehle.push({ art: 'AuftraggeberSetzen', auftraggeber: agNeu });

  const vi: Record<string, unknown> = {};
  for (const f of VERGABE_FELDER) {
    const t = leerZuNull(e.vergabe[f]);
    if (t === null) vi[f] = null;
    else if ((DATUM_FELDER as readonly string[]).includes(f) || f === 'eroeffnungszeit') {
      const r = f === 'eroeffnungszeit' ? zeitLesen(t) : datumLesen(t);
      if (r.ok) vi[f] = r.wert;
      else fehler[f] = r.fehler;
    } else vi[f] = t;
  }
  const dauer = leerZuNull(e.vergabe.gewaehrleistungDauer);
  const einheit = leerZuNull(e.vergabe.gewaehrleistungEinheit);
  if (dauer === null && einheit === null) vi['gewaehrleistung'] = null;
  else if (dauer !== null && /^\d{1,4}$/.test(dauer) && einheit !== null)
    vi['gewaehrleistung'] = { dauer: Number(dauer), einheit };
  else fehler['gewaehrleistung'] = texte.kopfdaten.gewaehrleistungUngueltig;

  const viFehler = [...VERGABE_FELDER, 'gewaehrleistung'].some((f) => f in fehler);
  if (!viFehler) {
    const viNeu = Object.values(vi).every((w) => w === null) ? null : (vi as unknown as Vergabeinformationen);
    if (!gleich(viNeu, kopf.vergabeinformationen ?? null))
      befehle.push({ art: 'VergabeinformationenSetzen', vergabeinformationen: viNeu });
  }
  return { befehle, fehler };
}
