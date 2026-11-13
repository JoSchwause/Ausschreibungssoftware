// SPDX-License-Identifier: AGPL-3.0-or-later
// Baumbefehle (Ticket 05): GliederungAnlegen, PositionAnlegen, HinweistextAnlegen, KnotenLoeschen,
// KnotenVerschieben. Jeder Befehl ist `(LvZustand, Befehl) → Ergebnis<LvChangeSet, Befehlsfehler>`: rein, ohne
// Zufall und Uhr, die IDs bringt der Befehl mit (A2).
//
// Einfügen „nach X“ (Glossar/Ticket 05, festgelegt und in `baum.test.ts` dokumentiert):
//  - X ist eine Position oder ein Hinweistext: Elternknoten von X, direkt hinter X.
//  - X ist eine Gliederung (Los oder Titel): Elternknoten ist X selbst, an erster Stelle (erster Unterknoten).
// Einfügen „hinter der Gliederung G“ (v1.3, Ticket 56): Elternknoten von G, direkt hinter G (samt Unterbaum), wie „nach“
// einer Position. G muss eine Gliederung sein (sonst `knotenart-unzulaessig`); G hinter sich selbst ist eine Nullbewegung.
// Beim Verschieben gilt „nach X“ nachdem der bewegte Knoten aus seiner alten Lage herausgenommen wurde.
//
// Summen (Ticket 07, Ticket 37): Jeder Befehl liefert die betroffenen Summen mit. `summenAenderung` leitet sie aus den
// Knotenänderungen ab: Beiträge an den alten und neuen Elternketten und die Zuschlagspositionen, deren Bereich oder
// Liste sich ändert (A6).

import type {
  Befehlsfehler,
  Einfuegeort,
  ElternId,
  Ergebnis,
  GliederungAnlegen,
  Hinweistext,
  HinweistextAnlegen,
  Knoten,
  KnotenLoeschen,
  KnotenVerschieben,
  LosId,
  LvChangeSet,
  LvZustand,
  Position,
  PositionAnlegen,
  TitelId,
} from '@tethys/vertrag';
import { baueChangeSet } from './changeset';
import { positionNormal } from './mengenansatz';
import { handOzFehler } from './oz-befehle';
import { nein, ok } from './fehler';
import { elternArtVon, gliederungFuerHinter } from './platzieren';
import { positionsdatenFehler, unerlaubtesFeld } from './pruefung';
import {
  MAX_GLIEDERUNGSEBENEN,
  darfKinderHaben,
  ebenenbeitrag,
  losErlaubtUnter,
  obersteEbeneFehler,
} from './regeln';
import type { ElternArt } from './regeln';
import { ebenenBis, ebenenHoehe, indexVon, liegtUnter, papierkorbKnoten, unterbaum } from './struktur';
import type { Baumindex } from './struktur';
import { summenAenderung } from './summen';
import { bezugsindex } from './zuschlag';

type Aenderung = { readonly vorher: Knoten; readonly nachher: Knoten };
type ChangeSetErgebnis = Ergebnis<LvChangeSet, Befehlsfehler>;

interface Ziel {
  readonly elternId: string;
  readonly elternArt: ElternArt;
  /** Index in der Geschwisterliste *ohne* den bewegten Knoten. */
  readonly index: number;
}

/** ChangeSet aus Knotenänderungen; die Summen folgen daraus (`summenAenderung`, A6). */
function knotenChangeSet(
  z: LvZustand,
  idx: Baumindex,
  teile: {
    hinzugefuegt?: readonly Knoten[];
    geaendert?: readonly Aenderung[];
    entfernt?: readonly Knoten[];
  },
): LvChangeSet {
  return baueChangeSet(z, { ...teile, summen: summenAenderung(z, idx, { knoten: teile }) });
}

