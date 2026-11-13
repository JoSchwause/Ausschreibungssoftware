// SPDX-License-Identifier: AGPL-3.0-or-later
// Sprachtest (Ticket 133, L1, L2, L4, L5): Er liest die Zeichenfolgen aller Textdateien der App (`texte.ts`) und der
// Pakete `ui-*` und schlägt fehl bei „du“-Formen, bei den abgewählten Doppelbegriffen, bei Ticketnummern, Regel- und
// Entscheidungskennungen und Paketnamen sowie bei uneinheitlicher Schreibung von „…“ und „€“.
//
// Festlegungen zur Schreibung (Begründung: D-133.x im Ticket, Begriffe im `GLOSSARY.md`):
// - Anrede unpersönlich; wo nötig „Sie“ (L4). Prüfbar sind nur die Pronomen, nicht Imperative.
// - „…“ steht mit Leerzeichen davor („Ordner wählen …“), nie als „...“ und nie am Wort klebend; auf Schaltflächen nur,
//   wenn ein Dialog oder eine Dateiauswahl folgt (nicht prüfbar, in den Texten durchgesehen).
// - „€“ ist das einzige Währungszeichen (kein „EUR“, kein „Euro“) und steht mit Leerzeichen hinter der Zahl.
// - Ein Trennzeichen in Titeln und Zeilen mit zwei Teilen: der Doppelpunkt („Projekt „A“: …“), nie „ - “ oder „ | “.
// - Spaltenkopf „OZ“, Fließtext „Ordnungszahl“ (nie „Ordnungszahl“ als ganze Beschriftung).
// - Schaltflächen: Verb mit Gegenstand („Projekt anlegen“, nie nur „Anlegen“).

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** Alle Textdateien: `apps/web/src/<Ordner>/texte.ts` und `packages/ui-<name>/src/texte.ts`. */
function textdateien(): string[] {
  const treffer: string[] = [];
  const web = join(WURZEL, 'apps', 'web', 'src');
  for (const name of readdirSync(web)) {
    const datei = join(web, name, 'texte.ts');
    if (statSync(join(web, name)).isDirectory() && exists(datei)) treffer.push(datei);
  }
  const pakete = join(WURZEL, 'packages');
  for (const name of readdirSync(pakete)) {
    if (!name.startsWith('ui-')) continue;
    const datei = join(pakete, name, 'src', 'texte.ts');
    if (exists(datei)) treffer.push(datei);
  }
  return treffer.sort();
}

function exists(pfad: string): boolean {
  try {
    statSync(pfad);
    return true;
  } catch {
    return false;
  }
}

/** Die Zeichenfolgen, die ein Nutzer sehen kann: ohne Importe, Schlüssel und Literaltypen, ohne Kommentare. */
function zeichenfolgen(quelltext: string): string[] {
  const quelle = ts.createSourceFile('texte.ts', quelltext, ts.ScriptTarget.Latest, true);
  const gefunden: string[] = [];
  const besuche = (knoten: ts.Node): void => {
    if (ts.isImportDeclaration(knoten) || ts.isExportDeclaration(knoten) || ts.isLiteralTypeNode(knoten)) return;
    if (ts.isPropertyAssignment(knoten) && (ts.isStringLiteral(knoten.name) || ts.isNoSubstitutionTemplateLiteral(knoten.name))) {
      besuche(knoten.initializer);
      return;
    }
    if (ts.isElementAccessExpression(knoten)) {
      besuche(knoten.expression);
      return;
    }
    if (ts.isStringLiteral(knoten) || ts.isNoSubstitutionTemplateLiteral(knoten)) gefunden.push(knoten.text);
    else if (ts.isTemplateHead(knoten) || ts.isTemplateMiddle(knoten) || ts.isTemplateTail(knoten)) {
      gefunden.push(knoten.text);
    }
    ts.forEachChild(knoten, besuche);
  };
  besuche(quelle);
  return gefunden;
}

interface Regel {
  readonly name: string;
  readonly muster: RegExp;
}

