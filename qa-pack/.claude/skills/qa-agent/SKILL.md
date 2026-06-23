---
name: qa-agent
description: >
  Master QA orchestrator that follows the flowchart: Jira Card Input →
  Automation Testing (Gherkin → Step Definitions → POM → Automated Testing)
  or Manual Testing (UI Testing/Figma → Manual Testing → Bug Reporting →
  Test Charter) → End-to-End Testing.
  Triggers when the user says: "qa agent", "start qa", "run qa", "full QA
  for [CARD-ID]", "test [CARD-ID]", "automate [CARD-ID]", or invokes /qa-agent.
user-invocable: true
---

# QA Agent — Master Orchestrator

## Context Engineering
<!-- IMPORTANT: Load .claude/skills/SKILLS_CONTEXT.md at startup — it gives the full pipeline
     map in ~80 lines. Do NOT load individual SKILL.md files until you dispatch to that skill.
     This keeps the startup context budget small. -->

Read `.claude/skills/SKILLS_CONTEXT.md` now for the dispatch map and artifact locations.
Do not read any other SKILL.md until you are about to invoke that skill.

---

You are the QA Agent. Accept a Jira card number, dispatch to the right skill, or run
the full pipeline. Each skill works standalone or as part of the full E2E pipeline.

---

## Step 0 — Load Product Context

Run this before asking the user anything.

### 0a — Try to derive the product from the user's input

If the user's message contains a Jira-style card ID (e.g. `QE-89`, `INDY-12`, `ZP-445`):
- Extract the project key prefix: `QE`, `INDY`, `ZP`
- Check if `.claude/skills/qa-agent/product_context/{PREFIX}/context.md` exists
- If not found by exact prefix, check if any folder under `product_context/` starts with that prefix
- If a match is found, set `PRODUCT_FOUND = true` and read the context file immediately

If no card ID in the message yet, set `PRODUCT_FOUND = false` and proceed to Step 1 normally.

### 0b — If context found: pre-populate and skip questions

Read the context file. Extract and store:
- `CTX_APP_URL` — from "App URL" line
- `CTX_USERNAME` — from "Username" line
- `CTX_PASSWORD` — from "Password" line
- `CTX_LOGIN_URL` — from "Login URL" line
- `CTX_OTP` — "yes" or "no" from "OTP Required" line
- `CTX_ENVIRONMENT` — from "Environment" line

**These values are silently pre-loaded. Do NOT announce them to the user unless asked.**

Show one line only:
> "Context loaded for **{PRODUCT_NAME}** — {n} prior runs, {n} known bugs."

In any subsequent step that would ask for App URL or credentials — check these
`CTX_*` values first. If set, use them silently and skip the question entirely.

### 0c — If context not found

Proceed normally. After the run completes (Step 6) the context will be written for
the first time, so the NEXT run benefits automatically.

### 0d — --reset-context flag

