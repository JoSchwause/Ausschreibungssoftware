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

Entscheidungen (Demo-Modus, Ticket 161):

- **D-161.1 Undo prüft wie das Einlesen.** Frage: Wie streng prüft `speicher` den Bestand einer Umkehrung? Entscheidung: Der
  Bestand geht mit Projekt, Schemaversion und den Modell-Bytes aus der Ablage durch `dekodiereProjektdatei` und dann durch
  `schreibeProjektdatei` (derselbe Schreibweg wie `projektdateiEinlesen`, gleiche Kennungen, kein Kopie-Modus, keine
  Übernahme der Einstellungen). Weist der Dekoder ab: `unbekannt` (andere Form, D-160.3). Besteht das Projekt, ein Aggregat,
  ein LV-Stand oder ein Protokolleintrag des Bestands schon, oder fehlen Bytes einer genannten Modelldatei: `konflikt` mit
  den Kennungen, nichts geschrieben. Grund: Q5, keine zweite Prüflogik.
- **D-161.2 Protokoll beim Löschen (D-104).** Das gespeicherte Protokoll muss mit `bestand.vorher.protokoll` beginnen;
  danach angehängte Einträge (Rückgängig/Wiederholen) sind erlaubt und gehen mit dem Projekt. Alles andere im Bestand und
  das Projekt samt Bietern werden kanonisch genau verglichen. Folge: Ein zweites Rückgängig nach Wiederholen stellt den
  Bestand des ersten Löschens her; der Eintrag des ersten Rückgängig ist dann weg (er gehörte zum gelöschten Protokoll).
- **D-161.3 Dialog mit Inhalt.** „Projekt löschen“ liest den Bestand und zählt je Art. Mit Inhalt bietet der Dialog nur
  „Projekt samt Inhalt löschen …“ an (nicht mehr „Endgültig löschen“, das dort nur `konflikt` liefern konnte); ohne Inhalt
  bleibt alles wie bisher (`ProjektLoeschen`). Der Schritt in `e2e/undo.spec.ts`, der die Konfliktmeldung erwartete, prüft
  jetzt Inhalt und Angebot im Dialog (Verhalten geändert, keine Prüfung abgeschwächt; die `konflikt`-Regel von
  `ProjektLoeschen` bleibt in `kern`/`speicher` und ihren Tests).
- **D-161.4 Bestand beim Bestätigen neu lesen.** Die Zahlen im Dialog stammen vom Öffnen; ausgeführt wird mit dem Bestand,
  der in der Kette des Befehlswegs unmittelbar vor dem Schreiben gelesen wird (sonst `konflikt` nach einem Befehl dazwischen).
- **D-161.5 Ziel und Rückmeldung.** Nach dem Löschen Projektliste und Hinweis „Rückgängig holt es zurück“. Undo/Redo-Ziel
  wie beim Löschen des Projekts allein (`projektZiel` mit dem Projektteil des ChangeSets): Undo auf der Liste bleibt dort,
  Redo von der Projektseite führt zur Liste.
- **D-161.6 Zahlungen und Protokoll zählen nicht als Art.** Der Dialog zählt die Listen des Bestands (LVs, LV-Stände,
  Angebote, Auftrags-LVs, Aufmaßblätter, Rechnungen, Kostenermittlungen, Modelle, Bauzeitenpläne, Honorarberechnungen,
  Mängel, Bautagebucheinträge); Zahlungen gehen mit ihrer Rechnung.
- **D-161.7 Einstellungen über den Kern (D-87 (3), Auftrag des Orchestrators).** `uebernimmEinstellungenDerDatei` ruft
  `einstellungenBefehlAusfuehren` (`EinstellungenUebernehmen`); weist der Kern den Block ab: `datei-ungueltig`. Die eigene
  Kopie der Regel in `speicher/einstellungen.ts` ist entfernt; Test in `projektdatei-einstellungen.test.ts`.

Torweg für Tor E: Projektseite → „Weitere Aktionen“ → Menüpunkt „Projekt löschen“ → Dialog „Projekt löschen“ (Liste
„Inhalt des Projekts“) → „Projekt samt Inhalt löschen …“ → Dialog „Projekt samt Inhalt löschen“: „Projektdatei sichern“
(hat den Fokus), Ankreuzfeld „Ja, das Projekt „…“ mit allem Inhalt löschen“, dann „Projekt samt Inhalt löschen“.
