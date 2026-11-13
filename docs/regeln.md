# Regeln für Entwurf und Umsetzung

Verbindlich für jede Sitzung und jeden Agenten. Arbeitsplan: `.scratch/ava-oss/plan.md`.

- **[ADR]** = entschieden (siehe `docs/adr/`).
- **[ENTSCHIEDEN]** = im Grilling vom 2026-11-09 bestätigt (`.scratch/ava-oss/grilling.md`).
- **[NEU]** = Vorschlag, vorläufig gültig, bis die Grilling-Sitzung ihn bestätigt oder verwirft.
  Bei Konflikt mit einer ADR gilt die ADR.

## Architektur

- **A1** [ADR 0001/0002] Lokale Einzelnutzer-PWA, SQLite-WASM im OPFS, Austausch nur über Dateien.
  Mehrbenutzer mit Server ist das spätere Ziel (G-01, ENTSCHIEDEN).
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
  Jeder Befehl wird im Befehlsprotokoll festgehalten (ADR 0009); bei Massenbefehlen genügen Kopf und
  Prüfsumme [ENTSCHIEDEN, E-13].
- **A6** [ADR 0003] ChangeSet = geänderte Knoten + betroffene Summen; Neuberechnung nur im
  betroffenen Teilbaum.
- **A7** [NEU] Stabile, undurchsichtige IDs (UUIDv7) für jede Entität. Die Ordnungszahl ist
  Anzeigedatum, nie Schlüssel.
- **A8** [NEU] Schemaänderungen nur über nummerierte, getestete Vorwärts-Migrationen. Die
  Projektdatei trägt eine Schemaversion; alte Dateien müssen sich weiter öffnen lassen.
- **A9** [ENTSCHIEDEN, ADR 0011] Projekt ist die oberste Ebene (Name, Bauherr). Ausschreibungs-LV,
  Angebot und Auftrags-LV sind getrennte Aggregate mit gemeinsamer Positionsidentität.

## Zahlen und Geld

- **N1** [ADR 0003] Nur Dezimalarithmetik. `number` ist für Menge, Preis, Betrag und Prozent
  verboten (Lint-Regel + Branded Types).
- **N2** [ADR 0003] GP = kaufmännisch gerundet(Menge × EP, 2). Summen sind Summen der gerundeten
  GPs. MwSt wird auf die Nettosumme nach Nachlass gerechnet, nicht je Position. Ein MwSt-Satz je LV
  (G-28). Rundung negativer Werte: Betrag kaufmännisch runden, Vorzeichen wieder davor (−2,5 → −3)
  [ENTSCHIEDEN, E-07].
- **N3** [ENTSCHIEDEN, G-21] Nachkommastellen stehen als Konstanten an genau einer Stelle: EP 3
  gespeichert, Menge 3, Prozent 2, Betrag 2.
- **N4** [NEU] de-DE-Parsen und -Formatieren nur an den Rändern (UI, GAEB, Excel). Der Kern sieht
  nur Dezimalwerte.
- **N5** [ENTSCHIEDEN, G-23] Nachlass nur auf LV-Ebene, genau einer je LV, prozentual oder als
  Absolutbetrag. Er ist umkehrbar und wird nicht in die EP umgelegt. Der Nachlassbetrag wird auf 2 Stellen
  gerundet und dann abgezogen; ein negatives Netto nach Nachlass ist ein Befund der LV-Prüfung, keine
  Sperre [ENTSCHIEDEN, E-06].

## Fachregeln LV

- **F1** [ENTSCHIEDEN, E-08] Gliederung: Das Los ist die oberste Stufe und zählt zu den höchstens 5 Stufen.
  Positionen und Hinweistexte direkt unter dem LV sind erlaubt. Lose und Titel nebeneinander auf der
  obersten Stufe sind verboten.
- **F2** [ENTSCHIEDEN, E-09] OZ höchstens 14 Zeichen, Index genau 1 Zeichen. Unbelegte Stufen werden mit
  weniger Teilen gespeichert. Indexposition übernimmt die Nummer der vorangehenden Position. Umnummerieren
  weist doppelte OZ ab, die Handeingabe lässt sie zu (U5). Alphanumerische Stufen erzeugen beim
  Umnummerieren nur Ziffern. Bei Überlauf weicht die Vergabe automatisch auf Schritt 5, 2, 1 aus und zeigt
  einen Hinweis.
- **F3** [ENTSCHIEDEN, E-03] Zuschlagsposition: GAEB-Semantik (`MarkupItem`), Prozentsatz auf die Summe der
  Bezugspositionen, mehrere Bezugsformen. Vor der Umsetzung (K6) wird die Fachdokumentation wörtlich zitiert.
