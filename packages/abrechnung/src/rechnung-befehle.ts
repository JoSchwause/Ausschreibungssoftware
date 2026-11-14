// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle an der Rechnung ausführen (Ticket 81; vertrag v1.4, D-70.3, D-70.4, D-44). Der Ausführer sieht nur die Rechnung
// (Signatur `RechnungBefehlAusfuehren`) und prüft die Form; die Reihenfolge der Freigaben prüft die App vorher
// (`freigabeMoeglich`) und `speicher` als `konflikt`, die übrigen Regeln `rechnungPruefen` als Befund (U5). ChangeSet jedes
// Befehls: die ganze Rechnung vorher und nachher (D-36 (8)).
//
// Lesarten (vertrag v1.4):
// - Eine freigegebene Rechnung ändert nur `RechnungsfreigabeAufheben`; jeden anderen Befehl an ihr, auch das Löschen, weist
//   der Ausführer mit `rechnung-freigegeben` ab (Q5). Aufheben an einer nicht freigegebenen: `ungueltige-eingabe`.
// - Angelegt wird ohne Freigabe (sonst `ungueltige-eingabe`); freigegeben nur über `RechnungFreigeben` mit dem Zahlbetrag,
//   den die App gerechnet hat (der Ausführer rechnet nicht nach).
// - `gefordert`: `null` oder ein Objekt mit mindestens einem Betrag (D-44); `rechnungsnummerAuftragnehmer: ''` ist keine
//   Nummer und wird `null` (D-81.6). Nummer, Projekt und Auftrags-LV bleiben nach dem Anlegen fest (D-70.9).
// - Die Rechnung im ChangeSet ist kanonisch: genau die Felder des Vertrags in Vertragsreihenfolge (A8).
//
// Lesarten (vertrag v1.7b, Ticket 143; D-72, D-128.2 bis D-128.7):
// - Vertragsstrafe, Skonto und Bauabzugsteuer setzen nur vor der Freigabe (sonst `rechnung-freigegeben`); Zahlungen erfassen,
//   ändern und löschen nur danach (sonst `ungueltige-eingabe`, `feld: 'freigabe'`). „Freigabe aufheben“ an einer Rechnung mit
//   Zahlungen: `zahlungen-vorhanden` (Q5). `RechnungAnlegen` darf die drei Abzüge mitbringen, nie `zahlungen`.
// - „Fehlt“ ist die einzige Schreibweise für keine/aus: Ein vorhandener Schlüssel mit `null`, `false` oder `[]` ist
//   `ungueltige-eingabe` (D-128.2). Die neuen Felder stehen am Ende in der Folge des Vertrags.
// - Der Grund der Vertragsstrafe ist nicht leer und nicht nur Leerraum; er wird unverändert gespeichert (D-143.3).

import { alsBetrag, alsProzent, vergleiche, vorzeichen } from '@tethys/dezimal';
import type {
  AufmassId,
  Befehlsfehler,
  Betrag,
  Ergebnis,
  Kalenderdatum,
  Prozent,
  Rechnung,
  RechnungBefehlAusfuehren,
  RechnungChangeSet,
  Skonto,
  Umlage,
  Vertragsstrafe,
  Zahlung,
  ZahlungId,
} from '@tethys/vertrag';
import { datumFehler, istObjekt, kennungFehler, nein, nummerFehler } from './form';

type Antwort = Ergebnis<RechnungChangeSet, Befehlsfehler>;
type Geprueft<T> = Ergebnis<T, Befehlsfehler>;

const ungueltig = (meldung: string, feld: string): { ok: false; fehler: Befehlsfehler } =>
  nein('ungueltige-eingabe', meldung, feld);
const gut = <T>(wert: T): Geprueft<T> => ({ ok: true, wert });

function betragPruefen(wert: unknown, feld: string): Geprueft<Betrag> {
  const e = typeof wert === 'string' ? alsBetrag(wert) : null;
  if (e?.ok === true) return gut(e.wert);
  return ungueltig(e?.ok === false ? e.fehler.meldung : 'Ein Betrag ist ein Text mit 2 Stellen.', feld);
}

function satzPruefen(wert: unknown, feld: string): Geprueft<Prozent | null> {
  if (wert === null) return gut(null);
  const e = typeof wert === 'string' ? alsProzent(wert) : null;
  if (e?.ok === true) return gut(e.wert);
  return ungueltig(
    e?.ok === false ? e.fehler.meldung : 'Ein Satz ist null oder ein Text mit 2 Stellen.',
    feld,
  );
}

/** Die Angaben (Art, Eingang, Nummer des Auftragnehmers, Forderung) in kanonischer Form. */
function angabenPruefen(
  art: unknown,
  eingang: unknown,
  nummerAn: unknown,
  gefordert: unknown,
): Geprueft<Pick<Rechnung, 'art' | 'eingang' | 'rechnungsnummerAuftragnehmer' | 'gefordert'>> {
  if (art !== 'abschlag' && art !== 'schluss')
    return ungueltig('Die Rechnungsart ist „abschlag“ oder „schluss“.', 'art');
  const df = datumFehler(eingang);
  if (df !== null) return ungueltig(df, 'eingang');
  if (nummerAn !== null && typeof nummerAn !== 'string')
    return ungueltig(
      'Die Rechnungsnummer des Auftragnehmers ist ein Text oder null.',
      'rechnungsnummerAuftragnehmer',
    );
  let forderung: Rechnung['gefordert'] = null;
  if (gefordert !== null) {
    if (!istObjekt(gefordert)) return ungueltig('Die Forderung ist null oder ein Objekt.', 'gefordert');
    const werte: Partial<Record<'netto' | 'brutto' | 'zahlbetrag', Betrag | null>> = {};
    for (const f of ['netto', 'brutto', 'zahlbetrag'] as const) {
      const w = gefordert[f];
      if (w === null) werte[f] = null;
      else {
        const e = betragPruefen(w, `gefordert.${f}`);
        if (!e.ok) return e;
        werte[f] = e.wert;
      }
    }
    const { netto = null, brutto = null, zahlbetrag = null } = werte;
    if (netto === null && brutto === null && zahlbetrag === null)
      return ungueltig(
        '„Nichts gefordert“ ist gefordert: null, kein Objekt mit drei null (D-44).',
        'gefordert',
      );
    forderung = { netto, brutto, zahlbetrag };
  }
  return gut({
    art,
    eingang: eingang as string | null,
    rechnungsnummerAuftragnehmer: nummerAn === '' ? null : nummerAn,
    gefordert: forderung,
  });
}

function aufmassePruefen(roh: unknown): Geprueft<readonly AufmassId[]> {
  if (!Array.isArray(roh)) return ungueltig('Die Aufmaßblätter sind eine Liste von Kennungen.', 'aufmassIds');
  const gesehen = new Set<string>();
  for (const id of roh as readonly unknown[]) {
    const kf = kennungFehler(id, 'aufmassIds');
    if (kf !== null) return ungueltig(kf, 'aufmassIds');
    if (gesehen.has(id as string))
      return ungueltig(`Das Aufmaßblatt ${String(id)} steht zweimal in der Rechnung.`, 'aufmassIds');
    gesehen.add(id as string);
  }
  return gut([...(roh as readonly AufmassId[])]);
}

