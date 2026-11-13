// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests der Druckprofile (Ticket 77): je Einstellung ein Test über den Text der Seiten (nicht über Bytes), die Standardprofile
// und der JSON-Rundweg mit Befunden. Der Text kommt wie in Ticket 58 aus `pdftext.ts`.

import { describe, expect, it } from 'vitest';
import type { Langtext, LvZustand, Position } from '@tethys/vertrag';
import { baueAusgabemodell, erzeugePdf } from './index';
import type { PdfOptionen } from './index';
import {
  STANDARD_DRUCKPROFILE,
  druckprofilAlsJson,
  druckprofilAusJson,
  ersetzePlatzhalter,
  neuesDruckprofil,
  profilAlsOptionen,
} from './druckprofil';
import type { Druckprofil } from './druckprofil';
import { alsText, liesPdf } from './pdftext';
import { schriftenAusDateien } from './schriften-node';
import { fixtureZustand, mitInhalt, positionenAendern } from './testhilfe/bau';

const schriften = schriftenAusDateien();
const normal = (t: string): string => t.replace(/\s+/g, ' ').trim();

const absatz = (text: string): Langtext[number] => ({ art: 'absatz', inhalt: [{ art: 'text', text }] });
const langtext: Langtext = [
  absatz('Zeile-Eins'),
  absatz('Zeile-Zwei'),
  { art: 'liste', geordnet: false, punkte: [[{ art: 'text', text: 'Punkt-Drei' }]] },
  absatz('Zeile-Vier'),
];

/** `winzig` mit Langtext an der ersten Position, mit Projekt und Datum als Eingabe. */
function zustandMitLangtext(): LvZustand {
  const { zustand } = fixtureZustand('winzig');
  let erste = true;
  return mitInhalt(zustand, (i) =>
    positionenAendern(
      i,
      () => {
        const jetzt = erste;
        erste = false;
        return jetzt;
      },
      (p: Position) => ({ ...p, langtext }),
    ),
  );
}

const EINGABE: PdfOptionen = {
  datum: '2026-11-11',
  projekt: { name: 'Neubau Beispiel', bauherr: { name: 'Beispiel-Bauherr GmbH', anschrift: null } },
};

async function pdf(zustand: LvZustand, optionen: PdfOptionen) {
  return liesPdf(await erzeugePdf(zustand, schriften, { ...EINGABE, ...optionen }));
}
const text = async (zustand: LvZustand, optionen: PdfOptionen = {}): Promise<string> =>
  normal(alsText(await pdf(zustand, optionen)));

describe('Standardverhalten bleibt (Vorgabewerte der Optionen)', () => {
  it('ohne neue Optionen: voller Langtext, Titelsummen, Schlussblock, Kopfangaben', async () => {
    const z = zustandMitLangtext();
    const t = await text(z);
    for (const s of ['Zeile-Eins', 'Zeile-Vier', 'Brutto', 'Summe ', 'Neubau Beispiel', 'Stand: 11.11.2026'])
      expect(t, s).toContain(s);
  });
});

describe('Langtext', () => {
  it('„kein“: nur der Kurztext, kein Langtext', async () => {
    const z = zustandMitLangtext();
    const t = await text(z, { langtext: { art: 'kein' } });
    expect(t).not.toContain('Zeile-Eins');
    expect(t).not.toContain('Punkt-Drei');
    const kurz = baueAusgabemodell(z).zeilen.find((r) => r.art === 'position')?.kurztext ?? '';
    expect(kurz).not.toBe('');
    expect(t).toContain(normal(kurz));
  });

  it('„zeilen“: die ersten n Zeilen, der Schnitt ist durch eine Marke sichtbar (Q5)', async () => {
    const z = zustandMitLangtext();
    const t = await text(z, { langtext: { art: 'zeilen', anzahl: 2 } });
    expect(t).toContain('Zeile-Eins');
    expect(t).toContain('Zeile-Zwei');
    expect(t).not.toContain('Punkt-Drei');
    expect(t).not.toContain('Zeile-Vier');
    expect(t).toContain('[…]');
  });

  it('„zeilen“: zählt Listenpunkte einzeln; reicht n für alles, steht keine Marke', async () => {
    const z = zustandMitLangtext();
    const drei = await text(z, { langtext: { art: 'zeilen', anzahl: 3 } });
    expect(drei).toContain('Punkt-Drei');
    expect(drei).not.toContain('Zeile-Vier');
    const alle = await text(z, { langtext: { art: 'zeilen', anzahl: 4 } });
    expect(alle).toContain('Zeile-Vier');
    expect(alle).not.toContain('[…]');
  });

  it('„voll“ ist wie ohne Angabe', () => {
    const z = zustandMitLangtext();
    expect(baueAusgabemodell(z, { langtext: { art: 'voll' } })).toEqual(baueAusgabemodell(z));
  });
});