/** Löst einen Einfügeort in Elternknoten und Index auf. `ausser`: ein Knoten, der bei der Zählung fehlt (Verschieben). */
function zielAufloesen(idx: Baumindex, ort: Einfuegeort, ausser?: string): Ergebnis<Ziel, Befehlsfehler> {
  const geschwister = (eltern: string) => (idx.kinder.get(eltern) ?? []).filter((k) => k.id !== ausser);
  if (ort.art === 'nach') {
    const x = idx.byId.get(ort.knotenId);
    if (!x) return nein('knoten-unbekannt', `Knoten unbekannt: ${ort.knotenId}`, ort.knotenId);
    if (x.art === 'los' || x.art === 'titel') return ok({ elternId: x.id, elternArt: x.art, index: 0 });
    const eltern = x.elternId;
    const elternArt: ElternArt = eltern === idx.lvId ? 'wurzel' : (idx.byId.get(eltern)?.art ?? 'wurzel');
    const position = geschwister(eltern).findIndex((k) => k.id === x.id);
    // x ist der bewegte Knoten selbst: wird vom Aufrufer als Nullbewegung behandelt, hier nie erreicht.
    return ok({ elternId: eltern, elternArt, index: position + 1 });
  }
  if (ort.art === 'hinter-gliederung') {
    const g = gliederungFuerHinter(idx, ort.gliederungId);
    if (!g.ok) return g;
    const eltern = g.wert.elternId;
    const position = geschwister(eltern).findIndex((k) => k.id === g.wert.id);
    // g ist der bewegte Knoten selbst: wird vom Aufrufer als Nullbewegung behandelt, hier nie erreicht.
    return ok({ elternId: eltern, elternArt: elternArtVon(idx, eltern) ?? 'wurzel', index: position + 1 });
  }
  const eltern = ort.elternId;
  let elternArt: ElternArt;
  if (eltern === idx.lvId) {
    elternArt = 'wurzel';
  } else {
    const e = idx.byId.get(eltern);
    if (!e) return nein('eltern-unbekannt', `Elternknoten unbekannt: ${eltern}`, eltern);
    elternArt = e.art;
  }
  if (!darfKinderHaben(elternArt)) {
    return nein('knotenart-unzulaessig', `Unter einer Knotenart „${elternArt}“ stehen keine Kinder.`, eltern);
  }
  const anzahl = geschwister(eltern).length;
  return ok({ elternId: eltern, elternArt, index: ort.art === 'anfang' ? 0 : anzahl });
}

/** F1 (`obersteEbeneFehler`): kommt ein Knoten neu auf die oberste Ebene, ein Fehlerwert oder `null`. */
function obersteEbene(
  z: LvZustand,
  idx: Baumindex,
  t: Ziel,
  art: Knoten['art'],
  knotenId: string,
): Ergebnis<never, Befehlsfehler> | null {
  if (t.elternArt !== 'wurzel') return null;
  const geschwister = (idx.kinder.get(idx.lvId) ?? []).filter((k) => k.id !== knotenId).map((k) => k.art);
  const f = obersteEbeneFehler(art, geschwister, z.leistungsverzeichnis.ozMaske.losStufe === true);
  return f === null ? null : nein('knotenart-unzulaessig', f, knotenId);
}

/** Prüft ID, Ziel und (für Gliederungen) Los-Regel, oberste Ebene (F1) und Ebenentiefe; liefert das Ziel. */
function einfuegenPruefen(
  z: LvZustand,
  idx: Baumindex,
  neueId: string,
  ort: Einfuegeort,
  art: Knoten['art'],
): Ergebnis<Ziel, Befehlsfehler> {
  if (
    idx.byId.has(neueId) ||
    neueId === z.leistungsverzeichnis.id ||
    papierkorbKnoten(z.papierkorb).has(neueId)
  ) {
    return nein('id-vergeben', `Kennung bereits vergeben: ${neueId}`, neueId);
  }
  const ziel = zielAufloesen(idx, ort);
  if (!ziel.ok) return ziel;
  const t = ziel.wert;
  if (art === 'los' && !losErlaubtUnter(t.elternArt)) {
    return nein(
      'knotenart-unzulaessig',
      'Ein Los steht nur direkt unter dem LV (vorläufige Annahme).',
      neueId,
    );
  }
  const oben = obersteEbene(z, idx, t, art, neueId);
  if (oben !== null) return oben;
  if (ebenenbeitrag(art) > 0 && ebenenBis(idx, t.elternId) + ebenenbeitrag(art) > MAX_GLIEDERUNGSEBENEN) {
    return nein(
      'ebene-ueberschritten',
      `Mehr als ${String(MAX_GLIEDERUNGSEBENEN)} Gliederungsebenen.`,
      neueId,
    );
  }
  return ok(t);
}

