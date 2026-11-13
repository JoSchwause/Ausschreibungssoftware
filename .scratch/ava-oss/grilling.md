# Grilling-Backlog: Ergebnis der Sitzung

Stand: 2026-11-09. Sitzung in vier Runden geführt. Antworten sind unten je Frage eingetragen
(`**Antwort:**`). Die Rückschreibung in `plan.md`, `docs/regeln.md`, `GLOSSARY.md` und die ADRs
0008–0011 ist erledigt. Alle Fragen sind beantwortet, außer **G-27** (vertagt, eigene Runde vor Welle 5).
G-06, G-54, G-55 und G-56 sind am 2026-11-09 geschlossen worden. **Nachtrag 2026-11-13:** Stufe 5 (G-58 bis G-64, Runde vor
Welle 7) ist beantwortet; G-27 gilt für v1 wie angenommen (G-62). Offen ist nur **G-57** (vertagt bis nach der Demo).

Status je Frage: **entschieden**, **vertagt**, **Annahme** (Standard übernommen, Nutzer hat nicht
explizit geantwortet), **offen**.

## Stufe 1 — Produkt und Umfang

- **G-01** Produktform — *entschieden*. **Antwort:** v1 ist eine lokale Einzelnutzer-PWA nach ADR 0001.
  Mehrbenutzer mit Server ist das spätere Ziel. IDs und Befehle bleiben sync-fähig. (2026-11-09)
- **G-02** Erster echter Nutzer — *entschieden* (Interview-Status: Annahme, es steht noch aus).
  **Antwort:** Das Büro des Freundes ist der erste Nutzer. Das Interview kommt vor Welle 3. Keine
  öffentliche Community vor M3. (2026-11-09) **Nachtrag (2026-11-09):** Erst ein Prototyp, an dem sich
  die Fragen später klären lassen. Das Interview hat keinen festen Termin mehr („vor Welle 3“ entfällt
  als Tor); der Prototyp ist der Anlass.
  **Nachtrag (2026-11-13, Nutzer):** Das Interview fand bisher nicht statt. Die Demo mit Probebetrieb nach Welle 7 ist
  zugleich das Interview (G-59); Leitfaden ist die Seite „Annahmen“ der App (G-62) und Ticket 126.
- **G-03** Schutz vor Datenverlust — *entschieden*. **Antwort:** Export-Erinnerung und optionaler
  Sicherungsordner über die File System Access API (nur Chromium). In anderen Browsern bleibt der
  reine Export. (2026-11-09)
- **G-04** Erster Schnitt — *entschieden*. **Antwort:** Schnitt A (Vergabe-Kern LPH 6–7). (2026-11-09)
- **G-05** Module später oder nie — *entschieden*. **Antwort:** X1–X6 später. Auktion nie. Die
  KI-Assistenz (X6) kommt nach M4, nicht in P8 davor. (2026-11-09) **Nachtrag (2026-11-12, Nutzer, nach M4):** Welle 6 =
  zuerst die Folgetickets 93–95, danach X1–X5. Schwerpunkt ist X1 BIM: dorthin geht der größte Teil der Arbeit (mehrere
  Stränge, siehe `plan.md` §2 X). X6 (KI-Assistent) ist nicht in Welle 6. Auktion bleibt „nie“.
- **G-06** Verhaltensgleichheit oder Lücken des Vorbilds schließen — *entschieden*. **Antwort:**
  Lücken schließen. Die Annahme in `docs/regeln.md` (U3, Q5) bleibt. (2026-11-09)
- **G-07** Projektname — *entschieden (Platzhalter)*. **Antwort:** Arbeitsname **Tethys AVA**. Der
  Endname wird vor Veröffentlichung geprüft. „AVA“ kommt auch im Namen des Vorbilds vor, das ist als
  Platzhalter akzeptiert. (2026-11-09)
