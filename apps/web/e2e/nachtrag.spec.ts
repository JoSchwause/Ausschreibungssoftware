// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 86 (A1, D-35): Nachtrag im Ablauf wie Tor M4 (Ticket 85). Zuschlag an Bieter B wie in M3 (X84 über die
// Oberfläche, ohne Wahl) → „Nachtrag anlegen“ auf der Seite des Auftrags-LV → zwei Positionen im Grid → Angebot des
// Auftragnehmers über den Excel-Rücklauf → Status „angeboten“ → „Beauftragen“ mit Vorschau → das Auftrags-LV zeigt die
// Gliederung „Nachtrag N01“ und die neue Summe → Rückgängig/Wiederholen → Neuladen.
// Ticket 151: auf dem geführten Weg. Das Kopfband zeigt die Schritte; „Angebot des Auftragnehmers einlesen“ belegt den
// Auftragnehmer als Bieter vor (der Dateiname nennt ihn nicht), danach schlägt das Band „angeboten“ vor, dann ist
// „Beauftragen“ der nächste Schritt. Dazu auf dem Auftrags-LV: Positionsdialog nur lesen mit Langtext und „Excel“.
//
// LV `typisch` kommt wie in M3 über den Testpfad (D-64.1). Die Rücklaufdatei entsteht im Test aus dem gespeicherten
// Nachtrags-LV mit den EP des Nachtragsangebots der Fixture (wie `ausgabe.spec.ts`). Alle erwarteten Zahlen stehen in
// `typisch-abrechnung.json` (Zuschlag, Nachtragsangebot, Summen nach der Übernahme), nie aus einem Lauf des Kerns.

import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import type { Einheitspreis, LvZustand, Projektdatei } from '@tethys/vertrag';
import { lvAlsExcel } from '../../../packages/ausgabe/src/index';
import { fixtureInhalt } from './fixture-inhalt';
import { betragDe, eingabeDe, neueZeile, projektAnlegen, summen, tippe, zeilen } from './hilfen';
import { werkzeug } from './werkzeuge';

type Summen = Readonly<Record<'netto' | 'nachlass' | 'nettoNachNachlass' | 'mwst' | 'brutto', string>>;
const wurzel = new URL('../../../fixtures/', import.meta.url);
const fx = JSON.parse(readFileSync(new URL('typisch-abrechnung.json', wurzel), 'utf8')) as {
  zuschlag: { bieterName: string; sollwerte: { summen: Summen } };
  nachtrag: {
    lv: {
      knoten: readonly {
        id: string;
        art: string;
        kurztext: string;
        menge?: string;
        einheit?: string;
      }[];
    };
    angebot: {
      positionen: readonly { positionId: string; einheitspreis: string }[];
      sollwerte: { summen: Summen };
    };
    sollwerte: { summen: Summen };
  };
};
const BIETER = fx.zuschlag.bieterName;
/** Die erste Position von `typisch` mit Langtext (in der Fixture als Klartext). */
const MIT_LANGTEXT = (
  JSON.parse(readFileSync(new URL('typisch.json', wurzel), 'utf8')) as {
    knoten: readonly {
      id: string;
      art: string;
      ordnungszahl?: string;
      kurztext?: string;
      langtext?: string;
    }[];
  }
).knoten.find((k) => k.art === 'position' && (k.langtext ?? '') !== '');
const TITEL = fx.nachtrag.lv.knoten.find((k) => k.art === 'titel');
const POSITIONEN = fx.nachtrag.lv.knoten.filter((k) => k.art === 'position');
/** EP des Nachtragsangebots je Kurztext (die Kennungen vergibt die App neu). */
const EP = new Map(
  POSITIONEN.map((p) => [
    p.kurztext,
    fx.nachtrag.angebot.positionen.find((a) => a.positionId === p.id)?.einheitspreis ?? '',
  ]),
);

/** Summenzeile des Grids in der Form der Fixture (de-DE). */
const summenDe = (s: Summen): Record<string, string> => ({
  Netto: betragDe(s.netto),
  Nachlass: betragDe(s.nachlass),
  'Netto nach Nachlass': betragDe(s.nettoNachNachlass),
  MwSt: betragDe(s.mwst),
  Brutto: betragDe(s.brutto),
});

async function auftragsLvPruefen(page: Page, soll: Summen): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: /^Auftrags-LV – / })).toBeVisible();
  await expect(page.getByRole('treegrid', { name: 'Positionen des Auftrags-LV' })).toHaveAttribute(
    'aria-readonly',
    'true',
  );
  await expect.poll(() => summen(page)).toMatchObject(summenDe(soll));
}

