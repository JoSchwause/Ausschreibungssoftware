# 138: Vergabe v1.7a: Bieter umbenennen und löschen, Zuschlag zurücknehmen, Bieter-Stammdaten

Status: ready-for-agent
Type: task
Welle: 7 · Strang: V · Paket/Ordner: `packages/vergabe`
Blocked by: 127
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: A2, A5, Q5; D-74, D-21
Herkunft: umfang §3 E8, E10; B-16

## What to build

1. `BieterUmbenennen`, `BieterLoeschen` (nur ohne Angebot; sonst Fehlercode mit Anzahl).
2. Bieter-Stammdaten setzen (Anschrift, Ansprechperson, E-Mail, Telefon).
3. `ZuschlagZuruecknehmen` nach D-74: entfernt das Auftrags-LV samt Zuschlagsvermerk; Sperre bei Nachträgen, Aufmaßblättern,
   Rechnungen, Mängeln mit Fehlercode, der Art und Anzahl nennt; die Prüfung bekommt die Verweise als Eingabe (reine Funktion;
   die App/der Speicher liefert sie). Bauzeitenpläne sperren nicht. Ein Rückgängig-Schritt stellt alles wieder her.
5. **Aus dem Review (D-82, S9):** Statt eines Verteilers mit optionalen `verweise` schmale exportierte Funktionen, die die Verweise verlangen (der generische optionale Parameter bleibt für A8). Die Normalisierung der Bieterangaben ist eine Funktion aus `kern` (Ticket 137 exportiert sie); ist 137 beim Abschluss nicht gemergt, eine lokale Fassung mit Vermerk für die Review-Behebung.
4. Prüfen, dass `AngebotLoeschen`, `AngebotspositionSetzen`, `AngebotsNachlassSetzen` (setzen und entfernen) für die Bedienung
   taugen; Lücken schließen.

## Acceptance criteria

- [ ] Tests je Befehl inkl. Sperren und Umkehrung; Preisspiegel-Goldens unverändert
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments
