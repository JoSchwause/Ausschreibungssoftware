# Grilling-Backlog: offene Ziele und Entscheidungen

Stand: 2026-11-09. Eingabe für eine eigene Grilling-Sitzung (`/grilling`). Antworten fließen nach
dem Rückschreib-Protokoll in `.scratch/ava-oss/plan.md` §5 zurück.

Format je Frage: **Frage** — *Standard, falls unbeantwortet* — blockiert.
**Stufe 1** muss vor Welle 1 beantwortet sein. **Stufe 2** hat einen tragfähigen Standard.

## Stufe 1 — Produkt und Umfang

- **G-01** Heißt „Open-Source-Variante von NOVA AVA“ die lokale Einzelnutzer-PWA aus ADR 0001, oder
  am Ende Mehrbenutzer mit Server wie das Vorbild? Die Recherche nennt Mehrbenutzer ein „Muss“. —
  *lokal bleiben, Befehle und IDs sync-fähig halten* — Regel A1, X5, ganzer Strang S.
- **G-02** Wer ist der erste echte Nutzer: du, der Architekten-Freund, eine öffentliche Community?
  Hat das ausstehende Interview stattgefunden? — *Büro des Freundes* — Prioritäten überall.
- **G-03** Falls nur lokal: Wie wird Datenverlust verhindert (OPFS kann vom Browser geräumt werden;
  ein Browser, ein Gerät)? — *Export-Erinnerung + Sicherungsordner über File System Access* — S4.
- **G-04** Erster Schnitt A (Vergabe-Kern LPH 6–7), B (schmale durchgehende Kette LPH 6–8) oder C?
  Die Synthese lässt es offen, der alte Plan nimmt A an. — *A* — Reihenfolge der Wellen.
- **G-05** Je Modul rein, später oder nie: BIM, Bauzeitenplan, HOAI, Bauleitung, Bieterportal, KI,
  EP-Kalkulation, Rahmenverträge, Auktion? (Alter Plan führt KI in P8, die Synthese als Nicht-Ziel.)
  — *alle „später“, Auktion „nie“* — X-Stränge, C4.
- **G-06** Ziel Verhaltensgleichheit, oder bekannte Lücken des Vorbilds bewusst schließen (kein
  Einfügen aus Excel, unumkehrbare Aktionen, nur manuelles Aktualisieren)? — *Lücken schließen* —
  U3, Regel Q5.
- **G-07** Projektname und Erscheinungsbild (darf dem Vorbild nicht ähneln). — *noch keiner* — F1,
  U1.
- **G-08** Dauerhaft nur Deutschland, oder ÖNORM/SIA offenhalten? (Alter Plan widerspricht sich.) —
  *nur DE, keine Abstraktion für andere* — G4, K3.
- **G-09** Gibt es in v1 ein Projekt über dem LV mit Stammdaten (Bauherr, Adressen, MwSt-Vorgaben),
  oder nur eine Liste von LVs? — *schlankes Projekt* — F2, S1.

## Stufe 1 — Normen und Austausch

- **G-10** GAEB-Versionen: nur 3.3, oder auch 3.2 (von manchen öffentlichen Auftraggebern verlangt)
  und Lesen von GAEB 90/2000? Der Freund schreibt auch öffentlich aus. — *3.3 und 3.2 lesen und
  schreiben, GAEB 90 später* — Umfang von Strang G.
- **G-11** Welche Phasen im MVP: 81, 83, 84, 86 — auch 82, 85 (Nebenangebot), 89? — *81/83/84/86* —
  G1–G3.
- **G-12** Die GAEB-XSDs tragen „© DIN“ ohne Lizenz: zur Build-/Testzeit laden, bei GAEB anfragen,
  oder Validierung selbst schreiben? — *in der CI laden, nie committen* — Regel Q3, ADR 0008.
- **G-13** Export bei fehlgeschlagener formaler Prüfung: sperren, warnen, als Entwurf kennzeichnen? —
  *warnen + Entwurfskennzeichen* — G2.
