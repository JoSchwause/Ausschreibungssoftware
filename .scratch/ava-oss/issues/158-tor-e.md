# 158: Tor E „Einführungsreife“

Status: claimed
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
**D-95:** Beim Einlesen der Sicherung erscheint der Dialog „Projektdatei eingelesen“ (übernommene Einstellungen); der Torweg schließt ihn.
Findet der Test einen Produktfehler: nicht im Test umgehen, sondern dem Orchestrator melden.

## Acceptance criteria

- [ ] Punkte 1–5 belegt (Laufzahlen im Ticket)
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

Entscheidungen im Demo-Modus (Branch `welle-7/158-tor-e`):

- **D-158.1** Zweites Angebot zur BVBS-X83? Es gibt nur eine amtliche X84 dieser Reihe. → Das zweite Angebot entsteht im Test
  aus der amtlichen X84: EP verdoppelt, Bieter „Zweitbieter Bau (erfunden)“, ohne die Beträge der Datei (`IT`, `Totals`). Die
  Dateien im Repo bleiben unverändert (C4). Sollwerte stehen in der amtlichen Datei (`BoQInfo/Totals`: netto 2.000.000,00,
  brutto 2.380.000,00); das zweite Angebot ist genau das Doppelte, weil GP beim doppelten EP genau das Doppelte ist – der Test
  prüft das für jede Position (`verdoppelnNichtExakt`). Die App zeigt beide Summen so (auch den Zuschlag `AllInCat` 10 %).
- **D-158.2** Angebot des Auftragnehmers zum Nachtrag ohne Testhaken? → Die Übersicht sichert die Projektdatei (Download);
  aus ihr schreibt der Test mit `lvAlsExcel` das ausgefüllte Excel des Nachtrags-LV (an Stelle der Software des
  Auftragnehmers) und liest es über „Angebot des Auftragnehmers einlesen“ ein. Preise selbst gewählt, GP nach N2 hergeleitet.
- **D-158.3** Routenliste „aus der App“: `ueberlauf.spec.ts` folgt ab der Projektliste jedem Verweis der App (Seitenleiste,
  Krumen, Seiten) und prüft jede Adresse bei 1280 × 800 (Seite und Arbeitsfläche), in der Hilfe jeden Reiter. Vorher legt
  er über die Oberfläche das Beispielprojekt an und ergänzt Nachtrag, LV-Stand, Kostenermittlung, Honorarberechnung,
  Bauzeitenplan und einen zweiten Modellstand. Vollständigkeit: Jede Adresse wird mit den Erkennern der App (`*/pfad.ts`,
  `ui/navigation.ts`, Reihenfolge wie `App.tsx`) einer Seitenart zugeordnet; eine Adresse ohne Art (neue Route) oder eine Art
  ohne Besuch lässt den Test fallen; die Seitenleiste muss jeden Bereich verlinken. Den LV-Stand verlinkt nur der Dialog
  „LV-Stände“; seine Adresse kommt aus dem Aufbau dazu. `/katalog` (nur im Test-Build) wird mitgeprüft. Gegenprobe: bei
  1100 px meldet der Test den Preisspiegel.
- **D-158.4** Schritte, deren Bedienung noch gebaut wird (Preisspiegel-PDF 149; Skonto, Zahlung, Zahlungsfreigabe-PDF 143/152;
  Kostenkontrolle-PDF 154; Projekt samt Inhalt löschen 160/161, D-96), stehen im selben Torweg hinter dem Schalter
  `ausstehend` und laufen im `test.fixme` „der ganze Weg samt den ausstehenden Schritten“. Bis D-96 gemergt ist, liest ein
  frisches Gerät (eigener Browser-Kontext) die Sicherung ein und muss dieselben Werte zeigen.
- **D-158.5** „Dieselben Werte“: `werteLesen` liest über die Oberfläche LV- und Auftragsliste der Übersicht, die Bietertabelle
  des Preisspiegels, Summen und Nachträge des Auftrags-LV, die Summe Soll/Ist, die Abzugskette und Freigabe von Rechnung 1 und
  die Kostenkontrolle, vor der Sicherung und nach dem Einlesen.
- **Befund an den Orchestrator (→ D-96):** „Projekt löschen“ weist ein Projekt mit LV, Angeboten, Auftrags-LV und beauftragtem
  Nachtrag ab; der Torweg wäre nur über 10+ Schritte von Hand möglich. Entscheidung D-96: eigener Befehl „Projekt samt Inhalt
  löschen“ (160, 161).
- Punkt 3 und 4: `packages/gaeb/src/formatvergleich.test.ts` (3.3, 3.1, GAEB 90, GAEB 2000), `apps/web/src/sprache.test.ts`
  und `apps/web/src/fehler/Fehlergrenze.test.tsx`: 53/53 grün.
