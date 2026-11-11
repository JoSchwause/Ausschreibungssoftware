# 49: App: GAEB-Import und -Export, X84-Import (optional, wenn Zeit)

Status: claimed
Type: task
Welle: 3 (Phase B) · Strang: G (App-Teil) · Paket: `apps/web`
Blocked by: 48, 40, 45, 44
Regeln: A2, A5, A7, U5, U7, U8, Q2, Q3, Q5, C3, G-10, G-11, G-13, G-14, E-11, E-13, E-19, ADR 0010
Herkunft: `plan.md` §2 G2/G3 (App-Teil) und §4 (M2: „zusätzlich von Hand: Export in einem freien GAEB-Betrachter öffnen“), Ticket 18 (GAEB-Dialog im Prototyp, Teilfrage 4), Tickets 40, 45, 44

## What to build

Die GAEB-Wege aus `gaeb` werden in der App bedienbar: ein LV aus X81/X83 einlesen, ein LV als X81/X83/X86 ausgeben,
ein Angebot aus X84 einlesen. Prüfbefunde erscheinen, sperren aber nie (U5, G-13). Vorgehen: TDD mit dem Skill `tdd`;
am Ende `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` grün. `okf/research/` wird nicht gelesen (C3).

1. **LV einlesen (X81/X83, 3.3/3.2):** In der Projektansicht „GAEB einlesen“ → Datei wählen → `leseGaeb` (Kennungen aus
   der `IdQuelle` der App, MwSt-Ersatzwert 19,00 %, E-19) → Vorschau: Phase, Version, Zahl der Gliederungen, Positionen,
   Hinweistexte, Befunde gruppiert nach Schwere → „Übernehmen“ legt das LV mit **einem** Befehl
   `LeistungsverzeichnisAnlegen` an (Massenbefehl, im Protokoll als Kurzfassung, E-13). Eine Datei ohne Inhalt (z. B. 3.1)
   zeigt die Befunde und bietet kein Übernehmen an.
2. **LV ausgeben:** Auf der LV-Seite „GAEB ausgeben“ → Phase (X81, X83, X86) und Version (3.3, 3.2) wählen →
   `schreibeGaeb` mit Datum und Uhrzeit der App (A2: die Uhr gehört der App) und, für X86, dem Summenstand aus dem Kern →
   Befunde der eigenen Prüfung und die Warnungen über Verworfenes (E-11) anzeigen → herunterladen. Mit Fehlern:
   deutlicher Hinweis „Entwurf“, Dateiname mit Zusatz `_Entwurf` (G-13); kein Sperren.
3. **Angebot einlesen (X84):** Auf der LV-Seite „Angebot einlesen“ → Datei → `leseAngebot` gegen dieses LV → Vorschau mit
   Bietername aus der Datei (änderbar) und Befunden → „Übernehmen“: fehlt der Bieter im Projekt, zuerst `BieterAnlegen`,
   dann `AngebotAnlegen` (ein Undo-Schritt). Danach eine einfache Liste der Angebote des LV mit Bietersummen (Netto, Netto
   nach Nachlass, Brutto) aus `vergabe` (Ticket 36/44). Die Preisspiegel-Ansicht ist nicht Teil des Tickets (V3).
4. **Integrationstest ohne Oberfläche** (Vitest in `apps/web`, darf alle Pakete einbinden): BVBS AVA X81 einlesen, X84
   dazu einlesen, Bietersummen mit `vergabe` rechnen. Erwartet (wenn Ticket 44 gemergt ist): Gliederung 1.30.20
   **1.790,00**, 1.30.30 **819,10**, 1.30.10 **1.500,00** (Datei 1.450,50; Positionsnachlass nicht abbildbar, Ticket 44
   Punkt 4), Hauptgruppe 3 **12.000,00**. Ohne Ticket 44: nur 1.30.20 ohne Zuschlagsbeträge und Hauptgruppe 3 prüfen,
   Vermerk in den Comments.
5. **Roundtrip in der App** (Vitest): `typisch` als X83 3.3 ausgeben, wieder einlesen → gleiche Summen.