- **G-08** Nur Deutschland — *entschieden*. **Antwort:** Nur DE, keine Länderabstraktion. (2026-11-09)
- **G-09** Projekt über dem LV — *entschieden*. **Antwort:** Schlankes Projekt mit Name und
  Bauherr-Feldern, darin mehrere LVs. ADR 0011. (2026-11-09)

## Stufe 1 — Normen und Austausch

- **G-10** GAEB-Versionen — *entschieden*. **Antwort:** GAEB DA XML 3.3 und 3.2 lesen und schreiben.
  GAEB 90/2000 später. (2026-11-09)
- **G-11** GAEB-Phasen im MVP — *entschieden*. **Antwort:** 81, 83, 84, 86. 82, 85 und 89 später.
  (2026-11-09)
- **G-12** Bezug der GAEB-XSDs — *entschieden (korrigiert)*. **Antwort:** Eigene Validierung in der App.
  Das XSD läuft nur in der CI als unabhängige Gegenprüfung und wird nie committet. ADR 0010. (2026-11-09)
- **G-13** Export bei fehlgeschlagener Prüfung — *entschieden*. **Antwort:** Warnen und als Entwurf
  kennzeichnen, nicht sperren. ADR 0010. (2026-11-09)
- **G-14** Bieterseite — *entschieden*. **Antwort:** Nur X84 und Excel-Rundlauf. Keine zweite
  Installation für Bieter. (2026-11-09)
- **G-15** E-Rechnung — *entschieden*. **Antwort:** Später. Zuerst eingehende XRechnung lesen, Erzeugen
  danach. (2026-11-09)
- **G-16** DIN-276-Bezeichnungen, Einheitenkatalog, REB-Formeltexte — *entschieden*. **Antwort:** Im
  Repo nur Nummern. Bezeichnungen und Katalogtexte importiert der Nutzer selbst. (2026-11-09)
  Annahme für Demo, Mensch bestätigt später: Kostengruppen-Hierarchie aus den Ziffern abgeleitet, keine Nummernliste
  im Repo; Summe = eigener Betrag + Kinder (D-24 in `entscheidungen-auto.md`).
- **G-17** STLB-Bau — *entschieden*. **Antwort:** Im MVP ignorieren. Ein Feld für eine Textquelle
  bleibt vorgehalten. (2026-11-09)
  Annahme für Demo, Mensch bestätigt später: Feld `Positionsdaten.textquelle?`, Muster-LV = LV mit `vorlage` (D-36).

## Stufe 1 — Domänenmodell

- **G-20** Ein Objekt oder getrennte Aggregate — *entschieden*. **Antwort:** Ausschreibungs-LV,
  Angebot und Auftrags-LV sind getrennte Aggregate mit gemeinsamer Positionsidentität. ADR 0011.
  (2026-11-09)
- **G-21** Nachkommastellen — *entschieden*. **Antwort:** EP 3, Menge 3, Prozent 2, Betrag 2. GP wird
  nach N2 kaufmännisch auf 2 Stellen gerundet. (2026-11-09)
- **G-22** Name der Zulage — *entschieden*. **Antwort:** „Zuschlagsposition“ mit GAEB-Semantik
  (`MarkupItem`). „Zulage“ bleibt nur Vorbild-Begriff der Recherche. (2026-11-09)
- **G-23** Nachlass — *entschieden*. **Antwort:** Nur auf LV-Ebene, genau einer je LV, prozentual oder
  als Absolutbetrag. Kein Nachlass je Titel oder Position in v1. ADR 0011. (2026-11-09)
- **G-24** Historie — *entschieden*. **Antwort:** Befehlsprotokoll wird dauerhaft gespeichert, ohne
  eigene Ansicht. Undo und LV-Stände bleiben. ADR 0009 ersetzt teilweise ADR 0006. (2026-11-09)
- **G-25** OZ-Maske — *entschieden*. **Antwort:** Je LV frei definierbar. Ein GAEB-Import übernimmt die
  abweichende Maske. (2026-11-09)
