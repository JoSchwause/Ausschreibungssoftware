# Mitarbeit

Das Repository steht unter AGPL-3.0-or-later (ADR 0008). Vor jeder Arbeit `docs/regeln.md` lesen.
Beiträge von außen werden erst nach dem MVP angenommen.

## Developer Certificate of Origin (DCO)

Jeder Commit trägt eine `Signed-off-by`-Zeile. Damit bestätigst du das
[Developer Certificate of Origin 1.1](https://developercertificate.org/): Du hast das Recht, den Beitrag unter
der Projektlizenz einzureichen. Commit mit `git commit -s`. Die CI prüft bei jedem Pull Request, ob alle Commits
signiert sind (`node tools/check-dco.mjs <Bereich>`).

## Lizenzen (REUSE)

Jede Datei ist durch `REUSE.toml` als AGPL-3.0-or-later gekennzeichnet; `reuse lint` muss grün sein. Dateien
Dritter bekommen einen eigenen Eintrag im dafür markierten Abschnitt von `REUSE.toml` und ihren Lizenztext unter
`LICENSES/` (Regel C4). Jede neue Abhängigkeit braucht eine AGPL-kompatible Lizenz; `pnpm lint` prüft das (C5).

## Clean Room

Kein fremder Code, keine fremden UI-Assets, keine lizenzierten Texte im Repository. `docs/research/nova-ava/`
und `okf/research/` bleiben git-ignoriert; die CI schlägt fehl, wenn dort etwas versioniert ist (C2).

## Vor dem Push

`pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` müssen grün sein.
