# 158: Tor E „Einführungsreife“

Status: ready-for-agent
Type: task
Welle: 7 · Strang: – · Paket/Ordner: `apps/web/e2e/umsteiger.spec.ts`, `apps/web/e2e/ueberlauf.spec.ts`, Kettentests
Blocked by: alle P-Tickets und die nicht gekürzten S-Tickets
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: Q2, Q4; Tor E in `plan.md` §4
Herkunft: umfang §4 Tor E

## What to build

1. `apps/web/e2e/umsteiger.spec.ts` bei 1280×800, **ohne Testhaken und ohne getippte Adressen nach dem Start**: erster Start →
   Beispielprojekt laden und ansehen → neues Projekt aus der amtlichen BVBS-X83 → LV-Seite zeigt mindestens 15 Zeilen samt EP
   und GP → zwei X84 → Preisspiegel, PDF erzeugt → Zuschlag → Nachtrag anlegen und beauftragen → Aufmaßblatt → Rechnung mit
   Skonto prüfen und freigeben, Zahlungsfreigabe als PDF → Kostenkontrolle → Projektdatei sichern → Projekt löschen →
   Sicherung einlesen → dieselben Werte.
2. `ueberlauf.spec.ts`: kein waagerechter Überlauf bei 1280 px auf allen Routen (Routenliste aus der App, nicht von Hand).
3. Formatvergleich (Kettentest aus 144/145) läuft; ohne gekürzte Formate.
4. Sprachtest (133) grün; Fehlergrenze (132) hat einen Test.
5. Alle früheren Tore grün (M1–M4, X1–X4), kein Budget gelockert; die Tor-E2E dreimal hintereinander grün.
Findet der Test einen Produktfehler: nicht im Test umgehen, sondern dem Orchestrator melden.

## Acceptance criteria

- [ ] Punkte 1–5 belegt (Laufzahlen im Ticket)
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments
