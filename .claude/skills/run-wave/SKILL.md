---
name: run-wave
description: Orchestrate one wave of the work plan ticket by ticket with Sonnet sub-agents, review and merge each result, and open the decision round for the next wave. Use when the user asks to "run wave N", "start the next wave", or to work through a set of ready tickets with sub-agents.
---

# Run a wave

You are the orchestrator. Sub-agents write the code; you decide the order, write the briefs, review, merge, and report. You do not implement tickets yourself, and you do not let an agent's report stand in for your own check.

## 1. Read before you plan

`docs/regeln.md`, `.scratch/ava-oss/plan.md`, `.scratch/ava-oss/grilling.md`, the latest `next-decisions.md`, `.scratch/ava-oss/issues/README.md` and every ticket of the wave. Skim the contract (`packages/vertrag/src/`) so you can judge what agents hand back.

A ticket that hangs on an open decision is not started; it is `needs-info` (rule P5). If the plan names a human gate (for example review of `vertrag`), say so before you pass it and record that you passed it.

## 2. Order

Build the order from each ticket's `Blocked by:` line and from the packages they write:

- One writer per package at any time (P2). Tickets that share a package run one after another, each as a fresh agent on top of the merged predecessor.
- Everything else runs in parallel, at most 8 agents (P4).
- Start a ticket the moment its blockers are merged; do not wait for the whole stage.

## 3. Brief each agent

One ticket per agent, `model: sonnet`, `isolation: worktree`, in the background. Use Opus only to redo a ticket a Sonnet agent failed. The agent knows nothing but the brief, so each brief carries:

- **Base:** the commit it must build on, and the command to fast-forward if its worktree is behind (worktrees have started from an old commit every time).
- **Reading list** in order: rules, its ticket, the contract files it consumes, the tickets that consume its output, the tooling it must respect.
- **Write scope:** the exact paths it may touch. Everything else is frozen; gaps in a frozen package are recorded in the ticket and reported, never patched and never worked around silently.
- **Decisions that are not the agent's:** name each undecided domain rule you can foresee. Tell it to implement the restrictive, easily reversible reading in one named place, mark it "vorläufige Annahme, Entscheidung offen", and list it in the ticket. Without such a reading: `needs-info`.
- **Sources:** a rule counts as documented only if the agent opened the source. No citations from memory.
- **Measurements:** report the measured value and the environment; never loosen a measurement to pass.
- **Environment facts** it cannot guess: preinstalled browser path, network access, what was not obtainable.
- **Process:** test first, small signed-off commits with the attribution trailers, no push, no PR, run `pnpm lint`, `pnpm typecheck`, `pnpm test` (and `pnpm e2e`, `reuse lint` where relevant), tick only verified boxes, append `## Comments` to the ticket.
- **Report format:** branch, commits, exported API, command result lines, criteria verified versus not, assumptions, contract gaps, deviations.

Rules C3 and L3 go into every brief: never read `okf/research/`, never use identifiers of the reference software.

## 4. Review and merge each result

When an agent reports back:

1. Read what matters yourself: the public surface, the rule modules, anything the report calls an assumption. For UI work, look at the screenshots.
2. Spot-check claims you can check cheaply (a checksum, a golden value, a licence text).
3. Merge its branch into the wave branch with `--no-ff`. Resolve lockfile conflicts with `pnpm install`; keep your own version of shared root files.
4. Rerun the full checks on the merged tree. Only then is the ticket done.
5. Push, and start whatever this merge unblocked.

If an agent asks you to do something it was denied permission for, do not do it; put it in front of the user.

Integration fixes that belong to no ticket (wiring a new test into the root scripts, lint globals) are yours; commit them separately and say so.

## 5. Close the wave

- Set each ticket's `Status:` (`resolved`, or `needs-info` with the reason).
- Write `.scratch/ava-oss/next-decisions.md`: what is merged, measured values, then one entry per open decision with finding, options, recommendation, what it blocks, and an empty `**Antwort:**`. Order them by what blocks the next wave. End with the proposed ticket cut for the next wave and a list of what was not verified.
- Add a line to `plan.md` §5 and to `okf/index.md` (P6).
- Check that CI is green on the pushed branch.

## 6. Report

Lead with what is done and what is not. Name every gate you passed without the user, every provisional rule now in the code, and everything unverified. Close with the two or three decisions that unblock the most.