- **G-14** Gibt es eine Bieterseite (Preiseingabe in einer zweiten Installation, Excel-Rundlauf),
  oder schicken Bieter nur X84? — *nur X84 und Excel* — V5.
- **G-15** E-Rechnung: nur erzeugen, oder auch eingehende XRechnung lesen? — *später; zuerst
  lesen* — A4.
- **G-16** DIN-276-Bezeichnungen im öffentlichen Repo: nur Nummern, vom Nutzer importierter Katalog,
  oder Erlaubnis einholen? Dasselbe für Einheitenkatalog und REB-Formeltexte. — *nur Nummern +
  Nutzerimport* — C1, ADR 0008.
- **G-17** STLB-Bau/DBD/Heinze: ignorieren, oder eine Andockstelle „eigene Lizenz mitbringen“
  vorsehen? — *im MVP ignorieren, Feld für Textquelle vorhalten* — U4, C5.

## Stufe 1 — Domänenmodell (blockiert `vertrag`)

- **G-20** Wandert ein einziges LV-Objekt durch alle Phasen (Modell des Vorbilds), oder sind
  Ausschreibungs-LV, Angebot und Auftrags-LV getrennte Aggregate mit gemeinsamer Positions-ID? —
  *getrennt, gemeinsame Positionsidentität* — F2, V, A.
- **G-21** Verbindliche Nachkommastellen: EP mit 2 oder 3 gespeichert, Menge immer 3, Prozent? —
  *EP 3, Menge 3, Prozent 2* — Regel N3, K1.
- **G-22** Benennung: Die „Zulage“ des Vorbilds entspricht in GAEB der Zuschlagsposition
  (`MarkupItem`). Welcher Begriff, welche Semantik? Die vier Zuschlagsarten sind in der Recherche
  nur lose verstanden. — *GAEB-Semantik* — K6.
- **G-23** Nachlass: nur Prozent auf LV-Ebene, oder auch je Titel, je Position und absolut? Wie
  verketten sie sich (in der Recherche ungeprüft)? — *LV-Ebene, Prozent und absolut* — K4, V1.
- **G-24** Historie: ADR 0006 (Undo + LV-Stände) gegen das Recherche-„Muss“ eines unveränderlichen
  Protokolls (wer, was, wann). Befehlsprotokoll dauerhaft speichern? — *speichern, ohne eigene
  Ansicht* — S3.
- **G-25** OZ-Maske: nur fester Standard, oder je LV frei definierbar samt Los und Index? Was
  geschieht beim GAEB-Import mit abweichender Maske? — *frei definierbar, importierte Maske
  übernehmen* — K3, G1.
- **G-26** Preisspiegel-Regeln: welche virtuellen Bieter, Ausreißergrenzen, ABC-Grenzen? Ist
  „Nachlass in EP einrechnen“ gewünscht (im Vorbild unumkehrbar)? — *Min/Mittel/Max, Grenzen
  einstellbar, umkehrbar* — V2.
- **G-27** Tiefe der Rechnungsprüfung: volle Abzugskette (Sicherheitseinbehalt, Skonto,
  Bauabzugsteuer, kumulierte Rechnungen) oder einfach? Skonto- und Gleitklausel-Rechnung sind
  ungeklärt. — *auf ein Grilling vor Welle 5 vertagt* — A3.
- **G-28** MwSt: ein Satz je LV, oder je Position/Titel; Satzwechsel über die Zeit? — *ein Satz je
  LV* — K4.
- **G-29** Lose: rein gliedernd, oder getrennt vergebbar mit einem Auftrag je Los? — *im MVP rein
  gliedernd* — K2, V4.

## Stufe 2 — Oberfläche

- **G-30** Zielgeräte: nur Desktop, oder auch Tablet? Mindestbreite? — *Desktop ab 1280 px*.
- **G-31** Richtung: dichtes, tabellenartiges Werkzeug oder luftig-modern; Dunkelmodus;
  Komponentenbasis (Radix/shadcn oder eigen)? — *dicht, Radix-Primitive, hell und dunkel*.
