# 147: App: Erster Start, Beispielprojekt, Hilfe, Speicherstatus

Status: done-by-agent
Type: task
Welle: 7 · Strang: E2 · Paket/Ordner: neu `apps/web/src/hilfe/`, `apps/web/src/ui/` (Statuszeile), `projekt/ProjektlisteSeite.tsx`; Beispielprojekt-Daten aus `fixtures/` (nur lesen, über den Build eingebunden)
Blocked by: 131, 134, 130
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: L3, L4, C1, U7, Q5; G-59, G-62, D-77, D-78
Herkunft: umfang §3 E2, §5, B-02, B-30

## What to build

1. **Leere Projektliste:** kurzer Begrüßungstext und drei Wege: **Beispielprojekt laden** (aus den Fixtures `typisch` mit
   Angeboten, Zuschlag, einem Aufmaßblatt, einer Rechnung und `haus-v1.ifc`; über Befehle aufgebaut, nicht als Rohdaten in die
   Datenbank), **GAEB-Datei einlesen** (legt das Projekt an; Funktion aus 146 – ist 146 noch nicht gemergt, Integrationsspitze
   abwarten bzw. mergen), **leeres Projekt anlegen**.
2. **Hilfe** (Route, Eintrag in der Seitenleiste aus 131): „Erste Schritte“ (der Weg von der GAEB-Datei bis zur Rechnung),
   „Tastenkürzel“ (aus der Kürzeltabelle von `ui-grid`, 130), „Annahmen“ (Inhalt nach `umfang-welle-7.md` §5, in einfachen
   Sätzen, inklusive D-72 mit dem Risiko § 48 EStG), „Über“ (Version und Build aus 134, Lizenz AGPL-3.0-or-later, Verweis auf
   den Quelltext). Keine Namen oder Abläufe eines anderen Programms (L3, C1).
3. **Hinweis zu Daten und Sicherung** beim ersten Projekt (wo die Daten liegen, wie man sichert); **Statuszeile** zeigt
   Speicherstatus (dauerhaft ja/nein über `navigator.storage.persisted()`) und die letzte Sicherung.
4. E2E: erster Start → Beispielprojekt laden → Projektseite zeigt LV, Angebote, Auftrags-LV; Hilfeseiten erreichbar.

## Acceptance criteria

- [x] Punkte 1–4; Annahmen-Seite nennt alle Punkte aus §5
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [x] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

Entscheidungen im Demo-Modus (Branch `welle-7/147-erster-start`):

- **D-147.1** Hilfe als eine Route `/hilfe` mit Reitern (Erste Schritte, Daten und Sicherung, Tastenkürzel, Annahmen, Über); der
  Anker wählt den Reiter (`/hilfe#annahmen`, `hilfe/pfad.ts`, `useAnker` in `ui/route.ts`). Grund: `App.tsx` (Route aus 131)
  bleibt unverändert, andere Seiten können auf einen Teil verweisen (Statuszeile, Begrüßung; 156: Kürzelübersicht aus dem
  Grid → `hilfePfad('tastenkuerzel')`). Der fünfte Reiter „Daten und Sicherung“ ist das Ziel des Datenhinweises.
- **D-147.2** Beispielprojekt-Daten „über den Build eingebunden“: virtuelles Modul `virtual:tethys-beispielprojekt` (Plugin in
  `apps/web/vite.config.ts`) liest `typisch.json`, `typisch-angebote.json`, `typisch-abrechnung.json`, `ifc/haus-v1.ifc` als
  Text; eigenes Bündel, erst beim Klick geladen. Produktivcode importiert keine Fixture-Datei, die Grenzregel
  `fixtures-nur-in-tests` bleibt unverändert. Zum Bestätigen durch den Orchestrator (Lesart der Regel).
- **D-147.3** Beispielprojekt über die Befehlswege der App, **ein** Undo-Schritt, je Lauf neue Kennungen: Projekt
  „Beispielprojekt Musterhaus“, LV `typisch` (mit den Kostengruppen aus `typisch-abrechnung`), drei Bieter mit Angeboten,
  Zuschlag an Bieter B ohne Wahl (wie M4, über `zuschlagserteilungPlanen`), Blatt 1 ohne die Nachtragsposition (Mengen mit
  `mengen` gerechnet), Rechnung 1 über das Formular-Lesen (`entwurfLesen`) ohne Freigabe, `haus-v1.ifc` (Worker). Grund:
  Rückgängig entfernt das Beispiel in der Sitzung; sonst ist ein Projekt mit Zuschlag, Aufmaß und Rechnung bis 149 schwer zu
  löschen (B-16).
- **D-147.4** „GAEB-Datei einlesen“ bis 146: legt „Neues Projekt“ an und öffnet darin das vorhandene `GaebEinlesen` samt
  Dateiauswahl (Klick auf dessen Dateifeld im Zug des Klicks); nach „Übernehmen“ zur Projektseite. **146 soll ersetzen:**
  `GaebWeg` in `hilfe/Willkommen.tsx` durch „Einlesen ohne offenes Projekt“ (Projekt erst bei „Übernehmen“, Name aus der
  Datei, beim Abbrechen bleibt nichts liegen); dann entfallen Projektname „Neues Projekt“ und der DOM-Griff auf das Dateifeld.
- **D-147.5** Statuszeile: „Speicher: dauerhaft / nicht dauerhaft / unbekannt“ (Verweis auf „Daten und Sicherung“) und letzte
  Sicherung (im Projekt: dessen; sonst die jüngste mit Projektname). Gemeldet aus `OrtLader` (`ui/statusmelder.ts`), weil nur
  dort Speicher und Sicherung sichtbar sind; die App fragt dabei einmal je Speicher dauerhaften Speicher an
  (`speicher.persistenzstatus()`, Spec §9 – bisher rief das niemand). Ohne Speicher (Hilfeseite) liest die Hülle
  `navigator.storage.persisted()`. „Bereit“ entfällt.
- **D-147.6** Datenhinweis: in der Begrüßung immer, auf der Projektliste bei genau einem Projekt mit „Hinweis ausblenden“
  (`localStorage`, nur Komfort).
- **D-147.7** Dritter Weg = das vorhandene Formular „Neues Projekt“ in der dritten Karte (ohne eigene Überschrift), damit
  `projektAnlegen` der E2E und „Projekt anlegen“ eindeutig bleiben.
- **D-147.8** Annahmen in eigenen Sätzen aus D-05/D-36.1, D-21/D-83, D-35, D-34/D-72 (samt Risiko § 48 EStG), D-37, N2/N3/E-07,
  `MENGEN_ANNAHMEN`, D-56, §6 und D-80; Test `hilfe/annahmen.test.ts` prüft die Punkte aus §5. **Folgen:** Wird A5 (128, 143,
  152, 153) gekürzt, müssen Skonto/Bauabzugsteuer/Vertragsstrafe/Zahlungen aus der Seite; bringt 157 weitere Formeln, ändert
  sich der Abschnitt „Mengenermittlung“.
- **D-147.9** Quelltext-Verweis auf „Über“: `https://github.com/JoSchwause/Ausschreibungssoftware` (Konstante in
  `hilfe/texte.ts`; bei Umbenennung vor der Veröffentlichung mitändern).

Ergebnis (nach dem Merge von `integration/welle-7`, samt 142): `pnpm lint` und `pnpm typecheck` grün. `pnpm test`: 4406 grün, 6 rot,
alle Leistungsbudgets unter Last (Lastmittel 16 bis 25 auf 4 Kernen; `kern` lv-pruefung, `speicher` v16-leistung und
aufmass-leistung, `vergabe` leistung, web `abrechnung/leistung`), keine Datei dieses Tickets, nichts gelockert. Fixture-Selbsttest
53 grün. E2E `erster-start.spec.ts` 4/4 grün; dazu `start`, `huelle`, `projekt`, `sicherung`, `navigation` (14) grün. Nach dem
Merge von 142 öffnet das E2E die Angebote über das Menü „Angebote“ (`erwartePunkt`).