function abzuegePruefen(
  umlagen: unknown,
  sicherheit: unknown,
  gewaehrleistung: unknown,
): Geprueft<Pick<Rechnung, 'umlagen' | 'sicherheitSatz' | 'gewaehrleistungSatz'>> {
  if (!Array.isArray(umlagen)) return ungueltig('Die Umlagen sind eine Liste.', 'umlagen');
  const liste: Umlage[] = [];
  for (const u of umlagen as readonly unknown[]) {
    if (!istObjekt(u)) return ungueltig('Eine Umlage ist ein Objekt.', 'umlagen');
    if (typeof u['bezeichnung'] !== 'string')
      return ungueltig('Die Bezeichnung einer Umlage ist ein Text.', 'umlagen.bezeichnung');
    const satz = satzPruefen(u['satz'], 'umlagen.satz');
    if (!satz.ok) return satz;
    if (satz.wert === null) return ungueltig('Eine Umlage hat einen Satz.', 'umlagen.satz');
    liste.push({ bezeichnung: u['bezeichnung'], satz: satz.wert });
  }
  const s = satzPruefen(sicherheit, 'sicherheitSatz');
  if (!s.ok) return s;
  const g = satzPruefen(gewaehrleistung, 'gewaehrleistungSatz');
  if (!g.ok) return g;
  return gut({ umlagen: liste, sicherheitSatz: s.wert, gewaehrleistungSatz: g.wert });
}

/** Ein Betrag größer 0,00 (Vertragsstrafe, Zahlung). */
function positivPruefen(wert: unknown, feld: string): Geprueft<Betrag> {
  const e = betragPruefen(wert, feld);
  if (!e.ok) return e;
  return vorzeichen(e.wert) > 0
    ? e
    : ungueltig(`Der Betrag muss größer als 0,00 sein, nicht ${e.wert}.`, feld);
}

function vertragsstrafePruefen(roh: unknown): Geprueft<Vertragsstrafe> {
  if (!istObjekt(roh))
    return ungueltig('Die Vertragsstrafe ist ein Objekt mit Betrag und Grund.', 'vertragsstrafe');
  const betrag = positivPruefen(roh['betrag'], 'vertragsstrafe.betrag');
  if (!betrag.ok) return betrag;
  const grund = roh['grund'];
  if (typeof grund !== 'string' || grund.trim() === '')
    return ungueltig('Die Vertragsstrafe braucht einen Grund.', 'vertragsstrafe.grund');
  return gut({ betrag: betrag.wert, grund });
}

const HUNDERT = '100.00' as Prozent;

function skontoPruefen(roh: unknown): Geprueft<Skonto> {
  if (!istObjekt(roh)) return ungueltig('Der Skonto ist ein Objekt mit Satz und Frist.', 'skonto');
  const satz = satzPruefen(roh['satz'], 'skonto.satz');
  if (!satz.ok) return satz;
  if (satz.wert === null || vorzeichen(satz.wert) <= 0 || vergleiche(satz.wert, HUNDERT) >= 0)
    return ungueltig('Der Skontosatz ist größer als 0,00 und kleiner als 100,00.', 'skonto.satz');
  const tage = roh['fristTage'];
  if (!Number.isSafeInteger(tage) || (tage as number) < 1 || (tage as number) > 365)
    return ungueltig(
      `Die Skontofrist ist eine ganze Zahl von 1 bis 365 Tagen, nicht ${String(tage)}.`,
      'skonto.fristTage',
    );
  return gut({ satz: satz.wert, fristTage: tage as number });
}

function bauabzugsteuerPruefen(roh: unknown): Geprueft<boolean> {
  return typeof roh === 'boolean'
    ? gut(roh)
    : ungueltig('Die Bauabzugsteuer ist ein- oder ausgeschaltet.', 'bauabzugsteuer');
}

function zahlungPruefen(roh: unknown): Geprueft<Zahlung> {
  if (!istObjekt(roh))
    return ungueltig('Eine Zahlung ist ein Objekt mit Kennung, Datum und Betrag.', 'zahlung');
  const kf = kennungFehler(roh['id'], 'Die Kennung der Zahlung');
  if (kf !== null) return ungueltig(kf, 'zahlung.id');
  const datum = roh['datum'];
  const df = datum === null ? 'Eine Zahlung hat ein Datum.' : datumFehler(datum);
  if (df !== null) return ungueltig(df, 'zahlung.datum');
  const betrag = positivPruefen(roh['betrag'], 'zahlung.betrag');
  if (!betrag.ok) return betrag;
  return gut({ id: roh['id'] as ZahlungId, datum: datum as Kalenderdatum, betrag: betrag.wert });
}

