// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 117 (Tor X1, D-58): gemeinsame Schritte und Sollwerte der E2E X1-Kern und X1-Erweitert. Die Sollwerte stehen in
// `fixtures/typisch-bim.json` (Ticket 99, Herleitung im README der Fixtures, „BIM: Haus und Tor X1“) und `typisch.json`, nie
// aus einem Lauf der App. Die App vergibt eigene Kennungen (das LV kommt per GAEB); zugeordnet wird über die OZ. Die
// 3D-Ansicht prüft der Prüfzugang `window.tethysModell` (Test-Build), nie Pixel (D-58, D-100.3).

import { readFileSync } from 'node:fs';
import { expect, type Locator, type Page } from '@playwright/test';
import type { Betrag, PositionId, ProjektId } from '@tethys/vertrag';
import { schreibeGaeb } from '../../../packages/gaeb/src/index';
import { lvBefehlAusfuehren, lvChangeSetAnwenden, zuschlagsbasen } from '../../../packages/kern/src/index';
import { fixtureInhalt } from './fixture-inhalt';
import { betragDe, gaebEinlesen, projektAnlegen } from './hilfen';
import { werkzeug } from './werkzeuge';

// --- Sollwerte -----------------------------------------------------------------------------------------------------

export type Summen = Readonly<Record<'netto' | 'nachlass' | 'nettoNachNachlass' | 'mwst' | 'brutto', string>>;
interface FxMenge {
  readonly name: string;
  readonly art: 'laenge' | 'flaeche' | 'volumen';
  readonly wert: string;
}
export interface FxBauteil {
  readonly globalId: string;
  readonly kennung: string;
  readonly klasse: string;
  readonly name: string;
  readonly geschoss: string;
  readonly mengen: readonly FxMenge[];
}
export interface FxZuordnung {
  readonly positionId: string;
  readonly oz: string;
  readonly kurztext: string;
  readonly einheit: string;
  readonly bauteile: readonly { readonly globalId: string; readonly mengenart: string }[];
}
export interface FxVordersatz {
  readonly positionId: string;
  readonly oz: string;
  readonly mengenansatz: readonly { readonly ausdruck: string }[];
  readonly menge: string;
}
interface FxSollwerte {
  readonly positionen: Readonly<Record<string, { readonly gp: string | null }>>;
  readonly summen: Summen;
}

/** Was die E2E aus `typisch-bim.json` lesen (README der Fixtures, „BIM-Set“). */
export interface FxBim {
  readonly lvName: string;
  readonly bauteile: { readonly v1: readonly FxBauteil[]; readonly v2: readonly FxBauteil[] };
  readonly zuordnungen: readonly FxZuordnung[];
  readonly kern: {
    readonly torweg: { readonly positionIds: readonly string[]; readonly sollwerte: FxSollwerte };
    readonly vordersaetze: readonly FxVordersatz[];
    readonly sollwerte: FxSollwerte;
  };
  readonly erweitert: {
    readonly din277: {
      readonly geschosse: readonly { readonly globalId: string; readonly name: string }[];
      readonly summen: { readonly bgf: string; readonly bri: string; readonly nrf: string };
    };
    readonly kostenschaetzung: {
      readonly bezugsgroesse: { readonly art: string; readonly wert: string; readonly einheit: string };
      readonly kennwerte: readonly { readonly nummer: string; readonly kennwert: string }[];
      readonly eintraege: readonly { readonly nummer: string; readonly betrag: string }[];
      readonly gesamt: string;
    };
    readonly aufmassAusAuswahl: {
      readonly auswahl: { readonly globalId: string; readonly name: string };
      readonly positionen: readonly (FxVordersatz & { readonly bauteile: readonly string[] })[];
    };
    readonly vergleich: {
      readonly hinzugefuegt: readonly FxBauteil[];
      readonly entfernt: readonly FxBauteil[];
      readonly geaendert: readonly { readonly globalId: string }[];
    };
    readonly betroffenePositionen: readonly {
      readonly oz: string;
      readonly vorher: string;
      readonly nachher: string;
      readonly differenz: string;
    }[];
    readonly mengenAktualisieren: {
      readonly vordersaetze: readonly FxVordersatz[];
      readonly befunde: readonly { readonly oz: string; readonly art: string; readonly kennung: string }[];
      readonly sollwerte: FxSollwerte;
    };
  };
}

