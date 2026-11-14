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

import { alsBetrag, alsProzent } from '@tethys/dezimal';
import type {
  AufmassId,
  Befehlsfehler,
  Betrag,
  Ergebnis,
  Prozent,
  Rechnung,
  RechnungBefehlAusfuehren,
  RechnungChangeSet,
  Umlage,
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

/** Die Rechnung mit diesen Teilen, Felder in Vertragsreihenfolge. */
function rechnung(r: Rechnung, teile: Partial<Rechnung> = {}): Rechnung {
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
  return gut(rechnung(r, { ...angaben.wert, aufmassIds: aufmassIds.wert, ...abzuege.wert }));
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
    return changeSet(r, rechnung(r, { freigabe: null }));
  }
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
    // vertrag v1.7b (Ticket 128): mechanisch ergänzt, die Ausführung folgt mit Ticket 143 (D-72, D-128.x).
    case 'VertragsstrafeSetzen':
    case 'SkontoSetzen':
    case 'BauabzugsteuerSetzen':
    case 'ZahlungErfassen':
    case 'ZahlungAendern':
    case 'ZahlungLoeschen':
      return nein('befehl-nicht-zustaendig', `${befehl.art}: noch nicht umgesetzt (Ticket 143).`);
  }
};
