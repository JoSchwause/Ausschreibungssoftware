# 127: `vertrag` v1.7a: Bedienung, Stammdaten, Einstellungen, Konstanten

Status: done-by-agent
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

- [x] Alle Punkte 1–7 als Typen/Konstanten mit Tests; alte Fixtures und Projektdateien typprüfen weiter
- [x] `## Comments` listet jede Lesart (D-127.x) für die Verbraucher-Tickets 135–155
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [x] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

Lesarten von `vertrag` v1.7a für die Verbraucher (Demo-Modus, vorläufige Annahmen, enge Lesart; dieselben Texte stehen an den
Typen). Alles ist additiv oder optional: Projekte, Projektdateien (Schema 1–6), Protokolle und Fixtures vor v1.7a typprüfen und
gelten unverändert.

- **D-127.1 LV-Stand umbenennen und löschen (E8; Nachtrag D-82 M2, S1).** Frage: Der LV-Ausführer sieht keine Stände; wie
  entsteht das ChangeSet, und wie macht Undo ein Löschen rückgängig? Entscheidung: eigene Gruppe `LvStandBefehl`
  (`LvStandUmbenennen { lvStandId, name }`, `LvStandLoeschen { lvStandId }`), **nicht** in `LvBefehl`, aber in `Befehl`;
  eigener Ausführer `LvStandBefehlAusfuehren(stand: LvStand, befehl)` (kern, 137), fremde `lvStandId` →
  `befehl-nicht-zustaendig`. ChangeSet ist ein `LvChangeSet` des LV des Stands (`kopf: null`, keine Knoten, leere Summen), im
  Protokoll mit diesem LV als Aggregat. Umbenennen: `lvStand` mit beiden Köpfen. Löschen: `lvStand.nachher: null` **und** neu
  `lvStandInhalt: { vorher: { angelegt, zustand }, nachher: null }`; dessen Umkehrung legt `speicher` (139) genau diesen Stand
  mit seinem `angelegt` ab, statt neu einzufrieren; `lvStandInhalt` fehlt bei Anlegen/Umbenennen. **M2:** Ein ChangeSet mit
  `lvStand.vorher: null` ohne `lvStandInhalt` friert nur ein, wenn der Protokolleintrag `LvStandAnlegen` ist oder ein
  `Wiederholen` davon; eines mit `lvStand.nachher: null` ohne `lvStandInhalt` entfernt nur als `Rueckgaengig` eines
  `LvStandAnlegen`; jedes andere → `unbekannt`. `changeSetUmkehren` des Kerns tauscht `lvStandInhalt` wie `lvStand` (137,
  Eigenschaftstest: Löschen und Undo ergeben denselben Stand, `angelegt` eingeschlossen). **S1:** `LvStandRepository.auflisten`
  ordnet nach `angelegt`, dann nach `seq` (Reihenfolge des Ablegens); ein per Undo zurückgelegter Stand steht wieder an seinem
  Platz. App (150) lädt den Stand mit `lvStaende.laden`. Grund: Q5 (Undo ohne Vorzustand) und D-12 (ein LV mit Ständen war
  sonst unlöschbar).
- **D-127.2 Verweissperre (E8, D-74).** Neuer Fehlercode `verweise-vorhanden` mit `Befehlsfehler.verweise:
  Verweisanzahl[]` (`{ art: 'angebot' | 'nachtrag' | 'aufmass' | 'rechnung' | 'mangel', anzahl }`, nur Anzahl > 0, nie leer,
  Reihenfolge nachtrag, aufmass, rechnung, mangel). `ProjektBefehlAusfuehren` und `AuftragsLvBefehlAusfuehren` behalten einen
  **optionalen** dritten Parameter `verweise` (Aufrufe mit zwei Argumenten bleiben gültig, A8); die schmalen Funktionen in
  `vergabe` verlangen sie (D-127.17). Die App zählt aus den Listen des Speichers. Fehlen sie bei `BieterLoeschen`/
  `ZuschlagZuruecknehmen`: `ungueltige-eingabe` (`feld: 'verweise'`). `speicher` hält dieselbe Sperre zusätzlich als
  `konflikt` (auch für ein Undo, etwa von `BieterAnlegen` bei bestehendem Angebot). `nachtrag` zählt jedes LV mit
  `nachtrag.auftragsLvId` auf das Auftrags-LV, gleich welcher Status. Die App (149/150) baut den Text aus Art und Anzahl
  (L4/L5); `lv/texte.ts` hat dafür vorerst einen allgemeinen Satz.
