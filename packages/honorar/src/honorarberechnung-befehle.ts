// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle an der Honorarberechnung ausführen (Ticket 110; vertrag v1.6 Punkt 5, D-56, D-97.12): Ausführen, Anwenden,
// Umkehren. Der Ausführer sieht nur die Honorarberechnung (Signatur `HonorarberechnungBefehlAusfuehren`) und prüft die Form
// (`ungueltige-eingabe` mit `feld`): Werte der Listen, kanonische Dezimalwerte, Leistungsphasen 1 bis 9 aufsteigend und je
// höchstens einmal, Name und Bezeichnung nicht leer. Was die HOAI anders vorsieht (Honorarsatz außerhalb 0 bis 100, eine
// Zone oder Leistungsphase, die das Leistungsbild nicht hat, ein Umbauzuschlag über der Grenze, negative Beträge), nimmt er
// an: Das ist ein Befund von `honorarBerechnen` (U5, D-64). Den Verweis auf eine Kostenermittlung hält `speicher`
// (`konflikt`, Q5). ChangeSet jedes Befehls: die ganze Honorarberechnung vorher und nachher, in kanonischer Form (genau die
// Felder des Vertrags in seiner Reihenfolge). Rein (A2).

import { alsBetrag, alsProzent } from '@tethys/dezimal';
import type {
  AnrechenbareKostenangabe,
  BeauftragteLeistungsphase,
  Befehlsfehler,
  Befehlsfehlercode,
  Betrag,
  Ergebnis,
  Honorarberechnung,
  HonorarberechnungBefehlAusfuehren,
  HonorarberechnungChangeSet,
  HonorarberechnungChangeSetAnwenden,
  HonorarberechnungChangeSetUmkehren,
  Honorarobjekt,
  Honorarzone,
  Leistungsbild,
  Leistungsphasennummer,
  Nebenkostenangabe,
  Prozent,
} from '@tethys/vertrag';

type Antwort = Ergebnis<HonorarberechnungChangeSet, Befehlsfehler>;
type Geprueft<T> = Ergebnis<T, Befehlsfehler>;

const LEISTUNGSBILDER: ReadonlySet<Leistungsbild> = new Set<Leistungsbild>([
  'gebaeude',
  'innenraeume',
  'freianlagen',
  'ingenieurbauwerke',
  'verkehrsanlagen',
  'tragwerksplanung',
  'technische-ausruestung',
]);
const HONORARZONEN: ReadonlySet<Honorarzone> = new Set<Honorarzone>(['I', 'II', 'III', 'IV', 'V']);

function nein(code: Befehlsfehlercode, meldung: string, feld?: string): { ok: false; fehler: Befehlsfehler } {
  return { ok: false, fehler: feld === undefined ? { code, meldung } : { code, meldung, feld } };
}
const ungueltig = (meldung: string, feld: string): { ok: false; fehler: Befehlsfehler } =>
  nein('ungueltige-eingabe', meldung, feld);
const gut = <T>(wert: T): Geprueft<T> => ({ ok: true, wert });

const istObjekt = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

/** Ein Text, der nach Abzug von Leerraum nicht leer ist (Name, Bezeichnung). */
const istNichtLeer = (x: unknown): x is string => typeof x === 'string' && x.trim() !== '';

function betragPruefen(wert: unknown, feld: string): Geprueft<Betrag> {
  const e = typeof wert === 'string' ? alsBetrag(wert) : null;
  if (e?.ok === true) return gut(e.wert);
  return ungueltig(e?.ok === false ? e.fehler.meldung : 'Ein Betrag ist ein Text mit 2 Stellen.', feld);
}

function satzPruefen(wert: unknown, feld: string): Geprueft<Prozent> {
  const e = typeof wert === 'string' ? alsProzent(wert) : null;
  if (e?.ok === true) return gut(e.wert);
  return ungueltig(e?.ok === false ? e.fehler.meldung : 'Ein Satz ist ein Text mit 2 Stellen.', feld);
}

