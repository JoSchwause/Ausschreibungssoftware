# 155: App: Vorschau-Module anbinden (E16, Tickets 123/124 Rest)

Status: claimed
Type: task
Welle: 7 · Strang: X1–X4, E16 · Paket/Ordner: `apps/web/src/bauzeit/`, `bauleitung/`, `honorar/`, `bim/`, `modellvergleich/`, `packages/bim` (Hinweis Doppelmessung)
Blocked by: 131, 140
Modell: opus
Priorität: S (Teile K) (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: U3, Q5, A2; D-109.7, D-118.3, D-118.7, D-122.x
Herkunft: umfang §3 E16, B-31 bis B-33; Ticket 124 Punkte 1, 2, 4, 5; Ticket 123 Punkt 4 (Honorar-PDF im Worker) und 8 (App-Teile)

## What to build

Reihenfolge = Priorität (bei Zeitnot von hinten kürzen und im Ticket vermerken):
1. **Auswahl statt Handeingabe:** Mangel → Position (Auswahl aus dem Auftrags-LV) und Bauteil (Auswahl aus dem Modell);
   Verweis Honorar ↔ Kostenermittlung (beide Richtungen); „Aufmaß aus Modell“ öffnet das Modell mit dem Auftrags-LV vorgewählt.
2. **124 §5, §1, §2:** Bezug auf einzelne LV-Knoten im Vorgangsdialog; Vorgang verschieben (Ebene, Tastatur, ein Undo);
   Fortschritt aus dem Leistungsstand vorschlagen.
3. **S:** Hinweis, wenn ein Bauteil schon auf einem anderen Aufmaßblatt gemessen ist (Funktion in `packages/bim`).
4. **123 Rest:** Honorar-PDF im Worker; `modellvergleich/folgen.ts` und `bim/uebernahme.ts` zusammenlegen;
   `ModellvergleichSeite.tsx:397` → `bim/darstellung.ts`; `bim/einlesen.ts` → `datumAusUhr`; `MengenAusModell.tsx:145` →
   `datumDe`; Text aus `BauzeitenplanSeite.tsx:396` nach `texte.ts`; `useBezug` umbenennen.
7. **Aus 140 (D-140.3, D-140.7):** `ui-modell` nimmt `IfcGlobalId` statt `string` (neue Abhängigkeit `ui-modell → vertrag`, Lockfile) zusammen mit den Aufrufern in `apps/web/src/bim/`, `modellvergleich/`; die App importiert `MENGENART_STUECK` aus `@tethys/vertrag`, danach entfällt die Durchreichung in `bim/index.ts`. Die betroffenen Dateien nennt D-140.7 in `140-fachpakete-aufraeumen.md`.
5. **124 §4:** Preisspiegel-Budget (`vergabe`) auf ruhiger Maschine messen, Wert ins Ticket (nichts lockern).
6. **K:** „Mangel aus Bauteil“ in der Modellansicht; Befund „KG im Modell weicht ab“.

## Acceptance criteria

- [ ] E2E/Unit für die erledigten Punkte; Tore X1–X4 grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

Entscheidungen im Demo-Modus (Branch `welle-7/155-vorschau`):

- **D-155.1 Auswahl aus langen Listen.** Frage: Position (bis 10.000) und Bauteil (bis 10.000) als Radix-Auswahl? Entscheidung:
  `bauleitung/Suchauswahl.tsx` – bis 100 Einträge eine gewöhnliche Auswahl, darüber ein Suchfeld davor, die gewählte bleibt
  immer in der Liste. Der Entwurf hält die Kennung der Position (`positionId`) statt der OZ. Bauteile kommen aus dem gewählten
  Modell, bei „in jedem Modellstand“ aus dem zuletzt eingelesenen Stand; ein gespeichertes Bauteil, das dort fehlt, bleibt als
  eigener Eintrag wählbar (Q5). Grund: U3 (Tastatur), keine zweite Grid-Komponente (U2), Radix rendert sonst tausende Einträge.
- **D-155.2 Einhängestellen in fremden Ordnern (je eine Zeile, wie D-115).** `kosten/KostenermittlungSeite.tsx` zeigt
  `HonorarVerweise` (Verweis Kostenermittlung → Honorar); `auftrag/AuftragsLvSeite.tsx` nimmt die Adresse von „Aufmaß aus
  Modell“ aus `useAufmassAusModellPfad` (seit 142 im Menü „Abrechnung“); `hilfe/beispielprojekt.ts` nimmt `datumAusUhr` statt
  des entfallenen `tagDesEinlesens`. Grund: ohne die Zeilen gäbe es die verlangte Richtung nicht; Ordner der Tickets 147/151/154.
- **D-155.3 „Aufmaß aus Modell“.** Genau ein aktueller Stand (kein anderer nennt ihn als Vorgänger) → dieses Modell, sonst die
  Liste; das Auftrags-LV reist als Suchparameter `?auftrag=` mit (die Route liest nur den Pfad) und ist auf der Modellseite als
  „LV für Zuordnung“ vorgewählt. Die E2E `x1-erweitert`/`bim-mengen` klicken nicht mehr „haus-v1“ in der Liste, sondern prüfen
  die Vorwahl.
- **D-155.4 Bezug auf Knoten.** „Umfang des Bezugs“ (ganzes LV / ausgewählte Gliederungen und Positionen) mit Suchfeld und
  Kontrollkästchen, eingerückt nach Tiefe, höchstens 100 Treffer plus die gewählten; eine leere Wahl ist ein Feldfehler (der
  Ausführer weist `knotenIds: []` ab). Die Bezugswahl nennt „LV: …“ und „Auftrags-LV: …“, weil beide nach dem Zuschlag gleich
  heißen.
- **D-155.5 Fortschritt aus dem Leistungsstand.** Leistungsstand aus allen Aufmaßblättern des Auftrags-LV mit Rechnungsart
  „Abschlag“ (wie Soll/Ist), Anteil mit `fortschrittVorschlagen` (D-109.7); der Dialog zeigt den Vorschlag, „Vorschlag
  übernehmen“ setzt nur das Feld (kein stiller Wert).
- **D-155.6 Vorgang verschieben.** „Nach oben“/„Nach unten“ und Alt+↑/↓ im Grid (wie Positionen im LV) als `VorgangSetzen` mit
  unverändertem Vorgang und neuem `nach`: ein Undo-Schritt, der Teilbaum zieht mit.
- **D-155.7 Hinweis „schon aufgemessen“ (S).** Eine Ansatzzeile trägt keine GlobalId (Vertrag); dasselbe *Bauteil* ist darum
  nicht erkennbar. Umgesetzt: `aufmassUeberschneidungen` in `bim` nennt je Position des Vorschlags die anderen Blätter desselben
  Auftrags-LV, auf denen sie schon steht (Nummer, Menge); der Dialog listet sie vor dem Anlegen. **Frage an den Orchestrator:**
  Ein genauer Bauteilhinweis braucht eine GlobalId an der Ansatzzeile oder Aufmaßposition (Vertragsänderung, eigenes Ticket).
- **D-155.8 Honorar-PDF im Worker** wie Bauzeitenplan und Bauleitung (`honorar/pdf-worker.ts`); Aufrufer unverändert.
- **D-155.9 `folgen.ts` + `uebernahme.ts`.** „Mengen aktualisieren“ rechnet über `uebernahmeVorschau`/`uebernahmeBefehle` (ein
  Weg), `ansatzText` in der Vergleichsseite, `datumAusUhr` beim Einlesen, `datumDe` in „Mengen aus Modell“, Schwere-Texte des
  Bauzeit-Befundpanels in `texte.ts`, `useBezug` → `useZuordnungsLv` (Typen `ZuordnungsLv…`, L2).
- **D-155.10 `ui-modell` mit `IfcGlobalId` (D-140.3, D-140.7).** Eingaben, Rückmeldungen und `bildschirmpunkt` tragen die Marke;
  sie entsteht in `geometrie-lesen.ts` beim Lesen der Datei (Cast, der Abgleich bleibt Gleichheit). `Darstellungsstand.farben`
  bleibt `Record<string, string>` (nur Anzeige im Test). Neue Abhängigkeit `ui-modell → vertrag` (Paketgrenze erlaubt, Lockfile
  +3 Zeilen). Die App importiert `MENGENART_STUECK` aus `@tethys/vertrag`; die Durchreichung in `bim/index.ts` entfällt.
- **D-155.11 Messung Preisspiegel (124 §4).** Keine ruhige Maschine verfügbar (Last 27–29 auf 4 Kernen): `preisspiegelBerechnen`
  (gross, 5 Angebote) 822 / 1.094 / 786 ms bei Budget 1.000 ms; `AngebotspositionSetzen` Median 1,8–2,4 ms (Budget 16 ms).
  Nichts gelockert; die Messung auf ruhiger Maschine bleibt offen.
- **D-155.12 Gekürzt (K, Punkt 6):** „Mangel aus Bauteil“ in der Modellansicht und der Befund „KG im Modell weicht ab“ – nach der
  Kürzungsreihenfolge (§4: K-Teile von E16 zuerst); gehen nach §6.
