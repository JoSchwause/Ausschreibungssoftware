# 58: O1: LV-Druck als PDF vervollständigen (ADR 0012)

Status: claimed
Type: task
Welle: 4 · Strang: O1 · Paket: `packages/ausgabe` (dazu `docs/adr/0012-*.md`)
Blocked by: –
Regeln: A2 (Rechnung nur im Kern), A3, N2, N4, F4, F6, U8, C1, C5, D-23
Herkunft: Ticket 28 (Spike, Empfehlung Weg A), W-04 (`next-decisions-welle-2.md`), D-23

## What to build

Der Spike (Ticket 28) hat `baueAusgabemodell` und `erzeugePdf` (pdfmake, Noto Sans) gebaut. Dieses Ticket macht daraus den
LV-Druck für v1:

1. **ADR 0012** „PDF-Ausgabe mit pdfmake, ungetaggt in v1“ im Stil der vorhandenen ADRs, `Status: proposed`, Text „für die
   Demo umgesetzt, Mensch bestätigt später (W-04)“; Kontext aus Ticket 28 (Vergleichstabelle in eigenen Worten), Folge:
   Spike mit einer taggenden Bibliothek vor O3. pdfmake bleibt hinter dem eigenen `Ausgabemodell` (Renderer tauschbar).
   Code und Messung von Weg B (Browserdruck) entfallen, wie Ticket 28 es für den Fall „Weg A“ vorsieht.
2. **Inhalt des Drucks:** Deckblatt bzw. Kopf mit Projektname, Bauherr, LV-Name, Auftraggeber und Vergabeinformationen,
   soweit gesetzt (E-11); Gliederung mit OZ, Kurztext, Langtext (Absätze, Listen, Tabellen, fett/kursiv/unterstrichen,
   Textergänzungen als markierte Lücke bzw. Wert; F6), Menge, Einheit, EP, GP; Merkmale sichtbar (Bedarf, Wahl mit
   Gruppe/Variante, Stundenlohn, Pauschal); Zuschlagspositionen mit Satz, Basis und Betrag; Leit-/Unterbeschreibungen.
   Titelsummen am Titelende; Schluss: Netto, Nachlass, Netto nach Nachlass, MwSt, Brutto und **getrennt** Bedarfssumme und
   Wahlsumme (F4). Alle Zahlen aus dem `Summenstand`/`LvZustand` (nichts rechnen, A2), de-DE über `dezimal` (N4).
3. **Druckvarianten** als Option: „mit Preisen“ (Schätzpreise) und „ohne Preise“ (Blankett für Bieter: EP/GP-Spalten leer
   mit Linie). Seitenkopf/-fuß mit LV-Name, „Seite x von y“, Datum als Eingabe (keine Uhr im Paket).
4. Deterministische Ausgabe, soweit pdfmake es zulässt (Erzeugungsdatum/ID als Eingabe setzen); sonst Test über den Text
   (`pdftext.ts`) statt über Bytes.
5. Leistung: `gross` (5.000 Positionen) unter Node < 5 s; Messwert im Ticket.

Die Anbindung in der App (Knopf „Drucken“, Worker) ist Ticket 66.

## Grenzen

- Nur `packages/ausgabe` und die ADR. Fehlt eine Zahl im Summenstand, wird sie nicht selbst gerechnet: in den Comments melden.
- Keine Ähnlichkeit mit Layout/Logos der Referenzsoftware (U4, C1). `okf/research/` wird nicht gelesen (C3).
- Ticket 51 ändert parallel die Fixtures `typisch`/`gross` (Zuschlagsposition in GAEB-Form) und die Testhilfen in
  `ausgabe`; Tests auf Fixture-Zahlen nehmen die Sollwerte aus der Fixture, nicht feste Zahlen.

## Acceptance criteria

- [x] ADR 0012 liegt vor (`proposed`)
- [x] Tests über den PDF-Text: alle Fixtures (`winzig`, `typisch`, `zuschlag`) drucken jede Position, jede Titelsumme und
      die Schlussblöcke inkl. Bedarfs- und Wahlsumme; Variante „ohne Preise“ enthält keinen Preis
- [x] Langtext mit Liste und Tabelle erscheint lesbar; Textergänzung sichtbar
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nicht-Ziele

Preisspiegel-PDF, Druckprofile (O3), getaggtes PDF, Anbindung in der App.

## Comments

