// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 87: Soll/Ist eines Auftrags-LV als Ansicht des einen Grids (U2). Gerechnet wird nur in `abrechnung`
// (`sollIstBerechnen`, Ticket 81; D-35, VOB/B § 2 Abs. 3); hier wird über `dezimal` formatiert (N1, N4). Befunde stehen
// in einer eigenen Spalte mit neutralem Kennzeichen und als Liste mit Sprung zur Zeile (Tastatur, U3).

import { sollIstBerechnen, type SollIst, type SollIstOptionen } from '@tethys/abrechnung';
import { formatiereBetragDe, formatiereMengeDe, formatiereProzentDe } from '@tethys/dezimal';
import type {
  KennzeichenText,
  VergleichsSpalte,
  VergleichsSummenzeile,
  VergleichsZeile,
  VergleichsZelle,
} from '@tethys/ui-grid';
import type { Aufmass, AuftragsLvZustand, Betrag, Menge, Prozent } from '@tethys/vertrag';
import { kinderJeEltern } from '../lv/ansicht';
import { ozText } from '../lv/oztext';

/** Die Schwellen aus D-35 (VOB/B § 2 Abs. 3), die die Seite anzeigt und ändern lässt. */
export const STANDARD_OBERSCHWELLE = '110.00' as Prozent;
export const STANDARD_UNTERSCHWELLE = '90.00' as Prozent;

/** Soll/Ist mit den Schwellen, mit denen gerechnet wurde (für die Texte der Befunde). */
export interface SollIstStand extends SollIst {
  readonly oberSchwelle: Prozent;
  readonly unterSchwelle: Prozent;
}

export function sollIstRechnen(
  auftrag: AuftragsLvZustand,
  blaetter: readonly Aufmass[],
  o: SollIstOptionen,
): SollIstStand {
  const oberSchwelle = o.oberSchwelle ?? STANDARD_OBERSCHWELLE;
  const unterSchwelle = o.unterSchwelle ?? STANDARD_UNTERSCHWELLE;
  const s = sollIstBerechnen(auftrag, blaetter, {
    abgeschlossen: o.abgeschlossen === true,
    oberSchwelle,
    unterSchwelle,
  });
  return { ...s, oberSchwelle, unterSchwelle };
}

export const SOLL_IST_SPALTEN: readonly VergleichsSpalte[] = [
  { id: 'oz', kopf: 'OZ', breite: 104 },
  { id: 'kurztext', kopf: 'Kurztext', breite: 280 },
  { id: 'einheit', kopf: 'Einheit', breite: 64 },
  { id: 'soll', kopf: 'Soll', ausrichtung: 'rechts', breite: 112 },
  { id: 'ist', kopf: 'Ist', ausrichtung: 'rechts', breite: 112 },
  { id: 'differenz', kopf: 'Differenz', ausrichtung: 'rechts', breite: 112 },
  { id: 'anteil', kopf: '%', ausrichtung: 'rechts', breite: 96 },
  { id: 'gpSoll', kopf: 'GP Soll', ausrichtung: 'rechts', breite: 120 },
  { id: 'gpIst', kopf: 'GP Ist', ausrichtung: 'rechts', breite: 120 },
  { id: 'befund', kopf: 'Befund', breite: 136 },
];

const KENNZEICHEN: Readonly<Record<string, KennzeichenText>> = {
  'ueber-schwelle': {
    symbol: '▲',
    beschreibung: 'Ist über der oberen Schwelle der Auftragsmenge (VOB/B § 2 Abs. 3)',
  },
  'unter-schwelle': {
    symbol: '▼',
    beschreibung:
      'Ist unter der unteren Schwelle der Auftragsmenge (VOB/B § 2 Abs. 3, nach der Schlussrechnung)',
  },
};

export const GESAMT_ID = 'summe:gesamt';
const GESAMT_TEXT = 'Gesamt (netto vor Nachlass)';

const menge = (m: Menge | null): string => (m === null ? '' : formatiereMengeDe(m));
const betrag = (b: Betrag | null | undefined): string =>
  b === null || b === undefined ? '' : formatiereBetragDe(b);
const prozent = (p: Prozent | null): string => (p === null ? '' : `${formatiereProzentDe(p)} %`);

function zelle(text: string, kennzeichen: readonly string[] = []): VergleichsZelle {
  return kennzeichen.length > 0 ? { text, kennzeichen } : { text };
}

export interface SollIstAnsicht {
  readonly spalten: readonly VergleichsSpalte[];
  readonly zeilen: readonly VergleichsZeile[];
  readonly summen: readonly VergleichsSummenzeile[];
  readonly kennzeichenTexte: Readonly<Record<string, KennzeichenText>>;
  /** Die Befunde in Worten, in Dokumentreihenfolge (für die Liste mit Sprung zur Zeile). */
  readonly befunde: readonly { readonly positionId: string; readonly text: string }[];
}

export function sollIstAnsicht(e: {
  auftrag: AuftragsLvZustand;
  sollIst: SollIstStand;
  zugeklappt: ReadonlySet<string>;
}): SollIstAnsicht {
  const lv = e.auftrag.auftragsLeistungsverzeichnis;
  const s = e.sollIst;
  const kinder = kinderJeEltern(lv.knoten);
  const jePosition = new Map(s.zeilen.map((z) => [z.positionId as string, z]));
  const jeGliederung = new Map(s.gliederungen.map((g) => [g.gliederungId as string, g]));
  const befundJe = new Map(s.befunde.map((b) => [b.positionId as string, b]));
  const schwelle = (code: 'ueber-schwelle' | 'unter-schwelle'): string =>
    code === 'ueber-schwelle'
      ? `über ${formatiereProzentDe(s.oberSchwelle)} %`
      : `unter ${formatiereProzentDe(s.unterSchwelle)} %`;

  const zeilen: VergleichsZeile[] = [];
  const besuche = (elternId: string, tiefe: number): void => {
    for (const k of kinder.get(elternId) ?? []) {
      if (k.art === 'hinweis') continue;
      const unter = (kinder.get(k.id) ?? []).filter((x) => x.art !== 'hinweis');
      const hatUnterknoten = unter.length > 0;
      const aufgeklappt = hatUnterknoten && !e.zugeklappt.has(k.id);
      const basis = { oz: zelle(ozText(k)), kurztext: zelle(k.kurztext) };
      if (k.art === 'position') {
        const z = jePosition.get(k.id);
        const b = befundJe.get(k.id);
        zeilen.push({
          id: k.id,
          art: 'position',
          tiefe,
          hatUnterknoten,
          aufgeklappt,
          zellen: {
            ...basis,
            einheit: zelle(k.einheit ?? ''),
            soll: zelle(menge(z?.soll ?? null)),
            ist: zelle(menge(z?.ist ?? null)),
            differenz: zelle(menge(z?.differenz ?? null)),
            anteil: zelle(prozent(z?.anteil ?? null)),
            gpSoll: zelle(betrag(z?.gpSoll)),
            gpIst: zelle(betrag(z?.gpIst)),
            befund: b === undefined ? zelle('') : zelle(schwelle(b.code), [b.code]),
          },
        });
      } else {
        const g = jeGliederung.get(k.id);
        zeilen.push({
          id: k.id,
          art: 'gliederung',
          tiefe,
          hatUnterknoten,
          aufgeklappt,
          zellen: { ...basis, gpSoll: zelle(betrag(g?.gpSoll)), gpIst: zelle(betrag(g?.gpIst)) },
        });
      }
      if (aufgeklappt) besuche(k.id, tiefe + 1);
    }
  };
  besuche(lv.id, 0);
  // Die Liste nennt alle Befunde, auch unter zugeklappten Gliederungen (der Sprung klappt dort auf).
  const knoten = new Map(lv.knoten.map((k) => [k.id as string, k]));
  const befunde = s.befunde.map((b) => {
    const k = knoten.get(b.positionId);
    const name = k?.art === 'position' ? [ozText(k), k.kurztext].filter(Boolean).join(' ') : b.positionId;
    return {
      positionId: b.positionId,
      text: `${name}: Ist ${prozent(b.anteil)} der Auftragsmenge (${schwelle(b.code)})`,
    };
  });

  return {
    spalten: SOLL_IST_SPALTEN,
    zeilen,
    summen: [
      {
        id: GESAMT_ID,
        zellen: {
          kurztext: zelle(GESAMT_TEXT),
          gpSoll: zelle(betrag(s.gesamt.gpSoll)),
          gpIst: zelle(betrag(s.gesamt.gpIst)),
        },
      },
    ],
    kennzeichenTexte: KENNZEICHEN,
    befunde,
  };
}
