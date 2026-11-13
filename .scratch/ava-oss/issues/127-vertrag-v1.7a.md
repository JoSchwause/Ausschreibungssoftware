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

Lesarten von `vertrag` v1.7a für die Verbraucher (Demo-Modus, vorläufige Annahmen, enge Lesart; dieselben Texte stehen an den
Typen). Alles ist additiv oder optional: Projekte, Projektdateien (Schema 1–6), Protokolle und Fixtures vor v1.7a typprüfen und
gelten unverändert.

- **D-127.1 LV-Stand umbenennen und löschen (E8).** Frage: Der LV-Ausführer sieht keine Stände; wie entsteht das ChangeSet,
  und wie macht Undo ein Löschen rückgängig? Entscheidung: eigene Gruppe `LvStandBefehl` (`LvStandUmbenennen { lvStandId,
  name }`, `LvStandLoeschen { lvStandId }`), **nicht** in `LvBefehl`, aber in `Befehl`; eigener Ausführer
  `LvStandBefehlAusfuehren(stand: LvStand, befehl)` (kern, 137), fremde `lvStandId` → `befehl-nicht-zustaendig`. ChangeSet ist
  ein `LvChangeSet` des LV des Stands (`kopf: null`, keine Knoten, leere Summen), im Protokoll mit diesem LV als Aggregat.
  Umbenennen: `lvStand` mit beiden Köpfen. Löschen: `lvStand.nachher: null` **und** neu `lvStandInhalt: { vorher: { angelegt,
  zustand }, nachher: null }`; dessen Umkehrung legt `speicher` (139) genau diesen Stand mit seinem `angelegt` ab, statt neu
  einzufrieren; `lvStandInhalt` fehlt bei Anlegen/Umbenennen; Verstöße → `unbekannt`. App (150) lädt den Stand mit
  `lvStaende.laden`. Grund: Q5 (Undo ohne Vorzustand) und D-12 (ein LV mit Ständen war sonst unlöschbar).
- **D-127.2 Verweissperre (E8, D-74).** Neuer Fehlercode `verweise-vorhanden` mit `Befehlsfehler.verweise:
  Verweisanzahl[]` (`{ art: 'angebot' | 'nachtrag' | 'aufmass' | 'rechnung' | 'mangel', anzahl }`, nur Anzahl > 0, nie leer,
  Reihenfolge nachtrag, aufmass, rechnung, mangel). `ProjektBefehlAusfuehren` und `AuftragsLvBefehlAusfuehren` bekommen einen
  **optionalen** dritten Parameter `verweise` (Aufrufe mit zwei Argumenten bleiben gültig); die App zählt aus den Listen des
  Speichers. Fehlt er bei `BieterLoeschen`/`ZuschlagZuruecknehmen`: `ungueltige-eingabe` (`feld: 'verweise'`). `speicher` hält
  dieselbe Sperre zusätzlich als `konflikt` (auch für ein Undo, etwa von `BieterAnlegen` bei bestehendem Angebot). `nachtrag`
  zählt jedes LV mit `nachtrag.auftragsLvId` auf das Auftrags-LV, gleich welcher Status. Die App (149/150) baut den Text aus Art
  und Anzahl (L4/L5); `lv/texte.ts` hat dafür vorerst einen allgemeinen Satz.
- **D-127.3 Zuschlag zurücknehmen (E8, D-74).** `ZuschlagZuruecknehmen {}` ist ein `AuftragsLvBefehl`; ausgeführt von
  `vergabe` (138, siehe D-127.17). ChangeSet wie `LeistungsverzeichnisLoeschen` (Kopf vorher, alle Knoten entfernt, alle
  Summen in `summen.vorher`). Sperren nur Nachträge, Aufmaßblätter, Rechnungen, Mängel; Bauzeitenplan und Kostenkontrolle
  nicht (der Dialog in 149 nennt die Vorgänge und dass die Auftragswerte der Kostenkontrolle entfallen). Angebot, LV und
  Nachtragsangaben bleiben; einen „Zuschlagsvermerk“ gibt es im Modell nicht (der Zuschlag ist das Bestehen des Auftrags-LV,
  D-21), 138 hat also nichts weiter zu entfernen.
