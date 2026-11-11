// SPDX-License-Identifier: AGPL-3.0-or-later
// Tor M4 (Ticket 91, D-38): die Kette LPH 6–8 ohne Oberfläche, mit den Paketen so, wie die App sie ruft. LV `typisch`
// über den Kern → Zuschlag an Bieter B (`vergabe.zuschlagErteilen`, D-21) → Kern → Nachtrag N01
// (`abrechnung.nachtragUebernehmen`, D-35) → Kern, Status `beauftragt` → Kostengruppen am Auftrags-LV (D-85.8) und die
// Kostenberechnung als Budget (`kosten`) → Aufmaßblatt 1 (Mengen mit `mengen`, Formel 91) → Soll/Ist → AR 1 prüfen,
// freigeben (eingefroren) → Blatt 2 → AR 2 → Korrektur an Blatt 1 → AR 2 neu, AR 1 bleibt → Kostenkontrolle.
//
// Jede erwartete Zahl steht in `fixtures/typisch-abrechnung.json` (Ticket 85; Herleitung im README der Fixtures,
// „M4-Abrechnung“), nie aus einem Lauf der Pakete. Die Fixture wird gelesen, nicht importiert (A3).

import { readFileSync } from 'node:fs';
import {
  aufmassBefehlAusfuehren,
  aufmassChangeSetAnwenden,
  aufmassPruefen,
  freigabeMoeglich,
  leistungsstandBerechnen,
  nachtragUebernehmen,
  rechnungBefehlAusfuehren,
  rechnungChangeSetAnwenden,
  rechnungPruefen,
  sollIstBerechnen,
} from '@tethys/abrechnung';
import type { Abzugskette, SollIst } from '@tethys/abrechnung';
import {
  auftragsLvBefehlAusfuehren,
  auftragsLvChangeSetAnwenden,
  lvBefehlAusfuehren,
  lvChangeSetAnwenden,
} from '@tethys/kern';
import {
  kostenermittlungBefehlAusfuehren,
  kostenermittlungChangeSetAnwenden,
  kostenkontrolleBerechnen,
} from '@tethys/kosten';
import type { Kostenkontrollwerte } from '@tethys/kosten';
import { mengenansatzBerechnen } from '@tethys/mengen';
import { zuschlagErteilen } from '@tethys/vergabe';
import type {
  Angebot,
  Aufmass,
  AufmassBefehl,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvBefehl,
  AuftragsLvZustand,
  BieterId,
  Kostenermittlung,
  KostenermittlungZustand,
  Kostengruppennummer,
  LosId,
  LvZustand,
  Nachlass,
  PositionId,
  Projekt,
  ProjektId,
  Prozent,
  Rechnung,
  RechnungBefehl,
  Summenstand,
  TitelId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import {
  MASKE,
  abrechnungsFixture,
  angebot,
  ep,
  erwarteOk,
  fxAufmass,
  fxAufmassposition,
  fxKnoten,
  fxRechnung,
  lvZustand,
  nichtAngeboten,
  satz,
} from '../../../packages/abrechnung/src/testhilfen';
import type { FxKnoten, FxPruefung, FxSollIst } from '../../../packages/abrechnung/src/testhilfen';

// --- Fixtures ------------------------------------------------------------------------------------------------------

const lies = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../fixtures/${name}.json`, import.meta.url), 'utf8'));

interface FxSummen {
  readonly netto: string;
  readonly nachlass: string;
  readonly nettoNachNachlass: string;
  readonly mwst: string;
  readonly brutto: string;
}

/** Sollwerte eines Summenstands in der Form der Fixtures (`typisch.json`, Ticket 85). */
interface FxSollwerte {
  readonly positionen: Readonly<Record<string, { readonly gp: string | null; readonly inSumme: boolean }>>;
  readonly titel: Readonly<Record<string, { readonly summe: string }>>;
  readonly summen: FxSummen;
}

interface FxKostenzeile {
  readonly budget: string;
  readonly vergabe: string;
  readonly abrechnung: string;
  readonly abweichung: string;
}

/** Was dieser Test aus `typisch-abrechnung.json` über `abrechnungsFixture()` hinaus liest. */
interface FxM4 {
  readonly zuschlag: {
    readonly bieterName: string;
    readonly gewaehlt: readonly string[];
    readonly ohnePreis: readonly string[];
    readonly sollwerte: FxSollwerte;
  };
  readonly nachtrag: { readonly statusNachUebernahme: string; readonly sollwerte: FxSollwerte };
  readonly positionen: readonly { readonly positionId: string; readonly kostengruppe: string | null }[];
  readonly aufmasse: readonly { readonly zeilenergebnisse: Readonly<Record<string, readonly string[]>> }[];
  readonly korrektur: { readonly zeilenergebnisse: readonly string[] };
  readonly kostenermittlung: Kostenermittlung;
  readonly kostenkontrolle: {
    readonly rechnungId: string;
    readonly kostenermittlungId: string;
    readonly zeilen: readonly (FxKostenzeile & { readonly kostengruppe: string })[];
    readonly ohneKostengruppe: FxKostenzeile;
    readonly nachlass: FxKostenzeile;
    readonly gesamt: FxKostenzeile;
  };
}

interface FxLv {
  readonly id: string;
  readonly name: string;
  readonly mwstSatz: string;
  readonly nachlass: Nachlass | null;
  readonly knoten: readonly FxKnoten[];
}

interface FxAngebote {
  readonly bieter: readonly { readonly id: string; readonly name: string }[];
  readonly angebote: readonly {
    readonly id: string;
    readonly bieterId: string;
    readonly nachlass: Nachlass | null;
    readonly positionen: readonly {
      readonly positionId: string;
      readonly status: 'angeboten' | 'nicht-angeboten';
      readonly einheitspreis?: string;
      readonly zuschlagssatz?: string;
    }[];
  }[];
}

const fx = abrechnungsFixture();
const m4 = lies('typisch-abrechnung') as FxM4;
const typisch = lies('typisch') as FxLv;
const angebote = lies('typisch-angebote') as FxAngebote;

// --- Abbildungen in die Form der Fixture ---------------------------------------------------------------------------

/** Ein Summenstand des Kerns in der Form der Sollwerte (Positionen, Titel, Gesamtsummen ohne Ausweise). */
function wieSollwerte(s: Summenstand): Omit<FxSollwerte, 'summen'> & { readonly summen: FxSummen } {
  return {
    positionen: Object.fromEntries(
      s.positionen.map((p) => [p.positionId, { gp: p.gesamtpreis, inSumme: p.gehtInSummeEin }]),
    ),
    titel: Object.fromEntries(s.gliederungen.map((g) => [g.gliederungId, { summe: g.summe }])),
    summen: {
      netto: s.gesamt.netto,
      nachlass: s.gesamt.nachlass,
      nettoNachNachlass: s.gesamt.nettoNachNachlass,
      mwst: s.gesamt.mwst,
      brutto: s.gesamt.brutto,
    },
  };
}

const ohneAusweise = (s: FxSollwerte): Omit<FxSollwerte, 'summen'> & { readonly summen: FxSummen } => ({
  positionen: s.positionen,
  titel: s.titel,
  summen: {
    netto: s.summen.netto,
    nachlass: s.summen.nachlass,
    nettoNachNachlass: s.summen.nettoNachNachlass,
    mwst: s.summen.mwst,
    brutto: s.summen.brutto,
  },
});

/** Die Abzugskette in den Feldnamen der Fixture (Ticket 85). */
function wieKette(k: Abzugskette): FxPruefung['kette'] {
  return {
    leistung: k.leistung,
    nachlass: k.nachlass,
    nettoNachNachlass: k.nettoNachNachlass,
    mwst: k.mwst,
    bruttoKumuliert: k.bruttoKumuliert,
    umlagen: k.umlagen.map((u) => ({ bezeichnung: u.bezeichnung, satz: u.satz, betrag: u.betrag })),
    einbehalt: k.einbehalt.betrag,
    fruehereZahlbetraege: k.fruehereZahlbetraege,
    zahlbetrag: k.zahlbetrag,
  };
}

/** Soll/Ist in der Form der Fixture: nur Zeilen mit Aufmaß (D-85.5, D-81.7), Befundcode als `art`. */
function wieSollIst(s: SollIst, mitAufmass: ReadonlySet<string>): Pick<FxSollIst, 'zeilen' | 'befunde'> {
  return {
    zeilen: s.zeilen
      .filter((z) => mitAufmass.has(z.positionId))
      .map((z) => ({
        positionId: z.positionId,
        soll: z.soll ?? '',
        ist: z.ist ?? '',
        anteil: z.anteil ?? '',
      })),
    befunde: s.befunde.map((b) => ({ positionId: b.positionId, art: b.code, anteil: b.anteil })),
  };
}

/** Eine Zeile der Kostenkontrolle wie die Fixture: leeres Budget 0,00 (D-85.3 gegen D-82.5, dieselben Zahlen). */
const wieKostenzeile = (z: Kostenkontrollwerte): FxKostenzeile => ({
  budget: z.budget ?? '0.00',
  vergabe: z.vergabe,
  abrechnung: z.abrechnung,
  abweichung: z.abweichung ?? '',
});

// --- Befehle wie auf dem Befehlsweg der App ------------------------------------------------------------------------

function auftragsLvAusfuehren(z: AuftragsLvZustand | null, b: AuftragsLvBefehl): AuftragsLvZustand {
  const danach = auftragsLvChangeSetAnwenden(z, erwarteOk(auftragsLvBefehlAusfuehren(z, b)));
  if (danach === null) throw new Error(`${b.art} entfernt das Auftrags-LV`);
  return danach;
}

function aufmassAusfuehren(z: Aufmass | null, b: AufmassBefehl): Aufmass {
  const zustand = z === null ? null : { aufmass: z };
  const danach = aufmassChangeSetAnwenden(zustand, erwarteOk(aufmassBefehlAusfuehren(zustand, b)));
  if (danach === null) throw new Error(`${b.art} entfernt das Aufmaßblatt`);
  return danach.aufmass;
}

function rechnungAusfuehren(z: Rechnung | null, b: RechnungBefehl): Rechnung {
  const zustand = z === null ? null : { rechnung: z };
  const danach = rechnungChangeSetAnwenden(zustand, erwarteOk(rechnungBefehlAusfuehren(zustand, b)));
  if (danach === null) throw new Error(`${b.art} entfernt die Rechnung`);
  return danach.rechnung;
}

/**
 * Eine Aufmaßzeile, wie die App sie setzt: Die Menge rechnet `mengen` aus den Ansatzzeilen (Formel 91, D-22); ohne
 * Ansatz gilt die eingegebene Menge der Fixture. Liefert auch die Zeilenergebnisse zum Vergleich mit der Fixture.
 */
function aufmasszeile(p: Parameters<typeof fxAufmassposition>[0]): {
  readonly zeile: Aufmass['positionen'][number];
  readonly zeilenergebnisse: readonly (string | null)[] | null;
} {
  const roh = fxAufmassposition(p);
  if (roh.mengenansatz === null) return { zeile: roh, zeilenergebnisse: null };
  const r = mengenansatzBerechnen(roh.mengenansatz);
  return { zeile: { ...roh, menge: r.summe }, zeilenergebnisse: r.zeilen.map((z) => z.menge) };
}

/** Legt ein Blatt der Fixture an wie die App: leerer Kopf, dann je Zeile `AufmasspositionSetzen` (Menge aus `mengen`). */
function blattErfassen(
  vorlage: Aufmass,
  zeilen: Parameters<typeof fxAufmassposition>[0][],
): {
  readonly blatt: Aufmass;
  readonly zeilenergebnisse: Readonly<Record<string, readonly (string | null)[]>>;
} {
  let blatt = aufmassAusfuehren(null, { art: 'AufmassAnlegen', aufmass: { ...vorlage, positionen: [] } });
  const zeilenergebnisse: Record<string, readonly (string | null)[]> = {};
  for (const p of zeilen) {
    const { zeile, zeilenergebnisse: ergebnisse } = aufmasszeile(p);
    if (ergebnisse !== null) zeilenergebnisse[p.positionId] = ergebnisse;
    blatt = aufmassAusfuehren(blatt, { art: 'AufmasspositionSetzen', position: zeile });
  }
  return { blatt, zeilenergebnisse };
}

// --- Die Kette ---------------------------------------------------------------------------------------------------

const PROJEKT_ID = fx.projektId as ProjektId;
const AUFTRAGS_LV_ID = fx.zuschlag.auftragsLvId as AuftragsLeistungsverzeichnisId;

// 1. Projekt mit den Bietern der Angebote, LV `typisch` über den Kern, Angebot von Bieter B (D-85.1).
const projekt: Projekt = {
  id: PROJEKT_ID,
  name: 'Musterhaus',
  bauherr: { name: 'Bauherr', anschrift: null },
  bieter: angebote.bieter.map((b) => ({ id: b.id as BieterId, name: b.name })),
};
const lv: LvZustand = lvZustand(
  typisch.id,
  {
    name: typisch.name,
    ozMaske: MASKE,
    mwstSatz: typisch.mwstSatz as Prozent,
    nachlass: typisch.nachlass,
    knoten: fxKnoten(typisch.knoten),
  },
  PROJEKT_ID,
);
const fxB = angebote.angebote.find((a) => a.id === fx.zuschlag.angebotId);
if (fxB === undefined) throw new Error('Angebot des Zuschlags fehlt in typisch-angebote');
const angebotB: Angebot = angebot(
  fxB.id,
  lv,
  fxB.bieterId,
  fxB.positionen.map((p) =>
    p.status !== 'angeboten'
      ? nichtAngeboten(p.positionId)
      : p.zuschlagssatz !== undefined
        ? satz(p.positionId, p.zuschlagssatz)
        : ep(p.positionId, p.einheitspreis ?? ''),
  ),
  fxB.nachlass,
);

// 2. Zuschlag (D-21) → Kern.
const zuschlag = erwarteOk(
  zuschlagErteilen(lv, angebotB, projekt, new Set(m4.zuschlag.gewaehlt as PositionId[]), AUFTRAGS_LV_ID),
);
const nachZuschlag = auftragsLvAusfuehren(null, zuschlag.befehl);

// 3. Nachtrag N01: Nachtrags-LV und Angebot des Auftragnehmers → `nachtragUebernehmen` → Kern; dann Status `beauftragt`
//    am Nachtrags-LV (D-35: erst übernehmen, dann beauftragen).
const NEUE_GLIEDERUNG = fx.nachtrag.uebernahme.knoten[0]?.id ?? '';
const nachtragsLv = lvZustand(
  fx.nachtrag.lv.id,
  {
    name: fx.nachtrag.lv.name,
    ozMaske: MASKE,
    mwstSatz: fx.nachtrag.lv.mwstSatz as Prozent,
    nachlass: fx.nachtrag.lv.nachlass,
    knoten: fxKnoten(fx.nachtrag.lv.knoten),
  },
  PROJEKT_ID,
  fx.nachtrag.lv.nachtrag,
);
const nachtragsangebot = angebot(
  fx.nachtrag.angebot.id,
  nachtragsLv,
  fx.nachtrag.angebot.bieterId,
  fx.nachtrag.angebot.positionen.map((p) => ep(p.positionId, p.einheitspreis ?? '')),
  fx.nachtrag.angebot.nachlass,
);
const uebernahme = erwarteOk(
  nachtragUebernehmen(
    nachZuschlag,
    nachtragsLv,
    nachtragsangebot,
    { id: nachZuschlag.auftragsLeistungsverzeichnis.angebotId, bieterId: angebotB.bieterId },
    { los: () => NEUE_GLIEDERUNG as LosId, titel: () => NEUE_GLIEDERUNG as TitelId },
  ),
);
const nachNachtrag = auftragsLvAusfuehren(nachZuschlag, uebernahme.befehl);
const beauftragt = (() => {
  const angaben = nachtragsLv.leistungsverzeichnis.nachtrag;
  if (angaben === undefined) throw new Error('Nachtrags-LV ohne Nachtragsangaben');
  const cs = erwarteOk(
    lvBefehlAusfuehren(nachtragsLv, {
      art: 'NachtragsangabenSetzen',
      nachtrag: { ...angaben, status: 'beauftragt' },
    }),
  );
  return lvChangeSetAnwenden(nachtragsLv, cs);
})();

// 4. Kostengruppen am Auftrags-LV (D-85.8) und die Kostenberechnung als Budget.
const auftrag = m4.positionen.reduce<AuftragsLvZustand>(
  (z, p) =>
    p.kostengruppe === null
      ? z
      : auftragsLvAusfuehren(z, {
          art: 'KostengruppeSetzen',
          positionId: p.positionId as PositionId,
          kostengruppe: p.kostengruppe as Kostengruppennummer,
        }),
  nachNachtrag,
);
const budget: KostenermittlungZustand | null = kostenermittlungChangeSetAnwenden(
  null,
  erwarteOk(
    kostenermittlungBefehlAusfuehren(null, {
      art: 'KostenermittlungAnlegen',
      kostenermittlung: m4.kostenermittlung,
    }),
  ),
);

// 5. Aufmaßblatt 1 (Formel 91) → Soll/Ist → AR 1 prüfen und freigeben.
const [fxBlatt1, fxBlatt2] = fx.aufmasse.map((a) => a.aufmass);
const [fxAr1, fxAr2] = fx.rechnungen.map(fxRechnung);
if (fxBlatt1 === undefined || fxBlatt2 === undefined || fxAr1 === undefined || fxAr2 === undefined)
  throw new Error('M4-Fixture ohne zwei Blätter oder zwei Rechnungen');
const blatt1 = blattErfassen(fxAufmass(fxBlatt1), fxBlatt1.positionen);
const sollIstNachBlatt1 = sollIstBerechnen(auftrag, [blatt1.blatt]);

const ar1Offen = rechnungAusfuehren(null, { art: 'RechnungAnlegen', rechnung: { ...fxAr1, freigabe: null } });
const ar1Pruefung = rechnungPruefen(ar1Offen, auftrag, [blatt1.blatt], [ar1Offen]);
const ar1Freigabe = freigabeMoeglich(ar1Offen, [ar1Offen]);
const ar1 = rechnungAusfuehren(ar1Offen, {
  art: 'RechnungFreigeben',
  zahlbetrag: ar1Pruefung.kette.zahlbetrag,
});

// 6. Aufmaßblatt 2 → Soll/Ist → AR 2 (kumuliert, minus eingefrorener Zahlbetrag von AR 1).
const blatt2 = blattErfassen(fxAufmass(fxBlatt2), fxBlatt2.positionen);
const blaetter = [blatt1.blatt, blatt2.blatt];
const sollIstNachBlatt2 = sollIstBerechnen(auftrag, blaetter);
const ar2 = rechnungAusfuehren(null, { art: 'RechnungAnlegen', rechnung: fxAr2 });
const ar2Freigabe = freigabeMoeglich(ar2, [ar1, ar2]);
const ar2VorKorrektur = rechnungPruefen(ar2, auftrag, blaetter, [ar1, ar2]);

// 7. Korrektur an Blatt 1 nach der Freigabe von AR 1: ändert AR 2, nicht den eingefrorenen Betrag von AR 1.
const korrektur = aufmasszeile(fx.korrektur.befehl.position);
const blatt1Korrigiert = aufmassAusfuehren(blatt1.blatt, {
  art: 'AufmasspositionSetzen',
  position: korrektur.zeile,
});
const korrigiert = [blatt1Korrigiert, blatt2.blatt];
const sollIstNachKorrektur = sollIstBerechnen(auftrag, korrigiert);
const ar2NachKorrektur = rechnungPruefen(ar2, auftrag, korrigiert, [ar1, ar2]);
const ar1NachKorrektur = rechnungPruefen(ar1, auftrag, korrigiert, [ar1, ar2]);

// 8. Kostenkontrolle: Budget, Auftrags-LV, Leistungsstand der Rechnung mit der höchsten Nummer (AR 2, D-37), wie die
//    App ihn rechnet (`leistungsstandBerechnen` über die Blätter der Rechnung).
const letzte = [ar1, ar2].reduce((a, b) => (b.nummer > a.nummer ? b : a));
const leistungsstand = leistungsstandBerechnen(
  auftrag,
  korrigiert.filter((b) => letzte.aufmassIds.includes(b.id)),
  letzte.art,
);
const kontrolle = kostenkontrolleBerechnen({
  budget: budget?.kostenermittlung ?? null,
  auftraege: [auftrag],
  leistungsstaende: [{ auftragsLvId: AUFTRAGS_LV_ID, leistungsstand: leistungsstand.leistungsstand }],
});

// --- Prüfungen ---------------------------------------------------------------------------------------------------

describe('Tor M4: Kette LPH 6–8 ohne Oberfläche (Sollwerte aus typisch-abrechnung)', () => {
  it('Zuschlag an Bieter B ohne Wahl: Alternative entfällt, 03.0070 ohne Preis, Summen wie die Fixture (D-21)', () => {
    expect(projekt.bieter.find((b) => b.id === angebotB.bieterId)?.name).toBe(m4.zuschlag.bieterName);
    expect(zuschlag.warnungen).toEqual([
      {
        code: 'positionen-entfallen',
        anzahl: fx.zuschlag.entfallen.length,
        positionIds: fx.zuschlag.entfallen,
      },
      ...m4.zuschlag.ohnePreis.map((positionId) => ({ code: 'nicht-angeboten', positionId })),
    ]);
    const a = nachZuschlag.auftragsLeistungsverzeichnis;
    expect(a.id).toBe(fx.zuschlag.auftragsLvId);
    expect(a.angebotId).toBe(fx.zuschlag.angebotId);
    expect(a.nachlass).toEqual({ art: 'prozent', wert: '3.00' });
    expect(a.auftragnehmer?.name).toBe(m4.zuschlag.bieterName);
    expect(wieSollwerte(nachZuschlag.summen)).toEqual(ohneAusweise(m4.zuschlag.sollwerte));
  });

  it('Nachtrag N01: Knoten unter „Nachtrag N01“ (OZ 04), Summen danach wie die Fixture, Status beauftragt (D-35)', () => {
    expect(uebernahme.warnungen).toEqual([]);
    expect(uebernahme.befehl).toEqual({
      art: 'NachtragUebernehmen',
      nachtragLvId: fx.nachtrag.uebernahme.nachtragLvId,
      knoten: fxKnoten(
        fx.nachtrag.uebernahme.knoten,
        new Map([[NEUE_GLIEDERUNG, Number(fx.nachtrag.uebernahme.gliederungReihenfolge)]]),
      ),
    });
    expect(wieSollwerte(nachNachtrag.summen)).toEqual(ohneAusweise(m4.nachtrag.sollwerte));
    expect(beauftragt?.leistungsverzeichnis.nachtrag?.status).toBe(m4.nachtrag.statusNachUebernahme);
  });

  it('Kostengruppen ändern keine Summe; die Kostenberechnung ist das Budget der Fixture', () => {
    expect(auftrag.summen).toEqual(nachNachtrag.summen);
    const kg = new Map(
      auftrag.auftragsLeistungsverzeichnis.knoten.map((k) => [
        k.id,
        k.art === 'position' ? k.kostengruppe : undefined,
      ]),
    );
    for (const p of m4.positionen) expect(kg.get(p.positionId as PositionId) ?? null).toBe(p.kostengruppe);
    expect(budget?.kostenermittlung).toEqual(m4.kostenermittlung);
    expect(budget?.kostenermittlung.id).toBe(m4.kostenkontrolle.kostenermittlungId);
  });

  it('Aufmaßblatt 1: Formel 91 rechnet die Zeilenergebnisse der Fixture; das Blatt ist das der Fixture, ohne Befund', () => {
    expect(blatt1.zeilenergebnisse).toEqual(m4.aufmasse[0]?.zeilenergebnisse);
    expect(blatt1.blatt).toEqual(fxAufmass(fxBlatt1));
    expect(aufmassPruefen(blatt1.blatt, auftrag)).toEqual([]);
  });

  it('Soll/Ist nach Blatt 1: genau ein Befund über 110 % (02.0040), keiner unter 90 % (VOB/B § 2 Abs. 3)', () => {
    const soll = fx.sollIst.nachBlatt1;
    expect(wieSollIst(sollIstNachBlatt1, new Set(fxBlatt1.positionen.map((p) => p.positionId)))).toEqual({
      zeilen: soll.zeilen,
      befunde: soll.befunde,
    });
  });

  it('AR 1: Kette und Leistungsstand wie die Fixture, freigabefähig; die Freigabe friert 8.874,40 ein', () => {
    expect(wieKette(ar1Pruefung.kette)).toEqual(fx.pruefungen.ar1.kette);
    expect(ar1Pruefung.leistungsstand).toEqual(fx.pruefungen.ar1.leistungsstand);
    expect(ar1Pruefung.befunde).toEqual([]);
    expect(ar1Freigabe).toEqual({ moeglich: true, hindernisse: [] });
    expect(ar1).toEqual(fxAr1);
    expect(ar1.freigabe?.zahlbetrag).toBe(fx.pruefungen.ar1.kette.zahlbetrag);
  });

  it('Aufmaßblatt 2: Zeilenergebnisse und Blatt wie die Fixture; Soll/Ist mit demselben einen Befund', () => {
    expect(blatt2.zeilenergebnisse).toEqual(m4.aufmasse[1]?.zeilenergebnisse);
    expect(blatt2.blatt).toEqual(fxAufmass(fxBlatt2));
    expect(aufmassPruefen(blatt2.blatt, auftrag)).toEqual([]);
    const soll = fx.sollIst.nachBlatt2;
    expect(wieSollIst(sollIstNachBlatt2, new Set(soll.zeilen.map((z) => z.positionId)))).toEqual({
      zeilen: soll.zeilen,
      befunde: soll.befunde,
    });
  });

  it('AR 2 vor der Korrektur: kumuliert minus eingefrorener Zahlbetrag von AR 1 = 10.100,84', () => {
    expect(ar2Freigabe.moeglich).toBe(true);
    expect(wieKette(ar2VorKorrektur.kette)).toEqual(fx.pruefungen.ar2VorKorrektur.kette);
    expect(ar2VorKorrektur.leistungsstand).toEqual(fx.pruefungen.ar2VorKorrektur.leistungsstand);
    expect(ar2VorKorrektur.befunde).toEqual([]);
  });

  it('Korrektur an Blatt 1 ändert AR 2 (10.070,67), nicht den eingefrorenen Betrag von AR 1 (D-38)', () => {
    expect(korrektur.zeilenergebnisse).toEqual(m4.korrektur.zeilenergebnisse);
    expect(blatt1Korrigiert).toEqual(fxAufmass(fx.korrektur.aufmassNachher));
    expect(wieKette(ar2NachKorrektur.kette)).toEqual(fx.pruefungen.ar2NachKorrektur.kette);
    expect(ar2NachKorrektur.leistungsstand).toEqual(fx.pruefungen.ar2NachKorrektur.leistungsstand);
    // AR 1 bleibt eingefroren; neu geprüft ergäbe sie die Gegenprobe der Fixture, die Prüfung meldet die Abweichung.
    expect(ar1.freigabe?.zahlbetrag).toBe(fx.pruefungen.ar1.kette.zahlbetrag);
    expect(ar2NachKorrektur.kette.fruehereZahlbetraege).toBe(fx.pruefungen.ar1.kette.zahlbetrag);
    expect(ar1NachKorrektur.kette.zahlbetrag).toBe(fx.gegenprobeOhneEinfrieren.ar1Zahlbetrag);
    expect(ar1NachKorrektur.befunde.map((b) => b.code)).toEqual(['freigabe-abweichend']);
    // Gegenprobe ohne Einfrieren: AR 2 hinge am neu geprüften AR 1 und die Korrektur verschwände.
    const ungefroren = { ...ar1, freigabe: { zahlbetrag: ar1NachKorrektur.kette.zahlbetrag } };
    expect(rechnungPruefen(ar2, auftrag, korrigiert, [ungefroren, ar2]).kette.zahlbetrag).toBe(
      fx.gegenprobeOhneEinfrieren.ar2Zahlbetrag,
    );
  });

  it('Soll/Ist nach der Korrektur: Zeilen und der eine Befund wie die Fixture', () => {
    const soll = fx.sollIst.nachKorrektur;
    expect(wieSollIst(sollIstNachKorrektur, new Set(soll.zeilen.map((z) => z.positionId)))).toEqual({
      zeilen: soll.zeilen,
      befunde: soll.befunde,
    });
  });

  it('Kostenkontrolle (Stand AR 2 nach der Korrektur): je KG, ohne KG, Nachlass und Gesamt wie die Fixture (D-37)', () => {
    expect(letzte.id).toBe(m4.kostenkontrolle.rechnungId);
    expect(leistungsstand.leistungsstand).toEqual(fx.pruefungen.ar2NachKorrektur.leistungsstand);
    expect(kontrolle.kostengruppen.map((z) => ({ kostengruppe: z.nummer, ...wieKostenzeile(z) }))).toEqual(
      m4.kostenkontrolle.zeilen,
    );
    // D-82.5: „ohne Kostengruppe“ und „Nachlass“ haben kein Budget (`null`); die Fixture schreibt 0,00 (D-85.3).
    expect(kontrolle.ohneKostengruppe.budget).toBeNull();
    expect(kontrolle.nachlass.budget).toBeNull();
    expect(wieKostenzeile(kontrolle.ohneKostengruppe)).toEqual(m4.kostenkontrolle.ohneKostengruppe);
    expect(wieKostenzeile(kontrolle.nachlass)).toEqual(m4.kostenkontrolle.nachlass);
    expect(wieKostenzeile(kontrolle.gesamt)).toEqual(m4.kostenkontrolle.gesamt);
    expect(kontrolle.befunde).toEqual([]);
  });
});