- **G-26** Preisspiegel-Regeln — *entschieden, mit einer Annahme*. **Antwort:** Virtuelle Bieter Min,
  Mittel, Max. Ausreißer ±20 % und ABC-Klasse A bis 80 % sind Standardwerte und einstellbar. Ein
  Nachlass bleibt umkehrbar und wird nicht in die EP umgelegt. *Annahme:* Wie mehrere Nachlässe
  verrechnet werden (additiv oder multiplikativ), ist offen, bis ein Fall aus der Recherche belegt
  ist. (2026-11-09) **Nachtrag (2026-11-09):** Mehrere Nachlässe werden nicht zugelassen: genau
  einer je LV und je Angebot, kein Verrechnen. Neu fragen, sobald ein Praxisfall vorliegt.
  Annahme für Demo, Mensch bestätigt später: Mittel und Min nur über Bieter mit Preis > 0; 0,00 und
  „nicht angeboten“ eigene Kennzeichen, nie Ausreißer (D-05 in `entscheidungen-auto.md`).
- **G-27** Tiefe der Rechnungsprüfung — *vertagt*. **Antwort:** Eigene Grilling-Runde vor Welle 5.
  A3 bleibt bis dahin offen. (2026-11-09)
  Annahme für Demo, Mensch bestätigt später: kumulierte Abschlags- und Schlussrechnung mit Abzugskette Leistung → Nachlass →
  MwSt → Umlagen → Sicherheits- bzw. Gewährleistungseinbehalt → eingefrorene frühere Zahlbeträge (D-34 in
  `entscheidungen-auto.md`).
- **G-28** MwSt — *entschieden*. **Antwort:** Ein Satz je LV, kein Satzwechsel in v1. (2026-11-09)
- **G-29** Lose — *entschieden*. **Antwort:** Im MVP nur gliedernd. Getrennte Vergabe später.
  (2026-11-09)

## Stufe 2 — Oberfläche

- **G-30** Zielgeräte — *entschieden*. **Antwort:** Nur Desktop ab 1280 px. Tablet ist ein späterer Plan.
  (2026-11-09)
- **G-31** Richtung und Komponentenbasis — *entschieden*. **Antwort:** Dichtes, tabellenartiges
  Werkzeug, Radix-Primitive, hell und dunkel über Design-Tokens (U4). (2026-11-09)
- **G-32** Langtext — *entschieden*. **Antwort:** In GAEB abbildbare Teilmenge plus Bieterergänzungen.
  (2026-11-09)
- **G-33** Leistungsobergrenze — *entschieden*. **Antwort:** Ziel 10.000 Positionen. Tests bei 5.000 und
  10.000. (2026-11-09)
- **G-34** Barrierefreiheit und Übersetzbarkeit — *entschieden*. **Antwort:** Tastatur und Kontrast
  jetzt. Katalogtexte als Dateien. Keine Übersetzung in v1. (2026-11-09)
- **G-35** Speichern — *entschieden*. **Antwort:** Automatisch bei jedem Befehl. (2026-11-09)

## Stufe 2 — Recht und Projektführung

- **G-40** Lizenz — *entschieden*. **Antwort:** AGPL-3.0-or-later für das gesamte Repo, mit DCO und
  REUSE. ADR 0008 ersetzt die Lizenzregel von ADR 0007. (2026-11-09)
- **G-41** Gemessene Zahlen in Tests — *entschieden*. **Antwort:** Ja, nur wenn aus einer VOB- oder
  GAEB-Regel herleitbar und dort belegt. (2026-11-09)
- **G-42** Testbedingungen des Vorbilds — *entschieden*. **Antwort:** Lokale Bundle-Kopien löschen.
  Notizen bleiben in eigenen Worten. Vor weiterer Veröffentlichung eine rechtliche Prüfung einholen.
  (2026-11-09)
