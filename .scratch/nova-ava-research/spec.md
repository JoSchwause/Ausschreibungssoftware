# NOVA AVA research with REA: plan for the next session

Status: completed 2026-11-09 (Part A setup + Part B live capture of all 5 areas and LV deep dive completed via automated CDP + REA 6.8.0).

## Goal

Learn how NOVA AVA works (features, data model, API, client-side logic) so we can design our
own Ausschreibungssoftware from it. We use REA (https://github.com/morluto/rea), an MCP and CLI
reverse-engineering toolkit (`rea-agents@6.8.0`), against your NOVA AVA web trial.

## Decisions from the scoping interview (2026-11-09)

| Topic | Decision |
|---|---|
| Purpose | Learn how it works, to inform our own design. Not bug-hunting, not an integration. |
| Access | Personal trial or demo tenant, demo data only |
| Areas | BIM integration, LV and positions, GAEB import/export, Vergabe and Preisspiegel, Kosten and Abrechnung |
| Depth | Map all five areas. Deep dives on **LV** (this phase) and **BIM** (next phase). |
| Tenant actions | Create and edit throwaway test data. Existing demo data stays untouched. |
| Node | 24.x ≥ 24.22.1, installed user-local via nvm (`v24.22.2` installed) |
| Browser | Google Chrome (`.deb`) or Playwright Chromium, dedicated profile, remote debugging on `127.0.0.1:9222` only |
| REA wiring | MCP server (`rea-agents@6.8.0`) + direct CLI `/home/jsk/.npm/_npx/da7caeae9db9c589/node_modules/.bin/rea` |
| Who drives the UI | Agent (via browser automation / CDP) or user click-paths while REA records. You log in yourself. |
| Output | Research report in `docs/research/nova-ava/`, **git-ignored** because the repo is public |
| Boundaries | Passive observation of your own session only. Findings in our own words. No NOVA code, UI assets or licensed texts (such as STLB-Bau Langtexte) in the repo. No security probing or load on NOVA's servers. |

## Scope: what the session WILL do, what CAN come later, what WON'T happen

| | Item |
|---|---|
| **WILL** | Tooling running and verified (Node, REA CLI/MCP, Chrome debug profile) |
| **WILL** | Feature and API map for all five areas: screens and workflows, endpoint table (method, path pattern, payload shape), entities, notable client logic, open questions |
| **WILL** | LV deep dive: hierarchy (Projekt → LV → Lose/Titel → Position), OZ mask and renumbering, position types (Normal-, Bedarfs-, Wahl-, Zulage-, Stundenlohnposition), Kurz-/Langtext, Einheit, Menge, EP/GP, rounding and totals, validation rules, CRUD request flows. Uses one throwaway test LV that covers every position type. |
| **WILL** | `GLOSSARY.md` seeded with general AVA domain terms, defined in our own words |
| CAN (next phase) | BIM deep dive: IFC viewer stack, model-based quantity takeoff, linking model elements to positions |
| CAN (later) | GAEB deep dive with our own X81/X83/X84/X86 test files; Vergabe/Preisspiegel and Kosten (DIN 276)/Abrechnung (Aufmaß) deep dives; ADRs for our own design |
| WON'T | Copy NOVA code, assets or licensed texts. Do security testing, fuzzing or load testing. Touch existing demo data. Commit captures or the report. Have agent type passwords. Build an REA AgentEnv mock. |

## Approach (session flow)

**Part A: setup**

1. [x] Repo hygiene: add `.gitignore` with `docs/research/nova-ava/` and create the report skeleton.
2. [x] Install nvm, then Node 24 LTS (`v24.22.2`).
3. [x] Install `rea-agents@6.8.0` (`/home/jsk/.npm/_npx/da7caeae9db9c589/node_modules/.bin/rea`) and skill (`~/.claude/skills/reverse-engineer-anything`).
4. [x] Install Google Chrome (`.deb`) or user-local Chromium, so we can launch a dedicated CDP browser on `127.0.0.1:9222`.
5. [x] Seed `GLOSSARY.md` and OKF documentation (`okf/tooling/rea.md`, `okf/research/nova-ava.md`).

**Part B: capture and analysis**

6. [x] Launch the debug browser:
   `google-chrome --user-data-dir=$HOME/.config/nova-ava-chrome --remote-debugging-port=9222 --remote-debugging-address=127.0.0.1 --no-first-run`
   Log into the NOVA AVA trial yourself in that browser window.
7. [x] Map pass, one area at a time:
   1. List targets with `rea list-browser-targets http://127.0.0.1:9222`.
   2. Write a short click-path.
   3. Arm REA `observe-web-session` (for passive capture with request initiator stacks) or `capture-browser-scenario` (connect mode).
   4. Run `inspect-web-page` (with `--include-json-body-shapes --include-websocket-shapes --include-storage-keys --include-accessibility-text`) on key screens.
   5. Run `export-web-scripts` and `analyze-web-bundle` (`--detail summary --evidence_output ...`) to get route and endpoint candidates.
   6. Write findings into `map-<area>.md`, citing REA evidence IDs.
8. [x] LV deep dive: build the test LV step by step, recording each mutation. Derive the data model and request flows. Check calculations by re-entering edge-case values (rounding, zero quantities, Zulage, Bedarf excluded from totals).
9. [x] Write up: report index, glossary updates, OKF update.

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