- **D-127.4 Bieter (E8, E10).** `BieterUmbenennen { bieterId, name }`, `BieterangabenSetzen { bieterId, angaben |
  null }`, `BieterLoeschen { bieterId }` sind Projektbefehle (ganzes Projekt im ChangeSet), ausgeführt von `vergabe` (138,
  D-127.17); ein Dialog, der Name und Angaben ändert, schreibt beide als Befehlsfolge. `Bieter.angaben?: Bieterangaben { anschrift: Anschrift | null, ansprechperson,
  email, telefon }`; `BieterAnlegen` darf `angaben` mitbringen (gaeb 136 füllt die Anschrift aus X84/X86). Unbekannte
  `bieterId` → `ungueltige-eingabe` (`feld: 'bieterId'`). `BieterAnlegen` mit `angaben` bleibt im Kern (137), mit derselben
  Normalisierung. Normalisierung im Ausführer: `''` → `null`, Anschrift ganz `null` →
  `null`, Angaben ganz `null` → Feld fehlt. Kein Formatcheck für E-Mail/Telefon (U5).
- **D-127.5 Projektangaben (E10).** `Projekt.angaben?: Projektangaben { nummer, ort, baustelle: Anschrift | null }`
  (Name und Bauherr bleiben am Projekt). `ProjektangabenSetzen { name, bauherr, angaben | null }` ersetzt in der App
  `ProjektStammdatenSetzen`; dieses bleibt gültig (alte Protokolle) und lässt `angaben` unverändert. `Anschrift { strasse,
  plz, ort }` wie `Auftraggeber`; `Bauherr.anschrift` bleibt freier Text. Normalisierung wie D-127.4.
- **D-127.6 Kalkulationsangaben (E9).** `Positionsdaten.kalkulation?: Kalkulationsangaben { ansaetze:
  Kalkulationsansatz[], zuschlagssaetze: Kalkulationszuschlagssaetze }`; `Kalkulationsansatz` und
  `Kalkulationszuschlagssaetze` sind aus `kosten` gewandert und gleich gebaut (kosten stellt in 137 um). Befehl
  `KalkulationSetzen { positionId, kalkulation | null, einheitspreis, epa }` nur im LV: trägt das Ergebnis mit (wie
  `MengenansatzSetzen`), der Kern rechnet nicht nach (A3). Leer (kein Ansatz, kein Satz) → Feld fehlt. **Lesart (a) wie D-22:**
  `EinheitspreisAendern` und `EinheitspreisanteileSetzen` an einer Position mit Kalkulation entfernen sie im selben ChangeSet
  (kern 137; die Oberfläche fragt vorher). Anlegen und Kopieren nehmen sie mit (Muster-LV); `zuschlagErteilen` (vergabe 138)
  und `nachtragUebernehmen` (abrechnung, mit 143) lassen sie weg; der GAEB-Export schreibt sie nicht, ohne Warnung (die EPA tragen das
  Ergebnis).
- **D-127.7 Preisspiegel-Einstellungen (E15, D-73).** `LvKopf.preisspiegel?: PreisspiegelEinstellungen` (Form wie
  `vergabe`: `ausreisserSchwelle`, `abcSchwelleA`, `abcSchwelleB`, `abcBezug: 'mittel' | 'schaetzpreis'`), LV-Befehl
  `PreisspiegeleinstellungenSetzen { einstellungen | null }`, Kopf-ChangeSet. Fehlt = `PREISSPIEGEL_STANDARD` in `vergabe`
  (bleibt dort). Kern prüft: kanonische `Prozent` 0,00–100,00, A ≤ B. Am `LvKopf` (wie `nachtrag`/`vorlage`): nie aus GAEB,
  nie am Auftrags-LV, nicht in `LvUebersicht`; ein LV aus einem LV-Stand (`LeistungsverzeichnisAnlegen`) bringt es nicht mit.
