// SPDX-License-Identifier: AGPL-3.0-or-later
// Nachtrag übernehmen (Ticket 80, D-35, D-70.6): Eine reine Funktion baut aus Auftrags-LV, Nachtrags-LV und Nachtragsangebot
// den AuftragsLvBefehl `NachtragUebernehmen`; ausgeführt und gerechnet wird er im Kern (Ticket 71). Wie `zuschlagErteilen`
// (D-21) prüft sie vorher, was der Befehl nicht trägt (Zugehörigkeit, MwSt, Bieter), setzt Lage, Ordnungszahlen und Preise
// und meldet Hinweise als Warnungen (U5). Sie ruft die `IdQuelle` erst, wenn keine Prüfung fehlschlug.
//
// Regeln (D-35, Lesart am Typ `NachtragUebernehmen`):
// - Neue Gliederung „Nachtrag <nummer>“ ans Ende der obersten Ebene: ein Los, wenn dort ein Los steht oder die Maske eine
//   Los-Stufe hat, sonst ein Titel (F1). OZ: der Vorschlag des Kerns für einen neuen Knoten am Ende der Wurzel (`ozVorschlag`,
//   D-42.3: Vorgänger + 1), also die nächste freie OZ der obersten Stufe.
// - Darunter der Baum des Nachtrags-LV ohne Wahl-Alternativen, mit allen Kennungen (D-70.6), `reihenfolge` dicht je
//   Elternknoten, Eltern vor Kindern in Dokumentreihenfolge. OZ: die des Nachtrags-LV mit der OZ der neuen Gliederung und
//   dem Trennzeichen davor (D-80.1, D-85.2: `01.0010` → `04.01.0010`).
// - Ein Los des Nachtrags-LV wird Titel mit derselben Kennung (D-80.2).
// - Positionen: EP und EPA des Angebots, an einer Zuschlagsposition der Zuschlagssatz des Angebots (wie D-21); nicht
//   angeboten oder ohne Eintrag: EP `null`. Bezüge auf Positionen, die nicht mitkommen, werden entfernt (wie D-21).

import { vergleiche } from '@tethys/dezimal';
import { MAX_GLIEDERUNGSEBENEN, ebenenbeitrag, ozFehler, ozVorschlag } from '@tethys/kern';
import type {
  Angebot,
  AngebotKopf,
  AngebotZustand,
  Angebotsposition,
  AuftragsLeistungsverzeichnis,
  AuftragsLvZustand,
  Befehlsfehler,
  Befehlsfehlercode,
  ElternId,
  Ergebnis,
  GliederungId,
  IdQuelle,
  Knoten,
  KnotenId,
  LeistungsverzeichnisId,
  Leistungsverzeichnis,
  LosId,
  LvZustand,
  Nachlass,
  NachtragUebernehmen,
  Ordnungszahl,
  Position,
  PositionId,
  TitelId,
} from '@tethys/vertrag';

/** Der Teil der einen `IdQuelle`, den die Übernahme braucht: die Kennung der neuen Gliederung (Los oder Titel). */
export type NachtragIdQuelle = Pick<IdQuelle, 'los' | 'titel'>;

/**
 * Ein Hinweis zur Übernahme (U5): Der Befehl entsteht trotzdem. Reihenfolge: `nachlass-ignoriert`, `alternativen-entfallen`,
 * dann je übernommenem Knoten in Dokumentreihenfolge (`los-wird-titel`, Preiswarnung, Bezüge), zuletzt `oz-unpassend`.
 * - `nachlass-ignoriert`: Das Nachtragsangebot hat einen Nachlass; er gilt nicht, das Auftrags-LV behält seinen (D-35).
 * - `alternativen-entfallen`: Wahl-Alternativen des Nachtrags-LV kommen nicht ins Auftrags-LV, ihre Grundposition bleibt.
 * - `los-wird-titel`: Ein Los des Nachtrags-LV steht unter der neuen Gliederung als Titel derselben Kennung (D-80.2).
 * - `nicht-angeboten`: Das Angebot hat die Position nicht angeboten (oder keinen Eintrag); EP `null` (wie D-21).
 * - `zuschlagssatz-fehlt`: Eine Zuschlagsposition ist angeboten, aber ohne Satz; Satz `null` (wie D-21).
 * - `bezug-entfernt`: Ein Listenbezug einer Zuschlagsposition oder ein `wahl.grundpositionId` zeigte auf eine Position,
 *   die nicht mitkommt (Alternative, Papierkorb); entfernt, nicht umgelenkt.
 * - `oz-unpassend`: Diese Knoten haben keine OZ oder eine, die nicht zur Maske des Auftrags-LV passt (`ozFehler` des Kerns);
 *   sie kommen trotzdem so ins Auftrags-LV (U5), Dokumentreihenfolge.
 */
