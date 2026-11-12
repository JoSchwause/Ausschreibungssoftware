// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 90 (C5, G-17): die reinen Teile von Muster-LV und Textquelle in der App. Muster-LV kennzeichnen (`VorlageSetzen`),
// die Vorlagen aller Projekte finden (aus `LvUebersicht.vorlage`, D-43), Positionen und Gliederungen einer Vorlage zum
// Übernehmen wählen und als **einen** `KnotenEinfuegen` mit neuen Kennungen bauen (`kopieBauen`, K9); die Textquelle der
// übernommenen Positionen ist der Name der Vorlage, wenn sie leer ist. Textquelle einer Position: `TextquelleSetzen`.

import { kinderJeEltern, kopieBauen } from '@tethys/kern';
import type {
  Einfuegeort,
  IdQuelle,
  Knoten,
  KnotenId,
  LeistungsverzeichnisId,
  LvBefehl,
  LvUebersicht,
  LvZustand,
  Position,
  ProjektId,
} from '@tethys/vertrag';

/** `VorlageSetzen`, wenn sich das Kennzeichen ändert; sonst nichts (Abbrechen und Übernehmen ohne Änderung sind kein Befehl). */
export function vorlageBefehl(lv: { readonly vorlage?: boolean }, gewollt: boolean): LvBefehl | null {
  return (lv.vorlage === true) === gewollt ? null : { art: 'VorlageSetzen', vorlage: gewollt };
}

/**
 * `TextquelleSetzen`, wenn der eingegebene Text von der Textquelle der Position abweicht. Leer (auch nur Leerraum) ist
 * keine Quelle und entfernt sie (`null`); sonst wird der Text ohne Randleerraum gesetzt.
 */
export function textquelleBefehl(p: Pick<Position, 'id' | 'textquelle'>, text: string): LvBefehl | null {
  const neu = text.trim() === '' ? null : text.trim();
  return (p.textquelle ?? null) === neu
    ? null
    : { art: 'TextquelleSetzen', positionId: p.id, textquelle: neu };
}

export interface VorlageEintrag {
  readonly lvId: LeistungsverzeichnisId;
  readonly lvName: string;
  readonly projektId: ProjektId;
  readonly projektName: string;
}

/** Die Vorlagen aller Projekte, je Projekt in der Reihenfolge der Liste; `ohne` nimmt das offene LV heraus. */
export function vorlagenAus(
  projekte: readonly {
    readonly id: ProjektId;
    readonly name: string;
    readonly lvs: readonly LvUebersicht[];
  }[],
  ohne?: LeistungsverzeichnisId,
): VorlageEintrag[] {
  return projekte.flatMap((p) =>
    p.lvs
      .filter((l) => l.vorlage === true && l.id !== ohne)
      .map((l) => ({ lvId: l.id, lvName: l.name, projektId: p.id, projektName: p.name })),
  );
}

export interface BaumZeile {
  readonly id: KnotenId;
  readonly art: Knoten['art'];
  readonly tiefe: number;
  /** „OZ Kurztext“, bei einem Hinweistext sein erster Text in Kürze. */
  readonly text: string;
  /** Die Knoten darunter (Nachfahren), für „Gliederung mit allem darunter wählen“. */
  readonly nachfahren: readonly KnotenId[];
}

function zeilentext(k: Knoten): string {
  if (k.art === 'hinweis') return 'Hinweistext';
  return [k.ordnungszahl ?? '', k.kurztext].filter((x) => x !== '').join(' ');
}

/** Der Baum des LV in Anzeigereihenfolge (Eltern vor Kindern, Geschwister nach `reihenfolge`). */
export function baumZeilen(zustand: LvZustand): BaumZeile[] {
  const lv = zustand.leistungsverzeichnis;
  const kinder = kinderJeEltern(lv.knoten); // Kern (S9)
  const zeilen: BaumZeile[] = [];
  const nachfahren = (id: string): KnotenId[] =>
    (kinder.get(id) ?? []).flatMap((k) => [k.id as KnotenId, ...nachfahren(k.id)]);
  const gehe = (elternId: string, tiefe: number): void => {
    for (const k of kinder.get(elternId) ?? []) {
      zeilen.push({
        id: k.id,
        art: k.art,
        tiefe,
        text: zeilentext(k),
        nachfahren: nachfahren(k.id),
      });
      gehe(k.id, tiefe + 1);
    }
  };
  gehe(lv.id, 0);
  return zeilen;
}