describe('Titelsummen und Schlussblock', () => {
  it('Titelsummen aus: keine Titelsumme, der Schlussblock bleibt', async () => {
    const { zustand } = fixtureZustand('typisch');
    const mit = await text(zustand);
    const ohne = await text(zustand, { titelsummen: false });
    expect(mit).toContain('Summe 01');
    expect(ohne).not.toContain('Summe 01');
    expect(ohne).toContain('Brutto');
  });

  it('Schlussblock aus: kein Netto, MwSt, Brutto, keine Bedarfs- und Wahlsumme; Titelsummen bleiben', async () => {
    const { zustand } = fixtureZustand('typisch');
    const ohne = await text(zustand, { schlussblock: false });
    for (const wort of ['Brutto', 'MwSt', 'Netto nach Nachlass', 'Wahlsumme (nicht in der Netto'])
      expect(ohne, wort).not.toContain(wort);
    expect(ohne).toContain('Summe 01');
  });
});

describe('Deckblatt', () => {
  it('aus: nur der LV-Name, keine Angaben zu Projekt und Bauherr', async () => {
    const z = zustandMitLangtext();
    const an = await text(z);
    const aus = await text(z, { deckblatt: false });
    expect(an).toContain('Beispiel-Bauherr GmbH');
    expect(aus).not.toContain('Beispiel-Bauherr GmbH');
    expect(aus).not.toContain('Neubau Beispiel');
    expect(aus).toContain(z.leistungsverzeichnis.name);
  });

  it('nimmt Büro und Projektangaben aus der Druckeingabe in den Kopf', () => {
    const z = zustandMitLangtext();
    const optionen = profilAlsOptionen(neuesDruckprofil('Mit Kopf'), {
      projekt: { name: 'Neubau Beispiel', angaben: { nummer: 'P-7', ort: null, baustelle: null } },
      buero: { name: 'Planungsbüro Beispiel', anschrift: null, telefon: null, email: null },
    });
    const kopf = baueAusgabemodell(z, optionen).kopf;
    expect(kopf.absender).toEqual(['Planungsbüro Beispiel']);
    expect(kopf.felder).toContainEqual({ bezeichnung: 'Projektnummer', wert: 'P-7' });
  });
});

describe('Kopf- und Fußzeile', () => {
  it('Platzhalter {seite}, {seiten}, {datum}, {lv} werden je Seite ersetzt', async () => {
    const { zustand } = fixtureZustand('typisch');
    const inhalt = await pdf(zustand, {
      kopfzeile: 'Kopf {lv}',
      fusszeile: 'Fuß {datum} – {seite}/{seiten}',
    });
    const n = inhalt.seiten.length;
    expect(n).toBeGreaterThan(1);
    inhalt.seiten.forEach((seite, i) => {
      const t = normal(seite.map((s) => s.text).join(' '));
      expect(t).toContain(`Kopf ${zustand.leistungsverzeichnis.name}`);
      expect(t).toContain(`Fuß 11.11.2026 – ${String(i + 1)}/${String(n)}`);
      expect(t).not.toContain('Stand:'); // die Vorgabe-Fußzeile ist ersetzt
    });
  });

  it('ersetzePlatzhalter: unbekannte Platzhalter bleiben, fehlendes Datum wird leer', () => {
    const werte = { seite: 2, seiten: 5, datum: null, lv: 'LV' };
    expect(ersetzePlatzhalter('S. {seite} von {seiten} {datum}|{x}', werte)).toBe('S. 2 von 5 |{x}');
  });
});