export type Nachtragswarnung =
  | { readonly code: 'nachlass-ignoriert'; readonly nachlass: Nachlass }
  | { readonly code: 'alternativen-entfallen'; readonly anzahl: number; readonly positionIds: readonly PositionId[] }
  | { readonly code: 'los-wird-titel'; readonly knotenId: TitelId }
  | { readonly code: 'nicht-angeboten'; readonly positionId: PositionId }
  | { readonly code: 'zuschlagssatz-fehlt'; readonly positionId: PositionId }
  | {
      readonly code: 'bezug-entfernt';
      readonly positionId: PositionId;
      readonly feld: 'zuschlag.bezug.positionen' | 'merkmale.wahl.grundpositionId';
      readonly zielId: PositionId;
    }
  | { readonly code: 'oz-unpassend'; readonly knotenIds: readonly KnotenId[] };

export interface Nachtragsergebnis {
  readonly befehl: NachtragUebernehmen;
  readonly warnungen: readonly Nachtragswarnung[];
}

type Antwort = Ergebnis<Nachtragsergebnis, Befehlsfehler>;

function nein(code: Befehlsfehlercode, meldung: string, feld?: string, knotenId?: KnotenId): Antwort {
  return {
    ok: false,
    fehler: {
      code,
      meldung,
      ...(feld === undefined ? {} : { feld }),
      ...(knotenId === undefined ? {} : { knotenId }),
    },
  };
}

/** Eine Alternative: Wahl mit Variante ≠ 0 (Variante `null` eingeschlossen, D-37.1, wie `vergabe`). */
export const istAlternative = (k: Knoten): k is Position =>
  k.art === 'position' && k.merkmale.wahl !== null && k.merkmale.wahl.variante !== 0;

/** Kinder je Elternknoten in Geschwisterreihenfolge. */
function kinderVon(knoten: readonly Knoten[]): Map<string, Knoten[]> {
  const kinder = new Map<string, Knoten[]>();
  for (const k of knoten) {
    const liste = kinder.get(k.elternId);
    if (liste) liste.push(k);
    else kinder.set(k.elternId, [k]);
  }
  for (const liste of kinder.values()) liste.sort((a, b) => a.reihenfolge - b.reihenfolge);
  return kinder;
}

/** Ein übernommener Knoten mit seiner Stufe im Auftrags-LV (Gliederung: eigene; sonst die Stufen darüber). */
interface Eintrag {
  readonly knoten: Knoten;
  readonly elternId: string;
  readonly reihenfolge: number;
  readonly stufe: number;
}

/**
 * Die Knoten des Nachtrags-LV, die mitkommen, in Dokumentreihenfolge (Eltern vor Kindern): ohne Alternativen, `reihenfolge`
 * dicht je Elternknoten, `stufe` mit der neuen Gliederung als Stufe 1.
 */
function uebernommeneKnoten(l: Leistungsverzeichnis): Eintrag[] {
  const kinder = kinderVon(l.knoten.filter((k) => !istAlternative(k)));
  const aus: Eintrag[] = [];
  const besuche = (eltern: string, stufeEltern: number): void => {
    (kinder.get(eltern) ?? []).forEach((k, reihenfolge) => {
      const stufe = stufeEltern + ebenenbeitrag(k.art);
      aus.push({ knoten: k, elternId: eltern, reihenfolge, stufe: k.art === 'position' || k.art === 'hinweis' ? stufeEltern : stufe });
      if (k.art === 'los' || k.art === 'titel') besuche(k.id, stufe);
    });
  };
  besuche(l.id, 1);
  return aus;
}

/** Das Auftrags-LV als LV-Zustand, nur damit der OZ-Vorschlag des Kerns es lesen kann (die Kennung bleibt dieselbe). */
function alsLvAnsicht(z: AuftragsLvZustand): LvZustand {
  const a: AuftragsLeistungsverzeichnis = z.auftragsLeistungsverzeichnis;
  return {
    leistungsverzeichnis: {
      id: a.id as string as LeistungsverzeichnisId,
      projektId: a.projektId,
      name: a.name,
      ozMaske: a.ozMaske,
      mwstSatz: a.mwstSatz,
      nachlass: a.nachlass,
      knoten: a.knoten,
    },
    summen: z.summen,
  };
}

