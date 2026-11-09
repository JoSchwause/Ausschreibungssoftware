# 20: `ui-basis`: Design-Tokens, App-Hülle, Dialog- und Formularbausteine (U1)

Status: done (zur Prüfung durch den Orchestrator)
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

- [x] Tokens in einer Datei, beide Modi umschaltbar; Kontrastwerte (Text/Fläche) als Test mit mindestens 4,5 : 1
- [x] Alle Bausteine per Tastatur bedienbar (Tab, Pfeile, Escape); Playwright-Test für Dialog und Auswahl
- [x] Eine Storybook-ähnliche Katalogseite (`/katalog`, nur im Dev-Build) zeigt jeden Baustein in beiden Modi
- [x] Bei Fensterbreite unter 1280 px erscheint ein Hinweis, die Hülle bricht nicht (G-30)
- [x] Keine Ähnlichkeit mit Layout, Icons oder Namen der Referenzsoftware (U4, L3); eigene Icons oder lizenzfreie Sammlung mit Lizenzeintrag
- [x] Texte deutsch (L1); Katalogtexte in einer eigenen Datei
- [x] Eine Validierungsmeldung blockiert die Eingabe nie (U5): Beispiel im Katalog

## Nicht-Ziele

Grid (Ticket 21), Fachansichten, Rich-Text/TipTap (U4/Strang U), Mobile und Tablet.


## Comments

**Umsetzung (Branch `worktree-agent-a4db407efbea67aa2`)**

- `packages/ui-basis`: `tokens.css` (einzige Token-Datei, Hell = Standard, `data-theme="dark"` am `<html>` oder an einem Teilbaum), `bausteine.css` (Styling, nur Token-Variablen), Bausteine `Button`, `Tastenkuerzel`, `Eingabefeld`, `Zahlfeld`, `Auswahl`, `Dialog`, `Tabs`, `Tooltip`, `ToastAnbieter`/`useToast`, `Icon` (eigene Linien-Icons, keine Fremdsammlung), `texte.ts` (Vorgabetexte).
- `apps/web/src/ui/`: App-Hülle (Wortmarke und Navigation links, Kopfzeile, Arbeitsfläche, Statuszeile), Routing über die History-API, Moduswechsel (localStorage nur als Komfort), Breitenhinweis unter 1280 px, `texte.ts`. Navigationseinträge Projekt, LV, Vergabe sind Platzhalter ohne Fachlogik.
- `apps/web/src/katalog/`: `/katalog` mit allen Bausteinen in Hell und Dunkel nebeneinander (je Rahmen eigenes `data-theme`), eigene Textdatei `texte.ts`.
- Das de-DE-Zahlfeld verarbeitet nur Text: es meldet Rohtext und ein Prüfergebnis über einen steckbaren Prüfer (`pruefe`). Der Standardprüfer `pruefeZahlformatDeDE` prüft nur die Form (Tausenderpunkt, Dezimalkomma), wandelt nichts um und rechnet nichts. Der echte Parser aus `packages/dezimal` wird später in `apps/web` eingehängt (N1, N4).

**Verifiziert (ausgeführt)**

- `pnpm lint` (ESLint inkl. N1, Prettier, Paketgrenzen, Lizenzen, Clean-Room): grün.
- `pnpm typecheck`: grün. `pnpm test`: 6 Dateien, 100 Tests grün (davon `tokens.test.ts`: Kontrast aus den Werten in `tokens.css` berechnet, jedes Text/Fläche-Paar in beiden Modi mindestens 4,5 : 1; Fokus und starker Rahmen mindestens 3 : 1; `zahlpruefung.test.ts`).
- `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm e2e`: 14 Tests grün, zweimal hintereinander. Dialog (Öffnen per Enter, Fokusfalle, Escape, Fokus kehrt zum Auslöser zurück), Auswahl (Enter, Pfeile, Enter, Escape, deaktivierte Option), Reiter (Pfeiltasten), Tooltip (Tastaturfokus, Escape), Meldung, Validierung blockiert nie (U5), Navigation per Tastatur, Hinweis unter 1280 px (und kein Überlauf bei 1100 px), Moduswechsel.
- `pnpm build`: grün; der normale Produktions-Build enthält weder die Katalogseite noch deren Texte noch deren CSS (geprüft per grep auf Katalog-Marken in `apps/web/dist`). Der E2E-Build setzt `VITE_KATALOG=1` (in `playwright.config.ts`).
- Sichtprüfung per Playwright-Screenshots (1440 px, Skalierung 1) in Hell und Dunkel für Hülle und Katalog, Dialog, Auswahl, Meldungen, 1100 px mit Hinweis; keine Überlagerungs- oder Lesbarkeitsfehler mehr offen.

**Abweichungen und Hinweise**

- Katalog nur im Dev-Build: im Dev-Server immer, im Produktions-Build nur mit `VITE_KATALOG=1`. Das E2E-Webserver-Kommando baut deshalb mit dieser Variable (`playwright.config.ts`); der getestete Build ist damit nicht der Produktions-Build, dessen Katalogfreiheit ist separat per grep geprüft, nicht per E2E.
- Überlagerungen (Dialog, Auswahlliste, Tooltip, Meldungen) hängen am `<body>` und folgen dem Modus der Kopfzeile, nicht dem Rahmen auf der Katalogseite, in dem sie geöffnet wurden. Die Inline-Bausteine zeigen beide Modi gleichzeitig; Überlagerungen lassen sich durch Umschalten in der Kopfzeile in beiden Modi ansehen.
- Radix Dialog kehrt ohne `Dialog.Trigger` nicht zum Auslöser zurück; `Dialog` merkt sich den Fokus deshalb selbst (`onOpenAutoFocus` / `onCloseAutoFocus`).
- Radix Tooltip öffnet bei rein programmatischem `focus()` ohne vorherige Tastaturbedienung nicht; der E2E-Test springt deshalb mit Tab und Umschalt+Tab an. Echte Tastaturbedienung ist davon nicht betroffen.
- Nicht geprüft: Screenreader-Verhalten (nur Rollen und Beschriftungen per Playwright), Browser außer Chromium, Kontrast von Überlagerungen und Hover-Zuständen über die Token-Paare hinaus, Tablet und Mobile (Nicht-Ziel).
- Der Katalogeintrag in der Navigation nutzt das Info-Icon; Kleinigkeit, ohne eigenes Icon.
- Keine Änderung an Root-Konfiguration; nur `pnpm-lock.yaml` durch pnpm.

**Neue Abhängigkeiten (alle über `node tools/check-licenses.mjs` geprüft)**

| Paket | Lizenz | Wo |
|---|---|---|
| `@radix-ui/react-dialog` | MIT | ui-basis |
| `@radix-ui/react-select` | MIT | ui-basis |
| `@radix-ui/react-tabs` | MIT | ui-basis |
| `@radix-ui/react-tooltip` | MIT | ui-basis |
| `@radix-ui/react-toast` | MIT | ui-basis |
| `react`, `react-dom`, `@types/react`, `@types/react-dom` | MIT | ui-basis (devDependencies, `react` und `react-dom` zusätzlich peerDependencies), bereits in apps/web |
| `@tethys/ui-basis` | AGPL-3.0-or-later | `workspace:*` in apps/web |

Transitive Radix-Pakete (u. a. `@floating-ui/*`, `aria-hidden`, `react-remove-scroll`) sind MIT.
