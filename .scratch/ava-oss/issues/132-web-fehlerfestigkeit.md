# 132: App: Fehlergrenze, Browserprüfung, Meldungs-Testhilfe

Status: claimed
Type: task
Welle: 7 · Strang: E13 · Paket/Ordner: neu `apps/web/src/fehler/`, `apps/web/src/main.tsx`, `apps/web/src/speicher/`, `apps/web/e2e/hilfen.ts` und Meldungsprüfungen in `apps/web/e2e/*.spec.ts`
Blocked by: –
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: Q5, L4, L5, U5; D-77
Herkunft: umfang §3 E13, B-23, B-24, B-26 (PDF-Rohfehler), B-38

## What to build

1. **Fehlergrenze** (React `ErrorBoundary`) um die App und Auffangen unbehandelter Fehler (`error`, `unhandledrejection`):
   eine Seite mit „Projektdatei sichern“ (wenn ein Projekt offen ist und der Speicher lebt), „Neu laden“ und aufklappbaren
   Einzelheiten (Meldung, Stapel) statt einer leeren Seite. Ein Test (Unit mit Testing Library oder E2E über einen nur im
   Testbuild erreichbaren Auslöser, wie die Prüfmethoden in D-100.3).
2. **Startprüfung (D-77):** Fähigkeiten prüfen (OPFS, Worker, Module-Worker, `crypto.subtle`, …). Fehlt etwas: deutsche Meldung
   mit nächstem Schritt, „geprüft: aktuelle Chrome und Edge; Firefox und Safari nicht geprüft“. „Unbekannter Fehler beim
   Speichern“ (`speicher/SpeicherAnbieter.tsx`) wird eine Meldung mit Ursache und nächstem Schritt.
3. Alle Fehlermeldungen der App deutsch und mit nächstem Schritt, wo sie aus Code-Fehlern kommen (rohe Fehlermeldung beim PDF,
   `ausgabe/LvDrucken.tsx`: nur den Rohtext ersetzen, ein Zeiler).
4. **B-38:** `apps/web/e2e/hilfen.ts` bekommt eine Hilfe `meldung(page, text)`/`erwarteMeldung`, die in der sichtbaren Meldung
   sucht, nicht im Ansageknoten (`packages/ui-basis/src/Toast.tsx` ansehen; nicht ändern). Alle Specs, die Meldungstexte prüfen,
   stellen darauf um; die Behelfe mit `.first()` dafür entfallen (u. a. `umwege.spec.ts:87`, `nachtrag.spec.ts:170`).
   Diesen Durchgang **zuletzt** machen, nach einem Merge der Integrationsspitze (131 ändert die Navigation in Specs).

## Acceptance criteria

- [ ] Fehlergrenze mit Test; Startprüfung mit Unit-Test (Fähigkeiten simuliert)
- [ ] Keine Meldungsprüfung mehr ohne die Hilfe (grep im Ticket belegt); volle Web-E2E zweimal hintereinander grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

- **D-132.1** Was zeigt ein unbehandelter Fehler im Hintergrund (`error`, `unhandledrejection`)? Entscheidung: Ein
  Band über der weiterlaufenden App (gleiche Knöpfe und Einzelheiten wie die Fehlerseite, dazu „Weiterarbeiten“); nur ein
  Renderfehler ersetzt die App durch die Fehlerseite. Grund: Im Hintergrund bleibt die Seite sichtbar und bedienbar, jeder
  Befehl ist schon gespeichert (U7); die App wegzunehmen hieße, bei einem harmlosen Fremdfehler die Arbeit zu
  unterbrechen. Die Chromium-Meldung „ResizeObserver loop …“ wird übergangen.
- **D-132.2** Wie kommt die Fehlerseite an Speicher und Projekt, obwohl sie über allen Anbietern steht? Entscheidung:
  `SpeicherAnbieter` meldet den offenen Speicher in `fehler/notfall.ts` an und ab; das Projekt kommt aus der Adresse
  (`/projekt/<id>…`, ohne die Basis des Builds) oder, da LV-Adressen seit Ticket 131 kein Projekt tragen
  (`/lv/<id>…`), aus den LV-Listen des Speichers (wie `ui/OrtLader.tsx`). Der Knopf erscheint, sobald der Speicher lebt
  und die Adresse auf ein Projekt oder LV zeigt; findet sich das Projekt nicht, nennt die Seite den Weg über die
  Übersicht. Der Download nutzt den Dateinamen der Sicherung (`<Projekt>-<Datum>.tethys.json`). Grund: kein Eingriff in
  die Seiten, die Hülle oder `ui/route.ts`.
- **D-132.3** Module-Worker-Erkennung ohne Worker-Start: Der Browser liest die Option `type` beim Umwandeln der
  Argumente; eine absichtlich ungültige Adresse lässt den Aufruf danach scheitern. Grund: die Inhaltsrichtlinie
  (`worker-src 'self'`) verbietet `blob:`/`data:`-Worker, und es entsteht kein Netzverkehr.
- **D-132.4** Öffnen des Speichers scheitert: eigene Meldungen je Fehlercode in `speicher/texte.ts` (Ursache, nächster
  Schritt, Einzelheiten aufklappbar) statt der allgemeinen Speicherfehlertexte aus `lv/texte.ts`. Begriff wie dort
  „Speicher des Browsers“ (kein Synonym „Ablage“, L2); geprüft vom Sprachtest aus Ticket 133. Die Meldung zu
  `gesperrt` nennt zusätzlich das private Fenster, weil der Speicher verweigerten Ablagezugriff ebenfalls als `gesperrt`
  meldet.
- **D-132.5** Hilfe für Meldungen (B-38): `meldung(page, text)` sucht nur unter den Einträgen der Region „Meldungen“ und
  nimmt bei mehreren passenden die neueste (`.last()` dokumentiert in der Hilfe); `erwarteMeldung(page, text)` wartet
  auf Sichtbarkeit. Bestand der Meldungsprüfungen mit zwei Sonden ermittelt (nur lokal, nicht eingecheckt): (a) Toasts
  ganz abgeschaltet → genau die Prüfungen, die eine Meldung erwarten (aufmass:143, bausteine:145, lv:83, lv:94,
  projekt:113, rechnung:211, sicherung:130, umwege:87, undo:261, x3:346); (b) Ansageknoten dauerhaft sichtbar → nur
  umwege:87 und sicherung:147 fielen. Alle zehn stehen jetzt auf der Hilfe; sicherung:147 sucht die Erinnerung über
  ihren Knopf statt jeden `status`. Mit Sonde (b) laufen die betroffenen Specs grün.
  Beleg (grep, nach der Umstellung): `grep -nE "tx-toast|name: /\^Meldungen/|getByText\([^)]*\)\.first\(\)" apps/web/e2e/*.ts`
  trifft nur `hilfen.ts` (die Hilfe selbst), `bausteine.spec.ts:159` (Feldmeldung des Zahlfelds im Katalog) und
  `x3.spec.ts:262` (Feldmeldung im Objektabschnitt); beide sind keine Toasts (Sonde a grün).
  `nachtrag.spec.ts:170` (in B-38 genannt) ist ein fester Hinweis auf der Preisspiegelseite, kein Toast; unverändert.
- Offen (nicht in diesem Ticket, P2): `bauzeit/PlanDrucken.tsx:79` und `bauleitung/PdfDialog.tsx:50` zeigen ebenfalls den
  Rohtext der Ausnahme beim PDF; die Ordner gehören anderen Tickets.
