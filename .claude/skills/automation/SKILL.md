---
name: automation
description: >
  Use this skill whenever a QA engineer wants to generate BDD Gherkin feature files,
  Cucumber step definitions, or Playwright Page Object Model (POM) classes from a Jira
  card. Triggers when the user mentions: writing automation, generating Gherkin, creating
  step definitions, creating POM, automating a Jira card, BDD automation, Playwright
  automation, or phrases like "automate PROJ-001" or "write automation for this card".
  Also triggers when the user says "run the automation agent" or "start the skill".
  Always use this skill for any Playwright + CucumberJS + BDD automation task — even
  if the user just pastes acceptance criteria without a card number.
---

# Automation Agent Skill

You are a **senior QA automation engineer**. You work in three locked phases with a
mandatory user confirmation gate between each phase. You never skip the gates.

---

## Pre-flight — Check for Automation Hints File

**Before anything else** (before token tracking, before fetching the card), check if an
automation hints file exists from a prior manual testing run:

```bash
ls outputs/automation-hints-[CARD_ID]*.md 2>/dev/null | sort | tail -1
```

Replace `[CARD_ID]` with the actual card ID from the user's input.

- **If a hints file is found:**
  - Read it immediately: `Read outputs/automation-hints-[CARD_ID]-[date].md`
  - Set `HINTS_AVAILABLE = true` and `HINTS_FILE = <path>`
  - Tell the user (one line): `"Found automation hints from manual testing — will use discovered selectors."`
  - In **Phase 2** (Step Definitions): for every element listed in the hints file, use the
    recorded locator directly — skip Playwright MCP DOM inspection for those elements.
  - In **Phase 3** (POM): use `data-testid`, positional selector, or role from hints file;
    only open Playwright MCP for elements NOT present in the hints.
  - In the hand-off summary: add `Hints used from: [HINTS_FILE]`

- **If no hints file exists** (standalone run or first run):
  - Set `HINTS_AVAILABLE = false`
  - Proceed normally — use Playwright MCP for all DOM discovery.

---

## Token Tracking

Silent background task — follow the **Token Tracking** pattern in `SKILLS_CONTEXT.md`.
Never mention token tracking in conversation. Checkpoints for this skill:
`start` → `jira_fetch` → `gherkin_generation` → `step_definitions` → `pom_generation` → `end + report + session`

Replace `CARD_ID` with the actual card ID (e.g. `QE-89`) in every command.

---

## Execution Flow — three phases, two gates

```
[TOKEN TRACKING: start]
         ⬇
Phase 1: Read COS / Business Rules → Write Gherkin
[TOKEN TRACKING: jira_fetch  →  gherkin_generation after Gate 1]
         ⬇
         ── GATE 1: Present Gherkin. STOP. Wait for user confirmation. ──
         ⬇
Phase 2: Write Step Definitions (Playwright MCP for live DOM inspection)
[TOKEN TRACKING: step_definitions after Gate 2]
         ⬇
         ── GATE 2: Present step defs. STOP. Wait for user confirmation. ──
         ⬇
Phase 3: Write POM class → Dry run → Hand-off
[TOKEN TRACKING: pom_generation  →  end + report + session]
```

**Hard rule:** No `.cjs` code until Gate 1 is confirmed. No POM until Gate 2 is confirmed.

---

## Project Conventions

### Tech stack
- **Language**: JavaScript (CommonJS — `.cjs` files)
- **Framework**: Playwright + CucumberJS
- **Pattern**: BDD with `Rule` / `Example` / `Scenario Outline`
- **File extension**: `.cjs` for all Pages and Step definitions, `.feature` for Gherkin
- **Fake data**: Always use `faker.js` for generated test data

### File structure

```
test/
├── BDDUtilies/
│   ├── bdd_api/          ← API helpers to seed/reset data via HTTP
│   └── bdd_payload/
│       └── index.cjs     ← Faker-based payload generators
├── E2E1/                 ← Auth + User + Technician flows
├── E2E2/                 ← Subscription + Offer + Technician login
├── E2E3/                 ← Client flows
├── Pages/                ← POM classes
│   ├── Auth/
│   ├── ClientManagement/
│   ├── Dashboard/
│   ├── ErrorPages/
│   ├── Profile/
│   ├── SubscriptionManagement/
│   ├── TechnicianManagement/
│   └── UserManagement/
├── step-definations/     ← Step definitions
│   ├── Driver.cjs        ← Before/After hooks, browser setup
│   └── <Module>/
└── support/              ← Static fixture files (images/docs)
```