- **G-43** Beiträge von außen — *entschieden*. **Antwort:** Tracker bleibt lokal bis zum MVP. Danach
  Beiträge über DCO. (2026-11-09)
- **G-44** `okf/research/` öffentlich? — *entschieden*. **Antwort:** Aus dem Repo-Baum genommen, bis die
  rechtliche Prüfung (G-42) steht. Lokale Kopie bleibt erhalten. Die Git-Historie bleibt unverändert;
  ein Umschreiben nur auf ausdrückliche Freigabe. (2026-11-09)

## Stufe 2 — Prozess

- **G-50** Review — *entschieden*. **Antwort:** Ein Review-Agent prüft jeden PR. Du prüfst Verträge,
  ADRs und Meilensteine. (2026-11-09)
- **G-51** Tempo — *entschieden*. **Antwort:** Höchstens 8 Agenten gleichzeitig. Kein Zieltermin für M3.
  (2026-11-09)
- **G-52** Testdaten — *entschieden (korrigiert)*. **Antwort:** Selbst verfasste Fixtures und ein
  anonymisiertes echtes LV liegen im Repo. Damit ist Arbeit in Cloud-Sessions möglich. Anonymisierung:
  Namen, Adressen, Firmennamen, Projektbezeichnung und Aktenzeichen werden entfernt. Mengen und EP
  bleiben. (2026-11-09)
- **G-53** Hosting — *entschieden*. **Antwort:** GitHub Pages. (2026-11-09) **Nachtrag (2026-11-13):** Der
  Deploy-Workflow fehlt noch und entsteht in Welle 7 (E17); das Einschalten von GitHub Pages in den Repo-Einstellungen
  ist eine Aufgabe des Nutzers (Ticket 126).
- **G-55** Fremde Testdateien im Repo — *entschieden*. Folgt aus der Testdaten-Recherche
  (`okf/research/standards/test-data-sources.md`, lokal). **Antwort (2026-11-09):**
  1. **Amtliche Dateien** (BVBS-Prüfdateien, GAEB-Musterdateien 3.1): werden unverändert ins Repo
     committet, wie es gaebboss tut. *Risiko, vom Nutzer in Kauf genommen:* Weder BVBS noch GAEB
     nennen eine Lizenz, pyGAEB hält die Dateien für urheberrechtlich geschützt (vgl. G-12, wo das
     XSD aus demselben Grund nie committet wird). Herkunft je Datei dokumentieren (Quelle, Datum,
     „unverändert“), damit ein Entfernen auf Anfrage einfach bleibt.
  2. **Fixtures freier Projekte** (MIT, Apache-2.0, AGPL-3.0): ja, einzelne Dateien mit
     Herkunftsvermerk und REUSE-Eintrag, nur wenn die Lizenz zu AGPL-3.0-or-later passt.
  3. **Echte Muster-LVs ohne Lizenz** (DB InfraGO, Vergabeunterlagen): Anonymisieren nach G-52
     genügt, auch ohne Zustimmung des Urhebers. *Risiko:* Das Urheberrecht an den Texten bleibt
     ungeklärt. Das Feld der Textquelle (G-17) zeigt auf die Herkunft.
  Regel C4 ist entsprechend erweitert. Das Ticket „Testdaten-Korpus anlegen“ (Strang F, F3) ist
  damit nicht mehr durch G-55 blockiert.
- **G-54** `spec.md` und ADR-Prüfung — *entschieden und erledigt*. **Antwort (Nutzer):** Jetzt
  miterledigen. `.scratch/ava-mvp/spec.md` geschrieben, ADR 0001–0011 geprüft und angenommen; ADR 0003
  an G-41 und G-22 angepasst, ADR 0002 an G-56. Ergebnis: `spec.md`, Abschnitt 9. (2026-11-09)
