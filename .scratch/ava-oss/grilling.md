# Grilling-Backlog: Ergebnis der Sitzung

Stand: 2026-11-09. Sitzung in vier Runden geführt. Antworten sind unten je Frage eingetragen
(`**Antwort:**`). Die Rückschreibung in `plan.md`, `docs/regeln.md`, `GLOSSARY.md` und die ADRs
0008–0011 ist erledigt. Offen sind **G-06** (nie gestellt) und **G-54** (spec.md und ADR-Prüfung,
noch nicht erledigt).

Status je Frage: **entschieden**, **vertagt**, **Annahme** (Standard übernommen, Nutzer hat nicht
explizit geantwortet), **offen**.

## Stufe 1 — Produkt und Umfang

- **G-01** Produktform — *entschieden*. **Antwort:** v1 ist eine lokale Einzelnutzer-PWA nach ADR 0001.
  Mehrbenutzer mit Server ist das spätere Ziel. IDs und Befehle bleiben sync-fähig. (2026-11-09)
- **G-02** Erster echter Nutzer — *entschieden* (Interview-Status: Annahme, es steht noch aus).
  **Antwort:** Das Büro des Freundes ist der erste Nutzer. Das Interview kommt vor Welle 3. Keine
  öffentliche Community vor M3. (2026-11-09)
- **G-03** Schutz vor Datenverlust — *entschieden*. **Antwort:** Export-Erinnerung und optionaler
  Sicherungsordner über die File System Access API (nur Chromium). In anderen Browsern bleibt der
  reine Export. (2026-11-09)
- **G-04** Erster Schnitt — *entschieden*. **Antwort:** Schnitt A (Vergabe-Kern LPH 6–7). (2026-11-09)
- **G-05** Module später oder nie — *entschieden*. **Antwort:** X1–X6 später. Auktion nie. Die
  KI-Assistenz (X6) kommt nach M4, nicht in P8 davor. (2026-11-09)
- **G-06** Verhaltensgleichheit oder Lücken des Vorbilds schließen — *offen, nie gestellt*. Annahme in
  `docs/regeln.md` (U3, Q5): Lücken werden geschlossen. Vor Welle 1 nachzuholen.
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
- **G-17** STLB-Bau — *entschieden*. **Antwort:** Im MVP ignorieren. Ein Feld für eine Textquelle
  bleibt vorgehalten. (2026-11-09)

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
  ist. (2026-11-09)
- **G-27** Tiefe der Rechnungsprüfung — *vertagt*. **Antwort:** Eigene Grilling-Runde vor Welle 5.
  A3 bleibt bis dahin offen. (2026-11-09)
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
- **G-53** Hosting — *entschieden*. **Antwort:** GitHub Pages. (2026-11-09)
- **G-54** `spec.md` und ADR-Prüfung — *offen*. **Antwort (Nutzer):** Jetzt miterledigen. Die Datei
  `.scratch/ava-mvp/spec.md` existiert noch nicht. Die Arbeit steht aus; siehe Stand in `plan.md`.

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
| „VOB 80“ zweimal belegt | Das `vob80`-Flag der Recherche (§ 2 Abs. 3 VOB/B, Schwellen 110 % und 80 %) ist belegt, `map-kosten.md` Zeile 96. Die zweite Bedeutung („80 % bei strittigen Nachträgen“) habe ich nicht gefunden. Vor A1 klären. |
| Zulage (Vorbild) und Zuschlagsposition (GAEB) | G-22: Zuschlagsposition, GLOSSARY angepasst |
| XSD-Validierung nur in CI (Q3/M2) und eigene Prüfung | G-12: ADR 0010 |
| C3: Umsetzende Agenten lesen `okf/research/` | Mit G-44 entfällt das. Regel C3 angepasst |
