## Regeln und Plan

Vor jeder Arbeit lesen: `docs/regeln.md` (verbindliche Entwurfs- und Umsetzungsregeln). Arbeitsplan mit Strängen und Wellen: `.scratch/ava-oss/plan.md`. Entscheidungen: `.scratch/ava-oss/grilling.md` (Stufe 5: Runde vor Welle 7) und, für den Zwischenstand von Welle 2, `.scratch/ava-oss/next-decisions-welle-2.md`. Umfang der Welle 7 mit Befunden, Kürzungsreihenfolge und Tor: `.scratch/ava-oss/umfang-welle-7.md` (verbindlich für den Schnitt). Ein Ticket, das an einer offenen G-Frage hängt, wird nicht geraten, sondern auf `needs-info` gesetzt.

## Demo-Modus

`/implement-welle <n>` setzt genau eine Welle autonom um (Opus-Orchestrator, Sonnet/Opus-Implementierer, Fable als Berater). Dort entscheiden die Agenten offene Fragen selbst und protokollieren sie in `.scratch/ava-oss/entscheidungen-auto.md`; das setzt P5 und die Mensch-Prüfung aus P7 für diesen Lauf außer Kraft. Entschiedene G-Fragen, ADRs und Regeln bleiben bindend.

## Agent skills

### Issue tracker

Issues und Specs liegen als lokale Markdown-Dateien unter `.scratch/` (kein Remote). See `docs/agents/issue-tracker.md`.

### Triage labels

Standard-Vokabular: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context (ein `GLOSSARY.md` + `docs/adr/` im Root). See `docs/agents/domain.md`.