- **G-56** Format der Projektdatei — *entschieden*. Aus der ADR-Prüfung: ADR 0001 sagte „JSON“, ADR 0002
  „die Datenbankdatei“. **Antwort:** JSON-Datei zum Sichern und Austauschen. SQLite bleibt der interne
  Speicher. Export und Import schreibt die Anwendung selbst, mit Schemaversion und Migrationen (A8).
  ADR 0002 angepasst. (2026-11-09)

## Stufe 3 — Runde vor Welle 2 (E-01 bis E-20, 2026-11-10)

Befunde und Wortlaut der Fragen: `.scratch/ava-oss/next-decisions.md`. Alle beantwortet.

- **E-01** Prüfung `vertrag` v1 (G-50) — *entschieden*. Geprüft und bestätigt; Änderungen über E-02.
- **E-02** `vertrag` v1.1 — *entschieden*. Zwei serielle Tickets: v1.1a „Lücken“ (neun Punkte), v1.1b
  „Inhaltsmodell“ (E-03, E-04, E-05, E-10, E-11, E-13). Nutzer prüft beide.
- **E-03** Zuschlagsposition — *entschieden*. GAEB-Semantik: Prozentsatz auf die Summe der Bezugspositionen,
  mehrere Bezugsformen. Vor K6 die Fachdokumentation wörtlich zitieren. Ändert Fixture `typisch` und Annahme A4.
  Annahme für Demo, Mensch bestätigt später: Rechenregel aus den amtlichen Prüfdateien statt aus der
  Fachdokumentation belegt (D-03 in `entscheidungen-auto.md`).
- **E-04** Bedarf und Wahl in den Summen — *entschieden*. Vorläufige Regel gilt; getrennte Summenfelder;
  „Wählen“ erst bei der Vergabe (Welle 4); Gruppe und Variante aus GAEB.
  Annahme für Demo, Mensch bestätigt später: Das Auftrags-LV enthält nur das Beauftragte; gewählte Alternative wird
  normale Position, Grundposition und nicht gewählte Alternativen entfallen (D-21 in `entscheidungen-auto.md`).
- **E-05** Positionsart — *entschieden*. Kombinierbare Merkmale (Bedarf, Wahl, Stundenlohn, Pauschal).
- **E-06** Nachlass-Rundung — *entschieden*. Betrag auf 2 Stellen runden, dann abziehen. Negatives Netto nach
  Nachlass ist ein Befund (K8), keine Sperre.
- **E-07** Rundung negativer Werte — *entschieden*. Betrag runden, Vorzeichen wieder davor. Büro bei Gelegenheit fragen.
- **E-08** Gliederung — *entschieden*. Los oberste Stufe (zählt zu 5); Positionen direkt unter dem LV erlaubt;
  Lose und Titel nebeneinander verboten.
- **E-09** Ordnungszahl — *entschieden*. Annahmen 1–5 gelten; bei Überlauf automatisch Schritt 5, 2, 1 mit Hinweis.
- **E-10** Langtext — *entschieden*. GAEB-abbildbare Teilmenge in v1.1b.
- **E-11** GAEB-Umfang v1 — *entschieden*. Auftraggeber, Vergabeinformationen, Leit-/Unterbeschreibung; Rest
  Befund und beim Export mit Warnung verworfen.
- **E-12** Feldbefehle — *entschieden*. Kern-Ticket am Anfang von Welle 2.
- **E-13** Befehlsprotokoll — *entschieden*. Bei Massenbefehlen nur Kopf und Prüfsumme (ADR 0009 ergänzt).
- **E-14** Ein Tab je Datenbank — *entschieden*. Angenommen, Meldung im zweiten Tab.
- **E-15** Testdateien freier Projekte — *entschieden*. Teil entfällt; Prüfung bei G3.
- **E-16** BVBS-Prüfkriterien — *entschieden*. Eigene Zählung mit zweitem Zähler; BVBS-Anfrage optional.
- **E-17** DCO und Prüfweg — *entschieden*. DCO erst für Beiträge von außen; ab Welle 2 ein PR je Ticket mit
  Review-Agent; dieser Branch als PR mit Review und Merge-Commit nach `main`.
