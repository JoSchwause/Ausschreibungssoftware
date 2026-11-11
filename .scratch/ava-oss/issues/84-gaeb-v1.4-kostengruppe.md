# 84: `gaeb` v1.4: Kostengruppe als Katalogzuordnung, neue Felder beim Export

Status: claimed
Type: task
Welle: 5 · Strang: G, C2 · Paket: `packages/gaeb`
Blocked by: 70, 83
Regeln: Q3, Q5, U5, E-11, ADR 0010, D-36
Herkunft: `vertrag` v1.4 (Ticket 70, Comments „Folgearbeit GAEB“)

## What to build

1. **Kostengruppe** (`Positionsdaten.kostengruppe`) in X81/X83/X84/X86 schreiben und lesen als Katalogzuordnung der Position
   (GAEB `CtlgAssign` mit einem Katalog für die DIN-276-Kostengliederung im `BoQInfo`; nur die Nummer, keine Bezeichnung,
   G-16). Form aus dem XSD herleiten; XSD-Gegenprüfung grün. Eine Datei mit anderer Katalogart: Befund, nichts erfunden.
2. **Neue Felder ohne GAEB-Gegenstück** (`textquelle`, `vorlage`, `nachtrag`): beim Export mit Warnung verworfen (E-11, Q5:
   kein stiller Verlust); im Rundweg-Test als bekannte Ausnahme gelistet.
3. Rundweg (Q3) mit Kostengruppen an `typisch`.

## Grenzen

- Nur `packages/gaeb`. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Rundweg mit Kostengruppen, XSD-Gegenprüfung grün, Warnungen getestet
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

### Umsetzung (Branch `welle-5/84-gaeb-kostengruppe`, ab `welle-5/83-x31`)

Seams (Demo-Modus, statt Abstimmung mit dem Nutzer): `leseGaeb` und `schreibeGaeb`. Neu `packages/gaeb/src/kostengruppe.ts`
(Regeln der Katalogzuordnung), Anschluss in `lesen.ts` (`Item`, `MarkupItem`, `BoQInfo/Ctlg`) und `schreiben.ts`. Form aus dem
XSD 3.3 (2021-05) und 3.2 (2013-10): `BoQInfo/Ctlg` (`CtlgID`, `CtlgType`, `CtlgName`) steht am Ende von `BoQInfo` hinter
`Totals`; `CtlgAssign` (`CtlgID`, `CtlgCode`, in 3.3 wahlweise `Quantity`) steht im `Item` hinter `QU`, im `MarkupItem` hinter
`Description`. Die BVBS-AVA-Prüfdatei trägt einen Katalog `cost group DIN 276-06` mit sechs Zuordnungen an Items.

- **D-84.1** Welche Katalogart ist die Kostengruppe? → Lesen: `cost group DIN 276-06`, `cost group DIN 276-1 2008-12` und
  `cost group DIN 276 2018-12` (dreistellige Gliederung 100–800, die die Ableitung aus den Ziffern trägt, D-24). Andere
  Ausgaben (`-81`, `-93`): Befund `katalog-nicht-abgebildet`, keine Kostengruppe; andere Katalogarten (Leistungsbereich, Ort,
  Kostenträger, BIM …): Befund `nicht-abgebildet` je Art. Schreiben: Katalog `DIN276`, Name „DIN 276“, Art die neueste
  Ausgabe, die das Schema der Version kennt (3.3: 2018-12; 3.2: 2008-12). Grund: Das Modell kennt keine Ausgabe; die
  Nummern sind in den drei Ausgaben gleich gebaut. Reversible: yes.
- **D-84.2** Was wird nicht übernommen? → Ein Code, der keine Kostengruppennummer ist (`kostengruppe-ungueltig`), eine
  Zuordnung mit `Quantity` (Aufteilung, `kostengruppe-anteil`), eine zweite Kostengruppe an derselben Position
  (`kostengruppe-mehrfach`, die erste gilt), Zuordnungen an Gliederungen und Unterbeschreibungen und in `QtySplit`
  (bleiben `nicht-abgebildet`, Offene Typfrage 5 in Ticket 70: nur an Positionen). Alles Warnungen (U5). Reversible: yes.
- **D-84.3** X84? → Das XSD der Phase 84 (3.3 und 3.2) kennt weder `Ctlg` noch `CtlgAssign`, ein Angebot trägt keine
  Kostengruppe (sie gehört zum LV). Der Angebotsleser bleibt unverändert; geschrieben wird X84 nicht. Reversible: yes.
- **D-84.4** `textquelle`, `vorlage`, `nachtrag`? → Beim Export Warnung `export-verworfen` („Textquelle der Position“,
  „Kennzeichen Muster-LV“, „Nachtragsangaben des LV“). `vorlage` und `nachtrag` stehen am `LvKopf`, nicht am `LvInhalt`:
  `schreibeGaeb` nimmt dafür neu `SchreibInhalt = (LvInhalt & Partial<Pick<LvKopf,'nachtrag'|'vorlage'>>) |
  AuftragsLeistungsverzeichnis` (exportiert). Die App gibt sie heute nicht mit (`lvInhalt` in `apps/web/src/lv/inhalt.ts`
  nimmt nur `LvInhaltKopf`); damit der Nutzer die Warnung sieht, muss die App sie weiterreichen (Folgearbeit App,
  Ticket 86/90). Reversible: yes.
- **D-84.5** Rundweg (Q3)? → `typisch` mit Kostengruppen an jeder zweiten Position (`mitKostengruppen` in `testhilfen.ts`,
  die Fixture selbst bleibt unverändert, P2) als X81/X83/X86 × 3.3/3.2: gleich bis auf die Wahlnummern wie bisher; der
  zweite Export ist byte-gleich. Die Textquelle steht als bekannte Ausnahme in `phasenform` (`roundtrip.test.ts`). Die
  amtliche BVBS-AVA-Datei behält im Rundweg ihre sechs Kostengruppen. XSD-Gegenprüfung um `typisch-kg` (6 Dateien)
  erweitert. Reversible: yes.

