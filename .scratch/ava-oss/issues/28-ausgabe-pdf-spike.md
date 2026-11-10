# 28: O1-Spike: PDF-Druck des LV

Status: ready-for-agent
Type: research
Welle: 2 · Strang: O · Paket: `packages/ausgabe` (neu)
Blocked by: -
Regeln: A1, A2, A3, C1, C5, N4, Q4
Herkunft: `plan.md` §3 (Welle 2: „O1 (Spike)“)

## Frage, die der Spike beantwortet

Womit erzeugt Tethys AVA das PDF eines LV: **im Browser, ohne Server** (A1), mit einer Abhängigkeit, deren Lizenz
zu AGPL-3.0-or-later passt (C5), mit eingebetteter freier Schrift (C1), deutsch formatierten Zahlen (N4), und
schnell genug für 5.000 Positionen?

## What to build

Ein neues Paket `packages/ausgabe` (Abhängigkeit nur auf `vertrag` und `dezimal`, A3) mit **einer** Funktion, die
aus einem `LvZustand` ein PDF als Bytes erzeugt: Kopf (LV-Name), je Zeile OZ, Kurztext, Menge, Einheit, EP, GP,
Titelsummen, am Ende Netto, Nachlass, MwSt, Brutto; Seitenzahl „Seite x von y“; Langtext als einfacher Text.
Mindestens **zwei** Wege werden verglichen (z. B. eine PDF-Bibliothek, die im Browser zeichnet, gegen den
Druckweg des Browsers mit Druck-CSS); die Kandidaten wählt der Agent nach geöffneten Quellen (Lizenztext,
Dokumentation), nicht aus dem Gedächtnis. Der bessere Weg bleibt als Code, der andere als Messwert im Ticket.

Der Spike rechnet nichts selbst: Summen kommen aus dem `LvZustand`.

## Acceptance criteria

- [ ] `fixtures/winzig` und `fixtures/typisch` ergeben je ein PDF; ein Test liest den Text des PDF zurück und findet die Sollsummen in de-DE-Schreibweise
- [ ] Umlaute, `m²`, `€` stehen richtig im PDF; die Schrift ist eingebettet und frei lizenziert (Lizenz und Herkunft in `REUSE.toml`)
- [ ] Gemessen und im Ticket festgehalten: Dauer und Dateigröße für `gross` (5.000 Positionen), mit Umgebung; im Browser (Chromium), nicht nur unter Node
- [ ] Vergleichstabelle der Wege: Lizenz, Bündelgröße, Dauer, Seitenumbruch (Titel nicht vom ersten Kind trennen), Kopf-/Fußzeile, Barrierefreiheit (Tags), was nicht geht
- [ ] Empfehlung mit Begründung als Vorschlag für eine ADR (Text im Ticket; die ADR selbst schreibt und prüft der Nutzer-Weg, nicht dieser Spike)
- [ ] `pnpm lint` (einschließlich Lizenzprüfung und Paketgrenzen), `pnpm typecheck`, `pnpm test`, `reuse lint` grün

Ticket 25 schreibt `fixtures/gross.json` zur selben Zeit in Dokumentreihenfolge um. Für die Messung ist jede der
beiden Reihenfolgen recht; das Ticket nennt den Stand (Commit), an dem gemessen wurde.

## Nicht-Ziele

Druckprofile (O3), Excel (O2), formatierter Langtext (nach Ticket 26), Anbindung an `apps/web`, Layout-Feinschliff.

## Comments
