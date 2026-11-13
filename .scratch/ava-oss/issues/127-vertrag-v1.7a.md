# 127: `vertrag` v1.7a: Bedienung, Stammdaten, Einstellungen, Konstanten

Status: claimed
Type: task
Welle: 7 · Strang: F · Paket/Ordner: `packages/vertrag` (+ `GLOSSARY.md`; mechanische Folgezeilen in Verbrauchern nur, wo der Typcheck es erzwingt)
Blocked by: –
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: A4, P2, P9, A7, A8, L1, L2, N1; D-72 bis D-74; ADR 0011
Herkunft: `../umfang-welle-7.md` §3 E8, E9, E10, E15, E6 (Formatangabe), Ticket 123 Punkte 1, 5, 8 (`MENGENART_STUECK`), 9

## What to build

Erste Vertragsversion der Welle, seriell vor allen Fachpaketen (P9). Nur Typen, Konstanten, Befehlstypen, ChangeSet-Arten,
Repository-Schnittstellen und Glossar. Jede Änderung additiv und optional, damit Schema 1–6 weiter gelesen wird (A8).

1. **E8 neue Befehle:** `LvStandUmbenennen`, `LvStandLoeschen`; `BieterUmbenennen`, `BieterLoeschen` (nur ohne Angebot, sonst
   Fehlercode); `ZuschlagZuruecknehmen` (entfernt das Auftrags-LV; Sperre mit Fehlercode, der Art und Anzahl nennt, bei
   Nachträgen, Aufmaßblättern, Rechnungen, Mängeln; Bauzeitenplan und Kostenkontrolle sperren nicht, D-74). Prüfe, ob
   vorhandene Befehle (`HinweistextAnlegen`, `HinweistextAendern`, `AngebotLoeschen`, `AngebotspositionSetzen`,
   `AngebotsNachlassSetzen`, `OzMaskeSetzen`) für die Bedienung reichen; Lücken hier schließen.
2. **E9 Kalkulationsansätze an der Position:** Feld an `Positionsdaten` (Ansätze und Zuschlagssätze in der Form, die
   `packages/kosten/src/kalkulation.ts` rechnet) und Feldbefehl. Dezimaltypen (N1), keine `number`.
3. **E10 Stammdaten:** Projekt: Nummer, Ort, Anschrift der Baustelle (Befehl „Projektangaben setzen“ ersetzt/erweitert das
   Umbenennen). Bieter: Anschrift, Ansprechperson, E-Mail, Telefon. Büro (Absender): Name, Anschrift (u. a. Telefon, E-Mail)
   im Aggregat `Einstellungen`.
4. **E15 `Einstellungen` (D-73):** globales Aggregat (Büro, Druckprofile, KG-Bezeichnungen) mit eigenem Repository, außerhalb
   der Projekt-Undo-Historie; Befehle zum Setzen. Projektdatei Schema 7 trägt es als optionalen Block (Typ hier, Umsetzung
   `speicher`). Preisspiegel-Einstellungen (Ausreißer-Schwelle, ABC-Grenze) als optionales Feld am LV mit LV-Befehl;
   fehlend = Standardwerte nach D-05. D-36 (7) ist damit geändert (D-73).
5. **E6 Formatangabe:** Herkunftsformat eines eingelesenen LV (`DA XML 3.3/3.2/3.1`, `GAEB 90`, `GAEB 2000`) als Wert, wo
   der GAEB-Leser es braucht (optional, nur Information).
6. **Ticket 123 Punkt 1, 5, 8, 9:** Konstanten neben den Typen (KG-Form, Hash-Form, Listen der Mengen-, Struktur- und
   Schemaarten, `MENGENART_STUECK`); gemeinsamer Datumstyp für `bauzeit` und `bauleitung` (Kalenderdatum `JJJJ-MM-TT`, Marke);
   Vertragstext: Quelle `fristpruefung` nennt auch `mangel-angezeigt-ohne-frist`. Die Verbraucher stellen in 135/137/140 um,
   nicht hier.
7. Version `v1.7a` im Vertrag vermerken; Glossar zuerst (L2) für jeden neuen Begriff (z. B. „Einstellungen“, „Büro“,
   „Projektangaben“, „Kalkulationsansatz“). Typtests (`vertrag.test.ts`) für jede neue Form.

Nicht hier: A5 (Skonto, Bauabzugsteuer, Vertragsstrafe, Zahlungen) folgt in 128.

## Acceptance criteria

- [ ] Alle Punkte 1–7 als Typen/Konstanten mit Tests; alte Fixtures und Projektdateien typprüfen weiter
- [ ] `## Comments` listet jede Lesart (D-127.x) für die Verbraucher-Tickets 135–155
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [ ] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments
