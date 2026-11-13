# 147: App: Erster Start, Beispielprojekt, Hilfe, Speicherstatus

Status: claimed
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

- [ ] Punkte 1–4; Annahmen-Seite nennt alle Punkte aus §5
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments
