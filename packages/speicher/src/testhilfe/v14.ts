// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests: Aufmaßblätter, Rechnungen und Kostenermittlungen (Vertrag v1.4) zum Fixture `typisch` samt Auftrags-LV,
// selbst verfasst (C4). Die Werte sind Speicherbeispiele: `speicher` rechnet nichts davon nach (A3).

import type {
  AufmassChangeSet,
  AufmassId,
  Aufmass,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvZustand,
  Betrag,
  ChangeSet,
  Kostenermittlung,
  KostenermittlungChangeSet,
  KostenermittlungId,
  Kostengruppennummer,
  Menge,
  Position,
  PositionId,
  Protokolleintrag,
  Prozent,
  Rechnung,
  RechnungChangeSet,
  RechnungId,
} from '@tethys/vertrag';
import type { SpeicherKern } from '../kern';
import {
  anlegenSchritte,
  auftragsLvAnlegenChangeSet,
  auftragsLvAus,
  eintrag,
  ladeFixture,
  type FixtureDaten,
} from './fixtures';
import { neuerKern, speichere } from './node';

export const F: FixtureDaten = ladeFixture('typisch');
export const P = F.projekt.id;
const angebot = F.angebote[0]?.angebot.id;
if (angebot === undefined) throw new Error('typisch hat Angebote');

export const AUFTRAG_ZUSTAND: AuftragsLvZustand = auftragsLvAus(F.lv, angebot);
export const AUFTRAG: AuftragsLeistungsverzeichnisId = AUFTRAG_ZUSTAND.auftragsLeistungsverzeichnis.id;

/** Die Positionen des Auftrags-LV (Kennungen wie im LV, Positionsidentität). */
export const POSITIONEN: readonly PositionId[] = AUFTRAG_ZUSTAND.auftragsLeistungsverzeichnis.knoten
  .filter((k): k is Position => k.art === 'position')
  .map((k) => k.id);
const pos = (i: number): PositionId => POSITIONEN[i] ?? (POSITIONEN[0] as PositionId);

/** Aufmaßblatt `nummer` mit einer Zeile mit Ansatz und einer von Hand. */
export function aufmass(nummer: number, mehr: Partial<Aufmass> = {}): Aufmass {
  return {
    id: `aufmass-${String(nummer)}` as AufmassId,
    projektId: P,
    auftragsLvId: AUFTRAG,
    nummer,
    bezeichnung: `Blatt ${String(nummer)} (erfunden)`,
    datum: '2026-11-02',
    positionen: [
      {
        positionId: pos(0),
        mengenansatz: [{ zeile: 1, formel: 91, ausdruck: '0,5*2', variable: null }],
        menge: '1.000' as Menge,
      },
      { positionId: pos(1), mengenansatz: null, menge: '2.500' as Menge },
    ],
    ...mehr,
  };
}

/** Abschlagsrechnung `nummer` über die Blätter `blaetter`, nicht freigegeben. */
export function rechnung(nummer: number, blaetter: readonly number[], mehr: Partial<Rechnung> = {}): Rechnung {
  return {
    id: `rechnung-${String(nummer)}` as RechnungId,
    projektId: P,
    auftragsLvId: AUFTRAG,
    nummer,
    art: 'abschlag',
    eingang: '2026-11-05',
    rechnungsnummerAuftragnehmer: `AR-${String(nummer)}`,
    gefordert: { netto: '47.50' as Betrag, brutto: null, zahlbetrag: null },
    aufmassIds: blaetter.map((b) => `aufmass-${String(b)}` as AufmassId),
    umlagen: [{ bezeichnung: 'Bauwesenversicherung', satz: '0.50' as Prozent }],
    sicherheitSatz: '5.00' as Prozent,
    gewaehrleistungSatz: null,
    freigabe: null,
    ...mehr,
  };
}

export const frei = (r: Rechnung, zahlbetrag = '53.42'): Rechnung => ({
  ...r,
  freigabe: { zahlbetrag: zahlbetrag as Betrag },
});