### Ergebnis (Agent, Branch `welle-4/58-lv-druck`, Basis `integration/welle-4` bei `b32408c`, zuletzt mit `8a74a10` gemergt)

**Geliefert.** `packages/ausgabe`: `baueAusgabemodell(zustand, { mitPreisen?, datum?, projekt? })` und `erzeugePdf(zustand, schriften, optionen)`
(pdfmake, Noto Sans 400/700 und Kursiv). Neu: `src/langtext.ts` (Langtext als Druckblöcke: Absatz, Liste, Tabelle, Textergänzung; dazu
`bloeckeAlsText` für Excel/Tests), Kopf/Deckblatt, Merkmale, Zuschlagsposition, Leit-/Unterbeschreibungen, Bedarfs- und Wahlsumme getrennt,
Variante „ohne Preise“, Datum und „Seite x von y“ in der Fußzeile, feste Erzeugungsdaten (gleiche Eingabe, gleiche Bytes). ADR 0012
(`docs/adr/0012-pdf-ausgabe-mit-pdfmake-ungetaggt-in-v1.md`, `proposed`). Weg B (Browserdruck) ist entfernt (Code, Test, Messung);
`messung/` misst nur noch pdfmake.

**Messwert `gross` (5.000 Positionen), Basis wie oben, Umgebung wie in Ticket 28** (4 Kerne Xeon 2,1 GHz, Node 22.23.4, Chromium
153.0.8010.12; **Maschine stark belastet**: Last 14–21 auf 4 Kernen, andere Agenten liefen parallel). Fünf Läufe, Median nach einem
Aufwärmlauf: Node 6.355 ms (5.864–7.072), Chromium 4.884 ms (4.082–5.658), 300 Seiten, 1.421.886 B (Node) bzw. 1.531.952 B (Chromium),
0 von 300 Seiten enden mit einem Titel; Bündel 784.435 B, gzip 293.074 B. Die **CPU-Zeit** des Prozesses liegt unter derselben Last bei
3,8–4,5 s; der Test `src/leistung.test.ts` prüft sie (< 5 s, der schnellere von zwei Läufen), nicht die Wanduhr, weil die bei
paralleler Last um ein Mehrfaches schwankt. Auf einer ruhigen Maschine ist die Wanduhr entsprechend nahe an der CPU-Zeit
(vermutet, nicht gemessen). Gegenüber dem Spike (Ticket 28: 270 Seiten, 3,2 s Wanduhr bei Last 8) ist der Druck etwa 10 % größer
und mehr Arbeit je Position; die Rohdaten stehen in `messung/ergebnis.json`.

**Entscheidungen.**

- **D-58.1** Frage: Woher kommen Projektname und Bauherr? Entscheidung: als Option `projekt` an `baueAusgabemodell`/`erzeugePdf`;
  der `LvZustand` kennt nur die `projektId`. Grund: Das Paket liest keinen Speicher (A3). Fehlt die Option, entfallen beide Zeilen im Kopf.
- **D-58.2** Frage: Wo wird „ohne Preise“ gebildet? Entscheidung: im Modell (`mitPreisen: false`): EP, GP, Zuschlagssatz, Titelsummen und
  Schlussblock fehlen dort, der Renderer zeichnet leere Felder mit Linie in EP- und GP-Spalte. Menge und Einheit bleiben. Grund: Ein
  Preis kann nicht durch einen Renderer-Fehler durchrutschen, und Excel (Ticket 61) braucht dieselbe Variante.
- **D-58.3** Frage: Wie druckt eine Zuschlagsposition „Satz, Basis und Betrag“? Entscheidung: Satz in der EP-Spalte (nur wenn die Position
  keinen EP hat), darunter eine Zeile „Zuschlag auf …“ (gekennzeichnete Positionen, alle Positionen der Gliederung `<OZ>`, Position(en)
  `<OZ>` mit Teilmenge), Betrag in der GP-Spalte aus dem `Summenstand`. **Der Betrag der Basis wird nicht gedruckt:** Der `Summenstand`
  trägt ihn nicht (`Positionssumme` hat nur `gesamtpreis`; die Fixture `zuschlag` hat `basis` nur in den Sollwerten). Ihn aus dem
  Betrag und dem Satz zurückzurechnen wäre Rechnen im Druck (A2). Gemeldet unten.
- **D-58.4** Frage: Wann stehen Bedarfs- und Wahlsumme? Entscheidung: Schlussblock getrennt unter Brutto, nur wenn das LV Bedarfspositionen
  ohne Gesamtbetrag bzw. Wahlpositionen hat und der Kern die Summe berechnet hat (die Felder sind im Vertrag optional); je Titel eine
  Zeile „nicht in der Summe enthalten“, wenn der Betrag ungleich null ist. Grund: Ein LV ohne solche Positionen zeigt sonst zwei Nullzeilen.
- **D-58.5** Frage: Wie erscheinen Textergänzung und Bild? Entscheidung: Textergänzung als unterstrichene Lücke `[______]`, wenn sie leer
  ist oder `leer: true` trägt (die Punkte der X83-Datei sind dann Platzhalter), sonst als `[Wert]`; ein Bild als Marke `[Abbildung]`
  (kein stilles Verschwinden, Q5). Bilder zu drucken ist nicht Teil von O1.
- **D-58.6** Frage: Kursivschrift? Entscheidung: Die Kursivschnitte Noto Sans 400/700 italic (gleiche Quelle, gleiche Lizenz wie die
  vorhandenen Schnitte, `@fontsource/noto-sans` 5.3.0) liegen unter `schriften/`; `Schriften.kursiv?`/`fettKursiv?` sind optional (sonst
  wird aufrecht gesetzt). **Die App (Ticket 66) soll alle vier laden.** `reuse` deckt `*.woff` bereits ab.
- **D-58.7** Frage: Deterministische Bytes? Entscheidung: `creationDate`/`modDate` aus der Eingabe `datum` (`JJJJ-MM-TT`, 00:00 UTC), sonst
  1970-01-01; pdfkit leitet die Datei-ID daraus ab. Test: zwei Läufe sind byte-gleich, anderes Datum ergibt andere Bytes.
- **D-58.8** Frage: Deckblatt als eigene Seite? Entscheidung: nein, ein Kopfblock oben auf Seite 1 (LV-Name, Projekt, Bauherr, Auftraggeber,
  Vergabeinformationen); der laufende Seitenkopf zeigt den LV-Namen ab Seite 2. Grund: Ein Blatt nur für den Kopf kostet bei kleinen LVs
  eine Seite; ein Deckblatt-Layout ist O3 (Druckprofile).
- **D-58.9** Frage: Testhilfen bei laufendem Ticket 51? Entscheidung: `src/testhilfen.ts` bleibt unangetastet; neue Hilfen in `src/testhilfe/bau.ts`
  (u. a. ein Lader für die Fixture `zuschlag`, die `testhilfen.ts` noch nicht kennt). Nach Ticket 51 kann der Lader entfallen, wenn
  `testhilfen.ts` die GAEB-Form liest. Die Tests nehmen Erwartungswerte aus den Sollwerten der Fixture; nur Bedarfs- und Wahlsumme
  stammen aus dem `Summenstand` des Kerns, weil die Sollwerte sie nicht tragen.
- **D-58.10** Frage: Leistungsbudget? Entscheidung: CPU-Zeit statt Wanduhr (siehe oben), damit der Test auf einer belasteten Maschine
  nicht schwankt.

**Naht für Ticket 61 (Excel).** `Ausgabemodell` trägt alles formatiert (Zeilen, Kopf, Summen) und die Variante; `bloeckeAlsText` macht aus dem
Langtext Klartext. Wer rohe Werte statt de-DE-Strings braucht (Excel-Zahlenzellen), liest sie aus dem `LvZustand`, nicht aus dem Modell;
das Modell hat sie absichtlich nur als Text.

**Lücken (nicht selbst gerechnet).**

1. Zuschlagsbasis (Betrag der Bezugssumme) fehlt im `Summenstand`; der Druck zeigt Satz, Bezug und Betrag. Ein Feld `Positionssumme.zuschlagsbasis`
   (oder gleichwertig) müsste `vertrag` und `kern` ergänzen (eigenes Ticket, P9).
2. `LvZustand` trägt weder Projektname noch Bauherr (nur `projektId`); die App muss `projekt` übergeben (Ticket 66).
3. Bedarfs-/Wahlsummen je Titel sind im Vertrag optional; der Druck zeigt sie nur, wenn der Kern sie berechnet hat.

**Nicht geprüft.** Aussehen über die Seite 1 von `typisch` hinaus (mit und ohne Preise als Bild angesehen, nicht committet); Tabellen mit
sehr vielen Spalten oder tiefer Verschachtelung; Bilder im Langtext; Firefox/Safari; Worker.