/** Die Position mit den Preisen des Angebots (wie das gedachte LV in `vergabe`, D-21) und ihre Preiswarnung. */
function mitPreisen(
  p: Position,
  eintrag: Angebotsposition | undefined,
): { position: Position; warnung: Nachtragswarnung | null } {
  const angeboten = eintrag?.status === 'angeboten' ? eintrag : null;
  if (p.zuschlag === null)
    return {
      position: { ...p, einheitspreis: angeboten?.einheitspreis ?? null, epa: angeboten?.epa ?? null },
      warnung: angeboten === null ? { code: 'nicht-angeboten', positionId: p.id } : null,
    };
  const prozentsatz = angeboten?.zuschlagssatz ?? null;
  return {
    position: {
      ...p,
      zuschlag: { ...p.zuschlag, prozentsatz },
      einheitspreis: prozentsatz === null ? (angeboten?.einheitspreis ?? null) : null,
      epa: prozentsatz === null ? (angeboten?.epa ?? null) : null,
    },
    warnung:
      angeboten === null
        ? { code: 'nicht-angeboten', positionId: p.id }
        : prozentsatz === null
          ? { code: 'zuschlagssatz-fehlt', positionId: p.id }
          : null,
  };
}

/** Bezüge auf Positionen, die nicht mitkommen, entfernt (wie D-21), samt Warnungen. */
function ohneFehlendeBezuege(
  p: Position,
  mit: ReadonlySet<string>,
): { position: Position; warnungen: Nachtragswarnung[] } {
  const warnungen: Nachtragswarnung[] = [];
  let { merkmale, zuschlag } = p;
  const grund = merkmale.wahl?.grundpositionId ?? null;
  if (merkmale.wahl !== null && grund !== null && !mit.has(grund)) {
    merkmale = { ...merkmale, wahl: { ...merkmale.wahl, grundpositionId: null } };
    warnungen.push({ code: 'bezug-entfernt', positionId: p.id, feld: 'merkmale.wahl.grundpositionId', zielId: grund });
  }
  if (zuschlag !== null && zuschlag.bezug.art === 'positionen') {
    const fehlend = zuschlag.bezug.positionen.filter((b) => !mit.has(b.positionId));
    for (const b of fehlend)
      warnungen.push({ code: 'bezug-entfernt', positionId: p.id, feld: 'zuschlag.bezug.positionen', zielId: b.positionId });
    if (fehlend.length > 0)
      zuschlag = {
        ...zuschlag,
        bezug: { art: 'positionen', positionen: zuschlag.bezug.positionen.filter((b) => mit.has(b.positionId)) },
      };
  }
  return warnungen.length === 0 ? { position: p, warnungen } : { position: { ...p, merkmale, zuschlag }, warnungen };
}

/**
 * Baut den Befehl `NachtragUebernehmen` (D-35). `angebot` ist das Nachtragsangebot (zum Nachtrags-LV), `auftragsangebot`
 * das beauftragte Angebot des Auftrags-LV (sein Bieter ist der Auftragnehmer, D-42). Rein und deterministisch (A2);
 * erwartbare Fehler sind Werte (`Befehlsfehler`), Hinweise Warnungen.
 */