- **D-127.8 Einstellungen (E15, D-73).** Globales Aggregat `Einstellungen { buero: Buero | null, druckprofile:
  Druckprofil[], kostengruppenbezeichnungen: Kostengruppenbezeichnung[] }`, ohne Kennung; Konstante `LEERE_EINSTELLUNGEN`.
  Befehle `BueroSetzen`, `DruckprofilSetzen` (ersetzt gleichen Namens an seiner Stelle, sonst ans Ende),
  `DruckprofilEntfernen { name }`, `KostengruppenbezeichnungenSetzen` (ganze Liste) als `EinstellungenBefehl`, **nicht** in
  `Befehl`; `EinstellungenChangeSet` (ganz vorher/nachher) **nicht** in `ChangeSet`; Ausführer `EinstellungenBefehlAusfuehren`
  (kern 137). Kein Protokolleintrag, keine Undo-Historie. Kennung eines Druckprofils ist sein Name; die Standardprofile von
  `ausgabe` stehen nie darin; `Druckprofil`/`LangtextUmfang` sind aus `ausgabe` gewandert (gleich gebaut, ausgabe stellt in 141
  um). KG-Bezeichnungen nach Nummer sortiert, eindeutig, nicht leer. `EinstellungenRepository { laden, anwenden }`
  (`laden` ohne Daten = `LEERE_EINSTELLUNGEN`, `anwenden` mit `konflikt` bei abweichendem `vorher`) als **optionales**
  `Speicher.einstellungen` (speicher 139 liefert es). Übernahme aus `localStorage`: einmalig durch die App (150), solange leer.
- **D-127.9 Projektdatei Schema 7 (E15).** Optionaler Block `Projektdatei.einstellungen` (fehlt bei leeren Einstellungen);
  Einlesen füllt nur Fehlendes je Schlüssel (Büro, Profilname, KG-Nummer) und überschreibt nie. Den Bericht liefert das neue,
  optionale `Speicher.projektdateiEinlesen(inhalt, optionen?)` als `ProjektdateiEinleseergebnis { projektId, einstellungen:
  { uebernommen, belassen } | null }` mit `Einstellungsschluessel` (`buero` | `druckprofil` + name |
  `kostengruppenbezeichnung` + nummer); „belassen“ heißt: lokal schon vorhanden, auch bei gleichem Wert. `null`: Datei ohne
  Block. `projektdateiImportieren(inhalt)` bleibt unverändert gültig (= Einlesen ohne Optionen, ohne Bericht).
- **D-127.10 Projektdatei als Kopie einlesen (E8).** `projektdateiEinlesen(inhalt, { alsKopie: { ids: IdQuelle, name } })`:
  neue Kennungen für Projekt und jedes Aggregat (alles, was `speicher` global schlüsselt), Verweise zwischen ihnen
  umgebogen; Kennungen innerhalb eines Aggregats (Knoten, Bieter, Papierkorbeinträge, Vorgänge …) bleiben, weil `speicher` sie
  je Aggregat bzw. Projekt schlüsselt; so überschneidet sich die Kopie nie mit dem Original. Den Namen gibt die App (Vorschlag
  „<Name> (Kopie)“). **Das Protokoll kommt nicht mit** (seine Befehle nennen die alten Kennungen); Modelldateien werden
  geteilt (inhaltsadressiert). Ohne Optionen wie bisher (`existiert-bereits`).
- **D-127.11 Herkunftsformat (E6, E7).** `GaebFormat = 'da-xml' | 'gaeb-90' | 'gaeb-2000'`, `GaebLesung.format?` (fehlt =
  DA XML); `version` ist bei GAEB 90/2000 `null`. `GaebPhase` um `X80`, `X87`, `X88` erweitert (nur zum Benennen beim
  Abweisen); GAEB 90/2000 nennen die Phase mit derselben Nummer (`.d83` → `X83`). Nicht am LV gespeichert (nur Information im
  Einlesedialog, 146).
- **D-127.12 Konstanten (Ticket 123 Punkte 1, 8).** `KOSTENGRUPPENNUMMER_MUSTER`, `MODELLDATEI_HASH_MUSTER`,
  `BAUTEILMENGENARTEN` (Typ `Bauteilmengenart`), `STRUKTURKNOTENARTEN`, `IFC_SCHEMATA` (`IfcSchema` daraus abgeleitet, dieselbe
  Union), `MENGENART_STUECK = 'Stueck' as const`. Die Verbraucher (`speicher` 135/139, `kern`/`kosten` 137, `bim`/`ifc` 140,
  App 155) ersetzen ihre Kopien.
