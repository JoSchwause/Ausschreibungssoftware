# 18: Klickbarer Prototyp für das Nutzerinterview

Status: ready-for-agent
Type: prototype
Blocked by: -
Regeln: `docs/regeln.md` C1, C4, L1, L3, U3, U4, U5 (Architekturregeln A/P gelten nicht, siehe Grenzen)
Herkunft: G-02 (Nachtrag 2026-11-09), `.scratch/ava-mvp/spec.md` Abschnitt 8

## Frage, die der Prototyp beantwortet

Das Architekturbüro, das erster Nutzer wird, soll an etwas Anfassbarem sagen können, **was stimmt und was
nicht**, bevor Vertrag, Kern und Grid gebaut werden. Der Prototyp beantwortet vier Teilfragen:

1. **LV-Grid und Tastatur.** Fühlt sich das Bearbeiten eines LV (Titel, Positionen, Summen) schneller und
   direkter an als in der heutigen Software? Reicht Excel-artige Navigation?
2. **Preisspiegel.** Erkennt man auf einen Blick, wer günstig ist, wo Preise auffallen (Ausreißer) und wie die
   Rangfolge aussieht?
3. **Gliederung Projekt / LV / Angebot.** Passt das Modell „ein Projekt, mehrere LVs, Angebote und
   Auftrags-LV als getrennte Objekte“ zur Denkweise im Büro?
4. **GAEB-Weg.** Ist der Ablauf „X83 laden, X84 einlesen, Export mit Prüfwarnung als Entwurf“ verständlich?

## Form

Eine klickbare Web-Oberfläche mit **mehreren, deutlich verschiedenen Varianten je Ansicht**, umschaltbar per
URL-Parameter und schwebender Leiste (Skill `prototype`, Zweig UI). Ein Befehl startet sie. Alle Texte deutsch.

Mindestens diese Ansichten, je mit zwei bis drei Varianten:

| Ansicht | Teilfrage | Varianten (Vorschlag) |
|---|---|---|
| LV-Grid | 1 | dichte Tabelle mit Baum · Tabelle mit Seitenpanel für Position · Karten je Titel |
| Preisspiegel | 2 | Matrix mit Farbskala · Matrix mit Rangzahl · Balken je Position |
| Projektübersicht | 3 | Baum Projekt → LV → Angebot · Registerkarten je LV · Vorgangsliste (Ausschreiben, Vergabe, Auftrag) |
| GAEB-Dialog | 4 | Assistent in Schritten · eine Seite mit Prüfliste |

## Was echt ist und was nur gespielt

- **Echt:** Rechnung von GP, Summen, Nachlass und MwSt nach Regel N2 (Dezimalarithmetik, kein `number` für
  Beträge), Bieter-Summen, virtuelle Bieter Min/Mittel/Max, Ausreißer ±20 %, Rangfolge, Tastaturnavigation
  im Grid (Pfeile, Enter, Tab, F2).
- **Gespielt:** GAEB. „X83 laden“ und „X84 einlesen“ lesen **vorbereitete JSON-Dateien** aus dem
  Prototyp-Ordner und tun so, als wären es GAEB-Dateien. Kein XML-Parser, kein XSD. Der Dialog zeigt eine
  **erfundene** Prüfliste mit zwei Warnungen und das Kennzeichen „Entwurf“.
- **Nicht vorhanden:** Speicherung (alles im Speicher, Neuladen setzt zurück), Undo, Positionsarten außer
  Normal, Bedarf, Wahl, Pauschal, Zuschlagsposition, Konten, Mehrbenutzer.

## Daten

Selbst verfasst (Regel C4): ein erfundenes Beispielprojekt, **ein LV mit 3 Titeln und etwa 25 Positionen**,
dazu **drei Angebote** mit verschiedenen Preisen, darunter ein Ausreißer, ein Nachlass und eine nicht
angebotene Position (nicht angeboten ≠ 0,00). Summen vorher von Hand nachrechnen und im README des
Prototyps festhalten. Keine echten Firmen-, Projekt- oder Personennamen.

## Grenzen

- **Wegwerfcode.** Eigener Branch `proto/interview`, **nicht in `main`**, Ordner `proto/interview/`. Keine Tests,
  keine Abstraktionen. Ein README sagt, wie man startet und was gespielt ist.
- **Nachtrag E-20 (2026-11-10):** Der Prototyp wird auf `packages/ui-grid`, `packages/ui-basis`, `packages/dezimal`
  und den Fixtures gebaut (`fixtures/typisch.json`, `fixtures/typisch-angebote.json` dürfen die selbst verfassten
  Daten unten ersetzen, wenn Ausreißer, Nachlass und „nicht angeboten“ darin vorkommen oder ergänzt werden). Die
  Pakete werden nur benutzt, nicht geändert. Die Variante „dichte Tabelle mit Baum“ ist das echte Grid; an ihr
  werden die Fragen aus E-18 gestellt (Enter startet das Bearbeiten, Leertaste wählt die Zeile, Einfügen legt neue
  Positionen an).
- **Clean Room (C1, L3, U4).** Kein Layout, Icon, Name oder Feldname der Referenzsoftware. Wer das Vorbild
  kennt, soll im Prototyp nichts wiedererkennen. Eigenes Erscheinungsbild.
- **Kein Recherchebestand lesen** (C3). Alle Angaben stehen in diesem Ticket, `GLOSSARY.md`, `spec.md` und
  `docs/regeln.md`.
- **Validierung blockiert nie die Eingabe (U5).** Fehler stehen in der Prüfliste, nicht in Sperrdialogen.
- Kein Anspruch auf Vollständigkeit. Wo etwas fehlt, steht ein Platzhalter „noch nicht im Prototyp“.

## Acceptance criteria

- [ ] Ein Befehl startet den Prototyp, alle vier Ansichten sind per Leiste mit allen Varianten erreichbar
- [ ] Im LV-Grid sind Zellen per Tastatur bearbeitbar; Summen, Titelsummen, Nachlass und MwSt ändern sich sofort
- [ ] Die Summen der drei Angebote und des Preisspiegels stimmen mit den im README von Hand nachgerechneten Werten
- [ ] Preisspiegel zeigt Min, Mittel, Max, Ausreißer und Rangfolge; „nicht angeboten“ ist von 0,00 unterscheidbar
- [ ] Der GAEB-Dialog zeigt Warnungen und „Entwurf“, ohne die Eingabe zu sperren
- [ ] README nennt: Startbefehl, was gespielt ist, die vier Teilfragen und je Variante eine Zeile, worauf das Büro achten soll
- [ ] Eine Seite „Notizen“ im README (leer) nimmt die Antworten des Büros je Variante auf

## Danach (nicht Teil dieses Tickets)

Interview durchführen, Antworten unter `## Answer` eintragen, Status `resolved`. Bestätigte Entscheidungen fließen
in `vertrag` (F2), Grid (U2/U3) und Preisspiegel (V3) und, wenn sie eine G-Frage berühren, in `grilling.md`.
Prototyp als primäre Quelle auf dem Branch lassen und im Ticket verlinken.

## Comments
