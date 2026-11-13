// SPDX-License-Identifier: AGPL-3.0-or-later
// Projektdatei als Kopie einlesen (v1.7a, Ticket 139; E8, D-127.10, D-82 S10): neue Kennungen für das Projekt und jedes
// Aggregat, alle Verweise umgeschrieben, auch in eingefrorenen LV-Ständen; das Protokoll kommt nicht mit, Modelldateien werden
// geteilt. Geprüft an der eingefrorenen Datei der Version 6, die jede Aggregatart und jede Art von Verweis trägt.

import { readFileSync } from 'node:fs';
import type { Projektdatei, Speicher } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { direktTransport, speicherUeberTransport, type Transport } from './client';
import type { SpeicherKern } from './kern';
import { SCHEMA_VERSION } from './migrationen';
import { neuerKern, wert } from './testhilfe/node';
import { zaehlendeIds } from './testhilfe/v17';

const v6 = readFileSync(new URL('../fixtures/projektdatei-v6.json', import.meta.url), 'utf8');
const original = JSON.parse(v6) as Projektdatei;

/**
 * Die Kennungen, die `speicher` global schlüsselt, je Art (benannt wie die Methode der `IdQuelle`) in der Reihenfolge der Datei;
 * unabhängig von `kopie.ts` aufgezählt.
 */
function kennungenJeArt(d: Projektdatei): Record<string, string[]> {
  return {
    projekt: [d.projekt.id],
    leistungsverzeichnis: d.leistungsverzeichnisse.map((z) => z.leistungsverzeichnis.id),
    lvStand: (d.lvStaende ?? []).map((s) => s.id),
    angebot: d.angebote.map((z) => z.angebot.id),
    auftragsLeistungsverzeichnis: d.auftragsLeistungsverzeichnisse.map(
      (z) => z.auftragsLeistungsverzeichnis.id,
    ),
    aufmass: (d.aufmasse ?? []).map((z) => z.aufmass.id),
    rechnung: (d.rechnungen ?? []).map((z) => z.rechnung.id),
    kostenermittlung: (d.kostenermittlungen ?? []).map((z) => z.kostenermittlung.id),
    bauwerksmodell: (d.bauwerksmodelle ?? []).map((z) => z.bauwerksmodell.id),
    bauzeitenplan: (d.bauzeitenplaene ?? []).map((z) => z.bauzeitenplan.id),
    honorarberechnung: (d.honorarberechnungen ?? []).map((z) => z.honorarberechnung.id),
    mangel: (d.maengel ?? []).map((z) => z.mangel.id),
    bautagebucheintrag: (d.bautagebuch ?? []).map((z) => z.bautagebucheintrag.id),
  };
}

const globaleKennungen = (d: Projektdatei): string[] => Object.values(kennungenJeArt(d)).flat();

/** Alle Zeichenketten eines JSON-Werts (Werte, nicht Schlüssel). */
function zeichenketten(x: unknown): string[] {
  if (typeof x === 'string') return [x];
  if (Array.isArray(x)) return x.flatMap(zeichenketten);
  if (typeof x === 'object' && x !== null) return Object.values(x).flatMap(zeichenketten);
  return [];
}

/**
 * Wie der Worker: Jede Anfrage geht als strukturierter Klon über die Grenze (`postMessage`). Eine `IdQuelle` (Funktionen) käme
 * nicht hinüber (`DataCloneError`).
 */
const ueberGrenze =
  (t: Transport): Transport =>
  (methode, args) =>
    t(methode, structuredClone(args));

async function speicherMitOriginal(): Promise<{ kern: SpeicherKern; s: Speicher }> {
  const { kern } = await neuerKern();
  const s = speicherUeberTransport(ueberGrenze(direktTransport(kern)), null);
  wert(await s.projektdateiImportieren(v6));
  return { kern, s };
}

function einlesen(s: Speicher, ...args: Parameters<NonNullable<Speicher['projektdateiEinlesen']>>) {
  if (s.projektdateiEinlesen === undefined) throw new Error('projektdateiEinlesen fehlt');
  return s.projektdateiEinlesen(...args);
}

