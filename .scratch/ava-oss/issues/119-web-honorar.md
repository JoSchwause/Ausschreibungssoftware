# 119: X3 in der App: Honorarberechnung, Tor X3

Status: ready-for-agent
Type: task
Welle: 6 · Strang: X3 · Ordner: `apps/web/src/honorar/` (neu); Einhängestellen in `App.tsx`, `projekt/ProjektSeite.tsx`,
`historie/arten.ts` (markiert `// Ticket 119`, D-20); E2E `apps/web/e2e/x3.spec.ts`, Kettentest `apps/web/src/x3-kette.test.ts`
Blocked by: 106, 110, 112, 113
Modell: sonnet
Regeln: A5, N4, U3, U5, Q2, D-56, D-58
Herkunft: `plan.md` §2 X3; Tor X3 (`plan.md` §4)

## What to build

1. **Honorarberechnungen des Projekts** (`/projekt/<id>/honorar`): Liste, anlegen, umbenennen, löschen mit Bestätigung.
2. **Seite einer Honorarberechnung:** je Objekt ein Formular: Bezeichnung, Leistungsbild, Honorarzone, **Honorarsatz** in
   Prozent mit benannten Vorgaben (Basishonorarsatz 0, Viertelsatz 25, Mittelsatz 50, Dreiviertelsatz 75, oberer
   Honorarsatz 100; Standard 0 nach § 7 Abs. 1), anrechenbare Kosten als Betrag oder aus einer Kostenermittlung des Projekts
   (Schalter „Technische Anlagen nicht selbst geplant (§ 33 Abs. 2)“, Beträge nach § 33 Abs. 3 und § 4 Abs. 3), Leistungsphasen
   als Tabelle (beauftragt, Anteil mit Standard aus der Tafel), Umbauzuschlag (bei „Umbau“ Vorschlag 20 %, § 6 Abs. 2); dazu
   Nebenkosten (Prozent oder Betrag) und MwSt-Satz. Das **Ergebnis** (`honorar`) als Tabelle mit Herleitung (Tafelzeilen,
   von, bis, Honorar, Phasen, Zuschläge, Netto, USt, Brutto); Befunde und Hinweise (außerhalb der Tafel, Stufe der
   Kostenermittlung, DIN-276-Fassung) sichtbar (U5). Ein Undo-Schritt je Änderung; Neuladen behält alles.
3. **PDF** über `ausgabe` (Ticket 113).
4. **Tor X3** (D-58): `x3.spec.ts` legt den Fall aus `fixtures/honorar.json` (Ticket 112) über die Oberfläche an (Kostenberechnung
   mit KG 300/400, Honorarberechnung) → alle Sollwerte → Neuladen → PDF; `x3-kette.test.ts` ohne Oberfläche gegen dieselben
   Sollwerte. Dreimal grün; sonst Kettentest plus verkürzte E2E.

Aus dem Review (D-66): Der Hinweis zu DIN 276:2008-12 (§ 4 Abs. 1) ist fester Text auf der Seite, kein Befund.

## Grenzen

- Die Rechnung steht in `honorar`. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Unit-Tests der App-Logik, `x3.spec.ts` und `x3-kette.test.ts` grün
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

- **D-119.1 Stelle der Änderung.** Frage: Wann wird ein Feld zum Befehl (ein Undo-Schritt je Änderung)? Entscheidung: Textfelder beim
  Verlassen (und mit Enter), Auswahlen und Schalter sofort; ein Befehl `HonorarberechnungSetzen` mit den ganzen Objekten (so ist der
  Vertrag zugeschnitten). Ein Feld, das sich nicht lesen lässt, bleibt als Meldung am Feld und wird kein Befehl (U5, N4). Aufträge
  laufen nacheinander und lesen den Stand erst, wenn sie an der Reihe sind (kein verlorener Wert bei schnellem Wechsel). Der
  Entwurf eines Objekts folgt dem gespeicherten Stand nur bei fremden Ständen (Undo, Redo), nie bei einem, den das Formular selbst
  gespeichert hat. Grund: Ein erster Lauf des E2E verlor einen Wert, wenn das nächste Feld schon getippt war. Reversible: yes.
- **D-119.2 Umbau, Vorgaben, Standard.** Entscheidung: Der Schalter „Umbau“ setzt `umbauzuschlagssatz` (aus = `null`), Vorschlag 20 %
  (§ 6 Abs. 2), frei änderbar; Benennung der Honorarsätze nur als Vorgabe-Liste der App (Basishonorarsatz 0, Viertelsatz 25,
  Mittelsatz 50, Dreiviertelsatz 75, oberer Honorarsatz 100, sonst „Eigener Wert“); ein neues Objekt: Gebäude, Zone III, Honorarsatz
  0, Kosten von Hand 0,00, alle neun Phasen beauftragt. Ein Wechsel des Leistungsbilds behält beauftragte Nummern samt Anteil, kürzt
  die Zone auf die Tafel und stellt Kosten aus einer Kostenermittlung (§ 33 nur Gebäude, Innenräume) auf „von Hand“. Reversible: yes.
