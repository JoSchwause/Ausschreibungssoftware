// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 86 (A1, D-35): Nachtrag im Ablauf wie Tor M4 (Ticket 85). Zuschlag an Bieter B wie in M3 (X84 über die
// Oberfläche, ohne Wahl) → „Nachtrag anlegen“ auf der Seite des Auftrags-LV → zwei Positionen im Grid → Angebot des
// Auftragnehmers über den Excel-Rücklauf → Status „angeboten“ → „Beauftragen“ mit Vorschau → das Auftrags-LV zeigt die
// Gliederung „Nachtrag N01“ und die neue Summe → Rückgängig/Wiederholen → Neuladen.
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
  const inhalt = fixtureInhalt('typisch');
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

  // Angebot des Auftragnehmers über den Excel-Rücklauf: Datei aus dem gespeicherten Nachtrags-LV mit den EP der Fixture.
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
  await page.getByLabel('Excel-Datei wählen').setInputFiles({
    name: `${BIETER}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(lvAlsExcel(mitPreisen, { mitPreisen: true }).bytes),
  });
  const excel = page.getByRole('dialog', { name: 'Excel-Angebot einlesen' });
  await expect(excel.getByLabel('Bieter')).toHaveValue(BIETER);
  await excel.getByRole('button', { name: 'Übernehmen' }).click();
  await angebote.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(angebote).toBeHidden();

  // Der Preisspiegel des Nachtrags-LV vergleicht die Angebote, erteilt aber keinen Zuschlag (D-42, Review P2).
  await page.goto(`${nachtragPfad}/preisspiegel`);
  const bieter = page.getByRole('table', { name: 'Bieter des Preisspiegels' });
  await expect(bieter.getByRole('row', { name: new RegExp(BIETER) })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Zuschlag erteilen/ })).toHaveCount(0);
  await expect(page.getByText(/Nachtrag N01 ist ein Nachtrags-LV und bekommt keinen Zuschlag/)).toBeVisible();
  await page.goto(nachtragPfad);

  // Status „angeboten“ über die Statuswahl des Kopfbands; „beauftragt“ ist dort nicht wählbar.
  await band.getByRole('combobox', { name: 'Status' }).click();
  await expect(page.getByRole('option', { name: /^beauftragt/ })).toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('option', { name: 'angeboten', exact: true }).click();
  await expect(band.getByTestId('nachtrag-status')).toHaveText('angeboten');

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
