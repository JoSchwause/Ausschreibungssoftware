# Regeln für Entwurf und Umsetzung

Verbindlich für jede Sitzung und jeden Agenten. Arbeitsplan: `.scratch/ava-oss/plan.md`.

- **[ADR]** = entschieden (siehe `docs/adr/`).
- **[NEU]** = Vorschlag, vorläufig gültig, bis die Grilling-Sitzung ihn bestätigt oder verwirft
  (`.scratch/ava-oss/grilling.md`). Bei Konflikt mit einer ADR gilt die ADR.

## Architektur

- **A1** [ADR 0001/0002] Lokale Einzelnutzer-PWA, SQLite-WASM im OPFS, Austausch nur über Dateien.
  (G-01 kann das neu öffnen.)
- **A2** [ADR 0003] Alle Fachberechnung liegt in einem reinen TS-Paket: kein DOM, kein Speicher,
  kein I/O, kein `Date.now()`, kein Zufall. Deterministisch.
- **A3** [NEU] **Abhängigkeiten nur in eine Richtung:** `vertrag` ← `kern` ← Fachpakete
  (`speicher`, `gaeb`, `vergabe`, `ausgabe`, …) ← `apps/web`. Fachpakete importieren einander nie;
  sie treffen sich nur über Typen aus `vertrag`. Per Lint in der CI erzwungen.
- **A4** [NEU] **Vertrag zuerst:** `packages/vertrag` enthält Domänentypen, Befehlstypen,
  `ChangeSet` und Repository-Schnittstellen. Änderungen daran sind ein eigenes Ticket, nie
  Nebenwirkung von Feature-Arbeit.
- **A5** [NEU] **Jede Änderung ist ein Befehl:** `(Zustand, Befehl) → ChangeSet`. UI, GAEB-Import,
  Undo und Speicher gehen alle über Befehle. Keine direkten Tabellenschreibzugriffe aus der UI.
- **A6** [ADR 0003] ChangeSet = geänderte Knoten + betroffene Summen; Neuberechnung nur im
  betroffenen Teilbaum.
- **A7** [NEU] Stabile, undurchsichtige IDs (UUIDv7) für jede Entität. Die Ordnungszahl ist
  Anzeigedatum, nie Schlüssel.
- **A8** [NEU] Schemaänderungen nur über nummerierte, getestete Vorwärts-Migrationen. Die
  Projektdatei trägt eine Schemaversion; alte Dateien müssen sich weiter öffnen lassen.

## Zahlen und Geld

- **N1** [ADR 0003] Nur Dezimalarithmetik. `number` ist für Menge, Preis, Betrag und Prozent
  verboten (Lint-Regel + Branded Types).
- **N2** [ADR 0003] GP = kaufmännisch gerundet(Menge × EP, 2). Summen sind Summen der gerundeten
  GPs. MwSt wird auf die Nettosumme nach Nachlass gerechnet, nicht je Position.
- **N3** [NEU] Nachkommastellen stehen als Konstanten an genau einer Stelle (Menge 3, EP 3
  gespeichert, Betrag 2) — offen: G-21.
- **N4** [NEU] de-DE-Parsen und -Formatieren nur an den Rändern (UI, GAEB, Excel). Der Kern sieht
  nur Dezimalwerte.

## Sprache und Benennung

- **L1** [ADR 0005] Deutsche UI. Fachbezeichner im Code exakt wie in `GLOSSARY.md`. Technischer
  Code englisch.
- **L2** [NEU] Ein neuer Fachbegriff kommt zuerst ins `GLOSSARY.md`, dann in den Code. Keine
  Synonyme.
- **L3** [NEU] Interne Bezeichner der Referenzsoftware (Feld-, Controller- und Aktionsnamen aus
  der Recherche) erscheinen nie in Code, Tests oder Commits.

## Clean Room und Lizenzen

- **C1** [ADR 0007] AGPL-3.0. Kein fremder Code, keine fremden UI-Assets, keine lizenzierten Texte
  (STLB-Bau, DIN-Katalogtexte, Handbuchtexte) im Repo.
- **C2** [ADR 0007] `docs/research/nova-ava/` bleibt git-ignoriert. Die CI schlägt fehl, wenn dort
  eine Datei versioniert ist.
- **C3** [NEU] Umsetzende Agenten lesen nur `okf/research/` und Tickets. Nur Sitzungen, die
  Tickets schreiben, lesen die Rohrecherche, und geben Verhalten in eigenen Worten wieder.
- **C4** [NEU] Testdaten (GAEB-Dateien, LVs) sind selbst verfasst. Goldene Zahlen müssen aus der
  Regel herleitbar sein, nicht nur „beobachtet“ — offen: G-41.
- **C5** [NEU] Jede Abhängigkeit braucht eine AGPL-kompatible Lizenz; Lizenzprüfung in der CI.
  Keine Enterprise-only-Funktionen (Präzedenz: ADR 0004).

## Qualität

- **Q1** TDD mit Vitest. Rechenregeln bekommen Golden-Tests und Property-Tests.
- **Q2** Playwright-E2E für jeden Kernablauf. CI (Lint, Typen, Unit, E2E, Paketgrenzen, Lizenzen)
  ist vor jedem Merge grün.
- **Q3** [NEU] GAEB: Jeder Export wird im Test gegen das XSD validiert. Jede unterstützte Phase
  hat einen Roundtrip-Test Import → Export → Import.
- **Q4** [NEU] Leistungsbudgets sind Tests: LV-Grid flüssig bei 5.000 Zeilen; Neuberechnung einer
  Einzeländerung < 16 ms bei 5.000 Positionen. (Obergrenze offen: G-33.)
- **Q5** [NEU] Kein stiller Datenverlust: Unumkehrbare Aktionen brauchen eine ausdrückliche
  Bestätigung und sind per Undo oder LV-Stand abgesichert.

## Oberfläche

- **U1** [ADR 0004] React + TanStack Table (virtualisiert, eigene Baum- und Editierlogik) + TipTap
  mit eingeschränktem Schema.
- **U2** [NEU] Genau eine gemeinsame Grid-Komponente (`ui-grid`) für LV, Preisspiegel, Aufmaß und
  Kosten. Keine zweite Grid-Implementierung.
- **U3** [NEU] Tastatur zuerst: Jede Grid-Aktion ist per Tastatur erreichbar; Zellnavigation wie in
  Excel; Einfügen aus Excel über die Zwischenablage.
- **U4** [NEU] Eigenes Erscheinungsbild über Design-Tokens. Keine Ähnlichkeit mit Layout, Icons
  oder Namen der Referenzsoftware.
- **U5** [NEU] Validierung blockiert nie die Eingabe. Probleme erscheinen in der formalen
  LV-Prüfung mit Sprunglinks.

## Agentenprozess

- **P1** Ein Ticket = ein vertikaler Schnitt von 2–4 h, endet grün und lauffähig.
- **P2** [NEU] **Ein Schreiber pro Paket.** Ein Ticket nennt sein Paket. Wer ein anderes Paket
  oder `vertrag` anfassen muss, braucht dafür ein eigenes Ticket.
- **P3** [NEU] Jeder parallele Agent arbeitet in eigenem Git-Worktree und Branch. Merge nur bei
  grüner CI.
- **P4** [NEU] Höchstens etwa 8 Agenten gleichzeitig, mit kleinen Zwischen-Commits.
- **P5** Ein Ticket, das an einer offenen G-Frage hängt, ist `needs-info`. Es wird nicht geraten.
- **P6** Sitzungen, die die Realität des Projekts ändern, aktualisieren das OKF und schreiben eine
  Übergabenotiz.