const wurzel = new URL('../../../', import.meta.url);
export const BIM = JSON.parse(readFileSync(new URL('fixtures/typisch-bim.json', wurzel), 'utf8')) as FxBim;
export const TYPISCH = JSON.parse(readFileSync(new URL('fixtures/typisch.json', wurzel), 'utf8')) as {
  readonly sollwerte: FxSollwerte;
};

/** Name je GlobalId über beide Stände (v2 benennt PL-EG um; je Stand gilt sein Name). */
export const nameIn = (stand: 'v1' | 'v2', globalId: string): string =>
  BIM.bauteile[stand].find((b) => b.globalId === globalId)?.name ?? `? ${globalId}`;
export const geschossVon = (globalId: string): string =>
  BIM.bauteile.v1.find((b) => b.globalId === globalId)?.geschoss ?? '';

/** Kanonische Menge der Fixture (`33.023`, `-4.125`) wie die App sie zeigt (`33,023`, `-4,125`). */
export const mengeDe = (wert: string): string => {
  const [ganz = '', nach = ''] = wert.replace('-', '').split('.');
  return `${wert.startsWith('-') ? '-' : ''}${ganz.replace(/\B(?=(\d{3})+$)/g, '.')},${nach}`;
};

/** Summenzeile unter dem Grid in der Form der Fixture (de-DE). */
export const summenDe = (s: Summen): Record<string, string> => ({
  Netto: betragDe(s.netto),
  Nachlass: betragDe(s.nachlass),
  'Netto nach Nachlass': betragDe(s.nettoNachNachlass),
  MwSt: betragDe(s.mwst),
  Brutto: betragDe(s.brutto),
});

// --- Projekt mit LV `typisch` per GAEB -------------------------------------------------------------------------------

/**
 * D-117.1: `typisch` als X86, geschrieben vom GAEB-Writer der App wie „GAEB ausgeben“ (`gaeb/gaeb.ts`, `lvAusgeben`):
 * Summenstand und Zuschlagsbasen aus dem Kern, Datum fest (A2). Anders als X83 (M3, M4) trägt X86 die EP, den Nachlass und
 * den MwSt-Satz; nur so stimmt das LV-Netto mit den Sollwerten.
 */
export function typischAlsX86(): { name: string; mimeType: string; buffer: Buffer } {
  const inhalt = fixtureInhalt('typisch');
  const cs = lvBefehlAusfuehren(null, {
    art: 'LeistungsverzeichnisAnlegen',
    id: inhalt.wurzelId,
    projektId: 'x1' as ProjektId,
    inhalt,
  });
  const z = cs.ok ? lvChangeSetAnwenden(null, cs.wert) : null;
  if (z === null) throw new Error('typisch lässt sich nicht anlegen');
  const basen = new Map<PositionId, Betrag>();
  for (const [id, b] of zuschlagsbasen(z.leistungsverzeichnis)) basen.set(id, b.basis);
  const e = schreibeGaeb(inhalt, {
    phase: 'X86',
    version: '3.3',
    erstellt: { datum: '2026-11-11', zeit: '12:00:00' },
    programm: 'Tethys AVA (E2E)',
    summen: z.summen,
    zuschlagsbasen: basen,
  });
  return { name: 'typisch.x86', mimeType: 'application/xml', buffer: Buffer.from(e.xml, 'utf8') };
}

/** Neues Projekt, LV `typisch` über „GAEB einlesen“ (X86); danach steht die LV-Seite offen. */
export async function projektMitTypisch(
  page: Page,
  name: string,
): Promise<{ readonly projektId: string; readonly lvPfad: string }> {
  await projektAnlegen(page, name, 'Bauherr BIM');
  const projektId = decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1) ?? '');
  await gaebEinlesen(page, typischAlsX86(), BIM.lvName);
  return { projektId, lvPfad: new URL(page.url()).pathname };
}

// --- Modelle und 3D --------------------------------------------------------------------------------------------------