/** Die gespeicherte Form der anrechenbaren Kosten: Betrag von Hand oder Verweis auf eine Kostenermittlung. */
function kostenPruefen(roh: unknown, feld: string): Geprueft<AnrechenbareKostenangabe> {
  if (!istObjekt(roh)) return ungueltig('Die anrechenbaren Kosten sind ein Objekt.', feld);
  if (roh['art'] === 'betrag') {
    const betrag = betragPruefen(roh['betrag'], feld);
    return betrag.ok ? gut({ art: 'betrag', betrag: betrag.wert }) : betrag;
  }
  if (roh['art'] !== 'kostenermittlung')
    return ungueltig(
      `Gespeichert sind die anrechenbaren Kosten ein Betrag oder ein Verweis auf eine Kostenermittlung, nicht ${JSON.stringify(roh['art'])}.`,
      feld,
    );
  const id = roh['kostenermittlungId'];
  if (typeof id !== 'string' || id === '')
    return ungueltig('Die Kennung der Kostenermittlung ist ein nicht leerer Text.', feld);
  const anteilig = roh['technischeAnlagenAnteilig'];
  if (typeof anteilig !== 'boolean')
    return ungueltig('technischeAnlagenAnteilig ist ein Wahrheitswert.', feld);
  const weitere = betragPruefen(roh['weitereKosten'], feld);
  if (!weitere.ok) return weitere;
  const bausubstanz = betragPruefen(roh['mitzuverarbeitendeBausubstanz'], feld);
  if (!bausubstanz.ok) return bausubstanz;
  return gut({
    art: 'kostenermittlung',
    kostenermittlungId: id as Extract<
      AnrechenbareKostenangabe,
      { art: 'kostenermittlung' }
    >['kostenermittlungId'],
    technischeAnlagenAnteilig: anteilig,
    weitereKosten: weitere.wert,
    mitzuverarbeitendeBausubstanz: bausubstanz.wert,
  });
}

/** Die beauftragten Leistungsphasen: Nummern 1 bis 9, streng aufsteigend (also je höchstens einmal), Anteil kanonisch. */
function phasenPruefen(roh: unknown, feld: string): Geprueft<readonly BeauftragteLeistungsphase[]> {
  if (!Array.isArray(roh)) return ungueltig('Die Leistungsphasen sind eine Liste.', feld);
  const phasen: BeauftragteLeistungsphase[] = [];
  let vorige = 0;
  for (const p of roh as readonly unknown[]) {
    if (!istObjekt(p)) return ungueltig('Eine Leistungsphase ist ein Objekt.', feld);
    const nummer = p['nummer'];
    if (!Number.isInteger(nummer) || (nummer as number) < 1 || (nummer as number) > 9)
      return ungueltig(`Die Nummer einer Leistungsphase ist 1 bis 9, nicht ${JSON.stringify(nummer)}.`, feld);
    if ((nummer as number) <= vorige)
      return ungueltig(
        `Die Leistungsphasen stehen aufsteigend und je höchstens einmal; ${String(nummer)} folgt auf ${String(vorige)}.`,
        feld,
      );
    vorige = nummer as number;
    if (p['anteil'] === undefined) phasen.push({ nummer: nummer as Leistungsphasennummer });
    else {
      const anteil = satzPruefen(p['anteil'], feld);
      if (!anteil.ok) return anteil;
      phasen.push({ nummer: nummer as Leistungsphasennummer, anteil: anteil.wert });
    }
  }
  return gut(phasen);
}

/** Ein Honorarobjekt in kanonischer Form; `feld` beginnt mit `objekte[n]` (ab 1). */
function objektPruefen(roh: unknown, stelle: number): Geprueft<Honorarobjekt> {
  const pfad = `objekte[${String(stelle)}]`;
  if (!istObjekt(roh)) return ungueltig('Ein Honorarobjekt ist ein Objekt.', pfad);
  const { bezeichnung, leistungsbild, honorarzone } = roh;
  if (!istNichtLeer(bezeichnung))
    return ungueltig('Die Bezeichnung ist ein nicht leerer Text.', `${pfad}.bezeichnung`);
  if (!LEISTUNGSBILDER.has(leistungsbild as Leistungsbild))
    return ungueltig(`Unbekanntes Leistungsbild: ${JSON.stringify(leistungsbild)}`, `${pfad}.leistungsbild`);
  if (!HONORARZONEN.has(honorarzone as Honorarzone))
    return ungueltig(
      `Die Honorarzone ist I bis V, nicht ${JSON.stringify(honorarzone)}.`,
      `${pfad}.honorarzone`,
    );
  const honorarsatz = satzPruefen(roh['honorarsatz'], `${pfad}.honorarsatz`);
  if (!honorarsatz.ok) return honorarsatz;
  const kosten = kostenPruefen(roh['anrechenbareKosten'], `${pfad}.anrechenbareKosten`);
  if (!kosten.ok) return kosten;
  const phasen = phasenPruefen(roh['leistungsphasen'], `${pfad}.leistungsphasen`);
  if (!phasen.ok) return phasen;
  let umbauzuschlagssatz: Prozent | null = null;
  if (roh['umbauzuschlagssatz'] !== null) {
    const satz = satzPruefen(roh['umbauzuschlagssatz'], `${pfad}.umbauzuschlagssatz`);
    if (!satz.ok) return satz;
    umbauzuschlagssatz = satz.wert;
  }
  return gut({
    bezeichnung,
    leistungsbild: leistungsbild as Leistungsbild,
    honorarzone: honorarzone as Honorarzone,
    honorarsatz: honorarsatz.wert,
    anrechenbareKosten: kosten.wert,
    leistungsphasen: phasen.wert,
    umbauzuschlagssatz,
  });
}