- **F4** [ENTSCHIEDEN, E-04] Bedarf ohne Gesamtbetrag wird ausgewiesen und nicht summiert, mit Gesamtbetrag
  summiert. Wahlposition wird ausgewiesen, nicht summiert und ersetzt die Grundposition nie. Bedarfs- und
  Wahlsummen werden getrennt ausgewiesen. Gruppe und Variante aus GAEB bleiben erhalten. Das „Wählen“ einer
  Wahlposition geschieht bei der Vergabe.
- **F5** [ENTSCHIEDEN, E-05] Bedarf, Wahl, Stundenlohn und Pauschal sind einzeln kombinierbare Merkmale.
- **F6** [ENTSCHIEDEN, E-10, E-11] `Langtext` trägt die GAEB-abbildbare Teilmenge (fett, kursiv,
  unterstrichen, Absätze, Listen, Tabellen, Textergänzungen). Auftraggeber, Vergabeinformationen,
  Leit- und Unterbeschreibung gehören in v1; übrige nicht abgebildete GAEB-Elemente sind Befund beim Import
  und werden beim Export mit Warnung verworfen.

## Sprache und Benennung

- **L1** [ADR 0005] Deutsche UI. Fachbezeichner im Code exakt wie in `GLOSSARY.md`. Technischer
  Code englisch.
- **L2** [NEU] Ein neuer Fachbegriff kommt zuerst ins `GLOSSARY.md`, dann in den Code. Keine
  Synonyme. „Zuschlagsposition“ (GAEB `MarkupItem`) ist der einzige Begriff, „Zulage“ nur Vorbild-Begriff
  (G-22).
- **L3** [NEU] Interne Bezeichner der Referenzsoftware (Feld-, Controller- und Aktionsnamen aus
  der Recherche) erscheinen nie in Code, Tests oder Commits.
- **L4** [ENTSCHIEDEN, G-63] Anrede in der Oberfläche: unpersönlich („Noch keine Projekte.“, „Bitte eine Datei wählen.“).
  Wo eine direkte Anrede nötig ist, „Sie“. Kein „du“.
- **L5** [NEU] Texte für Nutzer nennen keine Ticketnummern, keine Kennungen aus dem Code und keine Paketnamen
  (Befunde B-10 und B-12 in `.scratch/ava-oss/umfang-welle-7.md`).

## Clean Room und Lizenzen

- **C1** [ADR 0007, 0008] AGPL-3.0-or-later für das gesamte Repo, mit DCO und REUSE. Kein fremder Code,
  keine fremden UI-Assets, keine lizenzierten Texte (STLB-Bau, DIN-Katalogtexte, Handbuchtexte) im Repo.
- **C2** [ADR 0007] `docs/research/nova-ava/` und `okf/research/` bleiben git-ignoriert (G-44). Die CI
  schlägt fehl, wenn dort eine Datei versioniert ist. Das gilt auch für den Repo-Baum.
- **C3** [ENTSCHIEDEN, G-44] Umsetzende Agenten (auch in Cloud-Sessions) arbeiten nur mit Tickets. Das
  Verhalten der Referenzsoftware steht in den Tickets in eigenen Worten. `okf/research/` ist lokal
  und wird von Umsetzungs-Agenten nicht gelesen. Nur Sitzungen, die Tickets schreiben, lesen die
  Rohrecherche.
- **C4** [ENTSCHIEDEN, G-41/G-52/G-55] Testdaten (GAEB-Dateien, LVs) liegen im Repo. Sie sind selbst
  verfasst, anonymisiert oder Dateien Dritter mit Herkunftsvermerk und REUSE-Eintrag: amtliche
  BVBS-/GAEB-Dateien unverändert, Fixtures freier Projekte nur bei AGPL-3.0-or-later-kompatibler
  Lizenz. Anonymisierung: Namen, Adressen, Firmennamen, Projektbezeichnung und
  Aktenzeichen werden entfernt; Mengen und EP bleiben. Goldene Zahlen müssen aus einer VOB- oder
  GAEB-Regel herleitbar und dort belegt sein, nicht nur „beobachtet“.
- **C5** [ENTSCHIEDEN, ADR 0008] Jede Abhängigkeit braucht eine AGPL-kompatible Lizenz; Lizenzprüfung
  in der CI. Keine Enterprise-only-Funktionen (Präzedenz: ADR 0004).

## Qualität

- **Q1** TDD mit Vitest. Rechenregeln bekommen Golden-Tests und Property-Tests.
- **Q2** Playwright-E2E für jeden Kernablauf. CI (Lint, Typen, Unit, E2E, Paketgrenzen, Lizenzen)
  ist vor jedem Merge grün.
