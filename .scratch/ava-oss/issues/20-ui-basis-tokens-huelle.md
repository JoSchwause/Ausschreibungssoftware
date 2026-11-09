# 20: `ui-basis`: Design-Tokens, App-Hülle, Dialog- und Formularbausteine (U1)

Status: ready-for-agent
Type: task
Welle: 1 · Strang: U · Paket: `packages/ui-basis`, Hülle in `apps/web/src/ui/`
Blocked by: 03
Regeln: U1, U3, U4, U5, L1, L3, C1, G-30, G-31, G-34

## What to build

Eigenes Erscheinungsbild über **Design-Tokens** (Farbe, Abstand, Typo, Radius, Schatten) mit hellem und dunklem
Modus (G-31, U4). Komponentenbasis: **Radix-Primitive** (MIT) mit eigenem Styling. Dichtes, tabellenartiges Werkzeug,
**nur Desktop ab 1280 px** (G-30). App-Hülle: Kopfzeile, linke Navigation (Projekt, LV, Vergabe), Arbeitsfläche, Statuszeile.
Bausteine: Button, Eingabefeld (de-DE-Zahl), Auswahl, Dialog, Tabs, Tooltip, Toast, Tastaturkürzel-Hinweis.
Tastatur und Kontrast jetzt (G-34, WCAG-AA für Text); Katalogtexte als Dateien, keine Übersetzung in v1.
Kein Zugriff auf Fachpakete: `ui-basis` kennt keine Domäne (A3).

## Acceptance criteria

- [ ] Tokens in einer Datei, beide Modi umschaltbar; Kontrastwerte (Text/Fläche) als Test mit mindestens 4,5 : 1
- [ ] Alle Bausteine per Tastatur bedienbar (Tab, Pfeile, Escape); Playwright-Test für Dialog und Auswahl
- [ ] Eine Storybook-ähnliche Katalogseite (`/katalog`, nur im Dev-Build) zeigt jeden Baustein in beiden Modi
- [ ] Bei Fensterbreite unter 1280 px erscheint ein Hinweis, die Hülle bricht nicht (G-30)
- [ ] Keine Ähnlichkeit mit Layout, Icons oder Namen der Referenzsoftware (U4, L3); eigene Icons oder lizenzfreie Sammlung mit Lizenzeintrag
- [ ] Texte deutsch (L1); Katalogtexte in einer eigenen Datei
- [ ] Eine Validierungsmeldung blockiert die Eingabe nie (U5): Beispiel im Katalog

## Nicht-Ziele

Grid (Ticket 21), Fachansichten, Rich-Text/TipTap (U4/Strang U), Mobile und Tablet.