function nebenkostenPruefen(roh: unknown): Geprueft<Nebenkostenangabe | null> {
  if (roh === null) return gut(null);
  const feld = 'nebenkosten';
  if (istObjekt(roh) && roh['art'] === 'prozent') {
    const satz = satzPruefen(roh['satz'], feld);
    return satz.ok ? gut({ art: 'prozent', satz: satz.wert }) : satz;
  }
  if (istObjekt(roh) && roh['art'] === 'betrag') {
    const betrag = betragPruefen(roh['betrag'], feld);
    return betrag.ok ? gut({ art: 'betrag', betrag: betrag.wert }) : betrag;
  }
  return ungueltig('Die Nebenkosten sind null, ein Prozentsatz oder ein Betrag.', feld);
}

/** Der Inhalt (Name, Objekte, Nebenkosten, MwSt-Satz) in kanonischer Form, oder der erste Formfehler. */
function inhaltPruefen(
  roh: Pick<Honorarberechnung, 'name' | 'objekte' | 'nebenkosten' | 'mwstSatz'>,
): Geprueft<Pick<Honorarberechnung, 'name' | 'objekte' | 'nebenkosten' | 'mwstSatz'>> {
  if (!istNichtLeer(roh.name)) return ungueltig('Der Name ist ein nicht leerer Text.', 'name');
  if (!Array.isArray(roh.objekte)) return ungueltig('Die Honorarobjekte sind eine Liste.', 'objekte');
  const objekte: Honorarobjekt[] = [];
  for (const [i, o] of (roh.objekte as readonly unknown[]).entries()) {
    const objekt = objektPruefen(o, i + 1);
    if (!objekt.ok) return objekt;
    objekte.push(objekt.wert);
  }
  const nebenkosten = nebenkostenPruefen(roh.nebenkosten);
  if (!nebenkosten.ok) return nebenkosten;
  const mwstSatz = satzPruefen(roh.mwstSatz, 'mwstSatz');
  if (!mwstSatz.ok) return mwstSatz;
  return gut({ name: roh.name, objekte, nebenkosten: nebenkosten.wert, mwstSatz: mwstSatz.wert });
}

function changeSet(vorher: Honorarberechnung | null, nachher: Honorarberechnung | null): Antwort {
  const id = (nachher ?? vorher)?.id;
  if (id === undefined) throw new Error('Ein ChangeSet der Honorarberechnung braucht eine Honorarberechnung');
  return {
    ok: true,
    wert: { art: 'honorarberechnung', honorarberechnungId: id, honorarberechnung: { vorher, nachher } },
  };
}

/**
 * Führt einen Befehl an der Honorarberechnung aus. `HonorarberechnungAnlegen` verlangt `zustand === null`, jeder andere
 * Befehl eine Honorarberechnung (sonst `befehl-nicht-zustaendig`, wie der Kern). Rein und deterministisch (A2).
 */
export const honorarberechnungBefehlAusfuehren: HonorarberechnungBefehlAusfuehren = (zustand, befehl) => {
  if (befehl.art === 'HonorarberechnungAnlegen') {
    if (zustand !== null)
      return nein(
        'befehl-nicht-zustaendig',
        'HonorarberechnungAnlegen: die Honorarberechnung existiert schon.',
      );
    const h = befehl.honorarberechnung;
    if (!istObjekt(h)) return ungueltig('Die Honorarberechnung ist ein Objekt.', 'honorarberechnung');
    for (const feld of ['id', 'projektId'] as const)
      if (typeof h[feld] !== 'string' || h[feld] === '')
        return ungueltig(`${feld} ist eine nicht leere Kennung.`, feld);
    const inhalt = inhaltPruefen(h);
    return inhalt.ok ? changeSet(null, { id: h.id, projektId: h.projektId, ...inhalt.wert }) : inhalt;
  }
  if (zustand === null)
    return nein('befehl-nicht-zustaendig', `${befehl.art} verlangt eine Honorarberechnung.`);
  const h = zustand.honorarberechnung;
  if (befehl.art === 'HonorarberechnungLoeschen') return changeSet(h, null);
  const inhalt = inhaltPruefen(befehl);
  return inhalt.ok ? changeSet(h, { id: h.id, projektId: h.projektId, ...inhalt.wert }) : inhalt;
};

/** Wendet ein ChangeSet an: `nachher` ist der neue Stand, `null` heißt gelöscht (ganzes Aggregat). */
export const honorarberechnungChangeSetAnwenden: HonorarberechnungChangeSetAnwenden = (
  _zustand,
  changeSet,
) => {
  const nachher = changeSet.honorarberechnung.nachher;
  return nachher === null ? null : { honorarberechnung: nachher };
};

/** Kehrt ein ChangeSet um (Undo): Tausch von `vorher` und `nachher`. */
export const honorarberechnungChangeSetUmkehren: HonorarberechnungChangeSetUmkehren = (changeSet) => ({
  ...changeSet,
  honorarberechnung: {
    vorher: changeSet.honorarberechnung.nachher,
    nachher: changeSet.honorarberechnung.vorher,
  },
});