- **D-127.3 Zuschlag zurücknehmen (E8, D-74).** `ZuschlagZuruecknehmen {}` ist ein `AuftragsLvBefehl`; ausgeführt von
  `vergabe` (138, siehe D-127.17). ChangeSet wie `LeistungsverzeichnisLoeschen` (Kopf vorher, alle Knoten entfernt, alle
  Summen in `summen.vorher`). Sperren nur Nachträge, Aufmaßblätter, Rechnungen, Mängel; Bauzeitenplan und Kostenkontrolle
  nicht (der Dialog in 149 nennt die Vorgänge und dass die Auftragswerte der Kostenkontrolle entfallen). Angebot, LV und
  Nachtragsangaben bleiben; einen „Zuschlagsvermerk“ gibt es im Modell nicht (der Zuschlag ist das Bestehen des Auftrags-LV,
  D-21), 138 hat also nichts weiter zu entfernen.
- **D-127.4 Bieter (E8, E10; Nachtrag D-82 S7, S9).** `BieterUmbenennen { bieterId, name }`, `BieterangabenSetzen { bieterId,
  angaben | null }`, `BieterLoeschen { bieterId }` sind Projektbefehle (ganzes Projekt im ChangeSet), ausgeführt von
  `vergabe` (138, D-127.17); ein Dialog, der Name und Angaben ändert, schreibt beide als Befehlsfolge. `Bieter.angaben?:
  Bieterangaben { anschrift: Anschrift | null, ansprechperson, email, telefon }`; `BieterAnlegen` darf `angaben` mitbringen
  und bleibt im Kern (137). **S7:** Nur ein X84 bringt Bieterangaben (gaeb 136: `AngebotLesung.bieter.angaben`); ein X86 füllt
  nur `LvInhaltKopf.auftragnehmer` (Name, Straße, PLZ, Ort), seine Kontaktangaben bleiben ein Befund; ein Bieter, den das
  Projekt schon hat, wird beim Einlesen nicht überschrieben, die App bietet `BieterangabenSetzen` an (149). **D-83:** In die
  Gegenrichtung kopiert der Zuschlag (`zuschlagErteilen`, 138 gemergt) Name und Anschrift des bezuschlagten Bieters in
  `LvInhaltKopf.auftragnehmer` des Auftrags-LV, als Kopie zum Zeitpunkt des Zuschlags (eine spätere Änderung am Bieter zieht
  nicht nach); Kommentar am `Auftragnehmer` und Glossar „Auftragnehmer“ sagen das jetzt. Unbekannte
  `bieterId` → `ungueltige-eingabe` (`feld: 'bieterId'`). Normalisierung (eine Funktion des Kerns, 137 exportiert sie,
  `vergabe` nutzt sie; bis zur Review-Behebung 159 eine lokale Kopie in `vergabe`, D-83): `''` → `null`, Anschrift ganz `null` → `null`, Angaben ganz `null` → Feld fehlt. Kein Formatcheck für
  E-Mail/Telefon (U5).