describe('Seitenrand', () => {
  it('eng rückt die Spalten näher an den Rand', async () => {
    const { zustand } = fixtureZustand('winzig');
    const xVonOz = async (optionen: PdfOptionen): Promise<number> => {
      const inhalt = await pdf(zustand, optionen);
      const erste = baueAusgabemodell(zustand).zeilen.find((r) => r.art === 'position')?.ordnungszahl ?? '';
      const stueck = inhalt.seiten[0]?.find((s) => s.text === erste);
      expect(stueck, erste).toBeDefined();
      return stueck?.x ?? 0;
    };
    const normalX = await xVonOz({ seitenrand: 'normal' });
    const engX = await xVonOz({ seitenrand: 'eng' });
    expect(normalX).toBeCloseTo(40, 0);
    expect(engX).toBeLessThan(normalX - 8);
  });
});

describe('Profil ohne Preise (Blankett)', () => {
  it('mitPreisen: false im Profil druckt keinen Preis', async () => {
    const { zustand } = fixtureZustand('typisch');
    const profil = { ...neuesDruckprofil('Blankett'), mitPreisen: false };
    const t = await text(zustand, profilAlsOptionen(profil));
    expect(t).not.toContain('Brutto');
    expect(t).not.toContain('Summe 01');
  });
});

describe('Standardprofile', () => {
  const nach = (name: string): Druckprofil => {
    const p = STANDARD_DRUCKPROFILE.find((s) => s.name === name);
    if (p === undefined) throw new Error(name);
    return p;
  };

  it('nennt mindestens die drei geforderten Profile, mit eindeutigen Namen', () => {
    const namen = STANDARD_DRUCKPROFILE.map((p) => p.name);
    expect(namen).toEqual(
      expect.arrayContaining([
        'Ausschreibung mit Langtext ohne Preise',
        'Kostenanschlag mit Preisen, nur Kurztext',
        'Auftrags-LV mit Preisen',
      ]),
    );
    expect(new Set(namen).size).toBe(namen.length);
  });

  it('Ausschreibung mit Langtext ohne Preise: Langtext da, kein Preis, kein Schlussblock', async () => {
    const z = zustandMitLangtext();
    const t = await text(z, profilAlsOptionen(nach('Ausschreibung mit Langtext ohne Preise')));
    expect(t).toContain('Zeile-Vier');
    expect(t).not.toContain('Brutto');
    expect(t).not.toContain('Summe 01');
    expect(t).toContain('Beispiel-Bauherr GmbH');
  });

  it('Kostenanschlag mit Preisen, nur Kurztext: kein Langtext, Preise und Schlussblock da', async () => {
    const z = zustandMitLangtext();
    const t = await text(z, profilAlsOptionen(nach('Kostenanschlag mit Preisen, nur Kurztext')));
    expect(t).not.toContain('Zeile-Eins');
    expect(t).toContain('Brutto');
    expect(t).toContain('Summe 01');
  });

  it('Auftrags-LV mit Preisen: alles', async () => {
    const z = zustandMitLangtext();
    const t = await text(z, profilAlsOptionen(nach('Auftrags-LV mit Preisen')));
    for (const s of ['Zeile-Eins', 'Zeile-Vier', 'Brutto', 'Summe 01', 'Beispiel-Bauherr GmbH'])
      expect(t, s).toContain(s);
    expect(t).not.toContain('[…]');
  });

  it('profilAlsOptionen: Datum und Projekt der App werden durchgereicht', () => {
    const o = profilAlsOptionen(nach('Auftrags-LV mit Preisen'), EINGABE);
    expect(o.datum).toBe('2026-11-11');
    expect(o.projekt?.name).toBe('Neubau Beispiel');
  });
});

