// SPDX-License-Identifier: AGPL-3.0-or-later
// Tor M4 (Ticket 91, D-38, `plan.md` §4): die durchgehende Kette LPH 6–8 über die Oberfläche, auf dem Weg von M3. Neues
// Projekt → LV `typisch` als X83 („GAEB einlesen“) → zwei X84 (Bieter A, B) → Zuschlag an Bieter B ohne Wahl (D-85.1) →
// Nachtrag N01 (Nachtrags-LV, Angebot des Auftragnehmers, beauftragen) → Kostenberechnung als Budget und Kostengruppen am
// Auftrags-LV → Aufmaßblatt 1 (Formel 91) → Soll/Ist mit dem Befund über 110 % → Abschlagsrechnung 1 (Prozent-Nachlass,
// Umlage, Sicherheitseinbehalt) gleich dem Sollwert, freigeben → Aufmaßblatt 2 und Abschlagsrechnung 2 (kumuliert minus
// eingefrorener Zahlbetrag) → Korrektur an Blatt 1 ändert AR 2, nicht AR 1 → Kostenkontrolle je Kostengruppe gleich den
// Sollwerten → Neuladen behält alles.
//
// Alle erwarteten Zahlen stehen in `fixtures/typisch-abrechnung.json` (Ticket 85, Herleitung im README der Fixtures,
// „M4-Abrechnung“), nie aus einem Lauf der Pakete. Die App vergibt eigene Kennungen; die Zuordnung zur Fixture läuft über
// die OZ (`positionen[].oz`). Die Rücklaufdatei des Nachtragsangebots entsteht im Test aus dem gespeicherten Nachtrags-LV
// mit den EP der Fixture (wie `nachtrag.spec.ts`, D-86.9); sonst nur Dateiauswahl, Schaltflächen und Tastatur.

import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import type { Einheitspreis, LvZustand, Projektdatei } from '@tethys/vertrag';
import { lvAlsExcel } from '../../../packages/ausgabe/src/index';
import { fixtureAlsX83 } from './fixture-inhalt';
import {
  betragDe,
  eingabeDe,
  gaebEinlesen,
  neueZeile,
  projektAnlegen,
  summen,
  tippe,
  zeilen,
} from './hilfen';

// --- Fixture -------------------------------------------------------------------------------------------------------

type Summen = Readonly<Record<'netto' | 'nachlass' | 'nettoNachNachlass' | 'mwst' | 'brutto', string>>;
interface Kostenzeile {
  readonly budget: string;
  readonly vergabe: string;
  readonly abrechnung: string;
  readonly abweichung: string;
}
interface Ansatz {
  readonly zeile: string;
  readonly ausdruck: string;
}
interface Blattzeile {
  readonly positionId: string;
  readonly mengenansatz: readonly Ansatz[] | null;
  readonly menge: string;
}
interface Blatt {
  readonly nummer: string;
  readonly bezeichnung: string;
  readonly datum: string;
  readonly positionen: readonly Blattzeile[];
}
interface Kette {
  readonly leistung: string;
  readonly nachlass: string;
  readonly nettoNachNachlass: string;
  readonly mwst: string;
  readonly bruttoKumuliert: string;
  readonly umlagen: readonly {
    readonly bezeichnung: string;
    readonly satz: string;
    readonly betrag: string;
  }[];
  readonly einbehalt: string;
  readonly fruehereZahlbetraege: string;
  readonly zahlbetrag: string;
}
interface SollIstStand {
  readonly zeilen: readonly {
    readonly positionId: string;
    readonly soll: string;
    readonly ist: string;
    readonly anteil: string;
  }[];
  readonly befunde: readonly { readonly positionId: string; readonly art: string; readonly anteil: string }[];
}