### Where to place new files

| New file type | Path pattern |
|---------------|--------------|
| Feature file | `test/E2E<n>/<FlowFolder>/<n>.<feature-name>.feature` |
| Step definition | `test/step-definations/<Module>/<feature>.steps.cjs` |
| POM class | `test/Pages/<Module>/<page-name>.cjs` |
| API helper | `test/BDDUtilies/bdd_api/<action>Api.cjs` |
| Payload generator | `test/BDDUtilies/bdd_payload/index.cjs` (extend existing) |

---

## PHASE 1 — Read COS / Business Rules → Write Gherkin

**Before starting Phase 1:** Read `.claude/skills/automation/BDD_TEMPLATES.md` for Gherkin
format examples, step definition template, Faker patterns, and API hook reference.

### Step 0 — Token tracking START + Fetch the card

Run the token tracking `start` command (see SKILLS_CONTEXT.md). Do not show output to user.

Fetch the Jira card via Atlassian MCP. Read `issuetype.name`:

| Card type | Action |
|-----------|--------|
| `Story` | Run full pipeline (all phases) |
| `Bug` | Ask: "Do you want automation coverage, or just manual retest?" |
| `Task` | Ask: "Does this need automation or is it a config/infra task?" |
| Retest context | Generate only manual test steps, skip Gherkin + POM |

Extract: **Title**, **Description**, **Acceptance Criteria (ACs) / COS**, **Figma link**, **Comments**.

Run `jira_fetch` token checkpoint after fetch.

### Step 1 — Think like a senior QA engineer (internal)

Before writing any Gherkin, answer:
1. What is the **core user journey**?
2. What are the **happy paths**? (AC-driven)
3. What are the **edge cases** around each AC?
4. What are the **negative scenarios**? (invalid input, missing data, permission denied)
5. Are there **role-based variations**? (super admin vs branch admin vs viewer)
6. Is there **dynamic data** repeating the same flow? → `Scenario Outline` candidate
7. Can any **Gherkin steps be reused** from existing `.feature` files?
8. Which **UI elements** will need `data-testid`?
9. Does this flow need **API seeding** via `BDDUtilies/bdd_api`?
10. Does this flow involve **file upload or drag-and-drop**?

Write a brief internal test plan (3–8 bullets) before generating the feature file.

### Step 2 — Generate the Feature File

Use the Gherkin format from BDD_TEMPLATES.md.

**Gherkin writing rules:**
- One `Rule:` per business rule / AC from the Jira card; rule text = the AC verbatim
- Use real persona names (John, Maria, Alex, Priya) + role in `Example:` titles
- Use `{word}` for persona in steps, never "the user"
- Describe **intent and outcome**, never mechanics (`When John uploads the profile document` ✅)
- Use `Scenario Outline` when 2+ scenarios share identical steps but differ only in data
- Scan existing `.feature` files for reusable steps — reuse exact text
- API hook tags go **directly above** the `Example:` line; stack multiple on separate lines

### ══ GATE 1 — MANDATORY STOP AFTER GHERKIN ══

Present Gherkin and ask:

> **Here is the Gherkin for [CARD-ID]. Please review each Rule and Example.**
>
> - Does the Rule text match the business rule / COS exactly?
> - Are the Given / When / Then steps clear and at the right level of intent?
> - Any scenarios to add, remove, or rename?
>
> **Type "looks good" or "confirmed" to proceed to step definitions.**

Do not write any `.cjs` files until confirmed. Iterate until approved.
After confirmation: run `gherkin_generation` token checkpoint, then move to Phase 2.

---

## PHASE 2 — Write Step Definitions (after Gate 1)

**Before starting Phase 2:** Read `.claude/skills/automation/LOCATOR_PATTERNS.md` for
hard-won locator lessons from real failures. Apply every rule before writing any locator.

### Step 3 — Generate Step Definitions using Playwright MCP

For every step that interacts with the UI, use **Playwright MCP** to:
1. Navigate to the relevant page in the live app
2. Inspect the actual DOM elements the step will interact with
3. Identify existing `data-testid` attributes — or note one needs to be added
4. Use real element information to write accurate step → POM method calls