- **D-127.5 Projektangaben (E10).** `Projekt.angaben?: Projektangaben { nummer, ort, baustelle: Anschrift | null }`
  (Name und Bauherr bleiben am Projekt). `ProjektangabenSetzen { name, bauherr, angaben | null }` ersetzt in der App
  `ProjektStammdatenSetzen`; dieses bleibt gültig (alte Protokolle) und lässt `angaben` unverändert. `Anschrift { strasse,
  plz, ort }` wie `Auftraggeber`; `Bauherr.anschrift` bleibt freier Text. Normalisierung wie D-127.4. Im Glossar heißt die
  Sache nur noch „Projektangaben“ (Nachtrag D-82 S5, kein „Projektstammdaten“).
- **D-127.6 Kalkulationsangaben (E9; Nachtrag D-82 S3, S4).** `Positionsdaten.kalkulation?: Kalkulationsangaben { ansaetze:
  Kalkulationsansatz[], zuschlagssaetze: Kalkulationszuschlagssaetze }`; `Kalkulationsansatz` und
  `Kalkulationszuschlagssaetze` sind aus `kosten` gewandert und gleich gebaut (kosten stellt in 137 um). Befehl
  `KalkulationSetzen { positionId, kalkulation | null, einheitspreis, epa }` nur im LV: trägt das Ergebnis mit (wie
  `MengenansatzSetzen`), der Kern rechnet nicht nach (A3). Leer (kein Ansatz, kein Satz) → Feld fehlt. **Lesart (a) wie D-22:**
  `EinheitspreisAendern` und `EinheitspreisanteileSetzen` an einer Position mit Kalkulation entfernen sie im selben ChangeSet
  (kern 137; die Oberfläche fragt vorher). **S3:** Eine Zuschlagsposition trägt nie eine Kalkulation: `KalkulationSetzen` an
  ihr → `knotenart-unzulaessig` (`feld: 'kalkulation'`, auch mit `kalkulation: null`); `PositionsmerkmaleSetzen` mit
  `zuschlag ≠ null` entfernt eine vorhandene Kalkulation im selben ChangeSet; ein Anlege- oder Kopierbefehl mit Zuschlag und
  Kalkulation → `ungueltige-eingabe` (`feld: 'kalkulation'`). **S4:** Wer die Kalkulation so entfernt, meldet den
  Befehlshinweis `kalkulation-entfernt` mit `knotenId` der Position (neu in der geschlossenen Liste). Anlegen und Kopieren
  nehmen sie sonst mit (Muster-LV); `zuschlagErteilen` (vergabe 138, umgesetzt und durch D-83 bestätigt) und
  `nachtragUebernehmen` (abrechnung, mit 143) lassen sie weg; der GAEB-Export schreibt sie nicht, ohne Warnung (die EPA tragen das Ergebnis).
- **D-127.7 Preisspiegel-Einstellungen (E15, D-73; Nachtrag D-82 S5, S6).** `LvKopf.preisspiegel?:
  PreisspiegelEinstellungen` (Form wie `vergabe`: `ausreisserSchwelle`, `abcSchwelleA`, `abcSchwelleB`, `abcBezug: 'mittel' |
  'schaetzpreis'`), LV-Befehl **`PreisspiegelEinstellungenSetzen`** `{ einstellungen | null }` (S5: umbenannt von
  `PreisspiegeleinstellungenSetzen`, bevor ein Protokoll den Namen trägt; 137 übernimmt den Namen), Kopf-ChangeSet. Fehlt =
  `PREISSPIEGEL_STANDARD` in `vergabe` (bleibt dort). Kern prüft: kanonische `Prozent` 0,00–100,00, A ≤ B. Am `LvKopf` (wie
  `nachtrag`/`vorlage`): nie aus GAEB, nie am Auftrags-LV, nicht in `LvUebersicht`. **S6:** Ein LV aus einem LV-Stand
  (`LeistungsverzeichnisAnlegen`) bringt die Einstellungen nicht von selbst mit; trägt der Stand welche, hängt die App (150)
  `PreisspiegelEinstellungenSetzen` an die Befehlsfolge „Als neues LV übernehmen“.
