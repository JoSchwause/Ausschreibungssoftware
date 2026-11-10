---
name: implement-welle
description: "Demo mode: run exactly one wave of the AVA plan autonomously with an Opus orchestrator, Sonnet/Opus implementers and a Fable advisor, then stop."
argument-hint: "[wave number, default: next unfinished wave]"
disable-model-invocation: true
model: opus
---

Run **one wave** of `.scratch/ava-oss/plan.md` §3 end to end, then stop. Argument: the wave number. Without one, take the lowest wave not marked `done` in `.scratch/ava-oss/welle-status.md` (create the file if missing).

This is **demo mode**. The goal is a working prototype. The human is not available for decisions and may not know the domain: **the agents decide.** This replaces `implement-spec` for this project. Everything written below overrides P5 (no guessing on open G-questions) and the human-review gates of P7 and ticket 02 for the duration of the run.

You are the **orchestrator** and run on Opus. If the session is not on Opus, say so and stop. You do no implementation yourself except trivial glue (a conflict, a one-line fix). Give the wave your best.

## Binding sources (read first, in this order)

1. `docs/regeln.md`, `AGENTS.md`, `GLOSSARY.md`, `docs/adr/`
2. `.scratch/ava-oss/grilling.md`: every question marked *entschieden* is settled. **Never override a settled decision, an ADR or a rule.** Demo mode only lets you decide what is genuinely open.
3. `.scratch/ava-oss/plan.md` §2–§4 and the wave's tickets in `.scratch/ava-oss/issues/` (index: `issues/README.md`)

Implementer agents read the tickets, never `okf/research/` (C3).

## Decision ladder

When a ticket, rule or situation leaves a choice open, resolve it in this order and stop at the first rung that answers:

1. **The sources above say it.** Follow them. No log entry.
2. **You can decide it.** It is reversible, local to one package, or covered by a clear default. Decide, and log it.
3. **You cannot decide it, or a wrong call would be expensive** (changes `vertrag`, a rounding or money rule, GAEB semantics, the license, an ADR, anything several packages depend on). Ask the **advisor**.

Never set a ticket to `needs-info` and wait. A blocked ticket stalls the whole wave: decide or ask.

### The advisor

A fresh Agent with `model: "fable"`, read-only, one question per call. Brief it with the question (≤ 5 lines), 2–4 options with your lean, and **pointers** to the ticket and rule files (no pasted content). It answers with the decision, a 2-line reason and the risk if wrong. Use it at most **6 times per wave**; batch related questions into one call. Typical triggers: open G-questions that a ticket hangs on (G-26 and similar), ambiguous rounding of negative values (ticket 04), `vertrag` shape disputes between implementers and the wave 0 review of `vertrag`.

### Decision log

Append every rung-2 and rung-3 decision to `.scratch/ava-oss/entscheidungen-auto.md`:

```
## D-<nn> <title>
Welle <n> · Ticket <nn> · decided by: orchestrator | advisor
Question: …  Decision: …  Reason: …  Reversible: yes/no  Touches: <files/packages>
```

The log is what the human reads later to accept or reverse. Keep entries short. Where a decision answers an open G-question, add a line `Annahme für Demo, Mensch bestätigt später` to `grilling.md` under that question; do not mark it *entschieden*.

## Model routing

Each implementer gets a fresh context, its own worktree (`isolation: "worktree"`) and branch, and starts from the integration branch.

| Work | Model |
|---|---|
| Scaffolding, CI config, tokens/UI shell, importing external test files, merges, cleanup, doc and OKF updates, ticket bookkeeping | `sonnet` |
| Domain logic, money and rounding, `vertrag`, GAEB parser/writer, storage, grid, fixtures with derived golden values, every code review | `opus` |
| Decisions you cannot make | `fable` (advisor only) |

Default per ticket for waves 0 and 1: 03 sonnet · 19 opus · 02 opus · 23 sonnet · 04–07 opus · 10 opus · 20 sonnet · 21 opus · 22 opus. Ticket 18 (interview prototype) is not part of any wave. If a sonnet implementer fails twice on the same ticket, rerun it once on opus. Don't use a larger model than the work needs.

## Steps

1. **Orient.** Read the binding sources. Determine the wave's tickets and their `Blocked by` graph. Tickets missing for this wave (e.g. wave 2 before they are cut): write them yourself from `plan.md` §2 and the finished waves, mark them `ready-for-agent`, log the choice.
2. **Integration branch** `integration/welle-<n>` off `main`. Local only: **no push, no PR, no remote operation.**
3. **Run the task graph.** Implementers start the moment their blockers are merged. At most **8 agents at the same time** (P4), one writer per package (P2). Each implementer:
   - claims its ticket (`Status: claimed`), confirms its worktree is based on the integration branch;
   - builds it with the `tdd` skill, runs typecheck and single test files while working, the full suite once at the end (`pnpm lint && pnpm test`, plus `pnpm e2e` where the ticket asks for it);
   - commits small and often, writes decisions it made to `## Comments` in its ticket, merges the integration tip into its branch, then reports done in ≤ 10 lines with commit pointers.
   - never touches another package or `vertrag` (P2). Needing that is a rung-3 question for you.
4. **Merge.** A `sonnet` merger agent merges each finished branch into the integration branch, runs the full suite, and returns failures to you. Resolve a failure by a targeted opus implementer, not by merging red.
5. **Wave 0 only: gate.** Ticket 02 normally needs a human. In demo mode run an `opus` reviewer, then ask the advisor once whether `vertrag` is stable enough for wave 1. The verdict goes in the log. Fix what they find before merging.
6. **Wave review.** When all tickets are merged, call the Skill tool with `code-review` on the integration branch (opus). Fix all findings in one fresh opus implementer.
7. **Verify against `plan.md` §4.** Run the wave's gate or milestone check. Where it is not yet reachable, state exactly what is missing.
8. **Close out.** Resolve tickets (`## Answer`, `Status: resolved`; failed ones `Status: ready-for-agent` with a `## Comments` note), clean up worktrees, update `.scratch/ava-oss/welle-status.md`, update the OKF concept files and `timestamp`s that the wave changed (global OKF rule), and write `.scratch/ava-oss/welle-<n>-bericht.md`: what runs now, what was decided (pointer to the log, count of advisor calls), what failed or is thin, how to try it (exact commands), and the next wave's entry conditions.
9. **Stop.** Do not start the next wave, do not push, do not open a PR. End with a short summary and point to the report.

## Safety rails

- Usage limit: 16 parallel agents once burned the 5-hour cap in 30 minutes. Stay at ≤ 8. Agents write results and commit early, not at the end.
- Circuit breaker: after 3 failures in a row on different tickets, stop spawning, write the report with what you have, and end.
- Never delete the user's files outside the worktrees, never touch `okf/research/`, never commit `.env`, never weaken a CI check to get green.
- Report faithfully. A red test or an unmet gate is stated as such in the report, never hidden by a decision.