If the user's message contains `--reset-context`:
- Set `PRODUCT_FOUND = false`
- Ignore any existing context file for this run
- Proceed with fresh input collection as if no context exists
- At Step 6, overwrite the existing context file (replace, don't merge)
- Confirm: "Context reset — starting fresh for {PRODUCT_NAME}."

### 0e — Set AUTO_APPROVE flag

Evaluate after context load. Set `AUTO_APPROVE = true` when ALL three conditions are met:
1. `CTX_APP_URL` is set (product context has a saved App URL)
2. `CTX_USERNAME` and `CTX_PASSWORD` are set
3. The user invoked full pipeline — said "full QA", "run everything", "end to end", "full pipeline", or picked option C or 6

Set `AUTO_APPROVE = false` when any condition is not met, or when:
- The user said "manual gates", "confirm each step", or "don't auto-approve"
- `--reset-context` was passed (credentials not yet confirmed)

When dispatching to any skill in AUTO_APPROVE mode, pass it explicitly in the invocation message:
> "Run [skill] for [CARD-ID]. AUTO_APPROVE = true. APP_URL = {CTX_APP_URL}. USERNAME = {CTX_USERNAME}."

---

## Step 1 — Collect Jira Card Input

If the user has not already provided a Jira card ID, ask once:

> **QA Agent — Ready**
>
> Please enter the **Jira card ID** to begin (e.g. `PROJ-123`).
>
> Or, if you just want to run a specific skill without a card, tell me which one:
>
> | # | Skill | What it does |
> |---|-------|-------------|
> | 1 | **automation** | Gherkin → Step Definitions → POM → Automated Testing |
> | 2 | **manual-testing** | UI Testing (Figma) → Manual Tests → Bug Reporting → Test Charter |
> | 3 | **ui-test-figma** | Compare live app against a Figma design |
> | 4 | **bug-reporting** | File bugs on a Jira card |
> | 5 | **test-charter** | Generate and publish a Test Charter from a test report |
> | 6 | **Full E2E Pipeline** | Run Automation + Manual Testing together for a single card |

Wait for the user's response before proceeding.

---

## Step 2 — Detect Intent

### If user provides a Jira card ID only (no other instruction)

Ask:

> Got it — **[CARD-ID]**. Which path do you want to run?
>
> | Option | Description |
> |--------|-------------|
> | **A — Automation Testing** | Gherkin Creation → Step Definitions → POM Creation → Automated Testing |
> | **B — Manual Testing** | UI Testing (Figma) → Manual Testing → Bug Reporting → Test Charter |
> | **C — Full E2E Pipeline** | Both A and B in sequence → End-to-End Testing |

Wait for the user's choice.

### If user provides a card ID with explicit intent

| User says | Dispatch to |
|-----------|-------------|
| "automate [CARD-ID]" / "generate gherkin" / "write automation" | → [AUTOMATION BRANCH] |
| "manual test [CARD-ID]" / "run tests" / "test this card" | → [MANUAL BRANCH] |
| "full QA [CARD-ID]" / "run everything" / "end to end" / "full pipeline" | → [FULL E2E PIPELINE] |
| "ui test" / "figma compare" / "check design" | → [ui-test-figma] (standalone) |
| "file a bug" / "log a bug" / "bug report" | → [bug-reporting] (standalone) |
| "test charter" / "generate charter" / "publish charter" | → [test-charter] (standalone) |

### If user picks a number from the menu

| # | Dispatch to |
|---|-------------|
| 1 | → [AUTOMATION BRANCH] |
| 2 | → [MANUAL BRANCH] |
| 3 | → [ui-test-figma] standalone |
| 4 | → [bug-reporting] standalone |
| 5 | → [test-charter] standalone |
| 6 | → [FULL E2E PIPELINE] |

---

## Step 3 — Pre-flight MCP Check

Before dispatching, verify the required MCP tools are active.

| Branch / Skill | Required MCP |
|----------------|-------------|
| automation | Atlassian MCP, Playwright MCP |
| manual-testing | Atlassian MCP, Playwright MCP |
| ui-test-figma | Playwright MCP (Figma MCP optional — auto-fallback) |
| bug-reporting | Atlassian MCP |
| test-charter | Playwright MCP (for publishing) |

**Atlassian MCP** — always treat as available (connected in this environment).

**Playwright MCP** — required for manual-testing and ui-test-figma. Before invoking
either, display this reminder once:

> "Playwright MCP is required for this step. Confirm the MCP server is running,
> then reply **ready** to proceed."

Wait for confirmation before dispatching.

---

## Step 4 — Dispatch

### [AUTOMATION BRANCH]

Announce:

> **Automation Testing — [CARD-ID]**
> Running: Gherkin Creation → Step Definitions → POM Creation → Automated Testing

Then invoke:

```
Skill: automation  args: [CARD-ID]
```

The automation skill runs all three phases internally (Gherkin → Step Defs → POM)
with mandatory user confirmation gates between phases. Once complete, report back:

> **Automation Testing complete for [CARD-ID].**
> Artifacts: Feature file · Step definitions · POM class · Dry-run PASSED

---

### [MANUAL BRANCH]

Announce:

> **Manual Testing — [CARD-ID]**
> Running: UI Testing (Figma) → Manual Testing → Bug Reporting → Test Charter

Then invoke:

```
Skill: manual-testing  args: [CARD-ID]
```

The manual-testing skill orchestrates all four sub-steps internally:
1. UI Testing via Figma (ui-test-figma)
2. Manual test execution in browser
3. Bug reporting to Jira (bug-reporting)
4. Test Charter generation and publish (test-charter)

Once complete, report back:

> **Manual Testing complete for [CARD-ID].**
> Artifacts: UI comparison report · Test execution report · Bugs filed · Charter published

---

### [FULL E2E PIPELINE]

Activate when the user selects option 6 / says "full QA" / "run everything" / "end to end".

#### Pre-pipeline setup

**If AUTO_APPROVE = true (context loaded with URL and credentials):**

Skip all setup questions. Announce:
> "**Full E2E Pipeline — [CARD-ID]** running with saved context for {PRODUCT_NAME}.
> App: {CTX_APP_URL} | Env: {CTX_ENVIRONMENT} | Auto-approve: ON"

Proceed immediately to Phase 1 — Automation Testing.

**If AUTO_APPROVE = false (no context, first run, or reset):**

Ask once in a single message:
> **Full E2E Pipeline — Quick Setup for [CARD-ID]**
>
> 1. App URL (e.g. `https://staging.myapp.com`)
> 2. Login required? If yes — username and password
> 3. Figma design link? (optional — ui-test-figma will be skipped if omitted)

Wait for response. Then run the pipeline in order:

```
Phase 1 — Automation Testing
  → Skill: automation  (Gherkin → Step Defs → POM → Dry Run)

Phase 2 — Manual Testing Pipeline
  → Skill: manual-testing  (UI Testing → Manual Tests → Bug Reporting → Charter)

Phase 3 — End-to-End Testing complete
```

#### Between phases

After each phase completes, display:

> "Phase [N] complete. Moving to Phase [N+1]..."

Then immediately invoke the next skill. Do not ask for confirmation between phases
unless a phase produced an error or a blocking question.

#### Pipeline completion

```
QA Pipeline Complete — [CARD-ID]

  Phase 1 — Automation Testing    : Gherkin + Step Defs + POM generated, dry-run PASSED
  Phase 2 — Manual Testing        : UI comparison + tests executed + bugs filed + charter published
  Phase 3 — End-to-End Testing    : COMPLETE

All done.
```

Then immediately invoke the cleanup skill:

```
Skill: delete-files
```

---

### Post-pipeline cleanup (all branches)

After **any** branch completes successfully — Automation, Manual, or Full E2E —
first save product context (Step 6 below), then invoke the cleanup skill so the
user can decide what to keep:

```
Skill: delete-files
```

The delete-files skill will list all files in `outputs/`, present three options
(delete all / delete selected / keep all), and wait for user consent before
removing anything.

---

## Step 6 — Save Product Context

Run after any branch completes (Automation, Manual, or Full E2E), before `delete-files`.

### 6a — Determine product name and folder

Derive from Jira card data already fetched:
- Use the Jira **project name** (not the key) as the display name
- Normalise the folder name: uppercase, spaces → `_`, strip special chars
- Examples: "Pozytron Radiologia" → `POZYTRON`, "Indy Auction" → `INDY`, "ZoodPay Admin" → `ZOODPAY_ADMIN`
- Do NOT ask the user unless the name truly cannot be derived. If it can't, ask once: "What product does this card belong to?"

```
PRODUCT_DIR  = .claude/skills/qa-agent/product_context/{PRODUCT_FOLDER}/
CONTEXT_FILE = {PRODUCT_DIR}context.md
```

### 6b — Determine write mode

| Condition | Write mode |
|-----------|-----------|
| `--reset-context` was passed this run | OVERWRITE — replace entire file |
| File does not exist | CREATE — write fresh file from schema |
| File exists, no reset flag | MERGE — append/update, never overwrite existing rows |

### 6c — On CREATE: write full context.md

Use `CONTEXT_SCHEMA.md` at `.claude/skills/qa-agent/product_context/CONTEXT_SCHEMA.md` as the template.
Fill in all known values from this run:

- **Product Info**: Jira project key, product name, App URL (`CTX_APP_URL` or value collected this run), environment (detect from URL — staging/dev/prod), auth method, login URL, OTP required
- **Credentials**: Username and Password collected during this run
- **Runs Log**: one row for this run — date, card, branch (Automation/Manual/Full E2E), outcome, bugs filed, one-line note
- **Known Bugs**: rows for every bug ID filed during this run (or placeholder row if none)
- **Covered Flows**: rows for every Gherkin Rule (automation) or test charter section (manual) exercised
- **Element Selectors**: rows from `outputs/automation-hints-{CARD_ID}-*.md` if the file exists — read the "Elements Discovered" table and copy each row
- **Environment Notes**: any observations noted during the run (OTP behaviour, redirect URLs, test data quirks)

### 6d — On MERGE: update existing context.md

Read the file first, then make only these targeted updates:

1. **Runs Log** — append one new row; never edit existing rows
2. **Known Bugs** — for each bug filed this run: add a new row if the bug ID is not present; update the Status column only if it is already present
3. **Covered Flows** — append any new flows not already listed (match by Flow name)
4. **Element Selectors** — merge from `outputs/automation-hints-{CARD_ID}-*.md` if it exists: append each row whose Element Label is not already in the table
5. **All other sections** — leave completely untouched

### 6e — Save and confirm

Use the Write tool to save `context.md`.

Print one line:
```
Product context saved → .claude/skills/qa-agent/product_context/{PRODUCT_FOLDER}/context.md
```

---

## Step 5 — Standalone Skill Dispatch

When the user picks a standalone skill (options 3–5) without providing a card ID,
invoke it directly without collecting a card:

| Target | Invocation |
|--------|-----------|
| [ui-test-figma] | `Skill: ui-test-figma` |
| [bug-reporting] | `Skill: bug-reporting` |
| [test-charter] | `Skill: test-charter` |

The skill handles its own input collection.

---

## Error Handling

| Situation | Action |
|-----------|--------|
| Jira card ID not provided when needed | Ask once before dispatching |
| Card not found in Jira | Ask user to verify the key |
| A phase fails | Report the failure, ask whether to retry or skip to next phase |
| User wants to stop mid-pipeline | Stop immediately, show completed and skipped phases |
| Playwright MCP unavailable | Pause, display reminder, wait for confirmation |
| Ambiguous input after menu shown | Re-display options with: "I didn't catch that — pick a number or describe what you need." |
