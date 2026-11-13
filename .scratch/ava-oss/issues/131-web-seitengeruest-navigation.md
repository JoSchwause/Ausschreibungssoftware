# 131: App: Seitengerüst und Navigation

Status: ready-for-agent
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

- [ ] Punkte 1–6; alle bisherigen App-E2E grün (Tore M1–M4, X1–X4)
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments
