// SPDX-License-Identifier: AGPL-3.0-or-later
// Testdateien und Sollwerte für Tor E (Ticket 158). Das LV kommt aus der amtlichen BVBS-Prüfdatei „Bauausführung“ (X83),
// das erste Angebot ist die amtliche BVBS-X84 derselben Reihe, unverändert. Ein zweites amtliches Angebot gibt es nicht; das
// zweite Angebot entsteht hier aus dem ersten mit doppelten Einheitspreisen und einem erfundenen Bieter (D-158.1). Die
// Dateien im Repo bleiben unverändert (C4).
//
// Sollwerte stehen in der amtlichen Datei, nicht in einem Lauf der App: Die X84 trägt ihre Angebotssumme (`BoQInfo/Totals`,
// netto, MwSt und brutto; gerechnet vom Werkzeug der GAEB-Prüfdateien). Das zweite Angebot hat doppelte EP; jeder GP und der
// Zuschlag (Prozent auf eine Bezugssumme, F3) verdoppeln sich genau, solange GP = gerundet(Menge × EP, 2) (N2) beim doppelten
// EP genau das Doppelte ergibt. `verdoppelnExakt` prüft das für jede Position der beiden Dateien.

import { readFileSync } from 'node:fs';
import { cent, fixturePfad, gpCent } from './umsteiger-hilfen';

export const BVBS_X83 = 'extern/bvbs/3.3-bauausfuehrung/Pruefdatei_3.3_Bauausfuehrung_V-04-04-2024.x83';
export const BVBS_X84 = 'extern/bvbs/3.3-bauausfuehrung/BVBS_Pruefdatei_3.3_Bauausfuehrung_V-11-06-2021.x84';

const lies = (rel: string): string => readFileSync(fixturePfad(rel), 'utf8');
const X83 = lies(BVBS_X83);
const X84 = lies(BVBS_X84);

/** Name des LV in der X83 (`BoQInfo/Name`). */
export const LV_NAME = /<BoQInfo>\s*<Name>([^<]*)<\/Name>/.exec(X83)?.[1] ?? '';

/** Zahl der Positionen der X83 (`Item` und Zuschlagsposition `MarkupItem`). */
export const POSITIONEN_X83 = (X83.match(/<(?:Item|MarkupItem)\s/g) ?? []).length;

/** Bieter der amtlichen X84 (`CTR/Address/Name1`). */
export const ERSTBIETER = /<CTR>\s*<Address>\s*<Name1>([^<]*)<\/Name1>/.exec(X84)?.[1] ?? '';

/** Summen der amtlichen X84 in Cent (`BoQInfo/Totals`). */
export const ANGEBOT_ERSTER = (() => {
  const t = /<BoQInfo>[\s\S]*?<Totals>([\s\S]*?)<\/Totals>/.exec(X84)?.[1] ?? '';
  const feld = (n: string): bigint => cent(new RegExp(`<${n}>([^<]*)</${n}>`).exec(t)?.[1] ?? '0');
  return { netto: feld('Total'), mwst: feld('VATAmount'), brutto: feld('TotalGross') };
})();

interface Posten {
  readonly oz: string;
  readonly menge: string | null;
  readonly ep: string | null;
}

/**
 * Positionen einer GAEB-DA-XML-Datei mit OZ (`RNoPart` der Bereiche und der Position, dazu `RNoIndex`), Menge (erstes
 * `Qty` der Position, nicht der Unterbeschreibungen) und EP (`UP`). Bewusst schlicht, nur für die beiden BVBS-Dateien.
 */
function posten(xml: string): Posten[] {
  const out: Posten[] = [];
  const stufen: string[] = [];
  const marke = /<(\/?)(BoQCtgy|Item|SubDescr)\b([^>]*)>|<(Qty|UP)>([^<]*)<\/\4>/g;
  let item: { oz: string; menge: string | null; ep: string | null } | null = null;
  let inSub = 0;
  for (const m of xml.matchAll(marke)) {
    const [, zu, tag, attr = '', feld, wert = ''] = m;
    if (tag === 'BoQCtgy') {
      if (zu) stufen.pop();
      else if (!attr.trim().endsWith('/')) stufen.push(/RNoPart="([^"]*)"/.exec(attr)?.[1] ?? '');
    } else if (tag === 'Item') {
      if (zu) {
        if (item) out.push(item);
        item = null;
      } else {
        const teil = /RNoPart="([^"]*)"/.exec(attr)?.[1] ?? '';
        const index = /RNoIndex="([^"]*)"/.exec(attr)?.[1] ?? '';
        item = { oz: [...stufen, teil].join('.') + index, menge: null, ep: null };
      }
    } else if (tag === 'SubDescr') {
      inSub += zu ? -1 : 1;
    } else if (item && inSub === 0) {
      if (feld === 'Qty' && item.menge === null) item.menge = wert.trim();
      if (feld === 'UP') item.ep = wert.trim();
    }
  }
  return out;
}

const verdoppelt = (ep: string): string => {
  const s = (BigInt(ep.replace('.', '')) * 2n).toString().padStart(4, '0');
  return `${s.slice(0, -3)}.${s.slice(-3)}`;
};

/** Für jede Position mit Menge und EP: GP beim doppelten EP = 2 × GP (N2). Liefert die Positionen, bei denen nicht. */
export function verdoppelnNichtExakt(): string[] {
  const mengen = new Map(posten(X83).map((p) => [p.oz, p.menge]));
  const abweichend: string[] = [];
  let geprueft = 0;
  for (const p of posten(X84)) {
    const menge = mengen.get(p.oz);
    if (p.ep === null || menge === null || menge === undefined) continue;
    geprueft += 1;
    if (gpCent(menge, verdoppelt(p.ep)) !== 2n * gpCent(menge, p.ep)) abweichend.push(p.oz);
  }
  if (geprueft < 20) abweichend.push(`nur ${String(geprueft)} Positionen zugeordnet`);
  return abweichend;
}

/** Die zweite Angebotsdatei: EP verdoppelt, Bieter erfunden, ohne die Beträge der Datei (die rechnet die App). */
export const ZWEITBIETER = 'Zweitbieter Bau (erfunden)';
export function zweiteX84(): { name: string; mimeType: string; buffer: Buffer } {
  const xml = X84.replace(/<UP>([^<]*)<\/UP>/g, (_, ep: string) => `<UP>${verdoppelt(ep)}</UP>`)
    .replace(/<IT>[^<]*<\/IT>/g, '')
    .replace(/<ITMarkup>[^<]*<\/ITMarkup>/g, '')
    .replace(/<Totals>(?:(?!<\/Totals>)[\s\S])*<\/Totals>/g, '')
    .replace(/(<CTR>\s*<Address>\s*<Name1>)[^<]*(<\/Name1>)/, `$1${ZWEITBIETER}$2`);
  return { name: 'Angebot-Zweitbieter.x84', mimeType: 'application/xml', buffer: Buffer.from(xml, 'utf8') };
}

/** Summen des zweiten Angebots: das Doppelte des ersten (siehe oben). */
export const ANGEBOT_ZWEITER = {
  netto: 2n * ANGEBOT_ERSTER.netto,
  mwst: 2n * ANGEBOT_ERSTER.mwst,
  brutto: 2n * ANGEBOT_ERSTER.brutto,
};