/** ChangeSet für einen neuen Knoten an `t`: Geschwister ab dem Index rücken um eins auf. */
function einfuegenChangeSet(
  z: LvZustand,
  idx: Baumindex,
  t: Ziel,
  build: (lage: Ziel) => Knoten,
): LvChangeSet {
  const geschwister = idx.kinder.get(t.elternId) ?? [];
  const geaendert: Aenderung[] = geschwister
    .slice(t.index)
    .map((k, i) => ({ vorher: k, nachher: { ...k, reihenfolge: t.index + i + 1 } }));
  const neu = build(t);
  return knotenChangeSet(z, idx, { hinzugefuegt: [neu], geaendert });
}

export function gliederungAnlegen(z: LvZustand, b: GliederungAnlegen): ChangeSetErgebnis {
  const feld = unerlaubtesFeld(b, 'gliederung', ['gliederungsart', 'ort']); // `ordnungszahl` ist erlaubt
  if (feld !== null) {
    return nein('ungueltige-eingabe', `Feld „${feld}“ ist an einer Gliederung nicht zulässig.`, b.id, feld);
  }
  const idx = indexVon(z.leistungsverzeichnis.id, z.leistungsverzeichnis.knoten);
  if (!(['los', 'titel'] as readonly string[]).includes(b.gliederungsart)) {
    return nein('ungueltige-eingabe', 'gliederungsart ist „los“ oder „titel“.', b.id, 'gliederungsart');
  }
  const ziel = einfuegenPruefen(z, idx, b.id, b.ort, b.gliederungsart);
  if (!ziel.ok) return ziel;
  // Ticket 30: eine mitgebrachte OZ wird wie bei `OrdnungszahlSetzen` geprüft (doppelt ist erlaubt, F2).
  const ordnungszahl = b.ordnungszahl ?? null;
  const ozFehlerwert = handOzFehler(
    z.leistungsverzeichnis.ozMaske,
    b.gliederungsart,
    ebenenBis(idx, ziel.wert.elternId) + ebenenbeitrag(b.gliederungsart),
    ordnungszahl,
    null,
    b.id,
  );
  if (ozFehlerwert !== null) return { ok: false, fehler: ozFehlerwert };
  return ok(
    einfuegenChangeSet(z, idx, ziel.wert, (t) =>
      b.gliederungsart === 'los'
        ? {
            art: 'los',
            id: b.id as LosId,
            elternId: t.elternId as ElternId,
            reihenfolge: t.index,
            ordnungszahl,
            kurztext: b.kurztext,
          }
        : {
            art: 'titel',
            id: b.id as TitelId,
            elternId: t.elternId as ElternId,
            reihenfolge: t.index,
            ordnungszahl,
            kurztext: b.kurztext,
          },
    ),
  );
}

