# 138: Vergabe v1.7a: Bieter umbenennen und löschen, Zuschlag zurücknehmen, Bieter-Stammdaten

Status: claimed
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

Umsetzung (Demo-Modus, Entscheidungen der Agentin; Lesarten D-127.2 bis D-127.4, D-127.6, D-127.14, D-127.17 gelten):

- **D-138.1 Namen und Nahtstellen.** Frage: Wie heißen die Funktionen, die die App statt der Kern-Ausführer ruft? Entscheidung:
  `@tethys/vergabe` exportiert `projektBefehlAusfuehren` (Typ `ProjektBefehlAusfuehren`) und `auftragsLvBefehlAusfuehren` (Typ
  `AuftragsLvBefehlAusfuehren`), gleichnamig mit denen des Kerns; sie führen `BieterUmbenennen`, `BieterangabenSetzen`,
  `BieterLoeschen` bzw. `ZuschlagZuruecknehmen` selbst aus und reichen alles andere samt `verweise` unverändert an den Kern.
  Getestet wird nur an diesen beiden Funktionen und an `zuschlagErteilen`/`angebotBefehlAusfuehrer`. Grund: Für die App (149/150)
  ändert sich nur die Importquelle; die Umkehrung bleibt die des Kerns (D-127.17).
- **D-138.2 Verweissperre.** Frage: Reihenfolge der Prüfungen und Umgang mit schlecht geformten `verweise`? Entscheidung: erst
  Zustand (`befehl-nicht-zustaendig`), dann `bieterId` (`ungueltige-eingabe`, `feld: 'bieterId'`), dann `verweise`: fehlt oder
  keine Liste, unbekannte Art, Art doppelt, Anzahl keine ganze Zahl ≥ 0 → `ungueltige-eingabe` mit `feld: 'verweise'`; danach
  die Sperre (`verweise-vorhanden`, nur Arten > 0 in der Reihenfolge des Befehls: `angebot` bzw. nachtrag, aufmass, rechnung,
  mangel). Nicht sperrende Arten werden auf Form geprüft, aber nicht gelesen. Die `meldung` ist Entwicklertext (Befehlsname,
  Art und Anzahl); den Text für Nutzer baut die App aus `verweise` (L4/L5). Grund: D-127.2, `Verweisanzahl` („jede Art höchstens
  einmal“).
- **D-138.3 Bieterangaben.** Frage: Wie streng ist die Form, und wann ist nichts geändert? Entscheidung: `angaben` ist Objekt oder
  `null`; jedes Textfeld Text oder `null` (fehlend ist ein Fehler mit `feld: 'angaben.<feld>'`), `anschrift` Objekt oder `null`;
  `''` → `null`, kein Kürzen von Leerzeichen, kein Formatcheck (U5). Ist der normalisierte Wert gleich dem gespeicherten (oder
  bleibt der Name gleich), liefert der Befehl `vorher` gleich `nachher` wie `ProjektStammdatenSetzen`. Die Normalisierung liegt in
  `vergabe`; der Kern (137) braucht dieselbe für `BieterAnlegen` mit `angaben` (Doppelung, siehe Bericht). Grund: D-127.4.
- **D-138.4 Form des ChangeSets beim Zurücknehmen.** Frage: Welcher Kopf geht in `kopf.vorher`? Entscheidung: alles außer den
  Knoten (wie `ohneKnoten` bei `LeistungsverzeichnisLoeschen`), damit die Umkehrung genau den gespeicherten Stand anlegt; Knoten
  wie gespeichert unter `knoten.entfernt`, die Summen aller Knoten nach Kennung sortiert unter `summen.vorher.entfernt`,
  `summen.vorher.gesamt` gesetzt, keine Hinweise. Grund: D-127.3; Test: Anwenden, Umkehren, Anwenden ergibt den Zustand exakt.
- **D-138.5 Zuschlag und Stammdaten.** Frage: Was ändert v1.7a an `zuschlagErteilen`? Entscheidung: (a) `kalkulation` entfällt an
  jeder Position des Auftrags-LV (D-127.6); (b) Straße, PLZ und Ort aus `Bieter.angaben.anschrift` werden zur Anschrift des
  Auftragnehmers, als Kopie zum Zeitpunkt des Zuschlags wie der Name (E10: die Angaben erscheinen in den Köpfen). Ohne Angaben
  bleibt alles wie bisher, die Goldens sind unverändert. Grund: E10, D-127.6.
- **D-138.6 Punkt 4 (Bedienung der Angebotsbefehle).** Frage: Fehlt etwas für die Bedienung? Entscheidung: nein (wie D-127.14).
  Ein Ablauftest belegt erfassen, berichtigen, auf „nicht angeboten“ berichtigen, Nachlass als Prozent, dann als Betrag setzen
  und entfernen, löschen, jeder Schritt mit Rückgängig, mit Sollwerten von Hand. Einen Eintrag ganz zu entfernen („kein
  Eintrag“) gibt es nicht; die Berichtigung ist „nicht angeboten“.
