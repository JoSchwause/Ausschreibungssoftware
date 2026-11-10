// SPDX-License-Identifier: AGPL-3.0-or-later
// Prüfung von Baum und Knotendaten (Ticket 05): eine Quelle für `LeistungsverzeichnisAnlegen`, die
// Einzelbefehle und die Invariantenprüfung `pruefeLvInvarianten`.

import { alsBetrag, alsEinheitspreis, alsMenge, alsProzent } from '@tethys/dezimal';
import type { Befehlsfehler, Knoten, Leistungsverzeichnis, LvInhalt, Positionsdaten } from '@tethys/vertrag';
import { befehlsfehler } from './fehler';
import { MAX_GLIEDERUNGSEBENEN, darfKinderHaben, ebenenbeitrag, losErlaubtUnter } from './regeln';
import type { ElternArt } from './regeln';

const GLIEDERUNG_FELDER: ReadonlySet<string> = new Set([
  'art',
  'id',
  'elternId',
  'reihenfolge',
  'ordnungszahl',
  'kurztext',
]);
const HINWEIS_FELDER: ReadonlySet<string> = new Set(['art', 'id', 'elternId', 'reihenfolge', 'text']);

/** Felder, die ein Knoten dieser Art nicht tragen darf (Hinweistext und Gliederung: keine Menge, kein Preis). */
export function unerlaubtesFeld(
  objekt: object,
  art: 'gliederung' | 'hinweis',
  zusaetzlich: readonly string[] = [],
): string | null {
  const erlaubt = art === 'hinweis' ? HINWEIS_FELDER : GLIEDERUNG_FELDER;
  for (const feld of Object.keys(objekt)) if (!erlaubt.has(feld) && !zusaetzlich.includes(feld)) return feld;
  return null;
}

/**
 * Form einer Position: Zahlen in kanonischer Schreibweise, Bezüge zeigen auf vorhandene Positionen. `istPosition`
 * sagt, ob eine ID eine (künftige) Position im LV ist.
 *
 * v1.1b: mechanisch angepasst, Folgeticket. Seit v1.1b gibt es keine Positionsart mehr und damit keine Prüfung „Merkmal nur bei passender Art“; die
 * Merkmale sind kombinierbar (F5). Welche Kombinationen ungültig sind, entscheidet K5/K6; bis dahin weist der Kern
 * keine Kombination ab. Geprüft werden weiter die Bezüge: die Positionen einer Zuschlagsliste und die Grundposition.
 */