describe('Projektdatei als Kopie einlesen (D-127.10)', () => {
  it('neben dem Original: neue Kennungen für Projekt und jedes Aggregat, Name aus den Optionen, leeres Protokoll', async () => {
    const { kern, s } = await speicherMitOriginal();
    const ids = zaehlendeIds('kopie');
    const name = `${original.projekt.name} (Kopie)`;
    const r = wert(await einlesen(s, v6, { alsKopie: { ids, name } }));
    expect(r.projektId).not.toBe(original.projekt.id);
    expect(r.einstellungen).toBeNull();
    // Genau eine neue Kennung je global geschlüsselter Kennung der Datei, keine mehr.
    expect(ids.gezogen()).toHaveLength(globaleKennungen(original).length);
    expect(r.projektId).toBe(ids.gezogen().find((k) => k.startsWith('kopie-projekt-')));
    expect(
      wert(await s.projekte.auflisten())
        .map((p) => p.name)
        .sort(),
    ).toEqual([original.projekt.name, name].sort());
    expect(wert(await s.protokoll(r.projektId))).toEqual([]);
    // Das Original ist unverändert.
    expect(wert(await s.projektdateiExportieren(original.projekt.id))).toBe(
      wert(kern.projektdateiExportieren(original.projekt.id)),
    );
    const kopie = JSON.parse(wert(await s.projektdateiExportieren(r.projektId))) as Projektdatei;
    expect(globaleKennungen(kopie).sort()).toEqual([...ids.gezogen()].sort());
  });

  it('Verweisprüfung: keine alte Kennung bleibt, auch nicht in eingefrorenen Ständen (S10); die Kopie gleicht dem Original bis auf die Kennungen', async () => {
    const { s } = await speicherMitOriginal();
    const ids = zaehlendeIds('kopie');
    const r = wert(await einlesen(s, v6, { alsKopie: { ids, name: original.projekt.name } }));
    const text = wert(await s.projektdateiExportieren(r.projektId));
    const kopie = JSON.parse(text) as Projektdatei;
    const alt = new Set(globaleKennungen(original));
    expect(zeichenketten({ ...kopie, protokoll: [] }).filter((x) => alt.has(x))).toEqual([]);
    // Zurück auf die alten Kennungen abgebildet ist die Kopie das Original ohne Protokoll. Die i-te Kennung einer Art (in der
    // Reihenfolge der Datei) bekommt die i-te gezogene Kennung dieser Art.
    const zurueck = new Map(
      Object.entries(kennungenJeArt(original)).flatMap(([art, alte]) =>
        ids
          .gezogen()
          .filter((k) => k.startsWith(`kopie-${art}-`))
          .map((k, i): [string, string] => [k, alte[i] ?? '']),
      ),
    );
    expect(zurueck.size).toBe(globaleKennungen(original).length);
    const abbilden = (x: unknown): unknown =>
      typeof x === 'string'
        ? (zurueck.get(x) ?? x)
        : Array.isArray(x)
          ? x.map(abbilden)
          : typeof x === 'object' && x !== null
            ? Object.fromEntries(Object.entries(x).map(([k, w]) => [k, abbilden(w)]))
            : x;
    const gleich = abbilden(kopie) as Projektdatei;
    // Je Liste der Datei als Menge verglichen: Die Listen stehen nach Kennung, und die neuen Kennungen ordnen sich anders.
    const alsMengen = (d: Projektdatei): Record<string, unknown> =>
      Object.fromEntries(
        Object.entries({ ...d, protokoll: [] }).map(([k, w]) => [
          k,
          Array.isArray(w) ? [...(w as unknown[])].map((e) => JSON.stringify(e)).sort() : w,
        ]),
      );
    expect(alsMengen(gleich)).toEqual(alsMengen({ ...original, schemaVersion: SCHEMA_VERSION }));
  });

  it('Verweise im Einzelnen: LV und Stände, Auftrags-LV, Aufmaß, Rechnung, Modell, Honorar, Mangel, Vorgang zeigen in die Kopie', async () => {
    const { s } = await speicherMitOriginal();
    const r = wert(await einlesen(s, v6, { alsKopie: { ids: zaehlendeIds('k'), name: 'Kopie' } }));
    const d = JSON.parse(wert(await s.projektdateiExportieren(r.projektId))) as Projektdatei;
    const lvs = new Set(d.leistungsverzeichnisse.map((z) => z.leistungsverzeichnis.id as string));
    const auftraege = new Set(
      d.auftragsLeistungsverzeichnisse.map((z) => z.auftragsLeistungsverzeichnis.id as string),
    );
    const angebote = new Set(d.angebote.map((z) => z.angebot.id as string));
    const aufmasse = new Set((d.aufmasse ?? []).map((z) => z.aufmass.id as string));
    const modelle = new Set((d.bauwerksmodelle ?? []).map((z) => z.bauwerksmodell.id as string));
    const kosten = new Set((d.kostenermittlungen ?? []).map((z) => z.kostenermittlung.id as string));
    for (const z of d.leistungsverzeichnisse) {
      expect(z.leistungsverzeichnis.projektId).toBe(r.projektId);
      const n = z.leistungsverzeichnis.nachtrag;
      if (n !== undefined) expect(auftraege.has(n.auftragsLvId)).toBe(true);
    }
    for (const st of d.lvStaende ?? []) {
      expect(lvs.has(st.leistungsverzeichnisId)).toBe(true);
      expect(st.zustand.leistungsverzeichnis.id).toBe(st.leistungsverzeichnisId);
      expect(st.zustand.leistungsverzeichnis.projektId).toBe(r.projektId);
      const n = st.zustand.leistungsverzeichnis.nachtrag;
      if (n !== undefined) expect(auftraege.has(n.auftragsLvId)).toBe(true);
    }
    for (const z of d.angebote) expect(lvs.has(z.angebot.leistungsverzeichnisId)).toBe(true);
    for (const z of d.auftragsLeistungsverzeichnisse) {
      expect(lvs.has(z.auftragsLeistungsverzeichnis.leistungsverzeichnisId)).toBe(true);
      expect(angebote.has(z.auftragsLeistungsverzeichnis.angebotId)).toBe(true);
    }
    for (const z of d.aufmasse ?? []) expect(auftraege.has(z.aufmass.auftragsLvId)).toBe(true);
    for (const z of d.rechnungen ?? []) {
      expect(auftraege.has(z.rechnung.auftragsLvId)).toBe(true);
      for (const a of z.rechnung.aufmassIds) expect(aufmasse.has(a)).toBe(true);
    }
    const vorgaenger = (d.bauwerksmodelle ?? [])
      .map((z) => z.bauwerksmodell.vorgaengerId)
      .filter((v) => v !== null);
    expect(vorgaenger.length).toBeGreaterThan(0);
    for (const v of vorgaenger) expect(modelle.has(v)).toBe(true);
    const honorarVerweise = zeichenketten(d.honorarberechnungen).filter((x) =>
      x.startsWith('k-kostenermittlung-'),
    );
    expect(honorarVerweise.length).toBeGreaterThan(0);
    for (const k of honorarVerweise) expect(kosten.has(k)).toBe(true);
    const maengel = (d.maengel ?? []).map((z) => z.mangel);
    expect(maengel.some((m) => m.auftragsLvId != null && auftraege.has(m.auftragsLvId))).toBe(true);
    expect(maengel.some((m) => modelle.has(String(m.bauteil?.bauwerksmodellId)))).toBe(true);
    const bezuege = zeichenketten(d.bauzeitenplaene).filter((x) => x.startsWith('k-'));
    expect(bezuege.length).toBeGreaterThan(0);
  });

  it('Modelldateien werden geteilt, nicht doppelt abgelegt; die Kopie lädt dieselben Bytes', async () => {
    const { kern, s } = await speicherMitOriginal();
    const vorher = (original.bauwerksmodelle ?? []).length;
    expect(vorher).toBeGreaterThan(0);
    const r = wert(await einlesen(s, v6, { alsKopie: { ids: zaehlendeIds('k'), name: 'Kopie' } }));
    const modelle = wert(await s.bauwerksmodelle.auflisten(r.projektId));
    expect(modelle).toHaveLength(vorher);
    for (const m of modelle) {
      const hash = wert(await s.bauwerksmodelle.laden(m.id)).bauwerksmodell.datei.hash;
      expect(wert(kern.modelldateiVorhanden(hash))).toBe(true);
    }
  });

  it('zwei Kopien nebeneinander; ohne Optionen bleibt ein vorhandenes Projekt existiert-bereits', async () => {
    const { s } = await speicherMitOriginal();
    const a = wert(await einlesen(s, v6, { alsKopie: { ids: zaehlendeIds('a'), name: 'Kopie A' } }));
    const b = wert(await einlesen(s, v6, { alsKopie: { ids: zaehlendeIds('b'), name: 'Kopie B' } }));
    expect(a.projektId).not.toBe(b.projektId);
    expect(wert(await s.projekte.auflisten())).toHaveLength(3);
    expect(await einlesen(s, v6)).toMatchObject({ ok: false, fehler: { code: 'existiert-bereits' } });
    expect(await s.projektdateiImportieren(v6)).toMatchObject({
      ok: false,
      fehler: { code: 'existiert-bereits' },
    });
  });

  it('eine ungültige Datei: derselbe Fehler wie beim Einlesen, keine Kennung gezogen, nichts geschrieben', async () => {
    const { kern, s } = await speicherMitOriginal();
    const ids = zaehlendeIds('k');
    const r = await einlesen(s, '{"schemaVersion": 6, "projekt": 1}', { alsKopie: { ids, name: 'x' } });
    expect(r).toMatchObject({ ok: false, fehler: { code: 'datei-ungueltig' } });
    expect(ids.gezogen()).toEqual([]);
    expect(wert(kern.projekteAuflisten())).toHaveLength(1);
  });

  it('reicht der Vorrat an Kennungen nicht (Programmfehler): unbekannt, nichts geschrieben', async () => {
    const { kern } = await neuerKern();
    const r = await kern.projektdateiEinlesen(v6, {
      alsKopie: { kennungen: { projekt: ['p-neu'] }, name: 'x' },
    });
    expect(r).toMatchObject({ ok: false, fehler: { code: 'unbekannt' } });
    expect(wert(kern.projekteAuflisten())).toEqual([]);
  });
});