export const ifcDatei = (name: 'haus-v1' | 'haus-v2') => ({
  name: `${name}.ifc`,
  mimeType: 'application/octet-stream',
  buffer: readFileSync(new URL(`fixtures/ifc/${name}.ifc`, wurzel)),
});

/** Auf der Liste der Modelle: Datei einlesen, keine Befunde, dann „Modell öffnen“. */
export async function modellEinlesen(page: Page, name: 'haus-v1'): Promise<void> {
  await page.getByLabel('IFC-Datei wählen').setInputFiles(ifcDatei(name));
  const dialog = page.getByRole('dialog', { name: 'Modell eingelesen' });
  await expect(dialog.getByText('Keine Befunde.')).toBeVisible({ timeout: 30_000 });
  await dialog.getByRole('button', { name: 'Modell öffnen' }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

export async function dreiDGeladen(page: Page): Promise<void> {
  await page.waitForFunction(() => window.tethysModell?.darstellung()?.geladen === true, undefined, {
    timeout: 45_000,
  });
}

/** Zeichenstand der Leinwand (GlobalIds sortiert). */
export const darstellung = (page: Page) =>
  page.evaluate(() => {
    const d = window.tethysModell?.darstellung();
    return {
      bauteile: d?.bauteile ?? 0,
      sichtbar: [...(d?.sichtbar ?? [])].sort(),
      hervorgehoben: [...(d?.hervorgehoben ?? [])].sort(),
    };
  });

export const auswahl3d = (page: Page) =>
  page.evaluate(() => [...(window.tethysModell?.auswahl() ?? [])].sort());

/** GlobalIds mit der Färbung „zugeordnet“ (bezogen auf das gewählte LV), sortiert. */
export const zugeordnet = async (page: Page): Promise<string[]> =>
  Object.entries(await page.evaluate(() => window.tethysModell?.faerbung() ?? {}))
    .filter(([, f]) => f === 'zugeordnet')
    .map(([g]) => g)
    .sort();

// --- Modellbaum ------------------------------------------------------------------------------------------------------

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const baum = (page: Page): Locator => page.getByRole('treegrid', { name: 'Modellbaum' });
/** Zelle der Baumspalte; bei einem Knoten mit Unterknoten trägt sie den Namen des Auf-/Zuklappknopfs davor. */
export const baumzelle = (page: Page, text: string): Locator =>
  baum(page).getByRole('gridcell', { name: new RegExp(`^((Auf|Zu)klappen )?${esc(text)}$`) });
export const aktiveZelle = (page: Page): Locator => baum(page).locator('[role="gridcell"][tabindex="0"]');

/**
 * Der Baum ist virtualisiert (`VergleichsGrid`): Zeilen des OG stehen unten und sind beim Öffnen nicht gerendert. Vor dem
 * Klick rollt der Baum an das passende Ende (Rollen ändert die Auswahl nicht).
 */
async function baumRollen(page: Page, nachUnten: boolean): Promise<void> {
  await baum(page).evaluate((g, unten) => {
    g.scrollTop = unten ? g.scrollHeight : 0;
  }, nachUnten);
}

/** Bauteile im Baum wählen wie ein Nutzer: Klick auf das erste, Strg/Cmd+Klick auf die übrigen (D-115.1). */
export async function imBaumWaehlen(page: Page, globalIds: readonly string[]): Promise<void> {
  for (const [i, g] of globalIds.entries()) {
    await baumRollen(page, geschossVon(g) === 'OG');
    const z = baumzelle(page, nameIn('v1', g));
    await expect(z).toBeVisible();
    await z.click(i === 0 ? {} : { modifiers: ['ControlOrMeta'] });
  }
  await expect.poll(() => auswahl3d(page)).toEqual([...globalIds].sort());
}

// --- Zuordnen (Ticket 115) -------------------------------------------------------------------------------------------

export async function waehle(
  page: Page,
  bereich: Locator | Page,
  label: string,
  option: string | RegExp,
): Promise<void> {
  await bereich.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option }).click();
}

const EINHEIT: Readonly<Record<FxMenge['art'], string>> = { laenge: 'm', flaeche: 'm²', volumen: 'm³' };