/** Schaltet einen Knoten um; eine Gliederung zieht alles darunter mit (an: alle an, aus: alle aus). */
export function auswahlUmschalten(
  gewaehlt: ReadonlySet<KnotenId>,
  zeile: Pick<BaumZeile, 'id' | 'nachfahren'>,
): Set<KnotenId> {
  const neu = new Set(gewaehlt);
  const an = !neu.has(zeile.id);
  for (const id of [zeile.id, ...zeile.nachfahren]) {
    if (an) neu.add(id);
    else neu.delete(id);
  }
  return neu;
}

/** Wohin eingefügt wird: hinter die aktive Zeile oder, ohne eine, ans Ende des LV (wie Strg+V im Grid). */
export function einfuegeOrt(ziel: LvZustand, aktiv: KnotenId | null): Einfuegeort {
  const lv = ziel.leistungsverzeichnis;
  return aktiv !== null && lv.knoten.some((k) => k.id === aktiv)
    ? { art: 'nach', knotenId: aktiv }
    : { art: 'ende', elternId: lv.id };
}

export interface Uebernahme {
  readonly befehl: LvBefehl;
  readonly positionen: number;
  readonly ohneBezug: number;
}

/**
 * Baut die Übernahme: `KnotenEinfuegen` mit Kopien (neue Kennungen) der gewählten Knoten samt allem darunter, in der
 * Reihenfolge der Vorlage. Positionen ohne Textquelle bekommen den Namen der Vorlage; eine vorhandene bleibt. Bezüge, die
 * aus der Auswahl hinaus in die Vorlage zeigen (Zuschlagsbezug, Grundposition einer Wahlposition), gehören nicht ins
 * Ziel-LV und werden entfernt, nie stehen gelassen (Q5: `ohneBezug` zählt sie, die App meldet es). Wirft nur bei einer
 * Kennung, die es in der Vorlage nicht gibt (Programmfehler des Aufrufers); eine leere Auswahl gibt `null`.
 */
export function uebernahmeBauen(
  vorlage: LvZustand,
  auswahl: ReadonlySet<KnotenId>,
  ids: Pick<IdQuelle, 'los' | 'titel' | 'position' | 'hinweistext'>,
  ort: Einfuegeort,
): Uebernahme | null {
  if (auswahl.size === 0) return null;
  const reihenfolge = baumZeilen(vorlage)
    .map((z) => z.id)
    .filter((id) => auswahl.has(id));
  const kopie = kopieBauen(vorlage, reihenfolge, ids);
  const neueIds = new Set<string>(kopie.map((k) => k.id));
  const name = vorlage.leistungsverzeichnis.name;
  let ohneBezug = 0;
  let positionen = 0;
  const knoten = kopie.map((k): Knoten => {
    if (k.art !== 'position') return k;
    positionen += 1;
    let p: Position = k.textquelle === undefined ? { ...k, textquelle: name } : k;
    const z = p.zuschlag;
    if (z?.bezug.art === 'positionen') {
      const bleibt = z.bezug.positionen.filter((b) => neueIds.has(b.positionId));
      if (bleibt.length !== z.bezug.positionen.length) {
        ohneBezug += z.bezug.positionen.length - bleibt.length;
        p = { ...p, zuschlag: { ...z, bezug: { art: 'positionen', positionen: bleibt } } };
      }
    }
    const wahl = p.merkmale.wahl;
    if (wahl !== null && wahl.grundpositionId !== null && !neueIds.has(wahl.grundpositionId)) {
      ohneBezug += 1;
      p = { ...p, merkmale: { ...p.merkmale, wahl: { ...wahl, grundpositionId: null } } };
    }
    return p;
  });
  return { befehl: { art: 'KnotenEinfuegen', ort, knoten }, positionen, ohneBezug };
}