const nachtragsliste = (page: Page) => page.getByRole('table', { name: 'Nachträge des Auftrags-LV' });

// Das Grid ist virtualisiert: Ein hohes Fenster hält alle Zeilen des Auftrags-LV samt Nachtrag sichtbar.
test.use({ viewport: { width: 1440, height: 2000 } });

test('Nachtrag: anlegen, Angebot des Auftragnehmers, beauftragen, Rückgängig/Wiederholen, Neuladen', async ({
  page,
}) => {
  test.setTimeout(120_000);
  expect(POSITIONEN).toHaveLength(2);

  // Zuschlag wie in M3: Projekt, LV `typisch` (Testpfad), X84 von Bieter B über die Oberfläche, Zuschlag ohne Wahl.
  // Der Testpfad liest `typisch` ohne Langtexte; die erste Position mit Langtext bekommt ihn als Absatz (Ticket 151).
  const roh = fixtureInhalt('typisch');
  const inhalt = {
    ...roh,
    knoten: roh.knoten.map((k) =>
      k.id === MIT_LANGTEXT?.id && k.art === 'position'
        ? {
            ...k,
            langtext: [
              {
                art: 'absatz' as const,
                inhalt: [{ art: 'text' as const, text: MIT_LANGTEXT.langtext ?? '' }],
              },
            ],
          }
        : k,
    ),
  };
  await projektAnlegen(page, 'Musterhaus', 'Bauherr');
  const projektId = decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1) ?? '');
  const r = await page.evaluate(([id, lv]) => window.tethysTest?.lvAnlegen(id as never, lv as never), [
    projektId,
    inhalt,
  ] as const);
  expect(r?.ok).toBe(true);
  await page.goto(`/lv/${inhalt.wurzelId}`);
  await page
    .getByLabel('Angebotsdatei wählen')
    .setInputFiles(new URL('angebote/typisch-bieter-b.x84', wurzel).pathname);
  const x84 = page.getByRole('dialog', { name: 'Angebot (X84) einlesen' });
  await expect(x84.getByLabel('Bieter')).toHaveValue(BIETER);
  await x84.getByRole('button', { name: 'Übernehmen' }).click();
  const angebote = page.getByRole('dialog', { name: 'Angebote' });
  await angebote.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(angebote).toBeHidden();
  await werkzeug(page, 'Angebote', 'Preisspiegel');
  await page
    .getByRole('table', { name: 'Bieter des Preisspiegels' })
    .getByRole('button', { name: `Zuschlag erteilen: ${BIETER}` })
    .click();
  const zuschlag = page.getByRole('dialog', { name: `Zuschlag erteilen – ${BIETER}` });
  await zuschlag.getByRole('button', { name: 'Zuschlag erteilen', exact: true }).click();
  await auftragsLvPruefen(page, fx.zuschlag.sollwerte.summen);
  const auftragPfad = new URL(page.url()).pathname;
  await expect(page.getByRole('region', { name: 'Nachträge', exact: true })).toContainText(
    'Noch kein Nachtrag.',
  );

  // Ticket 151: Positionsdialog nur lesen. Doppelklick öffnet ihn; der Langtext ist zu lesen, nicht zu bearbeiten.
  const kurztext = MIT_LANGTEXT?.kurztext ?? '';
  const zelleKurztext = page
    .locator('[role="treegrid"] [data-spalte="kurztext"]')
    .filter({ hasText: kurztext })
    .first();
  await zelleKurztext.dblclick();
  const position = page.getByRole('dialog', { name: `${MIT_LANGTEXT?.ordnungszahl ?? ''} ${kurztext}` });
  const langtext = position.getByRole('textbox', { name: 'Langtext', exact: true });
  await expect(langtext).toContainText(MIT_LANGTEXT?.langtext ?? '');
  await expect(langtext).toHaveAttribute('contenteditable', 'false');
  await expect(position.getByRole('button', { name: 'Übernehmen' })).toHaveCount(0);
  await expect(position.getByRole('definition').first()).toHaveText(MIT_LANGTEXT?.ordnungszahl ?? '');
  await position.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(position).toBeHidden();
  // Per Tastatur: Strg+Enter auf der Zeile, Escape schließt.
  await zelleKurztext.focus();
  await page.keyboard.press('Control+Enter');
  await expect(position).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(position).toBeHidden();

  // Ticket 151: Excel des Auftrags-LV über das Menü „Ausgabe“.
  await werkzeug(page, 'Ausgabe', 'Excel');
  const excelAusgabe = page.getByRole('dialog', { name: 'Auftrags-LV als Excel ausgeben' });
  await expect(excelAusgabe.getByTestId('excel-dateiname')).toHaveText(/-Auftrag\.xlsx$/);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    excelAusgabe.getByRole('button', { name: 'Herunterladen' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/-Auftrag\.xlsx$/);
  expect(
    readFileSync(await download.path())
      .subarray(0, 2)
      .toString('latin1'),
  ).toBe('PK');
  await excelAusgabe.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(excelAusgabe).toBeHidden();

  // „Nachtrag anlegen“: Bezeichnung eingeben, danach steht die LV-Seite des Nachtrags mit dem Kopfband offen.
  await page.getByRole('button', { name: 'Nachtrag anlegen' }).click();
  const anlegen = page.getByRole('dialog', { name: 'Nachtrag anlegen' });
  await anlegen.getByLabel('Bezeichnung').fill('Zusatzleistungen Gründung');
  await anlegen.getByRole('button', { name: 'Nachtrag anlegen' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Nachtrag N01 – Zusatzleistungen Gründung' }),
  ).toBeVisible();
  const band = page.getByRole('region', { name: 'Nachtrag', exact: true });
  await expect(band).toContainText(/Nachtrag N01 zu .+ · angemeldet/);
  const nachtragPfad = new URL(page.url()).pathname;
  const nachtragsLvId = nachtragPfad.split('/').at(-1) ?? '';
  // Ticket 151: Schrittanzeige; der nächste Schritt trägt `aria-current="step"`.
  const schritte = band.getByRole('list', { name: 'Schritte bis zur Beauftragung' });
  const naechsterSchritt = schritte.locator('[aria-current="step"]');
  await expect(schritte.getByRole('listitem')).toHaveCount(4);
  await expect(naechsterSchritt).toContainText('Leistungen erfassen');

  // Zwei Positionen unter einem Titel, wie der Nachtrag N01 der Fixture (ohne Preise: die kommen vom Auftragnehmer).
  await neueZeile(page, () => werkzeug(page, 'Einfügen', /^Titel anlegen/));
  await tippe(page, TITEL?.kurztext ?? '', 'Enter');
  for (const p of POSITIONEN) {
    await neueZeile(page, () => page.keyboard.press('Control+Alt+KeyP'));
    await tippe(page, p.kurztext);
    await tippe(page, eingabeDe(p.menge ?? ''));
    await tippe(page, p.einheit ?? '');
  }
  await expect
    .poll(async () => (await zeilen(page)).map((z) => z[1]))
    .toEqual([TITEL?.kurztext, ...POSITIONEN.map((p) => p.kurztext)]);
  await expect(naechsterSchritt).toContainText('Angebot des Auftragnehmers');

  // Angebot des Auftragnehmers über den Excel-Rücklauf: Datei aus dem gespeicherten Nachtrags-LV mit den EP der Fixture.
  // Geführt: über das Kopfband; der Dateiname nennt den Bieter nicht, der Auftragnehmer ist trotzdem vorbelegt.
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
          ? { ...k, einheitspreis: (EP.get(k.kurztext) ?? null) as Einheitspreis | null }
          : k,
      ),
    },
  };
  await expect(band.getByRole('button', { name: 'Angebot des Auftragnehmers einlesen' })).toBeVisible();
  await band.getByLabel('Angebotsdatei des Auftragnehmers wählen').setInputFiles({
    name: 'Nachtragsangebot.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(lvAlsExcel(mitPreisen, { mitPreisen: true }).bytes),
  });
  const excel = page.getByRole('dialog', { name: 'Angebot des Auftragnehmers einlesen' });
  await expect(excel.getByLabel('Bieter')).toHaveValue(BIETER);
  await expect(excel.getByTestId('anzahl-angeboten')).toHaveText(String(POSITIONEN.length));
  await excel.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(excel).toBeHidden();

  // Nach dem Einlesen schlägt das Band den Status „angeboten“ vor; „beauftragt“ ist in der Statuswahl nicht wählbar.
  await expect(naechsterSchritt).toContainText('Status „angeboten“');
  await expect(band.getByTestId('nachtrag-naechster')).toContainText('Vorschlag: Status „angeboten“');
  await band.getByRole('combobox', { name: 'Status' }).click();
  await expect(page.getByRole('option', { name: /^beauftragt/ })).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Escape');
  await band.getByRole('button', { name: 'Status „angeboten“ setzen' }).click();
  await expect(band.getByTestId('nachtrag-status')).toHaveText('angeboten');
  await expect(naechsterSchritt).toContainText('Beauftragen');
  await expect(band.getByRole('button', { name: 'Status „angeboten“ setzen' })).toHaveCount(0);

  // Der Preisspiegel des Nachtrags-LV vergleicht die Angebote, erteilt aber keinen Zuschlag (D-42, Review P2).
  await page.goto(`${nachtragPfad}/preisspiegel`);
  const bieter = page.getByRole('table', { name: 'Bieter des Preisspiegels' });
  await expect(bieter.getByRole('row', { name: new RegExp(BIETER) })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Zuschlag erteilen/ })).toHaveCount(0);
  await expect(page.getByText(/Nachtrag N01 ist ein Nachtrags-LV und bekommt keinen Zuschlag/)).toBeVisible();
  await page.goto(nachtragPfad);
  await expect(naechsterSchritt).toContainText('Beauftragen');

  // Beauftragen: Vorschau mit den Zahlen der Fixture, dann zur Seite des Auftrags-LV.
  await band.getByRole('button', { name: 'Beauftragen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nachtrag N01 beauftragen' });
  await expect(dialog.getByTestId('nachtrag-positionen')).toHaveText('2');
  await expect(dialog.getByTestId('nachtrag-angebot')).toHaveText(
    `${betragDe(fx.nachtrag.angebot.sollwerte.summen.netto)} €`,
  );
  await expect(dialog.getByTestId('nachtrag-vorher')).toHaveText(
    `${betragDe(fx.zuschlag.sollwerte.summen.nettoNachNachlass)} €`,
  );
  await expect(dialog.getByTestId('nachtrag-nachher')).toHaveText(
    `${betragDe(fx.nachtrag.sollwerte.summen.nettoNachNachlass)} €`,
  );
  await dialog.getByRole('button', { name: 'Beauftragen', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`${auftragPfad}$`));
  await auftragsLvPruefen(page, fx.nachtrag.sollwerte.summen);
  await expect.poll(async () => (await zeilen(page)).map((z) => z[1])).toContain('Nachtrag N01');
  await expect(nachtragsliste(page).getByTestId('nachtrag-status')).toHaveText('beauftragt');

  // Rückgängig nimmt beides zurück (ein Schritt): alte Summe, Status wieder „angeboten“.
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await auftragsLvPruefen(page, fx.zuschlag.sollwerte.summen);
  await expect(nachtragsliste(page).getByTestId('nachtrag-status')).toHaveText('angeboten');
  expect((await zeilen(page)).map((z) => z[1])).not.toContain('Nachtrag N01');

  // Wiederholen schreibt beides wieder und bleibt auf dem Auftrags-LV; die Nachtragsliste zeigt den Status (D-86.7).
  await page.getByRole('button', { name: /^Wiederholen/ }).click();
  await auftragsLvPruefen(page, fx.nachtrag.sollwerte.summen);
  await expect(page).toHaveURL(new RegExp(`${auftragPfad}$`));
  await expect(nachtragsliste(page).getByTestId('nachtrag-status')).toHaveText('beauftragt');
  await page.goto(nachtragPfad);
  await expect(band.getByTestId('nachtrag-status')).toHaveText('beauftragt');
  await expect(band.getByRole('button', { name: 'Beauftragen' })).toBeDisabled();
  await band.getByRole('link').click();
  await auftragsLvPruefen(page, fx.nachtrag.sollwerte.summen);

  // Neuladen: Auftrags-LV mit Nachtrag, Liste und Kennzeichen auf der Projektseite sind noch da.
  await page.reload();
  await auftragsLvPruefen(page, fx.nachtrag.sollwerte.summen);
  await expect(nachtragsliste(page).getByRole('row', { name: /N01/ })).toContainText(
    `${betragDe(fx.nachtrag.angebot.sollwerte.summen.netto)} €`,
  );
  await page.getByRole('link', { name: 'Zum Projekt' }).click();
  const lvs = page.getByRole('list', { name: 'Leistungsverzeichnisse', exact: true });
  await expect(
    lvs.getByRole('listitem').filter({ hasText: 'Nachtrag N01 – Zusatzleistungen Gründung' }),
  ).toContainText('Nachtrag N01');
});
