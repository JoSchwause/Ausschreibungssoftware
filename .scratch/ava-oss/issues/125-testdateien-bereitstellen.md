# 125: Echte Testdateien für Welle 7 bereitstellen

Status: ready-for-human
Type: task
Welle: vor 7 · Strang: F, G4, X1 · Ort: `fixtures/extern/umsteiger/` (neu) bzw. Anhang an die Sitzung
Blocked by: –
Regeln: C1, C3, C4; G-52, G-64
Herkunft: Runde vor Welle 7 (`umfang-welle-7.md`, B-34, E6)

## Worum es geht

Welle 7 liest GAEB 90, GAEB 2000 und DA XML 3.1 und prüft den Weg einer Umsteigerin. Im Repo liegen bisher nur amtliche
Musterdateien in DA XML und erfundene LVs. Ohne Dateien, wie sie im Büroalltag vorkommen, zeigen sich Abweichungen erst bei
der Demo.

## Was gebraucht wird

1. **Ein selbst getipptes LV in vier Formaten.** Im bisher genutzten AVA-Programm ein kleines LV selbst anlegen (zwei Titel,
   rund zehn Positionen, darunter je eine Bedarfs-, Wahl-, Stundenlohn- und Zuschlagsposition, ein Vortext, ein Langtext mit
   Fettdruck und Liste, Mengen und Preise mit Nachkommastellen) und ausgeben als DA XML 3.3 (X83 und X86), DA XML 3.1 (falls
   wählbar), GAEB 90 (.d83, .d86) und GAEB 2000 (.p83, .p86). Dazu, wenn möglich, ein Angebot als X84 bzw. .d84/.p84.
   Keine Beispielprojekte oder Katalogtexte des Herstellers verwenden: nur selbst geschriebene Texte (C1).
2. **Zwei bis drei LVs aus dem Büro**, wie sie von Dritten kamen (gern alte GAEB-90- und GAEB-2000-Dateien).
3. **Eine IFC-Datei** aus einem Autorenwerkzeug (Revit, ArchiCAD oder Allplan), IFC 2x3 oder IFC 4, mit Mengen (Qto).
4. Wenn vorhanden: eine **X31** aus einer Aufmaßsoftware und eine **XRechnung** eines Auftragnehmers.

## Wohin damit

- Die Dateien aus Punkt 1 sind selbst verfasst und dürfen ins Repo: nach `fixtures/extern/umsteiger/`, mit einem Eintrag in
  `fixtures/extern/HERKUNFT.md` (wer, womit erzeugt, wann) und in `REUSE.toml`.
- Die Dateien aus Punkt 2 bis 4 enthalten Namen, Adressen und Projektbezeichnungen. Sie kommen **nicht** ins Repo. Die Läufe
  der Wellen sind Cloud-Sitzungen; ein git-ignorierter Ordner auf dem eigenen Rechner erreicht sie nicht. Deshalb die Dateien
  an die Sitzung der Welle 7 anhängen. Die Agenten nutzen sie nur dort und committen höchstens anonymisierte Fassungen
  (C4: Namen, Adressen, Firmennamen, Projektbezeichnung und Aktenzeichen entfernt; Mengen und EP bleiben).

## Acceptance criteria

- [ ] Die Dateien aus Punkt 1 liegen in `fixtures/extern/umsteiger/` mit Herkunftsvermerk, oder sie sind der Sitzung angehängt
- [ ] Die Dateien aus Punkt 2 und 3 sind der Sitzung der Welle 7 angehängt, oder hier steht, dass es keine gibt
- [ ] Was fehlt, ist unter `## Comments` vermerkt; die Welle nennt dann im Bericht, was ungeprüft blieb

## Comments

- Welle 7 (2026-11-13, Orchestrator): nichts geliefert, der Sitzung hing nichts an. Die Welle nutzt selbst geschriebene Dateien (D-71); der Bericht nennt GAEB 90/2000, echte LVs und IFC aus Autorenwerkzeugen als ungeprüft.

Orchestrator (Welle 7): Welle 7 lief ohne diese Dateien (D-71); GAEB 90 und GAEB 2000 sind nur gegen eigene Fixtures geprüft. Bleibt `ready-for-human`.
