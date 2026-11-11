// SPDX-License-Identifier: AGPL-3.0-or-later
// Prüfung von Baum und Knotendaten (Ticket 05): eine Quelle für `LeistungsverzeichnisAnlegen`, die
// Einzelbefehle und die Invariantenprüfung `pruefeLvInvarianten`.

import { alsBetrag, alsEinheitspreis, alsMenge, alsProzent } from '@tethys/dezimal';
import type {
  Befehlsfehler,
  Knoten,
  Leistungsverzeichnis,
  LvInhalt,
  Papierkorbeintrag,
  Positionsdaten,
} from '@tethys/vertrag';
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
 * Form einer Position: Zahlen in kanonischer Schreibweise, Bezüge zeigen auf vorhandene Positionen. `knotenVon`
 * liefert den Knoten zu einer ID im LV (für Bezüge).
 *
 * Die Merkmale sind kombinierbar (F5, E-05). Abgewiesen werden nur Formfehler (Ticket 37, `ungueltige-eingabe`):
 *  1. Zuschlagsposition mit `pauschal` oder `stundenlohn` (`merkmale`): ein Prozentzuschlag hat weder Menge noch Zeit;
 *  2. Zuschlagsposition mit `zuschlagskennzeichen` (`merkmale.zuschlagskennzeichen`): sie ist nie Basis;
 *  3. Bezugsliste nennt eine Zuschlagsposition (`zuschlag.bezug.positionen`; D-03: nie Basis einer anderen);
 *  4. `wahl.variante` nicht ganzzahlig 0 bis 9 oder `wahl.gruppe` negativ oder nicht ganzzahlig (`merkmale.wahl`);
 *  5. doppelte Bezugsposition in derselben Liste (`zuschlag.bezug.positionen`).
 * Mehr wird nicht abgewiesen (U5): Teilmenge größer als die Menge, leere Bezugsliste und fehlender Satz sind Befunde der
 * LV-Prüfung (K8, Ticket 41).
 */