export function nachtragUebernehmen(
  auftragsLv: AuftragsLvZustand,
  nachtragsLv: LvZustand,
  angebot: Angebot | AngebotZustand,
  auftragsangebot: Pick<AngebotKopf, 'id' | 'bieterId'>,
  neueIds: NachtragIdQuelle,
): Antwort {
  const a = auftragsLv.auftragsLeistungsverzeichnis;
  const l = nachtragsLv.leistungsverzeichnis;
  const an = 'angebot' in angebot ? angebot.angebot : angebot;
  const nachtrag = l.nachtrag;
  if (nachtrag === undefined)
    return nein('ungueltige-eingabe', 'Das LV hat keine Nachtragsangaben; es ist kein Nachtrags-LV.', 'nachtragsLv.nachtrag');
  if (nachtrag.auftragsLvId !== a.id)
    return nein(
      'ungueltige-eingabe',
      `Der Nachtrag gehört zum Auftrags-LV ${nachtrag.auftragsLvId}, nicht zu ${a.id}.`,
      'nachtragsLv.nachtrag.auftragsLvId',
    );
  if (l.projektId !== a.projektId)
    return nein('ungueltige-eingabe', 'Das Nachtrags-LV gehört zu einem anderen Projekt.', 'nachtragsLv.projektId');
  if (auftragsangebot.id !== a.angebotId)
    return nein(
      'ungueltige-eingabe',
      `Das Angebot ${auftragsangebot.id} ist nicht das beauftragte Angebot des Auftrags-LV (${a.angebotId}).`,
      'auftragsangebot.id',
    );
  if (an.leistungsverzeichnisId !== l.id)
    return nein('ungueltige-eingabe', 'Das Angebot gehört nicht zum Nachtrags-LV.', 'angebot.leistungsverzeichnisId');
  if (an.bieterId !== auftragsangebot.bieterId)
    return nein('ungueltige-eingabe', 'Das Angebot ist nicht vom Bieter des Auftrags (Auftragnehmer).', 'angebot.bieterId');
  if (vergleiche(l.mwstSatz, a.mwstSatz) !== 0)
    return nein(
      'ungueltige-eingabe',
      `Der MwSt-Satz des Nachtrags-LV (${l.mwstSatz}) ist nicht der des Auftrags-LV (${a.mwstSatz}).`,
      'nachtragsLv.mwstSatz',
    );

  const eintraege = uebernommeneKnoten(l);
  const vorhanden = new Set<string>([a.id, ...a.knoten.map((k) => k.id)]);
  for (const { knoten: k, stufe } of eintraege) {
    if (vorhanden.has(k.id))
      return nein('id-vergeben', `Die Kennung ${k.id} gibt es im Auftrags-LV schon (schon übernommen?).`, undefined, k.id);
    if ((k.art === 'los' || k.art === 'titel') && stufe > MAX_GLIEDERUNGSEBENEN)
      return nein(
        'ebene-ueberschritten',
        `Unter der neuen Gliederung hätte der Nachtrag mehr als ${String(MAX_GLIEDERUNGSEBENEN)} Gliederungsebenen.`,
        undefined,
        k.id,
      );
  }

  // Die neue Gliederung: Los oder Titel (F1), nächste freie OZ der obersten Stufe.
  const oberste = a.knoten.filter((k) => k.elternId === a.id);
  const alsLos = a.ozMaske.losStufe === true || oberste.some((k) => k.art === 'los');
  const art = alsLos ? 'los' : 'titel';
  const ozOben = ozVorschlag(alsLvAnsicht(auftragsLv), { art: 'ende', elternId: a.id }, art)?.ordnungszahl ?? null;
  const kopfLage = { elternId: a.id as ElternId, reihenfolge: oberste.length, ordnungszahl: ozOben, kurztext: `Nachtrag ${nachtrag.nummer}` };
  const kopf: Knoten = alsLos
    ? { art: 'los', id: neueIds.los(), ...kopfLage }
    : { art: 'titel', id: neueIds.titel(), ...kopfLage };

  const trenner = a.ozMaske.trennzeichen ?? '';
  const ozVon = (oz: Ordnungszahl | null): Ordnungszahl | null =>
    ozOben === null || oz === null ? null : (`${ozOben}${trenner}${oz}` as Ordnungszahl);

  const mit = new Set<string>(eintraege.filter((e) => e.knoten.art === 'position').map((e) => e.knoten.id));
  const nachId = new Map<string, Angebotsposition>(an.positionen.map((p) => [p.positionId, p]));
  const warnungen: Nachtragswarnung[] = [];
  if (an.nachlass !== null) warnungen.push({ code: 'nachlass-ignoriert', nachlass: an.nachlass });
  const knoten: Knoten[] = [kopf];
  for (const e of eintraege) {
    const k = e.knoten;
    const lage = { elternId: (e.elternId === l.id ? kopf.id : e.elternId) as ElternId, reihenfolge: e.reihenfolge };
    if (k.art === 'hinweis') {
      knoten.push({ ...k, ...lage });
      continue;
    }
    if (k.art === 'los' || k.art === 'titel') {
      knoten.push({ ...k, ...lage, art: 'titel', id: k.id as string as TitelId, ordnungszahl: ozVon(k.ordnungszahl) });
      continue;
    }
    const preis = mitPreisen(k, nachId.get(k.id));
    if (preis.warnung !== null) warnungen.push(preis.warnung);
    const bezug = ohneFehlendeBezuege(preis.position, mit);
    warnungen.push(...bezug.warnungen);
    knoten.push({ ...bezug.position, ...lage, ordnungszahl: ozVon(k.ordnungszahl) });
  }
  void (null as GliederungId | null);
  void (null as LosId | null);
  void ozFehler;
  return { ok: true, wert: { befehl: { art: 'NachtragUebernehmen', nachtragLvId: l.id, knoten }, warnungen } };
}