- **E-18** Grid-Bedienung — *entschieden*. Excel-Abweichungen bleiben bis zum Interview-Prototyp.
- **E-19** Aufräumen nach Welle 1 — *entschieden*. Ein Ticket, MwSt-Standard 19,00 % mit Befund.
- **E-20** Schnitt von Welle 2 — *entschieden*. Reihenfolge laut `next-decisions.md` mit v1.1a/v1.1b;
  Interview-Prototyp jetzt; Preisspiegel-Typen erst nach M1.

## Stufe 4 — Welle 6

- **G-57** Sync-Server nach v1 — *offen*. **Frage:** Sync-Server nach v1: ja oder nein, und in welcher Form
  (Datei-Abgleich zwischen Installationen oder selbst betriebener Server)? Grundlage ist ADR 0013 (`proposed`);
  G-14 bleibt bindend, ein Bieterportal steht nicht zur Wahl.
  Annahme für Demo, Mensch bestätigt später: ADR 0013 als Vorschlag, kein Code in Welle 6 (D-55 in entscheidungen-auto.md).
  **Nachtrag (2026-11-13, Nutzer):** vertagt bis nach der Demo mit dem Büro. Kein Server und kein Abgleich in Welle 7;
  ADR 0013 bleibt `proposed`.

## Stufe 5 — Runde vor Welle 7 (G-58 bis G-64, 2026-11-13)

Anlass: Welle 7 soll die letzte Welle sein, bevor die Software gezeigt und benutzt wird. Befunde und Umfang:
`.scratch/ava-oss/umfang-welle-7.md`. Alle vom Nutzer beantwortet.

- **G-58** Ausgangsstand für Welle 7 — *entschieden*. **Antwort:** PR #11 (Welle 6) ist nach `main` gemergt (vom Nutzer,
  `6bb709e`). Mit dem Merge gelten die Entscheidungen D-01 bis D-70 und `vertrag` v1.2 bis v1.6 als Ausgangsstand; die
  Prüfung nach P9 ist für diese Versionen damit erledigt.
- **G-59** Was „zeigen und benutzen“ heißt — *entschieden*. **Antwort:** Demo und Probebetrieb in einem Büro: eine
  gehostete Adresse (GitHub Pages, G-53), ein Beispielprojekt und eine kurze Anleitung „Erste Schritte“. Die Sitzung mit
  dem Büro ist zugleich das Interview aus G-02. Keine öffentliche Ankündigung; der Arbeitsname bleibt (G-07), die
  Rechtsprüfung (G-42, G-44) bleibt Voraussetzung erst für eine Veröffentlichung.
- **G-60** Module aus Welle 6 (Modelle/BIM, Bauzeitenplan, Honorar, Mängel, Bautagebuch) — *entschieden*. **Antwort:**
  Sie bleiben sichtbar, in einer eigenen Gruppe der Navigation mit dem Kennzeichen „Vorschau“. Die Arbeit der Welle 7 geht
  vor allem in die Kernkette LV → Vergabe → Abrechnung → Kosten; die Folgetickets 123 und 124 werden trotzdem erledigt.
- **G-61** Größere Lücken in Welle 7 — *entschieden*. **Antwort:** Alle vier kommen in die Welle: GAEB 90 und GAEB 2000
  lesen; Skonto, Bauabzugsteuer, Vertragsstrafe und Zahlungen in der Rechnungsprüfung (ergänzt D-34); Stammdaten für Bieter
  und Projekt; weitere REB-Formeln über die 91 hinaus. Bei Überlauf fallen zuerst die REB-Formeln weg; die weitere
  Kürzungsreihenfolge steht in `umfang-welle-7.md` §4. Ohnehin im Umfang: DA XML 3.1 lesen, Ausgaben für Preisspiegel, Aufmaß,
  Rechnungsprüfung und Kosten, die fehlende Bedienung zum Löschen und Berichtigen.