export function positionsdatenFehler(
  daten: Positionsdaten,
  positionsId: string,
  knotenVon: (id: string) => Knoten | undefined,
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
      const gesehen = new Set<string>();
      for (const b of daten.zuschlag.bezug.positionen) {
        if (b.teilmenge !== null) {
          const e = alsMenge(b.teilmenge);
          if (!e.ok) return feld('zuschlag.bezug.positionen.teilmenge', e.fehler.meldung);
        }
        if (gesehen.has(b.positionId))
          return feld('zuschlag.bezug.positionen', `Bezugsposition doppelt genannt: ${b.positionId}`);
        gesehen.add(b.positionId);
      }
    }
    if (daten.merkmale.pauschal || daten.merkmale.stundenlohn)
      return feld('merkmale', 'Eine Zuschlagsposition ist weder pauschal noch Stundenlohn.');
    if (daten.merkmale.zuschlagskennzeichen)
      return feld('merkmale.zuschlagskennzeichen', 'Eine Zuschlagsposition ist nie Basis eines Zuschlags.');
  }
  const wahl = daten.merkmale.wahl;
  if (wahl !== null) {
    const nummer = (n: unknown, max: number): boolean =>
      n === null || (typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= max);
    if (
      typeof wahl !== 'object' ||
      !nummer(wahl.variante, 9) ||
      !nummer(wahl.gruppe, Number.MAX_SAFE_INTEGER)
    )
      return feld(
        'merkmale.wahl',
        'Die Variante ist 0 bis 9, die Gruppe nicht negativ (jeweils ganzzahlig oder null).',
      );
  }
  const bezug = daten.zuschlag?.bezug;
  const ziele: (readonly [string, string | null])[] = [
    ['merkmale.wahl.grundpositionId', daten.merkmale.wahl?.grundpositionId ?? null],
    ...(bezug?.art === 'positionen'
      ? bezug.positionen.map((b) => ['zuschlag.bezug.positionen', b.positionId] as const)
      : []),
  ];
  for (const [name, ziel] of ziele) {
    if (ziel !== null && (ziel === positionsId || knotenVon(ziel)?.art !== 'position')) {
      return befehlsfehler(
        'bezug-unbekannt',
        `${name} verweist nicht auf eine andere vorhandene Position: ${ziel}`,
        positionsId,
        name,
      );
    }
  }
  if (bezug?.art === 'positionen') {
    for (const b of bezug.positionen) {
      const k = knotenVon(b.positionId);
      if (k?.art === 'position' && k.zuschlag !== null)
        return feld(
          'zuschlag.bezug.positionen',
          `Bezugsposition ist selbst eine Zuschlagsposition: ${b.positionId}`,
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
 * Positionen. Unabhängig von der Array-Reihenfolge. `extern` (v1.2, K9): weitere Knoten, auf die ein Bezug zeigen darf
 * (die Positionen im Papierkorb, D-12).
 */
export function baumfehler(
  lvId: string,
  knoten: readonly Knoten[],
  extern?: (id: string) => Knoten | undefined,
): Befehlsfehler[] {
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
  const knotenVon = (id: string): Knoten | undefined => byId.get(id) ?? extern?.(id);
  for (const k of knoten) {
    if (k.art !== 'position') continue;
    const f = positionsdatenFehler(k, k.id, knotenVon);
    if (f) fehler.push(f);
  }
  return fehler;
}

/**
 * Verstöße des Papierkorbs (v1.2, K9): Eintragskennungen und Nummern eindeutig, Nummern ganzzahlig ab 1, kein Eintrag
 * leer, kein Knoten zugleich im Baum oder in zwei Einträgen.
 */
function papierkorbfehler(
  lvId: string,
  knoten: readonly Knoten[],
  korb: readonly Papierkorbeintrag[],
): Befehlsfehler[] {
  const fehler: Befehlsfehler[] = [];
  const belegt = new Set<string>([lvId, ...knoten.map((k) => k.id)]);
  const eintraege = new Set<string>();
  const nummern = new Set<number>();
  for (const e of korb) {
    if (eintraege.has(e.id))
      fehler.push(
        befehlsfehler('id-vergeben', `Papierkorbeintrag doppelt: ${e.id}`, undefined, 'papierkorb'),
      );
    eintraege.add(e.id);
    if (!Number.isInteger(e.nummer) || e.nummer < 1 || nummern.has(e.nummer))
      fehler.push(
        befehlsfehler(
          'ungueltige-eingabe',
          `Nummer ${String(e.nummer)} des Eintrags ${e.id} ist ungültig oder doppelt.`,
          undefined,
          'nummer',
        ),
      );
    nummern.add(e.nummer);
    if (e.knoten.length === 0)
      fehler.push(
        befehlsfehler('ungueltige-eingabe', `Papierkorbeintrag ${e.id} ist leer.`, undefined, 'papierkorb'),
      );
    for (const k of e.knoten) {
      if (belegt.has(k.id))
        fehler.push(
          befehlsfehler('id-vergeben', `Knoten ${k.id} liegt zweimal im LV (Baum oder Papierkorb).`, k.id),
        );
      belegt.add(k.id);
    }
  }
  return fehler;
}

/**
 * Alle Verstöße des LV gegen die Invarianten des Baums als Meldungstexte; leer heißt gültig. Für Tests und
 * Folgetickets (z. B. nach jedem Befehl in Property-Tests). Mit `papierkorb` (v1.2, `LvZustand.papierkorb`): Bezüge auf
 * Positionen im Papierkorb sind gültig (D-12), und der Papierkorb selbst wird geprüft (`papierkorbfehler`).
 */
export function pruefeLvInvarianten(
  lv: Pick<Leistungsverzeichnis, 'id' | 'knoten'>,
  papierkorb?: readonly Papierkorbeintrag[],
): string[] {
  const korb = papierkorb ?? [];
  const imKorb = new Map<string, Knoten>();
  for (const e of korb) for (const k of e.knoten) imKorb.set(k.id, k);
  return [
    ...baumfehler(lv.id, lv.knoten, korb.length === 0 ? undefined : (i) => imKorb.get(i)),
    ...papierkorbfehler(lv.id, lv.knoten, korb),
  ].map((f) => `${f.code}: ${f.meldung}`);
}
