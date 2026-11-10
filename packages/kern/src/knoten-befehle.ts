// SPDX-License-Identifier: AGPL-3.0-or-later
// Baumbefehle (Ticket 05): GliederungAnlegen, PositionAnlegen, HinweistextAnlegen, KnotenLoeschen,
// KnotenVerschieben. Jeder Befehl ist `(LvZustand, Befehl) → Ergebnis<LvChangeSet, Befehlsfehler>`: rein, ohne
// Zufall und Uhr, die IDs bringt der Befehl mit (A2).
//
// Einfügen „nach X“ (Glossar/Ticket 05, festgelegt und in `baum.test.ts` dokumentiert):
//  - X ist eine Position oder ein Hinweistext: Elternknoten von X, direkt hinter X.
//  - X ist eine Gliederung (Los oder Titel): Elternknoten ist X selbst, an erster Stelle (erster Unterknoten).
// Beim Verschieben gilt „nach X“ nachdem der bewegte Knoten aus seiner alten Lage herausgenommen wurde.
//
// Summen (Ticket 07): Jeder Befehl liefert die betroffenen Summen mit. Er meldet, um welchen Betrag sich der Beitrag an
// einem Elternknoten ändert (Einfügen: plus, Löschen: minus, Verschieben: minus an der alten, plus an der neuen
// Kette); `summenAenderung` rechnet nur die Ketten bis zur Wurzel nach (A6).

import type {
  Befehlsfehler,
  Einfuegeort,
  ElternId,
  Ergebnis,
  GliederungAnlegen,
  GliederungId,
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
  Summenaenderung,
  TitelId,
} from '@tethys/vertrag';
import { LEERE_SUMMENAENDERUNG, baueChangeSet } from './changeset';
import { positionMitEinheiten } from './einheit';
import { nein, ok } from './fehler';
import { positionsdatenFehler, unerlaubtesFeld } from './pruefung';
import { MAX_GLIEDERUNGSEBENEN, darfKinderHaben, ebenenbeitrag, losErlaubtUnter } from './regeln';
import type { ElternArt } from './regeln';
import { ebenenBis, ebenenHoehe, indexVon, liegtUnter, unterbaum } from './struktur';
import type { Baumindex } from './struktur';
import { NULL_BETRAG } from '@tethys/dezimal';
import {
  beitragVon,
  beitragZurSumme,
  herausnehmen,
  hineinlegen,
  positionsSumme,
  summenAenderung,
} from './summen';

type Aenderung = { readonly vorher: Knoten; readonly nachher: Knoten };
type ChangeSetErgebnis = Ergebnis<LvChangeSet, Befehlsfehler>;

interface Ziel {
  readonly elternId: string;
  readonly elternArt: ElternArt;
  /** Index in der Geschwisterliste *ohne* den bewegten Knoten. */
  readonly index: number;
}

function knotenChangeSet(
  z: LvZustand,
  teile: {
    hinzugefuegt?: readonly Knoten[];
    geaendert?: readonly Aenderung[];
    entfernt?: readonly Knoten[];
    summen?: Summenaenderung;
  },
): LvChangeSet {
  return baueChangeSet(z, teile);
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

/** Prüft ID, Ziel und (für Gliederungen) Los-Regel und Ebenentiefe; liefert das Ziel. */
function einfuegenPruefen(
  z: LvZustand,
  idx: Baumindex,
  neueId: string,
  ort: Einfuegeort,
  art: Knoten['art'],
): Ergebnis<Ziel, Befehlsfehler> {
  if (idx.byId.has(neueId) || neueId === z.leistungsverzeichnis.id) {
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
  summen: (neu: Knoten) => Summenaenderung,
): LvChangeSet {
  const geschwister = idx.kinder.get(t.elternId) ?? [];
  const geaendert: Aenderung[] = geschwister
    .slice(t.index)
    .map((k, i) => ({ vorher: k, nachher: { ...k, reihenfolge: t.index + i + 1 } }));
  const neu = build(t);
  return knotenChangeSet(z, { hinzugefuegt: [neu], geaendert, summen: summen(neu) });
}

export function gliederungAnlegen(z: LvZustand, b: GliederungAnlegen): ChangeSetErgebnis {
  const feld = unerlaubtesFeld(b, 'gliederung', ['gliederungsart', 'ort']);
  if (feld !== null) {
    return nein('ungueltige-eingabe', `Feld „${feld}“ ist an einer Gliederung nicht zulässig.`, b.id, feld);
  }
  const idx = indexVon(z.leistungsverzeichnis.id, z.leistungsverzeichnis.knoten);
  if (!(['los', 'titel'] as readonly string[]).includes(b.gliederungsart)) {
    return nein('ungueltige-eingabe', 'gliederungsart ist „los“ oder „titel“.', b.id, 'gliederungsart');
  }
  const ziel = einfuegenPruefen(z, idx, b.id, b.ort, b.gliederungsart);
  if (!ziel.ok) return ziel;
  return ok(
    einfuegenChangeSet(
      z,
      idx,
      ziel.wert,
      (t) =>
        b.gliederungsart === 'los'
          ? {
              art: 'los',
              id: b.id as LosId,
              elternId: t.elternId as ElternId,
              reihenfolge: t.index,
              ordnungszahl: null,
              kurztext: b.kurztext,
            }
          : {
              art: 'titel',
              id: b.id as TitelId,
              elternId: t.elternId as ElternId,
              reihenfolge: t.index,
              ordnungszahl: null,
              kurztext: b.kurztext,
            },
      (neu) =>
        summenAenderung(z, idx, {
          neueGliederungen: [{ gliederungId: neu.id as GliederungId, summe: NULL_BETRAG }],
        }),
    ),
  );
}

export function positionAnlegen(z: LvZustand, b: PositionAnlegen): ChangeSetErgebnis {
  const idx = indexVon(z.leistungsverzeichnis.id, z.leistungsverzeichnis.knoten);
  const ziel = einfuegenPruefen(z, idx, b.id, b.ort, 'position');
  if (!ziel.ok) return ziel;
  const formfehler = positionsdatenFehler(b.daten, b.id, (i) => idx.byId.get(i)?.art === 'position');
  if (formfehler) return { ok: false, fehler: formfehler };
  const d = b.daten;
  return ok(
    einfuegenChangeSet(
      z,
      idx,
      ziel.wert,
      (t): Position =>
        positionMitEinheiten({
          art: 'position',
          id: b.id,
          elternId: t.elternId as ElternId,
          reihenfolge: t.index,
          ordnungszahl: d.ordnungszahl,
          ozIndex: d.ozIndex,
          merkmale: d.merkmale, // v1.1b: mechanisch angepasst, Folgeticket
          zuschlag: d.zuschlag,
          ...(d.leitbeschreibung === undefined ? {} : { leitbeschreibung: d.leitbeschreibung }),
          kurztext: d.kurztext,
          langtext: d.langtext,
          menge: d.menge,
          einheit: d.einheit,
          einheitspreis: d.einheitspreis,
          epa: d.epa,
        }),
      (neu) => {
        const summe = positionsSumme(neu as Position);
        return summenAenderung(z, idx, {
          positionen: [summe],
          beitraege: [hineinlegen(ziel.wert.elternId, beitragZurSumme(summe))],
        });
      },
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
    einfuegenChangeSet(
      z,
      idx,
      ziel.wert,
      (t): Hinweistext => ({
        art: 'hinweis',
        id: b.id,
        elternId: t.elternId as ElternId,
        reihenfolge: t.index,
        text: b.text,
      }),
      () => LEERE_SUMMENAENDERUNG,
    ),
  );
}

export function knotenLoeschen(z: LvZustand, b: KnotenLoeschen): ChangeSetErgebnis {
  const idx = indexVon(z.leistungsverzeichnis.id, z.leistungsverzeichnis.knoten);
  const knoten = idx.byId.get(b.knotenId);
  if (!knoten) return nein('knoten-unbekannt', `Knoten unbekannt: ${b.knotenId}`, b.knotenId);
  const geschwister = idx.kinder.get(knoten.elternId) ?? [];
  const pos = geschwister.findIndex((k) => k.id === knoten.id);
  const geaendert: Aenderung[] = geschwister
    .slice(pos + 1)
    .map((k, i) => ({ vorher: k, nachher: { ...k, reihenfolge: pos + i } }));
  // Summen: der Beitrag des Knotens verschwindet aus der Kette seines Elternknotens; die Einträge der entfernten Knoten
  // fallen beim Anwenden weg.
  const summen = summenAenderung(z, idx, {
    beitraege: [herausnehmen(knoten.elternId, beitragVon(z.summen, knoten))],
  });
  return ok(knotenChangeSet(z, { entfernt: unterbaum(idx, knoten), geaendert, summen }));
}

export function knotenVerschieben(z: LvZustand, b: KnotenVerschieben): ChangeSetErgebnis {
  const idx = indexVon(z.leistungsverzeichnis.id, z.leistungsverzeichnis.knoten);
  const knoten = idx.byId.get(b.knotenId);
  if (!knoten) return nein('knoten-unbekannt', `Knoten unbekannt: ${b.knotenId}`, b.knotenId);
  const istGliederung = knoten.art === 'los' || knoten.art === 'titel';

  // „nach sich selbst“: bei einer Position/einem Hinweistext eine Nullbewegung, bei einer Gliederung ein Zyklus.
  if (b.ziel.art === 'nach' && b.ziel.knotenId === knoten.id && !istGliederung) {
    return ok(knotenChangeSet(z, {}));
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
  // Summen: der Knoten nimmt seinen Beitrag aus der alten Kette und legt ihn in die neue. Gemeinsame Vorfahren
  // ändern sich netto nicht und bleiben ungenannt.
  const summen =
    knoten.elternId === t.elternId
      ? LEERE_SUMMENAENDERUNG
      : summenAenderung(z, idx, {
          beitraege: [
            herausnehmen(knoten.elternId, beitragVon(z.summen, knoten)),
            hineinlegen(t.elternId, beitragVon(z.summen, knoten)),
          ],
        });
  return ok(knotenChangeSet(z, { geaendert, summen }));
}