export function positionsdatenFehler(
  daten: Positionsdaten,
  positionsId: string,
  istPosition: (id: string) => boolean,
): Befehlsfehler | null {
  const feld = (f: string, text: string): Befehlsfehler =>
    befehlsfehler('ungueltige-eingabe', text, positionsId, f);
  if (daten.menge !== null) {
    const e = alsMenge(daten.menge);
    if (!e.ok) return feld('menge', e.fehler.meldung);
  }
  if (daten.einheitspreis !== null) {
    const e = alsEinheitspreis(daten.einheitspreis);
    if (!e.ok) return feld('einheitspreis', e.fehler.meldung);
  }
  // v1.1b: mechanisch angepasst, Folgeticket. Nur Formprüfung der neuen Felder (wie vorher die Art und die Zahlen),
  // keine Fachregel: jede Kombination der Merkmale bleibt zulässig (K5 entscheidet).
  const roh: unknown = daten.merkmale;
  if (typeof roh !== 'object' || roh === null || Array.isArray(roh))
    return feld('merkmale', 'Die Merkmale fehlen oder sind kein Objekt.');
  const bedarf: unknown = daten.merkmale.bedarf;
  if (bedarf !== null && bedarf !== 'ohne-gesamtbetrag' && bedarf !== 'mit-gesamtbetrag')
    return feld('merkmale.bedarf', 'Bedarf muss null, „ohne-gesamtbetrag“ oder „mit-gesamtbetrag“ sein.');
  const zuschlagRoh: unknown = daten.zuschlag;
  if (zuschlagRoh !== null && (typeof zuschlagRoh !== 'object' || Array.isArray(zuschlagRoh)))
    return feld('zuschlag', 'Der Zuschlag muss null oder ein Objekt sein.');
  if (daten.zuschlag !== null) {
    const bezugRoh: unknown = daten.zuschlag.bezug;
    const art =
      typeof bezugRoh === 'object' && bezugRoh !== null ? (bezugRoh as { art?: unknown }).art : undefined;
    if (art !== 'positionen' && art !== 'gliederung' && art !== 'kennzeichnung')
      return feld(
        'zuschlag.bezug.art',
        'Der Zuschlagsbezug muss „positionen“, „gliederung“ oder „kennzeichnung“ sein.',
      );
    if (daten.zuschlag.prozentsatz !== null) {
      const e = alsProzent(daten.zuschlag.prozentsatz);
      if (!e.ok) return feld('zuschlag.prozentsatz', e.fehler.meldung);
    }
    if (daten.zuschlag.bezug.art === 'positionen') {
      const liste: unknown = daten.zuschlag.bezug.positionen;
      if (!Array.isArray(liste))
        return feld('zuschlag.bezug.positionen', 'Die Bezugspositionen müssen eine Liste sein.');
      for (const b of daten.zuschlag.bezug.positionen) {
        if (b.teilmenge !== null) {
          const e = alsMenge(b.teilmenge);
          if (!e.ok) return feld('zuschlag.bezug.positionen.teilmenge', e.fehler.meldung);
        }
      }
    }
  }
  const bezug = daten.zuschlag?.bezug;
  const ziele: (readonly [string, string | null])[] = [
    ['merkmale.wahl.grundpositionId', daten.merkmale.wahl?.grundpositionId ?? null],
    ...(bezug?.art === 'positionen'
      ? bezug.positionen.map((b) => ['zuschlag.bezug.positionen', b.positionId] as const)
      : []),
  ];
  for (const [name, ziel] of ziele) {
    if (ziel !== null && (ziel === positionsId || !istPosition(ziel))) {
      return befehlsfehler(
        'bezug-unbekannt',
        `${name} verweist nicht auf eine andere vorhandene Position: ${ziel}`,
        positionsId,
        name,
      );
    }
  }
  return null;
}

/** Form der Stammdaten, die `LeistungsverzeichnisAnlegen` mitbringt (Zahlen in kanonischer Schreibweise). */
export function inhaltKopfFehler(inhalt: Pick<LvInhalt, 'mwstSatz' | 'nachlass'>): Befehlsfehler | null {
  const mwst = alsProzent(inhalt.mwstSatz);
  if (!mwst.ok) return befehlsfehler('ungueltige-eingabe', mwst.fehler.meldung, undefined, 'mwstSatz');
  if (inhalt.nachlass !== null) {
    const e =
      inhalt.nachlass.art === 'prozent' ? alsProzent(inhalt.nachlass.wert) : alsBetrag(inhalt.nachlass.wert);
    if (!e.ok) return befehlsfehler('ungueltige-eingabe', e.fehler.meldung, undefined, 'nachlass');
  }
  return null;
}

/**
 * Sammelt alle Verstöße gegen die Baumregeln: IDs eindeutig, jeder Knoten hat genau einen vorhandenen Elternknoten
 * (die Wurzel oder ein Los/Titel), Los nur an der erlaubten Stelle, keine Menge/kein Preis an Hinweistext und
 * Gliederung, `reihenfolge` je Elternknoten dicht 0..n-1, zyklenfrei, höchstens 5 Gliederungsebenen, Form der
 * Positionen. Unabhängig von der Array-Reihenfolge.
 */
