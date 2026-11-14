# Review der Welle 7

Stand 2026-11-14, Skill `code-review`, Fixpunkt `4eefd7d` (= `origin/main`), Stand `integration/welle-7` @ `538ec1d`
(alle Tickets außer 152, 157, 158, 159, 161, 162; D-103). Je Achse zwei Pfadscheiben, je ein Opus-Prüfer: **A** = `packages/`,
**B** = `apps/`, `fixtures/`, `tools/`, `.github/`, `docs/`. Die Prüfung der Vertragsversionen v1.7b und v1.7c gegen alle
Verbraucher (P9) lief in der Spec-Scheibe A mit. Behebung: Ticket 159 (Umfang D-104); 152, 161 und 162 bekommen nach dem Merge
einen kurzen zweiten Durchgang.

## Standards

### Scheibe A (`packages/`)

**Harte Verstöße**

- **SA1** `packages/ui-grid/README.md` (Tastenhilfe): „Die Kürzel stehen an genau einer Stelle: `GRID_KUERZEL` … ein zweites Verzeichnis gibt es nicht.“ `Suchleiste.tsx:35-48` und `:77` binden F3, Umschalt+F3, Escape, Strg+F und Enter/Umschalt+Enter fest, obwohl `kuerzel.ts:203-236` sie führt.
- **SA2** L1/L2 (Glossar „Gesamtpreis (GP)“): Befundcode `gp-abweichend` hat zwei Texte – `gaeb/angebot.ts:464` „Gesamtpreis“, `gaeb/angebotsaufbau.ts:85` „Gesamtbetrag“ (im Glossar ein anderer Begriff, Bedarfsposition mit/ohne Gesamtbetrag).
- **SA3** L1/L2 (Glossar „Kalenderdatum“): `bauzeit/datum.ts` behält `export type Datum = Kalenderdatum` (etwa 29 Verwendungen in `bauzeit`/`ausgabe`).
- **SA4** L2 (Glossar zuerst): `vertrag/zahlung.ts:70` `Auszahlungsszenario`, `abrechnung/zahlungsstand.ts` `szenario()` und `fall` nebeneinander; das Glossar kennt den Begriff nicht.

**Ermessen (Regeln)**

- **SA5** P2/A4: Vertrags-Merges änderten andere Pakete mit (983dba7, 9b2e339: `kern/ausfuehren.ts`, `kern/projekt-befehle.ts`, `speicher/dekoder.ts`; cee686c: `abrechnung/rechnung-befehle.ts`, `gaeb/testhilfen.ts`, `speicher/dekoder.ts`; 5afe7eb: 8 Dateien in `kern`/`speicher`); 143 schrieb in `speicher` (teilweise D-93).
- **SA6** A8: Kopf von `speicher/dateimigration7.ts` („Einmal gemergt, wird hier nichts mehr geändert“) gegen die Erweiterung durch 143 nach dem Merge von 139.
- **SA7** N1: Marken über Literale umgangen – `abrechnung/rechnung-befehle.ts:167` `'100.00' as Prozent`; `gaeb/angebotsaufbau.ts:82` `'0.00' as Betrag` statt `NULL_BETRAG`; `gaeb90.ts:736` und `gaeb2000.ts:882` `'19.00' as Prozent` statt `STANDARD_MWST_SATZ`.

**Gerüche (Ermessen)**

- **SA8** Doppelter Code: `gaeb/angebotsaufbau.ts:22-114` kopiert OZ-Zuordnung und Befunde aus `angebot.ts:221-500`, `ozVon` doppelt; schon auseinandergelaufen (SA2).
- **SA9** Doppelter Code: `grundbefunde` in `gaeb90.ts:421` und `gaeb2000.ts:646` (schon abweichend bei `phase-endung-widerspruch`); `SATZLAENGE = 80` zweimal.
- **SA10** Doppelter Code: Kalender in `abrechnung/zahlungsstand.ts:38-41` und `form.ts:41-42`, dazu `bauzeit`, `bauleitung`, `erechnung`; `form.ts:51` eigene Regex statt `KALENDERDATUM_MUSTER`.
- **SA11** Doppelter Code: `istObjekt` viermal in `kern`; `vergabe/bieterangaben.ts` doppelt zu `kern/angaben.ts:88` (schon D-87(3)).
- **SA12** Unklare Namen: `anschriftNormal`/`projektangabenNormal`/`bueroNormal` neben `bieterangabenNormalisieren`; `positionsfeld.ts` neben `positionsfelder.ts`.
- **SA13** Divergent Change: `ui-grid/LvGrid.tsx` 1007 → 1415 Zeilen (Suche/Filter, Kontextmenü, Spaltenbreiten); `speicher/dekoder.ts` 2119 Zeilen.

Sauber geprüft: A2, N3, N4, L4/L5 in den neuen GAEB-Texten.

### Scheibe B (`apps/`, `fixtures/`, `tools/`, `.github/`, `docs/`)

