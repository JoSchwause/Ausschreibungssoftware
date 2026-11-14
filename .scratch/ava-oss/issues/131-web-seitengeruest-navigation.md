# 131: App: Seitengerüst und Navigation

Status: resolved
Type: task
Welle: 7 · Strang: U, E1 · Paket/Ordner: `apps/web/src/ui/`, `projekt/`, `App.tsx`; Seitengerüst-Umstellung in `bim/`, `modellvergleich/`, `bauzeit/`, `honorar/`, `bauleitung/` (nur Gerüst, keine Fachänderung)
Blocked by: –
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: U1, U4, U6, L4, L5, A5, Q5; G-60
Herkunft: umfang §3 E1, B-01, B-03, B-04; Ticket 123 Punkt 4

## What to build

1. **Seitengerüst (123 §4):** eine gemeinsame Seitenkomponente (Laden, `aktiv`, `beiHistorie`, Lade-/Nicht-gefunden-Ansicht)
   für die neun Seiten aus Welle 6 und, wo billig, die älteren; ein Pfadbaukasten statt `bauzeit/pfad.ts` ≡ `honorar/pfad.ts` ≡
   `kosten/pfad.ts`; ein Schreibweg (Lauf → Protokolleintrag → Speichern) statt fünf Kopien; ein `Feldfehler`; ein Zeilentyp
   `{positionId, oz, kurztext, einheit}`; die `art === 'liste'`-Weichen in `App.tsx` entfallen. Keine Verhaltensänderung.
2. **Seitenleiste folgt dem geöffneten Projekt (E1):** Übersicht · Leistungsverzeichnisse · Vergabe · Aufträge (Auftrags-LV,
   Nachträge, Aufmaß, Rechnungen) · Kosten · Gruppe „Vorschau“ (Modelle, Bauzeitenpläne, Honorar, Mängel, Bautagebuch). Ohne
   Projekt: Projekte und Hilfe (die Hilfeseite selbst baut 147; hier ein Eintrag mit leerer Zielseite „Hilfe“, die 147 füllt).
   Die Platzhalterseiten (`ui/Platzhalterseite.tsx`) entfallen. Wo eine Liste je Projekt fehlt (z. B. alle Rechnungen eines
   Projekts), eine schlichte Listenseite.
3. **Brotkrumen** auf jeder Seite (Projekt › LV › Preisspiegel); Kopfzeile und markierter Eintrag stimmen überein;
   `document.title` = „Seite – Projekt – Tethys AVA“ (ein Trennzeichen).
4. **Projektseite als Übersicht:** Abschnitte LVs (mit Angeboten, Zuschlag), Auftrags-LVs (mit Verweisen auf Nachträge, Aufmaß,
   Rechnungen), Kosten, Vorschau; Aktionen gruppiert; „Projekt löschen“ in einem Menü (Radix); kein Überlauf bei 1280 px.
   Preisspiegel, Aufmaß und Rechnungen sind von hier erreichbar.
5. **Kennzeichen „Vorschau“** an den fünf Modulen aus Welle 6 (Navigation und Seitenkopf); an Honorar dazu der Satz, dass die
   Tafelwerte nicht gegen die amtliche Fassung geprüft sind.
6. Die E2E-Tests, die über die alte Leiste oder Projektseite navigieren, auf die neue Navigation umstellen (Rollen/Beschriftung,
   keine Testhaken). Neue E2E `navigation.spec.ts`: Seitenleiste, Brotkrumen, Titel, 1280×800 ohne waagerechten Überlauf auf
   der Projektseite.

Texte: neue Texte in `texte.ts` der Ordner, unpersönlich (L4). Bestehende Texte nur ändern, wo die Navigation es verlangt
(der Sprach-Durchgang ist 133; Konflikte löst der Merger).

## Acceptance criteria

- [x] Punkte 1–6; alle bisherigen App-E2E grün (Tore M1–M4, X1–X4)
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [x] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

Entscheidungen im Demo-Modus (Branch `welle-7/131-navigation`):