/**
 * Die drei Abzüge aus v1.7b an einer anzulegenden Rechnung: fehlt oder gültig; `null`, `false` und `[]` sind keine
 * Schreibweise (D-128.2), `zahlungen` gibt es beim Anlegen nie (D-128.7).
 */
function neueFelderPruefen(
  r: Rechnung,
): Geprueft<Pick<Rechnung, 'vertragsstrafe' | 'skonto' | 'bauabzugsteuer'>> {
  if (Object.hasOwn(r, 'zahlungen'))
    return ungueltig('Eine neue Rechnung ist nicht freigegeben und hat keine Zahlungen.', 'zahlungen');
  const teile: { vertragsstrafe?: Vertragsstrafe; skonto?: Skonto; bauabzugsteuer?: true } = {};
  if (Object.hasOwn(r, 'vertragsstrafe')) {
    const v = vertragsstrafePruefen(r['vertragsstrafe']);
    if (!v.ok) return v;
    teile.vertragsstrafe = v.wert;
  }
  if (Object.hasOwn(r, 'skonto')) {
    const s = skontoPruefen(r['skonto']);
    if (!s.ok) return s;
    teile.skonto = s.wert;
  }
  if (Object.hasOwn(r, 'bauabzugsteuer')) {
    if (r['bauabzugsteuer'] !== true)
      return ungueltig('Ausgeschaltet heißt: das Feld fehlt (nie false).', 'bauabzugsteuer');
    teile.bauabzugsteuer = true;
  }
  return gut(teile);
}

/** Feldwerte, die eine Rechnung ändern; `undefined` entfernt ein optionales Feld (v1.7b). */
type Neu = 'vertragsstrafe' | 'skonto' | 'bauabzugsteuer' | 'zahlungen';
type Teile = Partial<Omit<Rechnung, Neu>> & { readonly [K in Neu]?: Rechnung[K] | undefined };

/** Die Rechnung mit diesen Teilen, Felder in Vertragsreihenfolge; optionale Felder nur, wenn gesetzt. */
function rechnung(r: Rechnung, teile: Teile = {}): Rechnung {
  const x = { ...r, ...teile };
  return {
    id: x.id,
    projektId: x.projektId,
    auftragsLvId: x.auftragsLvId,
    nummer: x.nummer,
    art: x.art,
    eingang: x.eingang,
    rechnungsnummerAuftragnehmer: x.rechnungsnummerAuftragnehmer,
    gefordert: x.gefordert,
    aufmassIds: x.aufmassIds,
    umlagen: x.umlagen,
    sicherheitSatz: x.sicherheitSatz,
    gewaehrleistungSatz: x.gewaehrleistungSatz,
    freigabe: x.freigabe,
    // v1.7b: am Ende, in dieser Folge, nur wenn gesetzt (D-128.2)
    ...(x.vertragsstrafe === undefined ? {} : { vertragsstrafe: x.vertragsstrafe }),
    ...(x.skonto === undefined ? {} : { skonto: x.skonto }),
    ...(x.bauabzugsteuer === undefined ? {} : { bauabzugsteuer: x.bauabzugsteuer }),
    ...(x.zahlungen === undefined || x.zahlungen.length === 0 ? {} : { zahlungen: x.zahlungen }),
  };
}