const wurzel = new URL('../../../fixtures/', import.meta.url);
const fx = JSON.parse(readFileSync(new URL('typisch-abrechnung.json', wurzel), 'utf8')) as {
  readonly lvName: string;
  readonly zuschlag: {
    readonly bieterName: string;
    readonly entfallen: readonly string[];
    readonly ohnePreis: readonly string[];
    readonly sollwerte: { readonly summen: Summen };
  };
  readonly nachtrag: {
    readonly lv: {
      readonly knoten: readonly {
        readonly id: string;
        readonly art: string;
        readonly kurztext: string;
        readonly menge?: string;
        readonly einheit?: string;
      }[];
    };
    readonly angebot: {
      readonly positionen: readonly { readonly positionId: string; readonly einheitspreis: string }[];
      readonly sollwerte: { readonly summen: Summen };
    };
    readonly sollwerte: { readonly summen: Summen };
  };
  readonly positionen: readonly {
    readonly positionId: string;
    readonly oz: string;
    readonly kurztext: string;
    readonly kostengruppe: string | null;
  }[];
  readonly kostenermittlung: {
    readonly name: string;
    readonly eintraege: readonly {
      readonly nummer: string;
      readonly betrag: string;
      readonly bemerkung?: string;
    }[];
  };
  readonly aufmasse: readonly { readonly aufmass: Blatt }[];
  readonly korrektur: { readonly befehl: { readonly position: Blattzeile } };
  readonly rechnungen: readonly {
    readonly nummer: string;
    readonly eingang: string;
    readonly rechnungsnummerAuftragnehmer: string;
    readonly umlagen: readonly { readonly bezeichnung: string; readonly satz: string }[];
    readonly sicherheitSatz: string;
  }[];
  readonly pruefungen: Readonly<
    Record<'ar1' | 'ar2VorKorrektur' | 'ar2NachKorrektur', { readonly kette: Kette }>
  >;
  readonly gegenprobeOhneEinfrieren: { readonly ar1Zahlbetrag: string };
  readonly sollIst: Readonly<Record<'nachBlatt1' | 'nachBlatt2' | 'nachKorrektur', SollIstStand>>;
  readonly kostenkontrolle: {
    readonly zeilen: readonly (Kostenzeile & { readonly kostengruppe: string })[];
    readonly ohneKostengruppe: Kostenzeile;
    readonly nachlass: Kostenzeile;
    readonly gesamt: Kostenzeile;
  };
};
const angeboteFx = JSON.parse(readFileSync(new URL('typisch-angebote.json', wurzel), 'utf8')) as {
  readonly preisspiegel: { readonly bieter: readonly { readonly name: string; readonly datei: string }[] };
};

const BIETER = fx.zuschlag.bieterName;
const X84 = angeboteFx.preisspiegel.bieter.filter((b) => b.name === 'Bieter A' || b.name === BIETER);
const N01_TITEL = fx.nachtrag.lv.knoten.find((k) => k.art === 'titel');
const N01_POSITIONEN = fx.nachtrag.lv.knoten.filter((k) => k.art === 'position');
/** EP des Nachtragsangebots je Kurztext (die Kennungen des Nachtrags-LV vergibt die App). */
const N01_EP = new Map(
  N01_POSITIONEN.map((p) => [
    p.kurztext,
    fx.nachtrag.angebot.positionen.find((a) => a.positionId === p.id)?.einheitspreis ?? '',
  ]),
);
/** OZ und Kurztext je Kennung der Fixture: die Brücke zu den Kennungen der App. */
const POSITION = new Map(fx.positionen.map((p) => [p.positionId, p]));
const oz = (positionId: string): string => POSITION.get(positionId)?.oz ?? `? ${positionId}`;

/** Summenzeile des Grids in der Form der Fixture (de-DE). */
const summenDe = (s: Summen): Record<string, string> => ({
  Netto: betragDe(s.netto),
  Nachlass: betragDe(s.nachlass),
  'Netto nach Nachlass': betragDe(s.nettoNachNachlass),
  MwSt: betragDe(s.mwst),
  Brutto: betragDe(s.brutto),
});

// --- Seitenstücke --------------------------------------------------------------------------------------------------

const auftragsGrid = (page: Page): Locator =>
  page.getByRole('treegrid', { name: 'Positionen des Auftrags-LV' });

async function auftragsLvPruefen(page: Page, soll: Summen): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: /^Auftrags-LV – / })).toBeVisible();
  await expect(auftragsGrid(page)).toHaveAttribute('aria-readonly', 'true');
  await expect.poll(() => summen(page)).toMatchObject(summenDe(soll));
}

/** Die Zelle `spalte` der Zeile eines Grids, deren Zelle `schluessel` genau `text` zeigt. */
function zelle(grid: Locator, schluessel: string, text: string, spalte: string): Locator {
  return grid
    .locator('[role="row"]')
    .filter({
      has: grid.page().locator(`[data-spalte="${schluessel}"] .tx-grid__text`, {
        hasText: new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
      }),
    })
    .locator(`[data-spalte="${spalte}"] .tx-grid__text`);
}

const kontrolle = (page: Page): Locator => page.getByRole('treegrid', { name: 'Kostenkontrolle' });

