# NOVA AVA research with REA: plan for the next session

Status: approved 2026-11-09, ready to execute. Start with Part A. Nothing built yet.

## Goal

Learn how NOVA AVA works (features, data model, API, client-side logic) so we can design our
own Ausschreibungssoftware from it. We use REA (https://github.com/morluto/rea), an MCP
reverse-engineering toolkit, against your NOVA AVA web trial.

## Decisions from the scoping interview (2026-11-09)

| Topic | Decision |
|---|---|
| Purpose | Learn how it works, to inform our own design. Not bug-hunting, not an integration. |
| Access | Personal trial or demo tenant, demo data only |
| Areas | BIM integration, LV and positions, GAEB import/export, Vergabe and Preisspiegel, Kosten and Abrechnung |
| Depth | Map all five areas. Deep dives on **LV** (this phase) and **BIM** (next phase). |
| Tenant actions | Create and edit throwaway test data. Existing demo data stays untouched. |
| Node | 24.x ≥ 24.22.1, installed user-local via nvm |
| Browser | Google Chrome (.deb), dedicated profile, remote debugging on 127.0.0.1 only |
| REA wiring | MCP server for Claude Code via `npx rea-agents@latest setup` |
| Who drives the UI | Claude, via the Claude in Chrome extension in the debug profile. You log in yourself. |
| Output | Research report in `docs/research/nova-ava/`, **git-ignored** because the repo is public |
| Boundaries | Passive observation of your own session only. Findings in our own words. No NOVA code, UI assets or licensed texts (such as STLB-Bau Langtexte) in the repo. No security probing or load on NOVA's servers. |

## Scope: what the next session WILL do, what CAN come later, what WON'T happen

| | Item |
|---|---|
| **WILL** | Tooling running and verified (Node, REA MCP, Chrome debug profile, Claude in Chrome) |
| **WILL** | Feature and API map for all five areas: screens and workflows, endpoint table (method, path pattern, payload shape), entities, notable client logic, open questions |
| **WILL** | LV deep dive: hierarchy (Projekt → LV → Lose/Titel → Position), OZ mask and renumbering, position types (Normal-, Bedarfs-, Wahl-, Zulage-, Stundenlohnposition), Kurz-/Langtext, Einheit, Menge, EP/GP, rounding and totals, validation rules, CRUD request flows. Uses one throwaway test LV that covers every position type. |
| **WILL** | `GLOSSARY.md` seeded with general AVA domain terms, defined in our own words |
| CAN (next phase) | BIM deep dive: IFC viewer stack, model-based quantity takeoff, linking model elements to positions |
| CAN (later) | GAEB deep dive with our own X81/X83/X84/X86 test files; Vergabe/Preisspiegel and Kosten (DIN 276)/Abrechnung (Aufmaß) deep dives; ADRs for our own design |
| WON'T | Copy NOVA code, assets or licensed texts. Do security testing, fuzzing or load testing. Touch existing demo data. Commit captures or the report. Have Claude type passwords. Build an REA AgentEnv mock. |

## Approach (session flow)

**Part A: setup. It ends with a Claude Code restart.**

1. Repo hygiene: add `.gitignore` with `docs/research/nova-ava/` and create the report skeleton.
2. Install nvm, then Node 24 LTS (≥ 24.22.1). Fetching nvm's install script from github.com/nvm-sh needs your OK.
3. Run `npx rea-agents@latest setup` from a directory outside the repo and pick Claude Code. Review the proposed config changes (REA backs them up) and approve.
4. Install Google Chrome: you run the `sudo` steps (Google apt repo plus `google-chrome-stable`).
5. Restart Claude Code / start a fresh session so the REA MCP tools load.

**Part B: capture and analysis, in the fresh session**

6. Launch the debug browser:
   `google-chrome --user-data-dir=$HOME/.config/nova-ava-chrome --remote-debugging-port=9222 --no-first-run`
   (A non-default profile is required anyway, because Chrome refuses remote debugging on the default profile.)
   Then install and connect the Claude extension in that profile, and log into the NOVA AVA trial yourself.
7. Map pass, one area at a time:
   1. Write a short click-path.
   2. Arm REA `observe_web_session`.
   3. Drive the click-path via Claude in Chrome.
   4. Run `inspect_web_page` on the key screens.
   5. Run `export_web_scripts` and `analyze_web_bundle` to get route and endpoint candidates.

   Write findings into `map-<area>.md`, citing REA evidence IDs.
8. LV deep dive: build the test LV step by step, recording each mutation. Derive the data model and request flows. Check calculations by re-entering edge-case values (rounding, zero quantities, Zulage, Bedarf excluded from totals).
9. Write up: report index, glossary, OKF update.

## Files to touch

| Path | Committed? | Content |
|---|---|---|
| `.gitignore` | yes | `docs/research/nova-ava/` |
| `docs/research/nova-ava/README.md` | no (ignored) | Report index, method, limitations |
| `docs/research/nova-ava/map-{bim,lv,gaeb,vergabe,kosten}.md` | no | Per-area map |
| `docs/research/nova-ava/lv-deep-dive.md` | no | LV data model, flows, calculations |
| `docs/research/nova-ava/captures/` | no | REA evidence bundles, screenshots, exported scripts |
| `GLOSSARY.md` | yes | General AVA terms only, nothing NOVA-specific |
| `okf/tooling/rea.md`, `okf/research/nova-ava.md`, `okf/index.md`, `okf/project/overview.md` | yes | Tooling state and research status (no NOVA internals) |
| Outside the repo | n/a | `~/.nvm`, Chrome, `~/.config/nova-ava-chrome`, Claude Code MCP config (written by `rea setup`) |

## Verification

- `node --version` reports 24.x ≥ 24.22.1, and REA's MCP tools show up in the fresh session.
- `ss -ltnp | grep 9222` shows the port bound to 127.0.0.1 only.
- REA's `list_browser_targets` finds the NOVA tab, and Claude in Chrome lists the debug browser.
- `git check-ignore -v docs/research/nova-ava/README.md` confirms the report is ignored, and `git status` shows no captures.
- Each of the five map files has at least one recorded observation, an endpoint table and open questions.
- Every claim in the LV deep dive cites an evidence ID or capture file. At least one calculation rule is checked against re-entered values.

## Risks and unknowns

- **Claude in Chrome on Linux Chrome** is unverified here (no browser is connected yet). Fallback: Claude writes the click-paths and you perform them while REA records.
- **REA MCP needs a restart.** That's why setup is Part A and capture is Part B.
- **Trial expiry and session timeouts** on NOVA's side. Check the trial's end date before Part B.
- **Version requirement.** REA's Node minimum (≥ 24.22.1) must be available via nvm; check at install time.
- **BIM is likely WebGL/WASM.** The static analysis it needs (WABT, a deeper bundle analysis) is deferred to the BIM phase.

## Before the next session, please have ready

- The NOVA AVA trial login URL and the trial's end date
- Time to run the `sudo` Chrome install yourself