/** Kostenermittlung mit drei Einträgen nach Nummer. */
export function kostenermittlung(n: number, mehr: Partial<Kostenermittlung> = {}): Kostenermittlung {
  const kg = (x: string): Kostengruppennummer => x as Kostengruppennummer;
  return {
    id: `ke-${String(n)}` as KostenermittlungId,
    projektId: P,
    stufe: 'kostenberechnung',
    name: `Kostenberechnung ${String(n)} (erfunden)`,
    eintraege: [
      { nummer: kg('330'), betrag: '15.00' as Betrag, bemerkung: 'Außenwände (erfunden)' },
      { nummer: kg('340'), betrag: '10.00' as Betrag },
      { nummer: kg('410'), betrag: '-2.50' as Betrag },
    ],
    ...mehr,
  };
}

// --- ChangeSets ganzer Aggregate (D-36 (8)) ---------------------------------------------------------------------

export const aufmassCs = (vorher: Aufmass | null, nachher: Aufmass | null): AufmassChangeSet => ({
  art: 'aufmass',
  aufmassId: (nachher ?? vorher)?.id ?? ('aufmass-?' as AufmassId),
  aufmass: { vorher, nachher },
});

export const rechnungCs = (vorher: Rechnung | null, nachher: Rechnung | null): RechnungChangeSet => ({
  art: 'rechnung',
  rechnungId: (nachher ?? vorher)?.id ?? ('rechnung-?' as RechnungId),
  rechnung: { vorher, nachher },
});

export const kostenermittlungCs = (
  vorher: Kostenermittlung | null,
  nachher: Kostenermittlung | null,
): KostenermittlungChangeSet => ({
  art: 'kostenermittlung',
  kostenermittlungId: (nachher ?? vorher)?.id ?? ('ke-?' as KostenermittlungId),
  kostenermittlung: { vorher, nachher },
});

/** Das Aggregat, auf das ein ChangeSet wirkt (für den Protokolleintrag). */
export function aggregatVon(cs: ChangeSet): Protokolleintrag['aggregat'] {
  switch (cs.art) {
    case 'projekt':
      return { art: cs.art, id: cs.projektId };
    case 'leistungsverzeichnis':
      return { art: cs.art, id: cs.leistungsverzeichnisId };
    case 'angebot':
      return { art: cs.art, id: cs.angebotId };
    case 'auftrags-leistungsverzeichnis':
      return { art: cs.art, id: cs.auftragsLeistungsverzeichnisId };
    case 'aufmass':
      return { art: cs.art, id: cs.aufmassId };
    case 'rechnung':
      return { art: cs.art, id: cs.rechnungId };
    case 'kostenermittlung':
      return { art: cs.art, id: cs.kostenermittlungId };
  }
}

let nr = 500;

/** Wendet ein ChangeSet mit einem passenden Protokolleintrag an (Befehl wie angegeben, sonst ein kurzer Platzhalter). */
export function anwenden(kern: SpeicherKern, cs: ChangeSet, befehl?: Protokolleintrag['befehl']) {
  nr += 1;
  return kern.anwenden(
    eintrag(nr, P, aggregatVon(cs), befehl ?? { art: 'AufmassLoeschen' }),
    cs,
  );
}

/** Projekt, LV, drei Angebote und das Auftrags-LV des Fixtures `typisch`. */
export async function mitAuftrag(): Promise<SpeicherKern> {
  const { kern } = await neuerKern();
  await speichere(kern, anlegenSchritte(F));
  const r = await kern.anwenden(
    eintrag(90, P, { art: 'auftrags-leistungsverzeichnis', id: AUFTRAG }, {
      art: 'AuftragsLeistungsverzeichnisAnlegen',
      auftragsLeistungsverzeichnis: AUFTRAG_ZUSTAND.auftragsLeistungsverzeichnis,
    }),
    auftragsLvAnlegenChangeSet(AUFTRAG_ZUSTAND),
  );
  if (!r.ok) throw new Error(r.fehler.meldung);
  return kern;
}
