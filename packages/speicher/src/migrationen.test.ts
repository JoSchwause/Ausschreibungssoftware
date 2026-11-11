// SPDX-License-Identifier: AGPL-3.0-or-later
// Migrationen (A8): jede einzeln, mit Schemaabbild je Version. Der Test bleibt gültig, wenn Version 2 dazukommt:
//  - `describe.each(MIGRATIONEN)` prüft jede neue Migration automatisch auf Versionssprung und Zeilenerhalt;
//  - `SCHEMA_ABBILD` hält je Version das Soll-Schema fest. Für eine neue Version kommt ein Eintrag dazu,
//    bestehende Einträge werden nie geändert.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { aktuelleVersion, migriere, MIGRATIONEN, SCHEMA_VERSION, type Migration } from './migrationen';
import { SpeicherKern } from './kern';
import { kanonischesJson } from './kanonisch';
import { normalisiere } from './testhilfe/fixtures';
import { inhaltMitAllenAltenArten, mitKernSummen } from './testhilfe/inhalt-v1';
import { kernAufDb, neueDatenbank, neuerKern, wert, zaehle } from './testhilfe/node';
import { schreibeInSchema1 } from './testhilfe/schema1';
import { aufSchema3 } from './testhilfe/schema3';
import type { Datenbank } from './sql';