- **G-32** Langtext: wie viel Rich-Text (Tabellen, Bilder, Bieterergänzungen)? —
  *in GAEB abbildbare Teilmenge einschließlich Bieterergänzungen*.
- **G-33** Leistungsobergrenze: 5.000 Zeilen (Ticket 12) oder 10.000–100.000 (Recherche-Lücke)? —
  *Budget 10.000*.
- **G-34** Barrierefreiheit und Übersetzbarkeit (nur Deutsch, aber übersetzbar?). — *Tastatur und
  Kontrast; Texte in Katalogdateien*.
- **G-35** Automatisch speichern bei jedem Befehl, oder ausdrücklich speichern? — *bei jedem
  Befehl*.

## Stufe 2 — Recht und Projektführung

- **G-40** Lizenz: schlicht AGPL-3.0 (ADR 0007) oder der Recherche-Vorschlag (App
  AGPL-3.0-or-later, freizügige Lizenz für `dezimal`/`gaeb`, CC BY für Inhalte, DCO, REUSE)? —
  *or-later, eine Lizenz für alles* — F1.
- **G-41** Dürfen im Vorbild gemessene Zahlen in versionierten Tests stehen? Sie stehen bereits in
  den Tickets 04, 07 und 09. — *ja, wenn aus VOB/GAEB-Regel herleitbar und dort belegt* — Regel C4.
- **G-42** Die Recherche hat nie geprüft, ob die Testbedingungen des Vorbilds automatisierte
  Beobachtung und Bundle-Analyse erlauben. Vor weiterer Veröffentlichung klären (Anwalt?) Und:
  lokale Bundle-Kopien löschen? — *Bundle-Kopien löschen, Notizen in eigenen Worten behalten* —
  Regeln C2/C3.
- **G-43** Beiträge von außen: annehmen, CLA oder DCO, Tracker lokal lassen oder zu GitHub? —
  *lokal bis zum MVP*.
- **G-44** `okf/research/` über das Vorbild liegt schon im öffentlichen Repo: öffentlich lassen? —
  *ja; nur öffentliche Quellen*.

## Stufe 2 — Prozess

- **G-50** Review: Prüfst du jeden PR, nur Meilensteine, oder ein Review-Agent und du nur bei
  `vertrag` und ADRs? — *Review-Agent + du bei Vertrag, ADRs und Meilensteinen*.
- **G-51** Tempo: wie viele parallele Agenten je Sitzung, Zieltermin für M3? — *höchstens 8, kein
  Termin*.
- **G-52** Wer verfasst GAEB-Fixtures und bestätigt Praxistauglichkeit (echte, anonymisierte LVs
  des Freundes)? — *selbst verfasst + ein echtes anonymisiertes LV nur lokal*.
- **G-53** Hosting der PWA: GitHub Pages, eigene Domain, oder nur lokal? — *GitHub Pages*.
- **G-54** `.scratch/ava-mvp/spec.md` wurde nie geschrieben, Ticket 01 verlangt ein Review bereits
  angenommener ADRs: beides in dieser Sitzung miterledigen? — *ja*.

## Widersprüche zwischen Dokumenten (in derselben Sitzung auflösen)

| Widerspruch | Frage |
|---|---|
| Recherche empfiehlt Server und Mehrbenutzer, ADR 0001 lokal | G-01 |
| Recherche empfiehlt Lizenz-Aufteilung, ADR 0007 nur AGPL-3.0 | G-40 |
| Alter Plan „nur GAEB 3.3“, Recherche verlangt 3.2 | G-10 |
| ÖNORM/SIA: „nur DE“ und zugleich optional in P3.4 | G-08 |
| KI-Assistent: P8 im alten Plan, Nicht-Ziel in der Synthese | G-05 |
| EP mit 2 oder 3 Nachkommastellen | G-21 |
| Kein Ereignisprotokoll (ADR 0006), Recherche nennt es „Muss“ | G-24 |
| „VOB 80“ steht für zwei verschiedene Regeln (Mengenabweichung vs. 80 % bei strittigen Nachträgen) | vor A1 klären |
