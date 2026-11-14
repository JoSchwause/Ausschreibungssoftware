# 161: Projekt samt Inhalt löschen: Kern, Speicher, Dialog

Status: claimed
Type: task
Welle: 7 · Strang: K, S, E8 · Paket/Ordner: `packages/kern`, `packages/speicher`, `apps/web/src/projekt/`
Blocked by: 160, 143 (Schreiber in `speicher`)
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: A5, A6, Q4, Q5; ADR 0009; D-96
Herkunft: Tor E (158), E8, D-96

## What to build

1. **Kern:** Ausführer für `ProjektSamtInhaltLoeschen` (Bestand als Pflichtparameter) und Umkehrung.
2. **Speicher:** Löschen aller Aggregate des Projekts in einer Transaktion; Undo über den Schreibweg von `projektdateiEinlesen`
   (gleiche IDs, kein Kopie-Modus, Protokoll zurück); Modell-Bytes erst freigeben, wenn kein Undo-Schritt sie nennt.
   **Pflichttest (Eigenschaft):** Beispielprojekt (alle Aggregatarten inkl. Stände, Modelle, Rechnungen mit Zahlungen) →
   löschen → Undo → Projektdatei-Export byte-gleich bis auf genau den letzten Protokolleintrag `Rueckgaengig` (D-102; der Test prüft ihn und entfernt ihn vor dem Vergleich).
3. **App:** Menü „Weitere Aktionen“ → „Projekt löschen“ bietet bei Inhalt „Projekt samt Inhalt löschen …“: Dialog nennt die
   Anzahl je Art, verweist zuerst auf „Projektdatei sichern“ (Schaltfläche im Dialog), verlangt eine ausdrückliche
   Bestätigung; danach Projektliste, Rückgängig stellt alles her. E2E dazu.

## Acceptance criteria

- [ ] Byte-Vergleichstest grün; E2E löschen → Undo und löschen → Sicherung einlesen grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments
