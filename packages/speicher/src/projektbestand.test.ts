// SPDX-License-Identifier: AGPL-3.0-or-later
// Projekt samt Inhalt löschen (Vertrag v1.7c; E8, D-96; Ticket 161, Lesarten D-160.3 bis D-160.9): Löschen in einer Transaktion
// gegen den gespeicherten Bestand, Undo über den Schreibweg des Einlesens mit denselben Kennungen, `konflikt` und `unbekannt`
// ohne Schreiben; dazu Kurzfassung und Dekoder des Massenbefehls (Ticket 160).

import { createHash } from 'node:crypto';
import type {
  Befehlskurzfassung,
  Projekt,
  Projektbestand,
  ProjektbestandChangeSet,
  Projektdatei,
  ProjektId,
  ProjektSamtInhaltLoeschen,
  Protokolleintrag,
  ProtokollId,
  Rechnung,
  ZahlungId,
  Betrag,
  Kalenderdatum,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { kanonischesJson } from './kanonisch';
import type { SpeicherKern } from './kern';
import { befehlskurzfassung } from './kurzfassung';
import type { Datenbank } from './sql';
import { anlegenSchritte, eintrag, ladeFixture } from './testhilfe/fixtures';
import { V2_PROJEKT } from './testhilfe/inhalt-v2';
import { schritteV7 } from './testhilfe/inhalt-v7';
import { kernAufDb, neuerKern, wert, zaehle } from './testhilfe/node';
import { umkehren } from './testhilfe/umkehrung';

const winzig = ladeFixture('winzig');
const befehl: ProjektSamtInhaltLoeschen = { art: 'ProjektSamtInhaltLoeschen' };
const AM_PROJEKT = { art: 'projekt', id: V2_PROJEKT } as const;
const LOESCHEN = 'protokoll-loeschen' as ProtokollId;

/** Die Tabellen, die einem Projekt gehören (alles außer Modell-Bytes, Einstellungen und deren Protokoll). */
function projekttabellen(db: Datenbank): string[] {
  return db
    .zeilen("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .map((z) => String(z['name']))
    .filter((n) => !['modelldatei', 'einstellungen', 'einstellungen_protokoll'].includes(n));
}

/** Das Beispielprojekt aus Version 7 (alle Aggregatarten, Stände, Modelle, Einstellungen) und eine Zahlung an der freigegebenen Rechnung. */
async function beispielprojekt(): Promise<{ kern: SpeicherKern; db: Datenbank; schritte: number }> {
  const { kern, db } = await neuerKern();
  const schritte = await schritteV7(kern);
  const d = JSON.parse(wert(kern.projektdateiExportieren(V2_PROJEKT))) as Projektdatei;
  const frei = d.rechnungen?.map((z) => z.rechnung).find((r) => r.freigabe !== null);
  if (frei === undefined) throw new Error('keine freigegebene Rechnung im Beispiel');
  const mitZahlung: Rechnung = {
    ...frei,
    zahlungen: [
      { id: 'zahlung-1' as ZahlungId, datum: '2026-11-14' as Kalenderdatum, betrag: '100.00' as Betrag },
    ],
  };
  const zahlung = mitZahlung.zahlungen?.[0];
  if (zahlung === undefined) throw new Error('keine Zahlung');
  const e = eintrag(900, V2_PROJEKT, { art: 'rechnung', id: frei.id }, { art: 'ZahlungErfassen', zahlung });
  wert(
    await kern.anwenden(e, {
      art: 'rechnung',
      rechnungId: frei.id,
      rechnung: { vorher: frei, nachher: mitZahlung },
    }),
  );
  return { kern, db, schritte: schritte.length + 1 };
}

/** Der Bestand aus der exportierten Projektdatei, wie die App ihn liest (D-160.4): ohne die vier ausgelassenen Felder. */
function bestandAus(datei: string): { projekt: Projekt; bestand: Projektbestand } {
  const d = JSON.parse(datei) as Projektdatei;
  const weg = ['schemaVersion', 'projekt', 'modelldateien', 'einstellungen'];
  const bestand = Object.fromEntries(
    Object.entries(d).filter(([k]) => !weg.includes(k)),
  ) as unknown as Projektbestand;
  return { projekt: d.projekt, bestand };
}

const loeschChangeSet = (projekt: Projekt, bestand: Projektbestand): ProjektbestandChangeSet => ({
  art: 'projektbestand',
  projektId: projekt.id,
  projekt: { vorher: projekt, nachher: null },
  bestand: { vorher: bestand, nachher: null },
});

const loeschEintrag = (projektId: ProjektId = V2_PROJEKT): Protokolleintrag => ({
  ...eintrag(1000, projektId, { art: 'projekt', id: projektId }, befehl),
  id: LOESCHEN,
});

const undoEintrag = (protokollId: ProtokollId = LOESCHEN): Protokolleintrag => ({
  ...eintrag(1001, V2_PROJEKT, AM_PROJEKT, { art: 'Rueckgaengig', protokollId }),
  id: 'protokoll-undo' as ProtokollId,
});

const code = (r: { ok: boolean; fehler?: { code: string } }): string | null =>
  r.ok ? null : (r.fehler?.code ?? '');

/** Alle Zeilen aller Tabellen (außer der internen) als Text: „nichts geschrieben“ heißt, dieser Text bleibt gleich. */
function abbild(db: Datenbank): string {
  return db
    .zeilen("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .map((z) => String(z['name']))
    .map((t) => `${t}:${String(zaehle(db, t))}`)
    .join(',');
}

describe('Projekt samt Inhalt löschen (Vertrag v1.7c, D-96)', () => {
  it('Pflichttest: Beispielprojekt → löschen → Undo → Export byte-gleich bis auf den letzten Eintrag „Rueckgaengig“ (D-102)', async () => {
    const { kern, db } = await beispielprojekt();
    const vorher = wert(kern.projektdateiExportieren(V2_PROJEKT));
    const d = JSON.parse(vorher) as Projektdatei;
    // Das Beispiel trägt jede Art, auch Stände, Modelle samt Bytes, Rechnungen mit Zahlungen und die Einstellungen.
    for (const feld of [
      'leistungsverzeichnisse',
      'angebote',
      'auftragsLeistungsverzeichnisse',
      'lvStaende',
      'aufmasse',
      'rechnungen',
      'kostenermittlungen',
      'bauwerksmodelle',
      'modelldateien',
      'bauzeitenplaene',
      'honorarberechnungen',
      'maengel',
      'bautagebuch',
    ] as const)
      expect(d[feld]?.length, feld).toBeGreaterThan(0);
    expect(d.rechnungen?.some((z) => (z.rechnung.zahlungen?.length ?? 0) > 0)).toBe(true);
    expect(d.einstellungen).toBeDefined();
    const einstellungenVorher = wert(kern.einstellungenLaden());
    const einstellungsprotokoll = zaehle(db, 'einstellungen_protokoll');

    const { projekt, bestand } = bestandAus(vorher);
    const cs = loeschChangeSet(projekt, bestand);
    wert(await kern.anwenden(loeschEintrag(), cs));

    // Alles gelöscht, in jeder Tabelle des Projekts; der Eintrag des Löschens bleibt nicht stehen (D-160.5).
    for (const t of projekttabellen(db)) expect(zaehle(db, t), t).toBe(0);
    expect(code(kern.projektLaden(V2_PROJEKT))).toBe('nicht-gefunden');
    // Einstellungen bleiben; die Bytes der Modelle bleiben bis zum nächsten Öffnen (D-160.7).
    expect(wert(kern.einstellungenLaden())).toEqual(einstellungenVorher);
    expect(zaehle(db, 'einstellungen_protokoll')).toBe(einstellungsprotokoll);
    for (const m of d.modelldateien ?? []) expect(wert(kern.modelldateiVorhanden(m.hash))).toBe(true);

    wert(await kern.anwenden(undoEintrag(), umkehren(cs)));
    const nachher = JSON.parse(wert(kern.projektdateiExportieren(V2_PROJEKT))) as Projektdatei;
    const letzter = nachher.protokoll[nachher.protokoll.length - 1];
    expect(letzter).toEqual({
      id: 'protokoll-undo',
      projektId: V2_PROJEKT,
      aggregat: AM_PROJEKT,
      wer: undoEintrag().wer,
      wann: undoEintrag().wann,
      befehl: { art: 'Rueckgaengig', protokollId: LOESCHEN },
    });
    const ohneUndo = kanonischesJson({ ...nachher, protokoll: nachher.protokoll.slice(0, -1) });
    expect(ohneUndo === vorher).toBe(true);
  });

  it('löschen → Undo → Wiederholen mit demselben ChangeSet: wieder gelöscht, kein konflikt (D-104); Undo stellt erneut her', async () => {
    const { kern, db } = await beispielprojekt();
    const vorher = wert(kern.projektdateiExportieren(V2_PROJEKT));
    const { projekt, bestand } = bestandAus(vorher);
    const cs = loeschChangeSet(projekt, bestand);
    wert(await kern.anwenden(loeschEintrag(), cs));
    wert(await kern.anwenden(undoEintrag(), umkehren(cs)));
    // Das gespeicherte Protokoll trägt jetzt den Eintrag „Rueckgaengig“ hinter dem des Bestands: erlaubt, er geht mit.
    const w: Protokolleintrag = {
      ...eintrag(1002, V2_PROJEKT, AM_PROJEKT, { art: 'Wiederholen', protokollId: LOESCHEN }),
      id: 'protokoll-wieder' as ProtokollId,
    };
    wert(await kern.anwenden(w, cs));
    for (const t of projekttabellen(db)) expect(zaehle(db, t), t).toBe(0);
    const zweites: Protokolleintrag = { ...undoEintrag(), id: 'protokoll-undo-2' as ProtokollId };
    wert(await kern.anwenden(zweites, umkehren(cs)));
    const ende = JSON.parse(wert(kern.projektdateiExportieren(V2_PROJEKT))) as Projektdatei;
    expect(ende.protokoll.at(-1)?.id).toBe('protokoll-undo-2');
    expect(kanonischesJson({ ...ende, protokoll: ende.protokoll.slice(0, -1) }) === vorher).toBe(true);
  });

  it('ein anderes Projekt im Speicher bleibt unberührt', async () => {
    const { kern } = await beispielprojekt();
    for (const s of anlegenSchritte(winzig))
      wert(await kern.anwenden({ ...s.eintrag, id: `w-${s.eintrag.id}` as ProtokollId }, s.changeSet));
    const anderes = wert(kern.projektdateiExportieren(winzig.projekt.id));
    const { projekt, bestand } = bestandAus(wert(kern.projektdateiExportieren(V2_PROJEKT)));
    wert(await kern.anwenden(loeschEintrag(), loeschChangeSet(projekt, bestand)));
    expect(wert(kern.projektdateiExportieren(winzig.projekt.id))).toBe(anderes);
    expect(wert(kern.projekteAuflisten()).map((p) => p.id)).toEqual([winzig.projekt.id]);
  });

  describe('konflikt beim Löschen: der Bestand ist nicht der gespeicherte; nichts geschrieben (D-160.5)', () => {
    const faelle: [string, (p: Projekt, b: Projektbestand) => [Projekt, Projektbestand]][] = [
      ['ein LV fehlt', (p, b) => [p, { ...b, leistungsverzeichnisse: b.leistungsverzeichnisse.slice(1) }]],
      ['ein Mangel fehlt', (p, b) => [p, { ...b, maengel: (b.maengel ?? []).slice(1) }]],
      ['der erste Protokolleintrag fehlt', (p, b) => [p, { ...b, protokoll: b.protokoll.slice(1) }]],
      [
        'ein Protokolleintrag zu viel',
        (p, b) => [p, { ...b, protokoll: [...b.protokoll, b.protokoll[0]] } as Projektbestand],
      ],
      [
        'die Stände fehlen',
        (p, b) => {
          const ohne = { ...b };
          Reflect.deleteProperty(ohne, 'lvStaende');
          return [p, ohne];
        },
      ],
      ['das Projekt weicht ab', (p, b) => [{ ...p, name: `${p.name} (alt)` }, b]],
    ];
    it.each(faelle)('%s', async (_, aendern) => {
      const { kern, db } = await beispielprojekt();
      const vorher = wert(kern.projektdateiExportieren(V2_PROJEKT));
      const roh = bestandAus(vorher);
      const [p, b] = aendern(roh.projekt, JSON.parse(JSON.stringify(roh.bestand)) as Projektbestand);
      const bild = abbild(db);
      const r = await kern.anwenden(loeschEintrag(), loeschChangeSet(p, b));
      expect(code(r)).toBe('konflikt');
      expect(abbild(db)).toBe(bild);
      expect(wert(kern.projektdateiExportieren(V2_PROJEKT))).toBe(vorher);
    });

    it('ein Projekt, das es nicht gibt: nicht-gefunden', async () => {
      const { kern } = await beispielprojekt();
      const { projekt, bestand } = bestandAus(wert(kern.projektdateiExportieren(V2_PROJEKT)));
      const fremd = { ...projekt, id: 'projekt-fremd' as ProjektId };
      const r = await kern.anwenden(loeschEintrag(fremd.id), loeschChangeSet(fremd, bestand));
      expect(code(r)).toBe('nicht-gefunden');
    });
  });

  describe('konflikt beim Undo; nichts geschrieben (D-160.6, Q5)', () => {
    async function geloescht(): Promise<{
      kern: SpeicherKern;
      db: Datenbank;
      vorher: string;
      cs: ProjektbestandChangeSet;
    }> {
      const { kern, db } = await beispielprojekt();
      const vorher = wert(kern.projektdateiExportieren(V2_PROJEKT));
      const { projekt, bestand } = bestandAus(vorher);
      const cs = loeschChangeSet(projekt, bestand);
      wert(await kern.anwenden(loeschEintrag(), cs));
      return { kern, db, vorher, cs };
    }

    it('das Projekt besteht schon (die Sicherung wurde eingelesen)', async () => {
      const { kern, db, vorher, cs } = await geloescht();
      wert(await kern.projektdateiImportieren(vorher));
      const bild = abbild(db);
      expect(code(await kern.anwenden(undoEintrag(), umkehren(cs)))).toBe('konflikt');
      expect(abbild(db)).toBe(bild);
      expect(wert(kern.projektdateiExportieren(V2_PROJEKT))).toBe(vorher);
    });

    it('eine Kennung des Bestands besteht schon (in einem anderen Projekt)', async () => {
      const { kern, db, vorher, cs } = await geloescht();
      const umbenannt = vorher.replaceAll(`"${V2_PROJEKT}"`, '"projekt-anders"');
      wert(await kern.projektdateiImportieren(umbenannt));
      const bild = abbild(db);
      expect(code(await kern.anwenden(undoEintrag(), umkehren(cs)))).toBe('konflikt');
      expect(abbild(db)).toBe(bild);
      expect(code(kern.projektLaden(V2_PROJEKT))).toBe('nicht-gefunden');
    });

    it('die Bytes einer genannten Modelldatei fehlen (nach dem nächsten Öffnen freigegeben, D-160.7)', async () => {
      const { db, cs } = await geloescht();
      const neu = kernAufDb(db);
      expect(zaehle(db, 'modelldatei')).toBe(0);
      const bild = abbild(db);
      expect(code(await neu.anwenden(undoEintrag(), umkehren(cs)))).toBe('konflikt');
      expect(abbild(db)).toBe(bild);
    });
  });

  describe('andere Formen: unbekannt, nichts geschrieben (D-160.3)', () => {
    it.each<[string, (cs: ProjektbestandChangeSet) => ProjektbestandChangeSet]>([
      ['beide Seiten gesetzt', (cs) => ({ ...cs, projekt: { ...cs.projekt, nachher: cs.projekt.vorher } })],
      [
        'Bestand beidseitig gesetzt',
        (cs) => ({ ...cs, bestand: { vorher: cs.bestand.vorher, nachher: cs.bestand.vorher } }),
      ],
      [
        'null auf verschiedenen Seiten',
        (cs) => ({ ...cs, bestand: { vorher: null, nachher: cs.bestand.vorher } }),
      ],
      ['projektId nicht die des Projekts', (cs) => ({ ...cs, projektId: 'projekt-x' as ProjektId })],
    ])('%s', async (_, aendern) => {
      const { kern, db } = await beispielprojekt();
      const { projekt, bestand } = bestandAus(wert(kern.projektdateiExportieren(V2_PROJEKT)));
      const bild = abbild(db);
      const r = await kern.anwenden(loeschEintrag(), aendern(loeschChangeSet(projekt, bestand)));
      expect(code(r)).toBe('unbekannt');
      expect(abbild(db)).toBe(bild);
    });

    it('der Eintrag nennt ein anderes Aggregat als das Projekt', async () => {
      const { kern, db } = await beispielprojekt();
      const { projekt, bestand } = bestandAus(wert(kern.projektdateiExportieren(V2_PROJEKT)));
      const bild = abbild(db);
      const e = {
        ...loeschEintrag(),
        aggregat: { art: 'leistungsverzeichnis', id: 'lv' },
      } as Protokolleintrag;
      expect(code(await kern.anwenden(e, loeschChangeSet(projekt, bestand)))).toBe('unbekannt');
      expect(abbild(db)).toBe(bild);
    });
  });

  it('der Dekoder liest die Kurzfassung nur mit `art` im Kopf', async () => {
    const a = await neuerKern();
    for (const s of anlegenSchritte(winzig)) wert(await a.kern.anwenden(s.eintrag, s.changeSet));
    const d = JSON.parse(wert(a.kern.projektdateiExportieren(winzig.projekt.id))) as { protokoll: unknown[] };
    const mitKopf = async (kopf: object): Promise<boolean> => {
      const kurz = { ...(await befehlskurzfassung(befehl)), kopf } as Befehlskurzfassung;
      const e = eintrag(99, winzig.projekt.id, { art: 'projekt', id: winzig.projekt.id }, kurz);
      const { kern } = await neuerKern();
      const r = await kern.projektdateiImportieren(JSON.stringify({ ...d, protokoll: [...d.protokoll, e] }));
      return r.ok;
    };
    expect(await mitKopf({ art: 'ProjektSamtInhaltLoeschen' })).toBe(true);
    expect(await mitKopf({ art: 'ProjektSamtInhaltLoeschen', bestand: {} })).toBe(false);
  });

  it('die Kurzfassung trägt den ganzen Befehl als Kopf und die SHA-256 über ihn', async () => {
    const kurz = await befehlskurzfassung(befehl);
    expect(kurz.kopf).toEqual({ art: 'ProjektSamtInhaltLoeschen' });
    expect(kurz.pruefsumme).toEqual({
      algorithmus: 'sha-256',
      wert: createHash('sha256').update(kanonischesJson(befehl), 'utf8').digest('hex'),
    });
  });
});