Weitgehend sauber: keine direkten Tabellenschreibzugriffe (A5), N4 an den Rändern, Bestätigungen bei unumkehrbarem Löschen, neue Begriffe zuerst im Glossar; `tools/` unverändert.

**Harte Verstöße**

- **SB1** L5 und `texte.ts`-Konvention: rohe Ausnahmetexte erreichen den Nutzer – `vergabe/Ausgaben.tsx:114,175`, `kosten/KostenAusgabe.tsx:71,166` zeigen `e.message` (aus den Workern: „Schrift nicht ladbar: ${url} (${status})“, „Der Druck-Worker ist abgestürzt.“ in `vergabe/druck.ts:80`, `honorar/pdf.ts:31`, oder pdfmake); nicht in `texte.ts`, daher vom Sprachtest nicht erfasst.
- **SB2** Q5: `kosten/bezeichnungen.ts:29-34` `void s.befehl(...)` und `return true` – ein Schreibfehler geht verloren, der Aufrufer meldet Erfolg.
- **SB3** U2/U3: `gaeb/AngebotBearbeiten.tsx:76-129` ist ein zweites Bearbeitungs-Grid (Tabelle aus Eingabefeldern, nicht virtualisiert, ohne Zellnavigation und Einfügen aus Excel); D-149.3 nimmt es hin, U2 ist nicht geändert.
- **SB4** C4: `fixtures/typisch-zahlungen.json` („regel“) und der README-Abschnitt A5 leiten Skonto, Bauabzugsteuer 15 % und Fristende nur aus D-72/D-128.x/D-93 her, ohne Beleg aus § 48 EStG oder VOB/B (ältere Fixtures nennen ihn).

**Ermessen**

- **SB5** ADR 0012/P7: Status `proposed` → `accepted` durch einen Agenten; der Nachtrag kehrt eine Folge um (Excel für Berichte) – üblich wäre eine neue ADR; der Nutzer prüft ADRs.
- **SB6** ADR 0012 („aus einem Worker“): `kosten/druck.ts` rechnet pdfmake im Hauptthread „wie die Honorarberechnung“ – die ist in dieser Welle in einen Worker gewandert (155).
- **SB7** Doppelter Code: Schriftlader und Worker-Start in `honorar/pdf-worker.ts`, `vergabe/druck-worker.ts`, `kosten/druck.ts` und drei älteren Stellen.
- **SB8** Repeated Switches/Primitive Obsession: `gaeb/angebotEntwurf.ts:83` `lesefehler(code: string)` doppelt zu `lv/zahlen.ts` `zahlFehlerText`.
- **SB9** Globaler Zustand/Feature Envy: `historie/einstellungen.ts` mit Modulvariablen `zuletzt`, `letzteSitzung`, gelesen von `kosten/bezeichnungen.ts`; Einstellungen gehen über einen CSV-Text; der Schreibweg importiert aus dem Migrationsmodul `sicherung/browserablage.ts`.
- **SB10** Divergent Change: Angebote bearbeiten liegt in `gaeb/`, der Schreibweg in `vergabe/schreiben.ts`; `vergabe/` nutzt `gaeb__`-Klassen.
- **SB11** L2: „Vorschau“ heißt Modulstufe (G-60) und Druckvorschau; beides nicht im Glossar. `projekt/stand.ts` `Projektstand` neben „Projektbestand“ und „LV-Stand“.
- **SB12** Q5 (Grenzfall): `projekt/stand.ts:41` zählt eine unlesbare Liste als 0.
- **SB13** Doppelte Pfadform: `App.tsx:101-` Regexe gegen `ui/pfade.ts` („an einer Stelle“).
- **SB14** Geist von `fixtures-nur-in-tests`: Fixtures im Produktionsbündel über ein virtuelles Modul (entschieden in D-90).

## Spec

### Scheibe A (`packages/`) und Vertragsprüfung

**Vertrag v1.7b und v1.7c (P9, Opus statt Nutzer): ja mit Korrekturen** (1 MUST, 3 SOLL).
v1.7b folgt D-72 wörtlich, additiv (A8), Dezimaltypen (N1), Undo sicher (ganze Rechnung im ChangeSet), Verbraucher vollständig.
v1.7c additiv, Übergangszeilen vorhanden. Die Korrekturen aus dem Review von v1.7a (D-82: M1, M2, S1–S10) sind in `kern` und
`speicher` alle umgesetzt und getestet.

- **MUST-1 / PA1** (Q5, ADR 0006): Wiederholen von „Projekt samt Inhalt löschen“ scheitert immer – D-160.5 vergleicht den vollen
  Bestand samt Protokoll, das Undo hängt aber einen `Rueckgaengig`-Eintrag an (D-160.6). Behebung: Präfix-Vergleich des
  Protokolls, Test löschen → Undo → Wiederholen (D-104, an 161).
- **SOLL-1**: `ProjektSamtInhaltLoeschen` in `MASSENBEFEHLSARTEN`, obwohl sein Eintrag nie gespeichert wird (D-160.8).
- **SOLL-2** (L2): „Zahlungsfreigabe“ fehlt im Glossar (`vertrag/zahlung.ts:86`, `befehle.ts:994`, Überschrift in
  `ausgabe/rechnung-druck.ts:427`).
- **SOLL-3**: `Speicher.einstellungen` bleibt optional (D-93 (3)); für die nächste Vertragsversion vormerken.

**Umfang**

- **PA2** (Text): `ausgabe/rechnung-druck.ts:188` druckt „Skonto (nicht verwirklicht)“ mit −0,00, auch wenn die Frist noch läuft
  und keine Zahlung da ist; auf einer Zahlungsfreigabe liest sich das endgültig. Vorschlag „noch nicht verwirklicht“.
- **PA3** (Falle für 152): `neueFelderPruefen` mit `Object.hasOwn` weist `vertragsstrafe: undefined` ab (an 152 gemeldet).
- **PA4** (bekannte Grenze von E5): `version-31.test.ts:161` nimmt 682 Nachlass-Abweichungen in 003.X86 hin; Nachlass an
  Gliederungen ist nicht abgebildet (D-80), die Preise der Musterdatei weichen dort um 10 % je Gliederung ab – gehört in den Bericht.
- **PA5**: geprüft ohne Befund (143 Fixture und Kettentest, 129 alle acht Musterdateien, 136 Sätze je Phase, 144/145 Hinweis,
  138 Sperren, 156 Suche).

### Scheibe B (`apps/`, `fixtures/`, `tools/`, `.github/`, `docs/`)

Geprüft und im Sinn des Umfangs: E1 (Seitenleiste, Gruppen, „Vorschau“ mit Satz an Honorar, Brotkrumen, Titel aus `ui/navigation.ts`, Übersicht), E2 (drei Wege, Datenhinweis, Statuszeile, Kürzel aus `GRID_KUERZEL`, „Über“, KG-Hinweis), §5 (alle Punkte da, Lücken siehe PB5), E8, E10/E15, E13 (Firefox/Safari nach D-77), E17 (`pages.yml`, Pfadprobe in der CI, ADR 0012 `accepted`, ADR 0013 `proposed`).

- **PB1** (c, E7): `nachtrag/AuftragnehmerAngebot.tsx:13,163` (151) nutzt für das X84 noch die alte `Befundliste` (eine Rohzeile je Befund mit „(Zeile n)“, keine Zusammenfassung); Dateidialog `:101` ohne `.d84`/`.p84`. E7: „Gilt für die Dialoge zu GAEB, X84 …“, „der Dateidialog bietet alle GAEB-Endungen an“.
- **PB2** (c, E7): `gaeb/texte.ts` `angebot.keinX84` nennt nur „GAEB DA XML 3.1, 3.2 oder 3.3“, obwohl `packages/gaeb/src/angebot.ts:39-40` GAEB 90 und 2000 liest und der Dialog `.d84`/`.p84` anbietet.
- **PB3** (c, E13/B-26): `vergabe/Ausgaben.tsx:114` und `kosten/KostenAusgabe.tsx:71,93` zeigen `e.message` – die rohe PDF-Fehlermeldung aus B-26 kehrt zurück. E13: „alle Fehlermeldungen deutsch und mit einem nächsten Schritt“.
- **PB4** (c, E15/Q5): `kosten/bezeichnungen.ts` `void s.befehl(...)` verschluckt Abweisungen; eine CSV ohne lesbare Zeile setzt `bezeichnungen: []` und löscht alle Bezeichnungen ohne Warnung (nur das Einstellungs-Undo hilft).
- **PB5** (a/c, §5): Die Seite „Annahmen“ sagt nicht, dass die Vertragsstrafe kumuliert geführt und aus der Vorrechnung vorgeschlagen wird (D-72) – wer in einer Folgerechnung nur die neue Strafe einträgt, zieht zu wenig ab. Kleiner: ABC-Bezug auf den Schätzpreis umschaltbar, Ausreißer vergleichen EP, nicht GP.
- **PB6** (c, E17): `README.md` nennt nur „3.3 und 3.2“ und „Muster-LV“ statt „Beispielprojekt laden“ und den Start aus einer GAEB-Datei.
- **PB7** (c, E14/L1, klein): `version.ts` `bauStandText` liefert „… vom 2026-11-13“ (ISO statt de-DE); „unbekannt“ und „vom“ stehen nicht in `texte.ts`.

Kein nennenswerter Mehrumfang.


## Zusammenfassung

Standards: 4 harte Befunde in A (schwerster: SA1, die Suchleiste bindet Tasten an `GRID_KUERZEL` vorbei), 4 harte in B
(schwerster: SB2/Q5, KG-Bezeichnungen gehen bei einem Schreibfehler still verloren), dazu 9 + 10 Ermessenspunkte.
Spec: Vertrag „ja mit Korrekturen“ (MUST-1: Wiederholen von „Projekt samt Inhalt löschen“ scheitert), 4 Befunde in A, 7 in B
(schwerster: PB5, die Seite „Annahmen“ verschweigt, dass die Vertragsstrafe kumuliert geführt wird – Gefahr zu geringer Abzüge).