- **D-127.8 Einstellungen (E15, D-73; Nachtrag D-82 M1, S8).** Globales Aggregat `Einstellungen { buero: Buero | null,
  druckprofile: Druckprofil[], kostengruppenbezeichnungen: Kostengruppenbezeichnung[] }`, ohne Kennung; Konstante
  `LEERE_EINSTELLUNGEN`. Befehle `BueroSetzen`, `DruckprofilSetzen` (ersetzt gleichen Namens an seiner Stelle, sonst ans
  Ende), `DruckprofilEntfernen { name }`, `KostengruppenbezeichnungenSetzen` (ganze Liste) und neu `EinstellungenUebernehmen
  { einstellungen }` (D-127.9) als `EinstellungenBefehl`, **nicht** in `Befehl`; `EinstellungenChangeSet` (ganz
  vorher/nachher) **nicht** in `ChangeSet`; Ausführer `EinstellungenBefehlAusfuehren` und Umkehrung
  `EinstellungenChangeSetUmkehren` (kern 137). **M1 (A5, ADR 0009 ohne Ausnahme):** Jeder Befehl an den Einstellungen steht im
  **Einstellungsprotokoll**: `EinstellungenProtokolleintrag { id, wer, wann, befehl: EinstellungenBefehl | HistorienBefehl }`
  (ohne Projekt und Aggregat, nicht in der Projektdatei); `EinstellungenRepository { laden, anwenden(eintrag, changeSet),
  protokoll() }`, `anwenden` schreibt Eintrag und ChangeSet in einer Transaktion (`konflikt` bei abweichendem `vorher`),
  `protokoll` in Schreibreihenfolge. Die App (150) führt ein eigenes Rückgängig der Einstellungen in der Sitzung, getrennt vom
  Projekt (D-73 nimmt die Einstellungen nur aus der Undo-Historie des Projekts): Umkehrung = getauschtes ChangeSet,
  protokolliert als `Rueckgaengig`, Wiederholen als `Wiederholen`, je mit der Kennung des ursprünglichen Eintrags. Kennung eines
  Druckprofils ist sein Name; die Standardprofile von `ausgabe` stehen nie darin; `Druckprofil`/`LangtextUmfang` sind aus
  `ausgabe` gewandert (gleich gebaut, ausgabe stellt in 141 um). KG-Bezeichnungen nach Nummer sortiert, eindeutig, nicht
  leer. `Speicher.einstellungen` bleibt **optional** (speicher 139 liefert es; `laden` ohne Daten = `LEERE_EINSTELLUNGEN`).
  **S8:** Übernahme aus `localStorage` einmalig durch die App (150), **nur solange das Einstellungsprotokoll leer ist**, als
  gewöhnliche protokollierte Befehle; danach nie wieder.
- **D-127.9 Projektdatei Schema 7 (E15; Nachtrag D-82 M1).** Optionaler Block `Projektdatei.einstellungen` (fehlt bei leeren
  Einstellungen; das Einstellungsprotokoll steht nicht in der Datei). Einlesen füllt nur Fehlendes je Schlüssel (Büro,
  Profilname, KG-Nummer) und überschreibt nie, und zwar als **protokollierter Befehl** `EinstellungenUebernehmen { einstellungen:
  <Block der Datei> }`: Der Aufrufer gibt den Kopf des Eintrags in `ProjektdateiEinleseoptionen.einstellungsuebernahme: { id,
  wer, wann }`; `speicher` (139) schreibt den Eintrag mit dem ChangeSet nach D-73 in derselben Transaktion wie das Projekt
  (gerechnet mit dem Ausführer des Kerns, `speicher → kern` erlaubt, D-19; oder nach derselben Regel), und nur, wenn etwas
  übernommen wird. Ohne `einstellungsuebernahme` bleiben die Einstellungen unberührt; `projektdateiImportieren(inhalt)`
  übernimmt deshalb keine Einstellungen mehr. Den Bericht liefert das optionale `Speicher.projektdateiEinlesen(inhalt,
  optionen?)` als `ProjektdateiEinleseergebnis { projektId, einstellungen: { uebernommen, belassen } | null }` mit
  `Einstellungsschluessel` (`buero` | `druckprofil` + name | `kostengruppenbezeichnung` + nummer); „belassen“ heißt: lokal schon
  vorhanden, auch bei gleichem Wert. `null`: Datei ohne Block oder Aufruf ohne `einstellungsuebernahme`. Die Übernahme gehört
  nicht zum Rückgängig der Einstellungen in der Sitzung (sie überschreibt nichts, Q5). Ausführer von `EinstellungenUebernehmen`
  ist der Kern (137).