export function positionAnlegen(z: LvZustand, b: PositionAnlegen): ChangeSetErgebnis {
  const idx = indexVon(z.leistungsverzeichnis.id, z.leistungsverzeichnis.knoten);
  const ziel = einfuegenPruefen(z, idx, b.id, b.ort, 'position');
  if (!ziel.ok) return ziel;
  const korb = papierkorbKnoten(z.papierkorb);
  const formfehler = positionsdatenFehler(b.daten, b.id, (i) => idx.byId.get(i) ?? korb.get(i));
  if (formfehler) return { ok: false, fehler: formfehler };
  const d = b.daten;
  // Ein mitgebrachter Mengenansatz bleibt stehen (Ticket 56, D-56.1; Form geprüft in `positionsdatenFehler`, `[]` fällt
  // in `positionNormal` weg). Ebenso Kostengruppe und Textquelle (v1.4, Ticket 71; `''` als Textquelle fällt weg) und die
  // Bauteilzuordnungen (v1.6, Ticket 105; `[]` fällt weg) und die Kalkulation (v1.7a, Ticket 137; leer fällt sie weg).
  return ok(
    einfuegenChangeSet(z, idx, ziel.wert, (t): Position =>
      positionNormal({
        art: 'position',
        id: b.id,
        elternId: t.elternId as ElternId,
        reihenfolge: t.index,
        ordnungszahl: d.ordnungszahl,
        ozIndex: d.ozIndex,
        merkmale: d.merkmale,
        zuschlag: d.zuschlag,
        ...(d.leitbeschreibung === undefined ? {} : { leitbeschreibung: d.leitbeschreibung }),
        ...(d.mengenansatz === undefined ? {} : { mengenansatz: d.mengenansatz }),
        kurztext: d.kurztext,
        langtext: d.langtext,
        menge: d.menge,
        einheit: d.einheit,
        einheitspreis: d.einheitspreis,
        epa: d.epa,
        ...(d.kostengruppe === undefined ? {} : { kostengruppe: d.kostengruppe }),
        ...(d.textquelle === undefined ? {} : { textquelle: d.textquelle }),
        ...(d.bauteile === undefined ? {} : { bauteile: d.bauteile }),
        ...(d.kalkulation === undefined ? {} : { kalkulation: d.kalkulation }),
      }),
    ),
  );
}

export function hinweistextAnlegen(z: LvZustand, b: HinweistextAnlegen): ChangeSetErgebnis {
  // Ein Hinweistext trägt weder Menge noch Einheit noch Preis. Der Typ verbietet es; zur Laufzeit (JSON aus dem
  // Befehlsprotokoll, Eingaben von außen) prüft der Kern es zusätzlich.
  const feld = unerlaubtesFeld(b, 'hinweis', ['ort']);
  if (feld !== null) {
    return nein('ungueltige-eingabe', `Ein Hinweistext trägt kein Feld „${feld}“.`, b.id, feld);
  }
  const idx = indexVon(z.leistungsverzeichnis.id, z.leistungsverzeichnis.knoten);
  const ziel = einfuegenPruefen(z, idx, b.id, b.ort, 'hinweis');
  if (!ziel.ok) return ziel;
  return ok(
    einfuegenChangeSet(z, idx, ziel.wert, (t): Hinweistext => ({
      art: 'hinweis',
      id: b.id,
      elternId: t.elternId as ElternId,
      reihenfolge: t.index,
      text: b.text,
    })),
  );
}

/**
 * Löscht einen Knoten samt Unterbaum. Nennt eine Zuschlagsposition außerhalb des Unterbaums eine der gelöschten
 * Positionen in ihrer Liste (R5), verschwindet der Verweis im selben ChangeSet (die Zuschlagsposition steht unter
 * `knoten.geaendert`); die Umkehrung bringt ihn zurück (kein stiller Verlust, Q5).
 */
export function knotenLoeschen(z: LvZustand, b: KnotenLoeschen): ChangeSetErgebnis {
  const idx = indexVon(z.leistungsverzeichnis.id, z.leistungsverzeichnis.knoten);
  const knoten = idx.byId.get(b.knotenId);
  if (!knoten) return nein('knoten-unbekannt', `Knoten unbekannt: ${b.knotenId}`, b.knotenId);
  const entfernt = unterbaum(idx, knoten);
  const weg = new Set<string>(entfernt.map((k) => k.id));
  const geschwister = idx.kinder.get(knoten.elternId) ?? [];
  const pos = geschwister.findIndex((k) => k.id === knoten.id);
  const nachher = new Map<string, Knoten>();
  geschwister.slice(pos + 1).forEach((k, i) => nachher.set(k.id, { ...k, reihenfolge: pos + i }));
  // Verweise auf gelöschte Positionen aus den Bezugslisten anderer Zuschlagspositionen nehmen.
  const rueck = bezugsindex(z.leistungsverzeichnis.knoten);
  for (const k of entfernt) {
    for (const zid of rueck.get(k.id) ?? []) {
      if (weg.has(zid)) continue;
      const alt = nachher.get(zid) ?? idx.byId.get(zid);
      if (alt?.art !== 'position' || alt.zuschlag?.bezug.art !== 'positionen') continue;
      const bleibt = alt.zuschlag.bezug.positionen.filter((p) => !weg.has(p.positionId));
      if (bleibt.length === alt.zuschlag.bezug.positionen.length) continue;
      nachher.set(zid, {
        ...alt,
        zuschlag: { ...alt.zuschlag, bezug: { art: 'positionen', positionen: bleibt } },
      });
    }
  }
  const geaendert: Aenderung[] = [...nachher].map(([i, n]) => ({ vorher: idx.byId.get(i) ?? n, nachher: n }));
  return ok(knotenChangeSet(z, idx, { entfernt, geaendert }));
}