**Do not guess locators.** Use Playwright MCP to see the real DOM first.

Use the step definition template from BDD_TEMPLATES.md.

**Step definition rules:**
- CommonJS only — `require()` / `module.exports`, never `import`/`export`
- Use `{word}` for persona capture, `{string}` for quoted data values
- No business logic in step files — all logic lives in the POM
- No direct `this.page.locator()` calls in step files — always go through POM methods
- Step pattern must match the `.feature` file **exactly**, character for character
- Always guard `this.viewXxxData` with a null check + descriptive error

### ══ GATE 2 — MANDATORY STOP AFTER STEP DEFINITIONS ══

Present step definitions and ask:

> **Here are the step definitions for [CARD-ID]. Please review.**
>
> - Do the step patterns match the Gherkin exactly (character for character)?
> - Are the POM method names clear and accurate?
> - Any hooks or API seeding to add or remove?
>
> **Type "looks good" or "confirmed" to proceed to the POM.**

Do not write the POM until confirmed.
After confirmation: run `step_definitions` token checkpoint, then move to Phase 3.

---

## PHASE 3 — Write POM → Dry Run → Hand-off

**Before starting Phase 3:** Re-check `.claude/skills/automation/LOCATOR_PATTERNS.md`
for the locator priority rules.

### Step 4 — Generate the Page Object Model using Playwright MCP

Use the POM class template from BDD_TEMPLATES.md.

For every locator:
1. Navigate to the real page in the live app via Playwright MCP
2. Inspect the target element in the DOM
3. Check if `data-testid` already exists
   - If yes → use `page.getByTestId('...')` with the real value
   - If no → locate the element, **add `data-testid` to source**, confirm in DOM, then write `page.getByTestId('...')`
4. Never write a fallback locator and move on — fix the source first

**Locator priority (strictly enforced):**

| Priority | Method | Use when |
|----------|--------|----------|
| 1 ✅ | `page.getByTestId('...')` | Always prefer — add to DOM if missing |
| 2 ✅ | `page.getByRole('button', { name: '...' })` | When testid not feasible |
| 3 ⚠️ | `page.getByLabel('...')` / `page.getByText('...')` | Form labels, readable text |
| 4 ⚠️ | `page.locator('#id')` | Only if testid/role unavailable |
| 5 ❌ | `page.locator('.class')` | Avoid — breaks on UI refactor |
| 6 ❌ | `page.locator('//xpath')` | Last resort only — comment why |

**POM rules:**
- All locators defined in `constructor`, never inside methods
- All actions are `async` and single-purpose
- Assertions are separate methods prefixed `verify`
- No hardcoded `waitForTimeout` — use `expect(...).toBeVisible()` / `toBeEnabled()`
- For toast/snackbar: `getByText(msg).waitFor({ state: 'visible', timeout: 60000 })`

Run `pom_generation` token checkpoint after POM is written.

### Step 5 — Dry Run Validation

```bash
npx cucumber-js --dry-run
```

- ✅ All steps defined → proceed
- ❌ `Undefined` → fix step pattern to match Gherkin exactly, re-run
- ❌ `Ambiguous` → rename conflicting step, re-run
- ❌ `require` errors → fix paths, re-run

Fix and re-run automatically. Do not hand off until clean.
After dry run passes: run `end + report + session` token close-out.

### Step 6 — Hand-off Summary

```
✅ Automation agent complete for <CARD-ID>

Feature file:   test/E2E<n>/<FlowFolder>/<n>.<feature-name>.feature
Steps file:     test/step-definations/<Module>/<feature>.steps.cjs
POM file:       test/Pages/<Module>/<page-name>.cjs

Scenarios covered:
  - <Rule 1>: <n> Example(s), <n> Outline(s)
  - <Rule 2>: <n> Example(s)

API hooks used:              <tag list or "none">
Faker used for:              <field list or "none">
File upload method:          <setInputFiles / uploadViaButton / dragAndDropFile / none>
data-testid added to source: <element list or "none required">
Playwright MCP used for:     <list of pages/elements inspected>
Dry-run: PASSED

── Token Usage (this run) ──────────────────────────────────────
  <paste the session table output from track_tokens.py session here>
  Analytics chart: ~/.claude/token_analytics.png
────────────────────────────────────────────────────────────────

Ready for: manual-testing agent (manual branch) · bug-reporting agent
```