- **D-127.10 Projektdatei als Kopie einlesen (E8; Nachtrag D-82 S10).** `projektdateiEinlesen(inhalt, { alsKopie: { ids:
  IdQuelle, name } })`: neue Kennungen für Projekt und jedes Aggregat (alles, was `speicher` global schlüsselt), Verweise
  zwischen ihnen umgebogen, **auch die Wurzel** (`elternId` der Knoten der obersten Ebene in Baum und Papierkorb ist die Kennung
  des LV bzw. Auftrags-LV); Kennungen innerhalb eines Aggregats (Knoten, Bieter, Papierkorbeinträge, Vorgänge …) bleiben, weil
  `speicher` sie je Aggregat bzw. Projekt schlüsselt; so überschneidet sich die Kopie nie mit dem Original. **S10:**
  Eingefrorene LV-Stände bekommen eine neue Kennung und die neue `leistungsverzeichnisId`, und in ihrem Zustand werden dieselben
  Kennungen umgeschrieben wie im lebenden LV (Kennung des LV, `projektId`, `nachtrag.auftragsLvId`, die Wurzel als `elternId`),
  `angelegt` bleibt. Den Namen gibt die App (Vorschlag „<Name> (Kopie)“). **Das Protokoll kommt nicht mit** (seine Befehle
  nennen die alten Kennungen); Modelldateien werden geteilt (inhaltsadressiert). Einstellungen wie D-127.9. Ohne `alsKopie` wie
  bisher (`existiert-bereits`).
- **D-127.11 Herkunftsformat (E6, E7).** `GaebFormat = 'da-xml' | 'gaeb-90' | 'gaeb-2000'`, `GaebLesung.format?` (fehlt =
  DA XML); `version` ist bei GAEB 90/2000 `null`. `GaebPhase` um `X80`, `X87`, `X88` erweitert (nur zum Benennen beim
  Abweisen); GAEB 90/2000 nennen die Phase mit derselben Nummer (`.d83` → `X83`). Nicht am LV gespeichert (nur Information im
  Einlesedialog, 146). Der Kommentar an `GaebVersion` sagt seit dem Merge von 129: 3.1 wird gelesen, nicht geschrieben.
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
  betroffenen Knoten in Dokumentreihenfolge, `knotenId` = der erste); der Code bleibt einer der vorhandenen (berichtigt nach
  D-87: `maske-ungueltig`, `oz-ueberlauf` oder an der Los-Stufe `knotenart-unzulaessig`, wie der Kern sie seit jeher meldet;
  nicht `oz-ungueltig`).
- **D-127.15 Form der Lieferung.** Version im Kopf von `index.ts` vermerkt (keine Konstante). Typtests in einer eigenen Datei
  `vertrag-v17a.test.ts` (die alte hat 3.000 Zeilen); in `vertrag.test.ts` nur die zwei geschlossenen Listen
  (`AuftragsLvBefehl`, `Befehlsfehlercode`) ergänzt. Beispiele in `beispiele.ts`.