/** Soll-Schema je Version: `tabelle: spalte:TYP[!=NOT NULL][*=Schlüssel]` und die Indizes. Nie rückwirkend ändern. */
const SCHEMA_ABBILD: Record<number, { tabellen: string[]; indizes: string }> = {
  1: {
    tabellen: [
      'angebot: id:TEXT!* projekt_id:TEXT! leistungsverzeichnis_id:TEXT! bieter_id:TEXT! nachlass_art:TEXT nachlass_wert:TEXT',
      'angebotsposition: angebot_id:TEXT!* position_id:TEXT!* status:TEXT! einheitspreis:TEXT epa:TEXT',
      'auftrags_lv: id:TEXT!* projekt_id:TEXT! leistungsverzeichnis_id:TEXT! angebot_id:TEXT! name:TEXT! oz_maske:TEXT! mwst_satz:TEXT! nachlass_art:TEXT nachlass_wert:TEXT',
      'bieter: projekt_id:TEXT!* id:TEXT!* name:TEXT! reihenfolge:INTEGER!',
      'knoten: aggregat_id:TEXT!* id:TEXT!* art:TEXT! eltern_id:TEXT! reihenfolge:INTEGER! ordnungszahl:TEXT oz_index:TEXT kurztext:TEXT positionsart:TEXT pauschal:INTEGER bedarf_mit_gesamtbetrag:INTEGER bezugsposition_id:TEXT grundposition_id:TEXT text_json:TEXT menge:TEXT einheit:TEXT einheitspreis:TEXT epa:TEXT',
      'leistungsverzeichnis: id:TEXT!* projekt_id:TEXT! name:TEXT! oz_maske:TEXT! mwst_satz:TEXT! nachlass_art:TEXT nachlass_wert:TEXT',
      'projekt: id:TEXT!* name:TEXT! bauherr_name:TEXT! bauherr_anschrift:TEXT',
      'protokoll: seq:INTEGER* id:TEXT! projekt_id:TEXT! aggregat_art:TEXT! aggregat_id:TEXT! wer:TEXT! wann:TEXT! befehl:TEXT!',
      'summe_gesamt: aggregat_id:TEXT!* netto:TEXT! nachlass:TEXT! netto_nach_nachlass:TEXT! mwst:TEXT! brutto:TEXT!',
      'summe_gliederung: aggregat_id:TEXT!* gliederung_id:TEXT!* summe:TEXT!',
      'summe_position: aggregat_id:TEXT!* position_id:TEXT!* gesamtpreis:TEXT geht_in_summe:INTEGER!',
    ],
    indizes: 'angebot_lv,knoten_eltern,leistungsverzeichnis_projekt,protokoll_projekt',
  },
  2: {
    tabellen: [
      'angebot: id:TEXT!* projekt_id:TEXT! leistungsverzeichnis_id:TEXT! bieter_id:TEXT! nachlass_art:TEXT nachlass_wert:TEXT',
      'angebotsposition: angebot_id:TEXT!* position_id:TEXT!* status:TEXT! einheitspreis:TEXT epa:TEXT zuschlagssatz:TEXT',
      'auftrags_lv: id:TEXT!* projekt_id:TEXT! leistungsverzeichnis_id:TEXT! angebot_id:TEXT! name:TEXT! oz_maske:TEXT! mwst_satz:TEXT! nachlass_art:TEXT nachlass_wert:TEXT auftraggeber:TEXT vergabeinformationen:TEXT',
      'bieter: projekt_id:TEXT!* id:TEXT!* name:TEXT! reihenfolge:INTEGER!',
      'knoten: aggregat_id:TEXT!* id:TEXT!* art:TEXT! eltern_id:TEXT! reihenfolge:INTEGER! ordnungszahl:TEXT oz_index:TEXT kurztext:TEXT merkmale:TEXT zuschlag:TEXT leitbeschreibung:TEXT text_json:TEXT menge:TEXT einheit:TEXT einheitspreis:TEXT epa:TEXT',
      'leistungsverzeichnis: id:TEXT!* projekt_id:TEXT! name:TEXT! oz_maske:TEXT! mwst_satz:TEXT! nachlass_art:TEXT nachlass_wert:TEXT auftraggeber:TEXT vergabeinformationen:TEXT',
      'projekt: id:TEXT!* name:TEXT! bauherr_name:TEXT! bauherr_anschrift:TEXT',
      'protokoll: seq:INTEGER* id:TEXT! projekt_id:TEXT! aggregat_art:TEXT! aggregat_id:TEXT! wer:TEXT! wann:TEXT! befehl:TEXT!',
      'summe_gesamt: aggregat_id:TEXT!* netto:TEXT! nachlass:TEXT! netto_nach_nachlass:TEXT! mwst:TEXT! brutto:TEXT! summe_bedarf_ohne_gb:TEXT summe_wahl:TEXT',
      'summe_gliederung: aggregat_id:TEXT!* gliederung_id:TEXT!* summe:TEXT! summe_bedarf_ohne_gb:TEXT summe_wahl:TEXT',
      'summe_position: aggregat_id:TEXT!* position_id:TEXT!* gesamtpreis:TEXT geht_in_summe:INTEGER!',
    ],
    indizes: 'angebot_lv,knoten_eltern,leistungsverzeichnis_projekt,protokoll_projekt',
  },
  3: {
    tabellen: [
      'angebot: id:TEXT!* projekt_id:TEXT! leistungsverzeichnis_id:TEXT! bieter_id:TEXT! nachlass_art:TEXT nachlass_wert:TEXT',
      'angebotsposition: angebot_id:TEXT!* position_id:TEXT!* status:TEXT! einheitspreis:TEXT epa:TEXT zuschlagssatz:TEXT',
      'auftrags_lv: id:TEXT!* projekt_id:TEXT! leistungsverzeichnis_id:TEXT! angebot_id:TEXT! name:TEXT! oz_maske:TEXT! mwst_satz:TEXT! nachlass_art:TEXT nachlass_wert:TEXT auftraggeber:TEXT vergabeinformationen:TEXT',
      'bieter: projekt_id:TEXT!* id:TEXT!* name:TEXT! reihenfolge:INTEGER!',
      'knoten: aggregat_id:TEXT!* id:TEXT!* art:TEXT! eltern_id:TEXT! reihenfolge:INTEGER! ordnungszahl:TEXT oz_index:TEXT kurztext:TEXT merkmale:TEXT zuschlag:TEXT leitbeschreibung:TEXT text_json:TEXT menge:TEXT einheit:TEXT einheitspreis:TEXT epa:TEXT',
      'leistungsverzeichnis: id:TEXT!* projekt_id:TEXT! name:TEXT! oz_maske:TEXT! mwst_satz:TEXT! nachlass_art:TEXT nachlass_wert:TEXT auftraggeber:TEXT vergabeinformationen:TEXT',
      'lv_stand: seq:INTEGER* id:TEXT! leistungsverzeichnis_id:TEXT! name:TEXT! angelegt:TEXT! zustand:TEXT!',
      'papierkorb_eintrag: leistungsverzeichnis_id:TEXT!* id:TEXT!* nummer:INTEGER! knoten:TEXT!',
      'projekt: id:TEXT!* name:TEXT! bauherr_name:TEXT! bauherr_anschrift:TEXT',
      'protokoll: seq:INTEGER* id:TEXT! projekt_id:TEXT! aggregat_art:TEXT! aggregat_id:TEXT! wer:TEXT! wann:TEXT! befehl:TEXT!',
      'summe_gesamt: aggregat_id:TEXT!* netto:TEXT! nachlass:TEXT! netto_nach_nachlass:TEXT! mwst:TEXT! brutto:TEXT! summe_bedarf_ohne_gb:TEXT summe_wahl:TEXT',
      'summe_gliederung: aggregat_id:TEXT!* gliederung_id:TEXT!* summe:TEXT! summe_bedarf_ohne_gb:TEXT summe_wahl:TEXT',
      'summe_position: aggregat_id:TEXT!* position_id:TEXT!* gesamtpreis:TEXT geht_in_summe:INTEGER!',
    ],
    indizes: 'angebot_lv,knoten_eltern,leistungsverzeichnis_projekt,lv_stand_lv,protokoll_projekt',
  },
  4: {
    tabellen: [
      'angebot: id:TEXT!* projekt_id:TEXT! leistungsverzeichnis_id:TEXT! bieter_id:TEXT! nachlass_art:TEXT nachlass_wert:TEXT',
      'angebotsposition: angebot_id:TEXT!* position_id:TEXT!* status:TEXT! einheitspreis:TEXT epa:TEXT zuschlagssatz:TEXT',
      'auftrags_lv: id:TEXT!* projekt_id:TEXT! leistungsverzeichnis_id:TEXT! angebot_id:TEXT! name:TEXT! oz_maske:TEXT! mwst_satz:TEXT! nachlass_art:TEXT nachlass_wert:TEXT auftraggeber:TEXT vergabeinformationen:TEXT auftragnehmer:TEXT epa_bezeichnungen:TEXT',
      'bieter: projekt_id:TEXT!* id:TEXT!* name:TEXT! reihenfolge:INTEGER!',
      'knoten: aggregat_id:TEXT!* id:TEXT!* art:TEXT! eltern_id:TEXT! reihenfolge:INTEGER! ordnungszahl:TEXT oz_index:TEXT kurztext:TEXT merkmale:TEXT zuschlag:TEXT leitbeschreibung:TEXT text_json:TEXT menge:TEXT einheit:TEXT einheitspreis:TEXT epa:TEXT mengenansatz:TEXT',
      'leistungsverzeichnis: id:TEXT!* projekt_id:TEXT! name:TEXT! oz_maske:TEXT! mwst_satz:TEXT! nachlass_art:TEXT nachlass_wert:TEXT auftraggeber:TEXT vergabeinformationen:TEXT auftragnehmer:TEXT epa_bezeichnungen:TEXT',
      'lv_stand: seq:INTEGER* id:TEXT! leistungsverzeichnis_id:TEXT! name:TEXT! angelegt:TEXT! zustand:TEXT!',
      'papierkorb_eintrag: leistungsverzeichnis_id:TEXT!* id:TEXT!* nummer:INTEGER! knoten:TEXT!',
      'projekt: id:TEXT!* name:TEXT! bauherr_name:TEXT! bauherr_anschrift:TEXT',
      'protokoll: seq:INTEGER* id:TEXT! projekt_id:TEXT! aggregat_art:TEXT! aggregat_id:TEXT! wer:TEXT! wann:TEXT! befehl:TEXT!',
      'summe_gesamt: aggregat_id:TEXT!* netto:TEXT! nachlass:TEXT! netto_nach_nachlass:TEXT! mwst:TEXT! brutto:TEXT! summe_bedarf_ohne_gb:TEXT summe_wahl:TEXT',
      'summe_gliederung: aggregat_id:TEXT!* gliederung_id:TEXT!* summe:TEXT! summe_bedarf_ohne_gb:TEXT summe_wahl:TEXT',
      'summe_position: aggregat_id:TEXT!* position_id:TEXT!* gesamtpreis:TEXT geht_in_summe:INTEGER!',
    ],
    indizes: 'angebot_lv,knoten_eltern,leistungsverzeichnis_projekt,lv_stand_lv,protokoll_projekt',
  },
};