/** Die ganze Rechnung in kanonischer Form (Anlegen), oder der erste Formfehler. */
function anlegenPruefen(r: Rechnung): Geprueft<Rechnung> {
  if (!istObjekt(r)) return ungueltig('Die Rechnung ist ein Objekt.', 'rechnung');
  for (const feld of ['id', 'projektId', 'auftragsLvId'] as const) {
    const kf = kennungFehler(r[feld], feld);
    if (kf !== null) return ungueltig(kf, feld);
  }
  const nf = nummerFehler(r.nummer);
  if (nf !== null) return ungueltig(nf, 'nummer');
  const angaben = angabenPruefen(r.art, r.eingang, r.rechnungsnummerAuftragnehmer, r.gefordert);
  if (!angaben.ok) return angaben;
  const aufmassIds = aufmassePruefen(r.aufmassIds);
  if (!aufmassIds.ok) return aufmassIds;
  const abzuege = abzuegePruefen(r.umlagen, r.sicherheitSatz, r.gewaehrleistungSatz);
  if (!abzuege.ok) return abzuege;
  if (r.freigabe !== null)
    return ungueltig(
      'Eine Rechnung wird ohne Freigabe angelegt; freigegeben wird mit RechnungFreigeben.',
      'freigabe',
    );
  const neu = neueFelderPruefen(r);
  if (!neu.ok) return neu;
  const { vertragsstrafe, skonto, bauabzugsteuer } = neu.wert;
  return gut(
    rechnung(r, {
      ...angaben.wert,
      aufmassIds: aufmassIds.wert,
      ...abzuege.wert,
      vertragsstrafe,
      skonto,
      bauabzugsteuer,
      zahlungen: undefined,
    }),
  );
}

/** Die Zahlungsbefehle an einer freigegebenen Rechnung (D-128.6); die Freigabe bleibt, wie sie ist. */
function zahlungsbefehl(
  r: Rechnung,
  befehl:
    | { readonly art: 'ZahlungErfassen' | 'ZahlungAendern'; readonly zahlung: Zahlung }
    | { readonly art: 'ZahlungLoeschen'; readonly zahlungId: ZahlungId },
): Antwort {
  if (r.freigabe === null)
    return ungueltig(
      `${befehl.art}: Zahlungen gibt es nur an einer freigegebenen Rechnung (Rechnung ${String(r.nummer)}).`,
      'freigabe',
    );
  const liste = r.zahlungen ?? [];
  if (befehl.art === 'ZahlungLoeschen') {
    if (!liste.some((z) => z.id === befehl.zahlungId))
      return ungueltig(`Die Rechnung hat keine Zahlung ${String(befehl.zahlungId)}.`, 'zahlungId');
    return changeSet(r, rechnung(r, { zahlungen: liste.filter((z) => z.id !== befehl.zahlungId) }));
  }
  const z = zahlungPruefen(befehl.zahlung);
  if (!z.ok) return z;
  const da = liste.some((x) => x.id === z.wert.id);
  if (befehl.art === 'ZahlungErfassen') {
    if (da) return nein('id-vergeben', `Die Rechnung hat schon eine Zahlung ${z.wert.id}.`, 'zahlung.id');
    return changeSet(r, rechnung(r, { zahlungen: [...liste, z.wert] }));
  }
  if (!da) return ungueltig(`Die Rechnung hat keine Zahlung ${z.wert.id}.`, 'zahlungId');
  return changeSet(r, rechnung(r, { zahlungen: liste.map((x) => (x.id === z.wert.id ? z.wert : x)) }));
}

function changeSet(vorher: Rechnung | null, nachher: Rechnung | null): Antwort {
  const id = (nachher ?? vorher)?.id;
  if (id === undefined) throw new Error('Ein Rechnungs-ChangeSet braucht eine Rechnung');
  return { ok: true, wert: { art: 'rechnung', rechnungId: id, rechnung: { vorher, nachher } } };
}

/**
 * Führt einen Befehl an der Rechnung aus. `RechnungAnlegen` verlangt `zustand === null`, jeder andere Befehl eine Rechnung
 * (sonst `befehl-nicht-zustaendig`). Rein und deterministisch (A2); erwartbare Fehler sind Werte.
 */