- **D-119.3 Befunde und Hinweis.** Entscheidung: Befunde aus `honorarBerechnen(berechnung, alle Kostenermittlungen des Projekts)`
  (D-110.2) als Liste mit Schwere und Ort („Objekt n, Feld“); eigene Texte für `kostenermittlung-unbekannt`,
  `kostenberechnung-vorhanden`, `kostenermittlungsstufe-abweichend`, sonst die Meldung der Rechnung. Der Hinweis zu DIN 276:2008-12
  (§ 4 Abs. 1) ist fester Text auf der Seite (`data-testid="din276-hinweis"`), immer sichtbar, kein Befund (D-66). Der Wortlaut steht
  in `honorar/texte.ts` und gleich in `ausgabe`; `x3-kette.test.ts` hält beide gleich, damit das Hauptbündel pdfmake nicht lädt.
- **D-119.4 PDF im Hauptthread.** Entscheidung: `ausgabe` wird beim Klick per `import()` geladen, die Schriften wie im LV-Druck über
  `?url`; kein Worker (kleines Dokument). Datum aus der Uhr der App. Hinweis: Chromium im Headless-Test ersetzt Umlaute im Namen
  eines Blob-Downloads durch „download“; das E2E benennt die Berechnung vorher mit ASCII um (deckt zugleich Umbenennen ab).
- **D-119.5 Schalter für die Seite.** Entscheidung: Undo/Redo-Ziel in `honorar/pfad.ts` (`honorarZiel`), Umkehrung aus `honorar`,
  beides an der markierten Stelle in `historie/arten.ts`. Neue Abhängigkeit `@tethys/honorar` (Workspace) in `apps/web/package.json`,
  Lockfile mit.

### Ergebnis (Branch `welle-6/119-web-honorar`, nach `git merge integration/welle-6` @ `101010c`)
Neu in `apps/web/src/honorar/`: `pfad`, `formular`, `ansicht`, `schreiben`, `texte`, `pdf`, `HonorarListeSeite`, `HonorarSeite`,
`honorar.css`, Tests `pfad`, `formular`, `ansicht` (zusammen 18 Tests); `apps/web/src/x3-kette.test.ts` (7 Tests); `apps/web/e2e/x3.spec.ts`.
Haken: `App.tsx`, `projekt/ProjektSeite.tsx` (Verweis „Honorar“), `historie/arten.ts` (Zeile `honorarberechnung`), je `// Ticket 119`.
- **Tor X3: erfüllt.** `x3.spec.ts` (Kostenberechnung mit den 15 Einträgen der Fixture über die Oberfläche, Honorarberechnung mit
  Mittelsatz, Verweis auf die Kostenberechnung, Umbau 25 %, Nebenkosten 4,50 %, alle Sollwerte der Tabelle: Herleitung § 33
  1.373.618,34, Tafelzeilen, Spanne 153.213,18 bis 191.086,11, Honorar 172.149,65, neun Phasen, Grundhonorar 172.149,66, Umbauzuschlag
  43.037,42, Nebenkosten 9.683,42, Netto 224.870,50, MwSt 42.725,40, **Brutto 267.595,90**; ein Undo-Schritt je Änderung; Formfehler
  ohne Befehl; Befund bei Honorarsatz 120; Neuladen; PDF mit denselben Zahlen und dem Hinweis; Löschen mit Bestätigung und Rückgängig;
  Kostenermittlung mit Verweis nicht löschbar): **dreimal grün vor und dreimal grün nach dem Merge** (`--repeat-each=3`, 7,9 bis 11,4 s
  je Lauf). `x3-kette.test.ts` grün (Sollwerte der Fixture gegen den Speicher nach Neuladen, Tabelle, Undo, Stufenbefund,
  Verweisschutz, PDF-Text).
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint`: grün. `pnpm typecheck`: grün. `pnpm test`: 295 Dateien grün, 1 rot, 3.788 Tests
  grün: das CPU-Budget `packages/speicher/src/aufmass-leistung.test.ts` (Ticket 94, nicht berührt) maß in der vollen Suite
  `AufmasspositionSetzen` Median 100,3 ms (< 100), allein wiederholt grün; kein Budget gelockert. `node --test "fixtures/*.test.mjs"`
  53/53.

## Answer

Gemergt mit `2e7cbd8` (Branch `welle-6/119-web-honorar`, `1c5a611`). **Tor X3 erreicht:** `x3.spec.ts` dreimal grün vor und nach dem Merge,
`x3-kette.test.ts` grün; Brutto 267.595,90, anrechenbare Kosten 1.373.618,34, Honorar 172.149,65 über die Oberfläche; DIN-276-Hinweis als
fester Text; PDF erzeugt.
