# 153: `ausgabe`: Kostenermittlung, Kostenkontrolle, Zahlungsfreigabe mit A5

Status: claimed
Type: task
Welle: 7 · Strang: O, E12 · Paket/Ordner: `packages/ausgabe`
Blocked by: 141, 128
Modell: opus
Priorität: S (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: ADR 0012, N4, D-72
Herkunft: umfang §3 E12, E11 (A5-Zeilen)

## What to build

1. **Kostenermittlung** und **Kostenkontrolle** als PDF und Excel (je KG, mit Bezeichnungen, wo vorhanden; netto, Nachlass als
   eigene Zeile, D-37).
2. **Rechnungsprüfung/Zahlungsfreigabe** um die A5-Zeilen (Vertragsstrafe, Skonto beider Szenarien, Bauabzugsteuer „an das
   Finanzamt“, Auszahlung, Zahlungen, offen) ergänzen.
4. **ADR 0012 nachführen (D-88):** datierter Nachtrag in den Folgen: Excel für Berichte aus dem `Berichtsmodell` (D-141.2), Bilder aus dem Langtext im LV-PDF (D-141.5); die Entscheidung selbst bleibt.
3. **K:** Bauzeitenplan-PDF mit Balken – nur, wenn Zeit bleibt; sonst im Ticket als gekürzt vermerken.

## Acceptance criteria

- [ ] Seitentext-/Zelltests für 1–2
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-153.1** Woher kennt `ausgabe` die Ergebnisse von `kosten`? **Wie D-141.1: Eingabetypen in `ausgabe`, gleich gebaut
  wie `Kostenermittlungsergebnis` und `Kostenkontrolle`; die App reicht sie unverändert durch.** Eine Typprobe in `apps/web`
  (nicht committet) hat gezeigt, dass `Kostenermittlung`, `Kostenermittlungsergebnis`, `Kostenkontrolle`,
  `Einstellungen.kostengruppenbezeichnungen`, `Einstellungen.buero` und `Projekt` ohne Umweg passen.
- **D-153.2** Titel der Kostenermittlung: **die Stufe („Kostenberechnung“), im Kopf „Kostenermittlung: Name“;** die Texte der
  Stufen stehen als `KOSTENERMITTLUNGSSTUFE_TEXT` im Paket (gleich wie am Bildschirm). Grund: So heißt das Dokument im Büro.
- **D-153.3** Gliederung im Druck: **keine Einrückung, Kostengruppen der ersten Ebene fett.** Grund: Die Einrückung des
  Berichtsmodells setzt Leerzeichen vor die erste Zelle, in Excel stünde die KG dann als „  330“ und ließe sich nicht mehr
  filtern; die Nummer selbst zeigt die Ebene.
- **D-153.4** Kostenkontrolle: **„Ohne Kostengruppe“, „Nachlass“ und „Gesamt“ als Zeilen nach den Kostengruppen, Text in der
  Spalte Bezeichnung; Budget und Abweichung `null` als „–“; die Abweichung trägt „über Budget“ / „unter Budget“ als Hinweis
  (wie Symbol und Beschreibung am Bildschirm, nicht nur als Vorzeichen); `mitAbrechnung: false` druckt die Spalte
  Abrechnung als „–“ mit dem Satz der Seite.** Hinweise der Kostenkontrolle kommen als fertige Texte (`hinweise`), weil ihre
  Schwere „hinweis“ nicht in `Befundtext` passt.
- **D-153.5** Seite: **A4 hoch** (sechs Spalten passen), `{lv}` = Name der Kostenermittlung bzw. „Kostenkontrolle“.
