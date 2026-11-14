# 160: `vertrag` v1.7c: Projekt samt Inhalt löschen

Status: resolved
Type: task
Welle: 7 · Strang: F, E8 · Paket/Ordner: `packages/vertrag`, `GLOSSARY.md` (mechanische Folgezeilen nur, wo der Typcheck sie erzwingt)
Blocked by: – (nach 128)
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: A4, A5, A8, P9, Q5; ADR 0009, ADR 0011; D-96
Herkunft: Tor E (158), E8, D-96

## What to build

Nach **D-96**:
1. Neuer Befehl `ProjektSamtInhaltLoeschen { art }` in `ProjektBefehl`; `ProjektLoeschen` bleibt unverändert.
2. Neue ChangeSet-Art `ProjektbestandChangeSet { art: 'projektbestand'; projekt: Aenderung<Projekt>; bestand:
   Aenderung<Projektbestand> }`. `Projektbestand` = die Struktur, die die Projektdatei schon trägt (Schema 7). Prüfen und im
   Ticket belegen, dass LV-Stände, Befehlsprotokoll und Modellverweise enthalten sind; fehlt etwas, hier ergänzen.
3. Lesarten: Ausführer bekommt den Bestand als Pflichtparameter (sonst `ungueltige-eingabe`); `speicher` löscht in einer
   Transaktion, Undo stellt über den Schreibweg von `projektdateiEinlesen` mit gleichen IDs wieder her; andere Formen von
   `projektbestand` → `unbekannt`; Modell-Bytes werden erst freigegeben, wenn kein Undo-Schritt sie mehr nennt; Protokoll als
   Massenbefehl (Kopf und Prüfsumme, `MASSENBEFEHLSARTEN`).
4. Glossar: „Projekt samt Inhalt löschen“, „Projektbestand“.

## Acceptance criteria

- [x] Typtests; Lesarten als D-160.x für 161
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [x] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments

Lesarten von `vertrag` v1.7c für 161 (`kern`, `speicher`, App) (Demo-Modus, vorläufige Annahmen, enge Lesart; dieselben Texte
stehen an den Typen). Alles additiv (A8): Kein Schema, keine Projektdatei, kein Protokoll und keine Fixture vor v1.7c ändert
sich; `ProjektLoeschen`, `ProjektChangeSet` und `ProjektBefehlAusfuehren` bleiben unverändert.

- **D-160.1 Befehl.** `ProjektSamtInhaltLoeschen { art }` in `ProjektBefehl` (damit in `Befehl`); im Protokoll mit dem Projekt
  als Aggregat (`{ art: 'projekt', id }`). `ProjektLoeschen` und seine `konflikt`-Regel bleiben.
- **D-160.2 Projektbestand, Prüfung gegen Schema 7.** Frage: Trägt die Projektdatei LV-Stände, Befehlsprotokoll, Verweise auf
  Einstellungen und Modelle? Befund: **LV-Stände** ja (`lvStaende`, samt eingefrorenem Zustand und `angelegt`); **Protokoll**
  ja (`protokoll`, Massenbefehle schon als Kurzfassung); **Modellverweise** ja (`bauwerksmodelle[].bauwerksmodell.datei.hash`,
  `vorgaengerId`, `Mangel.bauteil.bauwerksmodellId`; die Bytes stehen getrennt in `modelldateien`); **Einstellungsverweise**
  gibt es keine: Kein Aggregat verweist auf die Einstellungen (Kostengruppennummern an Knoten und Kostenermittlungen sind Werte,
  ein Druckprofil wird beim Drucken gewählt und nie gespeichert); der Block `einstellungen` ist eine Kopie der Geräteeinstellungen.
  Gegen die Tabellen von `speicher` geprüft: Jede Tabelle eines Projekts (projekt, bieter, LV mit Knoten, Summen, Papierkorb,
  LV-Stand, Angebot mit Positionen, Auftrags-LV, Aufmaß, Rechnung, Kostenermittlung, Bauwerksmodell mit Inhalt, Bauzeitenplan,
  Honorarberechnung, Mangel, Bautagebucheintrag, Protokoll) steht in der Datei. Entscheidung: **nichts fehlt, nichts ergänzt.**
  `Projektbestand = Omit<Projektdatei, 'schemaVersion' | 'projekt' | 'modelldateien' | 'einstellungen'>`, ein abgeleiteter Typ
  (was die Datei künftig dazubekommt, gehört ohne Vertragsänderung zum Bestand). Ausgelassen: Schemaversion (der Bestand ist immer
  aktuell), Projekt (steht daneben im ChangeSet), Modell-Bytes (nie in ChangeSet oder Undo, D-51), Einstellungen (gehören dem
  Gerät, D-73; das Löschen lässt sie unberührt). Listen und „fehlt = keine“ wie in der Datei.
- **D-160.3 ChangeSet.** `ProjektbestandChangeSet { art: 'projektbestand', projektId, projekt: Aenderung<Projekt>, bestand:
  Aenderung<Projektbestand> }`. `projektId` über D-96 hinaus, wie bei `ProjektChangeSet` (die Kennung ohne Blick in `vorher`/
  `nachher`). Kein Aggregat: `AggregatBezug` bleibt ohne `projektbestand`. Genau zwei Formen: Löschen (beide `nachher: null`)
  und Umkehrung (beide `vorher: null`); jede andere Form (beide Seiten gesetzt, `null` auf verschiedenen Seiten, `projektId`
  nicht die des Projekts) weist `speicher.anwenden` mit `unbekannt` ab und schreibt nichts (wie D-66).
- **D-160.4 Ausführer.** Eigene Signatur `ProjektSamtInhaltLoeschenAusfuehren(zustand, befehl, bestand)` mit dem Bestand als
  **Pflichtparameter**, Ergebnis `ProjektbestandChangeSet`; dazu `ProjektbestandChangeSetUmkehren` (Tausch in `projekt` und
  `bestand`). Grund: `ProjektBefehlAusfuehren` liefert `ProjektChangeSet`; es zu verbreitern bräche jeden Aufrufer. Der
  allgemeine Ausführer hat keinen Bestand und antwortet auf den Befehl mit `ungueltige-eingabe` (`feld: 'bestand'`) – das ist
  das „sonst `ungueltige-eingabe`“ aus D-96 (wie D-127.17). `zustand: null` → `befehl-nicht-zustaendig`; ein Bestand, der kein
  Objekt ist oder dem eine Pflichtliste fehlt → `ungueltige-eingabe` (`feld: 'bestand'`); ein leerer Bestand ist erlaubt.
  Vollständigkeit prüft `speicher`, nicht der Kern. Die App liest den Bestand aus `projektdateiExportieren` (geparst, ohne die
  vier ausgelassenen Felder; genau die Form, gegen die `speicher` vergleicht; keine neue Speichermethode in v1.7c) und zählt
  „Anzahl je Art“ für den Dialog aus seinen Listen (das Protokoll zählt nicht als Art).
- **D-160.5 Löschen in `speicher`.** `projekt.vorher` gleich dem gespeicherten Projekt samt Bietern und `bestand.vorher` gleich
  dem gespeicherten Bestand (Vergleich in kanonischer Form wie D-31.2; weicht etwas ab oder fehlt etwas: `konflikt`, nichts
  geschrieben); dann alles in **einer** Transaktion gelöscht, das Protokoll des Projekts eingeschlossen. Der Eintrag des Löschens
  bleibt nicht stehen (wie D-31.1: Er hätte kein Projekt mehr). Einstellungen und Einstellungsprotokoll bleiben.
- **D-160.6 Undo in `speicher`.** Umkehrung (beide `vorher: null`) über den Schreibweg von `projektdateiEinlesen` ohne `alsKopie`
  und ohne `einstellungsuebernahme`, mit denselben Kennungen, in einer Transaktion: Projekt, alle Aggregate in der Reihenfolge
  der Abhängigkeiten, LV-Stände in der Reihenfolge des Bestands (so bleibt die Ordnung von `LvStandRepository.auflisten`), das
  Protokoll aus `bestand.nachher.protokoll`; danach der `Rueckgaengig`-Eintrag wie jeder Befehl (A5). Sein `protokollId` nennt
  den nicht gespeicherten Eintrag des Löschens: Die Ausnahme aus D-31.1 (`pruefeHistorienbezug`, Projekt angelegt) gilt auch hier.
  Besteht das Projekt oder eine Kennung des Bestands schon (etwa nach dem Einlesen der Sicherung) oder fehlen Bytes einer genannten
  Modelldatei in der Ablage: `konflikt`, nichts geschrieben (Q5). Ein `Wiederholen` ist wieder das Löschen (D-160.5).
- **D-160.7 Modell-Bytes.** Keine neue Regel nötig: Die `Modelldateiablage` gibt Bytes nur beim Öffnen des Speichers frei, wenn
  kein Modell sie nennt; die Undo-Historie lebt nur in der Sitzung (ADR 0006). Also werden Bytes erst frei, wenn kein Undo-Schritt
  sie mehr nennen kann. 161 darf für diesen Weg keine Freigabe in der Sitzung einbauen.