/** Kostenkontrolle wie die Fixture; vor der ersten Rechnung bleibt die Spalte Abrechnung leer („–“). */
async function kostenkontrollePruefen(page: Page, mitAbrechnung: boolean): Promise<void> {
  const k = kontrolle(page);
  const kk = fx.kostenkontrolle;
  const abrechnung = (z: Kostenzeile): string => (mitAbrechnung ? betragDe(z.abrechnung) : '–');
  for (const z of kk.zeilen) {
    await expect(zelle(k, 'nummer', z.kostengruppe, 'budget')).toHaveText(betragDe(z.budget));
    await expect(zelle(k, 'nummer', z.kostengruppe, 'vergabe')).toHaveText(betragDe(z.vergabe));
    await expect(zelle(k, 'nummer', z.kostengruppe, 'abweichung')).toHaveText(betragDe(z.abweichung));
    if (mitAbrechnung)
      await expect(zelle(k, 'nummer', z.kostengruppe, 'abrechnung')).toHaveText(abrechnung(z));
  }
  // „Ohne Kostengruppe“ und „Nachlass“ haben kein Budget (D-37, D-82.5: „–“; die Fixture schreibt 0,00, D-85.3).
  for (const [name, z] of [
    ['Ohne Kostengruppe', kk.ohneKostengruppe],
    ['Nachlass', kk.nachlass],
  ] as const) {
    await expect(zelle(k, 'nummer', name, 'budget')).toHaveText('–');
    await expect(zelle(k, 'nummer', name, 'vergabe')).toHaveText(betragDe(z.vergabe));
    await expect(zelle(k, 'nummer', name, 'abweichung')).toHaveText(betragDe(z.abweichung));
    await expect(zelle(k, 'nummer', name, 'abrechnung')).toHaveText(abrechnung(z));
  }
  await expect(zelle(k, 'nummer', 'Gesamt', 'budget')).toHaveText(betragDe(kk.gesamt.budget));
  await expect(zelle(k, 'nummer', 'Gesamt', 'vergabe')).toHaveText(betragDe(kk.gesamt.vergabe));
  await expect(zelle(k, 'nummer', 'Gesamt', 'abweichung')).toHaveText(betragDe(kk.gesamt.abweichung));
  await expect(zelle(k, 'nummer', 'Gesamt', 'abrechnung')).toHaveText(abrechnung(kk.gesamt));
  await expect(page.getByText('Keine Hinweise.')).toBeVisible();
}

// Das Grid ist virtualisiert: Ein hohes Fenster hält alle Zeilen des Auftrags-LV samt Nachtrag sichtbar.
test.use({ viewport: { width: 1440, height: 2000 } });