function schemaAbbild(db: Datenbank): { tabellen: string[]; indizes: string } {
  const namen = db
    .zeilen("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .map((z) => String(z['name']));
  const tabellen = namen.map((n) => {
    const spalten = db
      .zeilen(`SELECT name, type, "notnull" AS nn, pk FROM pragma_table_info('${n}') ORDER BY cid`)
      .map(
        (c) =>
          `${String(c['name'])}:${String(c['type'])}${c['nn'] === 1 ? '!' : ''}${c['pk'] === 0 ? '' : '*'}`,
      );
    return `${n}: ${spalten.join(' ')}`;
  });
  const indizes = db
    .zeilen("SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .map((z) => String(z['name']))
    .join(',');
  return { tabellen, indizes };
}

const bis = (version: number): Migration[] => MIGRATIONEN.filter((m) => m.version <= version);

describe('Migrationsreihe', () => {
  it('ist lückenlos ab 1 nummeriert; nur Version 1 hat keine Dateimigration', () => {
    expect(MIGRATIONEN.map((m) => m.version)).toEqual(MIGRATIONEN.map((_, i) => i + 1));
    expect(SCHEMA_VERSION).toBe(MIGRATIONEN.length);
    for (const m of MIGRATIONEN) expect(m.datei === null).toBe(m.version === 1);
  });

  it('eine leere Datenbank wird auf die aktuelle Version gebracht; ein zweiter Lauf ändert nichts', async () => {
    const db = await neueDatenbank();
    expect(aktuelleVersion(db)).toBe(0);
    expect(migriere(db)).toEqual({ ok: true, wert: SCHEMA_VERSION });
    expect(aktuelleVersion(db)).toBe(SCHEMA_VERSION);
    const vorher = schemaAbbild(db);
    expect(migriere(db)).toEqual({ ok: true, wert: SCHEMA_VERSION });
    expect(schemaAbbild(db)).toEqual(vorher);
  });

  it('SpeicherKern.oeffnen schaltet Fremdschlüssel ein', async () => {
    const db = await neueDatenbank();
    expect(SpeicherKern.oeffnen(db).ok).toBe(true);
    expect(db.zeilen('PRAGMA foreign_keys')[0]?.['foreign_keys']).toBe(1);
  });
});

describe.each(MIGRATIONEN)('Migration $version ($name)', (m) => {
  it('hebt die Datenbank genau von Version n-1 auf n und lässt vorhandene Zeilen unberührt', async () => {
    const db = await neueDatenbank();
    expect(migriere(db, bis(m.version - 1)).ok).toBe(true);
    expect(aktuelleVersion(db)).toBe(m.version - 1);
    const tabellenVorher = schemaAbbild(db).tabellen.map((t) => t.split(':')[0] ?? '');
    const zeilenVorher = tabellenVorher.map((t) => zaehle(db, t));

    expect(migriere(db, bis(m.version))).toEqual({ ok: true, wert: m.version });
    expect(aktuelleVersion(db)).toBe(m.version);
    // Nach der Migration gibt es die Tabellen von vorher weiter, mit gleich vielen Zeilen (kein Datenverlust, Q5).
    expect(tabellenVorher.map((t) => zaehle(db, t))).toEqual(zeilenVorher);
  });

  it('erzeugt genau das Soll-Schema dieser Version', async () => {
    const db = await neueDatenbank();
    expect(migriere(db, bis(m.version)).ok).toBe(true);
    const soll = SCHEMA_ABBILD[m.version];
    expect(soll, `SCHEMA_ABBILD fehlt für Version ${String(m.version)}`).toBeDefined();
    expect(schemaAbbild(db)).toEqual(soll);
  });
});

describe('Fehlerfälle', () => {
  const kaputt: Migration = {
    version: 2,
    name: 'Kaputt (Test)',
    hoch: (db) => {
      db.skript('CREATE TABLE halbfertig (x INTEGER)');
      throw new Error('Migration bricht mittendrin ab');
    },
    datei: (roh) => roh,
  };

  it('eine fehlschlagende Migration wird zurückgerollt: Version und Schema bleiben, Fehlerwert migration-fehlgeschlagen', async () => {
    const db = await neueDatenbank();
    expect(migriere(db, bis(1)).ok).toBe(true);
    const vorher = schemaAbbild(db);
    const r = migriere(db, [...bis(1), kaputt]);
    expect(r).toMatchObject({ ok: false, fehler: { code: 'migration-fehlgeschlagen' } });
    expect(aktuelleVersion(db)).toBe(1);
    expect(schemaAbbild(db)).toEqual(vorher);
  });

  it('eine Datenbank mit neuerer Version als bekannt wird nicht angefasst: schema-zu-neu', async () => {
    const db = await neueDatenbank();
    expect(migriere(db, [...bis(1), { ...kaputt, hoch: () => undefined }]).ok).toBe(true);
    expect(aktuelleVersion(db)).toBe(2);
    expect(migriere(db, bis(1))).toMatchObject({ ok: false, fehler: { code: 'schema-zu-neu' } });
    expect(aktuelleVersion(db)).toBe(2);
  });
});

describe('Migration 2 überführt eine Datenbank der Version 1 ohne Verlust (Q5)', () => {
  const inhalt = inhaltMitAllenAltenArten(2);
  const lv = inhalt.leistungsverzeichnisse[0];
  if (lv === undefined) throw new Error('kein LV');

  async function datenbankV1(): Promise<Datenbank> {
    const db = await neueDatenbank();
    db.ausfuehren('PRAGMA foreign_keys = ON');
    expect(migriere(db, bis(1)).ok).toBe(true);
    schreibeInSchema1(db, inhalt);
    return db;
  }

  it('jede alte Positionsart, Angebote, Auftrags-LV und Protokoll: das gelesene Modell ist vorher = nachher', async () => {
    const db = await datenbankV1();
    // Vorher: Die Positionen stehen in der alten Form (eine Positionsart je Zeile).
    const arten = db
      .zeilen("SELECT DISTINCT positionsart FROM knoten WHERE art = 'position' ORDER BY 1")
      .map((z) => z['positionsart']);
    expect(arten).toEqual(['bedarf', 'normal', 'stundenlohn', 'wahl', 'zuschlag']);
    expect(zaehle(db, 'knoten')).toBe(2 * lv.leistungsverzeichnis.knoten.length); // LV und Auftrags-LV

    const kern = kernAufDb(db);
    expect(aktuelleVersion(db)).toBe(SCHEMA_VERSION);
    // Die Daten bleiben; die Summen stehen danach so, wie der Kern sie vollständig rechnet (D-17).
    const soll = mitKernSummen(inhalt);
    expect(wert(kern.lvLaden(lv.leistungsverzeichnis.id))).toEqual(
      normalisiere(soll.leistungsverzeichnisse[0] ?? lv),
    );
    for (const a of soll.angebote) expect(wert(kern.angebotLaden(a.angebot.id))).toEqual(normalisiere(a));
    expect(wert(kern.projektLaden(inhalt.projekt.id))).toEqual(inhalt.projekt);
    expect(wert(kern.protokoll(inhalt.projekt.id))).toEqual(inhalt.protokoll);

    // Ganzer Stand einschließlich Auftrags-LV: Export der migrierten Datenbank = Export nach Import des Modells.
    const frisch = await neuerKern();
    wert(frisch.kern.projektdateiImportieren(kanonischesJson(soll)));
    expect(wert(kern.projektdateiExportieren(inhalt.projekt.id))).toBe(
      wert(frisch.kern.projektdateiExportieren(inhalt.projekt.id)),
    );
  });

  it('erfindet nichts: kein Zuschlagssatz, keine Gruppe/Variante, keine Teilmenge, kein Kennzeichen', async () => {
    const db = await datenbankV1();
    expect(migriere(db).ok).toBe(true);
    const zeilen = db.zeilen(
      "SELECT id, merkmale, zuschlag, leitbeschreibung FROM knoten WHERE id LIKE 'v1-%' ORDER BY aggregat_id, id",
    );
    const ohne = '"wahl":null,"zuschlagskennzeichen":false}';
    const erwartet = [
      ['v1-bedarf-mit', `{"bedarf":"mit-gesamtbetrag","pauschal":false,"stundenlohn":false,${ohne}`, null],
      ['v1-pauschal', `{"bedarf":null,"pauschal":true,"stundenlohn":false,${ohne}`, null],
      ['v1-stundenlohn', `{"bedarf":null,"pauschal":false,"stundenlohn":true,${ohne}`, null],
      [
        'v1-wahl-ohne-grund',
        '{"bedarf":null,"pauschal":false,"stundenlohn":false,"wahl":{"grundpositionId":null,"gruppe":null,"variante":null},"zuschlagskennzeichen":false}',
        null,
      ],
      [
        'v1-zuschlag-ohne-bezug',
        `{"bedarf":null,"pauschal":false,"stundenlohn":false,${ohne}`,
        '{"bezug":{"art":"positionen","positionen":[]},"prozentsatz":null}',
      ],
    ].map(([id, merkmale, zuschlag]) => ({ id, merkmale, zuschlag, leitbeschreibung: null }));
    expect(zeilen).toEqual([...erwartet, ...erwartet]); // LV und Auftrags-LV
    // Die neuen Spalten der übrigen Tabellen sind NULL (fehlt).
    for (const [t, s] of [
      ['leistungsverzeichnis', 'auftraggeber'],
      ['auftrags_lv', 'vergabeinformationen'],
      ['angebotsposition', 'zuschlagssatz'],
    ] as const) {
      expect(zaehle(db, `${t} WHERE ${s} IS NOT NULL`), `${t}.${s}`).toBe(0);
    }
    // Die Ausweise erfindet die Migration nicht, sie rechnet sie mit dem Kern aus den Daten (D-17): überall gesetzt.
    for (const [t, s] of [
      ['summe_gesamt', 'summe_wahl'],
      ['summe_gesamt', 'summe_bedarf_ohne_gb'],
      ['summe_gliederung', 'summe_wahl'],
      ['summe_gliederung', 'summe_bedarf_ohne_gb'],
    ] as const) {
      expect(zaehle(db, `${t} WHERE ${s} IS NULL`), `${t}.${s}`).toBe(0);
    }
  });
});

describe('Migration 3 überführt eine Datenbank der Version 2 ohne Verlust (Q5)', () => {
  it('Datenbank der Version 2 mit Inhalt: Modell und Projektdatei bleiben gleich, Papierkorb und Stände leer', async () => {
    const inhalt = inhaltMitAllenAltenArten(3);
    const lv = inhalt.leistungsverzeichnisse[0];
    if (lv === undefined) throw new Error('kein LV');
    const db = await neueDatenbank();
    db.ausfuehren('PRAGMA foreign_keys = ON');
    expect(migriere(db, bis(1)).ok).toBe(true);
    schreibeInSchema1(db, inhalt);
    expect(migriere(db, bis(2)).ok).toBe(true);
    const zeilenV2 = ['knoten', 'angebotsposition', 'protokoll'].map((t) => zaehle(db, t));

    const kern = kernAufDb(db, bis(3));
    expect(aktuelleVersion(db)).toBe(3);
    expect(['knoten', 'angebotsposition', 'protokoll'].map((t) => zaehle(db, t))).toEqual(zeilenV2);
    expect(zaehle(db, 'papierkorb_eintrag') + zaehle(db, 'lv_stand')).toBe(0);
    // Die Summen hat schon Migration 2 mit dem Kern neu gerechnet (D-17).
    const soll = mitKernSummen(inhalt);
    expect(wert(kern.lvLaden(lv.leistungsverzeichnis.id))).toEqual(
      normalisiere(soll.leistungsverzeichnisse[0] ?? lv),
    );
    expect(wert(kern.lvStaendeAuflisten(lv.leistungsverzeichnis.id))).toEqual([]);
    // Seit Version 4 exportiert die frische Datenbank eine höhere Schemaversion; sonst ist die Datei gleich.
    const frisch = await neuerKern();
    wert(frisch.kern.projektdateiImportieren(kanonischesJson(soll)));
    const neu = JSON.parse(wert(frisch.kern.projektdateiExportieren(inhalt.projekt.id))) as object;
    expect(wert(kern.projektdateiExportieren(inhalt.projekt.id))).toBe(
      kanonischesJson({ ...neu, schemaVersion: 3 }),
    );
  });

  it('Dateimigration 2 → 3 lässt den Inhalt gleich und weist die neuen Felder in einer Datei der Version 2 ab', () => {
    const m = MIGRATIONEN.find((x) => x.version === 3);
    const datei = m?.datei;
    if (datei == null) throw new Error('keine Dateimigration 3');
    const roh = { schemaVersion: 2, leistungsverzeichnisse: [{ summen: 1 }], protokoll: [] };
    expect(datei(roh)).toEqual(roh);
    expect(() => datei({ ...roh, lvStaende: [] })).toThrow(/lvStaende/);
    expect(() => datei({ ...roh, leistungsverzeichnisse: [{ papierkorb: [] }] })).toThrow(/papierkorb/);
  });
});

describe('Migration 4 überführt eine Datenbank der Version 3 ohne Verlust (Q5)', () => {
  const v3 = readFileSync(new URL('../fixtures/projektdatei-v3.json', import.meta.url), 'utf8');

  it('Datenbank der Version 3 mit Inhalt: Modell und Projektdatei bleiben gleich, die neuen Spalten sind NULL', async () => {
    // Eine Datenbank der Version 3 nachgestellt: die Datei importiert, dann die Spalten von Version 4 entfernt.
    const db = await neueDatenbank();
    const projekt = wert(kernAufDb(db).projektdateiImportieren(v3));
    aufSchema3(db);
    expect(schemaAbbild(db)).toEqual(SCHEMA_ABBILD[3]);
    const alt = kernAufDb(db, bis(3));
    const lvs = wert(alt.lvAuflisten(projekt));
    const vorher = lvs.map((l) => wert(alt.lvLaden(l.id)));
    const tabellen = ['knoten', 'angebotsposition', 'protokoll', 'papierkorb_eintrag', 'lv_stand'];
    const zeilenV3 = tabellen.map((t) => zaehle(db, t));

    const kern = kernAufDb(db);
    expect(aktuelleVersion(db)).toBe(4);
    expect(tabellen.map((t) => zaehle(db, t))).toEqual(zeilenV3);
    expect(lvs.map((l) => wert(kern.lvLaden(l.id)))).toEqual(vorher);
    for (const [t, s] of [
      ['leistungsverzeichnis', 'auftragnehmer'],
      ['leistungsverzeichnis', 'epa_bezeichnungen'],
      ['auftrags_lv', 'auftragnehmer'],
      ['auftrags_lv', 'epa_bezeichnungen'],
      ['knoten', 'mengenansatz'],
    ] as const) {
      expect(zaehle(db, `${t} WHERE ${s} IS NOT NULL`), `${t}.${s}`).toBe(0);
    }
    // Ganzer Stand: Export der migrierten Datenbank = Export nach Import der Datei der Version 3 (Dateimigration).
    const frisch = await neuerKern();
    wert(frisch.kern.projektdateiImportieren(v3));
    expect(wert(kern.projektdateiExportieren(projekt))).toBe(
      wert(frisch.kern.projektdateiExportieren(projekt)),
    );
  });

  it('die neue Spalte mengenansatz gibt es nur an Positionen', async () => {
    const db = await neueDatenbank();
    expect(migriere(db).ok).toBe(true);
    db.skript(`INSERT INTO knoten (aggregat_id, id, art, eltern_id, reihenfolge, kurztext, merkmale, text_json,
                 mengenansatz) VALUES ('a', 'p', 'position', 'a', 0, 'k', '{}', '[]', '[]')`);
    expect(() => {
      db.skript(`INSERT INTO knoten (aggregat_id, id, art, eltern_id, reihenfolge, kurztext, mengenansatz)
                 VALUES ('a', 't', 'titel', 'a', 1, 'k', '[]')`);
    }).toThrow(/CHECK/);
  });

  it('Dateimigration 3 → 4 lässt den Inhalt gleich und weist die neuen Felder in einer Datei der Version 3 ab', () => {
    const datei = MIGRATIONEN.find((x) => x.version === 4)?.datei;
    if (datei == null) throw new Error('keine Dateimigration 4');
    const roh = JSON.parse(v3) as Record<string, unknown>;
    expect(datei(roh)).toEqual(roh);
    type Pfad = (string | number)[];
    const mit = (pfad: Pfad, feld: string): Record<string, unknown> => {
      const d = JSON.parse(v3) as Record<string, unknown>;
      let o = d as Record<string | number, unknown>;
      for (const s of pfad) o = o[s] as Record<string | number, unknown>;
      o[feld] = [];
      return d;
    };
    const lv: Pfad = ['leistungsverzeichnisse', 0, 'leistungsverzeichnis'];
    const auftrag: Pfad = ['auftragsLeistungsverzeichnisse', 0, 'auftragsLeistungsverzeichnis'];
    const stand: Pfad = ['lvStaende', 0, 'zustand'];
    for (const [pfad, feld] of [
      [lv, 'auftragnehmer'],
      [lv, 'epaBezeichnungen'],
      [[...lv, 'knoten', 3], 'mengenansatz'],
      [auftrag, 'auftragnehmer'],
      [auftrag, 'epaBezeichnungen'],
      [[...auftrag, 'knoten', 3], 'mengenansatz'],
      [['leistungsverzeichnisse', 0, 'papierkorb', 0, 'knoten', 0], 'mengenansatz'],
      [[...stand, 'leistungsverzeichnis'], 'epaBezeichnungen'],
      [[...stand, 'leistungsverzeichnis', 'knoten', 3], 'mengenansatz'],
      [[...stand, 'papierkorb', 0, 'knoten', 0], 'mengenansatz'],
    ] as [Pfad, string][]) {
      expect(() => datei(mit(pfad, feld)), `${pfad.join('.')}.${feld}`).toThrow(new RegExp(feld));
    }
  });
});