- **D-160.8 Massenbefehl.** `ProjektSamtInhaltLoeschen` steht in `MASSENBEFEHLSARTEN` (D-96, E-13); `Massenbefehlskopf`
  `{ art: 'ProjektSamtInhaltLoeschen' }`: Die lange Liste dieses Befehls ist der Bestand, und der steckt nicht im Befehl, sondern
  im ChangeSet; der Kopf ist darum der ganze Befehl, die Prüfsumme wie bei jedem Massenbefehl über den vollständigen Befehl.
  Lesart: Wegen D-160.5 wird der Eintrag heute nirgends gespeichert; die Liste hält fest, dass der Bestand nie in ein Protokoll
  gerät (auch nicht bei einer späteren Synchronisation, G-01). Der Dekoder liest die Kurzfassung nur mit `art` im Kopf.
- **D-160.9 Pflichttest „byte-gleich“ (D-96).** Lesart: Nach Löschen → Undo ist der Export byte-gleich dem vor dem Löschen **bis
  auf genau einen angehängten Eintrag am Ende von `protokoll`**, den `Rueckgaengig` des Undo (A5, v1.2: auch Undo ist ein
  protokollierter Befehl). Der Test prüft diesen Eintrag (Art, `protokollId` gleich der Kennung des Löscheintrags), entfernt ihn
  und vergleicht dann die Bytes. Modelldateien wie D-51 (Vergleich über den SHA-256, `inhalt` ist zwischen Implementierungen
  nicht byte-stabil; im selben Lauf gleich).
- **D-160.10 Mechanische Folgezeilen (vom Typcheck erzwungen, bis 161).** kern `projektBefehlAusfuehren`: der Befehl →
  `befehl-nicht-zustaendig` (161 ersetzt das durch `ungueltige-eingabe`, D-160.4). speicher: `anwenden` weist
  `projektbestand` mit `unbekannt` ab und schreibt nichts; `AGGREGATARTEN` ist nach `AggregatBezug['art']` geschlüsselt (Typ
  `AggregatChangeSet` für Bezug, Historienbezug und Schreibweg); `BEFEHLSARTEN` kennt den Befehl; `massenbefehlskopf` und der
  Dekoder (`LANGE_LISTE` mit `null` = keine Liste) kennen den Kopf; Testhilfen `umkehren` und `aggregatVon` kennen die Form. App
  `historie/arten.ts`: Umkehrung als Tausch nach dem Vertrag, Ziel „bleiben“ (161: Umkehrung des Kerns, Ziel Projektliste bzw.
  Projekt). Tests dazu in `kern/src/projekt-befehle.test.ts` und `speicher/src/projektbestand.test.ts`.
- **D-160.11 Form der Lieferung.** Befehl in `befehle.ts`, ChangeSet und Signaturen in `changeset.ts`, `Projektbestand` und
  Kopf in `speicher.ts` (neben der Projektdatei), Beispiele in `beispiele.ts`, Typtests in `vertrag-v17c.test.ts`; die
  geschlossenen Listen in `vertrag.test.ts` (Arten der ChangeSets) und `inhaltsmodell.test.ts` (`MASSENBEFEHLSARTEN`) ergänzt.
  Version im Kopf von `index.ts`. Glossar zuerst (L2): „Projektbestand“, „Projekt samt Inhalt löschen“, „Massenbefehl“ ergänzt.

Offene Fragen für den Orchestrator: (1) D-160.9 weicht vom Wortlaut „byte-gleiche Projektdatei“ in D-96 ab (A5 verlangt den
`Rueckgaengig`-Eintrag). (2) D-160.8: Die Kurzfassung ist heute nur Form, weil der Eintrag des Löschens wie bei D-31.1 nicht
stehen bleibt.

Ergebnis (nach Merge von `integration/welle-7`): Lint grün (ESLint, Prettier, Paketgrenzen, Lizenzen, Clean Room), Typcheck
grün, Unit-Tests 4.700 grün, 3 übersprungen; rot im vollen Lauf nur 9 CPU-Leistungsbudgets unter Parallellast (Last ≈ 15–20 auf
4 Kernen), alle einzeln wiederholt grün; keines gelockert. E2E `undo.spec.ts` und `projekt.spec.ts` grün (9). Keine Texte für
Nutzer geändert.

## Answer

Gemergt nach `integration/welle-7` mit `5afe7eb`. Ergebnisse, Testläufe und Entscheidungen (D-160.x) unter `## Comments`.