describe('Profil als JSON', () => {
  it('Rundweg: schreiben, lesen, gleich; ohne Befund', () => {
    for (const p of STANDARD_DRUCKPROFILE) {
      const { profil, befunde } = druckprofilAusJson(druckprofilAlsJson(p));
      expect(profil).toEqual(p);
      expect(befunde).toEqual([]);
    }
    const eigenes: Druckprofil = {
      ...neuesDruckprofil('Eigenes'),
      langtext: { art: 'zeilen', anzahl: 3 },
      kopfzeile: 'Kopf',
      fusszeile: 'Fuß {seite}',
      seitenrand: 'eng',
    };
    expect(druckprofilAusJson(druckprofilAlsJson(eigenes)).profil).toEqual(eigenes);
  });

  it('trägt die Schemaversion im Objekt', () => {
    const o = JSON.parse(druckprofilAlsJson(neuesDruckprofil('X'))) as Record<string, unknown>;
    expect(o['schemaversion']).toBe(1);
  });

  it('fehlende Felder bekommen den Standardwert, ohne Befund', () => {
    const { profil, befunde } = druckprofilAusJson('{"schemaversion":1,"name":"Nur Name"}');
    expect(profil).toEqual(neuesDruckprofil('Nur Name'));
    expect(befunde).toEqual([]);
  });

  it('unbekannte Felder sind ein Befund und werden nicht übernommen', () => {
    const { profil, befunde } = druckprofilAusJson(
      '{"schemaversion":1,"name":"A","mitPreisen":false,"farbe":"rot"}',
    );
    expect(profil?.mitPreisen).toBe(false);
    expect(profil).not.toHaveProperty('farbe');
    expect(befunde).toEqual([expect.objectContaining({ code: 'unbekanntes-feld', pfad: 'farbe' })]);
  });

  it('ungültiger Wert ist ein Befund, das Feld behält den Standardwert', () => {
    const { profil, befunde } = druckprofilAusJson(
      '{"schemaversion":1,"name":"A","seitenrand":"riesig","langtext":{"art":"zeilen","anzahl":0},"titelsummen":"ja"}',
    );
    expect(profil?.seitenrand).toBe('normal');
    expect(profil?.langtext).toEqual({ art: 'voll' });
    expect(profil?.titelsummen).toBe(true);
    expect(befunde.map((b) => [b.code, b.pfad]).sort()).toEqual([
      ['ungueltiger-wert', 'langtext'],
      ['ungueltiger-wert', 'seitenrand'],
      ['ungueltiger-wert', 'titelsummen'],
    ]);
  });

  it('fehlende oder neuere Schemaversion ist ein Befund; bekannte Felder werden trotzdem gelesen', () => {
    const ohne = druckprofilAusJson('{"name":"A","mitPreisen":false}');
    expect(ohne.profil?.mitPreisen).toBe(false);
    expect(ohne.befunde.map((b) => b.code)).toEqual(['schemaversion-fehlt']);
    const neuer = druckprofilAusJson('{"schemaversion":2,"name":"A","mitPreisen":false}');
    expect(neuer.profil?.mitPreisen).toBe(false);
    expect(neuer.befunde.map((b) => b.code)).toEqual(['schemaversion-unbekannt']);
  });

  it('kein JSON oder kein Objekt: Befund `kein-profil`, Ergebnis ist null', () => {
    for (const eingabe of ['{', '[1]', '42', 'null']) {
      const r = druckprofilAusJson(eingabe);
      expect(r.profil).toBeNull();
      expect(r.befunde.map((b) => b.code)).toEqual(['kein-profil']);
    }
  });

  it('Name fehlt oder ist leer: Befund, Name „Druckprofil“', () => {
    const r = druckprofilAusJson('{"schemaversion":1}');
    expect(r.profil?.name).toBe('Druckprofil');
    expect(r.befunde.map((b) => [b.code, b.pfad])).toEqual([['ungueltiger-wert', 'name']]);
  });
});