- **D-127.16 Mechanische Folgezeilen (vom Typcheck erzwungen).** kern: `ZUSTAENDIGES_TICKET` nennt `KalkulationSetzen` und
  `PreisspiegelEinstellungenSetzen` (Ticket 137; Schlüssel nach S5 umbenannt), `baum.test.ts` erwartet das (137 leert es
  wieder); `projektBefehlAusfuehren` weist die vier neuen Projektbefehle mit `befehl-nicht-zustaendig` ab
  (`ProjektangabenSetzen` bis 137, die Bieterbefehle dauerhaft, D-127.17); `ZuschlagZuruecknehmen` fällt im Auftrags-LV schon
  in den `default`-Zweig. speicher: `BEFEHLSARTEN` kennt die neun neuen Namen (S5: `PreisspiegelEinstellungenSetzen`). App:
  Text zu `verweise-vorhanden` in `lv/texte.ts`. Nicht vom Typcheck erzwungen und darum nicht hier: `speicher` weist
  ChangeSets mit `lvStandInhalt` noch nicht ab (kann vor 137 nicht entstehen).
- **D-127.17 Zuständigkeit der Ausführer nach dem Schnitt (Nachtrag D-82 S9).** 137 nimmt „Bieter und Zuschlag“ ausdrücklich
  aus (→ 138, `vergabe`). Darum führt `vergabe` `BieterUmbenennen`, `BieterangabenSetzen`, `BieterLoeschen` und
  `ZuschlagZuruecknehmen` aus, mit **schmalen exportierten Funktionen**, die bei `BieterLoeschen` und `ZuschlagZuruecknehmen`
  die Verweise als Pflichtparameter verlangen (kein Verteiler mit optionalem Parameter; der optionale Parameter der
  Vertragstypen bleibt nur für A8). Die Normalisierung der Bieterangaben ist eine Funktion des Kerns (137 exportiert sie,
  `vergabe` nutzt sie). Die App (149/150) ruft für diese vier Befehle die Funktionen aus `vergabe` auf, für alle übrigen den
  Kern. Der Kern führt `ProjektangabenSetzen`, `BieterAnlegen` mit `angaben`, `KalkulationSetzen`,
  `PreisspiegelEinstellungenSetzen`, `LvStandBefehl` und `EinstellungenBefehl` aus (137). Die Umkehrung (Undo) ist für alle
  dieselbe wie bisher (`projektChangeSetUmkehren`, `auftragsLvChangeSetUmkehren`, `changeSetUmkehren` im Kern), weil die
  ChangeSet-Formen gleich bleiben.
- **D-127.18 Nachtrag aus dem Review (D-82), Übersicht.** M1 → D-127.8, D-127.9 (Einstellungsprotokoll, protokollierte
  Übernahme mit `EinstellungenUebernehmen`); M2, S1 → D-127.1; S3, S4 → D-127.6; S5 → D-127.5, D-127.7; S6 → D-127.7; S7 →
  D-127.4 (Kommentar am `Auftragnehmer` berichtigt; dazu D-83: der Zuschlag kopiert Name und Anschrift des Bieters in den
  Auftragnehmer, Glossar „Auftragnehmer“ berichtigt); S8 → D-127.8; S9 → D-127.17; S10 → D-127.10. Alles additiv oder Lesart, bis
  auf drei Stellen, die noch kein Verbraucher in `integration/welle-7` nutzt: der Name `PreisspiegelEinstellungenSetzen` (137 hat
  den alten Namen auf seinem Zweig), `EinstellungenRepository.anwenden(eintrag, changeSet)` (139 baut es erst) und das neue
  Mitglied `EinstellungenUebernehmen` der geschlossenen Union `EinstellungenBefehl` (137 braucht dafür einen Fall).

Offene Fragen für den Nutzer (P9): (1) `Speicher.einstellungen` wird nach 139 Pflicht (nächste Vertragsversion, etwa 128).
(2) Lesart (a) für die Kalkulation ändert die Wirkung der EP-Befehle an Positionen mit Kalkulation (es gibt noch keine).