- **Q3** [ENTSCHIEDEN, ADR 0010] GAEB: Die App prüft Exporte mit der eigenen Validierung. Die CI prüft
  jeden Export zusätzlich gegen das XSD, das dort geladen und nie committet wird. Jede unterstützte
  Phase hat einen Roundtrip-Test Import → Export → Import.
- **Q4** [ENTSCHIEDEN, G-33] Leistungsbudgets sind Tests: LV-Grid flüssig bei 5.000 Zeilen; Ziel
  10.000 Positionen, Tests bei 5.000 und 10.000. Neuberechnung einer Einzeländerung < 16 ms bei
  5.000 Positionen.
- **Q5** [ENTSCHIEDEN, G-06] Kein stiller Datenverlust: Unumkehrbare Aktionen brauchen eine
  ausdrückliche Bestätigung und sind per Undo oder LV-Stand abgesichert. Lücken des Vorbilds werden
  geschlossen.

## Oberfläche

- **U1** [ADR 0004] React + TanStack Table (virtualisiert, eigene Baum- und Editierlogik) + TipTap
  mit eingeschränktem Schema. Radix-Primitive als Komponentenbasis [ENTSCHIEDEN, G-31].
- **U2** [NEU] Genau eine gemeinsame Grid-Komponente (`ui-grid`) für LV, Preisspiegel, Aufmaß und
  Kosten. Keine zweite Grid-Implementierung.
- **U3** [NEU] Tastatur zuerst: Jede Grid-Aktion ist per Tastatur erreichbar; Zellnavigation wie in
  Excel; Einfügen aus Excel über die Zwischenablage. Bekannte Abweichungen (Enter startet das Bearbeiten,
  Leertaste wählt die Zeile, Einfügen legt neue Positionen an) bleiben bis zum Interview-Prototyp
  [ENTSCHIEDEN, E-18].
- **U4** [ENTSCHIEDEN, G-31] Eigenes Erscheinungsbild über Design-Tokens, dicht und tabellenartig,
  hell und dunkel. Keine Ähnlichkeit mit Layout, Icons oder Namen der Referenzsoftware.
- **U5** [ENTSCHIEDEN, G-13] Validierung blockiert nie die Eingabe. Probleme erscheinen in der formalen
  LV-Prüfung mit Sprunglinks. GAEB-Export mit Fehlern wird gewarnt und als Entwurf gekennzeichnet.
- **U6** [ENTSCHIEDEN, G-30] Nur Desktop ab 1280 px. Tablet ist ein späterer Plan.
- **U7** [ENTSCHIEDEN, G-35] Automatisch speichern bei jedem Befehl.
- **U8** [ENTSCHIEDEN, G-34] Tastatur und Kontrast jetzt. Katalogtexte als Dateien, keine Übersetzung
  in v1.

## Agentenprozess

- **P1** Ein Ticket = ein vertikaler Schnitt von 2–4 h, endet grün und lauffähig.
- **P2** [NEU] **Ein Schreiber pro Paket.** Ein Ticket nennt sein Paket. Wer ein anderes Paket
  oder `vertrag` anfassen muss, braucht dafür ein eigenes Ticket.
- **P3** [NEU] Jeder parallele Agent arbeitet in eigenem Git-Worktree und Branch. Merge nur bei
  grüner CI.
- **P4** [ENTSCHIEDEN, G-51] Höchstens 8 Agenten gleichzeitig, mit kleinen Zwischen-Commits. Kein
  Zieltermin für M3.
- **P5** Ein Ticket, das an einer offenen G-Frage hängt, ist `needs-info`. Es wird nicht geraten (im Demo-Modus `/implement-welle` entscheiden stattdessen die Agenten und protokollieren, siehe `.claude/skills/implement-welle/SKILL.md`).
  Offen ist derzeit nur G-57 (Sync-Server, vertagt bis nach der Demo). G-27 gilt für v1 wie in D-34 angenommen (G-62).
- **P6** Sitzungen, die die Realität des Projekts ändern, aktualisieren das OKF und schreiben eine
  Übergabenotiz.
- **P7** [ENTSCHIEDEN, G-50, E-17] Ein Review-Agent prüft jeden PR. Der Nutzer prüft Verträge, ADRs und
  Meilensteine. Ab Welle 2 gibt es einen Pull Request je Ticket, gemergt mit Merge-Commit.
- **P8** [ENTSCHIEDEN, E-17] Das DCO gilt für Beiträge von außen (G-43); der Prüfschritt bleibt in der CI.
- **P9** [ENTSCHIEDEN, E-02] Änderungen am `vertrag` laufen in eigenen, seriellen Tickets, die der Nutzer
  prüft (v1.1a, v1.1b).