const REGELN: readonly Regel[] = [
  // L4: unpersönlich oder „Sie“
  { name: 'du-Form (L4)', muster: /\b(?:du|dich|dir|dein\w*)\b/i },
  // L2: ein Begriff je Sache (Entscheidungen D-133.1 bis D-133.7)
  { name: 'Vordersatz (Begriff: Menge)', muster: /Vordersatz/ },
  { name: 'Umsatzsteuer als Beschriftung (Begriff: MwSt)', muster: /Umsatzsteuer(?! \(BT-\d+\))/ },
  { name: 'Datensicherung (Begriff: Sicherung)', muster: /Datensicherung/ },
  { name: 'Projektdatei exportieren (Begriff: Projektdatei sichern)', muster: /Projektdatei (?:ex|im)portieren/ },
  { name: 'importieren/Import (Begriff: einlesen)', muster: /\b[Ii]mport\w*/ },
  { name: 'Anlegen ohne Gegenstand', muster: /^Anlegen$/ },
  { name: 'Neue Rechnung (Begriff: Rechnung anlegen)', muster: /Neue Rechnung/ },
  { name: 'Ordnungszahl als Beschriftung (Spaltenkopf: OZ)', muster: /^Ordnungszahl$/ },
  // L5: keine Ticketnummern, Kennungen aus dem Code oder Paketnamen
  { name: 'Ticket (L5)', muster: /\bTicket\b/i },
  { name: 'Paketname vertrag (L5)', muster: /\bvertrag\b/i },
  { name: 'Paketname @tethys (L5)', muster: /@tethys/ },
  { name: 'Entscheidungs- oder Befundkennung (L5)', muster: /\b(?:D|G|E|B)-\d+(?:\.\d+)?\b/ },
  { name: 'Regelkennung (L5)', muster: /\bRegel [A-Z]\d+\b|\((?:[ALNQUFC]\d{1,2})\)/ },
  // Schreibung von „…“ und „€“
  { name: 'drei Punkte statt „…“', muster: /\.\.\./ },
  { name: '„…“ klebt am Wort', muster: /[\p{L}\d]…/u },
  { name: 'EUR oder Euro statt „€“', muster: /\bEUR\b|\bEuro\b/ },
  { name: '„€“ klebt an der Zahl', muster: /\d€/ },
  // ein Trennzeichen
  { name: 'Trennstrich oder senkrechter Strich im Text', muster: / [-|] / },
];

/** Alle Verstöße eines Textes, als lesbare Zeilen. */
function verstoesse(text: string): string[] {
  return REGELN.filter((r) => r.muster.test(text)).map((r) => `${r.name}: „${text}“`);
}

describe('Sprache der Oberfläche', () => {
  const dateien = textdateien();

  it('findet die Textdateien der App und der Pakete', () => {
    expect(dateien.length).toBeGreaterThan(20);
    expect(dateien.some((d) => d.endsWith(join('ui-grid', 'src', 'texte.ts')))).toBe(true);
    expect(dateien.some((d) => d.endsWith(join('web', 'src', 'lv', 'texte.ts')))).toBe(true);
  });

  for (const datei of dateien) {
    it(`${relative(WURZEL, datei)} hält Anrede, Begriffe und Schreibung ein`, () => {
      const alle = zeichenfolgen(readFileSync(datei, 'utf8')).flatMap(verstoesse);
      expect(alle).toEqual([]);
    });
  }
});

describe('Test des Tests', () => {
  it('liest nur Zeichenfolgen, keine Kommentare, Importe und Schlüssel', () => {
    const quelle = [
      "import type { X } from '@tethys/vertrag';",
      '// Ticket 5: du bist dran',
      "export const t = { 'oz-doppelt': 'Frei', ok: `Wert ${String(1)} €` };",
    ].join('\n');
    expect(zeichenfolgen(quelle)).toEqual(['Frei', 'Wert ', ' €']);
  });

  it('schlägt bei einem eingefügten „du“ an', () => {
    expect(verstoesse('Die Bezeichnungen bringst du selbst mit.')).toHaveLength(1);
    expect(verstoesse('Dein Projekt wurde gesichert.')).toHaveLength(1);
    expect(verstoesse('Die Bezeichnungen werden mitgebracht.')).toEqual([]);
    expect(verstoesse('Bitte Sie sich anmelden.')).toEqual([]);
  });

  it('schlägt bei abgewählten Doppelbegriffen, Kennungen und Schreibweisen an', () => {
    for (const schlecht of [
      'Vordersatz neu',
      'Datensicherung',
      'Projektdatei importieren',
      'Import abgeschlossen',
      'Anlegen',
      'Neue Rechnung 3',
      'Ordnungszahl',
      'Ticket 12',
      'Der vertrag ändert sich',
      '@tethys/kern',
      'Siehe D-56',
      'gesperrt (Regel U5)',
      'Moment...',
      'Übernehmen…',
      '100 EUR',
      '5€',
      'A - B',
    ]) {
      expect(verstoesse(schlecht), schlecht).not.toEqual([]);
    }
  });

  it('lässt die vereinbarten Schreibweisen zu', () => {
    for (const gut of [
      'Projekt anlegen',
      'OZ',
      'Die Ordnungszahl passt nicht zur OZ-Maske.',
      'Ordner wählen …',
      '… und 3 weitere',
      'Betrag (netto, €)',
      '12,50 €',
      'Umsatzsteuer (BT-110)',
      'Projekt „A“: Die letzte Sicherung ist 3 Tage her.',
    ]) {
      expect(verstoesse(gut), gut).toEqual([]);
    }
  });
});