/** Die Option der Mengenart wie im Dialog: Name (Stück für `Stueck`), Einheit und „n von n“ Bauteilen der Auswahl. */
function mengenartOption(mengenart: string, globalIds: readonly string[]): string {
  const n = String(globalIds.length);
  if (mengenart === 'Stueck') return `Stück (St, ${n} von ${n})`;
  const art = BIM.bauteile.v1
    .find((b) => b.globalId === globalIds[0])
    ?.mengen.find((q) => q.name === mengenart)?.art;
  return `${mengenart} (${art === undefined ? '?' : EINHEIT[art]}, ${n} von ${n})`;
}

/** Eine Zuordnung der Fixture über „Zuordnen …“ auf der Modellseite: Auswahl im Baum, Position, Mengenart (ein Befehl). */
export async function zuordnen(page: Page, f: FxZuordnung): Promise<void> {
  const mengenarten = [...new Set(f.bauteile.map((b) => b.mengenart))];
  for (const mengenart of mengenarten) {
    const ids = f.bauteile.filter((b) => b.mengenart === mengenart).map((b) => b.globalId);
    await imBaumWaehlen(page, ids);
    await page
      .getByRole('region', { name: 'Zuordnung zu Positionen' })
      .getByRole('button', { name: 'Zuordnen …' })
      .click();
    const dialog = page.getByRole('dialog', {
      name: `${String(ids.length)} ${ids.length === 1 ? 'Bauteil' : 'Bauteile'} zuordnen`,
    });
    await dialog.getByLabel('Position suchen (OZ oder Kurztext)').fill(f.oz);
    await dialog.getByRole('radio', { name: `${f.oz} ${f.kurztext} (${f.einheit})` }).check();
    await waehle(page, dialog, 'Mengenart', mengenartOption(mengenart, ids));
    await expect(dialog.getByRole('region', { name: 'Befunde nach dem Zuordnen' })).toContainText(
      'Keine Befunde',
    );
    await dialog.getByRole('button', { name: 'Zuordnen', exact: true }).click();
    await expect(dialog).toHaveCount(0);
  }
}

// --- LV-Grid ---------------------------------------------------------------------------------------------------------

/** Die Zelle `spalte` der Zeile eines Grids, deren Zelle `schluessel` genau `text` zeigt. */
export function zelle(grid: Locator, schluessel: string, text: string, spalte: string): Locator {
  return grid
    .locator('[role="row"]')
    .filter({
      has: grid.page().locator(`[data-spalte="${schluessel}"] .tx-grid__text`, {
        hasText: new RegExp(`^${esc(text)}$`),
      }),
    })
    .locator(`[data-spalte="${spalte}"] .tx-grid__text`);
}

/** Das Grid der LV-Seite. */
export const lvGrid = (page: Page): Locator => page.getByRole('treegrid', { name: /Positionen/ }).first();

/** „Mengen aus Modell …“ auf der LV-Seite: Vorschau mit `n` geänderten Positionen, dann übernehmen (ein Undo-Schritt). */
export async function mengenAusModell(page: Page, soll: readonly FxVordersatz[]): Promise<void> {
  await werkzeug(page, 'Bearbeiten', 'Mengen aus Modell …');
  const dialog = page.getByRole('dialog', { name: 'Mengen aus dem Modell übernehmen' });
  const vorschau = dialog.getByRole('table', { name: 'Vorschau der Mengenübernahme' });
  for (const v of soll) {
    const zeile = vorschau.getByRole('row').filter({ hasText: v.oz });
    const einheit = BIM.zuordnungen.find((z) => z.positionId === v.positionId)?.einheit ?? '';
    await expect(zeile.locator('[data-wert="nachher"]')).toHaveText(`${mengeDe(v.menge)} ${einheit}`);
    await expect(zeile).toContainText(v.mengenansatz.map((z) => z.ausdruck).join(' + '));
  }
  await dialog
    .getByRole('button', {
      name: soll.length === 1 ? '1 Position übernehmen' : `${String(soll.length)} Positionen übernehmen`,
    })
    .click();
  await expect(dialog).toHaveCount(0);
}