export const rechnungBefehlAusfuehren: RechnungBefehlAusfuehren = (zustand, befehl) => {
  if (befehl.art === 'RechnungAnlegen') {
    if (zustand !== null)
      return nein('befehl-nicht-zustaendig', 'RechnungAnlegen: die Rechnung existiert schon.');
    const r = anlegenPruefen(befehl.rechnung);
    return r.ok ? changeSet(null, r.wert) : r;
  }
  if (zustand === null) return nein('befehl-nicht-zustaendig', `${befehl.art} verlangt eine Rechnung.`);
  const r = zustand.rechnung;
  if (befehl.art === 'RechnungsfreigabeAufheben') {
    if (r.freigabe === null) return ungueltig('Die Rechnung ist nicht freigegeben.', 'freigabe');
    const n = r.zahlungen?.length ?? 0;
    if (n > 0)
      return nein(
        'zahlungen-vorhanden',
        `RechnungsfreigabeAufheben: Zur Rechnung ${String(r.nummer)} ${n === 1 ? 'ist 1 Zahlung' : `sind ${String(n)} Zahlungen`} erfasst.`,
      );
    return changeSet(r, rechnung(r, { freigabe: null }));
  }
  if (befehl.art === 'ZahlungErfassen' || befehl.art === 'ZahlungAendern' || befehl.art === 'ZahlungLoeschen')
    return zahlungsbefehl(r, befehl);
  if (r.freigabe !== null)
    return nein(
      'rechnung-freigegeben',
      `Rechnung ${String(r.nummer)} ist freigegeben; erst die Freigabe aufheben (${befehl.art}).`,
    );
  switch (befehl.art) {
    case 'RechnungsangabenSetzen': {
      const a = angabenPruefen(
        befehl.rechnungsart,
        befehl.eingang,
        befehl.rechnungsnummerAuftragnehmer,
        befehl.gefordert,
      );
      return a.ok ? changeSet(r, rechnung(r, a.wert)) : a;
    }
    case 'RechnungsaufmasseSetzen': {
      const ids = aufmassePruefen(befehl.aufmassIds);
      return ids.ok ? changeSet(r, rechnung(r, { aufmassIds: ids.wert })) : ids;
    }
    case 'RechnungsabzuegeSetzen': {
      const ab = abzuegePruefen(befehl.umlagen, befehl.sicherheitSatz, befehl.gewaehrleistungSatz);
      return ab.ok ? changeSet(r, rechnung(r, ab.wert)) : ab;
    }
    case 'RechnungFreigeben': {
      const z = betragPruefen(befehl.zahlbetrag, 'zahlbetrag');
      return z.ok ? changeSet(r, rechnung(r, { freigabe: { zahlbetrag: z.wert } })) : z;
    }
    case 'RechnungLoeschen':
      return changeSet(r, null);
    // v1.7b (D-72, D-128.3 bis D-128.5): nur vor der Freigabe (oben geprüft).
    case 'VertragsstrafeSetzen': {
      if (befehl.vertragsstrafe === null) return changeSet(r, rechnung(r, { vertragsstrafe: undefined }));
      const v = vertragsstrafePruefen(befehl.vertragsstrafe);
      return v.ok ? changeSet(r, rechnung(r, { vertragsstrafe: v.wert })) : v;
    }
    case 'SkontoSetzen': {
      if (befehl.skonto === null) return changeSet(r, rechnung(r, { skonto: undefined }));
      const s = skontoPruefen(befehl.skonto);
      return s.ok ? changeSet(r, rechnung(r, { skonto: s.wert })) : s;
    }
    case 'BauabzugsteuerSetzen': {
      const an = bauabzugsteuerPruefen(befehl.bauabzugsteuer);
      return an.ok ? changeSet(r, rechnung(r, { bauabzugsteuer: an.wert ? true : undefined })) : an;
    }
  }
};
