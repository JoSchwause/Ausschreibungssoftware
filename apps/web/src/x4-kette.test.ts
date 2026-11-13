// SPDX-License-Identifier: AGPL-3.0-or-later
// Tor X4 (Ticket 120, D-58): die Kette der Bauleitung ohne Oberfläche, mit den Funktionen, die die App ruft (Entwürfe →
// Befehle → Ausführer in `bauleitung` → echter Speicher). Zwei Auftrags-LVs mit zwei Auftragnehmern (Zuschlag an Bieter A
// und B), die Mängel und Bautagebucheinträge aus `fixtures/bauleitung.json` (Ticket 112) anlegen, jeder Mangel über seinen
// Verlauf bis zum Status der Fixture, Fristprüfung zum Stichtag 26.11.2026 (genau Mangel 3), Auswertung je Auftragnehmer,
// Bautagebuchauswertung, beide Gegenproben, beide PDFs (mit pdf.js zurückgelesen), und alles nach dem Neuladen aus dem
// Speicher gleich.
//
// Jede erwartete Zahl steht in der Fixture (Herleitung dort), nie aus einem Lauf dieses Codes. Dieselben Schritte gehen in
// `e2e/x4.spec.ts` über die Oberfläche.

import {
  bautagebuchAuswerten,
  fristPruefen,
  maengelAuswerten,
  mangelstatus,
  naechsteMangelnummer,
} from '@tethys/bauleitung';
import type {
  AuftragsLeistungsverzeichnisId,
  Bautagebucheintrag,
  Mangel,
  Projekt,
  PositionId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import {
  erzeugeBautagebuchPdf,
  erzeugeMaengelanzeigePdf,
  erzeugeMaengellistePdf,
} from '../../../packages/ausgabe/src/index';
import { alsText, liesPdf } from '../../../packages/ausgabe/src/pdftext';
import { schriftenAusDateien } from '../../../packages/ausgabe/src/schriften-node';
import { ERSTE_FRIST_MANGEL_2, X4_AUFTRAEGE, datumDeFx, x4Fixture } from '../e2e/x4-aufbau';
import { auftragsLvsLaden, zuschlagserteilungSpeichern } from './auftrag/auftrag';
import { zuschlagserteilungPlanen } from './auftrag/zuschlagserteilung';
import { eintragLesen, entwurfAusEintrag, type EintragEntwurf } from './bauleitung/bautagebuch';
import {
  AKTIONEN,
  AKTION_NACH,
  auftragnehmerAngaben,
  entwurfAusMangel,
  filtern,
  fuerAnzeige,
  KEIN_FILTER,
  leererEntwurf,
  mangelAnlegenBefehl,
  mangelAngabenBefehl,
  namenJeAuftrag,
  statusBefehle,
  type MangelEntwurf,
  type Statusaktion,
} from './bauleitung/maengel';
import { bautagebuchLaden, bautagebuchSitzung, maengelLaden, mangelSitzung } from './bauleitung/schreiben';
import { angebotAnlegenPlan, angebotLesen } from './gaeb/gaeb';
import { befehlswegFuer } from './lv/befehlsweg';
import { speicherImSpeicher, testUmgebung } from './testhilfen';
import { datumAusUhr } from './ausgabe/logik';
import { readFileSync } from 'node:fs';

const f = x4Fixture();
const wurzel = new URL('../../../', import.meta.url);

/** LV, Angebot des Bieters aus seiner X84 und Zuschlag ohne Wahl: ein Auftrags-LV mit diesem Auftragnehmer. */
async function auftragAnlegen(
  u: ReturnType<typeof testUmgebung>,
  projekt: Projekt,
  a: (typeof X4_AUFTRAEGE)[number],
): Promise<{ projekt: Projekt; auftragsLvId: AuftragsLeistungsverzeichnisId }> {
  const weg = befehlswegFuer(u);
  const inhalt = a.inhalt();
  const s = weg.lv(projekt.id, null);
  const l = await s.befehl({
    art: 'LeistungsverzeichnisAnlegen',
    id: inhalt.wurzelId,
    projektId: projekt.id,
    inhalt,
  });
  if (!l.ok || s.zustand === null) throw new Error('LV');
  const lv = s.zustand;
  const bytes = new Uint8Array(readFileSync(new URL(a.datei, wurzel)));
  const v = angebotLesen(bytes, a.datei, lv, u.ids);
  const plan = angebotAnlegenPlan(v, v.bieterName, projekt, u.ids);
  if (plan === null) throw new Error('Angebot');
  const ang = await weg.angebotAnlegen(projekt, lv, plan.neuerBieter, plan.angebot);
  if (!ang.ok) throw new Error('Angebot anlegen');
  const zuschlag = zuschlagserteilungPlanen({
    lv,
    angebot: plan.angebot,
    projekt: ang.zustand,
    gewaehlt: new Set<PositionId>(),
    neueId: u.ids.auftragsLeistungsverzeichnis(),
  });
  if (zuschlag.befehl === null) throw new Error(zuschlag.fehler ?? 'Zuschlag');
  const r = await zuschlagserteilungSpeichern(weg, zuschlag.befehl);
  if (!r.ok) throw new Error('Zuschlag speichern');
  return { projekt: ang.zustand, auftragsLvId: r.id };
}

async function aufbau() {
  const u = testUmgebung(await speicherImSpeicher());
  const weg = befehlswegFuer(u);
  const p = await weg.projekt(null).befehl({
    art: 'ProjektAnlegen',
    id: u.ids.projekt(),
    name: 'Musterhaus',
    bauherr: { name: 'Bauherr', anschrift: null },
  });
  if (!p.ok || p.zustand === null) throw new Error('Projekt');
  let projekt: Projekt = p.zustand;
  // Fixture-Kennung des Auftrags-LV → Kennung in der App (in der Reihenfolge der Fixture: Rohbau, Tiefbau)
  const auftragsLvVonFixture = new Map<string, AuftragsLeistungsverzeichnisId>();
  for (const [i, a] of X4_AUFTRAEGE.entries()) {
    const r = await auftragAnlegen(u, projekt, a);
    projekt = r.projekt;
    const fx = f.auftraege.find((x) => x.auftragnehmer === a.fixtureAuftragnehmer);
    if (fx === undefined) throw new Error(`Fixture ohne Auftragnehmer ${String(i)}`);
    auftragsLvVonFixture.set(fx.auftragsLvId, r.auftragsLvId);
  }
  return { u, weg, projekt, auftragsLvVonFixture };
}

const aktionFuer = (status: string): Statusaktion => {
  const a = AKTIONEN.find((x) => AKTION_NACH[x] === status);
  if (a === undefined) throw new Error(`Keine Aktion für ${status}`);
  return a;
};

describe('Tor X4: Mängel und Bautagebuch, Kette ohne Oberfläche', () => {
  it('Fixture → Mängel über Entwürfe und Statusaktionen → Befund, Auswertung, Bautagebuch, PDFs → Neuladen', async () => {
    const { u, projekt, auftragsLvVonFixture } = await aufbau();
    const stichtag = f.stichtag;

    // Die Uhr der App liefert den Stichtag (A2: `datumAusUhr`, Rand); hier fest gesetzt wie `page.clock` im E2E.
    expect(datumAusUhr(new Date(2026, 10, 26, 12).toISOString() as never)).toBe(stichtag);

    // --- Mängel anlegen und bis zum Status der Fixture führen --------------------------------------------------------
    for (const m of f.maengel) {
      const auftragsLvId = m.auftragsLvId === null ? '' : (auftragsLvVonFixture.get(m.auftragsLvId) ?? '');
      const ersteFrist = m.nummer === 2 ? ERSTE_FRIST_MANGEL_2 : m.frist;
      const bestand = await maengelLaden(u.speicher, projekt.id);
      if (!bestand.ok) throw new Error('laden');
      const entwurf: MangelEntwurf = {
        ...leererEntwurf(naechsteMangelnummer(bestand.wert), m.festgestellt),
        nummer: String(m.nummer),
        titel: m.titel,
        beschreibung: m.beschreibung ?? '',
        ort: m.ort ?? '',
        auftragsLvId,
        frist: ersteFrist === null ? '' : datumDeFx(ersteFrist),
      };
      const anlegen = mangelAnlegenBefehl(
        u.ids,
        projekt.id,
        entwurf,
        null,
        bestand.wert.map((x) => x.nummer),
      );
      if (!anlegen.ok) throw new Error(JSON.stringify(anlegen.fehler));
      expect((await mangelSitzung(u, projekt.id, null).befehl(anlegen.wert)).ok).toBe(true);
      const id = anlegen.wert.mangel.id;

      for (const e of m.verlauf.slice(1)) {
        const liste = await maengelLaden(u.speicher, projekt.id);
        const jetzt = liste.ok ? liste.wert.find((x) => x.id === id) : undefined;
        if (jetzt === undefined) throw new Error('Mangel fehlt');
        const aktion = aktionFuer(e.status);
        const b = statusBefehle(jetzt, aktion, {
          datum: datumDeFx(e.datum),
          frist: aktion === 'anzeigen' && ersteFrist !== null ? datumDeFx(ersteFrist) : '',
          bemerkung: e.bemerkung ?? '',
        });
        if (!b.ok) throw new Error(JSON.stringify(b.fehler));
        const aus = await mangelSitzung(u, projekt.id, jetzt).folge(b.wert);
        expect(aus.every((a) => a.ok)).toBe(true);
      }

      // Mangel 2: „neue Frist 04.12.2026“ nach dem Wiederöffnen, über „Bearbeiten“ (Angaben setzen)
      if (m.nummer === 2 && m.frist !== null) {
        const liste = await maengelLaden(u.speicher, projekt.id);
        const jetzt = liste.ok ? liste.wert.find((x) => x.id === id) : undefined;
        if (jetzt === undefined) throw new Error('Mangel fehlt');
        const b = mangelAngabenBefehl(
          { ...entwurfAusMangel(jetzt, ''), frist: datumDeFx(m.frist) },
          null,
          jetzt,
        );
        if (!b.ok || b.wert === null) throw new Error('Angaben');
        expect((await mangelSitzung(u, projekt.id, jetzt).befehl(b.wert)).ok).toBe(true);
      }
    }

    // --- Neuladen aus dem Speicher: ab hier nur gespeicherter Stand ------------------------------------------------
    const geladen = await maengelLaden(u.speicher, projekt.id);
    if (!geladen.ok) throw new Error('laden');
    const maengel: readonly Mangel[] = geladen.wert;
    expect(maengel).toHaveLength(f.maengel.length);
    expect(naechsteMangelnummer(maengel)).toBe(f.sollwerte.naechsteMangelnummer);
    for (const s of f.sollwerte.status)
      expect(mangelstatus(maengel.find((m) => m.nummer === s.nummer) as Mangel)).toBe(s.status);
    // die Verläufe sind die der Fixture (Status und Datum je Eintrag)
    for (const m of f.maengel) {
      const g = maengel.find((x) => x.nummer === m.nummer);
      expect(g?.verlauf.map((v) => [v.status, v.datum])).toEqual(m.verlauf.map((v) => [v.status, v.datum]));
      expect(g?.frist).toBe(m.frist);
    }

    // --- Fristprüfung zum Stichtag: genau Mangel 3 ---------------------------------------------------------------------
    const befunde = fristPruefen(maengel, stichtag);
    const soll = f.sollwerte.fristpruefung.ueberfaellig;
    expect(befunde).toHaveLength(soll.length);
    expect(befunde.map((b) => (maengel.find((m) => m.id === b.ort.mangelId) as Mangel).nummer)).toEqual(
      soll.map((s) => s.nummer),
    );
    expect(soll.map((s) => s.nummer)).toEqual([3]);
    // Mangel 5: Frist am Stichtag ist nicht überfällig (Fixture `fristAmStichtag`)
    for (const m of f.sollwerte.fristpruefung.fristAmStichtag)
      expect(
        befunde.some((b) => (maengel.find((x) => x.id === b.ort.mangelId) as Mangel).nummer === m.nummer),
      ).toBe(false);
    // Gegenprobe: einen Tag später auch Mangel 5
    expect(
      fristPruefen(maengel, f.gegenproben.stichtag20261127.stichtag).map(
        (b) => (maengel.find((m) => m.id === b.ort.mangelId) as Mangel).nummer,
      ),
    ).toEqual(f.gegenproben.stichtag20261127.ueberfaellig);

    // --- Auswertung je Auftragnehmer (der Name aus dem Zuschlag, Bieter A und B) ---------------------------------------
    const auftraege = await auftragsLvsLaden(u.speicher, projekt.id);
    if (!auftraege.ok) throw new Error('Auftrags-LVs');
    const angaben = auftragnehmerAngaben(auftraege.wert.map((z) => z.auftragsLeistungsverzeichnis));
    const namen = namenJeAuftrag(angaben);
    const auswertung = maengelAuswerten(maengel, angaben, stichtag);
    const sollAuswertung = f.sollwerte.auswertungMaengel;
    for (const sz of sollAuswertung.jeAuftragnehmer) {
      const a = X4_AUFTRAEGE.find((x) => x.fixtureAuftragnehmer === sz.auftragnehmer);
      const ist = auswertung.jeAuftragnehmer.find((z) => z.auftragnehmer === a?.bieter);
      expect(ist, sz.auftragnehmer).toMatchObject({
        anzahl: sz.anzahl,
        jeStatus: sz.jeStatus,
        offen: sz.offen,
        ueberfaellig: sz.ueberfaellig,
      });
    }
    expect(auswertung.gesamt).toMatchObject(sollAuswertung.gesamt);

    // --- Bautagebuch: ein Eintrag je Datum, ein zweiter wird abgewiesen ------------------------------------------------
    for (const e of f.bautagebuch) {
      const bestand = await bautagebuchLaden(u.speicher, projekt.id);
      if (!bestand.ok) throw new Error('laden');
      const eintrag: Bautagebucheintrag = { ...e, id: u.ids.bautagebucheintrag(), projektId: projekt.id };
      const entwurf: EintragEntwurf = entwurfAusEintrag(eintrag);
      const r = eintragLesen(entwurf, eintrag.id, projekt.id, bestand.wert);
      if (!r.ok) throw new Error(JSON.stringify(r.fehler));
      expect(r.wert).toEqual(eintrag); // de-DE-Entwurf und zurück gibt den Eintrag der Fixture
      expect(
        (
          await bautagebuchSitzung(u, projekt.id, null).befehl({
            art: 'BautagebucheintragSetzen',
            eintrag: r.wert,
          })
        ).ok,
      ).toBe(true);
    }
    const tage = await bautagebuchLaden(u.speicher, projekt.id);
    if (!tage.ok) throw new Error('laden');
    const erster = f.bautagebuch[0];
    if (erster === undefined) throw new Error('Fixture');
    const doppelt = eintragLesen(
      entwurfAusEintrag({ ...erster, id: u.ids.bautagebucheintrag(), projektId: projekt.id }),
      u.ids.bautagebucheintrag(),
      projekt.id,
      tage.wert,
    );
    expect(doppelt.ok ? null : doppelt.fehler['datum']).toMatch(/gibt es schon einen Eintrag/);
    const direkt = await bautagebuchSitzung(u, projekt.id, null).befehl({
      art: 'BautagebucheintragSetzen',
      eintrag: { ...erster, id: u.ids.bautagebucheintrag(), projektId: projekt.id },
    });
    expect(direkt.ok).toBe(false); // auch der Ausführer weist es ab (Bestand)

    const sb = f.sollwerte.auswertungBautagebuch;
    const tb = bautagebuchAuswerten(tage.wert, sb.von, sb.bis);
    expect(tb.jeTag).toEqual(sb.jeTag);
    expect(tb.jeFirma).toEqual(sb.jeFirma);
    expect(tb.arbeitskraefte).toBe(sb.summe);
    const g = f.gegenproben.bautagebuch17bis19;
    const tg = bautagebuchAuswerten(tage.wert, g.von, g.bis);
    expect(tg.jeFirma).toEqual(g.jeFirma);
    expect(tg.arbeitskraefte).toBe(g.summe);

    // --- PDFs: Mängelliste (genau ein „überfällig“), Mängelanzeige je Auftragnehmer, Bautagebuch -----------------------
    const schriften = schriftenAusDateien();
    const liste = alsText(
      await liesPdf(
        await erzeugeMaengellistePdf(
          {
            projekt: projekt.name,
            maengel: filtern(maengel, KEIN_FILTER, namen),
            befunde,
            auftragnehmer: namen,
            datum: stichtag,
          },
          schriften,
        ),
      ),
    );
    for (const m of f.maengel) expect(liste).toContain(m.titel);
    expect(liste.match(/überfällig/g)).toHaveLength(1);
    expect(liste).toContain('Bieter A');

    const anzeigeA = fuerAnzeige(maengel, namen, 'Bieter A');
    expect(anzeigeA.map((m) => m.nummer)).toEqual([3, 5]); // 1 ist abgenommen
    const textA = alsText(
      await liesPdf(
        await erzeugeMaengelanzeigePdf(
          { projekt: projekt.name, auftragnehmer: 'Bieter A', maengel: anzeigeA, datum: stichtag },
          schriften,
        ),
      ),
    );
    expect(textA).toContain('Riss in der Bodenplatte');
    expect(textA).toContain('Sperrbahn unter der ersten Steinlage fehlt');
    expect(textA).not.toContain('Kiesnest');
    expect(textA).toContain('25.11.2026');
    expect(textA).toContain('26.11.2026');

    // Mangel 2 ist wieder offen: die Frist seiner Anzeige (19.11.) bleibt im Druck (D-66), nicht die neue am Mangel
    const anzeigeB = fuerAnzeige(maengel, namen, 'Bieter B');
    expect(anzeigeB.map((m) => m.nummer)).toEqual([2]);
    const textB = alsText(
      await liesPdf(
        await erzeugeMaengelanzeigePdf(
          { projekt: projekt.name, auftragnehmer: 'Bieter B', maengel: anzeigeB, datum: stichtag },
          schriften,
        ),
      ),
    );
    expect(textB).toContain('Grundleitung mit Gegengefälle');
    expect(textB).toContain('19.11.2026');
    expect(textB).not.toContain('04.12.2026');

    const tagebuch = alsText(
      await liesPdf(
        await erzeugeBautagebuchPdf(
          { projekt: projekt.name, eintraege: tage.wert, von: sb.von, bis: sb.bis, datum: stichtag },
          schriften,
        ),
      ),
    );
    for (const e of f.bautagebuch) expect(tagebuch).toContain(datumDeFx(e.datum));
    expect(tagebuch).not.toContain('Kein Eintrag');
  });
});