export function baumfehler(lvId: string, knoten: readonly Knoten[]): Befehlsfehler[] {
  const fehler: Befehlsfehler[] = [];
  const byId = new Map<string, Knoten>();
  for (const k of knoten) {
    if (byId.has(k.id) || k.id === lvId) {
      fehler.push(befehlsfehler('id-vergeben', `Kennung doppelt vergeben: ${k.id}`, k.id));
    }
    if (!byId.has(k.id)) byId.set(k.id, k);
  }

  const artVon = (id: string): ElternArt | null => (id === lvId ? 'wurzel' : (byId.get(id)?.art ?? null));

  for (const k of knoten) {
    if (k.art === 'hinweis' || k.art === 'los' || k.art === 'titel') {
      const feld = unerlaubtesFeld(k, k.art === 'hinweis' ? 'hinweis' : 'gliederung');
      if (feld !== null) {
        fehler.push(
          befehlsfehler(
            'ungueltige-eingabe',
            `Feld „${feld}“ ist an dieser Knotenart nicht zulässig.`,
            k.id,
            feld,
          ),
        );
      }
    }
    const elternArt = artVon(k.elternId);
    if (elternArt === null) {
      fehler.push(befehlsfehler('eltern-unbekannt', `Elternknoten fehlt: ${k.elternId}`, k.id));
    } else if (!darfKinderHaben(elternArt)) {
      fehler.push(
        befehlsfehler(
          'knotenart-unzulaessig',
          `Unter einer Knotenart „${elternArt}“ stehen keine Kinder.`,
          k.id,
        ),
      );
    } else if (k.art === 'los' && !losErlaubtUnter(elternArt)) {
      fehler.push(
        befehlsfehler(
          'knotenart-unzulaessig',
          'Ein Los steht nur direkt unter dem LV (vorläufige Annahme).',
          k.id,
        ),
      );
    }
  }

  // Reihenfolge: dichter Index 0..n-1 je Elternknoten
  const indizes = new Map<string, number[]>();
  for (const k of knoten) {
    const liste = indizes.get(k.elternId);
    if (liste) liste.push(k.reihenfolge);
    else indizes.set(k.elternId, [k.reihenfolge]);
  }
  for (const [eltern, liste] of indizes) {
    liste.sort((a, b) => a - b);
    if (liste.some((r, i) => r !== i)) {
      fehler.push(
        befehlsfehler(
          'ungueltige-eingabe',
          `Reihenfolge unter ${eltern} ist nicht dicht 0..n-1.`,
          undefined,
          'reihenfolge',
        ),
      );
    }
  }

  // Zyklen und Ebenentiefe: Aufstieg je Knoten mit Merkzettel
  const ebenen = new Map<string, number>(); // bekannte Ebenenzahl je Gliederung (einschließlich)
  const imZyklus = new Set<string>();
  for (const k of knoten) {
    if (ebenen.has(k.id) || imZyklus.has(k.id)) continue;
    const kette: Knoten[] = [];
    const inKette = new Set<string>();
    let aktuell: Knoten | undefined = k;
    let basis = 0;
    while (aktuell) {
      if (inKette.has(aktuell.id)) {
        for (const z of kette) imZyklus.add(z.id);
        fehler.push(befehlsfehler('zyklus', `Zyklus im Baum bei ${aktuell.id}`, aktuell.id));
        break;
      }
      const bekannt = ebenen.get(aktuell.id);
      if (bekannt !== undefined) {
        basis = bekannt;
        break;
      }
      kette.push(aktuell);
      inKette.add(aktuell.id);
      if (aktuell.elternId === lvId) break;
      aktuell = byId.get(aktuell.elternId);
    }
    if (kette.some((z) => imZyklus.has(z.id))) continue;
    let summe = basis;
    for (let i = kette.length - 1; i >= 0; i--) {
      const z = kette[i];
      if (!z) continue;
      summe += ebenenbeitrag(z.art);
      ebenen.set(z.id, summe);
    }
  }
  for (const k of knoten) {
    if ((k.art === 'los' || k.art === 'titel') && (ebenen.get(k.id) ?? 0) > MAX_GLIEDERUNGSEBENEN) {
      fehler.push(
        befehlsfehler(
          'ebene-ueberschritten',
          `Mehr als ${String(MAX_GLIEDERUNGSEBENEN)} Gliederungsebenen bei ${k.id}`,
          k.id,
        ),
      );
    }
  }

  // Positionen
  const istPosition = (id: string): boolean => byId.get(id)?.art === 'position';
  for (const k of knoten) {
    if (k.art !== 'position') continue;
    const f = positionsdatenFehler(k, k.id, istPosition);
    if (f) fehler.push(f);
  }
  return fehler;
}

/**
 * Alle Verstöße des LV gegen die Invarianten des Baums als Meldungstexte; leer heißt gültig. Für Tests und
 * Folgetickets (z. B. nach jedem Befehl in Property-Tests).
 */
export function pruefeLvInvarianten(lv: Pick<Leistungsverzeichnis, 'id' | 'knoten'>): string[] {
  return baumfehler(lv.id, lv.knoten).map((f) => `${f.code}: ${f.meldung}`);
}