- **D-127.13 Kalenderdatum (Ticket 123 Punkt 5).** Marke `Kalenderdatum` (geprüfter Tag `JJJJ-MM-TT`) und
  `KALENDERDATUM_MUSTER` (nur die Form). Die gespeicherten Datumsfelder der Aggregate bleiben ungemarkter Text (sonst bräche
  jeder Erzeuger); `bauzeit.Datum` wird in 140 zum Alias von `Kalenderdatum`, `bauleitung.istKalendertag` zum Typwächter
  darauf.
- **D-127.14 Vorhandene Befehle reichen für die Bedienung (E8).** `HinweistextAnlegen`/`HinweistextAendern`,
  `AngebotLoeschen`, `AngebotspositionSetzen` (auch zum Berichtigen auf „nicht angeboten“), `AngebotsNachlassSetzen`/
  `AngebotsNachlassEntfernen`, `OzMaskeSetzen` (der Kern liefert die umnummerierten Knoten): keine neuen Befehle. Für 137
  Punkt 6 (Fehler mit Liste der OZ, die nicht zur neuen Maske passen) gibt es additiv `Befehlsfehler.knotenIds` (alle
  betroffenen Knoten in Dokumentreihenfolge, `knotenId` = der erste); der Code bleibt einer der vorhandenen (`oz-ungueltig`).
- **D-127.15 Form der Lieferung.** Version im Kopf von `index.ts` vermerkt (keine Konstante). Typtests in einer eigenen Datei
  `vertrag-v17a.test.ts` (die alte hat 3.000 Zeilen); in `vertrag.test.ts` nur die zwei geschlossenen Listen
  (`AuftragsLvBefehl`, `Befehlsfehlercode`) ergänzt. Beispiele in `beispiele.ts`.
- **D-127.16 Mechanische Folgezeilen (vom Typcheck erzwungen).** kern: `ZUSTAENDIGES_TICKET` nennt `KalkulationSetzen` und
  `PreisspiegeleinstellungenSetzen` (Ticket 137), `baum.test.ts` erwartet das (137 leert es wieder); `projektBefehlAusfuehren`
  weist die vier neuen Projektbefehle mit `befehl-nicht-zustaendig` ab (`ProjektangabenSetzen` bis 137, die Bieterbefehle
  dauerhaft, D-127.17); `ZuschlagZuruecknehmen` fällt im Auftrags-LV schon in den `default`-Zweig. speicher: `BEFEHLSARTEN`
  kennt die neun neuen Namen. App: Text zu `verweise-vorhanden` in `lv/texte.ts`. Nicht vom Typcheck erzwungen und darum nicht
  hier: `speicher` weist ChangeSets mit `lvStandInhalt` noch nicht ab (kann vor 137 nicht entstehen).
- **D-127.17 Zuständigkeit der Ausführer nach dem Schnitt.** 137 nimmt „Bieter und Zuschlag“ ausdrücklich aus (→ 138,
  `vergabe`). Darum: `vergabe` liefert je eine Funktion vom Typ `ProjektBefehlAusfuehren` und `AuftragsLvBefehlAusfuehren`,
  die `BieterUmbenennen`, `BieterangabenSetzen`, `BieterLoeschen` bzw. `ZuschlagZuruecknehmen` selbst ausführt und alles
  andere an `kern` weiterreicht (`vergabe → kern` ist erlaubt, A3); die App (149/150) ruft für Projekt- und Auftrags-LV-Befehle
  diese Funktionen auf. Der Kern führt `ProjektangabenSetzen`, `BieterAnlegen` mit `angaben`, `KalkulationSetzen`,
  `PreisspiegeleinstellungenSetzen`, `LvStandBefehl` und `EinstellungenBefehl` aus (137). Die Umkehrung (Undo) ist für alle
  dieselbe wie bisher (`projektChangeSetUmkehren`, `auftragsLvChangeSetUmkehren` im Kern), weil die ChangeSet-Formen gleich
  bleiben.

Offene Fragen für den Nutzer (P9): (1) Einstellungen ohne Protokolleintrag weichen von A5/ADR 0009 („jeder Befehl im
Protokoll“) ab, weil das Protokoll je Projekt geführt wird (D-73 „außerhalb der Projekt-Undo-Historie“). (2)
`Speicher.einstellungen` wird nach 139 Pflicht (nächste Vertragsversion, etwa 128). (3) Lesart (a) für die Kalkulation ändert
die Wirkung der EP-Befehle an Positionen mit Kalkulation (es gibt noch keine).