export function knotenVerschieben(z: LvZustand, b: KnotenVerschieben): ChangeSetErgebnis {
  const idx = indexVon(z.leistungsverzeichnis.id, z.leistungsverzeichnis.knoten);
  const knoten = idx.byId.get(b.knotenId);
  if (!knoten) return nein('knoten-unbekannt', `Knoten unbekannt: ${b.knotenId}`, b.knotenId);
  const istGliederung = knoten.art === 'los' || knoten.art === 'titel';

  // „nach sich selbst“: bei einer Position/einem Hinweistext eine Nullbewegung, bei einer Gliederung ein Zyklus.
  // „hinter sich selbst“ (Ticket 56): bei einer Gliederung eine Nullbewegung.
  if (
    (b.ziel.art === 'nach' && b.ziel.knotenId === knoten.id && !istGliederung) ||
    (b.ziel.art === 'hinter-gliederung' && b.ziel.gliederungId === knoten.id && istGliederung)
  ) {
    return ok(knotenChangeSet(z, idx, {}));
  }
  const ziel = zielAufloesen(idx, b.ziel, knoten.id);
  if (!ziel.ok) return ziel;
  const t = ziel.wert;
  if (liegtUnter(idx, t.elternId, knoten.id)) {
    return nein('zyklus', 'Ein Knoten lässt sich nicht in seinen eigenen Unterbaum verschieben.', knoten.id);
  }
  if (knoten.art === 'los' && !losErlaubtUnter(t.elternArt)) {
    return nein(
      'knotenart-unzulaessig',
      'Ein Los steht nur direkt unter dem LV (vorläufige Annahme).',
      knoten.id,
    );
  }
  if (knoten.elternId !== t.elternId) {
    const oben = obersteEbene(z, idx, t, knoten.art, knoten.id);
    if (oben !== null) return oben;
  }
  if (istGliederung && ebenenBis(idx, t.elternId) + ebenenHoehe(idx, knoten) > MAX_GLIEDERUNGSEBENEN) {
    return nein(
      'ebene-ueberschritten',
      `Mehr als ${String(MAX_GLIEDERUNGSEBENEN)} Gliederungsebenen.`,
      knoten.id,
    );
  }

  // Neue Geschwisterliste des Ziels, der bewegte Knoten an `t.index`.
  const zielListe = (idx.kinder.get(t.elternId) ?? []).filter((k) => k.id !== knoten.id);
  const geaendert: Aenderung[] = [];
  const neuerKnoten: Knoten = { ...knoten, elternId: t.elternId as ElternId, reihenfolge: t.index };
  const neueListe: Knoten[] = [...zielListe];
  neueListe.splice(t.index, 0, neuerKnoten);
  neueListe.forEach((k, i) => {
    const nachher = k.id === knoten.id ? neuerKnoten : { ...k, reihenfolge: i };
    if (
      nachher.reihenfolge !== (idx.byId.get(k.id) ?? k).reihenfolge ||
      nachher.elternId !== (idx.byId.get(k.id) ?? k).elternId
    ) {
      geaendert.push({ vorher: idx.byId.get(k.id) ?? k, nachher });
    }
  });
  // Alter Elternknoten: die Lücke schließen.
  if (knoten.elternId !== t.elternId) {
    (idx.kinder.get(knoten.elternId) ?? [])
      .filter((k) => k.id !== knoten.id)
      .forEach((k, i) => {
        if (k.reihenfolge !== i) geaendert.push({ vorher: k, nachher: { ...k, reihenfolge: i } });
      });
  }
  return ok(knotenChangeSet(z, idx, { geaendert }));
}