## Grenzen

- **Paket `apps/web`.** Fehlt in `gaeb`, `vergabe` oder `kern` etwas, Lücke in die Comments; keine Änderung dort.
- Die App liest Dateien nur über die Dateiauswahl des Browsers; kein Netz, kein Server (A1).
- Große Dateien (bis 100 MiB, Grenze des Lesers) lesen, ohne die Oberfläche einzufrieren: Vorschlag Web Worker für
  `leseGaeb`/`leseAngebot`; ist das zu viel, eine Fortschrittsanzeige und eine Messung im Ticket.
- **Zu groß?** Zuerst streichen: Punkt 3 (X84) samt Angebotsliste, dann 3.2 in der Auswahl. Punkt 1 und 2 bleiben.

## Acceptance criteria

- [x] E2E: BVBS AVA X81 einlesen, Vorschau zeigt 22 Gliederungen, 74 Positionen, 14 Hinweistexte (Zahlen aus Ticket 22) und Befunde; Übernehmen legt das LV an; Neuladen behält es
- [x] E2E: `typisch` als X83 3.3 ausgeben; Datei wird heruntergeladen, die eigene Prüfung zeigt keine Fehler; ein LV mit Einheit über 4 Zeichen ergibt „Entwurf“ und Dateiname mit `_Entwurf`, der Export geschieht trotzdem
- [x] E2E: X84 zum eingelesenen BVBS-LV einlesen, Bieter wird angelegt, das Angebot erscheint mit Bietersumme
- [x] Integrationstest Punkt 4 mit den genannten Zahlen (bzw. dem Rückfall ohne 44)
- [x] Roundtrip Punkt 5
- [x] Einlesen eines LV und eines Angebots ist je ein Undo-Schritt
- [x] Handprüfung für M2 vorbereitet: README-Abschnitt oder Comments, wie man einen Export in einem freien GAEB-Betrachter öffnet (welcher, Ergebnis, falls in der Sitzung möglich)
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` grün

## Nicht-Ziele

Preisspiegel-Ansicht (V3), Zuschlag und Auftrags-LV (V4), Excel (O2, V5), GAEB 90/2000 und 3.1 (G4), X82/X85/X89.

## Comments

### Umsetzung (Branch `ticket/49-web-gaeb`)

Alle Punkte 1-5 umgesetzt, nichts gestrichen (X84 und 3.2 sind dabei). Neu in `apps/web/src/gaeb/`: `gaeb.ts` (rein: `lvLesen`,
`lvAusgeben`, `angebotLesen`, `angebotAnlegenPlan`, `bietersummen`), `GaebEinlesen`, `GaebAusgeben`, `Angebote`,
`Befundliste`; Tests `gaeb.test.ts` (Integration, Punkte 4 und 5) und `e2e/gaeb.spec.ts`. Befehlsweg: neue Methode
`Befehlsweg.angebotAnlegen` (`BieterAnlegen` + `AngebotAnlegen` als ein Undo-Schritt); `Teil.changeSet` und `umkehren` kennen
jetzt `AngebotChangeSet`; `zielNach` bleibt auf der Seite, wenn nur Bieter geändert wurden.

- Wo stehen die Knöpfe? -> „GAEB einlesen“ in der Werkzeugleiste der Projektseite; „GAEB ausgeben“, „Angebot einlesen“ und „Angebote (n)“ in der Leiste der LV-Seite; Angebotsliste als Dialog (das Grid behält seine Höhe).
- Name des LV beim Einlesen? -> Name aus der Datei, kein Eingabefeld (umbenennen geht danach auf der Projektseite); Grund: klein, reversibel.
- Uhr der Datei? -> `u.uhr()` (UTC, wie `Protokolleintrag.wann`), Datum = erste 10, Uhrzeit = Zeichen 11-19 des ISO-Strings (A2).
- X86 in der App: `summen` und `zuschlagsbasen` aus dem Kern (`LvZustand.summen`, `zuschlagsbasen(lv)`); kein `auftragnehmer` (das Modell kennt keinen, Ticket 40: Warnung `angabe-leer`, kein Fehler).
- Bieter schon im Projekt? -> gleicher Name (Ränder und Groß-/Kleinschreibung egal) wird wiederverwendet, sonst neuer Bieter; Name in der Vorschau änderbar, leerer Name meldet am Feld.
- Bietersummen der Liste: `angebotSummenBerechnen(lv, angebot).gesamt` gegen den aktuellen LV-Stand, nicht der gespeicherte `AngebotZustand.summen`.
- Dateiendungen im Dateiauswahlfenster: `.x81 .x83 .x84 .x86 .xml`; Erkennung der Phase macht der Leser aus dem Inhalt.
- Ein X84 mit anderer Phase: `leseAngebot` liefert `befehl: null`, die Vorschau zeigt Befunde und „nichts zu übernehmen“.
- Große Dateien: kein Web Worker (zu viel für dieses Ticket); der Leser läuft im Seitenthread, vor dem Lesen erscheint die Wartemeldung („Die Datei wird gelesen …“, ein Zug an den Browser). Gemessen: BVBS AVA X81 (600 KB, 74 Positionen) im Mittel 15 ms (Vitest, Node); eine Messung mit 100 MiB steht aus (grob hochgerechnet einige Sekunden), der Worker ist ein eigenes Ticket, wenn sie stört.
- Roundtrip (Punkt 5) weicht vom Ticketwortlaut ab: X83 trägt keine Preise (Ticket 40, erwartete Unterschiede), „gleiche Summen“ gilt dort nur für Struktur, Mengen, Texte (Summen 0,00); die Summengleichheit prüft derselbe Test mit **X86**. `typisch` wird dafür ohne die Zuschlagspositionen in Altform (verlieren Menge und EP) und ohne die Wahlkennzeichnung ohne Gruppe/Variante (Warnung `export-verworfen`, E-11) verwendet, beides laut Ticket 40 erwartete Unterschiede.
- Punkt 4 mit Ticket 44: 1.30.20 = 1.790,00, 1.30.30 = 819,10, 1.30.10 = 1.500,00, Hauptgruppe 3 = 12.000,00 stimmen. Zusätzlich Messwert der ganzen Prüfdatei: Netto 1.421.024.428,85, Brutto 1.691.019.070,33 (im Integrationstest und im E2E festgehalten).
- Zahlen aus Ticket 22 (22 Gliederungen, 74 Positionen, 14 Hinweistexte) und 28 Befunde der X81 bestätigt.

Lücken (nicht hier geändert):
- `gaeb`: kein Auftragnehmer im Modell (X86 immer mit leerer Adresse); Altform der Zuschlagsposition und Wahl ohne Gruppe/Variante gehen im Export verloren (Warnung).
- `vergabe`/`speicher`: nichts gefehlt.
- E2E `dialog.spec.ts` „Prüf-Panel“ war in einem Gesamtlauf einmal rot (Zeitüberschreitung bei Last), beim Wiederholen 3x grün; nicht aus diesem Ticket.

### Handprüfung für M2 (freier GAEB-Betrachter)

Nicht in dieser Sitzung ausgeführt (kein Betrachter, kein Bildschirm). Ablauf für die Handprüfung:
1. App starten (`pnpm --filter @tethys/web dev`), LV öffnen (z. B. über „GAEB einlesen“ die BVBS-Prüfdatei `fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X81`).
2. „GAEB ausgeben“, Phase X81, X83 und X86, Version 3.3 und 3.2, je „Herunterladen“; Dateinamen ohne `_Entwurf` heißt: eigene Prüfung ohne Fehler.
3. Jede Datei in einem frei verfügbaren GAEB-Betrachter öffnen (Betrachter, Version und Ergebnis hier eintragen): Struktur (Gliederung, OZ), Kurz- und Langtexte, Mengen und Einheiten, bei X86 Preise und Summen mit der Anzeige in der App vergleichen.
4. Ergebnis: _offen_ (Betrachter: ..., Datum: ...).

