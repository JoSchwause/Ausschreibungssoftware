# 132: App: Fehlergrenze, Browserprüfung, Meldungs-Testhilfe

Status: ready-for-agent
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