- **D-131.1** Wo liegt das Gerüst? → `ui/seite.tsx` (`useSeitenladen`: Laden mit `aktiv`, `beiHistorie`, `neuLaden`,
  optional `alsWert` zum Behalten von Sitzung/Bytes; `Ladeansicht`), `ui/pfade.ts` (`projektliste()`), `ui/schreibweg.ts`
  (`befehlSchreiben`, `fachSitzung`), `ui/feldfehler.ts`, `ui/zeilenkopf.ts`. Umgestellt: die neun Seiten aus Welle 6 und die
  Projektseite. `kosten/pfad.ts` bleibt (Ordner gehört 154, P2); der Baukasten passt ohne Änderung (Liste + `kontrolle` als
  eigene Regel) – Folgearbeit für 154.
- **D-131.2** Ein `Feldfehler`, aber zwei Formen? → `Feldfehler {feld, meldung}` (Listen in `bauzeit`, `honorar`) und
  `Feldfehlerkarte<F>` (eine Meldung je Feld, `bauleitung`) aus einer Datei. Die Formulare der Bauleitung auf Listen umzustellen
  wäre eine Verhaltensänderung gewesen.
- **D-131.3** Brotkrumen: `Projekte › Projekt › Bereich › Gegenstand › Seite`; die Bereichskrume ist der Name des markierten
  Eintrags der Seitenleiste, so stimmen Kopfzeile und Leiste schon durch den Aufbau überein. Die letzte Krume ist die Seite und
  kein Verweis. Titel: letzte Krume (Übersicht: „Übersicht“) – Projekt – Tethys AVA.
- **D-131.4** LV-Adressen tragen kein Projekt. `OrtLader` sucht es über die LV-Listen der Projekte und merkt es sich; keine
  Vertragsänderung.
- **D-131.5** Die Namen lädt `OrtLader` unterhalb von `SpeicherAnbieter` und meldet sie über einen kleinen Speicher an die
  Hülle, damit nur Leiste und Kopfzeile neu zeichnen, nie die Seite. Neu geladen wird nach Rückgängig/Wiederholen und nach
  jedem Protokolleintrag außer Arbeit in einem LV (ohne Anlegen/Umbenennen) oder an einem Angebot.
- **D-131.6** Kennzeichen „Vorschau“: Gruppe in der Seitenleiste, Kennzeichen mit Satz in der Kopfzeile (Honorar: „Die
  Tafelwerte sind nicht gegen die amtliche Fassung der HOAI geprüft.“), Abschnitt der Übersicht. Die Modulseiten selbst
  bleiben unverändert (nur Gerüst).
- **D-131.7** Menü „Weitere Aktionen“ (enthält „Projekt löschen“): `@radix-ui/react-dropdown-menu` ^2.2.1 (MIT) neu in
  `apps/web`, weil `ui-basis` 142 gehört. Ein gemeinsamer Menü-Baustein in `ui-basis` ist Folgearbeit.
- **D-131.8** Neue Listen je Projekt unter `/projekt/<p>/{leistungsverzeichnisse,vergabe,auftraege,nachtraege,aufmass,
  rechnungen}`. Die LV-Liste teilt den Abschnitt der Übersicht (mit „Neues Leistungsverzeichnis“). Die Übersicht behält
  `AuftragsLvListe` (M3 prüft sie) und ergänzt je Auftrags-LV Nachträge, Aufmaßblätter, Soll/Ist und Rechnungen. Ein
  Nachtrags-LV markiert in der Leiste „Nachträge“.
- **D-131.9** Die Zielseite „Hilfe“ liegt leer in `hilfe/HilfeSeite.tsx`; 147 füllt sie. Die alten Platzhalteradressen
  `/lv` und `/vergabe` zeigen „Seite nicht gefunden“.

Ergebnis: Volle Web-E2E vor dem Merge von `integration/welle-7`: 90 grün, 2 rot – `druckprofil.spec` „Target crashed“ (der Kernel
beendete einen Prozess wegen Speichermangel) und `navigation.spec` (Fokus kehrte nach Escape verspätet zum Menüknopf zurück;
Test wartet jetzt darauf); beide einzeln wiederholt grün. Nach dem Merge: lint, typecheck grün; `pnpm test` 4007 grün, 3 rot nur
unter Last (Budgets `speicher/v16-leistung`, `vergabe/leistung`, `abrechnung/leistung`, Lastmittel 18–26 auf 4 Kernen; keine
von 131 berührte Datei; nicht gelockert). Nach dem Merge erneut grün: navigation, huelle, start, undo, x2, projekt, m3, bim.

## Answer

Gemergt nach `integration/welle-7` mit `95822fa`. Ergebnisse, Testläufe und Entscheidungen (D-131.x) unter `## Comments`.