- **G-62** Umgang mit den Annahmen der Agenten — *entschieden*. **Antwort:** Sie gelten für v1. Die App bekommt eine
  Hilfeseite „Annahmen“, die die fachlich wichtigen in einfachen Sätzen nennt (unter anderem D-05 Preisspiegel, D-21
  Zuschlag, D-34 Abzugskette, D-35 Nachtrag und Soll/Ist, D-37 Kostenkontrolle, D-56 Honorar). Die Sitzung mit dem Büro
  prüft genau diese Liste. G-26, G-27 und „VOB 80“ gelten damit für v1 wie angenommen; ob das Büro sie bestätigt, zeigt die
  Sitzung. ADR 0012 wird in Welle 7 `accepted` (ungetaggtes PDF in v1, `Berichtsmodell` neben dem `Ausgabemodell`).
- **G-63** Anrede in der Oberfläche — *entschieden*. **Antwort:** Unpersönlich („Noch keine Projekte.“, „Bitte eine Datei
  wählen.“); wo eine direkte Anrede nötig ist, „Sie“. Kein „du“. Regel L4 in `docs/regeln.md`.
- **G-64** Echte Testdateien — *entschieden*. **Antwort:** Der Nutzer stellt sie vor dem Start der Welle 7 bereit
  (Ticket 125): GAEB-Dateien in DA XML, GAEB 90 und GAEB 2000, LVs aus dem Büro, eine IFC-Datei aus einem
  Autorenwerkzeug. Selbst getippte LVs dürfen mit Herkunftsvermerk ins Repo; echte Bürodateien nur anonymisiert (C4, G-52).

## Widersprüche (Stand nach der Sitzung)

| Widerspruch | Auflösung |
|---|---|
| Recherche Server und Mehrbenutzer, ADR 0001 lokal | G-01: lokal in v1, Mehrbenutzer später |
| Recherche Lizenz-Aufteilung, ADR 0007 AGPL-3.0 | G-40: AGPL-3.0-or-later, ADR 0008 |
| Alter Plan „nur GAEB 3.3“, Recherche 3.2 | G-10: 3.3 und 3.2 |
| ÖNORM/SIA „nur DE“ und optional in P3.4 | G-08: nur DE |
| KI-Assistent in P8 und Nicht-Ziel | G-05: X6 nach M4 |
| EP mit 2 oder 3 Nachkommastellen | G-21: EP 3 gespeichert, Betrag 2 |
| Kein Ereignisprotokoll (ADR 0006), Recherche „Muss“ | G-24: Nebenbuch, ADR 0009 |
| „VOB 80“ zweimal belegt | Das `vob80`-Flag der Recherche (§ 2 Abs. 3 VOB/B, Schwellen 110 % und 80 %) ist belegt, `map-kosten.md` Zeile 96. Die zweite Bedeutung („80 % bei strittigen Nachträgen“) habe ich nicht gefunden. Vor A1 klären. Annahme für Demo, Mensch bestätigt später: zweite Bedeutung vermutlich § 650c Abs. 3 BGB, nicht in v1; Soll/Ist-Schwellen 110 %/90 % nach VOB/B § 2 Abs. 3 (D-35). |
| Zulage (Vorbild) und Zuschlagsposition (GAEB) | G-22: Zuschlagsposition, GLOSSARY angepasst |
| Zuschlagsposition als Menge × EP (Kern, Fixtures) und als Prozentzuschlag (GAEB, G-22) | E-03: GAEB-Semantik, Kern und Fixture ändern sich mit K6 |
| XSD-Validierung nur in CI (Q3/M2) und eigene Prüfung | G-12: ADR 0010 |
| C3: Umsetzende Agenten lesen `okf/research/` | Mit G-44 entfällt das. Regel C3 angepasst |