test('Tor M4: Zuschlag → Nachtrag → Aufmaß → Soll/Ist → AR 1 frei → AR 2 → Korrektur → Kostenkontrolle → Neuladen', async ({
  page,
}) => {
  test.setTimeout(300_000);
  expect(X84).toHaveLength(2);
  expect(N01_POSITIONEN).toHaveLength(2);

  // --- Projekt, LV `typisch` per X83, zwei X84 ---------------------------------------------------------------------
  await projektAnlegen(page, 'Musterhaus', 'Bauherr');
  const projektPfad = new URL(page.url()).pathname;
  const projektId = decodeURIComponent(projektPfad.split('/').at(-1) ?? '');
  await gaebEinlesen(page, fixtureAlsX83('typisch'), fx.lvName);
  for (const b of X84) {
    await page.getByLabel('Angebotsdatei wählen').setInputFiles(new URL(b.datei, wurzel).pathname);
    const x84 = page.getByRole('dialog', { name: 'Angebot (X84) einlesen' });
    await expect(x84.getByLabel('Bieter')).toHaveValue(b.name);
    await x84.getByRole('button', { name: 'Übernehmen' }).click();
    const liste = page.getByRole('dialog', { name: 'Angebote' });
    await expect(liste.getByRole('row', { name: new RegExp(b.name) })).toBeVisible();
    await liste.getByRole('button', { name: 'Schließen', exact: true }).last().click();
    await expect(liste).toBeHidden();
  }

  // --- Zuschlag an Bieter B ohne Wahl (D-21, D-85.1): Alternative entfällt, 03.0070 ohne Preis ----------------------
  await page.getByRole('toolbar').getByRole('link', { name: 'Preisspiegel' }).click();
  await page
    .getByRole('table', { name: 'Bieter des Preisspiegels' })
    .getByRole('button', { name: `Zuschlag erteilen: ${BIETER}` })
    .click();
  const zuschlag = page.getByRole('dialog', { name: `Zuschlag erteilen – ${BIETER}` });
  await expect(zuschlag.getByTestId('zuschlag-entfallend')).toHaveText(String(fx.zuschlag.entfallen.length));
  await expect(zuschlag.getByTestId('zuschlag-unbepreist')).toHaveText(String(fx.zuschlag.ohnePreis.length));
  await zuschlag.getByRole('button', { name: 'Zuschlag erteilen', exact: true }).click();
  await expect(zuschlag).toBeHidden();
  await auftragsLvPruefen(page, fx.zuschlag.sollwerte.summen);
  await expect(page.getByTestId('auftragnehmer')).toHaveText(BIETER);
  const auftragPfad = new URL(page.url()).pathname;

  // --- Nachtrag N01: anlegen, zwei Positionen, Angebot des Auftragnehmers, angeboten, beauftragen (D-35) -------------
  await page.getByRole('button', { name: 'Nachtrag anlegen' }).click();
  const anlegen = page.getByRole('dialog', { name: 'Nachtrag anlegen' });
  await anlegen.getByLabel('Bezeichnung').fill('Zusatzleistungen Gründung');
  await anlegen.getByRole('button', { name: 'Anlegen' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Nachtrag N01 – Zusatzleistungen Gründung' }),
  ).toBeVisible();
  const nachtragsLvId = new URL(page.url()).pathname.split('/').at(-1) ?? '';
  await neueZeile(page, () => page.getByRole('button', { name: /^Titel anlegen/ }).click());
  await tippe(page, N01_TITEL?.kurztext ?? '', 'Enter');
  for (const p of N01_POSITIONEN) {
    await neueZeile(page, () => page.keyboard.press('Control+Alt+KeyP'));
    await tippe(page, p.kurztext);
    await tippe(page, eingabeDe(p.menge ?? ''));
    await tippe(page, p.einheit ?? '');
  }
  await expect
    .poll(async () => (await zeilen(page)).map((z) => z[1]))
    .toEqual([N01_TITEL?.kurztext, ...N01_POSITIONEN.map((p) => p.kurztext)]);

  await page.evaluate(() => window.tethysTest?.leerlauf());
  const datei = await page.evaluate((id) => window.tethysTest?.projektdatei(id as never), projektId);
  const nachtragsLv = (JSON.parse(datei ?? '{}') as Projektdatei).leistungsverzeichnisse.find(
    (l) => l.leistungsverzeichnis.id === nachtragsLvId,
  ) as LvZustand;
  const mitPreisen: LvZustand = {
    ...nachtragsLv,
    leistungsverzeichnis: {
      ...nachtragsLv.leistungsverzeichnis,
      knoten: nachtragsLv.leistungsverzeichnis.knoten.map((k) =>
        k.art === 'position'
          ? { ...k, einheitspreis: (N01_EP.get(k.kurztext) ?? null) as Einheitspreis | null }
          : k,
      ),
    },
  };
  await page.getByLabel('Excel-Datei wählen').setInputFiles({
    name: `${BIETER}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(lvAlsExcel(mitPreisen, { mitPreisen: true }).bytes),
  });
  const excel = page.getByRole('dialog', { name: 'Excel-Angebot einlesen' });
  await expect(excel.getByLabel('Bieter')).toHaveValue(BIETER);
  await excel.getByRole('button', { name: 'Übernehmen' }).click();
  const angebote = page.getByRole('dialog', { name: 'Angebote' });
  await angebote.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(angebote).toBeHidden();

  const band = page.getByRole('region', { name: 'Nachtrag', exact: true });
  await band.getByRole('combobox', { name: 'Status' }).click();
  await page.getByRole('option', { name: 'angeboten', exact: true }).click();
  await expect(band.getByTestId('nachtrag-status')).toHaveText('angeboten');
  await band.getByRole('button', { name: 'Beauftragen' }).click();
  const beauftragen = page.getByRole('dialog', { name: 'Nachtrag N01 beauftragen' });
  await expect(beauftragen.getByTestId('nachtrag-angebot')).toHaveText(
    `${betragDe(fx.nachtrag.angebot.sollwerte.summen.netto)} €`,
  );
  await expect(beauftragen.getByTestId('nachtrag-nachher')).toHaveText(
    `${betragDe(fx.nachtrag.sollwerte.summen.nettoNachNachlass)} €`,
  );
  await beauftragen.getByRole('button', { name: 'Beauftragen', exact: true }).click();
  await expect(beauftragen).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`${auftragPfad}$`));
  await auftragsLvPruefen(page, fx.nachtrag.sollwerte.summen);
  // Die übernommenen Positionen tragen die OZ nach D-35/D-80.1 (Gliederung 04, darunter 04.01).
  await expect
    .poll(async () => (await zeilen(page)).map((z) => z[0]))
    .toEqual(expect.arrayContaining(['04', '04.01', ...N01_POSITIONEN.map((p) => oz(p.id))]));

  // --- Kostenberechnung als Budget (Einträge der Fixture) ---------------------------------------------------------
  await page.getByRole('link', { name: 'Zum Projekt' }).click();
  await page.getByRole('link', { name: 'Kosten', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Kosten – Musterhaus' })).toBeVisible();
  await page.getByLabel('Name', { exact: true }).fill(fx.kostenermittlung.name);
  await page.getByRole('button', { name: 'Anlegen', exact: true }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: `Kostenermittlung – ${fx.kostenermittlung.name}` }),
  ).toBeVisible();
  const ermittlung = page.getByRole('treegrid', { name: 'Kostengruppen der Kostenermittlung' });
  for (const e of fx.kostenermittlung.eintraege) {
    await page.getByLabel('Kostengruppe (dreistellig)').fill(e.nummer);
    await page.getByLabel('Betrag (netto, €)').fill(betragDe(e.betrag));
    await page.getByLabel('Bemerkung', { exact: true }).fill(e.bemerkung ?? '');
    await page.getByRole('button', { name: 'Eintrag setzen', exact: true }).last().click();
    await expect(zelle(ermittlung, 'nummer', e.nummer, 'eigener')).toHaveText(betragDe(e.betrag));
    await expect(page.getByLabel('Kostengruppe (dreistellig)')).toHaveValue('');
  }
  await expect(zelle(ermittlung, 'nummer', 'Gesamt', 'summe')).toHaveText(
    betragDe(fx.kostenkontrolle.gesamt.budget),
  );

  // --- Kostengruppen am Auftrags-LV (D-85.8): je Kostengruppe die Positionen wählen, setzen (ein Schritt je KG) ------
  await page.goto(auftragPfad);
  await auftragsLvPruefen(page, fx.nachtrag.sollwerte.summen);
  await page.getByRole('button', { name: /^Kostengruppen/ }).click();
  const kg = page.getByRole('dialog', { name: 'Kostengruppen zuordnen' });
  const gruppen = new Map<string, (typeof fx.positionen)[number][]>();
  for (const p of fx.positionen)
    if (p.kostengruppe !== null) gruppen.set(p.kostengruppe, [...(gruppen.get(p.kostengruppe) ?? []), p]);
  for (const [nummer, positionen] of gruppen) {
    for (const p of positionen)
      await kg.getByRole('checkbox', { name: `${p.oz} ${p.kurztext} wählen` }).check();
    await kg.getByLabel('Kostengruppe (dreistellig)').fill(nummer);
    await kg.getByRole('button', { name: 'Setzen', exact: true }).click();
    await expect(kg.getByTestId('zuordnung-status')).toHaveText(
      positionen.length === 1
        ? 'Kostengruppe an 1 Position gesetzt'
        : `Kostengruppe an ${String(positionen.length)} Positionen gesetzt`,
    );
  }
  for (const p of fx.positionen)
    await expect(
      kg
        .getByRole('row', { name: new RegExp(`^\\s*${p.oz.replace(/\./g, '\\.')}\\s`) })
        .locator('.zuordnung__kg'),
    ).toHaveText(p.kostengruppe ?? '–');
  await kg.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(kg).toBeHidden();
  await auftragsLvPruefen(page, fx.nachtrag.sollwerte.summen);

  // --- Kostenkontrolle vor der ersten Rechnung: Budget, Vergabe und Abweichung wie die Fixture ----------------------
  await page.getByRole('link', { name: 'Zum Projekt' }).click();
  await page.getByRole('link', { name: 'Kosten', exact: true }).click();
  await page.getByRole('link', { name: 'Kostenkontrolle' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Kostenkontrolle – Musterhaus' })).toBeVisible();
  await kostenkontrollePruefen(page, false);
  await expect(page.getByText('Noch keine Rechnung: Die Spalte Abrechnung bleibt leer.')).toBeVisible();

  // TODO(Ticket 87/88): Aufmaß, Soll/Ist, Rechnungen, Korrektur, Kostenkontrolle mit Abrechnung, Neuladen.
});
